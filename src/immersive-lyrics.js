const root=document.getElementById('immersiveLyricsRoot');
const linesEl=document.getElementById('immersiveLyricsLines');
const scroller=document.getElementById('immersiveLyricsScroller');
const songEl=document.getElementById('immersiveLyricsSong');
const artistEl=document.getElementById('immersiveLyricsArtist');
const visualizer=document.getElementById('immersiveLyricsVisualizer');
const visualizerBtn=document.getElementById('immersiveLyricsVisualizerBtn');
const settingsVisualizer=document.getElementById('immersiveSettingsVisualizer');
const onlyBtn=document.getElementById('immersiveLyricsOnlyBtn');
const settingsOnly=document.getElementById('immersiveSettingsOnly');
const onlyExit=document.getElementById('immersiveOnlyExit');
const settingsBtn=document.getElementById('immersiveLyricsSettingsBtn');
const settingsPanel=document.getElementById('immersiveLyricsSettings');
const clickThroughBtn=document.getElementById('immersiveLyricsClickThroughBtn');
const seek=document.getElementById('immersiveLyricsSeek');
const progressFill=document.getElementById('immersiveProgressFill');
const progressCurrent=document.getElementById('immersiveProgressCurrent');
const progressDuration=document.getElementById('immersiveProgressDuration');
const panelOpacity=document.getElementById('immersivePanelOpacity');
const lyricsOpacity=document.getElementById('immersiveLyricsOpacity');
const lyricsSize=document.getElementById('immersiveLyricsSize');
const panelOpacityValue=document.getElementById('immersivePanelOpacityValue');
const lyricsOpacityValue=document.getElementById('immersiveLyricsOpacityValue');
const lyricsSizeValue=document.getElementById('immersiveLyricsSizeValue');
const playBtn=document.getElementById('immersivePlayBtn');

const PREF_KEY='deepeccho-immersive-lyrics-v1';
let timeline=[];
let plainLines=[];
let activeIndex=-2;
let clock={baseTime:0,basePerf:performance.now(),playing:false,rate:1};
let duration=0;
let spectrum=[];
let waveform=[];
let audioGraph={energy:0,vocal:0,vocalTransient:0,transient:0,beatPulse:0,beatId:0,bass:0,treble:0,subBass:0,lowMid:0,mid:0,highMid:0,motion:0,aggression:0,centroid:0,peak:0,rms:0,playing:false,hasSignal:false};
let visualizerPhase=0;
let visualizerAngle=0;
let visualizerLastFrameAt=performance.now();
let visualizerBloodDrops=[];
let visualizerLastBloodBeatId=-1;
let visualizerBloodSpawnIndex=0;
const immersiveDragonImage=new Image();
immersiveDragonImage.src='assets/dragon-scene.png';
let visualizerEnabled=true;
let onlyLyrics=false;
let clickThrough=false;
let settingsOpen=false;
let seekPreview=false;
let seekPreviewTime=0;
let prefs={panelOpacity:72,lyricsOpacity:100,fontScale:100,visualizer:true,onlyLyrics:false};

function readPrefs(){
  try{prefs={...prefs,...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}}catch(_){}
  prefs.panelOpacity=Math.max(0,Math.min(95,Number(prefs.panelOpacity)||0));
  prefs.lyricsOpacity=Math.max(35,Math.min(100,Number(prefs.lyricsOpacity)||100));
  prefs.fontScale=Math.max(80,Math.min(150,Number(prefs.fontScale)||100));
  prefs.visualizer=prefs.visualizer!==false;
  prefs.onlyLyrics=!!prefs.onlyLyrics;
}
function savePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch(_){}}
function publishPrefs(){
  savePrefs();
  window.echoAPI?.setImmersiveLyricsPrefs?.({ panelOpacity:prefs.panelOpacity, lyricsOpacity:prefs.lyricsOpacity, fontScale:prefs.fontScale, visualizer:prefs.visualizer, onlyLyrics:prefs.onlyLyrics }).catch?.(()=>{});
}
function applyPrefs(notifyVisualizer=false){
  visualizerEnabled=prefs.visualizer!==false; onlyLyrics=!!prefs.onlyLyrics;
  root.style.setProperty('--il-panel-alpha',(prefs.panelOpacity/100).toFixed(2));
  root.style.setProperty('--il-lyrics-alpha',(prefs.lyricsOpacity/100).toFixed(2));
  root.style.setProperty('--il-font-scale',(prefs.fontScale/100).toFixed(3));
  root.classList.toggle('visualizer-off',!visualizerEnabled);
  root.classList.toggle('only-lyrics',onlyLyrics);
  visualizerBtn?.classList.toggle('active',visualizerEnabled); visualizerBtn?.setAttribute('aria-pressed',String(visualizerEnabled));
  onlyBtn?.classList.toggle('active',onlyLyrics); onlyBtn?.setAttribute('aria-pressed',String(onlyLyrics));
  settingsVisualizer?.classList.toggle('active',visualizerEnabled); settingsVisualizer?.setAttribute('aria-pressed',String(visualizerEnabled)); if(settingsVisualizer)settingsVisualizer.textContent=`Visualizer ${visualizerEnabled?'ON':'OFF'}`;
  settingsOnly?.classList.toggle('active',onlyLyrics); settingsOnly?.setAttribute('aria-pressed',String(onlyLyrics)); if(settingsOnly)settingsOnly.textContent=`Only Lyrics ${onlyLyrics?'ON':'OFF'}`;
  if(panelOpacity){panelOpacity.value=String(prefs.panelOpacity);panelOpacityValue.textContent=`${prefs.panelOpacity}%`}
  if(lyricsOpacity){lyricsOpacity.value=String(prefs.lyricsOpacity);lyricsOpacityValue.textContent=`${prefs.lyricsOpacity}%`}
  if(lyricsSize){lyricsSize.value=String(prefs.fontScale);lyricsSizeValue.textContent=`${prefs.fontScale}%`}
  savePrefs();
  if(notifyVisualizer)window.echoAPI?.immersiveLyricsAction?.(visualizerEnabled?'visualizerOn':'visualizerOff');
}
readPrefs();applyPrefs(true);

