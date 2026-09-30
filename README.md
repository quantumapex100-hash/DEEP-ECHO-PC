# DEEP-ECHO

DEEP-ECHO is a Windows desktop music player with immersive themes, synchronized lyrics, downloads, visualizers, mini-player features, floating overlays, and in-app updates.

## Current release

**2.3.0 — Floating Immersive Lyrics**

This repository contains the application source. Public Windows update installers are published to the separate `DEEP-ECHO-Releases` repository.

## Development

```bat
npm install
npm start
```

## Tests

```bat
npm test
```

## Windows release

The official 2.3.0 release path is `RELEASE-2.3.0.bat` (or `CLOUD-RELEASE.bat`, which calls it). The script runs the local preflight first, pushes the final source and `v2.3.0` tag, and the GitHub Actions workflow builds/publishes the updater-compatible installer.

The source repository needs a repository secret named `RELEASE_TOKEN` with permission to write releases to `DEEP-ECHO-Releases`.

Do not commit passwords, tokens, or private credentials.
