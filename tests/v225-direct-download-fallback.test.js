const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { downloadDirectAudio, directExtension, directOutputPath } = require('../lib/transfer');

test('v2.2.5 direct fallback keeps YouTube audio container extension', () => {
  assert.equal(directExtension('https://example.test/a?mime=audio%2Fmp4'), 'm4a');
  assert.equal(directExtension('https://example.test/a?mime=audio%2Fwebm'), 'webm');
  assert.equal(directOutputPath('Song.%(ext)s', 'webm'), 'Song.webm');
});

test('v2.2.5 direct fallback writes resolved playback bytes and reports completion', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deepecho-direct-'));
  const target = path.join(dir, 'song.%(ext)s');
  const updates = [];
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1,2,3,4]));
      controller.enqueue(new Uint8Array([5,6]));
      controller.close();
    }
  });
  const fetchImpl = async () => new Response(body, {
    status: 200,
    headers: { 'content-type':'audio/mp4', 'content-length':'6' }
  });
  const out = await downloadDirectAudio('https://example.test/audio', target, p => updates.push(p.percent), { fetchImpl });
  assert.equal(path.extname(out), '.m4a');
  assert.deepEqual([...fs.readFileSync(out)], [1,2,3,4,5,6]);
  assert.equal(Math.round(updates.at(-1)), 100);
  fs.rmSync(dir, { recursive:true, force:true });
});

test('v2.2.5 main download recovery reuses resolved playback stream after yt-dlp verification block', () => {
  const root = path.join(__dirname, '..');
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.match(main, /const streamUrl = await resolveStreamUrl\(song, streamQuality\)/);
  assert.match(main, /await downloadDirectAudio\(streamUrl, outputTemplate, report/);
  assert.match(main, /recovered from resolved playback stream/);
});
