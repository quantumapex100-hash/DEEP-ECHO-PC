# DEEP-ECHO 2.2.8 V5 TEST

## Visualizer
- Per-theme renderer identity is preserved and strengthened.
- Theme-specific particles/accents:
  - Golden: warm sparkle particles
  - Light: soft halo rings
  - Dark: blue needle streaks
  - Purple: electric arcs
  - Toxic: reactive green orbs
  - Blood: blood drops/splashes
  - Silver: metallic glints
  - Transparent: glass rings
  - Fluids: flowing wave layers
  - RGB: multi-band rainbow waves
  - Love RGB: reactive hearts
  - Space: orbital rings/stars
  - Dragon: dedicated dragon renderer remains intact
- Glow is applied to particles, rays, accents and core instead of whitening the whole canvas.

## Lyrics
- Source-language captions are preferred over translated captions.
- Explicit YouTube `-orig` / Original caption tracks get strongest priority.
- Obvious English-translated provider text is rejected for known non-English songs.
- Romanized mode remains transliteration into English letters, not English translation.
- Hindi/Devanagari, Punjabi/Gurmukhi and Arabic-script lyrics are supported for romanization.
- Lyrics cache bumped to v11 so old bad translated results are not reused.

## Critical safety
- Playback engine not modified.
- Lyrics timing/sync clock not modified.
- Download and recovery paths not modified.

## Validation
- Node regression tests: 239 passed, 0 failed.
