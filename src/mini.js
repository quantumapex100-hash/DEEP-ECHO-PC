const $ = id => document.getElementById(id);
const state = { playing:false, current:0, duration:0, title:'Nothing playing', artist:'', thumbnail:'assets/dinecho-logo.png', theme:'golden' };
const allowedThemes = new Set(['golden','light','dark','purple','toxic','blood','silver','transparent','fluids','rgb','love','space']);
function fmt(sec){ if(!Number.isFinite(sec)) return '0:00'; const m=Math.floor(sec/60),s=Math.floor(sec%60).toString().padStart(2,'0'); return `${m}:${s}`; }
function render(next={}){
  Object.assign(state,next||{});
  document.body.dataset.theme = allowedThemes.has(state.theme) ? state.theme : 'golden';
  $('miniTitle').textContent = state.title || 'Nothing playing';
  $('miniArtist').textContent = state.artist || '';
  $('miniArt').src = state.thumbnail || 'assets/dinecho-logo.png';
  $('playBtn').textContent = state.playing ? 'Ⅱ' : '▶';
  const pct = state.duration > 0 ? Math.max(0,Math.min(100,state.current/state.duration*100)) : 0;
  $('miniFill').style.width = `${pct}%`;
  $('miniTime').textContent = `${fmt(state.current)} / ${fmt(state.duration)}`;
}
$('back10Btn').onclick = () => window.echoAPI.miniAction('back10');
$('prevBtn').onclick = () => window.echoAPI.miniAction('previous');
$('playBtn').onclick = () => window.echoAPI.miniAction('toggle');
$('nextBtn').onclick = () => window.echoAPI.miniAction('next');
$('forward10Btn').onclick = () => window.echoAPI.miniAction('forward10');
$('closeBtn').onclick = () => window.echoAPI.miniAction('close');
if(window.echoAPI.onMiniState) window.echoAPI.onMiniState(render);
render();
