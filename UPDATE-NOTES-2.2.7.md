# DEEP-ECHO 2.2.7 — Visualizer + Lyrics + Queue + Immersive Repair

## Fixed
- Restored Queue and Immersive Player as true fixed overlays; a v1.7.0 CSS rule had accidentally moved them into normal document flow.
- Word by Word OFF is now a real clean line-by-line mode: full current line stays readable and karaoke spans are removed.
- Removed the always-on lyric backdrop blur that made normal line mode look smeared.
- Visualizer now self-heals remote streams that expose silent PCM: after clean analyser reconnect attempts it prepares the existing compatibility audio path in the background, preserves playback position, and reconnects the real analyser.
- Auto Game Mode no longer activates merely because the app loses focus; this prevented the visualizer from freezing during normal desktop use.
- Queue now has deterministic open/close state plus Escape-to-close.

## Preserved
- v2.2.5 download recovery.
- v2.2.6 lyrics timing/caption recovery.
- Themes, floating lyrics, playlists, updater, EQ and playback recovery.

## Final release polish
- Floating Lyrics overlay is now resize-aware: resizing the overlay proportionally scales lyric text, controls, graph canvas geometry, analyser strokes and peak markers.
- Theme picker now opens with White, Black, Golden Particle and Love RGB first. Show More reveals a scrollable theme panel instead of expanding every theme into the full Settings page.
