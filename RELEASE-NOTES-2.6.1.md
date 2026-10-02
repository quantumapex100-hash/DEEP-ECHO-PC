# DEEP-ECHO 2.6.1

## Highlights
- Faster Search lyrics capability verification with bounded parallel checks and shared in-flight work.
- Faster lyrics startup when Search has already verified the exact video as supported.
- Smoother, more consistent Word-by-Word highlighting without changing the accepted lyric sync/alignment engines.
- Search shows lyrics capability only for single-song results; playlist/mix cards stay clean.
- Opened playlists show per-song lyrics capability and use stronger real-playlist / long-mix track resolution.
- Smarter Smart Autoplay, recommendations and song-aware theme suggestions with better diversity and taste signals.
- V23 lyric-sync stability and the free-form Floating Lyrics presentation are preserved.

## Compatibility and safety
- Existing playback, downloads, queue, themes, Mini Player, Immersive Player, Floating Lyrics, Exact Lyrics, Translation/Pronunciation and Karaoke systems are preserved.
- `youtube-captions.js`, `lyrics-reference.js`, and `exact-lyrics.js` remain unchanged from the accepted V26 source.
- No V19 sync logic is used.

## Updater assets
The GitHub release workflow publishes `DEEP-ECHO-2.6.1-Setup.exe`, `DEEP-ECHO-2.6.1-Setup.exe.blockmap`, and `latest.yml` for in-app updates.
