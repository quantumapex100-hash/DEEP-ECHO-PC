const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const themes=[...read('src/index.html').matchAll(/data-theme-choice="([^"]+)"/g)].map(m=>m[1]);
const controller=read('src/v273-red-nebula-performance.js');

test('Sync control leaves blurred player and restores follow without seeking in every selectable theme',()=>{
  const code=controller.slice(controller.indexOf('  const syncButton ='),controller.indexOf('  // ---------- Manual Next intent'));
  for(const theme of themes){
    const listeners={},button={style:{},addEventListener:(name,fn)=>{listeners[name]=fn;}};
    let mounted=false,follow=false,paint=0,mediaTime=52,resize;
    const ctx={document:{body:{dataset:{theme},appendChild:b=>{assert.equal(b,button);mounted=true;}},
      getElementById:()=>button,querySelector:()=>({getBoundingClientRect:()=>({left:220,width:880,top:650})})},
      window:{addEventListener:(_,fn)=>{resize=fn;}},requestAnimationFrame:fn=>fn(),
      setLyricsAutoFollow:v=>{follow=v;},activeLyric:4,syncLyrics:forced=>{assert.equal(forced,true);paint++;}};
    vm.runInNewContext(code,ctx);
    assert.ok(mounted,theme);assert.equal(button.style.top,'606px');assert.equal(button.style.left,'660px');
    listeners.click({preventDefault(){},stopImmediatePropagation(){}});
    assert.ok(follow,theme);assert.equal(ctx.activeLyric,-2);assert.equal(paint,2);assert.equal(mediaTime,52);
    follow=false;listeners.keydown({key:'Enter',preventDefault(){},stopImmediatePropagation(){}});assert.ok(follow);
    resize();assert.equal(button.style.top,'606px');
  }
});

test('first search result prebuffers immediately; later results do not replace it unless user shows intent',async()=>{
  const source=read('src/renderer.js');
  const code=source.slice(source.indexOf('async function pumpSearchInstantWarm()'),source.indexOf('function beginSearchInstantWarm('));
  const warmed=[],cache=new Map();
  const entry=(id,priority)=>({song:{id},priority,serial:1,request:1});
  const ctx={playRequest:1,loadingRequest:null,searchInstantWarmRunning:false,searchInstantWarmQueue:[entry('first','search'),entry('second','search'),entry('third','search')],
    searchInstantWarmSerial:1,searchRequest:1,searchInstantBufferedSerial:-1,smartPreparedStreamUrls:cache,
    window:{echoAPI:{prefetchSong:async song=>({success:true,streamUrl:'https://audio/'+song.id})}},
    normalizeSong:s=>s,smartWarmPreparedUrl:url=>warmed.push(url),setTimeout:fn=>fn(),Date};
  vm.createContext(ctx);vm.runInContext(code,ctx);await ctx.pumpSearchInstantWarm();
  assert.deepEqual(warmed,['https://audio/first']);assert.equal(cache.size,3);
  ctx.searchInstantWarmQueue.push(entry('hovered','intent'));await ctx.pumpSearchInstantWarm();
  assert.deepEqual(warmed,['https://audio/first','https://audio/hovered']);
});

test('stale stream resolves cannot warm audio or overwrite prepared URLs',async()=>{
  const source=read('src/renderer.js'),warmed=[];
  const ctx={playRequest:1,loadingRequest:null,searchInstantWarmRunning:false,searchInstantWarmQueue:[{song:{id:'old'},priority:'search',serial:1,request:1}],
    searchInstantWarmSerial:1,searchRequest:1,searchInstantBufferedSerial:-1,smartPreparedStreamUrls:new Map(),
    window:{echoAPI:{prefetchSong:async()=>{ctx.searchRequest=2;return {success:true,streamUrl:'old'};}}},
    normalizeSong:s=>s,smartWarmPreparedUrl:url=>warmed.push(url),setTimeout:fn=>fn(),Date};
  vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function pumpSearchInstantWarm()'),source.indexOf('function beginSearchInstantWarm(')),ctx);
  await ctx.pumpSearchInstantWarm();assert.equal(warmed.length,0);assert.equal(ctx.smartPreparedStreamUrls.size,0);
});

test('hovering a cached result prebuffers its URL without another resolver request',()=>{
  const source=read('src/renderer.js'),warmed=[];
  const ctx={window:{echoAPI:{prefetchSong(){throw new Error('cached hover must not resolve again');}}},
    searchWarmCandidate:()=>true,searchRequest:1,
    smartPreparedStreamUrls:new Map([['ready',{url:'https://audio/ready',createdAt:Date.now()}]]),
    smartWarmPreparedUrl:url=>warmed.push(url),Date};
  vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function enqueueSearchInstantWarm('),source.indexOf('function warmVisibleCards(')),ctx);
  ctx.enqueueSearchInstantWarm({id:'ready'},1,true,'intent');assert.deepEqual(warmed,['https://audio/ready']);
  ctx.loadingRequest={id:'selected'};
  ctx.enqueueSearchInstantWarm({id:'ready'},1,true,'intent');assert.equal(warmed.length,1,'cached hover cannot compete with selected playback');
});

test('repeated hover does not reset the same audio prebuffer',()=>{
  const source=read('src/renderer.js');let created=0,loads=0;
  const ctx={configurePlaybackOrigin:()=>{},Audio:function(){created++;this.load=()=>{loads++;};this.pause=()=>{};this.removeAttribute=()=>{};}};
  vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('let smartWarmupAudio ='),source.indexOf('function smartUpcomingSongs(')),ctx);
  ctx.smartWarmPreparedUrl('https://audio/ready');ctx.smartWarmPreparedUrl('https://audio/ready');
  assert.equal(created,1);assert.equal(loads,1);
});

test('Search warmup finishing after new playback or quality selection cannot cache or buffer stale audio',async()=>{
  for(const change of [c=>c.playRequest++,c=>c.loadingRequest={requestId:1},c=>c.window.__dinechoAudioQuality='high']){
    const source=read('src/renderer.js'),warmed=[];let finish;
    const ctx={playRequest:1,loadingRequest:null,searchInstantWarmRunning:false,searchInstantWarmQueue:[{song:{id:'old'},priority:'search',serial:1,request:1}],
      searchInstantWarmSerial:1,searchRequest:1,searchInstantBufferedSerial:-1,smartPreparedStreamUrls:new Map(),
      window:{echoAPI:{prefetchSong:()=>new Promise(resolve=>finish=resolve)}},
      normalizeSong:s=>s,smartWarmPreparedUrl:url=>warmed.push(url),setTimeout:fn=>fn(),Date};
    vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function pumpSearchInstantWarm()'),source.indexOf('function beginSearchInstantWarm(')),ctx);
    const pending=ctx.pumpSearchInstantWarm();change(ctx);finish({success:true,streamUrl:'old'});await pending;
    assert.equal(warmed.length,0);assert.equal(ctx.smartPreparedStreamUrls.size,0);
  }
});
