const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');

test('2.x is wired to public GitHub releases without changing app identity',()=>{
  const pkg=require('../package.json');
  assert.match(pkg.version,/^2\.\d+\.\d+$/);
  assert.equal(pkg.build.appId,'com.dinecho.app');
  assert.equal(pkg.build.productName,'DEEP-ECHO');
  assert.equal(pkg.dependencies['electron-updater'],'6.6.2');
  assert.equal(pkg.build.publish[0].provider,'github');
  assert.ok(['windowsdaiyu-cyber','quantumapex100-hash'].includes(pkg.build.publish[0].owner));
  assert.ok(['DEEP-ECHO-Releases','DEEP-ECHO-PC'].includes(pkg.build.publish[0].repo));
});

test('main and preload expose check, progress, download and restart update flow',()=>{
  const main=fs.readFileSync(path.join(root,'main.js'),'utf8');
  const preload=fs.readFileSync(path.join(root,'preload.js'),'utf8');
  const ui=fs.readFileSync(path.join(root,'src','v200.js'),'utf8');
  assert.match(main,/require\('electron-updater'\)/);
  assert.match(main,/autoUpdater\.checkForUpdates\(\)/);
  assert.match(main,/autoUpdater\.downloadUpdate\(\)/);
  assert.match(main,/autoUpdater\.quitAndInstall\(false, true\)/);
  assert.match(main,/download-progress/);
  assert.match(preload,/onUpdateEvent/);
  assert.match(ui,/Restart & Update/);
  assert.match(ui,/Downloading \$\{p\.toFixed\(0\)\}%/);
});

test('cloud workflow publishes with a secret and never hardcodes a token',()=>{
  const wf=fs.readFileSync(path.join(root,'.github','workflows','release-windows.yml'),'utf8');
  assert.match(wf,/secrets\.RELEASE_TOKEN/);
  assert.match(wf,/npm run release/);
  assert.match(wf,/Bundle latest yt-dlp/);
  assert.doesNotMatch(wf,/github_pat_|ghp_/);
});
