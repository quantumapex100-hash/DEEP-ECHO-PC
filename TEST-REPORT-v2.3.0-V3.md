# DEEP-ECHO v2.3.0 V3 TEST — Floating Immersive Lyrics

## Result
- 252 / 252 Node regression tests PASS.
- JavaScript syntax checks PASS for `main.js`, `preload.js`, `src/v150-tools.js`, and `src/immersive-lyrics.js`.
- No duplicate HTML IDs detected in `src/index.html` or `src/immersive-lyrics.html`.

## New feature
- Separate **Immersive Lyrics** button in the Lyrics tools area.
- Separate transparent, frameless, always-on-top overlay.
- Locked to the monitor work-area right edge and full work-area height.
- Width is resizable; resizing remains anchored to the right so the panel grows/shrinks leftward.
- Full synchronized multi-line lyrics timeline with active/current line follow.
- Plain-lyrics fallback shows all available lines when timed lyrics are unavailable.
- Playback controls: back 10s, previous, play/pause, next, forward 10s.
- Seek/progress bar with current time and duration.
- Theme-matched real-audio visualizer using the existing analyser packet; no replacement playback/analyser engine.
- Independent settings for UI opacity, lyrics opacity, lyrics size, visualizer ON/OFF, and Only Lyrics mode.
- Only Lyrics mode removes the panel background/chrome while keeping lyrics visible.
- Independent Immersive Lyrics click-through with `Ctrl+Alt+Shift+X` recovery shortcut.

## Regression protection
The following stable files are byte-identical to the v2.3.0 V2 base:
- `src/renderer.js`
- `lib/lyrics.js`
- `lib/lyrics-timeline.js`
- `src/mini.js`
- `src/mini.css`
- `src/floating-lyrics.html`
- `src/floating-lyrics.js`
- `src/floating-lyrics.css`

No GitHub release/publish was performed.
