# DEEP-ECHO 2.3.0 V6 TEST — Discovery Shelves + Open Playlists + See While Playing

This is a **test source**, not a GitHub release. Package version remains `2.3.0` until the build is tested in the Windows app.

## Added

- Home: **Popular Artists** shelf with up to 10 artist cards.
  - Blends the user's listening taste with current popular artists.
  - Rotates the popular portion during the day so Home does not stay static.
  - Artist cards open their songs before playback.
- Home: **New Releases** shelf with up to 10 songs.
  - Uses current-month/current-year release search.
  - Blends one current taste artist with general new releases.
- Every Home shelf now stays on **one horizontal row** with left/right controls and **See More**.
- Search now has useful content **before typing a query**:
  - For You
  - Popular Artists
- Search playlist/album collection cards now open through the same playlist detail flow, so songs can be inspected before playback.
- Playlists page now has **Recommended Playlists** with openable song lists.
- Top Hits detects playlist/jukebox/mix-style results and opens a generated list of individual songs instead of treating every long compilation as one normal song.
- Immersive Player: **See While Playing**.
  - Loads a muted video stream for the current song inside the existing Immersive Player visual card.
  - Main audio remains the master playback source.
  - Video follows play/pause, seek, playback rate and song changes.
  - Turning video off returns to the original album-art visualizer view.
- New remote Home feed adds current **New Releases** data and uses a 20-minute feed cache to avoid repeated startup searches.

## Protected / unchanged

The following existing engines were intentionally left byte-identical to the 2.3.0 release-ready baseline:

- `src/renderer.js`
- `lib/lyrics.js`
- `lib/lyrics-timeline.js`
- `src/mini.js`
- `src/mini.css`
- `src/floating-lyrics.js`
- `src/floating-lyrics.css`
- `src/immersive-lyrics.js`
- `src/immersive-lyrics.css`
- `src/v150-tools.js`
- `src/v228-visual-polish.js`

Only the Home/search/discovery feature layer, Home feed IPC, preload bridge and Immersive Player HTML wiring were changed.

## Test status

- 270 / 270 Node regression tests: **PASS**
- Changed JavaScript syntax checks: **PASS**
- HTML wiring checks: **PASS**
- Protected-file checksum comparison: **PASS**
- Renderer smoke test could not run in this container because `linkedom` was not available and npm registry access returned `EAI_AGAIN`. This is an environment/dependency-install limitation, not a test assertion failure.

Run `npm ci --no-audit --no-fund` and then `npm test` on the Windows source before release, exactly like the normal DeepEcho release workflow.
