const test=require('node:test');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');
test('Home/Search, rapid navigation, local files and Smart Autoplay preserve latest user intent',()=>{
  const output=execFileSync(process.execPath,[path.join(__dirname,'playback-ui.cjs')],{encoding:'utf8',timeout:10000,windowsHide:true});
  assert.match(output,/PASS playback UI:/,'The complete asynchronous fixture must finish, not just exit successfully.');
  console.log(output.trim());
});
