/**
 * Jasvi Industries ERP - UserAccessController
 * Full Desktop Parity for User Access & RBAC, Registration Approvals, and Global Audit Trail
 * Reference: UserAccess.fxml, UserAccessController.java, RoleManagement.fxml, GlobalAudit.fxml, AuditController.java
 */
window.UserAccessController = (function() {
  let cachedUsers = [];
  let cachedRoles = [];
  let cachedPermissions = [];
  let cachedRegistrations = [];
  let cachedAuditPage = null;
  let currentAuditPage = 0;
  let activeTab = 'tab-users';
  let editingUserId = null;
  let selectedTargetUserId = null;
  let selectedUserId = null;
  let selectedUser = null;

  return {
    editSelectedUser() {
      const menu = document.getElementById('user-row-actions-menu');
      if (menu) menu.classList.remove('show');
      if (selectedTargetUserId) this.openEditUserModal(selectedTargetUserId);
    },

    resetSelectedUserPassword() {
      const menu = document.getElementById('user-row-actions-menu');
      if (menu) menu.classList.remove('show');
      const u = cachedUsers.find(x => x.id === selectedTargetUserId);
      if (u) this.openPasswordModal(u.id, u.username);
    },

    toggleSelectedUserLock() {
      const menu = document.getElementById('user-row-actions-menu');
      if (menu) menu.classList.remove('show');
      const u = cachedUsers.find(x => x.id === selectedTargetUserId);
      if (u) {
        const isLocked = u.locked || !u.active;
        this.toggleLockUser(u.id, !isLocked);
      }
    },

    toggleSelectedUserMfa() {
      const menu = document.getElementById('user-row-actions-menu');
      if (menu) menu.classList.remove('show');
      if (selectedTargetUserId) this.toggleMfaUser(selectedTargetUserId);
    },

    resetSelectedUserAuthenticator() {
      const menu = document.getElementById('user-row-actions-menu');
      if (menu) menu.classList.remove('show');
      if (selectedTargetUserId) this.resetAuthenticator(selectedTargetUserId);
    },

    async resetAuthenticator(id) {
      const u = cachedUsers.find(x => x.id === id);
      if (!u) return;
      if (!confirm(`Reset Authenticator (2FA) for "${u.username}"?\n\nThis will invalidate the existing TOTP secret. The user will be required to scan a new QR code on next sign-in.`)) {
        return;
      }
      try {
        await window.ReportService.resetUserMfa(id);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`Authenticator reset for ${u.username}. New enrollment required at sign-in.`, 'success');
        this.loadUsers();
      } catch (err) {
        window.AppDialogService.showToast('Failed to reset authenticator: ' + err.message, 'error');
      }
    },

    deleteSelectedUser() {
      const menu = document.getElementById('user-row-actions-menu');
      if (menu) menu.classList.remove('show');
      const u = cachedUsers.find(x => x.id === selectedTargetUserId);
      if (u) this.deleteUser(u.id, u.username);
    },

    getActiveTab() {
      return activeTab;
    },

    switchTab(tabName) {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      activeTab = tabName;
      document.querySelectorAll('.user-subtab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.user-tab-pane').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
      });

      const btn = document.getElementById(`btn-subtab-${tabName}`);
      if (btn) btn.classList.add('active');

      const pane = document.getElementById(`pane-${tabName}`);
      if (pane) {
        pane.style.display = 'block';
        pane.classList.add('active');
      }

      if (tabName === 'tab-users') this.loadUsers();
      else if (tabName === 'tab-roles') this.loadRoles();
      else if (tabName === 'tab-permissions') this.loadPermissions();
    },

    // ==========================================
    // 1. USER ACCOUNTS & RBAC (UserAccess.fxml)
    // ==========================================
    async loadUsers() {
      const tbody = document.getElementById('users-table-tbody');
      if (!tbody) return;
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 24px; color: var(--text-dim);"><div class="spinner"></div> Loading system users...</td></tr>`;

      try {
        const res = await window.ReportService.getUsers();
        cachedUsers = Array.isArray(res) ? res : (res && res.rows ? res.rows : []);

        // 5 Desktop KPIs
        const total = cachedUsers.length;
        const active = cachedUsers.filter(u => u.active && !u.locked).length;
        const roles = new Set(cachedUsers.map(u => u.role)).size;
        const locked = cachedUsers.filter(u => u.locked || !u.active).length;
        const mfa = cachedUsers.filter(u => u.mfaEnabled).length;

        if (document.getElementById('user-kpi-total')) document.getElementById('user-kpi-total').textContent = total;
        if (document.getElementById('user-kpi-active')) document.getElementById('user-kpi-active').textContent = active;
        if (document.getElementById('user-kpi-roles')) document.getElementById('user-kpi-roles').textContent = roles;
        if (document.getElementById('user-kpi-locked')) document.getElementById('user-kpi-locked').textContent = locked;
        if (document.getElementById('user-kpi-mfa')) document.getElementById('user-kpi-mfa').textContent = mfa;

        if (cachedUsers.length === 0) {
          tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 24px; color: var(--text-dim);">No user accounts configured. Click "+ Add New User" to provision.</td></tr>`;
          return;
        }

        this.renderUsersTable(cachedUsers);
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #f87171; padding: 24px;">Failed to load users: ${err.message}</td></tr>`;
      }
    },

    filterUsers(q) {
      const query = (q || '').trim().toLowerCase();
      const filtered = cachedUsers.filter(u => {
        if (!query) return true;
        const name = (u.fullName || '').toLowerCase();
        const uname = (u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const role = (u.role || '').toLowerCase();
        const dept = (u.department || '').toLowerCase();
        return name.includes(query) || uname.includes(query) || email.includes(query) || role.includes(query) || dept.includes(query);
      });
      this.renderUsersTable(filtered);
    },

    renderUsersTable(usersList) {
      const tbody = document.getElementById('users-table-tbody');
      const counterEl = document.getElementById('users-entries-counter');
      if (counterEl) counterEl.innerText = `Showing 1 to ${usersList.length} of ${cachedUsers.length} users`;
      if (!tbody) return;

      if (!usersList || usersList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 24px; color: var(--text-dim);">No user accounts match current criteria.</td></tr>`;
        return;
      }

      tbody.innerHTML = usersList.map(u => {
        const isLocked = u.locked || !u.active;
        const statusBadge = isLocked
          ? `<span class="badge badge-overdue">LOCKED</span>`
          : `<span class="badge badge-paid">ACTIVE</span>`;
        const mfaBadge = u.mfaEnabled
          ? `<span class="badge badge-paid">&#128274; ENABLED</span>`
          : `<span class="badge badge-pending">OPTIONAL</span>`;
        const roleBadge = `<span class="badge badge-role" style="background: rgba(14,165,233,0.15); color: var(--cyan); border: 1px solid rgba(14,165,233,0.3); font-weight:700;">${u.role || 'USER'}</span>`;

        return `
          <tr onclick="window.UserAccessController.onUserRowClick(${u.id}, event)" data-user-id="${u.id}" style="cursor: pointer;">
            <td style="color: var(--text-dim); font-size: 0.75rem;">#${u.id || '-'}</td>
            <td style="font-weight: 700; color: #fff;">${u.fullName || u.username}</td>
            <td style="color: var(--cyan); font-family: monospace;">${u.username || '-'}</td>
            <td style="font-size: 0.8rem; color: var(--text-muted);">${u.email || '-'}</td>
            <td>${roleBadge}</td>
            <td style="font-size: 0.8rem;">${u.department || 'GENERAL'}</td>
            <td style="font-size: 0.8rem;">${u.branch || 'HEADQUARTERS'}</td>
            <td>${statusBadge}</td>
            <td>${mfaBadge}</td>
            <td style="font-size: 0.75rem; color: var(--text-dim);">${u.lastLogin ? window.FormatUtil.formatDateTime(u.lastLogin) : 'Never'}</td>
            <td style="text-align: center;" onclick="event.stopPropagation()">
              <button class="btn-purple" style="height: 28px; padding: 0 10px; font-size: 0.74rem; font-weight: 600;" 
                      onclick="window.UserAccessController.toggleRowActionsMenu(this, ${u.id}, event)" 
                      title="User Actions">
                ::: Actions
              </button>
            </td>
          </tr>
        `;
      }).join('');
    },

    onUserRowClick(id, event) {
      if (event && window.RegisterUiSupport && window.RegisterUiSupport.isInteractiveTarget(event.target)) return;
      const drawer = document.getElementById('user-detail-drawer');
      const isOpen = drawer && (drawer.classList.contains('open') || drawer.style.display === 'flex' || drawer.style.display === 'block');
      if (isOpen && selectedUserId === id) {
        this.closeUserDrawer();
        return;
      }
      this.openUserDrawer(id);
    },

    openUserDrawer(id) {
      const u = cachedUsers.find(x => x.id === id);
      if (!u) return;
      selectedUserId = id;
      selectedUser = u;

      const drawer = document.getElementById('user-detail-drawer');
      if (!drawer) return;

      const isLocked = u.locked || !u.active;
      const setEl = (elemId, text) => { const el = document.getElementById(elemId); if (el) el.innerText = text; };

      setEl('ud-full-name', u.fullName || u.username);
      setEl('ud-username', '@' + (u.username || '-'));
      
      const badge = document.getElementById('ud-status-badge');
      if (badge) {
        badge.innerText = isLocked ? 'LOCKED / RESTRICTED' : 'ACTIVE';
        badge.className = `pill-badge ${isLocked ? 'pill-danger' : 'pill-success'}`;
      }

      setEl('ud-role', u.role || 'USER');
      setEl('ud-mfa', u.mfaEnabled ? 'ENABLED (2FA Active)' : 'DISABLED (Optional)');
      setEl('ud-dept', u.department || 'GENERAL');
      setEl('ud-branch', u.branch || 'HEADQUARTERS');
      setEl('ud-email', u.email || '-');
      setEl('ud-last-login', u.lastLogin ? window.FormatUtil.formatDateTime(u.lastLogin) : 'Never logged in');

      if (window.RegisterUiSupport) {
        window.RegisterUiSupport.showDrawer('user-detail-drawer');
        const rowEl = document.querySelector(`#users-table-tbody tr[data-user-id="${id}"]`);
        if (rowEl) window.RegisterUiSupport.highlightRow('#users-table-tbody', rowEl);
      } else {
        drawer.style.display = 'flex';
      }
    },

    closeUserDrawer() {
      selectedUserId = null;
      selectedUser = null;
      if (window.RegisterUiSupport) {
        window.RegisterUiSupport.hideDrawer('user-detail-drawer', '#users-table-tbody');
      } else {
        const drawer = document.getElementById('user-detail-drawer');
        if (drawer) drawer.style.display = 'none';
        document.querySelectorAll('#users-table-tbody tr').forEach(r => r.classList.remove('active-selected-row'));
      }
    },

    drawerEditUser() {
      if (selectedUserId) this.openEditUserModal(selectedUserId);
    },

    drawerResetPassword() {
      if (selectedUser) this.openPasswordModal(selectedUser.id, selectedUser.username);
    },

    drawerToggleLock() {
      if (!selectedUser) return;
      const isLocked = selectedUser.locked || !selectedUser.active;
      this.toggleLockUser(selectedUser.id, !isLocked);
    },

    drawerToggleMfa() {
      if (selectedUserId) this.toggleMfaUser(selectedUserId);
    },

    drawerUserAudit() {
      if (!selectedUser) return;
      if (window.AppDialogService) {
        window.AppDialogService.showActivityTimeline('USER', selectedUser.id, selectedUser.username);
      }
    },

    toggleRowActionsMenu(btnEl, userId, event) {
      if (event) event.stopPropagation();
      selectedTargetUserId = userId;

      const menu = document.getElementById('user-row-actions-menu');
      if (!menu) return;

      if (menu.classList.contains('show') && menu.dataset.targetId === String(userId)) {
        menu.classList.remove('show');
        return;
      }

      const rect = btnEl.getBoundingClientRect();
      const menuWidth = 220;
      let left = rect.right - menuWidth;
      let top = rect.bottom + 4;

      if (left < 10) left = 10;
      if (top + 200 > window.innerHeight) {
        top = rect.top - 200;
      }

      menu.style.position = 'fixed';
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.dataset.targetId = String(userId);
      menu.classList.add('show');

      const closeHandler = (e) => {
        if (!menu.contains(e.target) && e.target !== btnEl) {
          menu.classList.remove('show');
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    },

    async toggleMfaUser(id) {
      const u = cachedUsers.find(x => x.id === id);
      if (!u) return;
      const newState = !u.mfaEnabled;
      try {
        await window.ReportService.updateUser(id, {
          ...u,
          mfaEnabled: newState,
          rowVersion: u.rowVersion != null ? u.rowVersion : 0
        });
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`MFA ${newState ? 'enabled' : 'disabled'} for ${u.username}`, 'success');
        this.loadUsers();
      } catch (err) {
        window.AppDialogService.showToast(err.message, 'error');
      }
    },

    // ==========================================
    // 2. ROLES MATRIX (RoleManagement.fxml)
    // ==========================================
    async loadRoles() {
      const tbody = document.getElementById('roles-table-tbody');
      if (!tbody) return;
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-dim);"><div class="spinner"></div> Loading system roles...</td></tr>`;

      try {
        const res = await window.ReportService.getRoles();
        cachedRoles = Array.isArray(res) ? res : (res && res.rows ? res.rows : []);

        if (cachedRoles.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-dim);">No roles found.</td></tr>`;
          return;
        }

        tbody.innerHTML = cachedRoles.map(r => `
          <tr>
            <td style="font-weight: 700; color: var(--cyan);">${r.code || r.name}</td>
            <td style="font-weight: 600;">${r.displayName || r.name}</td>
            <td style="font-size: 0.85rem; color: var(--text-muted);">${r.description || 'System Access Role'}</td>
            <td><span class="badge badge-role" style="font-size: 0.8rem; font-weight: 700;">${r.userCount != null ? r.userCount : '-'} Users</span></td>
            <td><span class="badge ${r.active !== false ? 'badge-paid' : 'badge-overdue'}">${r.active !== false ? 'ACTIVE' : 'INACTIVE'}</span></td>
            <td style="text-align: right;">
              <button class="btn btn-secondary" style="padding: 3px 8px; font-size: 0.75rem;" onclick="window.UserAccessController.switchTab('tab-permissions')">Permissions</button>
            </td>
          </tr>
        `).join('');
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #f87171; padding: 24px;">Failed to load roles: ${err.message}</td></tr>`;
      }
    },

    // ==========================================
    // 3. PERMISSION MATRIX
    // ==========================================
    async loadPermissions() {
      const tbody = document.getElementById('permissions-table-tbody');
      if (!tbody) return;
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-dim);"><div class="spinner"></div> Loading permissions matrix...</td></tr>`;

      try {
        const res = await window.ReportService.getPermissions('ADMIN');
        let list = [];
        if (res && res.permissions) list = res.permissions;
        else if (Array.isArray(res)) list = res;

        cachedPermissions = list;
        if (cachedPermissions.length === 0) {
          tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-dim);">No permissions defined.</td></tr>`;
          return;
        }

        tbody.innerHTML = cachedPermissions.map(p => `
          <tr>
            <td style="font-weight: 700; color: var(--cyan);">${p.module || 'SYSTEM'}</td>
            <td style="font-weight: 600;">${p.action || '-'}</td>
            <td style="font-size: 0.85rem; color: var(--text-muted);">${p.description || '-'}</td>
            <td style="text-align: center;">
              <input type="checkbox" id="perm-chk-${p.id}" ${p.allowed ? 'checked' : ''} style="transform: scale(1.2); cursor: pointer;" onchange="window.UserAccessController.togglePermission(${p.id}, this.checked)">
            </td>
            <td style="font-size: 0.75rem; color: var(--text-dim); text-align: center;">${p.allowed ? '<span style="color:#10b981;">ALLOWED</span>' : '<span style="color:#ef4444;">RESTRICTED</span>'}</td>
          </tr>
        `).join('');
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #f87171; padding: 24px;">Failed to load permissions: ${err.message}</td></tr>`;
      }
    },

    togglePermission(id, allowed) {
      const p = cachedPermissions.find(x => x.id === id);
      if (p) p.allowed = allowed;
    },

    async savePermissionMatrix() {
      try {
        const payload = {
          role: 'ADMIN',
          permissions: cachedPermissions.map(p => ({ id: p.id, allowed: !!p.allowed })),
          rowVersion: Date.now()
        };
        await window.ReportService.savePermissions(payload);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Permission matrix committed successfully!', 'success');
        this.loadPermissions();
      } catch (err) {
        window.AppDialogService.showToast('Failed to save permissions: ' + err.message, 'error');
      }
    },

    // ==========================================
    // 4. USER MODAL & ACTIONS
    // ==========================================
    openAddUserModal() {
      editingUserId = null;
      document.getElementById('user-modal-title').textContent = 'Provision New ERP User';
      document.getElementById('user-form-username').value = '';
      document.getElementById('user-form-username').disabled = false;
      document.getElementById('user-form-fullname').value = '';
      document.getElementById('user-form-email').value = '';
      document.getElementById('user-form-role').value = 'STAFF';
      document.getElementById('user-form-dept').value = 'OPERATIONS';
      document.getElementById('user-form-branch').value = 'HEADQUARTERS';
      document.getElementById('user-form-password').value = '';
      document.getElementById('user-form-password-group').style.display = 'block';
      document.getElementById('user-form-active').checked = true;
      document.getElementById('user-form-mfa').checked = false;
      window.AppDialogService.openModal('modal-user-edit');
    },

    openEditUserModal(id) {
      const u = cachedUsers.find(x => x.id === id);
      if (!u) return;
      editingUserId = id;
      document.getElementById('user-modal-title').textContent = `Edit User: ${u.username}`;
      document.getElementById('user-form-username').value = u.username || '';
      document.getElementById('user-form-username').disabled = true;
      document.getElementById('user-form-fullname').value = u.fullName || '';
      document.getElementById('user-form-email').value = u.email || '';
      document.getElementById('user-form-role').value = u.role || 'STAFF';
      document.getElementById('user-form-dept').value = u.department || 'OPERATIONS';
      document.getElementById('user-form-branch').value = u.branch || 'HEADQUARTERS';
      document.getElementById('user-form-password').value = '';
      document.getElementById('user-form-password-group').style.display = 'none';
      document.getElementById('user-form-active').checked = !!u.active;
      document.getElementById('user-form-mfa').checked = !!u.mfaEnabled;
      window.AppDialogService.openModal('modal-user-edit');
    },

    async handleUserFormSubmit(e) {
      if (e) e.preventDefault();
      const username = document.getElementById('user-form-username').value.trim();
      const fullName = document.getElementById('user-form-fullname').value.trim();
      const email = document.getElementById('user-form-email').value.trim();
      const role = document.getElementById('user-form-role').value;
      const department = document.getElementById('user-form-dept').value;
      const branch = document.getElementById('user-form-branch').value;
      const active = document.getElementById('user-form-active').checked;
      const mfaEnabled = document.getElementById('user-form-mfa').checked;

      if (!username) {
        window.AppDialogService.showToast('Username is required.', 'error');
        return;
      }

      try {
        if (!editingUserId) {
          const password = document.getElementById('user-form-password').value;
          if (!password) {
            window.AppDialogService.showToast('Initial password is required for new accounts.', 'error');
            return;
          }
          await window.ReportService.saveUser({
            username, fullName, email, role, department, branch, password,
            active, locked: !active, mfaEnabled, rowVersion: 1
          });
          window.AppDialogService.showToast(`User ${username} provisioned successfully!`, 'success');
        } else {
          const u = cachedUsers.find(x => x.id === editingUserId);
          await window.ReportService.updateUser(editingUserId, {
            id: editingUserId,
            username, fullName, email, role, department, branch,
            active, locked: !active, mfaEnabled,
            rowVersion: (u && u.rowVersion != null) ? u.rowVersion : 0
          });
          window.AppDialogService.showToast(`User ${username} updated successfully!`, 'success');
        }

        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.closeModal('modal-user-edit');
        this.loadUsers();
      } catch (err) {
        window.AppDialogService.showToast(err.message, 'error');
      }
    },

    async toggleLockUser(id, lockState) {
      const u = cachedUsers.find(x => x.id === id);
      const action = lockState ? 'lock' : 'unlock';
      if (!confirm(`Are you sure you want to ${action} account "${u ? u.username : id}"?`)) return;

      try {
        await window.ReportService.lockUser(id, lockState);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`User account ${action}ed!`, 'success');
        this.loadUsers();
      } catch (err) {
        window.AppDialogService.showToast(err.message, 'error');
      }
    },

    openPasswordModal(id, username) {
      editingUserId = id;
      document.getElementById('pwd-modal-user').textContent = username;
      document.getElementById('pwd-form-password').value = '';
      document.getElementById('pwd-form-confirm').value = '';
      window.AppDialogService.openModal('modal-user-password');
    },

    async submitPasswordReset(e) {
      if (e) e.preventDefault();
      const p1 = document.getElementById('pwd-form-password').value;
      const p2 = document.getElementById('pwd-form-confirm').value;

      if (!p1 || p1.length < 6) {
        window.AppDialogService.showToast('Password must be at least 6 characters long.', 'error');
        return;
      }
      if (p1 !== p2) {
        window.AppDialogService.showToast('Password confirmation does not match.', 'error');
        return;
      }

      try {
        await window.ApiService.post(`/api/admin/users/${editingUserId}/password`, { password: p1 });
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Password reset completed successfully!', 'success');
        window.AppDialogService.closeModal('modal-user-password');
      } catch (err) {
        window.AppDialogService.showToast(err.message, 'error');
      }
    },

    async deleteUser(id, username) {
      if (!confirm(`Are you sure you want to permanently revoke and delete user "${username}"?`)) return;
      try {
        await window.ReportService.deleteUser(id);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`User ${username} deleted.`, 'success');
        this.loadUsers();
      } catch (err) {
        window.AppDialogService.showToast(err.message, 'error');
      }
    },

    // ==========================================
    // 5. REGISTRATION APPROVALS (RegistrationApprovals.fxml)
    // ==========================================
    async openRegistrationApprovals() {
      window.AppDialogService.openModal('modal-registration-approvals');
      const tbody = document.getElementById('registrations-table-tbody');
      if (!tbody) return;
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-dim);"><div class="spinner"></div> Loading pending registrations...</td></tr>`;

      try {
        const res = await window.ReportService.getRegistrations('PENDING_ADMIN_APPROVAL');
        cachedRegistrations = Array.isArray(res) ? res : [];

        if (cachedRegistrations.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-dim);">No pending user registrations awaiting approval.</td></tr>`;
          return;
        }

        tbody.innerHTML = cachedRegistrations.map(r => `
          <tr>
            <td style="font-weight: 700; color: #fff;">${r.fullName || r.username}</td>
            <td style="color: var(--cyan); font-family: monospace;">${r.username}</td>
            <td style="font-size: 0.85rem; color: var(--text-muted);">${r.email}</td>
            <td><span class="badge badge-role">${r.requestedRole || 'STAFF'}</span></td>
            <td><span class="badge ${r.emailVerified ? 'badge-paid' : 'badge-pending'}">${r.emailVerified ? 'VERIFIED' : 'UNVERIFIED'}</span></td>
            <td style="font-size: 0.75rem; color: var(--text-dim);">${window.FormatUtil.formatDateTime(r.requestedAt)}</td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="btn btn-primary" style="padding: 3px 8px; font-size: 0.72rem; margin-right: 4px;" onclick="window.UserAccessController.approveRegistration(${r.id}, '${r.requestedRole}')">Approve</button>
              <button class="btn btn-secondary" style="padding: 3px 8px; font-size: 0.72rem; color: #f87171;" onclick="window.UserAccessController.rejectRegistration(${r.id})">Reject</button>
            </td>
          </tr>
        `).join('');
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #f87171; padding: 20px;">Failed to load registrations: ${err.message}</td></tr>`;
      }
    },

    async approveRegistration(id, defaultRole) {
      const assignedRole = prompt(`Confirm approved role for this registration:`, defaultRole || 'STAFF');
      if (!assignedRole) return;
      try {
        await window.ReportService.approveRegistration(id, { role: assignedRole, reason: 'Approved by administrator', rowVersion: 1 });
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Registration approved successfully!', 'success');
        this.openRegistrationApprovals();
        this.loadUsers();
      } catch (err) {
        window.AppDialogService.showToast(err.message, 'error');
      }
    },

    async rejectRegistration(id) {
      const reason = prompt('Specify rejection reason for the applicant:');
      if (!reason) return;
      try {
        await window.ReportService.rejectRegistration(id, { role: '', reason, rowVersion: 1 });
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Registration rejected.', 'info');
        this.openRegistrationApprovals();
      } catch (err) {
        window.AppDialogService.showToast(err.message, 'error');
      }
    },

    // ==========================================
    // 6. GLOBAL AUDIT TRAIL (GlobalAudit.fxml)
    // ==========================================
    async loadAudit(page = 0) {
      const tbody = document.getElementById('audit-table-tbody');
      if (!tbody) return;
      currentAuditPage = page;
      tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 24px; color: var(--text-dim);"><div class="spinner"></div> Querying global audit ledger...</td></tr>`;

      const mod = document.getElementById('audit-filter-module') ? document.getElementById('audit-filter-module').value : '';
      const act = document.getElementById('audit-filter-action') ? document.getElementById('audit-filter-action').value : '';
      const usr = document.getElementById('audit-filter-user') ? document.getElementById('audit-filter-user').value.trim() : '';
      const ref = document.getElementById('audit-filter-ref') ? document.getElementById('audit-filter-ref').value.trim() : '';
      const q = document.getElementById('audit-filter-q') ? document.getElementById('audit-filter-q').value.trim() : '';

      try {
        const res = await window.ReportService.getAuditLogs({
          page,
          size: 50,
          module: mod,
          action: act,
          user: usr,
          reference: ref,
          q
        });

        cachedAuditPage = res;
        const rows = (res && res.rows) ? res.rows : (Array.isArray(res) ? res : []);

        // 5 Audit KPIs matching GlobalAudit.fxml
        if (document.getElementById('audit-kpi-total')) document.getElementById('audit-kpi-total').textContent = res ? (res.total || rows.length) : rows.length;
        if (document.getElementById('audit-kpi-changes')) document.getElementById('audit-kpi-changes').textContent = res ? (res.businessChanges || 0) : 0;
        if (document.getElementById('audit-kpi-financial')) document.getElementById('audit-kpi-financial').textContent = res ? (res.financialEvents || 0) : 0;
        if (document.getElementById('audit-kpi-documents')) document.getElementById('audit-kpi-documents').textContent = res ? (res.documentEvents || 0) : 0;
        if (document.getElementById('audit-kpi-communications')) document.getElementById('audit-kpi-communications').textContent = res ? (res.communications || 0) : 0;

        if (document.getElementById('audit-page-info')) {
          const totalP = res && res.totalPages ? res.totalPages : 1;
          document.getElementById('audit-page-info').textContent = `Page ${page + 1} of ${totalP} (${res ? res.total : rows.length} records)`;
        }

        if (rows.length === 0) {
          tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 24px; color: var(--text-dim);">No audit events matching current search criteria.</td></tr>`;
          return;
        }

        tbody.innerHTML = rows.map((evt, idx) => {
          const actionBadge = `<span class="badge badge-paid" style="font-weight:700;">${evt.action || 'MUTATION'}</span>`;
          const changesCount = evt.changes && evt.changes.length ? `${evt.changes.length} fields` : '-';
          const firstChange = evt.changes && evt.changes.length > 0 ? evt.changes[0] : null;

          return `
            <tr>
              <td style="font-size: 0.75rem; color: var(--text-dim); white-space: nowrap;">${window.FormatUtil.formatDateTime(evt.createdAt)}</td>
              <td style="font-weight: 700; color: var(--cyan);">${evt.category || evt.entityType || 'CORE'}</td>
              <td style="font-size: 0.8rem;">${evt.entityType || '-'}</td>
              <td style="font-family: monospace; font-weight: 600;">${evt.referenceNo || evt.entityId || '-'}</td>
              <td>${actionBadge}</td>
              <td style="font-size: 0.8rem; color: var(--text-muted);">${evt.detail || '-'}</td>
              <td style="font-size: 0.8rem; color: var(--cyan);">${firstChange ? firstChange.fieldName : changesCount}</td>
              <td style="font-size: 0.75rem; color: #f87171; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${firstChange ? (firstChange.oldValue || '-') : '-'}</td>
              <td style="font-size: 0.75rem; color: #34d399; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${firstChange ? (firstChange.newValue || '-') : '-'}</td>
              <td style="font-weight: 600; color: #fff;">${evt.createdBy || 'system'}</td>
              <td style="text-align: right;">
                <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.72rem;" onclick="window.UserAccessController.openAuditDiff(${idx})" title="View Event Diff">Diff Details</button>
              </td>
            </tr>
          `;
        }).join('');
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #f87171; padding: 24px;">Failed to load audit logs: ${err.message}</td></tr>`;
      }
    },

    nextAuditPage() {
      if (cachedAuditPage && currentAuditPage < (cachedAuditPage.totalPages - 1)) {
        this.loadAudit(currentAuditPage + 1);
      }
    },

    prevAuditPage() {
      if (currentAuditPage > 0) {
        this.loadAudit(currentAuditPage - 1);
      }
    },

    applyAuditFilters() {
      this.loadAudit(0);
    },

    clearAuditFilters() {
      if (document.getElementById('audit-filter-module')) document.getElementById('audit-filter-module').value = '';
      if (document.getElementById('audit-filter-action')) document.getElementById('audit-filter-action').value = '';
      if (document.getElementById('audit-filter-user')) document.getElementById('audit-filter-user').value = '';
      if (document.getElementById('audit-filter-ref')) document.getElementById('audit-filter-ref').value = '';
      if (document.getElementById('audit-filter-q')) document.getElementById('audit-filter-q').value = '';
      this.loadAudit(0);
    },

    openAuditDiff(idx) {
      if (!cachedAuditPage || !cachedAuditPage.rows || !cachedAuditPage.rows[idx]) return;
      const evt = cachedAuditPage.rows[idx];

      document.getElementById('audit-diff-title').textContent = `Audit Event #${evt.id} - ${evt.action || 'MUTATION'}`;
      document.getElementById('audit-diff-meta').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
          <div><div style="font-size: 0.72rem; color: var(--text-dim);">ENTITY / MODULE</div><div style="font-weight: 700; color: var(--cyan);">${evt.entityType} (${evt.category || 'GENERAL'})</div></div>
          <div><div style="font-size: 0.72rem; color: var(--text-dim);">REFERENCE NO</div><div style="font-weight: 700; color: #fff;">${evt.referenceNo || evt.entityId}</div></div>
          <div><div style="font-size: 0.72rem; color: var(--text-dim);">PERFORMED BY</div><div style="font-weight: 700; color: #fff;">${evt.createdBy || 'system'}</div></div>
          <div><div style="font-size: 0.72rem; color: var(--text-dim);">TIMESTAMP</div><div style="font-weight: 700; color: var(--text-muted);">${window.FormatUtil.formatDateTime(evt.createdAt)}</div></div>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;"><strong>Event Detail:</strong> ${evt.detail || 'None'}</div>
      `;

      const tbody = document.getElementById('audit-diff-tbody');
      if (tbody) {
        if (!evt.changes || evt.changes.length === 0) {
          tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-dim); padding: 16px;">No granular field mutations captured for this high-level lifecycle event.</td></tr>`;
        } else {
          tbody.innerHTML = evt.changes.map(ch => `
            <tr>
              <td style="font-weight: 700; color: var(--cyan);">${ch.fieldName}</td>
              <td style="background: rgba(239,68,68,0.1); color: #f87171; font-family: monospace; font-size: 0.8rem;">${ch.oldValue != null ? ch.oldValue : '<span style="color:var(--text-dim)">null</span>'}</td>
              <td style="background: rgba(16,185,129,0.1); color: #34d399; font-family: monospace; font-size: 0.8rem;">${ch.newValue != null ? ch.newValue : '<span style="color:var(--text-dim)">null</span>'}</td>
            </tr>
          `).join('');
        }
      }

      window.AppDialogService.openModal('modal-audit-diff');
    }
  };
})();

// Install escape listener for User Detail Drawer
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.installEscapeClose('user-detail-drawer', () => {
        if (window.UserAccessController && window.UserAccessController.closeUserDrawer) {
          window.UserAccessController.closeUserDrawer();
        }
      });
    }
  });
}

