# DEEP-ECHO v2.3.0 V8 TEST — Smart Autoplay

This test build fixes discovery playback so Home/Search songs no longer blindly continue to the next raw result. It adds a context-aware Smart Autoplay queue that follows the selected song and the listener's taste.

## What changed

- Added a theme-aware **Smart Autoplay ON/OFF** control at the top-right of the Home hero card.
- Smart Autoplay defaults to ON and is stored locally.
- Smart Autoplay activates only when playback begins from Home/Search discovery contexts.
- Downloads, Liked Songs, user playlists, opened playlist collections, manual Queue, History, AI DJ and Radio preserve their own ordering/behavior.
- When a Search result finishes, DeepEcho no longer blindly plays result N+1. This specifically prevents cases where result 5 and result 6 are alternate uploads of the same song.
- Alternate uploads such as Official Video / Official Audio / Lyrics are grouped into a song family and rejected as the automatic next track.
- Related-track discovery first tries a free YouTube automatic radio/mix generated from the seed video ID.
- If the YouTube radio/mix cannot be resolved, DeepEcho falls back to targeted yt-dlp searches for similar/radio songs.
- Candidate ranking combines the related-song source with DeepEcho's existing local taste profile: likes, completions, skips, recent listening and previous recommendation scores.
- Same-artist tracks receive a boost early in the session, then artist diversity penalties prevent repetitive same-artist loops.
- Successfully started Smart Autoplay tracks become the new seed, so the queue can keep following the current vibe instead of staying frozen on the original search.
- Candidate discovery starts only after audio playback has begun, avoiding another yt-dlp job during the critical stream-start path.
- The best prepared candidate is prefetched after ranking.
- Explicit Play Next / Add to Queue always wins over Smart Autoplay and ends the discovery-autoplay session.
- Loop-one behavior remains unchanged.

## Example fixed flow

Before:

`Search XYZ -> choose result #5 -> result #5 ends -> raw result #6 starts (often the same song again)`

V8 with Smart Autoplay ON:

`Search XYZ -> choose result #5 -> related/taste-aware track -> another related/taste-aware track -> continued discovery`

## No paid recommendation API

The related-song source uses the existing yt-dlp/YouTube path. Local ranking uses DeepEcho's own stored taste signals. No paid recommendation service was added.

## Important test note

The automated suite validates the context rules, duplicate-song-family filtering, YouTube-radio IPC wiring, taste-signal scoring, manual-queue priority and Home toggle wiring. Actual YouTube automatic-radio availability can vary by video/account/region, so the Windows app must still be smoke-tested with real searches before public release. The search fallback remains available when the radio list is unavailable.
