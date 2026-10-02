# DEEP-ECHO 2.5.0 V18 TEST REPORT

## Automated results

- Full Node regression suite: **330 / 330 PASS**
- V17 + V18 focused lyrics/pro-suite tests: **12 / 12 PASS**
- V18 focused tests alone: **6 / 6 PASS**
- JavaScript / CJS syntax: **112 / 112 PASS**
- HTML IDs: **325 total / 325 unique / 0 duplicates**

## V18 focused coverage

- sudden verified dialogue/cut-scene gaps use breakpoint timing instead of smeared interpolation
- legacy V17 generic piecewise mapping remains unchanged
- repeated chorus semantic anchors stay monotonic and occurrence-aware
- Hangul and Japanese kana generate optional pronunciation variants
- on-demand translation preserves original LRC timestamps per line
- Karaoke local center-reduction modes and stable per-song cache keys
- Ask DeepEcho, Source Inspector, Sync Lab, translation, pronunciation and Karaoke are additively wired through theme-native assets

## Protected regression files

Byte-identical to the V17 source:
- `lib/exact-lyrics.js`
- `lib/transfer.js`
- `src/v150-tools.js`
- `src/v238-smart-autoplay.js`
- `src/v2314-session-mixes-stats.js`
- `src/v2315-global-playlist-open.js`

## Renderer smoke limitation

The existing renderer-smoke harness cannot start in this sandbox because the test-only `linkedom` package is not installed in the runtime. It exits before loading renderer application code. This is the same environment limitation present in prior V13–V17 test builds; the Node regression suite itself is fully green.

## Windows acceptance still required

- live Golden Hour / other cinematic-MV reference mapping
- real provider response availability and Source Inspector switching
- live public translation endpoint behavior
- local FFmpeg Karaoke processing on stereo/mono tracks and source restore
- visual spacing across every theme and common laptop window sizes

This build is TEST ONLY and should not be released publicly until those Windows checks are accepted.
