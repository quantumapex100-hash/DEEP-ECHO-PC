// DEEP-ECHO v2.6.3 V36 — Red Nebulae + focused UX/performance hardening
// Additive presentation/controller layer. Does not replace lyrics timing, stream resolver or downloads.
(() => {
  'use strict';

  // ---------- Fast first paint ----------
  const finishStartupPaint = () => {
    const finish = () => requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body?.classList.remove('deepeccho-startup-lite');
    }));
    if (typeof requestIdleCallback === 'function') requestIdleCallback(finish, { timeout: 850 });
    else setTimeout(finish, 620);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', finishStartupPaint, { once:true });
  else finishStartupPaint();

  // ---------- Reliable Sync-to-video ----------
  // Use capture so a player overlay cannot swallow this control. We keep the existing media clock
  // and syncLyrics() implementation intact; this only restores auto-follow and requests one forced paint.
  const syncButton = document.getElementById('lyricsSyncBtn');
  if (syncButton) {
    const forceBackToPlayingLine = (event) => {
      event?.preventDefault?.();
      event?.stopImmediatePropagation?.();
      try {
        if (typeof setLyricsAutoFollow === 'function') setLyricsAutoFollow(true);
        if (typeof activeLyric !== 'undefined') activeLyric = -2;
        if (typeof syncLyrics === 'function') syncLyrics(true);
        requestAnimationFrame(() => {
          try { if (typeof syncLyrics === 'function') syncLyrics(true); } catch (_) {}
        });
      } catch (_) {}
    };
    syncButton.addEventListener('click', forceBackToPlayingLine, true);
    syncButton.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') forceBackToPlayingLine(event);
    }, true);
  }

  // ---------- Manual Next intent ----------
  // V35 already resolves the upcoming stream in the background. Re-assert that priority the moment
  // the user aims at Next, without waiting for any recommendation/radio maintenance task.
  const warmNext = () => {
    try { Promise.resolve(prefetchNextQueued?.()).catch?.(() => {}); } catch (_) {}
  };
  [document.getElementById('nextBtn'), document.getElementById('immersiveNextBtn')].filter(Boolean).forEach(button => {
    button.addEventListener('pointerenter', warmNext, { passive:true });
    button.addEventListener('focus', warmNext);
    button.addEventListener('pointerdown', warmNext, { passive:true, capture:true });
  });

  // ---------- Red Nebulae custom cursor ----------
  try {
    if (typeof LIVE_CURSOR_ART !== 'undefined') {
      LIVE_CURSOR_ART.nebula = `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="cnebula" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff7f8"/><stop offset=".27" stop-color="#ff8aa0"/><stop offset=".58" stop-color="#ff315c"/><stop offset=".82" stop-color="#b90039"/><stop offset="1" stop-color="#420014"/></linearGradient></defs><path class="cursor-glow-shape" d="M4 3L43 17L28 22L40 28L27 31L21 45L16 30L7 39L11 21Z"/><path class="cursor-main-shape" d="M4 3L43 17L28 22L40 28L27 31L21 45L16 30L7 39L11 21Z" fill="url(#cnebula)"/><path class="cursor-detail-shape" d="M9 8L34 17L22 21L30 25L21 27L19 36L16 26L12 30L14 18Z"/><path class="cursor-live-streak" d="M9 8L32 17L21 21L29 25L21 28L19 39"/></svg>`;
      if ((document.body?.dataset?.theme || '') === 'nebula' && typeof applyThemeCursor === 'function') applyThemeCursor('nebula');
    }
  } catch (_) {}

  // ---------- Red Nebulae live background ----------
  // The expensive cloud shapes live in CSS. This canvas layer only draws moving stars + occasional
  // meteors at the renderer's 30fps nebula cap, keeping the theme bright without a costly full-frame blur.
  const baseEffect = window.drawDinechoEffect;
  let nebulaW = 0, nebulaH = 0, nebulaStars = [], nebulaMeteors = [];
  let nebulaTime = 0, nebulaLast = performance.now(), nextMeteorAt = .9;

  function rebuildNebula(w, h) {
    nebulaW = w; nebulaH = h;
    const count = Math.max(54, Math.min(94, Math.round((w*h) / 19000)));
    nebulaStars = Array.from({ length:count }, (_,i) => ({
      x: ((i * 67) % 997) / 997 * w,
      y: ((i * 131 + 17) % 991) / 991 * h,
      r: .45 + (i % 7) * .18,
      depth: .25 + (i % 11) / 14,
      phase: (i * .71) % (Math.PI*2),
      warm: i % 4 !== 0
    }));
    nebulaMeteors = [];
    nextMeteorAt = nebulaTime + .8;
  }

  function drawNebula(ctx, canvas) {
    const w=canvas.width, h=canvas.height;
    if (!w || !h) return true;
    if (Math.abs(w-nebulaW)>2 || Math.abs(h-nebulaH)>2 || !nebulaStars.length) rebuildNebula(w,h);
    const now=performance.now(), dt=Math.min(.05,Math.max(0,(now-nebulaLast)/1000||0)); nebulaLast=now;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (!document.hidden && !reduced) nebulaTime += dt;
    const fx=window.__dinechoAudioEnergy || {};
    const energy=Math.max(0,Math.min(1,Number(fx.energy||0)));
    const treble=Math.max(0,Math.min(1,Number(fx.treble||0)));
    const beat=Math.max(0,Math.min(1,Number(fx.beatPulse||0)));
    const vocal=Math.max(0,Math.min(1,Number(fx.vocal||0)));

    ctx.save();
    ctx.globalCompositeOperation='screen';
    for (const s of nebulaStars) {
      if (!reduced) {
        s.y -= dt * (1.4 + s.depth*4.6) * (1 + energy*.25);
        s.x += Math.sin(nebulaTime*.17+s.phase)*dt*(.18+s.depth*.44);
        if (s.y < -5) { s.y=h+5; s.x=(s.x*1.37+73)%w; }
      }
      const tw=.62+.38*Math.sin(nebulaTime*(.8+s.depth*.95)+s.phase);
      const alpha=Math.min(.94,.20+s.depth*.36+Math.max(0,tw)*.22+treble*.16+vocal*.06);
      const rr=s.r*(.88+s.depth*.55+beat*.16);
      ctx.fillStyle=s.warm?`rgba(255,${188+Math.round(s.depth*55)},${198+Math.round(s.depth*44)},${alpha})`:`rgba(255,245,248,${alpha})`;
      if (rr<1.35) ctx.fillRect(s.x,s.y,Math.max(.75,rr),Math.max(.75,rr));
      else {
        ctx.beginPath();ctx.arc(s.x,s.y,rr,0,Math.PI*2);ctx.fill();
        if (tw>.82) {
          ctx.globalAlpha=Math.min(.55,alpha);
          ctx.fillRect(s.x-rr*2.6,s.y-.28,rr*5.2,.56);
          ctx.fillRect(s.x-.28,s.y-rr*2.6,.56,rr*5.2);
          ctx.globalAlpha=1;
        }
      }
    }

    if (!reduced && nebulaTime >= nextMeteorAt) {
      const i=Math.floor(nebulaTime*7)%7;
      nebulaMeteors.push({
        x:w*(.10+(i*.13)% .62),
        y:h*(.05+(i*.08)% .24),
        vx:w*(.11+.025*(i%3)),
        vy:h*(.055+.012*(i%4)),
        life:1
      });
      nextMeteorAt=nebulaTime+3.3+(i%4)*.72;
    }
    nebulaMeteors=nebulaMeteors.filter(m=>(m.life-=dt*.58)>0);
    ctx.lineCap='round';
    for(const m of nebulaMeteors){
      if(!reduced){m.x+=m.vx*dt;m.y+=m.vy*dt;}
      const g=ctx.createLinearGradient(m.x-m.vx*.18,m.y-m.vy*.18,m.x,m.y);
      g.addColorStop(0,'rgba(255,30,70,0)');
      g.addColorStop(.72,`rgba(255,72,100,${m.life*.50})`);
      g.addColorStop(1,`rgba(255,248,249,${m.life*.95})`);
      ctx.strokeStyle=g;ctx.lineWidth=1.2+treble*1.4+beat*.65;
      ctx.beginPath();ctx.moveTo(m.x-m.vx*.18,m.y-m.vy*.18);ctx.lineTo(m.x,m.y);ctx.stroke();
    }
    ctx.restore();
    return true;
  }

  window.drawDinechoEffect = (ctx, canvas, theme) => {
    if (theme === 'nebula') return drawNebula(ctx, canvas);
    return typeof baseEffect === 'function' ? baseEffect(ctx, canvas, theme) : false;
  };

  // Keep UI mirrors/cursor synchronized when Red Nebulae was the saved startup theme.
  setTimeout(() => {
    try {
      if ((document.body?.dataset?.theme || '') === 'nebula') {
        if (typeof applyThemeCursor === 'function') applyThemeCursor('nebula');
        if (typeof smartSyncMiniState === 'function') smartSyncMiniState();
      }
    } catch (_) {}
  }, 0);
})();
