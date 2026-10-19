/**
 * Jasvi Industries ERP - ReportService
 * Unified Executive Reporting & Analytics Engine matching ReportingController & ReportingDtos
 */
window.ReportService = {
  // 1. Unified Reporting Platform (9.0.49 / 10.0.25 Parity)
  async getReportDefinitions() {
    return await window.ApiService.get('/api/reporting/definitions');
  },

  async getReportFilters() {
    return await window.ApiService.get('/api/reporting/filters');
  },

  async runReport(reportRequest) {
    return await window.ApiService.post('/api/reporting/run', reportRequest);
  },

  // 2. Customer 360 API (Customer360Controller Parity)
  async getCustomer360Summary(id) {
    return await window.ApiService.get(`/api/customer-360/${id}/summary`);
  },
  async getCustomer360Invoices(id) {
    return await window.ApiService.get(`/api/customer-360/${id}/invoices`);
  },
  async getCustomer360Quotations(id) {
    return await window.ApiService.get(`/api/customer-360/${id}/quotations`);
  },
  async getCustomer360Payments(id) {
    return await window.ApiService.get(`/api/customer-360/${id}/payments`);
  },
  async getCustomer360Contacts(id) {
    return await window.ApiService.get(`/api/customer-360/${id}/contacts`);
  },
  async saveCustomerContact(id, contactPayload) {
    return await window.ApiService.post(`/api/customer-360/${id}/contacts`, contactPayload);
  },
  async deleteCustomerContact(id, contactId, rowVersion = 0) {
    return await window.ApiService.delete(`/api/customer-360/${id}/contacts/${contactId}?rowVersion=${rowVersion}`);
  },
  async getCustomer360Notes(id) {
    return await window.ApiService.get(`/api/customer-360/${id}/notes`);
  },
  async saveCustomerNote(id, notePayload) {
    return await window.ApiService.post(`/api/customer-360/${id}/notes`, notePayload);
  },
  async deleteCustomerNote(id, noteId, rowVersion = 0) {
    return await window.ApiService.delete(`/api/customer-360/${id}/notes/${noteId}?rowVersion=${rowVersion}`);
  },

  // 3. Supplier 360 API (Supplier360Controller Parity)
  async getSupplier360Summary(id) {
    return await window.ApiService.get(`/api/supplier-360/${id}/summary`);
  },
  async getSupplier360Purchases(id) {
    return await window.ApiService.get(`/api/supplier-360/${id}/purchases`);
  },
  async getSupplier360Payments(id) {
    return await window.ApiService.get(`/api/supplier-360/${id}/payments`);
  },
  async getSupplier360Contacts(id) {
    return await window.ApiService.get(`/api/supplier-360/${id}/contacts`);
  },
  async saveSupplierContact(id, contactPayload) {
    return await window.ApiService.post(`/api/supplier-360/${id}/contacts`, contactPayload);
  },
  async deleteSupplierContact(id, contactId, rowVersion = 0) {
    return await window.ApiService.delete(`/api/supplier-360/${id}/contacts/${contactId}?rowVersion=${rowVersion}`);
  },
  async getSupplier360Notes(id) {
    return await window.ApiService.get(`/api/supplier-360/${id}/notes`);
  },
  async saveSupplierNote(id, notePayload) {
    return await window.ApiService.post(`/api/supplier-360/${id}/notes`, notePayload);
  },
  async deleteSupplierNote(id, noteId, rowVersion = 0) {
    return await window.ApiService.delete(`/api/supplier-360/${id}/notes/${noteId}?rowVersion=${rowVersion}`);
  },

  // Support Attachments API Parity
  async getPartyDocuments(partyType, id) {
    return await window.ApiService.get(`/api/attachments/document/${encodeURIComponent(partyType)}/${id}`);
  },
  async deletePartyDocument(partyType, id, metaId) {
    return await window.ApiService.delete(`/api/attachments/document/${encodeURIComponent(partyType)}/${id}/${metaId}`);
  },

  // 4. Global Audit & Governance (AuditController Parity)
  async getAuditLogs(params = {}) {
    const q = new URLSearchParams(params).toString();
    return await window.ApiService.get(`/api/audit/global${q ? '?' + q : ''}`);
  },
  async getRecordAudit(type, id) {
    return await window.ApiService.get(`/api/audit/record?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`);
  },

  // 5. User Access & Security (AdminController Parity)
  async getUsers() {
    return await window.ApiService.get('/api/admin/users');
  },
  async saveUser(userPayload) {
    return await window.ApiService.post('/api/admin/users', userPayload);
  },
  async updateUser(id, userPayload) {
    return await window.ApiService.put(`/api/admin/users/${id}`, userPayload);
  },
  async resetUserMfa(id) {
    return await window.ApiService.post(`/api/admin/users/${id}/mfa/reset`, {});
  },
  async getUserMfaState(id) {
    return await window.ApiService.get(`/api/admin/users/${id}/mfa`);
  },
  async lockUser(id, locked) {
    return await window.ApiService.post(`/api/admin/users/${id}/lock`, { locked });
  },
  async resetUserPassword(id, password) {
    return await window.ApiService.post(`/api/admin/users/${id}/password`, { password });
  },
  async deleteUser(id) {
    return await window.ApiService.delete(`/api/admin/users/${id}`);
  },
  async getRoles() {
    return await window.ApiService.get('/api/admin/roles');
  },
  async saveRole(rolePayload) {
    return await window.ApiService.post('/api/admin/roles', rolePayload);
  },
  async getPermissions(role = 'ADMIN') {
    return await window.ApiService.get(`/api/admin/permissions/set?role=${encodeURIComponent(role || 'ADMIN')}`);
  },
  async savePermissions(permissionPayload) {
    return await window.ApiService.put('/api/admin/permissions', permissionPayload);
  },
  async getRegistrations(status = 'PENDING_ADMIN_APPROVAL') {
    return await window.ApiService.get(`/api/admin/registrations?status=${encodeURIComponent(status)}`);
  },
  async approveRegistration(id, decisionPayload) {
    return await window.ApiService.post(`/api/admin/registrations/${id}/approve`, decisionPayload);
  },
  async rejectRegistration(id, decisionPayload) {
    return await window.ApiService.post(`/api/admin/registrations/${id}/reject`, decisionPayload);
  },

  // 6. Safe Rollback & Backups (ServerBackupController Parity)
  async getBackups() {
    return await window.ApiService.get('/api/authority/backups');
  },
  async getBackupMetrics() {
    return await window.ApiService.get('/api/authority/backups/metrics');
  },
  async triggerBackup() {
    return await window.ApiService.post('/api/authority/backups', {});
  },
  async validateBackup(name) {
    return await window.ApiService.post(`/api/authority/backups/${encodeURIComponent(name)}/validate`, {});
  },
  async stageRestore(name) {
    return await window.ApiService.post(`/api/authority/backups/${encodeURIComponent(name)}/restore/stage`, {});
  },
  async deleteBackup(name) {
    return await window.ApiService.delete(`/api/authority/backups/${encodeURIComponent(name)}`);
  },

  // 7. Company Profile & Email Settings (ProfileController & BusinessEmailController Parity)
  async getProfile() {
    return await window.ApiService.get('/api/profile');
  },
  async updateProfile(profilePayload) {
    return await window.ApiService.put('/api/profile', profilePayload);
  },
  async getEmailSettings() {
    return await window.ApiService.get('/api/authority/email/settings');
  },
  async saveEmailSettings(emailSettingsPayload) {
    return await window.ApiService.put('/api/authority/email/settings', emailSettingsPayload);
  },
  async testEmail(testPayload) {
    return await window.ApiService.post('/api/authority/email/test', testPayload);
  },

  // 8. Document Templates (PdfStudioTemplateController Parity)
  async getPdfTemplates() {
    return await window.ApiService.get('/api/pdf-studio/templates');
  }
};
