# DEEP-ECHO 2.3.0 V11 TEST REPORT

Date: 2026-10-01
Build: Exact Lyrics Single Switch + Fixed Topbar Autoplay
Base: V10 Smart Home + GPU Control

## Automated results

- Node regression suite: **298 / 298 PASS**
- Failed Node tests: **0**
- JavaScript syntax scan: **96 files checked, 0 syntax failures**
- `src/index.html` IDs: **325 total / 325 unique / 0 duplicates**
- Focused V7/V8/V9/V10/V11 Exact Lyrics + Smart Autoplay tests: **28 / 28 PASS**

## Covered V11 behavior

- only one interactive Exact Lyrics control remains on the Lyrics page
- removed old quick-toggle and Settings Exact Lyrics checkbox
- Exact Lyrics remains OFF by default per newly started song
- turning Exact Lyrics ON automatically starts the rescue scan
- progress rail exists directly below the Exact Lyrics switch
- progress visibility follows per-song Exact Lyrics ON/OFF state
- turning Exact Lyrics OFF invalidates in-flight Exact UI results and returns to base lyrics
- base-lyrics failure guidance points to the Exact Lyrics option at the top
- Smart Autoplay mounts beside `#searchInput`, inside the non-scrolling topbar
- Smart Autoplay remains Home-only and does not move with Home `<main>` scrolling
- V10 taste ranking / duplicate filtering / collection exclusions remain covered by regression tests

## Renderer smoke limitation in this container

All 298 Node tests complete successfully. `npm test` then invokes the separate renderer-smoke harness, but this sandbox does not have the test-only `linkedom` package installed in `node_modules`. The harness stops before loading application renderer code with `Cannot find module 'linkedom'`. The package remains declared in `package.json` / lockfile; this is an environment dependency limitation rather than an observed renderer application failure.

## Windows-only validation still required before public release

- visual spacing of the single Exact Lyrics switch + progress rail across themes/window sizes
- live Exact Lyrics OCR/caption progress updates on Windows
- cancellation behavior when Exact Lyrics is switched OFF during a real scan
- final topbar sizing with Smart Autoplay beside Search at common laptop resolutions
- actual custom cursor behavior over the newly arranged topbar control

## Release status

**TEST ONLY.** Do not tag/publish as the public 2.3.0 release until the Windows checks above are completed.
