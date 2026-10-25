const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const main = fs.readFileSync('main.js','utf8');
const preload = fs.readFileSync('preload.js','utf8');
const html = fs.readFileSync('src/index.html','utf8');
const renderer = fs.readFileSync('src/renderer.js','utf8');
const shelves = fs.readFileSync('src/v236-discovery-shelves.js','utf8');
const shelvesCss = fs.readFileSync('src/v236-discovery-shelves.css','utf8');
const smart = fs.readFileSync('src/v238-smart-autoplay.js','utf8');
const smartCss = fs.readFileSync('src/v238-smart-autoplay.css','utf8');
const system = fs.readFileSync('src/v2310-smart-system.js','utf8');

test('V10 game-style GPU selector detects adapters and applies a boot preference', () => {
  assert.match(main, /Get-CimInstance Win32_VideoController/);
  assert.match(main, /app\.getGPUInfo\('complete'\)/);
  assert.match(main, /force-high-performance-gpu/);
  assert.match(main, /force-low-power-gpu/);
  assert.match(main, /ipcMain\.handle\('get-gpu-settings'/);
  assert.match(main, /ipcMain\.handle\('set-gpu-preference'/);
  assert.match(preload, /getGpuSettings/);
  assert.match(preload, /setGpuPreference/);
  assert.match(html, /id="gpuPreferenceSelect"/);
  assert.match(html, /id="gpuApplyRestartBtn"/);
  assert.match(system, /Auto · Windows decides/);
  assert.match(system, /Apply \+ Restart/);
});

test('Exact Lyrics is manual per song and base failure points the user to the top Exact Lyrics control', () => {
  assert.match(renderer, /let exactLyricsEnabled = false/);
  assert.match(renderer, /exactLyricsEnabled = false;\n\s*syncExactLyricsSettingUi\(\)/);
  assert.match(renderer, /Base lyrics abhi available nahi hain/);
  assert.match(renderer, /Please check the <b>Exact Lyrics<\/b> option available at the top/);
  assert.match(renderer, /Base lyrics unavailable · Exact Lyrics rescue available above/);
});

test('Home See More refreshes only the clicked shelf with a new rotation', () => {
  assert.match(shelves, /function refreshShelfSection236\(section, button\)/);
  assert.match(shelves, /const count = refreshCount236\(key\)/);
  assert.match(shelves, /more\.addEventListener\('click', \(\) => refreshShelfSection236\(section, more\)\)/);
  assert.match(shelves, /grid\.scrollTo\(\{ left:0, behavior:'smooth' \}\)/);
  assert.match(shelves, /Refresh only this row with new taste-aware picks/);
  assert.doesNotMatch(shelves, /more\.addEventListener\('click'[^\n]*scrollWidth/);
});

test('Home recommendations blend personal taste with popular discovery and rotate per refresh', () => {
  assert.match(shelves, /function smartBlendFeed236/);
  assert.match(shelves, /smartDiscoveryPool236/);
  assert.match(shelves, /tasteSongs236\(\)/);
  assert.match(shelves, /artistCounts/);
  assert.match(shelves, /renderTopHits236\(songs, refreshNo = 0\)/);
  assert.match(shelves, /renderPopularArtists236\(feed, refreshNo = 0\)/);
  assert.match(shelves, /renderNewReleases236\(feed, refreshNo = 0\)/);
  assert.match(shelves, /freshTasteSongs236/);
});

test('Smart Autoplay has stronger taste scoring and suppresses repetitive long duplicate candidates', () => {
  assert.match(smart, /function artistTasteScore/);
  assert.match(smart, /function profileVibeScore/);
  assert.match(smart, /durationSeconds\(song\)/);
  assert.match(smart, /sameSongFamily\(song, seed\)/);
  assert.match(smart, /sameArtistChosen >= 2/);
  assert.match(smart, /skips/);
  assert.match(smart, /completes/);
  assert.match(smart, /likes/);
  assert.match(smart, /13 \* 60/);
});

test('Smart Autoplay control stays in the non-scrolling topbar beside the quote/search field', () => {
  assert.match(smart, /const searchArea = document\.querySelector\('\.topbar \.search-area'\)/);
  assert.match(smart, /searchInput\.insertAdjacentElement\('afterend', wrap\)/);
  assert.match(smart, /stays anchored at the top/);
  assert.match(smart, /syncTogglePlacement/);
  assert.doesNotMatch(smart, /hero-card[^\n]{0,120}appendChild\(wrap\)/);
  assert.match(smartCss, /permanent topbar control on Home/);
  assert.match(smartCss, /\.smart-autoplay-home-wrap\{display:flex;align-items:center/);
});

test('Custom themed shelf scrubber replaces native horizontal scrollbar and participates in custom cursor handling', () => {
  assert.match(shelvesCss, /scrollbar-width:none/);
  assert.match(shelvesCss, /::-webkit-scrollbar\{width:0;height:0;display:none\}/);
  assert.match(shelvesCss, /\.deepecho-shelf-slider/);
  assert.match(shelves, /function ensureCustomShelfSlider236/);
  assert.match(shelves, /setPointerCapture/);
  assert.match(renderer, /\[role="slider"\], \.deepecho-shelf-slider/);
});
