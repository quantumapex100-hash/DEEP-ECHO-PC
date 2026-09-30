const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('echoAPI', {
  v200: (action, value) => { const allowed=['downloads','cancel-download','quality','storage','repair','update-check','update-download','update-install','backup','about']; if(!allowed.includes(action))return Promise.reject(new Error('Unknown action')); return ipcRenderer.invoke('v200-'+action,value); },
  search: (query) => ipcRenderer.invoke('search-music', query),
  searchSuggestions: (query) => ipcRenderer.invoke('search-suggestions', query),
  searchArtist: (query) => ipcRenderer.invoke('search-artist', query),
  getHomeFeed: () => ipcRenderer.invoke('get-home-feed'),
  getLibrary: () => ipcRenderer.invoke('get-library'),
  streamSong: (song, requestId, quality) => ipcRenderer.invoke('stream-song', song, requestId, quality),
  prefetchSong: (song, quality) => ipcRenderer.invoke('prefetch-song', song, quality),
  prepareCompatiblePlayback: (song) => ipcRenderer.invoke('prepare-compatible-playback', song),
  onStreamProgress: (callback) => {
    ipcRenderer.removeAllListeners('stream-progress');
    ipcRenderer.on('stream-progress', (_event, progress) => callback(progress));
  },
  downloadSong: (song) => ipcRenderer.invoke('download-song', song),
  smartCacheSong: (song) => ipcRenderer.invoke('smart-cache-song', song),
  smartCacheInfo: () => ipcRenderer.invoke('smart-cache-info'),
  smartCacheClear: () => ipcRenderer.invoke('smart-cache-clear'),
  deleteSong: (id) => ipcRenderer.invoke('delete-song', id),
  getLyrics: (song) => ipcRenderer.invoke('get-lyrics', song),
  upgradeLyricsCaptions: (song) => ipcRenderer.invoke('upgrade-lyrics-captions', song),
  syncPlainLyrics: (song, plainLyrics) => ipcRenderer.invoke('sync-plain-lyrics', song, plainLyrics),
  getYouTubeAccess: () => ipcRenderer.invoke('get-youtube-access'),
  setYouTubeAccess: (value) => ipcRenderer.invoke('set-youtube-access', value),
  onLyricsStatus: (callback) => {
    ipcRenderer.removeAllListeners('lyrics-status');
    ipcRenderer.on('lyrics-status', (_event, status) => callback(status));
  },
  setWindowOpacity: (value) => ipcRenderer.invoke('set-window-opacity', value),
  toggleAppFullscreen: () => ipcRenderer.invoke('toggle-app-fullscreen'),
  setAppFullscreen: (value) => ipcRenderer.invoke('set-app-fullscreen', value),
  isAppFullscreen: () => ipcRenderer.invoke('get-app-fullscreen'),
  onAppFullscreenChanged: (callback) => {
    ipcRenderer.removeAllListeners('app-fullscreen-changed');
    ipcRenderer.on('app-fullscreen-changed', (_event, state) => callback(!!state));
  },
  openMiniPlayer: (options) => ipcRenderer.invoke('open-mini-player', options),
  setMiniAlwaysOnTop: (value) => ipcRenderer.invoke('set-mini-always-on-top', value),
  syncMiniState: (state) => ipcRenderer.send('mini-state', state),
  miniAction: (action) => ipcRenderer.send('mini-action', action),
  onMiniState: (callback) => {
    ipcRenderer.removeAllListeners('mini-state-update');
    ipcRenderer.on('mini-state-update', (_event, state) => callback(state));
  },
  onMiniAction: (callback) => {
    ipcRenderer.removeAllListeners('mini-action');
    ipcRenderer.on('mini-action', (_event, action) => callback(action));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.on('download-progress', (_event, progress) => callback(progress));
  },
  onUpdateEvent: (callback) => {
    ipcRenderer.removeAllListeners('v200-update-event');
    ipcRenderer.on('v200-update-event', (_event, payload) => callback(payload));
  },
  openImmersiveLyrics: (options) => ipcRenderer.invoke('open-immersive-lyrics', options),
  closeImmersiveLyrics: () => ipcRenderer.invoke('close-immersive-lyrics'),
  setImmersiveLyricsClickThrough: (value) => ipcRenderer.invoke('set-immersive-lyrics-click-through', value),
  toggleImmersiveLyricsClickThrough: () => ipcRenderer.invoke('toggle-immersive-lyrics-click-through'),
  getImmersiveLyricsClickThrough: () => ipcRenderer.invoke('get-immersive-lyrics-click-through'),
  setImmersiveLyricsPrefs: (value) => ipcRenderer.invoke('set-immersive-lyrics-prefs', value),
  getImmersiveLyricsPrefs: () => ipcRenderer.invoke('get-immersive-lyrics-prefs'),
  syncImmersiveLyrics: (state) => ipcRenderer.send('immersive-lyrics-state', state),
  immersiveLyricsAction: (action) => ipcRenderer.send('immersive-lyrics-action', action),
  onImmersiveLyricsState: (callback) => {
    ipcRenderer.removeAllListeners('immersive-lyrics-state-update');
    ipcRenderer.on('immersive-lyrics-state-update', (_event, state) => callback(state));
  },
  onImmersiveLyricsAction: (callback) => {
    ipcRenderer.removeAllListeners('immersive-lyrics-action');
    ipcRenderer.on('immersive-lyrics-action', (_event, action) => callback(action));
  },
  onImmersiveLyricsWindowState: (callback) => {
    ipcRenderer.removeAllListeners('immersive-lyrics-window-state');
    ipcRenderer.on('immersive-lyrics-window-state', (_event, state) => callback(state));
  },
  onImmersiveLyricsClickThroughState: (callback) => {
    ipcRenderer.removeAllListeners('immersive-lyrics-click-through-state');
    ipcRenderer.on('immersive-lyrics-click-through-state', (_event, state) => callback(state));
  },
  onImmersiveLyricsPrefs: (callback) => {
    ipcRenderer.removeAllListeners('immersive-lyrics-prefs-update');
    ipcRenderer.on('immersive-lyrics-prefs-update', (_event, prefs) => callback(prefs));
  },
  openFloatingLyrics: (options) => ipcRenderer.invoke('open-floating-lyrics', options),
  closeFloatingLyrics: () => ipcRenderer.invoke('close-floating-lyrics'),
  setFloatingLyricsClickThrough: (value) => ipcRenderer.invoke('set-floating-lyrics-click-through', value),
  toggleFloatingLyricsClickThrough: () => ipcRenderer.invoke('toggle-floating-lyrics-click-through'),
  getFloatingLyricsClickThrough: () => ipcRenderer.invoke('get-floating-lyrics-click-through'),
  syncFloatingLyrics: (state) => ipcRenderer.send('floating-lyrics-state', state),
  floatingLyricsAction: (action) => ipcRenderer.send('floating-lyrics-action', action),
  onFloatingLyricsState: (callback) => {
    ipcRenderer.removeAllListeners('floating-lyrics-state-update');
    ipcRenderer.on('floating-lyrics-state-update', (_event, state) => callback(state));
  },
  onFloatingLyricsAction: (callback) => {
    ipcRenderer.removeAllListeners('floating-lyrics-action');
    ipcRenderer.on('floating-lyrics-action', (_event, action) => callback(action));
  },
  onFloatingLyricsWindowState: (callback) => {
    ipcRenderer.removeAllListeners('floating-lyrics-window-state');
    ipcRenderer.on('floating-lyrics-window-state', (_event, state) => callback(state));
  },
  onFloatingLyricsClickThroughState: (callback) => {
    ipcRenderer.removeAllListeners('floating-lyrics-click-through-state');
    ipcRenderer.on('floating-lyrics-click-through-state', (_event, state) => callback(state));
  },
  setGlobalShortcuts: (mapping) => ipcRenderer.invoke('set-global-shortcuts', mapping),
  clearGlobalShortcuts: () => ipcRenderer.invoke('clear-global-shortcuts'),
  onGlobalShortcutAction: (callback) => {
    ipcRenderer.removeAllListeners('global-shortcut-action');
    ipcRenderer.on('global-shortcut-action', (_event, action) => callback(action));
  },
  probeSong: (song) => ipcRenderer.invoke('probe-song', song)
});
