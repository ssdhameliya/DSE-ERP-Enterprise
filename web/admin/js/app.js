/**
 * Jasvi Industries ERP - App Bootstrap
 * Enterprise MVC Application Lifecycle Manager matching desktop App and Main Stage
 */
window.App = (function() {
  function startClock() {
    function tick() {
      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const day = days[now.getDay()];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[now.getMonth()];
      const dayNum = String(now.getDate()).padStart(2, '0');
      const year = now.getFullYear();
      const dateFormatted = `${dayNum} ${month} ${year}`;
      const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const tzAbbr = 'IST';
      const clockText = `${day}, ${dateFormatted} | ${timeFormatted} | ${tzAbbr}`;

      const el = document.getElementById('clock-display');
      if (el) {
        el.innerText = `${day.slice(0, 3)}, ${dateFormatted} | ${timeFormatted} ${tzAbbr}`;
        el.title = clockText;
      }
      const footerClock = document.getElementById('footer-live-clock');
      const authFooterClock = document.getElementById('auth-footer-clock');
      if (footerClock) footerClock.innerText = `📅 ${clockText}`;
      if (authFooterClock) authFooterClock.innerText = `📅 ${clockText}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  async function syncFooterCompanyProfile() {
    try {
      let profile = null;
      if (window.AuthService && window.AuthService.getCurrentUser) {
        const u = window.AuthService.getCurrentUser();
        if (u && u.companyProfile) profile = u.companyProfile;
      }
      if (!profile && window.ApiService) {
        profile = await window.ApiService.get('/api/authority/business-profile').catch(() => null);
      }
      if (!profile && window.MasterService && window.MasterService.getCompanyProfile) {
        profile = await window.MasterService.getCompanyProfile().catch(() => null);
      }
      if (profile) {
        const nameEl = document.getElementById('footer-company-name');
        const phoneEl = document.getElementById('footer-phone');
        const emailEl = document.getElementById('footer-email');
        const webEl = document.getElementById('footer-website');

        const compName = profile.legalName || profile.tradeName || profile.companyName || 'Jasvi Industries';
        if (nameEl) nameEl.innerHTML = `🏢 ${compName}`;

        const ph = profile.phone || profile.mobile || '9099939193';
        if (phoneEl) {
          phoneEl.innerHTML = `📞 ${ph}`;
          phoneEl.style.display = ph ? 'inline' : 'none';
        }

        const em = profile.email || 'info@jasviindustries.in';
        if (emailEl) {
          emailEl.innerHTML = `✉️ ${em}`;
          emailEl.style.display = em ? 'inline' : 'none';
        }

        const web = profile.website || 'https://jasviindustries.in';
        if (webEl) {
          const webUrl = web.startsWith('http') ? web : 'https://' + web;
          const webDisplay = web.replace(/^https?:\/\//, '');
          webEl.innerHTML = `<a href="${webUrl}" target="_blank" style="color:inherit; text-decoration:none;">🌐 ${webDisplay}</a>`;
          webEl.style.display = web ? 'inline' : 'none';
        }
      }
    } catch (_) {}
  }
  window.syncFooterCompanyProfile = syncFooterCompanyProfile;

  function setupEnvironment() {
    const isUat = window.location.hostname.includes('-uat');
    const envBadge = document.getElementById('env-badge');
    const authEnvLabel = document.getElementById('auth-env-label');
    if (envBadge) {
      if (isUat) {
        envBadge.className = 'env-tag uat';
        envBadge.innerText = 'UAT STAGING (144.24.109.1)';
      } else {
        envBadge.className = 'env-tag prod';
        envBadge.innerText = 'PRODUCTION (130.210.35.1)';
      }
    }
    if (authEnvLabel) {
      authEnvLabel.innerText = isUat ? 'UAT Staging Cloud' : 'Production Cluster';
    }
  }

  window.applyUserToHeader = function(user) {
    if (!user) return;
    const name = user.fullName || user.username || 'User';
    const role = (user.role || 'USER').toUpperCase();
    const avatar = (user.fullName || user.username || 'U')[0].toUpperCase();

    const nameEl = document.getElementById('header-user-name');
    const roleEl = document.getElementById('header-user-role');
    const avatarEl = document.getElementById('header-user-avatar');
    if (nameEl) nameEl.innerText = name;
    if (roleEl) roleEl.innerText = role;
    if (avatarEl) avatarEl.innerText = avatar;

    const menuName = document.getElementById('menu-user-name');
    const menuRole = document.getElementById('menu-user-role');
    if (menuName) menuName.innerText = name;
    if (menuRole) menuRole.innerText = role;
  };
  function applyUserToHeader(user) { window.applyUserToHeader(user); }

  function setupAuthForms() {
    populateLoginRoles();

    const identInput = document.getElementById('login-identity');
    const passInput = document.getElementById('login-password');
    const loginRole = document.getElementById('login-role');

    if (identInput) {
      identInput.addEventListener('input', () => {
        if (window.resetPendingLogin) window.resetPendingLogin();
      });
    }
    if (passInput) {
      passInput.addEventListener('input', () => {
        if (window.resetPendingLogin) window.resetPendingLogin();
      });
    }
    if (loginRole) {
      loginRole.addEventListener('change', () => {
        if (window.resetPendingLogin) window.resetPendingLogin();
        if (window.updateLoginMode) window.updateLoginMode();
      });
    }

    async function populateLoginRoles() {
      const roleSelect = document.getElementById('login-role');
      if (!roleSelect) return;
      try {
        const roles = await window.AuthService.getLoginRoles();
        if (Array.isArray(roles) && roles.length > 0) {
          roleSelect.innerHTML = roles.map(r => `<option value="${r.code}">${r.displayName || r.code}</option>`).join('');
        }
        const savedRole = localStorage.getItem('dse_saved_role') || 'ADMIN';
        roleSelect.value = savedRole;
        if (window.updateLoginMode) window.updateLoginMode();
      } catch (e) {
        console.warn('Could not load login roles:', e);
      }

      const savedIdentity = localStorage.getItem('dse_saved_identity');
      const identityInput = document.getElementById('login-identity');
      const rememberCheck = document.getElementById('login-remember');
      const savedRemember = localStorage.getItem('dse_remember_me') === 'true';
      if (rememberCheck) rememberCheck.checked = savedRemember || !!savedIdentity;
      if (savedIdentity && identityInput) {
        identityInput.value = savedIdentity;
      }
      if (window.updateLoginMode) window.updateLoginMode();
    }

    // Audio toggle
    const audioBtn = document.getElementById('audio-toggle-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const enabled = window.AudioSynthesizer.toggle();
        audioBtn.classList.toggle('active', enabled);
        document.getElementById('audio-text').innerText = enabled ? 'Audio: ON' : 'Audio: OFF';
      });
    }
  }

  window.navigateToReceivableSales = function() {
    if (window.NavigationRouter) {
      window.NavigationRouter.selectNav('view-sales-register');
    }
    const payStatus = document.getElementById('sr-filter-pay-status');
    if (payStatus) {
      payStatus.value = 'RECEIVABLES';
    }
    if (window.SalesController) {
      window.SalesController.applyFilters();
    }
  };

  window.navigateToPayablePurchases = function() {
    if (window.NavigationRouter) {
      window.NavigationRouter.selectNav('view-purchase-register');
    }
    const payStatus = document.getElementById('pur-filter-pay-status');
    if (payStatus) {
      payStatus.value = 'PAYABLES';
    }
    if (window.PurchaseController) {
      window.PurchaseController.loadPurchases(0);
    }
  };

  window.navigateToAgingAnalysis = function() {
    if (window.NavigationRouter) {
      window.NavigationRouter.selectNav('view-aging-analysis');
    }
    if (window.FinanceController && window.FinanceController.loadAgingData) {
      window.FinanceController.loadAgingData();
    }
  };

  window.openNewPurchaseModal = function() {
    if (window.PurchaseController) window.PurchaseController.openPurchaseEditor();
    else if (window.NavigationRouter) window.NavigationRouter.selectNav('view-purchase-creation');
  };

  window.openNewCustomerModal = function() {
    if (window.PartyController) window.PartyController.openNewPartyModal('CUSTOMER');
    else if (window.NavigationRouter) window.NavigationRouter.selectNav('view-customers');
  };

  window.openNewSupplierModal = function() {
    if (window.PartyController) window.PartyController.openNewPartyModal('SUPPLIER');
    else if (window.NavigationRouter) window.NavigationRouter.selectNav('view-suppliers');
  };

  window.openNewQuotationModal = function() {
    if (window.QuotationController) window.QuotationController.openQuotationEditor();
    else if (window.NavigationRouter) window.NavigationRouter.selectNav('view-quotations');
  };

  window.openNewItemModal = function() {
    if (window.ItemMasterController) window.ItemMasterController.openNewItemModal();
    else if (window.NavigationRouter) window.NavigationRouter.selectNav('view-item-master');
  };

  window.openNewBankEntryModal = function() {
    if (window.NavigationRouter) window.NavigationRouter.selectNav('view-bank-entry');
    if (window.FinanceController) {
      window.FinanceController.loadBankMode();
      window.FinanceController.openNewBankEntry();
    }
  };

  window.openNewExpenseEntryModal = function() {
    if (window.NavigationRouter) window.NavigationRouter.selectNav('view-expense-entry');
    if (window.FinanceController) {
      window.FinanceController.loadExpenseMode();
      window.FinanceController.openNewExpenseEntry();
    }
  };

  async function pollShellCounts() {
    if (!window.AuthService || !window.AuthService.isAuthenticated()) {
      return; // Never poll backend counts when session is unauthenticated
    }
    try {
      const counts = await window.ApiService.get('/api/insights/shell-counts');
      if (counts) {
        const remEl = document.getElementById('badge-reminders');
        const notifEl = document.getElementById('badge-notifications');
        const mailEl = document.getElementById('badge-email');
        const waEl = document.getElementById('badge-whatsapp');

        if (remEl) {
          remEl.innerText = counts.reminders || 0;
          remEl.classList.toggle('zero', (counts.reminders || 0) === 0);
        }
        if (notifEl) {
          notifEl.innerText = counts.notifications || 0;
          notifEl.classList.toggle('zero', (counts.notifications || 0) === 0);
        }
        if (mailEl) {
          mailEl.innerText = counts.email || 0;
          mailEl.classList.toggle('zero', (counts.email || 0) === 0);
        }
        if (waEl) {
          waEl.innerText = counts.whatsapp || 0;
          waEl.classList.toggle('zero', (counts.whatsapp || 0) === 0);
        }
      }
    } catch (e) {
      console.warn('[App] Shell counts poll error:', e.message);
    }
  }

  return {
    async init() {
      startClock();
      setupEnvironment();
      setupAuthForms();
      syncFooterCompanyProfile();

      if (window.ShortcutManager) window.ShortcutManager.init();
      if (window.NavigationRouter) window.NavigationRouter.init();
      if (window.GlobalUiEnhancer) window.GlobalUiEnhancer.init();
      if (window.LabelIconEnhancer) window.LabelIconEnhancer.init();

      // Check current session
      const user = window.AuthService.getCurrentUser();
      applyUserToHeader(user);

      // Check saved theme
      const savedTheme = localStorage.getItem('dse_theme');
      if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        const icon = document.getElementById('theme-icon');
        const text = document.getElementById('theme-text');
        if (icon) icon.innerText = '☀️';
        if (text) text.innerText = 'Light';
      }

      // Initial shell counts poll and background timer only when session is authenticated
      if (window.AuthService.isAuthenticated()) {
        try {
          if (window.ApiService && window.FormatUtil) {
            const companySettings = await window.ApiService.get('/api/support/settings?prefix=company.');
            if (companySettings) {
              window.FormatUtil.setBusinessPolicy(
                companySettings['company.dateFormat'],
                companySettings['company.timeFormat'],
                companySettings['company.timeZone']
              );
            }
          }
        } catch (e) {
          console.warn('[App] Could not load company format policy on boot:', e.message);
        }
        await pollShellCounts();
        setInterval(pollShellCounts, 30000);
      }

      // Global click handler to close profile dropdown
      document.addEventListener('click', (e) => {
        const wrap = document.querySelector('.user-profile-wrap');
        const menu = document.getElementById('profile-dropdown-menu');
        if (wrap && menu && !wrap.contains(e.target)) {
          menu.style.display = 'none';
          menu.classList.remove('show');
        }
      });

      // Authentication check on startup
      if (!window.AuthService.isAuthenticated()) {
        this.showAuthOverlay();
      } else {
        // Initialize initial controller data with real backend
        await window.DashboardController.refresh();
        await window.ItemMasterController.loadItems();
        await window.ItemMasterController.loadInventory();
        await window.PartyController.loadCustomers();
        await window.PartyController.loadSuppliers();
      }
    },

    pollShellCounts() {
      return pollShellCounts();
    },

    toggleTheme() {
      const isLight = document.body.classList.toggle('light-theme');
      localStorage.setItem('dse_theme', isLight ? 'light' : 'dark');
      const icon = document.getElementById('theme-icon');
      const text = document.getElementById('theme-text');
      if (icon) icon.innerText = isLight ? '☀️' : '🌙';
      if (text) text.innerText = isLight ? 'Light' : 'Dark';
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      window.AppDialogService.showToast(`Switched to ${isLight ? 'Light' : 'Dark'} theme`, 'info');
    },

    showAuthOverlay(preferredTab) {
      document.documentElement.classList.add('auth-required');
      const auth = document.getElementById('auth-overlay');
      if (auth) {
        auth.style.display = 'flex';
        if (preferredTab) {
          this.showAuthTab(preferredTab);
        } else {
          this.showAuthTab('login');
        }
      }
    },

    hideAuthOverlay() {
      document.documentElement.classList.remove('auth-required');
      const auth = document.getElementById('auth-overlay');
      if (auth) auth.style.display = 'none';
    },

    showAuthTab(tab) {
      const tabLogin = document.getElementById('tab-login-btn');
      const tabReg = document.getElementById('tab-register-btn');
      const tabForgot = document.getElementById('tab-forgot-btn');
      if (tabLogin) tabLogin.classList.toggle('active', tab === 'login');
      if (tabReg) tabReg.classList.toggle('active', tab === 'register');
      if (tabForgot) tabForgot.classList.toggle('active', tab === 'forgot');

      const formLogin = document.getElementById('form-login');
      const formRegister = document.getElementById('form-register');
      const formForgot = document.getElementById('form-forgot');
      const formMfa = document.getElementById('form-mfa');
      const alertEl = document.getElementById('auth-alert');
      const cardTitle = document.getElementById('auth-card-title');
      const cardSub = document.getElementById('auth-card-subtitle');

      // Desktop parity: MFA is an in-place field within form-login, not a separate full screen
      if (formLogin) formLogin.style.display = (tab === 'login' || tab === 'mfa') ? 'block' : 'none';
      if (formRegister) formRegister.style.display = tab === 'register' ? 'block' : 'none';
      if (formForgot) formForgot.style.display = tab === 'forgot' ? 'block' : 'none';
      if (formMfa) formMfa.style.display = 'none';
      if (alertEl) alertEl.style.display = 'none';

      if (tab === 'login') {
        if (cardTitle) cardTitle.innerText = 'Sign in to your account';
        if (cardSub) cardSub.innerText = 'Role-aware secure access to Jasvi Industries';
        if (window.loadLoginRoles) window.loadLoginRoles();
        if (window.updateLoginMode) window.updateLoginMode();
        const identInput = document.getElementById('login-identity');
        if (identInput) setTimeout(() => identInput.focus(), 60);
      } else if (tab === 'register') {
        if (cardTitle) cardTitle.innerText = 'Create New Account';
        if (cardSub) cardSub.innerText = 'Non-Admin registration: CAPTCHA → Email OTP → Authenticator → Admin approval';
        if (window.refreshRegistrationCaptcha) window.refreshRegistrationCaptcha();
        if (window.loadRegistrationRoles) window.loadRegistrationRoles();
        const otpGroup = document.getElementById('reg-email-otp-group');
        const submitBtn = document.getElementById('btn-reg-submit');
        if (otpGroup) otpGroup.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'block';
        const regName = document.getElementById('reg-name');
        if (regName) setTimeout(() => regName.focus(), 60);
      } else if (tab === 'forgot') {
        if (cardTitle) cardTitle.innerText = 'Reset your password';
        if (cardSub) cardSub.innerText = 'Admin keeps the existing email-OTP recovery flow. Non-Admin users must also enter their current authenticator code.';
        const forgotIdent = document.getElementById('forgot-identity');
        if (forgotIdent) setTimeout(() => forgotIdent.focus(), 60);
      } else if (tab === 'mfa') {
        if (cardTitle) cardTitle.innerText = 'Sign in to your account';
        if (cardSub) cardSub.innerText = 'Role-aware secure access to Jasvi Industries';
        if (window.updateLoginMode) window.updateLoginMode();
        const mfaCodeInput = document.getElementById('login-mfa-code');
        if (mfaCodeInput) {
          mfaCodeInput.disabled = false;
          setTimeout(() => mfaCodeInput.focus(), 80);
        }
      }
    },

    cancelMfa() {
      window.AuthService.cancelMfa();
      this.showAuthTab('login');
    },

    async performLogout() {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playClose();
      await window.AuthService.logout();
      window.AppDialogService.showToast('Logged out of enterprise session.', 'info');
      this.showAuthOverlay();
    },

    applyUserToHeader(user) {
      if (window.applyUserToHeader) window.applyUserToHeader(user);
    }
  };
})();

// Helper functions for Authentication, Registration & MFA
let currentForgotChallengeId = null;
let currentRegistrationCaptchaId = null;
let currentRegistrationChallengeId = null;
let currentRegistrationId = null;
let currentRegistrationPending = null;
let currentMfaRecoveryChallengeId = null;
let pendingEnrollmentSetup = null;
let currentAuthenticatorSetupMode = 'login';

window.loadLoginRoles = async function() {
  const roleSelect = document.getElementById('login-role');
  if (!roleSelect) return;
  try {
    const roles = await window.AuthService.getLoginRoles();
    if (Array.isArray(roles) && roles.length > 0) {
      const current = roleSelect.value || 'ADMIN';
      roleSelect.innerHTML = roles.map(r => `<option value="${r.code}" ${r.code === current ? 'selected' : ''}>${r.displayName || r.code}</option>`).join('');
    }
  } catch (e) {
    console.warn('Could not load login roles:', e);
  }
  if (window.updateLoginMode) window.updateLoginMode();
};

/**
 * Desktop LoginController.java updateLoginMode() parity (lines 684-704):
 * Updates the visibility and enablement of the in-place Authenticator field and submit button text.
 */
window.updateLoginMode = function() {
  const roleSelect = document.getElementById('login-role');
  const role = ((roleSelect ? roleSelect.value : '') || '').toUpperCase();
  const roleRequiresOtp = !!role && role !== 'ADMIN';
  const mfaPending = !!(window.AuthService && window.AuthService.getPendingMfaChallenge());
  const hasEnrollment = !!pendingEnrollmentSetup;

  const mfaGroup = document.getElementById('login-mfa-group');
  const mfaCodeInput = document.getElementById('login-mfa-code');
  const getHelpBtn = document.getElementById('btn-login-get-help');
  const submitText = document.getElementById('btn-login-submit-text');
  const submitBtn = document.getElementById('btn-login-submit');

  if (mfaGroup) {
    const show = roleRequiresOtp || mfaPending;
    mfaGroup.style.display = show ? 'block' : 'none';
  }

  if (mfaCodeInput) {
    mfaCodeInput.disabled = !mfaPending;
    if (hasEnrollment) {
      mfaCodeInput.placeholder = 'Scan QR code, then enter 6-digit code';
    } else if (!mfaPending && roleRequiresOtp) {
      mfaCodeInput.placeholder = 'Authenticator code is required after password verification';
    } else {
      mfaCodeInput.placeholder = 'Enter current 6-digit authenticator code';
    }
  }

  if (getHelpBtn) {
    getHelpBtn.disabled = false;
  }

  const btnLabel = hasEnrollment ? 'SCAN QR & VERIFY' : (mfaPending ? 'VERIFY MFA' : '➜ LOGIN');
  if (submitText) {
    submitText.innerText = btnLabel;
  } else if (submitBtn && !submitBtn.disabled) {
    submitBtn.innerText = btnLabel;
  }
};

/**
 * Desktop LoginController.java resetPendingLogin() parity (lines 675-682):
 * Resets any active challenge and reverts the login form to initial credentials mode.
 */
window.resetPendingLogin = function() {
  if (window.AuthService && window.AuthService.cancelMfa) {
    window.AuthService.cancelMfa();
  }
  pendingEnrollmentSetup = null;
  const mfaCodeInput = document.getElementById('login-mfa-code');
  if (mfaCodeInput) {
    mfaCodeInput.value = '';
    mfaCodeInput.disabled = true;
  }
  const alertEl = document.getElementById('auth-alert');
  if (alertEl) {
    alertEl.style.display = 'none';
    alertEl.innerText = '';
  }
  window.updateLoginMode();
};

/**
 * Centralized post-login handler: persists credentials if remember-me is checked,
 * routes the user to their authorized landing view, and safely loads initial data
 * with permission guards so 403 Forbidden errors never trigger false auth failures.
 */
window.handlePostLoginSuccess = async function(user, remember, identity, selectedRole) {
  if (!user) return;
  const userRole = user.role || selectedRole || 'ADMIN';
  if (remember) {
    if (identity) localStorage.setItem('dse_saved_identity', identity);
    localStorage.setItem('dse_saved_role', userRole);
    localStorage.setItem('dse_remember_me', 'true');
  } else {
    localStorage.removeItem('dse_saved_identity');
    localStorage.removeItem('dse_saved_role');
    localStorage.removeItem('dse_remember_me');
  }

  const roleSelect = document.getElementById('login-role');
  if (roleSelect && user.role) {
    roleSelect.value = user.role;
  }

  pendingEnrollmentSetup = null;
  applyUserToHeader(user);
  if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
  window.App.hideAuthOverlay();
  window.AppDialogService.closeAllModals();
  window.AppDialogService.showToast(`Welcome back, ${user.fullName || user.username}!`, 'success');

  // Role-based landing navigation
  const normalizedRole = String(userRole || '').toUpperCase();
  if (window.NavigationRouter) {
    if (normalizedRole === 'ADMIN' || normalizedRole === 'MANAGER') {
      window.NavigationRouter.selectNav('view-dashboard');
    } else if (normalizedRole === 'SALES') {
      window.NavigationRouter.selectNav('view-sales-register');
    } else if (normalizedRole === 'PURCHASE') {
      window.NavigationRouter.selectNav('view-purchase-register');
    } else if (normalizedRole === 'STORE' || normalizedRole === 'STOREKEEPER' || normalizedRole === 'WAREHOUSE') {
      window.NavigationRouter.selectNav('view-item-master');
    } else if (normalizedRole === 'ACCOUNTANT' || normalizedRole === 'FINANCE') {
      window.NavigationRouter.selectNav('view-general-ledger');
    } else {
      window.NavigationRouter.selectNav('view-profile');
    }
  }

  // Synchronize company date/time policy into FormatUtil
  try {
    if (window.ApiService && window.FormatUtil) {
      const companySettings = await window.ApiService.get('/api/support/settings?prefix=company.');
      if (companySettings) {
        window.FormatUtil.setBusinessPolicy(
          companySettings['company.dateFormat'],
          companySettings['company.timeFormat'],
          companySettings['company.timeZone']
        );
      }
    }
  } catch (e) {
    console.warn('[App] Could not sync company format settings on login:', e.message);
  }

  // Safe guarded post-login pre-loading: never let 403 or network exceptions throw out of login!
  try {
    if (window.DashboardController && window.DashboardController.refresh && (normalizedRole === 'ADMIN' || normalizedRole === 'MANAGER')) {
      await window.DashboardController.refresh();
    }
  } catch (e) {
    console.warn('Dashboard pre-load skipped or unauthorized:', e.message);
  }
  try {
    if (window.ItemMasterController && window.ItemMasterController.loadItems) {
      await window.ItemMasterController.loadItems();
    }
  } catch (e) {
    console.warn('Item master pre-load skipped:', e.message);
  }
  try {
    if (window.PartyController && window.PartyController.loadCustomers) {
      await window.PartyController.loadCustomers();
    }
  } catch (e) {
    console.warn('Party pre-load skipped:', e.message);
  }
};

/**
 * Desktop LoginController.java login() parity (lines 273-346):
 * If an MFA challenge is already pending, submits the in-place Authenticator code.
 * Otherwise submits identity + password and activates the in-place MFA field without navigating away.
 */
window.handleLoginSubmit = async function(e) {
  if (e) e.preventDefault();
  const identity = ((document.getElementById('login-identity') || {}).value || '').trim();
  const password = ((document.getElementById('login-password') || {}).value || '');
  const selectedRole = (((document.getElementById('login-role') || {}).value || 'ADMIN')).toUpperCase();
  const rememberCheck = document.getElementById('login-remember');
  const alertEl = document.getElementById('auth-alert');
  const submitBtn = document.getElementById('btn-login-submit');
  const submitText = document.getElementById('btn-login-submit-text');
  const mfaCodeInput = document.getElementById('login-mfa-code');

  const pendingChallenge = window.AuthService && window.AuthService.getPendingMfaChallenge();

  // 1. If MFA challenge is pending: verify in-place authenticator code (Desktop verifyLoginOtp lines 466-499)
  if (pendingChallenge) {
    const otp = ((mfaCodeInput || {}).value || '').trim();
    if (pendingEnrollmentSetup && !otp) {
      window.openAuthenticatorSetupModal(pendingEnrollmentSetup, 'login');
      return;
    }
    if (!otp) {
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerText = pendingEnrollmentSetup
          ? 'Scan the QR code into your authenticator app, then enter the 6-digit code.'
          : 'Verification code is required.';
        alertEl.style.display = 'block';
      }
      if (mfaCodeInput) mfaCodeInput.focus();
      return;
    }
    if (!otp.match(/^\d{6}$/)) {
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerText = 'Enter the current 6-digit authenticator code.';
        alertEl.style.display = 'block';
      }
      if (mfaCodeInput) mfaCodeInput.focus();
      return;
    }

    submitBtn.disabled = true;
    if (submitText) submitText.innerText = 'VERIFYING...';
    try {
      const res = await window.AuthService.completeMfa(otp);
      if (res.success && res.user) {
        await window.handlePostLoginSuccess(res.user, rememberCheck ? rememberCheck.checked : false, identity, selectedRole);
      } else {
        if (alertEl) {
          alertEl.className = 'auth-alert error';
          alertEl.innerText = res.message || 'MFA verification failed.';
          alertEl.style.display = 'block';
        }
        if (mfaCodeInput) {
          mfaCodeInput.value = '';
          mfaCodeInput.focus();
        }
        if (res.message && res.message.toLowerCase().includes('locked')) {
          window.resetPendingLogin();
        }
      }
    } catch (err) {
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerText = err.message || 'MFA verification failed.';
        alertEl.style.display = 'block';
      }
      if (mfaCodeInput) mfaCodeInput.focus();
    } finally {
      submitBtn.disabled = false;
      window.updateLoginMode();
    }
    return;
  }

  // 2. Validate credentials
  if (!identity || !password) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = 'Please enter both email/username and password.';
      alertEl.style.display = 'block';
    }
    return;
  }

  submitBtn.disabled = true;
  if (submitText) submitText.innerText = 'SIGNING IN...';
  if (alertEl) alertEl.style.display = 'none';

  try {
    const res = await window.AuthService.login(identity, password, selectedRole);
    if (res.roleMismatch) {
      window.resetPendingLogin();
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerText = res.message || 'Selected role does not match this user account. Please select the role assigned to this account.';
        alertEl.style.display = 'block';
      }
      return;
    }

    if (res.mfaRequired) {
      window.AuthService.setPendingMfaChallenge(res.challengeId);
      pendingEnrollmentSetup = res.enrollmentRequired ? res.enrollment : null;

      if (res.enrollmentRequired && res.enrollment) {
        window.openAuthenticatorSetupModal(res.enrollment, 'login');
      } else {
        // Desktop parity: Stay in-place on the login form, activate the TOTP field, switch button to VERIFY MFA
        window.updateLoginMode();
        if (mfaCodeInput) {
          mfaCodeInput.value = '';
          mfaCodeInput.disabled = false;
          setTimeout(() => mfaCodeInput.focus(), 100);
        }
        if (alertEl) {
          const destination = res.maskedDestination || 'your authenticator app';
          alertEl.className = 'auth-alert info';
          alertEl.innerText = `Enter the current 6-digit code from ${destination}.`;
          alertEl.style.display = 'block';
        }
      }
      return;
    }

    if (res.success && res.user) {
      await window.handlePostLoginSuccess(res.user, rememberCheck ? rememberCheck.checked : false, identity, selectedRole);
    } else {
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerText = res.message || 'Invalid email/username or password.';
        alertEl.style.display = 'block';
      }
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = err.message || 'Authentication error. Please check server connection.';
      alertEl.style.display = 'block';
    }
  } finally {
    submitBtn.disabled = false;
    window.updateLoginMode();
  }
};

/**
 * Desktop LoginController.java resendLoginOtp() parity (lines 501-513):
 * 1. If enrollment setup is pending -> reopens QR/manual-key modal.
 * 2. If no active challenge -> opens modal-mfa-help-info explaining to sign in first or use Forgot Password.
 * 3. If challenge active -> opens modal-mfa-help-action with options to use code or Lost/Changed Phone.
 */
window.handleLoginGetHelp = function() {
  const pendingChallenge = window.AuthService && window.AuthService.getPendingMfaChallenge();
  if (pendingEnrollmentSetup && pendingChallenge) {
    window.openAuthenticatorSetupModal(pendingEnrollmentSetup, 'login');
    return;
  }
  if (!pendingChallenge) {
    window.AppDialogService.openModal('modal-mfa-help-info');
    return;
  }
  window.AppDialogService.openModal('modal-mfa-help-action');
};
window.showMfaHelp = window.handleLoginGetHelp;

/**
 * Desktop LoginController.java requestAuthenticatorRecovery() parity (lines 545-562):
 * Initiates registered-email recovery when user reports a lost or changed phone.
 */
window.startAuthenticatorRecovery = async function() {
  window.AppDialogService.closeModal('modal-mfa-help-action');
  const loginChallengeId = window.AuthService && window.AuthService.getPendingMfaChallenge();
  if (!loginChallengeId) {
    window.resetPendingLogin();
    window.AppDialogService.showToast('Sign in with your username/email and password again before resetting Authenticator.', 'warning');
    return;
  }

  window.AppDialogService.showToast('Sending verification code to registered email...', 'info');
  try {
    const res = await window.AuthService.requestLoginMfaRecovery();
    if (res && res.challengeId) {
      currentMfaRecoveryChallengeId = res.challengeId;
      const destText = document.getElementById('mfa-recovery-help-text');
      const destination = res.maskedDestination || 'your registered email';
      if (destText) {
        destText.innerText = (res.message || 'A verification code was sent') + ` (${destination}). Enter that code below. You will then receive a new QR code and setup key.`;
      }
      const otpIn = document.getElementById('mfa-recovery-email-otp');
      const errEl = document.getElementById('mfa-recovery-email-error');
      if (errEl) { errEl.style.display = 'none'; errEl.innerText = ''; }
      if (otpIn) {
        otpIn.value = '';
        setTimeout(() => otpIn.focus(), 120);
      }
      window.AppDialogService.openModal('modal-mfa-recovery-email');
    } else {
      window.AppDialogService.showToast((res && res.message) ? res.message : 'Unable to send recovery code.', 'error');
    }
  } catch (err) {
    window.AppDialogService.showToast('Authenticator recovery request failed: ' + (err.message || 'Unknown error'), 'error');
  }
};

/**
 * Desktop LoginController.java showAuthenticatorRecoveryEmail verify action parity (lines 594-627):
 * Submits the 6-digit email OTP to /api/auth/login/mfa/recovery/complete, resets the TOTP secret,
 * and opens the Authenticator Setup dialog with the newly generated QR code and manual key.
 */
window.submitMfaEmailRecovery = async function() {
  const otpIn = document.getElementById('mfa-recovery-email-otp');
  const errEl = document.getElementById('mfa-recovery-email-error');
  const btn = document.getElementById('btn-submit-mfa-recovery-email');
  const otp = ((otpIn || {}).value || '').trim();

  if (!otp || !otp.match(/^\d{6}$/)) {
    if (errEl) {
      errEl.innerText = 'Enter the 6-digit verification code sent to your registered email.';
      errEl.style.display = 'block';
    }
    if (otpIn) otpIn.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Verifying Email...';
  }

  try {
    const res = await window.AuthService.completeLoginMfaRecovery(currentMfaRecoveryChallengeId, otp);
    if (res && (res.challengeId || res.manualSecret)) {
      pendingEnrollmentSetup = res;
      if (res.challengeId) {
        window.AuthService.setPendingMfaChallenge(res.challengeId);
      }
      window.AppDialogService.closeModal('modal-mfa-recovery-email');
      window.updateLoginMode();
      window.openAuthenticatorSetupModal(res, 'login');
      window.AppDialogService.showToast('Email verified! Scan the new QR code in your authenticator app.', 'success');
    } else {
      if (errEl) {
        errEl.innerText = (res && res.message) ? res.message : 'Email verification failed.';
        errEl.style.display = 'block';
      }
      if (otpIn) otpIn.focus();
    }
  } catch (err) {
    if (errEl) {
      errEl.innerText = err.message || 'Email verification failed.';
      errEl.style.display = 'block';
    }
    if (otpIn) otpIn.focus();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Verify Email & Reset';
    }
  }
};

/**
 * Modal opener for Authenticator Setup supporting both Login Re-enrollment and Registration.
 */
window.openAuthenticatorSetupModal = function(setup, mode = 'login') {
  currentAuthenticatorSetupMode = mode;
  const secretEl = document.getElementById('auth-setup-secret');
  const qrImgEl = document.getElementById('auth-setup-qr-img');
  const totpEl = document.getElementById('auth-setup-totp');
  const errEl = document.getElementById('auth-setup-error');
  const btnEl = document.getElementById('btn-auth-setup-complete');
  const titleEl = document.getElementById('auth-setup-modal-title');
  const subEl = document.getElementById('auth-setup-modal-subtitle');

  if (secretEl) secretEl.value = setup.manualSecret || '';
  if (qrImgEl && setup.provisioningUri) {
    qrImgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setup.provisioningUri)}`;
  }
  if (totpEl) {
    totpEl.value = '';
    setTimeout(() => totpEl.focus(), 150);
  }
  if (errEl) {
    errEl.style.display = 'none';
    errEl.innerText = '';
  }

  if (mode === 'login') {
    if (titleEl) titleEl.innerHTML = '&#128737; Secure this account with an authenticator';
    if (subEl) subEl.innerText = setup.message || 'Scan the QR code with Google or Microsoft Authenticator, then enter the current 6-digit code.';
    if (btnEl) {
      btnEl.innerText = 'Verify & Continue Sign-In';
      btnEl.onclick = () => window.submitLoginAuthenticatorSetup();
    }
  } else {
    if (titleEl) titleEl.innerHTML = '&#128272; Set Up Authenticator';
    if (subEl) subEl.innerText = 'Scan with Google Authenticator or Microsoft Authenticator';
    if (btnEl) {
      btnEl.innerText = 'Verify & Submit for Approval';
      btnEl.onclick = () => window.completeRegistrationAuthenticator();
    }
  }
  window.AppDialogService.openModal('modal-authenticator-setup');
};

/**
 * Desktop LoginController.java showAuthenticatorEnrollment verify action parity (lines 426-453):
 * Verifies the newly scanned TOTP code and logs the user in immediately.
 */
window.submitLoginAuthenticatorSetup = async function() {
  const totpEl = document.getElementById('auth-setup-totp');
  const errEl = document.getElementById('auth-setup-error');
  const btnEl = document.getElementById('btn-auth-setup-complete');
  const otp = (totpEl ? totpEl.value : '').trim();

  if (!otp || !otp.match(/^\d{6}$/)) {
    if (errEl) {
      errEl.innerText = 'Enter the current 6-digit authenticator code.';
      errEl.style.display = 'block';
    }
    if (totpEl) totpEl.focus();
    return;
  }

  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerText = 'Verifying Authenticator...';
  }

  try {
    const res = await window.AuthService.completeMfa(otp);
    if (res.success && res.user) {
      window.AppDialogService.closeModal('modal-authenticator-setup');
      const rememberCheck = document.getElementById('login-remember');
      const identity = document.getElementById('login-identity')?.value?.trim();
      const selectedRole = document.getElementById('login-role')?.value;
      await window.handlePostLoginSuccess(res.user, rememberCheck ? rememberCheck.checked : false, identity, selectedRole);
    } else {
      if (errEl) {
        errEl.innerText = res.message || 'Authenticator verification failed.';
        errEl.style.display = 'block';
      }
      if (totpEl) totpEl.focus();
    }
  } catch (err) {
    if (errEl) {
      errEl.innerText = err.message || 'Authenticator verification failed.';
      errEl.style.display = 'block';
    }
    if (totpEl) totpEl.focus();
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerText = 'Verify & Continue Sign-In';
    }
  }
};

