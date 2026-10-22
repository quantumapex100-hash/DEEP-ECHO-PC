const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const {expiry}=require('../lib/playback-relay');
test('relay enables the existing analyser CORS path and clears it for local/offline playback',()=>{
  const source=fs.readFileSync('src/renderer.js','utf8');
  const audioPlayer={crossOrigin:null,removeAttribute(name){assert.equal(name,'crossorigin');this.crossOrigin=null;}};
  const context={audioPlayer};vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function configurePlaybackOrigin('),source.indexOf('async function playLocal(')),context);
  context.configurePlaybackOrigin('http://127.0.0.1:1234/audio/ticket');assert.equal(audioPlayer.crossOrigin,'anonymous');
  context.configurePlaybackOrigin('file:///C:/offline.m4a');assert.equal(audioPlayer.crossOrigin,null);
});
test('existing resolver shares and promotes warmup, reuses history cache, cancels stale A/B for C, and refreshes expired URLs',async()=>{
  const source=fs.readFileSync('main.js','utf8'),calls=[];
  const context={Map,Date,URL,AbortController,streamExpiry:expiry,fs:{existsSync:()=>true},PLAYBACK_PLUGIN_DIR:'fixture-plugins',YTDLP_PATH:'fixture',readYouTubeAccess:()=>({}),playbackLog(){},playbackRelay:{register:async media=>media.url},
    runYtDlpSmart:(exe,args,options)=>new Promise((resolve,reject)=>{const call={args,options,resolve:()=>resolve({stdout:JSON.stringify({url:'https://media/'+args.at(-1),http_headers:{'User-Agent':'fixture'},protocol:'https'})})};calls.push(call);options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})));})};
  vm.createContext(context);vm.runInContext(source.slice(source.indexOf('const streamUrlCache ='),source.indexOf('async function prepareClassicPlaybackFile')),context);
  const song=id=>({id,url:id});
  const warm=context.resolveStreamUrl(song('A'),'auto',{kind:'prefetch'}),play=context.resolveStreamUrl(song('A'),'auto',{kind:'playback'});
  assert.equal(calls.length,1);assert.equal(vm.runInContext("streamJobs.get('A:auto').kind",context),'playback');calls[0].resolve();assert.equal(await warm,await play);
  await context.resolveStreamUrl(song('A'));assert.equal(calls.length,1,'Previous reuses valid source');
  const b=context.resolveStreamUrl(song('B')),c=context.resolveStreamUrl(song('C'));context.cancelStreamJobsExcept('C:auto');calls[2].resolve();await assert.rejects(b,/aborted/);await c;
  const fresh=context.resolveStreamUrl(song('A'),'auto',{force:true});assert.equal(calls.length,4);calls[3].resolve();await fresh;
  vm.runInContext("streamUrlCache.get('A:auto').expiresAt=0",context);const expired=context.resolveStreamUrl(song('A'));calls[4].resolve();await expired;assert.equal(calls.length,5);
});
test('aborted same-song work is never reused after A → B → A',async()=>{
  const source=fs.readFileSync('main.js','utf8'),calls=[];
  const context={Map,Date,URL,AbortController,streamExpiry:expiry,fs:{existsSync:()=>true},PLAYBACK_PLUGIN_DIR:'fixture-plugins',YTDLP_PATH:'fixture',readYouTubeAccess:()=>({}),playbackLog(){},playbackRelay:{register:async media=>media.url},runYtDlpSmart:(exe,args,o)=>new Promise((resolve,reject)=>{calls.push({resolve:()=>resolve({stdout:JSON.stringify({url:'https://media/A'})})});o.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})));})};
  vm.createContext(context);vm.runInContext(source.slice(source.indexOf('const streamUrlCache ='),source.indexOf('async function prepareClassicPlaybackFile')),context);
  const first=context.resolveStreamUrl({id:'A',url:'A'});context.cancelStreamJobsExcept('B:auto');const again=context.resolveStreamUrl({id:'A',url:'A'});assert.equal(calls.length,2);calls[1].resolve();await assert.rejects(first);await again;
});


