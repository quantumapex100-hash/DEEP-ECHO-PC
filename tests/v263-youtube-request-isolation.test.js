const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');

const main=fs.readFileSync('main.js','utf8');
const renderer=fs.readFileSync('src/renderer.js','utf8');
const smart=fs.readFileSync('lib/ytdlp-smart.js','utf8');
const captions=fs.readFileSync('lib/youtube-captions.js','utf8');
function sha(path){return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');}

test('Search lyric capability checks cannot poison global YouTube playback backoff',()=>{
  assert.match(smart,/const ytDlpRequestContext = new AsyncLocalStorage\(\)/);
  assert.match(smart,/shouldAffectGlobalBackoff/);
  assert.match(smart,/botSeen && shouldAffectGlobalBackoff/);
  assert.match(main,/runWithYtDlpContext\(\{affectsGlobalBackoff:false,requestClass:'lyrics-capability'\}/);
  assert.ok(captions.length > 1000);
});

test('actual playback aborts speculative lyric support jobs first',()=>{
  assert.match(main,/const lyricsSupportControllers = new Map\(\)/);
  assert.match(main,/function cancelLyricsSupportChecks\(\)/);
  assert.match(main,/ipcMain\.handle\('stream-song'[\s\S]{0,500}cancelLyricsSupportChecks\(\)/);
  assert.match(main,/signal:controller\.signal/);
  assert.match(main,/reason:'cancelled'/);
});

test('Search lyric verification is bounded to two workers and eight candidates',()=>{
  assert.match(renderer,/\.slice\(0, 8\)/);
  assert.match(renderer,/const workerCount = Math\.min\(2, Math\.max\(1, queue\.length\)\)/);
});

test('accepted lyrics alignment engines remain byte-identical',()=>{
  assert.equal(sha('lib/lyrics-reference.js'),'56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4');
  assert.equal(sha('lib/exact-lyrics.js'),'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4');
});
