# DEEP-ECHO 2.2.6 — Lyrics Sync Recovery

- Invalidates the old persistent lyrics timing cache (`lyrics-cache-v10.json`) so stale timings from earlier builds cannot keep returning.
- Adds a second YouTube caption timing path: if the resolved subtitle URL cannot be fetched directly, yt-dlp materializes JSON3/VTT captions using the same resilient client fallback used by playback.
- Keeps exact caption word timings when available for Word by Word mode.
- Local AI timing now prefers `@whisper-cpp-node/core`; `INSTALL.bat` repairs both supported Whisper entry points if the wrapper package is incomplete.
- Download stream recovery from 2.2.5 is preserved unchanged.
- Existing themes, visualizers, floating overlay, queue, playback recovery and updater behavior are not intentionally changed.
