# DEEP-ECHO v2.3.0 V12 TEST REPORT

## Targeted issue
Exact Lyrics single switch rendered correctly in V11 but could remain OFF when clicked after a song was loaded.

## Root cause
`updateLyricsVisual()` used this disable condition:

`!exactLyricsEnabled || !song?.title`

Because every new song intentionally starts with Exact Lyrics OFF, that condition disabled the button precisely when the user needed to click it ON.

## Fix
The control is now disabled only when there is no current song/title:

`!song?.title`

The existing per-song state model remains intact:
- new song -> Exact Lyrics OFF
- user may manually switch it ON
- ON -> Exact Lyrics scan starts automatically
- OFF -> in-flight Exact Lyrics UI result is invalidated and base/Precision Sync lyrics resume

## Verification
- Focused V11 + V12 Exact Lyrics tests: 6/6 PASS
- Full Node regression suite: 301/301 PASS, 0 failures
- JavaScript/CJS syntax checks: 97/97 PASS
- `src/index.html` IDs: 325 total / 325 unique / 0 duplicates
- Renderer smoke harness could not start in this sandbox because the test-only `linkedom` package is not installed here. This is an environment dependency limitation, not an application syntax/test failure.

## Scope
Targeted hotfix only. No changes to playback, downloads, Smart Autoplay, GPU selection, recommendation logic, Exact Lyrics extraction backend, or Precision Sync behavior.
