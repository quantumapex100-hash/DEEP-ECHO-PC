# DEEP-ECHO 2.6.7

- Seven-second theme-aware cinematic intro, pixel reveal and fullscreen launch, with app/session loading in the background.
- Improved search relevance: unrelated lyrical uploads no longer outrank the requested song merely because they share an artist.
- Fixed stale results when switching search categories or clearing a search.
- Reduced search overhead by using one relevant lookup rather than waiting for an extra lyrics search.
- Playback compatibility recovery can reuse a different audio container from the same extraction before preparing a local fallback.
- Reduced repeated visualizer colour, sizing and word-presentation work; paused Lyrics entry catches up from the existing media clock.
- Calm scenery textures prepare in small idle chunks. Soft Fluids/RGB backgrounds use a bounded reusable render surface.
- Native button presentation and theme-aware glass sidebar navigation are retained.

Lyrics synchronization, exact timing/alignment, downloads, Smart Autoplay, floating/immersive lyrics and existing controls are retained. Online audio and lyrics depend on providers and connection quality; universal instant playback or a fixed frame rate is not promised. A brief Next/Previous transition hitch reported after the audit is not claimed resolved by this release.

GitHub Actions performs a clean dependency installation, the complete regression suite and Windows installer build before publication. The installer, blockmap and latest.yml are verified for app updates. This version supersedes 2.6.6; existing release tags are not overwritten.
