# DeepEcho PC: verified live playback route repair — 13 October 2026

This report supersedes the earlier unresolved-network status. The exact reported Husn song and Counting Stars now play in isolated Electron tests using the application's actual yt-dlp resolver and native Node streaming relay. Source version stays 2.6.6; no release scripts or publishing were run.

## Actual cause

The user's debug log showed a completed extraction followed by audio-origin timeouts, fresh extraction, and another origin timeout. The primary GoogleVideo CDN shard in the signed URL was unreachable on this connection. A second shard advertised in the same URL responded and redirected to a working audio endpoint. The unchanged signed media request returned HTTP 206 there. Browser playback was asked about only to distinguish a general connection failure from this extracted-route failure; the app remains Electron + yt-dlp and does not require opening a browser to play.

## Final repair

- Keep the existing yt-dlp resolver, default audio format preference, IPC bridge and HTML audio player.
- Retain the native Node HTTP/HTTPS transport inside Electron. The prior Chromium-fetch injection was removed from main.js because it did not handle this live route successfully in the installed runtime. Its helper/test files remain unused by production.
- Read only the CDN shard names advertised in the source's own `mn` field. Preserve the signed query and path. Restrict routing/redirects to the existing HTTPS GoogleVideo rule.
- If the primary has not produced headers, try one advertised alternative after 350 ms. At most two origin requests race; cancel the loser immediately. This does not create another resolver or warm additional songs.
- Reuse the successful redirect target for subsequent seek ranges. Briefly prefer the successful advertised shard for later sources from the same primary shard, while retaining the original route as a fallback.
- Retain existing Search top-two warmup, pointer intent, Next prefetch, latest-click cancellation, URL expiry and error handling. Warmed media uses the same CORS mode as playback and can be reused from the private media cache.

## Verified live measurements

Actual main-process resolver, existing format preference, Search-style prebuffer, then cached click/play:

| Live song | URL preparation | Media warmup | Prepared click → playing | Seek | Analyser |
| --- | ---: | ---: | ---: | --- | --- |
| Husn (`1ncISVNNzZg`) | 9,910 ms | 3,150 ms | 15 ms | 45 seconds succeeds | 1 audio track |
| Counting Stars (`hT_nvWreIhg`) | 14,347 ms | 2,147 ms | 24 ms | 45 seconds succeeds | 1 audio track |

These are real audio, not synthetic media fixtures. The isolated player is muted. Warmup measurements include a deliberate 700 ms settle interval in the harness. In a separate resolved-but-unbuffered Husn test, first playing took 1,763 ms; a separate warmed test took 17 ms.

Cold URL extraction is still not instant: the initial 10–14 second preparation must finish before prepared-click timings apply. A result clicked before warmup is ready joins the same extraction instead of starting duplicate work. This repair establishes live playback and very fast prepared-source starts; it does not claim every uncached song begins instantly.

Faster Android/VR extraction probes were rejected for production: they returned a format whose live media request failed. A metadata-skipping probe encountered verification failure. The verified default yt-dlp path is preserved rather than shipping those unsuccessful shortcuts.

## Regression verification

485 automated tests pass plus renderer DOM smoke, covering Home/Search selection, rapid Next and selection, Previous, queue/manual priority, hidden Smart Autoplay, lyrics, themes, local files and downloads. New routing tests verify signed-query preservation, successful fallback before primary timeout, range seeking and reuse across tracks. The main-process download/lyrics section remains identical to the pre-repair snapshot. No Android files were accessed.

## Files changed in this follow-up

- main.js: remove unsuccessful fetch transport injection; use native relay.
- lib/playback-relay.js: bounded advertised-CDN routing, loser cancellation and successful-route reuse.
- tests/playback-cdn-route.test.js: new behavioral tests.
- tests/v273-red-nebula-performance.test.js, tests/v40-floating-nebula-polish.test.js, tests/v41-nebula-dot-core.test.js, tests/v42-v265-fast-resume-premium-nebula.test.js, tests/v43-search-lyrics-init-hotfix.test.js: authorized main-process checksum update only.
- PLAYBACK-STREAM-REPAIR-NOTES.md: this report.

Renderer, preload, lyrics, Exact Lyrics, downloads, Smart Autoplay and Windows launch/build scripts were not changed in this follow-up.

## Test the complete source app

Close the old DeepEcho process and reopen START-PLAYBACK-DEBUG.bat in this source folder. Search Husn and play a result. Normal launching remains START-OFFLINE.bat. A running process retains its old main-process code until restarted.

The debug log is %LOCALAPPDATA%\DeepEcho-PC-Development\playback-debug.log. Successful routing records origin-response with status 206 and route-ready, followed by the renderer's first-audio/playing events. Signed media URLs and cookie contents are not printed.

Backup and evidence are in ../../backups/before-live-route-repair-20261013. main-resolver-live-results.json contains the actual resolver/audio measurements; route-results.json and alternate-results.json document the failed primary and successful alternate; final-tests.log records the complete suite. Files named *private-source.json contain temporary signed URLs for diagnostics and must not be published.

The preceding backup before-stream-repair-20261013 remains available. Restore backup files only with DeepEcho closed and restore the matching checksum expectations if rolling back.
