const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/material-controls.js'),'utf8');
function fixture({gpu=false,reduce=false}={}){
 const {window}=parseHTML(fs.readFileSync(path.join(root,'src/index.html'),'utf8')),doc=window.document;
 for(const id of ['v18AskBtn','v2313RepairBtn','smartAutoplayToggle']){const b=doc.createElement('button');b.id=id;b.textContent=id;doc.querySelector('.topbar').appendChild(b);}
 const stats=doc.createElement('button');stats.className='nav-item';stats.dataset.tab='stats';stats.textContent='Listening Stats';doc.querySelector('.side-nav').appendChild(stats);
 const modal=doc.createElement('div');modal.id='artistSearchModal';modal.className='hidden';doc.body.appendChild(modal);
 const frames=new Map(),media={matches:reduce,addEventListener(_type,fn){this.changed=fn;}};let clock=0,serial=0,contexts=0,draws=0;
 window.matchMedia=()=>media;window.performance={now:()=>clock};window.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial;};window.cancelAnimationFrame=id=>frames.delete(id);const resizeCallbacks=[];window.ResizeObserver=class{constructor(fn){resizeCallbacks.push(fn);}observe(){}};
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({}),drawElements(){draws++;}},
  {get:(o,k)=>k in o?o[k]:k===k.toUpperCase()?1:()=>({})});
 window.HTMLCanvasElement.prototype.getContext=function(kind){if(kind==='webgl'){contexts++;return gpu?gl:null;}return null;};
 window.HTMLElement.prototype.getBoundingClientRect=function(){
  const index=[...doc.querySelectorAll('#appSidebar .nav-item')].indexOf(this),y=this.id==='artistSearchBtn'?145:index>=0?50+index*45:30;
  return {x:10,y,left:10,top:y,right:220,bottom:y+40,width:this.testHidden?0:210,height:this.testHidden?0:40};
 };
 const sidebar=doc.getElementById('appSidebar');Object.defineProperty(sidebar,'scrollLeft',{value:0});Object.defineProperty(sidebar,'scrollTop',{value:0});
 vm.runInContext(source,vm.createContext(window));
 function event(node,type){const e=new window.Event(type,{bubbles:true,cancelable:true});e.clientX=90;e.clientY=50;node.dispatchEvent(e);return e;}
 function advance(ms){const end=clock+ms;while(clock<end){clock+=16;const batch=[...frames];frames.clear();for(const [,fn]of batch)fn(clock);}}
 return {window,doc,frames,media,event,advance,resize(){resizeCallbacks.forEach(fn=>fn());},get contexts(){return contexts;},get draws(){return draws;}};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('Glass follows all sidebar destinations, rapid changes and Search Artist without altering actions',async()=>{
 const f=fixture(),{doc}=f;assert.equal(f.frames.size,0);const lens=doc.querySelector('.de-glass-lens');
 for(const button of doc.querySelectorAll('#appSidebar .nav-item')){
  for(const b of doc.querySelectorAll('.nav-item'))b.classList.toggle('active',b===button);
  await flush();f.advance(1400);assert.equal(button.classList.contains('de-glass-selected'),true);assert.equal(lens.dataset.moving,'false');assert.equal(f.frames.size,0);
 }
 const modal=doc.getElementById('artistSearchModal');modal.classList.remove('hidden');await flush();f.advance(1500);
 assert.equal(doc.getElementById('artistSearchBtn').classList.contains('de-glass-selected'),true);
 modal.classList.add('hidden');await flush();f.advance(1500);assert.equal(doc.getElementById('artistSearchBtn').classList.contains('de-glass-selected'),false);
});
test('All five requested buttons retain native presentation and actions without cloth work',()=>{
 const f=fixture({gpu:true}),ids=['searchBtn','v18AskBtn','heroSearchBtn','v2313RepairBtn','smartAutoplayToggle'];let clicks=0;
 for(const id of ids){const b=f.doc.getElementById(id),label=b.textContent;b.addEventListener('click',()=>clicks++);
  f.event(b,'pointerenter');f.event(b,'pointermove');f.event(b,'focus');f.event(b,'pointerdown');f.event(b,'pointerup');
  assert.equal(f.event(b,'click').defaultPrevented,false);f.advance(1400);
  assert.equal(b.textContent,label);assert.equal(b.classList.contains('de-fabric-btn'),false);
 }
 assert.equal(clicks,5);assert.equal(f.contexts,0);assert.equal(f.frames.size,0);
 assert.equal(f.doc.querySelectorAll('.de-fabric-canvas').length,0);
});
test('Glass palette still follows themes with native buttons',async()=>{
 const f=fixture();f.doc.body.dataset.theme='space';await flush();
 assert.equal(f.doc.body.style.getPropertyValue('--de-control-rgb'),'32 50 116');
 assert.equal(f.doc.querySelectorAll('.de-fabric-btn').length,0);
});
test('Home and Calm layout changes preserve the moving glass spring',async()=>{
 const f=fixture(),lens=f.doc.querySelector('.de-glass-lens');
 for(const tab of ['feelHappy','home']){
  for(const b of f.doc.querySelectorAll('.nav-item'))b.classList.toggle('active',b.dataset.tab===tab);
  await flush();f.advance(32);const before=lens.style.transform;
  f.resize();assert.equal(lens.dataset.moving,'true','show/hide of topbar must not snap selection');
  assert.equal(lens.style.transform,before,'resize preserves current spring position');
  f.advance(1600);assert.equal(lens.dataset.moving,'false');assert.equal(f.frames.size,0);
 }
});
