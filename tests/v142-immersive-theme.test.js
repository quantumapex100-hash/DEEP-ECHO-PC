const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'src/style.css'),'utf8');
const js=fs.readFileSync(path.join(root,'src/renderer.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

test('v1.4.2 package and immersive smart layout are present',()=>{
  assert.equal(pkg.version,'2.1.0');
  for(const id of ['immersiveShell','immersiveVisualizerCanvas','immersiveLyricsPanel','immersiveLyricsBody','immersiveLyricsToggleBtn']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(css,/immersive-shell\.lyrics-hidden/); assert.match(js,/function smartSetImmersiveLyricsVisible/);
});
test('immersive visualizer reuses current theme audio renderer',()=>{
  assert.match(js,/const targetCanvas = immersiveOpen \? immersiveCanvas : lyricsVisualizerCanvas/);
  assert.match(js,/getVisualizerThemeSpec\(theme\)/);
  assert.match(css,/data-theme="rgb".*immersive-theme-fx/s); assert.match(css,/data-theme="love".*immersive-theme-fx/s);
});
test('immersive player has themed lyrics auto sync and click seeking',()=>{
  assert.match(js,/function smartRebuildImmersiveLyrics/); assert.match(js,/function smartSyncImmersiveLyricsState/); assert.match(js,/function smartUpdateImmersiveKaraoke/);
  assert.match(js,/immersiveLyricsBody\?\.addEventListener\('click'/); assert.match(css,/immersive-lyrics-body \.lyric-line\.current/);
});
test('all themes retain distinct lyric fonts and immersive animations',()=>{
  const animationNames={golden:'Golden',light:'Light',dark:'Dark',purple:'Purple',toxic:'Toxic',blood:'Blood',silver:'Silver',transparent:'Glass',fluids:'Fluid',rgb:'Rgb',love:'Love'};
  for(const theme of Object.keys(animationNames)){
    assert.match(css,new RegExp(`lyrics-theme-fx\\[data-theme="${theme}"\\].*lyrics-heading`,'s'));
    assert.match(css,new RegExp(`immersiveLyrics${animationNames[theme]}`));
  }
});
test('immersive progress is animated interactive and ten-second seek remains',()=>{
  assert.match(html,/id="immersiveProgressTrack"/); assert.match(css,/immersiveProgressFlow/); assert.match(js,/smartSeekImmersiveFromPointer/);
  assert.match(html,/id="immersiveBack10Btn"/); assert.match(html,/id="immersiveForward10Btn"/);
});
test('theme-specific like celebration and immersive like control are wired',()=>{
  assert.match(html,/id="immersiveLikeBtn"/); assert.match(html,/id="likeCelebrationLayer"/); assert.match(js,/function triggerThemeLikeAnimation/);
  for(const theme of ['golden','light','dark','purple','toxic','blood','silver','transparent','fluids','rgb','love']) assert.match(css,new RegExp(`theme-like-burst\\[data-theme="${theme}"\\]`));
  assert.match(js,/if \(!exists\) triggerThemeLikeAnimation\(sourceEl\)/);
});
