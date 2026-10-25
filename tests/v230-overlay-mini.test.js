const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=(p)=>fs.readFileSync(p,'utf8');
const main=read('main.js'), renderer=read('src/renderer.js'), tools=read('src/v150-tools.js');
const floatingHtml=read('src/floating-lyrics.html'), floatingJs=read('src/floating-lyrics.js'), floatingCss=read('src/floating-lyrics.css');
const miniHtml=read('src/mini.html'), miniJs=read('src/mini.js'), miniCss=read('src/mini.css');

test('floating lyrics gets a responsive animated seek bar without replacing its lyric clock',()=>{
  assert.match(floatingHtml,/id="floatingSeek"/); assert.match(floatingHtml,/id="floatingProgressFill"/);
  assert.match(floatingJs,/estimatedPlaybackTime/); assert.match(floatingJs,/renderFloatingProgress/); assert.match(floatingJs,/floatingLyricsAction\?\.\(`seek:/);
  assert.match(floatingCss,/resize-safe animated seek bar/); assert.match(floatingCss,/flSeekShimmer/); assert.match(floatingCss,/@media\(max-width:700px\)/);
  assert.match(tools,/duration:Number\(audioPlayer\.duration \|\| 0\)/); assert.match(tools,/startsWith\('seek:'\)/);
});

test('mini player has lyrics on-off, clickable seek and bounded responsive layout',()=>{
  assert.match(miniHtml,/id="miniLyricsToggle"/); assert.match(miniHtml,/id="miniLyricCurrent"/); assert.match(miniHtml,/id="miniSeek"/);
  assert.match(miniJs,/deepecho-mini-lyrics-visible/); assert.match(miniJs,/miniAction\(`seek:/); assert.match(miniJs,/setInterval\(renderProgress,80\)/);
  assert.match(miniCss,/bounded responsive Mini Player \+ lyrics/); assert.match(miniCss,/@media\(max-height:170px\)/); assert.match(miniCss,/@media\(max-width:520px\)/);
  assert.match(main,/maxWidth: miniBounds\.maxWidth, maxHeight: miniBounds\.maxHeight/); assert.match(main,/maxWidth: floatingBounds\.maxWidth/);
});

test('mini lyrics mirror the existing lyric clock and seeking is isolated from playback startup code',()=>{
  assert.match(renderer,/const playbackTime=typeof lyricsPlaybackClock/); assert.match(renderer,/nextLyric/); assert.match(renderer,/startsWith\('seek:'\)/);
  for(const protectedName of ['playRemoteSong','playLocal','downloadSong','prepareCompatiblePlayback']) assert.match(renderer,new RegExp(protectedName));
  assert.match(tools,/lyricsPlaybackClock/);
});
