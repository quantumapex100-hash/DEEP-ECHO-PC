# Theme-aware glass tabs and fabric buttons

Implemented 2026-10-21. All ten sidebar destinations and Search Artist use a spring-driven glass selection lens. Search, Ask DeepEcho, Start listening, Repair and Smart Autoplay use cursor-responsive woven fabric surfaces. All fourteen themes have matching material profiles, colours and motion parameters, adapted from the existing glass and fabric demos.

The implementation is isolated in src/material-controls.js and src/material-controls.css. Existing index.html only imports these two assets. Original DOM labels, click handlers and accessibility states remain in place. The backup manifest confirms all other existing production files, including playback, lyrics, downloads and Calm Yourself, remain byte-identical.

Fabric uses one shared WebGL context and a 49 by 23 mesh, rendering at most 60 times per second during interaction. Settled hover stops requesting frames; leaving releases the visible canvas after relaxation. Glass motion also stops when settled. Reduced motion and unavailable WebGL retain functional styled controls.

Validation: 550 tests passed, zero failures, plus renderer smoke test. The isolated native Electron probe checked all fourteen theme shaders, ten destinations, Search Artist, all five button surfaces and their actions. Local audio continued through navigation and Repair. No renderer errors were recorded. Five brief pointer-motion samples recorded no tasks or frame gaps over 50 ms; p95 frame intervals ranged from 13.9 to 27.8 ms. These are local samples, not a universal FPS guarantee. Search data was controlled and audio local; this probe does not measure online search or streaming latency.

Evidence: .startup-diagnostic/material-controls-native.json and material-tests.txt, with material-*.png visual captures. Reproduction harness: scripts/probe-material-controls.cjs. Backup: ../../backups/before-material-controls-20261021/.

Fully close and reopen the source app to load the new assets.
