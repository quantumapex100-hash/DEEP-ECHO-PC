# DEEP-ECHO 2.6.3 — V36 Red Nebulae + Performance TEST

This is a TEST build based directly on the accepted/public 2.6.3 V35 release line. It is intentionally still version 2.6.3 and must be tested locally before any future public version bump.

## 1) Lyrics Sync-to-video repair
- The existing `syncLyrics()` timing/alignment engine is unchanged.
- The floating **Sync to video** control now has a high, click-safe layer and a capture repair handler that restores auto-follow and calls the existing forced sync path.
- The control is fully opaque and inherits each theme's panel/accent variables instead of using a transparent blurred plate.

## 2) Home-first app restore
- Session persistence may still record its historical fields for backward compatibility, but startup no longer restores the previous section/collection context.
- DEEP-ECHO always lands on **Home**.
- The saved current song + playback position are restored as a single-song context without adding a duplicate history entry.
- Theme continues to restore through the existing theme storage.

## 3) Faster first paint
- The first Electron paint uses a temporary lightweight rendering class that disables expensive panel blur/visual-only animation during hydration.
- It is automatically removed after the first idle/double-animation-frame paint.
- Existing V34/V35 deferred startup hydration remains intact.

## 4) Manual Next priority
- Manual Next no longer waits for radio-maintenance extension in the renderer wrapper; that maintenance continues asynchronously.
- V35's existing next-track stream pre-resolution remains intact.
- Hover/focus/pointer-down on Next reasserts the existing next prefetch immediately.
- Automatic Next / Smart Autoplay behavior remains on the accepted engine.

## 5) New live theme — Red Nebulae
- New selectable **Red Nebulae** live theme.
- Bright crimson/rose nebula atmosphere built procedurally; reference-image text/branding is NOT used.
- Dedicated reactive red orbital-sphere visualizer, orbit rings, waveform and star accents.
- Dedicated main Lyrics, Floating Lyrics, separate Immersive Lyrics, in-app Immersive Player, Mini Player, live cursor, like burst and theme preview styling.
- Performance-conscious: cloud depth is CSS-based, live background canvas is a bounded star/meteor layer, and expensive backdrop blur is disabled for Red Nebulae.
- Existing adaptive visualizer quality/FPS system remains authoritative.

## Non-regression boundary
No redesign of the lyrics timing/alignment engine, Exact Lyrics, YouTube captions, yt-dlp/main-process resolver, download handler, or Smart Autoplay engine. Protected files are hash-verified against the accepted 2.6.3 baseline.
