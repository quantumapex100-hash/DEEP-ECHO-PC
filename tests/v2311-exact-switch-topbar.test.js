const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('src/index.html','utf8');
const renderer = fs.readFileSync('src/renderer.js','utf8');
const css = fs.readFileSync('src/style.css','utf8');
const autoplay = fs.readFileSync('src/v238-smart-autoplay.js','utf8');
const autoplayCss = fs.readFileSync('src/v238-smart-autoplay.css','utf8');

test('V11 Exact Lyrics exposes only one interactive per-song switch', () => {
  assert.equal((html.match(/id="exactLyricsBtn"/g)||[]).length, 1);
  assert.doesNotMatch(html, /id="exactLyricsQuickToggle"/);
  assert.doesNotMatch(html, /id="exactLyricsEnabledToggle"/);
  assert.match(html, /class="exact-lyrics-switch-ui"/);
  assert.match(renderer, /exactLyricsBtn\?\.addEventListener\('click', async \(\) =>/);
  assert.match(renderer, /setExactLyricsEnabled\(true, true\);\n  await runExactLyrics\(false\)/);
});

test('V11 Exact Lyrics progress rail is below the master switch and visible only while Exact is ON', () => {
  assert.match(html, /id="exactLyricsProgress"/);
  assert.match(html, /id="exactLyricsProgressFill"/);
  assert.match(html, /id="exactLyricsProgressText"/);
  assert.match(renderer, /function setExactLyricsProgress/);
  assert.match(renderer, /exactLyricsProgress\.setAttribute\('aria-hidden', exactLyricsEnabled \? 'false' : 'true'\)/);
  assert.match(css, /\.exact-lyrics-progress\[aria-hidden="true"\]/);
  assert.match(css, /\.exact-lyrics-progress-track span/);
});

test('V11 Smart Autoplay stays in topbar beside the quote/search input instead of Home scrolling content', () => {
  assert.match(autoplay, /const searchInput = searchBox\?\.querySelector\('#searchInput'\)/);
  assert.match(autoplay, /searchInput\.insertAdjacentElement\('afterend', wrap\)/);
  assert.match(autoplay, /Home content scrolls inside <main>/);
  assert.match(autoplayCss, /permanent topbar control on Home/);
  assert.doesNotMatch(autoplay, /hero-card[^\n]{0,120}appendChild\(wrap\)/);
});
