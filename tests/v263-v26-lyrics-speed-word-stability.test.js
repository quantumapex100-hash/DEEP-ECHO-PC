const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');

const main=fs.readFileSync('main.js','utf8');
const renderer=fs.readFileSync('src/renderer.js','utf8');
function sha(path){return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');}

test('V26 Search lyrics checking uses bounded parallel workers instead of two-at-a-time probing',()=>{
  assert.match(renderer,/const workerCount = Math\.min\(5, Math\.max\(1, queue\.length\)\)/);
  assert.match(renderer,/Promise\.all\(Array\.from\(\{ length: workerCount \}, \(\) => worker\(\)\)\)/);
});

test('V26 exact-video support checks deduplicate work and warm a ready-lyrics hot cache',()=>{
  assert.match(main,/const lyricsSupportJobs = new Map\(\)/);
  assert.match(main,/const lyricsHotReadyCache = new Map\(\)/);
  assert.match(main,/if\(lyricsSupportJobs\.has\(id\)\)return lyricsSupportJobs\.get\(id\)/);
  assert.match(main,/rememberLyricsHotReady\(song,ready,'lyric-video-timed-captions'\)/);
  assert.match(main,/const hotReady = lyricsHotReadyEntry\(song\)/);
  assert.match(main,/supportHotCached:true/);
});

test('V26 non-lyrical support verification overlaps provider work with caption discovery',()=>{
  assert.match(main,/const providerPromise=lyricalHint\(song\)\?Promise\.resolve\(null\):getLyrics\(song\)\.catch\(\(\)=>null\)/);
  assert.match(main,/const youtube=await getYouTubeLyrics/);
  assert.match(main,/const provider=await providerPromise/);
});

test('V26 Word by Word keeps the accepted line ticker but paints current words at a stable faster cadence',()=>{
  assert.match(renderer,/lyricAnimationFrame = setInterval\(tick, 80\)/);
  assert.match(renderer,/const targetPerWord=\.38/);
  assert.match(renderer,/Math\.max\(\.88,Math\.min\(1\.16/);
  assert.match(renderer,/smartWordByWordTimer=setInterval\([^\n]+,40\)/);
  assert.match(renderer,/if\(i<activeLyric\)/);
  assert.match(renderer,/if\(i>activeLyric\)/);
  assert.match(renderer,/effectiveEnd/);
});

test('V26 speed work leaves accepted lyric alignment/reference/exact engines byte-identical',()=>{
  assert.equal(sha('lib/youtube-captions.js'),'dc89d203b626f2dfa5b9a0e147268b21672a3ab53aa2a3e190e2fa26676e3339');
  assert.equal(sha('lib/lyrics-reference.js'),'56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4');
  assert.equal(sha('lib/exact-lyrics.js'),'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4');
});
