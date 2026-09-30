# DEEP-ECHO 2.3.0 V5 TEST REPORT

## Result
- Node regression suite: 259 / 259 PASS.
- Syntax checks: PASS for `src/immersive-lyrics.js` and `src/v150-tools.js`.
- Protected core comparison against V3: `renderer.js`, classic Floating Lyrics files, and Mini Player files unchanged.

## V4 fixes retained
- Immersive Lyrics resize/text anti-clipping hardening.
- Main Settings controls for Immersive Lyrics with bidirectional preference sync.

## V5 additions
- Immersive Lyrics now receives measured waveform plus full audio-band/beat/transient metrics.
- Generic ribbon graph replaced by theme-matched visualizer rendering.
- Golden, Light, Dark, Purple/Electric, Toxic, Blood, Silver, Transparent/Glass, Fluids, RGB, Love, Space, and Dragon visualizer identities are present.
- Dragon uses the existing `src/assets/dragon-scene.png` artwork.

## Environment note
The optional DOM smoke runner requires the dev dependency `linkedom`. In this working container `node_modules` is intentionally absent, so the smoke runner itself cannot execute here. The complete Node `.test.js` regression suite passed 259/259.
