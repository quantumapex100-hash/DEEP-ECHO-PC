const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root,'src','index.html'),'utf8');
const renderer = fs.readFileSync(path.join(root,'src','renderer.js'),'utf8');
const effects = fs.readFileSync(path.join(root,'src','effects.js'),'utf8');
const css = fs.readFileSync(path.join(root,'src','style.css'),'utf8');
test('RGB and Love RGB themes are selectable and visualizer-aware',()=>{
  assert.match(index,/data-theme-choice="rgb"/); assert.match(index,/data-theme-choice="love"/);
  assert.match(renderer,/mode: 'rgb'/); assert.match(renderer,/mode: 'love'/);
  assert.match(renderer,/allowed = \[[^\]]*'rgb'[^\]]*'love'/s);
  assert.match(css,/body\[data-theme="rgb"\]/); assert.match(css,/body\[data-theme="love"\]/);
});
test('Love RGB defines 25 palettes and click burst to mini hearts',()=>{
  const paletteBlock = effects.match(/const LOVE_HEART_PALETTES = \[(.*?)\n  \];/s)?.[1] || '';
  const pairs = (paletteBlock.match(/\['#[0-9a-fA-F]{6}','#[0-9a-fA-F]{6}'\]/g)||[]).length;
  assert.equal(pairs,25);
  assert.match(effects,/burstLoveHeart/); assert.match(effects,/loveMiniHearts\.push/); assert.match(effects,/document\.body\?\.dataset\?\.theme \|\| ''\) !== 'love'/);
  assert.doesNotMatch(effects,/burstLoveHeart\([^)]*loveMiniHearts/);
});
test('Love hearts are repelled by cursor',()=>{
  assert.match(effects,/const dx=hrt\.x-px,dy=hrt\.y-py/);
  assert.match(effects,/dist<repel/);
});


test('Love RGB uses a denser heart field with gentle cursor repel',()=>{
  assert.match(effects,/const LOVE_HEART_TARGET = 64;/);
  assert.match(effects,/repel=105\+hrt\.size\*\.5/);
  assert.match(effects,/force=\(repel-dist\)\/repel\*\(14\+hrt\.size\*\.22\)/);
  assert.match(effects,/force\*dt\*2\.2/);
});

test('Sidebar brand is text-only without the app logo',()=>{
  assert.match(index,/<div class="brand"><div class="brand-text">DEEP-ECHO<\/div><\/div>/);
  assert.doesNotMatch(index,/<div class="brand">\s*<img[^>]*class="brand-logo"/);
});
