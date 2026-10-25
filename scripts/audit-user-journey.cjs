// Isolated, muted, offscreen user-journey audit. Never shows/focuses native windows.
const fs=require('fs'),path=require('path'),Module=require('module');
const electron=require('electron'),{app,ipcMain}=electron;
const root=path.resolve(__dirname,'..'),live=process.env.DEEPECHO_AUDIT_LIVE==='1',profileOnly=process.env.DEEPECHO_AUDIT_PROFILE==='1';
const out=path.join(root,'.startup-diagnostic'),profile=path.join(out,'audit-profile-'+Date.now());
const result={mode:live?'real online songs':'controlled media, real renderer',started:new Date().toISOString(),steps:[],ipc:[],errors:[],visibleWindows:[]};
fs.mkdirSync(out,{recursive:true});
for(const name of ['appData','userData','music','temp']){const p=path.join(profile,name);fs.mkdirSync(p,{recursive:true});app.setPath(name,p);}
app.setAppPath(root);
const stamp=path.join(profile,'appData','deepeccho');fs.mkdirSync(stamp,{recursive:true});fs.writeFileSync(path.join(stamp,'yt-dlp-update-check.json'),JSON.stringify({checkedAt:Date.now()}));
for(const flag of ['disable-background-timer-throttling','disable-renderer-backgrounding','disable-backgrounding-occluded-windows'])app.commandLine.appendSwitch(flag);
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const native=electron.BrowserWindow;
class QuietWindow extends native{
 constructor(options){super({...options,show:false,fullscreen:false,alwaysOnTop:false,skipTaskbar:true,width:1280,height:800,webPreferences:{...options.webPreferences,offscreen:true,backgroundThrottling:false}});this.webContents.setFrameRate(60);}
 show(){} showInactive(){} focus(){} setFullScreen(){} moveTop(){}
}
const originalLoad=Module._load;
Module._load=function(name,parent,...rest){if(name==='electron'&&parent?.filename===path.join(root,'main.js'))return {...electron,BrowserWindow:QuietWindow,globalShortcut:{...electron.globalShortcut,register:()=>false,isRegistered:()=>false,unregister(){},unregisterAll(){}}};return originalLoad.call(this,name,parent,...rest);};
const songs=Array.from({length:48},(_,i)=>({id:'audit-song-'+i,title:'Audit Artist '+i+' - Song '+i,channel:'Audit Artist '+i,duration:'2:00',url:'https://www.youtube.com/watch?v=audit-song-'+i}));
const {pathToFileURL}=require('url');const wav=Buffer.alloc(44+24000*120*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(24000,24);wav.writeUInt32LE(48000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);for(let i=0;i<(wav.length-44)/2;i++)wav.writeInt16LE(Math.round(1200*Math.sin(i*2*Math.PI*220/24000)),44+i*2);const file=path.join(profile,'fixture.wav');fs.writeFileSync(file,wav);
const handlers=new Map(),handle=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(name,fn)=>{handlers.set(name,fn);handle(name,async(...args)=>{const t=Date.now();let value;
 try{
 if(name==='get-home-feed')value=live?{topHits:[],topArtistSongs:[],newReleases:[]}:{topHits:songs,topArtistSongs:songs,newReleases:songs};
 else if(['smart-autoplay-candidates','search-suggestions'].includes(name))value=[];
 else if(!live&&['search-music','search-artist'].includes(name)){const q=String(args[1]);await new Promise(r=>setTimeout(r,q==='slow first'?350:20));value=songs.map(s=>({...s,title:q+' '+s.title}));}
 else if(!live&&name==='prefetch-song')value={success:false,busy:true};
 else if(!live&&name==='stream-song')value={success:true,song:{...args[1],fileUrl:pathToFileURL(file).href,filepath:file}};
 else if(!live&&name==='get-lyrics')value={syncedLyrics:Array.from({length:160},(_,i)=>'['+String(Math.floor(i*3/60)).padStart(2,'0')+':'+String(i*3%60).padStart(2,'0')+']Audit lyric line '+i).join('\n'),source:'audit fixture'};
 else if(!live&&['get-exact-lyrics','upgrade-lyrics-captions','get-lyrics-alternatives'].includes(name))value=null;
 else if(!live&&name==='verify-lyrics-support')value={verified:true};
 else value=await fn(...args);
 return value;
 }finally{if(['search-music','stream-song','get-lyrics','prepare-compatible-playback','get-library'].includes(name)){result.ipc.push({name,ms:Date.now()-t,success:value?.success,reusedExtraction:value?.reusedExtraction,count:Array.isArray(value)?value.length:undefined,error:String(value?.error||'').slice(0,600)});save();}}
 });};
const auditLabel=process.env.DEEPECHO_AUDIT_LABEL?'-'+process.env.DEEPECHO_AUDIT_LABEL:'';
const output=path.join(out,'user-audit-'+(profileOnly?'profile':live?'online':'ui')+auditLabel+'.json');function save(){fs.writeFileSync(output,JSON.stringify(result,null,2));}
let ran=false,pointer;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.on('browser-window-created',(_e,win)=>{
 win.webContents.setAudioMuted(true);win.webContents.setBackgroundThrottling(false);
 win.webContents.on('console-message',(_e,level,message)=>{if(level>=3)result.errors.push(message.slice(0,900));});
 win.on('show',()=>result.visibleWindows.push(win.id));
 win.webContents.on('did-finish-load',async()=>{
 if(ran||!win.webContents.getURL().endsWith('/index.html'))return;ran=true;const wc=win.webContents;
 async function step(name,code,ms=1300){
 const data=await wc.executeJavaScript(`(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));const gaps=[],tasks=[],start=performance.now();let last=start,on=true;const observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>({ms:e.duration,at:e.startTime-start}))));observer.observe({type:'longtask'});function tick(t){if(!on)return;gaps.push(t-last);last=t;requestAnimationFrame(tick)}requestAnimationFrame(tick);let value,error;try{value=await(async()=>{${code}})()}catch(e){error=e.stack}await wait(${ms});on=false;observer.disconnect();gaps.sort((a,b)=>a-b);return {value,error,elapsed:Math.round(performance.now()-start),frames:gaps.length,p95:Math.round(gaps[Math.floor(gaps.length*.95)]||0),max:Math.round(Math.max(0,...gaps)),over50:gaps.filter(x=>x>50).length,longTasks:tasks,tab:document.querySelector('.nav-item.active')?.dataset.tab,paused:audioPlayer.paused,clock:audioPlayer.currentTime,id:currentSong?.id,lines:lyricLines.length,activeLyric,hidden:document.hidden,heap:performance.memory?.usedJSHeapSize,dom:document.getElementsByTagName('*').length};})()`);
 result.steps.push({name,...data});save();console.log(name,JSON.stringify(data));return data;
 }
 try{
 await delay(9000);
 await wc.executeJavaScript("document.getElementById('deSetupSave')?.click();window.deepEchoSmartAutoplay?.setEnabled(false);localStorage.setItem('deepeccho-resume-session-enabled-v1','false')");
 let n=0;pointer=setInterval(()=>{if(!wc.isDestroyed())wc.sendInputEvent({type:'mouseMove',x:Math.round(600+Math.sin(++n*.09)*420),y:Math.round(340+Math.cos(n*.1)*230)})},16);
 await step('home pointer baseline',"return {cards:document.querySelectorAll('#homeView .song-card').length}");
 if(profileOnly){
 wc.debugger.attach('1.3');await wc.debugger.sendCommand('Profiler.enable');await wc.debugger.sendCommand('Profiler.start');
 await step('profile search and play',"await runSearch('song','Audit songs');resultsList.querySelector('.song-row button[title=Play]').click();await wait(1800);return {playing:!audioPlayer.paused}",1800);
 await step('profile lyrics entry',"document.querySelector('[data-tab=lyrics]').click();return {lines:lyricLines.length}",3000);
 const {profile:cpu}=await wc.debugger.sendCommand('Profiler.stop');fs.writeFileSync(path.join(out,'user-audit-renderer.cpuprofile'),JSON.stringify(cpu));
 const counts=new Map();for(const id of cpu.samples||[])counts.set(id,(counts.get(id)||0)+1);result.hotspots=cpu.nodes.map(n=>({name:n.callFrame.functionName,url:n.callFrame.url,line:n.callFrame.lineNumber+1,samples:counts.get(n.id)||0})).sort((a,b)=>b.samples-a.samples).slice(0,30);
 await delay(400);fs.writeFileSync(path.join(out,'user-audit-lyrics-confirmed'+auditLabel+'.png'),(await wc.capturePage()).toPNG());
 await step('collection search newest wins',"smartSetSearchType('artists');const first=runSearch('song','slow first');await wait(30);smartSetSearchType('albums');await runSearch('song','fast newest');await first;return {heading:searchViewTitle.textContent,firstCard:resultsList.firstElementChild?.textContent.slice(0,120),type:smartSearchType};",400);
 for(const theme of ['fluids','rgb']){
 await step('soft background '+theme,`document.querySelector('[data-tab=settings]').click();applyTheme('${theme}');return {theme:document.body.dataset.theme}`,1800);
 await delay(200);fs.writeFileSync(path.join(out,'user-audit-'+theme+auditLabel+'.png'),(await wc.capturePage()).toPNG());
 }
 await step('paused lyrics entry follows original clock',"audioPlayer.pause();audioPlayer.currentTime=16;await wait(180);document.querySelector('[data-tab=settings]').click();document.querySelector('[data-tab=lyrics]').click();await wait(180);return {active:activeLyric,current:lyricsBody.querySelector('.lyric-line.current')?.dataset.line,word:lyricsBody.querySelector('.word-current')?.textContent,paused:audioPlayer.paused}",500);
 await step('Calm prepared first visit',"applyTheme('golden');document.querySelector('[data-tab=feelHappy]').click();return {gpu:!!document.getElementById('calmGrassGPU')}",1800);
 await delay(200);fs.writeFileSync(path.join(out,'user-audit-calm'+auditLabel+'.png'),(await wc.capturePage()).toPNG());
 }else if(live){
 if(process.env.DEEPECHO_AUDIT_FORCE_COMPAT==='1')await wc.executeJavaScript("const auditOriginalPlay=audioPlayer.play.bind(audioPlayer);let auditRejected=false;audioPlayer.play=()=>{if(!auditRejected&&audioPlayer.src.startsWith('http://127.0.0.1:')){auditRejected=true;return Promise.reject(new DOMException('Controlled first-container rejection','NotSupportedError'))}return auditOriginalPlay()};void 0");
 for(const q of (process.env.DEEPECHO_AUDIT_FORCE_COMPAT==='1'?['Golden Brown The Stranglers']:['Husn Anuv Jain official audio','Tum Hi Ho Arijit Singh official audio','Golden Brown The Stranglers'])){
 const search=await step('search '+q,`searchInput.value=${JSON.stringify(q)};searchBtn.click();const t=performance.now();while(performance.now()-t<35000){await wait(100);if(resultsList.querySelector('.song-row')||searchHint.textContent.startsWith('Error:')||searchHint.textContent.startsWith('Search failed:')||searchHint.textContent==='No results found.')break;}return {ms:Math.round(performance.now()-t),rows:resultsList.querySelectorAll('.song-row').length,hint:searchHint.textContent};`,100);
 if(search.value?.rows){await step('play '+q,`let first=null;const t=performance.now(),played=()=>first=Math.round(performance.now()-t);audioPlayer.addEventListener('playing',played,{once:true});resultsList.querySelector('.song-row button[title="Play"]').click();while(first===null&&performance.now()-t<30000)await wait(100);audioPlayer.removeEventListener('playing',played);return {firstAudioMs:first,loading:document.getElementById('playLoadingText')?.textContent,error:audioPlayer.error?.code};`,800);if(process.env.DEEPECHO_AUDIT_NEXT==='1'&&q.startsWith('Husn')){
await delay(1200);
await step('Next after two seconds',"const before=currentSong.id,t=performance.now();let first=null;audioPlayer.addEventListener('playing',()=>first=Math.round(performance.now()-t),{once:true});nextBtn.click();while(first===null&&performance.now()-t<20000)await wait(20);return {before,after:currentSong?.id,firstAudioMs:first,error:audioPlayer.error?.code}",300);
await step('Previous immediately',"const before=currentSong.id,t=performance.now();let first=null;audioPlayer.addEventListener('playing',()=>first=Math.round(performance.now()-t),{once:true});previousBtn.click();while(first===null&&performance.now()-t<20000)await wait(20);return {before,after:currentSong?.id,firstAudioMs:first,error:audioPlayer.error?.code}",300);
}
await step('online lyrics '+q,"document.querySelector('[data-tab=lyrics]').click();return {source:lyricsQuery?.title}",1600);await wc.executeJavaScript('audioPlayer.pause()');}
 }
 }else{
 await step('search 48 results',"searchInput.value='Audit songs';searchBtn.click();const t=performance.now();while(resultsList.querySelectorAll('.song-row').length<48&&performance.now()-t<4000)await wait(20);return {readyMs:Math.round(performance.now()-t),rows:resultsList.querySelectorAll('.song-row').length}");
 await step('play search result',"const t=performance.now();let first=null;audioPlayer.addEventListener('playing',()=>first=Math.round(performance.now()-t),{once:true});resultsList.querySelector('.song-row button[title=Play]').click();while(first===null&&performance.now()-t<5000)await wait(20);return {firstAudioMs:first}",2100);
 await step('next after two seconds',"const before=currentSong.id,t=performance.now();nextBtn.click();while(currentSong.id===before&&performance.now()-t<3000)await wait(20);while(audioPlayer.paused&&performance.now()-t<3000)await wait(20);return {before,after:currentSong.id,ms:Math.round(performance.now()-t)}");
 await step('previous song',"previousBtn.click();await wait(200);return {song:currentSong.id}");
 await step('pause then resume',"playPauseBtn.click();await wait(180);const paused=audioPlayer.paused;playPauseBtn.click();await wait(180);return {paused,resumed:!audioPlayer.paused}");
 await step('seek forward',"audioPlayer.currentTime=16;await wait(200);return {at:audioPlayer.currentTime,mediaError:audioPlayer.error?.code}");
 for(const tab of ['lyrics','home','settings','lyrics','search','library','liked','playlists','history','stats','feelHappy','lyrics','home'])await step('enter '+tab,`const el=document.querySelector('[data-tab="${tab}"]');if(!el)throw new Error('Missing navigation ${tab}');const t=performance.now();el.click();return {clickMs:performance.now()-t,view:document.querySelector('.view.active')?.id};`,1500);
 await step('like a song',"document.querySelector('[data-tab=search]').click();const btn=resultsList.querySelector('.song-row button[title*=Like]')||resultsList.querySelector('.song-row .action-like');if(!btn)return {missing:true};btn.click();return {liked:getStored(STORAGE.liked,[]).length}");
 await step('create playlist',"document.querySelector('[data-tab=playlists]').click();newPlaylistBtn.click();createPlaylistInput.value='Audit playlist';createPlaylistSave.click();return {saved:!!getPlaylists()['Audit playlist'],modalHidden:createPlaylistModal.classList.contains('hidden')}");
 await step('add song to playlist',"document.querySelector('[data-tab=search]').click();resultsList.querySelector('.song-row .action-add').click();await wait(40);Array.from(document.querySelectorAll('.playlist-choice')).find(x=>x.textContent.includes('Audit playlist')).click();return {count:getPlaylists()['Audit playlist'].length}");
 await step('play playlist',"document.querySelector('[data-tab=playlists]').click();const card=Array.from(document.querySelectorAll('.playlist-card')).find(x=>x.textContent.includes('Audit playlist'));card.querySelector('.playlist-play-btn').click();await wait(200);return {context:activeContext?.label}");
 await step('queue open close',"document.getElementById('queueToggleBtn').click();await wait(100);const opened=!queuePanel.classList.contains('hidden');document.getElementById('queueCloseBtn').click();return {opened,closed:queuePanel.classList.contains('hidden')}");
 await step('search race newest wins',"const first=runSearch('song','slow first');await wait(30);await runSearch('song','fast newest');await first;return {firstTitle:resultsList.querySelector('.title')?.textContent,rows:resultsList.querySelectorAll('.song-row').length}");
 for(const theme of ['golden','light','dark','purple','toxic','blood','silver','transparent','fluids','rgb','love','space','nebula','dragon'])await step('theme '+theme,`document.querySelector('[data-tab=settings]').click();const t=performance.now();document.querySelector('[data-theme-choice="${theme}"]').click();return {switchMs:performance.now()-t,applied:document.body.dataset.theme};`,650);
 await wc.executeJavaScript("applyTheme('golden');activateTab('lyrics')");await delay(400);
 fs.writeFileSync(path.join(out,'user-audit-lyrics.png'),(await wc.capturePage()).toPNG());
 for(let i=0;i<3;i++)await step('repeat navigation '+i,`for(const tab of ['home','lyrics','settings','search','feelHappy']){document.querySelector('[data-tab="'+tab+'"]').click();await wait(160)}return {audio:!audioPlayer.paused}`,400);
 }
 result.final=await wc.executeJavaScript("({playing:!audioPlayer.paused,mediaError:audioPlayer.error?.code,theme:document.body.dataset.theme,view:document.querySelector('.view.active')?.id,hidden:document.hidden})");
 result.graphics=app.getGPUFeatureStatus();
 }catch(e){result.fatal=e.stack}finally{clearInterval(pointer);result.finished=new Date().toISOString();save();app.quit();}
 });
});
require(path.join(root,'main.js'));
setTimeout(()=>{result.timeout=true;save();clearInterval(pointer);app.quit()},live?205000:135000);
