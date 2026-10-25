# DeepEcho PC playback priority update — 2026-10-13

The current complete working PC source was updated in place. Version remains 2.6.6. No release/build/publish scripts were run. Android was not accessed.

## Bottleneck and scope

The screenshot's “Preparing compatible audio” is the existing compatibility recovery path. It previously materialized a complete temporary song before playback could start. Direct extraction errors also enter the classic full-file path. The exact failure of the user's selected song was not reproduced: public live probes encountered an access/age restriction (~21.7 s) and an extraction timeout (~15.1 s), without obtaining a playable source. These are not baseline song startup measurements.

V35 single-flight cancellation and priority ordering were present. The prepared-URL renderer shortcut bypassed main-process cancellation; cached failures went straight to full-file recovery; Next could skip an expired renderer-cache entry indefinitely; aborted same-song jobs could be reused on A→B→A; old navigation could retry after newer selections. Search warmed up to six results; Autoplay warmed two candidates with ordinary search priority.

## What changed

- Existing yt-dlp resolver now keeps selected-source HTTP headers and signed expiry. Progressive GoogleVideo audio is served by a private random-ticket 127.0.0.1 transport adapter with byte-range seeking, backpressure and cancellation. Audio starts from arriving data, with no full-file preparation requirement. Other/HLS sources keep the existing direct path. No second resolver or audio engine.
- Cache remains song/quality keyed, capped at 64 sources, and expires at the shorter of eight minutes or the signed URL expiry minus one minute. Failed sources get one fresh resolution before the retained classic safety fallback. Extractor/codec/network failures can still require that fallback; zero-wait startup is not guaranteed.
- Every remote Play, including prefetched/history playback, enters the existing main priority path. Valid cache hits return immediately. New selections abort other resolves and classic materialization; repeated same-song work remains single-flight. Local files start directly and send only a non-blocking cancellation notice.
- Search automatically warms two results, the pending warmup queue is capped at two, intent can replace low-value warmup, and current resolution pauses background warming. Immediate Next remains one target; expired entries are removed. Home and Autoplay discovery defer new work while user playback is resolving.
- Autoplay ranking/manual queue architecture remains; prewarm is one hidden idle-priority candidate. Tiny navigation ownership checks prevent stale recommendation results or old Next retry loops overriding newer intent. Manual Queue/Play Next retains priority.
- Existing analyser uses the relay's CORS path; local/offline/karaoke sources clear that mode. Lyrics, Exact Lyrics, captions/reference/timeline engines and preload IPC APIs were not rewritten. Download blocks remain byte-identical under their existing tests.
- Calm Yourself animals are disabled and their script is no longer loaded. Birds remain. The unused standalone wildlife module is retained as recoverable source.

## Verification

474 Node tests passed, plus the renderer integration smoke test. New focused scenarios cover Home 10 selections, Search 10 selections, rapid A/B/C/D (only D plays), rapid Next 10, Previous, manual queue ordering, local network-resolver bypass, hidden Autoplay continuation, one recommendation prewarm, manual queue before Autoplay, stale recommendation vs explicit click, single-flight promotion, cache reuse/expiry/fresh resolve, A→B→A after abort, byte ranges, expired/unknown relay tickets and old transfer cancellation.

Real isolated Electron 31 media test: synthetic 20-second AAC/M4A; origin sends an initial chunk and delays the remainder by one second. Full-file preparation: **1030 ms**. Optimized first “playing” event: **140 ms**. Seeking reached **12.000 seconds**; duration stayed **20 seconds**; captureStream exposed **1 audio track**. A separate Node slow-source test verifies first bytes precede transfer completion and extractor headers/ranges survive.

These are controlled fixtures, not promises about YouTube. Home/Search/navigation/lyrics/UI regression scenarios use controlled IPC/audio. Live downloads, exact OCR and authenticated YouTube streaming were not exercised. Internet quality, YouTube access restrictions, extractor runtime and upstream response time still matter.

## Run and diagnostics

Close DeepEcho, then double-click **START-OFFLINE.bat** in this source directory. The existing **Test-Chalao.bat** development workflow remains. To collect timings instead, close DeepEcho and use **START-PLAYBACK-DEBUG.bat**; log is saved to %LOCALAPPDATA%\DeepEcho-PC-Development\playback-debug.log. Diagnostics are opt-in and record track IDs/stages/times, never signed media URLs. Renderer timings can also be inspected via window.deepEchoPlaybackTimings(). Run npm test for all regression checks; no install/build is part of that command.

Before-change source copies, test expectations, full test output and fixture results are in:
C:\Users\windo\OneDrive\Documents\DeepEcho-PC-Development\backups\before-fast-stream-20261013

## Exact files changed/added

Existing app files changed:
- main.js
- src/renderer.js
- src/v238-smart-autoplay.js (priority and stale-intent guards only; ranking logic retained)
- src/feel-happy.js (animals disabled)
- src/index.html (wildlife script removed)

Added:
- lib/playback-relay.js
- START-PLAYBACK-DEBUG.bat
- tests/playback-priority.test.js
- tests/playback-relay.test.js
- tests/playback-ui.cjs
- tests/playback-ui.test.js
- PLAYBACK-PERFORMANCE-NOTES.md

Existing test expectations/fixtures changed:
- tests/performance-search-startup.test.js
- tests/playback-priority.test.js
- tests/playback-relay.test.js
- tests/v227-ui-audio-regression.test.js
- tests/v261-v24-smart-discovery.test.js
- tests/v266-v31-pron-search-hotkey.test.js
- tests/v267-v32-playback-recovery-stability.test.js
- tests/v268-v33-instant-play-warmup.test.js
- tests/v269-v34-startup-performance.test.js
- tests/v270-v35-instant-playback-priority.test.js
- tests/v271-v35-all-surfaces-instant.test.js
- tests/v273-red-nebula-performance.test.js
- tests/v40-floating-nebula-polish.test.js
- tests/v41-nebula-dot-core.test.js
- tests/v42-v265-fast-resume-premium-nebula.test.js
- tests/v43-search-lyrics-init-hotfix.test.js

Historical tests that froze the entire main/Autoplay file or demanded six warmups/the bypass shortcut were updated for this explicitly authorized playback evolution. Lyric/preload/download engine hash checks remain, and behavioral tests were added rather than relying on new file hashes alone.

## Rollback

Close DeepEcho before restoring backup copies of the five changed existing app files to their original locations (backup renderer.js and feel-happy.js belong under src). Newly added transport/debug files are inert after restoring original main.js. Restore test expectations from tests-before-expectations if reverting. Do not delete the profile, songs, downloads or library. Backups are outside the app source and are not release assets.
