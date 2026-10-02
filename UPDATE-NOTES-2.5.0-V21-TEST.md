# DEEP-ECHO 2.5.0 V21 TEST — Lyrics Failure Recovery

Base: clean V20 V18-Stability source. V19 is not used.

## Why V21 exists

Some YouTube uploads can play normally but still fail the base lyrics verification even when another upload of the same song has good synchronized lyrics. A title containing “Lyrics” was also previously shown with a `Lyrics video · Sync` badge even though DeepEcho had not actually verified sync for that exact upload.

## What changed

- Added a theme-native lyrics failure recovery panel inside the existing failure card.
- Failure recovery first retries the CURRENT video with cleaner canonical artist/title metadata. This repairs uploader-heavy/movie soundtrack titles without changing the video.
- If the current upload still cannot produce verified synced lyrics, DeepEcho searches the same song through lyrics / lyric-video / official-lyrics / official-audio routes.
- Candidate versions are ranked by song-title similarity, artist similarity, duration, lyric-video hints, and version safety. Live, cover, remix, slowed/reverb, karaoke, instrumental and similar wrong-version candidates are heavily penalized.
- DeepEcho verifies candidates instead of trusting the word “Lyrics” in the title. A candidate is accepted only when it has a real timed lyric timeline from the exact video captions or a synced lyrics provider.
- When a working version is found, the button changes to `Play lyrics-ready version`. Playback switches to that same song version while the existing queue/context and next-track order stay intact.
- Verified lyrics are cached for the chosen video, so the new version should not immediately fall back into the same failure path after switching.
- Previously verified same-song replacements are remembered and re-checked first on future failures.
- Search result badge wording is safer: a title-based lyric-video candidate shows `Lyrics video`; only an actually verified recovery candidate can show `✓ Lyrics verified`.

## Protected systems

The V18/V20 timing engines are deliberately unchanged:
- `lib/lyrics-reference.js` SHA-256: `56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4`
- `lib/exact-lyrics.js` SHA-256: `f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4`

V19 code is not used as the base or imported into the V21 recovery path.

## Validation

- Node regression: 341 / 341 PASS
- V21 focused recovery tests: 6 / 6 PASS
- JS/CJS syntax: 116 / 116 PASS
- HTML IDs: 325 / 325 unique
- Renderer smoke cannot start in this sandbox because test-only `linkedom` is not installed in the runtime.

## Windows test target

Re-test the reported Sitaare case:
1. Play the first recommended upload that previously showed `Base lyrics could not be verified`.
2. V21 should first try repairing the current upload automatically.
3. If that fails, the failure card should show/find a verified same-song version.
4. Press `Play lyrics-ready version`; the same song should switch to the verified upload and load synced lyrics, while Next still continues the original queue/context.

This is a TEST build, not a public release.
