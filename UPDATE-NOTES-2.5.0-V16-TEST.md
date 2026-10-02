# DEEP-ECHO 2.5.0 V16 TEST — Multi-Provider Precision Lyrics

This test build is based directly on `DEEP-ECHO-v2.5.0-FINAL-RELEASE-SOURCE-FIXED` and keeps the public app version at 2.5.0. It is a test source package, not a published release.

## What changed

### Echo-style multi-provider lyrics resolver
DEEP-ECHO no longer depends mainly on one catalogue before its local repair pipeline. The normal lyrics lookup can now query these free/community sources in parallel:

- YouLyPlus / LyricsPlus mirrors
- PaxSenix
- Unison
- BetterLyrics
- SimpMusic lyrics service
- LRCLIB
- KuGou

The existing YouTube source-language captions, Precision Sync, local Whisper timing fallback, lyrics.ovh plain fallback, and user-triggered Exact Lyrics rescue remain in place.

### Timing quality priority
The resolver ranks results by timing quality instead of only provider arrival time:

1. Native word/syllable timing
2. Native line-synced timing
3. Plain lyrics

A word-timed result can immediately win. If a good line-synced result arrives first, DEEP-ECHO gives rich providers a short grace window instead of waiting through every slow provider. Once a result is selected, losing provider requests are cancelled.

### Repeated-line / chorus handling
Repeated lyric text is not removed merely because the same line occurs earlier in the song. Separate timestamps remain separate cues, so a chorus line appearing near the beginning and again near the end can stay synchronized to both appearances.

### Rich timing conversion
- YouLyPlus syllable timing is converted into DEEP-ECHO word timings.
- PaxSenix Apple-style word timing is preserved.
- BetterLyrics / TTML timing is converted to clean LRC plus per-word timing.
- SimpMusic rich-sync formats are normalized without exposing timing markup as visible lyric text.
- KuGou line-synced LRC is accepted as an additional fallback.

### Existing Precision Sync remains the final calibration layer
Provider timing is still checked against the actual playing YouTube recording when source-language captions are available. DEEP-ECHO's existing multi-anchor piecewise timing correction can therefore repair intro/dialogue/edit drift after a better provider supplies the lyric text/timeline.

Exact Lyrics remains the user-controlled rescue path for missing or bad catalogue data.

## Protected files / systems
No application changes were made to:

- `main.js`
- `preload.js`
- `src/renderer.js`
- Exact Lyrics implementation
- playback / streaming
- downloads
- queue / navigation
- Smart Autoplay
- UI/theme files

Application code changes are limited to:

- `lib/lyrics.js`
- `lib/lyrics-providers.js` (new)
- `tests/v251-multi-provider-lyrics.test.js` (new)

## Validation

- Full Node regression: **318 / 318 PASS**
- New focused multi-provider tests: **4 / 4 PASS**
- JS/CJS syntax scan: **105 files, 0 failures**
- HTML IDs: **325 total / 325 unique / 0 duplicates**

The sandbox cannot provide a reliable live public-provider network smoke test, so final Windows validation should include several real songs with repeated choruses, alternate uploads, Hindi/Punjabi tracks, and tracks where LRCLIB was previously late or offset.
