const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/v238-smart-autoplay.js','utf8');
const uniqueSongs=songs=>Array.from(new Map(songs.map(song=>[song.id,song])).values());
function fixture(){
 const seed={id:'seed',artist:'artist'},related={id:'related',artist:'artist'},duplicate={id:'copy',artist:'artist',family:'seed'},unrelated={id:'unrelated',artist:'other'};
 const state={buildSerial:2,candidates:[],playedIds:new Set(),playedFamilies:new Set(),artistRuns:new Map()};
 const c={state,enabled:()=>true,isEligibleContextType:type=>type==='search',disarm:()=>{state.active=false},markPlayed:song=>state.playedIds.add(song.id),setStatus(){},
  tasteRankMap:()=>new Map(),recentIds:()=>new Set(),localTastePool:()=>[duplicate,unrelated,related],candidateScore:song=>song.family==='seed'?-999:1,
  artistKey:song=>song.artist||'',isGenericLabel:()=>false,vibeAffinity:()=>0};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('  function arm('),source.indexOf('  function disarm(')),c);
 return {c,state,seed,related};
}
test('Smart Autoplay reserves a relevant known Next with no network and invalidates older discovery',()=>{
 const {c,state,seed}=fixture();c.arm(seed,'search');assert.equal(state.buildSerial,3);assert.equal(state.building,null);assert.equal(state.candidates.length,1);assert.equal(state.candidates[0].id,'related');assert.equal(state.active,true);
 c.arm({...seed,id:'new-seed'},'search');assert.equal(state.buildSerial,4);
 c.arm(seed,'downloads');assert.equal(state.active,false);
});
test('empty artist metadata cannot reserve an unrelated song as an artist match',()=>{
 const {c,state}=fixture();c.localTastePool=()=>[{id:'unrelated'}];c.arm({id:'seed'},'search');assert.equal(state.candidates.length,0);
});
test('initial recommendation scoring stays bounded even for a large saved library',()=>{
 const {c,seed}=fixture();let scored=0;c.localTastePool=()=>Array.from({length:1000},(_,i)=>({id:String(i),artist:'artist'}));
 c.candidateScore=()=>{scored++;return 1};c.arm(seed,'search');assert.equal(scored,48);
});
test('late radio results preserve the reserved Next and cannot restore a consumed reservation',async()=>{
 for(const consumed of [false,true]){
  const {c,state,seed,related}=fixture();c.arm(seed,'search');let finish;const network=new Promise(resolve=>finish=resolve);
  Object.assign(c,{fetchNetworkPool:()=>network,uniqueSongs,familyKey:song=>song.id,sameSongFamily:(a,b)=>a.id===b.id,audioPlayer:{paused:false},loadingRequest:null,prefetchNextQueued(){},window:{}});
  vm.runInContext(source.slice(source.indexOf('  async function rebuildCandidates('),source.indexOf('  function scheduleBuild(')),c);
  const pending=c.rebuildCandidates();if(consumed){state.candidates.shift();state.playedIds.add(related.id)}
  finish({items:[{id:'network',artist:'other'}]});await pending;
  if(!consumed)assert.equal(state.candidates[0].id,related.id);else assert.notEqual(state.candidates[0]?.id,related.id);
 }
});
