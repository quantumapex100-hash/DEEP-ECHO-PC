const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const execFileAsync = util.promisify(execFile);
const { runYtDlpSmart, isAbort } = require('./ytdlp-smart');
const MODEL_NAME = 'ggml-base-q5_1.bin';
const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin?download=true';

function parseClock(value = '') {
  const raw = String(value).trim().replace(',', '.');
  const parts = raw.split(':').map(Number);
  if (!parts.length || parts.some(v => !Number.isFinite(v))) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function toLrcTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const secs = safe - minutes * 60;
  return `[${String(minutes).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}]`;
}

function cleanTranscriptText(value = '') {
  return String(value)
    .replace(/<\|[^>]+\|>/g, ' ')
    .replace(/\[(?:music|instrumental|applause|silence|blank audio|background music)[^\]]*\]/gi, ' ')
    .replace(/\((?:music|instrumental|applause|silence|background music)[^)]*\)/gi, ' ')
    .replace(/[♪♫]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


function transcriptLooksHallucinated(rows = []) {
  if (!Array.isArray(rows) || rows.length < 2) return true;
  const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g,' ').trim();
  const lines = rows.map(row => norm(row.text)).filter(Boolean);
  if (lines.length < 2) return true;
  const unique = new Set(lines);
  const uniqueRatio = unique.size / lines.length;
  const counts = new Map();
  for (const line of lines) counts.set(line,(counts.get(line)||0)+1);
  const maxRepeat = Math.max(...counts.values());
  const phraseCounts = new Map();
  for (const line of lines) {
    const words = line.split(/\s+/).filter(Boolean);
    for (let i=0;i+4<words.length;i++) {
      const phrase = words.slice(i,i+5).join(' ');
      phraseCounts.set(phrase,(phraseCounts.get(phrase)||0)+1);
    }
  }
  const maxPhraseRepeat = phraseCounts.size ? Math.max(...phraseCounts.values()) : 0;
  // Whisper can occasionally latch onto one generic phrase over music. Reject that rather
  // than showing confidently wrong lyrics; providers/manual retry can still supply lyrics.
  return uniqueRatio < 0.52 || maxRepeat >= 4 || maxPhraseRepeat >= 3;
}

function segmentsToLyrics(segments = []) {
  const rows = [];
  let lastKey = '';
  for (const segment of Array.isArray(segments) ? segments : []) {
    const tuple = Array.isArray(segment) ? segment : [segment.start, segment.end, segment.text || segment.speech];
    const text = cleanTranscriptText(tuple[2] || '');
    if (!text) continue;
    const key = text.toLocaleLowerCase();
    if (key === lastKey) continue;
    const time = parseClock(tuple[0]);
    rows.push({ time: Math.max(0, time), text });
    lastKey = key;
  }
  const wordCount = rows.reduce((n, row) => n + row.text.split(/\s+/).filter(Boolean).length, 0);
  if (rows.length < 2 || wordCount < 6 || transcriptLooksHallucinated(rows)) return null;
  return {
    lyrics: rows.map(row => row.text).join('\n'),
    syncedLyrics: rows.map(row => `${toLrcTime(row.time)}${row.text}`).join('\n'),
    segmentCount: rows.length,
    wordCount
  };
}

async function downloadFile(url, destination, onStatus, signal) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temp = `${destination}.part`;
  try { fs.unlinkSync(temp); } catch {}
  const timeoutSignal = AbortSignal.timeout(180000);
  const fetchSignal = signal && typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  const response = await fetch(url, { redirect: 'follow', signal: fetchSignal });
  if (!response.ok || !response.body) throw new Error(`Model download failed (${response.status})`);
  const total = Number(response.headers.get('content-length')) || 0;
  let received = 0;
  const body = Readable.fromWeb(response.body);
  body.on('data', chunk => {
    received += chunk.length;
    if (total > 0 && onStatus) onStatus({ stage: 'model', text: `AI lyrics model download · ${Math.min(99, Math.round(received / total * 100))}%` });
  });
  await pipeline(body, fs.createWriteStream(temp));
  fs.renameSync(temp, destination);
}

async function ensureModel(modelDir, onStatus, signal) {
  const modelPath = path.join(modelDir, MODEL_NAME);
  if (fs.existsSync(modelPath) && fs.statSync(modelPath).size > 40 * 1024 * 1024) return modelPath;
  onStatus?.({ stage: 'model', text: 'AI lyrics model first-time setup…' });
  await downloadFile(MODEL_URL, modelPath, onStatus, signal);
  return modelPath;
}

