/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "11.0.3.1",
  desktopVersion: "11.0.3",
  webBuild: 1,
  webVersion: "11.0.3.1",
  tag: "web-v11.0.3.1",
  releaseDate: "2026-10-25T20:15:00+05:30",
  environment: "Production / Enterprise",
  summary: "v11.0.3.1 Enterprise Web Client: Financial Drill-Down Modal Overhaul, Bank Auto-Match Suggestions Review, Universal Navigation Record Isolation, Reference Format Live Tokens & Email Transmission Resizing",
  highlights: [
    "1. Financial Drill-Down Inspection Modal Overhaul: Centralized dynamic modal with sky-blue themed workspace, responsive metric cards strip, real-time transaction search, colored table headers with semantic icons, business date formatting (FormatUtil.formatDate), and color-coded monetary values (orange debit, green credit, cyan balance).",
    "2. Bank Statement Bulk Auto-Match Review: Added interactive Auto Match Suggestions review modal with top KPI metrics, real-time search filtering, selection checkboxes, confidence score badges, and step-by-step bulk matching execution with payment allocations.",
    "3. Bank Statement KPI Cards Interactive Filtering: Removed redundant 8th Reconciled KPI card; transformed 5 KPI cards (Total Transactions, Unmatched, Suggested, Matched, Expenses) into clickable filters with pointer cursor to filter statement transactions by status.",
    "4. Universal Navigation Isolation Across All Registers: Deep-linking and navigation from Global Search and Notification Center to Sales, Purchases, Quotations, Returns, Bank Statements, Items, and Parties isolates and displays only the target record and pre-fills search fields.",
    "5. Reference Format Token Parity in Master Lookups: Real-time token preview badge in lookup rows, token helper insertion chips ({DD}, {MM}, {YYYY}, {YY}, {XXXX}), and live reference number preview box in Add/Edit lookup modal.",
    "6. Email Transmission Modal Resizing & Purchase Return Preview: Upgraded email transmission modal (max-width: 760px; width: 95vw;, rows=12, height: 220px;) and integrated Purchase Return pre-send email preview modal, completely replacing fallback browser prompts."
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
