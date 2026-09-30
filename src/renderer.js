// ================= Particle background =================
(function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let lightning = [];
  let spaceLastRender = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function themeName() {
    return document.body.dataset.theme || 'golden';
  }

  function currentThemeConfig() {
    const theme = themeName();
    if (theme === 'purple') return { mode: 'lightning', glow: [153, 100, 255], core: [218, 197, 255], streak: [207, 178, 255] };
    if (theme === 'toxic') return { mode: 'toxic', glow: [83, 255, 128], core: [191, 255, 206], streak: [130, 255, 156] };
    if (theme === 'light') return { mode: 'soft', glow: [196, 160, 98], core: [232, 207, 160], streak: [222, 190, 124] };
    if (theme === 'dark') return { mode: 'soft', glow: [139, 154, 174], core: [220, 229, 240], streak: [178, 190, 206] };
    return { mode: 'particle', glow: [232, 181, 89], core: [255, 210, 122], streak: [255, 226, 155] };
  }

  function makeParticle() {
    const theme = themeName();
    const mode = currentThemeConfig().mode;
    return {
      type: mode === 'toxic' ? 'orb' : 'particle',
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height + canvas.height * 0.2,
      r: Math.random() * (mode === 'toxic' ? 5 : 1.8) + (mode === 'toxic' ? 4 : 0.5),
      speed: Math.random() * (mode === 'toxic' ? 0.2 : 0.35) + (mode === 'toxic' ? 0.04 : 0.08),
      drift: (Math.random() - 0.5) * (mode === 'toxic' ? 0.7 : 0.25),
      alpha: Math.random() * (mode === 'toxic' ? 0.25 : 0.5) + (mode === 'toxic' ? 0.16 : 0.15),
      twinkle: Math.random() * 0.02 + 0.005,
      pulse: Math.random() * Math.PI * 2
    };
  }

  function repopulate() {
    particles = [];
    lightning = [];
    const mode = currentThemeConfig().mode;
    const count = mode === 'toxic' ? 48 : mode === 'lightning' ? 80 : mode === 'soft' ? 34 : 90;
    for (let i = 0; i < count; i++) particles.push(makeParticle());
  }

  function buildLightning() {
    const startX = Math.random() * canvas.width;
    const startY = Math.random() * canvas.height * 0.55;
    const segments = [];
    let x = startX, y = startY;
    const length = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < length; i++) {
      const nextX = x + (Math.random() - 0.5) * 90;
      const nextY = y + 18 + Math.random() * 30;
      segments.push([x, y, nextX, nextY]);
      x = nextX; y = nextY;
    }
    lightning.push({ life: 1, segments });
  }

  repopulate();
  let lastTheme = themeName();

  function tick() {
    if (window.__deepecchoGameMode) {
      setTimeout(() => requestAnimationFrame(tick), 1000);
      return;
    }
    const theme = themeName();
    if (theme !== lastTheme) {
      lastTheme = theme;
      repopulate();
      spaceLastRender = 0;
    }
    const cfg = currentThemeConfig();
    const frameNow = performance.now();
    // Vibrant Space is intentionally background-cinematic rather than a 60fps visualizer.
    // Cap only this full-screen galaxy layer near 30fps; the audio visualizer stays fully reactive.
    if (theme === 'space' && spaceLastRender && frameNow - spaceLastRender < 32) {
      requestAnimationFrame(tick);
      return;
    }
    if (theme === 'space') spaceLastRender = frameNow; else spaceLastRender = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (window.drawDinechoEffect && window.drawDinechoEffect(ctx, canvas, theme)) {
      requestAnimationFrame(tick);
      return;
    }

    if (cfg.mode === 'lightning' && Math.random() < 0.02) buildLightning();

    for (const p of particles) {
      p.y -= p.speed;
      p.x += p.drift + Math.sin((p.pulse += 0.01)) * 0.08;
      if (p.y < -20) {
        p.y = canvas.height + 20;
        p.x = Math.random() * canvas.width;
      }

      if (cfg.mode === 'toxic') {
        p.alpha += Math.sin(p.pulse) * 0.002;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.2);
        grad.addColorStop(0, `rgba(${cfg.core[0]},${cfg.core[1]},${cfg.core[2]},${p.alpha + 0.25})`);
        grad.addColorStop(0.55, `rgba(${cfg.glow[0]},${cfg.glow[1]},${cfg.glow[2]},${p.alpha})`);
        grad.addColorStop(1, `rgba(${cfg.glow[0]},${cfg.glow[1]},${cfg.glow[2]},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      p.alpha += (Math.random() - 0.5) * p.twinkle;
      if (p.alpha < 0.06) p.alpha = 0.06;
      if (p.alpha > 0.72) p.alpha = 0.72;
      const spread = cfg.mode === 'soft' ? p.r * 2.5 : p.r * 4;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, spread);
      grad.addColorStop(0, `rgba(${cfg.glow[0]},${cfg.glow[1]},${cfg.glow[2]},${p.alpha})`);
      grad.addColorStop(1, `rgba(${cfg.glow[0]},${cfg.glow[1]},${cfg.glow[2]},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, spread, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${cfg.core[0]},${cfg.core[1]},${cfg.core[2]},${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.8, p.r), 0, Math.PI * 2);
      ctx.fill();
    }

    if (lightning.length) {
      lightning = lightning.filter((bolt) => bolt.life > 0.06);
      for (const bolt of lightning) {
        bolt.life *= 0.9;
        ctx.strokeStyle = `rgba(${cfg.streak[0]},${cfg.streak[1]},${cfg.streak[2]},${bolt.life})`;
        ctx.lineWidth = 1.4 + bolt.life * 1.6;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgba(${cfg.streak[0]},${cfg.streak[1]},${cfg.streak[2]},${bolt.life})`;
        ctx.beginPath();
        for (const [x1, y1, x2, y2] of bolt.segments) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    requestAnimationFrame(tick);
  }
  tick();
})();

// ================= Elements =================
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const artistSearchBtn = document.getElementById('artistSearchBtn');
const artistSearchModal = document.getElementById('artistSearchModal');
const artistModalInput = document.getElementById('artistModalInput');
const artistModalSearch = document.getElementById('artistModalSearch');
const artistModalCancel = document.getElementById('artistModalCancel');
const heroSearchBtn = document.getElementById('heroSearchBtn');
const resultsList = document.getElementById('resultsList');
const searchHint = document.getElementById('searchHint');
const searchViewTitle = document.getElementById('searchViewTitle');
const searchModeText = document.getElementById('searchModeText');
const libraryList = document.getElementById('libraryList');
const libraryHint = document.getElementById('libraryHint');
const likedList = document.getElementById('likedList');
const likedHint = document.getElementById('likedHint');
const playlistCards = document.getElementById('playlistCards');
const playlistHint = document.getElementById('playlistHint');
const playlistDetail = document.getElementById('playlistDetail');
const playlistDetailTitle = document.getElementById('playlistDetailTitle');
const playlistDetailCount = document.getElementById('playlistDetailCount');
const playlistSongs = document.getElementById('playlistSongs');
const newPlaylistBtn = document.getElementById('newPlaylistBtn');
const backToPlaylistsBtn = document.getElementById('backToPlaylistsBtn');
const playlistDetailPlayBtn = document.getElementById('playlistDetailPlayBtn');
const createPlaylistModal = document.getElementById('createPlaylistModal');
const createPlaylistInput = document.getElementById('createPlaylistInput');
const createPlaylistSave = document.getElementById('createPlaylistSave');
const createPlaylistCancel = document.getElementById('createPlaylistCancel');
const createPlaylistError = document.getElementById('createPlaylistError');
const playlistChooserModal = document.getElementById('playlistChooserModal');
const playlistChooserSong = document.getElementById('playlistChooserSong');
const playlistChoiceList = document.getElementById('playlistChoiceList');
const playlistChooserCreate = document.getElementById('playlistChooserCreate');
const playlistChooserCancel = document.getElementById('playlistChooserCancel');
const toast = document.getElementById('toast');
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

const recentGrid = document.getElementById('recentGrid');
const recentHint = document.getElementById('recentHint');
const topHitsGrid = document.getElementById('topHitsGrid');
const topHitsHint = document.getElementById('topHitsHint');
const topArtistsGrid = document.getElementById('topArtistsGrid');
const topArtistsHint = document.getElementById('topArtistsHint');

const lyricsSongTitle = document.getElementById('lyricsSongTitle');
const lyricsBody = document.getElementById('lyricsBody');
const lyricsThemeFxToggle = document.getElementById('lyricsThemeFxToggle');
const lyricsThemeFxToggleText = document.getElementById('lyricsThemeFxToggleText');
const lyricsSyncBtn = document.getElementById('lyricsSyncBtn');
const playerCollapseBtn = document.getElementById('playerCollapseBtn');
const playerBar = document.querySelector('.player-bar');
const appFullscreenBtn = document.getElementById('appFullscreenBtn');

const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const playerLikeBtn = document.getElementById('playerLikeBtn');
const playerDownloadBtn = document.getElementById('playerDownloadBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const back10Btn = document.getElementById('back10Btn');
const previousBtn = document.getElementById('previousBtn');
const nextBtn = document.getElementById('nextBtn');
const forward10Btn = document.getElementById('forward10Btn');
const loopBtn = document.getElementById('loopBtn');
const queueToggleBtn = document.getElementById('queueToggleBtn');
const queuePanel = document.getElementById('queuePanel');
const queueList = document.getElementById('queueList');
const queueSummary = document.getElementById('queueSummary');
const queueCloseBtn = document.getElementById('queueCloseBtn');
const clearQueueBtn = document.getElementById('clearQueueBtn');
const shuffleDownloadsBtn = document.getElementById('shuffleDownloadsBtn');
const shuffleLikedBtn = document.getElementById('shuffleLikedBtn');
const shufflePlaylistBtn = document.getElementById('shufflePlaylistBtn');
const glassOpacityRange = document.getElementById('glassOpacityRange');
const glassOpacityValue = document.getElementById('glassOpacityValue');
const volumeRange = document.getElementById('volumeRange');
const volumeValue = document.getElementById('volumeValue');
const volumeStatus = document.getElementById('volumeStatus');
const muteToggleBtn = document.getElementById('muteToggleBtn');
const fluidSettings = document.getElementById('fluidSettings');
const fluidIntensityRange = document.getElementById('fluidIntensityRange');
const fluidIntensityValue = document.getElementById('fluidIntensityValue');
const fluidPresetSelect = document.getElementById('fluidPresetSelect');
const seekBar = document.getElementById('seekBar');
const curTime = document.getElementById('curTime');
const durTime = document.getElementById('durTime');
const nowTitle = document.getElementById('nowTitle');
const nowChannel = document.getElementById('nowChannel');
const themeSuggestionBtn = document.getElementById('themeSuggestionBtn');
const nowThumb = document.getElementById('nowThumb');
const downloadProgressWrap = document.getElementById('downloadProgressWrap');
const downloadProgressFill = document.getElementById('downloadProgressFill');
const downloadProgressText = document.getElementById('downloadProgressText');
const DEFAULT_THUMB = 'assets/dinecho-logo.png';

let currentLibrary = [];
let currentSong = null;
let currentPlaylistName = null;
let currentPlaylistDetail = { songs: [], label: 'Playlist', type: 'playlist', key: 'playlist', source: 'local' };
let currentExternalPlaylist = null;
let playlistReturnTab = 'playlists';
const artistPlaylistCache = new Map();
let playlistSongPending = null;
let createPlaylistContext = 'standalone';
let toastTimer = null;
let homeLoaded = false;
let searchRequest = 0;
let downloadResetTimer = null;
let playQueue = [];
let queueIndex = -1;
let loopMode = 'off';
let shuffleEnabled = false;
let prefetchSerial = 0;
let playbackHistory = [];
let historyIndex = -1;
let activeContext = null;
let currentPlaybackSource = 'none';
const knownSongs = new Map();

const STORAGE = {
  liked: 'echo-liked-songs-v1',
  playlists: 'echo-playlists-v1',
  recent: 'echo-recent-v1',
  theme: 'echo-theme-v1',
  queue: 'echo-manual-queue-v2',
  queueIndex: 'echo-manual-queue-index-v2',
  loop: 'echo-loop-v1',
  shuffle: 'echo-shuffle-v1',
  glassOpacity: 'echo-glass-opacity-v1',
  volume: 'echo-volume-v1',
  muted: 'echo-muted-v1',
  fluidIntensity: 'echo-fluid-intensity-v1',
  fluidPreset: 'echo-fluid-preset-v1',
  lyricsThemeFx: 'echo-lyrics-theme-fx-v1',
  playerCollapsed: 'echo-player-collapsed-v1'
};

function getStored(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function setStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeSong(song) {
  if (!song) return null;
  const rawTitle = String(song.title || song.name || song.videoTitle || '').trim();
  const suspicious = !rawTitle || rawTitle.length < 3 || /^(s|t|text|song|title|untitled)$/i.test(rawTitle);
  const known = song.id ? knownSongs.get(song.id) : null;
  const recoveredTitle = suspicious && known?.title && known.title.length > 2 ? known.title : rawTitle;
  const id = String(song.id || '').trim();
  // The YouTube video id is the authoritative identity for remote tracks. Some feeds/history
  // entries may carry a stale `url` from another result; resolving that stale URL makes the UI
  // show one song while a different video actually plays. Canonicalise remote URLs from the id.
  const canonicalUrl = /^[A-Za-z0-9_-]{11}$/.test(id)
    ? `https://www.youtube.com/watch?v=${id}`
    : String(song.url || '').trim();
  return {
    id,
    title: recoveredTitle || 'Untitled',
    channel: song.channel || song.artist || known?.channel || '',
    duration: song.duration || '',
    thumbnail: song.thumbnail || '',
    url: canonicalUrl
  };
}

function queueSong(song) {
  const clean = normalizeSong(song);
  if (!clean) return null;
  if (song.filepath) clean.filepath = song.filepath;
  if (song.fileUrl) clean.fileUrl = song.fileUrl;
  if (song.streamUrl) clean.streamUrl = song.streamUrl;
  return clean;
}

function registerSongs(items) {
  (items || []).forEach((song) => {
    const item = queueSong(song);
    if (item && item.id) knownSongs.set(item.id, item);
  });
  return items || [];
}

function recordPlayback(song) {
  const item = queueSong(song);
  if (!item) return;
  registerSongs([item]);
  if (historyIndex < playbackHistory.length - 1) playbackHistory = playbackHistory.slice(0, historyIndex + 1);
  const last = playbackHistory[playbackHistory.length - 1];
  if (!last || last.id !== item.id) playbackHistory.push(item);
  else playbackHistory[playbackHistory.length - 1] = item;
  if (playbackHistory.length > 100) playbackHistory = playbackHistory.slice(-100);
  historyIndex = playbackHistory.length - 1;
}

function syncQueueIndexToSong(song) {
  if (!song) return;
  const match = playQueue.findIndex((item) => item && item.id === song.id);
  if (match >= 0) {
    queueIndex = match;
    persistQueue();
    renderQueue();
  }
}

function collectRandomCandidates() {
  registerSongs(currentLibrary);
  registerSongs(getLikedSongs());
  registerSongs(getStored(STORAGE.recent, []));
  registerSongs(playQueue);
  const currentId = currentSong && currentSong.id;
  return [...knownSongs.values()].filter((song) => song && song.id && song.id !== currentId);
}

async function getRandomFallbackSong() {
  let candidates = collectRandomCandidates();
  if (!candidates.length && window.echoAPI.getHomeFeed) {
    try {
      const feed = await window.echoAPI.getHomeFeed();
      if (feed && !feed.error) registerSongs([...(feed.topHits || []), ...(feed.topArtistSongs || [])]);
      candidates = collectRandomCandidates();
    } catch (_) {}
  }
  if (!candidates.length) return null;
  return queueSong(candidates[Math.floor(Math.random() * candidates.length)]);
}

function shuffledCopy(items) {
  const copy = items.map(queueSong).filter(Boolean);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ================= Tabs =================
function activateTab(tabName) {
  navItems.forEach((n) => n.classList.toggle('active', n.dataset.tab === tabName));
  views.forEach((v) => v.classList.remove('active'));
  const target = document.getElementById(tabName + 'View');
  if (target) target.classList.add('active');

  if (tabName === 'library') loadLibrary();
  if (tabName === 'liked') renderLikedSongs();
  if (tabName === 'playlists') renderPlaylists();
  if (tabName === 'home') {
    renderRecentlyPlayed();
    loadHomeContent();
  }
  if (tabName === 'lyrics' && lyricsAutoFollow && lyricLines.length) requestAnimationFrame(() => syncLyrics(true));
  updateLyricsSyncButton();
}

navItems.forEach((item) => item.addEventListener('click', () => activateTab(item.dataset.tab)));

heroSearchBtn.addEventListener('click', () => {
  activateTab('search');
  searchInput.focus();
});

function openArtistSearchModal() {
  artistSearchModal.classList.remove('hidden');
  artistModalInput.value = searchInput.value.trim();
  setTimeout(() => artistModalInput.focus(), 20);
}

function closeArtistSearchModal() {
  artistSearchModal.classList.add('hidden');
}

// ================= Search =================
searchBtn.addEventListener('click', () => runSearch('song'));
artistSearchBtn.addEventListener('click', openArtistSearchModal);
artistModalCancel.addEventListener('click', closeArtistSearchModal);
artistModalSearch.addEventListener('click', () => {
  const q = artistModalInput.value.trim();
  if (!q) return;
  closeArtistSearchModal();
  runSearch('artist', q);
});
artistModalInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') artistModalSearch.click(); });
artistSearchModal.addEventListener('click', (e) => { if (e.target === artistSearchModal) closeArtistSearchModal(); });
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch('song'); });

async function runSearch(mode = 'song', overrideQuery = '') {
  const request = ++searchRequest;
  const q = (overrideQuery || searchInput.value || '').trim();
  if (!q) return;
  activateTab('search');
  searchViewTitle.textContent = mode === 'artist' ? `Artist: ${q}` : 'Search Results';
  searchModeText.textContent = mode === 'artist' ? 'Popular songs related to this artist' : 'Songs matching your search';
  searchHint.textContent = mode === 'artist' ? 'Searching artist songs...' : 'Searching...';
  resultsList.innerHTML = '';

  try {
    const results = mode === 'artist' ? await window.echoAPI.searchArtist(q) : await window.echoAPI.search(q);
    if(request !== searchRequest)return;
    if (results && results.error) {
      searchHint.textContent = 'Error: ' + results.error;
      return;
    }
    if (!results || !results.length) {
      searchHint.textContent = 'No results found.';
      return;
    }
    searchHint.textContent = '';
    registerSongs(results);
    const context = makeContext(results, mode === 'artist' ? 'artist-search' : 'search', mode === 'artist' ? `Artist: ${q}` : 'Search Results', `${mode}:${q}`);
    results.forEach((song) => resultsList.appendChild(buildSongRow(song, false, context)));
  } catch (err) {
    if(request === searchRequest) searchHint.textContent = 'Search failed: ' + err.message;
  }
}

// ================= Library =================
async function loadLibrary() {
  currentLibrary = await window.echoAPI.getLibrary();
  registerSongs(currentLibrary);
  libraryList.innerHTML = '';
  if (!currentLibrary.length) {
    libraryHint.style.display = 'block';
    return;
  }
  libraryHint.style.display = 'none';
  const context = makeContext(currentLibrary, 'downloads', 'Downloads', 'downloads');
  currentLibrary.forEach((song) => libraryList.appendChild(buildSongRow(song, true, context)));
}

function isDownloaded(song) {
  return currentLibrary.some((s) => s.id === song.id);
}

shuffleDownloadsBtn.addEventListener('click', () => shuffleAndPlay(currentLibrary, 'Downloads', { type: 'downloads', key: 'downloads' }));
shuffleLikedBtn.addEventListener('click', () => shuffleAndPlay(getLikedSongs(), 'Liked Songs', { type: 'liked', key: 'liked' }));
playlistDetailPlayBtn.addEventListener('click', () => {
  playSongCollection(currentPlaylistDetail.songs, currentPlaylistDetail.label, {
    type: currentPlaylistDetail.type, key: currentPlaylistDetail.key
  }, playlistDetailPlayBtn);
});
shufflePlaylistBtn.addEventListener('click', () => {
  shuffleAndPlay(currentPlaylistDetail.songs, currentPlaylistDetail.label, {
    type: currentPlaylistDetail.type, key: currentPlaylistDetail.key
  });
});

// ================= Liked songs =================
function getLikedSongs() { return getStored(STORAGE.liked, []); }
function isLiked(song) { return !!song && getLikedSongs().some((s) => s.id === song.id); }

function toggleLike(song, sourceEl = null) {
  if (!song) return;
  const clean = normalizeSong(song);
  let liked = getLikedSongs();
  const exists = liked.some((s) => s.id === clean.id);
  liked = exists ? liked.filter((s) => s.id !== clean.id) : [clean, ...liked];
  setStored(STORAGE.liked, liked);
  if (typeof smartRecordLikeSignal === 'function') smartRecordLikeSignal(clean, !exists);
  if (!exists) triggerThemeLikeAnimation(sourceEl);
  syncPlayerLikeState();
  renderLikedSongs();
  refreshVisibleLikeButtons();
}

function renderLikedSongs() {
  const liked = getLikedSongs();
  registerSongs(liked);
  likedList.innerHTML = '';
  likedHint.style.display = liked.length ? 'none' : 'block';
  const context = makeContext(liked, 'liked', 'Liked Songs', 'liked');
  liked.forEach((song) => likedList.appendChild(buildSongRow(song, false, context)));
}

function refreshVisibleLikeButtons() {
  document.querySelectorAll('[data-like-id]').forEach((btn) => {
    const active = getLikedSongs().some((s) => s.id === btn.dataset.likeId);
    setLikeIcon(btn, active);
    btn.classList.toggle('active-like', active);
  });
}

// ================= Playlists =================
function getPlaylists() { return getStored(STORAGE.playlists, {}); }
function savePlaylists(playlists) { setStored(STORAGE.playlists, playlists); }

newPlaylistBtn.addEventListener('click', () => openCreatePlaylistModal('standalone'));
backToPlaylistsBtn.addEventListener('click', () => {
  if (currentExternalPlaylist && playlistReturnTab && playlistReturnTab !== 'playlists') {
    const returnTab = playlistReturnTab;
    currentExternalPlaylist = null;
    currentPlaylistName = null;
    currentPlaylistDetail = { songs: [], label: 'Playlist', type: 'playlist', key: 'playlist', source: 'local' };
    activateTab(returnTab);
    return;
  }
  currentExternalPlaylist = null;
  currentPlaylistName = null;
  playlistReturnTab = 'playlists';
  backToPlaylistsBtn.textContent = 'All Playlists';
  playlistDetail.classList.add('hidden');
  playlistCards.classList.remove('hidden');
  playlistHint.classList.toggle('hidden', Object.keys(getPlaylists()).length > 0);
});

createPlaylistCancel.addEventListener('click', closeCreatePlaylistModal);
createPlaylistSave.addEventListener('click', saveNewPlaylistFromModal);
createPlaylistInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveNewPlaylistFromModal();
  if (e.key === 'Escape') closeCreatePlaylistModal();
});
createPlaylistModal.addEventListener('click', (e) => {
  if (e.target === createPlaylistModal) closeCreatePlaylistModal();
});

playlistChooserCancel.addEventListener('click', closePlaylistChooser);
playlistChooserCreate.addEventListener('click', () => {
  closePlaylistChooser(false);
  openCreatePlaylistModal('chooser');
});
playlistChooserModal.addEventListener('click', (e) => {
  if (e.target === playlistChooserModal) closePlaylistChooser();
});

function showToast(message) {
  if (!toast) return;
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.remove('hidden');
  requestAnimationFrame(() => toast.classList.add('show'));
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 180);
  }, 1800);
}

function openCreatePlaylistModal(context = 'standalone') {
  createPlaylistContext = context;
  createPlaylistError.classList.add('hidden');
  createPlaylistError.textContent = '';
  createPlaylistInput.value = '';
  createPlaylistModal.classList.remove('hidden');
  setTimeout(() => createPlaylistInput.focus(), 20);
}

function closeCreatePlaylistModal() {
  const cameFromChooser = createPlaylistContext === 'chooser';
  createPlaylistModal.classList.add('hidden');
  createPlaylistError.classList.add('hidden');
  createPlaylistError.textContent = '';
  createPlaylistContext = 'standalone';
  if (cameFromChooser) playlistSongPending = null;
}

function saveNewPlaylistFromModal() {
  const name = createPlaylistInput.value.trim().slice(0, 50);
  if (!name) {
    createPlaylistError.textContent = 'Playlist ka naam likho.';
    createPlaylistError.classList.remove('hidden');
    return;
  }
  const playlists = getPlaylists();
  if (playlists[name]) {
    createPlaylistError.textContent = 'Is naam ki playlist pehle se hai.';
    createPlaylistError.classList.remove('hidden');
    return;
  }
  playlists[name] = createPlaylistContext === 'queue-save' ? playQueue.map(normalizeSong).filter(Boolean) : [];

  if (createPlaylistContext === 'chooser' && playlistSongPending) {
    const clean = normalizeSong(playlistSongPending);
    playlists[name].push(clean);
  }

  savePlaylists(playlists);
  const savedQueue = createPlaylistContext === 'queue-save';
  const addedPending = createPlaylistContext === 'chooser' && !!playlistSongPending;
  createPlaylistModal.classList.add('hidden');
  createPlaylistContext = 'standalone';
  if (addedPending) {
    showToast(`Added to ${name}`);
    playlistSongPending = null;
  } else if (savedQueue) {
    showToast(`Queue saved as ${name}`);
  } else {
    showToast(`Playlist created: ${name}`);
  }
  renderPlaylists();
}

function addToPlaylist(song) {
  playlistSongPending = normalizeSong(song);
  openPlaylistChooser();
}

function openPlaylistChooser() {
  const playlists = getPlaylists();
  const names = Object.keys(playlists);
  playlistChoiceList.innerHTML = '';
  playlistChooserSong.textContent = playlistSongPending ? `"${playlistSongPending.title}" kis playlist me add karna hai?` : 'Choose a playlist.';

  if (!names.length) {
    const empty = document.createElement('div');
    empty.className = 'playlist-choice-empty';
    empty.innerHTML = '<strong>No playlists yet</strong><span>New Playlist dabakar pehle playlist banao.</span>';
    playlistChoiceList.appendChild(empty);
  } else {
    names.forEach((name) => {
      const btn = document.createElement('button');
      btn.className = 'playlist-choice';
      const count = (playlists[name] || []).length;
      btn.innerHTML = `<span class="playlist-choice-name">${escapeHtml(name)}</span><span class="playlist-choice-count">${count} song${count === 1 ? '' : 's'}</span>`;
      btn.addEventListener('click', () => addPendingSongToPlaylist(name));
      playlistChoiceList.appendChild(btn);
    });
  }
  playlistChooserModal.classList.remove('hidden');
}

function closePlaylistChooser(clearPending = true) {
  playlistChooserModal.classList.add('hidden');
  if (clearPending) playlistSongPending = null;
}

function addPendingSongToPlaylist(name) {
  if (!playlistSongPending) return;
  const playlists = getPlaylists();
  if (!playlists[name]) playlists[name] = [];
  const clean = normalizeSong(playlistSongPending);
  const already = playlists[name].some((s) => s.id === clean.id);
  if (!already) playlists[name].push(clean);
  savePlaylists(playlists);
  closePlaylistChooser();
  showToast(already ? `Already in ${name}` : `Added to ${name}`);
  if (document.getElementById('playlistsView').classList.contains('active') && !currentExternalPlaylist) renderPlaylists();
}

function playSongCollection(songs, label, meta = {}, button = null) {
  const items = (songs || []).map(normalizeSong).filter((song) => song && song.id);
  if (!items.length) {
    showToast('Is playlist me abhi koi song nahi hai.');
    return Promise.resolve();
  }
  const context = makeContext(items, meta.type || 'playlist', label || 'Playlist', meta.key || `playlist:${label || 'mix'}`);
  return startSingleSong(items[0], button, context);
}

function buildPlaylistCard({ title, subtitle = '', countText = '', thumbnail = '', iconText = 'PL', onOpen, onPlay }) {
  const card = document.createElement('div');
  card.className = 'playlist-card smart-playlist-card';
  card.setAttribute('role', 'group');
  card.setAttribute('aria-label', title || 'Playlist');

  if (thumbnail) {
    const img = document.createElement('img');
    img.className = 'playlist-cover';
    img.src = thumbnail;
    img.alt = '';
    card.appendChild(img);
  } else {
    const iconEl = document.createElement('div');
    iconEl.className = 'playlist-icon';
    iconEl.textContent = iconText;
    card.appendChild(iconEl);
  }

  const nameEl = document.createElement('strong');
  nameEl.textContent = title || 'Playlist';
  const subEl = document.createElement('small');
  subEl.textContent = countText || subtitle;
  card.append(nameEl, subEl);

  const actions = document.createElement('div');
  actions.className = 'playlist-card-actions';
  const openBtn = document.createElement('button');
  openBtn.className = 'playlist-open-btn';
  openBtn.textContent = 'Open';
  openBtn.title = 'Open playlist';
  const playBtn = document.createElement('button');
  playBtn.className = 'playlist-play-btn';
  playBtn.textContent = 'Play';
  playBtn.title = 'Play playlist';
  actions.append(openBtn, playBtn);
  card.appendChild(actions);

  const open = (event) => {
    if (event) event.stopPropagation();
    if (onOpen) onOpen(openBtn);
  };
  openBtn.addEventListener('click', open);
  card.addEventListener('click', open);
  playBtn.addEventListener('click', async (event) => {
    event.stopPropagation();
    if (!onPlay || playBtn.disabled) return;
    const original = playBtn.textContent;
    playBtn.disabled = true;
    playBtn.textContent = '...';
    try { await onPlay(playBtn); }
    finally {
      playBtn.disabled = false;
      playBtn.textContent = original;
    }
  });
  return card;
}

function renderPlaylists() {
  const playlists = getPlaylists();
  const names = Object.keys(playlists);
  currentExternalPlaylist = null;
  playlistReturnTab = 'playlists';
  backToPlaylistsBtn.textContent = 'All Playlists';
  playlistCards.innerHTML = '';
  playlistHint.classList.toggle('hidden', names.length > 0);
  if (currentPlaylistName && playlists[currentPlaylistName]) {
    showPlaylist(currentPlaylistName);
    return;
  }
  playlistDetail.classList.add('hidden');
  playlistCards.classList.remove('hidden');
  names.forEach((name) => {
    const songs = playlists[name] || [];
    const card = buildPlaylistCard({
      title: name,
      countText: `${songs.length} song${songs.length === 1 ? '' : 's'}`,
      iconText: 'PL',
      onOpen: () => showPlaylist(name),
      onPlay: (button) => playSongCollection(songs, name, { type: 'playlist', key: `playlist:${name}` }, button)
    });
    playlistCards.appendChild(card);
  });
}

function renderPlaylistDetailSongs(songs, context, { localName = null } = {}) {
  playlistSongs.innerHTML = '';
  registerSongs(songs);
  if (!songs.length) {
    playlistSongs.innerHTML = '<p class="playlist-detail-empty">No songs in this playlist yet.</p>';
    return;
  }
  songs.forEach((song) => {
    const row = buildSongRow(song, false, context);
    if (localName) {
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.className = 'danger';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const updated = getPlaylists();
        updated[localName] = (updated[localName] || []).filter((s) => s.id !== song.id);
        savePlaylists(updated);
        showPlaylist(localName);
      });
      row.querySelector('.song-actions').appendChild(removeBtn);
    }
    playlistSongs.appendChild(row);
  });
}

function showPlaylist(name) {
  const playlists = getPlaylists();
  const songs = playlists[name] || [];
  currentExternalPlaylist = null;
  currentPlaylistName = name;
  playlistReturnTab = 'playlists';
  currentPlaylistDetail = { songs, label: name, type: 'playlist', key: `playlist:${name}`, source: 'local' };
  backToPlaylistsBtn.textContent = 'All Playlists';
  playlistCards.classList.add('hidden');
  playlistHint.classList.add('hidden');
  playlistDetail.classList.remove('hidden');
  playlistDetailTitle.textContent = name;
  playlistDetailCount.textContent = `${songs.length} song${songs.length === 1 ? '' : 's'}`;
  playlistDetailPlayBtn.disabled = !songs.length;
  shufflePlaylistBtn.disabled = !songs.length;
  const context = makeContext(songs, 'playlist', name, `playlist:${name}`);
  renderPlaylistDetailSongs(songs, context, { localName: name });
}

function buildArtistPlaylistSeeds(songs) {
  const seen = new Set();
  const seeds = [];
  for (const song of songs || []) {
    const artist = String(song.channel || '').trim();
    if (!artist) continue;
    const key = artist.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    seeds.push({
      id: `artist-playlist:${key}`,
      title: `${artist} Mix`,
      artistQuery: artist,
      thumbnail: song.thumbnail || '',
      seedSong: normalizeSong(song),
      type: 'artist-playlist'
    });
    if (seeds.length >= 6) break;
  }
  return seeds;
}

async function loadArtistPlaylistSongs(seed) {
  const cacheKey = String(seed.artistQuery || seed.title || '').trim().toLowerCase();
  if (artistPlaylistCache.has(cacheKey)) return artistPlaylistCache.get(cacheKey);
  const result = await window.echoAPI.searchArtist(seed.artistQuery || seed.title || 'music');
  if (result && result.error) throw new Error(result.error);
  const songs = (Array.isArray(result) ? result : []).map(normalizeSong).filter((song) => song && song.id);
  registerSongs(songs);
  artistPlaylistCache.set(cacheKey, songs);
  return songs;
}

