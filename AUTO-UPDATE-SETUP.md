# DEEP-ECHO Auto Update Setup

DEEP-ECHO 2.1.0 uses `electron-updater` with GitHub Releases.

- Source repository: `windowsdaiyu-cyber/DEEP-ECHO`
- Public release repository: `windowsdaiyu-cyber/DEEP-ECHO-Releases`
- Update channel: stable/latest

## One-time GitHub secret

In the source repository open:

`Settings -> Secrets and variables -> Actions -> New repository secret`

Create:

- Name: `RELEASE_TOKEN`
- Value: a fine-grained GitHub personal access token that has **Contents: Read and write** access only to `DEEP-ECHO-Releases`.

Never put this token in source files or chat messages.

## Releasing

1. Increase `package.json` version, for example `2.1.1`.
2. Commit the changes.
3. Create/push tag `v2.1.1`, or manually run the **Build and publish DEEP-ECHO Windows release** workflow.
4. GitHub Actions builds the NSIS installer and publishes it, together with electron-builder update metadata, to `DEEP-ECHO-Releases`.
5. Installed DEEP-ECHO builds detect the new version and show an in-app update prompt.

## One-click helpers included in this package

- `PUSH-SOURCE-TO-GITHUB.bat` — one-time source initialization/push to the private source repository.
- `CLOUD-RELEASE.bat` — after the secret is configured, runs tests, pushes source, creates the version tag, and triggers the Windows cloud release. It intentionally refuses to overwrite an existing version tag.
- `Build-Karo.bat` — local fallback installer build only; normal future releases should use the cloud workflow.

The first updater-enabled installer must be installed manually once. After that, newer published versions can be downloaded from inside DEEP-ECHO.
