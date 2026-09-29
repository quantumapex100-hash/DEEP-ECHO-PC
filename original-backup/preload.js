const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('echoAPI', {
  search: (query) => ipcRenderer.invoke('search-music', query),
  getLibrary: () => ipcRenderer.invoke('get-library'),
  streamSong: (song) => ipcRenderer.invoke('stream-song', song),
  downloadSong: (song) => ipcRenderer.invoke('download-song', song),
  deleteSong: (id) => ipcRenderer.invoke('delete-song', id),
  getLyrics: (song) => ipcRenderer.invoke('get-lyrics', song)
});
