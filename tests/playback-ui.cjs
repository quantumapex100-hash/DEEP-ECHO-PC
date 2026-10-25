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

// Playback-priority scenarios use the real renderer/Smart Autoplay with controlled IPC/media.
(async()=>{
 evaluate(fs.readFileSync('src/effects.js','utf8'));evaluate(fs.readFileSync('src/renderer.js','utf8'));await tick();
 const pending=[],plays=[];audio.play=async()=>{plays.push(audio.src);audio.paused=false;audio.dispatchEvent(new window.Event('play'));audio.dispatchEvent(new window.Event('playing'));};
 window.echoAPI.streamSong=(s,id)=>s.cancelOnly?Promise.resolve({success:true}):new Promise(resolve=>pending.push({s,id,resolve}));
 const track=(id)=>({id,title:'Track '+id,url:'https://www.youtube.com/watch?v='+id});
 const finish=async entry=>{entry.resolve({success:true,song:{...entry.s,streamUrl:'https://media/'+entry.s.id}});await tick();};
 for(const type of ['home','search'])for(let i=0;i<10;i++){const song=track(type+i);const result=evaluate('startSingleSong('+JSON.stringify(song)+',null,makeContext(['+JSON.stringify(song)+'],"'+type+'"))');await settle();await finish(pending.at(-1));await result;assert.equal(evaluate('currentSong.id'),song.id);}
 const rapidFrom=pending.length;evaluate('startSingleSong('+JSON.stringify(track('A'))+')');await settle();for(const id of ['B','C','D'])evaluate('startSingleSong('+JSON.stringify(track(id))+')');await settle();
 const rapid=pending.slice(rapidFrom),before=plays.length;assert.ok(rapid.length<=2);await finish(rapid.at(-1));for(const entry of rapid.slice(0,-1))await finish(entry);assert.equal(evaluate('currentSong.id'),'D');assert.equal(plays.length,before+1);
 const list=Array.from({length:12},(_,i)=>track('skip'+i));evaluate('setActiveContext(makeContext('+JSON.stringify(list)+',"playlist"),'+JSON.stringify(list[0])+')');
 let from=pending.length;for(let i=0;i<10;i++)evaluate('playNext()');await settle();const skips=pending.slice(from);assert.ok(skips.length<=2);await finish(skips.at(-1));for(const entry of skips.slice(0,-1))await finish(entry);assert.equal(evaluate('currentSong.id'),'skip10');
 from=pending.length;evaluate('playPrevious()');await settle();await finish(pending[from]);assert.equal(evaluate('currentSong.id'),'skip9');
 evaluate('playQueue=['+JSON.stringify(track('manual1'))+','+JSON.stringify(track('manual2'))+']');from=pending.length;evaluate('playNext()');await settle();await finish(pending[from]);assert.equal(evaluate('currentSong.id'),'manual1');assert.equal(evaluate('playQueue[0].id'),'manual2');
 const networkBefore=pending.length;await evaluate('playSongObject({id:"local",title:"Local",fileUrl:"file:///C:/local.wav"})');assert.equal(pending.length,networkBefore);assert.equal(audio.src,'file:///C:/local.wav');
 // Search paints cooperatively; an older render cannot append rows to the newest query.
 window.echoAPI.search=async query=>Array.from({length:query==='obsolete'?90:30},(_,i)=>track(query+i));
 const oldSearch=evaluate('runSearch("song","obsolete")');await tick();
 const latestSearch=evaluate('runSearch("song","latest")');
 let searchDone=false;const bothSearches=Promise.all([oldSearch,latestSearch]).then(()=>searchDone=true);
 while(!searchDone)await new Promise(resolve=>require('node:timers').setTimeout(resolve,20));await bothSearches;
 assert.equal(window.document.querySelectorAll('#resultsList .song-row').length,30);
 assert.match(q('#resultsList').textContent,/latest29/);assert.doesNotMatch(q('#resultsList').textContent,/obsolete/);
 // Recommendation waiting cannot later override a newer explicit selection.
 evaluate(fs.readFileSync('src/v238-smart-autoplay.js','utf8'));evaluate('playQueue=[]');
 const recommendations=[{id:'radio1',title:'A completely different musical journey',channel:'A different artist',duration:'3:12'},{id:'radio2',title:'Another independent melody in the moonlight',channel:'Another voice',duration:'3:20'}];
 const warms=[];window.echoAPI.prefetchSong=async song=>{warms.push(song.id);return {success:true};};
 window.echoAPI.getSmartAutoplayCandidates=async()=>({items:recommendations,source:'youtube-radio'});
 const seed=track('seed');evaluate('setActiveContext(makeContext(['+JSON.stringify(seed)+'],"home"),'+JSON.stringify(seed)+')');await window.deepEchoSmartAutoplay.refresh();
 assert.ok(window.deepEchoSmartAutoplay.queued>0);assert.equal(evaluate('playQueue.length'),0);assert.equal(warms.length,1);const preview=window.deepEchoSmartAutoplay.upcoming(10);assert.ok(preview.length>0);preview[0].title='mutated';assert.notEqual(window.deepEchoSmartAutoplay.upcoming(10)[0].title,'mutated');
 from=pending.length;const autoplay=evaluate('playNext({auto:true})');await settle();assert.equal(pending.length,from+1);await settle();await finish(pending[from]);await autoplay;assert.equal(evaluate('playQueue.length'),0);
 // Explicit queue remains ahead of hidden recommendations.
 evaluate('playQueue=['+JSON.stringify(track('manual-last'))+']');from=pending.length;const queued=evaluate('playNext()');await tick();await settle();await finish(pending[from]);await queued;assert.equal(evaluate('currentSong.id'),'manual-last');
 let resolvePool;window.echoAPI.getSmartAutoplayCandidates=()=>new Promise(resolve=>{resolvePool=resolve;});
 evaluate('setActiveContext(makeContext(['+JSON.stringify(seed)+'],"home"),'+JSON.stringify(seed)+')');
 // A known local Next may now bypass discovery, so explicitly hold a radio refresh.
 const waiting=window.deepEchoSmartAutoplay.refresh();await tick();
 const explicit=evaluate('startSingleSong('+JSON.stringify(track('latest-choice'))+')');await settle();await finish(pending.at(-1));await explicit;
 resolvePool({items:recommendations,source:'youtube-radio'});await waiting;assert.equal(evaluate('currentSong.id'),'latest-choice');
 console.log('PASS playback UI: Home 10, Search 10, rapid A/B/C/D and Next 10 coalesced/latest only, Previous, manual queue order, local bypass, batched Search latest-query-only, hidden Smart Autoplay continuation, preview snapshot, explicit queue wins, stale recommendation cannot override click. Controlled IPC/audio; live network separate.');
})().catch(e=>{console.error(e);process.exitCode=1});


