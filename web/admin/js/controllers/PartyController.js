/**
 * Jasvi Industries ERP - PartyController
 * Customers 360 and Suppliers Directory matching desktop CustomerController & SupplierController
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
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">No customers found.</td></tr>`;
        return;
      }
      tbody.innerHTML = this.customersCache.map(c => {
        const code = c.partyCode || c.code || '-';
        const name = c.name || c.partyName || '-';
        const gstin = c.gstin || '-';
        const phone = c.phone || '-';
        const city = c.address || c.city || 'Gujarat';
        const limit = c.openingBalance != null && c.openingBalance > 0 ? c.openingBalance : (c.creditLimit || 50000);
        return `
          <tr>
            <td style="font-weight:700; color:var(--cyan);">${code}</td>
            <td style="font-weight:600;">${name}</td>
            <td>${gstin}</td>
            <td>${phone}</td>
            <td>${city}</td>
            <td>${window.FormatUtil.formatRupees(limit)}</td>
            <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:0.7rem;">Profile</button></td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  async loadSuppliers() {
    const tbody = document.getElementById('suppliers-table-tbody');
    if (!tbody) return;
    try {
      const list = await window.MasterService.getParties('SUPPLIER');
      this.suppliersCache = list || [];
      if (this.suppliersCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim);">No suppliers found.</td></tr>`;
        return;
      }
      tbody.innerHTML = this.suppliersCache.map(s => {
        const code = s.partyCode || s.code || '-';
        const name = s.name || s.partyName || '-';
        const gstin = s.gstin || '-';
        const phone = s.phone || '-';
        const bankName = s.bankName || s.bankDetails || 'State Bank of India';
        const acNo = s.accountNo || 'XXXX1234';
        const ifsc = s.ifsc || 'SBIN0001234';
        return `
          <tr>
            <td style="font-weight:700; color:var(--cyan);">${code}</td>
            <td style="font-weight:600;">${name}</td>
            <td>${gstin}</td>
            <td>${phone}</td>
            <td>${bankName}</td>
            <td>${acNo}</td>
            <td>${ifsc}</td>
            <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:0.7rem;">Ledger</button></td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  openNewCustomerModal() {
    window.AppDialogService.openModal('modal-new-customer');
  },

  openNewSupplierModal() {
    window.AppDialogService.openModal('modal-new-supplier');
  },

  async handleCustomerSave(e) {
    e.preventDefault();
    const code = document.getElementById('cust-code').value.trim();
    const name = document.getElementById('cust-name').value.trim();
    const gstin = document.getElementById('cust-gstin').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const payload = {
      partyCode: code,
      code: code,
      name: name,
      gstin: gstin,
      phone: phone,
      address: address,
      partyType: 'CUSTOMER',
      active: true
    };
    try {
      await window.MasterService.createParty(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Customer ${name} created!`, 'success');
      window.AppDialogService.closeModal('modal-new-customer');
      this.loadCustomers();
    } catch (err) {
      window.AppDialogService.showToast(err.message, 'error');
    }
  },

  async handleSupplierSave(e) {
    e.preventDefault();
    const code = document.getElementById('sup-code').value.trim();
    const name = document.getElementById('sup-name').value.trim();
    const gstin = document.getElementById('sup-gstin').value.trim();
    const phone = document.getElementById('sup-phone').value.trim();
    const bank = document.getElementById('sup-bank').value.trim();
    const payload = {
      partyCode: code,
      code: code,
      name: name,
      gstin: gstin,
      phone: phone,
      bankDetails: bank,
      address: bank,
      partyType: 'SUPPLIER',
      active: true
    };
    try {
      await window.MasterService.createParty(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Supplier ${name} registered!`, 'success');
      window.AppDialogService.closeModal('modal-new-supplier');
      this.loadSuppliers();
    } catch (err) {
      window.AppDialogService.showToast(err.message, 'error');
    }
  }
};
