/**
 * Jasvi Industries ERP - ReconService
 * Desktop Parity Service for Bank Statement Reconciliations, Purchase Recon, and Communication Center
 * Connects directly to Spring Boot REST Controllers:
 * - BankReconciliationController (/api/bank-statements)
 * - PurchaseReconController (/api/purchase-recon)
 * - SupportController (/api/support)
 */
window.ReconService = {
  // ==========================================
  // 1. BANK STATEMENT & RECONCILIATION API
  // ==========================================

  async getBatches() {
    return window.ApiService.get('/api/bank-statements/imports');
  },

  async getBatchPage(page = 0, size = 50, account = '', status = '', fromDate = '', toDate = '', q = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      account: account || '',
      status: status || '',
      fromDate: fromDate || '',
      toDate: toDate || '',
      q: q || ''
    });
    return window.ApiService.get(`/api/bank-statements/imports/page?${params.toString()}`);
  },

  async getBatch(id) {
    return window.ApiService.get(`/api/bank-statements/imports/${id}`);
  },

  async deleteBatch(id, confirmation = 'DELETE', user = 'Admin') {
    return window.ApiService.delete(`/api/bank-statements/imports/${id}?confirmation=${encodeURIComponent(confirmation)}&user=${encodeURIComponent(user)}`);
  },

  async getBatchTransactions(id) {
    return window.ApiService.get(`/api/bank-statements/imports/${id}/transactions`);
  },

  async getTransactionPage(id, page = 0, size = 50, status = '', direction = 'ALL', fromDate = '', toDate = '', q = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      status: status || '',
      direction: direction || 'ALL',
      fromDate: fromDate || '',
      toDate: toDate || '',
      q: q || ''
    });
    return window.ApiService.get(`/api/bank-statements/imports/${id}/page?${params.toString()}`);
  },

  async getBatchMetrics(id) {
    return window.ApiService.get(`/api/bank-statements/imports/${id}/metrics`);
  },

  async getMetrics(id) {
    return this.getBatchMetrics(id);
  },

  async importStatement(payload) {
    return window.ApiService.post('/api/bank-statements/imports', payload);
  },

  async suggestMatch(txnId) {
    return window.ApiService.post(`/api/bank-statements/transactions/${txnId}/suggest`, {});
  },

  async getCandidates(txnId) {
    return window.ApiService.get(`/api/bank-statements/transactions/${txnId}/candidates`);
  },

  async matchTransaction(txnId, payload) {
    return window.ApiService.post(`/api/bank-statements/transactions/${txnId}/match`, payload);
  },

  async expenseTransaction(txnId, payload) {
    return window.ApiService.post(`/api/bank-statements/transactions/${txnId}/expense`, payload);
  },

  async bankEntryTransaction(txnId, payload) {
    return window.ApiService.post(`/api/bank-statements/transactions/${txnId}/bank-entry`, payload);
  },

  async bulkExpense(payload) {
    return window.ApiService.post('/api/bank-statements/transactions/bulk/expense', payload);
  },

  async bulkBankEntry(payload) {
    return window.ApiService.post('/api/bank-statements/transactions/bulk/bank-entry', payload);
  },

  async ignoreTransaction(txnId, note = 'User ignored', user = 'Admin') {
    return window.ApiService.post(`/api/bank-statements/transactions/${txnId}/ignore`, { note, user });
  },

  async reviewTransaction(txnId, note = 'Reviewed', user = 'Admin', rowVersion = 0) {
    return window.ApiService.post(`/api/bank-statements/transactions/${txnId}/review`, { note, user, rowVersion });
  },

  async updateTransactionNote(txnId, note = '', user = 'Admin', rowVersion = 0) {
    return window.ApiService.post(`/api/bank-statements/transactions/${txnId}/note`, { note, user, rowVersion });
  },

  async reverseTransaction(txnId, user = 'Admin') {
    return window.ApiService.post(`/api/bank-statements/transactions/${txnId}/reverse?user=${encodeURIComponent(user)}`, {});
  },

  async getAudit(txnId) {
    return window.ApiService.get(`/api/bank-statements/transactions/${txnId}/audit`);
  },

  // ==========================================
  // 2. PURCHASE RECON & RECON SUPPLIERS API
  // ==========================================

  async getReconSuppliers(q = '', limit = 100) {
    return window.ApiService.get(`/api/purchase-recon/suppliers?q=${encodeURIComponent(q)}&limit=${limit}`);
  },

  async getReconSupplier(id) {
    return window.ApiService.get(`/api/purchase-recon/suppliers/${id}`);
  },

  async getNextSupplierReference() {
    return window.ApiService.get('/api/purchase-recon/suppliers/next-reference');
  },

  async createReconSupplier(payload) {
    return window.ApiService.post('/api/purchase-recon/suppliers', payload);
  },

  async updateReconSupplier(id, payload) {
    return window.ApiService.put(`/api/purchase-recon/suppliers/${id}`, payload);
  },

  async deleteReconSupplier(id) {
    return window.ApiService.delete(`/api/purchase-recon/suppliers/${id}`);
  },

  async getReconRecords() {
    return window.ApiService.get('/api/purchase-recon/records');
  },

  async getReconRecordsPage(page = 0, size = 25, q = '', status = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      q: q || '',
      status: status || ''
    });
    return window.ApiService.get(`/api/purchase-recon/records/page?${params.toString()}`);
  },

  async getReconRecord(id) {
    return window.ApiService.get(`/api/purchase-recon/records/${id}`);
  },

  async createReconRecord(payload) {
    return window.ApiService.post('/api/purchase-recon/records', payload);
  },

  async updateReconRecord(id, payload) {
    return window.ApiService.put(`/api/purchase-recon/records/${id}`, payload);
  },

  async deleteReconRecord(id) {
    return window.ApiService.delete(`/api/purchase-recon/records/${id}`);
  },

  async getReconBankLinks(id) {
    return window.ApiService.get(`/api/purchase-recon/records/${id}/bank-links`);
  },

  async getReconMetrics() {
    return window.ApiService.get('/api/purchase-recon/metrics');
  },

  async importReconRows(payload) {
    return window.ApiService.post('/api/purchase-recon/imports', payload);
  },

  // ==========================================
  // 3. COMMUNICATION CENTER API
  // ==========================================

  async getCommunications() {
    return window.ApiService.get('/api/support/communications');
  },

  async sendCommunication(payload) {
    return window.ApiService.post('/api/support/communications', payload);
  }
};
