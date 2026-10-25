const {app,ipcMain,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'.startup-diagnostic','speed-profile');
fs.mkdirSync(dir,{recursive:true});
for(const name of ['appData','userData','music','temp']){const target=path.join(dir,name);fs.mkdirSync(target,{recursive:true});app.setPath(name,target);}
app.setAppPath(root);
const handlers=new Map(),handle=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(name,fn)=>{handlers.set(name,fn);handle(name,fn);};
const results=[],record=data=>{results.push(data);fs.writeFileSync(path.join(root,'.startup-diagnostic','speed-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(data));};
process.env.DEEPECHO_PLAYBACK_DEBUG='1';
const debug=console.debug;
console.debug=(...args)=>{if(args[0]==='[playback-timing]')record({stage:'timing',event:args[1],data:args[2]});else debug(...args);};
app.on('browser-window-created',(_event,win)=>{win.show=()=>{};});
const timeout=setTimeout(()=>{record({stage:'timeout'});app.quit();},100000);
if(process.env.DEEPECHO_PROBE_EMBEDDED==='1'){
  const smart=require('../lib/ytdlp-smart'),base=smart.runYtDlpSmart;
  smart.runYtDlpSmart=(exe,args,options)=>base(exe,args,options.purpose==='playback'?{...options,clientOrder:['web_embedded']}:options);
}
require(path.join(root,'main.js'));
app.whenReady().then(async()=>{
  const event={sender:{isDestroyed:()=>false,send(){}}};
  try{
    let t=Date.now();const songs=await handlers.get('search-music')(event,'Husn Anuv Jain');
    record({stage:'search',ms:Date.now()-t,count:songs?.length,error:songs?.error});
    if(!Array.isArray(songs)||!songs.length)throw new Error('No search results');
    const song=songs.find(s=>s.id==='1ncISVNNzZg')||{id:'1ncISVNNzZg',title:'Husn',channel:'Anuv Jain',url:'https://www.youtube.com/watch?v=1ncISVNNzZg'};
    t=Date.now();const res=await handlers.get('stream-song')(event,song,1,'auto');
    record({stage:'stream-resolve',ms:Date.now()-t,id:song.id,success:res.success,error:res.error});
    if(!res.success)throw new Error('No stream');
    const media=new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true}});
    await media.loadURL('data:text/html,<html><body>Audio timing fixture</body></html>');
    const url=res.song.streamUrl||res.song.fileUrl;
    const measurements=await media.webContents.executeJavaScript(`(async()=>{const a=new Audio();a.muted=true;a.crossOrigin='anonymous';a.src=${JSON.stringify(url)};const start=performance.now();const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Media start timeout')),12000));await Promise.race([a.play(),timeout]);const ms=Math.round(performance.now()-start);const tracks=a.captureStream?.().getAudioTracks().length;const duration=a.duration;const seek=Math.min(45,duration-1);await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('Seek timeout')),10000);a.addEventListener('seeked',()=>{clearTimeout(t);resolve();},{once:true});a.currentTime=seek;});a.pause();return {ms,tracks,duration,seek:a.currentTime};})()`);
    record({stage:'first-audio',...measurements});
  }catch(e){record({stage:'error',error:e.message});}
  finally{clearTimeout(timeout);app.quit();}
});
