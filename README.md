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

## Retry after the schema-utils 404

The app version bump accidentally altered two third-party dependency entries. They are restored exactly to the original lockfile; @develar/schema-utils remains 2.6.5, while app metadata remains 2.6.6. A clean isolated npm ci with installation scripts disabled downloaded all 349 packages successfully. 464 regression tests and renderer smoke passed.

Run RETRY-RELEASE-2.6.6.bat in this folder. It uploads the corrected source/workflow and creates source tag v2.6.6-build2 without moving the failed v2.6.6 tag. The Windows installer, public release and updater version remain 2.6.6. Re-running the old failed workflow uses its old lockfile and does not pick up this fix. GitHub still performs the complete clean install, including installation scripts, before build/publish.

Release checkout now lives under LocalAppData/DEEP-ECHO/ReleaseWork outside OneDrive. The script initializes a repository and fetches only the current main snapshot using HTTP/1.1, with up to three attempts; this avoids clone's interactive deletion loop after interrupted transfers. The updated download and source-copy path passed PrepareOnly on the first attempt, without commit/push/tag/publication. If an old interrupted clone asks to retry deleting directories, answer n until it exits, then run the updated retry BAT.
