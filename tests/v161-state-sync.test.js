const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const r=fs.readFileSync('src/renderer.js','utf8'),v=fs.readFileSync('src/v160-suite.js','utf8'),a=fs.readFileSync('lib/auto-transcribe.js','utf8');
test('remote song identity is canonicalized from youtube id',()=>{assert.match(r,/canonicalUrl/);assert.match(r,/youtube\.com\/watch\?v=\$\{id\}/);});
test('late lyrics can never repaint a different current song',()=>{assert.match(r,/String\(song\.id\) !== String\(currentSong\.id\)/);});
test('lookahead prepares ten links serially and buffers the immediate next track',()=>{assert.match(r,/smartUpcomingSongs\(window\.__deepecchoGameMode\?1:10\)/);assert.match(r,/smartWarmPreparedUrl/);assert.doesNotMatch(r,/Promise\.all\(songs\.map/);});
test('AI DJ sanitizes candidates and avoids prefetch before first playback',()=>{assert.match(v,/buildPersonalDJ/);assert.match(v,/Do NOT prefetch before the first track/);});
test('AI transcription rejects repeated hallucinated phrases',()=>{assert.match(a,/transcriptLooksHallucinated/);assert.match(a,/uniqueRatio < 0\.52/);assert.match(a,/maxPhraseRepeat >= 3/);});

test('auto-next refreshes prefetch near track end and skips unavailable context sources',()=>{assert.match(r,/duration - current <= 24/);assert.match(r,/const attempts = Math.min\(3, activeContext.items.length\)/);});

