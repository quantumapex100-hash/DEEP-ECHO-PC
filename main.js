const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');
const { getLyrics, withScriptVariants, isExplicitInstrumentalSong, scriptProfile } = require('./lib/lyrics');
const { getYouTubeLyrics, alignSyncedLyricsToCaptions } = require('./lib/youtube-captions');
const { runTransfer, downloadDirectAudio } = require('./lib/transfer');
const { transcribeSong } = require('./lib/auto-transcribe');
const { runYtDlpSmart, isBotChallenge, isAbort, resetYouTubeBackoff } = require('./lib/ytdlp-smart');
const util = require('util');
const execFileAsync = util.promisify(execFile);

const YTDLP_PATH = path.join(app.getAppPath(), 'bin', 'yt-dlp.exe');
const APP_DISPLAY_NAME = 'DEEP-ECHO';
// Keep the original profile location when the installer/product name changes.
app.setPath('userData', path.join(app.getPath('appData'), 'deepeccho'));
const downloadJobs = new Map();
const downloadControllers = new Map();
let downloadQuality = 'best';

// Folder where downloaded songs live (in the user's home directory)
const libraryDir = path.join(app.getPath('music'), 'EchoMusicPC');
const libraryFile = path.join(libraryDir, 'library.json');
const artworkDir = path.join(libraryDir, 'artwork');

// Temporary folder for "Play" (streaming) - not saved permanently
const cacheDir = path.join(app.getPath('temp'), 'EchoMusicPC-Cache');
const smartCacheDir = path.join(app.getPath('userData'), 'smart-offline-cache');
const youtubeAccessFile = path.join(app.getPath('userData'), 'youtube-access.json');
const ytdlpUpdateStamp = path.join(app.getPath('userData'), 'yt-dlp-update-check.json');

function readYouTubeAccess() {
  try {
    const value = JSON.parse(fs.readFileSync(youtubeAccessFile, 'utf8'));
    const browser = ['chrome','edge','brave','firefox'].includes(value?.browser) ? value.browser : 'chrome';
    return { enabled: !!value?.enabled, browser };
  } catch { return { enabled: false, browser: 'chrome' }; }
}
function writeYouTubeAccess(value = {}) {
  const next = { enabled: !!value.enabled, browser: ['chrome','edge','brave','firefox'].includes(value.browser) ? value.browser : 'chrome' };
  fs.mkdirSync(path.dirname(youtubeAccessFile), { recursive: true });
  fs.writeFileSync(youtubeAccessFile, JSON.stringify(next, null, 2), 'utf8');
  resetYouTubeBackoff();
  return next;
}


async function maybeRefreshYtDlp() {
  if (!fs.existsSync(YTDLP_PATH)) return;
  try {
    let last = 0;
    try { last = Number(JSON.parse(fs.readFileSync(ytdlpUpdateStamp, 'utf8'))?.checkedAt || 0); } catch {}
    if (Date.now() - last < 24 * 60 * 60 * 1000) return;
    fs.mkdirSync(path.dirname(ytdlpUpdateStamp), { recursive: true });
    fs.writeFileSync(ytdlpUpdateStamp, JSON.stringify({ checkedAt: Date.now() }), 'utf8');
    const { stdout, stderr } = await execFileAsync(YTDLP_PATH, ['--update-to', 'nightly'], {
      windowsHide: true, timeout: 45000, maxBuffer: 4 * 1024 * 1024
    });
    const summary = String(stdout || stderr || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (summary) console.log('[yt-dlp update]', summary);
    resetYouTubeBackoff();
  } catch (error) {
    console.warn('[yt-dlp update] skipped:', String(error?.message || error).replace(/\s+/g, ' ').slice(0, 220));
  }
}

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
  const temporary=libraryFile+'.tmp';
  fs.writeFileSync(temporary, JSON.stringify(list, null, 2), 'utf-8');
  fs.renameSync(temporary,libraryFile);
}

function existingArtworkPath(song) {
  const direct = song?.artworkPath;
  if (direct && fs.existsSync(direct)) return direct;
  const cleanId = String(song?.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleanId || !fs.existsSync(artworkDir)) return '';
  const found = fs.readdirSync(artworkDir).find(name => name.startsWith(`art-${cleanId}.`) && /\.(?:jpe?g|png|webp)$/i.test(name));
  return found ? path.join(artworkDir, found) : '';
}

function fetchImageBuffer(url, redirects = 4) {
  return new Promise((resolve, reject) => {
    if (!/^https?:\/\//i.test(String(url || ''))) return reject(new Error('Artwork URL missing'));
    const client = String(url).startsWith('https:') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 DEEP-ECHO/1.6.4', 'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        fetchImageBuffer(next, redirects - 1).then(resolve, reject);
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 300) { res.resume(); reject(new Error(`Artwork HTTP ${res.statusCode}`)); return; }
      const chunks = []; let size = 0;
      res.on('data', chunk => { size += chunk.length; if (size > 8 * 1024 * 1024) req.destroy(new Error('Artwork too large')); else chunks.push(chunk); });
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: String(res.headers['content-type'] || '') }));
    });
    req.setTimeout(8000, () => req.destroy(new Error('Artwork timeout')));
    req.on('error', reject);
  });
}

async function cacheArtworkForSong(song) {
  try {
    const existing = existingArtworkPath(song);
    if (existing) return existing;
    const source = String(song?.remoteThumbnail || song?.thumbnail || '');
    const cleanId = String(song?.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanId || !/^https?:\/\//i.test(source)) return '';
    const { buffer, contentType } = await fetchImageBuffer(source);
    if (!buffer.length) return '';
    fs.mkdirSync(artworkDir, { recursive: true });
    const ext = /png/i.test(contentType) ? 'png' : /webp/i.test(contentType) ? 'webp' : 'jpg';
    const target = path.join(artworkDir, `art-${cleanId}.${ext}`);
    fs.writeFileSync(target, buffer);
    return target;
  } catch (error) {
    console.warn('[artwork cache]', String(error?.message || error).slice(0, 160));
    return '';
  }
}

async function hydrateMissingLibraryArtwork() {
  const library = readLibrary();
  let changed = false;
  for (const entry of library) {
    if (existingArtworkPath(entry)) continue;
    const remote = /^https?:\/\//i.test(String(entry.remoteThumbnail || entry.thumbnail || '')) ? (entry.remoteThumbnail || entry.thumbnail) : '';
    if (!remote) continue;
    const artworkPath = await cacheArtworkForSong({ ...entry, thumbnail: remote });
    if (!artworkPath) break; // likely offline: avoid repeated network timeouts
    entry.remoteThumbnail = remote;
    entry.artworkPath = artworkPath;
    changed = true;
  }
  if (changed) writeLibrary(library);
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
let splashWindow;
let miniWindow;
let floatingLyricsWindow;
let floatingLyricsClickThrough = false;
let immersiveLyricsWindow;
let immersiveLyricsClickThrough = false;
let immersiveLyricsAnchorGuard = false;
let immersiveLyricsPrefs = { panelOpacity:72, lyricsOpacity:100, fontScale:100, visualizer:true, onlyLyrics:false };
function normalizeImmersiveLyricsPrefs(value = {}) {
  const next = { ...immersiveLyricsPrefs, ...(value && typeof value === 'object' ? value : {}) };
  next.panelOpacity = Math.max(0, Math.min(95, Number(next.panelOpacity) || 0));
  next.lyricsOpacity = Math.max(35, Math.min(100, Number(next.lyricsOpacity) || 100));
  next.fontScale = Math.max(80, Math.min(150, Number(next.fontScale) || 100));
  next.visualizer = next.visualizer !== false;
  next.onlyLyrics = !!next.onlyLyrics;
  return next;
}
function notifyImmersiveLyricsPrefs() {
  const payload = { ...immersiveLyricsPrefs };
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('immersive-lyrics-prefs-update', payload);
  if (immersiveLyricsWindow && !immersiveLyricsWindow.isDestroyed()) immersiveLyricsWindow.webContents.send('immersive-lyrics-prefs-update', payload);
}
const registeredGlobalShortcuts = new Map();
const reliableGlobalShortcuts = new Map();

function canonicalAccelerator(value) {
  const aliases = { ctrl:'control', control:'control', cmdorctrl:'control', commandorcontrol:'control', alt:'alt', option:'alt', shift:'shift', cmd:'command', command:'command', super:'super', meta:'super' };
  const parts = String(value || '').toLowerCase().replace(/\s+/g, '').split('+').filter(Boolean).map(part => aliases[part] || part);
  const mods = ['control','alt','shift','command','super'];
  const unique = [...new Set(parts)];
  return [...mods.filter(m => unique.includes(m)), ...unique.filter(p => !mods.includes(p))].join('+');
}
function reliableActionForAccelerator(action, accelerator) {
  const canonical = canonicalAccelerator(accelerator);
  const isDefault = (action === 'floatingClickThrough' && canonical === 'control+alt+x')
    || (action === 'playPause' && canonical === 'control+alt+space');
  if (!isDefault) return false;
  return [...reliableGlobalShortcuts.values()].includes(action);
}
function registerReliableDefaultShortcuts() {
  const defaults = [
    ['CommandOrControl+Alt+X', 'floatingClickThrough', () => toggleFloatingLyricsClickThrough()],
    ['CommandOrControl+Alt+Shift+X', 'immersiveLyricsClickThrough', () => applyImmersiveLyricsClickThrough(!immersiveLyricsClickThrough)],
    ['CommandOrControl+Alt+Space', 'playPause', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('global-shortcut-action', 'playPause'); }]
  ];
  for (const [accelerator, action, callback] of defaults) {
    try {
      if (!globalShortcut.isRegistered(accelerator) && globalShortcut.register(accelerator, callback)) reliableGlobalShortcuts.set(accelerator, action);
      else if (globalShortcut.isRegistered(accelerator)) reliableGlobalShortcuts.set(accelerator, action);
    } catch (err) { console.warn(`[global shortcut] ${accelerator} failed:`, err?.message || err); }
  }
}
function clearReliableDefaultShortcuts() {
  for (const accelerator of reliableGlobalShortcuts.keys()) { try { globalShortcut.unregister(accelerator); } catch {} }
  reliableGlobalShortcuts.clear();
}

function sendFullscreenState(win) {
  if (!win || win.isDestroyed()) return;
  try { win.webContents.send('app-fullscreen-changed', !!win.isFullScreen()); } catch {}
}

function setAppFullscreen(win, value) {
  if (!win || win.isDestroyed()) return false;
  const next = !!value;
  if (win.isFullScreen() !== next) win.setFullScreen(next);
  sendFullscreenState(win);
  return !!win.isFullScreen();
}

function toggleAppFullscreen(win) {
  if (!win || win.isDestroyed()) return false;
  return setAppFullscreen(win, !win.isFullScreen());
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 430,
    height: 360,
    frame: false,
    transparent: true,
    resizable: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, 'src', 'assets', 'dinecho-logo.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  splashWindow.loadFile(path.join(__dirname, 'src', 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow && splashWindow.show());
  splashWindow.on('closed', () => { splashWindow = null; });
}

function createWindow(useSplash = false) {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: '#0f0f13',
    title: 'DEEP-ECHO',
    icon: path.join(__dirname, 'src', 'assets', 'dinecho-logo.png'),
    autoHideMenuBar: true,
    show: !useSplash,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Playback/global-hotkey/floating-lyrics clocks must keep running while minimized.
      // Game Mode separately suspends expensive visual work.
      backgroundThrottling: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Native Windows maximize stays a normal maximized window. True edge-to-edge
  // fullscreen is explicit only (F11 / DEEP-ECHO fullscreen button). This prevents
  // accidental fullscreen where the Windows minimize controls disappear.
  mainWindow.on('enter-full-screen', () => sendFullscreenState(mainWindow));
  mainWindow.on('leave-full-screen', () => sendFullscreenState(mainWindow));
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault();
      toggleAppFullscreen(mainWindow);
    } else if (input.type === 'keyDown' && input.key === 'Escape' && mainWindow?.isFullScreen()) {
      event.preventDefault();
      setAppFullscreen(mainWindow, false);
    }
  });

  if (useSplash) {
    const started = Date.now();
    mainWindow.once('ready-to-show', () => {
      const wait = Math.max(0, 1350 - (Date.now() - started));
      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        }
      }, wait);
    });
  }
}

