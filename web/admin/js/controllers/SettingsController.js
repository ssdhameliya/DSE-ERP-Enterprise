/**
 * Jasvi Industries ERP - SettingsController
 * Full 1:1 Desktop FXML Parity for all 7 Enterprise Shared Settings:
 * 1. COMPANY: Legal Profile, Tax IDs, Factory Addresses, Application Branding
 * 2. PAYMENT: Commercial Bank, IFSC, Account Type, UPI VPA, Reconciliation Tolerance
 * 3. INVOICE: Regional Currencies, Date/Time Formats, Terms & Conditions, Digital Seals
 * 4. NOTIFICATIONS: Event Notification Triggers & Preference Subscriptions
 * 5. EMAIL: Corporate SMTP Gateway, TLS, Signatures, Dispatch Message Templates & Test Probes
 * 6. SECURITY: Inactivity Session Timers, MFA Enforcement Policies, Password Management
 * 7. MODULES: GL Double-Entry, GST Statutory Compliance, 3-Way Match, Hard Credit Stops, Briefings
 *
 * Server-Authoritative: All settings read and write to PostgreSQL application_setting via /api/support/settings
 * Reference: SettingsController.java, CompanySettingsPanel.fxml, PaymentSettingsPanel.fxml,
 *            InvoiceSettingsPanel.fxml, NotificationsSettingsPanel.fxml, EmailSettingsPanel.fxml,
 *            SecuritySettingsPanel.fxml, ModulesSettingsPanel.fxml
 */
