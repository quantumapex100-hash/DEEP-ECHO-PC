const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/renderer.js','utf8');
test('an old analyser resume cannot record history or finish UI after a newer selection',async()=>{
  let finish;const effects=[];
  const text=()=>({textContent:'',value:0});
  const context={playRequest:1,audioPlayer:{duration:180,src:''},currentSong:null,
    nowTitle:text(),nowChannel:text(),nowThumb:{},seekBar:text(),curTime:text(),durTime:text(),DEFAULT_THUMB:'',
    showPlayLoading:()=>effects.push('loading'),playbackMark(){},configurePlaybackOrigin(){},resetVisualizerSignalState(){},
    resetExactLyricsForSong(){},updateLyricsVisual(){},syncPlayerLikeState(){},syncPlayerDownloadState(){},
    smartReleasePlaybackWarmers(){},waitForPlaybackStart:async()=>{},smartScheduleSecondaryPlayback(){},prefetchNextQueued:async()=>{},
    resumeAudioAnalyser:()=>new Promise(resolve=>finish=resolve),startLyricsVisualizer:()=>effects.push('visualizer'),
    startAudioEnergyTicker:()=>effects.push('ticker'),addRecentlyPlayed:()=>effects.push('history'),
    updatePlayIcon:()=>effects.push('icon'),setTimeout:()=>effects.push('timer'),Number,window:{},
    isUnsupportedPlaybackError:()=>false,hidePlayLoading(){},showToast(){}};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('async function playLocal('),source.indexOf("playPauseBtn.addEventListener('click'")),context);
  const pending=context.playLocal({id:'old',title:'Old',streamUrl:'https://media/old'},1);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof finish,'function');
  context.playRequest=2;context.currentSong={id:'new'};effects.length=0;
  finish();await pending;assert.deepEqual(effects,[]);assert.equal(context.currentSong.id,'new');
});
