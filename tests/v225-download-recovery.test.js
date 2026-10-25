const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { runTransfer, downloadAttempts } = require('../lib/transfer');

function fakeChild(result) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => queueMicrotask(() => child.emit('close', 1));
  process.nextTick(() => {
    if (result.stderr) child.stderr.emit('data', result.stderr);
    if (result.stdout) child.stdout.emit('data', result.stdout);
    child.emit('close', result.code);
  });
  return child;
}

test('v2.2.5 download retries a YouTube bot-check through an alternate client', async () => {
  const calls = [];
  await runTransfer(
    'yt-dlp',
    { url: 'https://www.youtube.com/watch?v=test', id: 'test' },
    'song.%(ext)s',
    () => {},
    (_exe, args) => {
      calls.push(args);
      return calls.length === 1
        ? fakeChild({ code: 1, stderr: 'ERROR: Sign in to confirm you’re not a bot' })
        : fakeChild({ code: 0 });
    },
    { allowFallbackClients: true }
  );
  assert.equal(calls.length, 2);
  assert.ok(calls[1].includes('youtube:player_client=android'));
});

test('v2.2.5 download can use the existing opt-in browser login fallback', async () => {
  const calls = [];
  await runTransfer(
    'yt-dlp',
    { url: 'https://www.youtube.com/watch?v=test', id: 'test' },
    'song.%(ext)s',
    () => {},
    (_exe, args) => {
      calls.push(args);
      return calls.length === 1
        ? fakeChild({ code: 1, stderr: 'ERROR: Sign in to confirm you are not a bot' })
        : fakeChild({ code: 0 });
    },
    { allowFallbackClients: false, browserAuth: { enabled: true, browser: 'edge' } }
  );
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].slice(0, 2), ['--cookies-from-browser', 'edge']);
});

test('v2.2.5 only touches download recovery wiring and keeps browser auth opt-in', () => {
  const root = path.join(__dirname, '..');
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const transfer = fs.readFileSync(path.join(root, 'lib', 'transfer.js'), 'utf8');
  assert.match(main, /browserAuth:readYouTubeAccess\(\), allowFallbackClients:true/);
  assert.match(transfer, /player_client=android/);
  assert.match(transfer, /player_client=default,web_embedded,-android_vr/);
  const attempts = downloadAttempts({ browserAuth: { enabled: false, browser: 'chrome' } });
  assert.equal(attempts.some(a => a.name.startsWith('browser:')), false);
});
