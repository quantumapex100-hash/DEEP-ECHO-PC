# DEEP-ECHO 2.6.6

- New Home sections: Viral Songs, Speed Dial, and Best Songs of All Time with 12 language/industry collections and Open/Play actions.
- Viral discoveries include songs, covers and remixes, with local caching, manual Refresh, and automatic refresh when Home is active. Discoveries use YouTube search rather than a verified chart.
- Viral Songs and all-time collections appear in single horizontal rows with left/right navigation.
- Sync to video is opaque, theme-colored and clickable across all 14 themes.
- Runtime discovery no longer blocks the app during normal yt-dlp requests. Duplicate searches share work and successful search output is briefly cached.
- The first likely search result and hovered songs receive audio prebuffering, including cached results.
- Settings includes About Developer and the enchanting_daiyu Instagram profile link.
- Windows setup batch line endings corrected; dependency checks support a read-only check mode.

Existing playback resolver, downloads, Exact Lyrics, lyrics timing/alignment, floating/immersive lyrics, themes, mini player and Smart Autoplay are retained. Android is separate.

Validation: automated regressions, renderer smoke and isolated Electron layout checks passed before release preparation. Live search/streaming still depends on network and YouTube availability. GitHub Actions runs a clean dependency installation and the complete test suite before building and publishing the Windows installer, blockmap and latest.yml.
