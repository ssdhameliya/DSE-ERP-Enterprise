/**

 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry

 * Automatically synchronized with version.json and Desktop release revision.

 */

window.AppVersion = window.DSE_VERSION = {

  version: "11.0.14.01",

  desktopVersion: "11.0.14",

  webBuild: 12,

  webVersion: "11.0.14.01",

  tag: "web-v11.0.14.01",

  releaseDate: "2026-10-31T20:00:00+05:30",

  environment: "Production / Enterprise",

  summary: "v11.0.11.01 Enterprise Web Release: Enterprise Diagnostic Ledger (Ctrl+Shift+L), 88% Responsive Modals, Zero Bleed-Through, Pre-Indexed Audit Trail Search & Full Web Parity with Desktop v11.0.11",

  highlights: [

    "1. Enterprise System & Application Diagnostics: Full parity with Desktop Diagnostic Ledger via global shortcut Ctrl+Shift+L, live error counter badge, Spring Boot regex log parsing, plain-English guidance, and CSV export.",

    "2. Zero Bleed-Through & 88% Responsive Inspection Modals: Eliminated transparency bleed-through in Sales & Purchase inspection modals (#0d1527 solid background, 88% viewport width) and eliminated legacy 380px squished inline drawers.",

    "3. High-Performance Pre-Indexed Audit Trail: Integrated pre-computed search indexing and 250ms debounced filtering for instant response on extensive audit logs, accompanied by 5 KPI summary counters and CSV export.",

    "4. Universal Reference Hyperlinks (#38bdf8): Extended regex pattern matcher across all 75 document types (JI, INV, SO, PO, QTN, REF, RS, PRC, BE, EXP, SAL-RET, PUR-RET, CUST, SUP, CN, DN, BANK, PAY) with 1-click clipboard copy toast.",

    "5. Supplier Recon & Bank Statement Multi-Allocation: Added dedicated Supplier Records inspection modal with instant search and CSV export, plus Bank Statement multi-voucher allocation viewing.",

    "6. Context-Aware Return Navigation: Intelligently switches between 'View Return' and 'Create Return' based on settlement status."

  ]

};



// Automatic UI Version Injection

(function() {

  function syncVersionToDOM() {

    const v = window.DSE_VERSION;

    if (!v) return;



    // 1. Login Page Version Badge & Desktop Baseline

    const loginBadge = document.getElementById('auth-app-version-badge') || document.querySelector('.auth-brand-version-badge');

    if (loginBadge) {

      loginBadge.textContent = `Version ${v.webVersion}`;

      loginBadge.title = `Desktop Compatibility: v${v.desktopVersion} | Release Tag: ${v.tag}`;

    }



    const baselineEl = document.getElementById('auth-desktop-baseline');

    if (baselineEl) {

      baselineEl.textContent = `Desktop Baseline: v${v.desktopVersion}`;

    }



    // 2. Profile Menu / Sidebar Version Footer

    const menuVerEl = document.getElementById('menu-version-footer');

    if (menuVerEl) {

      menuVerEl.innerHTML = `<span>Web Studio</span><span style="color: var(--cyan); font-weight: 600;">v${v.webVersion}</span>`;

    }



    // 3. Header & Footer Badges

    const desktopParityEl = document.getElementById('footer-desktop-version');

    if (desktopParityEl) {

      desktopParityEl.textContent = `Desktop v${v.desktopVersion} Parity`;

    }



    const webBuildEl = document.getElementById('footer-web-build');

    if (webBuildEl) {

      webBuildEl.textContent = `Web v${v.webVersion} (${v.environment})`;

    }



    const headerVerEl = document.getElementById('header-app-version');

    if (headerVerEl) {

      headerVerEl.textContent = `v${v.webVersion}`;

    }



    // 4. Any elements with class .dse-version-display

    document.querySelectorAll('.dse-version-display').forEach(el => {

      el.textContent = v.webVersion;

    });



    // 5. Document Title

    if (document.title && !document.title.includes(v.webVersion)) {

      document.title = `${document.title.split(' — ')[0]} — Jasvi Industries ERP v${v.webVersion}`;

    }

  }



  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', syncVersionToDOM);

  } else {

    syncVersionToDOM();

  }

})();

