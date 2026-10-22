const { app, BrowserWindow, ipcMain, globalShortcut, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');
const { getLyrics, withScriptVariants, isExplicitInstrumentalSong, scriptProfile, guessArtistTitle, seconds } = require('./lib/lyrics');
const { getYouTubeLyrics, alignSyncedLyricsToCaptionsStable } = require('./lib/youtube-captions');
const { runTransfer, downloadDirectAudio } = require('./lib/transfer');
const { transcribeSong } = require('./lib/auto-transcribe');
const { exactLyricsFromVideo, exactCacheKey } = require('./lib/exact-lyrics');
const { buildReferenceLyrics } = require('./lib/lyrics-reference');
const { rankSearchResultsForLyrics, rankVerifiedSearchResults } = require('./lib/lyrics-search-ranking');
const { getMultiProviderAlternatives } = require('./lib/lyrics-providers');
const { translateLyricsPayload } = require('./lib/lyrics-translate');
const { prepareKaraokeTrack } = require('./lib/karaoke-audio');
const { rankCompatibleCandidates, buildCompatibleQueries, isUsableSyncedLyrics, verificationScore, lyricalHint } = require('./lib/lyrics-compatible-version');
const { makeEntry:makeCanonicalLyricsEntry, readMatch:readCanonicalLyricsMatch, canonicalKey:canonicalLyricsKey } = require('./lib/lyrics-canonical-cache');
const { runYtDlpSmart: runYtDlpSmartBase, runWithYtDlpContext, isBotChallenge, isAbort, resetYouTubeBackoff } = require('./lib/ytdlp-smart');
const selectFastRuntime = require('./lib/fast-ytdlp-runtime').createRuntimeSelector();
function runYtDlpSmart(executable, args, options = {}) {
  return runYtDlpSmartBase(selectFastRuntime(executable, options), args, options);
}
const { isPlaylistLike, explicitPlaylistSignal, extractTracklist, choosePlayableCandidate, playlistSourceUrl, mapPlaylistEntry } = require('./lib/playlist-content');
const {createPlaybackRelay,expiry:streamExpiry}=require('./lib/playback-relay');
const {findPreparedPlayback}=require('./lib/prepared-playback-cache');
const PLAYBACK_PLUGIN_DIR = path.join(__dirname, 'lib', 'playback-plugins');
const playbackRelay=createPlaybackRelay({
  log:(stage,data)=>playbackLog(stage,data)
});
app.on('will-quit',()=>playbackRelay.close());
const playbackDebug=process.env.DEEPECHO_PLAYBACK_DEBUG==='1';
const playbackLog=(stage,data)=>{if(playbackDebug)console.debug('[playback-timing]',stage,data);};
const util = require('util');
const execFileAsync = util.promisify(execFile);

const YTDLP_PATH = path.join(app.getAppPath(), 'bin', 'yt-dlp.exe');
const APP_DISPLAY_NAME = 'DEEP-ECHO';
// Keep the original profile location when the installer/product name changes.
app.setPath('userData', path.join(app.getPath('appData'), 'deepeccho'));

// ---------- GPU preference (game-style low-power / high-performance routing) ----------
const gpuPreferenceFile = path.join(app.getPath('userData'), 'gpu-preference.json');
function classifyGpuAdapter(adapter = {}) {
  const name = String(adapter.name || adapter.Name || '').trim();
  const vendor = String(adapter.vendor || adapter.AdapterCompatibility || '').trim();
  const hay = `${name} ${vendor}`.toLowerCase();
  if (/nvidia|geforce|quadro|rtx|gtx/.test(hay)) return 'high-performance';
  if (/radeon\s+(rx|pro)|amd\s+radeon\s+rx/.test(hay)) return 'high-performance';
  if (/intel|uhd|iris|hd graphics|integrated/.test(hay)) return 'low-power';
  if (/radeon\(tm\) graphics|amd radeon graphics/.test(hay) && !/rx/.test(hay)) return 'low-power';
  return 'balanced';
}
function readGpuPreference() {
  try {
    const value = JSON.parse(fs.readFileSync(gpuPreferenceFile, 'utf8'));
    const mode = ['auto','low-power','high-performance','balanced'].includes(value?.mode) ? value.mode : 'auto';
    return { mode, adapterId:String(value?.adapterId || ''), adapterName:String(value?.adapterName || '') };
  } catch { return { mode:'auto', adapterId:'', adapterName:'' }; }
}
function writeGpuPreference(value = {}) {
  const next = {
    mode: ['auto','low-power','high-performance','balanced'].includes(value?.mode) ? value.mode : 'auto',
    adapterId: String(value?.adapterId || ''),
    adapterName: String(value?.adapterName || '')
  };
  fs.mkdirSync(path.dirname(gpuPreferenceFile), { recursive:true });
  fs.writeFileSync(gpuPreferenceFile, JSON.stringify(next, null, 2), 'utf8');
  return next;
}
const bootGpuPreference = readGpuPreference();
if (bootGpuPreference.mode === 'high-performance') app.commandLine.appendSwitch('force-high-performance-gpu');
else if (bootGpuPreference.mode === 'low-power') app.commandLine.appendSwitch('force-low-power-gpu');

async function detectGpuAdapters() {
  const fallback = async () => {
    try {
      const info = await app.getGPUInfo('complete');
      const devices = Array.isArray(info?.gpuDevice) ? info.gpuDevice : [];
      return devices.map((d, i) => {
        const name = d.deviceString || d.device || `GPU ${i + 1}`;
        const adapter = { id:String(d.deviceId || d.vendorId || i), name:String(name), vendor:String(d.vendorString || d.vendorId || ''), driverVersion:String(d.driverVersion || '') };
        adapter.classification = classifyGpuAdapter(adapter);
        return adapter;
      });
    } catch { return []; }
  };
  if (process.platform !== 'win32') return fallback();
  const command = [
    '$ErrorActionPreference="SilentlyContinue";',
    '$g=Get-CimInstance Win32_VideoController | Select-Object Name,AdapterCompatibility,PNPDeviceID,DriverVersion,VideoProcessor,AdapterRAM;',
    '$g | ConvertTo-Json -Compress'
  ].join(' ');
  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile','-ExecutionPolicy','Bypass','-Command',command], { windowsHide:true, timeout:7000, maxBuffer:1024*1024 });
    const parsed = JSON.parse(String(stdout || '[]').trim() || '[]');
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows.filter(Boolean).map((row, i) => {
      const adapter = {
        id: String(row.PNPDeviceID || row.Name || i),
        name: String(row.Name || `GPU ${i + 1}`),
        vendor: String(row.AdapterCompatibility || ''),
        driverVersion: String(row.DriverVersion || ''),
        videoProcessor: String(row.VideoProcessor || ''),
        adapterRam: Number(row.AdapterRAM || 0) || 0
      };
      adapter.classification = classifyGpuAdapter(adapter);
      return adapter;
    });
  } catch { return fallback(); }
}
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
    const { stdout, stderr } = await execFileAsync(YTDLP_PATH, ['--update-to', 'nightly'], {
      windowsHide: true, timeout: 45000, maxBuffer: 4 * 1024 * 1024
    });
    const summary = String(stdout || stderr || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (summary) console.log('[yt-dlp update]', summary);
    // Mark the check only after a successful refresh. A transient failed update must
    // not leave DeepEcho stuck on an obsolete YouTube extractor for the next 24h.
    fs.writeFileSync(ytdlpUpdateStamp, JSON.stringify({ checkedAt: Date.now() }), 'utf8');
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
function dispatchGlobalShortcutAction(action) {
  if (action === 'floatingClickThrough') { toggleFloatingLyricsClickThrough(); return true; }
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  try { mainWindow.webContents.send('global-shortcut-action', action); return true; } catch { return false; }
}
const RELIABLE_DEFAULT_SHORTCUTS = [
  { accelerator: 'CommandOrControl+Alt+X', action:'floatingClickThrough', callback:()=>toggleFloatingLyricsClickThrough() },
  { accelerator: 'CommandOrControl+Alt+Shift+X', action:'immersiveLyricsClickThrough', callback:()=>applyImmersiveLyricsClickThrough(!immersiveLyricsClickThrough) },
  { accelerator: 'CommandOrControl+Alt+Space', action:'playPause', callback:()=>dispatchGlobalShortcutAction('playPause') }
];
function reliableDefaultFor(action, accelerator) {
  const canonical = canonicalAccelerator(accelerator);
  return RELIABLE_DEFAULT_SHORTCUTS.find(item => item.action === action && canonicalAccelerator(item.accelerator) === canonical) || null;
}
function ensureReliableDefaultShortcut(item) {
  if (!item) return false;
  const accelerator = item.accelerator;
  if (reliableGlobalShortcuts.get(accelerator) === item.action && globalShortcut.isRegistered(accelerator)) return true;
  try {
    if (globalShortcut.isRegistered(accelerator)) globalShortcut.unregister(accelerator);
    const ok = globalShortcut.register(accelerator, item.callback);
    if (ok) reliableGlobalShortcuts.set(accelerator, item.action);
    else reliableGlobalShortcuts.delete(accelerator);
    return !!ok;
  } catch (err) {
    reliableGlobalShortcuts.delete(accelerator);
    console.warn(`[global shortcut] ${accelerator} failed:`, err?.message || err);
    return false;
  }
}
function reliableActionForAccelerator(action, accelerator) {
  const item = reliableDefaultFor(action, accelerator);
  if (!item) return false;
  if (!globalShortcut.isRegistered(item.accelerator) || reliableGlobalShortcuts.get(item.accelerator) !== action) ensureReliableDefaultShortcut(item);
  return globalShortcut.isRegistered(item.accelerator) && reliableGlobalShortcuts.get(item.accelerator) === action;
}
function registerReliableDefaultShortcuts() {
  for (const item of RELIABLE_DEFAULT_SHORTCUTS) ensureReliableDefaultShortcut(item);
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
    fullscreen: true,
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
  if(playbackDebug){
    mainWindow.webContents.on('dom-ready',()=>mainWindow.webContents.executeJavaScript('window.__DEEPECHO_PLAYBACK_DEBUG=true').catch(()=>{}));
    mainWindow.webContents.on('console-message',(_event,_level,message)=>{if(message.startsWith('[playback-timing]'))console.debug(message);});
  }
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Native Windows maximize stays a normal maximized window. True edge-to-edge
  // Launch fullscreen as requested; F11, Escape and the app button still let users exit.
  mainWindow.on('enter-full-screen', () => sendFullscreenState(mainWindow));
  mainWindow.on('leave-full-screen', () => sendFullscreenState(mainWindow));
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const playPauseChord = input.type === 'keyDown' && !!input.control && !!input.alt && !input.shift && !input.meta && (input.code === 'Space' || input.key === ' ' || input.key === 'Space');
    if (playPauseChord) {
      // Focused-window fallback: even if Windows refuses the global registration, the requested
      // Ctrl+Alt+Space shortcut still toggles the existing Play/Pause button path.
      event.preventDefault();
      dispatchGlobalShortcutAction('playPause');
    } else if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault();
      toggleAppFullscreen(mainWindow);
    } else if (input.type === 'keyDown' && input.key === 'Escape' && mainWindow?.isFullScreen()) {
      event.preventDefault();
      setAppFullscreen(mainWindow, false);
    }
  });
  mainWindow.webContents.once('did-finish-load', () => {
    // Retry defaults after the renderer exists. This repairs Windows sessions where registration
    // was temporarily unavailable during app startup.
    setTimeout(registerReliableDefaultShortcuts, 120);
  });

  if (useSplash) {
    const started = Date.now();
    mainWindow.once('ready-to-show', () => {
      // Startup is already visually covered by the splash. Keep only a tiny anti-flash hold
      // instead of forcing every launch to wait 1.35 s after the main window is ready.
      const wait = Math.max(0, 180 - (Date.now() - started));
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
      ok = globalShortcut.register(accelerator, () => dispatchGlobalShortcutAction(action));
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
ipcMain.handle('get-gpu-settings', async () => ({
  success:true,
  adapters:await detectGpuAdapters(),
  preference:readGpuPreference(),
  activeBootPreference:bootGpuPreference,
  featureStatus:app.getGPUFeatureStatus?.() || {}
}));
ipcMain.handle('set-gpu-preference', async (_event, requested = {}) => {
  const adapters = await detectGpuAdapters();
  const requestedId = String(requested?.adapterId || '');
  let next = { mode:'auto', adapterId:'', adapterName:'' };
  if (requestedId && requestedId !== 'auto') {
    const adapter = adapters.find(item => String(item.id) === requestedId);
    if (!adapter) return { success:false, error:'Selected GPU is no longer available.' };
    const mode = adapter.classification === 'high-performance' ? 'high-performance' : adapter.classification === 'low-power' ? 'low-power' : 'balanced';
    next = { mode, adapterId:adapter.id, adapterName:adapter.name };
  }
  const saved = writeGpuPreference(next);
  const restartRequired = JSON.stringify(saved) !== JSON.stringify(bootGpuPreference);
  if (requested?.restart && restartRequired) {
    setTimeout(() => { try { app.relaunch(); app.exit(0); } catch (_) {} }, 180);
  }
  return { success:true, preference:saved, restartRequired, adapters };
});
ipcMain.handle('open-windows-graphics-settings', async () => {
  if (process.platform !== 'win32') return { success:false, error:'Windows Graphics Settings is only available on Windows.' };
  try { await shell.openExternal('ms-settings:display-advancedgraphics'); return { success:true }; }
  catch (error) { return { success:false, error:error?.message || String(error) }; }
});

app.whenReady().then(() => {
  app.setName(APP_DISPLAY_NAME);
  ensureLibrary();
  // yt-dlp self-update and artwork hydration are maintenance work, not launch-critical work.
  // Starting yt-dlp here used to compete with Chromium startup for CPU/disk/network.
  setTimeout(() => maybeRefreshYtDlp().catch(() => {}), 30000);
  setTimeout(() => hydrateMissingLibraryArtwork().catch(() => {}), 15000);
  registerReliableDefaultShortcuts();
  createSplashWindow();
  createWindow(true);
  setupAutoUpdater();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(false);
    registerReliableDefaultShortcuts();
  });
  app.on('browser-window-focus', () => registerReliableDefaultShortcuts());
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
    return entries.map((e) => {
      const rawUrl = String(e.webpage_url || e.url || '');
      const playlist = explicitPlaylistSignal(e) || /playlist/i.test(String(e._type || '')) || /YoutubeTab/i.test(String(e.ie_key || e.extractor_key || ''));
      const id = String(e.id || '').trim();
      const url = playlist
        ? (/^https?:/i.test(rawUrl) ? rawUrl : `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}`)
        : (/^https?:/i.test(rawUrl) && /watch\?v=/i.test(rawUrl) ? rawUrl : `https://www.youtube.com/watch?v=${id}`);
      return {
        id,
        title: e.title || 'Untitled',
        channel: e.channel || e.uploader || '',
        duration: formatDuration(e.duration),
        thumbnail: playlist ? (e.thumbnails?.at?.(-1)?.url || e.thumbnail || '') : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        url,
        ...(playlist ? { isPlaylist:true, playlistId:id, resultType:'playlist' } : {})
      };
    });
  } catch (err) {
    console.error('[search] FAILED:', err.message);
    return { error: err?.code === 'YOUTUBE_BOT_CHECK' ? 'YouTube bot-check laga raha hai. Settings > YouTube Access me browser login fallback enable kar sakte ho.' : err.message, errorCode: err?.code || '' };
  }
}


// ---------- Playlist / long-mix content resolver ----------
// V25 keeps playlist extraction separate from lyrics. Real playlists use their real entries;
// long mix videos use chapters / timestamped descriptions and resolve each track independently.
function chapterFallbackSong(seed = {}, track = {}, index = 0) {
  const baseId = String(seed.id || 'mix').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) || 'mix';
  const start = Math.max(0, Number(track.start || 0));
  const end = Math.max(start + 1, Number(track.end || 0));
  return {
    id: `mix-${baseId}-${Math.round(start)}-${index}`,
    title: track.title || `Track ${index + 1}`,
    channel: `${seed.channel || 'Mix'} · Mix chapter`,
    duration: formatDuration(end - start),
    thumbnail: seed.thumbnail || '',
    url: seed.url || `https://www.youtube.com/watch?v=${seed.id || ''}`,
    startTime: start,
    endTime: end,
    chapterFallback: true,
    sourceVideoId: seed.id || '',
    skipLyricsVerification: true,
    playlistTrackSource: track.source || 'chapter'
  };
}

