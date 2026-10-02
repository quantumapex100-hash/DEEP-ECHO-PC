const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { mapTime, warpLrc, warpWordTimings } = require('../lib/lyrics-reference');
const { rankSearchResultsForLyrics } = require('../lib/lyrics-search-ranking');
const exact = require('../lib/exact-lyrics');

test('V17 piecewise reference map follows intro and mid-video dialogue drift', () => {
  const anchors = [
    { referenceTime:10, targetTime:18 },
    { referenceTime:80, targetTime:88 },
    { referenceTime:120, targetTime:134 },
    { referenceTime:200, targetTime:214 }
  ];
  assert.equal(mapTime(30, anchors), 38);
  assert.equal(mapTime(100, anchors), 111);
  assert.equal(mapTime(160, anchors), 174);
});

test('V17 repeated chorus occurrences remain distinct after lyrical-reference warp', () => {
  const anchors = [
    { referenceTime:0, targetTime:7 },
    { referenceTime:60, targetTime:67 },
    { referenceTime:120, targetTime:132 }
  ];
  const out = warpLrc('[00:10.000]hold me now\n[01:40.000]hold me now\n[01:50.000]stay', anchors);
  assert.match(out, /\[00:17\.000\]hold me now/);
  assert.match(out, /\[01:50\.333\]hold me now/);
  assert.equal((out.match(/hold me now/g) || []).length, 2);
});

test('V17 word timing uses the same nonlinear map as lyric lines', () => {
  const anchors = [{referenceTime:0,targetTime:5},{referenceTime:100,targetTime:110}];
  const out = warpWordTimings([{text:'hello',time:10,end:10.4},{text:'again',time:80,end:80.5}], anchors);
  assert.ok(out[0].time > 15 && out[0].time < 16);
  assert.ok(out[1].time >= 88.9 && out[1].time <= 89.1);
  assert.ok(out.every(x => x.end > x.time));
});

test('V17 search ranking puts relevant lyric video first but keeps original music video selectable', () => {
  const base = [
    {id:'original001',title:'Singer - My Song (Official Music Video)',channel:'Singer'},
    {id:'audio000001',title:'Singer - My Song (Official Audio)',channel:'Singer'}
  ];
  const lyric = [
    {id:'lyrics00001',title:'Singer - My Song (Official Lyrics Video)',channel:'Singer'},
    {id:'wrong000001',title:'Another Song Lyrics',channel:'Other'}
  ];
  const out = rankSearchResultsForLyrics(base, lyric, 'Singer My Song', 10);
  assert.equal(out[0].id, 'lyrics00001');
  assert.ok(out.some(x => x.id === 'original001'));
  assert.equal(out.find(x => x.id === 'lyrics00001').lyricsReady, true);
  assert.ok(out.findIndex(x => x.id === 'wrong000001') > out.findIndex(x => x.id === 'original001'));
});


test('V17 explicit Search version is preserved instead of silently swapping lyrical/original uploads', () => {
  const renderer = fs.readFileSync('src/renderer.js','utf8');
  const tools = fs.readFileSync('src/v150-tools.js','utf8');
  assert.match(renderer, /explicitVersion:true/);
  assert.match(tools, /if \(song\?\.explicitVersion\) return song/);
});

test('V17 automatic reference path is wired before local-AI fallback and reuses lightweight exact helpers', () => {
  const main = fs.readFileSync('main.js','utf8');
  const refPos = main.indexOf('buildReferenceLyrics(song, original');
  const aiPos = main.indexOf("sendStatus({ stage:'timing', text:'Precision Sync · matching lyrics to the actual playing audio…'", refPos);
  assert.ok(refPos > 0 && aiPos > refPos);
  assert.match(main, /automatic path deliberately does NOT run OCR/);
  assert.equal(typeof exact.downloadReference, 'function');
  assert.equal(typeof exact.targetAudioSource, 'function');
  assert.equal(typeof exact.pcmFeatures, 'function');
});
