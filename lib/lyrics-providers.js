'use strict';

const DEFAULT_TIMEOUT_MS = 6500;
const FAST_LINE_GRACE_MS = 850;
const YOULY_SERVERS = [
  'https://lyricsplus.prjktla.my.id',
  'https://lyricsplus.atomix.one',
  'https://lyricsplus.binimum.org',
  'https://lyricsplus.prjktla.workers.dev',
  'https://lyricsplus-seven.vercel.app',
  'https://lyrics-plus-backend.vercel.app'
];

const PROVIDER_PRIORITY = new Map([
  ['YouLyPlus', 0], ['PaxSenix', 1], ['Unison', 2], ['BetterLyrics', 3],
  ['SimpMusic', 4], ['LRCLIB', 5], ['KuGou', 6]
]);

function safeText(value) { return String(value == null ? '' : value).trim(); }
function durationSeconds(value) {
  if (Number.isFinite(Number(value)) && Number(value) > 0) return Number(value);
  if (!value) return 0;
  return String(value).split(':').reduce((total, part) => total * 60 + (Number(part) || 0), 0);
}
function cleanMetaText(value = '') {
  return safeText(value).normalize('NFKC').toLocaleLowerCase()
    .replace(/\b(official|music video|official video|official audio|lyrics?|lyrical|visuali[sz]er|full song|video song|audio song|hd|4k)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}
function wordSet(value) { return new Set(cleanMetaText(value).split(' ').filter(Boolean)); }
function overlap(a, b) {
  const A = wordSet(a), B = wordSet(b); if (!A.size || !B.size) return 0;
  let hit = 0; for (const w of A) if (B.has(w)) hit++;
  return hit / Math.max(A.size, B.size);
}
function inferVideoId(song = {}) {
  const direct = safeText(song.id);
  if (/^[A-Za-z0-9_-]{11}$/.test(direct)) return direct;
  const raw = safeText(song.url);
  const match = raw.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] || '';
}
function timestamp(sec, bracket = '[]') {
  const n = Math.max(0, Number(sec) || 0); const mm = Math.floor(n / 60); const ss = n - mm * 60;
  const body = `${String(mm).padStart(2, '0')}:${ss.toFixed(3).padStart(6, '0')}`;
  return bracket === '<>' ? `<${body}>` : `[${body}]`;
}
function parseClock(value) {
  const text = safeText(value); if (!text) return NaN;
  if (/^\d+(?:\.\d+)?s$/.test(text)) return Number(text.slice(0, -1));
  if (/^\d+(?:\.\d+)?ms$/.test(text)) return Number(text.slice(0, -2)) / 1000;
  const parts = text.split(':').map(Number); if (parts.some(v => !Number.isFinite(v))) return NaN;
  return parts.reduce((n, v) => n * 60 + v, 0);
}
function decodeXml(value = '') {
  return String(value).replace(/<br\s*\/?\s*>/gi, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n) || 32));
}
function stripTags(value = '') { return decodeXml(String(value).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(); }

function parseRichLrc(value = '') {
  const synced = [];
  const wordTimings = [];
  let lastLine = null;
  for (const raw of String(value || '').split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    const lineMatch = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (lineMatch) {
      const at = Number(lineMatch[1]) * 60 + Number(lineMatch[2]);
      let body = lineMatch[3].replace(/\{agent:[^}]+\}|\{bg\}/g, '').trim();
      const inline = [...body.matchAll(/<(\d+):(\d+(?:\.\d+)?)>\s*([^<]*)/g)];
      if (inline.length) {
        const prefix = body.slice(0, inline[0].index).trim();
        const words = [];
        if (prefix) words.push(prefix);
        for (let i = 0; i < inline.length; i++) {
          const item = inline[i];
          const t = Number(item[1]) * 60 + Number(item[2]);
          const text = safeText(item[3]);
          const next = inline[i + 1];
          const end = next ? Number(next[1]) * 60 + Number(next[2]) : NaN;
          if (text) { words.push(text); wordTimings.push({ text, time:t, end:Number.isFinite(end) ? end : t + .35 }); }
        }
        body = words.join(' ').replace(/\s+/g, ' ').trim();
      } else {
        body = body.replace(/<\d+:\d+(?:\.\d+)?>/g, '').trim();
      }
      if (body) { synced.push(`${timestamp(at)}${body}`); lastLine = { time:at, text:body }; }
      continue;
    }
    // BetterLyrics/PaxSenix rich metadata line: <word:start:end|word:start:end>
    if (lastLine && /^<.*>$/.test(line) && line.includes('|') && /:\d/.test(line)) {
      const chunks = line.slice(1, -1).split('|');
      for (const chunk of chunks) {
        const m = chunk.match(/^(.*):(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
        if (!m) continue;
        const text = safeText(m[1]); const time = Number(m[2]); const end = Number(m[3]);
        if (text && Number.isFinite(time)) wordTimings.push({ text, time, end:Number.isFinite(end) ? end : time + .35 });
      }
    }
  }
  return { syncedLyrics:synced.join('\n'), wordTimings };
}

function ttmlToLyrics(ttml = '') {
  const lines = []; const wordTimings = [];
  const pRe = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  for (const p of String(ttml || '').matchAll(pRe)) {
    const attrs = p[1] || ''; const body = p[2] || '';
    const begin = attrs.match(/\bbegin=["']([^"']+)["']/i)?.[1];
    const start = parseClock(begin); if (!Number.isFinite(start)) continue;
    const spans = [...body.matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi)];
    const words = [];
    for (const span of spans) {
      const sAttrs = span[1] || '';
      if (/\b(?:ttm:)?role=["'](?:x-bg|x-translation|x-roman)["']/i.test(sAttrs)) continue;
      const text = stripTags(span[2]); if (!text) continue;
      const s = parseClock(sAttrs.match(/\bbegin=["']([^"']+)["']/i)?.[1]);
      const e = parseClock(sAttrs.match(/\bend=["']([^"']+)["']/i)?.[1]);
      words.push(text);
      if (Number.isFinite(s)) wordTimings.push({ text, time:s, end:Number.isFinite(e) ? e : s + .35 });
    }
    let text = words.join(' ').replace(/\s+/g, ' ').trim();
    if (!text) text = stripTags(body.replace(/<span\b[^>]*(?:x-bg|x-translation|x-roman)[^>]*>[\s\S]*?<\/span>/gi, ' '));
    if (text) lines.push(`${timestamp(start)}${text}`);
  }
  return { syncedLyrics:lines.join('\n'), wordTimings };
}

function normalizeResult(source, payload = {}) {
  let lyrics = safeText(payload.lyrics || payload.plainLyrics);
  let syncedLyrics = safeText(payload.syncedLyrics);
  let wordTimings = Array.isArray(payload.wordTimings) ? payload.wordTimings.filter(x => x && Number.isFinite(Number(x.time)) && safeText(x.text)).map(x => ({ text:safeText(x.text), time:Number(x.time), end:Number.isFinite(Number(x.end)) ? Number(x.end) : Number(x.time) + .35, estimated:!!x.estimated })) : [];
  if (syncedLyrics) {
    const rich = parseRichLrc(syncedLyrics);
    if (rich.syncedLyrics) syncedLyrics = rich.syncedLyrics;
    if (!wordTimings.length && rich.wordTimings.length) wordTimings = rich.wordTimings;
  }
  if (!lyrics && syncedLyrics) lyrics = syncedLyrics.split(/\r?\n/).map(v => v.replace(/^\[\d+:\d+(?:\.\d+)?\]/, '').trim()).filter(Boolean).join('\n');
  const timedCount = (syncedLyrics.match(/^\[\d+:\d+(?:\.\d+)?\]/gm) || []).length;
  const quality = wordTimings.length >= 2 && timedCount >= 2 ? 4 : timedCount >= 2 ? 3 : lyrics ? 1 : 0;
  if (!quality) return null;
  return { lyrics, syncedLyrics, source, wordTimings, wordTimingSource:wordTimings.length ? `${source} native word/syllable timing` : '', providerQuality:quality, providerMeta:payload.providerMeta || undefined };
}


function mergeSignals(...signals) {
  const list = signals.filter(Boolean);
  if (!list.length) return undefined;
  if (list.length === 1) return list[0];
  if (typeof AbortSignal?.any === 'function') return AbortSignal.any(list);
  const controller = new AbortController();
  const abort = () => { try { controller.abort(); } catch {} };
  for (const signal of list) {
    if (signal.aborted) { abort(); break; }
    try { signal.addEventListener('abort', abort, { once:true }); } catch {}
  }
  return controller.signal;
}

function timeoutSignal(ms = DEFAULT_TIMEOUT_MS) {
  if (AbortSignal?.timeout) return AbortSignal.timeout(ms);
  const controller = new AbortController(); setTimeout(() => controller.abort(), ms).unref?.(); return controller.signal;
}
async function jsonRequest(fetchImpl, url, ms = DEFAULT_TIMEOUT_MS, headers = {}) {
  try {
    const response = await fetchImpl(url, { signal:timeoutSignal(ms), headers:{ Accept:'application/json', 'User-Agent':'DEEP-ECHO/2.5 lyrics-resolver', ...headers } });
    if (!response?.ok) return null;
    return await response.json();
  } catch { return null; }
}

async function fetchYouLyPlus(ctx) {
  const params = new URLSearchParams({ title:ctx.title, artist:ctx.artist, duration:String(Math.round(ctx.duration || 0)) });
  if (ctx.album) params.set('album', ctx.album); if (ctx.videoId) params.set('id', ctx.videoId);
  const tasks = YOULY_SERVERS.map(server => async () => {
    const data = await jsonRequest(ctx.fetchImpl, `${server}/v2/lyrics/get?${params}`, 5000); if (!data) return null;
    let syncedLyrics = safeText(data.syncedLyrics); let lyrics = safeText(data.plainLyrics); const wordTimings = [];
    if (Array.isArray(data.lyrics) && data.lyrics.length) {
      const rows = [];
      for (const item of data.lyrics) {
        const at = Number(item?.time) / 1000; if (!Number.isFinite(at)) continue;
        const syllables = Array.isArray(item?.syllabus) ? item.syllabus : [];
        const text = safeText(item?.text) || syllables.map(s => safeText(s?.text)).filter(Boolean).join(' ');
        if (text) rows.push(`${timestamp(at)}${text}`);
        for (const syl of syllables) {
          const st = Number(syl?.time) / 1000; const dur = Number(syl?.duration) / 1000;
          if (safeText(syl?.text) && Number.isFinite(st)) wordTimings.push({ text:safeText(syl.text), time:st, end:st + (Number.isFinite(dur) && dur > 0 ? dur : .35) });
        }
      }
      if (!syncedLyrics && rows.length) syncedLyrics = rows.join('\n');
      if (!lyrics) lyrics = data.lyrics.map(x => safeText(x?.text)).filter(Boolean).join('\n');
    }
    return normalizeResult('YouLyPlus', { lyrics, syncedLyrics, wordTimings });
  });
  return firstHighQuality(tasks);
}

function paxScore(row, ctx) {
  if (!row) return -Infinity;
  const title = row.trackName || row.songName || ''; const artist = row.artistName || '';
  const d = Number(row.duration); const targetMs = (ctx.duration || 0) * 1000; const diff = Number.isFinite(d) && targetMs ? Math.abs(d - targetMs) : 0;
  return overlap(ctx.title, title) * 100 + overlap(ctx.artist, artist) * 55 + (diff <= 2500 ? 30 : diff <= 7000 ? 12 : diff > 15000 ? -35 : 0);
}
async function fetchPaxSenix(ctx) {
  const query = encodeURIComponent(`${ctx.title} ${ctx.artist}`.trim());
  const rows = await jsonRequest(ctx.fetchImpl, `https://lyrics.paxsenix.org/apple-music/search?q=${query}`, 5000, { 'User-Agent':'deepecho/2.6.0' });
  if (!Array.isArray(rows) || !rows.length) return null;
  const candidates = rows.map(row => ({ row, score:paxScore(row,ctx) })).filter(x => x.score > 30).sort((a,b)=>b.score-a.score).slice(0,4);
  const tasks = candidates.map(({row}) => async () => {
    const data = await jsonRequest(ctx.fetchImpl, `https://lyrics.paxsenix.org/apple-music/lyrics?id=${encodeURIComponent(row.id)}`, 5500, { 'User-Agent':'deepecho/2.6.0' }); if (!data) return null;
    if (safeText(data.ttmlContent)) {
      const parsed = ttmlToLyrics(data.ttmlContent); return normalizeResult('PaxSenix', { ...parsed, providerMeta:{matchedTitle:row.trackName || row.songName, matchedArtist:row.artistName} });
    }
    if (safeText(data.elrcMultiPerson) || safeText(data.elrc)) return normalizeResult('PaxSenix', { syncedLyrics:data.elrcMultiPerson || data.elrc, plainLyrics:data.plain, providerMeta:{matchedTitle:row.trackName || row.songName, matchedArtist:row.artistName} });
    if (Array.isArray(data.content) && data.content.length) {
      const lines=[]; const wordTimings=[];
      for (const line of data.content) {
        const at=Number(line?.timestamp)/1000; if(!Number.isFinite(at)) continue;
        const words=Array.isArray(line?.text)?line.text:[]; const text=words.map(w=>safeText(w?.text)).filter(Boolean).join(' ');
        if(text) lines.push(`${timestamp(at)}${text}`);
        for(const word of words){const t=Number(word?.timestamp)/1000,e=Number(word?.endtime)/1000;if(safeText(word?.text)&&Number.isFinite(t))wordTimings.push({text:safeText(word.text),time:t,end:Number.isFinite(e)?e:t+.35});}
      }
      return normalizeResult('PaxSenix',{syncedLyrics:lines.join('\n'),plainLyrics:data.plain,wordTimings,providerMeta:{matchedTitle:row.trackName || row.songName,matchedArtist:row.artistName}});
    }
    return normalizeResult('PaxSenix',{plainLyrics:data.plain});
  });
  return firstHighQuality(tasks);
}

async function fetchUnison(ctx) {
  const queries=[];
  if(ctx.videoId) queries.push(new URLSearchParams({v:ctx.videoId}));
  const meta=new URLSearchParams({song:ctx.title,artist:ctx.artist}); if(ctx.duration)meta.set('duration',String(Math.round(ctx.duration))); if(ctx.album)meta.set('album',ctx.album); queries.push(meta);
  const tasks=queries.map(params=>async()=>{
    const data=await jsonRequest(ctx.fetchImpl,`https://unison.boidu.dev/lyrics?${params}`,6000);
    const entry=data?.success?data.data:null; if(!safeText(entry?.lyrics))return null;
    if(safeText(entry.lyrics).startsWith('<tt'))return normalizeResult('Unison',{...ttmlToLyrics(entry.lyrics),providerMeta:{confidence:entry.confidence,score:entry.effectiveScore}});
    return normalizeResult('Unison',{syncedLyrics:entry.syncType&&entry.syncType!=='plain'?entry.lyrics:'',plainLyrics:entry.lyrics,providerMeta:{confidence:entry.confidence,score:entry.effectiveScore}});
  });
  return firstHighQuality(tasks);
}

async function fetchBetterLyrics(ctx) {
  const params = new URLSearchParams({s:ctx.title,a:ctx.artist}); if(ctx.duration)params.set('d',String(Math.round(ctx.duration))); if(ctx.album)params.set('al',ctx.album);
  const data = await jsonRequest(ctx.fetchImpl, `https://lyrics-api.boidu.dev/getLyrics?${params}`, 6500); if (!safeText(data?.ttml)) return null;
  return normalizeResult('BetterLyrics', ttmlToLyrics(data.ttml));
}

async function fetchSimpMusic(ctx) {
  if (!ctx.videoId) return null;
  let data = await jsonRequest(ctx.fetchImpl, `https://api-lyrics.simpmusic.org/v1/${encodeURIComponent(ctx.videoId)}`, 5500);
  if (!data?.data) data = await jsonRequest(ctx.fetchImpl, `https://vivi-yt-music-server.onrender.com/v1/${encodeURIComponent(ctx.videoId)}`, 6500);
  const tracks = Array.isArray(data?.data) ? data.data : []; if (!tracks.length) return null;
  const valid = tracks.filter(row => !ctx.duration || !row.durationSeconds || Math.abs(Number(row.durationSeconds)-ctx.duration) <= 12)
    .sort((a,b)=>Math.abs(Number(a.durationSeconds||ctx.duration)-ctx.duration)-Math.abs(Number(b.durationSeconds||ctx.duration)-ctx.duration));
  for (const row of valid) {
    const rich = safeText(row.richSyncLyrics); const synced = rich || safeText(row.syncedLyrics); const plain = safeText(row.plainLyric || row.plainLyrics);
    const result = normalizeResult('SimpMusic',{syncedLyrics:synced,plainLyrics:plain,providerMeta:{vote:row.vote}}); if(result)return result;
  }
  return null;
}

function normalizeKugouLrc(value='') {
  const accepted = String(value).split(/\r?\n/).filter(line => /^\[\d{2}:\d{2}\.\d{2,3}\]/.test(line));
  // Keep repeated chorus lines: only metadata-looking credit lines are removed.
  return accepted.filter(line => !/^\[\d{2}:\d{2}\.\d{2,3}\].+[:：].+$/.test(line)).join('\n');
}
async function fetchKuGou(ctx) {
  const keyword = `${ctx.title} - ${ctx.artist}`.trim();
  const search = new URLSearchParams({ver:'1',man:'yes',client:'pc',keyword}); if(ctx.duration)search.set('duration',String(Math.round(ctx.duration*1000)));
  const data = await jsonRequest(ctx.fetchImpl, `https://lyrics.kugou.com/search?${search}`, 5500); const candidates = Array.isArray(data?.candidates)?data.candidates:[];
  for (const row of candidates.slice(0,3)) {
    const params = new URLSearchParams({fmt:'lrc',charset:'utf8',client:'pc',ver:'1',id:String(row.id),accesskey:String(row.accesskey)});
    const dl = await jsonRequest(ctx.fetchImpl, `https://lyrics.kugou.com/download?${params}`, 5000); if(!safeText(dl?.content))continue;
    try { const lrc=normalizeKugouLrc(Buffer.from(dl.content,'base64').toString('utf8')); const result=normalizeResult('KuGou',{syncedLyrics:lrc}); if(result)return result; } catch {}
  }
  return null;
}

async function fetchLrcLib(ctx) {
  const params = new URLSearchParams({track_name:ctx.title,artist_name:ctx.artist}); if(ctx.duration)params.set('duration',String(ctx.duration));
  const [exact, search] = await Promise.all([
    jsonRequest(ctx.fetchImpl, `https://lrclib.net/api/get?${params}`, 4800),
    jsonRequest(ctx.fetchImpl, `https://lrclib.net/api/search?${new URLSearchParams({track_name:ctx.title,artist_name:ctx.artist})}`, 4800)
  ]);
  const rows = [exact, ...(Array.isArray(search)?search:[])].filter(Boolean);
  const scored = rows.map(row=>{
    if(!row.plainLyrics&&!row.syncedLyrics&&!row.instrumental)return null;
    const titleScore=overlap(ctx.title,row.trackName||''); const artistScore=ctx.artist?overlap(ctx.artist,row.artistName||''):0;
    const diff=ctx.duration&&row.duration?Math.abs(Number(row.duration)-ctx.duration):0;
    return {row,score:titleScore*.72+artistScore*.24+(row.syncedLyrics?.trim()?0.10:0)-Math.min(.4,Math.max(0,diff-2)/90),diff};
  }).filter(Boolean).filter(x=>x.score>=.42).sort((a,b)=>b.score-a.score||a.diff-b.diff);
  const row=scored[0]?.row; if(!row)return null;
  if(row.instrumental&&!row.plainLyrics&&!row.syncedLyrics)return {instrumental:true,source:'LRCLIB',providerQuality:0};
  return normalizeResult('LRCLIB',{plainLyrics:row.plainLyrics,syncedLyrics:row.syncedLyrics,providerMeta:{trackName:row.trackName,artistName:row.artistName,duration:row.duration}});
}

function compareResults(a,b) {
  const qa=Number(a?.providerQuality||0),qb=Number(b?.providerQuality||0); if(qa!==qb)return qb-qa;
  return (PROVIDER_PRIORITY.get(a?.source)??99)-(PROVIDER_PRIORITY.get(b?.source)??99);
}
async function firstHighQuality(tasks) {
  const pending = tasks.map((task,index)=>Promise.resolve().then(task).then(value=>({index,value}),()=>({index,value:null})));
  const live = new Map(pending.map((p,i)=>[i,p])); const results=[]; let firstLineAt=0;
  const hardStop = Date.now()+DEFAULT_TIMEOUT_MS+1200;
  while(live.size && Date.now()<hardStop){
    const waits=[...live.values()];
    const timers=[];
    const timed=(ms,payload)=>new Promise(resolve=>{const id=setTimeout(()=>resolve(payload),ms);timers.push(id);});
    const now=Date.now();
    const hardDelay=Math.max(0,hardStop-now);
    waits.push(timed(hardDelay,{timer:'hard'}));
    if(firstLineAt){
      const graceDelay=Math.max(0,FAST_LINE_GRACE_MS-(now-firstLineAt));
      waits.push(timed(graceDelay,{timer:'grace'}));
    }
    const winner=await Promise.race(waits);
    timers.forEach(clearTimeout);
    if(winner?.timer){
      const synced=results.filter(x=>x.providerQuality>=3).sort(compareResults);
      if(synced.length)return synced[0];
      if(winner.timer==='hard')break;
      continue;
    }
    live.delete(winner.index); const value=winner.value;
    if(value?.providerQuality>=4)return value;
    if(value?.providerQuality>=3){results.push(value);if(!firstLineAt)firstLineAt=Date.now();}
    else if(value?.providerQuality>=1)results.push(value);
  }
  return results.sort(compareResults)[0]||null;
}

async function getMultiProviderLyrics(song, meta, duration, fetchImpl = fetch) {
  const group = new AbortController();
  const groupedFetch = (url, options = {}) => fetchImpl(url, { ...options, signal:mergeSignals(group.signal, options.signal) });
  const ctx = { song, title:safeText(meta?.title), artist:safeText(meta?.artist), album:safeText(song?.album || song?.albumName), duration:durationSeconds(duration || song?.duration), videoId:inferVideoId(song), fetchImpl:groupedFetch };
  if(!ctx.title)return null;
  const providers=[fetchYouLyPlus,fetchPaxSenix,fetchUnison,fetchBetterLyrics,fetchSimpMusic,fetchLrcLib,fetchKuGou];
  try { return await firstHighQuality(providers.map(provider=>()=>provider(ctx))); }
  finally { try { group.abort(); } catch {} }
}

async function getMultiProviderAlternatives(song, meta, duration, fetchImpl = fetch) {
  const ctx = { song, title:safeText(meta?.title), artist:safeText(meta?.artist), album:safeText(song?.album || song?.albumName), duration:durationSeconds(duration || song?.duration), videoId:inferVideoId(song), fetchImpl };
  if(!ctx.title)return [];
  const providers=[fetchYouLyPlus,fetchPaxSenix,fetchUnison,fetchBetterLyrics,fetchSimpMusic,fetchLrcLib,fetchKuGou];
  const settled=await Promise.allSettled(providers.map(provider=>provider(ctx)));
  const unique=new Map();
  for(const row of settled){
    const value=row.status==='fulfilled'?row.value:null; if(!value||value.instrumental)continue;
    const key=String(value.source||'Unknown'); const existing=unique.get(key);
    if(!existing||Number(value.providerQuality||0)>Number(existing.providerQuality||0))unique.set(key,value);
  }
  return [...unique.values()].sort(compareResults).map(value=>({
    ...value,
    syncKind:Number(value.providerQuality||0)>=4?'word':Number(value.providerQuality||0)>=3?'line':'plain',
    confidence:Number(value.providerQuality||0)>=4?'high':Number(value.providerQuality||0)>=3?'medium':'fallback'
  }));
}

module.exports = {
  getMultiProviderLyrics, getMultiProviderAlternatives, parseRichLrc, ttmlToLyrics, normalizeResult, inferVideoId,
  fetchYouLyPlus, fetchPaxSenix, fetchUnison, fetchBetterLyrics, fetchSimpMusic, fetchLrcLib, fetchKuGou
};
