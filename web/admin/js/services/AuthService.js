/**
 * Jasvi Industries ERP - AuthService
 * Session management, JWT storage, MFA challenge verification, Role validation & Registration matching desktop UserService
 */
window.AuthService = (function() {
  let pendingMfaChallenge = null;
  let pendingUser = null;
  let pendingRecoveryChallenge = null;

  function normalizeRole(role) {
    if (!role) return '';
    return role.toString().trim().toUpperCase();
  }

  return {
    getCurrentUser() {
      const userStr = localStorage.getItem('dse_user_info');
      if (userStr) {
        try { return JSON.parse(userStr); } catch (e) {}
      }
      return { username: 'admin', fullName: 'Shailesh Dhameliya', role: 'ADMIN' };
    },

    getCurrentUsername() {
      const u = this.getCurrentUser();
      return (u && (u.username || u.fullName || u.name)) || 'Admin';
    },

    getAccessToken() {
      return localStorage.getItem('dse_access_token');
    },

    getToken() {
      return this.getAccessToken();
    },

    isAuthenticated() {
      return !!localStorage.getItem('dse_access_token');
    },

    async getLoginRoles() {
      try {
        const roles = await window.ApiService.get('/api/auth/login-roles');
        return Array.isArray(roles) ? roles : [];
      } catch (e) {
        console.warn('Failed to load login roles:', e);
        return [
          { code: 'ADMIN', displayName: 'Admin' },
          { code: 'MANAGER', displayName: 'Manager' },
          { code: 'SALES', displayName: 'Sales' },
          { code: 'PURCHASE', displayName: 'Purchase' },
          { code: 'USER', displayName: 'USER' }
        ];
      }
    },

    async getRegistrationRoles() {
      try {
        const roles = await window.ApiService.get('/api/auth/registration-roles');
        return Array.isArray(roles) ? roles : [];
      } catch (e) {
        console.warn('Failed to load registration roles:', e);
        return [{ code: 'SALES', displayName: 'Sales' }];
      }
    },

    async getRegistrationCaptcha() {
      return await window.ApiService.get('/api/auth/registration/captcha');
    },

    async login(identity, password, selectedRole) {
      const res = await window.ApiService.post('/api/auth/login', { identity, password });

      // Auto-detect and sync role matching LoginController.java
      if (res.user && res.user.role) {
        const actualRole = normalizeRole(res.user.role);
        const wantedRole = normalizeRole(selectedRole);
        const roleSelect = document.getElementById('login-role');
        if (roleSelect && actualRole) {
          roleSelect.value = actualRole;
        }
        if (wantedRole && wantedRole !== actualRole && wantedRole !== 'ADMIN') {
          return {
            success: false,
            roleMismatch: true,
            actualRole: res.user.role,
            message: `Selected role (${selectedRole}) does not match this user account (${res.user.role}). Please select the role assigned to this account.`
          };
        }
      }

      if (res.mfaRequired) {
        pendingMfaChallenge = res.challengeId;
        pendingUser = res.user;
        pendingRecoveryChallenge = null;
        return {
          mfaRequired: true,
          challengeId: res.challengeId,
          maskedDestination: res.maskedDestination,
          enrollmentRequired: res.enrollmentRequired,
          enrollment: res.enrollment
        };
      }

      if (res.success && res.accessToken) {
        localStorage.setItem('dse_access_token', res.accessToken);
        localStorage.setItem('dse_user_info', JSON.stringify(res.user));
        return { success: true, user: res.user };
      }

      return { success: false, message: res.message || 'Invalid credentials' };
    },

    getPendingMfaChallenge() {
      return pendingMfaChallenge;
    },

    setPendingMfaChallenge(challengeId) {
      pendingMfaChallenge = challengeId;
    },

    getPendingRecoveryChallenge() {
      return pendingRecoveryChallenge;
    },

    setPendingRecoveryChallenge(challengeId) {
      pendingRecoveryChallenge = challengeId;
    },

    getPendingUser() {
      return pendingUser;
    },

    async completeMfa(otp) {
      if (!pendingMfaChallenge) throw new Error('No pending MFA challenge found.');
      const res = await window.ApiService.post('/api/auth/login/mfa/complete', { challengeId: pendingMfaChallenge, otp });
      if (res.success && res.accessToken) {
        localStorage.setItem('dse_access_token', res.accessToken);
        localStorage.setItem('dse_user_info', JSON.stringify(res.user || pendingUser));
        pendingMfaChallenge = null;
        pendingUser = null;
        pendingRecoveryChallenge = null;
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Invalid MFA code' };
    },

    cancelMfa() {
      pendingMfaChallenge = null;
      pendingUser = null;
      pendingRecoveryChallenge = null;
    },

    async requestLoginMfaRecovery() {
      if (!pendingMfaChallenge) throw new Error('No active login MFA challenge found.');
      const res = await window.ApiService.post('/api/auth/login/mfa/recovery/request', {
        challengeId: pendingMfaChallenge
      });
      if (res && res.challengeId) {
        pendingRecoveryChallenge = res.challengeId;
      }
      return res;
    },

    async completeLoginMfaRecovery(recoveryChallengeId, otp) {
      if (!pendingMfaChallenge) throw new Error('No active login MFA challenge found.');
      const activeRecoveryChallenge = recoveryChallengeId || pendingRecoveryChallenge;
      if (!activeRecoveryChallenge) throw new Error('No active recovery verification challenge found. Please click Resend email code.');
      const res = await window.ApiService.post('/api/auth/login/mfa/recovery/complete', {
        loginChallengeId: pendingMfaChallenge,
        recoveryChallengeId: activeRecoveryChallenge,
        otp
      });
      if (res && res.challengeId) {
        pendingMfaChallenge = res.challengeId;
        pendingRecoveryChallenge = null;
      }
      return res;
    },

    async getLoginMfaEnrollment() {
      if (!pendingMfaChallenge) throw new Error('No active login MFA challenge found.');
      return await window.ApiService.post('/api/auth/login/mfa/enrollment', {
        challengeId: pendingMfaChallenge
      });
    },

    async requestRegistrationOtp(payload) {
      return await window.ApiService.post('/api/auth/registration/request', payload);
    },

    async verifyRegistrationEmail(payload) {
      return await window.ApiService.post('/api/auth/registration/email/verify', payload);
    },

    async completeRegistrationMfa(payload) {
      return await window.ApiService.post('/api/auth/registration/mfa/complete', payload);
    },

    async requestPasswordReset(identity) {
      return await window.ApiService.post('/api/auth/password-reset/request', { identity });
    },

    async completePasswordReset(challengeId, otp, totp, password) {
      return await window.ApiService.post('/api/auth/password-reset/complete', {
        challengeId,
        otp,
        totp: totp || '',
        password
      });
    },

    async changePassword(currentPassword, password) {
      const user = this.getCurrentUser();
      return await window.ApiService.post('/api/auth/password', {
        userId: user ? user.id : 1,
        currentPassword,
        password
      });
    },

    async logout() {
      try {
        await window.ApiService.post('/api/auth/logout', {});
      } catch (e) {}
      localStorage.removeItem('dse_access_token');
      localStorage.removeItem('dse_user_info');
    }
  };
})();
