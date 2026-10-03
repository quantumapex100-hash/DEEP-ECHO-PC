(() => {
  'use strict';
  const $=id=>document.getElementById(id), bridge=()=>window.__deepechoV18Bridge;
  const state={translation:false,pronunciation:false,target:localStorage.getItem('deepecho-v18-translate-lang')||'en',syncLine:null,karaoke:localStorage.getItem('deepecho-v18-karaoke-mode')||'original',karaokeSong:'',translationBusy:false};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uniq=items=>{const m=new Map();for(const x of items||[])if(x?.id&&!m.has(x.id))m.set(x.id,x);return [...m.values()];};
  function parseLrc(v=''){const out=[];for(const raw of String(v||'').split(/\r?\n/)){const m=raw.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);if(m)out.push({time:Number(m[1])*60+Number(m[2]),text:m[3].trim()});else if(raw.trim())out.push({time:null,text:raw.trim()});}return out;}
  function plainLines(v=''){return String(v||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(text=>({time:null,text}));}
  function linesFor(payload,keySynced,keyPlain){return payload?.[keySynced]?parseLrc(payload[keySynced]):plainLines(payload?.[keyPlain]||'');}
  function toast(msg){try{bridge()?.showToast(msg)}catch{}}
  const songKey=s=>String(s?.id||s?.url||`${s?.title||''}|${s?.channel||''}`);
  let sourceLoadSerial=0,translationSerial=0,lastPayloadSongKey='';

  // ---------- Ask DeepEcho ----------
  const searchBox=document.querySelector('.search-box');
  const askBtn=document.createElement('button');askBtn.id='v18AskBtn';askBtn.type='button';askBtn.className='v18-ask-btn';askBtn.innerHTML='<span>✦</span> Ask DeepEcho';searchBox?.appendChild(askBtn);
  const askModal=document.createElement('div');askModal.id='v18AskModal';askModal.className='v18-modal hidden';askModal.innerHTML=`<div class="v18-modal-card v18-ask-card"><button class="v18-modal-x" data-v18-close="ask">×</button><div class="v18-kicker">SMART MUSIC REQUEST</div><h2>Ask DeepEcho</h2><p class="v18-sub">Mood, artist, language, era ya activity normal language mein bolo. DeepEcho playable mix banayega.</p><textarea id="v18AskInput" rows="3" placeholder="Example: Arijit ke emotional songs but bahut slow nahi"></textarea><div class="v18-chip-row"><button data-v18-prompt="late night gaming ke liye dark English tracks">Late-night gaming</button><button data-v18-prompt="2000s Bollywood romantic songs">2000s Bollywood</button><button data-v18-prompt="mere liked songs jaisa kuch naya">Like my taste</button><button data-v18-prompt="gym ke liye aggressive Hindi English mix">Gym mix</button></div><div class="v18-modal-actions"><span id="v18AskStatus">Ready</span><button id="v18AskGo" class="hero-btn">Build Mix</button></div></div>`;document.body.appendChild(askModal);
  const askInput=$('v18AskInput'),askStatus=$('v18AskStatus'),askGo=$('v18AskGo');
  const STOP=new Set('ke ki ka ko mein mai me liye aur but wala wali wale kuch mujhe mere mera jaisa songs song music tracks track please chalao chala do bana mix with for the a an to of is are'.split(' '));
  function tokens(v){return String(v||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').split(/\s+/).filter(x=>x.length>1&&!STOP.has(x));}
  function inferQueries(prompt){
    const p=String(prompt||'').trim(),t=tokens(p),queries=[p];
    const mood=t.filter(x=>['sad','emotional','romantic','love','dark','aggressive','chill','calm','happy','party','gaming','gym','workout','study','focus','night','lofi','rock','rap','bollywood','punjabi','hindi','english','korean','japanese'].includes(x));
    const years=p.match(/(?:19|20)\d{2}(?:\s*[-–]\s*(?:19|20)\d{2})?/g)||[];
    const compact=[...new Set([...t.slice(0,7),...mood,...years])].join(' '); if(compact&&compact.toLowerCase()!==p.toLowerCase())queries.push(`${compact} songs`);
    const taste=bridge()?.getTaste?.(); if(/liked|taste|pasand|jaisa|similar|mere/i.test(p)&&taste?.liked?.length){for(const seed of taste.liked.slice(0,2))queries.push(`${seed.title} ${seed.channel||''} similar songs`);}
    return [...new Set(queries)].slice(0,4);
  }
  function scoreAsk(song,prompt,taste){
    const hay=`${song.title||''} ${song.channel||''}`.toLowerCase(),wanted=tokens(prompt);let score=0;
    for(const t of wanted)if(hay.includes(t))score+=1.4;
    const asksVariant=/remix|live|cover|slowed|reverb|karaoke|instrumental/i.test(prompt);if(!asksVariant&&/\b(live|remix|cover|slowed|reverb|nightcore|8d|karaoke|instrumental)\b/i.test(hay))score-=3.2;
    if(/official lyrics?|lyrical/i.test(hay))score+=.7;if(/official audio|topic/i.test(hay))score+=.35;
    const likedArtists=new Set((taste?.liked||[]).map(x=>String(x.channel||'').toLowerCase()).filter(Boolean));if(likedArtists.has(String(song.channel||'').toLowerCase()))score+=.8;
    return score;
  }
  async function runAsk(){
    const prompt=askInput?.value.trim();if(!prompt)return;askGo.disabled=true;askStatus.textContent='Understanding request…';
    try{const qs=inferQueries(prompt);askStatus.textContent='Finding songs…';const settled=await Promise.allSettled(qs.map(q=>window.echoAPI.search(q)));let rows=[];for(const r of settled)if(r.status==='fulfilled'&&Array.isArray(r.value))rows.push(...r.value);rows=uniq(rows);const taste=bridge()?.getTaste?.();rows.sort((a,b)=>scoreAsk(b,prompt,taste)-scoreAsk(a,prompt,taste));rows=rows.slice(0,28);bridge()?.renderSearchResults(rows,`Ask DeepEcho · ${prompt}`,`${rows.length} playable picks · refined from ${qs.length} search signals`);askModal.classList.add('hidden');toast(`Ask DeepEcho mix ready · ${rows.length} songs`);}catch(e){askStatus.textContent='Could not build mix';toast(`Ask DeepEcho: ${e.message}`);}finally{askGo.disabled=false;}
  }
  askBtn.onclick=()=>{askModal.classList.remove('hidden');setTimeout(()=>askInput?.focus(),20)};askGo.onclick=runAsk;askInput?.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();runAsk();}});askModal.addEventListener('click',e=>{const p=e.target.closest('[data-v18-prompt]');if(p)askInput.value=p.dataset.v18Prompt;if(e.target.dataset.v18Close==='ask'||e.target===askModal)askModal.classList.add('hidden');});

  // ---------- Source Inspector + Sync Lab ----------
  const toolRow=document.querySelector('.lyrics-tool-row');
  const sourceBtn=document.createElement('button');sourceBtn.id='v18SourceBtn';sourceBtn.type='button';sourceBtn.className='lyrics-fx-toggle v18-source-btn';sourceBtn.innerHTML='<span>Source + Sync</span><strong>AUTO</strong>';toolRow?.insertBefore(sourceBtn,$('exactLyricsControl')||null);
  const sourceModal=document.createElement('div');sourceModal.id='v18SourceModal';sourceModal.className='v18-modal hidden';sourceModal.innerHTML=`<div class="v18-modal-card v18-source-card"><button class="v18-modal-x" data-v18-close="source">×</button><div class="v18-kicker">LYRICS RELIABILITY</div><h2>Source Inspector + Sync Lab</h2><div id="v18CurrentSource" class="v18-current-source"></div><div class="v18-lab-grid"><section><h3>Available Sources</h3><div id="v18Sources" class="v18-source-list"><p class="hint">Open to load providers.</p></div></section><section><h3>Sync Lab</h3><div id="v18PickedLine" class="v18-picked-line">No line selected</div><div class="v18-sync-actions"><button id="v18PickLine">Pick lyric line</button><button id="v18SyncNow">Sync line to NOW</button><button id="v18NudgeEarly">From line −0.1s</button><button id="v18NudgeLate">From line +0.1s</button><button id="v18Realign">Auto Re-align</button><button id="v18ResetSection">Reset section correction</button></div><p class="v18-sub">Section correction sirf selected line se aage apply hoti hai; repeated chorus ke earlier occurrence ko touch nahi karti.</p></section></div></div>`;document.body.appendChild(sourceModal);
  const sourceList=$('v18Sources'),currentSource=$('v18CurrentSource'),pickedLine=$('v18PickedLine');let picking=false;
  function syncSourceHeader(){const p=bridge()?.getLyrics?.(),s=bridge()?.getSong?.();currentSource.innerHTML=`<strong>${esc(p?.source||'No lyrics loaded')}</strong><span>${esc(s?.title||'Nothing playing')}</span><em>${esc(p?.timingPrecision||'unknown timing')} · confidence ${Number(p?.timingConfidence||0)?Math.round(Number(p.timingConfidence)*100)+'%':'n/a'}</em>`;}
  async function loadSources(){
    const serial=++sourceLoadSerial;syncSourceHeader();
    sourceList.innerHTML='<p class="hint">Checking YouLyPlus, PaxSenix, BetterLyrics, Unison, SimpMusic, LRCLIB & KuGou…</p>';
    const song=bridge()?.getSong?.();if(!song){sourceList.innerHTML='<p class="hint">Play a song first.</p>';return;}
    const requestedSongKey=songKey(song);
    const rows=await window.echoAPI.getLyricsAlternatives(song);
    if(serial!==sourceLoadSerial||songKey(bridge()?.getSong?.())!==requestedSongKey)return;
    if(!Array.isArray(rows)){sourceList.innerHTML=`<p class="hint">${esc(rows?.error||'Sources unavailable')}</p>`;return;}
    sourceList.innerHTML='';
    for(const row of rows){
      const b=document.createElement('button');b.className='v18-source-option';
      b.innerHTML=`<span><strong>${esc(row.source)}</strong><small>${esc(row.syncKind||'lyrics')} sync · ${esc(row.confidence||'')}</small></span><em>Use</em>`;
      b.onclick=async()=>{
        if(songKey(bridge()?.getSong?.())!==requestedSongKey){toast('Song changed · refresh lyric sources');return;}
        bridge()?.applyLyricsPayload?.(row);syncSourceHeader();toast(`${row.source} selected · Precision Sync checking this video`);
        try{await bridge()?.requestPrecision?.();}catch{}
      };
      sourceList.appendChild(b);
    }
    if(!rows.length)sourceList.innerHTML='<p class="hint">No alternate provider responded right now.</p>';
  }
  sourceBtn.onclick=()=>{sourceModal.classList.remove('hidden');loadSources().catch(e=>{sourceList.innerHTML=`<p class="hint">${esc(e?.message||'Sources unavailable')}</p>`;});};sourceModal.addEventListener('click',e=>{if(e.target.dataset.v18Close==='source'||e.target===sourceModal){sourceLoadSerial++;sourceModal.classList.add('hidden');picking=false;document.body.classList.remove('v18-pick-line');}});
  $('v18PickLine').onclick=()=>{picking=true;document.body.classList.add('v18-pick-line');pickedLine.textContent='Click the lyric line you want to anchor…';sourceModal.classList.add('v18-soft-hidden');};
  $('lyricsBody')?.addEventListener('click',e=>{if(!picking)return;const line=e.target.closest('.lyric-line[data-line]');if(!line)return;e.preventDefault();e.stopImmediatePropagation();state.syncLine=Number(line.dataset.line);const data=bridge()?.getLyricLine?.(state.syncLine);pickedLine.textContent=`Line ${state.syncLine+1}: ${data?.text||''}`;picking=false;document.body.classList.remove('v18-pick-line');sourceModal.classList.remove('v18-soft-hidden');},{capture:true});
  function chosen(){const active=bridge()?.getActiveLyric?.();const index=Number.isFinite(state.syncLine)?state.syncLine:active?.index;return {index,line:bridge()?.getLyricLine?.(index),active};}
  $('v18SyncNow').onclick=()=>{const c=chosen();if(!c.line||c.index<0){toast('Pick a lyric line first');return;}const out=bridge()?.applySectionSync?.(c.index,c.active?.time||0);if(out){pickedLine.textContent=`Saved · from line ${c.index+1} ${out.delta>=0?'+':''}${out.delta.toFixed(2)}s`;toast('Section sync saved for this video/source');}};
  function nudge(ms){const c=chosen();if(!c.line){toast('Pick a lyric line first');return;}bridge()?.applySectionSync?.(c.index,Number(c.line.time)+(ms/1000));pickedLine.textContent=`Adjusted from line ${c.index+1} · ${ms>0?'+':''}${(ms/1000).toFixed(1)}s`;}
  $('v18NudgeEarly').onclick=()=>nudge(-100);$('v18NudgeLate').onclick=()=>nudge(100);$('v18Realign').onclick=async()=>{pickedLine.textContent='Running Precision Sync…';try{const r=await bridge()?.requestPrecision?.();pickedLine.textContent=r?.syncedLyrics?'Auto Re-align applied':'No stronger automatic map found';}catch(e){pickedLine.textContent='Auto Re-align failed';toast(`Precision Sync: ${e?.message||e}`);}syncSourceHeader();};$('v18ResetSection').onclick=()=>{bridge()?.resetSectionSync?.();pickedLine.textContent='Section correction cleared · base timeline restored';toast('Section correction cleared');};

  // ---------- Translation + Pronunciation as synchronized sub-lines ----------
  const translateBtn=$('lyricsTranslationToggle'),pronBtn=$('lyricsOriginalToggle');
  if(pronBtn)pronBtn.textContent='Pronunciation';
  const lang=document.createElement('select');lang.id='v18TranslateLang';lang.className='v18-language-select';lang.innerHTML='<option value="en">English</option><option value="hi">Hindi</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="pt">Portuguese</option><option value="ja">Japanese</option><option value="ko">Korean</option><option value="ar">Arabic</option><option value="ur">Urdu</option><option value="pa">Punjabi</option><option value="bn">Bengali</option>';lang.value=state.target;translateBtn?.after(lang);lang.onchange=()=>{state.target=lang.value;localStorage.setItem('deepecho-v18-translate-lang',state.target);if(state.translation){state.translation=false;toggleTranslation();}};
  function languageSurfacePayload(){
    const payload=bridge()?.getLyrics?.()||{};
    return {
      pronunciationEnabled:!!state.pronunciation,
      translationEnabled:!!state.translation,
      targetLanguage:state.target,
      romanizedLines:linesFor(payload,'romanizedSyncedLyrics','romanizedLyrics').map(x=>({time:x.time,text:x.text})),
      translatedLines:linesFor(payload,'translatedSyncedLyrics','translatedLyrics').map(x=>({time:x.time,text:x.text}))
    };
  }
  window.__deepechoV18GetLanguageOverlayPayload=languageSurfacePayload;
  function decorateRoot(root,trans){
    root?.querySelectorAll('.lyric-line[data-line]').forEach((line,i)=>{
      line.querySelectorAll('.v18-lyric-sub').forEach(x=>x.remove());
      // Pronunciation is a replacement display mode, never a second/overlapping subtitle line.
      if(!state.pronunciation&&state.translation&&trans[i]?.text){const sub=document.createElement('span');sub.className='v18-lyric-sub v18-translation';sub.textContent=trans[i].text;line.appendChild(sub);}
    });
  }
  function decorateSubLines(){
    const payload=bridge()?.getLyrics?.();if(!payload)return;
    const hasRoman=!!(payload.romanizedLyrics||payload.romanizedSyncedLyrics);
    const pronunciationActive=!!state.pronunciation&&hasRoman;
    bridge()?.setPronunciationDisplay?.(pronunciationActive);
    document.body.classList.toggle('pronunciation-display-only',pronunciationActive);
    const trans=linesFor(payload,'translatedSyncedLyrics','translatedLyrics');
    decorateRoot(document.getElementById('lyricsBody'),trans);
    // The in-app Immersive Player mirrors the same replacement text state.
    decorateRoot(document.getElementById('immersiveLyricsBody'),trans);
    pronBtn?.classList.toggle('active',pronunciationActive);translateBtn?.classList.toggle('active',state.translation&&!pronunciationActive);if(translateBtn)translateBtn.textContent=state.translation&&!pronunciationActive?'Translation ✓':'Translate';if(pronBtn)pronBtn.textContent=pronunciationActive?'Pronunciation ✓':'Pronunciation';
    window.__deepecchoPushFloatingLyrics?.(true);
  }
  async function toggleTranslation(){
    const payload=bridge()?.getLyrics?.();if(!payload)return;
    if(state.translation){translationSerial++;state.translation=false;decorateSubLines();syncLanguageControls();return;}
    if(state.translationBusy)return;
    // Translation and Pronunciation are exclusive presentation modes.
    if(state.pronunciation){state.pronunciation=false;bridge()?.setPronunciationDisplay?.(false);}
    const requestedSongKey=songKey(bridge()?.getSong?.()),serial=++translationSerial;
    let next=payload;const has=payload.translatedLyrics&&payload.translationLanguage===state.target;
    if(!has){
      state.translationBusy=true;if(translateBtn){translateBtn.disabled=true;translateBtn.textContent='Translating…';}
      try{
        next=await window.echoAPI.translateLyrics(payload,state.target);
        if(serial!==translationSerial||songKey(bridge()?.getSong?.())!==requestedSongKey)return;
        if(next?.error)throw new Error(next.error);
        bridge()?.applyLyricsPayload?.(next);
      }catch(e){
        if(serial===translationSerial)toast(e.message);
        return;
      }finally{
        if(serial===translationSerial){state.translationBusy=false;syncLanguageControls();}
      }
    }
    if(serial!==translationSerial||songKey(bridge()?.getSong?.())!==requestedSongKey)return;
    state.translation=true;decorateSubLines();syncLanguageControls();
  }
  function togglePron(){
    const p=bridge()?.getLyrics?.();if(!p?.romanizedLyrics&&!p?.romanizedSyncedLyrics){toast('Pronunciation is not available for this script yet');return;}
    const next=!state.pronunciation;
    if(next){translationSerial++;state.translation=false;state.translationBusy=false;}
    state.pronunciation=next;
    bridge()?.setPronunciationDisplay?.(state.pronunciation);
    decorateSubLines();syncLanguageControls();
  }
  function syncLanguageControls(){const p=bridge()?.getLyrics?.();if(translateBtn)translateBtn.disabled=!p?.lyrics&&!p?.syncedLyrics;if(pronBtn)pronBtn.disabled=!p?.romanizedLyrics&&!p?.romanizedSyncedLyrics;decorateSubLines();}
  translateBtn?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();toggleTranslation();},{capture:true});pronBtn?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();togglePron();},{capture:true});

  // ---------- Karaoke audio modes ----------
  const karaokeBtn=$('v170KaraokeToggle');
  const karaokeSelect=document.createElement('select');karaokeSelect.id='v18KaraokeMode';karaokeSelect.className='v18-karaoke-select';karaokeSelect.innerHTML='<option value="original">Karaoke: Original audio</option><option value="practice">Practice · vocals normal</option><option value="vocal-low">Vocals Low · local</option><option value="instrumental">Instrumental · center reduction</option>';karaokeSelect.value=state.karaoke;karaokeBtn?.after(karaokeSelect);
  let karaokeSerial=0;
  async function applyKaraokeMode(mode,force=false){
    const serial=++karaokeSerial;
    state.karaoke=mode;localStorage.setItem('deepecho-v18-karaoke-mode',mode);const b=bridge(),song=b?.getSong?.();
    if(mode==='original'){state.karaokeSong='';b?.restoreKaraokeSource?.();document.body.classList.remove('v18-karaoke-processing');return;}
    if(karaokeBtn?.getAttribute('aria-pressed')!=='true')karaokeBtn?.click();
    if(mode==='practice') { state.karaokeSong='';b?.restoreKaraokeSource?.(); return; }
    if(!song)return;const identity=songKey(song);if(!force&&state.karaokeSong===identity&&document.body.dataset.karaokeAudio===mode)return;
    document.body.classList.add('v18-karaoke-processing');toast(mode==='instrumental'?'Preparing local instrumental…':'Reducing vocals locally…');
    try{
      const res=await window.echoAPI.prepareKaraokeTrack(song,mode);
      if(serial!==karaokeSerial||songKey(b?.getSong?.())!==identity)return;
      if(!res?.success||!res.fileUrl)throw new Error(res?.error||'Karaoke audio unavailable');
      state.karaokeSong=identity;b?.applyKaraokeSource?.(res.fileUrl,mode);toast(`${mode==='instrumental'?'Instrumental':'Vocals Low'} ready${res.cached?' · cache':''}`);
    }catch(e){
      if(serial!==karaokeSerial)return;
      toast(`Karaoke: ${e.message}`);karaokeSelect.value='practice';state.karaoke='practice';state.karaokeSong='';
      localStorage.setItem('deepecho-v18-karaoke-mode','practice');b?.restoreKaraokeSource?.();
    }finally{if(serial===karaokeSerial)document.body.classList.remove('v18-karaoke-processing');}
  }
  karaokeSelect.onchange=()=>applyKaraokeMode(karaokeSelect.value,true);

  // Payload hook: refresh sub-lines, source label and prepare selected karaoke mode for new songs.
  window.__deepechoV18OnLyricsPayload=(payload)=>{
    const song=bridge()?.getSong?.(),identity=songKey(song);
    if(lastPayloadSongKey&&identity&&identity!==lastPayloadSongKey){
      sourceLoadSerial++;translationSerial++;state.translationBusy=false;
      if(state.translation)state.translation=false;
    }
    lastPayloadSongKey=identity;syncLanguageControls();syncSourceHeader();
    if(identity&&state.karaoke!=='original'&&state.karaoke!=='practice'&&identity!==state.karaokeSong)setTimeout(()=>applyKaraokeMode(state.karaoke,true),450);
  };
  syncLanguageControls();syncSourceHeader();if(state.karaoke!=='original')setTimeout(()=>applyKaraokeMode(state.karaoke,false),700);
})();
