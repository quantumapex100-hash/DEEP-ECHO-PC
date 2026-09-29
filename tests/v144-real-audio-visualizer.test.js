const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'src','renderer.js'),'utf8');
const pkg=require(path.join(root,'package.json'));

function block(start,end){
  const a=js.indexOf(start), b=js.indexOf(end,a+start.length);
  assert.ok(a>=0 && b>a,`missing block ${start}`);
  return js.slice(a,b);
}

test('v1.4.6 uses high resolution PCM plus FFT audio analysis',()=>{
  assert.equal(pkg.version,'2.1.0');
  assert.match(js,/audioAnalyser\.fftSize\s*=\s*2048/);
  assert.match(js,/getByteFrequencyData\(visualizerFrequencyData\)/);
  assert.match(js,/getByteTimeDomainData\(visualizerTimeData\)/);
  assert.match(js,/Math\.sqrt\(sq \/ Math\.max\(1, visualizerTimeData\.length\)\)/);
});

test('visualizer separates musical frequency bands instead of one average meter',()=>{
  for(const token of ['subBass','bass','lowMid','mid','highMid','treble']) assert.match(js,new RegExp(token));
  assert.match(js,/visualizerBandAverage\(24, 62\)/);
  assert.match(js,/visualizerBandAverage\(62, 190\)/);
  assert.match(js,/visualizerBandAverage\(520, 2100\)/);
  assert.match(js,/visualizerBandAverage\(6200, 16000\)/);
});

test('real transient spectral flux and beat pulses drive aggressive sections',()=>{
  const energy=block('function readAudioEnergy()','function getVisualizerThemeSpec');
  assert.match(energy,/spectralFlux/);
  assert.match(energy,/visualizerFluxFloor/);
  assert.match(energy,/visualizerBeatCooldownUntil/);
  assert.match(energy,/transientRaw/);
  assert.match(energy,/beatPulse/);
  assert.match(energy,/aggression/);
  assert.match(energy,/motion/);
});

test('missing analyser signal settles idle instead of generating fake cyclic music',()=>{
  const energy=block('function readAudioEnergy()','function getVisualizerThemeSpec');
  const sample=block('function visualizerSpectrumSample','function spawnBloodVisualizerDrop');
  assert.doesNotMatch(energy,/Math\.sin\(/);
  assert.match(energy,/No fake fallback music/);
  assert.match(sample,/return 0/);
});

test('theme geometry consumes live spectrum plus waveform and beat vibration',()=>{
  const accent=block('function drawThemeAccent','function drawLyricsVisualizer');
  const draw=block('function drawLyricsVisualizer','function startLyricsVisualizer');
  assert.match(accent,/visualizerWaveSample/);
  assert.match(accent,/visualizerSpectrumSample/);
  assert.match(draw,/audio\.beatPulse/);
  assert.match(draw,/audio\.transient/);
  assert.match(draw,/audio\.aggression/);
  assert.match(draw,/shakeX/);
  assert.match(draw,/waveLocal/);
});

test('blood visualizer particles are beat-triggered and deterministic, not random beat simulation',()=>{
  const blood=block('function spawnBloodVisualizerDrop','function drawBloodVisualizerDrops');
  assert.match(blood,/audio\.beatId/);
  assert.match(blood,/2\.399963229728653/);
  assert.doesNotMatch(blood,/Math\.random/);
});
