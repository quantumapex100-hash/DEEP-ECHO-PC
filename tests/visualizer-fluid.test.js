const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
const effects = fs.readFileSync(path.join(root, 'src', 'effects.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'style.css'), 'utf8');

test('lyrics CD is replaced by centered circular visualizer canvas', () => {
  assert.match(html, /id="lyricsVisualizerCanvas"/);
  assert.doesNotMatch(html, /id="lyricsDisc"/);
  assert.match(css, /\.lyrics-ambient-visualizer/);
  assert.match(css, /position:\s*sticky/);
});

test('visualizer uses analyser spectrum without rerouting the player audio path', () => {
  assert.match(js, /captureStream/);
  assert.match(js, /createMediaStreamSource/);
  assert.match(js, /getByteFrequencyData/);
  assert.doesNotMatch(js, /createMediaElementSource\(audioPlayer\)/);
  assert.match(js, /visualizerFrequencyData/);
});

test('fluid effect consumes audio energy and pointer motion', () => {
  assert.match(effects, /__dinechoAudioEnergy/);
  assert.match(effects, /pointerSpeed/);
  assert.match(effects, /Viscous color streams/);
  assert.match(effects, /fx\.bass/);
  assert.match(effects, /__dinechoFluidConfig/);
  assert.match(effects, /palettes/);
});

test('volume mixer remains in Settings', () => {
  assert.match(html, /id="volumeRange"/);
  assert.match(html, /id="muteToggleBtn"/);
  assert.match(js, /applyVolumeSettings/);
});

test('fluid wallpaper has intensity and color preset controls in Settings', () => {
  assert.match(html, /id="fluidIntensityRange"/);
  assert.match(html, /id="fluidPresetSelect"/);
  assert.match(js, /applyFluidSettings/);
});
