/**
 * Jasvi Industries ERP - OperationsService
 * Business Operations API integration matching desktop SalesService, PurchaseService, FinanceService
 */
window.OperationsService = {
  // Sales
  async getSales(page = 0, size = 50, q = '', from = '', to = '', paymentStatus = '') {
    let url = `/api/operations/sales/page?page=${page}&size=${size}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (from) url += `&from=${encodeURIComponent(from)}`;
    if (to) url += `&to=${encodeURIComponent(to)}`;
    if (paymentStatus && paymentStatus !== 'ALL') url += `&paymentStatus=${encodeURIComponent(paymentStatus)}`;
    return await window.ApiService.get(url);
  },
  async getNextSaleInvoice() {
    return await window.ApiService.get('/api/operations/sales/next-invoice');
  },
  async getSaleByInvoice(invoiceNo) {
    return await window.ApiService.get(`/api/operations/sales/by-invoice?invoiceNo=${encodeURIComponent(invoiceNo)}`);
  },
  async createSale(saleData) {
    return await window.ApiService.post('/api/operations/sales', saleData);
  },
  async updateSale(saleData) {
    return await window.ApiService.put('/api/operations/sales', saleData);
  },
  async cancelSale(invoiceNo) {
    return await window.ApiService.post(`/api/operations/sales/cancel?invoiceNo=${encodeURIComponent(invoiceNo)}`, {});
  },
  async deleteSale(invoiceNo) {
    return await window.ApiService.delete(`/api/operations/sales?invoiceNo=${encodeURIComponent(invoiceNo)}`);
  },
  async getQuotations() {
    return await window.ApiService.get('/api/quotations');
  },
  async createQuotation(data) {
    return await window.ApiService.post('/api/quotations', data);
  },
  async getSalesReturns() {
    return await window.ApiService.get('/api/returns/page?type=SALES');
  },
  async getCreditNotes() {
    return await window.ApiService.get('/api/notes/credit');
  },
  async createCreditNote(data) {
    return await window.ApiService.post('/api/notes/credit', data);
  },

  // Purchases
  async getPurchases(page = 0, size = 50, q = '', from = '', to = '') {
    let url = `/api/operations/purchases/page?page=${page}&size=${size}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (from) url += `&from=${encodeURIComponent(from)}`;
    if (to) url += `&to=${encodeURIComponent(to)}`;
    return await window.ApiService.get(url);
  },
  async getNextPurchaseInvoice() {
    return await window.ApiService.get('/api/operations/purchases/next-invoice');
  },
  async getPurchaseByInvoice(invoiceNo) {
    return await window.ApiService.get(`/api/operations/purchases/by-invoice?invoiceNo=${encodeURIComponent(invoiceNo)}`);
  },
  async createPurchase(purchaseData) {
    return await window.ApiService.post('/api/operations/purchases', purchaseData);
  },
  async updatePurchase(purchaseData) {
    return await window.ApiService.put('/api/operations/purchases', purchaseData);
  },
  async cancelPurchase(invoiceNo) {
    return await window.ApiService.post(`/api/operations/purchases/cancel?invoiceNo=${encodeURIComponent(invoiceNo)}`, {});
  },
  async getPurchaseReturns() {
    return await window.ApiService.get('/api/returns/page?type=PURCHASE');
  },
  async getDebitNotes() {
    return await window.ApiService.get('/api/notes/debit');
  },
  async createDebitNote(data) {
    return await window.ApiService.post('/api/notes/debit', data);
  },

  // Finance & Banking
  async getVouchers(page = 0, size = 50, type = '', q = '') {
    let url = `/api/operations/finance/page?page=${page}&size=${size}`;
    if (type && type !== 'ALL') url += `&type=${encodeURIComponent(type)}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    return await window.ApiService.get(url);
  },
  async getNextVoucher() {
    return await window.ApiService.get('/api/operations/finance/next-voucher');
  },
  async createVoucher(voucherData) {
    return await window.ApiService.post('/api/operations/finance', voucherData);
  },
  async deleteVoucher(id) {
    return await window.ApiService.delete(`/api/operations/finance/${id}`);
  },

  // Inventory & Stock Adjustments
  async adjustStock(adjustmentData) {
    return await window.ApiService.post('/api/operations/stock/adjust', adjustmentData);
  },
  async getStockHistory(itemCode) {
    return await window.ApiService.get(`/api/operations/stock/history?itemCode=${encodeURIComponent(itemCode)}`);
  },

  // Support & Activity Timeline
  async getActivityTimeline(type, id) {
    return await window.ApiService.get(`/api/support/activity?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`);
  },
  async recordDocumentPayment(paymentPayload) {
    return await window.ApiService.post('/api/support/payments', paymentPayload);
  },
  async recordCommunication(commPayload) {
    return await window.ApiService.post('/api/support/communications', commPayload);
  },
  async markSaleEmailSent(id) {
    return await window.ApiService.post(`/api/operations/sales/email-sent/${id}`, {});
  },
  async markDocumentWhatsapp(type, id, rowVersion = 0) {
    return await window.ApiService.post(`/api/support/documents/${encodeURIComponent(type)}/${encodeURIComponent(id)}/whatsapp?rowVersion=${rowVersion}`, {});
  },
  async sendAuthorityEmail(emailPayload) {
    return await window.ApiService.post('/api/authority/email', emailPayload);
  },
  async getDocumentPayments(type, id) {
    return await window.ApiService.get(`/api/support/payments?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`);
  },
  async deleteDocumentPayment(paymentId) {
    return await window.ApiService.delete(`/api/support/payments/${paymentId}`);
  }
};
