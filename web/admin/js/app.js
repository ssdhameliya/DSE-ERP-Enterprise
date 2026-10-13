/**
 * Jasvi Industries ERP - App Bootstrap
 * Enterprise MVC Application Lifecycle Manager matching desktop App and Main Stage
 */
window.App = (function() {
  function startClock() {
    function tick() {
      const now = new Date();
      const el = document.getElementById('clock-display');
      if (el) {
        el.innerText = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
      }
      const footerClock = document.getElementById('footer-live-clock');
      const authFooterClock = document.getElementById('auth-footer-clock');
      if (footerClock || authFooterClock) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const day = days[now.getDay()];
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
        const clockText = `${day}, ${d}/${m}/${y} | ${timeStr} | IST`;
        if (footerClock) footerClock.innerText = `📅 ${clockText}`;
        if (authFooterClock) authFooterClock.innerText = `📅 ${clockText}`;
      }
    }
    tick();
    setInterval(tick, 1000);
  }

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

  function applyUserToHeader(user) {
    if (!user) return;
    const nameEl = document.getElementById('header-user-name');
    const roleEl = document.getElementById('header-user-role');
    const avatarEl = document.getElementById('header-user-avatar');
    if (nameEl) nameEl.innerText = user.fullName || user.username || 'User';
    if (roleEl) roleEl.innerText = (user.role || 'USER').toUpperCase();
    if (avatarEl) avatarEl.innerText = (user.fullName || user.username || 'U')[0].toUpperCase();
  }

  function setupAuthForms() {
    populateLoginRoles();

    const loginRole = document.getElementById('login-role');
    const mfaGroup = document.getElementById('login-mfa-group');
    if (loginRole && mfaGroup) {
      loginRole.addEventListener('change', () => {
        mfaGroup.style.display = (loginRole.value !== 'ADMIN') ? 'block' : 'none';
      });
    }

    // Login form submit
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identity = document.getElementById('login-identity').value.trim();
        const password = document.getElementById('login-password').value;
        const selectedRole = (document.getElementById('login-role') || {}).value || 'ADMIN';
        const rememberCheck = document.getElementById('login-remember');
        const alertEl = document.getElementById('auth-alert');
        const submitBtn = document.getElementById('btn-login-submit');

        submitBtn.disabled = true;
        submitBtn.innerText = 'Verifying credentials...';
        alertEl.style.display = 'none';

        try {
          const res = await window.AuthService.login(identity, password, selectedRole);
          if (res.roleMismatch) {
            alertEl.className = 'auth-alert error';
            alertEl.innerText = res.message;
            alertEl.style.display = 'block';
            return;
          }
          if (res.mfaRequired) {
            document.getElementById('form-login').style.display = 'none';
            document.getElementById('form-mfa').style.display = 'block';
            document.getElementById('mfa-otp').focus();
          } else if (res.success) {
            if (rememberCheck && rememberCheck.checked) {
              localStorage.setItem('dse_saved_identity', identity);
              localStorage.setItem('dse_saved_role', selectedRole);
            } else {
              localStorage.removeItem('dse_saved_identity');
              localStorage.removeItem('dse_saved_role');
            }
            applyUserToHeader(res.user);
            if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
            window.AppDialogService.closeAllModals();
            window.AppDialogService.showToast(`Welcome back, ${res.user.fullName || res.user.username}!`, 'success');
            window.DashboardController.refresh();
          } else {
            alertEl.className = 'auth-alert error';
            alertEl.innerText = res.message || 'Invalid credentials.';
            alertEl.style.display = 'block';
          }
        } catch (err) {
          alertEl.className = 'auth-alert error';
          alertEl.innerText = err.message || 'Authentication error.';
          alertEl.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Authenticate & Launch Studio';
        }
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
      } catch (e) {
        console.warn('Could not load login roles:', e);
      }

      const savedIdentity = localStorage.getItem('dse_saved_identity');
      const identityInput = document.getElementById('login-identity');
      if (savedIdentity && identityInput) {
        identityInput.value = savedIdentity;
      }
    }

    // MFA form submit
    const mfaForm = document.getElementById('form-mfa');
    if (mfaForm) {
      mfaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp = document.getElementById('mfa-otp').value.trim();
        const alertEl = document.getElementById('auth-alert');
        try {
          const res = await window.AuthService.completeMfa(otp);
          if (res.success) {
            applyUserToHeader(res.user);
            if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
            window.AppDialogService.closeAllModals();
            window.AppDialogService.showToast(`MFA Verified! Welcome, ${res.user.fullName || res.user.username}!`, 'success');
            window.DashboardController.refresh();
          } else {
            alertEl.className = 'auth-alert error';
            alertEl.innerText = res.message || 'Invalid MFA code.';
            alertEl.style.display = 'block';
          }
        } catch (err) {
          alertEl.className = 'auth-alert error';
          alertEl.innerText = err.message || 'MFA verification failed.';
          alertEl.style.display = 'block';
        }
      });
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

  function handleOmniSearch(query) {
    if (!query || query.length < 2) return;
    const lower = query.toLowerCase();
    if (lower.startsWith('inv') || lower.startsWith('ji')) {
      window.NavigationRouter.selectNav('view-sales-register');
      window.SalesController.filterSales(query);
    } else if (lower.startsWith('cust')) {
      window.NavigationRouter.selectNav('view-customers');
    } else if (lower.startsWith('sup')) {
      window.NavigationRouter.selectNav('view-suppliers');
    } else {
      window.NavigationRouter.selectNav('view-item-master');
      window.ItemMasterController.filterItems(query);
    }
  }

  async function pollShellCounts() {
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

      if (window.ShortcutManager) window.ShortcutManager.init();
      if (window.NavigationRouter) window.NavigationRouter.init();

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

      // Initial shell counts poll and background timer
      await pollShellCounts();
      setInterval(pollShellCounts, 30000);

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

      // Bind omni-search input
      const omni = document.getElementById('omni-input');
      if (omni) {
        omni.addEventListener('input', (e) => handleOmniSearch(e.target.value));
      }
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

    showAuthOverlay() {
      const auth = document.getElementById('auth-overlay');
      if (auth) {
        auth.style.display = 'flex';
        this.showAuthTab('login');
      }
    },

    hideAuthOverlay() {
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

      if (formLogin) formLogin.style.display = tab === 'login' ? 'block' : 'none';
      if (formRegister) formRegister.style.display = tab === 'register' ? 'block' : 'none';
      if (formForgot) formForgot.style.display = tab === 'forgot' ? 'block' : 'none';
      if (formMfa) formMfa.style.display = tab === 'mfa' ? 'block' : 'none';
      if (alertEl) alertEl.style.display = 'none';

      if (tab === 'login') {
        if (cardTitle) cardTitle.innerText = 'Sign in to your account';
        if (cardSub) cardSub.innerText = 'Role-aware secure access to Jasvi Industries';
        if (window.loadLoginRoles) window.loadLoginRoles();
        const identInput = document.getElementById('login-identity');
        if (identInput) identInput.focus();
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
        if (regName) regName.focus();
      } else if (tab === 'forgot') {
        if (cardTitle) cardTitle.innerText = 'Reset your password';
        if (cardSub) cardSub.innerText = 'Admin keeps the existing email-OTP recovery flow. Non-Admin users must also enter their current authenticator code.';
        const forgotIdent = document.getElementById('forgot-identity');
        if (forgotIdent) forgotIdent.focus();
      } else if (tab === 'mfa') {
        if (cardTitle) cardTitle.innerText = 'Two-Factor Authentication';
        if (cardSub) cardSub.innerText = 'Enter your 6-digit Authenticator code to proceed';
        const mfaIn = document.getElementById('mfa-otp');
        if (mfaIn) { mfaIn.value = ''; mfaIn.focus(); }
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
    }
  };
})();

