# DEEP-ECHO 2.3.0 V14 TEST — Resume Session + Personal Mixes + Listening Stats

V14 is built directly on the V13 Repair + Word Sync + About Artist test source. It is intentionally additive: the existing playback engine, Smart Autoplay, Exact Lyrics, Word by Word, downloads, queue/navigation and Electron main/preload code are unchanged.

## What changed

### Resume Session
- Added a persistent **Resume where I left off** option in Settings (ON by default).
- DEEP-ECHO stores the current song, playback position, active section and the current collection/context.
- On the next launch it restores the last section and resumes the same song near the saved timestamp.
- If the previous session was paused, the restored session is paused after loading; if it was playing, playback may continue.
- Remote temporary stream URLs are never persisted; YouTube streams are resolved fresh on the next launch.
- Stale sessions older than 14 days are ignored, and the user can clear the saved session manually.
- Existing queue, volume and theme persistence continue using the original DEEP-ECHO storage paths.

### Personal Mixes
- Added a new **Personal Mixes** shelf on Home.
- Mixes are built from likes, play counts, completions, skips, recency, recommendation cache and recent listening.
- Current mix set includes:
  - Your Daily Mix
  - Your Romantic Mix
  - Chill Mix / Late Night Mix (time-aware)
  - Rediscover
  - Top-artist mix when enough artist data exists
- Mixes enforce artist diversity and reject very long playlist/jukebox-like candidates.
- Local taste renders immediately; when online, a small number of background searches can enrich the mixes with discovery songs.
- Mixes are cached for six hours and can be manually refreshed.
- Each mix opens as a normal playable DEEP-ECHO collection with song list, Play and Shuffle behavior through the existing playlist-detail system.

### Listening Stats
- Added a dedicated **Listening Stats** tab.
- Tracks actual played seconds locally from V14 onward rather than assuming the full duration of every started song.
- Shows:
  - tracked listening time
  - listening time for the last seven days
  - total plays and unique songs from the existing play-stats engine
  - liked-song count
  - Top Songs
  - Top Artists
  - a seven-day listening bar view
- Existing historical play counts from earlier builds are reused for rankings; accurate time tracking begins with V14.
- No listening-stat data is uploaded by this feature.

## Regression protection

V14 leaves these V13 files byte-identical:
- `main.js`
- `preload.js`
- `src/renderer.js`
- `src/v238-smart-autoplay.js`
- `lib/exact-lyrics.js`
- `src/v2313-repair-artist.js`

Application changes are limited to:
- `src/index.html` (two V14 asset includes)
- `src/v2314-session-mixes-stats.js` (new)
- `src/v2314-session-mixes-stats.css` (new)

This is a TEST build and is not a public release.
