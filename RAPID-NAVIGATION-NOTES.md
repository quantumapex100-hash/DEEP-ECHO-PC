# Rapid navigation and autoplay preparation — 13 October 2026

This extends the previous single-next preparation in the current Windows development source.

- Rapid cold selections within 140 ms are coalesced over a 70 ms window before requesting extraction. Every Next/Previous tap still updates the selection/order; superseded selections never start a new resolver. Prepared selections bypass this wait. Existing request ownership and main-process cancellation remain authoritative.
- While the confirmed current song is playing, lookahead resolves up to ten upcoming songs **serially**, not in ten concurrent yt-dlp processes. The imminent song has Next priority; the remaining nine have idle priority. Only the closest three can buffer media bytes: the existing one-song warmer plus at most two additional muted Audio objects. None calls `play()`.
- A new selection, pause, quality change, game mode or stale request stops the old preparation loop. Game mode retains its one-song/near-end limit. Prepared source storage remains bounded to sixteen entries, and successful played sources are retained for Previous.
- Smart Autoplay exposes a copied preview of its existing taste-ranked candidate order for the same lookahead coordinator. Manual queue priority, family filtering, scoring, history, loop-one, seed/session rules and playback recovery remain intact. No recommendation algorithm was replaced.
- Search rows render in batches of twelve, yielding between batches so input can run. A superseded query cannot append rows or overwrite the newest result status.

Limits: ten prepared URLs do not mean ten fully downloaded songs. Preparation needs time while the current song plays. A not-yet-prepared, expired or unreachable internet song can still wait; instant playback for every fresh song or ten immediate cold skips is not guaranteed. No synthetic benchmark is presented as a live YouTube latency measurement.

Validation:

- All 492 Node checks plus the renderer DOM smoke check pass.
- The real renderer fixture verifies Home/Search selections, rapid A/B/C/D selection, ten rapid Next taps with at most two resolver IPC calls, Previous, manual queue order, local bypass, stale Search rendering, autoplay continuation and stale-recommendation protection. The test now requires its completion marker, so exiting with an unfinished asynchronous fixture cannot falsely pass.
- Behavioral lookahead checks verify ten serial resolutions, Next/idle priority, three media warmers, cancellation after a newer click, cache reuse, muted/bounded buffers, game mode and taste/manual-queue ordering.
- An isolated Electron test using a local AAC fixture ran the actual lookahead/buffer functions. Ten URLs resolved; current audio kept playing; the two extra warmers were muted; only the main player called `play()`. The prepared Next switch took 12 ms, an audio capture track remained available, and seeking to five seconds succeeded. This is real Electron media with a controlled local source, not a live YouTube benchmark.
- `main.js`, `lib/ytdlp-smart.js`, preload, download code, lyrics providers, Exact Lyrics and caption/sync engines are unchanged in this task. Existing theme and Calm Yourself code was not edited.

Source changes: `src/renderer.js` and the preparation/preview surface in `src/v238-smart-autoplay.js`. Historical hash expectations for the intentionally changed autoplay file were updated; protected lyrics/download hashes were retained. Launch/release BAT files, app version and Android are unchanged. No release was run.

Backup and evidence: `../../backups/before-rapid-navigation-20261013/` contains the previous renderer, autoplay, main and UI fixtures, `full-tests.log`, and `native-lookahead-results.json`.

Close the existing development app and open `START-OFFLINE.bat` in this source directory to load these changes. `START-PLAYBACK-DEBUG.bat` remains available for actual internet timing logs.
