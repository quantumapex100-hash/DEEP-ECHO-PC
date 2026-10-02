# DEEP-ECHO 2.5.0 V17 TEST — Lyrics-First Search + Lyrical Reference Sync

V17 is built directly on the V16 multi-provider lyrics source. It keeps the current 2.5.0 playback, queue, downloads, Smart Autoplay, Exact Lyrics and updater behavior, while adding a second-stage automatic timing reference for music videos whose own timeline differs from the studio/lyrical version.

## Search: lyrics-friendly results first

- Normal user song Search now runs the ordinary YouTube query and a lyrics-video query in parallel.
- Relevant `Lyrics`, `Lyrical`, and official lyrics-video results receive a ranking boost.
- Wrong variants such as Live, Remix, Cover, Karaoke, Slowed/Reverb, Nightcore, Instrumental and 8D are penalized.
- The original music video and official audio are still kept in the result set; they are not hidden.
- Lyrics-video rows display a small `Lyrics video · Sync` hint.
- A result explicitly selected from Search is now treated as the user's exact version choice. The old version-preference layer will not silently replace a selected lyrical/original/audio upload after the click.

## Original MV can borrow timing from a lyrical video

When provider lyrics are available but the exact playing video cannot supply trustworthy caption timing, Precision Sync now automatically:

1. Searches for the best matching lyrical/lyrics video.
2. Uses its real timed captions when available.
3. Downloads only a temporary audio reference for alignment.
4. Compares the lyrical-reference audio against the exact audio being played.
5. Builds multiple timing anchors instead of assuming one fixed offset.
6. Warps the lyric timeline onto the current music-video timeline.
7. Applies the same nonlinear map to native word timing when available.
8. Caches the calibrated result for that exact playing video.

This is designed for original music videos with cinematic intros, dialogue breaks, pauses, extended outros, or edit differences where a single `+N seconds` correction is not enough.

## Repeated chorus safety

Repeated lyric text is never deduplicated merely because the words are identical. The first and later occurrences retain their own timestamps while the timeline is warped, so a chorus near the end is not redirected to the first occurrence.

## Performance / fallback behavior

- Provider lyrics still appear first; lyrical-reference calibration runs in the background.
- Automatic V17 reference sync uses timed captions + audio mapping only. It does **not** launch OCR automatically.
- If a usable lyrical-video caption reference cannot be verified, the existing already-installed local Whisper timing fallback remains available.
- User-invoked Exact Lyrics remains the final rescue and can still use lyrical-video OCR when captions are unavailable.

## Files changed from V16

- `main.js`
- `lib/exact-lyrics.js` (exports existing lightweight alignment helpers; Exact Lyrics behavior itself is unchanged)
- `lib/lyrics-reference.js` (new)
- `lib/lyrics-search-ranking.js` (new)
- `src/renderer.js`
- `src/v150-tools.js`
- `src/style.css`
- `tests/v252-lyrical-reference-sync.test.js` (new)

## Test status

- Full Node regression: **324 / 324 PASS**
- V17 focused tests: **6 / 6 PASS**
- JavaScript / CJS syntax: **108 / 108 PASS**
- HTML IDs: **325 / 325 unique**
- Renderer smoke cannot run in this sandbox because test/runtime `node_modules` (including `linkedom` and Electron) are not installed here.

This is a TEST build. Real Windows acceptance should verify live YouTube search ordering, a lyrical-video click, the same song's original music-video click, intro/dialogue timeline correction, Word by Word, and cached replay.
