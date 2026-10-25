# Prepared playback speed — 17 October 2026

## Why the 45% stage waits

`Restoring classic playback · 45%` is a fixed preparation-stage indicator. It does not mean 45% of the audio has downloaded. A rejected remote stream enters this stage and the existing compatibility path prepares a complete local audio file before the media element can play it. Network extraction/verification and transfer time can therefore remain visible here.

## Changes

- Play and prefetch now reuse already completed temporary compatibility files. Previously a new selection could resolve YouTube again despite having just prepared the same song. A click during an existing same-song preparation joins that job instead of starting another resolver.
- Only complete, nonempty, matching-ID files younger than 12 hours are eligible. Partial, expired and missing files cannot bypass resolution. This is the existing temporary playback cache, cleared on app quit; it is not a new persistent download library.
- If a hovered candidate or the imminent Next track fails media prebuffering, the existing priority/cancellation machinery can prepare its local fallback ahead of the click. Passive cards/search results do not automatically download all their songs. A later song selection, changed quality, Game Mode or replaced warmer prevents a stale result from taking over the player's cache.
- Streaming format selection, quality, analyser, lyrics clock and visualizer remain unchanged. Downloads and lyrics implementation from main's `runDownloadWithProgress` onward matches the previous backup byte for byte. The accepted bright visualizer drawing and lyric ticker also match their backup byte for byte.

## Measurements and limits

Fresh isolated Electron profile, real renderer/IPC/native media:

- Initial Husn was deliberately sent through compatible recovery: first audio about 16.56 seconds. This cold blocked-source delay is **not eliminated**.
- Another song was prepared ahead of selection: preparation took 11.52 seconds; after selection, first audio took 354 ms.
- Returning to the prepared Husn file: first audio 165 ms, no new extraction.
- Separate direct-URL replay sample: about 62–66 ms after selection. That URL-cache behavior already existed; the new improvement also covers local compatibility files and preparation in progress.

These distinguish work done before selection from actual selection-to-audio time. They are short measurements on two videos, not a guarantee that arbitrary cold YouTube tracks start instantly.

525/525 Node tests and renderer DOM smoke passed. New behavioral coverage verifies complete-file selection, expiry/identity, actual stream-handler reuse/joining, bounded intent warmup, and stale selection/quality guards. Historical whole-main checksums accept this explicit playback-only evolution, and the Next warmup signature assertion now requires its song identity argument.

Exploratory format/client/native-network/check-formats probes were not enabled in production: results were variable and format verification itself added seconds. No lower-bitrate shortcut was shipped.

Backup: `../../backups/before-instant-playback-20261017/`.
Evidence: `.startup-diagnostic/instant-prepared-results.json`, `instant-prepared-stdout.txt`, `instant-cold-and-url-replay.json`, and `instant-playback-tests-final.txt`.

Restart the source app to load the new cache/warmup handling. No release was published.
