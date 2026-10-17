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

  // Template draft memory matching desktop SettingsController.java
  const templateDrafts = {
    'Sales Invoice (Email)': { subject: 'Tax Invoice {docNo} from {company}', body: 'Dear {customer},\n\nPlease find attached sales tax invoice {docNo} dated {date} for total amount {total}.\n\nOutstanding Balance: {balance}\n\n{signature}' },
    'Quotation (Email)': { subject: 'Sales Quotation {docNo} from {company}', body: 'Dear {customer},\n\nThank you for your inquiry. Please find attached quotation {docNo} dated {date} for total amount {total}.\n\n{signature}' },
    'Purchase Bill (Email)': { subject: 'Purchase Bill {docNo} Confirmation', body: 'Dear {customer},\n\nWe acknowledge receipt of inward purchase bill {docNo} dated {date} for amount {total}.\n\n{signature}' },
    'Payment Receipt (Email)': { subject: 'Payment Receipt Confirmation - {docNo}', body: 'Dear {customer},\n\nWe have received your payment of {total} against invoice reference {docNo}. Thank you for your business.\n\n{signature}' },
    'Sales Return (Email)': { subject: 'Credit Memo / Sales Return {docNo}', body: 'Dear {customer},\n\nPlease find attached credit return note {docNo} dated {date} for total refund amount {total}.\n\n{signature}' },
    'Sales Invoice (WhatsApp)': { subject: '', body: 'Hello {customer}, your invoice {docNo} for {total} has been generated. Thank you for choosing {company}.' },
    'Quotation (WhatsApp)': { subject: '', body: 'Hello {customer}, your requested quotation {docNo} for {total} is ready. Valid for 15 days.' }
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

  return {
    uploadBrandingAsset(assetKey, fileInput) {
      if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64Data = evt.target.result;
        try {
          const values = {};
          values[assetKey] = base64Data;
          await window.ApiService.put('/api/support/settings', { values });
          if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
          window.AppDialogService.showToast(`Asset "${assetKey}" uploaded successfully!`, 'success');
        } catch (err) {
          window.AppDialogService.showToast('Failed to save asset: ' + err.message, 'error');
        }
      };
      reader.readAsDataURL(file);
    },

    async clearBrandingAsset(assetKey) {
      try {
        const values = {};
        values[assetKey] = '';
        await window.ApiService.put('/api/support/settings', { values });
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`Asset "${assetKey}" cleared.`, 'info');
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

      // Update save button label
      const saveBtn = document.getElementById('btn-save-settings-active');
      if (saveBtn) {
        const names = {
          COMPANY: 'Company Profile',
          PAYMENT: 'Payment & Bank',
          INVOICE: 'Invoice Defaults',
          NOTIFICATIONS: 'Notifications',
          EMAIL: 'Email Delivery',
          SECURITY: 'Security Policies',
          MODULES: 'Module Toggles'
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

      const values = {
        'payment.bankName': bankName,
        'payment.accountHolder': val('setting-account-holder').trim(),
        'payment.accountNumber': accountNumber,
        'payment.ifsc': ifsc,
        'payment.branch': val('setting-branch').trim(),
        'payment.accountType': val('setting-account-type'),
        'payment.upiId': val('setting-upi-id').trim(),
        'payment.bankMatchRoundingTolerance': val('setting-tolerance').trim() || '1.00'
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
    // 3. INVOICE DEFAULTS & PRINT SETTINGS
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

        setVal('setting-currency', serverSettings['company.currency'] || (profile && profile.currency) || 'INR (₹)');
        setVal('setting-timezone', serverSettings['company.timeZone'] || (profile && profile.timezone) || 'Asia/Kolkata (IST)');
        setVal('setting-date-format', normDateFmt);
        setVal('setting-time-format', normTimeFmt);
        setVal('setting-invoice-terms', serverSettings['company.terms'] || (profile && profile.invoiceTerms) || '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged after 30 days.\n3. Subject to Morbi jurisdiction only.');
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
        'company.currency': val('setting-currency'),
        'company.timeZone': tzVal,
        'company.dateFormat': normDate,
        'company.timeFormat': normTime,
        'company.terms': val('setting-invoice-terms').trim()
      };

      try {
        await window.ApiService.put('/api/support/settings', { values });
        if (window.FormatUtil) {
          window.FormatUtil.setBusinessPolicy(normDate, normTime, tzVal);
        }
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Invoice regional parameters and legal terms saved to server!', 'success');
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
          setVal('smtp-email', res.email || 'billing@jasviindustries.in');
          setVal('smtp-from-name', res.fromName || 'Jasvi Industries Accounts');
          setChk('smtp-tls', res.startTls !== false);
        }

        // Load signature and active template
        let emailSettings = {};
        try {
          emailSettings = await window.ApiService.get('/api/support/settings?prefix=email.');
          if (emailSettings['email.signature']) {
            setVal('smtp-signature', emailSettings['email.signature']);
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
        window.AppDialogService.showToast('SMTP Host and Sender Email are required.', 'error');
        return;
      }

      const smtpPayload = {
        host,
        port,
        email,
        appPassword: password,
        fromName,
        startTls
      };

      const docCategory = val('email-template-doc') || 'Sales Invoice (Email)';
      const subject = val('email-template-subject').trim();
      const body = val('email-template-body').trim();
      templateDrafts[docCategory] = { subject, body };

      const settingValues = {
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
      const recipient = prompt('Enter recipient email address to send test diagnostic message:', 'director@jasviindustries.in');
      if (!recipient) return;

      window.AppDialogService.showToast(`Dispatching diagnostic TLS probe to ${recipient}...`, 'info');
      try {
        await window.ApiService.post('/api/authority/email/test', { recipient });
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`Diagnostic test email dispatched successfully to ${recipient}!`, 'success');
      } catch (err) {
        window.AppDialogService.showToast('SMTP Test Failed: ' + err.message, 'error');
      }
    },

    // ==========================================
    // 6. SECURITY & SESSION POLICIES
    // ==========================================
    async loadSecuritySettings() {
      try {
        const secSettings = await window.ApiService.get('/api/support/settings?prefix=security.');
        setVal('sec-session-timeout', secSettings['security.session.timeout.minutes'] || '60');
        setVal('sec-session-warning', secSettings['security.session.warning.minutes'] || '5');
        setVal('sec-mfa-policy', secSettings['security.auth.mfa.policy'] || 'ADMIN_CONTROLLED');
        setChk('sec-ui-diagnostics', true);
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

        setChk('mod-threeway-enabled', modSettings['module.automation.threeWayMatch'] !== 'false');
        setChk('mod-threeway-autodebit', modSettings['module.automation.autoDraftDebitNote'] !== 'false');
        setChk('mod-reorder-enabled', modSettings['module.automation.stockAutoReorder'] !== 'false');
        setChk('mod-credit-hardstop', modSettings['module.automation.creditHardStop'] !== 'false');
        setChk('mod-batch-serial', modSettings['module.inventory.batchSerialTracking'] !== 'false');

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

        'module.automation.threeWayMatch': String(chk('mod-threeway-enabled')),
        'automation.threeway.enabled': String(chk('mod-threeway-enabled')),
        'module.automation.autoDraftDebitNote': String(chk('mod-threeway-autodebit')),
        'module.automation.stockAutoReorder': String(chk('mod-reorder-enabled')),
        'automation.reorder.enabled': String(chk('mod-reorder-enabled')),
        'module.automation.creditHardStop': String(chk('mod-credit-hardstop')),
        'credit_control.hard_stop': String(chk('mod-credit-hardstop')),
        'module.inventory.batchSerialTracking': String(chk('mod-batch-serial')),

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
    }
  };
})();
