const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=(p)=>fs.readFileSync(p,'utf8');
const main=read('main.js'),preload=read('preload.js'),index=read('src/index.html'),tools=read('src/v150-tools.js'),overlay=read('src/immersive-lyrics.js');

test('main Settings exposes complete Floating Immersive Lyrics controls',()=>{
  for(const id of ['immersiveLyricsAppSettings','immersiveSettingsOpenBtn','immersiveSettingsPanelOpacity','immersiveSettingsLyricsOpacity','immersiveSettingsFontSize','immersiveSettingsVisualizerToggle','immersiveSettingsOnlyLyricsToggle','immersiveSettingsClickThroughToggle']) assert.match(index,new RegExp(`id="${id}"`));
});

test('immersive preferences are bridged bidirectionally between app and overlay',()=>{
  assert.match(preload,/setImmersiveLyricsPrefs/);
  assert.match(preload,/onImmersiveLyricsPrefs/);
  assert.match(main,/set-immersive-lyrics-prefs/);
  assert.match(main,/immersive-lyrics-prefs-update/);
  assert.match(tools,/publishImmersivePrefs/);
  assert.match(tools,/onImmersiveLyricsPrefs/);
  assert.match(overlay,/publishPrefs/);
  assert.match(overlay,/applyRemotePrefs/);
});

test('saved main Settings are supplied when opening Immersive Lyrics',()=>{
  assert.match(tools,/openImmersiveLyrics\?\.\(\{ alwaysOnTop:true, clickThrough:!!saved\.clickThrough, prefs:/);
  assert.match(main,/options\.prefs/);
  assert.match(main,/notifyImmersiveLyricsPrefs\(\)/);
});
