(() => {
  'use strict';
  const view = document.getElementById('feelHappyView');
  const scene = document.getElementById('happyScene');
  const canvas = document.getElementById('happyCanvas');
  if (!view || !scene || !canvas) return;
  let ctx = canvas.getContext('2d');
  if (!ctx) return;
  const baseCtx=ctx;
  let grassGPU=null,gpuAttempted=false,frontCanvas=null,frontCtx=null,nextFrame=0,backdropStamp=-1,backdropPhase=-1,backdropGPU=false;
  let renderScale=1,budgetStart=0,budgetFrames=0,cadenceLast=0,cadenceFastest=Infinity;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const palettes = [
    ['#408bd0','#c6e1ef','#e1e4b5','#8eaa6b','#496a32','#152b17'],
    ['#655193','#e8a68b','#ffdaa2','#a0965a','#65713c','#27371e'],
    ['#03112d','#15365a','#405c6a','#1d302c','#132b25','#061513']
  ];
  let width=1,height=1,blades=[],frame=0,last=0,time=0,phase=0,target=0,auto=false,paused=reduced.matches;
  let pointer={x:-1000,y:-1000},ripples=[],cloudTexture=null,trees=[],touchLights=[],terrainTexture=null;
  let pointerSpeed=0,lastPointer=0;
  let pointerVX=0,brushFrom=null,brushAge=1,brushPending=false,previewLast=0;
  let lastTrail=null,sceneBox=null;
  let trailField=null,scenePalette=null,auroraTexture=null,fireflyTexture=null;
  const wildlife=null; // Animals disabled at user request; birds remain.
  const audio=document.getElementById('audioPlayer');
  const calmSeek=document.getElementById('calmSeekBar'),calmPlay=document.getElementById('calmPlayBtn');
  const calmPanel=document.getElementById('calmTransportPanel'),calmToggle=document.getElementById('calmTransportToggle');
  const clockLabel=seconds=>{const value=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;};
  function updateTransport(){
    if(!active() || !audio || !calmSeek)return;
    const title=typeof currentSong!=='undefined' && currentSong ? currentSong.title||'' : '';
    const titleElement=document.getElementById('calmSongTitle');if(titleElement){titleElement.textContent=title;titleElement.title=title;}
    const duration=Number(audio.duration),valid=Number.isFinite(duration)&&duration>0;
    const percent=valid?Math.max(0,Math.min(100,(Number(audio.currentTime)||0)/duration*100)):0;
    calmSeek.disabled=!valid;calmSeek.value=String(percent);calmSeek.style.setProperty('--calm-progress',`${percent}%`);
    document.getElementById('calmCurrentTime').textContent=clockLabel(audio.currentTime);
    document.getElementById('calmDuration').textContent=valid?clockLabel(duration):'0:00';
    const playing=!audio.paused&&!audio.ended;calmPlay.textContent=playing?'Ⅱ':'▶';calmPlay.setAttribute('aria-label',playing?'Pause':'Play');calmPlay.title=playing?'Pause':'Play';
  }
  scene.querySelectorAll('[data-calm-action]').forEach(button=>button.addEventListener('click',()=>{document.getElementById(button.dataset.calmAction)?.click();updateTransport();}));
  calmSeek?.addEventListener('input',()=>{if(calmSeek.disabled)return;const seek=document.getElementById('seekBar');if(seek){seek.value=calmSeek.value;seek.dispatchEvent(new Event('input',{bubbles:true}));}updateTransport();});
  calmToggle?.addEventListener('click',()=>{calmPanel.hidden=!calmPanel.hidden;scene.dataset.transportHidden=String(calmPanel.hidden);calmToggle.setAttribute('aria-expanded',String(!calmPanel.hidden));const label=calmPanel.hidden?'Show music controls':'Hide music controls';calmToggle.textContent=calmPanel.hidden?'⌄':'⌃';calmToggle.setAttribute('aria-label',label);calmToggle.title=label;});
  const sidebarToggle=document.getElementById('calmSidebarToggle');
  sidebarToggle?.addEventListener('click',()=>{const hidden=scene.dataset.sidebarHidden!=='true';scene.dataset.sidebarHidden=String(hidden);sidebarToggle.setAttribute('aria-expanded',String(!hidden));sidebarToggle.textContent=hidden?'›':'‹';sidebarToggle.title=hidden?'Show sidebar':'Hide sidebar';sidebarToggle.setAttribute('aria-label',sidebarToggle.title);resize();});
  const skyLyrics=document.getElementById('happySkyLyrics'),skyLine=document.getElementById('happySkyLine');
  const skyPrev=document.getElementById('happySkyPrev'),skyNext=document.getElementById('happySkyNext');
  const noteColours=['#ffd16b','#ff90c0','#7ee5ff','#b5a0ff','#8cf0b0','#ffad72','#f7f0a1','#78c8ff'];
  let noteSector=0;
  let musicEnergy=0,energySamples=null;
  function readMusicIntensity(dt){
    let energy=0;
    // Sample the existing analyser only; never reconnect or route playback through a new node.
    if(musicPlaying() && typeof audioAnalyser!=='undefined' && audioAnalyser){
      if(!energySamples || energySamples.length!==audioAnalyser.fftSize)energySamples=new Uint8Array(audioAnalyser.fftSize);
      audioAnalyser.getByteTimeDomainData(energySamples);let sum=0;
      for(let i=0;i<energySamples.length;i++){const sample=(energySamples[i]-128)/128;sum+=sample*sample;}
      energy=Math.min(1,Math.sqrt(sum/energySamples.length)*4.6)*(audio.muted?0:Number(audio.volume??1));
    }
    musicEnergy+=(energy-musicEnergy)*(1-Math.exp(-dt*(energy>musicEnergy?9:3)));
    return musicEnergy;
  }
  let notes=[],noteClock=0,lyricsTimer=0,lastSkyText='';
  let meteors=[],meteorClock=6;
  const musicPlaying=()=>!!audio && !audio.paused && !audio.ended && audio.readyState>=2;
  function updateSkyLyrics(){
    if(!skyLyrics || !skyLine || !active())return;
    let text='',previous='',next='';
    // Read the authoritative lyrics clock; never seek, refetch, or change lyric state.
    if(typeof currentSong!=='undefined' && currentSong && typeof lyricsQuery!=='undefined' && lyricsQuery && typeof lyricLines!=='undefined' && lyricLines.length && typeof lyricsPlaybackClock==='function' && typeof findActiveLyricIndex==='function'){
      const same= currentSong.id && lyricsQuery.id ? String(currentSong.id)===String(lyricsQuery.id) : currentSong.title===lyricsQuery.title;
      if(same){const index=findActiveLyricIndex(lyricLines,lyricsPlaybackClock());text=lyricLines[index]?.text||'';previous=lyricLines[index-1]?.text||'';next=lyricLines[index+1]?.text||'';}
    }
    skyLyrics.hidden=!(text||next);
    if(skyPrev)skyPrev.textContent=previous;if(skyNext)skyNext.textContent=next;
    if(text!==lastSkyText){lastSkyText=text;skyLine.textContent=text;skyLine.style.animation='none';void skyLine.offsetWidth;skyLine.style.animation='';}
  }
  const active=()=>view.classList.contains('active') && !document.hidden;
  let seed=6143;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const hill=(x)=>height*(.59-.077*Math.sin(x/width*3.5+.1));
  // Bound full-screen layer bandwidth on integrated graphics and large displays.
  // CSS coordinates and grass density stay unchanged when render resolution is capped.
  function renderRatio(w=width,h=height){return Math.min(window.devicePixelRatio||1,1.25,Math.sqrt(1100000/Math.max(1,w*h)))*renderScale;}
  function observeFrameBudget(stamp,didDraw){
    if(cadenceLast){const gap=stamp-cadenceLast;if(gap>=4)cadenceFastest=Math.min(cadenceFastest,gap);}
    cadenceLast=stamp;if(!budgetStart)budgetStart=stamp;
    if(didDraw)budgetFrames++;
    const elapsed=stamp-budgetStart;if(elapsed<2200 || budgetFrames<20)return;
    // Respect a 60Hz screen's own limit; never lower quality just for lacking 90Hz.
    const goal=Math.max(1000/80,Number.isFinite(cadenceFastest)?Math.min(1000/60,cadenceFastest):1000/60);
    const average=elapsed/budgetFrames;let next=renderScale;
    if(average>goal*1.18)next=Math.max(.7,renderScale-.1);
    else if(average<goal*1.03)next=Math.min(1,renderScale+.05);
    budgetStart=stamp;budgetFrames=0;cadenceFastest=Infinity;
    if(Math.abs(next-renderScale)<.001)return;
    renderScale=next;const ratio=renderRatio();
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    baseCtx.setTransform(ratio,0,0,ratio,0,0);backdropStamp=-1;
    if(grassGPU)grassGPU.resize(ratio);
  }
  function* buildTextures(){
    // Local deterministic state lets idle slices yield without changing meadow physics.
    let seed=6143;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      const cloudTexture=[];
      for(let variant=0;variant<3;variant++){
        const image=document.createElement('canvas');image.width=512;image.height=180;const c=image.getContext('2d');
        for(let i=0;i<160;i++){
          const x=55+random()*400,y=105-Math.sin(x*(.006+variant*.002)+variant)*22+(random()-.5)*35,r=24+random()*38;
          const g=c.createRadialGradient(x-r*.15,y-r*.25,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,.24)');g.addColorStop(.45,'rgba(246,250,252,.18)');g.addColorStop(.8,'rgba(179,202,218,.07)');g.addColorStop(1,'rgba(160,190,210,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
        }cloudTexture.push(image);yield;
      }
      yield;
      const terrainTexture=document.createElement('canvas');terrainTexture.width=512;terrainTexture.height=256;const ground=terrainTexture.getContext('2d');
      for(let i=0;i<180;i++){
        const x=random()*512,y=random()*256,r=8+random()*45;
        const tint=i%2?'rgba(18,39,22,.13)':'rgba(171,174,97,.10)';
        const patch=ground.createRadialGradient(x,y,0,x,y,r);patch.addColorStop(0,tint);patch.addColorStop(1,'rgba(40,65,28,0)');ground.fillStyle=patch;ground.fillRect(x-r,y-r,r*2,r*2);
      }
      // Layered clusters of tiny leaves give the distant tree a textured silhouette.
      yield;
      const trees=[];
      for(let mode=0;mode<palettes.length;mode++){
        const image=document.createElement('canvas');image.width=320;image.height=220;const c=image.getContext('2d');
        seed=7753;c.strokeStyle=mode===2?'#18221e':'#544837';c.lineCap='round';
        function branch(x,y,length,angle,thickness,depth){
          const ex=x+Math.sin(angle)*length,ey=y-Math.cos(angle)*length;
          c.lineWidth=thickness;c.beginPath();c.moveTo(x,y);c.lineTo(ex,ey);c.stroke();
          if(depth){branch(ex,ey,length*.72,angle-.4,thickness*.68,depth-1);branch(ex,ey,length*.64,angle+.55,thickness*.65,depth-1);}
        }
        branch(160,209,56,-.04,9,4);branch(170,209,48,.15,6,4);
        const leafColors=mode===2?['#10221f','#172d26','#23392d','#344b39']:mode===1?['#293e23','#42592c','#61783b','#82924c']:['#203b21','#34562b','#52763a','#75964e'];
        for(let cluster=0;cluster<17;cluster++){
          const angle=cluster*2.4,radius=cluster%4*17,cx=160+Math.cos(angle)*radius,cy=83+Math.sin(angle)*radius*.45;
          const shade=c.createRadialGradient(cx-10,cy-10,0,cx,cy,30);shade.addColorStop(0,leafColors[2]);shade.addColorStop(.65,leafColors[1]);shade.addColorStop(1,leafColors[0]);c.fillStyle=shade;c.beginPath();c.ellipse(cx,cy,24+random()*12,19+random()*8,angle,0,Math.PI*2);c.fill();
        }
        for(let i=0;i<6800;i++){
          if(i && i%400===0)yield;
          const x=160+(random()-.5)*210,y=83+(random()-.5)*105;
          const angle=Math.atan2((y-85)/53,(x-160)/105);
          const canopy=Math.pow((x-160)/105,2)+Math.pow((y-85)/53,2);
          if(canopy> .83+.13*Math.sin(angle*7)+.12*Math.cos(angle*11) || random()<.018)continue;
          c.fillStyle=leafColors[Math.max(0,Math.min(3,Math.floor(random()*2.5+(1-y/110))))];c.beginPath();c.ellipse(x,y,.7+random()*1.6,.5+random()*1.1,random()*3,0,Math.PI*2);c.fill();
        }
        // Sun-facing leaf flecks and fine bark retain the original tree's proportions.
        c.strokeStyle=mode===2?'#34433a':'#9a8963';c.lineWidth=.55;
        for(let k=0;k<8;k++){c.beginPath();c.moveTo(157+k*1.6,205);c.bezierCurveTo(156+k*1.5,185,164+k*.6,170,159+k,157);c.stroke();}
        trees.push(image);yield;
      }
    return {cloudTexture,terrainTexture,trees};
  }
  function commitTextures(assets){
    if(cloudTexture)return;
    cloudTexture=assets.cloudTexture;terrainTexture=assets.terrainTexture;trees=assets.trees;
  }
  function prepareTextures(){
    if(cloudTexture)return;
    const work=buildTextures();let next;
    while(!(next=work.next()).done){};
    commitTextures(next.value);
  }
  function resize(){
    const box=scene.getBoundingClientRect();
    if (!box.width || !box.height) return;
    sceneBox=box;
    const ratio=renderRatio(box.width,box.height);
    if(width===box.width && height===box.height && canvas.width===Math.round(width*ratio) && canvas.height===Math.round(height*ratio))return false;
    width=box.width;height=box.height;
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    baseCtx.setTransform(ratio,0,0,ratio,0,0);backdropStamp=-1;
    seed=6143;blades=[];
    // Keep a dense responsive meadow without 10,000+ individual paths per frame.
    const count=Math.min(4500,Math.round(width*4.5));
    for(let i=0;i<count;i++){
      const x=random()*width,depth=random();
      const y=hill(x)+depth*(height-hill(x));
      blades.push({x,y,depth,len:5+Math.pow(depth,1.2)*(28+random()*74),bend:random()*2-1,tint:random(),stiffness:.4+random()*.6,flower:random()>.998,offset:0,velocity:0});
    }
    blades.sort((a,b)=>a.y-b.y);
    prepareTextures();
    if(!gpuAttempted){gpuAttempted=true;grassGPU=createGrassGPU();}
    if(grassGPU)grassGPU.resize(ratio);
    draw();return true;
  }
  function color(a,b,p){
    const channels=value=>value.startsWith('#')?[16,8,0].map(s=>(parseInt(value.slice(1),16)>>s)&255):value.match(/[\d.]+/g).slice(0,3).map(Number);
    const first=channels(a),second=channels(b);
    return `rgb(${first.map((v,i)=>Math.round(v*(1-p)+second[i]*p)).join(',')})`;
  }
  function ellipse(x,y,rx,ry,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
  const litColors=Array.from({length:32},(_,i)=>color('#116568','#a4ffe3',i/38));
  function draw(){
    ctx=baseCtx;
    const gpu=grassGPU?.ready;
    if(frontCanvas)frontCanvas.style.visibility=gpu?'visible':'hidden';
    const a=Math.floor(phase),b=Math.min(2,a+1),p=phase-a;
    if(!scenePalette || scenePalette.phase!==phase){
      const colors=palettes[a].map((v,i)=>color(v,palettes[b][i],p));
      scenePalette={phase,colors,grassColors:Array.from({length:32},(_,i)=>color(colors[5],phase>1.5?'#385c4c':'#91ac59',i/36))};
    }
    const {colors,grassColors}=scenePalette;
    const night=Math.max(0,phase-1);
    // The sky drifts slowly; keep its previous pixels between updates while
    // grass, touch feedback and music notes follow the display's animation frames.
    if(!gpu || backdropStamp<0 || backdropGPU!==!!gpu || time-backdropStamp>=1/30 || Math.abs(phase-backdropPhase)>.035){
    backdropStamp=time;backdropPhase=phase;backdropGPU=!!gpu;
    const sky=ctx.createLinearGradient(0,0,0,height*.75);sky.addColorStop(0,colors[0]);sky.addColorStop(.75,colors[1]);sky.addColorStop(1,colors[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    if(night){
    ctx.save();ctx.globalAlpha=night;
    for(let i=0;i<145;i++){
      const x=((i*131.7)%997)/997*width,y=((i*47.9)%311)/650*height;
      const shine=.35+.65*Math.pow(.5+.5*Math.sin(time*(.7+i%5*.13)+i*1.9),2);
      ctx.globalAlpha=night*shine;const radius=.45+(i%4)*.28;
      ellipse(x,y,radius,radius,'#e7f5ff');
      if(i%17===0){ctx.strokeStyle='#bceaff';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x-3*shine,y);ctx.lineTo(x+3*shine,y);ctx.moveTo(x,y-3*shine);ctx.lineTo(x,y+3*shine);ctx.stroke();}
    }
    ctx.globalAlpha=night;
    for(const meteor of meteors){
      const x=meteor.x+meteor.age*meteor.speed,y=meteor.y+meteor.age*meteor.speed*.32,tail=width*.10;
      const trail=ctx.createLinearGradient(x-tail,y-tail*.32,x,y);trail.addColorStop(0,'rgba(160,224,255,0)');trail.addColorStop(1,'rgba(218,245,255,.85)');
      ctx.save();ctx.globalAlpha=night*Math.sin(Math.PI*meteor.age/meteor.life);ctx.strokeStyle=trail;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x-tail,y-tail*.32);ctx.lineTo(x,y);ctx.stroke();ellipse(x,y,1.4,1.4,'#effaff');ctx.restore();
    }
    // Layered translucent curtains drift across the sky rather than a flat ribbon.
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let band=0;night>0 && band<3;band++){
      for(let x=0;x<width;x+=6){
        const wave=Math.sin(x/width*5+time*.12+band)*height*.055+Math.sin(x/width*11-time*.08)*height*.025;
        const top=height*(.08+band*.035)+wave,bottom=top+height*(.19+Math.sin(x/width*7+time*.16+band)*.045);
        const intensity=(.06+.13*Math.pow(.5+.5*Math.sin(x*.011+time*.22+band),2))*night;
        if(!auroraTexture){
          auroraTexture=document.createElement('canvas');auroraTexture.width=1;auroraTexture.height=256;
          const paint=auroraTexture.getContext('2d'),curtain=paint.createLinearGradient(0,0,0,256);
          curtain.addColorStop(0,'rgba(42,226,198,0)');curtain.addColorStop(.3,'rgba(40,233,179,1)');curtain.addColorStop(.7,'rgba(56,135,239,.7)');curtain.addColorStop(1,'rgba(107,64,211,0)');
          paint.fillStyle=curtain;paint.fillRect(0,0,1,256);
        }
        ctx.globalAlpha=night*intensity;ctx.drawImage(auroraTexture,x,top,6,bottom-top);
      }
    }ctx.restore();
    const moonX=width*.67,moonY=height*.40;
    const glow=ctx.createRadialGradient(moonX,moonY,2,moonX,moonY,65);glow.addColorStop(0,'#e7f5ff55');glow.addColorStop(1,'#e7f5ff00');ctx.fillStyle=glow;ctx.fillRect(moonX-65,moonY-65,130,130);ellipse(moonX,moonY,12,12,'#f1f5df');ctx.restore();
    }
    ctx.save();ctx.globalAlpha=1-night;const sunX=width*.18,sunY=height*(.34+phase*.19);const sun=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,110);sun.addColorStop(0,'#fff6cbbc');sun.addColorStop(1,'#fff6cb00');ctx.fillStyle=sun;ctx.fillRect(sunX-110,sunY-110,220,220);ctx.restore();
    for(let i=0;i<9;i++){
      const cw=width*(.14+(i%3)*.05),ch=cw*(.28+(i%2)*.07);
      const x=((i*width*.19+time*(2+i*.25))%(width+cw))-cw,y=height*(.09+(i%4)*.10);
      ctx.save();ctx.globalAlpha=(.6+(i%3)*.12)*(1-night*.82);
      if(cloudTexture)ctx.drawImage(cloudTexture[i%cloudTexture.length],x,y,cw,ch);ctx.restore();
    }
    drawBirds();
    ctx.fillStyle=colors[3];ctx.beginPath();ctx.moveTo(0,height*.65);ctx.bezierCurveTo(width*.22,height*.52,width*.57,height*.6,width,height*.61);ctx.lineTo(width,height);ctx.lineTo(0,height);ctx.fill();
    const earth=ctx.createLinearGradient(0,height*.6,0,height);earth.addColorStop(0,colors[4]);earth.addColorStop(1,colors[5]);ctx.fillStyle=earth;ctx.beginPath();ctx.moveTo(0,hill(0));for(let x=0;x<=width+10;x+=10)ctx.lineTo(x,hill(x));ctx.lineTo(width,height);ctx.lineTo(0,height);ctx.fill();
    if(terrainTexture){ctx.save();ctx.clip();ctx.globalAlpha=1-night*.6;ctx.drawImage(terrainTexture,0,height*.48,width,height*.52);ctx.restore();}
    const tx=width*.52,ty=hill(tx)+9,scale=Math.min(width/1250,height/650)*.92;
    ctx.save();ctx.filter='blur(5px)';ellipse(tx+21*scale,ty+3,64*scale,10*scale,'#15291675');ctx.restore();
    // The texture's trunk ends at pixel 209; sink it below the hill so grass overlaps its roots.
    if(trees.length){ctx.drawImage(trees[a],tx-95*scale,ty-123.5*scale,190*scale,130*scale);if(p){ctx.save();ctx.globalAlpha=p;ctx.drawImage(trees[b],tx-95*scale,ty-123.5*scale,190*scale,130*scale);ctx.restore();}}
    

    }
    const lightField=night>0 && touchLights.length ? makeTrailField() : null;
    if(gpu){
      grassGPU.draw(colors[5],night,lightField);
      ctx=frontCtx;ctx.clearRect(0,0,width,height);
      for(const blade of blades)if(blade.flower){
        const wind=Math.sin(time*1.1+blade.x*.008+blade.y*.012)*.10+Math.sin(time*.42+blade.x*.003)*.09;
        const angle=Math.max(-1.18,Math.min(1.18,wind+blade.bend*.14+blade.offset/blade.len));
        ellipse(blade.x+Math.sin(angle)*blade.len,blade.y-Math.cos(angle*.65)*blade.len,1.5+blade.depth,1.3+blade.depth,night>.5?'#9cbcb0':['#ece8a9','#eab0bb','#b2b0dd'][Math.floor(blade.tint*3)]);
      }
    }
    else if(typeof Path2D==='function')drawGrassBatched(grassColors,night,lightField);
    else {
    for(const blade of blades){
      const {x,y,depth,len}=blade;
      const wind=Math.sin(time*1.1+x*.008+y*.012)*.10+Math.sin(time*.42+x*.003)*.09;
      const angle=Math.max(-1.18,Math.min(1.18,wind+blade.bend*.14+blade.offset/len));
      const bend=Math.sin(angle)*len,lift=Math.cos(angle*.65)*len;
      let illumination=0;
      if(lightField)illumination=sampleTrailField(lightField,x,y-len*.4);
      ctx.fillStyle=grassColors[Math.floor(blade.tint*31)];
      const breadth=.12+depth*(.55+blade.stiffness*.45);
      ctx.beginPath();ctx.moveTo(x-breadth,y);ctx.quadraticCurveTo(x+bend*.15-breadth,y-lift*.60,x+bend,y-lift);ctx.quadraticCurveTo(x+bend*.42+breadth,y-lift*.39,x+breadth,y);ctx.fill();
      if(depth>.55 && blade.tint>.5){
        ctx.strokeStyle=grassColors[Math.min(31,Math.floor(blade.tint*31)+3)];ctx.lineWidth=.25+depth*.2;
        ctx.beginPath();ctx.moveTo(x,y-1);ctx.quadraticCurveTo(x+bend*.23,y-lift*.6,x+bend,y-lift);ctx.stroke();
      }
      if(illumination>0 && night){ctx.save();ctx.globalAlpha=Math.min(1,illumination*night*1.5);ctx.fillStyle=litColors[Math.floor(blade.tint*31)];ctx.fill();ctx.restore();}
      if(blade.flower){ellipse(x+bend,y-lift,1.5+depth,1.3+depth,night>.5?'#9cbcb0':['#ece8a9','#eab0bb','#b2b0dd'][Math.floor(blade.tint*3)]);}
    }
    }
    wildlife?.draw(ctx,width,height,hill,phase);
    // Soft light across the horizon ties the grass, sky and distant tree together.
    const haze=ctx.createLinearGradient(0,height*.42,0,height*.73);haze.addColorStop(0,'rgba(255,240,175,0)');haze.addColorStop(.45,night>.5?'rgba(137,171,211,.08)':'rgba(255,244,167,.19)');haze.addColorStop(1,'rgba(255,240,175,0)');ctx.fillStyle=haze;ctx.fillRect(0,height*.42,width,height*.31);
    ctx.save();ctx.globalCompositeOperation='screen';
    if(night)drawGrassTrails(night);
    ctx.restore();
    if(night){
    ctx.save();ctx.globalAlpha=night;
    for(let i=0;i<35;i++){
      const x=((i*197.3)%997)/997*width+Math.sin(time*.7+i)*14,y=height*(.67+((i*31)%89)/300)+Math.sin(time+i)*9;
      if(!fireflyTexture){fireflyTexture=document.createElement('canvas');fireflyTexture.width=20;fireflyTexture.height=20;
        const paint=fireflyTexture.getContext('2d'),glow=paint.createRadialGradient(10,10,0,10,10,10);
        glow.addColorStop(0,'rgba(218,255,145,1)');glow.addColorStop(.2,'rgba(190,245,113,.5)');glow.addColorStop(1,'rgba(190,245,113,0)');paint.fillStyle=glow;paint.fillRect(0,0,20,20);}
      ctx.globalAlpha=night*(.35+.65*(.5+.5*Math.sin(time*2+i)));ctx.drawImage(fireflyTexture,x-10,y-10);
    }ctx.restore();
    }
    ctx.save();
    for(const note of notes){
      ctx.save();ctx.globalAlpha=Math.sin(Math.PI*Math.min(1,note.age/note.life))*(.65+.2*Math.sin(note.age*3+note.seed));
      ctx.translate(note.x+Math.sin(note.age*1.5+note.seed)*note.drift,note.y-note.age*note.speed);ctx.rotate(Math.sin(note.age+note.seed)*.16);
      const mode=night>.5?1:0;
      if(!note.texture || note.textureMode!==mode){
        const blur=note.glow*(mode?1.2:.8),pad=Math.ceil(blur*2),texture=document.createElement('canvas');
        texture.width=texture.height=Math.ceil(note.size*2+pad*2);const paint=texture.getContext('2d');
        note.textureX=pad+note.size*.5;note.textureY=pad+note.size*1.3;
        paint.font=`${note.size}px Georgia,serif`;paint.fillStyle=note.colour;paint.shadowColor=note.colour;paint.shadowBlur=blur;paint.fillText(note.symbol,note.textureX,note.textureY);
        note.texture=texture;note.textureMode=mode;
      }
      ctx.drawImage(note.texture,-note.textureX,-note.textureY);ctx.restore();
    }ctx.restore();
  }

  function createGrassGPU(){
    // Instanced quadratic ribbons: one shared mesh, one draw call for the meadow.
    // All state belongs to Calm; the player's analyser, audio and lyrics remain untouched.
    const surface=document.createElement('canvas');
    const gl=surface.getContext('webgl',{alpha:true,antialias:true,depth:false,stencil:false,premultipliedAlpha:true,failIfMajorPerformanceCaveat:true});
    if(!gl)return null;
    let instanced=gl.getExtension('ANGLE_instanced_arrays');
    if(!instanced){gl.getExtension('WEBGL_lose_context')?.loseContext();return null;}
    const foreground=document.createElement('canvas'),paint=foreground.getContext('2d');
    if(!paint)return null;
    let program,mesh,staticBuffer,dynamicBuffer,locations,dynamicData;
    const vertex=`
      precision highp float;
      attribute vec2 ribbon;
      attribute vec4 root;
      attribute vec3 trait;
      attribute vec2 motion;
      uniform vec2 size;
      uniform float clock;
      uniform vec3 darkColour;
      uniform vec3 tipColour;
      uniform float night;
      varying vec3 colour;
      varying float across;
      varying vec3 highlight;
      varying float veinStrength;
      void main(){
        float wind=sin(clock*1.1+root.x*.008+root.y*.012)*.10+sin(clock*.42+root.x*.003)*.09;
        float angle=clamp(wind+trait.x*.14+motion.x/root.z,-1.18,1.18);
        float bend=sin(angle)*root.z,lift=cos(angle*.65)*root.z;
        float breadth=.12+root.w*(.55+trait.y*.45);
        float t=ribbon.y,u=1.0-t;
        vec2 left=vec2(-breadth*u*u+2.0*u*t*(bend*.15-breadth)+t*t*bend,-2.0*u*t*lift*.60-t*t*lift);
        vec2 right=vec2(breadth*u*u+2.0*u*t*(bend*.42+breadth)+t*t*bend,-2.0*u*t*lift*.39-t*t*lift);
        vec2 position=root.xy+mix(left,right,ribbon.x);
        gl_Position=vec4(position/size*vec2(2.0,-2.0)+vec2(-1.0,1.0),0.0,1.0);
        float tint=floor(trait.z*31.0);
        colour=mix(darkColour,tipColour,tint/36.0);
        // Retain the fine bright vein on foreground blades.
        veinStrength=step(.55,root.w)*step(.5,trait.z);
        highlight=mix(darkColour,tipColour,min(31.0,tint+3.0)/36.0);
        vec3 lit=mix(vec3(17.0,101.0,104.0)/255.0,vec3(164.0,255.0,227.0)/255.0,tint/38.0);
        colour=mix(colour,lit,min(1.0,motion.y*night*1.5));highlight=mix(highlight,lit,min(1.0,motion.y*night*1.5));across=ribbon.x;
      }`;
    const fragment=`
      precision mediump float;
      varying vec3 colour;
      varying float across;
      varying vec3 highlight;
      varying float veinStrength;
      void main(){
        float alpha=smoothstep(0.0,.07,across)*smoothstep(0.0,.07,1.0-across);
        float vein=(1.0-smoothstep(.08,.22,abs(across-.42)))*veinStrength;
        gl_FragColor=vec4(mix(colour,highlight,vein*.65)*alpha,alpha);
      }`;
    function initialise(){
      instanced=gl.getExtension('ANGLE_instanced_arrays');if(!instanced)throw new Error('Instancing unavailable');
      const shaders=[];
      try{
        for(const [kind,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
          const shader=gl.createShader(kind);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
          if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
        }
        program=gl.createProgram();for(const shader of shaders)gl.attachShader(program,shader);gl.linkProgram(program);
        if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      }finally{for(const shader of shaders)gl.deleteShader(shader);}
      locations={};for(const key of ['ribbon','root','trait','motion'])locations[key]=gl.getAttribLocation(program,key);
      for(const key of ['size','clock','darkColour','tipColour','night'])locations[key]=gl.getUniformLocation(program,key);
      const vertices=[];for(let i=0;i<=8;i++)vertices.push(0,i/8,1,i/8);
      mesh=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,mesh);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
      staticBuffer=gl.createBuffer();dynamicBuffer=gl.createBuffer();
      gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
    }
    try{initialise();}catch(error){gl.getExtension('WEBGL_lose_context')?.loseContext();return null;}
    surface.id='calmGrassGPU';foreground.id='calmForeground';
    for(const layer of [surface,foreground]){layer.setAttribute('aria-hidden','true');Object.assign(layer.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',pointerEvents:'none'});}
    canvas.after(surface,foreground);frontCanvas=foreground;frontCtx=paint;
    const renderer={ready:true,resize(ratio){
      surface.width=foreground.width=Math.round(width*ratio);surface.height=foreground.height=Math.round(height*ratio);paint.setTransform(ratio,0,0,ratio,0,0);
      if(!renderer.ready)return;
      gl.viewport(0,0,surface.width,surface.height);
      const data=new Float32Array(blades.length*7);
      blades.forEach((blade,i)=>data.set([blade.x,blade.y,blade.len,blade.depth,blade.bend,blade.stiffness,blade.tint],i*7));
      gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      dynamicData=new Float32Array(blades.length*2);gl.bindBuffer(gl.ARRAY_BUFFER,dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,dynamicData.byteLength,gl.DYNAMIC_DRAW);
      function attribute(key,buffer,size,stride,offset,divisor){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(locations[key]);gl.vertexAttribPointer(locations[key],size,gl.FLOAT,false,stride,offset);instanced.vertexAttribDivisorANGLE(locations[key],divisor);}
      attribute('ribbon',mesh,2,8,0,0);attribute('root',staticBuffer,4,28,0,1);attribute('trait',staticBuffer,3,28,16,1);attribute('motion',dynamicBuffer,2,8,0,1);
      gl.useProgram(program);gl.uniform2f(locations.size,width,height);
    },draw(dark,night,lightField){
      gl.clear(gl.COLOR_BUFFER_BIT);
      for(let i=0;i<blades.length;i++){const blade=blades[i];dynamicData[i*2]=blade.offset;dynamicData[i*2+1]=lightField?sampleTrailField(lightField,blade.x,blade.y-blade.len*.4):0;}
      gl.bufferSubData(gl.ARRAY_BUFFER,0,dynamicData);
      gl.uniform1f(locations.clock,time);gl.uniform1f(locations.night,night);
      const rgb=dark.match(/[\d.]+/g).map(Number);gl.uniform3f(locations.darkColour,rgb[0]/255,rgb[1]/255,rgb[2]/255);
      gl.uniform3f(locations.tipColour,...(night>.5?[56/255,92/255,76/255]:[145/255,172/255,89/255]));
      instanced.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP,0,18,blades.length);
    }};
    surface.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.ready=false;surface.style.visibility='hidden';foreground.style.visibility='hidden';if(active())draw();});
    surface.addEventListener('webglcontextrestored',()=>{try{initialise();renderer.ready=true;surface.style.visibility='visible';renderer.resize(renderRatio());if(active())draw();}catch(error){renderer.ready=false;}});
    return renderer;
  }
  function drawGrassBatched(grassColors,night,lightField){
    // Preserve back-to-front depth layers, sharing fill/stroke submissions by colour.
    const groupSize=256;
    for(let start=0;start<blades.length;start+=groupSize){
      const end=Math.min(blades.length,start+groupSize),fills=[],strokes=[],lit=[],flowers=[];
      let strokeWidth=0,strokeCount=0;
      for(let i=start;i<end;i++){
        const blade=blades[i],{x,y,depth,len}=blade;
        const wind=Math.sin(time*1.1+x*.008+y*.012)*.10+Math.sin(time*.42+x*.003)*.09;
        const angle=Math.max(-1.18,Math.min(1.18,wind+blade.bend*.14+blade.offset/len));
        const bend=Math.sin(angle)*len,lift=Math.cos(angle*.65)*len,breadth=.12+depth*(.55+blade.stiffness*.45),index=Math.floor(blade.tint*31);
        blade.paintBend=bend;blade.paintLift=lift;blade.paintBreadth=breadth;
        const path=fills[index]||(fills[index]=new Path2D());
        path.moveTo(x-breadth,y);path.quadraticCurveTo(x+bend*.15-breadth,y-lift*.60,x+bend,y-lift);path.quadraticCurveTo(x+bend*.42+breadth,y-lift*.39,x+breadth,y);
        if(depth>.55 && blade.tint>.5){
          const shade=Math.min(31,index+3),highlight=strokes[shade]||(strokes[shade]=new Path2D());
          highlight.moveTo(x,y-1);highlight.quadraticCurveTo(x+bend*.23,y-lift*.6,x+bend,y-lift);
          strokeWidth+=.25+depth*.2;strokeCount++;
        }
        if(lightField){blade.paintLight=sampleTrailField(lightField,x,y-len*.4);if(blade.paintLight>0)lit.push(blade);}
        if(blade.flower)flowers.push(blade);
      }
      for(let i=0;i<fills.length;i++)if(fills[i]){ctx.fillStyle=grassColors[i];ctx.fill(fills[i]);}
      if(strokeCount){ctx.lineWidth=strokeWidth/strokeCount;for(let i=0;i<strokes.length;i++)if(strokes[i]){ctx.strokeStyle=grassColors[i];ctx.stroke(strokes[i]);}}
      for(const blade of lit){
        const {x,y,len,depth,paintBend:bend,paintLift:lift,paintBreadth:breadth}=blade;
        ctx.save();ctx.globalAlpha=Math.min(1,blade.paintLight*night*1.5);ctx.fillStyle=litColors[Math.floor(blade.tint*31)];ctx.beginPath();
        if(depth>.55 && blade.tint>.5){ctx.moveTo(x,y-1);ctx.quadraticCurveTo(x+bend*.23,y-lift*.6,x+bend,y-lift);}
        else {ctx.moveTo(x-breadth,y);ctx.quadraticCurveTo(x+bend*.15-breadth,y-lift*.60,x+bend,y-lift);ctx.quadraticCurveTo(x+bend*.42+breadth,y-lift*.39,x+breadth,y);}
        ctx.fill();ctx.restore();
      }
      for(const blade of flowers)ellipse(blade.x+blade.paintBend,blade.y-blade.paintLift,1.5+blade.depth,1.3+blade.depth,night>.5?'#9cbcb0':['#ece8a9','#eab0bb','#b2b0dd'][Math.floor(blade.tint*3)]);
    }
  }
  function drawBirds(){
    const daylight=Math.max(0,1-Math.max(0,phase-1));if(!daylight)return;
    ctx.save();ctx.globalAlpha=daylight*.65;ctx.strokeStyle='#34475a';ctx.lineCap='round';
    for(let i=0;i<15;i++){
      const flock=Math.floor(i/5),type=i%5,size=2+type*.65;
      const x=((width*.15+flock*width*.32+time*(14+flock*5)+(i%5)*25)%(width+100))-50;
      const y=height*(.11+flock*.07)+Math.abs(i%5-2)*10+Math.sin(time*.6+i)*4;
      const wing=Math.sin(time*([7,4,5,3,8][type])+i*.7)*size*([1.2,.65,.9,.4,1.1][type]);
      ellipse(x,y,size*.48,size*.18,['#293b48','#dee1df','#5b4436','#202b35','#596868'][type]);
      ctx.beginPath();ctx.moveTo(x-size*.8,y+size*.15);ctx.lineTo(x-size*1.5,y+size*([.7,.2,.4,.15,.8][type]));ctx.stroke();
      ctx.lineWidth=.6+size*.15;ctx.beginPath();ctx.moveTo(x-size*([1.6,2.2,1.4,2.6,1.8][type]),y-wing);ctx.quadraticCurveTo(x-size*.5,y-size*.4,x,y);ctx.quadraticCurveTo(x+size*.5,y-size*.4,x+size*([1.6,2.2,1.4,2.6,1.8][type]),y-wing);ctx.stroke();
    }ctx.restore();
  }
  function trailDistance(light,x,y){
    const dx=light.x-light.fromX,dy=(light.y-light.fromY)*2.5;
    const px=x-light.fromX,py=(y-light.fromY)*2.5;
    const projection=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(px-dx*projection,py-dy*projection);
  }
  // Bake the trail's illumination once per frame rather than checking every segment for every blade.
  function makeTrailField(){
    const cols=48,rows=36;
    if(!trailField)trailField={cols,rows,data:new Float32Array((cols+1)*(rows+1))};
    const {data}=trailField;data.fill(0);
    // A trail affects only its local ellipse: preserve the same grid/max blend,
    // without checking all 32 segments at every grid point.
    for(const light of touchLights){
      const left=Math.max(0,Math.floor((Math.min(light.x,light.fromX)-65)/width*cols));
      const right=Math.min(cols,Math.ceil((Math.max(light.x,light.fromX)+65)/width*cols));
      const top=Math.max(0,Math.floor((Math.min(light.y,light.fromY)-26)/height*rows));
      const bottom=Math.min(rows,Math.ceil((Math.max(light.y,light.fromY)+26)/height*rows));
      for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++){
        const value=Math.pow(Math.max(0,1-trailDistance(light,col/cols*width,row/rows*height)/65),1.3)*light.life;
        const index=row*(cols+1)+col;if(value>data[index])data[index]=value;
      }
    }
    return trailField;
  }

  function sampleTrailField(field,x,y){
    const gx=Math.max(0,Math.min(field.cols-.001,x/width*field.cols)),gy=Math.max(0,Math.min(field.rows-.001,y/height*field.rows));
    const col=Math.floor(gx),row=Math.floor(gy),fx=gx-col,fy=gy-row,index=row*(field.cols+1)+col,d=field.data;
    return (d[index]*(1-fx)+d[index+1]*fx)*(1-fy)+(d[index+field.cols+1]*(1-fx)+d[index+field.cols+2]*fx)*fy;
  }
  function drawGrassTrails(night){
    for(const light of touchLights){
      // A segment's shape stays fixed as it fades. Bake its blur once, not every frame.
      if(!light.texture){
        const pad=44,left=Math.min(light.fromX,light.x)-pad,top=Math.min(light.fromY,light.y)-pad;
        const texture=document.createElement('canvas');texture.width=Math.ceil(Math.abs(light.x-light.fromX)+pad*2);texture.height=Math.ceil(Math.abs(light.y-light.fromY)+pad*2);
        const paint=texture.getContext('2d');paint.strokeStyle='#32cdbd';paint.shadowColor='#24bfc8';paint.shadowBlur=22;paint.lineCap='round';paint.lineWidth=2;
        paint.globalAlpha=.06;paint.beginPath();paint.moveTo(light.fromX-left,light.fromY-top);paint.lineTo(light.x-left,light.y-top);paint.stroke();
        paint.shadowBlur=0;paint.globalAlpha=.5;paint.fillStyle='#9cffe1';paint.beginPath();
        for(let i=0;i<5;i++){const fraction=(i+.5)/5,x=light.fromX+(light.x-light.fromX)*fraction-left+Math.sin(i*17)*8,y=light.fromY+(light.y-light.fromY)*fraction-top+Math.cos(i*9)*5;
          paint.moveTo(x+.7,y);paint.ellipse(x,y,.7,.7,0,0,Math.PI*2);}
        paint.fill();light.texture=texture;light.textureX=left;light.textureY=top;
      }
      ctx.save();ctx.globalAlpha=light.life*night;ctx.drawImage(light.texture,light.textureX,light.textureY);ctx.restore();
    }
  }
  function tick(stamp){
    frame=0;if(!active()||paused)return;
    const due=stamp+.5>=nextFrame;observeFrameBudget(stamp,due);
    if(due){const dt=Math.max(0,Math.min((stamp-last)/1000,.06));last=stamp;time+=dt;
      const interval=1000/90;nextFrame=stamp+interval-((Math.max(0,stamp-nextFrame))%interval);
      if(auto){const cycle=time%60;const next=cycle<20?0:cycle<40?1:2;if(next!==target)select(next);}
      phase+=(target-phase)*Math.min(1,dt*1.2);if(Math.abs(phase-target)<.002)phase=target;
      if(phase>1.5 && !reduced.matches){meteorClock-=dt;if(meteorClock<=0){meteorClock=8+random()*18;meteors.push({x:width*(.1+random()*.55),y:height*(.04+random()*.18),age:0,life:.8+random()*.4,speed:width*(.24+random()*.15)});}}
      meteors.forEach(meteor=>meteor.age+=dt);meteors=meteors.filter(meteor=>meteor.age<meteor.life && phase>1.5);
      ripples.forEach(r=>r.age+=dt);ripples=ripples.filter(r=>r.age<2);
      touchLights.forEach(light=>{light.life-=dt*.34;});touchLights=touchLights.filter(light=>light.life>0);
      physics(dt);
      wildlife?.update(dt,width,height,hill,phase,reduced.matches);
      const intensity=readMusicIntensity(dt);
      if(musicPlaying() && !audio.muted && !reduced.matches){noteClock+=dt*(1.4+intensity*11);if(noteClock>=1){noteClock-=1;
        const sector=noteSector++%15,x=width*((sector%5+random())/5),depth=(Math.floor(sector/5)+random())/3;
        notes.push({x,y:hill(x)+depth*(height-hill(x)),age:0,life:4+random()*3,speed:height*(.035+random()*.055+intensity*.015),size:11+random()*30+intensity*5,symbol:random()>.5?'♪':'♫',seed:random()*6,colour:noteColours[Math.floor(random()*noteColours.length)],glow:5+random()*22+intensity*9,drift:9+random()*24});}}
      else noteClock=0;
      notes.forEach(note=>note.age+=dt);notes=notes.filter(note=>note.age<note.life).slice(-48);
      draw();
    }frame=requestAnimationFrame(tick);
  }
  // Damped springs retain momentum when the pointer leaves, then settle naturally.
  function physics(dt){
    const radius=Math.min(150,Math.max(80,width*.1)),step=dt/2;
    brushAge+=dt;
    const swept=brushFrom && brushAge<.12;
    const left=(swept?Math.min(pointer.x,brushFrom.x):pointer.x)-radius;
    const right=(swept?Math.max(pointer.x,brushFrom.x):pointer.x)+radius;
    const top=(swept?Math.min(pointer.y,brushFrom.y):pointer.y)-radius;
    const bottom=(swept?Math.max(pointer.y,brushFrom.y):pointer.y)+radius;
    for(const blade of blades){
      const tipY=blade.y-blade.len*.5;let desired=0;
      if(blade.x>=left && blade.x<=right && tipY>=top && tipY<=bottom){
        let cx=pointer.x,cy=pointer.y;
        if(swept){
          const sx=pointer.x-brushFrom.x,sy=pointer.y-brushFrom.y;
          const along=Math.max(0,Math.min(1,((blade.x-brushFrom.x)*sx+(tipY-brushFrom.y)*sy)/(sx*sx+sy*sy||1)));
          cx=brushFrom.x+sx*along;cy=brushFrom.y+sy*along;
        }
        const dx=blade.x-cx,dy=tipY-cy,distance=Math.hypot(dx,dy);
        if(distance<radius){const pressure=Math.pow(1-distance/radius,2);const direction=(dx>=0?1:-1)*.65+Math.tanh(pointerVX/650)*.35;desired=direction*pressure*blade.len*(1.05+Math.min(pointerSpeed/900,.65));}
      }
      for(const r of ripples){const dx=blade.x-r.x,dy=blade.y-r.y,reach=r.age*180+60;if(Math.abs(dx)>reach||Math.abs(dy)>reach)continue;const dist=Math.hypot(dx,dy),wave=dist-r.age*180;if(Math.abs(wave)<60)desired+=Math.sin(wave/20)*blade.len*.6*(1-r.age/2);}
      if(desired===0 && Math.abs(blade.velocity)<.02 && Math.abs(blade.offset)<.02){blade.velocity=blade.offset=0;continue;}
      const damping=Math.exp(-(6+blade.stiffness*3)*step),spring=(48+blade.stiffness*36)*step;
      for(let part=0;part<2;part++){blade.velocity+=(desired-blade.offset)*spring;blade.velocity*=damping;blade.offset+=blade.velocity*step;}
      const limit=blade.len*1.18;
      if(Math.abs(blade.offset)>limit){blade.offset=Math.sign(blade.offset)*limit;blade.velocity*=.35;}
    }
    brushPending=false;
    pointerSpeed*=Math.exp(-6*dt);
    pointerVX*=Math.exp(-6*dt);
  }
  function sync(){
    if(frame){cancelAnimationFrame(frame);frame=0;}
    if(lyricsTimer){clearInterval(lyricsTimer);lyricsTimer=0;}
    previewLast=0;budgetStart=budgetFrames=cadenceLast=0;cadenceFastest=Infinity;
    if(active()){if(!resize())draw();updateSkyLyrics();updateTransport();lyricsTimer=setInterval(()=>{updateSkyLyrics();updateTransport();},120);last=performance.now();nextFrame=last;if(!paused)frame=requestAnimationFrame(tick);}
    else {wildlife?.reset();notes=[];touchLights=[];meteors=[];lastTrail=null;noteClock=0;}
  }
  function select(value){target=value;scene.dataset.time=['day','sunset','night'][value];scene.querySelectorAll('[data-happy-time]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.happyTime===scene.dataset.time)));if(paused){phase=target;draw();}}
  scene.querySelectorAll('[data-happy-time]').forEach(btn=>btn.addEventListener('click',()=>{auto=false;document.getElementById('happyCycle').setAttribute('aria-pressed','false');select(['day','sunset','night'].indexOf(btn.dataset.happyTime));}));
  document.getElementById('happyCycle').addEventListener('click',()=>{auto=!auto;document.getElementById('happyCycle').setAttribute('aria-pressed',String(auto));});
  const pause=document.getElementById('happyPause');
  function pauseLabel(){pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(paused));}
  pause.addEventListener('click',()=>{paused=!paused;pauseLabel();sync();});pauseLabel();
  function queuePausedDraw(){
    if(frame || !active() || !paused)return;
    frame=requestAnimationFrame(stamp=>{frame=0;if(!active()||!paused)return;const dt=previewLast?Math.min(.04,Math.max(0,(stamp-previewLast)/1000)):1/60;previewLast=stamp;physics(dt);draw();});
  }
  function lightTrail(x,y){
    if(y<hill(x)-20){lastTrail=null;return;}
    if(lastTrail && Math.hypot(x-lastTrail.x,y-lastTrail.y)<8)return;
    const from=lastTrail && Math.hypot(x-lastTrail.x,y-lastTrail.y)<width*.25 ? lastTrail : {x:x-3,y};
    touchLights.push({fromX:from.x,fromY:from.y,x,y,life:1});touchLights=touchLights.slice(-32);lastTrail={x,y};
  }
  function touch(x,y){wildlife?.touch(x,y,width,height,hill);ripples.push({x,y,age:0});ripples=ripples.slice(-6);lightTrail(x,y);if(paused)queuePausedDraw();}
  scene.addEventListener('pointermove',e=>{const rect=sceneBox||scene.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,now=performance.now();if(lastPointer && pointer.x>=0){const elapsed=Math.max(.008,(now-lastPointer)/1000);pointerSpeed=Math.min(1800,Math.hypot(x-pointer.x,y-pointer.y)/elapsed);pointerVX=Math.max(-1800,Math.min(1800,(x-pointer.x)/elapsed));if(!brushPending){brushFrom=pointer;brushPending=true;}brushAge=0;}lastPointer=now;pointer={x,y};lightTrail(x,y);if(paused)queuePausedDraw();});
  scene.addEventListener('pointerleave',()=>{pointer={x:-1000,y:-1000};brushFrom=null;brushPending=false;lastTrail=null;if(paused)queuePausedDraw();});
  canvas.addEventListener('pointerdown',e=>{const rect=sceneBox||scene.getBoundingClientRect();touch(e.clientX-rect.left,e.clientY-rect.top);});
  new MutationObserver(sync).observe(view,{attributes:true,attributeFilter:['class']});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(active())resize();}).observe(scene);
  window.addEventListener('resize',()=>{if(active())resize();});document.addEventListener('visibilitychange',sync);
  reduced.addEventListener?.('change',e=>{paused=e.matches;pauseLabel();sync();});
  if(audio)['timeupdate','seeked','play','pause','ended','loadedmetadata','durationchange','emptied'].forEach(event=>audio.addEventListener(event,()=>{updateSkyLyrics();updateTransport();}));
  // Run cold texture generation during the seven-second intro, in idle time.
  // Once generated, the same assets are reused on the first Calm visit.
  setTimeout(()=>{
    const work=buildTextures();
    const warm=()=>{
      if(cloudTexture || active())return;
      const next=work.next();
      if(next.done){commitTextures(next.value);return;}
      // At most one small texture chunk per callback, so the intro/cursor can paint.
      if(typeof requestIdleCallback==='function')requestIdleCallback(warm,{timeout:2200});
      else setTimeout(warm,16);
    };
    if(typeof requestIdleCallback==='function')requestIdleCallback(warm,{timeout:2200});
    else setTimeout(warm,16);
  },1300);
  sync();
})();
