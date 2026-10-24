/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "11.0.0.01",
  desktopVersion: "11.0.0",
  webBuild: 1,
  webVersion: "11.0.0.01",
  tag: "web-v11.0.0.01",
  releaseDate: "2026-10-25T00:30:00+05:30",
  environment: "Production / Enterprise",
  summary: "v11.0.0.01 Enterprise Web Client Rollback to Pure HTML5/JS/CSS Decoupled Architecture",
  highlights: [
    "1. Pure Decoupled Web Platform: Standardized on high-performance HTML5, CSS3, and Vanilla JavaScript client portal, completely removing embedded server-side UI dependencies.",
    "2. Centralized Modal Dialog Parity: Extended AppDialogService with prompt() modal; installed universal monkey-patches on window.alert, window.confirm, and window.prompt to completely prevent native browser dialogs.",
    "3. Universal Multi-Transaction Attachment System: File views and downloads through ApiService.viewFile() with Bearer JWT authentication.",
    "4. Dynamic Branding & Zero Mock Data: Brand logo, application mark, and business tagline dynamically resolved from PostgreSQL server settings (/api/support/settings)."
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
