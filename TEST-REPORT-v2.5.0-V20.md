# DEEP-ECHO 2.5.0 V20 TEST REPORT

Base: clean V18 Lyrics Reliability + Pro Suite source. V19 was not used.

## Automated results

- Node regression suite: **335 / 335 PASS**
- V20 focused tests: **5 / 5 PASS**
- JavaScript/CJS syntax checks: **113 / 113 PASS**
- HTML IDs: **325 total / 325 unique / 0 duplicates**

## V20 focused coverage

- Han/Chinese script is detected, and the English-track guard also covers Hangul/Korean and Kana/Japanese.
- Old unvalidated mixed YouLyPlus/LyricsPlus cache results are selectively refreshed instead of reusing a contaminated payload.
- Source Inspector and Translation ignore stale async results after a song switch.
- Karaoke ignores stale processed audio, restores the current source on failure, and persists Practice after failure.
- Sync Lab uses a stable base timeline, keeps cumulative saved corrections, shifts word timing together with line timing, and Reset restores immediately.
- V18 lyrical-reference and Exact Lyrics engines are hash-locked unchanged.

## Protected V18 hashes

- `lib/lyrics-reference.js`: `56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4`
- `lib/exact-lyrics.js`: `f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4`
- `src/v238-smart-autoplay.js`: `d190f92de59bace5e56279e183e79f3572f794edbb4013fb64c2040864df2674`

## Renderer smoke limitation

The renderer-smoke harness cannot start in this sandbox because `linkedom` is not installed in the runtime. The failure occurs before application renderer code is loaded. Real Windows validation is still required for live IPC/provider/Karaoke behavior.
