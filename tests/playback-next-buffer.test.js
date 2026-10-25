const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('src/renderer.js','utf8');
function fixture(){
  const calls=[],warms=[];
  const context={window:{echoAPI:{prefetchSong:async song=>{calls.push(song);return {success:true,streamUrl:'http://127.0.0.1/audio/'+song.id};}}},
    audioPlayer:{duration:180,currentTime:0,paused:false,ended:false},Date,playRequest:1,setTimeout,loadingRequest:0,smartPreparedStreamUrls:new Map(),prefetchSerial:0,
    normalizeSong:x=>x,smartUpcomingSongs:limit=>{assert.ok(limit===1||limit===10);return [{id:'next'}];},smartWarmPreparedUrl:url=>warms.push(url),smartWarmLookaheadUrl:url=>warms.push(url)};
  vm.createContext(context);vm.runInContext(source.slice(source.indexOf('prefetchNextQueued = async function('),source.indexOf('const v140PlayRemoteSongBase')),context);
  return {context,calls,warms};
}
test('Next buffers one track without depending on Gapless and reuses a prepared source',async()=>{
  const {context,calls,warms}=fixture();await context.prefetchNextQueued();assert.equal(calls.length,1);assert.equal(calls[0].prefetchPriority,'next');assert.equal(warms.length,1);
  await context.prefetchNextQueued();assert.equal(calls.length,1);assert.equal(warms.length,2);
});
test('Next warming never competes with a pending click and stays limited in game mode',async()=>{
  const {context,calls}=fixture();context.loadingRequest=1;await context.prefetchNextQueued();assert.equal(calls.length,0);
  context.loadingRequest=0;context.window.__deepecchoGameMode=true;await context.prefetchNextQueued();assert.equal(calls.length,0);
  context.audioPlayer.currentTime=160;await context.prefetchNextQueued();assert.equal(calls.length,1);
});

test('only the confirmed audible owner can warm Next before its remaining setup finishes',async()=>{
  const {context,calls}=fixture();context.loadingRequest={requestId:1,id:'current'};context.currentSong={id:'current'};
  await context.prefetchNextQueued();assert.equal(calls.length,0,'unconfirmed startup stays protected');
  await context.prefetchNextQueued({audibleRequestId:2});assert.equal(calls.length,0,'other selections cannot bypass startup priority');
  await context.prefetchNextQueued({audibleRequestId:1});assert.equal(calls.length,1);
});

