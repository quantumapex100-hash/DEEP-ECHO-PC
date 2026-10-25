const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/v200.js'),'utf8');
function harness(src='https://audio.example/song'){
 let clock=0,next=0;const timers=new Map(),listeners={},retries=[];
 const audioPlayer={src,currentSrc:src,currentTime:0,paused:false,ended:false,seeking:false,readyState:2,addEventListener(e,f){(listeners[e]??=[]).push(f)}};
 const c={audioPlayer,settings:{recovery:true,offline:false},recovering:false,currentSong:{id:'a'},queueSong:s=>s,notify(){},resumeSong:async(...a)=>retries.push(a),setTimeout(f,ms){timers.set(++next,{f,at:clock+ms});return next},clearTimeout:i=>timers.delete(i)};
 vm.runInNewContext(source.slice(source.indexOf('// Recovery watches'),source.indexOf('// Shared sleep timer')),c);
 return {c,audioPlayer,retries,emit:e=>(listeners[e]||[]).forEach(f=>f()),advance(ms){clock+=ms;for(const [id,t]of [...timers])if(t.at<=clock){timers.delete(id);t.f()}},timers};
}
test('normal 250ms timeupdate progress cancels false recovery',()=>{const h=harness();h.emit('waiting');for(let i=0;i<40;i++){h.audioPlayer.currentTime+=.25;h.emit('timeupdate');h.advance(250)}assert.equal(h.retries.length,0)});
test('downloaded and compatibility files never use network recovery',()=>{for(const src of ['file:///C:/Music/song.mp3','blob:local']){const h=harness(src);h.emit('waiting');h.emit('stalled');h.advance(9000);assert.equal(h.retries.length,0)}});
test('a genuine stopped remote buffer retries at current position and preserves queue',()=>{const h=harness();h.audioPlayer.currentTime=36;h.emit('waiting');h.advance(8000);assert.equal(h.retries.length,1);assert.equal(h.retries[0][1],36);assert.equal(h.retries[0][3],true)});
test('buffered playing stream never restarts after stalled',()=>{const h=harness();h.emit('stalled');h.audioPlayer.readyState=4;h.advance(8000);assert.equal(h.retries.length,0)});
test('pause, playing, seek, end, source changes cancel pending recovery',()=>{for(const e of ['pause','playing','seeking','ended','emptied','loadstart']){const h=harness();h.emit('waiting');h.emit(e);h.advance(8000);assert.equal(h.retries.length,0,e)}});
test('stale timer cannot reload a newly selected song or source',()=>{const h=harness();h.emit('waiting');h.c.currentSong={id:'b'};h.advance(8000);assert.equal(h.retries.length,0);const j=harness();j.emit('waiting');j.audioPlayer.currentSrc='https://audio.example/b';j.advance(8000);assert.equal(j.retries.length,0)});
test('repeated waiting events do not postpone recovery forever; retries capped',()=>{const h=harness();for(let i=0;i<3;i++){h.emit('waiting');h.advance(4000);h.emit('waiting');h.advance(4000)}assert.equal(h.retries.length,2)});

test('startup and compatible preparation cannot be interrupted by the older stall watchdog',()=>{
 for(const busy of ['loadingRequest','playbackRecoveryPromise','remoteMediaRecoveryInFlight']){
   const h=harness();h.c[busy]=true;h.emit('waiting');h.advance(9000);assert.equal(h.retries.length,0,busy);
   h.c[busy]=false;h.emit('waiting');h.advance(8000);assert.equal(h.retries.length,1,'ordinary playback recovery remains available');
 }
});
test('watchdog scheduled earlier yields when compatibility recovery takes ownership',()=>{
 const h=harness();h.emit('waiting');h.c.playbackRecoveryPromise=Promise.resolve();h.advance(9000);assert.equal(h.retries.length,0);
});
