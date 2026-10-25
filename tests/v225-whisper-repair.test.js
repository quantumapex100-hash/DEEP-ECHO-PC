const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('v2.2.5 optional local AI import failure is contained and INSTALL can repair it', () => {
  const root = path.join(__dirname, '..');
  const auto = fs.readFileSync(path.join(root, 'lib', 'auto-transcribe.js'), 'utf8');
  const install = fs.readFileSync(path.join(root, 'INSTALL.bat'), 'utf8');
  assert.match(auto, /loadWhisperModule/);
  assert.match(auto, /WHISPER_BINDINGS_MISSING/);
  assert.match(auto, /provider\/caption lyrics remain active/);
  assert.match(install, /import\('whisper-cpp-node'\)/);
  assert.match(install, /--include=optional --force/);
});
