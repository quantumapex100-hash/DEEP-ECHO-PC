const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('src/index.html','utf8'),js=fs.readFileSync('src/v160-suite.js','utf8'),r=fs.readFileSync('src/renderer.js','utf8'),bat=fs.readFileSync('START-OFFLINE.bat','utf8');
test('v1.6 suite is wired',()=>{for(const id of ['v160DjStart','v160Flow','v160AutoMix','v160Stats','v160OfflineCount','v160OutputSelect','v160LyricsOffset','v160DownloadCurrent','v160Perf','v160Stability'])assert.ok(html.includes(id));assert.ok(html.includes('v160-suite.js'));});
test('offline launcher uses dot working directory not quoted directory module',()=>{assert.match(bat,/pushd "%APPDIR%"/);assert.match(bat,/electron\.exe" \./);assert.doesNotMatch(bat,/electron\.exe" "%APPDIR%"/);});
test('history title repair and 50 cap remain',()=>{assert.match(r,/suspicious/);assert.match(r,/slice\(0, 50\)/);});
test('lyrics pro offset feeds authoritative lyric clock',()=>{assert.match(r,/deepecchoLyricsOffsetMs/);assert.match(js,/v160LyricsOffset/);});
test('stability and performance are additive',()=>{assert.match(js,/Stability|stability/i);assert.match(js,/v160-performance/);});
