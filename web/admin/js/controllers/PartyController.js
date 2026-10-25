/**
 * Jasvi Industries ERP - PartyController
 * Desktop Parity Implementation for CustomerController.java, SupplierController.java, and PartyDialogController.java
 * Customer CRM & Supplier Master Directory, 360° Views, GSTIN Validations, Quotations, Contacts, and Ledger Statements
 */
window.PartyController = (function() {
  let customers = [];
  let filteredCustomers = [];
  let suppliers = [];
  let filteredSuppliers = [];

  let selectedCustomerId = null;
  let selectedSupplierId = null;

  let editingPartyId = null;
  let editingPartyType = 'CUSTOMER';
  let editingRowVersion = 0;

  let active360PartyId = null;

  function formatMoney(amount) {
    return '₹ ' + (parseFloat(amount) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Close open action menus when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.action-dropdown-menu').forEach(m => {
      m.style.display = 'none';
    });
  });

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

  function selectCustomerRow(id) {
    onCustomerRowClick(id);
  }

  function onCustomerRowClick(id, event) {
    if (event && window.RegisterUiSupport && window.RegisterUiSupport.isInteractiveTarget(event.target)) return;
    const drawer = document.getElementById('customer-detail-drawer');
    const isDrawerOpen = drawer && (drawer.classList.contains('open') || drawer.style.display === 'flex');
    if (isDrawerOpen && selectedCustomerId === id) {
      closeCustomerDrawer();
      return;
    }
    showCustomerDetails(id);
  }

  function showCustomerDetails(id) {
    const cust = customers.find(c => c.id === id);
    if (!cust) return;
    selectedCustomerId = id;

    const rowEl = document.querySelector(`#customers-table-tbody tr[data-cust-id="${id}"]`);
    if (window.RegisterUiSupport && rowEl) {
      window.RegisterUiSupport.highlightRow('#customers-table-tbody', rowEl);
    }

    const nameEl = document.getElementById('cd-name');
    if (nameEl) nameEl.innerText = cust.name || 'Customer Details';
    const codeEl = document.getElementById('cd-code');
    if (codeEl) codeEl.innerText = cust.partyCode || cust.code || `ID: ${cust.id}`;

    const statusEl = document.getElementById('cd-status');
    if (statusEl) {
      const isActive = cust.active !== false;
      statusEl.innerText = isActive ? 'ACTIVE' : 'INACTIVE';
      statusEl.className = `pill-badge ${isActive ? 'pill-success' : 'pill-danger'}`;
    }

    const gstTypeEl = document.getElementById('cd-gst-type');
    if (gstTypeEl) {
      const hasGst = cust.gstin && cust.gstin.trim().length >= 15;
      gstTypeEl.innerText = hasGst ? 'B2B REGISTERED' : 'UNREGISTERED / CONSUMER';
      gstTypeEl.className = `pill-badge ${hasGst ? 'pill-neutral' : 'pill-warning'}`;
    }

    const phoneEl = document.getElementById('cd-phone');
    if (phoneEl) phoneEl.innerText = cust.phone || '-';
    const emailEl = document.getElementById('cd-email');
    if (emailEl) emailEl.innerText = cust.email || '-';
    const gstinEl = document.getElementById('cd-gstin');
    if (gstinEl) gstinEl.innerText = cust.gstin || '-';
    const panEl = document.getElementById('cd-pan');
    if (panEl) panEl.innerText = cust.pan || (cust.gstin && cust.gstin.length >= 12 ? cust.gstin.substring(2, 12) : '-');

    const bal = parseFloat(cust.openingBalance) || 0;
    const balEl = document.getElementById('cd-balance');
    if (balEl) balEl.innerText = formatMoney(bal);

    const contactEl = document.getElementById('cd-contact');
    if (contactEl) contactEl.innerText = cust.contactPerson || '-';
    const addrEl = document.getElementById('cd-address');
    if (addrEl) addrEl.innerText = cust.address || '-';
    const stateEl = document.getElementById('cd-state');
    if (stateEl) stateEl.innerText = [cust.state, cust.stateCode].filter(Boolean).join(' (Code: ') + (cust.stateCode ? ')' : '') || 'Local State';
    const termsEl = document.getElementById('cd-credit-terms');
    if (termsEl) termsEl.innerText = cust.creditDays ? `Net ${cust.creditDays} Days` : 'Net 30 Days';

    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.showDrawer('customer-detail-drawer');
    } else {
      const drawer = document.getElementById('customer-detail-drawer');
      if (drawer) { drawer.classList.add('open'); drawer.style.display = 'flex'; }
    }
  }

  function closeCustomerDrawer() {
    selectedCustomerId = null;
    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.hideDrawer('customer-detail-drawer', '#customers-table-tbody');
    } else {
      const drawer = document.getElementById('customer-detail-drawer');
      if (drawer) { drawer.classList.remove('open'); drawer.style.display = 'none'; }
      document.querySelectorAll('#customers-table-tbody tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    }
  }

  function drawerEditCustomer() {
    if (selectedCustomerId) openEditPartyModal('CUSTOMER', selectedCustomerId);
  }

  function drawerCustomer360() {
    if (selectedCustomerId) openCustomer360(selectedCustomerId);
  }

  function drawerCustomerLedger() {
    if (selectedCustomerId) {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (window.NavigationRouter) {
        window.NavigationRouter.selectNav('view-general-ledger');
        setTimeout(() => {
          if (window.FinanceController && window.FinanceController.selectLedgerAccount) {
            window.FinanceController.selectLedgerAccount(cust?.name || '');
          }
        }, 300);
      }
    }
  }

  function drawerNewSale() {
    if (selectedCustomerId) {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (window.SalesController && window.SalesController.openSaleForCustomer) {
        window.SalesController.openSaleForCustomer(cust || selectedCustomerId);
      } else if (window.SalesController && window.SalesController.openSaleWorkspace) {
        window.SalesController.openSaleWorkspace(null, cust?.name || '');
      }
    }
  }

  function openSelectedCustomer360() {
    const targetId = selectedCustomerId || (filteredCustomers[0] ? filteredCustomers[0].id : null);
    if (!targetId) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('Please select a customer or add one first.');
      else alert('Please select a customer first.');
      return;
    }
    openCustomer360(targetId);
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

    tbody.innerHTML = rows.map((c) => {
      const code = c.partyCode || c.code || '-';
      const bal = parseFloat(c.openingBalance) || 0;
      const isActive = c.active !== false;

      return `
        <tr id="cust-row-${c.id}" data-cust-id="${c.id}" onclick="window.PartyController.onCustomerRowClick(${c.id}, event)" ondblclick="window.PartyController.openCustomer360(${c.id})" style="cursor:pointer;">
          <td style="font-weight:700; color:var(--cyan); font-family:'Space Grotesk', monospace;">${code}</td>
          <td style="font-weight:600; color:var(--text-main);">${c.name || '-'}</td>
          <td>${c.contactPerson || '-'}</td>
          <td style="color:var(--text-muted);">${c.phone || '-'}</td>
          <td style="color:var(--text-muted);">${c.email || '-'}</td>
          <td style="font-family:monospace; color:var(--purple);">${c.gstin || 'Unregistered'}</td>
          <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${c.address || ''}">${c.address || '-'}</td>
          <td style="text-align:right; font-weight:700; color:${bal > 0 ? 'var(--yellow)' : 'var(--text-dim)'};">${formatMoney(bal)}</td>
          <td>${isActive ? '<span class="pill-badge pill-success">ACTIVE</span>' : '<span class="pill-badge pill-danger">INACTIVE</span>'}</td>
          <td style="text-align:center;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.PartyController.togglePartyActionMenu('cust', ${c.id}, event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                ::: Actions
              </button>
              <div id="cust-action-menu-${c.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:210px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.PartyController.openCustomer360(${c.id})"><span style="margin-right:8px;">🌐</span> Customer 360° Profile</div>
                <div class="action-menu-item" onclick="window.PartyController.openEditPartyModal('CUSTOMER', ${c.id})"><span style="margin-right:8px;">✏️</span> Edit Customer</div>
                <div class="action-menu-item" onclick="window.SalesController && window.SalesController.openSaleForCustomer ? window.SalesController.openSaleForCustomer('${(c.name || '').replace(/'/g, "\\'")}') : window.SalesController.openSaleWorkspace(null, '${(c.name || '').replace(/'/g, "\\'")}')"><span style="margin-right:8px;">🛒</span> New Sales Invoice</div>
                <div class="action-menu-item" onclick="window.PartyController.viewAuditTrail('CUSTOMER', ${c.id})"><span style="margin-right:8px;">📜</span> View Audit Trail</div>
                <div class="action-menu-divider" style="height:1px; background:var(--border-subtle); margin:4px 0;"></div>
                <div class="action-menu-item" style="color:var(--red);" onclick="window.PartyController.deleteParty(${c.id}, ${c.rowVersion || 0}, 'CUSTOMER')"><span style="margin-right:8px;">🗑️</span> Delete Customer</div>
              </div>
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

  async function isolateParty(ref, isCustomer = true) {
    if (isCustomer) {
      if (!customers || customers.length === 0) {
        await loadCustomers();
      }
      const searchInput = document.getElementById('cust-search');
      if (searchInput) searchInput.value = ref || '';
      filterCustomers(ref || '');

      const found = (filteredCustomers || []).find(c =>
        (c.partyCode || c.code || '').toUpperCase() === (ref || '').toUpperCase() ||
        (c.name || '').toUpperCase() === (ref || '').toUpperCase() ||
        (c.phone || '') === ref
      );
      if (found) {
        setTimeout(() => {
          showCustomerDetails(found.id);
        }, 150);
      }
    } else {
      if (!suppliers || suppliers.length === 0) {
        await loadSuppliers();
      }
      const searchInput = document.getElementById('supp-search');
      if (searchInput) searchInput.value = ref || '';
      filterSuppliers(ref || '');

      const found = (filteredSuppliers || []).find(s =>
        (s.partyCode || s.code || '').toUpperCase() === (ref || '').toUpperCase() ||
        (s.name || '').toUpperCase() === (ref || '').toUpperCase() ||
        (s.phone || '') === ref
      );
      if (found) {
        setTimeout(() => {
          showSupplierDetails(found.id);
        }, 150);
      }
    }
  }

  function selectSupplierRow(id) {
    onSupplierRowClick(id);
  }

  function onSupplierRowClick(id, event) {
    if (event && window.RegisterUiSupport && window.RegisterUiSupport.isInteractiveTarget(event.target)) return;
    const drawer = document.getElementById('supplier-detail-drawer');
    const isDrawerOpen = drawer && (drawer.classList.contains('open') || drawer.style.display === 'flex');
    if (isDrawerOpen && selectedSupplierId === id) {
      closeSupplierDrawer();
      return;
    }
    showSupplierDetails(id);
  }

  function showSupplierDetails(id) {
    const supp = suppliers.find(s => s.id === id);
    if (!supp) return;
    selectedSupplierId = id;

    const rowEl = document.querySelector(`#suppliers-table-tbody tr[data-supp-id="${id}"]`);
    if (window.RegisterUiSupport && rowEl) {
      window.RegisterUiSupport.highlightRow('#suppliers-table-tbody', rowEl);
    }

    const nameEl = document.getElementById('sd-name');
    if (nameEl) nameEl.innerText = supp.name || 'Supplier Details';
    const codeEl = document.getElementById('sd-code');
    if (codeEl) codeEl.innerText = supp.partyCode || supp.code || `ID: ${supp.id}`;

    const statusEl = document.getElementById('sd-status');
    if (statusEl) {
      const isActive = supp.active !== false;
      statusEl.innerText = isActive ? 'ACTIVE' : 'INACTIVE';
      statusEl.className = `pill-badge ${isActive ? 'pill-success' : 'pill-danger'}`;
    }

    const gstTypeEl = document.getElementById('sd-gst-type');
    if (gstTypeEl) {
      const hasGst = supp.gstin && supp.gstin.trim().length >= 15;
      gstTypeEl.innerText = hasGst ? 'B2B REGISTERED' : 'UNREGISTERED / VENDOR';
      gstTypeEl.className = `pill-badge ${hasGst ? 'pill-neutral' : 'pill-warning'}`;
    }

    const phoneEl = document.getElementById('sd-phone');
    if (phoneEl) phoneEl.innerText = supp.phone || '-';
    const emailEl = document.getElementById('sd-email');
    if (emailEl) emailEl.innerText = supp.email || '-';
    const gstinEl = document.getElementById('sd-gstin');
    if (gstinEl) gstinEl.innerText = supp.gstin || '-';
    const panEl = document.getElementById('sd-pan');
    if (panEl) panEl.innerText = supp.pan || (supp.gstin && supp.gstin.length >= 12 ? supp.gstin.substring(2, 12) : '-');

    const bal = parseFloat(supp.openingBalance) || 0;
    const balEl = document.getElementById('sd-balance');
    if (balEl) balEl.innerText = formatMoney(bal);

    const contactEl = document.getElementById('sd-contact');
    if (contactEl) contactEl.innerText = supp.contactPerson || '-';
    const addrEl = document.getElementById('sd-address');
    if (addrEl) addrEl.innerText = supp.address || '-';
    const stateEl = document.getElementById('sd-state');
    if (stateEl) stateEl.innerText = [supp.state, supp.stateCode].filter(Boolean).join(' (Code: ') + (supp.stateCode ? ')' : '') || 'Local State';
    const termsEl = document.getElementById('sd-credit-terms');
    if (termsEl) termsEl.innerText = supp.creditDays ? `Net ${supp.creditDays} Days` : 'Net 30 Days';

    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.showDrawer('supplier-detail-drawer');
    } else {
      const drawer = document.getElementById('supplier-detail-drawer');
      if (drawer) { drawer.classList.add('open'); drawer.style.display = 'flex'; }
    }
  }

  function closeSupplierDrawer() {
    selectedSupplierId = null;
    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.hideDrawer('supplier-detail-drawer', '#suppliers-table-tbody');
    } else {
      const drawer = document.getElementById('supplier-detail-drawer');
      if (drawer) { drawer.classList.remove('open'); drawer.style.display = 'none'; }
      document.querySelectorAll('#suppliers-table-tbody tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    }
  }

  function drawerEditSupplier() {
    if (selectedSupplierId) openEditPartyModal('SUPPLIER', selectedSupplierId);
  }

  function drawerSupplier360() {
    if (selectedSupplierId) openSupplier360(selectedSupplierId);
  }

  function drawerSupplierLedger() {
    if (selectedSupplierId) {
      const supp = suppliers.find(s => s.id === selectedSupplierId);
      if (window.NavigationRouter) {
        window.NavigationRouter.selectNav('view-general-ledger');
        setTimeout(() => {
          if (window.FinanceController && window.FinanceController.selectLedgerAccount) {
            window.FinanceController.selectLedgerAccount(supp?.name || '');
          }
        }, 300);
      }
    }
  }

  function drawerNewPurchase() {
    if (selectedSupplierId) {
      const supp = suppliers.find(s => s.id === selectedSupplierId);
      if (window.PurchaseController && window.PurchaseController.openPurchaseForSupplier) {
        window.PurchaseController.openPurchaseForSupplier(supp || selectedSupplierId);
      } else if (window.PurchaseController && window.PurchaseController.openPurchaseEditor) {
        window.PurchaseController.openPurchaseEditor(null, false, false, supp?.name || '');
      }
    }
  }

  function openSelectedSupplier360() {
    const targetId = selectedSupplierId || (filteredSuppliers[0] ? filteredSuppliers[0].id : null);
    if (!targetId) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('Please select a supplier or add one first.');
      else alert('Please select a supplier first.');
      return;
    }
    openSupplier360(targetId);
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

    tbody.innerHTML = rows.map((s) => {
      const code = s.partyCode || s.code || '-';
      const bal = parseFloat(s.openingBalance) || 0;
      const isActive = s.active !== false;

      return `
        <tr id="supp-row-${s.id}" data-supp-id="${s.id}" onclick="window.PartyController.onSupplierRowClick(${s.id}, event)" ondblclick="window.PartyController.openSupplier360(${s.id})" style="cursor:pointer;">
          <td style="font-weight:700; color:var(--cyan); font-family:'Space Grotesk', monospace;">${code}</td>
          <td style="font-weight:600; color:var(--text-main);">${s.name || '-'}</td>
          <td>${s.contactPerson || '-'}</td>
          <td style="color:var(--text-muted);">${s.phone || '-'}</td>
          <td style="color:var(--text-muted);">${s.email || '-'}</td>
          <td style="font-family:monospace; color:var(--purple);">${s.gstin || 'Unregistered'}</td>
          <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${s.address || ''}">${s.address || '-'}</td>
          <td style="text-align:right; font-weight:700; color:${bal > 0 ? 'var(--yellow)' : 'var(--text-dim)'};">${formatMoney(bal)}</td>
          <td>${isActive ? '<span class="pill-badge pill-success">ACTIVE</span>' : '<span class="pill-badge pill-danger">INACTIVE</span>'}</td>
          <td style="text-align:center;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.PartyController.togglePartyActionMenu('supp', ${s.id}, event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                ::: Actions
              </button>
              <div id="supp-action-menu-${s.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:210px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.PartyController.openSupplier360(${s.id})"><span style="margin-right:8px;">🏢</span> Supplier 360° Profile</div>
                <div class="action-menu-item" onclick="window.PartyController.openEditPartyModal('SUPPLIER', ${s.id})"><span style="margin-right:8px;">✏️</span> Edit Supplier</div>
                <div class="action-menu-item" onclick="window.PurchaseController && window.PurchaseController.openPurchaseForSupplier ? window.PurchaseController.openPurchaseForSupplier('${(s.name || '').replace(/'/g, "\\'")}') : window.PurchaseController.openPurchaseEditor()"><span style="margin-right:8px;">📦</span> Record Inward Bill</div>
                <div class="action-menu-item" onclick="window.PartyController.viewAuditTrail('SUPPLIER', ${s.id})"><span style="margin-right:8px;">📜</span> View Audit Trail</div>
                <div class="action-menu-divider" style="height:1px; background:var(--border-subtle); margin:4px 0;"></div>
                <div class="action-menu-item" style="color:var(--red);" onclick="window.PartyController.deleteParty(${s.id}, ${s.rowVersion || 0}, 'SUPPLIER')"><span style="margin-right:8px;">🗑️</span> Delete Supplier</div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const recEl = document.getElementById('supp-record-count');
    if (recEl) recEl.innerText = `${rows.length} of ${suppliers.length} supplier records`;
  }

  // ==========================================
  // ACTION DROPDOWN POSITIONING
  // ==========================================

  function togglePartyActionMenu(type, id, event) {
    if (event) event.stopPropagation();
    const menuId = `${type.toLowerCase()}-action-menu-${id}`;
    const targetMenu = document.getElementById(menuId);
    document.querySelectorAll('.action-dropdown-menu').forEach(m => {
      if (m !== targetMenu) m.style.display = 'none';
    });
    if (targetMenu) {
      const isShowing = targetMenu.style.display === 'block';
      if (isShowing) {
        targetMenu.style.display = 'none';
      } else {
        targetMenu.style.display = 'block';
        targetMenu.style.position = 'fixed';
        targetMenu.style.zIndex = '100005';
        const btn = event.currentTarget || event.target;
        const rect = btn.getBoundingClientRect();
        const menuWidth = 210;
        let left = rect.right - menuWidth;
        if (left < 10) left = 10;

        const menuHeight = targetMenu.offsetHeight || 220;
        const spaceBelow = window.innerHeight - rect.bottom;
        let top;
        if (spaceBelow < menuHeight && rect.top > menuHeight) {
          top = Math.max(10, rect.top - menuHeight - 4);
        } else {
          top = rect.bottom + 4;
        }

        targetMenu.style.top = `${top}px`;
        targetMenu.style.left = `${left}px`;
      }
    }
  }

  function viewAuditTrail(type, id) {
    const list = type === 'CUSTOMER' ? customers : suppliers;
    const p = list.find(item => item.id === id);
    const name = p ? p.name : `${type} #${id}`;
    if (window.OperationsService && window.OperationsService.getActivityTimeline) {
      window.OperationsService.getActivityTimeline(type, String(id)).then(timeline => {
        if (window.AppDialogService) {
          window.AppDialogService.toastInfo(`Audit trail for ${name}: ${(timeline || []).length} change records found.`);
        }
      }).catch(() => {
        if (window.AppDialogService) window.AppDialogService.toastInfo(`Audit trail loaded for ${name}.`);
      });
    } else {
      if (window.AppDialogService) window.AppDialogService.toastInfo(`Audit trail loaded for ${name}.`);
      else alert(`Audit trail for ${name}`);
    }
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

    modal.classList.add('open');
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

    modal.classList.add('open');
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
    if (m) {
      m.classList.remove('open');
      m.style.display = 'none';
    }
  }

  // ==========================================
  // 4. CUSTOMER 360° & SUPPLIER 360° (Desktop Parity)
  // ==========================================

  let activeCustomer360Tab = 'overview';
  let activeSupplier360Tab = 'overview';
  let customer360SummaryData = null;
  let supplier360SummaryData = null;

  function fmtDate(d) {
    if (!d) return '-';
    if (window.FormatUtil && typeof window.FormatUtil.formatDate === 'function') {
      return window.FormatUtil.formatDate(d);
    }
    return d;
  }

  function fmtTimestamp(ts) {
    if (!ts) return '-';
    if (window.FormatUtil && typeof window.FormatUtil.formatTimestamp === 'function') {
      return window.FormatUtil.formatTimestamp(ts);
    }
    return ts;
  }

  function backToCustomers() {
    if (window.NavigationRouter) window.NavigationRouter.selectNav('view-customers');
  }

  function backToSuppliers() {
    if (window.NavigationRouter) window.NavigationRouter.selectNav('view-suppliers');
  }

  function editCurrentCustomer360() {
    if (selectedCustomerId) openEditPartyModal(selectedCustomerId, 'CUSTOMER');
  }

  function editCurrentSupplier360() {
    if (selectedSupplierId) openEditPartyModal(selectedSupplierId, 'SUPPLIER');
  }

  function newSaleForCustomer360() {
    if (!selectedCustomerId) return;
    const cust = customers.find(c => c.id === selectedCustomerId) || (customer360SummaryData && customer360SummaryData.customer);
    if (window.SalesController && typeof window.SalesController.openSaleForCustomer === 'function') {
      window.SalesController.openSaleForCustomer(cust || { id: selectedCustomerId });
    } else if (window.SalesController && typeof window.SalesController.openSaleWorkspace === 'function') {
      window.SalesController.openSaleWorkspace(null, cust?.name || '');
    } else if (window.NavigationRouter) {
      window.NavigationRouter.selectNav('view-sale-create');
    }
  }

  function newPurchaseForSupplier360() {
    if (!selectedSupplierId) return;
    const sup = suppliers.find(s => s.id === selectedSupplierId) || (supplier360SummaryData && supplier360SummaryData.supplier);
    if (window.PurchaseController && typeof window.PurchaseController.openPurchaseForSupplier === 'function') {
      window.PurchaseController.openPurchaseForSupplier(sup || { id: selectedSupplierId });
    } else if (window.PurchaseController && typeof window.PurchaseController.openPurchaseEditor === 'function') {
      window.PurchaseController.openPurchaseEditor(null, false, false, sup?.name || '');
    } else if (window.NavigationRouter) {
      window.NavigationRouter.selectNav('view-purchase-creation');
    }
  }

  async function openCustomer360(id) {
    selectedCustomerId = Number(id);
    active360PartyId = selectedCustomerId;
    if (window.NavigationRouter) {
      window.NavigationRouter.selectNav('view-customer-360');
    }
    await renderActiveCustomer360();
  }

  async function openSupplier360(id) {
    selectedSupplierId = Number(id);
    active360PartyId = selectedSupplierId;
    if (window.NavigationRouter) {
      window.NavigationRouter.selectNav('view-supplier-360');
    }
    await renderActiveSupplier360();
  }

  async function refreshCustomer360() {
    const btn = document.getElementById('c360-btn-refresh');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = `<span class="loading-spinner"></span> Refreshing...`;
      btn.disabled = true;
    }
    try {
      await renderActiveCustomer360();
      if (window.AudioSynthesizer) window.AudioSynthesizer.playChime();
      if (window.AppDialogService && window.AppDialogService.showToast) {
        window.AppDialogService.showToast('Customer 360° profile refreshed.', 'success');
      }
    } finally {
      if (btn) {
        btn.innerHTML = origHtml || '⟳ Refresh';
        btn.disabled = false;
      }
    }
  }

  async function refreshSupplier360() {
    const btn = document.getElementById('s360-btn-refresh');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = `<span class="loading-spinner"></span> Refreshing...`;
      btn.disabled = true;
    }
    try {
      await renderActiveSupplier360();
      if (window.AudioSynthesizer) window.AudioSynthesizer.playChime();
      if (window.AppDialogService && window.AppDialogService.showToast) {
        window.AppDialogService.showToast('Supplier 360° profile refreshed.', 'success');
      }
    } finally {
      if (btn) {
        btn.innerHTML = origHtml || '⟳ Refresh';
        btn.disabled = false;
      }
    }
  }

  async function renderActiveCustomer360() {
    if (!selectedCustomerId) {
      if (customers && customers.length > 0) {
        selectedCustomerId = customers[0].id;
      } else {
        try {
          const data = await window.MasterService.getParties('CUSTOMER');
          customers = data || [];
          if (customers.length > 0) selectedCustomerId = customers[0].id;
        } catch (_) {}
      }
    }
    if (!selectedCustomerId) {
      backToCustomers();
      return;
    }
    active360PartyId = selectedCustomerId;

    const id = selectedCustomerId;
    let sum = null;
    try {
      if (window.ReportService) {
        sum = await window.ReportService.getCustomer360Summary(id);
      }
    } catch (err) {
      console.warn('Customer 360 summary load warning:', err);
    }
    customer360SummaryData = sum;

    const rawCust = customers.find(c => c.id === id);
    const cust = (sum && sum.customer) ? sum.customer : (rawCust || {
      name: 'Customer Client',
      code: `CUST-${id}`,
      partyCode: `CUST-${id}`,
      gstin: '-',
      phone: '-',
      email: '-',
      address: '-',
      openingBalance: 0,
      active: true
    });

    const screenNameEl = document.getElementById('c360-screen-name');
    if (screenNameEl) screenNameEl.innerText = `Customer 360° — ${cust.name || 'Profile'}`;
    const statusPill = document.getElementById('c360-status-pill');
    if (statusPill) {
      const isActive = cust.active !== false;
      statusPill.className = isActive ? 'pill-badge pill-success' : 'pill-badge pill-neutral';
      statusPill.innerText = isActive ? 'Active' : 'Inactive';
    }
    const setTxt = (elId, val) => { const el = document.getElementById(elId); if (el) el.innerText = val || '-'; };
    setTxt('c360-det-code', cust.partyCode || cust.code || '-');
    setTxt('c360-det-gstin', cust.gstin || '-');
    setTxt('c360-det-contact', cust.contactPerson || '-');
    setTxt('c360-det-phone', cust.phone || '-');
    setTxt('c360-det-email', cust.email || '-');
    setTxt('c360-det-address', cust.address || '-');

    const outstanding = (sum && sum.outstandingReceivable !== undefined) ? sum.outstandingReceivable : (sum ? sum.outstandingBalance : cust.openingBalance);
    const totalSales = (sum && sum.totalSales !== undefined) ? sum.totalSales : 0;
    const openQuotes = (sum && sum.openQuotationsAmount !== undefined) ? sum.openQuotationsAmount : (sum?.openQuotationsTotal || 0);
    const quotesCount = (sum && sum.openQuotationsCount !== undefined) ? sum.openQuotationsCount : (sum?.recentQuotations?.length || 0);
    const lastPayment = (sum && sum.lastPaymentAmount !== undefined) ? sum.lastPaymentAmount : 0;
    const lastPayDate = (sum && sum.lastPaymentDate) ? fmtDate(sum.lastPaymentDate) : '';

    setTxt('c360-kpi-outstanding', formatMoney(outstanding || 0));
    setTxt('c360-kpi-quotes', formatMoney(openQuotes || 0));
    const quotesMetaEl = document.getElementById('c360-kpi-quotes-meta');
    if (quotesMetaEl) quotesMetaEl.innerText = `${quotesCount} open quotations`;
    setTxt('c360-kpi-sales', formatMoney(totalSales || 0));
    setTxt('c360-kpi-payment', formatMoney(lastPayment || 0));
    const payMetaEl = document.getElementById('c360-kpi-payment-meta');
    if (payMetaEl) payMetaEl.innerText = lastPayDate ? `Paid on ${lastPayDate}` : 'No payment history';

    select360Tab(activeCustomer360Tab || 'overview');
  }

  function select360Tab(tabKey) {
    activeCustomer360Tab = tabKey;
    const tabs = ['overview', 'contacts', 'quotations', 'invoices', 'payments', 'notes', 'documents'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-c360-${t}`);
      const pane = document.getElementById(`pane-c360-${t}`);
      if (btn) btn.classList.toggle('active', t === tabKey);
      if (pane) pane.style.display = (t === tabKey) ? 'block' : 'none';
    });

    const id = selectedCustomerId;
    if (!id) return;

    if (tabKey === 'overview') {
      renderCustomerOverview(id, customer360SummaryData);
    } else if (tabKey === 'contacts') {
      loadCustomer360Contacts(id);
    } else if (tabKey === 'quotations') {
      loadCustomer360Quotes(id);
    } else if (tabKey === 'invoices') {
      loadCustomer360Invoices(id);
    } else if (tabKey === 'payments') {
      loadCustomer360Payments(id);
    } else if (tabKey === 'notes') {
      loadCustomer360Notes(id);
    } else if (tabKey === 'documents') {
      loadCustomer360Documents(id);
    }
  }

  function renderCustomerOverview(id, sum) {
    const qTbody = document.getElementById('c360-overview-quotes-tbody');
    if (qTbody) {
      const quotes = (sum && sum.recentQuotations) ? sum.recentQuotations : [];
      if (quotes.length === 0) {
        qTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-dim);">No recent quotations</td></tr>`;
      } else {
        qTbody.innerHTML = quotes.map(q => `
          <tr ondblclick="window.QuotationController && window.QuotationController.openQuotationView && window.QuotationController.openQuotationView('${q.quotationNo || q.no}')" style="cursor:pointer;">
            <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${q.quotationNo || q.no || '-'}</td>
            <td>${fmtDate(q.quotationDate || q.date)}</td>
            <td style="text-align:right; font-weight:700;">${formatMoney(q.amount || q.totalAmount)}</td>
            <td style="text-align:center;"><span class="badge ${q.status === 'ACCEPTED' ? 'badge-paid' : 'badge-pending'}">${q.status || 'SENT'}</span></td>
          </tr>
        `).join('');
      }
    }

    const iTbody = document.getElementById('c360-overview-invoices-tbody');
    if (iTbody) {
      const invs = (sum && sum.recentInvoices) ? sum.recentInvoices : [];
      if (invs.length === 0) {
        iTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-dim);">No recent invoices</td></tr>`;
      } else {
        iTbody.innerHTML = invs.map(inv => `
          <tr ondblclick="window.SalesInvoiceController && window.SalesInvoiceController.openInvoiceView && window.SalesInvoiceController.openInvoiceView('${inv.invoiceNo}')" style="cursor:pointer;">
            <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${inv.invoiceNo || '-'}</td>
            <td>${fmtDate(inv.invoiceDate)}</td>
            <td style="text-align:right; font-weight:700;">${formatMoney(inv.totalAmount)}</td>
            <td style="text-align:right; font-weight:700; color:${(inv.outstanding || 0) > 0 ? 'var(--accent-red)' : 'var(--text-dim)'};">${formatMoney(inv.outstanding || 0)}</td>
          </tr>
        `).join('');
      }
    }
  }

  async function loadCustomer360Invoices(id) {
    const tbody = document.getElementById('c360-invoices-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading invoices...</td></tr>`;

    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getCustomer360Invoices(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);">No sales invoices recorded for this customer.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(inv => `
        <tr ondblclick="window.SalesInvoiceController && window.SalesInvoiceController.openInvoiceView && window.SalesInvoiceController.openInvoiceView('${inv.invoiceNo}')" style="cursor:pointer;">
          <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${inv.invoiceNo || '-'}</td>
          <td>${fmtDate(inv.invoiceDate)}</td>
          <td style="text-align:right; font-weight:700;">${formatMoney(inv.totalAmount || 0)}</td>
          <td style="text-align:right; color:var(--accent-green);">${formatMoney(inv.paidAmount || 0)}</td>
          <td style="text-align:right; font-weight:700; color:${(inv.outstanding || 0) > 0 ? 'var(--accent-red)' : 'var(--text-dim)'};">${formatMoney(inv.outstanding || 0)}</td>
          <td style="text-align:center;"><span class="badge ${inv.paymentStatus === 'PAID' ? 'badge-paid' : 'badge-pending'}">${inv.paymentStatus || inv.documentStatus || 'POSTED'}</span></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:var(--text-dim);">No prior invoices recorded.</td></tr>`;
    }
  }

  async function loadCustomer360Quotes(id) {
    const tbody = document.getElementById('c360-quotes-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading quotations...</td></tr>`;

    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getCustomer360Quotations(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-dim);">No quotations recorded for this customer.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(q => `
        <tr ondblclick="window.QuotationController && window.QuotationController.openQuotationView && window.QuotationController.openQuotationView('${q.quotationNo || q.no}')" style="cursor:pointer;">
          <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${q.quotationNo || q.no || '-'}</td>
          <td>${fmtDate(q.quotationDate || q.date)}</td>
          <td style="color:var(--text-muted);">${fmtDate(q.validUntil || q.valid || '-')}</td>
          <td>${q.salesperson || '-'}</td>
          <td style="text-align:right; font-weight:700;">${formatMoney(q.amount || q.totalAmount || 0)}</td>
          <td style="text-align:center;"><span class="badge ${q.status === 'ACCEPTED' ? 'badge-paid' : 'badge-pending'}">${q.status || 'SENT'}</span></td>
          <td style="color:var(--text-muted);">${q.followUp || '-'}</td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:var(--text-dim);">No quotations found.</td></tr>`;
    }
  }

  async function loadCustomer360Payments(id) {
    const tbody = document.getElementById('c360-payments-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading payments...</td></tr>`;
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getCustomer360Payments(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-dim);">No receipt vouchers recorded.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(p => `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${p.referenceNo || p.receiptNo || 'RCT-' + p.id}</td>
          <td>${fmtDate(p.paymentDate || p.date)}</td>
          <td style="font-family:monospace;">${p.invoiceNo || '-'}</td>
          <td><span class="badge badge-neutral">${p.paymentMode || p.mode || 'BANK'}</span></td>
          <td style="color:var(--text-muted);">${p.referenceNo || '-'}</td>
          <td style="text-align:right; font-weight:700; color:var(--accent-green);">${formatMoney(p.amount)}</td>
          <td style="color:var(--text-muted); font-size:0.75rem;">${p.notes || '-'}</td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:var(--text-dim);">No receipt records found.</td></tr>`;
    }
  }

  async function loadCustomer360Contacts(id) {
    const tbody = document.getElementById('c360-contacts-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading contacts...</td></tr>`;
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getCustomer360Contacts(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-dim);">No contacts recorded. Click "+ Add Contact" to add one.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(c => `
        <tr>
          <td style="font-weight:600; color:var(--text-main);">${c.name || '-'}</td>
          <td>${c.designation || '-'}</td>
          <td style="color:var(--text-muted);">${c.department || '-'}</td>
          <td style="color:var(--cyan); font-family:monospace;">${c.mobile || '-'}</td>
          <td style="color:var(--text-muted);">${c.email || '-'}</td>
          <td style="text-align:center;">${c.primary ? '<span class="pill-badge pill-success">PRIMARY</span>' : '<span class="pill-badge pill-neutral">SECONDARY</span>'}</td>
          <td style="color:var(--text-muted); font-size:0.75rem;">${c.notes || '-'}</td>
          <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.PartyController.togglePartyActionMenu('ccontact', ${c.id}, event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                ::: Actions
              </button>
              <div id="ccontact-action-menu-${c.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:170px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick='window.PartyController.openEditContactModal("CUSTOMER", ${JSON.stringify(c).replace(/'/g, "&apos;")})'><span style="margin-right:8px;">✏️</span> Edit Contact</div>
                <div class="action-menu-item" style="color:var(--red);" onclick='window.PartyController.deleteContact("CUSTOMER", ${c.id}, ${c.rowVersion || 0})'><span style="margin-right:8px;">🗑️</span> Delete Contact</div>
              </div>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:15px; color:var(--text-dim);">No contacts found.</td></tr>`;
    }
  }

  async function loadCustomer360Notes(id) {
    const tbody = document.getElementById('c360-notes-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading notes...</td></tr>`;
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getCustomer360Notes(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-dim);">No notes recorded yet. Click "+ Add Note" to create one.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(n => `
        <tr>
          <td style="color:var(--text-muted); font-size:0.75rem; white-space:nowrap;">${fmtTimestamp(n.updatedAt || n.createdAt)}</td>
          <td style="color:var(--cyan); font-weight:600;">${n.updatedBy || n.createdBy || 'Admin'}</td>
          <td style="color:var(--text-main); font-weight:500;">${n.note || '-'}</td>
          <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.PartyController.togglePartyActionMenu('cnote', ${n.id}, event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                ::: Actions
              </button>
              <div id="cnote-action-menu-${n.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:170px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick='window.PartyController.openEditNoteModal("CUSTOMER", ${JSON.stringify(n).replace(/'/g, "&apos;")})'><span style="margin-right:8px;">✏️</span> Edit Note</div>
                <div class="action-menu-item" style="color:var(--red);" onclick='window.PartyController.deleteNote("CUSTOMER", ${n.id}, ${n.rowVersion || 0})'><span style="margin-right:8px;">🗑️</span> Delete Note</div>
              </div>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-dim);">No notes found.</td></tr>`;
    }
  }

  async function loadCustomer360Documents(id) {
    const tbody = document.getElementById('c360-documents-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading documents...</td></tr>`;
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getPartyDocuments('CUSTOMER', id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-dim);">No documents attached. Click "+ Add Document" to upload.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(d => `
        <tr>
          <td style="font-weight:600; color:var(--cyan);">📄 ${d.fileName || d.name || 'Document'}</td>
          <td style="color:var(--text-muted); font-size:0.75rem;">${fmtTimestamp(d.createdAt)}</td>
          <td style="color:var(--text-main);">${d.createdBy || 'Admin'}</td>
          <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.PartyController.togglePartyActionMenu('cdoc', ${d.id}, event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                ::: Actions
              </button>
              <div id="cdoc-action-menu-${d.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:180px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick='window.PartyController.previewPartyDocument("CUSTOMER", ${id}, ${d.id}, "${encodeURIComponent(d.fileName || "")}")'><span style="margin-right:8px;">📥</span> Download / Preview</div>
                <div class="action-menu-item" style="color:var(--red);" onclick='window.PartyController.deletePartyDocument("CUSTOMER", ${id}, ${d.id})'><span style="margin-right:8px;">🗑️</span> Delete Document</div>
              </div>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-dim);">No documents found.</td></tr>`;
    }
  }

  // ==========================================
  // SUPPLIER 360° IMPLEMENTATION
  // ==========================================

  async function renderActiveSupplier360() {
    if (!selectedSupplierId) {
      if (suppliers && suppliers.length > 0) {
        selectedSupplierId = suppliers[0].id;
      } else {
        try {
          const data = await window.MasterService.getParties('SUPPLIER');
          suppliers = data || [];
          if (suppliers.length > 0) selectedSupplierId = suppliers[0].id;
        } catch (_) {}
      }
    }
    if (!selectedSupplierId) {
      backToSuppliers();
      return;
    }
    active360PartyId = selectedSupplierId;

    const id = selectedSupplierId;
    let sum = null;
    try {
      if (window.ReportService) {
        sum = await window.ReportService.getSupplier360Summary(id);
      }
    } catch (err) {
      console.warn('Supplier 360 summary load warning:', err);
    }
    supplier360SummaryData = sum;

    const rawSup = suppliers.find(s => s.id === id);
    const sup = (sum && sum.supplier) ? sum.supplier : (rawSup || {
      name: 'Supplier Vendor',
      code: `SUPP-${id}`,
      partyCode: `SUPP-${id}`,
      gstin: '-',
      phone: '-',
      email: '-',
      address: '-',
      openingBalance: 0,
      active: true
    });

    const screenNameEl = document.getElementById('s360-screen-name');
    if (screenNameEl) screenNameEl.innerText = `Supplier 360° — ${sup.name || 'Profile'}`;
    const statusPill = document.getElementById('s360-status-pill');
    if (statusPill) {
      const isActive = sup.active !== false;
      statusPill.className = isActive ? 'pill-badge pill-success' : 'pill-badge pill-neutral';
      statusPill.innerText = isActive ? 'Active' : 'Inactive';
    }
    const setTxt = (elId, val) => { const el = document.getElementById(elId); if (el) el.innerText = val || '-'; };
    setTxt('s360-det-code', sup.partyCode || sup.code || '-');
    setTxt('s360-det-gstin', sup.gstin || '-');
    setTxt('s360-det-contact', sup.contactPerson || '-');
    setTxt('s360-det-phone', sup.phone || '-');
    setTxt('s360-det-email', sup.email || '-');
    setTxt('s360-det-address', sup.address || '-');

    const outstanding = (sum && sum.outstandingPayable !== undefined) ? sum.outstandingPayable : (sum ? sum.outstandingBalance : sup.openingBalance);
    const totalPurchases = (sum && sum.totalPurchases !== undefined) ? sum.totalPurchases : 0;
    const purchaseCount = (sum && sum.recentPurchases) ? sum.recentPurchases.length : (sum?.purchaseCount || 0);
    const lastPayment = (sum && sum.lastPaymentAmount !== undefined) ? sum.lastPaymentAmount : 0;
    const lastPayDate = (sum && sum.lastPaymentDate) ? fmtDate(sum.lastPaymentDate) : '';

    setTxt('s360-kpi-outstanding', formatMoney(outstanding || 0));
    setTxt('s360-kpi-count', `${purchaseCount} purchases`);
    setTxt('s360-kpi-total', formatMoney(totalPurchases || 0));
    setTxt('s360-kpi-payment', formatMoney(lastPayment || 0));
    const payMetaEl = document.getElementById('s360-kpi-payment-meta');
    if (payMetaEl) payMetaEl.innerText = lastPayDate ? `Paid on ${lastPayDate}` : 'No payment history';

    selectSupplier360Tab(activeSupplier360Tab || 'overview');
  }

  function selectSupplier360Tab(tabKey) {
    activeSupplier360Tab = tabKey;
    const tabs = ['overview', 'contacts', 'purchases', 'payments', 'notes', 'documents'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-s360-${t}`);
      const pane = document.getElementById(`pane-s360-${t}`);
      if (btn) btn.classList.toggle('active', t === tabKey);
      if (pane) pane.style.display = (t === tabKey) ? 'block' : 'none';
    });

    const id = selectedSupplierId;
    if (!id) return;

    if (tabKey === 'overview') {
      renderSupplierOverview(id, supplier360SummaryData);
    } else if (tabKey === 'contacts') {
      loadSupplier360Contacts(id);
    } else if (tabKey === 'purchases') {
      loadSupplier360Purchases(id);
    } else if (tabKey === 'payments') {
      loadSupplier360Payments(id);
    } else if (tabKey === 'notes') {
      loadSupplier360Notes(id);
    } else if (tabKey === 'documents') {
      loadSupplier360Documents(id);
    }
  }

  function renderSupplierOverview(id, sum) {
    const pTbody = document.getElementById('s360-overview-purchases-tbody');
    if (pTbody) {
      const purchases = (sum && sum.recentPurchases) ? sum.recentPurchases : [];
      if (purchases.length === 0) {
        pTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-dim);">No recent purchases</td></tr>`;
      } else {
        pTbody.innerHTML = purchases.map(p => `
          <tr ondblclick="window.PurchaseInvoiceController && window.PurchaseInvoiceController.openPurchaseView && window.PurchaseInvoiceController.openPurchaseView('${p.invoiceNo}')" style="cursor:pointer;">
            <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${p.invoiceNo || '-'}</td>
            <td>${fmtDate(p.invoiceDate)}</td>
            <td style="text-align:right; font-weight:700;">${formatMoney(p.totalAmount)}</td>
            <td style="text-align:right; font-weight:700; color:${(p.outstanding || 0) > 0 ? 'var(--accent-red)' : 'var(--text-dim)'};">${formatMoney(p.outstanding || 0)}</td>
          </tr>
        `).join('');
      }
    }

    const payTbody = document.getElementById('s360-overview-payments-tbody');
    if (payTbody) {
      const payments = (sum && sum.recentPayments) ? sum.recentPayments : [];
      if (payments.length === 0) {
        payTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-dim);">No recent payments</td></tr>`;
      } else {
        payTbody.innerHTML = payments.map(pay => `
          <tr>
            <td>${fmtDate(pay.paymentDate)}</td>
            <td style="font-family:monospace; font-weight:600; color:var(--cyan);">${pay.invoiceNo || '-'}</td>
            <td style="text-align:right; font-weight:700; color:var(--accent-green);">${formatMoney(pay.amount)}</td>
            <td><span class="badge badge-neutral">${pay.paymentMode || 'BANK'}</span></td>
          </tr>
        `).join('');
      }
    }
  }

  async function loadSupplier360Purchases(id) {
    const tbody = document.getElementById('s360-purchases-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading purchases...</td></tr>`;

    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getSupplier360Purchases(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);">No purchase bills recorded for this supplier.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(b => `
        <tr ondblclick="window.PurchaseInvoiceController && window.PurchaseInvoiceController.openPurchaseView && window.PurchaseInvoiceController.openPurchaseView('${b.invoiceNo || b.billNo}')" style="cursor:pointer;">
          <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${b.invoiceNo || b.billNo || '-'}</td>
          <td>${fmtDate(b.invoiceDate || b.billDate)}</td>
          <td style="text-align:right; font-weight:700;">${formatMoney(b.totalAmount || b.total || 0)}</td>
          <td style="text-align:right; color:var(--accent-green);">${formatMoney(b.paidAmount || 0)}</td>
          <td style="text-align:right; font-weight:700; color:${(b.outstanding || 0) > 0 ? 'var(--accent-red)' : 'var(--text-dim)'};">${formatMoney(b.outstanding || 0)}</td>
          <td style="text-align:center;"><span class="badge ${b.paymentStatus === 'PAID' ? 'badge-paid' : 'badge-pending'}">${b.paymentStatus || b.documentStatus || b.status || 'APPROVED'}</span></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:var(--text-dim);">No inward bills found.</td></tr>`;
    }
  }

  async function loadSupplier360Payments(id) {
    const tbody = document.getElementById('s360-payments-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading payments...</td></tr>`;
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getSupplier360Payments(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);">No payment vouchers recorded.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(p => `
        <tr>
          <td>${fmtDate(p.paymentDate || p.date)}</td>
          <td style="font-family:monospace; font-weight:600; color:var(--cyan);">${p.invoiceNo || '-'}</td>
          <td><span class="badge badge-neutral">${p.paymentMode || p.bank || 'BANK'}</span></td>
          <td style="color:var(--text-muted);">${p.referenceNo || p.voucherNo || '-'}</td>
          <td style="text-align:right; font-weight:700; color:var(--accent-red);">${formatMoney(p.amount)}</td>
          <td style="color:var(--text-muted); font-size:0.75rem;">${p.notes || '-'}</td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:var(--text-dim);">No payment records found.</td></tr>`;
    }
  }

  async function loadSupplier360Contacts(id) {
    const tbody = document.getElementById('s360-contacts-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading contacts...</td></tr>`;
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getSupplier360Contacts(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-dim);">No contacts recorded. Click "+ Add Contact" to add one.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(c => `
        <tr>
          <td style="font-weight:600; color:var(--text-main);">${c.name || '-'}</td>
          <td>${c.designation || '-'}</td>
          <td style="color:var(--text-muted);">${c.department || '-'}</td>
          <td style="color:var(--cyan); font-family:monospace;">${c.mobile || '-'}</td>
          <td style="color:var(--text-muted);">${c.email || '-'}</td>
          <td style="text-align:center;">${c.primary ? '<span class="pill-badge pill-success">PRIMARY</span>' : '<span class="pill-badge pill-neutral">SECONDARY</span>'}</td>
          <td style="color:var(--text-muted); font-size:0.75rem;">${c.notes || '-'}</td>
          <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.PartyController.togglePartyActionMenu('scontact', ${c.id}, event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                ::: Actions
              </button>
              <div id="scontact-action-menu-${c.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:170px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick='window.PartyController.openEditContactModal("SUPPLIER", ${JSON.stringify(c).replace(/'/g, "&apos;")})'><span style="margin-right:8px;">✏️</span> Edit Contact</div>
                <div class="action-menu-item" style="color:var(--red);" onclick='window.PartyController.deleteContact("SUPPLIER", ${c.id}, ${c.rowVersion || 0})'><span style="margin-right:8px;">🗑️</span> Delete Contact</div>
              </div>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:15px; color:var(--text-dim);">No contacts found.</td></tr>`;
    }
  }

  async function loadSupplier360Notes(id) {
    const tbody = document.getElementById('s360-notes-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading notes...</td></tr>`;
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getSupplier360Notes(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-dim);">No notes recorded yet. Click "+ Add Note" to create one.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(n => `
        <tr>
          <td style="color:var(--text-muted); font-size:0.75rem; white-space:nowrap;">${fmtTimestamp(n.updatedAt || n.createdAt)}</td>
          <td style="color:var(--cyan); font-weight:600;">${n.updatedBy || n.createdBy || 'Admin'}</td>
          <td style="color:var(--text-main); font-weight:500;">${n.note || '-'}</td>
          <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.PartyController.togglePartyActionMenu('snote', ${n.id}, event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                ::: Actions
              </button>
              <div id="snote-action-menu-${n.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:170px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick='window.PartyController.openEditNoteModal("SUPPLIER", ${JSON.stringify(n).replace(/'/g, "&apos;")})'><span style="margin-right:8px;">✏️</span> Edit Note</div>
                <div class="action-menu-item" style="color:var(--red);" onclick='window.PartyController.deleteNote("SUPPLIER", ${n.id}, ${n.rowVersion || 0})'><span style="margin-right:8px;">🗑️</span> Delete Note</div>
              </div>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-dim);">No notes found.</td></tr>`;
    }
  }

  async function loadSupplier360Documents(id) {
    const tbody = document.getElementById('s360-documents-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading documents...</td></tr>`;
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getPartyDocuments('SUPPLIER', id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-dim);">No documents attached. Click "+ Add Document" to upload.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(d => `
        <tr>
          <td style="font-weight:600; color:var(--cyan);">📄 ${d.fileName || d.name || 'Document'}</td>
          <td style="color:var(--text-muted); font-size:0.75rem;">${fmtTimestamp(d.createdAt)}</td>
          <td style="color:var(--text-main);">${d.createdBy || 'Admin'}</td>
          <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.PartyController.togglePartyActionMenu('sdoc', ${d.id}, event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                ::: Actions
              </button>
              <div id="sdoc-action-menu-${d.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:180px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick='window.PartyController.previewPartyDocument("SUPPLIER", ${id}, ${d.id}, "${encodeURIComponent(d.fileName || "")}")'><span style="margin-right:8px;">📥</span> Download / Preview</div>
                <div class="action-menu-item" style="color:var(--red);" onclick='window.PartyController.deletePartyDocument("SUPPLIER", ${id}, ${d.id})'><span style="margin-right:8px;">🗑️</span> Delete Document</div>
              </div>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-dim);">No documents found.</td></tr>`;
    }
  }

  // ==========================================
  // CONTACTS & NOTES MODAL ACTIONS
  // ==========================================

  function openAddContactModal(partyType) {
    const type = (partyType || 'CUSTOMER').toUpperCase();
    const partyId = type === 'CUSTOMER' ? selectedCustomerId : selectedSupplierId;
    if (!partyId) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('No active party selected.');
      return;
    }

    document.getElementById('party-contact-modal-title').innerText = `Add ${type === 'CUSTOMER' ? 'Customer' : 'Supplier'} Contact`;
    document.getElementById('pcontact-party-type').value = type;
    document.getElementById('pcontact-party-id').value = partyId;
    document.getElementById('pcontact-id').value = '';
    document.getElementById('pcontact-row-version').value = '0';
    document.getElementById('pcontact-name').value = '';
    document.getElementById('pcontact-designation').value = '';
    document.getElementById('pcontact-department').value = '';
    document.getElementById('pcontact-mobile').value = '';
    document.getElementById('pcontact-email').value = '';
    document.getElementById('pcontact-primary').checked = false;
    document.getElementById('pcontact-notes').value = '';

    const modal = document.getElementById('modal-party-contact');
    if (modal) modal.style.display = 'flex';
    document.getElementById('pcontact-name')?.focus();
  }

  function openEditContactModal(partyType, contact) {
    if (!contact) return;
    const type = (partyType || 'CUSTOMER').toUpperCase();
    const partyId = type === 'CUSTOMER' ? selectedCustomerId : selectedSupplierId;

    document.getElementById('party-contact-modal-title').innerText = `Edit ${type === 'CUSTOMER' ? 'Customer' : 'Supplier'} Contact`;
    document.getElementById('pcontact-party-type').value = type;
    document.getElementById('pcontact-party-id').value = partyId || contact.partyId;
    document.getElementById('pcontact-id').value = contact.id || '';
    document.getElementById('pcontact-row-version').value = contact.rowVersion || 0;
    document.getElementById('pcontact-name').value = contact.name || '';
    document.getElementById('pcontact-designation').value = contact.designation || '';
    document.getElementById('pcontact-department').value = contact.department || '';
    document.getElementById('pcontact-mobile').value = contact.mobile || '';
    document.getElementById('pcontact-email').value = contact.email || '';
    document.getElementById('pcontact-primary').checked = Boolean(contact.primary);
    document.getElementById('pcontact-notes').value = contact.notes || '';

    const modal = document.getElementById('modal-party-contact');
    if (modal) modal.style.display = 'flex';
    document.getElementById('pcontact-name')?.focus();
  }

  function closeContactModal() {
    const modal = document.getElementById('modal-party-contact');
    if (modal) modal.style.display = 'none';
  }

  async function submitContactForm(e) {
    if (e) e.preventDefault();
    const type = document.getElementById('pcontact-party-type').value;
    const partyId = Number(document.getElementById('pcontact-party-id').value);
    const contactId = document.getElementById('pcontact-id').value ? Number(document.getElementById('pcontact-id').value) : null;
    const rowVersion = Number(document.getElementById('pcontact-row-version').value) || 0;

    const name = document.getElementById('pcontact-name').value.trim();
    if (!name) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('Contact name is required.');
      return;
    }

    const payload = {
      id: contactId,
      name,
      designation: document.getElementById('pcontact-designation').value.trim(),
      department: document.getElementById('pcontact-department').value.trim(),
      mobile: document.getElementById('pcontact-mobile').value.trim(),
      email: document.getElementById('pcontact-email').value.trim(),
      primary: document.getElementById('pcontact-primary').checked,
      notes: document.getElementById('pcontact-notes').value.trim(),
      rowVersion
    };

    try {
      if (type === 'CUSTOMER') {
        await window.ReportService.saveCustomerContact(partyId, payload);
      } else {
        await window.ReportService.saveSupplierContact(partyId, payload);
      }

      closeContactModal();
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Contact saved successfully.');

      if (type === 'CUSTOMER') loadCustomer360Contacts(partyId);
      else loadSupplier360Contacts(partyId);
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.showToast(`Failed to save contact: ${err.message}`, 'error');
      else alert(`Failed to save contact: ${err.message}`);
    }
  }

  async function deleteContact(partyType, contactId, rowVersion) {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    const type = (partyType || 'CUSTOMER').toUpperCase();
    const partyId = type === 'CUSTOMER' ? selectedCustomerId : selectedSupplierId;

    try {
      if (type === 'CUSTOMER') {
        await window.ReportService.deleteCustomerContact(partyId, contactId, rowVersion || 0);
        loadCustomer360Contacts(partyId);
      } else {
        await window.ReportService.deleteSupplierContact(partyId, contactId, rowVersion || 0);
        loadSupplier360Contacts(partyId);
      }
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Contact deleted successfully.');
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.showToast(`Failed to delete contact: ${err.message}`, 'error');
      else alert(`Failed to delete contact: ${err.message}`);
    }
  }

  function openAddNoteModal(partyType) {
    const type = (partyType || 'CUSTOMER').toUpperCase();
    const partyId = type === 'CUSTOMER' ? selectedCustomerId : selectedSupplierId;
    if (!partyId) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('No active party selected.');
      return;
    }

    document.getElementById('party-note-modal-title').innerText = `Add ${type === 'CUSTOMER' ? 'Customer' : 'Supplier'} Note`;
    document.getElementById('pnote-party-type').value = type;
    document.getElementById('pnote-party-id').value = partyId;
    document.getElementById('pnote-id').value = '';
    document.getElementById('pnote-row-version').value = '0';
    document.getElementById('pnote-text').value = '';

    const modal = document.getElementById('modal-party-note');
    if (modal) modal.style.display = 'flex';
    document.getElementById('pnote-text')?.focus();
  }

  function openEditNoteModal(partyType, note) {
    if (!note) return;
    const type = (partyType || 'CUSTOMER').toUpperCase();
    const partyId = type === 'CUSTOMER' ? selectedCustomerId : selectedSupplierId;

    document.getElementById('party-note-modal-title').innerText = `Edit ${type === 'CUSTOMER' ? 'Customer' : 'Supplier'} Note`;
    document.getElementById('pnote-party-type').value = type;
    document.getElementById('pnote-party-id').value = partyId || note.partyId;
    document.getElementById('pnote-id').value = note.id || '';
    document.getElementById('pnote-row-version').value = note.rowVersion || 0;
    document.getElementById('pnote-text').value = note.note || '';

    const modal = document.getElementById('modal-party-note');
    if (modal) modal.style.display = 'flex';
    document.getElementById('pnote-text')?.focus();
  }

  function closeNoteModal() {
    const modal = document.getElementById('modal-party-note');
    if (modal) modal.style.display = 'none';
  }

  async function submitNoteForm(e) {
    if (e) e.preventDefault();
    const type = document.getElementById('pnote-party-type').value;
    const partyId = Number(document.getElementById('pnote-party-id').value);
    const noteId = document.getElementById('pnote-id').value ? Number(document.getElementById('pnote-id').value) : null;
    const rowVersion = Number(document.getElementById('pnote-row-version').value) || 0;

    const noteText = document.getElementById('pnote-text').value.trim();
    if (!noteText) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('Note content cannot be empty.');
      return;
    }

    const payload = {
      id: noteId,
      note: noteText,
      rowVersion
    };

    try {
      if (type === 'CUSTOMER') {
        await window.ReportService.saveCustomerNote(partyId, payload);
      } else {
        await window.ReportService.saveSupplierNote(partyId, payload);
      }

      closeNoteModal();
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Note saved successfully.');

      if (type === 'CUSTOMER') loadCustomer360Notes(partyId);
      else loadSupplier360Notes(partyId);
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.showToast(`Failed to save note: ${err.message}`, 'error');
      else alert(`Failed to save note: ${err.message}`);
    }
  }

  async function deleteNote(partyType, noteId, rowVersion) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    const type = (partyType || 'CUSTOMER').toUpperCase();
    const partyId = type === 'CUSTOMER' ? selectedCustomerId : selectedSupplierId;

    try {
      if (type === 'CUSTOMER') {
        await window.ReportService.deleteCustomerNote(partyId, noteId, rowVersion || 0);
        loadCustomer360Notes(partyId);
      } else {
        await window.ReportService.deleteSupplierNote(partyId, noteId, rowVersion || 0);
        loadSupplier360Notes(partyId);
      }
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Note deleted successfully.');
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.showToast(`Failed to delete note: ${err.message}`, 'error');
      else alert(`Failed to delete note: ${err.message}`);
    }
  }

  function uploadPartyDocument(partyType) {
    const type = (partyType || 'CUSTOMER').toUpperCase();
    const partyId = type === 'CUSTOMER' ? selectedCustomerId : selectedSupplierId;
    if (!partyId) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('No active party selected.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      try {
        if (window.AppDialogService) window.AppDialogService.toastInfo(`Uploading ${file.name}...`);
        const token = localStorage.getItem('dse_access_token');
        const endpoint = `/api/support/documents/${encodeURIComponent(type)}/${partyId}/attachments?filename=${encodeURIComponent(file.name)}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/octet-stream'
          },
          body: file
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `Server responded with ${res.status}`);
        }
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Document "${file.name}" uploaded successfully.`);
        if (type === 'CUSTOMER') loadCustomer360Documents(partyId);
        else loadSupplier360Documents(partyId);
      } catch (err) {
        if (window.AppDialogService) window.AppDialogService.showToast(`Document upload failed: ${err.message}`, 'error');
        else alert(`Document upload failed: ${err.message}`);
      }
    };
    document.body.appendChild(input);
    input.click();
    setTimeout(() => { document.body.removeChild(input); }, 1000);
  }

  function previewPartyDocument(partyType, partyId, metaId, fileName) {
    const endpoint = `/api/support/documents/${encodeURIComponent(partyType)}/${partyId}/attachments/${metaId}`;
    if (window.ApiService && window.ApiService.viewFile) {
      window.ApiService.viewFile(endpoint, fileName || 'document');
    } else {
      window.open(endpoint, '_blank');
    }
  }

  async function deletePartyDocument(partyType, partyId, metaId) {
    let confirmed = false;
    if (window.AppDialogService && typeof window.AppDialogService.destructive === 'function') {
      confirmed = await window.AppDialogService.destructive('Delete Document', 'Permanently remove this document?', 'This document will be removed from party records.', 'Delete Document');
    } else {
      confirmed = confirm('Are you sure you want to delete this document?');
    }
    if (!confirmed) return;
    try {
      await window.ReportService.deletePartyDocument(partyType, partyId, metaId);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Document deleted.');
      if (partyType === 'CUSTOMER') loadCustomer360Documents(partyId);
      else loadSupplier360Documents(partyId);
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.showToast(`Failed to delete document: ${err.message}`, 'error');
      else alert(`Failed to delete document: ${err.message}`);
    }
  }

  return {
    loadCustomers,
    filterCustomers,
    selectCustomerRow,
    openSelectedCustomer360,
    loadSuppliers,
    filterSuppliers,
    selectSupplierRow,
    openSelectedSupplier360,
    togglePartyActionMenu,
    viewAuditTrail,
    openNewPartyModal,
    openNewCustomerModal() { openNewPartyModal('CUSTOMER'); },
    openNewSupplierModal() { openNewPartyModal('SUPPLIER'); },
    openEditPartyModal,
    submitSaveParty,
    deleteParty,
    closeModal,

    // 360 Workspace & Methods
    openCustomer360,
    openSupplier360,
    renderActiveCustomer360,
    renderActiveSupplier360,
    refreshCustomer360,
    refreshSupplier360,
    backToCustomers,
    backToSuppliers,
    editCurrentCustomer360,
    editCurrentSupplier360,
    newSaleForCustomer360,
    newPurchaseForSupplier360,
    select360Tab,
    selectSupplier360Tab,

    // Contacts & Notes Modals
    openAddContactModal,
    openEditContactModal,
    closeContactModal,
    submitContactForm,
    deleteContact,
    openAddNoteModal,
    openEditNoteModal,
    closeNoteModal,
    submitNoteForm,
    deleteNote,
    uploadPartyDocument,
    previewPartyDocument,
    deletePartyDocument,

    // Customer Drawer Methods
    onCustomerRowClick,
    showCustomerDetails,
    closeCustomerDrawer,
    drawerEditCustomer,
    drawerCustomer360,
    drawerCustomerLedger,
    drawerNewSale,

    // Supplier Drawer Methods
    onSupplierRowClick,
    showSupplierDetails,
    closeSupplierDrawer,
    drawerEditSupplier,
    drawerSupplier360,
    drawerSupplierLedger,
    drawerNewPurchase,

    exportCustomers() {
      try {
        if (window.XLSX && customers && customers.length > 0) {
          const rows = customers.map(c => ({
            'Party Code': c.partyCode || c.code || '',
            'Customer Name': c.name || '',
            'Contact Person': c.contactPerson || '',
            'Mobile': c.phone || '',
            'Email': c.email || '',
            'GSTIN': c.gstin || '',
            'Address': c.address || '',
            'Opening Balance': c.openingBalance != null ? Number(c.openingBalance) : 0,
            'Status': c.active !== false ? 'ACTIVE' : 'INACTIVE'
          }));
          const ws = window.XLSX.utils.json_to_sheet(rows);
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, 'Customers');
          window.XLSX.writeFile(wb, `Customers_Master_${new Date().toISOString().slice(0, 10)}.xlsx`);
          if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Customers exported to Excel successfully.');
          return;
        }
      } catch (err) {
        console.warn('Local XLSX export error:', err);
      }
      if (window.ApiService && typeof window.ApiService.downloadFile === 'function') {
        window.ApiService.downloadFile('/api/master/parties/export?type=CUSTOMER', 'Customers_Master.xlsx');
      } else {
        window.open('/api/master/parties/export?type=CUSTOMER', '_blank');
      }
    },
    exportSuppliers() {
      try {
        if (window.XLSX && suppliers && suppliers.length > 0) {
          const rows = suppliers.map(s => ({
            'Party Code': s.partyCode || s.code || '',
            'Supplier Name': s.name || '',
            'Contact Person': s.contactPerson || '',
            'Mobile': s.phone || '',
            'Email': s.email || '',
            'GSTIN': s.gstin || '',
            'Address': s.address || '',
            'Opening Balance': s.openingBalance != null ? Number(s.openingBalance) : 0,
            'Status': s.active !== false ? 'ACTIVE' : 'INACTIVE'
          }));
          const ws = window.XLSX.utils.json_to_sheet(rows);
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
          window.XLSX.writeFile(wb, `Suppliers_Master_${new Date().toISOString().slice(0, 10)}.xlsx`);
          if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Suppliers exported to Excel successfully.');
          return;
        }
      } catch (err) {
        console.warn('Local XLSX export error:', err);
      }
      if (window.ApiService && typeof window.ApiService.downloadFile === 'function') {
        window.ApiService.downloadFile('/api/master/parties/export?type=SUPPLIER', 'Suppliers_Master.xlsx');
      } else {
        window.open('/api/master/parties/export?type=SUPPLIER', '_blank');
      }
    },
    isolateParty
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (window.RegisterUiSupport) {
    window.RegisterUiSupport.installEscapeClose('customer-detail-drawer', () => window.PartyController.closeCustomerDrawer());
    window.RegisterUiSupport.installEscapeClose('supplier-detail-drawer', () => window.PartyController.closeSupplierDrawer());
  }
});

