param([Parameter(Mandatory=$true)][string]$ExpectedVersion,[switch]$CheckOnly,[switch]$Recovery,[switch]$PrepareOnly,[switch]$AutoRecovery)
$ErrorActionPreference='Stop'
$sourceRoot=Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $sourceRoot
$package=Get-Content package.json -Raw | ConvertFrom-Json
$lockVersions=& node.exe -p "const l=require('./package-lock.json');[l.version,l.packages[''].version].join('|')"
if($LASTEXITCODE -ne 0){throw 'Cannot read lockfile versions.'}
$tag="v$ExpectedVersion"
if($Recovery){$tag="v$ExpectedVersion-build2"}
if($ExpectedVersion -ne '2.6.7' -or $package.version -ne $ExpectedVersion -or $lockVersions -ne "$ExpectedVersion|$ExpectedVersion"){throw 'Package and lock versions must all be 2.6.7.'}
if(!('windowsdaiyu-cyber','quantumapex100-hash' -contains $package.build.publish[0].owner) -or !('DEEP-ECHO-Releases','DEEP-ECHO-PC' -contains $package.build.publish[0].repo)){throw 'Unexpected release destination.'}
foreach($required in @('.github/workflows/release-windows.yml','RELEASE-NOTES-2.6.7.md','src/home-discovery.js','src/home-discovery.css','bin/yt-dlp.exe','.gitignore','.gitattributes')){
  # GitHub bundles yt-dlp; its presence locally is not a publishing requirement.
  if($required -eq 'bin/yt-dlp.exe'){continue}
  if(!(Test-Path -LiteralPath $required)){throw "Missing release input: $required"}
}
$workflow=Get-Content '.github/workflows/release-windows.yml' -Raw
foreach($gate in @('npm ci --no-audit --no-fund','npm test','npm run release','latest.yml','RELEASE-NOTES-2.6.7.md')){
  if(!$workflow.Contains($gate)){throw "Cloud validation gate missing: $gate"}
}
Write-Host '[OK] 2.6.7 metadata and cloud release inputs verified.'
if($CheckOnly){Write-Host '[OK] CheckOnly: no Git/network/tag/publish operations performed.';exit 0}

# Release-process only: reuse Windows credentials or open browser OAuth. A cancelled
# browser must stop cleanly instead of falling back to a terminal username/password.
$env:GIT_TERMINAL_PROMPT='0'
$env:GCM_INTERACTIVE='true'
$env:GCM_GITHUB_AUTHMODES='browser'
$releaseGitOptions=@('-c','credential.helper=','-c','credential.helper=manager','-c','credential.interactive=true','-c','credential.gitHubAuthModes=browser','-c','credential.username=windowsdaiyu-cyber')
& git.exe credential-manager --version *> $null
if($LASTEXITCODE -ne 0){throw 'Git Credential Manager missing. Install Git for Windows with Git Credential Manager enabled, then run this BAT again.'}
Write-Host '[INFO] Existing GitHub sign-in will be reused. If a browser opens, complete Sign in / Authorize; do not close it.'

