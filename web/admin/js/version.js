/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "11.0.7.04",
  desktopVersion: "11.0.7",
  webBuild: 4,
  webVersion: "11.0.7.04",
  tag: "web-v11.0.7.04",
  releaseDate: "2026-10-28T10:25:00+05:30",
  environment: "Production / Enterprise",
  summary: "v11.0.7.04 Enterprise Web Release: Fix Centralized Prompt Dialog Input Field (Interactive Recipient Input & Asynchronous Prompt Handling)",
  highlights: [
    "1. Fix AppDialogService.prompt: Added missing input container (#app-dialog-prompt-wrap) to centralized #modal-app-dialog in index.html and dynamic DOM fallback.",
    "2. Asynchronous Prompt Awaiting: Converted testEmail(), rejectRegistration(), rejectSale(), and return actions to properly await prompt() input resolution.",
    "3. Live Email Test Pipeline: Test email probe now displays recipient input field pre-filled with default sender, allowing smooth delivery verification."
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
