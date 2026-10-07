const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sha = rel => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');
const renderer = read('src/renderer.js');
const immersive = read('src/immersive-lyrics.js');

test('V41 replaces the Red Nebulae plasma center with a dedicated dotted galaxy core on both visualizer surfaces', () => {
  assert.match(renderer, /V41 Red Nebulae core: the same galaxy\/spiral silhouette rebuilt entirely from audio-reactive dots/);
  assert.match(renderer, /function drawNebulaDotCore\(/);
  assert.match(renderer, /drawNebulaDotCore\(ctx, renderCx, renderCy/);
  assert.doesNotMatch(renderer, /function drawNebulaPlasmaCore\(/);
  assert.match(immersive, /V41 Red Nebulae immersive core: dotted galaxy silhouette/);
  assert.match(immersive, /function drawNebulaDotCore\(/);
  assert.match(immersive, /if\(spec\.mode==='nebula'\)\{drawNebulaDotCore/);
  assert.doesNotMatch(immersive, /function drawNebulaPlasmaCore\(/);
});

test('V41+ Red Nebulae dotted core keeps a dedicated three-color palette', () => {
  const start = renderer.indexOf('function drawNebulaDotCore');
  const end = renderer.indexOf('let visualizerLastPaintAt', start);
  const fn = renderer.slice(start, end);
  assert.match(fn, /const palette = \[[\s\S]*\];/);
  assert.match(fn, /palette\[\(arm \+ i\) % 3\]/);
});

test('V41 dotted galaxy remains music reactive using spectrum, waveform, beat and vocals', () => {
  const start = renderer.indexOf('function drawNebulaDotCore');
  const end = renderer.indexOf('let visualizerLastPaintAt', start);
  const fn = renderer.slice(start, end);
  assert.match(fn, /visualizerSpectrumSample/);
  assert.match(fn, /visualizerWaveSample/);
  assert.match(fn, /audio\.beatPulse/);
  assert.match(fn, /audio\.vocal/);
  assert.match(fn, /audio\.transient/);
});

test('V41 keeps the same dotted spiral plus crossing-lane galaxy silhouette instead of falling back to a generic sphere', () => {
  const start = renderer.indexOf('function drawNebulaDotCore');
  const end = renderer.indexOf('let visualizerLastPaintAt', start);
  const fn = renderer.slice(start, end);
  assert.match(fn, /Dotted spiral arms preserve V40's nebula\/galaxy shape/);
  assert.match(fn, /The two V40 crossing energy lanes are now dotted ellipses/);
  assert.match(fn, /Dense dotted nucleus/);
  assert.match(fn, /armCount/);
  assert.match(fn, /dotsPerArm/);
});

test('V41 still preserves protected playback, Exact Lyrics and Smart Autoplay files', () => {
  assert.equal(sha('main.js'), 'b9e0b10b42a860e835dd6ee78a22a258727d7f7ab0836be23d3a19f168452a89');
  assert.equal(sha('preload.js'), '43624209119d865ccd2fcca44dda7b1eb49357933301d9fda655858eed979e83');
  assert.equal(sha('lib/exact-lyrics.js'), 'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4');
  assert.equal(sha('src/v238-smart-autoplay.js'), '200514239517b4a4238c2b9dc3e497f17ab63bd1784e6d64c52e076072433048');
});
