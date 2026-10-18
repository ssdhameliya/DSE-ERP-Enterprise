/**
 * Jasvi Industries ERP - UserAccessController
 * Full Desktop Parity for User Access & RBAC, Registration Approvals, Permission Matrix & Global Audit Trail
 * Reference: UserAccess.fxml, UserAccessController.java, UserDialog.fxml, UserDialogController.java,
 *            RegistrationApprovals.fxml, RegistrationApprovalsController.java,
 *            PermissionMatrix.fxml, PermissionMatrixController.java, PermissionCatalog.java,
 *            GlobalAudit.fxml, AuditController.java
 */
window.UserAccessController = (function() {
  // State registries
  let cachedUsers = [];
  let cachedRoles = [];
  let cachedRegistrations = [];
  let cachedAuditPage = null;
  let currentAuditPage = 0;
  let activeTab = 'tab-users';

  let selectedUserId = null;
  let selectedUser = null;
  let selectedTargetUserId = null;
  let editingUserId = null;
  let selectedRegId = null;

  // Permission Matrix State
  let currentPermRole = null;
  let cachedPermissions = [];
  let permissionRowVersion = 0;
  let permissionsDirty = false;
  let grantedOnlyFilter = false;
  let searchPermText = '';

  // -------------------------------------------------------------
  // Permission Catalog Definition (Replicating PermissionCatalog.java)
  // -------------------------------------------------------------
  const COMMON_ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'APPROVE'];

  const MODULES_CATALOG = [
    // Dashboard & Insights (10)
    { key: 'DASHBOARD', label: 'Dashboard', category: 'Dashboard & Insights', order: 10, special: [] },

    // Sales (20)
    { key: 'SALES', label: 'Sales Register', category: 'Sales', order: 20, special: [] },
    { key: 'QUOTATION', label: 'Quotation', category: 'Sales', order: 21, special: [] },
    { key: 'CUSTOMERS', label: 'Customers', category: 'Sales', order: 22, special: [] },
    { key: 'COMMUNICATION', label: 'Communication', category: 'Sales', order: 23, special: ['RESEND'] },
    { key: 'REMINDERS', label: 'Reminders', category: 'Sales', order: 24, special: ['REMIND', 'COMPLETE', 'SNOOZE'] },
    { key: 'CREDIT_NOTE', label: 'Credit Notes', category: 'Sales', order: 25, special: [] },

    // Purchase (30)
    { key: 'PURCHASE', label: 'Purchase Register', category: 'Purchase', order: 30, special: [] },
    { key: 'SUPPLIERS', label: 'Suppliers', category: 'Purchase', order: 31, special: [] },
    { key: 'DEBIT_NOTE', label: 'Debit Notes', category: 'Purchase', order: 32, special: [] },

    // Inventory (40)
    { key: 'INVENTORY', label: 'Inventory / Item Master', category: 'Inventory', order: 40, special: [] },
    { key: 'IMPORT', label: 'Data Import', category: 'Inventory', order: 41, special: [] },
    { key: 'BARCODE', label: 'Barcode Studio', category: 'Inventory', order: 42, special: [] },

    // Finance & Banking (50)
    { key: 'BANK_EXPENSE', label: 'Finance & Banking', category: 'Finance & Banking', order: 50, special: ['RECONCILE'] },

    // Finance & Compliance (52)
    { key: 'GST_COMPLIANCE', label: 'GST Compliance', category: 'Finance & Compliance', order: 52, special: ['RECONCILE'] },
    { key: 'EWAY_BILL', label: 'E-Way Bill & E-Invoice', category: 'Finance & Compliance', order: 53, special: ['GENERATE', 'UPDATE_VEHICLE'] },
    { key: 'PURCHASE_RECON', label: 'Purchase Recon (2B)', category: 'Finance & Compliance', order: 54, special: ['MATCH'] },
    { key: 'RECON_SUPPLIER', label: 'Recon Suppliers', category: 'Finance & Compliance', order: 55, special: ['MATCH'] },
    { key: 'GENERAL_LEDGER', label: 'General Ledger & Accounts', category: 'Finance & Compliance', order: 56, special: ['POST'] },
    { key: 'FINANCIAL_STATEMENTS', label: 'Financial Statements (P&L / BS)', category: 'Finance & Compliance', order: 57, special: [] },
    { key: 'AGING_ANALYSIS', label: 'AR / AP Aging Analysis', category: 'Finance & Compliance', order: 58, special: [] },

    // Masters (60)
    { key: 'MASTERS', label: 'Masters', category: 'Masters', order: 60, special: [] },

    // Reports (70)
    { key: 'REPORTS', label: 'Reports', category: 'Reports', order: 70, special: [] },

    // Document Studio (80)
    { key: 'DOCUMENT_STUDIO', label: 'Document Studio', category: 'Document Studio', order: 80, special: ['EXPORT_PDF', 'MANAGE_TEMPLATES'] },

    // Administration (90)
    { key: 'USERS', label: 'User Access', category: 'Administration', order: 90, special: ['MANAGE_ROLES', 'MANAGE_PERMISSIONS'] },
    { key: 'SETTINGS', label: 'Settings', category: 'Administration', order: 91, special: [] },
    { key: 'BACKUP', label: 'Backup & Restore', category: 'Administration', order: 92, special: [] },
    { key: 'APPLICATION_UPDATES', label: 'Application Updates', category: 'Administration', order: 93, special: [] },
    { key: 'SAFE_ROLLBACK', label: 'Safe Rollback', category: 'Administration', order: 94, special: [] },
    { key: 'AUTOMATION', label: 'Automation Center', category: 'Administration', order: 95, special: ['EXECUTE'] },
    { key: 'AUDIT', label: 'Global Audit Trail', category: 'Administration', order: 96, special: ['GLOBAL'] }
  ];

  const SALES_MODULES = new Set([
    'DASHBOARD', 'SALES', 'QUOTATION', 'CUSTOMERS', 'COMMUNICATION', 'REMINDERS', 'REPORTS', 'INVENTORY', 'CREDIT_NOTE'
  ]);

  const ADMINISTRATION_MODULES = new Set([
    'USERS', 'SETTINGS', 'BACKUP', 'APPLICATION_UPDATES', 'SAFE_ROLLBACK', 'AUTOMATION', 'AUDIT'
  ]);

  function getActionLabel(action) {
    const act = (action || '').toUpperCase();
    switch (act) {
      case 'EXPORT_PDF': return 'Export PDF';
      case 'MANAGE_TEMPLATES': return 'Manage Templates';
      case 'MANAGE_ROLES': return 'Manage Roles';
      case 'MANAGE_PERMISSIONS': return 'Manage Permissions';
      case 'GLOBAL': return 'Global Audit';
      case 'RECONCILE': return 'Reconcile';
      case 'MATCH': return 'Match';
      case 'EXECUTE': return 'Execute';
      case 'POST': return 'Post';
      case 'GENERATE': return 'Generate';
      case 'UPDATE_VEHICLE': return 'Update Vehicle';
      case 'REMIND': return 'Send Reminder';
      case 'RESEND': return 'Resend';
      case 'COMPLETE': return 'Complete';
      case 'SNOOZE': return 'Snooze';
      default:
        return act.charAt(0) + act.slice(1).toLowerCase().replace(/_/g, ' ');
    }
  }

  function templateAllows(templateKey, module, action) {
    const m = (module || '').toUpperCase();
    const a = (action || '').toUpperCase();
    switch (templateKey) {
      case 'READ_ONLY':
        return !ADMINISTRATION_MODULES.has(m) && a === 'VIEW';
      case 'SALES_STANDARD':
        if (!SALES_MODULES.has(m)) return false;
        if (m === 'DASHBOARD' || m === 'REPORTS' || m === 'INVENTORY') return a === 'VIEW' || a === 'EXPORT';
        if (m === 'REMINDERS') return ['VIEW', 'CREATE', 'EDIT', 'COMPLETE', 'SNOOZE'].includes(a);
        if (m === 'COMMUNICATION') return ['VIEW', 'CREATE', 'EDIT', 'RESEND'].includes(a);
        return ['VIEW', 'CREATE', 'EDIT', 'EXPORT'].includes(a);
      case 'MANAGER_STANDARD':
        if (ADMINISTRATION_MODULES.has(m)) return false;
        if (m === 'DOCUMENT_STUDIO') return ['VIEW', 'CREATE', 'EDIT', 'EXPORT_PDF', 'MANAGE_TEMPLATES'].includes(a);
        if (m === 'BANK_EXPENSE') return ['VIEW', 'CREATE', 'EDIT', 'EXPORT', 'RECONCILE', 'APPROVE'].includes(a);
        if (m === 'GST_COMPLIANCE') return ['VIEW', 'EXPORT', 'RECONCILE'].includes(a);
        if (m === 'GENERAL_LEDGER') return ['VIEW', 'CREATE', 'POST', 'EXPORT'].includes(a);
        return a !== 'DELETE' || ['SALES', 'PURCHASE', 'QUOTATION', 'CUSTOMERS', 'SUPPLIERS', 'INVENTORY', 'MASTERS'].includes(m);
      case 'BUSINESS_FULL':
        return !ADMINISTRATION_MODULES.has(m);
      default:
        return false;
    }
  }

  return {
    // ==========================================
    // 0. DYNAMIC ROLE LOOKUPS (No Mock Data)
    // ==========================================
    async fetchRoles() {
      try {
        const res = await window.ReportService.getRoles();
        cachedRoles = Array.isArray(res) ? res : (res && res.rows ? res.rows : []);

        // Filter active roles
        const activeRoles = cachedRoles.filter(r => r.active !== false);

        // 1. Populate User Management Table Filter (#user-filter-role)
        const filterRoleEl = document.getElementById('user-filter-role');
        if (filterRoleEl) {
          const curVal = filterRoleEl.value;
          filterRoleEl.innerHTML = '<option value="">All Roles</option>' +
            activeRoles.map(r => `<option value="${r.code || r.name}" ${curVal === (r.code || r.name) ? 'selected' : ''}>${r.displayName || r.code || r.name}</option>`).join('');
        }

        // 2. Populate Add/Edit User Form (#user-form-role)
        const formRoleEl = document.getElementById('user-form-role');
        if (formRoleEl) {
          const curVal = formRoleEl.value;
          formRoleEl.innerHTML = activeRoles.map(r => 
            `<option value="${r.code || r.name}" ${curVal === (r.code || r.name) ? 'selected' : ''}>${r.displayName || r.code || r.name}</option>`
          ).join('');
        }

        // 3. Populate Registration Approvals Role Assignment (#reg-assign-role)
        const regRoleEl = document.getElementById('reg-assign-role');
        if (regRoleEl) {
          const nonAdmin = activeRoles.filter(r => (r.code || r.name || '').toUpperCase() !== 'ADMIN');
          regRoleEl.innerHTML = nonAdmin.map(r => 
            `<option value="${r.code || r.name}">${r.displayName || r.code || r.name}</option>`
          ).join('');
        }

        // 4. Populate Permission Matrix Role Select (#perm-role-select)
        const permRoleEl = document.getElementById('perm-role-select');
        if (permRoleEl) {
          const curVal = permRoleEl.value || (activeRoles.length > 0 ? (activeRoles[0].code || activeRoles[0].name) : 'ADMIN');
          permRoleEl.innerHTML = activeRoles.map(r => 
            `<option value="${r.code || r.name}" ${curVal === (r.code || r.name) ? 'selected' : ''}>${r.displayName || r.code || r.name}</option>`
          ).join('');
        }

        // 5. Populate Permission Matrix Copy-From Role Select (#perm-copy-role-select)
        this.rebuildCopyRoles();

        return cachedRoles;
      } catch (err) {
        console.warn('Failed to load active roles:', err);
        return [];
      }
    },

    rebuildCopyRoles() {
      const copyRoleEl = document.getElementById('perm-copy-role-select');
      if (!copyRoleEl) return;
      const curRole = (currentPermRole || '').toUpperCase();
      const choices = cachedRoles.filter(r => {
        const c = (r.code || r.name || '').toUpperCase();
        return c !== curRole && c !== 'ADMIN' && r.active !== false;
      });
      copyRoleEl.innerHTML = choices.length > 0
        ? choices.map(r => `<option value="${r.code || r.name}">${r.displayName || r.code || r.name}</option>`).join('')
        : '<option value="">No roles available to copy</option>';
    },

    openManageRoles() {
      if (window.NavigationRouter) {
        window.NavigationRouter.navigate('masters');
      }
      setTimeout(() => {
        if (window.MasterDataController && window.MasterDataController.selectCategory) {
          window.MasterDataController.selectCategory('ROLE');
        }
      }, 120);
    },

    // ==========================================
    // 1. USER ACCOUNTS & RBAC (UserAccess.fxml)
    // ==========================================
    async loadUsers() {
      const tbody = document.getElementById('users-table-tbody');
      if (!tbody) return;
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 24px; color: var(--text-dim);"><div class="spinner"></div> Loading system users...</td></tr>`;

      try {
        await this.fetchRoles();

        const res = await window.ReportService.getUsers();
        cachedUsers = Array.isArray(res) ? res : (res && res.rows ? res.rows : []);

        // 5 Desktop KPIs matching UserAccess.fxml
        const total = cachedUsers.length;
        const active = cachedUsers.filter(u => u.active && !u.locked).length;
        const roles = new Set(cachedUsers.map(u => (u.role || '').toUpperCase())).size;
        const locked = cachedUsers.filter(u => u.locked || !u.active).length;
        const mfa = cachedUsers.filter(u => u.mfaEnabled).length;

        if (document.getElementById('user-kpi-total')) document.getElementById('user-kpi-total').textContent = total;
        if (document.getElementById('user-kpi-active')) document.getElementById('user-kpi-active').textContent = active;
        if (document.getElementById('user-kpi-roles')) document.getElementById('user-kpi-roles').textContent = roles;
        if (document.getElementById('user-kpi-locked')) document.getElementById('user-kpi-locked').textContent = locked;
        if (document.getElementById('user-kpi-mfa')) document.getElementById('user-kpi-mfa').textContent = mfa;

        // Populate branches in filter (#user-filter-branch)
        const branchEl = document.getElementById('user-filter-branch');
        if (branchEl) {
          const curBranch = branchEl.value;
          const branches = [...new Set(cachedUsers.map(u => (u.branch || '').trim()).filter(Boolean))].sort();
          branchEl.innerHTML = '<option value="">All Branches</option>' +
            branches.map(b => `<option value="${b}" ${b === curBranch ? 'selected' : ''}>${b}</option>`).join('');
        }

        if (cachedUsers.length === 0) {
          tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 24px; color: var(--text-dim);">No user accounts configured. Click "+ Add New User" to provision.</td></tr>`;
          return;
        }

        this.applyUserFilters();
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #f87171; padding: 24px;">Failed to load users: ${err.message}</td></tr>`;
      }
    },

    onFilterChange() {
      this.applyUserFilters();
    },

    filterUsers(q) {
      this.applyUserFilters(q);
    },

    applyUserFilters(searchOverride) {
      const searchInput = document.getElementById('user-search-input');
      const q = (searchOverride !== undefined ? searchOverride : (searchInput ? searchInput.value : '')).trim().toLowerCase();
      const roleFilter = (document.getElementById('user-filter-role')?.value || '').toUpperCase();
      const statusFilter = (document.getElementById('user-filter-status')?.value || '').toUpperCase();
      const branchFilter = (document.getElementById('user-filter-branch')?.value || '').toUpperCase();

      const filtered = cachedUsers.filter(u => {
        // Text search
        if (q) {
          const name = (u.fullName || '').toLowerCase();
          const uname = (u.username || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          const dept = (u.department || '').toLowerCase();
          const br = (u.branch || '').toLowerCase();
          if (!name.includes(q) && !uname.includes(q) && !email.includes(q) && !dept.includes(q) && !br.includes(q)) {
            return false;
          }
        }
        // Role filter
        if (roleFilter && (u.role || '').toUpperCase() !== roleFilter) {
          return false;
        }
        // Status filter
        if (statusFilter) {
          const isLocked = u.locked || !u.active;
          if (statusFilter === 'ACTIVE' && isLocked) return false;
          if (statusFilter === 'INACTIVE' && (u.active || u.locked)) return false;
          if (statusFilter === 'LOCKED' && !isLocked) return false;
        }
        // Branch filter
        if (branchFilter && (u.branch || '').toUpperCase() !== branchFilter) {
          return false;
        }
        return true;
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
          : (u.active ? `<span class="badge badge-paid">ACTIVE</span>` : `<span class="badge badge-overdue">INACTIVE</span>`);
        const mfaBadge = u.mfaEnabled
          ? `<span class="badge badge-paid">&#128274; ENABLED</span>`
          : `<span class="badge badge-pending">OPTIONAL</span>`;
        
        const roleObj = cachedRoles.find(r => (r.code || r.name || '').toUpperCase() === (u.role || '').toUpperCase());
        const roleDisplayName = roleObj ? (roleObj.displayName || roleObj.code || roleObj.name) : (u.role || 'USER');
        const roleBadge = `<span class="badge badge-role" style="background: rgba(168,85,247,0.15); color: #c084fc; border: 1px solid rgba(168,85,247,0.3); font-weight:700;">${roleDisplayName}</span>`;
        const isSelected = selectedUserId === u.id;

        return `
          <tr onclick="window.UserAccessController.onUserRowClick(${u.id}, event)" data-user-id="${u.id}" class="${isSelected ? 'active-selected-row' : ''}" style="cursor: pointer;">
            <td>
              <div style="font-weight: 700; color: #fff;">${u.fullName || u.username}</div>
            </td>
            <td>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${u.email || '-'}</div>
              <div style="font-size: 0.75rem; color: var(--cyan); font-family: monospace;">@${u.username || '-'}</div>
            </td>
            <td>${roleBadge}</td>
            <td style="font-size: 0.8rem; color: var(--text-main);">${u.department || 'GENERAL'}</td>
            <td>
              <span style="font-weight: 600; color: var(--purple); font-size: 0.8rem;">${u.accessLevel || 'STANDARD'}</span>
            </td>
            <td style="font-size: 0.8rem;">${u.branch || 'HEADQUARTERS'}</td>
            <td>${statusBadge}</td>
            <td style="font-size: 0.78rem; color: var(--text-dim);">${u.lastLogin ? window.FormatUtil.formatDateTime(u.lastLogin) : 'Never'}</td>
            <td>${mfaBadge}</td>
            <td style="text-align: right;" onclick="event.stopPropagation()">
              <button class="btn-purple" style="height: 28px; padding: 0 10px; font-size: 0.74rem; font-weight: 700; border-radius: 4px;" 
                      onclick="window.UserAccessController.toggleRowActionsMenu(this, ${u.id}, event)" 
                      title="User Actions">
                Actions &#9660;
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

      const roleObj = cachedRoles.find(r => (r.code || r.name || '').toUpperCase() === (u.role || '').toUpperCase());
      const roleDisplayName = roleObj ? (roleObj.displayName || roleObj.code || roleObj.name) : (u.role || 'USER');

      setEl('ud-role', roleDisplayName);
      setEl('ud-access', u.accessLevel || 'STANDARD');
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
        document.querySelectorAll('#users-table-tbody tr').forEach(r => r.classList.remove('active-selected-row'));
        const rowEl = document.querySelector(`#users-table-tbody tr[data-user-id="${id}"]`);
        if (rowEl) rowEl.classList.add('active-selected-row');
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

    drawerResetAuthenticator() {
      if (selectedUserId) this.resetAuthenticator(selectedUserId);
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
      if (top + 220 > window.innerHeight) {
        top = Math.max(10, rect.top - 220);
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

    editSelectedUser() {
      const menu = document.getElementById('user-row-actions-menu');
      if (menu) menu.classList.remove('show');
      const targetId = selectedTargetUserId || selectedUserId;
      if (targetId) this.openEditUserModal(targetId);
      else window.AppDialogService.showToast('Please select a user account first.', 'warning');
    },

    resetSelectedUserPassword() {
      const menu = document.getElementById('user-row-actions-menu');
      if (menu) menu.classList.remove('show');
      const targetId = selectedTargetUserId || selectedUserId;
      const u = cachedUsers.find(x => x.id === targetId);
      if (u) this.openPasswordModal(u.id, u.username);
      else window.AppDialogService.showToast('Please select a user account first.', 'warning');
    },

    toggleSelectedUserLock() {
      const menu = document.getElementById('user-row-actions-menu');
      if (menu) menu.classList.remove('show');
      const targetId = selectedTargetUserId || selectedUserId;
      const u = cachedUsers.find(x => x.id === targetId);
      if (u) {
        const isLocked = u.locked || !u.active;
        this.toggleLockUser(u.id, !isLocked);
      }
    },

    toggleSelectedUserMfa() {
      const menu = document.getElementById('user-row-actions-menu');
      if (menu) menu.classList.remove('show');
      const targetId = selectedTargetUserId || selectedUserId;
      if (targetId) this.toggleMfaUser(targetId);
    },

    resetSelectedUserAuthenticator() {
      const menu = document.getElementById('user-row-actions-menu');
      if (menu) menu.classList.remove('show');
      const targetId = selectedTargetUserId || selectedUserId;
      if (targetId) this.resetAuthenticator(targetId);
    },

    viewSelectedUserPermissions() {
      const menu = document.getElementById('user-row-actions-menu');
      if (menu) menu.classList.remove('show');
      const targetId = selectedTargetUserId || selectedUserId;
      const u = cachedUsers.find(x => x.id === targetId);
      if (u && u.role) {
        currentPermRole = u.role.toUpperCase();
        if (window.NavigationRouter) {
          window.NavigationRouter.navigate('permission-matrix');
        }
      }
    },

    deleteSelectedUser() {
      const menu = document.getElementById('user-row-actions-menu');
      if (menu) menu.classList.remove('show');
      const targetId = selectedTargetUserId || selectedUserId;
      const u = cachedUsers.find(x => x.id === targetId);
      if (u) this.deleteUser(u.id, u.username);
    },

    async toggleLockUser(id, lockState) {
      const u = cachedUsers.find(x => x.id === id);
      const action = lockState ? 'lock' : 'unlock';
      if (!confirm(`Are you sure you want to ${action} account "${u ? u.username : id}"?`)) return;

      try {
        await window.ReportService.lockUser(id, lockState);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`User account ${action}ed successfully!`, 'success');
        this.loadUsers();
      } catch (err) {
        window.AppDialogService.showToast(err.message, 'error');
      }
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

    async resetAuthenticator(id) {
      const u = cachedUsers.find(x => x.id === id);
      if (!u) return;
      if (!confirm(`Reset Authenticator (2FA) for "${u.username}"?\n\nThe user's old phone will stop working. A new QR code enrollment will be required at the next sign-in.`)) {
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

    async deleteUser(id, username) {
      if ('admin'.localeCompare(username, undefined, { sensitivity: 'accent' }) === 0) {
        window.AppDialogService.showToast('The primary administrator cannot be deleted.', 'error');
        return;
      }
      if (!confirm(`Are you sure you want to permanently revoke and delete user "${username}"?`)) return;
      try {
        await window.ReportService.deleteUser(id);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`User ${username} deleted.`, 'success');
        this.closeUserDrawer();
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

      if (!p1 || p1.length < 8 || !/[A-Za-z]/.test(p1) || !/[0-9]/.test(p1)) {
        window.AppDialogService.showToast('Password must contain at least 8 characters, a letter and a number.', 'error');
        return;
      }
      if (p1 !== p2) {
        window.AppDialogService.showToast('Password confirmation does not match.', 'error');
        return;
      }

      try {
        await window.ReportService.resetUserPassword(editingUserId, p1);
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Password reset completed successfully!', 'success');
        window.AppDialogService.closeModal('modal-user-password');
      } catch (err) {
        window.AppDialogService.showToast(err.message, 'error');
      }
    },

    // ==========================================
    // 2. ADD USER vs EDIT USER MODAL (#modal-user-dialog)
    // ==========================================
    async openAddUserModal() {
      editingUserId = null;
      await this.fetchRoles();

      document.getElementById('user-dialog-title').textContent = 'Add New User';
      document.getElementById('user-dialog-subtitle').textContent = 'Identity, access and account security';
      document.getElementById('user-dialog-submit-btn').textContent = 'Create User';

      const unameEl = document.getElementById('user-form-username');
      unameEl.value = '';
      unameEl.disabled = false;
      document.getElementById('user-form-fullname').value = '';
      document.getElementById('user-form-email').value = '';
      document.getElementById('user-form-dept').value = '';
      document.getElementById('user-form-branch').value = '';
      document.getElementById('user-form-access').value = 'STANDARD';

      // Passwords are mandatory for Add User
      const pwdEl = document.getElementById('user-form-password');
      const confirmEl = document.getElementById('user-form-confirm');
      pwdEl.value = '';
      confirmEl.value = '';
      pwdEl.required = true;
      confirmEl.required = true;
      document.getElementById('user-form-password-label').textContent = 'Password *';
      document.getElementById('user-form-confirm-label').textContent = 'Confirm Password *';
      pwdEl.placeholder = '8+ chars, letter & number';
      confirmEl.placeholder = 'Repeat password';

      document.getElementById('user-form-active').checked = true;
      document.getElementById('user-form-locked').checked = false;
      document.getElementById('user-form-mfa').checked = true;

      // MFA status
      document.getElementById('user-dialog-mfa-policy').textContent = 'Admin Controlled / Required for non-Admin';
      document.getElementById('user-dialog-mfa-status').textContent = 'Enrollment required at first sign-in';

      const resetMfaBtn = document.getElementById('btn-dialog-reset-mfa');
      if (resetMfaBtn) resetMfaBtn.style.display = 'none';

      window.AppDialogService.openModal('modal-user-dialog');
    },

    async openEditUserModal(id) {
      const u = cachedUsers.find(x => x.id === id);
      if (!u) return;
      editingUserId = id;
      await this.fetchRoles();

      document.getElementById('user-dialog-title').textContent = 'Edit User Account';
      document.getElementById('user-dialog-subtitle').textContent = 'Update identity, role, access and account security';
      document.getElementById('user-dialog-submit-btn').textContent = 'Update User';

      const unameEl = document.getElementById('user-form-username');
      unameEl.value = u.username || '';
      unameEl.disabled = true;

      document.getElementById('user-form-fullname').value = u.fullName || '';
      document.getElementById('user-form-email').value = u.email || '';
      document.getElementById('user-form-role').value = u.role || 'STAFF';
      document.getElementById('user-form-dept').value = u.department || '';
      document.getElementById('user-form-branch').value = u.branch || '';
      document.getElementById('user-form-access').value = u.accessLevel || 'STANDARD';

      // Passwords are NOT mandatory for Edit User
      const pwdEl = document.getElementById('user-form-password');
      const confirmEl = document.getElementById('user-form-confirm');
      pwdEl.value = '';
      confirmEl.value = '';
      pwdEl.required = false;
      confirmEl.required = false;
      document.getElementById('user-form-password-label').textContent = 'Password (Optional)';
      document.getElementById('user-form-confirm-label').textContent = 'Confirm Password (Optional)';
      pwdEl.placeholder = 'Leave blank to keep current password';
      confirmEl.placeholder = 'Confirm new password';

      document.getElementById('user-form-active').checked = !!u.active;
      document.getElementById('user-form-locked').checked = !!u.locked;
      document.getElementById('user-form-mfa').checked = !!u.mfaEnabled;

      // MFA status
      document.getElementById('user-dialog-mfa-policy').textContent = 'Admin Controlled / Required for non-Admin';
      document.getElementById('user-dialog-mfa-status').textContent = u.mfaEnabled ? 'Configured & Active' : 'Enrollment required at first sign-in';

      const resetMfaBtn = document.getElementById('btn-dialog-reset-mfa');
      if (resetMfaBtn) {
        resetMfaBtn.style.display = u.mfaEnabled ? 'inline-block' : 'none';
      }

      window.AppDialogService.openModal('modal-user-dialog');
    },

    togglePasswordInputEye(inputId) {
      const input = document.getElementById(inputId);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
    },

    dialogResetAuthenticator() {
      if (editingUserId) {
        this.resetAuthenticator(editingUserId);
      }
    },

    async handleUserFormSubmit(e) {
      if (e) e.preventDefault();
      const username = document.getElementById('user-form-username').value.trim();
      const fullName = document.getElementById('user-form-fullname').value.trim();
      const email = document.getElementById('user-form-email').value.trim();
      const role = document.getElementById('user-form-role').value;
      const department = document.getElementById('user-form-dept').value.trim();
      const branch = document.getElementById('user-form-branch').value.trim();
      const accessLevel = document.getElementById('user-form-access').value;
      const active = document.getElementById('user-form-active').checked;
      const locked = document.getElementById('user-form-locked').checked;
      const mfaEnabled = document.getElementById('user-form-mfa').checked;
      const password = document.getElementById('user-form-password').value;
      const confirm = document.getElementById('user-form-confirm').value;

      if (!username) {
        window.AppDialogService.showToast('Username is required.', 'error');
        return;
      }
      if (!fullName) {
        window.AppDialogService.showToast('Full Name is required.', 'error');
        return;
      }
      if (!email || !email.includes('@')) {
        window.AppDialogService.showToast('Valid Email Address is required.', 'error');
        return;
      }
      if (!role) {
        window.AppDialogService.showToast('Role is required.', 'error');
        return;
      }

      try {
        if (!editingUserId) {
          // Provisioning New User: Password is required!
          if (!password) {
            window.AppDialogService.showToast('Password is required for new accounts.', 'error');
            return;
          }
          if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
            window.AppDialogService.showToast('Password must contain at least 8 characters, a letter and a number.', 'error');
            return;
          }
          if (password !== confirm) {
            window.AppDialogService.showToast('Password confirmation does not match.', 'error');
            return;
          }

          await window.ReportService.saveUser({
            username,
            fullName,
            email,
            role,
            department: department || 'GENERAL',
            branch: branch || 'HEADQUARTERS',
            accessLevel: accessLevel || 'STANDARD',
            password,
            active,
            locked,
            mfaEnabled,
            rowVersion: 0
          });
          window.AppDialogService.showToast(`User ${username} provisioned successfully!`, 'success');
        } else {
          // Updating Existing User: Password is optional!
          const u = cachedUsers.find(x => x.id === editingUserId);
          const payload = {
            id: editingUserId,
            username,
            fullName,
            email,
            role,
            department: department || 'GENERAL',
            branch: branch || 'HEADQUARTERS',
            accessLevel: accessLevel || 'STANDARD',
            active,
            locked,
            mfaEnabled,
            rowVersion: (u && u.rowVersion != null) ? u.rowVersion : 0
          };

          if (password && password.trim()) {
            if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
              window.AppDialogService.showToast('Password must contain at least 8 characters, a letter and a number.', 'error');
              return;
            }
            if (password !== confirm) {
              window.AppDialogService.showToast('Password confirmation does not match.', 'error');
              return;
            }
            payload.password = password;
          } else {
            payload.password = null;
          }

          await window.ReportService.updateUser(editingUserId, payload);
          window.AppDialogService.showToast(`User ${username} updated successfully!`, 'success');
        }

        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.closeModal('modal-user-dialog');
        this.loadUsers();
      } catch (err) {
        window.AppDialogService.showToast(err.message, 'error');
      }
    },

    // ==========================================
    // 3. REGISTRATION APPROVALS VIEW (#view-registration-approvals)
    // ==========================================
    async loadRegistrations() {
      const tbody = document.getElementById('reg-table-tbody');
      if (!tbody) return;
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-dim);"><div class="spinner"></div> Loading pending registrations...</td></tr>`;

      try {
        await this.fetchRoles();

        const [pendingAdmin, pendingMfa] = await Promise.all([
          window.ReportService.getRegistrations('PENDING_ADMIN_APPROVAL').catch(() => []),
          window.ReportService.getRegistrations('MFA_ENROLLMENT_PENDING').catch(() => [])
        ]);
        const listAdmin = Array.isArray(pendingAdmin) ? pendingAdmin : [];
        const listMfa = Array.isArray(pendingMfa) ? pendingMfa : [];
        const seen = new Set();
        cachedRegistrations = [...listAdmin, ...listMfa].filter(item => {
          if (!item || !item.id || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });

        // 2 KPIs
        const pendingCount = cachedRegistrations.length;
        const verifiedCount = cachedRegistrations.filter(r => r.emailVerified && r.mfaVerified).length;
        if (document.getElementById('reg-kpi-pending')) document.getElementById('reg-kpi-pending').textContent = pendingCount;
        if (document.getElementById('reg-kpi-verified')) document.getElementById('reg-kpi-verified').textContent = verifiedCount;

        if (cachedRegistrations.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-dim);">No pending user registrations awaiting approval.</td></tr>`;
          selectedRegId = null;
          return;
        }

        tbody.innerHTML = cachedRegistrations.map(r => {
          const isSelected = selectedRegId === r.id;
          const emailBadge = r.emailVerified
            ? '<span class="badge badge-paid">Verified</span>'
            : '<span class="badge badge-pending">Pending</span>';
          const mfaBadge = r.mfaVerified
            ? '<span class="badge badge-paid">Verified</span>'
            : '<span class="badge badge-pending">Pending</span>';
          const statusBadge = r.status === 'MFA_ENROLLMENT_PENDING'
            ? '<span class="badge badge-pending">2FA PENDING</span>'
            : '<span class="badge badge-paid">AWAITING</span>';

          return `
            <tr onclick="window.UserAccessController.onRegistrationRowClick(${r.id}, event)" data-reg-id="${r.id}" class="${isSelected ? 'active-selected-row' : ''}" style="cursor: pointer;">
              <td style="font-weight: 700; color: #fff;">${r.fullName || r.username} <span style="font-size:0.75rem; color:var(--cyan); font-family:monospace;">(@${r.username})</span></td>
              <td style="font-size: 0.82rem; color: var(--text-muted);">${r.email || '-'}</td>
              <td><span class="badge badge-role">${r.requestedRole || 'STAFF'}</span></td>
              <td style="text-align: center;">${emailBadge}</td>
              <td style="text-align: center;">${mfaBadge}</td>
              <td style="font-size: 0.78rem; color: var(--text-dim);">${window.FormatUtil.formatDateTime(r.requestedAt)}</td>
              <td>${statusBadge}</td>
            </tr>
          `;
        }).join('');

        // Select first registration by default if none selected
        if (!selectedRegId && cachedRegistrations.length > 0) {
          this.onRegistrationRowClick(cachedRegistrations[0].id);
        }
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #f87171; padding: 24px;">Failed to load registrations: ${err.message}</td></tr>`;
      }
    },

    onRegistrationRowClick(id, event) {
      selectedRegId = id;
      document.querySelectorAll('#reg-table-tbody tr').forEach(r => r.classList.remove('active-selected-row'));
      const rowEl = document.querySelector(`#reg-table-tbody tr[data-reg-id="${id}"]`);
      if (rowEl) rowEl.classList.add('active-selected-row');

      const reg = cachedRegistrations.find(x => x.id === id);
      if (reg && reg.requestedRole) {
        const assignRoleEl = document.getElementById('reg-assign-role');
        if (assignRoleEl) {
          const req = reg.requestedRole.toUpperCase();
          for (let opt of assignRoleEl.options) {
            if (opt.value.toUpperCase() === req) {
              opt.selected = true;
              break;
            }
          }
        }
      }
    },

    async approveSelectedRegistration() {
      if (!selectedRegId) {
        window.AppDialogService.showToast('Please select a pending registration first.', 'warning');
        return;
      }
      const reg = cachedRegistrations.find(x => x.id === selectedRegId);
      if (!reg) return;

      const roleEl = document.getElementById('reg-assign-role');
      const finalRole = roleEl ? roleEl.value : (reg.requestedRole || 'STAFF');

      if ('admin'.localeCompare(finalRole, undefined, { sensitivity: 'accent' }) === 0) {
        window.AppDialogService.showToast('Administrator accounts cannot be approved from self-registration.', 'error');
        return;
      }

      if (!confirm(`Approve registration for "${reg.fullName || reg.username}" with role "${finalRole}"?`)) return;

      try {
        await window.ReportService.approveRegistration(reg.id, {
          role: finalRole,
          reason: 'Approved by administrator',
          rowVersion: reg.rowVersion || 0
        });
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Registration approved successfully! User may now sign in.', 'success');
        selectedRegId = null;
        this.loadRegistrations();
        this.loadUsers();
      } catch (err) {
        window.AppDialogService.showToast(err.message, 'error');
      }
    },

    async rejectSelectedRegistration() {
      if (!selectedRegId) {
        window.AppDialogService.showToast('Please select a pending registration first.', 'warning');
        return;
      }
      const reg = cachedRegistrations.find(x => x.id === selectedRegId);
      if (!reg) return;

      const reason = prompt(`Specify rejection reason for ${reg.fullName || reg.username}:`, 'Registration declined by administrator');
      if (reason === null) return;

      try {
        await window.ReportService.rejectRegistration(reg.id, {
          role: '',
          reason: reason || 'Registration declined by administrator',
          rowVersion: reg.rowVersion || 0
        });
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast('Registration rejected.', 'info');
        selectedRegId = null;
        this.loadRegistrations();
      } catch (err) {
        window.AppDialogService.showToast(err.message, 'error');
      }
    },

    // ==========================================
    // 4. PERMISSION MATRIX WORKSPACE (#view-permission-matrix)
    // ==========================================
    async loadPermissionMatrix(roleCode) {
      await this.fetchRoles();

      const permRoleEl = document.getElementById('perm-role-select');
      const targetRole = roleCode || (permRoleEl ? permRoleEl.value : null) || (cachedRoles.length > 0 ? (cachedRoles[0].code || cachedRoles[0].name) : 'ADMIN');
      currentPermRole = (targetRole || 'ADMIN').toUpperCase();

      if (permRoleEl && permRoleEl.value !== currentPermRole) {
        permRoleEl.value = currentPermRole;
      }

      const tbody = document.getElementById('permission-matrix-tbody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px; color: var(--text-dim);"><div class="spinner"></div> Loading permissions matrix for ${currentPermRole}...</td></tr>`;
      }

      try {
        const res = await window.ReportService.getPermissions(currentPermRole);
        let list = [];
        if (res && res.permissions) {
          list = res.permissions;
          permissionRowVersion = res.rowVersion || 0;
        } else if (Array.isArray(res)) {
          list = res;
          permissionRowVersion = 0;
        }

        cachedPermissions = list;
        permissionsDirty = false;

        // Role hints & user count
        const roleObj = cachedRoles.find(r => (r.code || r.name || '').toUpperCase() === currentPermRole);
        const userCount = roleObj ? (roleObj.userCount != null ? roleObj.userCount : 0) : 0;
        const usersBadge = document.getElementById('perm-role-users-badge');
        if (usersBadge) usersBadge.textContent = `${userCount} ${userCount === 1 ? 'user uses' : 'users use'} this role`;

        const isAdmin = currentPermRole === 'ADMIN';
        const hintEl = document.getElementById('perm-hint-banner');
        if (hintEl) {
          hintEl.textContent = isAdmin
            ? 'Administrator receives full access by system policy. Review is available, but the matrix cannot be modified.'
            : `Changes apply to every user assigned to ${roleObj ? roleObj.displayName || currentPermRole : currentPermRole} in both LOCAL and company-server deployments.`;
        }

        this.rebuildCopyRoles();
        this.renderPermissionMatrix();
      } catch (err) {
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #f87171; padding: 24px;">Failed to load permissions: ${err.message}</td></tr>`;
        }
      }
    },

    onPermissionRoleChange(role) {
      if (permissionsDirty) {
        if (!confirm('You have unsaved permission changes. Do you want to discard them and switch role?')) {
          const permRoleEl = document.getElementById('perm-role-select');
          if (permRoleEl && currentPermRole) permRoleEl.value = currentPermRole;
          return;
        }
      }
      this.loadPermissionMatrix(role);
    },

    filterPermissionMatrix(val) {
      searchPermText = (val || '').trim().toLowerCase();
      this.renderPermissionMatrix();
    },

    toggleGrantedOnly(checked) {
      grantedOnlyFilter = !!checked;
      this.renderPermissionMatrix();
    },

    renderPermissionMatrix() {
      const tbody = document.getElementById('permission-matrix-tbody');
      if (!tbody) return;

      const isAdmin = currentPermRole === 'ADMIN';
      const search = searchPermText;
      const grantedOnly = grantedOnlyFilter;

      // Group modules by category
      const categoriesMap = new Map();
      MODULES_CATALOG.forEach(mod => {
        if (!categoriesMap.has(mod.category)) {
          categoriesMap.set(mod.category, []);
        }
        categoriesMap.get(mod.category).push(mod);
      });

      let totalCapabilities = 0;
      let totalGranted = 0;
      let html = '';

      for (let [categoryName, modules] of categoriesMap.entries()) {
        const matchingModules = modules.filter(mod => {
          // Check text match
          const matchesSearch = !search ||
            mod.label.toLowerCase().includes(search) ||
            mod.key.toLowerCase().includes(search) ||
            categoryName.toLowerCase().includes(search);
          if (!matchesSearch) return false;

          // Check granted only
          if (grantedOnly) {
            const hasGranted = cachedPermissions.some(p => 
              p.module.toUpperCase() === mod.key && p.allowed
            );
            if (!hasGranted) return false;
          }
          return true;
        });

        if (matchingModules.length === 0) continue;

        // Category Header Row
        html += `
          <tr class="permission-category-row">
            <td colspan="9" style="background: rgba(168,85,247,0.1); color: #c084fc; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.6px; padding: 8px 14px; border-top: 1px solid rgba(168,85,247,0.25);">
              &#9670; ${categoryName}
            </td>
          </tr>
        `;

        for (let mod of matchingModules) {
          const modKey = mod.key;
          const modPerms = cachedPermissions.filter(p => p.module.toUpperCase() === modKey);

          // Common capabilities
          const commonCells = COMMON_ACTIONS.map(action => {
            const p = modPerms.find(x => x.action.toUpperCase() === action);
            if (!p) {
              return `<td style="text-align:center; color:var(--text-dim); font-size:0.8rem;">&mdash;</td>`;
            }
            totalCapabilities++;
            if (p.allowed) totalGranted++;
            const checked = p.allowed ? 'checked' : '';
            const disabled = isAdmin ? 'disabled' : '';
            return `
              <td style="text-align:center;">
                <input type="checkbox" class="permission-matrix-chk" ${checked} ${disabled}
                       onchange="window.UserAccessController.toggleSinglePermission(${p.id}, this.checked)"
                       title="${p.description || action}">
              </td>
            `;
          }).join('');

          // "All" Column for this module
          const allAllowed = modPerms.length > 0 && modPerms.every(p => p.allowed);
          const someAllowed = modPerms.some(p => p.allowed);
          const allChecked = allAllowed ? 'checked' : '';
          const allIndeterminate = (!allAllowed && someAllowed) ? 'indeterminate' : '';
          const disabled = isAdmin ? 'disabled' : '';

          const allCell = `
            <td style="text-align:center;">
              <input type="checkbox" class="permission-matrix-chk" ${allChecked} ${disabled}
                     onchange="window.UserAccessController.toggleModuleAllPermissions('${modKey}', this.checked)"
                     title="Grant or revoke all capabilities for ${mod.label}">
            </td>
          `;

          // Special Column
          const specialPerms = modPerms.filter(p => !COMMON_ACTIONS.includes(p.action.toUpperCase()));
          let specialCell = '';

          if (specialPerms.length === 0) {
            specialCell = `<td style="text-align:center; color:var(--text-dim); font-size:0.8rem;">&mdash;</td>`;
          } else if (specialPerms.length === 1) {
            const sp = specialPerms[0];
            totalCapabilities++;
            if (sp.allowed) totalGranted++;
            const checked = sp.allowed ? 'checked' : '';
            specialCell = `
              <td style="text-align:center;">
                <input type="checkbox" class="permission-matrix-chk" ${checked} ${disabled}
                       onchange="window.UserAccessController.toggleSinglePermission(${sp.id}, this.checked)"
                       title="${getActionLabel(sp.action)}: ${sp.description || ''}">
              </td>
            `;
          } else {
            // Multiple special capabilities: Compact N / M ▼ Dropdown Menu
            const grantedCount = specialPerms.filter(p => p.allowed).length;
            totalCapabilities += specialPerms.length;
            totalGranted += grantedCount;

            specialCell = `
              <td style="text-align:center; position:relative;">
                <button type="button" class="btn btn-secondary btn-sm perm-special-dropdown-btn" 
                        onclick="window.UserAccessController.toggleSpecialMenu(this, '${modKey}', event)"
                        style="height: 22px; padding: 0 8px; font-size: 0.72rem; font-weight: 700; ${grantedCount > 0 ? 'color: var(--cyan); border-color: rgba(6,182,212,0.4);' : ''}">
                  ${grantedCount} / ${specialPerms.length} &#9660;
                </button>
                <div id="perm-special-menu-${modKey}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100010; background:#0b1324; border:1px solid rgba(255,255,255,0.18); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.8); min-width:210px; padding:6px 0; text-align:left;">
                  ${specialPerms.map(sp => `
                    <label style="display:flex; align-items:center; gap:8px; padding:6px 12px; font-size:0.75rem; cursor:pointer; color:#fff;" onmouseenter="this.style.background='rgba(255,255,255,0.06)'" onmouseleave="this.style.background='transparent'">
                      <input type="checkbox" class="permission-matrix-chk" ${sp.allowed ? 'checked' : ''} ${disabled}
                             onchange="window.UserAccessController.toggleSinglePermission(${sp.id}, this.checked)">
                      <div>
                        <div style="font-weight:600;">${getActionLabel(sp.action)}</div>
                        <div style="font-size:0.68rem; color:var(--text-dim);">${sp.description || ''}</div>
                      </div>
                    </label>
                  `).join('')}
                </div>
              </td>
            `;
          }

          html += `
            <tr class="permission-module-row">
              <td style="font-weight: 600; color: #fff;">
                <span>${mod.label}</span>
                <div style="font-size: 0.68rem; color: var(--text-dim); font-family: monospace;">${modKey}</div>
              </td>
              ${allCell}
              ${commonCells}
              ${specialCell}
            </tr>
          `;
        }
      }

      if (!html) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-dim);">No permission modules match your criteria.</td></tr>`;
      } else {
        tbody.innerHTML = html;
      }

      // Update Summary Badge
      const summaryBadge = document.getElementById('perm-granted-summary-badge');
      if (summaryBadge) {
        summaryBadge.textContent = `${totalGranted} of ${totalCapabilities} granted`;
      }

      // Rebuild 24% Effective Access Preview
      this.rebuildEffectivePreview();
    },

    toggleSpecialMenu(btnEl, modKey, event) {
      if (event) event.stopPropagation();
      const menu = document.getElementById(`perm-special-menu-${modKey}`);
      if (!menu) return;

      document.querySelectorAll('.action-dropdown-menu').forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });

      if (menu.style.display === 'block') {
        menu.style.display = 'none';
        return;
      }

      const rect = btnEl.getBoundingClientRect();
      const menuWidth = 220;
      let left = rect.right - menuWidth;
      if (left < 10) left = 10;
      let top = rect.bottom + 4;
      if (top + 200 > window.innerHeight) {
        top = Math.max(10, rect.top - 200);
      }

      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.style.display = 'block';

      const closeHandler = (e) => {
        if (!menu.contains(e.target) && e.target !== btnEl) {
          menu.style.display = 'none';
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    },

    toggleSinglePermission(id, allowed) {
      if (currentPermRole === 'ADMIN') return;
      const p = cachedPermissions.find(x => x.id === id);
      if (p) {
        p.allowed = !!allowed;
        permissionsDirty = true;
        this.renderPermissionMatrix();
      }
    },

    toggleModuleAllPermissions(moduleKey, allowed) {
      if (currentPermRole === 'ADMIN') return;
      cachedPermissions.forEach(p => {
        if (p.module.toUpperCase() === moduleKey.toUpperCase()) {
          p.allowed = !!allowed;
        }
      });
      permissionsDirty = true;
      this.renderPermissionMatrix();
    },

    rebuildEffectivePreview() {
      const container = document.getElementById('permission-preview-container');
      if (!container) return;

      const byCategory = new Map();
      MODULES_CATALOG.forEach(mod => {
        const modPerms = cachedPermissions.filter(p => p.module.toUpperCase() === mod.key);
        const grantedPerms = modPerms.filter(p => p.allowed);
        if (grantedPerms.length > 0) {
          if (!byCategory.has(mod.category)) byCategory.set(mod.category, []);
          byCategory.get(mod.category).push({
            mod,
            granted: grantedPerms.length,
            total: modPerms.length,
            actions: grantedPerms.map(p => getActionLabel(p.action))
          });
        }
      });

      if (byCategory.size === 0) {
        container.innerHTML = `<div style="font-size:0.75rem; color:var(--text-dim); padding:16px; text-align:center;">No permissions are currently granted for this role.</div>`;
        return;
      }

      let html = '';
      byCategory.forEach((items, catName) => {
        const totalCatGranted = items.reduce((sum, i) => sum + i.granted, 0);
        const totalCatCaps = items.reduce((sum, i) => sum + i.total, 0);

        const actionsSummarySet = new Set();
        items.forEach(i => i.actions.forEach(a => actionsSummarySet.add(a)));
        const actionsArray = Array.from(actionsSummarySet);
        let actionSummaryText = actionsArray.slice(0, 5).join(', ');
        if (actionsArray.length > 5) actionSummaryText += ` +${actionsArray.length - 5}`;

        html += `
          <div class="permission-preview-group">
            <div class="permission-preview-category">${catName}</div>
            <div class="permission-preview-detail">
              <span>${actionSummaryText || 'View'}</span> &bull; 
              <strong style="color:#c084fc;">${totalCatGranted} / ${totalCatCaps}</strong>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    },

    applySelectedTemplate() {
      if (currentPermRole === 'ADMIN') {
        window.AppDialogService.showToast('Administrator permissions cannot be modified.', 'warning');
        return;
      }
      const templateEl = document.getElementById('perm-template-select');
      const templateKey = templateEl ? templateEl.value : 'SALES_STANDARD';

      cachedPermissions.forEach(p => {
        p.allowed = templateAllows(templateKey, p.module, p.action);
      });

      permissionsDirty = true;
      const hintEl = document.getElementById('perm-hint-banner');
      if (hintEl) hintEl.textContent = `Applied template "${templateKey}" as unsaved changes. Review the matrix, then click "Save Permissions".`;

      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Applied "${templateKey}" template. Click "Save Permissions" to commit.`, 'info');
      this.renderPermissionMatrix();
    },

    async copyPermissionsFromRole() {
      if (currentPermRole === 'ADMIN') return;
      const copyRoleEl = document.getElementById('perm-copy-role-select');
      const sourceRole = copyRoleEl ? copyRoleEl.value : null;
      if (!sourceRole) {
        window.AppDialogService.showToast('Please select a source role to copy from.', 'warning');
        return;
      }

      try {
        const res = await window.ReportService.getPermissions(sourceRole);
        const sourcePerms = (res && res.permissions) ? res.permissions : (Array.isArray(res) ? res : []);
        if (sourcePerms.length === 0) {
          window.AppDialogService.showToast(`No permissions found for source role ${sourceRole}.`, 'warning');
          return;
        }

        const sourceAllowedMap = new Map();
        sourcePerms.forEach(p => {
          const key = `${p.module.toUpperCase()}::${p.action.toUpperCase()}`;
          sourceAllowedMap.set(key, !!p.allowed);
        });

        cachedPermissions.forEach(p => {
          const key = `${p.module.toUpperCase()}::${p.action.toUpperCase()}`;
          if (sourceAllowedMap.has(key)) {
            p.allowed = sourceAllowedMap.get(key);
          }
        });

        permissionsDirty = true;
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`Copied permissions from "${sourceRole}". Click "Save Permissions" to commit.`, 'info');
        this.renderPermissionMatrix();
      } catch (err) {
        window.AppDialogService.showToast('Failed to copy permissions: ' + err.message, 'error');
      }
    },

    resetPermissionChanges() {
      if (currentPermRole) {
        this.loadPermissionMatrix(currentPermRole);
      }
    },

    async savePermissionMatrix() {
      if (currentPermRole === 'ADMIN') {
        window.AppDialogService.showToast('Administrator always receives full access and cannot be modified.', 'warning');
        return;
      }

      try {
        const payload = {
          role: currentPermRole,
          permissions: cachedPermissions.map(p => ({ id: p.id, allowed: !!p.allowed })),
          rowVersion: permissionRowVersion
        };

        const res = await window.ReportService.savePermissions(payload);
        permissionsDirty = false;
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        window.AppDialogService.showToast(`Permissions for role "${currentPermRole}" committed successfully!`, 'success');
        this.loadPermissionMatrix(currentPermRole);
      } catch (err) {
        window.AppDialogService.showToast('Failed to save permissions: ' + err.message, 'error');
      }
    },

    // ==========================================
    // 5. GLOBAL AUDIT TRAIL (GlobalAudit.fxml)
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
                <button class="btn btn-secondary" style="padding: 2px 10px; font-size: 0.74rem; font-weight:600; display:inline-flex; align-items:center; gap:4px;" onclick="window.UserAccessController.openAuditDiff(${idx})" title="View Audit Details">&#128065; View</button>
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
