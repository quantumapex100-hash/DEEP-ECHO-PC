# DEEP-ECHO 2.2 END — Release Candidate

Public release title: **2.2 END**  
Updater / package version: **2.2.8**  
Release tag: **v2.2.8**

## One-run release path
Run **RELEASE-2.2-END.bat** once from the extracted source folder.

The BAT pushes the final source to `windowsdaiyu-cyber/DEEP-ECHO`, creates tag `v2.2.8`, and pushes that tag. The workflow is tag-only, so the tag push starts exactly one release workflow run.

The single workflow run then:
1. checks the release token and version/tag,
2. installs dependencies,
3. bundles latest yt-dlp,
4. runs the complete automated test suite,
5. builds and publishes the Windows installer to `windowsdaiyu-cyber/DEEP-ECHO-Releases`,
6. renames the GitHub release to **2.2 END**, applies final notes, and marks it latest.

## Local preflight
Node regression suite: **243 passed, 0 failed**.

## Important
- Do not run `PUSH-SOURCE-TO-GITHUB.bat` first.
- Do not manually push a tag.
- Do not run the release BAT a second time while the workflow is already running.
- Existing users remain on semantic updater version `2.2.8`, allowing normal in-app update detection from 2.2.7.
