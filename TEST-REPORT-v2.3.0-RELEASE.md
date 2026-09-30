# DEEP-ECHO 2.3.0 — FINAL RELEASE REPORT

## Release identity
- Public title: **DEEP-ECHO 2.3.0**
- Package/updater version: **2.3.0**
- Tag: **v2.3.0**
- Installer target: `DEEP-ECHO-2.3.0-Setup.exe`
- Updater metadata: `DEEP-ECHO-2.3.0-Setup.exe.blockmap` + `latest.yml`

## Automated verification completed in release preparation
- Node regression tests: **263 / 263 PASS**.
- JavaScript syntax checks: PASS for `main.js`, `preload.js`, `src/v200.js`, `src/v228-visual-polish.js`, `src/immersive-lyrics.js`, and `src/v150-tools.js`.
- GitHub Actions workflow YAML parse: PASS.
- `package.json`, `package-lock.json`, and lock root package all report **2.3.0**.
- Test-only product labels were removed from the shipping UI.
- 2.3.0 What's New content was added to the installed-app update experience.
- The release workflow no longer uses the previously unsupported `isLatest` JSON verification; it verifies `/releases/latest` and updater-critical assets directly.

## Protected V5 implementation
The following files are byte-identical to the approved V5 test source:
- `main.js`
- `preload.js`
- `src/renderer.js`
- `lib/lyrics.js`
- `lib/lyrics-timeline.js`
- `src/floating-lyrics.html`
- `src/floating-lyrics.js`
- `src/floating-lyrics.css`
- `src/mini.js`
- `src/mini.css`
- `src/immersive-lyrics.js`
- `src/immersive-lyrics.css`

## Release safety gate
`RELEASE-2.3.0.bat` performs `npm ci` and the complete `npm test` before any commit/tag push. If dependency installation, regression tests, or renderer smoke testing fail on the Windows release machine, the script exits before creating `v2.3.0`.

The GitHub Actions workflow repeats dependency installation and the complete automated test suite before building/publishing the installer, then verifies that the latest public release contains the installer, blockmap, and `latest.yml`.
