const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),base=path.join(root,'bin','yt-dlp.exe');
const select=require('../lib/fast-ytdlp-runtime').createRuntimeSelector(),{runYtDlpSmart}=require('../lib/ytdlp-smart');
module.exports=(async()=>{
 const results=[];
 for(const id of ['1ncISVNNzZg','dQw4w9WgXcQ']){
  const start=Date.now();const {stdout}=await runYtDlpSmart(select(base,{purpose:'playback'}),[...(process.env.DEEPECHO_CHECK_FORMATS?['--check-formats']:[]),'--plugin-dirs',path.join(root,'lib','playback-plugins'),'--no-warnings','--no-playlist','--socket-timeout','8','--retries','1','-f','bestaudio[ext=m4a]/bestaudio','-J','https://www.youtube.com/watch?v='+id],{purpose:'playback',timeout:30000,clientOrder:process.env.DEEPECHO_FORMAT_CLIENT?[process.env.DEEPECHO_FORMAT_CLIENT]:['default','web_embedded','android_vr'],ignoreGlobalBackoff:true,affectsGlobalBackoff:false});
  const info=JSON.parse(stdout),formats=info.formats.filter(f=>f.vcodec==='none'&&/^https?:/.test(f.url)&&['m4a','webm'].includes(f.ext)&&! /m3u8|dash_segments/.test(f.protocol||'')).sort((a,b)=>(b.abr||0)-(a.abr||0)).slice(0,6);
  const measured=await Promise.all(formats.map(async f=>{const t=Date.now();try{const r=await fetch(f.url,{headers:{...info.http_headers,...f.http_headers,Range:'bytes=0-1023'},signal:AbortSignal.timeout(4000)});const status=r.status;await r.body?.cancel();return {format:f.format_id,ext:f.ext,codec:f.acodec,status,ms:Date.now()-t}}catch(e){return {format:f.format_id,ext:f.ext,error:e.name,ms:Date.now()-t}}}));
  const variants=await Promise.all(['open-range','query-range','no-range','requested'].map(async mode=>{const t=Date.now();if(mode==='requested'&&!info.requested_downloads?.[0]?.url)return {mode,missing:true};const u=new URL(mode==='requested'?info.requested_downloads[0].url:info.url),headers={...info.http_headers};if(mode==='open-range')headers.Range='bytes=0-';if(mode==='query-range')u.searchParams.set('range','0-1023');try{const r=await fetch(u,{headers,signal:AbortSignal.timeout(4000)});const status=r.status;await r.body?.cancel();return {mode,status,ms:Date.now()-t}}catch(e){return {mode,error:e.name,ms:Date.now()-t}}}));
  results.push({id,resolveMs:Date.now()-start,selected:info.format_id,formats:measured,variants});fs.writeFileSync(path.join(root,'.startup-diagnostic','playback-formats.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.at(-1)));
 }
})().catch(e=>{console.error(e.code||e.name);process.exitCode=1});
