const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {parseHTML}=require('linkedom');
const source=fs.readFileSync(path.join(__dirname,'../src/home-discovery.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup({offline=false,cache=null,search}={}){
  const {document,HTMLElement}=parseHTML('<html><body><section id="homeView" class="active"><div class="hero-card"></div></section><section id="settingsView"></section><div id="playLoadingWrap" class="hidden"></div><button data-tab="home"></button></body></html>');
  HTMLElement.prototype.scrollIntoView=function(){};
  const saved=new Map();if(cache)saved.set('deepecho-viral-discovery-v1',JSON.stringify(cache));
  const queries=[],timers=[],played=[];
  const result=[{id:'original',title:'Original song'},{id:'cover',title:'Viral cover'},{id:'mix',title:'Playlist',isPlaylist:true}];
  const ctx={document,navigator:{onLine:!offline},window:{echoAPI:{search:async q=>{queries.push(q);return search?search(q):result;}},addEventListener(){}},
    localStorage:{getItem:key=>saved.get(key)||null,setItem:(k,v)=>saved.set(k,v)},
    setTimeout:(fn,ms)=>timers.push({fn,ms}),setInterval(){},Date,console,
    normalizeSong:s=>s,searchResultIsPlaylistLike:s=>!!s.isPlaylist,
    makeContext:(items,type,label,key)=>({items,type,label,key}),registerSongs(){},warmVisibleCards(){},
    getLikedSongs:()=>[{id:'liked',title:'Liked song'}],getPlaylists:()=>({'My Playlist':[{id:'saved',title:'Saved song'}]}),
    getStored:()=>[{id:'recent',title:'Recent song'}],STORAGE:{recent:'recent'},
    buildSongRow:s=>{const el=document.createElement('div');el.className='song-row';el.textContent=s.title;return el;},
    buildSongCard:s=>{const el=document.createElement('article');el.className='song-card';el.textContent=s.title;return el;},
    buildPlaylistCard:opts=>{const el=document.createElement('article');el.className='playlist-card';el.textContent=opts.title;
      for(const [label,fn] of [['Open Songs',opts.onOpen],['Play',opts.onPlay]]){const b=document.createElement('button');b.textContent=label;b.addEventListener('click',fn);el.append(b);}return el;},
    playSongCollection:(songs,title,meta)=>played.push({songs,title,meta})};
  vm.runInNewContext(source,ctx);return {document,saved,queries,timers,played,ctx};
}
test('Home collections open song rows and Play All uses the existing playback context',async()=>{
  const h=setup();assert.equal(h.document.querySelectorAll('#homeAllTimeCollections .playlist-card').length,12);
  assert.match(h.document.querySelector('#homeSpeedDial').textContent,/Liked Songs.*My Playlist.*Recent song/s);
  h.document.querySelector('#homeAllTimeCollections .playlist-card button').click();await tick();
  assert.equal(h.document.querySelectorAll('#homeDiscoveryPlaylist .song-row').length,2);
  h.document.querySelector('.collection-play').click();assert.equal(h.played[0].songs.length,2);
  assert.equal(h.played[0].meta.type,'home-collection');
  assert.equal(h.document.querySelector('#settingsView').lastElementChild.id,'aboutDeveloper');
  const link=h.document.querySelector('.developer-instagram');assert.equal(link.href,'https://www.instagram.com/enchanting_daiyu/');
  assert.equal(link.target,'_blank');assert.match(h.document.querySelector('.developer-bio').textContent,/DAIYAN SARWAR.*2 TIMES WINNER/);
});
test('viral refresh includes covers, removes duplicate/playlist entries and caches fresh results',async()=>{
  const h=setup();h.document.querySelector('#homeViralSongs button').click();await tick();
  assert.equal(h.queries.length,2);assert.match(h.queries[1],/covers remixes/);
  const cache=JSON.parse(h.saved.get('deepecho-viral-discovery-v1'));assert.deepEqual(cache.songs.map(s=>s.id),['original','cover']);
  h.document.querySelector('[data-tab="home"]').click();await tick();assert.equal(h.queries.length,2,'fresh cache avoids new searches');
});
test('offline discovery preserves saved songs without starting searches',async()=>{
  const h=setup({offline:true,cache:{at:Date.now()-7*60*60*1000,songs:[{id:'cached',title:'Saved viral cover'}]}});
  h.document.querySelector('#homeViralSongs button').click();await tick();assert.equal(h.queries.length,0);
  assert.match(h.document.querySelector('#homeViralSongs').textContent,/Saved viral cover/);
});
test('slow collection response cannot overwrite a newer Open request',async()=>{
  const pending=[];const h=setup({search:q=>new Promise(resolve=>pending.push({q,resolve}))});
  const cards=h.document.querySelectorAll('#homeAllTimeCollections .playlist-card');
  cards[0].querySelector('button').click();cards[1].querySelector('button').click();
  pending[1].resolve([{id:'new',title:'Bollywood result'}]);await tick();
  pending[0].resolve([{id:'old',title:'Old English result'}]);await tick();
  assert.match(h.document.querySelector('#homeDiscoveryPlaylist').textContent,/Bollywood result/);
  assert.doesNotMatch(h.document.querySelector('#homeDiscoveryPlaylist').textContent,/Old English result/);
});
