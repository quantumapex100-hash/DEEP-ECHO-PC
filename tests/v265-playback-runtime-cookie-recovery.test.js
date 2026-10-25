const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const smart = require('../lib/ytdlp-smart');
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const smartSource = fs.readFileSync(path.join(__dirname, '..', 'lib', 'ytdlp-smart.js'), 'utf8');

test('V30 uses private Deno installed beside yt-dlp instead of forcing system Node', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deepecho-v30-'));
  try {
    const exe = path.join(dir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    const deno = path.join(dir, process.platform === 'win32' ? 'deno.exe' : 'deno');
    fs.writeFileSync(exe, 'x');
    fs.writeFileSync(deno, 'x');
    const args = smart.runtimeArgs(exe, []);
    assert.equal(args[0], '--js-runtimes');
    assert.equal(args[1], `deno:${deno}`);
    assert.ok(args.includes('--remote-components'));
    assert.ok(args.includes('ejs:github'));
    assert.ok(!args.includes('node'));
  } finally { fs.rmSync(dir, { recursive:true, force:true }); }
});

test('V30 playback tries PO-token-free recovery clients before legacy Android', () => {
  assert.match(main, /clientOrder:\s*\['visionos',\s*'default',\s*'web_embedded',\s*'android_vr'\]/);
  assert.match(main, /clientOrder:\s*\['default',\s*'web_embedded',\s*'android_vr',\s*'web_safari'\]/);
  assert.doesNotMatch(main, /clientOrder:\s*\['android',\s*'default'/);
});

test('V30 recognizes Chromium browser cookie failures and rate-limits the broken cookie path', () => {
  assert.equal(smart.isBrowserCookieError({ stderr:'ERROR: Could not copy Chrome cookie database' }), true);
  assert.equal(smart.isBrowserCookieError({ stderr:'ERROR: failed to decrypt with DPAPI' }), true);
  assert.match(smartSource, /browserCookieBlockedUntil = Date\.now\(\) \+ 5 \* 60 \* 1000/);
});

test('V30 keeps modern JS challenge recovery shared without hard-coding Node', () => {
  assert.match(smartSource, /function runtimeArgs\(executable, args = \[\]\)/);
  assert.match(smartSource, /deno:\$\{localDeno\}/);
  assert.match(smartSource, /major >= 22/);
  assert.doesNotMatch(smartSource, /const runtimeArgs = args\.includes\('--js-runtimes'\) \? \[\] : \['--js-runtimes', 'node'\]/);
});