test('early audible warmup cannot publish after another search result takes ownership',async()=>{
  const {context,calls,warms}=fixture();let finish;
  context.loadingRequest={requestId:1,id:'current'};context.currentSong={id:'current'};
  context.window.echoAPI.prefetchSong=song=>{calls.push(song);return new Promise(resolve=>finish=resolve)};
  const pending=context.prefetchNextQueued({audibleRequestId:1});
  context.playRequest=2;context.loadingRequest={requestId:2,id:'new-search'};
  finish({success:true,streamUrl:'http://127.0.0.1/audio/stale'});await pending;
  assert.equal(context.smartPreparedStreamUrls.size,0);assert.equal(warms.length,0);
});
test('buffering remains muted and never calls play on the speculative player',()=>{
  const buffers=[];const context={window:{},Map,configurePlaybackOrigin(){},Audio:class{constructor(){buffers.push(this)}load(){}pause(){}removeAttribute(){}}};vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('let smartWarmupAudio ='),source.indexOf('function smartUpcomingSongs')),context);
  context.smartWarmPreparedUrl('http://127.0.0.1/audio/next');assert.equal(buffers[0].muted,true);assert.equal(buffers[0].volume,0);
  context.smartWarmPreparedUrl('http://127.0.0.1/audio/next');assert.equal(buffers.length,1);
});
test('ten upcoming URLs prepare serially; only the nearest three warm audio bytes',async()=>{
  const {context,calls,warms}=fixture();let active=0,maximum=0;
  context.setTimeout=fn=>fn();context.smartUpcomingSongs=()=>Array.from({length:10},(_,i)=>({id:'next'+i}));
  context.window.echoAPI.prefetchSong=async song=>{active++;maximum=Math.max(maximum,active);calls.push(song);await Promise.resolve();active--;return {success:true,streamUrl:'http://127.0.0.1/audio/'+song.id};};
  await context.prefetchNextQueued();assert.equal(calls.length,10);assert.equal(maximum,1);assert.equal(warms.length,3);
  assert.equal(calls[0].prefetchPriority,'next');assert.ok(calls.slice(1).every(song=>song.prefetchPriority==='idle'));
  await context.prefetchNextQueued();assert.equal(calls.length,10,'valid sources reused');
});
test('a new click interrupts old lookahead without caching its result or launching more extraction',async()=>{
  const {context,calls}=fixture();context.smartUpcomingSongs=()=>[{id:'one'},{id:'two'}];let finish;
  context.window.echoAPI.prefetchSong=song=>{calls.push(song);return new Promise(resolve=>finish=resolve);};
  const pending=context.prefetchNextQueued();context.playRequest++;
  finish({success:true,streamUrl:'http://127.0.0.1/audio/old'});await pending;
  assert.equal(calls.length,1);assert.equal(context.smartPreparedStreamUrls.size,0);
});
test('extra byte warmers are muted, bounded to two, and disabled in game mode',()=>{
  const buffers=[];const context={window:{},Map,configurePlaybackOrigin(){},Audio:class{constructor(){buffers.push(this)}load(){}pause(){}removeAttribute(){this.released=true;}}};vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('let smartWarmupAudio ='),source.indexOf('function smartUpcomingSongs')),context);
  for(let i=0;i<4;i++)context.smartWarmLookaheadUrl('http://127.0.0.1/audio/'+i);
  assert.equal(vm.runInContext('smartLookaheadAudio.size',context),2);assert.ok(buffers.every(media=>media.muted&&media.volume===0));assert.equal(buffers[0].released,true);
  context.window.__deepecchoGameMode=true;context.smartWarmLookaheadUrl('http://127.0.0.1/audio/game');assert.equal(buffers.length,4);
});
test('lookahead follows taste recommendations and manual queues keep priority',()=>{
  const context={playQueue:[],currentSong:{id:'seed'},activeContext:{items:[{id:'seed'},{id:'unrelated-search-row'}],index:0},window:{deepEchoSmartAutoplay:{active:true,upcoming:()=>[{id:'taste-one'},{id:'taste-two'}]}},wrapContextIndex:index=>index%2};vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function smartUpcomingSongs('),source.indexOf('prefetchNextQueued = async function(')),context);
  assert.deepEqual(Array.from(context.smartUpcomingSongs(10),song=>song.id),['taste-one','taste-two']);
  context.playQueue=[{id:'manual-one'},{id:'manual-two'}];assert.deepEqual(Array.from(context.smartUpcomingSongs(2),song=>song.id),['manual-one','manual-two']);
});

test('prefetch finishing after pause, end or quality change cannot cache or buffer the old source',async()=>{
  for(const change of [c=>c.audioPlayer.paused=true,c=>c.audioPlayer.ended=true,c=>c.window.__dinechoAudioQuality='high']){
    const {context,warms}=fixture();let finish;
    context.window.echoAPI.prefetchSong=()=>new Promise(resolve=>finish=resolve);
    const pending=context.prefetchNextQueued();change(context);
    finish({success:true,streamUrl:'http://127.0.0.1/audio/stale'});await pending;
    assert.equal(context.smartPreparedStreamUrls.size,0);assert.equal(warms.length,0);
  }
});

test('new selection releases every speculative media buffer without playing any',()=>{
  const buffers=[];const context={window:{},Map,configurePlaybackOrigin(){},Audio:class{constructor(){buffers.push(this)}load(){}pause(){this.paused=true}removeAttribute(){this.released=true}}};vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('let smartWarmupAudio ='),source.indexOf('function smartUpcomingSongs')),context);
  context.smartWarmPreparedUrl('http://127.0.0.1/audio/first');
  context.smartWarmLookaheadUrl('http://127.0.0.1/audio/second');
  context.smartWarmLookaheadUrl('http://127.0.0.1/audio/third');
  context.smartReleasePlaybackWarmers();
  assert.equal(buffers.length,3);assert.ok(buffers.every(b=>b.released&&b.paused));
  assert.equal(vm.runInContext('smartLookaheadAudio.size',context),0);
  assert.equal(vm.runInContext('smartWarmupAudio',context),null);
  context.smartReleasePlaybackWarmers();
});

test('selected prepared source keeps buffering while unrelated warmers are released',()=>{
  const buffers=[];const context={window:{},Map,configurePlaybackOrigin(){},Audio:class{constructor(){buffers.push(this)}load(){}pause(){}removeAttribute(){this.released=true}}};vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('let smartWarmupAudio ='),source.indexOf('function smartUpcomingSongs')),context);
  context.smartWarmPreparedUrl('http://127.0.0.1/audio/first');
  context.smartWarmLookaheadUrl('http://127.0.0.1/audio/selected');
  context.smartWarmLookaheadUrl('http://127.0.0.1/audio/third');
  context.smartReleasePlaybackWarmers('http://127.0.0.1/audio/selected');
  assert.equal(buffers[0].released,true);assert.equal(buffers[1].released,undefined);assert.equal(buffers[2].released,true);
  assert.equal(vm.runInContext('smartLookaheadAudio.size',context),1);
  context.smartReleasePlaybackWarmers();assert.equal(buffers[1].released,true);
});

