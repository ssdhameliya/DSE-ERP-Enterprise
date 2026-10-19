/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "10.0.35.06",
  desktopVersion: "10.0.35",
  webBuild: 6,
  webVersion: "10.0.35.06",
  tag: "web-v10.0.35.06",
  releaseDate: "2026-10-19T17:35:00+05:30",
  environment: "Production / Enterprise",
  summary: "10.0.35.06 Comprehensive Desktop Parity Release - Full 13-Defect Resolution: Saved Reports recovery, Item Master import/export & concurrency, Master Data category workflows, Bank & Expense filters, Bank Statement history drawer & delete flow, Data Import Studio bank auto-map, Reminder Center 100% desktop parity, Global Audit Trail badges, Settings branding images authoritative sync, Stock Register refresh/export, Customer & Supplier 360 navigation routing, Purchase Register SheetJS Excel/PDF exports."
};

// Automatic UI Version Injection
(function() {
  function syncVersionToDOM() {
    const v = window.DSE_VERSION;
    if (!v) return;

    // 1. Login Page Version Badge
    const loginBadge = document.getElementById('auth-app-version-badge') || document.querySelector('.auth-brand-version-badge');
    if (loginBadge) {
      loginBadge.textContent = `Version ${v.webVersion}`;
      loginBadge.setAttribute('title', `Desktop Baseline: v${v.desktopVersion} | Build #${v.webBuild}`);
    }

    // 2. Login Page Desktop Baseline Tag
    const desktopTag = document.getElementById('auth-desktop-baseline');
    if (desktopTag) {
      desktopTag.textContent = `Desktop Baseline: v${v.desktopVersion}`;
    }

    // 3. App Header Web Version Badge
    const headerBadge = document.getElementById('header-app-version-badge');
    if (headerBadge) {
      headerBadge.textContent = `v${v.webVersion}`;
      headerBadge.setAttribute('title', `Web Studio Build ${v.webVersion} (Desktop ${v.desktopVersion})`);
    }

    // 4. Profile Menu Footer Version
    const profileFooter = document.getElementById('menu-version-footer');
    if (profileFooter) {
      profileFooter.textContent = `Web v${v.webVersion} • Desktop v${v.desktopVersion}`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncVersionToDOM);
  } else {
    syncVersionToDOM();
  }
})();