async function showArtistPlaylist(seed, returnTab = 'home') {
  playlistReturnTab = returnTab || 'home';
  activateTab('playlists');
  currentPlaylistName = null;
  currentExternalPlaylist = seed;
  playlistReturnTab = returnTab || 'home';
  backToPlaylistsBtn.textContent = playlistReturnTab === 'home' ? 'Back to Home' : 'Back';
  playlistCards.classList.add('hidden');
  playlistHint.classList.add('hidden');
  playlistDetail.classList.remove('hidden');
  playlistDetailTitle.textContent = seed.title;
  playlistDetailCount.textContent = 'Loading songs...';
  playlistSongs.innerHTML = '<p class="playlist-detail-empty">Finding this artist playlist...</p>';
  playlistDetailPlayBtn.disabled = true;
  shufflePlaylistBtn.disabled = true;

  try {
    const songs = await loadArtistPlaylistSongs(seed);
    if (currentExternalPlaylist !== seed) return;
    currentPlaylistDetail = {
      songs,
      label: seed.title,
      type: 'artist-playlist',
      key: `artist-playlist:${seed.artistQuery}`,
      source: 'artist'
    };
    playlistDetailCount.textContent = `${songs.length} song${songs.length === 1 ? '' : 's'} · ${seed.artistQuery}`;
    playlistDetailPlayBtn.disabled = !songs.length;
    shufflePlaylistBtn.disabled = !songs.length;
    const context = makeContext(songs, 'artist-playlist', seed.title, `artist-playlist:${seed.artistQuery}`);
    renderPlaylistDetailSongs(songs, context);
  } catch (error) {
    if (currentExternalPlaylist !== seed) return;
    currentPlaylistDetail = { songs: [], label: seed.title, type: 'artist-playlist', key: `artist-playlist:${seed.artistQuery}`, source: 'artist' };
    playlistDetailCount.textContent = 'Playlist could not be loaded';
    playlistSongs.innerHTML = `<p class="playlist-detail-empty">${escapeHtml(error?.message || 'Artist playlist load nahi hui.')}</p>`;
  }
}

async function playArtistPlaylist(seed, button = null) {
  try {
    const songs = await loadArtistPlaylistSongs(seed);
    await playSongCollection(songs, seed.title, { type: 'artist-playlist', key: `artist-playlist:${seed.artistQuery}` }, button);
  } catch (error) {
    showToast(error?.message || 'Artist playlist play nahi ho payi.');
  }
}

function renderArtistPlaylistSection(grid, hint, songs, emptyText) {
  const seeds = buildArtistPlaylistSeeds(songs);
  grid.innerHTML = '';
  hint.style.display = seeds.length ? 'none' : 'block';
  hint.textContent = emptyText;
  seeds.forEach((seed) => {
    grid.appendChild(buildPlaylistCard({
      title: seed.title,
      subtitle: 'Artist playlist · Open to view songs',
      thumbnail: seed.thumbnail,
      onOpen: () => showArtistPlaylist(seed, 'home'),
      onPlay: (button) => playArtistPlaylist(seed, button)
    }));
  });
}

// ================= Recently played =================
function addRecentlyPlayed(song) {
  const clean = normalizeSong(song);
  let recent = getStored(STORAGE.recent, []);
  recent = [clean, ...recent.filter((s) => s.id !== clean.id)].slice(0, 10);
  registerSongs(recent);
  setStored(STORAGE.recent, recent);
  // Card rebuilding is secondary work; never block the first audible frame of a song.
  if (typeof smartRunIdle === 'function') smartRunIdle(renderRecentlyPlayed, 360);
  else setTimeout(renderRecentlyPlayed, 360);
}

function renderRecentlyPlayed() {
  const recent = getStored(STORAGE.recent, []);
  registerSongs(recent);
  recentGrid.innerHTML = '';
  recentHint.style.display = recent.length ? 'none' : 'block';
  const context = makeContext(recent, 'recent', 'Recently Played', 'recent');
  recent.slice(0, 6).forEach((song) => recentGrid.appendChild(buildSongCard(song, context)));
}

// ================= Home content =================
async function loadHomeContent(force = false) {
  if (homeLoaded && !force) return;
  topHitsHint.textContent = 'Loading top hits...';
  topArtistsHint.textContent = 'Loading artist playlists...';
  try {
    const data = await window.echoAPI.getHomeFeed();
    if (data && data.error) throw new Error(data.error);
    renderCardSection(topHitsGrid, topHitsHint, data.topHits || [], 'No top hits found.', { type: 'home-top', label: 'Top Hits', key: 'home-top' });
    renderArtistPlaylistSection(topArtistsGrid, topArtistsHint, data.topArtistSongs || [], 'No artist playlists found.');
    homeLoaded = true;
  } catch (err) {
    topHitsHint.textContent = 'Top hits load nahi ho paye.';
    topArtistsHint.textContent = 'Artist playlists load nahi ho paye.';
  }
}

function renderCardSection(grid, hint, songs, emptyText, meta = {}) {
  registerSongs(songs);
  grid.innerHTML = '';
  hint.style.display = songs.length ? 'none' : 'block';
  hint.textContent = emptyText;
  const context = makeContext(songs, meta.type || 'home', meta.label || 'Home', meta.key || meta.type || 'home');
  songs.slice(0, 6).forEach((song) => grid.appendChild(buildSongCard(song, context)));
}

function buildSongCard(song, contextSpec = null) {
  registerSongs([song]);
  const card = document.createElement('div');
  card.className = 'song-card';
  const img = document.createElement('img');
  img.src = song.thumbnail || '';
  img.alt = '';
  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = song.title;
  const sub = document.createElement('div');
  sub.className = 'card-sub';
  sub.textContent = song.channel || '';
  const play = document.createElement('button');
  play.className = 'card-play';
  play.innerHTML = icon('play');
  play.title = 'Play';

  const quick = document.createElement('div');
  quick.className = 'card-queue-actions';
  const next = document.createElement('button');
  next.innerHTML = icon('next');
  next.title = 'Play next';
  next.setAttribute('aria-label', 'Play next');
  next.addEventListener('click', (e) => { e.stopPropagation(); addPlayNext(song); });
  const queue = document.createElement('button');
  queue.innerHTML = icon('queue');
  queue.title = 'Add to queue';
  queue.setAttribute('aria-label', 'Add to queue');
  queue.addEventListener('click', (e) => { e.stopPropagation(); addToQueue(song); });
  quick.append(next, queue);

  card.append(img, title, sub, play, quick);
  const start = (e) => {
    if (e) e.stopPropagation();
    startSingleSong(song, play, contextSpec);
  };
  play.addEventListener('click', start);
  card.addEventListener('click', start);
  return card;
}

// ================= Song row builder =================
function buildSongRow(song, isLibrary, contextSpec = null) {
  registerSongs([song]);
  const row = document.createElement('div');
  row.className = 'song-row';

  const img = document.createElement('img');
  img.src = song.thumbnail || '';
  img.alt = '';
  row.appendChild(img);

  const meta = document.createElement('div');
  meta.className = 'song-meta';
  meta.innerHTML = `<div class="title">${escapeHtml(song.title)}</div><div class="sub">${escapeHtml(song.channel || '')}</div>`;
  row.appendChild(meta);

  if (!isLibrary) {
    const dur = document.createElement('div');
    dur.className = 'song-duration';
    dur.textContent = song.duration || '';
    row.appendChild(dur);
  }

  const actions = document.createElement('div');
  actions.className = 'song-actions';

  const playBtn = document.createElement('button');
  playBtn.innerHTML = icon('play');
  playBtn.classList.add('row-icon');
  playBtn.title = 'Play';
  playBtn.setAttribute('aria-label', 'Play ' + song.title);
  playBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await startSingleSong(song, playBtn, contextSpec);
  });
  actions.appendChild(playBtn);

  const likeBtn = document.createElement('button');
  likeBtn.dataset.likeId = song.id;
  likeBtn.title = 'Like';
  likeBtn.classList.add('action-like');
  setLikeIcon(likeBtn, isLiked(song));
  likeBtn.classList.add('row-icon');
  likeBtn.classList.toggle('active-like', isLiked(song));
  likeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLike(song);
  });
  actions.appendChild(likeBtn);

  const playlistBtn = document.createElement('button');
  playlistBtn.textContent = 'Add';
  playlistBtn.classList.add('action-add');
  playlistBtn.title = 'Add to playlist';
  playlistBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    addToPlaylist(song);
  });
  actions.appendChild(playlistBtn);

  const playNextBtn = document.createElement('button');
  playNextBtn.textContent = 'Next';
  playNextBtn.classList.add('action-next');
  playNextBtn.title = 'Play next';
  playNextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    addPlayNext(song);
  });
  actions.appendChild(playNextBtn);

  const queueBtn = document.createElement('button');
  queueBtn.textContent = 'Queue';
  queueBtn.classList.add('action-queue');
  queueBtn.title = 'Add to queue';
  queueBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    addToQueue(song);
  });
  actions.appendChild(queueBtn);

  if (!isLibrary) {
    const dlBtn = document.createElement('button');
    dlBtn.textContent = isDownloaded(song) ? 'Saved' : 'Download';
    dlBtn.classList.add('action-download');
    dlBtn.title = 'Download';
    dlBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await downloadSong(song, dlBtn);
    });
    actions.appendChild(dlBtn);
  } else {
    const delBtn = document.createElement('button');
    delBtn.className = 'danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      currentLibrary = await window.echoAPI.deleteSong(song.id);
      loadLibrary();
    });
    actions.appendChild(delBtn);
  }

  row.appendChild(actions);
  const searchClickToPlay = !!contextSpec && ['search', 'artist-search'].includes(contextSpec.type);
  if (searchClickToPlay) {
    row.classList.add('search-click-to-play');
    row.title = 'Click to play';
    row.addEventListener('click', async (event) => {
      if (event.target.closest('button')) return;
      await startSingleSong(song, playBtn, contextSpec);
    });
  } else {
    row.addEventListener('dblclick', () => startSingleSong(song, null, contextSpec));
  }
  return row;
}

let playRequest = 0;
let loadingRequest = null;
let loadingTimer = null;
const loadingWrap = document.getElementById('playLoadingWrap');
const loadingText = document.getElementById('playLoadingText');
const loadingTrack = document.getElementById('playLoadingTrack');
const loadingFill = document.getElementById('playLoadingFill');
function showPlayLoading(percent, status, title = '') {
  clearTimeout(loadingTimer);
  loadingWrap.classList.remove('hidden');
  const known = Number.isFinite(percent);
  loadingTrack.classList.toggle('indeterminate', !known);
  if (known) loadingTrack.setAttribute('aria-valuenow', String(Math.round(percent)));
  else loadingTrack.removeAttribute('aria-valuenow');
  loadingFill.style.width = known ? `${percent}%` : '30%';
  loadingText.textContent = `${status}${known ? ` · ${Math.round(percent)}%` : ''}${title ? ` — ${title}` : ''}`;
}
function hidePlayLoading() { loadingWrap.classList.add('hidden'); }
let smartSecondaryPlaybackTimer = 0;
let smartPrefetchTimer = 0;
function smartRunIdle(task, delay = 0) {
  const run = () => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => { try { task(); } catch (_) {} }, { timeout: 900 });
    else setTimeout(() => { try { task(); } catch (_) {} }, 0);
  };
  if (delay > 0) return setTimeout(run, delay);
  run(); return 0;
}
function smartScheduleSecondaryPlayback(song, requestId, delay = 420) {
  if (window.__deepecchoGameMode) delay = Math.max(delay, 2200);
  clearTimeout(smartSecondaryPlaybackTimer);
  smartSecondaryPlaybackTimer = setTimeout(() => {
    if (requestId !== playRequest || !currentSong || currentSong.id !== song.id) return;
    smartRunIdle(() => {
      if (requestId !== playRequest || currentSong?.id !== song.id) return;
      startLyricsVisualizer();
      syncFluidFxState();
      Promise.resolve(loadLyricsFor(currentSong)).catch(()=>{});
    });
  }, delay);
}
function smartSchedulePrefetch(delay = 1250) {
  clearTimeout(smartPrefetchTimer);
  smartPrefetchTimer = setTimeout(() => {
    if (!currentSong || audioPlayer.paused || audioPlayer.ended) return;
    smartRunIdle(() => prefetchNextQueued?.());
  }, delay);
}
if (window.echoAPI.onStreamProgress) window.echoAPI.onStreamProgress(progress => {
  if (!loadingRequest || progress.requestId !== loadingRequest.requestId || progress.id !== loadingRequest.id) return;
  showPlayLoading(progress.percent, progress.status, loadingRequest.title);
});
async function playRemoteSong(song, button) {
  const requestId = ++playRequest;
  const oldContent = button && button.innerHTML;
  const previousUi = {
    title: nowTitle.textContent, channel: nowChannel.textContent, thumb: nowThumb.src,
    seek: seekBar.value, current: curTime.textContent, duration: durTime.textContent,
    wasPlaying: !!audioPlayer.src && !audioPlayer.paused
  };
  // A new selection owns playback immediately. Do not let the old track keep playing while
  // yt-dlp resolves the new stream; that made a clicked search result look like the wrong song.
  if (!audioPlayer.paused) audioPlayer.pause();
  nowTitle.textContent = `${song.title || 'Selected song'} · Loading…`;
  nowChannel.textContent = song.channel || '';
  nowThumb.src = song.thumbnail || DEFAULT_THUMB;
  seekBar.value = 0; curTime.textContent = '0:00'; durTime.textContent = song.duration || '0:00';
  loadingRequest = { id: song.id, title: song.title, requestId };
  showPlayLoading(5, 'Connecting', song.title);
  if (button) { button.disabled = true; button.innerHTML = icon('loading'); }
  try {
    const res = await window.echoAPI.streamSong(normalizeSong(song), requestId, window.__dinechoAudioQuality || 'auto');
    if (requestId !== playRequest) return;
    if (!res.success) { const e = new Error(res.error); e.code = res.errorCode; e.needsBrowserAuth = !!res.needsBrowserAuth; throw e; }
    await playLocal(res.song, requestId);
  } catch (err) {
    if (requestId === playRequest) {
      // Restore the last confirmed Now Playing identity when the replacement cannot start.
      nowTitle.textContent = previousUi.title; nowChannel.textContent = previousUi.channel; nowThumb.src = previousUi.thumb;
      seekBar.value = previousUi.seek; curTime.textContent = previousUi.current; durTime.textContent = previousUi.duration;
      const friendly = err?.code === 'YOUTUBE_BOT_CHECK' ? 'YouTube bot-check · Settings > YouTube Access me browser fallback optional hai' : ('Could not play · ' + err.message);
      showPlayLoading(null, friendly);
      if (err?.code === 'YOUTUBE_BOT_CHECK') showToast('YouTube bot-check laga hai. Playback retry-safe hai; Settings > YouTube Access me optional browser fallback enable kar sakte ho.');
      loadingTrack.classList.remove('indeterminate');
      loadingFill.style.width = '0%';
      loadingTimer = setTimeout(hidePlayLoading, 7000);
    }
  } finally {
    if (requestId === playRequest) loadingRequest = null;
    if (button) { button.innerHTML = oldContent; button.disabled = false; }
  }
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ================= Queue / shuffle / loop =================
function makeContext(items, type = 'collection', label = 'Collection', key = type) {
  return { items: (items || []).map(queueSong).filter(Boolean), type, label, key };
}

function persistQueue() {
  // The visible Queue stores only songs the user explicitly queued.
  setStored(STORAGE.queue, playQueue.map((song) => { const saved = queueSong(song); if (saved) delete saved.streamUrl; return saved; }).filter(Boolean));
  localStorage.setItem(STORAGE.queueIndex, '-1');
  localStorage.setItem(STORAGE.loop, loopMode);
  localStorage.setItem(STORAGE.shuffle, String(shuffleEnabled));
}

function setActiveContext(contextSpec, song = null, { shuffled = false } = {}) {
  const spec = Array.isArray(contextSpec) ? makeContext(contextSpec) : contextSpec;
  const originalItems = (spec?.items || []).map(queueSong).filter(Boolean);
  if (!originalItems.length) {
    activeContext = null;
    return;
  }
  const targetId = song?.id || null;
  let items = originalItems.map(queueSong);
  if (shuffled) items = shuffledCopy(items);
  let index = targetId ? items.findIndex((entry) => entry.id === targetId) : 0;
  if (index < 0) index = 0;
  activeContext = {
    type: spec.type || 'collection',
    label: spec.label || 'Collection',
    key: spec.key || spec.type || 'collection',
    originalItems,
    items,
    index
  };
  registerSongs(originalItems);
}

function activeContextSong() {
  if (!activeContext?.items?.length || activeContext.index < 0) return null;
  return activeContext.items[activeContext.index] || null;
}

function wrapContextIndex(index) {
  const length = activeContext?.items?.length || 0;
  if (!length) return -1;
  return ((index % length) + length) % length;
}

async function startSingleSong(song, button, contextSpec = null) {
  const item = queueSong(song);
  if (!item) return;
  if (contextSpec) setActiveContext(contextSpec, item);
  else setActiveContext(makeContext([item], 'single', item.title, `single:${item.id}`), item);
  shuffleEnabled = false;
  currentPlaybackSource = 'context';
  persistQueue();
  updateQueueControls();
  renderQueue();
  await playContextAt(activeContext.index, button);
}

async function playSongObject(song, button, source = 'context', { recordHistory: shouldRecord = true } = {}) {
  const item = queueSong(song);
  if (!item) return false;
  const beforeId = currentSong && currentSong.id;
  if (item.filepath || item.fileUrl || item.streamUrl) await playLocal(item);
  else await playRemoteSong(item, button);
  const started = !!currentSong && currentSong.id === item.id;
  if (started) {
    currentPlaybackSource = source;
    if (shouldRecord && (beforeId !== item.id || historyIndex < 0)) recordPlayback(currentSong);
  }
  smartSchedulePrefetch(1250);
  renderQueue();
  return started;
}

async function playContextAt(index, button, options = {}) {
  if (!activeContext?.items?.length) return false;
  const wrapped = wrapContextIndex(index);
  if (wrapped < 0) return false;
  activeContext.index = wrapped;
  const started = await playSongObject(activeContext.items[wrapped], button, 'context', options);
  updateQueueControls();
  return started;
}

async function playQueueAt(index = 0, button, options = {}) {
  if (index < 0 || index >= playQueue.length) return false;
  const [song] = playQueue.splice(index, 1);
  queueIndex = -1;
  persistQueue();
  renderQueue();
  return playSongObject(song, button, 'queue', options);
}

async function playHistoryAt(index) {
  if (index < 0 || index >= playbackHistory.length) return false;
  historyIndex = index;
  const song = queueSong(playbackHistory[index]);
  if (!song) return false;
  return playSongObject(song, null, 'history', { recordHistory: false });
}

function addPlayNext(song) {
  const item = queueSong(song);
  if (!item) return;
  registerSongs([item]);
  playQueue.unshift(item);
  queueIndex = -1;
  persistQueue(); renderQueue(); prefetchNextQueued();
  showToast(`Play Next: ${item.title}`);
}

function addToQueue(song) {
  const item = queueSong(song);
  if (!item) return;
  registerSongs([item]);
  playQueue.push(item);
  queueIndex = -1;
  persistQueue(); renderQueue(); prefetchNextQueued();
  showToast(`Queue me add: ${item.title} · ${playQueue.length} queued`);
}

function nextContextIndex() {
  if (!activeContext?.items?.length) return -1;
  return wrapContextIndex(activeContext.index + 1);
}

function previousContextIndex() {
  if (!activeContext?.items?.length) return -1;
  return wrapContextIndex(activeContext.index - 1);
}

async function playNext({ auto = false } = {}) {
  if (!auto && typeof smartRecordSkipSignal === 'function') smartRecordSkipSignal(currentSong);
  if (auto && loopMode === 'one' && currentSong) {
    audioPlayer.currentTime = 0;
    try { await audioPlayer.play(); } catch (_) {}
    return;
  }

  // Manual queue always has priority, exactly like a user-curated Up Next list.
  if (playQueue.length) {
    await playQueueAt(0);
    return;
  }

  // When a song came from Downloads/Liked/Playlist/Search/Home, stay inside that exact section.
  // If a YouTube source is temporarily unavailable, Stability Mode can move to the next item
  // instead of leaving the player stuck on a dead entry.
  if (activeContext?.items?.length) {
    const attempts = Math.min(3, activeContext.items.length);
    for (let attempt = 0; attempt < attempts; attempt++) {
      const next = nextContextIndex();
      if (next < 0) break;
      const started = await playContextAt(next);
      if (started) return;
    }
  }

  // Only truly context-less playback may fall back to a random known track.
  const randomSong = await getRandomFallbackSong();
  if (!randomSong) {
    showToast('Next song nahi mila');
    return;
  }
  setActiveContext(makeContext([randomSong], 'fallback', 'Random', `random:${randomSong.id}`), randomSong);
  showToast(`Random next: ${randomSong.title}`);
  await playContextAt(0);
}

async function playPrevious() {
  // Section playback is circular: first <- last and last -> first.
  if (currentPlaybackSource === 'context' && activeContext?.items?.length) {
    const previous = previousContextIndex();
    if (previous >= 0) {
      await playContextAt(previous);
      return;
    }
  }
  // If a manually queued song is playing, Previous returns to what actually played before it.
  if (historyIndex > 0) {
    await playHistoryAt(historyIndex - 1);
    return;
  }
  if (activeContext?.items?.length) {
    await playContextAt(previousContextIndex());
    return;
  }
  showToast('Previous song nahi hai');
}

function shuffleActiveContext(enable) {
  if (!activeContext?.originalItems?.length) return;
  const anchorId = activeContextSong()?.id || activeContext.originalItems[activeContext.index]?.id || currentSong?.id;
  if (enable) {
    const anchor = activeContext.originalItems.find((song) => song.id === anchorId);
    const remaining = activeContext.originalItems.filter((song) => song.id !== anchorId);
    activeContext.items = anchor ? [queueSong(anchor), ...shuffledCopy(remaining)] : shuffledCopy(activeContext.originalItems);
    activeContext.index = anchor ? 0 : 0;
  } else {
    activeContext.items = activeContext.originalItems.map(queueSong);
    const restored = activeContext.items.findIndex((song) => song.id === anchorId);
    activeContext.index = restored >= 0 ? restored : 0;
  }
}

async function shuffleAndPlay(items, label, meta = {}) {
  if (!items || !items.length) { showToast(`${label} empty hai`); return; }
  setActiveContext(makeContext(items, meta.type || 'collection', label, meta.key || meta.type || label), null, { shuffled: true });
  shuffleEnabled = true;
  currentPlaybackSource = 'context';
  persistQueue();
  updateQueueControls();
  renderQueue();
  showToast(`${label} shuffle on · only ${label}`);
  await playContextAt(0);
}

function updateQueueControls() {
  shuffleBtn.innerHTML = icon('shuffle');
  shuffleBtn.classList.toggle('active-mode', shuffleEnabled);
  shuffleBtn.setAttribute('aria-pressed', String(shuffleEnabled));
  back10Btn.innerHTML = icon('back10');
  previousBtn.innerHTML = icon('previous');
  nextBtn.innerHTML = icon('next');
  forward10Btn.innerHTML = icon('forward10');
  back10Btn.title = 'Back 10 seconds';
  back10Btn.setAttribute('aria-label', 'Back 10 seconds');
  previousBtn.title = activeContext ? `Previous in ${activeContext.label}` : 'Previous song';
  previousBtn.setAttribute('aria-label', previousBtn.title);
  nextBtn.title = activeContext ? `Next in ${activeContext.label}` : 'Next song';
  nextBtn.setAttribute('aria-label', nextBtn.title);
  forward10Btn.title = 'Forward 10 seconds';
  forward10Btn.setAttribute('aria-label', 'Forward 10 seconds');
  queueToggleBtn.innerHTML = icon('queue');
  loopBtn.innerHTML = icon('repeat') + (loopMode === 'one' ? '<span class="loop-badge">1</span>' : '');
  loopBtn.classList.toggle('active-mode', loopMode !== 'off');
  loopBtn.title = loopMode === 'one' ? 'Loop One' : loopMode === 'all' ? 'Loop All' : 'Loop Off';
  loopBtn.setAttribute('aria-label', loopBtn.title);
}

function moveQueueItem(from, to) {
  if (to < 0 || to >= playQueue.length || from === to) return;
  const [item] = playQueue.splice(from, 1);
  playQueue.splice(to, 0, item);
  persistQueue(); renderQueue(); prefetchNextQueued();
}

function removeQueueItem(index) {
  if (index < 0 || index >= playQueue.length) return;
  playQueue.splice(index, 1);
  persistQueue(); renderQueue(); prefetchNextQueued();
}

function clearQueue() {
  playQueue = [];
  queueIndex = -1;
  persistQueue(); renderQueue(); prefetchNextQueued();
}

function renderQueue() {
  queueList.innerHTML = '';
  const contextText = activeContext?.label ? ` · Context: ${activeContext.label}${shuffleEnabled ? ' · Shuffle' : ''}` : '';
  queueSummary.textContent = playQueue.length ? `${playQueue.length} manually queued${contextText}` : `No manual songs queued${contextText}`;
  if (!playQueue.length) {
    const empty = document.createElement('p'); empty.className = 'queue-empty'; empty.textContent = 'Sirf wahi songs yahan aayenge jo tum Next ya Queue se add karoge.'; queueList.appendChild(empty); return;
  }
  playQueue.forEach((song, index) => {
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.dataset.queueIndex = String(index);
    item.draggable = true;
    item.addEventListener('dragstart', e => e.dataTransfer.setData('text/deep-echo-queue', String(index)));
    item.addEventListener('dragover', e => e.preventDefault());
    item.addEventListener('drop', e => { e.preventDefault(); const raw=e.dataTransfer.getData('text/deep-echo-queue'); if(raw !== '') moveQueueItem(Number(raw), index); });
    const img = document.createElement('img'); img.src = song.thumbnail || DEFAULT_THUMB; img.alt = '';
    const meta = document.createElement('button'); meta.className = 'queue-meta'; meta.title = 'Play queued song now';
    const title = document.createElement('strong'); title.textContent = song.title;
    const sub = document.createElement('span'); sub.textContent = song.channel || '';
    meta.append(title, sub); meta.addEventListener('click', () => playQueueAt(index));
    const actions = document.createElement('div'); actions.className = 'queue-item-actions';
    const up = document.createElement('button'); up.textContent = '↑'; up.title = 'Move up'; up.disabled = index === 0; up.addEventListener('click', () => moveQueueItem(index, index - 1));
    const down = document.createElement('button'); down.textContent = '↓'; down.title = 'Move down'; down.disabled = index === playQueue.length - 1; down.addEventListener('click', () => moveQueueItem(index, index + 1));
    const remove = document.createElement('button'); remove.textContent = '×'; remove.title = 'Remove'; remove.addEventListener('click', () => removeQueueItem(index));
    actions.append(up, down, remove); item.append(img, meta, actions); queueList.appendChild(item);
  });
}

async function prefetchNextQueued() {
  if (!window.echoAPI.prefetchSong) return;
  let song = playQueue[0] || null;
  if (!song && activeContext?.items?.length) {
    const next = nextContextIndex();
    if (next >= 0) song = activeContext.items[next];
  }
  if (!song || song.filepath || song.fileUrl || song.streamUrl) return;
  const serial = ++prefetchSerial;
  try { await window.echoAPI.prefetchSong(normalizeSong(song)); } catch (_) {}
  if (serial !== prefetchSerial) return;
}

shuffleBtn.addEventListener('click', () => {
  if (!activeContext?.items?.length) {
    shuffleEnabled = !shuffleEnabled;
    showToast(shuffleEnabled ? 'Shuffle on' : 'Shuffle off');
  } else {
    shuffleEnabled = !shuffleEnabled;
    shuffleActiveContext(shuffleEnabled);
    showToast(`${shuffleEnabled ? 'Shuffle on' : 'Shuffle off'} · ${activeContext.label}`);
  }
  persistQueue(); renderQueue(); updateQueueControls(); prefetchNextQueued();
});
previousBtn.addEventListener('click', playPrevious);
nextBtn.addEventListener('click', () => playNext());
back10Btn.addEventListener('click', () => {
  if (!audioPlayer.src) return;
  audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
  syncLyrics(true);
  showToast('-10 seconds');
});
forward10Btn.addEventListener('click', () => {
  if (!audioPlayer.src) return;
  const target = Math.max(0, audioPlayer.currentTime + 10);
  audioPlayer.currentTime = Number.isFinite(audioPlayer.duration) && audioPlayer.duration > 0 ? Math.min(target, audioPlayer.duration) : target;
  showToast('+10 seconds');
});
loopBtn.addEventListener('click', () => {
  loopMode = loopMode === 'off' ? 'all' : loopMode === 'all' ? 'one' : 'off';
  persistQueue(); renderQueue(); updateQueueControls(); prefetchNextQueued();
});
function setQueuePanelOpen(open){
  if(!queuePanel)return;
  queuePanel.classList.toggle('hidden',!open);
  queuePanel.setAttribute('aria-hidden',String(!open));
}
queueToggleBtn.addEventListener('click', () => setQueuePanelOpen(queuePanel.classList.contains('hidden')));
queueCloseBtn.addEventListener('click', () => setQueuePanelOpen(false));
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!queuePanel?.classList.contains('hidden'))setQueuePanelOpen(false);});
clearQueueBtn.addEventListener('click', clearQueue);

// Main player can collapse to a slim arrow handle and expands without disturbing playback.
function applyPlayerCollapsed(collapsed, persist = true) {
  if (!playerBar || !playerCollapseBtn) return;
  const isCollapsed = !!collapsed;
  playerBar.classList.toggle('is-collapsed', isCollapsed);
  document.body.classList.toggle('player-is-collapsed', isCollapsed);
  playerCollapseBtn.textContent = isCollapsed ? '⌃' : '⌄';
  playerCollapseBtn.title = isCollapsed ? 'Show player' : 'Hide player';
  playerCollapseBtn.setAttribute('aria-label', playerCollapseBtn.title);
  playerCollapseBtn.setAttribute('aria-expanded', String(!isCollapsed));
  if (persist) setStored(STORAGE.playerCollapsed, isCollapsed);
}
if (playerCollapseBtn) {
  playerCollapseBtn.addEventListener('click', () => applyPlayerCollapsed(!playerBar?.classList.contains('is-collapsed')));
  applyPlayerCollapsed(getStored(STORAGE.playerCollapsed, false), false);
}

// ================= Player =================
function icon(name) {
  const paths = {
    play: '<path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    loading: '<path d="M21 12a9 9 0 1 1-9-9"/>',
    previous: '<path d="M6 5v14M18 6l-8 6 8 6z"/>',
    next: '<path d="M18 5v14M6 6l8 6-8 6z"/>',
    back10: '<path d="M4 7v5h5M5 12a7 7 0 1 0 2-5"/><text x="12" y="15" text-anchor="middle" font-size="7" font-weight="800" fill="currentColor" stroke="none">10</text>',
    forward10: '<path d="M20 7v5h-5M19 12a7 7 0 1 1-2-5"/><text x="12" y="15" text-anchor="middle" font-size="7" font-weight="800" fill="currentColor" stroke="none">10</text>',
    shuffle: '<path d="M4 7h3c4 0 5 10 9 10h4M17 4l3 3-3 3M4 17h3c1.6 0 2.8-1.5 4-3.3M15 7.5c1-1 2-1.5 3-1.5h2M17 14l3 3-3 3"/>',
    repeat: '<path d="M17 2l3 3-3 3M20 5H8a4 4 0 0 0-4 4v1M7 22l-3-3 3-3M4 19h12a4 4 0 0 0 4-4v-1"/>',
    queue: '<path d="M5 6h10M5 12h10M5 18h10M19 9v8m-3-3 3 3 3-3"/>',
    radio: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.6 4.6a10.5 10.5 0 0 0 0 14.8M19.4 4.6a10.5 10.5 0 0 1 0 14.8"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>'
  };
  return `<svg class="ui-icon ${name === 'loading' ? 'spin' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.play}</svg>`;
}
function setLikeIcon(button, active) {
  button.innerHTML = icon('heart');
  button.title = active ? 'Unlike song' : 'Like song';
  button.setAttribute('aria-label', button.title);
  button.setAttribute('aria-pressed', String(active));
}
function triggerThemeLikeAnimation(sourceEl = null) {
  const layer = document.getElementById('likeCelebrationLayer');
  if (!layer) return;
  const theme = document.body.dataset.theme || 'golden';
  const config = {
    golden:{glyph:'✦',count:16}, light:{glyph:'✧',count:11}, dark:{glyph:'◆',count:10}, purple:{glyph:'ϟ',count:13},
    toxic:{glyph:'●',count:15}, blood:{glyph:'●',count:13}, silver:{glyph:'✦',count:15}, transparent:{glyph:'○',count:10},
    dragon:{glyph:'✦',count:20}, fluids:{glyph:'●',count:14}, rgb:{glyph:'◆',count:18}, love:{glyph:'♥',count:18}, space:{glyph:'✦',count:20}
  }[theme] || {glyph:'♥',count:14};
  const rect = sourceEl?.getBoundingClientRect?.();
  const x = rect ? rect.left + rect.width/2 : window.innerWidth/2;
  const y = rect ? rect.top + rect.height/2 : window.innerHeight*.72;
  const burst = document.createElement('div'); burst.className='theme-like-burst'; burst.dataset.theme=theme; burst.style.left=`${x}px`; burst.style.top=`${y}px`;
  const core=document.createElement('i');core.className='theme-like-core';burst.appendChild(core);
  for(let i=0;i<config.count;i++){
    const p=document.createElement('span');p.className='theme-like-particle';p.textContent=theme==='rgb'?(i%3===0?'✦':i%3===1?'◆':'●'):config.glyph;
    const angle=(Math.PI*2*i/config.count)+((i%2)*.12);const distance=34+(i%5)*13;
    p.style.setProperty('--dx',`${Math.cos(angle)*distance}px`);p.style.setProperty('--dy',`${Math.sin(angle)*distance}px`);p.style.setProperty('--rot',`${(i*47)%260-130}deg`);p.style.setProperty('--delay',`${(i%4)*18}ms`);p.style.setProperty('--scale',String(.72+(i%4)*.14));burst.appendChild(p);
  }
  layer.appendChild(burst);setTimeout(()=>burst.remove(),1200);
}

