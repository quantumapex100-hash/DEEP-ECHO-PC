const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pkg=require('../package.json');
const main=fs.readFileSync('main.js','utf8');
const preload=fs.readFileSync('preload.js','utf8');
const js=fs.readFileSync('src/renderer.js','utf8');
const css=fs.readFileSync('src/style.css','utf8');

test('v1.4.12 keeps the visualizer engine intact but moves its stage upward',()=>{
  assert.equal(pkg.version,'2.1.0');
  assert.match(css,/top: calc\(50vh - 392px\)/);
  assert.match(js,/function drawLyricsVisualizer/);
  assert.match(js,/audioAnalyser\.getByteFrequencyData/);
});

test('crossfade and lyrics-size ranges inherit the active theme color',()=>{
  assert.match(css,/#crossfadeRange,#lyricsFontSizeRange\{accent-color:var\(--gold\)!important;\}/);
});

test('native maximize no longer silently promotes into true fullscreen',()=>{
  assert.doesNotMatch(main,/mainWindow\.on\('maximize'/);
  assert.match(main,/input\.key === 'F11'/);
  assert.match(main,/input\.key === 'Escape'/);
});

test('unsupported direct media gets a local compatibility fallback',()=>{
  assert.match(main,/prepare-compatible-playback/);
  assert.match(preload,/prepareCompatiblePlayback/);
  assert.match(js,/Preparing compatible audio/);
  assert.match(js,/NotSupportedError/);
});

test('plain lyrics can be upgraded to timed lines and ticker self-restarts',()=>{
  assert.match(main,/alignPlainLyricsToTimedTranscript/);
  assert.match(main,/sync-plain-lyrics/);
  assert.match(preload,/syncPlainLyrics/);
  assert.match(js,/syncPlainLyrics/);
  assert.match(main,/DEEP-ECHO AI timing/);
  assert.match(main,/lyrics-cache-v9\.json/);
  assert.match(js,/loadedmetadata/);
  assert.match(js,/canplay/);
  assert.match(js,/smartUpdateKaraoke/);
});
