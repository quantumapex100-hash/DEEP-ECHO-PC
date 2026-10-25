const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { cleanTitle, guessArtistTitle, chooseMatch, getLyrics } = require('../lib/lyrics');
const { parseProgress, runTransfer } = require('../lib/transfer');
test('uploader does not replace artist; meaningful version is retained', () => {
  assert.deepEqual(guessArtistTitle({ title: 'Doechii - What It Is (Solo Version) (Lyrics)', channel: 'Rap Samurai' }), { artist: 'Doechii', title: 'What It Is (Solo Version)' });
  assert.equal(cleanTitle('Track (Live) [Official Video]'), 'Track (Live)');
  assert.equal(guessArtistTitle({ title: 'Track', channel: 'Singer - Topic' }).artist, 'Singer');
});
test('matching rejects covers, wrong artists and wrong versions', () => {
  const meta = { artist: 'Singer', title: 'Track (Solo Version)' };
  const row = { artistName: 'Singer', trackName: meta.title, plainLyrics: 'test', duration: 190 };
  assert.equal(chooseMatch([{...row, artistName:'Cover Band'}, {...row, trackName:'Track'}, row], meta, 190), row);
});
test('lookup tries search after exact lookup and returns synchronized lyrics', async () => {
  const urls = [];
  const out = await getLyrics({ title: 'Singer - Track' }, async url => {
    urls.push(url);
    return url.includes('/get?') ? {ok:false,status:404} : {ok:true,json:async()=>[{artistName:'Singer',trackName:'Track',syncedLyrics:'[00:01]Hello'}]};
  });
  assert.equal(out.source, 'LRCLIB'); assert.ok(out.syncedLyrics); assert.equal(urls.length, 2);
});
test('lyrics fallback and network errors are retryable', async () => {
  const out = await getLyrics({title:'Singer - Track'}, async url => url.includes('lyrics.ovh') ? {ok:true,json:async()=>({lyrics:'Fallback'})} : {ok:false,status:404});
  assert.equal(out.lyrics, 'Fallback');
  const fail = await getLyrics({title:'Track'}, async () => {throw Error('offline');});
  assert.match(fail.error,/Retry/);
});
test('progress marker, unknown total and clamping', () => {
  assert.equal(parseProgress('[download] blah'), null);
  assert.deepEqual(parseProgress('AF_PROGRESS: 52.3%|1 MiB/s|00:02'), {percent:52.3,speed:'1 MiB/s',eta:'00:02'});
  assert.equal(parseProgress('AF_PROGRESS:N/A||').percent,null);
  assert.equal(parseProgress('AF_PROGRESS:102%||').percent,100);
});
test('transfer reads split chunks and both streams; correct template type and literal prefix', async () => {
  const updates=[];
  await runTransfer('test', {url:'https://example.test/song'}, 'out', p=>updates.push(p), (_exe,args) => {
    assert.ok(args.includes('download:AF_PROGRESS:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s'));
    assert.ok(!args.includes('--no-part'));
    const child=new EventEmitter(); child.stdout=new EventEmitter(); child.stderr=new EventEmitter();
    process.nextTick(()=>{child.stdout.emit('data','AF_PRO');child.stdout.emit('data','GRESS:25%|1 MB/s|3\n');child.stderr.emit('data','AF_PROGRESS:100%||\n');child.emit('close',0);});
    return child;
  });
  assert.deepEqual(updates.map(p=>p.percent),[25,100]);
});
test('failed transfer rejects and never declares success', async () => {
  await assert.rejects(runTransfer('test',{url:'https://example.test/song'},'out',()=>{},()=>{
    const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();
    process.nextTick(()=>{child.stderr.emit('data','connection failed');child.emit('close',1);});return child;
  }),/connection failed/);
});
