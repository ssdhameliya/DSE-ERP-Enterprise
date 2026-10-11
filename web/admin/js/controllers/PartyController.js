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
      tbody.innerHTML = this.customersCache.map(c => `
        <tr>
          <td style="font-weight:700; color:var(--cyan);">${c.code}</td>
          <td style="font-weight:600;">${c.name || c.partyName}</td>
          <td>${c.gstin || '-'}</td>
          <td>${c.phone || '-'}</td>
          <td>${c.city || 'Gujarat'}</td>
          <td>${window.FormatUtil.formatRupees(c.creditLimit || 50000)}</td>
          <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:0.7rem;">Profile</button></td>
        </tr>
      `).join('');
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
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No suppliers found.</td></tr>`;
        return;
      }
      tbody.innerHTML = this.suppliersCache.map(s => `
        <tr>
          <td style="font-weight:700; color:var(--cyan);">${s.code}</td>
          <td style="font-weight:600;">${s.name || s.partyName}</td>
          <td>${s.gstin || '-'}</td>
          <td>${s.phone || '-'}</td>
          <td>${s.city || 'Mumbai'}</td>
          <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:0.7rem;">Ledger</button></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
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
    const payload = {
      code: document.getElementById('cust-code').value.trim(),
      name: document.getElementById('cust-name').value.trim(),
      gstin: document.getElementById('cust-gstin').value.trim(),
      phone: document.getElementById('cust-phone').value.trim(),
      address: document.getElementById('cust-address').value.trim(),
      partyType: 'CUSTOMER',
      active: true
    };
    try {
      await window.MasterService.createParty(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Customer ${payload.name} created!`, 'success');
      window.AppDialogService.closeModal('modal-new-customer');
      this.loadCustomers();
    } catch (err) {
      window.AppDialogService.showToast(err.message, 'error');
    }
  },

  async handleSupplierSave(e) {
    e.preventDefault();
    const payload = {
      code: document.getElementById('sup-code').value.trim(),
      name: document.getElementById('sup-name').value.trim(),
      gstin: document.getElementById('sup-gstin').value.trim(),
      phone: document.getElementById('sup-phone').value.trim(),
      bankDetails: document.getElementById('sup-bank').value.trim(),
      partyType: 'SUPPLIER',
      active: true
    };
    try {
      await window.MasterService.createParty(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Supplier ${payload.name} registered!`, 'success');
      window.AppDialogService.closeModal('modal-new-supplier');
      this.loadSuppliers();
    } catch (err) {
      window.AppDialogService.showToast(err.message, 'error');
    }
  }
};
