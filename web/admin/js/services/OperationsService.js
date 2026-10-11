/**
 * Jasvi Industries ERP - OperationsService
 * Business Operations API integration matching desktop SalesService, PurchaseService, FinanceService
 */
window.OperationsService = {
  // Sales
  async getSales(page = 0, size = 15) {
    return await window.ApiService.get(`/api/operations/sales/page?page=${page}&size=${size}`);
  },
  async createSale(saleData) {
    return await window.ApiService.post('/api/operations/sales', saleData);
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
  async getPurchases(page = 0, size = 15) {
    return await window.ApiService.get(`/api/operations/purchases/page?page=${page}&size=${size}`);
  },
  async createPurchase(purchaseData) {
    return await window.ApiService.post('/api/operations/purchases', purchaseData);
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
  async getVouchers(page = 0, size = 20) {
    return await window.ApiService.get(`/api/operations/finance/page?page=${page}&size=${size}`);
  },
  async createVoucher(voucherData) {
    return await window.ApiService.post('/api/operations/finance/voucher', voucherData);
  }
};
