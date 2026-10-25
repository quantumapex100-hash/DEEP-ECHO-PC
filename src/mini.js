const $ = id => document.getElementById(id);
const state = { playing:false, current:0, duration:0, title:'Nothing playing', artist:'', thumbnail:'assets/dinecho-logo.png', theme:'golden', lyric:'', nextLyric:'', playbackRate:1 };
const allowedThemes = new Set(['golden','light','dark','purple','toxic','blood','silver','transparent','fluids','rgb','love','space','nebula']);
let lyricsVisible = localStorage.getItem('deepecho-mini-lyrics-visible') !== '0';
let clock = { baseTime:0, basePerf:performance.now(), playing:false, rate:1 };
let seeking = false;
let seekPreview = 0;
function fmt(sec){ if(!Number.isFinite(sec)) return '0:00'; const m=Math.floor(Math.max(0,sec)/60),s=Math.floor(Math.max(0,sec)%60).toString().padStart(2,'0'); return `${m}:${s}`; }
function liveTime(){return clock.playing ? Math.max(0,clock.baseTime+((performance.now()-clock.basePerf)/1000)*clock.rate) : Math.max(0,clock.baseTime);}
function setLyricsVisible(value){
  lyricsVisible = value !== false;
  localStorage.setItem('deepecho-mini-lyrics-visible', lyricsVisible ? '1' : '0');
  document.body.classList.toggle('mini-lyrics-off', !lyricsVisible);
  const btn=$('miniLyricsToggle'); if(btn){btn.classList.toggle('active',lyricsVisible);btn.setAttribute('aria-pressed',String(lyricsVisible));btn.title=lyricsVisible?'Lyrics ON · click to hide':'Lyrics OFF · click to show';}
}
function renderProgress(){
  const duration=Math.max(0,Number(state.duration)||0);
  const current=duration>0?Math.max(0,Math.min(duration,seeking?seekPreview:liveTime())):0;
  const pct=duration>0?Math.max(0,Math.min(100,current/duration*100)):0;
  $('miniFill').style.width=`${pct}%`;
  document.documentElement.style.setProperty('--mini-progress',`${pct.toFixed(3)}%`);
  const seek=$('miniSeek'); if(seek&&!seeking){seek.max=String(duration>0?duration:1);seek.value=String(current);}
  $('miniTime').textContent=`${fmt(current)} / ${fmt(duration)}`;
}
function render(next={}){
  Object.assign(state,next||{});
  document.body.dataset.theme = allowedThemes.has(state.theme) ? state.theme : 'golden';
  $('miniTitle').textContent = state.title || 'Nothing playing';
  $('miniArtist').textContent = state.artist || '';
  $('miniArt').src = state.thumbnail || 'assets/dinecho-logo.png';
  $('playBtn').textContent = state.playing ? 'Ⅱ' : '▶';
  $('miniLyricCurrent').textContent = state.lyric || (state.title && state.title !== 'Nothing playing' ? 'Lyrics syncing…' : 'Play a song to see lyrics.');
  $('miniLyricNext').textContent = state.nextLyric || '';
  clock={baseTime:Number(state.current)||0,basePerf:performance.now(),playing:!!state.playing,rate:Number(state.playbackRate||1)||1};
  renderProgress();
}
$('back10Btn').onclick = () => window.echoAPI.miniAction('back10');
$('prevBtn').onclick = () => window.echoAPI.miniAction('previous');
$('playBtn').onclick = () => window.echoAPI.miniAction('toggle');
$('nextBtn').onclick = () => window.echoAPI.miniAction('next');
$('forward10Btn').onclick = () => window.echoAPI.miniAction('forward10');
$('closeBtn').onclick = () => window.echoAPI.miniAction('close');
$('miniLyricsToggle').onclick = () => setLyricsVisible(!lyricsVisible);
const miniSeek=$('miniSeek');
miniSeek?.addEventListener('pointerdown',()=>{seeking=true;seekPreview=Number(miniSeek.value)||0;});
miniSeek?.addEventListener('input',()=>{seeking=true;seekPreview=Math.max(0,Math.min(Math.max(0,Number(state.duration)||0),Number(miniSeek.value)||0));renderProgress();});
miniSeek?.addEventListener('change',()=>{const target=Math.max(0,Math.min(Math.max(0,Number(state.duration)||0),Number(miniSeek.value)||0));if(Number(state.duration)>0)window.echoAPI.miniAction(`seek:${target.toFixed(3)}`);clock.baseTime=target;clock.basePerf=performance.now();seeking=false;renderProgress();});
miniSeek?.addEventListener('pointercancel',()=>{seeking=false;renderProgress();});
if(window.echoAPI.onMiniState) window.echoAPI.onMiniState(render);
setLyricsVisible(lyricsVisible);
setInterval(renderProgress,80);
render();
