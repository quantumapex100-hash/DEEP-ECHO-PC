const test=require('node:test'),assert=require('node:assert/strict'),http=require('http');const {createPlaybackRelay,advertisedRoutes}=require('../lib/playback-relay');
test('CDN alternatives come only from the signed source advertised shards; path/query are preserved',()=>{
 const source='https://rr1---sn-dead.googlevideo.com/videoplayback?mn=sn-dead,sn-live&sig=abc%2B123&expire=9999999999';const routes=advertisedRoutes(source);assert.equal(routes.length,2);assert.equal(new URL(routes[1]).hostname,'rr1---sn-live.googlevideo.com');assert.equal(new URL(routes[1]).search,new URL(source).search);assert.equal(new URL(routes[1]).pathname,'/videoplayback');
 assert.deepEqual(advertisedRoutes('https://other.example/audio?mn=evil.example'),['https://other.example/audio?mn=evil.example']);assert.equal(advertisedRoutes('https://rr1---sn-dead.googlevideo.com/audio?mn=sn-dead,evil.example').length,1);
});
test('a stalled primary CDN cannot block the advertised alternate; subsequent songs and seeks reuse the successful route',async t=>{
 let primary=0,final=0;const server=http.createServer((req,res)=>{if(req.url==='/primary'){primary++;return;}if(req.url==='/alternate'){res.writeHead(302,{Location:'https://rr3---sn-final.googlevideo.com/videoplayback?sig=unchanged'});res.end();return;}final++;res.writeHead(206,{'Content-Type':'audio/webm','Content-Length':8,'Content-Range':'bytes 0-7/8'});res.end('ABCDEFGH');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const relay=createPlaybackRelay({timeoutMs:2000,request(url,options,response){const u=new URL(url);const route=u.hostname.includes('sn-dead')?'primary':u.hostname.includes('sn-live')?'alternate':'final';return http.request(`http://127.0.0.1:${server.address().port}/${route}`,options,response);}});
 t.after(()=>{relay.close();server.closeAllConnections();server.close();});
 const source=song=>`https://rr1---sn-dead.googlevideo.com/videoplayback?mn=sn-dead,sn-live&song=${song}`;
 const consume=url=>new Promise((resolve,reject)=>http.get(url,{headers:{Range:'bytes=0-7'}},res=>{assert.equal(res.statusCode,206);res.resume();res.on('end',resolve);}).on('error',reject));
 const first=await relay.register({url:source(1)}),start=performance.now();await consume(first);assert.ok(performance.now()-start<1500,'alternate wins before primary timeout');assert.equal(primary,1);
 await consume(first);assert.equal(primary,1,'seek reuses the successful redirect destination');
 const second=await relay.register({url:source(2)});await consume(second);await new Promise(r=>setTimeout(r,400));assert.equal(primary,1,'learned advertised shard is preferred for the next track');assert.equal(final,3);
});
