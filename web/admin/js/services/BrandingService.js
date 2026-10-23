/**
 * Jasvi Industries ERP - BrandingService
 * Desktop Parity with org.example.service.BrandingService & org.example.ui.SharedApplicationFooter
 * Dynamic settings-driven branding, quotes, company profile, and disappearance rules.
 * ZERO mock data: Authoritative values loaded from server settings (/api/support/settings).
 */
window.BrandingService = (function() {
  'use strict';

  const STORAGE_KEY = 'dse_branding';
  const DEFAULT_BRANDING = {
    name: '',
    tagline: '',
    logoPath: '',
    phone: '',
    email: '',
    website: '',
    bankName: '',
    bankAccount: '',
    accountHolder: '',
    mark: '',
    banner: '',
    logo: ''
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

  async function resolveAssetUrl(val, assetKey) {
    if (!val || typeof val !== 'string' || val.trim() === '' || val === 'null' || val === 'undefined') {
      return '';
    }
    if (val.startsWith('data:') || val.startsWith('http:') || val.startsWith('https:') || val.startsWith('assets/')) {
      return val;
    }
    let key = '';
    if (val.startsWith('server-resource:')) {
      key = val.replace('server-resource:', '').trim();
    } else if (val.includes(':\\') || val.startsWith('/') || val.startsWith('\\')) {
      if (assetKey) key = assetKey;
    } else if (assetKey) {
      key = assetKey;
    }

    if (key) {
      try {
        const token = (window.AuthService && window.AuthService.getAccessToken ? window.AuthService.getAccessToken() : null) ||
                      localStorage.getItem('dse_access_token') ||
                      localStorage.getItem('auth_token');
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const resp = await fetch(`/api/authority/resources/BUSINESS_ASSET/${encodeURIComponent(key)}`, { headers });
        if (resp.ok) {
          const blob = await resp.blob();
          if (blob && blob.size > 0) {
            const mime = (blob.type && blob.type.startsWith('image/')) ? blob.type : 'image/png';
            const imgBlob = (blob.type === mime) ? blob : new Blob([blob], { type: mime });
            return URL.createObjectURL(imgBlob);
          }
        }
      } catch (err) {
        console.warn('[BrandingService] Failed to resolve server-resource ' + key, err);
      }
    }
    return '';
  }

  // Desktop SharedApplicationFooter disappearance rule
  function updateFooters() {
    const profile = currentProfile || DEFAULT_BRANDING;
    const name = (profile.name || '').trim();
    const phone = (profile.phone || '').trim();
    const email = (profile.email || '').trim();
    const website = (profile.website || '').trim();

    // 1. Auth Desktop Footer (.auth-desktop-footer)
    const authFooter = document.querySelector('.auth-desktop-footer');
    if (authFooter) {
      const trustHtml = `<span style="color: #38bdf8; font-weight: 700;">Secure &nbsp; Local &nbsp; Reliable</span>`;
      const companyHtml = name ? `<span>🏢 ${name}</span>` : '';
      const phoneHtml = phone ? `<span>📞 ${phone}</span>` : '';
      const emailHtml = email ? `<span>✉️ ${email}</span>` : '';
      const webUrl = website ? (website.startsWith('http') ? website : 'https://' + website) : '';
      const webDisplay = website.replace(/^https?:\/\//, '');
      const websiteHtml = website ? `<span><a href="${webUrl}" target="_blank" style="color:inherit; text-decoration:none;">🔗 ${webDisplay}</a></span>` : '';
      const clockHtml = `<span id="auth-footer-clock" class="auth-clock"></span>`;

      // Build items array, only non-blank optional fields included
      const items = [trustHtml];
      if (companyHtml) items.push(companyHtml);
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
        if (name) {
          companyEl.innerHTML = `<span class="footer-icon">&#127970;</span> <span class="footer-val">${name}</span>`;
          companyEl.style.display = 'inline-flex';
        } else {
          companyEl.style.display = 'none';
        }
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

  // Update Auth Brand Elements & Header Brand
  function updateAuthBrand() {
    const profile = currentProfile || DEFAULT_BRANDING;
    const name = (profile.name || '').trim();
    const tagline = (profile.tagline || '').trim();

    const brandTitleEl = document.querySelector('.auth-brand-title');
    if (brandTitleEl) brandTitleEl.textContent = name || 'Enterprise ERP';

    const brandSubtitleEl = document.querySelector('.auth-brand-subtitle');
    if (brandSubtitleEl) {
      brandSubtitleEl.textContent = tagline;
      brandSubtitleEl.style.display = tagline ? 'block' : 'none';
    }

    const brandQuoteEl = document.querySelector('.auth-brand-tagline');
    if (brandQuoteEl) {
      brandQuoteEl.textContent = name ? `Role-aware secure access to ${name}` : 'Role-aware secure enterprise access';
    }

    const cardSubtitleEl = document.getElementById('auth-card-subtitle');
    if (cardSubtitleEl) {
      cardSubtitleEl.textContent = name ? `Role-aware secure access to ${name}` : 'Role-aware secure enterprise access';
    }

    const appHeaderBrandTitle = document.querySelector('.app-header .brand-title');
    if (appHeaderBrandTitle) {
      if (name) {
        const parts = name.split(' ');
        if (parts.length > 1) {
          appHeaderBrandTitle.innerHTML = `${parts[0].toUpperCase()} <span>${parts.slice(1).join(' ').toUpperCase()}</span>`;
        } else {
          appHeaderBrandTitle.innerHTML = `${name.toUpperCase()} <span>ERP</span>`;
        }
      } else {
        appHeaderBrandTitle.innerHTML = `ENTERPRISE <span>ERP</span>`;
      }
    }

    // Header Logo Icon (displays logo image or mark image or first initial)
    const headerLogoEl = document.getElementById('header-brand-logo');
    if (headerLogoEl) {
      const markUrl = localStorage.getItem('dse_brand_mark_url') || profile.mark;
      const logoUrl = localStorage.getItem('dse_brand_logo_url') || profile.logo;
      const displayImg = markUrl || logoUrl;
      if (displayImg) {
        headerLogoEl.innerHTML = `<img src="${displayImg}" style="width:100%; height:100%; object-fit:contain; border-radius:inherit;" alt="Logo" onerror="this.style.display='none';">`;
      } else if (name) {
        headerLogoEl.textContent = name.charAt(0).toUpperCase();
      } else {
        headerLogoEl.textContent = 'E';
      }
    }

    // Desktop LoginController.java:231-239 parity: Hide mark card when asset is removed/empty
    const markBox = document.getElementById('auth-brand-mark-box');
    const markImg = document.getElementById('auth-brand-mark-img');
    const bannerBox = document.getElementById('auth-brand-banner-box');
    const bannerImg = document.getElementById('auth-brand-banner-img');

    const markActive = localStorage.getItem('dse_brand_mark_active');
    const markUrl = localStorage.getItem('dse_brand_mark_url') || profile.mark;
    if (markActive === 'false' || !markUrl) {
      if (markBox) markBox.style.display = 'none';
    } else if (markBox && markUrl) {
      markBox.style.display = 'block';
      if (markImg) markImg.src = markUrl;
    }

    const bannerUrl = localStorage.getItem('dse_brand_banner_url') || profile.banner;
    if (!bannerUrl) {
      if (bannerBox) bannerBox.style.display = 'none';
    } else if (bannerBox && bannerUrl) {
      bannerBox.style.display = 'block';
      if (bannerImg) bannerImg.src = bannerUrl;
    }
  }

  // Fetch settings from server (supports both unauthenticated public branding & authenticated settings)
  async function refreshRemote() {
    try {
      const hasToken = !!localStorage.getItem('dse_access_token');
      let compSettings = null;
      let appSettings = null;

      if (hasToken && window.ApiService) {
        [compSettings, appSettings] = await Promise.all([
          window.ApiService.get('/api/support/settings?prefix=company.').catch(() => null),
          window.ApiService.get('/api/support/settings?prefix=application.').catch(() => null)
        ]);
      } else {
        // Attempt public settings fetch for login screen
        try {
          const res = await fetch('/api/support/settings/public');
          if (res.ok) {
            const data = await res.json();
            compSettings = data.company || data;
            appSettings = data.application || data;
          }
        } catch (_) {}
      }

      const settings = Object.assign({}, compSettings, appSettings);
      if (settings && typeof settings === 'object' && Object.keys(settings).length > 0) {
        const updated = Object.assign({}, currentProfile);
        if (settings['company.name']) updated.name = settings['company.name'];
        else if (settings['application.displayName']) updated.name = settings['application.displayName'];

        if (settings['company.tagline']) updated.tagline = settings['company.tagline'];
        else if (settings['application.tagline']) updated.tagline = settings['application.tagline'];

        if (settings['company.phone'] !== undefined) updated.phone = settings['company.phone'];
        if (settings['company.email'] !== undefined) updated.email = settings['company.email'];
        if (settings['company.website'] !== undefined) updated.website = settings['company.website'];
        if (settings['company.bankName'] !== undefined) updated.bankName = settings['company.bankName'];
        if (settings['company.bankAccount'] !== undefined) updated.bankAccount = settings['company.bankAccount'];

        // Synchronize startup mark asset matching desktop LoginController
        const markVal = settings['application.markImagePath'] !== undefined ? settings['application.markImagePath'] : settings['application.mark'];
        if (markVal && markVal !== 'null' && markVal !== '') {
          const resolvedMark = await resolveAssetUrl(markVal, 'application.markImagePath');
          if (resolvedMark) {
            localStorage.setItem('dse_brand_mark_active', 'true');
            localStorage.setItem('dse_brand_mark_url', resolvedMark);
            updated.mark = resolvedMark;
          }
        } else if (markVal === '' || markVal === null) {
          localStorage.setItem('dse_brand_mark_active', 'false');
          localStorage.removeItem('dse_brand_mark_url');
          updated.mark = '';
        }

        // Synchronize startup banner asset
        const bannerVal = settings['application.brandImagePath'] !== undefined ? settings['application.brandImagePath'] : settings['application.brand'];
        if (bannerVal && bannerVal !== 'null' && bannerVal !== '') {
          const resolvedBanner = await resolveAssetUrl(bannerVal, 'application.brandImagePath');
          if (resolvedBanner) {
            localStorage.setItem('dse_brand_banner_url', resolvedBanner);
            updated.banner = resolvedBanner;
          }
        } else if (bannerVal === '' || bannerVal === null) {
          localStorage.removeItem('dse_brand_banner_url');
          updated.banner = '';
        }

        // Synchronize invoice logo asset
        const logoVal = settings['company.logoPath'] !== undefined ? settings['company.logoPath'] : settings['invoice.header.logo'];
        if (logoVal && logoVal !== 'null' && logoVal !== '') {
          const resolvedLogo = await resolveAssetUrl(logoVal, 'company.logoPath');
          if (resolvedLogo) {
            localStorage.setItem('dse_brand_logo_url', resolvedLogo);
            updated.logo = resolvedLogo;
          }
        } else if (logoVal === '' || logoVal === null) {
          localStorage.removeItem('dse_brand_logo_url');
          updated.logo = '';
        }

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
      if (window.FormatUtil && window.FormatUtil.updateLiveClocks) {
        window.FormatUtil.updateLiveClocks();
      }
    }
    tick();
  }

  // Auto initialize on DOMContentLoaded or immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateFooters();
      updateAuthBrand();
      startClock();
      refreshRemote();
    });
  } else {
    updateFooters();
    updateAuthBrand();
    startClock();
    refreshRemote();
  }

  return {
    getProfile() {
      return Object.assign({}, currentProfile || DEFAULT_BRANDING);
    },
    companyName() {
      return (currentProfile && currentProfile.name) || '';
    },
    tagline() {
      return (currentProfile && currentProfile.tagline) || '';
    },
    loginDescription() {
      const c = this.companyName();
      return c ? `Role-aware secure access to ${c}` : 'Role-aware secure enterprise access';
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
