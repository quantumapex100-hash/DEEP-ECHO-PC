// Metadata matching is separate from the UI so uploader names cannot win over artists.
function cleanTitle(value = '') {
  return value.replace(/\[([^\]]*)\]|\(([^)]*)\)/g, (match, a, b) =>
    /official|lyric|video|audio|visuali[sz]er|\bhd\b|\b4k\b/i.test(a || b) ? ' ' : match)
    .replace(/\b(official music video|official video|official audio|lyric video|lyrics|lyrical video|full song|video song|audio song)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}
function guessArtistTitle(song) {
  const clean = cleanTitle(song.title);
  const parts = clean.split(/\s+[-–—]\s+/);
  return parts.length > 1
    ? { artist: parts.shift().trim(), title: parts.join(' - ').trim() }
    : { artist: (song.channel || '').replace(/VEVO$|\s*-\s*Topic$/gi, '').trim(), title: clean };
}
const norm = s => cleanTitle(s || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function seconds(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return String(value).split(':').reduce((total, part) => total * 60 + Number(part), 0);
}
function chooseMatch(rows, metadata, duration) {
  const title = norm(metadata.title), artist = norm(metadata.artist);
  const variants = s => s.replace(/\b(feat|ft)\b.*$/, '').trim();
  return (Array.isArray(rows) ? rows : []).filter(row => {
    if (!row.plainLyrics && !row.syncedLyrics && !row.instrumental) return false;
    if (variants(norm(row.trackName)) !== variants(title)) return false;
    const a = norm(row.artistName);
    return artist && a && (a === artist || a.startsWith(artist + ' ') || artist.startsWith(a + ' '));
  }).sort((a, b) => {
    const score = row => (row.syncedLyrics ? 3 : 0) - (duration && row.duration ? Math.abs(row.duration - duration) : 0);
    return score(b) - score(a);
  })[0];
}

const STOP_WORDS = new Set(['official','video','audio','lyrics','lyric','lyrical','song','full','hd','4k','music','feat','ft','from','movie']);
function tokens(value) {
  return norm(value).split(' ').filter(token => token && !STOP_WORDS.has(token));
}
function overlapScore(a, b) {
  const left = new Set(tokens(a)), right = new Set(tokens(b));
  if (!left.size || !right.size) return 0;
  let common = 0;
  for (const token of left) if (right.has(token)) common++;
  return common / Math.max(left.size, right.size);
}
function chooseLooseMatch(rows, metadata, duration) {
  const wantedTitle = metadata.title || '';
  const wantedArtist = metadata.artist || '';
  const scored = (Array.isArray(rows) ? rows : []).filter(row => row && (row.plainLyrics || row.syncedLyrics || row.instrumental)).map(row => {
    const titleScore = overlapScore(wantedTitle, row.trackName || '');
    const artistScore = wantedArtist ? overlapScore(wantedArtist, row.artistName || '') : 0;
    const durationPenalty = duration && row.duration ? Math.min(0.35, Math.abs(row.duration - duration) / 150) : 0;
    return { row, score: titleScore * 0.78 + artistScore * 0.22 + (row.syncedLyrics ? 0.08 : 0) - durationPenalty, titleScore };
  }).filter(item => item.titleScore >= 0.45).sort((a, b) => b.score - a.score);
  return scored[0]?.row;
}

function titleCandidates(song, meta) {
  const raw = cleanTitle(song.title || '');
  const pipe = raw.split(/\s*[|｜]\s*/).map(v => v.trim()).filter(Boolean);
  const colon = raw.split(/\s*[:：]\s*/).map(v => v.trim()).filter(Boolean);
  const values = [meta.title, pipe[0], colon[0], raw]
    .map(v => String(v || '').replace(/\b(lyrics?|lyrical|official|video|audio|full song|video song|audio song)\b/gi, ' ').replace(/\s+/g, ' ').trim())
    .filter(v => v.length >= 2);
  return [...new Set(values)];
}

const DEVANAGARI = /[\u0900-\u097F]/;
const GURMUKHI = /[\u0A00-\u0A7F]/;
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const SCRIPT_RE = new RegExp(`${DEVANAGARI.source}|${GURMUKHI.source}|${ARABIC.source}`);
const VOWELS = { 'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ऋ':'ri','ए':'e','ऐ':'ai','ओ':'o','औ':'au' };
const MATRAS = { 'ा':'aa','ि':'i','ी':'ee','ु':'u','ू':'oo','ृ':'ri','े':'e','ै':'ai','ो':'o','ौ':'au','ॅ':'e','ॉ':'o' };
const CONSONANTS = {
  'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ng','च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'ny',
  'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n',
  'प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h','ळ':'l'
};
const GURMUKHI_VOWELS = { 'ਅ':'a','ਆ':'aa','ਇ':'i','ਈ':'ee','ਉ':'u','ਊ':'oo','ਏ':'e','ਐ':'ai','ਓ':'o','ਔ':'au' };
const GURMUKHI_MATRAS = { 'ਾ':'aa','ਿ':'i','ੀ':'ee','ੁ':'u','ੂ':'oo','ੇ':'e','ੈ':'ai','ੋ':'o','ੌ':'au' };
const GURMUKHI_CONSONANTS = {
  'ਕ':'k','ਖ':'kh','ਗ':'g','ਘ':'gh','ਙ':'ng','ਚ':'ch','ਛ':'chh','ਜ':'j','ਝ':'jh','ਞ':'ny',
  'ਟ':'t','ਠ':'th','ਡ':'d','ਢ':'dh','ਣ':'n','ਤ':'t','ਥ':'th','ਦ':'d','ਧ':'dh','ਨ':'n',
  'ਪ':'p','ਫ':'ph','ਬ':'b','ਭ':'bh','ਮ':'m','ਯ':'y','ਰ':'r','ਲ':'l','ਵ':'v','ਸ਼':'sh','ਸ':'s','ਹ':'h','ੜ':'r','ਲ਼':'l'
};
const ARABIC_MAP = {
  'ا':'a','أ':'a','إ':'i','آ':'aa','ء':'','ؤ':'u','ئ':'i','ى':'a','ة':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh',
  'د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'z','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k',
  'ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y','پ':'p','چ':'ch','ژ':'zh','گ':'g','ں':'n','ھ':'h','ٹ':'t','ڈ':'d','ڑ':'r','ے':'e'
};
const ARABIC_MARKS = { 'َ':'a','ِ':'i','ُ':'u','ً':'an','ٍ':'in','ٌ':'un','ْ':'','ّ':'' };
function romanizeHindiWord(word) {
  const chars = [...String(word)];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (VOWELS[ch]) { out += VOWELS[ch]; continue; }
    if (CONSONANTS[ch]) {
      out += CONSONANTS[ch];
      const next = chars[i + 1];
      if (next === '्') { i++; continue; }
      if (MATRAS[next]) { out += MATRAS[next]; i++; continue; }
      if (next === '़') { i++; }
      out += 'a';
      continue;
    }
    if (ch === 'ं' || ch === 'ँ') { out += 'n'; continue; }
    if (ch === 'ः') { out += 'h'; continue; }
    if (ch === '़' || ch === '्') continue;
    out += ch;
  }
  if (/a$/i.test(out) && DEVANAGARI.test(word)) out = out.slice(0, -1);
  return out;
}
function romanizeGurmukhiWord(word) {
  const chars = [...String(word)];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (GURMUKHI_VOWELS[ch]) { out += GURMUKHI_VOWELS[ch]; continue; }
    if (GURMUKHI_CONSONANTS[ch]) {
      out += GURMUKHI_CONSONANTS[ch];
      const next = chars[i + 1];
      if (next === '੍') { i++; continue; }
      if (next === '਼') { i++; }
      if (GURMUKHI_MATRAS[next]) { out += GURMUKHI_MATRAS[next]; i++; continue; }
      out += 'a';
      continue;
    }
    if (ch === 'ਂ' || ch === 'ੰ') { out += 'n'; continue; }
    if (ch === 'ੱ') continue;
    if (ch === '੍' || ch === '਼') continue;
    out += ch;
  }
  if (/a$/i.test(out) && GURMUKHI.test(word)) out = out.slice(0, -1);
  return out;
}
function romanizeArabicWord(word) {
  const chars = [...String(word)];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ARABIC_MARKS[ch] !== undefined) {
      if (ch === 'ّ' && out) out += out.slice(-1);
      else out += ARABIC_MARKS[ch];
      continue;
    }
    if (ARABIC_MAP[ch] !== undefined) {
      const value = ARABIC_MAP[ch];
      const next = chars[i + 1] || '';
      if ((ch === 'و' || ch === 'ي') && !out) {
        out += (ch === 'و' ? 'wo' : 'ya');
      } else if ((ch === 'ا' || ch === 'آ') && /[aeiou]$/i.test(out)) {
        out += ch === 'آ' ? 'a' : '';
      } else {
        out += value;
      }
      if ((ch === 'و' && ARABIC_MARKS[next] === undefined && !ARABIC_MAP[next]) || (ch === 'ي' && ARABIC_MARKS[next] === undefined && !ARABIC_MAP[next])) {
        out += '';
      }
      continue;
    }
    out += ch;
  }
  return out;
}
function romanizeHindiText(value = '') {
  const input = String(value);
  if (!SCRIPT_RE.test(input)) return input;
  return input.split(/(\s+)/).map(part => {
    if (DEVANAGARI.test(part)) return romanizeHindiWord(part);
    if (GURMUKHI.test(part)) return romanizeGurmukhiWord(part);
    if (ARABIC.test(part)) return romanizeArabicWord(part);
    return part;
  }).join('');
}
function romanizeLyricsResult(result) {
  if (!result || (!SCRIPT_RE.test(result.lyrics || '') && !SCRIPT_RE.test(result.syncedLyrics || ''))) return result;
  return {
    ...result,
    originalLyrics: result.lyrics || '',
    originalSyncedLyrics: result.syncedLyrics || '',
    lyrics: result.lyrics ? romanizeHindiText(result.lyrics) : result.lyrics,
    syncedLyrics: result.syncedLyrics ? romanizeHindiText(result.syncedLyrics) : result.syncedLyrics,
    romanized: true
  };
}

