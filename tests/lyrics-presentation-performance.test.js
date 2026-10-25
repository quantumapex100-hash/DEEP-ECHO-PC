const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/v169-lyrics-presentation.js','utf8');
function fixture(){
  const writes=[],node=name=>({style:{setProperty:(key,value)=>writes.push({name,key,value})}});
  let frame,current=node('first');const state={visible:true,immersive:false,lighting:true};
  const light=node('light'),immersiveLine=node('immersive'),root=node('root');
  const c={window:{__dinechoAudioEnergy:{}},document:{hidden:false,documentElement:root,
    body:{dataset:{theme:'golden'},classList:{contains:()=>state.lighting}},
    getElementById:id=>id==='lyricsView'?{classList:{contains:()=>state.visible}}:id==='immersivePlayer'?{classList:{contains:()=>!state.immersive}}:id==='v170MusicLighting'?light:null,
    querySelector:q=>q.includes('immersive')?immersiveLine:current,querySelectorAll:()=>[]},
    performance:{now:()=>0},requestAnimationFrame:fn=>{frame=fn},WeakMap,Map,Math,Number,Object};
  vm.runInNewContext(source,c);return {c,state,writes,tick:t=>frame(t),replace:()=>{current=node('second')}};
}
test('audio effects update only visible current lines and lighting; unchanged values stop causing style writes',()=>{
  const h=fixture();h.tick(40);assert.equal(h.writes.length,14);assert.ok(h.writes.every(w=>w.name!=='root'));
  h.tick(80);assert.equal(h.writes.length,14,'paused stable values are not rewritten');
  h.replace();h.tick(120);assert.equal(h.writes.filter(w=>w.name==='second').length,9,'new current line receives all effects');
});
test('hidden tabs, disabled lighting, minimized windows and game mode avoid presentation writes',()=>{
  const h=fixture();h.state.visible=false;h.state.lighting=false;h.tick(40);assert.equal(h.writes.length,0);
  h.state.visible=true;h.c.document.hidden=true;h.tick(80);assert.equal(h.writes.length,0);
  h.c.document.hidden=false;h.c.window.__deepecchoGameMode=true;h.tick(120);assert.equal(h.writes.length,0);
});
test('visible immersive lyrics retain their audio-reactive effects independently of the main Lyrics tab',()=>{
  const h=fixture();h.state.visible=false;h.state.immersive=true;h.state.lighting=false;
  h.c.window.__dinechoAudioEnergy={energy:.8,vocal:.7,beatPulse:.5};h.tick(40);
  assert.equal(h.writes.length,9);assert.ok(h.writes.every(w=>w.name==='immersive'));
  assert.ok(Number(h.writes.find(w=>w.key==='--lyric-bounce-scale').value)>1);
});

test('adaptive pressure reduces only the balanced main Lyrics canvas; user quality and immersive view remain intact',()=>{
  const renderer=fs.readFileSync('src/renderer.js','utf8');
  const state={pressure:false,lyrics:true,immersive:false};
  const c={lyricsRenderConstrained:false,window:{},document:{body:{classList:{contains:()=>state.pressure,toggle(){}}},getElementById:id=>({classList:{contains:()=>id==='lyricsView'?state.lyrics:!state.immersive}})},String};
  vm.createContext(c);vm.runInContext(renderer.slice(renderer.indexOf('function visualizerQualityConfig()'),renderer.indexOf('function drawLyricsVisualizer()')),c);
  assert.equal(c.visualizerQualityConfig().fastParticles,true,'first visible balanced frame uses efficient themed glow');
  assert.equal(c.visualizerQualityConfig().dpr,1,'entry avoids allocating and repainting an oversized canvas');
  assert.equal(c.visualizerQualityConfig().fps,40);state.pressure=true;assert.equal(c.visualizerQualityConfig().fps,30);
  assert.equal(c.visualizerQualityConfig().dpr,1);state.immersive=true;assert.equal(c.visualizerQualityConfig().fps,40);assert.equal(c.visualizerQualityConfig().fastParticles,false,'immersive quality remains independent');
  state.pressure=false;state.immersive=false;assert.equal(c.visualizerQualityConfig().fps,40);
  state.pressure=true;assert.equal(c.visualizerQualityConfig().fps,30);state.pressure=false;assert.equal(c.visualizerQualityConfig().fps,30,'budget remains stable during the same Lyrics visit');
  state.immersive=false;c.window.__dinechoVisualizerQuality='high';assert.equal(c.visualizerQualityConfig().fps,50);
  c.window.__dinechoVisualizerQuality='ultra';assert.equal(c.visualizerQualityConfig().fps,60);
});

test('low-cost canvas preserves native method receivers, colors and geometry while omitting per-shape software blur',()=>{
  const renderer=fs.readFileSync('src/renderer.js','utf8'),calls=[];
  const raw={shadowBlur:5,fillStyle:'gold',arc(...args){assert.equal(this,raw);calls.push(args)}};
  const c={};vm.createContext(c);vm.runInContext(renderer.slice(renderer.indexOf('const lowCostVisualizerContexts'),renderer.indexOf('function visualizerQualityConfig()')),c);
  const adapted=c.lowCostVisualizerContext(raw);adapted.shadowBlur=40;assert.equal(raw.shadowBlur,0);
  adapted.fillStyle='violet';assert.equal(raw.fillStyle,'violet');adapted.arc(1,2,3,0,6);
  assert.deepEqual(calls,[[1,2,3,0,6]]);assert.equal(c.lowCostVisualizerContext(raw),adapted);
});

