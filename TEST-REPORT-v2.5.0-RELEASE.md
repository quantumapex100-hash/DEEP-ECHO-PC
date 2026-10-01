# DEEP-ECHO 1.0 FINAL · v2.5.0 Release Validation

Technical updater/package version: **2.5.0**
User-facing milestone name: **DEEP-ECHO 1.0 FINAL**

Validation performed on the final V15 release source after the version bump:

- Node regression suite: **314 / 314 PASS**
- JavaScript/CJS syntax checks: all source/test JS/CJS files passed `node --check`
- HTML ID uniqueness: passed
- Package and package-lock root versions: **2.5.0**
- Release script expects/tag-pushes **v2.5.0**
- GitHub Actions release workflow rejects mismatched tags and publishes updater assets for **2.5.0**
- User-facing static release label: **1.0 FINAL**

Renderer smoke requires the dev dependency `linkedom`; it is not installed in this sandbox. The official release flow runs `npm ci` before `npm test`, so GitHub Actions will execute with the declared dev dependencies installed.
