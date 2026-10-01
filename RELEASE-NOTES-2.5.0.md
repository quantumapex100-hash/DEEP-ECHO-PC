# DEEP-ECHO 1.0 FINAL · Update v2.5.0

DEEP-ECHO 1.0 FINAL (technical update version 2.5.0) is the largest desktop experience update so far, focused on smarter discovery, stronger lyrics, immersive playback, personalized listening, and safer recovery tools while preserving the existing playback/download core.

## Highlights

### Lyrics that repair themselves better
- Upgraded base lyrics matching with stronger title, artist, duration, and recording/version checks.
- Precision Sync can use multiple caption/audio anchors instead of relying on one global offset.
- New per-song **Exact Lyrics** switch for missing, wrong, or badly synced lyrics.
- Exact Lyrics can find a matching lyrical video, prefer timed captions, fall back to local Windows OCR for on-screen lyric text, align timing to the currently playing song, and cache verified results locally.
- Exact Lyrics starts OFF for every new song and is enabled manually only when needed.
- Word by Word now works more reliably with Exact Lyrics by preserving real word timestamps when available and deriving conservative word timing from synced lines when necessary.
- Added context-aware **Repair** actions for lyrics and other sections without restarting playback.

### Smarter Home, Search, playlists, and autoplay
- Added **Popular Artists**, **New Releases**, useful pre-search discovery, and recommended playlists.
- Home shelves stay in a single horizontal row with themed controls and per-shelf refresh/See More behavior.
- Added **Smart Autoplay** for Home/Search discovery playback so DeepEcho follows the selected song and listener taste instead of blindly playing the next raw search result.
- Smart Autoplay suppresses duplicate uploads and repetitive artist loops while using likes, completions, skips, recency, artist affinity, and related-song signals.
- Downloads, Liked Songs, opened/user playlists, manual Queue, History, AI DJ, and Radio keep their own playback order.
- Playlist/mix items can now be opened from normal song-card/song-row surfaces across Search, Recently Played, Home shelves, Liked Songs, Downloads, History, and Continue Listening; normal single songs do not get the Open action.

### Personal listening
- Added **Personal Mixes** including Daily, Romantic, Chill/Late Night, Rediscover, and top-artist mixes when enough taste data exists.
- Added **Resume Session** to restore the last section, song, playback position, and active collection context while resolving temporary remote streams fresh.
- Added local **Listening Stats** with tracked listening time, recent listening, total plays, unique songs, liked count, Top Songs, Top Artists, and a seven-day view.

### Immersive playback and artist discovery
- New **See While Playing** mode shows the current song video inside the existing Immersive Player card while the main audio remains the playback master.
- Bottom-player artwork can open Immersive Player directly.
- Immersive Player now includes an **About Artist** area with current-artist information and playable related/top tracks.
- Added an Immersive Repair action that rebuilds immersive visuals/lyrics/artist data without restarting the current song.

### Floating and Mini Player upgrades
- Floating Immersive Lyrics: transparent always-on-top multi-line lyrics panel with theme visualizers, playback controls, seeking, progress, resizing, opacity controls, Only Lyrics mode, and click-through.
- Floating Lyrics includes responsive seeking/progress and improved resizing behavior.
- Mini Player includes optional synced lyrics, Lyrics ON/OFF, and a responsive seek/progress bar.

### Performance and UI controls
- Added a game-style **GPU Preference** selector that detects Windows display adapters and lets the user choose Auto or a detected adapter preference; Windows/driver still controls final physical GPU routing.
- Home horizontal scrolling uses themed controls/scrubbers to reduce native-scrollbar cursor conflicts.
- Theme-aware UI is preserved across the new shelves, controls, playlist views, repair actions, stats, mixes, lyrics, and immersive features.

## Update behavior
Existing DEEP-ECHO users on older updater-enabled builds should receive the normal in-app update prompt after `v2.5.0` becomes the latest published release and the release contains:

- `DEEP-ECHO-2.5.0-Setup.exe`
- `DEEP-ECHO-2.5.0-Setup.exe.blockmap`
- `latest.yml`

## Release validation
The final V15 source passed the full Node regression suite with **314 / 314 tests** before release packaging. The GitHub Actions release workflow performs a fresh dependency install, runs the complete test suite (including the renderer smoke dependency), bundles the latest yt-dlp, builds the Windows installer, publishes updater assets, marks the release latest, and verifies the required updater files.
