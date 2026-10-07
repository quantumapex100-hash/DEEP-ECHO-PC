# DEEP-ECHO 2.6.3 — V38 Zero-Wait Setup Test

V38 is based directly on V37/V36 application code. It changes the source-test setup path only.

## What changed
- `INSTALL.bat` validates an existing `node_modules` first and skips npm completely when the runtime is already complete.
- Before any network install, setup searches neighbouring DEEP-ECHO source folders (V36/V37/etc.) for a complete Windows Electron dependency tree.
- A valid previous dependency tree is reused with an NTFS directory junction, so Electron/ffmpeg packages are not copied or downloaded again.
- An interrupted local `node_modules` is renamed and preserved instead of being slowly deleted.
- If no reusable dependency tree exists, npm runs cache-first with `--prefer-offline`, no audit/fund/progress noise, and downloads only what is missing.
- Optional Whisper/local-AI repair no longer blocks a test setup with additional network installs; normal provider/caption synced lyrics remain available.
- V37 yt-dlp reuse + Node 22+ Deno-skip behavior is preserved.

## Safety / non-regression
No application feature source was intentionally changed from V37. Red Nebulae, Lyrics Sync button fix, Home-first restore, manual Next priority, playback, downloads, lyrics timing/alignment, Exact Lyrics and Smart Autoplay remain on the V37 application code line.

## Important
If V38 reports that dependencies were reused from a V36/V37 folder, keep that older folder until V38 testing is complete because V38's `node_modules` is a fast local junction to that dependency tree.
