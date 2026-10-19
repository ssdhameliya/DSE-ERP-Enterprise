/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "10.0.35.07",
  desktopVersion: "10.0.35",
  webBuild: 7,
  webVersion: "10.0.35.07",
  tag: "web-v10.0.35.07",
  releaseDate: "2026-10-19T20:15:00+05:30",
  environment: "Production / Enterprise",
  summary: "10.0.35.07 Comprehensive Desktop Parity & Enterprise Hardening Release - Full 10-Defect Resolution: Sale Import stock fallback, Purchase Import preflight reference checks, Bank Statement ISO date normalization, ERP server error transparency, universal direct PDF file downloads (no window.print), Customer/Supplier 360 segmented tabs & attachments API, Purchase Recon reference/date/link parity, Bank Statement history Actions dropdown & row highlight, Bank Entry table alignment & expense category dropdown, Stock Register KPI card icons & uniform 84px height."
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