test('visualizer pacing stays even at 60/120Hz and does not burst after a long stall',()=>{
  const renderer=fs.readFileSync('src/renderer.js','utf8');
  const pacing=renderer.slice(renderer.indexOf('  const paintInterval = 1000 / quality.fps;'),renderer.indexOf('  // A single audio-reactive renderer'));
  for(const hz of [60,120]){
    const c={visualizerLastPaintAt:0,Math};vm.createContext(c);
    vm.runInContext(`function due(paintNow){const quality={fps:30};${pacing};return true}`,c);
    const paints=[];
    for(let frame=1;frame<=hz*3;frame++)if(c.due(frame*1000/hz))paints.push(frame*1000/hz);
    assert.equal(paints.length,90,`${hz}Hz display should deliver 30 evenly spaced paints/sec`);
    for(let i=1;i<paints.length;i++)assert.ok(Math.abs(paints[i]-paints[i-1]-1000/30)<.01);
    assert.equal(c.due(8000),true);assert.equal(c.due(8001),undefined,'no catch-up burst after suspension');
  }
});

test('adaptive canvas keeps custom brightness controls and restores the cheap default on reset',()=>{
  const properties=new Map(),storage=new Map([['deepecho-v228-v4-glow-migrated','1']]),nodes=new Map();
  const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',listeners:{},addEventListener(type,fn){this.listeners[type]=fn}});return nodes.get(id)};
  const c={document:{getElementById:node,documentElement:{style:{setProperty:(k,v)=>properties.set(k,v)}}},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},Math,Number,String};
  vm.runInNewContext(fs.readFileSync('src/v228-visual-polish.js','utf8'),c);
  assert.equal(properties.get('--v170-adaptive-canvas-filter'),'none');
  node('v228VisualizerBrightnessRange').listeners.input({currentTarget:{value:'120'}});
  assert.equal(properties.get('--v228-visualizer-brightness'),'1.2');
  assert.equal(properties.get('--v170-adaptive-canvas-filter'),'brightness(1.2)');
  assert.equal(storage.get('deepecho-v228-visualizer-brightness'),'120');
  node('v228ResetVisualBtn').listeners.click();
  assert.equal(properties.get('--v228-visualizer-brightness'),'1.08');
  assert.equal(properties.get('--v170-adaptive-canvas-filter'),'none');
});

test('luminous colors preserve theme hues and transparent pixels instead of whitening all themes',()=>{
  const renderer=fs.readFileSync('src/renderer.js','utf8'),c={};vm.createContext(c);
  vm.runInContext(renderer.slice(renderer.indexOf('function luminousVisualizerColor('),renderer.indexOf('const visualizerGlowBuffers')),c);
  for(const hue of [38,132,265,350,205,318]){
    const value=c.luminousVisualizerColor(`hsla(${hue},100%,60%,0.5)`);
    assert.equal(value,`hsla(${hue},100%,64%,0.7)`);
  }
  assert.equal(c.luminousVisualizerColor('rgba(255,40,80,0)'),'rgba(255,46,93,0)');
  assert.equal(c.luminousVisualizerColor('hsla(38,100%,80%,0.9)'),'hsla(38,100%,84%,1)');
  const gradient={};assert.equal(c.luminousVisualizerColor(gradient),gradient);
});

test('shared glow reuses a bounded small buffer and restores the sharp canvas state',()=>{
  const renderer=fs.readFileSync('src/renderer.js','utf8'),calls=[];let created=0;
  const small={clearRect(){},drawImage(){calls.push('small-copy')}};
  let clock=0;const c={performance:{now:()=>clock},document:{createElement(){created++;return {getContext:()=>small}}}};vm.createContext(c);
  vm.runInContext(renderer.slice(renderer.indexOf('const visualizerGlowBuffers'),renderer.indexOf('function visualizerQualityConfig()')),c);
  const canvas={width:1600,height:800};let saved;
  const context={globalAlpha:1,globalCompositeOperation:'source-over',save(){saved=[this.globalAlpha,this.globalCompositeOperation]},restore(){[this.globalAlpha,this.globalCompositeOperation]=saved},drawImage(buffer){assert.equal(buffer.width,192);assert.equal(buffer.height,96);calls.push(this.globalCompositeOperation)}};
  c.paintFastVisualizerGlow(context,canvas);c.paintFastVisualizerGlow(context,canvas);
  assert.equal(created,1);assert.equal(small.filter,'blur(2px)');
  assert.equal(context.globalAlpha,1);assert.equal(context.globalCompositeOperation,'source-over');
  assert.deepEqual(calls,['small-copy','lighter','lighter']);
  c.paintFastVisualizerGlow(context,canvas,'purple');assert.equal(calls.filter(c=>c==='small-copy').length,2,'theme changes refresh without a delay');
  clock=70;c.paintFastVisualizerGlow(context,canvas,'purple');assert.equal(calls.filter(c=>c==='small-copy').length,3,'diffuse glow refreshes at its own bounded cadence');
});
