# TEST REPORT — DEEP-ECHO 2.3.0 V6 TEST

Date: 2026-10-01
Scope: Home horizontal discovery shelves, Popular Artists, New Releases, Search pre-query discovery, openable playlists everywhere, Playlists recommendations, Immersive Player video.

## Automated checks

| Check | Result |
| --- | --- |
| Node regression tests | PASS — 270 / 270 |
| `main.js` syntax | PASS |
| `preload.js` syntax | PASS |
| `src/v236-discovery-shelves.js` syntax | PASS |
| V6 test file syntax | PASS |
| HTML V6 CSS/JS/video wiring | PASS |
| Protected playback / lyrics / mini / overlay file checksums | PASS |

## Smoke-test note

The normal `tests/renderer-smoke.cjs` runner requires `linkedom`. This container did not have the dependency installed, and npm registry access failed with DNS `EAI_AGAIN`, so the renderer smoke runner could not be executed here. The full Node test suite itself completed with **270 PASS / 0 FAIL**.

## Files changed from the 2.3.0 release-ready baseline

- `main.js`
- `preload.js`
- `src/index.html`
- `src/v236-discovery-shelves.css` (new)
- `src/v236-discovery-shelves.js` (new)
- `tests/v236-discovery-shelves.test.js` (new)
- this test report / update notes

No version tag or GitHub release was created.
