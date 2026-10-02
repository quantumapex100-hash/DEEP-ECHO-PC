'use strict';

function searchLyricsVersionScore(song = {}, query = '', baseIndex = 0) {
  const title = String(song.title || '').toLowerCase();
  const channel = String(song.channel || '').toLowerCase();
  const cleanedQuery = String(query || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const qWords = new Set(cleanedQuery.split(/\s+/).filter(w => w.length > 1));
  const titleWords = new Set(title.replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter(Boolean));
  let hit = 0; for (const word of qWords) if (titleWords.has(word)) hit++;
  const overlap = qWords.size ? hit / qWords.size : 0;
  let score = overlap * 34 - Math.min(14, baseIndex * .45);
  const lyrical = /\b(lyrics?|lyrical|lyric video|lyrics video)\b/i.test(title);
  const official = /\bofficial\b/i.test(`${title} ${channel}`);
  if (lyrical) score += 44;
  if (lyrical && overlap < .35) score -= 32;
  if (lyrical && official) score += 9;
  if (/\bofficial (music )?video\b/i.test(title)) score += 11;
  if (/\bofficial audio\b/i.test(title)) score += 8;
  if (/\btopic\b/i.test(channel)) score += 5;
  if (/\b(slowed|reverb|sped up|nightcore|remix|mashup|cover|karaoke|instrumental|live|8d)\b/i.test(title)) score -= 34;
  return { score, lyrical, official };
}

function rankSearchResultsForLyrics(base = [], lyric = [], query = '', limit = 20) {
  const merged = [], seen = new Set();
  for (const song of [...(Array.isArray(base) ? base : []), ...(Array.isArray(lyric) ? lyric : [])]) {
    if (!song?.id || seen.has(song.id)) continue;
    seen.add(song.id); merged.push(song);
  }
  return merged.map((song, index) => {
    const rank = searchLyricsVersionScore(song, query, index);
    return {
      ...song,
      lyricsReady:rank.lyrical,
      versionKind:rank.lyrical ? 'lyrics' : (/official (music )?video/i.test(song.title || '') ? 'music-video' : (/official audio/i.test(song.title || '') ? 'official-audio' : 'other')),
      _lyricsSearchScore:rank.score
    };
  }).sort((a,b) => b._lyricsSearchScore - a._lyricsSearchScore)
    .slice(0, Math.max(1, Number(limit) || 20))
    .map(({ _lyricsSearchScore, ...song }) => song);
}

module.exports = { searchLyricsVersionScore, rankSearchResultsForLyrics };
