const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pkg=require('../package.json');
const renderer=fs.readFileSync('src/renderer.js','utf8');
const floating=fs.readFileSync('src/floating-lyrics.js','utf8');
const tools=fs.readFileSync('src/v150-tools.js','utf8');
const main=fs.readFileSync('main.js','utf8');
const {collapseCaptionLines,alignSyncedLyricsToCaptions}=require('../lib/youtube-captions');

test('v1.6.7 keeps legitimate repeated lyric lines while collapsing near duplicate caption emits',()=>{
  assert.match(pkg.version,/^2\.\d+\.\d+$/);
  const rows=collapseCaptionLines([
    {time:1.00,text:'I need you'},
    {time:1.25,text:'I need you'}, // duplicate auto-caption emit
    {time:3.80,text:'I need you'}, // actual repeated lyric line
    {time:6.50,text:'again'}
  ]);
  assert.equal(rows.length,3);
  assert.equal(rows[0].time,1);
  assert.equal(rows[1].time,3.8);
  assert.equal(rows[1].text,'I need you');
});

test('repeated chorus alignment stays occurrence-aware and monotonic',()=>{
  const catalog='[00:10.00]hold me now\n[00:14.00]say my name\n[00:18.00]hold me now\n[00:22.00]stay with me';
  const captions='[00:11.00]hold me now\n[00:15.00]say my name\n[00:19.00]hold me now\n[00:23.00]stay with me\n[00:55.00]hold me now';
  const out=alignSyncedLyricsToCaptions(catalog,captions);
  assert.ok(out);
  assert.match(out.syncedLyrics,/\[00:11\.00\]hold me now/);
  assert.match(out.syncedLyrics,/\[00:19\.00\]hold me now/);
  assert.doesNotMatch(out.syncedLyrics,/\[00:55\.00\]hold me now/);
});

test('main lyric ticker uses media-clock interval instead of requestAnimationFrame',()=>{
  assert.match(renderer,/function findActiveLyricIndex/);
  assert.match(renderer,/lyricAnimationFrame = setInterval\(tick, 80\)/);
  assert.match(renderer,/clearInterval\(lyricAnimationFrame\)/);
  assert.doesNotMatch(renderer,/lyricAnimationFrame = requestAnimationFrame\(tick\)/);
});

test('async lyric status never erases already-visible lyric rows',()=>{
  assert.match(renderer,/const visibleLyrics = !!lyricsBody\.querySelector\('\.lyric-line'\)/);
  assert.match(renderer,/if \(!visibleLyrics\) lyricsBody\.innerHTML/);
});

test('floating lyrics normalize repeated lines and receive sub-second drift heartbeats',()=>{
  assert.match(floating,/normalizeFloatingLines/);
  assert.match(floating,/floatingActiveIndex/);
  assert.match(tools,/setInterval\(\(\) => pushFloatingLyrics\(false\), 400\)/);
  assert.match(tools,/'waiting','stalled','ratechange'/);
});

test('old potentially bad lyric timing cache is invalidated',()=>{
  assert.match(main,/lyrics-cache-v11\.json/);
});
