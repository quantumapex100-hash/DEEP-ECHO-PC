const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const read=p=>fs.readFileSync(p,'utf8');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const main=read('main.js');
const renderer=read('src/renderer.js');
const smart=read('lib/ytdlp-smart.js');

test('V30 playback uses default/embedded/VR recovery without inheriting global backoff',()=>{
  assert.match(smart,/player_client=android/);
  assert.match(smart,/clientOrder = null/);
  assert.match(smart,/ignoreGlobalBackoff = false/);
  assert.match(main,/clientOrder: \['visionos', 'default', 'web_embedded', 'android_vr'\]/);
  assert.doesNotMatch(main,/clientOrder: \['android', 'default'/);
  assert.match(main,/ignoreGlobalBackoff: true/);
  assert.match(main,/affectsGlobalBackoff: false/);
});

test('V28 restores the original local temporary playback safety path',()=>{
  assert.match(main,/async function prepareClassicPlaybackFile\(song, progress = \(\) => \{\}\)/);
  assert.match(main,/const prefix = `stream-\$\{cleanId\}`/);
  assert.match(main,/purpose: 'classic-playback'/);
  assert.match(main,/direct stream failed; trying classic local fallback/);
  assert.match(main,/classicPlayback: true/);
});

test('V28 direct media failure also falls back to local playback instead of dying',()=>{
  assert.match(renderer,/const remoteStreamFailed = !!song\.streamUrl/);
  assert.match(renderer,/remoteMediaRecoveryInFlight/);
  assert.match(renderer,/Restoring classic playback/);
  assert.match(renderer,/Playing · restored mode/);
});

test('V28 keeps speculative lyric checks isolated from user playback',()=>{
  assert.match(main,/cancelLyricsSupportChecks\(\)/);
  assert.match(main,/runWithYtDlpContext\(\{affectsGlobalBackoff:false,requestClass:'lyrics-capability'\}/);
});

test('accepted lyric engines remain byte-identical',()=>{
  assert.equal(sha('lib/lyrics-reference.js'),'56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4');
  assert.equal(sha('lib/exact-lyrics.js'),'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4');
});
