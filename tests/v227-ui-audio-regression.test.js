const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const renderer=fs.readFileSync(path.join(root,'src','renderer.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src','style.css'),'utf8');
const expCss=fs.readFileSync(path.join(root,'src','v170-experience.css'),'utf8');
const suite=fs.readFileSync(path.join(root,'src','v160-suite.js'),'utf8');
const pkg=require('../package.json');

test('v2.2.7 repairs queue and immersive overlays that v1.7.0 accidentally made relative',()=>{
  assert.equal(pkg.version,'2.2.7');
  assert.doesNotMatch(expCss,/\.app,\.queue-panel,\.modal,\.immersive-player,\.command-palette\{position:relative/);
  assert.match(expCss,/\.queue-panel\{position:fixed;z-index:70\}/);
  assert.match(expCss,/\.immersive-player\{position:fixed;z-index:10020\}/);
  assert.match(renderer,/function setQueuePanelOpen\(open\)/);
  assert.match(renderer,/event\.key==='Escape'.*setQueuePanelOpen\(false\)/s);
});

test('Word by Word OFF restores clean whole-line DOM instead of dim karaoke spans',()=>{
  assert.match(renderer,/function smartRestoreLineOnlyLyrics\(root = lyricsBody\)/);
  assert.match(renderer,/Word by Word OFF · clean line-by-line lyrics/);
  assert.match(renderer,/if\(!smartWordByWordEnabled\)\{smartRestoreLineOnlyLyrics\(lyricsBody\)/);
  assert.match(expCss,/body:not\(\.word-by-word-off\) \.lyric-line\[data-word-timing="exact"\] \.karaoke-word:not\(\.lit\)\{opacity:\.72\}/);
  assert.match(css,/body\.word-by-word-off \.lyric-line \.karaoke-word \{ opacity:1!important/);
  assert.match(css,/\.lyrics-view \.lyric-line \{ backdrop-filter: none/);
});

test('visualizer self-heals silent remote PCM by materializing the already-supported compatibility source',()=>{
  assert.match(renderer,/async function requestVisualizerLocalRecovery/);
  assert.match(renderer,/window\.echoAPI\.prepareCompatiblePlayback\(normalizeSong\(currentSong\)\)/);
  assert.match(renderer,/visualizerReconnectAttempts >= 2/);
  assert.match(renderer,/local PCM recovery active/);
  assert.match(renderer,/await resumeAudioAnalyser\(true\);\r?\n\s*startLyricsVisualizer\(\);\r?\n\s*startAudioEnergyTicker\(\);/);
});

test('automatic game mode no longer freezes visualizer merely because the app loses focus',()=>{
  assert.doesNotMatch(suite,/window\.addEventListener\('blur',\(\)=>scheduleAutoGameMode\(true\)\)/);
  assert.match(suite,/visibilitychange.*scheduleAutoGameMode\(document\.hidden\)/);
});
