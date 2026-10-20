/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "10.0.38.06",
  desktopVersion: "10.0.38",
  webBuild: 6,
  webVersion: "10.0.38.06",
  tag: "web-v10.0.38.06",
  releaseDate: "2026-10-21T02:00:00+05:30",
  environment: "Production / Enterprise",
  summary: "10.0.38.06 Comprehensive Light Mode Polish, Zero-Glitch Focus Engine, Universal 100% Single-Row KPI Ribbon Parity, Master Data 50% Category Rail Expansion, and Controller Robustness"
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
