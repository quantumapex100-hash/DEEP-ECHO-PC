# DEEP-ECHO 2.3.0 V13 TEST — Repair + Word Sync + About Artist

V13 is based directly on the V12 Exact Lyrics switch hotfix. It intentionally leaves the core Electron main process, preload bridge, download path, Smart Autoplay engine, queue/navigation engine, and existing playback service untouched.

## What changed

- Word by Word now works with Exact Lyrics more reliably.
  - Real YouTube caption word timestamps are preserved when available.
  - Exact Lyrics OCR / line-only timing now gets a conservative derived per-word timeline inside each already-synced lyric line.
  - Real word timing always wins over derived timing.
  - Long instrumental gaps are clamped so one lyric line is not stretched across the whole gap.
- Added a context-aware `Repair` control in the top bar.
  - It repairs only the active section and keeps the current song / playback position.
  - Lyrics: reload + Precision Sync, or a fresh Exact Lyrics scan when Exact Lyrics is ON.
  - Home: refreshes Home recommendation state.
  - Search: refreshes the current query/results.
  - Downloads, Liked Songs, Playlists and History: rebuild their current view without restarting the app.
- Added a separate Immersive Player repair button that rebuilds immersive visuals/lyrics/artist data without restarting playback.
- Bottom player artwork is now keyboard/click accessible for opening Immersive Player. Swipe-left/right navigation remains protected by a movement threshold.
- Added an Immersive `About Artist` panel.
  - Uses the currently playing artist/channel identity.
  - Loads top/related artist tracks through DEEP-ECHO's existing artist search path.
  - Artist track cards can start playback directly from Immersive Player.
  - Artist panel refresh does not interrupt the current song.

## Safety / regression approach

Only these application files differ from V12:
- `lib/exact-lyrics.js`
- `src/index.html`
- `src/renderer.js`
- `src/v2313-repair-artist.js` (new)
- `src/v2313-repair-artist.css` (new)

`main.js`, `preload.js`, Smart Autoplay (`src/v238-smart-autoplay.js`), download logic, queue logic and playback stream logic were not changed by V13.

This is a TEST build and is not a public release.
