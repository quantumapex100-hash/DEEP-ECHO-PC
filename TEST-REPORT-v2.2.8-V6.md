# DEEP-ECHO 2.2.8 V6 TEST

## Fixes
- Reduced broad/dusty visualizer haze while keeping theme-native reactive glow.
- Karaoke ON no longer applies the old 38% opacity / desaturation visualizer override.
- Lyrics lookup is faster: primary LRCLIB requests run in parallel and provider lyrics can appear before slower exact-caption timing finishes.
- Exact YouTube timing/word data upgrades safely in the background when available.
- Source-language caption guard + Hindi/Arabic/Punjabi romanized variants remain enabled.

## Safety
- Playback media clock remains unchanged.
- Download and stream-recovery handlers remain intact.
- Existing lyrics sync ticker/clock remains intact; V6 only stages timing upgrades after visible lyrics.

## Validation
- Node regression tests: 240 passed, 0 failed.
- Syntax checks passed for main.js, preload.js, renderer.js, lib/lyrics.js and lib/youtube-captions.js.

## Test build label
- 2.2.8 V6 TEST