function createMiniPlayerWindow(alwaysOnTop = true) {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.setAlwaysOnTop(!!alwaysOnTop);
    miniWindow.show();
    miniWindow.focus();
    return miniWindow;
  }
  // Keep Mini Player intentionally horizontal, like Floating Lyrics. The bounds
  // prevent an accidental giant/tiny window while still allowing useful resizing.
  let miniBounds = { width: 580, height: 190, minWidth: 430, minHeight: 142, maxWidth: 980, maxHeight: 290 };
  try {
    const area = screen.getPrimaryDisplay().workArea;
    miniBounds = {
      ...miniBounds,
      width: Math.min(620, Math.max(500, Math.round(area.width * .34))),
      maxWidth: Math.max(620, Math.min(1120, area.width - 36)),
      maxHeight: Math.max(220, Math.min(320, Math.round(area.height * .34)))
    };
  } catch (_) {}
  miniWindow = new BrowserWindow({
    width: miniBounds.width, height: miniBounds.height,
    minWidth: miniBounds.minWidth, minHeight: miniBounds.minHeight,
    maxWidth: miniBounds.maxWidth, maxHeight: miniBounds.maxHeight,
    frame: false, transparent: false, resizable: true, maximizable: false,
    alwaysOnTop: !!alwaysOnTop, skipTaskbar: false, backgroundColor: '#0d0a06',
    title: 'DEEP-ECHO Mini Player', icon: path.join(__dirname, 'src', 'assets', 'dinecho-logo.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  miniWindow.loadFile(path.join(__dirname, 'src', 'mini.html'));
  miniWindow.on('closed', () => { miniWindow = null; });
  return miniWindow;
}

ipcMain.handle('open-mini-player', (_event, options = {}) => {
  createMiniPlayerWindow(options.alwaysOnTop !== false);
  return { success: true };
});
ipcMain.handle('set-mini-always-on-top', (_event, value) => {
  if (miniWindow && !miniWindow.isDestroyed()) miniWindow.setAlwaysOnTop(!!value);
  return { success: true };
});
ipcMain.on('mini-state', (_event, state) => {
  if (miniWindow && !miniWindow.isDestroyed()) miniWindow.webContents.send('mini-state-update', state);
});
ipcMain.on('mini-action', (_event, action) => {
  if (action === 'close') { if (miniWindow && !miniWindow.isDestroyed()) miniWindow.close(); return; }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mini-action', action);
});


function notifyFloatingLyricsWindowState(open) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('floating-lyrics-window-state', { open: !!open });
}
function notifyFloatingLyricsClickThroughState() {
  const payload = { enabled: !!floatingLyricsClickThrough };
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('floating-lyrics-click-through-state', payload);
  if (floatingLyricsWindow && !floatingLyricsWindow.isDestroyed()) floatingLyricsWindow.webContents.send('floating-lyrics-click-through-state', payload);
}
function keepFloatingLyricsVisible() {
  if (!floatingLyricsWindow || floatingLyricsWindow.isDestroyed()) return;
  try { floatingLyricsWindow.setAlwaysOnTop(true, 'screen-saver', 1); } catch { try { floatingLyricsWindow.setAlwaysOnTop(true); } catch {} }
  try { floatingLyricsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); } catch {}
  try { if (!floatingLyricsWindow.isVisible()) floatingLyricsWindow.showInactive(); } catch {}
}
function applyFloatingLyricsClickThrough(value) {
  floatingLyricsClickThrough = !!value;
  if (floatingLyricsWindow && !floatingLyricsWindow.isDestroyed()) {
    try { floatingLyricsWindow.setIgnoreMouseEvents(floatingLyricsClickThrough, { forward: true }); } catch {}
    keepFloatingLyricsVisible();
  }
  notifyFloatingLyricsClickThroughState();
  return floatingLyricsClickThrough;
}
function toggleFloatingLyricsClickThrough() {
  return applyFloatingLyricsClickThrough(!floatingLyricsClickThrough);
}
function createFloatingLyricsWindow(options = {}) {
  if (typeof options.clickThrough === 'boolean') floatingLyricsClickThrough = !!options.clickThrough;
  if (floatingLyricsWindow && !floatingLyricsWindow.isDestroyed()) {
    keepFloatingLyricsVisible();
    applyFloatingLyricsClickThrough(floatingLyricsClickThrough);
    notifyFloatingLyricsWindowState(true);
    return floatingLyricsWindow;
  }
  let floatingBounds = { width: 1180, height: 158, x: undefined, y: undefined, maxWidth: 1500, maxHeight: 230 };
  try {
    const area = screen.getPrimaryDisplay().workArea;
    floatingBounds = {
      width: Math.max(760, area.width - 28),
      height: Math.min(168, Math.max(138, Math.round(area.height * .17))),
      x: area.x + 14,
      y: area.y + 18,
      maxWidth: Math.max(760, area.width),
      maxHeight: Math.min(260, Math.max(190, Math.round(area.height * .28)))
    };
  } catch (_) {}
  floatingLyricsWindow = new BrowserWindow({
    width: floatingBounds.width, height: floatingBounds.height, x: floatingBounds.x, y: floatingBounds.y,
    minWidth: 520, minHeight: 108, maxWidth: floatingBounds.maxWidth, maxHeight: floatingBounds.maxHeight,
    frame: false, transparent: true, resizable: true, maximizable: false,
    alwaysOnTop: true, skipTaskbar: true, backgroundColor: '#00000000',
    title: 'DEEP-ECHO Floating Lyrics', focusable: true,
    icon: path.join(__dirname, 'src', 'assets', 'dinecho-logo.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  floatingLyricsWindow.loadFile(path.join(__dirname, 'src', 'floating-lyrics.html'));
  floatingLyricsWindow.once('ready-to-show', () => {
    keepFloatingLyricsVisible();
    applyFloatingLyricsClickThrough(floatingLyricsClickThrough);
    notifyFloatingLyricsWindowState(true);
  });
  floatingLyricsWindow.on('show', () => keepFloatingLyricsVisible());
  floatingLyricsWindow.on('closed', () => { floatingLyricsWindow = null; notifyFloatingLyricsWindowState(false); });
  return floatingLyricsWindow;
}


function immersiveLyricsDisplayArea() {
  try {
    const sourceBounds = mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : undefined;
    const display = sourceBounds ? screen.getDisplayMatching(sourceBounds) : screen.getPrimaryDisplay();
    return display.workArea;
  } catch (_) {
    return { x:0, y:0, width:1280, height:720 };
  }
}
function notifyImmersiveLyricsWindowState(open) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('immersive-lyrics-window-state', { open:!!open });
}
function notifyImmersiveLyricsClickThroughState() {
  const payload = { enabled:!!immersiveLyricsClickThrough };
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('immersive-lyrics-click-through-state', payload);
  if (immersiveLyricsWindow && !immersiveLyricsWindow.isDestroyed()) immersiveLyricsWindow.webContents.send('immersive-lyrics-click-through-state', payload);
}
function keepImmersiveLyricsVisible() {
  if (!immersiveLyricsWindow || immersiveLyricsWindow.isDestroyed()) return;
  try { immersiveLyricsWindow.setAlwaysOnTop(true, 'screen-saver', 1); } catch { try { immersiveLyricsWindow.setAlwaysOnTop(true); } catch {} }
  try { immersiveLyricsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen:true }); } catch {}
  try { if (!immersiveLyricsWindow.isVisible()) immersiveLyricsWindow.showInactive(); } catch {}
}
function anchorImmersiveLyricsWindow() {
  if (!immersiveLyricsWindow || immersiveLyricsWindow.isDestroyed() || immersiveLyricsAnchorGuard) return;
  const area = immersiveLyricsDisplayArea();
  const bounds = immersiveLyricsWindow.getBounds();
  const width = Math.max(320, Math.min(bounds.width, Math.max(520, Math.round(area.width * .62))));
  const next = { x:area.x + area.width - width, y:area.y, width, height:area.height };
  if (bounds.x === next.x && bounds.y === next.y && bounds.width === next.width && bounds.height === next.height) return;
  immersiveLyricsAnchorGuard = true;
  try { immersiveLyricsWindow.setBounds(next, false); } finally { immersiveLyricsAnchorGuard = false; }
}
function applyImmersiveLyricsClickThrough(value) {
  immersiveLyricsClickThrough = !!value;
  if (immersiveLyricsWindow && !immersiveLyricsWindow.isDestroyed()) {
    try { immersiveLyricsWindow.setIgnoreMouseEvents(immersiveLyricsClickThrough, { forward:true }); } catch {}
    keepImmersiveLyricsVisible();
  }
  notifyImmersiveLyricsClickThroughState();
  return immersiveLyricsClickThrough;
}
function createImmersiveLyricsWindow(options = {}) {
  if (typeof options.clickThrough === 'boolean') immersiveLyricsClickThrough = !!options.clickThrough;
  if (options.prefs && typeof options.prefs === 'object') immersiveLyricsPrefs = normalizeImmersiveLyricsPrefs(options.prefs);
  if (immersiveLyricsWindow && !immersiveLyricsWindow.isDestroyed()) {
    anchorImmersiveLyricsWindow();
    keepImmersiveLyricsVisible();
    applyImmersiveLyricsClickThrough(immersiveLyricsClickThrough);
    notifyImmersiveLyricsWindowState(true);
    return immersiveLyricsWindow;
  }
  const area = immersiveLyricsDisplayArea();
  const width = Math.max(380, Math.min(Math.round(area.width * .27), 560));
  immersiveLyricsWindow = new BrowserWindow({
    width, height:area.height, x:area.x + area.width - width, y:area.y,
    minWidth:320, minHeight:area.height, maxWidth:Math.max(520, Math.round(area.width * .62)), maxHeight:area.height,
    frame:false, transparent:true, resizable:true, movable:false, maximizable:false, fullscreenable:false,
    alwaysOnTop:true, skipTaskbar:true, backgroundColor:'#00000000',
    title:'DEEP-ECHO Immersive Lyrics', focusable:true,
    icon:path.join(__dirname, 'src', 'assets', 'dinecho-logo.png'),
    webPreferences:{ preload:path.join(__dirname, 'preload.js'), contextIsolation:true, nodeIntegration:false, backgroundThrottling:false }
  });
  immersiveLyricsWindow.loadFile(path.join(__dirname, 'src', 'immersive-lyrics.html'));
  immersiveLyricsWindow.once('ready-to-show', () => {
    anchorImmersiveLyricsWindow();
    keepImmersiveLyricsVisible();
    applyImmersiveLyricsClickThrough(immersiveLyricsClickThrough);
    notifyImmersiveLyricsPrefs();
    notifyImmersiveLyricsWindowState(true);
  });
  immersiveLyricsWindow.on('resize', () => setImmediate(anchorImmersiveLyricsWindow));
  immersiveLyricsWindow.on('show', () => { anchorImmersiveLyricsWindow(); keepImmersiveLyricsVisible(); });
  immersiveLyricsWindow.on('closed', () => { immersiveLyricsWindow = null; notifyImmersiveLyricsWindowState(false); });
  return immersiveLyricsWindow;
}

