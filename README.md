# DEEP-ECHO 2.6.3 — INSTANT PLAYBACK ALL-SURFACES OFFICIAL RELEASE SOURCE

DEEP-ECHO 2.6.3 promotes the accepted V35 performance line to the next official Windows release. It is built on V34 Startup Performance plus V32/V33 playback recovery/warmup behavior, and specifically targets slow Play and slow Next transitions across Search, Home and discovery surfaces.

## What 2.6.3 changes
- Real Play requests have strict priority over stale Search/Home/old-song speculative resolution.
- If the clicked song is already being warmed, playback reuses the same resolver job instead of duplicating yt-dlp work.
- Stale speculative resolver work is cancelled when a different song is selected.
- Resolver priority: Playback > Next > pointer/click intent > Search warmup > passive Home-card warmup.
- Search prepares up to six likely visible songs with controlled single-flight warmup.
- Home, Recently Played, Made For You, Because You Listened To and Continue Listening cards receive pointer/focus intent warmup.
- First visible Home cards can receive very-low-priority URL pre-resolution without stealing priority from actual playback.
- Next-song URL pre-resolution begins about 90 ms after successful playback, including with Gapless OFF.
- Gapless still controls media-byte prebuffering; URL pre-resolution is independent.
- Downloads/local songs remain on the existing direct local playback path and bypass remote prefetch.

## Protected systems
The accepted lyrics and recommendation stack is intentionally preserved: lyrics timing/alignment, Exact Lyrics, YouTube captions, lyrics providers, Word-by-Word timing, Pronunciation, Floating Lyrics, Immersive Lyrics and Smart Autoplay. The permanent Download handler and renderer download flow are also preserved from V34.

## Release
Run `RELEASE-2.6.3.bat` from a fresh extracted source folder. It runs `npm ci`, the complete automated suite, pushes the source to the configured GitHub repository, creates tag `v2.6.3`, and triggers the Windows cloud build/publish workflow. If preflight fails, it stops before tagging.

## Local test
Run `INSTALL.bat` once when needed, then `START-OFFLINE.bat`. Test Search → Play, Home/discovery → Play, repeated Next with Gapless OFF/ON, Downloads playback/download saving, and all lyrics surfaces before public rollout.
