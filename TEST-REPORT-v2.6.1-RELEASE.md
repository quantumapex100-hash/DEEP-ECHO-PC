# DEEP-ECHO 2.6.1 · Release Test Report

- Release metadata: 2.6.1 PASS.
- Visible in-app release label: 2.6.1 PASS.
- Node regression suite: 369/369 PASS.
- JS/CJS syntax checks: 120 PASS.
- HTML IDs: 325/325 unique.
- GitHub workflow targets tag/package 2.6.1 and release title `DEEP-ECHO 2.6.1`.
- One-click `RELEASE-2.6.1.bat` runs `npm ci` + full tests before committing/tagging and aborts if `v2.6.1` already exists.
- `lib/youtube-captions.js` SHA256: `dc89d203b626f2dfa5b9a0e147268b21672a3ab53aa2a3e190e2fa26676e3339` (unchanged from accepted V26).
- `lib/lyrics-reference.js` SHA256: `56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4` (unchanged).
- `lib/exact-lyrics.js` SHA256: `f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4` (unchanged).
- No V19 sync logic is used.

The connector available in this chat does not expose the user's `windowsdaiyu-cyber/DEEP-ECHO` repository, so the final GitHub push/tag cannot be executed from this environment. Run `RELEASE-2.6.1.bat` from the extracted release source on the authenticated Windows machine to push `main`, create `v2.6.1`, and trigger the release workflow.
