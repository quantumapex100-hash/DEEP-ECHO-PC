(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const homeView = $('homeView');
  const searchView = $('searchView');
  const searchInput = $('searchInput');
  const searchBtn = $('searchBtn');
  const resultsList = $('resultsList');
  const audio = $('audioPlayer');
  if (!homeView || !searchView || !searchInput) return;

  const MOODS = [
    ['Chill', 'chill songs official audio'],
    ['Workout', 'workout energy songs official audio'],
    ['Romantic', 'romantic love songs official audio'],
    ['Focus', 'focus lofi music'],
    ['Party', 'party hits official audio'],
    ['Night', 'late night songs official audio']
  ];
  const STARTER_SEARCHES = [
    'new songs official audio',
    'viral songs',
    'lofi night',
    'romantic songs',
    'workout music',
    'acoustic versions'
  ];

  const uniqueText = (items) => {
    const out = [], seen = new Set();
    for (const raw of items || []) {
      const value = String(raw || '').replace(/\s+/g, ' ').trim();
      const key = value.toLowerCase();
      if (!value || seen.has(key)) continue;
      seen.add(key); out.push(value);
    }
    return out;
  };
  const uniqueSongs = (songs) => {
    if (typeof smartUniqueSongs === 'function') return smartUniqueSongs((songs || []).filter(Boolean));
    const out = [], seen = new Set();
    for (const song of songs || []) {
      if (!song?.id || seen.has(song.id)) continue;
      seen.add(song.id); out.push(song);
    }
    return out;
  };
  const safeStored = (key, fallback) => {
    try { return typeof getStored === 'function' ? getStored(key, fallback) : fallback; } catch (_) { return fallback; }
  };
  const recentSongs = () => {
    try { return safeStored(STORAGE.recent, []); } catch (_) { return []; }
  };
  const likedSongs = () => {
    try { return typeof getLikedSongs === 'function' ? getLikedSongs() : []; } catch (_) { return []; }
  };
  const recommendationSongs = () => {
    try {
      const cached = typeof smartRecommendationCache === 'function' ? smartRecommendationCache() : { songs: [] };
      const ranked = typeof smartRecommendationProfile === 'function' ? smartRecommendationProfile().map(x => x.song) : [];
      return uniqueSongs([...(cached?.songs || []), ...ranked, ...likedSongs(), ...recentSongs()]);
    } catch (_) { return uniqueSongs([...likedSongs(), ...recentSongs()]); }
  };
  const makeCards = (grid, songs, type, label, limit = 6) => {
    if (!grid || typeof buildSongCard !== 'function' || typeof makeContext !== 'function') return;
    const list = uniqueSongs(songs).slice(0, limit);
    grid.replaceChildren();
    const hint = grid.parentElement?.querySelector('.section-hint');
    if (hint) hint.style.display = list.length ? 'none' : 'block';
    const ctx = makeContext(list, type, label, type);
    list.forEach(song => grid.appendChild(buildSongCard(song, ctx)));
  };

  // ---------- HOME 2.0 ----------
  const hero = homeView.querySelector('.hero-card');
  if (hero && !$('home220Pulse')) {
    hero.classList.add('home220-hero');
    const badge = document.createElement('div');
    badge.className = 'home220-badge'; badge.textContent = 'HOME 2.0';
    hero.appendChild(badge);

    const pulse = document.createElement('button');
    pulse.id = 'home220Pulse'; pulse.type = 'button'; pulse.className = 'home220-pulse';
    pulse.innerHTML = `
      <img id="home220PulseArt" src="assets/dinecho-logo.png" alt=""/>
      <span class="home220-pulse-copy">
        <small id="home220PulseKicker">NOW PLAYING PULSE</small>
        <strong id="home220PulseTitle">Ready when you are</strong>
        <span id="home220PulseArtist">Start a song and Home will come alive.</span>
        <span class="home220-pulse-progress"><i id="home220PulseProgress"></i></span>
      </span>
      <span class="home220-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>`;
    hero.appendChild(pulse);
    pulse.addEventListener('click', () => {
      try {
        if (typeof currentSong !== 'undefined' && currentSong) {
          if (audio?.paused) audio.play().catch(() => {}); else audio?.pause();
        } else {
          activateTab('search'); searchInput.focus();
        }
      } catch (_) { activateTab('search'); searchInput.focus(); }
    });
  }

  if (!$('home220Controls')) {
    const controls = document.createElement('div');
    controls.id = 'home220Controls'; controls.className = 'home220-controls';
    controls.innerHTML = `
      <div class="home220-control-copy"><strong>Find your next sound</strong><span>Moods, personal picks and one-tap discovery.</span></div>
      <div class="home220-moods" id="home220Moods"></div>
      <button id="home220Refresh" class="home220-refresh" type="button" title="Refresh Home recommendations">↻ Refresh Home</button>`;
    hero?.insertAdjacentElement('afterend', controls);
    const moodWrap = $('home220Moods');
    MOODS.forEach(([label, query]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'home220-mood'; b.textContent = label;
      b.addEventListener('click', () => { searchInput.value = query; activateTab('search'); runSearch('song', query); });
      moodWrap?.appendChild(b);
    });
    $('home220Refresh')?.addEventListener('click', async () => {
      const btn = $('home220Refresh'); btn?.classList.add('is-loading');
      try {
        if (typeof loadHomeContent === 'function') await loadHomeContent(true);
        if (typeof smartRefreshRecommendations === 'function') await smartRefreshRecommendations(true);
        if (typeof renderRecentlyPlayed === 'function') renderRecentlyPlayed();
        if (typeof renderSmartHome === 'function') renderSmartHome();
        await renderHome220();
        if (typeof showToast === 'function') showToast('Home recommendations refreshed');
      } finally { btn?.classList.remove('is-loading'); }
    });
  }

  const makeHomeSection = (id, title, subtitle, hintText) => {
    if ($(id)) return $(id);
    const section = document.createElement('div');
    section.id = id; section.className = 'home-section smart-home-section home220-section';
    section.innerHTML = `<div class="section-head"><h2>${title}</h2><span>${subtitle}</span></div><div id="${id}Grid" class="card-grid"></div><p class="section-hint">${hintText}</p>`;
    return section;
  };

  const quickSection = makeHomeSection('home220Quick', 'Quick Picks', 'Fast picks from your recent taste', 'Play or like a few songs and Quick Picks will fill up.');
  const favoriteSection = makeHomeSection('home220Favorites', 'Your Favorites', 'Liked songs ready in one tap', 'Like a song and it will appear here.');
  const offlineSection = makeHomeSection('home220Offline', 'Available Offline', 'Your downloaded music', 'Downloaded songs will appear here.');
  const controlsEl = $('home220Controls');
  if (controlsEl && quickSection && !quickSection.isConnected) controlsEl.insertAdjacentElement('afterend', quickSection);
  const because = $('becauseSection');
  if (because && favoriteSection && !favoriteSection.isConnected) because.insertAdjacentElement('afterend', favoriteSection);
  if (favoriteSection && offlineSection && !offlineSection.isConnected) favoriteSection.insertAdjacentElement('afterend', offlineSection);

  async function renderHome220() {
    const recs = recommendationSongs();
    makeCards($('home220QuickGrid'), recs, 'home220-quick', 'Quick Picks');
    makeCards($('home220FavoritesGrid'), likedSongs(), 'home220-favorites', 'Your Favorites');
    try {
      const library = await window.echoAPI?.getLibrary?.();
      makeCards($('home220OfflineGrid'), Array.isArray(library) ? library : [], 'home220-offline', 'Available Offline');
    } catch (_) { makeCards($('home220OfflineGrid'), [], 'home220-offline', 'Available Offline'); }
  }

  function updateHomePulse() {
    const title = $('home220PulseTitle'), artist = $('home220PulseArtist'), art = $('home220PulseArt'), fill = $('home220PulseProgress'), pulse = $('home220Pulse');
    if (!pulse) return;
    let song = null;
    try { if (typeof currentSong !== 'undefined') song = currentSong; } catch (_) {}
    if (!song) {
      title.textContent = 'Ready when you are'; artist.textContent = 'Start a song and Home will come alive.'; art.src = 'assets/dinecho-logo.png'; fill.style.width = '0%'; pulse.classList.remove('is-playing'); return;
    }
    title.textContent = song.title || 'Now playing'; artist.textContent = song.channel || 'DEEP-ECHO'; art.src = song.thumbnail || 'assets/dinecho-logo.png';
    const dur = Number(audio?.duration || 0), cur = Number(audio?.currentTime || 0); fill.style.width = `${dur > 0 ? Math.max(0, Math.min(100, cur / dur * 100)) : 0}%`;
    pulse.classList.toggle('is-playing', !!audio && !audio.paused);
  }
  ['play','playing','pause','timeupdate','loadedmetadata','ended'].forEach(name => audio?.addEventListener(name, updateHomePulse));
  setInterval(updateHomePulse, 1200);
  updateHomePulse();

  // ---------- SEARCH DISCOVERY ----------
  if (!$('search220Discovery')) {
    const discovery = document.createElement('section');
    discovery.id = 'search220Discovery'; discovery.className = 'search220-discovery';
    discovery.innerHTML = `
      <div class="search220-discovery-head"><div><span>DISCOVER</span><h3>Not sure what to search?</h3></div><small>Personal recommendations + quick searches</small></div>
      <div id="search220QuickQueries" class="search220-query-chips"></div>
      <div id="search220RecommendGrid" class="card-grid search220-recommend-grid"></div>`;
    resultsList?.insertAdjacentElement('beforebegin', discovery);
  }

  function search220QueryPool() {
    let recent = [];
    try { recent = safeStored(STORAGE.recentSearches, []); } catch (_) {}
    const artists = uniqueText([...likedSongs(), ...recentSongs()].map(s => s?.channel).filter(Boolean)).slice(0, 3).map(a => `${a} best songs`);
    return uniqueText([...recent, ...artists, ...STARTER_SEARCHES]).slice(0, 10);
  }
  function renderDiscoveryQueryChips(items = search220QueryPool()) {
    const queryWrap = $('search220QuickQueries'); if (queryWrap) queryWrap.replaceChildren();
    uniqueText(items).slice(0, 8).forEach(q => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'search220-query-chip'; b.textContent = q;
      b.addEventListener('click', () => { searchInput.value = q; runSearch('song', q); }); queryWrap?.appendChild(b);
    });
  }
  function renderSearchDiscovery() {
    const query = searchInput.value.trim();
    const hasQuery = query.length > 0;
    const discovery = $('search220Discovery');
    discovery?.classList.toggle('hidden', !hasQuery);
    if (!hasQuery) {
      $('search220QuickQueries')?.replaceChildren();
      $('search220RecommendGrid')?.replaceChildren();
      return;
    }
    renderDiscoveryQueryChips();
    const heading = discovery?.querySelector('.search220-discovery-head h3');
    if (heading) heading.textContent = 'Related searches';
    makeCards($('search220RecommendGrid'), recommendationSongs(), 'search220-recommended', 'Search Recommendations', 6);
    discovery?.classList.add('is-compact');
  }

  // ---------- YOUTUBE-LIKE AUTOCOMPLETE ----------
  const searchBox = searchInput.closest('.search-box');
  let shell = searchInput.parentElement?.classList.contains('search220-input-shell') ? searchInput.parentElement : null;
  if (!shell && searchBox) {
    shell = document.createElement('div'); shell.className = 'search220-input-shell';
    searchBox.insertBefore(shell, searchInput); shell.appendChild(searchInput);
  }
  if (shell && !$('search220Ghost')) {
    const ghost = document.createElement('div'); ghost.id = 'search220Ghost'; ghost.className = 'search220-ghost'; ghost.setAttribute('aria-hidden','true');
    ghost.innerHTML = '<span id="search220GhostPrefix"></span><span id="search220GhostSuffix"></span>';
    shell.insertBefore(ghost, searchInput);
    const panel = document.createElement('div'); panel.id = 'search220Autocomplete'; panel.className = 'search220-autocomplete hidden'; panel.setAttribute('role','listbox');
    shell.appendChild(panel);
  }
  searchInput.setAttribute('autocomplete','off');
  searchInput.setAttribute('aria-autocomplete','list');
  searchInput.setAttribute('aria-controls','search220Autocomplete');

  const panel = $('search220Autocomplete');
  let suggestionItems = [], selectedIndex = -1, suggestionSeq = 0, suggestionTimer = 0, ghostCompletion = '';
  const localSuggestionPool = () => {
    let recentQueries = [];
    try { recentQueries = safeStored(STORAGE.recentSearches, []); } catch (_) {}
    const songs = uniqueSongs([...recommendationSongs(), ...likedSongs(), ...recentSongs()]);
    const songPhrases = songs.flatMap(s => [s?.title, s?.channel ? `${s.channel} songs` : '']).filter(Boolean);
    return uniqueText([...recentQueries, ...songPhrases, ...STARTER_SEARCHES]);
  };
  function setGhost(value, suggestions) {
    const q = String(value || '').trim(); ghostCompletion = '';
    const prefix = $('search220GhostPrefix'), suffix = $('search220GhostSuffix'); if (!prefix || !suffix) return;
    if (!q) { prefix.textContent = ''; suffix.textContent = ''; $('search220Ghost')?.classList.remove('has-completion'); return; }
    const best = (suggestions || []).find(x => x.length > q.length && x.toLowerCase().startsWith(q.toLowerCase()));
    prefix.textContent = q; suffix.textContent = best ? best.slice(q.length) : ''; ghostCompletion = best || '';
    $('search220Ghost')?.classList.toggle('has-completion', !!best && document.activeElement === searchInput);
  }
  function renderSuggestions(items, query) {
    suggestionItems = uniqueText(items).slice(0, 6); selectedIndex = -1; panel?.replaceChildren();
    if (String(query || '').trim() && suggestionItems.length) renderDiscoveryQueryChips(suggestionItems);
    setGhost(query, suggestionItems);
    if (!panel || !suggestionItems.length || document.activeElement !== searchInput) { panel?.classList.add('hidden'); return; }
    suggestionItems.forEach((text, idx) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'search220-suggestion'; b.setAttribute('role','option');
      const icon = document.createElement('span'); icon.className = 'search220-suggestion-icon'; icon.textContent = '⌕';
      const label = document.createElement('span'); label.className = 'search220-suggestion-text'; label.textContent = text;
      const hint = document.createElement('span'); hint.className = 'search220-suggestion-hint'; hint.textContent = idx === 0 ? 'Top suggestion' : 'Search';
      b.append(icon, label, hint);
      b.addEventListener('mouseenter', () => selectSuggestion(idx));
      b.addEventListener('mousedown', e => e.preventDefault());
      b.addEventListener('click', () => chooseSuggestion(idx, true));
      panel.appendChild(b);
    });
    panel.classList.remove('hidden');
  }
  function selectSuggestion(index) {
    if (!suggestionItems.length) return;
    selectedIndex = (index + suggestionItems.length) % suggestionItems.length;
    [...panel.children].forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
  }
  function chooseSuggestion(index, searchNow) {
    const value = suggestionItems[index]; if (!value) return;
    searchInput.value = value; searchInput.setSelectionRange?.(value.length, value.length); hideSuggestions();
    renderSearchDiscovery();
    if (searchNow) runSearch('song', value);
  }
  function hideSuggestions() {
    panel?.classList.add('hidden'); selectedIndex = -1; $('search220Ghost')?.classList.remove('has-completion');
  }
  async function updateSuggestions() {
    const value = searchInput.value.trim(); const seq = ++suggestionSeq;
    renderSearchDiscovery();
    if (value.length < 2) {
      suggestionItems = []; setGhost(value, []); hideSuggestions();
      return;
    }
    const local = localSuggestionPool().filter(x => x.toLowerCase().includes(value.toLowerCase())).slice(0, 4);
    let remote = [];
    if (typeof window.echoAPI?.searchSuggestions === 'function') {
      try { const result = await window.echoAPI.searchSuggestions(value); if (seq !== suggestionSeq) return; if (Array.isArray(result)) remote = result; } catch (_) {}
    }
    if (seq !== suggestionSeq) return;
    renderSuggestions(uniqueText([...remote, ...local]), value);
  }
  searchInput.addEventListener('input', () => { clearTimeout(suggestionTimer); suggestionTimer = setTimeout(updateSuggestions, 220); });
  searchInput.addEventListener('focus', () => {
    clearTimeout(suggestionTimer);
    if (searchInput.value.trim().length >= 2) suggestionTimer = setTimeout(updateSuggestions, 60);
    else hideSuggestions();
  });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' && suggestionItems.length && !panel?.classList.contains('hidden')) { event.preventDefault(); event.stopImmediatePropagation(); selectSuggestion(selectedIndex + 1); return; }
    if (event.key === 'ArrowUp' && suggestionItems.length && !panel?.classList.contains('hidden')) { event.preventDefault(); event.stopImmediatePropagation(); selectSuggestion(selectedIndex <= 0 ? suggestionItems.length - 1 : selectedIndex - 1); return; }
    if (event.key === 'Escape') { hideSuggestions(); return; }
    if ((event.key === 'Tab' || event.key === 'ArrowRight') && ghostCompletion && searchInput.selectionStart === searchInput.value.length && searchInput.selectionEnd === searchInput.value.length) {
      event.preventDefault(); event.stopImmediatePropagation(); searchInput.value = ghostCompletion; updateSuggestions(); return;
    }
    if (event.key === 'Enter' && selectedIndex >= 0 && !panel?.classList.contains('hidden')) { event.preventDefault(); event.stopImmediatePropagation(); chooseSuggestion(selectedIndex, true); }
  }, true);
  document.addEventListener('pointerdown', event => { if (!shell?.contains(event.target)) hideSuggestions(); });
  searchBtn?.addEventListener('click', hideSuggestions);

  // Keep Home 2.0 and discovery fresh without touching playback core.
  document.querySelector('[data-tab="home"]')?.addEventListener('click', () => setTimeout(() => { renderHome220(); updateHomePulse(); }, 40));
  document.querySelector('[data-tab="search"]')?.addEventListener('click', () => setTimeout(renderSearchDiscovery, 40));
  document.addEventListener('click', event => {
    if (event.target.closest('#playerLikeBtn,.action-like,.card-like,.action-download,#playerDownloadBtn')) setTimeout(() => { renderHome220(); renderSearchDiscovery(); }, 180);
  });

  renderHome220();
  renderSearchDiscovery();
})();
