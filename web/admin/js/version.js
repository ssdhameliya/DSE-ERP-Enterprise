/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "11.0.8.04",
  desktopVersion: "11.0.8",
  webBuild: 4,
  webVersion: "11.0.8.04",
  tag: "web-v11.0.8.04",
  releaseDate: "2026-10-29T00:20:00+05:30",
  environment: "Production / Enterprise",
  summary: "v11.0.8.04 Enterprise Web Release: Eliminate Screen Freezes, Fix Audit Trail & Return Register, Wire All Dead Buttons, and Solidify Image Uploads",
  highlights: [
    "1. Audit Trail & Invoice Action Fix: Extract invoice details prior to drawer closure, resolving 'Please select an invoice first' warnings on audit history, email, and barcode dispatch.",
    "2. Returns Register Data & Freeze Elimination: Fixed backend CTE query to match both 'SALE RETURN' and 'SALES RETURN'; converted create return modal to AppDialogService with automatic backdrop suppression, resolving screen freezing.",
    "3. Zero Dead Buttons (855/855 Wired): Implemented missing Party 360 sub-tab switches and client/vendor quick notes, eliminating all unwired handlers across the application.",
    "4. Settings Studio Image Upload Parity: Ensured extensionless images receive guaranteed image MIME blobs and persistent data URLs so uploaded banners display immediately without rendering blanks."
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
