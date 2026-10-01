# DEEP-ECHO 2.3.0 V10 TEST REPORT

Date: 2026-10-01
Build: Smart Home + GPU Control test build
Base: V9 Precision Lyrics

## Automated results

- Node regression suite: **295 / 295 PASS**
- Failed Node tests: **0**
- JavaScript syntax scan: **91 files checked, 0 syntax failures**
- `src/index.html` IDs: **324 total / 324 unique / 0 duplicates**
- Focused V6/V7/V8/V9/V10 feature tests: **32 / 32 PASS**

## Covered V10 behavior

- GPU adapter detection IPC + preload bridge + Settings selector
- high-performance / low-power boot preference plumbing
- per-song Exact Lyrics OFF reset
- missing-base-lyrics Exact Lyrics guidance
- Smart Autoplay placement below Search
- duplicate song-family filtering and stronger taste scoring
- Home taste/popular blending
- section-scoped See More refresh
- custom shelf scrubber + native scrollbar suppression
- preservation of Downloads/Liked/Playlist/Queue playback semantics

## Renderer smoke limitation in this container

`npm test` runs all 295 Node tests successfully, then the separate renderer smoke harness cannot start because the test-only `linkedom` module is not installed in this sandbox. The source declares `linkedom` in package/package-lock, but the working test container has no installed `node_modules` copy. No renderer-smoke failure from application code was observed; the harness stops at `Cannot find module 'linkedom'` before loading the renderer.

## Windows-only validation still required before public release

- Actual multi-GPU enumeration and Windows/driver adapter selection after restart
- Real custom cursor behavior while dragging the shelf scrubber
- live YouTube recommendation quality for Smart Autoplay and refreshed Home shelves
- Exact Lyrics OCR/local Windows OCR path

## Release status

**TEST ONLY.** Do not tag/publish this as the public 2.3.0 release until the Windows checks above are completed.
