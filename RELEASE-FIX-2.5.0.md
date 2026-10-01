# DEEP-ECHO 2.5.0 Release Package Fix

This corrected source archive restores release-control dotfiles that were accidentally omitted from the previous ZIP packaging step:

- `.github/workflows/release-windows.yml`
- `.gitignore`
- `.gitattributes`

No application playback/UI/lyrics/download code was changed for this packaging fix. `RELEASE-2.5.0.bat` now also fails early with a clear message if any of these required files are missing.

Validation:
- Focused v2.2.1 + v2.5.0 release tests: 7/7 passed.
- Node regression suite: 314/314 passed.
- Renderer smoke requires the npm-installed `linkedom` test dependency; the one-click release script runs `npm ci` before `npm test` on Windows.
