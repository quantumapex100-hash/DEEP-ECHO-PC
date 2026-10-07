# DEEP-ECHO 2.6.5 — OFFICIAL WINDOWS RELEASE SOURCE

This source promotes the accepted V43 line to public version **2.6.5**. It includes the Red Nebulae theme, Floating Lyrics refinements, faster previous-session resume and discovery playback warmup, plus the Search/Lyrics startup initialization hotfix.

## Protected systems
The accepted lyrics timing/alignment engine, Exact Lyrics, Word by Word, Pronunciation, Smart Autoplay, main-process playback resolver and permanent Downloads/local-file pipeline are preserved.

## Test locally
1. Run `INSTALL.bat` only for a fresh source checkout.
2. Run `START-OFFLINE.bat`.
3. Verify Search, lyrics, Home playback, previous-session resume, manual Next, Downloads, Floating Lyrics, Immersive Lyrics and Red Nebulae.

## Publish 2.6.5
Run **`RELEASE-2.6.5.bat`** from this extracted source folder. It performs `npm ci`, the complete automated suite, pushes source to `main`, creates tag `v2.6.5`, and triggers the Windows GitHub Actions build/publish workflow. If preflight fails, it stops before tagging.

The workflow publishes:
- `DEEP-ECHO-2.6.5-Setup.exe`
- `DEEP-ECHO-2.6.5-Setup.exe.blockmap`
- `latest.yml`

Those assets keep the existing in-app updater working for older installations such as 2.6.3.
