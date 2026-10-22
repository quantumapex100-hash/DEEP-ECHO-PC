# DeepEcho user-journey audit — 22 October 2026

Audit only. No production app files were edited. The new diagnostic script is `scripts/audit-user-journey.cjs`.

## How this was tested

Three sequential native Electron runs used isolated appData, userData, Music and temporary directories. All windows were constructed offscreen with show:false; show, showInactive, focus and fullscreen requests were suppressed. Audio decoding/playback ran muted. Every run recorded zero window-show events. Native mouse events were sent only to the test webContents, without moving the user's desktop pointer. Global shortcut registration was suppressed in the diagnostic process.

The real main process, preload, renderer, sidebar, themes, player and lyrics presentation were loaded. Controlled-media runs supplied 48 search results, a real 120-second local WAV and 160 timed lyric lines through test IPC responses. Online tests used the real search, stream resolution, media decoder and lyrics providers. Background Home feed and smart-radio requests were suppressed during online tests to isolate intentional requests. Fresh isolated profiles did not inherit the user's YouTube login/settings/cache. Results describe these runs, not every network or PC.

Timing was collected from DOM actions through media `playing` events, requestAnimationFrame gaps, PerformanceObserver long tasks and a renderer CPU profile. Offscreen rendering was capped at 60 FPS; these measurements are useful for comparison and finding stalls, not a guarantee of foreground FPS while other PC work runs. The existing seven-second startup intro was allowed to finish before journey measurements.

## Confirmed findings, in suggested fix order

1. **Online playback remains slow and fallback can keep users waiting.** Search result clicks took 28,004 ms and 23,491 ms to first audio for the first two online selections. The Golden Brown selection did not reach first audio within the 30-second observation window and displayed `Restoring classic playback · 45%`. This is an observed delay, not proof it would never play. Stream resolution itself took 26,141 ms, 12,133 ms and 10,613 ms respectively; the latter cases also spent time after resolution in media preparation/recovery. Controlled local playback reached first audio in 275 ms. Diagnose extractor/client selection, first-byte validity, recovery and warmup separately before changing working queue or lyric clocks. Do not promise instant cold playback for all online sources.

2. **Search latency is upstream of rendering.** Real search-to-visible-results times were 10,480 ms (Husn query), 19,122 ms (Tum Hi Ho), and 13,657 ms (Golden Brown). During these searches p95 frame gaps were 17 ms, with no measured >50 ms JavaScript long tasks. `main.js` searchUserMusic waits for both base and extra lyrics searches with Promise.all before returning anything. Progressive relevant base results, bounded enrichment and query caching are concrete improvement candidates. The measured wait cannot all be attributed to that Promise.all without separate per-provider tracing.

3. **Search relevance can promote a different song.** Searching `Husn Anuv Jain official audio` put `Anuv Jain - Arz Kiya Hai (Official Lyrical Video)` first. This was the actual first row selected in the first online test; its 28-second playback result is for Arz Kiya Hai, not Husn. An isolated call to the existing ranking function reproduces the problem: Arz lyrical scores 72.95, exact Husn official audio scores 42. `lib/lyrics-search-ranking.js` gives a large lyrical bonus even when the requested song name is absent. Gate lyric/verified bonuses by song relevance while retaining genuinely matching lyric versions.

4. **Search category changes have a stale-response bug.** A slow Artists query followed by a faster Albums query produced heading `Albums: fast newest` with a card `slow first · Album Mix 1`. The collections branch of the runSearch wrapper in renderer.js has no request-generation check and reads mutable smartSearchType after await. Snapshot category and request identity; reject superseded completions and invalidate on category changes. The ordinary Songs branch's existing newest-query guard passed its controlled race test.

5. **Cold entry and result display still hitch.** In the full controlled run, the first Lyrics entry had a maximum frame gap of 133 ms; repeat entries were 50–67 ms. First Calm Yourself entry peaked at 250 ms. First return Home peaked at 83 ms and the later return at 50 ms. Search's 48-result presentation peaked at 167 ms despite results becoming available in 150 ms. There were also spikes on song changes/seek (up to 200 ms on seek). These are frame gaps, not all synchronous click-handler delays. Prioritize first-use graphics/layout preparation and small DOM batches; preserve audio time and lyrics synchronization.

6. **Visualizer and theme work can be cheaper without dimming visuals.** The separate profile identified drawLyricsVisualizer, its lowCostVisualizerContext property setter, luminousVisualizerColor, getBoundingClientRect, readAudioEnergy and word-state traversal among sampled hotspots. Profile sample counts are evidence of work, not a percentage of total GPU cost. Current bright-particle adapter repeatedly regex-converts colour strings and the visualizer measures its canvas every painted frame. Bounded palette/style caching, size updates through resize notifications, and skipping unchanged word-state work are candidates; preserve dynamic RGB colours, brightness and exact timing. Of the brief theme-change samples, Fluids showed 100 ms p95 gaps; Purple, RGB and Dragon also showed larger spikes. All 14 theme values applied correctly. Short theme samples and first-use work require repeated runs before claiming a persistent theme regression.

7. **Lyrics availability needs clearer waiting behaviour.** The first online get-lyrics call took 30,542 ms. Online Lyrics entry samples initially contained zero synchronized lines; the controlled test loaded all 160 and its active line advanced with the media clock, including after seeking. This does not establish a sync-engine defect or permanently missing lyrics. Provider latency, partial results and loading feedback should be investigated separately from synchronization.

## Flows that passed in this audit

- All ten navigation destinations opened; repeat navigation kept audio playing.
- Controlled result playback, Next after approximately two seconds (observed switch 97 ms), Previous, pause/resume and seek worked. The Next figure measures track switch plus resumed state in the local fixture; it is not an online next-track guarantee.
- Like persisted in the isolated profile.
- Playlist creation, adding a song and playlist playback retained the expected context.
- Queue opened and closed correctly.
- Ordinary Songs search retained the newest results when responses arrived out of order.
- All 14 themes applied the requested theme key.
- No renderer console errors or diagnostic step errors were recorded; no test window became visible.

## Limits

Downloads navigation and its empty state were checked. Actual network download completion, cancellation, large existing libraries, real account cookies, immersive/floating windows, update/install/repair actions, and long-session memory growth were not exercised. Such actions need separate scoped tests; this audit does not certify them bug-free. No user's real playlists, downloads or saved session were changed.

## Evidence

- `.startup-diagnostic/user-audit-ui.json`: 43 controlled journey steps, timings and state checks.
- `.startup-diagnostic/user-audit-online.json`: three real search/play attempts and actual IPC timings.
- `.startup-diagnostic/user-audit-profile.json`: profile run, stale category-result reproduction and sampled hotspots.
- `.startup-diagnostic/user-audit-renderer.cpuprofile`: raw renderer CPU profile.
- `.startup-diagnostic/user-audit-lyrics-confirmed.png`: confirmed rendered Lyrics view with audio running and an active lyric.

The earlier `user-audit-lyrics.png` was captured before the compositor presented the requested navigation/theme frame; it shows the previous Settings frame and is not used as visual evidence of a navigation bug.
