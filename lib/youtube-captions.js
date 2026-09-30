const fs = require('fs');
const os = require('os');
const path = require('path');
const { normalizeTimeline } = require('./lyrics-timeline');
const { runYtDlpSmart, isAbort } = require('./ytdlp-smart');
function decodeHtml(text = '') {
  return String(text)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

function cleanCaptionText(text = '') {
  return decodeHtml(String(text))
    .replace(/<[^>]+>/g, '')
    .replace(/\[[^\]]*(music|applause|instrumental)[^\]]*\]/gi, '')
    .replace(/\([^)]*(music|applause|instrumental)[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toLrcTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const secs = safe - minutes * 60;
  return `[${String(minutes).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}]`;
}

function captionKey(value = '') {
  return String(value).normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function captionTokenOverlap(a, b) {
  const A = new Set(captionKey(a).split(/\s+/).filter(Boolean));
  const B = new Set(captionKey(b).split(/\s+/).filter(Boolean));
  if (!A.size || !B.size) return 0;
  let hit = 0; for (const token of A) if (B.has(token)) hit++;
  return hit / Math.max(A.size, B.size);
}
function collapseCaptionLines(lines, options = {}) {
  const rolling = options.rolling !== false;
  const output = [];
  for (const line of [...lines].sort((a, b) => a.time - b.time)) {
    const text = cleanCaptionText(line.text);
    if (!text) continue;
    const key = captionKey(text);
    const prev = output[output.length - 1];
    if (prev) {
      const prevKey = captionKey(prev.text);
      const dt = Number(line.time) - Number(prev.time);
      // IMPORTANT: repeated lyric lines are legitimate. Old code removed every adjacent
      // identical caption regardless of time, which made choruses/repeated English lines
      // disappear and the highlighter appear stuck. Only collapse near-simultaneous emits.
      if (key === prevKey && dt >= 0 && dt <= 0.72) continue;
      // Auto captions often grow one caption word-by-word. Preserve the first timestamp.
      const progressive = rolling && dt >= 0 && dt <= 1.35 && (key.startsWith(prevKey + ' ') || prevKey.startsWith(key + ' '));
      if (progressive) {
        if (key.length >= prevKey.length) prev.text = text;
        continue;
      }
      // Rolling caption windows may differ at both ends rather than being a pure prefix.
      // Merge only very-near, high-overlap windows; real repeated chorus lines farther apart survive.
      if (rolling && dt >= 0 && dt <= 0.85 && captionTokenOverlap(prev.text, text) >= 0.84) {
        if (key.length > prevKey.length) prev.text = text;
        continue;
      }
    }
    output.push({ time: Math.max(0, Number(line.time) || 0), text });
  }
  return output;
}

function timedWordsFromText(text, start, end) {
  const tokens = cleanCaptionText(text).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const safeStart = Math.max(0, Number(start) || 0);
  const safeEnd = Math.max(safeStart + 0.08, Number(end) || safeStart + Math.max(0.28, tokens.length * 0.22));
  const totalWeight = tokens.reduce((sum, token) => sum + Math.max(1, token.replace(/[^\p{L}\p{N}]/gu, '').length), 0) || tokens.length;
  let cursor = safeStart;
  return tokens.map((text, index) => {
    const weight = Math.max(1, text.replace(/[^\p{L}\p{N}]/gu, '').length);
    const duration = (safeEnd - safeStart) * (weight / totalWeight);
    const row = { text, time: cursor, end: index === tokens.length - 1 ? safeEnd : cursor + duration };
    cursor = row.end;
    return row;
  });
}
function normalizeWordTimings(items = []) {
  const output = [];
  for (const item of [...items].sort((a,b)=>(Number(a.time)||0)-(Number(b.time)||0))) {
    const text = cleanCaptionText(item?.text || '');
    const time = Math.max(0, Number(item?.time) || 0);
    const end = Math.max(time + 0.04, Number(item?.end) || time + 0.28);
    if (!text) continue;
    const prev = output[output.length - 1];
    if (prev && captionKey(prev.text) === captionKey(text) && Math.abs(prev.time - time) < 0.045) continue;
    output.push({ text, time: Math.round(time * 1000) / 1000, end: Math.round(end * 1000) / 1000 });
    if (output.length >= 20000) break;
  }
  return output;
}
function parseJson3Detailed(data, options = {}) {
  const rows = [], wordTimings = [];
  for (const event of data?.events || []) {
    const segs = Array.isArray(event.segs) ? event.segs : [];
    const text = segs.map(seg => seg.utf8 || '').join('');
    if (!text.trim()) continue;
    const eventStart = (Number(event.tStartMs) || 0) / 1000;
    const eventDuration = Math.max(0.18, (Number(event.dDurationMs) || 0) / 1000 || 4);
    rows.push({ time: eventStart, text });
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]; const raw = String(seg?.utf8 || ''); if (!raw.trim()) continue;
      const segStart = eventStart + Math.max(0, Number(seg?.tOffsetMs) || 0) / 1000;
      const nextOffset = Number(segs[i + 1]?.tOffsetMs);
      const segEnd = Number.isFinite(nextOffset) ? eventStart + Math.max(Number(seg?.tOffsetMs) || 0, nextOffset) / 1000 : eventStart + eventDuration;
      wordTimings.push(...timedWordsFromText(raw, segStart, segEnd));
    }
  }
  return { rows: collapseCaptionLines(rows, options), wordTimings: normalizeWordTimings(wordTimings) };
}
function parseJson3(data, options = {}) { return parseJson3Detailed(data, options).rows; }

