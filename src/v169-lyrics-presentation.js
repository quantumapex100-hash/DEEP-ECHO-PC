/* Deepeccho v1.6.9 — presentation-only lyric motion bridge.
   Reads the existing analyser snapshot. It never changes lyric timing, selection or playback state. */
(() => {
  const applied = new WeakMap();
  function paint(node, name, value) {
    if (!node) return;
    let values = applied.get(node);
    if (!values) { values = new Map(); applied.set(node, values); }
    if (values.get(name) === value) return;
    node.style.setProperty(name, value); values.set(name, value);
  }
  let sm = { energy:0, vocal:0, hit:0, bass:0, treble:0, motion:0 };
  let last = performance.now();
  function clamp(v){ return Math.max(0, Math.min(1, Number(v)||0)); }
  function tick(now){
    requestAnimationFrame(tick);
    if (document.hidden || window.__deepecchoGameMode) return;
    if (!document.hidden && now-last < 33) return;
    last = now;
    const a = window.__dinechoAudioEnergy || {};
    const target = {
      energy: clamp(a.energy), vocal: clamp(a.vocal),
      hit: clamp(Math.max(a.vocalTransient||0, a.transient||0, a.beatPulse||0)),
      bass: clamp(a.bass), treble: clamp(a.treble), motion: clamp(a.motion)
    };
    for (const k of Object.keys(sm)) {
      const rate = target[k] > sm[k] ? .46 : .12;
      sm[k] += (target[k]-sm[k]) * rate;
    }
    const bounce = Math.min(4.6, sm.vocal*1.9 + sm.hit*3.4 + sm.energy*.9);
    const scale = 1 + Math.min(.032, sm.vocal*.010 + sm.hit*.020 + sm.energy*.006);
    // Changing inherited variables on :root invalidated every lyric and app panel.
    // Only the visible current lines consume these animated presentation values.
    const targets = [];
    if (document.getElementById('lyricsView')?.classList.contains('active'))
      targets.push(document.querySelector('#lyricsBody .lyric-line.current'));
    const immersive = document.getElementById('immersivePlayer');
    if (immersive && !immersive.classList.contains('hidden'))
      targets.push(document.querySelector('#immersiveLyricsBody .lyric-line.current'));
    const values = {
      '--lyric-energy':sm.energy.toFixed(3), '--lyric-vocal':sm.vocal.toFixed(3),
      '--lyric-hit':sm.hit.toFixed(3), '--lyric-bass':sm.bass.toFixed(3),
      '--lyric-treble':sm.treble.toFixed(3), '--lyric-motion':sm.motion.toFixed(3),
      '--lyric-bounce-y':`${(-bounce).toFixed(2)}px`, '--lyric-bounce-scale':scale.toFixed(4),
      '--lyric-particle-alpha':(0.18 + sm.vocal*.24 + sm.hit*.42 + sm.treble*.16).toFixed(3)
    };
    for (const node of targets) for (const [key,value] of Object.entries(values)) paint(node,key,value);
    const lighting = document.body.classList.contains('v170-lighting-on') ? document.getElementById('v170MusicLighting') : null;
    for (const key of ['energy','vocal','hit','bass','treble']) paint(lighting,`--v170-${key}`,sm[key].toFixed(3));
    if (document.body.dataset.theme === 'dragon')
      document.querySelectorAll('.deep-dragon-background').forEach(node=>paint(node,'--v170-energy',sm.energy.toFixed(3)));
  }
  requestAnimationFrame(tick);
})();
