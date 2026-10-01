# DEEP-ECHO 2.3.0 V9 TEST REPORT

## Automated Node suite

- 61 Node test files executed.
- 288 tests pass.
- 0 Node test failures.
- Added V9 regression coverage for:
  - multi-anchor piecewise lyric timing through an inserted video scene,
  - caption/actual-audio Precision Sync wiring,
  - Exact Lyrics persistent ON/OFF switches,
  - disabling Exact Lyrics cache takeover,
  - version/duration-aware LRCLIB fallback matching,
  - whole-word version detection (`Alive` is not `Live`).

## Syntax / static validation

Passed:

- `node --check main.js`
- `node --check preload.js`
- `node --check src/renderer.js`
- `node --check lib/lyrics.js`
- `node --check lib/youtube-captions.js`
- `node --check lib/exact-lyrics.js`
- `src/index.html` ID scan: 316 IDs, 0 duplicate IDs.

## Renderer smoke test limitation

The bundled renderer smoke test could not execute in this Linux work container because the extracted source does not include `node_modules` and `linkedom` is not installed in the environment. This is an environment/dependency limitation, not a reported application test failure. The Node regression suite and syntax/static checks above passed.

## Windows tests still required before public release

1. Play an official video with a long intro or dialogue and verify the lyrics re-align after Precision Sync finishes.
2. Test a track with repeated chorus lines to confirm occurrence-aware anchors stay on the correct chorus.
3. Test a song with no useful YouTube captions; if the local Whisper model already exists, verify actual-audio Precision Sync can upgrade timing.
4. Toggle Exact Lyrics OFF in the Lyrics section and confirm the button shows OFF and cannot scan.
5. Restart DEEP-ECHO and confirm the Exact Lyrics switch state persists.
6. With Exact Lyrics OFF, play a song that has an Exact Lyrics cache entry and confirm the base engine is used instead.