ipcMain.handle('open-immersive-lyrics', (_event, options = {}) => {
  createImmersiveLyricsWindow(options);
  return { success:true, clickThrough:immersiveLyricsClickThrough };
});
ipcMain.handle('close-immersive-lyrics', () => {
  if (immersiveLyricsWindow && !immersiveLyricsWindow.isDestroyed()) immersiveLyricsWindow.close();
  else notifyImmersiveLyricsWindowState(false);
  return { success:true };
});
ipcMain.handle('set-immersive-lyrics-click-through', (_event, value) => ({ success:true, enabled:applyImmersiveLyricsClickThrough(value) }));
ipcMain.handle('toggle-immersive-lyrics-click-through', () => ({ success:true, enabled:applyImmersiveLyricsClickThrough(!immersiveLyricsClickThrough) }));
ipcMain.handle('get-immersive-lyrics-click-through', () => ({ success:true, enabled:!!immersiveLyricsClickThrough }));
ipcMain.handle('set-immersive-lyrics-prefs', (_event, value = {}) => {
  immersiveLyricsPrefs = normalizeImmersiveLyricsPrefs(value);
  notifyImmersiveLyricsPrefs();
  return { success:true, prefs:{ ...immersiveLyricsPrefs } };
});
ipcMain.handle('get-immersive-lyrics-prefs', () => ({ success:true, prefs:{ ...immersiveLyricsPrefs } }));
ipcMain.on('immersive-lyrics-state', (_event, state) => {
  if (immersiveLyricsWindow && !immersiveLyricsWindow.isDestroyed()) immersiveLyricsWindow.webContents.send('immersive-lyrics-state-update', state);
});
ipcMain.on('immersive-lyrics-action', (_event, action) => {
  if (action === 'close') {
    if (immersiveLyricsWindow && !immersiveLyricsWindow.isDestroyed()) immersiveLyricsWindow.close();
    return;
  }
  if (action === 'toggleClickThrough') { applyImmersiveLyricsClickThrough(!immersiveLyricsClickThrough); return; }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('immersive-lyrics-action', action);
  keepImmersiveLyricsVisible();
  setTimeout(keepImmersiveLyricsVisible, 80);
  setTimeout(keepImmersiveLyricsVisible, 420);
});

ipcMain.handle('open-floating-lyrics', (_event, options = {}) => {
  createFloatingLyricsWindow(options);
  return { success: true, clickThrough: floatingLyricsClickThrough };
});
ipcMain.handle('close-floating-lyrics', () => {
  if (floatingLyricsWindow && !floatingLyricsWindow.isDestroyed()) floatingLyricsWindow.close();
  else notifyFloatingLyricsWindowState(false);
  return { success: true };
});
ipcMain.handle('set-floating-lyrics-click-through', (_event, value) => ({ success: true, enabled: applyFloatingLyricsClickThrough(value) }));
ipcMain.handle('toggle-floating-lyrics-click-through', () => ({ success: true, enabled: toggleFloatingLyricsClickThrough() }));
ipcMain.handle('get-floating-lyrics-click-through', () => ({ success: true, enabled: !!floatingLyricsClickThrough }));
ipcMain.on('floating-lyrics-state', (_event, state) => {
  if (floatingLyricsWindow && !floatingLyricsWindow.isDestroyed()) floatingLyricsWindow.webContents.send('floating-lyrics-state-update', state);
});
ipcMain.on('floating-lyrics-action', (_event, action) => {
  if (action === 'close') { if (floatingLyricsWindow && !floatingLyricsWindow.isDestroyed()) floatingLyricsWindow.close(); return; }
  if (action === 'toggleClickThrough') { toggleFloatingLyricsClickThrough(); return; }
  if (action === 'compactOn' || action === 'compactOff') {
    if (floatingLyricsWindow && !floatingLyricsWindow.isDestroyed()) {
      const compact = action === 'compactOn';
      const [w] = floatingLyricsWindow.getSize();
      floatingLyricsWindow.setMinimumSize(compact ? 430 : 520, compact ? 96 : 118);
      floatingLyricsWindow.setSize(Math.max(compact ? 520 : 720, w), compact ? 108 : 168, true);
      keepFloatingLyricsVisible();
    }
    return;
  }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('floating-lyrics-action', action);
  // Full-screen/borderless games can alter z-order during a media action. Reassert without stealing focus.
  keepFloatingLyricsVisible();
  setTimeout(keepFloatingLyricsVisible, 80);
  setTimeout(keepFloatingLyricsVisible, 420);
});

