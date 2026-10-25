const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const install = fs.readFileSync(path.join(root, 'INSTALL.bat'), 'utf8');
const setup = fs.readFileSync(path.join(root, 'Setup-YtDlp.bat'), 'utf8');

test('V38 skips npm when current dependencies are complete', () => {
  assert.match(install, /Current node_modules complete hai - npm install SKIP/i);
  assert.match(install, /electron\\dist\\electron\.exe/i);
  assert.match(install, /electron-updater\\package\.json/i);
  assert.match(install, /ffmpeg-static\\index\.js/i);
});

test('V38 reuses neighboring DeepEcho dependency trees before npm', () => {
  const reuse = install.indexOf('try_reuse_deps');
  const npm = install.indexOf('call npm.cmd install');
  assert.ok(reuse >= 0 && npm > reuse);
  assert.match(install, /mklink \/J/i);
  assert.match(install, /npm install SKIP/i);
});

test('V38 keeps optional Whisper repair capability but does not run it by default', () => {
  assert.match(install, /DEEPECHO_REPAIR_LOCAL_AI/i);
  assert.match(install, /@whisper-cpp-node\/core@0\.2\.0/i);
  assert.match(install, /--include=optional --force/i);
  assert.match(install, /default network repair SKIP/i);
});

test('V37 Node 22 plus Deno download skip remains present', () => {
  assert.match(setup, /GEQ 22/i);
  assert.match(setup, /40MB Deno download SKIP/i);
});
