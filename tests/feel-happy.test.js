const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const root=path.resolve(__dirname,'..');
for(const accelerated of [false,true])test('Calm lifecycle, lyrics and controls '+(accelerated?'with GPU grass':'with Canvas fallback'),async()=>{
  const {window}=parseHTML(fs.readFileSync(path.join(root,'src/index.html'),'utf8'));
  const doc=window.document,view=doc.getElementById('feelHappyView');
  Object.defineProperty(doc,'currentScript',{value:{src:'file:///fixture/src/feel-happy.js'}});
  assert.equal(doc.querySelector('[data-tab="feelHappy"]').nextElementSibling.dataset.tab,'settings');
  assert.equal(doc.querySelector('[data-tab="feelHappy"]').textContent,'Calm Yourself');
  const frames=new Map();let serial=0;
  window.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial;};
  window.cancelAnimationFrame=id=>frames.delete(id);
  window.matchMedia=()=>({matches:false,addEventListener(){}});
  window.performance={now:()=>0};
  window.setInterval=()=>1;window.clearInterval=()=>{};
  window.ResizeObserver=class{observe(){}};
  const stops=[];
  const strokeColors=[];
  const noteDraws=[];
  const gradient={addColorStop(offset,color){stops.push(color);}};
  let trailDraws=0,gpuDraws=0;
  const extension={vertexAttribDivisorANGLE(){},drawArraysInstancedANGLE(){gpuDraws++;}};
  const gl=new Proxy({getExtension:name=>name==='ANGLE_instanced_arrays'?extension:null,getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({})},
    {get:(object,key)=>key in object?object[key]:key===key.toUpperCase()?1:()=>({})});
  window.HTMLCanvasElement.prototype.getContext=function(kind){if(kind==='webgl')return accelerated?gl:null;const surface=this;return new Proxy({},{
    get:(_,key)=>key==='createLinearGradient'||key==='createRadialGradient'?()=>gradient:
      key==='fillText'?(text)=>{surface.testNote=text;}:
      key==='drawImage'?(image)=>{if(image.testNote)noteDraws.push(image.testNote);if(image.testTrail)trailDraws++;}:()=>{},
    set:(_,key,value)=>{if(key==='strokeStyle'){strokeColors.push(value);if(value==='#32cdbd')surface.testTrail=true;}return true;}
  });};
  doc.getElementById('happyScene').getBoundingClientRect=()=>({width:900,height:540,left:0,top:0});
  const context=vm.createContext(window);
  vm.runInContext("let currentSong={id:'one'},lyricsQuery={id:'one'},lyricLines=[{time:0,text:'First sky line'},{time:2,text:'Second sky line'},{time:4,text:'Third sky line'}];function lyricsPlaybackClock(){return document.getElementById('audioPlayer').currentTime||0;}function findActiveLyricIndex(lines,time){return time>=2?1:0;}",context);
  vm.runInContext("let mockAudioSample=128;const audioAnalyser={fftSize:32,getByteTimeDomainData(data){data.fill(mockAudioSample);}}",context);
  vm.runInContext(fs.readFileSync(path.join(root,'src/calm-wildlife.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(root,'src/feel-happy.js'),'utf8'),context);
  assert.equal(frames.size,0);
  view.classList.add('active');await new Promise(resolve=>setImmediate(resolve));assert.equal(frames.size,1);
  const gpuCanvas=doc.getElementById('calmGrassGPU');
  assert.equal(!!gpuCanvas,accelerated,'GPU path is optional');
  if(accelerated){
    const before=gpuDraws;gpuCanvas.dispatchEvent(new window.Event('webglcontextlost',{cancelable:true}));
    assert.equal(gpuCanvas.style.visibility,'hidden');assert.equal(doc.getElementById('calmForeground').style.visibility,'hidden');
    assert.equal(gpuDraws,before,'lost GPU context uses the Canvas fallback');
    gpuCanvas.dispatchEvent(new window.Event('webglcontextrestored'));
    assert.equal(gpuCanvas.style.visibility,'visible');assert.ok(gpuDraws>before,'restored context rebuilds buffers and resumes drawing');
  }
  assert.equal(doc.getElementById('happySkyLine').textContent,'First sky line');
  assert.equal(doc.getElementById('happySkyPrev').textContent,'');assert.equal(doc.getElementById('happySkyNext').textContent,'Second sky line');
  const audio=doc.getElementById('audioPlayer');audio.currentTime=2.5;audio.dispatchEvent(new window.Event('seeked'));
  assert.equal(doc.getElementById('happySkyLine').textContent,'Second sky line');
  assert.equal(doc.getElementById('happySkyPrev').textContent,'First sky line');assert.equal(doc.getElementById('happySkyNext').textContent,'Third sky line');
  vm.runInContext("currentSong={id:'new'}",context);audio.dispatchEvent(new window.Event('timeupdate'));
  assert.equal(doc.getElementById('happySkyLyrics').hidden,true,'stale song lyrics are hidden');
  const calls=[];
  for(const id of ['previousBtn','nextBtn','back10Btn','forward10Btn','playPauseBtn'])doc.getElementById(id).addEventListener('click',()=>calls.push(id));
  doc.querySelectorAll('[data-calm-action]').forEach(button=>button.click());
  assert.deepEqual(calls,['previousBtn','back10Btn','playPauseBtn','forward10Btn','nextBtn']);
  const toggle=doc.getElementById('calmTransportToggle');toggle.click();assert.equal(doc.getElementById('calmTransportPanel').hidden,true);assert.equal(toggle.getAttribute('aria-expanded'),'false');
  toggle.click();assert.equal(doc.getElementById('calmTransportPanel').hidden,false);
  assert.equal(doc.getElementById('happyScene').dataset.transportHidden,'false');
  toggle.click();assert.equal(doc.getElementById('happyScene').dataset.transportHidden,'true');toggle.click();
  const sidebarToggle=doc.getElementById('calmSidebarToggle');sidebarToggle.click();
  assert.equal(doc.getElementById('happyScene').dataset.sidebarHidden,'true');assert.equal(sidebarToggle.getAttribute('aria-expanded'),'false');
  sidebarToggle.click();assert.equal(doc.getElementById('happyScene').dataset.sidebarHidden,'false');
  vm.runInContext("currentSong={id:'new',title:'Song only',artist:'Do not show artist'}",context);
  audio.duration=200;audio.currentTime=50;audio.paused=true;audio.dispatchEvent(new window.Event('loadedmetadata'));
  assert.equal(doc.getElementById('calmSongTitle').textContent,'Song only');
  const calmSeek=doc.getElementById('calmSeekBar');assert.equal(calmSeek.disabled,false);assert.equal(Number(calmSeek.value),25);
  assert.equal(doc.getElementById('calmCurrentTime').textContent,'0:50');assert.equal(doc.getElementById('calmDuration').textContent,'3:20');
  doc.getElementById('seekBar').addEventListener('input',()=>{audio.currentTime=Number(doc.getElementById('seekBar').value)/100*audio.duration;});
  calmSeek.value='50';calmSeek.dispatchEvent(new window.Event('input'));assert.equal(audio.currentTime,100);
  audio.paused=false;audio.dispatchEvent(new window.Event('play'));assert.equal(doc.getElementById('calmPlayBtn').getAttribute('aria-label'),'Pause');
  doc.querySelector('[data-happy-time="night"]').click();assert.equal(doc.getElementById('happyScene').dataset.time,'night');
  doc.getElementById('happyPause').click();assert.equal(frames.size,0);
  assert.equal(doc.getElementById('happyTouch'),null);
  assert.equal(doc.querySelector('.happy-heading'),null);
  doc.querySelector('[data-happy-time="night"]').click();
  stops.length=0;
  const event=new window.Event('pointermove');event.clientX=400;event.clientY=440;
  const flushPreview=()=>{const [id,fn]=frames.entries().next().value;frames.delete(id);fn(40);};
  const beforeTrail=trailDraws;
  for(let i=0;i<100;i++)doc.getElementById('happyScene').dispatchEvent(event);
  assert.equal(frames.size,1,'paused pointer bursts coalesce into one preview frame');
  assert.equal(trailDraws,beforeTrail,'pointer input does not draw synchronously');flushPreview();
  assert.ok(strokeColors.includes('#32cdbd'),'night grass touch produces a teal trail');
  const leavingTrail=trailDraws;doc.getElementById('happyScene').dispatchEvent(new window.Event('pointerleave'));flushPreview();
  assert.ok(trailDraws>leavingTrail,'cached trail stays on grass after the cursor leaves');
  assert.ok(!stops.some(color=>color.startsWith('rgba(72,225,255,')),'old cursor spotlight is absent');
  doc.getElementById('happyPause').click();assert.equal(frames.size,1);
  function runFrames(start){let finalCount=0;for(let i=1;i<=20;i++){const before=noteDraws.length;const [id,fn]=frames.entries().next().value;frames.delete(id);fn(start+i*40);finalCount=noteDraws.length-before;}return finalCount;}
  audio.readyState=4;audio.paused=true;runFrames(0);assert.equal(noteDraws.length,0);
  audio.paused=false;const quietCount=runFrames(800);assert.ok(noteDraws.some(text=>text==='♪'||text==='♫'),'playing audio emits music notes');
  vm.runInContext('mockAudioSample=192',context);const loudCount=runFrames(1600);
  assert.ok(loudCount>quietCount*3,'loud waveform increases note emission substantially');
  view.classList.remove('active');await new Promise(resolve=>setImmediate(resolve));assert.equal(frames.size,0);
});
const source=fs.readFileSync(path.join(root,'src/feel-happy.js'),'utf8');
test('Calm trail field preserves illumination while bounding work and reusing its buffer',()=>{
  const lights=Array.from({length:32},(_,i)=>({fromX:(i*137)%900-20,fromY:(i*71)%540,x:(i*137)%900+25,y:(i*71)%540+10,life:(i+1)/32}));
  const scope=vm.createContext({width:900,height:540,touchLights:lights,trailField:null,Float32Array,Math});
  vm.runInContext(source.slice(source.indexOf('  function trailDistance('),source.indexOf('  function drawGrassTrails(')),scope);
  let checks=0;const distance=scope.trailDistance;scope.trailDistance=(...args)=>{checks++;return distance(...args);};
  const field=scope.makeTrailField();
  for(let row=0;row<=field.rows;row++)for(let col=0;col<=field.cols;col++){
    const expected=Math.max(...lights.map(light=>Math.pow(Math.max(0,1-distance(light,col/field.cols*900,row/field.rows*540)/65),1.3)*light.life));
    assert.ok(Math.abs(field.data[row*(field.cols+1)+col]-expected)<1e-7,'same maximum light contribution at each grid point');
  }
  assert.ok(checks<32*49*37/5,'local trail bounds avoid at least 80% of distance checks');
  const buffer=field.data;scope.touchLights=[];
  assert.equal(scope.makeTrailField().data,buffer,'one reusable field buffer');
  assert.ok(buffer.every(value=>value===0),'expired lights leave no stale illumination');
});
test('Calm scheduler follows 60Hz and caps higher refresh displays near 90 FPS',()=>{
  const tickSource=source.slice(source.indexOf('  function tick('),source.indexOf('  // Damped springs'));
  for(const hz of [60,90,120,144]){
    const scope=vm.createContext({frame:0,paused:false,active:()=>true,nextFrame:0,last:0,time:0,auto:false,phase:0,target:0,reduced:{matches:false},meteors:[],ripples:[],touchLights:[],notes:[],noteClock:0,musicPlaying:()=>false,
      observeFrameBudget(){},physics(){},readMusicIntensity:()=>0,wildlife:null,requestAnimationFrame:()=>1,draws:0});
    vm.runInContext('function draw(){draws++;}',scope);vm.runInContext(tickSource,scope);
    for(let i=1;i<=hz*2;i++)scope.tick(i*1000/hz);
    assert.ok(Math.abs(scope.draws-Math.min(hz,90)*2)<=2,`${hz}Hz produced ${scope.draws} scene draws in two seconds`);
  }
});
test('Calm adapts pixel bandwidth without resetting meadow physics or penalising a 60Hz screen',()=>{
  const budgetSource=source.slice(source.indexOf('  function observeFrameBudget('),source.indexOf('  function resize('));
  function run(step){
    const scope=vm.createContext({budgetStart:0,budgetFrames:0,cadenceLast:0,cadenceFastest:Infinity,renderScale:1,width:900,height:540,
      canvas:{},baseCtx:{setTransform(){}},grassGPU:{resize(){}},backdropStamp:1,renderRatio:()=>1});
    vm.runInContext(budgetSource,scope);for(let stamp=step;stamp<2400;stamp+=step)scope.observeFrameBudget(stamp,true);return scope;
  }
  assert.equal(run(1000/60).renderScale,1,'stable 60Hz requires no quality loss');
  const scope=run(30);assert.ok(scope.renderScale<1,'sustained slow callbacks also lower bandwidth');
  // A high-refresh display still delivers callbacks between slow scene draws.
  scope.budgetStart=scope.budgetFrames=scope.cadenceLast=0;scope.cadenceFastest=Infinity;
  for(let i=1;i<=360;i++)scope.observeFrameBudget(i*1000/144,i%4===0);
  assert.ok(scope.renderScale<1,'falling behind on a high-refresh display lowers only pixel bandwidth');
  assert.ok(scope.canvas.width>0&&scope.canvas.height>0);assert.equal(scope.backdropStamp,-1,'resolution change invalidates backdrop');
  scope.renderScale=.7;scope.budgetStart=scope.budgetFrames=scope.cadenceLast=0;scope.cadenceFastest=Infinity;
  for(let i=1;i<=150;i++)scope.observeFrameBudget(i*1000/60,true);
  assert.ok(scope.renderScale>.7,'stable 60Hz restores quality after pressure clears');
});