function clearRegisteredGlobalShortcuts() {
  for (const accelerator of registeredGlobalShortcuts.keys()) {
    try { globalShortcut.unregister(accelerator); } catch {}
  }
  registeredGlobalShortcuts.clear();
}
function registerGlobalShortcutMap(mapping = {}) {
  clearRegisteredGlobalShortcuts();
  const allowed = new Set(['playPause','floatingClickThrough','next','previous','like','lyrics','mini','immersive','fullscreen','volumeUp','volumeDown','mute','queue']);
  const result = {};
  for (const [action, rawAccelerator] of Object.entries(mapping || {})) {
    if (!allowed.has(action)) continue;
    const accelerator = String(rawAccelerator || '').trim();
    if (!accelerator || accelerator.length > 80) continue;
    if (reliableActionForAccelerator(action, accelerator)) {
      result[action] = { accelerator, registered: true, reliableDefault: true };
      continue;
    }
    let ok = false;
    try {
      ok = globalShortcut.register(accelerator, () => {
        if (action === 'floatingClickThrough') { toggleFloatingLyricsClickThrough(); return; }
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('global-shortcut-action', action);
      });
    } catch { ok = false; }
    result[action] = { accelerator, registered: !!ok };
    if (ok) registeredGlobalShortcuts.set(accelerator, action);
  }
  return result;
}
ipcMain.handle('set-global-shortcuts', (_event, mapping) => registerGlobalShortcutMap(mapping));
ipcMain.handle('clear-global-shortcuts', () => { clearRegisteredGlobalShortcuts(); return { success:true }; });

ipcMain.handle('probe-song', async (_event, song) => {
  if (!song?.url) return { status:'unknown', error:'Song URL missing.' };
  if (!fs.existsSync(YTDLP_PATH)) return { status:'unknown', error:'yt-dlp missing.' };
  try {
    await runYtDlpSmart(YTDLP_PATH, ['--no-warnings','--no-playlist','--skip-download','--simulate', song.url], {
      maxBuffer: 2 * 1024 * 1024, timeout: 30000, purpose:'probe', browserAuth:readYouTubeAccess(), allowFallbackClients:true
    });
    return { status:'ok' };
  } catch (err) {
    const msg=String(err?.message || err || '');
    if (err?.code === 'YOUTUBE_BOT_CHECK' || isBotChallenge(err)) return { status:'unknown', error:'YouTube bot-check' };
    if (/video unavailable|private video|this video is unavailable|removed|deleted|copyright|not available/i.test(msg)) return { status:'unavailable', error:msg.slice(0,260) };
    return { status:'unknown', error:msg.slice(0,260) };
  }
});

ipcMain.handle('toggle-app-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return toggleAppFullscreen(win);
});
ipcMain.handle('set-app-fullscreen', (event, value) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return setAppFullscreen(win, value);
});
ipcMain.handle('get-app-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return !!(win && !win.isDestroyed() && win.isFullScreen());
});

ipcMain.handle('get-youtube-access', () => readYouTubeAccess());
ipcMain.handle('set-youtube-access', (_event, value) => ({ success: true, value: writeYouTubeAccess(value) }));

