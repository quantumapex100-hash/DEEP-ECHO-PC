const {app,ipcMain}=require('electron'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'.startup-diagnostic','early-next-profile-'+Date.now());
for(const name of ['appData','userData','music','temp']){const target=path.join(dir,name);fs.mkdirSync(target,{recursive:true});app.setPath(name,target)}
app.setAppPath(root);app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const handle=ipcMain.handle.bind(ipcMain);ipcMain.handle=(name,fn)=>handle(name,['get-home-feed','smart-autoplay-candidates'].includes(name)||(name==='search-music'&&process.env.DEEPECHO_PROBE_SEARCH!=='1')?async()=>name==='get-home-feed'?{topHits:[],topArtistSongs:[],newReleases:[]}:[]:async(...args)=>{const result=await fn(...args);if(['stream-song','prepare-compatible-playback'].includes(name)){const file=result?.song?.filepath||result?.filepath;console.log(JSON.stringify({handler:name,success:result?.success,local:!!file,fileSize:file&&fs.existsSync(file)?fs.statSync(file).size:null,error:String(result?.error||'').split('ERROR:').slice(-1)[0].slice(0,400)}))}return result});
const output=path.join(root,'.startup-diagnostic','early-next-probe.json');let started=false;
app.on('browser-window-created',(_event,win)=>{
  win.webContents.setAudioMuted(true);win.webContents.setBackgroundThrottling(false);
  win.webContents.on('did-finish-load',async()=>{
    if(started||!win.webContents.getURL().endsWith('/index.html'))return;started=true;
    try{
      const result=await win.webContents.executeJavaScript(`(async()=>{
        await new Promise(r=>setTimeout(r,1400));const results=[];
        const realPlay=audioPlayer.play.bind(audioPlayer);
        const songs=[{id:'dQw4w9WgXcQ',title:'Never Gonna Give You Up',url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'},{id:'dQw4w9WgXcQ',title:'Never Gonna Give You Up',url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}];
        if(${process.env.DEEPECHO_PROBE_ARZ==='1'})songs.splice(0,songs.length,{id:'arz-search',title:'Anuv Jain Arz Kiya Hai',url:''});
        if(${process.env.DEEPECHO_PROBE_REPLAY==='1'})songs.push({...songs[0],title:'Husn replay'});
        songs.splice(1);
        window.deepEchoSmartAutoplay.setEnabled(${process.env.DEEPECHO_PROBE_SMART==='1'});
        for(let song of songs){
          let searchMs=null;
          if(${process.env.DEEPECHO_PROBE_SEARCH==='1'}){
            const searchStart=performance.now(); await runSearch('song',song.title+' official audio');searchMs=Math.round(performance.now()-searchStart);
            const row=resultsList.querySelector('.song-row');if(!row)throw new Error('Search returned no rows');song=knownSongs.get(row.dataset.songId);
          }
          if(${process.env.DEEPECHO_PROBE_QUEUE==='1'})playQueue=[{id:'dQw4w9WgXcQ',title:'Never Gonna Give You Up',url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}];
          let prepareAheadMs=null;
          if(${process.env.DEEPECHO_PROBE_PREPARE_AHEAD==='1'}&&song.id==='dQw4w9WgXcQ'){
            const prepareStart=performance.now();await window.echoAPI.prefetchSong({...song,prefetchPriority:'next',prepareLocalPlayback:true},'auto');prepareAheadMs=Math.round(performance.now()-prepareStart);
          }
          let refused=false;audioPlayer.play=()=>{if(${process.env.DEEPECHO_PROBE_FORCE_COMPAT==='1'}&&!refused&&audioPlayer.src.startsWith('http://127.0.0.1:')){refused=true;return Promise.reject(new DOMException('Controlled unsupported-source recovery test','NotSupportedError'))}return realPlay()};
          const start=performance.now();let done=false,error='',firstAudioMs=null;const started=()=>{firstAudioMs=Math.round(performance.now()-start)};audioPlayer.addEventListener('playing',started,{once:true});if(${process.env.DEEPECHO_PROBE_SEARCH==='1'}){resultsList.querySelector('.song-row button[title="Play"]').click();const completed=()=>{done=true};audioPlayer.addEventListener('playing',completed,{once:true});}else startSingleSong(song).then(()=>done=true).catch(e=>{error=e.message;done=true});
          while(!done&&performance.now()-start<95000)await new Promise(r=>setTimeout(r,250));
          await new Promise(r=>setTimeout(r,400));audioPlayer.removeEventListener('playing',started);results.push({id:song.id,forcedRecovery:refused,prepareAheadMs,searchMs,firstAudioMs,ms:Math.round(performance.now()-start),done,error,paused:audioPlayer.paused,clock:audioPlayer.currentTime,readyState:audioPlayer.readyState,mediaError:audioPlayer.error?.code,classic:!!currentSong?.classicPlayback,sourceKind:audioPlayer.src.startsWith('file:')?'file':audioPlayer.src.startsWith('http://127.0.0.1:')?'relay':'remote',loading:document.getElementById('playLoadingText')?.textContent});
          const firstPlayingAt=start+firstAudioMs;await new Promise(r=>setTimeout(r,Math.max(0,firstPlayingAt+2000-performance.now())));
          const upcoming=smartUpcomingSongs(1)[0];const ready=smartPreparedStreamUrls.has(upcoming?.id);
          const nextStart=performance.now();let nextAudioMs=null;const onNext=()=>{nextAudioMs=Math.round(performance.now()-nextStart)};audioPlayer.addEventListener('playing',onNext,{once:true});nextBtn.click();
          while(nextAudioMs===null&&performance.now()-nextStart<60000)await new Promise(r=>setTimeout(r,100));
          audioPlayer.removeEventListener('playing',onNext);results.push({kind:'next-after-two-seconds',afterAudioMs:Math.round(nextStart-firstPlayingAt),expectedId:upcoming?.id,actualId:currentSong?.id,readyBeforeClick:ready,firstAudioMs:nextAudioMs,paused:audioPlayer.paused,clock:audioPlayer.currentTime});
          if(${process.env.DEEPECHO_PROBE_CACHED_REPEAT==='1'}){
            const nextSong={...currentSong};let replayFirstAt=null;const replayPlayed=()=>replayFirstAt=performance.now();audioPlayer.addEventListener('playing',replayPlayed,{once:true});
            await startSingleSong(song);audioPlayer.removeEventListener('playing',replayPlayed);playQueue=[nextSong];prefetchNextQueued();
            await new Promise(r=>setTimeout(r,Math.max(0,replayFirstAt+2000-performance.now())));
            const repeatStart=performance.now();let repeatMs=null;const repeated=()=>repeatMs=Math.round(performance.now()-repeatStart);audioPlayer.addEventListener('playing',repeated,{once:true});nextBtn.click();
            while(repeatMs===null&&performance.now()-repeatStart<60000)await new Promise(r=>setTimeout(r,50));audioPlayer.removeEventListener('playing',repeated);
            results.push({kind:'cached-next-after-two-seconds',afterAudioMs:Math.round(repeatStart-replayFirstAt),firstAudioMs:repeatMs,actualId:currentSong?.id,paused:audioPlayer.paused,clock:audioPlayer.currentTime});
          }
          audioPlayer.pause();
        }return results;
      })()`);fs.writeFileSync(output,JSON.stringify(result,null,2));
    }catch(e){fs.writeFileSync(output,JSON.stringify({error:e.message}));}finally{app.quit()}
  });
});
require(path.join(root,'main.js'));setTimeout(()=>{fs.writeFileSync(output,JSON.stringify({error:'probe timeout'}));app.quit()},210000);