async function resolveOneMixTrack(track, seed, index) {
  const queries = [
    `${track.title} official audio`,
    String(track.title || '')
  ].map(q => q.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let combined = [];
  for (const query of queries) {
    try {
      const found = await searchMusic(query, 7);
      if (Array.isArray(found)) combined.push(...found);
    } catch (_) {}
    const chosen = choosePlayableCandidate(track, combined);
    if (chosen) return { ...chosen, playlistTrackSource:track.source || 'tracklist', resolvedFromMix:true };
  }
  // Every timestamped track remains playable even when YouTube search cannot confidently map
  // an individual upload: play the exact chapter from the original long mix.
  return chapterFallbackSong(seed, track, index);
}

async function resolveMixTracks(tracklist, seed, concurrency = 3) {
  const tracks = Array.isArray(tracklist) ? tracklist : [];
  const out = new Array(tracks.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < tracks.length) {
      const index = cursor++;
      out[index] = await resolveOneMixTrack(tracks[index], seed, index);
    }
  };
  await Promise.all(Array.from({ length:Math.min(Math.max(1, concurrency), tracks.length || 1) }, worker));
  return out.filter(Boolean);
}

async function resolvePlaylistContent(seed = {}) {
  if (!seed || typeof seed !== 'object') return { success:false, songs:[], error:'Playlist information missing.' };
  if (!fs.existsSync(YTDLP_PATH)) return { success:false, songs:[], error:'yt-dlp.exe nahi mila. Setup-YtDlp.bat pehle chalao.' };
  const sourceUrl = playlistSourceUrl(seed);

  // Actual YouTube playlist: never reconstruct it from a generic search query.
  if (explicitPlaylistSignal(seed) && sourceUrl) {
    try {
      const { stdout } = await runYtDlpSmart(
        YTDLP_PATH,
        ['--flat-playlist', '--yes-playlist', '--no-warnings', '-J', sourceUrl],
        { maxBuffer:32 * 1024 * 1024, timeout:70000, purpose:'playlist-resolve', browserAuth:readYouTubeAccess(), allowFallbackClients:true }
      );
      const data = JSON.parse(stdout);
      const seen = new Set();
      const songs = [];
      for (const entry of data.entries || []) {
        const mapped = mapPlaylistEntry(entry);
        if (!mapped?.id || seen.has(mapped.id)) continue;
        seen.add(mapped.id); songs.push(mapped);
      }
      if (songs.length) return {
        success:true, kind:'youtube-playlist', songs,
        total:Number(data.playlist_count || data.n_entries || songs.length) || songs.length,
        complete:!(data.playlist_count > songs.length), title:data.title || seed.title || 'Playlist'
      };
    } catch (error) {
      console.warn('[playlist resolve] direct playlist unavailable:', error?.message || error);
    }
  }

  // Long compilation/mix video: inspect real metadata, not theme-search guesses.
  if (!sourceUrl) return { success:false, songs:[], error:'Playlist URL missing.' };
  try {
    const { stdout } = await runYtDlpSmart(
      YTDLP_PATH,
      ['--no-warnings', '--no-playlist', '--skip-download', '-J', sourceUrl],
      { maxBuffer:24 * 1024 * 1024, timeout:50000, purpose:'playlist-resolve', browserAuth:readYouTubeAccess(), allowFallbackClients:true }
    );
    const info = JSON.parse(stdout);
    const tracklist = extractTracklist(info);
    if (!tracklist.complete || tracklist.tracks.length < 2) {
      return { success:false, kind:'long-video', songs:[], error:'Reliable chapter/track list nahi mili. Is long mix ko normal video ki tarah play karo.' };
    }
    const tracks = tracklist.tracks.slice(0, 60);
    const songs = await resolveMixTracks(tracks, { ...seed, url:sourceUrl, thumbnail:seed.thumbnail || info.thumbnail || '' }, 3);
    if (songs.length !== tracks.length) {
      return { success:false, kind:'long-video', songs:[], error:'Track list incomplete resolve hui; fake partial playlist nahi banayi gayi.' };
    }
    const resolvedCount = songs.filter(song => !song.chapterFallback).length;
    return {
      success:true,
      kind:'mix-tracklist',
      songs,
      total:tracks.length,
      complete:true,
      resolvedCount,
      chapterFallbackCount:songs.length - resolvedCount,
      trackSource:tracklist.source,
      title:info.title || seed.title || 'Mix'
    };
  } catch (error) {
    console.warn('[playlist resolve] long mix unavailable:', error?.message || error);
    return { success:false, songs:[], error:error?.message || 'Playlist tracks resolve nahi hue.' };
  }
}

ipcMain.handle('resolve-playlist-content', async (_event, seed = {}) => {
  try { return await resolvePlaylistContent(seed); }
  catch (error) { return { success:false, songs:[], error:error?.message || String(error) }; }
});

// ---------- Smart Autoplay related-song discovery ----------
function smartAutoplayMapEntries(entries, seedId = '') {
  const seen = new Set();
  const out = [];
  for (const e of entries || []) {
    if (!e?.id || e.id === seedId || seen.has(e.id)) continue;
    seen.add(e.id);
    out.push({
      id: e.id,
      title: e.title || 'Untitled',
      channel: e.channel || e.uploader || '',
      duration: formatDuration(e.duration),
      thumbnail: `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${e.id}`
    });
  }
  return out;
}

