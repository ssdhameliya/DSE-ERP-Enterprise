/**
 * Jasvi Industries ERP - OperationsService
 * Business Operations API integration matching desktop SalesService, PurchaseService, FinanceService
 */
window.OperationsService = {
  // Sales
  // Sales (Desktop SalesListController & SalesController Parity)
  async getSalesPage(page = 0, size = 25, q = '', invoice = '', customer = '', from = '', to = '', paymentStatus = '', due = '', mail = '', whatsapp = '', invoiceType = '', documentStatus = '', returnStatus = '', minAmount = null, maxAmount = null, includeSummary = true, includeCharts = true, includeOptions = true) {
    let url = `/api/operations/sales/page?page=${Math.max(0, page)}&size=${Math.max(10, Math.min(size, 500))}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (invoice) url += `&invoice=${encodeURIComponent(invoice)}`;
    if (customer && customer !== 'All customers' && customer !== 'All') url += `&customer=${encodeURIComponent(customer)}`;
    if (from) url += `&from=${encodeURIComponent(from)}`;
    if (to) url += `&to=${encodeURIComponent(to)}`;
    if (paymentStatus && paymentStatus !== 'All' && paymentStatus !== 'ALL') url += `&paymentStatus=${encodeURIComponent(paymentStatus)}`;
    if (due && due !== 'All') url += `&due=${encodeURIComponent(due)}`;
    if (mail && mail !== 'All') url += `&mail=${encodeURIComponent(mail)}`;
    if (whatsapp && whatsapp !== 'All') url += `&whatsapp=${encodeURIComponent(whatsapp)}`;
    if (invoiceType && invoiceType !== 'All') url += `&invoiceType=${encodeURIComponent(invoiceType)}`;
    if (documentStatus && documentStatus !== 'All') url += `&documentStatus=${encodeURIComponent(documentStatus)}`;
    if (returnStatus && returnStatus !== 'All') url += `&returnStatus=${encodeURIComponent(returnStatus)}`;
    if (minAmount != null && minAmount !== '') url += `&minAmount=${encodeURIComponent(minAmount)}`;
    if (maxAmount != null && maxAmount !== '') url += `&maxAmount=${encodeURIComponent(maxAmount)}`;
    url += `&includeSummary=${includeSummary}&includeCharts=${includeCharts}&includeOptions=${includeOptions}`;
    return await window.ApiService.get(url);
  },
  async getSales(page = 0, size = 50, q = '', from = '', to = '', paymentStatus = '') {
    return await this.getSalesPage(page, size, q, '', '', from, to, paymentStatus, '', '', '', '', '', '', null, null, true, true, true);
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
  // Quotations (Desktop QuotationController Parity)
  async getQuotationsPage(page = 0, size = 25, q = '', number = '', customer = '', status = '', from = '', to = '', valid = '', salesperson = '', minAmount = '', maxAmount = '', followUp = '', source = '') {
    let url = `/api/quotations/page?page=${page}&size=${size}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (number) url += `&number=${encodeURIComponent(number)}`;
    if (customer && customer !== 'All customers' && customer !== 'All') url += `&customer=${encodeURIComponent(customer)}`;
    if (status && status !== 'All') url += `&status=${encodeURIComponent(status)}`;
    if (from) url += `&from=${encodeURIComponent(from)}`;
    if (to) url += `&to=${encodeURIComponent(to)}`;
    if (valid) url += `&valid=${encodeURIComponent(valid)}`;
    if (salesperson && salesperson !== 'All') url += `&salesperson=${encodeURIComponent(salesperson)}`;
    if (minAmount) url += `&minAmount=${encodeURIComponent(minAmount)}`;
    if (maxAmount) url += `&maxAmount=${encodeURIComponent(maxAmount)}`;
    if (followUp && followUp !== 'All') url += `&followUp=${encodeURIComponent(followUp)}`;
    if (source && source !== 'All') url += `&source=${encodeURIComponent(source)}`;
    return await window.ApiService.get(url);
  },
  async getQuotation(id) {
    if (typeof id === 'string' && isNaN(Number(id))) {
      return await window.ApiService.get(`/api/quotations/by-number?no=${encodeURIComponent(id)}`);
    }
    return await window.ApiService.get(`/api/quotations/${id}`);
  },
  async getQuotationBootstrap(id = null) {
    let url = '/api/quotations/editor-bootstrap';
    if (id) url += `?id=${id}`;
    return await window.ApiService.get(url);
  },
  async searchQuotationItems(q = '', limit = 12) {
    return await window.ApiService.get(`/api/quotations/items/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  },
  async getQuotationSources() {
    return await window.ApiService.get('/api/quotations/sources');
  },
  async createQuotation(data) {
    return await window.ApiService.post('/api/quotations', data);
  },
  async updateQuotation(id, data) {
    return await window.ApiService.put(`/api/quotations/${id}`, data);
  },
  async convertQuotation(id, user = 'Admin', rowVersion = 0) {
    return await window.ApiService.post(`/api/quotations/${id}/convert?user=${encodeURIComponent(user)}&rowVersion=${rowVersion}`, {});
  },
  async duplicateQuotation(id, user = 'Admin') {
    return await window.ApiService.post(`/api/quotations/${id}/duplicate?user=${encodeURIComponent(user)}`, {});
  },
  async deleteQuotation(id, rowVersion = 0) {
    return await window.ApiService.delete(`/api/quotations/${id}?rowVersion=${rowVersion}`);
  },
  async scheduleQuotationFollowUp(id, followUpData) {
    return await window.ApiService.post(`/api/quotations/${id}/follow-up`, followUpData);
  },
  async markQuotationSent(id, channel = 'EMAIL', rowVersion = 0) {
    return await window.ApiService.post(`/api/quotations/${id}/sent?channel=${encodeURIComponent(channel)}&rowVersion=${rowVersion}`, {});
  },

  // Returns (Sales Return & Purchase Return - ReturnController Parity)
  async getReturnsPage(type = 'SALES RETURN', page = 0, size = 25, q = '', party = '', status = '', from = '', to = '') {
    let url = `/api/returns/page?type=${encodeURIComponent(type)}&page=${page}&size=${size}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (party && party !== 'All Customers' && party !== 'All Suppliers' && party !== 'All') url += `&party=${encodeURIComponent(party)}`;
    if (status && status !== 'All Status' && status !== 'All') url += `&status=${encodeURIComponent(status)}`;
    if (from) url += `&from=${encodeURIComponent(from)}`;
    if (to) url += `&to=${encodeURIComponent(to)}`;
    return await window.ApiService.get(url);
  },
  async getReturnableLines(type = 'SALES RETURN', invoice = '') {
    return await window.ApiService.get(`/api/returns/returnable-lines?type=${encodeURIComponent(type)}&invoice=${encodeURIComponent(invoice)}`);
  },
  async createReturn(data) {
    return await window.ApiService.post('/api/returns', data);
  },
  async getReturnDetails(no) {
    return await window.ApiService.get(`/api/returns/${encodeURIComponent(no)}`);
  },
  async updateReturn(no, field, value, expectedRowVersion = 0) {
    return await window.ApiService.put(`/api/returns/${encodeURIComponent(no)}`, { field, value, expectedRowVersion });
  },
  async approveReturn(no) {
    return await window.ApiService.post(`/api/returns/${encodeURIComponent(no)}/approve`, {});
  },
  async rejectReturn(no, reason = '') {
    return await window.ApiService.post(`/api/returns/${encodeURIComponent(no)}/reject?reason=${encodeURIComponent(reason)}`, {});
  },
  async cancelReturn(no, isSales = true) {
    return await window.ApiService.post(`/api/returns/${encodeURIComponent(no)}/cancel?sales=${isSales}`, {});
  },
  async deleteReturn(no, isSales = true) {
    return await window.ApiService.delete(`/api/returns/${encodeURIComponent(no)}?sales=${isSales}`);
  },
  async getReturnRefunds(no) {
    return await window.ApiService.get(`/api/returns/${encodeURIComponent(no)}/refunds`);
  },
  async recordReturnRefund(no, refundData) {
    return await window.ApiService.post(`/api/returns/${encodeURIComponent(no)}/refunds`, refundData);
  },

  // Credit Notes (Desktop CreditNoteRegisterController Parity)
  async getCreditNotes() {
    return await window.ApiService.get('/api/credit-notes');
  },
  async getCreditNote(id) {
    return await window.ApiService.get(`/api/credit-notes/${id}`);
  },
  async createCreditNote(data, user = 'Admin') {
    return await window.ApiService.post(`/api/credit-notes?user=${encodeURIComponent(user)}`, data);
  },
  async cancelCreditNote(id, user = 'Admin') {
    return await window.ApiService.post(`/api/credit-notes/${id}/cancel?user=${encodeURIComponent(user)}`, {});
  },

  // Debit Notes (Desktop DebitNoteRegisterController Parity)
  async getDebitNotes() {
    return await window.ApiService.get('/api/debit-notes');
  },
  async getDebitNote(id) {
    return await window.ApiService.get(`/api/debit-notes/${id}`);
  },
  async createDebitNote(data, user = 'Admin') {
    return await window.ApiService.post(`/api/debit-notes?user=${encodeURIComponent(user)}`, data);
  },
  async cancelDebitNote(id, user = 'Admin') {
    return await window.ApiService.post(`/api/debit-notes/${id}/cancel?user=${encodeURIComponent(user)}`, {});
  },

  // Legacy compatibility aliases
  async getSalesReturns() { return this.getReturnsPage('SALES RETURN'); },
  async getPurchaseReturns() { return this.getReturnsPage('PURCHASE RETURN'); },

  // Purchases (Desktop PurchaseListController & PurchaseController Parity)
  async getPurchasesPage(page = 0, size = 25, q = '', supplier = '', from = '', to = '', paymentStatus = '', due = '', mail = '', documentStatus = '', returnStatus = '', includeSummary = true, includeOptions = true) {
    let url = `/api/operations/purchases/page?page=${page}&size=${size}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (supplier && supplier !== 'All Suppliers' && supplier !== 'All') url += `&supplier=${encodeURIComponent(supplier)}`;
    if (from) url += `&from=${encodeURIComponent(from)}`;
    if (to) url += `&to=${encodeURIComponent(to)}`;
    if (paymentStatus && paymentStatus !== 'ALL') url += `&paymentStatus=${encodeURIComponent(paymentStatus)}`;
    if (due) url += `&due=${encodeURIComponent(due)}`;
    if (mail) url += `&mail=${encodeURIComponent(mail)}`;
    if (documentStatus && documentStatus !== 'ALL') url += `&documentStatus=${encodeURIComponent(documentStatus)}`;
    if (returnStatus && returnStatus !== 'ALL') url += `&returnStatus=${encodeURIComponent(returnStatus)}`;
    url += `&includeSummary=${includeSummary}&includeOptions=${includeOptions}`;
    return await window.ApiService.get(url);
  },
  async getPurchases(page = 0, size = 50, q = '', from = '', to = '') {
    return this.getPurchasesPage(page, size, q, '', from, to);
  },
  async getNextPurchaseInvoice() {
    return await window.ApiService.get('/api/operations/purchases/next-invoice');
  },
  async getPurchaseByInvoice(invoiceNo) {
    return await window.ApiService.get(`/api/operations/purchases/by-invoice?invoiceNo=${encodeURIComponent(invoiceNo)}`);
  },
  async checkPurchaseExists(invoiceNo) {
    return await window.ApiService.get(`/api/operations/purchases/exists?invoiceNo=${encodeURIComponent(invoiceNo)}`);
  },
  async createPurchase(purchaseData) {
    return await window.ApiService.post('/api/operations/purchases', purchaseData);
  },
  async updatePurchase(purchaseData) {
    return await window.ApiService.put('/api/operations/purchases', purchaseData);
  },
  async deletePurchase(invoiceNo) {
    return await window.ApiService.delete(`/api/operations/purchases?invoiceNo=${encodeURIComponent(invoiceNo)}`);
  },
  async cancelPurchase(invoiceNo) {
    return await window.ApiService.post(`/api/operations/purchases/cancel?invoiceNo=${encodeURIComponent(invoiceNo)}`, {});
  },
  async approvePurchase(invoiceNo) {
    return await window.ApiService.post(`/api/operations/purchases/approve?invoiceNo=${encodeURIComponent(invoiceNo)}`, {});
  },
  async rejectPurchase(invoiceNo, reason = '') {
    return await window.ApiService.post(`/api/operations/purchases/reject?invoiceNo=${encodeURIComponent(invoiceNo)}&reason=${encodeURIComponent(reason)}`, {});
  },
  async markPurchaseEmailSent(id) {
    return await window.ApiService.post(`/api/operations/purchases/email-sent/${id}`, {});
  },

  // Finance & Banking (Desktop Parity with BusinessOperationsController.java)
  async getFinancePage(page = 0, size = 50, mode = '', period = '', type = '', q = '', from = '', to = '') {
    let url = `/api/operations/finance/page?page=${page}&size=${size}`;
    if (mode) url += `&mode=${encodeURIComponent(mode)}`;
    if (period) url += `&period=${encodeURIComponent(period)}`;
    if (type && type !== 'ALL') url += `&type=${encodeURIComponent(type)}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (from) url += `&from=${encodeURIComponent(from)}`;
    if (to) url += `&to=${encodeURIComponent(to)}`;
    return await window.ApiService.get(url);
  },
  async getFinanceMetrics() {
    return await window.ApiService.get('/api/operations/finance/metrics');
  },
  async getFinanceById(id) {
    return await window.ApiService.get(`/api/operations/finance/${id}`);
  },
  async getNextVoucher() {
    return await window.ApiService.get('/api/operations/finance/next-voucher');
  },
  async saveFinance(financeDto) {
    return await window.ApiService.post('/api/operations/finance', financeDto);
  },
  async updateFinance(financeDto) {
    return await window.ApiService.put('/api/operations/finance', financeDto);
  },
  async deleteFinance(id, rowVersion = -1) {
    return await window.ApiService.delete(`/api/operations/finance/${id}?rowVersion=${rowVersion}`);
  },
  // Backward compatibility alias
  async getVouchers(page = 0, size = 50, type = '', q = '') {
    return this.getFinancePage(page, size, '', '', type, q);
  },
  async createVoucher(voucherData) {
    return this.saveFinance(voucherData);
  },
  async deleteVoucher(id) {
    return this.deleteFinance(id, -1);
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
  async markPurchaseEmailSent(id) {
    return await window.ApiService.post(`/api/operations/purchases/email-sent/${id}`, {});
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
  },

  // Returns & Refunds
  async getReturnDetails(no) {
    return await window.ApiService.get(`/api/returns/${encodeURIComponent(no)}`);
  },
  async getReturnRefunds(no) {
    return await window.ApiService.get(`/api/returns/${encodeURIComponent(no)}/refunds`);
  },
  async recordReturnRefund(no, data) {
    return await window.ApiService.post(`/api/returns/${encodeURIComponent(no)}/refunds`, data);
  },

  // Quotation Convert to Sale
  async convertQuotationToSale(id, user = 'Admin', rowVersion = 0) {
    return await window.ApiService.post(`/api/quotations/${id}/convert?user=${encodeURIComponent(user)}&rowVersion=${rowVersion}`, {});
  }
};
