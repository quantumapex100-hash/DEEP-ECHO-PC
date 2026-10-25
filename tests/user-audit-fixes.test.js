const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const ranking=require('../lib/lyrics-search-ranking'),source=fs.readFileSync('src/renderer.js','utf8');
test('the requested song outranks unrelated official lyrics even when the latter is verified',()=>{
 const rows=ranking.rankSearchResultsForLyrics([{id:'husn',title:'Anuv Jain - Husn (Official Audio)',channel:'Anuv Jain'},{id:'arz',title:'Anuv Jain - Arz Kiya Hai (Official Lyrical Video)',channel:'Anuv Jain',lyricsVerified:true}],[],'Husn Anuv Jain official audio');
 assert.equal(ranking.rankVerifiedSearchResults(rows)[0].id,'husn');
 const matching=ranking.rankSearchResultsForLyrics([{id:'audio',title:'Anuv Jain - Husn (Official Audio)',channel:'Anuv Jain'},{id:'lyrics',title:'Husn - Anuv Jain (Lyrics)',channel:'Anuv Jain'}],[],'Husn Anuv Jain');
 assert.equal(matching[0].id,'lyrics');assert.equal(matching[0].lyricsReady,true);
});
test('one user search performs one extractor search, retaining its lyrics variants',async()=>{
 const main=fs.readFileSync('main.js','utf8'),a=main.indexOf('async function searchUserMusic('),b=main.indexOf("ipcMain.handle('search-music'",a),calls=[];
 const c={searchMusic:async(...args)=>{calls.push(args);return [{id:'x',title:'Husn Lyrics',channel:'Anuv Jain'}]},...ranking,knownLyricsReadyIds:()=>new Set(),isPlaylistLike:()=>false};
 vm.createContext(c);vm.runInContext(main.slice(a,b),c);const result=await c.searchUserMusic('Husn',20);
 assert.equal(calls.length,1);assert.deepEqual(calls[0],['Husn',20]);assert.equal(result[0].lyricsReady,true);
});
function collections(){
 const pending=new Map(),painted=[];
 const c={searchRequest:0,smartSearchType:'artists',runSearch:()=>{},smartRememberSearch(){},resultsList:{classList:{remove(){}},innerHTML:''},activateTab(){},searchViewTitle:{},searchModeText:{},navigator:{onLine:true},searchHint:{},setSearchProgress(){},window:{echoAPI:{searchArtist:q=>new Promise((resolve,reject)=>pending.set(q,{resolve,reject})),search:q=>new Promise((resolve,reject)=>pending.set(q,{resolve,reject}))}},hideSearchProgress(){},finishSearchProgress(){},registerSongs(){},smartRenderSearchCollections:(...args)=>painted.push(args),searchLooksOffline:()=>false,showSearchOfflineState(){}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('const v140RunSearchBase = runSearch;'),source.indexOf('if (searchTypeTabs)')),c);return {c,pending,painted};
}
test('a late Artists response cannot overwrite a newer Albums query or its loading state',async()=>{
 const h=collections(),first=h.c.runSearch('song','old');h.c.smartSearchType='albums';const second=h.c.runSearch('song','new');
 h.pending.get('new full album official audio').resolve([{id:'new'}]);await second;h.pending.get('old').resolve([{id:'old'}]);await first;
 assert.equal(h.painted.length,1);assert.equal(h.painted[0][0],'albums');assert.equal(h.painted[0][1],'new');assert.equal(h.c.searchViewTitle.textContent,'Albums: new');
});
test('a stale failed collection search cannot replace the successful new query with an error',async()=>{
 const h=collections(),first=h.c.runSearch('song','old');const second=h.c.runSearch('song','new');h.pending.get('new').resolve([{id:'new'}]);await second;h.pending.get('old').reject(new Error('old request failed'));await first;assert.notEqual(h.c.searchHint.textContent,'Search failed: old request failed');assert.equal(h.painted.length,1);
});
test('settled noncurrent lyric lines skip word queries without changing seek/highlight behaviour',()=>{
 let queries=0;const rows=Array.from({length:160},()=>({dataset:{wordTiming:'exact'},querySelectorAll(){queries++;return this.words},words:Array.from({length:3},(_,i)=>({dataset:{wordTime:String(i),wordEnd:String(i+1)},classes:new Set(),classList:{toggle(name,on){if(on)this.owner.classes.add(name);else this.owner.classes.delete(name)},remove(name){this.owner.classes.delete(name)},add(name){this.owner.classes.add(name)}}}))}));for(const row of rows)for(const word of row.words)word.classList.owner=word;
 const c={smartWordByWordEnabled:true,activeLyric:1};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function smartPaintWordState('),source.indexOf('function smartUpdateKaraoke()')),c);const root={querySelectorAll:()=>rows};c.smartPaintWordState(root,1.5);assert.equal(queries,160);queries=0;c.smartPaintWordState(root,1.6);assert.equal(queries,1);assert.equal(rows[1].words[1].classes.has('word-current'),true);
 c.activeLyric=2;queries=0;c.smartPaintWordState(root,.4);assert.equal(queries,2);assert.equal(rows[1].words.some(w=>w.classes.has('word-current')),false);assert.equal(rows[2].words[0].classes.has('word-current'),true);
});
test('cached visualizer colours preserve exact hue/alpha and have bounded storage',()=>{
 const c={};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function luminousVisualizerColor('),source.indexOf('const visualizerGlowBuffers')),c);const color='hsla(132,100%,60%,0.5)';assert.equal(c.luminousVisualizerColor(color),'hsla(132,100%,64%,0.7)');assert.equal(c.luminousVisualizerColor(color),'hsla(132,100%,64%,0.7)');assert.equal(c.luminousVisualizerColor.cache.size,1);for(let i=0;i<3000;i++)c.luminousVisualizerColor(`hsla(${i},100%,60%,0.5)`);assert.ok(c.luminousVisualizerColor.cache.size<=2048);
});
test('visualizer reuses layout measurements and refreshes after resize notifications',()=>{
 let reads=0,notify;const canvas={getBoundingClientRect:()=>({width:++reads*100,height:400})},c={ResizeObserver:class{constructor(fn){notify=fn}observe(){}}};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function lyricsVisualizerRect('),source.indexOf('function drawLyricsVisualizer()')),c);
 assert.equal(c.lyricsVisualizerRect(canvas).width,100);assert.equal(c.lyricsVisualizerRect(canvas).width,100);assert.equal(reads,1);notify();assert.equal(c.lyricsVisualizerRect(canvas).width,200);
});
test('hidden lyric surfaces skip word paint but catch up immediately from the original clock when visible',()=>{
 const state={visible:false,hidden:false},calls=[],c={lyricLines:[{}],document:{get hidden(){return state.hidden},getElementById:()=>({classList:{contains:()=>state.visible}})},lyricsBody:{},lyricsPlaybackClock:()=>12.345,smartPaintWordState:(_root,t)=>calls.push(t),smartUpdateImmersiveKaraoke(){}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function smartUpdateKaraoke()'),source.indexOf('function smartStartWordByWordTicker()')),c);
 c.smartUpdateKaraoke();assert.equal(calls.length,0);state.visible=true;c.smartUpdateKaraoke();assert.deepEqual(calls,[12.345]);state.hidden=true;c.smartUpdateKaraoke();assert.equal(calls.length,1);
});
test('audio compatibility can reuse a second container from the same extraction exactly once',async()=>{
 const main=fs.readFileSync('main.js','utf8');let extractions=0;const media=[];
 const c={Map,Date,URL,AbortController,fs:{existsSync:()=>true},PLAYBACK_PLUGIN_DIR:'plugins',YTDLP_PATH:'fixture',readYouTubeAccess:()=>({}),playbackLog(){},streamExpiry:()=>Date.now()+60000,
 playbackRelay:{register:async value=>{media.push(value);return 'http://127.0.0.1/audio/'+media.length}},
 runYtDlpSmart:async()=>{extractions++;return {stdout:JSON.stringify({url:'https://origin/audio.m4a',ext:'m4a',http_headers:{Referer:'fixture'},formats:[{url:'https://origin/audio.webm',ext:'webm',vcodec:'none',protocol:'https',abr:160,http_headers:{'User-Agent':'opus'}},{url:'https://origin/video.webm',ext:'webm',vcodec:'vp9',abr:300}]})}}};
 vm.createContext(c);vm.runInContext(main.slice(main.indexOf('const streamUrlCache ='),main.indexOf('async function prepareClassicPlaybackFile')),c);const song={id:'song',url:'fixture'};await c.resolveStreamUrl(song);assert.equal(await c.reuseAlternatePlayback(song),'http://127.0.0.1/audio/2');assert.equal(extractions,1);assert.equal(media[1].url,'https://origin/audio.webm');assert.equal(media[1].headers.Referer,'fixture');assert.equal(media[1].headers['User-Agent'],'opus');assert.equal(await c.reuseAlternatePlayback(song),'');
});
test('soft backgrounds keep viewport geometry and blur appearance while reducing painted pixels',()=>{
 let image,physical,blur,receiver;const native={setTransform(){},clearRect(){},fillRect(){receiver=this}},surface={getContext:()=>native};
 const c={document:{createElement:()=>surface},canvas:{width:1600,height:1000},ctx:{drawImage:(...args)=>image=args},window:{drawDinechoEffect:(paint,canvas,theme)=>{physical={w:surface.width,h:surface.height};assert.equal(canvas.width,1600);assert.equal(theme,'fluids');paint.filter='blur(20px) saturate(175%) contrast(150%)';blur=native.filter;paint.fillRect(0,0,canvas.width,canvas.height);return true;}}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('  let softEffectBuffer ='),source.indexOf('  function tick() {')),c);assert.equal(c.drawBufferedSoftEffect('fluids'),true);assert.deepEqual(physical,{w:1040,h:650});assert.equal(blur,'blur(13px) saturate(175%) contrast(150%)');assert.equal(receiver,native);assert.deepEqual(image.slice(1),[0,0,1600,1000]);
});
test('Calm texture warmup yields small chunks and commits complete assets atomically',()=>{
 const calm=fs.readFileSync('src/feel-happy.js','utf8'),gradient={addColorStop(){}},paint=new Proxy({createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||(()=>{})});
 const c={palettes:[[],[],[]],cloudTexture:null,terrainTexture:null,trees:[],document:{createElement:()=>({getContext:()=>paint})}};vm.createContext(c);vm.runInContext(calm.slice(calm.indexOf('  function* buildTextures()'),calm.indexOf('  function resize()')),c);const work=c.buildTextures();let next,count=0;while(!(next=work.next()).done){count++;assert.equal(c.cloudTexture,null);}assert.ok(count>30);c.commitTextures(next.value);assert.equal(c.cloudTexture.length,3);assert.equal(c.trees.length,3);assert.equal(c.terrainTexture.width,512);const first=c.cloudTexture;c.prepareTextures();assert.equal(c.cloudTexture,first);
});
