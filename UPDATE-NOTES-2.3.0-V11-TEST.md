# DEEP-ECHO 2.3.0 V11 TEST — Exact Lyrics Single Switch + Fixed Topbar Autoplay

Date: 2026-10-01
Base: DEEP-ECHO 2.3.0 V10 Smart Home + GPU Control
Status: TEST BUILD — not public-release tagged

## What changed

### 1) Exact Lyrics now has one control only
- Removed the separate `Exact Lyrics` action button + second ON/OFF toggle combination.
- The Lyrics page now exposes one theme-aware **Exact Lyrics master switch**.
- Every newly started song still resets Exact Lyrics to **OFF**.
- Turning the switch **ON** automatically starts the Exact Lyrics rescue scan; there is no second button to press.
- Turning it **OFF** cancels/invalidates an in-flight Exact Lyrics result and reloads the normal Precision Sync/base lyrics path for the current song.
- Settings no longer contains a second Exact Lyrics checkbox; it only explains that Exact Lyrics is controlled per song from the Lyrics page.

### 2) Exact Lyrics progress rail is directly below the switch
- While Exact Lyrics is OFF, the progress rail is collapsed/hidden.
- As soon as the switch is turned ON, a themed progress bar appears directly beneath that same switch.
- Existing Exact Lyrics status stages drive the bar and text: cache check, lyrical-video search, captions/OCR, audio-sync verification and ready state.
- Successful Exact Lyrics stays at 100% with a ready message.
- Failure keeps the already-visible lyrics and tells the user to switch OFF/ON to retry.

### 3) Missing base lyrics guidance updated
- When the base engine cannot find/verify lyrics, the Lyrics page now explicitly says:
  `Please check the Exact Lyrics option available at the top.`
- Switching Exact Lyrics ON automatically begins the lyrical-video rescue, so the old instruction to enable a switch and then press another Exact Lyrics button is gone.

### 4) Smart Autoplay is now anchored beside the top quote/search field
- Smart Autoplay no longer occupies a second row under Search.
- On Home, it is dynamically mounted **inside the top Search row, directly beside the quote/search input and before the Search button**.
- The topbar sits outside the vertically scrolling `<main>` element, so Smart Autoplay stays in the same top position while the user scrolls Home.
- It remains hidden outside Home so Search and other pages regain the full search-input width.
- Existing V10 Smart Autoplay ranking, duplicate suppression, taste learning and collection exclusions are preserved.

## Main files changed from V10
- `src/index.html`
- `src/renderer.js`
- `src/style.css`
- `src/v238-smart-autoplay.js`
- `src/v238-smart-autoplay.css`
- `tests/v237-exact-lyrics.test.js`
- `tests/v238-smart-autoplay.test.js`
- `tests/v239-precision-lyrics.test.js`
- `tests/v2310-smart-system.test.js`
- `tests/v2311-exact-switch-topbar.test.js` (new)
- `UPDATE-NOTES-2.3.0-V11-TEST.md`
- `TEST-REPORT-v2.3.0-V11.md`

## Recommended Windows test pass
1. Play any song and open Lyrics; confirm there is only **one Exact Lyrics switch** and no duplicate Exact control.
2. Confirm every newly started song shows Exact Lyrics **OFF**.
3. Turn Exact Lyrics ON and verify the scan begins immediately without another click.
4. Confirm the progress rail appears directly below the switch and follows the current Exact Lyrics stage/percentage.
5. Turn Exact Lyrics OFF while scanning; verify the Exact result does not later replace base lyrics and the normal lyrics path reloads.
6. Test a missing-lyrics song and verify the page points to the Exact Lyrics option at the top.
7. On Home, confirm Smart Autoplay sits beside the top quote/search field.
8. Scroll Home far down and confirm Smart Autoplay remains at the top because it belongs to the non-scrolling topbar.
9. Open Search/Downloads/Lyrics and confirm the Home Smart Autoplay control hides cleanly and the search field expands normally.
