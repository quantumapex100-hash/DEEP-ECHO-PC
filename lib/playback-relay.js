// Serve resolved progressive audio as it arrives, retaining extractor headers and byte ranges.
// This is a transport adapter for the existing <audio>, not a second resolver/player.
const http=require('http'),https=require('https'),{randomBytes}=require('crypto');
function expiry(url,now=Date.now()){
  let expires=now+8*60*1000;
  try{const signed=Number(new URL(url).searchParams.get('expire'));if(signed>0)expires=Math.min(expires,signed*1000-60000);}catch{}
  return expires;
}
function advertisedRoutes(url){
  try{
    const source=new URL(url),prefix=/^(rr?\d+)---sn-[a-z0-9-]+\.googlevideo\.com$/i.exec(source.hostname)?.[1];
    if(source.protocol!=='https:'||!prefix)return [url];
    const routes=[url];
    for(const shard of (source.searchParams.get('mn')||'').split(',')){
      if(!/^sn-[a-z0-9-]+$/i.test(shard))continue;
      const candidate=new URL(url);candidate.hostname=`${prefix}---${shard}.googlevideo.com`;
      if(!routes.includes(candidate.href))routes.push(candidate.href);
    }
    return routes.slice(0,2);
  }catch{return [url];}
}
function createPlaybackRelay({request:makeRequest,timeoutMs=10000,log=()=>{},allowUrl=url=>{const u=new URL(url);return u.protocol==='https:'&&/(^|\.)googlevideo\.com$/i.test(u.hostname);}}={}){
  const entries=new Map(),active=new Map(),preferredRoutes=new Map();let server,starting;
  async function start(){
    if(starting)return starting;
    starting=new Promise((resolve,reject)=>{
      server=http.createServer((req,res)=>{void serve(req,res).catch(()=>{if(res.destroyed)return;if(!res.headersSent)res.writeHead(502);res.end();});});
      server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.unref();resolve(server.address().port);});
    });return starting;
  }
  async function register(source){
    if(!allowUrl(source.url))return source.url;
    const port=await start(),token=randomBytes(24).toString('hex');entries.set(token,{...source,expiresAt:source.expiresAt||expiry(source.url)});
    while(entries.size>64)entries.delete(entries.keys().next().value);
    return `http://127.0.0.1:${port}/audio/${token}`;
  }
  function supersede(keepUrl=''){
    for(const [res,state] of active)if(state.localUrl!==keepUrl){state.upstream?.destroy();for(const request of state.pending)request.destroy();res.destroy();active.delete(res);}
  }
  async function serve(req,res){
    const token=/^\/audio\/([a-f0-9]{48})$/.exec(req.url||'')?.[1],entry=entries.get(token);
    if(!entry||entry.expiresAt<=Date.now()){res.writeHead(410);res.end();return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const state={localUrl:`http://127.0.0.1:${server.address().port}${req.url}`,upstream:null,pending:new Set()};active.set(res,state);
    res.on('close',()=>{state.cancelWait?.();state.upstream?.destroy();for(const request of state.pending)request.destroy();active.delete(res);});
    const source=entry;
      const waitMs=Math.max(0,(Number(source.availableAt)||0)-Date.now());
      if(waitMs){
        log('source-wait',{ms:Math.ceil(waitMs)});
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>{state.cancelWait=null;resolve();},waitMs);
          state.cancelWait=()=>{clearTimeout(timer);state.cancelWait=null;reject(Object.assign(new Error('Audio request cancelled'),{name:'AbortError'}));};
        });
      }
      if(res.destroyed)return;
      const open=(url,redirects=0,signal)=>new Promise((resolve,reject)=>{
        if(signal?.aborted||res.destroyed)return reject(Object.assign(new Error('Audio request cancelled'),{name:'AbortError'}));
        if(!allowUrl(url))return reject(new Error('Invalid audio origin'));
        const headers={...source.headers,'Accept-Encoding':'identity'};
        delete headers.Host;delete headers.host;delete headers.Range;delete headers.range;
        if(req.headers.range&&/^bytes=\d*-\d*$/.test(req.headers.range))headers.Range=req.headers.range;
        const transport=new URL(url).protocol==='https:'?https:http;
        const onResponse=response=>{
          clearTimeout(timer);
          if([301,302,303,307,308].includes(response.statusCode)&&response.headers.location){
            response.resume();
            if(redirects>=4)return reject(new Error('Too many audio redirects'));
            return open(new URL(response.headers.location,url).href,redirects+1,signal).then(resolve,reject);
          }
          response.routeUrl=url;
          log('origin-response',{status:response.statusCode});resolve(response);
        };
        const request=makeRequest?makeRequest(url,{method:req.method,headers},onResponse):transport.request(url,{method:req.method,headers},onResponse);state.pending.add(request);
        const timer=setTimeout(()=>{request.destroy();const error=Object.assign(new Error('Audio origin timeout'),{code:'AUDIO_ORIGIN_TIMEOUT'});log('origin-error',{code:error.code});reject(error);},timeoutMs);
        signal?.addEventListener('abort',()=>{clearTimeout(timer);request.destroy();reject(Object.assign(new Error('Audio request cancelled'),{name:'AbortError'}));},{once:true});
        request.on('error',error=>{clearTimeout(timer);if(!signal?.aborted&&error.name!=='AbortError')log('origin-error',{code:error.code||'NETWORK_ERROR'});reject(error);});
        request.end();
      });
      let upstream;
      try{
        const routes=advertisedRoutes(source.url),host=new URL(source.url).hostname,preferred=preferredRoutes.get(host);
        if(preferred&&preferred.until>Date.now())routes.sort(a=>new URL(a).hostname===preferred.hostname?-1:1);
        if(routes.length===1)upstream=await open(routes[0]);
        else{
          const controllers=routes.map(()=>new AbortController()),started=Date.now();
          try{
            const winner=await Promise.any(routes.map(async(url,index)=>{
              if(index)await new Promise(resolve=>setTimeout(resolve,350));
              const response=await open(url,0,controllers[index].signal);
              if(![200,206].includes(response.statusCode)){response.destroy();throw new Error(`Audio route HTTP ${response.statusCode}`);}
              return {response,index,url};
            }));
            controllers.forEach((controller,index)=>{if(index!==winner.index)controller.abort();});
            upstream=winner.response;
            preferredRoutes.set(host,{hostname:new URL(winner.url).hostname,until:Date.now()+5*60*1000});
            while(preferredRoutes.size>32)preferredRoutes.delete(preferredRoutes.keys().next().value);
            log('route-ready',{ms:Date.now()-started,alternate:winner.index!==0});
          }catch(error){controllers.forEach(controller=>controller.abort());throw error;}
        }
      }catch(error){
        if(!res.destroyed)entry.failure={code:error.code||'AUDIO_NETWORK_ERROR'};
        throw error;
      }
      if(res.destroyed){upstream.destroy();return;}
      // Reuse the successful redirect target for seek requests, keeping the signed query intact.
      if(upstream.routeUrl)entry.url=upstream.routeUrl;
      if([200,206].includes(upstream.statusCode))delete entry.failure;
      else entry.failure={status:upstream.statusCode};
      // Warmed media must remain reusable by the real player; no-store discarded it.
      const seconds=Math.max(0,Math.min(300,Math.floor((entry.expiresAt-Date.now())/1000)));
      const headers={'Access-Control-Allow-Origin':'*','Cache-Control':[200,206].includes(upstream.statusCode)?`private, max-age=${seconds}`:'no-store'};
      for(const name of ['content-type','content-length','content-range','accept-ranges'])if(upstream.headers[name])headers[name]=upstream.headers[name];
      res.writeHead(upstream.statusCode||502,headers);state.upstream=upstream;
      upstream.on('error',()=>res.destroy());upstream.pipe(res);return;
  }
  function close(){supersede();entries.clear();server?.close();}
  function failure(url){try{return entries.get(/^\/audio\/([a-f0-9]{48})$/.exec(new URL(url).pathname)?.[1])?.failure||null;}catch{return null;}}
  return {register,supersede,close,failure};
}
module.exports={createPlaybackRelay,expiry,advertisedRoutes};
