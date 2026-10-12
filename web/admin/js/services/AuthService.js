/**
 * Jasvi Industries ERP - AuthService
 * Session management, JWT storage, MFA challenge verification, Role validation & Registration matching desktop UserService
 */
window.AuthService = (function() {
  let pendingMfaChallenge = null;
  let pendingUser = null;

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

    getAccessToken() {
      return localStorage.getItem('dse_access_token');
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

      // Role check matching LoginController.java lines 298-306
      if (res.user && selectedRole) {
        const actualRole = normalizeRole(res.user.role);
        const wantedRole = normalizeRole(selectedRole);
        if (actualRole && wantedRole && actualRole !== wantedRole) {
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
        return { mfaRequired: true, challengeId: res.challengeId, maskedDestination: res.maskedDestination };
      }

      if (res.success && res.accessToken) {
        localStorage.setItem('dse_access_token', res.accessToken);
        localStorage.setItem('dse_user_info', JSON.stringify(res.user));
        return { success: true, user: res.user };
      }

      return { success: false, message: res.message || 'Invalid credentials' };
    },

    async completeMfa(otp) {
      if (!pendingMfaChallenge) throw new Error('No pending MFA challenge found.');
      const res = await window.ApiService.post('/api/auth/login/mfa/complete', { challengeId: pendingMfaChallenge, otp });
      if (res.success && res.accessToken) {
        localStorage.setItem('dse_access_token', res.accessToken);
        localStorage.setItem('dse_user_info', JSON.stringify(res.user || pendingUser));
        pendingMfaChallenge = null;
        pendingUser = null;
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Invalid MFA code' };
    },

    cancelMfa() {
      pendingMfaChallenge = null;
      pendingUser = null;
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

    async completePasswordReset(challengeId, otp, password) {
      return await window.ApiService.post('/api/auth/password-reset/complete', {
        challengeId,
        otp,
        totp: '',
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
