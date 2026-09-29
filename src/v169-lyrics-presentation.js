/* Deepeccho v1.6.9 — presentation-only lyric motion bridge.
   Reads the existing analyser snapshot. It never changes lyric timing, selection or playback state. */
(() => {
  const root = document.documentElement;
  let sm = { energy:0, vocal:0, hit:0, bass:0, treble:0, motion:0 };
  let last = performance.now();
  function clamp(v){ return Math.max(0, Math.min(1, Number(v)||0)); }
  function tick(now){
    requestAnimationFrame(tick);
    if (document.hidden && now-last < 120) return;
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
    root.style.setProperty('--lyric-energy', sm.energy.toFixed(3));
    root.style.setProperty('--lyric-vocal', sm.vocal.toFixed(3));
    root.style.setProperty('--lyric-hit', sm.hit.toFixed(3));
    root.style.setProperty('--lyric-bass', sm.bass.toFixed(3));
    root.style.setProperty('--lyric-treble', sm.treble.toFixed(3));
    root.style.setProperty('--lyric-motion', sm.motion.toFixed(3));
    root.style.setProperty('--lyric-bounce-y', `${(-bounce).toFixed(2)}px`);
    root.style.setProperty('--lyric-bounce-scale', scale.toFixed(4));
    root.style.setProperty('--lyric-particle-alpha', (0.18 + sm.vocal*.24 + sm.hit*.42 + sm.treble*.16).toFixed(3));
    root.style.setProperty('--v170-energy', sm.energy.toFixed(3));
    root.style.setProperty('--v170-vocal', sm.vocal.toFixed(3));
    root.style.setProperty('--v170-hit', sm.hit.toFixed(3));
    root.style.setProperty('--v170-bass', sm.bass.toFixed(3));
    root.style.setProperty('--v170-treble', sm.treble.toFixed(3));
  }
  requestAnimationFrame(tick);
})();
