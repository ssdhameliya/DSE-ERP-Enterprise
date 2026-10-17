/**
 * Jasvi Industries ERP - ProfileController
 * Complete Desktop Parity matching Profile.fxml & ProfileController.java
 * Backed by:
 *   GET /api/profile
 *   PUT /api/profile
 *   POST /api/auth/password
 */
window.ProfileController = (function() {
  'use strict';

  let rowVersion = 0;
  let cachedProfile = null;

  function initials(name, username) {
    const s = (name || username || 'U').trim();
    const parts = s.split(/\s+/);
    if (!parts.length || !parts[0]) return 'U';
    const first = parts[0][0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  function formatTimestamp(ts) {
    if (!ts) return 'Never';
    try {
      const d = new Date(typeof ts === 'number' ? ts : Date.parse(ts));
      if (isNaN(d.getTime())) return String(ts);
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return String(ts);
    }
  }

  return {
    async loadProfile() {
      const saveBtn = document.getElementById('btn-prof-save');
      if (saveBtn) saveBtn.disabled = true;

      try {
        const p = await window.ApiService.get('/api/profile');
        if (!p) throw new Error('No profile data received');
        cachedProfile = p;
        rowVersion = p.rowVersion || 0;

        // Populate Hero Section
        const nameEl = document.getElementById('prof-hero-name');
        const roleEl = document.getElementById('prof-hero-role');
        const statusEl = document.getElementById('prof-hero-status');
        const avatarEl = document.getElementById('prof-hero-avatar');

        const displayName = p.fullName || p.username || 'User';
        if (nameEl) nameEl.innerText = displayName;
        if (roleEl) roleEl.innerText = (p.role || 'USER').toUpperCase();
        if (statusEl) {
          statusEl.innerText = p.locked ? 'Locked' : (!p.active ? 'Inactive' : 'Active');
          statusEl.className = 'profile-chip ' + (p.locked ? 'red' : (!p.active ? 'yellow' : 'green'));
        }
        if (avatarEl) avatarEl.innerText = initials(p.fullName, p.username);

        // Populate Form Fields
        const fName = document.getElementById('prof-full-name');
        const fEmail = document.getElementById('prof-email');
        const fDept = document.getElementById('prof-department');
        const fBranch = document.getElementById('prof-branch');

        if (fName) fName.value = p.fullName || '';
        if (fEmail) fEmail.value = p.email || '';
        if (fDept) fDept.value = p.department || '';
        if (fBranch) fBranch.value = p.branch || '';

        // Populate Account Overview
        const oUser = document.getElementById('prof-overview-username');
        const oAccess = document.getElementById('prof-overview-access');
        const oLogin = document.getElementById('prof-overview-last-login');
        const oMfa = document.getElementById('prof-overview-mfa');

        if (oUser) oUser.innerText = p.username || '-';
        if (oAccess) oAccess.innerText = p.accessLevel || (p.role || 'STANDARD');
        if (oLogin) oLogin.innerText = formatTimestamp(p.lastLogin);
        if (oMfa) {
          oMfa.innerHTML = p.mfaEnabled
            ? '<span style=\"color:#34d399; font-weight:600;\">&#10003; Enabled (TOTP)</span>'
            : '<span style=\"color:#fbbf24; font-weight:600;\">&#9888; Not Enabled</span>';
        }

        // Also sync header user widget
        if (window.applyUserToHeader) {
          window.applyUserToHeader(p);
        }

      } catch (err) {
        console.error('[ProfileController] Failed to load profile:', err);
        if (window.AppDialogService) {
          window.AppDialogService.toast('error', 'Profile load failed: ' + (err.message || 'Unknown error'));
        }
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    },

    async saveProfile(e) {
      if (e) e.preventDefault();

      const fName = document.getElementById('prof-full-name');
      const fEmail = document.getElementById('prof-email');
      const fDept = document.getElementById('prof-department');
      const fBranch = document.getElementById('prof-branch');
      const saveBtn = document.getElementById('btn-prof-save');

      const name = (fName?.value || '').trim();
      const email = (fEmail?.value || '').trim();
      const dept = (fDept?.value || '').trim();
      const branch = (fBranch?.value || '').trim();

      if (!name) {
        if (window.AppDialogService) window.AppDialogService.toast('warning', 'Full Name is required.');
        if (fName) fName.focus();
        return;
      }

      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        if (window.AppDialogService) window.AppDialogService.toast('warning', 'A valid email address is required.');
        if (fEmail) fEmail.focus();
        return;
      }

      if (saveBtn) saveBtn.disabled = true;

      try {
        const payload = {
          fullName: name,
          email: email,
          department: dept,
          branch: branch,
          rowVersion: rowVersion
        };

        const updated = await window.ApiService.put('/api/profile', payload);
        if (updated) {
          rowVersion = updated.rowVersion || (rowVersion + 1);
          cachedProfile = updated;

          // Update header
          if (window.applyUserToHeader) {
            window.applyUserToHeader(updated);
          }

          // Update hero labels
          const nameEl = document.getElementById('prof-hero-name');
          const avatarEl = document.getElementById('prof-hero-avatar');
          if (nameEl) nameEl.innerText = updated.fullName || updated.username;
          if (avatarEl) avatarEl.innerText = initials(updated.fullName, updated.username);

          if (window.NotificationService) {
            window.NotificationService.createNotification(
              'SECURITY',
              'Profile Updated',
              'Your profile details were updated successfully.',
              'INFO',
              'view-profile'
            );
          }

          if (window.AppDialogService) {
            window.AppDialogService.toast('success', 'Profile details saved successfully.');
          }
        }
      } catch (err) {
        console.error('[ProfileController] Failed to save profile:', err);
        if (window.AppDialogService) {
          window.AppDialogService.toast('error', 'Profile update failed: ' + (err.message || 'Unknown error'));
        }
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    },

    async changePassword(e) {
      if (e) e.preventDefault();

      const curPwd = document.getElementById('prof-current-pwd');
      const newPwd = document.getElementById('prof-new-pwd');
      const cnfPwd = document.getElementById('prof-confirm-pwd');
      const btn = document.getElementById('btn-prof-change-pwd');

      const current = curPwd?.value || '';
      const a = newPwd?.value || '';
      const b = cnfPwd?.value || '';

      if (!current) {
        if (window.AppDialogService) window.AppDialogService.toast('warning', 'Current password is required.');
        if (curPwd) curPwd.focus();
        return;
      }

      if (!a || a.length < 8 || !/[A-Za-z]/.test(a) || !/[0-9]/.test(a)) {
        if (window.AppDialogService) window.AppDialogService.toast('warning', 'Password must be at least 8 characters and contain both letters and numbers.');
        if (newPwd) newPwd.focus();
        return;
      }

      if (a !== b) {
        if (window.AppDialogService) window.AppDialogService.toast('warning', 'Passwords do not match. Please re-enter.');
        if (cnfPwd) cnfPwd.focus();
        return;
      }

      if (btn) btn.disabled = true;

      try {
        const currentUser = window.AuthService?.getCurrentUser() || {};
        const userId = currentUser.id || cachedProfile?.id || 0;

        await window.ApiService.post('/api/auth/password', {
          userId: userId,
          currentPassword: current,
          password: a
        });

        if (curPwd) curPwd.value = '';
        if (newPwd) newPwd.value = '';
        if (cnfPwd) cnfPwd.value = '';

        if (window.NotificationService) {
          window.NotificationService.createNotification(
            'SECURITY',
            'Password Changed',
            'Your account password was changed successfully.',
            'INFO',
            'view-profile'
          );
        }

        if (window.AppDialogService) {
          window.AppDialogService.toast('success', 'Password updated successfully. Please use your new password next time you sign in.');
        }
      } catch (err) {
        console.error('[ProfileController] Failed to change password:', err);
        if (window.AppDialogService) {
          window.AppDialogService.toast('error', 'Password update failed: ' + (err.message || 'Unknown error'));
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    }
  };
})();