function findDownloadedAudio(dir, prefix) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter(name => name.startsWith(prefix + '.') && !name.endsWith('.part') && !name.endsWith('.ytdl'))
    .map(name => ({ name, full: path.join(dir, name), stat: fs.statSync(path.join(dir, name)) }))
    .filter(item => item.stat.isFile())
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  return files[0]?.full || null;
}

async function transcribeSong(song, options = {}) {
  const { ytdlpPath, tempRoot, modelDir, onStatus, signal, browserAuth } = options;
  if (!song) return { error: 'Song unavailable for local transcription.' };
  if (signal?.aborted) return { cancelled: true };
  let ffmpegPath;
  try { ffmpegPath = require('ffmpeg-static'); } catch { return { error: 'ffmpeg-static missing. Run npm install once.' }; }
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) return { error: 'Local audio converter unavailable.' };

  const jobId = `lyrics-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const jobDir = path.join(tempRoot, jobId);
  const prefix = 'source';
  fs.mkdirSync(jobDir, { recursive: true });
  try {
    let input = null;
    let inputKind = '';

    // Best path: use the exact media resource that is ALREADY playing. This avoids a second
    // yt-dlp request, avoids YouTube bot-check spam, and keeps lyrics work independent of playback.
    if (song.filepath && fs.existsSync(song.filepath)) {
      input = song.filepath;
      inputKind = 'offline';
    } else if (/^https?:\/\//i.test(String(song.streamUrl || ''))) {
      input = song.streamUrl;
      inputKind = 'playing-stream';
    } else {
      if (!song.url || !ytdlpPath || !fs.existsSync(ytdlpPath)) return { error: 'No playable audio source available for AI lyrics.' };
      onStatus?.({ stage: 'audio', text: 'Preparing audio source for AI lyrics…' });
      await runYtDlpSmart(ytdlpPath, [
        '--no-warnings', '--no-playlist', '-f', 'bestaudio/best', '-o', path.join(jobDir, `${prefix}.%(ext)s`), song.url
      ], {
        maxBuffer: 20 * 1024 * 1024,
        timeout: 120000,
        signal,
        purpose: 'lyrics-audio',
        browserAuth,
        allowFallbackClients: true
      });
      input = findDownloadedAudio(jobDir, prefix);
      inputKind = 'downloaded-fallback';
      if (!input) throw new Error('Audio source download failed.');
    }

    if (signal?.aborted) return { cancelled: true };
    const wav = path.join(jobDir, 'voice.wav');
    onStatus?.({ stage: 'audio', text: inputKind === 'playing-stream' ? 'Listening to the currently playing audio…' : 'Preparing audio for AI lyrics…' });
    const ffArgs = ['-y', '-nostdin'];
    if (/^https?:\/\//i.test(String(input))) ffArgs.push('-rw_timeout', '15000000', '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '2');
    ffArgs.push('-i', input, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav);
    await execFileAsync(ffmpegPath, ffArgs, {
      maxBuffer: 20 * 1024 * 1024, windowsHide: true, timeout: 180000, signal
    });
    if (signal?.aborted) return { cancelled: true };

    const modelPath = await ensureModel(modelDir, onStatus, signal);
    if (signal?.aborted) return { cancelled: true };
    onStatus?.({ stage: 'transcribe', text: 'Deepeccho AI is listening to the vocals…' });
    const whisper = await import('whisper-cpp-node');
    const ctx = whisper.createWhisperContext({ model: modelPath, use_gpu: false });
    let result;
    try {
      result = await whisper.transcribeAsync(ctx, { fname_inp: wav });
    } finally {
      try { ctx.free(); } catch {}
    }
    if (signal?.aborted) return { cancelled: true };
    const converted = segmentsToLyrics(result?.segments || []);
    if (!converted) return { noVocals: true, error: 'AI transcription could not detect enough clear vocals.' };
    return {
      ...converted,
      source: inputKind === 'playing-stream' ? 'Deepeccho Auto Transcribe · current stream · local AI' : 'Deepeccho Auto Transcribe · local AI',
      timingPrecision: 'audio-transcribed',
      timingOffsetSeconds: 0,
      transcription: true,
      detectedLanguage: result?.language || result?.detected_language || ''
    };
  } catch (error) {
    if (isAbort(error)) return { cancelled: true };
    if (error?.code === 'YOUTUBE_BOT_CHECK') return { blocked: true, errorCode: 'YOUTUBE_BOT_CHECK', error: 'YouTube blocked anonymous audio extraction.' };
    console.warn('[auto lyrics] transcription unavailable:', String(error?.message || error).slice(0, 280));
    return { error: `Auto transcription failed: ${String(error?.message || error).slice(0, 420)}` };
  } finally {
    try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { parseClock, cleanTranscriptText, segmentsToLyrics, transcriptLooksHallucinated, transcribeSong, MODEL_NAME, MODEL_URL };
