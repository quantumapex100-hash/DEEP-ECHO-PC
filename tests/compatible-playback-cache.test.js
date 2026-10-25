const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync('main.js','utf8');
const helper=source.slice(source.indexOf('async function materializeClassicPlaybackFile('),source.indexOf("ipcMain.handle('stream-song'"));
function harness({expired=false,failed=false,copyError=null}={}){
 let extracted=false,copies=0;const c={fs:{existsSync:()=>true,mkdirSync(){},statSync(){},unlinkSync(){}},YTDLP_PATH:'extractor',cacheDir:'cache',PLAYBACK_PLUGIN_DIR:'plugins',path,pathToFileURL:require('node:url').pathToFileURL,Date,Error,Number,String,AbortController,setTimeout,clearTimeout,
 finishedFiles:()=>extracted?['stream-song.m4a']:[],streamJobKey:s=>s.id+':auto',streamUrlCache:new Map([['song:auto',{url:'http://127.0.0.1:1234/audio/token',expiresAt:expired?0:Date.now()+60000}]]),playbackRelay:{failure:()=>failed},isAbort:e=>e.name==='AbortError',readYouTubeAccess:()=>({}),
 downloadDirectAudio:async(_url,_template,progress,{signal})=>{copies++;if(copyError)throw copyError;assert.equal(signal.aborted,false);progress({percent:50});return 'cache/stream-song.m4a'},runYtDlpSmart:async()=>{extracted=true}};
 vm.createContext(c);vm.runInContext(helper,c);return {c,copies:()=>copies,extracted:()=>extracted};
}
test('compatible local playback reuses a healthy resolved relay without another extraction',async()=>{
 const h=harness(),progress=[];const result=await h.c.materializeClassicPlaybackFile({id:'song',url:'https://www.youtube.com/watch?v=song'},p=>progress.push(p),new AbortController().signal);
 assert.equal(h.copies(),1);assert.equal(h.extracted(),false);assert.match(result.fileUrl,/stream-song.m4a$/);assert.equal(progress.at(-1).status,'Preparing local audio');
});
test('expired, failed or failed-copy relays retain the classic extractor fallback',async()=>{
 for(const options of [{expired:true},{failed:true},{copyError:new Error('Origin failed')}]){
   const h=harness(options);const result=await h.c.materializeClassicPlaybackFile({id:'song',url:'https://www.youtube.com/watch?v=song'},()=>{},new AbortController().signal);assert.equal(h.extracted(),true);assert.ok(result.fileUrl);
 }
});
test('cancellation during relay copy never starts another extraction',async()=>{
 const error=Object.assign(new Error('Cancelled'),{name:'AbortError'}),h=harness({copyError:error});await assert.rejects(h.c.materializeClassicPlaybackFile({id:'song',url:'https://www.youtube.com/watch?v=song'},()=>{},new AbortController().signal),/Cancelled/);assert.equal(h.extracted(),false);
});
test('a stalled relay copy yields to extraction when its short deadline expires',async()=>{
 const h=harness();h.c.setTimeout=fn=>setImmediate(fn);h.c.clearTimeout=clearImmediate;
 h.c.downloadDirectAudio=(_url,_template,_progress,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('Cancelled')),{once:true}));
 const result=await h.c.materializeClassicPlaybackFile({id:'song',url:'https://www.youtube.com/watch?v=song'},()=>{},new AbortController().signal);
 assert.equal(h.extracted(),true);assert.ok(result.fileUrl);
});
