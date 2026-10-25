# Search and extractor startup speed — 14 October 2026

Current source stays 2.6.6. No rollback or publication performed.

## Measured cause and change

The existing single-file yt-dlp executable took 12.763 seconds for --version alone. Its existing local cached copy took 11.724 seconds. Flat searches for 12 and 28 results took 17.824 and 16.463 seconds respectively; reducing result count did not fix the process startup overhead.

Downloaded the official unpacked Windows x64 build of the SAME nightly version, 2026.10.10.233141, and checked the archive against that release's SHA2-256SUMS. The official project documents this distribution at https://github.com/yt-dlp/yt-dlp#release-files . The original bin/yt-dlp.exe remains in place.

bin/fast-ytdlp contains the unpacked build and a manifest tied to the SHA-256 of the original executable. A small main-process routing wrapper selects this verified bundle only for Search, playback and prefetch. It checks all 140 runtime files once per original/manifest fingerprint. Missing, mismatched or corrupt bundles fall back to the original. Updating the original executable invalidates the fast bundle's source fingerprint, so a stale fast build is not silently retained.

Downloads, captions, lyrics and smart-cache requests retain their original runtime paths. No change to the search result count, lyrics-aware ranking, audio format preferences, production client order, signed source handling, relay, player, queue, seek, lyrics sync algorithms or download implementation. The main process body is identical to the preceding source after removing the small import/routing wrapper. Renderer, preload, ytdlp-smart helper, captions, lyrics timeline, Exact Lyrics and Smart Autoplay are unchanged.

## Results and practical limit

- Repeated unpacked --version: 369 ms. First unseen launches still encountered a one-time scan/loading delay.
- Actual main-process Search, including the existing two searches and lyrics-aware ranking: 3.471, 3.852 and 3.315 seconds; 20 results each.
- Actual cold Husn resolve with the retained production strategy: 29.552 seconds, then native Electron first audio in 4.303 seconds, one captured audio track and successful seek to 45 seconds. Another search-result source resolved in 30.451 seconds and started audio in 1.210 seconds with an audio capture track and successful seek.
- A separate original-executable Husn extraction took 46.482 seconds and recovered via the existing web_embedded fallback. These sequential live observations depend on upstream behavior and are not controlled universal speed guarantees.
- A preferred-client experiment gave promising standalone extraction timings, but the native run remained slow. Production client order was therefore retained.

The measured Search target is achieved on this connection. Fresh YouTube extraction is still not instant or consistently five seconds. Existing first-two Search preparation, hover preparation, recent-source reuse and bounded Next lookahead remain in effect; prepared-source startup and cold extraction are different timings.

## Verification and use

502 Node checks and renderer integration smoke passed; syntax checks passed. New runtime tests cover purpose isolation, corrupt/missing bundles, original-version updates and invalid manifest paths. Five historical main-file hash expectations were updated for the authorized routing wrapper; protected lyric/download checks remain.

Close running development app windows and use START-SAFE-GRAPHICS.bat (or the normal launcher if graphics works). No reinstall is required for this already-prepared project.

Backup and test evidence: ../../backups/before-search-speed-20261014. Restoring its main.js disables the optional runtime optimization. User profiles, songs and downloads were not restored, deleted or moved. Live probes used an isolated profile and muted native audio. The .startup-diagnostic folder is excluded from Git.
