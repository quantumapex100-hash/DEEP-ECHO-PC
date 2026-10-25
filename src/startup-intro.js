/* Cinematic startup presentation. Existing startup and session work runs independently. */
(() => {
  'use strict';
  const template=window.__deepEchoIntroTemplate;
  delete window.__deepEchoIntroTemplate;
  if(!template||!document.body)return;
  const palettes={
    golden:['216,163,93','255,228,188','#100905','#2d1b0f','#f5dfbd'],
    light:['137,157,185','255,255,255','#dce3eb','#ffffff','#23354b'],
    dark:['93,123,164','206,224,250','#080c13','#182337','#edf3ff'],
    purple:['156,86,231','237,207,255','#10071d','#32164d','#f2e2ff'],
    toxic:['57,219,103','211,255,152','#031208','#123c1b','#e5ffce'],
    blood:['213,43,64','255,188,178','#190307','#4d101c','#ffe8de'],
    silver:['162,182,208','245,251,255','#101820','#344556','#eef6ff'],
    transparent:['116,177,197','221,251,255','#091b23','#264a55','#e7f9ff'],
    fluids:['45,194,211','180,255,241','#031b24','#08434c','#ddfff8'],
    rgb:['167,96,241','173,248,255','#130a25','#34234f','#fff0ff'],
    love:['234,105,164','255,211,232','#240b1b','#5b2446','#ffebf4'],
    space:['90,141,245','197,224,255','#050b22','#172757','#eaf2ff'],
    nebula:['223,57,107','255,184,209','#17030d','#4d102e','#ffe6f0'],
    dragon:['235,110,34','255,222,146','#1b0803','#4f210b','#fff0ce']
  };
  const started=performance.now(),stages=new Set(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const host=document.createElement('div');host.id='deepEchoStartupIntro';
  const shadow=host.attachShadow({mode:'open'});
  shadow.innerHTML='<style>'+template.css+'</style><div class="layer bg-glow" id="bgGlow"></div><div class="layer vignette"></div>'+template.html+
    '<div id="pixelReveal" hidden aria-hidden="true"><canvas id="pixelCanvas"></canvas></div><button id="deIntroContinue" type="button">Continue to DeepEcho</button>';
  document.body.appendChild(host);
  const core=shadow.getElementById('introCore'),logo=shadow.getElementById('logoDepth'),rings=shadow.getElementById('ringField');
  const bar=shadow.getElementById('loadingBar'),status=document.createElement('div');
  status.id='deIntroStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');core.appendChild(status);
  const shell=bar.parentElement;shell.setAttribute('role','progressbar');shell.setAttribute('aria-label','DeepEcho startup');shell.setAttribute('aria-valuemin','0');shell.setAttribute('aria-valuemax','100');
  const spectrum=shadow.getElementById('ambientSpectrum');
  if(spectrum)for(let i=0;i<28;i++){const b=document.createElement('i');b.className='spectrum-bar';b.style.height=(12+Math.sin(i*.7)**2*65)+'%';b.style.animationDelay=(-i*.11)+'s';spectrum.appendChild(b);}
  const nativeStyle=document.createElement('style');nativeStyle.textContent=
    'body.de-intro-covered>:not(#deepEchoStartupIntro):not(script):not(style){visibility:hidden!important}body.de-intro-revealing>.app{z-index:100001;will-change:transform;transform:translate3d(0,106vh,0);transition:transform 1.3s cubic-bezier(.17,.83,.19,1)}body.de-intro-rising>.app{transform:translate3d(0,0,0)}';
  document.head.appendChild(nativeStyle);
  document.body.classList.add('de-intro-covered');
  let theme='golden',done=false,revealing=false,frame=0,finishTimer=0,progressTimer=0,watchdog=0,last=0,app=null,appLocked=false,previousInert=false,originalClip='';
  let x=0,y=0,ex=0,ey=0,appliedTheme='';
  const planes=[['goldenOrbits',-30],['filamentField',38],['hudField',19],['bgGlow',32]].map(([id,depth])=>[shadow.getElementById(id),depth]);
  const decorations=[...shadow.querySelectorAll('svg.filaments,svg.liquid-sculpture')].map(svg=>{
    const image=document.createElement('img');image.className=svg.getAttribute('class');image.alt='';image.decoding='async';
    const paths=[...svg.querySelectorAll('path')].map(path=>({d:path.getAttribute('d'),kind:path.getAttribute('class')||'',width:path.getAttribute('stroke-width')||'2',opacity:path.getAttribute('opacity')||'1'}));
    const box=svg.getAttribute('viewBox');svg.replaceWith(image);return {image,paths,box,liquid:image.className.includes('liquid-sculpture')};
  });
  function applyTheme(){
    let selected=document.body.dataset.theme||theme;
    if(!stages.has('ui'))try{selected=localStorage.getItem('echo-theme-v1')||selected;}catch(_){}
    theme=palettes[selected]?selected:'golden';if(theme===appliedTheme)return;appliedTheme=theme;const p=palettes[theme],index=Object.keys(palettes).indexOf(theme);
    host.dataset.theme=theme;
    for(const [key,value]of Object.entries({'accent':p[0],'rim':p[1],'bg':p[2],'bg2':p[3],'text':p[4],'pulse':(2.1+index*.075)+'s'}))host.style.setProperty('--intro-'+key,value);
    for(const {image,paths,box,liquid}of decorations){
      const content=paths.map(path=>{const shadowPath=path.kind==='shadow',highlight=path.kind==='highlight';
        const width=liquid?(shadowPath?22:highlight?2.1:15):path.width;
        const colour=highlight?p[1]:p[0],opacity=liquid?(shadowPath ? .2 : highlight ? .9 : .75):path.opacity;
        return `<path d="${path.d}" fill="none" stroke="rgb(${colour})" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}" ${liquid?'':'stroke-dasharray="24 12"'}/>`;
      }).join('');
      image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" preserveAspectRatio="none">${content}</svg>`);
    }
    shadow.querySelectorAll('.ring,.orbit-track').forEach((n,i)=>{n.style.animationDuration=(3.4+(index%5)*.35+i*.55)+'s';n.style.animationDirection=index%2?'reverse':'normal';});
  }
  function update(){
    if(done||revealing)return;
    const weights={theme:15,ui:25,library:20,background:15,session:25};
    const progress=[...stages].reduce((sum,key)=>sum+(weights[key]||0),0);
    shell.setAttribute('aria-valuetext',`${Math.round(Math.min(100,(performance.now()-started)/70))}% intro · ${progress}% local startup stages complete`);
    const message=!stages.has('ui')?'Preparing your interface…':!stages.has('library')?'Loading your library…':!stages.has('background')?'Preparing your theme…':!stages.has('session')?'Restoring your previous session…':'Ready';
    if(status.textContent!==message)status.textContent=message;
    // Readiness updates the status; the full seven-second cinematic always plays.
  }
  function mark(stage){if(done||revealing)return;stages.add(stage);update();}
  // A tiny bridge reports completion; it never starts a second library/session request.
  window.deepEchoStartup={mark,getState:()=>({stages:[...stages],theme,revealing,done})};
  function pointer(event){x=Math.max(-1,Math.min(1,event.clientX/innerWidth*2-1));y=Math.max(-1,Math.min(1,event.clientY/innerHeight*2-1));if(!frame&&!done&&!revealing)frame=requestAnimationFrame(parallax);}
  function leave(){x=y=0;if(!frame&&!done&&!revealing)frame=requestAnimationFrame(parallax);}
  function parallax(t){
    frame=0;if(done||revealing||document.hidden||reduced.matches)return;
    const dt=last?Math.min(.05,Math.max(0,(t-last)/1000)):1/60;last=t;
    const follow=1-Math.exp(-dt/0.15);ex+=(x-ex)*follow;ey+=(y-ey)*follow;
    core.style.transform=`translate3d(${ex*14}px,${ey*11-14}px,0)`;
    logo.style.transform=`translate3d(${ex*20}px,${ey*16}px,0) rotateX(${-ey*8}deg) rotateY(${ex*11}deg)`;
    rings.style.transform=`translate3d(${-ex*27}px,${-ey*20}px,0)`;
    for(const [n,depth]of planes){if(n)n.style.transform=`translate3d(${ex*depth}px,${ey*depth*.7}px,0)`;}
    if(Math.abs(x-ex)+Math.abs(y-ey)>.003)frame=requestAnimationFrame(parallax);
  }
  function cleanup(){
    if(done)return;done=true;clearTimeout(watchdog);clearTimeout(progressTimer);clearTimeout(finishTimer);if(frame)cancelAnimationFrame(frame);
    themeObserver.disconnect();backgroundObserver.disconnect();window.removeEventListener('pointermove',pointer);window.removeEventListener('pointerleave',leave);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',key);document.removeEventListener('DOMContentLoaded',domReady);
    document.body.classList.remove('de-intro-covered','de-intro-revealing','de-intro-rising');
    if(app){app.inert=previousInert;app.style.clipPath=originalClip;}
    host.remove();nativeStyle.remove();delete window.deepEchoStartup;
    window.dispatchEvent(new Event('deepecho-intro-complete'));
  }
  function reveal(skipped){
    if(done||revealing)return;revealing=true;clearTimeout(progressTimer);clearTimeout(watchdog);if(frame)cancelAnimationFrame(frame);frame=0;
    document.body.classList.remove('de-intro-covered');
    app=document.querySelector('body>.app');if(!app){cleanup();return;}
    lockApp();
    // Background startup keeps laying out the real app. Only this short entrance transforms it.
    if(reduced.matches||document.hidden){cleanup();return;}
    finishTimer=setTimeout(cleanup,2200);
    document.body.classList.add('de-intro-revealing');host.classList.add('revealing');
    void app.offsetWidth; // Commit the initial below-window transform once, before the entrance.
    shell.setAttribute('aria-valuenow','100');
    const canvas=shadow.getElementById('pixelCanvas'),pixel=shadow.getElementById('pixelReveal'),ctx=canvas.getContext('2d');
    const w=innerWidth,h=innerHeight,cx=w/2,cy=h/2,tile=Math.max(22,Math.round(Math.min(w,h)/24)),far=Math.hypot(cx,cy)+70;
    canvas.width=w;canvas.height=h;pixel.hidden=false;
    const cells=[];for(let row=0;row<Math.ceil(h/tile);row++)for(let col=0;col<Math.ceil(w/tile);col++){const n=Math.abs(Math.sin(row*94.377+col*73.719)*43758.5453)%1;cells.push({x:col*tile,y:row*tile,d:Math.hypot(col*tile+tile/2-cx,row*tile+tile/2-cy)+(n-.5)*tile,n});}
    const begin=performance.now(),duration=1650;let paint=0;
    frame=requestAnimationFrame(function draw(t){
      frame=0;if(done)return;
      if(!document.body.classList.contains('de-intro-rising'))document.body.classList.add('de-intro-rising');
      const p=Math.min(1,(t-begin)/duration),e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2,radius=e*far;
      app.style.clipPath=`circle(${radius}px at 50% 50%)`;
      if(t-paint>=1000/60-.5||p===1){paint=t;
        if(ctx){ctx.clearRect(0,0,w,h);for(const c of cells){const distance=Math.abs(c.d-radius);if(distance>tile*2.2)continue;const a=(1-distance/(tile*2.2))*Math.min(1,(1-p)*6);ctx.strokeStyle=`rgba(${palettes[theme][c.n>.45?1:0]},${a})`;ctx.lineWidth=1;ctx.strokeRect(c.x+1.5,c.y+1.5,tile-3,tile-3);}}
      }
      if(p<1)frame=requestAnimationFrame(draw);else cleanup();
    });
    // Fault/occlusion escape: no failed canvas frame can leave controls hidden.
  }
  function resize(){if(revealing)cleanup();}
  function visibility(){if(document.hidden&&revealing)cleanup();else if(!document.hidden&&!revealing)leave();}
  function key(event){if(event.key==='Escape'){event.preventDefault();reveal(true);}}
  const themeObserver=new MutationObserver(applyTheme);themeObserver.observe(document.body,{attributes:true,attributeFilter:['data-theme']});
  const backgroundObserver=new MutationObserver(()=>{if(!document.body.classList.contains('deepeccho-startup-lite'))mark('background');});backgroundObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  shadow.getElementById('deIntroContinue').addEventListener('click',()=>reveal(true));
  window.addEventListener('pointermove',pointer,{passive:true});window.addEventListener('pointerleave',leave);window.addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',key);
  applyTheme();mark('theme');
  function lockApp(){app=document.querySelector('body>.app');if(app&&!appLocked){previousInert=app.inert;originalClip=app.style.clipPath;app.inert=true;appLocked=true;}}
  function domReady(){if(done)return;lockApp();mark('ui');applyTheme();if(!document.body.classList.contains('deepeccho-startup-lite'))mark('background');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',domReady,{once:true});else domReady();
  function progressTick(){
    if(done||revealing)return;
    const progress=Math.min(100,(performance.now()-started)/70);
    // Layout, resource loading and session work continue while covered. Warm the
    // actual app's composition before the entrance rather than double-painting it for 7s.
    if(progress>=85)document.body.classList.remove('de-intro-covered');
    if(reduced.matches)bar.style.width=progress+'%';
    shell.setAttribute('aria-valuenow',String(Math.round(progress)));update();
    if(progress<100)progressTimer=setTimeout(progressTick,125);
  }
  progressTick();
  watchdog=setTimeout(()=>reveal(false),7000);
})();