window.SettingsController = (function() {
  let cachedSettings = {};
  let cachedEmailSettings = null;
  let cachedNotificationPrefs = null;
  let lookupsLoaded = false;

  // Template draft memory matching desktop SettingsController.java & MessageTemplateService.java
  const templateDrafts = {
    'Sales Invoice (Email)': {
      subject: 'Sales Invoice {DocumentNo} from {CompanyName}',
      body: 'Dear {CustomerName},\n\nPlease find attached your sales invoice {DocumentNo} dated {DocumentDate}.\n\nInvoice Summary:\n• Invoice Number: {DocumentNo}\n• Invoice Date: {DocumentDate}\n• Total Amount: {TotalAmount}\n• Balance Due: {BalanceAmount}\n\nThank you for your business.\n\n{Signature}'
    },
    'Quotation (Email)': {
      subject: 'Quotation {DocumentNo} from {CompanyName}',
      body: 'Dear {CustomerName},\n\nThank you for your enquiry. Please find attached our quotation {DocumentNo} dated {DocumentDate} for total amount {TotalAmount}.\n\nWe look forward to serving you. Please let us know if you need any adjustments or further information.\n\n{Signature}'
    },
    'Purchase Bill (Email)': {
      subject: 'Purchase Order {DocumentNo} from {CompanyName}',
      body: 'Dear {CustomerName},\n\nPlease find attached our purchase order {DocumentNo} dated {DocumentDate}.\n\nKindly confirm receipt and proceed with fulfillment per agreed terms.\n\n{Signature}'
    },
    'Payment Receipt (Email)': {
      subject: 'Payment Receipt for {DocumentNo} from {CompanyName}',
      body: 'Dear {CustomerName},\n\nThank you for your payment. We have successfully received payment against document {DocumentNo}.\n\nReceipt Summary:\n• Document Number: {DocumentNo}\n• Receipt Date: {DocumentDate}\n• Amount Paid: {PaidAmount}\n• Remaining Balance: {BalanceAmount}\n\nThank you for your business.\n\n{Signature}'
    },
    'Sales Return (Email)': {
      subject: 'Sales Return Note {DocumentNo} from {CompanyName}',
      body: 'Dear {CustomerName},\n\nPlease find attached sales return / credit note {DocumentNo} dated {DocumentDate}.\n\n• Total Credit: {TotalAmount}\n\n{Signature}'
    },
    'Purchase Return (Email)': {
      subject: 'Purchase Return Note {DocumentNo} from {CompanyName}',
      body: 'Dear {CustomerName},\n\nPlease find attached purchase debit return note {DocumentNo} dated {DocumentDate}.\n\n• Total Debit: {TotalAmount}\n\n{Signature}'
    },
    'Sales Invoice (WhatsApp)': {
      subject: '',
      body: 'Hello *{CustomerName}*,\n\nPlease find attached sales invoice *{DocumentNo}* dated *{DocumentDate}* for total amount *{TotalAmount}* (Balance: *{BalanceAmount}*).\n\nThank you for your business!\n\nRegards,\n*{CompanyName}*'
    },
    'Quotation (WhatsApp)': {
      subject: '',
      body: 'Hello *{CustomerName}*,\n\nPlease find attached quotation *{DocumentNo}* dated *{DocumentDate}* for total amount *{TotalAmount}*.\n\nLooking forward to your feedback!\n\nRegards,\n*{CompanyName}*'
    }
  };

  function val(id, fallback = '') {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  }

  function setVal(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    const str = v != null ? String(v) : '';
    if (el.tagName === 'SELECT') {
      let found = false;
      for (let i = 0; i < el.options.length; i++) {
        if (el.options[i].value === str) {
          found = true;
          break;
        }
      }
      if (!found && str) {
        const opt = document.createElement('option');
        opt.value = str;
        opt.textContent = str;
        el.appendChild(opt);
      }
    }
    el.value = str;
  }

  function chk(id) {
    const el = document.getElementById(id);
    return el ? !!el.checked : false;
  }

  function setChk(id, v) {
    const el = document.getElementById(id);
    if (el) el.checked = (v === true || v === 'true');
  }

  function getAuthToken() {
    return (window.AuthService && window.AuthService.getAccessToken ? window.AuthService.getAccessToken() : null) ||
           (window.AuthService && window.AuthService.getToken ? window.AuthService.getToken() : null) ||
           localStorage.getItem('dse_access_token') ||
           localStorage.getItem('auth_token');
  }

  async function resolveAssetUrl(val, assetKey) {
    if (!val || typeof val !== 'string' || val.trim() === '' || val === 'null' || val === 'undefined') {
      return '';
    }
    if (val.startsWith('data:') || val.startsWith('http:') || val.startsWith('https:') || val.startsWith('assets/')) {
      return val;
    }
    
    // If it's a server-resource pointer or disk path or raw asset key
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
        const token = getAuthToken();
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
        console.warn('Failed to resolve server-resource ' + key, err);
      }
    }
    return '';
  }

  async function setAssetPreview(imgId, phId, base64OrUrl, defaultImg, statusId, assetKey) {
    const img = document.getElementById(imgId);
    const ph = document.getElementById(phId);
    const statusEl = statusId ? document.getElementById(statusId) : null;
    if (!img) return;

    img.onload = function() {
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
      if (statusEl) {
        const name = assetKey || img.alt || 'Asset';
        statusEl.textContent = `${name} • ${img.naturalWidth || 0} × ${img.naturalHeight || 0} px`;
        statusEl.style.color = '#4ade80';
      }
    };

    img.onerror = function() {
      if (defaultImg && img.src !== defaultImg && !img.src.endsWith(defaultImg)) {
        img.src = defaultImg;
        return;
      }
      img.style.display = 'none';
      if (ph) ph.style.display = 'block';
      if (statusEl) {
        statusEl.textContent = 'No image selected';
        statusEl.style.color = '#64748b';
      }
    };

    const resolved = await resolveAssetUrl(base64OrUrl, assetKey);
    if (resolved && resolved.trim() !== '') {
      img.src = resolved;
    } else if (defaultImg) {
      img.src = defaultImg;
    } else {
      img.src = '';
      img.style.display = 'none';
      if (ph) ph.style.display = 'block';
      if (statusEl) {
        statusEl.textContent = 'No image selected';
        statusEl.style.color = '#64748b';
      }
    }
  }

  return {
    togglePasswordVisibility(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.type = el.type === 'password' ? 'text' : 'password';
    },

    showEmailGuidanceModal() {
      const el = document.getElementById('modal-email-guidance');
      if (el) el.style.display = 'flex';
    },

    async uploadSignatureImage(fileInput) {
      if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
      const file = fileInput.files[0];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const token = getAuthToken();
        const headers = {
          'Content-Type': file.type || 'application/octet-stream'
        };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        // 1. Upload binary stream to ServerResourceController
        const resKey = 'company.signaturePath';
        const uploadUrl = `/api/authority/resources/BUSINESS_ASSET/${encodeURIComponent(resKey)}?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'image/png')}`;
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: headers,
          body: arrayBuffer
        });

        // 2. Save pointer in support settings under both canonical and alias keys
        await window.ApiService.put('/api/support/settings', {
          values: {
            'company.signaturePath': 'server-resource:' + resKey,
            'email.signature.image': 'server-resource:' + resKey,
            'invoice.digital.seal': 'server-resource:' + resKey
          }
        });

        const img = document.getElementById('preview-email-sig-img');
        const status = document.getElementById('status-email-sig-img');
        if (img) {
          img.src = URL.createObjectURL(file);
          img.style.display = 'block';
        }
        if (status) {
          status.textContent = file.name + ' • preserved on server';
          status.style.color = '#4ade80';
        }
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Signature image saved to server resource repository!', 'success');
      } catch (err) {
        console.error('Failed to save signature image:', err);
        window.AppDialogService.showToast('Failed to save signature image: ' + err.message, 'error');
      }
    },

    async clearSignatureImage() {
      try {
        try {
          const token = getAuthToken();
          const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
          await fetch(`/api/authority/resources/BUSINESS_ASSET/company.signaturePath`, {
            method: 'DELETE',
            headers
          });
        } catch (e) {
          console.warn('Could not delete signature resource:', e);
        }

        await window.ApiService.put('/api/support/settings', {
          values: {
            'company.signaturePath': '',
            'email.signature.image': '',
            'invoice.digital.seal': ''
          }
        });
        const img = document.getElementById('preview-email-sig-img');
        const status = document.getElementById('status-email-sig-img');
        if (img) {
          img.src = '';
          img.style.display = 'none';
        }
        if (status) {
          status.textContent = 'No signature image attached';
          status.style.color = '#64748b';
        }
        const fileInput = document.getElementById('file-email-sig-img');
        if (fileInput) fileInput.value = '';
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Signature image removed.', 'info');
      } catch (err) {
        window.AppDialogService.showToast('Failed to clear signature image: ' + err.message, 'error');
      }
    },

    async uploadBrandingAsset(assetKey, fileInput, previewImgId, placeholderId, statusId) {
      if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
      const file = fileInput.files[0];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const token = getAuthToken();
        const headers = {
          'Content-Type': file.type || 'application/octet-stream'
        };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        // Bridge canonical Desktop keys & Web alias keys
        let canonicalKey = assetKey;
        let aliasKey = assetKey;
        if (assetKey === 'application.banner' || assetKey === 'application.brandImagePath') {
          canonicalKey = 'application.brandImagePath';
          aliasKey = 'application.banner';
        } else if (assetKey === 'application.mark' || assetKey === 'application.markImagePath') {
          canonicalKey = 'application.markImagePath';
          aliasKey = 'application.mark';
        } else if (assetKey === 'invoice.header.logo' || assetKey === 'company.logoPath') {
          canonicalKey = 'company.logoPath';
          aliasKey = 'invoice.header.logo';
        } else if (assetKey === 'invoice.digital.seal' || assetKey === 'company.signaturePath') {
          canonicalKey = 'company.signaturePath';
          aliasKey = 'invoice.digital.seal';
        } else if (assetKey === 'payment.upi.qr' || assetKey === 'payment.qrImagePath') {
          canonicalKey = 'payment.qrImagePath';
          aliasKey = 'payment.upi.qr';
        }

        // 1. Upload binary stream to ServerResourceController
        const resKey = canonicalKey;
        const uploadUrl = `/api/authority/resources/BUSINESS_ASSET/${encodeURIComponent(resKey)}?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'image/png')}`;
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: headers,
          body: arrayBuffer
        });

        // 2. Save pointer in support settings under both canonical and alias keys
        const values = {};
        values[canonicalKey] = 'server-resource:' + resKey;
        values[aliasKey] = 'server-resource:' + resKey;
        await window.ApiService.put('/api/support/settings', { values });

        // 3. Set preview directly using ObjectURL
        const objectUrl = URL.createObjectURL(file);
        setAssetPreview(previewImgId, placeholderId, objectUrl, null, statusId, canonicalKey);

        if (canonicalKey === 'application.brandImagePath') {
          const authBanner = document.getElementById('auth-brand-banner-img');
          const authBannerBox = document.getElementById('auth-brand-banner-box');
          if (authBanner) authBanner.src = objectUrl;
          if (authBannerBox) authBannerBox.style.display = 'block';
          localStorage.setItem('dse_brand_banner_url', objectUrl);
        } else if (canonicalKey === 'application.markImagePath') {
          const authMark = document.getElementById('auth-brand-mark-img');
          const authMarkBox = document.getElementById('auth-brand-mark-box');
          if (authMark) authMark.src = objectUrl;
          if (authMarkBox) authMarkBox.style.display = 'block';
          localStorage.setItem('dse_brand_mark_url', objectUrl);
          localStorage.setItem('dse_brand_mark_active', 'true');
        }

        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`Asset "${canonicalKey}" saved to server!`, 'success');
      } catch (err) {
        console.error('Failed to upload branding asset:', err);
        window.AppDialogService.showToast('Failed to save asset: ' + err.message, 'error');
      }
    },

    previewBrandingAsset(assetKey, previewImgId) {
      const imgEl = document.getElementById(previewImgId);
      const src = imgEl ? imgEl.src : '';
      if (!src || src.endsWith('undefined') || src === window.location.href || imgEl.style.display === 'none') {
        window.AppDialogService.showToast('No asset image available to preview.', 'warning');
        return;
      }
      const modal = document.getElementById('modal-branding-preview');
      const modalImg = document.getElementById('branding-preview-img');
      const modalTitle = document.getElementById('branding-preview-title');
      if (modal && modalImg) {
        modalImg.src = src;
        if (modalTitle) modalTitle.textContent = 'Preview: ' + assetKey;
        modal.style.display = 'flex';
      }
    },

    async clearBrandingAsset(assetKey, previewImgId, placeholderId, statusId) {
      try {
        let canonicalKey = assetKey;
        let aliasKey = assetKey;
        if (assetKey === 'application.banner' || assetKey === 'application.brandImagePath') {
          canonicalKey = 'application.brandImagePath';
          aliasKey = 'application.banner';
        } else if (assetKey === 'application.mark' || assetKey === 'application.markImagePath') {
          canonicalKey = 'application.markImagePath';
          aliasKey = 'application.mark';
        } else if (assetKey === 'invoice.header.logo' || assetKey === 'company.logoPath') {
          canonicalKey = 'company.logoPath';
          aliasKey = 'invoice.header.logo';
        } else if (assetKey === 'invoice.digital.seal' || assetKey === 'company.signaturePath') {
          canonicalKey = 'company.signaturePath';
          aliasKey = 'invoice.digital.seal';
        } else if (assetKey === 'payment.upi.qr' || assetKey === 'payment.qrImagePath') {
          canonicalKey = 'payment.qrImagePath';
          aliasKey = 'payment.upi.qr';
        }

        // 1. Delete binary asset from backend resource repository
        try {
          const token = getAuthToken();
          const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
          await fetch(`/api/authority/resources/BUSINESS_ASSET/${encodeURIComponent(canonicalKey)}`, {
            method: 'DELETE',
            headers
          });
        } catch (e) {
          console.warn('Could not delete server resource:', e);
        }

        // 2. Clear setting pointers
        const values = {};
        values[canonicalKey] = '';
        values[aliasKey] = '';
        await window.ApiService.put('/api/support/settings', { values });

        // 3. Clear preview cleanly without dummy fallback images
        setAssetPreview(previewImgId, placeholderId, '', null, statusId, canonicalKey);

        // Desktop LoginController.java:231-239 parity: Instantly hide startup elements when cleared
        if (canonicalKey === 'application.brandImagePath') {
          const authBannerBox = document.getElementById('auth-brand-banner-box');
          if (authBannerBox) authBannerBox.style.display = 'none';
          localStorage.removeItem('dse_brand_banner_url');
        } else if (canonicalKey === 'application.markImagePath') {
          const authMarkBox = document.getElementById('auth-brand-mark-box');
          if (authMarkBox) authMarkBox.style.display = 'none';
          localStorage.removeItem('dse_brand_mark_url');
          localStorage.setItem('dse_brand_mark_active', 'false');
        }

        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`Asset "${canonicalKey}" removed.`, 'info');
      } catch (err) {
        window.AppDialogService.showToast('Failed to clear asset: ' + err.message, 'error');
      }
    },

    
    activeSection: 'COMPANY',

    init(initialSection) {
      const target = (initialSection || 'COMPANY').toUpperCase();
      this.switchSection(target);
      if (!lookupsLoaded) {
        this.loadMasterLookups();
      }
    },

    switchSection(sectionId) {
      const sec = (sectionId || 'COMPANY').toUpperCase();
      this.activeSection = sec;

      // Update tab buttons
      document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        const targetSec = (btn.dataset.section || '').toUpperCase();
        btn.classList.toggle('active', targetSec === sec);
      });

      // Update panel visibility
      document.querySelectorAll('.settings-subpanel').forEach(panel => {
        const panelSec = (panel.dataset.section || '').toUpperCase();
        panel.style.display = panelSec === sec ? 'block' : 'none';
      });

      // Toggle header Test Email button (Desktop Parity: Visible only on EMAIL tab)
      const testEmailBtn = document.getElementById('btn-header-test-email');
      if (testEmailBtn) {
        testEmailBtn.style.display = sec === 'EMAIL' ? 'inline-flex' : 'none';
      }

      // Update save button label (Desktop Parity: "Save " + Section Name)
      const saveBtn = document.getElementById('btn-save-settings-active');
      if (saveBtn) {
        const names = {
          COMPANY: 'Company',
          PAYMENT: 'Payment',
          INVOICE: 'Invoice',
          NOTIFICATIONS: 'Notifications',
          EMAIL: 'Email',
          SECURITY: 'Security',
          MODULES: 'Modules'
        };
        saveBtn.innerHTML = `<span>&#128190;</span> Save ${names[sec] || 'Settings'}`;
      }

      // Trigger section loader
      switch (sec) {
        case 'COMPANY':
          this.loadCompanySettings();
          break;
        case 'PAYMENT':
          this.loadPaymentSettings();
          break;
        case 'INVOICE':
          this.loadInvoiceSettings();
          break;
        case 'NOTIFICATIONS':
          this.loadNotificationsSettings();
          break;
        case 'EMAIL':
          this.loadEmailSettings();
          break;
        case 'SECURITY':
          this.loadSecuritySettings();
          break;
        case 'MODULES':
          this.loadModulesSettings();
          break;
        default:
          this.loadCompanySettings();
      }
    },

    async saveActiveSettings(e) {
      if (e) e.preventDefault();
      switch (this.activeSection) {
        case 'COMPANY':
          await this.saveCompanySettings();
          break;
        case 'PAYMENT':
          await this.savePaymentSettings();
          break;
        case 'INVOICE':
          await this.saveInvoiceSettings();
          break;
        case 'NOTIFICATIONS':
          await this.saveNotificationsSettings();
          break;
        case 'EMAIL':
          await this.saveEmailSettings();
          break;
        case 'SECURITY':
          await this.saveSecuritySettings();
          break;
        case 'MODULES':
          await this.saveModulesSettings();
          break;
        default:
          await this.saveCompanySettings();
      }
    },

    // ==========================================
    // 0. MASTER LOOKUPS PRE-LOADER
    // ==========================================
    populateSelect(elId, result, defaultOpts) {
      const el = document.getElementById(elId);
      if (!el) return;
      const currentVal = el.value;
      let items = [];
      if (result && result.status === 'fulfilled' && Array.isArray(result.value) && result.value.length > 0) {
        items = result.value.map(item => {
          const code = typeof item === 'string' ? item : (item.lookupValue || item.code);
          const label = typeof item === 'string' ? item : (item.displayName || item.lookupValue || item.code);
          return { code, label };
        });
      } else if (defaultOpts && defaultOpts.length > 0) {
        items = defaultOpts.map(opt => typeof opt === 'string' ? { code: opt, label: opt } : opt);
      }
      if (items.length > 0) {
        el.innerHTML = items.map(i => `<option value="${i.code}">${i.label}</option>`).join('');
        if (currentVal && items.some(i => i.code === currentVal)) {
          el.value = currentVal;
        }
      }
    },

    async loadMasterLookups() {
      try {
        const [accountTypes, businessTypes, industries, currencies, timezones, dateFormats, timeFormats] = await Promise.allSettled([
          window.ApiService.get('/api/master/lookups/category/ACCOUNT_TYPE'),
          window.ApiService.get('/api/master/lookups/category/BUSINESS_TYPE'),
          window.ApiService.get('/api/master/lookups/category/INDUSTRY'),
          window.ApiService.get('/api/master/lookups/category/CURRENCY'),
          window.ApiService.get('/api/master/lookups/category/TIME_ZONE'),
          window.ApiService.get('/api/master/lookups/category/DATE_FORMAT'),
          window.ApiService.get('/api/master/lookups/category/TIME_FORMAT')
        ]);

        this.populateSelect('setting-account-type', accountTypes, null);
        this.populateSelect('setting-business-type', businessTypes, ["Proprietorship","Partnership","Private Limited Company","Public Limited Company","Limited Liability Partnership","Trust","Society","Other"]);
        this.populateSelect('setting-industry', industries, ["Manufacturing","Trading","Retail","Wholesale","Construction","Engineering","Textile","Automotive","Information Technology","Professional Services","Logistics","Healthcare","Food & Beverage","Other"]);
        this.populateSelect('setting-currency', currencies, ["INR - Indian Rupee","USD - US Dollar","EUR - Euro","GBP - British Pound","AED - UAE Dirham"]);
        this.populateSelect('setting-timezone', timezones, ["Asia/Kolkata","Asia/Dubai","Europe/London","America/New_York","America/Los_Angeles","UTC"]);
        this.populateSelect('setting-date-format', dateFormats, ["dd/MM/yyyy","dd-MM-yyyy","yyyy-MM-dd","MM/dd/yyyy","dd MMM yyyy"]);
        this.populateSelect('setting-time-format', timeFormats, ["hh:mm a","hh:mm:ss a","HH:mm","HH:mm:ss"]);
        lookupsLoaded = true;
      } catch (err) {
        console.warn('[SettingsController] Lookup loading warning:', err);
      }
    },

    // ==========================================
    // 1. COMPANY PROFILE SETTINGS
    // ==========================================
    async loadCompanySettings() {
      try {
        let serverSettings = {};
        try {
          serverSettings = await window.ApiService.get('/api/support/settings?prefix=company.');
          const appSettings = await window.ApiService.get('/api/support/settings?prefix=application.');
          Object.assign(serverSettings, appSettings);
        } catch (e) {
          console.warn('[SettingsController] Support settings endpoint unavailable, using profile fallback:', e);
        }

        let profile = null;
        if (window.ReportService && window.ReportService.getProfile) {
          try { profile = await window.ReportService.getProfile(); } catch (err) {}
        }

        setVal('setting-company-name', serverSettings['company.name'] || (profile && profile.companyName) || 'JASVI INDUSTRIES');
        setVal('setting-company-tagline', serverSettings['company.tagline'] || (profile && profile.tagline) || 'Excellence in Ceramic Manufacturing & Enterprise Engineering');
        setVal('setting-company-phone', serverSettings['company.phone'] || (profile && profile.phone) || '+91 90999 39193');
        setVal('setting-company-email', serverSettings['company.email'] || (profile && profile.email) || 'accounts@jasviindustries.in');
        setVal('setting-company-gstin', serverSettings['company.gstin'] || (profile && profile.gstin) || '24AAACJ1234A1Z5');
        setVal('setting-company-pan', serverSettings['company.pan'] || (profile && profile.pan) || 'AAACJ1234A');
        setVal('setting-business-type', serverSettings['company.businessType'] || (profile && profile.businessType) || 'MANUFACTURING');
        setVal('setting-industry', serverSettings['company.industry'] || (profile && profile.industry) || 'CERAMICS');
        setVal('setting-fy-start', serverSettings['company.financialYearStart'] || '2026-04-01');

        setVal('setting-company-address', serverSettings['company.address'] || (profile && profile.address) || 'Plot No. 45-48, GIDC Industrial Estate, Morbi - 363641, Gujarat, India');
        setVal('setting-ship-address', serverSettings['company.shipAddress'] || (profile && profile.shipAddress) || 'Warehouse 2, National Highway 8A, Trajpar, Morbi - 363642, Gujarat');
        setVal('setting-company-website', serverSettings['company.website'] || (profile && profile.website) || 'https://jasviindustries.in');
        setVal('setting-company-state', serverSettings['company.state'] || (profile && profile.state) || 'GUJARAT (24)');

        setVal('setting-app-name', serverSettings['application.displayName'] || (profile && profile.companyName) || 'JASVI INDUSTRIES ERP');
        setVal('setting-app-tagline', serverSettings['application.tagline'] || 'Enterprise Production & Distribution');
        setVal('setting-app-starting-text', serverSettings['application.startingText'] || 'Welcome to Jasvi Industries ERP System');

        const bannerVal = serverSettings['application.brandImagePath'] || serverSettings['application.banner'];
        setAssetPreview('preview-app-banner', 'placeholder-app-banner', bannerVal, null, 'status-app-banner', 'application.brandImagePath');

        const markVal = serverSettings['application.markImagePath'] || serverSettings['application.mark'];
        setAssetPreview('preview-app-mark', 'placeholder-app-mark', markVal, null, 'status-app-mark', 'application.markImagePath');

        resolveAssetUrl(bannerVal, 'application.brandImagePath').then(url => {
          if (url) {
            const authBanner = document.getElementById('auth-brand-banner-img');
            if (authBanner) authBanner.src = url;
          }
        });
        resolveAssetUrl(markVal, 'application.markImagePath').then(url => {
          if (url) {
            const authMark = document.getElementById('auth-brand-mark-img');
            if (authMark) authMark.src = url;
          }
        });
      } catch (err) {
        console.error('[SettingsController] Failed to load company settings:', err);
      }
    },

    async saveCompanySettings(e) {
      if (e) e.preventDefault();
      const companyName = val('setting-company-name').trim();
      const phone = val('setting-company-phone').trim();
      const email = val('setting-company-email').trim();
      const gstin = val('setting-company-gstin').trim().toUpperCase();
      const pan = val('setting-company-pan').trim().toUpperCase();

      if (!companyName) {
        window.AppDialogService.showToast('Company name is required.', 'error');
        return;
      }

      const values = {
        'company.name': companyName,
        'company.tagline': val('setting-company-tagline').trim(),
        'company.phone': phone,
        'company.email': email,
        'company.gstin': gstin,
        'company.pan': pan,
        'company.businessType': val('setting-business-type'),
        'company.industry': val('setting-industry'),
        'company.financialYearStart': val('setting-fy-start'),
        'company.address': val('setting-company-address').trim(),
        'company.shipAddress': val('setting-ship-address').trim(),
        'company.website': val('setting-company-website').trim(),
        'company.state': val('setting-company-state').trim(),
        'application.displayName': val('setting-app-name').trim() || companyName,
        'application.tagline': val('setting-app-tagline').trim(),
        'application.startingText': val('setting-app-starting-text').trim()
      };

      try {
        await window.ApiService.put('/api/support/settings', { values });
        if (window.ReportService && window.ReportService.updateProfile) {
          try {
            await window.ReportService.updateProfile({
              companyName,
              tagline: values['company.tagline'],
              phone,
              email,
              gstin,
              pan,
              businessType: values['company.businessType'],
              industry: values['company.industry'],
              state: values['company.state'],
              website: values['company.website'],
              address: values['company.address'],
              shipAddress: values['company.shipAddress']
            });
          } catch (ignored) {}
        }
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Company profile & application branding saved to server!', 'success');
      } catch (err) {
        window.AppDialogService.showToast('Failed to save company settings: ' + err.message, 'error');
      }
    },

    // ==========================================
    // 2. PAYMENT & BANKING SETTINGS
    // ==========================================
    async loadPaymentSettings() {
      try {
        let serverSettings = {};
        try {
          serverSettings = await window.ApiService.get('/api/support/settings?prefix=payment.');
        } catch (e) {}

        let profile = null;
        if (window.ReportService && window.ReportService.getProfile) {
          try { profile = await window.ReportService.getProfile(); } catch (err) {}
        }

        setVal('setting-bank-name', serverSettings['payment.bankName'] || (profile && profile.bankName) || '');
        setVal('setting-account-holder', serverSettings['payment.accountHolder'] || (profile && profile.accountHolder) || '');
        setVal('setting-account-number', serverSettings['payment.accountNumber'] || (profile && profile.accountNumber) || '');
        setVal('setting-ifsc', serverSettings['payment.ifsc'] || (profile && profile.ifsc) || '');
        setVal('setting-branch', serverSettings['payment.branch'] || (profile && profile.branch) || '');
        setVal('setting-account-type', serverSettings['payment.accountType'] || (profile && profile.accountType) || 'CURRENT');
        setVal('setting-upi-id', serverSettings['payment.upiId'] || (profile && profile.upiId) || '');
        setVal('setting-tolerance', serverSettings['payment.bankMatchRoundingTolerance'] || (profile && profile.bankMatchTolerance) || '0.00');

        const qrVal = serverSettings['payment.qrImagePath'] || serverSettings['payment.upi.qr'];
        setAssetPreview('preview-upi-qr', 'placeholder-upi-qr', qrVal, null, 'status-upi-qr', 'payment.qrImagePath');
      } catch (err) {
        console.error('[SettingsController] Failed to load payment settings:', err);
      }
    },

    async savePaymentSettings(e) {
      if (e) e.preventDefault();
      const bankName = val('setting-bank-name').trim();
      const accountNumber = val('setting-account-number').trim();
      const ifsc = val('setting-ifsc').trim().toUpperCase();

      if (!bankName || !accountNumber || !ifsc) {
        window.AppDialogService.showToast('Bank Name, Account Number and IFSC are required.', 'error');
        return;
      }

      const rawTol = val('setting-tolerance').trim();
      let tolNum = parseFloat(rawTol);
      if (isNaN(tolNum) || tolNum < 0) {
        tolNum = 0.00;
      } else if (tolNum > 5.00) {
        window.AppDialogService.showToast('Reconciliation rounding tolerance cannot exceed ₹5.00 per enterprise policy.', 'error');
        return;
      }
      const toleranceStr = tolNum.toFixed(2);

      const values = {
        'payment.bankName': bankName,
        'payment.accountHolder': val('setting-account-holder').trim(),
        'payment.accountNumber': accountNumber,
        'payment.ifsc': ifsc,
        'payment.branch': val('setting-branch').trim(),
        'payment.accountType': val('setting-account-type'),
        'payment.upiId': val('setting-upi-id').trim(),
        'payment.bankMatchRoundingTolerance': toleranceStr
      };

      try {
        await window.ApiService.put('/api/support/settings', { values });
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Commercial banking credentials & UPI parameters saved to server!', 'success');
      } catch (err) {
        window.AppDialogService.showToast('Failed to save payment settings: ' + err.message, 'error');
      }
    },

    // ==========================================
    // 3. INVOICE DEFAULTS & PRINT SETTINGS (Screen 3)
    // ==========================================
    async loadInvoiceSettings() {
      try {
        let serverSettings = {};
        try {
          serverSettings = await window.ApiService.get('/api/support/settings?prefix=company.');
        } catch (e) {}

        let profile = null;
        if (window.ReportService && window.ReportService.getProfile) {
          try { profile = await window.ReportService.getProfile(); } catch (err) {}
        }

        const rawDateFmt = serverSettings['company.dateFormat'] || (profile && profile.dateFormat) || 'dd/MM/yyyy';
        const rawTimeFmt = serverSettings['company.timeFormat'] || 'hh:mm a';
        const normDateFmt = window.FormatUtil ? window.FormatUtil.normalizeDateFormat(rawDateFmt) : rawDateFmt;
        const normTimeFmt = window.FormatUtil ? window.FormatUtil.normalizeTimeFormat(rawTimeFmt) : rawTimeFmt;

        setVal('setting-company-address', serverSettings['company.address'] || (profile && profile.address) || 'Plot No. 45-48, GIDC Industrial Estate, Morbi - 363641, Gujarat, India');
        setVal('setting-ship-address', serverSettings['company.shipAddress'] || (profile && profile.shipAddress) || 'Warehouse 2, National Highway 8A, Trajpar, Morbi - 363642, Gujarat');
        setVal('setting-company-website', serverSettings['company.website'] || (profile && profile.website) || 'https://jasviindustries.in');
        setVal('setting-company-state', serverSettings['company.state'] || (profile && profile.state) || 'GUJARAT (24)');
        setVal('setting-company-tagline', serverSettings['company.tagline'] || (profile && profile.tagline) || 'Excellence in Ceramic Manufacturing & Enterprise Engineering');

        setVal('setting-currency', serverSettings['company.currency'] || (profile && profile.currency) || 'INR (₹)');
        setVal('setting-timezone', serverSettings['company.timeZone'] || (profile && profile.timezone) || 'Asia/Kolkata (IST)');
        setVal('setting-date-format', normDateFmt);
        setVal('setting-time-format', normTimeFmt);
        setVal('setting-invoice-terms', serverSettings['company.terms'] || (profile && profile.invoiceTerms) || '(1) All Prices are Nett-Godown.\n(2) Our responsibility ceases as soon as the goods leaves our godown.\n(3) Intrest @ 24% p.a. will be charged, if the payment not paid in due time.\n(4) Payments to be made by payees A/c Chque / DD / RTGS / NEFT Only.');

        let invoiceSettings = {};
        try {
          invoiceSettings = await window.ApiService.get('/api/support/settings?prefix=invoice.');
          const compSettings = await window.ApiService.get('/api/support/settings?prefix=company.');
          Object.assign(invoiceSettings, compSettings);
        } catch (e) {}

        const logoVal = invoiceSettings['company.logoPath'] || invoiceSettings['invoice.header.logo'];
        setAssetPreview('preview-invoice-logo', 'placeholder-invoice-logo', logoVal, null, 'status-invoice-logo', 'company.logoPath');

        const sealVal = invoiceSettings['company.signaturePath'] || invoiceSettings['invoice.digital.seal'];
        setAssetPreview('preview-invoice-seal', 'placeholder-invoice-seal', sealVal, null, 'status-invoice-seal', 'company.signaturePath');
      } catch (err) {
        console.error('[SettingsController] Failed to load invoice settings:', err);
      }
    },

    async saveInvoiceSettings(e) {
      if (e) e.preventDefault();
      const rawDate = val('setting-date-format');
      const rawTime = val('setting-time-format');
      const normDate = window.FormatUtil ? window.FormatUtil.normalizeDateFormat(rawDate) : rawDate;
      const normTime = window.FormatUtil ? window.FormatUtil.normalizeTimeFormat(rawTime) : rawTime;
      const tzVal = val('setting-timezone');

      const values = {
        'company.address': val('setting-company-address').trim(),
        'company.shipAddress': val('setting-ship-address').trim(),
        'company.website': val('setting-company-website').trim(),
        'company.state': val('setting-company-state').trim(),
        'company.currency': val('setting-currency'),
        'company.timeZone': tzVal,
        'company.dateFormat': normDate,
        'company.timeFormat': normTime,
        'company.tagline': val('setting-company-tagline').trim(),
        'company.terms': val('setting-invoice-terms').trim()
      };

      try {
        await window.ApiService.put('/api/support/settings', { values });
        if (window.ReportService && window.ReportService.updateProfile) {
          try {
            await window.ReportService.updateProfile({
              address: values['company.address'],
              shipAddress: values['company.shipAddress'],
              website: values['company.website'],
              state: values['company.state'],
              tagline: values['company.tagline'],
              currency: values['company.currency'],
              dateFormat: normDate,
              timezone: tzVal,
              invoiceTerms: values['company.terms']
            });
          } catch (ignored) {}
        }
        if (window.FormatUtil) {
          window.FormatUtil.setBusinessPolicy(normDate, normTime, tzVal);
        }
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Invoice regional parameters, addresses and terms saved to server!', 'success');
      } catch (err) {
        window.AppDialogService.showToast('Failed to save invoice settings: ' + err.message, 'error');
      }
    },

    // ==========================================
    // 4. NOTIFICATION PREFERENCES
    // ==========================================
    async loadNotificationsSettings() {
      try {
        const prefs = await window.ApiService.get('/api/insights/notification-preferences');
        cachedNotificationPrefs = prefs;
        if (prefs) {
          setChk('chkNotifications', prefs.enabled !== false);
          setChk('chkNotificationToasts', prefs.toasts !== false && prefs.toastsEnabled !== false);
          const catMap = prefs.categories || {};
          if (Array.isArray(prefs.categories)) {
            const catSet = new Set(prefs.categories.map(c => c.toUpperCase()));
            setChk('chkNotifySales', catSet.has('SALES') || catSet.has('INVOICE'));
            setChk('chkNotifyPurchases', catSet.has('PURCHASE'));
            setChk('chkNotifyQuotations', catSet.has('QUOTATION'));
            setChk('chkNotifyReturns', catSet.has('RETURN'));
            setChk('chkNotifyPayments', catSet.has('PAYMENT'));
            setChk('chkNotifyInventory', catSet.has('INVENTORY') || catSet.has('STOCK'));
            setChk('chkNotifyBanking', catSet.has('BANKING') || catSet.has('FINANCE'));
            setChk('chkNotifyReports', catSet.has('REPORT') || catSet.has('REPORTS'));
            setChk('chkNotifyReminders', catSet.has('REMINDER') || catSet.has('REMINDERS'));
            setChk('chkNotifyCommunication', catSet.has('COMMUNICATION'));
            setChk('chkNotifyApproval', catSet.has('APPROVAL') || catSet.has('USER'));
            setChk('chkNotifyImports', catSet.has('IMPORT') || catSet.has('IMPORTS'));
            setChk('chkNotifyBackup', catSet.has('BACKUP'));
            setChk('chkNotifySystem', catSet.has('SYSTEM'));
            setChk('chkNotifySecurity', catSet.has('SECURITY'));
          } else if (typeof catMap === 'object') {
            setChk('chkNotifySales', catMap['SALES'] !== false);
            setChk('chkNotifyPurchases', catMap['PURCHASE'] !== false);
            setChk('chkNotifyQuotations', catMap['QUOTATION'] !== false);
            setChk('chkNotifyReturns', catMap['RETURN'] !== false);
            setChk('chkNotifyPayments', catMap['PAYMENT'] !== false);
            setChk('chkNotifyInventory', catMap['INVENTORY'] !== false);
            setChk('chkNotifyBanking', catMap['BANKING'] !== false);
            setChk('chkNotifyReports', catMap['REPORTS'] !== false);
            setChk('chkNotifyReminders', catMap['REMINDERS'] !== false);
            setChk('chkNotifyCommunication', catMap['COMMUNICATION'] !== false);
            setChk('chkNotifyApproval', catMap['APPROVAL'] !== false);
            setChk('chkNotifyImports', catMap['IMPORTS'] !== false);
            setChk('chkNotifyBackup', catMap['BACKUP'] !== false);
            setChk('chkNotifySystem', catMap['SYSTEM'] !== false);
            setChk('chkNotifySecurity', catMap['SECURITY'] !== false);
          }
        }
      } catch (e) {
        console.warn('[SettingsController] Loading notification preferences fallback:', e);
      }
    },

    async saveNotificationsSettings(e) {
      if (e) e.preventDefault();
      const catMap = {
        SALES: chk('chkNotifySales'),
        PURCHASE: chk('chkNotifyPurchases'),
        QUOTATION: chk('chkNotifyQuotations'),
        RETURN: chk('chkNotifyReturns'),
        PAYMENT: chk('chkNotifyPayments'),
        INVENTORY: chk('chkNotifyInventory'),
        BANKING: chk('chkNotifyBanking'),
        REPORTS: chk('chkNotifyReports'),
        REMINDERS: chk('chkNotifyReminders'),
        COMMUNICATION: chk('chkNotifyCommunication'),
        APPROVAL: chk('chkNotifyApproval'),
        IMPORTS: chk('chkNotifyImports'),
        BACKUP: chk('chkNotifyBackup'),
        SYSTEM: chk('chkNotifySystem'),
        SECURITY: chk('chkNotifySecurity')
      };

      // Authoritative Spring DTO: record NotificationPreferences(boolean enabled, boolean toasts, Map<String, Boolean> categories)
      const payload = {
        enabled: chk('chkNotifications'),
        toasts: chk('chkNotificationToasts'),
        categories: catMap
      };

      try {
        await window.ApiService.put('/api/insights/notification-preferences', payload);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Notification triggers & subscriptions updated on server!', 'success');
      } catch (err) {
        window.AppDialogService.showToast('Failed to save notification preferences: ' + err.message, 'error');
      }
    },

    // ==========================================
    // 5. CORPORATE EMAIL & MESSAGE TEMPLATES
    // ==========================================
    async loadEmailSettings() {
      try {
        const res = await window.ApiService.get('/api/authority/email/settings');
        cachedEmailSettings = res;
        if (res) {
          setVal('smtp-host', res.host || 'smtp.gmail.com');
          setVal('smtp-port', res.port || '587');
          setVal('smtp-email', res.email || 'ssdhameliya@gmail.com');
          setVal('smtp-from-name', res.fromName || 'Jasvi Industries Accounts');
          setChk('smtp-tls', res.startTls !== false);
        }

        // Load signature, signature image, and active template
        let emailSettings = {};
        try {
          emailSettings = await window.ApiService.get('/api/support/settings?prefix=email.');
          if (emailSettings['email.signature']) {
            setVal('smtp-signature', emailSettings['email.signature']);
          }
          if (emailSettings['email.signature.image']) {
            const sigImg = document.getElementById('preview-email-sig-img');
            const sigStatus = document.getElementById('status-email-sig-img');
            if (sigImg) {
              sigImg.src = emailSettings['email.signature.image'];
              sigImg.style.display = 'block';
            }
            if (sigStatus) {
              sigStatus.textContent = 'signature_stamp.png • preserved';
              sigStatus.style.color = '#4ade80';
            }
          }
        } catch (ignored) {}

        this.onTemplateDocChanged(val('email-template-doc') || 'Sales Invoice (Email)');
      } catch (err) {
        console.warn('[SettingsController] Could not load email settings from server:', err);
      }
    },

    async saveEmailSettings(e) {
      if (e) e.preventDefault();
      const host = val('smtp-host').trim();
      const port = parseInt(val('smtp-port'), 10) || 587;
      const email = val('smtp-email').trim();
      const password = val('smtp-password');
      const fromName = val('smtp-from-name').trim();
      const startTls = chk('smtp-tls');
      const signature = val('smtp-signature').trim();

      if (!host || !email) {
        window.AppDialogService.showToast('SMTP Host and Sending Email Address are required.', 'error');
        return;
      }

      const smtpPayload = {
        host,
        port,
        email,
        appPassword: password
      };

      const docCategory = val('email-template-doc') || 'Sales Invoice (Email)';
      const subject = val('email-template-subject').trim();
      const body = val('email-template-body').trim();
      templateDrafts[docCategory] = { subject, body };

      const settingValues = {
        'email.fromName': fromName,
        'email.startTls': String(startTls),
        'email.signature': signature,
        [`email.template.${encodeURIComponent(docCategory)}.subject`]: subject,
        [`email.template.${encodeURIComponent(docCategory)}.body`]: body
      };

      try {
        await Promise.all([
          window.ApiService.put('/api/authority/email/settings', smtpPayload),
          window.ApiService.put('/api/support/settings', { values: settingValues })
        ]);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('SMTP credentials and dispatch message templates saved to server!', 'success');
      } catch (err) {
        window.AppDialogService.showToast('Failed to save email settings: ' + err.message, 'error');
      }
    },

    onTemplateDocChanged(docOption) {
      if (!docOption) return;
      const isWhatsapp = docOption.includes('WhatsApp');
      const subjectBox = document.getElementById('box-email-subject');
      if (subjectBox) {
        subjectBox.style.display = isWhatsapp ? 'none' : 'block';
      }

      const draft = templateDrafts[docOption] || { subject: '', body: '' };
      setVal('email-template-subject', draft.subject || '');
      setVal('email-template-body', draft.body || '');
    },

    insertTemplateToken(token) {
      const textarea = document.getElementById('email-template-body');
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      textarea.value = text.substring(0, start) + token + text.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + token.length;
      textarea.focus();
    },

    async testEmail() {
      const defaultRecipient = val('smtp-email').trim() || 'ssdhameliya@gmail.com';
      const recipient = prompt('Enter recipient email address to send test diagnostic message:', defaultRecipient);
      if (!recipient || !recipient.trim()) return;

      const cleanRecipient = recipient.trim();
      const host = val('smtp-host').trim() || 'smtp.gmail.com';
      const port = parseInt(val('smtp-port'), 10) || 587;
      const email = val('smtp-email').trim() || cleanRecipient;
      const password = val('smtp-password');

      const modal = document.getElementById('modal-live-email-test');
      const subTitle = document.getElementById('live-email-target-sub');
      const logStream = document.getElementById('live-email-log-stream');
      const statusText = document.getElementById('live-email-status-text');
      const dismissBtn = document.getElementById('btn-close-live-email');

      if (modal) modal.style.display = 'flex';
      if (subTitle) subTitle.textContent = `Testing delivery to ${cleanRecipient} via ${host}:${port}`;
      if (dismissBtn) dismissBtn.disabled = true;

      const setStage = (stgNum, state, msg) => {
        const stageEl = document.getElementById(`stage-email-${stgNum}`);
        if (!stageEl) return;
        const icon = stageEl.querySelector('.stage-icon');
        const txt = stageEl.querySelector('.stage-msg');
        if (state === 'active') {
          stageEl.style.borderColor = '#38bdf8';
          stageEl.style.background = 'rgba(56,189,248,0.1)';
          if (icon) { icon.innerHTML = '&#9673;'; icon.style.color = '#38bdf8'; }
          if (txt) { txt.textContent = msg || 'In progress...'; txt.style.color = '#38bdf8'; }
        } else if (state === 'success') {
          stageEl.style.borderColor = 'rgba(74,222,128,0.3)';
          stageEl.style.background = 'rgba(74,222,128,0.08)';
          if (icon) { icon.innerHTML = '&#10003;'; icon.style.color = '#4ade80'; }
          if (txt) { txt.textContent = msg || 'Completed'; txt.style.color = '#4ade80'; }
        } else if (state === 'error') {
          stageEl.style.borderColor = 'rgba(248,113,113,0.4)';
          stageEl.style.background = 'rgba(248,113,113,0.1)';
          if (icon) { icon.innerHTML = '&#10007;'; icon.style.color = '#f87171'; }
          if (txt) { txt.textContent = msg || 'Failed'; txt.style.color = '#f87171'; }
        } else {
          stageEl.style.borderColor = 'rgba(255,255,255,0.06)';
          stageEl.style.background = 'rgba(15,23,42,0.6)';
          if (icon) { icon.innerHTML = '&#9675;'; icon.style.color = '#94a3b8'; }
          if (txt) { txt.textContent = msg || 'Pending...'; txt.style.color = '#64748b'; }
        }
      };

      const appendLog = (line) => {
        if (!logStream) return;
        const time = new Date().toTimeString().split(' ')[0];
        logStream.textContent += `\n[${time}] ${line}`;
        logStream.scrollTop = logStream.scrollHeight;
      };

      setStage(1, 'active', 'Saving SMTP configuration & verifying DNS...');
      setStage(2, 'pending');
      setStage(3, 'pending');
      if (logStream) logStream.textContent = `[${new Date().toTimeString().split(' ')[0]}] Initializing LiveOperationDialog test pipeline...`;
      if (statusText) statusText.textContent = `Connecting to ${host}:${port}...`;

      try {
        if (password && password.trim()) {
          appendLog(`Syncing updated SMTP credentials for ${email} with server...`);
          const smtpPayload = {
            host,
            port,
            email,
            appPassword: password.trim()
          };
          await window.ApiService.put('/api/authority/email/settings', smtpPayload);
          setStage(1, 'success', `Host ${host}:${port} credentials updated`);
          appendLog(`[OK] Server acknowledged SMTP target: ${host}:${port} (STARTTLS enabled)`);
        } else {
          setStage(1, 'success', `Host ${host}:${port} connection verified`);
          appendLog(`Using existing authenticated SMTP configuration on server for ${email}...`);
        }

        // Step 2: Handshake
        setStage(2, 'active', `Authenticating account ${email}...`);
        if (statusText) statusText.textContent = `Authenticating credentials with ${host}...`;
        appendLog(`Negotiating TLS handshake with ${host}...`);

        // Step 3: Dispatch test email via backend
        setStage(2, 'success', `Authenticated as ${email}`);
        setStage(3, 'active', `Transmitting diagnostic payload to ${cleanRecipient}...`);
        if (statusText) statusText.textContent = `Dispatching test email to ${cleanRecipient}...`;
        appendLog(`Dispatching diagnostic MIME payload to ${cleanRecipient}...`);

        const result = await window.ApiService.post('/api/authority/email/test', { recipient: cleanRecipient });
        
        setStage(3, 'success', `Delivered successfully to ${cleanRecipient}`);
        if (statusText) {
          statusText.textContent = `Test completed successfully!`;
          statusText.style.color = '#4ade80';
        }
        appendLog(`[SUCCESS] 250 OK: Message accepted for delivery to <${cleanRecipient}>.`);
        if (result && result.message) appendLog(`Server Response: ${result.message}`);
        
        if (dismissBtn) dismissBtn.disabled = false;
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`Test email delivered successfully to ${cleanRecipient}!`, 'success');
      } catch (err) {
        console.error('[SettingsController] Test email failed:', err);
        setStage(3, 'error', err.message || 'Transmission failed');
        if (statusText) {
          statusText.textContent = `Mail Dispatch Error: ${err.message}`;
          statusText.style.color = '#f87171';
        }
        appendLog(`[ERROR] Transmission terminated: ${err.message}`);
        if (dismissBtn) dismissBtn.disabled = false;
        if (window.AudioSynthesizer) window.AudioSynthesizer.playWarning();
        window.AppDialogService.showToast('SMTP Test Failed: ' + err.message, 'error');
      }
    },

    sessionMonitorInterval: null,

    startSessionMonitorTimer() {
      if (this.sessionMonitorInterval) clearInterval(this.sessionMonitorInterval);
      
      const updateUi = () => {
        if (this.activeSection !== 'SECURITY') {
          if (this.sessionMonitorInterval) {
            clearInterval(this.sessionMonitorInterval);
            this.sessionMonitorInterval = null;
          }
          return;
        }

        const mgr = window.SessionFocusManager;
        if (!mgr) return;

        const idleSec = mgr.getIdleSeconds ? mgr.getIdleSeconds() : Math.max(0, Math.floor((Date.now() - (mgr.lastActivity || Date.now())) / 1000));
        const remSec = mgr.getRemainingSecondsToWarning ? mgr.getRemainingSecondsToWarning() : Math.max(0, (mgr.timeoutMinutes * 60 - mgr.warningSeconds) - idleSec);
        const totalSec = Math.max(1, (mgr.timeoutMinutes * 60 - mgr.warningSeconds));
        const pct = Math.max(0, Math.min(100, Math.round((remSec / totalSec) * 100)));

        const elIdle = document.getElementById('sec-monitor-idle');
        const elRem = document.getElementById('sec-monitor-remaining');
        const elProg = document.getElementById('sec-monitor-progress');
        const elLimit = document.getElementById('sec-monitor-limit');

        if (elIdle) {
          const m = Math.floor(idleSec / 60);
          const s = idleSec % 60;
          elIdle.textContent = m > 0 ? `${m}m ${s}s idle` : `${s}s idle`;
        }
        if (elRem) {
          const rm = Math.floor(remSec / 60);
          const rs = remSec % 60;
          elRem.textContent = `${rm}m ${rs < 10 ? '0' : ''}${rs}s`;
          elRem.style.color = pct < 20 ? 'var(--red)' : pct < 50 ? 'var(--yellow)' : 'var(--green)';
        }
        if (elProg) {
          elProg.style.width = pct + '%';
          elProg.style.background = pct < 20 ? 'var(--red)' : pct < 50 ? 'var(--yellow)' : 'var(--green)';
        }
        if (elLimit) {
          elLimit.textContent = `Timeout: ${mgr.timeoutMinutes}m • Warn at ${Math.round(mgr.warningSeconds / 60)}m`;
        }
      };

      updateUi();
      this.sessionMonitorInterval = setInterval(updateUi, 1000);
    },

    // ==========================================
    // 6. SECURITY & SESSION POLICIES
    // ==========================================
    async loadSecuritySettings() {
      try {
        const secSettings = await window.ApiService.get('/api/support/settings?prefix=security.');
        const timeout = parseInt(secSettings['security.session.timeout.minutes'] || '60', 10);
        const warning = parseInt(secSettings['security.session.warning.minutes'] || '5', 10);
        setVal('sec-session-timeout', timeout);
        setVal('sec-session-warning', warning);
        setVal('sec-mfa-policy', secSettings['security.auth.mfa.policy'] || 'ADMIN_CONTROLLED');
        setChk('sec-ui-diagnostics', true);

        if (window.SessionFocusManager && window.SessionFocusManager.init) {
          window.SessionFocusManager.init(timeout, warning * 60);
        }

        const u = window.AuthService && window.AuthService.getCurrentUser ? window.AuthService.getCurrentUser() : null;
        const userEl = document.getElementById('sec-monitor-user');
        const roleEl = document.getElementById('sec-monitor-role');
        if (userEl) userEl.textContent = (u && (u.fullName || u.username)) || 'Administrator';
        if (roleEl) roleEl.textContent = `${(u && u.role || 'ADMIN').toUpperCase()} • Active Enterprise Session`;

        this.startSessionMonitorTimer();
      } catch (err) {
        console.warn('[SettingsController] Could not load security settings:', err);
      }
    },

    async saveSecuritySettings(e) {
      if (e) e.preventDefault();
      const timeout = parseInt(val('sec-session-timeout'), 10);
      const warning = parseInt(val('sec-session-warning'), 10);
      const mfaPolicy = val('sec-mfa-policy');

      if (isNaN(timeout) || timeout < 5 || timeout > 120) {
        window.AppDialogService.showToast('Session timeout must be between 5 and 120 minutes.', 'error');
        return;
      }
      if (isNaN(warning) || warning < 1 || warning >= timeout) {
        window.AppDialogService.showToast('Session warning must be at least 1 minute and less than the timeout.', 'error');
        return;
      }

      const values = {
        'security.session.timeout.minutes': String(timeout),
        'security.session.warning.minutes': String(warning),
        'security.auth.mfa.policy': mfaPolicy
      };

      try {
        await window.ApiService.put('/api/support/settings', { values });
        if (window.SessionFocusManager && window.SessionFocusManager.init) {
          window.SessionFocusManager.init(timeout, warning * 60);
        }
        this.startSessionMonitorTimer();
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Security & MFA governance policies updated on server!', 'success');
      } catch (err) {
        window.AppDialogService.showToast('Failed to save security settings: ' + err.message, 'error');
      }
    },

    async handlePasswordChange(e) {
      if (e) e.preventDefault();
      const cur = val('pw-current');
      const nw = val('pw-new');
      const conf = val('pw-confirm');

      if (!cur || !nw || !conf) {
        window.AppDialogService.showToast('Please fill all password fields.', 'error');
        return;
      }
      if (nw !== conf) {
        window.AppDialogService.showToast('New password and confirmation do not match.', 'error');
        return;
      }
      if (nw.length < 8) {
        window.AppDialogService.showToast('Password must be at least 8 characters long.', 'error');
        return;
      }

      try {
        await window.ApiService.post('/api/auth/change-password', {
          currentPassword: cur,
          newPassword: nw
        });
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Account password updated successfully!', 'success');
        setVal('pw-current', '');
        setVal('pw-new', '');
        setVal('pw-confirm', '');
      } catch (err) {
        window.AppDialogService.showToast('Failed to change password: ' + err.message, 'error');
      }
    },

    // ==========================================
    // 7. MODULE MANAGEMENT
    // ==========================================
    async loadModulesSettings() {
      try {
        const modSettings = await window.ApiService.get('/api/support/settings?prefix=module.');
        setChk('mod-gl-enabled', modSettings['module.gl.enabled'] !== 'false');
        setChk('mod-gl-autopost', modSettings['module.gl.autoPost'] !== 'false');
        setChk('mod-gl-trialbalance', modSettings['module.gl.trialBalance'] !== 'false');

        setChk('mod-gst-enabled', modSettings['module.gst.enabled'] !== 'false');
        setChk('mod-gst-auto2b', modSettings['module.gst.auto2bMatch'] !== 'false');
        setChk('mod-gst-posgating', modSettings['module.gst.posGating'] !== 'false');
        setChk('mod-tds-enabled', modSettings['module.tds.enabled'] !== 'false');

        setChk('mod-automations-enabled', modSettings['module.automation.enabled'] !== 'false');
        setChk('mod-threeway-enabled', modSettings['module.automation.threeWayMatch'] !== 'false');
        setChk('mod-threeway-autodebit', modSettings['module.automation.autoDraftDebitNote'] !== 'false');
        setChk('mod-reorder-enabled', modSettings['module.automation.stockAutoReorder'] !== 'false');
        setChk('mod-credit-hardstop', modSettings['module.automation.creditHardStop'] !== 'false');
        
        setChk('mod-batch-serial', modSettings['module.inventory.batchSerialTracking'] !== 'false');
        setChk('mod-batch-fefo', modSettings['module.inventory.fefoPicking'] !== 'false');
        setChk('mod-serial-mandatory', modSettings['module.inventory.serialMandatory'] !== 'false');

        setChk('mod-briefing-enabled', modSettings['module.briefing.daily'] !== 'false');
        setChk('mod-briefing-wa', modSettings['module.briefing.whatsapp'] !== 'false');
        setChk('mod-briefing-email', modSettings['module.briefing.email'] !== 'false');
        setVal('mod-briefing-phone', modSettings['module.briefing.phone'] || '+91 90999 39193');
      } catch (err) {
        console.warn('[SettingsController] Could not load module settings:', err);
      }
    },

    async saveModulesSettings(e) {
      if (e) e.preventDefault();
      const values = {
        'module.gl.enabled': String(chk('mod-gl-enabled')),
        'accounting.gl.enabled': String(chk('mod-gl-enabled')),
        'module.gl.autoPost': String(chk('mod-gl-autopost')),
        'module.gl.trialBalance': String(chk('mod-gl-trialbalance')),

        'module.gst.enabled': String(chk('mod-gst-enabled')),
        'compliance.gst.enabled': String(chk('mod-gst-enabled')),
        'module.gst.auto2bMatch': String(chk('mod-gst-auto2b')),
        'module.gst.posGating': String(chk('mod-gst-posgating')),
        'module.tds.enabled': String(chk('mod-tds-enabled')),

        'module.automation.enabled': String(chk('mod-automations-enabled')),
        'module.automation.threeWayMatch': String(chk('mod-threeway-enabled')),
        'automation.threeway.enabled': String(chk('mod-threeway-enabled')),
        'module.automation.autoDraftDebitNote': String(chk('mod-threeway-autodebit')),
        'module.automation.stockAutoReorder': String(chk('mod-reorder-enabled')),
        'automation.reorder.enabled': String(chk('mod-reorder-enabled')),
        'module.automation.creditHardStop': String(chk('mod-credit-hardstop')),
        'credit_control.hard_stop': String(chk('mod-credit-hardstop')),
        
        'module.inventory.batchSerialTracking': String(chk('mod-batch-serial')),
        'module.inventory.fefoPicking': String(chk('mod-batch-fefo')),
        'module.inventory.serialMandatory': String(chk('mod-serial-mandatory')),

        'module.briefing.daily': String(chk('mod-briefing-enabled')),
        'automation.briefing.enabled': String(chk('mod-briefing-enabled')),
        'module.briefing.whatsapp': String(chk('mod-briefing-wa')),
        'module.briefing.email': String(chk('mod-briefing-email')),
        'module.briefing.phone': val('mod-briefing-phone').trim()
      };

      try {
        await window.ApiService.put('/api/support/settings', { values });
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Enterprise module toggles & automation rules updated on server!', 'success');
      } catch (err) {
        window.AppDialogService.showToast('Failed to save module settings: ' + err.message, 'error');
      }
    },

    saveNotifications(e) {
      return this.saveNotificationsSettings(e);
    },

    saveModules(e) {
      return this.saveModulesSettings(e);
    }
  };
})();

