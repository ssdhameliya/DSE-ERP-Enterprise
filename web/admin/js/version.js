/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "10.0.41.13",
  desktopVersion: "10.0.41",
  webBuild: 13,
  webVersion: "10.0.41.13",
  tag: "web-v10.0.41.13",
  releaseDate: "2026-10-24T03:00:00+05:30",
  environment: "Production / Enterprise",
  summary: "10.0.41.13 Centralized Modal Dialog Parity, Universal Attachment Preview in View/Edit Modes, Zero-Scroll 100% Proportional Line Item Tables, Server-Authoritative Branding & Zero Mock Data Purge",
  highlights: [
    "1. Centralized Modal Dialog Parity: Extended AppDialogService with prompt() modal; installed universal monkey-patches on window.alert, window.confirm, and window.prompt to completely prevent native browser dialogs; migrated Notification Center, Sales, Purchase, Quotation, Returns, and Bank Reconciliation to modern modal dialogs.",
    "2. Universal Multi-Transaction Attachment System: Resolved broken attachment previews across View mode (Details Drawers) and Edit mode (Creation Workspaces) across Sales, Purchases, Quotations, Payments, Return Refunds, and Expenses; routed all file views and downloads through ApiService.viewFile() with Bearer JWT authentication.",
    "3. Table Header & Line Items Horizontal Overflow Elimination: Applied table-layout: fixed !important; width: 100% !important; min-width: 0 !important; and configured 14-column proportional percentage allocations in Sales Creation, Purchase Creation, and Quotation Editor, completely eliminating right-to-left horizontal scrolling.",
    "4. Dynamic Branding & Zero Mock Data Purge: Removed all hardcoded demo company names, addresses, phones, GSTINs, bank accounts, and fallback strings from settings.html and SettingsController.js; upgraded BrandingService to dynamically resolve and render brand logo, application mark, and business tagline directly from PostgreSQL server settings (/api/support/settings)."
  ]
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

    // 3. App Header Web Version Badge (if present)
    const headerBadge = document.getElementById('header-app-version-badge');
    if (headerBadge) {
      headerBadge.textContent = `v${v.webVersion}`;
      headerBadge.setAttribute('title', `Web Studio Build ${v.webVersion} (Desktop ${v.desktopVersion})`);
    }

    // 4. Profile Menu Footer Version
    const profileFooter = document.getElementById('menu-version-footer');
    if (profileFooter) {
      profileFooter.innerHTML = `<span>Web Studio</span><span style="color: var(--cyan); font-weight: 600;">v${v.webVersion}</span>`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncVersionToDOM);
  } else {
    syncVersionToDOM();
  }
})();
