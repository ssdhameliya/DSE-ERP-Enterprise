/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "11.0.5.01",
  desktopVersion: "11.0.5",
  webBuild: 1,
  webVersion: "11.0.5.01",
  tag: "web-v11.0.5.01",
  releaseDate: "2026-10-26T10:30:00+05:30",
  environment: "Production / Enterprise",
  summary: "v11.0.5.01 Enterprise Web Parity: Linked Entry Navigation By ID, Live Bank Statement Import Progress & Audit Export, Recon Supplier Records Dialog, Financial Statements Drilldown, and Centralized Date Policy",
  highlights: [
    "1. Linked Entry Direct Navigation by Entity ID: Clicking 🔗 Expense #... or 🔗 Bank Entry #... in Bank Statement now extracts the exact numeric ID and directly loads the entity from the server, isolates the record in the register, applies a pulsing highlight, and auto-scrolls into view (100% Desktop v11.0.5 parity).",
    "2. Live Bank Statement Import Progress & Audit Summary: Added visual multi-stage progress dialog during CSV import, followed by a 4-KPI summary card modal (Total Rows, Imported, Duplicates Skipped, Invalid/Errors) and downloadable row-by-row Excel/CSV audit log.",
    "3. Auto-Match Decimal Tolerance Parity: Updated auto-match allocation to allocate the full bank amount, absorbing sub-rupee rounding differences (e.g. ₹0.50) into reconciled vouchers.",
    "4. Purchase Recon Supplier Auto-Reference & Records Drilldown: Added automated RS-%04d supplier reference assignment and integrated the Recon Supplier Records dialog showing supplier summary KPIs (Total Invoices, Total Value, Linked Amount, Outstanding) and invoice line table with Excel export.",
    "5. Financial Statements Voucher Drilldown & Excel Export: Enabled interactive drill-down on Profit & Loss and Balance Sheet rows, displaying underlying General Ledger vouchers with category debits/credits KPI ribbon and formatted XLSX export.",
    "6. Centralized Date Formatting & Standard Action Toolbars: Enforced FormatUtil.formatDate synchronized with Settings Studio across all register tables, alongside standardized Search, Reset (to Financial Year Apr 1 - Mar 31), and Refresh toolbars."
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
