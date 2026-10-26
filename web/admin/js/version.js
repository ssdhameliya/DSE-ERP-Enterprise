/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "11.0.6.01",
  desktopVersion: "11.0.6",
  webBuild: 1,
  webVersion: "11.0.6.01",
  tag: "web-v11.0.6.01",
  releaseDate: "2026-10-27T01:15:00+05:30",
  environment: "Production / Enterprise",
  summary: "v11.0.6.01 Enterprise Web Parity: Universal Excel Export Across All 5 Bank & Expense Screens, 980px Multi-Target Chooser Dialog Parity (6 Columns & KPI Ribbon), Full 12-Reference Cross-Module Navigation, and Non-Clipped Colorful Badge Chips",
  highlights: [
    "1. Universal Excel Export Across All 5 Bank Screens: Implemented one-click XLSX/CSV export in Bank Entry, Expense Entry, Bank Statement, Purchase Recon, and Recon Supplier Master with standard financial table formatting and headers.",
    "2. 980px Multi-Target Chooser Dialog Parity: Upgraded #modal-linked-allocations to 980px with a 5-KPI summary ribbon (Bank Ref, Linked Targets, Total Allocated, Round-off, Difference) and 6-column non-clipped table (Target Type, Document No, Details / Narration, Amount, Round-off, Action) featuring individual View buttons.",
    "3. Complete 12-Reference Cross-Module Navigation: Enhanced DeepLinkService and BankStatementController to recognize all 12 bank-related references (BE/..., BSE-..., PRC-..., RS-..., STM-..., EXP-..., VCH-..., etc.) with intelligent mode switching and register highlighting.",
    "4. Side Drawer Suppression: Suppressed automatic opening of bank and expense side drawers during linked entry travel so records are cleanly focused in the main viewport table without obstructing the workspace.",
    "5. Expanded Column Widths & Colorful Badge Chips: Expanded Match / Link table headers to 220px-230px and added vibrant pill styles (pill-purple, pill-cyan, pill-teal, pill-blue, pill-orange) eliminating all text and badge clipping across desktop and laptop displays."
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
