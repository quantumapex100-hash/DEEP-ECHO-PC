# DEEP-ECHO 2.3.0 V9 TEST — Precision Lyrics Sync + Exact Lyrics Switch

## Base Lyrics Engine — Precision Sync V2

- LRCLIB/provider synced lyrics are no longer corrected with only one global time offset.
- DEEP-ECHO now builds multiple text anchors against the exact playing video's source-language YouTube captions and performs a piecewise timing warp.
- This is designed for music videos with intros, dialogue breaks, alternate edits, outros, or timing drift where the same offset is not correct for the whole song.
- Caption cues split across 2–3 events can be combined during matching, improving automatic-caption alignment.
- Provider lyric text stays authoritative; captions are used as timing evidence instead of blindly replacing good lyric text.
- When source captions are missing/weak and the local Whisper lyrics model is already installed, DEEP-ECHO can align provider synced lyrics against a local transcript of the exact playing stream/file in the background.
- The background precision pass does not auto-download the Whisper model just for calibration and does not block playback.
- Successful calibrated timelines are cached per recording, so repeat playback loads the corrected timing immediately.
- Normal lyrics cache was bumped to `lyrics-cache-v12.json` so older stale timelines cannot override the new timing engine.

## Better Lyrics Candidate Matching

- Loose LRCLIB matching now scores title, artist, duration, synced availability, and recording/version labels together.
- Wrong variants such as Live, Remix, Acoustic, Slowed/Reverb, Cover, Karaoke, Instrumental, Solo, Extended, Remaster, etc. receive mismatch penalties.
- All fallback search batches are compared globally instead of accepting the first barely-acceptable result.
- Version detection uses whole words so titles such as "Alive" are not mistaken for a "Live" recording.

## Exact Lyrics ON/OFF

- Added a theme-aware quick ON/OFF switch directly beside the Exact Lyrics button in the Lyrics section.
- Added the same persistent setting under Settings > Lyrics Pro.
- Both switches stay synchronized and remember the user's choice.
- When OFF, the Exact Lyrics button shows `OFF`, scans are disabled, and verified Exact Lyrics cache does not take over automatic lyrics lookup.
- The normal Precision Sync base lyrics engine remains fully active while Exact Lyrics is OFF.
- Exact Lyrics stays ON by default.

## Safety / Regression

- Playback, Smart Autoplay, Downloads, Liked Songs, Playlists, Mini Player and existing overlay timing clocks were not replaced.
- Precision calibration runs in the background after provider lyrics are already visible.
- In-flight timing upgrades are ignored by the renderer if the active song changes.
