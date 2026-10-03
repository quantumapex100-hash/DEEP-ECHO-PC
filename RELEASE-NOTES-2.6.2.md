# DEEP-ECHO 2.6.2

Official Windows release based on the accepted V33 Instant Play build.

## Highlights
- Instant Play warmup pre-resolves and prebuffers likely Search results so Play starts much faster when a result is already warmed.
- Playback recovery uses one shared fallback controller, preventing false `The element has no supported sources` errors while compatible audio is still being prepared.
- Modern YouTube recovery keeps the tested V30 resolver/runtime line, including current yt-dlp/JS-runtime support and classic local compatible-audio fallback.
- Pronunciation mode replaces the visible lyric with Roman/Hinglish text across Lyrics, Floating Lyrics and Immersive Lyrics without changing timestamps.
- Free-form lyric presentation avoids boxed active-text animation while preserving theme glow/particles.
- Search UI includes theme-aware progress, offline handling with Go to Downloads, and fixed recent-search layering.
- Ctrl+Alt+Space play/pause shortcut recovery is included.
- Smart Autoplay, playlists, Search Lyrics Supported checks, Word by Word and recommendation/theme improvements from the accepted test line are preserved.

## Non-regression promise for this release
The accepted lyrics timing/alignment, Exact Lyrics, Smart Autoplay and V33 playback resolver are not redesigned for this release. Version 2.6.2 is a packaging/versioning release of the tested V33 code line.
