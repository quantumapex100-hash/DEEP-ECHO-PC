const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname,'..');
const read = f => fs.readFileSync(path.join(root,f),'utf8');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');

test('V35 gives a real Play click priority over stale Search and old-song resolver work',()=>{
  const main=read('main.js');
  assert.match(main,/function cancelStreamJobsExcept\(keepKey = ''\)/);
  assert.match(main,/ipcMain\.handle\('stream-song'[\s\S]{0,260}cancelLyricsSupportChecks\(\)[\s\S]{0,260}cancelStreamJobsExcept\(requestedStreamKey\)/);
  assert.match(main,/if \(existing\?\.promise\) \{[\s\S]*existing\.kind = 'playback'[\s\S]*return existing\.promise/);
  assert.match(main,/if \(isAbort\(directError\)\) return \{ success:false, cancelled:true, errorCode:'PLAYBACK_SUPERSEDED'/);
});

test('V35 speculative stream extraction is single-flight and priority ordered',()=>{
  const main=read('main.js');
  assert.match(main,/priorityName === 'next' \? 40 : priorityName === 'intent' \? 30 : priorityName === 'idle' \? 5 : 10/);
  assert.match(main,/entry\?\.kind === 'playback'/);
  assert.match(main,/Number\(entry\.priority \|\| 0\) < priority/);
  assert.match(main,/await Promise\.allSettled\(replacedJobs\)/);
  assert.match(main,/resolveStreamUrl\(song, quality, \{ kind:'prefetch', priority \}\)/);
});

test('V35 warms more Search rows serially and gives whole-row intent priority',()=>{
  const renderer=read('src/renderer.js');
  assert.match(renderer,/singles\.slice\(0, 2\)\.forEach\(song => enqueueSearchInstantWarm/);
  assert.match(renderer,/singles\.slice\(2, 6\)\.forEach\(song => enqueueSearchInstantWarm/);
  assert.match(renderer,/row\.addEventListener\('pointerenter', intentWarm/);
  assert.match(renderer,/playBtn\.addEventListener\('pointerdown', intentWarm/);
  assert.match(renderer,/prefetchPriority:entry\.priority \|\| 'search'/);
});

test('V35 resolves the next song immediately after playback starts even with Gapless off',()=>{
  const renderer=read('src/renderer.js');
  assert.match(renderer,/if \(window\.__deepecchoGameMode\) smartSchedulePrefetch\(1250\);[\s\S]*else smartSchedulePrefetch\(90\)/);
  const start=renderer.indexOf('prefetchNextQueued = async function()');
  const end=renderer.indexOf('const v140PlayRemoteSongBase',start);
  const block=renderer.slice(start,end);
  assert.doesNotMatch(block,/!gaplessToggle\?\.checked/);
  assert.match(block,/prefetchPriority:'next'/);
  assert.match(block,/if \(gaplessToggle\?\.checked\) smartWarmPreparedUrl/);
});

test('V35 does not modify accepted lyrics, Exact Lyrics, yt-dlp wrapper or Smart Autoplay engines',()=>{
  const expected={
    'preload.js':'43624209119d865ccd2fcca44dda7b1eb49357933301d9fda655858eed979e83',
    'lib/ytdlp-smart.js':'f36d4ad2cb9e2eb3d4d18b00dc6f52f6723c31fa0fc0a6f693fabf61bb3f72ae',
    'lib/youtube-captions.js':'dc89d203b626f2dfa5b9a0e147268b21672a3ab53aa2a3e190e2fa26676e3339',
    'lib/lyrics-reference.js':'56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4',
    'lib/exact-lyrics.js':'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4',
    'lib/lyrics.js':'bffb265ffcf0b9a973c008dc6a01dff464251e0a8c4bf6e6387755db9b868ead',
    'lib/lyrics-providers.js':'84084bab72c5c2fbe11554ff6898d8434fa8850648142c36b082bf29db8d9475',
    'src/v238-smart-autoplay.js':'200514239517b4a4238c2b9dc3e497f17ab63bd1784e6d64c52e076072433048'
  };
  for(const [file,hash] of Object.entries(expected)) assert.equal(sha(file),hash,file);
});
