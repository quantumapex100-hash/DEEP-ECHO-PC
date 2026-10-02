const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const pkg = require('../package.json');
const { chooseCaptionTrack } = require('../lib/youtube-captions');
const { getLyrics, withScriptVariants, isExplicitInstrumentalSong } = require('../lib/lyrics');
const { segmentsToLyrics } = require('../lib/auto-transcribe');

const main = fs.readFileSync('main.js','utf8');
const preload = fs.readFileSync('preload.js','utf8');
const js = fs.readFileSync('src/renderer.js','utf8');
const html = fs.readFileSync('src/index.html','utf8');

test('v1.4.9 adds smart local AI lyrics fallback without trusting catalogue instrumental flags',()=>{
  assert.match(pkg.version,/^2\.\d+\.\d+$/);
  assert.equal(pkg.dependencies['whisper-cpp-node'],'0.2.12');
  assert.equal(pkg.dependencies['ffmpeg-static'],'5.3.0');
  assert.match(main,/transcribeSong/);
  assert.match(main,/lyrics-cache-v14\.json/);
  assert.match(main,/Never let a catalogue-only instrumental flag suppress a real vocal track/);
  assert.match(preload,/onLyricsStatus/);
});

test('caption selector prefers the video original language over translated Hindi/English alternatives',()=>{
  const info={language:'en',automatic_captions:{
    hi:[{ext:'json3',url:'hi',name:'Hindi'}],
    en:[{ext:'json3',url:'en',name:'English'}]
  }};
  assert.equal(chooseCaptionTrack(info).lang,'en');
  const hindi={language:'hi',automatic_captions:{
    en:[{ext:'json3',url:'en',name:'English'}],
    hi:[{ext:'json3',url:'hi',name:'Hindi'}]
  }};
  assert.equal(chooseCaptionTrack(hindi).lang,'hi');
});

test('source-script lyrics stay default and romanization is only an optional variant',()=>{
  const out=withScriptVariants({lyrics:'मुझे तुम याद हो',source:'test'});
  assert.equal(out.lyrics,'मुझे तुम याद हो');
  assert.ok(out.romanizedLyrics);
  assert.equal(out.hasRomanizedVariant,true);
  assert.equal(out.romanized,undefined);
});

test('LRCLIB instrumental hint is ignored for ordinary vocal-looking titles',async()=>{
  const fake=async url=>{
    if(url.includes('lrclib.net/api/get')) return {ok:true,json:async()=>({artistName:'Singer',trackName:'Track',instrumental:true})};
    if(url.includes('lrclib.net/api/search')) return {ok:true,json:async()=>[]};
    if(url.includes('api.lyrics.ovh')) return {ok:false,status:404};
    return {ok:false,status:404};
  };
  const out=await getLyrics({title:'Singer - Track',channel:'Singer'},fake);
  assert.equal(out.instrumental,undefined);
  assert.match(out.error,/reliable match|connect/i);
  assert.equal(isExplicitInstrumentalSong({title:'Singer - Track'}),false);
  assert.equal(isExplicitInstrumentalSong({title:'Singer - Track (Instrumental)'}),true);
});

test('local AI segments become timed LRC and filter non-vocal markers',()=>{
  const out=segmentsToLyrics([
    ['00:00:01,000','00:00:02,000','[Music]'],
    ['00:00:03,000','00:00:05,000','Hello from the other side'],
    ['00:00:06,500','00:00:08,000','I must have called a thousand times']
  ]);
  assert.ok(out);
  assert.match(out.syncedLyrics,/\[00:03\.00\]Hello from the other side/);
  assert.doesNotMatch(out.lyrics,/Music/i);
});

test('search results include Clear All for recent searches and current results',()=>{
  assert.match(html,/id="clearRecentSearchesBtn"[^>]*>Clear All</);
  assert.match(js,/function smartClearAllSearch\(\)/);
  assert.match(js,/setStored\(STORAGE\.recentSearches, \[\]\)/);
});
