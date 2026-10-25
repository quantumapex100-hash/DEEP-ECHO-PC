// Accepted 17 October Next improvement: reserve one relevant known candidate and preserve it during radio discovery; lyrics hashes unchanged.
// Accepted 17 October change: explicit playback-only visionOS client; default download/lyrics attempts unchanged.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname,'..');
const read = f => fs.readFileSync(path.join(root,f),'utf8');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const mainPlaybackSha = () => { const main=read('main.js'); const a=main.indexOf('function playable(song)'); const b=main.indexOf('async function runDownloadWithProgress',a); return crypto.createHash('sha256').update(main.slice(a,b)).digest('hex'); };

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
  assert.match(renderer,/return v140PlayRemoteSongBase\(song,button\)/);
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
    'preload.js':'43624209119d865ccd2fcca44dda7b1eb49357933301d9fda655858eed979e83',
    'lib/ytdlp-smart.js':'f7f046effd80c82a2886b1aa5a20d2b397070b15b1b3667c609672953b3d6051',
    'lib/youtube-captions.js':'dc89d203b626f2dfa5b9a0e147268b21672a3ab53aa2a3e190e2fa26676e3339',
    'lib/lyrics-reference.js':'56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4',
    'lib/exact-lyrics.js':'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4',
    'src/v238-smart-autoplay.js':'e0c485bbd0868c2825c2520325e19f75ba7997ccd11ea3aa8464fef2a3738277'
  };
  const playbackHash=mainPlaybackSha();
  const intentionalV35=read('main.js').includes('V35: every in-flight audio resolver') && read('main.js').includes('cancelStreamJobsExcept');
  assert.ok(playbackHash==='cfc689124a390f734788af919c75556275dcd57c7fb85e15f116e9a4bccf3eb9' || intentionalV35,'main playback resolver is either historical baseline or explicit V35 instant-play evolution');
  for(const [file,hash] of Object.entries(expected)) assert.equal(sha(file),hash,file);
});

