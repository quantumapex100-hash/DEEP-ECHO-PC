const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');

test('manual queue is separate from section context and accepts multiple songs', () => {
  assert.match(source, /function setActiveContext\(/);
  assert.match(source, /playQueue\.push\(item\)/);
  assert.match(source, /playQueue\.unshift\(item\)/);
  assert.match(source, /Sirf wahi songs yahan aayenge jo tum Next ya Queue se add karoge/);
  assert.doesNotMatch(source, /setQueue\(context, contextIndex\)/);
});

test('Downloads, Liked and Playlist provide explicit playback contexts', () => {
  assert.match(source, /makeContext\(currentLibrary, 'downloads', 'Downloads', 'downloads'\)/);
  assert.match(source, /makeContext\(liked, 'liked', 'Liked Songs', 'liked'\)/);
  assert.match(source, /makeContext\(songs, 'playlist', name, `playlist:\$\{name\}`\)/);
});

test('Next and Previous wrap inside the active section', () => {
  assert.match(source, /function wrapContextIndex\(index\)/);
  assert.match(source, /wrapContextIndex\(activeContext\.index \+ 1\)/);
  assert.match(source, /wrapContextIndex\(activeContext\.index - 1\)/);
  assert.match(source, /if \(activeContext\?\.items\?\.length\)[\s\S]*?await playContextAt\(next\)/);
});

test('manual queued songs take priority then section playback resumes', () => {
  const queuePriority = source.indexOf('if (playQueue.length)');
  const contextNext = source.indexOf('if (activeContext?.items?.length)', queuePriority);
  assert.ok(queuePriority >= 0 && contextNext > queuePriority);
  assert.match(source, /const \[song\] = playQueue\.splice\(index, 1\)/);
});

test('shuffle is scoped to active context only', () => {
  assert.match(source, /function shuffleActiveContext\(enable\)/);
  assert.match(source, /activeContext\.items = anchor \? \[queueSong\(anchor\), \.\.\.shuffledCopy\(remaining\)\]/);
  assert.match(source, /shuffleAndPlay\(currentLibrary, 'Downloads'/);
  assert.match(source, /shuffleAndPlay\(getLikedSongs\(\), 'Liked Songs'/);
});

test('10 second back and forward controls are wired to the audio player', () => {
  assert.match(html, /id="back10Btn"/);
  assert.match(html, /id="forward10Btn"/);
  assert.match(source, /audioPlayer\.currentTime - 10/);
  assert.match(source, /audioPlayer\.currentTime \+ 10/);
  assert.match(source, /Back 10 seconds/);
  assert.match(source, /Forward 10 seconds/);
});

test('song end auto-advances through queue/context', () => {
  assert.match(source, /audioPlayer\.addEventListener\('ended',[\s\S]{0,500}playNext\(\{ auto: true \}\)/);
});
