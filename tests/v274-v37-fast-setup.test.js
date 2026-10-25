const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('V37 setup reuses existing/cache/installed yt-dlp before network fallback', () => {
  const s = read('Setup-YtDlp.bat');
  const local = s.indexOf('Existing local yt-dlp ready hai - download skip');
  const cache = s.indexOf('DeepEcho runtime cache');
  const sibling = s.indexOf('neighbor DeepEcho source');
  const installed = s.indexOf('Programs\\DEEP-ECHO\\resources\\app\\bin\\yt-dlp.exe');
  const network = s.indexOf('One-time download required');
  assert.ok(local >= 0 && cache >= 0 && sibling >= 0 && installed >= 0 && network >= 0);
  assert.ok(local < network, 'local reuse must happen before network');
  assert.ok(cache < network, 'cache reuse must happen before network');
  assert.ok(sibling < network, 'neighbor-folder reuse must happen before network');
  assert.ok(installed < network, 'installed app reuse must happen before network');
});

test('V37 skips the 40MB Deno download when Node 22+ is available', () => {
  const s = read('Setup-YtDlp.bat');
  assert.match(s, /NODE_MAJOR_NUM[\s\S]*GEQ 22/);
  assert.match(s, /40MB Deno download SKIP/);
  assert.ok(s.indexOf('40MB Deno download SKIP') < s.indexOf('one-time Deno runtime download required'));
});

test('V37 setup stores reusable runtime in persistent LocalAppData cache', () => {
  const s = read('Setup-YtDlp.bat');
  assert.match(s, /LOCALAPPDATA%\\DEEP-ECHO\\runtime/);
  assert.match(s, /cache_runtime/);
});

test('V37 npm install prefers local npm cache without changing dependency graph', () => {
  const install = read('INSTALL.bat');
  assert.match(install, /npm\.cmd install --prefer-offline --no-audit --no-fund/);
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.version, /^2\.6\.\d+$/);
});
