# DEEP-ECHO 1.0 FINAL — Release Status

Technical updater/package version: **2.5.0**

Final feature baseline: **V15 Global Playlist Open**

This release keeps the user-facing milestone name **DEEP-ECHO 1.0 FINAL** while using semantic version **2.5.0** for GitHub tags and auto-update ordering. This avoids the existing v2.3.0 tag conflict and ensures older 2.3.0 installs see this as a newer update.

Release safety:
- Run `RELEASE-2.5.0.bat`.
- The script runs `npm ci` and the full test suite before any tag is created.
- The tag is `v2.5.0`.
- GitHub Actions publishes `DEEP-ECHO-2.5.0-Setup.exe`, its blockmap, and `latest.yml`.
- Existing playback/download/update architecture is preserved.
