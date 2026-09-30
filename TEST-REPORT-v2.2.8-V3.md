# DEEP-ECHO 2.2.8 V3 TEST

## Scope
Visual polish only: extra-bright lyrics visualizer tuning on top of the overlay-free lyrics stage and expanded romanized lyrics support.

## Requested changes done
- Lyrics/visualizer full overlay plane remains removed.
- Lyrics visualizer brightness pushed much higher by default.
- Stronger glow, brighter core, more visible ambient rings, richer saturation and contrast.
- Immersive visualizer brightness also raised.
- Romanized lyrics variant still supports Hindi/Devanagari, Arabic-script lyrics, and Punjabi/Gurmukhi.
- Test build labels updated to `2.2.8 V3 TEST`.

## Safety / untouched critical areas
- Playback engine untouched.
- Lyrics sync engine untouched.
- Download / stream recovery logic untouched.

## Validation
- Node regression tests: 233 passed, 0 failed.
- Renderer smoke test not executed in this container because local dev dependency `linkedom` is unavailable here.

## Changed files for V3
- package.json
- src/index.html
- src/v228-visual-polish.css
- src/v228-visual-polish.js
- UPDATE-NOTES-2.2.8-TEST.md
