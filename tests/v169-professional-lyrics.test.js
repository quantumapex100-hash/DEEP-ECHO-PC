const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pkg=require('../package.json');
const index=fs.readFileSync('src/index.html','utf8');
const css=fs.readFileSync('src/v169-pro-lyrics.css','utf8');
const bridge=fs.readFileSync('src/v169-lyrics-presentation.js','utf8');
const floatingJs=fs.readFileSync('src/floating-lyrics.js','utf8');
const floatingCss=fs.readFileSync('src/floating-lyrics.css','utf8');
const tools=fs.readFileSync('src/v150-tools.js','utf8');

test('v1.6.9 adds presentation-only audio-reactive lyric bridge without timing ownership',()=>{
  assert.equal(pkg.version,'2.1.0');
  assert.match(index,/v169-pro-lyrics\.css/);
  assert.match(index,/v169-lyrics-presentation\.js/);
  assert.match(bridge,/window\.__dinechoAudioEnergy/);
  assert.match(bridge,/--lyric-bounce-y/);
  assert.doesNotMatch(bridge,/currentTime\s*=/);
  assert.doesNotMatch(bridge,/lyricLines\s*=/);
});

test('current lyric is free-form and theme particle personalities cover all themes',()=>{
  assert.match(css,/background:transparent!important/);
  assert.match(css,/overflow:visible!important/);
  assert.match(css,/--lyric-bounce-scale/);
  for(const theme of ['golden','light','dark','purple','toxic','blood','silver','transparent','fluids','rgb','love','space']){
    assert.ok(css.includes(`data-theme="${theme}"`),`missing ${theme}`);
  }
});

test('floating analyzer uses responsive high-detail measured FFT with pro analyzer layers',()=>{
  assert.match(floatingJs,/Math\.round\(rect\.width \/ 4\.8\)/);
  assert.match(floatingJs,/graphPeaks/);
  assert.match(floatingJs,/Professional analyser grid/);
  assert.match(floatingJs,/Spectrum bars behind/);
  assert.match(floatingJs,/Smoothed response curve/);
  assert.match(floatingJs,/Peak-hold dots/);
  assert.doesNotMatch(floatingJs,/Math\.random\(/);
});

test('floating lyric bounce and particles are driven by real audio metrics',()=>{
  assert.match(tools,/vocalTransient:snap\.vocalTransient/);
  assert.match(tools,/beatPulse:snap\.beatPulse/);
  assert.match(floatingJs,/--fl-bounce-y/);
  assert.match(floatingCss,/\.floating-current::before/);
  assert.match(floatingCss,/--fl-particle-alpha/);
});
