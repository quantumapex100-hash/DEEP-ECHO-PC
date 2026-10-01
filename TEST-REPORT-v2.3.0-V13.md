# DEEP-ECHO 2.3.0 V13 TEST REPORT

## Automated regression

- Node regression suite: **302 / 302 PASS**
- Failures: **0**
- V13 focused repair/word/artist checks: **PASS**
- JS/CJS syntax checks: **99 / 99 PASS**
- HTML IDs: **325 total / 325 unique / 0 duplicates**
- Full source ZIP integrity: PASS
- Patch ZIP integrity: PASS

## V13 focused checks

- Exact Lyrics carries real caption word timing when available.
- Exact/OCR line timing produces monotonic derived word timing when true word timestamps are unavailable.
- Word-by-word painter accepts exact and derived timing modes.
- Context Repair preserves current playback state and targets the active section.
- Exact Lyrics Repair can request a fresh scan instead of restarting the app.
- Bottom artwork opens Immersive Player without stealing left/right swipe gestures.
- Immersive About Artist is wired to the existing artist-search service.
- Immersive Player has its own repair path.

## Protected regression checks

Hashes were compared against the V12 base and remained identical for:
- `main.js`
- `preload.js`
- `src/v238-smart-autoplay.js`

The only V12 application files intentionally modified are the lyric presentation/exact-lyrics integration plus the additive V13 UI module/style and index includes.

## Renderer smoke limitation

The repository renderer-smoke harness still cannot start in this sandbox because its test-only `linkedom` dependency is not installed in the runtime. The normal Node regression suite itself is green. Real Windows validation is still required for visual layout, live YouTube artist results, and pointer interaction.
