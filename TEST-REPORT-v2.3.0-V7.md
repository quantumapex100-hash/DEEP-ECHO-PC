# DEEP-ECHO v2.3.0 V7 TEST REPORT

## Automated checks

- Node test files: **59**
- Node subtests: **277 passed / 277 total**
- Failures: **0**
- Syntax checks: `main.js`, `preload.js`, all `lib/*.js`, `src/*.js` and the new Exact Lyrics test passed `node -c`.

## Exact Lyrics coverage added

- End-to-end IPC/UI wiring for `get-exact-lyrics`
- Theme-aware Exact Lyrics button
- Lyric-video search and candidate scoring
- Caption-first extraction policy
- Local Windows OCR fallback presence
- OCR timeline cleanup and static-watermark removal
- Preservation of repeated chorus lines
- Lyric-video → current-song timeline offset shifting
- Local transcript timing fallback that does not replace OCR lyric text
- Verified local Exact Lyrics cache priority over normal provider cache

## Renderer smoke test

The existing `tests/renderer-smoke.cjs` could not run in this container because the `linkedom` dev dependency is not installed here. This is an environment/dependency limitation, not a Node-test failure. The previous V6 source has the same dependency requirement.

## Windows-only smoke test still required

The local OCR path uses Windows.Media.Ocr through Windows PowerShell and therefore cannot be executed in the Linux build container. Before release, test at least:

1. a song whose normal lyrics are wrong but whose lyric video has captions;
2. a lyric video with no captions, forcing actual frame OCR;
3. an official music video with a 5–30 second intro to verify audio offset alignment;
4. a failed/low-confidence video to confirm existing lyrics are preserved;
5. the same song a second time to verify Exact Lyrics local-cache reuse.
