const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'src', 'v2315-global-playlist-open.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'v2315-global-playlist-open.css'), 'utf8');

function loadDetector() {
  const store = new Map();
  const context = {
    window: { echoAPI: {} },
    document: { querySelector: () => null, createElement: () => ({}) },
    localStorage: {
      getItem: key => store.has(key) ? store.get(key) : null,
      setItem: (key, value) => store.set(key, value)
    },
    setTimeout: () => 0,
    buildSongCard: () => ({}),
    buildSongRow: () => ({}),
    smartBuildResumeCard: () => ({}),
    console
  };
  vm.createContext(context);
  vm.runInContext(js, context, { filename: 'v2315-global-playlist-open.js' });
  return context.window.deepEchoPlaylistDetector;
}

test('V15 playlist detector assets load after V14', () => {
  assert.match(html, /v2314-session-mixes-stats\.css[\s\S]*v2315-global-playlist-open\.css/);
  assert.match(html, /v2314-session-mixes-stats\.js[\s\S]*v2315-global-playlist-open\.js/);
});

test('playlist detector catches playlist-style results including shorter POV mixes', () => {
  const detector = loadDetector();
  assert.equal(detector.isPlaylist({ title: 'A September Playlist ✨', duration: '23:53' }), true);
  assert.equal(detector.isPlaylist({ title: 'Playlist for anyone who needs a break', duration: '23:54' }), true);
  assert.equal(detector.isPlaylist({ title: 'Pov - One-sided love sounds like this', duration: '18:22' }), true);
  assert.equal(detector.isPlaylist({ title: 'Hits of Faheem Abdullah Audio Jukebox', duration: '42:00' }), true);
});

test('playlist detector does not add Open to normal single songs or remixes', () => {
  const detector = loadDetector();
  assert.equal(detector.isPlaylist({ title: 'Sajde - Official Music Video', duration: '8:07' }), false);
  assert.equal(detector.isPlaylist({ title: 'All the Things She Said', duration: '3:35' }), false);
  assert.equal(detector.isPlaylist({ title: 'My Song Official Remix', duration: '4:12' }), false);
});

test('V15 wraps central card, row and resume renderers instead of changing every page separately', () => {
  assert.match(js, /const baseBuildSongCard = buildSongCard/);
  assert.match(js, /const baseBuildSongRow = buildSongRow/);
  assert.match(js, /const baseResumeCard = smartBuildResumeCard/);
  assert.match(js, /if \(!card \|\| !isDetectedPlaylist\(song\)/);
  assert.match(js, /if \(!row \|\| !isDetectedPlaylist\(song\)/);
});

test('detected playlists open through the existing playlist detail system and cache resolved songs', () => {
  assert.match(js, /deepEchoOpenPlaylistCollection/);
  assert.match(js, /returnTab:\s*activeTab\(\)/);
  assert.match(js, /deepeccho-detected-playlist-cache-v1/);
  assert.match(js, /tracklist individual songs official audio/);
  assert.match(js, /Open playlist songs/);
});

test('V15 Open action uses theme variables', () => {
  assert.match(css, /var\(--gold\)/);
  assert.match(css, /var\(--gold-bright\)/);
  assert.match(css, /var\(--panel-2\)/);
});