function withScriptVariants(result) {
  if (!result) return result;
  const lyrics = result.lyrics || '';
  const synced = result.syncedLyrics || '';
  if (!SCRIPT_RE.test(lyrics) && !SCRIPT_RE.test(synced)) return result;
  // Keep the source language/script as the default. Romanization is an optional UI variant,
  // never an automatic replacement, so existing English tracks cannot accidentally become a translation.
  return {
    ...result,
    romanizedLyrics: lyrics ? romanizeHindiText(lyrics) : '',
    romanizedSyncedLyrics: synced ? romanizeHindiText(synced) : '',
    hasRomanizedVariant: true
  };
}
function isExplicitInstrumentalSong(song = {}) {
  const text = `${song.title || ''} ${song.channel || ''}`.toLocaleLowerCase();
  return /\b(instrumental|karaoke|backing track|minus one|no vocals?|music only)\b/i.test(text);
}

function scriptProfile(value = '') {
  const text = String(value);
  let latin = 0, devanagari = 0, gurmukhi = 0, arabic = 0, letters = 0;
  for (const ch of text) {
    if (/\p{L}/u.test(ch)) letters++;
    if (/[A-Za-z]/.test(ch)) latin++;
    if (DEVANAGARI.test(ch)) devanagari++;
    if (GURMUKHI.test(ch)) gurmukhi++;
    if (ARABIC.test(ch)) arabic++;
  }
  return {
    latin, devanagari, gurmukhi, arabic, letters,
    devanagariRatio: letters ? devanagari / letters : 0,
    gurmukhiRatio: letters ? gurmukhi / letters : 0,
    arabicRatio: letters ? arabic / letters : 0,
    latinRatio: letters ? latin / letters : 0
  };
}

