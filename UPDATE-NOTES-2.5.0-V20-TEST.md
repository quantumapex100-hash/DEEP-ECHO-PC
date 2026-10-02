# DEEP-ECHO 2.5.0 V20 TEST — V18 Stability Hotfix

V20 is built **directly from the clean V18 Lyrics Reliability + Pro Suite source**. V19 is not used as a base and its lyrics-reference changes are not carried forward.

## Bugs found in V18 and fixed

### 1. Wrong foreign-script provider lyrics could pass on English tracks
- V18's language guard handled Devanagari, Gurmukhi and Arabic, but did not reject Han/Chinese, Hangul/Korean or Kana/Japanese when YouTube identified the source track as English.
- This could allow a YouLyPlus/LyricsPlus mixed source/translation response to appear as normal lyrics even though the user did not enable translation.
- V20 adds Han detection and includes Han/Hangul/Kana in the English-source language guard.
- Old unvalidated YouLyPlus mixed-script cache entries are selectively discarded and refreshed; the whole lyrics cache is not wiped.

### 2. Source Inspector could show/apply stale providers after the song changed
- Provider lookup is asynchronous. In V18, switching songs while Source Inspector was loading could leave the previous song's providers visible.
- Clicking one could apply the wrong lyric payload to the new song.
- V20 binds every provider lookup to the requested song identity and ignores stale completions.

### 3. Translation could return late and replace the new song's lyrics
- V18 did not tie an in-flight translation request to the song that started it.
- If the user changed songs during translation, the old translated payload could be applied to the new track.
- V20 uses a request serial + song identity guard and invalidates translation work when the current song changes.

### 4. Karaoke processing had a song-switch race and failure persistence bug
- A previous song's slow local Karaoke render could finish during a song switch and briefly apply the wrong processed audio.
- If local preparation failed, V18 changed the visible selector to Practice but still kept the failed mode in localStorage, so the next launch could retry the broken mode.
- V20 rejects stale Karaoke results, restores the current original source on failure, and persists Practice after a failed render.

### 5. Sync Lab corrections were not stable across repeated nudges/reload and did not move word timings
- V18 applied every nudge on the already-shifted live timeline but only saved the latest delta. Two +0.1 s nudges could look like +0.2 s now but reload as +0.1 s.
- Reset removed the saved correction but did not immediately restore the base timeline.
- Word-by-word timestamps were not shifted with a manual section correction.
- V20 keeps an immutable per-song/source base timeline, saves the cumulative correction relative to that base, shifts word timings from the selected section onward, reapplies the saved correction exactly once after a fresh Precision Sync, and Reset restores the base timeline immediately.

## Important lyrics-engine safety

The following V18 files are byte-identical in V20:
- `lib/lyrics-reference.js`
- `lib/exact-lyrics.js`
- `src/v238-smart-autoplay.js`
- `src/v2314-session-mixes-stats.js`
- `src/v2315-global-playlist-open.js`

So V20 does **not** import or recreate the rejected V19 lyrics sync engine changes.

## Validation

- Full Node regression: **335 / 335 PASS**
- V20 focused stability tests: **5 / 5 PASS**
- JavaScript/CJS syntax: **113 / 113 PASS**
- `src/index.html` IDs: **325 / 325 unique**
- Renderer smoke: blocked before app code by missing test-only `linkedom` dependency in this sandbox, same environment limitation as prior builds.

## Windows checks requested

1. Golden Hour Original MV: confirm V18 timing behavior is preserved (V20 did not modify the V18 reference engine).
2. YouLyPlus on an English song: confirm unexpected Chinese/Korean/Japanese parallel lyrics do not take over.
3. Start Translation, immediately switch song: old translation must not appear on the new song.
4. Open Source Inspector, switch song before providers finish: stale provider buttons must not apply old lyrics.
5. Karaoke Instrumental/Vocals Low, switch song while processing: old processed audio must not replace the new track.
6. Sync Lab: press +0.1 s twice, reload/reopen the song and verify +0.2 s remains; Reset should restore immediately; Word-by-Word should move with the section correction.

This is TEST ONLY.
