# DEEP-ECHO 2.3.0 V10 TEST — Smart Home + GPU Control

Date: 2026-10-01
Base: DEEP-ECHO 2.3.0 V9 Precision Lyrics
Status: TEST BUILD — not public-release tagged

## What changed

### 1) Exact Lyrics is now per-song and manual
- Exact Lyrics starts **OFF for every newly started song**.
- The user can manually enable it from the Lyrics top switch when base lyrics are missing, wrong, or poorly synced.
- Starting the next song resets Exact Lyrics to OFF again.
- The normal Precision Lyrics engine remains active regardless of the Exact Lyrics switch.
- When the base lyrics path reports missing/unavailable/failure, the Lyrics page now explicitly points the user to the Exact Lyrics control at the top instead of leaving only an AI/binding error message.

### 2) Smart Autoplay moved to the top Search area
- Smart Autoplay is no longer attached to the Home hero card.
- On Home, the control is mounted directly below the top Search box.
- It remains hidden outside the Home view.
- Existing exclusion rules remain: Downloads, Liked Songs, opened/user playlists, manual Queue, History, AI DJ and Radio keep their own playback behavior.

### 3) Smarter Smart Autoplay ranking
- Keeps duplicate-upload blocking so Search result #5 does not blindly advance to result #6 of the same song.
- Adds stronger user-taste artist affinity and multi-song vibe scoring.
- Likes/completions increase rank; skips decrease rank more aggressively.
- Repeated recently played songs and repeated artists receive stronger penalties.
- Long jukebox/playlist/full-album candidates are rejected from normal Smart Autoplay.
- Unrequested live/remix/slowed/reverb/cover/karaoke versions are penalized.
- Candidate discovery now also includes the current artist's best-song query as a resilient fallback.

### 4) Smarter Home shelves
- Home discovery now blends personal taste signals with current/popular feed data.
- Artist repetition is limited so rows do not become one-artist loops.
- Top Hits, Popular Artists, New Releases and recommendation shelves rotate with per-section refresh state.
- Taste-backed refreshes can run a fresh related-song search from a different listening seed.

### 5) See More now refreshes only the clicked section
- Home/Search/Playlist recommendation `See More` no longer acts like a dead button or merely jumps to the end.
- Clicking it refreshes **that row only** with another taste-aware rotation/pool.
- Other Home rows are not globally re-rendered by that action.
- The refreshed row returns to its left edge and shows a short loading state.

### 6) Horizontal slider / cursor glitch fix
- Native Chromium/Windows horizontal shelf scrollbars are hidden.
- A themed DEEP-ECHO DOM scrubber is rendered under each overflowing shelf.
- Dragging/clicking the scrubber controls horizontal position without handing pointer rendering to the native Windows scrollbar.
- The custom live-cursor interaction layer now recognizes the shelf slider.

### 7) Game-style GPU preference selector
- Settings now detects available Windows display adapters and lists their name/vendor/driver information.
- The user can choose Auto or a detected GPU entry and apply the preference with an app restart.
- Integrated-style adapters map to a power-saving preference; discrete NVIDIA/Radeon RX-style adapters map to high-performance preference.
- A shortcut to Windows Graphics Settings is included.
- This is a GPU **preference**, not a hard vendor-specific device lock; Windows/graphics driver remains the final adapter arbiter.

## Files added
- `src/v2310-smart-system.js`
- `src/v2310-smart-system.css`
- `tests/v2310-smart-system.test.js`
- `UPDATE-NOTES-2.3.0-V10-TEST.md`
- `TEST-REPORT-v2.3.0-V10.md`

## Main files changed from V9
- `main.js`
- `preload.js`
- `src/index.html`
- `src/renderer.js`
- `src/v236-discovery-shelves.js`
- `src/v236-discovery-shelves.css`
- `src/v238-smart-autoplay.js`
- `src/v238-smart-autoplay.css`
- `tests/v238-smart-autoplay.test.js`
- `tests/v239-precision-lyrics.test.js`

## Recommended Windows test pass
1. Home: confirm Smart Autoplay sits below Search, not on the hero card.
2. Search a song with duplicate uploads, play a middle result, press Next manually and also let a song end; verify a related/taste-aware different song is chosen.
3. Open several Home rows and press See More independently; verify only the clicked row changes.
4. Drag the custom row scrubber repeatedly; verify the DEEP-ECHO cursor does not flicker into the Windows cursor.
5. Play a song with missing base lyrics; verify the Lyrics page suggests enabling Exact Lyrics at the top.
6. Enable Exact Lyrics for that song, then start a different song; verify Exact Lyrics is OFF again.
7. Settings > GPU Preference: verify all display adapters appear, select one, Apply + Restart, then revisit Settings to verify the saved launch preference.
