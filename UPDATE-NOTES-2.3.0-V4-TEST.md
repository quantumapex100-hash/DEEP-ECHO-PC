# DEEP-ECHO 2.3.0 V4 TEST — Immersive Lyrics Anti-Clipping Fix

- Fixed Immersive Lyrics text clipping while resizing the right-side overlay.
- Removed active-line scale/negative translation that could push glyphs outside the transparent window bounds.
- Added guaranteed wrapping for long lyric lines and long unbroken words.
- Added safer line height and glyph padding for tall/descender-heavy fonts.
- Added adaptive lyric sizing and inset spacing for narrow overlay widths.
- Reduced edge-mask clipping so top/bottom lyrics remain readable while preserving the immersive fade.
- Existing Floating Lyrics, Mini Player, playback clock, and main lyrics engine remain unchanged.
