/**
 * Jasvi Industries ERP - PurchaseReconController
 * Desktop Parity Implementation for PurchaseRecon.fxml, ReconSupplier.fxml, and PurchaseReconController.java
 * Independent Purchase Invoice Reconciliation Against Bank Statements & GSTR-2B
 */
window.PurchaseReconController = (function() {
  let reconRecords = [];
  let reconSuppliers = [];
  let activeEditingReconId = null;
  let activeEditingSupplierId = null;
  let editingRowVersion = 0;

  let currentPage = 0;
  let pageSize = 25;
  let totalRows = 0;
  let totalPages = 1;

  function formatMoney(amount) {
    return '₹ ' + (parseFloat(amount) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDate(d) {
    if (!d) return '-';
    try {
      const parts = d.toString().split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return d;
    } catch {
      return d;
    }
  }

  // ==========================================
  // 1. PURCHASE RECON REGISTER (PurchaseRecon.fxml)
  // ==========================================

  async function loadPurchaseRecon() {
    const tbody = document.getElementById('purchase-recon-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading purchase recon records...</td></tr>`;
    }

    try {
      // 1. Update KPI Cards
      const metrics = await window.ReconService.getReconMetrics();
      updateReconKpis(metrics);

      // 2. Fetch suppliers cache for dropdowns
      reconSuppliers = await window.ReconService.getReconSuppliers('', 100) || [];
      populateReconSupplierDropdown();

      // 3. Fetch Page of Records
      const q = document.getElementById('pr-search')?.value?.trim() || '';
      const status = document.getElementById('pr-status-filter')?.value || '';

      const pageRes = await window.ReconService.getReconRecordsPage(currentPage, pageSize, q, status);
      reconRecords = pageRes?.rows || [];
      totalRows = pageRes?.totalRows || reconRecords.length;
      totalPages = pageRes?.totalPages || (Math.ceil(totalRows / pageSize) || 1);

      renderReconTable(reconRecords);
      updatePagination();

    } catch (err) {
      console.error('Failed to load purchase recon:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--red);">⚠️ Error loading purchase recon: ${err.message || 'Server error'}</td></tr>`;
      }
    }
  }

  function updateReconKpis(m) {
    if (!m) return;
    const totalEl = document.getElementById('recon-kpi-total');
    const openEl = document.getElementById('recon-kpi-open');
    const partialEl = document.getElementById('recon-kpi-partial');
    const doneEl = document.getElementById('recon-kpi-done');
    const reviewEl = document.getElementById('recon-kpi-review');
    const outEl = document.getElementById('recon-kpi-outstanding');

    if (totalEl) totalEl.innerText = (m.total || 0).toLocaleString();
    if (openEl) openEl.innerText = (m.open || 0).toLocaleString();
    if (partialEl) partialEl.innerText = (m.partial || 0).toLocaleString();
    if (doneEl) doneEl.innerText = (m.done || 0).toLocaleString();
    if (reviewEl) reviewEl.innerText = (m.review || 0).toLocaleString();
    if (outEl) outEl.innerText = formatMoney(m.outstanding || 0);
  }

  function renderReconTable(rows) {
    const tbody = document.getElementById('purchase-recon-tbody');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:1.8rem; margin-bottom:8px;">🔍</div>
            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">No purchase recon records found</div>
            <div style="font-size:0.78rem;">Click "+ New Purchase Recon" to create or import records.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map(r => {
      const invVal = parseFloat(r.invoiceValue) || 0;
      const balance = parseFloat(r.balance) || 0;
      const status = (r.status || 'OPEN').toUpperCase();

      let badgeClass = 'pill-neutral';
      if (status === 'RECONCILED' || status === 'DONE') badgeClass = 'pill-success';
      else if (status === 'PARTIAL') badgeClass = 'pill-warning';
      else if (status === 'REVIEW') badgeClass = 'pill-danger';
      else badgeClass = 'pill-neutral';

      return `
        <tr onclick="window.PurchaseReconController.onReconRowClick(${r.id}, event)" data-recon-id="${r.id}" style="cursor:pointer;">
          <td style="font-weight:700; color:var(--cyan); font-family:monospace;">${r.systemRef || 'PRC-' + r.id}</td>
          <td style="white-space:nowrap;">${formatDate(r.invoiceDate)}</td>
          <td style="font-weight:600; color:var(--text-main);">${r.supplierName || '-'}</td>
          <td style="font-family:monospace; color:var(--purple);">${r.supplierInvoiceNo || '-'}</td>
          <td style="text-align:right; font-weight:700;">${formatMoney(invVal)}</td>
          <td style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.75rem; color:var(--cyan);" title="${r.linkedRef || ''}">
            ${r.linkedRef || '-'}
          </td>
          <td style="text-align:right; font-weight:700; color:${balance > 0 ? 'var(--yellow)' : 'var(--green)'};">
            ${formatMoney(balance)}
          </td>
          <td style="text-align:center;">
            <span class="pill-badge ${badgeClass}">${status}</span>
          </td>
          <td><span class="pill-badge pill-neutral">${r.source || 'MANUAL'}</span></td>
          <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn btn-secondary btn-sm" onclick="window.PurchaseReconController.toggleActionMenu(${r.id}, event)" style="padding:2px 8px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;">
                Actions ▼
              </button>
              <div id="recon-action-menu-${r.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:200px; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.PurchaseReconController.openEditRecon(${r.id})"><span style="margin-right:8px;">👁️</span> View Recon</div>
                <div class="action-menu-item" onclick="window.PurchaseReconController.openEditRecon(${r.id})"><span style="margin-right:8px;">✏️</span> Edit Recon</div>
                ${((r.linkedAmount && r.linkedAmount > 0.009) || (r.bankAllocatedAmount && r.bankAllocatedAmount > 0.009)) ? `
                  <div class="action-menu-item" onclick="window.PurchaseReconController.viewBankLinks(${r.id})"><span style="margin-right:8px;">🏦</span> Open Bank Statement</div>
                ` : ''}
                <div class="action-menu-divider" style="height:1px; background:var(--border-subtle); margin:4px 0;"></div>
                ${((r.linkedAmount && r.linkedAmount > 0.009) || (r.bankAllocatedAmount && r.bankAllocatedAmount > 0.009)) ? `
                  <div class="action-menu-item disabled" style="opacity:0.4; cursor:not-allowed;" title="Cannot delete record with linked bank statement amount"><span style="margin-right:8px;">🗑️</span> Delete Record</div>
                ` : `
                  <div class="action-menu-item" style="color:var(--red);" onclick="window.PurchaseReconController.deleteReconRecord(${r.id})"><span style="margin-right:8px;">🗑️</span> Delete Record</div>
                `}
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function toggleActionMenu(id, event) {
    if (event) event.stopPropagation();
    const menuId = 'recon-action-menu-' + id;
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
        const btn = event?.currentTarget || event?.target;
        if (btn) {
          const rect = btn.getBoundingClientRect();
          const menuWidth = 200;
          let left = rect.right - menuWidth;
          if (left < 10) left = 10;

          const menuHeight = targetMenu.offsetHeight || 140;
          const spaceBelow = window.innerHeight - rect.bottom;
          let top;
          if (spaceBelow < menuHeight && rect.top > menuHeight) {
            top = Math.max(10, rect.top - menuHeight - 4);
          } else {
            top = rect.bottom + 4;
          }

          targetMenu.style.top = `${top}px`;
          targetMenu.style.left = `${left}px`;

          const closeHandler = (e) => {
            if (!targetMenu.contains(e.target) && e.target !== btn) {
              targetMenu.style.display = 'none';
              document.removeEventListener('click', closeHandler);
            }
          };
          document.addEventListener('click', closeHandler);
        }
      }
    }
  }

  function toggleSupplierActionMenu(id, event) {
    if (event) event.stopPropagation();
    const menuId = 'supplier-action-menu-' + id;
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
        const btn = event?.currentTarget || event?.target;
        if (btn) {
          const rect = btn.getBoundingClientRect();
          const menuWidth = 180;
          let left = rect.right - menuWidth;
          if (left < 10) left = 10;
          const menuHeight = targetMenu.offsetHeight || 120;
          const spaceBelow = window.innerHeight - rect.bottom;
          let top = (spaceBelow < menuHeight && rect.top > menuHeight) ? Math.max(10, rect.top - menuHeight - 4) : rect.bottom + 4;
          targetMenu.style.top = `${top}px`;
          targetMenu.style.left = `${left}px`;
          const closeHandler = (e) => {
            if (!targetMenu.contains(e.target) && e.target !== btn) {
              targetMenu.style.display = 'none';
              document.removeEventListener('click', closeHandler);
            }
          };
          document.addEventListener('click', closeHandler);
        }
      }
    }
  }

  function onReconRowClick(id, event) {
    if (event && window.RegisterUiSupport && window.RegisterUiSupport.isInteractiveTarget(event.target)) return;
    const panel = document.getElementById('recon-editor-panel');
    const isOpen = panel && (panel.classList.contains('open') || panel.style.display === 'flex' || panel.style.display === 'block');
    if (isOpen && activeEditingReconId === id) {
      closeReconEditor();
      return;
    }
    openEditRecon(id);
  }

  function updatePagination() {
    const lbl = document.getElementById('pr-page-info');
    const btnPrev = document.getElementById('recon-btn-prev');
    const btnNext = document.getElementById('recon-btn-next');

    const start = totalRows === 0 ? 0 : currentPage * pageSize + 1;
    const end = Math.min(totalRows, (currentPage + 1) * pageSize);

    if (lbl) lbl.innerText = `Showing ${start}–${end} of ${totalRows} records`;
    if (btnPrev) btnPrev.disabled = currentPage <= 0;
    if (btnNext) btnNext.disabled = currentPage + 1 >= totalPages;
  }

  function prevPage() {
    if (currentPage > 0) {
      currentPage--;
      loadPurchaseRecon();
    }
  }

  function nextPage() {
    if (currentPage + 1 < totalPages) {
      currentPage++;
      loadPurchaseRecon();
    }
  }

  // ==========================================
  // 2. PURCHASE RECON EDITOR PANEL
  // ==========================================

  function populateReconSupplierDropdown() {
    const sel = document.getElementById('pr-editor-supplier');
    if (!sel) return;
    sel.innerHTML = `<option value="">Select Recon Supplier *</option>` +
      reconSuppliers.map(s => `<option value="${s.id}">${s.legalName} (${s.gstin || 'Unregistered'})</option>`).join('');
  }

  function openNewRecon() {
    activeEditingReconId = null;
    editingRowVersion = 0;

    const panel = document.getElementById('recon-editor-panel');
    if (!panel) return;

    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.clearSelection('#purchase-recon-tbody');
    }

    document.getElementById('pr-editor-title').innerText = 'New Purchase Recon';
    document.getElementById('pr-editor-subtitle').innerText = 'Reference generated automatically on save';

    document.getElementById('pr-editor-supplier').value = '';
    document.getElementById('pr-editor-invoice-no').value = '';
    document.getElementById('pr-editor-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('pr-editor-taxable').value = '0.00';
    document.getElementById('pr-editor-invoice-value').value = '0.00';
    document.getElementById('pr-editor-cgst').value = '0.00';
    document.getElementById('pr-editor-sgst').value = '0.00';
    document.getElementById('pr-editor-igst').value = '0.00';
    document.getElementById('pr-editor-other').value = '0.00';
    document.getElementById('pr-editor-notes').value = '';
    document.getElementById('pr-editor-linked').innerText = '₹ 0.00';
    document.getElementById('pr-editor-balance').innerText = '₹ 0.00';
    document.getElementById('pr-editor-status').innerText = 'OPEN';

    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.showDrawer('recon-editor-panel');
    } else {
      panel.classList.add('open');
      panel.style.display = 'flex';
    }
  }

  async function openEditRecon(id) {
    activeEditingReconId = id;
    const panel = document.getElementById('recon-editor-panel');
    if (!panel) return;

    const rowEl = document.querySelector(`#purchase-recon-tbody tr[data-recon-id="${id}"]`);
    if (window.RegisterUiSupport && rowEl) {
      window.RegisterUiSupport.highlightRow('#purchase-recon-tbody', rowEl);
    }

    try {
      const r = await window.ReconService.getReconRecord(id);
      if (!r) return;

      editingRowVersion = r.rowVersion || 0;
      document.getElementById('pr-editor-title').innerText = 'Edit Purchase Recon';
      document.getElementById('pr-editor-subtitle').innerText = `System Ref: ${r.systemRef || 'PRC-' + id}`;

      document.getElementById('pr-editor-supplier').value = r.supplierId || '';
      document.getElementById('pr-editor-invoice-no').value = r.supplierInvoiceNo || '';
      document.getElementById('pr-editor-date').value = r.invoiceDate || '';
      document.getElementById('pr-editor-taxable').value = (parseFloat(r.taxableValue) || 0).toFixed(2);
      document.getElementById('pr-editor-invoice-value').value = (parseFloat(r.invoiceValue) || 0).toFixed(2);
      document.getElementById('pr-editor-cgst').value = (parseFloat(r.cgst) || 0).toFixed(2);
      document.getElementById('pr-editor-sgst').value = (parseFloat(r.sgst) || 0).toFixed(2);
      document.getElementById('pr-editor-igst').value = (parseFloat(r.igst) || 0).toFixed(2);
      document.getElementById('pr-editor-other').value = (parseFloat(r.otherAdjustment) || 0).toFixed(2);
      document.getElementById('pr-editor-notes').value = r.notes || '';
      document.getElementById('pr-editor-linked').innerText = formatMoney(r.linkedAmount || 0);
      document.getElementById('pr-editor-balance').innerText = formatMoney(r.balance || 0);
      document.getElementById('pr-editor-status').innerText = (r.status || 'OPEN').toUpperCase();

      if (window.RegisterUiSupport) {
        window.RegisterUiSupport.showDrawer('recon-editor-panel');
      } else {
        panel.classList.add('open');
        panel.style.display = 'flex';
      }

    } catch (e) {
      alert('Failed to load record details: ' + (e.message || 'Server error'));
    }
  }

  function calculateEditorTotals() {
    const taxable = parseFloat(document.getElementById('pr-editor-taxable')?.value) || 0;
    const cgst = parseFloat(document.getElementById('pr-editor-cgst')?.value) || 0;
    const sgst = parseFloat(document.getElementById('pr-editor-sgst')?.value) || 0;
    const igst = parseFloat(document.getElementById('pr-editor-igst')?.value) || 0;
    const other = parseFloat(document.getElementById('pr-editor-other')?.value) || 0;

    const total = taxable + cgst + sgst + igst + other;
    const invValInput = document.getElementById('pr-editor-invoice-value');
    if (invValInput && (parseFloat(invValInput.value) || 0) <= 0) {
      invValInput.value = total.toFixed(2);
    }
  }

  async function saveReconRecord() {
    const suppId = parseInt(document.getElementById('pr-editor-supplier')?.value);
    const invNo = document.getElementById('pr-editor-invoice-no')?.value?.trim();
    const date = document.getElementById('pr-editor-date')?.value;
    const taxable = parseFloat(document.getElementById('pr-editor-taxable')?.value) || 0;
    const invVal = parseFloat(document.getElementById('pr-editor-invoice-value')?.value) || 0;
    const cgst = parseFloat(document.getElementById('pr-editor-cgst')?.value) || 0;
    const sgst = parseFloat(document.getElementById('pr-editor-sgst')?.value) || 0;
    const igst = parseFloat(document.getElementById('pr-editor-igst')?.value) || 0;
    const other = parseFloat(document.getElementById('pr-editor-other')?.value) || 0;
    const notes = document.getElementById('pr-editor-notes')?.value?.trim();

    if (!suppId) { alert('Please select a Recon Supplier.'); return; }
    if (!invNo) { alert('Supplier Invoice No is required.'); return; }
    if (!date) { alert('Invoice Date is required.'); return; }
    if (invVal <= 0) { alert('Invoice Value must be greater than zero.'); return; }

    const payload = {
      supplierId: suppId,
      supplierInvoiceNo: invNo,
      invoiceDate: date,
      taxableValue: taxable,
      cgst: cgst,
      sgst: sgst,
      igst: igst,
      otherAdjustment: other,
      invoiceValue: invVal,
      notes: notes || 'Manual entry',
      rowVersion: editingRowVersion
    };

    const btn = document.getElementById('pr-btn-save');
    if (btn) { btn.disabled = true; btn.innerText = 'Saving...'; }

    try {
      if (activeEditingReconId) {
        await window.ReconService.updateReconRecord(activeEditingReconId, payload);
        if (window.AppDialogService) window.AppDialogService.toastSuccess('Purchase recon record updated.');
      } else {
        await window.ReconService.createReconRecord(payload);
        if (window.AppDialogService) window.AppDialogService.toastSuccess('Purchase recon record created.');
      }
      closeReconEditor();
      loadPurchaseRecon();
    } catch (err) {
      console.error('Save purchase recon failed:', err);
      alert('Save failed: ' + (err.message || 'Server error'));
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = 'Save Purchase Recon'; }
    }
  }

  async function deleteReconRecord(id) {
    if (!confirm('Are you sure you want to delete this purchase recon record?')) return;
    try {
      await window.ReconService.deleteReconRecord(id);
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Record deleted.');
      loadPurchaseRecon();
    } catch (err) {
      alert('Delete failed: ' + (err.message || 'Server error'));
    }
  }

  async function viewBankLinks(id) {
    const r = (reconRecords || []).find(x => x.id === id);
    const searchRef = r ? (r.purchaseRef || r.invoiceNo || ('PRC-' + id)) : ('PRC-' + id);
    if (window.NavigationRouter) {
      window.NavigationRouter.selectNav('view-bank-statement');
      setTimeout(() => {
        const s = document.getElementById('txtSearch');
        if (s) {
          s.value = searchRef;
          if (window.BankStatementController && window.BankStatementController.applyFilters) {
            window.BankStatementController.applyFilters();
          }
        }
      }, 250);
    }
  }

  function closeReconEditor() {
    activeEditingReconId = null;
    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.hideDrawer('recon-editor-panel', '#purchase-recon-tbody');
    } else {
      const panel = document.getElementById('recon-editor-panel');
      if (panel) {
        panel.classList.remove('open');
        panel.style.display = 'none';
      }
      document.querySelectorAll('#purchase-recon-tbody tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    }
  }

  // ==========================================
  // 3. RECON SUPPLIER MASTER (ReconSupplier.fxml)
  // ==========================================

  async function loadReconSuppliers() {
    const tbody = document.getElementById('recon-supplier-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading recon suppliers...</td></tr>`;
    }

    try {
      const q = document.getElementById('rs-search')?.value?.trim() || '';
      reconSuppliers = await window.ReconService.getReconSuppliers(q, 100) || [];

      updateSupplierKpis(reconSuppliers);
      renderSupplierTable(reconSuppliers);

    } catch (err) {
      console.error('Failed to load recon suppliers:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--red);">⚠️ Error loading recon suppliers: ${err.message || 'Server error'}</td></tr>`;
      }
    }
  }

  function updateSupplierKpis(list) {
    const total = list.length;
    const active = list.filter(s => (s.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
    const imported = list.filter(s => (s.source || '').toUpperCase().includes('IMPORT')).length;
    const reconCount = list.reduce((sum, s) => sum + (s.reconRecordsCount || 0), 0);

    const tEl = document.getElementById('rs-kpi-total');
    const aEl = document.getElementById('rs-kpi-active');
    const iEl = document.getElementById('rs-kpi-imported');
    const rEl = document.getElementById('rs-kpi-recons');

    if (tEl) tEl.innerText = total.toLocaleString();
    if (aEl) aEl.innerText = active.toLocaleString();
    if (iEl) iEl.innerText = imported.toLocaleString();
    if (rEl) rEl.innerText = reconCount.toLocaleString();
  }

  function renderSupplierTable(rows) {
    const tbody = document.getElementById('recon-supplier-tbody');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:1.8rem; margin-bottom:8px;">🏢</div>
            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">No recon suppliers found</div>
            <div style="font-size:0.78rem;">Click "+ New Recon Supplier" to register an independent supplier.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map(s => {
      const isActive = (s.status || 'ACTIVE').toUpperCase() === 'ACTIVE';

      return `
        <tr onclick="window.PurchaseReconController.onSupplierRowClick(${s.id}, event)" data-supplier-id="${s.id}" style="cursor:pointer;">
          <td style="font-weight:700; color:var(--cyan); font-family:monospace;">${s.reference || 'SUPP-' + s.id}</td>
          <td style="font-weight:600; color:var(--text-main);">${s.legalName}</td>
          <td style="font-family:monospace; color:var(--purple);">${s.gstin || 'Unregistered'}</td>
          <td>${s.phone || '-'}</td>
          <td style="text-align:right; font-weight:700;">${s.reconRecordsCount || 0}</td>
          <td><span class="pill-badge pill-neutral">${s.source || 'MANUAL'}</span></td>
          <td style="text-align:center;">
            ${isActive ? '<span class="pill-badge pill-success">ACTIVE</span>' : '<span class="pill-badge pill-danger">INACTIVE</span>'}
          </td>
          <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn btn-secondary btn-sm" onclick="window.PurchaseReconController.toggleSupplierActionMenu(${s.id}, event)" style="padding:2px 8px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;">
                Actions ▼
              </button>
              <div id="supplier-action-menu-${s.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:180px; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.PurchaseReconController.openEditSupplier(${s.id})"><span style="margin-right:8px;">👁️</span> View Supplier</div>
                <div class="action-menu-item" onclick="window.PurchaseReconController.openEditSupplier(${s.id})"><span style="margin-right:8px;">✏️</span> Edit Supplier</div>
                <div class="action-menu-divider" style="height:1px; background:var(--border-subtle); margin:4px 0;"></div>
                ${(s.reconRecordsCount && s.reconRecordsCount > 0) ? `
                  <div class="action-menu-item disabled" style="opacity:0.4; cursor:not-allowed;" title="Suppliers linked to Purchase Recon records cannot be deleted"><span style="margin-right:8px;">🗑️</span> Delete Supplier</div>
                ` : `
                  <div class="action-menu-item" style="color:var(--red);" onclick="window.PurchaseReconController.deleteSupplier(${s.id})"><span style="margin-right:8px;">🗑️</span> Delete Supplier</div>
                `}
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function onSupplierRowClick(id, event) {
    if (event && window.RegisterUiSupport && window.RegisterUiSupport.isInteractiveTarget(event.target)) return;
    const panel = document.getElementById('recon-supplier-editor-panel');
    const isOpen = panel && (panel.classList.contains('open') || panel.style.display === 'flex' || panel.style.display === 'block');
    if (isOpen && activeEditingSupplierId === id) {
      closeSupplierEditor();
      return;
    }
    openEditSupplier(id);
  }

  function openNewSupplier() {
    activeEditingSupplierId = null;
    editingRowVersion = 0;

    const panel = document.getElementById('recon-supplier-editor-panel');
    if (!panel) return;

    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.clearSelection('#recon-supplier-tbody');
    }

    document.getElementById('rs-editor-title').innerText = 'New Recon Supplier';
    document.getElementById('rs-editor-name').value = '';
    document.getElementById('rs-editor-gstin').value = '';
    document.getElementById('rs-editor-pan').value = '';
    document.getElementById('rs-editor-contact').value = '';
    document.getElementById('rs-editor-phone').value = '';
    document.getElementById('rs-editor-email').value = '';
    document.getElementById('rs-editor-status').value = 'ACTIVE';
    document.getElementById('rs-editor-notes').value = '';

    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.showDrawer('recon-supplier-editor-panel');
    } else {
      panel.classList.add('open');
      panel.style.display = 'flex';
    }
  }

  async function openEditSupplier(id) {
    activeEditingSupplierId = id;
    const panel = document.getElementById('recon-supplier-editor-panel');
    if (!panel) return;

    const rowEl = document.querySelector(`#recon-supplier-tbody tr[data-supplier-id="${id}"]`);
    if (window.RegisterUiSupport && rowEl) {
      window.RegisterUiSupport.highlightRow('#recon-supplier-tbody', rowEl);
    }

    try {
      const s = await window.ReconService.getReconSupplier(id);
      if (!s) return;

      editingRowVersion = s.rowVersion || 0;
      document.getElementById('rs-editor-title').innerText = 'Edit Recon Supplier';
      document.getElementById('rs-editor-name').value = s.legalName || '';
      document.getElementById('rs-editor-gstin').value = s.gstin || '';
      document.getElementById('rs-editor-pan').value = s.pan || '';
      document.getElementById('rs-editor-contact').value = s.contactPerson || '';
      document.getElementById('rs-editor-phone').value = s.phone || '';
      document.getElementById('rs-editor-email').value = s.email || '';
      document.getElementById('rs-editor-status').value = s.status || 'ACTIVE';
      document.getElementById('rs-editor-notes').value = s.notes || '';

      if (window.RegisterUiSupport) {
        window.RegisterUiSupport.showDrawer('recon-supplier-editor-panel');
      } else {
        panel.classList.add('open');
        panel.style.display = 'flex';
      }
    } catch (e) {
      alert('Failed to load supplier: ' + e.message);
    }
  }

  async function saveSupplier() {
    const name = document.getElementById('rs-editor-name')?.value?.trim();
    const gstin = document.getElementById('rs-editor-gstin')?.value?.trim()?.toUpperCase() || '';
    const pan = document.getElementById('rs-editor-pan')?.value?.trim()?.toUpperCase() || '';
    const contact = document.getElementById('rs-editor-contact')?.value?.trim();
    const phone = document.getElementById('rs-editor-phone')?.value?.trim();
    const email = document.getElementById('rs-editor-email')?.value?.trim();
    const status = document.getElementById('rs-editor-status')?.value || 'ACTIVE';
    const notes = document.getElementById('rs-editor-notes')?.value?.trim();

    if (!name) { alert('Trade / Legal Name is required.'); return; }

    const payload = {
      legalName: name,
      gstin: gstin,
      pan: pan,
      contactPerson: contact,
      phone: phone,
      email: email,
      notes: notes,
      status: status,
      rowVersion: editingRowVersion
    };

    const btn = document.getElementById('rs-btn-save');
    if (btn) { btn.disabled = true; btn.innerText = 'Saving...'; }

    try {
      if (activeEditingSupplierId) {
        await window.ReconService.updateReconSupplier(activeEditingSupplierId, payload);
        if (window.AppDialogService) window.AppDialogService.toastSuccess('Recon supplier updated.');
      } else {
        await window.ReconService.createReconSupplier(payload);
        if (window.AppDialogService) window.AppDialogService.toastSuccess('Recon supplier created.');
      }
      closeSupplierEditor();
      loadReconSuppliers();
    } catch (err) {
      alert('Save supplier failed: ' + (err.message || 'Server error'));
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = 'Save Recon Supplier'; }
    }
  }

  async function deleteSupplier(id) {
    if (!confirm('Are you sure you want to delete this recon supplier?\n\nWARNING: Suppliers linked to Purchase Recon records cannot be deleted.')) return;
    try {
      await window.ReconService.deleteReconSupplier(id);
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Supplier deleted.');
      loadReconSuppliers();
    } catch (err) {
      alert('Delete supplier failed: ' + (err.message || 'Server error'));
    }
  }

  function closeSupplierEditor() {
    activeEditingSupplierId = null;
    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.hideDrawer('recon-supplier-editor-panel', '#recon-supplier-tbody');
    } else {
      const panel = document.getElementById('recon-supplier-editor-panel');
      if (panel) {
        panel.classList.remove('open');
        panel.style.display = 'none';
      }
      document.querySelectorAll('#recon-supplier-tbody tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    }
  }

  return {
    loadPurchaseRecon,
    openNewRecon,
    openEditRecon,
    onReconRowClick,
    toggleActionMenu,
    calculateEditorTotals,
    saveReconRecord,
    deleteReconRecord,
    viewBankLinks,
    closeReconEditor,
    prevPage,
    nextPage,
    applyReconFilters() { currentPage = 0; loadPurchaseRecon(); },
    loadReconSuppliers,
    openNewSupplier,
    openEditSupplier,
    onSupplierRowClick,
    toggleSupplierActionMenu,
    saveSupplier,
    deleteSupplier,
    closeSupplierEditor
  };
})();

// Install escape listeners for both Purchase Recon and Recon Supplier drawers
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.installEscapeClose('recon-editor-panel', '#purchase-recon-tbody', () => {
        if (window.PurchaseReconController) window.PurchaseReconController.closeReconEditor();
      });
      window.RegisterUiSupport.installEscapeClose('recon-supplier-editor-panel', '#recon-supplier-tbody', () => {
        if (window.PurchaseReconController) window.PurchaseReconController.closeSupplierEditor();
      });
    }
  });
}
