const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const autoplay=require('../src/v238-smart-autoplay.js');
const {rankVerifiedSearchResults}=require('../lib/lyrics-search-ranking');

const renderer=fs.readFileSync('src/renderer.js','utf8');
const main=fs.readFileSync('main.js','utf8');
const style=fs.readFileSync('src/style.css','utf8');

function sha(path){return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');}

test('V24 Search exposes Checking sync then verified Lyrics Supported and reorders safely',()=>{
  assert.match(renderer,/Checking sync…/);
  assert.match(renderer,/✓ Lyrics Supported/);
  assert.match(renderer,/reorderRenderedSearchByLyricsSupport/);
  assert.match(renderer,/verifiedBoost = song\?\.lyricsVerified \? 30 : 0/);
  assert.match(style,/\.lyrics-ready-badge\.checking/);
  assert.match(style,/v24LyricsCheckPulse/);
  assert.match(main,/rankVerifiedSearchResults/);
});

test('verified lyric support rises among comparable results without overpowering strong relevance',()=>{
  const strong={id:'A',lyricsSearchScore:70,lyricsVerified:false};
  const comparable={id:'B',lyricsSearchScore:50,lyricsVerified:true};
  const weak={id:'C',lyricsSearchScore:10,lyricsVerified:true};
  const ranked=rankVerifiedSearchResults([strong,comparable,weak]);
  assert.deepEqual(ranked.map(x=>x.id),['B','A','C']);
});

test('V24 Smart Autoplay understands vibe affinity, script and preference quality',()=>{
  const seed={title:'Romantic Ishq Love Song',channel:'Artist A'};
  const close={title:'Dil Love Romantic Track',channel:'Artist B'};
  const far={title:'Hard Drill Cypher',channel:'Rapper'};
  assert.ok(autoplay.vibeAffinity(seed,close)>.8);
  assert.equal(autoplay.vibeAffinity(seed,far),0);
  assert.equal(autoplay.scriptFamily({title:'तुम ही हो'}),'devanagari');
  assert.ok(autoplay.preferenceQuality({likes:2,completes:3,skips:0})>0);
  assert.ok(autoplay.preferenceQuality({likes:0,completes:0,skips:4})<0);
});

test('V24 Autoplay and Home recommendations enforce stronger diversity and variant quality',()=>{
  const js=fs.readFileSync('src/v238-smart-autoplay.js','utf8');
  assert.match(js,/vibeAffinity\(seed, song\) \* 3\.1/);
  assert.match(js,/chosen\.length < 8 && sameArtistChosen >= 1/);
  assert.match(js,/state\.candidates\.slice\(0, 2\)/);
  assert.match(renderer,/SMART_DISCOVERY_MOODS/);
  assert.match(renderer,/smartRecommendationCandidatePenalty/);
  assert.match(renderer,/smartDiverseRecommendationList/);
  assert.match(renderer,/slowed\|reverb\|sped up\|nightcore/);
});

test('V24 theme suggestions combine mood, audio and learned per-song choices',()=>{
  assert.match(renderer,/SMART_THEME_LEARNING_KEY='deepeccho-theme-learning-v1'/);
  assert.match(renderer,/smartRememberThemeChoice/);
  assert.match(renderer,/learned\.bySong\?\.\[song\.id\]/);
  assert.match(renderer,/scores\.love\+=2\.2/);
  assert.match(renderer,/scores\.rgb\+=energy\*2\.45/);
  assert.match(renderer,/DeepEcho learned this match/);
});

test('V24 keeps the accepted V23 lyrical-reference and Exact Lyrics engines byte-identical',()=>{
  assert.equal(sha('lib/lyrics-reference.js'),'56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4');
  assert.equal(sha('lib/exact-lyrics.js'),'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4');
});
