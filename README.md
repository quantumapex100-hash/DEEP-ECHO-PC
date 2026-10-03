# DEEP-ECHO 2.6.2 — FINAL RELEASE SOURCE

This is the official 2.6.2 Windows release source built from the accepted V33 Instant Play test line.

## Local test
1. Run `INSTALL.bat` once in a fresh extracted folder.
2. Run `START-OFFLINE.bat`.

## Official GitHub release
Run `RELEASE-2.6.2.bat` once. It installs exact dependencies, runs the full test suite, pushes the final source to `main`, creates tag `v2.6.2`, and triggers the GitHub Actions Windows build/publish workflow.

Do not run the release BAT a second time while the workflow is already running.
