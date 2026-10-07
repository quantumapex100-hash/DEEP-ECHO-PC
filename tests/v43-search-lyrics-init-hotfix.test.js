const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sha = rel => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');
const renderer = read('src/renderer.js');
const session = read('src/v2314-session-mixes-stats.js');
const immersive = read('src/immersive-lyrics.js');

test('V43 initializes prepared-stream cache before startup can render Recent/Home warmup', () => {
  const decl = renderer.indexOf('const smartPreparedStreamUrls = new Map();');
  const init = renderer.indexOf('(function init()');
  const recentCall = renderer.indexOf('renderRecentlyPlayed();', init);
  const enqueue = renderer.indexOf('function enqueueSearchInstantWarm');
  assert.ok(decl >= 0, 'prepared stream map declaration missing');
  assert.ok(decl < init, 'prepared stream map must initialize before startup init');
  assert.ok(decl < recentCall, 'prepared stream map must initialize before startup Recent render');
  assert.ok(decl < enqueue, 'prepared stream map must initialize before warmup helpers can run');
});

test('V43 keeps exactly one prepared-stream map declaration', () => {
  const matches = renderer.match(/const smartPreparedStreamUrls = new Map\(\);/g) || [];
  assert.equal(matches.length, 1);
});

test('V43 preserves V42 fast resume and Home/Search warmup instead of disabling the feature', () => {
  assert.match(session, /setTimeout\(\(\) => \{ try \{ prewarmResumeSession\(\); \} catch \(_\) \{\} \}, 70\)/);
  assert.match(session, /setTimeout\(\(\) => \{ try \{ restoreSession\(\); \} catch \(_\) \{\} \}, 460\)/);
  assert.match(renderer, /warmVisibleCards\(recent, 3\)/);
  assert.match(renderer, /warmVisibleCards\(songs\.slice\(2\), 2\)/);
  assert.match(renderer, /singles\.slice\(2, 6\)/);
});

test('V43 preserves premium Red Nebulae palette and visualizer implementation', () => {
  assert.match(renderer, /\[255, 62, 156\]/);
  assert.match(renderer, /\[255, 146, 72\]/);
  assert.match(renderer, /\[255, 240, 202\]/);
  assert.match(immersive, /const palette=\[\[255,62,156\],\[255,146,72\],\[255,240,202\]\]/);
});

test('V43 keeps protected playback, lyrics and Smart Autoplay engines byte-identical', () => {
  assert.equal(sha('main.js'), 'b9e0b10b42a860e835dd6ee78a22a258727d7f7ab0836be23d3a19f168452a89');
  assert.equal(sha('preload.js'), '43624209119d865ccd2fcca44dda7b1eb49357933301d9fda655858eed979e83');
  assert.equal(sha('lib/exact-lyrics.js'), 'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4');
  assert.equal(sha('lib/youtube-captions.js'), 'dc89d203b626f2dfa5b9a0e147268b21672a3ab53aa2a3e190e2fa26676e3339');
  assert.equal(sha('lib/lyrics-timeline.js'), '7e1447ede0b9d5981b9d1b4e857e2dccf710677595c26bdda0bd1cb477317017');
  assert.equal(sha('src/v238-smart-autoplay.js'), '200514239517b4a4238c2b9dc3e497f17ab63bd1784e6d64c52e076072433048');
});
