const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const smart = fs.readFileSync(path.join(root, 'lib/ytdlp-smart.js'), 'utf8');
const setup = fs.readFileSync(path.join(root, 'Setup-YtDlp.bat'), 'utf8');

test('playback no longer prioritizes the broken android_vr client', () => {
  assert.match(main, /clientOrder:\s*\['visionos',\s*'default',\s*'web_embedded',\s*'android_vr'\]/);
  assert.doesNotMatch(main, /clientOrder:\s*\['android',\s*'default'/);
});

test('shared yt-dlp wrapper enables an external JS runtime', () => {
  assert.match(smart, /function runtimeArgs\(executable, args = \[\]\)/);
  assert.match(smart, /deno:\$\{localDeno\}/);
  assert.match(smart, /if \(!attempts\.length\) attempts\.push\(\{ name: 'android'/);
});

test('setup provides a private Deno runtime fallback', () => {
  assert.match(setup, /deno-x86_64-pc-windows-msvc\.zip/i);
  assert.match(setup, /bin\\deno\.exe/i);
  assert.match(setup, /:ensure_js_runtime/);
});

test('failed yt-dlp refresh does not stamp a 24h successful-check timestamp first', () => {
  const updateStart = main.indexOf("async function maybeRefreshYtDlp()");
  const updateEnd = main.indexOf("function ensureLibrary()", updateStart);
  const body = main.slice(updateStart, updateEnd);
  const execPos = body.indexOf("['--update-to', 'nightly']");
  const stampPos = body.indexOf("JSON.stringify({ checkedAt: Date.now() })");
  assert.ok(execPos >= 0 && stampPos > execPos, 'success stamp must be written only after update command');
});
