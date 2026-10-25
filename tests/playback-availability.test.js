const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),vm=require('node:vm');
const {createPlaybackRelay}=require('../lib/playback-relay');
test('relay waits for source availability instead of provoking a premature 403',async t=>{
 let hits=0,earliest=0;const readyAt=Date.now()+160;
 const server=http.createServer((_req,res)=>{hits++;earliest=Date.now();res.writeHead(earliest<readyAt?403:200,{'Content-Type':'audio/mpeg'});res.end('audio')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const relay=createPlaybackRelay({allowUrl:()=>true});t.after(()=>{relay.close();server.closeAllConnections();server.close()});
 const url=await relay.register({url:`http://127.0.0.1:${server.address().port}/audio`,availableAt:readyAt});
 await new Promise((resolve,reject)=>http.get(url,res=>{assert.equal(res.statusCode,200);res.resume();res.on('end',resolve)}).on('error',reject));
 assert.equal(hits,1);assert.ok(earliest>=readyAt);assert.equal(relay.failure(url),null);
});
test('superseding a source during its availability wait prevents the upstream request',async t=>{
 let hits=0,notifyWait;const waiting=new Promise(r=>notifyWait=r);
 const server=http.createServer((_req,res)=>{hits++;res.end('audio')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const relay=createPlaybackRelay({allowUrl:()=>true,log:stage=>{if(stage==='source-wait')notifyWait()}});t.after(()=>{relay.close();server.closeAllConnections();server.close()});
 const url=await relay.register({url:`http://127.0.0.1:${server.address().port}/audio`,availableAt:Date.now()+250});
 const closed=new Promise(resolve=>http.get(url,res=>res.resume()).on('error',()=>resolve()));await waiting;relay.supersede();await closed;
 await new Promise(r=>setTimeout(r,300));assert.equal(hits,0);assert.equal(relay.failure(url),null);
});
test('visionOS is an explicit opt-in client and legacy/default argument handling stays intact',()=>{
 const source=fs.readFileSync('lib/ytdlp-smart.js','utf8'),c={};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function clientAttemptArgs('),source.indexOf('const searchResultsCache =')),c);
 assert.deepEqual(Array.from(c.clientAttemptArgs('visionos')),['--extractor-args','youtube:player_client=visionos;player_skip=configs']);
 assert.deepEqual(Array.from(c.clientAttemptArgs('default')),[]);assert.deepEqual(Array.from(c.clientAttemptArgs('android_vr')),['--extractor-args','youtube:player_client=android_vr']);
});

test('playback resolver preserves origin availability and headers with the original fallback chain',async()=>{
 const source=fs.readFileSync('main.js','utf8');let media,options;
 const c={Map,Date,URL,AbortController,fs:{existsSync:()=>true},PLAYBACK_PLUGIN_DIR:'plugins',YTDLP_PATH:'fixture',readYouTubeAccess:()=>({}),playbackLog(){},streamExpiry:()=>Date.now()+60000,
  playbackRelay:{register:async value=>{media=value;return 'http://127.0.0.1:1234/audio/fixture'}},
  runYtDlpSmart:async(_exe,_args,o)=>{options=o;return {stdout:JSON.stringify({url:'https://fixture/audio',available_at:2000000000,http_headers:{'User-Agent':'fixture'},protocol:'https'})}}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('const streamUrlCache ='),source.indexOf('async function prepareClassicPlaybackFile')),c);
 assert.equal(await c.resolveStreamUrl({id:'fixture',url:'fixture'}),'http://127.0.0.1:1234/audio/fixture');
 assert.equal(media.availableAt,2000000000000);assert.equal(media.headers['User-Agent'],'fixture');
 assert.deepEqual(Array.from(options.clientOrder),['visionos','default','web_embedded','android_vr']);assert.equal(options.affectsGlobalBackoff,false);
});
