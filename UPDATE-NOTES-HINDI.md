> **Current release: DEEP-ECHO 2.0.0.** Read `START-HERE-2.0.0.md` and `FEATURE-STATUS-2.0.0.md` first. Older notes below are retained for history.

# Deepeccho v1.7.2 — Theme Cursor Layer Restore

- Theme-wise animated cursor ko viewport-fixed top layer par restore kiya.
- v1.7.0 experience CSS se `.dinecho-live-cursor` ka accidental relative/z-index override hata diya.
- Hard isolation rule add kiya: custom cursor `position: fixed`, maximum z-index, pointer-events none.
- v1.7.1 native-cursor fail-safe intact hai.
- Lyrics sync, background playback, transparent lyrics overlay, audio pipeline, visualizer aur themes me koi functional change nahi.

# Deepeccho v1.7.1 — Cursor Fail-Safe Hotfix

- App startup par native Windows cursor ab kabhi force-hide nahi hota.
- Themed live cursor tabhi native pointer ko replace karta hai jab SVG cursor actually render/visible ho.
- Focus loss, mouse leave, pointer cancel, hidden window, ya cursor-layer failure par system cursor turant restore hota hai.
- Background playback, lyrics sync, transparent floating overlay aur v1.7.0 experience features unchanged hain.

---

# Deepeccho v1.7.0 — Experience + Performance Pack

- Lighting/lyrics se laggy popup-line/streak treatment hata diya.
- In-app lyrics bhi floating overlay ki tarah real-audio bounce react karte hain.
- Transparent Floating Lyrics, click-through, always-on-top aur game overlay preserved.
- v1.6.10 English/multiline lyrics sync + v9 timing cache fix preserved.
- Pro visualizer modes: Theme, Spectrum, Waveform, Circular, Stereo L/R, VU, Vocal Energy.
- Eco/Balanced/High/Ultra visual quality + adaptive renderer guard.
- Music-reactive ambient lighting + artwork-derived accent + optional smart theme.
- Karaoke focus mode + per-song +/-0.5s lyric offset memory.
- Crossfade + gapless playback preserved.
- Smart Queue/radio foundations preserved.
- Sleep timer: 15/30/45/60 min or end-of-song.
- Mini Player 2.0 foundations and immersive now-playing preserved.
- EQ + normalization + Bass Boost + Vocal Boost + stereo width + bypass.
- Lightweight performance monitor (UI FPS/frame/memory/quality).
- Background playback clock/ticker remains independent from visual requestAnimationFrame.

Regression: 172/172 tests passed.
