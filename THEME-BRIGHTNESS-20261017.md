# Theme visualizer brightness restoration — 17 October 2026

The constrained renderer previously removed both per-shape shadows and large CSS glow filters. That reduced stutter but also made theme visualizers dimmer. This change restores luminous colors and a soft halo in all 14 themes without re-enabling the original full-size blur chain.

## Implementation

- Constrained canvas colors preserve each theme's hue/saturation and increase visible core brightness/opacity. Transparent pixels remain transparent; CanvasGradient objects and named colors are passed through.
- A reusable offscreen copy has a longest edge of 192 pixels. Its small blur is blended additively with the sharp geometry in a single pass. The diffuse halo is cached for up to 64 ms; sharp geometry retains its existing frame pacing. Theme and size changes refresh the halo immediately.
- Constrained balanced rendering restores the original balanced detail factor of .76 instead of the .60 used by the earlier lag workaround. Eco uses the same inexpensive glow with its lower detail. High/ultra keep their original rendering/filter path.
- Dragon, Red Nebulae, palette-based spheres and alternate visualizer modes all use the same glow finish when the inexpensive renderer is active. Theme-specific geometry and audio analysis remain owned by their existing renderers.

Production changes are confined to the visualizer drawing region of `src/renderer.js`. Bytes outside that region match `../../backups/before-theme-brightness-20261017/renderer.js`. No playback, sync clock, word timing, analyser extraction, downloads, main process or preload code was edited.

## Verification and limits

- 511/511 Node tests and renderer DOM smoke passed. Behavioral tests cover preserved theme hue/transparency, bounded reusable glow buffers, immediate theme refresh, state restoration and existing frame pacing/brightness controls.
- Isolated Electron software-graphics fixture used real generated PCM media through the existing player/analyser, with 200 lyric rows. All 14 themes rendered and were captured after two paint callbacks. Pixel measurements compare the inexpensive path with its luminous-color/glow finish disabled versus enabled, at the same detail and sampled audio state. They establish a brightness increase, not exact photographic equivalence to a different song/time/settings.
- Final theme measurements showed approximately 1.8–2.1 times the alpha-weighted channel intensity, preserving palette identity. Short forced-draw samples are recorded per theme in `.startup-diagnostic/lyrics-bright-final-themes.json`; these measure draw cost, not displayed FPS.
- An earlier visible run with the uncached glow delivered 109 UI callbacks in about 3 seconds (p95 42 ms). Other runs, including the final cached-glow run, were throttled to roughly one callback/second despite foreground/occlusion precautions. Those readings cannot establish live smoothness, and no zero-lag or 60-FPS claim is made for this change. Further live evaluation should use the restarted app in the user's normal foreground session.
- Final media checks retained analyser signal, matching expected/current lyric index, held pause, correct seek line at 13 seconds, and resumed playback.

Artifacts: `.startup-diagnostic/bright-theme-contact-final.png`, individual `bright-theme-*.png`, `lyrics-bright-final-themes.json`, and `bright-theme-tests.txt`. The screenshot sheet is diagnostic, with synthetic lyric text; no user's library/profile was modified by the fixture.

Restart the source app to load the updated renderer. No release was published.