async function getSmartAutoplayCandidates(seed, requestedLimit = 32) {
  const song = seed && typeof seed === 'object' ? seed : {};
  const id = String(song.id || '').trim();
  const limit = Math.max(12, Math.min(48, Number(requestedLimit) || 32));
  if (!fs.existsSync(YTDLP_PATH)) return { source: 'unavailable', items: [] };

  // YouTube's automatic radio/mix is the closest free related-song signal we can use here.
  // It is attempted first; normal ytsearch is the resilient fallback when a radio list is unavailable.
  if (/^[A-Za-z0-9_-]{11}$/.test(id)) {
    const radioLists = [`RDAMVM${id}`, `RD${id}`];
    for (const listId of radioLists) {
      try {
        const radioUrl = `https://www.youtube.com/watch?v=${id}&list=${listId}`;
        const { stdout } = await runYtDlpSmart(
          YTDLP_PATH,
          ['--flat-playlist', '--yes-playlist', '--no-warnings', '--playlist-end', String(limit + 4), '-J', radioUrl],
          { maxBuffer: 24 * 1024 * 1024, timeout: 50000, purpose: 'search', browserAuth: readYouTubeAccess(), allowFallbackClients: true }
        );
        const data = JSON.parse(stdout);
        const items = smartAutoplayMapEntries(data.entries || [], id).slice(0, limit);
        if (items.length >= 6) return { source: 'youtube-radio', items };
      } catch (err) {
        console.warn('[smart autoplay radio] unavailable:', err?.message || err);
      }
    }
  }

  const title = String(song.title || '').replace(/\s+/g, ' ').trim();
  const channel = String(song.channel || song.artist || '').replace(/\s+/g, ' ').trim();
  const queries = [
    `${title} ${channel} similar songs official audio`.trim(),
    `${title} radio mix songs`.trim(),
    channel ? `${channel} best songs official audio` : ''
  ].filter(Boolean);
  const settled = await Promise.allSettled(queries.map(q => searchMusic(q, Math.min(20, limit))));
  const combined = [];
  for (const result of settled) {
    if (result.status !== 'fulfilled' || !Array.isArray(result.value)) continue;
    combined.push(...result.value);
  }
  const seen = new Set();
  const items = [];
  for (const raw of combined) {
    if (!raw?.id || raw.id === id || seen.has(raw.id)) continue;
    seen.add(raw.id); items.push(raw);
    if (items.length >= limit) break;
  }
  return { source: 'search-fallback', items };
}

ipcMain.handle('smart-autoplay-candidates', async (_event, seed, limit) => {
  try { await waitForPlaybackPriority();return await getSmartAutoplayCandidates(seed, limit); }
  catch (err) { return { source: 'error', items: [], error: err?.message || String(err) }; }
});

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
async function searchUserMusic(query, limit = 20) {
  const q = String(query || '').trim();
  if (!q) return [];
  // One relevant search supplies all upload versions. Waiting for a second
  // lyrics search delayed every result and doubled extractor contention.
  const base = await searchMusic(q, limit);
  const lyric = [];
  if (base && base.error) return base;
  const ranked = rankSearchResultsForLyrics(base, lyric, q, limit);
  if (!Array.isArray(ranked)) return ranked;
  const known = knownLyricsReadyIds();
  // Previously verified exact-video lyric support should influence Search immediately, but it
  // must not overpower relevance. A bounded score boost lets verified versions rise above
  // comparable uploads while unrelated/weak matches stay below strong exact-song results.
  return rankVerifiedSearchResults(ranked.map(item => {
    if (isPlaylistLike(item)) return { ...item, lyricsReady:false, lyricsVerified:false, lyricsChecking:false, versionKind:'playlist' };
    const verified = known.has(String(item?.id||''));
    return verified ? { ...item, lyricsReady:true, lyricsVerified:true, versionKind:'lyrics-compatible' } : item;
  }));
}
ipcMain.handle('search-music', async (_event, query) => searchUserMusic(query, 20));
ipcMain.handle('verify-lyrics-support', async (_event, song = {}) => {
  const id=String(song?.id||'').trim();
  if(!id)return {id,verified:false};
  if(knownLyricsReadyIds().has(id))return {id,verified:true,reason:'known-compatible',label:'✓ Lyrics Supported'};
  const hot=lyricsHotReadyEntry(song); if(hot)return {id,verified:true,reason:'hot-ready',label:'✓ Lyrics Supported'};
  const cached=lyricsSupportEntry(song); if(cached)return {id,verified:!!cached.verified,reason:cached.reason||'',label:cached.verified?'✓ Lyrics Supported':''};
  if(!song?.url || !fs.existsSync(YTDLP_PATH))return {id,verified:false,reason:'verification-unavailable'};

  // Deduplicate Search/playlist checks for the same exact video. Without this, opening a
  // playlist while Search is still checking could launch several identical yt-dlp jobs.
  if(lyricsSupportJobs.has(id))return lyricsSupportJobs.get(id);
  const controller = new AbortController();
  lyricsSupportControllers.set(id, controller);
  const job=(async()=>{
    // Non-lyrical uploads may need catalogue text to prove that their exact captions line up.
    // Start that network work in parallel with YouTube caption discovery instead of waiting
    // for yt-dlp first. Lyric-labelled videos can be accepted from real timed captions alone.
    const providerPromise=lyricalHint(song)?Promise.resolve(null):getLyrics(song).catch(()=>null);
    try {
      const youtube=await runWithYtDlpContext({affectsGlobalBackoff:false,requestClass:'lyrics-capability'},()=>getYouTubeLyrics(song,YTDLP_PATH,execFileAsync,fetch,{browserAuth:readYouTubeAccess(),tempRoot:path.join(cacheDir,'lyrics-support-check'),signal:controller.signal}));
      if(youtube?.cancelled || controller.signal.aborted)return {id,verified:false,reason:'cancelled'};
      if(!youtube?.syncedLyrics || !isUsableSyncedLyrics(youtube)){rememberLyricsSupport(song,false,'no-exact-timed-captions');return {id,verified:false,reason:'no-exact-timed-captions'};}
      if(lyricalHint(song)){
        const ready=withScriptVariants({...youtube,timingPrecision:'youtube-exact',timingOffsetSeconds:0});
        rememberLyricsHotReady(song,ready,'lyric-video-timed-captions');
        persistAutomaticLyricsResult(song,ready);
        rememberLyricsSupport(song,true,'lyric-video-timed-captions');
        return {id,verified:true,reason:'lyric-video-timed-captions',label:'✓ Lyrics Supported'};
      }
      const provider=await providerPromise;
      if(provider?.syncedLyrics){
        const aligned=alignSyncedLyricsToCaptionsStable(provider.syncedLyrics,youtube.syncedLyrics);
        if(stableCaptionAlignment(aligned,.42)){
          const ready=withScriptVariants({
            ...provider,
            syncedLyrics:aligned.syncedLyrics,
            source:`${provider.source||'Lyrics'} text · ${youtube.source||'YouTube captions'} timing`,
            timingPrecision:'youtube-aligned',
            timingMatchCount:aligned.matched,
            timingConfidence:aligned.confidence,
            timingOffsetSeconds:aligned.offset,
            detectedLanguage:youtube.captionLanguage||youtube.metadata?.language||'',
            wordTimings:Array.isArray(youtube.wordTimings)?youtube.wordTimings:[],
            wordTimingSource:youtube.wordTimingSource||''
          });
          rememberLyricsHotReady(song,ready,'provider+exact-video-timing');
          persistAutomaticLyricsResult(song,ready);
          rememberLyricsSupport(song,true,'provider+exact-video-timing');
          return {id,verified:true,reason:'provider+exact-video-timing',label:'✓ Lyrics Supported'};
        }
      }
      if(provider?.lyrics){
        const plain=alignPlainLyricsToTimedTranscript(provider.lyrics,youtube.syncedLyrics);
        if(plain && plain.matched>=3 && plain.confidence>=.46){
          // Normal playback already prefers the exact caption timeline when catalogue text is
          // plain-only. Cache that exact same result instead of inventing a new timing path.
          const ready=withScriptVariants({...youtube,timingPrecision:'youtube-exact',timingOffsetSeconds:0});
          rememberLyricsHotReady(song,ready,'plain+exact-video-timing');
          persistAutomaticLyricsResult(song,ready);
          rememberLyricsSupport(song,true,'plain+exact-video-timing');
          return {id,verified:true,reason:'plain+exact-video-timing',label:'✓ Lyrics Supported'};
        }
      }
      rememberLyricsSupport(song,false,'timing-not-verified'); return {id,verified:false,reason:'timing-not-verified'};
    } catch(error){
      if(controller.signal.aborted || error?.name === 'AbortError')return {id,verified:false,reason:'cancelled'};
      return {id,verified:false,reason:'check-failed',error:String(error?.message||error)};
    }
  })();
  lyricsSupportJobs.set(id,job);
  try{return await job;}finally{
    if(lyricsSupportJobs.get(id)===job)lyricsSupportJobs.delete(id);
    if(lyricsSupportControllers.get(id)===controller)lyricsSupportControllers.delete(id);
  }
});

// ---------- IPC: artist search ----------
ipcMain.handle('search-artist', async (_event, query) => {
  if (!query || !query.trim()) return [];
  return searchMusic(`${query} best songs official audio`, 20);
});

