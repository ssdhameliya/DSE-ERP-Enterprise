/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "11.0.7.03",
  desktopVersion: "11.0.7",
  webBuild: 3,
  webVersion: "11.0.7.03",
  tag: "web-v11.0.7.03",
  releaseDate: "2026-10-28T09:10:00+05:30",
  environment: "Production / Enterprise",
  summary: "v11.0.7.03 Enterprise Web Release: 1-to-1 Desktop Parity for Sales & Purchase Inspection Popups (Clean Inline SVGs, 4 Overview Cards, 4 Canonical Tabs, 10-Button Action Dock, Zero Mojibake)",
  highlights: [
    "1. Desktop Inspection Dialog Parity: Sales & Purchase Inspection Popups redesigned with 32px Hero Bar, Party/Due kicker, Copy Ref button, and Live Status Pills.",
    "2. Prominent 4 Overview Cards: Customer/Supplier Details, Document Breakdown, Collection/Outflow Status, Logistics & Tax / Terms.",
    "3. 4 Canonical Tabs: Consignment/Purchased Items, Payments & Allocations, Attachments (Upload/Preview/Download), Transport & Notes / Logistics & Terms.",
    "4. 10-Button Desktop Action Dock: Edit, Duplicate, PDF Print, Barcode, Excel, Email, Record Payment/Outflow, Create Return, Audit Trail, Approve/Reject.",
    "5. Zero Mojibake / Character Corruption: All legacy Unicode encoding glitches replaced with crisp, ultra-modern inline SVGs."
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
