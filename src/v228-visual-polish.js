(() => {
  'use strict';

  // Presentation-only module. Deliberately isolated from playback, analyser,
  // lyrics timing and download code so the v2.2.7 stable behaviour is preserved.
  const BRIGHTNESS_KEY = 'deepecho-v228-visualizer-brightness';
  const BACKDROP_KEY = 'deepecho-v228-lyrics-backdrop-darkness';
  const V4_MIGRATION_KEY = 'deepecho-v228-v4-glow-migrated';
  const FUTURE_LYRICS_KEY = 'deepecho-v228-future-lyrics-contrast';

  const brightnessRange = document.getElementById('v228VisualizerBrightnessRange');
  const brightnessValue = document.getElementById('v228VisualizerBrightnessValue');
  const backdropRange = document.getElementById('v228LyricsBackdropRange');
  const backdropValue = document.getElementById('v228LyricsBackdropValue');
  const glowPreset = document.getElementById('v228GlowPreset');
  const futureLyricsRange = document.getElementById('v228FutureLyricsRange');
  const futureLyricsValue = document.getElementById('v228FutureLyricsValue');
  const resetVisualBtn = document.getElementById('v228ResetVisualBtn');

  const clamp = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };

  function applyBrightness(raw, persist = true) {
    const value = clamp(raw, 85, 135, 108);
    document.documentElement.style.setProperty('--v228-visualizer-brightness', String(value / 100));
    // Under render pressure the canvas already supplies its native themed glow.
    // Avoid an extra full-bitmap pass at the default setting; custom brightness
    // still works, and high/ultra retain the original filter chain.
    document.documentElement.style.setProperty('--v170-adaptive-canvas-filter', value === 108 ? 'none' : `brightness(${value / 100})`);
    if (brightnessRange) brightnessRange.value = String(value);
    if (brightnessValue) brightnessValue.textContent = `${Math.round(value)}%`;
    if (persist) localStorage.setItem(BRIGHTNESS_KEY, String(value));
  }

  function applyBackdrop(raw, persist = true) {
    const value = clamp(raw, 0, 20, 0);
    document.documentElement.style.setProperty('--v228-lyrics-dim-alpha', String(value / 100));
    if (backdropRange) backdropRange.value = String(value);
    if (backdropValue) backdropValue.textContent = `${Math.round(value)}%`;
    if (persist) localStorage.setItem(BACKDROP_KEY, String(value));
  }


  function applyFutureLyricsContrast(raw, persist = true) {
    const value = clamp(raw, 45, 80, 64);
    document.documentElement.style.setProperty('--v228-future-lyric-opacity', String(value / 100));
    document.documentElement.style.setProperty('--v228-past-lyric-opacity', String(Math.max(.28, value / 100 - .24)));
    if (futureLyricsRange) futureLyricsRange.value = String(value);
    if (futureLyricsValue) futureLyricsValue.textContent = `${Math.round(value)}%`;
    if (persist) localStorage.setItem(FUTURE_LYRICS_KEY, String(value));
  }

  function syncGlowPreset(value) {
    if (!glowPreset) return;
    const n = Number(value);
    glowPreset.value = n <= 100 ? 'soft' : n >= 116 ? 'strong' : 'balanced';
  }

  if (!localStorage.getItem(V4_MIGRATION_KEY)) { localStorage.setItem(BRIGHTNESS_KEY, '108'); localStorage.setItem(V4_MIGRATION_KEY, '1'); }
  applyBrightness(localStorage.getItem(BRIGHTNESS_KEY) ?? 108, false);
  applyBackdrop(localStorage.getItem(BACKDROP_KEY) ?? 0, false);
  applyFutureLyricsContrast(localStorage.getItem(FUTURE_LYRICS_KEY) ?? 64, false);
  syncGlowPreset(brightnessRange?.value || 108);

  brightnessRange?.addEventListener('input', event => { applyBrightness(event.currentTarget.value); syncGlowPreset(event.currentTarget.value); });
  glowPreset?.addEventListener('change', event => { const map = {soft:96,balanced:108,strong:120}; applyBrightness(map[event.currentTarget.value] || 108); });
  futureLyricsRange?.addEventListener('input', event => applyFutureLyricsContrast(event.currentTarget.value));
  resetVisualBtn?.addEventListener('click', () => { applyBrightness(108); applyBackdrop(0); applyFutureLyricsContrast(64); syncGlowPreset(108); });
  backdropRange?.addEventListener('input', event => applyBackdrop(event.currentTarget.value));
})();
