'use strict';
// A playback-only, in-process fast lane. The existing yt-dlp resolver remains
// authoritative for unsupported responses, authentication and recovery.
const https = require('https');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
const ORIGIN = 'https://www.youtube.com';
const abortError = () => Object.assign(new Error('Audio resolution cancelled'), {name:'AbortError'});
function videoId(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return '';
    let id = '';
    if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
    else if (['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(u.hostname)) {
      id = u.pathname === '/watch' ? u.searchParams.get('v') : /^\/(?:shorts|embed)\/([^/]+)$/.exec(u.pathname)?.[1];
    }
    return /^[\w-]{11}$/.test(id || '') ? id : '';
  } catch { return ''; }
}
function mediaUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && /(^|\.)googlevideo\.com$/i.test(u.hostname) && !u.username && !u.password && (!u.port || u.port === '443'); }
  catch { return false; }
}
function selectAudio(info, id, format) {
  if (info?.playabilityStatus?.status !== 'OK' || info.videoDetails?.videoId !== id ||
      info.videoDetails?.isLiveContent || info.videoDetails?.isLive || info.streamingData?.licenseInfos?.length) throw new Error('Native audio not available');
  const formats = (info.streamingData?.adaptiveFormats || []).filter(f =>
    /^audio\/(mp4|webm);/.test(f.mimeType || '') && mediaUrl(f.url) && !f.signatureCipher && !f.cipher && !f.drmFamilies?.length
  ).map(f => ({url:f.url, format_id:String(f.itag), ext:f.mimeType.startsWith('audio/mp4')?'m4a':'webm',
    abr:Number(f.averageBitrate || f.bitrate || 0)/1000, vcodec:'none', protocol:'https',
    http_headers:{'User-Agent':UA, Referer:ORIGIN+'/'}}));
  const cap = format.includes('abr<=96') ? 96 : format.includes('abr<=160') ? 160 : Infinity;
  const sorted = formats.filter(f => f.abr <= cap).sort((a,b) => (a.ext==='m4a'?0:1)-(b.ext==='m4a'?0:1) || b.abr-a.abr);
  if (!sorted.length) throw new Error('No supported progressive audio');
  return {...sorted[0], id, formats, duration:Number(info.videoDetails.lengthSeconds)||0};
}
function createNativeAudioResolver({request:httpsRequest=https.request, now=Date.now, timeoutMs=4000, budgetMs=5500, log=()=>{}}={}) {
  const agent = new https.Agent({keepAlive:true, maxSockets:4});
  const active = new Map();
  const failures = new Map();
  let session, sessionJob, closed=false, blockedUntil=0, consecutiveFailures=0;
  function request(url, {body, headers={}, signal, probe=false, visitorOnly=false, redirects=0}={}) {
    return new Promise((resolve,reject) => {
      if (closed || signal?.aborted) return reject(abortError());
      const data = body ? Buffer.from(JSON.stringify(body)) : null;
      let settled=false, req, response;
      const finish = (error,value) => {
        if (settled) return; settled=true; clearTimeout(timer); signal?.removeEventListener('abort',abort);
        active.delete(req); error ? reject(error) : resolve(value);
      };
      const abort = () => { finish(abortError()); response?.destroy(); req?.destroy(); };
      const timer = setTimeout(() => { finish(new Error('Native audio deadline')); response?.destroy(); req?.destroy(); }, timeoutMs);
      try {
        req = httpsRequest(url, {agent, method:data?'POST':'GET', headers:{'User-Agent':UA, ...headers,
          ...(data?{'Content-Type':'application/json','Content-Length':data.length}:{})}}, res => {
          response=res;
          if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location && probe) {
            res.destroy();
            let next;
            try { next = new URL(res.headers.location,url).href; }
            catch { return finish(new Error('Invalid audio redirect')); }
            if (redirects >= 3 || !mediaUrl(next)) return finish(new Error('Invalid audio redirect'));
            request(next,{headers,signal,probe:true,redirects:redirects+1}).then(value=>finish(null,value),finish);
            return;
          }
          if (res.statusCode !== 200 && !(probe && res.statusCode === 206)) { res.destroy(); return finish(new Error('Native audio HTTP '+res.statusCode)); }
          let size=0, tail=''; const chunks=[];
          res.on('error',finish);
          res.on('aborted',()=>finish(new Error('Native audio response interrupted')));
          res.on('data',chunk => {
            size+=chunk.length;
            if (probe) { finish(null,{url}); res.destroy(); return; }
            // The homepage can be many MB. Stop as soon as its session metadata
            // arrives; never wait for/download the feed just to start audio.
            if (visitorOnly) {
              tail+=chunk.toString('utf8');
              const found=/"VISITOR_DATA"\s*:\s*"([^"\\]{1,2048})"/.exec(tail);
              if (found) { finish(null,{text:JSON.stringify({VISITOR_DATA:found[1]}),headers:res.headers});res.destroy();return; }
              tail=tail.slice(-4096);
            }
            if (size>3*1024*1024) { finish(new Error('Native response too large')); res.destroy(); return; }
            chunks.push(chunk);
          });
          res.on('end',()=>probe ? finish(new Error('Empty audio response')) : finish(null,{text:Buffer.concat(chunks).toString('utf8'),headers:res.headers}));
        });
        active.set(req,abort); req.on('error',finish); signal?.addEventListener('abort',abort,{once:true});
        if (signal?.aborted) return abort();
        req.end(data);
      } catch(error) { finish(error); }
    });
  }
  async function warm() {
    if (closed || now()<blockedUntil) throw new Error('Native resolver cooling down');
    if (session && session.until>now()) return session;
    if (!sessionJob) {
      const start=now();
      sessionJob = request(ORIGIN+'/',{visitorOnly:true}).then(({text,headers}) => {
        const match = /"VISITOR_DATA"\s*:\s*"([^"\\]{1,2048})"/.exec(text);
        if (!match) throw new Error('YouTube visitor session unavailable');
        const cookies = headers['set-cookie'] || [];
        session={visitor:match[1],cookie:cookies.map(c=>c.split(';')[0]).filter(c=>/^(?:VISITOR_INFO1_LIVE|VISITOR_PRIVACY_METADATA|YSC|__Secure-YEC)=/.test(c)).join('; '),until:now()+10*60*1000};
        log('native-session-ready',{ms:now()-start});
        return session;
      }).catch(error=>{log('native-session-error',{reason:error.message,code:error.code});blockedUntil=now()+30000;throw error;}).finally(()=>{sessionJob=null;});
    }
    return sessionJob;
  }
  function untilAbort(promise,signal) {
    if (!signal) return promise;
    return new Promise((resolve,reject) => {
      if (signal.aborted) return reject(abortError());
      const abort = () => {signal.removeEventListener('abort',abort);reject(abortError());};
      signal.addEventListener('abort',abort,{once:true});
      promise.then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
    });
  }
  async function resolve(args,options={}) {
    const id=videoId(args.at(-1));
    if (!id || !['playback','prefetch'].includes(options.purpose) || !args.includes('-J') || !args.includes('-f')) throw new Error('Not a playback URL request');
    if (options.signal?.aborted) throw abortError();
    if ((failures.get(id)||0)>now()) throw new Error('Native audio unavailable for this song');
    const start=now(), controller=new AbortController();
    let timedOut=false;
    const cancel=()=>controller.abort();
    options.signal?.addEventListener('abort',cancel,{once:true});
    const deadline=setTimeout(()=>{timedOut=true;controller.abort();},budgetMs);
    try {
      const current=await untilAbort(warm(),controller.signal);
      const {text}=await request(ORIGIN+'/youtubei/v1/player?prettyPrint=false', {signal:controller.signal,
        headers:{Origin:ORIGIN,'X-YouTube-Client-Name':'101','X-YouTube-Client-Version':'1.02','X-Goog-Visitor-Id':current.visitor,...(current.cookie?{Cookie:current.cookie}:{})},
        body:{context:{client:{clientName:'VISIONOS',clientVersion:'1.02',deviceMake:'Apple',deviceModel:'RealityDevice17,1',userAgent:UA,osName:'visionOS',osVersion:'26.5.23O471',hl:'en',gl:'US',visitorData:current.visitor}},
          videoId:id,contentCheckOk:true,racyCheckOk:true,playbackContext:{contentPlaybackContext:{html5Preference:'HTML5_PREF_WANTS'}}}
      });
      log('native-player-ready',{id,ms:now()-start});
      const info=selectAudio(JSON.parse(text),id,String(args[args.indexOf('-f')+1]||''));
      // Verify actual bytes before returning so denied/expired URLs use established recovery.
      await request(info.url,{signal:controller.signal,probe:true,headers:{...info.http_headers,Range:'bytes=0-1023'}});
      consecutiveFailures=0;failures.delete(id);
      log('native-ready',{id,ms:now()-start});
      return {stdout:JSON.stringify(info),stderr:'',attempt:'native'};
    } catch(error) {
      if (options.signal?.aborted) error=abortError();
      else if (timedOut) error=new Error('Native audio deadline');
      if (error.name!=='AbortError') {
        failures.set(id,now()+30000);
        while(failures.size>64)failures.delete(failures.keys().next().value);
        // One unavailable/slow video must not disable fast playback for every song.
        // Repeated failures still back off so a broken provider adds no ongoing delay.
        if(++consecutiveFailures>=2){session=null;blockedUntil=now()+30000;}
      }
      throw error;
    } finally {
      clearTimeout(deadline);options.signal?.removeEventListener('abort',cancel);
    }
  }
  function close() {closed=true;for(const cancel of active.values())cancel();active.clear();agent.destroy();session=null;failures.clear();}
  return {resolve,warm,close};
}
function createPlaybackFastLane(native, fallback, {log=()=>{}}={}) {
  return async (executable,args,options={}) => {
    if (!['playback','prefetch'].includes(options.purpose) || !args.includes('-J') || !args.includes('-f') || !videoId(args.at(-1))) return fallback(executable,args,options);
    try { return await native.resolve(args,options); }
    catch(error) {
      if (error.name==='AbortError' || options.signal?.aborted) throw abortError();
      log('native-fallback',{reason:error.message});
      return fallback(executable,args,options);
    }
  };
}
module.exports={createNativeAudioResolver,createPlaybackFastLane,videoId,selectAudio};
