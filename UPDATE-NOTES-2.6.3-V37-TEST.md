# DEEP-ECHO 2.6.3 — V37 Fast Setup Test

V37 keeps the accepted V36 Red Nebulae/performance code and changes only development/test setup behavior.

## Fast setup changes
- `Setup-YtDlp.bat` now reuses a valid local `bin\\yt-dlp.exe` immediately instead of forcing a refresh.
- Fresh source folders reuse a persistent `%LOCALAPPDATA%\\DEEP-ECHO\\runtime` cache when available.
- Fresh source folders also reuse a completed yt-dlp/Deno from a neighboring extracted `DEEP-ECHO*` source folder, then try the already-installed public DEEP-ECHO app before downloading anything.
- A system yt-dlp on PATH is also reusable.
- Node 22+ is treated as the supported YouTube JavaScript runtime already supported by `lib/ytdlp-smart.js`, so the ~40 MB Deno download is skipped on those PCs.
- Cached/installed/system Deno is reused before any network fallback on older Node installations.
- yt-dlp and Deno download only when no reusable working copy/runtime exists.
- `INSTALL.bat` uses npm `--prefer-offline` so the normal npm cache can accelerate repeat test-folder setup.

## Protected behavior
No playback, lyrics, Exact Lyrics, Smart Autoplay, download, renderer feature, theme, Red Nebulae, session restore, or manual-Next implementation file is changed by V37.

## Expected result for the current PC
Because DEEP-ECHO 2.6.3 is already installed — and the cancelled V36 folder may already contain a completed yt-dlp — a fresh V37 folder should normally reuse yt-dlp rather than redownloading ~17 MB. If the installed Node is 22 or newer, it should print `40MB Deno download SKIP` and avoid the large Deno download entirely.
