# DEEP-ECHO 2.2.4 — Download recovery hotfix

This hotfix restores the permanent Download button path after YouTube bot-check/authentication failures began blocking anonymous yt-dlp requests.

## What changed

- Permanent downloads keep the same normal yt-dlp path first.
- Only after a YouTube bot-check / access-403 failure, DeepEcho retries through safe alternate YouTube clients.
- If the existing Settings > YouTube Access option is enabled, the Download path can also retry with that user-selected logged-in browser.
- Browser cookie access remains opt-in; it is never enabled silently.
- Raw mojibake-heavy yt-dlp bot errors are replaced with a short actionable DeepEcho message.
- Download cancel, progress, quality selection, library save, artwork caching, playback, lyrics, themes, overlay and update behavior are otherwise unchanged.

## Validation

- 214 Node tests pass, including three new download-recovery regression tests.
- The renderer smoke step could not run in the source-only archive environment because node_modules/linkedom is intentionally not bundled in the source ZIP. Run `npm ci` before `npm test` on the normal Windows source folder to execute that final smoke step.

## Windows test

1. Run `Setup-YtDlp.bat` once, then start DeepEcho.
2. Download 3 normal songs from Search/Home. Confirm progress reaches Done and files appear in Downloads.
3. Retry the exact song that previously showed `Sign in to confirm you’re not a bot`.
4. If YouTube still blocks your IP, enable Settings > YouTube Access and select the browser where YouTube is already signed in, then retry.
5. Play a downloaded song offline, then test streaming, lyrics, queue, visualizer and floating overlay to confirm there is no regression.
