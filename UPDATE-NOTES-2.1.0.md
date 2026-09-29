# DEEP-ECHO 2.1.0 — Auto Update Foundation

This release adds the first production auto-update path for installed Windows builds.

## New

- Checks GitHub Releases for a newer stable version.
- Shows an in-app update notification.
- Downloads the update from inside DEEP-ECHO.
- Shows download percentage, transferred size, and speed.
- Offers **Restart & Update** after the package is ready.
- Uses electron-builder update metadata for integrity verification.
- Adds a Windows GitHub Actions release workflow.
- Bundles the latest yt-dlp during cloud releases.

## Preserved

- Existing `appId` remains `com.dinecho.app` so installed-app upgrade identity is not reset.
- Existing `deepeccho` user-data location remains unchanged.
- Existing music library, preferences, likes, playlists, themes, and downloaded-media paths are not intentionally reset by the updater.

## One-time requirement

The private source repository must contain an Actions secret named `RELEASE_TOKEN` that can write release assets to the public `DEEP-ECHO-Releases` repository.
