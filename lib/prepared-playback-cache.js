const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
function findPreparedPlayback(directory,id,now=Date.now()){
  if(!/^[A-Za-z0-9_-]+$/.test(String(id||'')))return null;
  try{
    const prefix=`stream-${id}.`;
    const items=fs.readdirSync(directory).filter(name=>name.startsWith(prefix)&&/\.(m4a|webm|mp3|ogg|opus|mp4|aac|wav|flac)$/i.test(name)).flatMap(name=>{
      try{const filepath=path.join(directory,name),stat=fs.statSync(filepath);return stat.isFile()&&stat.size>0&&now-stat.mtimeMs<12*60*60*1000?[{filepath,mtime:stat.mtimeMs}]:[]}catch{return []}
    }).sort((a,b)=>b.mtime-a.mtime);
    return items[0]?{filepath:items[0].filepath,fileUrl:pathToFileURL(items[0].filepath).href}:null;
  }catch{return null}
}
module.exports={findPreparedPlayback};
