# DEEP-ECHO 2.2.8 V2 TEST

## Scope
Visual polish + expanded romanized lyrics support only.

## Requested changes done
- Removed the full transparent overlay plane between the lyrics area and the visualizer.
- Kept lyric lines free-floating (no boxed line card treatment).
- Brightened the lyrics visualizer and made it feel more alive/real with stronger glow, brighter core and more visible ambient rings.
- Added optional romanized lyrics variant support for:
  - Hindi / Devanagari
  - Arabic-script lyrics
  - Punjabi / Gurmukhi lyrics
- Romanization is transliteration into English letters only, not English translation.
- Test build labels updated to `2.2.8 V2 TEST`.

## Safety / untouched critical areas
- Playback engine untouched.
- Lyrics sync engine untouched.
- Download / stream recovery logic untouched.

## Validation
- Node regression tests: 233 passed, 0 failed.
- Renderer smoke test was not executed in this container because the local dev dependency `linkedom` is unavailable here.

## Changed files
- package.json
- src/index.html
- src/v228-visual-polish.css
- src/v228-visual-polish.js
- src/v200.js
- lib/lyrics.js
- tests/lyrics-polish.test.js
- tests/v227-ui-audio-regression.test.js
- tests/v228-visual-polish.test.js
- UPDATE-NOTES-2.2.8-TEST.md
