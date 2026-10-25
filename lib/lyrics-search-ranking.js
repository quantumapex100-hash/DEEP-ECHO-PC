'use strict';

const { isPlaylistLike } = require('./playlist-content');

function searchLyricsVersionScore(song = {}, query = '', baseIndex = 0) {
  const title = String(song.title || '').toLowerCase();
  const channel = String(song.channel || '').toLowerCase();
  const cleanedQuery = String(query || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const qWords = new Set(cleanedQuery.split(/\s+/).filter(w => w.length > 1));
  const titleWords = new Set(title.replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter(Boolean));
  let hit = 0; for (const word of qWords) if (titleWords.has(word)) hit++;
  const overlap = qWords.size ? hit / qWords.size : 0;
  // Match the requested song before rewarding its upload/lyrics version. Shared
  // artist names and words such as "official" must not make another song win.
  const channelKey = channel.replace(/[^\p{L}\p{N}]+/gu, '');
  const songWords = [...qWords].filter(word => !/^(official|audio|video|music|lyrics?|lyrical|hd|hq|4k|songs?)$/.test(word) && !channelKey.includes(word));
  const matched = songWords.filter(word => titleWords.has(word)).length;
  const relevance = songWords.length ? matched / songWords.length : overlap;
  const matchingVersion = relevance >= .75;
  let score = relevance * 100 + overlap * 34 - Math.min(14, baseIndex * .45);
  const playlist = isPlaylistLike(song);
  const lyrical = !playlist && /\b(lyrics?|lyrical|lyric video|lyrics video)\b/i.test(title);
  const official = /\bofficial\b/i.test(`${title} ${channel}`);
  if (lyrical && matchingVersion) score += 44;
  if (lyrical && !matchingVersion) score -= 32;
  if (lyrical && official && matchingVersion) score += 9;
  if (/\bofficial (music )?video\b/i.test(title)) score += 11;
  if (/\bofficial audio\b/i.test(title)) score += 8;
  if (/\btopic\b/i.test(channel)) score += 5;
  if (/\b(slowed|reverb|sped up|nightcore|remix|mashup|cover|karaoke|instrumental|live|8d)\b/i.test(title)) score -= 34;
  return { score, lyrical, official, relevance };
}

function rankSearchResultsForLyrics(base = [], lyric = [], query = '', limit = 20) {
  const merged = [], seen = new Set();
  for (const song of [...(Array.isArray(base) ? base : []), ...(Array.isArray(lyric) ? lyric : [])]) {
    if (!song?.id || seen.has(song.id)) continue;
    seen.add(song.id); merged.push(song);
  }
  return merged.map((song, index) => {
    const rank = searchLyricsVersionScore(song, query, index);
    const playlist = isPlaylistLike(song);
    return {
      ...song,
      lyricsReady:playlist ? false : rank.lyrical,
      ...(playlist ? { lyricsVerified:false, lyricsChecking:false } : {}),
      versionKind:playlist ? 'playlist' : (rank.lyrical ? 'lyrics' : (/official (music )?video/i.test(song.title || '') ? 'music-video' : (/official audio/i.test(song.title || '') ? 'official-audio' : 'other'))),
      _lyricsSearchScore:rank.score,
      lyricsSearchScore:rank.score,
      lyricsSearchRelevance:rank.relevance
    };
  }).sort((a,b) => b._lyricsSearchScore - a._lyricsSearchScore)
    .slice(0, Math.max(1, Number(limit) || 20))
    .map(({ _lyricsSearchScore, ...song }) => song);
}

function lyricsSupportBoostedScore(song = {}, originalIndex = 0) {
  const base = Number(song.lyricsSearchScore || 0);
  const verifiedBoost = !isPlaylistLike(song) && song.lyricsVerified && (song.lyricsSearchRelevance == null || song.lyricsSearchRelevance >= .75) ? 30 : 0;
  return base + verifiedBoost - Math.max(0, Number(originalIndex || 0)) * .001;
}

function rankVerifiedSearchResults(items = []) {
  return (Array.isArray(items) ? items : []).map((song,index) => ({song,index}))
    .sort((a,b) => lyricsSupportBoostedScore(b.song,b.index) - lyricsSupportBoostedScore(a.song,a.index) || a.index - b.index)
    .map(row => row.song);
}

module.exports = { searchLyricsVersionScore, rankSearchResultsForLyrics, lyricsSupportBoostedScore, rankVerifiedSearchResults };
