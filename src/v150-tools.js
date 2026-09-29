// Deepeccho v1.5.0 built-in power tools.
// This file intentionally wraps public playback/playlist entry points instead of
// modifying the lyrics, visualizer, theme or analyser engines.
(() => {
  'use strict';

  Object.assign(STORAGE, {
    skipRules: 'deepeccho-auto-skip-rules-v1',
    blacklist: 'deepeccho-blacklist-v1',
    playlistSnapshots: 'deepeccho-playlist-snapshots-v1',
    shortcuts: 'deepeccho-global-shortcuts-v1',
    floatingLyrics: 'deepeccho-floating-lyrics-v1',
    versionPreference: 'deepeccho-version-preference-v1'
  });

  const $ = (id) => document.getElementById(id);
  const DEFAULT_SKIP = { live:false, remix:false, instrumental:false, karaoke:false, clean:false, slowed:false, nightcore:false, cover:false };
  const DEFAULT_SHORTCUTS = {
    playPause:'Ctrl+Alt+Space', floatingClickThrough:'Ctrl+Alt+X', next:'Ctrl+Alt+Right', previous:'Ctrl+Alt+Left', like:'Ctrl+Alt+L',
    lyrics:'Ctrl+Alt+Y', mini:'Ctrl+Alt+M', fullscreen:'Ctrl+Alt+F', volumeUp:'Ctrl+Alt+Up',
    volumeDown:'Ctrl+Alt+Down', mute:'Ctrl+Alt+0'
  };
  const SKIP_PATTERNS = {
    live:/\b(live|concert|festival|on stage|stage performance)\b/i,
    remix:/\b(remix|club mix|mix edit)\b/i,
    instrumental:/\b(instrumental|no vocals?)\b/i,
    karaoke:/\b(karaoke|sing along)\b/i,
    clean:/\b(clean version|censored|radio edit)\b/i,
    slowed:/\b(slowed|reverb|slowed\s*\+\s*reverb)\b/i,
    nightcore:/\b(nightcore|sped up|speed up)\b/i,
    cover:/\b(cover|covered by|cover version)\b/i
  };

  const cleanText = (v) => String(v || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const titleKey = (s) => cleanText(s?.title).replace(/\b(official|audio|video|lyrics?|lyrical|hd|4k|music|song|full)\b/g, '').replace(/\s+/g, ' ').trim();
  const channelKey = (s) => cleanText(s?.channel).replace(/\b(vevo|topic|official)\b/g, '').trim();
  const durationSeconds = (v) => {
    const p = String(v || '').split(':').map(Number);
    if (!p.length || p.some(Number.isNaN)) return 0;
    return p.reduce((a, n) => a * 60 + n, 0);
  };

  function getSkipRules() { return { ...DEFAULT_SKIP, ...getStored(STORAGE.skipRules, {}) }; }
  function getBlacklist() {
    const raw = getStored(STORAGE.blacklist, { songs:[], artists:[] });
    return { songs:Array.isArray(raw.songs) ? raw.songs : [], artists:Array.isArray(raw.artists) ? raw.artists : [] };
  }
  function saveBlacklist(value) { setStored(STORAGE.blacklist, value); renderBlacklist(); }
  function songBlocked(song) {
    if (!song?.id) return false;
    const blocked = getBlacklist();
    const channel = cleanText(song.channel);
    return blocked.songs.some((x) => x.id === song.id) || blocked.artists.some((artist) => channel.includes(cleanText(artist)));
  }
  function skipReason(song) {
    if (!song) return '';
    if (songBlocked(song)) return 'blacklist';
    const rules = getSkipRules();
    const text = `${song.title || ''} ${song.channel || ''}`;
    for (const [name, enabled] of Object.entries(rules)) {
      if (enabled && SKIP_PATTERNS[name]?.test(text)) return name;
    }
    return '';
  }

  // ---------- Track version preference ----------
  function versionSettings() { return { enabled:true, preference:'official-audio', ...getStored(STORAGE.versionPreference, {}) }; }
  function versionScore(song, preference = versionSettings().preference) {
    const title = String(song?.title || '').toLowerCase();
    const channel = String(song?.channel || '').toLowerCase();
    let score = 0;
    if (/official audio/.test(title)) score += preference === 'official-audio' ? 22 : 8;
    if (/official (music )?video/.test(title)) score += preference === 'music-video' ? 22 : 7;
    if (/\btopic\b/.test(channel)) score += preference === 'topic' ? 20 : 5;
    if (/lyrics?|lyrical/.test(title)) score += preference === 'lyrics' ? 18 : 1;
    if (/live|concert|cover|karaoke|slowed|nightcore|remix/.test(title)) score -= 13;
    if (preference === 'any') score += 5;
    return score;
  }
  async function resolvePreferredVersion(song) {
    const cfg = versionSettings();
    if (!cfg.enabled || cfg.preference === 'any' || !song?.id) return song;
    const currentScore = versionScore(song, cfg.preference);
    if (currentScore >= 17) return song;
    const alternateLooking = /\b(live|remix|cover|karaoke|slowed|reverb|nightcore|lyrics?|lyrical|official video)\b/i.test(song.title || '');
    if (!alternateLooking) return song; // avoid extra network work for normal results.
    try {
      const results = await window.echoAPI.search(`${titleKey(song)} ${song.channel || ''} official audio`);
      if (!Array.isArray(results) || !results.length) return song;
      const wanted = new Set(titleKey(song).split(' ').filter(Boolean));
      const ranked = results.map((candidate) => {
        const words = new Set(titleKey(candidate).split(' ').filter(Boolean));
        let overlap = 0;
        wanted.forEach((word) => { if (words.has(word)) overlap += 1; });
        const titleSimilarity = wanted.size ? overlap / wanted.size : 0;
        const artistBoost = channelKey(song) && channelKey(candidate).includes(channelKey(song).slice(0, 14)) ? 5 : 0;
        return { song:candidate, score:versionScore(candidate, cfg.preference) + titleSimilarity * 9 + artistBoost };
      }).sort((a, b) => b.score - a.score);
      return ranked[0]?.score > currentScore + 4 ? ranked[0].song : song;
    } catch (_) { return song; }
  }

  // ---------- Auto skip + blacklist playback guard ----------
  // Wrap collection/queue entry points only. Core playRemoteSong/playLocal/lyrics/visualizer code stays unchanged.
  const basePlayContextAt = playContextAt;
  playContextAt = async function(index, button, options = {}) {
    if (!activeContext?.items?.length) return false;
    const length = activeContext.items.length;
    let cursor = ((index % length) + length) % length;
    for (let tried = 0; tried < length; tried += 1) {
      const song = activeContext.items[cursor];
      const reason = skipReason(song);
      if (!reason) {
        const preferred = await resolvePreferredVersion(song);
        if (preferred?.id && preferred.id !== song?.id) activeContext.items[cursor] = queueSong(preferred);
        return basePlayContextAt(cursor, button, options);
      }
      showToast(`Auto skipped · ${reason}: ${song.title}`);
      cursor = (cursor + 1) % length;
    }
    showToast('Is section ke sab songs current skip/blacklist rules se blocked hain.');
    return false;
  };

  const basePlayQueueAt = playQueueAt;
  playQueueAt = async function(index = 0, button, options = {}) {
    let guard = playQueue.length;
    while (playQueue.length && guard-- > 0) {
      const safeIndex = Math.max(0, Math.min(index, playQueue.length - 1));
      const song = playQueue[safeIndex];
      const reason = skipReason(song);
      if (!reason) {
        const preferred = await resolvePreferredVersion(song);
        if (preferred?.id && preferred.id !== song?.id) playQueue[safeIndex] = queueSong(preferred);
        return basePlayQueueAt(safeIndex, button, options);
      }
      playQueue.splice(safeIndex, 1);
      persistQueue();
      showToast(`Queue auto skipped · ${reason}: ${song.title}`);
    }
    renderQueue();
    return false;
  };

  // Filter blacklist from recommendation/radio utilities without changing recommendation scoring.
  if (typeof smartUniqueSongs === 'function') {
    const baseUnique = smartUniqueSongs;
    smartUniqueSongs = function(items) { return baseUnique(items).filter((song) => !songBlocked(song)); };
  }
  if (typeof smartRecommendationSeeds === 'function') {
    const baseSeeds = smartRecommendationSeeds;
    smartRecommendationSeeds = function(limit = 4) { return baseSeeds(limit * 2).filter((song) => !songBlocked(song)).slice(0, limit); };
  }

  // ---------- Never Play buttons ----------
  function toggleSongBlacklist(song) {
    if (!song?.id) return;
    const blocked = getBlacklist();
    const index = blocked.songs.findIndex((item) => item.id === song.id);
    if (index >= 0) {
      blocked.songs.splice(index, 1);
      showToast('Song blacklist se hata diya');
    } else {
      blocked.songs.unshift(normalizeSong(song));
      blocked.songs = blocked.songs.slice(0, 200);
      showToast('Song Never Play me add ho gaya');
    }
    saveBlacklist(blocked);
    if (typeof renderSmartHomeRecommendations === 'function') renderSmartHomeRecommendations();
  }

  const baseBuildSongRow = buildSongRow;
  buildSongRow = function(song, isLibrary, contextSpec = null) {
    const row = baseBuildSongRow(song, isLibrary, contextSpec);
    row.classList.toggle('blocked-song', songBlocked(song));
    const actions = row.querySelector('.song-actions');
    if (actions && !actions.querySelector('.v150-never-btn')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'v150-never-btn';
      button.innerHTML = icon('ban');
      button.title = songBlocked(song) ? 'Allow this song again' : 'Never play this song';
      button.setAttribute('aria-label', button.title);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleSongBlacklist(song);
        row.classList.toggle('blocked-song', songBlocked(song));
        button.innerHTML = icon('ban');
        button.title = songBlocked(song) ? 'Allow this song again' : 'Never play this song';
        button.setAttribute('aria-label', button.title);
      });
      actions.appendChild(button);
    }
    return row;
  };

  const baseBuildSongCard = buildSongCard;
  buildSongCard = function(song, contextSpec = null) {
    const card = baseBuildSongCard(song, contextSpec);
    card.classList.toggle('blocked-song', songBlocked(song));
    const actions = card.querySelector('.card-queue-actions');
    if (actions && !actions.querySelector('.v150-never-btn')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'v150-never-btn';
      button.innerHTML = icon('ban');
      button.title = 'Never play this song';
      button.setAttribute('aria-label', button.title);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleSongBlacklist(song);
        card.classList.toggle('blocked-song', songBlocked(song));
      });
      actions.appendChild(button);
    }
    return card;
  };

  // ---------- Settings: Auto Skip ----------
  function renderSkipRules() {
    const rules = getSkipRules();
    document.querySelectorAll('[data-skip-rule]').forEach((input) => { input.checked = !!rules[input.dataset.skipRule]; });
    const active = Object.values(rules).filter(Boolean).length;
    if ($('autoSkipStatus')) $('autoSkipStatus').textContent = active ? `${active} active` : 'Off';
  }
  document.querySelectorAll('[data-skip-rule]').forEach((input) => input.addEventListener('change', () => {
    const rules = getSkipRules();
    rules[input.dataset.skipRule] = !!input.checked;
    setStored(STORAGE.skipRules, rules);
    renderSkipRules();
  }));
  renderSkipRules();

  // ---------- Settings: Version preference ----------
  const versionToggle = $('autoVersionPreferenceToggle');
  const versionSelect = $('versionPreferenceSelect');
  function renderVersionPreference() {
    const cfg = versionSettings();
    if (versionToggle) versionToggle.checked = !!cfg.enabled;
    if (versionSelect) versionSelect.value = cfg.preference || 'official-audio';
  }
  function saveVersionPreference() {
    setStored(STORAGE.versionPreference, { enabled:!!versionToggle?.checked, preference:versionSelect?.value || 'official-audio' });
  }
  versionToggle?.addEventListener('change', saveVersionPreference);
  versionSelect?.addEventListener('change', saveVersionPreference);
  renderVersionPreference();

  // ---------- Settings: Blacklist ----------
  function renderBlacklist() {
    const wrap = $('blacklistChips');
    if (!wrap) return;
    const blocked = getBlacklist();
    wrap.innerHTML = '';
    blocked.artists.forEach((artist) => {
      const chip = document.createElement('span'); chip.className = 'black-chip'; chip.append(`Artist: ${artist}`);
      const remove = document.createElement('button'); remove.type='button'; remove.textContent='×'; remove.title='Unblock artist';
      remove.addEventListener('click', () => { blocked.artists = blocked.artists.filter((v) => v !== artist); saveBlacklist(blocked); });
      chip.appendChild(remove); wrap.appendChild(chip);
    });
    blocked.songs.slice(0, 12).forEach((song) => {
      const chip = document.createElement('span'); chip.className = 'black-chip'; chip.append(`Song: ${song.title}`);
      const remove = document.createElement('button'); remove.type='button'; remove.textContent='×'; remove.title='Unblock song';
      remove.addEventListener('click', () => { blocked.songs = blocked.songs.filter((v) => v.id !== song.id); saveBlacklist(blocked); });
      chip.appendChild(remove); wrap.appendChild(chip);
    });
    if ($('blacklistCount')) $('blacklistCount').textContent = `${blocked.artists.length + blocked.songs.length} blocked`;
  }
  $('addBlockedArtistBtn')?.addEventListener('click', () => {
    const input = $('blockedArtistInput');
    const value = input?.value?.trim();
    if (!value) return;
    const blocked = getBlacklist();
    if (!blocked.artists.some((x) => cleanText(x) === cleanText(value))) blocked.artists.unshift(value);
    blocked.artists = blocked.artists.slice(0, 100);
    saveBlacklist(blocked);
    input.value = '';
    showToast(`Artist blocked: ${value}`);
  });
  $('blockCurrentSongBtn')?.addEventListener('click', () => currentSong ? toggleSongBlacklist(currentSong) : showToast('Pehle koi song play karo'));
  renderBlacklist();

  // ---------- Exact volume ----------
  const exactVolumeInput = $('exactVolumeInput');
  function setExactVolume(value) {
    const volume = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    volumeRange.value = String(volume);
    volumeRange.dispatchEvent(new Event('input', { bubbles:true }));
    if (exactVolumeInput) exactVolumeInput.value = String(volume);
  }
  exactVolumeInput?.addEventListener('change', () => setExactVolume(exactVolumeInput.value));
  document.querySelectorAll('[data-volume-quick]').forEach((button) => button.addEventListener('click', () => setExactVolume(button.dataset.volumeQuick)));
  volumeRange?.addEventListener('input', () => { if (exactVolumeInput) exactVolumeInput.value = String(Math.round(Number(volumeRange.value) || 0)); });
  volumeRange?.addEventListener('wheel', (event) => { event.preventDefault(); setExactVolume(Number(volumeRange.value) + (event.deltaY < 0 ? 2 : -2)); }, { passive:false });
  if (exactVolumeInput) exactVolumeInput.value = String(Math.round(Number(volumeRange?.value) || 100));

  // ---------- Playlist tools ----------
  const toolsModal = $('playlistToolsModal');
  const snapshotSelect = $('playlistSnapshotSelect');
  const repairStatus = $('playlistRepairStatus');
  let lastBrokenIds = [];
  function snapshots() { return getStored(STORAGE.playlistSnapshots, {}); }
  function saveSnapshots(value) { setStored(STORAGE.playlistSnapshots, value); }
  function currentLocalPlaylist() {
    if (!currentPlaylistName) return null;
    const playlists = getPlaylists();
    return Array.isArray(playlists[currentPlaylistName]) ? playlists[currentPlaylistName] : null;
  }
  function renderSnapshots() {
    if (!snapshotSelect) return;
    const list = snapshots()[currentPlaylistName] || [];
    snapshotSelect.innerHTML = '';
    if (!list.length) {
      const option = document.createElement('option'); option.value=''; option.textContent='No snapshots'; snapshotSelect.appendChild(option); return;
    }
    list.forEach((snapshot, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${new Date(snapshot.createdAt).toLocaleString()} · ${snapshot.songs.length} songs`;
      snapshotSelect.appendChild(option);
    });
  }
  function openPlaylistTools() {
    const songs = currentLocalPlaylist();
    if (!songs) return showToast('Tools sirf local playlists ke liye hain');
    $('playlistToolsSubtitle').textContent = `${currentPlaylistName} · ${songs.length} songs`;
    toolsModal.classList.remove('hidden'); toolsModal.setAttribute('aria-hidden','false');
    lastBrokenIds = [];
    if (repairStatus) repairStatus.textContent = 'Not scanned';
    renderSnapshots();
  }
  function closePlaylistTools() { toolsModal?.classList.add('hidden'); toolsModal?.setAttribute('aria-hidden','true'); }
  $('playlistToolsBtn')?.addEventListener('click', openPlaylistTools);
  $('playlistToolsCloseBtn')?.addEventListener('click', closePlaylistTools);
  toolsModal?.addEventListener('click', (event) => { if (event.target === toolsModal) closePlaylistTools(); });

  $('createPlaylistSnapshotBtn')?.addEventListener('click', () => {
    const songs = currentLocalPlaylist(); if (!songs) return;
    const all = snapshots(), list = all[currentPlaylistName] || [];
    list.unshift({ createdAt:Date.now(), songs:songs.map(normalizeSong).filter(Boolean) });
    all[currentPlaylistName] = list.slice(0, 12); saveSnapshots(all); renderSnapshots(); showToast('Playlist snapshot saved');
  });
  $('restorePlaylistSnapshotBtn')?.addEventListener('click', () => {
    const list = snapshots()[currentPlaylistName] || [];
    const snapshot = list[Number(snapshotSelect?.value || 0)];
    if (!snapshot) return showToast('Snapshot nahi mila');
    const playlists = getPlaylists(); playlists[currentPlaylistName] = snapshot.songs.map(normalizeSong).filter(Boolean); savePlaylists(playlists);
    showPlaylist(currentPlaylistName); showToast('Snapshot restored'); closePlaylistTools();
  });
  $('deletePlaylistSnapshotBtn')?.addEventListener('click', () => {
    const all = snapshots(), list = all[currentPlaylistName] || [], index = Number(snapshotSelect?.value || 0);
    if (!list[index]) return;
    list.splice(index, 1); all[currentPlaylistName] = list; saveSnapshots(all); renderSnapshots(); showToast('Snapshot deleted');
  });

  function duplicateGroups(songs) {
    const map = new Map();
    (songs || []).forEach((song, index) => {
      const key = `${titleKey(song)}|${channelKey(song)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(index);
    });
    return [...map.values()].filter((indexes) => indexes.length > 1);
  }
  $('findDuplicatesBtn')?.addEventListener('click', () => {
    const groups = duplicateGroups(currentLocalPlaylist() || []);
    const duplicates = groups.reduce((sum, group) => sum + group.length - 1, 0);
    showToast(duplicates ? `${duplicates} duplicate track(s) mile` : 'No duplicates found');
  });
  $('removeDuplicatesBtn')?.addEventListener('click', () => {
    const songs = currentLocalPlaylist(); if (!songs) return;
    const seen = new Set();
    const clean = songs.filter((song) => { const key=`${titleKey(song)}|${channelKey(song)}`; if (seen.has(key)) return false; seen.add(key); return true; });
    const playlists = getPlaylists(); playlists[currentPlaylistName] = clean; savePlaylists(playlists); showPlaylist(currentPlaylistName);
    $('playlistToolsSubtitle').textContent = `${currentPlaylistName} · ${clean.length} songs`;
    showToast(`${songs.length - clean.length} duplicate(s) removed`);
  });
  document.querySelectorAll('[data-playlist-sort]').forEach((button) => button.addEventListener('click', () => {
    let songs = [...(currentLocalPlaylist() || [])];
    const kind = button.dataset.playlistSort;
    if (kind === 'artist') songs.sort((a,b) => String(a.channel||'').localeCompare(String(b.channel||'')));
    if (kind === 'title') songs.sort((a,b) => String(a.title||'').localeCompare(String(b.title||'')));
    if (kind === 'duration') songs.sort((a,b) => durationSeconds(a.duration) - durationSeconds(b.duration));
    if (kind === 'reverse') songs.reverse();
    if (kind === 'shuffle') for (let i=songs.length-1; i>0; i-=1) { const j=Math.floor(Math.random()*(i+1)); [songs[i],songs[j]]=[songs[j],songs[i]]; }
    const playlists = getPlaylists(); playlists[currentPlaylistName] = songs; savePlaylists(playlists); showPlaylist(currentPlaylistName); showToast(`Playlist ${kind} applied`);
  }));
  $('removeShortTracksBtn')?.addEventListener('click', () => {
    const songs = currentLocalPlaylist(); if (!songs) return;
    const min = Math.max(0, Math.min(600, Number($('playlistMinSeconds')?.value) || 0));
    const clean = songs.filter((song) => { const d=durationSeconds(song.duration); return !d || d >= min; });
    const playlists = getPlaylists(); playlists[currentPlaylistName] = clean; savePlaylists(playlists); showPlaylist(currentPlaylistName);
    showToast(`${songs.length - clean.length} short track(s) removed`);
  });

  async function scanBrokenSongs() {
    const songs = currentLocalPlaylist() || [];
    lastBrokenIds = [];
    if (!songs.length) return [];
    if (repairStatus) repairStatus.textContent = `Scanning 0/${songs.length}…`;
    let done = 0;
    const pending = [...songs];
    const workers = Array.from({ length:Math.min(3, songs.length) }, async () => {
      while (pending.length) {
        const song = pending.shift();
        let result = { status:'unknown' };
        try { result = await window.echoAPI.probeSong(song); } catch (_) {}
        if (result?.status === 'unavailable') lastBrokenIds.push(song.id);
        done += 1;
        if (repairStatus) repairStatus.textContent = `Scanning ${done}/${songs.length} · ${lastBrokenIds.length} broken`;
      }
    });
    await Promise.all(workers);
    if (repairStatus) repairStatus.textContent = `${lastBrokenIds.length} confirmed broken · ${songs.length - lastBrokenIds.length} ok/unknown`;
    return lastBrokenIds;
  }
  $('scanBrokenSongsBtn')?.addEventListener('click', async () => {
    await scanBrokenSongs();
    showToast(lastBrokenIds.length ? `${lastBrokenIds.length} confirmed broken source(s)` : 'No confirmed broken sources');
  });
  async function repairSong(song) {
    try {
      const results = await window.echoAPI.search(`${titleKey(song)} ${song.channel || ''} official audio`);
      if (!Array.isArray(results)) return null;
      const wanted = new Set(titleKey(song).split(' ').filter(Boolean));
      return results.filter((candidate) => candidate.id !== song.id).map((candidate) => {
        const got = new Set(titleKey(candidate).split(' ').filter(Boolean)); let overlap=0; wanted.forEach((word)=>{if(got.has(word))overlap+=1;});
        return { song:candidate, score:versionScore(candidate) + (wanted.size ? overlap/wanted.size : 0)*10 };
      }).sort((a,b)=>b.score-a.score)[0]?.song || null;
    } catch (_) { return null; }
  }
  $('repairBrokenSongsBtn')?.addEventListener('click', async () => {
    if (!lastBrokenIds.length) await scanBrokenSongs();
    if (!lastBrokenIds.length) return showToast('Repair ke liye confirmed broken songs nahi mile');
    const playlists = getPlaylists(), songs = [...(playlists[currentPlaylistName] || [])];
    let repaired = 0, processed = 0;
    for (let i=0; i<songs.length; i+=1) {
      if (!lastBrokenIds.includes(songs[i].id)) continue;
      processed += 1; if (repairStatus) repairStatus.textContent = `Repairing ${processed}/${lastBrokenIds.length}…`;
      const replacement = await repairSong(songs[i]);
      if (replacement) { songs[i] = normalizeSong(replacement); repaired += 1; }
    }
    playlists[currentPlaylistName] = songs; savePlaylists(playlists); showPlaylist(currentPlaylistName); lastBrokenIds=[];
    if (repairStatus) repairStatus.textContent = `${repaired} source(s) repaired`;
    showToast(`${repaired} broken source(s) repaired`);
  });

  // ---------- Global shortcuts ----------
  function shortcutMapFromInputs() {
    const map = {};
    document.querySelectorAll('[data-shortcut-action]').forEach((input) => { const value=input.value.trim(); if(value) map[input.dataset.shortcutAction]=value; });
    return map;
  }
  function renderShortcutInputs(map) { document.querySelectorAll('[data-shortcut-action]').forEach((input) => { input.value = map[input.dataset.shortcutAction] || ''; }); }
  async function applyShortcuts(map, notify = false) {
    setStored(STORAGE.shortcuts, map);
    const result = await window.echoAPI.setGlobalShortcuts(map);
    const rows = Object.values(result || {}), ok = rows.filter((item) => item.registered).length;
    if ($('shortcutStatus')) $('shortcutStatus').textContent = `${ok}/${rows.length} registered`;
    if (notify) showToast(`${ok}/${rows.length} global shortcuts active`);
  }
  $('saveGlobalShortcutsBtn')?.addEventListener('click', () => applyShortcuts(shortcutMapFromInputs(), true));
  $('resetGlobalShortcutsBtn')?.addEventListener('click', () => { renderShortcutInputs(DEFAULT_SHORTCUTS); applyShortcuts(DEFAULT_SHORTCUTS, true); });
  const savedShortcuts = { ...DEFAULT_SHORTCUTS, ...getStored(STORAGE.shortcuts, {}) }; renderShortcutInputs(savedShortcuts); applyShortcuts(savedShortcuts, false).catch(()=>{});
  window.echoAPI.onGlobalShortcutAction?.((action) => {
    if (action === 'playPause') playPauseBtn?.click();
    else if (action === 'next') nextBtn?.click();
    else if (action === 'previous') previousBtn?.click();
    else if (action === 'like') playerLikeBtn?.click();
    else if (action === 'lyrics') activateTab('lyrics');
    else if (action === 'mini') miniPlayerBtn?.click();
    else if (action === 'immersive') immersiveBtn?.click();
    else if (action === 'fullscreen') appFullscreenBtn?.click();
    else if (action === 'volumeUp') setExactVolume(Number(volumeRange.value) + 5);
    else if (action === 'volumeDown') setExactVolume(Number(volumeRange.value) - 5);
    else if (action === 'mute') muteToggleBtn?.click();
    else if (action === 'queue') queueToggleBtn?.click();
  });

  // ---------- Floating lyrics ----------
  const floatingState = $('floatingLyricsState');
  const floatingToggleBtn = $('floatingLyricsToggleBtn');
  const floatingClickThroughPageBtn = $('floatingLyricsClickThroughPageBtn');
  const floatingClickThroughPageState = $('floatingLyricsClickThroughState');
  let floatingEnabled = false;
  let floatingClickThroughState = false;
  let floatingGraphEnabled = true;
  function renderFloatingClickThroughState() {
    floatingClickThroughPageBtn?.classList.toggle('active', floatingClickThroughState);
    floatingClickThroughPageBtn?.setAttribute('aria-pressed', floatingClickThroughState ? 'true' : 'false');
    if (floatingClickThroughPageState) floatingClickThroughPageState.textContent = floatingClickThroughState ? 'ON' : 'OFF';
    if (floatingClickThroughPageBtn) floatingClickThroughPageBtn.title = floatingClickThroughState
      ? 'Click-through ON · Ctrl+Alt+X turns it OFF even over a game'
      : 'Click-through OFF · Ctrl+Alt+X turns it ON';
  }
  function floatingPrefs() { return { clickThrough:false, ...getStored(STORAGE.floatingLyrics, {}) }; }
  async function openFloatingLyrics() {
    floatingEnabled = true;
    const prefs = floatingPrefs();
    await window.echoAPI.openFloatingLyrics({ alwaysOnTop:true, clickThrough:!!prefs.clickThrough });
    floatingClickThroughState = !!prefs.clickThrough;
    if (floatingState) floatingState.textContent = 'ON';
    floatingToggleBtn?.classList.add('active');
    floatingToggleBtn?.setAttribute('aria-pressed','true');
    pushFloatingLyrics(true);
  }
  async function closeFloatingLyrics() {
    floatingEnabled = false;
    await window.echoAPI.closeFloatingLyrics();
    if (floatingState) floatingState.textContent = 'OFF';
    floatingToggleBtn?.classList.remove('active');
    floatingToggleBtn?.setAttribute('aria-pressed','false');
  }
  floatingToggleBtn?.addEventListener('click', () => floatingEnabled ? closeFloatingLyrics() : openFloatingLyrics());
  floatingClickThroughPageBtn?.addEventListener('click', async () => {
    try {
      const result = await window.echoAPI.toggleFloatingLyricsClickThrough?.();
      if (result && typeof result.enabled === 'boolean') floatingClickThroughState = !!result.enabled;
      renderFloatingClickThroughState();
      const prefs=floatingPrefs(); prefs.clickThrough=floatingClickThroughState; setStored(STORAGE.floatingLyrics,prefs);
      showToast(floatingClickThroughState
        ? (floatingEnabled ? 'Floating Lyrics click-through ON' : 'Click-through ON · Floating Lyrics kholne par active hoga')
        : 'Floating Lyrics click-through OFF');
    } catch (_) { showToast('Click-through toggle nahi ho saka'); }
  });
  window.echoAPI.getFloatingLyricsClickThrough?.().then?.((state={}) => {
    floatingClickThroughState = !!state.enabled;
    renderFloatingClickThroughState();
  }).catch?.(()=>{});
  window.echoAPI.onFloatingLyricsWindowState?.((state={}) => {
    floatingEnabled = !!state.open;
    if (floatingState) floatingState.textContent = floatingEnabled ? 'ON' : 'OFF';
    floatingToggleBtn?.classList.toggle('active', floatingEnabled);
    floatingToggleBtn?.setAttribute('aria-pressed', floatingEnabled ? 'true' : 'false');
  });
  window.echoAPI.onFloatingLyricsClickThroughState?.((state={}) => {
    floatingClickThroughState = !!state.enabled;
    const prefs=floatingPrefs(); prefs.clickThrough=floatingClickThroughState; setStored(STORAGE.floatingLyrics,prefs);
    if (floatingToggleBtn) floatingToggleBtn.title = floatingClickThroughState
      ? 'Floating Lyrics open · Click-through ON · Ctrl+Alt+X toggles it'
      : 'Open/close Floating Lyrics · Ctrl+Alt+X toggles click-through';
    renderFloatingClickThroughState();
  });

  let floatingLyricsSignature = '';
  function floatingGraphPacket() {
    if (!floatingGraphEnabled) return null;
    try {
      const snap = (typeof readAudioEnergy === 'function') ? readAudioEnergy() : (window.__dinechoAudioEnergy || null);
      const src = (typeof visualizerSmoothedSpectrum !== 'undefined' && visualizerSmoothedSpectrum?.length)
        ? visualizerSmoothedSpectrum : ((typeof visualizerFrequencyData !== 'undefined' && visualizerFrequencyData?.length) ? visualizerFrequencyData : null);
      if (!snap || !src?.length || !snap.hasSignal) return { spectrum:[], audioGraph:{ energy:Number(snap?.energy)||0, vocal:Number(snap?.vocal)||0, vocalTransient:Number(snap?.vocalTransient)||0, transient:Number(snap?.transient)||0, beatPulse:Number(snap?.beatPulse)||0, bass:Number(snap?.bass)||0, treble:Number(snap?.treble)||0, motion:Number(snap?.motion)||0, aggression:Number(snap?.aggression)||0, hasSignal:false } };
      const count = 192, values = [];
      for (let i=0;i<count;i++) {
        const ratio=i/Math.max(1,count-1);
        const hz=36*Math.pow(16000/36,ratio);
        const idx=(typeof visualizerBinForHz==='function') ? visualizerBinForHz(hz) : Math.min(src.length-1,Math.round(ratio*(src.length-1)));
        const raw=Number(src[idx])||0;
        const v=(src instanceof Uint8Array) ? raw/255 : raw;
        values.push(Math.round(Math.max(0,Math.min(1,v))*1000)/1000);
      }
      return { spectrum:values, audioGraph:{ energy:snap.energy, vocal:snap.vocal, vocalTransient:snap.vocalTransient, transient:snap.transient, beatPulse:snap.beatPulse, bass:snap.bass, treble:snap.treble, motion:snap.motion, aggression:snap.aggression, hasSignal:!!snap.hasSignal } };
    } catch (_) { return null; }
  }
  function pushFloatingLyrics(forceLines = false) {
    if (!floatingEnabled) return;
    const plain = [...lyricsBody.querySelectorAll('.lyric-line.plain')];
    const playbackTime = typeof lyricsPlaybackClock === 'function' ? lyricsPlaybackClock() : Number(audioPlayer.currentTime || 0);
    let currentIndex = -1;
    if (Array.isArray(lyricLines) && lyricLines.length) {
      for (let i = 0; i < lyricLines.length && Number(lyricLines[i]?.time) <= playbackTime; i++) currentIndex = i;
    }
    const current = currentIndex >= 0 ? lyricLines[currentIndex]?.text || '' : '';
    const next = currentIndex >= 0 ? lyricLines[currentIndex + 1]?.text || '' : (lyricLines[0]?.text || '');
    const signature = `${currentSong?.id || ''}:${lyricLines.length}:${lyricLines[0]?.time ?? ''}:${lyricLines.at(-1)?.time ?? ''}:${lyricLines[0]?.text ?? ''}:${lyricLines.at(-1)?.text ?? ''}`;
    const payload = {
      title:currentSong?.title || '', artist:currentSong?.channel || '', current:current || plain[0]?.textContent || '',
      next:next || plain[1]?.textContent || '', fallback:currentSong ? 'Lyrics syncing…' : 'Play a song to see lyrics.',
      playbackTime, sentAt:Date.now(), playing:!!audioPlayer.src && !audioPlayer.paused && !audioPlayer.ended, playbackRate:Number(audioPlayer.playbackRate || 1),
      theme:document.body.dataset.theme || 'golden', fontScale:(Number(localStorage.getItem(STORAGE.lyricsFontSize) || 100) / 100) || 1
    };
    const graphPacket = floatingGraphPacket();
    if (graphPacket) Object.assign(payload, graphPacket);
    if (forceLines || signature !== floatingLyricsSignature) {
      payload.lines = Array.isArray(lyricLines) ? lyricLines.map(line => ({ time:Number(line.time)||0, text:String(line.text||'') })) : [];
      floatingLyricsSignature = signature;
    }
    window.echoAPI.syncFloatingLyrics(payload);
  }
  window.__deepecchoPushFloatingLyrics = (force = false) => pushFloatingLyrics(force);
  // Media events remain authoritative even when the main Deepeccho window is minimized.
  ['timeupdate','play','playing','pause','seeking','seeked','loadedmetadata','canplay','waiting','stalled','ratechange','ended'].forEach(eventName => audioPlayer.addEventListener(eventName, () => pushFloatingLyrics(eventName === 'loadedmetadata')));
  // Frequent lightweight heartbeat corrects buffering / game-mode drift without making the
  // floating window depend on the main lyrics DOM or requestAnimationFrame.
  setInterval(() => pushFloatingLyrics(false), 400);
  // Real-audio graph refresh is intentionally separate from lyric timing. It never changes
  // active-line selection; it only mirrors the already-running analyser into the overlay.
  setInterval(() => { if (floatingEnabled && floatingGraphEnabled) pushFloatingLyrics(false); }, 70);
  window.echoAPI.onFloatingLyricsAction?.((action) => {
    if (action === 'playPause') playPauseBtn?.click();
    else if (action === 'next') nextBtn?.click();
    else if (action === 'previous') previousBtn?.click();
    else if (action === 'back10') back10Btn?.click();
    else if (action === 'forward10') forward10Btn?.click();
    else if (action === 'graphOn') floatingGraphEnabled = true;
    else if (action === 'graphOff') floatingGraphEnabled = false;
    else if (action === 'close') { floatingEnabled=false; if(floatingState) floatingState.textContent='Closed'; }
  });

  // Keep the Tools button for local playlist detail only.
  const baseShowPlaylist = showPlaylist;
  showPlaylist = function(name) { const value=baseShowPlaylist(name); $('playlistToolsBtn')?.classList.remove('hidden'); return value; };
})();
