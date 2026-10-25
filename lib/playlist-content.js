'use strict';

function durationSeconds(value) {
  if (Number.isFinite(Number(value)) && Number(value) > 0 && !String(value).includes(':')) return Number(value);
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const parts = raw.split(':').map(Number);
  if (!parts.length || parts.some(n => !Number.isFinite(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0]) || 0;
}

function explicitPlaylistSignal(item = {}) {
  const fields = [item.type, item.kind, item.resultType, item.contentType, item.webpageType, item.ie_key, item.extractor_key]
    .map(v => String(v || '').toLowerCase());
  if (fields.some(v => v.includes('playlist') || v === 'youtubetab')) return true;
  if (item.isPlaylist === true || item.playlist === true || item.playlistId) return true;
  const url = String(item.url || item.webpage_url || item.webpageUrl || '');
  return /(?:youtube\.com\/playlist\?|[?&]list=)/i.test(url);
}

function isPlaylistLike(item = {}) {
  if (!item) return false;
  if (explicitPlaylistSignal(item)) return true;
  const title = String(item.title || item.name || '').trim();
  if (!title) return false;
  const seconds = durationSeconds(item.duration);
  const strong = /\b(?:playlist|jukebox|non[ -]?stop|full album|full soundtrack|top (?:hits|songs)|best of|audio jukebox|mega mix|music mix|mixtape|song collection|songs collection|all songs|hits of|compilation)\b/i;
  if (strong.test(title)) return true;
  const soft = /(?:\bpov\b|sounds? like|playlist for|for anyone who|for when|mood songs?|\bvibes?\b|love songs?|romantic songs?|sad songs?|chill songs?|party songs?|workout songs?|late[ -]?night)/i;
  if (seconds >= 14 * 60 && soft.test(title)) return true;
  const musicish = /\b(?:songs?|music|hits?|vibes?|romantic|love|sad|chill|party|workout|night|bollywood|punjabi|hindi)\b/i;
  return seconds >= 38 * 60 && musicish.test(title);
}

function parseTimestampToken(raw = '') {
  const parts = String(raw || '').trim().split(':').map(Number);
  if (parts.some(n => !Number.isFinite(n))) return -1;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return -1;
}

function cleanTrackTitle(raw = '') {
  return String(raw || '')
    .replace(/^\s*(?:track\s*)?\d{1,3}\s*[.)\-:|]\s*/i, '')
    .replace(/^\s*[-–—•*|]+\s*/, '')
    .replace(/\s*(?:\||•)\s*(?:official.*|lyrics?.*|audio.*|video.*)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function usableTrackTitle(title = '') {
  const t = cleanTrackTitle(title);
  if (t.length < 2) return false;
  if (/^(?:intro|outro|credits?|subscribe|advertisement|sponsor(?:ed)?|interlude|end screen)$/i.test(t)) return false;
  return true;
}

function normalizeTracklist(rows = [], duration = 0, source = '') {
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const start = Math.max(0, Number(row.start || row.start_time || 0));
    const title = cleanTrackTitle(row.title || row.name || '');
    if (!usableTrackTitle(title)) continue;
    const key = `${Math.round(start)}|${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, start, end:Number(row.end || row.end_time || 0) || 0, source:row.source || source || '' });
  }
  out.sort((a,b) => a.start - b.start);
  for (let i = 0; i < out.length; i++) {
    if (!(out[i].end > out[i].start)) out[i].end = i + 1 < out.length ? out[i + 1].start : Math.max(out[i].start, Number(duration) || out[i].start);
  }
  return out;
}

function tracklistComplete(rows = [], duration = 0) {
  const list = Array.isArray(rows) ? rows : [];
  const total = Math.max(0, Number(duration) || 0);
  if (list.length < 2) return false;
  if (total >= 40 * 60 && list.length < 4) return false;
  if (total >= 20 * 60 && list.length < 3) return false;
  if (!total) return list.length >= 2;
  if (list[0].start > Math.max(150, total * .08)) return false;
  const last = list[list.length - 1];
  if (last.start < Math.min(total * .35, Math.max(0, total - 20 * 60))) return false;
  const covered = list.reduce((sum,row) => sum + Math.max(0, Math.min(total, row.end || total) - Math.max(0,row.start)), 0);
  return covered >= total * .65;
}

function extractDescriptionTracklist(description = '', duration = 0) {
  const rows = [];
  for (const line of String(description || '').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:[-–—•*]\s*)?(?:(?:\d{1,3}[.)]\s*)?)((?:\d{1,2}:)?\d{1,2}:\d{2})\s*(?:[-–—|:]\s*)?(.+?)\s*$/);
    if (!m) continue;
    const start = parseTimestampToken(m[1]);
    if (start < 0 || (duration && start > duration + 10)) continue;
    rows.push({ title:m[2], start, source:'description' });
  }
  return normalizeTracklist(rows, duration, 'description');
}

function extractTracklist(info = {}) {
  const duration = durationSeconds(info.duration || info.duration_string);
  const chapters = normalizeTracklist(Array.isArray(info.chapters) ? info.chapters : [], duration, 'chapters');
  if (tracklistComplete(chapters, duration)) return { source:'chapters', duration, tracks:chapters, complete:true };
  const description = extractDescriptionTracklist(info.description || '', duration);
  if (tracklistComplete(description, duration)) return { source:'description', duration, tracks:description, complete:true };
  const fallback = chapters.length >= description.length ? chapters : description;
  return { source:fallback[0]?.source || '', duration, tracks:fallback, complete:false };
}

function words(value = '') {
  return new Set(String(value || '').toLowerCase().replace(/\b(?:official|audio|video|lyrics?|lyrical|hd|4k|remaster(?:ed)?|topic)\b/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter(w => w.length > 1));
}

function overlapScore(a = '', b = '') {
  const aa = words(a), bb = words(b);
  if (!aa.size || !bb.size) return 0;
  let hit = 0; for (const w of aa) if (bb.has(w)) hit++;
  return hit / Math.max(aa.size, Math.min(bb.size, aa.size + 2));
}

function playableCandidateScore(track = {}, candidate = {}, index = 0) {
  if (!candidate?.id || isPlaylistLike(candidate)) return -999;
  const seconds = durationSeconds(candidate.duration);
  if (seconds > 14 * 60) return -999;
  const title = String(candidate.title || '');
  let score = overlapScore(track.title, `${title} ${candidate.channel || ''}`) * 100;
  if (/\bofficial (?:audio|music video|video)\b/i.test(title)) score += 8;
  if (/\btopic\b/i.test(candidate.channel || '')) score += 5;
  if (/\b(?:cover|karaoke|instrumental|slowed|reverb|nightcore|8d|live)\b/i.test(title) && !/\b(?:cover|karaoke|instrumental|slowed|reverb|nightcore|8d|live)\b/i.test(track.title || '')) score -= 28;
  score -= Math.min(10, Number(index || 0) * 1.5);
  return score;
}

function choosePlayableCandidate(track = {}, candidates = []) {
  const ranked = (Array.isArray(candidates) ? candidates : []).map((candidate,index) => ({candidate,score:playableCandidateScore(track,candidate,index)}))
    .sort((a,b) => b.score - a.score);
  return ranked[0]?.score >= 24 ? ranked[0].candidate : null;
}

function playlistSourceUrl(seed = {}) {
  const url = String(seed.url || seed.webpage_url || seed.webpageUrl || '').trim();
  if (/youtube\.com\/playlist\?|[?&]list=/i.test(url)) return url;
  const playlistId = String(seed.playlistId || '').trim();
  if (playlistId) return `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
  const id = String(seed.id || '').trim();
  if (seed.isPlaylist && id) return `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}`;
  return url;
}


function durationLabel(value) {
  if (typeof value === 'string' && value.includes(':')) return value;
  const total = Math.max(0, Math.floor(Number(value) || 0));
  if (!total) return '';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

function mapPlaylistEntry(entry = {}) {
  const id = String(entry.id || entry.url || '').trim();
  if (!id) return null;
  const videoId = /^[A-Za-z0-9_-]{11}$/.test(id) ? id : String(entry.id || '').trim();
  const url = /^https?:/i.test(String(entry.webpage_url || entry.url || ''))
    ? String(entry.webpage_url || entry.url)
    : (/^[A-Za-z0-9_-]{11}$/.test(videoId) ? `https://www.youtube.com/watch?v=${videoId}` : '');
  if (!url) return null;
  return {
    id: videoId || id,
    title: entry.title || 'Untitled',
    channel: entry.channel || entry.uploader || entry.artist || '',
    duration: entry.duration_string || durationLabel(entry.duration),
    thumbnail: entry.thumbnail || (/^[A-Za-z0-9_-]{11}$/.test(videoId) ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''),
    url
  };
}

module.exports = {
  durationSeconds,
  explicitPlaylistSignal,
  isPlaylistLike,
  parseTimestampToken,
  cleanTrackTitle,
  tracklistComplete,
  extractDescriptionTracklist,
  extractTracklist,
  overlapScore,
  playableCandidateScore,
  choosePlayableCandidate,
  playlistSourceUrl,
  mapPlaylistEntry,
  durationLabel
};