/**
 * Desktop LoginController.java dlg.setOnHidden parity (lines 454-461):
 * If setup modal is closed before completing verification, reminds user that Get Help can reopen it.
 */
window.handleAuthenticatorSetupClose = function() {
  window.AppDialogService.closeModal('modal-authenticator-setup');
  if (currentAuthenticatorSetupMode === 'login' && window.AuthService && window.AuthService.getPendingMfaChallenge()) {
    window.updateLoginMode();
    window.AppDialogService.showToast('Authenticator enrollment is not complete. Click Get Help to reopen the QR code and setup key.', 'info');
  } else if (currentAuthenticatorSetupMode === 'registration') {
    window.AppDialogService.showToast('Authenticator configuration is required to submit your registration for Admin approval.', 'warning');
  }
};

window.handleMfaSubmit = window.handleLoginSubmit;
window.cancelMfa = window.resetPendingLogin;

window.refreshRegistrationCaptcha = async function() {
  const qEl = document.getElementById('reg-captcha-question');
  const aEl = document.getElementById('reg-captcha-answer');
  if (qEl) qEl.innerText = 'Fetching challenge...';
  if (aEl) aEl.value = '';
  try {
    const res = await window.AuthService.getRegistrationCaptcha();
    if (res && res.challengeId) {
      currentRegistrationCaptchaId = res.challengeId;
      if (qEl) qEl.innerText = res.question || 'What is 5 + 7?';
    }
  } catch (err) {
    if (qEl) qEl.innerText = 'What is 10 + 5?';
    console.warn('Captcha API error:', err);
  }
};

