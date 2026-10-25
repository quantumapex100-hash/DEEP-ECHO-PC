const {app,ipcMain,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path');
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'.startup-diagnostic','lyrics-profile');fs.mkdirSync(dir,{recursive:true});
const trace=message=>fs.appendFileSync(path.join(root,'.startup-diagnostic','lyrics-probe-trace.txt'),`${new Date().toISOString()} ${message}\n`);
trace('start '+(process.env.DEEPECHO_LYRICS_PROBE_LABEL||''));
if(process.env.DEEPECHO_LYRICS_BASELINE==='1'){
  const loadFile=BrowserWindow.prototype.loadFile;
  BrowserWindow.prototype.loadFile=function(file,...args){return loadFile.call(this,file===path.join(root,'src','index.html')?path.join(root,'.startup-diagnostic','baseline','src','index.html'):file,...args);};
}
for(const name of ['appData','userData','music','temp']){const p=path.join(dir,name);fs.mkdirSync(p,{recursive:true});app.setPath(name,p);}app.setAppPath(root);
const handle=ipcMain.handle.bind(ipcMain);ipcMain.handle=(name,fn)=>handle(name,['get-home-feed','search-music','search-artist','smart-autoplay-candidates'].includes(name)?async()=>name==='get-home-feed'?{topHits:[],topArtistSongs:[],newReleases:[]}:[]:fn);
let done=false;
app.on('browser-window-created',(_event,win)=>{
  trace('window '+win.id);
  win.webContents.setBackgroundThrottling(false);
  win.webContents.setAudioMuted(true);
  win.once('ready-to-show',()=>{win.setAlwaysOnTop(true);win.show();});
  win.webContents.on('did-finish-load',async()=>{
    trace('loaded '+win.webContents.getURL());
    if(done||!win.webContents.getURL().endsWith('/index.html'))return;done=true;
    win.show();win.focus();
    try{
      const result=await win.webContents.executeJavaScript(`(async()=>{
        await new Promise(r=>setTimeout(r,1400));
        if(${JSON.stringify(process.env.DEEPECHO_PROBE_THEME||'')})applyTheme(${JSON.stringify(process.env.DEEPECHO_PROBE_THEME||'golden')});
        if(${process.env.DEEPECHO_PROBE_MEDIA==='1'}){
          const rate=24000,samples=rate*30,buffer=new ArrayBuffer(44+samples*2),view=new DataView(buffer);
          const str=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i))};
          str(0,'RIFF');view.setUint32(4,36+samples*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,samples*2,true);
          for(let i=0;i<samples;i++){const t=i/rate,envelope=.35+.3*Math.sin(t*7);view.setInt16(44+i*2,Math.round((Math.sin(t*2*Math.PI*160)+.5*Math.sin(t*2*Math.PI*900))*envelope*12000),true)}
          currentSong={id:'render-probe',title:'Isolated audio rendering test'};audioPlayer.src=URL.createObjectURL(new Blob([buffer],{type:'audio/wav'}));audioPlayer.loop=true;audioPlayer.muted=false;audioPlayer.volume=1;await audioPlayer.play();await resumeAudioAnalyser(true);startAudioEnergyTicker();startLyricsVisualizer();
        }else{
          const snapshot=readAudioEnergy();readAudioEnergy=()=>{const energy={...snapshot,playing:true,hasSignal:true,energy:.3+Math.sin(performance.now()/180)*.15,vocal:.4,bass:.3,treble:.2,rms:.1};window.__dinechoAudioEnergy=energy;return energy;};
        }
        window.__dinechoAudioEnergy=readAudioEnergy();
        const costs=[],draw=drawLyricsVisualizer;drawLyricsVisualizer=function(){const t=performance.now();const r=draw();costs.push(performance.now()-t);return r;};
        let writes=0;const setter=CSSStyleDeclaration.prototype.setProperty;CSSStyleDeclaration.prototype.setProperty=function(...args){if(args[0].startsWith('--lyric-')||args[0].startsWith('--v170-'))writes++;return setter.apply(this,args);};
        lyricLines=Array.from({length:200},(_,i)=>({time:i*2,text:'The same long lyric line for a realistic rendering fixture '+i}));
        lyricsBody.innerHTML=lyricLines.map((line,i)=>'<div class="lyric-line" data-line="'+i+'">'+line.text+'</div>').join('');activeLyric=0;
        const start=performance.now();activateTab('lyrics');await new Promise(requestAnimationFrame);const entryMs=performance.now()-start;
        await new Promise(r=>setTimeout(r,2000));writes=0;const intervals=[];let last=performance.now();
        await new Promise(resolve=>{const finish=performance.now()+3000;function frame(now){intervals.push(now-last);last=now;if(now>=finish)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)});
        if(document.hidden||!document.getElementById('lyricsView').classList.contains('active'))throw new Error('Lyrics view must remain visible for valid measurement');
        intervals.sort((a,b)=>a-b);return {entryMs:Math.round(entryMs),frames:intervals.length,p95Ms:Math.round(intervals[Math.floor(intervals.length*.95)]),worstMs:Math.round(intervals.at(-1)),styleWrites:writes,lines:lyricsBody.querySelectorAll('.lyric-line').length,current:lyricsBody.querySelector('.lyric-line.current')?.dataset.line,quality:visualizerQualityConfig(),pressure:document.body.classList.contains('v170-adaptive-pressure'),drawMaxMs:Math.round(Math.max(...costs)),canvas:[lyricsVisualizerCanvas.width,lyricsVisualizerCanvas.height],filter:getComputedStyle(lyricsVisualizerCanvas.parentElement).filter};
      })()`);
      trace('measured '+JSON.stringify(result));
      if(process.env.DEEPECHO_PROBE_THEMES==='1'){
        result.themes=[];
        for(const theme of ['golden','light','dark','purple','toxic','blood','silver','transparent','fluids','rgb','love','space','nebula','dragon']){
          const metrics=await win.webContents.executeJavaScript(`(async()=>{
            applyTheme(${JSON.stringify(theme)});lyricsRenderConstrained=true;document.body.classList.add('v170-adaptive-pressure');await new Promise(r=>setTimeout(r,120));
            const energy=readAudioEnergy(),read=readAudioEnergy,phase=visualizerMusicPhase,angle=visualizerAngle;readAudioEnergy=()=>energy;
            const sample=()=>{const pixels=lyricsVisualizerCanvas.getContext('2d').getImageData(0,0,lyricsVisualizerCanvas.width,lyricsVisualizerCanvas.height).data;let light=0,bright=0;for(let i=0;i<pixels.length;i+=4){const value=Math.max(pixels[i],pixels[i+1],pixels[i+2])*pixels[i+3]/255;light+=value;if(value>160)bright++}return {light,bright}};
            const color=luminousVisualizerColor,glow=paintFastVisualizerGlow;
            const paint=()=>{cancelAnimationFrame(visualizerFrame);visualizerLastPaintAt=0;drawLyricsVisualizer();};
            try{
              luminousVisualizerColor=c=>c;paintFastVisualizerGlow=()=>{};paint();const dim=sample();
              luminousVisualizerColor=color;paintFastVisualizerGlow=glow;visualizerMusicPhase=phase;visualizerAngle=angle;
              visualizerGlowBuffers.delete(lyricsVisualizerCanvas);
              const costs=[];for(let i=0;i<4;i++){const start=performance.now();paint();costs.push(performance.now()-start)}const bright=sample();
              return {theme:document.body.dataset.theme,ratio:bright.light/Math.max(1,dim.light),brightPixelsBefore:dim.bright,brightPixelsAfter:bright.bright,drawMaxMs:Math.round(Math.max(...costs)),quality:visualizerQualityConfig()};
            }finally{readAudioEnergy=read;luminousVisualizerColor=color;paintFastVisualizerGlow=glow;}
          })()`);
          result.themes.push(metrics);trace('theme '+JSON.stringify(metrics));
          await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
          const shot=await win.webContents.capturePage();fs.writeFileSync(path.join(root,'.startup-diagnostic','bright-theme-'+theme+'.png'),shot.toPNG());
        }
      }
      if(process.env.DEEPECHO_PROBE_MEDIA==='1')result.media=await win.webContents.executeJavaScript(`(async()=>{const clock=audioPlayer.currentTime,signal=readAudioEnergy().hasSignal,expected=findActiveLyricIndex(lyricLines,lyricsPlaybackClock()),actual=Number(lyricsBody.querySelector('.current')?.dataset.line);audioPlayer.pause();const pausedAt=audioPlayer.currentTime;await new Promise(r=>setTimeout(r,200));const pauseHeld=Math.abs(audioPlayer.currentTime-pausedAt)<.03;audioPlayer.currentTime=13;syncLyrics(true);const seekLine=Number(lyricsBody.querySelector('.current')?.dataset.line);await audioPlayer.play();await new Promise(r=>setTimeout(r,200));return {clock,signal,expected,actual,pauseHeld,seekLine,resumed:!audioPlayer.paused&&audioPlayer.currentTime>13}})()`);
      result.visibleFilters=await win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('body *')).filter(node=>node.getBoundingClientRect().width&&node.getBoundingClientRect().height).flatMap(node=>['','::before','::after'].map(pseudo=>{const s=getComputedStyle(node,pseudo);return {node:node.id||node.className,pseudo,filter:s.filter,backdrop:s.backdropFilter}})).filter(s=>(s.filter&&s.filter!=='none')||(s.backdrop&&s.backdrop!=='none')).slice(0,40)`);
      if(process.env.DEEPECHO_RENDER_ABLATION==='1'){
        result.ablations=[];
        for(const [name,css] of [
          ['canvas-filter','#lyricsVisualizerCanvas{filter:none!important}'],
          ['canvas-and-parent','#lyricsVisualizerCanvas,.lyrics-ambient-visualizer,.lyrics-ambient-visualizer::before,.lyrics-ambient-visualizer::after{filter:none!important;animation:none!important}'],
          ['all-filters','*,*::before,*::after{filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}']
        ]){
          const key=await win.webContents.insertCSS(css);
          const measure=await win.webContents.executeJavaScript(`(async()=>{await new Promise(r=>setTimeout(r,1000));const intervals=[];let last=performance.now();await new Promise(resolve=>{const end=last+3000;function frame(now){intervals.push(now-last);last=now;if(now>=end)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)});intervals.sort((a,b)=>a-b);return {frames:intervals.length,p95Ms:Math.round(intervals[Math.floor(intervals.length*.95)]),worstMs:Math.round(intervals.at(-1))}})()`);
          result.ablations.push({name,...measure});trace(name+' '+JSON.stringify(measure));await win.webContents.removeInsertedCSS(key);
        }
      }
      fs.writeFileSync(path.join(root,'.startup-diagnostic','lyrics-'+(process.env.DEEPECHO_LYRICS_PROBE_LABEL||'result')+'.json'),JSON.stringify(result,null,2));
      const image=await win.webContents.capturePage();fs.writeFileSync(path.join(root,'.startup-diagnostic','lyrics-'+(process.env.DEEPECHO_LYRICS_PROBE_LABEL||'result')+'.png'),image.toPNG());
    }catch(e){fs.writeFileSync(path.join(root,'.startup-diagnostic','lyrics-probe-error.txt'),e.stack);}finally{app.quit();}
  });
});
require(path.join(root,'main.js'));setTimeout(()=>{trace('timeout');app.quit();},120000);
