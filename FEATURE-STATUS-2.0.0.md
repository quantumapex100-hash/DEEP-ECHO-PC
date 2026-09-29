# 30-point roadmap — implementation map

“Retained” means the earlier engine/UI was preserved and integrated, not rebuilt or independently proven against every online source.

| # | Feature | 2.0.0 implementation |
|---|---|---|
|1|First launch setup|New theme/performance/sound setup dialog; user can reopen.|
|2|Simple settings|New Essentials hub, grouped cards and section navigation; advanced controls retained.|
|3|Performance presets|Unified Low/Balanced/High selection drives existing render and performance controls.|
|4|Theme preview|Temporary full-app preview, Apply or cancel rollback.|
|5|Visualizer preview|Live/demo preview and mode selection.|
|6|Lyrics style selector|Theme/Clean/Cinema/Karaoke plus existing font-size control.|
|7|One-click lyrics fix|Reload lyrics, reset offsets and disk cache.|
|8|Background playback|Existing background clock, throttling exemption and game mode retained.|
|9|Playback recovery|Bounded stalled-stream re-resolution, Retry control; replaces old blind audio.load watchdog.|
|10|Download quality|Best/Balanced/Data saver changes yt-dlp format preference.|
|11|Download manager|Current session jobs, progress, actual subprocess cancellation and retry.|
|12|Recently played/continue|Existing recent/continue sections plus persisted last-session song, volume and position.|
|13|Favorites/playlists|Existing multi-playlist, snapshots, tools and like controls retained.|
|14|Queue UX|Existing Play Next/Queue/save/reorder plus drag-and-drop.|
|15|Mini player|Retained, startup theme/mini initialization error fixed.|
|16|Floating presets|Three font-size presets with existing click-through/window controls.|
|17|Theme personality|Existing themes retained; Molten Dragon artwork, spine spectrum, tail, halo, breath/embers, cursor and lyric styling added.|
|18|Song transitions|Existing fade-out/fade-in and prefetch retained; end-of-song sleep arbitration fixed.|
|19|Audio presets|Existing EQ presets retained, quick setup selection; EQ recapture reconnected per source.|
|20|Normalization|Fixed constant 0.9 volume factor replaced by measured attenuation-only gain smoothing.|
|21|Smart search|Existing song/artist/recent-search features retained; downloaded local search in offline mode.|
|22|Offline mode|Explicit mode prevents remote playback resolution and routes searches to downloaded library.|
|23|Storage manager|Download/temp/cache sizes, smart cache clear, older-than-24h temporary cleanup.|
|24|Update system|Check/download/checksum/install code implemented. Real HTTPS release feed must be published/configured before live availability.|
|25|Repair tools|Missing-file inspection, lyrics-cache reset, visual defaults reset, backup export.|
|26|Crash recovery|Periodic session checkpoint, explicit resume, bounded error history. Not an OS-level process crash guarantee.|
|27|Welcome/What’s New|First-run setup/new-version notes; reopen from settings.|
|28|Empty states|New download/session/offline/repair states plus existing collection guidance.|
|29|Notifications|In-app download outcomes, network changes, recovery and configured update notice.|
|30|About/version|DEEP-ECHO name, 2.0.0, developer credit, runtime/engine readiness.|

## Fixes found during this update

- Mini-player initialization accessed a lexical binding before initialization on startup.
- Sleep controls could race auto-next and one another; consolidated into one timer.
- Old watchdog called load/play without preserving the playback position; replaced with source re-resolution and seek restore.
- Audio EQ branch could remain attached to previous captureStream after song changes.
- Library database writes are now temporary-write/rename instead of direct truncation.
- Download IDs/URLs validated, duplicate active downloads rejected, transfer cancellation supported.

## Reference artwork

Molten Dragon asset generated with the built-in image tool from the selected reference. Prompt: preserve the cinematic molten orange serpentine dragon, volcanic mountains, lava reflections and ember halo; remove all text, labels, leader lines, UI, controls and static spectrum bars. Live effects are rendered by the app, not baked labels.
