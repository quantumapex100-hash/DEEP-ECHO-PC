const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=(p)=>fs.readFileSync(p,'utf8');
const main=read('main.js'),preload=read('preload.js'),index=read('src/index.html'),tools=read('src/v150-tools.js');
const html=read('src/immersive-lyrics.html'),js=read('src/immersive-lyrics.js'),css=read('src/immersive-lyrics.css');

test('immersive lyrics is a separate right-edge full-height overlay',()=>{
  assert.match(index,/id="floatingImmersiveLyricsToggleBtn"/);
  assert.match(main,/function createImmersiveLyricsWindow/);
  assert.match(main,/x:area\.x \+ area\.width - width, y:area\.y/);
  assert.match(main,/minHeight:area\.height[\s\S]*maxHeight:area\.height/);
  assert.match(main,/immersiveLyricsWindow\.on\('resize',[\s\S]*anchorImmersiveLyricsWindow/);
  assert.match(main,/loadFile\(path\.join\(__dirname, 'src', 'immersive-lyrics\.html'\)\)/);
});

test('immersive lyrics mirrors the existing lyric clock instead of replacing playback timing',()=>{
  assert.match(tools,/if \(!floatingEnabled && !immersiveLyricsEnabled\) return/);
  assert.match(tools,/playbackTime = typeof lyricsPlaybackClock/);
  assert.match(tools,/window\.echoAPI\.syncImmersiveLyrics\?\.\(payload\)/);
  assert.match(tools,/payload\.plainLines/);
  assert.match(js,/estimatedTime\(\)/);
  assert.match(js,/findActive\(timeline,estimatedTime\(\)\)/);
  assert.match(js,/immersiveLyricsAction\?\.\(`seek:/);
});

test('immersive overlay has multi-line lyrics, independent transparency, only-lyrics and theme visualizer controls',()=>{
  assert.match(html,/id="immersiveLyricsLines"/);
  assert.match(html,/id="immersivePanelOpacity"/);
  assert.match(html,/id="immersiveLyricsOpacity"/);
  assert.match(html,/id="immersiveSettingsOnly"/);
  assert.match(html,/id="immersiveLyricsVisualizer"/);
  assert.match(css,/\.immersive-lyrics-root\.only-lyrics/);
  assert.match(css,/body\[data-theme="golden"\]/);
  assert.match(css,/body\[data-theme="rgb"\]/);
  assert.match(js,/deepeccho-immersive-lyrics-v1/);
  assert.match(js,/visualizerEnabled/);
});

test('immersive IPC and click-through are isolated from classic Floating Lyrics',()=>{
  assert.match(preload,/openImmersiveLyrics/);
  assert.match(preload,/syncImmersiveLyrics/);
  assert.match(preload,/toggleImmersiveLyricsClickThrough/);
  assert.match(main,/immersive-lyrics-state-update/);
  assert.match(main,/CommandOrControl\+Alt\+Shift\+X/);
  assert.match(main,/open-floating-lyrics/);
  assert.match(main,/floating-lyrics-state-update/);
});
