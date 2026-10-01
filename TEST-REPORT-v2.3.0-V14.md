# DEEP-ECHO 2.3.0 V14 TEST REPORT

## Automated regression

- Node regression suite: **308 / 308 PASS**
- Failures: **0**
- V14 focused session/mixes/stats checks: **6 / 6 PASS**
- JS/CJS syntax checks: **101 / 101 PASS**
- HTML IDs: **325 total / 325 unique / 0 duplicates**

## V14 focused checks

- Resume Session stores current song, position, section and collection context.
- Session restore does not record a fake new history play and aborts if the user already starts playback during launch.
- Expiring remote stream URLs are not saved between launches.
- Resume Session can be disabled and its saved snapshot can be cleared.
- Personal Mixes use existing taste signals and open through the existing playable collection/playlist-detail path.
- Listening Stats tracks actual elapsed playback time locally by song, artist and day.
- New V14 UI uses the existing DEEP-ECHO theme variables.

## Protected regression checks

SHA-256 comparison against the V13 source confirmed these files are byte-identical:
- `main.js`
- `preload.js`
- `src/renderer.js`
- `src/v238-smart-autoplay.js`
- `lib/exact-lyrics.js`
- `src/v2313-repair-artist.js`

Only the V14 additive module/style, its test, documentation and two index includes are new/changed.

## Renderer smoke limitation

The normal Node regression suite is green. The repository renderer-smoke harness still cannot start in this sandbox because its test-only `linkedom` dependency is not installed in the runtime (`MODULE_NOT_FOUND: linkedom`). Real Windows validation is therefore still required for startup session restoration timing, live Personal Mix discovery searches and final visual layout.
