# DEEP-ECHO 2.5.0 V22 TEST REPORT

- Node regression: 346/346 PASS
- V22 focused tests: 5/5 PASS
- JS/CJS syntax: 118/118 PASS
- HTML IDs: 325/325 unique
- Renderer smoke: not executed in sandbox because test-only `linkedom` is not installed in the runtime.
- V21 -> V22 safety: `lyrics-reference.js` and `exact-lyrics.js` SHA-256 hashes are unchanged.

Primary Windows checks:
1. Resize DEEP-ECHO to windowed mode and verify the search input remains readable/usable.
2. Play a song whose first upload has no verified lyrics; recovery panel should appear quickly.
3. Play a lyrics-ready version once, then try another normal upload of the same song; canonical lyrics memory should reduce rediscovery.
4. Turn Pronunciation ON and verify Lyrics page, in-app Immersive Player, Floating Lyrics, and separate Immersive Lyrics all show pronunciation.
