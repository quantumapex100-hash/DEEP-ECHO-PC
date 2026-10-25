'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  searchLyricVideoCandidates,
  downloadReference,
  targetAudioSource,
  pcmFeatures,
  alignPlainToTranscript,
  shiftWordTimings
} = require('./exact-lyrics');
const { getYouTubeLyrics, alignSyncedLyricsToCaptions } = require('./youtube-captions');

const FRAME_SECONDS = 0.25;
const WINDOW_FRAMES = 72; // 18 seconds; long enough to survive drums/silence, short enough around dialogue edits.

function parseLrc(value = '') {
  const rows = [];
  for (const raw of String(value || '').split(/\r?\n/)) {
    const text = raw.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();
    for (const m of raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)) {
      rows.push({ time:Number(m[1]) * 60 + Number(m[2]), text });
    }
  }
  return rows.filter(r => Number.isFinite(r.time) && r.text).sort((a,b) => a.time - b.time);
}
function stamp(sec) {
  const t = Math.max(0, Number(sec) || 0), m = Math.floor(t / 60), s = t - m * 60;
  return `[${String(m).padStart(2,'0')}:${s.toFixed(3).padStart(6,'0')}]`;
}
function windowSimilarity(ref, target, refStart, targetStart, count = WINDOW_FRAMES) {
  if (refStart < 0 || targetStart < 0 || refStart + count > ref.length || targetStart + count > target.length) return -2;
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const A = ref[refStart + i], B = target[targetStart + i];
    sum += A[0] * B[0] * .72 + A[1] * B[1] * .12 + A[2] * B[2] * .16;
  }
  return sum / count;
}
function globalOffsetFrames(ref, target) {
  const maxShift = Math.min(420, Math.floor(Math.max(ref.length, target.length) * .35));
  const stride = Math.max(1, Math.floor(Math.min(ref.length, target.length) / 850));
  const scored = [];
  for (let shift = -maxShift; shift <= maxShift; shift += 2) {
    const startR = Math.max(0, -shift), startT = Math.max(0, shift);
    const n = Math.min(ref.length - startR, target.length - startT);
    if (n < 120) continue;
    let sum = 0, count = 0;
    for (let i = 0; i < n; i += stride) {
      const A = ref[startR + i], B = target[startT + i];
      sum += A[0] * B[0] * .72 + A[1] * B[1] * .12 + A[2] * B[2] * .16;
      count++;
    }
    scored.push({ shift, score:count ? sum / count : -2 });
  }
  scored.sort((a,b) => b.score - a.score);
  const best = scored[0];
  if (!best) return { shift:0, score:-2, confidence:0 };
  const separated = scored.find(x => Math.abs(x.shift - best.shift) >= 12) || scored[1] || { score:-2 };
  const margin = best.score - separated.score;
  const confidence = Math.max(0, Math.min(1, (best.score - .12) / .75 + Math.max(0, margin) * .7));
  return { shift:best.shift, score:best.score, confidence };
}
function monotonicAnchors(items = []) {
  const sorted = items.slice().sort((a,b) => a.referenceTime - b.referenceTime || b.confidence - a.confidence);
  const out = [];
  for (const item of sorted) {
    const prev = out[out.length - 1];
    if (prev && item.targetTime <= prev.targetTime + 1.5) continue;
    out.push(item);
  }
  return out;
}

