# DEEP-ECHO 2.3.0 — Release Candidate

Public release title: **DEEP-ECHO 2.3.0**  
Updater / package version: **2.3.0**  
Release tag: **v2.3.0**

## One-run release path
Run **RELEASE-2.3.0.bat** once from the extracted release-ready source folder.

The BAT validates version `2.3.0`, installs dependencies, runs the full automated test suite, syncs the final source to `windowsdaiyu-cyber/DEEP-ECHO`, pushes `main`, creates annotated tag `v2.3.0`, and pushes that tag. The tag push starts exactly one GitHub Actions release workflow.

The workflow then:
1. validates `RELEASE_TOKEN` and tag/package version,
2. installs dependencies,
3. bundles the latest yt-dlp,
4. runs the full automated test suite,
5. builds and publishes the Windows NSIS installer to `windowsdaiyu-cyber/DEEP-ECHO-Releases`,
6. applies `RELEASE-NOTES-2.3.0.md`, marks the release latest, and verifies the published updater assets.

## Expected public assets
- `DEEP-ECHO-2.3.0-Setup.exe`
- `DEEP-ECHO-2.3.0-Setup.exe.blockmap`
- `latest.yml`

## Release safety
- Do not manually create or move `v2.3.0` before running the release BAT.
- Do not run the release BAT a second time while the workflow is already running.
- Existing users must receive `latest.yml`; without it the in-app updater cannot complete the normal update path.