app.whenReady().then(() => {
  app.setName(APP_DISPLAY_NAME);
  ensureLibrary();
  maybeRefreshYtDlp();
  setTimeout(() => hydrateMissingLibraryArtwork().catch(() => {}), 3500);
  registerReliableDefaultShortcuts();
  createSplashWindow();
  createWindow(true);
  setupAutoUpdater();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(false);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Clean up temporary streamed files when the app closes (saves disk space)
app.on('before-quit', () => {
  clearRegisteredGlobalShortcuts();
  clearReliableDefaultShortcuts();
  try {
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('[cache cleanup] failed:', err.message);
  }
});

// ---------- Search helpers ----------
async function searchMusic(query, limit = 20) {
  if (!query || !query.trim()) return [];
  if (!fs.existsSync(YTDLP_PATH)) {
    return { error: 'yt-dlp.exe nahi mila. Setup-YtDlp.bat pehle chalao.' };
  }
  try {
    const { stdout } = await runYtDlpSmart(
      YTDLP_PATH,
      ['--flat-playlist', '--no-warnings', '-J', `ytsearch${limit}:${query}`],
      { maxBuffer: 20 * 1024 * 1024, timeout: 45000, purpose: 'search', browserAuth: readYouTubeAccess(), allowFallbackClients: true }
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
    return { error: err?.code === 'YOUTUBE_BOT_CHECK' ? 'YouTube bot-check laga raha hai. Settings > YouTube Access me browser login fallback enable kar sakte ho.' : err.message, errorCode: err?.code || '' };
  }
}

// ---------- Search autocomplete (YouTube-style suggestions) ----------
const searchSuggestionCache = new Map();
async function searchSuggestions(query) {
  const q = String(query || '').replace(/\s+/g, ' ').trim();
  if (q.length < 2) return [];
  const key = q.toLowerCase();
  const cached = searchSuggestionCache.get(key);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.items;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': `Mozilla/5.0 DEEP-ECHO/${app.getVersion()}` }
    });
    if (!response.ok) return [];
    const payload = await response.json();
    const items = Array.isArray(payload?.[1])
      ? payload[1].filter(x => typeof x === 'string').map(x => x.trim()).filter(Boolean).slice(0, 10)
      : [];
    searchSuggestionCache.set(key, { at: Date.now(), items });
    if (searchSuggestionCache.size > 120) searchSuggestionCache.delete(searchSuggestionCache.keys().next().value);
    return items;
  } catch (_) {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ---------- IPC: search ----------
ipcMain.handle('search-suggestions', async (_event, query) => searchSuggestions(query));
ipcMain.handle('search-music', async (_event, query) => searchMusic(query, 20));

// ---------- IPC: artist search ----------
ipcMain.handle('search-artist', async (_event, query) => {
  if (!query || !query.trim()) return [];
  return searchMusic(`${query} best songs official audio`, 20);
});

// ---------- IPC: home feed ----------
ipcMain.handle('get-home-feed', async () => {
  const year = new Date().getFullYear();
  const [topHits, topArtistSongs] = await Promise.all([
    searchMusic(`top hits ${year} songs official audio`, 12),
    searchMusic(`top artists hit songs ${year} official audio`, 12)
  ]);
  if (topHits && topHits.error) return topHits;
  if (topArtistSongs && topArtistSongs.error) return topArtistSongs;
  return { topHits, topArtistSongs };
});

// ---------- IPC: get library ----------
ipcMain.handle('get-library', async () => {
  return readLibrary().map(playable);
});

// A completed file alone is playable; .part files are never reused.
function finishedFiles(directory, prefix) {
  return fs.readdirSync(directory).filter(f => f.startsWith(prefix + '.') && /\.(webm|m4a|mp3|ogg|opus|mp4|aac|wav|flac)$/i.test(f));
}
function playable(song) {
  const artworkPath = existingArtworkPath(song);
  const localArtworkUrl = artworkPath ? pathToFileURL(artworkPath).href : '';
  return { ...song, artworkPath: artworkPath || song.artworkPath || '', localArtworkUrl, thumbnail: localArtworkUrl || song.thumbnail || song.remoteThumbnail || '', fileUrl: pathToFileURL(song.filepath).href };
}
function sendProgress(event, channel, value) {
  if (!event.sender.isDestroyed()) event.sender.send(channel, value);
}
// Resolve a direct audio URL instead of downloading the full song before Play.
// This is intentionally separate from permanent Downloads: playback can begin as soon
// as yt-dlp resolves the media URL and Chromium receives the first audio bytes.
const streamUrlCache = new Map();
const streamJobs = new Map();
const STREAM_URL_TTL = 8 * 60 * 1000;

async function resolveStreamUrl(song, quality = 'auto') {
  const qualityKey = ['high', 'medium', 'data'].includes(quality) ? quality : 'auto';
  const key = song && song.id ? `${song.id}:${qualityKey}` : null;
  if (!key || !song.url) throw new Error('Song URL missing.');
  const cached = streamUrlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  if (streamJobs.has(key)) return streamJobs.get(key);
  if (!fs.existsSync(YTDLP_PATH)) throw new Error('yt-dlp.exe nahi mila. Setup-YtDlp.bat pehle chalao.');

  // Prefer browser-friendly audio containers first. YouTube often exposes Opus/WebM
  // as the highest quality stream, but some Electron/Windows codec combinations can
  // reject an otherwise valid direct URL with MEDIA_ERR_SRC_NOT_SUPPORTED.
  const format = qualityKey === 'data'
    ? 'bestaudio[ext=m4a][abr<=96]/bestaudio[abr<=96]/worstaudio/bestaudio'
    : qualityKey === 'medium'
      ? 'bestaudio[ext=m4a][abr<=160]/bestaudio[acodec^=mp4a][abr<=160]/bestaudio[abr<=160]/bestaudio'
      : 'bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio[ext=webm]/bestaudio/best';
  const job = runYtDlpSmart(
    YTDLP_PATH,
    ['--no-warnings', '--no-playlist', '-f', format, '-g', song.url],
    { maxBuffer: 4 * 1024 * 1024, timeout: 45000, purpose: 'playback', browserAuth: readYouTubeAccess(), allowFallbackClients: true }
  ).then(({ stdout }) => {
    const url = String(stdout || '').split(/\r?\n/).map(v => v.trim()).find(v => /^https?:\/\//i.test(v));
    if (!url) throw new Error('Playable audio URL nahi mili.');
    streamUrlCache.set(key, { url, expiresAt: Date.now() + STREAM_URL_TTL });
    return url;
  }).finally(() => streamJobs.delete(key));
  streamJobs.set(key, job);
  return job;
}

ipcMain.handle('stream-song', async (event, song, requestId, quality = 'auto') => {
  const progress = value => sendProgress(event, 'stream-progress', { id: song.id, requestId, ...value });
  try {
    const already = readLibrary().find(s => s.id === song.id);
    if (already && fs.existsSync(already.filepath)) {
      progress({ percent: 100, status: 'Offline audio ready' });
      return { success: true, song: playable(already) };
    }
    fs.mkdirSync(smartCacheDir, { recursive: true });
    const cachedName = fs.readdirSync(smartCacheDir).find(name => name.startsWith(`cache-${String(song.id).replace(/[^a-zA-Z0-9_-]/g, '')}.`));
    if (cachedName) {
      const filepath = path.join(smartCacheDir, cachedName);
      progress({ percent: 100, status: 'Smart cache ready' });
      return { success: true, song: { ...song, filepath, fileUrl: pathToFileURL(filepath).href, smartCached: true } };
    }
    progress({ percent: 10, status: 'Connecting' });
    progress({ percent: 35, status: 'Resolving audio' });
    const streamUrl = await resolveStreamUrl(song, quality);
    progress({ percent: 85, status: 'Audio URL ready' });
    return { success: true, song: { ...song, streamUrl } };
  } catch (err) {
    progress({ percent: null, status: 'Failed' });
    const bot = err?.code === 'YOUTUBE_BOT_CHECK' || isBotChallenge(err);
    return {
      success: false,
      errorCode: bot ? 'YOUTUBE_BOT_CHECK' : (err?.code || ''),
      needsBrowserAuth: bot && !readYouTubeAccess().enabled,
      error: bot ? 'YouTube ne anonymous request ko bot-check se block kiya. Playback safe rakha gaya hai; Settings > YouTube Access me browser login fallback enable kar sakte ho.' : err.message
    };
  }
});

ipcMain.handle('prefetch-song', async (_event, song, quality = 'auto') => {
  try {
    const already = readLibrary().find(s => s.id === song.id);
    if (already && fs.existsSync(already.filepath)) return { success: true, offline: true };
    const streamUrl = await resolveStreamUrl(song, quality);
    return { success: true, streamUrl };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Last-resort playback compatibility path. It is used only when Chromium rejects a
// resolved direct stream. A short-lived local audio file is prepared in the temp cache;
// it is not added to Downloads and never blocks normal direct streaming when that works.
ipcMain.handle('prepare-compatible-playback', async (_event, song) => {
  try {
    if (!song?.url || !song?.id) throw new Error('Song URL missing.');
    if (!fs.existsSync(YTDLP_PATH)) throw new Error('yt-dlp.exe nahi mila. Setup-YtDlp.bat pehle chalao.');
    fs.mkdirSync(cacheDir, { recursive: true });
    const prefix = `compat-${String(song.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const existing = finishedFiles(cacheDir, prefix)
      .map(name => ({ name, full: path.join(cacheDir, name), stat: fs.statSync(path.join(cacheDir, name)) }))
      .filter(item => item.stat.isFile() && Date.now() - item.stat.mtimeMs < 6 * 60 * 60 * 1000)
      .sort((a,b) => b.stat.mtimeMs - a.stat.mtimeMs)[0];
    if (existing) return { success: true, filepath: existing.full, fileUrl: pathToFileURL(existing.full).href, cached: true };
    // Remove stale versions for this video so format changes cannot leave ambiguity.
    for (const name of finishedFiles(cacheDir, prefix)) { try { fs.unlinkSync(path.join(cacheDir, name)); } catch {} }
    await runYtDlpSmart(YTDLP_PATH, [
      '--no-warnings','--no-playlist','-f',
      'bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio[ext=webm]/bestaudio',
      '-o', path.join(cacheDir, `${prefix}.%(ext)s`), song.url
    ], { maxBuffer: 12 * 1024 * 1024, timeout: 120000, purpose: 'compat-playback', browserAuth: readYouTubeAccess(), allowFallbackClients: true });
    const name = finishedFiles(cacheDir, prefix).sort().pop();
    if (!name) throw new Error('Compatibility audio file nahi bani.');
    const filepath = path.join(cacheDir, name);
    return { success: true, filepath, fileUrl: pathToFileURL(filepath).href };
  } catch (err) {
    const bot = err?.code === 'YOUTUBE_BOT_CHECK' || isBotChallenge(err);
    return { success:false, errorCode: bot ? 'YOUTUBE_BOT_CHECK' : (err?.code || ''), error: err?.message || 'Compatibility playback failed.' };
  }
});
async function runDownloadWithProgress(event, song, outputTemplate) {
  const controller = new AbortController(); downloadControllers.set(song.id, controller);
  const quality = song.downloadQuality || downloadQuality;
  const report = value => {
    downloadJobs.set(song.id, {...downloadJobs.get(song.id), ...value, status:'Downloading'});
    sendProgress(event, 'download-progress', {id:song.id,...value,status:'Downloading'});
  };
  downloadJobs.set(song.id, {song, id:song.id, percent:0, status:'Downloading', quality});
  try {
    try {
      await runTransfer(YTDLP_PATH, song, outputTemplate, report, undefined, {
        signal:controller.signal, quality, browserAuth:readYouTubeAccess(), allowFallbackClients:true
      });
      return;
    } catch (error) {
      const recoverable = error?.code === 'YOUTUBE_BOT_CHECK' || error?.code === 'YOUTUBE_ACCESS_403' || isBotChallenge(error);
      if (!recoverable || controller.signal.aborted) throw error;

      // yt-dlp extraction can be blocked while the same Android-resolved audio stream still
      // plays normally. Reuse that proven playback path and save the media bytes directly.
      // This avoids a second verification hit and does not change normal successful downloads.
      sendProgress(event, 'download-progress', { id:song.id, percent:0, status:'Recovering' });
      const streamQuality = quality === 'small' ? 'data' : quality === 'balanced' ? 'medium' : 'high';
      const streamUrl = await resolveStreamUrl(song, streamQuality);
      await downloadDirectAudio(streamUrl, outputTemplate, report, { signal:controller.signal });
      console.log('[download] recovered from resolved playback stream');
    }
  } finally {
    downloadControllers.delete(song.id);
  }
}

ipcMain.handle('smart-cache-song', async (_event, song) => {
  try {
    if (!song?.id || !song?.url) throw new Error('Song URL missing.');
    if (!fs.existsSync(YTDLP_PATH)) throw new Error('yt-dlp.exe nahi mila.');
    fs.mkdirSync(smartCacheDir, { recursive: true });
    const cleanId = String(song.id).replace(/[^a-zA-Z0-9_-]/g, '');
    const existing = fs.readdirSync(smartCacheDir).find(name => name.startsWith(`cache-${cleanId}.`));
    if (existing) return { success:true, cached:true };
    await runYtDlpSmart(YTDLP_PATH, ['--no-warnings','--no-playlist','-f','bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio','-o',path.join(smartCacheDir,`cache-${cleanId}.%(ext)s`),song.url], { maxBuffer:12*1024*1024, timeout:120000, purpose:'smart-cache', browserAuth:readYouTubeAccess(), allowFallbackClients:true });
    return { success:true, cached:true };
  } catch (err) { return { success:false, error:err?.message || 'Cache failed' }; }
});
ipcMain.handle('smart-cache-info', () => {
  try { fs.mkdirSync(smartCacheDir,{recursive:true}); const files=fs.readdirSync(smartCacheDir).map(n=>path.join(smartCacheDir,n)).filter(f=>fs.statSync(f).isFile()); return {success:true,count:files.length,bytes:files.reduce((a,f)=>a+fs.statSync(f).size,0)}; } catch(err){return {success:false,error:err.message};}
});
ipcMain.handle('smart-cache-clear', () => {
  try { if(fs.existsSync(smartCacheDir)) for(const n of fs.readdirSync(smartCacheDir)){try{fs.unlinkSync(path.join(smartCacheDir,n));}catch{}} return {success:true}; } catch(err){return {success:false,error:err.message};}
});

// ---------- IPC: download a song (Download button) - permanent, saved to library ----------
ipcMain.handle('download-song', async (event, song) => {
  if (!song || !/^[a-zA-Z0-9_-]{1,160}$/.test(String(song.id || '')) || !/^https:\/\//i.test(song.url || '')) return {success:false,error:'Invalid song'};
  if (downloadControllers.has(song.id)) return {success:false,error:'This song is already downloading'};
  if (!fs.existsSync(YTDLP_PATH)) {
    return { success: false, error: 'yt-dlp.exe nahi mila. Setup-YtDlp.bat pehle chalao.' };
  }
  try {
    ensureLibrary();
    const lib = readLibrary();
    const already = lib.find((s) => s.id === song.id);
    if (already && fs.existsSync(already.filepath)) {
      event.sender.send('download-progress', { id: song.id, percent: 100, status: 'Saved' });
      return { success: true, alreadyExists: true, song: already };
    }

    const prefix = `${safeFileName(song.title)}-${song.id}`;
    const outputTemplate = path.join(libraryDir, `${prefix}.%(ext)s`);

    console.log('[download] fetching:', song.url);
    event.sender.send('download-progress', { id: song.id, percent: 0, status: 'Starting' });
    await runDownloadWithProgress(event, song, outputTemplate);

    const files = finishedFiles(libraryDir, prefix);
    if (!files.length) throw new Error('Download hua par file nahi mili.');
    const filepath = path.join(libraryDir, files[0]);

    const artworkPath = await cacheArtworkForSong(song);
    const entry = {
      id: song.id,
      title: song.title,
      channel: song.channel,
      duration: song.duration,
      thumbnail: song.thumbnail,
      remoteThumbnail: /^https?:\/\//i.test(String(song.thumbnail || '')) ? song.thumbnail : (song.remoteThumbnail || ''),
      artworkPath,
      url: song.url || (song.id ? `https://www.youtube.com/watch?v=${song.id}` : ''),
      filepath
    };
    const updated = [entry, ...readLibrary().filter((s) => s.id !== song.id)];
    writeLibrary(updated);

    downloadJobs.set(song.id, {...downloadJobs.get(song.id),song,percent:100,status:'Done'});
    sendProgress(event,'download-progress', { id: song.id, percent: 100, status: 'Done' });
    console.log('[download] success:', filepath);
    return { success: true, alreadyExists: false, song: entry };
  } catch (err) {
    const cancelled = err?.message === 'Cancelled';
    const accessBlocked = !cancelled && (err?.code === 'YOUTUBE_BOT_CHECK' || err?.code === 'YOUTUBE_ACCESS_403' || isBotChallenge(err));
    const access = readYouTubeAccess();
    const error = accessBlocked
      ? (access.enabled
          ? 'YouTube verification ne download ko rok diya. DeepEcho ne Android client, direct playback-stream save aur browser login fallback tino try kiye. Browser me YouTube login confirm karke ek baar retry karo.'
          : 'YouTube verification ne anonymous download ko rok diya. DeepEcho ne Android client aur direct playback-stream save try kiya; zarurat pade to Settings > YouTube Access me logged-in browser enable karke retry karo.')
      : (err?.message || 'Download failed.');
    downloadJobs.set(song.id,{...downloadJobs.get(song.id),song,status:cancelled?'Cancelled':'Failed',error});
    console.error('[download] FAILED:', error);
    event.sender.send('download-progress', { id: song && song.id, percent: 0, status: cancelled ? 'Cancelled' : 'Failed' });
    return { success: false, errorCode: accessBlocked ? (err?.code || 'YOUTUBE_BOT_CHECK') : (err?.code || ''), needsBrowserAuth: accessBlocked && !access.enabled, error };
  }
});

// Window opacity is compositor-level on Windows/macOS, so apps behind Dinecho become visible.
ipcMain.handle('set-window-opacity', (event, value) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return 1;
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? Math.max(0.30, Math.min(1, numeric)) : 1;
  try { win.setOpacity(safe); } catch (error) { console.warn('[opacity]', error.message); }
  return safe;
});

// Cache successful lyrics for offline use. v9 invalidates v8 timelines that may have
// collapsed legitimate short/prefix English lines or rapid-fired grouped timestamps.
const lyricsCachePath = path.join(app.getPath('userData'), 'lyrics-cache-v11.json');
const lyricsControllers = new Map();
const lyricsTimingControllers = new Map();

function lyricsTextForLanguageCheck(result) {
  if (!result) return '';
  return String(result.syncedLyrics || result.lyrics || '')
    .replace(/\[\d+:\d+(?:\.\d+)?\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function likelyEnglishTranslation(text = '') {
  const words = String(text).toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
  if (words.length < 5) return false;
  const common = new Set(['i','you','he','she','we','they','me','my','your','our','their','the','a','an','and','or','but','is','am','are','was','were','be','been','to','of','in','on','for','with','from','this','that','these','those','it','its','not','no','yes','love','heart','girl','boy','feel','know','want','need','can','cannot','cant','will','would','dont','do','does','have','has','had','more','never','always','when','where','why','how']);
  let hits = 0;
  for (const word of words) if (common.has(word.replace(/'/g,''))) hits++;
  return hits / words.length >= .34;
}

function lyricsLanguageMismatch(result, youtube) {
  const text = lyricsTextForLanguageCheck(result);
  if (!text) return false;
  const lang = String(youtube?.metadata?.originalLanguage || youtube?.metadata?.language || youtube?.captionLanguage || '').toLowerCase();
  const base = lang.split('-')[0];
  const profile = scriptProfile(text);
  // Reject obvious cross-script substitutions.
  if (base === 'en' && (profile.devanagariRatio > .28 || profile.gurmukhiRatio > .28 || profile.arabicRatio > .28)) return true;
  // For a known non-English source language, reject provider text that reads like an
  // English sentence. Genuine romanized Punjabi/Hindi/Arabic normally contains mostly
  // non-English lexical forms, so it remains eligible for the Romanized toggle.
  if (base && base !== 'en' && profile.latinRatio > .72 && likelyEnglishTranslation(text)) return true;
  return false;
}

function hasLyricsText(result) {
  return !!(result && (String(result.syncedLyrics || '').trim() || String(result.lyrics || '').trim()));
}

function normalizeLyricWords(text) {
  return String(text || '').normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ').trim();
}
function parseTimedLrcForAlignment(lrc) {
  const rows = [];
  for (const raw of String(lrc || '').split(/\r?\n/)) {
    const m = raw.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
    if (!m) continue;
    rows.push({ time: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() });
  }
  return rows;
}
function lyricSimilarity(a, b) {
  const aa = normalizeLyricWords(a), bb = normalizeLyricWords(b);
  if (!aa || !bb) return 0;
  if (aa === bb) return 1;
  if (aa.includes(bb) || bb.includes(aa)) return Math.min(0.94, Math.min(aa.length,bb.length) / Math.max(aa.length,bb.length) + .18);
  const A = new Set(aa.split(' ').filter(Boolean)), B = new Set(bb.split(' ').filter(Boolean));
  let hit = 0; for (const w of A) if (B.has(w)) hit++;
  const precision = hit / Math.max(1, A.size), recall = hit / Math.max(1, B.size);
  return hit ? (2 * precision * recall / Math.max(.0001, precision + recall)) : 0;
}
function alignPlainLyricsToTimedTranscript(plainLyrics, timedLrc) {
  const lines = String(plainLyrics || '').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
  const timed = parseTimedLrcForAlignment(timedLrc);
  if (lines.length < 2 || timed.length < 2) return null;
  const matches = [];
  let cursor = 0;
  for (let i=0;i<lines.length;i++) {
    let best = null;
    for (let j=cursor;j<Math.min(timed.length,cursor+14);j++) {
      for (let span=1;span<=Math.min(3,timed.length-j);span++) {
        const joined = timed.slice(j,j+span).map(x=>x.text).join(' ');
        const score = lyricSimilarity(lines[i], joined);
        if (!best || score > best.score) best = { j, span, score, time: timed[j].time };
      }
    }
    if (best && best.score >= .30) { matches.push({ i, ...best }); cursor = best.j + best.span; }
  }
  if (matches.length < Math.max(2, Math.ceil(lines.length * .34))) return null;
  const avg = matches.reduce((n,m)=>n+m.score,0)/matches.length;
  if (avg < .38) return null;
  const times = Array(lines.length).fill(null);
  matches.forEach(m=>{times[m.i]=m.time;});
  for (let i=0;i<times.length;i++) {
    if (times[i] != null) continue;
    let p=i-1,n=i+1; while(p>=0&&times[p]==null)p--; while(n<times.length&&times[n]==null)n++;
    if (p>=0 && n<times.length) times[i]=times[p] + (times[n]-times[p])*((i-p)/(n-p));
    else if (p>=0) times[i]=times[p] + Math.max(1.8, (i-p)*2.8);
    else if (n<times.length) times[i]=Math.max(0, times[n] - Math.max(1.8,(n-i)*2.8));
  }
  let prev=0;
  const out = lines.map((text,i)=>{ const t=Math.max(prev,Number(times[i]||0)); prev=t+.08; const mm=Math.floor(t/60), ss=(t-mm*60).toFixed(2).padStart(5,'0'); return `[${String(mm).padStart(2,'0')}:${ss}]${text}`; }).join('\n');
  return { syncedLyrics: out, matched: matches.length, confidence: avg };
}

ipcMain.handle('get-lyrics', async (event, song) => {
  const senderId = event.sender.id;
  try { lyricsControllers.get(senderId)?.abort(); } catch {}
  const controller = new AbortController();
  lyricsControllers.set(senderId, controller);
  const signal = controller.signal;
  const key = JSON.stringify([song.title, song.channel, song.duration || '', song.url || '', !!song.manual]);
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(lyricsCachePath, 'utf8')); } catch {}
  if (cache[key]) { if (lyricsControllers.get(senderId) === controller) lyricsControllers.delete(senderId); return cache[key]; }

  const sendStatus = (payload) => {
    try { event.sender.send('lyrics-status', { songId: song.id || '', title: song.title || '', ...payload }); } catch {}
  };
  sendStatus({ stage: 'lookup', text: 'Checking exact lyrics and original-language captions…' });

  const canUseVideoInfo = !!song.url && fs.existsSync(YTDLP_PATH);
  const canAutoTranscribe = !!song.streamUrl || (!!song.filepath && fs.existsSync(song.filepath)) || canUseVideoInfo;
  const [catalogResult, youtubeMeta] = await Promise.all([
    getLyrics(song),
    canUseVideoInfo ? getYouTubeLyrics(song, YTDLP_PATH, execFileAsync, fetch, { signal, browserAuth: readYouTubeAccess(), tempRoot: path.join(cacheDir, 'lyrics-captions'), metadataOnly:true }) : Promise.resolve(null)
  ]);
  let youtube = youtubeMeta;
  if (signal.aborted) return { cancelled: true };
  let result = catalogResult || {};

  // Never let a catalogue-only instrumental flag suppress a real vocal track.
  if (result.instrumental && !isExplicitInstrumentalSong(song)) result = {};
  if (lyricsLanguageMismatch(result, youtube)) result = {};

  // If trustworthy provider lyrics are already available, return them now and let the
  // renderer request exact YouTube timing in the background. If the provider is empty
  // or language-mismatched, fetch full source-language captions before showing text.
  const providerReady = hasLyricsText(result);
  if (canUseVideoInfo && !providerReady) {
    youtube = await getYouTubeLyrics(song, YTDLP_PATH, execFileAsync, fetch, { signal, browserAuth: readYouTubeAccess(), tempRoot: path.join(cacheDir, 'lyrics-captions') });
    if (signal.aborted) return { cancelled:true };
  } else if (providerReady && canUseVideoInfo) {
    result = { ...result, backgroundCaptionUpgrade:true };
  }

  if (youtube?.syncedLyrics) {
    // Exact video captions are the strongest evidence for both language and timing.
    if (result.syncedLyrics && !lyricsLanguageMismatch(result, youtube)) {
      const aligned = alignSyncedLyricsToCaptions(result.syncedLyrics, youtube.syncedLyrics);
      if (aligned && aligned.matched >= 2 && aligned.confidence >= 0.42) {
        result = withScriptVariants({
          ...result,
          syncedLyrics: aligned.syncedLyrics,
          source: `${result.source || 'Lyrics'} text · ${youtube.source} timing`,
          timingPrecision: 'youtube-aligned',
          timingMatchCount: aligned.matched,
          timingConfidence: aligned.confidence,
          timingOffsetSeconds: aligned.offset,
          detectedLanguage: youtube.captionLanguage || youtube.metadata?.language || '',
          wordTimings: Array.isArray(youtube.wordTimings) ? youtube.wordTimings : [],
          wordTimingSource: youtube.wordTimingSource || ''
        });
      } else {
        result = withScriptVariants({ ...youtube, timingPrecision: 'youtube-exact', timingOffsetSeconds: 0 });
      }
    } else {
      result = withScriptVariants({ ...youtube, timingPrecision: 'youtube-exact', timingOffsetSeconds: 0 });
    }
  } else if (!providerReady && youtube?.metadata?.title) {
    // Uploader-heavy titles and slowed/reverb uploads often have poor search metadata.
    // Retry the catalogue with YouTube's own track/artist fields when available.
    const artist = youtube.metadata.artist || '';
    const metadataResult = await getLyrics({
      ...song,
      title: artist ? `${artist} - ${youtube.metadata.title}` : youtube.metadata.title,
      channel: artist || song.channel
    });
    if (signal.aborted) return { cancelled: true };
    if (hasLyricsText(metadataResult) && !lyricsLanguageMismatch(metadataResult, youtube)) result = metadataResult;
  }

  // If no trustworthy provider/caption result exists, actually listen to the track locally.
  if (!hasLyricsText(result) && !(result.instrumental && isExplicitInstrumentalSong(song)) && canAutoTranscribe) {
    sendStatus({ stage: 'fallback', text: 'No reliable lyrics source found · starting DEEP-ECHO Auto Transcribe…' });
    const transcribed = await transcribeSong(song, {
      ytdlpPath: YTDLP_PATH,
      tempRoot: path.join(cacheDir, 'lyrics-ai'),
      modelDir: path.join(app.getPath('userData'), 'models'),
      onStatus: sendStatus,
      signal,
      browserAuth: readYouTubeAccess()
    });
    if (signal.aborted || transcribed?.cancelled) return { cancelled: true };
    if (hasLyricsText(transcribed)) result = withScriptVariants({ ...transcribed, timingPrecision:'ai-transcribed', timingOffsetSeconds:0 });
    else if (!result.instrumental) {
      result = transcribed?.errorCode === 'YOUTUBE_BOT_CHECK'
        ? { error: 'YouTube bot-check ki wajah se audio source access nahi hui. Song playback chalega; Settings > YouTube Access me browser login fallback optional hai.', errorCode: 'YOUTUBE_BOT_CHECK' }
        : { error: transcribed?.error || 'Lyrics detect nahi ho paayi. Retry kar sakte ho.' };
    }
  }

  if (result.syncedLyrics && !result.timingPrecision) {
    result.timingPrecision = 'catalog-synced';
    result.timingOffsetSeconds = 0;
  }

  // Only call a track instrumental when the title itself explicitly identifies that version.
  if (!hasLyricsText(result) && isExplicitInstrumentalSong(song)) {
    result = { instrumental: true, source: result.source || 'Track metadata', confidence: 'explicit-title' };
  }

  if (result.lyrics || result.syncedLyrics || result.instrumental) {
    try {
      try { cache = JSON.parse(fs.readFileSync(lyricsCachePath, 'utf8')); } catch {}
      cache[key] = result;
      fs.mkdirSync(path.dirname(lyricsCachePath), { recursive: true });
      fs.writeFileSync(lyricsCachePath, JSON.stringify(cache), 'utf8');
    } catch (error) { console.warn('Lyrics cache:', error.message); }
  }
  sendStatus({ stage: 'done', text: '' });
  if (lyricsControllers.get(senderId) === controller) lyricsControllers.delete(senderId);
  return result;
});

// Upgrade already-visible provider lyrics with exact source-language YouTube caption timing.
ipcMain.handle('upgrade-lyrics-captions', async (event, song) => {
  if (!song?.url || !fs.existsSync(YTDLP_PATH)) return { success:false };
  const controller = new AbortController();
  try {
    const youtube = await getYouTubeLyrics(song, YTDLP_PATH, execFileAsync, fetch, {
      signal:controller.signal, browserAuth:readYouTubeAccess(), tempRoot:path.join(cacheDir,'lyrics-captions')
    });
    if (!youtube?.syncedLyrics) return { success:false };
    const original = { lyrics:song.lyrics||'', syncedLyrics:song.syncedLyrics||'', source:song.source||'Lyrics' };
    if (original.syncedLyrics) {
      const aligned = alignSyncedLyricsToCaptions(original.syncedLyrics, youtube.syncedLyrics);
      if (aligned && aligned.matched >= 2 && aligned.confidence >= .42) {
        return withScriptVariants({ ...original, syncedLyrics:aligned.syncedLyrics,
          source:`${original.source} text · ${youtube.source} timing`, timingPrecision:'youtube-aligned',
          timingMatchCount:aligned.matched, timingConfidence:aligned.confidence, timingOffsetSeconds:aligned.offset,
          detectedLanguage:youtube.captionLanguage||youtube.metadata?.language||'', wordTimings:youtube.wordTimings||[],
          wordTimingSource:youtube.wordTimingSource||'' });
      }
    }
    return withScriptVariants({ ...youtube, timingPrecision:'youtube-exact', timingOffsetSeconds:0 });
  } catch { return { success:false }; }
});

// Upgrade already-visible plain lyrics to timed lyrics in the background. This is
// intentionally separate from get-lyrics so the UI never waits for local AI timing.
ipcMain.handle('sync-plain-lyrics', async (event, song, plainLyrics) => {
  const senderId = event.sender.id;
  try { lyricsTimingControllers.get(senderId)?.abort(); } catch {}
  const controller = new AbortController();
  lyricsTimingControllers.set(senderId, controller);
  const signal = controller.signal;
  try {
    if (!String(plainLyrics || '').trim()) return { success:false, error:'Plain lyrics missing.' };
    const canTranscribe = !!song?.streamUrl || (!!song?.filepath && fs.existsSync(song.filepath)) || (!!song?.url && fs.existsSync(YTDLP_PATH));
    if (!canTranscribe) return { success:false, error:'Playable audio source timing ke liye available nahi hai.' };
    const sendStatus = (payload) => { try { event.sender.send('lyrics-status', { songId:song.id||'', title:song.title||'', ...payload }); } catch {} };
    sendStatus({ stage:'fallback', text:'Lyrics visible hain · background mein song timing sync ho rahi hai…' });
    const timed = await transcribeSong(song, {
      ytdlpPath:YTDLP_PATH, tempRoot:path.join(cacheDir,'lyrics-ai'), modelDir:path.join(app.getPath('userData'),'models'),
      onStatus:sendStatus, signal, browserAuth:readYouTubeAccess()
    });
    if (signal.aborted || timed?.cancelled) return { cancelled:true };
    if (!timed?.syncedLyrics) return { success:false, error:timed?.error || 'Timed transcription unavailable.' };
    const aligned = alignPlainLyricsToTimedTranscript(plainLyrics, timed.syncedLyrics);
    const result = aligned ? {
      success:true, lyrics:plainLyrics, syncedLyrics:aligned.syncedLyrics,
      source:'Provider lyrics · DEEP-ECHO AI timing', timingPrecision:'ai-aligned', timingConfidence:aligned.confidence,
      timingMatchCount:aligned.matched, timingOffsetSeconds:0
    } : {
      success:true, lyrics:plainLyrics, syncedLyrics:timed.syncedLyrics,
      source:'DEEP-ECHO AI synced', timingPrecision:'ai-transcribed', timingOffsetSeconds:0
    };
    const enriched = withScriptVariants(result);
    // Persist the upgrade under the same normal automatic lookup key.
    try {
      const key = JSON.stringify([song.title, song.channel, song.duration || '', song.url || '', false]);
      let cache={}; try { cache=JSON.parse(fs.readFileSync(lyricsCachePath,'utf8')); } catch {}
      cache[key]=enriched; fs.mkdirSync(path.dirname(lyricsCachePath),{recursive:true}); fs.writeFileSync(lyricsCachePath,JSON.stringify(cache),'utf8');
    } catch {}
    sendStatus({ stage:'done', text:'' });
    return enriched;
  } finally {
    if (lyricsTimingControllers.get(senderId) === controller) lyricsTimingControllers.delete(senderId);
  }
});

// ---------- IPC: delete a downloaded song ----------
ipcMain.handle('delete-song', async (_event, id) => {
  const lib = readLibrary();
  const entry = lib.find((s) => s.id === id);
  if (entry && fs.existsSync(entry.filepath)) {
    fs.unlinkSync(entry.filepath);
  }
  const artworkPath = existingArtworkPath(entry);
  if (artworkPath && fs.existsSync(artworkPath)) { try { fs.unlinkSync(artworkPath); } catch {} }
  const updated = lib.filter((s) => s.id !== id);
  writeLibrary(updated);
  return updated;
});

// DEEP-ECHO 2.0 desktop services. Restricted actions; renderer never supplies file paths.
const { shell, dialog } = require('electron');
let autoUpdater = null;
try { ({ autoUpdater } = require('electron-updater')); } catch (error) {
  console.warn('[auto-update] electron-updater unavailable:', String(error?.message || error));
}
let updaterReady = false;
let updaterAvailable = null;
let updaterDownloaded = null;
let updaterError = '';
function updateNotes(info) {
  const notes = info?.releaseNotes;
  if (typeof notes === 'string') return notes.slice(0, 4000);
  if (Array.isArray(notes)) return notes.map(item => item?.note || item?.version || '').filter(Boolean).join('\n').slice(0, 4000);
  return '';
}
function sendUpdaterEvent(type, data = {}) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('v200-update-event', { type, ...data });
  } catch {}
}
function setupAutoUpdater() {
  if (updaterReady || !autoUpdater || !app.isPackaged) return false;
  updaterReady = true;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.on('checking-for-update', () => sendUpdaterEvent('checking'));
  autoUpdater.on('update-available', info => {
    updaterAvailable = { version: info.version, notes: updateNotes(info) };
    updaterError = '';
    sendUpdaterEvent('available', updaterAvailable);
  });
  autoUpdater.on('update-not-available', info => {
    updaterAvailable = null;
    updaterDownloaded = null;
    updaterError = '';
    sendUpdaterEvent('not-available', { version: info?.version || app.getVersion() });
  });
  autoUpdater.on('download-progress', progress => {
    sendUpdaterEvent('progress', {
      percent: Number(progress?.percent || 0),
      transferred: Number(progress?.transferred || 0),
      total: Number(progress?.total || 0),
      bytesPerSecond: Number(progress?.bytesPerSecond || 0)
    });
  });
  autoUpdater.on('update-downloaded', info => {
    updaterDownloaded = { version: info?.version || updaterAvailable?.version || '' };
    sendUpdaterEvent('downloaded', updaterDownloaded);
  });
  autoUpdater.on('error', error => {
    updaterError = String(error?.message || error || 'Update failed').slice(0, 1000);
    sendUpdaterEvent('error', { error: updaterError });
  });
  return true;
}
ipcMain.handle('v200-downloads',()=>[...downloadJobs.values()].slice(-100));
ipcMain.handle('v200-cancel-download',(_e,id)=>{const c=downloadControllers.get(id);if(c)c.abort();return {success:!!c}});
ipcMain.handle('v200-quality',(_e,q)=>{downloadQuality=['best','balanced','small'].includes(q)?q:'best';return downloadQuality});
ipcMain.handle('v200-storage',()=>{
 const measure=dir=>{let bytes=0,count=0;try{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(!entry.isFile())continue;bytes+=fs.statSync(path.join(dir,entry.name)).size;count++;}}catch{}return {bytes,count}};
 return {downloads:measure(libraryDir),cache:measure(cacheDir),smartCache:measure(smartCacheDir)};
});
ipcMain.handle('v200-repair',(_e,kind)=>{
 if(kind==='lyrics'){try{fs.unlinkSync(lyricsCachePath)}catch{};return {success:true,message:'Lyrics disk cache cleared. Retry lyrics.'}};
 if(kind==='library'){const missing=readLibrary().filter(s=>!s.filepath||!fs.existsSync(s.filepath));return {success:true,message:missing.length?`${missing.length} downloaded files are missing. Re-download those songs.`:'All downloaded files found.',missing:missing.map(s=>s.id)}};
 if(kind==='temp'){let count=0;try{for(const n of fs.readdirSync(cacheDir)){const f=path.join(cacheDir,n),st=fs.lstatSync(f);if(st.isFile()&&Date.now()-st.mtimeMs>86400000){try{fs.unlinkSync(f);count++}catch{}}}}catch{}return {success:true,message:`Removed ${count} temporary files older than 24 hours.`}};
 return {success:false,message:'Unknown repair action'};
});
ipcMain.handle('v200-update-check', async () => {
  if (!app.isPackaged) return { success:true, configured:false, message:'Updates are checked in installed builds. Source mode is already editable.' };
  if (!autoUpdater) return { success:false, configured:false, error:'Auto updater is unavailable in this build.' };
  setupAutoUpdater();
  updaterError = '';
  try {
    const result = await autoUpdater.checkForUpdates();
    const info = result?.updateInfo;
    const version = info?.version;
    const available = version && version !== app.getVersion() ? { version, notes:updateNotes(info) } : updaterAvailable;
    if (available) updaterAvailable = available;
    return { success:true, configured:true, available:updaterAvailable, currentVersion:app.getVersion() };
  } catch (error) {
    updaterError = String(error?.message || error || 'Update check failed').slice(0, 1000);
    return { success:false, configured:true, error:updaterError };
  }
});
ipcMain.handle('v200-update-download', async () => {
  if (!app.isPackaged || !autoUpdater) return { success:false, error:'Updates are only available in installed builds.' };
  setupAutoUpdater();
  if (!updaterAvailable) {
    try { await autoUpdater.checkForUpdates(); } catch (error) { return { success:false, error:String(error?.message || error) }; }
  }
  if (!updaterAvailable) return { success:false, error:'No newer version is available.' };
  try {
    await autoUpdater.downloadUpdate();
    return { success:true, version:updaterDownloaded?.version || updaterAvailable.version };
  } catch (error) {
    return { success:false, error:String(error?.message || error || 'Update download failed').slice(0,1000) };
  }
});
ipcMain.handle('v200-update-install', async () => {
  if (!app.isPackaged || !autoUpdater) return { success:false, error:'Updates are only available in installed builds.' };
  if (!updaterDownloaded) return { success:false, error:'Download the update first.' };
  try {
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return { success:true };
  } catch (error) {
    return { success:false, error:String(error?.message || error || 'Update install failed').slice(0,1000) };
  }
});
ipcMain.handle('v200-backup',async(_e,data)=>{try{const json=JSON.stringify(data);if(json.length>8*1024*1024)throw Error('Backup too large');const result=await dialog.showSaveDialog(mainWindow,{title:'Save DEEP-ECHO backup',defaultPath:'DEEP-ECHO-backup.json',filters:[{name:'JSON backup',extensions:['json']}]});if(result.canceled)return {success:false,cancelled:true};fs.writeFileSync(result.filePath,json);return {success:true};}catch(e){return {success:false,error:e.message}}});
ipcMain.handle('v200-about',()=>({name:APP_DISPLAY_NAME,version:app.getVersion(),platform:process.platform,packaged:app.isPackaged,engineAvailable:fs.existsSync(YTDLP_PATH)}));
