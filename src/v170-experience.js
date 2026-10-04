(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const LS = {
    mode:'deepeccho-v170-vis-mode', quality:'deepeccho-v170-vis-quality', lighting:'deepeccho-v170-lighting', art:'deepeccho-v170-art', autoTheme:'deepeccho-v170-autotheme', adaptive:'deepeccho-v170-adaptive', karaoke:'deepeccho-v170-karaoke', offsets:'deepeccho-v170-lyric-offsets', width:'deepeccho-v170-width', bypass:'deepeccho-v170-bypass', bass:'deepeccho-v170-bass', vocal:'deepeccho-v170-vocal'
  };
  const safeJSON=(k,f={})=>{try{return JSON.parse(localStorage.getItem(k)||'')||f}catch{return f}};
  const setBool=(k,v)=>localStorage.setItem(k,String(!!v));
  const getBool=(k,d=false)=>{const v=localStorage.getItem(k);return v==null?d:v==='true'};
  const mode=$('v170VisualizerMode'), quality=$('v170VisualizerQuality'), lighting=$('v170LightingToggle'), art=$('v170ArtworkAccentToggle'), autoTheme=$('v170AutoThemeToggle'), adaptive=$('v170AdaptivePerf');
  const karaoke=$('v170KaraokeToggle'), karaokeState=$('v170KaraokeState');
  const minus=$('v170LyricsMinus'), plus=$('v170LyricsPlus'), reset=$('v170LyricsOffsetReset'), offsetLabel=$('v170LyricsOffsetLabel');
  const bypass=$('v170AudioBypass'), width=$('v170StereoWidth'), widthValue=$('v170StereoWidthValue'), bassBoost=$('v170BassBoost'), vocalBoost=$('v170VocalBoost');
  const sleep=$('v170SleepTimer'), perf=$('v170PerfStats'), health=$('v170PerfHealth'), visState=$('v170VisualizerState'), lightState=$('v170LightingState');
  const playerWave=$('v170PlayerWaveform');

  function songKey(){ try{return String(currentSong?.id||currentSong?.url||`${currentSong?.title||''}|${currentSong?.channel||''}`||'none')}catch{return 'none'} }
  function syncSongOffset(){ const map=safeJSON(LS.offsets,{}); const ms=Number(map[songKey()]||0); window.deepecchoLyricsSongOffsetMs=Math.max(-10000,Math.min(10000,ms)); if(offsetLabel)offsetLabel.textContent=`${(window.deepecchoLyricsSongOffsetMs/1000).toFixed(1)}s`; try{syncLyrics(true)}catch(_){} }
  function nudgeOffset(delta){ const map=safeJSON(LS.offsets,{}); const key=songKey(); map[key]=Math.max(-10000,Math.min(10000,Number(map[key]||0)+delta)); localStorage.setItem(LS.offsets,JSON.stringify(map)); syncSongOffset(); try{showToast(`Lyrics offset ${(map[key]/1000).toFixed(1)}s`)}catch(_){} }
  minus?.addEventListener('click',()=>nudgeOffset(-500)); plus?.addEventListener('click',()=>nudgeOffset(500)); reset?.addEventListener('click',()=>{const map=safeJSON(LS.offsets,{});delete map[songKey()];localStorage.setItem(LS.offsets,JSON.stringify(map));syncSongOffset()});
  try{audioPlayer?.addEventListener('loadedmetadata',syncSongOffset);audioPlayer?.addEventListener('play',syncSongOffset)}catch(_){}

  function setKaraoke(on){document.body.classList.toggle('v170-karaoke',on);karaoke?.setAttribute('aria-pressed',String(on));if(karaokeState)karaokeState.textContent=on?'ON':'OFF';setBool(LS.karaoke,on)}
  setKaraoke(getBool(LS.karaoke,false)); karaoke?.addEventListener('click',()=>setKaraoke(!document.body.classList.contains('v170-karaoke')));

  function applyVisual(){const m=mode?.value||localStorage.getItem(LS.mode)||'theme';const q=quality?.value||localStorage.getItem(LS.quality)||'balanced';window.__dinechoVisualizerMode=m;window.__dinechoVisualizerQuality=q;localStorage.setItem(LS.mode,m);localStorage.setItem(LS.quality,q);if(visState)visState.textContent=mode?.selectedOptions?.[0]?.textContent||m;document.body.classList.toggle('v170-render-eco',q==='eco')}
  if(mode)mode.value=localStorage.getItem(LS.mode)||'theme';if(quality)quality.value=localStorage.getItem(LS.quality)||'balanced';applyVisual();mode?.addEventListener('change',applyVisual);quality?.addEventListener('change',applyVisual);

  function applyLighting(){const on=lighting?.checked??true;document.body.classList.toggle('v170-lighting-on',on);if(lightState)lightState.textContent=on?'Reactive':'Off';setBool(LS.lighting,on)}
  if(lighting)lighting.checked=getBool(LS.lighting,true);applyLighting();lighting?.addEventListener('change',applyLighting);
  if(art)art.checked=getBool(LS.art,false);document.body.classList.toggle('v170-art-accent',art?.checked);art?.addEventListener('change',()=>{setBool(LS.art,art.checked);document.body.classList.toggle('v170-art-accent',art.checked)});
  if(autoTheme)autoTheme.checked=getBool(LS.autoTheme,false);autoTheme?.addEventListener('change',()=>setBool(LS.autoTheme,autoTheme.checked));

  function accentFromSong(){ if(!art?.checked)return; let h=38;try{const text=`${currentSong?.title||''}${currentSong?.channel||''}`;let x=0;for(const c of text)x=(x*31+c.charCodeAt(0))>>>0;h=x%360}catch(_){} document.documentElement.style.setProperty('--v170-art-accent',`hsl(${h} 88% 64%)`) }
  try{audioPlayer?.addEventListener('loadedmetadata',accentFromSong)}catch(_){}

  function setBand(index,val){const el=document.querySelector(`[data-eq-band="${index}"]`);if(el){el.value=String(val);el.dispatchEvent(new Event('input',{bubbles:true}))}}
  if(bassBoost)bassBoost.checked=getBool(LS.bass,false);if(vocalBoost)vocalBoost.checked=getBool(LS.vocal,false);
  bassBoost?.addEventListener('change',()=>{setBool(LS.bass,bassBoost.checked);setBand(0,bassBoost.checked?8:0);setBand(1,bassBoost.checked?5:0)});
  vocalBoost?.addEventListener('change',()=>{setBool(LS.vocal,vocalBoost.checked);setBand(2,vocalBoost.checked?5:0);setBand(3,vocalBoost.checked?4:0)});
  if(bypass)bypass.checked=getBool(LS.bypass,false);bypass?.addEventListener('change',()=>{setBool(LS.bypass,bypass.checked);try{smartApplyEq()}catch(_){}});
  if(width){width.value=localStorage.getItem(LS.width)||'100';if(widthValue)widthValue.textContent=`${width.value}%`;width.addEventListener('input',()=>{localStorage.setItem(LS.width,width.value);if(widthValue)widthValue.textContent=`${width.value}%`;try{smartApplyEq()}catch(_){}})}


  function drawMode({ctx,w,h,cx,cy,dpr,audio,mode,spectrumSample,waveSample}){
    if(mode==='theme')return false;ctx.save();ctx.globalCompositeOperation='lighter';const accent=getComputedStyle(document.documentElement).getPropertyValue('--gold-bright').trim()||'#ffd27a';ctx.strokeStyle=accent;ctx.fillStyle=accent;ctx.lineWidth=Math.max(1,dpr*1.4);const energy=Math.max(.05,audio.energy||0);
    if(mode==='spectrum'){ctx.beginPath();for(let i=0;i<96;i++){const x=i/95*w,v=spectrumSample(i/95,audio);const y=h-(v*(h*.7)+3*dpr);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}
    else if(mode==='waveform'){ctx.beginPath();for(let i=0;i<180;i++){const x=i/179*w,y=cy+waveSample(i/179)*h*.28*energy*1.8;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}
    else if(mode==='circular'){for(let i=0;i<120;i++){const a=i/120*Math.PI*2,v=spectrumSample(i/120,audio),r=Math.min(w,h)*.22,r2=r+v*Math.min(w,h)*.18;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);ctx.stroke()}}
    else if(mode==='stereo'){const vals=[audio.stereoLeft||0,audio.stereoRight||0];vals.forEach((v,i)=>{const bw=w*.18,x=cx+(i?1:-1)*w*.14-bw/2;ctx.globalAlpha=.25;ctx.fillRect(x,h*.2,bw,h*.6);ctx.globalAlpha=.9;ctx.fillRect(x,h*.8-v*h*.6,bw,v*h*.6)})}
    else if(mode==='vu'){const v=Math.max(audio.rms||0,audio.energy||0);ctx.lineWidth=10*dpr;ctx.beginPath();ctx.arc(cx,cy,Math.min(w,h)*.28,Math.PI*.15,Math.PI*.85);ctx.stroke();ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.PI*.15+v*Math.PI*.7);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.min(w,h)*.27,0);ctx.stroke();ctx.restore()}
    else if(mode==='vocal'){const v=audio.vocal||0;ctx.globalAlpha=.25+.7*v;ctx.beginPath();ctx.arc(cx,cy,Math.min(w,h)*(.12+.2*v),0,Math.PI*2);ctx.stroke();ctx.font=`${Math.max(18,30*dpr)}px sans-serif`;ctx.textAlign='center';ctx.fillText(`VOCAL ${Math.round(v*100)}%`,cx,cy)}
    ctx.restore();return true;
  }
  window.__deepecchoDrawVisualizerMode=drawMode;

  let last=performance.now(),frames=0,acc=0,pressure=0;function frame(now){if(document.hidden || window.__deepecchoGameMode){last=now;requestAnimationFrame(frame);return;}frames++;acc+=now-last;last=now;const a=window.__dinechoAudioEnergy||{};const root=document.documentElement;for(const [k,v] of [['energy',a.energy],['vocal',a.vocal],['bass',a.bass],['treble',a.treble],['hit',a.beatPulse]])root.style.setProperty(`--v170-${k}`,Number(v||0).toFixed(3));if(playerWave?.getContext){const c=playerWave.getContext('2d'),w=playerWave.width,h=playerWave.height;c.clearRect(0,0,w,h);c.beginPath();for(let i=0;i<100;i++){const y=h/2+Math.sin(i*.32+(audioPlayer?.currentTime||0)*2)*h*.22*(a.energy||.1);i?c.lineTo(i/99*w,y):c.moveTo(0,y)}c.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--gold-bright')||'#fff';c.globalAlpha=.55;c.stroke();c.globalAlpha=1}
    if(acc>1000){const fps=Math.round(frames*1000/acc),ms=(1000/Math.max(1,fps)).toFixed(1),mem=performance.memory?`${Math.round(performance.memory.usedJSHeapSize/1048576)} MB`:'n/a';if(perf)perf.innerHTML=`<span>UI FPS ${fps}</span><span>Frame ${ms} ms</span><span>Memory ${mem}</span><span>Quality ${(quality?.value||'balanced')}</span>`;if(adaptive?.checked){pressure=fps<42?Math.min(3,pressure+1):Math.max(0,pressure-1);document.body.classList.toggle('v170-adaptive-pressure',pressure>=2);if(pressure>=3&&quality?.value==='ultra'){quality.value='high';applyVisual()}else if(pressure>=3&&quality?.value==='high'){quality.value='balanced';applyVisual()}}if(health)health.textContent=fps<35?'Protecting playback':fps<50?'Adapting':'Smooth';frames=0;acc=0}requestAnimationFrame(frame)}
  if(adaptive)adaptive.checked=getBool(LS.adaptive,true);adaptive?.addEventListener('change',()=>setBool(LS.adaptive,adaptive.checked));

  // Presentation-only pulse: app lyrics now bounce just like overlay, without owning lyric timing.
  function lyricPulse(){if(document.hidden || window.__deepecchoGameMode){requestAnimationFrame(lyricPulse);return;}const a=window.__dinechoAudioEnergy||{};const bounce=Math.min(4.8,(a.vocal||0)*1.8+(a.beatPulse||0)*3.6+(a.energy||0)*.8);document.documentElement.style.setProperty('--lyric-bounce-y',`${-bounce.toFixed(2)}px`);document.documentElement.style.setProperty('--lyric-bounce-scale',(1+Math.min(.045,(a.vocal||0)*.015+(a.beatPulse||0)*.03)).toFixed(4));requestAnimationFrame(lyricPulse)}
  // These are visual-only loops. Deferring them frees the first ~0.9 s for layout/paint and
  // leaves audio/lyrics timing clocks completely untouched.
  setTimeout(()=>{requestAnimationFrame(frame);requestAnimationFrame(lyricPulse);},900);
  syncSongOffset();accentFromSong();
})();
