# DEEP-ECHO 2.5.0 V18 TEST — Lyrics Reliability + Pro Lyrics Suite

V18 is built directly on the V17 lyrical-reference source. The goal is reliability first: original music videos with cinematic intros, dialogue/cut-scenes, repeated choruses and changing offsets should no longer be treated as if one global timestamp shift can fix the whole song.

## Lyrics Reliability V2

- The actual playing video/audio remains the final timeline authority.
- Lyrical/reference captions can now be fused with weak-but-useful target-video captions as semantic anchors.
- Repeated lyric text is disambiguated with neighbouring-line context and monotonic occurrence order, so a later chorus is not mapped back to the first chorus just because the words are identical.
- Audio reference windows keep multiple candidates and choose a monotonic dynamic path instead of independently trusting every local best match.
- Verified audio/semantic anchors can identify a sudden inserted dialogue/scene gap. These gaps are treated as a timing breakpoint rather than smearing a large offset change gradually across many lyric lines.
- Existing V17 generic piecewise interpolation remains unchanged when there is no verified jump evidence.
- Word timing uses the same corrected map as lyric lines.
- V17 lyrical-reference cache behavior remains per playing-video identity.

## Ask DeepEcho

- Adds an `Ask DeepEcho` control beside Search.
- Accepts normal language requests such as mood, artist, language, era and activity.
- Builds playable mixes using multiple normal searches, lightweight intent parsing and existing local taste/liked signals.
- Does not require a paid LLM/API.
- Existing Search and Smart Autoplay remain independent and unchanged.

## Lyrics Source Inspector + Sync Lab

- Adds a `Source + Sync` control in Lyrics.
- Can query YouLyPlus, PaxSenix, Unison, BetterLyrics, SimpMusic, LRCLIB and KuGou alternatives for the current song.
- Shows source, sync richness and timing metadata.
- Switching a source immediately runs the existing Precision Sync against the actual playing recording.
- Sync Lab can pick a specific repeated/incorrect lyric occurrence and save a correction only from that line onward.
- Section corrections are stored per song/video + lyrics source; earlier repeated choruses are not shifted.
- Auto Re-align reuses the normal Precision Sync engine instead of creating a second timing engine.

## Translation + Pronunciation

- Translation is on-demand and keeps the original synchronized line as the master timeline.
- Translation appears as a smaller second line instead of replacing the original lyric text.
- Translation target language is selectable and timestamps are preserved line-for-line.
- Translation requires internet and uses a best-effort public translation path with fallback; failure keeps original lyrics visible.
- Existing Devanagari, Gurmukhi and Arabic romanization remains.
- Pronunciation support is extended to Hangul and Japanese kana with local transliteration.
- Original lyrics stay authoritative; pronunciation/translation never change lyric timing.

## Karaoke / Vocal Mode

- Keeps the existing distraction-free Karaoke layout.
- Adds audio modes: Original, Practice, Vocals Low, Instrumental.
- Vocals Low and Instrumental are prepared locally with FFmpeg and cached per song/mode.
- This V18 implementation uses stereo center-channel reduction, not a large AI stem-separation model. It works best when lead vocals are centered; some mixes may retain vocals or lose centered instruments.
- Switching Karaoke audio preserves the song and playback position, and Original restores the previous playback source.

## Theme integration

- Ask DeepEcho, Source Inspector, Sync Lab, translation/pronunciation sub-lines and Karaoke controls inherit the active DeepEcho theme variables.
- Golden, Light, Dark, Purple, Toxic, Blood, Silver, Transparent, Fluids, RGB, Love, Space and Dragon keep their own visual identity without changing feature behavior.

## Regression protection

High-risk feature modules kept byte-identical from V17:
- `lib/exact-lyrics.js`
- `lib/transfer.js`
- `src/v150-tools.js`
- `src/v238-smart-autoplay.js`
- `src/v2314-session-mixes-stats.js`
- `src/v2315-global-playlist-open.js`

V18 changes are limited to the lyrics reliability layer, explicit IPC/preload bridges, an additive renderer bridge, the two new Pro Suite assets and associated tests.

This is a TEST build. Windows acceptance should test Golden Hour-style original MV vs lyrical-video timing, repeated final choruses, provider switching, a section Sync Lab correction, translation, Korean/Japanese pronunciation, Ask DeepEcho, and Karaoke source restore.
