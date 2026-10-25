# DEEP-ECHO 2.6.3

Official Windows release based on the accepted V35 Instant Playback All-Surfaces build.

## Highlights
- Faster Play startup across Search, Home, Recently Played, recommendations and Continue Listening through prioritized stream resolution and intent warmup.
- Real user playback always outranks background warmup; stale speculative jobs can be cancelled when a new song is selected.
- Same-song warmup is reused instead of launching duplicate resolver work.
- Next-song URL pre-resolution begins shortly after the current song starts, including when Gapless is OFF, reducing cold Next transitions.
- Search warmup remains controlled and limited so background preparation does not overwhelm real playback.
- Downloads and local songs continue to use the existing direct local playback path.
- V34 startup-performance improvements remain included.

## Preserved behavior
Lyrics timing/alignment, Exact Lyrics, Word by Word, Pronunciation, YouTube captions/providers, Floating Lyrics, Immersive Lyrics, Smart Autoplay, V32 playback compatibility recovery and the permanent Download pipeline are not redesigned by this release.

## Updater identity
- Version: `2.6.3`
- Git tag: `v2.6.3`
- Installer: `DEEP-ECHO-2.6.3-Setup.exe`
- Update channel: `latest`
