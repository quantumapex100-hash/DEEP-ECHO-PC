const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'src/style.css'),'utf8');
const js=fs.readFileSync(path.join(root,'src/renderer.js'),'utf8');
const fx=fs.readFileSync(path.join(root,'src/effects.js'),'utf8');
const miniCss=fs.readFileSync(path.join(root,'src/mini.css'),'utf8');
const miniJs=fs.readFileSync(path.join(root,'src/mini.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

test('v1.4.3 adds Vibrant Space as a selectable persisted theme',()=>{
  assert.match(pkg.version,/^2\.\d+\.\d+$/);
  assert.match(html,/data-theme-choice="space"/);assert.match(html,/Vibrant Space/);
  assert.match(js,/allowed = \[[^\]]*'space'/s);
});
test('Vibrant Space has live procedural galaxy background',()=>{
  assert.match(fx,/function drawSpace\(/);assert.match(fx,/spaceStars/);assert.match(fx,/spaceComets/);assert.match(fx,/theme === 'space'\) drawSpace/);
  assert.match(css,/body\[data-theme="space"\]/);assert.match(css,/space-preview/);
});
test('Vibrant Space inherits visualizer lyrics cursor and immersive personality',()=>{
  assert.match(js,/space: \{ mode: 'space'/);assert.match(js,/space: `<svg/);
  assert.match(css,/lyrics-theme-fx\[data-theme="space"\].*lyrics-heading/s);assert.match(css,/immersiveLyricsSpace/);assert.match(css,/cursorSpaceLive/);
  assert.match(css,/data-theme="space"\] \.immersive-player/);assert.match(css,/immersiveSpaceDrift/);
});
test('Vibrant Space has its own mini player and like celebration',()=>{
  assert.match(miniJs,/allowedThemes[^\n]*'space'/);assert.match(miniCss,/body\[data-theme="space"\]/);assert.match(miniCss,/miniSpaceProgress/);
  assert.match(js,/space:\{glyph:'✦',count:20\}/);assert.match(css,/theme-like-burst\[data-theme="space"\]/);assert.match(css,/likeSpaceNova/);
});
test('immersive like button receives dedicated clean centered styling',()=>{
  assert.match(css,/immersive-controls \.immersive-like\{width:52px;height:52px;display:grid;place-items:center/);
  assert.match(css,/immersive-like\.active-like \.ui-icon path\{fill:currentColor/);
});
