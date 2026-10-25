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
const handle=ipcMain.handle.bind(ipcMain);ipcMain.handle=(name,fn)=>handle(name,async(...args)=>{
 if(name==='get-home-feed')return {topHits:songs,topArtistSongs:songs,newReleases:songs};
 if(['search-music','search-artist'].includes(name))return songs.map(s=>({...s}));
 if(['prefetch-song','smart-autoplay-candidates','search-suggestions'].includes(name))return name==='prefetch-song'?{success:false,busy:true}:[];
 if(name==='verify-lyrics-support'){await new Promise(r=>setTimeout(r,30));return {verified:Number(args[1].id.split('-').at(-1))%3===0}}
 if(name==='stream-song')return {success:true,song:{...args[1],fileUrl:pathToFileURL(file).href,filepath:file}};
 if(name==='get-lyrics')return {syncedLyrics:'[00:00]First lyric\n[00:03]Second lyric\n[00:06]Third lyric',source:'Native UI fixture'};
 if(['get-exact-lyrics','upgrade-lyrics-captions','get-lyrics-alternatives'].includes(name))return null;
 return fn(...args);
});


let started=false;
app.on('browser-window-created',(_e,win)=>{win.webContents.setBackgroundThrottling(false);win.webContents.setAudioMuted(true);win.webContents.on('did-finish-load',async()=>{
 if(started||!win.webContents.getURL().endsWith('/index.html'))return;started=true;
 const wc=win.webContents,results={transitions:[],errors:[]};
 wc.on('console-message',(_event,level,message)=>{if(level>=3)results.errors.push(message)});
 try {
 await new Promise(r=>setTimeout(r,2200));
 await wc.executeJavaScript(`document.getElementById('deSetupSave')?.click();window.deepEchoSmartAutoplay?.setEnabled(false);setStored(STORAGE.liked,${JSON.stringify(songs.slice(0,12))});setStored(STORAGE.recent,${JSON.stringify(songs.slice(0,18))});activateTab('home');`);
 await new Promise(r=>setTimeout(r,2200));
 await wc.executeJavaScript("startSingleSong({id:'material-audio',title:'Transition audio',url:'https://www.youtube.com/watch?v=material-audio'})");
 for(const from of ['search','settings','feelHappy']){
 await wc.executeJavaScript(`activateTab('${from}')`);await new Promise(r=>setTimeout(r,1400));
 results.transitions.push(await wc.executeJavaScript(`(async()=>{
 const lens=document.querySelector('.de-glass-lens'),positions=[],gaps=[],tasks=[];
 const original=document.querySelector('#home236NewReleasesGrid')?.firstElementChild;
 const obs=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>e.duration)));obs.observe({type:'longtask'});
 let live=true,last=performance.now();function tick(t){if(!live)return;gaps.push(t-last);last=t;positions.push(lens.style.transform);requestAnimationFrame(tick)}requestAnimationFrame(tick);
 const start=performance.now();document.querySelector('[data-tab="home"]').click();const clickMs=performance.now()-start;
 await new Promise(r=>setTimeout(r,1500));live=false;obs.disconnect();gaps.sort((a,b)=>a-b);
 return {from:'${from}',clickMs,p95:gaps[Math.floor(gaps.length*.95)],longTasks:tasks,positions:new Set(positions).size,moving:lens.dataset.moving,retained:original===document.querySelector('#home236NewReleasesGrid')?.firstElementChild,audio:!audioPlayer.paused};
 })()`));
 }
 results.calm=await wc.executeJavaScript(`(async()=>{const lens=document.querySelector('.de-glass-lens');document.querySelector('[data-tab="feelHappy"]').click();await new Promise(r=>setTimeout(r,100));const moving=lens.dataset.moving;await new Promise(r=>setTimeout(r,1400));return {movingAt100:moving,settled:lens.dataset.moving,selected:document.querySelector('.de-glass-selected')?.dataset.tab,audio:!audioPlayer.paused};})()`);
 await wc.executeJavaScript("activateTab('home')");await new Promise(r=>setTimeout(r,1500));
 fs.writeFileSync(path.join(root,'.startup-diagnostic/home-glass-fixed.png'),(await wc.capturePage()).toPNG());
 }catch(e){results.error=e.stack}finally{fs.writeFileSync(path.join(root,'.startup-diagnostic/home-glass-native.json'),JSON.stringify(results,null,2));app.quit();}
})});require(path.join(root,'main.js'));setTimeout(()=>app.quit(),45000);
