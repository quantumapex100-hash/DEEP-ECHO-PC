// Deepeccho v1.6.0 Intelligence Suite. Additive wrappers only: playback/lyrics/visualizer engines remain intact.
(() => {
'use strict';
const $=id=>document.getElementById(id), KEY='deepeccho-v160-suite-v1';
const durSec=v=>String(v||'').split(':').map(Number).reduce((a,n)=>a*60+(Number.isFinite(n)?n:0),0);
const cfg=()=>({flow:false,autoMix:true,mediaSession:true,globalKeys:true,lyricsOffset:0,perf:'balanced',stability:true,gameMode:false,gameAuto:true,...getStored(KEY,{})});
const save=(patch)=>setStored(KEY,{...cfg(),...patch});
let sleepTimer=null, sleepEndHandler=null, dlQueue=[], dlBusy=false, lastProgress=0, watchdogMisses=0;
function candidates(){
  const cached=(typeof smartRecommendationCache==='function'?smartRecommendationCache():{})||{};
  return smartUniqueSongs([
    ...(getLikedSongs?.()||[]),
    ...(getStored(STORAGE.recent,[])||[]),
    ...(getStored(STORAGE.smartHistory,[])||[]).map(x=>x.song),
    ...(cached.songs||[]),
    ...(currentLibrary||[])
  ]).filter(x=>x?.id&&x.id!==currentSong?.id);
}
function djTokens(v){return new Set(String(v||'').toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/g,' ').split(/\s+/).filter(x=>x.length>2));}
function djHash(value){let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967295;}
function djTextAffinity(a,b){
  if(!a||!b)return 0;let score=0;
  const aa=djTokens(`${a.title} ${a.channel}`),bb=djTokens(`${b.title} ${b.channel}`);
  for(const t of aa)if(bb.has(t))score+=.18;
  const ac=String(a.channel||'').toLowerCase(),bc=String(b.channel||'').toLowerCase();
  if(ac&&bc&&(ac===bc||ac.includes(bc)||bc.includes(ac)))score+=2.4;
  return score;
}
function djModeScore(song,mode){
  const t=`${song.title} ${song.channel}`.toLowerCase();let n=0;
  if(mode==='chill')n+=/acoustic|slow|lofi|chill|soft|love|calm|unplugged/.test(t)?5.2:0;
  if(mode==='energy')n+=/rock|remix|dance|party|energy|workout|bass|edm/.test(t)?5.2:0;
  if(mode==='focus')n+=/instrumental|ambient|lofi|piano|study|focus|calm/.test(t)?5.2:0;
  if(mode==='late')n+=/night|slow|love|acoustic|dream|lofi|sad|moon/.test(t)?5.2:0;
  return n;
}
function djPersonalScore(song,mode,index=0){
  const stats=getStored(STORAGE.playStats,{})?.[song.id]||{};
  const signals=(typeof smartPreferenceSignals==='function'?smartPreferenceSignals():{})?.[song.id]||{};
  const liked=(getLikedSongs?.()||[]).some(x=>x.id===song.id);
  const recent=(getStored(STORAGE.recent,[])||[]),recentIndex=recent.findIndex(x=>x.id===song.id);
  const history=(getStored(STORAGE.smartHistory,[])||[]).slice(0,18),historyIndex=history.findIndex(x=>x?.song?.id===song.id);
  const now=Date.now(),ageH=Math.max(0,(now-Number(stats.lastPlayed||signals.lastSignal||now))/3600000);
  let score=(liked?8.5:0)+Math.log2(1+Number(stats.count||0))*3.2+Number(signals.completes||0)*2.8+Number(signals.likes||0)*2.25-Number(signals.skips||0)*3.5;
  score+=Math.max(0,2.4-Math.log2(1+ageH)*.35);
  if(recentIndex>=0)score+=Math.max(-1.5,2.0-recentIndex*.42);
  if(historyIndex>=0)score-=Math.max(0,3.4-historyIndex*.26); // avoid repeating what just played
  score+=djModeScore(song,mode);
  score+=djTextAffinity(song,currentSong)*1.1;
  const hour=new Date().getHours();
  if((hour>=22||hour<6)&&/night|slow|chill|lofi|acoustic|love/.test(`${song.title} ${song.channel}`.toLowerCase()))score+=1.35;
  if(hour>=6&&hour<12&&/acoustic|pop|morning|happy|soft/.test(`${song.title} ${song.channel}`.toLowerCase()))score+=.8;
  // Stable exploration: small deterministic variation instead of random reshuffling on every click.
  score+=djHash(`${song.id}:${mode}:${new Date().toISOString().slice(0,10)}:${index}`)*1.15;
  return score;
}
function buildPersonalDJ(pool,mode){
  const ranked=smartUniqueSongs(pool.map(queueSong).filter(song=>song?.id&&song?.url))
    .map((song,i)=>({song,score:djPersonalScore(song,mode,i)}))
    .sort((a,b)=>b.score-a.score);
  const chosen=[],artistUse=new Map();
  for(const row of ranked){
    const artist=String(row.song.channel||'unknown').toLowerCase();
    const used=artistUse.get(artist)||0;
    if(used>=2)continue;
    if(chosen.some((x,idx)=>idx<5&&djTextAffinity(x,row.song)>3.15))continue;
    chosen.push(row.song);artistUse.set(artist,used+1);
    if(chosen.length>=30)break;
  }
  return chosen;
}
async function startDJ(){
  const mode=$('v160DjMode')?.value||'discover';
  let pool=candidates();
  // Local taste starts instantly. Network discovery is only used when the local profile is too small.
  if(pool.length<10&&window.echoAPI.getHomeFeed){try{const f=await window.echoAPI.getHomeFeed();pool=smartUniqueSongs([...pool,...(f?.topHits||[]),...(f?.topArtistSongs||[])]);}catch{}}
  const items=buildPersonalDJ(pool,mode);
  if(!items.length)return showToast('AI DJ ke liye abhi listening data kam hai');
  setActiveContext(makeContext(items,'ai-dj',`AI DJ · ${mode}`,`ai-dj:${mode}`),items[0]);
  const profileSize=Object.keys(getStored(STORAGE.playStats,{})||{}).length;
  if($('v160DjState'))$('v160DjState').textContent=`Personalized · ${mode} · ${items.length} songs · ${profileSize} taste signals`;
  // Do NOT prefetch before the first track. Competing yt-dlp jobs caused the UI/audio start hitch.
  let started=false;for(let i=0;i<Math.min(3,items.length)&&!started;i++)started=await playContextAt(i);
  if(!started)showToast('AI DJ ke pehle sources unavailable hain · Retry/Next try karo');
}
function refreshStats(){const h=getStored(STORAGE.smartHistory,[]).slice(0,50), counts={};h.forEach(x=>{const s=x.song;if(s?.title)counts[s.title]=(counts[s.title]||0)+1;});const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];const mins=Math.round(h.reduce((a,x)=>a+(durSec(x.song?.duration)||0),0)/60);$('v160Minutes').textContent=`${mins} min`;$('v160Stats').textContent=`Recent 50: ${h.length} plays${top?` · Top: ${top[0]} (${top[1]}×)`:''}`;}
async function refreshOffline(){try{currentLibrary=await window.echoAPI.getLibrary();const c=await window.echoAPI.smartCacheInfo?.();const mb=c?.success?(c.bytes/1048576).toFixed(0):0;$('v160OfflineCount').textContent=`${currentLibrary.length} downloads · ${c?.count||0} cached (${mb} MB)`;}catch{$('v160OfflineCount').textContent='Scan failed';}}
async function cacheCurrent(){if(!currentSong)return showToast('Pehle koi song play karo');$('v160OfflineCount').textContent='Caching…';const r=await window.echoAPI.smartCacheSong?.(queueSong(currentSong));showToast(r?.success?'Smart cache ready':'Cache failed');refreshOffline();}
async function clearCache(){await window.echoAPI.smartCacheClear?.();refreshOffline();showToast('Smart cache cleared');}
async function refreshOutputs(){const sel=$('v160OutputSelect');if(!sel||!navigator.mediaDevices?.enumerateDevices)return;try{const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audiooutput');sel.innerHTML='<option value="">System Default</option>'+devices.map((d,i)=>`<option value="${escapeHtml(d.deviceId)}">${escapeHtml(d.label||`Output ${i+1}`)}</option>`).join('');$('v160OutputState').textContent=`${devices.length||1} available`;}catch{$('v160OutputState').textContent='Default only';}}
async function setOutput(id){if(typeof audioPlayer.setSinkId!=='function')return showToast('Windows/Chromium is output switching ko support nahi kar raha');try{await audioPlayer.setSinkId(id);$('v160OutputState').textContent=id?'Custom':'Default';}catch(e){showToast('Audio output switch nahi hua');}}
function applyPerf(mode){document.body.classList.toggle('v160-performance',mode==='performance');$('v160PerfState').textContent=mode[0].toUpperCase()+mode.slice(1);save({perf:mode});}
let gameModeAutoActive=false, gameModeAutoTimer=0;
function applyGameMode(enabled, reason='manual'){
  const on=!!enabled;
  window.__deepecchoGameMode=on;
  window.__deepecchoGameModeReason=on?reason:'';
  document.body.classList.toggle('deepeccho-game-mode',on);
  const state=$('v163GameState');
  if(state)state.textContent=on?(reason==='background'?'Gaming · Background':'Gaming · Manual'):'Ready';
  if(on){
    // Audio remains untouched. Only visual/UI workload is reduced.
    try{document.body.style.setProperty('--game-mode-active','1');}catch{}
  }else{
    try{document.body.style.removeProperty('--game-mode-active');}catch{}
  }
  window.dispatchEvent(new CustomEvent('deepeccho-game-mode-change',{detail:{enabled:on,reason}}));
}
function setManualGameMode(on){
  gameModeAutoActive=false;clearTimeout(gameModeAutoTimer);
  save({gameMode:!!on});applyGameMode(!!on,'manual');
}
function scheduleAutoGameMode(on){
  clearTimeout(gameModeAutoTimer);
  const c=cfg();if(!c.gameAuto||c.gameMode)return;
  if(on){gameModeAutoTimer=setTimeout(()=>{if(cfg().gameAuto&&!cfg().gameMode&&!document.hasFocus()){gameModeAutoActive=true;applyGameMode(true,'background');}},650);}
  else if(gameModeAutoActive){gameModeAutoActive=false;applyGameMode(false,'background');}
}
window.addEventListener('blur',()=>scheduleAutoGameMode(true));
window.addEventListener('focus',()=>scheduleAutoGameMode(false));
document.addEventListener('visibilitychange',()=>scheduleAutoGameMode(document.hidden));
function setOffset(v){v=Number(v)||0;save({lyricsOffset:v});window.deepecchoLyricsOffsetMs=v;$('v160OffsetLabel').textContent=`${v>0?'+':''}${v} ms`;}
async function runDownloads(){if(dlBusy||!dlQueue.length)return;dlBusy=true;while(dlQueue.length){const song=dlQueue[0];$('v160DownloadState').textContent=`Downloading · ${song.title}`;try{const r=await window.echoAPI.downloadSong(song);if(!r?.success)throw new Error(r?.error||'failed');dlQueue.shift();$('v160DownloadQueue').textContent=dlQueue.length?`${dlQueue.length} queued`:'Queue empty';}catch(e){$('v160DownloadState').textContent='Paused after error';break;}}if(!dlQueue.length)$('v160DownloadState').textContent='Idle';dlBusy=false;}
function queueCurrent(){if(!currentSong)return showToast('Pehle koi song play karo');if(!dlQueue.some(x=>x.id===currentSong.id))dlQueue.push(queueSong(currentSong));$('v160DownloadQueue').textContent=`${dlQueue.length} queued`;runDownloads();}
function setupMediaSession(){if(!('mediaSession'in navigator))return;try{navigator.mediaSession.setActionHandler('play',()=>audioPlayer.play());navigator.mediaSession.setActionHandler('pause',()=>audioPlayer.pause());navigator.mediaSession.setActionHandler('nexttrack',()=>playNext());navigator.mediaSession.setActionHandler('previoustrack',()=>playPrevious());}catch{}}
function updateMedia(){if(!cfg().mediaSession||!('mediaSession'in navigator)||!currentSong)return;try{navigator.mediaSession.metadata=new MediaMetadata({title:currentSong.title,artist:currentSong.channel||'DEEP-ECHO',artwork:currentSong.thumbnail?[{src:currentSong.thumbnail}]:[]});}catch{}}
// Stability watchdog: recover UI state only; never replaces normal source resolution.
$('v160DjStart')?.addEventListener('click',startDJ);$('v160Flow')?.addEventListener('change',e=>{save({flow:e.target.checked});if(e.target.checked&&currentSong)startSongRadio(currentSong);});$('v160AutoMix')?.addEventListener('change',e=>{save({autoMix:e.target.checked});if(e.target.checked&&$('crossfadeRange')){$('crossfadeRange').value='4';$('crossfadeRange').dispatchEvent(new Event('input'));}});$('v160RefreshStats')?.addEventListener('click',refreshStats);$('v160RefreshOffline')?.addEventListener('click',refreshOffline);$('v160CacheCurrent')?.addEventListener('click',cacheCurrent);$('v160ClearCache')?.addEventListener('click',clearCache);$('v160RefreshOutputs')?.addEventListener('click',refreshOutputs);$('v160OutputSelect')?.addEventListener('change',e=>setOutput(e.target.value));$('v160LyricsOffset')?.addEventListener('input',e=>setOffset(e.target.value));$('v160OffsetReset')?.addEventListener('click',()=>{$('v160LyricsOffset').value=0;setOffset(0)});$('v160DownloadCurrent')?.addEventListener('click',queueCurrent);$('v160Perf')?.addEventListener('change',e=>applyPerf(e.target.value));$('v163GameMode')?.addEventListener('change',e=>setManualGameMode(e.target.checked));$('v163GameAuto')?.addEventListener('change',e=>{save({gameAuto:e.target.checked});if(!e.target.checked&&gameModeAutoActive){gameModeAutoActive=false;applyGameMode(false,'background');}else if(e.target.checked&&!document.hasFocus())scheduleAutoGameMode(true);});$('v160Stability')?.addEventListener('change',e=>save({stability:e.target.checked}));
audioPlayer.addEventListener('play',updateMedia);audioPlayer.addEventListener('loadedmetadata',updateMedia);
const c=cfg();if($('v160Flow'))$('v160Flow').checked=c.flow;if($('v160AutoMix'))$('v160AutoMix').checked=c.autoMix;if($('v160MediaSession'))$('v160MediaSession').checked=c.mediaSession;if($('v160GlobalKeys'))$('v160GlobalKeys').checked=c.globalKeys;if($('v160LyricsOffset'))$('v160LyricsOffset').value=c.lyricsOffset;if($('v160Stability'))$('v160Stability').checked=c.stability;if($('v160Perf'))$('v160Perf').value=c.perf;if($('v163GameMode'))$('v163GameMode').checked=c.gameMode;if($('v163GameAuto'))$('v163GameAuto').checked=c.gameAuto;setOffset(c.lyricsOffset);applyPerf(c.perf);applyGameMode(c.gameMode,'manual');setupMediaSession();refreshStats();refreshOffline();refreshOutputs();
window.addEventListener('error',e=>{if(cfg().stability)$('v160StabilityState').textContent='Protected · error isolated';});window.addEventListener('unhandledrejection',()=>{if(cfg().stability)$('v160StabilityState').textContent='Protected · promise isolated';});
})();
