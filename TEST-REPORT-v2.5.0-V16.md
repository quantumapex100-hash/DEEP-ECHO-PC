# DEEP-ECHO 2.5.0 V16 TEST REPORT

## Automated regression

- Node tests: **318 / 318 PASS**
- Failures: **0**
- Focused V16 multi-provider tests: **4 / 4 PASS**
- JavaScript / CJS syntax: **105 / 105 PASS**
- HTML IDs: **325 / 325 unique**

## V16 focused coverage

- Rich LRC preserves a repeated chorus line at two different timestamps.
- Rich LRC extracts native word timing.
- TTML converts line and word timestamps correctly.
- A native word-timed YouLyPlus result outranks a line-only LRCLIB result.
- LRCLIB remains a valid synchronized fallback when richer providers miss.
- Provider requests are started in parallel and losing requests are aborted after selection.

## Regression protection

The final v2.5.0 playback/UI baseline is intentionally preserved. `main.js`, `preload.js`, `src/renderer.js`, Exact Lyrics, playback, downloads, queue/navigation, Smart Autoplay, and theme files are unchanged.

## Real-device acceptance targets

On Windows, test songs that previously showed:

- lyrics consistently early/late,
- drift after a music-video intro,
- the same chorus line near the start and near the end,
- line sync working but Word by Word feeling artificial,
- wrong live/remix/slowed variant timing.

Expected behavior: native rich timing should be preferred when available; otherwise native line timing should appear quickly; Precision Sync should then calibrate against the actual playing recording where possible. No provider can guarantee perfect timing for every upload, so Exact Lyrics remains the final repair option.