function lyricKey(value = '') {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
function tokenSimilarity(a = '', b = '') {
  const A = lyricKey(a), B = lyricKey(b); if (!A || !B) return 0; if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return Math.min(.96, Math.min(A.length,B.length)/Math.max(A.length,B.length)+.24);
  const aa = new Set(A.split(' ').filter(Boolean)), bb = new Set(B.split(' ').filter(Boolean));
  let hit=0; for (const t of aa) if (bb.has(t)) hit++;
  const union = new Set([...aa,...bb]).size || 1;
  return hit / union;
}
function semanticTimeAnchors(referenceLrc = '', targetLrc = '') {
  const ref=parseLrc(referenceLrc), target=parseLrc(targetLrc); if(ref.length<3||target.length<3)return [];
  const candidates=[];
  for(let i=0;i<ref.length;i++){
    const scored=[];
    for(let j=0;j<target.length;j++){
      let score=tokenSimilarity(ref[i].text,target[j].text); if(score<.52)continue;
      // Context disambiguates repeated choruses: matching neighbours is more valuable than raw duplicate text.
      if(i>0&&j>0)score+=tokenSimilarity(ref[i-1].text,target[j-1].text)*.22;
      if(i+1<ref.length&&j+1<target.length)score+=tokenSimilarity(ref[i+1].text,target[j+1].text)*.22;
      scored.push({j,score});
    }
    scored.sort((a,b)=>b.score-a.score); const best=scored[0]; if(!best)continue;
    const second=scored[1]; const margin=best.score-(second?.score||0);
    const confidence=Math.max(0,Math.min(1,(best.score-.50)/.72 + Math.max(0,margin)*.55));
    if(confidence<.34)continue;
    candidates.push({referenceTime:ref[i].time,targetTime:target[best.j].time,confidence,score:best.score,kind:'semantic',refIndex:i,targetIndex:best.j});
  }
  // Dynamic monotonic selection avoids mapping the last repeated chorus back to the first occurrence.
  const dp=candidates.map((c,i)=>({score:c.confidence*2.4,prev:-1,count:1}));
  for(let i=0;i<candidates.length;i++)for(let k=0;k<i;k++){
    const a=candidates[k],b=candidates[i]; if(b.referenceTime<=a.referenceTime+.05||b.targetTime<=a.targetTime+.05)continue;
    const dr=b.referenceTime-a.referenceTime,dt=b.targetTime-a.targetTime,ratio=dt/Math.max(.01,dr);
    if(ratio<.45||ratio>1.9)continue;
    const continuity=Math.max(-.7,.35-Math.abs((dt-dr))*.012);
    const score=dp[k].score+b.confidence*2.4+continuity;
    if(score>dp[i].score){dp[i]={score,prev:k,count:dp[k].count+1};}
  }
  let best=-1; for(let i=0;i<dp.length;i++)if(best<0||dp[i].count>dp[best].count||(dp[i].count===dp[best].count&&dp[i].score>dp[best].score))best=i;
  if(best<0||dp[best].count<2)return [];
  const path=[]; for(let i=best;i>=0;i=dp[i].prev){path.push(candidates[i]);if(dp[i].prev<0)break;} path.reverse();
  return monotonicAnchors(path);
}
function fuseTimeAnchors(audioAnchors = [], semanticAnchors = []) {
  const all=[...audioAnchors.map(a=>({...a,kind:a.kind||'audio'})),...semanticAnchors].sort((a,b)=>a.referenceTime-b.referenceTime||b.confidence-a.confidence);
  const buckets=[];
  for(const a of all){
    const last=buckets[buckets.length-1];
    if(last&&Math.abs(last.referenceTime-a.referenceTime)<1.25){if((a.confidence||0)>(last.confidence||0))buckets[buckets.length-1]=a;continue;}
    buckets.push(a);
  }
  return monotonicAnchors(buckets);
}
function mapTimeWithJumps(time, anchors = []) {
  const t=Math.max(0,Number(time)||0); if(anchors.length<2)return mapTime(t,anchors);
  let right=anchors.findIndex(a=>a.referenceTime>=t); if(right<=0||right<0)return mapTime(t,anchors);
  const left=anchors[right-1],r=anchors[right],refSpan=r.referenceTime-left.referenceTime,targetSpan=r.targetTime-left.targetTime;
  const offsetLeft=left.targetTime-left.referenceTime,offsetRight=r.targetTime-r.referenceTime,offsetJump=offsetRight-offsetLeft;
  // Inserted dialogue/scene gaps create a discontinuity. Do not smear a 10 s jump across 40 s of lyrics.
  const verifiedJumpEvidence=!!(left.kind||r.kind||left.jumpEvidence||r.jumpEvidence);
  if(verifiedJumpEvidence && Math.abs(offsetJump)>=2.0 && Math.abs(targetSpan-refSpan)>=1.8 && refSpan<=75){
    const cut=(left.referenceTime+r.referenceTime)/2;
    return Math.max(0,t+(t<cut?offsetLeft:offsetRight));
  }
  return mapTime(t,anchors);
}
function mapTime(time, anchors = []) {
  const t = Math.max(0, Number(time) || 0);
  if (!anchors.length) return t;
  if (anchors.length === 1) return Math.max(0, t + anchors[0].targetTime - anchors[0].referenceTime);
  let right = anchors.findIndex(a => a.referenceTime >= t);
  if (right <= 0) {
    const a = anchors[0]; return Math.max(0, t + a.targetTime - a.referenceTime);
  }
  if (right < 0) {
    const a = anchors[anchors.length - 1]; return Math.max(0, t + a.targetTime - a.referenceTime);
  }
  const left = anchors[right - 1], r = anchors[right];
  const span = Math.max(.001, r.referenceTime - left.referenceTime);
  const ratio = Math.max(0, Math.min(1, (t - left.referenceTime) / span));
  return Math.max(0, left.targetTime + (r.targetTime - left.targetTime) * ratio);
}
function warpLrc(value = '', anchors = []) {
  const rows = parseLrc(value);
  let prev = -1;
  return rows.map(row => {
    let time = mapTimeWithJumps(row.time, anchors);
    if (time <= prev) time = prev + .08;
    prev = time;
    return `${stamp(time)}${row.text}`;
  }).join('\n');
}
function warpWordTimings(items = [], anchors = []) {
  return (Array.isArray(items) ? items : []).map(item => {
    const time = mapTimeWithJumps(item?.time, anchors);
    const endRaw = Number(item?.end);
    const end = Number.isFinite(endRaw) ? Math.max(time + .04, mapTimeWithJumps(endRaw, anchors)) : time + .35;
    return { ...item, text:String(item?.text || ''), time, end };
  }).filter(x => x.text && Number.isFinite(x.time));
}

async function estimateAudioTimeMap(song, referenceInput, options = {}) {
  const { jobDir, signal } = options;
  let ffmpegPath = '';
  try { ffmpegPath = require('ffmpeg-static') || ''; } catch {}
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) return null;
  const target = await targetAudioSource(song, options);
  if (!target) return null;
  options.onStatus?.({ stage:'reference-align', text:'Matching lyrical-video audio to this exact video…', progress:78 });
  const [ref, targetFeatures] = await Promise.all([
    pcmFeatures(referenceInput, path.join(jobDir,'reference-map.pcm'), ffmpegPath, { signal, execFileAsync:options.execFileAsync }),
    pcmFeatures(target, path.join(jobDir,'target-map.pcm'), ffmpegPath, { signal, execFileAsync:options.execFileAsync })
  ]);
  if (ref.length < WINDOW_FRAMES * 2 || targetFeatures.length < WINDOW_FRAMES * 2) return null;

  const global = globalOffsetFrames(ref, targetFeatures);
  const usableEnd = Math.max(WINDOW_FRAMES, ref.length - WINDOW_FRAMES);
  const fractions = [.08,.20,.34,.48,.62,.76,.90];
  const local = [];
  for (const fraction of fractions) {
    const center = Math.max(WINDOW_FRAMES/2, Math.min(ref.length - WINDOW_FRAMES/2 - 1, Math.round(usableEnd * fraction)));
    const refStart = Math.round(center - WINDOW_FRAMES / 2);
    const expectedTarget = refStart + global.shift;
    const radius = Math.min(300, Math.max(100, Math.round(targetFeatures.length * .09))); // ±25–75 sec.
    const candidates = [];
    const lo = Math.max(0, expectedTarget - radius), hi = Math.min(targetFeatures.length - WINDOW_FRAMES, expectedTarget + radius);
    for (let targetStart = lo; targetStart <= hi; targetStart += 2) {
      candidates.push({ targetStart, score:windowSimilarity(ref,targetFeatures,refStart,targetStart) });
    }
    candidates.sort((a,b) => b.score - a.score);
    const top=candidates.slice(0,6);
    const second = top.find(x => Math.abs(x.targetStart - (top[0]?.targetStart||0)) >= 12) || top[1] || {score:-2};
    for (let rank=0; rank<top.length; rank++) {
      const best=top[rank]; if(!best)continue;
      const margin = best.score - second.score;
      const confidence = Math.max(0, Math.min(1, (best.score - .16) / .72 + Math.max(0,margin) * .8 - rank*.055));
      if (confidence < .24) continue;
      local.push({
        referenceTime:(refStart + WINDOW_FRAMES/2) * FRAME_SECONDS,
        targetTime:(best.targetStart + WINDOW_FRAMES/2) * FRAME_SECONDS,
        confidence, score:best.score, kind:'audio-candidate', group:fraction, rank
      });
    }
  }
  // Pick one candidate per reference window using a monotonic dynamic path. This is much
  // harder for a repeated chorus to fool than independently taking each local best match.
  const orderedGroups=[...new Set(local.map(x=>x.group))];
  const nodes=local.slice().sort((a,b)=>a.referenceTime-b.referenceTime||b.confidence-a.confidence);
  const dp=nodes.map((n,i)=>({score:n.confidence*2.2-rankPenalty(n),prev:-1,count:1}));
  function rankPenalty(n){return Number(n.rank||0)*.10;}
  for(let i=0;i<nodes.length;i++)for(let k=0;k<i;k++){
    const a=nodes[k],b=nodes[i]; if(a.group===b.group||b.referenceTime<=a.referenceTime||b.targetTime<=a.targetTime)continue;
    const dr=b.referenceTime-a.referenceTime,dt=b.targetTime-a.targetTime,ratio=dt/Math.max(.01,dr);
    if(ratio<.42||ratio>1.95)continue;
    const offsetA=a.targetTime-a.referenceTime,offsetB=b.targetTime-b.referenceTime;
    const jumpPenalty=Math.min(.85,Math.abs(offsetB-offsetA)*.018);
    const score=dp[k].score+b.confidence*2.2-jumpPenalty;
    if(score>dp[i].score){dp[i]={score,prev:k,count:dp[k].count+1};}
  }
  let bi=-1; for(let i=0;i<dp.length;i++)if(bi<0||dp[i].count>dp[bi].count||(dp[i].count===dp[bi].count&&dp[i].score>dp[bi].score))bi=i;
  let anchors=[]; if(bi>=0){for(let i=bi;i>=0;i=dp[i].prev){anchors.push(nodes[i]);if(dp[i].prev<0)break;}anchors.reverse();anchors=monotonicAnchors(anchors);}
  if (anchors.length < 2 && global.confidence >= .42) {
    const offset = global.shift * FRAME_SECONDS;
    anchors = [
      {referenceTime:0,targetTime:Math.max(0,offset),confidence:global.confidence,score:global.score},
      {referenceTime:(ref.length-1)*FRAME_SECONDS,targetTime:Math.max(0,(ref.length-1)*FRAME_SECONDS+offset),confidence:global.confidence,score:global.score}
    ];
  }
  if (anchors.length < 2) return null;
  const confidence = anchors.reduce((n,a)=>n+a.confidence,0)/anchors.length;
  const offsets = anchors.map(a => a.targetTime - a.referenceTime);
  const drift = Math.max(...offsets) - Math.min(...offsets);
  return { anchors, confidence, globalOffset:global.shift * FRAME_SECONDS, driftSeconds:drift, warp:drift >= 1.25 ? 'piecewise-audio-map' : 'audio-offset-map' };
}