function fmt(sec){const safe=Number.isFinite(Number(sec))?Math.max(0,Number(sec)):0;return `${Math.floor(safe/60)}:${Math.floor(safe%60).toString().padStart(2,'0')}`}
function normalize(lines=[]){
  if(window.DeepecchoLyricsTimeline?.normalizeTimeline)return window.DeepecchoLyricsTimeline.normalizeTimeline(lines);
  return lines.map((x,order)=>({time:Number(x?.time),text:String(x?.text||'').trim(),order})).filter(x=>Number.isFinite(x.time)&&x.time>=0&&x.text).sort((a,b)=>(a.time-b.time)||(a.order-b.order)).map(({time,text})=>({time,text}));
}
function findActive(lines,t){
  if(window.DeepecchoLyricsTimeline?.findActiveIndex)return window.DeepecchoLyricsTimeline.findActiveIndex(lines,t);
  let lo=0,hi=lines.length-1,ans=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(lines[mid].time<=t){ans=mid;lo=mid+1}else hi=mid-1}return ans;
}
function estimatedTime(){return clock.playing?Math.max(0,clock.baseTime+((performance.now()-clock.basePerf)/1000)*clock.rate):Math.max(0,clock.baseTime)}
function buildLines(){
  activeIndex=-2;
  if(timeline.length){
    linesEl.innerHTML=timeline.map((line,i)=>`<p class="immersive-lyric-line" data-line="${i}">${escapeHtml(line.text)||'♪'}</p>`).join('');
  }else if(plainLines.length){
    linesEl.innerHTML=plainLines.map(text=>`<p class="immersive-plain-line">${escapeHtml(text)||'&nbsp;'}</p>`).join('');
  }else{
    linesEl.innerHTML='<p class="immersive-lyrics-placeholder">Play a song to see synced lyrics here.</p>';
  }
  updateLyrics(true);
}
function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
function updateLyrics(force=false){
  if(!timeline.length)return;
  const index=findActive(timeline,estimatedTime());
  if(!force&&index===activeIndex)return;
  activeIndex=index;
  const nodes=[...linesEl.querySelectorAll('.immersive-lyric-line')];
  nodes.forEach((node,i)=>{node.classList.toggle('current',i===index);node.classList.toggle('past',i<index);node.classList.toggle('near',i===index-1||i===index+1||i===index+2);if(i===index)node.setAttribute('aria-current','true');else node.removeAttribute('aria-current')});
  const current=nodes[index];
  if(current){const target=current.offsetTop-scroller.clientHeight*.42+current.offsetHeight*.5;scroller.scrollTo({top:Math.max(0,target),behavior:force?'auto':'smooth'})}
}
function updateProgress(){
  const t=seekPreview?seekPreviewTime:estimatedTime(); const current=duration>0?Math.max(0,Math.min(duration,t)):Math.max(0,t); const pct=duration>0?current/duration*100:0;
  if(progressFill)progressFill.style.width=`${pct}%`;
  if(seek&&!seekPreview){seek.max=String(duration>0?duration:1);seek.value=String(duration>0?current:0)}
  if(progressCurrent)progressCurrent.textContent=fmt(current);if(progressDuration)progressDuration.textContent=fmt(duration);
}
function setSettings(open){settingsOpen=!!open;settingsPanel?.classList.toggle('open',settingsOpen);settingsPanel?.setAttribute('aria-hidden',String(!settingsOpen));settingsBtn?.setAttribute('aria-expanded',String(settingsOpen));settingsBtn?.classList.toggle('active',settingsOpen)}
function setVisualizer(value){prefs.visualizer=value!==false;applyPrefs(true);publishPrefs()}
function setOnlyLyrics(value){prefs.onlyLyrics=!!value;setSettings(false);applyPrefs(false);publishPrefs()}

visualizerBtn?.addEventListener('click',()=>setVisualizer(!visualizerEnabled));settingsVisualizer?.addEventListener('click',()=>setVisualizer(!visualizerEnabled));
onlyBtn?.addEventListener('click',()=>setOnlyLyrics(!onlyLyrics));settingsOnly?.addEventListener('click',()=>setOnlyLyrics(!onlyLyrics));onlyExit?.addEventListener('click',()=>setOnlyLyrics(false));
settingsBtn?.addEventListener('click',()=>setSettings(!settingsOpen));
panelOpacity?.addEventListener('input',()=>{prefs.panelOpacity=Number(panelOpacity.value);applyPrefs(false);publishPrefs()});lyricsOpacity?.addEventListener('input',()=>{prefs.lyricsOpacity=Number(lyricsOpacity.value);applyPrefs(false);publishPrefs()});lyricsSize?.addEventListener('input',()=>{prefs.fontScale=Number(lyricsSize.value);applyPrefs(false);publishPrefs()});

seek?.addEventListener('pointerdown',()=>{seekPreview=true;seekPreviewTime=Number(seek.value)||0});seek?.addEventListener('input',()=>{seekPreview=true;seekPreviewTime=Math.max(0,Math.min(duration,Number(seek.value)||0));updateProgress()});seek?.addEventListener('change',()=>{const target=Math.max(0,Math.min(duration,Number(seek.value)||0));if(duration>0)window.echoAPI?.immersiveLyricsAction?.(`seek:${target.toFixed(3)}`);clock.baseTime=target;clock.basePerf=performance.now();seekPreview=false;updateProgress()});seek?.addEventListener('pointercancel',()=>{seekPreview=false;updateProgress()});
linesEl?.addEventListener('click',event=>{const line=event.target.closest('.immersive-lyric-line[data-line]');if(!line)return;const target=timeline[Number(line.dataset.line)]?.time;if(Number.isFinite(target))window.echoAPI?.immersiveLyricsAction?.(`seek:${target.toFixed(3)}`)});

