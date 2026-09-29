# DEEP-ECHO 2.2.1 — Search UI Hotfix + Correct Track Switching + Faster Releases

- Search autocomplete stays closed while the search box is empty or has fewer than 2 characters.
- Compact glass/translucent suggestion panel with stronger text contrast.
- Search result rows can be single-clicked to play.
- Selecting a new remote song immediately pauses the previous track and shows the selected track as Loading, preventing the previous song from appearing to be the clicked result.
- Failed replacement playback restores the prior confirmed Now Playing UI.
- GitHub release workflow upgraded to Node 24 actions, npm cache, Electron/electron-builder cache and npm ci.
- Removed redundant successful workflow artifact upload because the public GitHub Release already contains Setup.exe, latest.yml and blockmap.
