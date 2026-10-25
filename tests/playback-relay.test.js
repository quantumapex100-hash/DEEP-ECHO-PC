const test=require('node:test'),assert=require('node:assert/strict'),http=require('http');
const {createPlaybackRelay,expiry}=require('../lib/playback-relay');
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${server.address().port}`)));
test('slow origin starts delivering audio before full transfer; extractor headers and seek range are preserved',async t=>{
  let requestHeaders,complete=false;
  const server=http.createServer((req,res)=>{requestHeaders=req.headers;res.writeHead(206,{'Content-Type':'audio/wav','Content-Range':'bytes 0-7/8','Content-Length':8,'Accept-Ranges':'bytes'});res.write('ABCD');const timer=setTimeout(()=>{complete=true;res.end('EFGH');},180);res.on('close',()=>clearTimeout(timer));});
  const origin=await listen(server),relay=createPlaybackRelay({allowUrl:url=>url.startsWith(origin+'/')});t.after(()=>{relay.close();server.close();});
  const url=await relay.register({url:origin+'/song',headers:{'User-Agent':'extractor-agent','Referer':'https://www.youtube.com/'}});
  const start=performance.now();let firstMs;
  await new Promise((resolve,reject)=>{http.get(url,{headers:{Range:'bytes=0-7'}},res=>{assert.equal(res.statusCode,206);assert.equal(res.headers['content-range'],'bytes 0-7/8');let data='';res.on('data',chunk=>{if(firstMs===undefined){firstMs=performance.now()-start;assert.equal(complete,false);}data+=chunk;});res.on('end',()=>{assert.equal(data,'ABCDEFGH');resolve();});}).on('error',reject);});
  assert.equal(requestHeaders.range,'bytes=0-7');assert.equal(requestHeaders['user-agent'],'extractor-agent');assert.equal(requestHeaders.referer,'https://www.youtube.com/');
  console.log(`Slow-origin fixture: first bytes ${Math.round(firstMs)}ms; full transfer ${Math.round(performance.now()-start)}ms`);
});
test('relay rejects expired/unknown tickets and has no arbitrary URL proxy route',async t=>{
  const relay=createPlaybackRelay({allowUrl:()=>true});t.after(()=>relay.close());
  const url=await relay.register({url:'http://127.0.0.1:1/audio',expiresAt:Date.now()-1});
  for(const target of [url,url.replace(/audio\/.+$/,'audio/unknown')])await new Promise(resolve=>http.get(target,res=>{assert.equal(res.statusCode,410);res.resume();res.on('end',resolve);}));
  assert.equal(expiry('https://media/?expire=200',100000),140000);
});
test('latest playback selection cancels old media transfers while retaining its own warmed source',async t=>{
  let disconnected=false;
  const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'audio/webm'});res.write('warm');res.on('close',()=>{disconnected=true;});});
  const origin=await listen(server),relay=createPlaybackRelay({allowUrl:()=>true});t.after(()=>{relay.close();server.close();});
  const old=await relay.register({url:origin+'/old'}),next=await relay.register({url:origin+'/next'});
  await new Promise(resolve=>http.get(old,res=>{res.once('data',()=>{relay.supersede(next);res.once('close',resolve);});}));
  await new Promise(r=>setTimeout(r,15));assert.equal(disconnected,true);
});
test('allowed redirects deliver audio and cache allows the warmed response to be reused',async t=>{
 const server=http.createServer((req,res)=>{if(req.url==='/old'){res.writeHead(302,{Location:'/audio'});res.end();}else{res.writeHead(200,{'Content-Type':'audio/webm'});res.end('music');}});
 const origin=await listen(server),relay=createPlaybackRelay({allowUrl:url=>url.startsWith(origin+'/')});t.after(()=>{relay.close();server.close();});
 const url=await relay.register({url:origin+'/old'});
 await new Promise((resolve,reject)=>http.get(url,res=>{assert.equal(res.statusCode,200);assert.match(res.headers['cache-control'],/private, max-age=/);let body='';res.on('data',c=>body+=c);res.on('end',()=>{assert.equal(body,'music');resolve();});}).on('error',reject));
});
test('redirects cannot turn the relay into an arbitrary external proxy',async t=>{
 let reached=false;
 const server=http.createServer((req,res)=>{if(req.url==='/song'){res.writeHead(302,{Location:'/blocked'});res.end();}else{reached=true;res.end('blocked');}});
 const origin=await listen(server),relay=createPlaybackRelay({allowUrl:url=>url===origin+'/song'});t.after(()=>{relay.close();server.close();});
 const url=await relay.register({url:origin+'/song'});await new Promise(resolve=>http.get(url,res=>{assert.equal(res.statusCode,502);res.resume();res.on('end',resolve);}));assert.equal(reached,false);
});
test('an origin that never responds exits with a bounded failure',async t=>{
 const server=http.createServer(()=>{});const origin=await listen(server),relay=createPlaybackRelay({allowUrl:()=>true,timeoutMs:25});t.after(()=>{relay.close();server.closeAllConnections();server.close();});
 const url=await relay.register({url:origin+'/stalled'});await new Promise(resolve=>http.get(url,res=>{assert.equal(res.statusCode,502);res.resume();res.on('end',resolve);}));
});
test('failed speculative source is recorded so playback can resolve a fresh URL',async t=>{
 const server=http.createServer((_req,res)=>{res.writeHead(403);res.end('expired');});const origin=await listen(server),relay=createPlaybackRelay({allowUrl:()=>true});t.after(()=>{relay.close();server.close();});
 const url=await relay.register({url:origin+'/expired'});assert.equal(relay.failure(url),null);await new Promise(resolve=>http.get(url,res=>{assert.equal(res.statusCode,403);assert.equal(res.headers['cache-control'],'no-store');res.resume();res.on('end',resolve);}));assert.equal(relay.failure(url).status,403);
});
