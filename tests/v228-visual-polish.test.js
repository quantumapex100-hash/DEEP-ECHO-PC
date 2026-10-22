const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('v2.2.8 preview adds isolated visual polish controls', () => {
  const html = read('src/index.html');
  const css = read('src/v228-visual-polish.css');
  const js = read('src/v228-visual-polish.js');
  assert.match(html, /v228-visual-polish\.css/);
  assert.match(html, /id="v228VisualizerBrightnessRange"/);
  assert.match(html, /id="v228LyricsBackdropRange"/);
  assert.match(html, /v228-visual-polish\.js/);
  assert.match(css, /--v228-visualizer-brightness/);
  assert.match(css, /--v228-lyrics-dim-alpha/);
  assert.match(css, /#lyricsVisualizerCanvas/);
  assert.match(css, /#immersiveVisualizerCanvas/);
  assert.match(js, /deepecho-v228-visualizer-brightness/);
  assert.match(js, /deepecho-v228-lyrics-backdrop-darkness/);
});

test('visual polish module stays away from playback, sync and download internals', () => {
  const js = read('src/v228-visual-polish.js');
  const forbidden = [
    'audioPlayer', 'playRemoteSong', 'playLocal', 'playContextAt', 'downloadSong',
    'lyricsPlaybackClock', 'syncTimedLyrics', 'audioAnalyser', 'captureStream',
    'prepareCompatiblePlayback', 'currentSong', 'streamUrl'
  ];
  for (const token of forbidden) assert.equal(js.includes(token), false, `visual-only module must not reference ${token}`);
});

test('stable v2.2.7 playback, lyrics recovery and download safeguards are still present', () => {
  const renderer = read('src/renderer.js');
  const main = read('main.js');
  assert.match(renderer, /function lyricsPlaybackClock\(\)/);
  assert.match(renderer, /await resumeAudioAnalyser\(true\);\s*\/\/ Re-arm both visualizer loops/s);
  assert.match(renderer, /startLyricsVisualizer\(\);\s*startAudioEnergyTicker\(\);/s);
  assert.match(main, /ipcMain\.handle\('download-song'/);
});


test('official 2.3 release removes test-only build labels while keeping visual polish isolated', () => {
  const html = read('src/index.html');
  const css = read('src/v228-visual-polish.css');
  const js = read('src/v228-visual-polish.js');
  assert.match(html, />2\.6\.7<\/div>/);
  assert.doesNotMatch(html, /V2 TEST|do not release/);
  assert.doesNotMatch(js, /V2 TEST|do not release|RELEASE_DISPLAY_LABEL/);
  assert.match(css, /remove the full overlay plane between lyrics and the visualizer/);
});


test('RGB Word by Word OFF has a clean visible full-line override', () => {
  const css = read('src/v228-visual-polish.css');
  assert.match(css, /word-by-word-off\.lyrics-theme-fx\[data-theme="rgb"\]/);
  assert.match(css, /-webkit-text-fill-color:#f4f8ff!important/);
  assert.match(css, /background-image:none!important/);
});

test('V4 uses theme-native visualizer glow instead of brute-force white brightness', () => {
  const css = read('src/v228-visual-polish.css');
  const renderer = read('src/renderer.js');
  assert.match(css, /v4 theme-native glow/);
  assert.match(css, /body\[data-theme="blood"\] #lyricsVisualizerCanvas/);
  assert.match(css, /body\[data-theme="rgb"\] #lyricsVisualizerCanvas/);
  assert.match(renderer, /glowGain/);
  assert.match(renderer, /ctx\.shadowBlur=.*audio\.beatPulse/);
});


test('distinct per-theme renderer identities remain preserved after 2.3 release polish', () => {
  const renderer = read('src/renderer.js');
  for (const accent of ['golden','light','dark','silver','glass','electric','toxic','fluid','rgb','love','space']) {
    assert.match(renderer, new RegExp(`accent: '${accent}'|accent === '${accent}'`));
  }
});


test('v2.2.8 V6 karaoke keeps visualizer glow and staged lyrics loading stays isolated', () => {
  const css = read('src/v228-visual-polish.css');
  const renderer = read('src/renderer.js');
  const preload = read('preload.js');
  assert.match(css,/v6 karaoke visualizer parity/);
  assert.match(css,/body\.v170-karaoke #lyricsView \.lyrics-ambient-visualizer/);
  assert.match(renderer,/backgroundCaptionUpgrade/);
  assert.match(preload,/upgradeLyricsCaptions/);
});


test('v2.2.8 V7 future lyrics stay readable without adding boxes or dimming the visualizer', () => {
  const css = read('src/v228-visual-polish.css');
  assert.match(css, /v7 future-lyric readability/);
  assert.match(css, /#lyricsView \.lyric-line:not\(\.current\):not\(\.past\)/);
  assert.match(css, /body\.v170-karaoke #lyricsView \.lyric-line:not\(\.current\)/);
});


test('V8 playlist cards add contained local delete and explicit online Open Songs actions', () => {
  const renderer = read('src/renderer.js');
  const css = read('src/style.css');
  assert.match(renderer, /onDelete = null/);
  assert.match(renderer, /playlist-delete-btn/);
  assert.match(renderer, /Delete playlist/);
  assert.match(renderer, /openLabel: 'Open Songs'/);
  assert.match(renderer, /open\.textContent='Open Songs'/);
  assert.match(css, /playlist-card-actions\.has-delete/);
});

test('V8 final polish controls are visual-only and expose presets contrast and reset', () => {
  const html = read('src/index.html');
  const js = read('src/v228-visual-polish.js');
  assert.match(html, /id="v228GlowPreset"/);
  assert.match(html, /id="v228FutureLyricsRange"/);
  assert.match(html, /id="v228ResetVisualBtn"/);
  assert.match(js, /applyFutureLyricsContrast/);
  assert.match(js, /soft:96,balanced:108,strong:120/);
  assert.doesNotMatch(js, /audioPlayer|downloadSong|lyricsPlaybackClock|playRemoteSong/);
});
