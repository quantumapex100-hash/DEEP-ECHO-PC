# DEEP-ECHO v2.3.0 V12 TEST — Exact Lyrics Switch Hotfix

## Fixed
- Fixed the V11 Exact Lyrics master switch being unclickable while OFF.
- Root cause: `updateLyricsVisual()` disabled the switch whenever `exactLyricsEnabled` was false, which made an OFF switch impossible to turn ON after a song loaded.
- The switch is now disabled only when no current song/title exists.
- Per-song behavior remains unchanged: every new song resets Exact Lyrics to OFF; the user can then manually turn it ON.
- Turning it ON still starts Exact Lyrics automatically and shows the progress rail below it.
- Turning it OFF still returns the current song to the base/Precision Sync lyrics path.

## Scope
This is a targeted renderer-state hotfix. Smart Autoplay, GPU selector, Home recommendations, playback, downloads and the Exact Lyrics engine itself are not changed.
