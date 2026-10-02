# DEEP-ECHO v2.6.0 Release Check

- package.json version = 2.6.0
- package-lock.json root versions = 2.6.0
- `.github/workflows/release-windows.yml` exists and enforces tag/package parity
- `RELEASE-2.6.0.bat` runs `npm ci` and `npm test` before tagging
- Git tag = `v2.6.0`
- Release assets verified: installer, blockmap, latest.yml
- V19 code is not used as release lineage
