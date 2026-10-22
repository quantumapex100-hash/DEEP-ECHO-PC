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



let probeRunning=false;
app.on('browser-window-created',(_e,win)=>{win.webContents.setBackgroundThrottling(false);win.webContents.setAudioMuted(true);win.webContents.on('did-finish-load',async()=>{
 if(probeRunning||!win.webContents.getURL().endsWith('/index.html'))return;probeRunning=true;
 const wc=win.webContents,result={fullscreen:win.isFullScreen(),errors:[],cases:[]};wc.on('console-message',(_e,level,message)=>{if(level>=3)result.errors.push(message)});
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const reload=()=>new Promise(resolve=>{wc.once('did-finish-load',resolve);wc.reload()});
 const saved=(theme)=>`localStorage.setItem('echo-theme-v1','${theme}');localStorage.setItem('deep-echo-onboarded','2.6.6');localStorage.setItem('deepeccho-resume-session-enabled-v1','true');localStorage.setItem('deepeccho-resume-session-v1',JSON.stringify({version:1,savedAt:Date.now(),tab:'lyrics',song:{id:'intro-resume',title:'Saved session song',url:'https://www.youtube.com/watch?v=intro-resume'},position:12,duration:120,wasPlaying:false}));`;
 try{
 for(const theme of ['toxic','light']){
 await wc.executeJavaScript(saved(theme)+`window.addEventListener('beforeunload',()=>{${saved(theme)}},{once:true});`);stallStream=theme==='light';await reload();await wc.executeJavaScript(saved(theme));
 const early=await wc.executeJavaScript(`(()=>{const h=document.getElementById('deepEchoStartupIntro'),s=h?.shadowRoot;return {theme:h?.dataset.theme,stages:window.deepEchoStartup?.getState(),demo:!!s?.querySelector('#ui'),progress:s?.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow'),app:!!document.querySelector('.app'),canvas:!!document.getElementById('particles')};})()`);
 wc.sendInputEvent({type:'mouseMove',x:120,y:150});await wait(180);fs.writeFileSync(path.join(root,'.startup-diagnostic/intro-'+theme+'.png'),(await wc.capturePage()).toPNG());
 const t=Date.now();let atReveal=null;
 while(Date.now()-t<10000){const state=await wc.executeJavaScript("window.deepEchoStartup?.getState()||null");if(state?.revealing&&!atReveal){atReveal={elapsed:Date.now()-t,state};await wait(250);fs.writeFileSync(path.join(root,'.startup-diagnostic/intro-'+theme+'-reveal.png'),(await wc.capturePage()).toPNG());}if(!state)break;await wait(70)}
 const final=await wc.executeJavaScript(`({intro:!!document.getElementById('deepEchoStartupIntro'),theme:document.body.dataset.theme,inert:document.querySelector('.app').inert,transform:getComputedStyle(document.querySelector('.app')).transform,tab:document.querySelector('.nav-item.active')?.dataset.tab,song:currentSong?.id,time:audioPlayer.currentTime,paused:audioPlayer.paused,template:!!window.__deepEchoIntroTemplate,bridge:!!window.deepEchoStartup})`);
 result.cases.push({theme,early,atReveal,final});
 }
 }catch(e){result.error=e.stack}finally{fs.writeFileSync(path.join(root,'.startup-diagnostic/startup-intro-native.json'),JSON.stringify(result,null,2));app.quit()}
})});require(path.join(root,'main.js'));setTimeout(()=>app.quit(),35000);
