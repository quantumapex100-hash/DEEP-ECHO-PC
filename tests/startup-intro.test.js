const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),{parseHTML}=require('linkedom');
const source=fs.readFileSync('src/startup-intro.js','utf8'),assets=fs.readFileSync('src/startup-intro-template.js','utf8');
function fixture({theme='golden',reduce=false,context=true}={}){
 const {window}=parseHTML('<html><head></head><body data-theme="'+theme+'" class="deepeccho-startup-lite"><div class="app"><button>Real app</button></div><canvas id="particles"></canvas></body></html>');
 const doc=window.document;Object.defineProperty(doc,'readyState',{value:'loading'});let now=0,id=0;const timers=new Map(),frames=new Map(),storage=new Map([['echo-theme-v1',theme]]);
 Object.assign(window,{innerWidth:1100,innerHeight:720,performance:{now:()=>now},matchMedia:()=>({matches:reduce}),localStorage:{getItem:k=>storage.get(k)||null},setTimeout:(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;},clearTimeout:k=>timers.delete(k),requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:k=>frames.delete(k)});
 const ctx={clearRect(){},strokeRect(){}};window.HTMLCanvasElement.prototype.getContext=()=>context?ctx:null;
 doc.querySelector('.app').inert=false;const c=vm.createContext(window);vm.runInContext(assets,c);vm.runInContext(source,c);
 doc.dispatchEvent(new window.Event('DOMContentLoaded'));
 function advance(ms){const end=now+ms;while(now<end){now+=16;for(const [key,t]of [...timers])if(t.at<=now){timers.delete(key);t.fn();}const batch=[...frames];frames.clear();for(const [,fn]of batch)fn(now);}}
 return {window,doc,timers,frames,advance,host:()=>doc.getElementById('deepEchoStartupIntro'),mark:key=>window.deepEchoStartup?.mark(key)};
}
test('Intro uses every saved theme, isolates demo styles and leaves the real app loaded',()=>{
 for(const theme of ['golden','light','dark','purple','toxic','blood','silver','transparent','fluids','rgb','love','space','nebula','dragon']){
  const f=fixture({theme});assert.equal(f.host().dataset.theme,theme);assert.ok(f.host().shadowRoot.querySelector('.logo-wrap'));assert.equal(f.host().shadowRoot.querySelector('#ui'),null);
  assert.equal(f.doc.querySelector('.app').textContent,'Real app');assert.ok(f.doc.getElementById('particles'));
  assert.equal(f.host().shadowRoot.querySelector('[role=progressbar]').getAttribute('aria-valuenow'),'0');
 }
});
test('Ready startup still plays seven seconds then the original 1650ms reveal and cleans up',()=>{
 const f=fixture();for(const key of ['library','background','session'])f.mark(key);f.advance(6900);assert.equal(f.window.deepEchoStartup.getState().revealing,false);
 f.advance(200);assert.equal(f.window.deepEchoStartup.getState().revealing,true);f.advance(1200);assert.ok(f.host(),'reveal retains its full duration');f.advance(600);
 assert.equal(f.host(),null);assert.equal(f.window.deepEchoStartup,undefined);assert.equal(f.doc.querySelector('.app').inert,false);assert.equal(f.frames.size,0);assert.equal(f.timers.size,0);
});
test('A stalled session cannot block startup; progress never falsely reports that stage complete',()=>{
 const f=fixture();f.mark('library');f.mark('background');f.advance(6900);
 assert.ok(Number(f.host().shadowRoot.querySelector('[role=progressbar]').getAttribute('aria-valuenow'))<100);
 assert.equal(f.window.deepEchoStartup.getState().stages.includes('session'),false);
 assert.match(f.host().shadowRoot.querySelector('[role=progressbar]').getAttribute('aria-valuetext'),/75% local startup/);
 f.advance(2000);assert.equal(f.host(),null);assert.equal(f.doc.querySelector('.app').inert,false);
});
test('Reduced motion, skip and unavailable canvas all release native controls safely',()=>{
 for(const opts of [{reduce:true},{context:false},{}]){const f=fixture(opts);f.host().shadowRoot.getElementById('deIntroContinue').click();f.advance(2300);assert.equal(f.host(),null);assert.equal(f.doc.querySelector('.app').inert,false);assert.equal(f.frames.size,0);}
});

test('Every main-window launch starts native fullscreen while existing escape controls remain',()=>{
 const main=fs.readFileSync('main.js','utf8');const start=main.indexOf('function createWindow('),end=main.indexOf('function createMiniPlayerWindow(',start);
 assert.match(main.slice(start,end),/fullscreen: true/);assert.match(main.slice(start,end),/input.key === 'F11'/);assert.match(main.slice(start,end),/input.key === 'Escape'/);
});
test('Parallax follows each display tick, then sleeps after the pointer settles',()=>{
 const f=fixture(),event=new f.window.Event('pointermove');event.clientX=1050;event.clientY=650;f.window.dispatchEvent(event);
 const positions=new Set();for(let i=0;i<12;i++){f.advance(16);positions.add(f.host().shadowRoot.getElementById('logoDepth').style.transform);}
 assert.equal(positions.size,12,'no fixed 30fps throttle on pointer motion');
 f.advance(1800);assert.equal(f.frames.size,0,'settled pointer does not leave a running frame loop');
 assert.equal(f.host().shadowRoot.querySelectorAll('svg.filaments,svg.liquid-sculpture').length,0);
 const images=f.host().shadowRoot.querySelectorAll('img.filaments,img.liquid-sculpture');assert.equal(images.length,4);
 for(const image of images)assert.ok(image.src.startsWith('data:image/svg+xml'),'decorations stay local and reusable');
});
test('Opaque intro avoids painting covered app, warms it before reveal and always releases visibility',()=>{
 const f=fixture();assert.equal(f.doc.body.classList.contains('de-intro-covered'),true);
 f.advance(6100);assert.equal(f.doc.body.classList.contains('de-intro-covered'),false);
 assert.equal(f.window.deepEchoStartup.getState().revealing,false,'composition warming keeps the seven-second intro intact');
 f.advance(2800);assert.equal(f.host(),null);assert.equal(f.doc.body.classList.contains('de-intro-covered'),false);
});
