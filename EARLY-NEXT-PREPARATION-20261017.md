# Early Next preparation — 17 October 2026

Implemented source changes:
- Start the Next warmup immediately after the selected audio is confirmed playing, before analyser setup finishes. A matching audible request can use this lane; other loading selections still block speculative work.
- Retain existing main-process cancellation, priority and resolver deduplication. A new Play click owns playback and cancels unrelated old warmups. Game Mode remains conservative.
- Smart Autoplay reserves one relevant already-known recommendation using the existing taste/artist/vibe score, without any network request during the selected song's startup. Initial scoring is capped at 48 candidates.
- Keep that imminent recommendation stable when slower radio discovery arrives. A new seed invalidates prior discovery. Played candidates and duplicate song families remain excluded; explicit queues, loop-one, Downloads and playlists retain their existing semantics.

Scope and protection:
main.js and its Search/audio resolver and download code are byte-identical to the pre-change backup. lib/ytdlp-smart.js and the extractor client choices are unchanged in this task. The renderer diff affects only the confirmed-audio warmup call and warmup ownership guard. Its lyrics timing/sync code, accepted per-theme bright visualizer and presentation code are unchanged. No new audible player, full-file cache or download behavior was added.

Known limitation / live findings:
This is an early preparation improvement, not proof of universal instantaneous playback. On the live service, a cold next song requested about 2 seconds after current audio started still required 7.763 seconds in one test. A different cold source hit 403 and recovered successfully in 19.487 seconds. The baseline cold Search-context Next also took 21.134 seconds. These use different tracks/server responses and are not a controlled percentage-speed comparison. A further fresh-profile run measured cold Next 10.286 seconds and the same cached Next 2.025 seconds, both requested about 2 seconds after first audio. Search first audio in that run was 5.684 seconds. Neither cold nor cached measurements establish instantaneous playback. Network/extraction/compatibility remains the bottleneck when 2 seconds is insufficient to prepare the next source. Search first-audio also varied independently before Next warming started; do not claim the previous 2–5-second goal always holds.

Live evidence:
.startup-diagnostic/early-next-before.json (cold Search-context baseline)
.startup-diagnostic/early-next-after.json (two-second queued Next with codec/403 recovery)
.startup-diagnostic/early-next-rick.json (two-second queued cold Next)
.startup-diagnostic/early-next-repeat.json (fresh/cached repeat test)
The native probe uses real IPC, native decoding and real playing events in a fresh profile. Smart Autoplay is disabled for the controlled manual-queue transport measurements; its candidate selection, reservation, stale-network behavior and ownership are tested separately with controlled inputs. Audio is muted at webContents; the media clock/decoder run.

Backup: ../../backups/before-early-next-20261017
Restart the source app to load these source changes.

Verification: 535/535 tests passed plus renderer DOM smoke. Added behavioral tests cover audible ownership, superseding clicks, relevant local reservation, empty metadata, a 48-candidate scoring bound and late discovery preserving or respecting consumption of the reserved Next. Explored skipping the YouTube webpage request in a diagnostic only; it failed bot-check and was not shipped.
