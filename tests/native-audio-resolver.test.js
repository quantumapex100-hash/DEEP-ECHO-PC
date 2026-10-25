const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const {createNativeAudioResolver,createPlaybackFastLane,selectAudio,videoId}=require('../lib/native-audio-resolver');
test('main changes are confined to the playback fast-lane wrapper; all original handlers remain byte-identical',()=>{
  const fs=require('node:fs'),crypto=require('node:crypto'),main=fs.readFileSync('main.js');
  const start=main.indexOf(Buffer.from('const {createNativeAudioResolver,createPlaybackFastLane}='));
  const endMark=Buffer.from("app.on('will-quit',()=>nativeAudioResolver.close());");
  const end=main.indexOf(endMark,start)+endMark.length;assert.ok(start>0&&end>start);
  const original=Buffer.from('function runYtDlpSmart(executable, args, options = {}) {\n  return runYtDlpSmartBase(selectFastRuntime(executable, options), args, options);\n}');
  const unchanged=Buffer.concat([main.subarray(0,start),original,main.subarray(end)]);
  assert.equal(crypto.createHash('sha256').update(unchanged).digest('hex'),'8368d26c12596563249ebfb465afe8b0c1ff0df08753be98cc35b014de0cf7d9');
});
const id='1ncISVNNzZg',url='https://www.youtube.com/watch?v='+id;
const audio=(itag,mimeType,bitrate)=>({itag,mimeType,bitrate,url:`https://rr1---sn-test.googlevideo.com/videoplayback?itag=${itag}`});
const response=()=>({playabilityStatus:{status:'OK'},videoDetails:{videoId:id,lengthSeconds:'210'},streamingData:{adaptiveFormats:[audio(139,'audio/mp4; codecs="mp4a.40.5"',48000),audio(140,'audio/mp4; codecs="mp4a.40.2"',128000),audio(251,'audio/webm; codecs="opus"',160000)]}});
const args=['-f','bestaudio[ext=m4a]','-J',url],options={purpose:'playback'};
function fixture(t, route=()=>({}), config={}) {
  const calls=[];
  const request=(url,opts,callback)=>{
    const req=new EventEmitter();req.destroyed=false;
    req.end=body=>{
      const call={url,opts,body:body?JSON.parse(body):null};calls.push(call);
      const result=route(call);
      if(result.hang)return;
      setTimeout(()=>{
        if(req.destroyed)return;
        const res=new PassThrough();req.response=res;res.statusCode=result.status||(url.includes('googlevideo.com')?206:200);
        res.headers=result.headers||{};
        callback(res);
        if(res.destroyed)return;
        const value=result.body!==undefined?result.body:url.endsWith('/')?'ytcfg.set({"VISITOR_DATA":"test-visitor"});':url.includes('/player?')?JSON.stringify(response()):'audio bytes';
        if(result.stayOpen)res.write(value);else res.end(value);
      },result.delay||0);
    };
    req.destroy=error=>{req.destroyed=true;req.response?.destroy();if(error)queueMicrotask(()=>req.emit('error',error));return req;};
    return req;
  };
  const native=createNativeAudioResolver({request,...config});t.after(()=>native.close());
  return {native,calls};
}
test('native fast lane verifies audio bytes, keeps normal AAC quality and shares one visitor connection session',async t=>{
  const {native,calls}=fixture(t);
  await Promise.all([native.warm(),native.warm()]);
  const a=JSON.parse((await native.resolve(args,options)).stdout),b=JSON.parse((await native.resolve(args,options)).stdout);
  assert.equal(a.format_id,'140');assert.equal(a.abr,128);assert.equal(b.format_id,'140');assert.equal(a.formats.length,3);
  assert.equal(calls.filter(c=>c.url==='https://www.youtube.com/').length,1);
  const players=calls.filter(c=>c.body);assert.equal(players.length,2);
  assert.equal(players[0].body.videoId,id);assert.equal(players[0].opts.headers['X-Goog-Visitor-Id'],'test-visitor');
  assert.equal(calls.at(-1).opts.headers.Range,'bytes=0-1023');
  assert.equal(calls[0].opts.agent,calls[2].opts.agent,'connection pool is reused');
});
test('selection respects data quality and rejects mismatched, live, protected and cipher-only responses',()=>{
  assert.equal(selectAudio(response(),id,'bestaudio[abr<=96]').format_id,'139');
  for(const mutate of [r=>r.videoDetails.videoId='other-id',r=>r.videoDetails.isLiveContent=true,r=>r.playabilityStatus.status='LOGIN_REQUIRED',r=>r.streamingData.licenseInfos=[{}],r=>r.streamingData.adaptiveFormats.forEach(f=>f.signatureCipher='cipher'),r=>r.streamingData.adaptiveFormats.forEach(f=>f.url='https://attacker.invalid/audio')]){
    const r=response();mutate(r);assert.throws(()=>selectAudio(r,id,''));
  }
});
test('session bootstrap stops at visitor metadata without waiting for the homepage feed to finish',async t=>{
  const {native,calls}=fixture(t,c=>c.url.endsWith('/')?{body:'prefix {"VISITOR_DATA":"early-visitor"}',stayOpen:true}:{});
  await native.warm();
  const info=JSON.parse((await native.resolve(args,options)).stdout);
  assert.equal(info.format_id,'140');assert.equal(calls.find(c=>c.body).opts.headers['X-Goog-Visitor-Id'],'early-visitor');
});
test('downloads, captions, searches, classic recovery and non-YouTube URLs use the original resolver directly',async()=>{
  let nativeCalls=0,fallbackCalls=0;const lane=createPlaybackFastLane({resolve:()=>{nativeCalls++;}},async()=>{fallbackCalls++;return 'original';});
  for(const purpose of ['search','download','captions','classic-playback','generic'])assert.equal(await lane('exe',args,{purpose}),'original');
  assert.equal(await lane('exe',['-f','audio','-J','https://example.com/watch?v='+id],options),'original');
  assert.equal(await lane('exe',['-f','audio','-g',url],options),'original');
  assert.equal(nativeCalls,0);assert.equal(fallbackCalls,7);
  assert.equal(videoId('https://www.youtube.com.evil.invalid/watch?v='+id),'');assert.equal(videoId('https://youtu.be/'+id),id);
});
test('native success avoids subprocess startup; a denied media URL falls back once and cools down',async t=>{
  let fallbackCalls=0;
  const {native,calls}=fixture(t,c=>c.url.includes('googlevideo.com')?{status:403}:{});
  const lane=createPlaybackFastLane(native,async()=>{fallbackCalls++;return 'original';});
  assert.equal(await lane('exe',args,options),'original');const count=calls.length;
  assert.equal(await lane('exe',args,options),'original');assert.equal(calls.length,count);assert.equal(fallbackCalls,2);
  const working=fixture(t).native;
  const fast=createPlaybackFastLane(working,()=>{throw new Error('Subprocess should not run');});
  assert.equal((await fast('exe',args,options)).attempt,'native');
});
test('Next cancellation during shared session warmup returns immediately without starting stale fallback',async t=>{
  let fallbacks=0;const {native,calls}=fixture(t,()=>({delay:80}));
  const lane=createPlaybackFastLane(native,()=>{fallbacks++;});const controller=new AbortController();
  const job=lane('exe',args,{...options,signal:controller.signal});controller.abort();
  await assert.rejects(job,{name:'AbortError'});assert.equal(fallbacks,0);assert.equal(calls.length,1);
  await native.warm();assert.equal(calls.length,1,'shared session survives a superseded song');
});
test('a slow API has one bounded native deadline then the original fallback runs',async t=>{
  let fallback=0;const {native}=fixture(t,c=>c.body?{hang:true}:{},{budgetMs:35,timeoutMs:500});
  const lane=createPlaybackFastLane(native,async()=>{fallback++;return 'recovered';});
  assert.equal(await lane('exe',args,options),'recovered');assert.equal(fallback,1);
});
test('cancelling a song during media verification keeps the session ready for the next song',async t=>{
  let probes=0;
  const {native,calls}=fixture(t,c=>c.url.includes('googlevideo.com')&&++probes===1?{delay:100}:{});
  await native.warm();const controller=new AbortController();const pending=native.resolve(args,{...options,signal:controller.signal});
  while(probes===0)await new Promise(r=>setTimeout(r,2));controller.abort();
  await assert.rejects(pending,{name:'AbortError'});
  assert.equal((await native.resolve(args,options)).attempt,'native');assert.equal(calls.filter(c=>c.url.endsWith('/')).length,1);
});
test('one restricted song falls back without disabling the fast path for another song',async t=>{
  const second='ji1TIBybjp4';
  const {native,calls}=fixture(t,c=>{
    if(!c.body)return {};
    const r=response();r.videoDetails.videoId=c.body.videoId;
    if(c.body.videoId===id)r.playabilityStatus.status='LOGIN_REQUIRED';
    return {body:JSON.stringify(r)};
  });
  let fallbacks=0;const lane=createPlaybackFastLane(native,async()=>{fallbacks++;return 'original';});
  assert.equal(await lane('exe',args,options),'original');
  assert.equal((await lane('exe',[...args.slice(0,-1),'https://www.youtube.com/watch?v='+second],options)).attempt,'native');
  assert.equal(fallbacks,1);assert.equal(calls.filter(c=>c.url.endsWith('/')).length,1);
});
test('closing the resolver cancels pending work without launching fallback subprocesses',async t=>{
  const {native}=fixture(t,()=>({hang:true}));let fallbacks=0;
  const lane=createPlaybackFastLane(native,()=>{fallbacks++;});
  const pending=lane('exe',args,options);native.close();
  await assert.rejects(pending,{name:'AbortError'});assert.equal(fallbacks,0);
});
test('media redirects remain on validated HTTPS audio origins and preserve range headers',async t=>{
  let probes=0;const {native,calls}=fixture(t,c=>{
    if(!c.url.includes('googlevideo.com'))return {};
    if(++probes===1)return {status:302,headers:{location:'https://rr2---sn-test.googlevideo.com/audio'}};
    return {};
  });
  await native.resolve(args,options);assert.equal(probes,2);assert.equal(calls.at(-1).opts.headers.Range,'bytes=0-1023');
  const blocked=fixture(t,c=>c.url.includes('googlevideo.com')?{status:302,headers:{location:'http://127.0.0.1/private'}}:{});
  await assert.rejects(blocked.native.resolve(args,options),/Invalid audio redirect/);
  assert.equal(blocked.calls.length,3);
});
