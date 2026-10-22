const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/renderer.js','utf8');
const helper=source.slice(source.indexOf('async function prepareCompatiblePlaybackWithDeadline('),source.indexOf('async function recoverCompatiblePlayback('));
test('hung compatibility IPC exits with an actionable error instead of a permanent spinner',async()=>{
 const c={window:{echoAPI:{prepareCompatiblePlayback:()=>new Promise(()=>{})}},setTimeout,clearTimeout,Promise,Error};vm.createContext(c);vm.runInContext(helper,c);
 await assert.rejects(c.prepareCompatiblePlaybackWithDeadline({id:'song'},1,15),error=>error.code==='COMPATIBLE_AUDIO_TIMEOUT');
});
test('compatibility deadline passes selection ownership and clears its timer after success',async()=>{
 let args,cleared=0;const c={window:{echoAPI:{prepareCompatiblePlayback:async song=>{args=song;return {success:true,fileUrl:'file:///ready.m4a'}}}},setTimeout:()=>9,clearTimeout:id=>{assert.equal(id,9);cleared++},Promise,Error};vm.createContext(c);vm.runInContext(helper,c);
 const result=await c.prepareCompatiblePlaybackWithDeadline({id:'song',forceClassicPlayback:true},7);
 assert.equal(result.success,true);assert.equal(args.requestId,7);assert.equal(args.forceClassicPlayback,true);assert.equal(cleared,1);
});
