const {app,ipcMain,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..'),label='material',dir=path.join(root,'.startup-diagnostic','calm-profile-'+Date.now());
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
let stallStream=false;const handle=ipcMain.handle.bind(ipcMain);ipcMain.handle=(name,fn)=>handle(name,async(...args)=>{
 if(name==='get-home-feed')return {topHits:songs,topArtistSongs:songs,newReleases:songs};
 if(['search-music','search-artist'].includes(name))return songs.map(s=>({...s}));
 if(['prefetch-song','smart-autoplay-candidates','search-suggestions'].includes(name))return name==='prefetch-song'?{success:false,busy:true}:[];
 if(name==='verify-lyrics-support'){await new Promise(r=>setTimeout(r,30));return {verified:Number(args[1].id.split('-').at(-1))%3===0}}
 if(name==='stream-song'&&stallStream)await new Promise(r=>setTimeout(r,15000));
 if(name==='stream-song')return {success:true,song:{...args[1],fileUrl:pathToFileURL(file).href,filepath:file}};
 if(name==='get-lyrics')return {syncedLyrics:'[00:00]First lyric\n[00:03]Second lyric\n[00:06]Third lyric',source:'Native UI fixture'};
 if(['get-exact-lyrics','upgrade-lyrics-captions','get-lyrics-alternatives'].includes(name))return null;
 return fn(...args);
});




let ran=false;app.on('browser-window-created',(_e,win)=>{win.webContents.setBackgroundThrottling(false);win.webContents.setAudioMuted(true);win.webContents.on('did-finish-load',async()=>{
 if(ran||!win.webContents.getURL().endsWith('/index.html'))return;ran=true;const wc=win.webContents,result={cases:[],errors:[]};wc.on('console-message',(_e,level,msg)=>{if(level>=3)result.errors.push(msg)});
 try{for(const theme of ['golden','toxic']){
 await wc.executeJavaScript(`localStorage.setItem('echo-theme-v1','${theme}');localStorage.setItem('deepeccho-resume-session-enabled-v1','false');localStorage.setItem('deep-echo-onboarded','2.6.6')`);
 await new Promise(r=>{wc.once('did-finish-load',r);wc.reload()});await new Promise(r=>setTimeout(r,1100));
 let k=0;const timer=setInterval(()=>{k++;wc.sendInputEvent({type:'mouseMove',x:Math.round(650+Math.sin(k*.1)*400),y:Math.round(350+Math.cos(k*.13)*240)})},8);
 const data=await wc.executeJavaScript(`(async()=>{const gaps=[],tasks=[],positions=new Set(),start=performance.now();let last=start,live=true;const host=document.getElementById('deepEchoStartupIntro'),logo=host?.shadowRoot.getElementById('logoDepth'),observer=new PerformanceObserver(l=>tasks.push(...l.getEntries().map(e=>e.duration)));observer.observe({type:'longtask'});function tick(t){if(!live)return;gaps.push(t-last);last=t;positions.add(logo?.style.transform);requestAnimationFrame(tick)}requestAnimationFrame(tick);await new Promise(r=>setTimeout(r,2400));live=false;observer.disconnect();gaps.sort((a,b)=>a-b);return {p95:gaps[Math.floor(gaps.length*.95)],over50:gaps.filter(x=>x>50).length,longTasks:tasks,frames:gaps.length,pointerPositions:positions.size,stillIntro:!!host?.isConnected};})()`);clearInterval(timer);result.cases.push({theme,...data});
 fs.writeFileSync(path.join(root,'.startup-diagnostic/intro-perf-'+(process.env.INTRO_PERF_LABEL||'before')+'-'+theme+'.png'),(await wc.capturePage()).toPNG());
 }}catch(e){result.error=e.stack}finally{fs.writeFileSync(path.join(root,'.startup-diagnostic/intro-perf-'+(process.env.INTRO_PERF_LABEL||'before')+'.json'),JSON.stringify(result,null,2));app.quit()}
})});require(path.join(root,'main.js'));setTimeout(()=>app.quit(),30000);
