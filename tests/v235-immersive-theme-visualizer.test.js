const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const immersive=fs.readFileSync('src/immersive-lyrics.js','utf8');
const tools=fs.readFileSync('src/v150-tools.js','utf8');

test('immersive floating lyrics receives real spectrum waveform and full audio bands',()=>{
  assert.match(tools,/waveform:waveValues/);
  for(const metric of ['subBass','lowMid','mid','highMid','vocalTransient','transient','beatPulse','centroid']){
    assert.ok(tools.includes(metric),`missing ${metric} in immersive audio packet`);
  }
  assert.match(immersive,/function waveSample\(/);
  assert.match(immersive,/state\.waveform/);
});

test('immersive floating lyrics mirrors every DeepEcho theme visualizer identity',()=>{
  for(const theme of ['golden','light','dark','purple','toxic','blood','silver','transparent','fluids','rgb','love','space','dragon']){
    assert.ok(immersive.includes(`${theme}:{`),`missing ${theme} immersive visualizer`);
  }
  assert.match(immersive,/drawThemeAccent/);
  assert.match(immersive,/drawSphereVisualizer/);
  assert.match(immersive,/drawDragonVisualizer/);
  assert.match(immersive,/assets\/dragon-scene\.png/);
  assert.doesNotMatch(immersive,/const ribbonX=w\*\.92/);
});
