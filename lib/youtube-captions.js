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

function parseJson3(data, options = {}) {
  const rows = [];
  for (const event of data?.events || []) {
    const text = (event.segs || []).map(seg => seg.utf8 || '').join('');
    if (!text.trim()) continue;
    rows.push({ time: (Number(event.tStartMs) || 0) / 1000, text });
  }
  return collapseCaptionLines(rows, options);
}

function parseVtt(vtt = '', options = {}) {
  const rows = [];
  const blocks = String(vtt).replace(/\r/g, '').split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.split('\n').map(v => v.trim()).filter(Boolean);
    const timingIndex = lines.findIndex(v => /-->/.test(v));
    if (timingIndex < 0) continue;
    const start = lines[timingIndex].split('-->')[0].trim().split(':');
    if (start.length < 2) continue;
    const seconds = start.reduce((total, part) => total * 60 + Number(part.replace(',', '.')), 0);
    const text = lines.slice(timingIndex + 1).join(' ');
    rows.push({ time: seconds, text });
  }
  return collapseCaptionLines(rows, options);
}

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
    if (!track) return { metadata };
    const timeoutSignal = AbortSignal.timeout(7000);
    const fetchSignal = options.signal && typeof AbortSignal.any === 'function' ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
    const response = await fetchImpl(track.url, { signal: fetchSignal, headers: { 'User-Agent': 'Deepeccho/1.4.11' } });
    if (!response.ok) return { metadata };
    let rows = [];
    const captionOptions = { rolling: track.kind === 'automatic captions' };
    if (track.ext === 'json3') rows = parseJson3(await response.json(), captionOptions);
    else rows = parseVtt(await response.text(), captionOptions);
    if (!rows.length) return { metadata };
    return { syncedLyrics: rowsToLrc(rows), source: `YouTube ${track.kind} (${track.lang})`, captionLanguage: track.lang, metadata };
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

module.exports = { cleanCaptionText, collapseCaptionLines, parseJson3, parseVtt, rowsToLrc, chooseCaptionTrack, alignSyncedLyricsToCaptions, getYouTubeLyrics, normalizeLang };