async function getLyrics(song, fetchImpl = fetch) {
  const meta = guessArtistTitle(song);
  if (!meta.title) return { error: 'Song title samajh nahi aaya.' };
  let networkError = false;
  const request = async url => {
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(4500), headers: { 'User-Agent': 'Deepeccho/1.4.11', Accept: 'application/json' } });
      if (!response.ok) { if (response.status >= 500 || response.status === 429) networkError = true; return null; }
      return await response.json();
    } catch { networkError = true; return null; }
  };
  const duration = seconds(song.duration);
  const params = new URLSearchParams({ track_name: meta.title, artist_name: meta.artist });
  if (duration > 0) params.set('duration', String(duration));
  // v2.2.8 V6: exact and search requests run together so the UI is not forced
  // through two sequential network waits. Matching rules remain unchanged.
  const [exactRow, primaryRows] = await Promise.all([
    request(`https://lrclib.net/api/get?${params}`),
    request(`https://lrclib.net/api/search?${new URLSearchParams({ track_name: meta.title, artist_name: meta.artist })}`)
  ]);
  let row = chooseMatch(exactRow ? [exactRow] : [], meta, duration);
  if (!row) row = chooseMatch(primaryRows, meta, duration);
  if (!row) {
    const candidates = titleCandidates(song, meta);
    const batches = await Promise.all(candidates.map(async candidate => ({
      candidate, rows: await request(`https://lrclib.net/api/search?${new URLSearchParams({ q: candidate })}`)
    })));
    for (const item of batches) {
      row = chooseLooseMatch(item.rows, { ...meta, title: item.candidate }, duration);
      if (row) break;
    }
  }
  const lrclibInstrumentalHint = !!(row && row.instrumental && !row.plainLyrics && !row.syncedLyrics);
  if (row && (row.plainLyrics || row.syncedLyrics)) {
    return withScriptVariants({ lyrics: row.plainLyrics || '', syncedLyrics: row.syncedLyrics || '', source: 'LRCLIB' });
  }

  // A catalogue can mark the wrong recording/version as instrumental. Treat that flag as a
  // weak hint and keep searching unless this exact YouTube result explicitly says instrumental.
  // lyrics.ovh direct fallback plus metadata suggestion for uploader-heavy YouTube titles.
  let fallback = meta.artist ? await request(`https://api.lyrics.ovh/v1/${encodeURIComponent(meta.artist)}/${encodeURIComponent(meta.title)}`) : null;
  if (fallback?.lyrics) return withScriptVariants({ lyrics: fallback.lyrics.trim(), source: 'lyrics.ovh' });
  for (const candidate of titleCandidates(song, meta)) {
    const suggestion = await request(`https://api.lyrics.ovh/suggest/${encodeURIComponent(candidate)}`);
    const suggestions = suggestion?.data || [];
    const best = suggestions.sort((a, b) => overlapScore(candidate, b.title) - overlapScore(candidate, a.title))[0];
    if (!best || overlapScore(candidate, best.title) < 0.5) continue;
    fallback = await request(`https://api.lyrics.ovh/v1/${encodeURIComponent(best.artist?.name || '')}/${encodeURIComponent(best.title || '')}`);
    if (fallback?.lyrics) return withScriptVariants({ lyrics: fallback.lyrics.trim(), source: 'lyrics.ovh' });
  }
  if (lrclibInstrumentalHint && isExplicitInstrumentalSong(song)) return { instrumental: true, source: 'LRCLIB', confidence: 'explicit-title' };
  return { error: networkError ? 'Lyrics service connect nahi hui. Internet check karke Retry dabao.' : 'Lyrics catalogue mein reliable match nahi mila.' };
}
module.exports = { cleanTitle, guessArtistTitle, chooseMatch, chooseLooseMatch, seconds, getLyrics, romanizeHindiText, romanizeLyricsResult, withScriptVariants, titleCandidates, isExplicitInstrumentalSong, scriptProfile };
