# DEEP-ECHO 2.6.3 — V37 Fast Setup Test Report

Base: V36 Red Nebulae + performance test build.
Scope: setup/runtime reuse only; application feature engines are unchanged.

## Validation
- Full Node regression suite: **425/425 PASS**.
- V37 fast-setup focused checks: **4/4 PASS**.
- JS/CJS syntax: **133/133 PASS**.
- Main `src/index.html`: **331/331 IDs unique**.
- V36 → V37 tree diff confirms application code is unchanged. Only `INSTALL.bat`, `Setup-YtDlp.bat`, V37 notes/marker, and the new V37 setup test were added/changed.

## Fast-path behavior
1. Reuse local `bin/yt-dlp.exe` if valid.
2. Reuse persistent `%LOCALAPPDATA%\\DEEP-ECHO\\runtime` cache.
3. Reuse yt-dlp from another extracted sibling `DEEP-ECHO*` source folder (useful for the cancelled V36 setup where yt-dlp already finished downloading).
4. Reuse the installed public DEEP-ECHO copy or system yt-dlp.
5. Download yt-dlp only if none of the above exists.
6. If Node 22+ exists, use it and skip the ~40 MB Deno download.
7. On older Node only, reuse cached/neighbor/installed/system Deno before considering a one-time Deno download.

## Protected systems
Playback, manual Next implementation, Smart Autoplay, Downloads, lyrics timing/alignment, Exact Lyrics, Word by Word, Pronunciation, session restore, Red Nebulae, visualizer and UI feature code are byte-identical to V36.
