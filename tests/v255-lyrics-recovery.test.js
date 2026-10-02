'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const recovery=require('../lib/lyrics-compatible-version');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');

test('V21 ranks a clean lyrical upload above wrong variants of the same title',()=>{
  const seed={id:'aaaaaaaaaaa',title:'Sitaare (From "Ikkis") - Arijit Singh',channel:'7clouds Hindi',duration:'4:02'};
  const canonical={title:'Sitaare',artist:'Arijit Singh'};
  const rows=recovery.rankCompatibleCandidates(seed,[
    {id:'bbbbbbbbbbb',title:'Sitaare (Lyrics) - Arijit Singh | Ikkis',channel:'D-Muze India',duration:'4:02'},
    {id:'ccccccccccc',title:'Sitaare Slowed + Reverb',channel:'random',duration:'4:35'},
    {id:'ddddddddddd',title:'Sitaare Live Cover',channel:'cover channel',duration:'4:01'}
  ],canonical,10);
  assert.equal(rows[0].id,'bbbbbbbbbbb');
  assert.equal(rows.length,1,'wrong live/slowed variants should be filtered before probing');
  assert.ok(rows[0]._compatScore>80);
});

test('V21 compatibility queries search lyric, lyric-video, official-lyrics and audio routes',()=>{
  const queries=recovery.buildCompatibleQueries({title:'Sitaare'},{title:'Sitaare',artist:'Arijit Singh'});
  assert.equal(queries.length,4);
  assert.ok(queries.some(x=>/lyrics$/i.test(x)));
  assert.ok(queries.some(x=>/lyric video$/i.test(x)));
  assert.ok(queries.some(x=>/official lyrics$/i.test(x)));
});

test('V21 only calls lyrics verified when a real timed timeline exists',()=>{
  assert.equal(recovery.isUsableSyncedLyrics({lyrics:'one\ntwo\nthree'}),false);
  assert.equal(recovery.isUsableSyncedLyrics({syncedLyrics:'[00:01.00]one\n[00:02.00]two'}),false);
  assert.equal(recovery.isUsableSyncedLyrics({syncedLyrics:'[00:01.00]one\n[00:02.00]two\n[00:03.00]three'}),true);
});

test('V21 wires compatible-version recovery through main, preload and themed renderer UI',()=>{
  const main=read('main.js'),preload=read('preload.js'),ui=read('src/v255-lyrics-recovery.js'),html=read('src/index.html');
  assert.match(main,/find-lyrics-compatible-version/);
  assert.match(main,/canonical-metadata-repair/);
  assert.match(main,/Lyrics-ready version found/);
  assert.match(preload,/findLyricsCompatibleVersion/);
  assert.match(preload,/onLyricsRecoveryStatus/);
  assert.match(ui,/Find a version with lyrics/);
  assert.match(ui,/switchToLyricsVersion/);
  assert.match(html,/v255-lyrics-recovery\.css/);
  assert.match(html,/v255-lyrics-recovery\.js/);
});

test('V21 search badge no longer promises Sync merely because the title says lyrics',()=>{
  const renderer=read('src/renderer.js');
  assert.match(renderer,/lyricsVerified \? '<span class="lyrics-ready-badge"[^>]*>✓ Lyrics Supported/);
  assert.match(renderer,/lyricsReady \? '<span class="lyrics-ready-badge"[^>]*>Lyrics video/);
  assert.doesNotMatch(renderer,/Lyrics video · Sync/);
});

test('V21 keeps the V18/V20 lyrics-reference and Exact Lyrics engines byte-identical',()=>{
  assert.equal(sha('lib/lyrics-reference.js'),'56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4');
  assert.equal(sha('lib/exact-lyrics.js'),'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4');
});
