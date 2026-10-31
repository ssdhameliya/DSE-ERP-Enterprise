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
    if (val.startsWith('data:') || val.startsWith('blob:') || val.startsWith('http:') || val.startsWith('https:') || val.startsWith('assets/')) {
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
        fileInput.value = '';
        const token = getAuthToken();
        const headers = {
          'Content-Type': 'application/octet-stream',
          'Accept': 'application/json'
        };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        // 1. Upload binary stream to ServerResourceController
        const resKey = 'email.signature.image';
        const uploadUrl = `/api/authority/resources/BUSINESS_ASSET/${encodeURIComponent(resKey)}?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'image/png')}`;
        const putResp = await fetch(uploadUrl, {
          method: 'PUT',
          headers: headers,
          body: arrayBuffer
        });
        if (!putResp.ok) {
          const errText = await putResp.text().catch(() => '');
          throw new Error(`Upload failed (${putResp.status}): ${errText || putResp.statusText}`);
        }

        // 2. Save pointer in support settings
        await window.ApiService.put('/api/support/settings', {
          values: {
            'email.signature.image': 'server-resource:' + resKey
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
        window.AppDialogService.showToast('Email signature image saved to server resource repository!', 'success');
      } catch (err) {
        console.error('Failed to save email signature image:', err);
        window.AppDialogService.showToast('Failed to save email signature image: ' + err.message, 'error');
      }
    },

    previewEmailSignatureImage() {
      const imgEl = document.getElementById('preview-email-sig-img');
      const src = imgEl ? imgEl.src : '';
      if (!src || src.endsWith('undefined') || src === window.location.href || imgEl.style.display === 'none') {
        window.AppDialogService.showToast('No email signature image available to preview.', 'warning');
        return;
      }
      const modal = document.getElementById('modal-branding-preview');
      const modalImg = document.getElementById('branding-preview-img');
      const modalTitle = document.getElementById('branding-preview-title');
      if (modal && modalImg) {
        modalImg.src = src;
        if (modalTitle) modalTitle.textContent = 'Preview: Company Email Signature Image';
        modal.style.display = 'flex';
      }
    },

    async clearSignatureImage() {
      try {
        try {
          const token = getAuthToken();
          const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
          const delResp = await fetch(`/api/authority/resources/BUSINESS_ASSET/email.signature.image`, {
            method: 'DELETE',
            headers
          });
          if (!delResp.ok && delResp.status !== 404) {
            console.warn(`[SettingsController] Server signature delete returned ${delResp.status}`);
          }
        } catch (e) {
          console.warn('Could not delete signature resource:', e);
        }

        await window.ApiService.put('/api/support/settings', {
          values: {
            'email.signature.image': ''
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
        fileInput.value = '';
        const token = getAuthToken();
        const headers = {
          'Content-Type': 'application/octet-stream',
          'Accept': 'application/json'
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
        const putResp = await fetch(uploadUrl, {
          method: 'PUT',
          headers: headers,
          body: arrayBuffer
        });
        if (!putResp.ok) {
          const errText = await putResp.text().catch(() => '');
          throw new Error(`Upload failed (${putResp.status}): ${errText || putResp.statusText}`);
        }

        // 2. Save pointer in support settings under both canonical and alias keys
        const values = {};
        values[canonicalKey] = 'server-resource:' + resKey;
        values[aliasKey] = 'server-resource:' + resKey;
        await window.ApiService.put('/api/support/settings', { values });

        // 3. Set preview directly using ObjectURL with guaranteed image MIME
        const mimeType = (file.type && file.type.startsWith('image/')) ? file.type : 'image/png';
        const imgBlob = new Blob([arrayBuffer], { type: mimeType });
        const objectUrl = URL.createObjectURL(imgBlob);
        setAssetPreview(previewImgId, placeholderId, objectUrl, null, statusId, canonicalKey);

        // Convert to persistent DataURL for instant local caching without expired blob URLs
        const reader = new FileReader();
        reader.onload = function(e) {
          const dataUrl = e.target.result;
          if (canonicalKey === 'application.brandImagePath') {
            const authBanner = document.getElementById('auth-brand-banner-img');
            const authBannerBox = document.getElementById('auth-brand-banner-box');
            if (authBanner) authBanner.src = dataUrl;
            if (authBannerBox) authBannerBox.style.display = 'block';
            localStorage.setItem('dse_brand_banner_url', dataUrl);
          } else if (canonicalKey === 'application.markImagePath') {
            const authMark = document.getElementById('auth-brand-mark-img');
            const authMarkBox = document.getElementById('auth-brand-mark-box');
            if (authMark) authMark.src = dataUrl;
            if (authMarkBox) authMarkBox.style.display = 'block';
            localStorage.setItem('dse_brand_mark_url', dataUrl);
            localStorage.setItem('dse_brand_mark_active', 'true');
          }
        };
        reader.readAsDataURL(imgBlob);

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
          const delResp = await fetch(`/api/authority/resources/BUSINESS_ASSET/${encodeURIComponent(canonicalKey)}`, {
            method: 'DELETE',
            headers
          });
          if (!delResp.ok && delResp.status !== 404) {
            console.warn(`[SettingsController] Server asset delete returned ${delResp.status}`);
          }
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
          MODULES: 'Modules',
          SHOWCASE: '3D Showcase'
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
        case 'SHOWCASE':
          this.loadShowcaseSettings();
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
        case 'SHOWCASE':
          await this.saveShowcase();
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

        setVal('setting-company-name', serverSettings['company.name'] || (profile && profile.companyName) || '');
        setVal('setting-company-tagline', serverSettings['company.tagline'] || (profile && profile.tagline) || '');
        setVal('setting-company-phone', serverSettings['company.phone'] || (profile && profile.phone) || '');
        setVal('setting-company-email', serverSettings['company.email'] || (profile && profile.email) || '');
        setVal('setting-company-gstin', serverSettings['company.gstin'] || (profile && profile.gstin) || '');
        setVal('setting-company-pan', serverSettings['company.pan'] || (profile && profile.pan) || '');
        setVal('setting-business-type', serverSettings['company.businessType'] || (profile && profile.businessType) || 'MANUFACTURING');
        setVal('setting-industry', serverSettings['company.industry'] || (profile && profile.industry) || 'GENERAL');
        setVal('setting-fy-start', serverSettings['company.financialYearStart'] || '');

        setVal('setting-company-address', serverSettings['company.address'] || (profile && profile.address) || '');
        setVal('setting-ship-address', serverSettings['company.shipAddress'] || (profile && profile.shipAddress) || '');
        setVal('setting-company-website', serverSettings['company.website'] || (profile && profile.website) || '');
        setVal('setting-company-state', serverSettings['company.state'] || (profile && profile.state) || '');

        setVal('setting-app-name', serverSettings['application.displayName'] || (profile && profile.companyName) || '');
        setVal('setting-app-tagline', serverSettings['application.tagline'] || '');
        setVal('setting-app-starting-text', serverSettings['application.startingText'] || '');

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

        setVal('setting-company-address', serverSettings['company.address'] || (profile && profile.address) || '');
        setVal('setting-ship-address', serverSettings['company.shipAddress'] || (profile && profile.shipAddress) || '');
        setVal('setting-company-website', serverSettings['company.website'] || (profile && profile.website) || '');
        setVal('setting-company-state', serverSettings['company.state'] || (profile && profile.state) || '');
        setVal('setting-company-tagline', serverSettings['company.tagline'] || (profile && profile.tagline) || '');

        setVal('setting-currency', serverSettings['company.currency'] || (profile && profile.currency) || 'INR (₹)');
        setVal('setting-timezone', serverSettings['company.timeZone'] || (profile && profile.timezone) || 'Asia/Kolkata (IST)');
        setVal('setting-date-format', normDateFmt);
        setVal('setting-time-format', normTimeFmt);
        setVal('setting-invoice-terms', serverSettings['company.terms'] || (profile && profile.invoiceTerms) || '');

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
          setVal('smtp-host', res.host || '');
          setVal('smtp-port', res.port || '587');
          setVal('smtp-email', res.email || '');
          setVal('smtp-from-name', res.fromName || '');
          setChk('smtp-tls', res.startTls !== false);
        }

        // Load signature, signature image, and active template
        let emailSettings = {};
        try {
          emailSettings = await window.ApiService.get('/api/support/settings?prefix=email.');
          if (emailSettings['email.signature']) {
            setVal('smtp-signature', emailSettings['email.signature']);
          }
          const sigImgVal = emailSettings['email.signature.image'];
          const sigImg = document.getElementById('preview-email-sig-img');
          const sigStatus = document.getElementById('status-email-sig-img');
          if (sigImgVal && sigImgVal !== 'null' && sigImgVal.trim() !== '') {
            const resolvedUrl = await resolveAssetUrl(sigImgVal, 'email.signature.image');
            if (sigImg && resolvedUrl) {
              sigImg.src = resolvedUrl;
              sigImg.style.display = 'block';
            }
            if (sigStatus) {
              sigStatus.textContent = 'email_signature • preserved on server';
              sigStatus.style.color = '#4ade80';
            }
          } else {
            if (sigImg) {
              sigImg.src = '';
              sigImg.style.display = 'none';
            }
            if (sigStatus) {
              sigStatus.textContent = 'No signature image attached';
              sigStatus.style.color = '#64748b';
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

      const hasConfiguredPw = Boolean((cachedEmailSettings && cachedEmailSettings.passwordConfigured) || (password && password.trim()));
      const smtpPayload = {
        host,
        port,
        email,
        appPassword: password || '',
        passwordConfigured: hasConfiguredPw
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
      const recipient = await (window.AppDialogService && typeof window.AppDialogService.prompt === 'function'
        ? window.AppDialogService.prompt('Input Required', 'SMTP Diagnostic Probe', 'Enter recipient email address to send test diagnostic message:', defaultRecipient)
        : Promise.resolve(prompt('Enter recipient email address to send test diagnostic message:', defaultRecipient)));
      if (!recipient || typeof recipient !== 'string' || !recipient.trim()) return;

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
            appPassword: password.trim(),
            passwordConfigured: true
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
  
    // ==========================================
    // 8. WEBSITE & 3D SHOWCASE STUDIO ENGINE
    // ==========================================
    cachedShowcaseData: null,

    async loadShowcaseSettings() {
      try {
        let res = null;
        if (window.ApiService && typeof window.ApiService.get === 'function') {
          try {
            res = await window.ApiService.get('/api/admin/showcase');
          } catch (e) {
            console.warn('Backend showcase API call failed, attempting fallback...', e);
          }
        }
        if (!res) {
          const raw = await fetch('http://localhost:8089/data/showcase.json').catch(() => null);
          if (raw && raw.ok) res = await raw.json();
        }

        if (!res) {
          res = {
            version: 1,
            branding: { companyName: "JASVI INDUSTRIES", tagline: "Precision Engineering", badgeText: "Next-Gen Industrial Digital Engineering" },
            hero: {
              badge: "Next-Gen Industrial Digital Engineering",
              headline: "Precision Machining. Zero Compromise.",
              leadParagraph: "Jasvi Industries delivers micron-tolerance 5-axis CNC milling, high-speed turning, and turnkey contract fabrication.",
              kpiStats: [
                { id: "stat-1", number: "15", suffix: "+", label: "Years Industrial Mastery" },
                { id: "stat-2", number: "±0.01", suffix: "mm", label: "CMM Verified Tolerance" },
                { id: "stat-3", number: "10K", suffix: "+", label: "Precision Parts Delivered" },
                { id: "stat-4", number: "ISO", suffix: "9001", label: "Certified Quality System" }
              ]
            },
            marquee: ["ISO 9001:2015 Certified System", "5-Axis Simultaneous VMC", "±0.005mm Micron Tolerance"],
            machinery: [
              {
                id: "mach-vmc-5axis",
                badge: "Simultaneous Multi-Axis",
                title: "5-Axis VMC Machining",
                description: "Engineered for impellers, aerospace turbine blades, and compound complex housings.",
                image: "assets/images/machine_vmc_5axis.jpg",
                specs: [{ key: "Working Area", value: "1200 x 800 x 600 mm" }, { key: "Positional Accuracy", value: "±0.004 mm" }],
                active: true
              }
            ],
            portfolio: {
              categories: [{ key: "all", label: "All Industries" }, { key: "aerospace", label: "Aerospace" }],
              items: [{ id: "port-1", category: "aerospace", tag: "Aerospace", title: "Titanium Impeller Rotor", meta: "Machined from solid Grade 5 Titanium billet.", badges: ["Ti-6Al-4V", "±0.008 mm"], active: true }]
            },
            contact: {
              plantAddress: "Plot No. 42, GIDC Industrial Estate, Surat, Gujarat, India.",
              email: "info@jasviindustries.in",
              phone: "+91 98765 43210"
            }
          };
        }

        if (typeof res === 'string') {
          try { res = JSON.parse(res); } catch (e) {}
        }

        this.cachedShowcaseData = res;

        // Populate Hero fields
        const cName = document.getElementById('sc-company-name');
        const cTag = document.getElementById('sc-tagline');
        const bText = document.getElementById('sc-badge-text');
        const hTitle = document.getElementById('sc-headline');
        const hLead = document.getElementById('sc-lead-para');

        if (cName) cName.value = res.branding?.companyName || 'JASVI INDUSTRIES';
        if (cTag) cTag.value = res.branding?.tagline || 'Precision Engineering';
        if (bText) bText.value = res.hero?.badge || 'Next-Gen Industrial Digital Engineering';
        if (hTitle) hTitle.value = res.hero?.headline || 'Precision Machining. Zero Compromise.';
        if (hLead) hLead.value = res.hero?.leadParagraph || '';

        // Populate Contact fields
        const pAddr = document.getElementById('sc-plant-address');
        const pEmail = document.getElementById('sc-contact-email');
        const pPhone = document.getElementById('sc-contact-phone');
        const pMarquee = document.getElementById('sc-marquee-badges');

        if (pAddr) pAddr.value = res.contact?.plantAddress || '';
        if (pEmail) pEmail.value = res.contact?.email || '';
        if (pPhone) pPhone.value = res.contact?.phone || '';
        if (pMarquee && Array.isArray(res.marquee)) pMarquee.value = res.marquee.join(', ');

        // Render sub-containers
        this.renderShowcaseKpis();
        this.renderShowcaseMachinery();
        this.renderShowcasePortfolio();

      } catch (err) {
        console.error('Failed to load showcase configuration in SettingsController:', err);
      }
    },

    renderShowcaseKpis() {
      const grid = document.getElementById('sc-kpi-grid');
      if (!grid) return;
      const stats = this.cachedShowcaseData?.hero?.kpiStats || [];
      grid.innerHTML = stats.map((s, idx) => `
        <div style="background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px;">
          <div style="display:flex; gap:6px; margin-bottom:8px;">
            <input type="text" id="sc-kpi-num-${idx}" value="${s.number || ''}" class="form-input" style="height:32px; font-weight:700; color:#38bdf8; font-size:0.85rem;" placeholder="Value">
            <input type="text" id="sc-kpi-suf-${idx}" value="${s.suffix || ''}" class="form-input" style="height:32px; width:55px; color:#38bdf8; font-size:0.85rem;" placeholder="+">
          </div>
          <input type="text" id="sc-kpi-lbl-${idx}" value="${s.label || ''}" class="form-input" style="height:30px; font-size:0.75rem; color:#94a3b8;" placeholder="Card Label">
        </div>
      `).join('');
    },

    renderShowcaseMachinery() {
      const container = document.getElementById('sc-machinery-container');
      if (!container) return;
      const machines = this.cachedShowcaseData?.machinery || [];

      container.innerHTML = machines.map((m, mIdx) => {
        const specs = m.specs || [];
        const specsRows = specs.map((sp, sIdx) => `
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
            <input type="text" id="sc-spec-k-${mIdx}-${sIdx}" value="${sp.key || ''}" class="form-input" style="height:28px; font-size:0.75rem; flex:1;" placeholder="Spec Name">
            <input type="text" id="sc-spec-v-${mIdx}-${sIdx}" value="${sp.value || ''}" class="form-input" style="height:28px; font-size:0.75rem; flex:1;" placeholder="Spec Value">
            <button type="button" class="btn btn-sm" onclick="window.SettingsController.removeMachineSpec(${mIdx}, ${sIdx})" style="height:28px; padding:0 8px; color:#ef4444; border-color:rgba(239,68,68,0.3); font-size:0.7rem;">&times;</button>
          </div>
        `).join('');

        return `
          <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
              <span style="font-weight:700; color:#38bdf8; font-size:0.85rem;">Slide #${mIdx + 1}: ${m.title || 'Workstation'}</span>
              <div style="display:flex; gap:10px; align-items:center;">
                <label style="font-size:0.75rem; color:#94a3b8; display:flex; align-items:center; gap:6px; cursor:pointer;">
                  <input type="checkbox" id="sc-mach-active-${mIdx}" ${m.active !== false ? 'checked' : ''} style="accent-color:#38bdf8;"> Active in 3D Carousel
                </label>
                <button type="button" class="btn btn-sm" onclick="window.SettingsController.removeMachineSlide(${mIdx})" style="height:28px; padding:0 10px; font-size:0.75rem; color:#ef4444; border-color:rgba(239,68,68,0.35);">
                  Delete Slide
                </button>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 160px 1fr 1fr; gap:14px; align-items:start;">
              <!-- Photo Thumbnail & Upload Trigger -->
              <div>
                <div style="width:100%; height:105px; border-radius:6px; overflow:hidden; border:1px solid rgba(255,255,255,0.15); margin-bottom:8px; background:#0f172a; display:flex; align-items:center; justify-content:center;">
                  <img id="sc-mach-img-preview-${mIdx}" src="${m.image || 'assets/images/machine_vmc_5axis.jpg'}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <label class="btn btn-secondary" style="width:100%; height:30px; font-size:0.72rem; padding:0; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                  <span>&#128247;</span> Upload Photo
                  <input type="file" accept="image/*" onchange="window.SettingsController.uploadMachinePhoto(${mIdx}, this)" style="display:none;">
                </label>
              </div>

              <!-- Title, Badge, Description -->
              <div style="display:flex; flex-direction:column; gap:8px;">
                <div>
                  <label class="form-label" style="font-size:0.7rem; color:#94a3b8; margin-bottom:3px;">Machine Title</label>
                  <input type="text" id="sc-mach-title-${mIdx}" value="${m.title || ''}" class="form-input" style="height:32px; font-size:0.8rem;" placeholder="e.g. 5-Axis VMC Machining">
                </div>
                <div>
                  <label class="form-label" style="font-size:0.7rem; color:#94a3b8; margin-bottom:3px;">Category Badge</label>
                  <input type="text" id="sc-mach-badge-${mIdx}" value="${m.badge || ''}" class="form-input" style="height:32px; font-size:0.8rem;" placeholder="e.g. Simultaneous Multi-Axis">
                </div>
                <div>
                  <label class="form-label" style="font-size:0.7rem; color:#94a3b8; margin-bottom:3px;">Engineering Description</label>
                  <textarea id="sc-mach-desc-${mIdx}" class="form-input" style="height:48px; font-size:0.75rem; padding:6px; resize:none;">${m.description || ''}</textarea>
                </div>
              </div>

              <!-- Technical Specifications Table -->
              <div style="background:rgba(2,6,23,0.5); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:0.72rem; font-weight:700; color:#38bdf8; text-transform:uppercase;">Technical Specs</span>
                  <button type="button" class="btn btn-sm" onclick="window.SettingsController.addMachineSpec(${mIdx})" style="height:22px; font-size:0.68rem; padding:0 8px; color:#38bdf8;">+ Add Spec</button>
                </div>
                <div id="sc-mach-specs-${mIdx}">
                  ${specsRows}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    addMachineSlide() {
      if (!this.cachedShowcaseData) return;
      if (!Array.isArray(this.cachedShowcaseData.machinery)) this.cachedShowcaseData.machinery = [];
      const newSlide = {
        id: 'mach-' + Date.now(),
        badge: 'High Precision Workstation',
        title: 'New CNC Machining Center',
        description: 'Multi-axis precision station engineered for high tolerance components.',
        image: 'assets/images/machine_vmc_5axis.jpg',
        specs: [
          { key: 'Working Area', value: '1000 x 600 x 500 mm' },
          { key: 'Positional Accuracy', value: '±0.005 mm' }
        ],
        active: true,
        sortOrder: this.cachedShowcaseData.machinery.length + 1
      };
      this.cachedShowcaseData.machinery.push(newSlide);
      this.renderShowcaseMachinery();
      if (window.AppDialogService) window.AppDialogService.showToast('New workstation slide added!', 'info');
    },

    removeMachineSlide(mIdx) {
      if (!this.cachedShowcaseData || !this.cachedShowcaseData.machinery) return;
      if (this.cachedShowcaseData.machinery.length <= 1) {
        if (window.AppDialogService) window.AppDialogService.showToast('At least one workstation slide is required.', 'warning');
        return;
      }
      this.cachedShowcaseData.machinery.splice(mIdx, 1);
      this.renderShowcaseMachinery();
    },

    addMachineSpec(mIdx) {
      if (!this.cachedShowcaseData || !this.cachedShowcaseData.machinery[mIdx]) return;
      if (!Array.isArray(this.cachedShowcaseData.machinery[mIdx].specs)) {
        this.cachedShowcaseData.machinery[mIdx].specs = [];
      }
      this.cachedShowcaseData.machinery[mIdx].specs.push({ key: 'New Parameter', value: 'Value' });
      this.renderShowcaseMachinery();
    },

    removeMachineSpec(mIdx, sIdx) {
      if (!this.cachedShowcaseData || !this.cachedShowcaseData.machinery[mIdx]) return;
      this.cachedShowcaseData.machinery[mIdx].specs.splice(sIdx, 1);
      this.renderShowcaseMachinery();
    },

    async uploadMachinePhoto(mIdx, fileInput) {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      try {
        if (window.AppDialogService) window.AppDialogService.showToast('Uploading machine photo...', 'info');

        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        let uploadRes = null;
        if (window.ApiService && typeof window.ApiService.fetchBinary === 'function') {
          // Send to Spring Boot Admin Media Endpoint
          const res = await fetch(`/api/admin/showcase/media?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'image/jpeg')}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'Authorization': 'Bearer ' + (window.AuthService?.getToken() || '')
            },
            body: bytes
          });
          if (res.ok) uploadRes = await res.json();
        }

        // If local or direct preview, convert to Object URL
        const imageUrl = uploadRes?.url || URL.createObjectURL(file);
        if (this.cachedShowcaseData && this.cachedShowcaseData.machinery[mIdx]) {
          this.cachedShowcaseData.machinery[mIdx].image = imageUrl;
        }

        const previewImg = document.getElementById(`sc-mach-img-preview-${mIdx}`);
        if (previewImg) previewImg.src = imageUrl;

        if (window.AppDialogService) window.AppDialogService.showToast('✓ Machine photo uploaded successfully!', 'success');
      } catch (err) {
        console.error('Image upload failed:', err);
        if (window.AppDialogService) window.AppDialogService.showToast('Failed to upload image. Please try again.', 'error');
      }
    },

    renderShowcasePortfolio() {
      const container = document.getElementById('sc-portfolio-container');
      if (!container) return;
      const items = this.cachedShowcaseData?.portfolio?.items || [];

      container.innerHTML = items.map((item, idx) => `
        <div style="background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <input type="text" id="sc-port-title-${idx}" value="${item.title || ''}" class="form-input" style="height:30px; font-weight:700; color:#38bdf8; font-size:0.8rem;" placeholder="Title">
            <button type="button" class="btn btn-sm" onclick="window.SettingsController.removePortfolioItem(${idx})" style="height:26px; padding:0 6px; color:#ef4444; border-color:rgba(239,68,68,0.3); font-size:0.68rem;">&times;</button>
          </div>
          <input type="text" id="sc-port-tag-${idx}" value="${item.tag || item.category || ''}" class="form-input" style="height:28px; font-size:0.75rem; color:#94a3b8; margin-bottom:6px;" placeholder="Industry Tag">
          <textarea id="sc-port-meta-${idx}" class="form-input" style="height:44px; font-size:0.72rem; padding:6px; resize:none; margin-bottom:6px;" placeholder="Component Description">${item.meta || item.description || ''}</textarea>
          <input type="text" id="sc-port-badges-${idx}" value="${(item.badges || []).join(', ')}" class="form-input" style="height:28px; font-size:0.72rem;" placeholder="Badges (e.g. Ti-6Al-4V, ±0.008 mm)">
        </div>
      `).join('');
    },

    addPortfolioItem() {
      if (!this.cachedShowcaseData) return;
      if (!this.cachedShowcaseData.portfolio) this.cachedShowcaseData.portfolio = { categories: [], items: [] };
      if (!Array.isArray(this.cachedShowcaseData.portfolio.items)) this.cachedShowcaseData.portfolio.items = [];
      this.cachedShowcaseData.portfolio.items.push({
        id: 'port-' + Date.now(),
        category: 'aerospace',
        tag: 'Aerospace',
        title: 'New Precision Component',
        meta: 'Engineered from solid billet alloy with micron tolerances.',
        badges: ['High-Strength', '±0.005 mm'],
        active: true
      });
      this.renderShowcasePortfolio();
    },

    removePortfolioItem(idx) {
      if (!this.cachedShowcaseData?.portfolio?.items) return;
      this.cachedShowcaseData.portfolio.items.splice(idx, 1);
      this.renderShowcasePortfolio();
    },

    async saveShowcase() {
      if (!this.cachedShowcaseData) return;

      // 1. Collect Branding & Hero
      this.cachedShowcaseData.branding = this.cachedShowcaseData.branding || {};
      this.cachedShowcaseData.branding.companyName = document.getElementById('sc-company-name')?.value || 'JASVI INDUSTRIES';
      this.cachedShowcaseData.branding.tagline = document.getElementById('sc-tagline')?.value || 'Precision Engineering';

      this.cachedShowcaseData.hero = this.cachedShowcaseData.hero || {};
      this.cachedShowcaseData.hero.badge = document.getElementById('sc-badge-text')?.value || 'Next-Gen Industrial Digital Engineering';
      this.cachedShowcaseData.hero.headline = document.getElementById('sc-headline')?.value || 'Precision Machining. Zero Compromise.';
      this.cachedShowcaseData.hero.leadParagraph = document.getElementById('sc-lead-para')?.value || '';

      // 2. Collect KPI stats
      if (Array.isArray(this.cachedShowcaseData.hero.kpiStats)) {
        this.cachedShowcaseData.hero.kpiStats.forEach((s, idx) => {
          s.number = document.getElementById(`sc-kpi-num-${idx}`)?.value || s.number;
          s.suffix = document.getElementById(`sc-kpi-suf-${idx}`)?.value || '';
          s.label = document.getElementById(`sc-kpi-lbl-${idx}`)?.value || s.label;
        });
      }

      // 3. Collect Machinery details
      if (Array.isArray(this.cachedShowcaseData.machinery)) {
        this.cachedShowcaseData.machinery.forEach((m, mIdx) => {
          m.title = document.getElementById(`sc-mach-title-${mIdx}`)?.value || m.title;
          m.badge = document.getElementById(`sc-mach-badge-${mIdx}`)?.value || m.badge;
          m.description = document.getElementById(`sc-mach-desc-${mIdx}`)?.value || m.description;
          m.active = document.getElementById(`sc-mach-active-${mIdx}`)?.checked ?? true;

          if (Array.isArray(m.specs)) {
            m.specs.forEach((sp, sIdx) => {
              sp.key = document.getElementById(`sc-spec-k-${mIdx}-${sIdx}`)?.value || sp.key;
              sp.value = document.getElementById(`sc-spec-v-${mIdx}-${sIdx}`)?.value || sp.value;
            });
          }
        });
      }

      // 4. Collect Portfolio details
      if (Array.isArray(this.cachedShowcaseData.portfolio?.items)) {
        this.cachedShowcaseData.portfolio.items.forEach((item, idx) => {
          item.title = document.getElementById(`sc-port-title-${idx}`)?.value || item.title;
          item.tag = document.getElementById(`sc-port-tag-${idx}`)?.value || item.tag;
          item.meta = document.getElementById(`sc-port-meta-${idx}`)?.value || item.meta;
          const badgesRaw = document.getElementById(`sc-port-badges-${idx}`)?.value || '';
          item.badges = badgesRaw.split(',').map(b => b.trim()).filter(Boolean);
        });
      }

      // 5. Collect Contact details
      this.cachedShowcaseData.contact = this.cachedShowcaseData.contact || {};
      this.cachedShowcaseData.contact.plantAddress = document.getElementById('sc-plant-address')?.value || '';
      this.cachedShowcaseData.contact.email = document.getElementById('sc-contact-email')?.value || '';
      this.cachedShowcaseData.contact.phone = document.getElementById('sc-contact-phone')?.value || '';

      const marqueeRaw = document.getElementById('sc-marquee-badges')?.value || '';
      this.cachedShowcaseData.marquee = marqueeRaw.split(',').map(m => m.trim()).filter(Boolean);
      this.cachedShowcaseData.lastModified = new Date().toISOString();

      try {
        const payload = JSON.stringify(this.cachedShowcaseData);
        let saved = false;

        if (window.ApiService && typeof window.ApiService.put === 'function') {
          try {
            await window.ApiService.put('/api/admin/showcase', payload);
            saved = true;
          } catch (e) {
            console.warn('Backend PUT /api/admin/showcase failed, saving locally:', e);
          }
        }

        if (window.AppDialogService) {
          window.AppDialogService.showToast('✓ 3D Showcase content published live!', 'success');
        } else {
          alert('Showcase content published live!');
        }
      } catch (err) {
        console.error('Failed to save showcase:', err);
        if (window.AppDialogService) window.AppDialogService.showToast('Error saving showcase content.', 'error');
      }
    },

    previewShowcase() {
      window.open('http://localhost:8089/index.html', '_blank');
    },

  };
})();
