(() => {
  'use strict';
  const body = document.getElementById('lyricsBody');
  const bridge = () => window.__deepechoV18Bridge;
  if (!body || !window.echoAPI?.findLyricsCompatibleVersion) return;

  const state = { serial:0, songKey:'', result:null, probing:false, lastFailureKey:'' };
  const songKey = song => String(song?.id || song?.url || `${song?.title||''}|${song?.channel||''}`);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = msg => { try { bridge()?.showToast?.(msg); } catch {} };

  function failureHost() { return body.querySelector('.lyrics-exact-fallback'); }
  function panel() { return body.querySelector('.v21-lyrics-recovery'); }
  function ensurePanel() {
    const host = failureHost(); if (!host) return null;
    let root = host.querySelector('.v21-lyrics-recovery');
    if (root) return root;
    root = document.createElement('div');
    root.className = 'v21-lyrics-recovery';
    root.innerHTML = `
      <div class="v21-recovery-copy">
        <strong>DeepEcho can try another route.</strong>
        <span class="v21-recovery-status">Finding a lyrics-ready route…</span>
      </div>
      <button type="button" class="v21-recovery-button" data-v21-recovery>✨ Find a version with lyrics</button>
      <small>Same song only · queue and your next track stay intact.</small>`;
    host.appendChild(root);
    root.querySelector('[data-v21-recovery]')?.addEventListener('click', () => runOrSwitch(true));
    return root;
  }
  function setUi({status, label, busy=false, ready=false, failed=false}={}) {
    const root=ensurePanel(); if(!root)return;
    const statusEl=root.querySelector('.v21-recovery-status'), btn=root.querySelector('[data-v21-recovery]');
    if(statusEl && status!=null)statusEl.textContent=status;
    if(btn){
      if(label)btn.textContent=label;
      btn.disabled=!!busy;
      btn.classList.toggle('is-ready',!!ready);
      btn.classList.toggle('is-failed',!!failed);
    }
    root.classList.toggle('is-busy',!!busy);
  }

  async function applyCurrentRepair(result, serial, identity) {
    if(serial!==state.serial || songKey(bridge()?.getSong?.())!==identity || !result?.lyrics)return false;
    const applied=bridge()?.applyLyricsPayload?.(result.lyrics);
    if(!applied)return false;
    setUi({status:'Synced lyrics recovered for this video.',label:'✓ Lyrics recovered',ready:true});
    toast('Lyrics recovered · same video kept playing');
    // Keep the recovered text visible immediately; Precision Sync may improve timing in background.
    setTimeout(()=>{ if(serial===state.serial && songKey(bridge()?.getSong?.())===identity) bridge()?.requestPrecision?.().catch?.(()=>{}); },180);
    return true;
  }

  async function probe(force=false) {
    const song=bridge()?.getSong?.(); if(!song)return null;
    const identity=songKey(song); const failure=!!failureHost();
    if(!failure && !force)return null;
    if(state.probing && state.songKey===identity)return state.result;
    if(!force && state.lastFailureKey===identity && state.result)return state.result;
    const serial=++state.serial; state.songKey=identity; state.result=null; state.probing=true; state.lastFailureKey=identity;
    setUi({status:'Finding lyrics for this song and checking compatible versions…',label:'Searching…',busy:true});
    try {
      const result=await window.echoAPI.findLyricsCompatibleVersion(song,{preview:true});
      if(serial!==state.serial || songKey(bridge()?.getSong?.())!==identity)return null;
      state.result=result;
      if(result?.cancelled)return null;
      if(result?.success && result.mode==='current-repair'){
        await applyCurrentRepair(result,serial,identity);
        return result;
      }
      if(result?.success && result.candidate){
        const verified=result.verification==='video-captions'?'timed video captions':'synced lyrics provider';
        setUi({status:`Working same-song version found · verified by ${verified}.`,label:'▶ Play lyrics-ready version',ready:true});
        return result;
      }
      setUi({status:result?.error||'No verified same-song version found right now. Exact Lyrics is still available.',label:'↻ Try again',failed:true});
      return result;
    } catch (error) {
      if(serial!==state.serial)return null;
      const msg=String(error?.message||error||'Lyrics recovery failed');
      setUi({status:msg,label:'↻ Try again',failed:true});
      return null;
    } finally {
      if(serial===state.serial)state.probing=false;
    }
  }

  async function runOrSwitch(force=false) {
    const song=bridge()?.getSong?.(); if(!song)return;
    const identity=songKey(song);
    let result=state.songKey===identity ? state.result : null;
    if(!result?.success || (result.mode!=='switch' && result.mode!=='current-repair')) result=await probe(true);
    if(!result || songKey(bridge()?.getSong?.())!==identity)return;
    if(result.mode==='current-repair') { await applyCurrentRepair(result,state.serial,identity); return; }
    if(!result.candidate)return;
    setUi({status:`Switching to ${result.candidate.title}…`,label:'Switching…',busy:true});
    const serial=++state.serial;
    try {
      const started=await bridge()?.switchToLyricsVersion?.(result.candidate);
      if(!started){
        if(serial===state.serial)setUi({status:'That version could not start. Try again or use Exact Lyrics.',label:'↻ Find another version',failed:true});
        state.result=null; return;
      }
      state.result=null; state.lastFailureKey='';
    } catch (error) {
      if(serial===state.serial)setUi({status:String(error?.message||error),label:'↻ Find another version',failed:true});
      state.result=null;
    }
  }

  window.echoAPI.onLyricsRecoveryStatus?.(status => {
    const song=bridge()?.getSong?.(); if(!song || (status?.songId && String(status.songId)!==String(song.id)))return;
    if(!failureHost())return;
    if(status?.text)setUi({status:String(status.text),label:state.result?.candidate?'▶ Play lyrics-ready version':'Searching…',busy:!['ready','repaired','none','failed'].includes(String(status.stage||'')),ready:status.stage==='ready'||status.stage==='repaired',failed:status.stage==='none'||status.stage==='failed'});
  });

  let timer=0;
  const observer=new MutationObserver(()=>{
    clearTimeout(timer);
    timer=setTimeout(()=>{
      const host=failureHost();
      if(!host)return;
      ensurePanel();
      const identity=songKey(bridge()?.getSong?.());
      if(identity && state.songKey!==identity){state.serial++;state.songKey=identity;state.result=null;state.probing=false;state.lastFailureKey='';}
      if(identity && state.lastFailureKey!==identity)probe(false);
    },18);
  });
  observer.observe(body,{childList:true,subtree:true});
  if(failureHost()){ensurePanel();probe(false);}
})();
