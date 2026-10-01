const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('src/index.html', 'utf8');
const js = fs.readFileSync('src/v236-discovery-shelves.js', 'utf8');
const css = fs.readFileSync('src/v236-discovery-shelves.css', 'utf8');
const main = fs.readFileSync('main.js', 'utf8');
const preload = fs.readFileSync('preload.js', 'utf8');


test('2.3 discovery shelves are loaded and Home has Popular Artists + New Releases', () => {
  assert.match(html, /v236-discovery-shelves\.css/);
  assert.match(html, /v236-discovery-shelves\.js/);
  assert.match(js, /Popular Artists/);
  assert.match(js, /New Releases/);
  assert.match(js, /slice\(0, 10\)/);
  assert.match(js, /stableRotate236/);
  assert.match(js, /smartRecommendationProfile/);
});

test('all discovery shelves stay one horizontal row with arrows and See More', () => {
  assert.match(css, /flex-wrap:nowrap!important/);
  assert.match(css, /overflow-x:auto/);
  assert.match(css, /scroll-snap-type:x/);
  assert.match(js, /deepecho-shelf-arrow/);
  assert.match(js, /See More/);
  assert.match(js, /homeView236\.querySelectorAll\('\.home-section'\)/);
});

test('Search is useful before a query and playlist results open as song collections', () => {
  assert.match(js, /Discover before you search/);
  assert.match(js, /search236ForYouGrid/);
  assert.match(js, /search236ArtistsGrid/);
  assert.match(js, /smartOpenSearchCollection = function/);
  assert.match(js, /deepEchoOpenPlaylistCollection/);
  assert.match(js, /Back to Search/);
});

test('Playlists page has recommendations and Top Hits detects playlist-like compilation cards', () => {
  assert.match(js, /Recommended Playlists/);
  assert.match(js, /For You Mix/);
  assert.match(js, /Fresh Finds/);
  assert.match(js, /playlistLike236/);
  assert.match(js, /home236-top-playlist/);
  assert.match(js, /Open Songs/);
});

test('home feed exposes current new releases and caches refreshes safely', () => {
  assert.match(main, /new songs \$\{month\} \$\{year\} latest releases official audio/);
  assert.match(main, /popularArtistSongs: topArtistSongs/);
  assert.match(main, /20 \* 60 \* 1000/);
  assert.match(preload, /getHomeFeed: \(force = false\)/);
});

test('Immersive Player See While Playing uses a muted synchronized in-card video stream', () => {
  assert.match(html, /id="immersiveVideo"/);
  assert.match(html, /id="immersiveVideoToggleBtn"[^>]*>See While Playing</);
  assert.match(preload, /getSongVideoStream: \(song\) => ipcRenderer\.invoke\('resolve-song-video'/);
  assert.match(main, /ipcMain\.handle\('resolve-song-video'/);
  assert.match(main, /bestvideo\[height<=720\]/);
  assert.match(js, /syncVideo236/);
  assert.match(js, /Math\.abs\(target - current\) > \.75/);
  assert.match(css, /immersive-visual-stage\.video-mode/);
});

test('new feature layer does not implement or replace playback, downloads or lyrics engines', () => {
  assert.doesNotMatch(js, /downloadSong\s*=|getLyrics\s*=|playLocal\s*=|streamSong\s*=/);
  assert.doesNotMatch(js, /child_process|ipcRenderer|yt-dlp/);
});
