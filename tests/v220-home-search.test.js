const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pkg=require('../package.json');
const html=fs.readFileSync('src/index.html','utf8');
const js=fs.readFileSync('src/v220-home-search.js','utf8');
const css=fs.readFileSync('src/v220-home-search.css','utf8');
const main=fs.readFileSync('main.js','utf8');
const preload=fs.readFileSync('preload.js','utf8');

test('v2.2.x Home 2.0 assets are versioned and loaded',()=>{
  assert.match(pkg.version,/^2\.2\.\d+$/);
  assert.match(html,/v220-home-search\.css/);
  assert.match(html,/v220-home-search\.js/);
  assert.match(js,/HOME 2\.0/);
  assert.match(js,/Quick Picks/);
  assert.match(js,/Your Favorites/);
  assert.match(js,/Available Offline/);
  assert.match(js,/Refresh Home/);
});

test('search discovery includes recommendations, query chips and keyboard autocomplete',()=>{
  assert.match(js,/search220Discovery/);
  assert.match(js,/search220RecommendGrid/);
  assert.match(js,/search220QuickQueries/);
  assert.match(js,/ArrowDown/);
  assert.match(js,/ArrowUp/);
  assert.match(js,/ghostCompletion/);
  assert.match(js,/event\.key === 'Tab'/);
  assert.match(css,/search220-autocomplete/);
});

test('main and preload expose remote YouTube-style query suggestions with safe fallback',()=>{
  assert.match(preload,/searchSuggestions: \(query\) => ipcRenderer\.invoke\('search-suggestions'/);
  assert.match(main,/suggestqueries\.google\.com\/complete\/search\?client=firefox&ds=yt/);
  assert.match(main,/ipcMain\.handle\('search-suggestions'/);
  assert.match(main,/AbortController/);
});

test('Home 2.0 does not replace the existing player, lyrics or download engines',()=>{
  assert.doesNotMatch(js,/ipcRenderer|spawn|yt-dlp/);
  assert.match(js,/buildSongCard/);
  assert.match(js,/smartRecommendationCache/);
  assert.match(js,/window\.echoAPI\?\.getLibrary/);
});
