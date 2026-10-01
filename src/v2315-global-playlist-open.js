(() => {
  'use strict';

  // V15: one playlist detector/open action shared by song cards and song rows.
  // It is deliberately additive: normal single-song playback is left untouched.
  const CACHE_KEY = 'deepeccho-detected-playlist-cache-v1';
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const MAX_CACHE_ITEMS = 30;

  function durationSeconds(value) {
    const raw = String(value || '').trim();
    if (!raw) return 0;
    const parts = raw.split(':').map(Number);
    if (parts.some(n => !Number.isFinite(n))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number(parts[0]) || 0;
  }

  function explicitPlaylistSignal(song) {
    const fields = [song?.type, song?.kind, song?.resultType, song?.contentType, song?.webpageType]
      .map(v => String(v || '').toLowerCase());
    if (fields.some(v => v === 'playlist' || v.includes('playlist'))) return true;
    if (song?.isPlaylist === true || song?.playlist === true || song?.playlistId) return true;
    const url = String(song?.url || song?.webpage_url || song?.webpageUrl || '');
    return /(?:[?&]list=|youtube\.com\/playlist\?)/i.test(url);
  }

  function isDetectedPlaylist(song) {
    if (!song) return false;
    if (explicitPlaylistSignal(song)) return true;
    const title = String(song.title || song.name || '').trim();
    if (!title) return false;
    const seconds = durationSeconds(song.duration);

    // Strong labels are safe enough even for shorter compilation videos.
    const strong = /\b(?:playlist|jukebox|non[ -]?stop|full album|full soundtrack|top (?:hits|songs)|best of|audio jukebox|mega mix|music mix|mixtape|song collection|songs collection|all songs|hits of|compilation)\b/i;
    if (strong.test(title)) return true;

    // Softer mood/POV wording is only treated as a playlist when the video is long enough
    // to be implausible as a normal single track. This keeps ordinary songs clean.
    const soft = /(?:\bpov\b|sounds? like|playlist for|for anyone who|for when|mood songs?|\bvibes?\b|love songs?|romantic songs?|sad songs?|chill songs?|party songs?|workout songs?|late[ -]?night)/i;
    if (seconds >= 14 * 60 && soft.test(title)) return true;

    // Very long music-oriented search results are almost always mixes/compilations.
    const musicish = /\b(?:songs?|music|hits?|vibes?|romantic|love|sad|chill|party|workout|night|bollywood|punjabi|hindi)\b/i;
    return seconds >= 38 * 60 && musicish.test(title);
  }

  function itemKey(song) {
    return String(song?.id || song?.url || `${song?.title || ''}|${song?.channel || ''}`).trim();
  }

  function familyKey(song) {
    return `${String(song?.title || '')} ${String(song?.channel || '')}`
      .toLowerCase()
      .replace(/\b(?:official|video|audio|lyrics?|lyrical|music|hd|4k|visualizer|topic|remastered?|remaster)\b/g, ' ')
      .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
      .replace(/[^a-z0-9\u0900-\u097f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function individualSong(song) {
    if (!song?.id || isDetectedPlaylist(song)) return false;
    const seconds = durationSeconds(song.duration);
    return !seconds || seconds <= 13 * 60;
  }

  function readCache() {
    try {
      const value = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch (_) { return {}; }
  }

  function cachedSongs(song) {
    const cache = readCache();
    const entry = cache[itemKey(song)];
    if (!entry || Date.now() - Number(entry.updatedAt || 0) > CACHE_TTL || !Array.isArray(entry.songs)) return [];
    return entry.songs;
  }

  function saveCachedSongs(song, songs) {
    try {
      const cache = readCache();
      cache[itemKey(song)] = { updatedAt: Date.now(), songs: songs.slice(0, 20) };
      const trimmed = Object.fromEntries(Object.entries(cache)
        .sort((a, b) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0))
        .slice(0, MAX_CACHE_ITEMS));
      localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
    } catch (_) {}
  }

  function playlistTheme(song) {
    const raw = String(song?.title || '')
      .replace(/\b(?:playlist|jukebox|non[ -]?stop|full album|full soundtrack|top hits|top songs|best of|audio jukebox|mega mix|music mix|mixtape|compilation)\b/gi, ' ')
      .replace(/\b(?:pov|sounds? like(?: this)?|playlist for|for anyone who|for when)\b/gi, ' ')
      .replace(/[|•#*_~]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return raw.length >= 4 ? raw : String(song?.title || '').trim();
  }

  async function resolvePlaylistSongs(song) {
    const cached = cachedSongs(song);
    if (cached.length) return cached;
    const search = window.echoAPI?.search;
    if (typeof search !== 'function') return [];

    const title = String(song?.title || '').trim();
    const channel = String(song?.channel || '').trim();
    const theme = playlistTheme(song);
    const queries = [
      `${title} tracklist individual songs official audio`,
      `${theme} ${channel} songs official audio`
    ].map(q => q.replace(/\s+/g, ' ').trim()).filter(Boolean);

    const out = [];
    const seenIds = new Set([String(song?.id || '')]);
    const seenFamilies = new Set();
    for (const query of queries) {
      let rows = [];
      try { rows = await search(query); } catch (_) { rows = []; }
      if (!Array.isArray(rows)) continue;
      for (const candidate of rows) {
        if (!individualSong(candidate) || seenIds.has(candidate.id)) continue;
        const family = familyKey(candidate);
        if (family && seenFamilies.has(family)) continue;
        seenIds.add(candidate.id);
        if (family) seenFamilies.add(family);
        out.push(typeof normalizeSong === 'function' ? normalizeSong(candidate) : candidate);
        if (out.length >= 20) break;
      }
      if (out.length >= 8) break;
    }
    if (out.length) saveCachedSongs(song, out);
    return out;
  }

  function activeTab() {
    return document.querySelector('.nav-item.active[data-tab]')?.dataset.tab
      || document.querySelector('[data-tab].active')?.dataset.tab
      || 'home';
  }

  async function openDetectedPlaylist(song, button = null) {
    if (!isDetectedPlaylist(song)) return false;
    const original = button?.textContent || 'Open';
    if (button) { button.disabled = true; button.textContent = 'Opening…'; }
    try {
      if (typeof showToast === 'function') showToast('Finding songs in this playlist…');
      const songs = await resolvePlaylistSongs(song);
      if (!songs.length) {
        if (typeof showToast === 'function') showToast('Is playlist ke individual songs abhi nahi mile.');
        return false;
      }
      if (typeof window.deepEchoOpenPlaylistCollection === 'function') {
        window.deepEchoOpenPlaylistCollection(song.title || 'Playlist', songs, {
          type: 'detected-playlist',
          key: `detected-playlist:${itemKey(song)}`,
          returnTab: activeTab(),
          subtitle: `${song.channel || 'Detected playlist'} · ${songs.length} songs`
        });
        return true;
      }
      if (typeof smartOpenSearchCollection === 'function') {
        smartOpenSearchCollection(song.title || 'Playlist', songs, 'playlist');
        return true;
      }
      return false;
    } finally {
      if (button) { button.disabled = false; button.textContent = original; }
    }
  }

  function makeOpenButton(song, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = 'Open';
    button.title = 'Open playlist songs';
    button.setAttribute('aria-label', `Open playlist ${song?.title || ''}`.trim());
    button.addEventListener('click', event => {
      event.stopPropagation();
      event.preventDefault();
      openDetectedPlaylist(song, button);
    });
    return button;
  }

  function enhanceSongCard(card, song) {
    if (!card || !isDetectedPlaylist(song) || card.querySelector('.v2315-playlist-open')) return card;
    card.classList.add('v2315-detected-playlist');
    const quick = card.querySelector('.card-queue-actions');
    if (quick) quick.insertBefore(makeOpenButton(song, 'v2315-playlist-open v2315-playlist-open-card'), quick.firstChild);
    return card;
  }

  function enhanceSongRow(row, song) {
    if (!row || !isDetectedPlaylist(song) || row.querySelector('.v2315-playlist-open')) return row;
    row.classList.add('v2315-detected-playlist');
    const actions = row.querySelector('.song-actions');
    if (actions) actions.insertBefore(makeOpenButton(song, 'v2315-playlist-open v2315-playlist-open-row'), actions.firstChild);
    return row;
  }

  // Wrap the two central renderers. This covers Search, Recently Played, Home shelves,
  // Liked Songs, Downloads and History without adding anything to normal single tracks.
  try {
    const baseBuildSongCard = buildSongCard;
    buildSongCard = function(song, contextSpec = null) {
      return enhanceSongCard(baseBuildSongCard(song, contextSpec), song);
    };
  } catch (_) {}

  try {
    const baseBuildSongRow = buildSongRow;
    buildSongRow = function(song, isLibrary, contextSpec = null) {
      return enhanceSongRow(baseBuildSongRow(song, isLibrary, contextSpec), song);
    };
  } catch (_) {}

  // Continue Listening uses its own card builder, so cover it too.
  try {
    const baseResumeCard = smartBuildResumeCard;
    smartBuildResumeCard = function(entry) {
      const card = baseResumeCard(entry);
      return enhanceSongCard(card, entry?.song);
    };
  } catch (_) {}

  // Recently Played can be rendered before this additive module is loaded. Rebuild it once
  // so existing cards immediately receive playlist Open buttons.
  setTimeout(() => {
    try { if (typeof renderRecentlyPlayed === 'function') renderRecentlyPlayed(); } catch (_) {}
    try { if (typeof renderContinueListening === 'function') renderContinueListening(); } catch (_) {}
  }, 40);

  window.deepEchoPlaylistDetector = {
    isPlaylist: isDetectedPlaylist,
    open: openDetectedPlaylist,
    resolve: resolvePlaylistSongs,
    durationSeconds
  };
})();
