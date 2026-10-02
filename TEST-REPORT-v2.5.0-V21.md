# DEEP-ECHO 2.5.0 V21 TEST REPORT

## Base integrity

V21 was created from the clean V20 V18-Stability source ZIP. V19 was not used.

Only the following application files changed from V20:
- `main.js`
- `preload.js`
- `src/index.html`
- `src/renderer.js`
- `lib/lyrics-compatible-version.js` (new)
- `src/v255-lyrics-recovery.js` (new)
- `src/v255-lyrics-recovery.css` (new)

## Regression

- Node tests: **341 / 341 PASS**
- V21 focused tests: **6 / 6 PASS**
- JS/CJS syntax: **116 / 116 PASS**
- HTML IDs: **325 total / 325 unique / 0 duplicate**

## Focused V21 coverage

- Correct lyrical upload outranks slowed/reverb and live-cover variants.
- Recovery generates multiple lyrics-friendly same-song searches.
- Plain lyrics are not misreported as verified synchronized lyrics.
- Main/preload/renderer recovery wiring is present.
- Search no longer labels an unverified lyric-video title as `Sync`.
- V18/V20 lyrical-reference and Exact Lyrics engines remain byte-identical.

## Renderer smoke limitation

The renderer smoke harness stops before loading application renderer code because the runtime does not contain the declared test-only `linkedom` dependency. This is the same sandbox limitation seen in earlier builds; live Windows UI/network validation is still required.
