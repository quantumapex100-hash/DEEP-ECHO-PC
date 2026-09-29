const { spawn } = require('child_process');
const { downloadFormat } = require('../src/v200-core');
const PREFIX = 'AF_PROGRESS:';
function parseProgress(line) {
  if (!line.trim().startsWith(PREFIX)) return null;
  const [amount, speed = '', eta = ''] = line.trim().slice(PREFIX.length).split('|');
  const value = parseFloat(amount);
  return { percent: Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null, speed: speed.trim(), eta: eta.trim() };
}
function runTransfer(executable, song, outputTemplate, onProgress, spawnImpl = spawn, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(executable, ['-f', downloadFormat(options.quality || song.downloadQuality), '--no-warnings', '--no-playlist', '--newline', '--progress',
      '--progress-template', `download:${PREFIX}%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s`,
      '-o', outputTemplate, '--', song.url], { windowsHide: true });
    let errors = '', stdout = '', stderr = '';
    const abort=()=>child.kill();
    options.signal?.addEventListener('abort',abort,{once:true});
    if(options.signal?.aborted) abort();
    const timer=setTimeout(()=>{child.kill();}, 10*60*1000);
    const cleanup=()=>{clearTimeout(timer);options.signal?.removeEventListener('abort',abort)};
    const line = value => { const progress = parseProgress(value); if (progress) onProgress(progress); };
    child.stdout.on('data', chunk => { stdout += chunk; const lines = stdout.split(/[\r\n]+/); stdout = lines.pop(); lines.forEach(line); });
    child.stderr.on('data', chunk => {
      errors = (errors + chunk).slice(-16000);
      stderr += chunk; const lines = stderr.split(/[\r\n]+/); stderr = lines.pop(); lines.forEach(line);
    });
    child.on('error', e=>{cleanup();reject(e)});
    child.on('close', code => { cleanup(); if(options.signal?.aborted)return reject(new Error('Cancelled'));  line(stdout); line(stderr); code === 0 ? resolve() : reject(new Error(errors.trim() || `yt-dlp exited with code ${code}`)); });
  });
}
module.exports = { parseProgress, runTransfer };
