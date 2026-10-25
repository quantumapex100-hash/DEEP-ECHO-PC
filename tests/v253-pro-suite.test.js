const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {mapTimeWithJumps,semanticTimeAnchors,warpLrc}=require('../lib/lyrics-reference');
const {withScriptVariants}=require('../lib/lyrics');
const {translateLyricsPayload}=require('../lib/lyrics-translate');
const {filterForMode,cacheKey}=require('../lib/karaoke-audio');

test('V18 sudden dialogue gaps are treated as timeline jumps instead of smeared drift',()=>{
  const anchors=[{referenceTime:0,targetTime:10,kind:'audio-candidate'},{referenceTime:60,targetTime:70,kind:'audio-candidate'},{referenceTime:80,targetTime:100,kind:'audio-candidate'},{referenceTime:140,targetTime:160,kind:'audio-candidate'}];
  assert.equal(mapTimeWithJumps(65,anchors),75);
  assert.equal(mapTimeWithJumps(75,anchors),95);
  const out=warpLrc('[01:05.000]before break\n[01:15.000]after break',anchors);
  assert.match(out,/\[01:15\.000\]before break/);
  assert.match(out,/\[01:35\.000\]after break/);
});

test('V18 semantic anchors keep repeated chorus occurrences in monotonic context order',()=>{
  const ref='[00:10.000]hold me now\n[00:20.000]verse alpha\n[01:00.000]hold me now\n[01:10.000]verse omega';
  const target='[00:21.000]hold me now\n[00:31.000]verse alpha\n[01:26.000]hold me now\n[01:36.000]verse omega';
  const anchors=semanticTimeAnchors(ref,target);
  assert.ok(anchors.length>=3);
  assert.ok(anchors.every((a,i)=>i===0||a.targetTime>anchors[i-1].targetTime));
  assert.ok(anchors.some(a=>a.referenceTime>=60&&a.targetTime>=86));
});

test('V18 pronunciation variants include Hangul and Japanese kana',()=>{
  const ko=withScriptVariants({lyrics:'사랑해',syncedLyrics:'[00:01.000]사랑해',source:'test'});
  const ja=withScriptVariants({lyrics:'あいしてる',syncedLyrics:'[00:01.000]あいしてる',source:'test'});
  assert.ok(ko.hasRomanizedVariant); assert.notEqual(ko.romanizedLyrics,'사랑해');
  assert.ok(ja.hasRomanizedVariant); assert.notEqual(ja.romanizedLyrics,'あいしてる');
});

test('V18 on-demand translation preserves each synced line timestamp',async()=>{
  const fakeFetch=async()=>({ok:true,json:async()=>[[['hola\n⟪DEEP_ECHO_LINE⟫\nmundo']]]});
  const out=await translateLyricsPayload({lyrics:'hello\nworld',syncedLyrics:'[00:01.000]hello\n[00:03.500]world',source:'x'},'es',fakeFetch);
  assert.match(out.translatedSyncedLyrics,/^\[00:01\.000\]hola/m);
  assert.match(out.translatedSyncedLyrics,/^\[00:03\.500\]mundo/m);
  assert.equal(out.translationLanguage,'es');
});

test('V18 karaoke modes use local center-channel reduction filters and stable song cache keys',()=>{
  assert.match(filterForMode('vocal-low'),/0\.68\*c0-0\.32\*c1/);
  assert.match(filterForMode('instrumental'),/0\.50\*c0-0\.50\*c1/);
  assert.equal(cacheKey({id:'abcdefghijk'},'vocal-low'),cacheKey({id:'abcdefghijk'},'vocal-low'));
  assert.notEqual(cacheKey({id:'abcdefghijk'},'vocal-low'),cacheKey({id:'abcdefghijk'},'instrumental'));
});

test('V18 pro suite is additively wired through preload, renderer bridge and theme-native assets',()=>{
  const preload=fs.readFileSync('preload.js','utf8'),main=fs.readFileSync('main.js','utf8'),renderer=fs.readFileSync('src/renderer.js','utf8'),index=fs.readFileSync('src/index.html','utf8'),suite=fs.readFileSync('src/v253-pro-suite.js','utf8'),css=fs.readFileSync('src/v253-pro-suite.css','utf8');
  assert.match(preload,/getLyricsAlternatives/);assert.match(preload,/translateLyrics/);assert.match(preload,/prepareKaraokeTrack/);
  assert.match(main,/get-lyrics-alternatives/);assert.match(main,/targetCaptions:youtube\?\.syncedLyrics/);
  assert.match(renderer,/__deepechoV18Bridge/);assert.match(renderer,/applySectionSync/);
  assert.match(index,/v253-pro-suite\.js/);assert.match(index,/v253-pro-suite\.css/);
  assert.match(suite,/Ask DeepEcho/);assert.match(suite,/Source Inspector \+ Sync Lab/);assert.match(suite,/Pronunciation/);assert.match(suite,/Vocals Low/);
  assert.match(css,/var\(--gold-bright\)/);assert.match(css,/body\[data-theme="dragon"\]/);
});
