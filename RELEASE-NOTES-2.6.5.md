# DEEP-ECHO 2.6.5

Official Windows release based on the accepted V43 Search + Lyrics Hotfix line, carrying forward V36–V42 visual and performance improvements.

## Highlights
- **Red Nebulae live theme** with bright crimson styling, theme-native player surfaces, Floating Lyrics, Immersive Lyrics and a reactive nebula visualizer.
- Red Nebulae center visualizer uses a warmer **Hot Pink + Soft Orange + Golden White** reactive dot-core while preserving the outer rings/wave response.
- Floating Lyrics presentation is more open across themes: slightly smaller current lyric, better upcoming-line placement, softer transitions and less boxed motion.
- **Faster session resume:** the previous-session song is prewarmed early and restore begins much sooner after launch.
- **Faster Home/Search playback:** bounded prewarm prepares likely Home, Search and Recently Played choices while real user Play keeps absolute priority.
- Manual Next retains the accepted priority/prefetch path for fast transitions.
- **Search + Lyrics startup hotfix:** prepared-stream cache now initializes before startup warmup, preventing the V42 TDZ error that could stop Search results and later lyric hooks.
- App still opens on **Home** while restoring the previous theme and song/session state.

## Preserved behavior
- Accepted lyrics timing/alignment and Sync-to-video behavior
- Exact Lyrics, Word by Word and Pronunciation
- YouTube caption/provider timing
- Smart Autoplay
- V32 compatibility recovery and V35 prioritized playback resolver
- Permanent Downloads/local-file pipeline
- Auto-update channel and existing user data

## Auto-update
Existing DEEP-ECHO installations such as **2.6.3 can update directly to 2.6.5**. The release publishes `latest.yml`, the NSIS installer and blockmap to the same `latest` GitHub update channel.

## Updater identity
- Version: `2.6.5`
- Git tag: `v2.6.5`
- Release title: `DEEP-ECHO 2.6.5`
- Installer: `DEEP-ECHO-2.6.5-Setup.exe`
- Update channel: `latest`
