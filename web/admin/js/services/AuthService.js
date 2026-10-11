/**
 * Jasvi Industries ERP - AuthService
 * Session management, JWT storage, MFA challenge verification matching desktop UserService
 */
window.AuthService = (function() {
  let pendingMfaChallenge = null;

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

    async login(identity, password) {
      const res = await window.ApiService.post('/api/auth/login', { identity, password });
      if (res.mfaRequired) {
        pendingMfaChallenge = res.challengeId;
        return { mfaRequired: true, challengeId: res.challengeId };
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
        localStorage.setItem('dse_user_info', JSON.stringify(res.user));
        pendingMfaChallenge = null;
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Invalid MFA code' };
    },

    cancelMfa() {
      pendingMfaChallenge = null;
    },

    async register(userData) {
      return await window.ApiService.post('/api/auth/register', userData);
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
