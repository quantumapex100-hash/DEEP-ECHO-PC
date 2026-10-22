const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),yaml=require('js-yaml'),{spawnSync}=require('node:child_process');
const workflow=yaml.load(fs.readFileSync('.github/workflows/release-windows.yml','utf8'));
const block=workflow.jobs['build-release'].steps.find(s=>s.name==='Refuse duplicate publication').run;
function run(code,message){
 const script=`$ErrorActionPreference='Stop';$env:RELEASE_REPO='fixture/release';function global:gh{$global:LASTEXITCODE=${code};Write-Output '${message}'};\n${block}\nif(Test-Path variable:LASTEXITCODE){exit $LASTEXITCODE}`;
 return spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',script],{encoding:'utf8',windowsHide:true,timeout:15000});
}
test('an expected unpublished-release 404 succeeds under the GitHub runner exit wrapper',{skip:process.platform!=='win32'},()=>{const r=run(1,'gh: Not Found (HTTP 404)');assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/unpublished; continuing/);});
test('an existing release is refused',{skip:process.platform!=='win32'},()=>{const r=run(0,'{"tag_name":"v2.6.7"}');assert.notEqual(r.status,0);assert.match(r.stderr,/already has a release/);});
test('permission and network failures do not masquerade as unpublished releases',{skip:process.platform!=='win32'},()=>{for(const message of ['gh: Forbidden (HTTP 403)','gh: connection timed out']){const r=run(1,message);assert.notEqual(r.status,0);assert.match(r.stderr,/Cannot verify release availability/);}});
