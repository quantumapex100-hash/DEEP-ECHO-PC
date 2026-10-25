// Adapt Chromium's fetch stream to the existing Node HTTP relay with cancellation.
const {EventEmitter}=require('events');
const {Readable}=require('stream');
function chromiumAudioRequest(net,url,options,onResponse){
 const request=new EventEmitter(),controller=new AbortController();let responseBody;
 request.destroy=()=>{controller.abort();responseBody?.destroy();};
 request.end=()=>{
  net.fetch(url,{method:options.method,headers:options.headers,redirect:'manual',signal:controller.signal}).then(response=>{
   responseBody=response.body?Readable.fromWeb(response.body):Readable.from([]);
   responseBody.statusCode=response.status;responseBody.headers=Object.fromEntries(response.headers);
   onResponse(responseBody);
  }).catch(error=>request.emit('error',error));
 };
 return request;
}
module.exports={chromiumAudioRequest};
