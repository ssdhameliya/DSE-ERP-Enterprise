/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "11.0.7.02",
  desktopVersion: "11.0.7",
  webBuild: 2,
  webVersion: "11.0.7.02",
  tag: "web-v11.0.7.02",
  releaseDate: "2026-10-28T02:00:00+05:30",
  environment: "Production / Enterprise",
  summary: "v11.0.7.02 Enterprise Web Release: Centered Modal Dialogs for All Drawers (Zero Table Squeeze), Top Toolbar Action Symmetry, Items Master Reset & Full-Width Register Viewports",
  highlights: [
    "1. Universal Centered Floating Modals: All register and master detail drawers (Bank Entry, Expense Entry, Purchase Recon, Recon Supplier, Items Master, Inventory, Customers, Suppliers, Master Data) now float as clean centered modals with darkened backdrop overlay, preserving 100% full-width table viewports.",
    "2. Action Bar Symmetry: Export Excel, Export PDF, and Print buttons moved to the main filter bar before Reset; financial summaries embedded directly into the pagination footer.",
    "3. Items Master Reset: Complete filter clearing with table refresh.",
    "4. Responsive 88vw × 88vh Document Inspection: Expansive modal popups across Sales, Purchase, Quotation, and Return registers."
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
      loginBadge.textContent = `v${v.webVersion}`;
      loginBadge.title = `Desktop Compatibility: v${v.desktopVersion} | Release Tag: ${v.tag}`;
    }

    // 2. Sidebar Footer Version Tag
    const sidebarBadge = document.getElementById('sidebar-app-version') || document.querySelector('.sidebar-footer-version');
    if (sidebarBadge) {
      sidebarBadge.textContent = `Web v${v.webVersion} • Desktop v${v.desktopVersion}`;
    }

    // 3. Document Title Suffix
    if (!document.title.includes(v.webVersion)) {
      document.title = `${document.title.split(' — ')[0]} — Jasvi Industries ERP v${v.webVersion}`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncVersionToDOM);
  } else {
    syncVersionToDOM();
  }
})();
