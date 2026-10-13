/**
 * Jasvi Industries ERP - AccountingService
 * REST Client for General Ledger, Financial Statements, Accounts Aging, GST Compliance, and E-Way Bill Gateway
 * Direct Parity with Spring Boot RestControllers
 */
window.AccountingService = {
  // ==========================================
  // 1. GENERAL LEDGER (/api/accounting)
  // ==========================================
  async getAccounts() {
    return await window.ApiService.get('/api/accounting/accounts');
  },
  async createAccount(data) {
    return await window.ApiService.post('/api/accounting/accounts', data);
  },
  async getJournalEntries(accountId = null, from = '', to = '', q = '') {
    let url = '/api/accounting/journal-entries';
    const params = [];
    if (accountId) params.push(`accountId=${encodeURIComponent(accountId)}`);
    if (from) params.push(`from=${encodeURIComponent(from)}`);
    if (to) params.push(`to=${encodeURIComponent(to)}`);
    if (q) params.push(`q=${encodeURIComponent(q)}`);
    if (params.length > 0) url += '?' + params.join('&');
    return await window.ApiService.get(url);
  },
  async createJournalEntry(data) {
    return await window.ApiService.post('/api/accounting/journal-entries', data);
  },
  async getTrialBalance(asOfDate = '') {
    let url = '/api/accounting/trial-balance';
    if (asOfDate) url += `?asOfDate=${encodeURIComponent(asOfDate)}`;
    return await window.ApiService.get(url);
  },

  // ==========================================
  // 2. FINANCIAL STATEMENTS (/api/financial-statements)
  // ==========================================
  async getProfitAndLoss(from = '', to = '') {
    let url = '/api/financial-statements/pnl';
    const params = [];
    if (from) params.push(`from=${encodeURIComponent(from)}`);
    if (to) params.push(`to=${encodeURIComponent(to)}`);
    if (params.length > 0) url += '?' + params.join('&');
    return await window.ApiService.get(url);
  },
  async getBalanceSheet(asOfDate = '') {
    let url = '/api/financial-statements/balance-sheet';
    if (asOfDate) url += `?asOfDate=${encodeURIComponent(asOfDate)}`;
    return await window.ApiService.get(url);
  },
  async getThreeTierStatements(from = '', to = '', asOfDate = '') {
    let url = '/api/financial-statements/three-tier';
    const params = [];
    if (from) params.push(`from=${encodeURIComponent(from)}`);
    if (to) params.push(`to=${encodeURIComponent(to)}`);
    if (asOfDate) params.push(`asOfDate=${encodeURIComponent(asOfDate)}`);
    if (params.length > 0) url += '?' + params.join('&');
    return await window.ApiService.get(url);
  },
  async getFinancialRatios(asOfDate = '') {
    let url = '/api/financial-statements/ratios';
    if (asOfDate) url += `?asOfDate=${encodeURIComponent(asOfDate)}`;
    return await window.ApiService.get(url);
  },
  async getStatementDrillDown(accountCode, from = '', to = '') {
    let url = `/api/financial-statements/drill-down?accountCode=${encodeURIComponent(accountCode)}`;
    if (from) url += `&from=${encodeURIComponent(from)}`;
    if (to) url += `&to=${encodeURIComponent(to)}`;
    return await window.ApiService.get(url);
  },

  // ==========================================
  // 3. ACCOUNTS AGING ANALYSIS (/api/aging)
  // ==========================================
  async getAgingSummary(type = 'DEBTORS') {
    return await window.ApiService.get(`/api/aging?type=${encodeURIComponent(type)}`);
  },
  async getReceivablesAging() {
    return await window.ApiService.get('/api/aging/receivables');
  },
  async getPayablesAging() {
    return await window.ApiService.get('/api/aging/payables');
  },
  async sendOverdueReminder(partyId, channel = 'WHATSAPP') {
    return await window.ApiService.post(`/api/aging/remind/${partyId}?channel=${encodeURIComponent(channel)}`, {});
  },

  // ==========================================
  // 4. GST COMPLIANCE CENTER (/api/gst)
  // ==========================================
  async getGstMetrics(period = '2026-03') {
    return await window.ApiService.get(`/api/gst/metrics/${encodeURIComponent(period)}`);
  },
  async getGstr2bReconciliation(period = '2026-03') {
    return await window.ApiService.get(`/api/gst/reconciliation/${encodeURIComponent(period)}`);
  },
  async importGstr2bJson(period, jsonData) {
    return await window.ApiService.post(`/api/gst/reconciliation/${encodeURIComponent(period)}/import`, jsonData);
  },
  async getGstr3bSummary(period = '2026-03') {
    return await window.ApiService.get(`/api/gst/gstr3b/${encodeURIComponent(period)}`);
  },
  async getGstr1Filing(period = '2026-03') {
    return await window.ApiService.get(`/api/gst/gstr1/${encodeURIComponent(period)}`);
  },
  async getGstr1GovtJson(period = '2026-03') {
    return await window.ApiService.get(`/api/gst/gstr1/${encodeURIComponent(period)}/json`);
  },

  // ==========================================
  // 5. E-WAY BILL GATEWAY (/api/eway-bill)
  // ==========================================
  async getEWayBills() {
    return await window.ApiService.get('/api/eway-bill');
  },
  async getEligibleSalesForEWay() {
    return await window.ApiService.get('/api/eway-bill/eligible-sales');
  },
  async generateEWayBill(saleId, payload) {
    return await window.ApiService.post(`/api/eway-bill/generate/${saleId}`, payload);
  },
  async updateEWayVehicle(id, vehiclePayload) {
    return await window.ApiService.put(`/api/eway-bill/${id}/update-vehicle`, vehiclePayload);
  },
  async getEWayNicJson(id) {
    return await window.ApiService.get(`/api/eway-bill/${id}/export-json`);
  }
};
