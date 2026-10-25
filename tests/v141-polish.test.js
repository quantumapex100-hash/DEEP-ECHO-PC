const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const html = fs.readFileSync(path.join(root,'src/index.html'),'utf8');
const css = fs.readFileSync(path.join(root,'src/style.css'),'utf8');
const js = fs.readFileSync(path.join(root,'src/renderer.js'),'utf8');
const miniHtml = fs.readFileSync(path.join(root,'src/mini.html'),'utf8');
const miniJs = fs.readFileSync(path.join(root,'src/mini.js'),'utf8');
const miniCss = fs.readFileSync(path.join(root,'src/mini.css'),'utf8');
const main = fs.readFileSync(path.join(root,'main.js'),'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

test('v1.4.1 package version and theme picker collapse are wired',()=>{
  assert.match(pkg.version,/^2\.\d+\.\d+$/);
  assert.match(html,/id="themeGrid"/); assert.match(html,/id="themeShowMoreBtn"/);
  assert.match(css,/theme-grid:not\(\.show-all-themes\).*nth-child\(n\+5\)/);
  assert.match(js,/function setThemeGridExpanded/); assert.match(js,/setThemeGridExpanded\(false\)/);
});
test('equalizer labels explain bass mids presence and treble and quick controls are linked',()=>{
  for(const label of ['Bass','Low Mid','Mid','Presence','Treble']) assert.match(html,new RegExp(`>${label}<`));
  for(const id of ['bassQuickRange','midQuickRange','trebleQuickRange']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(js,/function smartSyncEqQuickControls/); assert.match(js,/function smartWireQuickEq/);
});
test('lyrics font slider uses real pixel variables instead of unsupported CSS multiplication',()=>{
  assert.doesNotMatch(css,/font-size:\s*calc\(1em\s*\*/);
  assert.match(css,/--lyrics-line-size/); assert.match(css,/--lyrics-plain-line-size/);
  assert.match(js,/function smartApplyLyricsFontSize/); assert.match(js,/26\*value\/100/);
});
test('mini player has ten-second seeking and responds to current theme',()=>{
  assert.match(miniHtml,/id="back10Btn"/); assert.match(miniHtml,/id="forward10Btn"/);
  assert.match(miniJs,/miniAction\('back10'\)/); assert.match(miniJs,/miniAction\('forward10'\)/);
  assert.match(js,/action==='back10'.*back10Btn\.click/); assert.match(js,/action==='forward10'.*forward10Btn\.click/);
  for(const theme of ['golden','light','dark','purple','toxic','blood','silver','transparent','fluids','rgb','love']) assert.match(miniCss,new RegExp(`data-theme="${theme}"`));
  assert.match(main,/miniBounds = \{ width: 580, height: 190/); assert.match(main,/maxWidth: miniBounds\.maxWidth, maxHeight: miniBounds\.maxHeight/);
});
test('immersive player also exposes ten-second seek controls',()=>{
  assert.match(html,/id="immersiveBack10Btn"/); assert.match(html,/id="immersiveForward10Btn"/);
  assert.match(js,/immersiveBack10Btn.*back10Btn\.click/); assert.match(js,/immersiveForward10Btn.*forward10Btn\.click/);
});