function updatePlayIcon() {
  const playing = !audioPlayer.paused && !audioPlayer.ended;
  playPauseBtn.innerHTML = icon(playing ? 'pause' : 'play');
  playPauseBtn.title = playing ? 'Pause' : 'Play';
  playPauseBtn.setAttribute('aria-label', playPauseBtn.title);
}
async function playLocal(song, requestId) {
  if (!song || (!song.filepath && !song.fileUrl && !song.streamUrl)) return;
  if (requestId === undefined) { requestId = ++playRequest; loadingRequest = null; }
  if (requestId !== playRequest) return;
  showPlayLoading(100, 'Starting playback', song.title);
  // Main-process URL handles spaces, # and Unicode Windows filenames.
  const filePath = song.filepath ? song.filepath.replace(/\\/g, '/') : '';
  visualizerLocalRecoverySongId = '';
  visualizerLocalRecoveryPending = false;
  audioPlayer.src = song.streamUrl || song.fileUrl || 'file:///' + filePath.split('/').map((part, index) => index === 0 ? part : encodeURIComponent(part)).join('/');
  audioAnalyserMediaKey = ''; // force a fresh capture stream for the new media resource.
  resetVisualizerSignalState();
  currentSong = { ...song, url: song.url || `https://www.youtube.com/watch?v=${song.id}` };
  // Critical path first: paint Now Playing + start audio. Lyrics/visual FX/network work is deferred.
  nowTitle.textContent = song.title;
  nowChannel.textContent = song.channel || '';
  nowThumb.src = song.thumbnail || DEFAULT_THUMB;
  updateLyricsVisual(song);
  seekBar.value = 0; curTime.textContent = '0:00'; durTime.textContent = song.duration || '0:00';
  syncPlayerLikeState(); syncPlayerDownloadState();
  try {
    await audioPlayer.play();
    if (requestId !== playRequest) return;
    await resumeAudioAnalyser(true);
    startLyricsVisualizer();
    startAudioEnergyTicker();
    smartScheduleSecondaryPlayback(currentSong, requestId, 420);
    addRecentlyPlayed(song);
    showPlayLoading(100, 'Playing', song.title);
    loadingTimer = setTimeout(hidePlayLoading, 1200);
  } catch (error) {
    if (requestId !== playRequest) return;
    const unsupported = error?.name === 'NotSupportedError' || /no supported source|src_not_supported|not supported/i.test(String(error?.message || '')) || audioPlayer.error?.code === 4;
    if (unsupported && song.streamUrl && window.echoAPI.prepareCompatiblePlayback) {
      try {
        showPlayLoading(null, 'Preparing compatible audio', song.title);
        const fallback = await window.echoAPI.prepareCompatiblePlayback(normalizeSong(song));
        if (requestId !== playRequest) return;
        if (fallback?.success && fallback.fileUrl) {
          audioPlayer.src = fallback.fileUrl;
          audioAnalyserMediaKey = ''; resetVisualizerSignalState();
          currentSong = { ...currentSong, filepath: fallback.filepath || '', fileUrl: fallback.fileUrl, streamUrl: '' };
          await audioPlayer.play();
          // Restart secondary work from the known-good local compatibility source,
          // but keep it off the audio-start critical path.
          smartScheduleSecondaryPlayback(currentSong, requestId, 250);
          addRecentlyPlayed(song);
          showPlayLoading(100, 'Playing · compatibility mode', song.title);
          loadingTimer = setTimeout(hidePlayLoading, 1200);
          updatePlayIcon();
          return;
        }
      } catch (_) {}
    }
    hidePlayLoading(); showToast('Audio start nahi hua: ' + error.message);
  }
  updatePlayIcon();
}
playPauseBtn.addEventListener('click', async () => {
  if (!audioPlayer.src) return;
  await resumeAudioAnalyser();
  if (!audioPlayer.paused) audioPlayer.pause();
  else { try { await audioPlayer.play(); } catch (error) { showToast('Play failed: ' + error.message); } }
  updatePlayIcon();
});
['play', 'pause', 'ended'].forEach(event => audioPlayer.addEventListener(event, updatePlayIcon));
audioPlayer.addEventListener('ended', () => { if (window.deepEchoStopAtEnd) { window.deepEchoStopAtEnd = false; audioPlayer.pause(); window.dispatchEvent(new Event('deep-echo-sleep-finished')); return; } if (typeof smartRecordCompletionSignal === 'function') smartRecordCompletionSignal(currentSong); if (typeof onSmartPlaybackEnded === 'function') onSmartPlaybackEnded(); playNext({ auto: true }); });
audioPlayer.addEventListener('error', () => { hidePlayLoading(); updatePlayIcon(); showToast('Audio file load nahi hui. Song dobara play karo.'); });
audioPlayer.addEventListener('waiting', () => { if (!loadingRequest) showPlayLoading(null, 'Buffering', currentSong?.title); });
audioPlayer.addEventListener('playing', () => { if (!loadingRequest) hidePlayLoading(); });
let smartEndPrefetchSongId = '';
audioPlayer.addEventListener('timeupdate', () => {
  const duration = Number(audioPlayer.duration || 0), current = Number(audioPlayer.currentTime || 0);
  if (!currentSong?.id || !Number.isFinite(duration) || duration <= 0) return;
  if (duration - current <= 24 && smartEndPrefetchSongId !== currentSong.id) {
    smartEndPrefetchSongId = currentSong.id;
    prefetchNextQueued?.();
  }
});
audioPlayer.addEventListener('loadedmetadata', () => { smartEndPrefetchSongId = ''; });

playerLikeBtn.addEventListener('click', () => {
  if (currentSong) toggleLike(currentSong, playerLikeBtn);
});

playerDownloadBtn.addEventListener('click', async () => {
  if (!currentSong) return;
  await downloadSong(currentSong, playerDownloadBtn);
});

function syncPlayerLikeState() {
  const active = isLiked(currentSong);
  setLikeIcon(playerLikeBtn, active);
  playerLikeBtn.classList.toggle('active-like', active);
  playerLikeBtn.disabled = !currentSong;
  const immersiveLikeMirror = document.getElementById('immersiveLikeBtn');
  if (immersiveLikeMirror) {
    setLikeIcon(immersiveLikeMirror, active);
    immersiveLikeMirror.classList.toggle('active-like', active);
    immersiveLikeMirror.disabled = !currentSong;
  }
}
function syncPlayerDownloadState() {
  const saved = !!currentSong && isDownloaded(currentSong);
  playerDownloadBtn.innerHTML = icon(saved ? 'check' : 'download');
  playerDownloadBtn.title = saved ? 'Saved in Downloads' : 'Download song';
  playerDownloadBtn.setAttribute('aria-label', playerDownloadBtn.title);
  playerDownloadBtn.classList.toggle('is-saved', saved);
  playerDownloadBtn.disabled = !currentSong;
}

audioPlayer.addEventListener('timeupdate', () => {
  if (!audioPlayer.duration) return;
  seekBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  curTime.textContent = formatTime(audioPlayer.currentTime);
  durTime.textContent = formatTime(audioPlayer.duration);
});

seekBar.addEventListener('input', () => {
  if (!audioPlayer.duration) return;
  audioPlayer.currentTime = (seekBar.value / 100) * audioPlayer.duration;
});



function formatTime(sec) {
  if (isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function setActionButtonLabel(button, label) {
  if (!button) return;
  if (button === playerDownloadBtn) {
    button.innerHTML = icon(label === 'Saved' ? 'check' : label === '...' ? 'loading' : 'download');
    button.title = label;
    button.setAttribute('aria-label', label);
    return;
  }
  const span = button.querySelector('span:last-child');
  if (span) span.textContent = label;
  else button.textContent = label;
}

// ================= Download + progress =================
async function downloadSong(song, button) {
  if (!song) return;
  const oldText = button ? button.textContent.trim() : '';
  if (button) {
    setActionButtonLabel(button, '...');
    button.disabled = true;
  }
  showDownloadProgress(0, 'Starting');
  try {
    const res = await window.echoAPI.downloadSong({...normalizeSong(song), downloadQuality: localStorage.getItem('deep-echo-download-quality') || 'best'});
    if (res.success) {
      showDownloadProgress(100, res.alreadyExists ? 'Saved' : 'Done');
      currentLibrary = await window.echoAPI.getLibrary();
      if (button) setActionButtonLabel(button, 'Saved');
      syncPlayerDownloadState();
      if (document.getElementById('libraryView').classList.contains('active')) loadLibrary();
    } else {
      hideDownloadProgressSoon();
      if (button) setActionButtonLabel(button, oldText || 'Download');
      showToast('Download: ' + res.error);
    }
  } catch (err) {
    hideDownloadProgressSoon();
    if (button) setActionButtonLabel(button, oldText || 'Download');
    showToast('Download: ' + err.message);
  } finally {
    if (button) button.disabled = false;
  }
}

function showDownloadProgress(percent, label = '') {
  if (downloadResetTimer) clearTimeout(downloadResetTimer);
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  downloadProgressWrap.classList.remove('hidden');
  downloadProgressFill.style.width = `${safe}%`;
  downloadProgressText.textContent = label && (label === 'Done' || label === 'Saved') ? label : `${Math.round(safe)}%`;
  if (safe >= 100) hideDownloadProgressSoon();
}

function hideDownloadProgressSoon() {
  if (downloadResetTimer) clearTimeout(downloadResetTimer);
  downloadResetTimer = setTimeout(() => {
    downloadProgressWrap.classList.add('hidden');
    downloadProgressFill.style.width = '0%';
    downloadProgressText.textContent = '0%';
  }, 1800);
}

if (window.echoAPI.onDownloadProgress) {
  window.echoAPI.onDownloadProgress((progress) => {
    if (!progress) return;
    showDownloadProgress(progress.percent || 0, progress.status || '');
  });
}

// ================= Lyrics =================
let lyricsRequest = 0, lyricLines = [], activeLyric = -1, lyricsQuery = null;
let lyricsAutoFollow = true;
let lyricAnimationFrame = 0;
let lyricsTimingOffsetSeconds = 0;
let lyricsTimingPrecision = 'catalog-synced';
// audio.currentTime is the authoritative media clock. Keep only tiny paint anticipation.
const LYRICS_RENDER_AHEAD_SECONDS = 0.04;
function lyricsPlaybackClock() {
  const exactVideoTiming = /^youtube/.test(lyricsTimingPrecision);
  const renderAhead = exactVideoTiming ? 0.012 : LYRICS_RENDER_AHEAD_SECONDS;
  return Math.max(0, Number(audioPlayer.currentTime || 0) + lyricsTimingOffsetSeconds + (Number(window.deepecchoLyricsOffsetMs || 0) + Number(window.deepecchoLyricsSongOffsetMs || 0)) / 1000 + renderAhead);
}
function applyLyricsTimingPayload(payload) {
  lyricsTimingPrecision = String(payload?.timingPrecision || 'catalog-synced');
  const raw = Number(payload?.rendererTimingOffsetSeconds || 0);
  lyricsTimingOffsetSeconds = Number.isFinite(raw) ? Math.max(-2.5, Math.min(2.5, raw)) : 0;
}
const lyricsTitleInput = document.getElementById('lyricsTitleInput');
const lyricsArtistInput = document.getElementById('lyricsArtistInput');
const lyricsSource = document.getElementById('lyricsSource');
const lyricsArtistMeta = document.getElementById('lyricsArtistMeta');
const lyricsVisualizerCanvas = document.getElementById('lyricsVisualizerCanvas');

function updateLyricsVisual(song = currentSong) {
  if (lyricsArtistMeta) lyricsArtistMeta.textContent = song?.channel || song?.artist || 'Play a song to see its lyrics here.';
}

let audioContext = null;
let audioAnalyser = null;
let audioStereoAnalysers = null;
let audioSourceNode = null;
let audioCaptureStream = null;
let audioAnalyserMediaKey = '';
let visualizerReconnectPending = false;
let visualizerLastReconnectAt = 0;
let visualizerSignalMisses = 0;
let visualizerReconnectAttempts = 0;
let visualizerLocalRecoveryPending = false;
let visualizerLocalRecoverySongId = '';
let visualizerVocalState = 0;
let visualizerVocalTransient = 0;
let visualizerFrequencyData = null;
let visualizerTimeData = null;
let visualizerFrame = 0;
let visualizerAngle = 0;
let visualizerZeroFrames = 0;
let visualizerFallbackPhase = 0; // retained as an audio-driven color phase; never used as fake music input.
let visualizerLastEnergy = 0;
let visualizerLastBass = 0;
let visualizerLastTreble = 0;
let visualizerPeak = 0;
let visualizerBloodDrops = [];
let visualizerSparkles = [];

// v1.4.4 Premium Real Audio Engine -------------------------------------------------
// The renderer is driven only by the actual captured PCM/FFT stream.  Quiet audio
// settles naturally; a missing analyser signal never becomes a fake sine/random beat.
let visualizerPrevSpectrum = null;
let visualizerSmoothedSpectrum = null;
let visualizerLastReadAt = -1;
let visualizerAudioSnapshot = null;
let visualizerFluxFloor = .018;
let visualizerBeatCooldownUntil = 0;
let visualizerBeatPulse = 0;
let visualizerTransientPulse = 0;
let visualizerBeatId = 0;
let visualizerLastBloodBeatId = -1;
let visualizerBloodSpawnIndex = 0;
let visualizerBandState = { subBass:0, bass:0, lowMid:0, mid:0, highMid:0, treble:0 };
let visualizerLastRms = 0;
let visualizerLastCentroid = 0;
let visualizerMusicPhase = 0;

const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
function visualizerSmooth(current, target, attack, release) {
  return current + (target - current) * (target > current ? attack : release);
}
function visualizerBinForHz(hz) {
  if (!audioAnalyser || !audioContext) return 0;
  return Math.max(0, Math.min(audioAnalyser.frequencyBinCount - 1, Math.round(hz * audioAnalyser.fftSize / audioContext.sampleRate)));
}
function visualizerBandAverage(minHz, maxHz, data = visualizerFrequencyData) {
  if (!data?.length || !audioAnalyser || !audioContext) return 0;
  const start = visualizerBinForHz(minHz), end = Math.max(start + 1, visualizerBinForHz(maxHz));
  let sum = 0, weight = 0;
  for (let i = start; i <= end && i < data.length; i++) {
    // Slight centre weighting gives a cleaner, less flickery band envelope.
    const t = (i - start) / Math.max(1, end - start);
    const w = .72 + .28 * Math.sin(t * Math.PI);
    sum += (data[i] / 255) * w; weight += w;
  }
  return weight ? clamp01(sum / weight) : 0;
}
function visualizerWaveSample(ratio = .5) {
  if (!visualizerTimeData?.length || visualizerZeroFrames > 10) return 0;
  const r = clamp01(ratio);
  const pos = r * (visualizerTimeData.length - 1);
  const i = Math.floor(pos), f = pos - i;
  const a = (visualizerTimeData[i] - 128) / 128;
  const b = (visualizerTimeData[Math.min(visualizerTimeData.length - 1, i + 1)] - 128) / 128;
  return a + (b - a) * f;
}

function getAudioAnalyserMediaKey() {
  return String(audioPlayer.currentSrc || audioPlayer.src || '');
}

function resetVisualizerSignalState() {
  visualizerZeroFrames = 0;
  visualizerSignalMisses = 0;
  visualizerReconnectAttempts = 0;
  visualizerLastReadAt = -1;
  visualizerAudioSnapshot = null;
  visualizerPrevSpectrum?.fill?.(0);
  visualizerSmoothedSpectrum?.fill?.(0);
  visualizerFrequencyData?.fill?.(0);
  visualizerTimeData?.fill?.(128);
  visualizerLastEnergy *= .28;
  visualizerVocalState *= .25;
  visualizerVocalTransient *= .2;
}

function setupAudioAnalyser(forceReconnect = false) {
  if (!lyricsVisualizerCanvas) return false;
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return false;
    if (!audioContext || audioContext.state === 'closed') audioContext = new AudioContextCtor({ latencyHint: 'interactive' });
    if (!audioAnalyser) {
      audioAnalyser = audioContext.createAnalyser();
      // 2048 gives enough resolution for vocal presence plus bass/treble detail.
      audioAnalyser.fftSize = 2048;
      audioAnalyser.smoothingTimeConstant = .36;
      audioAnalyser.minDecibels = -100;
      audioAnalyser.maxDecibels = -7;
    }

    const mediaKey = getAudioAnalyserMediaKey();
    if (audioSourceNode && !forceReconnect && audioAnalyserMediaKey === mediaKey) return true;
    if (typeof audioPlayer.captureStream !== 'function') throw new Error('Audio capture stream unavailable');

    // Chromium can keep captureStream() bound to an old media resource after src changes.
    // Capture a fresh stream for every track (and on self-heal) before disconnecting the old one.
    const freshStream = audioPlayer.captureStream();
    if (!freshStream) throw new Error('Audio capture stream unavailable');
    const freshSource = audioContext.createMediaStreamSource(freshStream);
    freshSource.connect(audioAnalyser);
    // Low-cost stereo meters use a parallel analysis-only splitter. It never touches playback output.
    try {
      const splitter = audioContext.createChannelSplitter(2);
      const left = audioContext.createAnalyser(), right = audioContext.createAnalyser();
      left.fftSize = right.fftSize = 512; left.smoothingTimeConstant = right.smoothingTimeConstant = .48;
      freshSource.connect(splitter); splitter.connect(left,0); splitter.connect(right,1);
      audioStereoAnalysers = { splitter, left, right, leftData:new Uint8Array(left.fftSize), rightData:new Uint8Array(right.fftSize) };
    } catch (_) { audioStereoAnalysers = null; }
    try { audioSourceNode?.disconnect?.(); } catch (_) {}
    audioSourceNode = freshSource;
    if (typeof smartEqNodes !== 'undefined' && smartEqNodes) freshSource.connect(smartEqNodes.filters[0]);
    audioCaptureStream = freshStream;
    audioAnalyserMediaKey = mediaKey;

    visualizerFrequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
    visualizerTimeData = new Uint8Array(audioAnalyser.fftSize);
    visualizerPrevSpectrum = new Float32Array(audioAnalyser.frequencyBinCount);
    visualizerSmoothedSpectrum = new Float32Array(audioAnalyser.frequencyBinCount);
    resetVisualizerSignalState();
    return true;
  } catch (error) {
    console.warn('[visualizer] analyser unavailable:', error?.message || error);
    return false;
  }
}

async function resumeAudioAnalyser(forceReconnect = false) {
  setupAudioAnalyser(forceReconnect);
  try {
    if (audioContext?.state === 'suspended') await audioContext.resume();
  } catch (_) {}
}

function visualizerSurfaceIsVisible() {
  const lyricsView = document.getElementById('lyricsView');
  const immersive = document.getElementById('immersivePlayer');
  return !!lyricsView?.classList.contains('active') || (!!immersive && !immersive.classList.contains('hidden'));
}

async function requestVisualizerLocalRecovery(reason = 'zero-pcm') {
  if (visualizerLocalRecoveryPending || !visualizerSurfaceIsVisible()) return;
  if (!currentSong?.id || !currentSong?.streamUrl || currentSong?.fileUrl || currentSong?.filepath) return;
  if (!window.echoAPI?.prepareCompatiblePlayback) return;
  const expectedId = String(currentSong.id);
  // One background materialization per track. Playback keeps running while it is prepared.
  if (visualizerLocalRecoverySongId === expectedId) return;
  visualizerLocalRecoveryPending = true;
  visualizerLocalRecoverySongId = expectedId;
  try {
    const fallback = await window.echoAPI.prepareCompatiblePlayback(normalizeSong(currentSong));
    if (!fallback?.success || !fallback.fileUrl || String(currentSong?.id || '') !== expectedId) return;
    const shouldResume = !audioPlayer.paused && !audioPlayer.ended;
    const resumeAt = Math.max(0, Number(audioPlayer.currentTime || 0));
    // Switch only after the local compatibility audio is fully ready. This gives Chromium
    // an origin-safe PCM path, which makes captureStream reliable for every track.
    audioPlayer.src = fallback.fileUrl;
    audioAnalyserMediaKey = '';
    currentSong = { ...currentSong, filepath:fallback.filepath || '', fileUrl:fallback.fileUrl, streamUrl:'' };
    resetVisualizerSignalState();
    await new Promise(resolve => {
      if (audioPlayer.readyState >= 1) return resolve();
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(timer); audioPlayer.removeEventListener('loadedmetadata', finish); resolve(); };
      const timer = setTimeout(finish, 1800);
      audioPlayer.addEventListener('loadedmetadata', finish, { once:true });
      try { audioPlayer.load(); } catch (_) {}
    });
    if (Number.isFinite(audioPlayer.duration) && audioPlayer.duration > 0) {
      try { audioPlayer.currentTime = Math.min(resumeAt, Math.max(0, audioPlayer.duration - .15)); } catch (_) {}
    }
    await resumeAudioAnalyser(true);
    // Re-arm both visualizer loops immediately after the source swap. The play event
    // normally does this too, but an explicit restart keeps recovery reliable when
    // Chromium preserves the playing state without emitting a fresh play event.
    startLyricsVisualizer();
    startAudioEnergyTicker();
    if (shouldResume) { try { await audioPlayer.play(); } catch (_) {} }
    console.debug?.('[visualizer] local PCM recovery active:', reason);
  } catch (error) {
    console.debug?.('[visualizer] local PCM recovery skipped:', error?.message || error);
  } finally {
    visualizerLocalRecoveryPending = false;
  }
}

function requestVisualizerReconnect(reason = 'signal-lost') {
  const now = performance.now();
  if (visualizerReconnectPending || now - visualizerLastReconnectAt < 1100) return;
  visualizerReconnectPending = true;
  visualizerLastReconnectAt = now;
  visualizerReconnectAttempts++;
  Promise.resolve().then(async () => {
    try {
      await resumeAudioAnalyser(true);
      console.debug?.('[visualizer] capture reconnected:', reason);
      // captureStream can expose a silent track for some remote googlevideo resources.
      // After two clean recaptures still produce zero PCM, prepare an origin-safe local
      // compatibility source in the background and preserve the exact play position.
      if (visualizerReconnectAttempts >= 2) requestVisualizerLocalRecovery(reason);
    } catch (_) {}
    visualizerReconnectPending = false;
  });
}
function readAudioEnergy() {
  const now = performance.now();
  // drawLyricsVisualizer + the background ticker can request the same frame.  Cache it
  // briefly so spectral-flux/beat detection is measured once, not double-counted.
  if (visualizerAudioSnapshot && now - visualizerLastReadAt < 7) return visualizerAudioSnapshot;
  visualizerLastReadAt = now;

  const playing = !!audioPlayer.src && !audioPlayer.paused && !audioPlayer.ended;
  const volume = audioPlayer.muted ? 0 : Number(audioPlayer.volume ?? 1);
  let hasSignal = false, rms = 0, waveformPeak = 0, spectralFlux = 0, centroid = 0, stereoLeft = 0, stereoRight = 0;
  let raw = { subBass:0, bass:0, lowMid:0, mid:0, highMid:0, treble:0 };

  if (audioAnalyser && playing && visualizerFrequencyData && visualizerTimeData) {
    audioAnalyser.getByteFrequencyData(visualizerFrequencyData);
    audioAnalyser.getByteTimeDomainData(visualizerTimeData);

    let sq = 0;
    for (let i = 0; i < visualizerTimeData.length; i++) {
      const v = (visualizerTimeData[i] - 128) / 128;
      sq += v * v; waveformPeak = Math.max(waveformPeak, Math.abs(v));
    }
    rms = Math.sqrt(sq / Math.max(1, visualizerTimeData.length));

    const usefulStart = visualizerBinForHz(25), usefulEnd = visualizerBinForHz(16500);
    let positiveDiff = 0, diffWeight = 0, vocalPositiveDiff = 0, vocalDiffWeight = 0, magnitudeSum = 0, weightedHz = 0;
    for (let i = usefulStart; i <= usefulEnd && i < visualizerFrequencyData.length; i++) {
      const v = visualizerFrequencyData[i] / 255;
      const prev = visualizerPrevSpectrum?.[i] || 0;
      const diff = Math.max(0, v - prev);
      // Overall transient detector plus a second detector focused on the human-vocal region.
      const hz = i * audioContext.sampleRate / audioAnalyser.fftSize;
      const w = hz < 220 ? 1.12 : hz < 4300 ? 1.18 : .76;
      positiveDiff += diff * w; diffWeight += w;
      const vocalW = hz < 180 || hz > 4800 ? 0 : hz < 420 ? .55 : hz < 3200 ? 1.48 : .88;
      if (vocalW) { vocalPositiveDiff += diff * vocalW; vocalDiffWeight += vocalW; }
      magnitudeSum += v; weightedHz += hz * v;
      if (visualizerPrevSpectrum) visualizerPrevSpectrum[i] = v;
    }
    spectralFlux = diffWeight ? positiveDiff / diffWeight : 0;
    const vocalFlux = vocalDiffWeight ? vocalPositiveDiff / vocalDiffWeight : 0;
    visualizerVocalTransient = Math.max(visualizerVocalTransient * .78, clamp01(vocalFlux * 10.5));
    centroid = magnitudeSum > .001 ? clamp01((weightedHz / magnitudeSum - 80) / 10000) : 0;

    raw = {
      subBass: visualizerBandAverage(24, 62),
      bass: visualizerBandAverage(62, 190),
      lowMid: visualizerBandAverage(190, 520),
      mid: visualizerBandAverage(520, 2100),
      highMid: visualizerBandAverage(2100, 6200),
      treble: visualizerBandAverage(6200, 16000)
    };
    // Voice-priority envelope: not source separation, but it intentionally weights the
    // speech/singing formant + presence range much more than backing bass.
    const vocalLow = visualizerBandAverage(220, 520);
    const vocalCore = visualizerBandAverage(520, 1800);
    const vocalPresence = visualizerBandAverage(1800, 4300);
    const vocalRaw = clamp01(vocalLow * .22 + vocalCore * .50 + vocalPresence * .28);
    const vocalContrast = Math.max(0, vocalRaw - (raw.subBass * .14 + raw.bass * .18 + raw.treble * .08));
    const vocalTarget = clamp01(Math.pow(vocalRaw, .76) * 1.24 + vocalContrast * .72 + visualizerVocalTransient * .13);
    visualizerVocalState = visualizerSmooth(visualizerVocalState, vocalTarget, .54, .085);
    hasSignal = rms > .0025 || Math.max(...Object.values(raw)) > .008;
    if (hasSignal) visualizerReconnectAttempts = 0;
    visualizerZeroFrames = hasSignal ? 0 : visualizerZeroFrames + 1;
    visualizerSignalMisses = hasSignal ? 0 : visualizerSignalMisses + 1;
    if (!hasSignal && visualizerSignalMisses > 38) {
      visualizerSignalMisses = 0;
      requestVisualizerReconnect('playing-with-zero-pcm');
    }

    // Per-bin musical envelope: fast attack on hits, slower release in calm passages.
    if (visualizerSmoothedSpectrum) {
      const loudDrive = clamp01(rms * 3.2 + raw.bass * .45 + spectralFlux * 5.5);
      for (let i = usefulStart; i <= usefulEnd && i < visualizerFrequencyData.length; i++) {
        const target = visualizerFrequencyData[i] / 255;
        const cur = visualizerSmoothedSpectrum[i] || 0;
        const attack = .34 + loudDrive * .48;
        const release = .055 + loudDrive * .16;
        visualizerSmoothedSpectrum[i] = visualizerSmooth(cur, target, attack, release);
      }
    }
  } else if (playing) {
    visualizerZeroFrames++;
    visualizerSignalMisses++;
    if (visualizerSignalMisses > 24) { visualizerSignalMisses = 0; requestVisualizerReconnect('missing-analyser'); }
  }

  // No fake fallback music.  If Chromium cannot expose PCM for a remote source the
  // visualizer settles to an idle state rather than pretending to follow a beat.
  if (!hasSignal) {
    rms = 0; waveformPeak = 0; spectralFlux = 0; centroid = visualizerLastCentroid * .96;
    raw = { subBass:0, bass:0, lowMid:0, mid:0, highMid:0, treble:0 };
    visualizerVocalState *= .90;
    visualizerVocalTransient *= .78;
  }

  const bandDrive = (v) => clamp01(Math.pow(Math.max(0, v), .78) * 1.18 * volume);
  const targets = Object.fromEntries(Object.entries(raw).map(([k,v]) => [k, bandDrive(v)]));
  // Loud sections snap to the signal; quiet sections breathe down slowly and smoothly.
  const rawRms = clamp01((rms - .006) * 3.9) * volume;
  const rawSpectral = clamp01((targets.subBass*.08 + targets.bass*.13 + targets.lowMid*.16 + targets.mid*.25 + targets.highMid*.23 + targets.treble*.15));
  const rawEnergy = clamp01(rawRms * .34 + rawSpectral * .38 + visualizerVocalState * .58);

  const fluxTarget = clamp01(spectralFlux * 8.0);
  visualizerFluxFloor = visualizerFluxFloor * .965 + spectralFlux * .035;
  const fluxThreshold = Math.max(.016, visualizerFluxFloor * 1.85 + .006);
  const bassHit = targets.subBass * .5 + targets.bass * .5;
  const rmsRise = Math.max(0, rawRms - visualizerLastRms);
  const transientRaw = clamp01(fluxTarget * .72 + rmsRise * 2.2 + Math.max(0, waveformPeak - rms * 1.45) * .32);
  const isBeat = hasSignal && now >= visualizerBeatCooldownUntil && spectralFlux > fluxThreshold && bassHit > .13 && transientRaw > .17;
  if (isBeat) {
    visualizerBeatCooldownUntil = now + 105;
    visualizerBeatPulse = Math.max(visualizerBeatPulse, clamp01(.52 + bassHit * .45 + transientRaw * .36));
    visualizerBeatId++;
  }
  visualizerTransientPulse = Math.max(visualizerTransientPulse * .80, transientRaw);
  visualizerBeatPulse *= .84;
  if (!playing || !hasSignal) { visualizerBeatPulse *= .72; visualizerTransientPulse *= .72; }

  const aggressionTarget = clamp01(rawEnergy * .46 + bassHit * .12 + visualizerVocalTransient * .30 + visualizerTransientPulse * .37 + visualizerBeatPulse * .34);
  const energyAttack = rawEnergy > visualizerLastEnergy ? (.38 + aggressionTarget * .34) : (.075 + rawEnergy * .08);
  visualizerLastEnergy = visualizerSmooth(visualizerLastEnergy, rawEnergy, energyAttack, .07 + rawEnergy * .08);

  for (const k of Object.keys(visualizerBandState)) {
    const target = targets[k] || 0, current = visualizerBandState[k] || 0;
    const attack = .36 + aggressionTarget * .40;
    const release = .07 + aggressionTarget * .10;
    visualizerBandState[k] = visualizerSmooth(current, target, attack, release);
  }
  visualizerLastBass = visualizerBandState.bass;
  visualizerLastTreble = visualizerBandState.treble;
  visualizerPeak = Math.max(visualizerBeatPulse, visualizerTransientPulse, visualizerPeak * .89);
  visualizerLastRms = rawRms;
  visualizerLastCentroid = visualizerSmooth(visualizerLastCentroid, centroid, .22, .08);

  const midBody = (visualizerBandState.lowMid + visualizerBandState.mid) * .5;
  const trebleBody = (visualizerBandState.highMid + visualizerBandState.treble) * .5;
  const motion = clamp01(visualizerLastEnergy * .28 + visualizerVocalState * .46 + midBody * .18 + trebleBody * .10 + visualizerVocalTransient * .28 + visualizerTransientPulse * .30 + visualizerBeatPulse * .24);
  const aggression = clamp01(aggressionTarget * .68 + visualizerTransientPulse * .38 + visualizerBeatPulse * .34);

  if (window.__dinechoVisualizerMode === 'stereo' && audioStereoAnalysers && playing) {
    try {
      const meter = (analyser,data) => { analyser.getByteTimeDomainData(data); let sum=0; for(let i=0;i<data.length;i++){const v=(data[i]-128)/128;sum+=v*v;} return clamp01(Math.sqrt(sum/Math.max(1,data.length))*3.4); };
      stereoLeft = meter(audioStereoAnalysers.left,audioStereoAnalysers.leftData);
      stereoRight = meter(audioStereoAnalysers.right,audioStereoAnalysers.rightData);
      // Some mono sources expose only channel 0; mirror it instead of showing a fake dead right channel.
      if (stereoLeft > .006 && stereoRight < .0015) stereoRight = stereoLeft;
    } catch (_) {}
  }

  visualizerAudioSnapshot = {
    energy: visualizerLastEnergy,
    bass: visualizerBandState.bass,
    treble: visualizerBandState.treble,
    subBass: visualizerBandState.subBass,
    lowMid: visualizerBandState.lowMid,
    mid: visualizerBandState.mid,
    highMid: visualizerBandState.highMid,
    vocal: visualizerVocalState,
    vocalTransient: visualizerVocalTransient,
    rms: rawRms,
    waveformPeak: clamp01(waveformPeak * 1.4),
    flux: fluxTarget,
    transient: visualizerTransientPulse,
    beat: isBeat,
    beatPulse: visualizerBeatPulse,
    beatId: visualizerBeatId,
    aggression,
    motion,
    centroid: visualizerLastCentroid,
    peak: visualizerPeak,
    stereoLeft, stereoRight,
    hasSignal,
    playing
  };
  window.__dinechoAudioEnergy = visualizerAudioSnapshot;
  return visualizerAudioSnapshot;
}

