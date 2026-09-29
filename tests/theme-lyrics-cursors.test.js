const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const index = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../src/style.css'), 'utf8');
const renderer = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

const themes = ['golden','light','dark','purple','toxic','blood','silver','transparent','fluids','rgb','love'];

test('v1.4.1 keeps the in-lyrics Theme Lyrics ON/OFF toggle', () => {
  assert.match(pkg.version,/^2\.\d+\.\d+$/);
  assert.match(index, /id="lyricsThemeFxToggle"/);
  assert.match(index, /id="lyricsThemeFxToggleText">ON</);
  assert.match(renderer, /lyricsThemeFx:\s*'echo-lyrics-theme-fx-v1'/);
  assert.match(renderer, /function applyLyricsThemeFx\(enabled\)/);
  assert.match(renderer, /classList\.toggle\('lyrics-theme-fx', active\)/);
  assert.match(renderer, /localStorage\.getItem\(STORAGE\.lyricsThemeFx\) !== 'false'/);
});

test('every selectable theme has gated lyrics typography rules', () => {
  for (const theme of themes) {
    assert.match(css, new RegExp(`body\\.lyrics-theme-fx\\[data-theme="${theme}"\\].*\\.lyric-line`));
  }
  assert.match(css, /OFF intentionally keeps the pre-v1\.3\.0 lyrics look above untouched/);
});

test('theme lyrics keep distinct animation families without vertical row motion', () => {
  for (const name of ['lyricsGoldenShimmer','lyricsLightRise','lyricsDarkBreathe','lyricsPurpleFloat','lyricsToxicPulse','lyricsBloodBeat','lyricsSilverSheen','lyricsGlassFocus','lyricsFluidWave','lyricsRgbFlow','lyricsLoveHeartbeat']) {
    assert.match(css, new RegExp(`@keyframes ${name}`));
  }
  const lyricKeyframes = css.slice(css.indexOf('@keyframes lyricsGoldenShimmer'), css.indexOf('/* ===== Dinecho v1.3.2 smart playlists')) ;
  assert.doesNotMatch(lyricKeyframes, /translateY\(/);
  assert.match(css, /Theme motion is paint-only/);
});

test('every theme has a unique live SVG cursor and live animation', () => {
  assert.match(index, /id="dinechoLiveCursor"/);
  assert.match(index, /id="dinechoLiveCursorArt"/);
  for (const theme of themes) {
    assert.match(renderer, new RegExp('\\b' + theme + ':\\s*`<svg'));
  }
  for (const name of ['cursorGoldenLive','cursorLightLive','cursorDarkLive','cursorPurpleLive','cursorToxicLive','cursorBloodLive','cursorSilverLive','cursorGlassLive','cursorFluidLive','cursorRgbLive','cursorLoveLive']) {
    assert.match(css, new RegExp(`@keyframes ${name}`));
  }
  assert.match(renderer, /function initLiveCursor\(\)/);
  assert.match(renderer, /function setLiveCursorTheme\(theme\)/);
  assert.match(renderer, /applyThemeCursor\(selected\)/);
});

test('song hover and lyric text use custom cursor states with native fail-safe fallback', () => {
  assert.match(css, /html\.dinecho-live-cursor-enabled \* \{ cursor: none !important; \}/);
  assert.match(renderer, /function isLiveCursorRenderable\(\)/);
  assert.match(renderer, /function setNativeCursorFallback\(useCustomCursor\)/);
  assert.match(renderer, /setNativeCursorFallback\(false\);[\s\S]*setLiveCursorTheme/);
  assert.match(renderer, /requestAnimationFrame\(\(\) => \{[\s\S]*setNativeCursorFallback\(ready\)/);
  assert.match(renderer, /function hideLiveCursor\(\)[\s\S]*setNativeCursorFallback\(false\)/);
  assert.match(renderer, /#lyricsBody, \.lyric-line, \.lyrics-heading/);
  assert.match(renderer, /\.song-card, \.song-row/);
  assert.match(renderer, /return 'text'/);
  assert.match(renderer, /return 'action'/);
  assert.match(css, /data-state="action"/);
  assert.match(css, /data-state="text"/);
});

test('lyrics sync no longer treats timeupdate Event as force=true and uses stable scroll', () => {
  assert.match(renderer, /force = force === true;/);
  assert.match(renderer, /timeupdate', \(\) => syncLyrics\(false\)/);
  assert.match(renderer, /function scrollActiveLyricStable\(line, force = false\)/);
  assert.match(renderer, /const maxScroll = Math\.max\(0, mainScroller\.scrollHeight - mainScroller\.clientHeight\)/);
  assert.doesNotMatch(renderer, /scrollIntoView\(/);
});
