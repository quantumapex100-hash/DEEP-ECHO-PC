const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pkg=require('../package.json');
const html=fs.readFileSync('src/index.html','utf8');
const renderer=fs.readFileSync('src/renderer.js','utf8');
const search=fs.readFileSync('src/v220-home-search.js','utf8');
const searchCss=fs.readFileSync('src/v220-home-search.css','utf8');
const settings=fs.readFileSync('src/v200.js','utf8');
const captions=require('../lib/youtube-captions');
const main=fs.readFileSync('main.js','utf8');

test('v2.2.2 is versioned and Settings/What’s New use installed version instead of stale 2.0.0 labels',()=>{assert.match(pkg.version,/^2\.2\.[3-9]$/);assert.match(settings,/id="deHubVersion">…/);assert.match(settings,/id="deCurrentVersion"/);assert.match(settings,/syncInstalledVersion/);assert.match(settings,/deep-echo-seen-app-version/);assert.match(settings,/What’s new · \$\{currentAppVersion\}/);assert.doesNotMatch(settings,/<small>2\.0\.0<\/small>/);});
test('Home/Search autocomplete is compact and Home typing routes into Search',()=>{assert.match(search,/if \(value\.length >= 2 && homeView\.classList\.contains\('active'\)\) activateTab\('search'\)/);assert.match(search,/committedSearchQuery/);assert.match(search,/slice\(0, 4\)/);assert.match(searchCss,/v2\.2\.2 Search layout fix/);assert.match(searchCss,/max-height:220px/);assert.match(searchCss,/button\.search220-suggestion/);});
test('Lyrics has independent Word by Word ON/OFF and safe exact-timing-only highlighting',()=>{assert.match(html,/id="wordByWordToggle"/);assert.match(html,/id="wordByWordState">ON/);assert.match(renderer,/WORD_BY_WORD_KEY/);assert.match(renderer,/smartSetWordByWord/);assert.match(renderer,/line\.dataset\.wordTiming='exact'/);assert.match(renderer,/exact word timing unavailable, line sync active/);assert.match(renderer,/word-current/);});
test('YouTube JSON3 segment offsets produce word timing data',()=>{const parsed=captions.parseJson3Detailed({events:[{tStartMs:1000,dDurationMs:2000,segs:[{utf8:'hello ',tOffsetMs:0},{utf8:'world',tOffsetMs:900}]}]});assert.equal(parsed.rows.length,1);assert.equal(parsed.wordTimings.length,2);assert.equal(parsed.wordTimings[0].text,'hello');assert.ok(parsed.wordTimings[1].time>=1.9);});
test('aligned provider lyrics preserve YouTube exact word timings for renderer matching',()=>{assert.match(main,/wordTimings: Array\.isArray\(youtube\.wordTimings\)/);assert.match(main,/wordTimingSource: youtube\.wordTimingSource/);});
