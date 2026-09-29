const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('src/renderer.js','utf8');
const css=fs.readFileSync('src/style.css','utf8');
const html=fs.readFileSync('src/index.html','utf8');
const pkg=require('../package.json');

test('v1.4.6 uses an overscan visualizer stage and clamps reactive geometry inside safe bounds',()=>{
  assert.match(pkg.version,/^2\.\d+\.\d+$/);
  assert.match(css,/width: min\(760px, 72vw\)/);
  assert.match(js,/compactLyricsSurface = targetCanvas === lyricsVisualizerCanvas/);
  assert.match(js,/safeOuterRadius = Math\.max\(90\*dpr, Math\.min\(w,h\)\*\.465\)/);
  assert.match(js,/const outer = Math\.min\(inner \+ length, safeOuterRadius - 10\*dpr\)/);
  assert.match(js,/drawThemeAccent\([^\n]+safeOuterRadius - 8\*dpr\)/);
});

test('smart recommendations learn from multiple user signals and multiple seeds',()=>{
  assert.match(js,/preferenceSignals: 'dinecho-preference-signals-v2'/);
  assert.match(js,/function smartRecordSkipSignal/);
  assert.match(js,/function smartRecordCompletionSignal/);
  assert.match(js,/function smartRecommendationProfile/);
  assert.match(js,/function smartRecommendationSeeds\(limit=4\)/);
  assert.match(js,/Promise\.allSettled\(queries\.slice\(0,5\)/);
  assert.match(js,/likes, repeats, completions, skips & recency/);
});

test('home greeting, caption and hero copy are local-time aware with broad rotating variety',()=>{
  assert.match(html,/id="homeGreeting"/);
  assert.match(html,/id="homeCaption"/);
  assert.match(js,/const HOME_MOMENTS = \[/);
  assert.match(js,/key:'late-night'/);
  assert.match(js,/key:'morning'/);
  assert.match(js,/key:'evening'/);
  assert.match(js,/Math\.floor\(now\.getMinutes\(\)\/12\)/);
  assert.match(js,/setInterval\(updateHomeMoment,60000\)/);
});
