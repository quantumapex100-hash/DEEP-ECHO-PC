const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const floating = read('src/floating-lyrics.css');
const renderer = read('src/renderer.js');
const immersive = read('src/immersive-lyrics.js');
const sha = rel => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');

test('V40 makes current floating lyrics smaller and raises upcoming lyrics for every theme', () => {
  assert.match(floating, /DEEP-ECHO V40: open floating lyric stage/);
  assert.match(floating, /font-size:clamp\(13px,calc\(22px \* var\(--fl-overlay-scale\) \* var\(--fl-user-font-scale\)\),44px\)!important/);
  assert.match(floating, /\.floating-next\{[\s\S]*translate3d\(0,calc\(-1 \* var\(--fl-v40-rise\)\),0\)/);
  assert.match(floating, /flV40FreeCurrent/);
  assert.match(floating, /flV40FreeNext/);
});

test('V40 Red Nebulae floating overlay is visibly transparent without expensive blur', () => {
  const v40 = floating.slice(floating.lastIndexOf('Red Nebulae V40'));
  assert.match(v40, /rgba\(25,5,13,\.80\)/);
  assert.match(v40, /rgba\(9,2,7,\.64\)/);
  assert.match(v40, /backdrop-filter:none!important/);
  assert.doesNotMatch(v40, /backdrop-filter:blur/);
});

test('V40+ main Lyrics and immersive visualizers use a dedicated Red Nebulae core instead of the generic theme lattice', () => {
  assert.match(renderer, /function drawNebula(?:Plasma|Dot)Core\(/);
  assert.match(renderer, /if \(spec\.mode === 'nebula'\) \{[\s\S]*drawNebula(?:Plasma|Dot)Core/);
  assert.match(immersive, /function drawNebula(?:Plasma|Dot)Core\(/);
  assert.match(immersive, /if\(spec\.mode==='nebula'\)\{drawNebula(?:Plasma|Dot)Core/);
});

test('V40+ dedicated nebula core remains driven by existing spectrum and waveform signals', () => {
  const start = Math.max(renderer.indexOf('function drawNebulaPlasmaCore'), renderer.indexOf('function drawNebulaDotCore'));
  const end = renderer.indexOf('let visualizerLastPaintAt', start);
  const fn = renderer.slice(start, end);
  assert.match(fn, /visualizerSpectrumSample/);
  assert.match(fn, /visualizerWaveSample/);
  assert.match(fn, /audio\.beatPulse/);
  assert.match(fn, /audio\.vocal/);
});

test('V40 still preserves protected process, exact lyrics and Smart Autoplay files', () => {
  assert.equal(sha('main.js'), 'b9e0b10b42a860e835dd6ee78a22a258727d7f7ab0836be23d3a19f168452a89');
  assert.equal(sha('preload.js'), '43624209119d865ccd2fcca44dda7b1eb49357933301d9fda655858eed979e83');
  assert.equal(sha('lib/exact-lyrics.js'), 'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4');
  assert.equal(sha('src/v238-smart-autoplay.js'), '200514239517b4a4238c2b9dc3e497f17ab63bd1784e6d64c52e076072433048');
});
