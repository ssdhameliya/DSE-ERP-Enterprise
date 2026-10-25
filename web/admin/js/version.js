/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "11.0.4.01",
  desktopVersion: "11.0.4",
  webBuild: 1,
  webVersion: "11.0.4.01",
  tag: "web-v11.0.4.01",
  releaseDate: "2026-10-25T22:30:00+05:30",
  environment: "Production / Enterprise",
  summary: "v11.0.4.0 Enterprise Web Client: Dynamic Table Cell Text Wrapping, High-Contrast Themed KPI Metrics, Universal Navigation Isolation & Company Signature Email Transmission Preview",
  highlights: [
    "1. Dynamic Table Cell Narration & Reference Text Wrapping: Replaced single-line ellipsis truncation with responsive text wrapping and break-word rules in Bank Statement and Reconciliation registers, enabling complete visibility of full narrations without horizontal clipping.",
    "2. Compact Selection Checkbox Sizing: Fixed selection checkbox column to strict 44px centered width across all registers, eliminating excessive whitespace.",
    "3. High-Contrast Themed KPI Metrics: Upgraded KPI ribbon cards across Bank Statement, Bank Entry, and Expense Entry with vibrant theme accents (Cyan, Emerald Green, Coral Red, Amber, Purple) and auto-fitting heights to eliminate overlapping notes.",
    "4. Universal Navigation Record Isolation: Hardened deep-linking and cross-module routing with asynchronous DOM readiness verification, pre-filling correct search inputs and isolating only the target record.",
    "5. Email Transmission Signature Preview: Added company signature & stamp attachment card with dedicated modal preview in email transmission workflow across Sales, Purchases, Quotations, and Returns.",
    "6. Strict Duplicate Statement Import Prevention: Integrated account and statement date period verification to block overlapping statement imports and provide instant redirection to existing batches."
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
