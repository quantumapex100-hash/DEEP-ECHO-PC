const { parseHTML } = require('linkedom');
const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
const path=require('path');
process.chdir(path.resolve(__dirname, '..'));
const {window}=parseHTML(fs.readFileSync('src/index.html','utf8'));
const storage=new Map();
window.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))};
window.console=console;window.performance=performance;window.innerWidth=1100;window.innerHeight=720;
window.matchMedia=()=>({matches:false});window.requestAnimationFrame=()=>0;
window.setTimeout=(fn,ms)=>{const t=require('node:timers').setTimeout(fn,ms);t.unref();return t};window.clearTimeout=clearTimeout;window.setInterval=(fn,ms)=>{const t=require('node:timers').setInterval(fn,ms);t.unref();return t};window.clearInterval=clearInterval;
const gradient={addColorStop(){}};
const ctx=new Proxy({}, {get:(target,key)=>target[key]|| (['createRadialGradient','createLinearGradient'].includes(key)?()=>gradient:()=>{}),set:(target,key,v)=>{target[key]=v;return true}});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const audio=window.document.getElementById('audioPlayer');audio.paused=true;audio.duration=189;audio.currentTime=0;
audio.play=async()=>{audio.paused=false;audio.dispatchEvent(new window.Event('play'));audio.dispatchEvent(new window.Event('playing'));};
audio.pause=()=>{audio.paused=true;audio.dispatchEvent(new window.Event('pause'))};
window.HTMLElement.prototype.scrollIntoView=function(){};
const songs=[{id:'a',title:'Doechii - What It Is (Solo Version) (Lyrics)',channel:'Rap Samurai',duration:'3:09'},{id:'b',title:'Artist - Second song',channel:'Artist',duration:'3:20'}];
const requests=new Map();let streamProgress,library=[];
window.echoAPI={getLibrary:async()=>library,getHomeFeed:async()=>({topHits:songs,topArtistSongs:[]}),search:async()=>songs,
searchArtist:async()=>songs,streamSong:(s,id)=>new Promise(resolve=>requests.set(s.id,{id,resolve})),onStreamProgress:fn=>streamProgress=fn,onDownloadProgress:()=>{},
getLyrics:async()=>({syncedLyrics:'[00:00]First line\n[00:01]Second line',source:'Fixture'}),prefetchSong:async()=>({success:true}),
downloadSong:async s=>{library=[{...s,filepath:'C:/song.wav'}];return {success:true}},deleteSong:async()=>[]};
const context=vm.createContext(window);
const evaluate=s=>vm.runInContext(s,context);
const tick=()=>new Promise(r=>setImmediate(r));
const settle=()=>new Promise(r=>require('node:timers').setTimeout(r,85));
const q=s=>window.document.querySelector(s);
(async()=>{
  evaluate(fs.readFileSync('src/effects.js','utf8'));evaluate(fs.readFileSync('src/renderer.js','utf8'));
  await tick();assert.equal(window.document.body.dataset.theme,'golden');assert.equal(q('[data-tab="library"]').textContent,'Downloads');
  evaluate('playRemoteSong({id:"a",title:"First",channel:"Artist"})');
  streamProgress({id:'a',requestId:requests.get('a').id,percent:42,status:'Loading audio'});
  assert.match(q('#playLoadingText').textContent,/42%/);
  evaluate('playRemoteSong({id:"b",title:"Second",channel:"Artist"})');
  await settle();requests.get('b').resolve({success:true,song:{...songs[1],filepath:'C:/song #2.wav',fileUrl:'file:///C:/song%20%232.wav'}});await tick();
  requests.get('a').resolve({success:true,song:{...songs[0],filepath:'C:/song1.wav'}});await tick();
  assert.match(q('#nowTitle').textContent,/Second/);assert.equal(audio.src,'file:///C:/song%20%232.wav');
  q('#playerLikeBtn').click();assert.equal(q('#playerLikeBtn').getAttribute('aria-pressed'),'true');assert.ok(q('#playerLikeBtn svg'));
  q('#playerDownloadBtn').click();await tick();assert.ok(q('#playerDownloadBtn').classList.contains('is-saved'));assert.ok(q('#playerDownloadBtn svg'));
  evaluate("activateTab('playlists')");q('#newPlaylistBtn').click();q('#createPlaylistInput').value='Night';q('#createPlaylistSave').click();assert.match(q('#playlistCards').textContent,/Night/);
  evaluate("activateTab('search');runSearch('song','demo')");await tick();assert.equal(window.document.querySelectorAll('#resultsList .row-icon').length,10);
  window.document.querySelector('#resultsList .action-add').click();assert.ok(!q('#playlistChooserModal').classList.contains('hidden'));q('.playlist-choice').click();
  assert.equal(JSON.parse(storage.get('echo-playlists-v1')).Night.length,1);
  window.document.querySelector('#resultsList .action-queue').click();assert.equal(q('#queueList .queue-item') ? q('#queueList').querySelectorAll('.queue-item').length : 0,1);assert.match(q('#queueSummary').textContent,/1 manually queued/);
  q('#queueToggleBtn').click();assert.ok(!q('#queuePanel').classList.contains('hidden'));
  q('#loopBtn').click();assert.equal(q('#loopBtn').title,'Loop All');
  q('#loopBtn').click();assert.equal(q('#loopBtn').title,'Loop One');assert.match(q('#loopBtn').textContent,/1/);
  await evaluate('loadLyricsFor(currentSong)');
  audio.currentTime=1.3;audio.dispatchEvent(new window.Event('timeupdate'));assert.equal(q('.lyric-line.current').textContent,'Second line');
  const pending=new Map();window.echoAPI.getLyrics=s=>new Promise(resolve=>pending.set(s.title,resolve));
  evaluate('loadLyricsFor({title:"Old",channel:"one"});loadLyricsFor({title:"New",channel:"two"})');
  pending.get('New')({lyrics:'New words'});await tick();pending.get('Old')({lyrics:'Old words'});await tick();assert.match(q('#lyricsBody').textContent,/New words/);
  for(const theme of ['golden','toxic','blood','silver','transparent']) {
    q(`[data-theme-choice="${theme}"]`).click();assert.equal(window.document.body.dataset.theme,theme);assert.equal(storage.get('echo-theme-v1'),theme);
    for(let i=0;i<3;i++)window.drawDinechoEffect(ctx,{width:1100,height:720},theme);
  }
  assert.equal(JSON.parse(storage.get('echo-liked-songs-v1')).length,1);
  evaluate('playRemoteSong({id:"fail",title:"Fail",channel:"Artist"})');await settle();requests.get('fail').resolve({success:false,error:'offline'});await tick();assert.match(q('#playLoadingText').textContent,/Could not play/);
  console.log('PASS DOM integration: golden default, Downloads, 42% event, stale playback and lyrics, safe file URL, play/heart/download SVGs, download state, playlist create/add, likes storage, timed lyrics, 5 theme switches, animation smoke checks, manual-only queue add/panel, loop all/one, failed playback UI. Audio, canvas, IPC mocked; no visual rendering.');
})().catch(e=>{console.error(e);process.exit(1)});

