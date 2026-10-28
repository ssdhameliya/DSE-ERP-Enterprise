/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "11.0.8.03",
  desktopVersion: "11.0.8",
  webBuild: 3,
  webVersion: "11.0.8.03",
  tag: "web-v11.0.8.03",
  releaseDate: "2026-10-28T23:25:00+05:30",
  environment: "Production / Enterprise",
  summary: "v11.0.8.03 Enterprise Web Release: Resolve Modal Z-Index Hierarchy, Eliminate Screen Freezes, Auto-Tuck Drawers and Re-selection Reset",
  highlights: [
    "1. Universal Modal Stacking Realignment: Raised action modals to z-index 100060 and dialogs to 100080, lowering inspection windows to 100020, completely eliminating background modal traps.",
    "2. Auto-Tuck Inspection Drawers: Automatically dismiss floating inspection windows upon initiating Create Return, Record Payment, Send Email, and Barcode actions.",
    "3. Navigation Backstop Cleanup: NavigationRouter dismisses all active modals and lingering backdrops on route transitions to prevent click-interception freezes.",
    "4. Image Re-selection & File Input Reset: Auto-cleared file inputs upon selection to ensure continuous image changes and file replacements reliably fire onchange."
  ]
};

// Automatic UI Version Injection
(function() {
  function syncVersionToDOM() {
    const v = window.DSE_VERSION;
    if (!v) return;

    // 1. Login Page Version Badge & Desktop Baseline
    const loginBadge = document.getElementById('auth-app-version-badge') || document.querySelector('.auth-brand-version-badge');
    if (loginBadge) {
      loginBadge.textContent = `Version ${v.webVersion}`;
      loginBadge.title = `Desktop Compatibility: v${v.desktopVersion} | Release Tag: ${v.tag}`;
    }

    const baselineEl = document.getElementById('auth-desktop-baseline');
    if (baselineEl) {
      baselineEl.textContent = `Desktop Baseline: v${v.desktopVersion}`;
    }

    // 2. Profile Menu / Sidebar Version Footer
    const menuVerEl = document.getElementById('menu-version-footer');
    if (menuVerEl) {
      menuVerEl.innerHTML = `<span>Web Studio</span><span style="color: var(--cyan); font-weight: 600;">v${v.webVersion}</span>`;
    }

    // 3. Header & Footer Badges
    const desktopParityEl = document.getElementById('footer-desktop-version');
    if (desktopParityEl) {
      desktopParityEl.textContent = `Desktop v${v.desktopVersion} Parity`;
    }

    const webBuildEl = document.getElementById('footer-web-build');
    if (webBuildEl) {
      webBuildEl.textContent = `Web v${v.webVersion} (${v.environment})`;
    }

    const headerVerEl = document.getElementById('header-app-version');
    if (headerVerEl) {
      headerVerEl.textContent = `v${v.webVersion}`;
    }

    // 4. Any elements with class .dse-version-display
    document.querySelectorAll('.dse-version-display').forEach(el => {
      el.textContent = v.webVersion;
    });

    // 5. Document Title
    if (document.title && !document.title.includes(v.webVersion)) {
      document.title = `${document.title.split(' — ')[0]} — Jasvi Industries ERP v${v.webVersion}`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncVersionToDOM);
  } else {
    syncVersionToDOM();
  }
})();
