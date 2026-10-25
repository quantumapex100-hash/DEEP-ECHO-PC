# Calm Yourself performance fix - 2026-10-21

Only production change: `src/feel-happy.js`. Playback, stream preparation, Search/Next, lyrics engine, downloads, other visualizers, and all CSS remain byte-identical to the backup manifest.

## Changes

- Batch grass paths by colour in bounded depth layers. Keep wind, bending, flowers and night illumination. Use a balanced dense meadow budget (4.5 blades/CSS pixel, maximum 4,500, previously 10/CSS pixel and maximum 12,500). Native screenshot review confirms the meadow still fills the foreground.
- Restrict brush/ripple physics to affected bounds and reuse spring coefficients; preserve contact force/limits.
- Restrict the light grid to each trail's bounds; reuse its buffer. Reference-grid test confirms the same light field within floating point tolerance.
- Reuse palette arrays at a settled phase and cache aurora gradient strips, fireflies, fading trail shadows and musical note glows. Stars, colours, music-reactive notes, birds, sunset/night transitions and cursor brushing remain enabled.
- Coalesce paused pointer bursts into one animation frame; cancel pending work on view exit. Ignore repeated resize notifications when canvas size is unchanged.

## Validation

543 automated tests passed, plus renderer integration smoke. Calm coverage includes transport delegation, authoritative lyrics clock, stale lyrics, paused pointer coalescing, cached trails after cursor exit, audio-driven notes, inactive frame cancellation, and light-field equivalence/reuse.

Native Electron probe used an isolated fresh profile, actual decoded local PCM audio through the real player, continuous native mouse movement over the grass, day/night, paused brushing and view exit. Network/extractor timing was controlled and is not measured here. Hardware canvas/compositing enabled, canvas 1083 x 854 at DPR 1.25. Screenshots reviewed for day and night. Each measured phase lasts 2.4 seconds; these are local samples, not a promise of fixed FPS on every PC. Scene animation retains its existing ~30 FPS cadence.

The following are renderer animation-frame gap measurements (milliseconds), not the scene's FPS:

| Phase | Before p95 | After p95 | Before maximum | After maximum |
| --- | ---: | ---: | ---: | ---: |
| calm-day | 208 | 28 | 208 | 42 |
| calm-night | 326 | 56 | 326 | 56 |
| calm-paused-brush | 292 | 56 | 292 | 62 |
| after-exit | 35 | 7 | 472 | 21 |

Audio remained playing in every final phase. Final measured phases had no JavaScript long tasks; night and paused brushing can still have occasional 50-62ms gaps, so this does not claim universally constant 60 FPS.

Evidence: `.startup-diagnostic/calm-stutter-before.json`, `.startup-diagnostic/calm-stutter-final.json`, `calm-final-calm-day.png`, `calm-final-calm-night.png`, and `calm-tests.txt`. Reproduce with `scripts/probe-calm-stutter.cjs` (isolated profile; DEEPECHO_UI_BASELINE=1 selects the backup of Calm only).

Backup: `../../backups/before-calm-stutter-20261021/`.
