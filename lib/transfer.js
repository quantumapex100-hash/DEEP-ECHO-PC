const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { downloadFormat } = require('../src/v200-core');
const { isBotChallenge, isAccess403, cleanErrorMessage } = require('./ytdlp-smart');

const PREFIX = 'AF_PROGRESS:';

function parseProgress(line) {
  if (!line.trim().startsWith(PREFIX)) return null;
  const [amount, speed = '', eta = ''] = line.trim().slice(PREFIX.length).split('|');
  const value = parseFloat(amount);
  return { percent: Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null, speed: speed.trim(), eta: eta.trim() };
}

function browserName(value) {
  const browser = String(value || '').toLowerCase();
  return ['chrome', 'edge', 'brave', 'firefox'].includes(browser) ? browser : '';
}

function downloadAttempts(options = {}) {
  const attempts = [{ name: 'default', prefix: [] }];
  if (options.allowFallbackClients !== false) {
    // These only run after an access/bot-check failure. Normal successful downloads
    // keep the exact same yt-dlp path and arguments as before.
    attempts.push({ name: 'android', prefix: ['--extractor-args', 'youtube:player_client=android'] });
    attempts.push({ name: 'embedded', prefix: ['--extractor-args', 'youtube:player_client=default,web_embedded,-android_vr'] });
  }
  const browser = options.browserAuth?.enabled ? browserName(options.browserAuth.browser) : '';
  if (browser) attempts.push({ name: `browser:${browser}`, prefix: ['--cookies-from-browser', browser] });
  return attempts;
}

function baseArgs(song, outputTemplate, options = {}) {
  return [
    '-f', downloadFormat(options.quality || song.downloadQuality),
    '--no-warnings', '--no-playlist', '--newline', '--progress',
    '--progress-template', `download:${PREFIX}%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s`,
    '-o', outputTemplate, '--', song.url
  ];
}

function runAttempt(executable, args, onProgress, spawnImpl, options = {}) {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) return reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' }));

    const child = spawnImpl(executable, args, {
      windowsHide: true,
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }
    });
    let errors = '', stdout = '', stderr = '';
    let settled = false;

    const finishReject = error => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const abort = () => {
      try { child.kill(); } catch {}
    };
    const timer = setTimeout(() => {
      try { child.kill(); } catch {}
    }, 10 * 60 * 1000);
    const cleanup = () => {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();

    const line = value => {
      const progress = parseProgress(value);
      if (progress) onProgress(progress);
    };

    child.stdout.on('data', chunk => {
      stdout += chunk;
      const lines = stdout.split(/[\r\n]+/);
      stdout = lines.pop();
      lines.forEach(line);
    });
    child.stderr.on('data', chunk => {
      errors = (errors + chunk).slice(-16000);
      stderr += chunk;
      const lines = stderr.split(/[\r\n]+/);
      stderr = lines.pop();
      lines.forEach(line);
    });
    child.on('error', finishReject);
    child.on('close', code => {
      if (settled) return;
      settled = true;
      cleanup();
      if (options.signal?.aborted) return reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' }));
      line(stdout);
      line(stderr);
      if (code === 0) return resolve();
      const error = new Error(errors.trim() || `yt-dlp exited with code ${code}`);
      error.exitCode = code;
      reject(error);
    });
  });
}

async function runTransfer(executable, song, outputTemplate, onProgress, spawnImpl = spawn, options = {}) {
  const attempts = downloadAttempts(options);
  const args = baseArgs(song, outputTemplate, options);
  let lastError = null;
  let botSeen = false;

  for (let i = 0; i < attempts.length; i++) {
    if (options.signal?.aborted) throw new Error('Cancelled');
    const attempt = attempts[i];
    try {
      await runAttempt(executable, [...attempt.prefix, ...args], onProgress, spawnImpl, options);
      if (attempt.name !== 'default') console.log(`[download] recovered via ${attempt.name}`);
      return;
    } catch (error) {
      if (options.signal?.aborted || error?.name === 'AbortError' || /cancelled|aborted/i.test(error?.message || '')) {
        throw new Error('Cancelled');
      }
      lastError = error;
      botSeen = botSeen || isBotChallenge(error);
      const retryableAccess = isBotChallenge(error) || isAccess403(error);
      if (!retryableAccess || i === attempts.length - 1) break;
    }
  }

  const wrapped = new Error(cleanErrorMessage(lastError) || 'Download failed.');
  wrapped.code = botSeen ? 'YOUTUBE_BOT_CHECK' : (isAccess403(lastError) ? 'YOUTUBE_ACCESS_403' : (lastError?.code || 'YTDLP_FAILED'));
  wrapped.botChallenge = botSeen;
  wrapped.original = lastError;
  throw wrapped;
}


