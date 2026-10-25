# Native buttons and efficient Lyrics entry

Removed the fabric renderer, its input listeners, shared WebGL canvas and button skin rules. The five buttons now inherit their original styles and actions. Glass navigation and Home optimizations remain.

Balanced main Lyrics now uses the existing efficient themed glow from its first visible paint, rather than waiting for adaptive pressure. Its canvas budget starts at DPR 1 with the existing 40 FPS target and unchanged detail/geometry. High/Ultra and immersive visualizer quality stay independent. The efficient surface avoids full-size CSS blur/backdrop passes while retaining the brightness override and theme glow. Timing, current-line selection, audio and downloads are unchanged; removing the three rendering edits from renderer.js reproduces its backup byte-for-byte.

550 tests and renderer smoke pass. The isolated native probe checks twelve transitions across ten tabs with actual local PCM audio and 160 fixture lyric lines. Every transition retained playback and progressing lyric selection; no renderer errors; zero fabric buttons/canvases. Evidence: .startup-diagnostic/lyrics-entry-before.json, lyrics-entry-final.json, lyrics-entry-final.png and normal-buttons-lyrics-final-tests.txt. Harness: scripts/probe-lyrics-entry.cjs.

Performance limits: the final stress sample still includes cold-entry hitches (first Lyrics maximum frame interval 229 ms versus baseline 285 ms; late interval maximum 55 ms versus 278 ms). Other cold sections also show spikes, especially first Calm initialization. This does not establish a completely hitch-free app. First-open GPU/text initialization remains a separate performance limit. No online search/playback repair was attempted after the user explicitly deferred that issue.

Backup: ../../backups/before-normal-buttons-lyrics-entry-20261021/. Four existing production files changed: material-controls.js/.css, renderer.js and v170-experience.css. Fully close and reopen the source app to load changes.
