# DEEP-ECHO 2.3.0 V15 TEST — Global Playlist Open

## What changed

- Added one centralized playlist/mix detector for content rendered through the normal song-card and song-row systems.
- Playlist-like results now get an **Open** button everywhere those central renderers are used, including Search song results, Recently Played, Home song shelves, Liked Songs, Downloads, History, and Continue Listening.
- Normal single songs do **not** receive the Open button.
- Existing dedicated playlist cards (user playlists, Search Playlist tab, Top Hits playlist cards, Personal Mixes, artist playlists, recommended playlists) keep their existing Open Songs behavior.
- The detector recognizes explicit playlist metadata when available, strong playlist/jukebox/album/compilation naming, and long POV/mood-style mixes while avoiding ordinary songs and titles containing only “Remix”.
- Opening a detected compilation resolves individual-song candidates, filters nested playlists/long compilations, removes duplicates, caches the resolved list for six hours, and opens it through DeepEcho's existing playlist-detail view.

## Safety / regression scope

This is an additive V15 layer on top of V14. Core playback, Smart Autoplay, Exact Lyrics, Precision Sync, downloads, queue navigation, session restore, Personal Mixes, Listening Stats, main.js, preload.js, and src/renderer.js were not changed.

## Test status

- Node regression suite: 314 / 314 PASS
- Focused V15 tests: 6 / 6 PASS
- JS/CJS syntax: 103 / 103 PASS
- HTML IDs: 325 / 325 unique
- Renderer smoke: blocked in this sandbox because the test-only `linkedom` package is unavailable

## Windows test to perform

1. Search for a playlist-like result such as a title containing “Playlist”, “Jukebox”, “Top Songs”, or a long POV mix.
2. Confirm an **Open** button appears on that result.
3. Confirm a normal 3–8 minute single song does not get an Open button.
4. Open the playlist-like result and verify DeepEcho shows the resolved songs in the existing playlist-detail screen.
5. Check the same playlist-like item in Recently Played / History / Liked if it appears there.
