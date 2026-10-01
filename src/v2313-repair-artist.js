(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const safeText = value => String(value ?? '').replace(/\s+/g,' ').trim();
  const artistCache = new Map();
  let artistLoadSerial = 0;
  let repairBusy = false;

  function toast(text){ try { if(typeof showToast==='function') showToast(text); } catch(_){} }
  function activeTab(){ return document.querySelector('.nav-item.active')?.dataset?.tab || 'home'; }
  function preservePlayback(){
    return { time:Number(audioPlayer?.currentTime||0), paused:!!audioPlayer?.paused, id:String(currentSong?.id||'') };
  }
  function restorePlayback(snapshot){
    if(!snapshot || String(currentSong?.id||'')!==snapshot.id) return;
    const restore=()=>{try{if(Number.isFinite(snapshot.time)&&snapshot.time>=0&&Math.abs((audioPlayer.currentTime||0)-snapshot.time)>1.25)audioPlayer.currentTime=Math.min(Number(audioPlayer.duration)||snapshot.time,snapshot.time);if(!snapshot.paused&&audioPlayer.paused)audioPlayer.play().catch(()=>{});}catch(_){}};
    setTimeout(restore,80); setTimeout(restore,420);
  }

  function ensureRepairButtons(){
    const actions=document.querySelector('.topbar-actions');
    if(actions&&!$('v2313RepairBtn')){
      const btn=document.createElement('button'); btn.id='v2313RepairBtn'; btn.type='button'; btn.className='v2313-repair-btn'; btn.innerHTML='<span aria-hidden="true">↻</span><b>Repair</b>'; btn.title='Refresh / Repair only the current section'; btn.setAttribute('aria-label','Refresh or repair current section');
      actions.insertBefore(btn, actions.firstChild); btn.addEventListener('click',()=>repairCurrentSection());
    }
    const controls=document.querySelector('.immersive-controls');
    if(controls&&!$('v2313ImmersiveRepairBtn')){
      const btn=document.createElement('button'); btn.id='v2313ImmersiveRepairBtn'; btn.type='button'; btn.className='v2313-immersive-repair'; btn.textContent='↻'; btn.title='Repair Immersive Player without restarting playback'; btn.setAttribute('aria-label','Repair Immersive Player');
      controls.appendChild(btn); btn.addEventListener('click',()=>repairImmersive());
    }
  }

  function repairLabel(tab){ return ({home:'Home',search:'Search',library:'Downloads',lyrics:'Lyrics',liked:'Liked Songs',playlists:'Playlists',history:'History',settings:'Settings'}[tab]||'Section'); }
  function updateRepairButton(){ const btn=$('v2313RepairBtn'); if(!btn)return; const tab=activeTab(); btn.title=`Refresh / Repair ${repairLabel(tab)} only · current song keeps playing`; }

  async function repairLyrics(){
    if(!currentSong?.title){toast('Lyrics Repair · pehle koi song play karo');return;}
    if(typeof setLyricsAutoFollow==='function')setLyricsAutoFollow(true);
    if(typeof exactLyricsEnabled!=='undefined' && exactLyricsEnabled && typeof runExactLyrics==='function'){
      toast('Exact Lyrics Repair · fresh sync scan'); await runExactLyrics(true); return;
    }
    if(typeof loadLyricsFor==='function'){
      toast('Lyrics Repair · reloading and recalibrating sync');
      await loadLyricsFor(currentSong,false);
      try { if(typeof smartPrepareKaraokeWords==='function') smartPrepareKaraokeWords(); } catch(_){}
    }
  }

  async function repairCurrentSection(){
    if(repairBusy)return; repairBusy=true; const btn=$('v2313RepairBtn'); btn?.classList.add('is-working'); const snap=preservePlayback(); const tab=activeTab();
    try{
      if(tab==='lyrics') await repairLyrics();
      else if(tab==='home'){
        toast('Home Repair · refreshing recommendations');
        if($('home220Refresh')) $('home220Refresh').click();
        else {
          try{if(typeof loadHomeContent==='function')await loadHomeContent(true);}catch(_){}
          try{if(typeof smartRefreshRecommendations==='function')await smartRefreshRecommendations(true);}catch(_){}
          try{if(typeof renderRecentlyPlayed==='function')renderRecentlyPlayed();}catch(_){}
          try{if(typeof renderSmartHome==='function')renderSmartHome();}catch(_){}
        }
      }else if(tab==='search'){
        const q=safeText($('searchInput')?.value); if(q&&typeof runSearch==='function'){toast('Search Repair · refreshing these results');await runSearch('song',q);}else{try{activateTab('search');}catch(_){}toast('Search discovery refreshed');}
      }else if(tab==='library'){try{await loadLibrary();}catch(_){}toast('Downloads refreshed');}
      else if(tab==='liked'){try{renderLikedSongs();}catch(_){}toast('Liked Songs refreshed');}
      else if(tab==='playlists'){
        try{if(!$('playlistDetail')?.classList.contains('hidden')&&currentPlaylistDetail?.songs?.length){const ctx=typeof makeContext==='function'?makeContext(currentPlaylistDetail.songs,currentPlaylistDetail.type||'playlist',currentPlaylistDetail.label||'Playlist',currentPlaylistDetail.key||`playlist:${Date.now()}`):null;renderPlaylistDetailSongs(currentPlaylistDetail.songs,ctx,{localName:currentPlaylistName});}else renderPlaylists();}catch(_){try{renderPlaylists();}catch(__){}}
        toast('Playlists refreshed');
      }else if(tab==='history'){try{renderSmartHistory();}catch(_){}toast('History refreshed');}
      else if(tab==='settings'){try{applyTheme(document.body.dataset.theme||'golden');}catch(_){}toast('Settings UI refreshed');}
      else toast(`${repairLabel(tab)} refreshed`);
    }catch(error){console.warn('[V13 Repair]',error);toast(`${repairLabel(tab)} repair could not finish`);}finally{restorePlayback(snap);repairBusy=false;btn?.classList.remove('is-working');updateRepairButton();}
  }

  function cleanArtist(song){
    let artist=safeText(song?.channel||song?.artist||'').replace(/\s+-\s+Topic$/i,'').replace(/VEVO$/i,'').trim();
    if(!artist){const title=safeText(song?.title);const m=title.match(/^(.{2,60}?)\s*[-–—|]\s*.+$/);if(m)artist=m[1].trim();}
    return artist;
  }
  function artistSongCard(song,all){
    const btn=document.createElement('button');btn.type='button';btn.className='v2313-artist-song';btn.title=`Play ${safeText(song?.title)||'song'}`;
    const img=document.createElement('img');img.src=song?.thumbnail||'assets/dinecho-logo.png';img.alt='';
    const meta=document.createElement('span');const title=document.createElement('strong');title.textContent=safeText(song?.title)||'Untitled';const channel=document.createElement('small');channel.textContent=safeText(song?.channel)||'';meta.append(title,channel);btn.append(img,meta);
    btn.addEventListener('click',async()=>{try{const context=typeof makeContext==='function'?makeContext(all,'immersive-artist','About Artist',`artist:${Date.now()}`):null;await startSingleSong(song,null,context);setTimeout(()=>loadArtistPanel(true),180);}catch(error){console.warn('[artist play]',error);toast('Song could not start');}});
    return btn;
  }
  function ensureArtistPanel(){
    const content=document.querySelector('.immersive-content'); if(!content)return null; let panel=$('v2313ArtistPanel'); if(panel)return panel;
    panel=document.createElement('section');panel.id='v2313ArtistPanel';panel.className='v2313-artist-panel';panel.innerHTML=`<div class="v2313-artist-head"><div><span>ABOUT ARTIST</span><strong id="v2313ArtistName">Artist</strong></div><button id="v2313ArtistRefresh" type="button" title="Refresh artist songs">↻</button></div><p id="v2313ArtistAbout" class="v2313-artist-about">Artist details will appear for the current song.</p><div id="v2313ArtistSongs" class="v2313-artist-songs"></div>`;
    const progress=document.querySelector('.immersive-progress'); if(progress)progress.insertAdjacentElement('afterend',panel); else content.appendChild(panel);
    $('v2313ArtistRefresh')?.addEventListener('click',()=>loadArtistPanel(true)); return panel;
  }
  async function loadArtistPanel(force=false){
    const panel=ensureArtistPanel(); if(!panel)return; const song=currentSong; const artist=cleanArtist(song); const serial=++artistLoadSerial;
    $('v2313ArtistName').textContent=artist||'Current Artist';
    if(!song?.title){$('v2313ArtistAbout').textContent='Play a song to load its artist profile.';$('v2313ArtistSongs').replaceChildren();return;}
    if(!artist){$('v2313ArtistAbout').textContent=`Now playing · ${safeText(song.title)}`;$('v2313ArtistSongs').replaceChildren();return;}
    const key=artist.toLocaleLowerCase(); const cached=artistCache.get(key); let songs=cached?.songs||[];
    if(force||!cached||Date.now()-cached.at>10*60*1000){
      $('v2313ArtistAbout').textContent=`Finding ${artist}'s songs without interrupting playback…`;
      try{const rows=await window.echoAPI?.searchArtist?.(artist);songs=Array.isArray(rows)?rows:[];artistCache.set(key,{at:Date.now(),songs});}catch(error){console.warn('[artist profile]',error);songs=cached?.songs||[];}
    }
    if(serial!==artistLoadSerial)return;
    const unique=[];const seen=new Set();for(const item of songs){if(!item?.id||seen.has(item.id))continue;seen.add(item.id);unique.push(item);if(unique.length>=8)break;}
    $('v2313ArtistAbout').textContent=unique.length?`${artist} · ${unique.length} top/related tracks found for this artist in DEEP-ECHO discovery.`:`${artist} · artist metadata from the current track. No extra tracks could be loaded right now.`;
    const wrap=$('v2313ArtistSongs');wrap.replaceChildren();unique.filter(item=>item.id!==song.id).slice(0,6).forEach(item=>wrap.appendChild(artistSongCard(item,unique)));
  }

  async function repairImmersive(){
    if(repairBusy)return;repairBusy=true;const btn=$('v2313ImmersiveRepairBtn');btn?.classList.add('is-working');const snap=preservePlayback();
    try{try{smartUpdateNowPlaying();}catch(_){}try{smartRebuildImmersiveLyrics();smartSyncImmersiveLyricsState(true);}catch(_){}await loadArtistPanel(true);toast('Immersive Player repaired · playback preserved');}
    catch(error){console.warn('[immersive repair]',error);toast('Immersive repair could not finish');}finally{restorePlayback(snap);repairBusy=false;btn?.classList.remove('is-working');}
  }

  function enableArtworkImmersive(){
    const art=$('nowThumb'); if(!art||art.dataset.v2313Immersive==='1')return; art.dataset.v2313Immersive='1'; art.classList.add('v2313-open-immersive'); art.title='Open Immersive Player'; art.setAttribute('role','button'); art.setAttribute('tabindex','0'); art.setAttribute('aria-label','Open Immersive Player');
    let start=null;
    art.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};});
    art.addEventListener('pointerup',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.hypot(dx,dy)>12)return;if(!currentSong?.title){toast('Pehle koi song play karo');return;}try{smartOpenImmersive();}catch(_){} });
    art.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(currentSong?.title)smartOpenImmersive();}});
  }

  ensureRepairButtons(); ensureArtistPanel(); enableArtworkImmersive(); updateRepairButton();
  document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>setTimeout(updateRepairButton,0)));
  const immersiveRoot=$('immersivePlayer');
  if(immersiveRoot){new MutationObserver(()=>{if(!immersiveRoot.classList.contains('hidden'))setTimeout(()=>loadArtistPanel(false),40);}).observe(immersiveRoot,{attributes:true,attributeFilter:['class']});}

  // Extend, do not replace, the existing immersive lifecycle. Current playback/lyrics/video
  // logic stays owned by renderer.js; V13 only adds the artist profile around it.
  try{
    const baseOpen=smartOpenImmersive;
    smartOpenImmersive=async function(){const out=await baseOpen.apply(this,arguments);setTimeout(()=>loadArtistPanel(false),30);return out;};
  }catch(_){}
  try{
    const baseUpdate=smartUpdateNowPlaying;
    smartUpdateNowPlaying=function(){const out=baseUpdate.apply(this,arguments);if(!$('immersivePlayer')?.classList.contains('hidden'))setTimeout(()=>loadArtistPanel(false),50);return out;};
  }catch(_){}

  window.DeepEchoV13={repairCurrentSection,repairImmersive,loadArtistPanel};
})();
