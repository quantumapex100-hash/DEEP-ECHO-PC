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
 if(name==='get-home-feed')return {topHits:[],topArtistSongs:[],newReleases:[]};
 if(['search-music','search-artist'].includes(name))return songs.map(s=>({...s}));
 if(['prefetch-song','smart-autoplay-candidates','search-suggestions'].includes(name))return name==='prefetch-song'?{success:false,busy:true}:[];
 if(name==='verify-lyrics-support'){await new Promise(r=>setTimeout(r,30));return {verified:Number(args[1].id.split('-').at(-1))%3===0}}
 if(name==='stream-song')return {success:true,song:{...args[1],fileUrl:pathToFileURL(file).href,filepath:file}};
 if(name==='get-lyrics')return {syncedLyrics:'[00:00]First lyric\n[00:03]Second lyric\n[00:06]Third lyric',source:'Native UI fixture'};
 if(['get-exact-lyrics','upgrade-lyrics-captions','get-lyrics-alternatives'].includes(name))return null;
 return fn(...args);
});

let started=false;const output=path.join(root,'.startup-diagnostic/material-controls-native.json');
app.on('browser-window-created',(_e,win)=>{win.webContents.setBackgroundThrottling(false);win.webContents.setAudioMuted(true);win.webContents.on('did-finish-load',async()=>{
 if(started||!win.webContents.getURL().endsWith('/index.html'))return;started=true;
 const wc=win.webContents;const results={themes:[],tabs:[],buttons:[]};
 try{
  await new Promise(r=>setTimeout(r,1800));await wc.executeJavaScript('document.getElementById("deSetupSave")?.click();window.deepEchoSmartAutoplay?.setEnabled(false);activateTab("home")');
  results.errors=[];wc.on('console-message',(_event,level,message)=>{if(level>=3)results.errors.push(message)});
  await wc.executeJavaScript("startSingleSong({id:'material-audio',title:'UI animation test audio',url:'https://www.youtube.com/watch?v=material-audio'})");
  const box=selector=>wc.executeJavaScript(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()`);
  const move=async(selector)=>{const b=await box(selector);wc.sendInputEvent({type:'mouseMove',x:Math.round(b.x+b.w*.55),y:Math.round(b.y+b.h*.5)});await new Promise(r=>setTimeout(r,360));return b;};
  for(const theme of ['golden','light','dark','purple','toxic','blood','silver','transparent','fluids','rgb','love','space','nebula','dragon']){
   await wc.executeJavaScript(`applyTheme(${JSON.stringify(theme)})`);await move('#heroSearchBtn');
   if(['golden','space','toxic','light','nebula'].includes(theme)){
    const activeBox=await box('#heroSearchBtn');let step=0;const timer=setInterval(()=>wc.sendInputEvent({type:'mouseMove',x:Math.round(activeBox.x+activeBox.w*(.15+(step++%30)/30*.7)),y:Math.round(activeBox.y+activeBox.h*(.5+Math.sin(step*.4)*.2))}),8);
    const perf=await wc.executeJavaScript(`(async()=>{const gaps=[],tasks=[],start=performance.now();let last=start,live=true;const observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({type:'longtask'});const tick=t=>{if(!live)return;gaps.push(t-last);last=t;requestAnimationFrame(tick)};requestAnimationFrame(tick);await new Promise(r=>setTimeout(r,1100));live=false;observer.disconnect();gaps.sort((a,b)=>a-b);return {p95:gaps[Math.floor(gaps.length*.95)],over50:gaps.filter(x=>x>50).length,longTasks:tasks.length};})()`);clearInterval(timer);(results.performance??=[]).push({theme,...perf});
   }
   results.themes.push(await wc.executeJavaScript(`({theme:document.body.dataset.theme,material:document.body.dataset.controlMaterial,skin:getComputedStyle(heroSearchBtn).color,canvas:!!document.querySelector('#heroSearchBtn .de-fabric-canvas'),error:document.querySelector('.de-fabric-canvas')?.getContext('webgl')?.getError()})`));
   fs.writeFileSync(path.join(root,'.startup-diagnostic/material-'+theme+'.png'),(await wc.capturePage()).toPNG());
   wc.sendInputEvent({type:'mouseMove',x:600,y:300});await new Promise(r=>setTimeout(r,80));
  }
  await wc.executeJavaScript("applyTheme('golden')");
  for(const id of ['searchBtn','v18AskBtn','heroSearchBtn','v2313RepairBtn','smartAutoplayToggle']){
   await move('#'+id);results.buttons.push(await wc.executeJavaScript(`({id:${JSON.stringify(id)},live:document.getElementById(${JSON.stringify(id)}).classList.contains('de-fabric-live'),canvasCount:document.querySelectorAll('.de-fabric-canvas').length,label:document.getElementById(${JSON.stringify(id)}).textContent})`));
   fs.writeFileSync(path.join(root,'.startup-diagnostic/material-hover-'+id+'.png'),(await wc.capturePage()).toPNG());
  }
  const tabs=await wc.executeJavaScript("[...document.querySelectorAll('#appSidebar .nav-item')].map(e=>e.dataset.tab)");
  for(const tab of tabs){await wc.executeJavaScript(`document.querySelector('[data-tab="${tab}"]').click()`);await new Promise(r=>setTimeout(r,620));results.tabs.push(await wc.executeJavaScript(`({tab:${JSON.stringify(tab)},active:document.querySelector('.nav-item.active')?.dataset.tab,transform:document.querySelector('.de-glass-lens').style.transform,moving:document.querySelector('.de-glass-lens').dataset.moving,audio:!audioPlayer.paused})`));}
  await wc.executeJavaScript("activateTab('home');artistSearchBtn.click()");await new Promise(r=>setTimeout(r,600));results.artist=await wc.executeJavaScript("({open:!artistSearchModal.classList.contains('hidden'),transform:document.querySelector('.de-glass-lens').style.transform})");
  await wc.executeJavaScript("artistSearchModal.classList.add('hidden');v18AskBtn.click()");results.ask=await wc.executeJavaScript("!document.getElementById('v18AskModal').classList.contains('hidden')");
  await wc.executeJavaScript("document.getElementById('v18AskModal').classList.add('hidden');heroSearchBtn.click()");results.hero=await wc.executeJavaScript("document.querySelector('.nav-item.active').dataset.tab");
  await wc.executeJavaScript("activateTab('home');smartAutoplayToggle.click()");results.smart=await wc.executeJavaScript("({state:smartAutoplayToggle.getAttribute('aria-pressed'),text:smartAutoplayState.textContent})");
  await wc.executeJavaScript("activateTab('home');v2313RepairBtn.click()");await new Promise(r=>setTimeout(r,600));results.repair=await wc.executeJavaScript("({working:v2313RepairBtn.classList.contains('is-working'),audio:!audioPlayer.paused,clock:audioPlayer.currentTime})");
  await wc.executeJavaScript("searchInput.value='fixture query';searchBtn.click()");await new Promise(r=>setTimeout(r,300));results.search=await wc.executeJavaScript("({rows:document.querySelectorAll('#resultsList .song-row').length,tab:document.querySelector('.nav-item.active').dataset.tab})");
  await wc.executeJavaScript("activateTab('home')");await move('#smartAutoplayToggle');
  results.smartLayout=await wc.executeJavaScript("(()=>{const a=smartAutoplayToggle.querySelector('.smart-autoplay-copy').getBoundingClientRect(),b=smartAutoplayState.getBoundingClientRect();return {noOverlap:a.right<=b.left};})()");
  await move('#heroSearchBtn');await new Promise(r=>setTimeout(r,1600));results.stationary=await wc.executeJavaScript("({canvasCount:document.querySelectorAll('.de-fabric-canvas').length,live:heroSearchBtn.classList.contains('de-fabric-live')})");
  wc.sendInputEvent({type:'mouseMove',x:600,y:300});await new Promise(r=>setTimeout(r,1900));results.idle=await wc.executeJavaScript("({canvasCount:document.querySelectorAll('.de-fabric-canvas').length,lensMoving:document.querySelector('.de-glass-lens').dataset.moving,audio:!audioPlayer.paused,clock:audioPlayer.currentTime})");
 }catch(error){results.error=error.stack;}finally{fs.writeFileSync(output,JSON.stringify(results,null,2));app.quit();}
})});require(path.join(root,'main.js'));setTimeout(()=>app.quit(),90000);
