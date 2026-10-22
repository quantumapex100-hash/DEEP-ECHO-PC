const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process'),fs=require('node:fs');
function run(published){
 const helper=path.resolve('scripts/release-windows.ps1').replace(/'/g,"''");
 const script=`$ErrorActionPreference='Stop';$global:calls=@();function global:git.exe {$items=@($args);$global:calls+=,@($items);$global:LASTEXITCODE=0;if($items -contains 'credential-manager'){'test-manager';return};if($items -contains 'ls-remote') {if($items -contains 'refs/tags/v2.6.7-build*'){'hash refs/tags/v2.6.7-build2';'hash refs/tags/v2.6.7-build2^{}';'hash refs/tags/v2.6.7-build3';return};if($items -contains 'https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git'){'hash refs/tags/v2.6.7';return};${published?"'hash refs/tags/v2.6.7'":''}}};function global:New-Item {throw 'TEST_STOP_BEFORE_CHECKOUT'};try{& '${helper}' -ExpectedVersion '2.6.7' -AutoRecovery;throw 'Expected stop'}catch{Write-Output ('TEST_REASON:'+$_.Exception.Message)};Write-Output ('TEST_CALLS:'+($global:calls|ConvertTo-Json -Depth 5 -Compress))`;
 const r=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',script],{encoding:'utf8',windowsHide:true,timeout:20000});assert.equal(r.status,0,r.stderr);return r.stdout;
}
test('one click workflow selects a fresh retry tag before changing source',{skip:process.platform!=='win32'},()=>{
 const out=run(false);assert.match(out,/new build tag: v2\.6\.7-build4/);assert.match(out,/TEST_STOP_BEFORE_CHECKOUT/);assert.doesNotMatch(out,/"push"/);
});
test('one click workflow refuses an already published app version',{skip:process.platform!=='win32'},()=>{
 const out=run(true);assert.match(out,/already exists in the release repository/);assert.doesNotMatch(out,/TEST_STOP_BEFORE_CHECKOUT|"push"/);
});
test('workflow retry validation handles build10 and rejects unrelated app versions',{skip:process.platform!=='win32'},()=>{
 const workflow=fs.readFileSync('.github/workflows/release-windows.yml','utf8'),line=workflow.split(/\r?\n/).find(x=>x.trim().startsWith('$retryPattern ='));
 const script=`$packageVersion='2.6.7';${line};foreach($tag in @('v2.6.7-build2','v2.6.7-build10','v2.6.5-build2','v2.6.7-build1')){Write-Output ($tag+':'+[bool]($tag -match $retryPattern))}`;
 const r=spawnSync('powershell.exe',['-NoProfile','-Command',script],{encoding:'utf8',windowsHide:true,timeout:10000});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/v2\.6\.7-build2:True/);assert.match(r.stdout,/v2\.6\.7-build10:True/);assert.match(r.stdout,/v2\.6\.5-build2:False/);assert.match(r.stdout,/v2\.6\.7-build1:False/);
});