function getVisualizerThemeSpec(theme = document.body.dataset.theme || 'golden') {
  const specs = {
    golden: { mode: 'sphere', h1: 38, h2: 49, h3: 30, glow: 'rgba(255,190,70,.34)', core: 'rgba(255,197,85,.18)', ray: 'rgba(255,191,73,', speed: 1.0, rays: 128 },
    light: { mode: 'sphere', h1: 34, h2: 43, h3: 24, glow: 'rgba(184,132,54,.24)', core: 'rgba(213,164,84,.15)', ray: 'rgba(180,128,46,', speed: .85, rays: 112 },
    dark: { mode: 'sphere', h1: 205, h2: 220, h3: 196, glow: 'rgba(160,190,225,.22)', core: 'rgba(159,187,219,.13)', ray: 'rgba(154,186,220,', speed: .82, rays: 120 },
    purple: { mode: 'electric', h1: 265, h2: 282, h3: 244, glow: 'rgba(177,104,255,.34)', core: 'rgba(167,91,255,.18)', ray: 'rgba(177,110,255,', speed: 1.18, rays: 132 },
    toxic: { mode: 'toxic', h1: 132, h2: 111, h3: 151, glow: 'rgba(72,255,118,.34)', core: 'rgba(61,255,105,.17)', ray: 'rgba(76,255,122,', speed: 1.28, rays: 144 },
    blood: { mode: 'blood', h1: 350, h2: 2, h3: 338, glow: 'rgba(255,41,78,.38)', core: 'rgba(189,9,45,.22)', ray: 'rgba(235,35,69,', speed: .92, rays: 104 },
    silver: { mode: 'sphere', h1: 205, h2: 216, h3: 194, glow: 'rgba(223,239,255,.34)', core: 'rgba(220,235,249,.17)', ray: 'rgba(219,237,255,', speed: .9, rays: 124 },
    transparent: { mode: 'sphere', h1: 224, h2: 238, h3: 202, glow: 'rgba(185,204,255,.3)', core: 'rgba(180,201,255,.14)', ray: 'rgba(185,205,255,', speed: .88, rays: 120 },
    fluids: { mode: 'fluid', h1: 190, h2: 278, h3: 157, glow: 'rgba(75,220,255,.34)', core: 'rgba(69,210,255,.15)', ray: 'rgba(80,220,255,', speed: 1.08, rays: 136 },
    rgb: { mode: 'rgb', h1: 0, h2: 360, h3: 210, glow: 'rgba(114,215,255,.34)', core: 'rgba(255,255,255,.12)', ray: 'rgba(120,220,255,', speed: 1.42, rays: 168 },
    love: { mode: 'love', h1: 330, h2: 395, h3: 285, glow: 'rgba(255,91,183,.38)', core: 'rgba(255,126,193,.16)', ray: 'rgba(255,100,190,', speed: 1.24, rays: 148 },
    space: { mode: 'space', h1: 207, h2: 276, h3: 318, glow: 'rgba(84,170,255,.42)', core: 'rgba(168,111,255,.18)', ray: 'rgba(111,193,255,', speed: 1.12, rays: 156 }
  };
  return specs[theme] || specs.golden;
}

function visualizerSpectrumSample(ratio, audio) {
  if (!audioAnalyser || !visualizerSmoothedSpectrum || visualizerZeroFrames > 10 || !audio?.hasSignal) return 0;
  // Logarithmic frequency mapping mirrors human hearing: more geometry is devoted to
  // bass/mids while still retaining crisp high-frequency detail.
  const r = clamp01(ratio);
  const minHz = 28, maxHz = Math.min(16500, audioContext.sampleRate * .45);
  const hz = minHz * Math.pow(maxHz / minHz, r);
  const center = visualizerBinForHz(hz);
  const spread = Math.max(1, Math.round(1 + r * 3));
  let sum = 0, weight = 0;
  for (let i = -spread; i <= spread; i++) {
    const idx = Math.max(0, Math.min(visualizerSmoothedSpectrum.length - 1, center + i));
    const w = spread + 1 - Math.abs(i);
    sum += visualizerSmoothedSpectrum[idx] * w; weight += w;
  }
  return weight ? clamp01(Math.pow(sum / weight, .88) * 1.12) : 0;
}

function spawnBloodVisualizerDrop(cx, cy, sphereR, audio) {
  if (!audio.playing || !audio.hasSignal || audio.beatId === visualizerLastBloodBeatId || audio.beatPulse < .28) return;
  visualizerLastBloodBeatId = audio.beatId;
  const count = 1 + Math.floor(audio.aggression * 2.2);
  for (let n = 0; n < count && visualizerBloodDrops.length < 28; n++) {
    // Golden-angle placement is deterministic; spawning itself is triggered by a real beat.
    const i = visualizerBloodSpawnIndex++;
    const a = (i * 2.399963229728653 + audio.centroid * 2.1) % (Math.PI * 2);
    const edge = .79 + ((i * 37) % 17) / 100;
    const speed = sphereR * (.006 + audio.beatPulse * .015 + audio.transient * .008);
    const burst = 1.45 + ((i * 13) % 9) * .16;
    visualizerBloodDrops.push({
      x: cx + Math.cos(a) * sphereR * edge,
      y: cy + Math.sin(a) * sphereR * edge,
      vx: Math.cos(a) * speed * burst,
      vy: Math.sin(a) * speed * burst + speed * .65,
      r: 1.6 + ((i * 7) % 5) * .72 + audio.beatPulse * 2.6,
      life: 1,
      stretch: 1.25 + ((i * 11) % 7) * .18
    });
  }
}

function drawBloodVisualizerDrops(ctx, dpr, cx, cy, sphereR, audio) {
  spawnBloodVisualizerDrop(cx, cy, sphereR, audio);
  for (let i = visualizerBloodDrops.length - 1; i >= 0; i--) {
    const d = visualizerBloodDrops[i];
    d.x += d.vx; d.y += d.vy; d.vy += .045 * dpr; d.life -= .018;
    if (d.life <= 0) { visualizerBloodDrops.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = d.life * .75;
    ctx.fillStyle = '#d40d3d';
    ctx.shadowColor = '#ff315f'; ctx.shadowBlur = 8 * dpr;
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * dpr, d.r * d.stretch * dpr, Math.atan2(d.vy, d.vx) - Math.PI / 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}


function drawVisualizerHeart(ctx, x, y, size, color, alpha = 1, rotation = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(size / 32, size / 32);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-19, -3, -17, -18, -7, -18);
  ctx.bezierCurveTo(-1, -18, 0, -12, 0, -9);
  ctx.bezierCurveTo(0, -12, 1, -18, 7, -18);
  ctx.bezierCurveTo(17, -18, 19, -3, 0, 10);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawThemeAccent(ctx, spec, cx, cy, sphereR, audio, dpr, safeOuterR = Infinity) {
  const safeR = (value, pad = 0) => Math.max(0, Math.min(value, safeOuterR - pad));
  if (!audio.hasSignal) return;
  const kick = audio.beatPulse;
  const hit = audio.transient;
  const body = audio.lowMid * .18 + audio.mid * .28 + (audio.vocal || 0) * .54;
  const air = (audio.highMid + audio.treble) * .5;
  const phase = visualizerMusicPhase;

  if (spec.mode === 'rgb') {
    ctx.save(); ctx.translate(cx, cy); ctx.globalCompositeOperation = 'lighter';
    const bands = 5;
    for (let band = 0; band < bands; band++) {
      ctx.beginPath();
      const points = 150;
      for (let i = 0; i <= points; i++) {
        const ratio = i / points, a = ratio * Math.PI * 2;
        const spectrum = visualizerSpectrumSample((ratio + band*.025) % 1, audio);
        const wave = visualizerWaveSample((ratio * .84 + band*.071) % 1);
        const wobble = wave * (5 + body * 20 + hit * 18) * dpr;
        const rr = safeR(sphereR * (1.02 + band * .042 + kick*.018) + wobble + spectrum * (15 + audio.aggression*22) * dpr, 10*dpr);
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      const hue = (phase * 85 + band * 72) % 360;
      ctx.strokeStyle = `hsla(${hue},100%,68%,${.055 + audio.energy*.10 + hit*.12})`;
      ctx.lineWidth = (4.6 - band*.6 + hit*1.4) * dpr; ctx.stroke();
    }
    ctx.restore();
  } else if (spec.mode === 'love') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const count = 16;
    for (let i = 0; i < count; i++) {
      const ratio = i / count;
      const spectrum = visualizerSpectrumSample(ratio, audio);
      const wave = visualizerWaveSample((ratio*.91+.08)%1);
      const a = ratio * Math.PI * 2 + visualizerAngle * (i % 2 ? -.8 : 1.05) + wave*hit*.13;
      const rr = safeR(sphereR * (1.08 + kick*.06) + spectrum * (18 + audio.aggression*28) * dpr + wave*body*8*dpr, 24*dpr);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      const hue = (322 + i * 19 + phase * 34 + air*18) % 360;
      const size = (7 + spectrum*10 + kick*10 + air*4) * dpr;
      ctx.shadowColor = `hsla(${hue},100%,65%,.75)`; ctx.shadowBlur = (9 + hit*12) * dpr;
      drawVisualizerHeart(ctx,x,y,size,`hsla(${hue},100%,68%,${.18+spectrum*.50+hit*.12})`,.95,a+Math.PI/2);
    }
    ctx.restore();
  } else if (spec.mode === 'space') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      const points = 180;
      for (let i = 0; i <= points; i++) {
        const ratio=i/points,a=ratio*Math.PI*2;
        const spectrum=visualizerSpectrumSample((ratio+ring*.04)%1,audio);
        const wave=visualizerWaveSample((ratio*.78+ring*.13)%1);
        const rr=safeR(sphereR*(1.04+ring*.075+kick*.014)+wave*(3+body*13+hit*12)*dpr+spectrum*(10+audio.aggression*18)*dpr,12*dpr);
        const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr*(.86+ring*.025);
        i?ctx.lineTo(x,y):ctx.moveTo(x,y);
      }
      ctx.closePath();
      const hue=202+ring*36+audio.centroid*18;
      ctx.strokeStyle=`hsla(${hue},100%,72%,${.045+audio.energy*.12+hit*.13})`;
      ctx.lineWidth=(1.1+ring*.65+air*1.8+hit*1.2)*dpr;
      ctx.shadowColor=`hsla(${hue},100%,72%,.5)`;ctx.shadowBlur=(7+audio.energy*10+hit*14)*dpr;ctx.stroke();
    }
    const stars=18;
    for(let i=0;i<stars;i++){
      const ratio=i/stars,sample=visualizerSpectrumSample(ratio,audio),wave=visualizerWaveSample((ratio+.19)%1);
      const a=ratio*Math.PI*2+visualizerAngle*(i%2?-.55:.72)+wave*hit*.12;
      const rr=safeR(sphereR*(1.1+(i%4)*.055+kick*.025)+sample*(16+audio.aggression*24)*dpr,14*dpr);
      const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
      const size=(1.1+sample*2.5+air*2.0+hit*1.5)*dpr,hue=195+(i%5)*27;
      ctx.fillStyle=`hsla(${hue},100%,82%,${.22+sample*.55+hit*.16})`;ctx.shadowColor=`hsla(${hue},100%,72%,.85)`;ctx.shadowBlur=(7+hit*10)*dpr;ctx.fillRect(x-size/2,y-size/2,size,size);
    }
    ctx.restore();
  } else if (spec.mode === 'electric') {
    ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';
    for(let branch=0;branch<3;branch++){
      const baseA=visualizerAngle*(1.5+branch*.18)+branch*2.1;
      ctx.strokeStyle=`hsla(${spec.h1+branch*11},100%,72%,${.055+air*.16+hit*.22})`;ctx.lineWidth=(.9+air*1.3+hit*1.5)*dpr;ctx.beginPath();
      for(let j=0;j<=10;j++){
        const ratio=(branch*.23+j/10*.63)%1,spectrum=visualizerSpectrumSample(ratio,audio),wave=visualizerWaveSample(ratio);
        const a=baseA+j*.075+wave*(.035+hit*.11);
        const r=safeR(sphereR*(.52+j*.072)+spectrum*(8+hit*24)*dpr,8*dpr);
        const x=Math.cos(a)*r,y=Math.sin(a)*r;j?ctx.lineTo(x,y):ctx.moveTo(x,y);
      }ctx.stroke();
    }ctx.restore();
  } else if (spec.mode === 'toxic') {
    ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';
    const count=20;
    for(let i=0;i<count;i++){
      const ratio=i/count,sample=visualizerSpectrumSample(ratio,audio),wave=Math.abs(visualizerWaveSample((ratio+.31)%1));
      const a=ratio*Math.PI*2+visualizerAngle*.8;
      const r=safeR(sphereR*(1.02+sample*.09+kick*.04)+wave*hit*13*dpr,16*dpr);
      const rr=(1.8+sample*4+audio.bass*2.5+hit*2.2)*dpr;
      ctx.fillStyle=`hsla(${spec.h1+sample*28},100%,65%,${.06+sample*.18+hit*.10})`;ctx.shadowColor=`hsla(${spec.h1},100%,60%,.55)`;ctx.shadowBlur=(8+hit*12)*dpr;ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,rr,0,Math.PI*2);ctx.fill();
    }ctx.restore();
  } else if (spec.mode === 'fluid') {
    ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';
    for(let layer=0;layer<3;layer++){
      ctx.beginPath();const pts=112;
      for(let i=0;i<=pts;i++){
        const ratio=i/pts,a=ratio*Math.PI*2,spectrum=visualizerSpectrumSample((ratio+layer*.035)%1,audio),wave=visualizerWaveSample((ratio*.92+layer*.17)%1);
        const amp=(5+body*17+hit*21)*dpr;
        const rr=safeR(sphereR*(1.02+layer*.035+kick*.018)+wave*amp+spectrum*(8+audio.aggression*18)*dpr,12*dpr);
        const x=Math.cos(a)*rr,y=Math.sin(a)*rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y);
      }ctx.closePath();ctx.strokeStyle=`hsla(${[spec.h1,spec.h2,spec.h3][layer]},100%,68%,${.055+audio.energy*.10+hit*.12})`;ctx.lineWidth=(4.6-layer*.9+hit*1.2)*dpr;ctx.stroke();
    }ctx.restore();
  }
}

