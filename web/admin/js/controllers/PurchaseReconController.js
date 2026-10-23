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
    if (window.FormatUtil && window.FormatUtil.formatDate) {
      return window.FormatUtil.formatDate(d);
    }
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

  function showModal(id) {
    if (window.AppDialogService && window.AppDialogService.openModal) {
      window.AppDialogService.openModal(id);
    } else if (typeof window.openModal === 'function') {
      window.openModal(id);
    } else {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'flex'; el.classList.add('active'); }
    }
  }

  function hideModal(id) {
    if (window.AppDialogService && window.AppDialogService.closeModal) {
      window.AppDialogService.closeModal(id);
    } else if (typeof window.closeModal === 'function') {
      window.closeModal(id);
    } else {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.classList.remove('active'); }
    }
  }

  function formatLocalDate(d) {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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
      const fromDate = document.getElementById('pr-date-from')?.value || '';
      const toDate = document.getElementById('pr-date-to')?.value || '';

      const pageRes = await window.ReconService.getReconRecordsPage(currentPage, pageSize, q, status, fromDate, toDate);
      reconRecords = pageRes?.rows || pageRes?.content || (Array.isArray(pageRes) ? pageRes : []);
      totalRows = pageRes?.totalRows != null ? pageRes.totalRows : (pageRes?.totalElements != null ? pageRes.totalElements : reconRecords.length);
      totalPages = pageRes?.totalPages != null ? pageRes.totalPages : (Math.ceil(totalRows / pageSize) || 1);

      // Fallback client-side filter if backend did not filter by date
      if (fromDate || toDate) {
        reconRecords = reconRecords.filter(r => {
          if (!r.invoiceDate) return true;
          const d = r.invoiceDate.toString().slice(0, 10);
          if (fromDate && d < fromDate) return false;
          if (toDate && d > toDate) return false;
          return true;
        });
      }

      renderReconTable(reconRecords);
      updatePagination();

    } catch (err) {
      console.error('Failed to load purchase recon:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--red);">⚠️ Error loading purchase recon: ${err.message || 'Server error'}</td></tr>`;
      }
    }
  }

  function setReconDateFilter(preset, btnEl) {
    document.querySelectorAll('#purchase-recon-view .btn-preset-chip, .purchase-recon-filter-chips .btn-preset-chip').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const fromInput = document.getElementById('pr-date-from');
    const toInput = document.getElementById('pr-date-to');
    if (!fromInput || !toInput) return;

    const now = new Date();
    const todayStr = formatLocalDate(now);

    if (preset === 'ALL') {
      fromInput.value = '';
      toInput.value = '';
    } else if (preset === 'TODAY') {
      fromInput.value = todayStr;
      toInput.value = todayStr;
    } else if (preset === 'THIS_MONTH') {
      const y = now.getFullYear();
      const m = now.getMonth();
      fromInput.value = formatLocalDate(new Date(y, m, 1));
      toInput.value = formatLocalDate(new Date(y, m + 1, 0));
    } else if (preset === 'LAST_MONTH') {
      const y = now.getFullYear();
      const m = now.getMonth();
      fromInput.value = formatLocalDate(new Date(y, m - 1, 1));
      toInput.value = formatLocalDate(new Date(y, m, 0));
    } else if (preset === 'THIS_FY') {
      const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      fromInput.value = `${yr}-04-01`;
      toInput.value = `${yr + 1}-03-31`;
    }

    currentPage = 0;
    loadPurchaseRecon();
  }

  function resetReconFilters() {
    const s = document.getElementById('pr-search');
    if (s) s.value = '';
    const st = document.getElementById('pr-status-filter');
    if (st) st.value = '';
    const f = document.getElementById('pr-date-from');
    if (f) f.value = '';
    const t = document.getElementById('pr-date-to');
    if (t) t.value = '';
    document.querySelectorAll('#purchase-recon-view .btn-preset-chip, .purchase-recon-filter-chips .btn-preset-chip').forEach(b => b.classList.remove('active'));
    currentPage = 0;
    loadPurchaseRecon();
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

      const linkedList = (r.bankLinks || []).map(b => b.financeVoucherNo || b.bankReference || ('STM-' + b.statementTransactionId)).filter(Boolean);
      const linkedDisplay = linkedList.length > 0 ? linkedList.join(', ') : (r.linkedRef || '-');
      const firstLink = linkedList.length > 0 ? linkedList[0] : '';

      return `
        <tr onclick="window.PurchaseReconController.onReconRowClick(${r.id}, event)" data-recon-id="${r.id}" style="cursor:pointer;">
          <td style="font-weight:700; color:var(--cyan); font-family:monospace;">${r.reference || r.systemRef || ('PRC-' + r.id)}</td>
          <td style="white-space:nowrap;">${window.FormatUtil ? window.FormatUtil.formatDate(r.invoiceDate) : formatDate(r.invoiceDate)}</td>
          <td style="font-weight:600; color:var(--text-main);">${r.supplierName || '-'}</td>
          <td style="font-family:monospace; color:var(--purple);">${r.supplierInvoiceNo || '-'}</td>
          <td style="text-align:right; font-weight:700;">${formatMoney(invVal)}</td>
          <td style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.75rem; color:var(--cyan);" title="${linkedDisplay}">
            ${firstLink ? `<span class="pill-badge pill-neutral" style="cursor:pointer; color:var(--cyan); border:1px solid rgba(56,189,248,0.3);" onclick="event.stopPropagation(); window.PurchaseReconController.openLinkedBankEntry('${firstLink}', ${r.id})">${linkedDisplay}</span>` : '-'}
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
              <button class="btn btn-purple btn-sm" onclick="window.PurchaseReconController.toggleActionMenu(${r.id}, event)" style="padding:4px 10px; font-size:0.75rem; font-weight:600; border-radius:6px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
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
  // 2. PURCHASE RECON EDITOR (Window Modal)
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

    const modal = document.getElementById('modal-purchase-recon-editor');
    if (!modal) return;

    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.clearSelection('#purchase-recon-tbody');
    }

    const titleEl = document.getElementById('pr-editor-title');
    const subEl = document.getElementById('pr-editor-subtitle');
    if (titleEl) titleEl.innerText = 'New Purchase Recon';
    if (subEl) subEl.innerText = 'Reference generated automatically on save';

    const supEl = document.getElementById('pr-editor-supplier');
    if (supEl) supEl.value = '';
    const invEl = document.getElementById('pr-editor-invoice-no');
    if (invEl) invEl.value = '';
    const dateEl = document.getElementById('pr-editor-date');
    if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
    const taxEl = document.getElementById('pr-editor-taxable');
    if (taxEl) taxEl.value = '0.00';
    const valEl = document.getElementById('pr-editor-invoice-value');
    if (valEl) valEl.value = '0.00';
    const cgstEl = document.getElementById('pr-editor-cgst');
    if (cgstEl) cgstEl.value = '0.00';
    const sgstEl = document.getElementById('pr-editor-sgst');
    if (sgstEl) sgstEl.value = '0.00';
    const igstEl = document.getElementById('pr-editor-igst');
    if (igstEl) igstEl.value = '0.00';
    const othEl = document.getElementById('pr-editor-other');
    if (othEl) othEl.value = '0.00';
    const notesEl = document.getElementById('pr-editor-notes');
    if (notesEl) notesEl.value = '';
    const linkEl = document.getElementById('pr-editor-linked');
    if (linkEl) linkEl.innerText = '₹ 0.00';
    const balEl = document.getElementById('pr-editor-balance');
    if (balEl) balEl.innerText = '₹ 0.00';
    const statEl = document.getElementById('pr-editor-status');
    if (statEl) statEl.innerText = 'OPEN';

    showModal('modal-purchase-recon-editor');
  }

  async function openEditRecon(id) {
    activeEditingReconId = id;
    const modal = document.getElementById('modal-purchase-recon-editor');
    if (!modal) return;

    const rowEl = document.querySelector(`#purchase-recon-tbody tr[data-recon-id="${id}"]`);
    if (window.RegisterUiSupport && rowEl) {
      window.RegisterUiSupport.highlightRow('#purchase-recon-tbody', rowEl);
    }

    try {
      const r = await window.ReconService.getReconRecord(id);
      if (!r) return;

      editingRowVersion = r.rowVersion || 0;
      const titleEl = document.getElementById('pr-editor-title');
      const subEl = document.getElementById('pr-editor-subtitle');
      if (titleEl) titleEl.innerText = 'Edit Purchase Recon';
      if (subEl) subEl.innerText = `System Ref: ${r.systemRef || 'PRC-' + id}`;

      const supEl = document.getElementById('pr-editor-supplier');
      if (supEl) supEl.value = r.supplierId || '';
      const invEl = document.getElementById('pr-editor-invoice-no');
      if (invEl) invEl.value = r.supplierInvoiceNo || '';
      const dateEl = document.getElementById('pr-editor-date');
      if (dateEl) dateEl.value = r.invoiceDate || '';
      const taxEl = document.getElementById('pr-editor-taxable');
      if (taxEl) taxEl.value = (parseFloat(r.taxableValue) || 0).toFixed(2);
      const valEl = document.getElementById('pr-editor-invoice-value');
      if (valEl) valEl.value = (parseFloat(r.invoiceValue) || 0).toFixed(2);
      const cgstEl = document.getElementById('pr-editor-cgst');
      if (cgstEl) cgstEl.value = (parseFloat(r.cgst) || 0).toFixed(2);
      const sgstEl = document.getElementById('pr-editor-sgst');
      if (sgstEl) sgstEl.value = (parseFloat(r.sgst) || 0).toFixed(2);
      const igstEl = document.getElementById('pr-editor-igst');
      if (igstEl) igstEl.value = (parseFloat(r.igst) || 0).toFixed(2);
      const othEl = document.getElementById('pr-editor-other');
      if (othEl) othEl.value = (parseFloat(r.otherAdjustment) || 0).toFixed(2);
      const notesEl = document.getElementById('pr-editor-notes');
      if (notesEl) notesEl.value = r.notes || '';
      const linkEl = document.getElementById('pr-editor-linked');
      if (linkEl) linkEl.innerText = formatMoney(r.linkedAmount || 0);
      const balEl = document.getElementById('pr-editor-balance');
      if (balEl) balEl.innerText = formatMoney(r.balance || 0);
      const statEl = document.getElementById('pr-editor-status');
      if (statEl) statEl.innerText = (r.status || 'OPEN').toUpperCase();

      showModal('modal-purchase-recon-editor');

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
        try { if (window.AppDialogService) window.AppDialogService.toastSuccess('Purchase recon record updated.'); } catch (_) {}
      } else {
        await window.ReconService.createReconRecord(payload);
        try { if (window.AppDialogService) window.AppDialogService.toastSuccess('Purchase recon record created.'); } catch (_) {}
      }
      closeReconEditor();
      await loadPurchaseRecon();
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
      try { if (window.AppDialogService) window.AppDialogService.toastSuccess('Record deleted.'); } catch (_) {}
      loadPurchaseRecon();
    } catch (err) {
      alert('Delete failed: ' + (err.message || 'Server error'));
    }
  }

  async function viewBankLinks(id) {
    const r = (reconRecords || []).find(x => x.id === id);
    const searchRef = r ? (r.purchaseRef || r.supplierInvoiceNo || ('PRC-' + id)) : ('PRC-' + id);
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
    hideModal('modal-purchase-recon-editor');
    document.querySelectorAll('#purchase-recon-tbody tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
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
      const status = document.getElementById('rs-status-filter')?.value || '';
      let list = await window.ReconService.getReconSuppliers(q, 100) || [];
      if (Array.isArray(list) && status) {
        list = list.filter(s => (s.status || 'ACTIVE').toUpperCase() === status.toUpperCase());
      }
      reconSuppliers = list;

      updateSupplierKpis(reconSuppliers);
      renderSupplierTable(reconSuppliers);

    } catch (err) {
      console.error('Failed to load recon suppliers:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--red);">⚠️ Error loading recon suppliers: ${err.message || 'Server error'}</td></tr>`;
      }
    }
  }

  function setSupplierDateFilter(preset, btnEl) {
    document.querySelectorAll('#recon-supplier-view .btn-preset-chip, .recon-supplier-filter-chips .btn-preset-chip').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const fromInput = document.getElementById('rs-date-from');
    const toInput = document.getElementById('rs-date-to');
    if (!fromInput || !toInput) return;

    const now = new Date();
    const todayStr = formatLocalDate(now);

    if (preset === 'ALL') {
      fromInput.value = '';
      toInput.value = '';
    } else if (preset === 'TODAY') {
      fromInput.value = todayStr;
      toInput.value = todayStr;
    } else if (preset === 'THIS_MONTH') {
      const y = now.getFullYear();
      const m = now.getMonth();
      fromInput.value = formatLocalDate(new Date(y, m, 1));
      toInput.value = formatLocalDate(new Date(y, m + 1, 0));
    } else if (preset === 'LAST_MONTH') {
      const y = now.getFullYear();
      const m = now.getMonth();
      fromInput.value = formatLocalDate(new Date(y, m - 1, 1));
      toInput.value = formatLocalDate(new Date(y, m, 0));
    } else if (preset === 'THIS_FY') {
      const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      fromInput.value = `${yr}-04-01`;
      toInput.value = `${yr + 1}-03-31`;
    }

    loadReconSuppliers();
  }

  function resetSupplierFilters() {
    const s = document.getElementById('rs-search');
    if (s) s.value = '';
    const st = document.getElementById('rs-status-filter');
    if (st) st.value = '';
    const f = document.getElementById('rs-date-from');
    if (f) f.value = '';
    const t = document.getElementById('rs-date-to');
    if (t) t.value = '';
    document.querySelectorAll('#recon-supplier-view .btn-preset-chip, .recon-supplier-filter-chips .btn-preset-chip').forEach(b => b.classList.remove('active'));
    loadReconSuppliers();
  }

  function updateSupplierKpis(list) {
    const total = list.length;
    const active = list.filter(s => (s.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
    const imported = list.filter(s => (s.source || '').toUpperCase().includes('IMPORT')).length;
    const reconCount = list.reduce((sum, s) => sum + (s.reconCount != null ? s.reconCount : (s.reconRecordsCount || 0)), 0);

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
      const sCount = (s.reconCount != null ? s.reconCount : (s.reconRecordsCount || 0));

      return `
        <tr onclick="window.PurchaseReconController.onSupplierRowClick(${s.id}, event)" data-supplier-id="${s.id}" style="cursor:pointer;">
          <td style="font-weight:700; color:var(--cyan); font-family:monospace;">${s.reference || 'SUPP-' + s.id}</td>
          <td style="font-weight:600; color:var(--text-main);">${s.legalName}</td>
          <td style="font-family:monospace; color:var(--purple);">${s.gstin || 'Unregistered'}</td>
          <td>${s.phone || '-'}</td>
          <td style="text-align:right; font-weight:700;">${sCount}</td>
          <td><span class="pill-badge pill-neutral">${s.source || 'MANUAL'}</span></td>
          <td style="text-align:center;">
            ${isActive ? '<span class="pill-badge pill-success">ACTIVE</span>' : '<span class="pill-badge pill-danger">INACTIVE</span>'}
          </td>
          <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn btn-purple btn-sm" onclick="window.PurchaseReconController.toggleSupplierActionMenu(${s.id}, event)" style="padding:4px 10px; font-size:0.75rem; font-weight:600; border-radius:6px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                Actions ▼
              </button>
              <div id="supplier-action-menu-${s.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:180px; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.PurchaseReconController.openEditSupplier(${s.id})"><span style="margin-right:8px;">👁️</span> View Supplier</div>
                <div class="action-menu-item" onclick="window.PurchaseReconController.openEditSupplier(${s.id})"><span style="margin-right:8px;">✏️</span> Edit Supplier</div>
                <div class="action-menu-divider" style="height:1px; background:var(--border-subtle); margin:4px 0;"></div>
                ${(sCount > 0) ? `
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
    openEditSupplier(id);
  }

  function openNewSupplier() {
    activeEditingSupplierId = null;
    editingRowVersion = 0;

    const modal = document.getElementById('modal-recon-supplier-editor');
    if (!modal) return;

    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.clearSelection('#recon-supplier-tbody');
    }

    const titleEl = document.getElementById('rs-editor-title');
    if (titleEl) titleEl.innerText = 'New Recon Supplier';
    const nameEl = document.getElementById('rs-editor-name');
    if (nameEl) nameEl.value = '';
    const gstinEl = document.getElementById('rs-editor-gstin');
    if (gstinEl) gstinEl.value = '';
    const panEl = document.getElementById('rs-editor-pan');
    if (panEl) panEl.value = '';
    const cntEl = document.getElementById('rs-editor-contact');
    if (cntEl) cntEl.value = '';
    const phEl = document.getElementById('rs-editor-phone');
    if (phEl) phEl.value = '';
    const emEl = document.getElementById('rs-editor-email');
    if (emEl) emEl.value = '';
    const stEl = document.getElementById('rs-editor-status');
    if (stEl) stEl.value = 'ACTIVE';
    const nEl = document.getElementById('rs-editor-notes');
    if (nEl) nEl.value = '';

    showModal('modal-recon-supplier-editor');
  }

  async function openEditSupplier(id) {
    activeEditingSupplierId = id;
    const modal = document.getElementById('modal-recon-supplier-editor');
    if (!modal) return;

    const rowEl = document.querySelector(`#recon-supplier-tbody tr[data-supplier-id="${id}"]`);
    if (window.RegisterUiSupport && rowEl) {
      window.RegisterUiSupport.highlightRow('#recon-supplier-tbody', rowEl);
    }

    try {
      const s = await window.ReconService.getReconSupplier(id);
      if (!s) return;

      editingRowVersion = s.rowVersion || 0;
      const titleEl = document.getElementById('rs-editor-title');
      if (titleEl) titleEl.innerText = 'Edit Recon Supplier';
      const nameEl = document.getElementById('rs-editor-name');
      if (nameEl) nameEl.value = s.legalName || '';
      const gstinEl = document.getElementById('rs-editor-gstin');
      if (gstinEl) gstinEl.value = s.gstin || '';
      const panEl = document.getElementById('rs-editor-pan');
      if (panEl) panEl.value = s.pan || '';
      const cntEl = document.getElementById('rs-editor-contact');
      if (cntEl) cntEl.value = s.contactPerson || '';
      const phEl = document.getElementById('rs-editor-phone');
      if (phEl) phEl.value = s.phone || '';
      const emEl = document.getElementById('rs-editor-email');
      if (emEl) emEl.value = s.email || '';
      const stEl = document.getElementById('rs-editor-status');
      if (stEl) stEl.value = s.status || 'ACTIVE';
      const nEl = document.getElementById('rs-editor-notes');
      if (nEl) nEl.value = s.notes || '';

      showModal('modal-recon-supplier-editor');
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
        try { if (window.AppDialogService) window.AppDialogService.toastSuccess('Recon supplier updated.'); } catch (_) {}
      } else {
        await window.ReconService.createReconSupplier(payload);
        try { if (window.AppDialogService) window.AppDialogService.toastSuccess('Recon supplier created.'); } catch (_) {}
      }
      closeSupplierEditor();
      await loadReconSuppliers();
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
      try { if (window.AppDialogService) window.AppDialogService.toastSuccess('Supplier deleted.'); } catch (_) {}
      loadReconSuppliers();
    } catch (err) {
      alert('Delete supplier failed: ' + (err.message || 'Server error'));
    }
  }

  function closeSupplierEditor() {
    activeEditingSupplierId = null;
    hideModal('modal-recon-supplier-editor');
    document.querySelectorAll('#recon-supplier-tbody tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
  }

  function openLinkedBankEntry(ref, reconId) {
    if (!ref || ref === '-') return;
    if (ref.startsWith('STM-')) {
      const stmId = ref.replace('STM-', '');
      if (window.NavigationRouter) window.NavigationRouter.selectNav('view-bank-statement');
      setTimeout(() => {
        if (window.BankStatementController && window.BankStatementController.highlightTxn) {
          window.BankStatementController.highlightTxn(stmId);
        }
      }, 300);
    } else if (ref.startsWith('EXP-') || ref.startsWith('OPEX-')) {
      if (window.NavigationRouter) window.NavigationRouter.selectNav('view-expense-entry');
      setTimeout(() => {
        const searchInput = document.getElementById('exp-search');
        if (searchInput) {
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input'));
          if (window.FinanceController && window.FinanceController.applyFinanceFilters) {
            window.FinanceController.applyFinanceFilters();
          }
        }
        if (typeof window.highlightRowInTable === 'function') {
          window.highlightRowInTable('expense-entry-tbody', ref);
        }
      }, 300);
    } else {
      if (window.NavigationRouter) window.NavigationRouter.selectNav('view-bank-entry');
      setTimeout(() => {
        const searchInput = document.getElementById('bank-search');
        if (searchInput) {
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input'));
          if (window.FinanceController && window.FinanceController.applyFinanceFilters) {
            window.FinanceController.applyFinanceFilters();
          }
        }
        if (typeof window.highlightRowInTable === 'function') {
          window.highlightRowInTable('bank-entry-tbody', ref);
        }
      }, 300);
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
    openLinkedBankEntry,
    closeReconEditor,
    prevPage,
    nextPage,
    applyReconFilters() { currentPage = 0; loadPurchaseRecon(); },
    setReconDateFilter,
    resetReconFilters,
    loadReconSuppliers,
    openNewSupplier,
    openEditSupplier,
    onSupplierRowClick,
    toggleSupplierActionMenu,
    saveSupplier,
    deleteSupplier,
    closeSupplierEditor,
    applySupplierFilters() { loadReconSuppliers(); },
    setSupplierDateFilter,
    resetSupplierFilters
  };
})();

// Install escape listeners for both Purchase Recon and Recon Supplier window modals
if (typeof window !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const pModal = document.getElementById('modal-purchase-recon-editor');
      if (pModal && (pModal.classList.contains('active') || pModal.style.display === 'flex')) {
        window.PurchaseReconController.closeReconEditor();
      }
      const sModal = document.getElementById('modal-recon-supplier-editor');
      if (sModal && (sModal.classList.contains('active') || sModal.style.display === 'flex')) {
        window.PurchaseReconController.closeSupplierEditor();
      }
    }
  });
}
