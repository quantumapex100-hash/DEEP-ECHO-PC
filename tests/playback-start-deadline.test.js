const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('src/renderer.js','utf8');
const helper=source.slice(source.indexOf('async function waitForPlaybackStart('),source.indexOf('async function playLocal('));
function context(){let pauses=0;const audioPlayer={play:()=>new Promise(()=>{}),pause:()=>pauses++};const c={audioPlayer,playRequest:1,Promise,setTimeout,clearTimeout,Error};vm.createContext(c);vm.runInContext(helper,c);return {c,pauses:()=>pauses};}
test('stalled media play promise exits instead of leaving Preparing audio indefinitely',async()=>{const h=context();await assert.rejects(h.c.waitForPlaybackStart(1,15),/Audio server/);assert.equal(h.pauses(),1);});
test('stale media timeout cannot pause a newer song',async()=>{const h=context();h.c.playRequest=2;await assert.rejects(h.c.waitForPlaybackStart(1,15),e=>e.name==='AbortError');assert.equal(h.pauses(),0);});
test('ready media starts immediately without waiting for the deadline',async()=>{const h=context();h.c.audioPlayer.play=async()=>true;assert.equal(await h.c.waitForPlaybackStart(1,1000),true);assert.equal(h.pauses(),0);});
