const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const exact = require('../lib/exact-lyrics');

const html = fs.readFileSync('src/index.html','utf8');
const renderer = fs.readFileSync('src/renderer.js','utf8');
const preload = fs.readFileSync('preload.js','utf8');
const main = fs.readFileSync('main.js','utf8');
const css = fs.readFileSync('src/style.css','utf8');

test('Exact Lyrics master switch is wired end-to-end, theme-aware and has progress UI', () => {
  assert.match(html, /id="exactLyricsBtn"/);
  assert.match(html, />Exact Lyrics</);
  assert.match(preload, /getExactLyrics: \(song, options = \{\}\) => ipcRenderer\.invoke\('get-exact-lyrics'/);
  assert.match(main, /ipcMain\.handle\('get-exact-lyrics'/);
  assert.match(renderer, /runExactLyrics/);
  assert.match(html, /id="exactLyricsProgress"/);
  assert.match(html, /id="exactLyricsProgressFill"/);
  assert.match(renderer, /setExactLyricsProgress/);
  assert.match(css, /\.exact-lyrics-toggle/);
  assert.match(css, /\.exact-lyrics-progress/);
  assert.match(css, /\.exact-lyrics-switch-ui/);
  assert.match(css, /var\(--gold\)/);
});

test('Exact Lyrics pipeline searches lyric videos, prefers captions, then uses local OCR', () => {
  const lib = fs.readFileSync('lib/exact-lyrics.js','utf8');
  assert.match(lib, /ytsearch10:/);
  assert.match(lib, /getYouTubeLyrics/);
  assert.match(lib, /runWindowsOcr/);
  assert.match(lib, /Windows\.Media\.Ocr\.OcrEngine/);
  assert.match(lib, /extractOcrTimeline/);
  assert.match(lib, /estimateAudioOffset/);
  assert.match(lib, /ffmpeg-static/);
});

test('candidate scoring rewards a lyric-video exact match and rejects wrong versions', () => {
  const song = { title:'Artist - My Song (Official Video)', channel:'Artist', duration:'3:40' };
  const good = exact.candidateScore({title:'Artist - My Song (Lyrics)',channel:'Artist',duration:220},song,{title:'My Song',artist:'Artist'});
  const bad = exact.candidateScore({title:'Somebody - Other Song slowed reverb',channel:'Other',duration:310},song,{title:'My Song',artist:'Artist'});
  assert.ok(good > bad + .45, `good=${good} bad=${bad}`);
});

test('OCR timeline keeps stable lyric text, removes static watermark text and repeats later chorus', () => {
  const samples = [];
  const push = (time, line) => samples.push({time,text:`DEEP ECHO CHANNEL\n${line}`});
  push(0,'Hello from the other side'); push(.5,'Hello from the other side'); push(1,'Hello from the other side');
  push(2,'I must have called a thousand times'); push(2.5,'I must have called a thousand times'); push(3,'I must have called a thousand times');
  push(5,'To tell you I am sorry'); push(5.5,'To tell you I am sorry');
  push(12,'Hello from the other side'); push(12.5,'Hello from the other side');
  push(15,'At least I can say that I tried'); push(15.5,'At least I can say that I tried');
  const result = exact.extractOcrTimeline(samples);
  assert.ok(result);
  assert.doesNotMatch(result.lyrics,/DEEP ECHO CHANNEL/);
  assert.equal((result.lyrics.match(/Hello from the other side/g)||[]).length,2);
  assert.match(result.syncedLyrics,/\[00:00\.00\]Hello from the other side/);
});

test('LRC shifting applies lyric-video-to-playing-track offset once', () => {
  const shifted = exact.shiftLrc('[00:01.00]One\n[00:05.50]Two', 12.5);
  assert.match(shifted,/\[00:13\.50\]One/);
  assert.match(shifted,/\[00:18\.00\]Two/);
});

test('verified Exact Lyrics cache outranks normal provider cache on later plays', () => {
  assert.match(main, /exactLyricsCachePath/);
  assert.match(main, /exactCacheKey\(song\)/);
  assert.match(main, /A user-verified Exact Lyrics result outranks catalogue\/provider cache/);
  assert.match(main, /exactCached:true/);
});

test('local vocal transcript can rescue timing without replacing OCR lyric text', () => {
  const aligned = exact.alignPlainToTranscript(
    'Hello from the other side\nI must have called a thousand times\nTo tell you I am sorry',
    '[00:10.00]hello from the other side\n[00:14.20]I must have called a thousand times\n[00:19.00]to tell you that I am sorry'
  );
  assert.ok(aligned);
  assert.match(aligned.syncedLyrics,/\[00:10\.00\]Hello from the other side/);
  assert.match(aligned.syncedLyrics,/I must have called a thousand times/);
});