// Helper functions for Authentication, Registration & MFA
let currentForgotChallengeId = null;
let currentRegistrationCaptchaId = null;
let currentRegistrationChallengeId = null;
let currentRegistrationId = null;
let currentRegistrationPending = null;

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
};

window.handleLoginSubmit = async function(e) {
  if (e) e.preventDefault();
  const identity = ((document.getElementById('login-identity') || {}).value || '').trim();
  const password = ((document.getElementById('login-password') || {}).value || '');
  const selectedRole = (((document.getElementById('login-role') || {}).value || 'ADMIN')).toUpperCase();
  const rememberCheck = document.getElementById('login-remember');
  const alertEl = document.getElementById('auth-alert');
  const submitBtn = document.getElementById('btn-login-submit');

  if (!identity || !password) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = 'Please enter both email/username and password.';
      alertEl.style.display = 'block';
    }
    return;
  }

  submitBtn.disabled = true;
  const origHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span>⏳ VERIFYING...</span>';
  if (alertEl) alertEl.style.display = 'none';

  try {
    const res = await window.AuthService.login(identity, password, selectedRole);
    if (res.roleMismatch) {
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerText = res.message || 'Selected role does not match this user account. Please select the role assigned to this account.';
        alertEl.style.display = 'block';
      }
      return;
    }

    if (res.mfaRequired) {
      if (res.enrollmentRequired && res.enrollment) {
        const secretEl = document.getElementById('auth-setup-secret');
        const qrImgEl = document.getElementById('auth-setup-qr-img');
        if (secretEl) secretEl.value = res.enrollment.manualSecret || '';
        if (qrImgEl && res.enrollment.provisioningUri) {
          qrImgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(res.enrollment.provisioningUri)}`;
        }
        window.AppDialogService.openModal('modal-authenticator-setup');
      } else {
        window.App.showAuthTab('mfa');
      }
      return;
    }

    if (res.success && res.user) {
      if (rememberCheck && rememberCheck.checked) {
        localStorage.setItem('dse_saved_identity', identity);
        localStorage.setItem('dse_saved_role', selectedRole);
      } else {
        localStorage.removeItem('dse_saved_identity');
        localStorage.removeItem('dse_saved_role');
      }
      applyUserToHeader(res.user);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.App.hideAuthOverlay();
      window.AppDialogService.closeAllModals();
      window.AppDialogService.showToast(`Welcome back, ${res.user.fullName || res.user.username}!`, 'success');
      if (window.DashboardController && window.DashboardController.refresh) await window.DashboardController.refresh();
      if (window.ItemMasterController && window.ItemMasterController.loadItems) await window.ItemMasterController.loadItems();
      if (window.PartyController && window.PartyController.loadCustomers) await window.PartyController.loadCustomers();
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
    submitBtn.innerHTML = origHtml;
  }
};

let currentMfaRecoveryChallengeId = null;

window.handleMfaSubmit = async function(e) {
  if (e) e.preventDefault();
  const otp = ((document.getElementById('mfa-otp') || {}).value || '').trim();
  const alertEl = document.getElementById('auth-alert');
  const btn = document.getElementById('btn-mfa-submit');

  if (!otp || !otp.match(/^\d{6}$/)) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = 'Enter the current 6-digit authenticator code.';
      alertEl.style.display = 'block';
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Verifying MFA Code...';
  }

  try {
    const res = await window.AuthService.completeMfa(otp);
    if (res.success && res.user) {
      applyUserToHeader(res.user);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.App.hideAuthOverlay();
      window.AppDialogService.closeAllModals();
      window.AppDialogService.showToast(`MFA Verified! Welcome, ${res.user.fullName || res.user.username}!`, 'success');
      if (window.DashboardController && window.DashboardController.refresh) await window.DashboardController.refresh();
    } else {
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerText = res.message || 'Invalid authenticator code. Please check your authenticator app.';
        alertEl.style.display = 'block';
      }
      if (res.message && res.message.toLowerCase().includes('decrypt')) {
        const recoveryPrompt = document.getElementById('btn-mfa-recovery-prompt');
        if (recoveryPrompt) recoveryPrompt.style.display = 'inline-block';
      }
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      if (err.message && err.message.toLowerCase().includes('decrypt')) {
        alertEl.innerText = 'Authenticator secret is unreadable on the server. Please reset your authenticator using the Email Recovery option below.';
        const recoveryGroup = document.getElementById('mfa-recovery-options');
        if (recoveryGroup) recoveryGroup.style.display = 'block';
      } else {
        alertEl.innerText = err.message || 'MFA verification failed.';
      }
      alertEl.style.display = 'block';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Verify MFA Code';
    }
  }
};

window.cancelMfa = function() {
  if (window.AuthService && window.AuthService.cancelMfa) {
    window.AuthService.cancelMfa();
  }
  currentMfaRecoveryChallengeId = null;
  const mfaForm = document.getElementById('form-mfa');
  const loginForm = document.getElementById('form-login');
  const alertEl = document.getElementById('auth-alert');
  const recoveryGroup = document.getElementById('mfa-recovery-group');
  if (mfaForm) mfaForm.style.display = 'none';
  if (loginForm) loginForm.style.display = 'block';
  if (recoveryGroup) recoveryGroup.style.display = 'none';
  if (alertEl) { alertEl.style.display = 'none'; alertEl.innerText = ''; }
  const title = document.querySelector('.auth-modal-title');
  const subtitle = document.querySelector('.auth-modal-subtitle');
  if (title) title.innerText = 'Sign In to Studio';
  if (subtitle) subtitle.innerText = 'Enter your enterprise credentials to access your ERP workspace.';
};

window.requestMfaRecovery = async function() {
  const alertEl = document.getElementById('auth-alert');
  const promptBtn = document.getElementById('btn-mfa-recovery-prompt');
  const recoveryGroup = document.getElementById('mfa-recovery-group');
  const destText = document.getElementById('mfa-recovery-dest-text');

  if (promptBtn) {
    promptBtn.disabled = true;
    promptBtn.innerText = 'Sending email recovery code...';
  }
  if (alertEl) alertEl.style.display = 'none';

  try {
    const res = await window.AuthService.requestLoginMfaRecovery();
    if (res && (res.success || res.challengeId)) {
      currentMfaRecoveryChallengeId = res.challengeId;
      if (recoveryGroup) recoveryGroup.style.display = 'block';
      if (destText && res.maskedDestination) {
        destText.innerText = `A 6-digit recovery code was sent to ${res.maskedDestination}. Enter the code below to reset your authenticator.`;
      }
      const otpIn = document.getElementById('mfa-recovery-otp');
      if (otpIn) {
        otpIn.value = '';
        otpIn.focus();
      }
      window.AppDialogService.showToast('Recovery verification code sent to your registered email.', 'info');
    } else {
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerText = (res && res.message) ? res.message : 'Unable to start authenticator recovery.';
        alertEl.style.display = 'block';
      }
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = 'Recovery request failed: ' + (err.message || 'Unknown error');
      alertEl.style.display = 'block';
    }
  } finally {
    if (promptBtn) {
      promptBtn.disabled = false;
      promptBtn.innerText = '✉ Having Trouble? Reset Authenticator via Email';
    }
  }
};

window.completeMfaRecovery = async function() {
  const otp = ((document.getElementById('mfa-recovery-otp') || {}).value || '').trim();
  const alertEl = document.getElementById('auth-alert');
  const verifyBtn = document.getElementById('btn-mfa-recovery-verify');

  if (!otp || !otp.match(/^\d{6}$/)) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = 'Enter the 6-digit email recovery code received.';
      alertEl.style.display = 'block';
    }
    const otpIn = document.getElementById('mfa-recovery-otp');
    if (otpIn) otpIn.focus();
    return;
  }

  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.innerText = 'Verifying email & resetting authenticator...';
  }
  if (alertEl) alertEl.style.display = 'none';

  try {
    const res = await window.AuthService.completeLoginMfaRecovery(currentMfaRecoveryChallengeId, otp);
    if (res.success || res.manualSecret) {
      window.currentMfaEnrollmentMode = 'login';
      const secretEl = document.getElementById('auth-setup-secret');
      const qrImgEl = document.getElementById('auth-setup-qr-img');
      const errEl = document.getElementById('auth-setup-error');
      if (secretEl) secretEl.value = res.manualSecret || '';
      if (qrImgEl && res.provisioningUri) {
        qrImgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(res.provisioningUri)}`;
      }
      if (errEl) errEl.style.display = 'none';
      window.AppDialogService.openModal('modal-authenticator-setup');
      window.AppDialogService.showToast('Email verified! Scan the new QR code in your authenticator app.', 'success');
      setTimeout(() => {
        const totpIn = document.getElementById('auth-setup-totp');
        if (totpIn) { totpIn.value = ''; totpIn.focus(); }
      }, 100);
    } else {
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerText = res.message || 'Recovery email verification failed.';
        alertEl.style.display = 'block';
      }
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = 'Recovery verification error: ' + (err.message || 'Unknown error');
      alertEl.style.display = 'block';
    }
  } finally {
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.innerText = '✓ Verify Email & Reconfigure Authenticator';
    }
  }
};

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
  const role = (document.getElementById('reg-role') || {}).value;
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

      // Populate Authenticator Setup Modal
      const secretEl = document.getElementById('auth-setup-secret');
      const qrImgEl = document.getElementById('auth-setup-qr-img');
      const errEl = document.getElementById('auth-setup-error');

      if (secretEl) secretEl.value = res.manualSecret || '';
      if (qrImgEl && res.provisioningUri) {
        qrImgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(res.provisioningUri)}`;
      }
      if (errEl) errEl.style.display = 'none';

      window.AppDialogService.openModal('modal-authenticator-setup');
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
        applyUserToHeader(res.user);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.App.hideAuthOverlay();
        window.AppDialogService.closeAllModals();
        window.AppDialogService.showToast(`MFA Verified! Welcome, ${res.user.fullName || res.user.username}!`, 'success');
        if (window.DashboardController && window.DashboardController.refresh) await window.DashboardController.refresh();
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
window.showAuthOverlay = () => window.App.showAuthOverlay();
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
window.showMfaHelp = function() {
  window.AppDialogService.showToast(
    'MFA Help: Open Google Authenticator or Microsoft Authenticator and enter your 6-digit TOTP code. For lost authenticators, contact Admin (accounts@jasviindustries.in).',
    'info'
  );
};
window.openNewInvoiceModal = () => window.SalesController.openNewInvoiceModal();
window.openNewPurchaseModal = () => window.PurchaseController.openNewPurchaseModal();
window.openNewItemModal = () => window.ItemMasterController.openNewItemModal();
window.openNewCustomerModal = () => window.PartyController.openNewCustomerModal();
window.openNewSupplierModal = () => window.PartyController.openNewSupplierModal();
window.openNewBankEntryModal = () => window.FinanceController.openNewBankEntryModal();
window.openNewExpenseEntryModal = () => window.FinanceController.openNewExpenseEntryModal();
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

// Bootstrap on window load
window.addEventListener('load', () => {
  window.App.init();
});
