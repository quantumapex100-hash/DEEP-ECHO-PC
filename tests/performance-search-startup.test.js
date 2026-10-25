const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { AsyncLocalStorage } = require('async_hooks');

function harness() {
  const calls = [];
  let fail = false, probes = 0, now = 0;
  const child = {
    execFile(exe, args, options, callback) {
      setImmediate(() => {
        if (args[0] === '--version') { probes++; callback(null, { stdout:'v24.0.0' }); }
        else {
          calls.push({ exe, args, options });
          if (fail) callback(new Error('network failed'));
          else callback(null, { stdout:'{"entries":[]}', stderr:'' });
        }
      });
    },
    execFileSync() { throw new Error('Synchronous runtime probe must not run'); }
  };
  // Match util.promisify(execFile)'s named stdout/stderr result.
  child.execFile[require('util').promisify.custom] = (exe,args,options) => new Promise((resolve,reject) =>
    child.execFile(exe,args,options,(error,result) => error ? reject(error) : resolve(result)));
  const context = {
    require: name => name === 'child_process' ? child : name === 'fs' ? { existsSync:()=>false } : require(name),
    module:{ exports:{} }, process, console, Date:{ now:()=>now }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lib/ytdlp-smart.js'),'utf8'),context);
  return { api:context.module.exports, calls, fail:v=>{fail=v;}, advance:()=>{now+=60001;}, probes:()=>probes };
}

test('runtime discovery is asynchronous and shared across concurrent searches', async () => {
  const h=harness();
  await Promise.all(['one','two','three'].map(q=>h.api.runYtDlpSmart('yt-dlp.exe',[q],{purpose:'search'})));
  assert.equal(h.probes(),1);
  assert.equal(h.calls.length,3);
  assert.ok(h.calls.every(c=>c.args.includes('node')));
});

test('identical searches share work and cache briefly; auth/query changes and expiry fetch again', async () => {
  const h=harness(), args=['ytsearch28:song'], options={purpose:'search'};
  const [a,b]=await Promise.all([h.api.runYtDlpSmart('yt-dlp.exe',args,options),h.api.runYtDlpSmart('yt-dlp.exe',args,options)]);
  assert.equal(h.calls.length,1);
  a.stdout='modified'; assert.notEqual(a.stdout,b.stdout);
  await h.api.runYtDlpSmart('yt-dlp.exe',args,options); assert.equal(h.calls.length,1);
  await h.api.runYtDlpSmart('yt-dlp.exe',args,{...options,browserAuth:{enabled:true,browser:'edge'}});
  await h.api.runYtDlpSmart('yt-dlp.exe',['ytsearch28:other'],options);
  h.advance(); await h.api.runYtDlpSmart('yt-dlp.exe',args,options);
  assert.equal(h.calls.length,4);
});

test('search failures retry and playback/download jobs never use the search cache', async () => {
  const h=harness(); h.fail(true);
  await assert.rejects(h.api.runYtDlpSmart('yt-dlp.exe',['song'],{purpose:'search'}));
  h.fail(false); await h.api.runYtDlpSmart('yt-dlp.exe',['song'],{purpose:'search'});
  for(const purpose of ['playback','download']) for(let i=0;i<2;i++) await h.api.runYtDlpSmart('yt-dlp.exe',['song'],{purpose});
  assert.equal(h.calls.length,6);
});

test('aborted requests bypass the search cache', async () => {
  const h=harness(); await h.api.runYtDlpSmart('yt-dlp.exe',['song'],{purpose:'search'});
  const controller=new AbortController(); controller.abort();
  await assert.rejects(h.api.runYtDlpSmart('yt-dlp.exe',['song'],{purpose:'search',signal:controller.signal}),/aborted/i);
});

test('deferred Home card warmup drops stale candidates after a new search', () => {
  const source=fs.readFileSync(path.join(__dirname,'../src/renderer.js'),'utf8');
  const start=source.indexOf('function warmVisibleCards('), end=source.indexOf('async function pumpSearchInstantWarm',start);
  let task, delay, warmed=[];
  const ctx={loadingRequest:null,searchRequest:1, document:{hidden:false}, searchWarmCandidate:()=>true,
    smartRunIdle:(fn,ms)=>{task=fn;delay=ms;}, enqueueSearchInstantWarm:(...args)=>warmed.push(args)};
  vm.createContext(ctx); vm.runInContext(source.slice(start,end),ctx);
  ctx.warmVisibleCards([{id:'a'},{id:'b'}],1);
  assert.equal(delay,1800); assert.equal(warmed.length,0);
  ctx.searchRequest=2; task(); assert.equal(warmed.length,0);
  ctx.warmVisibleCards([{id:'a'}],1); task(); assert.equal(warmed.length,1);
});
