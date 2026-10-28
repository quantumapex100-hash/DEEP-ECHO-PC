(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const homeView236 = $('homeView');
  const searchView236 = $('searchView');
  const playlistsView236 = $('playlistsView');
  const searchInput236 = $('searchInput');
  const audio236 = $('audioPlayer');
  if (!homeView236 || !searchView236 || !playlistsView236 || !searchInput236) return;

  const HOUR = 60 * 60 * 1000;
  let feed236 = null;
  let feedAt236 = 0;
  let personalizedReleaseCache236 = { key: '', at: 0, songs: [] };
  let shelfEnhanceTimer236 = 0;
  const sectionRefreshCounts236 = new Map();

  function uniqueSongs236(items) {
    const out = [], seen = new Set();
    for (const raw of items || []) {
      if (!raw) continue;
      let song = raw;
      try { if (typeof normalizeSong === 'function') song = normalizeSong(raw); } catch (_) {}
      const key = String(song?.id || song?.url || `${song?.title || ''}|${song?.channel || ''}`).trim();
      if (!key || seen.has(key)) continue;
      seen.add(key); out.push(song);
    }
    return out;
  }

  function textKey236(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function hash236(value) {
    let h = 2166136261 >>> 0;
    for (const ch of String(value || '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  function stableRotate236(items, salt = '') {
    const bucket = Math.floor(Date.now() / (6 * HOUR));
    return [...(items || [])].sort((a, b) => {
      const ak = `${a?.id || a?.artistQuery || a?.title || ''}:${bucket}:${salt}`;
      const bk = `${b?.id || b?.artistQuery || b?.title || ''}:${bucket}:${salt}`;
      return hash236(ak) - hash236(bk);
    });
  }

  function tasteSongs236() {
    const all = [];
    try {
      if (typeof smartRecommendationProfile === 'function') all.push(...smartRecommendationProfile().map(row => row.song));
      if (typeof smartRecommendationCache === 'function') all.push(...(smartRecommendationCache()?.songs || []));
      if (typeof getLikedSongs === 'function') all.push(...getLikedSongs());
      if (typeof getStored === 'function' && typeof STORAGE !== 'undefined') all.push(...(getStored(STORAGE.recent, []) || []));
    } catch (_) {}
    return uniqueSongs236(all);
  }

  function rotateBy236(items, amount = 0) {
    const list = [...(items || [])];
    if (!list.length) return list;
    const offset = ((Number(amount) || 0) % list.length + list.length) % list.length;
    return [...list.slice(offset), ...list.slice(0, offset)];
  }

  function smartDiscoveryPool236() {
    let cache = [];
    try { if (typeof smartRecommendationCache === 'function') cache = smartRecommendationCache()?.songs || []; } catch (_) {}
    return uniqueSongs236([...cache, ...tasteSongs236()]);
  }

  function smartBlendFeed236(feedSongs, salt = 'home', refreshNo = 0, limit = 10) {
    const personal = rotateBy236(stableRotate236(smartDiscoveryPool236(), `${salt}:personal:${refreshNo}`), refreshNo * 3);
    const global = rotateBy236(stableRotate236(feedSongs || [], `${salt}:global:${refreshNo}`), refreshNo * 5);
    const out = [], seen = new Set(), artistCounts = new Map();
    const push = song => {
      const id = String(song?.id || ''); if (!id || seen.has(id) || out.length >= limit) return;
      const artist = textKey236(song?.channel || '');
      const count = artistCounts.get(artist) || 0; if (artist && count >= 2) return;
      seen.add(id); if (artist) artistCounts.set(artist, count + 1); out.push(song);
    };
    // Home stays personal, but every row still receives fresh broadly-popular discovery.
    personal.slice(0, 6).forEach(push);
    global.slice(0, 8).forEach(push);
    personal.slice(6, 14).forEach(push);
    global.slice(8).forEach(push);
    return out.slice(0, limit);
  }

  function artistSeeds236(items, limit = 10) {
    const out = [], seen = new Set();
    for (const song of items || []) {
      const artist = String(song?.channel || '').replace(/\s+-\s+Topic$/i, '').trim();
      const key = textKey236(artist);
      if (!artist || seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: `artist-playlist:${key}`,
        title: artist,
        artistQuery: artist,
        thumbnail: song.thumbnail || '',
        seedSong: song,
        type: 'artist-playlist'
      });
      if (out.length >= limit) break;
    }
    return out;
  }

  async function feed236Fetch(force = false) {
    if (!force && feed236 && Date.now() - feedAt236 < 20 * 60 * 1000) return feed236;
    try {
      const data = await window.echoAPI?.getHomeFeed?.(!!force);
      if (data && !data.error) { feed236 = data; feedAt236 = Date.now(); }
    } catch (_) {}
    return feed236 || {};
  }

  function ensureHomeSection236(id, title, subtitle, hintText, afterNode = null) {
    let section = $(id);
    if (section) return section;
    section = document.createElement('div');
    section.id = id;
    section.className = 'home-section smart-home-section home236-section';
    section.innerHTML = `<div class="section-head"><h2>${title}</h2><span>${subtitle}</span></div><div id="${id}Grid" class="card-grid"></div><p id="${id}Hint" class="section-hint">${hintText}</p>`;
    if (afterNode?.parentNode) afterNode.insertAdjacentElement('afterend', section);
    else homeView236.appendChild(section);
    return section;
  }

  const topArtistsSection236 = $('topArtistsGrid')?.closest('.home-section') || null;
  const popularSection236 = ensureHomeSection236('home236PopularArtists', 'Popular Artists', 'Your taste mixed with artists people are playing now', 'Popular artists will appear when Home finishes loading.', topArtistsSection236);
  const releasesSection236 = ensureHomeSection236('home236NewReleases', 'New Releases', 'Fresh releases, tuned to your taste and rotated through the day', 'Fresh releases will appear when Home finishes loading.', popularSection236);

  function playlistLike236(song) {
    const title = String(song?.title || '');
    const duration = String(song?.duration || '');
    const parts = duration.split(':').map(Number);
    const seconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
    return /playlist|jukebox|non[ -]?stop|top\s*(?:hits|songs)|best\s+of|full\s+album|mix\b|songs\s*20\d{2}|audio\s+jukebox/i.test(title) || seconds >= 24 * 60;
  }

  function individualSong236(song) {
    const duration = String(song?.duration || '');
    const parts = duration.split(':').map(Number);
    const seconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
    return !seconds || seconds <= 14 * 60;
  }

  async function searchBackedPlaylistSongs236(seed) {
    // V25: real playlists and long mixes are resolved by their actual entries/tracklist.
    // If the new resolver is available, never fall back to a generic themed search that can
    // produce an incomplete fake playlist.
    if (typeof window.echoAPI?.resolvePlaylistContent === 'function') {
      try {
        const resolved = await window.echoAPI.resolvePlaylistContent(seed);
        return resolved?.success && Array.isArray(resolved.songs) ? uniqueSongs236(resolved.songs) : [];
      } catch (_) { return []; }
    }
    const title = String(seed?.title || '').replace(/\b(top|best|latest|new)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    const artist = String(seed?.channel || '').trim();
    const query = `${title} ${artist} individual songs official audio`.trim();
    try {
      const found = await window.echoAPI?.search?.(query);
      const songs = uniqueSongs236(Array.isArray(found) ? found : []).filter(song => song.id !== seed?.id && individualSong236(song));
      return (songs.length ? songs : uniqueSongs236(Array.isArray(found) ? found : [])).slice(0, 20);
    } catch (_) { return []; }
  }

  function openExternalCollection236(title, songs, { type = 'playlist', key = '', returnTab = 'playlists', subtitle = '' } = {}) {
    const list = uniqueSongs236(songs);
    try { activateTab('playlists'); } catch (_) {}
    const rec = $('playlist236Recommendations'); if (rec) rec.classList.add('hidden');
    try {
      currentExternalPlaylist = { title, type, songs: list };
      currentPlaylistName = null;
      playlistReturnTab = returnTab || 'playlists';
      currentPlaylistDetail = { songs: list, label: title, type, key: key || `${type}:${title}`, source: 'external' };
    } catch (_) {}
    const cards = $('playlistCards'), hint = $('playlistHint'), detail = $('playlistDetail');
    cards?.classList.add('hidden'); hint?.classList.add('hidden'); detail?.classList.remove('hidden');
    if ($('playlistDetailTitle')) $('playlistDetailTitle').textContent = title;
    if ($('playlistDetailCount')) $('playlistDetailCount').textContent = `${list.length} song${list.length === 1 ? '' : 's'}${subtitle ? ` · ${subtitle}` : ''}`;
    if ($('playlistDetailPlayBtn')) $('playlistDetailPlayBtn').disabled = !list.length;
    if ($('shufflePlaylistBtn')) $('shufflePlaylistBtn').disabled = !list.length;
    if ($('backToPlaylistsBtn')) $('backToPlaylistsBtn').textContent = returnTab === 'home' ? 'Back to Home' : returnTab === 'search' ? 'Back to Search' : 'All Playlists';
    try {
      const ctx = makeContext(list, type, title, key || `${type}:${title}`);
      renderPlaylistDetailSongs(list, ctx);
    } catch (_) {
      const host = $('playlistSongs'); if (host) host.innerHTML = '<p class="playlist-detail-empty">Playlist songs could not be rendered.</p>';
    }
  }
  window.deepEchoOpenPlaylistCollection = openExternalCollection236;

  async function openCompilation236(song, returnTab = 'home', playNow = false, button = null) {
    if (button) { button.disabled = true; button.textContent = '...'; }
    const songs = await searchBackedPlaylistSongs236(song);
    if (button) { button.disabled = false; button.textContent = playNow ? 'Play' : 'Open'; }
    if (!songs.length) { try { showToast('Playlist ke individual songs nahi mile.'); } catch (_) {} return; }
    if (playNow) {
      try { await playSongCollection(songs, song.title || 'Top Hits', { type: 'home-playlist', key: `home-playlist:${song.id || song.title}` }, button); } catch (_) {}
      return;
    }
    openExternalCollection236(song.title || 'Top Hits', songs, { type: 'home-playlist', key: `home-playlist:${song.id || song.title}`, returnTab, subtitle: song.channel || 'Top Hits' });
  }

  function renderTopHits236(songs, refreshNo = 0) {
    const grid = $('topHitsGrid'), hint = $('topHitsHint');
    if (!grid || typeof buildSongCard !== 'function') return;
    const list = smartBlendFeed236(uniqueSongs236(songs), 'top-hits', refreshNo, 10);
    try { registerSongs(list); } catch (_) {}
    grid.replaceChildren();
    if (hint) { hint.style.display = list.length ? 'none' : 'block'; hint.textContent = 'No top hits found.'; }
    let ctx = null; try { ctx = makeContext(list, 'home-top', 'Top Hits', 'home-top'); } catch (_) {}
    list.forEach(song => {
      if (playlistLike236(song) && typeof buildPlaylistCard === 'function') {
        const card = buildPlaylistCard({
          title: song.title || 'Top Hits Playlist',
          subtitle: `${song.channel || 'Popular mix'} · Open to view songs`,
          thumbnail: song.thumbnail || '',
          openLabel: 'Open Songs',
          onOpen: (button) => openCompilation236(song, 'home', false, button),
          onPlay: (button) => openCompilation236(song, 'home', true, button)
        });
        card.classList.add('home236-top-playlist');
        grid.appendChild(card);
      } else grid.appendChild(buildSongCard(song, ctx));
    });
  }

  function blendArtists236(feed, refreshNo = 0) {
    const taste = artistSeeds236(tasteSongs236(), 12);
    const popular = artistSeeds236(stableRotate236(feed?.popularArtistSongs || feed?.topArtistSongs || [], 'popular-artists'), 20);
    const out = [], seen = new Set();
    const push = seed => { const key = textKey236(seed?.artistQuery); if (!key || seen.has(key) || out.length >= 10) return; seen.add(key); out.push(seed); };
    taste.slice(0, 6).forEach(push);
    popular.slice(0, 7).forEach(push);
    taste.slice(6).forEach(push);
    popular.slice(7).forEach(push);
    return rotateBy236(out, refreshNo * 3).slice(0, 10);
  }

  async function personalizedReleases236(feed, refreshNo = 0) {
    const taste = artistSeeds236(tasteSongs236(), 4);
    const bucket = Math.floor(Date.now() / (6 * HOUR));
    const seed = taste[(bucket + refreshNo) % Math.max(1, taste.length)];
    const cacheKey = `${seed?.artistQuery || ''}:${bucket}:${refreshNo}`;
    let personal = [];
    if (seed?.artistQuery) {
      if (personalizedReleaseCache236.key === cacheKey && Date.now() - personalizedReleaseCache236.at < 6 * HOUR) personal = personalizedReleaseCache236.songs;
      else {
        try {
          const found = await window.echoAPI?.search?.(`${seed.artistQuery} new songs ${new Date().getFullYear()} official audio`);
          personal = uniqueSongs236(Array.isArray(found) ? found : []).slice(0, 12);
          personalizedReleaseCache236 = { key: cacheKey, at: Date.now(), songs: personal };
        } catch (_) {}
      }
    }
    const general = rotateBy236(stableRotate236(feed?.newReleases || [], `new-releases:${refreshNo}`), refreshNo * 4);
    const out = [], seen = new Set();
    const push = song => { const key = String(song?.id || ''); if (!key || seen.has(key) || out.length >= 10) return; seen.add(key); out.push(song); };
    personal.slice(0, 5).forEach(push);
    general.slice(0, 10).forEach(push);
    personal.slice(5).forEach(push);
    return out.slice(0, 10);
  }

  function renderPopularArtists236(feed, refreshNo = 0) {
    const grid = $('home236PopularArtistsGrid'), hint = $('home236PopularArtistsHint');
    if (!grid) return;
    const seeds = blendArtists236(feed, refreshNo);
    grid.replaceChildren();
    if (hint) hint.style.display = seeds.length ? 'none' : 'block';
    seeds.forEach(seed => {
      if (typeof buildPlaylistCard !== 'function') return;
      const card = buildPlaylistCard({
        title: seed.artistQuery,
        subtitle: 'Popular artist · Open songs',
        thumbnail: seed.thumbnail,
        openLabel: 'Open Artist',
        onOpen: () => { try { showArtistPlaylist(seed, 'home'); } catch (_) {} },
        onPlay: (button) => { try { return playArtistPlaylist(seed, button); } catch (_) { return Promise.resolve(); } }
      });
      card.classList.add('home236-artist-card');
      grid.appendChild(card);
    });
  }

  async function renderNewReleases236(feed, refreshNo = 0) {
    const grid = $('home236NewReleasesGrid'), hint = $('home236NewReleasesHint');
    if (!grid || typeof buildSongCard !== 'function') return;
    const list = await personalizedReleases236(feed, refreshNo);
    try { registerSongs(list); } catch (_) {}
    grid.replaceChildren();
    if (hint) hint.style.display = list.length ? 'none' : 'block';
    let ctx = null; try { ctx = makeContext(list, 'new-releases', 'New Releases', 'home-new-releases'); } catch (_) {}
    list.forEach(song => grid.appendChild(buildSongCard(song, ctx)));
  }

  // Re-entering Home should retain its cards. Rebuild only when feed/taste changes.
  let homePresentationKey236 = '', homeLoadPending236 = null;
  function homePresentationKey() {
    try {
      const keys = ['liked','recent','recommendations','preferenceSignals','playStats'];
      return JSON.stringify([feedAt236, Math.floor(Date.now() / (6 * HOUR)),
        ...keys.map(key => localStorage.getItem(STORAGE[key]))]);
    } catch (_) { return ''; }
  }
  function enhancedHomeLoad236(force = false) {
    if (homeLoadPending236) {
      return force ? homeLoadPending236.then(() => enhancedHomeLoad236(true)) : homeLoadPending236;
    }
    homeLoadPending236 = presentHome236(force).finally(() => { homeLoadPending236 = null; });
    return homeLoadPending236;
  }
  async function presentHome236(force = false) {
    if (!force) {
      try { if (homeLoaded && feed236 && Date.now() - feedAt236 < 20 * 60 * 1000) {
        const key = homePresentationKey();
        if (key && key === homePresentationKey236) return;
        renderPopularArtists236(feed236); await renderNewReleases236(feed236);
        homePresentationKey236 = key; enhanceShelves236(); return;
      } } catch (_) {}
    }
    if ($('topHitsHint')) $('topHitsHint').textContent = 'Loading top hits...';
    if ($('topArtistsHint')) $('topArtistsHint').textContent = 'Loading artist playlists...';
    const data = await feed236Fetch(force);
    if (!data || data.error) {
      if ($('topHitsHint')) $('topHitsHint').textContent = 'Top hits load nahi ho paye.';
      if ($('topArtistsHint')) $('topArtistsHint').textContent = 'Artist playlists load nahi ho paye.';
      return;
    }
    renderTopHits236(data.topHits || []);
    try {
      const artistFeed = uniqueSongs236([...tasteSongs236(), ...(data.topArtistSongs || [])]);
      renderArtistPlaylistSection($('topArtistsGrid'), $('topArtistsHint'), artistFeed, 'No artist playlists found.');
    } catch (_) {}
    const presentationKey = homePresentationKey();
    renderPopularArtists236(data);
    await renderNewReleases236(data);
    homePresentationKey236 = presentationKey;
    try { homeLoaded = true; } catch (_) {}
    renderSearchLanding236();
    renderPlaylistRecommendations236();
    enhanceShelves236();
  }

  // Replace only the Home feed presenter. Playback/download/lyrics engines stay untouched.
  try { loadHomeContent = enhancedHomeLoad236; } catch (_) {}

  function recommendationPool236(refreshNo = 0) {
    const feedSongs = uniqueSongs236([...(feed236?.newReleases || []), ...(feed236?.topHits || []), ...(feed236?.topArtistSongs || [])]);
    return smartBlendFeed236(feedSongs, 'recommend-pool', refreshNo, 36);
  }

  function ensureSearchLanding236() {
    let landing = $('search236Landing');
    if (landing) return landing;
    landing = document.createElement('section');
    landing.id = 'search236Landing'; landing.className = 'search236-landing';
    landing.innerHTML = `
      <div class="search236-landing-hero"><strong>Discover before you search</strong><span>Personal picks, popular artists and fresh music are ready here.</span></div>
      <div id="search236ForYou" class="search236-shelf-section"><div class="section-head"><h2>For You</h2><span>Based on likes, repeats and recent listening</span></div><div id="search236ForYouGrid" class="card-grid"></div></div>
      <div id="search236Artists" class="search236-shelf-section"><div class="section-head"><h2>Popular Artists</h2><span>Your taste + artists trending right now</span></div><div id="search236ArtistsGrid" class="card-grid"></div></div>`;
    $('resultsList')?.insertAdjacentElement('beforebegin', landing);
    return landing;
  }

  function renderSearchLanding236(refreshNo = 0) {
    const landing = ensureSearchLanding236();
    const empty = !searchInput236.value.trim();
    landing.classList.toggle('hidden', !empty);
    if (!empty) return;
    const pool = recommendationPool236(refreshNo).slice(0, 10);
    const songGrid = $('search236ForYouGrid');
    if (songGrid && typeof buildSongCard === 'function') {
      songGrid.replaceChildren();
      let ctx = null; try { ctx = makeContext(pool, 'search-discovery', 'For You', 'search-discovery'); } catch (_) {}
      pool.forEach(song => songGrid.appendChild(buildSongCard(song, ctx)));
    }
    const artistGrid = $('search236ArtistsGrid');
    if (artistGrid) {
      artistGrid.replaceChildren();
      blendArtists236(feed236 || {}, refreshNo).slice(0, 10).forEach(seed => {
        if (typeof buildPlaylistCard !== 'function') return;
        const card = buildPlaylistCard({ title: seed.artistQuery, subtitle: 'Artist · Open songs', thumbnail: seed.thumbnail, openLabel: 'Open Artist', onOpen: () => { try { showArtistPlaylist(seed, 'search'); } catch (_) {} }, onPlay: button => { try { return playArtistPlaylist(seed, button); } catch (_) { return Promise.resolve(); } } });
        card.classList.add('home236-artist-card'); artistGrid.appendChild(card);
      });
    }
    enhanceShelves236();
  }

  function ensurePlaylistRecommendations236() {
    let section = $('playlist236Recommendations');
    if (section) return section;
    section = document.createElement('section');
    section.id = 'playlist236Recommendations'; section.className = 'playlist236-recommendations';
    section.innerHTML = `<div class="section-head"><h2>Recommended Playlists</h2><span>Open any mix to view its songs before playing</span></div><div id="playlist236RecommendationsGrid" class="playlist-grid"></div>`;
    playlistsView236.querySelector('.view-title-row')?.insertAdjacentElement('afterend', section);
    return section;
  }

  function playlistMixes236(refreshNo = 0) {
    const pool = recommendationPool236(refreshNo);
    if (!pool.length) return [];
    const rotated = rotateBy236(stableRotate236(pool, `playlist-mixes:${refreshNo}`), refreshNo * 4);
    const names = ['For You Mix', 'Fresh Finds', 'Popular Right Now', 'Your Replay Mix'];
    const mixes = [];
    names.forEach((name, index) => {
      const start = index * 5;
      const songs = uniqueSongs236([...rotated.slice(start, start + 10), ...pool.slice(0, 10)]).slice(0, 10);
      if (songs.length >= 2) mixes.push({ name, songs });
    });
    return mixes;
  }

  function renderPlaylistRecommendations236(refreshNo = 0) {
    const section = ensurePlaylistRecommendations236();
    const detailOpen = !$('playlistDetail')?.classList.contains('hidden');
    section.classList.toggle('hidden', detailOpen);
    if (detailOpen) return;
    const grid = $('playlist236RecommendationsGrid'); if (!grid) return;
    grid.replaceChildren();
    playlistMixes236(refreshNo).forEach((mix, index) => {
      if (typeof buildPlaylistCard !== 'function') return;
      const card = buildPlaylistCard({
        title: mix.name,
        subtitle: 'Recommended · Open to view songs',
        countText: `${mix.songs.length} songs`,
        thumbnail: mix.songs[0]?.thumbnail || '',
        openLabel: 'Open Songs',
        onOpen: () => openExternalCollection236(mix.name, mix.songs, { type: 'recommended-playlist', key: `recommended:${index}:${mix.name}`, returnTab: 'playlists' }),
        onPlay: button => playSongCollection(mix.songs, mix.name, { type: 'recommended-playlist', key: `recommended:${index}:${mix.name}` }, button)
      });
      grid.appendChild(card);
    });
    enhanceShelves236();
  }

  // Search playlist/album/artist collection cards now use the same openable playlist detail everywhere.
  try {
    smartOpenSearchCollection = function(title, songs, type) {
      openExternalCollection236(title, songs, { type: `search-${type}`, key: `search-${type}:${title}`, returnTab: 'search', subtitle: type });
    };
  } catch (_) {}

  // Keep playlist recommendations alive when the existing Playlists renderer refreshes local cards.
  try {
    const baseRenderPlaylists236 = renderPlaylists;
    renderPlaylists = function() {
      const value = baseRenderPlaylists236.apply(this, arguments);
      setTimeout(renderPlaylistRecommendations236, 0);
      return value;
    };
  } catch (_) {}

  function renderSongShelf236(grid, songs, type, label, limit = 10) {
    if (!grid || typeof buildSongCard !== 'function') return;
    const list = uniqueSongs236(songs).slice(0, limit);
    try { registerSongs(list); } catch (_) {}
    grid.replaceChildren();
    let ctx = null; try { ctx = makeContext(list, type, label, `${type}:${Date.now()}`); } catch (_) {}
    list.forEach(song => grid.appendChild(buildSongCard(song, ctx)));
  }

  function refreshCount236(key) {
    const next = (sectionRefreshCounts236.get(key) || 0) + 1;
    sectionRefreshCounts236.set(key, next); return next;
  }

  async function freshTasteSongs236(count = 0, hint = '') {
    const seeds = tasteSongs236();
    const seed = seeds.length ? seeds[count % seeds.length] : null;
    if (!seed?.title) return [];
    try {
      if (typeof window.echoAPI?.getSmartAutoplayCandidates === 'function' && seed?.id) {
        const radio = await window.echoAPI.getSmartAutoplayCandidates(seed, 20);
        if (Array.isArray(radio?.items) && radio.items.length >= 4) {
          return uniqueSongs236(radio.items).filter(song => song?.id !== seed.id).slice(0, 18);
        }
      }
    } catch (_) {}
    const flavor = /because/i.test(hint) ? 'similar songs' : /quick|made|for you/i.test(hint) ? 'songs like' : 'recommended songs';
    const query = `${seed.title} ${seed.channel || ''} ${flavor} official audio`.trim();
    try {
      const rows = await window.echoAPI?.search?.(query);
      return uniqueSongs236(Array.isArray(rows) ? rows : []).filter(song => song?.id !== seed.id).slice(0, 18);
    } catch (_) { return []; }
  }

  async function refreshShelfSection236(section, button) {
    const grid = shelfTarget236(section); if (!grid) return;
    const key = grid.id || section.id || 'shelf'; const count = refreshCount236(key);
    const oldText = button?.textContent || 'See More';
    if (button) { button.disabled = true; button.textContent = 'Refreshing…'; button.classList.add('is-loading'); }
    try {
      if (grid.id === 'topHitsGrid') {
        const data = await feed236Fetch(count % 3 === 0); renderTopHits236(data?.topHits || [], count);
      } else if (grid.id === 'topArtistsGrid') {
        const data = await feed236Fetch(count % 3 === 0);
        const rows = rotateBy236(stableRotate236(data?.topArtistSongs || [], `top-artist:${count}`), count * 5);
        try { renderArtistPlaylistSection(grid, $('topArtistsHint'), rows, 'No artist playlists found.'); } catch (_) {}
      } else if (grid.id === 'home236PopularArtistsGrid') {
        renderPopularArtists236(await feed236Fetch(count % 3 === 0), count);
      } else if (grid.id === 'home236NewReleasesGrid') {
        await renderNewReleases236(await feed236Fetch(count % 3 === 0), count);
      } else if (grid.id === 'madeForYouGrid' || grid.id === 'becauseGrid' || grid.id === 'home220QuickGrid') {
        const type = grid.id === 'becauseGrid' ? 'because' : grid.id === 'madeForYouGrid' ? 'made-for-you' : 'home220-quick';
        const label = grid.id === 'becauseGrid' ? 'Because You Listened To' : grid.id === 'madeForYouGrid' ? 'Made For You' : 'Quick Picks';
        const fresh = await freshTasteSongs236(count, label);
        const pool = uniqueSongs236([...fresh, ...recommendationPool236(count)]);
        renderSongShelf236(grid, rotateBy236(pool, count * 4), type, label, 10);
      } else if (grid.id === 'recentGrid') {
        let rows = []; try { rows = getStored(STORAGE.recent, []) || []; } catch (_) {}
        renderSongShelf236(grid, rotateBy236(rows, count * 3), 'recent', 'Recently Played', 10);
      } else if (grid.id === 'home220FavoritesGrid') {
        let rows = []; try { rows = getLikedSongs() || []; } catch (_) {}
        renderSongShelf236(grid, rotateBy236(rows, count * 3), 'liked-home', 'Your Favorites', 10);
      } else if (grid.id === 'home220OfflineGrid') {
        const rows = await window.echoAPI?.getLibrary?.();
        renderSongShelf236(grid, rotateBy236(Array.isArray(rows) ? rows : [], count * 3), 'offline-home', 'Available Offline', 10);
      } else if (grid.id === 'continueGrid') {
        let entries = []; try { entries = Object.values(getStored(STORAGE.progress, {})).sort((a,b)=>Number(b?.updatedAt||0)-Number(a?.updatedAt||0)); } catch (_) {}
        grid.replaceChildren();
        rotateBy236(entries, count * 3).slice(0, 10).forEach(entry => { try { if (entry?.song && typeof smartBuildResumeCard === 'function') grid.appendChild(smartBuildResumeCard(entry)); } catch (_) {} });
      } else if (grid.id === 'search236ForYouGrid') {
        renderSongShelf236(grid, recommendationPool236(count).slice(0, 10), 'search-discovery', 'For You', 10);
      } else if (grid.id === 'search236ArtistsGrid') {
        grid.replaceChildren();
        blendArtists236(feed236 || {}, count).slice(0, 10).forEach(seed => {
          if (typeof buildPlaylistCard !== 'function') return;
          const card = buildPlaylistCard({ title:seed.artistQuery, subtitle:'Artist · Open songs', thumbnail:seed.thumbnail, openLabel:'Open Artist', onOpen:()=>{ try { showArtistPlaylist(seed,'search'); } catch (_) {} }, onPlay:button=>{ try { return playArtistPlaylist(seed,button); } catch (_) { return Promise.resolve(); } } });
          card.classList.add('home236-artist-card'); grid.appendChild(card);
        });
      } else if (grid.id === 'playlist236RecommendationsGrid') {
        renderPlaylistRecommendations236(count);
      } else {
        renderSongShelf236(grid, rotateBy236(recommendationPool236(count), count * 4), `home-refresh-${key}`, section?.querySelector('h2')?.textContent || 'For You', 10);
      }
      grid.scrollTo({ left:0, behavior:'smooth' });
      try { showToast(`${section?.querySelector('h2')?.textContent || 'Section'} refreshed for your taste`); } catch (_) {}
    } finally {
      if (button) { button.disabled = false; button.textContent = oldText; button.classList.remove('is-loading'); }
      enhanceShelves236();
    }
  }

  function ensureCustomShelfSlider236(grid) {
    if (!grid || grid.dataset.customSliderReady === '1') return;
    grid.dataset.customSliderReady = '1';
    const slider = document.createElement('div'); slider.className = 'deepecho-shelf-slider'; slider.setAttribute('role','slider'); slider.setAttribute('aria-label','Horizontal section position');
    const track = document.createElement('div'); track.className = 'deepecho-shelf-slider-track';
    const thumb = document.createElement('i'); thumb.className = 'deepecho-shelf-slider-thumb'; track.appendChild(thumb); slider.appendChild(track);
    grid.insertAdjacentElement('afterend', slider);
    const sync = () => {
      const max = Math.max(0, grid.scrollWidth - grid.clientWidth);
      const ratio = Math.min(1, grid.clientWidth / Math.max(1, grid.scrollWidth));
      const width = Math.max(12, ratio * 100);
      const pos = max > 0 ? (grid.scrollLeft / max) * (100 - width) : 0;
      thumb.style.width = `${width}%`; thumb.style.left = `${Math.max(0, Math.min(100 - width, pos))}%`;
      slider.classList.toggle('hidden', max <= 2);
      slider.setAttribute('aria-valuenow', String(max > 0 ? Math.round(grid.scrollLeft / max * 100) : 0));
    };
    const seek = event => {
      const rect = track.getBoundingClientRect(); if (!rect.width) return;
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      grid.scrollLeft = ratio * Math.max(0, grid.scrollWidth - grid.clientWidth);
    };
    track.addEventListener('pointerdown', event => { event.preventDefault(); seek(event); track.setPointerCapture?.(event.pointerId); });
    track.addEventListener('pointermove', event => { if (event.buttons === 1 && track.hasPointerCapture?.(event.pointerId)) seek(event); });
    grid.addEventListener('scroll', sync, { passive:true }); window.addEventListener('resize', sync, { passive:true });
    requestAnimationFrame(sync);
  }

  function shelfTarget236(section) {
    return section?.querySelector('.card-grid,.playlist-grid,.search236-shelf');
  }

  function enhanceShelfSection236(section) {
    const grid = shelfTarget236(section); const head = section?.querySelector('.section-head');
    if (!grid || !head) return;
    grid.classList.add('deepecho-horizontal-shelf');
    if (head.querySelector('.deepecho-shelf-tools')) { ensureCustomShelfSlider236(grid); return; }
    const tools = document.createElement('div'); tools.className = 'deepecho-shelf-tools';
    const left = document.createElement('button'); left.type = 'button'; left.className = 'deepecho-shelf-arrow'; left.textContent = '‹'; left.title = 'Scroll left'; left.setAttribute('aria-label', 'Scroll section left');
    const right = document.createElement('button'); right.type = 'button'; right.className = 'deepecho-shelf-arrow'; right.textContent = '›'; right.title = 'Scroll right'; right.setAttribute('aria-label', 'Scroll section right');
    const more = document.createElement('button'); more.type = 'button'; more.className = 'deepecho-see-more'; more.textContent = 'See More'; more.title = 'Refresh only this row with new taste-aware picks';
    const step = () => Math.max(260, grid.clientWidth * .78);
    left.addEventListener('click', () => grid.scrollBy({ left: -step(), behavior: 'smooth' }));
    right.addEventListener('click', () => grid.scrollBy({ left: step(), behavior: 'smooth' }));
    more.addEventListener('click', () => refreshShelfSection236(section, more));
    tools.append(left, right, more); head.appendChild(tools);
    ensureCustomShelfSlider236(grid);
  }

  function enhanceShelves236() {
    clearTimeout(shelfEnhanceTimer236);
    shelfEnhanceTimer236 = setTimeout(() => {
      homeView236.querySelectorAll('.home-section').forEach(enhanceShelfSection236);
      searchView236.querySelectorAll('.search236-shelf-section').forEach(enhanceShelfSection236);
      playlistsView236.querySelectorAll('.playlist236-recommendations').forEach(enhanceShelfSection236);
    }, 0);
  }

  // ---------- Immersive Player: See While Playing ----------
  const immersiveVideo236 = $('immersiveVideo');
  const immersiveVideoToggle236 = $('immersiveVideoToggleBtn');
  const immersiveStage236 = immersiveVideo236?.closest('.immersive-visual-stage');
  let videoMode236 = false;
  let videoSeq236 = 0;
  let videoSong236 = '';
  let lastVideoSync236 = 0;

  function setVideoMode236(enabled) {
    videoMode236 = !!enabled;
    immersiveStage236?.classList.toggle('video-mode', videoMode236);
    immersiveVideoToggle236?.setAttribute('aria-pressed', String(videoMode236));
    if (immersiveVideoToggle236) immersiveVideoToggle236.textContent = videoMode236 ? 'Hide Video' : 'See While Playing';
    if (!videoMode236 && immersiveVideo236) {
      try { immersiveVideo236.pause(); } catch (_) {}
      immersiveVideo236.removeAttribute('src'); immersiveVideo236.load?.(); videoSong236 = '';
    }
  }

  function syncVideo236(force = false) {
    if (!videoMode236 || !immersiveVideo236 || !audio236 || !immersiveVideo236.src) return;
    const now = performance.now(); if (!force && now - lastVideoSync236 < 350) return; lastVideoSync236 = now;
    const target = Number(audio236.currentTime || 0), current = Number(immersiveVideo236.currentTime || 0);
    if (Number.isFinite(target) && Number.isFinite(immersiveVideo236.duration) && Math.abs(target - current) > .75) {
      try { immersiveVideo236.currentTime = Math.min(Math.max(0, target), Math.max(0, immersiveVideo236.duration - .05)); } catch (_) {}
    }
    immersiveVideo236.playbackRate = Number(audio236.playbackRate || 1) || 1;
    immersiveVideo236.muted = true;
    if (!audio236.paused && !audio236.ended) immersiveVideo236.play().catch(() => {}); else immersiveVideo236.pause();
  }

  async function loadVideo236(force = false) {
    if (!videoMode236 || !immersiveVideo236) return;
    let song = null; try { song = currentSong; } catch (_) {}
    if (!song?.id || !song?.url) { setVideoMode236(false); try { showToast('Current song ka video source available nahi hai.'); } catch (_) {} return; }
    if (!force && videoSong236 === song.id && immersiveVideo236.src) { syncVideo236(true); return; }
    const seq = ++videoSeq236; videoSong236 = song.id;
    immersiveVideoToggle236?.classList.add('is-loading');
    if (immersiveVideoToggle236) immersiveVideoToggle236.textContent = 'Loading Video…';
    try {
      const result = await window.echoAPI?.getSongVideoStream?.(song);
      if (seq !== videoSeq236 || !videoMode236) return;
      if (!result?.success || !result.url) throw new Error(result?.error || 'Video unavailable.');
      immersiveVideo236.poster = song.thumbnail || '';
      immersiveVideo236.src = result.url;
      immersiveVideo236.muted = true;
      immersiveVideo236.load();
      const ready = () => { if (seq === videoSeq236 && videoMode236) syncVideo236(true); };
      immersiveVideo236.addEventListener('loadedmetadata', ready, { once: true });
      immersiveVideo236.addEventListener('canplay', ready, { once: true });
    } catch (error) {
      if (seq === videoSeq236) {
        setVideoMode236(false);
        try { showToast(error?.message || 'Video preview unavailable.'); } catch (_) {}
      }
    } finally {
      if (seq === videoSeq236) {
        immersiveVideoToggle236?.classList.remove('is-loading');
        if (immersiveVideoToggle236) immersiveVideoToggle236.textContent = videoMode236 ? 'Hide Video' : 'See While Playing';
      }
    }
  }

  immersiveVideoToggle236?.addEventListener('click', async () => {
    if (videoMode236) { setVideoMode236(false); return; }
    setVideoMode236(true); await loadVideo236(true);
  });
  ['play','pause','timeupdate','seeking','seeked','ratechange','loadedmetadata'].forEach(name => audio236?.addEventListener(name, () => syncVideo236(name !== 'timeupdate')));
  audio236?.addEventListener('loadstart', () => { if (videoMode236) setTimeout(() => loadVideo236(true), 120); });
  audio236?.addEventListener('playing', () => {
    let id = ''; try { id = currentSong?.id || ''; } catch (_) {}
    if (videoMode236 && id && id !== videoSong236) loadVideo236(true); else syncVideo236(true);
  });
  audio236?.addEventListener('ended', () => { try { immersiveVideo236?.pause(); } catch (_) {} });
  $('immersiveBtn')?.addEventListener('click', () => { if (videoMode236) setTimeout(() => loadVideo236(false), 80); });
  $('immersiveCloseBtn')?.addEventListener('click', () => { try { immersiveVideo236?.pause(); } catch (_) {} });
  const immersivePlayer236 = $('immersivePlayer');
  if (immersivePlayer236 && immersiveVideo236) {
    new MutationObserver(() => { if (immersivePlayer236.classList.contains('hidden')) { try { immersiveVideo236.pause(); } catch (_) {} } }).observe(immersivePlayer236, { attributes: true, attributeFilter: ['class'] });
  }
  try {
    const baseCloseImmersive236 = smartCloseImmersive;
    smartCloseImmersive = async function() { try { immersiveVideo236?.pause(); } catch (_) {} return baseCloseImmersive236.apply(this, arguments); };
    const baseOpenImmersive236 = smartOpenImmersive;
    smartOpenImmersive = async function() { const value = await baseOpenImmersive236.apply(this, arguments); if (videoMode236) setTimeout(() => loadVideo236(false), 40); return value; };
  } catch (_) {}

  searchInput236.addEventListener('input', () => setTimeout(renderSearchLanding236, 0));
  searchInput236.addEventListener('search', () => setTimeout(renderSearchLanding236, 0));
  $('clearRecentSearchesBtn')?.addEventListener('click', () => setTimeout(renderSearchLanding236, 20));
  document.querySelector('[data-tab="search"]')?.addEventListener('click', () => setTimeout(renderSearchLanding236, 50));
  document.querySelector('[data-tab="playlists"]')?.addEventListener('click', () => setTimeout(renderPlaylistRecommendations236, 60));
  // activateTab already invokes loadHomeContent for every Home entry.
  $('backToPlaylistsBtn')?.addEventListener('click', () => setTimeout(renderPlaylistRecommendations236, 30));

  // Search progress/badges/rows are not shelves; avoid scanning all three views for them.
  const shelfSelector236 = '.home-section, .search236-shelf-section, .playlist236-recommendations';
  function affectsShelf236(mutation) {
    if (mutation.target instanceof Element && mutation.target.closest(shelfSelector236)) return true;
    return [...mutation.addedNodes, ...mutation.removedNodes].some(node => node instanceof Element &&
      (node.matches(shelfSelector236) || node.querySelector(shelfSelector236)));
  }
  const shelfObserver236 = new MutationObserver(mutations => {
    if (mutations.some(affectsShelf236)) enhanceShelves236();
  });
  shelfObserver236.observe(homeView236, { childList: true, subtree: true });
  shelfObserver236.observe(searchView236, { childList: true, subtree: true });
  shelfObserver236.observe(playlistsView236, { childList: true, subtree: true });

  // Create lightweight containers now; expensive data/card rendering is event-driven. The main
  // renderer schedules the single Home hydration after this enhanced presenter is installed.
  ensureSearchLanding236();
  ensurePlaylistRecommendations236();
  setTimeout(() => enhanceShelves236(), 520);
})();
