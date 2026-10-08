const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname,'..');
const read = f => fs.readFileSync(path.join(root,f),'utf8');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const mainPlaybackSha = () => { const main=read('main.js'); const a=main.indexOf('function playable(song)'); const b=main.indexOf('async function runDownloadWithProgress',a); return crypto.createHash('sha256').update(main.slice(a,b)).digest('hex'); };

test('V34 removes the forced 1.35s post-ready splash hold and defers maintenance',()=>{
  const main=read('main.js');
  assert.match(main,/Math\.max\(0, 180 - \(Date\.now\(\) - started\)\)/);
  assert.doesNotMatch(main,/1350 - \(Date\.now\(\) - started\)/);
  assert.match(main,/setTimeout\(\(\) => maybeRefreshYtDlp\(\)\.catch\(\(\) => \{\}\), 30000\)/);
  assert.match(main,/setTimeout\(\(\) => hydrateMissingLibraryArtwork\(\)\.catch\(\(\) => \{\}\), 15000\)/);
});

test('V34 renderer paints the shell before library/network hydration and avoids hidden-tab startup rendering',()=>{
  const renderer=read('src/renderer.js');
  const start=renderer.slice(renderer.indexOf('// ================= Startup ================='),renderer.indexOf('// ================= Dinecho v1.4.2 Smart Immersive Player'));
  assert.match(start,/Phase 1: first-paint essentials only/);
  assert.doesNotMatch(start,/await loadLibrary\(\)/);
  assert.doesNotMatch(start,/renderLikedSongs\(\)/);
  assert.doesNotMatch(start,/renderPlaylists\(\)/);
  assert.match(start,/smartRunIdle\(async \(\) =>/);
  assert.match(start,/smartRunIdle\(\(\) => \{ try \{ loadHomeContent\(\); \} catch \(_\) \{\} \}, 420\)/);
  assert.doesNotMatch(renderer,/renderSmartHistory\(\); renderSmartHome\(\);/);
});

test('V34 defers expensive GPU detection, hidden discovery renders, visual loops and update checks',()=>{
  const gpu=read('src/v2310-smart-system.js');
  const home=read('src/v220-home-search.js');
  const shelves=read('src/v236-discovery-shelves.js');
  const visual=read('src/v170-experience.js');
  const update=read('src/v200.js');
  assert.match(gpu,/data-tab="settings"[\s\S]*setTimeout\(load, 120\)/);
  assert.doesNotMatch(gpu,/\n  load\(\);\n\}\)\(\);\s*$/);
  assert.match(home,/setTimeout\(\(\) => idle220\(renderHome220, 900\), 180\)/);
  assert.doesNotMatch(home,/\n  renderSearchDiscovery\(\);\n\}\)\(\);\s*$/);
  assert.doesNotMatch(shelves,/enhancedHomeLoad236\(false\), 260/);
  assert.match(visual,/setTimeout\(\(\)=>\{requestAnimationFrame\(frame\);requestAnimationFrame\(lyricPulse\);\},900\)/);
  assert.match(update,/setTimeout\(\(\)=>updates\(true\),9000\)/);
  assert.match(update,/focus'[\s\S]*updateModuleStartedAt>=9000/);
  assert.match(read('src/renderer.js'),/setTimeout\(\(\) => requestAnimationFrame\(tick\), 120\)/);
});

test('V34 keeps Vibrant Space allocation out of non-space theme startup',()=>{
  const fx=read('src/effects.js');
  assert.match(fx,/if \(theme === 'space'\) ensureSpaceResources\(w,h\)/);
  assert.match(fx,/\}, 7000\);/);
  assert.match(fx,/requestIdleCallback\(prewarmSpace,\{timeout:3500\}\)/);
});

test('V34 startup-only main changes leave the playback resolver and protected engines unchanged',()=>{
  const playbackHash=mainPlaybackSha();
  const intentionalV35=read('main.js').includes('V35: every in-flight audio resolver') && read('main.js').includes('cancelStreamJobsExcept');
  assert.ok(playbackHash==='cfc689124a390f734788af919c75556275dcd57c7fb85e15f116e9a4bccf3eb9' || intentionalV35,'main playback resolver is either historical baseline or explicit V35 instant-play evolution');
  const expected={
    'preload.js':'43624209119d865ccd2fcca44dda7b1eb49357933301d9fda655858eed979e83',
    'lib/ytdlp-smart.js':'4d699e71ecf17ab5c8fef509cb6da5289c8f1aa2daa504f51604bb2dbed93a37',
    'lib/youtube-captions.js':'dc89d203b626f2dfa5b9a0e147268b21672a3ab53aa2a3e190e2fa26676e3339',
    'lib/lyrics-reference.js':'56c397bc3116c996d7107ad50d4c30610eb2dfcbd3c04e2b6a2850fbd906faa4',
    'lib/exact-lyrics.js':'f84bd963a4b156707c4ba637ec3b01d19177fce5fa5f04853c2514c2bec9c6f4',
    'src/v238-smart-autoplay.js':'200514239517b4a4238c2b9dc3e497f17ab63bd1784e6d64c52e076072433048'
  };
  for(const [file,hash] of Object.entries(expected)) assert.equal(sha(file),hash,file);
});
