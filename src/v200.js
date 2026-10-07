/* DEEP-ECHO settings/release layer. Existing player remains authoritative. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),C=window.DeepEchoCore;
const KEY='deep-echo-v200-settings',SESSION='deep-echo-v200-session';
const settings={notifications:true,offline:false,recovery:true,lyricsStyle:'theme',...getStored(KEY,{})};
const save=()=>{setStored(KEY,settings);document.body.dataset.lyricsStyle=settings.lyricsStyle;document.body.classList.toggle('deep-offline',settings.offline)};
const service=(action,value)=>window.echoAPI.v200?window.echoAPI.v200(action,value):Promise.resolve({success:false,error:'Desktop service unavailable in browser preview'});
function notify(message){if(settings.notifications)showToast(message);}
function button(id,label){return `<button type="button" id="${id}" class="secondary-btn">${label}</button>`}
function card(title,content){return `<section class="deep-card"><h3>${title}</h3>${content}</section>`}
const hub=document.createElement('section');hub.className='deep-hub';hub.innerHTML=`
<div class="deep-release"><div><span class="deep-kicker">A deeper listening experience</span><h2>DEEP-ECHO <small id="deHubVersion">…</small></h2><p>Your music. Your atmosphere. Your controls.</p></div>${button('deSetup','Quick setup')}${button('deWhatsNew','What’s new')}</div>
<nav class="deep-settings-nav" aria-label="Settings categories"><button data-settings-jump="deep-hub">Essentials</button><button data-settings-jump="settings-card">Themes</button><button data-settings-jump="smart-audio-settings">Audio & lyrics</button><button data-settings-jump="v160-suite">Advanced</button></nav>
<div class="deep-grid">
${card('Listening & recovery',`<label class="switch-row">Offline mode<input type="checkbox" id="deOffline"></label><label class="switch-row">Recover interrupted playback<input type="checkbox" id="deRecovery"></label><label class="switch-row">In-app notifications<input type="checkbox" id="deNotifications"></label><div class="deep-actions">${button('deRetry','Retry current song')}${button('deRestore','Continue last session')}</div><p id="deSessionState" class="setting-help"></p>`)}
${card('Appearance studio',`<label>Performance<select id="dePerformance"><option value="eco">Low · 30 FPS</option><option value="balanced">Balanced · 40 FPS</option><option value="high">High · 50 FPS</option></select></label><div class="deep-actions">${button('deThemePreview','Preview a theme')}${button('deVisPreview','Preview visualizer')}</div><label>Lyrics style<select id="deLyricsStyle"><option value="theme">Theme personality</option><option value="clean">Clean</option><option value="cinema">Cinema</option><option value="karaoke">Karaoke</option></select></label><div class="deep-actions">${button('deLyricsFix','Reload & resync lyrics')}${button('deOverlay','Floating lyrics presets')}</div>`)}
${card('Downloads & storage',`<label>New download quality<select id="deDownloadQuality"><option value="best">Best available</option><option value="balanced">Balanced · up to 160 kbps preferred</option><option value="small">Data saver · up to 96 kbps preferred</option></select></label><p class="setting-help">Uses available source formats; no artificial quality upscaling.</p><div class="deep-actions">${button('deDownloads','Download manager')}${button('deStorage','Storage manager')}</div>`)}
${card('Maintenance & updates',`<p id="deCurrentVersion" class="setting-help"><strong>Current version: …</strong></p><div class="deep-actions">${button('deRepair','Repair tools')}${button('deBackup','Export settings & playlists')}${button('deUpdate','Check for updates')}${button('deAbout','About')}</div><p id="deUpdateState" class="setting-help">Stable channel · Check for updates</p>`)}
</div>`;
$('settingsView').insertBefore(hub,$('settingsView').firstChild);
// One accessible reusable modal, no injected user-controlled HTML.
const dialog=document.createElement('dialog');dialog.id='deepDialog';dialog.innerHTML='<div class="deep-dialog-head"><h2 id="deepDialogTitle"></h2><button id="deepDialogClose" aria-label="Close dialog">×</button></div><div id="deepDialogBody"></div>';document.body.appendChild(dialog);
let modalCleanup=()=>{};
function closeModal(){modalCleanup();modalCleanup=()=>{};dialog.close();}
$('deepDialogClose').onclick=closeModal;dialog.addEventListener('cancel',()=>{modalCleanup();modalCleanup=()=>{}});
function modal(title,html){if(dialog.open)closeModal();$('deepDialogTitle').textContent=title;$('deepDialogBody').innerHTML=html;dialog.showModal();}
function report(message){modal('DEEP-ECHO',`<p id="deReport"></p>`);$('deReport').textContent=message;}
const on=(id,event,fn)=>$(id)?.addEventListener(event,fn);
on('deOffline','change',e=>{settings.offline=e.target.checked;save();notify(settings.offline?'Offline mode · downloaded songs only':'Online mode enabled')});
on('deRecovery','change',e=>{settings.recovery=e.target.checked;save()});on('deNotifications','change',e=>{settings.notifications=e.target.checked;save()});
$('deOffline').checked=settings.offline;$('deRecovery').checked=settings.recovery;$('deNotifications').checked=settings.notifications;
function performancePreset(value){const quality=$('v170VisualizerQuality');if(quality){quality.value=value;quality.dispatchEvent(new Event('change'))}const perf=$('v160Perf');if(perf){perf.value=value==='eco'?'performance':value==='high'?'quality':'balanced';perf.dispatchEvent(new Event('change'))}$('dePerformance').value=value;}
$('dePerformance').value=localStorage.getItem('deepeccho-v170-vis-quality')||'balanced';on('dePerformance','change',e=>performancePreset(e.target.value));
function lyricsStyle(style){settings.lyricsStyle=style;save();const on=style==='karaoke';if(document.body.classList.contains('v170-karaoke')!==on)$('v170KaraokeToggle')?.click();}
$('deLyricsStyle').value=settings.lyricsStyle;on('deLyricsStyle','change',e=>lyricsStyle(e.target.value));save();
const qualityKey='deep-echo-download-quality';$('deDownloadQuality').value=localStorage.getItem(qualityKey)||'best';service('quality',$('deDownloadQuality').value);
on('deDownloadQuality','change',e=>{localStorage.setItem(qualityKey,e.target.value);service('quality',e.target.value)});
// Offline mode is checked at source resolution, including existing radio/queue paths.
const remoteBase=playRemoteSong;
playRemoteSong=async function(song,button){if(settings.offline){const saved=currentLibrary.find(x=>x.id===song?.id);if(saved)return playLocal(saved,++playRequest);showToast('Offline mode: download this song first.');return false;}return remoteBase(song,button)};
const searchBase=runSearch;
runSearch=async function(mode='song',query=''){if(settings.offline){searchRequest++;activateTab('search');const q=(query||$('searchInput')?.value||'').toLowerCase().trim();const songs=currentLibrary.filter(s=>`${s.title} ${s.channel}`.toLowerCase().includes(q));const list=$('resultsList');list.replaceChildren();songs.forEach(s=>list.appendChild(buildSongRow(s,true,makeContext(songs,'downloads','Offline search','offline-search'))));const hint=$('searchHint');if(hint)hint.textContent=songs.length?`${songs.length} downloaded results`:'No downloaded matches. Try an artist or switch online.';return;}return searchBase(mode,query)};
// Persist a clean serializable session without temporary stream URLs.
let session=C.safeSession(getStored(SESSION,null)),lastSave=0,recovering=false;
function saveSession(clean=false){if(!currentSong)return;const now=Date.now();if(!clean&&now-lastSave<2500)return;lastSave=now;const safeSong=queueSong(currentSong);delete safeSong.streamUrl;setStored(SESSION,{song:safeSong,position:audioPlayer.currentTime||0,volume:Number(volumeRange.value),savedAt:now,clean});}
function updateSessionText(){ $('deSessionState').textContent=session?`${session.clean?'Last session':'Recovered session'}: ${session.song.title||'Song'} · ${Math.floor(session.position/60)}:${String(Math.floor(session.position%60)).padStart(2,'0')}`:'Your last song and position will be saved automatically.';}
async function resumeSong(song,position,volume,preserveContext=false){if(recovering)return;recovering=true;const id=song.id;let timeout,restored=false;
 const restore=()=>{if(restored||currentSong?.id!==id)return;restored=true;audioPlayer.removeEventListener('loadedmetadata',restore);clearTimeout(timeout);if(Number.isFinite(audioPlayer.duration))audioPlayer.currentTime=Math.min(position,Math.max(0,audioPlayer.duration-1));if(volume!=null){volumeRange.value=String(volume);volumeRange.dispatchEvent(new Event('input'));}};
 audioPlayer.addEventListener('loadedmetadata',restore);timeout=setTimeout(()=>audioPlayer.removeEventListener('loadedmetadata',restore),45000);
 try{if(preserveContext)await playRemoteSong(song);else await startSingleSong(song);if(currentSong?.id===id&&audioPlayer.readyState>=1)restore();}finally{recovering=false;}}
on('deRestore','click',()=>{if(!session)return showToast('No saved session yet.');resumeSong(session.song,session.position,session.volume)});
on('deRetry','click',()=>currentSong?resumeSong(queueSong(currentSong),audioPlayer.currentTime||0):showToast('Choose a song first.'));
audioPlayer.addEventListener('timeupdate',()=>saveSession());audioPlayer.addEventListener('pause',()=>saveSession());window.addEventListener('beforeunload',()=>saveSession(true));updateSessionText();
// Recovery watches real media progress, not the spacing between timeupdate events.
let retryCount=0,stallTimer=0,lastPosition=0,healthyProgress=0,recoverySongId='';
function clearRecovery(){clearTimeout(stallTimer);stallTimer=0;}
function remoteRecoveryAllowed(){
 const src=String(audioPlayer.currentSrc||audioPlayer.src||'');
 return settings.recovery&&!settings.offline&&!recovering&&currentSong&&
   /^https?:\/\//i.test(src)&&!audioPlayer.paused&&!audioPlayer.ended&&!audioPlayer.seeking&&retryCount<2;
}
audioPlayer.addEventListener('timeupdate',()=>{
 const position=Number(audioPlayer.currentTime)||0;
 const delta=position-lastPosition;
 if(delta>0.01){clearRecovery();healthyProgress+=Math.min(delta,1);if(healthyProgress>=30)retryCount=0;}
 lastPosition=position;
});
function queueRecovery(){
 if(stallTimer||!remoteRecoveryAllowed())return;
 const id=currentSong.id,src=audioPlayer.currentSrc||audioPlayer.src,position=audioPlayer.currentTime;
 stallTimer=setTimeout(()=>{
   stallTimer=0;
   if(!remoteRecoveryAllowed()||currentSong.id!==id||(audioPlayer.currentSrc||audioPlayer.src)!==src)return;
   // A stalled network event can occur while buffered audio is still playing.
   if(Math.abs(audioPlayer.currentTime-position)>0.05||audioPlayer.readyState>=3)return;
   retryCount++;healthyProgress=0;
   notify('Connection interrupted · retrying playback');
   resumeSong(queueSong(currentSong),audioPlayer.currentTime||0,undefined,true).catch(error=>notify('Playback retry failed: '+error.message));
 },8000);
}
audioPlayer.addEventListener('waiting',queueRecovery);
audioPlayer.addEventListener('stalled',queueRecovery);
for(const event of ['playing','pause','seeking','ended','emptied','loadstart'])audioPlayer.addEventListener(event,clearRecovery);
audioPlayer.addEventListener('loadedmetadata',()=>{
 clearRecovery();lastPosition=Number(audioPlayer.currentTime)||0;
 if(recoverySongId!==currentSong?.id){recoverySongId=currentSong?.id;retryCount=0;healthyProgress=0;}
});
// Shared sleep timer avoids two old controls racing against auto-next.
let sleepTimer=0;function sleep(value){clearTimeout(sleepTimer);window.deepEchoStopAtEnd=value==='end';for(const id of ['v160Sleep','v170SleepTimer'])if($(id))$(id).value=value;if(Number(value)>0)sleepTimer=setTimeout(()=>{audioPlayer.pause();sleep('0');notify('Sleep timer finished')},Number(value)*60000)}
for(const id of ['v160Sleep','v170SleepTimer'])on(id,'change',e=>sleep(e.target.value));window.addEventListener('deep-echo-sleep-finished',()=>sleep('0'));
// Measured attenuation-only level matching; silence never gets boosted.
let normalizationSamples=null;audioPlayer.addEventListener('loadedmetadata',()=>{window.deepEchoNormalizationGain=1});setInterval(()=>{if(!normalizationToggle?.checked||audioPlayer.paused||smartCrossfadeActive)return;if(!audioAnalyser)return;normalizationSamples=normalizationSamples?.length===audioAnalyser.fftSize?normalizationSamples:new Uint8Array(audioAnalyser.fftSize);audioAnalyser.getByteTimeDomainData(normalizationSamples);window.deepEchoNormalizationGain=C.normalizedGain(normalizationSamples,window.deepEchoNormalizationGain??1);smartApplyNormalization()},180);
on('deLyricsFix','click',async()=>{if(!currentSong)return showToast('Play a song first.');await service('repair','lyrics');$('v170LyricsOffsetReset')?.click();$('v160OffsetReset')?.click();await loadLyricsFor(currentSong);notify('Lyrics reloaded and offsets reset')});
let currentAppVersion='…';
const DEEPECHO_RELEASE_VERSION='2.6.5';
try{const v42Label=document.querySelector('.v228-test-label');if(v42Label)v42Label.textContent=DEEPECHO_RELEASE_VERSION;}catch(_){}
const whatsNewItems={
 '2.6.5':['Red Nebulae is now a complete live theme with its own premium reactive visualizer, Floating Lyrics, Immersive Lyrics and theme-native presentation.','Previous-session playback resumes faster, while Home, Search and Recently Played prepare likely songs early so real Play requests can start with less waiting.','Floating Lyrics are more open and balanced across themes, with a smaller current line, better upcoming-line placement and less boxed animation.','Search and base lyrics initialization is hardened so startup prewarm cannot interrupt Search results or lyrics loading.','Lyrics sync/alignment, Exact Lyrics, Word by Word, Pronunciation, Smart Autoplay, Downloads and the accepted playback/recovery engines remain preserved.'],
 '2.6.3':['Instant Playback now prioritizes real Play requests above all speculative work so newly selected songs start faster.','Search warms likely visible results while Home, Recently Played, Made For You, Because You Listened To and Continue Listening cards receive low-priority intent warmup.','Next-song URL pre-resolution begins shortly after playback starts even with Gapless OFF, reducing cold Next transitions while Gapless still controls media-byte prebuffering.','Downloads and local files continue to use the existing direct local playback path without remote prefetch.','Lyrics sync/alignment, Exact Lyrics, Word by Word, Pronunciation, Floating/Immersive Lyrics, Smart Autoplay and the accepted compatibility recovery behavior are preserved.'],
 '2.6.2':['Instant Play warmup pre-resolves likely Search results so Play can start with much less waiting.','Playback recovery is coordinated through one shared fallback path, preventing false unsupported-source errors while compatible audio is still being prepared.','Pronunciation ON replaces the visible lyric with its Roman/Hinglish reading across Lyrics, Floating Lyrics and Immersive Lyrics without changing lyric timing.','Search includes theme-aware progress/offline states, fixed recent-search layering, and Ctrl+Alt+Space play/pause shortcut recovery.','The accepted lyrics sync/alignment, Exact Lyrics, Smart Autoplay and core playback resolver remain preserved from the tested V33 line.'],
 '2.6.1':['Faster Search lyrics capability checks and quicker lyrics startup for already-verified videos.','Word by Word rendering is smoother and more consistent while the accepted lyric sync/alignment engines remain unchanged.','Search promotes verified Lyrics Supported single-song results while playlists and mixes keep clean search cards.','Opened playlists show per-song lyrics capability, with improved real-playlist and long-mix track resolution.','Smart Autoplay, Home recommendations and song-aware theme suggestions are more taste-aware and diverse.','V23 lyric sync stability and all existing playback, downloads, queue, Mini Player, overlays, themes and Exact Lyrics systems are preserved.'],
 '2.6.0':['Lyrics recovery now finds and verifies a compatible same-song video when the current upload has no usable synced lyrics.','Canonical song-level lyrics memory reuses successful lyrics across official video, lyric video and audio uploads of the same track.','Ask DeepEcho, Lyrics Source Inspector and Sync Lab, Translation + Pronunciation, and Karaoke modes are included in the public build.','Pronunciation and translation can mirror into Immersive and Floating Lyrics, while windowed Search/topbar layout is more responsive.','V20 stability fixes protect song switching, translation, source inspection, Karaoke recovery and cumulative Sync Lab corrections.','Existing playback, downloads, queue, themes, Smart Autoplay, Exact Lyrics and the accepted V18/V21 timing engine are preserved.'],
 '2.5.0':['DEEP-ECHO 1.0 FINAL: the complete V15 feature baseline.','Exact Lyrics rescue, stronger Precision Sync and Word by Word timing improvements.','Smart Autoplay, smarter Home discovery, Personal Mixes and global playlist Open detection.','Resume Session, Listening Stats, GPU preference controls, Repair actions and About Artist in Immersive Player.','All existing playback, downloads, queue, themes, Mini Player and overlay systems are preserved.'],
 '2.3.0':['New Floating Immersive Lyrics panel: full-height right-side synced lyrics with playback controls, seek bar, resize-safe text and independent click-through.','Immersive Lyrics now mirrors each DEEP-ECHO theme with real audio-driven spectrum, waveform, bass, mids, highs, vocal energy and beat/transient response.','Floating Lyrics gains a seek/progress bar and full monitor-width resizing; White UI gets a dedicated frosted light skin.','Mini Player gains optional synced lyrics plus its own seek/progress bar, while the existing playback and lyric timing engines remain preserved.','Immersive Lyrics controls are also available in Settings and stay synchronized with the floating panel.'],
 '2.2.8':['Final 2.2 END release with distinct theme-native visualizers and adjustable glow presets.','Lyrics load faster, future lines stay readable, Karaoke keeps visualizer glow, and romanized variants preserve the source language instead of translating it.','Playlists now support contained Open, Play and Delete actions; online collections can be opened to inspect and play individual songs.','Playback, downloads, queue recovery and lyric sync safeguards from the stable 2.2 line are preserved.'],
 '2.2.5':['Download recovery now uses the same Android YouTube path that already restores playback.','If yt-dlp download extraction is blocked, DEEP-ECHO can save the already-resolved playback stream directly instead of failing.','INSTALL.bat now repairs incomplete optional local-AI lyrics bindings and raw module-path errors are suppressed.'],
 '2.2.4':['Fixed YouTube downloads that failed with bot-check/authentication errors.','Downloads now retry safe alternate YouTube clients before failing.','Existing opt-in YouTube Access browser login is now also used by the Download button when needed.'],
 '2.2.3':['Fixed false playback recovery restarting healthy audio. Local downloads are excluded from network recovery.','Lyrics section bounce removed; floating overlay animation preserved.','Automatic update checks at startup, every minute, and on reconnect or return to the app.'],
 '2.2.2':['Search autocomplete is compact, readable and no longer breaks Home/Search layout.','Typing from Home moves cleanly into Search instead of covering the Home hero.','Lyrics now have a separate Word by Word ON/OFF control. Exact YouTube caption segment timing is used when available; otherwise DEEP-ECHO safely stays line-synced.','Current app version is always visible in Settings and About.','What’s New automatically follows the installed app version so every successful update is obvious.','Keeps the v2.2.1 correct-track switching and faster cached GitHub release workflow.']
};
function releaseItems(version){return whatsNewItems[version]||['DEEP-ECHO has been updated to this installed version.','Open Settings to see the current version and check for future updates.','Your existing library, playlists, themes and listening preferences remain available.'];}
function setup(){modal(`Welcome to DEEP-ECHO ${currentAppVersion}`,`<p>Make yourself at home. You can change everything later.</p><label>Theme<select id="deSetupTheme"><option value="golden">Golden Particles</option><option value="dragon">Molten Dragon</option><option value="space">Vibrant Space</option><option value="nebula">Red Nebulae</option><option value="love">Love RGB</option></select></label><label>Performance<select id="deSetupPerf"><option value="balanced">Balanced</option><option value="eco">Low · integrated GPU</option><option value="high">High</option></select></label><label>Sound<select id="deSetupSound"><option value="flat">Original</option><option value="bass">Bass</option><option value="vocal">Vocal</option></select></label>${button('deSetupSave','Start listening')}`);on('deSetupSave','click',()=>{applyTheme($('deSetupTheme').value);performancePreset($('deSetupPerf').value);eqPresetSelect.value=$('deSetupSound').value;eqPresetSelect.dispatchEvent(new Event('change'));localStorage.setItem('deep-echo-onboarded',currentAppVersion);closeModal()})}
function whatsNew(){const items=releaseItems(currentAppVersion).map(item=>`<li>${item}</li>`).join('');modal(`What’s new · ${currentAppVersion}`,`<p class="deep-kicker">DEEP-ECHO ${currentAppVersion} installed</p><ul>${items}</ul><p>Developed by Daiyan [Allhamdullilah]</p>`)}
on('deSetup','click',setup);on('deWhatsNew','click',whatsNew);
async function syncInstalledVersion(){
 const meta=await service('about').catch(()=>({})); currentAppVersion=DEEPECHO_RELEASE_VERSION;
 if($('deHubVersion'))$('deHubVersion').textContent=currentAppVersion;
 if($('deCurrentVersion'))$('deCurrentVersion').innerHTML=`<strong>Current version: ${currentAppVersion}</strong> · ${meta?.packaged?'Installed build':'Source build'}`;
 const seen=localStorage.getItem('deep-echo-seen-app-version');
 if(currentAppVersion!=='unknown'&&seen!==currentAppVersion){localStorage.setItem('deep-echo-seen-app-version',currentAppVersion);setTimeout(()=>{const onboarded=localStorage.getItem('deep-echo-onboarded');const hasHistory=getStored(STORAGE.recent,[]).length||getLikedSongs().length;if(!onboarded&&!hasHistory)setup();else whatsNew()},700)}
}
syncInstalledVersion();
function themePreview(){const original=document.body.dataset.theme;modal('Preview your atmosphere',`<label>Theme<select id="dePreviewChoice"></select></label><div class="deep-preview-stage" id="deThemeStage"><strong>DEEP-ECHO</strong><span id="deThemeName"></span></div><p>Preview changes the current atmosphere temporarily. Close to return.</p>${button('dePreviewApply','Apply this theme')}`);const select=$('dePreviewChoice');document.querySelectorAll('[data-theme-choice]').forEach(x=>{const o=document.createElement('option');o.value=x.dataset.themeChoice;o.textContent=x.textContent.trim();select.appendChild(o)});select.value=original;let chosen=original;const preview=()=>{chosen=select.value;applyTheme(chosen);localStorage.setItem(STORAGE.theme,original);$('deThemeStage').dataset.theme=chosen;$('deThemeName').textContent=select.selectedOptions[0]?.textContent};preview();on('dePreviewChoice','change',preview);modalCleanup=()=>applyTheme(original);on('dePreviewApply','click',()=>{modalCleanup=()=>{};applyTheme(chosen);closeModal()})}
on('deThemePreview','click',themePreview);
function visualizerPreview(){modal('Visualizer studio',`<label>Mode<select id="dePreviewMode"><option value="theme">Current theme</option><option value="spectrum">Spectrum</option><option value="waveform">Waveform</option><option value="circular">Circular</option><option value="stereo">Stereo L/R</option><option value="vu">VU meter</option><option value="vocal">Vocal energy</option></select></label><canvas id="dePreviewCanvas" width="640" height="320"></canvas><p class="setting-help">Demo signal while paused; live audio while playing.</p>${button('deVisApply','Apply visualizer')}`);$('dePreviewMode').value=window.__dinechoVisualizerMode||'theme';let raf,last=0;function frame(now){raf=requestAnimationFrame(frame);if(now-last<33||document.hidden)return;last=now;const c=$('dePreviewCanvas');if(!c)return;const ctx=c.getContext('2d'),demo=audioPlayer.paused;const a=demo?{demoTime:now/1000,energy:.5,bass:.4,vocal:.3,beatPulse:(Math.sin(now/400)+1)/2,playing:true,hasSignal:true}:readAudioEnergy();ctx.clearRect(0,0,640,320);const sample=(i)=>demo?.2+.55*Math.abs(Math.sin(i*13+now/600))*Math.exp(-i):visualizerSpectrumSample(i,a);if($('dePreviewMode').value==='theme'&&document.body.dataset.theme==='dragon')window.drawDeepEchoDragon({ctx,w:640,h:320,dpr:1,audio:a,spectrumSample:sample});else window.__deepecchoDrawVisualizerMode({ctx,w:640,h:320,cx:320,cy:160,dpr:1,audio:a,mode:$('dePreviewMode').value==='theme'?'circular':$('dePreviewMode').value,spectrumSample:sample,waveSample:i=>Math.sin(i*25+now/400)});}raf=requestAnimationFrame(frame);modalCleanup=()=>cancelAnimationFrame(raf);on('deVisApply','click',()=>{const el=$('v170VisualizerMode');el.value=$('dePreviewMode').value;el.dispatchEvent(new Event('change'));closeModal()})}
on('deVisPreview','click',visualizerPreview);
on('deOverlay','click',()=>{modal('Floating lyrics presets',`<p>Select a readable size, then open the floating lyrics window.</p><div class="deep-actions">${button('deOverlaySmall','Compact · 85%')}${button('deOverlayNormal','Balanced · 110%')}${button('deOverlayLarge','Presentation · 145%')}</div><p>Click-through: Ctrl+Alt+X · Play/Pause: Ctrl+Alt+Space</p>`);[['deOverlaySmall',85],['deOverlayNormal',110],['deOverlayLarge',145]].forEach(([id,v])=>on(id,'click',()=>{const el=$('lyricsFontSizeRange');el.value=String(v);el.dispatchEvent(new Event('input'));if($('floatingLyricsToggleBtn')?.getAttribute('aria-pressed')!=='true')$('floatingLyricsToggleBtn')?.click();closeModal()}))});
let downloadRefresh=0;
async function refreshDownloads(){const rows=await service('downloads');if(!$('deDownloadRows'))return;$('deDownloadRows').replaceChildren();if(!Array.isArray(rows)||!rows.length){$('deDownloadRows').textContent='No downloads this session. Use the download button beside any song.';return}for(const row of rows.slice().reverse()){const el=document.createElement('div');el.className='deep-download-row';const title=document.createElement('strong');title.textContent=row.song?.title||row.id;const sub=document.createElement('span');sub.textContent=`${row.status} · ${Math.round(row.percent||0)}%${row.error?' · '+row.error:''}`;const progress=document.createElement('progress');progress.max=100;progress.value=row.percent||0;el.append(title,sub,progress);if(row.status==='Downloading'){const b=document.createElement('button');b.textContent='Cancel';b.onclick=async()=>{b.disabled=true;await service('cancel-download',row.id);refreshDownloads()};el.appendChild(b)}else if(['Failed','Cancelled'].includes(row.status)){const b=document.createElement('button');b.textContent='Retry';b.onclick=async()=>{b.disabled=true;await downloadSong(row.song,b);refreshDownloads()};el.appendChild(b)}$('deDownloadRows').appendChild(el)}}
on('deDownloads','click',()=>{modal('Download manager','<div id="deDownloadRows"></div>');refreshDownloads();downloadRefresh=setInterval(refreshDownloads,900);modalCleanup=()=>clearInterval(downloadRefresh)});
const mb=v=>`${((Number(v)||0)/1048576).toFixed(1)} MB`;
on('deStorage','click',async()=>{modal('Storage manager','<p id="deStorageSummary">Measuring…</p><div class="deep-actions">'+button('deCacheClear','Clear smart cache')+button('deTempClear','Clean old temporary files')+'</div><p class="setting-help">Downloaded songs are kept. Recent temporary files are kept to protect active playback.</p>');async function refresh(){const r=await service('storage');if($('deStorageSummary'))$('deStorageSummary').textContent=r.downloads?`Downloads: ${mb(r.downloads.bytes)} · Temporary: ${mb(r.cache.bytes)} · Smart cache: ${mb(r.smartCache.bytes)}`:r.error}refresh();on('deCacheClear','click',async()=>{await window.echoAPI.smartCacheClear();refresh()});on('deTempClear','click',async()=>{const r=await service('repair','temp');notify(r.message);refresh()})});
on('deRepair','click',()=>{modal('Repair tools',`<p>Inspect downloads or reset a specific cache. Playlists and likes stay intact.</p><div class="deep-actions">${button('deRepairLibrary','Check downloaded files')}${button('deRepairLyrics','Reset lyrics cache')}${button('deRepairVisual','Reset visual preferences')}</div><p id="deRepairResult" role="status"></p>`);for(const [id,kind]of[['deRepairLibrary','library'],['deRepairLyrics','lyrics']])on(id,'click',async()=>{const r=await service('repair',kind);if($('deRepairResult'))$('deRepairResult').textContent=r.message||r.error});on('deRepairVisual','click',()=>{performancePreset('balanced');applyTheme('golden');lyricsStyle('theme');$('deRepairResult').textContent='Golden theme, balanced performance and theme lyrics restored.'})});
on('deBackup','click',async()=>{const data={format:'deep-echo-backup',version:2,createdAt:new Date().toISOString(),playlists:getPlaylists(),liked:getLikedSongs(),settings:{...settings,theme:document.body.dataset.theme,quality:$('deDownloadQuality').value},session:getStored(SESSION,null)};const r=await service('backup',data);if(!r.cancelled)showToast(r.success?'Backup exported':r.error||'Backup unavailable')});
const updateMb=v=>`${((Number(v)||0)/1048576).toFixed(1)} MB`;
let updateVersion='',updateCheckRunning=false,lastUpdateCheck=0,announcedUpdate='',updateModuleStartedAt=Date.now();
function updateProgressText(event){
 const out=$('deUpdateProgress');if(!out)return;
 if(event.type==='progress'){const p=Math.max(0,Math.min(100,Number(event.percent)||0));const speed=Number(event.bytesPerSecond)||0;out.textContent=`Downloading ${p.toFixed(0)}%${event.total?` · ${updateMb(event.transferred)} / ${updateMb(event.total)}`:''}${speed?` · ${updateMb(speed)}/s`:''}`;}
 else if(event.type==='downloaded')out.textContent='Update downloaded and verified. Ready to restart.';
 else if(event.type==='error')out.textContent=event.error||'Update failed.';
}
window.echoAPI.onUpdateEvent?.(event=>{
 if(!event)return;updateProgressText(event);
 if(event.type==='available'){updateVersion=event.version||updateVersion;if($('deUpdateState'))$('deUpdateState').textContent=`Version ${updateVersion} available · Check for updates`;}
 if(event.type==='not-available'&&$('deUpdateState'))$('deUpdateState').textContent='You are up to date.';
 if(event.type==='error'&&$('deUpdateState'))$('deUpdateState').textContent=event.error||'Update check failed.';
});
async function updates(automatic=false){
 if(updateCheckRunning||(automatic&&(settings.offline||navigator.onLine===false||Date.now()-lastUpdateCheck<30000)))return;
 updateCheckRunning=true;lastUpdateCheck=Date.now();
 try {
 if($('deUpdateState'))$('deUpdateState').textContent='Checking…';
 const r=await service('update-check');
 if($('deUpdateState'))$('deUpdateState').textContent=r.success?(r.available?`Version ${r.available.version} is available`:(r.currentVersion?`Version ${r.currentVersion} · You are up to date.`:r.message||'You are up to date.')):(r.error||'Update check failed.');
 if(!r.available)return;
 updateVersion=r.available.version;
 if(automatic&&announcedUpdate===updateVersion)return;
 if(automatic&&dialog.open)return;
 announcedUpdate=updateVersion;
 if(automatic)notify(`DEEP-ECHO ${updateVersion} update available`);
 modal('DEEP-ECHO update available',`<p id="deReleaseNotes"></p>${button('deUpdateDownload','Download update')}<p id="deUpdateProgress" role="status"></p>`);
 $('deReleaseNotes').textContent=`DEEP-ECHO ${r.available.version}\n${r.available.notes||'New fixes and improvements are ready.'}`;
 on('deUpdateDownload','click',async()=>{
   const downloadButton=$('deUpdateDownload');downloadButton.disabled=true;
   $('deUpdateProgress').textContent='Starting secure download…';
   const result=await service('update-download');
   if(!$('deUpdateProgress'))return;
   if(!result.success){$('deUpdateProgress').textContent=result.error||'Update download failed.';downloadButton.disabled=false;return;}
   $('deUpdateProgress').textContent='Update downloaded and verified. Restart to finish.';
   downloadButton.remove();
   const b=document.createElement('button');b.id='deRestartUpdate';b.textContent='Restart & Update';
   b.onclick=async()=>{b.disabled=true;saveSession(true);$('deUpdateProgress').textContent='Restarting DEEP-ECHO to install update…';const x=await service('update-install');if(!x.success){b.disabled=false;showToast(x.error||'Update install failed')}};
   $('deepDialogBody').appendChild(b);
 });
 } catch(error){if($('deUpdateState'))$('deUpdateState').textContent=error.message||'Update check failed; will retry.';}
 finally {updateCheckRunning=false;}
}
on('deUpdate','click',()=>updates(false));
setTimeout(()=>updates(true),9000);
setInterval(()=>updates(true),60000);
window.addEventListener('online',()=>updates(true));
window.addEventListener('focus',()=>{if(Date.now()-updateModuleStartedAt>=9000)updates(true)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updates(true)});

on('deAbout','click',async()=>{const r=await service('about');modal('About DEEP-ECHO',`<div class="deep-about"><h2>DEEP-ECHO</h2><p id="deAboutVersion">Version…</p><p>Developed by Daiyan [Allhamdullilah]</p><p id="deBuildDetails"></p><p>Music · Atmosphere · You</p></div>`);if($('deAboutVersion'))$('deAboutVersion').textContent=`Version ${r.version||'unknown'}`;$('deBuildDetails').textContent=r.version?`${r.platform} · ${r.packaged?'Installed build':'Source build'} · Audio engine ${r.engineAvailable?'ready':'needs Setup-YtDlp.bat'}`:r.error});
hub.querySelectorAll('[data-settings-jump]').forEach(b=>b.onclick=()=>{const target=document.querySelector('.'+b.dataset.settingsJump);target?.scrollIntoView({behavior:'smooth',block:'start'})});
// Download outcome notifications are polled without replacing existing IPC listeners.
const downloadStates=new Map();setInterval(async()=>{if(document.hidden)return;const rows=await service('downloads');if(!Array.isArray(rows))return;for(const row of rows){if(downloadStates.get(row.id)!==row.status&&['Done','Failed','Cancelled'].includes(row.status))notify(`${row.status}: ${row.song?.title||'Download'}`);downloadStates.set(row.id,row.status)}},2500);
window.addEventListener('offline',()=>notify('Connection lost. Downloads remain available.'));window.addEventListener('online',()=>notify('Connection restored.'));
// Persist the latest crash context; do not claim errors were repaired merely because caught.
function logError(message){const items=getStored('deep-echo-errors',[]);items.unshift({at:Date.now(),message:String(message).slice(0,1000)});setStored('deep-echo-errors',items.slice(0,20))}
window.addEventListener('error',e=>{try{logError(e.message)}catch{}});window.addEventListener('unhandledrejection',e=>{try{logError(e.reason?.message||e.reason)}catch{}});
// Dragon renderer: continuous solid spine spectrum, flowing tail, halo and bass embers.
const dragonImage=new Image();dragonImage.src='assets/dragon-scene.png';
window.drawDeepEchoDragon=function({ctx,w,h,dpr=1,audio,spectrumSample}){ctx.save();const t=(audio.demoTime ?? audioPlayer.currentTime ?? 0),bass=audio.bass||0,beat=audio.beatPulse||0,energy=audio.energy||0;const active=audio.playing!==false;const time=active?t:0;
 if(dragonImage.complete&&dragonImage.naturalWidth){const scale=Math.min(w/dragonImage.naturalWidth,h/dragonImage.naturalHeight);ctx.globalAlpha=.75;ctx.drawImage(dragonImage,(w-dragonImage.naturalWidth*scale)/2,(h-dragonImage.naturalHeight*scale)/2,dragonImage.naturalWidth*scale,dragonImage.naturalHeight*scale)}
 ctx.globalAlpha=1;const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'rgba(8,3,1,.65)');shade.addColorStop(.7,'rgba(8,3,1,.05)');shade.addColorStop(1,'rgba(8,3,1,.65)');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
 ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#ff8b24';ctx.lineWidth=1.5*dpr;ctx.shadowColor='#ff5e0b';ctx.shadowBlur=(8+energy*15)*dpr;
 for(let j=0;j<3;j++){ctx.globalAlpha=.13+beat*.16;ctx.beginPath();ctx.arc(w*.5,h*.52,Math.min(w,h)*(.26+j*.06+beat*.015),Math.PI,Math.PI*2);ctx.stroke()}
 const count=window.__dinechoVisualizerQuality==='eco'?64:112;ctx.globalAlpha=.78;const spine=x=>h*(.58+Math.sin(x*9-time*.6)*.065);ctx.beginPath();for(let i=0;i<count;i++){const x=i/(count-1),y=spine(x)-spectrumSample(x,audio)*h*.25;i?ctx.lineTo(x*w,y):ctx.moveTo(0,y)}for(let i=count-1;i>=0;i--)ctx.lineTo(i/(count-1)*w,spine(i/(count-1)));ctx.closePath();const fire=ctx.createLinearGradient(0,h*.2,0,h*.75);fire.addColorStop(0,'rgba(255,231,158,.85)');fire.addColorStop(.6,'rgba(255,83,8,.35)');fire.addColorStop(1,'rgba(220,35,0,0)');ctx.fillStyle=fire;ctx.fill();ctx.stroke();
 for(let j=0;j<3;j++){ctx.globalAlpha=.25+j*.15;ctx.beginPath();for(let i=0;i<90;i++){const x=i/89,y=spine(x)+Math.sin(x*18-time*1.6+j)*h*.012*(1+bass);i?ctx.lineTo(x*w,y):ctx.moveTo(0,y)}ctx.stroke()}
 const breath=ctx.createRadialGradient(w*.88,h*.47,0,w*.88,h*.47,w*(.08+bass*.05));breath.addColorStop(0,`rgba(255,211,100,${.12+energy*.5})`);breath.addColorStop(1,'rgba(255,50,0,0)');ctx.fillStyle=breath;ctx.fillRect(w*.7,h*.23,w*.3,h*.5);
 ctx.shadowBlur=0;for(let i=0;i<(window.__dinechoVisualizerQuality==='eco'?12:28);i++){const x=((i*.618033+time*.015)%1)*w,y=h*(.9-((i*.173+time*(.035+energy*.025))%1)*.7);ctx.globalAlpha=(.15+energy*.55)*(1-y/h);ctx.fillStyle=i%3?'#ff9f32':'#fff0bc';ctx.fillRect(x,y,(1+beat*2)*dpr,(2+energy*3)*dpr)}ctx.restore();};
// Keep full app background decorative and quiet; detailed rendering lives on Lyrics / immersive surfaces.
const bg=document.createElement('div');bg.className='deep-dragon-background';bg.setAttribute('aria-hidden','true');document.body.prepend(bg);
})();
