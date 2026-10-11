/**
 * Jasvi Industries ERP - ReportService
 * Audit trail, user access, and database backup operations matching desktop BackupRestoreController and GlobalAuditController
 */
window.ReportService = {
  async getAuditLogs() {
    return await window.ApiService.get('/api/audit/global');
  },
  async getUsers() {
    return await window.ApiService.get('/api/admin/users');
  },
  async getBackups() {
    return await window.ApiService.get('/api/authority/backups');
  },
  async triggerBackup() {
    return await window.ApiService.post('/api/authority/backups', {});
  }
};