function parseVttDetailed(vtt = '', options = {}) {
  const rows = [], wordTimings = [];
  const blocks = String(vtt).replace(/\r/g, '').split(/\n\n+/);
  const clock = value => { const parts = String(value || '').trim().replace(',', '.').split(':').map(Number); return parts.length >= 2 && parts.every(Number.isFinite) ? parts.reduce((total, part) => total * 60 + part, 0) : NaN; };
  for (const block of blocks) {
    const lines = block.split('\n').map(v => v.trim()).filter(Boolean);
    const timingIndex = lines.findIndex(v => /-->/.test(v)); if (timingIndex < 0) continue;
    const cue = lines[timingIndex].split('-->'); const seconds = clock(cue[0]); const cueEnd = clock((cue[1] || '').split(/\s+/)[0]); if (!Number.isFinite(seconds)) continue;
    const rawText = lines.slice(timingIndex + 1).join(' '); rows.push({ time: seconds, text: rawText });
    const stamp = /<(\d{1,2}:\d{2}:\d{2}[.,]\d+)>/g; const matches = [...rawText.matchAll(stamp)];
    if (matches.length) {
      const firstText = rawText.slice(0, matches[0].index); if (cleanCaptionText(firstText)) wordTimings.push(...timedWordsFromText(firstText, seconds, clock(matches[0][1])));
      for (let i = 0; i < matches.length; i++) {
        const start = clock(matches[i][1]); const end = i + 1 < matches.length ? clock(matches[i + 1][1]) : cueEnd;
        const from = matches[i].index + matches[i][0].length; const to = i + 1 < matches.length ? matches[i + 1].index : rawText.length;
        wordTimings.push(...timedWordsFromText(rawText.slice(from, to), start, end));
      }
    }
  }
  return { rows: collapseCaptionLines(rows, options), wordTimings: normalizeWordTimings(wordTimings) };
}
function parseVtt(vtt = '', options = {}) { return parseVttDetailed(vtt, options).rows; }

function rowsToLrc(rows) {
  return (rows || []).map(row => `${toLrcTime(row.time)}${row.text}`).join('\n');
}

function normalizeLang(value = '') {
  return String(value || '').trim().toLowerCase().replace('_', '-');
}

function captionLanguageScore(lang, formats, info) {
  const key = normalizeLang(lang);
  const base = key.split('-')[0];
  const original = normalizeLang(info?.language || info?.original_language || '');
  const originalBase = original.split('-')[0];
  const names = (formats || []).map(x => String(x?.name || '')).join(' ').toLowerCase();
  let score = 0;
  if (original && (key === original || base === originalBase)) score += 120;
  if (/-orig$/.test(key) || /original/.test(names)) score += 55;
  if (base === 'en') score += 24;
  if (base === 'hi') score += 18;
  if (/translated|translation/.test(names)) score -= 70;
  if (/auto-translated|translated/.test(key)) score -= 70;
  return score;
}

