const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const renderer = fs.readFileSync('src/renderer.js','utf8');

function block(name) {
  const start = renderer.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const next = renderer.indexOf('\nfunction ', start + 10);
  return renderer.slice(start, next === -1 ? renderer.length : next);
}

test('V12 Exact Lyrics switch remains clickable while OFF when a song is loaded', () => {
  const visual = block('updateLyricsVisual');
  assert.match(visual, /exactLyricsBtn\.disabled\s*=\s*!song\?\.title/);
  assert.doesNotMatch(visual, /!exactLyricsEnabled\s*\|\|/);
});

test('V12 Exact Lyrics master state still resets only for a newly identified song', () => {
  const reset = block('resetExactLyricsForSong');
  assert.match(reset, /if \(id && id === exactLyricsSongId\) return;/);
  assert.match(reset, /exactLyricsEnabled = false;/);
});

test('V12 clicking the OFF Exact Lyrics switch turns it ON and starts rescue', () => {
  assert.match(renderer, /exactLyricsBtn\?\.addEventListener\('click', async \(\) =>/);
  assert.match(renderer, /setExactLyricsEnabled\(true, true\);\s*await runExactLyrics\(false\);/s);
  assert.match(renderer, /exactLyricsBtn\.disabled = !currentSong\?\.title/);
});
