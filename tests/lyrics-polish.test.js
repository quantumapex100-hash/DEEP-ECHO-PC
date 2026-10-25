const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { romanizeHindiText, titleCandidates } = require('../lib/lyrics');
const { parseJson3, parseVtt, rowsToLrc, chooseCaptionTrack } = require('../lib/youtube-captions');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');

test('Hindi Devanagari lyrics can be shown as readable Roman/Hinglish text', () => {
  const out = romanizeHindiText('तुम ही हो');
  assert.doesNotMatch(out, /[\u0900-\u097F]/);
  assert.match(out.toLowerCase(), /tum/);
  assert.match(out.toLowerCase(), /ho/);
});

test('Arabic-script lyrics can be romanized into English letters without translation', () => {
  const out = romanizeHindiText('سلام');
  assert.doesNotMatch(out, /[\u0600-\u06FF]/);
  assert.match(out.toLowerCase(), /s|sa/);
});

test('Punjabi Gurmukhi lyrics can be romanized into English letters without translation', () => {
  const out = romanizeHindiText('ਸਤ ਸ੍ਰੀ ਅਕਾਲ');
  assert.doesNotMatch(out, /[\u0A00-\u0A7F]/);
  assert.match(out.toLowerCase(), /sat/);
  assert.match(out.toLowerCase(), /akaal|akal/);
});

test('Bollywood-style YouTube titles generate a clean first title candidate', () => {
  const list = titleCandidates({ title: 'Saiyaara Title Song | Official Lyrical Video | Movie' }, { title: 'Saiyaara Title Song | Movie', artist: '' });
  assert.ok(list.some(v => /Saiyaara/i.test(v)));
});

test('YouTube json3/vtt captions convert to synchronized LRC', () => {
  const jsonRows = parseJson3({ events: [{ tStartMs: 1250, segs: [{ utf8: 'तुम ही हो' }] }] });
  assert.equal(jsonRows.length, 1);
  assert.match(rowsToLrc(jsonRows), /^\[00:01\.25\]/);
  const vttRows = parseVtt('WEBVTT\n\n00:00:02.000 --> 00:00:04.000\nHello world\n');
  assert.equal(vttRows[0].text, 'Hello world');
});

test('caption language selection avoids arbitrary Hindi translation when original language is unknown', () => {
  const track = chooseCaptionTrack({ subtitles: { en: [{ext:'vtt',url:'en'}], hi: [{ext:'json3',url:'hi'}] } });
  assert.equal(track.lang, 'en');
});

test('±10 second buttons and low-latency lyrics sync are wired', () => {
  assert.match(html, /id="back10Btn"/);
  assert.match(html, /id="forward10Btn"/);
  assert.match(renderer, /audioPlayer\.currentTime - 10/);
  assert.match(renderer, /audioPlayer\.currentTime \+ 10/);
  assert.match(renderer, /LYRICS_RENDER_AHEAD_SECONDS = 0\.04/);
  assert.match(renderer, /requestAnimationFrame\(tick\)/);
});

test('transparent theme drives real BrowserWindow opacity and can return to solid', () => {
  assert.match(main, /set-window-opacity/);
  assert.match(main, /win\.setOpacity\(safe\)/);
  assert.match(renderer, /theme === 'transparent' \? safe \/ 100 : 1/);
  assert.match(html, /max="100"/);
});


test('caption selection never substitutes English translation when original Arabic is known', () => {
  const info={language:'ar',automatic_captions:{
    en:[{ext:'json3',url:'en',name:'English (translated)'}],
    ar:[{ext:'json3',url:'ar',name:'Arabic'}]
  }};
  const track=chooseCaptionTrack(info);
  assert.equal(track.lang,'ar');
});

test('caption selection keeps Punjabi source captions instead of translated English', () => {
  const info={language:'pa',automatic_captions:{
    en:[{ext:'json3',url:'en',name:'English (translated)'}],
    pa:[{ext:'json3',url:'pa',name:'Punjabi'}]
  }};
  const track=chooseCaptionTrack(info);
  assert.equal(track.lang,'pa');
});


test('caption selector strongly prefers explicit original track when metadata language is missing', () => {
  const track = chooseCaptionTrack({ automatic_captions: {
    en: [{ext:'json3',url:'english',name:'English'}],
    'pa-orig': [{ext:'json3',url:'punjabi',name:'Punjabi (Original)'}]
  }});
  assert.equal(track.lang,'pa-orig');
});