let visualizerLastPaintAt = 0;
function visualizerQualityConfig() {
  const q = String(window.__dinechoVisualizerQuality || 'balanced');
  return q === 'eco' ? {fps:30,dpr:1,detail:.60} : q === 'high' ? {fps:50,dpr:1.65,detail:.90} : q === 'ultra' ? {fps:60,dpr:2,detail:1} : {fps:40,dpr:1.35,detail:.76};
}
function drawLyricsVisualizer() {
  visualizerFrame = 0;
  if (window.__deepecchoGameMode) {
    setTimeout(() => { if (!visualizerFrame) visualizerFrame = requestAnimationFrame(drawLyricsVisualizer); }, 500);
    return;
  }
  visualizerFrame = requestAnimationFrame(drawLyricsVisualizer);
  if (!lyricsVisualizerCanvas) return;
  const lyricsView = document.getElementById('lyricsView');
  const immersive = document.getElementById('immersivePlayer');
  const immersiveCanvas = document.getElementById('immersiveVisualizerCanvas');
  const immersiveOpen = !!immersiveCanvas && !!immersive && !immersive.classList.contains('hidden');
  const lyricsOpen = !!lyricsView?.classList.contains('active');
  if (!immersiveOpen && !lyricsOpen) return;
  const quality = visualizerQualityConfig();
  const paintNow = performance.now();
  if (paintNow - visualizerLastPaintAt < (1000 / quality.fps)) return;
  visualizerLastPaintAt = paintNow;

  // A single audio-reactive renderer follows whichever surface is visible.
  // Immersive gets priority while fullscreen so it always inherits the exact
  // selected theme visualizer without duplicating analyser/audio nodes.
  const targetCanvas = immersiveOpen ? immersiveCanvas : lyricsVisualizerCanvas;
  const ctx = targetCanvas.getContext('2d');
  const rect = targetCanvas.getBoundingClientRect();
  const dpr = Math.min(quality.dpr, window.devicePixelRatio || 1);
  const targetW = Math.max(320, Math.round(rect.width * dpr));
  const targetH = Math.max(320, Math.round(rect.height * dpr));
  if (targetCanvas.width !== targetW || targetCanvas.height !== targetH) {
    targetCanvas.width = targetW;
    targetCanvas.height = targetH;
  }
  const w = targetCanvas.width, h = targetCanvas.height;
  const cx = w / 2, cy = h / 2;
  ctx.clearRect(0, 0, w, h);

  const audio = readAudioEnergy();
  const theme = document.body.dataset.theme || 'golden';
  const spec = getVisualizerThemeSpec(theme);
  if (theme === 'dragon' && window.drawDeepEchoDragon) { window.drawDeepEchoDragon({ctx,w,h,dpr,audio,spectrumSample:visualizerSpectrumSample}); return; }
  const selectedMode = String(window.__dinechoVisualizerMode || 'theme');
  if (selectedMode !== 'theme' && typeof window.__deepecchoDrawVisualizerMode === 'function') {
    const handled = window.__deepecchoDrawVisualizerMode({ ctx, canvas:targetCanvas, w, h, cx, cy, dpr, audio, spec, mode:selectedMode, quality, spectrumSample:visualizerSpectrumSample, waveSample:visualizerWaveSample });
    if (handled) return;
  }
  // Motion speed and vibration are derived from the music itself. No independent
  // timer oscillator drives geometry anymore.
  if (audio.playing && audio.hasSignal) {
    visualizerMusicPhase += (.002 + audio.motion*.022 + audio.centroid*.006) * spec.speed;
    visualizerAngle += (.00045 + audio.motion*.0065 + audio.treble*.003 + audio.transient*.0045) * spec.speed;
  }
  visualizerFallbackPhase = visualizerMusicPhase;
  const bassKick = audio.beatPulse * (.55 + audio.subBass*.45);
  const vocalDrive = audio.vocal || 0, vocalHit = audio.vocalTransient || 0;
  const bodyPulse = audio.lowMid*.16 + audio.mid*.22 + vocalDrive*.48;
  const compactLyricsSurface = targetCanvas === lyricsVisualizerCanvas;
  // Lyrics uses a physically larger transparent canvas but a smaller content radius. This
  // creates true overscan instead of visually shrinking loud peaks at the old square edge.
  const baseScale = compactLyricsSurface ? .168 : .222;
  const safeOuterRadius = Math.max(90*dpr, Math.min(w,h)*.465);
  const baseR = Math.min(w, h) * (baseScale + audio.bass*.014 + bodyPulse*.014);
  const rawSphereR = baseR * (1 + audio.energy*.060 + vocalDrive*.055 + bassKick*.070 + audio.transient*.022 + vocalHit*.026);
  const sphereR = Math.min(rawSphereR, safeOuterRadius*.59);
  const shakeLimit = Math.max(2*dpr, (safeOuterRadius-sphereR)*.055);
  const shakeX = Math.max(-shakeLimit,Math.min(shakeLimit,visualizerWaveSample(.137) * (audio.transient*.65 + vocalHit*.75) * (3 + audio.aggression*8) * dpr));
  const shakeY = Math.max(-shakeLimit,Math.min(shakeLimit,visualizerWaveSample(.613) * (audio.transient*.58 + vocalHit*.78) * (2.5 + audio.aggression*7) * dpr));
  const renderCx = cx + shakeX, renderCy = cy + shakeY;

  // Soft theme-colored aura behind the geometry.
  const aura = ctx.createRadialGradient(renderCx, renderCy, sphereR * .15, renderCx, renderCy, sphereR * 1.42);
  aura.addColorStop(0, spec.core);
  aura.addColorStop(.46, spec.glow.replace(/\.[0-9]+\)$/, `${.08 + audio.energy * .12})`));
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(renderCx, renderCy, sphereR * (1.40 + audio.beatPulse*.10), 0, Math.PI * 2); ctx.fill();

  // Audio-reactive outer spectrum. Theme determines whether it is soft, toxic, electric or blood-like.
  ctx.save(); ctx.translate(renderCx, renderCy); ctx.globalCompositeOperation = 'lighter';
  const rays = Math.max(72, Math.round(spec.rays * quality.detail));
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const sample = visualizerSpectrumSample(i / rays, audio);
    const waveform = visualizerWaveSample((i / rays * .91 + .045) % 1);
    const bandAccent = i / rays < .24 ? audio.bass : i / rays < .76 ? Math.max(audio.mid, vocalDrive) : audio.treble;
    const harmonic = Math.abs(waveform) * (.35 + audio.transient*.65);
    const vocalZone = i / rays > .22 && i / rays < .78 ? vocalDrive : vocalDrive*.18;
    const reactive = Math.min(1, sample * (1.02 + audio.aggression*.48) + bandAccent*.12 + vocalZone*.24 + harmonic*.15 + audio.beatPulse*.07 + vocalHit*.12);
    const inner = sphereR * (1.025 + (spec.mode === 'blood' ? waveform * audio.transient * .022 : waveform * audio.transient*.006));
    let length = (5 + reactive * (36 + audio.aggression*54) + bassKick * 24 + vocalDrive*22 + vocalHit*24 + audio.transient*14) * dpr;
    if (spec.mode === 'toxic') length *= .9 + harmonic * .45;
    if (spec.mode === 'blood') length *= .54 + reactive * .45;
    if (spec.mode === 'rgb') length *= 1.05 + harmonic * .22;
    if (spec.mode === 'love') length *= .72 + harmonic * .3;
    if (spec.mode === 'space') length *= .82 + harmonic * .34;
    const outer = Math.min(inner + length, safeOuterRadius - 10*dpr);
    if (spec.mode === 'rgb') {
      const rayHue = (i / rays * 360 + visualizerMusicPhase * 85 + audio.centroid*45) % 360;
      ctx.strokeStyle = `hsla(${rayHue},100%,67%,${.055 + reactive * .31})`;
    } else if (spec.mode === 'love') {
      const rayHue = (318 + i / rays * 78 + visualizerMusicPhase * 28 + audio.highMid*16) % 360;
      ctx.strokeStyle = `hsla(${rayHue},100%,70%,${.045 + reactive * .27})`;
    } else if (spec.mode === 'space') {
      const rayHue = (198 + i / rays * 118 + visualizerMusicPhase * 18 + audio.centroid*30) % 360;
      ctx.strokeStyle = `hsla(${rayHue},100%,74%,${.04 + reactive * .29})`;
    } else ctx.strokeStyle = `${spec.ray}${.035 + reactive * .25})`;
    ctx.lineWidth = Math.max(1, (1.0 + reactive * (spec.mode === 'toxic' ? 1.6 : .7)) * dpr);
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner); ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer); ctx.stroke();
  }
  ctx.restore();

  drawThemeAccent(ctx, spec, renderCx, renderCy, sphereR, audio, dpr, safeOuterRadius - 8*dpr);

  // Dotted 3D particle sphere. Palette and deformation follow the selected UI theme.
  const latitudeBands = Math.max(16, Math.round(25 * quality.detail));
  const longitudeBands = Math.max(34, Math.round(54 * quality.detail));
  const tilt = -.28 + visualizerWaveSample(.42) * audio.mid * .055 + visualizerWaveSample(.77) * audio.transient * .035;
  const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
  const cosY = Math.cos(visualizerAngle), sinY = Math.sin(visualizerAngle);
  for (let lat = 1; lat < latitudeBands; lat++) {
    const phi = (lat / latitudeBands) * Math.PI;
    const sinP = Math.sin(phi), cosP = Math.cos(phi);
    for (let lon = 0; lon < longitudeBands; lon++) {
      const theta = (lon / longitudeBands) * Math.PI * 2;
      let x = sinP * Math.cos(theta), y = cosP, z = sinP * Math.sin(theta);
      const ryX = x * cosY - z * sinY, ryZ = x * sinY + z * cosY;
      x = ryX; z = ryZ;
      const rtY = y * cosT - z * sinT, rtZ = y * sinT + z * cosT;
      y = rtY; z = rtZ;

      const spectralRatio = ((lon + lat * 2.4) % longitudeBands) / longitudeBands;
      let frequency = visualizerSpectrumSample(spectralRatio, audio);
      const waveLocal = visualizerWaveSample((spectralRatio*.83 + lat/latitudeBands*.11) % 1);
      let displacement = 1 + frequency * (.052 + audio.aggression*.086) + audio.beatPulse*.018 + (audio.vocal||0)*.022 + waveLocal*(audio.transient*.015 + (audio.vocalTransient||0)*.021);
      if (spec.mode === 'toxic') displacement += Math.max(0,waveLocal) * frequency * (.025 + audio.aggression*.035);
      if (spec.mode === 'blood') displacement += waveLocal * .022 * (audio.bass + audio.transient);
      if (spec.mode === 'fluid') displacement += waveLocal * .035 * (audio.mid + audio.transient*.7);
      if (spec.mode === 'rgb') displacement += waveLocal * .038 * (audio.energy + audio.transient);
      if (spec.mode === 'love') displacement += waveLocal * .026 * (audio.bass + audio.mid*.5);
      if (spec.mode === 'space') displacement += waveLocal * .023 * (audio.highMid + audio.transient);
      const perspective = 1 / (1.55 - z * .26);
      const px = renderCx + x * sphereR * displacement * perspective;
      const py = renderCy + y * sphereR * displacement * perspective;
      const depth = Math.max(0, Math.min(1, (z + 1) / 2));
      const dotR = (1.0 + depth*1.35 + frequency*(1.65+audio.aggression*1.5) + audio.beatPulse*.5 + (audio.vocal||0)*.72 + audio.treble*.22) * dpr;
      const alpha = .11 + depth * .5 + frequency * .28;
      const mix = (depth * .52 + frequency * .48);
      let hue = spec.h1 + (spec.h2-spec.h1)*mix + waveLocal*audio.highMid*9;
      if (spec.mode === 'rgb') hue = (theta/(Math.PI*2)*360 + phi/Math.PI*140 + visualizerMusicPhase*78 + audio.centroid*50) % 360;
      if (spec.mode === 'love') hue = (322 + theta/(Math.PI*2)*82 + visualizerMusicPhase*34 + frequency*28 + audio.highMid*12) % 360;
      const light = spec.mode === 'blood' ? 50 + depth * 22 : (spec.mode === 'love' ? 58 + depth * 22 : 57 + depth * 22);
      ctx.fillStyle = `hsla(${hue}, 100%, ${light}%, ${alpha})`;
      ctx.shadowColor = `hsla(${hue}, 100%, ${Math.min(80, light + 8)}%, ${alpha * .78})`;
      ctx.shadowBlur = (2 + frequency * 11 + audio.bass * 4) * dpr;
      ctx.beginPath(); ctx.arc(px, py, dotR, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.shadowBlur = 0;

  // Core breathing pulse; blood mode is darker and denser.
  const core = ctx.createRadialGradient(renderCx, renderCy, 0, renderCx, renderCy, sphereR * .92);
  if (spec.mode === 'blood') {
    core.addColorStop(0, `rgba(255,52,90,${.06 + audio.bass * .16})`);
    core.addColorStop(.5, `rgba(148,0,35,${.04 + audio.energy * .12})`);
    core.addColorStop(1, 'rgba(48,0,12,0)');
  } else {
    core.addColorStop(0, spec.core);
    core.addColorStop(.55, spec.glow.replace(/\.[0-9]+\)$/, `${.025 + audio.energy * .09})`));
    core.addColorStop(1, 'rgba(0,0,0,0)');
  }
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(renderCx, renderCy, sphereR * (.90 + audio.beatPulse*.055), 0, Math.PI * 2); ctx.fill();

  if (spec.mode === 'blood') drawBloodVisualizerDrops(ctx, dpr, renderCx, renderCy, sphereR, audio);
}

function startLyricsVisualizer() {
  if (!lyricsVisualizerCanvas || visualizerFrame) return;
  visualizerFrame = requestAnimationFrame(drawLyricsVisualizer);
}

let audioEnergyFrame = 0;
function startAudioEnergyTicker() {
  if (audioEnergyFrame) return;
  const tick = () => {
    audioEnergyFrame = 0;
    readAudioEnergy();
    if (!audioPlayer.paused && !audioPlayer.ended) audioEnergyFrame = requestAnimationFrame(tick);
  };
  audioEnergyFrame = requestAnimationFrame(tick);
}
function stopAudioEnergyTicker() {
  if (!audioEnergyFrame) return;
  cancelAnimationFrame(audioEnergyFrame);
  audioEnergyFrame = 0;
  visualizerAudioSnapshot = { energy:0,bass:0,treble:0,subBass:0,lowMid:0,mid:0,highMid:0,vocal:0,vocalTransient:0,rms:0,waveformPeak:0,flux:0,transient:0,beat:false,beatPulse:0,beatId:visualizerBeatId,aggression:0,motion:0,centroid:visualizerLastCentroid,peak:0,hasSignal:false,playing:false };
  window.__dinechoAudioEnergy = visualizerAudioSnapshot;
}

['play', 'playing'].forEach((event) => audioPlayer.addEventListener(event, () => {
  const changedTrack = audioAnalyserMediaKey !== getAudioAnalyserMediaKey();
  resumeAudioAnalyser(changedTrack); startLyricsVisualizer(); startAudioEnergyTicker();
}));
audioPlayer.addEventListener('pause', stopAudioEnergyTicker);
audioPlayer.addEventListener('ended', stopAudioEnergyTicker);
audioPlayer.addEventListener('loadedmetadata', () => { resumeAudioAnalyser(true); startLyricsVisualizer(); });
startLyricsVisualizer();

function lyricTextKey(value = '') {
  return window.DeepecchoLyricsTimeline?.textKey
    ? window.DeepecchoLyricsTimeline.textKey(value)
    : String(value).normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function normalizeLyricTimeline(rows = []) {
  if (window.DeepecchoLyricsTimeline?.normalizeTimeline) return window.DeepecchoLyricsTimeline.normalizeTimeline(rows);
  return rows
    .map((row, order) => ({ time:Number(row?.time), text:String(row?.text || '').trim(), order }))
    .filter(row => Number.isFinite(row.time) && row.time >= 0 && row.text)
    .sort((a,b) => (a.time - b.time) || (a.order - b.order))
    .map(({time,text}) => ({time,text}));
}
function parseLrc(value) {
  const lines = [];
  for (const line of String(value || '').split(/\r?\n/)) {
    const text = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();
    for (const match of line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g))
      lines.push({ time: Number(match[1]) * 60 + Number(match[2]), text });
  }
  return normalizeLyricTimeline(lines);
}
function findActiveLyricIndex(lines, playbackTime) {
  if (window.DeepecchoLyricsTimeline?.findActiveIndex) return window.DeepecchoLyricsTimeline.findActiveIndex(lines, playbackTime);
  let lo = 0, hi = lines.length - 1, answer = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (Number(lines[mid]?.time) <= playbackTime) { answer = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return answer;
}
window.echoAPI.onLyricsStatus?.((status) => {
  if (!status?.text || !lyricsQuery) return;
  const sameSong = status.songId ? status.songId === lyricsQuery.id : status.title === lyricsQuery.title;
  if (!sameSong) return;
  if (['lookup','fallback','audio','model','transcribe'].includes(status.stage)) {
    // Never wipe already-visible lyrics while a background timing/transcription upgrade runs.
    // Wiping the DOM used to make highlighting appear randomly "stuck" until the async job ended.
    const visibleLyrics = !!lyricsBody.querySelector('.lyric-line');
    if (!visibleLyrics) lyricsBody.innerHTML = `<p class="hint lyrics-ai-status">${escapeHtml(status.text)}</p>`;
    else lyricsSource.textContent = status.text;
    if (status.stage === 'model' && !visibleLyrics) lyricsSource.textContent = 'DEEP-ECHO AI · one-time local setup';
    else if (status.stage === 'transcribe' && !visibleLyrics) lyricsSource.textContent = 'DEEP-ECHO AI · local audio transcription';
  }
});

async function loadLyricsFor(song, keepFields = false) {
  const request = ++lyricsRequest;
  lyricsQuery = song; lyricLines = []; activeLyric = -1;
  setLyricsAutoFollow(true);
  lyricsSongTitle.textContent = song.title;
  updateLyricsVisual(song);
  lyricsSource.textContent = '';
  if (!keepFields) {
    const clean = song.title.replace(/\[(.*?)\]|\((?:official|lyrics|lyric|lyrical|audio|video)[^)]*\)/gi, '').trim();
    const parts = clean.split(/\s+[-–—]\s+/);
    lyricsArtistInput.value = parts.length > 1 ? parts.shift() : (song.channel || '').replace(/VEVO$| - Topic$/gi, '');
    lyricsTitleInput.value = parts.length ? parts.join(' - ') : clean.split(/\s*[|｜]\s*/)[0].trim();
  }
  lyricsBody.innerHTML = '<p class="hint">Lyrics load ho rahi hain...</p>';
  try {
    const res = await window.echoAPI.getLyrics({
      id: song.id,
      title: song.title,
      channel: song.channel,
      duration: song.duration,
      url: song.url || '',
      streamUrl: song.streamUrl || '',
      filepath: song.filepath || '',
      manual: !!keepFields
    });
    if (request !== lyricsRequest || res?.cancelled) return;
    // A lyrics response is valid only for the track that is still authoritative in the player.
    // This extra identity gate protects against late provider/AI responses after very fast Next/
    // Previous/AI-DJ changes, even if a provider ignored cancellation for a moment.
    if (song?.id && currentSong?.id && String(song.id) !== String(currentSong.id)) return;
    applyLyricsTimingPayload(res);
    if (typeof smartCaptureLyricsPayload === 'function') smartCaptureLyricsPayload(res);
    if (res?.syncedLyrics) lyricLines = parseLrc(res.syncedLyrics);
    if (lyricLines.length) {
      lyricsBody.innerHTML = lyricLines.map((line, i) => `<p class="lyric-line" data-line="${i}">${escapeHtml(line.text) || '♪'}</p>`).join('');
      syncLyrics(true);
      startLyricTicker();
    } else if (res?.lyrics) {
      lyricsBody.innerHTML = res.lyrics.split(/\r?\n/).map(line => `<p class="lyric-line plain">${escapeHtml(line) || '&nbsp;'}</p>`).join('');
      // Plain lyrics appear immediately. Timing is upgraded in the background from the
      // exact playing audio, then the same visible lines become synced/highlighted.
      if (window.echoAPI.syncPlainLyrics && currentSong?.id === song.id) {
        const timingRequest = request;
        const timingSong = { ...normalizeSong(currentSong), streamUrl: currentSong.streamUrl || '', filepath: currentSong.filepath || '', url: currentSong.url || song.url || '' };
        window.echoAPI.syncPlainLyrics(timingSong, res.lyrics).then(upgrade => {
          if (timingRequest !== lyricsRequest || !upgrade?.syncedLyrics) return;
          if (song?.id && currentSong?.id && String(song.id) !== String(currentSong.id)) return;
          applyLyricsTimingPayload(upgrade);
          if (typeof smartCaptureLyricsPayload === 'function') smartCaptureLyricsPayload({ ...res, ...upgrade });
          lyricLines = parseLrc(upgrade.syncedLyrics); activeLyric = -1;
          if (!lyricLines.length) return;
          lyricsBody.innerHTML = lyricLines.map((line,i)=>`<p class="lyric-line" data-line="${i}">${escapeHtml(line.text)||'♪'}</p>`).join('');
          lyricsSource.textContent = `Synced lyrics · ${upgrade.source || 'DEEP-ECHO AI timing'}`;
          setLyricsAutoFollow(true); syncLyrics(true); startLyricTicker();
          if (typeof smartPrepareKaraokeWords === 'function') smartPrepareKaraokeWords();
        }).catch(()=>{});
      }
    } else if (res?.instrumental) lyricsBody.innerHTML = '<p class="hint">Instrumental · is track mein vocals nahi hain.</p>';
    else lyricsBody.innerHTML = `<p class="hint">${escapeHtml(res?.error || 'Lyrics nahi mili.')}</p>`;
    if (res?.source) {
      const type = lyricLines.length ? 'Synced lyrics' : 'Lyrics';
      const ai = res.transcription ? ' · AI transcribed' : '';
      lyricsSource.textContent = `${type} · ${res.source}${ai}`;
    }
  } catch (error) {
    if (request === lyricsRequest) lyricsBody.textContent = 'Lyrics load nahi hui. Retry dabao.';
  }
}
function scrollActiveLyricStable(line, force = false) {
  const mainScroller = document.querySelector('main');
  if (!mainScroller || !line) return;
  const mainRect = mainScroller.getBoundingClientRect();
  const lineRect = line.getBoundingClientRect();
  const center = mainRect.top + (mainRect.height * 0.50);
  const lineCenter = lineRect.top + (lineRect.height / 2);
  const safeBand = Math.max(54, Math.min(118, mainRect.height * 0.14));

  // Do not keep re-centering the same lyric on every timeupdate. This avoids
  // the visible up/down bounce that happened near the final lines.
  if (!force && Math.abs(lineCenter - center) <= safeBand) return;

  const rawTarget = mainScroller.scrollTop + (lineCenter - center);
  const maxScroll = Math.max(0, mainScroller.scrollHeight - mainScroller.clientHeight);
  const target = Math.max(0, Math.min(maxScroll, rawTarget));
  if (Math.abs(target - mainScroller.scrollTop) < 2) return;
  mainScroller.scrollTo({ top: target, behavior: force ? 'auto' : 'smooth' });
}

function syncLyrics(force = false) {
  // DOM events used to be passed directly into this function; an Event is
  // truthy, so every timeupdate was accidentally treated as force=true.
  // Only a literal boolean true may force a re-sync now.
  force = force === true;
  const playbackTime = lyricsPlaybackClock();
  const index = findActiveLyricIndex(lyricLines, playbackTime);
  // Repair DOM state too: async variant/status mutations must never leave an old line highlighted.
  const domCurrent = Number(lyricsBody.querySelector('.lyric-line.current')?.dataset?.line ?? -1);
  if (!force && index === activeLyric && domCurrent === index) return;
  activeLyric = index;
  const lineElements = lyricsBody.querySelectorAll('[data-line]');
  lineElements.forEach((line, i) => {
    const current = i === index;
    line.classList.toggle('current', current);
    line.classList.toggle('past', i < index);
    if (current) line.setAttribute('aria-current', 'true');
    else line.removeAttribute('aria-current');
  });
  if (typeof smartSyncImmersiveLyricsState === 'function') smartSyncImmersiveLyricsState(force);
  if (typeof window.__deepecchoPushFloatingLyrics === 'function') window.__deepecchoPushFloatingLyrics(force);
  const line = lyricsBody.querySelector(`[data-line="${index}"]`);
  if (line && lyricsAutoFollow && document.getElementById('lyricsView').classList.contains('active')) {
    scrollActiveLyricStable(line, force);
  }
}
function startLyricTicker() {
  if (lyricAnimationFrame) return;
  // Playback-critical lyric timing must not depend on requestAnimationFrame: Chromium may
  // pause visual frames when a game/minimized window owns the foreground. A lightweight
  // media-clock interval keeps main, immersive and floating lyrics on the same timeline.
  const tick = () => {
    syncLyrics(false);
    if (typeof smartUpdateKaraoke === 'function') smartUpdateKaraoke();
  };
  tick();
  lyricAnimationFrame = setInterval(tick, 80);
}
function stopLyricTicker() {
  if (!lyricAnimationFrame) return;
  clearInterval(lyricAnimationFrame);
  lyricAnimationFrame = 0;
}
function updateLyricsSyncButton() {
  if (!lyricsSyncBtn) return;
  const lyricsViewActive = document.getElementById('lyricsView').classList.contains('active');
  const shouldShow = lyricsViewActive && !lyricsAutoFollow && lyricLines.length > 0;
  lyricsSyncBtn.classList.toggle('hidden', !shouldShow);
}

function setLyricsAutoFollow(enabled) {
  lyricsAutoFollow = enabled !== false;
  updateLyricsSyncButton();
}

function pauseLyricsAutoFollow() {
  if (!document.getElementById('lyricsView').classList.contains('active') || !lyricLines.length) return;
  setLyricsAutoFollow(false);
}

const lyricsMainScroller = document.querySelector('main');
if (lyricsMainScroller) {
  lyricsMainScroller.addEventListener('wheel', pauseLyricsAutoFollow, { passive: true });
  lyricsMainScroller.addEventListener('touchmove', pauseLyricsAutoFollow, { passive: true });
  lyricsMainScroller.addEventListener('pointerdown', (event) => {
    const rect = lyricsMainScroller.getBoundingClientRect();
    if (event.clientX >= rect.right - 18) pauseLyricsAutoFollow();
  }, { passive: true });
}
window.addEventListener('keydown', (event) => {
  if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return;
  if (event.target instanceof Element && event.target.closest('input, textarea, select, button, [contenteditable="true"]')) return;
  pauseLyricsAutoFollow();
});
if (lyricsSyncBtn) {
  lyricsSyncBtn.addEventListener('click', () => {
    setLyricsAutoFollow(true);
    syncLyrics(true);
  });
}

audioPlayer.addEventListener('timeupdate', () => syncLyrics(false));
audioPlayer.addEventListener('seeking', () => syncLyrics(true));
audioPlayer.addEventListener('play', startLyricTicker);
audioPlayer.addEventListener('playing', startLyricTicker);
audioPlayer.addEventListener('loadedmetadata', () => { syncLyrics(true); if (!audioPlayer.paused) startLyricTicker(); });
audioPlayer.addEventListener('canplay', () => { if (!audioPlayer.paused) startLyricTicker(); });
audioPlayer.addEventListener('pause', stopLyricTicker);
audioPlayer.addEventListener('ended', stopLyricTicker);
document.getElementById('lyricsSearchForm').addEventListener('submit', e => {
  e.preventDefault();
  const title = lyricsTitleInput.value.trim();
  const artist = lyricsArtistInput.value.trim();
  loadLyricsFor({ title: artist ? `${artist} - ${title}` : title, channel: artist, duration: currentSong?.duration }, true);
});
document.getElementById('lyricsRetryBtn').addEventListener('click', () => { if (lyricsQuery) loadLyricsFor(lyricsQuery, true); });

// ================= Theme Lyrics + Live Cursor =================
const dinechoLiveCursor = document.getElementById('dinechoLiveCursor');
const dinechoLiveCursorArt = document.getElementById('dinechoLiveCursorArt');

// Every theme intentionally uses a different silhouette, not the same arrow
// recoloured. Extra badges/hearts/+ signs are avoided: the pointer itself is
// the complete design.
const LIVE_CURSOR_ART = {
  dragon: `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="cdr"><stop stop-color="#fff4bb"/><stop offset=".5" stop-color="#ff9e30"/><stop offset="1" stop-color="#af2106"/></linearGradient></defs><path class="cursor-glow-shape" d="M3 3L25 10L22 3L35 15L44 18L34 24L38 31L27 28L24 43L18 31L9 39L12 22Z"/><path class="cursor-main-shape" fill="url(#cdr)" d="M3 3L25 10L22 3L35 15L44 18L34 24L38 31L27 28L24 43L18 31L9 39L12 22Z"/><path class="cursor-detail-shape" d="M9 9L29 17L21 23L23 33L17 25L12 30L15 19Z"/><path class="cursor-live-streak" d="M8 8L31 18L23 22L24 36"/></svg>`,
  golden: `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff9cf"/><stop offset=".3" stop-color="#ffd66d"/><stop offset=".7" stop-color="#e59a16"/><stop offset="1" stop-color="#6d3900"/></linearGradient></defs><path class="cursor-glow-shape" d="M4 3L42 17L25 22C31 29 30 37 19 45C23 35 20 29 15 25L7 37L10 20Z"/><path class="cursor-main-shape" d="M4 3L42 17L25 22C31 29 30 37 19 45C23 35 20 29 15 25L7 37L10 20Z" fill="url(#cg)"/><path class="cursor-detail-shape" d="M9 8L33 17L20 20L18 31L14 21L10 27L12 16Z"/><path class="cursor-live-streak" d="M8 8L27 17L17 21L19 35"/></svg>`,
  light: `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="cl" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".38" stop-color="#f5eee0"/><stop offset=".72" stop-color="#bbb4a8"/><stop offset="1" stop-color="#3a3c43"/></linearGradient></defs><path class="cursor-glow-shape" d="M4 3L43 13L29 23L40 34L26 31L18 45L15 28L7 40L10 19Z"/><path class="cursor-main-shape" d="M4 3L43 13L29 23L40 34L26 31L18 45L15 28L7 40L10 19Z" fill="url(#cl)"/><path class="cursor-detail-shape" d="M10 8L35 14L23 21L29 27L21 25L17 34L15 23L11 28L13 16Z"/><path class="cursor-live-streak" d="M9 8L31 14L21 21L25 28"/></svg>`,
  dark: `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="cd" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eaf0ff"/><stop offset=".34" stop-color="#7d8db6"/><stop offset=".7" stop-color="#333b55"/><stop offset="1" stop-color="#090b12"/></linearGradient></defs><path class="cursor-glow-shape" d="M4 3C20 6 36 12 43 24C33 20 27 21 23 28L14 45L15 27L7 34L10 17Z"/><path class="cursor-main-shape" d="M4 3C20 6 36 12 43 24C33 20 27 21 23 28L14 45L15 27L7 34L10 17Z" fill="url(#cd)"/><path class="cursor-detail-shape" d="M10 9C20 10 30 14 35 20C25 18 20 22 17 31L16 20Z"/><path class="cursor-live-streak" d="M9 8C20 10 28 13 34 19C24 18 19 23 16 34"/></svg>`,
  purple: `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="cp" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0ff"/><stop offset=".28" stop-color="#e196ff"/><stop offset=".58" stop-color="#934cff"/><stop offset="1" stop-color="#321086"/></linearGradient></defs><path class="cursor-glow-shape" d="M4 3L34 11L23 19L42 22L27 29L18 45L19 29L7 37L12 19Z"/><path class="cursor-main-shape" d="M4 3L34 11L23 19L42 22L27 29L18 45L19 29L7 37L12 19Z" fill="url(#cp)"/><path class="cursor-detail-shape" d="M10 8L26 12L18 19L31 21L22 25L19 34L18 24L12 29L15 17Z"/><path class="cursor-live-streak" d="M9 8L25 13L17 19L30 21L21 26L18 37"/></svg>`,
  toxic: `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="ct" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#edff9e"/><stop offset=".3" stop-color="#63ff8d"/><stop offset=".65" stop-color="#10c95b"/><stop offset="1" stop-color="#045628"/></linearGradient></defs><path class="cursor-glow-shape" d="M4 3L41 16L30 20L43 27L28 30L24 45L17 31L8 40L12 24L5 19Z"/><path class="cursor-main-shape" d="M4 3L41 16L30 20L43 27L28 30L24 45L17 31L8 40L12 24L5 19Z" fill="url(#ct)"/><path class="cursor-detail-shape" d="M10 9L31 16L22 20L32 25L23 26L20 35L17 25L12 31L15 20Z"/><path class="cursor-live-streak" d="M9 8L30 16L21 20L31 25L22 27L20 37"/></svg>`,
  blood: `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="cb" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd1d8"/><stop offset=".27" stop-color="#ff4967"/><stop offset=".58" stop-color="#d40732"/><stop offset="1" stop-color="#42000d"/></linearGradient></defs><path class="cursor-glow-shape" d="M4 3C17 8 31 7 43 17C34 20 28 24 31 31C35 39 29 44 19 45C24 37 21 30 16 27L8 40L11 22L5 18Z"/><path class="cursor-main-shape" d="M4 3C17 8 31 7 43 17C34 20 28 24 31 31C35 39 29 44 19 45C24 37 21 30 16 27L8 40L11 22L5 18Z" fill="url(#cb)"/><path class="cursor-detail-shape" d="M10 9C19 12 29 11 35 16C27 18 22 23 24 29C20 25 17 23 14 22L11 31L13 18Z"/><path class="cursor-live-streak" d="M9 8C18 11 28 11 35 16C27 19 23 24 25 30C26 34 24 38 20 41"/></svg>`,
  silver: `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="cs" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".28" stop-color="#e9f3ff"/><stop offset=".58" stop-color="#9eb2c8"/><stop offset=".82" stop-color="#f8fbff"/><stop offset="1" stop-color="#65758a"/></linearGradient></defs><path class="cursor-glow-shape" d="M4 3L39 18L28 23L40 36L27 32L21 45L17 29L7 37L11 21Z"/><path class="cursor-main-shape" d="M4 3L39 18L28 23L40 36L27 32L21 45L17 29L7 37L11 21Z" fill="url(#cs)"/><path class="cursor-detail-shape" d="M9 8L31 18L21 21L28 29L21 26L19 35L16 25L12 29L14 18Z"/><path class="cursor-live-streak" d="M9 8L30 18L20 21L27 29L21 27L19 37"/></svg>`,
  transparent: `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="ctr" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".95"/><stop offset=".38" stop-color="#9dbbff" stop-opacity=".36"/><stop offset=".7" stop-color="#dce8ff" stop-opacity=".72"/><stop offset="1" stop-color="#7189c6" stop-opacity=".28"/></linearGradient></defs><path class="cursor-glow-shape" d="M4 3L43 16L24 23L34 42L23 35L15 45L15 27L7 34L10 20Z"/><path class="cursor-main-shape" d="M4 3L43 16L24 23L34 42L23 35L15 45L15 27L7 34L10 20Z" fill="url(#ctr)"/><path class="cursor-detail-shape" d="M10 8L34 16L19 21L26 34L21 29L17 36L17 23L12 27L13 17Z"/><path class="cursor-live-streak" d="M9 8L32 16L19 21L25 34"/></svg>`,
  fluids: `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="cf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d5ffff"/><stop offset=".3" stop-color="#62e7ff"/><stop offset=".62" stop-color="#687bff"/><stop offset="1" stop-color="#49ffd3"/></linearGradient></defs><path class="cursor-glow-shape" d="M4 3C18 7 36 13 41 22C45 30 36 35 28 28C33 37 27 43 18 45C22 36 20 30 15 26L8 40L11 22L5 18Z"/><path class="cursor-main-shape" d="M4 3C18 7 36 13 41 22C45 30 36 35 28 28C33 37 27 43 18 45C22 36 20 30 15 26L8 40L11 22L5 18Z" fill="url(#cf)"/><path class="cursor-detail-shape" d="M10 9C20 11 31 15 35 20C30 19 25 21 23 27C20 24 17 22 14 21L11 31L13 18Z"/><path class="cursor-live-streak" d="M9 8C20 11 31 15 35 20C30 19 25 22 23 28C26 34 23 39 19 42"/></svg>`,
  rgb: `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="cr" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff4c72"/><stop offset=".18" stop-color="#ffe45a"/><stop offset=".4" stop-color="#55ff9e"/><stop offset=".62" stop-color="#4be0ff"/><stop offset=".8" stop-color="#7866ff"/><stop offset="1" stop-color="#ff4bd4"/></linearGradient></defs><path class="cursor-glow-shape" d="M4 3L42 18L27 22L37 31L26 30L20 45L16 29L7 38L11 21Z"/><path class="cursor-main-shape" d="M4 3L42 18L27 22L37 31L26 30L20 45L16 29L7 38L11 21Z" fill="url(#cr)"/><path class="cursor-detail-shape" d="M9 8L33 18L21 21L28 25L21 25L19 35L16 25L12 29L14 18Z"/><path class="cursor-live-streak" d="M9 8L32 18L20 21L27 25L21 26L19 38"/></svg>`,
  love: `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="cv" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff5fb"/><stop offset=".3" stop-color="#ff9bd5"/><stop offset=".62" stop-color="#ee4ca5"/><stop offset="1" stop-color="#8529d2"/></linearGradient></defs><path class="cursor-glow-shape" d="M4 3C18 6 35 11 42 20C32 18 26 22 24 29C22 38 15 43 8 44C15 35 17 29 13 25L7 36L9 21L5 17Z"/><path class="cursor-main-shape" d="M4 3C18 6 35 11 42 20C32 18 26 22 24 29C22 38 15 43 8 44C15 35 17 29 13 25L7 36L9 21L5 17Z" fill="url(#cv)"/><path class="cursor-detail-shape" d="M10 9C20 10 30 14 35 19C26 18 21 23 19 31C18 26 16 22 13 21L11 29L12 18Z"/><path class="cursor-live-streak" d="M9 8C20 10 30 14 35 19C26 19 21 24 19 32C17 37 13 40 10 41"/></svg>`,
  space: `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="cspace" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#effcff"/><stop offset=".25" stop-color="#68dfff"/><stop offset=".55" stop-color="#8678ff"/><stop offset=".82" stop-color="#d85cff"/><stop offset="1" stop-color="#30105f"/></linearGradient></defs><path class="cursor-glow-shape" d="M4 3L43 17L27 22L38 29L26 30L20 45L16 29L7 39L11 21Z"/><path class="cursor-main-shape" d="M4 3L43 17L27 22L38 29L26 30L20 45L16 29L7 39L11 21Z" fill="url(#cspace)"/><path class="cursor-detail-shape" d="M9 8L34 17L21 21L29 25L21 26L19 35L16 25L12 30L14 18Z"/><path class="cursor-live-streak" d="M9 8L32 17L20 21L28 25L21 27L19 39"/></svg>`
};

let liveCursorTheme = 'golden';
let liveCursorTargetX = -100;
let liveCursorTargetY = -100;
let liveCursorX = -100;
let liveCursorY = -100;
let liveCursorRaf = 0;
let liveCursorVisible = false;

function setLiveCursorTheme(theme) {
  liveCursorTheme = LIVE_CURSOR_ART[theme] ? theme : 'golden';
  if (!dinechoLiveCursor || !dinechoLiveCursorArt) return;
  dinechoLiveCursor.dataset.theme = liveCursorTheme;
  dinechoLiveCursorArt.innerHTML = LIVE_CURSOR_ART[liveCursorTheme];
}

function resolveLiveCursorState(target) {
  if (!(target instanceof Element)) return 'normal';
  if (target.closest('#immersiveLikeBtn')) return 'like';
  if (target.closest('#lyricsBody, .lyric-line, .lyrics-heading, input:not([type="range"]), textarea, [contenteditable="true"]')) return 'text';
  if (target.closest('button, a, [role="button"], .nav-item, .song-card, .song-row, .playlist-card, .theme-option, .player-action-btn, .queue-item, .queue-meta, input[type="range"], select, label[for]')) return 'action';
  return 'normal';
}

function paintLiveCursor() {
  liveCursorRaf = 0;
  if (!dinechoLiveCursor) return;
  // Small easing keeps it feeling alive without lagging behind clicks.
  liveCursorX += (liveCursorTargetX - liveCursorX) * 0.72;
  liveCursorY += (liveCursorTargetY - liveCursorY) * 0.72;
  dinechoLiveCursor.style.left = `${liveCursorX - 3}px`;
  dinechoLiveCursor.style.top = `${liveCursorY - 3}px`;
  if (Math.abs(liveCursorTargetX - liveCursorX) > 0.12 || Math.abs(liveCursorTargetY - liveCursorY) > 0.12) {
    liveCursorRaf = requestAnimationFrame(paintLiveCursor);
  }
}

function queueLiveCursorPaint() {
  if (!liveCursorRaf) liveCursorRaf = requestAnimationFrame(paintLiveCursor);
}

function isLiveCursorRenderable() {
  return !!(
    dinechoLiveCursor &&
    dinechoLiveCursorArt &&
    dinechoLiveCursor.isConnected &&
    dinechoLiveCursorArt.isConnected &&
    dinechoLiveCursorArt.querySelector('svg')
  );
}

function setNativeCursorFallback(useCustomCursor) {
  // Fail-safe: never hide the Windows cursor until the custom SVG cursor is
  // actually present and visible. This prevents an invisible mouse pointer if
  // the themed cursor layer fails to initialise or gets detached.
  document.documentElement.classList.toggle('dinecho-live-cursor-enabled', useCustomCursor === true);
}

function hideLiveCursor() {
  liveCursorVisible = false;
  if (dinechoLiveCursor) dinechoLiveCursor.classList.remove('visible', 'pressed');
  setNativeCursorFallback(false);
}

function initLiveCursor() {
  // Native cursor is the safe default during startup.
  setNativeCursorFallback(false);
  if (!dinechoLiveCursor || !dinechoLiveCursorArt) return;
  setLiveCursorTheme(document.body.dataset.theme || 'golden');

  window.addEventListener('pointermove', (event) => {
    liveCursorTargetX = event.clientX;
    liveCursorTargetY = event.clientY;

    if (!isLiveCursorRenderable()) {
      hideLiveCursor();
      return;
    }

    if (!liveCursorVisible) {
      liveCursorX = event.clientX;
      liveCursorY = event.clientY;
      liveCursorVisible = true;
      dinechoLiveCursor.classList.add('visible');
    }
    dinechoLiveCursor.dataset.state = resolveLiveCursorState(event.target);
    queueLiveCursorPaint();

    // Hide the native pointer only after the custom cursor has been positioned
    // and made visible for this pointer event.
    requestAnimationFrame(() => {
      const ready = liveCursorVisible && isLiveCursorRenderable() && dinechoLiveCursor.classList.contains('visible');
      setNativeCursorFallback(ready);
    });
  }, { passive: true });

  window.addEventListener('pointerdown', () => {
    if (isLiveCursorRenderable()) dinechoLiveCursor.classList.add('pressed');
  }, { passive: true });
  window.addEventListener('pointerup', () => {
    if (dinechoLiveCursor) dinechoLiveCursor.classList.remove('pressed');
  }, { passive: true });
  window.addEventListener('pointercancel', hideLiveCursor, { passive: true });
  document.addEventListener('mouseleave', hideLiveCursor);
  window.addEventListener('blur', hideLiveCursor);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hideLiveCursor();
  });
}

function applyThemeCursor(theme) {
  setLiveCursorTheme(theme);
}

function applyLyricsThemeFx(enabled) {
  const active = enabled !== false;
  document.body.classList.toggle('lyrics-theme-fx', active);
  if (lyricsThemeFxToggle) {
    lyricsThemeFxToggle.classList.toggle('active', active);
    lyricsThemeFxToggle.setAttribute('aria-pressed', String(active));
  }
  if (lyricsThemeFxToggleText) lyricsThemeFxToggleText.textContent = active ? 'ON' : 'OFF';
  localStorage.setItem(STORAGE.lyricsThemeFx, active ? 'true' : 'false');
}

if (lyricsThemeFxToggle) {
  lyricsThemeFxToggle.addEventListener('click', () => {
    applyLyricsThemeFx(!document.body.classList.contains('lyrics-theme-fx'));
  });
}

initLiveCursor();

// ================= Themes =================
function syncWindowOpacity(theme = document.body.dataset.theme) {
  const safe = Math.max(30, Math.min(100, Number(glassOpacityRange?.value) || Number(localStorage.getItem(STORAGE.glassOpacity)) || 58));
  const value = theme === 'transparent' ? safe / 100 : 1;
  if (window.echoAPI.setWindowOpacity) window.echoAPI.setWindowOpacity(value).catch(() => {});
}
function applyTheme(theme) {
  const allowed = ['golden', 'light', 'dark', 'purple', 'toxic', 'blood', 'silver', 'transparent', 'fluids', 'rgb', 'love', 'space', 'dragon'];
  const selected = allowed.includes(theme) ? theme : 'golden';
  document.body.dataset.theme = selected;
  localStorage.setItem(STORAGE.theme, selected);
  document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.themeChoice === selected);
  });
  if (fluidSettings) fluidSettings.classList.toggle('active-fluid-settings', selected === 'fluids');
  applyThemeCursor(selected);
  syncWindowOpacity(selected);
  queueMicrotask(() => { if (typeof smartSyncMiniState === 'function') smartSyncMiniState(); });
}

function applyGlassOpacity(value) {
  const safe = Math.max(30, Math.min(100, Number(value) || 58));
  document.body.style.setProperty('--glass-opacity', String(safe / 100));
  glassOpacityRange.value = String(safe);
  glassOpacityValue.textContent = `${safe}%`;
  localStorage.setItem(STORAGE.glassOpacity, String(safe));
  syncWindowOpacity();
}
glassOpacityRange.addEventListener('input', () => applyGlassOpacity(glassOpacityRange.value));

document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.themeChoice));
});

const themeGrid = document.getElementById('themeGrid');
const themeShowMoreBtn = document.getElementById('themeShowMoreBtn');
const themeShowMoreText = document.getElementById('themeShowMoreText');
function setThemeGridExpanded(expanded) {
  const open = !!expanded;
  if (themeGrid) themeGrid.classList.toggle('show-all-themes', open);
  if (themeShowMoreBtn) {
    themeShowMoreBtn.setAttribute('aria-expanded', String(open));
    themeShowMoreBtn.classList.toggle('expanded', open);
  }
  if (themeShowMoreText) themeShowMoreText.textContent = open ? 'Show Less' : 'Show More';
}
setThemeGridExpanded(false);
themeShowMoreBtn?.addEventListener('click', () => setThemeGridExpanded(themeShowMoreBtn.getAttribute('aria-expanded') !== 'true'));


function syncFluidFxState() {
  const baseVolume = audioPlayer.muted ? 0 : (Number(audioPlayer.volume) || 0);
  const active = !!audioPlayer.src && !audioPlayer.paused && !audioPlayer.ended;
  const pulse = active ? (0.45 + Math.abs(Math.sin((audioPlayer.currentTime || 0) * 3.1)) * 0.55) : 0;
  window.__dinechoFluidState = { active, volume: baseVolume, energy: baseVolume * pulse };
}
function applyVolumeSettings(rawValue, rawMuted = audioPlayer.muted) {
  const safe = Math.max(0, Math.min(100, Number(rawValue) || 0));
  const muted = !!rawMuted;
  audioPlayer.volume = safe / 100;
  audioPlayer.muted = muted || safe === 0;
  if (volumeRange) volumeRange.value = String(safe);
  if (volumeValue) volumeValue.textContent = `${safe}%`;
  if (muteToggleBtn) muteToggleBtn.textContent = audioPlayer.muted ? 'Unmute' : 'Mute';
  if (volumeStatus) volumeStatus.textContent = audioPlayer.muted ? 'Muted · DEEP-ECHO playback silent hai.' : 'Controls DEEP-ECHO playback volume.';
  localStorage.setItem(STORAGE.volume, String(safe));
  localStorage.setItem(STORAGE.muted, audioPlayer.muted ? 'true' : 'false');
  syncFluidFxState();
}
if (volumeRange) volumeRange.addEventListener('input', () => applyVolumeSettings(volumeRange.value, Number(volumeRange.value) <= 0 ? true : false));
if (muteToggleBtn) muteToggleBtn.addEventListener('click', () => {
  const nextMuted = !audioPlayer.muted;
  applyVolumeSettings(volumeRange?.value || Math.round((audioPlayer.volume || 0) * 100), nextMuted);
});
['play', 'playing', 'pause', 'ended', 'timeupdate', 'volumechange'].forEach((event) => audioPlayer.addEventListener(event, syncFluidFxState));

function applyFluidSettings(intensityValue, presetValue) {
  const intensity = Math.max(40, Math.min(160, Number(intensityValue) || 100));
  const allowedPresets = ['aurora', 'neon', 'ocean', 'fire'];
  const preset = allowedPresets.includes(presetValue) ? presetValue : 'aurora';
  if (fluidIntensityRange) fluidIntensityRange.value = String(intensity);
  if (fluidIntensityValue) fluidIntensityValue.textContent = `${intensity}%`;
  if (fluidPresetSelect) fluidPresetSelect.value = preset;
  localStorage.setItem(STORAGE.fluidIntensity, String(intensity));
  localStorage.setItem(STORAGE.fluidPreset, preset);
  window.__dinechoFluidConfig = { intensity: intensity / 100, preset };
}
if (fluidIntensityRange) fluidIntensityRange.addEventListener('input', () => applyFluidSettings(fluidIntensityRange.value, fluidPresetSelect?.value || 'aurora'));
if (fluidPresetSelect) fluidPresetSelect.addEventListener('change', () => applyFluidSettings(fluidIntensityRange?.value || 100, fluidPresetSelect.value));

