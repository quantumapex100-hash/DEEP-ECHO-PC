// Additional live themes. Original Golden/Purple/Toxic particle engine remains in renderer.js.
(() => {
  let lastTheme = '', lastFrame = 0, time = 0;
  let splashes = [], fallingDrops = [], stars = [], nextImpact = 0, fluidBlobs = [], fluidRipples = [], pointerTrail = [], loveHearts = [], loveMiniHearts = [], rgbOrbs = [], spaceStars = [], spaceGalaxyDust = [], spaceNebulaSeeds = [], spaceComets = [], nextComet = 0;
  const SPACE_STAR_COUNT = 190, SPACE_DUST_COUNT = 280, SPACE_NEBULA_COUNT = 14;
  let spaceResourceW = 0, spaceResourceH = 0, spaceStaticCanvas = null, spaceStaticCtx = null;
  const pointer = { x: .5, y: .5, px: .5, py: .5, active: false, moving: false };
  window.addEventListener('pointermove', (e) => {
    const nx = e.clientX / Math.max(1, innerWidth), ny = e.clientY / Math.max(1, innerHeight);
    pointer.moving = Math.hypot(nx - pointer.x, ny - pointer.y) > .0015;
    pointer.px = pointer.x; pointer.py = pointer.y; pointer.x = nx; pointer.y = ny; pointer.active = true;
  });
  window.addEventListener('pointerleave', () => { pointer.active = false; pointer.moving = false; });
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const LOVE_HEART_TARGET = 64;
  const LOVE_HEART_PALETTES = [
    ['#ff3b7a','#ff8fbd'], ['#ff1744','#ff6f91'], ['#ff4d6d','#ffd1dc'], ['#ff6b9a','#c84cff'], ['#ff2d95','#7b61ff'],
    ['#ff5f6d','#ffc371'], ['#ff416c','#ff4b2b'], ['#ff758c','#ff7eb3'], ['#fa709a','#fee140'], ['#f857a6','#ff5858'],
    ['#ec008c','#fc6767'], ['#ff00cc','#3333ff'], ['#f953c6','#b91d73'], ['#ee0979','#ff6a00'], ['#ff512f','#dd2476'],
    ['#12c2e9','#c471ed'], ['#00f2fe','#4facfe'], ['#43e97b','#38f9d7'], ['#00dbde','#fc00ff'], ['#8e2de2','#ff6fd8'],
    ['#7f00ff','#e100ff'], ['#f7971e','#ffd200'], ['#ff9966','#ff5e62'], ['#00c6ff','#0072ff'], ['#84fab0','#8fd3f4']
  ];
  function drawHeart(ctx, x, y, size, palette, rotation = 0, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(size / 32, size / 32); ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(-16, -16, 16, 16); g.addColorStop(0, palette[0]); g.addColorStop(1, palette[1]);
    ctx.fillStyle = g; ctx.shadowColor = palette[0]; ctx.shadowBlur = Math.max(4, size * .45);
    ctx.beginPath(); ctx.moveTo(0, 11); ctx.bezierCurveTo(-20, -3, -18, -18, -7, -18); ctx.bezierCurveTo(-1, -18, 0, -12, 0, -9); ctx.bezierCurveTo(0, -12, 1, -18, 7, -18); ctx.bezierCurveTo(18, -18, 20, -3, 0, 11); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function makeLoveHeart(w, h, initial = false) {
    const size = 12 + Math.random() * 24;
    return { x: Math.random()*w, y: initial ? Math.random()*h : h + size + Math.random()*80, vx:(Math.random()-.5)*10, vy:-(8+Math.random()*22), size, palette:LOVE_HEART_PALETTES[Math.floor(Math.random()*LOVE_HEART_PALETTES.length)], phase:Math.random()*Math.PI*2, rot:(Math.random()-.5)*.5, spin:(Math.random()-.5)*.22, small:false };
  }
  function burstLoveHeart(index) {
    const h = loveHearts[index]; if (!h) return;
    const count = 8 + Math.floor(Math.random()*7);
    for (let i=0;i<count;i++) {
      const a = i/count*Math.PI*2 + Math.random()*.4, speed=24+Math.random()*62;
      loveMiniHearts.push({ x:h.x, y:h.y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed-18, size:4+Math.random()*8, palette:LOVE_HEART_PALETTES[Math.floor(Math.random()*LOVE_HEART_PALETTES.length)], phase:Math.random()*6, rot:Math.random()*6, spin:(Math.random()-.5)*2.3, small:true });
    }
    if (loveMiniHearts.length > 180) loveMiniHearts.splice(0, loveMiniHearts.length-180);
    loveHearts.splice(index,1);
  }
  window.addEventListener('click', (e) => {
    if ((document.body?.dataset?.theme || '') !== 'love') return;
    let best=-1, bestD=Infinity;
    for (let i=0;i<loveHearts.length;i++) {
      const h=loveHearts[i], d=Math.hypot(e.clientX-h.x,e.clientY-h.y);
      if (d < Math.max(22,h.size*.9) && d < bestD) { best=i; bestD=d; }
    }
    if (best>=0) burstLoveHeart(best);
  });

  function makeSplash(w, h, x = null, y = null, power = 1) {
    const sx = x ?? w * (.12 + Math.random() * .82);
    const sy = y ?? h * (.12 + Math.random() * .72);
    const radius = (34 + Math.random() * 66) * power;
    splashes.push({
      x: sx, y: sy, radius, age: 0, seed: Math.random() * 20,
      lobes: 18 + Math.floor(Math.random() * 8),
      satellites: Array.from({ length: 12 + Math.floor(Math.random() * 13) }, () => ({
        angle: Math.random() * Math.PI * 2,
        distance: .85 + Math.random() * 1.65,
        size: 1.8 + Math.random() * 5.8,
        stretch: .8 + Math.random() * 2.7
      })),
      leaks: Array.from({ length: 2 + Math.floor(Math.random() * 4) }, () => ({
        offset: (Math.random() - .5) * radius * 1.05,
        length: radius * (.25 + Math.random() * .85),
        width: 2 + Math.random() * 5
      }))
    });
  }

  function makeFallingDrop(w, h, initial = false) {
    fallingDrops.push({
      x: Math.random() * w,
      y: initial ? Math.random() * h : -30 - Math.random() * 120,
      vy: 55 + Math.random() * 125,
      r: 2.2 + Math.random() * 5.2,
      impactY: h * (.22 + Math.random() * .68),
      wobble: Math.random() * Math.PI * 2,
      trail: 12 + Math.random() * 36
    });
  }

  function buildSpaceStaticLayer(w, h) {
    const scale = .52;
    const sw = Math.max(320, Math.round(w * scale)), sh = Math.max(220, Math.round(h * scale));
    if (!spaceStaticCanvas) { spaceStaticCanvas = document.createElement('canvas'); spaceStaticCtx = spaceStaticCanvas.getContext('2d', { alpha: false }); }
    spaceStaticCanvas.width = sw; spaceStaticCanvas.height = sh;
    const c = spaceStaticCtx, W = sw, H = sh;
    const bg = c.createLinearGradient(0,0,W,H);
    bg.addColorStop(0,'#01040e'); bg.addColorStop(.32,'#050822'); bg.addColorStop(.67,'#100729'); bg.addColorStop(1,'#01030b');
    c.fillStyle=bg; c.fillRect(0,0,W,H);

    // Heavy blur is baked once at half resolution instead of recalculated every animation frame.
    c.save(); c.translate(W*.48,H*.47); c.rotate(-.31); c.globalCompositeOperation='screen';
    for(let layer=0;layer<5;layer++){
      const yy=(layer-2)*H*.045;
      const grad=c.createLinearGradient(-W*.75,yy,W*.75,yy);
      grad.addColorStop(0,'rgba(42,92,190,0)'); grad.addColorStop(.18,`rgba(48,126,235,${.025+layer*.004})`); grad.addColorStop(.47,`rgba(129,79,255,${.042+layer*.002})`); grad.addColorStop(.64,'rgba(235,80,225,.032)'); grad.addColorStop(1,'rgba(28,80,200,0)');
      c.strokeStyle=grad; c.lineWidth=H*(.05+layer*.012); c.filter=`blur(${6+layer*3}px)`;
      c.beginPath(); c.moveTo(-W*.78,yy); c.bezierCurveTo(-W*.24,yy-H*.09,W*.18,yy+H*.06,W*.78,yy-H*.025); c.stroke();
    }
    c.restore(); c.filter='none';

    c.save(); c.globalCompositeOperation='screen';
    for(const n of spaceNebulaSeeds){
      const x=W*n.x, y=H*n.y, r=Math.max(W,H)*n.r;
      const g=c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,`hsla(${n.hue},100%,68%,${n.alpha*1.5})`); g.addColorStop(.42,`hsla(${n.hue+18},100%,52%,${n.alpha*.58})`); g.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=g; c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill();
    }
    c.restore();
  }

  function ensureSpaceResources(w, h) {
    const resized = !spaceResourceW || Math.abs(w-spaceResourceW)>2 || Math.abs(h-spaceResourceH)>2;
    if (!spaceStars.length || resized) {
      spaceResourceW=w; spaceResourceH=h;
      spaceStars = Array.from({length: SPACE_STAR_COUNT}, (_,i)=>({x:Math.random()*w,y:Math.random()*h,r:.3+Math.random()*1.65,depth:.18+Math.random()*.82,phase:Math.random()*Math.PI*2,hue:[190,205,220,245,275,305][i%6]}));
      spaceGalaxyDust = Array.from({length: SPACE_DUST_COUNT}, (_,i)=>{const arm=i%4,t=Math.pow(Math.random(),.67),j=(Math.random()-.5)*.52;return{arm,t,a:t*8.1+arm*Math.PI/2+j,r:t*(.88+Math.random()*.18),z:Math.random(),size:.3+Math.random()*1.18,hue:[204,220,250,285,310][i%5]};});
      spaceNebulaSeeds = Array.from({length: SPACE_NEBULA_COUNT},(_,i)=>({x:.08+Math.random()*.84,y:.10+Math.random()*.80,r:.06+Math.random()*.12,hue:[195,210,245,275,305,325][i%6],phase:Math.random()*6.28,alpha:.022+Math.random()*.038}));
      buildSpaceStaticLayer(w,h);
    } else if (!spaceStaticCanvas) buildSpaceStaticLayer(w,h);
  }

  function reset(theme, w, h) {
    lastTheme = theme; time = 0; splashes = []; fallingDrops = []; nextImpact = .25; lastFrame = performance.now();
    stars = Array.from({ length: 88 }, () => ({ x: Math.random(), y: Math.random(), r: .5 + Math.random() * 2, phase: Math.random() * 7 }));
    fluidBlobs = Array.from({ length: 11 }, (_, i) => ({
      x: w * (.16 + Math.random() * .68),
      y: h * (.15 + Math.random() * .7),
      vx: (-20 + Math.random() * 40),
      vy: (-16 + Math.random() * 32),
      r: Math.min(w, h) * (.08 + Math.random() * .085),
      hue: 190 + i * 18 + Math.random() * 32,
      paletteSeed: i,
      phase: Math.random() * Math.PI * 2
    }));
    fluidRipples = []; pointerTrail = []; loveHearts = []; loveMiniHearts = [];
    rgbOrbs = Array.from({ length: 18 }, (_, i) => ({ x: Math.random()*w, y: Math.random()*h, vx:(Math.random()-.5)*18, vy:(Math.random()-.5)*18, r:Math.min(w,h)*(.08+Math.random()*.12), hue:(i*37+Math.random()*60)%360, phase:Math.random()*6 }));
    // Space assets are cached across theme switches; entering Vibrant Space no longer allocates hundreds of objects at once.
    ensureSpaceResources(w,h);
    spaceComets = []; nextComet = .6 + Math.random()*1.5;
    if (theme === 'love') for (let i=0;i<LOVE_HEART_TARGET;i++) loveHearts.push(makeLoveHeart(w,h,true));
    if (theme === 'blood') {
      for (let i = 0; i < 5; i++) makeSplash(w, h, null, null, .7 + Math.random() * .7);
      for (let i = 0; i < 18; i++) makeFallingDrop(w, h, true);
    }
  }

  function drawBlood(ctx, w, h, dt) {
    // Slow red illumination behind the sharper liquid shapes.
    const glow = ctx.createRadialGradient(w * .72, h * .24, 0, w * .72, h * .24, Math.max(w, h) * .58);
    glow.addColorStop(0, 'rgba(174,8,41,.10)'); glow.addColorStop(.46, 'rgba(96,2,23,.035)'); glow.addColorStop(1, 'rgba(20,0,6,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

    if (!reduceMotion.matches) {
      if (time >= nextImpact) {
        makeFallingDrop(w, h);
        if (Math.random() > .42) makeFallingDrop(w, h);
        nextImpact = time + .34 + Math.random() * .56;
      }
      while (fallingDrops.length < 12) makeFallingDrop(w, h);
    }

    // Falling beads with viscous tails. On impact they become irregular splashes.
    for (let i = fallingDrops.length - 1; i >= 0; i--) {
      const d = fallingDrops[i];
      if (!reduceMotion.matches) {
        d.y += d.vy * dt;
        d.x += Math.sin(time * 1.5 + d.wobble) * 5 * dt;
      }
      ctx.save();
      ctx.globalAlpha = .68;
      const tail = ctx.createLinearGradient(d.x, d.y - d.trail, d.x, d.y + d.r * 2);
      tail.addColorStop(0, 'rgba(92,0,20,0)'); tail.addColorStop(.56, 'rgba(127,3,28,.46)'); tail.addColorStop(1, 'rgba(229,32,66,.82)');
      ctx.fillStyle = tail;
      ctx.beginPath(); ctx.ellipse(d.x, d.y - d.trail * .22, d.r * .58, d.trail * .52, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b40b32'; ctx.shadowColor = '#e8214b'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 1.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,179,192,.36)'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.ellipse(d.x - d.r * .28, d.y - d.r * .34, d.r * .22, d.r * .34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (!reduceMotion.matches && d.y >= d.impactY) {
        makeSplash(w, h, d.x, d.impactY, .58 + d.r / 8);
        fallingDrops.splice(i, 1);
      }
    }

    splashes = splashes.filter(s => s.age < 8.5);
    for (const s of splashes) {
      if (!reduceMotion.matches) s.age += dt;
      const appear = Math.min(1, s.age * 5 + .08);
      const fade = Math.min(1, (8.5 - s.age) / 2.1);
      const alpha = appear * fade;
      const growth = .52 + Math.min(1, s.age * 2.7) * .48;
      const radius = s.radius * growth;
      ctx.save(); ctx.globalAlpha = alpha * .76;
      const g = ctx.createRadialGradient(s.x - radius * .2, s.y - radius * .26, radius * .04, s.x, s.y, radius * 1.16);
      g.addColorStop(0, '#f14a62'); g.addColorStop(.16, '#bd1238'); g.addColorStop(.58, '#72051f'); g.addColorStop(1, '#270008');
      ctx.fillStyle = g; ctx.beginPath();
      const points = 120;
      for (let j = 0; j <= points; j++) {
        const a = j / points * Math.PI * 2;
        const spike = Math.pow(Math.max(0, Math.sin(a * s.lobes + s.seed)), 7) * .18;
        const ripple = .09 * Math.sin(a * 7 + s.seed) + .055 * Math.sin(a * 13 - s.seed * .7);
        const r = radius * (.72 + ripple + spike);
        const x = s.x + Math.cos(a) * r;
        const y = s.y + Math.sin(a) * r * .58;
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fill();

      // Gravity makes a few parts of each impact slowly bleed downward.
      for (const leak of s.leaks) {
        const progress = Math.min(1, s.age / 3.5);
        const length = leak.length * progress;
        const lx = s.x + leak.offset;
        const ly = s.y + radius * .38;
        ctx.fillStyle = 'rgba(119,2,28,.72)';
        ctx.beginPath(); ctx.roundRect(lx - leak.width / 2, ly, leak.width, length, leak.width); ctx.fill();
        ctx.beginPath(); ctx.ellipse(lx, ly + length, leak.width * .85, leak.width * 1.25, 0, 0, Math.PI * 2); ctx.fill();
      }
      for (const dot of s.satellites) {
        const spread = Math.min(1, s.age * 3.2);
        const x = s.x + Math.cos(dot.angle) * radius * dot.distance * spread;
        const y = s.y + Math.sin(dot.angle) * radius * dot.distance * .72 * spread + Math.min(s.age, 4) * 2.2;
        ctx.fillStyle = '#930725'; ctx.beginPath();
        ctx.ellipse(x, y, dot.size, dot.size * dot.stretch, dot.angle, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }


  function drawFluids(ctx, w, h, dt) {
    const fallbackFx = window.__dinechoFluidState || { active: false, energy: 0, volume: 1 };
    const audioFx = window.__dinechoAudioEnergy || {};
    const fx = {
      active: !!(fallbackFx.active || audioFx.playing),
      volume: Number(fallbackFx.volume ?? 1),
      energy: Math.max(Number(fallbackFx.energy || 0), Number(audioFx.energy || 0)),
      bass: Number(audioFx.bass || 0)
    };
    const fluidConfig = window.__dinechoFluidConfig || { intensity: 1, preset: 'aurora' };
    const intensity = Math.max(.4, Math.min(1.6, Number(fluidConfig.intensity) || 1));
    const palettes = {
      aurora: [154, 181, 202, 236, 278, 316],
      neon: [326, 286, 202, 158, 112, 42],
      ocean: [178, 191, 205, 218, 233, 248],
      fire: [350, 5, 18, 31, 44, 324]
    };
    const palette = palettes[fluidConfig.preset] || palettes.aurora;
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#050d18'); bg.addColorStop(.38, '#150a21'); bg.addColorStop(.72, '#08141f'); bg.addColorStop(1, '#040b12');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    const tx = pointer.x * w, ty = pointer.y * h;
    const pointerSpeed = Math.min(1, Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py) * 42);
    if (!reduceMotion.matches && pointer.active && pointer.moving && Math.random() < Math.min(.94, .48 + intensity * .28)) {
      const pointerHue = palette[Math.floor(Math.random() * palette.length)];
      fluidRipples.push({ x: tx, y: ty, r: (12 + pointerSpeed * 38) * intensity, life: 1, hue: pointerHue });
      pointerTrail.push({ x: tx, y: ty, r: (18 + pointerSpeed * 28) * intensity, life: .95, hue: pointerHue + 12 });
    }
    if (fx.active && Math.random() < (0.05 + fx.energy * 0.16) * intensity) {
      const beatHue = palette[Math.floor(Math.random() * palette.length)];
      fluidRipples.push({ x: w * (.18 + Math.random() * .64), y: h * (.18 + Math.random() * .64), r: (26 + fx.energy * 54) * intensity, life: .8, hue: beatHue });
    }
    if (fluidRipples.length > 30) fluidRipples = fluidRipples.slice(-30);
    if (pointerTrail.length > 22) pointerTrail = pointerTrail.slice(-22);

    const driftX = pointer.active ? tx : w * .5;
    const driftY = pointer.active ? ty : h * .5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(20px) saturate(175%) contrast(150%)';
    for (const b of fluidBlobs) {
      if (!reduceMotion.matches) {
        const dx = driftX - b.x;
        const dy = driftY - b.y;
        const dist = Math.hypot(dx, dy) || 1;
        const attract = (pointer.active ? 15 + pointerSpeed * 44 : 4.5 + fx.bass * 5) * intensity;
        b.vx += (dx / dist) * attract * dt;
        b.vy += (dy / dist) * attract * dt;
        b.vx += Math.cos(time * .8 + b.phase) * (3 + fx.energy * 5) * dt;
        b.vy += Math.sin(time * 1.05 + b.phase) * (3 + fx.energy * 5) * dt;
        const viscosity = .985 - Math.min(.012, fx.bass * .008);
        b.vx *= viscosity; b.vy *= viscosity;
        b.x += b.vx * dt * 18;
        b.y += b.vy * dt * 18;
        if (b.x < -b.r) b.x = w + b.r; else if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r; else if (b.y > h + b.r) b.y = -b.r;
      }
      const pulse = 1 + Math.sin(time * (1.1 + fx.energy * 1.7) + b.phase) * (.07 + fx.energy * .08) * intensity + fx.bass * .06 * intensity;
      const radius = b.r * pulse * (1 + fx.energy * .16 * intensity + fx.bass * .08 * intensity);
      const hue = palette[b.paletteSeed % palette.length] + Math.sin(time * .18 + b.phase) * 8;
      const g = ctx.createRadialGradient(b.x - radius * .22, b.y - radius * .24, radius * .04, b.x, b.y, radius);
      g.addColorStop(0, `hsla(${hue}, 100%, ${78 - fx.energy * 14}%, ${Math.min(1, .82 + intensity * .11)})`);
      g.addColorStop(.3, `hsla(${hue + 18}, 96%, 63%, ${Math.min(.88, .58 + intensity * .13)})`);
      g.addColorStop(.62, `hsla(${hue + 36}, 92%, 54%, ${Math.min(.58, .27 + intensity * .11)})`);
      g.addColorStop(1, `hsla(${hue + 42}, 92%, 38%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, radius, 0, Math.PI * 2); ctx.fill();
    }

    pointerTrail = pointerTrail.filter((item) => (item.life -= dt * 1.35) > 0);
    for (const item of pointerTrail) {
      const g = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, item.r);
      g.addColorStop(0, `hsla(${item.hue}, 100%, 72%, ${item.life * .44})`);
      g.addColorStop(1, `hsla(${item.hue + 20}, 100%, 40%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(item.x, item.y, item.r * (1.1 - item.life * .2), 0, Math.PI * 2); ctx.fill();
    }

    fluidRipples = fluidRipples.filter((item) => (item.life -= dt * .9) > 0);
    for (const ripple of fluidRipples) {
      ripple.r += dt * (55 + fx.energy * 60);
      const g = ctx.createRadialGradient(ripple.x, ripple.y, ripple.r * .1, ripple.x, ripple.y, ripple.r);
      g.addColorStop(0, `hsla(${ripple.hue}, 100%, 86%, ${ripple.life * .28})`);
      g.addColorStop(.35, `hsla(${ripple.hue + 12}, 100%, 68%, ${ripple.life * .16})`);
      g.addColorStop(1, `hsla(${ripple.hue + 35}, 100%, 40%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ripple.x, ripple.y, ripple.r, 0, Math.PI * 2); ctx.fill();
    }
    // Viscous color streams make the field look less like separate blobs and more like flowing liquid.
    for (let stream = 0; stream < 7; stream++) {
      ctx.beginPath();
      const yBase = h * (.1 + stream * .135);
      for (let x = -60; x <= w + 60; x += 24) {
        const bend = Math.sin(x / (105 + stream * 11) + time * (.42 + stream * .025) + stream) * (28 + fx.energy * 30);
        const cursorPull = pointer.active ? Math.exp(-Math.abs(x - tx) / 180) * (ty - yBase) * .16 : 0;
        const y = yBase + bend + cursorPull;
        x === -60 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const streamHue = palette[stream % palette.length];
      ctx.strokeStyle = `hsla(${streamHue}, 94%, ${54 + stream * 2}%, ${(.035 + fx.energy * .055) * intensity})`;
      ctx.lineWidth = (24 + stream * 5 + fx.bass * 24) * (.75 + intensity * .25);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    for (let band = 0; band < 5; band++) {
      ctx.beginPath();
      for (let x = -20; x <= w + 24; x += 16) {
        const y = h * (.16 + band * .17) + Math.sin(x / 160 + time * (.65 + band * .04) + band) * (16 + fx.energy * 10);
        x > -20 ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + band * 0.01})`;
      ctx.lineWidth = 24 - band * 3;
      ctx.stroke();
    }
    if (pointer.active) {
      const halo = 44 + pointerSpeed * 70;
      const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, halo);
      g.addColorStop(0, 'rgba(255,255,255,.18)');
      g.addColorStop(.28, 'rgba(117,223,255,.16)');
      g.addColorStop(1, 'rgba(73,40,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(tx, ty, halo, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }


  function drawRGB(ctx, w, h, dt) {
    const fx = window.__dinechoAudioEnergy || { energy:0, bass:0, playing:false };
    const hueShift = (time * 44) % 360;
    const base = ctx.createLinearGradient(0,0,w,h);
    base.addColorStop(0, `hsl(${hueShift},55%,7%)`); base.addColorStop(.5, `hsl(${(hueShift+120)%360},58%,8%)`); base.addColorStop(1, `hsl(${(hueShift+240)%360},55%,7%)`);
    ctx.fillStyle=base; ctx.fillRect(0,0,w,h);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.filter='blur(22px) saturate(180%)';
    for (const o of rgbOrbs) {
      if (!reduceMotion.matches) {
        o.x += o.vx*dt*(1+fx.energy*2); o.y += o.vy*dt*(1+fx.energy*2);
        o.x += Math.sin(time*.8+o.phase)*8*dt; o.y += Math.cos(time*.7+o.phase)*7*dt;
        if (pointer.active) { const dx=o.x-pointer.x*w,dy=o.y-pointer.y*h,dist=Math.hypot(dx,dy)||1; if(dist<170){o.vx+=(dx/dist)*(170-dist)*.06;o.vy+=(dy/dist)*(170-dist)*.06;} }
        o.vx*=.995;o.vy*=.995;
        if(o.x<-o.r)o.x=w+o.r;if(o.x>w+o.r)o.x=-o.r;if(o.y<-o.r)o.y=h+o.r;if(o.y>h+o.r)o.y=-o.r;
      }
      const hue=(o.hue+hueShift)%360, rr=o.r*(1+fx.bass*.2+Math.sin(time+o.phase)*.05);
      const g=ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,rr); g.addColorStop(0,`hsla(${hue},100%,68%,.52)`);g.addColorStop(.45,`hsla(${(hue+35)%360},100%,55%,.25)`);g.addColorStop(1,`hsla(${(hue+75)%360},100%,45%,0)`);
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(o.x,o.y,rr,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation='screen';
    for(let band=0;band<7;band++){
      ctx.beginPath(); for(let x=-30;x<=w+30;x+=14){const y=h*(.08+band*.145)+Math.sin(x/(100+band*14)+time*(.9+band*.05)+band)* (20+fx.energy*22);x===-30?ctx.moveTo(x,y):ctx.lineTo(x,y)}
      ctx.strokeStyle=`hsla(${(hueShift+band*48)%360},100%,65%,${.035+fx.energy*.05})`;ctx.lineWidth=12+band*2;ctx.stroke();
    }
    ctx.restore();
  }

  function drawLove(ctx, w, h, dt) {
    const fx = window.__dinechoAudioEnergy || { energy:0, bass:0, playing:false };
    const hueShift=(time*18)%360;
    const bg=ctx.createRadialGradient(w*.5,h*.42,0,w*.5,h*.42,Math.max(w,h)*.75); bg.addColorStop(0,`hsla(${(330+hueShift*.15)%360},58%,15%,1)`);bg.addColorStop(.5,'#100919');bg.addColorStop(1,'#06070d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    while(loveHearts.length<LOVE_HEART_TARGET) loveHearts.push(makeLoveHeart(w,h,false));
    const px=pointer.x*w,py=pointer.y*h;
    for(const hrt of loveHearts){
      if(!reduceMotion.matches){
        const dx=hrt.x-px,dy=hrt.y-py,dist=Math.hypot(dx,dy)||1, repel=105+hrt.size*.5;
        // Gentle cursor interaction: hearts drift away only a little instead of being thrown across the screen.
        if(pointer.active&&dist<repel){const force=(repel-dist)/repel*(14+hrt.size*.22);hrt.vx+=(dx/dist)*force*dt*2.2;hrt.vy+=(dy/dist)*force*dt*2.2;}
        hrt.vx+=Math.sin(time*1.2+hrt.phase)*4*dt; hrt.vy+=Math.cos(time*.8+hrt.phase)*1.2*dt; hrt.vx*=.986; hrt.vy*=.992;
        hrt.x+=hrt.vx*dt*5; hrt.y+=hrt.vy*dt*5; hrt.rot+=hrt.spin*dt;
        if(hrt.y<-hrt.size*2){hrt.y=h+hrt.size;hrt.x=Math.random()*w;hrt.vy=-(8+Math.random()*22)}
        if(hrt.x<-hrt.size)hrt.x=w+hrt.size;if(hrt.x>w+hrt.size)hrt.x=-hrt.size;
      }
      const pulse=1+Math.sin(time*2.2+hrt.phase)*.08+fx.bass*.13;drawHeart(ctx,hrt.x,hrt.y,hrt.size*pulse,hrt.palette,hrt.rot,.55+fx.energy*.25);
    }
    for(const hrt of loveMiniHearts){
      if(!reduceMotion.matches){
        const dx=hrt.x-px,dy=hrt.y-py,dist=Math.hypot(dx,dy)||1;
        if(pointer.active&&dist<72){const f=(72-dist)/72*10;hrt.vx+=(dx/dist)*f*dt*2;hrt.vy+=(dy/dist)*f*dt*2;}
        hrt.vx*=.994;hrt.vy*=.994;hrt.vy+=3*dt;hrt.x+=hrt.vx*dt;hrt.y+=hrt.vy*dt;hrt.rot+=hrt.spin*dt;
        if(hrt.x<-20)hrt.x=w+20;if(hrt.x>w+20)hrt.x=-20;if(hrt.y<-20)hrt.y=h+20;if(hrt.y>h+20)hrt.y=-20;
      }
      drawHeart(ctx,hrt.x,hrt.y,hrt.size*(1+fx.energy*.2),hrt.palette,hrt.rot,.8);
    }
    if(pointer.active){const g=ctx.createRadialGradient(px,py,0,px,py,110);g.addColorStop(0,'rgba(255,170,225,.08)');g.addColorStop(1,'rgba(255,80,180,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,110,0,Math.PI*2);ctx.fill();}
  }

  function drawSpace(ctx, w, h, dt) {
    ensureSpaceResources(w,h);
    const fx = window.__dinechoAudioEnergy || {energy:0,bass:0,treble:0,vocal:0,vocalTransient:0,playing:false};
    const px = pointer.x*w, py = pointer.y*h;
    const voice = fx.vocal || 0, voiceHit = fx.vocalTransient || 0;

    // The photographic galaxy/nebula layer is pre-rendered once. Per-frame work is now just a
    // lightweight drawImage drift, so switching to this theme does not re-run large blur filters.
    if (spaceStaticCanvas) {
      const driftX=Math.sin(time*.027)*w*.006, driftY=Math.cos(time*.021)*h*.004;
      ctx.save(); ctx.globalAlpha=Math.min(1,.965+voice*.018); ctx.drawImage(spaceStaticCanvas,-w*.025+driftX,-h*.025+driftY,w*1.05,h*1.05); ctx.restore();
    } else {
      ctx.fillStyle='#020613'; ctx.fillRect(0,0,w,h);
    }

    // Parallax stars: no per-star shadowBlur. Larger stars get a tiny cross flare instead.
    ctx.save(); ctx.globalCompositeOperation='screen';
    for(const s of spaceStars){
      if(!reduceMotion.matches){s.y-=dt*(1.7+s.depth*5.4)*(1+fx.bass*.48+voice*.22);s.x+=Math.sin(time*.13+s.phase)*dt*(.32+s.depth*1.05);if(s.y<-4){s.y=h+4;s.x=Math.random()*w;}if(s.x<0)s.x=w;if(s.x>w)s.x=0;}
      const tw=.45+.45*Math.sin(time*(.7+s.depth*1.55)+s.phase), a=.12+s.depth*.38+Math.max(0,tw)*.22+fx.treble*.11+voice*.09, rr=s.r*(.78+s.depth*.62+voiceHit*.16);
      ctx.fillStyle=`hsla(${s.hue},100%,${74+s.depth*18}%,${Math.min(.92,a)})`;
      if(rr<1.32) ctx.fillRect(s.x-rr*.5,s.y-rr*.5,Math.max(.7,rr),Math.max(.7,rr));
      else {ctx.beginPath();ctx.arc(s.x,s.y,rr,0,Math.PI*2);ctx.fill();if(tw>.76){ctx.globalAlpha=Math.min(.58,a);ctx.fillRect(s.x-rr*2.3,s.y-.28,rr*4.6,.56);ctx.fillRect(s.x-.28,s.y-rr*2.3,.56,rr*4.6);ctx.globalAlpha=1;}}
    }
    ctx.restore();

    // A particle-built spiral galaxy. Fewer carefully distributed particles keep the same silhouette,
    // while avoiding hundreds of shadow-filter operations every frame.
    const gx=w*.78, gy=h*.205, galaxyScale=Math.min(w,h)*.145;
    ctx.save();ctx.translate(gx,gy);ctx.rotate(-.18+time*.0105);ctx.scale(1,.54);ctx.globalCompositeOperation='lighter';
    const core=ctx.createRadialGradient(0,0,0,0,0,galaxyScale*.42);core.addColorStop(0,`rgba(255,248,226,${.34+voice*.12})`);core.addColorStop(.16,'rgba(151,196,255,.25)');core.addColorStop(.5,'rgba(124,83,255,.11)');core.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=core;ctx.beginPath();ctx.arc(0,0,galaxyScale*.48,0,Math.PI*2);ctx.fill();
    for(const p of spaceGalaxyDust){
      const a=p.a+time*(.016+p.z*.004), rr=galaxyScale*p.r*(.18+.82*p.t), spread=(p.z-.5)*galaxyScale*.11*(.25+p.t), x=Math.cos(a)*rr+Math.cos(a+Math.PI/2)*spread, y=Math.sin(a)*rr+Math.sin(a+Math.PI/2)*spread;
      const alpha=(.09+p.z*.25)*(1-p.t*.24)+voice*.035+voiceHit*.045, sz=p.size*(.66+p.z*.72+voice*.13);ctx.fillStyle=`hsla(${p.hue},100%,${72+p.z*20}%,${Math.min(.64,alpha)})`;
      if(sz<1.1) ctx.fillRect(x-sz*.5,y-sz*.5,Math.max(.65,sz),Math.max(.65,sz)); else {ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();

    // One small blurred dust lane remains dynamic; the expensive full-screen blurs are cached above.
    ctx.save();ctx.translate(gx,gy);ctx.rotate(-.18+time*.0105);ctx.scale(1,.54);ctx.globalCompositeOperation='source-over';ctx.strokeStyle='rgba(1,2,10,.22)';ctx.lineWidth=galaxyScale*.075;ctx.filter='blur(3px)';ctx.beginPath();ctx.arc(0,0,galaxyScale*.52,.28,Math.PI*1.38);ctx.stroke();ctx.restore();ctx.filter='none';

    if(!reduceMotion.matches && time>=nextComet){spaceComets.push({x:w*(.03+Math.random()*.68),y:h*(.015+Math.random()*.26),vx:210+Math.random()*190,vy:72+Math.random()*98,life:1,hue:190+Math.random()*105});nextComet=time+3.2+Math.random()*5.4;}
    spaceComets=spaceComets.filter(c=>(c.life-=dt*.66)>0);
    ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';
    for(const c of spaceComets){if(!reduceMotion.matches){c.x+=c.vx*dt;c.y+=c.vy*dt;}const g=ctx.createLinearGradient(c.x-c.vx*.22,c.y-c.vy*.22,c.x,c.y);g.addColorStop(0,'rgba(70,170,255,0)');g.addColorStop(.76,`hsla(${c.hue},100%,72%,${c.life*.42})`);g.addColorStop(1,`rgba(255,255,255,${c.life*.92})`);ctx.strokeStyle=g;ctx.lineWidth=1.1+fx.treble*1.5+voiceHit*.65;ctx.beginPath();ctx.moveTo(c.x-c.vx*.22,c.y-c.vy*.22);ctx.lineTo(c.x,c.y);ctx.stroke();}
    ctx.restore();

    if(pointer.active){const g=ctx.createRadialGradient(px,py,0,px,py,104);g.addColorStop(0,'rgba(117,211,255,.05)');g.addColorStop(.42,'rgba(139,88,255,.028)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,104,0,Math.PI*2);ctx.fill();}
  }

  function drawSilverOrGlass(ctx, w, h, theme) {
    ctx.save();
    for (let band = 0; band < 4; band++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) {
        const y = h * (.3 + band * .15) + Math.sin(x / 260 + time * .18 + band * .6) * h * .14;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = theme === 'silver' ? `rgba(200,218,239,${.035 + band * .009})` : 'rgba(155,181,239,.045)';
      ctx.lineWidth = 28 + band * 18; ctx.stroke();
      ctx.strokeStyle = theme === 'silver' ? 'rgba(229,241,255,.16)' : 'rgba(186,200,255,.1)'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (const p of stars) {
      const x = (p.x * w + Math.sin(time * .16 + p.phase) * 34 + w) % w;
      const y = ((p.y * h - time * (4 + p.r * 2)) % h + h) % h;
      const alpha = .3 + .25 * Math.sin(time + p.phase);
      ctx.fillStyle = `rgba(225,237,255,${alpha})`; ctx.shadowColor = '#dbe8ff'; ctx.shadowBlur = 9;
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Prepare Vibrant Space while the browser is idle, so the first theme switch has no allocation spike.
  const prewarmSpace = () => { try { ensureSpaceResources(Math.max(1,innerWidth),Math.max(1,innerHeight)); } catch (_) {} };
  if ('requestIdleCallback' in window) requestIdleCallback(prewarmSpace,{timeout:1400}); else setTimeout(prewarmSpace,450);

  window.drawDinechoEffect = (ctx, canvas, theme) => {
    if (window.__deepecchoGameMode) return true;
    if (!['blood', 'silver', 'transparent', 'fluids', 'rgb', 'love', 'space'].includes(theme)) { lastTheme = ''; return false; }
    const now = performance.now();
    const dt = Math.min((now - lastFrame) / 1000 || 0, .05);
    const w = canvas.width, h = canvas.height;
    if (lastTheme !== theme) reset(theme, w, h);
    lastFrame = now;
    if (!document.hidden && !reduceMotion.matches) time += dt;
    if (theme === 'blood') drawBlood(ctx, w, h, dt);
    else if (theme === 'fluids') drawFluids(ctx, w, h, dt);
    else if (theme === 'rgb') drawRGB(ctx, w, h, dt);
    else if (theme === 'love') drawLove(ctx, w, h, dt);
    else if (theme === 'space') drawSpace(ctx, w, h, dt);
    else drawSilverOrGlass(ctx, w, h, theme);
    return true;
  };
})();
