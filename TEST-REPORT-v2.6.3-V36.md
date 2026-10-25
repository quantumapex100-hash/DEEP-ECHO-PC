# DEEP-ECHO 2.6.3 — V36 TEST REPORT

## Automated results
- Node regression suite: **421/421 PASS** (414 existing + 7 new V36 tests).
- V36 focused tests: **7/7 PASS**.
- JS/CJS syntax checks: **132/132 PASS**.
- `src/index.html` IDs: **331/331 unique**.
- Renderer smoke: blocked only because the sandbox does not have test-only `linkedom` installed. The source declares `linkedom` in devDependencies; a normal `npm ci` environment can run this smoke step.

## Protected-file SHA256 verification
- `main.js`: `b9e0b10b42a860e835dd6ee78a22a258727d7f7ab0836be23d3a19f168452a89`
- `preload.js`: `43624209119d865ccd2fcca44dda7b1eb49357933301d9fda655858eed979e83`
- `lib/exact-lyrics.js`: `f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4`
- `lib/youtube-captions.js`: `dc89d203b626f2dfa5b9a0e147268b21672a3ab53aa2a3e190e2fa26676e3339`
- `lib/lyrics-timeline.js`: `7e1447ede0b9d5981b9d1b4e857e2dccf710677595c26bdda0bd1cb477317017`
- `src/v238-smart-autoplay.js`: `200514239517b4a4238c2b9dc3e497f17ab63bd1784e6d64c52e076072433048`

## Core renderer comparison
The accepted 2.6.3 source and V36 were compared around playback/lyrics/download primitives. `playLocal`, `playRemoteSong`, `downloadSong`, `lyricsPlaybackClock`, `findActiveLyricIndex`, `loadLyricsFor`, base `playContextAt`, base `playNext`, `playSongObject`, and `syncLyrics` remain unchanged. V36 adds presentation/theme code and a narrow manual-Next scheduling wrapper change.

## Local smoke checklist
1. Launch repeatedly and confirm Home appears immediately without a heavy first-paint hitch.
2. Confirm saved theme + current song restore, but the previous tab does not reopen.
3. In Lyrics, manually scroll away and click **Sync to video**; it should return to the currently playing lyric.
4. Test the Sync button in several themes and confirm it is opaque/theme-matched.
5. Rapidly use manual Next from Search/Home playback and confirm the upcoming song starts quickly.
6. Test a downloaded song and Downloads download flow.
7. Test normal synced lyrics, Word by Word, Pronunciation, Exact Lyrics, Floating Lyrics and Immersive Lyrics.
8. Select Red Nebulae and test main UI, visualizer, Floating Lyrics, Immersive Lyrics, Mini Player and Immersive Player.
