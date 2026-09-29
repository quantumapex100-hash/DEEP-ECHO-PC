const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

const YTDLP_PATH = path.join(app.getAppPath(), 'bin', 'yt-dlp.exe');

// Folder where downloaded songs live (in the user's home directory)
const libraryDir = path.join(app.getPath('music'), 'EchoMusicPC');
const libraryFile = path.join(libraryDir, 'library.json');

// Temporary folder for "Play" (streaming) - not saved permanently
const cacheDir = path.join(app.getPath('temp'), 'EchoMusicPC-Cache');

function ensureLibrary() {
  if (!fs.existsSync(libraryDir)) fs.mkdirSync(libraryDir, { recursive: true });
  if (!fs.existsSync(libraryFile)) fs.writeFileSync(libraryFile, '[]', 'utf-8');
}

function readLibrary() {
  ensureLibrary();
  try {
    return JSON.parse(fs.readFileSync(libraryFile, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeLibrary(list) {
  fs.writeFileSync(libraryFile, JSON.stringify(list, null, 2), 'utf-8');
}

function safeFileName(name) {
  return (name || 'untitled').replace(/[\\/:*?"<>|]/g, '').slice(0, 80);
}

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: '#0f0f13',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  ensureLibrary();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Clean up temporary streamed files when the app closes (saves disk space)
app.on('before-quit', () => {
  try {
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('[cache cleanup] failed:', err.message);
  }
});

// ---------- IPC: search ----------
ipcMain.handle('search-music', async (_event, query) => {
  if (!query || !query.trim()) return [];
  if (!fs.existsSync(YTDLP_PATH)) {
    return { error: 'yt-dlp.exe nahi mila. Setup-YtDlp.bat pehle chalao.' };
  }
  try {
    const { stdout } = await execFileAsync(
      YTDLP_PATH,
      ['--flat-playlist', '--no-warnings', '-J', `ytsearch20:${query}`],
      { maxBuffer: 20 * 1024 * 1024 }
    );
    const data = JSON.parse(stdout);
    const entries = (data.entries || []).filter((e) => e && e.id);
    return entries.map((e) => ({
      id: e.id,
      title: e.title || 'Untitled',
      channel: e.channel || e.uploader || '',
      duration: formatDuration(e.duration),
      thumbnail: `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${e.id}`
    }));
  } catch (err) {
    console.error('[search] FAILED:', err.message);
    return { error: err.message };
  }
});

// ---------- IPC: get library ----------
ipcMain.handle('get-library', async () => {
  return readLibrary();
});

// ---------- IPC: stream a song (Play button) - temporary, NOT saved to library ----------
ipcMain.handle('stream-song', async (_event, song) => {
  if (!fs.existsSync(YTDLP_PATH)) {
    return { success: false, error: 'yt-dlp.exe nahi mila. Setup-YtDlp.bat pehle chalao.' };
  }
  try {
    // If already permanently downloaded, just play that instead of re-fetching
    const lib = readLibrary();
    const already = lib.find((s) => s.id === song.id);
    if (already && fs.existsSync(already.filepath)) {
      return { success: true, song: already };
    }

    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const prefix = `stream-${song.id}`;
    const existingCached = fs.readdirSync(cacheDir).filter((f) => f.startsWith(prefix + '.'));
    if (existingCached.length) {
      return { success: true, song: { ...song, filepath: path.join(cacheDir, existingCached[0]) } };
    }

    const outputTemplate = path.join(cacheDir, `${prefix}.%(ext)s`);
    console.log('[stream] fetching:', song.url);
    await execFileAsync(
      YTDLP_PATH,
      ['-f', 'bestaudio', '--no-warnings', '--no-playlist', '-o', outputTemplate, song.url],
      { maxBuffer: 20 * 1024 * 1024 }
    );

    const files = fs.readdirSync(cacheDir).filter((f) => f.startsWith(prefix + '.'));
    if (!files.length) throw new Error('Stream hua par file nahi mili.');
    const filepath = path.join(cacheDir, files[0]);

    console.log('[stream] ready:', filepath);
    return { success: true, song: { ...song, filepath } };
  } catch (err) {
    console.error('[stream] FAILED:', err.message);
    return { success: false, error: err.message };
  }
});

// ---------- IPC: download a song (Download button) - permanent, saved to library ----------
ipcMain.handle('download-song', async (_event, song) => {
  if (!fs.existsSync(YTDLP_PATH)) {
    return { success: false, error: 'yt-dlp.exe nahi mila. Setup-YtDlp.bat pehle chalao.' };
  }
  try {
    ensureLibrary();
    const lib = readLibrary();
    const already = lib.find((s) => s.id === song.id);
    if (already && fs.existsSync(already.filepath)) {
      return { success: true, alreadyExists: true, song: already };
    }

    const prefix = `${safeFileName(song.title)}-${song.id}`;
    const outputTemplate = path.join(libraryDir, `${prefix}.%(ext)s`);

    console.log('[download] fetching:', song.url);
    await execFileAsync(
      YTDLP_PATH,
      ['-f', 'bestaudio', '--no-warnings', '--no-playlist', '-o', outputTemplate, song.url],
      { maxBuffer: 20 * 1024 * 1024 }
    );

    const files = fs.readdirSync(libraryDir).filter((f) => f.startsWith(prefix + '.'));
    if (!files.length) throw new Error('Download hua par file nahi mili.');
    const filepath = path.join(libraryDir, files[0]);

    const entry = {
      id: song.id,
      title: song.title,
      channel: song.channel,
      duration: song.duration,
      thumbnail: song.thumbnail,
      filepath
    };
    const updated = [entry, ...lib.filter((s) => s.id !== song.id)];
    writeLibrary(updated);

    console.log('[download] success:', filepath);
    return { success: true, alreadyExists: false, song: entry };
  } catch (err) {
    console.error('[download] FAILED:', err.message);
    return { success: false, error: err.message };
  }
});

function cleanTitle(rawTitle) {
  let t = rawTitle || '';
  // Remove common junk in brackets/parens
  t = t.replace(/\[(.*?)\]|\((.*?)\)/g, ' ');
  t = t.replace(/(official video|official audio|official music video|lyrics|lyric video|full song|hd|4k|audio)/gi, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function guessArtistTitle(song) {
  const cleaned = cleanTitle(song.title);
  // Pattern: "Artist - Title"
  const parts = cleaned.split(/\s-\s/);
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  }
  return { artist: (song.channel || '').replace(/(VEVO| - Topic)/gi, '').trim(), title: cleaned };
}

// ---------- IPC: lyrics ----------
ipcMain.handle('get-lyrics', async (_event, song) => {
  const { artist, title } = guessArtistTitle(song);
  if (!title) return { error: 'Song title samajh nahi aaya.' };
  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist || '')}/${encodeURIComponent(title)}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return { error: 'Is gaane ki lyrics nahi mili.' };
    }
    const data = await resp.json();
    if (data && data.lyrics) {
      return { lyrics: data.lyrics.trim() };
    }
    return { error: 'Is gaane ki lyrics nahi mili.' };
  } catch (err) {
    console.error('[lyrics] FAILED:', err.message);
    return { error: 'Lyrics fetch karne me dikkat aayi (internet check karo).' };
  }
});

// ---------- IPC: delete a downloaded song ----------
ipcMain.handle('delete-song', async (_event, id) => {
  const lib = readLibrary();
  const entry = lib.find((s) => s.id === id);
  if (entry && fs.existsSync(entry.filepath)) {
    fs.unlinkSync(entry.filepath);
  }
  const updated = lib.filter((s) => s.id !== id);
  writeLibrary(updated);
  return updated;
});
