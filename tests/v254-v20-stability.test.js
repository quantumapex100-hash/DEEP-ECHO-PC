const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {scriptProfile}=require('../lib/lyrics');

const read=p=>fs.readFileSync(p,'utf8');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

test('V20 language guard recognizes Han alongside Hangul/Kana without changing romanization defaults',()=>{
  const zh=scriptProfile('We were just two lovers 习惯了下课 你我唱着歌');
  assert.ok(zh.hanRatio>0.20);
  const ko=scriptProfile('hello 사랑해');
  assert.ok(ko.hangulRatio>0);
  const ja=scriptProfile('hello あいしてる');
  assert.ok(ja.kanaRatio>0);
  const main=read('main.js');
  assert.match(main,/profile\.hanRatio > \.28/);
  assert.match(main,/profile\.hangulRatio > \.28/);
  assert.match(main,/profile\.kanaRatio > \.28/);
  assert.match(main,/suspiciousUnvalidatedProviderMix/);
  assert.match(main,/lyrics-cache-v12\.json/);
});

test('V20 Source Inspector and Translation reject stale async results after the song changes',()=>{
  const suite=read('src/v253-pro-suite.js');
  assert.match(suite,/sourceLoadSerial/);
  assert.match(suite,/requestedSongKey=songKey\(song\)/);
  assert.match(suite,/serial!==sourceLoadSerial\|\|songKey\(bridge\(\)\?\.getSong\?\.\(\)\)!==requestedSongKey/);
  assert.match(suite,/translationSerial/);
  assert.match(suite,/serial!==translationSerial\|\|songKey\(bridge\(\)\?\.getSong\?\.\(\)\)!==requestedSongKey/);
});

test('V20 Karaoke refuses stale renders and persists Practice after a preparation failure',()=>{
  const suite=read('src/v253-pro-suite.js');
  assert.match(suite,/serial!==karaokeSerial\|\|songKey\(b\?\.getSong\?\.\(\)\)!==identity/);
  assert.match(suite,/localStorage\.setItem\('deepecho-v18-karaoke-mode','practice'\)/);
  assert.match(suite,/b\?\.restoreKaraokeSource\?\.\(\)/);
});

test('V20 Sync Lab uses an immutable base timeline, shifts word timing too, and restores immediately',()=>{
  const renderer=read('src/renderer.js');
  assert.match(renderer,/let sectionBase=\{key:'',lines:\[\],wordTimings:\[\]\}/);
  assert.match(renderer,/const delta=Number\(targetTime\)-Number\(baseLine\.time\|\|0\)/);
  assert.match(renderer,/const shiftedWords=base\.wordTimings\.map/);
  assert.match(renderer,/wordTimings:shiftedWords/);
  assert.match(renderer,/function resetSectionSync\(\)/);
  assert.match(renderer,/wordTimings:sectionBase\.wordTimings\.map/);
});

test('V20 keeps the V18 lyrical-reference timing engine byte-identical and does not import V19 sync changes',()=>{
  assert.equal(sha('lib/lyrics-reference.js'),'56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4');
  assert.equal(sha('lib/exact-lyrics.js'),'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4');
  assert.equal(sha('src/v238-smart-autoplay.js'),'d190f92de59bace5e56279e183e79f3572f794edbb4013fb64c2040864df2674');
});
