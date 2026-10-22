// 22 October: authorized single-pass search and same-extraction audio recovery; dedicated behavioural regressions cover both.
// Accepted 17 October Next improvement: reserve one relevant known candidate and preserve it during radio discovery; lyrics hashes unchanged.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const html = read('src/index.html');
const renderer = read('src/renderer.js');
const themeJs = read('src/v273-red-nebula-performance.js');
const themeCss = read('src/v273-red-nebula-performance.css');
const session = read('src/v2314-session-mixes-stats.js');
const floatingCss = read('src/floating-lyrics.css');
const immersiveCss = read('src/immersive-lyrics.css');
const immersiveJs = read('src/immersive-lyrics.js');
const miniCss = read('src/mini.css');
const miniJs = read('src/mini.js');

const sha = rel => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');

test('V36 Red Nebulae is wired as a selectable live theme without reference-image branding', () => {
  assert.match(html, /data-theme-choice="nebula"/);
  assert.match(html, />Red Nebulae</);
  assert.match(html, /v273-red-nebula-performance\.css/);
  assert.match(html, /v273-red-nebula-performance\.js/);
  assert.match(renderer, /nebula:\s*\{\s*mode:\s*'nebula'/);
  assert.match(renderer, /accent === 'nebula'/);
  assert.match(themeCss, /body\[data-theme="nebula"\]/);
  assert.doesNotMatch(themeCss, /content\s*:\s*["'][^"']*(?:DineEcho|Cho)[^"']*["']/i);
  assert.doesNotMatch(themeJs, /fillText\s*\(/);
});

test('Red Nebulae owns main, floating, immersive and mini presentation', () => {
  assert.match(floatingCss, /data-theme="nebula"[\s\S]*floating-current/);
  assert.match(immersiveCss, /data-theme="nebula"[\s\S]*immersive-lyric-line\.current/);
  assert.match(immersiveJs, /nebula:\{mode:'nebula',accent:'nebula'/);
  assert.match(miniCss, /data-theme="nebula"/);
  assert.match(miniJs, /'space','nebula'/);
});

test('Sync-to-video repair is click-safe, opaque and still delegates to existing syncLyrics engine', () => {
  assert.match(themeCss, /\.lyrics-sync-float\{[\s\S]*z-index:90!important;[\s\S]*pointer-events:auto!important;[\s\S]*opacity:1!important;/);
  assert.match(themeCss, /\.lyrics-sync-float\{[\s\S]*backdrop-filter:none!important;/);
  assert.match(themeJs, /getElementById\('lyricsSyncBtn'\)/);
  assert.match(themeJs, /setLyricsAutoFollow\(true\)/);
  assert.match(themeJs, /syncLyrics\(true\)/);
  assert.match(renderer, /function syncLyrics\(force = false\)/);
});

test('Session restore always lands on Home and restores only a single-song context', () => {
  assert.match(session, /activateTab\('home'\)/);
  assert.match(session, /type:'single'/);
  assert.match(session, /recordHistory:false/);
  const restore = session.slice(session.indexOf('async function restoreSession()'), session.indexOf('function installSessionSettings()'));
  assert.doesNotMatch(restore, /activateTab\(targetTab\)/);
  assert.doesNotMatch(restore, /context\?\.items\?\.length/);
});

test('Manual Next uses the existing base player immediately while radio maintenance continues asynchronously', () => {
  assert.match(renderer, /playNext = async function\(options=\{\}\)\{if\(!options\?\.auto\)\{smartRestoreBaseVolume\(\);try\{Promise\.resolve\(smartExtendRadioIfNeeded\(\)\)\.catch\(\(\)=>\{\}\);\}catch\(_\)\{\}return v140PlayNextBase\(options\);\}/);
  assert.match(themeJs, /prefetchNextQueued/);
  assert.match(themeJs, /pointerenter/);
  assert.match(themeJs, /pointerdown/);
});

test('First paint starts in lightweight mode and sheds it after idle paint', () => {
  assert.match(html, /class="deepeccho-startup-lite"/);
  assert.match(themeCss, /body\.deepeccho-startup-lite[\s\S]*backdrop-filter:none!important/);
  assert.match(themeJs, /requestIdleCallback/);
  assert.match(themeJs, /classList\.remove\('deepeccho-startup-lite'\)/);
});

test('Protected process and lyrics engine files stay byte-identical to accepted 2.6.3 baseline', () => {
  // Main accepts the 17 October availability-aware playback client and prepared-audio reuse; protected lyric hashes below remain unchanged.
  assert.equal(sha('main.js'), '8368d26c12596563249ebfb465afe8b0c1ff0df08753be98cc35b014de0cf7d9');
  assert.equal(sha('preload.js'), '43624209119d865ccd2fcca44dda7b1eb49357933301d9fda655858eed979e83');
  assert.equal(sha('lib/exact-lyrics.js'), 'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4');
  assert.equal(sha('lib/youtube-captions.js'), 'dc89d203b626f2dfa5b9a0e147268b21672a3ab53aa2a3e190e2fa26676e3339');
  assert.equal(sha('lib/lyrics-timeline.js'), '7e1447ede0b9d5981b9d1b4e857e2dccf710677595c26bdda0bd1cb477317017');
  assert.equal(sha('src/v238-smart-autoplay.js'), 'e0c485bbd0868c2825c2520325e19f75ba7997ccd11ea3aa8464fef2a3738277');
});



