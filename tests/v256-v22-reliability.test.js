const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const canonical=require('../lib/lyrics-canonical-cache');

test('V22 canonical song cache reuses lyrics across normal uploads but isolates variants',()=>{
  const song={title:'Sitaare (From Ikkis) - Arijit Singh (Official Video)',channel:'7clouds Hindi',duration:'4:02'};
  const canonicalMeta={title:'Sitaare',artist:'Arijit Singh'};
  const entry=canonical.makeEntry(song,canonicalMeta,{syncedLyrics:'[00:10.00]Bas tumse milne ki der thi\n[00:14.00]Next',source:'Paxsenix',timingPrecision:'youtube-exact',wordTimings:[{x:1}]});
  assert.ok(entry);
  const other={title:'Sitaare (Lyrics) - Arijit Singh',channel:'D-Muze India',duration:'4:02'};
  const hit=canonical.readMatch({[entry.key]:entry},other,canonicalMeta);
  assert.ok(hit?.canonicalLyricsCached);
  assert.equal(hit.timingPrecision,'canonical-reference');
  assert.equal(hit.wordTimings,undefined);
  const live={...other,title:'Sitaare Live - Arijit Singh'};
  assert.equal(canonical.readMatch({[entry.key]:entry},live,canonicalMeta),null);
});

test('V22 main integrates canonical lyrics cache and known lyrics-ready search index',()=>{
  const main=read('main.js');
  assert.match(main,/lyrics-canonical-v1\.json/);
  assert.match(main,/readCanonicalLyricsForSong/);
  assert.match(main,/persistCanonicalLyricsForSong/);
  assert.match(read('lib/lyrics-canonical-cache.js'),/canonicalLyricsCached/);
  assert.match(main,/knownLyricsReadyIds/);
  assert.match(main,/lyricsVerified:true/);
  assert.match(main,/const lyricalTagged = rawTitle\.match/);
  assert.match(main,/Known lyrics found for this song/);
});

test('V22 windowed topbar protects the search input from collapsing',()=>{
  const css=read('src/v256-reliability.css');
  assert.match(css,/@media\(max-width:1220px\)/);
  assert.match(css,/\.search-box>#searchInput\{order:1;flex:1 1 300px;min-width:220px\}/);
  assert.match(css,/smart-autoplay-home-wrap\{order:4/);
  assert.match(read('src/index.html'),/v256-reliability\.css/);
});

test('V22 pronunciation and translation state reaches floating and immersive lyric windows',()=>{
  const pro=read('src/v253-pro-suite.js');
  const tools=read('src/v150-tools.js');
  const floating=read('src/floating-lyrics.js');
  const immersive=read('src/immersive-lyrics.js');
  assert.match(pro,/__deepechoV18GetLanguageOverlayPayload/);
  assert.match(pro,/immersiveLyricsBody/);
  assert.match(pro,/__deepecchoPushFloatingLyrics\?\.\(true\)/);
  assert.match(tools,/pronunciationEnabled/);
  assert.match(tools,/romanizedLines/);
  assert.match(floating,/floating-language-sub pronunciation/);
  assert.match(immersive,/immersive-language-sub pronunciation/);
});

test('V22 lyrics recovery panel reacts immediately after a failure',()=>{
  const js=read('src/v255-lyrics-recovery.js');
  assert.match(js,/Finding a lyrics-ready route/);
  assert.match(js,/\},18\);/);
  assert.match(js,/Finding lyrics for this song and checking compatible versions/);
});
