const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const main=fs.readFileSync('main.js','utf8');
const preload=fs.readFileSync('preload.js','utf8');
const js=fs.readFileSync('src/renderer.js','utf8');
const html=fs.readFileSync('src/index.html','utf8');
const pkg=require('../package.json');
const { collapseCaptionLines, alignSyncedLyricsToCaptions }=require('../lib/youtube-captions');

test('v1.4.8 exposes true app fullscreen across normal Dinecho views',()=>{
  assert.match(pkg.version,/^2\.\d+\.\d+$/);
  assert.match(main,/setAppFullscreen/);
  assert.doesNotMatch(main,/mainWindow\.on\('maximize'/);
  assert.match(main,/Native Windows maximize stays a normal maximized window/);
  assert.match(main,/input\.key === 'Escape'/);
  assert.match(main,/input\.key === 'F11'/);
  assert.match(preload,/toggleAppFullscreen/);
  assert.match(html,/id="appFullscreenBtn"/);
  assert.match(js,/Toggle App Fullscreen/);
});

test('immersive player preserves an already active app fullscreen session',()=>{
  assert.match(js,/smartImmersiveOwnsDocumentFullscreen/);
  assert.match(js,/const appFs=await window\.echoAPI\.isAppFullscreen/);
  assert.match(js,/if\(smartImmersiveOwnsDocumentFullscreen&&document\.fullscreenElement\)/);
});

test('progressive YouTube auto captions keep their earliest start timestamp',()=>{
  const rows=collapseCaptionLines([{time:1,text:'Never a'},{time:1.4,text:'Never a frown'},{time:1.8,text:'Never a frown with golden brown'}]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].time,1);
  assert.equal(rows[0].text,'Never a frown with golden brown');
});

test('catalogue lyric text can inherit exact-video caption timing',()=>{
  const catalog='[00:10.00]No need to fight\n[00:14.00]Never a frown with golden brown\n[00:20.00]Every time just like the last';
  const video='[00:12.00]No need to fight\n[00:16.00]Never a frown with golden brown\n[00:22.00]Every time just like the last';
  const out=alignSyncedLyricsToCaptions(catalog,video);
  assert.ok(out);
  assert.equal(out.matched,3);
  assert.match(out.syncedLyrics,/\[00:12\.00\]No need to fight/);
  assert.equal(out.offset,2);
});

test('renderer uses media clock with tiny paint anticipation instead of old 180ms lead',()=>{
  assert.match(js,/LYRICS_RENDER_AHEAD_SECONDS = 0\.04/);
  assert.match(js,/exactVideoTiming \? 0\.012/);
  assert.match(js,/const playbackTime = lyricsPlaybackClock\(\)/);
  assert.doesNotMatch(js,/LYRICS_LEAD_SECONDS = 0\.18/);
});

test('lyrics cache is bumped so old drifted timing is not reused',()=>{
  assert.match(main,/lyrics-cache-v10\.json/);
  assert.match(main,/timingPrecision: 'youtube-aligned'/);
  assert.match(main,/timingPrecision: 'youtube-exact'/);
});
