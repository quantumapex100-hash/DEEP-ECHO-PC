# DEEP-ECHO 2.3.0 — Final Release Candidate (V15)

Public release title: **DEEP-ECHO 2.3.0**  
Updater / package version: **2.3.0**  
Release tag: **v2.3.0**

## Final source included
This release candidate includes all V6 through V15 additions on top of the original 2.3.0 release-ready baseline, including Discovery Shelves, Exact Lyrics, Smart Autoplay, Precision Sync, per-song Exact Lyrics control, Smart Home/GPU preferences, Repair/Word Sync/About Artist, Resume Session, Personal Mixes, Listening Stats, and Global Playlist Open.

## Local validation before packaging
- Final V15 Node regression suite: **314 / 314 PASS**
- V15 focused tests: **6 / 6 PASS**
- JS/CJS syntax: **103 / 103 PASS**
- HTML IDs: **325 / 325 unique**
- Source/Patch ZIP integrity: PASS
- In the sandbox, renderer smoke was blocked only because `linkedom` was not installed. The normal release workflow runs `npm ci`, which installs `linkedom`, and then runs `npm test` before any installer is published.

## One-run official release path
Run **RELEASE-2.3.0.bat** once from this extracted final source folder.

The BAT:
1. validates package version `2.3.0`,
2. runs `npm ci`,
3. runs the complete automated test suite,
4. syncs this exact final source to `windowsdaiyu-cyber/DEEP-ECHO`,
5. pushes `main`,
6. refuses to continue if remote tag `v2.3.0` already exists,
7. creates annotated tag `v2.3.0`,
8. pushes the tag to trigger the Windows release workflow.

The GitHub Actions workflow then:
1. validates `RELEASE_TOKEN` and tag/package version,
2. installs dependencies,
3. bundles the latest yt-dlp,
4. runs the complete tests again,
5. builds/publishes the Windows NSIS installer to `windowsdaiyu-cyber/DEEP-ECHO-Releases`,
6. applies `RELEASE-NOTES-2.3.0.md`, marks the release latest, and verifies updater assets.

## Required public assets
- `DEEP-ECHO-2.3.0-Setup.exe`
- `DEEP-ECHO-2.3.0-Setup.exe.blockmap`
- `latest.yml`

## Release safety
- Do not manually create or move `v2.3.0` before the release BAT.
- Do not run the release BAT twice while the workflow is already running.
- `latest.yml` is mandatory for the normal in-app updater path.
