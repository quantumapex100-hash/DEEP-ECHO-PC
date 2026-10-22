// Additional Home discovery. Uses the existing search, song rows and playback contexts.
(() => {
  'use strict';
  const home = document.getElementById('homeView');
  const settings = document.getElementById('settingsView');
  if (!home || !settings) return;
  const TTL = 6 * 60 * 60 * 1000;
  const CACHE = 'deepecho-viral-discovery-v1';
  const collections = [
    ['Hollywood / English', 'English all time greatest hits pop rock classics', 'EN'],
    ['Bollywood', 'Bollywood Hindi all time greatest hit songs classics', 'HI'],
    ['Tollywood', 'Telugu all time greatest hit songs classics', 'TE'],
    ['Kollywood', 'Tamil all time greatest hit songs classics', 'TA'],
    ['Mollywood', 'Malayalam all time greatest hit songs classics', 'ML'],
    ['Sandalwood', 'Kannada all time greatest hit songs classics', 'KN'],
    ['Punjabi', 'Punjabi all time greatest hit songs', 'PA'],
    ['Bengali', 'Bengali all time greatest hit songs classics', 'BN'],
    ['Pakistani / Urdu', 'Pakistani Urdu all time best songs Coke Studio', 'UR'],
    ['Arabic', 'Arabic all time greatest hit songs', 'AR'],
    ['K-pop', 'Kpop all time greatest hit songs', 'KR'],
    ['Latin', 'Latin Spanish all time greatest hit songs', 'ES']
  ];
  function section(id, title, subtitle) {
    const node = document.createElement('section');
    node.id = id; node.className = 'home-section discovery-section';
    const header = document.createElement('div'); header.className = 'discovery-heading';
    const copy = document.createElement('div');
    const h = document.createElement('h2'); h.textContent = title;
    const p = document.createElement('p'); p.textContent = subtitle;
    copy.append(h, p); header.append(copy); node.append(header);
    return node;
  }
  function button(text, action) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'secondary-btn';
    b.textContent = text; b.addEventListener('click', action); return b;
  }
  function grid(node) {
    const el = document.createElement('div'); el.className = 'card-grid discovery-grid'; node.append(el);
    if (['homeViralSongs','homeAllTimeCollections'].includes(node.id)) {
      el.classList.add('discovery-carousel'); el.id = `${node.id}Cards`;
      el.tabIndex = 0; el.setAttribute('role','region');
      const title = node.querySelector('h2').textContent;
      el.setAttribute('aria-label', `${title} — scroll left or right`);
      const header = node.querySelector('.discovery-heading');
      const controls = document.createElement('div'); controls.className = 'discovery-actions';
      const existing = header.querySelector('button'); if (existing) controls.append(existing);
      const move = direction => el.scrollBy({ left:direction * Math.max(200, el.clientWidth * .8),
        behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth' });
      for (const [label,direction] of [['←',-1],['→',1]]) {
        const arrow = button(label, () => move(direction)); arrow.classList.add('discovery-scroll-btn');
        arrow.setAttribute('aria-label', `${title}: scroll ${direction < 0 ? 'left' : 'right'}`);
        arrow.setAttribute('aria-controls', el.id); controls.append(arrow);
      }
      header.append(controls);
      el.addEventListener('keydown', event => {
        if (event.target !== el || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
        event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1);
      });
    }
    return el;
  }
  function status(node, text) {
    const el = document.createElement('p'); el.className = 'discovery-status'; el.textContent = text;
    el.setAttribute('role', 'status'); node.append(el); return el;
  }
  const speed = section('homeSpeedDial', 'Speed Dial', 'Your liked songs, saved playlists and recent favourites.');
  const speedGrid = grid(speed);
  const viral = section('homeViralSongs', 'Viral Songs', 'Fresh discoveries, breakout covers and remixes.');
  const refresh = button('Refresh', () => refreshViral(true));
  viral.querySelector('.discovery-heading').append(refresh);
  const viralStatus = status(viral, 'Discovering viral songs…');
  const viralGrid = grid(viral);
  const best = section('homeAllTimeCollections', 'Best Songs of All Time', 'Open a collection and discover favourites across languages and film industries.');
  const bestGrid = grid(best);
  const drawer = section('homeDiscoveryPlaylist', 'Playlist', ''); drawer.classList.add('hidden');
  const drawerActions = document.createElement('div'); drawerActions.className = 'discovery-actions';
  const drawerRows = document.createElement('div'); drawerRows.className = 'discovery-song-list';
  const drawerStatus = status(drawer, '');
  const close = button('Close', () => { openSerial++; drawer.classList.add('hidden'); });
  drawerActions.append(close); drawer.querySelector('.discovery-heading').append(drawerActions); drawer.append(drawerRows);
  const hero = home.querySelector('.hero-card');
  if (hero) hero.after(speed, viral, best, drawer); else home.append(speed, viral, best, drawer);
  let openSerial = 0, busy = false, lastAttempt = 0;
  const playlistCache = new Map();

  function clean(items) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).map(normalizeSong).filter(song => {
      if (!song?.id || seen.has(song.id) || searchResultIsPlaylistLike(song)) return false;
      seen.add(song.id); return true;
    });
  }
  function showSongs(title, songs, key) {
    drawerRows.replaceChildren();
    drawer.querySelector('h2').textContent = title;
    drawerStatus.textContent = `${songs.length} songs`;
    drawerActions.querySelectorAll('.collection-play').forEach(el => el.remove());
    const context = makeContext(songs, 'home-collection', title, key);
    registerSongs(songs);
    songs.forEach(song => drawerRows.append(buildSongRow(song, !!song.filepath, context)));
    const play = button('Play All', () => playSongCollection(songs, title, { type:'home-collection', key }, play));
    play.classList.add('collection-play'); play.disabled = !songs.length; drawerActions.prepend(play);
    warmVisibleCards(songs, 2);
  }
  function revealDrawer(title) {
    drawer.classList.remove('hidden'); drawer.querySelector('h2').textContent = title;
    drawer.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  async function openCollection(title, query, playNow = false) {
    const intent = typeof navigationIntent === 'number' ? navigationIntent : 0;
    const serial = ++openSerial; revealDrawer(title); drawerRows.replaceChildren();
    drawerActions.querySelectorAll('.collection-play').forEach(el => el.remove());
    drawerStatus.textContent = 'Finding songs…';
    try {
      const cached = playlistCache.get(query);
      let songs = cached && Date.now() - cached.at < 24 * 60 * 60 * 1000 ? cached.songs : null;
      if (!songs) {
        const result = await window.echoAPI.search(query);
        if (result?.error) throw new Error(result.error);
        songs = clean(result); if (!songs.length) throw new Error('No songs found. Open again to retry.');
        playlistCache.set(query, { songs, at:Date.now() });
      }
      if (serial !== openSerial) return;
      showSongs(title, songs, `all-time:${query}`);
      if (playNow && (typeof navigationIntent !== 'number' || navigationIntent === intent)) playSongCollection(songs, title, { type:'home-collection', key:`all-time:${query}` });
    } catch (error) {
      if (serial === openSerial) drawerStatus.textContent = `Could not load: ${error.message}`;
    }
  }
  collections.forEach(([name, query, iconText]) => bestGrid.append(buildPlaylistCard({
    title:name, subtitle:'All-time favourites', iconText, openLabel:'Open',
    onOpen:() => openCollection(name, query), onPlay:() => openCollection(name, query, true)
  })));

  function localCollection(title, items, key) {
    openSerial++; revealDrawer(title); showSongs(title, clean(items), key);
  }
  function renderSpeedDial() {
    speedGrid.replaceChildren();
    const liked = getLikedSongs();
    speedGrid.append(buildPlaylistCard({ title:'Liked Songs', countText:`${liked.length} songs`, iconText:'♥',
      onOpen:() => localCollection('Liked Songs', liked, 'speed-liked'),
      onPlay:() => playSongCollection(liked, 'Liked Songs', {type:'liked', key:'liked'}) }));
    const lists = Object.entries(getPlaylists()).slice(0, 3);
    lists.forEach(([name, songs]) => speedGrid.append(buildPlaylistCard({ title:name, countText:`${songs.length} songs`,
      onOpen:() => localCollection(name, songs, `playlist:${name}`),
      onPlay:() => playSongCollection(songs, name, {type:'playlist', key:`playlist:${name}`}) })));
    const recent = clean(getStored(STORAGE.recent, [])).slice(0, Math.max(2, 5 - lists.length));
    const context = makeContext(recent, 'recent', 'Speed Dial', 'speed-recent');
    recent.forEach(song => speedGrid.append(buildSongCard(song, context)));
    if (!lists.length && !recent.length) {
      collections.slice(0, 2).forEach(([name, query, iconText]) => speedGrid.append(buildPlaylistCard({
        title:name, subtitle:'Quick discovery', iconText, onOpen:()=>openCollection(name,query), onPlay:()=>openCollection(name,query,true)
      })));
    }
  }
  function readCache() {
    try { const data=JSON.parse(localStorage.getItem(CACHE)); return data && Array.isArray(data.songs) ? data : null; }
    catch { return null; }
  }
  function renderViral(data, stale = false) {
    const songs=clean(data.songs).slice(0,12); registerSongs(songs); viralGrid.replaceChildren();
    const context=makeContext(songs,'viral','Viral Songs','home-viral');
    songs.forEach(song=>viralGrid.append(buildSongCard(song,context)));
    viralStatus.textContent=`${stale?'Saved discoveries · ':''}Updated ${new Date(data.at).toLocaleString()} · Songs and covers from YouTube search`;
  }
  function canRefresh() {
    return !document.hidden && home.classList.contains('active') && navigator.onLine !== false &&
      document.getElementById('playLoadingWrap')?.classList.contains('hidden');
  }
  async function refreshViral(force = false) {
    if (busy) return;
    const saved=readCache();
    if (saved) renderViral(saved,Date.now()-saved.at>=TTL);
    if (!force && saved && Date.now()-saved.at<TTL) return;
    if (!canRefresh()) {
      if (!saved) viralStatus.textContent='Viral discoveries will update when Home is active and you are online.';
      return;
    }
    if (!force && Date.now()-lastAttempt<60000) return;
    lastAttempt=Date.now();busy=true;refresh.disabled=true;
    viralStatus.textContent=saved?'Updating discoveries…':'Finding viral songs and covers…';
    try {
      const now=new Date(), month=now.toLocaleString('en-US',{month:'long'}), year=now.getFullYear();
      const queries=[`viral trending songs India Pakistan ${month} ${year}`,`viral covers remixes regional songs ${month} ${year}`];
      let found=[],failures=[];
      for(const query of queries){
        if(!canRefresh()) break; // Do not start another background search while user searches or plays.
        const result=await window.echoAPI.search(query);
        if(result?.error){failures.push(result.error);continue;}
        found.push(...clean(result).slice(0,6));
      }
      const songs=clean(found).slice(0,12);
      if(!songs.length) throw new Error(failures[0]||'No discoveries available. Try Refresh.');
      const data={at:Date.now(),songs};
      // A partial refresh stays retryable rather than suppressing covers for six hours.
      if(found.length && failures.length===0 && canRefresh()) {
        try{localStorage.setItem(CACHE,JSON.stringify(data));}catch{}
      }
      renderViral(data);
    } catch(error) {
      if(saved){renderViral(saved,true);viralStatus.textContent+=' · Refresh unavailable; keeping saved songs.';}
      else viralStatus.textContent=`${error.message} · Use Refresh to retry.`;
    } finally {busy=false;refresh.disabled=false;}
  }
  const about=section('aboutDeveloper','About Developer','');
  about.classList.add('settings-card','developer-card');
  const bio=document.createElement('p');bio.className='developer-bio';
  bio.textContent='DEV BY DAIYAN SARWAR THE MOST EFFICIENT DEVELOPER 2 TIMES WINNER OF HACKING TOURNAMENT AND WORLD CLASS CODER';
  const insta=document.createElement('a');insta.className='developer-instagram';
  insta.href='https://www.instagram.com/enchanting_daiyu/';insta.target='_blank';insta.rel='noopener noreferrer';
  insta.textContent='Instagram · @enchanting_daiyu';about.append(bio,insta);settings.append(about);
  renderSpeedDial();const saved=readCache();if(saved)renderViral(saved,Date.now()-saved.at>=TTL);
  document.querySelector('[data-tab="home"]')?.addEventListener('click',()=>{renderSpeedDial();void refreshViral();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshViral();});
  window.addEventListener('storage',renderSpeedDial);
  // Existing add-ons insert Settings cards during startup; retain the requested bottom position.
  setTimeout(()=>settings.append(about),1000);
  setTimeout(()=>void refreshViral(),5000);
  setInterval(()=>{if(canRefresh())void refreshViral();},60000);
})();
