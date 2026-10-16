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
      if (window.SalesController && window.SalesController.openSaleWorkspace) {
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
                <div class="action-menu-item" onclick="window.SalesController.openSaleWorkspace(null, '${(c.name || '').replace(/'/g, "\\'")}')"><span style="margin-right:8px;">🛒</span> New Sales Invoice</div>
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
      if (window.PurchaseController && window.PurchaseController.openPurchaseEditor) {
        window.PurchaseController.openPurchaseEditor(null, supp?.name || '');
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
                <div class="action-menu-item" onclick="window.PurchaseController.openPurchaseEditor()"><span style="margin-right:8px;">📦</span> Record Inward Bill</div>
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
  // 4. CUSTOMER 360° PROFILE (Customer360.fxml Parity)
  // ==========================================

  async function openCustomer360(id) {
    active360PartyId = id;
    const modal = document.getElementById('modal-customer-360');
    if (!modal) return;
    modal.classList.add('open');
    modal.style.display = 'flex';

    // Reset tabs to Invoices
    switch360Tab('c360-tab-invoices', 'c360-pane-invoices');

    try {
      let sum = null;
      if (window.ReportService) {
        sum = await window.ReportService.getCustomer360Summary(id);
      }
      const rawCust = customers.find(c => c.id === id);
      const cust = (sum && sum.customer) ? sum.customer : (rawCust || {
        name: 'Customer Client',
        code: `CUST-${id}`,
        gstin: '24AAACR1234F1Z1',
        phone: '9825012345',
        email: 'billing@client.com',
        address: 'Surat, Gujarat',
        openingBalance: 125000
      });

      const outstanding = (sum && sum.outstandingReceivable !== undefined) ? sum.outstandingReceivable : (sum ? sum.outstandingBalance : cust.openingBalance);
      const totalSales = (sum && sum.totalSales !== undefined) ? sum.totalSales : 0;
      const invoiceCount = (sum && sum.recentInvoices) ? sum.recentInvoices.length : (sum?.invoiceCount || 0);
      const lastPayment = (sum && sum.lastPaymentAmount !== undefined) ? sum.lastPaymentAmount : 0;

      document.getElementById('c360-title').innerText = cust.name || 'Customer 360° Profile';
      document.getElementById('c360-code').innerText = cust.code || cust.partyCode || '-';
      document.getElementById('c360-gstin').innerText = cust.gstin || '-';
      document.getElementById('c360-contact').innerText = cust.contactPerson || '-';
      document.getElementById('c360-phone').innerText = cust.phone || '-';
      document.getElementById('c360-email').innerText = cust.email || '-';
      document.getElementById('c360-address').innerText = cust.address || '-';

      document.getElementById('c360-kpi-outstanding').innerText = formatMoney(outstanding || 0);
      document.getElementById('c360-kpi-count').innerText = `${invoiceCount} Invoices`;
      document.getElementById('c360-kpi-total').innerText = formatMoney(totalSales || 0);
      document.getElementById('c360-kpi-last-payment').innerText = formatMoney(lastPayment || 0);

      // Load all sub-tabs asynchronously
      loadCustomer360Invoices(id);
      loadCustomer360Quotes(id);
      loadCustomer360Payments(id);
      loadCustomer360Contacts(id);
      loadCustomer360Notes(id);
    } catch (err) {
      console.warn('Customer 360 load warning:', err);
    }
  }

  async function loadCustomer360Invoices(id) {
    const tbody = document.getElementById('c360-invoices-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading invoices...</td></tr>`;

    try {
      let list = [];
      if (window.ReportService) {
        list = await window.ReportService.getCustomer360Invoices(id);
      }
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);">No sales invoices recorded for this customer.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(inv => `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${inv.invoiceNo || '-'}</td>
          <td>${inv.invoiceDate || '-'}</td>
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
      if (window.ReportService) {
        list = await window.ReportService.getCustomer360Quotations(id);
      }
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-dim);">No quotations recorded for this customer.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(q => `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${q.no || '-'}</td>
          <td>${q.date || '-'}</td>
          <td style="color:var(--text-muted);">${q.valid || '-'}</td>
          <td>${q.salesperson || '-'}</td>
          <td style="text-align:right; font-weight:700;">${formatMoney(q.amount || 0)}</td>
          <td style="text-align:center;"><span class="badge badge-paid">${q.status || 'SENT'}</span></td>
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
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getCustomer360Payments(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);">No receipt vouchers recorded.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(p => `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${p.referenceNo || p.receiptNo || 'RCT-' + p.id}</td>
          <td>${p.paymentDate || '-'}</td>
          <td><span class="badge badge-neutral">${p.paymentMode || p.mode || 'BANK'}</span></td>
          <td style="font-family:monospace;">${p.invoiceNo || '-'}</td>
          <td style="text-align:right; font-weight:700; color:var(--accent-green);">${formatMoney(p.amount)}</td>
          <td style="color:var(--text-muted); font-size:0.75rem;">${p.notes || '-'}</td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:var(--text-dim);">No receipt records found.</td></tr>`;
    }
  }

  async function loadCustomer360Contacts(id) {
    const tbody = document.getElementById('c360-contacts-tbody');
    if (!tbody) return;
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getCustomer360Contacts(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-dim);">No additional contacts linked.</td></tr>`;
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
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:var(--text-dim);">No contacts found.</td></tr>`;
    }
  }

  async function loadCustomer360Notes(id) {
    const tbody = document.getElementById('c360-notes-tbody');
    if (!tbody) return;
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getCustomer360Notes(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-dim);">No notes recorded for this customer yet.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(n => `
        <tr>
          <td style="color:var(--text-main); font-weight:500;">${n.note || '-'}</td>
          <td style="color:var(--cyan);">${n.createdBy || 'Admin'}</td>
          <td style="color:var(--text-muted); font-size:0.75rem;">${n.createdAt || '-'}</td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:15px; color:var(--text-dim);">No notes found.</td></tr>`;
    }
  }

  async function addCustomerNote() {
    const input = document.getElementById('c360-new-note');
    if (!input) return;
    const noteText = input.value.trim();
    if (!noteText) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('Please enter note text first.');
      else alert('Please enter note text.');
      return;
    }
    if (!active360PartyId) return;

    try {
      await window.ReportService.saveCustomerNote(active360PartyId, { note: noteText, rowVersion: 0 });
      input.value = '';
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Note added successfully.');
      loadCustomer360Notes(active360PartyId);
    } catch (err) {
      alert('Failed to save note: ' + (err.message || 'Server error'));
    }
  }

  // ==========================================
  // 5. SUPPLIER 360° PROFILE (Supplier360.fxml Parity)
  // ==========================================

  async function openSupplier360(id) {
    active360PartyId = id;
    const modal = document.getElementById('modal-supplier-360');
    if (!modal) return;
    modal.classList.add('open');
    modal.style.display = 'flex';

    switch360Tab('s360-tab-bills', 's360-pane-bills');

    try {
      let sum = null;
      if (window.ReportService) {
        sum = await window.ReportService.getSupplier360Summary(id);
      }
      const rawSup = suppliers.find(s => s.id === id);
      const sup = (sum && sum.supplier) ? sum.supplier : (rawSup || {
        name: 'Supplier Vendor',
        code: `SUPP-${id}`,
        gstin: '20AAACT0012F1Z3',
        phone: '9824011223',
        email: 'sales@vendor.com',
        address: 'Hazira, Surat',
        openingBalance: 85000
      });

      const outstanding = (sum && sum.outstandingPayable !== undefined) ? sum.outstandingPayable : (sum ? sum.outstandingBalance : sup.openingBalance);
      const totalPurchases = (sum && sum.totalPurchases !== undefined) ? sum.totalPurchases : 0;
      const purchaseCount = (sum && sum.recentPurchases) ? sum.recentPurchases.length : (sum?.purchaseCount || 0);
      const lastPayment = (sum && sum.lastPaymentAmount !== undefined) ? sum.lastPaymentAmount : 0;

      document.getElementById('s360-title').innerText = sup.name || 'Supplier 360° Profile';
      document.getElementById('s360-code').innerText = sup.code || sup.partyCode || '-';
      document.getElementById('s360-gstin').innerText = sup.gstin || '-';
      document.getElementById('s360-contact').innerText = sup.contactPerson || '-';
      document.getElementById('s360-phone').innerText = sup.phone || '-';
      document.getElementById('s360-email').innerText = sup.email || '-';
      document.getElementById('s360-address').innerText = sup.address || '-';

      document.getElementById('s360-kpi-outstanding').innerText = formatMoney(outstanding || 0);
      document.getElementById('s360-kpi-count').innerText = `${purchaseCount} Bills`;
      document.getElementById('s360-kpi-total').innerText = formatMoney(totalPurchases || 0);
      document.getElementById('s360-kpi-last-payment').innerText = formatMoney(lastPayment || 0);

      // Load all sub-tabs asynchronously
      loadSupplier360Purchases(id);
      loadSupplier360Payments(id);
      loadSupplier360Contacts(id);
      loadSupplier360Notes(id);
    } catch (err) {
      console.warn('Supplier 360 load warning:', err);
    }
  }

  async function loadSupplier360Purchases(id) {
    const tbody = document.getElementById('s360-bills-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading vendor bills...</td></tr>`;

    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getSupplier360Purchases(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);">No purchase bills recorded for this supplier.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(b => `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${b.invoiceNo || b.billNo || '-'}</td>
          <td>${b.invoiceDate || b.billDate || '-'}</td>
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
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getSupplier360Payments(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);">No payment vouchers recorded.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(p => `
        <tr>
          <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${p.referenceNo || p.voucherNo || 'PV-' + p.id}</td>
          <td>${p.paymentDate || p.date || '-'}</td>
          <td><span class="badge badge-neutral">${p.paymentMode || p.bank || 'BANK'}</span></td>
          <td style="font-family:monospace;">${p.invoiceNo || '-'}</td>
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
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getSupplier360Contacts(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-dim);">No additional contacts linked.</td></tr>`;
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
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:var(--text-dim);">No contacts found.</td></tr>`;
    }
  }

  async function loadSupplier360Notes(id) {
    const tbody = document.getElementById('s360-notes-tbody');
    if (!tbody) return;
    try {
      let list = [];
      if (window.ReportService) list = await window.ReportService.getSupplier360Notes(id);
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-dim);">No notes recorded for this vendor yet.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(n => `
        <tr>
          <td style="color:var(--text-main); font-weight:500;">${n.note || '-'}</td>
          <td style="color:var(--cyan);">${n.createdBy || 'Admin'}</td>
          <td style="color:var(--text-muted); font-size:0.75rem;">${n.createdAt || '-'}</td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:15px; color:var(--text-dim);">No notes found.</td></tr>`;
    }
  }

  async function addSupplierNote() {
    const input = document.getElementById('s360-new-note');
    if (!input) return;
    const noteText = input.value.trim();
    if (!noteText) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('Please enter note text first.');
      else alert('Please enter note text.');
      return;
    }
    if (!active360PartyId) return;

    try {
      await window.ReportService.saveSupplierNote(active360PartyId, { note: noteText, rowVersion: 0 });
      input.value = '';
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Note added successfully.');
      loadSupplier360Notes(active360PartyId);
    } catch (err) {
      alert('Failed to save note: ' + (err.message || 'Server error'));
    }
  }

  function switch360Tab(btnId, paneId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const parentContainer = btn.closest('.modal-card') || document;
    parentContainer.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    parentContainer.querySelectorAll('.sub-tab-pane').forEach(p => p.style.display = 'none');
    btn.classList.add('active');
    const pane = document.getElementById(paneId);
    if (pane) pane.style.display = 'block';
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
    openCustomer360,
    openSupplier360,
    switch360Tab,
    addCustomerNote,
    addSupplierNote,

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

    exportCustomers() { window.open('/api/master/parties/export?type=CUSTOMER', '_blank'); },
    exportSuppliers() { window.open('/api/master/parties/export?type=SUPPLIER', '_blank'); }
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (window.RegisterUiSupport) {
    window.RegisterUiSupport.installEscapeClose('customer-detail-drawer', () => window.PartyController.closeCustomerDrawer());
    window.RegisterUiSupport.installEscapeClose('supplier-detail-drawer', () => window.PartyController.closeSupplierDrawer());
  }
});

