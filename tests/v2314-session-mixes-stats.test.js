const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'src', 'v2314-session-mixes-stats.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'v2314-session-mixes-stats.css'), 'utf8');

test('V14 assets are wired after V13', () => {
  assert.match(html, /v2314-session-mixes-stats\.css/);
  assert.match(html, /v2313-repair-artist\.js[\s\S]*v2314-session-mixes-stats\.js/);
});

test('resume session stores song, position, section and collection context', () => {
  assert.match(js, /SESSION_KEY\s*=\s*'deepeccho-resume-session-v1'/);
  assert.match(js, /position/);
  assert.match(js, /tab:\s*activeTabName\(\)/);
  assert.match(js, /context:\s*safeContext\(\)/);
  assert.match(js, /recordHistory:false/);
  assert.match(js, /currentSong\?\.id\) return/);
});

test('resume session can be disabled and stale remote stream URLs are not persisted', () => {
  assert.match(js, /deepeccho-resume-session-enabled-v1/);
  assert.match(js, /delete song\.streamUrl/);
  assert.match(js, /MAX_SESSION_AGE_MS/);
  assert.match(js, /Clear Saved Session/);
});

test('personal mixes are taste based and open as playable collections', () => {
  assert.match(js, /Personal Mixes/);
  assert.match(js, /Your Daily Mix/);
  assert.match(js, /Your Romantic Mix/);
  assert.match(js, /Rediscover/);
  assert.match(js, /smartPreferenceSignals/);
  assert.match(js, /deepEchoOpenPlaylistCollection/);
  assert.match(js, /type:'personal-mix'/);
});

test('listening stats track actual played seconds locally', () => {
  assert.match(js, /deepeccho-listening-stats-v1/);
  assert.match(js, /totalSeconds \+= delta/);
  assert.match(js, /bySong/);
  assert.match(js, /byArtist/);
  assert.match(js, /byDay/);
  assert.match(js, /Listening-time tracking is exact from V14 onward/);
});

test('stats UI and personal mixes inherit theme variables', () => {
  assert.match(css, /var\(--gold-bright\)/);
  assert.match(css, /var\(--panel\)/);
  assert.match(css, /v2314-stats-grid/);
  assert.match(css, /v2314-mix-grid/);
});
