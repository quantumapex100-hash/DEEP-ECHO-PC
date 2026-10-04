# DEEP-ECHO 2.6.3 — Release Test Report

## Automated regression
- Full Node regression suite: **414 / 414 PASS**.
- Focused V31–V35 playback/search/lyrics/download suite: **28 / 28 PASS**.
- Release-specific 2.6.3 checks: **4 / 4 PASS**.
- JS/CJS syntax validation: **130 / 130 PASS**.
- `src/index.html` IDs: **331 total / 331 unique / 0 duplicates**.

## Protected-engine verification
Compared with the accepted V35 All-Surfaces test source, the following files are byte-identical in the 2.6.3 release package:
- `main.js`
- `preload.js`
- `src/renderer.js`
- `lib/ytdlp-smart.js`
- `lib/youtube-captions.js`
- `lib/lyrics-reference.js`
- `lib/exact-lyrics.js`
- `lib/lyrics.js`
- `lib/lyrics-providers.js`
- `src/v238-smart-autoplay.js`

This keeps the accepted V35 playback implementation, permanent Download flow, lyrics timing/alignment, Exact Lyrics, Word by Word, Pronunciation, captions/providers and Smart Autoplay intact while promoting the build to version 2.6.3.

## Renderer smoke
The Node regression portion passes 414/414. The standalone renderer smoke could not run in this sandbox because test-only `linkedom` is unavailable and its install attempt timed out. The one-click release script and GitHub workflow both run `npm ci` before `npm test`, so the release stops before tagging/publishing if dependency installation or the complete test preflight fails on the real release machine/runner.

## Release identity
- App/updater version: `2.6.3`
- Git tag: `v2.6.3`
- Release title: `DEEP-ECHO 2.6.3`
- Installer asset: `DEEP-ECHO-2.6.3-Setup.exe`
- Update channel: `latest`