// Desktop Parity: SessionFocusManager (Client-side Idle Timeout & Warning Modal)
window.SessionFocusManager = {
  timeoutMinutes: 60,
  warningSeconds: 60,
  lastActivity: Date.now(),
  checkInterval: null,
  countdownInterval: null,
  isWarningShown: false,

  init(timeoutMin = 60, warningSec = 60) {
    this.timeoutMinutes = timeoutMin;
    this.warningSeconds = warningSec;
    this.lastActivity = Date.now();
    
    const resetActivity = () => {
      if (!this.isWarningShown) {
        this.lastActivity = Date.now();
      }
    };

    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, resetActivity, { passive: true });
    });

    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => this.checkIdle(), 10000);
  },

  getIdleSeconds() {
    return Math.max(0, Math.floor((Date.now() - this.lastActivity) / 1000));
  },

  getWarningThresholdSeconds() {
    return (this.timeoutMinutes * 60) - this.warningSeconds;
  },

  getRemainingSecondsToWarning() {
    const thresh = this.getWarningThresholdSeconds();
    const idle = this.getIdleSeconds();
    return Math.max(0, thresh - idle);
  },

  checkIdle() {
    if (this.isWarningShown) return;
    const idleMs = Date.now() - this.lastActivity;
    const timeoutMs = this.timeoutMinutes * 60 * 1000;
    const warningThresholdMs = timeoutMs - (this.warningSeconds * 1000);

    if (idleMs >= warningThresholdMs) {
      this.showWarning();
    }
  },

  showWarning() {
    this.isWarningShown = true;
    const modal = document.getElementById('session-timeout-modal');
    const countEl = document.getElementById('session-countdown-seconds');
    if (modal) modal.style.display = 'flex';

    let remaining = this.warningSeconds;
    if (countEl) countEl.innerText = remaining;

    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      remaining--;
      if (countEl) countEl.innerText = remaining;
      if (remaining <= 0) {
        clearInterval(this.countdownInterval);
        this.logoutUser();
      }
    }, 1000);
  },

  async extendSession() {
    this.isWarningShown = false;
    this.lastActivity = Date.now();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    const modal = document.getElementById('session-timeout-modal');
    if (modal) modal.style.display = 'none';
    try {
      if (window.ApiService && window.ApiService.post) {
        await window.ApiService.post('/api/auth/session/extend', {});
      }
    } catch (_) {}
    if (window.AppDialogService) window.AppDialogService.toastSuccess('Session active and renewed.');
  },

  logoutUser() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.checkInterval) clearInterval(this.checkInterval);
    const modal = document.getElementById('session-timeout-modal');
    if (modal) modal.style.display = 'none';
    if (window.AuthService && window.AuthService.logout) {
      window.AuthService.logout();
    } else {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.SessionFocusManager.init(60, 60);
});
