/**
 * Jasvi Industries ERP - UserAccessController
 * User governance, access levels, and audit trail matching desktop UserAccessController & GlobalAuditController
 */
window.UserAccessController = {
  async loadUsers() {
    const tbody = document.getElementById('users-table-tbody');
    if (!tbody) return;
    try {
      const res = await window.ReportService.getUsers();
      const list = Array.isArray(res) ? res : (res && res.rows ? res.rows : []);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim);">No user records found.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(u => `
        <tr>
          <td style="color: var(--text-dim); font-size: 0.75rem;">${u.id || '-'}</td>
          <td style="font-weight:700; color:var(--cyan);">${u.username}</td>
          <td style="font-weight:600;">${u.fullName || '-'}</td>
          <td><span class="badge badge-role">${u.role || 'USER'}</span></td>
          <td>${u.department || 'GENERAL'}</td>
          <td><span class="badge ${u.active ? 'badge-paid' : 'badge-overdue'}">${u.active ? 'ACTIVE' : 'INACTIVE'}</span></td>
          <td><span class="badge ${u.mfaEnabled ? 'badge-paid' : 'badge-pending'}">${u.mfaEnabled ? 'ENABLED' : 'DISABLED'}</span></td>
          <td>
            <button class="btn btn-secondary" style="padding:2px 8px; font-size:0.7rem;" onclick="window.AppDialogService.showToast('Permissions updated for ${u.username}', 'info')">Permissions</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  async loadAudit() {
    const tbody = document.getElementById('audit-table-tbody');
    if (!tbody) return;
    try {
      const res = await window.ReportService.getAuditLogs();
      const list = (res && res.rows) ? res.rows : (Array.isArray(res) ? res : []);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No audit events recorded.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(a => `
        <tr>
          <td>${window.FormatUtil.formatDate(a.createdAt || a.timestamp)}</td>
          <td style="font-weight:700; color:var(--cyan);">${a.createdBy || a.username || 'system'}</td>
          <td>${a.entityType || a.entity || 'CORE'}</td>
          <td><span class="badge badge-paid">${a.action || 'MUTATION'}</span></td>
          <td>${a.referenceNo || a.detail || a.recordId || '-'}</td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  openNewUserModal() {
    window.AppDialogService.openModal('modal-new-user');
  },

  async handleUserSave(e) {
    e.preventDefault();
    const payload = {
      username: document.getElementById('new-user-username').value.trim(),
      fullName: document.getElementById('new-user-fullname').value.trim(),
      email: document.getElementById('new-user-email').value.trim(),
      role: document.getElementById('new-user-role').value,
      password: document.getElementById('new-user-password').value,
      active: true,
      mfaEnabled: false
    };
    try {
      await window.AuthService.register(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`User account ${payload.username} provisioned!`, 'success');
      window.AppDialogService.closeModal('modal-new-user');
      this.loadUsers();
    } catch (err) {
      window.AppDialogService.showToast(err.message, 'error');
    }
  }
};
