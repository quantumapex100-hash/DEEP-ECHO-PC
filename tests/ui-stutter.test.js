const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');const source=fs.readFileSync('src/renderer.js','utf8');
function cursorFixture(){
 const {window}=parseHTML('<html><body data-theme="golden"><div id="dinechoLiveCursor"><div id="dinechoLiveCursorArt"></div></div><button id="action">Play</button><input id="text"><div id="plain"></div></body></html>');
 const frames=new Map();let serial=0;
 window.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial};window.cancelAnimationFrame=id=>frames.delete(id);
 const c=vm.createContext(window);vm.runInContext(source.slice(source.indexOf('const dinechoLiveCursor ='),source.indexOf('function applyThemeCursor(')),c);c.initLiveCursor();
 const move=(id,x,y)=>{const e=new window.Event('pointermove',{bubbles:true});Object.assign(e,{clientX:x,clientY:y});window.document.getElementById(id).dispatchEvent(e)};
 const flush=()=>{const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn())};return {window,c,frames,move,flush,cursor:window.document.getElementById('dinechoLiveCursor')};
}
test('high-frequency pointer events coalesce; only the latest position paints without layout coordinates',()=>{
 const f=cursorFixture();for(let i=0;i<100;i++)f.move('action',i,i+20);
 assert.equal(f.frames.size,1);assert.equal(f.window.document.documentElement.classList.contains('dinecho-live-cursor-enabled'),false);
 f.flush();assert.equal(f.cursor.style.transform,'translate(96px, 116px)');assert.equal(f.cursor.style.left,'');assert.equal(f.cursor.style.top,'');
 assert.equal(f.cursor.dataset.state,'action');assert.equal(f.window.document.documentElement.classList.contains('dinecho-live-cursor-enabled'),true);
});
test('cursor hover checks are reused on the same target; text and normal states still work',()=>{
 const f=cursorFixture(),button=f.window.document.getElementById('action');let hits=0;const closest=button.closest.bind(button);button.closest=s=>{hits++;return closest(s)};
 f.move('action',100,100);f.flush();const initial=hits;f.move('action',100,100);f.flush();assert.equal(hits,initial);
 f.move('text',100,100);f.flush();assert.equal(f.cursor.dataset.state,'text');f.move('plain',100,100);f.flush();assert.equal(f.cursor.dataset.state,'normal');
});
test('hiding cancels pending cursor frames; a detached SVG restores the native pointer',()=>{
 const f=cursorFixture();f.move('action',100,100);f.flush();f.move('action',120,120);assert.equal(f.frames.size,1);f.c.hideLiveCursor();assert.equal(f.frames.size,0);f.flush();assert.equal(f.cursor.classList.contains('visible'),false);assert.equal(f.window.document.documentElement.classList.contains('dinecho-live-cursor-enabled'),false);
 f.window.document.getElementById('dinechoLiveCursorArt').innerHTML='';f.move('action',120,120);f.flush();assert.equal(f.window.document.documentElement.classList.contains('dinecho-live-cursor-enabled'),false);
});
test('shelf observer ignores result-row/progress churn but tracks shelf insertion, content and removal',()=>{
 const {window}=parseHTML('<html><body><div id="results"><div class="song-row"></div></div><section class="home-section"><div id="cards"></div></section></body></html>');
 const c=vm.createContext(window),shelves=fs.readFileSync('src/v236-discovery-shelves.js','utf8');vm.runInContext(shelves.slice(shelves.indexOf('  const shelfSelector236'),shelves.indexOf('  const shelfObserver236')),c);
 const result=window.document.getElementById('results'),text=window.document.createTextNode('checking');assert.equal(c.affectsShelf236({target:result,addedNodes:[text],removedNodes:[]}),false);
 const section=window.document.querySelector('.home-section');assert.equal(c.affectsShelf236({target:result,addedNodes:[section],removedNodes:[]}),true);assert.equal(c.affectsShelf236({target:window.document.getElementById('cards'),addedNodes:[],removedNodes:[]}),true);assert.equal(c.affectsShelf236({target:result,addedNodes:[],removedNodes:[section]}),true);
});

test('mini-waveform still draws each frame and refreshes cached color on a theme switch',()=>{
 const presentation=fs.readFileSync('src/v170-experience.js','utf8'),colors=[];let reads=0;
 const ctx={clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){colors.push(this.strokeStyle)}};
 const document={hidden:false,body:{dataset:{theme:'golden'}},documentElement:{}};
 const c={document,window:{},performance:{now:()=>0},playerWave:{width:100,height:20,getContext:()=>ctx},audioPlayer:{currentTime:1},requestAnimationFrame(){},
  getComputedStyle:()=>{reads++;return {getPropertyValue:()=>document.body.dataset.theme==='golden'?'gold':'purple'}}};
 vm.createContext(c);vm.runInContext(presentation.slice(presentation.indexOf('let waveLastPaint='),presentation.indexOf('  if(adaptive)adaptive.checked=')),c);
 c.frame(40);c.frame(80);assert.equal(reads,1);document.body.dataset.theme='purple';c.frame(120);c.frame(160);
 assert.equal(reads,2);assert.deepEqual(colors,['gold','gold','purple','purple']);
});

test('particle glow texture is reused within a palette and replaced when its theme color changes',()=>{
 let canvases=0,gradients=0;const stops=[];
 const c={document:{createElement:()=>{canvases++;return {getContext:()=>({createRadialGradient:()=>{gradients++;return {addColorStop:(n,color)=>stops.push(color)}},fillRect(){}})}}}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('  let particleGlowSprite ='),source.indexOf('  repopulate();\n  let lastTheme')),c);
 const gold=c.cachedParticleGlow({glow:[232,181,89]});for(let i=0;i<100;i++)assert.equal(c.cachedParticleGlow({glow:[232,181,89]}),gold);
 const purple=c.cachedParticleGlow({glow:[153,100,255]});assert.notEqual(purple,gold);assert.equal(canvases,2);assert.equal(gradients,2);assert.deepEqual(stops,['rgba(232,181,89,1)','rgba(232,181,89,0)','rgba(153,100,255,1)','rgba(153,100,255,0)']);
});
test('missing particle sprite context keeps the original rendering fallback without allocating every frame',()=>{
 let canvases=0;const c={document:{createElement:()=>{canvases++;return {getContext:()=>null}}}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('  let particleGlowSprite ='),source.indexOf('  repopulate();\n  let lastTheme')),c);
 for(let i=0;i<100;i++)assert.equal(c.cachedParticleGlow({glow:[232,181,89]}),null);assert.equal(canvases,1);
});