function directExtension(streamUrl, contentType = '') {
  const type = String(contentType || '').toLowerCase();
  if (type.includes('audio/mp4') || type.includes('video/mp4')) return 'm4a';
  if (type.includes('audio/webm') || type.includes('video/webm')) return 'webm';
  if (type.includes('audio/ogg')) return 'ogg';
  if (type.includes('audio/mpeg')) return 'mp3';
  if (type.includes('audio/aac')) return 'aac';
  try {
    const url = new URL(streamUrl);
    const mime = decodeURIComponent(url.searchParams.get('mime') || '').toLowerCase();
    if (mime.includes('audio/mp4')) return 'm4a';
    if (mime.includes('audio/webm')) return 'webm';
    if (mime.includes('audio/ogg')) return 'ogg';
    if (mime.includes('audio/mpeg')) return 'mp3';
    if (mime.includes('audio/aac')) return 'aac';
  } catch {}
  return 'm4a';
}

function directOutputPath(outputTemplate, ext) {
  const template = String(outputTemplate || '');
  if (template.includes('%(ext)s')) return template.replace('%(ext)s', ext);
  if (/\.[a-z0-9]{2,5}$/i.test(template)) return template;
  return `${template}.${ext}`;
}

async function downloadDirectAudio(streamUrl, outputTemplate, onProgress = () => {}, options = {}) {
  if (!/^https?:\/\//i.test(String(streamUrl || ''))) throw new Error('Resolved audio URL missing.');
  if (options.signal?.aborted) throw Object.assign(new Error('Cancelled'), { name: 'AbortError' });

  const fetchImpl = options.fetchImpl || fetch;
  const response = await fetchImpl(streamUrl, {
    redirect: 'follow',
    signal: options.signal,
    headers: {
      'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
      'Accept': '*/*'
    }
  });
  if (!response.ok || !response.body) {
    const error = new Error(`Direct audio request failed (${response.status || 'network'})`);
    error.code = response.status === 403 ? 'YOUTUBE_ACCESS_403' : 'DIRECT_AUDIO_FAILED';
    throw error;
  }

  const ext = directExtension(streamUrl, response.headers.get('content-type'));
  const destination = directOutputPath(outputTemplate, ext);
  const temporary = `${destination}.part`;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  try { fs.unlinkSync(temporary); } catch {}

  const total = Number(response.headers.get('content-length')) || 0;
  let received = 0;
  let lastPercent = -1;
  const body = Readable.fromWeb(response.body);
  body.on('data', chunk => {
    received += chunk.length;
    if (!total) return;
    const percent = Math.max(0, Math.min(100, received / total * 100));
    const rounded = Math.floor(percent);
    if (rounded !== lastPercent) {
      lastPercent = rounded;
      onProgress({ percent, speed: '', eta: '' });
    }
  });

  try {
    await pipeline(body, fs.createWriteStream(temporary), { signal: options.signal });
    if (options.signal?.aborted) throw Object.assign(new Error('Cancelled'), { name: 'AbortError' });
    fs.renameSync(temporary, destination);
    onProgress({ percent: 100, speed: '', eta: '' });
    return destination;
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch {}
    if (options.signal?.aborted || error?.name === 'AbortError') throw new Error('Cancelled');
    throw error;
  }
}

module.exports = { parseProgress, runTransfer, downloadAttempts, downloadDirectAudio, directExtension, directOutputPath };