function chooseCaptionTrack(info) {
  const sources = [
    { kind: 'subtitles', tracks: info?.subtitles || {}, sourceScore: 30 },
    { kind: 'automatic captions', tracks: info?.automatic_captions || {}, sourceScore: 0 }
  ];
  const candidates = [];
  for (const source of sources) {
    for (const [lang, formats] of Object.entries(source.tracks || {})) {
      const base = normalizeLang(lang).split('-')[0];
      const originalBase = normalizeLang(info?.language || info?.original_language || '').split('-')[0];
      // Prefer the video's original language. If metadata is absent, only consider the
      // common source languages instead of choosing an arbitrary auto-translation.
      if (originalBase) {
        if (base !== originalBase && base !== 'en' && base !== 'hi') continue;
      } else if (base !== 'en' && base !== 'hi') continue;
      const track = (formats || []).find(x => x.ext === 'json3') || (formats || []).find(x => x.ext === 'vtt') || (formats || [])[0];
      if (!track?.url) continue;
      candidates.push({ ...track, lang, kind: source.kind, score: source.sourceScore + captionLanguageScore(lang, formats, info) });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

function parseLrcRows(value = '') {
  const rows = [];
  for (const line of String(value).split(/\r?\n/)) {
    const text = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();
    for (const match of line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)) {
      rows.push({ time: Number(match[1]) * 60 + Number(match[2]), text });
    }
  }
  return rows.filter(row => row.text).sort((a, b) => a.time - b.time);
}

function syncTokens(value = '') {
  return String(value).normalize('NFKC').toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
}

function syncLineScore(a, b) {
  const at = syncTokens(a), bt = syncTokens(b);
  if (!at.length || !bt.length) return 0;
  const as = at.join(' '), bs = bt.join(' ');
  if (as === bs) return 1;
  if ((as.includes(bs) || bs.includes(as)) && Math.min(at.length, bt.length) >= 2) {
    return 0.76 + 0.18 * (Math.min(at.length, bt.length) / Math.max(at.length, bt.length));
  }
  const left = new Set(at), right = new Set(bt);
  let common = 0;
  for (const token of left) if (right.has(token)) common++;
  const union = new Set([...left, ...right]).size || 1;
  const jaccard = common / union;
  const coverage = common / Math.max(1, Math.min(left.size, right.size));
  return jaccard * 0.55 + coverage * 0.45;
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function alignSyncedLyricsToCaptions(lyricsLrc, captionLrc) {
  const lyrics = parseLrcRows(lyricsLrc), captions = parseLrcRows(captionLrc);
  if (lyrics.length < 2 || captions.length < 2) return null;
  const matches = [];
  let nextCaption = 0;
  let previous = null;
  for (let i = 0; i < lyrics.length; i++) {
    let best = null;
    // Repeated choruses need occurrence-aware matching. After the first anchor, search a
    // local forward window around the expected time instead of allowing an exact duplicate
    // many verses later to steal the match.
    let from = Math.max(0, nextCaption);
    let to = captions.length;
    let expectedTime = null;
    if (previous) {
      const lyricDelta = Math.max(0, lyrics[i].time - lyrics[previous.lyricIndex].time);
      expectedTime = captions[previous.captionIndex].time + lyricDelta;
      to = Math.min(captions.length, from + 24);
    }
    for (let j = from; j < to; j++) {
      const textScore = syncLineScore(lyrics[i].text, captions[j].text);
      const distancePenalty = expectedTime == null ? 0 : Math.min(0.26, Math.abs(captions[j].time - expectedTime) / 28);
      const score = textScore - distancePenalty;
      if (!best || score > best.score + 1e-6 || (Math.abs(score - best.score) <= 1e-6 && j < best.captionIndex)) {
        best = { lyricIndex: i, captionIndex: j, score, textScore };
      }
      if (textScore >= 0.995 && (expectedTime == null || Math.abs(captions[j].time - expectedTime) <= 5.5)) break;
    }
    const minTokens = Math.min(syncTokens(lyrics[i].text).length, best ? syncTokens(captions[best.captionIndex].text).length : 0);
    const threshold = minTokens <= 1 ? 0.98 : minTokens === 2 ? 0.66 : 0.52;
    if (best && best.textScore >= threshold && best.score >= threshold - 0.18) {
      matches.push(best);
      previous = best;
      nextCaption = best.captionIndex + 1;
    }
  }
  if (matches.length < 2) return null;
  const offsets = matches.map(m => captions[m.captionIndex].time - lyrics[m.lyricIndex].time);
  const globalOffset = median(offsets);
  const matchedTimes = new Map(matches.map(m => [m.lyricIndex, captions[m.captionIndex].time]));
  const out = [];
  for (let i = 0; i < lyrics.length; i++) {
    let time = matchedTimes.has(i) ? matchedTimes.get(i) : lyrics[i].time + globalOffset;
    time = Math.max(0, Number(time) || 0);
    out.push({ time, text: lyrics[i].text });
  }
  const normalizedOut = normalizeTimeline(out, { dedupeWindow: 0.18, groupWindow: 0.24 });
  const confidence = matches.reduce((sum, m) => sum + Math.max(0, m.textScore), 0) / matches.length * Math.min(1, matches.length / 5);
  return {
    syncedLyrics: rowsToLrc(normalizedOut),
    matched: matches.length,
    confidence: Math.round(confidence * 1000) / 1000,
    offset: Math.round(globalOffset * 1000) / 1000
  };
}

function subtitleLanguageCandidates(metadata = {}, track = null) {
  const raw = [track?.lang, metadata.originalLanguage, metadata.language, 'en', 'hi']
    .map(normalizeLang).filter(Boolean);
  const seen = new Set(), out = [];
  for (const lang of raw) {
    const base = lang.split('-')[0];
    for (const value of [lang, base]) {
      if (!value || seen.has(value)) continue;
      seen.add(value); out.push(value);
    }
  }
  // yt-dlp accepts regex-like language selectors. Keep this intentionally narrow so
  // a missing original-language subtitle cannot download dozens of auto translations.
  return out.slice(0, 5).flatMap(lang => [`${lang}.*`, lang]).join(',');
}

function parseCaptionFile(filePath, options = {}) {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, 'utf8');
  if (ext === '.json3') return parseJson3Detailed(JSON.parse(raw), options);
  if (ext === '.vtt') return parseVttDetailed(raw, options);
  return { rows: [], wordTimings: [] };
}

function captionFileScore(name = '', metadata = {}, track = null) {
  const lower = String(name).toLowerCase();
  let score = lower.endsWith('.json3') ? 15 : lower.endsWith('.vtt') ? 8 : 0;
  const preferred = [track?.lang, metadata.originalLanguage, metadata.language, 'en', 'hi']
    .map(normalizeLang).filter(Boolean);
  for (let i = 0; i < preferred.length; i++) {
    const lang = preferred[i], base = lang.split('-')[0];
    if (lower.includes(`.${lang}.`) || lower.includes(`.${base}.`)) score += 50 - i * 6;
  }
  return score;
}

async function materializeCaptionFallback(song, ytdlpPath, metadata, track, options = {}) {
  if (!song?.url || !ytdlpPath) return null;
  const base = options.tempRoot || path.join(os.tmpdir(), 'deepecho-lyrics-captions');
  const dir = path.join(base, `captions-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  fs.mkdirSync(dir, { recursive: true });
  try {
    const langs = subtitleLanguageCandidates(metadata, track);
    const args = [
      '--no-warnings', '--no-playlist', '--skip-download',
      '--write-subs', '--write-auto-subs',
      '--sub-format', 'json3/vtt/best',
      '--sub-langs', langs || 'en.*,en,hi.*,hi',
      '-o', path.join(dir, 'caption.%(ext)s'),
      song.url
    ];
    await runYtDlpSmart(ytdlpPath, args, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 45000,
      signal: options.signal,
      purpose: 'lyrics-captions',
      browserAuth: options.browserAuth,
      allowFallbackClients: true
    });
    const files = fs.readdirSync(dir)
      .filter(name => /\.(?:json3|vtt)$/i.test(name))
      .sort((a,b) => captionFileScore(b, metadata, track) - captionFileScore(a, metadata, track));
    for (const name of files) {
      try {
        const automatic = track ? track.kind === 'automatic captions' : true;
        const parsed = parseCaptionFile(path.join(dir, name), { rolling: automatic });
        if (parsed.rows?.length) {
          return {
            rows: parsed.rows,
            wordTimings: parsed.wordTimings || [],
            source: track ? `YouTube ${track.kind} (${track.lang}) · yt-dlp timing fallback` : 'YouTube captions · yt-dlp timing fallback'
          };
        }
      } catch {}
    }
    return null;
  } catch (error) {
    if (isAbort(error)) throw error;
    console.warn('[youtube lyrics] subtitle materialization fallback unavailable:', String(error?.message || error).replace(/\s+/g, ' ').slice(0, 220));
    return null;
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

async function getYouTubeLyrics(song, ytdlpPath, execFileAsync, fetchImpl = fetch, options = {}) {
  if (!song?.url || !ytdlpPath) return null;
  try {
    const { stdout } = await runYtDlpSmart(
      ytdlpPath,
      ['--no-warnings', '--no-playlist', '--skip-download', '-J', song.url],
      {
        maxBuffer: 20 * 1024 * 1024,
        timeout: 30000,
        signal: options.signal,
        purpose: 'lyrics-metadata',
        browserAuth: options.browserAuth,
        allowFallbackClients: true
      }
    );
    const info = JSON.parse(stdout);
    const metadata = {
      title: info.track || info.alt_title || info.title || song.title || '',
      artist: info.artist || info.creator || info.album_artist || '',
      language: info.language || info.original_language || '',
      originalLanguage: info.original_language || info.language || '',
      videoTitle: info.title || song.title || ''
    };
    const track = chooseCaptionTrack(info);
    let rows = [], wordTimings = [], source = '';

    // Fast path: fetch the subtitle URL yt-dlp already resolved. Some YouTube sessions
    // reject that CDN URL even though metadata/playback succeeded, so failure here is
    // no longer treated as "no sync"; a yt-dlp subtitle materialization fallback follows.
    if (track) {
      try {
        const timeoutSignal = AbortSignal.timeout(7000);
        const fetchSignal = options.signal && typeof AbortSignal.any === 'function' ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
        const response = await fetchImpl(track.url, { signal: fetchSignal, headers: { 'User-Agent': 'Deepeccho/2.2.7' } });
        if (response.ok) {
          const captionOptions = { rolling: track.kind === 'automatic captions' };
          if (track.ext === 'json3') { const parsed = parseJson3Detailed(await response.json(), captionOptions); rows = parsed.rows; wordTimings = parsed.wordTimings; }
          else { const parsed = parseVttDetailed(await response.text(), captionOptions); rows = parsed.rows; wordTimings = parsed.wordTimings; }
          if (rows.length) source = `YouTube ${track.kind} (${track.lang})`;
        }
      } catch (error) {
        if (isAbort(error)) throw error;
      }
    }

    if (!rows.length) {
      const fallback = await materializeCaptionFallback(song, ytdlpPath, metadata, track, options);
      if (fallback?.rows?.length) {
        rows = fallback.rows;
        wordTimings = fallback.wordTimings || [];
        source = fallback.source;
      }
    }

    if (!rows.length) return { metadata };
    return {
      syncedLyrics: rowsToLrc(rows),
      source: source || 'YouTube captions',
      captionLanguage: track?.lang || metadata.originalLanguage || metadata.language || '',
      metadata,
      wordTimings,
      wordTimingSource: wordTimings.length ? `${source || 'YouTube captions'} segment timing` : ''
    };
  } catch (error) {
    if (isAbort(error)) return { cancelled: true };
    if (error?.code === 'YOUTUBE_BOT_CHECK') {
      console.warn('[youtube lyrics] YouTube bot-check; captions skipped for this request.');
      return { blocked: true, errorCode: 'YOUTUBE_BOT_CHECK' };
    }
    console.warn('[youtube lyrics] fallback unavailable:', String(error?.message || error).slice(0, 240));
    return null;
  }
}

module.exports = { cleanCaptionText, collapseCaptionLines, parseJson3, parseJson3Detailed, parseVtt, parseVttDetailed, normalizeWordTimings, rowsToLrc, chooseCaptionTrack, subtitleLanguageCandidates, parseCaptionFile, captionFileScore, materializeCaptionFallback, alignSyncedLyricsToCaptions, getYouTubeLyrics, normalizeLang };
