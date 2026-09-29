# DEEP-ECHO

DEEP-ECHO is a Windows desktop music player with immersive themes, lyrics, downloads, visualizers, mini-player features, and in-app updates.

## Current development version

**2.1.0 — Auto Update Foundation**

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

Releases are built by GitHub Actions. The source repository needs a repository secret named `RELEASE_TOKEN` with permission to write releases to `DEEP-ECHO-Releases`.

Do not commit passwords, tokens, or private credentials.
