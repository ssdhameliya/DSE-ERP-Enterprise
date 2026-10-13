/**
 * Jasvi Industries ERP - PartyController
 * Desktop Parity Implementation for CustomerController.java, SupplierController.java, and PartyDialogController.java
 * Customer CRM & Supplier Master Directory, 360° Views, GSTIN Validations, and Ledger Statements
 */
window.PartyController = (function() {
  let customers = [];
  let filteredCustomers = [];
  let suppliers = [];
  let filteredSuppliers = [];

  let editingPartyId = null;
  let editingPartyType = 'CUSTOMER';
  let editingRowVersion = 0;

  function formatMoney(amount) {
    return '₹ ' + (parseFloat(amount) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // ==========================================
  // 1. CUSTOMER MASTER (Customer.fxml)
  // ==========================================

  async function loadCustomers() {
    const tbody = document.getElementById('customers-table-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading customer master...</td></tr>`;
    }

    try {
      const data = await window.MasterService.getParties('CUSTOMER');
      customers = data || [];
      filteredCustomers = [...customers];

      updateCustomerKpis(customers);
      renderCustomersTable(filteredCustomers);

    } catch (err) {
      console.error('Failed to load customers:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--red);">⚠️ Failed to load customers: ${err.message || 'Server error'}</td></tr>`;
      }
    }
  }

  function updateCustomerKpis(data) {
    const total = data.length;
    const active = data.filter(c => c.active !== false).length;
    const gstReg = data.filter(c => c.gstin && c.gstin.trim().length >= 15).length;
    const totalBal = data.reduce((sum, c) => sum + (parseFloat(c.openingBalance) || 0), 0);

    const totalEl = document.getElementById('cust-kpi-total');
    const actEl = document.getElementById('cust-kpi-active');
    const gstEl = document.getElementById('cust-kpi-gst');
    const balEl = document.getElementById('cust-kpi-balance');

    if (totalEl) totalEl.innerText = total.toLocaleString();
    if (actEl) actEl.innerText = active.toLocaleString();
    if (gstEl) gstEl.innerText = gstReg.toLocaleString();
    if (balEl) balEl.innerText = formatMoney(totalBal);

    const recEl = document.getElementById('cust-record-count');
    if (recEl) recEl.innerText = `${filteredCustomers.length} customer records`;
  }

  function filterCustomers(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      filteredCustomers = [...customers];
    } else {
      filteredCustomers = customers.filter(c => {
        const code = (c.partyCode || c.code || '').toLowerCase();
        const name = (c.name || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const gstin = (c.gstin || '').toLowerCase();
        return code.includes(q) || name.includes(q) || phone.includes(q) || email.includes(q) || gstin.includes(q);
      });
    }
    renderCustomersTable(filteredCustomers);
  }

  function renderCustomersTable(rows) {
    const tbody = document.getElementById('customers-table-tbody');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:1.8rem; margin-bottom:8px;">👥</div>
            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">No customers found</div>
            <div style="font-size:0.78rem;">Add a customer or update the current search filter.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map((c, idx) => {
      const code = c.partyCode || c.code || '-';
      const bal = parseFloat(c.openingBalance) || 0;
      const isActive = c.active !== false;

      return `
        <tr>
          <td style="font-weight:700; color:var(--cyan); font-family:'Space Grotesk', monospace;">${code}</td>
          <td style="font-weight:600; color:var(--text-main);">${c.name || '-'}</td>
          <td>${c.contactPerson || '-'}</td>
          <td style="color:var(--text-muted);">${c.phone || '-'}</td>
          <td style="color:var(--text-muted);">${c.email || '-'}</td>
          <td style="font-family:monospace; color:var(--purple);">${c.gstin || 'Unregistered'}</td>
          <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${c.address || ''}">${c.address || '-'}</td>
          <td style="text-align:right; font-weight:700; color:${bal > 0 ? 'var(--yellow)' : 'var(--text-dim)'};">${formatMoney(bal)}</td>
          <td>${isActive ? '<span class="pill-badge pill-success">ACTIVE</span>' : '<span class="pill-badge pill-danger">INACTIVE</span>'}</td>
          <td style="text-align:center;">
            <div style="display:flex; gap:4px; justify-content:center;">
              <button class="btn btn-secondary btn-sm" onclick="window.PartyController.openEditPartyModal('CUSTOMER', ${c.id})" style="padding:2px 6px; font-size:0.72rem;" title="Edit Customer">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="window.PartyController.deleteParty(${c.id}, ${c.rowVersion || 0}, 'CUSTOMER')" style="padding:2px 6px; font-size:0.72rem;" title="Delete Customer">🗑️</button>
              <button class="btn btn-primary btn-sm" onclick="window.SalesController.openSaleWorkspace(null, '${c.name.replace(/'/g, "\\'")}')" style="padding:2px 6px; font-size:0.72rem;" title="New Sale">+ Sale</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const recEl = document.getElementById('cust-record-count');
    if (recEl) recEl.innerText = `${rows.length} of ${customers.length} customer records`;
  }

  // ==========================================
  // 2. SUPPLIER MASTER (Suppliers.fxml)
  // ==========================================

  async function loadSuppliers() {
    const tbody = document.getElementById('suppliers-table-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading supplier master...</td></tr>`;
    }

    try {
      const data = await window.MasterService.getParties('SUPPLIER');
      suppliers = data || [];
      filteredSuppliers = [...suppliers];

      updateSupplierKpis(suppliers);
      renderSuppliersTable(filteredSuppliers);

    } catch (err) {
      console.error('Failed to load suppliers:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--red);">⚠️ Failed to load suppliers: ${err.message || 'Server error'}</td></tr>`;
      }
    }
  }

  function updateSupplierKpis(data) {
    const total = data.length;
    const active = data.filter(s => s.active !== false).length;
    const gstReg = data.filter(s => s.gstin && s.gstin.trim().length >= 15).length;
    const totalBal = data.reduce((sum, s) => sum + (parseFloat(s.openingBalance) || 0), 0);

    const totalEl = document.getElementById('supp-kpi-total');
    const actEl = document.getElementById('supp-kpi-active');
    const gstEl = document.getElementById('supp-kpi-gst');
    const balEl = document.getElementById('supp-kpi-balance');

    if (totalEl) totalEl.innerText = total.toLocaleString();
    if (actEl) actEl.innerText = active.toLocaleString();
    if (gstEl) gstEl.innerText = gstReg.toLocaleString();
    if (balEl) balEl.innerText = formatMoney(totalBal);

    const recEl = document.getElementById('supp-record-count');
    if (recEl) recEl.innerText = `${filteredSuppliers.length} supplier records`;
  }

  function filterSuppliers(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      filteredSuppliers = [...suppliers];
    } else {
      filteredSuppliers = suppliers.filter(s => {
        const code = (s.partyCode || s.code || '').toLowerCase();
        const name = (s.name || '').toLowerCase();
        const phone = (s.phone || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        const gstin = (s.gstin || '').toLowerCase();
        return code.includes(q) || name.includes(q) || phone.includes(q) || email.includes(q) || gstin.includes(q);
      });
    }
    renderSuppliersTable(filteredSuppliers);
  }

  function renderSuppliersTable(rows) {
    const tbody = document.getElementById('suppliers-table-tbody');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:1.8rem; margin-bottom:8px;">🏢</div>
            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">No suppliers found</div>
            <div style="font-size:0.78rem;">Add a supplier or update the current search filter.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map((s, idx) => {
      const code = s.partyCode || s.code || '-';
      const bal = parseFloat(s.openingBalance) || 0;
      const isActive = s.active !== false;

      return `
        <tr>
          <td style="font-weight:700; color:var(--cyan); font-family:'Space Grotesk', monospace;">${code}</td>
          <td style="font-weight:600; color:var(--text-main);">${s.name || '-'}</td>
          <td>${s.contactPerson || '-'}</td>
          <td style="color:var(--text-muted);">${s.phone || '-'}</td>
          <td style="color:var(--text-muted);">${s.email || '-'}</td>
          <td style="font-family:monospace; color:var(--purple);">${s.gstin || 'Unregistered'}</td>
          <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${s.address || ''}">${s.address || '-'}</td>
          <td style="text-align:right; font-weight:700; color:${bal > 0 ? 'var(--yellow)' : 'var(--text-dim)'};">${formatMoney(bal)}</td>
          <td>${isActive ? '<span class="pill-badge pill-success">ACTIVE</span>' : '<span class="pill-badge pill-danger">INACTIVE</span>'}</td>
          <td style="text-align:center;">
            <div style="display:flex; gap:4px; justify-content:center;">
              <button class="btn btn-secondary btn-sm" onclick="window.PartyController.openEditPartyModal('SUPPLIER', ${s.id})" style="padding:2px 6px; font-size:0.72rem;" title="Edit Supplier">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="window.PartyController.deleteParty(${s.id}, ${s.rowVersion || 0}, 'SUPPLIER')" style="padding:2px 6px; font-size:0.72rem;" title="Delete Supplier">🗑️</button>
              <button class="btn btn-primary btn-sm" onclick="window.PurchaseController.openPurchaseEditor()" style="padding:2px 6px; font-size:0.72rem;" title="New Purchase Bill">+ Bill</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const recEl = document.getElementById('supp-record-count');
    if (recEl) recEl.innerText = `${rows.length} of ${suppliers.length} supplier records`;
  }

  // ==========================================
  // 3. PARTY DIALOG MODAL (PartyDialog.fxml)
  // ==========================================

  async function openNewPartyModal(type = 'CUSTOMER') {
    editingPartyId = null;
    editingPartyType = type;
    editingRowVersion = 0;

    const modal = document.getElementById('modal-party-dialog');
    if (!modal) return;

    const isCust = type === 'CUSTOMER';
    document.getElementById('party-dialog-title').innerText = isCust ? 'Add Customer' : 'Add Supplier';
    document.getElementById('party-dialog-subtitle').innerText = isCust ? 'Maintain customer contact, tax details and opening balance' : 'Maintain vendor profile, GSTIN and settlement balance';
    document.getElementById('m-party-type').value = type;

    // Fetch next party code from server
    try {
      const nextRes = await window.MasterService.getNextPartyCode(type);
      document.getElementById('m-party-code').value = nextRes?.code || (isCust ? 'CUST' : 'SUPP') + Date.now().toString().slice(-4);
    } catch {
      document.getElementById('m-party-code').value = (isCust ? 'CUST' : 'SUPP') + Date.now().toString().slice(-4);
    }

    document.getElementById('m-party-name').value = '';
    document.getElementById('m-party-contact').value = '';
    document.getElementById('m-party-phone').value = '';
    document.getElementById('m-party-email').value = '';
    document.getElementById('m-party-gstin').value = '';
    document.getElementById('m-party-address').value = '';
    document.getElementById('m-party-balance').value = '0.00';
    document.getElementById('m-party-active').checked = true;

    modal.style.display = 'flex';
  }

  async function openEditPartyModal(type, id) {
    editingPartyId = id;
    editingPartyType = type;

    const isCust = type === 'CUSTOMER';
    const list = isCust ? customers : suppliers;
    const p = list.find(item => item.id === id);
    if (!p) return;

    editingRowVersion = p.rowVersion || 0;

    const modal = document.getElementById('modal-party-dialog');
    if (!modal) return;

    document.getElementById('party-dialog-title').innerText = isCust ? 'Edit Customer' : 'Edit Supplier';
    document.getElementById('party-dialog-subtitle').innerText = `Modify master profile for ${p.name || ''}`;
    document.getElementById('m-party-type').value = type;

    document.getElementById('m-party-code').value = p.partyCode || p.code || '';
    document.getElementById('m-party-name').value = p.name || '';
    document.getElementById('m-party-contact').value = p.contactPerson || '';
    document.getElementById('m-party-phone').value = p.phone || '';
    document.getElementById('m-party-email').value = p.email || '';
    document.getElementById('m-party-gstin').value = p.gstin || '';
    document.getElementById('m-party-address').value = p.address || '';
    document.getElementById('m-party-balance').value = (parseFloat(p.openingBalance) || 0).toFixed(2);
    document.getElementById('m-party-active').checked = p.active !== false;

    modal.style.display = 'flex';
  }

  async function submitSaveParty() {
    const type = document.getElementById('m-party-type')?.value || 'CUSTOMER';
    const code = document.getElementById('m-party-code')?.value?.trim();
    const name = document.getElementById('m-party-name')?.value?.trim();
    const contact = document.getElementById('m-party-contact')?.value?.trim();
    const phone = document.getElementById('m-party-phone')?.value?.trim();
    const email = document.getElementById('m-party-email')?.value?.trim() || '';
    const gstin = document.getElementById('m-party-gstin')?.value?.trim()?.toUpperCase() || '';
    const address = document.getElementById('m-party-address')?.value?.trim();
    const balance = parseFloat(document.getElementById('m-party-balance')?.value) || 0;
    const active = document.getElementById('m-party-active')?.checked !== false;

    if (!name) { alert('Name is required.'); return; }
    if (!phone) { alert('Phone number is required.'); return; }
    if (!address) { alert('Address is required.'); return; }

    if (gstin && gstin.length !== 15) {
      if (!confirm('Entered GSTIN is not 15 characters long. Proceed anyway?')) return;
    }

    const payload = {
      id: editingPartyId,
      partyType: type,
      partyCode: code,
      name: name,
      contactPerson: contact,
      phone: phone,
      email: email,
      gstin: gstin,
      address: address,
      openingBalance: balance,
      active: active,
      rowVersion: editingRowVersion
    };

    const btn = document.getElementById('btn-save-party-dialog');
    if (btn) { btn.disabled = true; btn.innerText = 'Saving...'; }

    try {
      if (editingPartyId) {
        await window.MasterService.updateParty(payload);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`${type === 'CUSTOMER' ? 'Customer' : 'Supplier'} ${name} updated successfully!`);
      } else {
        await window.MasterService.createParty(payload);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`${type === 'CUSTOMER' ? 'Customer' : 'Supplier'} ${name} created successfully!`);
      }

      closeModal('modal-party-dialog');
      if (type === 'CUSTOMER') loadCustomers(); else loadSuppliers();

    } catch (err) {
      console.error('Save party failed:', err);
      alert('Failed to save party: ' + (err.message || 'Server error'));
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = 'Save'; }
    }
  }

  async function deleteParty(id, rowVersion, type) {
    const isCust = type === 'CUSTOMER';
    const label = isCust ? 'Customer' : 'Supplier';
    if (!confirm(`Are you sure you want to delete this ${label}?\n\nWARNING: Active parties with recorded invoices cannot be deleted.`)) return;

    try {
      await window.MasterService.deleteParty(id, rowVersion);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`${label} deleted.`);
      if (isCust) loadCustomers(); else loadSuppliers();
    } catch (err) {
      alert('Delete failed: ' + (err.message || 'Server error'));
    }
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
  }

  return {
    loadCustomers,
    filterCustomers,
    loadSuppliers,
    filterSuppliers,
    openNewPartyModal,
    openEditPartyModal,
    submitSaveParty,
    deleteParty,
    closeModal,
    exportCustomers() { window.open('/api/master/parties/export?type=CUSTOMER', '_blank'); },
    exportSuppliers() { window.open('/api/master/parties/export?type=SUPPLIER', '_blank'); }
  };
})();
