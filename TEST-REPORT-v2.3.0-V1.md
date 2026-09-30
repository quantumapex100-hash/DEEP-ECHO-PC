# DEEP-ECHO 2.3.0 V1 TEST REPORT

## Added
- Floating Lyrics: slim animated seek/progress bar with current time, duration and click/drag seeking.
- Floating Lyrics: resize-safe progress bar in normal and compact modes, plus screen-aware maximum width.
- Mini Player: Lyrics ON/OFF toggle with current and next lyric lines.
- Mini Player: animated clickable seek bar.
- Mini Player: bounded horizontal resize range with width/height responsive layout.

## Safety scope
Only overlay/mini presentation, window bounds, state mirroring and explicit seek actions were changed.
The playback-start/resolution functions, download/recovery handler, main lyric synchronization engine and main visualizer renderer were not edited by this patch.

## Validation
- JavaScript syntax checks: PASS (main.js, floating-lyrics.js, mini.js, renderer.js, v150-tools.js and new regression test).
- Node regression suite: 246 passed, 0 failed.
- Focused overlay/mini tests: included in tests/v230-overlay-mini.test.js.

## Test status
TEST ONLY. Do not run CLOUD-RELEASE.bat, RELEASE-2.2-END.bat or any publish/release script.
Use INSTALL.bat from an extracted copy for testing.
