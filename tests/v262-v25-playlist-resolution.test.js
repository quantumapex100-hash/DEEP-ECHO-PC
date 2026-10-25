const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {
  isPlaylistLike,
  extractDescriptionTracklist,
  extractTracklist,
  tracklistComplete,
  choosePlayableCandidate,
  playlistSourceUrl
} = require('../lib/playlist-content');

function sha(path){return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');}

test('V25 identifies playlist/search mix results without treating normal singles as playlists', () => {
  assert.equal(isPlaylistLike({title:'Chill Songs Vol.02 | Cozy Music', duration:'1:01:55'}), true);
  assert.equal(isPlaylistLike({title:'Barsaat Official Music Video', duration:'4:12'}), false);
  assert.equal(isPlaylistLike({title:'My playlist', duration:'8:12'}), true);
  assert.equal(isPlaylistLike({title:'Any title', playlistId:'PL123'}), true);
});

test('V25 extracts a complete timestamped long-mix tracklist instead of inventing search results', () => {
  const desc = [
    '00:00 First Song - Artist A',
    '04:10 Second Song - Artist B',
    '09:05 Third Song - Artist C',
    '15:20 Fourth Song - Artist D',
    '22:40 Fifth Song - Artist E',
    '31:15 Sixth Song - Artist F',
    '40:30 Seventh Song - Artist G',
    '50:05 Eighth Song - Artist H'
  ].join('\n');
  const rows = extractDescriptionTracklist(desc, 3715);
  assert.equal(rows.length, 8);
  assert.equal(tracklistComplete(rows, 3715), true);
  const info = extractTracklist({duration:3715, description:desc, chapters:[]});
  assert.equal(info.complete, true);
  assert.equal(info.source, 'description');
  assert.equal(info.tracks[1].title, 'Second Song - Artist B');
});

test('V25 refuses incomplete long-mix metadata so a one-song fake playlist is not shown', () => {
  const rows = extractDescriptionTracklist('00:00 Only Song\n08:51 Subscribe for more', 3715);
  assert.equal(tracklistComplete(rows, 3715), false);
  const info = extractTracklist({duration:3715, description:'00:00 Only Song', chapters:[]});
  assert.equal(info.complete, false);
});

test('V25 resolves track candidates toward individual songs and away from nested mixes', () => {
  const track = {title:'First Song Artist A'};
  const candidates = [
    {id:'mix00000001', title:'First Song Artist A 1 Hour Playlist Mix', duration:'1:00:00', channel:'Mixes'},
    {id:'song0000001', title:'First Song - Artist A (Official Audio)', duration:'3:42', channel:'Artist A - Topic'}
  ];
  assert.equal(choosePlayableCandidate(track, candidates)?.id, 'song0000001');
});

test('V25 preserves real playlist URLs and wires the real resolver through preload/UI', () => {
  assert.equal(playlistSourceUrl({playlistId:'PLabc'}), 'https://www.youtube.com/playlist?list=PLabc');
  const main = fs.readFileSync('main.js','utf8');
  const preload = fs.readFileSync('preload.js','utf8');
  const resolver = fs.readFileSync('src/v2315-global-playlist-open.js','utf8');
  assert.match(main, /resolve-playlist-content/);
  assert.match(main, /extractTracklist\(info\)/);
  assert.match(main, /chapterFallbackSong/);
  assert.match(preload, /resolvePlaylistContent/);
  assert.match(resolver, /window\.echoAPI\?\.resolvePlaylistContent/);
  assert.match(resolver, /do NOT recreate the old fake theme-search list/);
});

test('V25 hides lyric-capability messages on search playlist cards but checks opened playlist songs', () => {
  const renderer = fs.readFileSync('src/renderer.js','utf8');
  assert.match(renderer, /searchResultIsPlaylistLike/);
  assert.match(renderer, /results\.filter\(song => !searchResultIsPlaylistLike\(song\)\)/);
  assert.match(renderer, /if \(searchResultIsPlaylistLike\(song\)\) \{ song\.lyricsChecking = false; song\.lyricsReady = false; song\.lyricsVerified = false; \}/);
  assert.match(renderer, /verifyOpenedPlaylistLyricsSupport/);
  assert.match(renderer, /Lyrics Not Supported/);
  assert.match(renderer, /isPlaylistDetailContext/);
});

test('V25 chapter fallback remains individually playable while leaving accepted lyrics engines untouched', () => {
  const renderer = fs.readFileSync('src/renderer.js','utf8');
  assert.match(renderer, /song\.chapterFallback && Number\(song\.startTime\) > 0/);
  assert.match(renderer, /chapterBoundaryAdvanceId/);
  assert.match(renderer, /!currentSong\?\.skipLyricsVerification/);
  assert.equal(sha('lib/lyrics-reference.js'),'56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4');
  assert.equal(sha('lib/exact-lyrics.js'),'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4');
});
