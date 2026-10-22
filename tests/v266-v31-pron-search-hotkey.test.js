// Accepted 17 October Next improvement: reserve one relevant known candidate and preserve it during radio discovery; lyrics hashes unchanged.
// Accepted 17 October change: explicit playback-only visionOS client; default download/lyrics attempts unchanged.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname,'..');
const read = f => fs.readFileSync(path.join(root,f),'utf8');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');

test('V31 pronunciation is a replacement display mode across lyrics surfaces',()=>{
  const pro=read('src/v253-pro-suite.js'), renderer=read('src/renderer.js'), floating=read('src/floating-lyrics.js'), immersive=read('src/immersive-lyrics.js'), tools=read('src/v150-tools.js');
  assert.match(pro,/setPronunciationDisplay\?\.\(pronunciationActive\)/);
  assert.doesNotMatch(pro,/className='v18-lyric-sub v18-pronunciation'/);
  assert.match(renderer,/function smartSetPronunciationDisplay\(enabled\)/);
  assert.match(renderer,/setPronunciationDisplay:\(enabled\)=>smartSetPronunciationDisplay/);
  assert.match(floating,/const displayMain=roman\|\|main\|\|'♪'/);
  assert.match(floating,/const romanNext=pronunciationEnabled/);
  assert.match(immersive,/const main=roman\|\|line\.text\|\|'♪'/);
  assert.match(tools,/current:romanCurrent \|\| current/);
  assert.match(tools,/next:romanNext \|\| next/);
});

test('V31 search UI has staged progress, offline Downloads escape, and stacking fix',()=>{
  const html=read('src/index.html'), js=read('src/renderer.js'), css=read('src/style.css');
  for(const id of ['searchProgressPanel','searchProgressLabel','searchProgressPercent','searchProgressFill','searchOfflineState','searchGoDownloadsBtn']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(js,/function setSearchProgress\(percent/);
  assert.match(js,/function showSearchOfflineState\(\)/);
  assert.match(js,/navigator\.onLine === false/);
  assert.match(js,/searchGoDownloadsBtn\?\.addEventListener\('click',[\s\S]*activateTab\('library'\)/);
  assert.match(css,/\.topbar\{position:relative;z-index:320/);
  assert.match(css,/\.search-progress-track>i/);
  assert.match(css,/var\(--gold-bright\)/);
});

test('V31 lyric text stays free-form instead of boxed',()=>{
  const css=read('src/style.css'), floating=read('src/floating-lyrics.css'), immersive=read('src/immersive-lyrics.css');
  assert.match(css,/#lyricsView \.lyric-line\.current[\s\S]*background-color:transparent!important/);
  assert.match(css,/\.immersive-lyrics-body \.lyric-line\.current[\s\S]*box-shadow:none!important/);
  assert.match(floating,/\.floating-current,\.floating-main-line,\.floating-language-sub[\s\S]*box-shadow:none!important/);
  assert.match(immersive,/\.immersive-lyric-line,\.immersive-lyric-line\.current,\.immersive-main-line,\.immersive-language-sub[\s\S]*background-color:transparent!important/);
});

test('Ctrl Alt Space has reliable global registration plus focused-window fallback',()=>{
  const main=read('main.js');
  assert.match(main,/CommandOrControl\+Alt\+Space/);
  assert.match(main,/function ensureReliableDefaultShortcut/);
  assert.match(main,/const playPauseChord = input\.type === 'keyDown'[\s\S]*input\.control[\s\S]*input\.alt/);
  assert.match(main,/dispatchGlobalShortcutAction\('playPause'\)/);
  assert.match(main,/did-finish-load[\s\S]*registerReliableDefaultShortcuts/);
});

test('V31 does not modify protected playback, lyrics timing, or Smart Autoplay engines',()=>{
  const expected={
    'lib/ytdlp-smart.js':'f7f046effd80c82a2886b1aa5a20d2b397070b15b1b3667c609672953b3d6051',
    'lib/youtube-captions.js':'dc89d203b626f2dfa5b9a0e147268b21672a3ab53aa2a3e190e2fa26676e3339',
    'lib/lyrics-reference.js':'56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4',
    'lib/exact-lyrics.js':'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4',
    'src/v238-smart-autoplay.js':'e0c485bbd0868c2825c2520325e19f75ba7997ccd11ea3aa8464fef2a3738277'
  };
  for(const [file,hash] of Object.entries(expected)) assert.equal(sha(file),hash,file);
});

