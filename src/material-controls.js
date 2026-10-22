/* Theme-aware glass navigation. Native buttons retain their original styles and actions. */
(() => {
  'use strict';
  const sidebar=document.getElementById('appSidebar');
  if(!sidebar)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  // rgb, rim, ink, spring, damping, lift, folds, grain, material, lens spring/drag/stretch/turn
  const profiles={
    golden:[[239,181,64],[255,237,175],'#291a06',115,15,17,1.7,.035,0,340,26,.22,1.7],
    light:[[233,237,244],[255,255,255],'#172435',145,21,12,1.2,.065,1,410,34,.11,.5],
    dark:[[51,65,88],[187,210,238],'#f2f5ff',120,20,13,1.5,.07,2,325,30,.13,.7],
    purple:[[112,53,186],[234,187,255],'#fff1ff',95,13,20,2.1,.085,3,285,21,.25,2.1],
    toxic:[[60,205,108],[208,255,134],'#052b18',160,17,17,1.9,.035,4,430,26,.19,1.3],
    blood:[[174,30,57],[255,135,147],'#fff1ec',130,19,15,2,.08,5,365,29,.16,1.8],
    silver:[[180,199,219],[248,252,255],'#152435',175,24,11,1.15,.03,6,470,38,.09,.4],
    transparent:[[125,166,186],[226,250,255],'#102532',105,16,16,1.3,.025,7,300,24,.23,1.1],
    fluids:[[42,153,178],[128,246,255],'#052532',85,11,22,2.3,.025,8,240,19,.28,2.4],
    rgb:[[120,66,198],[255,201,244],'#ffffff',125,14,19,1.8,.035,9,380,23,.24,2],
    love:[[218,91,153],[255,218,237],'#32102a',100,16,18,1.7,.055,10,310,25,.21,1.5],
    space:[[32,50,116],[164,208,255],'#ecf6ff',80,12,21,2,.035,11,220,19,.27,2.8],
    nebula:[[137,32,83],[255,159,191],'#fff2f8',90,12.5,23,2.2,.055,12,260,20,.26,2.5],
    dragon:[[190,82,23],[255,221,137],'#fff4dc',170,18,16,2.4,.09,13,450,27,.18,1.9]
  };
  let profile=profiles.golden;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const visible=node=>!!node && !document.hidden && node.isConnected && node.getBoundingClientRect().width>0;
  let lensFrame=0,lensLast=0,lensReady=false,lensTarget=null;
  const value={x:0,y:0,w:1,h:1},velocity={x:0,y:0,w:0,h:0};
  let baseW=1,baseH=1;
  const lens=document.createElement('div');lens.className='de-glass-lens';lens.setAttribute('aria-hidden','true');
  lens.innerHTML='<i class="de-glass-core"></i><i class="de-glass-top"></i><i class="de-glass-bottom"></i>';
  sidebar.appendChild(lens);sidebar.classList.add('de-glass-nav');
  function paintLens(){
    const speed=velocity.y,stretch=reduced.matches?0:Math.min(Math.abs(speed)/1600,profile[11]);
    const tilt=reduced.matches?0:clamp(-speed/500,-profile[12],profile[12]);
    lens.style.transform=`translate3d(${value.x}px,${value.y}px,0) scale(${value.w/baseW*(1-stretch*.25)},${value.h/baseH*(1+stretch)}) rotate(${tilt}deg)`;
    const lead=Math.min(Math.abs(speed)/55,9);lens.style.borderRadius=`${22+lead}px ${22-lead*.5}px ${22+lead}px ${22-lead*.5}px`;
  }
  function lensTick(stamp){
    lensFrame=0;if(!lensTarget||document.hidden||!sidebar.isConnected)return;
    const dt=Math.min(.032,Math.max(0,(stamp-lensLast)/1000));lensLast=stamp;
    let moving=false;
    for(const key of ['x','y','w','h']){
      for(let i=0;i<3;i++){const h=dt/3;velocity[key]+=((lensTarget[key]-value[key])*profile[9]-velocity[key]*profile[10])*h;value[key]+=velocity[key]*h;}
      if(Math.abs(lensTarget[key]-value[key])>.025||Math.abs(velocity[key])>.1)moving=true;
    }
    if(!moving){Object.assign(value,lensTarget);for(const key in velocity)velocity[key]=0;}
    paintLens();if(moving)lensFrame=requestAnimationFrame(lensTick);else lens.dataset.moving='false';
  }
  function syncLens(snap=false){
    const modal=document.getElementById('artistSearchModal');
    const chosen=modal&&!modal.classList.contains('hidden')?document.getElementById('artistSearchBtn'):sidebar.querySelector('.nav-item.active');
    if(!chosen||!visible(sidebar)){lens.style.visibility='hidden';if(lensFrame)cancelAnimationFrame(lensFrame);lensFrame=0;return;}
    for(const button of sidebar.querySelectorAll('.nav-item,#artistSearchBtn')){const selected=button===chosen;if(button.classList.contains('de-glass-selected')!==selected)button.classList.toggle('de-glass-selected',selected);}
    const r=chosen.getBoundingClientRect(),s=sidebar.getBoundingClientRect();if(!r.height)return;
    const target={x:r.left-s.left+sidebar.scrollLeft,y:r.top-s.top+sidebar.scrollTop,w:r.width,h:r.height};
    lens.style.visibility='visible';
    if(lensReady&&lensTarget&&Object.keys(target).every(k=>Math.abs(target[k]-lensTarget[k])<.1)&&!snap)return;
    lensTarget=target;baseW=target.w;baseH=target.h;lens.style.width=baseW+'px';lens.style.height=baseH+'px';
    if(!lensReady||snap||reduced.matches){Object.assign(value,target);for(const key in velocity)velocity[key]=0;lensReady=true;if(lensFrame)cancelAnimationFrame(lensFrame);lensFrame=0;lens.dataset.moving='false';paintLens();return;}
    lens.dataset.moving='true';if(!lensFrame){lensLast=performance.now();lensFrame=requestAnimationFrame(lensTick);}
  }
  function mount(){syncLens();}
  function applyMaterial(){
    const theme=document.body.dataset.theme||'golden';profile=profiles[theme]||profiles.golden;
    const style=document.body.style;style.setProperty('--de-control-rgb',profile[0].join(' '));style.setProperty('--de-control-rim',profile[1].join(' '));style.setProperty('--de-control-ink',profile[2]);
    document.body.dataset.controlMaterial=theme;
    syncLens(true);
  }
  applyMaterial();mount();
  new MutationObserver(applyMaterial).observe(document.body,{attributes:true,attributeFilter:['data-theme']});
  new MutationObserver(mount).observe(sidebar,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  const artistModal=document.getElementById('artistSearchModal');if(artistModal)new MutationObserver(()=>syncLens()).observe(artistModal,{attributes:true,attributeFilter:['class']});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>syncLens()).observe(sidebar);
  window.addEventListener('resize',()=>syncLens(true));
  document.addEventListener('visibilitychange',()=>syncLens(true));
  reduced.addEventListener?.('change',()=>syncLens(true));
  document.addEventListener('DOMContentLoaded',mount,{once:true});
})();
