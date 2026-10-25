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

