const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsyncDefault = util.promisify(execFile);
const { guessArtistTitle, cleanTitle, seconds, withScriptVariants } = require('./lyrics');
const { getYouTubeLyrics, rowsToLrc } = require('./youtube-captions');
const { normalizeTimeline } = require('./lyrics-timeline');
const { runYtDlpSmart, isAbort } = require('./ytdlp-smart');
const { transcribeSong } = require('./auto-transcribe');

const EXACT_ENGINE_VERSION = 1;
const OCR_SAMPLE_FPS = 2;
const MAX_REFERENCE_SECONDS = 8 * 60;

function lrcRows(value = '') {
  const rows=[];
  for(const line of String(value||'').split(/\r?\n/)){
    const text=line.replace(/\[\d+:\d+(?:\.\d+)?\]/g,'').trim();
    for(const m of line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)) rows.push({time:Number(m[1])*60+Number(m[2]),text});
  }
  return rows.filter(r=>Number.isFinite(r.time)&&r.text).sort((a,b)=>a.time-b.time);
}
function estimatedWordTimingsFromLrc(value = '') {
  const rows=lrcRows(value), out=[];
  rows.forEach((row,index)=>{
    const words=String(row.text||'').split(/\s+/).filter(Boolean); if(!words.length)return;
    const next=Number(rows[index+1]?.time); const natural=Math.max(1.6,Math.min(8.5,words.length*.46));
    const rawEnd=Number.isFinite(next)&&next>row.time+.35?next:row.time+natural; const end=Math.min(rawEnd,row.time+Math.max(2.2,natural*1.28)); const span=Math.max(.5,end-row.time);
    const weights=words.map(w=>Math.max(1,String(w).replace(/[^\p{L}\p{N}]/gu,'').length*.72)); const total=Math.max(1,weights.reduce((a,b)=>a+b,0));
    let acc=0; words.forEach((word,wi)=>{const at=row.time+span*(acc/total);acc+=weights[wi];const to=row.time+span*(acc/total);out.push({text:word,time:at,end:Math.max(at+.08,to),estimated:true});});
  });
  return out;
}
function shiftWordTimings(items = [], offset = 0) {
  const delta=Number(offset)||0;
  return (Array.isArray(items)?items:[]).map(item=>{
    const time=Math.max(0,Number(item?.time||0)+delta); const rawEnd=Number(item?.end); const end=Number.isFinite(rawEnd)?Math.max(time+.04,rawEnd+delta):undefined;
    return {text:String(item?.text||''),time,...(Number.isFinite(end)?{end}:{}),...(item?.estimated?{estimated:true}:{})};
  }).filter(item=>item.text&&Number.isFinite(item.time));
}

