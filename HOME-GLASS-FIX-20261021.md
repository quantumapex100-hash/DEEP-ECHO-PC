# Home and Calm glass transition fix

Home/Calm show and hide fabric controls, firing ResizeObserver callbacks that previously snapped the glass lens to its destination. Layout callbacks now retarget the existing spring without resetting its position or velocity. The lens frame loop also avoids a layout read on each frame. A regression test exercises resize callbacks during both transitions.

Home presentation now coalesces overlapping feed loads and retains already-rendered discovery cards while the feed and taste storage are unchanged. Feed expiry, changed taste, and explicit refresh still update the presentation. Removed the second Home-click feed load because activateTab already invokes it. Home 2.0 reuses unchanged cards, checking node identity so externally refreshed rows can still be updated. Offscreen Home sections use content visibility with remembered intrinsic sizes to reduce entry-frame layout and painting.

Validation: 551 tests pass plus renderer smoke test. The isolated native Electron probe uses populated fixture songs and actual local PCM playback. Search, Settings and Calm to Home recorded 52, 55 and 65 distinct glass positions before settling, with no recorded long tasks. p95 frame intervals were 20.8, 21 and 14.4 ms respectively. Calm entry was moving after 100 ms and settled by 1500 ms. Audio continued in every case. These short local samples are not universal FPS or online streaming measurements.

Only four existing UI files changed: material-controls.js, material-controls.css, v220-home-search.js, and v236-discovery-shelves.js. Hash comparison against ../../backups/before-home-glass-fix-20261021/protected-files.json confirms the other production files are unchanged, including renderer/player, lyrics, downloads and Calm scene engine.

Reproduction: scripts/probe-home-glass.cjs. Evidence: .startup-diagnostic/home-glass-native.json, home-glass-tests-full.txt and home-glass-fixed.png. Fully close and reopen the app to load the fix.
