const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const pkg = require('../package.json');
const { normalizeTimeline, findActiveIndex } = require('../lib/lyrics-timeline');
const { collapseCaptionLines } = require('../lib/youtube-captions');

const renderer = fs.readFileSync('src/renderer.js', 'utf8');
const floating = fs.readFileSync('src/floating-lyrics.js', 'utf8');
const index = fs.readFileSync('src/index.html', 'utf8');
const floatingHtml = fs.readFileSync('src/floating-lyrics.html', 'utf8');
const main = fs.readFileSync('main.js', 'utf8');

test('v1.6.10 preserves legitimate short prefix lyrics instead of treating them as growing auto-captions', () => {
  assert.match(pkg.version,/^2\.\d+\.\d+$/);
  const rows = normalizeTimeline([
    { time: 10.0, text: 'when you go' },
    { time: 11.0, text: 'when you go home' },
    { time: 13.0, text: 'next lyric' }
  ]);
  assert.deepEqual(rows.map(x => x.text), ['when you go', 'when you go home', 'next lyric']);
  assert.deepEqual(rows.map(x => x.time), [10, 11, 13]);
});

test('grouped timestamps are spread across the available cue instead of flashing four lines in 165ms', () => {
  const rows = normalizeTimeline([
    { time: 20, text: 'short one' },
    { time: 20, text: 'short two' },
    { time: 20, text: 'short three' },
    { time: 20, text: 'short four' },
    { time: 28, text: 'next cue' }
  ]);
  assert.equal(rows.length, 5);
  assert.equal(rows[0].time, 20);
  assert.ok(rows[1].time - rows[0].time > 1, 'second line should receive real display time');
  assert.ok(rows[2].time - rows[1].time > 1, 'third line should receive real display time');
  assert.ok(rows[3].time < 28, 'group must stay before the next real cue');
  assert.equal(findActiveIndex(rows, 22.1), 1);
});

test('manual subtitles preserve prefix lyric cues while automatic rolling captions may still collapse growth', () => {
  const input = [
    { time: 1, text: 'stay with me' },
    { time: 2, text: 'stay with me now' },
    { time: 4, text: 'another line' }
  ];
  const manual = collapseCaptionLines(input, { rolling: false });
  const automatic = collapseCaptionLines(input, { rolling: true });
  assert.equal(manual.length, 3);
  assert.equal(automatic.length, 2);
});

test('main and floating lyrics use the same timeline helper', () => {
  assert.match(index, /\.\.\/lib\/lyrics-timeline\.js[\s\S]*renderer\.js/);
  assert.match(floatingHtml, /\.\.\/lib\/lyrics-timeline\.js[\s\S]*floating-lyrics\.js/);
  assert.match(renderer, /DeepecchoLyricsTimeline\.normalizeTimeline/);
  assert.match(floating, /DeepecchoLyricsTimeline\.normalizeTimeline/);
});

test('v9 lyric cache invalidates previously stored bad grouped timelines', () => {
  assert.match(main, /lyrics-cache-v9\.json/);
});
