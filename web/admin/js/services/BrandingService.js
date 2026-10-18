/**
 * Jasvi Industries ERP - BrandingService
 * Desktop Parity with org.example.service.BrandingService & org.example.ui.SharedApplicationFooter
 * Dynamic settings-driven branding, quotes, company profile, and disappearance rules.
 */
window.BrandingService = (function() {
  'use strict';

  const STORAGE_KEY = 'dse_branding';
  const DEFAULT_BRANDING = {
    name: 'Jashvi Engineers',
    tagline: 'Enterprise Production & Distribution',
    logoPath: 'assets/logo.png',
    phone: '',
    email: '',
    website: '',
    bankName: 'Kotak Mahindra Bank',
    bankAccount: '50200012847192',
    accountHolder: 'Jashvi Engineers'
  };

  let currentProfile = null;

  function loadProfileFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Object.assign({}, DEFAULT_BRANDING, parsed);
      }
    } catch (e) {
      console.warn('[BrandingService] Could not read stored branding:', e);
    }
    return Object.assign({}, DEFAULT_BRANDING);
  }

  function saveProfileToStorage(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('[BrandingService] Could not save branding to storage:', e);
    }
  }

  currentProfile = loadProfileFromStorage();

  // Desktop SharedApplicationFooter disappearance rule
  function updateFooters() {
    const profile = currentProfile || DEFAULT_BRANDING;
    const name = profile.name || DEFAULT_BRANDING.name;
    const phone = (profile.phone || '').trim();
    const email = (profile.email || '').trim();
    const website = (profile.website || '').trim();

    // 1. Auth Desktop Footer (.auth-desktop-footer)
    const authFooter = document.querySelector('.auth-desktop-footer');
    if (authFooter) {
      const trustHtml = `<span style="color: #38bdf8; font-weight: 700;">Secure &nbsp; Local &nbsp; Reliable</span>`;
      const companyHtml = `<span>🏢 ${name}</span>`;
      const phoneHtml = phone ? `<span>📞 ${phone}</span>` : '';
      const emailHtml = email ? `<span>✉️ ${email}</span>` : '';
      const webUrl = website ? (website.startsWith('http') ? website : 'https://' + website) : '';
      const webDisplay = website.replace(/^https?:\/\//, '');
      const websiteHtml = website ? `<span><a href="${webUrl}" target="_blank" style="color:inherit; text-decoration:none;">🔗 ${webDisplay}</a></span>` : '';
      const clockHtml = `<span id="auth-footer-clock" class="auth-clock"></span>`;

      // Build items array, only non-blank optional fields included
      const items = [trustHtml, companyHtml];
      if (phoneHtml) items.push(phoneHtml);
      if (emailHtml) items.push(emailHtml);
      if (websiteHtml) items.push(websiteHtml);
      items.push(clockHtml);

      authFooter.innerHTML = items.map(item => `<div>${item}</div>`).join('');
    }

    // 2. Main App Footer Bar (#app-footer-bar)
    const appFooter = document.getElementById('app-footer-bar');
    if (appFooter) {
      const companyEl = document.getElementById('footer-company-name');
      const phoneEl = document.getElementById('footer-phone');
      const emailEl = document.getElementById('footer-email');
      const websiteEl = document.getElementById('footer-website');

      if (companyEl) {
        companyEl.innerHTML = `<span class="footer-icon">&#127970;</span> <span class="footer-val">${name}</span>`;
      }

      if (phoneEl) {
        if (phone) {
          phoneEl.innerHTML = `<span class="footer-icon">&#128222;</span> <span class="footer-val">${phone}</span>`;
          phoneEl.style.display = 'inline-flex';
        } else {
          phoneEl.style.display = 'none';
        }
      }

      if (emailEl) {
        if (email) {
          emailEl.innerHTML = `<span class="footer-icon">&#9993;&#65039;</span> <span class="footer-val">${email}</span>`;
          emailEl.style.display = 'inline-flex';
        } else {
          emailEl.style.display = 'none';
        }
      }

      if (websiteEl) {
        if (website) {
          const webUrl = website.startsWith('http') ? website : 'https://' + website;
          const webDisplay = website.replace(/^https?:\/\//, '');
          websiteEl.innerHTML = `<a href="${webUrl}" target="_blank" style="color:inherit; text-decoration:none; display:inline-flex; align-items:center; gap:6px;"><span class="footer-icon">&#127760;</span> <span class="footer-val">${webDisplay}</span></a>`;
          websiteEl.style.display = 'inline-flex';
        } else {
          websiteEl.style.display = 'none';
        }
      }
    }
  }

  // Update Auth Brand Elements
  function updateAuthBrand() {
    const profile = currentProfile || DEFAULT_BRANDING;
    const name = profile.name || DEFAULT_BRANDING.name;
    const tagline = profile.tagline || DEFAULT_BRANDING.tagline;

    const brandTitleEl = document.querySelector('.auth-brand-title');
    if (brandTitleEl) brandTitleEl.textContent = name;

    const brandSubtitleEl = document.querySelector('.auth-brand-subtitle');
    if (brandSubtitleEl) brandSubtitleEl.textContent = tagline;

    const brandQuoteEl = document.querySelector('.auth-brand-tagline');
    if (brandQuoteEl) brandQuoteEl.textContent = `Role-aware secure access to ${name}`;

    const cardSubtitleEl = document.getElementById('auth-card-subtitle');
    if (cardSubtitleEl) cardSubtitleEl.textContent = `Role-aware secure access to ${name}`;

    const appHeaderBrandTitle = document.querySelector('.app-header .brand-title');
    if (appHeaderBrandTitle) {
      const parts = name.split(' ');
      if (parts.length > 1) {
        appHeaderBrandTitle.innerHTML = `${parts[0].toUpperCase()} <span>${parts.slice(1).join(' ').toUpperCase()}</span>`;
      } else {
        appHeaderBrandTitle.innerHTML = `${name.toUpperCase()} <span>ERP</span>`;
      }
    }

    // Version Badge
    const versionBadgeEl = document.getElementById('auth-app-version-badge');
    if (versionBadgeEl) {
      const ver = (window.DSE_VERSION && window.DSE_VERSION.version) || '10.0.34';
      versionBadgeEl.textContent = `Version ${ver}`;
    }
  }

  // Fetch settings from server when authenticated
  async function refreshRemote() {
    if (!window.ApiService || !localStorage.getItem('dse_access_token')) {
      return;
    }
    try {
      const settings = await window.ApiService.get('/api/support/settings?prefix=company.').catch(() => null);
      if (settings && typeof settings === 'object') {
        const updated = Object.assign({}, currentProfile);
        if (settings['company.name']) updated.name = settings['company.name'];
        if (settings['company.tagline']) updated.tagline = settings['company.tagline'];
        if (settings['company.phone'] !== undefined) updated.phone = settings['company.phone'];
        if (settings['company.email'] !== undefined) updated.email = settings['company.email'];
        if (settings['company.website'] !== undefined) updated.website = settings['company.website'];
        if (settings['company.bankName']) updated.bankName = settings['company.bankName'];
        if (settings['company.bankAccount']) updated.bankAccount = settings['company.bankAccount'];

        currentProfile = updated;
        saveProfileToStorage(updated);
        updateFooters();
        updateAuthBrand();
      }
    } catch (e) {
      console.warn('[BrandingService] Error fetching remote settings:', e);
    }
  }

  // Live Clock formatting matching desktop SharedApplicationFooter / ClockService
  function startClock() {
    function tick() {
      const now = new Date();
      const options = { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' };
      const datePart = now.toLocaleDateString('en-GB', options);
      const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const clockStr = `📅 ${datePart} | ${timePart} | IST`;

      const authClock = document.getElementById('auth-footer-clock');
      if (authClock) authClock.textContent = clockStr;

      const appClock = document.getElementById('footer-live-clock');
      if (appClock) {
        const valSpan = appClock.querySelector('.footer-val');
        if (valSpan) valSpan.textContent = `${datePart} | ${timePart} | IST`;
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  // Auto initialize on DOMContentLoaded or immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateFooters();
      updateAuthBrand();
      startClock();
    });
  } else {
    updateFooters();
    updateAuthBrand();
    startClock();
  }

  return {
    getProfile() {
      return Object.assign({}, currentProfile || DEFAULT_BRANDING);
    },
    companyName() {
      return (currentProfile && currentProfile.name) || DEFAULT_BRANDING.name;
    },
    tagline() {
      return (currentProfile && currentProfile.tagline) || DEFAULT_BRANDING.tagline;
    },
    loginDescription() {
      return `Role-aware secure access to ${this.companyName()}`;
    },
    updateProfile(newSettings) {
      if (!newSettings || typeof newSettings !== 'object') return;
      currentProfile = Object.assign({}, currentProfile || DEFAULT_BRANDING, newSettings);
      saveProfileToStorage(currentProfile);
      updateFooters();
      updateAuthBrand();
    },
    refresh() {
      updateFooters();
      updateAuthBrand();
      return refreshRemote();
    }
  };
})();
