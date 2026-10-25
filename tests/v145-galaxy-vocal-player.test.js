const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('src/renderer.js','utf8');
const css=fs.readFileSync('src/style.css','utf8');
const html=fs.readFileSync('src/index.html','utf8');
const fx=fs.readFileSync('src/effects.js','utf8');

test('visualizer reconnects capture stream when media resource changes or PCM disappears',()=>{
  assert.match(js,/function setupAudioAnalyser\(forceReconnect = false\)/);
  assert.match(js,/const freshStream = audioPlayer\.captureStream\(\)/);
  assert.match(js,/audioAnalyserMediaKey !== getAudioAnalyserMediaKey\(\)/);
  assert.match(js,/requestVisualizerReconnect\('playing-with-zero-pcm'\)/);
  assert.match(js,/audioPlayer\.addEventListener\('loadedmetadata', \(\) => \{ resumeAudioAnalyser\(true\)/);
});

test('visualizer has a vocal-priority envelope',()=>{
  assert.match(js,/visualizerBandAverage\(220, 520\)/);
  assert.match(js,/visualizerBandAverage\(520, 1800\)/);
  assert.match(js,/visualizerBandAverage\(1800, 4300\)/);
  assert.match(js,/vocal: visualizerVocalState/);
  assert.match(js,/vocalTransient: visualizerVocalTransient/);
  assert.match(js,/visualizerVocalState \* \.46/);
});

test('space renderer uses procedural galaxy dust, nebula and dense stars',()=>{
  assert.match(fx,/SPACE_DUST_COUNT = 280/);
  assert.match(fx,/SPACE_NEBULA_COUNT = 14/);
  assert.match(fx,/SPACE_STAR_COUNT = 190/);
  assert.match(fx,/Heavy blur is baked once at half resolution/);
  assert.match(fx,/particle-built spiral galaxy/);
});

test('main player can hide and show from an arrow handle and is raised from the bottom',()=>{
  assert.match(html,/id="playerCollapseBtn"/);
  assert.match(js,/function applyPlayerCollapsed\(collapsed, persist = true\)/);
  assert.match(css,/\.player-bar\{[\s\S]*margin:0 10px 10px/);
  assert.match(css,/\.player-bar\.is-collapsed/);
});
