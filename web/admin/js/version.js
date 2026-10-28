/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.AppVersion = window.DSE_VERSION = {
  version: "11.0.8.05",
  desktopVersion: "11.0.8",
  webBuild: 5,
  webVersion: "11.0.8.05",
  tag: "web-v11.0.8.05",
  releaseDate: "2026-10-29T01:30:00+05:30",
  environment: "Production / Enterprise",
  summary: "v11.0.8.05 Enterprise Web Release: Fix Sales Return Live Register, Create Return Line Preloading, and Audit Trail Drawer Resolution",
  highlights: [
    "1. Returns Register Auto-Loading & Live Parity: Replaced static placeholder with live data rendering, dynamic 6-month date range, automatic DatePickerFormatter binding on view mounting, and instant line item preloading.",
    "2. Create Return Modal Pre-fill & Line Resolution: Passed resolved invoice number from drawer actions, added immediate pre-selection in dropdown before network calls, and enabled instant fallback to in-memory invoice lines.",
    "3. Authoritative Audit Trail & Action Robustness: Enhanced drawer-inv-no DOM resolution in Sales & Purchase inspection drawers so audit timeline, email, payment, barcode, and return actions never throw 'Please select an invoice first'.",
    "4. ViewLoader Dynamic Cache-Busting: Switched cache-busting to dynamic window.DSE_VERSION.webVersion and exposed window.AppVersion globally to eliminate stale view caching."
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
