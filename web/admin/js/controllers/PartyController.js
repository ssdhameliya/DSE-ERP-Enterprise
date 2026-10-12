/**
 * Jasvi Industries ERP - PartyController
 * Customer CRM & Supplier HRM Directory
 */
window.PartyController = {
  customersCache: [],
  suppliersCache: [],

  async loadCustomers() {
    const tbody = document.getElementById('customers-table-tbody');
    if (!tbody) return;
    try {
      const list = await window.MasterService.getParties('CUSTOMER');
      this.customersCache = list || [];
      if (this.customersCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 24px;">No customer profiles recorded.</td></tr>`;
        return;
      }
      tbody.innerHTML = this.customersCache.map(c => {
        const code = c.partyCode || c.code || '-';
        const name = c.name || c.partyName || '-';
        const gstin = c.gstin || '-';
        const phone = c.phone || '-';
        const email = c.email || '-';
        const city = c.address || c.city || 'Gujarat';
        const balance = c.openingBalance || 0;
        return `
          <tr>
            <td style="font-weight:700; color:var(--cyan);">${code}</td>
            <td style="font-weight:600;">${name}</td>
            <td><span style="font-family: monospace; font-size: 0.8rem;">${gstin}</span></td>
            <td>${phone}</td>
            <td>${email}</td>
            <td>${city}</td>
            <td style="font-weight:700; color: #34d399;">${window.FormatUtil.formatRupees(balance)}</td>
            <td>
              <button class="btn btn-secondary" style="padding:2px 8px; font-size:0.72rem;" onclick="window.SalesController.openNewInvoiceModal()">+ Sale</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #f87171; padding: 24px;">${e.message}</td></tr>`;
    }
  },

  async loadSuppliers() {
    const tbody = document.getElementById('suppliers-table-tbody');
    if (!tbody) return;
    try {
      const list = await window.MasterService.getParties('SUPPLIER');
      this.suppliersCache = list || [];
      if (this.suppliersCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 24px;">No supplier records found.</td></tr>`;
        return;
      }
      tbody.innerHTML = this.suppliersCache.map(s => {
        const code = s.partyCode || s.code || '-';
        const name = s.name || s.partyName || '-';
        const gstin = s.gstin || '-';
        const phone = s.phone || '-';
        const bank = s.bankName || 'State Bank of India';
        const acNo = s.accountNo || '-';
        return `
          <tr>
            <td style="font-weight:700; color:var(--cyan);">${code}</td>
            <td style="font-weight:600;">${name}</td>
            <td><span style="font-family: monospace; font-size: 0.8rem;">${gstin}</span></td>
            <td>${phone}</td>
            <td>${bank}</td>
            <td>${acNo}</td>
            <td style="font-weight:700;">${window.FormatUtil.formatRupees(s.openingBalance || 0)}</td>
            <td>
              <button class="btn btn-secondary" style="padding:2px 8px; font-size:0.72rem;" onclick="window.PurchaseController.openNewPurchaseModal()">+ Bill</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #f87171; padding: 24px;">${e.message}</td></tr>`;
    }
  },

  openNewCustomerModal() {
    const codeEl = document.getElementById('cust-code');
    if (codeEl) codeEl.value = 'CUST' + Date.now().toString().slice(-4);
    window.AppDialogService.openModal('modal-new-customer');
  },

  async handleCustomerSave(e) {
    e.preventDefault();
    const partyCode = document.getElementById('cust-code').value.trim();
    const name = document.getElementById('cust-name').value.trim();
    const gstin = document.getElementById('cust-gstin').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const email = document.getElementById('cust-email')?.value.trim() || '';
    const address = document.getElementById('cust-address').value.trim();

    const payload = {
      partyCode, name, gstin, phone, email, address,
      partyType: 'CUSTOMER', active: true, openingBalance: 0
    };

    try {
      await window.MasterService.createParty(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Customer ${name} saved successfully!`, 'success');
      window.AppDialogService.closeModal('modal-new-customer');
      this.loadCustomers();
    } catch (err) {
      window.AppDialogService.showToast('Failed to save customer: ' + err.message, 'error');
    }
  },

  openNewSupplierModal() {
    const codeEl = document.getElementById('sup-code');
    if (codeEl) codeEl.value = 'SUP' + Date.now().toString().slice(-4);
    window.AppDialogService.openModal('modal-new-supplier');
  },

  async handleSupplierSave(e) {
    e.preventDefault();
    const partyCode = document.getElementById('sup-code').value.trim();
    const name = document.getElementById('sup-name').value.trim();
    const gstin = document.getElementById('sup-gstin').value.trim();
    const phone = document.getElementById('sup-phone').value.trim();
    const bankName = document.getElementById('sup-bank').value.trim();
    const accountNo = document.getElementById('sup-account').value.trim();

    const payload = {
      partyCode, name, gstin, phone, bankName, accountNo,
      partyType: 'SUPPLIER', active: true, openingBalance: 0
    };

    try {
      await window.MasterService.createParty(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Supplier ${name} saved successfully!`, 'success');
      window.AppDialogService.closeModal('modal-new-supplier');
      this.loadSuppliers();
    } catch (err) {
      window.AppDialogService.showToast('Failed to save supplier: ' + err.message, 'error');
    }
  }
};
