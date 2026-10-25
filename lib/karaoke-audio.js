'use strict';
const fs=require('fs');
const path=require('path');
const os=require('os');
const crypto=require('crypto');
const { targetAudioSource }=require('./exact-lyrics');

function safeMode(value='vocal-low'){return value==='instrumental'?'instrumental':'vocal-low';}
function cacheKey(song={},mode='vocal-low'){
  const identity=[song.id,song.url,song.filepath,song.title,song.channel,mode].filter(Boolean).join('|');
  return crypto.createHash('sha1').update(identity).digest('hex').slice(0,20);
}
function filterForMode(mode){
  if(mode==='instrumental')return 'pan=stereo|c0=0.50*c0-0.50*c1|c1=0.50*c1-0.50*c0';
  return 'pan=stereo|c0=0.68*c0-0.32*c1|c1=0.68*c1-0.32*c0';
}
async function prepareKaraokeTrack(song={},mode='vocal-low',options={}){
  mode=safeMode(mode);
  let ffmpegPath='';try{ffmpegPath=require('ffmpeg-static')||'';}catch{}
  if(!ffmpegPath||!fs.existsSync(ffmpegPath))return {success:false,error:'Local FFmpeg is unavailable.'};
  const cacheRoot=options.cacheRoot||path.join(os.tmpdir(),'deepecho-karaoke-cache');fs.mkdirSync(cacheRoot,{recursive:true});
  const output=path.join(cacheRoot,`${cacheKey(song,mode)}-${mode}.m4a`);
  if(fs.existsSync(output)&&fs.statSync(output).size>64*1024)return {success:true,mode,filepath:output,cached:true};
  const jobDir=fs.mkdtempSync(path.join(cacheRoot,'job-'));
  try{
    options.onStatus?.({stage:'karaoke',text:mode==='instrumental'?'Preparing instrumental center-reduction…':'Reducing center vocals locally…',progress:25});
    const input=await targetAudioSource(song,{...options,jobDir});if(!input)return {success:false,error:'Audio source could not be prepared.'};
    const args=['-y','-nostdin'];
    if(/^https?:\/\//i.test(String(input)))args.push('-rw_timeout','15000000','-reconnect','1','-reconnect_streamed','1','-reconnect_delay_max','2');
    args.push('-i',input,'-vn','-af',filterForMode(mode),'-c:a','aac','-b:a','192k','-movflags','+faststart',output);
    await options.execFileAsync(ffmpegPath,args,{maxBuffer:12*1024*1024,windowsHide:true,timeout:240000,signal:options.signal});
    if(!fs.existsSync(output)||fs.statSync(output).size<32*1024)throw new Error('Karaoke audio render was empty.');
    options.onStatus?.({stage:'karaoke',text:'Karaoke audio ready',progress:100});
    return {success:true,mode,filepath:output,cached:false};
  }catch(error){try{fs.rmSync(output,{force:true});}catch{}return {success:false,error:String(error?.message||error)};}
  finally{try{fs.rmSync(jobDir,{recursive:true,force:true});}catch{}}
}
module.exports={safeMode,cacheKey,filterForMode,prepareKaraokeTrack};
