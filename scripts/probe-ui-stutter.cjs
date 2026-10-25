const {app,ipcMain,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..'),label=process.env.DEEPECHO_UI_LABEL||'sample',dir=path.join(root,'.startup-diagnostic','ui-profile-'+Date.now());
for(const name of ['appData','userData','music','temp']){const p=path.join(dir,name);fs.mkdirSync(p,{recursive:true});app.setPath(name,p)}
app.setAppPath(root);
if(process.env.DEEPECHO_UI_BASELINE==='1'){
 const baseline=path.join(root,'.startup-diagnostic','ui-baseline');fs.mkdirSync(baseline,{recursive:true});
 let html=fs.readFileSync(path.join(root,'src/index.html'),'utf8').replace('<head>','<head><base href="'+pathToFileURL(path.join(root,'src')+path.sep).href+'">');
 for(const name of ['renderer.js','style.css','v236-discovery-shelves.js','v170-experience.js']){fs.copyFileSync(path.join(root,'../../backups/before-ui-stutter-20261021',name),path.join(baseline,name));html=html.replace('"'+name+'"','"'+pathToFileURL(path.join(baseline,name)).href+'"')}
 fs.writeFileSync(path.join(baseline,'index.html'),html);
 const load=BrowserWindow.prototype.loadFile;BrowserWindow.prototype.loadFile=function(file,...args){return load.call(this,file===path.join(root,'src/index.html')?path.join(baseline,'index.html'):file,...args)};
}
for(const flag of ['disable-background-timer-throttling','disable-renderer-backgrounding','disable-backgrounding-occluded-windows'])app.commandLine.appendSwitch(flag);
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
// Native PCM fixture: actual decoder/playback, no network or extractor timing mixed into UI cost.
const samples=24000*18,wav=Buffer.alloc(44+samples*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(24000,24);wav.writeUInt32LE(48000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(2000*Math.sin(2*Math.PI*220*i/24000)),44+i*2);const file=path.join(dir,'fixture.wav');fs.writeFileSync(file,wav);
const songs=Array.from({length:48},(_,i)=>({id:'ui-song-'+i,title:'Artist '+i+' - Search result '+i,channel:'Artist '+i,duration:'0:18',url:'https://www.youtube.com/watch?v=ui-song-'+i}));
const handle=ipcMain.handle.bind(ipcMain);ipcMain.handle=(name,fn)=>handle(name,async(...args)=>{
 if(name==='get-home-feed')return {topHits:[],topArtistSongs:[],newReleases:[]};
 if(['search-music','search-artist'].includes(name))return songs.map(s=>({...s}));
 if(['prefetch-song','smart-autoplay-candidates','search-suggestions'].includes(name))return name==='prefetch-song'?{success:false,busy:true}:[];
 if(name==='verify-lyrics-support'){await new Promise(r=>setTimeout(r,30));return {verified:Number(args[1].id.split('-').at(-1))%3===0}}
 if(name==='stream-song')return {success:true,song:{...args[1],fileUrl:pathToFileURL(file).href,filepath:file}};
 if(name==='get-lyrics')return {syncedLyrics:'[00:00]First lyric\n[00:03]Second lyric\n[00:06]Third lyric',source:'Native UI fixture'};
 if(['get-exact-lyrics','upgrade-lyrics-captions','get-lyrics-alternatives'].includes(name))return null;
 return fn(...args);
});
let started=false,pointerTimer;const output=path.join(root,'.startup-diagnostic','ui-stutter-'+label+'.json');
app.on('browser-window-created',(_e,win)=>{win.webContents.setBackgroundThrottling(false);win.webContents.setAudioMuted(true);win.webContents.on('did-finish-load',async()=>{
 if(started||!win.webContents.getURL().endsWith('/index.html'))return;started=true;
 try{
  const wc=win.webContents;await new Promise(r=>setTimeout(r,1800));await wc.executeJavaScript('document.getElementById("deSetupSave")?.click();window.deepEchoSmartAutoplay?.setEnabled(false)');
  wc.debugger.attach('1.3');await wc.debugger.sendCommand('Performance.enable');
  const metrics=async()=>Object.fromEntries((await wc.debugger.sendCommand('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  let step=0;pointerTimer=setInterval(()=>{if(!wc.isDestroyed())wc.sendInputEvent({type:'mouseMove',x:400+(step++%50)*8,y:160+(step%20)*16})},8);
  const results=[];
  for(const phase of ['pointer-idle','search-results','song-start']){
   const before=await metrics();
   const value=await wc.executeJavaScript(`(async()=>{const phase=${JSON.stringify(phase)},frames=[],long=[],begin=performance.now();let last=begin,live=true;const observe=new PerformanceObserver(list=>long.push(...list.getEntries().map(e=>Math.round(e.duration))));observe.observe({type:'longtask',buffered:false});const tick=now=>{if(!live)return;frames.push(now-last);last=now;requestAnimationFrame(tick)};requestAnimationFrame(tick);
    let operation,operationMs=null,firstAudioMs=null;if(phase==='song-start')audioPlayer.addEventListener('playing',()=>firstAudioMs=Math.round(performance.now()-begin),{once:true});if(phase==='search-results'){searchInput.value='UI fixture';searchInput.dispatchEvent(new Event('input',{bubbles:true}));operation=runSearch('song','UI fixture');}if(phase==='song-start')operation=startSingleSong(knownSongs.get('ui-song-0'));
    if(operation)operation=Promise.resolve(operation).then(()=>operationMs=Math.round(performance.now()-begin));
    await new Promise(r=>setTimeout(r,2400));if(operation)await operation;live=false;observe.disconnect();frames.sort((a,b)=>a-b);
    return {phase,operationMs,firstAudioMs,frames:frames.length,over50:frames.filter(n=>n>50).length,maxFrameMs:Math.round(Math.max(0,...frames)),p95FrameMs:Math.round(frames[Math.floor(frames.length*.95)]||0),longTasks:long.length,longTaskMaxMs:Math.max(0,...long),rows:resultsList.querySelectorAll('.song-row').length,resultsDisplay:getComputedStyle(resultsList).display,firstRowHeight:resultsList.querySelector('.song-row')?.getBoundingClientRect().height||0,firstRowTop:resultsList.querySelector('.song-row')?.getBoundingClientRect().top,viewportHeight:innerHeight,audioPlaying:!audioPlayer.paused,clock:audioPlayer.currentTime,cursorVisible:document.documentElement.classList.contains('dinecho-live-cursor-enabled')};})()`);
   if(phase!=='pointer-idle'&&!(value.firstRowHeight>0&&value.firstRowTop<value.viewportHeight))throw new Error('Fixture rows were not visibly on screen');
   const after=await metrics();for(const k of ['LayoutCount','RecalcStyleCount','LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration'])value[k]=Math.round((after[k]-before[k])*1000)/1000;results.push(value);
  }
  fs.writeFileSync(path.join(root,'.startup-diagnostic','ui-stutter-'+label+'.png'),(await wc.capturePage()).toPNG());
  fs.writeFileSync(output,JSON.stringify({label,network:'controlled IPC; native PCM audio',graphics:app.getGPUFeatureStatus(),results},null,2));
 }catch(e){fs.writeFileSync(output,JSON.stringify({error:e.stack}))}finally{clearInterval(pointerTimer);app.quit()}
})});require(path.join(root,'main.js'));setTimeout(()=>{clearInterval(pointerTimer);app.quit()},45000);
