// DEEP-ECHO v2.3.0 V14 — Resume Session + Personal Mixes + Listening Stats
// Additive module: preserves renderer playback/search/lyrics/queue engines and only consumes their public globals.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const SESSION_KEY = 'deepeccho-resume-session-v1';
  const SESSION_ENABLED_KEY = 'deepeccho-resume-session-enabled-v1';
  const STATS_KEY = 'deepeccho-listening-stats-v1';
  const MIX_KEY = 'deepeccho-personal-mixes-v1';
  const MIX_REFRESH_MS = 6 * 60 * 60 * 1000;
  const MAX_SESSION_AGE_MS = 14 * 24 * 60 * 60 * 1000;
  const saveJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };
  const readJson = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (_) { return fallback; } };
  const escapeText = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const resumeEnabled = () => localStorage.getItem(SESSION_ENABLED_KEY) !== 'false';
  const setResumeEnabled = value => localStorage.setItem(SESSION_ENABLED_KEY, value ? 'true' : 'false');

  function safeSong(raw) {
    if (!raw) return null;
    let song = null;
    try { song = typeof queueSong === 'function' ? queueSong(raw) : { ...raw }; } catch (_) { song = { ...raw }; }
    if (!song?.id && !song?.filepath && !song?.fileUrl) return null;
    // Remote YouTube stream URLs expire. Resolve them fresh on the next launch.
    if (!song.filepath && !song.fileUrl) delete song.streamUrl;
    return song;
  }

  function safeContext() {
    try {
      if (!activeContext?.items?.length) return null;
      const items = activeContext.items.slice(0, 80).map(safeSong).filter(Boolean);
      if (!items.length) return null;
      return {
        type: String(activeContext.type || 'collection'),
        label: String(activeContext.label || 'Collection'),
        key: String(activeContext.key || activeContext.type || 'collection'),
        index: Math.max(0, Math.min(items.length - 1, Number(activeContext.index || 0))),
        items
      };
    } catch (_) { return null; }
  }

  function activeTabName() {
    return document.querySelector('.nav-item.active[data-tab]')?.dataset?.tab || document.querySelector('.view.active')?.id?.replace(/View$/, '') || 'home';
  }

  let lastSessionSave = 0;
  function saveSession(force = false) {
    if (!resumeEnabled()) return;
    const now = Date.now();
    if (!force && now - lastSessionSave < 1400) return;
    lastSessionSave = now;
    let song = null, position = 0, duration = 0, wasPlaying = false;
    try {
      song = safeSong(currentSong);
      position = Math.max(0, Number(audioPlayer?.currentTime || 0));
      duration = Math.max(0, Number(audioPlayer?.duration || 0));
      wasPlaying = !!audioPlayer?.src && !audioPlayer.paused && !audioPlayer.ended;
    } catch (_) {}
    saveJson(SESSION_KEY, {
      version: 1,
      savedAt: now,
      tab: activeTabName(),
      song,
      position,
      duration,
      wasPlaying,
      context: safeContext()
    });
  }

  function clearSavedSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
    try { showToast('Saved session cleared'); } catch (_) {}
  }

  async function restoreSession() {
    if (!resumeEnabled()) return;
    const snap = readJson(SESSION_KEY, null);
    if (!snap?.savedAt || Date.now() - Number(snap.savedAt) > MAX_SESSION_AGE_MS) return;
    // Never steal control if the user already started playback during launch.
    try { if (currentSong?.id) return; } catch (_) {}

    const targetTab = String(snap.tab || 'home');
    try { if (typeof activateTab === 'function') activateTab(targetTab); } catch (_) {}

    const song = safeSong(snap.song);
    if (!song) return;
    const position = Math.max(0, Number(snap.position || 0));
    const duration = Math.max(0, Number(snap.duration || 0));
    if (duration > 0 && duration - position < 8) return;

    try {
      let started = false;
      const context = snap.context;
      if (context?.items?.length && typeof setActiveContext === 'function' && typeof playContextAt === 'function') {
        const items = context.items.map(safeSong).filter(Boolean);
        const idxById = items.findIndex(item => item.id && item.id === song.id);
        const index = idxById >= 0 ? idxById : Math.max(0, Math.min(items.length - 1, Number(context.index || 0)));
        setActiveContext({ items, type: context.type || 'collection', label: context.label || 'Collection', key: context.key || 'session' }, items[index] || song);
        started = await playContextAt(index, null, { recordHistory:false });
      } else if (typeof startSingleSong === 'function') {
        await startSingleSong(song, null);
        started = !!currentSong && (!song.id || currentSong.id === song.id);
      }
      if (!started) return;

      const seekAndState = () => {
        try {
          if (position > 0 && Number.isFinite(audioPlayer.duration) && audioPlayer.duration > 0) {
            audioPlayer.currentTime = Math.min(position, Math.max(0, audioPlayer.duration - 3));
            if (typeof syncLyrics === 'function') syncLyrics(true);
          }
          if (!snap.wasPlaying) audioPlayer.pause();
        } catch (_) {}
      };
      if (audioPlayer.readyState >= 1) seekAndState();
      else audioPlayer.addEventListener('loadedmetadata', seekAndState, { once:true });
      try { showToast(`Session restored · ${song.title || 'last song'}`); } catch (_) {}
    } catch (_) {}
  }

  function installSessionSettings() {
    const parent = document.querySelector('#settingsView .smart-audio-settings') || document.querySelector('#settingsView .settings-card');
    if (!parent || $('v2314SessionCard')) return;
    const card = document.createElement('div');
    card.id = 'v2314SessionCard'; card.className = 'setting-block v2314-session-card';
    card.innerHTML = `
      <div class="setting-title-row"><span>Resume Session</span><strong id="v2314SessionState">${resumeEnabled() ? 'ON' : 'OFF'}</strong></div>
      <label class="switch-row"><span>Resume where I left off</span><input id="v2314ResumeToggle" type="checkbox" ${resumeEnabled() ? 'checked' : ''}/></label>
      <p class="setting-help">Restores the last section, current song, playback position and its collection context. Queue, volume and theme keep using their existing DEEP-ECHO storage.</p>
      <div class="setting-inline-actions"><button id="v2314ClearSession" class="secondary-btn" type="button">Clear Saved Session</button></div>`;
    parent.appendChild(card);
    $('v2314ResumeToggle')?.addEventListener('change', event => {
      const enabled = !!event.target.checked; setResumeEnabled(enabled);
      if ($('v2314SessionState')) $('v2314SessionState').textContent = enabled ? 'ON' : 'OFF';
      if (enabled) saveSession(true); else clearSavedSession();
    });
    $('v2314ClearSession')?.addEventListener('click', clearSavedSession);
  }

  // ---------- Personal Mixes ----------
  function textOf(song) { return `${song?.title || ''} ${song?.channel || song?.artist || ''}`.toLowerCase(); }
  function tokenScore(text, tokens) { let n = 0; tokens.forEach(t => { if (text.includes(t)) n += 1; }); return n; }
  function durationSeconds(value) {
    const parts = String(value || '').split(':').map(Number).filter(Number.isFinite);
    if (!parts.length) return 0;
    return parts.reduce((sum, n) => sum * 60 + n, 0);
  }
  function uniqueSongs(items) {
    const seen = new Set(), out = [];
    (items || []).forEach(raw => {
      const song = safeSong(raw); if (!song) return;
      const key = song.id || `${song.title}|${song.channel}`.toLowerCase();
      if (!key || seen.has(key)) return; seen.add(key); out.push(song);
    });
    return out;
  }
  function preferenceSignals() { try { return typeof smartPreferenceSignals === 'function' ? smartPreferenceSignals() : {}; } catch (_) { return {}; } }
  function baseTastePool() {
    const out = [];
    try { out.push(...(getLikedSongs?.() || [])); } catch (_) {}
    try { out.push(...(getStored(STORAGE.recent, []) || [])); } catch (_) {}
    try { out.push(...Object.values(getStored(STORAGE.playStats, {}) || {}).map(v => v?.song).filter(Boolean)); } catch (_) {}
    try { out.push(...((getStored(STORAGE.smartHistory, []) || []).map(v => v?.song).filter(Boolean))); } catch (_) {}
    try { out.push(...((typeof smartRecommendationCache === 'function' ? smartRecommendationCache()?.songs : []) || [])); } catch (_) {}
    return uniqueSongs(out);
  }
  function baseTasteScore(song) {
    let stats = {}, signals = {}, liked = false, recentIndex = -1;
    try { stats = (getStored(STORAGE.playStats, {}) || {})[song.id] || {}; } catch (_) {}
    try { signals = preferenceSignals()[song.id] || {}; } catch (_) {}
    try { liked = (getLikedSongs?.() || []).some(s => s.id === song.id); } catch (_) {}
    try { recentIndex = (getStored(STORAGE.recent, []) || []).findIndex(s => s.id === song.id); } catch (_) {}
    const ageHours = Math.max(0, (Date.now() - Number(stats.lastPlayed || signals.lastSignal || Date.now())) / 3600000);
    return (liked ? 7 : 0) + Math.log2(1 + Number(stats.count || 0)) * 3 + Number(signals.completes || 0) * 2.4 + Number(signals.likes || 0) * 2 - Number(signals.skips || 0) * 3 + (recentIndex >= 0 ? Math.max(0, 2.2 - recentIndex * .25) : 0) + Math.max(0, 1.8 - Math.log2(1 + ageHours) * .22);
  }
  function categoryScore(song, mode) {
    const text = textOf(song); let n = baseTasteScore(song);
    if (mode === 'romantic') n += tokenScore(text, ['love','romantic','ishq','pyaar','pyar','dil','heart','mohabbat','jaan','tere','tera','teri','tum','tu hi','sajna','sanam']) * 3.1;
    if (mode === 'chill') n += tokenScore(text, ['chill','acoustic','slow','lofi','soft','calm','unplugged','night','moon','sukoon','dream','ambient']) * 3.0;
    if (mode === 'energy') n += tokenScore(text, ['remix','dance','party','bass','edm','rock','energy','workout','club','dj']) * 3.0;
    if (mode === 'late') n += tokenScore(text, ['night','slow','love','romantic','acoustic','chill','dream','moon','sad','lofi','sukoon']) * 2.7;
    if (mode === 'rediscover') {
      let st = {}; try { st = (getStored(STORAGE.playStats, {}) || {})[song.id] || {}; } catch (_) {}
      const days = Math.max(0, (Date.now() - Number(st.lastPlayed || 0)) / 86400000);
      n += Math.min(12, days * .7) + Math.log2(1 + Number(st.count || 0)) * 2;
    }
    return n;
  }
  function diverseRank(pool, mode, limit = 10) {
    const ranked = uniqueSongs(pool).map(song => ({ song, score: categoryScore(song, mode) })).sort((a,b) => b.score - a.score);
    const out = [], artistUse = new Map();
    for (const row of ranked) {
      const artist = String(row.song.channel || '').toLowerCase() || 'unknown';
      const used = artistUse.get(artist) || 0;
      if (used >= 2) continue;
      if (durationSeconds(row.song.duration) > 15 * 60) continue;
      out.push(row.song); artistUse.set(artist, used + 1);
      if (out.length >= limit) break;
    }
    return out;
  }
  function mixSpecs(pool) {
    const hour = new Date().getHours();
    let stats = {}; try { stats = getStored(STORAGE.playStats, {}) || {}; } catch (_) {}
    const artistCounts = new Map();
    Object.values(stats).forEach(row => {
      const artist = String(row?.song?.channel || '').trim(); if (!artist) return;
      artistCounts.set(artist, (artistCounts.get(artist) || 0) + Number(row?.count || 0));
    });
    const topArtist = [...artistCounts.entries()].sort((a,b) => b[1] - a[1])[0]?.[0] || '';
    const daily = diverseRank(pool, 'daily', 10);
    const romantic = diverseRank(pool, 'romantic', 10);
    const chill = diverseRank(pool, hour >= 20 || hour < 6 ? 'late' : 'chill', 10);
    const rediscover = diverseRank(pool, 'rediscover', 10);
    const artistSongs = topArtist ? uniqueSongs(pool.filter(song => String(song.channel || '').toLowerCase().includes(topArtist.toLowerCase()) || topArtist.toLowerCase().includes(String(song.channel || '').toLowerCase()))).slice(0, 10) : [];
    return [
      { id:'daily', name:'Your Daily Mix', subtitle:'Your strongest taste signals', songs:daily, mode:'daily' },
      { id:'romantic', name:'Your Romantic Mix', subtitle:'Love & melodic picks from your taste', songs:romantic.length >= 4 ? romantic : daily, mode:'romantic' },
      { id:'mood', name:(hour >= 20 || hour < 6) ? 'Late Night Mix' : 'Chill Mix', subtitle:(hour >= 20 || hour < 6) ? 'Softer picks for this hour' : 'Easy listening built around your taste', songs:chill.length >= 4 ? chill : daily, mode:(hour >= 20 || hour < 6) ? 'late' : 'chill' },
      { id:'rediscover', name:'Rediscover', subtitle:'Old favorites worth bringing back', songs:rediscover, mode:'rediscover' },
      ...(artistSongs.length >= 3 ? [{ id:'artist', name:`${topArtist} Mix`, subtitle:'Based on one of your top artists', songs:artistSongs, mode:'artist' }] : [])
    ].filter(m => m.songs?.length);
  }

  function installPersonalMixesSection() {
    const home = $('homeView'); if (!home || $('v2314PersonalMixes')) return;
    const section = document.createElement('div'); section.id = 'v2314PersonalMixes'; section.className = 'home-section v2314-personal-mixes';
    section.innerHTML = `<div class="section-head"><h2>Personal Mixes</h2><span>Built from your likes, repeats, skips and listening history</span><div class="v2314-mix-tools deepecho-shelf-tools"><button id="v2314MixLeft" class="deepecho-shelf-arrow" type="button" aria-label="Scroll mixes left">‹</button><button id="v2314MixRight" class="deepecho-shelf-arrow" type="button" aria-label="Scroll mixes right">›</button><button id="v2314RefreshMixes" class="deepecho-see-more" type="button">Refresh Mixes</button></div></div><div id="v2314MixGrid" class="v2314-mix-grid deepecho-horizontal-shelf"></div><p id="v2314MixHint" class="section-hint">Play and like a few songs so DEEP-ECHO can build your mixes.</p>`;
    const anchor = $('becauseSection');
    if (anchor?.parentNode) anchor.insertAdjacentElement('afterend', section); else home.appendChild(section);
    $('v2314MixLeft')?.addEventListener('click', () => $('v2314MixGrid')?.scrollBy({ left:-Math.max(300, $('v2314MixGrid').clientWidth * .8), behavior:'smooth' }));
    $('v2314MixRight')?.addEventListener('click', () => $('v2314MixGrid')?.scrollBy({ left:Math.max(300, $('v2314MixGrid').clientWidth * .8), behavior:'smooth' }));
    $('v2314RefreshMixes')?.addEventListener('click', async () => { await refreshPersonalMixes(true); });
  }

  function renderMixes(mixes) {
    const grid = $('v2314MixGrid'), hint = $('v2314MixHint'); if (!grid) return;
    grid.replaceChildren();
    const valid = (mixes || []).filter(m => m?.songs?.length);
    if (hint) hint.style.display = valid.length ? 'none' : 'block';
    valid.forEach(mix => {
      const songs = uniqueSongs(mix.songs).slice(0, 10); if (!songs.length) return;
      let card = null;
      if (typeof buildPlaylistCard === 'function') {
        card = buildPlaylistCard({
          title: mix.name,
          subtitle: mix.subtitle,
          countText: `${songs.length} songs · ${mix.subtitle}`,
          thumbnail: songs[0]?.thumbnail || '',
          iconText: 'MX',
          openLabel: 'Open Mix',
          onOpen: () => {
            if (typeof window.deepEchoOpenPlaylistCollection === 'function') window.deepEchoOpenPlaylistCollection(mix.name, songs, { type:'personal-mix', key:`personal-mix:${mix.id}`, returnTab:'home', subtitle:'Personal Mix' });
            else if (typeof playSongCollection === 'function') playSongCollection(songs, mix.name, { type:'personal-mix', key:`personal-mix:${mix.id}` });
          },
          onPlay: button => typeof playSongCollection === 'function' ? playSongCollection(songs, mix.name, { type:'personal-mix', key:`personal-mix:${mix.id}` }, button) : Promise.resolve()
        });
      }
      if (!card) {
        card = document.createElement('button'); card.type='button'; card.className='v2314-fallback-mix'; card.textContent=mix.name;
        card.onclick=()=>playSongCollection?.(songs,mix.name,{type:'personal-mix',key:`personal-mix:${mix.id}`});
      }
      card.classList.add('v2314-mix-card');
      const badge = document.createElement('span'); badge.className = 'v2314-mix-badge'; badge.textContent = 'PERSONAL'; card.appendChild(badge);
      grid.appendChild(card);
    });
  }

  async function enrichPersonalMixes(mixes) {
    if (!window.echoAPI?.search) return mixes;
    const tasks = mixes.slice(0, 3).map(async mix => {
      const seed = mix.songs?.[0]; if (!seed?.title) return mix;
      const flavor = mix.mode === 'romantic' ? 'romantic similar songs' : mix.mode === 'late' || mix.mode === 'chill' ? 'chill similar songs' : 'similar songs';
      try {
        const rows = await window.echoAPI.search(`${seed.title} ${seed.channel || ''} ${flavor} official audio`);
        const blended = diverseRank([...mix.songs, ...(Array.isArray(rows) ? rows : [])], mix.mode, 10);
        return { ...mix, songs: blended.length ? blended : mix.songs };
      } catch (_) { return mix; }
    });
    const enriched = await Promise.all(tasks);
    return mixes.map((m, i) => enriched[i] || m);
  }

  async function refreshPersonalMixes(force = false) {
    installPersonalMixesSection();
    const button = $('v2314RefreshMixes'); if (button) { button.disabled = true; button.textContent = 'Refreshing…'; }
    try {
      const pool = baseTastePool();
      if (!pool.length) { renderMixes([]); return; }
      let mixes = mixSpecs(pool);
      const cached = readJson(MIX_KEY, null);
      if (!force && cached?.updatedAt && Date.now() - Number(cached.updatedAt) < MIX_REFRESH_MS && Array.isArray(cached.mixes) && cached.mixes.length) {
        mixes = cached.mixes.map(m => ({ ...m, songs: uniqueSongs(m.songs) }));
        renderMixes(mixes);
        return;
      }
      renderMixes(mixes); // instant local result
      const enriched = await enrichPersonalMixes(mixes);
      saveJson(MIX_KEY, { updatedAt:Date.now(), mixes:enriched.map(m => ({ ...m, songs:m.songs.map(safeSong).filter(Boolean) })) });
      renderMixes(enriched);
      if (force) { try { showToast('Personal Mixes refreshed for your taste'); } catch (_) {} }
    } finally { if (button) { button.disabled = false; button.textContent = 'Refresh Mixes'; } }
  }

  // ---------- Listening Stats ----------
  function statsState() {
    const raw = readJson(STATS_KEY, {});
    return {
      startedAt: Number(raw.startedAt || Date.now()),
      totalSeconds: Number(raw.totalSeconds || 0),
      bySong: raw.bySong && typeof raw.bySong === 'object' ? raw.bySong : {},
      byArtist: raw.byArtist && typeof raw.byArtist === 'object' ? raw.byArtist : {},
      byDay: raw.byDay && typeof raw.byDay === 'object' ? raw.byDay : {},
      lastSavedAt: Number(raw.lastSavedAt || 0)
    };
  }
  let listenState = statsState(), lastListenWall = 0, lastListenSong = '', statsDirty = false, lastStatsPersist = 0;
  function dayKey(ts = Date.now()) { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function recordListeningTick() {
    const now = performance.now(); let playing = false, song = null;
    try { playing = !!audioPlayer?.src && !audioPlayer.paused && !audioPlayer.ended; song = safeSong(currentSong); } catch (_) {}
    if (!playing || !song) { lastListenWall = now; lastListenSong = song?.id || ''; return; }
    if (!lastListenWall || lastListenSong !== song.id) { lastListenWall = now; lastListenSong = song.id; return; }
    const delta = Math.max(0, Math.min(4, (now - lastListenWall) / 1000)); lastListenWall = now;
    if (delta <= 0 || delta > 4) return;
    listenState.totalSeconds += delta;
    const id = song.id || `${song.title}|${song.channel}`;
    const entry = listenState.bySong[id] || { song:safeSong(song), seconds:0 };
    entry.song = safeSong(song); entry.seconds = Number(entry.seconds || 0) + delta; listenState.bySong[id] = entry;
    const artist = String(song.channel || 'Unknown Artist').trim() || 'Unknown Artist'; listenState.byArtist[artist] = Number(listenState.byArtist[artist] || 0) + delta;
    const day = dayKey(); listenState.byDay[day] = Number(listenState.byDay[day] || 0) + delta;
    statsDirty = true;
    if (Date.now() - lastStatsPersist > 12000) persistStats();
  }
  function persistStats(force = false) {
    if (!statsDirty && !force) return;
    lastStatsPersist = Date.now(); listenState.lastSavedAt = lastStatsPersist; saveJson(STATS_KEY, listenState); statsDirty = false;
  }
  function formatMinutes(seconds) { const mins = Math.round(Number(seconds || 0) / 60); if (mins < 60) return `${mins} min`; const h = Math.floor(mins / 60), m = mins % 60; return `${h}h ${m}m`; }
  function trackedWeekSeconds() { let total = 0; for (let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);total+=Number(listenState.byDay[dayKey(d.getTime())]||0);} return total; }
  function playData() {
    let playStats = {}, history = [], liked = [];
    try { playStats = getStored(STORAGE.playStats, {}) || {}; } catch (_) {}
    try { history = getStored(STORAGE.smartHistory, []) || []; } catch (_) {}
    try { liked = getLikedSongs?.() || []; } catch (_) {}
    const songRows = Object.values(playStats).filter(v => v?.song).sort((a,b) => Number(b.count||0)-Number(a.count||0));
    const artists = new Map();
    songRows.forEach(row => { const a = String(row.song.channel || 'Unknown Artist'); artists.set(a, (artists.get(a)||0)+Number(row.count||0)); });
    const topArtists = [...artists.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
    const topSongs = songRows.slice(0,5);
    return { playStats, history, liked, songRows, topArtists, topSongs };
  }

  function installStatsView() {
    if ($('statsView')) return;
    const settingsBtn = document.querySelector('.nav-item[data-tab="settings"]');
    const nav = settingsBtn?.parentElement;
    if (nav) {
      const btn = document.createElement('button'); btn.id='v2314StatsNav'; btn.className='nav-item'; btn.dataset.tab='stats'; btn.textContent='Listening Stats';
      nav.insertBefore(btn, settingsBtn);
      btn.addEventListener('click', () => activateTab('stats'));
    }
    const main = document.querySelector('.main-col main'); if (!main) return;
    const view = document.createElement('section'); view.id='statsView'; view.className='view v2314-stats-view';
    view.innerHTML = `
      <div class="view-title-row"><div><h2>Listening Stats</h2><p>Your listening story, kept locally on this PC</p></div><button id="v2314StatsRefresh" class="secondary-btn primary-outline" type="button">Refresh</button></div>
      <div class="v2314-stats-grid">
        <article class="v2314-stat-card"><span>Tracked listening</span><strong id="v2314StatTime">0 min</strong><small id="v2314StatSince">Starts with this build</small></article>
        <article class="v2314-stat-card"><span>This week</span><strong id="v2314StatWeek">0 min</strong><small>Actual playback time tracked locally</small></article>
        <article class="v2314-stat-card"><span>Plays</span><strong id="v2314StatPlays">0</strong><small id="v2314StatUnique">0 unique songs</small></article>
        <article class="v2314-stat-card"><span>Liked</span><strong id="v2314StatLiked">0</strong><small>Your saved favorites</small></article>
      </div>
      <div class="v2314-stats-panels">
        <section class="v2314-stats-panel"><div class="section-head"><h2>Top Songs</h2><span>Based on your play counts</span></div><div id="v2314TopSongs" class="v2314-rank-list"></div></section>
        <section class="v2314-stats-panel"><div class="section-head"><h2>Top Artists</h2><span>Based on songs you actually start</span></div><div id="v2314TopArtists" class="v2314-rank-list"></div></section>
      </div>
      <section class="v2314-stats-panel v2314-week-panel"><div class="section-head"><h2>Last 7 Days</h2><span>Listening minutes per day</span></div><div id="v2314WeekBars" class="v2314-week-bars"></div></section>
      <p class="v2314-stats-note">Listening-time tracking is exact from V14 onward. Existing play counts/history from earlier DeepEcho builds are still used for Top Songs and Top Artists.</p>`;
    main.appendChild(view);
    $('v2314StatsRefresh')?.addEventListener('click', renderStats);

    // Existing activateTab captured the old static nav/view NodeLists. Wrap it so the new view behaves like a native tab.
    try {
      const originalActivate = activateTab;
      activateTab = function(tabName) {
        if (tabName === 'stats') {
          document.querySelectorAll('.nav-item[data-tab]').forEach(n => n.classList.toggle('active', n.dataset.tab === 'stats'));
          document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
          $('statsView')?.classList.add('active'); renderStats(); saveSession(true); return;
        }
        originalActivate(tabName);
        $('v2314StatsNav')?.classList.remove('active'); $('statsView')?.classList.remove('active');
        if (tabName === 'home') setTimeout(() => refreshPersonalMixes(false), 80);
      };
      window.activateTab = activateTab;
    } catch (_) {}
  }

  function rankRow(number, title, sub, right) {
    const row = document.createElement('div'); row.className='v2314-rank-row';
    row.innerHTML = `<b>${number}</b><div><strong>${escapeText(title)}</strong><small>${escapeText(sub || '')}</small></div><span>${escapeText(right || '')}</span>`;
    return row;
  }
  function renderStats() {
    persistStats(true); listenState = statsState();
    const data = playData();
    if ($('v2314StatTime')) $('v2314StatTime').textContent = formatMinutes(listenState.totalSeconds);
    if ($('v2314StatWeek')) $('v2314StatWeek').textContent = formatMinutes(trackedWeekSeconds());
    const plays = Object.values(data.playStats).reduce((n,row)=>n+Number(row?.count||0),0);
    if ($('v2314StatPlays')) $('v2314StatPlays').textContent = String(plays || data.history.length || 0);
    if ($('v2314StatUnique')) $('v2314StatUnique').textContent = `${Object.keys(data.playStats).length} unique songs`;
    if ($('v2314StatLiked')) $('v2314StatLiked').textContent = String(data.liked.length);
    if ($('v2314StatSince')) $('v2314StatSince').textContent = `Tracked since ${new Date(listenState.startedAt).toLocaleDateString()}`;
    const songsEl=$('v2314TopSongs'); if(songsEl){songsEl.replaceChildren();data.topSongs.forEach((row,i)=>songsEl.appendChild(rankRow(i+1,row.song.title,row.song.channel,`${Number(row.count||0)}×`)));if(!data.topSongs.length)songsEl.innerHTML='<p class="hint">Play some songs to build your stats.</p>';}
    const artistsEl=$('v2314TopArtists'); if(artistsEl){artistsEl.replaceChildren();data.topArtists.forEach((row,i)=>artistsEl.appendChild(rankRow(i+1,row[0],'Artist',`${row[1]} plays`)));if(!data.topArtists.length)artistsEl.innerHTML='<p class="hint">Artist stats will appear after listening.</p>';}
    const week=$('v2314WeekBars'); if(week){week.replaceChildren();const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push({label:d.toLocaleDateString([], {weekday:'short'}),seconds:Number(listenState.byDay[dayKey(d.getTime())]||0)});}const max=Math.max(60,...days.map(d=>d.seconds));days.forEach(day=>{const bar=document.createElement('div');bar.className='v2314-day-bar';bar.innerHTML=`<span>${escapeText(day.label)}</span><div><i style="height:${Math.max(4,Math.round(day.seconds/max*100))}%"></i></div><small>${Math.round(day.seconds/60)}m</small>`;week.appendChild(bar);});}
  }

  function init() {
    installSessionSettings();
    installStatsView();
    installPersonalMixesSection();
    refreshPersonalMixes(false);

    // Session capture: lightweight and throttled. Existing playback persistence remains untouched.
    audioPlayer?.addEventListener('timeupdate', () => { recordListeningTick(); saveSession(false); });
    audioPlayer?.addEventListener('play', () => { lastListenWall = performance.now(); lastListenSong = currentSong?.id || ''; saveSession(true); });
    audioPlayer?.addEventListener('pause', () => { recordListeningTick(); persistStats(true); saveSession(true); });
    audioPlayer?.addEventListener('ended', () => { recordListeningTick(); persistStats(true); saveSession(true); setTimeout(() => refreshPersonalMixes(false), 400); });
    audioPlayer?.addEventListener('seeking', () => saveSession(false));
    document.addEventListener('click', event => { if (event.target?.closest?.('.nav-item[data-tab]')) setTimeout(() => saveSession(true), 0); }, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { recordListeningTick(); persistStats(true); saveSession(true); } });
    window.addEventListener('beforeunload', () => { recordListeningTick(); persistStats(true); saveSession(true); });

    // Refresh mixes when likes/history meaningfully change without polling aggressively.
    window.addEventListener('storage', event => { if ([STORAGE?.liked, STORAGE?.playStats, STORAGE?.preferenceSignals].includes(event.key)) refreshPersonalMixes(false); });

    // Wait until renderer startup/library scan settles. If the user already starts something, restoreSession safely aborts.
    const scheduleRestore = () => setTimeout(restoreSession, 1250);
    if (document.readyState === 'complete') scheduleRestore(); else window.addEventListener('load', scheduleRestore, { once:true });
    setInterval(() => { if (!document.hidden) { recordListeningTick(); if ($('statsView')?.classList.contains('active')) renderStats(); } }, 3000);
  }

  try { init(); } catch (_) {}
})();
