# Search-result playback latency — 17 October 2026

Implemented in the source app, version 2.6.6. No release published.

## Cause and fix
The bundled extractor's default YouTube client can return a signed audio URL with a future `available_at`. Requesting the URL early produces HTTP 403, even though the same URL works after its availability time. This sent ordinary playback into the slow compatibility/full-file recovery path.

Direct playback/prefetch now tries the visionOS AAC client first, skipping its optional configuration request while preserving webpage discovery. The original default/embedded/VR fallback order remains after it. The requested audio format/quality is unchanged. Other purposes, including downloads and lyrics, retain their existing client selection.

The resolver preserves `available_at` in milliseconds alongside the original headers. The relay respects that readiness time on any fallback client and cancels the wait on disconnect/supersession, avoiding premature 403 and repeated extraction.

## Native app measurements
Fresh isolated profiles, actual Search IPC and rendered result Play button, native Electron audio element, no deliberate hover or preparation delay. Timer starts immediately before clicking Play and stops at the real `playing` event. Search time is separately recorded. Tests use software graphics because of this machine's existing graphics startup issue. Audio is muted at webContents for automated tests; the actual decoder and media clock run.

Latest real Search-result runs:
- HUSN official video gJLVTKhTnog: search 2827 ms; click-to-audio 4605 ms.
- Rick Astley Pianoforte official audio GHMjD0Lp5DY: search 6889 ms; click-to-audio 4595 ms.
- Arz Kiya Hai official lyrical video Kg8_ADYhYWE: search 3445 ms; click-to-audio 3574 ms.
All three used direct relay audio, native readyState 4 and advancing media time, without compatibility recovery.

Earlier runs with this change also had network/resolution outliers of 8.4 and 11.5 seconds. Therefore a universal 2–5 second upper bound is not established. Cold extraction, remote server delay and exceptional codec recovery remain external/slow cases. Do not describe these measurements as a guarantee for every song.

Controlled codec-rejection test on Arz Kiya Hai successfully recovered to a local file and advancing audio clock (16.5 seconds including forced recovery). This verifies fallback safety, not a 5-second claim for recovery.

Evidence (local diagnostics):
- .startup-diagnostic/search-fast-first.json — earlier slower run
- .startup-diagnostic/search-fast-second.json — two latest direct Search results
- .startup-diagnostic/search-arz-fast.json — Arz direct
- .startup-diagnostic/search-arz-recovery.json — forced codec recovery
- .startup-diagnostic/search-debug-stdout.txt and arz-fast-stdout.txt — resolver/transport stages, without signed URLs

## Verification
529/529 tests passed, plus renderer DOM smoke. Added behavioral checks for future availability, cancellation during wait, explicit-client opt-in, and resolver propagation of readiness/headers and legacy fallback chain.

Historical whole-file hash assertions updated only for the reviewed intentional playback changes; protected lyrics hashes remain unchanged. Compared against backups/before-search-cold-playback-20261017: src/renderer.js is byte-identical, including accepted bright per-theme visualizer and lyrics sync; main.js changes are limited to direct resolver client priority and readiness metadata. Its download implementation and following code are unchanged. lib/ytdlp-smart.js only adds the explicit visionOS option; default download/caption behavior remains unchanged.

Backup: ../../backups/before-search-cold-playback-20261017
Restart the source app to load the updated main process.
