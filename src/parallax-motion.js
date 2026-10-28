// =========================================================================
//  DEEP-ECHO · Parallax Motion Engine (Search View Only)
//  ─────────────────────────────────────────────────────
//  Exclusively scoped to #searchView.
//  Home, Settings, Library, and Lyrics are 100% untouched.
// =========================================================================
(() => {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Premium calibrated parameters
  const VERT_CASCADE_SLIDE   = 18;    // px translateY offset
  const VERT_CASCADE_TILT    = 6;     // deg rotateX
  const VERT_CASCADE_SCALE   = 0.03;  // scale reduction (1 → 0.97)
  const VERT_CASCADE_OPACITY = 0.10;  // opacity fade (1 → 0.90)

  const HORIZ_SCALE_CENTER   = 1.05;  // center card scale (subtle 5% pop)
  const HORIZ_SCALE_EDGE     = 0.08;  // scale drop per distance
  const HORIZ_BLUR_MAX       = 2.2;   // soft photographic blur (px)
  const HORIZ_OPACITY_DROP   = 0.18;  // opacity drop (1 → 0.82)
  const HORIZ_ROTATE_Y_MAX   = 5;     // 3D perspective rotation (deg)

  let mainEl  = null;
  let ticking = false;
  let searchShelves = [];

  function boot() {
    mainEl = document.querySelector('main');
    if (!mainEl) return;

    mainEl.addEventListener('scroll', requestTick, { passive: true });

    const searchView = document.getElementById('searchView');
    if (searchView) {
      const observer = new MutationObserver((mutations) => {
        let needsRefresh = false;
        for (const m of mutations) {
          if (m.type === 'childList') needsRefresh = true;
          if (m.type === 'attributes' && m.attributeName === 'class') {
            requestTick();
          }
        }
        if (needsRefresh) refreshSearchShelves();
      });
      observer.observe(searchView, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    refreshSearchShelves();
    requestTick();
  }

  function refreshSearchShelves() {
    const searchView = document.getElementById('searchView');
    if (!searchView) return;

    const nodes = searchView.querySelectorAll(
      '.deepecho-horizontal-shelf, .discovery-carousel'
    );
    nodes.forEach(shelf => {
      if (shelf._parallaxBound) return;
      shelf._parallaxBound = true;
      shelf.addEventListener('scroll', () => updateShelf(shelf), { passive: true });
    });
    searchShelves = Array.from(nodes);
  }

  function requestTick() {
    const searchView = document.getElementById('searchView');
    if (!searchView || !searchView.classList.contains('active')) return;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onFrame);
  }

  function onFrame() {
    ticking = false;
    updateSearchVerticalCascade();
    searchShelves.forEach(updateShelf);
  }

  // 1. Vertical Cascade (ONLY inside Search View)
  function updateSearchVerticalCascade() {
    const searchView = document.getElementById('searchView');
    // Only proceed if searchView is currently active
    if (!searchView || !searchView.classList.contains('active')) return;

    const targets = searchView.querySelectorAll(
      '.view-title-row, .search-smart-bar, .search220-discovery, ' +
      '.search236-landing-hero, .search236-shelf-section'
    );
    if (!targets.length) return;

    const viewH   = mainEl.clientHeight;
    const centerY = viewH / 2;

    for (let i = 0; i < targets.length; i++) {
      const el   = targets[i];
      const rect = el.getBoundingClientRect();

      const elCenter = rect.top + rect.height / 2;
      const normY    = (elCenter - centerY) / centerY;
      const absY     = Math.min(1.5, Math.abs(normY));

      const slideY  = Math.sin(normY) * -VERT_CASCADE_SLIDE;
      const tiltX   = Math.max(-VERT_CASCADE_TILT, Math.min(VERT_CASCADE_TILT, normY * (VERT_CASCADE_TILT + 1)));
      const scale   = 1.0 - absY * VERT_CASCADE_SCALE;
      const opacity = 1.0 - absY * VERT_CASCADE_OPACITY;

      el.style.transform = `perspective(800px) translateY(${slideY}px) rotateX(${tiltX}deg) scale(${Math.max(0.94, scale)})`;
      el.style.opacity   = `${Math.max(0.82, opacity)}`;
    }
  }

  // 2. Horizontal Focus Blur (ONLY inside Search Shelves)
  function updateShelf(shelf) {
    const searchView = document.getElementById('searchView');
    if (!searchView || !searchView.classList.contains('active')) return;

    const cards = shelf.querySelectorAll('.song-card, .playlist-card');
    if (!cards.length) return;

    const shelfRect   = shelf.getBoundingClientRect();
    const shelfCenter = shelfRect.left + shelfRect.width / 2;
    const halfWidth   = shelfRect.width / 2 || 1;

    for (let i = 0; i < cards.length; i++) {
      const card       = cards[i];
      const cardRect   = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;

      const dist    = (cardCenter - shelfCenter) / halfWidth;
      const absDist = Math.min(1.5, Math.abs(dist));

      const scale   = HORIZ_SCALE_CENTER - absDist * HORIZ_SCALE_EDGE;
      const blur    = Math.min(HORIZ_BLUR_MAX, absDist * HORIZ_BLUR_MAX);
      const opacity = 1.0 - absDist * HORIZ_OPACITY_DROP;
      const rotateY = dist * -HORIZ_ROTATE_Y_MAX;

      card.style.transform = `scale(${Math.max(0.92, scale)}) rotateY(${rotateY}deg)`;
      card.style.filter    = `blur(${Math.max(0, blur)}px)`;
      card.style.opacity   = `${Math.max(0.78, opacity)}`;

      if (absDist < 0.25) {
        card.classList.add('parallax-focus');
      } else {
        card.classList.remove('parallax-focus');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
