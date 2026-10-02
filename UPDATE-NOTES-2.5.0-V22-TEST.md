# DEEP-ECHO 2.5.0 V22 TEST — Lyrics Identity + Responsive UI

V22 is built from the accepted V21/V20/V18 line. It does not import V19's rejected lyrics-sync changes.

## Fixes
- Windowed-mode topbar/search no longer collapses the search field when Smart Autoplay, Search, Ask DeepEcho, Repair/status controls compete for width. Controls compact/wrap responsively while fullscreen behavior stays intact.
- Lyrics failure recovery UI appears almost immediately after a failure instead of leaving the user on the generic failure card first.
- Added song-level canonical lyrics memory. Once a song's lyrics are verified, official MV/audio/lyric-video uploads of the same standard recording can reuse the lyric package and recalibrate timing to the current video.
- Canonical identity now understands common `Song (Lyrics) - Artist | ...` upload titles so uploader/channel metadata does not split one song into separate lyric identities.
- Known previously verified lyrics-ready YouTube versions are marked in future search results.
- Pronunciation and Translation state now mirrors to the in-app Immersive Player, Floating Lyrics window, and separate Immersive Lyrics overlay. These surfaces consume the same enriched lyric state instead of base-only text.

## Safety
- `lib/lyrics-reference.js` is byte-identical to V21.
- `lib/exact-lyrics.js` is byte-identical to V21.
- No V19 source was used.
