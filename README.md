# DEEP-ECHO 2.6.6 — Windows source

Includes Viral Songs, Speed Dial, 12 all-time playlist collections, horizontal Home rows, developer information, theme-independent opaque Sync to video, and search/startup performance improvements. Existing playback, lyrics sync/alignment, Exact Lyrics, themes, mini/floating/immersive players and downloads remain preserved. Android is separate.

## Development
Run INSTALL.bat once for missing runtime dependencies, then START-OFFLINE.bat. Run Run-Checks.bat for automated checks. Restart after source changes. Close installed DeepEcho before launching development; they currently share saved data.

## Release 2.6.6
Double-click RELEASE-2.6.6.bat in this folder. It checks source/version inputs, creates an isolated clone of windowsdaiyu-cyber/DEEP-ECHO, copies only source/release inputs, commits/pushes main and creates v2.6.6. Existing source/release tags are never overwritten. No local npm ci or build runs.

GitHub Actions performs npm ci, full tests, Windows build/publication and verification of DEEP-ECHO-2.6.6-Setup.exe, its blockmap and latest.yml in windowsdaiyu-cyber/DEEP-ECHO-Releases. The source repository needs its existing RELEASE_TOKEN secret with access to the release repository. Complete browser authentication if Git requests it.

Do not move the BAT away from its supporting scripts and source. Do not run it again while the tagged workflow is running. A successful BAT means the cloud workflow was triggered; publication is complete when the workflow succeeds and release assets are present.

Check without Git/network/publishing: RELEASE-2.6.6.bat -CheckOnly.

Local validation: 463 Node regressions and renderer smoke passed. CheckOnly passed using Windows PowerShell. The release push, cloud workflow and installer publication have not been run in this session.
