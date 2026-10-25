// 22 October: authorized single-pass search and same-extraction audio recovery; dedicated behavioural regressions cover both.
// Accepted 17 October Next improvement: reserve one relevant known candidate and preserve it during radio discovery; lyrics hashes unchanged.
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
const session = read('src/v2314-session-mixes-stats.js');
const html = read('src/index.html');
const v200 = read('src/v200.js');

test('V42 uses the requested 2.6.7 visible version label and premium Red Nebulae palette', () => {
  assert.match(html, /v228-test-label">2\.6\.7</);
  assert.match(v200, /DEEPECHO_RELEASE_VERSION='2\.6\.7'/);
  assert.match(v200, /v42Label\.textContent=DEEPECHO_RELEASE_VERSION/);
  const start = renderer.indexOf('function drawNebulaDotCore');
  const end = renderer.indexOf('let visualizerLastPaintAt', start);
  const fn = renderer.slice(start, end);
  assert.match(fn, /\[255, 62, 156\]/); // hot pink
  assert.match(fn, /\[255, 146, 72\]/); // soft orange
  assert.match(fn, /\[255, 240, 202\]/); // golden white
  assert.match(immersive, /const palette=\[\[255,62,156\],\[255,146,72\],\[255,240,202\]\]/);
});

test('V42 starts saved-session stream warmup early and restores much sooner than the old 1250ms delay', () => {
  assert.match(session, /function prewarmResumeSession\(\)/);
  assert.match(session, /prefetchPriority:'intent'/);
  assert.match(session, /source:'session-resume'/);
  assert.match(session, /setTimeout\(\(\) => \{ try \{ prewarmResumeSession\(\); \} catch \(_\) \{\} \}, 70\)/);
  assert.match(session, /setTimeout\(\(\) => \{ try \{ restoreSession\(\); \} catch \(_\) \{\} \}, 460\)/);
  assert.doesNotMatch(session, /setTimeout\(restoreSession, 1250\)/);
  assert.match(session, /activateTab\('home'\)/);
});

test('V42 warms more likely Home and Recent clicks while Search rolling warmup stays bounded', () => {
  assert.match(renderer, /warmVisibleCards\(songs, 2\)/);
  assert.match(renderer, /warmVisibleCards\(songs\.slice\(2\), 2\)/);
  assert.match(renderer, /warmVisibleCards\(recent, 3\)/);
  assert.match(renderer, /singles\.slice\(0, 2\)/);
  assert.match(renderer, /singles\.slice\(0, 2\)/);
  assert.match(renderer, /prefetchPriority:index===0\?'next':'idle'/);
});

test('Prepared Play uses existing main cache while cancelling stale work', () => {
  assert.match(renderer, /const prepared = smartPreparedStreamUrls\.get\(song\?\.id\)/);
  assert.match(renderer, /Prefetched · starting/);
  assert.match(renderer, /return v140PlayRemoteSongBase\(song,button\)/);
});

test('V42 preserves protected playback process, Exact Lyrics and Smart Autoplay files', () => {
  // Main accepts the 17 October availability-aware playback client and prepared-audio reuse; protected lyric hashes below remain unchanged.
  assert.equal(sha('main.js'), 'f17f9153b612843079e1170357c9e353269f11176ac21ff94d7bc903d48796f9');
  assert.equal(sha('preload.js'), '43624209119d865ccd2fcca44dda7b1eb49357933301d9fda655858eed979e83');
  assert.equal(sha('lib/exact-lyrics.js'), 'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4');
  assert.equal(sha('lib/youtube-captions.js'), 'dc89d203b626f2dfa5b9a0e147268b21672a3ab53aa2a3e190e2fa26676e3339');
  assert.equal(sha('lib/lyrics-timeline.js'), '7e1447ede0b9d5981b9d1b4e857e2dccf710677595c26bdda0bd1cb477317017');
  assert.equal(sha('src/v238-smart-autoplay.js'), 'e0c485bbd0868c2825c2520325e19f75ba7997ccd11ea3aa8464fef2a3738277');
});




