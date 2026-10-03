const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname,'..');
const read = f => fs.readFileSync(path.join(root,f),'utf8');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');

test('V32 uses one shared compatibility recovery promise for all UI playback paths',()=>{
  const renderer=read('src/renderer.js');
  assert.match(renderer,/let playbackRecoveryPromise = null/);
  assert.match(renderer,/async function recoverCompatiblePlayback\(song, requestId = playRequest/);
  assert.match(renderer,/if \(playbackRecoveryPromise && playbackRecoveryKey === key\) return playbackRecoveryPromise/);
  assert.match(renderer,/await recoverCompatiblePlayback\(song, requestId, 'play-rejected'\)/);
  assert.match(renderer,/await recoverCompatiblePlayback\(song, playRequest, 'media-error'\)/);
});

test('V32 bottom Play button waits for active recovery instead of replaying unsupported remote source',()=>{
  const renderer=read('src/renderer.js');
  assert.match(renderer,/if \(playbackRecoveryPromise\) \{[\s\S]*Preparing compatible audio[\s\S]*await playbackRecoveryPromise[\s\S]*return;/);
  assert.match(renderer,/if \(isUnsupportedPlaybackError\(error\) && currentSong\?\.streamUrl[\s\S]*recoverCompatiblePlayback\(currentSong, playRequest, 'manual-resume'\)/);
});

test('V32 suppresses intermediate media-error UI while recovery owns the source swap',()=>{
  const renderer=read('src/renderer.js');
  assert.match(renderer,/audioPlayer\.addEventListener\('error',[\s\S]*if \(playbackRecoveryPromise \|\| remoteMediaRecoveryInFlight\) return;/);
  assert.match(renderer,/The recovery owner will report only if[\s\S]*final compatible source also fails/);
  assert.doesNotMatch(renderer,/Play failed: The element has no supported sources/);
});

test('V32 keeps stream resolver, lyrics timing and Smart Autoplay engines byte-identical to V31',()=>{
  const expected={
    'main.js':'49e3f14aaeea6eeaa6e09f3ec8ab631cf9b59aff9092a40e8571b65a7a27bbb3',
    'preload.js':'43624209119d865ccd2fcca44dda7b1eb49357933301d9fda655858eed979e83',
    'lib/ytdlp-smart.js':'f36d4ad2cb9e2eb3d4d18b00dc6f52f6723c31fa0fc0a6f693fabf61bb3f72ae',
    'lib/youtube-captions.js':'dc89d203b626f2dfa5b9a0e147268b21672a3ab53aa2a3e190e2fa26676e3339',
    'lib/lyrics-reference.js':'56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4',
    'lib/exact-lyrics.js':'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4',
    'src/v238-smart-autoplay.js':'200514239517b4a4238c2b9dc3e497f17ab63bd1784e6d64c52e076072433048'
  };
  for(const [file,hash] of Object.entries(expected)) assert.equal(sha(file),hash,file);
});
