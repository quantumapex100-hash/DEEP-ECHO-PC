const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const index = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../src/style.css'), 'utf8');
const renderer = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');

const themes = ['golden','light','dark','purple','toxic','blood','silver','transparent','fluids','rgb','love'];

test('playlist cards have separate Open and Play behavior while song cards stay direct-play', () => {
  assert.match(renderer, /function buildPlaylistCard\(/);
  assert.match(renderer, /openBtn\.textContent = openLabel/);
  assert.match(renderer, /playBtn\.textContent = 'Play'/);
  assert.match(renderer, /card\.addEventListener\('click', open\)/);
  assert.match(renderer, /function buildSongCard\(song, contextSpec = null\)/);
  assert.match(renderer, /card\.addEventListener\('click', start\)/);
  const buildSongCard = renderer.slice(renderer.indexOf('function buildSongCard'), renderer.indexOf('// ================= Song row builder'));
  assert.doesNotMatch(buildSongCard, /Open playlist|playlist-open-btn/);
});

test('artist home cards open a track-list collection before playback', () => {
  assert.match(index, /Top Artist Playlists/);
  assert.match(renderer, /function buildArtistPlaylistSeeds\(songs\)/);
  assert.match(renderer, /async function showArtistPlaylist\(seed, returnTab = 'home'\)/);
  assert.match(renderer, /playlistDetailCount\.textContent = `\$\{songs\.length\} song/);
  assert.match(renderer, /renderPlaylistDetailSongs\(songs, context\)/);
  assert.match(renderer, /async function playArtistPlaylist\(seed, button = null\)/);
});

test('opened playlist detail exposes Play and Shuffle for the whole collection', () => {
  assert.match(index, /id="playlistDetailPlayBtn"/);
  assert.match(index, /id="shufflePlaylistBtn"/);
  assert.match(renderer, /playlistDetailPlayBtn\.addEventListener\('click'/);
  assert.match(renderer, /playSongCollection\(currentPlaylistDetail\.songs/);
  assert.match(renderer, /shuffleAndPlay\(currentPlaylistDetail\.songs/);
});

test('manual lyric scrolling pauses follow and shows Sync to video above player', () => {
  assert.match(index, /id="lyricsSyncBtn"[^>]*>Sync to video<\/button>/);
  assert.match(css, /\.lyrics-sync-float\s*\{/);
  assert.match(renderer, /let lyricsAutoFollow = true/);
  assert.match(renderer, /function pauseLyricsAutoFollow\(\)/);
  assert.match(renderer, /addEventListener\('wheel', pauseLyricsAutoFollow/);
  assert.match(renderer, /addEventListener\('touchmove', pauseLyricsAutoFollow/);
  assert.match(renderer, /lyricsSyncBtn\.addEventListener\('click'/);
  assert.match(renderer, /setLyricsAutoFollow\(true\);\s*syncLyrics\(true\)/s);
  assert.match(renderer, /line && lyricsAutoFollow && document\.getElementById\('lyricsView'\)/);
});

test('premium cursor is compact, internally animated, and still covers all themes', () => {
  assert.match(css, /\.dinecho-live-cursor \{ width: 34px; height: 34px; \}/);
  assert.match(css, /@keyframes cursorEnergyRun/);
  assert.match(css, /\.cursor-live-streak/);
  assert.match(renderer, /style\.transform = `translate\(\$\{liveCursorX - 3\}px, \$\{liveCursorY - 3\}px\)`/);
  for (const theme of themes) {
    const re = new RegExp(`\\b${theme}:\\s*` + '`<svg[\\s\\S]*?cursor-live-streak');
    assert.match(renderer, re);
  }
  assert.match(css, /html\.dinecho-live-cursor-enabled, html\.dinecho-live-cursor-enabled \* \{ cursor: none !important; \}/);
});


test('cursor compositor is transparent and does not use rectangular filter layers', () => {
  assert.match(css, /background: transparent !important; border: 0 !important; outline: 0 !important; box-shadow: none !important;/);
  assert.match(css, /filter: none !important; -webkit-filter: none !important; backdrop-filter: none !important;/);
  assert.match(css, /contain: layout style;/);
  assert.doesNotMatch(css, /contain: layout style paint/);
  const cursorTail = css.slice(css.indexOf('Dinecho v1.3.1 stable theme lyrics'));
  assert.doesNotMatch(cursorTail, /cursor-main-shape[^}]*drop-shadow/);
  assert.doesNotMatch(cursorTail, /cursor-glow-shape[^}]*blur\(/);
  assert.match(css, /@keyframes cursorShapePulse/);
  assert.match(css, /@keyframes cursorStreakPulse/);
  assert.doesNotMatch(renderer, /translate3d\(/);
});
