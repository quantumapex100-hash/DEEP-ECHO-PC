const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('lyrics page exposes click-through control beside floating lyrics', () => {
  const html = read('src/index.html');
  assert.match(html, /id="floatingLyricsToggleBtn"[\s\S]*id="floatingLyricsClickThroughPageBtn"/);
  assert.match(html, /id="floatingLyricsClickThroughState"/);
});

test('Ctrl Alt X has a main-process reliable registration', () => {
  const main = read('main.js');
  assert.match(main, /CommandOrControl\+Alt\+X/);
  assert.match(main, /registerReliableDefaultShortcuts\(\)/);
  assert.match(main, /floatingClickThrough/);
});

test('lyrics page click-through state follows main process state', () => {
  const tools = read('src/v150-tools.js');
  assert.match(tools, /floatingLyricsClickThroughPageBtn/);
  assert.match(tools, /toggleFloatingLyricsClickThrough/);
  assert.match(tools, /renderFloatingClickThroughState/);
});
