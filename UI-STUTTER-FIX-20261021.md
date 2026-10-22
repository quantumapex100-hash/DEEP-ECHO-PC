# UI stutter fix — 21 October 2026

Source-only changes for DeepEcho 2.6.6. Restart the source app to load them. No release published.

## Changes
- Cursor movement uses a 2D transform instead of left/top; pointer events share one pending frame. Hover state and native-cursor visibility are written only when needed. Blur/detach restores the native cursor and cancels pending cursor paints. All theme SVG artwork remains unchanged.
- Cursor glow continues pulsing in opacity, with a constant stroke width to avoid animating SVG geometry. No rectangular filters or 3D cursor transforms were introduced.
- Background particle glow reuses a single 128px palette texture instead of constructing a radial gradient for every particle every frame. The original individual particle alpha, core dot, positions, speed and count are preserved. Missing sprite contexts use the original gradient fallback. The lyrics visualizer is unchanged.
- Search/Home shelf observation ignores unrelated result-row, progress and badge changes. Relevant shelf insertion, updates and removal still refresh controls.
- Row images request asynchronous decoding; duplicate Like-state storage reads were removed.
- The mini-waveform caches its unchanged color until the theme changes; its waveform, cadence and opacity remain unchanged.

## Protected behavior
Byte comparison with ../../backups/before-ui-stutter-20261021 confirmed main.js and Smart Autoplay unchanged. Search runSearch(), playRemoteSong(), playLocal(), prefetchNextQueued(), syncLyrics(), accepted bright visualizer drawing and every existing cursor SVG are byte-identical. Download and lyric-engine hashes also pass the existing protected-file tests.

Changes are limited to src/renderer.js presentation/background drawing, src/style.css cursor rules, src/v236-discovery-shelves.js UI observation and src/v170-experience.js mini-waveform color reads.

## Validation
542/542 tests passed plus renderer DOM smoke. Added behavioral coverage for pointer coalescing, hover states, native-cursor fallback and cancellation, shelf mutation relevance, waveform theme-color invalidation and particle palette reuse/fallback. Historical UI assertions were updated for the reviewed 2D transform/viewport origin; playback/lyrics hashes were not changed.

Native Electron measurements use isolated profiles, a filled Search input with its normal input event, 48 visibly laid-out result rows, real mouse events and real PCM decoding/media time. Search/network IPC is controlled to isolate rendering. No claim is made about YouTube resolving speed. Measurements span 2.4 seconds per phase; they are individual machine samples, not a universal frame-rate guarantee. First-run overlays are dismissed. Both normal GPU mode and Safe Graphics are tested without changing user settings.

| Mode / phase | Layout calls before → after | Frames over 50ms before → after |
|---|---:|---:|
| Normal graphics: pointer-idle | 276 → 3 | 0 → 0 |
| Normal graphics: search-results | 249 → 16 | 3 → 1 |
| Normal graphics: song-start | 232 → 31 | 1 → 0 |
| Safe Graphics: pointer-idle | 208 → 13 | 3 → 0 |
| Safe Graphics: search-results | 171 → 26 | 0 → 0 |
| Safe Graphics: song-start | 115 → 14 | 0 → 0 |

Normal-mode Search peak frame time was 56ms before and 69ms after, even though >50ms frame count fell from 3 to 1 and long tasks from 2 to 0. Thus occasional spikes remain; this is a reduction in unnecessary work and observed stutter, not proof of zero lag in every profile. Song-start peak frame time fell from 56ms to 35ms in the normal-mode sample. Safe Graphics had zero >50ms frames in all three final phases.

Native canvas pixel comparison across 45 palette/size/opacity cases gave brightness ratios 0.9990–1.0340 and maximum premultiplied pixel difference 0.0673, consistent with minor rasterization differences rather than dimming the glow. The actual lyrics visualizer and its brightness controls are untouched.

Evidence: scripts/probe-ui-stutter.cjs, scripts/probe-particle-glow.cjs and .startup-diagnostic/particle-glow-visual-check.json. Final normal-mode records: ui-stutter-baseline-screen-verified.json and ui-stutter-fixed-particle-cache.json. Final software-mode records: ui-stutter-baseline-software-verified.json and ui-stutter-fixed-software-verified.json. Earlier UI probe records are exploratory; some included first-run/discovery overlays and are not the final comparison.

Discarded experiments: per-frame/time-bounded Search row batching, content-visibility and lazy thumbnail loading did not show a reliable benefit and are not shipped. Original Search batching remains unchanged.
