// Run AFTER creating and hosting a Windows installer. Never fabricates a feed URL.
const fs=require('fs'),crypto=require('crypto'),path=require('path');
const {validateManifest}=require('../src/v200-core');
const [installer,url,out='update-manifest.json']=process.argv.slice(2);
if(!installer||!url){console.error('Usage: node scripts/make-update-manifest.cjs dist/DEEP-ECHO-2.1.0-Setup.exe https://YOUR-HOST/DEEP-ECHO-2.1.0-Setup.exe [output.json]');process.exit(1)}
const version=require('../package.json').version;
const manifest=validateManifest({version,url,sha256:crypto.createHash('sha256').update(fs.readFileSync(installer)).digest('hex'),notes:`DEEP-ECHO ${version}`});
fs.writeFileSync(path.resolve(out),JSON.stringify(manifest,null,2)+'\n');console.log('Manifest written:',path.resolve(out));
