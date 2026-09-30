# DEEP-ECHO 2.2.5 — Download recovery hardening

This hotfix is intentionally narrow. Existing playback, queue, lyrics UI, themes, visualizers, updater, playlists and library behaviour are preserved.

## Download fix

- Permanent downloads still try the original yt-dlp path first.
- YouTube verification/access failures now retry with the same `android` client path that is already proven to recover normal playback.
- Embedded-client fallback is aligned with the playback resolver.
- If yt-dlp extraction is still blocked but DEEP-ECHO can resolve a playable audio URL, the Download button saves that resolved media stream directly to the permanent Downloads library.
- Direct-stream recovery preserves the media container (`m4a`, `webm`, etc.), reports progress, supports cancellation, and uses `.part` files until completion so broken partial files are not added to the library.
- Opt-in browser-cookie fallback remains available and is not enabled silently.

## Local AI lyrics terminal error

- `whisper-cpp-node` import failures are now handled as an optional dependency failure instead of dumping the long missing `dist/index.mjs` path repeatedly.
- `INSTALL.bat` verifies the local transcription package and attempts a forced repair when npm left an incomplete install.
- Provider/caption lyrics remain active even if the optional local AI transcription engine is unavailable.

## Test status

- 218 Node regression tests pass in the source workspace, including download retry, direct-stream recovery, cancellation/progress, playback recovery, queue, lyrics, themes and updater coverage.
- Renderer smoke requires installed development dependencies (`npm install`) and is intended to run on the Windows test machine/source environment.
