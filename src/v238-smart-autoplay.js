// DEEP-ECHO 2.3.0 V11 · Smart Autoplay
// Home/Search discovery songs continue with related, taste-aware music instead of the next raw search row.
(() => {
  'use strict';

  const STORAGE_KEY = 'deepeccho-smart-autoplay-v1';
  const DEFAULT_CONFIG = { enabled: true };
  const state = {
    active: false,
    originType: '',
    anchorSeed: null,
    currentSeed: null,
    candidates: [],
    building: null,
    buildSerial: 0,
    steps: 0,
    playedIds: new Set(),
    playedFamilies: new Set(),
    artistRuns: new Map(),
    source: '',
    status: 'idle'
  };

  const descriptorWords = new Set([
    'official','video','audio','lyrics','lyric','visualizer','visualiser','music','full','song','songs','hd','hq','4k','8k','mv',
    'remastered','version','original','soundtrack','ost','movie','film','feat','ft','featuring','with','new','latest','status','edit'
  ]);

  function compactText(value) {
    return String(value || '')
      .normalize('NFKD')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[()[\]{}]/g, ' ')
      .replace(/[|•·/\\:_—–-]+/g, ' ')
      .replace(/[^a-z0-9\u0900-\u097f\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function familyTokens(songOrTitle) {
    const title = typeof songOrTitle === 'string' ? songOrTitle : songOrTitle?.title;
    const raw = compactText(title)
      .replace(/\b(official|music)\s+(video|audio)\b/g, ' ')
      .replace(/\b(lyrics?|lyrical|visuali[sz]er|full song|video song|audio song)\b/g, ' ')
      .replace(/\b(slowed(?:\s+and\s+reverb)?|reverb|sped up|nightcore|8d|bass boosted|karaoke|cover)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const out = [];
    const seen = new Set();
    for (const token of raw.split(' ')) {
      if (!token || token.length < 2 || descriptorWords.has(token) || seen.has(token)) continue;
      seen.add(token); out.push(token);
    }
    return out;
  }

  function familyKey(song) {
    return familyTokens(song).slice(0, 12).join(' ');
  }

  function overlapScore(a, b) {
    const aa = familyTokens(a), bb = familyTokens(b);
    if (!aa.length || !bb.length) return 0;
    const aSet = new Set(aa), bSet = new Set(bb);
    let common = 0;
    for (const t of aSet) if (bSet.has(t)) common++;
    const containment = common / Math.max(1, Math.min(aSet.size, bSet.size));
    const union = new Set([...aSet, ...bSet]).size;
    const jaccard = common / Math.max(1, union);
    return Math.max(containment * 0.82 + jaccard * 0.18, jaccard);
  }

  function sameSongFamily(a, b) {
    if (!a || !b) return false;
    if (a.id && b.id && a.id === b.id) return true;
    const ak = familyKey(a), bk = familyKey(b);
    if (ak && bk && ak === bk) return true;
    const at = familyTokens(a), bt = familyTokens(b);
    if (Math.min(at.length, bt.length) < 2) {
      const short = at.length <= bt.length ? at : bt;
      const long = at.length <= bt.length ? bt : at;
      const token = short[0] || '';
      // Short distinctive titles such as ‘Dooron Dooron’ collapse to one de-duplicated token.
      // Treat the same long token plus uploader/artist metadata as the same song family.
      return !!token && token.length >= 5 && long.includes(token) && long.length <= 6;
    }
    return overlapScore(a, b) >= 0.79;
  }

  function artistKey(song) {
    return compactText(song?.channel || song?.artist || '').replace(/\b(official|topic|vevo|music)\b/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function durationSeconds(song) {
    const value = String(song?.duration || '').trim();
    if (!value) return 0;
    if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value) || 0;
    const parts = value.split(':').map(Number);
    if (parts.some(x => !Number.isFinite(x))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  function artistTasteScore(song) {
    const artist = artistKey(song); if (!artist) return 0;
    let score = 0;
    knownTasteRows().slice(0, 30).forEach((row, index) => {
      const rowArtist = artistKey(row?.song);
      if (rowArtist && rowArtist === artist && !isGenericLabel(artist)) score += Math.max(.18, 1.35 - index * .045);
    });
    return Math.min(4.2, score);
  }

  function profileVibeScore(song) {
    let score = 0;
    const rows = knownTasteRows().slice(0, 10);
    rows.forEach((row, index) => {
      const boost = titleVibeBoost(row?.song, song);
      if (boost > 0) score += boost * Math.max(.16, .55 - index * .035);
    });
    return Math.min(2.6, score);
  }

  function isGenericLabel(value) {
    return /(^|\b)(t series|sony music|zee music|saregama|tips|warner|universal|records|music company|label|speed records|white hill|desi melodies)(\b|$)/i.test(value || '');
  }

  function isEligibleContextType(type) {
    const t = String(type || '').toLowerCase();
    if (!t) return false;
    if (/playlist|downloads|download|liked|library|queue|history|radio|ai-dj/.test(t)) return false;
    if (t === 'search' || t === 'artist-search' || t === 'search220-recommended') return true;
    if (t.startsWith('home220-') || t.startsWith('home-')) return true;
    return ['home','home-top','new-releases','made-for-you','because','recent'].includes(t);
  }

  function readConfig() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return { ...DEFAULT_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) };
    } catch (_) { return { ...DEFAULT_CONFIG }; }
  }

  function writeConfig(patch) {
    const next = { ...readConfig(), ...(patch || {}) };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (_) {}
    return next;
  }

  function enabled() { return !!readConfig().enabled; }

  function uniqueSongs(items) {
    const out = [], seen = new Set();
    for (const raw of items || []) {
      let song = raw;
      try { if (typeof queueSong === 'function') song = queueSong(raw); } catch (_) {}
      if (!song?.id || seen.has(song.id)) continue;
      seen.add(song.id); out.push(song);
    }
    return out;
  }

  function knownTasteRows() {
    const rows = [];
    try {
      if (typeof smartRecommendationProfile === 'function') rows.push(...smartRecommendationProfile().slice(0, 80));
    } catch (_) {}
    return rows;
  }

  function localTastePool() {
    const rows = knownTasteRows();
    let cache = { songs: [] }, liked = [], recent = [], contextItems = [];
    try { if (typeof smartRecommendationCache === 'function') cache = smartRecommendationCache() || cache; } catch (_) {}
    try { if (typeof getLikedSongs === 'function') liked = getLikedSongs() || []; } catch (_) {}
    try { if (typeof getStored === 'function' && typeof STORAGE !== 'undefined') recent = getStored(STORAGE.recent, []) || []; } catch (_) {}
    try { contextItems = activeContext?.items || []; } catch (_) {}
    return uniqueSongs([
      ...(cache.songs || []),
      ...rows.map(x => x?.song).filter(Boolean),
      ...liked,
      ...recent,
      ...contextItems
    ]);
  }

  function recentIds() {
    const ids = new Set();
    try {
      const rows = typeof getStored === 'function' && typeof STORAGE !== 'undefined' ? getStored(STORAGE.smartHistory, []) : [];
      (rows || []).slice(0, 18).forEach(x => x?.song?.id && ids.add(x.song.id));
    } catch (_) {}
    return ids;
  }

  function preferenceSignal(song) {
    try {
      const signals = typeof smartPreferenceSignals === 'function' ? smartPreferenceSignals() : {};
      return signals?.[song?.id] || {};
    } catch (_) { return {}; }
  }

  function tasteRankMap() {
    const map = new Map();
    knownTasteRows().forEach((row, i) => {
      if (row?.song?.id) map.set(row.song.id, Math.max(0, 5.2 - i * 0.10) + Math.min(3.2, Number(row.score || 0) * 0.045));
    });
    return map;
  }

  function titleVibeBoost(seed, candidate) {
    const a = compactText(seed?.title), b = compactText(candidate?.title);
    const groups = [
      ['romantic', /\b(love|romantic|ishq|pyaar|pyar|mohabbat|dil|heart|jaan|tera|meri|tum|dooron)\b/],
      ['sad', /\b(sad|broken|alone|cry|dard|judai|tanha|hurt)\b/],
      ['chill', /\b(chill|lofi|lo-fi|acoustic|soft|calm|unplugged|night)\b/],
      ['energy', /\b(remix|dance|party|workout|bass|edm|rock|energy)\b/]
    ];
    let score = 0;
    for (const [, re] of groups) if (re.test(a) && re.test(b)) score += 1.2;
    return score;
  }

  function candidateScore(song, seed, rankMap, recent, sourceRank = 0) {
    if (!song?.id || !seed?.id || song.id === seed.id || sameSongFamily(song, seed)) return -999;
    if (state.playedIds.has(song.id) || state.playedFamilies.has(familyKey(song))) return -999;
    const seconds = durationSeconds(song);
    const title = compactText(song.title);
    if (seconds > 13 * 60 || /\b(jukebox|playlist|non stop|nonstop|full album|top songs)\b/.test(title)) return -999;
    const sig = preferenceSignal(song);
    let score = sourceRank + (rankMap.get(song.id) || 0);
    const seedArtist = artistKey(seed), artist = artistKey(song);
    if (artist && seedArtist && artist === seedArtist && !isGenericLabel(artist)) score += state.steps === 0 ? 4.8 : 1.55;
    score += titleVibeBoost(seed, song);
    score += titleVibeBoost(state.anchorSeed || seed, song) * .72;
    score += artistTasteScore(song) + profileVibeScore(song);
    score += Math.min(1.9, overlapScore(song, state.anchorSeed || seed) * 1.28);
    score += Number(sig.likes || 0) * 1.55 + Number(sig.completes || 0) * 1.15 - Number(sig.skips || 0) * 2.05;
    if (Number(sig.skips || 0) > Number(sig.completes || 0) + Number(sig.likes || 0) + 2) score -= 3.2;
    if (recent.has(song.id)) score -= 3.4;
    const seedSpecial = /\b(live|remix|slowed|reverb|sped up|nightcore|cover|karaoke)\b/.test(compactText(seed?.title));
    const candidateSpecial = /\b(live|remix|slowed|reverb|sped up|nightcore|cover|karaoke)\b/.test(title);
    if (!seedSpecial && candidateSpecial) score -= 3.5;
    const artistCount = state.artistRuns.get(artist) || 0;
    if (state.steps > 0 && artistCount >= 1 && artist && artist === artistKey(state.currentSeed)) score -= 4.6;
    if (artistCount >= 2) score -= 6.2;
    if (!rankMap.has(song.id) && (artistTasteScore(song) > .6 || profileVibeScore(song) > .5)) score += .8;
    let h = 2166136261;
    for (const ch of String(song.id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    score += ((h >>> 0) % 1000) / 1000 * 0.62;
    return score;
  }

  function buildQueries(seed) {
    const clean = familyKey(seed) || compactText(seed?.title);
    const artist = artistKey(seed);
    const queries = [];
    if (clean) {
      queries.push(`${clean} similar songs official audio`);
      queries.push(`${clean} radio mix songs`);
    }
    if (artist && !isGenericLabel(artist)) queries.push(`${artist} best songs official audio`);
    const tasteArtist = knownTasteRows().map(row => artistKey(row?.song)).find(value => value && value !== artist && !isGenericLabel(value));
    if (tasteArtist) queries.push(`${tasteArtist} ${clean || 'similar'} songs official audio`);
    return [...new Set(queries)].slice(0, 4);
  }

  function markPlayed(song) {
    if (!song?.id) return;
    state.playedIds.add(song.id);
    const family = familyKey(song); if (family) state.playedFamilies.add(family);
    const artist = artistKey(song); if (artist) state.artistRuns.set(artist, (state.artistRuns.get(artist) || 0) + 1);
  }

  function setStatus(value, source = '') {
    state.status = value;
    if (source) state.source = source;
    updateToggleUi();
  }

  async function fetchNetworkPool(seed) {
    const items = [];
    let source = '';
    try {
      if (window.echoAPI?.getSmartAutoplayCandidates) {
        const result = await window.echoAPI.getSmartAutoplayCandidates(seed, 32);
        if (Array.isArray(result?.items)) items.push(...result.items);
        if (result?.source) source = result.source;
      }
    } catch (_) {}
    if (items.length >= 8) return { items: uniqueSongs(items), source: source || 'radio' };

    const queries = buildQueries(seed);
    const settled = await Promise.allSettled(queries.map(q => window.echoAPI?.search?.(q)));
    settled.forEach(result => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) items.push(...result.value.slice(0, 16));
    });
    return { items: uniqueSongs(items), source: source || 'search' };
  }

  async function rebuildCandidates(seed = state.currentSeed, { append = false } = {}) {
    if (!enabled() || !state.active || !seed?.id) return [];
    const serial = ++state.buildSerial;
    setStatus('finding');
    const local = localTastePool();
    const network = await fetchNetworkPool(seed);
    if (serial !== state.buildSerial || !state.active) return state.candidates;

    const rankMap = tasteRankMap();
    const recent = recentIds();
    const sourceOrder = new Map();
    network.items.forEach((song, i) => sourceOrder.set(song.id, Math.max(0, 10 - i * 0.22)));
    local.forEach((song, i) => {
      const existing = sourceOrder.get(song.id) || 0;
      sourceOrder.set(song.id, Math.max(existing, Math.max(0, 2.6 - i * 0.035)));
    });

    const ranked = uniqueSongs([...network.items, ...local])
      .map(song => ({ song, score: candidateScore(song, seed, rankMap, recent, sourceOrder.get(song.id) || 0) }))
      .filter(row => row.score > -100)
      .sort((a, b) => b.score - a.score);

    const chosen = [], families = new Set();
    for (const row of ranked) {
      const family = familyKey(row.song);
      if (!family || families.has(family)) continue;
      const artist = artistKey(row.song);
      const sameArtistChosen = chosen.filter(x => artist && artistKey(x) === artist).length;
      if (sameArtistChosen >= 2) continue;
      families.add(family); chosen.push(row.song);
      if (chosen.length >= 24) break;
    }

    state.candidates = append ? uniqueSongs([...state.candidates, ...chosen]) : chosen;
    setStatus(state.candidates.length ? 'ready' : 'empty', network.source);
    try {
      const first = state.candidates[0];
      if (first && window.echoAPI?.prefetchSong) window.echoAPI.prefetchSong(first).catch(() => {});
    } catch (_) {}
    return state.candidates;
  }

  function scheduleBuild(seed, delay = 650, append = false) {
    const serial = state.buildSerial + 1;
    state.building = new Promise(resolve => setTimeout(async () => {
      if (!state.active || !enabled() || serial < state.buildSerial) return resolve(state.candidates);
      try { resolve(await rebuildCandidates(seed, { append })); } catch (_) { setStatus('empty'); resolve(state.candidates); }
    }, delay));
    return state.building;
  }

  function arm(seed, type) {
    if (!enabled() || !isEligibleContextType(type) || !seed?.id) { disarm(); return; }
    state.active = true;
    state.originType = type;
    state.anchorSeed = seed;
    state.currentSeed = seed;
    state.candidates = [];
    state.steps = 0;
    state.playedIds.clear(); state.playedFamilies.clear(); state.artistRuns.clear();
    markPlayed(seed);
    // Do not start another yt-dlp job while the selected song stream is still resolving.
    // The audio 'play' event below starts discovery after playback is already stable.
    setStatus('warming');
  }

  function disarm() {
    state.active = false;
    state.originType = '';
    state.anchorSeed = null;
    state.currentSeed = null;
    state.candidates = [];
    state.buildSerial++;
    state.building = null;
    setStatus('idle');
  }

  function safeContextFallback(seed) {
    try {
      if (!activeContext?.items?.length) return null;
      const len = activeContext.items.length;
      for (let step = 1; step <= len; step++) {
        const idx = (activeContext.index + step) % len;
        const song = activeContext.items[idx];
        if (!song?.id || state.playedIds.has(song.id) || sameSongFamily(song, seed)) continue;
        return song;
      }
    } catch (_) {}
    return null;
  }

  async function nextSmartCandidate() {
    if (!state.candidates.length) {
      try { if (state.building) await state.building; } catch (_) {}
    }
    if (!state.candidates.length) await rebuildCandidates(state.currentSeed || state.anchorSeed);
    while (state.candidates.length) {
      const song = state.candidates.shift();
      if (!song?.id || state.playedIds.has(song.id) || sameSongFamily(song, state.currentSeed)) continue;
      return song;
    }
    return safeContextFallback(state.currentSeed || state.anchorSeed);
  }

  async function playSmartNext({ auto = false } = {}) {
    if (!enabled() || !state.active || !state.currentSeed) return false;
    if (auto && typeof loopMode !== 'undefined' && loopMode === 'one') return false;
    try {
      if (typeof playQueue !== 'undefined' && playQueue.length) {
        // Explicit queue wins and ends the discovery-autoplay session so the user remains in control.
        disarm();
        return false;
      }
    } catch (_) {}

    if (!auto) {
      try { if (typeof smartRecordSkipSignal === 'function') smartRecordSkipSignal(currentSong); } catch (_) {}
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      const next = await nextSmartCandidate();
      if (!next) break;
      setStatus('playing');
      let started = false;
      try { started = await playSongObject(next, null, 'smart-autoplay'); } catch (_) { started = false; }
      if (!started) { markPlayed(next); continue; }
      state.steps++;
      state.currentSeed = next;
      markPlayed(next);
      setStatus('ready');
      if (state.candidates.length < 7 || state.steps % 2 === 0) scheduleBuild(next, 900, true);
      return true;
    }
    setStatus('empty');
    return false;
  }

  function updateToggleUi() {
    const button = document.getElementById('smartAutoplayToggle');
    const label = document.getElementById('smartAutoplayState');
    if (!button || !label) return;
    const on = enabled();
    button.classList.toggle('is-on', on);
    button.setAttribute('aria-pressed', String(on));
    label.textContent = on ? 'ON' : 'OFF';
    const suffix = on && state.active
      ? state.status === 'finding' ? ' · finding your next vibe'
        : state.status === 'ready' ? ` · ready${state.source ? ` via ${state.source === 'youtube-radio' ? 'radio' : 'taste engine'}` : ''}`
          : state.status === 'playing' ? ' · switching vibe' : ''
      : '';
    button.title = `Smart Autoplay ${on ? 'On' : 'Off'}${suffix}. Home/Search discovery only; Downloads, Liked Songs and Playlists keep their own order.`;
  }

  function syncTogglePlacement() {
    const wrap = document.querySelector('.smart-autoplay-home-wrap');
    if (!wrap) return;
    const homeActive = !!document.getElementById('homeView')?.classList.contains('active');
    wrap.classList.toggle('hidden', !homeActive);
  }

  function mountToggle() {
    const searchArea = document.querySelector('.topbar .search-area');
    const searchBox = searchArea?.querySelector('.search-box');
    const searchInput = searchBox?.querySelector('#searchInput');
    if (!searchArea || !searchBox || !searchInput || document.getElementById('smartAutoplayToggle')) { syncTogglePlacement(); return; }
    const wrap = document.createElement('div');
    wrap.className = 'smart-autoplay-home-wrap';
    wrap.innerHTML = `
      <button id="smartAutoplayToggle" class="smart-autoplay-toggle" type="button" aria-pressed="true">
        <span class="smart-autoplay-icon" aria-hidden="true">✦</span>
        <span class="smart-autoplay-copy"><strong>Smart Autoplay</strong><small>Next songs match your vibe</small></span>
        <span id="smartAutoplayState" class="smart-autoplay-state">ON</span>
      </button>`;
    // Keep Smart Autoplay inside the non-scrolling topbar, directly beside the quote/search field.
    // Home content scrolls inside <main>, so this control stays anchored at the top.
    searchInput.insertAdjacentElement('afterend', wrap);
    document.getElementById('smartAutoplayToggle')?.addEventListener('click', () => {
      const next = !enabled(); writeConfig({ enabled: next });
      if (!next) disarm();
      else {
        try {
          const type = activeContext?.type || '';
          if (currentSong?.id && isEligibleContextType(type)) arm(currentSong, type);
        } catch (_) {}
      }
      updateToggleUi();
      try { if (typeof showToast === 'function') showToast(`Smart Autoplay ${next ? 'ON' : 'OFF'}`); } catch (_) {}
    });
    document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => setTimeout(syncTogglePlacement, 0)));
    updateToggleUi(); syncTogglePlacement();
  }


  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { compactText, familyTokens, familyKey, overlapScore, sameSongFamily, artistKey, durationSeconds, isEligibleContextType };
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Context-aware activation: Home/Search discovery arms Smart Autoplay; collections keep their own queue/order.
  try {
    const originalSetActiveContext = setActiveContext;
    setActiveContext = function smartAutoplaySetContext(contextSpec, song = null, options = {}) {
      const result = originalSetActiveContext(contextSpec, song, options);
      let type = '';
      try { type = Array.isArray(contextSpec) ? 'collection' : String(contextSpec?.type || activeContext?.type || ''); } catch (_) {}
      if (enabled() && isEligibleContextType(type) && song?.id) arm(song, type);
      else if (type && type !== 'smart-autoplay') disarm();
      return result;
    };
  } catch (_) {}

  try {
    const originalPlayNext = playNext;
    playNext = async function smartAutoplayNext(options = {}) {
      const auto = !!options?.auto;
      if (enabled() && state.active) {
        // Loop-one and explicit queues must retain the base player's semantics.
        try { if (auto && loopMode === 'one') return originalPlayNext(options); } catch (_) {}
        try { if (playQueue?.length) { disarm(); return originalPlayNext(options); } } catch (_) {}
        const started = await playSmartNext({ auto });
        if (started) return;
        // If the taste engine has no answer, never blindly jump to another duplicate search result.
        const fallback = safeContextFallback(state.currentSeed || currentSong);
        if (fallback) {
          const ok = await playSongObject(fallback, null, 'smart-autoplay');
          if (ok) { state.currentSeed = fallback; markPlayed(fallback); return; }
        }
        try { if (typeof showToast === 'function') showToast('Smart Autoplay ko related next song nahi mila'); } catch (_) {}
        return;
      }
      return originalPlayNext(options);
    };
  } catch (_) {}

  try {
    const player = document.getElementById('audioPlayer');
    player?.addEventListener('play', () => {
      if (enabled() && state.active && state.status === 'warming' && state.currentSeed?.id) scheduleBuild(state.currentSeed, 1500, false);
    });
  } catch (_) {}

  document.addEventListener('DOMContentLoaded', mountToggle, { once: true });
  mountToggle();

  // Small public debug/status surface; no playback internals are exposed.
  window.deepEchoSmartAutoplay = {
    get enabled() { return enabled(); },
    get active() { return state.active; },
    get originType() { return state.originType; },
    get queued() { return state.candidates.length; },
    setEnabled(value) { writeConfig({ enabled: !!value }); if (!value) disarm(); updateToggleUi(); },
    refresh() { return state.active ? rebuildCandidates(state.currentSeed || state.anchorSeed) : Promise.resolve([]); }
  };

})();
