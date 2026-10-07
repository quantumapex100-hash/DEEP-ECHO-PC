# DEEP-ECHO 2.6.3 — V38 Zero-Wait Setup Test Report

## Validation
- Node regression suite: **429/429 PASS**.
- V38 setup tests: **4/4 PASS**.
- V37 yt-dlp reuse / Node 22+ Deno-skip tests remain passing.
- Application feature source is inherited from the accepted V37/V36 test line; V38 changes setup/tests/notes only.

## V38 fast path
`INSTALL.bat` now checks, in order:
1. Complete current `node_modules` -> npm skipped.
2. Complete sibling DEEP-ECHO V36/V37/V38 `node_modules` -> instant NTFS junction reuse, npm skipped.
3. Optional persistent dev dependency cache -> npm skipped.
4. Only if none are usable: npm cache-first fallback.

Optional Whisper bindings no longer trigger blocking repair downloads by default. Repair capability remains available when explicitly requested with `DEEPECHO_REPAIR_LOCAL_AI=1`.

## Runtime setup
V37 behavior remains: reuse yt-dlp before download, and Node 22+ skips the ~40 MB Deno runtime download.