// ---------- IPC: home feed ----------
let homeFeedCache = { at: 0, data: null, job: null };
ipcMain.handle('get-home-feed', async (_event, force = false) => {
  if (!force && homeFeedCache.data && Date.now() - homeFeedCache.at < 20 * 60 * 1000) return homeFeedCache.data;
  if (!force && homeFeedCache.job) return homeFeedCache.job;
  const job = (async () => {
    await waitForPlaybackPriority();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const [topHits, topArtistSongs, newReleases] = await Promise.all([
      searchMusic(`top hits ${year} songs official audio`, 18),
      searchMusic(`top artists hit songs ${year} official audio`, 24),
      searchMusic(`new songs ${month} ${year} latest releases official audio`, 24)
    ]);
    if (topHits && topHits.error) return topHits;
    if (topArtistSongs && topArtistSongs.error) return topArtistSongs;
    if (newReleases && newReleases.error) return newReleases;
    const data = { topHits, topArtistSongs, popularArtistSongs: topArtistSongs, newReleases };
    homeFeedCache = { at: Date.now(), data, job: null };
    return data;
  })();
  homeFeedCache.job = job;
  try { return await job; }
  finally { if (homeFeedCache.job === job) homeFeedCache.job = null; }
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
// V35: every in-flight audio resolver has an AbortController. A real Play click is allowed
// to cancel stale speculative/old-song resolution immediately instead of waiting behind it.
// Same-song warmup is never discarded: playback joins that exact promise and gets the URL
// the moment it resolves.
const streamJobs = new Map();
const classicJobs = new Map();

async function waitForPlaybackPriority(){
  for(;;){const work=[...streamJobs.values()].filter(entry=>entry.kind==='playback').map(entry=>entry.promise).concat([...classicJobs.values()].map(entry=>entry.promise));if(!work.length)return;await Promise.allSettled(work);}
}

function streamJobKey(song, quality = 'auto') {
  const qualityKey = ['high', 'medium', 'data'].includes(quality) ? quality : 'auto';
  return song?.id ? `${song.id}:${qualityKey}` : '';
}
function cancelStreamJobsExcept(keepKey = '') {
  for(const [id,entry] of classicJobs)if(!keepKey.startsWith(`${id}:`))entry.controller.abort();
  for (const [key, entry] of streamJobs.entries()) {
    if (key === keepKey) continue;
    try { entry?.controller?.abort(); } catch (_) {}
  }
}

async function resolveStreamUrl(song, quality = 'auto', options = {}) {
  const qualityKey = ['high', 'medium', 'data'].includes(quality) ? quality : 'auto';
  const key = streamJobKey(song, qualityKey);
  if (!key || !song.url) throw new Error('Song URL missing.');
  const cached = streamUrlCache.get(key);
  if (!options.force && cached && cached.expiresAt > Date.now() && !playbackRelay.failure?.(cached.url)) {playbackLog('cache-hit',{id:song.id});return cached.url;}
  if(options.force)streamUrlCache.delete(key);
  const existing = streamJobs.get(key);
  if (existing?.promise) {
    if(existing.controller?.signal.aborted){streamJobs.delete(key);return resolveStreamUrl(song,quality,options);}
    if (options.kind !== 'prefetch') existing.kind = 'playback';
    existing.priority = Math.max(Number(existing.priority || 0), Number(options.priority || 0));
    return existing.promise;
  }
  if (existing && typeof existing.then === 'function') return existing;
  if (!fs.existsSync(YTDLP_PATH)) throw new Error('yt-dlp.exe nahi mila. Setup-YtDlp.bat pehle chalao.');

  // Prefer browser-friendly audio containers first. YouTube often exposes Opus/WebM
  // as the highest quality stream, but some Electron/Windows codec combinations can
  // reject an otherwise valid direct URL with MEDIA_ERR_SRC_NOT_SUPPORTED.
  const format = qualityKey === 'data'
    ? 'bestaudio[ext=m4a][abr<=96]/bestaudio[abr<=96]/worstaudio/bestaudio'
    : qualityKey === 'medium'
      ? 'bestaudio[ext=m4a][abr<=160]/bestaudio[acodec^=mp4a][abr<=160]/bestaudio[abr<=160]/bestaudio'
      : 'bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio[ext=webm]/bestaudio/best';
  const controller = new AbortController();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', () => controller.abort(), { once:true });
  }
  const resolveStarted=Date.now();playbackLog('resolve-start',{id:song.id,kind:options.kind});
  const kind = options.kind === 'prefetch' ? 'prefetch' : 'playback';
  const priority = Number(options.priority || (kind === 'playback' ? 100 : 10));
  let job;
  job = runYtDlpSmart(
    YTDLP_PATH,
    ['--plugin-dirs', PLAYBACK_PLUGIN_DIR, '--no-warnings', '--no-playlist', '--socket-timeout', '8', '--retries', '1', '--extractor-retries', '1', '-f', format, '-J', song.url],
    {
      maxBuffer: 4 * 1024 * 1024,
      // Live challenge solving can exceed nine seconds. Killing a valid extraction
      // restarted the same work as a full-file download and multiplied the wait.
      timeout: 30000,
      signal: controller.signal,
      purpose: kind === 'prefetch' ? 'prefetch' : 'playback',
      browserAuth: readYouTubeAccess(),
      allowFallbackClients: true,
      clientOrder: ['visionos', 'default', 'web_embedded', 'android_vr'],
      ignoreGlobalBackoff: true,
      affectsGlobalBackoff: false
    }
  ).then(async ({ stdout }) => {
    const info=JSON.parse(stdout);const direct=info.url;
    if (!/^https?:\/\//i.test(String(direct||''))) throw new Error('Playable audio URL nahi mili.');
    // Some extractor clients return a signed URL before the site permits it.
    // Preserve that ready time so a premature 403 cannot trigger re-extraction.
    const media={url:direct,headers:info.http_headers||{},expiresAt:streamExpiry(direct),availableAt:Math.max(0,Number(info.available_at)||0)*1000};
    const progressive=!/m3u8|dash_segments/i.test(info.protocol||'');
    const url=progressive?await playbackRelay.register(media):direct;
    // Keep one different browser audio container from the SAME extraction.
    // If AAC is rejected, Opus can start without downloading/re-extracting the song.
    const alternatives = (info.formats || []).filter(f => f.vcodec === 'none' &&
      ['m4a','webm'].includes(f.ext) && f.ext !== info.ext && f.url !== direct &&
      /^https?:\/\//i.test(String(f.url || '')) && !/m3u8|dash_segments/i.test(f.protocol || ''))
      .sort((a,b)=>(b.abr||0)-(a.abr||0)).slice(0,1)
      .map(f=>({url:f.url,headers:{...info.http_headers,...f.http_headers},expiresAt:streamExpiry(f.url),availableAt:Math.max(0,Number(f.available_at)||0)*1000}));
    streamUrlCache.set(key, { url, media, alternatives, expiresAt:media.expiresAt });
    while(streamUrlCache.size>64)streamUrlCache.delete(streamUrlCache.keys().next().value);
    playbackLog('resolve-ready',{id:song.id,ms:Date.now()-resolveStarted});
    return url;
  }).finally(() => {
    const active = streamJobs.get(key);
    if (active?.promise === job || active === job) streamJobs.delete(key);
  });
  streamJobs.set(key, { promise: job, controller, kind, priority, createdAt: Date.now() });
  return job;
}

async function reuseAlternatePlayback(song, quality = 'auto') {
  const cached = streamUrlCache.get(streamJobKey(song, quality));
  if (!cached || cached.expiresAt <= Date.now()) return '';
  const media = cached.alternatives?.shift();
  if (!media || media.expiresAt <= Date.now()) return '';
  const url = await playbackRelay.register(media);
  cached.url = url; cached.media = media; cached.expiresAt = media.expiresAt;
  playbackLog('alternate-container', {id:song.id});
  return url;
}
async function prepareClassicPlaybackFile(song, progress = () => {}) {
  const existingJob=classicJobs.get(song?.id);
  if(existingJob&&!existingJob.controller.signal.aborted)return existingJob.promise;
  const controller=new AbortController();const entry={controller,promise:null};
  let timedOut=false;
  const deadline=setTimeout(()=>{timedOut=true;controller.abort();},60000);
  entry.promise=materializeClassicPlaybackFile(song,progress,controller.signal).catch(error=>{
    if(timedOut)throw new Error('Audio server unreachable. Retry this song after checking the connection; playback preparation was stopped safely.');
    throw error;
  }).finally(()=>{clearTimeout(deadline);if(classicJobs.get(song?.id)===entry)classicJobs.delete(song.id);});
  classicJobs.set(song?.id,entry);return entry.promise;
}
async function materializeClassicPlaybackFile(song, progress, signal) {
  if (!song?.url || !song?.id) throw new Error('Song URL missing.');
  if (!fs.existsSync(YTDLP_PATH)) throw new Error('yt-dlp.exe nahi mila. Setup-YtDlp.bat pehle chalao.');
  fs.mkdirSync(cacheDir, { recursive: true });
  const cleanId = String(song.id).replace(/[^a-zA-Z0-9_-]/g, '');
  const prefix = `stream-${cleanId}`;
  const existing = finishedFiles(cacheDir, prefix)
    .map(name => ({ name, full: path.join(cacheDir, name), stat: fs.statSync(path.join(cacheDir, name)) }))
    .filter(item => item.stat.isFile() && Date.now() - item.stat.mtimeMs < 12 * 60 * 60 * 1000)
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0];
  if (existing) {
    progress({ percent: 92, status: 'Classic cache ready' });
    return { filepath: existing.full, fileUrl: pathToFileURL(existing.full).href, cached: true };
  }
  for (const name of finishedFiles(cacheDir, prefix)) { try { fs.unlinkSync(path.join(cacheDir, name)); } catch {} }
  progress({ percent: 45, status: 'Restoring classic playback' });
  // A codec/origin rejection by the browser need not start YouTube extraction
  // again. Reuse the already resolved, header-preserving relay as a local file.
  // Failed/expired relays still take the established extractor fallback below.
  const resolved = streamUrlCache.get(streamJobKey(song, song.playbackQuality || 'auto'));
  if (resolved?.expiresAt > Date.now() && /^http:\/\/127\.0\.0\.1:\d+\/audio\//.test(resolved.url) && !playbackRelay.failure(resolved.url)) {
    const copyController = new AbortController();
    const abortCopy = () => copyController.abort();
    if (signal?.aborted) abortCopy(); else signal?.addEventListener('abort',abortCopy,{once:true});
    const copyDeadline = setTimeout(abortCopy,4000);
    try {
      const filepath = await downloadDirectAudio(resolved.url, path.join(cacheDir, `${prefix}.%(ext)s`),
        value => progress({ ...value, percent:45 + (Number(value.percent)||0)*.45, status:'Preparing local audio' }), { signal:copyController.signal });
      return { filepath, fileUrl:pathToFileURL(filepath).href, cached:false };
    } catch (error) { if (signal?.aborted || (!copyController.signal.aborted && isAbort(error))) throw error; }
    finally { clearTimeout(copyDeadline); signal?.removeEventListener('abort',abortCopy); }
  }
  await runYtDlpSmart(YTDLP_PATH, [
    '--plugin-dirs', PLAYBACK_PLUGIN_DIR, '--no-warnings', '--no-playlist', '--socket-timeout', '8', '--retries', '1', '--extractor-retries', '1', '-f',
    'bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio[ext=webm]/bestaudio',
    '-o', path.join(cacheDir, `${prefix}.%(ext)s`), song.url
  ], {
    maxBuffer: 20 * 1024 * 1024,
    timeout: 120000,
    purpose: 'classic-playback',
    signal,
    browserAuth: readYouTubeAccess(),
    allowFallbackClients: true,
    clientOrder: ['default', 'web_embedded', 'android_vr', 'web_safari'],
    ignoreGlobalBackoff: true,
    affectsGlobalBackoff: false
  });
  const name = finishedFiles(cacheDir, prefix).sort().pop();
  if (!name) throw new Error('Classic playback audio file nahi bani.');
  const filepath = path.join(cacheDir, name);
  progress({ percent: 92, status: 'Classic audio ready' });
  return { filepath, fileUrl: pathToFileURL(filepath).href, cached: false };
}

ipcMain.handle('stream-song', async (event, song, requestId, quality = 'auto') => {
  // User playback always wins over speculative lyric checks and stale resolver work.
  cancelLyricsSupportChecks();
  // V35 preserves same-song warmup (join it), but aborts other Search/Next/old-song probes.
  const requestedStreamKey = streamJobKey(song, quality);
  cancelStreamJobsExcept(requestedStreamKey);
  playbackRelay.supersede(streamUrlCache.get(requestedStreamKey)?.url||'');
  if(song.cancelOnly)return {success:true,cancelledBackground:true};
  const progress = value => sendProgress(event, 'stream-progress', { id: song.id, requestId, ...value });
  try {
    const already = readLibrary().find(s => s.id === song.id);
    if (already && fs.existsSync(already.filepath)) {
      progress({ percent: 100, status: 'Offline audio ready' });
      return { success: true, song: playable(already) };
    }
    const preparing = classicJobs.get(song.id);
    if(preparing?.promise && !preparing.controller.signal.aborted){
      progress({percent:null,status:'Preparing audio'});
      const ready=await preparing.promise;
      return {success:true,song:{...song,...ready,streamUrl:'',classicPlayback:true}};
    }
    const prepared = findPreparedPlayback(cacheDir,song.id);
    if (prepared) {
      progress({percent:100,status:'Prepared audio ready'});
      playbackLog('prepared-file-hit',{id:song.id});
      return {success:true,song:{...song,...prepared,streamUrl:'',classicPlayback:true}};
    }
    fs.mkdirSync(smartCacheDir, { recursive: true });
    const cachedName = finishedFiles(smartCacheDir, `cache-${String(song.id).replace(/[^a-zA-Z0-9_-]/g, '')}`)[0];
    if (cachedName) {
      const filepath = path.join(smartCacheDir, cachedName);
      progress({ percent: 100, status: 'Smart cache ready' });
      return { success: true, song: { ...song, filepath, fileUrl: pathToFileURL(filepath).href, smartCached: true } };
    }
    progress({ percent: 10, status: 'Connecting' });
    progress({ percent: 35, status: 'Resolving audio' });
    try {
      const streamUrl = await resolveStreamUrl(song, quality, { kind:'playback' });
      progress({ percent: 85, status: 'Audio URL ready' });
      return { success: true, song: { ...song, streamUrl } };
    } catch (directError) {
      // A newer Play click can deliberately abort this resolver. Never turn that intentional
      // cancellation into a huge classic-file fallback for the song the user already left.
      if (isAbort(directError)) return { success:false, cancelled:true, errorCode:'PLAYBACK_SUPERSEDED', error:'Playback request superseded.' };
      // Restore the original DeepEcho safety path: if a direct YouTube URL cannot be
      // resolved, prepare a short-lived local audio file instead of failing playback.
      // This path is deliberately isolated from the global YouTube bot-check backoff.
      console.warn('[playback] direct stream failed; trying classic local fallback:', String(directError?.message || directError).slice(0, 220));
      const fallback = await prepareClassicPlaybackFile(song, progress);
      return { success: true, song: { ...song, filepath: fallback.filepath, fileUrl: fallback.fileUrl, streamUrl: '', classicPlayback: true } };
    }
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

const immersiveVideoCache = new Map();
const IMMERSIVE_VIDEO_TTL = 8 * 60 * 1000;
async function resolveImmersiveVideoUrl(song) {
  if (!song?.id || !song?.url) throw new Error('Song video URL missing.');
  if (!fs.existsSync(YTDLP_PATH)) throw new Error('yt-dlp.exe nahi mila. Setup-YtDlp.bat pehle chalao.');
  const key = String(song.id);
  const cached = immersiveVideoCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const format = 'bestvideo[vcodec^=avc1][height<=720][ext=mp4]/best[vcodec^=avc1][height<=720][ext=mp4]/bestvideo[height<=720][ext=mp4]/best[height<=720][ext=mp4]/bestvideo[height<=720]/best[height<=720]';
  const { stdout } = await runYtDlpSmart(
    YTDLP_PATH,
    ['--no-warnings', '--no-playlist', '-f', format, '-g', song.url],
    { maxBuffer: 4 * 1024 * 1024, timeout: 45000, purpose: 'immersive-video', browserAuth: readYouTubeAccess(), allowFallbackClients: true }
  );
  const url = String(stdout || '').split(/\r?\n/).map(v => v.trim()).find(v => /^https?:\/\//i.test(v));
  if (!url) throw new Error('Playable video URL nahi mili.');
  immersiveVideoCache.set(key, { url, expiresAt: Date.now() + IMMERSIVE_VIDEO_TTL });
  if (immersiveVideoCache.size > 40) immersiveVideoCache.delete(immersiveVideoCache.keys().next().value);
  return url;
}

ipcMain.handle('resolve-song-video', async (_event, song) => {
  try {
    const url = await resolveImmersiveVideoUrl(song);
    return { success: true, url };
  } catch (err) {
    const bot = err?.code === 'YOUTUBE_BOT_CHECK' || isBotChallenge(err);
    return {
      success: false,
      errorCode: bot ? 'YOUTUBE_BOT_CHECK' : (err?.code || ''),
      error: bot ? 'YouTube video preview ko bot-check ne block kiya.' : (err?.message || 'Video preview unavailable.')
    };
  }
});

ipcMain.handle('prefetch-song', async (_event, song, quality = 'auto') => {
  try {
    const prepared = findPreparedPlayback(cacheDir,song.id);
    if(prepared)return {success:true,offline:true,streamUrl:prepared.fileUrl};
    if(classicJobs.size)return {success:false,busy:true};
    const already = readLibrary().find(s => s.id === song.id);
    if (already && fs.existsSync(already.filepath)) return { success: true, offline: true };
    const requestedKey = streamJobKey(song, quality);
    const priorityName = String(song?.prefetchPriority || 'search');
    // V35 all-surfaces priority ladder: playback > next > pointer intent > Search > passive cards.
    const priority = priorityName === 'next' ? 40 : priorityName === 'intent' ? 30 : priorityName === 'idle' ? 5 : 10;
    // A user Play resolve always wins. Speculative work waits instead of stealing CPU/network.
    const activePlayback = Array.from(streamJobs.entries()).find(([key, entry]) => key !== requestedKey && entry?.kind === 'playback');
    if (activePlayback) return { success:false, busy:true };
    // Keep speculative extraction single-flight. Higher-value Next/hover intent may replace a
    // lower-value Search warmup; lower priority work simply waits for the next idle opportunity.
    const replacedJobs = [];
    for (const [key, entry] of streamJobs.entries()) {
      if (key === requestedKey || entry?.kind !== 'prefetch') continue;
      if (Number(entry.priority || 0) < priority) {
        try { entry.controller?.abort(); } catch (_) {}
        if (entry?.promise) replacedJobs.push(entry.promise);
      } else {
        return { success:false, busy:true };
      }
    }
    if (replacedJobs.length) await Promise.allSettled(replacedJobs);
    if(song.prepareLocalPlayback){
      if(priority<30)return {success:false,busy:true};
      const prepared=await prepareClassicPlaybackFile({...song,playbackQuality:quality});
      return {success:true,streamUrl:prepared.fileUrl,prepared:true};
    }
    const streamUrl = await resolveStreamUrl(song, quality, { kind:'prefetch', priority });
    return { success: true, streamUrl };
  } catch (err) {
    if (err?.name === 'AbortError' || /aborted/i.test(String(err?.message || ''))) return { success:false, cancelled:true };
    return { success: false, error: err.message };
  }
});

// Last-resort playback compatibility path. It is used only when Chromium rejects a
// resolved direct stream. A short-lived local audio file is prepared in the temp cache;
// it is not added to Downloads and never blocks normal direct streaming when that works.
ipcMain.handle('prepare-compatible-playback', async (event, song) => {
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
    // If Chromium rejects a resolved GoogleVideo URL, reuse the same old-style local
    // playback fallback. It has its own cache and never inherits a bot-check cooldown.
    const report = value => sendProgress(event, 'stream-progress', { id:song.id, requestId:song.requestId, ...value });
    if (!song.forceClassicPlayback) {
      const alternate = await reuseAlternatePlayback(song, song.playbackQuality || 'auto');
      if (alternate) {
        report({percent:85,status:'Switching audio format'});
        return {success:true,streamUrl:alternate,reusedExtraction:true};
      }
    }
    if(!song.forceClassicPlayback && !song.preferLocalPlayback){
      const controller = new AbortController();
      const deadline = setTimeout(()=>controller.abort(),12000);
      try{
        report({percent:null,status:'Reconnecting audio'});
        cancelStreamJobsExcept(streamJobKey(song,song.playbackQuality));
        const streamUrl=await resolveStreamUrl(song,song.playbackQuality||'auto',{kind:'playback',force:true,signal:controller.signal});
        return {success:true,streamUrl,fresh:true};
      }catch(error){if(isAbort(error)&&!controller.signal.aborted)return {success:false,cancelled:true};}
      finally{clearTimeout(deadline);}
    }
    const fallback = await prepareClassicPlaybackFile(song,report);
    return { success: true, filepath: fallback.filepath, fileUrl: fallback.fileUrl, classicPlayback: true };
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

// Cache successful lyrics for offline use. V12 invalidates older timing data because
// V9 Precision Sync now stores per-recording multi-anchor warped timelines.
const lyricsCachePath = path.join(app.getPath('userData'), 'lyrics-cache-v14.json');
const exactLyricsCachePath = path.join(app.getPath('userData'), 'exact-lyrics-cache-v1.json');
const lyricsCompatibleCachePath = path.join(app.getPath('userData'), 'lyrics-compatible-versions-v1.json');
const lyricsSupportCachePath = path.join(app.getPath('userData'), 'lyrics-support-index-v1.json');
const canonicalLyricsCachePath = path.join(app.getPath('userData'), 'lyrics-canonical-v1.json');
const lyricsControllers = new Map();
const lyricsTimingControllers = new Map();
const lyricsUpgradeControllers = new Map();
const exactLyricsControllers = new Map();
const lyricsRecoveryControllers = new Map();
// V26 speed layer: Search capability checks and normal lyric loading share verified
// exact-video work in memory. This never changes timestamps; it only avoids repeating
// the same yt-dlp/provider work after Search already proved a video is lyrics-ready.
const lyricsSupportJobs = new Map();
const lyricsSupportControllers = new Map();
const lyricsHotReadyCache = new Map();

function cancelLyricsSupportChecks() {
  for (const controller of lyricsSupportControllers.values()) {
    try { controller.abort(); } catch {}
  }
  lyricsSupportControllers.clear();
}

function readJsonCache(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}
function writeJsonCache(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive:true });
  const temp = file + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value), 'utf8');
  fs.renameSync(temp, file);
}

function stableCaptionAlignment(aligned, minConfidence = .38) {
  if (!aligned || Number(aligned.matched||0) < 2 || Number(aligned.confidence||0) < minConfidence) return false;
  const matched=Number(aligned.matched||0), unique=Number(aligned.uniqueMatched ?? matched), spread=Number(aligned.anchorSpread ?? 1);
  if (matched >= 4) return unique >= 2 || Number(aligned.confidence||0) >= .72;
  if (matched >= 3) return unique >= 2 && spread >= .22;
  return unique >= 2 && spread >= .35 && Number(aligned.confidence||0) >= Math.max(.60,minConfidence);
}
function lyricsHotReadyEntry(song = {}) {
  const id=String(song?.id||'').trim(); if(!id)return null;
  const row=lyricsHotReadyCache.get(id); if(!row)return null;
  if(Date.now()-Number(row.at||0)>45*60*1000){lyricsHotReadyCache.delete(id);return null;}
  return row.payload && hasLyricsText(row.payload) ? row.payload : null;
}
function rememberLyricsHotReady(song = {}, payload = null, reason = '') {
  const id=String(song?.id||'').trim(); if(!id||!hasLyricsText(payload))return;
  lyricsHotReadyCache.set(id,{at:Date.now(),reason:String(reason||''),payload});
  if(lyricsHotReadyCache.size>96)lyricsHotReadyCache.delete(lyricsHotReadyCache.keys().next().value);
}
function lyricsSupportEntry(song = {}) {
  const id=String(song?.id||'').trim(); if(!id)return null;
  try {
    const row=readJsonCache(lyricsSupportCachePath)?.[id]; if(!row)return null;
    const age=Date.now()-Number(row.checkedAt||0), ttl=row.verified ? 45*24*60*60*1000 : 12*60*60*1000;
    return age <= ttl ? row : null;
  } catch { return null; }
}
function rememberLyricsSupport(song = {}, verified = false, reason = '') {
  const id=String(song?.id||'').trim(); if(!id)return;
  try {
    const map=readJsonCache(lyricsSupportCachePath);
    map[id]={verified:!!verified,reason:String(reason||''),checkedAt:Date.now(),title:String(song.title||''),channel:String(song.channel||'')};
    const rows=Object.entries(map).sort((a,b)=>Number(b[1]?.checkedAt||0)-Number(a[1]?.checkedAt||0)).slice(0,600);
    writeJsonCache(lyricsSupportCachePath,Object.fromEntries(rows));
  } catch {}
}

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
  // Reject obvious cross-script substitutions. V18 omitted CJK/Hangul/Kana here,
  // so an English track could accept a provider's parallel Chinese/Korean/Japanese rows.
  if (base === 'en' && (
    profile.devanagariRatio > .28 || profile.gurmukhiRatio > .28 || profile.arabicRatio > .28 ||
    profile.hangulRatio > .28 || profile.kanaRatio > .28 || profile.hanRatio > .28
  )) return true;
  // For a known non-English source language, reject provider text that reads like an
  // English sentence. Genuine romanized Punjabi/Hindi/Arabic normally contains mostly
  // non-English lexical forms, so it remains eligible for the Romanized toggle.
  if (base && base !== 'en' && profile.latinRatio > .72 && likelyEnglishTranslation(text)) return true;
  return false;
}

function suspiciousUnvalidatedProviderMix(result) {
  if (!result || result.languageValidated) return false;
  if (!/YouLyPlus|LyricsPlus/i.test(String(result.source || ''))) return false;
  const profile = scriptProfile(lyricsTextForLanguageCheck(result));
  const foreign = Math.max(profile.hanRatio || 0, profile.hangulRatio || 0, profile.kanaRatio || 0);
  return profile.latinRatio > .24 && foreign > .20;
}

function hasLyricsText(result) {
  return !!(result && (String(result.syncedLyrics || '').trim() || String(result.lyrics || '').trim()));
}

function localLyricsAiTimingReady() {
  try {
    const modelPath = path.join(app.getPath('userData'), 'models', 'ggml-base-q5_1.bin');
    return fs.existsSync(modelPath) && fs.statSync(modelPath).size > 40 * 1024 * 1024;
  } catch { return false; }
}

function persistAutomaticLyricsResult(song, result) {
  if (!song || !result || (!result.syncedLyrics && !result.lyrics && !result.instrumental)) return;
  try {
    const key = JSON.stringify([song.title, song.channel, song.duration || '', song.url || '', !!song.manual]);
    let cache = {};
    try { cache = JSON.parse(fs.readFileSync(lyricsCachePath, 'utf8')); } catch {}
    cache[key] = { ...result, backgroundCaptionUpgrade:false };
    writeJsonCache(lyricsCachePath, cache);
    const precision=String(result.timingPrecision||'');
    if (result.syncedLyrics && /youtube-(?:exact|aligned|warped)|audio-warped|lyrical-reference|exact-video/i.test(precision)) {
      rememberLyricsSupport(song,true,precision||'verified-timing');
    }
  } catch (error) { console.warn('[lyrics timing cache]', error.message); }
}


function recoverySongIdentity(song = {}) {
  return String(song.id || song.url || `${song.title || ''}|${song.channel || ''}`).trim();
}
function compactRecoveryText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
function recoveryCanonicalMetadata(song = {}, youtubeMeta = null) {
  const guessed = guessArtistTitle(song || {});
  const meta = youtubeMeta?.metadata || {};
  let title = compactRecoveryText(meta.title || guessed.title || song.title || '');
  let artist = compactRecoveryText(meta.artist || guessed.artist || '');
  const rawTitle = compactRecoveryText(song.title || '');
  // Lyrics channels commonly publish "Song (Lyrics) - Artist | Movie | Channel". The
  // legacy Artist-Song parser reverses this shape, so pin the canonical song identity first.
  const lyricalTagged = rawTitle.match(/^(.+?)\s*\(\s*(?:official\s+)?(?:lyrics?|lyrical)(?:\s+video)?\s*\)\s*[-–—]\s*([^|[(]+)(?:[|[(]|$)/i);
  if ((!meta.artist || !meta.title) && lyricalTagged) {
    title = compactRecoveryText(lyricalTagged[1]);
    artist = compactRecoveryText(lyricalTagged[2]);
  }
  // Movie soundtrack uploads often use "Song (From Movie) - Artist". The legacy
  // artist/title guesser interprets the left side as the artist; repair that shape here.
  const soundtrack = rawTitle.match(/^(.+?)\s*\(\s*from\b[^)]*\)\s*[-–—]\s*([^|[(]+)(?:[|[(]|$)/i);
  if ((!meta.artist || !meta.title) && soundtrack) {
    title = compactRecoveryText(soundtrack[1]);
    artist = compactRecoveryText(soundtrack[2]);
  }
  if (!artist && rawTitle.includes(' - ')) {
    const parts = rawTitle.split(/\s+[-–—]\s+/).map(v => compactRecoveryText(v)).filter(Boolean);
    if (parts.length >= 2 && /\b(lyrics?|lyrical)\b/i.test(parts[0])) {
      title = parts[0].replace(/\([^)]*lyrics?[^)]*\)/ig, '').trim();
      artist = parts[1].replace(/\([^)]*$/,'').split('|')[0].trim();
    }
  }
  title = title.replace(/\b(official music video|official video|official audio|lyric video|lyrics video|lyrical video|lyrics?|full song|video song|audio song)\b/gi, ' ').replace(/\s+/g,' ').trim();
  artist = artist.replace(/\b(official|vevo|topic)\b/gi, ' ').replace(/\s+/g,' ').replace(/^[-–—|]+|[-–—|]+$/g,'').trim();
  return { title, artist };
}
function compatibleMapKey(song = {}, canonical = {}) {
  return JSON.stringify([
    compactRecoveryText(canonical.title || song.title || '').toLowerCase(),
    compactRecoveryText(canonical.artist || song.channel || '').toLowerCase()
  ]);
}
function readCompatibleLyricsMap() { return readJsonCache(lyricsCompatibleCachePath); }
function rememberCompatibleLyricsVersion(seed, canonical, candidate) {
  if (!candidate?.id) return;
  try {
    const map = readCompatibleLyricsMap();
    map[compatibleMapKey(seed, canonical)] = {
      candidate: {
        id:String(candidate.id||''), title:String(candidate.title||''), channel:String(candidate.channel||''),
        duration:candidate.duration||'', thumbnail:candidate.thumbnail||'', url:candidate.url||''
      },
      verifiedAt:Date.now()
    };
    // Keep the file bounded; oldest mappings are least useful when YouTube videos disappear.
    const entries = Object.entries(map).sort((a,b)=>(Number(b[1]?.verifiedAt)||0)-(Number(a[1]?.verifiedAt)||0)).slice(0,180);
    writeJsonCache(lyricsCompatibleCachePath, Object.fromEntries(entries));
  } catch (error) { console.warn('[lyrics compatible map]', error?.message || error); }
}
function readCanonicalLyricsForSong(song = {}, canonical = {}) {
  try { return readCanonicalLyricsMatch(readJsonCache(canonicalLyricsCachePath), song, canonical); } catch { return null; }
}
function persistCanonicalLyricsForSong(song = {}, result = {}, canonical = {}) {
  try {
    const entry = makeCanonicalLyricsEntry(song, canonical, result);
    if (!entry) return;
    const map = readJsonCache(canonicalLyricsCachePath);
    map[entry.key] = entry;
    const entries = Object.entries(map).sort((a,b)=>(Number(b[1]?.verifiedAt)||0)-(Number(a[1]?.verifiedAt)||0)).slice(0,260);
    writeJsonCache(canonicalLyricsCachePath, Object.fromEntries(entries));
  } catch (error) { console.warn('[canonical lyrics cache]', error?.message || error); }
}
function knownLyricsReadyIds() {
  const ids = new Set();
  try { for (const row of Object.values(readCompatibleLyricsMap())) if (row?.candidate?.id) ids.add(String(row.candidate.id)); } catch {}
  return ids;
}

function recoveryStatus(event, song, stage, text, extra = {}) {
  try { event.sender.send('lyrics-recovery-status', { songId:song?.id||'', title:song?.title||'', stage, text, ...extra }); } catch {}
}
function syntheticCanonicalSong(song, canonical) {
  const artist = compactRecoveryText(canonical?.artist || '');
  const title = compactRecoveryText(canonical?.title || song?.title || '');
  return {
    ...song,
    title: artist ? `${artist} - ${title}` : title,
    channel: artist || song?.channel || ''
  };
}
async function probeCompatibleLyricsCandidate(candidate, canonical, options = {}) {
  const signal = options.signal;
  if (signal?.aborted) return null;
  let youtube = null;
  try {
    if (candidate?.url && fs.existsSync(YTDLP_PATH)) {
      youtube = await getYouTubeLyrics(candidate, YTDLP_PATH, execFileAsync, fetch, {
        signal, browserAuth:readYouTubeAccess(), tempRoot:path.join(cacheDir,'lyrics-recovery')
      });
    }
  } catch (_) {}
  if (signal?.aborted) return null;
  if (youtube?.syncedLyrics && isUsableSyncedLyrics(youtube)) {
    const payload = withScriptVariants({
      ...youtube,
      timingPrecision:'youtube-exact', timingOffsetSeconds:0,
      compatibleVersionVerified:true, compatibleVerification:'video-captions'
    });
    return { candidate, payload, verification:'video-captions', score:verificationScore(payload,candidate)+120 };
  }
  let provider = null;
  try { provider = await getLyrics(candidate); } catch (_) {}
  if (signal?.aborted) return null;
  if (!isUsableSyncedLyrics(provider) && canonical?.title) {
    try { provider = await getLyrics(syntheticCanonicalSong(candidate, canonical)); } catch (_) {}
  }
  if (signal?.aborted) return null;
  if (!isUsableSyncedLyrics(provider)) return null;
  if (youtube && lyricsLanguageMismatch(provider, youtube)) return null;
  const payload = withScriptVariants({
    ...provider,
    timingPrecision:provider.timingPrecision || 'catalog-synced',
    timingOffsetSeconds:Number(provider.timingOffsetSeconds||0),
    compatibleVersionVerified:true, compatibleVerification:'synced-provider'
  });
  return { candidate, payload, verification:'synced-provider', score:verificationScore(payload,candidate)+55 };
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
  // A user-verified Exact Lyrics result outranks catalogue/provider cache for future plays.
  // Its canonical key intentionally ignores the particular YouTube upload so official video,
  // audio and lyric-video variants can reuse the same locally verified lyrics.
  const exactCache = readJsonCache(exactLyricsCachePath);
  const exactKey = exactCacheKey(song);
  if (song?.exactLyricsEnabled !== false && exactCache[exactKey]) {
    if (lyricsControllers.get(senderId) === controller) lyricsControllers.delete(senderId);
    return { ...exactCache[exactKey], exactCached:true };
  }
  const hotReady = lyricsHotReadyEntry(song);
  if (hotReady) {
    if (lyricsControllers.get(senderId) === controller) lyricsControllers.delete(senderId);
    return { ...hotReady, supportHotCached:true };
  }
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(lyricsCachePath, 'utf8')); } catch {}
  if (cache[key]) {
    const cached = cache[key];
    // V18 could cache YouLyPlus parallel translation rows (for example English + Chinese)
    // before the source language was known. Re-check only those old unvalidated mixed-script
    // entries instead of invalidating every good lyrics cache on the machine.
    if (suspiciousUnvalidatedProviderMix(cached)) {
      delete cache[key]; try { writeJsonCache(lyricsCachePath, cache); } catch {}
    } else {
      const precision = String(cached?.timingPrecision || '');
      const alreadyCalibrated = /youtube-(?:aligned|warped|exact)|audio-warped|lyrical-reference-warped/.test(precision);
      const returned = hasLyricsText(cached) && !alreadyCalibrated && !cached?.exactLyrics
        ? { ...cached, backgroundCaptionUpgrade:true }
        : cached;
      if (lyricsControllers.get(senderId) === controller) lyricsControllers.delete(senderId);
      return returned;
    }
  }

  // Song-level cache: same track across official MV / audio / lyric-video uploads can reuse
  // verified lyric text. Recording-specific timing is deliberately discarded and recalibrated
  // against the currently playing video in the existing background timing upgrade.
  const earlyCanonical = recoveryCanonicalMetadata(song, null);
  const canonicalCached = readCanonicalLyricsForSong(song, earlyCanonical);
  if (canonicalCached) {
    if (lyricsControllers.get(senderId) === controller) lyricsControllers.delete(senderId);
    return canonicalCached;
  }

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

  if (hasLyricsText(result) && (youtube?.metadata?.originalLanguage || youtube?.metadata?.language || youtube?.captionLanguage)) {
    result = { ...result, languageValidated:true };
  }

  // If trustworthy provider lyrics are already available, return them now and let the
  // renderer request exact YouTube timing in the background. If the provider is empty
  // or language-mismatched, fetch full source-language captions before showing text.
  const providerReady = hasLyricsText(result);
  if (canUseVideoInfo && !providerReady) {
    youtube = await getYouTubeLyrics(song, YTDLP_PATH, execFileAsync, fetch, { signal, browserAuth: readYouTubeAccess(), tempRoot: path.join(cacheDir, 'lyrics-captions') });
    if (signal.aborted) return { cancelled:true };
  } else if (providerReady && (canUseVideoInfo || (canAutoTranscribe && localLyricsAiTimingReady()))) {
    // Provider text appears immediately; V9 can calibrate it in the background against
    // source-language captions or, when already installed, the exact local-audio AI timeline.
    result = { ...result, backgroundCaptionUpgrade:true };
  }

  if (youtube?.syncedLyrics) {
    // Exact video captions are the strongest evidence for both language and timing.
    if (result.syncedLyrics && !lyricsLanguageMismatch(result, youtube)) {
      const aligned = alignSyncedLyricsToCaptionsStable(result.syncedLyrics, youtube.syncedLyrics);
      if (stableCaptionAlignment(aligned, .42)) {
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
  if (hasLyricsText(result)) {
    const canonical = recoveryCanonicalMetadata(song, youtube);
    persistCanonicalLyricsForSong(song, result, canonical);
  }
  sendStatus({ stage: 'done', text: '' });
  if (lyricsControllers.get(senderId) === controller) lyricsControllers.delete(senderId);
  return result;
});



ipcMain.handle('find-lyrics-compatible-version', async (event, song = {}, requestOptions = {}) => {
  const senderId = event.sender.id;
  try { lyricsRecoveryControllers.get(senderId)?.abort(); } catch {}
  const controller = new AbortController();
  lyricsRecoveryControllers.set(senderId, controller);
  const signal = controller.signal;
  const finish = value => {
    if (lyricsRecoveryControllers.get(senderId) === controller) lyricsRecoveryControllers.delete(senderId);
    return value;
  };
  try {
    if (!song?.title) return finish({ success:false, error:'Play a song first.' });
    const earlyCanonical = recoveryCanonicalMetadata(song, null);
    const knownCanonicalLyrics = readCanonicalLyricsForSong(song, earlyCanonical);
    if (knownCanonicalLyrics && isUsableSyncedLyrics(knownCanonicalLyrics)) {
      recoveryStatus(event, song, 'repaired', 'Known lyrics found for this song · calibrating to this video…', { progress:100 });
      return finish({ success:true, mode:'current-repair', canonical:earlyCanonical, lyrics:knownCanonicalLyrics, canonicalCache:true });
    }
    recoveryStatus(event, song, 'inspect', 'Checking this video with cleaner song metadata…', { progress:8 });
    let youtubeMeta = null;
    if (song?.url && fs.existsSync(YTDLP_PATH)) {
      try {
        youtubeMeta = await getYouTubeLyrics(song, YTDLP_PATH, execFileAsync, fetch, {
          signal, browserAuth:readYouTubeAccess(), tempRoot:path.join(cacheDir,'lyrics-recovery'), metadataOnly:true
        });
      } catch (_) {}
    }
    if (signal.aborted) return finish({ cancelled:true });
    const canonical = recoveryCanonicalMetadata(song, youtubeMeta);

    // First repair the CURRENT video. A common failure is an uploader-heavy title such as
    // "Song (From Movie) - Artist"; providers are healthy, but the old parser asked for the
    // wrong artist/title pair. Retrying with canonical metadata avoids an unnecessary video switch.
    if (canonical.title) {
      recoveryStatus(event, song, 'repair-current', 'Trying synced lyrics for this exact video…', { progress:18 });
      let repaired = null;
      try { repaired = await getLyrics(syntheticCanonicalSong(song, canonical)); } catch (_) {}
      if (signal.aborted) return finish({ cancelled:true });
      if (isUsableSyncedLyrics(repaired) && !lyricsLanguageMismatch(repaired, youtubeMeta)) {
        repaired = withScriptVariants({
          ...repaired,
          compatibleVersionVerified:true,
          compatibleVerification:'canonical-metadata-repair',
          timingPrecision:repaired.timingPrecision || 'catalog-synced'
        });
        persistAutomaticLyricsResult(song, repaired);
        persistCanonicalLyricsForSong(song, repaired, canonical);
        recoveryStatus(event, song, 'repaired', 'Synced lyrics recovered for this video.', { progress:100 });
        return finish({ success:true, mode:'current-repair', canonical, lyrics:repaired });
      }
    }

    // A previously verified replacement gets the first chance, but it is re-probed so removed
    // videos/provider outages cannot trap the user in another dead entry.
    const mapping = readCompatibleLyricsMap()[compatibleMapKey(song, canonical)];
    const recentMapping = mapping?.candidate && Date.now() - Number(mapping.verifiedAt||0) < 45*24*60*60*1000;
    if (recentMapping) {
      recoveryStatus(event, song, 'known-version', 'Re-checking the last lyrics-ready version…', { progress:28 });
      const cachedProbe = await probeCompatibleLyricsCandidate(mapping.candidate, canonical, { signal });
      if (signal.aborted) return finish({ cancelled:true });
      if (cachedProbe) {
        const candidate = { ...cachedProbe.candidate, lyricsReady:true, lyricsVerified:true, versionKind:lyricalHint(cachedProbe.candidate)?'lyrics':'lyrics-compatible' };
        persistAutomaticLyricsResult(candidate, cachedProbe.payload);
        persistCanonicalLyricsForSong(song, cachedProbe.payload, canonical);
        recoveryStatus(event, song, 'ready', 'Lyrics-ready version found.', { progress:100, candidateId:candidate.id });
        return finish({ success:true, mode:'switch', canonical, candidate, verification:cachedProbe.verification });
      }
    }

    const queries = buildCompatibleQueries(song, canonical);
    if (!queries.length) return finish({ success:false, error:'Song metadata is too incomplete to find another version.' });
    recoveryStatus(event, song, 'search', 'Finding the same song in lyrics-friendly versions…', { progress:36 });
    const settled = await Promise.allSettled(queries.map(q => searchMusic(q, 12)));
    if (signal.aborted) return finish({ cancelled:true });
    const merged = [];
    for (const row of settled) if (row.status === 'fulfilled' && Array.isArray(row.value)) merged.push(...row.value);
    const ranked = rankCompatibleCandidates(song, merged, canonical, 10);
    if (!ranked.length) {
      recoveryStatus(event, song, 'none', 'No safe same-song replacement was found.', { progress:100 });
      return finish({ success:false, error:'No suitable same-song video found right now.', exactLyricsSuggested:true });
    }

    let best = null, checked = 0;
    for (let i=0; i<ranked.length && i<9; i+=3) {
      const batch = ranked.slice(i, i+3);
      recoveryStatus(event, song, 'verify', `Verifying synced lyrics · ${Math.min(i+1,ranked.length)}-${Math.min(i+batch.length,ranked.length)} of ${Math.min(9,ranked.length)}…`, { progress:48 + Math.min(42, i*5) });
      const probes = await Promise.all(batch.map(candidate => probeCompatibleLyricsCandidate(candidate, canonical, { signal }).catch(()=>null)));
      if (signal.aborted) return finish({ cancelled:true });
      checked += batch.length;
      for (let j=0;j<probes.length;j++) {
        const probe=probes[j]; if(!probe)continue;
        probe.score += Number(batch[j]?._compatScore||0);
        if (!best || probe.score > best.score) best=probe;
      }
      // Real timed captions on a high-ranked same-song candidate are strong enough to stop early.
      if (best?.verification === 'video-captions' && best.score >= 285) break;
      if (best && i >= 3 && best.score >= 145) break;
    }
    if (!best) {
      recoveryStatus(event, song, 'none', 'Versions were found, but none had verified synced lyrics.', { progress:100 });
      return finish({ success:false, error:'Same-song videos mile, lekin verified synced lyrics kisi par nahi mili.', exactLyricsSuggested:true, checked });
    }
    const rawCandidate = best.candidate || {};
    const candidate = {
      id:String(rawCandidate.id||''), title:String(rawCandidate.title||''), channel:String(rawCandidate.channel||''),
      duration:rawCandidate.duration||'', thumbnail:rawCandidate.thumbnail||'', url:rawCandidate.url||'',
      lyricsReady:true, lyricsVerified:true, versionKind:lyricalHint(rawCandidate)?'lyrics':'lyrics-compatible', explicitVersion:true
    };
    persistAutomaticLyricsResult(candidate, best.payload);
    persistCanonicalLyricsForSong(song, best.payload, canonical);
    rememberCompatibleLyricsVersion(song, canonical, candidate);
    recoveryStatus(event, song, 'ready', `Verified lyrics version found · ${candidate.title}`, { progress:100, candidateId:candidate.id });
    return finish({ success:true, mode:'switch', canonical, candidate, verification:best.verification, checked });
  } catch (error) {
    if (signal.aborted) return finish({ cancelled:true });
    recoveryStatus(event, song, 'failed', 'Lyrics recovery could not finish.', { progress:100 });
    return finish({ success:false, error:String(error?.message||error), exactLyricsSuggested:true });
  } finally {
    if (lyricsRecoveryControllers.get(senderId) === controller) lyricsRecoveryControllers.delete(senderId);
  }
});

ipcMain.handle('get-lyrics-alternatives', async (_event, song = {}) => {
  try {
    const meta=guessArtistTitle(song); const duration=seconds(song.duration || 0);
    const rows=await getMultiProviderAlternatives(song,meta,duration,fetch);
    return rows.map(row=>withScriptVariants(row));
  } catch (error) { return { error:String(error?.message||error) }; }
});

ipcMain.handle('translate-lyrics', async (_event, payload = {}, targetLanguage = 'en') => {
  try { return await translateLyricsPayload(payload,targetLanguage,fetch); }
  catch (error) { return { ...payload, error:`Translation failed: ${String(error?.message||error)}` }; }
});

ipcMain.handle('prepare-karaoke-track', async (event, song = {}, mode = 'vocal-low') => {
  try {
    const result=await prepareKaraokeTrack(song,mode,{
      ytdlpPath:YTDLP_PATH, cacheRoot:path.join(cacheDir,'karaoke'), execFileAsync, browserAuth:readYouTubeAccess(),
      onStatus:(payload)=>{try{event.sender.send('lyrics-status',{songId:song?.id||'',title:song?.title||'',...payload});}catch{}}
    });
    if(result?.success&&result.filepath)return {...result,fileUrl:pathToFileURL(result.filepath).href};
    return result;
  } catch (error) { return { success:false,error:String(error?.message||error) }; }
});

// Upgrade already-visible provider lyrics against the ACTUAL playing recording.
// First choice is source-language YouTube timing. V9 uses multi-anchor piecewise warping,
// so intros/dialogue breaks/edit differences do not leave the whole LRC shifted. If usable
// captions are missing and the local Whisper model already exists, the same provider text is
// aligned to a local transcript in the background. This never blocks playback.
ipcMain.handle('upgrade-lyrics-captions', async (event, song) => {
  const senderId = event.sender.id;
  try { lyricsUpgradeControllers.get(senderId)?.abort(); } catch {}
  const controller = new AbortController();
  lyricsUpgradeControllers.set(senderId, controller);
  const signal = controller.signal;
  const original = { lyrics:song?.lyrics||'', syncedLyrics:song?.syncedLyrics||'', source:song?.source||'Lyrics' };
  const sendStatus = (payload) => {
    try { event.sender.send('lyrics-status', { songId:song?.id||'', title:song?.title||'', ...payload }); } catch {}
  };
  try {
    sendStatus({ stage:'timing', text:'Precision Sync · calibrating lyrics to this exact recording…' });
    let youtube = null;
    if (song?.url && fs.existsSync(YTDLP_PATH)) {
      youtube = await getYouTubeLyrics(song, YTDLP_PATH, execFileAsync, fetch, {
        signal, browserAuth:readYouTubeAccess(), tempRoot:path.join(cacheDir,'lyrics-captions')
      });
      if (signal.aborted || youtube?.cancelled) return { cancelled:true };
    }

    if (youtube?.syncedLyrics) {
      if (original.syncedLyrics) {
        const aligned = alignSyncedLyricsToCaptionsStable(original.syncedLyrics, youtube.syncedLyrics);
        if (stableCaptionAlignment(aligned, .38)) {
          const enriched = withScriptVariants({ ...original, syncedLyrics:aligned.syncedLyrics,
            source:`${original.source} text · ${youtube.source} precision timing`, timingPrecision:'youtube-warped',
            timingMatchCount:aligned.matched, timingConfidence:aligned.confidence, timingOffsetSeconds:aligned.offset,
            timingAnchors:aligned.timingAnchors||aligned.matched, timingDriftSeconds:aligned.timingDriftSeconds||0,
            timingWarp:aligned.timingWarp||'anchor-offset', detectedLanguage:youtube.captionLanguage||youtube.metadata?.language||'',
            wordTimings:youtube.wordTimings||[], wordTimingSource:youtube.wordTimingSource||'' });
          persistAutomaticLyricsResult(song, enriched);
          return enriched;
        }
      }
      if (original.lyrics) {
        const alignedPlain = alignPlainLyricsToTimedTranscript(original.lyrics, youtube.syncedLyrics);
        if (alignedPlain && alignedPlain.matched >= 2 && alignedPlain.confidence >= .38) {
          const enriched = withScriptVariants({ ...original, syncedLyrics:alignedPlain.syncedLyrics,
            source:`${original.source} text · ${youtube.source} precision timing`, timingPrecision:'youtube-warped',
            timingMatchCount:alignedPlain.matched, timingConfidence:alignedPlain.confidence, timingOffsetSeconds:0,
            detectedLanguage:youtube.captionLanguage||youtube.metadata?.language||'', wordTimings:youtube.wordTimings||[],
            wordTimingSource:youtube.wordTimingSource||'' });
          persistAutomaticLyricsResult(song, enriched);
          return enriched;
        }
      }
      // Only use caption text itself when there is no provider text to preserve.
      if (!hasLyricsText(original)) {
        const enriched = withScriptVariants({ ...youtube, timingPrecision:'youtube-exact', timingOffsetSeconds:0 });
        persistAutomaticLyricsResult(song, enriched);
        return enriched;
      }
    }

    // V17: if the currently playing music video has weak/missing lyric captions, use a
    // separate lyrical-video reference automatically. Its caption timeline is mapped onto the
    // ACTUAL playing audio with multiple audio anchors, so cinematic intros and mid-video
    // dialogue breaks can change the offset without shifting the rest of the song incorrectly.
    // This automatic path deliberately does NOT run OCR; heavy OCR remains the user-invoked
    // Exact Lyrics rescue.
    if (hasLyricsText(original) && song?.url && fs.existsSync(YTDLP_PATH)) {
      sendStatus({ stage:'reference-search', text:'Precision Sync · finding a lyrical reference for this video…' });
      const reference = await buildReferenceLyrics(song, original, {
        ytdlpPath:YTDLP_PATH, tempRoot:path.join(cacheDir,'lyrics-reference'), execFileAsync, fetchImpl:fetch,
        signal, browserAuth:readYouTubeAccess(), onStatus:sendStatus, targetCaptions:youtube?.syncedLyrics || ''
      });
      if (signal.aborted || reference?.cancelled) return { cancelled:true };
      if (reference?.syncedLyrics) {
        const enriched = withScriptVariants(reference);
        persistAutomaticLyricsResult(song, enriched);
        return enriched;
      }
    }

    // Strong fallback: if the user has already installed the local lyrics AI model, listen
    // to the exact stream/file and use its timestamps as timing anchors. Do not auto-download
    // the large model just for background calibration; first-time setup remains explicit/fallback.
    const canListen = !!song?.streamUrl || (!!song?.filepath && fs.existsSync(song.filepath)) || (!!song?.url && fs.existsSync(YTDLP_PATH));
    if (original.syncedLyrics && canListen && localLyricsAiTimingReady()) {
      sendStatus({ stage:'timing', text:'Precision Sync · matching lyrics to the actual playing audio…' });
      const timed = await transcribeSong(song, {
        ytdlpPath:YTDLP_PATH, tempRoot:path.join(cacheDir,'lyrics-ai'), modelDir:path.join(app.getPath('userData'),'models'),
        onStatus:sendStatus, signal, browserAuth:readYouTubeAccess()
      });
      if (signal.aborted || timed?.cancelled) return { cancelled:true };
      if (timed?.syncedLyrics) {
        const aligned = alignSyncedLyricsToCaptionsStable(original.syncedLyrics, timed.syncedLyrics);
        if (stableCaptionAlignment(aligned, .36)) {
          const enriched = withScriptVariants({ ...original, syncedLyrics:aligned.syncedLyrics,
            source:`${original.source} text · actual-audio Precision Sync`, timingPrecision:'audio-warped',
            timingMatchCount:aligned.matched, timingConfidence:aligned.confidence, timingOffsetSeconds:aligned.offset,
            timingAnchors:aligned.timingAnchors||aligned.matched, timingDriftSeconds:aligned.timingDriftSeconds||0,
            timingWarp:aligned.timingWarp||'anchor-offset' });
          persistAutomaticLyricsResult(song, enriched);
          return enriched;
        }
      }
    }
    return { success:false };
  } catch (error) {
    if (signal.aborted) return { cancelled:true };
    console.warn('[lyrics precision sync]', String(error?.message||error).replace(/\s+/g,' ').slice(0,240));
    return { success:false };
  } finally {
    if (lyricsUpgradeControllers.get(senderId) === controller) lyricsUpgradeControllers.delete(senderId);
  }
});

// User-invoked exact lyrics: find a matching lyric video, prefer its real captions,
// otherwise read the words from video frames with local Windows OCR, then audio-align
// that lyric-video timeline to the exact track the user is currently hearing.
ipcMain.handle('get-exact-lyrics', async (event, song, requestOptions = {}) => {
  const senderId = event.sender.id;
  try { exactLyricsControllers.get(senderId)?.abort(); } catch {}
  const controller = new AbortController();
  exactLyricsControllers.set(senderId, controller);
  const signal = controller.signal;
  const sendStatus = (payload) => {
    try { event.sender.send('lyrics-status', { songId:song?.id || '', title:song?.title || '', exact:true, ...payload }); } catch {}
  };
  try {
    if (!song || !song.title) return { error:'Play a song first, then use Exact Lyrics.' };
    if (!fs.existsSync(YTDLP_PATH)) return { error:'Exact Lyrics needs yt-dlp. Run Setup-YtDlp.bat once, then retry.' };
    const key = exactCacheKey(song);
    const cache = readJsonCache(exactLyricsCachePath);
    if (!requestOptions.force && cache[key]) {
      sendStatus({ stage:'exact-ready', text:'Exact Lyrics loaded from verified local cache.', progress:100 });
      return { ...cache[key], exactCached:true };
    }
    const result = await exactLyricsFromVideo(song, {
      ytdlpPath:YTDLP_PATH,
      tempRoot:path.join(cacheDir,'exact-lyrics'),
      signal,
      browserAuth:readYouTubeAccess(),
      execFileAsync,
      fetchImpl:fetch,
      modelDir:path.join(app.getPath('userData'),'models'),
      onStatus:sendStatus
    });
    if (signal.aborted || result?.cancelled) return { cancelled:true };
    if (result?.syncedLyrics || result?.lyrics) {
      cache[key] = result;
      // Keep the exact cache deliberately local to this PC/user profile. Normal playback
      // will prefer it before hitting LRCLIB/captions again.
      writeJsonCache(exactLyricsCachePath, cache);
    }
    return result;
  } catch (error) {
    if (signal.aborted) return { cancelled:true };
    const message = String(error?.message || error).replace(/\s+/g,' ').slice(0,420);
    console.warn('[exact lyrics]', message);
    return { error:`Exact Lyrics failed: ${message}` };
  } finally {
    if (exactLyricsControllers.get(senderId) === controller) exactLyricsControllers.delete(senderId);
  }
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
const { dialog } = require('electron');
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
 if(kind==='lyrics'){try{fs.unlinkSync(lyricsCachePath)}catch{};try{fs.unlinkSync(exactLyricsCachePath)}catch{};return {success:true,message:'Lyrics and Exact Lyrics caches cleared. Retry lyrics.'}};
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
