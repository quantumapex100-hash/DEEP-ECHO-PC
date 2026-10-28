// ============================================================================
// DEEP-ECHO Tactile Jelly Master Sound Bar Engine
// High-Fidelity Elastic Glass Ribbon Volume Controller
// Features: Parametric cubic elastica, rubber-band overstretch, spring damping,
// dynamic theme adaptation, sleep-on-idle (0% CPU/GPU when resting).
// ============================================================================

(function () {
  'use strict';

  const THEME_PALETTES = {
    golden: {
      primary: '#f59e0b',
      bright: '#fbbf24',
      light: '#fef3c7',
      deep: '#b45309',
      glow: 'rgba(245, 158, 11, 0.45)',
      border: 'rgba(251, 191, 36, 0.35)',
      badge: '#fbbf24'
    },
    blood: {
      primary: '#f43f5e',
      bright: '#fb7185',
      light: '#ffe4e6',
      deep: '#9f1239',
      glow: 'rgba(244, 63, 94, 0.45)',
      border: 'rgba(251, 113, 133, 0.35)',
      badge: '#fb7185'
    },
    space: {
      primary: '#06b6d4',
      bright: '#38bdf8',
      light: '#e0f2fe',
      deep: '#0e7490',
      glow: 'rgba(6, 182, 212, 0.45)',
      border: 'rgba(56, 189, 248, 0.35)',
      badge: '#38bdf8'
    },
    dark: {
      primary: '#0ea5e9',
      bright: '#38bdf8',
      light: '#e0f2fe',
      deep: '#0369a1',
      glow: 'rgba(14, 165, 233, 0.45)',
      border: 'rgba(56, 189, 248, 0.35)',
      badge: '#38bdf8'
    },
    purple: {
      primary: '#a855f7',
      bright: '#c084fc',
      light: '#f3e8ff',
      deep: '#7e22ce',
      glow: 'rgba(168, 85, 247, 0.45)',
      border: 'rgba(192, 132, 252, 0.35)',
      badge: '#c084fc'
    },
    toxic: {
      primary: '#22c55e',
      bright: '#4ade80',
      light: '#dcfce7',
      deep: '#15803d',
      glow: 'rgba(34, 197, 94, 0.45)',
      border: 'rgba(74, 222, 128, 0.35)',
      badge: '#4ade80'
    },
    silver: {
      primary: '#94a3b8',
      bright: '#e2e8f0',
      light: '#ffffff',
      deep: '#475569',
      glow: 'rgba(226, 232, 240, 0.45)',
      border: 'rgba(203, 213, 225, 0.35)',
      badge: '#e2e8f0'
    },
    light: {
      primary: '#d97706',
      bright: '#f59e0b',
      light: '#fffbeb',
      deep: '#92400e',
      glow: 'rgba(217, 119, 6, 0.4)',
      border: 'rgba(245, 158, 11, 0.35)',
      badge: '#d97706'
    },
    nebula: {
      primary: '#ec4899',
      bright: '#f472b6',
      light: '#fdf2f8',
      deep: '#be185d',
      glow: 'rgba(236, 72, 153, 0.45)',
      border: 'rgba(244, 114, 182, 0.35)',
      badge: '#f472b6'
    },
    fluids: {
      primary: '#8b5cf6',
      bright: '#a78bfa',
      light: '#f5f3ff',
      deep: '#6d28d9',
      glow: 'rgba(139, 92, 246, 0.45)',
      border: 'rgba(167, 139, 250, 0.35)',
      badge: '#a78bfa'
    },
    rgb: {
      primary: '#06b6d4',
      bright: '#f43f5e',
      light: '#ffffff',
      deep: '#8b5cf6',
      glow: 'rgba(244, 63, 94, 0.45)',
      border: 'rgba(6, 182, 212, 0.4)',
      badge: '#38bdf8'
    }
  };

  class JellySoundbar {
    constructor(options = {}) {
      this.canvas = options.canvas || document.getElementById('jellyCanvas');
      this.grooveWrap = options.grooveWrap || document.getElementById('jellyGrooveWrap');
      this.slot = options.slot || document.getElementById('jellySoundbarSlot');
      this.pctBadge = options.pctBadge || document.getElementById('jellyPctBadge');
      this.volIcon = options.volIcon || document.getElementById('jellyVolIcon');
      this.onVolumeChange = options.onVolumeChange || null;

      if (!this.canvas || !this.grooveWrap) return;

      this.ctx = this.canvas.getContext('2d');
      this.dpr = Math.max(1, window.devicePixelRatio || 1);

      // Track dimensions (in CSS pixels)
      this.padX = 14;
      this.trackWidth = 200;
      this.trackHeight = 28;
      this.minX = this.padX;
      this.maxX = this.trackWidth - this.padX;
      this.centerY = 25; // in canvas local coords (canvas is 220x50, groove is 200x28 centered)
      this.ribbonThickness = 8;
      this.thumbRadius = 7.5;

      // State
      this.volume = 1.0; // 0.0 to 1.0
      this.isDragging = false;
      this.isHovering = false;

      // Physics State
      this.currentX = this.minX + this.volume * (this.maxX - this.minX);
      this.targetX = this.currentX;
      this.velX = 0;

      this.currentY = this.centerY;
      this.targetY = this.centerY;
      this.velY = 0;

      // Wave physics for organic wobble
      this.wavePhase = 0;
      this.waveAmplitude = 0;
      this.velWave = 0;

      // Simulation loop flag (sleeps when idle)
      this.isSimulating = false;
      this.lastTime = performance.now();

      // Theme
      this.currentPalette = THEME_PALETTES.golden;
      this.updatePalette();

      // Setup
      this.setupCanvas();
      this.bindEvents();
      this.syncPositionWithSearch();
      this.render(); // initial frame
    }

    getTheme() {
      return document.body.dataset.theme || 'golden';
    }

    updatePalette() {
      const theme = this.getTheme();
      this.currentPalette = THEME_PALETTES[theme] || THEME_PALETTES.golden;
      if (this.slot) {
        this.slot.style.borderColor = this.currentPalette.border;
        this.slot.style.boxShadow = `0 8px 30px rgba(0, 0, 0, 0.7), 0 0 16px ${this.currentPalette.glow}`;
      }
      if (this.pctBadge) {
        this.pctBadge.style.color = this.currentPalette.bright;
      }
      if (this.volIcon) {
        this.volIcon.style.color = this.currentPalette.bright;
      }
      this.wakeUpSimulation();
    }

    setupCanvas() {
      const cssW = 220;
      const cssH = 50;
      this.canvas.width = cssW * this.dpr;
      this.canvas.height = cssH * this.dpr;
      this.canvas.style.width = `${cssW}px`;
      this.canvas.style.height = `${cssH}px`;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    setVolume(normVal, triggerCallback = true) {
      const safe = Math.max(0, Math.min(1, Number(normVal) || 0));
      this.volume = safe;
      this.targetX = this.minX + this.volume * (this.maxX - this.minX);
      this.updateBadge(safe);
      if (triggerCallback && this.onVolumeChange) {
        this.onVolumeChange(safe);
      }
      this.wakeUpSimulation();
    }

    updateBadge(normVal) {
      if (this.pctBadge) {
        const pct = Math.round(normVal * 100);
        this.pctBadge.textContent = `${pct}%`;
      }
      if (this.volIcon) {
        if (normVal <= 0.001) {
          this.volIcon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
        } else if (normVal < 0.5) {
          this.volIcon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`;
        } else {
          this.volIcon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
        }
      }
    }

    bindEvents() {
      const groove = this.grooveWrap;

      // Pointer down
      const onPointerDown = (e) => {
        e.preventDefault();
        this.isDragging = true;
        groove.setPointerCapture?.(e.pointerId);

        const rect = groove.getBoundingClientRect();
        this.updateFromPointer(e.clientX - rect.left, e.clientY - rect.top, true);
        this.wakeUpSimulation();
      };

      // Pointer move
      const onPointerMove = (e) => {
        if (!this.isDragging) return;
        const rect = groove.getBoundingClientRect();
        this.updateFromPointer(e.clientX - rect.left, e.clientY - rect.top, false);
      };

      // Pointer up
      const onPointerUp = (e) => {
        if (!this.isDragging) return;
        this.isDragging = false;
        groove.releasePointerCapture?.(e.pointerId);

        // Snap targetY back to center
        this.targetY = this.centerY;
        // Clamp targetX within valid track bounds
        this.targetX = Math.max(this.minX, Math.min(this.maxX, this.targetX));
        this.velWave += (this.currentY - this.centerY) * 0.4;

        this.wakeUpSimulation();
      };

      groove.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);

      // Mute toggle on vol icon
      if (this.volIcon) {
        this.volIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.volume > 0.001) {
            this.savedVol = this.volume;
            this.setVolume(0, true);
          } else {
            this.setVolume(this.savedVol || 0.75, true);
          }
        });
      }

      // Theme change observer
      const observer = new MutationObserver(() => this.updatePalette());
      observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
      window.addEventListener('themechange', () => this.updatePalette());

      // Search button alignment listener
      window.addEventListener('resize', () => this.syncPositionWithSearch());
      // Re-sync after short delay in case fonts/dom layout shift
      setTimeout(() => this.syncPositionWithSearch(), 100);
      setTimeout(() => this.syncPositionWithSearch(), 500);
    }

    updateFromPointer(px, py, isStart) {
      // Groove local x (0 to 200), y (0 to 30)
      // Map to canvas coords: canvas x = px + 10, canvas y = py + 10
      const canvasX = px + 10;
      const canvasY = py + 10;

      // Rubber-band overstretch calculation along X
      let targetX = canvasX;
      if (canvasX < this.minX) {
        const dx = canvasX - this.minX;
        targetX = this.minX - Math.log1p(Math.abs(dx) * 0.08) * 12;
      } else if (canvasX > this.maxX) {
        const dx = canvasX - this.maxX;
        targetX = this.maxX + Math.log1p(Math.abs(dx) * 0.08) * 12;
      }
      this.targetX = targetX;

      // Elastic pull along Y (up/down bend)
      const dy = canvasY - this.centerY;
      // Damped vertical displacement
      this.targetY = this.centerY + Math.sign(dy) * Math.log1p(Math.abs(dy) * 0.12) * 14;

      // Normalized volume clamped to [0, 1]
      const clampedX = Math.max(this.minX, Math.min(this.maxX, canvasX));
      const newVol = (clampedX - this.minX) / (this.maxX - this.minX);
      this.volume = newVol;
      this.updateBadge(newVol);

      if (this.onVolumeChange) {
        this.onVolumeChange(newVol);
      }

      this.wakeUpSimulation();
    }

    syncPositionWithSearch() {
      const searchBtn = document.getElementById('searchBtn');
      const slot = this.slot;
      if (!searchBtn || !slot || !slot.parentElement) return;

      const btnRect = searchBtn.getBoundingClientRect();
      const parentRect = slot.parentElement.getBoundingClientRect();
      if (btnRect.width > 0 && parentRect.width > 0) {
        const exactLeft = btnRect.left - parentRect.left;
        const maxLeft = Math.max(0, parentRect.width - (slot.offsetWidth || 300) - 10);
        const finalLeft = Math.max(0, Math.min(maxLeft, exactLeft));
        slot.style.left = `${Math.round(finalLeft)}px`;
      }
    }

    wakeUpSimulation() {
      if (this.isSimulating) return;
      this.isSimulating = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.simulationStep(t));
    }

    simulationStep(now) {
      const dt = Math.min(0.033, (now - this.lastTime) / 1000);
      this.lastTime = now;

      // Spring physics parameters
      const stiffnessX = this.isDragging ? 320 : 220;
      const dampingX = this.isDragging ? 22 : 18;

      const stiffnessY = 260;
      const dampingY = 16;

      // Integrate X
      const forceX = -stiffnessX * (this.currentX - this.targetX) - dampingX * this.velX;
      this.velX += forceX * dt;
      this.currentX += this.velX * dt;

      // Integrate Y
      const forceY = -stiffnessY * (this.currentY - this.targetY) - dampingY * this.velY;
      this.velY += forceY * dt;
      this.currentY += this.velY * dt;

      // Integrate organic ripple wave
      const forceWave = -180 * this.waveAmplitude - 12 * this.velWave;
      this.velWave += forceWave * dt;
      this.waveAmplitude += this.velWave * dt;
      this.wavePhase += dt * 14;

      // Render updated frame
      this.render();

      // Check for rest condition to sleep and save 100% CPU/GPU
      const isAtRest =
        !this.isDragging &&
        Math.abs(this.currentX - this.targetX) < 0.05 &&
        Math.abs(this.velX) < 0.1 &&
        Math.abs(this.currentY - this.centerY) < 0.05 &&
        Math.abs(this.velY) < 0.1 &&
        Math.abs(this.waveAmplitude) < 0.05;

      if (isAtRest) {
        // Snap to rest values
        this.currentX = this.targetX;
        this.currentY = this.centerY;
        this.velX = 0;
        this.velY = 0;
        this.waveAmplitude = 0;
        this.render();
        this.isSimulating = false; // SLEEP! 0% CPU!
      } else {
        requestAnimationFrame((t) => this.simulationStep(t));
      }
    }

    render() {
      const ctx = this.ctx;
      const palette = this.currentPalette;
      const w = 220;
      const h = 50;

      ctx.clearRect(0, 0, w, h);

      // Track offset in canvas: groove is at x: 10, y: 11, width: 200, height: 28
      const gx = 10;
      const gy = 11;
      const gw = this.trackWidth;
      const gh = this.trackHeight;
      const gr = gh / 2;

      // 1. Draw Neu-morphic Dark Track Groove
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(gx, gy, gw, gh, gr);
      ctx.fillStyle = '#090d16';
      ctx.fill();

      // Inner shadow
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.stroke();

      // Empty Track Slot Line
      ctx.beginPath();
      ctx.moveTo(this.minX, this.centerY);
      ctx.lineTo(this.maxX, this.centerY);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.stroke();
      ctx.restore();

      // 2. Draw Elastic Jelly Ribbon Body
      const startX = this.minX;
      const startY = this.centerY;
      const endX = this.currentX;
      const endY = this.currentY;

      if (endX > startX + 1) {
        ctx.save();

        // Outer Glow
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = 14;

        // Gradient along the ribbon length
        const grad = ctx.createLinearGradient(startX, startY, endX, endY);
        grad.addColorStop(0, palette.light);
        grad.addColorStop(0.3, palette.bright);
        grad.addColorStop(0.8, palette.primary);
        grad.addColorStop(1, palette.deep);

        // Ribbon thickness dynamic stretch thinning
        const stretchDist = Math.hypot(endX - startX, endY - startY);
        const normalDist = Math.max(1, this.maxX - this.minX);
        const stretchRatio = Math.min(1.4, stretchDist / normalDist);
        const currentThickness = Math.max(5, this.ribbonThickness / (1 + (stretchRatio - 1) * 0.4));

        // Parametric Spline with organic S-curve & wobble
        const halfT = currentThickness / 2;
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2 + Math.sin(this.wavePhase) * this.waveAmplitude;

        // Spline control points
        const cp1x = startX + (midX - startX) * 0.6;
        const cp1y = startY + (endY - startY) * 0.2;
        const cp2x = midX + (endX - midX) * 0.4;
        const cp2y = endY - (endY - startY) * 0.1;

        // Draw Filled Jelly Ribbon Shape
        ctx.beginPath();
        // Start round cap
        ctx.arc(startX, startY, halfT, Math.PI / 2, -Math.PI / 2);
        // Top edge spline to thumb
        ctx.bezierCurveTo(cp1x, cp1y - halfT, cp2x, cp2y - halfT, endX, endY - halfT);
        // Thumb connecting arc
        ctx.arc(endX, endY, this.thumbRadius, -Math.PI / 2, Math.PI / 2);
        // Bottom edge spline back to start
        ctx.bezierCurveTo(cp2x, cp2y + halfT, cp1x, cp1y + halfT, startX, startY + halfT);
        ctx.closePath();

        ctx.fillStyle = grad;
        ctx.fill();

        // 3. Crisp Liquid Specular Highlight along upper crest
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(startX + 2, startY - halfT + 1.5);
        ctx.bezierCurveTo(cp1x, cp1y - halfT + 1.5, cp2x, cp2y - halfT + 1.5, endX - 2, endY - halfT + 1.5);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
      }

      // 4. Draw 3D Jelly Thumb Bead
      ctx.save();
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = 12;

      // Bead sphere body
      const beadGrad = ctx.createRadialGradient(
        endX - 2,
        endY - 2,
        1,
        endX,
        endY,
        this.thumbRadius
      );
      beadGrad.addColorStop(0, '#ffffff');
      beadGrad.addColorStop(0.25, palette.bright);
      beadGrad.addColorStop(0.7, palette.primary);
      beadGrad.addColorStop(1, palette.deep);

      ctx.beginPath();
      ctx.arc(endX, endY, this.thumbRadius, 0, Math.PI * 2);
      ctx.fillStyle = beadGrad;
      ctx.fill();

      // Specular Hotspot
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(endX - 2, endY - 2, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fill();

      // Rim Light
      ctx.beginPath();
      ctx.arc(endX, endY, this.thumbRadius, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.stroke();

      ctx.restore();
    }
  }

  // Auto initialize on DOM ready and connect with DEEP-ECHO Audio Engine
  function initDeepEchoJellySoundbar() {
    const slot = document.getElementById('jellySoundbarSlot');
    if (!slot) return;

    const audioPlayer = document.getElementById('audioPlayer');

    const jelly = new JellySoundbar({
      onVolumeChange: (normVol) => {
        const pct = Math.round(normVol * 100);
        if (typeof window.applyVolumeSettings === 'function') {
          window.applyVolumeSettings(pct, pct === 0);
        } else if (audioPlayer) {
          audioPlayer.volume = normVol;
          audioPlayer.muted = normVol === 0;
        }
      }
    });

    window.__dinechoJellySoundbar = jelly;

    // Sync initial volume
    if (audioPlayer) {
      const initial = audioPlayer.muted ? 0 : (audioPlayer.volume ?? 1);
      jelly.setVolume(initial, false);

      // Listen to volume changes from keyboard, settings slider, or mute buttons
      audioPlayer.addEventListener('volumechange', () => {
        if (!jelly.isDragging) {
          const current = audioPlayer.muted ? 0 : (audioPlayer.volume ?? 1);
          jelly.setVolume(current, false);
        }
      });
    }

    // Keep position aligned whenever tabs or windows change
    window.addEventListener('resize', () => jelly.syncPositionWithSearch());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) jelly.syncPositionWithSearch();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDeepEchoJellySoundbar);
  } else {
    initDeepEchoJellySoundbar();
  }

  window.JellySoundbar = JellySoundbar;
})();
