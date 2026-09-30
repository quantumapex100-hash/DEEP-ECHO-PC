# DEEP-ECHO Visual Polish Preview — Test Report

Base: stable v2.2.7 source.
Release status: **NOT RELEASED**. `package.json` remains `2.2.7` intentionally.

## Automated checks completed
- Node unit/regression suite: **230 passed, 0 failed**.
- New visual-isolation tests: passed.
- New JavaScript syntax check: passed.
- HTML ID validation: **290 unique IDs, 0 duplicates**.
- Critical-file SHA-256 comparison: unchanged for:
  - `main.js`
  - `preload.js`
  - `src/renderer.js`
  - `lib/lyrics-timeline.js`
  - `lib/lyrics.js`
  - `lib/transfer.js`
  - `lib/ytdlp-smart.js`

## Environment note
The repository's renderer smoke test requires the dev dependency `linkedom`. The extracted source did not include `node_modules`, and dependency installation could not be completed in this execution environment. The 230 dependency-free regression tests and static safety checks above completed successfully.

## Files changed from stable v2.2.7
- `src/index.html` — only loads the isolated visual layer and adds two visual settings controls.
- `src/v228-visual-polish.css` — new visual-only polish.
- `src/v228-visual-polish.js` — new visual-only settings persistence.
- `tests/v228-visual-polish.test.js` — safety/regression tests.
- `UPDATE-NOTES-2.2.8-TEST.md`
- `TEST-REPORT-v2.2.8-PREVIEW.md`

No public release/tag/update metadata was changed.
