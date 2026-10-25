const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {findPreparedPlayback}=require('../lib/prepared-playback-cache');
test('prepared playback finds only complete nonempty files for the requested identity',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'deepecho-prepared-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.writeFileSync(path.join(dir,'stream-song.m4a.part'),'partial');fs.writeFileSync(path.join(dir,'stream-song.webm'),'');fs.writeFileSync(path.join(dir,'stream-other.m4a'),'other');
 assert.equal(findPreparedPlayback(dir,'song'),null);
 fs.writeFileSync(path.join(dir,'stream-song.m4a'),'complete');
 assert.match(findPreparedPlayback(dir,'song').fileUrl,/stream-song.m4a$/);
 assert.equal(findPreparedPlayback(dir,'../song'),null);
});
test('expired or absent prepared files cannot bypass fresh resolution',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'deepecho-prepared-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'stream-song.m4a');fs.writeFileSync(file,'audio');
 const old=new Date(Date.now()-13*60*60*1000);fs.utimesSync(file,old,old);
 assert.equal(findPreparedPlayback(dir,'song'),null);assert.equal(findPreparedPlayback(path.join(dir,'absent'),'song'),null);
});
test('real stream IPC reuses prepared audio before starting another resolver',async()=>{
 const vm=require('node:vm'),source=fs.readFileSync('main.js','utf8'),handlers=new Map();let probes=0;
 const c={ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},cancelLyricsSupportChecks(){},streamJobKey:()=> 'song:auto',cancelStreamJobsExcept(){},playbackRelay:{supersede(){}},streamUrlCache:new Map(),classicJobs:new Map(),readLibrary:()=>[],fs:{existsSync:()=>true},findPreparedPlayback:()=>({filepath:'cache/song.m4a',fileUrl:'file:///cache/song.m4a'}),cacheDir:'cache',sendProgress(){},playbackLog(){},resolveStreamUrl:()=>{probes++;throw Error('must not resolve again')}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf("ipcMain.handle('stream-song'"),source.indexOf('const immersiveVideoCache =')),c);
 const result=await handlers.get('stream-song')({},{id:'song',title:'Song'},2,'auto');assert.equal(result.success,true);assert.equal(result.song.fileUrl,'file:///cache/song.m4a');assert.equal(result.song.streamUrl,'');assert.equal(probes,0);
 let finish;c.classicJobs.set('song',{controller:new AbortController(),promise:new Promise(resolve=>finish=resolve)});
 const pending=handlers.get('stream-song')({},{id:'song',title:'Song'},3,'auto');finish({filepath:'cache/new.m4a',fileUrl:'file:///cache/new.m4a'});
 assert.equal((await pending).song.fileUrl,'file:///cache/new.m4a');assert.equal(probes,0,'a click during warmup joins the existing preparation instead of resolving again');
});
