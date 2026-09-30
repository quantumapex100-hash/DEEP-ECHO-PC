# DEEP-ECHO v2.2.8 Preview — Lyrics Free + Brighter Visualizer

Scope: visual-only polish. Playback, lyrics sync engine, and download code were intentionally left untouched.

## Changes
- Removed boxed/current-line card feel from lyrics lines.
- Lyrics lines are now free-floating (no line background, no inset box-shadow, no padded card style).
- Lyrics content width opened up slightly for a freer layout.
- Increased visualizer default brightness to 108%.
- Reduced lyrics backdrop darkness default to 14%.
- Added stronger glow/drop-shadow on lyrics visualizer canvas and core.
- Raised ambient visualizer opacity and ring visibility.
- Kept settings sliders so brightness/darkness can still be tuned.

## Safety
- No edits to playback clock/analyser routing.
- No edits to lyrics timing/sync logic.
- No edits to download/stream recovery logic.

## Validation
- Node regression tests: 230 passed, 0 failed.
- Renderer smoke in this container could not run because `linkedom` dev dependency is not installed here.

## Files changed
- `src/v228-visual-polish.css`
- `src/v228-visual-polish.js`
- `src/index.html`

## Note
- This remains a preview/test build. Version label inside the app can still show 2.2.7 until you decide to bump it later.

- Added visible `v2.2.8 TEST` preview label in the sidebar and Settings display without changing the stable updater/package version.
