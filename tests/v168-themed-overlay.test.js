const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pkg=require('../package.json');
const index=fs.readFileSync('src/index.html','utf8');
const css=fs.readFileSync('src/v168-lyrics-visuals.css','utf8');
const floatingHtml=fs.readFileSync('src/floating-lyrics.html','utf8');
const floatingJs=fs.readFileSync('src/floating-lyrics.js','utf8');
const floatingCss=fs.readFileSync('src/floating-lyrics.css','utf8');
const tools=fs.readFileSync('src/v150-tools.js','utf8');
const main=fs.readFileSync('main.js','utf8');

test('v1.6.8 keeps lyric timing separate and loads presentation-only theme layer',()=>{
  assert.equal(pkg.version,'2.1.0');
  assert.match(index,/v168-lyrics-visuals\.css/);
  for(const theme of ['golden','light','dark','purple','toxic','blood','silver','transparent','fluids','rgb','love','space']){
    assert.ok(css.includes(`data-theme="${theme}"`),`missing ${theme}`);
  }
  assert.match(css,/presentation-only themed lyric accents/);
});

test('floating overlay has responsive real-audio graph and local toggle',()=>{
  assert.match(floatingHtml,/id="floatingGraphCanvas"/);
  assert.match(floatingHtml,/id="floatingGraph"/);
  assert.match(floatingJs,/new ResizeObserver/);
  assert.match(floatingJs,/Math\.round\(rect\.width \/ (?:9|4\.8)\)/);
  assert.match(floatingJs,/state\.spectrum/);
  assert.match(floatingJs,/audioGraph/);
  assert.match(floatingCss,/\.floating-graph/);
  assert.match(floatingCss,/graph-off/);
});

test('graph packets come from existing FFT analyser, not fake/random animation',()=>{
  assert.match(tools,/function floatingGraphPacket/);
  assert.match(tools,/readAudioEnergy/);
  assert.match(tools,/visualizerSmoothedSpectrum/);
  assert.match(tools,/const count = 192/);
  assert.match(tools,/if \(floatingEnabled && floatingGraphEnabled\) pushFloatingLyrics\(false\)/);
  assert.doesNotMatch(tools,/Math\.random\(\).*spectrum/);
});

test('floating overlay starts nearly full-workarea width with capped height',()=>{
  assert.match(main,/area\.width - 28/);
  assert.match(main,/maxHeight: floatingBounds\.maxHeight/);
  assert.match(main,/minHeight: 108/);
});
