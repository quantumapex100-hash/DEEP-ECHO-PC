const songEl = document.getElementById('floatingSong');
const curEl = document.getElementById('floatingCurrent');
const nextEl = document.getElementById('floatingNextLine');
const root = document.getElementById('floatingRoot');
const graphCanvas = document.getElementById('floatingGraphCanvas');
const graphBtn = document.getElementById('floatingGraph');
const seekEl = document.getElementById('floatingSeek');
const progressFillEl = document.getElementById('floatingProgressFill');
const progressCurrentEl = document.getElementById('floatingProgressCurrent');
const progressDurationEl = document.getElementById('floatingProgressDuration');
let compact = localStorage.getItem('deepeccho-floating-compact') === '1';
let syncedLines = [];
let romanizedLines = [];
let translatedLines = [];
let pronunciationEnabled = false;
let translationEnabled = false;
let clock = { baseTime: 0, basePerf: performance.now(), playing: false, rate: 1 };
let fallbackState = { current: '', next: '', fallback: 'Lyrics waiting…' };
let clickThrough = false;
let graphEnabled = localStorage.getItem('deepeccho-floating-graph') !== '0';
let graphSpectrum = [];
let graphAudio = { energy:0, vocal:0, bass:0, treble:0, motion:0, aggression:0, hasSignal:false };
let graphDisplay = [];
let graphPeaks = [];
let graphRaf = 0;
let userFontScale = 1;
let overlayScale = 1;
let mediaDuration = 0;
let seekPreview = false;
let seekPreviewTime = 0;
function fmtFloatingTime(sec) {
  const safe = Number.isFinite(Number(sec)) ? Math.max(0, Number(sec)) : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function normalizeFloatingLines(lines = []) {
  if (window.DeepecchoLyricsTimeline?.normalizeTimeline) return window.DeepecchoLyricsTimeline.normalizeTimeline(lines);
  return lines
    .map((line, order)=>({time:Number(line?.time),text:String(line?.text||'').trim(),order}))
    .filter(row=>Number.isFinite(row.time)&&row.time>=0&&row.text)
    .sort((a,b)=>(a.time-b.time)||(a.order-b.order))
    .map(({time,text})=>({time,text}));
}
function floatingActiveIndex(lines, t) {
  if (window.DeepecchoLyricsTimeline?.findActiveIndex) return window.DeepecchoLyricsTimeline.findActiveIndex(lines,t);
  let lo=0, hi=lines.length-1, answer=-1;
  while(lo<=hi){const mid=(lo+hi)>>1;if(lines[mid].time<=t){answer=mid;lo=mid+1;}else hi=mid-1;}
  return answer;
}

function applyCompact() {
  root.classList.toggle('compact', compact);
  document.getElementById('floatingCompact').title = compact ? 'Normal size' : 'Compact mode';
}
applyCompact();

function applyGraphState(value, notify = false) {
  graphEnabled = value !== false;
  localStorage.setItem('deepeccho-floating-graph', graphEnabled ? '1' : '0');
  root.classList.toggle('graph-off', !graphEnabled);
  graphBtn?.classList.toggle('active', graphEnabled);
  graphBtn?.setAttribute('aria-pressed', graphEnabled ? 'true' : 'false');
  if (graphBtn) graphBtn.title = graphEnabled ? 'Audio graph ON · click to hide' : 'Audio graph OFF · click to show';
  if (notify) window.echoAPI?.floatingLyricsAction?.(graphEnabled ? 'graphOn' : 'graphOff');
}
applyGraphState(graphEnabled, false);
graphBtn?.addEventListener('click', () => applyGraphState(!graphEnabled, true));
// Tell the main renderer whether high-rate real-audio graph packets are needed.
queueMicrotask(() => window.echoAPI?.floatingLyricsAction?.(graphEnabled ? 'graphOn' : 'graphOff'));

function applyOverlayScale() {
  const rect = root.getBoundingClientRect();
  // Scale against the original floating-player footprint. Area-based scaling reacts
  // naturally whether the user changes width, height, or both without exploding text.
  const areaScale = Math.sqrt(Math.max(1, rect.width * rect.height) / (760 * 150));
  overlayScale = Math.max(.68, Math.min(1.85, areaScale));
  root.style.setProperty('--fl-overlay-scale', overlayScale.toFixed(4));
  root.style.setProperty('--fl-user-font-scale', Math.max(.8, Math.min(1.5, userFontScale)).toFixed(4));
  return { rect, scale: overlayScale };
}
function resizeGraphCanvas() {
  if (!graphCanvas) return null;
  const { rect, scale } = applyOverlayScale();
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (graphCanvas.width !== w || graphCanvas.height !== h) { graphCanvas.width = w; graphCanvas.height = h; }
  return { rect, dpr, w, h, scale };
}
new ResizeObserver(() => resizeGraphCanvas()).observe(root);
window.addEventListener('resize', resizeGraphCanvas);
function graphSample(values, x) {
  if (!values?.length) return 0;
  const pos = Math.max(0, Math.min(values.length - 1, x * (values.length - 1)));
  const i = Math.floor(pos), f = pos - i;
  return (Number(values[i]) || 0) * (1-f) + (Number(values[Math.min(values.length-1,i+1)]) || 0) * f;
}
function drawFloatingGraph() {
  graphRaf = requestAnimationFrame(drawFloatingGraph);
  if (!graphEnabled || !graphCanvas) return;
  const size = resizeGraphCanvas(); if (!size) return;
  const ctx = graphCanvas.getContext('2d'); if (!ctx) return;
  const {w,h,dpr,rect,scale:overlayGraphScale}=size; ctx.clearRect(0,0,w,h);

  // More width = more real FFT detail. No random/fake bins are generated.
  const points = Math.max(64, Math.min(280, Math.round(rect.width / 4.8)));
  if (graphDisplay.length !== points) graphDisplay = Array(points).fill(0);
  if (graphPeaks.length !== points) graphPeaks = Array(points).fill(0);
  const signal = !!graphAudio?.hasSignal && graphSpectrum.length > 1;
  const energy = Math.max(0,Math.min(1,Number(graphAudio?.energy)||0));
  const vocal = Math.max(0,Math.min(1,Number(graphAudio?.vocal)||0));
  const hit = Math.max(0,Math.min(1,Math.max(Number(graphAudio?.vocalTransient)||0,Number(graphAudio?.transient)||0,Number(graphAudio?.beatPulse)||0)));
  const bass = Math.max(0,Math.min(1,Number(graphAudio?.bass)||0));
  const treble = Math.max(0,Math.min(1,Number(graphAudio?.treble)||0));
  const aggression = Math.max(0,Math.min(1,Number(graphAudio?.aggression)||0));
  const motion = Math.max(0,Math.min(1,Number(graphAudio?.motion)||0));

  // Feed lyric motion from the same analyser packet as the graph.
  const bounce = Math.min(4.8, vocal*1.7 + hit*3.7 + energy*.8);
  const scale = 1 + Math.min(.034, vocal*.010 + hit*.021 + energy*.006);
  root.style.setProperty('--fl-energy', energy.toFixed(3));
  root.style.setProperty('--fl-vocal', vocal.toFixed(3));
  root.style.setProperty('--fl-hit', hit.toFixed(3));
  root.style.setProperty('--fl-bass', bass.toFixed(3));
  root.style.setProperty('--fl-treble', treble.toFixed(3));
  root.style.setProperty('--fl-bounce-y', `${(-bounce).toFixed(2)}px`);
  root.style.setProperty('--fl-bounce-scale', scale.toFixed(4));
  root.style.setProperty('--fl-particle-alpha', (0.16 + vocal*.26 + hit*.44 + treble*.15).toFixed(3));

  for (let i=0;i<points;i++) {
    const raw = signal ? graphSample(graphSpectrum, i/Math.max(1,points-1)) : 0;
    // Gentle perceptual curve, with vocals/presence slightly favoured without faking data.
    const x = i/Math.max(1,points-1);
    const presenceWeight = (x>.20 && x<.72) ? (1 + vocal*.24) : 1;
    const target = Math.max(0,Math.min(1, Math.pow(raw, .86) * presenceWeight * (.84 + aggression*.22)));
    const cur = graphDisplay[i] || 0;
    graphDisplay[i] = cur + (target-cur) * (target>cur ? (.38+hit*.18) : .105);
    graphPeaks[i] = Math.max(graphDisplay[i], (graphPeaks[i]||0) - (.0045 + energy*.0015));
  }

  const accent = getComputedStyle(root).getPropertyValue('--fl-accent').trim() || '#8fdfff';
  const top = h * .14, bottom = h * .88, baseY = h * .72;
  const amp = Math.max(10*dpr*overlayGraphScale, h * (.34 + energy*.12 + vocal*.11 + hit*.08));

  // Professional analyser grid / guides.
  ctx.save();
  ctx.lineWidth=Math.max(.55*dpr*overlayGraphScale,.7);
  ctx.strokeStyle='rgba(255,255,255,.075)';
  ctx.globalAlpha=.65;
  for(let gy=0;gy<4;gy++){
    const y=top+(bottom-top)*(gy/3);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
  }
  ctx.globalAlpha=.42;
  for(let gx=1;gx<10;gx++){
    const x=(gx/10)*w;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();
  }

  // Spectrum bars behind the response curve, similar to pro audio analyzers.
  const barStride = rect.width > 1500 ? 2 : rect.width > 900 ? 3 : 4;
  const barW = Math.max(1*dpr*overlayGraphScale, (w/points)*barStride*.55);
  const barGrad = ctx.createLinearGradient(0,baseY-amp,0,baseY+10*dpr);
  barGrad.addColorStop(0, accent); barGrad.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=barGrad;
  for(let i=0;i<points;i+=barStride){
    const v=Math.pow(graphDisplay[i],.88); if(v<.012) continue;
    const x=(i/(points-1))*w; const bh=v*amp;
    ctx.globalAlpha=.10 + v*.20 + energy*.05;
    ctx.fillRect(x-barW*.5,baseY-bh,barW,bh);
  }

  // Smoothed response curve.
  const pts=[];
  for(let i=0;i<points;i++){
    const x=(i/(points-1))*w; const v=Math.pow(graphDisplay[i],.80); const y=baseY-v*amp;
    pts.push([x,y]);
  }
  const response=new Path2D();
  if(pts.length){
    response.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length-1;i++){
      const mx=(pts[i][0]+pts[i+1][0])*.5, my=(pts[i][1]+pts[i+1][1])*.5;
      response.quadraticCurveTo(pts[i][0],pts[i][1],mx,my);
    }
    response.lineTo(pts.at(-1)[0],pts.at(-1)[1]);
  }
  ctx.lineJoin='round';ctx.lineCap='round';
  ctx.strokeStyle=accent; ctx.globalAlpha=.17+energy*.10; ctx.lineWidth=4*dpr*overlayGraphScale; ctx.filter=`blur(${2.1*dpr*overlayGraphScale}px)`; ctx.stroke(response);
  ctx.filter='none';ctx.globalAlpha=.72+energy*.18;ctx.lineWidth=Math.max(1*dpr*overlayGraphScale,1.25*dpr*overlayGraphScale);ctx.stroke(response);

  // Translucent area fill under the curve.
  const fill=new Path2D(response); fill.lineTo(w,baseY); fill.lineTo(0,baseY); fill.closePath();
  const fillGrad=ctx.createLinearGradient(0,top,0,baseY); fillGrad.addColorStop(0,accent); fillGrad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha=.055+energy*.05+vocal*.025;ctx.fillStyle=fillGrad;ctx.fill(fill);

  // Peak-hold dots: useful analyzer detail, derived only from measured FFT peaks.
  ctx.fillStyle=accent;
  const peakStride = rect.width > 1200 ? 8 : 12;
  for(let i=0;i<points;i+=peakStride){
    const pv=Math.pow(graphPeaks[i]||0,.82); if(pv<.08) continue;
    const x=(i/(points-1))*w, y=baseY-pv*amp;
    ctx.globalAlpha=.28+pv*.42+hit*.16;ctx.beginPath();ctx.arc(x,y,Math.max(.65*dpr*overlayGraphScale,1.05*dpr*overlayGraphScale),0,Math.PI*2);ctx.fill();
  }

  // Thin mirrored trace adds depth and keeps the graph readable behind lyrics.
  ctx.beginPath();
  for(let i=0;i<points;i++){
    const x=(i/(points-1))*w, y=baseY+Math.pow(graphDisplay[i],.9)*amp*.22;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.globalAlpha=.12+motion*.07;ctx.lineWidth=.7*dpr*overlayGraphScale;ctx.strokeStyle=accent;ctx.stroke();
  ctx.restore();
}
drawFloatingGraph();

const clickThroughBtn = document.getElementById('floatingClickThroughBtn');
function applyClickThroughState(value) {
  clickThrough = !!value;
  root.classList.toggle('click-through-active', clickThrough);
  if (clickThroughBtn) {
    clickThroughBtn.classList.toggle('active', clickThrough);
    clickThroughBtn.setAttribute('aria-pressed', clickThrough ? 'true' : 'false');
    clickThroughBtn.title = clickThrough ? 'Click-through ON · Ctrl+Alt+X to turn OFF' : 'Click-through OFF · Ctrl+Alt+X';
  }
}
window.echoAPI?.onFloatingLyricsClickThroughState?.((state = {}) => applyClickThroughState(!!state.enabled));
window.echoAPI?.getFloatingLyricsClickThrough?.().then?.((state) => applyClickThroughState(!!state?.enabled)).catch?.(()=>{});

function estimatedPlaybackTime() {
  if (!clock.playing) return clock.baseTime;
  return Math.max(0, clock.baseTime + ((performance.now() - clock.basePerf) / 1000) * clock.rate);
}

function escapeFloating(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function languageLineAt(lines,index){
  if(!Array.isArray(lines)||index<0)return '';
  const direct=lines[index]?.text; if(direct)return String(direct);
  return '';
}
function paintFloatingCurrent(main,index){
  const subs=[];
  if(pronunciationEnabled){const text=languageLineAt(romanizedLines,index);if(text)subs.push(`<span class="floating-language-sub pronunciation">${escapeFloating(text)}</span>`);}
  if(translationEnabled){const text=languageLineAt(translatedLines,index);if(text)subs.push(`<span class="floating-language-sub translation">${escapeFloating(text)}</span>`);}
  curEl.innerHTML=`<span class="floating-main-line">${escapeFloating(main||'♪')}</span>${subs.join('')}`;
}

function renderSyncedLyrics() {
  if (!syncedLines.length) {
    paintFloatingCurrent(fallbackState.current || fallbackState.fallback || 'Lyrics waiting…', -1);
    nextEl.textContent = fallbackState.next || '';
    return;
  }
  const t = estimatedPlaybackTime();
  const index = floatingActiveIndex(syncedLines, t);
  const main=index >= 0 ? (syncedLines[index]?.text || '♪') : (fallbackState.current || syncedLines[0]?.text || 'Lyrics syncing…');
  paintFloatingCurrent(main,index >= 0 ? index : 0);
  nextEl.textContent = index >= 0 ? (syncedLines[index + 1]?.text || '') : (syncedLines[1]?.text || '');
}

function renderFloatingProgress() {
  const duration = Math.max(0, Number(mediaDuration) || 0);
  const liveTime = seekPreview ? seekPreviewTime : estimatedPlaybackTime();
  const current = duration > 0 ? Math.max(0, Math.min(duration, liveTime)) : Math.max(0, liveTime);
  const pct = duration > 0 ? Math.max(0, Math.min(100, current / duration * 100)) : 0;
  if (progressFillEl) progressFillEl.style.width = `${pct}%`;
  if (seekEl && !seekPreview) {
    seekEl.max = String(duration > 0 ? duration : 1);
    seekEl.value = String(duration > 0 ? current : 0);
  }
  if (progressCurrentEl) progressCurrentEl.textContent = fmtFloatingTime(current);
  if (progressDurationEl) progressDurationEl.textContent = fmtFloatingTime(duration);
  root.style.setProperty('--fl-progress', `${pct.toFixed(3)}%`);
}

seekEl?.addEventListener('pointerdown', () => {
  seekPreview = true;
  seekPreviewTime = Number(seekEl.value) || 0;
});
seekEl?.addEventListener('input', () => {
  seekPreview = true;
  seekPreviewTime = Math.max(0, Math.min(Math.max(0, mediaDuration || 0), Number(seekEl.value) || 0));
  renderFloatingProgress();
});
seekEl?.addEventListener('change', () => {
  const target = Math.max(0, Math.min(Math.max(0, mediaDuration || 0), Number(seekEl.value) || 0));
  if (mediaDuration > 0) window.echoAPI?.floatingLyricsAction?.(`seek:${target.toFixed(3)}`);
  clock.baseTime = target;
  clock.basePerf = performance.now();
  seekPreview = false;
  renderFloatingProgress();
});
seekEl?.addEventListener('pointercancel', () => { seekPreview = false; renderFloatingProgress(); });

window.echoAPI?.onFloatingLyricsState?.((state = {}) => {
  document.body.dataset.theme = state.theme || 'golden';
  songEl.textContent = [state.title, state.artist].filter(Boolean).join(' · ') || 'DEEP-ECHO Lyrics';
  fallbackState = { current: state.current || '', next: state.next || '', fallback: state.fallback || 'Lyrics waiting…' };
  if (Array.isArray(state.lines)) syncedLines = normalizeFloatingLines(state.lines);
  if (Array.isArray(state.romanizedLines)) romanizedLines = state.romanizedLines.map(x=>({time:Number(x?.time)||0,text:String(x?.text||'')}));
  if (Array.isArray(state.translatedLines)) translatedLines = state.translatedLines.map(x=>({time:Number(x?.time)||0,text:String(x?.text||'')}));
  pronunciationEnabled=!!state.pronunciationEnabled; translationEnabled=!!state.translationEnabled;
  root.classList.toggle('pronunciation-on',pronunciationEnabled);root.classList.toggle('translation-on',translationEnabled);
  if (Array.isArray(state.spectrum)) graphSpectrum = state.spectrum.map(v=>Math.max(0,Math.min(1,Number(v)||0)));
  if (state.audioGraph && typeof state.audioGraph === 'object') graphAudio = { ...graphAudio, ...state.audioGraph };
  clock = { baseTime: Number(state.playbackTime || 0), basePerf: performance.now(), playing: !!state.playing, rate: Number(state.playbackRate || 1) || 1 };
  mediaDuration = Math.max(0, Number(state.duration || mediaDuration || 0));
  userFontScale = Math.max(.8, Math.min(1.5, Number(state.fontScale) || 1));
  applyOverlayScale();
  renderSyncedLyrics();
  renderFloatingProgress();
});

setInterval(() => { renderSyncedLyrics(); renderFloatingProgress(); }, 80);

const action = (id, name) => document.getElementById(id)?.addEventListener('click', () => window.echoAPI.floatingLyricsAction(name));
action('floatingBack10', 'back10');
action('floatingPrev', 'previous');
action('floatingPlay', 'playPause');
action('floatingNext', 'next');
action('floatingForward10', 'forward10');
action('floatingClose', 'close');
clickThroughBtn?.addEventListener('click', async () => {
  const result = await window.echoAPI.toggleFloatingLyricsClickThrough?.();
  if (result && typeof result.enabled === 'boolean') applyClickThroughState(result.enabled);
});
document.getElementById('floatingCompact')?.addEventListener('click', () => {
  compact = !compact;
  localStorage.setItem('deepeccho-floating-compact', compact ? '1' : '0');
  applyCompact();
  window.echoAPI.floatingLyricsAction(compact ? 'compactOn' : 'compactOff');
});
