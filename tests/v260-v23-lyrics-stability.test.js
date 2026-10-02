const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {alignSyncedLyricsToCaptionsStable}=require('../lib/youtube-captions');

const main=fs.readFileSync('main.js','utf8');
const preload=fs.readFileSync('preload.js','utf8');
const renderer=fs.readFileSync('src/renderer.js','utf8');
const floatingCss=fs.readFileSync('src/floating-lyrics.css','utf8');

test('V23 sequence matcher keeps repeated chorus on the correct occurrence',()=>{
  const provider=[
    '[00:10.00]say you need me','[00:14.00]call this love','[00:18.00]only you know why',
    '[00:42.00]say you need me','[00:46.00]call this love','[00:50.00]we can make it right'
  ].join('\n');
  const captions=[
    '[00:12.00]say you need me','[00:16.00]call this love','[00:20.00]only you know why',
    '[00:35.00]say you need me', // tempting extra repeat that must not steal chorus 2
    '[00:55.00]say you need me','[00:59.00]call this love','[01:03.00]we can make it right'
  ].join('\n');
  const out=alignSyncedLyricsToCaptionsStable(provider,captions);
  assert.ok(out); assert.equal(out.matched,6); assert.ok(out.uniqueMatched>=2);
  assert.match(out.syncedLyrics,/\[00:12\.00\]say you need me/);
  assert.match(out.syncedLyrics,/\[00:55\.00\]say you need me/);
  assert.doesNotMatch(out.syncedLyrics,/\[00:35\.00\]say you need me/);
});

test('V23 unmatched lines stay with stable sections across inserted dialogue gaps',()=>{
  const provider='[00:00.00]alpha start\n[00:08.00]unmatched before\n[00:10.00]beta before\n[00:20.00]gamma after\n[00:22.00]unmatched after\n[00:30.00]omega end';
  const captions='[00:05.00]alpha start\n[00:15.00]beta before\n[00:35.00]gamma after\n[00:45.00]omega end';
  const out=alignSyncedLyricsToCaptionsStable(provider,captions);
  assert.ok(out); assert.match(out.syncedLyrics,/\[00:13\.00\]unmatched before/); assert.match(out.syncedLyrics,/\[00:37\.00\]unmatched after/);
});

test('V23 main uses the stable matcher and invalidates old automatic timing cache',()=>{
  assert.match(main,/alignSyncedLyricsToCaptionsStable/);
  assert.match(main,/stableCaptionAlignment/);
  assert.match(main,/lyrics-cache-v14\.json/);
});

test('V23 Search can verify exact-video lyrics support in the background',()=>{
  assert.match(preload,/verifyLyricsSupport/);
  assert.match(main,/verify-lyrics-support/);
  assert.match(renderer,/verifyRenderedSearchLyricsSupport/);
  assert.match(renderer,/✓ Lyrics Supported/);
});

test('V23 floating active lyric has no rectangular text plate',()=>{
  assert.match(floatingCss,/V23: free-floating lyric stage/);
  assert.match(floatingCss,/\.floating-main-line\{[\s\S]*?background:transparent!important;[\s\S]*?box-shadow:none!important;/);
  assert.match(floatingCss,/\.floating-current::before\{[\s\S]*?radial-gradient\(ellipse at center/);
});
