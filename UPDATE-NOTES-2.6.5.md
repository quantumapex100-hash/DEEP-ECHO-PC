# DEEP-ECHO 2.6.5 — Red Nebulae + Fast Resume + Search/Lyrics Stability

## Visual / theme changes
- Adds the complete Red Nebulae live theme and its dedicated visual presentation.
- Refines the reactive center core to Hot Pink, Soft Orange and Golden White.
- Floating Lyrics across themes use a more open layout with a slightly smaller current line and better upcoming-line placement.

## Playback responsiveness
- Saved-session playback is prewarmed early after launch and restore begins sooner.
- Home, Search, Recently Played and discovery surfaces retain bounded prioritized warmup.
- Real user Play remains higher priority than speculative work.
- Manual Next keeps next-track preparation for fast transitions.

## Search + lyrics hotfix
- Prepared-stream cache is initialized before startup can render Recent/Home warmup.
- Fixes `Cannot access smartPreparedStreamUrls before initialization`.
- Prevents that startup exception from interrupting Search results and downstream base-lyrics initialization.

## Protected / unchanged engines
- main-process playback resolver
- permanent Download/local-file path
- Exact Lyrics
- YouTube captions/provider timing
- lyrics timeline/alignment
- Smart Autoplay

## Updating
2.6.3 and other older supported installations can discover 2.6.5 through the existing GitHub `latest` update channel once the 2.6.5 release assets are published.
