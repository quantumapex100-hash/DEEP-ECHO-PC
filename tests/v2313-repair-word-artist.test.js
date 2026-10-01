const fs=require('fs');const path=require('path');const assert=require('assert');
const root=path.join(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const renderer=read('src/renderer.js'),html=read('src/index.html'),v13=read('src/v2313-repair-artist.js'),css=read('src/v2313-repair-artist.css'),exact=read('lib/exact-lyrics.js');const exactLib=require('../lib/exact-lyrics');
assert(html.includes('v2313-repair-artist.css')&&html.includes('v2313-repair-artist.js'),'V13 assets must load');
assert(renderer.includes("line.dataset.wordTiming='estimated'"),'Word-by-word must derive timing when exact word timestamps are absent');
assert(renderer.includes("['exact','estimated'].includes(line.dataset.wordTiming)"),'Karaoke painter must accept exact and derived timing');
assert(exact.includes('wordTimings:alignedWordTimings')&&exact.includes('estimatedWordTimingsFromLrc'),'Exact Lyrics must carry or derive word timing');

const estimated=exactLib.estimatedWordTimingsFromLrc('[00:10.00]all the things she said\n[00:13.00]running through my head');assert(estimated.length>=8,'line timing must produce word timing');assert(estimated.every((x,i)=>Number.isFinite(x.time)&&(!i||x.time>=estimated[i-1].time)),'derived word timing must stay monotonic');
const shifted=exactLib.shiftWordTimings([{text:'hello',time:1,end:1.5}],2);assert.equal(shifted[0].time,3);assert.equal(shifted[0].end,3.5);
assert(v13.includes("id='v2313RepairBtn'")||v13.includes("btn.id='v2313RepairBtn'"),'Context repair button missing');
assert(v13.includes("tab==='lyrics'")&&v13.includes('runExactLyrics(true)'),'Lyrics Repair must support fresh Exact Lyrics resync');
assert(v13.includes("art.addEventListener('pointerup'")&&v13.includes('smartOpenImmersive'),'Bottom artwork must open Immersive Player without stealing swipe');
assert(v13.includes("panel.id='v2313ArtistPanel'")&&v13.includes('searchArtist')&&v13.includes('MutationObserver'),'Immersive About Artist panel/search missing');
assert(v13.includes('preservePlayback')&&v13.includes('restorePlayback'),'Repair must preserve playback position/state');
assert(css.includes('.v2313-artist-panel')&&css.includes('.v2313-repair-btn'),'V13 theme-aware styles missing');
console.log('V13 repair/word/artist tests passed');