function norm(value = '') {
  return cleanTitle(String(value || '')).normalize('NFKC').toLowerCase()
    .replace(/[\u2019']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ').trim();
}
function tokens(value = '') { return norm(value).split(' ').filter(Boolean); }
function tokenScore(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let hit = 0; for (const t of A) if (B.has(t)) hit++;
  const precision = hit / A.size, recall = hit / B.size;
  return hit ? (2 * precision * recall / Math.max(.0001, precision + recall)) : 0;
}
function titleParts(song = {}) {
  const base = guessArtistTitle(song);
  return {
    title: String(song.exactTitle || base.title || song.title || '').trim(),
    artist: String(song.exactArtist || base.artist || song.channel || '').trim()
  };
}
function exactCacheKey(song = {}) {
  const meta = titleParts(song);
  const title = norm(meta.title);
  const artist = norm(meta.artist);
  return `v${EXACT_ENGINE_VERSION}|${artist}|${title}`;
}
function formatDuration(sec) {
  const n = Math.max(0, Number(sec) || 0), m = Math.floor(n / 60), s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
function candidateScore(entry, song, meta) {
  const title = String(entry?.title || '');
  const channel = String(entry?.channel || entry?.uploader || '');
  const hay = `${title} ${channel}`;
  const lyricSignal = /\b(lyrics?|lyrical|lyric video|lyrics video)\b/i.test(title) ? 1 : 0;
  const badVersion = /\b(slowed|reverb|sped(?:\s*up)?|nightcore|8d|remix|mashup|cover|karaoke|instrumental|live)\b/i.test(title)
    && !/\b(slowed|reverb|sped(?:\s*up)?|nightcore|remix|cover|live)\b/i.test(String(song?.title || ''));
  const officialBonus = /\bofficial\b/i.test(hay) ? .04 : 0;
  const titleMatch = tokenScore(meta.title, title);
  const artistMatch = meta.artist ? Math.max(tokenScore(meta.artist, title), tokenScore(meta.artist, channel)) : .45;
  const targetDuration = seconds(song?.duration), candidateDuration = Number(entry?.duration || 0);
  let durationScore = .08;
  if (targetDuration && candidateDuration) {
    const diff = Math.abs(targetDuration - candidateDuration);
    durationScore = Math.max(-.28, .16 - diff / 90);
  }
  return titleMatch * .50 + artistMatch * .25 + lyricSignal * .26 + officialBonus + durationScore - (badVersion ? .45 : 0);
}

async function searchLyricVideoCandidates(song, options = {}) {
  const { ytdlpPath, signal, browserAuth, onStatus } = options;
  if (!ytdlpPath || !fs.existsSync(ytdlpPath)) throw new Error('yt-dlp.exe missing. Run Setup-YtDlp.bat first.');
  const meta = titleParts(song);
  const q1 = `${meta.artist ? `${meta.artist} ` : ''}${meta.title} lyrics`.trim();
  const q2 = `${meta.title} ${meta.artist || ''} lyric video`.trim();
  onStatus?.({ stage:'exact-search', text:'Finding the best lyrical video…', progress:8 });
  const queries = [...new Set([q1, q2].filter(Boolean))];
  const all = [];
  for (const query of queries) {
    if (signal?.aborted) return [];
    try {
      const { stdout } = await runYtDlpSmart(ytdlpPath, ['--flat-playlist','--no-warnings','-J',`ytsearch10:${query}`], {
        maxBuffer:20 * 1024 * 1024, timeout:45000, signal, purpose:'exact-lyrics-search', browserAuth, allowFallbackClients:true
      });
      const data = JSON.parse(stdout);
      for (const e of data.entries || []) if (e?.id) all.push(e);
    } catch (error) {
      if (isAbort(error)) throw error;
    }
  }
  const seen = new Set();
  return all.filter(e => {
    if (seen.has(e.id)) return false; seen.add(e.id); return true;
  }).map(e => ({
    id:e.id,
    title:e.title || 'Untitled',
    channel:e.channel || e.uploader || '',
    duration:Number(e.duration || 0),
    url:`https://www.youtube.com/watch?v=${e.id}`,
    score:candidateScore(e, song, meta)
  })).filter(x => x.score >= .32)
    .sort((a,b) => b.score - a.score)
    .slice(0, 4);
}

function findNewestMedia(dir, prefix = 'reference') {
  if (!fs.existsSync(dir)) return '';
  return fs.readdirSync(dir).filter(name => name.startsWith(prefix + '.') && !/\.(?:part|ytdl)$/i.test(name))
    .map(name => ({ full:path.join(dir,name), stat:fs.statSync(path.join(dir,name)) }))
    .filter(x => x.stat.isFile()).sort((a,b)=>b.stat.mtimeMs-a.stat.mtimeMs)[0]?.full || '';
}
async function downloadReference(candidate, options = {}, video = false) {
  const { ytdlpPath, jobDir, signal, browserAuth } = options;
  const prefix = video ? 'reference-video' : 'reference-audio';
  const template = path.join(jobDir, `${prefix}.%(ext)s`);
  const format = video ? 'best[height<=480]/best[height<=720]/worst' : 'bestaudio/best';
  await runYtDlpSmart(ytdlpPath, ['--no-warnings','--no-playlist','-f',format,'-o',template,candidate.url], {
    maxBuffer:20 * 1024 * 1024, timeout:150000, signal, purpose: video ? 'exact-lyrics-video' : 'exact-lyrics-audio', browserAuth, allowFallbackClients:true
  });
  const file = findNewestMedia(jobDir, prefix);
  if (!file) throw new Error('Lyrical video media could not be prepared.');
  return file;
}
async function targetAudioSource(song, options = {}) {
  const { ytdlpPath, jobDir, signal, browserAuth } = options;
  if (song?.filepath && fs.existsSync(song.filepath)) return song.filepath;
  if (/^https?:\/\//i.test(String(song?.streamUrl || ''))) return song.streamUrl;
  if (!song?.url) return '';
  const template = path.join(jobDir, 'target-audio.%(ext)s');
  await runYtDlpSmart(ytdlpPath, ['--no-warnings','--no-playlist','-f','bestaudio/best','-o',template,song.url], {
    maxBuffer:20 * 1024 * 1024, timeout:150000, signal, purpose:'exact-lyrics-target-audio', browserAuth, allowFallbackClients:true
  });
  return findNewestMedia(jobDir, 'target-audio');
}

async function pcmFeatures(input, outFile, ffmpegPath, options = {}) {
  const args = ['-y','-nostdin'];
  if (/^https?:\/\//i.test(String(input))) args.push('-rw_timeout','15000000','-reconnect','1','-reconnect_streamed','1','-reconnect_delay_max','2');
  args.push('-i',input,'-t',String(MAX_REFERENCE_SECONDS),'-vn','-ac','1','-ar','4000','-f','s16le',outFile);
  await (options.execFileAsync || execFileAsyncDefault)(ffmpegPath,args,{maxBuffer:8*1024*1024,windowsHide:true,timeout:180000,signal:options.signal});
  const buf = fs.readFileSync(outFile);
  const frameSamples = 1000; // 250 ms at 4 kHz
  const frames = [];
  for (let offset=0; offset + frameSamples*2 <= buf.length; offset += frameSamples*2) {
    let energy=0, zc=0, prev=buf.readInt16LE(offset), absDiff=0;
    for (let i=0;i<frameSamples;i++) {
      const v = buf.readInt16LE(offset + i*2) / 32768;
      energy += v*v;
      if (i && ((v >= 0) !== (prev >= 0))) zc++;
      if (i) absDiff += Math.abs(v - prev/32768);
      prev = v*32768;
    }
    frames.push([Math.log(1e-7 + Math.sqrt(energy/frameSamples)), zc/frameSamples, absDiff/frameSamples]);
  }
  if (frames.length < 40) return [];
  for (let col=0; col<3; col++) {
    const mean = frames.reduce((s,r)=>s+r[col],0)/frames.length;
    const sd = Math.sqrt(frames.reduce((s,r)=>s+(r[col]-mean)**2,0)/frames.length) || 1;
    for (const row of frames) row[col] = (row[col]-mean)/sd;
  }
  return frames;
}
function offsetSimilarity(a,b,shift) {
  const startA = Math.max(0, shift), startB = Math.max(0, -shift);
  const n = Math.min(a.length-startA,b.length-startB);
  if (n < 80) return -2;
  let sum=0, count=0;
  for (let i=0;i<n;i++) {
    const A=a[startA+i], B=b[startB+i];
    sum += A[0]*B[0]*.72 + A[1]*B[1]*.12 + A[2]*B[2]*.16;
    count++;
  }
  return count ? sum/count : -2;
}
async function estimateAudioOffset(song, referenceInput, options = {}) {
  const { jobDir, signal, onStatus } = options;
  let ffmpegPath = '';
  try { ffmpegPath = require('ffmpeg-static') || ''; } catch {}
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) return null;
  onStatus?.({stage:'exact-align',text:'Matching lyrical-video timing to the playing song…',progress:72});
  const target = await targetAudioSource(song, options);
  if (!target) return null;
  const [ref,targetFeatures] = await Promise.all([
    pcmFeatures(referenceInput,path.join(jobDir,'ref.pcm'),ffmpegPath,{signal,execFileAsync:options.execFileAsync}),
    pcmFeatures(target,path.join(jobDir,'target.pcm'),ffmpegPath,{signal,execFileAsync:options.execFileAsync})
  ]);
  if (!ref.length || !targetFeatures.length) return null;
  // shift > 0 means target starts earlier than reference in array coordinates.
  // We want targetTime = referenceTime + offsetSeconds, therefore offset = -shift*0.25.
  const maxShift = Math.min(360, Math.floor(Math.max(ref.length,targetFeatures.length)*.30)); // up to ~90 sec
  const scored=[];
  for(let shift=-maxShift;shift<=maxShift;shift++) scored.push({shift,score:offsetSimilarity(ref,targetFeatures,shift)});
  scored.sort((x,y)=>y.score-x.score);
  const best=scored[0]; if(!best || !Number.isFinite(best.score)) return null;
  const separated=scored.find(x=>Math.abs(x.shift-best.shift)>=8) || scored[1] || {score:-2};
  const margin=best.score-separated.score;
  const confidence=Math.max(0,Math.min(1,(best.score-.16)/.72 + Math.max(0,margin)*.75));
  return { offset:Math.round((-best.shift*.25)*100)/100, score:best.score, confidence:Math.round(confidence*1000)/1000 };
}
function parseLrcRows(lrc = '') {
  const rows=[];
  for(const raw of String(lrc||'').split(/\r?\n/)){
    const text=raw.replace(/\[\d+:\d+(?:\.\d+)?\]/g,'').trim();
    for(const m of raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)) rows.push({time:Number(m[1])*60+Number(m[2]),text});
  }
  return rows.filter(r=>r.text).sort((a,b)=>a.time-b.time);
}
function alignPlainToTranscript(plainLyrics, timedLrc) {
  const lines=String(plainLyrics||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const timed=parseLrcRows(timedLrc);
  if(lines.length<3||timed.length<3)return null;
  const matches=[]; let cursor=0;
  for(let i=0;i<lines.length;i++){
    let best=null;
    for(let j=cursor;j<Math.min(timed.length,cursor+16);j++){
      for(let span=1;span<=Math.min(3,timed.length-j);span++){
        const text=timed.slice(j,j+span).map(x=>x.text).join(' '), score=textSimilarity(lines[i],text);
        if(!best||score>best.score)best={j,span,score,time:timed[j].time};
      }
    }
    if(best&&best.score>=.32){matches.push({i,...best});cursor=best.j+best.span;}
  }
  if(matches.length<Math.max(2,Math.ceil(lines.length*.30)))return null;
  const confidence=matches.reduce((n,m)=>n+m.score,0)/matches.length;
  if(confidence<.40)return null;
  const times=Array(lines.length).fill(null); for(const m of matches)times[m.i]=m.time;
  for(let i=0;i<times.length;i++){
    if(times[i]!=null)continue; let a=i-1,b=i+1; while(a>=0&&times[a]==null)a--;while(b<times.length&&times[b]==null)b++;
    if(a>=0&&b<times.length)times[i]=times[a]+(times[b]-times[a])*((i-a)/(b-a));
    else if(a>=0)times[i]=times[a]+Math.max(1.6,(i-a)*2.6);
    else if(b<times.length)times[i]=Math.max(0,times[b]-Math.max(1.6,(b-i)*2.6));
  }
  const rows=normalizeTimeline(lines.map((text,i)=>({time:Math.max(0,Number(times[i])||0),text})),{dedupeWindow:.18,groupWindow:.24});
  return {syncedLyrics:rowsToLrc(rows),matched:matches.length,confidence:Math.round(confidence*1000)/1000};
}

function shiftLrc(lrc, offsetSeconds) {
  const rows=[];
  for (const raw of String(lrc||'').split(/\r?\n/)) {
    const text=raw.replace(/\[\d+:\d+(?:\.\d+)?\]/g,'').trim();
    for(const m of raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)) rows.push({time:Math.max(0,Number(m[1])*60+Number(m[2])+Number(offsetSeconds||0)),text});
  }
  return rowsToLrc(normalizeTimeline(rows.filter(r=>r.text),{dedupeWindow:.18,groupWindow:.24}));
}

async function extractFrames(videoFile, frameDir, options = {}) {
  let ffmpegPath=''; try { ffmpegPath=require('ffmpeg-static')||''; } catch {}
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) throw new Error('Local FFmpeg is unavailable. Run npm install once.');
  fs.mkdirSync(frameDir,{recursive:true});
  const vf=`fps=${OCR_SAMPLE_FPS},crop=iw*0.94:ih*0.76:iw*0.03:ih*0.12,scale=960:-2:flags=lanczos,eq=contrast=1.18:brightness=0.01`;
  await (options.execFileAsync || execFileAsyncDefault)(ffmpegPath,['-y','-nostdin','-i',videoFile,'-t',String(MAX_REFERENCE_SECONDS),'-vf',vf,'-q:v','3',path.join(frameDir,'frame-%06d.jpg')],{
    maxBuffer:10*1024*1024,windowsHide:true,timeout:180000,signal:options.signal
  });
  return fs.readdirSync(frameDir).filter(n=>/^frame-\d+\.jpg$/i.test(n)).sort();
}
function windowsOcrScript() {
  return String.raw`param([string]$Dir)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
[void][Windows.Storage.Streams.IRandomAccessStreamWithContentType,Windows.Storage.Streams,ContentType=WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
[void][Windows.Graphics.Imaging.SoftwareBitmap,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
[void][Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
[void][Windows.Media.Ocr.OcrResult,Windows.Foundation,ContentType=WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 } | Select-Object -First 1
function Await($Operation, [Type]$ResultType) {
  $task = $asTask.MakeGenericMethod($ResultType).Invoke($null,@($Operation))
  [void]$task.Wait()
  return $task.Result
}
$engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if($null -eq $engine){ throw 'Windows OCR language engine unavailable' }
$files=Get-ChildItem -LiteralPath $Dir -Filter 'frame-*.jpg' | Sort-Object Name
foreach($img in $files){
  $stream=$null; $bitmap=$null
  try {
    $file=Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($img.FullName)) ([Windows.Storage.StorageFile])
    $stream=Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
    $decoder=Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap=Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $result=Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    [pscustomobject]@{name=$img.Name;text=[string]$result.Text} | ConvertTo-Json -Compress
  } catch { }
  finally { if($bitmap){try{$bitmap.Dispose()}catch{}}; if($stream){try{$stream.Dispose()}catch{}} }
}`;
}
async function runWindowsOcr(frameDir, jobDir, options={}) {
  if (process.platform !== 'win32') {
    const error=new Error('Windows local OCR is available in the packaged Windows app.'); error.code='OCR_ENGINE_UNAVAILABLE'; throw error;
  }
  const scriptPath=path.join(jobDir,'deepecho-ocr.ps1'); fs.writeFileSync(scriptPath,windowsOcrScript(),'utf8');
  const {stdout}=await (options.execFileAsync || execFileAsyncDefault)('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',scriptPath,frameDir],{
    maxBuffer:64*1024*1024,windowsHide:true,timeout:240000,signal:options.signal
  });
  const rows=[];
  for(const line of String(stdout||'').split(/\r?\n/)){
    if(!line.trim())continue; try{const row=JSON.parse(line); if(row?.name)rows.push(row);}catch{}
  }
  return rows.map(row=>{
    const m=String(row.name).match(/frame-(\d+)/i); const index=Math.max(1,Number(m?.[1]||1));
    return {time:(index-1)/OCR_SAMPLE_FPS,text:String(row.text||'')};
  });
}
function cleanOcrLine(value='') {
  return String(value).normalize('NFKC').replace(/[|¦]/g,'I').replace(/\s+/g,' ').trim()
    .replace(/^[•·—–\-_:]+|[•·—–\-_:]+$/g,'').trim();
}
function ocrLineEligible(line='') {
  const text=cleanOcrLine(line), key=norm(text);
  if(!key || key.length<2 || /^\d+$/.test(key))return false;
  if(/https?:|www\.|@\w+|subscribe|official channel|instagram|facebook|youtube\.com/i.test(text))return false;
  if(text.length>150)return false;
  return true;
}
function textSimilarity(a,b){
  const aa=norm(a),bb=norm(b); if(!aa||!bb)return 0; if(aa===bb)return 1;
  if(aa.includes(bb)||bb.includes(aa))return Math.min(.97,Math.min(aa.length,bb.length)/Math.max(aa.length,bb.length)+.22);
  return tokenScore(aa,bb);
}
function extractOcrTimeline(samples=[]){
  const parsed=samples.map(s=>({time:Number(s.time)||0,lines:[...new Set(String(s.text||'').split(/\r?\n/).map(cleanOcrLine).filter(ocrLineEligible))]}));
  const exactFreq=new Map();
  for(const s of parsed)for(const l of s.lines){const k=norm(l);exactFreq.set(k,(exactFreq.get(k)||0)+1);}
  const staticKeys=new Set([...exactFreq].filter(([,n])=>parsed.length>=8 && n/parsed.length>.42).map(([k])=>k));
  const active=[],done=[]; const maxGap=1.05;
  for(const sample of parsed){
    for(const track of active)track.seenThis=false;
    for(const line of sample.lines){
      if(staticKeys.has(norm(line)))continue;
      let best=null;
      for(const track of active){
        if(sample.time-track.last>maxGap)continue;
        const score=textSimilarity(track.text,line); if(score>=.76&&(!best||score>best.score))best={track,score};
      }
      if(best){best.track.last=sample.time;best.track.count++;best.track.seenThis=true;if(line.length>best.track.text.length)best.track.text=line;}
      else active.push({text:line,start:sample.time,last:sample.time,count:1,seenThis:true});
    }
    for(let i=active.length-1;i>=0;i--){if(sample.time-active[i].last>maxGap){done.push(active[i]);active.splice(i,1);}}
  }
  done.push(...active);
  let rows=done.filter(t=>t.count>=2 || (t.text.length>=18 && t.count>=1)).map(t=>({time:t.start,text:t.text,count:t.count})).sort((a,b)=>a.time-b.time);
  const out=[];
  for(const row of rows){
    const prev=out[out.length-1];
    if(prev && row.time-prev.time<1.15 && textSimilarity(prev.text,row.text)>.90){if(row.text.length>prev.text.length)prev.text=row.text;continue;}
    out.push({time:row.time,text:row.text});
  }
  rows=normalizeTimeline(out,{dedupeWindow:.30,groupWindow:.30,tailStep:.75});
  const words=rows.reduce((n,r)=>n+r.text.split(/\s+/).filter(Boolean).length,0);
  if(rows.length<4||words<12)return null;
  return {rows,lyrics:rows.map(r=>r.text).join('\n'),syncedLyrics:rowsToLrc(rows)};
}
async function ocrLyricVideo(candidate, options={}) {
  options.onStatus?.({stage:'exact-ocr',text:'No usable captions · reading lyrics from the video locally…',progress:42});
  const video=await downloadReference(candidate,options,true);
  const frameDir=path.join(options.jobDir,'frames'); const frames=await extractFrames(video,frameDir,options);
  if(frames.length<5)throw new Error('Lyrical video frames could not be extracted.');
  options.onStatus?.({stage:'exact-ocr',text:`Reading ${frames.length} lyric frames with local OCR…`,progress:55});
  const samples=await runWindowsOcr(frameDir,options.jobDir,options);
  const timeline=extractOcrTimeline(samples);
  if(!timeline)throw new Error('Video text was not clear enough for reliable lyrics.');
  return {...timeline,referenceMedia:video,extraction:'ocr'};
}