async function buildReferenceLyrics(song, original = {}, options = {}) {
  const root = options.tempRoot || os.tmpdir();
  const jobDir = fs.mkdtempSync(path.join(root, 'deepecho-reference-'));
  const localOptions = { ...options, jobDir };
  try {
    const candidates = await searchLyricVideoCandidates(song, localOptions);
    for (const candidate of candidates) {
      if (options.signal?.aborted) return { cancelled:true };
      if (candidate.id && song?.id && String(candidate.id) === String(song.id)) continue;
      options.onStatus?.({ stage:'reference-captions', text:`Checking lyrical reference · ${candidate.title}`, progress:62 });
      const captions = await getYouTubeLyrics(candidate, options.ytdlpPath, options.execFileAsync, options.fetchImpl || fetch, {
        signal:options.signal, browserAuth:options.browserAuth, tempRoot:path.join(jobDir,'captions')
      });
      if (!captions?.syncedLyrics || parseLrc(captions.syncedLyrics).length < 4) continue;
      const referenceMedia = await downloadReference(candidate, localOptions, false);
      const map = await estimateAudioTimeMap(song, referenceMedia, localOptions);
      if (!map || map.confidence < .30) continue;
      const semantic = options.targetCaptions ? semanticTimeAnchors(captions.syncedLyrics, options.targetCaptions) : [];
      const fusedAnchors = fuseTimeAnchors(map.anchors, semantic);
      if (fusedAnchors.length >= 2) {
        map.anchors = fusedAnchors;
        map.confidence = Math.max(map.confidence, semantic.length >= 2 ? semantic.reduce((n,a)=>n+a.confidence,0)/semantic.length : 0);
        const offsets=fusedAnchors.map(a=>a.targetTime-a.referenceTime);
        map.driftSeconds=Math.max(...offsets)-Math.min(...offsets);
        map.warp=semantic.length>=2 ? 'semantic+audio-piecewise-map' : map.warp;
      }

      let referenceLrc = captions.syncedLyrics;
      let textSource = captions.lyrics || parseLrc(captions.syncedLyrics).map(x=>x.text).join('\n');
      let textMatchConfidence = 1;
      let textMatchCount = parseLrc(referenceLrc).length;
      if (original.syncedLyrics) {
        const aligned = alignSyncedLyricsToCaptions(original.syncedLyrics, captions.syncedLyrics);
        if (aligned && aligned.matched >= 2 && aligned.confidence >= .30) {
          referenceLrc = aligned.syncedLyrics; textSource = original.lyrics || parseLrc(original.syncedLyrics).map(x=>x.text).join('\n');
          textMatchConfidence = aligned.confidence; textMatchCount = aligned.matched;
        }
      } else if (original.lyrics) {
        const aligned = alignPlainToTranscript(original.lyrics, captions.syncedLyrics);
        if (aligned && aligned.matched >= 2 && aligned.confidence >= .32) {
          referenceLrc = aligned.syncedLyrics; textSource = original.lyrics;
          textMatchConfidence = aligned.confidence; textMatchCount = aligned.matched;
        }
      }
      const syncedLyrics = warpLrc(referenceLrc, map.anchors);
      if (parseLrc(syncedLyrics).length < 3) continue;
      const wordTimings = warpWordTimings(captions.wordTimings || [], map.anchors);
      const candidateConfidence = Math.max(0, Math.min(1, (Number(candidate.score || 0) - .28) / .85));
      const overall = Math.max(0, Math.min(1, candidateConfidence*.24 + map.confidence*.46 + Math.max(.35,textMatchConfidence)*.30));
      if (overall < .40) continue;
      return {
        lyrics:textSource,
        syncedLyrics,
        source:`${original.source || 'Lyrics'} text · lyrical reference (${candidate.title})`,
        timingPrecision:'lyrical-reference-warped',
        timingConfidence:overall,
        timingMatchCount:textMatchCount,
        timingAnchors:map.anchors.length,
        timingDriftSeconds:map.driftSeconds,
        timingWarp:map.warp,
        timingReferenceVersion:2,
        referenceVideo:{ id:candidate.id,title:candidate.title,channel:candidate.channel,url:candidate.url },
        wordTimings,
        wordTimingSource:wordTimings.length ? `${captions.wordTimingSource || 'lyrical-video captions'} · audio-remapped` : ''
      };
    }
    return null;
  } finally {
    try { fs.rmSync(jobDir,{recursive:true,force:true}); } catch {}
  }
}

module.exports = { parseLrc, mapTime, mapTimeWithJumps, warpLrc, warpWordTimings, semanticTimeAnchors, fuseTimeAnchors, estimateAudioTimeMap, buildReferenceLyrics };
