DEEP-ECHO 2.6.6 CLOUD RELEASE

Run RELEASE-2.6.6.bat from this project folder.
Keep scripts/release-windows.ps1, release notes, workflow and source beside it.

Local: syntax/version checks, isolated release clone, commit, source push, v2.6.6 tag push.
Cloud: npm ci -> npm test -> Windows build -> publish -> updater asset verification.
No local npm ci or build. No force-push or existing-tag overwrite.
GitHub authentication and the source repository RELEASE_TOKEN secret must be configured.

Do not run twice while the workflow is running.
Check-only mode: RELEASE-2.6.6.bat -CheckOnly.
Release becomes available only after successful GitHub Actions:
https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions
https://github.com/windowsdaiyu-cyber/DEEP-ECHO-Releases/releases/tag/v2.6.6
