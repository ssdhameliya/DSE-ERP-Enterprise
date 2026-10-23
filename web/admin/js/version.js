/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "10.0.41.12",
  desktopVersion: "10.0.41",
  webBuild: 12,
  webVersion: "10.0.41.12",
  tag: "web-v10.0.41.12",
  releaseDate: "2026-10-24T02:15:00+05:30",
  environment: "Production / Enterprise",
  summary: "10.0.41.12 Login Page Refresh Zero-Flicker Parity, Item Master & Inventory Row Click Table Collapse Fix, Recon Supplier Master Layout & Pagination Parity, Universal 3D Action Button Colorization, Double-Icon Elimination, and Automated Version Synchronizer",
  highlights: [
    "1. Login Page Refresh Zero-Flicker Parity: Eliminated Frame-0 dual-state flash on refresh by synchronizing index.html static markup with modern enterprise branding and adding synchronous credential pre-population.",
    "2. Item Master & Inventory (Stock Register) Row Click Table Preservation: Removed rogue vertical flex directions from item-master.html and inventory.html, docking side drawers alongside intact, fully visible tables.",
    "3. Full Workspace Table Audit: Verified all 42 system views; confirmed all 19 drawer-enabled tables now strictly adhere to horizontal flex row architecture.",
    "4. Recon Supplier Master Complete Parity: Relocated 4 compact KPI cards to top, implemented zero-waste single-row filter toolbar, defaulted period to Start of FY through Today, purged duplicate buttons, and installed 2027 enterprise register pagination footer.",
    "5. Universal 3D Button Color System: Upgraded all table Action buttons to vibrant 3D Royal Purple, transformed secondary buttons to 3D Indigo gradients, and permanently eliminated dull/black button styling across dark and light modes.",
    "6. Header Double Icons & Multi-Emoji Purge: Excluded all top-bar header controls from automatic icon mutation, resolving double icons (🌙 🌙 Dark, ⚡ ⏰, ⚙️ + New Sale F9).",
    "7. Single-File Version Synchronization: Deployed scripts/sync-version.py and sync-version.ps1 to automatically propagate version metadata across version.json, js/version.js, and all 64+ index.html asset references in ~80ms."
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
