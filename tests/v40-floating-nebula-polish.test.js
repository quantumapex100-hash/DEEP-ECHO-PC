// 22 October: authorized single-pass search and same-extraction audio recovery; dedicated behavioural regressions cover both.
// Accepted 17 October Next improvement: reserve one relevant known candidate and preserve it during radio discovery; lyrics hashes unchanged.
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
  // Main accepts the 17 October availability-aware playback client and prepared-audio reuse; protected lyric hashes below remain unchanged.
<<<<<<< HEAD
  assert.equal(sha('main.js'), 'f17f9153b612843079e1170357c9e353269f11176ac21ff94d7bc903d48796f9');
=======
  assert.equal(sha('main.js'), '8368d26c12596563249ebfb465afe8b0c1ff0df08753be98cc35b014de0cf7d9');
>>>>>>> e83dfe38a7e9fe2598fd59562f05c0996b93b00c
  assert.equal(sha('preload.js'), '43624209119d865ccd2fcca44dda7b1eb49357933301d9fda655858eed979e83');
  assert.equal(sha('lib/exact-lyrics.js'), 'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4');
  assert.equal(sha('src/v238-smart-autoplay.js'), 'e0c485bbd0868c2825c2520325e19f75ba7997ccd11ea3aa8464fef2a3738277');
});



