const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = require(path.join(root, 'package.json'));
const helper = require(path.join(root, 'lib', 'ytdlp-smart.js'));

test('v1.4.10 recognizes YouTube bot checks without exposing mojibake', () => {
  assert.match(pkg.version,/^2\.\d+\.\d+$/);
  assert.equal(helper.isBotChallenge(new Error("Sign in to confirm you’re not a bot")), true);
  assert.equal(helper.isBotChallenge(new Error('normal network timeout')), false);
  assert.equal(helper.cleanErrorMessage(new Error('you∩┐╜re not a bot')).includes('∩┐╜'), false);
});

test('playback has alternate YouTube client fallback and optional browser auth recovery', () => {
  const smart = read('lib/ytdlp-smart.js');
  const main = read('main.js');
  const html = read('src/index.html');
  const preload = read('preload.js');
  assert.match(smart, /player_client=android/);
  assert.match(smart, /web_embedded/);
  assert.match(smart, /--cookies-from-browser/);
  assert.match(main, /needsBrowserAuth/);
  assert.match(html, /id="youtubeBrowserAuthToggle"/);
  assert.match(html, /id="youtubeBrowserSelect"/);
  assert.match(preload, /getYouTubeAccess/);
  assert.match(preload, /setYouTubeAccess/);
});

test('AI lyrics reuses the already-playing stream instead of launching a second yt-dlp download', () => {
  const renderer = read('src/renderer.js');
  const ai = read('lib/auto-transcribe.js');
  const main = read('main.js');
  assert.match(renderer, /streamUrl: song\.streamUrl \|\| ''/);
  assert.match(ai, /song\.streamUrl/);
  assert.match(ai, /playing-stream/);
  assert.match(main, /const canAutoTranscribe = !!song\.streamUrl/);
});

test('lyrics jobs cancel when the user switches songs and bot checks do not spam retries', () => {
  const main = read('main.js');
  const smart = read('lib/ytdlp-smart.js');
  assert.match(main, /lyricsControllers\.get\(senderId\)\?\.abort/);
  assert.match(main, /const controller = new AbortController/);
  assert.match(smart, /anonymousBotBlockedUntil/);
  assert.match(smart, /2 \* 60 \* 1000/);
});

test('setup refreshes yt-dlp nightly instead of silently keeping a stale binary', () => {
  const setup = read('Setup-YtDlp.bat');
  const build = read('Build-Karo.bat');
  assert.match(setup, /yt-dlp-nightly-builds/);
  assert.match(setup, /yt-dlp\.exe\.tmp/);
  assert.match(build, /call (?:\"%~dp0)?Setup-YtDlp\.bat/);
  assert.doesNotMatch(build, /yt-dlp\.exe pehle se hai/);
});
