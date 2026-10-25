# DeepEcho audit fixes — 22 October 2026

## Implemented

- **Relevant song first:** lyrics/verified-upload bonuses are now gated by song relevance rather than shared artist and generic "official/audio" words. Husn stays ahead of an unrelated Arz Kiya Hai upload; matching Husn lyrics versions remain eligible for the lyrics bonus.
- **One search instead of two:** normal user search no longer waits for a parallel extra lyrics search. It still returns up to 20 ranked songs. Explicit lyric queries and lyric versions in ordinary results remain supported.
- **Stale search protection:** collection searches snapshot their category and request generation. Old success/error responses cannot overwrite a newer category/query. Changing categories or clearing search invalidates in-flight results.
- **Audio recovery without a second extraction:** retain one alternative browser audio container from the same extractor response, with its own headers, availability and expiry. Compatibility recovery tries it once before the existing local-file fallback. Cancelling/replacing songs and forcing classic playback retain their existing paths. The relay, download engine and extractor client order are unchanged.
- **Less visualizer work:** bound exact-colour conversion caching, reuse canvas size until resize notifications, skip word traversal for settled lines, and skip word-paint DOM on hidden main/immersive surfaces. Main and immersive word presentation catches up from the existing clock when opened. No colour quantization or hue/brightness reduction is used.
- **Cold Calm preparation:** immutable clouds, terrain and tree textures are prepared in small idle chunks during startup. Partial assets never become visible; an early visit can still finish them synchronously. Each texture generator has local deterministic random state, keeping idle work separate from meadow interaction/physics.
- **Fluids/RGB backgrounds:** paint the already-soft full-screen field to a bounded smaller reusable surface, then composite to the viewport. Viewport coordinates, cursor physics, colours and apparent blur radius are retained. Both use 65% dimensions; this affects background raster work, not text, controls or the lyrics visualizer. A 45% Fluids experiment did not improve frame pacing in a subsequent run, so the sharper 65% setting was retained.

## Actual verification

**568 Node tests passed, 0 failures, plus renderer integration smoke passed.** Eleven new behavioural regressions cover ranking, one-pass search, stale successes/errors, word presentation, resize invalidation, bounded colours, alternate audio, background geometry/blur and atomic chunked Calm assets. Five historical whole-main-file guards were updated for the explicitly authorized search/audio changes; their individual lyrics and other protected-file checks remain intact.

The hidden native audit exercised 43 normal user-flow checks: ten destinations, playback controls, seek, likes, playlist create/add/play, queue, ordinary search races, all 14 themes and repeat navigation. Additional focused native runs verified stale collection results, paused lyrics re-entry, soft backgrounds and Calm entry. No test window was shown, and no renderer console errors were recorded in completed runs. Test profiles and audio were isolated from the user's saved session/playlists/downloads.

### Online measurements

These are separate runs on the current connection, not controlled network benchmarks or promises for every song.

| Search query | Before results | After results | After first audio |
|---|---:|---:|---:|
| Husn Anuv Jain official audio | 10.5 s | 5.8 s | 9.1 s |
| Tum Hi Ho Arijit Singh official audio | 19.1 s | 10.6 s | 9.4 s |
| Golden Brown The Stranglers | 13.7 s | 6.6 s | 14.9 s |

The old Husn search selected the wrong first song, Arz Kiya Hai; its old 28-second audio wait is not a same-song comparison. Tum Hi Ho used the same upload and previously took 23.5 seconds. Golden Brown used the same upload and previously had not started after 30 seconds while displaying classic fallback.

In a separate real-song test, the first audio play was deliberately rejected. Compatibility IPC reused the stored alternative in **2 ms**, and media played about **0.3 seconds after initial source assignment**, with no second extraction or local download. Total cold click-to-audio remained 11.9 seconds because extraction was still required.

### UI measurements

In the final full journey run, first Home return peaked at 50 ms vs 83 ms previously, and later return at 33 ms vs 50 ms. First Lyrics entry peaked at 100 ms vs 133 ms, with repeat entries at 67 ms. These are maximum animation-frame gaps, not click-handler delays. The first Calm entry in that full run peaked at 167 ms vs 250 ms. Later focused checks also verified paused re-entry at media time 16 seconds: current line 5 and current-word styling were correct while audio remained paused.

UI measurements vary with concurrent PC work, cold graphics setup and offscreen composition. Some stalls remain; this is not a 60/90 FPS guarantee. Native tests were offscreen, capped at 60 FPS, and muted. The soft background appearance was inspected from actual renderer captures.

## Protected scope and remaining limits

Production changes are limited to `main.js`, `lib/lyrics-search-ranking.js`, `src/renderer.js`, and `src/feel-happy.js`.

Byte comparison against the backup confirms that the authoritative syncLyrics function, its 80 ms ticker, the entire get-lyrics provider handler and download pipeline are unchanged. Existing caption alignment, exact lyrics, providers, timeline libraries, Smart Autoplay, relay, preload and startup intro files are unchanged. Rendering changes consume those clocks rather than modifying them.

Online extraction and lyrics providers remain network-dependent. A universal 2–5 second cold play or immediate provider lyrics is not achieved or claimed. Existing exact/language/timing validation was deliberately retained. Actual network download completion, long-session memory use, real account cookies and every possible track were not exhaustively tested.

## Evidence and recovery

Backup: `../../backups/before-user-audit-fixes-20261022/`.

- `.startup-diagnostic/audit-completed-suite.txt` — 568 tests and renderer smoke with the retained 65% setting and chunked texture preparation. `.startup-diagnostic/audit-final-quality-check.txt` rechecks the final focused regressions after reverting the unhelpful 45% experiment.
- `.startup-diagnostic/audit-protected-check.json` — protected-source comparisons.
- `.startup-diagnostic/user-audit-ui-final.json` — 43-flow native regression run.
- `.startup-diagnostic/user-audit-online-fixed.json` — three live song attempts.
- `.startup-diagnostic/user-audit-online-recovery-verified.json` — forced first-format rejection, successful extraction reuse.
- `.startup-diagnostic/user-audit-profile-completed.json` — focused visual/category/paused-lyrics/Calm checks at the retained 65% setting; `user-audit-profile-final-budget.json` records the 45% comparison, with correct paused lyrics and Calm behaviour.
- `.startup-diagnostic/user-audit-fluids-completed.png`, `.startup-diagnostic/user-audit-rgb-completed.png`, `.startup-diagnostic/user-audit-calm-completed.png` — actual-renderer captures at the retained setting.

The initial failed recovery *diagnostic* (`user-audit-online-recovery.json`) returned a function from executeJavaScript, which cannot cross Electron's structured-clone boundary. The harness was corrected to return undefined; the subsequent verified run passed. This was not an app playback failure.
