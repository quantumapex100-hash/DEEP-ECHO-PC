'use strict';

const SENTINEL = '\n⟪DEEP_ECHO_LINE⟫\n';

function parseLrcLines(value = '') {
  const out=[];
  for (const raw of String(value||'').split(/\r?\n/)) {
    const m=raw.match(/^(\[(?:\d+:)?\d+(?::\d+)?(?:\.\d+)?\])(.*)$/);
    if (m) out.push({ stamp:m[1], text:m[2].trim() });
    else if (raw.trim()) out.push({ stamp:'', text:raw.trim() });
  }
  return out;
}
function chunkRows(rows = [], maxChars = 2600) {
  const chunks=[]; let cur=[], size=0;
  for (const row of rows) {
    const add=String(row.text||'').length+SENTINEL.length;
    if (cur.length && size+add>maxChars) { chunks.push(cur); cur=[]; size=0; }
    cur.push(row); size+=add;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}
function normalizeTargetLanguage(value='en') {
  const raw=String(value||'en').toLowerCase().trim();
  const allowed=new Set(['en','hi','es','fr','de','pt','it','ja','ko','zh-cn','zh-tw','ar','ur','pa','bn','id','tr','ru']);
  return allowed.has(raw)?raw:'en';
}
async function requestGoogle(text, target, fetchImpl=fetch) {
  const params=new URLSearchParams({client:'gtx',sl:'auto',tl:target,dt:'t',q:text});
  const response=await fetchImpl(`https://translate.googleapis.com/translate_a/single?${params}`,{headers:{'User-Agent':'DEEP-ECHO/2.6.0'}});
  if(!response?.ok)throw new Error(`Translation HTTP ${response?.status||0}`);
  const data=await response.json();
  const translated=Array.isArray(data?.[0])?data[0].map(x=>String(x?.[0]||'')).join(''):'';
  if(!translated.trim())throw new Error('Translation response was empty');
  return translated;
}
async function requestMyMemory(text, target, fetchImpl=fetch) {
  const params=new URLSearchParams({q:text,langpair:`auto|${target}`});
  const response=await fetchImpl(`https://api.mymemory.translated.net/get?${params}`,{headers:{'User-Agent':'DEEP-ECHO/2.6.0'}});
  if(!response?.ok)throw new Error(`Translation fallback HTTP ${response?.status||0}`);
  const data=await response.json();
  const translated=String(data?.responseData?.translatedText||'').trim();
  if(!translated)throw new Error('Translation fallback was empty');
  return translated;
}
async function translateChunk(rows,target,fetchImpl) {
  const input=rows.map(x=>x.text).join(SENTINEL);
  let output='';
  try { output=await requestGoogle(input,target,fetchImpl); }
  catch { output=await requestMyMemory(input,target,fetchImpl); }
  let parts=output.split(/\s*⟪\s*DEEP[_ ]ECHO[_ ]LINE\s*⟫\s*/i);
  // Some translators change/drop the separator. Preserve sync instead of returning a malformed LRC.
  if(parts.length!==rows.length){
    parts=[];
    for(const row of rows){
      try{parts.push(await requestGoogle(row.text,target,fetchImpl));}
      catch{try{parts.push(await requestMyMemory(row.text,target,fetchImpl));}catch{parts.push(row.text);}}
    }
  }
  return rows.map((row,i)=>({...row,text:String(parts[i]||row.text).trim()}));
}
async function translateRows(rows,target,fetchImpl=fetch) {
  const out=[];
  for(const chunk of chunkRows(rows)) out.push(...await translateChunk(chunk,target,fetchImpl));
  return out;
}
async function translateLyricsPayload(payload={}, targetLanguage='en', fetchImpl=fetch) {
  const target=normalizeTargetLanguage(targetLanguage);
  const plain=String(payload.lyrics||'').trim();
  const synced=String(payload.syncedLyrics||'').trim();
  if(!plain&&!synced)return {...payload,translationError:'No lyrics to translate'};
  const sourceRows=synced?parseLrcLines(synced):plain.split(/\r?\n/).filter(Boolean).map(text=>({stamp:'',text}));
  const translatedRows=await translateRows(sourceRows,target,fetchImpl);
  const translatedSyncedLyrics=synced?translatedRows.map(x=>`${x.stamp}${x.text}`).join('\n'):'';
  const translatedLyrics=translatedRows.map(x=>x.text).join('\n');
  return {...payload,translatedLyrics,translatedSyncedLyrics,translationLanguage:target,translationSource:'On-demand translation',hasTranslatedVariant:true};
}

module.exports={parseLrcLines,chunkRows,normalizeTargetLanguage,translateLyricsPayload,requestGoogle,requestMyMemory};
