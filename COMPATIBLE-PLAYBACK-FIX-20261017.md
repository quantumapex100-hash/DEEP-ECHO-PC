# Compatible audio stall fix — 17 October 2026

## Findings

The original eight-second v200 network-stall watchdog did not yield while the main renderer owned startup or compatible-source recovery. It could start another Play request during that work. Separately, compatibility recovery could repeat remote extraction before preparing a local file, use the slow standalone extractor, and leave the renderer waiting on an unbounded IPC promise. Live tests also observed intermittent HTTP 403 and origin timeouts from resolved media routes; these are transport failures, not a visualizer issue.

## Changes

- The v200 watchdog now yields during startup, active compatible recovery and remote-media recovery, including when those start after its timer was scheduled. Ordinary established-playback recovery remains enabled.
- Playback recovery releases media warmers and explicitly prefers the local fallback after a rejected stream. The existing validated relay can be copied to the temporary cache, without repeating extraction. This copy has a four-second deadline; an unhealthy/expired/failed route uses the established extractor fallback.
- Temporary classic playback can use the same manifest-verified fast extractor as Play/Search. Downloads, captions and lyrics purposes still use their existing executable selection. Classic extraction now uses the existing playback JS-cache plugin and bounded socket/retry settings.
- A compatibility-only remote refresh is bounded to 12 seconds. Classic preparation retains its existing 60-second overall cancellation. Renderer compatibility IPC now has a 75-second deadline and always clears its timer. Progress carries the owning request ID, so a later song cannot receive the old preparation's status.
- The cancellation of a user-superseded job is kept separate from the short relay-copy deadline; only the latter may advance to extraction.

## Verification

- 519/519 Node tests and renderer DOM integration smoke passed. New tests exercise startup/recovery watchdog ownership, a hung IPC, timer cleanup/request identity, healthy relay reuse, failed/expired relays, a stalled copy deadline, and cancellation without starting more extraction.
- Fresh-profile Electron test used the real app renderer, IPC and native audio element. Without injected failures, Husn received HTTP 403 and successfully played a local compatibility file (about 17.4 s from selection including extraction); Never Gonna Give You Up streamed directly (about 6.7 s). Both reached readyState 4, unpaused, and advancing media time.
- A separate test deliberately rejected the initial relay Play call, then verified successful native local-file playback for both songs. These are two-song checks, not proof that every YouTube video/network condition will work or that fallback is instant.
- Five historical whole-main-process checksum expectations now accept this intentional compatibility fix; protected lyrics module hashes were not changed. The main download/lyrics implementation region from `runDownloadWithProgress` onward matches the pre-fix backup byte for byte. The accepted bright visualizer drawing region also matches its pre-fix backup byte for byte.

Backup: `../../backups/before-compatible-playback-fix-20261017/`.
Evidence: `.startup-diagnostic/compatibility-probe.json`, `compatibility-forced-success.json`, `compatibility-natural-stdout.txt`, and `compatible-playback-tests.txt`.

Restart the source app to load the fix. No installer or release was published.