function confidenceLabel(value){return value>=.78?'high':value>=.56?'medium':'low';}
async function exactLyricsFromVideo(song, options={}) {
  const { signal, onStatus }=options;
  const tempRoot=options.tempRoot||path.join(os.tmpdir(),'deepecho-exact-lyrics');
  const jobDir=path.join(tempRoot,`exact-${Date.now()}-${Math.random().toString(36).slice(2,8)}`); fs.mkdirSync(jobDir,{recursive:true});
  const localOptions={...options,jobDir};
  try{
    const candidates=await searchLyricVideoCandidates(song,localOptions);
    if(signal?.aborted)return {cancelled:true};
    if(!candidates.length)return {error:'Exact Lyrics ko matching lyrical video nahi mila.'};
    let lastError='';
    for(let i=0;i<candidates.length;i++){
      const candidate=candidates[i]; if(signal?.aborted)return {cancelled:true};
      onStatus?.({stage:'exact-verify',text:`Checking lyrical video ${i+1}/${candidates.length} · ${candidate.title}`,progress:18+i*7,candidate:{id:candidate.id,title:candidate.title}});
      try{
        let extracted=null, referenceMedia='';
        const captions=await getYouTubeLyrics(candidate,options.ytdlpPath,options.execFileAsync||execFileAsyncDefault,options.fetchImpl||fetch,{
          signal,browserAuth:options.browserAuth,tempRoot:path.join(jobDir,'captions')
        });
        if(captions?.syncedLyrics){
          const rows=String(captions.syncedLyrics).split(/\r?\n/).filter(Boolean);
          if(rows.length>=4){
            extracted={lyrics:rows.map(x=>x.replace(/\[\d+:\d+(?:\.\d+)?\]/g,'').trim()).filter(Boolean).join('\n'),syncedLyrics:captions.syncedLyrics,extraction:'captions',captionSource:captions.source||'YouTube captions',wordTimings:Array.isArray(captions.wordTimings)?captions.wordTimings:[],wordTimingSource:captions.wordTimingSource||''};
            onStatus?.({stage:'exact-extract',text:'Lyrical video has usable timed captions · verifying audio sync…',progress:46});
            referenceMedia=await downloadReference(candidate,localOptions,false);
          }
        }
        if(!extracted){
          const ocr=await ocrLyricVideo(candidate,localOptions); extracted=ocr; referenceMedia=ocr.referenceMedia;
        }
        if(signal?.aborted)return {cancelled:true};
        let aligned=extracted.syncedLyrics, alignment=null, alignmentMethod='audio-fingerprint';
        let alignedWordTimings=Array.isArray(extracted.wordTimings)?extracted.wordTimings:[];
        try{alignment=await estimateAudioOffset(song,referenceMedia,localOptions);}catch(error){if(isAbort(error))throw error;}
        let alignmentConfidence=Number(alignment?.confidence||0);
        if(alignment && alignmentConfidence>=.42){aligned=shiftLrc(extracted.syncedLyrics,alignment.offset);alignedWordTimings=shiftWordTimings(alignedWordTimings,alignment.offset);}
        else {
          const targetDuration=seconds(song.duration), refDuration=Number(candidate.duration||0);
          if(targetDuration&&refDuration&&Math.abs(targetDuration-refDuration)<=2.5){
            alignment={offset:0,confidence:.46,score:0,durationMatched:true};alignmentConfidence=.46;alignmentMethod='duration-match';
          } else if (options.modelDir) {
            // OCR/caption text remains the source of truth. Whisper is used only as a local
            // timing fallback when the two video audio envelopes cannot be confidently aligned.
            onStatus?.({stage:'exact-align',text:'Audio offset is uncertain · matching lyric-video text to the playing vocals locally…',progress:78});
            try {
              const transcript=await transcribeSong(song,{
                ytdlpPath:options.ytdlpPath,tempRoot:path.join(jobDir,'timing-ai'),modelDir:options.modelDir,
                signal,browserAuth:options.browserAuth,onStatus
              });
              const textAligned=transcript?.syncedLyrics ? alignPlainToTranscript(extracted.lyrics,transcript.syncedLyrics) : null;
              if(textAligned?.syncedLyrics){
                aligned=textAligned.syncedLyrics;
                // Local-vocal alignment can warp line positions non-linearly, so stale caption
                // word timestamps are discarded and rebuilt inside the newly aligned lines.
                alignedWordTimings=[];
                alignmentConfidence=Math.max(.48,Math.min(.88,.46+textAligned.confidence*.42));
                alignment={offset:0,confidence:alignmentConfidence,transcriptMatched:textAligned.matched};
                alignmentMethod='local-vocal-alignment';
              }
            } catch(error){ if(isAbort(error))throw error; }
          }
        }
        if(alignmentConfidence<.42){lastError='Lyrical video text mila, lekin uski timing current song ke saath reliably match nahi hui.';continue;}
        const candidateConfidence=Math.max(0,Math.min(1,(candidate.score-.28)/.85));
        const extractionConfidence=extracted.extraction==='captions'?.92:.74;
        const overall=Math.max(0,Math.min(1,candidateConfidence*.34+extractionConfidence*.36+alignmentConfidence*.30));
        if(overall<.48){lastError='Lyrical video mila, lekin exact song/timing confidently verify nahi hui.';continue;}
        if(!alignedWordTimings.length)alignedWordTimings=estimatedWordTimingsFromLrc(aligned);
        onStatus?.({stage:'exact-ready',text:'Exact Lyrics ready · verified and synced to this track.',progress:100});
        return withScriptVariants({
          lyrics:extracted.lyrics,
          syncedLyrics:aligned,
          source:`Exact Lyrics · ${extracted.extraction==='ocr'?'lyric-video OCR':extracted.captionSource||'lyric-video captions'}`,
          exactLyrics:true,
          exactExtraction:extracted.extraction,
          exactVideo:{id:candidate.id,title:candidate.title,channel:candidate.channel,url:candidate.url},
          exactConfidence:Math.round(overall*1000)/1000,
          exactConfidenceLabel:confidenceLabel(overall),
          timingPrecision:`exact-video-${alignmentMethod}`,
          timingOffsetSeconds:0,
          exactReferenceOffsetSeconds:Number(alignment?.offset||0),
          exactAlignmentMethod:alignmentMethod,
          wordTimings:alignedWordTimings,
          wordTimingSource:alignedWordTimings.some(item=>item?.estimated)?'Exact Lyrics synced-line word refinement':(extracted.wordTimingSource||'Exact lyric-video caption word timing'),
          wordTimingPrecision:alignedWordTimings.some(item=>item?.estimated)?'line-estimated':'caption-exact',
          generatedAt:Date.now()
        });
      }catch(error){
        if(isAbort(error))return {cancelled:true};
        lastError=String(error?.message||error).replace(/\s+/g,' ').slice(0,320);
      }
    }
    return {error:lastError||'Exact Lyrics ke liye reliable lyrical video result nahi mila.'};
  }finally{try{fs.rmSync(jobDir,{recursive:true,force:true});}catch{}}
}

module.exports={EXACT_ENGINE_VERSION,OCR_SAMPLE_FPS,norm,tokenScore,titleParts,exactCacheKey,candidateScore,searchLyricVideoCandidates,extractOcrTimeline,alignPlainToTranscript,shiftLrc,shiftWordTimings,estimatedWordTimingsFromLrc,estimateAudioOffset,exactLyricsFromVideo,formatDuration};
