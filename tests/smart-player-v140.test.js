const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root,'src/index.html'),'utf8');
const js = fs.readFileSync(path.join(root,'src/renderer.js'),'utf8');
const css = fs.readFileSync(path.join(root,'src/style.css'),'utf8');
const main = fs.readFileSync(path.join(root,'main.js'),'utf8');
const preload = fs.readFileSync(path.join(root,'preload.js'),'utf8');
const mini = fs.readFileSync(path.join(root,'src/mini.js'),'utf8');
const lyrics = fs.readFileSync(path.join(root,'lib/lyrics.js'),'utf8');

test('smart home has continue, made-for-you and because-you-listened sections',()=>{
  for(const id of ['continueGrid','madeForYouGrid','becauseGrid']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(js,/function smartRefreshRecommendations/); assert.match(js,/function renderContinueListening/);
});
test('song radio and endless radio extension are wired',()=>{
  assert.match(html,/id="playerRadioBtn"/); assert.match(js,/async function startSongRadio/); assert.match(js,/async function smartExtendRadioIfNeeded/);
});
test('now playing has ambient art, swipe and immersive mode',()=>{
  assert.match(html,/id="nowPlayingBackdrop"/); assert.match(html,/id="immersivePlayer"/); assert.match(js,/smartSwipeStart/); assert.match(css,/immersive-player/);
});
test('crossfade control and gapless prepared URLs are wired',()=>{
  assert.match(html,/id="crossfadeRange"/); assert.match(html,/id="gaplessToggle"/); assert.match(js,/smartCrossfadeTick/); assert.match(js,/smartPreparedStreamUrls/); assert.match(main,/prefetch-song/);
});
test('queue supports save, clear-after-current and drag reorder',()=>{
  assert.match(html,/id="saveQueueBtn"/); assert.match(html,/id="clearAfterCurrentBtn"/); assert.match(js,/queue-save/); assert.match(js,/draggable=true/); assert.match(js,/moveQueueItem\(smartDraggedQueueIndex,to\)/);
});
test('lyrics supports karaoke words, click seek, find and font sizing',()=>{
  assert.match(html,/id="lyricsFindInput"/); assert.match(html,/id="lyricsFontSizeRange"/); assert.match(js,/smartPrepareKaraokeWords/); assert.match(js,/karaoke-word/); assert.match(js,/audioPlayer\.currentTime=Math\.max\(0,target/);
});
test('original Hindi lyrics are preserved for Original/Hinglish toggle',()=>{
  assert.match(lyrics,/originalLyrics:/); assert.match(lyrics,/originalSyncedLyrics:/); assert.match(html,/id="lyricsOriginalToggle"/); assert.match(js,/smartRenderLyricsVariant/);
});
test('mini player has Electron IPC and always-on-top support',()=>{
  assert.match(main,/createMiniPlayerWindow/); assert.match(main,/alwaysOnTop/); assert.match(preload,/openMiniPlayer/); assert.match(preload,/onMiniAction/); assert.match(mini,/miniAction\('next'\)/);
});
test('audio panel has EQ, normalization, channel mode and quality selector',()=>{
  for(const id of ['eqPresetSelect','normalizationToggle','channelModeSelect','audioQualitySelect']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(js,/SMART_EQ_PRESETS/); assert.match(main,/qualityKey === 'data'/);
});
test('listening history has Today Yesterday This Week grouping and clear action',()=>{
  assert.match(html,/id="historyView"/); assert.match(js,/return 'Today'/); assert.match(js,/return 'Yesterday'/); assert.match(js,/return 'This Week'/); assert.match(html,/id="clearHistoryBtn"/);
});
test('smart search has Songs Artists Albums Playlists and recent searches',()=>{
  for(const type of ['songs','artists','albums','playlists']) assert.match(html,new RegExp(`data-search-type="${type}"`));
  assert.match(html,/id="recentSearches"/); assert.match(js,/smartRenderSearchCollections/);
});
test('Ctrl+K command palette supports navigation playback themes and dynamic play',()=>{
  assert.match(html,/id="commandPalette"/); assert.match(js,/Command Palette|smartOpenCommandPalette/); assert.match(js,/event\.ctrlKey\|\|event\.metaKey/); assert.match(js,/Play “\$\{term\}”/);
});
test('YouTube stream quality is passed from renderer to main process',()=>{
  assert.match(js,/streamSong\(normalizeSong\(song\), requestId, window\.__dinechoAudioQuality/); assert.match(preload,/streamSong: \(song, requestId, quality\)/); assert.match(main,/resolveStreamUrl\(song, quality(?:, \{ kind:'playback' \})?\)/);
});
