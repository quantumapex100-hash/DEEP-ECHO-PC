# Playback and Next preparation — 13 October 2026

Safe changes retained in this development source:

- The playback resolver loads a small yt-dlp extractor plugin that caches only immutable, versioned YouTube player JS. The URL and content hash must match; entries expire after seven days and at most six versions retain their contents. Missing, disabled, corrupt or unwritable cache falls back to the normal yt-dlp player download. The bundled yt-dlp executable loads the plugin; no Python installation is needed to run DeepEcho.
- Next prepares and silently buffers exactly one imminent queue/context song even with Gapless disabled. The speculative audio never plays. Pending user clicks take priority, and game mode keeps its existing delayed preparation. Existing recent-source caching accelerates Previous.
- Search/Home intent preparation, the working audio relay, real-player timing, quality settings, full download recovery, lyrics and Exact Lyrics are retained.

Downloads/captions never receive the plugin flag. The accepted `lib/ytdlp-smart.js` remains byte-identical to the backup. The protected download/lyrics portion of `main.js` matches the backup after normalizing line endings. Android, release metadata and all Windows launch/release scripts are unchanged. `lib/**/*` already packages the plugin for future builds.

The 2–5 second fresh-song target is **not achieved or guaranteed**. Live tests still show varying YouTube extraction/CDN delays. A prepared click and an unprepared click are different measurements; millisecond prepared starts do not mean that extraction is instantaneous.

Verification:

- 488 Node checks and the renderer DOM smoke check pass. These cover rapid Next/Previous, stale requests, queues, local playback, lyrics, themes and downloads; mocked tests do not prove network latency.
- Five Python checks exercise the actual cache plugin with an isolated fake yt-dlp cache: cross-process/version reuse, corruption/expiry, unwritable cache, allowed player URLs and the six-version bound.
- Earlier live tests of the retained default-client/cache path played Husn and Counting Stars, captured an audio track for the existing analyser, and sought to 45 seconds. Prepared starts were 13–39 ms.
- Final live run: Husn extraction 7,190 ms, warmup 4,185 ms (including the harness's deliberate 700 ms settle), prepared start 16 ms, audio track present, seek to 45 seconds passed. Counting Stars extraction took 22,916 ms and its media warmup timed out at the origin. Therefore final live validation is mixed, not an all-song success.
- Experimental single-client and manifest-skipping optimizations were removed after live failures. No new resolver/client, manifest suppression, shortened extraction timeout or browser playback mode is in production.

Backup: `../../backups/before-cold-start-20261013/` contains the pre-change main, renderer, relay and yt-dlp wrapper. Sanitized test results are `final-live-results.json` and `final-tests.log` in that backup directory. Private probe JSON files contain temporary signed media URLs and must remain local.

To use these development changes, close the existing development app and open `START-OFFLINE.bat` in this same source directory. For saved timings use `START-PLAYBACK-DEBUG.bat`. No install or release script is needed. The main process requires a restart to load its changes.

Plugin implementation follows yt-dlp's supported extractor subclass mechanism documented in its [official plugin instructions](https://github.com/yt-dlp/yt-dlp#developing-plugins); the original extractor continues to resolve and authenticate the media.
