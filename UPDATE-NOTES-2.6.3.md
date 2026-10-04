# DEEP-ECHO 2.6.3 — Instant Playback All Surfaces

## Goal
Make Search, Home/discovery cards and Next-song transitions start much faster without redesigning the accepted lyrics or Downloads engines.

## Playback changes
- Playback priority 100, Next 40, pointer intent 30, Search warmup 10, passive Home warmup 5.
- Same-song warmup is reused by Play instead of duplicated.
- Stale speculative work can be cancelled when the user chooses a different song.
- Search warmup remains single-flight and covers up to six likely visible results.
- Home/recommendation cards signal intent on pointer/focus/pointer-down.
- First visible Home cards receive low-priority URL pre-resolution.
- Recently Played and Continue Listening receive intent warmup without changing resume timing.
- Next-song URL pre-resolution begins around 90 ms after successful playback in normal mode.
- Next URL pre-resolution works with Gapless OFF; media-byte prebuffering remains Gapless-controlled.

## Protected / unchanged
- Lyrics synchronization/alignment
- Exact Lyrics
- YouTube caption timing
- Lyrics providers
- Word-by-Word timing source
- Pronunciation rendering
- Floating and Immersive Lyrics behavior
- Smart Autoplay engine
- yt-dlp smart wrapper/client strategy
- V32 compatibility recovery behavior
- V34 startup-performance behavior
- Permanent Download handler and renderer download flow

Downloads/local files still go directly through `playLocal()` and are not routed through remote prefetch.
