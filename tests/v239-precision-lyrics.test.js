const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { alignSyncedLyricsToCaptions } = require('../lib/youtube-captions');

const main = fs.readFileSync('main.js','utf8');
const renderer = fs.readFileSync('src/renderer.js','utf8');
const html = fs.readFileSync('src/index.html','utf8');

test('V9 Precision Sync uses multi-anchor piecewise timing instead of one global offset', () => {
  const provider = [
    '[00:00.00]first line',
    '[00:10.00]second line',
    '[00:20.00]third line',
    '[00:30.00]fourth line',
    '[00:40.00]fifth line'
  ].join('\n');
  // The actual video has a 5 second intro and then inserts another 10 second scene.
  const actual = [
    '[00:05.00]first line',
    '[00:15.00]second line',
    '[00:35.00]third line',
    '[00:45.00]fourth line',
    '[00:55.00]fifth line'
  ].join('\n');
  const out = alignSyncedLyricsToCaptions(provider, actual);
  assert.ok(out);
  assert.equal(out.matched, 5);
  assert.equal(out.timingWarp, 'piecewise-anchor-warp');
  assert.ok(out.timingDriftSeconds >= 9.9);
  assert.match(out.syncedLyrics, /\[00:05\.00\]first line/);
  assert.match(out.syncedLyrics, /\[00:35\.00\]third line/);
  assert.match(out.syncedLyrics, /\[00:55\.00\]fifth line/);
});

test('V9 base lyrics engine can calibrate provider text from captions or already-installed local audio AI', () => {
  assert.match(main, /lyrics-cache-v12\.json/);
  assert.match(main, /Precision Sync · matching lyrics to the actual playing audio/);
  assert.match(main, /timingPrecision:'youtube-warped'/);
  assert.match(main, /timingPrecision:'audio-warped'/);
  assert.match(main, /persistAutomaticLyricsResult/);
  assert.match(renderer, /streamUrl:currentSong\?\.streamUrl/);
});

test('Exact Lyrics uses one per-song master switch, auto-starts on ON and resets OFF for every new song', () => {
  assert.match(html, /id="exactLyricsBtn"/);
  assert.match(html, /id="exactLyricsProgress"/);
  assert.doesNotMatch(html, /id="exactLyricsEnabledToggle"/);
  assert.doesNotMatch(html, /id="exactLyricsQuickToggle"/);
  assert.match(html, /Turn Exact Lyrics on for this song/);
  assert.match(renderer, /let exactLyricsEnabled = false/);
  assert.match(renderer, /function resetExactLyricsForSong\(song\)/);
  assert.match(renderer, /resetExactLyricsForSong\(currentSong\)/);
  assert.match(renderer, /Exact Lyrics OFF · base lyrics engine only/);
  assert.match(renderer, /setExactLyricsEnabled\(true, true\);\n  await runExactLyrics\(false\)/);
  assert.match(main, /song\?\.exactLyricsEnabled !== false && exactCache\[exactKey\]/);
});

test('V9 loose lyric matching penalizes wrong remix/live versions and duration drift', () => {
  const { chooseLooseMatch } = require('../lib/lyrics');
  const meta = { title:'My Heart (Acoustic)', artist:'Singer' };
  const rows = [
    { trackName:'My Heart Remix', artistName:'Singer', duration:255, syncedLyrics:'[00:01]wrong' },
    { trackName:'My Heart Acoustic', artistName:'Singer', duration:201, syncedLyrics:'[00:01]right' }
  ];
  assert.equal(chooseLooseMatch(rows, meta, 200), rows[1]);
});

test('version detection uses whole words so normal song titles like Alive are not treated as Live versions', () => {
  const { versionSignature } = require('../lib/lyrics');
  assert.equal(versionSignature('Alive').has('live'), false);
  assert.equal(versionSignature('Alive (Live)').has('live'), true);
});
