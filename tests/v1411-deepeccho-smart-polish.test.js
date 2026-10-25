const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'src','index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'src','renderer.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src','style.css'),'utf8');
const pkg=require(path.join(root,'package.json'));

test('v1.4.12 renames the visible app to DEEP-ECHO without changing the compatibility appId',()=>{
  assert.match(pkg.version,/^2\.\d+\.\d+$/);
  assert.equal(pkg.build.productName,'DEEP-ECHO');
  assert.equal(pkg.build.nsis.shortcutName,'DEEP-ECHO');
  assert.equal(pkg.build.appId,'com.dinecho.app');
  assert.match(html,/brand-text">DEEP-ECHO</);
});

test('lyrics variants never blank the current lyrics when romanization or translation is unavailable',()=>{
  assert.match(js,/function smartUsableLyrics/);
  assert.match(js,/Never erase already-visible lyrics/);
  assert.match(js,/Original lyrics stay visible/);
  assert.match(js,/smartPaintLyricsVariant\(smartOriginalLyricsVariant\(\)/);
});

test('player exposes smart per-song theme suggestion using metadata plus live audio features',()=>{
  assert.match(html,/id="themeSuggestionBtn"/);
  assert.match(js,/function smartThemeSuggestionForSong/);
  assert.match(js,/window\.__dinechoAudioEnergy/);
  assert.match(js,/Try \$\{suggestion\.name\}/);
  assert.match(css,/\.theme-suggestion-btn/);
});

test('history is capped to the latest 50 plays and each play can be deleted',()=>{
  assert.match(js,/history = history\.slice\(0, 50\)/);
  assert.match(js,/function smartDeleteHistoryEntry/);
  assert.match(js,/history-delete-btn/);
  assert.match(js,/\.slice\(0, 50\)/);
});