[['immersiveBack10Btn','back10'],['immersivePrevBtn','previous'],['immersivePlayBtn','playPause'],['immersiveNextBtn','next'],['immersiveForward10Btn','forward10'],['immersiveLyricsCloseBtn','close']].forEach(([id,action])=>document.getElementById(id)?.addEventListener('click',()=>window.echoAPI?.immersiveLyricsAction?.(action)));
clickThroughBtn?.addEventListener('click',async()=>{const result=await window.echoAPI?.toggleImmersiveLyricsClickThrough?.();if(result&&typeof result.enabled==='boolean')applyClickThrough(result.enabled)});
function applyClickThrough(value){clickThrough=!!value;clickThroughBtn?.classList.toggle('active',clickThrough);clickThroughBtn?.setAttribute('aria-pressed',String(clickThrough));if(clickThroughBtn)clickThroughBtn.title=clickThrough?'Click-through ON · Ctrl+Alt+Shift+X to turn OFF':'Click-through OFF · Ctrl+Alt+Shift+X'}
window.echoAPI?.onImmersiveLyricsClickThroughState?.((state={})=>applyClickThrough(!!state.enabled));window.echoAPI?.getImmersiveLyricsClickThrough?.().then?.(state=>applyClickThrough(!!state?.enabled)).catch?.(()=>{});
function applyRemotePrefs(value={}){
  if(!value||typeof value!=='object')return;
  prefs={...prefs,...value};
  prefs.panelOpacity=Math.max(0,Math.min(95,Number(prefs.panelOpacity)||0));
  prefs.lyricsOpacity=Math.max(35,Math.min(100,Number(prefs.lyricsOpacity)||100));
  prefs.fontScale=Math.max(80,Math.min(150,Number(prefs.fontScale)||100));
  prefs.visualizer=prefs.visualizer!==false;
  prefs.onlyLyrics=!!prefs.onlyLyrics;
  applyPrefs(false);
}
window.echoAPI?.onImmersiveLyricsPrefs?.((value={})=>applyRemotePrefs(value));
window.echoAPI?.getImmersiveLyricsPrefs?.().then?.(result=>{if(result?.prefs)applyRemotePrefs(result.prefs)}).catch?.(()=>{});

window.echoAPI?.onImmersiveLyricsState?.((state={})=>{
  document.body.dataset.theme=state.theme||'golden';
  songEl.textContent=state.title||'DEEP-ECHO Lyrics';artistEl.textContent=state.artist||'';
  if(Array.isArray(state.lines)){timeline=normalize(state.lines);plainLines=[];buildLines()}
  else if(!timeline.length&&Array.isArray(state.plainLines)){plainLines=state.plainLines.map(x=>String(x||'').trim()).filter(Boolean);buildLines()}
  if(Array.isArray(state.plainLines)&&!timeline.length){const next=state.plainLines.map(x=>String(x||'').trim()).filter(Boolean);if(next.join('\n')!==plainLines.join('\n')){plainLines=next;buildLines()}}
  if(Array.isArray(state.spectrum))spectrum=state.spectrum.map(v=>Math.max(0,Math.min(1,Number(v)||0)));
  if(Array.isArray(state.waveform))waveform=state.waveform.map(v=>Math.max(-1,Math.min(1,Number(v)||0)));
  if(state.audioGraph&&typeof state.audioGraph==='object')audioGraph={...audioGraph,...state.audioGraph};
  clock={baseTime:Number(state.playbackTime||0),basePerf:performance.now(),playing:!!state.playing,rate:Number(state.playbackRate||1)||1};duration=Math.max(0,Number(state.duration||0));
  if(playBtn)playBtn.textContent=clock.playing?'Ⅱ':'▶';
  updateLyrics(false);updateProgress();
});

