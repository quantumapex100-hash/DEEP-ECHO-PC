# DEEP-ECHO 2.2.8 V4 TEST

## Visualizer
- Removed brute-force white-ish brightness behavior.
- Every theme now keeps its own palette while glowing.
- Dots/particles gain stronger audio-reactive native-color glow.
- Spectrum rays / side lines glow with the active theme and music energy.
- Core and ambient rings pulse/glow with the song.
- RGB, Love, Blood, Toxic, Purple, Golden, Space, Fluids, Silver, Dark, Light, Transparent and Dragon have theme-native glow styling.

## Lyrics
- RGB theme + Word by Word OFF now forces clean full-line text and cannot retain transparent gradient clipping.
- Caption selection avoids silently replacing known source-language captions with translated English/Hindi tracks.
- Arabic/Punjabi/Hindi romanization remains transliteration into English letters, not translation.

## Critical safety
- Playback flow/clock not modified.
- Lyrics timing/sync clock not modified.
- Download/stream recovery handlers not modified.

## Validation
- Node regression suite: 237 passed, 0 failed.
- Syntax checks passed for renderer.js, lyrics.js and youtube-captions.js.
- Renderer smoke test not run in this container because linkedom dev dependency is unavailable here.
