# DEEP-ECHO 2.3.0 V15 TEST REPORT

## Result

PASS for all automated Node regression tests and static integrity checks available in this environment.

## Automated tests

- Full Node test suite: **314 passed / 314 total / 0 failed**
- V15 playlist-specific tests: **6 passed / 6 total / 0 failed**
- JavaScript/CommonJS syntax checks: **103 checked / 0 failed**
- HTML ID uniqueness: **325 IDs / 325 unique / 0 duplicates**

## V15 cases covered

- Detects `A September Playlist` style search results.
- Detects explicit Playlist/Jukebox/Top Songs/compilation content.
- Detects long POV / “sounds like” mixes such as an 18-minute one-sided-love mix.
- Does not classify normal tracks such as an 8-minute official music video as playlists.
- Does not mistake an ordinary `Official Remix` title for a playlist.
- Wraps the central song-card, song-row, and Continue Listening card builders so playlist Open behavior is consistent across pages.
- Uses the existing DeepEcho playlist-detail view instead of creating a competing playlist UI.
- Uses theme variables for the new Open control.

## Protected systems

Compared with V14, the implementation changes only:

- `src/index.html` (wiring only)
- `src/v2315-global-playlist-open.js` (new)
- `src/v2315-global-playlist-open.css` (new)
- `tests/v2315-global-playlist-open.test.js` (new)
- V15 notes/report

`main.js`, `preload.js`, `src/renderer.js`, Smart Autoplay, Exact Lyrics core, V13 Repair/About Artist, V14 session/mixes/stats, downloads, queue, and stream playback remain unchanged.

## Renderer smoke limitation

`tests/renderer-smoke.cjs` cannot start in this Linux sandbox because the test-only `linkedom` package is not installed. This is the same environment limitation as previous test builds and is not an application-code failure. Real Windows UI testing is still required before release.