function Invoke-ReleaseGit {
  param([string[]]$GitArgs)
  & git.exe @releaseGitOptions @GitArgs
  if($LASTEXITCODE -ne 0){throw "Git operation failed: $($GitArgs[0]). Nothing will be force-pushed."}
}
$sourceRepo='https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git'
Write-Host '[2/8] Checking GitHub access and existing release tags...'
$existing=& git.exe @releaseGitOptions ls-remote --tags $sourceRepo "refs/tags/$tag"
if($LASTEXITCODE -ne 0){throw 'GitHub sign-in or source access did not complete. Run the BAT again and finish browser Sign in / Authorize. No terminal username/password is needed.'}
if($existing -and !$AutoRecovery){throw "$tag already exists. Release stopped to prevent duplicate publication."}
$publishedTag=& git.exe @releaseGitOptions ls-remote --tags 'https://github.com/windowsdaiyu-cyber/DEEP-ECHO-Releases.git' "refs/tags/v$ExpectedVersion"
if($LASTEXITCODE -ne 0){throw 'Cannot check the release repository. Release stopped before changing source.'}
if($publishedTag){throw "v$ExpectedVersion already exists in the release repository. It will not be overwritten."}
if($existing -and $AutoRecovery){
  # A previous source tag can exist even when its cloud build never published.
  # Select an unused retry tag; never move/delete an existing source/release tag.
  $retryTags=& git.exe @releaseGitOptions ls-remote --tags $sourceRepo "refs/tags/v$ExpectedVersion-build*"
  if($LASTEXITCODE -ne 0){throw 'Cannot inspect previous build tags. No source was changed.'}
  $build=2
  $used=@($retryTags | ForEach-Object {if($_ -match ('refs/tags/v'+[regex]::Escape($ExpectedVersion)+'-build([0-9]+)(?:\^\{\})?$')){[int]$Matches[1]}})
  while($used -contains $build){$build++}
  $tag="v$ExpectedVersion-build$build"
  Write-Host "[INFO] Previous source attempt found; new build tag: $tag. Existing tags are preserved."
}
Write-Host '[3/8] Preparing a separate release checkout; development source is preserved.'
$releaseBase=Join-Path $env:LOCALAPPDATA 'DEEP-ECHO/ReleaseWork'
$releaseRoot=Join-Path $releaseBase ($tag+'-'+[Guid]::NewGuid().ToString('N').Substring(0,12))
New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
Write-Host "Release checkout (outside OneDrive): $releaseRoot"
Set-Location -LiteralPath $releaseRoot
Invoke-ReleaseGit -GitArgs @('init','-b','main')
Invoke-ReleaseGit -GitArgs @('remote','add','origin',$sourceRepo)
# Fetch into an existing repository: failed transfers cannot trigger clone's
# interactive deletion loop. Only the current main snapshot is needed.
$fetched=$false
for($attempt=1;$attempt -le 3;$attempt++){
  Write-Host "Downloading source snapshot: attempt $attempt/3"
  & git.exe @releaseGitOptions -c http.version=HTTP/1.1 fetch --depth 1 --no-tags origin 'refs/heads/main:refs/remotes/origin/main'
  if($LASTEXITCODE -eq 0){$fetched=$true;break}
  if($attempt -lt 3){Start-Sleep -Seconds 2}
}
if(!$fetched){throw 'Source download failed after 3 attempts. No source/tag was pushed. Check your connection and run the BAT again.'}
Invoke-ReleaseGit -GitArgs @('checkout','-B','main','origin/main')

# Only source/release inputs are copied. No node_modules, downloaded binaries,
# local backups, saved data, temporary previews or build outputs are staged.
$include=@('main.js','preload.js','package.json','package-lock.json','release-config.json','.gitignore','.gitattributes','src','lib','tests','scripts','.github')
Write-Host '[4/8] Copying official source and cloud workflow...'
$include+=@(Get-ChildItem -LiteralPath $sourceRoot -File | Where-Object { $_.Extension -in '.bat','.md','.txt' } | Select-Object -ExpandProperty Name)
foreach($relative in ($include | Select-Object -Unique)){
  $from=Join-Path $sourceRoot $relative
  $to=Join-Path $releaseRoot $relative
  if(Test-Path -LiteralPath $from -PathType Container){
    New-Item -ItemType Directory -Path $to -Force | Out-Null
    Get-ChildItem -LiteralPath $from -Force | ForEach-Object {Copy-Item -LiteralPath $_.FullName -Destination $to -Recurse -Force}
  }elseif(Test-Path -LiteralPath $from){Copy-Item -LiteralPath $from -Destination $to -Force}
}
Set-Location -LiteralPath $releaseRoot
if($PrepareOnly){Write-Host "[OK] PrepareOnly: source downloaded and copied to $releaseRoot. No commit/push/tag/publication performed.";exit 0}
$gitName=& git.exe @releaseGitOptions config user.name
Write-Host '[5/8] Preparing the release commit...'
if(!$gitName){Invoke-ReleaseGit -GitArgs @('config','user.name','windowsdaiyu-cyber')}
$gitEmail=& git.exe @releaseGitOptions config user.email
if(!$gitEmail){Invoke-ReleaseGit -GitArgs @('config','user.email','windowsdaiyu-cyber@users.noreply.github.com')}
Invoke-ReleaseGit -GitArgs (@('add','--') + @($include | Select-Object -Unique))
& git.exe @releaseGitOptions diff --cached --quiet
if($LASTEXITCODE -eq 1){Invoke-ReleaseGit -GitArgs @('commit','-m','Release DEEP-ECHO v2.6.7')}
elseif($LASTEXITCODE -ne 0){throw 'Unable to inspect staged release changes.'}
Write-Host '[6/8] Pushing source to GitHub main...'
Invoke-ReleaseGit -GitArgs @('push','origin','HEAD:main')
Write-Host '[7/8] Pushing the version tag to trigger cloud tests/build/publish...'
Invoke-ReleaseGit -GitArgs @('tag','-a',$tag,'-m','DEEP-ECHO 2.6.7')
Invoke-ReleaseGit -GitArgs @('push','origin',$tag)
Write-Host "[8/8] Source and $tag tag pushed. Cloud tests/build/publication are now running. App version remains $ExpectedVersion."
Write-Host 'Workflow: https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions'
Write-Host 'Release after successful workflow: https://github.com/windowsdaiyu-cyber/DEEP-ECHO-Releases/releases/tag/v2.6.7'
