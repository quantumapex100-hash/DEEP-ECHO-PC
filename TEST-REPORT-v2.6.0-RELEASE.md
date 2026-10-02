# DEEP-ECHO v2.6.0 Release Test Report

Release lineage: accepted V22 (V21 → V20 → V18). V19 is excluded.

## Automated checks

- Node regression suite: **346/346 PASS**
- JS/CJS syntax checks: **118/118 PASS**
- `src/index.html` IDs: **325/325 unique**
- Release metadata tests: package/package-lock/workflow/release script all target **2.6.0**
- Core playback/renderer/accepted lyrics-reference/Exact Lyrics files remain byte-identical to V22 where release metadata did not require changes.

## Renderer smoke note

The sandbox could not complete `npm ci` because dependency installation stalled in this environment, so the renderer-smoke harness could not load its test-only `linkedom` dependency here. `linkedom` remains pinned in `devDependencies` and the GitHub Actions release workflow runs a fresh `npm ci` before `npm test`; the cloud release must pass that step before publishing.

## Required published assets

- `DEEP-ECHO-2.6.0-Setup.exe`
- `DEEP-ECHO-2.6.0-Setup.exe.blockmap`
- `latest.yml`
