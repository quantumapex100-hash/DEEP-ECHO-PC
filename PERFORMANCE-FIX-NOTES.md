# Startup and search performance changes

## Follow-up: Sync button across themes and search playback readiness

Changed-file backup: `../../backups/before-sync-search-20261008-154734` (three production files, hash-verified).

The floating Sync control was inside the player bar. Its backdrop filter clipped the button above the bar; Red Nebulae disables this filter, explaining the theme-specific behavior. The existing button is now mounted at body level and positioned above the player using its actual bounds, with resize observation. Existing click/keyboard follow restoration and the lyric/media clock are retained. A solid background base makes the theme-colored gradient opaque, including translucent panel themes.

Search prebuffer now goes to the first successfully prepared search result instead of the last queued result. Pointer intent can select another result for prebuffering, including cached URLs, without resetting the same prebuffer on repeated hover. Song and artist searches use the same bounded serial warmup. Playback priority, downloads and lyrics support verification are unchanged.

Validation: all 14 selectable themes passed a hidden isolated Electron layout/hit-target check; each Sync button was above the filtered player layer and clickable. Backgrounds were opaque base colors or opaque gradients. Node regression tests and renderer smoke passed; new tests cover theme-independent handlers, first-result warmup, stale results, cached hover and duplicate media preload. No live YouTube latency benchmark or production-profile launch was performed.

Verified source backup: `../../backups/source-before-performance-20261008-152950/source`.
All 195 original files were copied and SHA-256 verified against `manifest.json`.
This is a source backup; no live profile/library backup was taken because the app was not launched and no user data was edited.

## Changes

- Application yt-dlp requests discover system Node asynchronously once, sharing discovery across concurrent requests. Private Deno remains preferred; explicit runtime arguments remain respected. The existing synchronous runtimeArgs API remains available for direct callers.
- Identical read-only searches share pending work and reuse successful output for 60 seconds. Cache is bounded to 40 keys, includes executable, arguments, options/auth and request context, and does not cache errors. Main-process result ranking and lyrics verification still run normally. Playback/download/caption/prefetch and abortable requests bypass this cache.
- Home/Recent speculative card warmup waits 1.8 seconds; stale candidates are discarded after a newer search. Hover intent, actual Play and saved-session resume keep their existing scheduling.
- Superseded lyrics-verification workers stop before issuing another probe. In-flight probes finish normally; current-search lyrics support and synchronization remain intact.

No changes to main.js, preload.js, playback resolver, lyrics engines, themes, mini player, downloads engine or Android. Five historical runtime-helper checksum expectations were deliberately updated for the modified helper; all other protected hashes remain unchanged.

## Validation

- Baseline: 449 Node tests passed; renderer smoke initially unavailable due to missing linkedom.
- Installed linkedom 0.18.13 separately in `../../.dev-tools` without app dependencies or installation scripts.
- After changes: 454 Node tests passed and renderer smoke passed. Smoke uses mocked audio, canvas and IPC; it is not a real Electron/network test.
- New behavior tests cover shared asynchronous runtime discovery, duplicate-search coalescing, cache expiry/auth/query separation, failure retries, uncached playback/downloads, aborted requests and stale deferred card warmup.
- Modified production JavaScript passed syntax checks.

## Windows use

- Double-click Run-Checks.bat for automated tests. It can use this workspace's isolated test dependencies, or normal project dependencies after installation.
- To prepare the real app, run INSTALL.bat once, then START-OFFLINE.bat. Full Electron dependencies and bin/yt-dlp.exe are not installed by this performance change.
- Keep ChatGPT Work and development DeepEcho beside each other. After an edit, finish downloads, close all development app windows, wait for exit, then run START-OFFLINE.bat again. Automatic hot reload is absent.
- Do not run installed and development DeepEcho together yet: their profile, music library and temporary playback cache currently overlap. Development storage isolation remains a separate pending change.
- Build/release scripts were not executed or altered; GitHub publication remains subject to separate approval.

## Remaining real-app checks

Measure fresh launch, first search, repeated search and a new search while Home is loading. Verify song playback, seek/Next/Previous, lyrics support badges, lyrics sync, Exact Lyrics, all themes, mini/floating/immersive players, download completion and offline playback. No real startup/network speed improvement is claimed until these checks run. First searches still depend on YouTube response time and the existing full lyrics-aware ranking pipeline.

## Rollback

Close the development app. Restore lib/ytdlp-smart.js, src/renderer.js, Run-Checks.bat and the five modified historical tests from the source backup. Remove only the newly added performance-search-startup.test.js and this notes file if reverting the change. Do not restore/delete user data or downloads as part of this source-only rollback.
