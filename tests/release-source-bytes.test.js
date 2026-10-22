const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('Git staging and Windows checkout preserve both exact-byte guarded source files',()=>{
 const candidates=process.platform==='win32'?[path.join(process.env.ProgramFiles||'C:/Program Files','Git/cmd/git.exe'),'git.exe']:['git'];
 const git=candidates.find(exe=>spawnSync(exe,['--version'],{windowsHide:true}).status===0);assert.ok(git,'Git must be available for release source verification');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'deepecho-source-bytes-'));
 try{
 const run=(args)=>{const r=spawnSync(git,['-c','core.autocrlf=true',...args],{cwd:dir,windowsHide:true});assert.equal(r.status,0,r.stderr?.toString());return r.stdout;};
 run(['init','-b','main']);fs.copyFileSync(path.join(root,'.gitattributes'),path.join(dir,'.gitattributes'));fs.mkdirSync(path.join(dir,'lib'));
 for(const rel of ['main.js','lib/ytdlp-smart.js'])fs.copyFileSync(path.join(root,rel),path.join(dir,rel));
 run(['add','.gitattributes','main.js','lib/ytdlp-smart.js']);
 for(const rel of ['main.js','lib/ytdlp-smart.js'])assert.deepEqual(run(['show',':'+rel]),fs.readFileSync(path.join(root,rel)),rel+' staged bytes');
 fs.mkdirSync(path.join(dir,'output'));run(['checkout-index','--all','--prefix=output/']);
 for(const rel of ['main.js','lib/ytdlp-smart.js'])assert.deepEqual(fs.readFileSync(path.join(dir,'output',rel)),fs.readFileSync(path.join(root,rel)),rel+' checkout bytes');
 }finally{
 const resolved=path.resolve(dir),base=path.resolve(os.tmpdir())+path.sep;assert.ok(resolved.startsWith(base)&&path.basename(resolved).startsWith('deepecho-source-bytes-'));fs.rmSync(resolved,{recursive:true,force:true});
 }
});
