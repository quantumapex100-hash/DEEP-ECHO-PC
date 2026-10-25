# Faster PC playback — 22 October 2026

The PC app now has a playback-only in-process audio resolver. It reuses an anonymous YouTube visitor session and HTTPS connections, requests progressive audio directly, preserves the existing quality selection, and verifies media bytes before handing the URL to the existing relay/player. It uses the same visionOS client profile already selected by the yt-dlp playback path; this is not a port of Android NewPipe or ExoPlayer.

The original yt-dlp extraction and classic recovery remain available. Search, downloads, captions, lyrics providers and other extractor calls bypass the new resolver. No new runtime dependency or installation step is required.

## Actual full-app results

An isolated, muted, offscreen Electron session used real online Search results and the existing player. Times are from pressing Play/Next/Previous to the audio element's `playing` event, not just audio-link extraction. Search-result preparation is active, as it is for normal users. Search time itself is excluded.

| Action | Audio started |
| --- | ---: |
| Play Husn search result | 2.908 s |
| Play Tum Hi Ho search result | 3.289 s |
| Play Golden Brown search result | 3.135 s |
| Next about two seconds after playback started | 3.322 s |
| Previous immediately afterward | 0.358 s |

No visible/focused test windows, media errors, captured renderer errors or fatal errors were recorded. Evidence: `.startup-diagnostic/user-audit-online-native-complete.json` and `.startup-diagnostic/native-complete-log.txt`.

A separate minimal player test confirmed actual decoding, playback-clock advancement and seeking to 40 seconds for all three songs. It measured 2.879 s, 0.628 s and 0.634 s, with cached Previous at 0.020 s. Those minimal-player timings are not presented as full-interface timings. Earlier full-app measurements were around 9–15 seconds; network conditions and selected uploads can affect comparisons.

## Reliability and scope

- Startup stops reading the homepage as soon as session metadata arrives, rather than waiting for its full multi-megabyte feed.
- The native attempt has a bounded 5.5-second overall budget. Unsupported, denied, live, encrypted or mismatched responses fall back to the original resolver.
- An unavailable individual song does not disable fast playback for other songs. Repeated failures back off.
- Superseded playback aborts promptly without launching stale fallback work or invalidating the shared session.
- Normal AAC quality is preserved; the Data quality setting still selects a lower-bitrate stream.
- Existing resolver caches, lookahead, player, visualizers, lyrics timing, downloads and recovery handlers remain in place.

All main-process source bytes outside the small resolver integration are identical to the previous accepted source; a new regression test verifies this. Historical whole-file guards were updated to the reviewed integration hash. The original yt-dlp wrapper and protected lyrics files were not changed.

## Validation

- Full regression suite: **588 passed, 0 failed**.
- Renderer smoke test: passed.
- Native-resolver tests cover quality, early startup completion, real-byte validation, fallback isolation, cancellation, restricted tracks, deadlines, shutdown, redirects and unchanged main handlers.
- Real hidden full-app playback and separate actual seek/Previous checks passed.

These are measured samples, not a guarantee for every song or connection. Restricted uploads or provider/network failures can still use the slower recovery path. Source changes apply when the updated source app is restarted; an already installed release needs a new build/update to include them. No release was published during this change.

Backup: workspace `backups/before-mobile-speed-20261022/`.

Reproducible transport benchmark: `node scripts/benchmark-playback.cjs` (uses hidden, muted windows and an isolated profile). Set `DEEPECHO_DISABLE_NATIVE_AUDIO=1` for the original resolver comparison. Full-app audit can enable `DEEPECHO_AUDIT_LIVE=1` and `DEEPECHO_AUDIT_NEXT=1` with `scripts/audit-user-journey.cjs`.
