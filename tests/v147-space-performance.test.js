const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fx=fs.readFileSync('src/effects.js','utf8');
const js=fs.readFileSync('src/renderer.js','utf8');
const css=fs.readFileSync('src/style.css','utf8');
const pkg=require('../package.json');

test('v1.4.8 prewarms and caches Vibrant Space instead of rebuilding its heavy blur each frame',()=>{
  assert.equal(pkg.version,'2.1.0');
  assert.match(fx,/function buildSpaceStaticLayer\(/);
  assert.match(fx,/spaceStaticCanvas/);
  assert.match(fx,/requestIdleCallback\(prewarmSpace/);
  assert.match(fx,/ensureSpaceResources\(w,h\)/);
  assert.match(fx,/ctx\.drawImage\(spaceStaticCanvas/);
});

test('space full-screen background is capped near 30fps while visualizer code remains separate',()=>{
  assert.match(js,/let spaceLastRender = 0/);
  assert.match(js,/theme === 'space' && spaceLastRender && frameNow - spaceLastRender < 32/);
  assert.match(js,/requestAnimationFrame\(tick\)/);
  assert.match(js,/startLyricsVisualizer/);
});

test('space cards no longer create a backdrop-filter compositor layer per song card',()=>{
  assert.match(css,/data-theme="space"\] \.song-card[^\{]*\{backdrop-filter:none/);
  assert.match(css,/body\[data-theme="space"\] \.sidebar,[^\{]+\{backdrop-filter:blur\(12px\)/s);
  assert.doesNotMatch(css,/\.song-card[^\{]*\.playlist-card[^\{]*\.modal-card\{backdrop-filter:blur\(22px\)/);
});
