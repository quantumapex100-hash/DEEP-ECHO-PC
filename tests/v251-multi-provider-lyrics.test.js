const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRichLrc, ttmlToLyrics, getMultiProviderLyrics } = require('../lib/lyrics-providers');

function response(json, ok = true, status = 200) {
  return { ok, status, json: async () => json };
}

test('rich LRC keeps repeated chorus lines and extracts native word timing', () => {
  const input = [
    '[00:10.000]<00:10.000>Hello <00:10.400>world',
    '[00:30.000]<00:30.000>Hello <00:30.400>world'
  ].join('\n');
  const out = parseRichLrc(input);
  assert.match(out.syncedLyrics, /\[00:10\.000\]Hello world/);
  assert.match(out.syncedLyrics, /\[00:30\.000\]Hello world/);
  assert.equal(out.wordTimings.length, 4);
  assert.equal(out.wordTimings[2].time, 30);
});

test('TTML parser preserves line timing and exact span timing', () => {
  const ttml = `<tt><body><div>
    <p begin="00:00:05.000" end="00:00:07.000"><span begin="00:00:05.000" end="00:00:05.500">One</span> <span begin="00:00:05.500" end="00:00:06.200">more</span> <span begin="00:00:06.200" end="00:00:07.000">time</span></p>
  </div></body></tt>`;
  const out = ttmlToLyrics(ttml);
  assert.match(out.syncedLyrics, /\[00:05\.000\]One more time/);
  assert.deepEqual(out.wordTimings.map(x => x.text), ['One','more','time']);
  assert.equal(out.wordTimings[1].time, 5.5);
});

test('multi-provider resolver prefers native word timing over a line-only LRCLIB result', async () => {
  const fakeFetch = async (url) => {
    url = String(url);
    if (url.includes('lyricsplus.prjktla.my.id')) {
      return response({ lyrics:[
        { text:'Hello world', time:1000, syllabus:[
          {text:'Hello', time:1000, duration:400}, {text:'world', time:1400, duration:500}
        ]},
        { text:'Again now', time:3000, syllabus:[
          {text:'Again', time:3000, duration:450}, {text:'now', time:3450, duration:350}
        ]}
      ]});
    }
    if (url.includes('lrclib.net/api/get')) return response({trackName:'Track',artistName:'Singer',duration:200,syncedLyrics:'[00:01.00]Hello world\n[00:03.00]Again now'});
    if (url.includes('lrclib.net/api/search')) return response([]);
    return response({}, false, 404);
  };
  const out = await getMultiProviderLyrics({title:'Singer - Track',channel:'Singer',duration:200}, {title:'Track',artist:'Singer'}, 200, fakeFetch);
  assert.equal(out.source, 'YouLyPlus');
  assert.equal(out.providerQuality, 4);
  assert.equal(out.wordTimings.length, 4);
});

test('multi-provider resolver falls back to strong line-synced LRCLIB when rich providers miss', async () => {
  const fakeFetch = async (url) => {
    url = String(url);
    if (url.includes('lrclib.net/api/get')) return response({trackName:'Track',artistName:'Singer',duration:200,syncedLyrics:'[00:01.00]First\n[00:04.00]Second'});
    if (url.includes('lrclib.net/api/search')) return response([]);
    return response({}, false, 404);
  };
  const out = await getMultiProviderLyrics({title:'Singer - Track',channel:'Singer',duration:200}, {title:'Track',artist:'Singer'}, 200, fakeFetch);
  assert.equal(out.source, 'LRCLIB');
  assert.equal(out.providerQuality, 3);
  assert.match(out.syncedLyrics, /Second/);
});