window.loadRegistrationRoles = async function() {
  const roleEl = document.getElementById('reg-role');
  if (!roleEl) return;
  try {
    const roles = await window.AuthService.getRegistrationRoles();
    if (Array.isArray(roles) && roles.length > 0) {
      roleEl.innerHTML = roles.map(r => `<option value="${r.code}">${r.displayName || r.code}</option>`).join('');
    }
  } catch (err) {
    console.warn('Registration roles error:', err);
  }
};

window.handleRegisterSubmit = async function(e) {
  if (e) e.preventDefault();
  const name = ((document.getElementById('reg-name') || {}).value || '').trim();
  const username = ((document.getElementById('reg-username') || {}).value || '').trim();
  const email = ((document.getElementById('reg-email') || {}).value || '').trim();
  const role = ((document.getElementById('reg-role') || {}).value || 'Sales').trim();
  const password = (document.getElementById('reg-password') || {}).value;
  const confirm = (document.getElementById('reg-confirm') || {}).value;
  const captchaAnswer = ((document.getElementById('reg-captcha-answer') || {}).value || '').trim();
  const alertEl = document.getElementById('auth-alert');
  const btn = document.getElementById('btn-reg-submit');

  if (!name || !username || !email || !password || !confirm) {
    alertEl.className = 'auth-alert error';
    alertEl.innerText = 'Please complete all required fields.';
    alertEl.style.display = 'block';
    return;
  }

  if (password !== confirm) {
    alertEl.className = 'auth-alert error';
    alertEl.innerText = 'Passwords do not match. Please re-enter.';
    alertEl.style.display = 'block';
    return;
  }

  if (!captchaAnswer) {
    alertEl.className = 'auth-alert error';
    alertEl.innerText = 'Security CAPTCHA calculation answer is required.';
    alertEl.style.display = 'block';
    return;
  }

  if (!currentRegistrationCaptchaId) {
    alertEl.className = 'auth-alert error';
    alertEl.innerText = 'Security CAPTCHA challenge is loading. Please wait or refresh the challenge.';
    alertEl.style.display = 'block';
    window.refreshRegistrationCaptcha();
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Sending email OTP...';
  alertEl.style.display = 'none';

  try {
    currentRegistrationPending = { username, fullName: name, email, role, password };
    const payload = {
      username,
      fullName: name,
      email,
      role,
      mfaEnabled: true,
      captchaChallengeId: currentRegistrationCaptchaId,
      captchaAnswer
    };
    const res = await window.AuthService.requestRegistrationOtp(payload);
    if (res.success || res.challengeId) {
      currentRegistrationChallengeId = res.challengeId;
      document.getElementById('reg-email-otp-group').style.display = 'block';
      document.getElementById('btn-reg-submit').style.display = 'none';
      document.getElementById('reg-email-otp').focus();
      alertEl.className = 'auth-alert success';
      alertEl.innerText = res.message ? `${res.message}. Enter the OTP below.` : 'Verification code sent to your registered email! Enter the 6-digit OTP below.';
      alertEl.style.display = 'block';
    } else {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = res.message || 'Unable to request registration OTP.';
      alertEl.style.display = 'block';
      window.refreshRegistrationCaptcha();
    }
  } catch (err) {
    alertEl.className = 'auth-alert error';
    alertEl.innerText = err.message || 'Error processing registration.';
    alertEl.style.display = 'block';
    window.refreshRegistrationCaptcha();
  } finally {
    btn.disabled = false;
    btn.innerText = 'Send Email Verification Code';
  }
};

window.handleVerifyRegistrationEmail = async function() {
  const otp = ((document.getElementById('reg-email-otp') || {}).value || '').trim();
  const alertEl = document.getElementById('auth-alert');
  const btn = document.getElementById('btn-reg-verify-otp');

  if (!otp || !otp.match(/^\d{6}$/)) {
    alertEl.className = 'auth-alert error';
    alertEl.innerText = 'Please enter the valid 6-digit email OTP.';
    alertEl.style.display = 'block';
    return;
  }

  if (!currentRegistrationPending || !currentRegistrationChallengeId) {
    alertEl.className = 'auth-alert error';
    alertEl.innerText = 'Please complete CAPTCHA and send email OTP first.';
    alertEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Verifying email...';

  try {
    const payload = {
      challengeId: currentRegistrationChallengeId,
      otp,
      username: currentRegistrationPending.username,
      password: currentRegistrationPending.password,
      fullName: currentRegistrationPending.fullName,
      email: currentRegistrationPending.email,
      role: currentRegistrationPending.role,
      mfaEnabled: true
    };
    const res = await window.AuthService.verifyRegistrationEmail(payload);
    if (res && (res.registrationId || res.manualSecret)) {
      currentRegistrationId = res.registrationId;

      alertEl.className = 'auth-alert success';
      alertEl.innerText = '✓ Email verified! Please scan the QR code to configure your Authenticator app and complete enrollment.';
      alertEl.style.display = 'block';

      if (window.openAuthenticatorSetupModal) {
        window.openAuthenticatorSetupModal(res, 'registration');
      } else {
        const secretEl = document.getElementById('auth-setup-secret');
        const qrImgEl = document.getElementById('auth-setup-qr-img');
        const errEl = document.getElementById('auth-setup-error');
        if (secretEl) secretEl.value = res.manualSecret || '';
        if (qrImgEl && res.provisioningUri) {
          qrImgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(res.provisioningUri)}`;
        }
        if (errEl) errEl.style.display = 'none';
        window.AppDialogService.openModal('modal-authenticator-setup');
      }
      setTimeout(() => {
        const totpIn = document.getElementById('auth-setup-totp');
        if (totpIn) { totpIn.value = ''; totpIn.focus(); }
      }, 100);
    } else {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = res.message || 'Email OTP verification failed.';
      alertEl.style.display = 'block';
    }
  } catch (err) {
    alertEl.className = 'auth-alert error';
    alertEl.innerText = err.message || 'Error verifying email OTP.';
    alertEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerText = 'Verify Email & Configure Authenticator';
  }
};

window.copyAuthenticatorSecret = function() {
  const secretEl = document.getElementById('auth-setup-secret');
  if (secretEl && secretEl.value) {
    navigator.clipboard.writeText(secretEl.value);
    window.AppDialogService.showToast('Authenticator secret key copied to clipboard', 'info');
  }
};

window.completeRegistrationAuthenticator = async function() {
  const totp = ((document.getElementById('auth-setup-totp') || {}).value || '').trim();
  const errEl = document.getElementById('auth-setup-error');
  const btn = document.getElementById('btn-auth-setup-complete');

  if (!totp || !totp.match(/^\d{6}$/)) {
    if (errEl) {
      errEl.innerText = 'Enter the current 6-digit authenticator code.';
      errEl.style.display = 'block';
    }
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Verifying Authenticator...';
  if (errEl) errEl.style.display = 'none';

  try {
    if (window.currentMfaEnrollmentMode === 'login') {
      const res = await window.AuthService.completeMfa(totp);
      if (res.success && res.user) {
        window.AppDialogService.closeModal('modal-authenticator-setup');
        window.currentMfaEnrollmentMode = null;
        const rememberCheck = document.getElementById('login-remember');
        const identity = document.getElementById('login-identity')?.value?.trim();
        const selectedRole = document.getElementById('login-role')?.value;
        await window.handlePostLoginSuccess(res.user, rememberCheck ? rememberCheck.checked : false, identity, selectedRole);
        return;
      } else {
        if (errEl) {
          errEl.innerText = res.message || 'Authenticator verification failed.';
          errEl.style.display = 'block';
        }
        return;
      }
    }

    const res = await window.AuthService.completeRegistrationMfa({
      registrationId: currentRegistrationId,
      otp: totp
    });

    if (res.success || !res.message || res.message.toLowerCase().includes('pending') || res.message.toLowerCase().includes('success')) {
      window.AppDialogService.closeModal('modal-authenticator-setup');
      window.App.showAuthTab('login');
      const alertEl = document.getElementById('auth-alert');
      if (alertEl) {
        alertEl.className = 'auth-alert success';
        alertEl.innerText = '✓ Registration submitted successfully. Your account is pending Administrator approval before sign-in.';
        alertEl.style.display = 'block';
      }
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast('Registration pending Admin approval', 'info');
    } else {
      if (errEl) {
        errEl.innerText = res.message || 'Authenticator verification failed.';
        errEl.style.display = 'block';
      }
    }
  } catch (err) {
    if (errEl) {
      errEl.innerText = err.message || 'Authenticator verification error.';
      errEl.style.display = 'block';
    }
  } finally {
    btn.disabled = false;
    btn.innerText = window.currentMfaEnrollmentMode === 'login' ? 'Verify MFA Code' : 'Verify & Submit for Approval';
  }
};

window.requestPasswordResetOtp = async function() {
  const identity = ((document.getElementById('forgot-identity') || {}).value || '').trim();
  const alertEl = document.getElementById('auth-alert');
  const btn = document.getElementById('btn-forgot-request-otp');
  if (!identity) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = 'Email or username is required.';
      alertEl.style.display = 'block';
    }
    return;
  }
  btn.disabled = true;
  btn.innerText = 'Sending reset code...';
  if (alertEl) alertEl.style.display = 'none';
  try {
    const res = await window.AuthService.requestPasswordReset(identity);
    if (res.success || res.challengeId) {
      currentForgotChallengeId = res.challengeId;
      const otpIn = document.getElementById('forgot-otp');
      if (otpIn) otpIn.focus();
      if (alertEl) {
        alertEl.className = 'auth-alert success';
        alertEl.innerText = (res.message || 'Verification code sent to registered email') + '. Enter code and new password below.';
        alertEl.style.display = 'block';
      }
      window.AppDialogService.showToast('Reset verification code sent.', 'info');
    } else {
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerText = res.message || 'Unable to send reset code.';
        alertEl.style.display = 'block';
      }
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = 'Unable to send reset code: ' + (err.message || 'Unknown error');
      alertEl.style.display = 'block';
    }
  } finally {
    btn.disabled = false;
    btn.innerText = '✉ SEND RESET CODE';
  }
};

window.handleForgotPasswordSubmit = async function(e) {
  if (e) e.preventDefault();
  const alertEl = document.getElementById('auth-alert');
  const btn = document.getElementById('btn-forgot-complete');

  if (!currentForgotChallengeId) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = 'Send a password reset code first.';
      alertEl.style.display = 'block';
    }
    const identIn = document.getElementById('forgot-identity');
    if (identIn) identIn.focus();
    return;
  }

  const identity = ((document.getElementById('forgot-identity') || {}).value || '').trim();
  const otp = ((document.getElementById('forgot-otp') || {}).value || '').trim();
  const totp = ((document.getElementById('forgot-authenticator') || {}).value || '').trim();
  const pwd = ((document.getElementById('forgot-new-pwd') || {}).value || '');
  const confirmPwd = ((document.getElementById('forgot-confirm-pwd') || {}).value || '');

  if (!otp) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = 'Reset code is required.';
      alertEl.style.display = 'block';
    }
    const otpIn = document.getElementById('forgot-otp');
    if (otpIn) otpIn.focus();
    return;
  }

  // Desktop validation parity (LoginController.java line 756-759: 8+ chars with letter and number)
  if (pwd.length < 8 || !/[A-Za-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = 'Use 8+ characters with a letter and number.';
      alertEl.style.display = 'block';
    }
    const pwdIn = document.getElementById('forgot-new-pwd');
    if (pwdIn) pwdIn.focus();
    return;
  }

  if (pwd !== confirmPwd) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = 'Passwords do not match.';
      alertEl.style.display = 'block';
    }
    const cnfIn = document.getElementById('forgot-confirm-pwd');
    if (cnfIn) cnfIn.focus();
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Updating password...';
  if (alertEl) alertEl.style.display = 'none';

  try {
    const res = await window.AuthService.completePasswordReset(currentForgotChallengeId, otp, totp, pwd);
    if (res.success) {
      currentForgotChallengeId = null;
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast('Password updated successfully! Sign in with your new password.', 'success');
      window.App.showAuthTab('login');
      const loginIdent = document.getElementById('login-identity');
      const loginPwd = document.getElementById('login-password');
      if (loginIdent && identity) loginIdent.value = identity;
      if (loginPwd) { loginPwd.value = ''; loginPwd.focus(); }
      const loginAlert = document.getElementById('auth-alert');
      if (loginAlert) {
        loginAlert.className = 'auth-alert success';
        loginAlert.innerText = 'Password updated successfully. Sign in with your new password.';
        loginAlert.style.display = 'block';
      }
    } else {
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerText = res.message || 'Unable to update password.';
        alertEl.style.display = 'block';
      }
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = 'Unable to update password: ' + (err.message || 'Unknown error');
      alertEl.style.display = 'block';
    }
  } finally {
    btn.disabled = false;
    btn.innerText = '🔑 RESET PASSWORD';
  }
};

window.handleChangePasswordSubmit = async function(e) {
  e.preventDefault();
  const cur = document.getElementById('chg-current-pwd').value;
  const nw = document.getElementById('chg-new-pwd').value;
  const cnf = document.getElementById('chg-confirm-pwd').value;
  if (nw !== cnf) {
    window.AppDialogService.showToast('New passwords do not match.', 'error');
    return;
  }
  try {
    const res = await window.AuthService.changePassword(cur, nw);
    if (res.success) {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast('Password updated successfully!', 'success');
      window.AppDialogService.closeModal('modal-change-password');
      document.getElementById('form-change-password').reset();
    } else {
      window.AppDialogService.showToast(res.message || 'Current password incorrect.', 'error');
    }
  } catch (err) {
    window.AppDialogService.showToast(err.message || 'Error updating password.', 'error');
  }
};

window.toggleUserProfileDropdown = function(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('profile-dropdown-menu');
  if (!menu) return;
  const isShown = menu.style.display === 'block' || menu.classList.contains('show');
  if (isShown) {
    menu.style.display = 'none';
    menu.classList.remove('show');
  } else {
    menu.style.display = 'block';
    menu.classList.add('show');
  }
};

window.hideProfileDropdown = function() {
  const menu = document.getElementById('profile-dropdown-menu');
  if (menu) {
    menu.style.display = 'none';
    menu.classList.remove('show');
  }
};

window.openMyProfileModal = function() {
  hideProfileDropdown();
  const u = window.AuthService.getCurrentUser() || { username: 'admin', fullName: 'Shailesh Dhameliya', role: 'ADMIN' };
  document.getElementById('profile-full-name').innerText = u.fullName || u.username;
  document.getElementById('profile-role-badge').innerText = (u.role || 'USER').toUpperCase();
  document.getElementById('profile-username').innerText = u.username || 'admin';
  document.getElementById('profile-email').innerText = u.email || `${u.username}@jasviindustries.in`;
  document.getElementById('profile-avatar-large').innerText = (u.fullName || u.username || 'U')[0].toUpperCase();
  window.AppDialogService.openModal('modal-my-profile');
};

window.openChangePasswordModal = function() {
  window.AppDialogService.openModal('modal-change-password');
};

window.openNotificationsModal = function() {
  window.AppDialogService.openModal('modal-notifications-center');
};

// Global MVC Controller Facades (100% Backward Compatibility with Desktop UI Event Bindings)
window.selectNav = (id) => window.NavigationRouter.selectNav(id);
window.toggleNavGroup = (id) => window.NavigationRouter.toggleNavGroup(id);
window.openModal = (id) => window.AppDialogService.openModal(id);
window.closeModal = (id) => window.AppDialogService.closeModal(id);
window.showToast = (msg, type) => window.AppDialogService.showToast(msg, type);
window.showAuthOverlay = (tab) => window.App.showAuthOverlay(tab);
window.hideAuthOverlay = () => window.App.hideAuthOverlay();
window.showAuthTab = (tab) => window.App.showAuthTab(tab);
window.cancelMfa = () => window.App.cancelMfa();
window.performLogout = () => window.App.performLogout();
window.togglePasswordVisibility = function(fieldId, btnEl) {
  const f = document.getElementById(fieldId);
  if (!f) return;
  if (f.type === 'password') {
    f.type = 'text';
    if (btnEl) btnEl.innerText = '🙈';
  } else {
    f.type = 'password';
    if (btnEl) btnEl.innerText = '👁';
  }
};
window.showMfaHelp = () => window.handleLoginGetHelp();
window.openNewInvoiceModal = () => {
  if (window.SalesController && window.SalesController.openSaleEditorTab) {
    window.SalesController.openSaleEditorTab();
  } else if (window.NavigationRouter) {
    window.NavigationRouter.selectNav('view-sale-create');
  }
};
window.openNewPurchaseModal = () => {
  if (window.PurchaseController && window.PurchaseController.openPurchaseEditor) {
    window.PurchaseController.openPurchaseEditor();
  } else if (window.NavigationRouter) {
    window.NavigationRouter.selectNav('view-purchase-creation');
  }
};
window.openNewItemModal = () => {
  if (window.ItemMasterController && window.ItemMasterController.openNewItemModal) {
    window.ItemMasterController.openNewItemModal();
  } else if (window.NavigationRouter) {
    window.NavigationRouter.selectNav('view-item-master');
  }
};
window.openNewCustomerModal = () => {
  if (window.PartyController && window.PartyController.openNewPartyModal) {
    window.PartyController.openNewPartyModal('CUSTOMER');
  } else if (window.NavigationRouter) {
    window.NavigationRouter.selectNav('view-customers');
  }
};
window.openNewSupplierModal = () => {
  if (window.PartyController && window.PartyController.openNewPartyModal) {
    window.PartyController.openNewPartyModal('SUPPLIER');
  } else if (window.NavigationRouter) {
    window.NavigationRouter.selectNav('view-suppliers');
  }
};
window.openNewQuotationModal = () => {
  if (window.QuotationController && window.QuotationController.openQuotationEditor) {
    window.QuotationController.openQuotationEditor();
  } else if (window.NavigationRouter) {
    window.NavigationRouter.selectNav('view-quotations');
  }
};
window.openNewBankEntryModal = () => {
  if (window.NavigationRouter) {
    window.NavigationRouter.selectNav('view-bank-entry');
    if (window.FinanceController && window.FinanceController.loadBankMode) {
      window.FinanceController.loadBankMode();
    }
  }
};
window.openNewExpenseEntryModal = () => {
  if (window.NavigationRouter) {
    window.NavigationRouter.selectNav('view-expense-entry');
    if (window.FinanceController && window.FinanceController.loadExpenseMode) {
      window.FinanceController.loadExpenseMode();
    }
  }
};
window.openNewUserModal = () => window.UserAccessController.openNewUserModal();
window.openShortcutsHelpModal = () => window.AppDialogService.openModal('modal-shortcuts-help');
window.triggerImmediateBackup = () => window.SettingsController.triggerImmediateBackup();
window.generateBarcode = () => window.BarcodeStudioController.generateBarcode();
window.printBarcode = () => window.BarcodeStudioController.printBarcode();
window.refreshDashboardData = () => window.DashboardController.refresh();
window.loadSalesData = () => window.SalesController.loadSales();
window.loadPurchasesData = () => window.PurchaseController.loadPurchases();
window.loadItemsData = () => { window.ItemMasterController.loadItems(); window.ItemMasterController.loadInventory(); };
window.loadCustomersData = () => window.PartyController.loadCustomers();
window.loadSuppliersData = () => window.PartyController.loadSuppliers();
window.loadUsersData = () => window.UserAccessController.loadUsers();
window.loadAuditTrail = () => window.UserAccessController.loadAudit();
window.filterSalesTable = (q) => window.SalesController.filterSales(q);
window.filterItemsTable = (q) => window.ItemMasterController.filterItems(q);
window.filterCustomersTable = (q) => {
  const tbody = document.getElementById('customers-table-tbody');
  if (!tbody || !window.PartyController.customersCache) return;
  const qClean = (q || '').toLowerCase();
  const filtered = window.PartyController.customersCache.filter(c =>
    (c.partyCode || c.code || '').toLowerCase().includes(qClean) ||
    (c.name || c.partyName || '').toLowerCase().includes(qClean)
  );
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">No matching customers.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td style="font-weight:700; color:var(--cyan);">${c.partyCode || c.code || '-'}</td>
      <td style="font-weight:600;">${c.name || c.partyName || '-'}</td>
      <td>${c.gstin || '-'}</td>
      <td>${c.phone || '-'}</td>
      <td>${c.address || c.city || 'Gujarat'}</td>
      <td>${window.FormatUtil.formatRupees(c.openingBalance || c.creditLimit || 50000)}</td>
      <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:0.7rem;">Profile</button></td>
    </tr>
  `).join('');
};
window.filterSuppliersTable = (q) => {
  const tbody = document.getElementById('suppliers-table-tbody');
  if (!tbody || !window.PartyController.suppliersCache) return;
  const qClean = (q || '').toLowerCase();
  const filtered = window.PartyController.suppliersCache.filter(s =>
    (s.partyCode || s.code || '').toLowerCase().includes(qClean) ||
    (s.name || s.partyName || '').toLowerCase().includes(qClean)
  );
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim);">No matching suppliers.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td style="font-weight:700; color:var(--cyan);">${s.partyCode || s.code || '-'}</td>
      <td style="font-weight:600;">${s.name || s.partyName || '-'}</td>
      <td>${s.gstin || '-'}</td>
      <td>${s.phone || '-'}</td>
      <td>${s.bankName || s.bankDetails || 'State Bank of India'}</td>
      <td>${s.accountNo || 'XXXX1234'}</td>
      <td>${s.ifsc || 'SBIN0001234'}</td>
      <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:0.7rem;">Ledger</button></td>
    </tr>
  `).join('');
};
window.handleInvoiceSave = (e) => window.SalesController.handleInvoiceSave(e);
window.handlePurchaseSave = (e) => window.PurchaseController.handlePurchaseSave(e);
window.handleItemSave = (e) => window.ItemMasterController.handleItemSave(e);
window.handleCustomerSave = (e) => window.PartyController.handleCustomerSave(e);
window.handleSupplierSave = (e) => window.PartyController.handleSupplierSave(e);
window.handleBankEntrySave = (e) => window.FinanceController.handleBankEntrySave(e);
window.handleExpenseSave = (e) => window.FinanceController.handleExpenseSave(e);
window.handleUserSave = (e) => window.UserAccessController.handleUserSave(e);
window.handlePasswordChange = (e) => window.SettingsController.handlePasswordChange(e);

// Phase 2, 3 & 4 Extended Facades
window.addInvoiceItemRow = () => window.SalesController.addInvoiceItemRow();
window.addPurchaseItemRow = () => window.PurchaseController.addPurchaseItemRow();
window.filterPurchasesTable = (q) => window.PurchaseController.filterPurchases(q);
window.openInvoiceDrawer = (invNo) => window.SalesController.openInvoiceDrawer(invNo);
window.closeInvoiceDrawer = () => window.SalesController.closeInvoiceDrawer();
window.openPurchaseDrawer = (billNo) => window.PurchaseController.openPurchaseDrawer(billNo);
window.closePurchaseDrawer = () => window.PurchaseController.closePurchaseDrawer();
window.printTaxInvoice = (invNo) => window.SalesController.printTaxInvoice(invNo);

window.openStockAdjustmentModal = (code) => window.ItemMasterController.openStockAdjustmentModal(code);
window.handleStockAdjustmentSave = (e) => window.ItemMasterController.handleStockAdjustmentSave(e);

window.loadFinanceData = () => window.FinanceController.loadFinance();
window.loadFinancialStatements = () => window.FinanceController.loadFinancialStatements();
window.loadAgingData = () => window.FinanceController.loadAgingData();

window.loadGstData = () => window.GstController.loadGstData();
window.exportGstr1Json = () => window.GstController.exportGstr1Json();
window.loadEWayBills = () => window.EWayBillController.loadEWayBills();
window.openGenerateEWayModal = (invNo) => window.EWayBillController.openGenerateEWayModal(invNo);
window.handleGenerateEWayBill = (e) => window.EWayBillController.handleGenerateEWayBill(e);
window.printBarcodeStickers = () => window.BarcodeStudioController.printBarcode();

window.openInvoicePaymentDetails = function(type, id, invoiceNo, partyName, total, paid, balance, extraDetails) {
  if (window.RecordPaymentController && window.RecordPaymentController.open) {
    window.RecordPaymentController.open(type, id, invoiceNo, partyName, total, paid, balance, extraDetails);
  } else if (window.NavigationRouter) {
    window.NavigationRouter.selectNav('view-record-payment');
  }
};

// Bootstrap on window load
window.addEventListener('load', () => {
  window.App.init();
});