// ================= Dinecho v1.4.6 Time-aware Home =================
const HOME_MOMENTS = [
  { key:'late-night', from:0, to:4,
    greetings:['Still awake?','Late-night listening.','The city is quiet.','After-hours mode.'],
    captions:['Let the room go quiet and keep only the song.','Some tracks only make sense after midnight.','Low lights. Long songs. No rush.','One more song can become an entire memory.','Night has fewer distractions and better details.','Let the bass stay soft and the thoughts drift.','Music for the hours nobody schedules.','Keep the volume gentle; let the feeling stay loud.','The playlist can wait. Follow the song that feels right.','A quiet night is a very large place for music.'],
    hero:['Take the long way through the song.','Stay a little longer with the music.','Find the track that fits the silence.'] },
  { key:'dawn', from:4, to:7,
    greetings:['A new day is starting.','Early morning.','First light, first track.','Morning is loading.'],
    captions:['Start slowly. The day has plenty of time to get loud.','Fresh air, clear head, one good song.','Let the first track set the temperature of the day.','Before the rush begins, keep a minute for yourself.','Small beginnings sound better with the right soundtrack.','Wake the room before you wake the whole world.','A calm opening track can change the pace of everything.','New light, old favorites, zero pressure.','Start with something familiar, then discover something new.','The first song does not need to be energetic. It only needs to feel right.'],
    hero:['Start soft. Build your day.','Choose the first sound of the day.','Wake up at your own tempo.'] },
  { key:'morning', from:7, to:12,
    greetings:['Good morning.','Morning soundtrack ready.','A fresh queue for a fresh start.','Your morning, your tempo.'],
    captions:['A little less noise. A little more music.','Put something good on before the day gets busy.','Start with a song you know; stay for one you did not.','Good mornings do not need perfect plans—just a good first track.','Let the chorus arrive before the notifications do.','Pick a rhythm that makes the next hour lighter.','Familiar songs make excellent morning shortcuts.','Give the day a soundtrack before it gives you a schedule.','Coffee is optional. A good queue helps either way.','Start moving when the music feels ready.'],
    hero:['Press play. Find your moment.','Set the tone before the day does.','Begin with something worth replaying.'] },
  { key:'midday', from:12, to:15,
    greetings:['Good afternoon.','Midday mix.','Half the day, plenty of music left.','Afternoon listening.'],
    captions:['Reset the middle of the day with a track that changes the room.','A short music break can make a long afternoon feel smaller.','Switch the song, switch the pace.','The best reset button is sometimes three minutes long.','Let the next track pull you out of autopilot.','Lunch break, study break, work break—music fits all three.','Do not chase the perfect queue. Start with one good song.','Keep the momentum, lose the noise.','A familiar chorus can be a useful checkpoint.','The afternoon gets easier when the soundtrack stops feeling accidental.'],
    hero:['Reset your pace.','Find a better middle.','Change the room with one track.'] },
  { key:'afternoon', from:15, to:18,
    greetings:['Good afternoon.','Afternoon energy.','Keep the day moving.','Your next-song window is open.'],
    captions:['A little energy now can carry the rest of the day.','Queue the song that makes the next task feel shorter.','Turn the background into something worth noticing.','This is a good hour for rediscovering an old favorite.','Let the beat do some of the heavy lifting.','The day is not over; the playlist should not sound tired either.','One strong track can rescue an ordinary afternoon.','Keep what works, skip what does not, follow the mood.','If the pace drops, change the song before you change the plan.','Afternoons are better with a little bass and fewer decisions.'],
    hero:['Lift the pace. Keep going.','Give the afternoon a pulse.','Find the track that carries you forward.'] },
  { key:'evening', from:18, to:22,
    greetings:['Good evening.','Evening sounds better here.','Slow down. Turn it up.','The day is winding down.'],
    captions:['Let the day end before the music does.','Evenings are for songs you can actually listen to.','Turn down the rush and turn up the details.','A good evening queue should feel like changing the lighting.','Keep the songs that stayed with you today.','This is where the background music gets to become the main thing.','Let one track lead to another without overthinking it.','The right song can make an ordinary evening feel cinematic.','Take the long version. You have time now.','Close a few tabs in your head; leave the music open.'],
    hero:['Unwind in your own frequency.','Let the evening find its sound.','Stay with the songs that feel right.'] },
  { key:'night', from:22, to:24,
    greetings:['Good night.','Night mode for your ears.','One last queue?','The late playlist is open.'],
    captions:['End the day with something you will want to hear again tomorrow.','Keep the lights low and the transitions smooth.','Night listening is less about volume and more about detail.','Let the final songs be slower than the day was.','A familiar voice can make a late hour feel less empty.','Save the loud tracks for tomorrow; keep the good ones now.','The day can stop. The music does not have to.','Pick something warm, something spacious, something worth staying for.','A quiet track can carry more weight at night.','If you are still listening, make the next song count.'],
    hero:['Finish the day in tune.','Let the last songs linger.','Slow the room down.'] }
];
const HOME_LABELS = ['YOUR MUSIC. YOUR SPACE.','LISTEN YOUR WAY.','A MOMENT, IN SOUND.','YOUR QUEUE. YOUR MOOD.','DINECHO, TUNED TO YOU.','PRESS PLAY. STAY PRESENT.'];
let homeMomentTimer = 0;
function homeMomentHash(now, salt=0){
  const key = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}-${now.getHours()}-${Math.floor(now.getMinutes()/12)}-${salt}`;
  let h=2166136261; for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619);} return h>>>0;
}
function homeMomentPick(list, now, salt){ return list[homeMomentHash(now,salt)%list.length]; }
function updateHomeMoment(force=false){
  const now=new Date(), hour=now.getHours();
  const band=HOME_MOMENTS.find(x=>hour>=x.from&&hour<x.to)||HOME_MOMENTS[2];
  const greet=document.getElementById('homeGreeting')||document.querySelector('.greet');
  const caption=document.getElementById('homeCaption')||document.querySelector('.tagline');
  const label=document.getElementById('homeHeroLabel');
  const title=document.getElementById('homeHeroTitle');
  if(greet)greet.textContent=homeMomentPick(band.greetings,now,1);
  if(caption)caption.textContent=homeMomentPick(band.captions,now,2);
  if(label)label.textContent=homeMomentPick(HOME_LABELS,now,3);
  if(title){const line=homeMomentPick(band.hero,now,4);title.innerHTML=line.replace(/\. /,'.<br/>');}
  document.body.dataset.daypart=band.key;
  if(force||!homeMomentTimer){clearInterval(homeMomentTimer);homeMomentTimer=setInterval(updateHomeMoment,60000);}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateHomeMoment(false);});

// ================= Startup =================
(async function init() {
  updateHomeMoment(true);
  updateLyricsVisual(null);
  applyTheme(localStorage.getItem(STORAGE.theme) || 'golden');
  applyLyricsThemeFx(localStorage.getItem(STORAGE.lyricsThemeFx) !== 'false');
  applyGlassOpacity(localStorage.getItem(STORAGE.glassOpacity) || '58');
  applyVolumeSettings(localStorage.getItem(STORAGE.volume) || '100', localStorage.getItem(STORAGE.muted) === 'true');
  applyFluidSettings(localStorage.getItem(STORAGE.fluidIntensity) || '100', localStorage.getItem(STORAGE.fluidPreset) || 'aurora');
  playQueue = getStored(STORAGE.queue, []).map(queueSong).filter(Boolean);
  registerSongs(playQueue);
  registerSongs(getLikedSongs());
  registerSongs(getStored(STORAGE.recent, []));
  queueIndex = -1;
  loopMode = ['off', 'all', 'one'].includes(localStorage.getItem(STORAGE.loop)) ? localStorage.getItem(STORAGE.loop) : 'off';
  shuffleEnabled = localStorage.getItem(STORAGE.shuffle) === 'true';
  updateQueueControls(); renderQueue();
  updatePlayIcon(); syncPlayerLikeState(); syncPlayerDownloadState();
  await loadLibrary();
  renderRecentlyPlayed();
  renderLikedSongs();
  renderPlaylists();
  loadHomeContent();
})();

// ================= Dinecho v1.4.2 Smart Immersive Player =================
Object.assign(STORAGE, {
  smartHistory: 'dinecho-smart-history-v1',
  playStats: 'dinecho-play-stats-v1',
  progress: 'dinecho-resume-progress-v1',
  recommendations: 'dinecho-recommendations-v2',
  preferenceSignals: 'dinecho-preference-signals-v2',
  recentSearches: 'dinecho-recent-searches-v1',
  searchType: 'dinecho-search-type-v1',
  crossfade: 'dinecho-crossfade-v1',
  gapless: 'dinecho-gapless-v1',
  audioQuality: 'dinecho-audio-quality-v1',
  normalization: 'dinecho-normalization-v1',
  channelMode: 'dinecho-channel-mode-v1',
  eqPreset: 'dinecho-eq-preset-v1',
  eqBands: 'dinecho-eq-bands-v1',
  lyricsFontSize: 'dinecho-lyrics-font-size-v1',
  miniAlwaysOnTop: 'dinecho-mini-on-top-v1',
  clearAfterCurrent: 'dinecho-clear-after-current-v1'
});

const continueGrid = document.getElementById('continueGrid');
const continueHint = document.getElementById('continueHint');
const madeForYouGrid = document.getElementById('madeForYouGrid');
const madeForYouHint = document.getElementById('madeForYouHint');
const becauseGrid = document.getElementById('becauseGrid');
const becauseHint = document.getElementById('becauseHint');
const becauseTitle = document.getElementById('becauseTitle');
const searchTypeTabs = document.getElementById('searchTypeTabs');
const recentSearchesEl = document.getElementById('recentSearches');
const clearRecentSearchesBtn = document.getElementById('clearRecentSearchesBtn');
const historyGroups = document.getElementById('historyGroups');
const historyHint = document.getElementById('historyHint');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const saveQueueBtn = document.getElementById('saveQueueBtn');
const clearAfterCurrentBtn = document.getElementById('clearAfterCurrentBtn');
const playerRadioBtn = document.getElementById('playerRadioBtn');

let smartSearchType = localStorage.getItem(STORAGE.searchType) || 'songs';
let smartRecommendationBusy = false;
let smartRadioState = { active: false, seed: null, query: '', loading: false };
let smartProgressWriteAt = 0;
let smartClearAfterCurrent = localStorage.getItem(STORAGE.clearAfterCurrent) === 'true';
const smartPreparedStreamUrls = new Map();

function smartUniqueSongs(items) {
  const seen = new Set();
  return (items || []).map(queueSong).filter(song => {
    if (!song?.id || seen.has(song.id)) return false;
    seen.add(song.id); return true;
  });
}

function smartRecordHistory(song) {
  const clean = normalizeSong(song);
  if (!clean?.id) return;
  let history = getStored(STORAGE.smartHistory, []);
  history.unshift({ song: clean, playedAt: Date.now() });
  history = history.slice(0, 50);
  setStored(STORAGE.smartHistory, history);
  const stats = getStored(STORAGE.playStats, {});
  const current = stats[clean.id] || { song: clean, count: 0, lastPlayed: 0 };
  current.song = clean; current.count = Number(current.count || 0) + 1; current.lastPlayed = Date.now();
  stats[clean.id] = current;
  const entries = Object.entries(stats).sort((a,b) => Number(b[1]?.lastPlayed || 0) - Number(a[1]?.lastPlayed || 0)).slice(0, 300);
  setStored(STORAGE.playStats, Object.fromEntries(entries));
  const historyVisible=document.getElementById('historyView')?.classList.contains('active');
  if(historyVisible) smartRunIdle(renderSmartHistory,420);
}

function smartSaveProgress() {
  if (!currentSong?.id || !Number.isFinite(audioPlayer.duration) || audioPlayer.duration <= 0) return;
  const now = Date.now();
  if (now - smartProgressWriteAt < 1500) return;
  smartProgressWriteAt = now;
  const progress = getStored(STORAGE.progress, {});
  const current = Number(audioPlayer.currentTime || 0);
  const remaining = audioPlayer.duration - current;
  if (current >= 8 && remaining >= 15) {
    progress[currentSong.id] = { song: normalizeSong(currentSong), current, duration: audioPlayer.duration, updatedAt: now };
  } else if (remaining < 15 || current < 3) {
    delete progress[currentSong.id];
  }
  const trimmed = Object.fromEntries(Object.entries(progress).sort((a,b) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0)).slice(0, 40));
  setStored(STORAGE.progress, trimmed);
}

function smartClearFinishedProgress() {
  if (!currentSong?.id) return;
  const progress = getStored(STORAGE.progress, {});
  if (progress[currentSong.id]) { delete progress[currentSong.id]; setStored(STORAGE.progress, progress); }
}

function smartBuildResumeCard(entry) {
  const song = queueSong(entry.song);
  const card = document.createElement('div'); card.className = 'song-card continue-card';
  const img = document.createElement('img'); img.src = song.thumbnail || DEFAULT_THUMB; img.alt = '';
  const title = document.createElement('div'); title.className = 'card-title'; title.textContent = song.title;
  const sub = document.createElement('div'); sub.className = 'card-sub'; sub.textContent = song.channel || '';
  const play = document.createElement('button'); play.className = 'card-play'; play.innerHTML = icon('play'); play.title = 'Resume';
  const progress = document.createElement('div'); progress.className = 'continue-progress';
  const fill = document.createElement('i'); fill.style.width = `${Math.max(2, Math.min(98, (entry.current / Math.max(1, entry.duration)) * 100))}%`; progress.appendChild(fill);
  const quick = document.createElement('div'); quick.className = 'card-queue-actions';
  const next = document.createElement('button'); next.innerHTML = icon('next'); next.title='Play next'; next.setAttribute('aria-label','Play next'); next.onclick = e => { e.stopPropagation(); addPlayNext(song); };
  const radio = document.createElement('button'); radio.innerHTML = icon('radio'); radio.title='Start radio'; radio.setAttribute('aria-label','Start radio'); radio.className = 'card-radio-btn'; radio.onclick = e => { e.stopPropagation(); startSongRadio(song); };
  quick.append(next, radio); card.append(img, title, sub, play, progress, quick);
  const resume = async e => { if (e) e.stopPropagation(); smartRestoreBaseVolume(); await startSingleSong(song, play); if (currentSong?.id === song.id && Number.isFinite(entry.current)) { try { audioPlayer.currentTime = Math.min(entry.current, Math.max(0, (audioPlayer.duration || entry.duration) - 3)); syncLyrics(true); } catch (_) {} } };
  card.addEventListener('click', resume); play.addEventListener('click', resume);
  return card;
}

function renderContinueListening() {
  if (!continueGrid || !continueHint) return;
  const items = Object.values(getStored(STORAGE.progress, {})).sort((a,b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)).slice(0, 6);
  continueGrid.innerHTML = ''; continueHint.style.display = items.length ? 'none' : 'block';
  items.forEach(item => item?.song && continueGrid.appendChild(smartBuildResumeCard(item)));
}

function smartPreferenceSignals(){ return getStored(STORAGE.preferenceSignals, {}); }
function smartRecordPreferenceSignal(song, kind, amount=1){
  const clean=queueSong(song); if(!clean?.id)return;
  const all=smartPreferenceSignals();
  const row=all[clean.id]||{song:clean,likes:0,skips:0,completes:0,lastSignal:0};
  row.song=clean; row.lastSignal=Date.now();
  if(kind==='like') row.likes=Math.max(0,Number(row.likes||0)+amount);
  if(kind==='skip') row.skips=Math.max(0,Number(row.skips||0)+amount);
  if(kind==='complete') row.completes=Math.max(0,Number(row.completes||0)+amount);
  all[clean.id]=row;
  const trimmed=Object.fromEntries(Object.entries(all).sort((a,b)=>Number(b[1]?.lastSignal||0)-Number(a[1]?.lastSignal||0)).slice(0,400));
  setStored(STORAGE.preferenceSignals,trimmed);
}
function smartRecordLikeSignal(song,liked){ smartRecordPreferenceSignal(song,'like',liked?1:-1); }
function smartRecordSkipSignal(song){
  if(!song?.id||!audioPlayer.src||audioPlayer.ended)return;
  const cur=Number(audioPlayer.currentTime||0),dur=Number(audioPlayer.duration||0);
  const early=dur>0?cur/dur<.58:cur<75;
  if(cur>=3&&early)smartRecordPreferenceSignal(song,'skip',cur<18?1.35:1);
}
function smartRecordCompletionSignal(song){ if(song?.id)smartRecordPreferenceSignal(song,'complete',1); }

function smartRecommendationProfile(){
  const now=Date.now(), stats=getStored(STORAGE.playStats, {}), signals=smartPreferenceSignals();
  const liked=new Set(getLikedSongs().map(s=>s.id));
  const recent=getStored(STORAGE.recent, []); const recency=new Map(recent.map((s,i)=>[s.id,Math.max(0,4-i*.32)]));
  const map=new Map();
  const put=(song)=>{const clean=queueSong(song);if(clean?.id&&!map.has(clean.id))map.set(clean.id,clean);};
  Object.values(stats).forEach(x=>put(x?.song)); Object.values(signals).forEach(x=>put(x?.song)); getLikedSongs().forEach(put); recent.forEach(put);
  const ranked=[];
  for(const song of map.values()){
    const st=stats[song.id]||{}, sig=signals[song.id]||{};
    const ageH=Math.max(0,(now-Number(st.lastPlayed||sig.lastSignal||now))/3600000);
    const recentBoost=Math.max(0,3.2-Math.log2(1+ageH)*.46);
    const score=(liked.has(song.id)?7.5:0)+Math.log2(1+Number(st.count||0))*3.1+Number(sig.completes||0)*2.25-Number(sig.skips||0)*2.9+Number(sig.likes||0)*2.1+(recency.get(song.id)||0)+recentBoost;
    ranked.push({song,score,stats:st,signals:sig});
  }
  ranked.sort((a,b)=>b.score-a.score);
  return ranked;
}
function smartRecommendationSeeds(limit=4){
  const ranked=smartRecommendationProfile(), out=[], channels=new Map();
  for(const row of ranked){
    const ch=(row.song.channel||'').toLowerCase(); const used=channels.get(ch)||0;
    if(used>=2&&out.length<2)continue;
    if(Number(row.signals?.skips||0)>Number(row.signals?.completes||0)+3&&!getLikedSongs().some(x=>x.id===row.song.id))continue;
    out.push(row.song); channels.set(ch,used+1); if(out.length>=limit)break;
  }
  return out;
}
function smartRecommendationSeed(){ return smartRecommendationSeeds(1)[0]||queueSong(getStored(STORAGE.recent, [])[0])||queueSong(getLikedSongs()[0]); }
function smartRecommendationCache(){ return getStored(STORAGE.recommendations,{profileKey:'',updatedAt:0,seeds:[],songs:[],bySeed:[]}); }
function smartTextTokens(value){return new Set(String(value||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(x=>x.length>2));}
function smartSimilarityScore(song,seeds){
  const title=smartTextTokens(song.title), channel=String(song.channel||'').toLowerCase(); let score=0;
  seeds.forEach((seed,idx)=>{const weight=Math.max(.6,1.4-idx*.22);if(channel&&seed.channel&&channel.includes(String(seed.channel).toLowerCase().slice(0,18)))score+=2.2*weight;const seedTokens=smartTextTokens(seed.title);for(const t of seedTokens)if(title.has(t))score+=.28*weight;});
  return score;
}
async function smartRefreshRecommendations(force=false){
  const seeds=smartRecommendationSeeds(4); if(!seeds.length||smartRecommendationBusy){renderSmartHomeRecommendations();return;}
  const profileKey=seeds.map(s=>s.id).join('|'), cached=smartRecommendationCache();
  if(!force&&cached.profileKey===profileKey&&Date.now()-Number(cached.updatedAt||0)<2*60*60*1000&&cached.songs?.length){renderSmartHomeRecommendations();return;}
  smartRecommendationBusy=true;
  try{
    const queries=[];
    seeds.slice(0,3).forEach((seed,idx)=>{queries.push({seed,idx,q:`${seed.title} ${seed.channel||''} similar songs official audio`});if(idx<2&&seed.channel)queries.push({seed,idx,q:`${seed.channel} best songs official audio`});});
    const settled=await Promise.allSettled(queries.slice(0,5).map(x=>window.echoAPI.search(x.q)));
    const scored=new Map(), bySeed=new Map();
    settled.forEach((result,qIndex)=>{if(result.status!=='fulfilled'||!Array.isArray(result.value))return;const meta=queries[qIndex];const seedList=bySeed.get(meta.seed.id)||[];result.value.slice(0,22).forEach((raw,pos)=>{const song=queueSong(raw);if(!song?.id||seeds.some(s=>s.id===song.id))return;seedList.push(song);const current=scored.get(song.id)||{song,score:0};current.score+=(24-pos)*.12+(5-qIndex)*.32+smartSimilarityScore(song,seeds);scored.set(song.id,current);});bySeed.set(meta.seed.id,smartUniqueSongs(seedList).slice(0,18));});
    const songs=[...scored.values()].sort((a,b)=>b.score-a.score).map(x=>x.song).slice(0,36);
    const payload={profileKey,updatedAt:Date.now(),seeds:seeds.map(normalizeSong),songs,bySeed:seeds.map(s=>({seed:normalizeSong(s),songs:bySeed.get(s.id)||[]}))};
    setStored(STORAGE.recommendations,payload);registerSongs(songs);
  }catch(_){}finally{smartRecommendationBusy=false;renderSmartHomeRecommendations();}
}
function renderSmartHomeRecommendations(){
  if(!madeForYouGrid||!becauseGrid)return;
  const cached=smartRecommendationCache(), profile=smartRecommendationProfile();
  const familiar=smartUniqueSongs([...getLikedSongs(),...profile.map(x=>x.song),...getStored(STORAGE.recent,[])]), familiarIds=new Set(familiar.map(s=>s.id));
  const discovery=smartUniqueSongs(cached.songs||[]).filter(s=>!familiarIds.has(s.id));
  const made=smartUniqueSongs([...discovery,...familiar]).slice(0,6);
  const lead=cached.bySeed?.find(x=>x?.songs?.length)||null;
  const because=smartUniqueSongs(lead?.songs||cached.songs||[]).filter(s=>s.id!==lead?.seed?.id).slice(0,6);
  madeForYouGrid.innerHTML='';becauseGrid.innerHTML='';
  madeForYouHint.style.display=made.length?'none':'block';becauseHint.style.display=because.length?'none':'block';
  const madeCtx=makeContext(made,'made-for-you','Made For You','made-for-you');made.forEach(song=>madeForYouGrid.appendChild(buildSongCard(song,madeCtx)));
  const becauseCtx=makeContext(because,'because','Because You Listened To','because');because.forEach(song=>becauseGrid.appendChild(buildSongCard(song,becauseCtx)));
  if(becauseTitle)becauseTitle.textContent=lead?.seed?.title?`Because You Listened To “${lead.seed.title}”`:(cached.seeds?.[0]?.title?`Because You Listened To “${cached.seeds[0].title}”`:'Because You Listened To');
  const subtitle=madeForYouGrid?.closest('.home-section')?.querySelector('.section-head span');if(subtitle)subtitle.textContent='Learns from likes, repeats, completions, skips & recency';
}

function renderSmartHome() {
  renderContinueListening();
  renderSmartHomeRecommendations();
}

function smartHistoryBucket(ts) {
  const d = new Date(ts), now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 86400000;
  const startWeek = startToday - 6 * 86400000;
  if (d.getTime() >= startToday) return 'Today';
  if (d.getTime() >= startYesterday) return 'Yesterday';
  if (d.getTime() >= startWeek) return 'This Week';
  return 'Earlier';
}

function smartDeleteHistoryEntry(item) {
  if (!item?.song?.id) return;
  let entries = getStored(STORAGE.smartHistory, []).slice(0, 50);
  const index = entries.findIndex(entry => entry?.song?.id === item.song.id && Number(entry.playedAt) === Number(item.playedAt));
  if (index >= 0) entries.splice(index, 1);
  setStored(STORAGE.smartHistory, entries.slice(0, 50));

  // Keep recommendation play-counts consistent with what the user removed from history.
  const stats = getStored(STORAGE.playStats, {});
  const stat = stats[item.song.id];
  if (stat) {
    stat.count = Math.max(0, Number(stat.count || 0) - 1);
    if (stat.count <= 0) delete stats[item.song.id];
    else stats[item.song.id] = stat;
    setStored(STORAGE.playStats, stats);
  }
  renderSmartHistory();
  renderSmartHomeRecommendations();
  showToast('History se song remove ho gaya');
}

function renderSmartHistory() {
  if (!historyGroups || !historyHint) return;
  let entries = getStored(STORAGE.smartHistory, []).filter(item => item?.song).slice(0, 50).map(item => ({...item, song: normalizeSong(item.song)}));
  // Repair old malformed one-letter/placeholder titles from the known-song registry when possible.
  entries = entries.filter(item => item.song?.id);
  // One-time migration for older builds that stored as many as 500 plays.
  const storedEntries = getStored(STORAGE.smartHistory, []);
  if (storedEntries.length !== entries.length) setStored(STORAGE.smartHistory, entries);
  historyGroups.innerHTML = ''; historyHint.style.display = entries.length ? 'none' : 'block';
  const grouped = new Map();
  entries.forEach(item => { const key = smartHistoryBucket(item.playedAt); if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(item); });
  ['Today','Yesterday','This Week','Earlier'].forEach(label => {
    const list = grouped.get(label); if (!list?.length) return;
    const section = document.createElement('section'); section.className = 'history-group';
    const head = document.createElement('div'); head.className = 'history-group-head'; head.innerHTML = `<strong>${label}</strong><span>${list.length} plays</span>`; section.appendChild(head);
    list.forEach(item => {
      const row = buildSongRow(item.song, false, makeContext([item.song], 'history', 'History', 'history'));
      const actions = row.querySelector('.song-actions');
      const time = document.createElement('span'); time.className = 'history-time'; time.textContent = new Date(item.playedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); row.insertBefore(time, actions);
      if (actions) {
        const del = document.createElement('button');
        del.type = 'button'; del.className = 'history-delete-btn danger'; del.textContent = 'Delete'; del.title = 'Remove this play from history';
        del.addEventListener('click', event => { event.stopPropagation(); smartDeleteHistoryEntry(item); });
        actions.appendChild(del);
      }
      section.appendChild(row);
    });
    historyGroups.appendChild(section);
  });
}

function smartRememberSearch(query) {
  const q = String(query || '').trim(); if (!q) return;
  let recent = getStored(STORAGE.recentSearches, []); recent = [q, ...recent.filter(v => v.toLowerCase() !== q.toLowerCase())].slice(0, 8); setStored(STORAGE.recentSearches, recent); renderRecentSearches();
}
function renderRecentSearches() {
  if (!recentSearchesEl) return; recentSearchesEl.innerHTML = '';
  const recent = getStored(STORAGE.recentSearches, []).slice(0, 5);
  recent.forEach(q => { const b=document.createElement('button'); b.className='recent-search-chip'; b.textContent=q; b.onclick=()=>{ searchInput.value=q; runSearch('song',q); }; recentSearchesEl.appendChild(b); });
  clearRecentSearchesBtn?.classList.toggle('hidden', recent.length === 0 && !searchInput?.value?.trim());
}
function smartClearAllSearch() {
  setStored(STORAGE.recentSearches, []);
  if (searchInput) searchInput.value = '';
  if (resultsList) { resultsList.innerHTML = ''; resultsList.classList.remove('search-collection-grid'); }
  if (searchViewTitle) searchViewTitle.textContent = 'Search Results';
  if (searchModeText) searchModeText.textContent = 'Songs matching your search';
  if (searchHint) searchHint.textContent = 'Search for a song above to get started.';
  renderRecentSearches();
  showToast('Search cleared');
}
clearRecentSearchesBtn?.addEventListener('click', smartClearAllSearch);
function smartSetSearchType(type) {
  smartSearchType = ['songs','artists','albums','playlists'].includes(type) ? type : 'songs'; localStorage.setItem(STORAGE.searchType, smartSearchType);
  document.querySelectorAll('[data-search-type]').forEach(btn => btn.classList.toggle('active', btn.dataset.searchType === smartSearchType));
}

function smartSearchCollectionCard(title, subtitle, songs, type) {
  const card=document.createElement('article'); card.className='search-collection-card';
  const img=document.createElement('img'); img.src=songs[0]?.thumbnail||DEFAULT_THUMB; img.alt='';
  const h=document.createElement('h3'); h.textContent=title; const p=document.createElement('p'); p.textContent=`${subtitle} · ${songs.length} songs`;
  const actions=document.createElement('div'); actions.className='playlist-card-actions';
  const open=document.createElement('button'); open.textContent='Open'; open.className='playlist-open-btn';
  const play=document.createElement('button'); play.textContent='Play'; play.className='playlist-play-btn';
  open.onclick=()=>smartOpenSearchCollection(title,songs,type); play.onclick=()=>playSongCollection(songs,title,{type:`search-${type}`,key:`search-${type}:${title}`},play);
  actions.append(open,play);
  if(type==='artists'){const radio=document.createElement('button');radio.textContent='Artist Radio';radio.className='playlist-open-btn song-radio-btn';radio.onclick=()=>startArtistRadio(title,songs);actions.appendChild(radio);}
  card.append(img,h,p,actions); return card;
}
function smartOpenSearchCollection(title,songs,type) {
  resultsList.classList.remove('search-collection-grid'); resultsList.innerHTML=''; searchViewTitle.textContent=title; searchModeText.textContent=`${songs.length} songs · ${type}`;
  const back=document.createElement('button'); back.className='secondary-btn'; back.textContent=`← Back to ${type}`; back.style.marginBottom='10px'; back.onclick=()=>runSearch('song',searchInput.value); resultsList.appendChild(back);
  const ctx=makeContext(songs,`search-${type}`,title,`search-${type}:${title}`); songs.forEach(song=>resultsList.appendChild(buildSongRow(song,false,ctx)));
}
function smartRenderSearchCollections(type, query, songs) {
  resultsList.innerHTML=''; resultsList.classList.add('search-collection-grid');
  const collections=[];
  if (type==='artists') {
    const groups=new Map(); songs.forEach(song=>{const key=(song.channel||'Unknown Artist').trim(); if(!groups.has(key))groups.set(key,[]); groups.get(key).push(song);});
    [...groups.entries()].slice(0,12).forEach(([name,items])=>collections.push({title:name,subtitle:'Artist',songs:items.slice(0,12)}));
  } else {
    const chunk= type==='albums' ? 5 : 7;
    for(let i=0;i<songs.length;i+=chunk){ const part=songs.slice(i,i+chunk); if(!part.length)continue; collections.push({title:type==='albums'?`${query} · Album Mix ${Math.floor(i/chunk)+1}`:`${query} · Playlist ${Math.floor(i/chunk)+1}`,subtitle:type==='albums'?'Album mix':'Playlist mix',songs:part}); }
  }
  searchHint.textContent=collections.length?'':'No results found.';
  collections.forEach(c=>resultsList.appendChild(smartSearchCollectionCard(c.title,c.subtitle,c.songs,type)));
}

const v140RunSearchBase = runSearch;
runSearch = async function(mode='song', overrideQuery='') {
  const q=(overrideQuery||searchInput.value||'').trim(); if(!q)return;
  smartRememberSearch(q);
  if (mode==='artist' || smartSearchType==='songs') {
    resultsList.classList.remove('search-collection-grid');
    return v140RunSearchBase(mode,overrideQuery);
  }
  activateTab('search'); resultsList.innerHTML=''; searchHint.textContent='Searching...';
  const label=smartSearchType[0].toUpperCase()+smartSearchType.slice(1); searchViewTitle.textContent=`${label}: ${q}`; searchModeText.textContent=`Browse ${smartSearchType} before playing`;
  try {
    const query = smartSearchType==='artists' ? `${q} best songs official audio` : smartSearchType==='albums' ? `${q} full album official audio` : `${q} playlist mix songs`;
    const results = smartSearchType==='artists' ? await window.echoAPI.searchArtist(q) : await window.echoAPI.search(query);
    if(results?.error){searchHint.textContent='Error: '+results.error;return;} if(!Array.isArray(results)||!results.length){searchHint.textContent='No results found.';return;}
    registerSongs(results); smartRenderSearchCollections(smartSearchType,q,results);
  } catch(err){searchHint.textContent='Search failed: '+err.message;}
};

if (searchTypeTabs) searchTypeTabs.addEventListener('click', event => {
  const btn=event.target.closest('[data-search-type]'); if(!btn)return; smartSetSearchType(btn.dataset.searchType); if(searchInput.value.trim()) runSearch('song');
});
smartSetSearchType(smartSearchType); renderRecentSearches();

async function smartFetchRadioSongs(seed, extraQuery='') {
  const q=`${seed.title} ${seed.channel||''} ${extraQuery||'radio similar songs'} official audio`;
  const results=await window.echoAPI.search(q); if(!Array.isArray(results))return[];
  return smartUniqueSongs(results.filter(s=>s.id!==seed.id));
}
async function startArtistRadio(artist, seedSongs=[]) {
  const label=String(artist||'Artist').trim(); if(!label)return;
  smartRadioState={active:true,seed:queueSong(seedSongs[0])||null,query:label,loading:true}; playerRadioBtn?.classList.add('active-mode'); showToast(`Building ${label} Radio...`);
  try{const found=await window.echoAPI.searchArtist(label);const items=smartUniqueSongs([...(seedSongs||[]),...(Array.isArray(found)?found:[])]);if(!items.length){showToast('Artist Radio ke songs nahi mile');smartRadioState.active=false;playerRadioBtn?.classList.remove('active-mode');return;}smartRadioState.seed=items[0];setActiveContext(makeContext(items,'radio',`${label} Radio`,`artist-radio:${label}`),items[0]);shuffleEnabled=false;updateQueueControls();await playContextAt(0);showToast(`${label} Radio ready · ${items.length} songs`);}catch(_){showToast('Artist Radio load nahi hua');smartRadioState.active=false;playerRadioBtn?.classList.remove('active-mode');}finally{smartRadioState.loading=false;}
}

async function startSongRadio(song=currentSong) {
  const seed=queueSong(song); if(!seed)return;
  playerRadioBtn?.classList.add('active-mode'); smartRadioState={active:true,seed,query:seed.title,loading:true}; showToast(`Building radio for ${seed.title}...`);
  try {
    const similar=await smartFetchRadioSongs(seed); const items=smartUniqueSongs([seed,...similar]);
    if(items.length<2){showToast('Radio ke liye similar songs nahi mile'); smartRadioState.active=false; playerRadioBtn?.classList.remove('active-mode'); return;}
    setActiveContext(makeContext(items,'radio',`Radio · ${seed.title}`,`radio:${seed.id}`),seed); shuffleEnabled=false; updateQueueControls();
    if(currentSong?.id!==seed.id) await playContextAt(0); else { activeContext.index=0; currentPlaybackSource='context'; prefetchNextQueued(); }
    showToast(`Radio ready · ${items.length} songs`);
  } catch(err){showToast('Radio load nahi hua'); smartRadioState.active=false; playerRadioBtn?.classList.remove('active-mode');}
  finally{smartRadioState.loading=false;}
}
async function smartExtendRadioIfNeeded() {
  if(!smartRadioState.active||smartRadioState.loading||activeContext?.type!=='radio'||!activeContext.items?.length)return;
  if(activeContext.index < activeContext.items.length-3)return;
  smartRadioState.loading=true;
  try {
    const pivot=activeContext.items[activeContext.items.length-1]||smartRadioState.seed; const more=await smartFetchRadioSongs(pivot,'radio discovery');
    const existing=new Set(activeContext.items.map(s=>s.id)); const additions=more.filter(s=>!existing.has(s.id)).slice(0,12);
    if(additions.length){ activeContext.items.push(...additions.map(queueSong)); activeContext.originalItems.push(...additions.map(queueSong)); registerSongs(additions); }
  } catch(_){} finally{smartRadioState.loading=false;}
}

const v140BuildSongCardBase = buildSongCard;
buildSongCard = function(song, contextSpec=null) {
  const card=v140BuildSongCardBase(song,contextSpec); const quick=card.querySelector('.card-queue-actions');
  if(quick && !quick.querySelector('.card-radio-btn')){const radio=document.createElement('button');radio.innerHTML=icon('radio');radio.title='Start song radio';radio.setAttribute('aria-label','Start song radio');radio.className='card-radio-btn';radio.addEventListener('click',e=>{e.stopPropagation();startSongRadio(song);});quick.appendChild(radio);} return card;
};
const v140BuildSongRowBase = buildSongRow;
buildSongRow = function(song,isLibrary,contextSpec=null){const row=v140BuildSongRowBase(song,isLibrary,contextSpec);const actions=row.querySelector('.song-actions');if(actions){const iconize=(sel,name,label)=>{const b=actions.querySelector(sel);if(b){b.innerHTML=icon(name);b.classList.add('row-icon');b.title=label;b.setAttribute('aria-label',label);}};iconize('.action-next','next','Play next');iconize('.action-queue','queue','Add to queue');if(!actions.querySelector('.song-radio-btn')){const radio=document.createElement('button');radio.innerHTML=icon('radio');radio.title='Start radio';radio.setAttribute('aria-label','Start radio');radio.className='song-radio-btn row-icon';radio.addEventListener('click',e=>{e.stopPropagation();startSongRadio(song);});actions.appendChild(radio);}}return row;};

const v140SetActiveContextBase = setActiveContext;
setActiveContext = function(contextSpec,song=null,options={}){v140SetActiveContextBase(contextSpec,song,options);if(activeContext?.type!=='radio'){smartRadioState.active=false;playerRadioBtn?.classList.remove('active-mode');}};
const v140PlayNextBase = playNext;
playNext = async function(options={}){await smartExtendRadioIfNeeded();if(!options?.auto)smartRestoreBaseVolume();return v140PlayNextBase(options);};

playerRadioBtn?.addEventListener('click',()=>{if(currentSong)startSongRadio(currentSong);else showToast('Pehle koi song play karo');});
clearHistoryBtn?.addEventListener('click',()=>{setStored(STORAGE.smartHistory,[]);setStored(STORAGE.playStats,{});renderSmartHistory();renderSmartHomeRecommendations();showToast('Listening history cleared');});

let smartHomeRefreshTimer=0, smartRecommendationRefreshTimer=0;
function smartScheduleHomeRefresh(delay=700){
  clearTimeout(smartHomeRefreshTimer);
  smartHomeRefreshTimer=setTimeout(()=>smartRunIdle(()=>{
    if(document.getElementById('homeView')?.classList.contains('active'))renderSmartHome();
  }),delay);
}
function smartScheduleRecommendationRefresh(delay=4200,force=false){
  clearTimeout(smartRecommendationRefreshTimer);
  smartRecommendationRefreshTimer=setTimeout(()=>smartRunIdle(()=>smartRefreshRecommendations(force)),delay);
}
const v140AddRecentlyPlayedBase = addRecentlyPlayed;
addRecentlyPlayed = function(song){
  v140AddRecentlyPlayedBase(song);
  smartRecordHistory(song);
  smartScheduleHomeRefresh(900);
  smartScheduleRecommendationRefresh(5200,false);
};
const v140ActivateTabBase = activateTab;
activateTab = function(tabName){
  v140ActivateTabBase(tabName);
  if(tabName==='history')smartRunIdle(renderSmartHistory,80);
  if(tabName==='home'){smartScheduleHomeRefresh(80);smartScheduleRecommendationRefresh(1200,false);}
};
const v140LoadHomeContentBase = loadHomeContent;
loadHomeContent = async function(force=false){
  const value=await v140LoadHomeContentBase(force);
  smartScheduleHomeRefresh(120);
  smartScheduleRecommendationRefresh(force?500:1800,force);
  return value;
};

audioPlayer.addEventListener('timeupdate',()=>{smartSaveProgress();});
audioPlayer.addEventListener('ended',()=>{smartClearFinishedProgress();renderContinueListening();});
window.addEventListener('beforeunload',smartSaveProgress);
renderSmartHistory(); renderSmartHome();

// ===== Smart playback, gapless prefetch, audio controls, mini + immersive player =====
const crossfadeRange = document.getElementById('crossfadeRange');
const crossfadeValue = document.getElementById('crossfadeValue');
const gaplessToggle = document.getElementById('gaplessToggle');
const audioQualitySelect = document.getElementById('audioQualitySelect');
const youtubeBrowserAuthToggle = document.getElementById('youtubeBrowserAuthToggle');
const youtubeBrowserSelect = document.getElementById('youtubeBrowserSelect');
const youtubeAccessState = document.getElementById('youtubeAccessState');
const normalizationToggle = document.getElementById('normalizationToggle');
const channelModeSelect = document.getElementById('channelModeSelect');
const eqPresetSelect = document.getElementById('eqPresetSelect');
const eqBands = document.getElementById('eqBands');
const eqStatus = document.getElementById('eqStatus');
const bassQuickRange = document.getElementById('bassQuickRange');
const bassQuickValue = document.getElementById('bassQuickValue');
const midQuickRange = document.getElementById('midQuickRange');
const midQuickValue = document.getElementById('midQuickValue');
const trebleQuickRange = document.getElementById('trebleQuickRange');
const trebleQuickValue = document.getElementById('trebleQuickValue');
const miniPlayerBtn = document.getElementById('miniPlayerBtn');
const openMiniPlayerSettingBtn = document.getElementById('openMiniPlayerSettingBtn');
const miniAlwaysOnTopToggle = document.getElementById('miniAlwaysOnTopToggle');
const immersiveBtn = document.getElementById('immersiveBtn');
const immersivePlayer = document.getElementById('immersivePlayer');
const immersiveBack10Btn = document.getElementById('immersiveBack10Btn');
const immersiveForward10Btn = document.getElementById('immersiveForward10Btn');
const immersiveBackdrop = document.getElementById('immersiveBackdrop');
const immersiveArt = document.getElementById('immersiveArt');
const immersiveTitle = document.getElementById('immersiveTitle');
const immersiveArtist = document.getElementById('immersiveArtist');
const immersivePlayBtn = document.getElementById('immersivePlayBtn');
const immersivePrevBtn = document.getElementById('immersivePrevBtn');
const immersiveNextBtn = document.getElementById('immersiveNextBtn');
const immersiveCloseBtn = document.getElementById('immersiveCloseBtn');
const immersiveProgressFill = document.getElementById('immersiveProgressFill');
const immersiveCur = document.getElementById('immersiveCur');
const immersiveDur = document.getElementById('immersiveDur');
const immersiveShell = document.getElementById('immersiveShell');
const immersiveVisualizerCanvas = document.getElementById('immersiveVisualizerCanvas');
const immersiveLikeBtn = document.getElementById('immersiveLikeBtn');
const immersiveProgressTrack = document.getElementById('immersiveProgressTrack');
const immersiveLyricsPanel = document.getElementById('immersiveLyricsPanel');
const immersiveLyricsBody = document.getElementById('immersiveLyricsBody');
const immersiveLyricsToggleBtn = document.getElementById('immersiveLyricsToggleBtn');
const likeCelebrationLayer = document.getElementById('likeCelebrationLayer');
const nowPlayingBackdrop = document.getElementById('nowPlayingBackdrop');

let smartCrossfadeActive = false;
let smartNeedsFadeIn = false;
let smartFadeTimer = 0;
let smartEqNodes = null;

function smartCrossfadeSeconds() { return Math.max(0, Math.min(12, Number(crossfadeRange?.value ?? localStorage.getItem(STORAGE.crossfade) ?? 4) || 0)); }
function smartNormalizationFactor() { return normalizationToggle?.checked ? (window.deepEchoNormalizationGain ?? 1) : 1; }
function smartBaseVolume() { return Math.max(0, Math.min(1, ((Number(volumeRange?.value) || 0) / 100) * smartNormalizationFactor())); }
function clearSmartFadeTimer() {
  if (smartFadeTimer) { clearInterval(smartFadeTimer); smartFadeTimer = 0; }
}
function smartRestoreBaseVolume() {
  clearSmartFadeTimer();
  smartCrossfadeActive = false;
  if (!audioPlayer.muted) audioPlayer.volume = smartBaseVolume();
}

function smartFadeInAfterTransition() {
  if (!smartNeedsFadeIn || audioPlayer.muted) return;
  smartNeedsFadeIn = false;
  clearSmartFadeTimer();
  const seconds = smartCrossfadeSeconds();
  const target = smartBaseVolume();
  // Background/minimized playback must never wait on visual animation frames.
  // Restore the user's volume immediately so auto-next cannot silently play at volume 0.
  if (!seconds || target <= 0 || document.hidden || !document.hasFocus() || window.__deepecchoGameMode) {
    audioPlayer.volume = target;
    return;
  }
  const started = performance.now();
  const durationMs = Math.max(260, seconds * 700);
  audioPlayer.volume = 0;
  smartFadeTimer = setInterval(() => {
    const p = Math.min(1, (performance.now() - started) / durationMs);
    audioPlayer.volume = Math.max(0, Math.min(1, target * (1 - Math.pow(1 - p, 2))));
    if (p >= 1 || audioPlayer.paused) {
      audioPlayer.volume = target;
      clearSmartFadeTimer();
    }
  }, 30);
}

function smartCrossfadeTick() {
  const seconds = smartCrossfadeSeconds();
  if (!seconds || loopMode === 'one' || audioPlayer.paused || !Number.isFinite(audioPlayer.duration) || audioPlayer.duration <= 0) return;
  const remaining = audioPlayer.duration - audioPlayer.currentTime;
  if (remaining <= seconds && remaining > .05) {
    smartCrossfadeActive = true;
    const base = smartBaseVolume();
    const ratio = Math.max(.02, Math.min(1, remaining / seconds));
    if (!audioPlayer.muted) audioPlayer.volume = base * ratio;
  } else if (smartCrossfadeActive && remaining > seconds + .5) smartRestoreBaseVolume();
}

function onSmartPlaybackEnded() {
  if (smartClearAfterCurrent) clearQueue();
  smartNeedsFadeIn = smartCrossfadeSeconds() > 0;
  smartCrossfadeActive = false;
}

function smartApplyNormalization() {
  if (!smartCrossfadeActive && !smartNeedsFadeIn && !audioPlayer.muted) audioPlayer.volume = smartBaseVolume();
}

crossfadeRange.value = String(Math.max(0, Math.min(12, Number(localStorage.getItem(STORAGE.crossfade) ?? 4))));
if (crossfadeValue) crossfadeValue.textContent = `${crossfadeRange.value}s`;
crossfadeRange?.addEventListener('input',()=>{localStorage.setItem(STORAGE.crossfade,crossfadeRange.value);crossfadeValue.textContent=`${crossfadeRange.value}s`;smartRestoreBaseVolume();});
gaplessToggle.checked = localStorage.getItem(STORAGE.gapless) !== 'false';
gaplessToggle?.addEventListener('change',()=>{localStorage.setItem(STORAGE.gapless,String(gaplessToggle.checked));if(gaplessToggle.checked)prefetchNextQueued();});
audioQualitySelect.value = ['auto','high','medium','data'].includes(localStorage.getItem(STORAGE.audioQuality)) ? localStorage.getItem(STORAGE.audioQuality) : 'auto';
window.__dinechoAudioQuality = audioQualitySelect.value;
audioQualitySelect?.addEventListener('change',()=>{window.__dinechoAudioQuality=audioQualitySelect.value;localStorage.setItem(STORAGE.audioQuality,audioQualitySelect.value);smartPreparedStreamUrls.clear();prefetchNextQueued();showToast(`Streaming quality: ${audioQualitySelect.options[audioQualitySelect.selectedIndex].text}`);});
async function initYouTubeAccessSettings(){
  if(!window.echoAPI.getYouTubeAccess)return;
  try{const value=await window.echoAPI.getYouTubeAccess();if(youtubeBrowserAuthToggle)youtubeBrowserAuthToggle.checked=!!value?.enabled;if(youtubeBrowserSelect)youtubeBrowserSelect.value=['chrome','edge','brave','firefox'].includes(value?.browser)?value.browser:'chrome';if(youtubeAccessState)youtubeAccessState.textContent=value?.enabled?`Browser fallback · ${youtubeBrowserSelect?.options[youtubeBrowserSelect.selectedIndex]?.text||value.browser}`:'Smart anonymous mode';}catch(_){if(youtubeAccessState)youtubeAccessState.textContent='Smart anonymous mode';}
}
async function saveYouTubeAccessSettings(){
  if(!window.echoAPI.setYouTubeAccess)return;
  const value={enabled:!!youtubeBrowserAuthToggle?.checked,browser:youtubeBrowserSelect?.value||'chrome'};
  try{await window.echoAPI.setYouTubeAccess(value);if(youtubeAccessState)youtubeAccessState.textContent=value.enabled?`Browser fallback · ${youtubeBrowserSelect?.options[youtubeBrowserSelect.selectedIndex]?.text||value.browser}`:'Smart anonymous mode';smartPreparedStreamUrls.clear();showToast(value.enabled?'YouTube browser fallback enabled':'YouTube browser fallback disabled');}catch(error){showToast('YouTube Access setting save nahi hui');}
}
youtubeBrowserAuthToggle?.addEventListener('change',saveYouTubeAccessSettings);
youtubeBrowserSelect?.addEventListener('change',()=>{if(youtubeBrowserAuthToggle?.checked)saveYouTubeAccessSettings();});
initYouTubeAccessSettings();
normalizationToggle.checked = localStorage.getItem(STORAGE.normalization) === 'true';
normalizationToggle?.addEventListener('change',()=>{localStorage.setItem(STORAGE.normalization,String(normalizationToggle.checked));smartApplyNormalization();smartApplyEq();});
channelModeSelect.value = localStorage.getItem(STORAGE.channelMode) === 'mono' ? 'mono' : 'stereo';
channelModeSelect?.addEventListener('change',()=>{localStorage.setItem(STORAGE.channelMode,channelModeSelect.value);smartApplyEq();});
volumeRange?.addEventListener('input',()=>requestAnimationFrame(smartApplyNormalization));

let smartWarmupAudio = null;
function smartWarmPreparedUrl(url) {
  if (!url) return;
  try {
    if (smartWarmupAudio) { smartWarmupAudio.pause(); smartWarmupAudio.removeAttribute('src'); smartWarmupAudio.load(); }
    smartWarmupAudio = new Audio();
    smartWarmupAudio.preload = 'auto';
    smartWarmupAudio.muted = true;
    smartWarmupAudio.volume = 0;
    smartWarmupAudio.src = url;
    smartWarmupAudio.load();
  } catch (_) {}
}
function smartUpcomingSongs(limit = 2) {
  const out = [];
  for (const queued of playQueue) {
    if (queued?.id && queued.id !== currentSong?.id && !out.some(x=>x.id===queued.id)) out.push(queued);
    if (out.length >= limit) return out;
  }
  if (activeContext?.items?.length) {
    for (let step=1; step<=Math.min(limit+1, activeContext.items.length); step++) {
      const idx = wrapContextIndex(activeContext.index + step);
      const candidate = idx >= 0 ? activeContext.items[idx] : null;
      if (candidate?.id && candidate.id !== currentSong?.id && !out.some(x=>x.id===candidate.id)) out.push(candidate);
      if (out.length >= limit) break;
    }
  }
  return out;
}
prefetchNextQueued = async function() {
  if (!window.echoAPI.prefetchSong || !gaplessToggle?.checked) return;
  if (window.__deepecchoGameMode) {
    const d=Number(audioPlayer.duration||0), c=Number(audioPlayer.currentTime||0);
    if (!Number.isFinite(d) || d<=0 || d-c>24) return;
  }
  // One resolver at a time: parallel yt-dlp prefetch jobs were stealing CPU/network from playback.
  const song = smartUpcomingSongs(1).find(item => item && !item.filepath && !item.fileUrl && !item.streamUrl);
  if (!song || smartPreparedStreamUrls.has(song.id)) return;
  const serial = ++prefetchSerial;
  try {
    const res = await window.echoAPI.prefetchSong(normalizeSong(song), window.__dinechoAudioQuality || 'auto');
    if (serial !== prefetchSerial) return;
    if (res?.success && res.streamUrl) {
      smartPreparedStreamUrls.set(song.id,{url:res.streamUrl,createdAt:Date.now()});
      smartWarmPreparedUrl(res.streamUrl);
    }
  } catch (_) {}
};

const v140PlayRemoteSongBase = playRemoteSong;
playRemoteSong = async function(song,button) {
  song = queueSong(song);
  if (!song) return;
  const prepared = smartPreparedStreamUrls.get(song?.id);
  if (prepared && Date.now()-prepared.createdAt < 7*60*1000) {
    smartPreparedStreamUrls.delete(song.id);
    if (smartWarmupAudio) { try { smartWarmupAudio.pause(); smartWarmupAudio.removeAttribute('src'); smartWarmupAudio.load(); } catch (_) {} smartWarmupAudio=null; }
    const requestId=++playRequest; showPlayLoading(92,'Prefetched · starting',song.title);
    if(button)button.disabled=true;
    try { await playLocal({...queueSong(song),streamUrl:prepared.url},requestId); }
    finally { if(button)button.disabled=false; }
    return;
  }
  return v140PlayRemoteSongBase(song,button);
};

// Queue persistence helpers.
if (saveQueueBtn) saveQueueBtn.addEventListener('click',()=>{if(!playQueue.length){showToast('Queue empty hai');return;}openCreatePlaylistModal('queue-save');});
function smartSyncClearAfterButton(){if(!clearAfterCurrentBtn)return;clearAfterCurrentBtn.setAttribute('aria-pressed',String(smartClearAfterCurrent));clearAfterCurrentBtn.textContent=`Clear after current: ${smartClearAfterCurrent?'On':'Off'}`;}
clearAfterCurrentBtn?.addEventListener('click',()=>{smartClearAfterCurrent=!smartClearAfterCurrent;localStorage.setItem(STORAGE.clearAfterCurrent,String(smartClearAfterCurrent));smartSyncClearAfterButton();});
smartSyncClearAfterButton();

// Parallel safe EQ enhancer: it branches from the existing captureStream analyser path,
// so the original player path remains untouched even if enhancement is unavailable.
const SMART_EQ_PRESETS = {
  flat:[0,0,0,0,0], bass:[8,5,1,-1,-2], vocal:[-2,1,5,4,1], rock:[5,3,-1,3,5], pop:[2,4,3,2,1], classical:[3,1,-1,2,4]
};
function smartReadEqBands(){return [...document.querySelectorAll('[data-eq-band]')].map(x=>Number(x.value)||0);}
function smartFormatDb(value){const n=Number(value)||0;return `${n>0?'+':''}${n} dB`;}
function smartSyncEqQuickControls(){
  const values=smartReadEqBands();
  [[bassQuickRange,bassQuickValue,0],[midQuickRange,midQuickValue,2],[trebleQuickRange,trebleQuickValue,4]].forEach(([range,label,index])=>{if(range)range.value=String(values[index]||0);if(label)label.textContent=smartFormatDb(values[index]||0);});
}
function smartWriteEqBands(values){document.querySelectorAll('[data-eq-band]').forEach((input,i)=>{input.value=String(values[i]||0);const small=input.parentElement?.querySelector('small');if(small)small.textContent=smartFormatDb(input.value);});smartSyncEqQuickControls();}
function smartEnsureEqNodes(){
  try {
    setupAudioAnalyser();
    if(!audioContext||!audioSourceNode)return false;
    if(smartEqNodes)return true;
    const freqs=[60,230,910,3600,14000]; const filters=freqs.map(freq=>{const f=audioContext.createBiquadFilter();f.type='peaking';f.frequency.value=freq;f.Q.value=1.05;f.gain.value=0;return f;});
    const compressor=audioContext.createDynamicsCompressor();compressor.threshold.value=-16;compressor.knee.value=18;compressor.ratio.value=3;compressor.attack.value=.008;compressor.release.value=.2;
    const wet=audioContext.createGain();wet.gain.value=0;
    const splitter=audioContext.createChannelSplitter(2),merger=audioContext.createChannelMerger(2);
    const ll=audioContext.createGain(),lr=audioContext.createGain(),rl=audioContext.createGain(),rr=audioContext.createGain();
    audioSourceNode.connect(filters[0]); for(let i=0;i<filters.length-1;i++)filters[i].connect(filters[i+1]); filters[filters.length-1].connect(compressor);
    compressor.connect(splitter);splitter.connect(ll,0);splitter.connect(lr,0);splitter.connect(rl,1);splitter.connect(rr,1);ll.connect(merger,0,0);rl.connect(merger,0,0);lr.connect(merger,0,1);rr.connect(merger,0,1);merger.connect(wet);wet.connect(audioContext.destination);
    smartEqNodes={filters,compressor,wet,splitter,merger,ll,lr,rl,rr}; return true;
  } catch(err){console.warn('[smart-eq] passthrough:',err?.message||err);return false;}
}
function smartApplyEq(){
  const preset=eqPresetSelect?.value||'flat'; const values=smartReadEqBands(); localStorage.setItem(STORAGE.eqPreset,preset);setStored(STORAGE.eqBands,values);
  const bypass=!!document.getElementById('v170AudioBypass')?.checked;
  const widthRaw=Math.max(70,Math.min(140,Number(document.getElementById('v170StereoWidth')?.value)||100));
  const nonFlat=values.some(v=>Math.abs(v)>.1)||normalizationToggle?.checked||channelModeSelect?.value==='mono'||Math.abs(widthRaw-100)>1;
  if(bypass){if(smartEqNodes)smartEqNodes.wet.gain.value=0;if(eqStatus)eqStatus.textContent='Enhancement bypass · original playback only.';return;}
  if(!nonFlat){if(smartEqNodes)smartEqNodes.wet.gain.value=0;if(eqStatus)eqStatus.textContent='Flat passthrough · original playback path untouched.';return;}
  const ok=smartEnsureEqNodes(); if(!ok){if(eqStatus)eqStatus.textContent='Safe passthrough active · enhancement unavailable for this Chromium audio path.';return;}
  smartEqNodes.filters.forEach((f,i)=>f.gain.setTargetAtTime(values[i]||0,audioContext.currentTime,.025));
  const strength=Math.max(...values.map(v=>Math.abs(v)),normalizationToggle?.checked?4:0,channelModeSelect?.value==='mono'?2:0,Math.abs(widthRaw-100)/5);
  smartEqNodes.wet.gain.setTargetAtTime(Math.min(.24,.055+strength*.012),audioContext.currentTime,.04);
  // Mid/side-style channel matrix on the wet branch only. 100%=original stereo, <100 narrows, >100 widens.
  try{
    const width=channelModeSelect?.value==='mono'?0:widthRaw/100;const a=(1+width)/2,b=(1-width)/2,t=audioContext.currentTime;
    smartEqNodes.ll.gain.setTargetAtTime(a,t,.025);smartEqNodes.rr.gain.setTargetAtTime(a,t,.025);smartEqNodes.lr.gain.setTargetAtTime(b,t,.025);smartEqNodes.rl.gain.setTargetAtTime(b,t,.025);
  }catch(_){}
  if(eqStatus)eqStatus.textContent='Safe parallel audio enhancer active · original playback remains protected.';
}
const storedPreset=localStorage.getItem(STORAGE.eqPreset)||'flat';eqPresetSelect.value=SMART_EQ_PRESETS[storedPreset]||storedPreset==='custom'?storedPreset:'flat';
const storedBands=getStored(STORAGE.eqBands,SMART_EQ_PRESETS[eqPresetSelect.value]||[0,0,0,0,0]);smartWriteEqBands(storedBands);
eqPresetSelect?.addEventListener('change',()=>{const preset=eqPresetSelect.value;if(preset!=='custom')smartWriteEqBands(SMART_EQ_PRESETS[preset]||[0,0,0,0,0]);smartApplyEq();});
eqBands?.addEventListener('input',event=>{const input=event.target.closest('[data-eq-band]');if(!input)return;eqPresetSelect.value='custom';const small=input.parentElement?.querySelector('small');if(small)small.textContent=smartFormatDb(input.value);smartSyncEqQuickControls();smartApplyEq();});
function smartWireQuickEq(range,label,bandIndex){range?.addEventListener('input',()=>{const band=document.querySelector(`[data-eq-band=\"${bandIndex}\"]`);if(!band)return;band.value=range.value;const small=band.parentElement?.querySelector('small');if(small)small.textContent=smartFormatDb(range.value);if(label)label.textContent=smartFormatDb(range.value);eqPresetSelect.value='custom';smartApplyEq();});}
smartWireQuickEq(bassQuickRange,bassQuickValue,0);smartWireQuickEq(midQuickRange,midQuickValue,2);smartWireQuickEq(trebleQuickRange,trebleQuickValue,4);

const SMART_THEME_SUGGESTIONS = {
  golden:{name:'Golden Particle',keywords:['golden','classic','old','retro','ghazal','sufi','acoustic','folk','vintage']},
  purple:{name:'Purple Lighting',keywords:['sad','alone','lonely','memory','memories','slow','reverb','dream','heartbreak','melancholy']},
  toxic:{name:'Green Toxic',keywords:['rap','hip hop','hip-hop','drill','trap','freestyle','bass','hard','street']},
  blood:{name:'Red Blood',keywords:['metal','rage','angry','war','fight','blood','dark','rock','aggressive']},
  silver:{name:'Silver Particles',keywords:['piano','classical','instrumental','ambient','calm','peace','soft','sleep','lofi','lo-fi']},
  transparent:{name:'Transparent Glass',keywords:['minimal','clean','study','focus','chill','background']},
  fluids:{name:'Fluids',keywords:['r&b','rnb','soul','groove','smooth','jazz','funk']},
  rgb:{name:'RGB',keywords:['edm','dance','party','remix','dj','club','electro','phonk','festival']},
  love:{name:'Love RGB',keywords:['love','romance','romantic','heart','pyaar','pyar','ishq','mohabbat','crush','lover']},
  space:{name:'Vibrant Space',keywords:['space','star','stars','moon','night','sky','cosmic','galaxy','universe','dreamy']},
  dark:{name:'Dark',keywords:['dark','deep','midnight','shadow','grunge']},
  light:{name:'Light',keywords:['happy','sun','morning','bright','summer','feel good','feel-good']}
};
let smartCurrentThemeSuggestion=null, smartThemeSuggestionLastAt=0;
function smartThemeSuggestionForSong(song, audio=window.__dinechoAudioEnergy) {
  if(!song?.id)return null;
  const text=`${song.title||''} ${song.channel||''}`.toLowerCase();
  const scores={golden:.8,purple:.45,toxic:.35,blood:.18,silver:.42,transparent:.22,fluids:.28,rgb:.30,love:.38,space:.44,dark:.16,light:.18};
  for(const [theme,meta] of Object.entries(SMART_THEME_SUGGESTIONS)) for(const kw of meta.keywords) if(text.includes(kw)) scores[theme]+=2.8;
  // Deterministic tiny tie-breaker keeps different neutral tracks from always receiving the same suggestion.
  let hash=0;for(const ch of text)hash=((hash*31)+ch.charCodeAt(0))>>>0;const neutral=['golden','purple','silver','fluids','space','transparent'];scores[neutral[hash%neutral.length]]+=.34;
  if(audio?.hasSignal){
    const energy=Number(audio.energy||0),bass=Number(audio.bass||0),treble=Number(audio.treble||0),vocal=Number(audio.vocal||0),aggr=Number(audio.aggression||0),mid=Number(audio.mid||0),high=Number(audio.highMid||0);
    scores.rgb+=energy*2.3+treble*1.25+aggr*1.15;
    scores.toxic+=bass*2.25+aggr*1.5;
    scores.blood+=aggr*2.0+bass*.8;
    scores.purple+=vocal*1.5+(1-energy)*.72;
    scores.love+=vocal*1.15+mid*.7;
    scores.fluids+=mid*1.25+vocal*.72;
    scores.space+=treble*1.15+high*.95+energy*.5;
    scores.silver+=(1-energy)*1.25+(1-aggr)*.35;
    scores.transparent+=(1-energy)*.65;
    scores.golden+=vocal*.55+(1-aggr)*.42;
  }
  const [theme,score]=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
  return {theme,name:SMART_THEME_SUGGESTIONS[theme]?.name||theme,score};
}
function smartUpdateThemeSuggestion(force=false){
  if(!themeSuggestionBtn)return;
  if(!currentSong){themeSuggestionBtn.classList.add('hidden');smartCurrentThemeSuggestion=null;return;}
  const now=Date.now(); if(!force&&now-smartThemeSuggestionLastAt<2200)return; smartThemeSuggestionLastAt=now;
  const suggestion=smartThemeSuggestionForSong(currentSong);
  if(!suggestion)return;
  smartCurrentThemeSuggestion=suggestion;
  const current=document.body.dataset.theme||'golden'; const matched=current===suggestion.theme;
  themeSuggestionBtn.classList.remove('hidden'); themeSuggestionBtn.classList.toggle('is-current',matched);
  themeSuggestionBtn.textContent=matched?`✓ ${suggestion.name} fits this track`:`✨ Try ${suggestion.name}`;
  themeSuggestionBtn.title=matched?`${suggestion.name} is DEEP-ECHO's smart match for this song`:`Smart theme suggestion · click to switch to ${suggestion.name}`;
}
themeSuggestionBtn?.addEventListener('click',()=>{if(!smartCurrentThemeSuggestion)return;applyTheme(smartCurrentThemeSuggestion.theme);smartUpdateThemeSuggestion(true);showToast(`${smartCurrentThemeSuggestion.name} theme applied`);});
audioPlayer.addEventListener('timeupdate',()=>smartUpdateThemeSuggestion(false));

function smartUpdateNowPlaying() {
  const thumb=currentSong?.thumbnail||DEFAULT_THUMB; const title=currentSong?.title||'Nothing playing'; const artist=currentSong?.channel||'';
  if(nowPlayingBackdrop){nowPlayingBackdrop.style.backgroundImage=currentSong?.thumbnail?`url("${currentSong.thumbnail.replace(/"/g,'%22')}")`:'';document.body.classList.toggle('has-now-playing-backdrop',!!currentSong?.thumbnail);}
  if(immersiveArt)immersiveArt.src=thumb;if(immersiveBackdrop)immersiveBackdrop.style.backgroundImage=currentSong?.thumbnail?`url("${currentSong.thumbnail.replace(/"/g,'%22')}")`:'';if(immersiveTitle)immersiveTitle.textContent=title;if(immersiveArtist)immersiveArtist.textContent=artist;
  smartSyncMiniState(); smartUpdateThemeSuggestion(true);
}
function smartUpdatePlaybackMirrors(){
  const playing=!!audioPlayer.src&&!audioPlayer.paused&&!audioPlayer.ended;document.body.classList.toggle('audio-is-playing',playing);
  const progress=audioPlayer.duration?Math.max(0,Math.min(100,audioPlayer.currentTime/audioPlayer.duration*100)):0;
  if(immersivePlayBtn)immersivePlayBtn.textContent=playing?'Ⅱ':'▶';
  if(immersiveProgressFill)immersiveProgressFill.style.width=`${progress}%`;
  if(immersiveProgressTrack)immersiveProgressTrack.setAttribute('aria-valuenow',String(Math.round(progress)));
  if(immersiveCur)immersiveCur.textContent=formatTime(audioPlayer.currentTime||0);if(immersiveDur)immersiveDur.textContent=formatTime(audioPlayer.duration||0);
  smartSyncImmersiveLyricsState(false); smartSyncMiniState();
}
function smartSyncMiniState(){if(!window.echoAPI.syncMiniState)return;const lyric=activeLyric>=0?lyricLines?.[activeLyric]?.text||'':'';window.echoAPI.syncMiniState({title:currentSong?.title||'Nothing playing',artist:currentSong?.channel||'',thumbnail:currentSong?.thumbnail||DEFAULT_THUMB,playing:!!audioPlayer.src&&!audioPlayer.paused&&!audioPlayer.ended,current:Number(audioPlayer.currentTime||0),duration:Number(audioPlayer.duration||0),volume:Math.round((Number(volumeRange?.value)||0)),lyric,theme:document.body.dataset.theme||'golden',alwaysOnTop:miniAlwaysOnTopToggle?.checked!==false});}
async function smartOpenMiniPlayer(){if(!window.echoAPI.openMiniPlayer)return;await window.echoAPI.openMiniPlayer({alwaysOnTop:miniAlwaysOnTopToggle?.checked!==false});setTimeout(smartSyncMiniState,180);}
miniAlwaysOnTopToggle.checked=localStorage.getItem(STORAGE.miniAlwaysOnTop)!=='false';miniAlwaysOnTopToggle?.addEventListener('change',()=>{localStorage.setItem(STORAGE.miniAlwaysOnTop,String(miniAlwaysOnTopToggle.checked));window.echoAPI.setMiniAlwaysOnTop?.(miniAlwaysOnTopToggle.checked);});
miniPlayerBtn?.addEventListener('click',smartOpenMiniPlayer);openMiniPlayerSettingBtn?.addEventListener('click',smartOpenMiniPlayer);
if(window.echoAPI.onMiniAction)window.echoAPI.onMiniAction(async action=>{if(action==='toggle')playPauseBtn.click();else if(action==='next')await playNext();else if(action==='previous')await playPrevious();else if(action==='back10')back10Btn.click();else if(action==='forward10')forward10Btn.click();else if(String(action).startsWith('volume:')){const v=Math.max(0,Math.min(100,Number(String(action).split(':')[1])||0));volumeRange.value=String(v);volumeRange.dispatchEvent(new Event('input'));}else if(action==='pinToggle'){miniAlwaysOnTopToggle.checked=!miniAlwaysOnTopToggle.checked;miniAlwaysOnTopToggle.dispatchEvent(new Event('change'));smartSyncMiniState();}});

let smartAppFullscreen = false;
function smartSyncAppFullscreenButton(value) {
  smartAppFullscreen = !!value;
  document.body.classList.toggle('app-fullscreen', smartAppFullscreen);
  if (appFullscreenBtn) {
    appFullscreenBtn.textContent = smartAppFullscreen ? '↙' : '⛶';
    appFullscreenBtn.setAttribute('aria-label', smartAppFullscreen ? 'Exit app fullscreen' : 'Enter app fullscreen');
    appFullscreenBtn.title = `${smartAppFullscreen ? 'Exit' : 'App'} Fullscreen · F11`;
    appFullscreenBtn.setAttribute('aria-pressed', String(smartAppFullscreen));
  }
}
async function smartToggleAppFullscreen() {
  try { smartSyncAppFullscreenButton(await window.echoAPI.toggleAppFullscreen?.()); } catch (_) {}
}
appFullscreenBtn?.addEventListener('click', smartToggleAppFullscreen);
window.echoAPI.onAppFullscreenChanged?.(smartSyncAppFullscreenButton);
window.echoAPI.isAppFullscreen?.().then(smartSyncAppFullscreenButton).catch(()=>{});

let smartImmersiveLyricsVisible = localStorage.getItem('dinecho-immersive-lyrics-visible-v1') !== 'false';
let smartImmersiveLastLyric = -2;
function smartSetImmersiveLyricsVisible(visible){
  smartImmersiveLyricsVisible = visible !== false;
  localStorage.setItem('dinecho-immersive-lyrics-visible-v1',String(smartImmersiveLyricsVisible));
  immersivePlayer?.classList.toggle('lyrics-hidden',!smartImmersiveLyricsVisible);
  immersiveShell?.classList.toggle('lyrics-hidden',!smartImmersiveLyricsVisible);
  if(immersiveLyricsPanel)immersiveLyricsPanel.setAttribute('aria-hidden',String(!smartImmersiveLyricsVisible));
  if(immersiveLyricsToggleBtn){immersiveLyricsToggleBtn.textContent=smartImmersiveLyricsVisible?'Hide Lyrics':'Show Lyrics';immersiveLyricsToggleBtn.setAttribute('aria-pressed',String(smartImmersiveLyricsVisible));}
  if(smartImmersiveLyricsVisible)setTimeout(()=>smartSyncImmersiveLyricsState(true),30);
}
function smartRebuildImmersiveLyrics(){
  if(!immersiveLyricsBody||!lyricsBody)return;
  immersiveLyricsBody.innerHTML=lyricsBody.innerHTML;
  immersiveLyricsBody.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  if(!smartWordByWordEnabled)smartRestoreLineOnlyLyrics(immersiveLyricsBody);
  smartImmersiveLastLyric=-2;
  smartSyncImmersiveLyricsState(true);
}
function smartUpdateImmersiveKaraoke(){
  if(!immersiveLyricsBody||!lyricLines.length)return;
  if(!smartWordByWordEnabled){smartRestoreLineOnlyLyrics(immersiveLyricsBody);return;}
  smartPaintWordState(immersiveLyricsBody,lyricsPlaybackClock());
}
function smartSyncImmersiveLyricsState(force=false){
  if(!immersiveLyricsBody)return;
  const lines=immersiveLyricsBody.querySelectorAll('.lyric-line[data-line]');
  lines.forEach((line,i)=>{line.classList.toggle('current',i===activeLyric);line.classList.toggle('past',i<activeLyric);if(i===activeLyric)line.setAttribute('aria-current','true');else line.removeAttribute('aria-current');});
  smartUpdateImmersiveKaraoke();
  if((force||smartImmersiveLastLyric!==activeLyric)&&smartImmersiveLyricsVisible&&!immersivePlayer?.classList.contains('hidden')){
    smartImmersiveLastLyric=activeLyric;const line=immersiveLyricsBody.querySelector(`[data-line="${activeLyric}"]`);
    if(line){const top=line.offsetTop-immersiveLyricsBody.clientHeight*.44;immersiveLyricsBody.scrollTo({top:Math.max(0,top),behavior:force?'auto':'smooth'});}
  }
}
function smartSeekImmersiveFromPointer(event){
  if(!immersiveProgressTrack||!Number.isFinite(audioPlayer.duration)||audioPlayer.duration<=0)return;
  const rect=immersiveProgressTrack.getBoundingClientRect();const ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width)));audioPlayer.currentTime=ratio*audioPlayer.duration;smartUpdatePlaybackMirrors();
}
let smartImmersiveOwnsDocumentFullscreen=false;
async function smartOpenImmersive(){if(!immersivePlayer)return;smartUpdateNowPlaying();smartRebuildImmersiveLyrics();smartSetImmersiveLyricsVisible(smartImmersiveLyricsVisible);immersivePlayer.classList.remove('hidden');immersivePlayer.setAttribute('aria-hidden','false');startLyricsVisualizer();smartSyncImmersiveLyricsState(true);try{const appFs=await window.echoAPI.isAppFullscreen?.();smartImmersiveOwnsDocumentFullscreen=!appFs&&!document.fullscreenElement;if(smartImmersiveOwnsDocumentFullscreen)await document.documentElement.requestFullscreen();}catch(_){smartImmersiveOwnsDocumentFullscreen=false;}}
async function smartCloseImmersive(){if(!immersivePlayer)return;immersivePlayer.classList.add('hidden');immersivePlayer.setAttribute('aria-hidden','true');try{if(smartImmersiveOwnsDocumentFullscreen&&document.fullscreenElement)await document.exitFullscreen();}catch(_){}finally{smartImmersiveOwnsDocumentFullscreen=false;}}
immersiveBtn?.addEventListener('click',smartOpenImmersive);immersiveCloseBtn?.addEventListener('click',smartCloseImmersive);immersiveBack10Btn?.addEventListener('click',()=>back10Btn.click());immersivePrevBtn?.addEventListener('click',()=>playPrevious());immersiveNextBtn?.addEventListener('click',()=>playNext());immersiveForward10Btn?.addEventListener('click',()=>forward10Btn.click());immersivePlayBtn?.addEventListener('click',()=>playPauseBtn.click());
immersiveLikeBtn?.addEventListener('click',()=>{if(currentSong)toggleLike(currentSong,immersiveLikeBtn);});
immersiveLyricsToggleBtn?.addEventListener('click',()=>smartSetImmersiveLyricsVisible(!smartImmersiveLyricsVisible));
immersiveProgressTrack?.addEventListener('pointerdown',smartSeekImmersiveFromPointer);
immersiveProgressTrack?.addEventListener('keydown',event=>{if(!Number.isFinite(audioPlayer.duration))return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();audioPlayer.currentTime=Math.max(0,Math.min(audioPlayer.duration,(audioPlayer.currentTime||0)+(event.key==='ArrowRight'?5:-5)));smartUpdatePlaybackMirrors();}});
immersiveLyricsBody?.addEventListener('click',event=>{const line=event.target.closest('.lyric-line[data-line]');if(!line)return;const index=Number(line.dataset.line);const target=lyricLines[index]?.time;if(Number.isFinite(target)){audioPlayer.currentTime=Math.max(0,target);syncLyrics(true);smartSyncImmersiveLyricsState(true);}});
if(lyricsBody&&immersiveLyricsBody){new MutationObserver((mutations)=>{if(mutations.some(m=>m.type==='childList'||m.type==='characterData'))smartRebuildImmersiveLyrics();}).observe(lyricsBody,{childList:true,subtree:true,characterData:true});}
smartSetImmersiveLyricsVisible(smartImmersiveLyricsVisible);
let smartSwipeStart=null;nowThumb?.addEventListener('pointerdown',e=>{smartSwipeStart={x:e.clientX,y:e.clientY};});nowThumb?.addEventListener('pointerup',e=>{if(!smartSwipeStart)return;const dx=e.clientX-smartSwipeStart.x,dy=e.clientY-smartSwipeStart.y;smartSwipeStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.3){dx<0?playNext():playPrevious();}});

