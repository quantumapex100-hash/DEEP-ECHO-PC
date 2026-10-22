'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toLowerCase();
function createRuntimeSelector(){
  const cache=new Map();
  return function select(executable,options={}){
    if(!['search','playback','prefetch','classic-playback'].includes(options.purpose))return executable;
    try{
      const directory=path.join(path.dirname(executable),'fast-ytdlp');
      const manifestFile=path.join(directory,'deepecho-runtime.json');
      const stat=fs.statSync(executable),manifestStat=fs.statSync(manifestFile);
      const stamp=[stat.size,stat.mtimeMs,manifestStat.mtimeMs].join(':');
      const previous=cache.get(executable);
      if(previous?.stamp===stamp)return previous.runtime;
      const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8').replace(/^\uFEFF/,''));
      let runtime=executable;
      if(manifest.sourceSha256?.toLowerCase()===hash(executable)&&Array.isArray(manifest.files)&&manifest.files.length){
        const root=path.resolve(directory)+path.sep;
        const complete=manifest.files.every(file=>{
          const target=path.resolve(directory,file.path);
          return target.startsWith(root)&&fs.statSync(target).size===file.size&&hash(target)===String(file.sha256).toLowerCase();
        });
        if(complete&&manifest.files.some(file=>file.path==='yt-dlp.exe'))runtime=path.join(directory,'yt-dlp.exe');
      }
      cache.set(executable,{stamp,runtime});return runtime;
    }catch{return executable;}
  };
}
module.exports={createRuntimeSelector};
