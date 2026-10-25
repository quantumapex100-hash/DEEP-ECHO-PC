const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const hashText = s => crypto.createHash('sha256').update(s).digest('hex');

function sourceBlock(file, start, end) {
  const src = read(file);
  const a = src.indexOf(start);
  const b = src.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `block ${start}..${end} exists in ${file}`);
  return src.slice(a, b);
}

test('V35 all-surfaces keeps passive Home warmup below Search and click intent priority', () => {
  const main = read('main.js');
  const renderer = read('src/renderer.js');
  assert.match(main, /priorityName === 'next' \? 40 : priorityName === 'intent' \? 30 : priorityName === 'idle' \? 5 : 10/);
  assert.match(renderer, /function warmVisibleCards\(songs, count = 2\)/);
  assert.match(renderer, /enqueueSearchInstantWarm\(song, searchRequest, false, 'idle'\)/);
  assert.match(renderer, /const priority = priorityOverride \|\| \(front \? 'intent' : 'search'\)/);
});

test('V35 all-surfaces warms Home recommendation and resume cards before the click lands', () => {
  const renderer = read('src/renderer.js');
  const cardStart = renderer.indexOf('function buildSongCard');
  const cardEnd = renderer.indexOf('// ================= Song row builder', cardStart);
  const card = renderer.slice(cardStart, cardEnd);
  assert.match(card, /card\.addEventListener\('pointerenter', intentWarm/);
  assert.match(card, /play\.addEventListener\('pointerdown', intentWarm/);
  assert.match(renderer, /warmVisibleCards\(songs, 2\)/);
  assert.match(renderer, /warmVisibleCards\(\[made\[0\], because\[0\]\]\.filter\(Boolean\), 2\)/);
  const resumeStart = renderer.indexOf('function smartBuildResumeCard');
  const resumeEnd = renderer.indexOf('function renderContinueListening', resumeStart);
  const resume = renderer.slice(resumeStart, resumeEnd);
  assert.match(resume, /card\.addEventListener\('pointerenter', intentWarm/);
  assert.match(resume, /play\.addEventListener\('pointerdown', intentWarm/);
});

test('V35 all-surfaces preserves direct local playback for Downloads', () => {
  const renderer = read('src/renderer.js');
  const start = renderer.indexOf('async function playSongObject');
  const end = renderer.indexOf('async function playContextAt', start);
  const block = renderer.slice(start, end);
  assert.match(block, /const pending=\(item\.filepath \|\| item\.fileUrl\)\?playLocal\(item\):playRemoteSong\(item,button\)/);
  assert.doesNotMatch(block, /prefetchSong\(item/);
});

test('V35 all-surfaces leaves V34 Download engine blocks byte-identical', () => {
  assert.equal(
    hashText(sourceBlock('main.js', "ipcMain.handle('download-song'", '// Window opacity')),
    'e6a6afcfc64f08781feb20807592adc892da705763703edf5e9161687251523e'
  );
  assert.equal(
    hashText(sourceBlock('src/renderer.js', 'async function downloadSong', 'function showDownloadProgress')),
    'c33206b57bd6067d33a5f554563bf6ce0c9396504aaf6b1a650c12b3e3bb65b8'
  );
});
