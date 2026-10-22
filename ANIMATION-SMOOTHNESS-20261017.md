# Visualizer and particle smoothness — 17 October 2026

## Change

- The adaptive main Lyrics path now bypasses the canvas's own repeated theme drop-shadow/contrast/saturation passes. The earlier optimization only removed the parent's filter; v228/v273 still filtered the changing canvas bitmap separately.
- The existing canvas aura, theme colors, particles, spectrum geometry and reactive signal remain. Default brightness skips another bitmap pass while constrained; custom brightness still applies through the existing control. High/ultra retain the original canvas filter chain.
- Under adaptive pressure, app cards/controls no longer repeatedly sample and blur the moving particle background. The lighter treatment stays active for that Lyrics visit, so a temporary FPS recovery does not immediately restore expensive effects and cause another stall. Theme fills/borders remain.
- The constrained lighting uses its soft gradients without another large blur/blend pass. The core retains transform-based breathing. Idle lyric rows use an identity-free transform instead of forcing a 3D transform on every row.
- Constrained visualizer target is 30 FPS, with remainder-preserving pacing and a small timestamp tolerance. This avoids uneven frame skipping against 60/120Hz display ticks and catch-up bursts after suspension.

## Boundaries

Production edits: `src/renderer.js` (visualizer drawing region only), `src/v170-experience.css`, `src/v228-visual-polish.js` (brightness presentation only).

Renderer bytes before `let visualizerLastPaintAt = 0;` and after `function startLyricsVisualizer()` match the pre-change backup. Playback, analyser/energy extraction, lyric clock/selection, exact word timing, download and IPC code were not edited.

Backup: `../../backups/before-animation-smooth-20261015/` (work began on 15 October and continued on 17 October).

## Verification

- `node tests/run-tests.cjs`: 509/509 Node tests and renderer DOM integration smoke passed. New behavioral coverage checks even frame pacing at 60/120Hz, recovery after a long stall, and custom brightness/reset behavior.
- The first full suite run overlapped an expensive native benchmark and its 10-second playback fixture timed out. Re-running after the benchmark finished passed; no timeout was relaxed.
- Native Electron software-graphics test: isolated app/profile/library, 200 lyric rows, actual generated PCM WAV through the existing media player and captureStream analyser. Output was muted at webContents level, not by replacing the analyser. This is a controlled audio fixture, not a streamed YouTube song or a mouse-hover test.
- Pre-fix: 17 UI RAF callbacks in ~3 seconds, p95 interval 333 ms. After: 169 callbacks, p95 28 ms, worst 35 ms. UI callback rate is about 56 FPS in the successful final sample; canvas intentionally paints at 30 FPS. These are short samples on this machine, not a guarantee for all songs, themes, hardware or system loads.
- Final audio check: analyser signal true; clock 5.067 s; expected/current lyric index both 2; pause held; seek to 13 s selected line 6; resume advanced playback.
- Evidence: `.startup-diagnostic/lyrics-real-audio-before.json`, `lyrics-real-audio-final.json`, and corresponding PNGs. The probe now logs milestones and prevents background/occlusion throttling during measurements. Earlier approximately 1 FPS occluded-window runs were invalid and are not used as evidence.

Restart the running source app to load these files. No installer or release was published.
