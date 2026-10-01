# DEEP-ECHO 2.3.0 — Final Release Status

Final feature baseline: **V15 Global Playlist Open**

This folder is the final release candidate prepared from the V15 tested source. No application code was changed during final-release packaging; only final release documentation was updated.

Pre-release code validation performed in the packaging environment:
- `node tests/run-tests.cjs`: 314 / 314 PASS
- renderer smoke cannot run in this sandbox without installed dev dependency `linkedom`

The official `RELEASE-2.3.0.bat` and GitHub Actions workflow both run `npm ci` before `npm test`, so the public installer is not published unless the full dependency-backed test run succeeds.
