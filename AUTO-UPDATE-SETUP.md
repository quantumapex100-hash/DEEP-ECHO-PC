# DEEP-ECHO Auto Update Setup

DEEP-ECHO uses `electron-updater` with GitHub Releases. The current release target is `2.3.0`.

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

For the official 2.3.0 build, run `RELEASE-2.3.0.bat` once from the release-ready source folder. It verifies the package version, installs exact dependencies, runs the full test suite, pushes `main`, creates/pushes `v2.3.0`, and triggers the tag-only GitHub Actions workflow.

GitHub Actions builds the NSIS installer and publishes it with `.blockmap` and `latest.yml` to `DEEP-ECHO-Releases`. Installed DEEP-ECHO builds then detect the newer version and show the normal in-app update prompt.

## One-click helpers included in this package

- `PUSH-SOURCE-TO-GITHUB.bat` — one-time source initialization/push to the private source repository.
- `CLOUD-RELEASE.bat` — after the secret is configured, runs tests, pushes source, creates the version tag, and triggers the Windows cloud release. It intentionally refuses to overwrite an existing version tag.
- `Build-Karo.bat` — local fallback installer build only; normal future releases should use the cloud workflow.

The first updater-enabled installer must be installed manually once. After that, newer published versions can be downloaded from inside DEEP-ECHO.
