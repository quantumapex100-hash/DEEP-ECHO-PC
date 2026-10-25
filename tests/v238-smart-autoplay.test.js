const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const helpers = require('../src/v238-smart-autoplay.js');
const html = fs.readFileSync('src/index.html','utf8');
const js = fs.readFileSync('src/v238-smart-autoplay.js','utf8');
const css = fs.readFileSync('src/v238-smart-autoplay.css','utf8');
const main = fs.readFileSync('main.js','utf8');
const preload = fs.readFileSync('preload.js','utf8');

test('Smart Autoplay layer is loaded last and mounts beside the quote/search field in the fixed topbar', () => {
  assert.match(html, /v238-smart-autoplay\.css/);
  assert.match(html, /v238-smart-autoplay\.js/);
  assert.ok(html.indexOf('v238-smart-autoplay.js') > html.indexOf('v236-discovery-shelves.js'));
  assert.match(js, /id="smartAutoplayToggle"/);
  assert.match(js, /Smart Autoplay/);
  assert.match(js, /Next songs match your vibe/);
  assert.match(css, /\.smart-autoplay-home-wrap/);
  assert.match(js, /document\.querySelector\('\.topbar \.search-area'\)/);
  assert.match(js, /searchInput\.insertAdjacentElement\('afterend', wrap\)/);
  assert.match(js, /non-scrolling topbar/);
  assert.match(css, /var\(--gold\)/);
});

test('Home and Search are smart-autoplay contexts while Downloads, Liked and Playlists are preserved', () => {
  for (const type of ['search','artist-search','home-top','home220-quick','new-releases','made-for-you','because','recent']) {
    assert.equal(helpers.isEligibleContextType(type), true, `${type} should be eligible`);
  }
  for (const type of ['downloads','liked','playlist','home-playlist','queue','history','ai-dj','radio']) {
    assert.equal(helpers.isEligibleContextType(type), false, `${type} should preserve its own order`);
  }
  assert.match(js, /Home\/Search discovery only; Downloads, Liked Songs and Playlists keep their own order/);
});

test('duplicate/alternate uploads of the selected search song are recognized as the same song family', () => {
  const seed = { id:'AAAAAAAAAAA', title:'Dooron Dooron (Official Video)' };
  const lyric = { id:'BBBBBBBBBBB', title:'Dooron Dooron Lyrics' };
  const audio = { id:'CCCCCCCCCCC', title:'Dooron Dooron - Official Audio' };
  const other = { id:'DDDDDDDDDDD', title:'Another Romantic Track' };
  assert.equal(helpers.sameSongFamily(seed, lyric), true);
  assert.equal(helpers.sameSongFamily(seed, audio), true);
  assert.equal(helpers.sameSongFamily(seed, other), false);
  assert.match(js, /sameSongFamily\(song, seed\)/);
  assert.match(js, /never blindly jump to another duplicate search result/);
});

test('Smart Autoplay prefers YouTube radio/mix and has resilient search fallback', () => {
  assert.match(preload, /getSmartAutoplayCandidates: \(song, limit = 32\)/);
  assert.match(main, /ipcMain\.handle\('smart-autoplay-candidates'/);
  assert.match(main, /RDAMVM\$\{id\}/);
  assert.match(main, /`RD\$\{id\}`/);
  assert.match(main, /source: 'youtube-radio'/);
  assert.match(main, /similar songs official audio/);
  assert.match(main, /source: 'search-fallback'/);
});

test('taste scoring uses likes, completions, skips, recency and artist diversity', () => {
  assert.match(js, /smartRecommendationProfile/);
  assert.match(js, /smartPreferenceSignals/);
  assert.match(js, /sig\.likes/);
  assert.match(js, /sig\.completes/);
  assert.match(js, /sig\.skips/);
  assert.match(js, /recent\.has\(song\.id\)/);
  assert.match(js, /artistRuns/);
  assert.match(js, /sameArtistChosen >= 2/);
});

test('manual queue and loop-one retain base player priority', () => {
  assert.match(js, /playQueue\?\.length|playQueue\.length/);
  assert.match(js, /Explicit queue wins/);
  assert.match(js, /loopMode === 'one'/);
  assert.match(js, /const originalPlayNext = playNext/);
  assert.match(js, /playNext = async function smartAutoplayNext/);
});
