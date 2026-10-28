/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "11.0.8.01",
  desktopVersion: "11.0.8",
  webBuild: 1,
  webVersion: "11.0.8.01",
  tag: "web-v11.0.8.01",
  releaseDate: "2026-10-28T11:00:00+05:30",
  environment: "Production / Enterprise",
  summary: "v11.0.8.01 Enterprise Web Release: All 6 Company Business Images Real-Time Synchronization & Preview (UPI QR, Banner Wallpaper, Application Splash Mark, Invoice Logo, Authorized Signature, Email Signature)",
  highlights: [
    "1. Isolated Email Signature Image: Separated email.signature.image from company.signaturePath & invoice.digital.seal to prevent cross-overwriting and accidental deletions between email signatures and invoice seals.",
    "2. Added Company Email Signature Preview: Added a dedicated Preview button in both Web and Desktop Settings with full image preview capabilities.",
    "3. Real-Time Bidirectional Sync & Deletion Parity: Enabled real-time synchronization whenever ApiSession is established, synchronized canonical and Web alias keys (invoice.header.logo, invoice.digital.seal, payment.upi.qr, application.banner, application.mark), resolved server-resource URIs properly on reload, and ensured deletions on one client immediately clear on the other client without resurrection."
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
