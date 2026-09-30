const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('src/immersive-lyrics.css','utf8');

test('immersive lyrics stays inside its resized panel without text clipping',()=>{
  assert.match(css,/\.immersive-lyrics-root\s*\{\s*container-type:inline-size/);
  assert.match(css,/overflow-x:hidden/);
  assert.match(css,/overflow-wrap:anywhere/);
  assert.match(css,/word-break:break-word/);
  assert.match(css,/line-height:1\.30/);
  assert.match(css,/\.immersive-lyric-line\.current\s*\{[\s\S]*?transform:none !important/);
});

test('immersive lyrics has narrow-width adaptive rules',()=>{
  assert.match(css,/@container \(max-width: 420px\)/);
  assert.match(css,/@container \(max-width: 350px\)/);
  assert.match(css,/padding-left:13px/);
  assert.match(css,/font-size:clamp\(14px,calc\(19px \* var\(--il-font-scale\)\),28px\)/);
});
