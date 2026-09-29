# DEEP-ECHO 2.0.0 verification

- Baseline v1.7.2: 174 existing Node checks passed before changes.
- Final: 185 Node checks passed, 0 failures. Existing version/name assertions updated to the requested release; original DOM smoke harness refreshed for current deferred lyrics and canvas behavior.
- DOM integration passed: stale playback/lyrics responses, downloads, like/playlist persistence, queue/loop, theme switches, loading progress and failure state. IPC/audio/canvas mocked in this test.
- Headless Chromium UI: all production renderer scripts loaded; no page errors or duplicate IDs. Setup, theme application, preview/cancel rollback, performance selection, download/storage/repair/about/overlay dialogs exercised.
- Real HTMLAudioElement played a generated 8-second WAV fixture in Chromium; pause and saved position verified. End-of-song sleep control kept the queued next song from starting.
- Stale search result test passed: late older search did not replace the newest result.
- Dialog verified to fit 800×600; desktop screenshots at 1440×1000. Screenshots are actual rendered app code with mocked Electron services, not Windows desktop screenshots.
- New unit/service checks include actual child-process cancellation signaling (mock process), quality format selection, measured normalization behavior, session sanitization, IPC registration/storage/repair, and update checksum/tamper/old-version handling (mock HTTPS server).

## Not verified here

Windows installer creation/execution; actual Windows device audio, mini-window/global-key/game overlay behavior; live YouTube stream/download availability and lyrics coverage; a hosted release-server update. These require Windows and the relevant services. No claim that all bugs or all platform-specific glitches are eliminated.

## Re-run

`npm test` after installing project dependencies. Optional rendered test: install Playwright in a separate test environment, install/select Chromium, then `node tests/browser-v200.cjs`. Set `DEEP_ECHO_CHROMIUM` for a custom executable. Browser test mocks Electron APIs and uses `tests/fixtures/tone.wav`.