const v140PlayLocalBase = playLocal;
playLocal = async function(song,requestId){smartRestoreBaseVolume();const value=await v140PlayLocalBase(song,requestId);smartUpdateNowPlaying();smartApplyEq();prefetchNextQueued();return value;};
const v140ApplyThemeBase = applyTheme;
applyTheme = function(theme){v140ApplyThemeBase(theme);smartSyncMiniState();if(typeof smartUpdateThemeSuggestion==='function')smartUpdateThemeSuggestion(true);};

audioPlayer.addEventListener('timeupdate',()=>{smartCrossfadeTick();smartUpdatePlaybackMirrors();});
audioPlayer.addEventListener('playing',()=>{smartFadeInAfterTransition();if((document.hidden||window.__deepecchoGameMode)&&!audioPlayer.muted&&smartBaseVolume()>0&&audioPlayer.volume<=.001)audioPlayer.volume=smartBaseVolume();smartUpdatePlaybackMirrors();smartApplyEq();});
audioPlayer.addEventListener('play',smartUpdatePlaybackMirrors);audioPlayer.addEventListener('pause',smartUpdatePlaybackMirrors);audioPlayer.addEventListener('ended',smartUpdatePlaybackMirrors);audioPlayer.addEventListener('loadedmetadata',smartUpdatePlaybackMirrors);
previousBtn?.addEventListener('pointerdown',smartRestoreBaseVolume,{passive:true});nextBtn?.addEventListener('pointerdown',smartRestoreBaseVolume,{passive:true});
smartApplyNormalization(); smartUpdateNowPlaying(); smartUpdatePlaybackMirrors();

