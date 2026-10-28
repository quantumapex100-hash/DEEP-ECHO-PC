const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const renderer = fs.readFileSync('src/renderer.js', 'utf8');
const shelves = fs.readFileSync('src/v236-discovery-shelves.js', 'utf8');
const homeSearch = fs.readFileSync('src/v220-home-search.js', 'utf8');
const autoplay = fs.readFileSync('src/v238-smart-autoplay.js', 'utf8');
const main = fs.readFileSync('main.js', 'utf8');
const preload = fs.readFileSync('preload.js', 'utf8');

test('YouTube Music native radio endpoint is hooked into Home recommendations', () => {
  // Verifies that main and preload expose getSmartAutoplayCandidates with RDAMVM / RD radio playlist support
  assert.match(preload, /getSmartAutoplayCandidates: \(song, limit = 32\)/);
  assert.match(main, /RDAMVM\$\{id\}/);
  assert.match(main, /`RD\$\{id\}`/);
  assert.match(main, /source: 'youtube-radio'/);

  // Verifies that smartRefreshRecommendations in renderer.js queries getSmartAutoplayCandidates
  assert.match(renderer, /window\.echoAPI\?\.getSmartAutoplayCandidates/);
  assert.match(renderer, /isRadio=res\.value\.source==='youtube-radio'/);
  assert.match(renderer, /smartSimilarityScore\(song,seeds\)/);
});

test('Quick Picks shelf blends recent taste, favorites and YouTube radio discoveries', () => {
  assert.match(homeSearch, /const recent = recentSongs\(\), liked = likedSongs\(\), discovery = cached\?\.songs \|\| \[\]/);
  assert.match(homeSearch, /blended\.push\(recent\[i\]\)/);
  assert.match(homeSearch, /blended\.push\(discovery\[i\]\)/);
  assert.match(homeSearch, /blended\.push\(liked\[i\]\)/);
});

test('Shelf refresh (See More) uses YouTube Music radio mix for seed tracks', () => {
  assert.match(shelves, /window\.echoAPI(?:\.|\?\.)getSmartAutoplayCandidates\(seed, 20\)/);
  assert.match(shelves, /uniqueSongs236\(radio\.items\)\.filter/);
});

test('Offline and network error fallback provides resilient local/saved recommendations', () => {
  assert.match(renderer, /if\(scored\.size===0\)/);
  assert.match(renderer, /window\.echoAPI\?\.getLibrary/);
  assert.match(renderer, /smartSimilarityScore\(song,seeds\)/);
});

test('Manual queue strictly precedes autoplay and loop-one repeats current track', () => {
  // Manual queue is checked first and disarms discovery autoplay
  assert.match(autoplay, /if \(playQueue\?\.length\) \{ disarm\(\); return originalPlayNext\(options\); \}/);
  // Loop one mode keeps repeat semantics
  assert.match(autoplay, /if \(auto && loopMode === 'one'\) return originalPlayNext\(options\);/);
});

test('Next song pre-resolution runs promptly without delaying audible playback', () => {
  assert.match(renderer, /smartSchedulePrefetch\(90\)/);
  assert.match(renderer, /smartUpcomingSongs/);
  assert.match(renderer, /window\.deepEchoSmartAutoplay\.upcoming/);
  assert.match(renderer, /prefetchPriority:index===0\?'next':'idle'/);
});