function clamp01(value){return Math.max(0,Math.min(1,Number(value)||0))}
function resizeCanvas(){if(!visualizer)return null;const dpr=Math.max(1,Math.min(1.7,window.devicePixelRatio||1));const rect=visualizer.getBoundingClientRect();const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(visualizer.width!==w||visualizer.height!==h){visualizer.width=w;visualizer.height=h}return{dpr,w,h,rect}}
function sample(values,x){if(!values.length)return 0;const p=Math.max(0,Math.min(values.length-1,x*(values.length-1)));const i=Math.floor(p),f=p-i;return(Number(values[i])||0)*(1-f)+(Number(values[Math.min(values.length-1,i+1)])||0)*f}
function spectrumSample(x){return clamp01(Math.pow(Math.max(0,sample(spectrum,x)),.88)*1.12)}
function waveSample(x){return waveform.length?Math.max(-1,Math.min(1,sample(waveform,x))):0}
function themeSpec(theme=document.body.dataset.theme||'golden'){
  const specs={
    golden:{mode:'sphere',accent:'golden',h1:38,h2:49,h3:30,glow:'rgba(255,190,70,.34)',core:'rgba(255,197,85,.18)',ray:'rgba(255,191,73,',speed:1.0,rays:128,glowGain:1.12},
    light:{mode:'sphere',accent:'light',h1:34,h2:43,h3:24,glow:'rgba(184,132,54,.24)',core:'rgba(213,164,84,.15)',ray:'rgba(180,128,46,',speed:.85,rays:112,glowGain:.92},
    dark:{mode:'sphere',accent:'dark',h1:205,h2:220,h3:196,glow:'rgba(160,190,225,.22)',core:'rgba(159,187,219,.13)',ray:'rgba(154,186,220,',speed:.82,rays:120,glowGain:1.02},
    purple:{mode:'electric',accent:'electric',h1:265,h2:282,h3:244,glow:'rgba(177,104,255,.34)',core:'rgba(167,91,255,.18)',ray:'rgba(177,110,255,',speed:1.18,rays:132,glowGain:1.18},
    toxic:{mode:'toxic',accent:'toxic',h1:132,h2:111,h3:151,glow:'rgba(72,255,118,.34)',core:'rgba(61,255,105,.17)',ray:'rgba(76,255,122,',speed:1.28,rays:144,glowGain:1.20},
    blood:{mode:'blood',accent:'blood',h1:350,h2:2,h3:338,glow:'rgba(255,41,78,.38)',core:'rgba(189,9,45,.22)',ray:'rgba(235,35,69,',speed:.92,rays:104,glowGain:1.22},
    silver:{mode:'sphere',accent:'silver',h1:205,h2:216,h3:194,glow:'rgba(223,239,255,.34)',core:'rgba(220,235,249,.17)',ray:'rgba(219,237,255,',speed:.9,rays:124,glowGain:1.04},
    transparent:{mode:'sphere',accent:'glass',h1:224,h2:238,h3:202,glow:'rgba(185,204,255,.3)',core:'rgba(180,201,255,.14)',ray:'rgba(185,205,255,',speed:.88,rays:120,glowGain:1.02},
    fluids:{mode:'fluid',accent:'fluid',h1:190,h2:278,h3:157,glow:'rgba(75,220,255,.34)',core:'rgba(69,210,255,.15)',ray:'rgba(80,220,255,',speed:1.08,rays:136,glowGain:1.15},
    rgb:{mode:'rgb',accent:'rgb',h1:0,h2:360,h3:210,glow:'rgba(114,215,255,.34)',core:'rgba(255,255,255,.12)',ray:'rgba(120,220,255,',speed:1.42,rays:168,glowGain:1.18},
    love:{mode:'love',accent:'love',h1:330,h2:395,h3:285,glow:'rgba(255,91,183,.38)',core:'rgba(255,126,193,.16)',ray:'rgba(255,100,190,',speed:1.24,rays:148,glowGain:1.18},
    space:{mode:'space',accent:'space',h1:207,h2:276,h3:318,glow:'rgba(84,170,255,.42)',core:'rgba(168,111,255,.18)',ray:'rgba(111,193,255,',speed:1.12,rays:156,glowGain:1.16},
    dragon:{mode:'dragon',accent:'dragon',h1:24,h2:10,h3:42,glow:'rgba(255,92,16,.42)',core:'rgba(255,118,28,.18)',ray:'rgba(255,98,20,',speed:1.16,rays:142,glowGain:1.20}
  };return specs[theme]||specs.golden;
}
function drawHeart(ctx,x,y,size,color,alpha=1,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(size/32,size/32);ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,10);ctx.bezierCurveTo(-19,-3,-17,-18,-7,-18);ctx.bezierCurveTo(-1,-18,0,-12,0,-9);ctx.bezierCurveTo(0,-12,1,-18,7,-18);ctx.bezierCurveTo(17,-18,19,-3,0,10);ctx.closePath();ctx.fill();ctx.restore()}
function drawDragonVisualizer(ctx,w,h,dpr,audio){
  ctx.save();const energy=clamp01(audio.energy),bass=clamp01(audio.bass),beat=clamp01(audio.beatPulse);const time=estimatedTime();
  if(immersiveDragonImage.complete&&immersiveDragonImage.naturalWidth){const scale=Math.max(w/immersiveDragonImage.naturalWidth,(h*.56)/immersiveDragonImage.naturalHeight);const dw=immersiveDragonImage.naturalWidth*scale,dh=immersiveDragonImage.naturalHeight*scale;ctx.globalAlpha=.24+.18*energy;ctx.drawImage(immersiveDragonImage,(w-dw)/2,h*.48-dh*.5,dw,dh)}
  const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'rgba(8,3,1,.18)');shade.addColorStop(.55,'rgba(8,3,1,.02)');shade.addColorStop(1,'rgba(8,3,1,.28)');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#ff8b24';ctx.lineWidth=1.3*dpr;ctx.shadowColor='#ff5e0b';ctx.shadowBlur=(8+energy*15)*dpr;
  const cy=h*.52,baseR=Math.min(w,h)*.23;
  for(let j=0;j<3;j++){ctx.globalAlpha=.09+beat*.15;ctx.beginPath();ctx.arc(w*.58,cy,baseR*(1+j*.23+beat*.05),Math.PI,Math.PI*2);ctx.stroke()}
  const count=96;const spine=x=>cy+Math.sin(x*9-time*.6)*h*.025;ctx.globalAlpha=.62;ctx.beginPath();for(let i=0;i<count;i++){const x=i/(count-1),y=spine(x)-spectrumSample(x)*h*.10;i?ctx.lineTo(x*w,y):ctx.moveTo(0,y)}for(let i=count-1;i>=0;i--)ctx.lineTo(i/(count-1)*w,spine(i/(count-1)));ctx.closePath();const fire=ctx.createLinearGradient(0,cy-h*.18,0,cy+h*.18);fire.addColorStop(0,'rgba(255,231,158,.72)');fire.addColorStop(.6,'rgba(255,83,8,.30)');fire.addColorStop(1,'rgba(220,35,0,0)');ctx.fillStyle=fire;ctx.fill();ctx.stroke();
  for(let j=0;j<3;j++){ctx.globalAlpha=.20+j*.10;ctx.beginPath();for(let i=0;i<80;i++){const x=i/79,y=spine(x)+Math.sin(x*18-time*1.6+j)*h*.006*(1+bass);i?ctx.lineTo(x*w,y):ctx.moveTo(0,y)}ctx.stroke()}
  const breath=ctx.createRadialGradient(w*.88,h*.47,0,w*.88,h*.47,w*(.08+bass*.05));breath.addColorStop(0,`rgba(255,211,100,${.08+energy*.36})`);breath.addColorStop(1,'rgba(255,50,0,0)');ctx.fillStyle=breath;ctx.fillRect(w*.7,h*.23,w*.3,h*.5);
  ctx.shadowBlur=0;for(let i=0;i<24;i++){const x=((i*.618033+time*.015)%1)*w,y=h*(.88-((i*.173+time*(.035+energy*.025))%1)*.68);ctx.globalAlpha=(.10+energy*.42)*(1-y/h);ctx.fillStyle=i%3?'#ff9f32':'#fff0bc';ctx.fillRect(x,y,(1+beat*2)*dpr,(2+energy*3)*dpr)}ctx.restore();
}
function spawnBloodDrop(cx,cy,r,audio){if(!audio.playing||!audio.hasSignal||audio.beatId===visualizerLastBloodBeatId||audio.beatPulse<.28)return;visualizerLastBloodBeatId=audio.beatId;const count=1+Math.floor(clamp01(audio.aggression)*2.2);for(let n=0;n<count&&visualizerBloodDrops.length<24;n++){const i=visualizerBloodSpawnIndex++,a=(i*2.399963229728653+clamp01(audio.centroid)*2.1)%(Math.PI*2),edge=.79+((i*37)%17)/100,speed=r*(.006+audio.beatPulse*.015+audio.transient*.008),burst=1.45+((i*13)%9)*.16;visualizerBloodDrops.push({x:cx+Math.cos(a)*r*edge,y:cy+Math.sin(a)*r*edge,vx:Math.cos(a)*speed*burst,vy:Math.sin(a)*speed*burst+speed*.65,r:1.6+((i*7)%5)*.72+audio.beatPulse*2.6,life:1,stretch:1.25+((i*11)%7)*.18})}}
function drawBloodDrops(ctx,dpr,cx,cy,r,audio){spawnBloodDrop(cx,cy,r,audio);for(let i=visualizerBloodDrops.length-1;i>=0;i--){const d=visualizerBloodDrops[i];d.x+=d.vx;d.y+=d.vy;d.vy+=.045*dpr;d.life-=.018;if(d.life<=0){visualizerBloodDrops.splice(i,1);continue}ctx.save();ctx.globalAlpha=d.life*.65;ctx.fillStyle='#d40d3d';ctx.shadowColor='#ff315f';ctx.shadowBlur=8*dpr;ctx.beginPath();ctx.ellipse(d.x,d.y,d.r*dpr,d.r*d.stretch*dpr,Math.atan2(d.vy,d.vx)-Math.PI/2,0,Math.PI*2);ctx.fill();ctx.restore()}}
function drawThemeAccent(ctx,spec,cx,cy,sphereR,audio,dpr,safeOuterR){const safeR=(v,p=0)=>Math.max(0,Math.min(v,safeOuterR-p)),kick=clamp01(audio.beatPulse),hit=clamp01(audio.transient),body=clamp01(audio.lowMid)*.18+clamp01(audio.mid)*.28+clamp01(audio.vocal)*.54,air=(clamp01(audio.highMid)+clamp01(audio.treble))*.5,phase=visualizerPhase,accent=spec.accent||spec.mode;
  if(accent==='golden'){ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';for(let i=0;i<22;i++){const q=i/22,sp=spectrumSample(q),wv=waveSample((q+.13)%1),a=q*Math.PI*2+visualizerAngle*.46+wv*hit*.09,r=safeR(sphereR*(1.08+kick*.035)+sp*(12+audio.aggression*22)*dpr,14*dpr),z=(1+sp*2.4+kick*1.5+air*.8)*dpr;ctx.fillStyle=`hsla(${38+sp*18},100%,72%,${.18+sp*.44+hit*.12})`;ctx.shadowColor='rgba(255,190,70,.92)';ctx.shadowBlur=(7+sp*13+kick*8)*dpr;ctx.save();ctx.translate(Math.cos(a)*r,Math.sin(a)*r);ctx.rotate(a+phase*.08);ctx.fillRect(-z/2,-z/2,z,z);ctx.restore()}ctx.restore()}
  else if(accent==='light'){ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';for(let ring=0;ring<2;ring++){ctx.beginPath();for(let i=0;i<=100;i++){const q=i/100,a=q*Math.PI*2,wv=waveSample((q+ring*.2)%1),sp=spectrumSample(q),r=safeR(sphereR*(1.05+ring*.07)+wv*(2+body*5)*dpr+sp*7*dpr,10*dpr);i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.strokeStyle=`rgba(255,224,170,${.08+audio.energy*.16+hit*.09})`;ctx.lineWidth=(1.1+ring*.7+air*.8)*dpr;ctx.shadowColor='rgba(255,210,145,.65)';ctx.shadowBlur=(5+hit*8)*dpr;ctx.stroke()}ctx.restore()}
  else if(accent==='dark'){ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';for(let i=0;i<18;i++){const q=i/18,sp=spectrumSample(q),a=q*Math.PI*2-visualizerAngle*.35,r=safeR(sphereR*(1.10+(i%3)*.035)+sp*14*dpr,12*dpr),len=(2+sp*8+hit*5)*dpr;ctx.strokeStyle=`rgba(130,190,255,${.12+sp*.36})`;ctx.shadowColor='rgba(90,145,255,.78)';ctx.shadowBlur=(7+sp*12+hit*8)*dpr;ctx.beginPath();ctx.moveTo(Math.cos(a)*(r-len),Math.sin(a)*(r-len));ctx.lineTo(Math.cos(a)*(r+len),Math.sin(a)*(r+len));ctx.stroke()}ctx.restore()}
  else if(accent==='silver'){ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';for(let i=0;i<20;i++){const q=i/20,sp=spectrumSample(q),a=q*Math.PI*2+visualizerAngle*.3,r=safeR(sphereR*(1.07+(i%2)*.055)+sp*10*dpr,10*dpr),z=(1+sp*2.2+air*1.4)*dpr;ctx.fillStyle=`rgba(228,244,255,${.16+sp*.44+hit*.11})`;ctx.shadowColor='rgba(205,235,255,.9)';ctx.shadowBlur=(6+sp*11+hit*8)*dpr;ctx.fillRect(Math.cos(a)*r-z/2,Math.sin(a)*r-z/2,z,z)}ctx.restore()}
  else if(accent==='glass'){ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';for(let ring=0;ring<3;ring++){ctx.beginPath();const rr=safeR(sphereR*(1.02+ring*.085+kick*.018),8*dpr);ctx.strokeStyle=`rgba(190,215,255,${.05+audio.energy*.09+ring*.02})`;ctx.lineWidth=(.7+ring*.45+hit*.5)*dpr;ctx.shadowColor='rgba(180,210,255,.48)';ctx.shadowBlur=(4+audio.energy*8)*dpr;ctx.arc(0,0,rr,0,Math.PI*2);ctx.stroke()}ctx.restore()}
  else if(accent==='rgb'){ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';for(let band=0;band<5;band++){ctx.beginPath();for(let i=0;i<=120;i++){const q=i/120,a=q*Math.PI*2,sp=spectrumSample((q+band*.025)%1),wv=waveSample((q*.84+band*.071)%1),wobble=wv*(5+body*20+hit*18)*dpr,rr=safeR(sphereR*(1.02+band*.042+kick*.018)+wobble+sp*(15+audio.aggression*22)*dpr,10*dpr),x=Math.cos(a)*rr,y=Math.sin(a)*rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();const hue=(phase*85+band*72)%360;ctx.strokeStyle=`hsla(${hue},100%,68%,${.045+audio.energy*.09+hit*.11})`;ctx.lineWidth=(4.6-band*.6+hit*1.4)*dpr;ctx.stroke()}ctx.restore()}
  else if(accent==='love'){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<16;i++){const q=i/16,sp=spectrumSample(q),wv=waveSample((q*.91+.08)%1),a=q*Math.PI*2+visualizerAngle*(i%2?-.8:1.05)+wv*hit*.13,rr=safeR(sphereR*(1.08+kick*.06)+sp*(18+audio.aggression*28)*dpr+wv*body*8*dpr,24*dpr),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,hue=(322+i*19+phase*34+air*18)%360,z=(7+sp*10+kick*10+air*4)*dpr;ctx.shadowColor=`hsla(${hue},100%,65%,.75)`;ctx.shadowBlur=(9+hit*12)*dpr;drawHeart(ctx,x,y,z,`hsla(${hue},100%,68%,${.15+sp*.46+hit*.11})`,.9,a+Math.PI/2)}ctx.restore()}
  else if(accent==='space'){ctx.save();ctx.globalCompositeOperation='lighter';for(let ring=0;ring<3;ring++){ctx.beginPath();for(let i=0;i<=140;i++){const q=i/140,a=q*Math.PI*2,sp=spectrumSample((q+ring*.04)%1),wv=waveSample((q*.78+ring*.13)%1),rr=safeR(sphereR*(1.04+ring*.075+kick*.014)+wv*(3+body*13+hit*12)*dpr+sp*(10+audio.aggression*18)*dpr,12*dpr),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*(.86+ring*.025);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();const hue=202+ring*36+audio.centroid*18;ctx.strokeStyle=`hsla(${hue},100%,72%,${.04+audio.energy*.10+hit*.12})`;ctx.lineWidth=(1.1+ring*.65+air*1.8+hit*1.2)*dpr;ctx.shadowColor=`hsla(${hue},100%,72%,.5)`;ctx.shadowBlur=(7+audio.energy*10+hit*14)*dpr;ctx.stroke()}for(let i=0;i<18;i++){const q=i/18,sp=spectrumSample(q),wv=waveSample((q+.19)%1),a=q*Math.PI*2+visualizerAngle*(i%2?-.55:.72)+wv*hit*.12,rr=safeR(sphereR*(1.1+(i%4)*.055+kick*.025)+sp*(16+audio.aggression*24)*dpr,14*dpr),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,z=(1.1+sp*2.5+air*2+hit*1.5)*dpr,hue=195+(i%5)*27;ctx.fillStyle=`hsla(${hue},100%,82%,${.18+sp*.50+hit*.14})`;ctx.shadowColor=`hsla(${hue},100%,72%,.85)`;ctx.shadowBlur=(7+hit*10)*dpr;ctx.fillRect(x-z/2,y-z/2,z,z)}ctx.restore()}
  else if(accent==='electric'){ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';for(let branch=0;branch<3;branch++){const baseA=visualizerAngle*(1.5+branch*.18)+branch*2.1;ctx.strokeStyle=`hsla(${spec.h1+branch*11},100%,72%,${.05+air*.15+hit*.20})`;ctx.lineWidth=(.9+air*1.3+hit*1.5)*dpr;ctx.beginPath();for(let j=0;j<=10;j++){const q=(branch*.23+j/10*.63)%1,sp=spectrumSample(q),wv=waveSample(q),a=baseA+j*.075+wv*(.035+hit*.11),r=safeR(sphereR*(.52+j*.072)+sp*(8+hit*24)*dpr,8*dpr),x=Math.cos(a)*r,y=Math.sin(a)*r;j?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}ctx.restore()}
  else if(accent==='toxic'){ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';for(let i=0;i<20;i++){const q=i/20,sp=spectrumSample(q),wv=Math.abs(waveSample((q+.31)%1)),a=q*Math.PI*2+visualizerAngle*.8,r=safeR(sphereR*(1.02+sp*.09+kick*.04)+wv*hit*13*dpr,16*dpr),rr=(1.8+sp*4+audio.bass*2.5+hit*2.2)*dpr;ctx.fillStyle=`hsla(${spec.h1+sp*28},100%,65%,${.05+sp*.16+hit*.09})`;ctx.shadowColor=`hsla(${spec.h1},100%,60%,.55)`;ctx.shadowBlur=(8+hit*12)*dpr;ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,rr,0,Math.PI*2);ctx.fill()}ctx.restore()}
  else if(accent==='fluid'){ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';for(let layer=0;layer<3;layer++){ctx.beginPath();for(let i=0;i<=100;i++){const q=i/100,a=q*Math.PI*2,sp=spectrumSample((q+layer*.035)%1),wv=waveSample((q*.92+layer*.17)%1),amp=(5+body*17+hit*21)*dpr,rr=safeR(sphereR*(1.02+layer*.035+kick*.018)+wv*amp+sp*(8+audio.aggression*18)*dpr,12*dpr),x=Math.cos(a)*rr,y=Math.sin(a)*rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.strokeStyle=`hsla(${[spec.h1,spec.h2,spec.h3][layer]},100%,68%,${.05+audio.energy*.09+hit*.11})`;ctx.lineWidth=(4.6-layer*.9+hit*1.2)*dpr;ctx.stroke()}ctx.restore()}
}
function drawSphereVisualizer(ctx,w,h,dpr,audio,spec){const cx=w*.54,cy=h*.52,safeOuter=Math.max(70*dpr,Math.min(w*.47,h*.30)),body=clamp01(audio.lowMid)*.16+clamp01(audio.mid)*.22+clamp01(audio.vocal)*.48,bassKick=clamp01(audio.beatPulse)*(.55+clamp01(audio.subBass)*.45),baseR=Math.min(w,h)*(.17+clamp01(audio.bass)*.014+body*.014),sphereR=Math.min(baseR*(1+clamp01(audio.energy)*.06+clamp01(audio.vocal)*.055+bassKick*.07+clamp01(audio.transient)*.022+clamp01(audio.vocalTransient)*.026),safeOuter*.59);
  const aura=ctx.createRadialGradient(cx,cy,sphereR*.15,cx,cy,sphereR*1.28);aura.addColorStop(0,spec.core);aura.addColorStop(.46,spec.glow);aura.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=.72;ctx.fillStyle=aura;ctx.beginPath();ctx.arc(cx,cy,sphereR*(1.4+audio.beatPulse*.1),0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';const rays=Math.max(72,Math.round(spec.rays*.64));for(let i=0;i<rays;i++){const q=i/rays,a=q*Math.PI*2,sp=spectrumSample(q),wv=waveSample((q*.91+.045)%1),band=q<.24?audio.bass:q<.76?Math.max(audio.mid,audio.vocal):audio.treble,harm=Math.abs(wv)*(.35+audio.transient*.65),vocalZone=q>.22&&q<.78?audio.vocal:audio.vocal*.18,reactive=Math.min(1,sp*(1.02+audio.aggression*.48)+band*.12+vocalZone*.24+harm*.15+audio.beatPulse*.07+audio.vocalTransient*.12),inner=sphereR*(1.025+(spec.mode==='blood'?wv*audio.transient*.022:wv*audio.transient*.006));let len=(5+reactive*(32+audio.aggression*48)+bassKick*20+audio.vocal*18+audio.vocalTransient*20+audio.transient*12)*dpr;if(spec.mode==='blood')len*=.6;if(spec.mode==='love')len*=.76;if(spec.mode==='space')len*=.85;const outer=Math.min(inner+len,safeOuter-8*dpr);if(spec.mode==='rgb'){const hue=(q*360+visualizerPhase*85+audio.centroid*45)%360;ctx.strokeStyle=`hsla(${hue},100%,64%,${.08+reactive*.38})`;ctx.shadowColor=`hsla(${hue},100%,62%,${.18+reactive*.40})`}else if(spec.mode==='love'){const hue=(318+q*78+visualizerPhase*28+audio.highMid*16)%360;ctx.strokeStyle=`hsla(${hue},100%,66%,${.08+reactive*.36})`;ctx.shadowColor=`hsla(${hue},100%,65%,${.18+reactive*.38})`}else if(spec.mode==='space'){const hue=(198+q*118+visualizerPhase*18+audio.centroid*30)%360;ctx.strokeStyle=`hsla(${hue},100%,70%,${.08+reactive*.37})`;ctx.shadowColor=`hsla(${hue},100%,68%,${.18+reactive*.40})`}else{ctx.strokeStyle=`${spec.ray}${Math.min(.54,(.07+reactive*.34)*(spec.glowGain||1))})`;ctx.shadowColor=`hsla(${spec.h2},100%,64%,${.16+reactive*.35})`}ctx.shadowBlur=(1.5+reactive*5.5+audio.beatPulse*2.5)*dpr;ctx.lineWidth=Math.max(1,(1+reactive*(spec.mode==='toxic'?1.6:.7))*dpr);ctx.beginPath();ctx.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);ctx.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);ctx.stroke()}ctx.shadowBlur=0;ctx.restore();
  drawThemeAccent(ctx,spec,cx,cy,sphereR,audio,dpr,safeOuter-6*dpr);
  const latBands=15,lonBands=34,tilt=-.28+waveSample(.42)*audio.mid*.055+waveSample(.77)*audio.transient*.035,cosT=Math.cos(tilt),sinT=Math.sin(tilt),cosY=Math.cos(visualizerAngle),sinY=Math.sin(visualizerAngle);for(let lat=1;lat<latBands;lat++){const phi=lat/latBands*Math.PI,sinP=Math.sin(phi),cosP=Math.cos(phi);for(let lon=0;lon<lonBands;lon++){const theta=lon/lonBands*Math.PI*2;let x=sinP*Math.cos(theta),y=cosP,z=sinP*Math.sin(theta),ryX=x*cosY-z*sinY,ryZ=x*sinY+z*cosY;x=ryX;z=ryZ;const rtY=y*cosT-z*sinT,rtZ=y*sinT+z*cosT;y=rtY;z=rtZ;const q=((lon+lat*2.4)%lonBands)/lonBands,sp=spectrumSample(q),wv=waveSample((q*.83+lat/latBands*.11)%1);let displacement=1+sp*(.052+audio.aggression*.086)+audio.beatPulse*.018+audio.vocal*.022+wv*(audio.transient*.015+audio.vocalTransient*.021);if(spec.mode==='toxic')displacement+=Math.max(0,wv)*sp*(.025+audio.aggression*.035);if(spec.mode==='blood')displacement+=wv*.022*(audio.bass+audio.transient);if(spec.mode==='fluid')displacement+=wv*.035*(audio.mid+audio.transient*.7);if(spec.mode==='rgb')displacement+=wv*.038*(audio.energy+audio.transient);if(spec.mode==='love')displacement+=wv*.026*(audio.bass+audio.mid*.5);if(spec.mode==='space')displacement+=wv*.023*(audio.highMid+audio.transient);const perspective=1/(1.55-z*.26),px=cx+x*sphereR*displacement*perspective,py=cy+y*sphereR*displacement*perspective,depth=clamp01((z+1)/2),dotR=(.9+depth*1.2+sp*(1.45+audio.aggression*1.3)+audio.beatPulse*.45+audio.vocal*.62+audio.treble*.18)*dpr,alpha=Math.min(.82,(.15+depth*.48+sp*.28+audio.beatPulse*.07)*(spec.glowGain||1)),mix=depth*.52+sp*.48;let hue=spec.h1+(spec.h2-spec.h1)*mix+wv*audio.highMid*9;if(spec.mode==='rgb')hue=(theta/(Math.PI*2)*360+phi/Math.PI*140+visualizerPhase*78+audio.centroid*50)%360;if(spec.mode==='love')hue=(322+theta/(Math.PI*2)*82+visualizerPhase*34+sp*28+audio.highMid*12)%360;const light=spec.mode==='blood'?48+depth*24:(spec.mode==='love'?56+depth*24:55+depth*25);ctx.fillStyle=`hsla(${hue},100%,${light}%,${alpha})`;ctx.shadowColor=`hsla(${hue},100%,${Math.min(84,light+10)}%,${Math.min(1,alpha*.9)})`;ctx.shadowBlur=(2+sp*8+audio.bass*3+audio.beatPulse*3)*dpr;const accent=spec.accent||spec.mode;if(accent==='golden'||accent==='silver'){const rr=dotR*.82;ctx.save();ctx.translate(px,py);ctx.rotate(theta+visualizerAngle*.4);ctx.fillRect(-rr/2,-rr/2,rr,rr);ctx.restore()}else if(accent==='dark'){ctx.beginPath();ctx.ellipse(px,py,dotR*.58,dotR*1.22,theta,0,Math.PI*2);ctx.fill()}else if(accent==='glass'){ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=Math.max(.55*dpr,dotR*.28);ctx.beginPath();ctx.arc(px,py,dotR*.74,0,Math.PI*2);ctx.stroke()}else{ctx.beginPath();ctx.arc(px,py,dotR,0,Math.PI*2);ctx.fill()}}}
  ctx.shadowBlur=0;const core=ctx.createRadialGradient(cx,cy,0,cx,cy,sphereR*.92);if(spec.mode==='blood'){core.addColorStop(0,`rgba(255,52,90,${.05+audio.bass*.14})`);core.addColorStop(.5,`rgba(148,0,35,${.035+audio.energy*.10})`);core.addColorStop(1,'rgba(48,0,12,0)')}else{core.addColorStop(0,spec.core);core.addColorStop(.55,spec.glow);core.addColorStop(1,'rgba(0,0,0,0)')}ctx.globalAlpha=.65;ctx.fillStyle=core;ctx.beginPath();ctx.arc(cx,cy,sphereR*(.90+audio.beatPulse*.055),0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;if(spec.mode==='blood')drawBloodDrops(ctx,dpr,cx,cy,sphereR,audio)
}
function drawVisualizer(now=performance.now()){
  requestAnimationFrame(drawVisualizer);if(!visualizerEnabled||!visualizer)return;const size=resizeCanvas();if(!size)return;const ctx=visualizer.getContext('2d');if(!ctx)return;const{w,h,dpr}=size;ctx.clearRect(0,0,w,h);if(!audioGraph.hasSignal||spectrum.length<2)return;
  const dt=Math.max(0,Math.min(.08,(now-visualizerLastFrameAt)/1000));visualizerLastFrameAt=now;const spec=themeSpec();if(audioGraph.playing!==false){visualizerPhase+=dt*(.22+clamp01(audioGraph.motion)*1.7+clamp01(audioGraph.centroid)*.5)*spec.speed;visualizerAngle+=dt*(.035+clamp01(audioGraph.motion)*.5+clamp01(audioGraph.treble)*.22+clamp01(audioGraph.transient)*.3)*spec.speed}
  if(spec.mode==='dragon'){drawDragonVisualizer(ctx,w,h,dpr,audioGraph);return}drawSphereVisualizer(ctx,w,h,dpr,audioGraph,spec);
}
requestAnimationFrame(drawVisualizer);window.addEventListener('resize',resizeCanvas);new ResizeObserver(resizeCanvas).observe(root);
setInterval(()=>{updateLyrics(false);updateProgress()},80);
