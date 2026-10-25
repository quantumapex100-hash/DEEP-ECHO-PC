const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),{runYtDlpSmart}=require('../lib/ytdlp-smart');
const exe=require('../lib/fast-ytdlp-runtime').createRuntimeSelector()(path.join(root,'bin','yt-dlp.exe'),{purpose:'playback'});
const results=[];
(async()=>{for(const id of ['1ncISVNNzZg','ji1TIBybjp4']){
 for(const client of ['visionos','default','web_embedded']){
 const start=Date.now(),row={id,client};
 try{const {stdout}=await runYtDlpSmart(exe,['--plugin-dirs',path.join(root,'lib','playback-plugins'),'--no-warnings','--no-playlist','--socket-timeout','6','--retries','0','--extractor-retries','0','-f','bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio','-J','https://www.youtube.com/watch?v='+id],{purpose:'playback',timeout:20000,clientOrder:[client],ignoreGlobalBackoff:true,affectsGlobalBackoff:false});const info=JSON.parse(stdout);row.resolveMs=Date.now()-start;row.selected=info.format_id;row.availableWait=Math.max(0,(Number(info.available_at)||0)*1000-Date.now());
 for(const f of [info,...(info.formats||[]).filter(f=>f.vcodec==='none'&&f.ext==='webm'&&/^https?:/.test(f.url)).slice(-1)]){
 const t=Date.now(),response=await fetch(f.url,{headers:{...info.http_headers,...f.http_headers,Range:'bytes=0-1023'},signal:AbortSignal.timeout(4500)});(row.formats||=[]).push({format:f.format_id,status:response.status,ms:Date.now()-t,wait:Math.max(0,(Number(f.available_at)||0)*1000-Date.now())});await response.body?.cancel();}
 }catch(e){row.error=String(e.stderr||e.message).slice(-900)}
 row.totalMs=Date.now()-start;results.push(row);fs.writeFileSync(path.join(root,'.startup-diagnostic/audit-client-routes.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(row));
 }
 }})().catch(e=>{console.error(e);process.exitCode=1});
