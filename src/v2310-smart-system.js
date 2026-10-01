(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const select = $('gpuPreferenceSelect');
  const state = $('gpuPreferenceState');
  const list = $('gpuDetectedList');
  const help = $('gpuPreferenceHelp');
  const apply = $('gpuApplyRestartBtn');
  const refresh = $('gpuRefreshBtn');
  const win = $('gpuWindowsSettingsBtn');
  const card = $('gpuSelectorCard');
  if (!select || !window.echoAPI?.getGpuSettings) return;

  let lastPayload = null;
  function powerLabel(value) {
    if (value === 'high-performance') return 'High Performance';
    if (value === 'low-power') return 'Power Saving';
    return 'Balanced / Unknown';
  }
  function optionLabel(adapter) {
    const cls = powerLabel(adapter?.classification);
    return `${adapter?.name || 'GPU'} · ${cls}`;
  }
  function render(payload) {
    lastPayload = payload || {};
    const adapters = Array.isArray(payload?.adapters) ? payload.adapters : [];
    const pref = payload?.preference || { mode:'auto', adapterId:'' };
    select.replaceChildren();
    const auto = document.createElement('option'); auto.value = 'auto'; auto.textContent = 'Auto · Windows decides'; select.appendChild(auto);
    adapters.forEach(adapter => {
      const o = document.createElement('option'); o.value = String(adapter.id); o.textContent = optionLabel(adapter); select.appendChild(o);
    });
    select.value = pref.adapterId && adapters.some(a => String(a.id) === String(pref.adapterId)) ? String(pref.adapterId) : 'auto';
    if (list) {
      list.replaceChildren();
      if (!adapters.length) {
        const empty = document.createElement('div'); empty.className = 'gpu-detected-item'; empty.innerHTML = '<div><strong>No GPU list returned yet</strong><small>Refresh once on Windows after the app finishes starting.</small></div><span class="gpu-power-tag">AUTO</span>'; list.appendChild(empty);
      } else adapters.forEach(adapter => {
        const row = document.createElement('div'); row.className = 'gpu-detected-item';
        const ram = Number(adapter.adapterRam || 0); const ramText = ram > 0 ? ` · ${(ram / 1024 / 1024 / 1024).toFixed(1)} GB reported` : '';
        row.innerHTML = `<div><strong>${escapeHtmlSafe(adapter.name || 'GPU')}</strong><small>${escapeHtmlSafe(adapter.vendor || '')}${adapter.driverVersion ? ` · driver ${escapeHtmlSafe(adapter.driverVersion)}` : ''}${ramText}</small></div><span class="gpu-power-tag">${powerLabel(adapter.classification)}</span>`;
        list.appendChild(row);
      });
    }
    const selectedName = pref.adapterName || (pref.mode === 'auto' ? 'Auto' : powerLabel(pref.mode));
    if (state) state.textContent = selectedName;
    if (help) {
      const boot = payload?.activeBootPreference || {};
      const changed = String(boot.adapterId || '') !== String(pref.adapterId || '') || String(boot.mode || 'auto') !== String(pref.mode || 'auto');
      help.textContent = changed ? 'Saved selection differs from this launch. Restart DEEP-ECHO to apply it.' : 'Current launch matches the saved GPU preference. Windows/driver keeps final control of the physical adapter.';
    }
  }
  function escapeHtmlSafe(value) {
    return String(value || '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
  async function load() {
    card?.classList.add('is-loading');
    if (state) state.textContent = 'Detecting…';
    try {
      const payload = await window.echoAPI.getGpuSettings();
      if (!payload?.success) throw new Error(payload?.error || 'GPU detection failed');
      render(payload);
    } catch (error) {
      if (state) state.textContent = 'Auto';
      if (help) help.textContent = `GPU detection unavailable: ${error?.message || 'Unknown error'}`;
    } finally { card?.classList.remove('is-loading'); }
  }
  apply?.addEventListener('click', async () => {
    const adapterId = select.value || 'auto';
    apply.disabled = true; apply.textContent = 'Applying…';
    try {
      const res = await window.echoAPI.setGpuPreference?.({ adapterId, restart:true });
      if (!res?.success) throw new Error(res?.error || 'Could not save GPU preference');
      if (!res.restartRequired) {
        apply.textContent = 'Already Applied';
        setTimeout(() => { apply.disabled = false; apply.textContent = 'Apply + Restart'; }, 1100);
        try { showToast('GPU preference already active'); } catch (_) {}
      } else {
        apply.textContent = 'Restarting…';
        try { showToast('GPU preference saved · restarting DEEP-ECHO'); } catch (_) {}
      }
    } catch (error) {
      apply.disabled = false; apply.textContent = 'Apply + Restart';
      try { showToast(error?.message || 'GPU preference save failed'); } catch (_) {}
    }
  });
  refresh?.addEventListener('click', load);
  win?.addEventListener('click', async () => {
    const res = await window.echoAPI.openWindowsGraphicsSettings?.();
    if (res && res.success === false) { try { showToast(res.error || 'Windows Graphics Settings unavailable'); } catch (_) {} }
  });
  document.querySelector('[data-tab="settings"]')?.addEventListener('click', () => setTimeout(load, 120));
  load();
})();
