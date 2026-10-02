# DEEP-ECHO 1.0 FINAL — v2.6.0

DEEP-ECHO v2.6.0 is the public release built from the accepted V22 test line (V21 → V20 → V18). V19 is not part of this release.

## Highlights

- Multi-provider lyrics with richer synced/word-timed source selection.
- Lyrics failure recovery that can verify and switch to a compatible version of the same song while preserving queue context.
- Canonical song-level lyrics memory so successful lyrics can be reused across different uploads of the same track.
- Ask DeepEcho natural-language music discovery.
- Lyrics Source Inspector and Sync Lab with source switching and manual timing correction.
- Translation + Pronunciation support, including Immersive and Floating Lyrics mirroring.
- Karaoke modes and local vocal-reduction workflow.
- Responsive windowed Search/topbar improvements.
- Stability fixes for song-switch races, translation, source inspection, Karaoke recovery and cumulative Sync Lab offsets.

## Preserved systems

Playback, downloads, queue, Smart Autoplay, themes, Mini Player, Floating Lyrics, Immersive Player, Exact Lyrics and the accepted V18/V21 lyrics timing path remain preserved.

## Update delivery

The Windows release publishes `DEEP-ECHO-2.6.0-Setup.exe`, its `.blockmap`, and `latest.yml` so existing updater-enabled installs can receive the update in-app.
