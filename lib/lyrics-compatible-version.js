'use strict';

const STOP = new Set('official music video audio lyrics lyric lyrical full song from movie hd 4k visualizer visualiser'.split(' '));
const BAD_VARIANTS = ['live','remix','acoustic','unplugged','slowed','reverb','sped','nightcore','cover','karaoke','instrumental','8d','mashup','remaster','remastered','extended'];

function clean(value='') {
  return String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[“”"'`]/g,' ')
    .replace(/\([^)]*(official|lyrics?|lyrical|video|audio|visuali[sz]er|from\s+[^)]*)[^)]*\)/gi,' ')
    .replace(/\[[^\]]*(official|lyrics?|lyrical|video|audio|visuali[sz]er|from\s+[^\]]*)[^\]]*\]/gi,' ')
    .replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
}
function tokens(value='') { return clean(value).split(' ').filter(x => x && !STOP.has(x)); }
function setScore(a,b) {
  const A=new Set(tokens(a)), B=new Set(tokens(b));
  if(!A.size||!B.size)return 0;
  let hit=0; for(const x of A) if(B.has(x)) hit++;
  const precision=hit/Math.max(1,A.size), recall=hit/Math.max(1,B.size);
  return hit ? (2*precision*recall/Math.max(.0001,precision+recall)) : 0;
}
function durationSeconds(value) {
  if(Number.isFinite(Number(value))&&Number(value)>0)return Number(value);
  if(!value)return 0;
  return String(value).split(':').reduce((n,p)=>n*60+(Number(p)||0),0);
}
function hasVariant(text,variant){
  const n=clean(text); const v=clean(variant); return new RegExp(`(?:^|\\s)${v.replace(/\s+/g,'\\s+')}(?:$|\\s)`).test(n);
}
function versionPenalty(seed='',candidate='') {
  let p=0;
  for(const tag of BAD_VARIANTS){
    const wanted=hasVariant(seed,tag), actual=hasVariant(candidate,tag);
    if(wanted!==actual)p+=18;
  }
  return Math.min(72,p);
}
function lyricalHint(song={}) { return /\b(lyrics?|lyrical|lyric video|lyrics video)\b/i.test(String(song.title||'')); }
function officialHint(song={}) { return /\bofficial\b/i.test(`${song.title||''} ${song.channel||''}`); }
function sameSongScore(seed={},candidate={},canonical={}) {
  if(!candidate?.id)return -999;
  const seedTitle=canonical.title||seed.title||'';
  const seedArtist=canonical.artist||seed.channel||'';
  const titleText=candidate.title||'';
  const channel=candidate.channel||'';
  let score=setScore(seedTitle,titleText)*82;
  if(seedArtist) score += Math.max(setScore(seedArtist,titleText),setScore(seedArtist,channel))*38;
  if(lyricalHint(candidate))score+=26;
  if(officialHint(candidate))score+=7;
  if(/\bofficial audio\b/i.test(titleText))score+=5;
  score-=versionPenalty(`${seed.title||''} ${seed.channel||''}`,`${titleText} ${channel}`);
  const a=durationSeconds(seed.duration), b=durationSeconds(candidate.duration);
  if(a&&b){
    const d=Math.abs(a-b), ratio=d/Math.max(a,b);
    if(d<=4)score+=14; else if(d<=12)score+=8; else if(d<=28)score+=2;
    else if(ratio>.28)score-=38; else score-=Math.min(20,d*.22);
  }
  if(candidate.id===seed.id)score-=200;
  return Math.round(score*100)/100;
}
function rankCompatibleCandidates(seed={},items=[],canonical={},limit=12){
  const seen=new Set(); const rows=[];
  for(const item of items||[]){
    if(!item?.id||seen.has(item.id)||item.id===seed.id)continue;
    seen.add(item.id);
    const score=sameSongScore(seed,item,canonical);
    if(score<28)continue;
    rows.push({...item,_compatScore:score});
  }
  return rows.sort((a,b)=>b._compatScore-a._compatScore).slice(0,Math.max(1,Number(limit)||12));
}
function buildCompatibleQueries(song={},canonical={}){
  const title=String(canonical.title||song.title||'').replace(/\s+/g,' ').trim();
  const artist=String(canonical.artist||'').replace(/\s+/g,' ').trim();
  const base=[title,artist].filter(Boolean).join(' ').trim();
  if(!base)return [];
  return [...new Set([
    `${base} lyrics`,
    `${base} lyric video`,
    `${base} official lyrics`,
    `${base} official audio`
  ])].slice(0,4);
}
function timedLineCount(payload={}){return (String(payload.syncedLyrics||'').match(/^\[\d+:\d+(?:\.\d+)?\]/gm)||[]).length;}
function isUsableSyncedLyrics(payload={}){return timedLineCount(payload)>=3;}
function verificationScore(payload={},candidate={}){
  let score=0;
  const precision=String(payload.timingPrecision||'');
  if(/youtube-exact/.test(precision)||/YouTube/i.test(String(payload.source||'')))score+=120;
  else if(isUsableSyncedLyrics(payload))score+=70;
  if(Array.isArray(payload.wordTimings)&&payload.wordTimings.length>=6)score+=18;
  if(lyricalHint(candidate))score+=10;
  const lines=timedLineCount(payload); score+=Math.min(18,lines*.35);
  return score;
}
module.exports={clean,tokens,setScore,durationSeconds,versionPenalty,lyricalHint,officialHint,sameSongScore,rankCompatibleCandidates,buildCompatibleQueries,timedLineCount,isUsableSyncedLyrics,verificationScore};
