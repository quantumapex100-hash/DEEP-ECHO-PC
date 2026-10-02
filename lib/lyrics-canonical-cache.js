'use strict';

const VARIANTS = ['live','remix','acoustic','unplugged','slowed','reverb','sped up','nightcore','cover','karaoke','instrumental','8d','mashup','extended','radio edit'];

function normalize(value='') {
  return String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[“”"'`]/g,' ')
    .replace(/\b(official music video|official video|official audio|lyric video|lyrics video|lyrical video|lyrics?|full song|video song|audio song|visuali[sz]er)\b/gi,' ')
    .replace(/[^\p{L}\p{N}]+/gu,' ')
    .replace(/\s+/g,' ').trim();
}
function seconds(value) {
  if (Number.isFinite(Number(value)) && Number(value) > 0) return Number(value);
  if (!value) return 0;
  const parts=String(value).split(':').map(Number);
  if (!parts.every(Number.isFinite)) return 0;
  return parts.reduce((n,p)=>n*60+p,0);
}
function variantSignature(value='') {
  const text=normalize(value);
  const found=[];
  for (const tag of VARIANTS) {
    const t=normalize(tag);
    if (new RegExp(`(?:^|\\s)${t.replace(/\s+/g,'\\s+')}(?:$|\\s)`).test(text)) found.push(t);
  }
  return found.sort().join('+') || 'standard';
}
function canonicalKey(song={}, canonical={}) {
  const title=normalize(canonical.title || song.title || '');
  const artist=normalize(canonical.artist || song.artist || song.channel || '');
  const variant=variantSignature(song.title || '');
  return JSON.stringify([title,artist,variant]);
}
function durationCompatible(seedDuration, cachedDuration) {
  const a=seconds(seedDuration), b=seconds(cachedDuration);
  if (!a || !b) return true;
  const diff=Math.abs(a-b);
  return diff <= Math.max(38, Math.min(70, Math.max(a,b)*.18));
}
function cacheablePayload(payload={}) {
  if (!payload || (!String(payload.syncedLyrics||'').trim() && !String(payload.lyrics||'').trim())) return null;
  const out={...payload};
  // Word timings and per-recording confidence belong to one particular upload. Keep the
  // lyric text/timeline only as a reference and let the current video calibrate it again.
  delete out.wordTimings;
  delete out.wordTimingSource;
  delete out.timingMatchCount;
  delete out.timingConfidence;
  delete out.timingOffsetSeconds;
  delete out.manualSectionSync;
  delete out.manualSectionSyncKey;
  delete out.manualSectionSyncIndex;
  delete out.manualSectionSyncDelta;
  out.timingPrecision='canonical-reference';
  out.backgroundCaptionUpgrade=true;
  out.canonicalLyricsReference=true;
  return out;
}
function makeEntry(song={},canonical={},payload={}) {
  const safe=cacheablePayload(payload); if(!safe)return null;
  return { key:canonicalKey(song,canonical), title:canonical.title||'', artist:canonical.artist||'', duration:song.duration||'', variant:variantSignature(song.title||''), payload:safe, verifiedAt:Date.now() };
}
function readMatch(map={},song={},canonical={},maxAgeMs=120*24*60*60*1000) {
  const entry=map?.[canonicalKey(song,canonical)];
  if(!entry?.payload)return null;
  if(Date.now()-Number(entry.verifiedAt||0)>maxAgeMs)return null;
  if(!durationCompatible(song.duration,entry.duration))return null;
  return { ...entry.payload, canonicalLyricsCached:true, backgroundCaptionUpgrade:true };
}
module.exports={normalize,seconds,variantSignature,canonicalKey,durationCompatible,cacheablePayload,makeEntry,readMatch};
