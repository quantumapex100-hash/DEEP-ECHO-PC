const {app,ipcMain,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..'),label=process.env.DEEPECHO_UI_LABEL||'sample',dir=path.join(root,'.startup-diagnostic','calm-profile-'+Date.now());
for(const name of ['appData','userData','music','temp']){const p=path.join(dir,name);fs.mkdirSync(p,{recursive:true});app.setPath(name,p)}
app.setAppPath(root);const stamp=path.join(dir,'appData','deepeccho');fs.mkdirSync(stamp,{recursive:true});fs.writeFileSync(path.join(stamp,'yt-dlp-update-check.json'),JSON.stringify({checkedAt:Date.now()}));
if(process.env.DEEPECHO_UI_BASELINE==='1'){
 const baseline=path.join(root,'.startup-diagnostic','calm-baseline');fs.mkdirSync(baseline,{recursive:true});
 let html=fs.readFileSync(path.join(root,'src/index.html'),'utf8').replace('<head>','<head><base href="'+pathToFileURL(path.join(root,'src')+path.sep).href+'">');
 for(const name of ['feel-happy.js']){fs.copyFileSync(path.join(root,'../../backups/before-calm-stutter-20261021',name),path.join(baseline,name));html=html.replace('"'+name+'"','"'+pathToFileURL(path.join(baseline,name)).href+'"')}
 fs.writeFileSync(path.join(baseline,'index.html'),html);
 const load=BrowserWindow.prototype.loadFile;BrowserWindow.prototype.loadFile=function(file,...args){return load.call(this,file===path.join(root,'src/index.html')?path.join(baseline,'index.html'):file,...args)};
}
for(const flag of ['disable-background-timer-throttling','disable-renderer-backgrounding','disable-backgrounding-occluded-windows'])app.commandLine.appendSwitch(flag);
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
// Native PCM fixture: actual decoder/playback, no network or extractor timing mixed into UI cost.
const samples=24000*120,wav=Buffer.alloc(44+samples*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(24000,24);wav.writeUInt32LE(48000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(2000*Math.sin(2*Math.PI*220*i/24000)),44+i*2);const file=path.join(dir,'fixture.wav');fs.writeFileSync(file,wav);
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
let started=false,pointerTimer,gpuInfo=null;app.whenReady().then(async()=>{try{const info=await app.getGPUInfo('complete');gpuInfo={devices:info.gpuDevice,aux:info.auxAttributes};}catch{}});const output=path.join(root,'.startup-diagnostic','calm-stutter-'+label+'.json');
app.on('browser-window-created',(_e,win)=>{win.webContents.setBackgroundThrottling(false);win.webContents.setAudioMuted(true);win.webContents.on('did-finish-load',async()=>{
 if(started||!win.webContents.getURL().endsWith('/index.html'))return;started=true;
 try{
  const wc=win.webContents;await new Promise(r=>setTimeout(r,1800));await wc.executeJavaScript('document.getElementById("deSetupSave")?.click();window.deepEchoSmartAutoplay?.setEnabled(false)');
  wc.debugger.attach('1.3');await wc.debugger.sendCommand('Performance.enable');
  const metrics=async()=>Object.fromEntries((await wc.debugger.sendCommand('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  await wc.executeJavaScript(`(()=>{window.__calmDrawTimes=[];const ctx=document.getElementById('happyCanvas').getContext('2d'),fill=ctx.fillRect.bind(ctx);ctx.fillRect=function(x,y,w,h){if(x===0&&y===0&&w>500&&h>400){if(!document.getElementById('calmGrassGPU')||document.getElementById('calmGrassGPU').style.visibility==='hidden')window.__calmDrawTimes.push(performance.now());if(window.__calmDrawTimes.length>2000)window.__calmDrawTimes.shift();}return fill(x,y,w,h);};})()`);
  let step=0;const box=await wc.executeJavaScript("(()=>{activateTab('feelHappy');const b=document.getElementById('happyScene').getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}})()");pointerTimer=setInterval(()=>{if(!wc.isDestroyed())wc.sendInputEvent({type:'mouseMove',x:Math.round(box.x+box.width*(.1+(step++%50)/50*.75)),y:Math.round(box.y+box.height*(.8+Math.sin(step*.1)*.08))})},16);
  await wc.executeJavaScript(`(()=>{const front=document.getElementById('calmForeground');if(front){const ctx=front.getContext('2d'),clear=ctx.clearRect.bind(ctx);ctx.clearRect=function(...args){window.__calmDrawTimes.push(performance.now());if(window.__calmDrawTimes.length>2000)window.__calmDrawTimes.shift();return clear(...args);};}})()`);
  const results=[];await wc.executeJavaScript("startSingleSong({id:'calm-probe',title:'Calm native audio',url:'https://www.youtube.com/watch?v=calm-probe'})");
  for(const phase of (process.env.DEEPECHO_UI_STRESS==='1'?['calm-day','calm-night','calm-paused-brush','after-exit','calm-return','calm-resize','gpu-loss','gpu-restored','after-exit-again']:['calm-day','calm-night','calm-paused-brush','after-exit'])){
   if(phase==='calm-resize')win.setSize(1500,900);
   const actions={
    'calm-day':"document.querySelector('[data-happy-time=day]').click()",
    'calm-night':"document.querySelector('[data-happy-time=night]').click()",
    'calm-paused-brush':"document.getElementById('happyPause').click()",
    'calm-return':"activateTab('feelHappy');if(happyPause.textContent==='Resume')happyPause.click();document.querySelector('[data-happy-time=sunset]').click()",
    'calm-resize':'void 0',
    'gpu-loss':"window.__calmLoseExtension=document.getElementById('calmGrassGPU').getContext('webgl').getExtension('WEBGL_lose_context');window.__calmLoseExtension.loseContext()",
    'gpu-restored':"window.__calmLoseExtension.restoreContext()"
   };
   await wc.executeJavaScript(actions[phase]||"activateTab('search')");
   await new Promise(r=>setTimeout(r,phase==='calm-night'||phase==='calm-return'?5500:phase.startsWith('gpu-')?400:200));
   const before=await metrics();if(process.env.DEEPECHO_UI_CPU==='1'&&phase==='calm-night'){await wc.debugger.sendCommand('Profiler.enable');await wc.debugger.sendCommand('Profiler.start');}
   const value=await wc.executeJavaScript(`(async()=>{const phase=${JSON.stringify(phase)},frames=[],long=[],begin=performance.now();let last=begin,live=true;const observe=new PerformanceObserver(list=>long.push(...list.getEntries().map(e=>Math.round(e.duration))));observe.observe({type:'longtask',buffered:false});const tick=now=>{if(!live)return;frames.push(now-last);last=now;requestAnimationFrame(tick)};requestAnimationFrame(tick);
    await new Promise(r=>setTimeout(r,2400));live=false;observe.disconnect();frames.sort((a,b)=>a-b);
    const draws=window.__calmDrawTimes.filter(t=>t>=begin),gaps=draws.slice(1).map((t,i)=>t-draws[i]).sort((a,b)=>a-b);const gpu=document.getElementById('calmGrassGPU');return {sceneFPS:Math.round(draws.length*1000/(performance.now()-begin)),sceneP95Ms:Math.round(gaps[Math.floor(gaps.length*.95)]||0),gpuGrass:!!gpu&&!gpu.getContext('webgl').isContextLost(),phase,frames:frames.length,over50:frames.filter(n=>n>50).length,maxFrameMs:Math.round(Math.max(0,...frames)),p95FrameMs:Math.round(frames[Math.floor(frames.length*.95)]||0),longTasks:long.length,longTaskMaxMs:Math.max(0,...long),audioPlaying:!audioPlayer.paused,clock:audioPlayer.currentTime,calmActive:document.getElementById('feelHappyView').classList.contains('active'),time:document.getElementById('happyScene').dataset.time,canvasWidth:document.getElementById('happyCanvas').width,canvasHeight:document.getElementById('happyCanvas').height};})()`);
   if(process.env.DEEPECHO_UI_CPU==='1'&&phase==='calm-night'){const {profile}=await wc.debugger.sendCommand('Profiler.stop');fs.writeFileSync(path.join(root,'.startup-diagnostic/calm-'+label+'.cpuprofile'),JSON.stringify(profile));}const after=await metrics();for(const k of ['LayoutCount','RecalcStyleCount','LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration'])value[k]=Math.round((after[k]-before[k])*1000)/1000;results.push(value);fs.writeFileSync(output,JSON.stringify({label,graphics:app.getGPUFeatureStatus(),results},null,2));fs.writeFileSync(path.join(root,'.startup-diagnostic','calm-'+label+'-'+phase+'.png'),(await wc.capturePage()).toPNG());
  }
  fs.writeFileSync(path.join(root,'.startup-diagnostic','calm-stutter-'+label+'.png'),(await wc.capturePage()).toPNG());
  fs.writeFileSync(output,JSON.stringify({label,network:'controlled IPC; native PCM audio',gpuInfo,graphics:app.getGPUFeatureStatus(),results},null,2));
 }catch(e){fs.writeFileSync(output,JSON.stringify({error:e.stack}))}finally{clearInterval(pointerTimer);app.quit()}
})});require(path.join(root,'main.js'));setTimeout(()=>{clearInterval(pointerTimer);app.quit()},90000);
