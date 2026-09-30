# DEEP-ECHO 2.3.0 V2 TEST REPORT

## Requested changes
- Floating Lyrics maximum horizontal resize limit now reaches the full monitor work-area width.
- Existing default near-full-width size is retained; compact mode and vertical limits are unchanged.
- White UI has a dedicated frosted white/cream Floating Lyrics skin with warm neutral controls, lyric text, particles, time labels and seek bar styling.

## Regression safety
- `node --check main.js`: PASS
- `node --check src/floating-lyrics.js`: PASS
- Node regression suite: 248 PASS, 0 FAIL

## Protected files byte-identical to V1
- `src/renderer.js` — unchanged
- `lib/lyrics.js` — unchanged
- `src/v150-tools.js` — unchanged
- `src/mini.js` — unchanged
- `src/mini.css` — unchanged
- `preload.js` — unchanged

The only runtime logic change outside the Floating Lyrics stylesheet is the Floating Lyrics BrowserWindow maximum width calculation in `main.js`. Playback startup, lyric timing, download/recovery, main visualizer rendering and Mini Player logic were not edited.
