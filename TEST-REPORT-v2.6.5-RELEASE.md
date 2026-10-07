# DEEP-ECHO 2.6.5 — Release Test Report

Release source: accepted V43 Search + Lyrics Hotfix line promoted to public version 2.6.5.

## Automated validation
- Core Node regression suite: **449/449 PASS**.
- JS/CJS syntax checks: **138/138 PASS**.
- `src/index.html` IDs: **331/331 unique**.
- Release metadata checks confirm package/lock/visible label are **2.6.5**.
- Release workflow requires `DEEP-ECHO-2.6.5-Setup.exe`, `.blockmap`, and `latest.yml` and verifies that `v2.6.5` becomes the latest release.

## Protected engine hashes
The accepted protected engine files remain byte-identical to the V43 tested line:
- `main.js`: `b9e0b10b42a860e835dd6ee78a22a258727d7f7ab0836be23d3a19f168452a89`
- `preload.js`: `43624209119d865ccd2fcca44dda7b1eb49357933301d9fda655858eed979e83`
- `lib/exact-lyrics.js`: `f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4`
- `lib/youtube-captions.js`: `dc89d203b626f2dfa5b9a0e147268b21672a3ab53aa2a3e190e2fa26676e3339`
- `lib/lyrics-timeline.js`: `7e1447ede0b9d5981b9d1b4e857e2dccf710677595c26bdda0bd1cb477317017`
- `src/v238-smart-autoplay.js`: `200514239517b4a4238c2b9dc3e497f17ab63bd1784e6d64c52e076072433048`

## Renderer smoke note
The container does not have the test-only `linkedom` dependency installed, so the renderer smoke step was not run here. `RELEASE-2.6.5.bat` and the GitHub Actions workflow both run `npm ci` followed by the complete `npm test` before any public publish completes; a failure stops the release path.

## Release identity
- App/updater version: `2.6.5`
- Git tag: `v2.6.5`
- Release title: `DEEP-ECHO 2.6.5`
- Installer asset: `DEEP-ECHO-2.6.5-Setup.exe`
- Update channel: `latest`

## Auto-update compatibility
The release remains on the existing GitHub `latest` channel, so an installed 2.6.3 build can discover 2.6.5 directly once the installer, blockmap and `latest.yml` are published.
