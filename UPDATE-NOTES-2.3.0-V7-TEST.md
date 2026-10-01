# DEEP-ECHO v2.3.0 V7 TEST — Exact Lyrics

This test build adds the user-requested **Exact Lyrics** recovery flow to the Lyrics page without replacing normal fast lyrics lookup.

## What changed

- Added a theme-aware **Exact Lyrics** button in the Lyrics controls.
- Exact Lyrics is opt-in: normal LRCLIB/caption/AI lookup stays fast and unchanged until the user asks for a repair.
- On click, DeepEcho searches YouTube for the best matching lyric/lyrical video using title, artist, duration and version-quality scoring.
- If the selected lyric video has trustworthy timed captions, DeepEcho uses those first because they are cleaner than OCR.
- If captions are unavailable, DeepEcho downloads a low-resolution reference copy and samples frames locally with FFmpeg.
- The Windows build then uses the local Windows.Media.Ocr engine to read on-screen lyric text. No paid OCR API is used.
- OCR cleanup removes persistent watermarks/static text, merges noisy repeated reads, preserves later repeated chorus lines and turns first appearances into a synced timeline.
- DeepEcho compares the lyric-video audio with the currently playing song and estimates timeline offset, including music-video intros/outros.
- If audio-envelope alignment is uncertain, existing local Whisper support is used only as a timing fallback; the lyric-video OCR/caption text remains the source text.
- Low-confidence candidate/timing matches are rejected instead of silently replacing good lyrics.
- Successful Exact Lyrics are cached locally by canonical song identity, so official-video/audio/lyric-video variants can reuse the verified result on future plays.
- Shift+click on Exact Lyrics forces a fresh scan instead of reusing local verified cache.
- Repair > Lyrics now clears both normal and Exact Lyrics caches.

## UX status flow

The existing source/status line shows stages such as:

`Finding the best lyrical video…` → `Checking lyrical video…` → `Reading lyric frames…` → `Matching timing…` → `Exact Lyrics ready`

Existing visible lyrics are kept on screen during the scan and are replaced only after a verified result succeeds.

## Important test note

The unit/integration suite can validate candidate scoring, OCR-text cleanup, cache priority, timeline shifting, IPC wiring and UI wiring in this Linux test environment. The actual Windows.Media.Ocr runtime cannot be executed here, so the first real OCR pass must be smoke-tested on a Windows 10/11 DeepEcho device before public release.
