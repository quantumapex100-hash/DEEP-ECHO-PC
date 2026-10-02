# DEEP-ECHO 2.5.0 V17 TEST REPORT

## Automated regression

- Node tests: **324 / 324 PASS**
- Failures: **0**
- Focused V17 lyrics-reference tests: **6 / 6 PASS**
- JavaScript / CJS syntax: **108 / 108 PASS**
- HTML IDs: **325 / 325 unique / 0 duplicates**

## V17 focused coverage

- Piecewise timing follows a music-video intro and a later dialogue-induced drift change.
- Repeated chorus occurrences remain separate after nonlinear timing warp.
- Word timestamps use the same nonlinear reference-to-playing-video map as lyric lines.
- Relevant lyrical video ranks ahead of the same song's original MV while the original MV remains selectable.
- Unrelated lyric-video results are prevented from winning solely because their title contains `lyrics`.
- Explicit Search version choice is preserved instead of being silently replaced by the Version Preference system.
- Automatic lyrical-reference calibration is wired before local-AI fallback.
- The automatic path reuses caption/audio helpers and does not invoke OCR.

## Regression protection

V17 does not replace the playback resolver, download engine, queue/navigation system, Smart Autoplay engine, Exact Lyrics OCR pipeline, visualizer engine, or updater. Search ranking and lyrics timing are the intended behavior changes.

## Real-device validation still required

This environment cannot run the Windows Electron renderer or yt-dlp.exe. On Windows, validate at least:

1. Search a known song and confirm a relevant lyrical video is near the top while Original MV remains visible.
2. Click the lyrical result and confirm that exact selected upload plays.
3. Search again and click Original MV; confirm it is not silently swapped to Official Audio.
4. Use a music video with a cinematic intro or dialogue section and confirm provider lyrics are upgraded in the background to the original MV timeline.
5. Confirm later repeated chorus lines remain synchronized to their later occurrence.
6. Confirm Word by Word remains monotonic after the remap.
7. Replay the same original MV and confirm the calibrated per-video cache loads without repeating the full alignment work.

No free/public lyrics provider can guarantee that every recording on YouTube has usable lyrics or captions. V17 substantially expands the automatic path; Exact Lyrics remains the explicit last-resort OCR rescue when timed reference data is unavailable.