// ===== Karaoke lyrics, in-lyrics search, original/Hinglish switch and font sizing =====
const lyricsFindInput = document.getElementById('lyricsFindInput');
const lyricsOriginalToggle = document.getElementById('lyricsOriginalToggle');
const lyricsFontSizeRange = document.getElementById('lyricsFontSizeRange');
const lyricsFontSizeValue = document.getElementById('lyricsFontSizeValue');
const wordByWordToggle = document.getElementById('wordByWordToggle');
const wordByWordState = document.getElementById('wordByWordState');
const WORD_BY_WORD_KEY = 'deepeccho-word-by-word-v222';
let smartWordByWordEnabled = localStorage.getItem(WORD_BY_WORD_KEY) !== 'false';
let smartLastLyricsPayload = null;
let smartShowingOriginalLyrics = true;

function smartUsableLyrics(value) {
  if (typeof value !== 'string') return '';
  const clean = value.trim();
  if (!clean) return '';
  const visible = clean.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').replace(/[\s♪♫♬]+/g, '');
  return visible.length >= 2 ? clean : '';
}
function smartOriginalLyricsVariant() {
  return { mode:'original', synced:smartUsableLyrics(smartLastLyricsPayload?.syncedLyrics), plain:smartUsableLyrics(smartLastLyricsPayload?.lyrics), label:'Original' };
}
function smartRomanLyricsVariant() {
  return { mode:'romanized', synced:smartUsableLyrics(smartLastLyricsPayload?.romanizedSyncedLyrics), plain:smartUsableLyrics(smartLastLyricsPayload?.romanizedLyrics), label:'Romanized' };
}
function smartTranslatedLyricsVariant() {
  return { mode:'translated', synced:smartUsableLyrics(smartLastLyricsPayload?.translatedSyncedLyrics), plain:smartUsableLyrics(smartLastLyricsPayload?.translatedLyrics), label:'Translated' };
}
function smartHasLyricsVariant(variant){
  if (variant?.plain) return true;
  if (!variant?.synced) return false;
  try { return parseLrc(variant.synced).length > 0; } catch (_) { return false; }
}
function smartCaptureLyricsPayload(payload) {
  smartLastLyricsPayload = payload || null; smartShowingOriginalLyrics = true;
  setTimeout(()=>{smartSyncOriginalToggle();smartPrepareKaraokeWords();smartApplyLyricsFind();},0);
}
function smartHasOriginalLyrics(){return smartHasLyricsVariant(smartRomanLyricsVariant());}
function smartSyncOriginalToggle(){
  if(!lyricsOriginalToggle)return; const available=smartHasOriginalLyrics(); lyricsOriginalToggle.disabled=!available;
  lyricsOriginalToggle.textContent=smartShowingOriginalLyrics?'Romanized':'Original';
  lyricsOriginalToggle.title=available?'Switch between source-script lyrics and optional romanization':'Romanized variant not available; Original lyrics stay visible';
}
function smartPaintLyricsVariant(variant, { fallback = true, toastOnFallback = false } = {}) {
  let selected = variant;
  if (!smartHasLyricsVariant(selected) && fallback) {
    selected = smartOriginalLyricsVariant();
    smartShowingOriginalLyrics = true;
    if (typeof smartShowingTranslation !== 'undefined') smartShowingTranslation = false;
    if (toastOnFallback) showToast('Ye version available nahi hai · Original lyrics rakhi gayi');
  }
  if (!smartHasLyricsVariant(selected)) return false; // Never erase already-visible lyrics.

  lyricLines=[]; activeLyric=-1;
  if(selected.synced){
    lyricLines=parseLrc(selected.synced);
    if (lyricLines.length) {
      lyricsBody.innerHTML=lyricLines.map((line,i)=>`<p class="lyric-line" data-line="${i}">${escapeHtml(line.text)||'♪'}</p>`).join('');
      syncLyrics(true); startLyricTicker();
    } else if (selected.plain) {
      lyricsBody.innerHTML=String(selected.plain).split(/\r?\n/).map(line=>`<p class="lyric-line plain">${escapeHtml(line)||'&nbsp;'}</p>`).join('');
    } else if (fallback && selected.mode !== 'original') {
      return smartPaintLyricsVariant(smartOriginalLyricsVariant(), { fallback:false, toastOnFallback });
    } else {
      return false; // Malformed/empty timed variant: preserve the currently visible lyrics.
    }
  } else if(selected.plain){
    lyricsBody.innerHTML=String(selected.plain).split(/\r?\n/).map(line=>`<p class="lyric-line plain">${escapeHtml(line)||'&nbsp;'}</p>`).join('');
  }
  if(lyricsSource){const base=smartLastLyricsPayload?.source||'Lyrics';lyricsSource.textContent=`${lyricLines.length?'Synced lyrics':'Lyrics'} · ${base} · ${selected.label}`;}
  smartSyncOriginalToggle(); if (typeof smartSyncTranslationToggle === 'function') smartSyncTranslationToggle(); smartPrepareKaraokeWords(); smartApplyLyricsFind();
  return true;
}
function smartRenderLyricsVariant(showOriginal) {
  if(!smartLastLyricsPayload)return;
  if (typeof smartShowingTranslation !== 'undefined') smartShowingTranslation = false;
  const wantsOriginal = !!showOriginal;
  const variant = wantsOriginal ? smartOriginalLyricsVariant() : smartRomanLyricsVariant();
  const ok = smartPaintLyricsVariant(variant,{fallback:true,toastOnFallback:!wantsOriginal});
  smartShowingOriginalLyrics = ok && variant.mode === 'romanized' && smartHasLyricsVariant(variant) ? false : true;
  smartSyncOriginalToggle(); if (typeof smartSyncTranslationToggle === 'function') smartSyncTranslationToggle();
}
lyricsOriginalToggle?.addEventListener('click',()=>smartRenderLyricsVariant(!smartShowingOriginalLyrics));

function smartWordKey(value=''){
  return String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,'').trim();
}
function smartExactWordTimings(){
  const list=Array.isArray(smartLastLyricsPayload?.wordTimings)?smartLastLyricsPayload.wordTimings:[];
  return list.map(item=>({text:String(item?.text||''),key:smartWordKey(item?.text),time:Number(item?.time),end:Number(item?.end)})).filter(item=>item.key&&Number.isFinite(item.time)).sort((a,b)=>a.time-b.time);
}
function smartAssignWordTimes(line,index,words,exact){
  if(!words.length)return 'line';
  const start=Number(lyricLines[index]?.time)||0; const next=Number(lyricLines[index+1]?.time); const end=Number.isFinite(next)&&next>start?next:start+Math.max(2.2,Math.min(7.5,words.length*.52));
  const candidates=exact.filter(item=>item.time>=Math.max(0,start-.6)&&item.time<=end+.65); let cursor=0,matched=0;
  for(let wi=0;wi<words.length;wi++){const key=smartWordKey(words[wi].textContent);if(!key)continue;let hit=-1;for(let ci=cursor;ci<candidates.length;ci++){if(candidates[ci].key===key){hit=ci;break;}}if(hit<0)continue;const item=candidates[hit];words[wi].dataset.wordTime=String(item.time);if(Number.isFinite(item.end))words[wi].dataset.wordEnd=String(item.end);words[wi].dataset.wordExact='true';cursor=hit+1;matched++;}
  const ratio=matched/Math.max(1,words.length);
  if(matched>=Math.min(2,words.length)&&ratio>=.5){
    for(let wi=0;wi<words.length;wi++){if(words[wi].dataset.wordTime)continue;let p=wi-1,n=wi+1;while(p>=0&&!words[p].dataset.wordTime)p--;while(n<words.length&&!words[n].dataset.wordTime)n++;if(p>=0&&n<words.length){const a=Number(words[p].dataset.wordTime),b=Number(words[n].dataset.wordTime);words[wi].dataset.wordTime=String(a+(b-a)*((wi-p)/(n-p)));words[wi].dataset.wordInterpolated='true';}}
    line.dataset.wordTiming='exact';return 'exact';
  }
  words.forEach(word=>{delete word.dataset.wordTime;delete word.dataset.wordEnd;delete word.dataset.wordExact;delete word.dataset.wordInterpolated;});line.dataset.wordTiming='line';return 'line';
}
function smartRefreshWordByWordControl(){
  if(wordByWordToggle){wordByWordToggle.setAttribute('aria-pressed',String(smartWordByWordEnabled));wordByWordToggle.classList.toggle('active',smartWordByWordEnabled);}if(wordByWordState)wordByWordState.textContent=smartWordByWordEnabled?'ON':'OFF';document.body.classList.toggle('word-by-word-off',!smartWordByWordEnabled);
  if(wordByWordToggle&&smartWordByWordEnabled){const exact=!!lyricsBody?.querySelector('.lyric-line[data-word-timing="exact"]');wordByWordToggle.title=exact?'Word by Word ON · exact caption timing available':'Word by Word ON · exact word timing unavailable for this track, so safe line sync is used';}
}
function smartRestoreLineOnlyLyrics(root = lyricsBody){
  if(!root)return;
  root.querySelectorAll('.lyric-line[data-line]').forEach(line=>{
    if(line.querySelector('.karaoke-word')){
      const text=line.textContent||'';
      line.textContent=text;
    }
    delete line.dataset.wordTiming;
  });
}
function smartSetWordByWord(enabled,{announce=false}={}){
  smartWordByWordEnabled=enabled!==false;localStorage.setItem(WORD_BY_WORD_KEY,String(smartWordByWordEnabled));smartRefreshWordByWordControl();
  if(smartWordByWordEnabled){
    smartPrepareKaraokeWords();smartUpdateKaraoke();
  }else{
    // True line-by-line mode: restore one clean text node per line instead of leaving
    // dim karaoke spans behind. This also prevents theme CSS from making the line blurry.
    smartRestoreLineOnlyLyrics(lyricsBody);
    if(typeof smartRebuildImmersiveLyrics==='function')smartRebuildImmersiveLyrics();
    smartRestoreLineOnlyLyrics(immersiveLyricsBody);
    syncLyrics(true);
  }
  if(announce)showToast(smartWordByWordEnabled?(lyricsBody?.querySelector('.lyric-line[data-word-timing="exact"]')?'Word by Word ON · exact timing':'Word by Word ON · exact word timing unavailable, line sync active'):'Word by Word OFF · clean line-by-line lyrics');
}
function smartPrepareKaraokeWords(){
  if(!smartWordByWordEnabled){smartRestoreLineOnlyLyrics(lyricsBody);smartRefreshWordByWordControl();return;}
  const exact=smartExactWordTimings();lyricsBody?.querySelectorAll('.lyric-line[data-line]').forEach((line,index)=>{if(!line.querySelector('.karaoke-word')){const text=line.textContent||'';line.textContent='';const parts=text.split(/(\s+)/);parts.forEach(part=>{if(/^\s+$/.test(part)){line.appendChild(document.createTextNode(part));return;}const span=document.createElement('span');span.className='karaoke-word';span.textContent=part;line.appendChild(span);});}smartAssignWordTimes(line,index,[...line.querySelectorAll('.karaoke-word')],exact);});smartRefreshWordByWordControl();smartUpdateKaraoke();
}
function smartPaintWordState(root,t){
  root?.querySelectorAll('.lyric-line[data-line]').forEach((line,i)=>{const words=[...line.querySelectorAll('.karaoke-word')];if(!words.length)return;words.forEach(word=>word.classList.remove('lit','word-current'));if(!smartWordByWordEnabled||line.dataset.wordTiming!=='exact')return;let current=-1;words.forEach((word,idx)=>{const at=Number(word.dataset.wordTime);if(Number.isFinite(at)&&t>=at){word.classList.add('lit');current=idx;}});if(i===activeLyric&&current>=0&&current<words.length)words[current].classList.add('word-current');if(i<activeLyric)words.forEach(word=>{if(word.dataset.wordTime)word.classList.add('lit');});});
}
function smartUpdateKaraoke(){if(!lyricLines.length)return;const t=lyricsPlaybackClock();smartPaintWordState(lyricsBody,t);if(typeof smartUpdateImmersiveKaraoke==='function')smartUpdateImmersiveKaraoke();}
wordByWordToggle?.addEventListener('click',()=>smartSetWordByWord(!smartWordByWordEnabled,{announce:true}));smartRefreshWordByWordControl();
audioPlayer.addEventListener('timeupdate',smartUpdateKaraoke);
lyricsBody?.addEventListener('click',event=>{const line=event.target.closest('.lyric-line[data-line]');if(!line)return;const index=Number(line.dataset.line);const target=lyricLines[index]?.time;if(Number.isFinite(target)){audioPlayer.currentTime=Math.max(0,target);setLyricsAutoFollow(true);syncLyrics(true);showToast(`Lyrics synced · ${formatTime(target)}`);}});

function smartApplyLyricsFind(){
  if(!lyricsFindInput||!lyricsBody)return;const q=lyricsFindInput.value.trim().toLowerCase();
  lyricsBody.querySelectorAll('.lyric-line').forEach(line=>{const hit=!q||(line.textContent||'').toLowerCase().includes(q);line.classList.toggle('lyrics-find-dim',!!q&&!hit);line.classList.toggle('lyrics-find-hit',!!q&&hit);});
}
lyricsFindInput?.addEventListener('input',smartApplyLyricsFind);

function smartApplyLyricsFontSize(rawValue){
  const value=Math.max(80,Math.min(150,Number(rawValue)||100));
  const syncedPx=Math.round(26*value/100*10)/10;
  const plainPx=Math.round(24*value/100*10)/10;
  localStorage.setItem(STORAGE.lyricsFontSize,String(value));
  if(lyricsFontSizeRange)lyricsFontSizeRange.value=String(value);
  if(lyricsFontSizeValue)lyricsFontSizeValue.textContent=`${value}% · ${syncedPx}px`;
  document.documentElement.style.setProperty('--lyrics-line-size',`${syncedPx}px`);
  document.documentElement.style.setProperty('--lyrics-plain-line-size',`${plainPx}px`);
}
const savedLyricsSize=Math.max(80,Math.min(150,Number(localStorage.getItem(STORAGE.lyricsFontSize)||100)));
smartApplyLyricsFontSize(savedLyricsSize);
lyricsFontSizeRange?.addEventListener('input',()=>smartApplyLyricsFontSize(lyricsFontSizeRange.value));

// Queue drag & drop, while retaining the existing Up/Down controls as an accessible fallback.
let smartDraggedQueueIndex=-1;
function smartWireQueueDrag(){
  queueList?.querySelectorAll('.queue-item').forEach(item=>{
    item.draggable=true;
    item.addEventListener('dragstart',e=>{smartDraggedQueueIndex=Number(item.dataset.queueIndex);item.classList.add('queue-dragging');try{e.dataTransfer.effectAllowed='move';}catch(_){}});
    item.addEventListener('dragend',()=>{smartDraggedQueueIndex=-1;item.classList.remove('queue-dragging');queueList.querySelectorAll('.queue-drop-target').forEach(x=>x.classList.remove('queue-drop-target'));});
    item.addEventListener('dragover',e=>{e.preventDefault();item.classList.add('queue-drop-target');});
    item.addEventListener('dragleave',()=>item.classList.remove('queue-drop-target'));
    item.addEventListener('drop',e=>{e.preventDefault();const to=Number(item.dataset.queueIndex);item.classList.remove('queue-drop-target');if(Number.isInteger(smartDraggedQueueIndex)&&smartDraggedQueueIndex>=0&&smartDraggedQueueIndex!==to)moveQueueItem(smartDraggedQueueIndex,to);});
  });
}
const v140RenderQueueBase=renderQueue;
renderQueue=function(){v140RenderQueueBase();smartWireQueueDrag();};
renderQueue();

// ===== Ctrl+K Command Palette =====
const commandPalette = document.getElementById('commandPalette');
const commandInput = document.getElementById('commandInput');
const commandResults = document.getElementById('commandResults');
let smartCommandItems = [];
let smartCommandIndex = 0;

function smartStaticCommands(){
  const commands=[
    {label:'Play / Pause',hint:'Playback',keys:'play pause toggle',run:()=>playPauseBtn.click()},
    {label:'Next Song',hint:'Playback',keys:'next skip',run:()=>playNext()},
    {label:'Previous Song',hint:'Playback',keys:'previous back',run:()=>playPrevious()},
    {label:'Start Radio from Current Song',hint:'Discovery',keys:'radio similar',run:()=>currentSong?startSongRadio(currentSong):showToast('Pehle song play karo')},
    {label:'Toggle Shuffle',hint:'Playback',keys:'shuffle random',run:()=>shuffleBtn.click()},
    {label:'Open Queue',hint:'Queue',keys:'queue up next',run:()=>{queuePanel.classList.remove('hidden');}},
    {label:'Clear Queue',hint:'Queue',keys:'clear queue',run:()=>clearQueue()},
    {label:'Open Mini Player',hint:'Player',keys:'mini floating',run:()=>smartOpenMiniPlayer()},
    {label:'Open Immersive Player',hint:'Player',keys:'fullscreen full screen immersive',run:()=>smartOpenImmersive()},
    {label:'Toggle App Fullscreen',hint:'Window · F11',keys:'app fullscreen edge to edge taskbar titlebar',run:()=>smartToggleAppFullscreen()},
    {label:'Show / Hide Immersive Lyrics',hint:'Player',keys:'immersive lyrics show hide',run:()=>smartSetImmersiveLyricsVisible(!smartImmersiveLyricsVisible)},
    {label:'Toggle Theme Lyrics',hint:'Lyrics',keys:'lyrics font animation',run:()=>lyricsThemeFxToggle?.click()},
    {label:'Sync Lyrics to Song',hint:'Lyrics',keys:'lyrics sync video',run:()=>lyricsSyncBtn?.click()},
    {label:'Open Settings',hint:'Navigation',keys:'settings audio eq',run:()=>activateTab('settings')}
  ];
  const tabs=[['Home','home'],['Search','search'],['Downloads','library'],['Lyrics','lyrics'],['Liked Songs','liked'],['Playlists','playlists'],['History','history']];
  tabs.forEach(([label,tab])=>commands.push({label:`Open ${label}`,hint:'Navigation',keys:`open ${label.toLowerCase()} ${tab}`,run:()=>activateTab(tab)}));
  const themes=[['Golden','golden'],['Light','light'],['Dark','dark'],['Purple','purple'],['Green Toxic','toxic'],['Blood','blood'],['Silver','silver'],['Transparent','transparent'],['Fluids','fluids'],['RGB','rgb'],['Love','love'],['Vibrant Space','space']];
  themes.forEach(([label,key])=>commands.push({label:`Switch Theme · ${label}`,hint:'Theme',keys:`theme ${label.toLowerCase()} ${key}`,run:()=>applyTheme(key)}));
  Object.keys(SMART_EQ_PRESETS).forEach(key=>commands.push({label:`EQ Preset · ${key[0].toUpperCase()+key.slice(1)}`,hint:'Audio',keys:`equalizer eq ${key}`,run:()=>{eqPresetSelect.value=key;eqPresetSelect.dispatchEvent(new Event('change'));activateTab('settings');}}));
  return commands;
}

function smartDynamicCommands(query){
  const q=query.trim();if(!q)return[];const rawPlay=q.match(/^play\s+(.+)/i);const rawArtist=q.match(/^artist\s+(.+)/i);const term=(rawPlay?.[1]||rawArtist?.[1]||q).trim();const out=[];
  if(term){
    out.push({label:`Play “${term}”`,hint:'Search + play first result',keys:`play ${term}`,run:async()=>{showToast(`Finding ${term}...`);const results=await window.echoAPI.search(term);if(Array.isArray(results)&&results.length){searchInput.value=term;smartRememberSearch(term);await startSingleSong(results[0],null,makeContext(results,'command-search',`Search: ${term}`,`cmd:${term}`));}else showToast('Song nahi mila');}});
    out.push({label:`Search Songs · “${term}”`,hint:'Search',keys:`search songs ${term}`,run:()=>{smartSetSearchType('songs');searchInput.value=term;runSearch('song',term);}});
    out.push({label:`Search Artist · “${term}”`,hint:'Artist',keys:`artist ${term}`,run:()=>{searchInput.value=term;runSearch('artist',term);}});
  }
  return out;
}
function smartRenderCommandPalette(){
  if(!commandResults)return;const q=(commandInput?.value||'').trim().toLowerCase();const all=[...smartDynamicCommands(commandInput?.value||''),...smartStaticCommands()];
  smartCommandItems=all.filter(cmd=>!q||`${cmd.label} ${cmd.hint||''} ${cmd.keys||''}`.toLowerCase().includes(q)).slice(0,18);smartCommandIndex=Math.max(0,Math.min(smartCommandIndex,Math.max(0,smartCommandItems.length-1)));commandResults.innerHTML='';
  smartCommandItems.forEach((cmd,i)=>{const b=document.createElement('button');b.className='command-result'+(i===smartCommandIndex?' active':'');b.innerHTML=`<strong>${escapeHtml(cmd.label)}</strong><span>${escapeHtml(cmd.hint||'')}</span>`;b.addEventListener('mouseenter',()=>{smartCommandIndex=i;smartRenderCommandPalette();});b.addEventListener('click',()=>smartRunCommandAt(i));commandResults.appendChild(b);});
  if(!smartCommandItems.length){const e=document.createElement('div');e.className='command-result';e.textContent='No matching command';commandResults.appendChild(e);}
}
function smartOpenCommandPalette(){if(!commandPalette)return;commandPalette.classList.remove('hidden');commandPalette.setAttribute('aria-hidden','false');commandInput.value='';smartCommandIndex=0;smartRenderCommandPalette();setTimeout(()=>commandInput.focus(),20);}
function smartCloseCommandPalette(){if(!commandPalette)return;commandPalette.classList.add('hidden');commandPalette.setAttribute('aria-hidden','true');}
async function smartRunCommandAt(index=smartCommandIndex){const cmd=smartCommandItems[index];if(!cmd)return;smartCloseCommandPalette();try{await cmd.run();}catch(err){showToast('Command failed: '+err.message);}}
commandInput?.addEventListener('input',()=>{smartCommandIndex=0;smartRenderCommandPalette();});
commandInput?.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();smartCommandIndex=Math.min(smartCommandItems.length-1,smartCommandIndex+1);smartRenderCommandPalette();}else if(event.key==='ArrowUp'){event.preventDefault();smartCommandIndex=Math.max(0,smartCommandIndex-1);smartRenderCommandPalette();}else if(event.key==='Enter'){event.preventDefault();smartRunCommandAt();}else if(event.key==='Escape'){event.preventDefault();smartCloseCommandPalette();}});
commandPalette?.addEventListener('click',event=>{if(event.target===commandPalette)smartCloseCommandPalette();});
window.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();smartOpenCommandPalette();return;}if(event.key==='Escape'&&!commandPalette?.classList.contains('hidden'))smartCloseCommandPalette();});

// Final v1.4 startup sync after legacy initialization has had a chance to continue.
setTimeout(()=>{renderRecentSearches();renderSmartHome();renderSmartHistory();smartApplyEq();smartSyncMiniState();},250);
// Recommendation search is intentionally off the startup/playback critical path.
setTimeout(()=>smartScheduleRecommendationRefresh(0,false),3200);

// Translation hook: unavailable/empty variants always fall back to Original instead of blanking the lyric view.
const lyricsTranslationToggle = document.getElementById('lyricsTranslationToggle');
let smartShowingTranslation = false;
function smartSyncTranslationToggle(){
  if(!lyricsTranslationToggle)return;
  const available=smartHasLyricsVariant(smartTranslatedLyricsVariant());
  lyricsTranslationToggle.disabled=!available;
  lyricsTranslationToggle.textContent=smartShowingTranslation?'Original':'Translate';
  lyricsTranslationToggle.title=available?'Toggle available lyric translation':'Translation unavailable; Original lyrics stay visible';
}
const v140SmartCaptureLyricsPayloadBase=smartCaptureLyricsPayload;
smartCaptureLyricsPayload=function(payload){smartShowingTranslation=false;v140SmartCaptureLyricsPayloadBase(payload);setTimeout(smartSyncTranslationToggle,0);};
lyricsTranslationToggle?.addEventListener('click',()=>{
  if(!smartLastLyricsPayload)return;
  if(smartShowingTranslation){
    smartShowingTranslation=false;
    smartShowingOriginalLyrics=true;
    smartPaintLyricsVariant(smartOriginalLyricsVariant(),{fallback:true});
    return;
  }
  const translated=smartTranslatedLyricsVariant();
  if(!smartHasLyricsVariant(translated)){
    smartShowingTranslation=false; smartShowingOriginalLyrics=true;
    smartPaintLyricsVariant(smartOriginalLyricsVariant(),{fallback:true,toastOnFallback:true});
    return;
  }
  smartShowingTranslation=true; smartShowingOriginalLyrics=true;
  smartPaintLyricsVariant(translated,{fallback:true,toastOnFallback:true});
});
smartSyncTranslationToggle();
