const path=require('path'),fs=require('fs'),{runYtDlpSmart}=require('../lib/ytdlp-smart'),select=require('../lib/fast-ytdlp-runtime').createRuntimeSelector();
(async()=>{const base=path.resolve('bin/yt-dlp.exe'),results=[];
for(const id of ['1ncISVNNzZg','dQw4w9WgXcQ']){
 const t=Date.now();const {stdout}=await runYtDlpSmart(select(base,{purpose:'playback'}),[...(process.env.DEEPECHO_AVAIL_CLIENT?['--extractor-args','youtube:player_client='+process.env.DEEPECHO_AVAIL_CLIENT+(process.env.DEEPECHO_AVAIL_SKIP?';player_skip='+process.env.DEEPECHO_AVAIL_SKIP:'')]:[]),'--plugin-dirs',path.resolve('lib/playback-plugins'),'--no-warnings','--no-playlist','--socket-timeout','5','--retries','0','-f','bestaudio[ext=m4a]/bestaudio','-J','https://www.youtube.com/watch?v='+id],{purpose:'playback',timeout:30000,clientOrder:['default','web_embedded','android_vr'],ignoreGlobalBackoff:true,affectsGlobalBackoff:false});
 const i=JSON.parse(stdout),check=async()=>{const r=await fetch(i.url,{headers:{...i.http_headers,Range:'bytes=0-1023'},signal:AbortSignal.timeout(3000)});await r.body?.cancel();return r.status};
 const remaining=Math.max(0,(Number(i.available_at)||0)*1000-Date.now()),before=await check();
 const item={id,resolveMs:Date.now()-t,format:i.format_id,remainingMs:remaining,before};results.push(item);fs.writeFileSync('.startup-diagnostic/playback-availability.json',JSON.stringify(results,null,2));console.log(JSON.stringify(item));
 if(remaining>0&&remaining<20000){await new Promise(r=>setTimeout(r,remaining+200));item.after=await check();item.totalMs=Date.now()-t;console.log(JSON.stringify(item));fs.writeFileSync('.startup-diagnostic/playback-availability.json',JSON.stringify(results,null,2))}
}
})().catch(e=>console.log(e.code||e.name));
