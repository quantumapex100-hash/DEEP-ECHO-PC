const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname,'..');
const read = f => fs.readFileSync(path.join(root,f),'utf8');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');

test('V33 warms a bounded serial set of Search audio URLs before Play is clicked',()=>{
  const renderer=read('src/renderer.js');
  assert.match(renderer,/Search Instant-Play warmup/);
  assert.match(renderer,/async function pumpSearchInstantWarm\(\)/);
  assert.match(renderer,/window\.echoAPI\.prefetchSong\(normalizeSong\(song\)/);
  assert.match(renderer,/singles\.slice\(0, 2\)\.forEach\(song => enqueueSearchInstantWarm/);
  assert.match(renderer,/searchInstantWarmRunning/);
});

test('V33 stores warmed Search URLs in the existing prepared-stream cache used by playback',()=>{
  const renderer=read('src/renderer.js');
  assert.match(renderer,/smartPreparedStreamUrls\.set\(song\.id, \{ url:res\.streamUrl, createdAt:Date\.now\(\), source:'search-warm' \}\)/);
  assert.match(renderer,/const prepared = smartPreparedStreamUrls\.get\(song\?\.id\)/);
  assert.match(renderer,/await playLocal\(\{\.\.\.queueSong\(song\),streamUrl:prepared\.url\},requestId\)/);
});

test('V33 prewarms likely user intent on play-button hover or focus without touching playlists',()=>{
  const renderer=read('src/renderer.js');
  assert.match(renderer,/if \(!isLibrary && !playlistLikeRow\) \{/);
  assert.match(renderer,/playBtn\.addEventListener\('pointerenter', intentWarm/);
  assert.match(renderer,/playBtn\.addEventListener\('focus', intentWarm\)/);
});

test('V33 gives newly verified lyrics-supported search results an instant-play warmup',()=>{
  const renderer=read('src/renderer.js');
  assert.match(renderer,/song\.lyricsVerified = true; song\.lyricsReady = true;[\s\S]*enqueueSearchInstantWarm\(song, request, true\);/);
});

test('V33 keeps playback resolver, lyrics timing and Smart Autoplay protected engines unchanged from V32',()=>{
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
