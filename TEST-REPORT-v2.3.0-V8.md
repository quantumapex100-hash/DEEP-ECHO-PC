# DEEP-ECHO v2.3.0 V8 TEST REPORT

## Automated checks

- Node subtests: **283 passed / 283 total**
- Failures: **0**
- Syntax checks passed for `main.js`, `preload.js`, all `lib/*.js`, all `src/*.js` and all `tests/*.test.js`.

## Smart Autoplay coverage added

- Home hero Smart Autoplay ON/OFF UI wiring
- Home/Search discovery context eligibility
- Explicit exclusion of Downloads, Liked Songs and Playlists
- Duplicate/alternate-upload song-family detection
- YouTube automatic radio/mix discovery IPC
- Search fallback when radio is unavailable
- Taste ranking using likes, completions, skips, recency and existing recommendation profile
- Same-artist early boost plus anti-loop artist diversity
- Manual queue priority
- Loop-one preservation
- Smart Next wrapper that avoids raw N+1 search-result continuation

## Renderer smoke test

The existing `tests/renderer-smoke.cjs` cannot run in this container because the `linkedom` dev dependency is not installed here. It fails before loading DeepEcho code with `Cannot find module 'linkedom'`. This is an environment/dependency limitation, not a V8 Node-test failure.

## Windows smoke test still required

Before public release, verify at least:

1. Search one song that returns multiple alternate uploads; choose a middle result and let it finish. Confirm the next song is related rather than the next duplicate row.
2. Repeat with a Home Top Hits/New Releases/Made For You song.
3. Confirm Smart Autoplay OFF restores normal section continuation.
4. Confirm Downloads continues only inside Downloads.
5. Confirm Liked Songs continues only inside Liked Songs.
6. Confirm an opened playlist follows that playlist and does not switch to Smart Autoplay.
7. Add a song with Play Next/Queue while Smart Autoplay is active and confirm the manual queue wins.
8. Try at least one video whose YouTube automatic mix is unavailable and confirm the search fallback still finds a related next track.
