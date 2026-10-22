const test=require('node:test'),assert=require('node:assert/strict');const {chromiumAudioRequest}=require('../lib/electron-audio-request');
test('Chromium adapter streams bytes with status, ranges and extractor headers intact',async()=>{
 let sent;
 await new Promise((resolve,reject)=>{const request=chromiumAudioRequest({fetch:async(url,options)=>{sent=options;return new Response('audio',{status:206,headers:{'Content-Type':'audio/webm','Content-Range':'bytes 0-4/5'}});}},'https://media/audio',{method:'GET',headers:{Range:'bytes=0-4','User-Agent':'extractor'}},res=>{
 assert.equal(res.statusCode,206);assert.equal(res.headers['content-range'],'bytes 0-4/5');let body='';res.on('error',reject);res.on('data',c=>body+=c);res.on('end',()=>{assert.equal(body,'audio');resolve();});});request.on('error',reject);request.end();});
 assert.equal(sent.headers.Range,'bytes=0-4');assert.equal(sent.redirect,'manual');
});
test('Chromium adapter aborts a stalled fetch when the user selects another song',async()=>{
 let signal;
 await new Promise(resolve=>{const request=chromiumAudioRequest({fetch:(_url,options)=>new Promise((_,reject)=>{signal=options.signal;signal.addEventListener('abort',()=>reject(new Error('cancelled')));})},'https://media/audio',{method:'GET',headers:{}},()=>assert.fail('cancelled response'));request.on('error',error=>{assert.match(error.message,/cancelled/);resolve();});request.end();request.destroy();});assert.equal(signal.aborted,true);
});
