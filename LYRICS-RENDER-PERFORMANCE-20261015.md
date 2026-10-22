# Lyrics rendering changes — 15 October 2026

Version remains 2.6.6. Presentation/rendering changes only; no publication.

## Changes

- Removed competing v170 audio-variable and lyric-pulse writers. The v169 presentation bridge is the single owner of these effects.
- Animated lyric variables are applied to visible current lines instead of :root; lighting variables are scoped to the lighting layer and Dragon background. Unchanged values do not issue additional style writes. Hidden/game-mode presentation work is skipped; active-line ownership remains with the existing sync engine.
- Player waveform painting is capped around 30 fps while the existing UI FPS monitor remains intact.
- The existing adaptive pressure monitor can select a bounded main Lyrics canvas budget: 24 fps, DPR 1 and lower particle detail. This budget stays stable for the Lyrics visit and clears on leaving or opening immersive/changing quality. Theme geometry, colors, particles and the shared core glow remain; expensive separate shape blurs and large CSS filters are reduced under pressure. Explicit high/ultra and immersive budgets retain their prior behavior.
- The cached drawing adapter binds native canvas methods to their actual receiver, forwards colors/geometry and limits only shadow blur in constrained mode.

## Preservation and verification

The entire renderer is identical outside the visualizer drawing block when normalized against the pre-change source. LyricsPlaybackClock, syncLyrics, active-line selection, word timing/highlighting, lyric ticker, matching, seek, providers and playback logic are unchanged. Main process, preload, timeline, captions and Exact Lyrics hashes match the pre-change manifest. Search/runtime and download code were not edited.

507 Node checks plus renderer integration smoke passed. Focused tests cover current-line scoping, stable value deduplication, hidden/game mode, immersive effects, adaptive budget boundaries and native canvas receiver/geometry preservation. JS syntax checks passed.

Native Electron software-graphics probes used an isolated profile, 200 synthetic lyric rows and a controlled audio-energy snapshot. Screenshots confirmed the actual Lyrics view, all 200 rows, current line 0 and the themed visualizer. Final stress fixture entry was 60 ms; canvas drawing stayed at or below 13 ms in that run. Software painting still produced larger frame gaps (p95 313 ms); this is not a claim that all lag is eliminated or every song/device runs at 60 fps. Earlier probes where session restore switched back to Home, or where a hidden window throttled RAF, were discarded as invalid Lyrics measurements.

## Use and rollback

Close development DeepEcho and relaunch START-SAFE-GRAPHICS.bat. No reinstall is needed. Main/mini/floating clocks and user data are unchanged.

Backup: ../../backups/before-lyrics-lag-20261014. It contains the preceding renderer, presentation files, CSS, protected-hashes.json and final test evidence. The two original presentation modules are also available in the verified 8 October complete source backup; their code had not changed before this task. Restore only these rendering/presentation files with the app closed if needed. Do not restore/delete library files or user profiles.

Production files changed: src/v169-lyrics-presentation.js, src/v170-experience.js, src/v170-experience.css and the drawing block in src/renderer.js. Added behavioral tests: tests/lyrics-presentation-performance.test.js. Updated historical startup assertion: tests/v269-v34-startup-performance.test.js, to expect one deferred presentation loop instead of competing pulse loops.
