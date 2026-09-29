const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'src','v170-experience.css'),'utf8');
const base=fs.readFileSync(path.join(root,'src','style.css'),'utf8');

test('v1.7.2 experience layer does not demote the live theme cursor',()=>{
  assert.doesNotMatch(css,/\.app,\.queue-panel,\.modal,\.immersive-player,\.command-palette,\.dinecho-live-cursor\s*\{\s*position:relative/);
  assert.match(css,/\.dinecho-live-cursor\s*\{[^}]*position:fixed\s*!important[^}]*z-index:2147483647\s*!important[^}]*pointer-events:none\s*!important[^}]*\}/s);
});

test('base theme cursor still owns the viewport cursor geometry and visibility state',()=>{
  assert.match(base,/\.dinecho-live-cursor\s*\{[^}]*position:\s*fixed[^}]*left:\s*-100px[^}]*top:\s*-100px[^}]*z-index:\s*2147483647/s);
  assert.match(base,/\.dinecho-live-cursor\.visible\s*\{\s*opacity:\s*1;\s*\}/);
  assert.match(base,/html\.dinecho-live-cursor-enabled[^\{]*\{\s*cursor:\s*none\s*!important;/);
});
