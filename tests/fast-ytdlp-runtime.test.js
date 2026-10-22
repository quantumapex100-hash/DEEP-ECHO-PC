const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
const {createRuntimeSelector}=require('../lib/fast-ytdlp-runtime');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'deepecho-fast-runtime-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const base=path.join(dir,'yt-dlp.exe'),fast=path.join(dir,'fast-ytdlp','yt-dlp.exe');
  fs.mkdirSync(path.dirname(fast));fs.writeFileSync(base,'original');fs.writeFileSync(fast,'unpacked');
  const manifest={sourceSha256:hash(base),files:[{path:'yt-dlp.exe',size:8,sha256:hash(fast)}]};
  const save=()=>fs.writeFileSync(path.join(dir,'fast-ytdlp','deepecho-runtime.json'),JSON.stringify(manifest));save();
  return {base,fast,manifest,save,select:createRuntimeSelector()};
}
test('same verified extractor runtime accelerates only Search, Play, prefetch and temporary classic playback',t=>{
  const f=fixture(t);for(const purpose of ['search','playback','prefetch','classic-playback'])assert.equal(f.select(f.base,{purpose}),f.fast);
  for(const purpose of ['download','captions','lyrics','generic','smart-cache',undefined])assert.equal(f.select(f.base,{purpose}),f.base);
});
test('missing or corrupt unpacked runtime falls back to original executable',t=>{
  const f=fixture(t);fs.writeFileSync(f.fast,'corrupt!');assert.equal(f.select(f.base,{purpose:'playback'}),f.base);
  fs.unlinkSync(f.fast);assert.equal(createRuntimeSelector()(f.base,{purpose:'search'}),f.base);
});
test('an updated original extractor invalidates the previously selected fast build',t=>{
  const f=fixture(t);assert.equal(f.select(f.base,{purpose:'search'}),f.fast);
  fs.writeFileSync(f.base,'new version of original');assert.equal(f.select(f.base,{purpose:'search'}),f.base);
});
test('manifest cannot reference files outside the unpacked directory',t=>{
  const f=fixture(t);f.manifest.files=[{path:'../yt-dlp.exe',size:8,sha256:hash(f.base)}];f.save();
  assert.equal(f.select(f.base,{purpose:'search'}),f.base);
});
