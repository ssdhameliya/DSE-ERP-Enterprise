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
      if (footerClock) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const day = days[now.getDay()];
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
        footerClock.innerText = `📅 ${day}, ${d}/${m}/${y} | ${timeStr} | IST`;
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
      document.getElementById('tab-login-btn').classList.toggle('active', tab === 'login');
      document.getElementById('tab-register-btn').classList.toggle('active', tab === 'register');
      document.getElementById('tab-forgot-btn').classList.toggle('active', tab === 'forgot');

      document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
      document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
      document.getElementById('form-forgot').style.display = tab === 'forgot' ? 'block' : 'none';
      document.getElementById('form-mfa').style.display = 'none';
      document.getElementById('auth-alert').style.display = 'none';

      // Reset forgot password sub-steps
      if (tab === 'forgot') {
        document.getElementById('forgot-step-1').style.display = 'block';
        document.getElementById('forgot-step-2').style.display = 'none';
        document.getElementById('forgot-identity').focus();
      }

      // Initialize registration on tab open
      if (tab === 'register') {
        window.refreshRegistrationCaptcha();
        window.loadRegistrationRoles();
        const otpGroup = document.getElementById('reg-email-otp-group');
        const submitBtn = document.getElementById('btn-reg-submit');
        if (otpGroup) otpGroup.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'block';
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
    btn.innerText = 'Verify & Submit for Approval';
  }
};

window.requestPasswordResetOtp = async function() {
  const identity = document.getElementById('forgot-identity').value.trim();
  const alertEl = document.getElementById('auth-alert');
  const btn = document.getElementById('btn-forgot-request-otp');
  if (!identity) {
    alertEl.className = 'auth-alert error';
    alertEl.innerText = 'Please enter your username or registered email.';
    alertEl.style.display = 'block';
    return;
  }
  btn.disabled = true;
  btn.innerText = 'Sending OTP...';
  alertEl.style.display = 'none';
  try {
    const res = await window.AuthService.requestPasswordReset(identity);
    if (res.success) {
      currentForgotChallengeId = res.challengeId;
      document.getElementById('forgot-step-1').style.display = 'none';
      document.getElementById('forgot-step-2').style.display = 'block';
      document.getElementById('forgot-otp').focus();
      window.AppDialogService.showToast('Verification OTP sent to your registered email.', 'info');
    } else {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = res.message || 'Unable to request password reset.';
      alertEl.style.display = 'block';
    }
  } catch (err) {
    alertEl.className = 'auth-alert error';
    alertEl.innerText = err.message || 'Error communicating with authentication server.';
    alertEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerText = 'Send Reset OTP Code';
  }
};

window.handleForgotPasswordSubmit = async function(e) {
  e.preventDefault();
  const otp = document.getElementById('forgot-otp').value.trim();
  const pwd = document.getElementById('forgot-new-pwd').value;
  const confirmPwd = document.getElementById('forgot-confirm-pwd').value;
  const alertEl = document.getElementById('auth-alert');
  const btn = document.getElementById('btn-forgot-complete');

  if (pwd !== confirmPwd) {
    alertEl.className = 'auth-alert error';
    alertEl.innerText = 'Passwords do not match. Please re-enter.';
    alertEl.style.display = 'block';
    return;
  }
  btn.disabled = true;
  btn.innerText = 'Updating password...';
  try {
    const res = await window.AuthService.completePasswordReset(currentForgotChallengeId, otp, pwd);
    if (res.success) {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast('Password updated! You can now sign in.', 'success');
      window.App.showAuthTab('login');
      document.getElementById('login-password').value = pwd;
    } else {
      alertEl.className = 'auth-alert error';
      alertEl.innerText = res.message || 'Invalid or expired OTP code.';
      alertEl.style.display = 'block';
    }
  } catch (err) {
    alertEl.className = 'auth-alert error';
    alertEl.innerText = err.message || 'Password reset failed.';
    alertEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerText = 'Update Password & Login';
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
