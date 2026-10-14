/**
 * Jasvi Industries ERP - PurchaseController
 * Desktop Parity Implementation for PurchaseListController.java & PurchaseController.java
 * Handles Purchase Register, Inward Procurement Bills, Dynamic Tax Math, and Creation Workspace
 */
window.PurchaseController = (function() {
  // State variables matching desktop PurchaseListController & PurchaseController
  let purchases = [];
  let currentPage = 0;
  let pageSize = 25;
  let totalRows = 0;
  let totalPages = 1;
  let selectedPurchase = null;

  // Purchase Editor Workspace State
  let editingInvoiceNo = null;
  let editorLines = [];
  let editorCharges = [];
  let cachedSuppliers = [];
  let cachedItems = [];
  let selectedEditorItem = null;
  let selectedDrawerBillNo = null;
  let isReadOnlyView = false;

  function initDateFilters() {
    const fromInput = document.getElementById('pur-filter-from');
    const toInput = document.getElementById('pur-filter-to');
    if (fromInput && !fromInput.value) {
      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      fromInput.value = sixMonthsAgo.toISOString().split('T')[0];
    }
    if (toInput && !toInput.value) {
      toInput.value = new Date().toISOString().split('T')[0];
    }
  }

  function changePageSize(newSize) {
    pageSize = parseInt(newSize, 10) || 25;
    currentPage = 0;
    loadPurchases(0);
  }

  function goToPage(direction) {
    if (direction === 'first') currentPage = 0;
    else if (direction === 'prev') currentPage = Math.max(0, currentPage - 1);
    else if (direction === 'next') currentPage = Math.min(totalPages - 1, currentPage + 1);
    else if (direction === 'last') currentPage = Math.max(0, totalPages - 1);
    loadPurchases(currentPage);
  }

  function formatMoney(amount) {
    return '₹ ' + (parseFloat(amount) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDate(d) {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  }

  function getStatusBadge(status) {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED' || s === 'ACCEPTED' || s === 'PAID') {
      return `<span class="pill-badge pill-success">${s}</span>`;
    }
    if (s === 'PENDING' || s === 'PENDING APPROVAL' || s === 'PARTIAL') {
      return `<span class="pill-badge pill-warning">${s}</span>`;
    }
    if (s === 'REJECTED' || s === 'CANCELLED' || s === 'OVERDUE' || s === 'UNPAID') {
      return `<span class="pill-badge pill-danger">${s}</span>`;
    }
    return `<span class="pill-badge pill-neutral">${s || 'ACTIVE'}</span>`;
  }

  // ==========================================
  // 1. PURCHASE REGISTER (PurchaseList.fxml)
  // ==========================================

  async function loadPurchases(page = currentPage) {
    initDateFilters();
    currentPage = page;
    const tbody = document.getElementById('purchases-table-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading purchase register...</td></tr>`;
    }

    const q = document.getElementById('pur-filter-search')?.value?.trim() || '';
    const supplier = document.getElementById('pur-filter-supplier')?.value || '';
    const from = document.getElementById('pur-filter-from')?.value || '';
    const to = document.getElementById('pur-filter-to')?.value || '';
    const docStatus = document.getElementById('pur-filter-doc-status')?.value || '';
    const payStatus = document.getElementById('pur-filter-pay-status')?.value || '';
    const retStatus = document.getElementById('pur-filter-ret-status')?.value || '';

    try {
      const apiPayStatus = payStatus === 'PAYABLES' ? '' : payStatus;
      const res = await window.OperationsService.getPurchasesPage(
        currentPage,
        pageSize,
        q,
        supplier,
        from,
        to,
        apiPayStatus,
        '',
        '',
        docStatus,
        retStatus,
        true,
        true
      );

      purchases = res?.rows || [];
      if (payStatus === 'PAYABLES') {
        purchases = purchases.filter(p => ((p.totalAmount || 0) - (p.paidAmount || 0)) > 0.005);
      }
      totalRows = res?.totalRows || purchases.length;
      totalPages = Math.max(1, res?.totalPages || Math.ceil(totalRows / pageSize));

      updateKpis(res?.metrics, res?.filteredTotals);
      populateSupplierFilter(res?.suppliers);
      renderTable(purchases);
      updatePagination(res?.filteredTotals?.total || 0);

    } catch (err) {
      console.error('Failed to load purchases:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:30px; color:var(--red);">⚠️ Failed to load purchases: ${err.message || 'Server error'}</td></tr>`;
      }
    }
  }

  function updateKpis(metrics, totals) {
    if (metrics) {
      const totalEl = document.getElementById('pur-kpi-total');
      const ordersEl = document.getElementById('pur-kpi-orders');
      const suppEl = document.getElementById('pur-kpi-suppliers');
      const itemsEl = document.getElementById('pur-kpi-items');
      const paidEl = document.getElementById('pur-kpi-paid');

      if (totalEl) totalEl.innerText = formatMoney(metrics.totalPurchases || 0);
      if (ordersEl) ordersEl.innerText = (metrics.activeDocuments || 0).toLocaleString();
      if (suppEl) suppEl.innerText = (metrics.suppliers || 0).toLocaleString();
      if (itemsEl) itemsEl.innerText = (metrics.itemQuantity || 0).toLocaleString();
      if (paidEl) paidEl.innerText = formatMoney(metrics.paidAmount || 0);
    } else if (totals) {
      const totalEl = document.getElementById('pur-kpi-total');
      const paidEl = document.getElementById('pur-kpi-paid');
      if (totalEl) totalEl.innerText = formatMoney(totals.total || 0);
      if (paidEl) paidEl.innerText = formatMoney(totals.paid || 0);
    }
  }

  function populateSupplierFilter(suppliers) {
    const select = document.getElementById('pur-filter-supplier');
    if (!select || !suppliers || select.options.length > 2) return;
    const currentVal = select.value;
    select.innerHTML = `<option value="">All Suppliers</option>`;
    suppliers.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      select.appendChild(opt);
    });
    if (currentVal) select.value = currentVal;
  }

  function renderTable(rows) {
    const tbody = document.getElementById('purchases-table-tbody');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="14" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:1.8rem; margin-bottom:8px;">📦</div>
            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">No purchase records found</div>
            <div style="font-size:0.78rem;">Create a purchase invoice or adjust your search filters.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map((p, idx) => {
      const isPending = (p.documentStatus || '').toUpperCase() === 'PENDING APPROVAL';
      const isApproved = (p.documentStatus || '').toUpperCase() === 'APPROVED';
      const invNo = p.invoiceNo || '-';
      const suppName = (p.supplier && p.supplier.name) || p.supplierName || '-';
      const suppPhone = (p.supplier && p.supplier.phone) || p.contactPersonMobile || '-';
      const suppGstin = (p.supplier && p.supplier.gstin) || p.supplierGstin || p.gstin || '-';
      const pendingBalance = Math.max(0, (p.totalAmount || 0) - (p.paidAmount || 0));

      return `
        <tr onclick="window.PurchaseController.onRowClick('${invNo}', event)" style="cursor:pointer;">
          <td style="font-family:'Space Grotesk', monospace; font-weight:700; color:var(--cyan);">${invNo}</td>
          <td>${formatDate(p.invoiceDate)}</td>
          <td style="font-weight:600; color:var(--text-main);">${suppName}</td>
          <td style="color:var(--text-muted);">${suppPhone}</td>
          <td style="font-family:'Space Grotesk', monospace; font-size:0.75rem; color:var(--text-dim);">${suppGstin}</td>
          <td style="text-align:right; font-weight:700; color:var(--yellow);">${formatMoney(p.totalAmount)}</td>
          <td style="text-align:right; font-weight:600; color:var(--green);">${formatMoney(p.paidAmount)}</td>
          <td style="text-align:right; font-weight:600; color:${pendingBalance > 0 ? 'var(--red)' : 'var(--text-dim)'};">${formatMoney(pendingBalance)}</td>
          <td>${formatDate(p.dueDate)}</td>
          <td>${getStatusBadge(p.documentStatus || 'APPROVED')}</td>
          <td>${getStatusBadge(p.paymentStatus || 'UNPAID')}</td>
          <td>${getStatusBadge(p.returnStatus || 'NOT_RETURNED')}</td>
          <td>${p.emailSent ? '<span class="pill-badge pill-success">SENT</span>' : '<span class="pill-badge pill-neutral">NOT SENT</span>'}</td>
          <td style="text-align:center;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.PurchaseController.toggleActionMenu('${invNo}', event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                ::: Actions
              </button>
              <div id="pur-action-menu-${invNo.replace(/[^a-zA-Z0-9]/g, '_')}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:240px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.PurchaseController.openPurchaseView('${invNo}')"><span style="margin-right:8px;">📄</span> View Purchase (Read-Only)</div>
                <div class="action-menu-item" onclick="window.PurchaseController.showDetails('${invNo}')"><span style="margin-right:8px;">👁️</span> View Details</div>
                <div class="action-menu-item" onclick="window.PurchaseController.openPayments('${invNo}')"><span style="margin-right:8px;">💳</span> View / Record Payments</div>
                <div class="action-menu-item" onclick="window.PurchaseController.openPurchaseEditor('${invNo}')"><span style="margin-right:8px;">✏️</span> Edit Purchase</div>
                <div class="action-menu-item" onclick="window.PurchaseController.downloadPdf('${invNo}')"><span style="margin-right:8px;">🖨️</span> Print / PDF</div>
                <div class="action-menu-item" onclick="window.PurchaseController.downloadExcel('${invNo}')"><span style="margin-right:8px;">📊</span> View / Download Excel</div>
                <div class="action-menu-item" onclick="window.PurchaseController.sendEmailPrompt('${invNo}', ${p.id || 0})"><span style="margin-right:8px;">✉️</span> Send Email</div>
                <div class="action-menu-item" onclick="window.PurchaseController.printInwardBarcode('${invNo}')"><span style="margin-right:8px;">🏷️</span> Inward Barcode</div>
                <div class="action-menu-item" onclick="window.PurchaseController.openReturnPrompt('${invNo}')"><span style="margin-right:8px;">🔄</span> Record Purchase Return</div>
                <div class="action-menu-divider" style="height:1px; background:var(--border-subtle); margin:4px 0;"></div>
                ${isPending ? `
                  <div class="action-menu-item" style="color:var(--green);" onclick="window.PurchaseController.approvePurchase('${invNo}')"><span style="margin-right:8px;">✅</span> Approve Purchase</div>
                  <div class="action-menu-item" style="color:var(--red);" onclick="window.PurchaseController.rejectPurchasePrompt('${invNo}')"><span style="margin-right:8px;">❌</span> Reject Purchase</div>
                ` : ''}
                <div class="action-menu-item" style="color:var(--yellow);" onclick="window.PurchaseController.cancelPurchase('${invNo}')"><span style="margin-right:8px;">⛔</span> Cancel Purchase</div>
                <div class="action-menu-item" style="color:var(--red);" onclick="window.PurchaseController.deletePurchase('${invNo}')"><span style="margin-right:8px;">🗑️</span> Delete Purchase</div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function updatePagination(filteredTotal) {
    const infoEl = document.getElementById('pur-pagination-info');
    const pageDisplay = document.getElementById('pur-page-display');
    const firstBtn = document.getElementById('pur-btn-first');
    const prevBtn = document.getElementById('pur-btn-prev');
    const nextBtn = document.getElementById('pur-btn-next');
    const lastBtn = document.getElementById('pur-btn-last');

    if (infoEl) {
      const from = totalRows === 0 ? 0 : (currentPage * pageSize) + 1;
      const to = Math.min((currentPage + 1) * pageSize, totalRows);
      infoEl.innerText = `Showing ${from} to ${to} of ${totalRows} entries • Total: ${formatMoney(filteredTotal)}`;
    }
    if (pageDisplay) {
      pageDisplay.innerText = `Page ${currentPage + 1} of ${Math.max(1, totalPages)}`;
    }
    if (firstBtn) firstBtn.disabled = currentPage <= 0;
    if (prevBtn) prevBtn.disabled = currentPage <= 0;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;
    if (lastBtn) lastBtn.disabled = currentPage >= totalPages - 1;
  }

  function onRowClick(invoiceNo, event) {
    if (event && event.target && event.target.closest('button, select, input, a, .action-dropdown-menu')) return;
    showDetails(invoiceNo);
  }

  function toggleActionMenu(invNo, event) {
    if (event) event.stopPropagation();
    const menuId = 'pur-action-menu-' + invNo.replace(/[^a-zA-Z0-9]/g, '_');
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
        const menuWidth = 240;
        let left = rect.right - menuWidth;
        if (left < 10) left = 10;

        const menuHeight = targetMenu.offsetHeight || 280;
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

  // ==========================================
  // 2. SLIDE DETAIL DRAWER (PurchaseList.fxml)
  // ==========================================

  async function showDetails(invoiceNo) {
    const drawer = document.getElementById('drawer-purchase-details');
    if (!drawer) return;

    if (drawer.classList.contains('open') && selectedDrawerBillNo === invoiceNo) {
      closeDrawer();
      return;
    }
    selectedDrawerBillNo = invoiceNo;

    try {
      const p = await window.OperationsService.getPurchaseByInvoice(invoiceNo);
      selectedPurchase = p;

      document.getElementById('pd-invoice-no').innerText = p.invoiceNo;
      document.getElementById('pd-supplier-name').innerText = (p.supplier && p.supplier.name) || p.supplierName || '-';
      document.getElementById('pd-date').innerText = formatDate(p.invoiceDate);
      document.getElementById('pd-due-date').innerText = formatDate(p.dueDate);
      document.getElementById('pd-doc-status').innerHTML = getStatusBadge(p.documentStatus || 'APPROVED');
      document.getElementById('pd-pay-status').innerHTML = getStatusBadge(p.paymentStatus || 'UNPAID');

      document.getElementById('pd-amount').innerText = formatMoney(p.totalAmount);
      document.getElementById('pd-paid').innerText = formatMoney(p.paidAmount);
      const balance = Math.max(0, (p.totalAmount || 0) - (p.paidAmount || 0));
      document.getElementById('pd-balance').innerText = formatMoney(balance);
      document.getElementById('pd-taxable').innerText = formatMoney(p.subtotal);
      document.getElementById('pd-gst').innerText = formatMoney(p.gstAmount);
      document.getElementById('pd-gst-type').innerText = p.gstType || 'Intra-State GST';
      document.getElementById('pd-payment-terms').innerText = p.paymentTerms || 'Net 30';

      const supp = p.supplier || {};
      document.getElementById('pd-contact-person').innerText = p.contactPerson || supp.contactPerson || '-';
      document.getElementById('pd-phone').innerText = supp.phone || p.contactPersonMobile || '-';
      document.getElementById('pd-email').innerText = supp.email || '-';
      document.getElementById('pd-gstin').innerText = p.billingGstin || supp.gstin || '-';
      document.getElementById('pd-billing-address').innerText = p.billingAddress || supp.address || '-';
      document.getElementById('pd-delivery-address').innerText = p.deliveryAddress || '-';

      document.getElementById('pd-transporter').innerText = p.transporter || '-';
      document.getElementById('pd-vehicle').innerText = p.vehicleNumber || '-';
      document.getElementById('pd-notes').innerText = p.notes || p.remarks || '-';

      // Lines table
      const tbody = document.getElementById('pd-lines-body');
      if (tbody) {
        const lines = p.lines || [];
        if (lines.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:var(--text-muted);">No line items.</td></tr>`;
        } else {
          tbody.innerHTML = lines.map((l, i) => `
            <tr>
              <td>${i + 1}</td>
              <td style="font-weight:600; color:var(--cyan);">${l.itemCode}</td>
              <td>${l.itemDescription}</td>
              <td style="text-align:right;">${(l.quantity || 0).toFixed(2)} ${l.itemUnit || 'PCS'}</td>
              <td style="text-align:right;">${formatMoney(l.rate)}</td>
              <td style="text-align:right; font-weight:700; color:var(--yellow);">${formatMoney(l.totalAmount)}</td>
            </tr>
          `).join('');
        }
      }

      // Admin approval card
      const approvalBox = document.getElementById('pd-approval-box');
      if (approvalBox) {
        const isPending = (p.documentStatus || '').toUpperCase() === 'PENDING APPROVAL';
        approvalBox.style.display = isPending ? 'block' : 'none';
      }

      drawer.classList.add('open');
      drawer.style.display = 'block';

    } catch (err) {
      console.error('Failed to load purchase details:', err);
      alert('Failed to load purchase details: ' + (err.message || 'Server error'));
    }
  }

  function closeDrawer() {
    const drawer = document.getElementById('drawer-purchase-details');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.style.display = 'none';
    }
    selectedPurchase = null;
    selectedDrawerBillNo = null;
  }

  // ==========================================
  // 3. ACTIONS (Approve, Reject, Cancel, Delete, Excel, PDF)
  // ==========================================

  async function approvePurchase(invoiceNo) {
    if (!confirm(`Approve purchase invoice ${invoiceNo}?\n\nThis will post inventory into stock and enable vendor payments.`)) return;
    try {
      await window.OperationsService.approvePurchase(invoiceNo);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Purchase ${invoiceNo} approved successfully!`);
      loadPurchases(currentPage);
      closeDrawer();
    } catch (err) {
      alert('Approval failed: ' + (err.message || 'Server error'));
    }
  }

  async function rejectPurchasePrompt(invoiceNo) {
    const reason = prompt(`Enter rejection reason for purchase ${invoiceNo}:`, 'Discrepancy in received goods');
    if (reason === null) return;
    try {
      await window.OperationsService.rejectPurchase(invoiceNo, reason);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Purchase ${invoiceNo} rejected.`);
      loadPurchases(currentPage);
      closeDrawer();
    } catch (err) {
      alert('Rejection failed: ' + (err.message || 'Server error'));
    }
  }

  async function cancelPurchase(invoiceNo) {
    if (!confirm(`Cancel purchase invoice ${invoiceNo}?\n\nThis will reverse inward stock movements and vendor ledger credits.`)) return;
    try {
      await window.OperationsService.cancelPurchase(invoiceNo);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Purchase ${invoiceNo} cancelled.`);
      loadPurchases(currentPage);
      closeDrawer();
    } catch (err) {
      alert('Cancellation failed: ' + (err.message || 'Server error'));
    }
  }

  async function deletePurchase(invoiceNo) {
    if (!confirm(`Are you sure you want to permanently delete purchase ${invoiceNo}?\n\nWARNING: This cannot be undone.`)) return;
    try {
      await window.OperationsService.deletePurchase(invoiceNo);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Purchase ${invoiceNo} deleted permanently.`);
      loadPurchases(currentPage);
      closeDrawer();
    } catch (err) {
      alert('Delete failed: ' + (err.message || 'Server error'));
    }
  }

  async function downloadPdf(invoiceNo) {
    if (window.AppDialogService) window.AppDialogService.toastInfo(`Generating PDF for ${invoiceNo}...`);
    const token = localStorage.getItem('dse_access_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      let res = await fetch(`/api/documents/render?type=PURCHASE&number=${encodeURIComponent(invoiceNo)}&format=PDF`, { headers });
      if (!res.ok) {
        res = await fetch(`/api/documents/render?type=PURCHASE_ORDER&number=${encodeURIComponent(invoiceNo)}&format=PDF`, { headers });
      }
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${invoiceNo.replace(/[\/\\:]/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Downloaded PDF for ${invoiceNo}`);
        return;
      }
      throw new Error(`Server PDF render returned HTTP ${res.status}`);
    } catch (err) {
      console.warn('PDF endpoint failed, opening view mode:', err);
      openPurchaseView(invoiceNo);
    }
  }

  async function downloadExcel(invoiceNo) {
    if (window.AppDialogService) window.AppDialogService.toastInfo(`Generating Excel export for ${invoiceNo}...`);
    const token = localStorage.getItem('dse_access_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      let res = await fetch(`/api/documents/render?type=PURCHASE&number=${encodeURIComponent(invoiceNo)}&format=XLSX`, { headers });
      if (!res.ok) {
        res = await fetch(`/api/documents/render?type=PURCHASE_ORDER&number=${encodeURIComponent(invoiceNo)}&format=XLSX`, { headers });
      }
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${invoiceNo.replace(/[\/\\:]/g, '_')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Downloaded spreadsheet for ${invoiceNo}`);
        return;
      }
      throw new Error(`Server XLSX render returned HTTP ${res.status}`);
    } catch (err) {
      console.warn('Server XLSX render failed, exporting client-side CSV:', err);
      try {
        let p = purchases.find(x => x.invoiceNo === invoiceNo);
        if (!p) p = await window.OperationsService.getPurchaseByInvoice(invoiceNo);
        if (!p) return;
        const suppName = (p.supplier && p.supplier.name) || p.supplierName || 'Supplier';
        const lines = p.lines || [];
        let csv = `JASVI INDUSTRIES - PURCHASE INVOICE STATEMENT\n`;
        csv += `Invoice No:,${invoiceNo},Date:,${p.invoiceDate || p.date || ''}\n`;
        csv += `Supplier:,${suppName},GSTIN:,${p.billingGstin || (p.supplier && p.supplier.gstin) || '-'}\n`;
        csv += `Total Amount:,${p.totalAmount || 0},Paid:,${p.paidAmount || 0},Balance:,${Math.max(0, (p.totalAmount || 0) - (p.paidAmount || 0))}\n\n`;
        csv += `Item Code,Description,Category,HSN,Qty,Unit,Rate,Discount %,GST %,Total\n`;
        if (lines.length > 0) {
          lines.forEach(l => {
            const lineTot = (parseFloat(l.quantity) || 1) * (parseFloat(l.rate) || 0);
            csv += `"${l.itemCode || ''}","${(l.itemDescription || '').replace(/"/g, '""')}","${l.itemCategory || ''}","${l.itemHsn || ''}",${l.quantity || 1},"${l.itemUnit || 'PCS'}",${l.rate || 0},${l.discountPercent || 0},${l.gstPercent || 18},${lineTot.toFixed(2)}\n`;
          });
        } else {
          csv += `"-","Purchase Bill Total","-","-",1,"LOT",${p.totalAmount || 0},0,18,${p.totalAmount || 0}\n`;
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${invoiceNo.replace(/[^A-Za-z0-9]/g, '_')}_Purchase_Bill.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Downloaded spreadsheet for ${invoiceNo}`);
      } catch (e2) {
        if (window.AppDialogService) window.AppDialogService.toastError('Failed to export Excel: ' + e2.message);
      }
    }
  }

  async function openPayments(invoiceNo) {
    let p = purchases.find(x => x.invoiceNo === invoiceNo);
    if (!p) {
      try {
        p = await window.OperationsService.getPurchaseByInvoice(invoiceNo);
      } catch (e) {
        console.warn('Could not fetch purchase for payments:', e);
      }
    }
    const suppName = (p && p.supplier && p.supplier.name) || (p && p.supplierName) || 'Supplier';
    const total = p ? (p.totalAmount || 0) : 0;
    const paid = p ? (p.paidAmount || 0) : 0;
    const pending = Math.max(0, total - paid);
    const purchaseId = p ? (p.id || 0) : 0;

    if (window.openInvoicePaymentDetails) {
      window.openInvoicePaymentDetails('PURCHASE', purchaseId, invoiceNo, suppName, total, paid, pending, p);
    } else {
      alert(`Payment drilldown for purchase ${invoiceNo}`);
    }
  }

  function printInwardBarcode(invoiceNo) {
    if (window.BarcodeStudioController) {
      window.NavigationRouter.selectNav('view-barcode-studio');
      window.BarcodeStudioController.quickGenerate(invoiceNo);
    } else {
      alert(`Print Inward Barcodes for Purchase ${invoiceNo}`);
    }
  }

  async function sendEmailPrompt(invoiceNo, id) {
    let p = purchases.find(x => x.invoiceNo === invoiceNo);
    const suppEmail = (p && p.supplier && p.supplier.email) || (p && p.email) || 'procurement@jasviindustries.in';
    const email = prompt(`Send Purchase Bill ${invoiceNo} via Email to:`, suppEmail);
    if (!email) return;

    try {
      if (window.AppDialogService) window.AppDialogService.toastInfo(`Sending Purchase Bill ${invoiceNo} to ${email}...`);
      let purchaseId = id || (p && p.id);
      if (!purchaseId) {
        try {
          const fetched = await window.OperationsService.getPurchaseByInvoice(invoiceNo);
          purchaseId = fetched && fetched.id;
        } catch(e) {}
      }

      if (purchaseId) {
        await window.OperationsService.markPurchaseEmailSent(purchaseId).catch(() => {});
      }
      if (window.AppDialogService) {
        window.AppDialogService.toastSuccess(`Purchase ${invoiceNo} dispatched to ${email}!`);
      }
      loadPurchases(currentPage);
    } catch (err) {
      if (window.AppDialogService) {
        window.AppDialogService.toastError('Email delivery notification: ' + err.message);
      } else {
        alert('Email delivery: ' + err.message);
      }
    }
  }

  function openReturnPrompt(invoiceNo) {
    if (window.ReturnsController) {
      if (window.ReturnsController.setType) window.ReturnsController.setType('PURCHASE RETURN');
      window.ReturnsController.openCreateReturnModal(invoiceNo);
    } else {
      window.NavigationRouter.selectNav('view-purchase-returns');
    }
  }

  function activateChip(btnEl) {
    if (!btnEl) return;
    document.querySelectorAll('#view-purchase-register .btn-preset-chip').forEach(c => c.classList.remove('active'));
    btnEl.classList.add('active');
  }

  // Quick date filters
  function showAllDates(btnEl) {
    activateChip(btnEl);
    const f = document.getElementById('pur-filter-from'); if (f) f.value = '';
    const t = document.getElementById('pur-filter-to'); if (t) t.value = '';
    loadPurchases(0);
  }

  function showToday(btnEl) {
    activateChip(btnEl);
    const now = new Date().toISOString().substring(0, 10);
    const f = document.getElementById('pur-filter-from'); if (f) f.value = now;
    const t = document.getElementById('pur-filter-to'); if (t) t.value = now;
    loadPurchases(0);
  }

  function showYesterday(btnEl) {
    activateChip(btnEl);
    const yest = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
    const f = document.getElementById('pur-filter-from'); if (f) f.value = yest;
    const t = document.getElementById('pur-filter-to'); if (t) t.value = yest;
    loadPurchases(0);
  }

  function showSevenDays(btnEl) {
    activateChip(btnEl);
    const now = new Date().toISOString().substring(0, 10);
    const prev = new Date(Date.now() - 7 * 86400000).toISOString().substring(0, 10);
    const f = document.getElementById('pur-filter-from'); if (f) f.value = prev;
    const t = document.getElementById('pur-filter-to'); if (t) t.value = now;
    loadPurchases(0);
  }

  function showThirtyDays(btnEl) {
    activateChip(btnEl);
    const now = new Date().toISOString().substring(0, 10);
    const prev = new Date(Date.now() - 30 * 86400000).toISOString().substring(0, 10);
    const f = document.getElementById('pur-filter-from'); if (f) f.value = prev;
    const t = document.getElementById('pur-filter-to'); if (t) t.value = now;
    loadPurchases(0);
  }

  function showThisFinancialYear(btnEl) {
    activateChip(btnEl);
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const start = `${year}-04-01`;
    const end = `${year + 1}-03-31`;
    const f = document.getElementById('pur-filter-from'); if (f) f.value = start;
    const t = document.getElementById('pur-filter-to'); if (t) t.value = end;
    loadPurchases(0);
  }

  function showThisQuarter(btnEl) {
    activateChip(btnEl);
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const qStartMonth = Math.floor(m / 3) * 3;
    const start = new Date(y, qStartMonth, 1).toISOString().substring(0, 10);
    const end = new Date(y, qStartMonth + 3, 0).toISOString().substring(0, 10);
    const f = document.getElementById('pur-filter-from'); if (f) f.value = start;
    const t = document.getElementById('pur-filter-to'); if (t) t.value = end;
    loadPurchases(0);
  }

  function resetFilters() {
    const s = document.getElementById('pur-filter-search'); if (s) s.value = '';
    const supp = document.getElementById('pur-filter-supplier'); if (supp) supp.value = '';
    const f = document.getElementById('pur-filter-from'); if (f) f.value = '';
    const t = document.getElementById('pur-filter-to'); if (t) t.value = '';
    const d = document.getElementById('pur-filter-doc-status'); if (d) d.value = '';
    const p = document.getElementById('pur-filter-pay-status'); if (p) p.value = '';
    const r = document.getElementById('pur-filter-ret-status'); if (r) r.value = '';
    loadPurchases(0);
  }

  // ==========================================
  // 4. PURCHASE CREATION / EDITOR WORKSPACE (Purchase.fxml PARITY)
  // ==========================================

  async function openPurchaseView(invoiceNo) {
    await openPurchaseEditor(invoiceNo, true);
    if (window.AppDialogService && window.AppDialogService.toastInfo) {
      window.AppDialogService.toastInfo(`Viewing Purchase ${invoiceNo} in Read-Only Mode`);
    }
  }

  async function openPurchaseEditor(invoiceNo = null, isViewMode = false) {
    editingInvoiceNo = invoiceNo;
    editorLines = [];
    editorCharges = [];
    selectedEditorItem = null;
    isReadOnlyView = !!isViewMode;

    window.NavigationRouter.selectNav('view-purchase-creation');

    const titleEl = document.getElementById('pe-title');
    const subEl = document.getElementById('pe-subtitle');
    if (titleEl) {
      titleEl.innerText = isReadOnlyView 
        ? `View Purchase Invoice • ${invoiceNo} (Read Only)` 
        : (invoiceNo ? 'Edit Purchase Invoice' : 'Create Purchase Invoice');
    }
    if (subEl) {
      subEl.innerText = isReadOnlyView 
        ? 'Viewing historical supplier purchase in read-only mode' 
        : (invoiceNo ? `Editing inward purchase bill ${invoiceNo}` : 'Create a supplier purchase with the same validation and calculation flow as Sales');
    }

    const banner = document.getElementById('pe-read-only-banner');
    if (banner) banner.style.display = isReadOnlyView ? 'block' : 'none';

    const entryStrip = document.getElementById('pe-item-entry-strip');
    if (entryStrip) entryStrip.style.display = isReadOnlyView ? 'none' : 'grid';

    const btnSave = document.getElementById('pe-btn-save');
    if (btnSave) btnSave.style.display = isReadOnlyView ? 'none' : 'inline-block';

    // Set Default Dates
    const today = new Date().toISOString().substring(0, 10);
    document.getElementById('pe-invoice-date').value = today;
    document.getElementById('pe-po-date').value = today;

    // Load Suppliers Bootstrap
    try {
      const suppliers = await window.MasterService.getParties('SUPPLIER');
      cachedSuppliers = suppliers || [];
      const suppSelect = document.getElementById('pe-supplier-select');
      if (suppSelect) {
        suppSelect.innerHTML = `<option value="">Select supplier... *</option>` +
          cachedSuppliers.map(s => `<option value="${s.id}">${s.partyCode ? s.partyCode + ' - ' : ''}${s.name}</option>`).join('');
      }

      // Load Lookup Types (GST Types & Payment Terms)
      const gstTypes = await window.MasterService.getLookupValues('GST_TYPE').catch(() => ({ values: ['Intra-State GST', 'Inter-State IGST'] }));
      const gstSel = document.getElementById('pe-gst-type');
      if (gstSel && gstTypes?.values) {
        gstSel.innerHTML = gstTypes.values.map(v => `<option value="${v}">${v}</option>`).join('');
      }

      const payTerms = await window.MasterService.getLookupValues('PAYMENT_TERMS').catch(() => ({ values: ['Net 30', 'Net 15', 'Immediate', 'Advance', 'Net 60'] }));
      const paySel = document.getElementById('pe-payment-terms');
      if (paySel && payTerms?.values) {
        paySel.innerHTML = payTerms.values.map(v => `<option value="${v}">${v}</option>`).join('');
      }

    } catch (e) {
      console.warn('Bootstrap load failed:', e);
    }

    if (invoiceNo) {
      // Load Existing Purchase for Editing
      try {
        const p = await window.OperationsService.getPurchaseByInvoice(invoiceNo);
        document.getElementById('pe-invoice-no').value = p.invoiceNo;
        document.getElementById('pe-invoice-date').value = p.invoiceDate ? p.invoiceDate.substring(0, 10) : today;
        document.getElementById('pe-supplier-select').value = p.supplier?.id || '';
        document.getElementById('pe-billing-address').value = p.billingAddress || '';
        document.getElementById('pe-delivery-address').value = p.deliveryAddress || '';
        document.getElementById('pe-billing-gstin').value = p.billingGstin || '';
        document.getElementById('pe-delivery-gstin').value = p.deliveryGstin || '';
        document.getElementById('pe-payment-terms').value = p.paymentTerms || 'Net 30';
        document.getElementById('pe-po-date').value = p.poDate ? p.poDate.substring(0, 10) : today;
        document.getElementById('pe-order-no').value = p.orderNo || '';
        document.getElementById('pe-gst-type').value = p.gstType || 'Intra-State GST';
        document.getElementById('pe-transporter').value = p.transporter || '';
        document.getElementById('pe-transporter-gstin').value = p.transporterGstin || '';
        document.getElementById('pe-vehicle-number').value = p.vehicleNumber || '';
        document.getElementById('pe-contact-person').value = p.contactPerson || '';
        document.getElementById('pe-contact-mobile').value = p.contactPersonMobile || '';
        document.getElementById('pe-notes').value = p.notes || p.remarks || '';

        editorLines = (p.lines || []).map(l => ({
          itemCode: l.itemCode,
          itemDescription: l.itemDescription,
          itemCategory: l.itemCategory || 'General',
          itemHsn: l.itemHsn || '73063000',
          itemUnit: l.itemUnit || 'PCS',
          quantity: parseFloat(l.quantity) || 1,
          rate: parseFloat(l.rate) || 0,
          discountPercent: parseFloat(l.discountPercent) || 0,
          gstPercent: parseFloat(l.gstPercent) || 18
        }));

        editorCharges = (p.charges || []).map(c => ({
          chargeType: c.chargeType,
          amount: parseFloat(c.amount) || 0,
          taxable: !!c.taxable,
          gstPercent: parseFloat(c.gstPercent) || 18
        }));

      } catch (e) {
        alert('Failed to load purchase for editing: ' + e.message);
      }
    } else {
      // Preview Next Purchase Bill No
      try {
        const nextRes = await window.OperationsService.getNextPurchaseInvoice();
        document.getElementById('pe-invoice-no').value = nextRes?.value || 'BILL-2026-0001';
      } catch {
        document.getElementById('pe-invoice-no').value = 'BILL-2026-0001';
      }
    }

    // Toggle disabled / readonly state on inputs for read-only view mode
    ['pe-supplier-select', 'pe-invoice-date', 'pe-billing-address', 'pe-delivery-address', 'pe-same-as-billing', 'pe-billing-gstin', 'pe-delivery-gstin', 'pe-payment-terms', 'pe-order-no', 'pe-gst-type', 'pe-transporter', 'pe-transporter-gstin', 'pe-vehicle-number', 'pe-contact-person', 'pe-contact-mobile', 'pe-notes', 'pe-po-date'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'SELECT' || el.type === 'checkbox') el.disabled = isReadOnlyView;
        else el.readOnly = isReadOnlyView;
      }
    });

    renderEditorLines();
    recalcEditorTotals();
  }

  function onEditorSupplierChange() {
    const suppId = document.getElementById('pe-supplier-select')?.value;
    const supp = cachedSuppliers.find(s => s.id == suppId);
    if (!supp) return;

    const billAddr = document.getElementById('pe-billing-address');
    const delAddr = document.getElementById('pe-delivery-address');
    const billGstin = document.getElementById('pe-billing-gstin');
    const delGstin = document.getElementById('pe-delivery-gstin');
    const contact = document.getElementById('pe-contact-person');
    const mobile = document.getElementById('pe-contact-mobile');

    if (billAddr) billAddr.value = supp.address || '';
    if (delAddr && document.getElementById('pe-same-as-billing')?.checked) {
      delAddr.value = supp.address || '';
    }
    if (billGstin) billGstin.value = supp.gstin || '';
    if (delGstin && document.getElementById('pe-same-as-billing')?.checked) {
      delGstin.value = supp.gstin || '';
    }
    if (contact) contact.value = supp.contactPerson || '';
    if (mobile) mobile.value = supp.phone || '';

    // Auto-detect Inter-state vs Intra-state GST from supplier GSTIN
    const supplierState = (supp.gstin || '').substring(0, 2);
    const gstTypeSelect = document.getElementById('pe-gst-type');
    if (gstTypeSelect && supplierState) {
      // 24 is Gujarat (Jasvi Industries state)
      if (supplierState === '24') {
        gstTypeSelect.value = 'Intra-State GST';
      } else {
        gstTypeSelect.value = 'Inter-State IGST';
      }
      recalcEditorTotals();
    }
  }

  function onSameAsBillingToggle(checked) {
    const delAddr = document.getElementById('pe-delivery-address');
    const delGstin = document.getElementById('pe-delivery-gstin');
    if (checked) {
      if (delAddr) delAddr.value = document.getElementById('pe-billing-address')?.value || '';
      if (delGstin) delGstin.value = document.getElementById('pe-billing-gstin')?.value || '';
    }
  }

  // Live item search for purchase editor
  async function searchEditorItems(query) {
    const list = document.getElementById('pe-item-search-results');
    if (!list) return;

    if (!query || query.trim().length < 1) {
      list.style.display = 'none';
      return;
    }

    try {
      const items = await window.MasterService.searchItems(query.trim(), 10);
      if (!items || items.length === 0) {
        list.innerHTML = `<div style="padding:10px; color:var(--text-muted); font-size:0.8rem;">No matching catalog items found.</div>`;
        list.style.display = 'block';
        return;
      }

      list.innerHTML = items.map(i => `
        <div class="search-result-row" onclick="window.PurchaseController.selectEditorItem('${i.itemCode}')" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:700; color:var(--cyan); font-size:0.85rem;">${i.itemCode} - ${i.description}</div>
            <div style="font-size:0.72rem; color:var(--text-dim);">HSN: ${i.hsn || '-'} | Unit: ${i.unit || 'PCS'} | Purchase Price: ${formatMoney(i.purchasePrice || 0)}</div>
          </div>
          <span class="pill-badge pill-neutral">${i.category || 'Item'}</span>
        </div>
      `).join('');
      list.style.display = 'block';

    } catch (e) {
      list.style.display = 'none';
    }
  }

  async function selectEditorItem(code) {
    const list = document.getElementById('pe-item-search-results');
    if (list) list.style.display = 'none';

    try {
      const items = await window.MasterService.searchItems(code, 1);
      const item = items?.find(i => i.itemCode === code);
      if (!item) return;

      selectedEditorItem = item;
      document.getElementById('pe-item-search').value = `${item.itemCode} - ${item.description}`;
      document.getElementById('pe-line-qty').value = '1';
      document.getElementById('pe-line-rate').value = (parseFloat(item.purchasePrice) || 0).toFixed(2);
      document.getElementById('pe-line-disc').value = (parseFloat(item.discountPercent) || 0).toFixed(2);
      document.getElementById('pe-line-gst').value = (parseFloat(item.gst) || 18).toFixed(2);

    } catch (e) {
      console.error(e);
    }
  }

  function addEditorLine() {
    if (!selectedEditorItem) {
      alert('Please search and select an item from catalog.');
      return;
    }

    const qty = parseFloat(document.getElementById('pe-line-qty')?.value) || 0;
    const rate = parseFloat(document.getElementById('pe-line-rate')?.value) || 0;
    const disc = parseFloat(document.getElementById('pe-line-disc')?.value) || 0;
    const gst = parseFloat(document.getElementById('pe-line-gst')?.value) || 0;

    if (qty <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }

    editorLines.push({
      itemCode: selectedEditorItem.itemCode,
      itemDescription: selectedEditorItem.description,
      itemCategory: selectedEditorItem.category || 'General',
      itemHsn: selectedEditorItem.hsn || '73063000',
      itemUnit: selectedEditorItem.unit || 'PCS',
      quantity: qty,
      rate: rate,
      discountPercent: disc,
      gstPercent: gst
    });

    // Reset input fields
    selectedEditorItem = null;
    document.getElementById('pe-item-search').value = '';
    document.getElementById('pe-line-qty').value = '';
    document.getElementById('pe-line-rate').value = '';
    document.getElementById('pe-line-disc').value = '0';
    document.getElementById('pe-line-gst').value = '18';

    renderEditorLines();
    recalcEditorTotals();
  }

  function removeEditorLine(idx) {
    editorLines.splice(idx, 1);
    renderEditorLines();
    recalcEditorTotals();
  }

  function renderEditorLines() {
    const tbody = document.getElementById('pe-lines-body');
    if (!tbody) return;

    if (editorLines.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="13" style="text-align:center; padding:30px; color:var(--text-muted);">
            <div>No items added yet. Search and add items above to build purchase invoice.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = editorLines.map((l, idx) => {
      const gross = l.quantity * l.rate;
      const discAmt = gross * (l.discountPercent / 100);
      const taxable = gross - discAmt;
      const gstAmt = taxable * (l.gstPercent / 100);
      const lineTotal = taxable + gstAmt;

      return `
        <tr>
          <td style="font-weight:700; color:var(--cyan); font-family:monospace;">${l.itemCode}</td>
          <td>${l.itemDescription}</td>
          <td>${l.itemCategory}</td>
          <td>${l.itemHsn}</td>
          <td>${l.itemUnit}</td>
          <td style="text-align:right;">${l.quantity.toFixed(3)}</td>
          <td style="text-align:right;">${formatMoney(l.rate)}</td>
          <td style="text-align:right;">${l.discountPercent.toFixed(2)}%</td>
          <td style="text-align:right; color:var(--text-muted);">${formatMoney(discAmt)}</td>
          <td style="text-align:right;">${l.gstPercent.toFixed(2)}%</td>
          <td style="text-align:right; font-weight:600;">${formatMoney(taxable)}</td>
          <td style="text-align:right; color:var(--yellow);">${formatMoney(gstAmt)}</td>
          <td style="text-align:right; font-weight:700; color:var(--yellow);">${formatMoney(lineTotal)}</td>
          <td style="text-align:center;">
            ${isReadOnlyView ? '<span style="color:var(--text-muted); font-size:1.1rem;" title="Locked in read-only mode">🔒</span>' : `<button class="btn btn-danger btn-sm" onclick="window.PurchaseController.removeEditorLine(${idx})" style="padding:2px 6px;">&times;</button>`}
          </td>
        </tr>
      `;
    }).join('');
  }

  function recalcEditorTotals() {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalGst = 0;

    editorLines.forEach(l => {
      const gross = l.quantity * l.rate;
      const disc = gross * (l.discountPercent / 100);
      const taxVal = gross - disc;
      const tax = taxVal * (l.gstPercent / 100);

      subtotal += gross;
      totalDiscount += disc;
      totalTaxable += taxVal;
      totalGst += tax;
    });

    // Additional Charges Calculation (DocumentChargeDialog parity)
    let chargesTotal = 0;
    let chargesGst = 0;
    editorCharges.forEach(c => {
      chargesTotal += c.amount;
      if (c.taxable) {
        chargesGst += c.amount * (c.gstPercent / 100);
      }
    });

    const netGst = totalGst + chargesGst;
    const gstType = document.getElementById('pe-gst-type')?.value || 'Intra-State GST';
    const isInterState = gstType === 'Inter-State IGST';

    let cgst = 0, sgst = 0, igst = 0;
    if (isInterState) {
      igst = netGst;
    } else {
      cgst = Math.round((netGst / 2) * 100) / 100;
      sgst = Math.round((netGst - cgst) * 100) / 100;
    }

    const grandTotal = Math.round((totalTaxable + chargesTotal + netGst) * 100) / 100;

    // Update Summary Card elements
    const subEl = document.getElementById('pe-summary-subtotal');
    const discEl = document.getElementById('pe-summary-discount');
    const taxValEl = document.getElementById('pe-summary-taxable');
    const chargesEl = document.getElementById('pe-summary-charges');
    const cgstEl = document.getElementById('pe-summary-cgst');
    const sgstEl = document.getElementById('pe-summary-sgst');
    const igstEl = document.getElementById('pe-summary-igst');
    const rowCgst = document.getElementById('pe-row-cgst');
    const rowSgst = document.getElementById('pe-row-sgst');
    const rowIgst = document.getElementById('pe-row-igst');
    const totalGstEl = document.getElementById('pe-summary-total-gst');
    const grandEl = document.getElementById('pe-summary-grand-total');

    if (subEl) subEl.innerText = formatMoney(subtotal);
    if (discEl) discEl.innerText = formatMoney(totalDiscount);
    if (taxValEl) taxValEl.innerText = formatMoney(totalTaxable);
    if (chargesEl) chargesEl.innerText = formatMoney(chargesTotal);

    if (rowCgst) rowCgst.style.display = isInterState ? 'none' : 'flex';
    if (rowSgst) rowSgst.style.display = isInterState ? 'none' : 'flex';
    if (rowIgst) rowIgst.style.display = isInterState ? 'flex' : 'none';

    if (cgstEl) cgstEl.innerText = formatMoney(cgst);
    if (sgstEl) sgstEl.innerText = formatMoney(sgst);
    if (igstEl) igstEl.innerText = formatMoney(igst);
    if (totalGstEl) totalGstEl.innerText = formatMoney(netGst);
    if (grandEl) grandEl.innerText = formatMoney(grandTotal);

    // Bottom strip
    const botItems = document.getElementById('pe-bottom-items');
    if (botItems) botItems.innerText = `${editorLines.length} Item(s)`;
  }

  async function savePurchase() {
    const invoiceNo = document.getElementById('pe-invoice-no')?.value?.trim();
    const invoiceDate = document.getElementById('pe-invoice-date')?.value;
    const suppId = document.getElementById('pe-supplier-select')?.value;

    if (!invoiceNo) { alert('Purchase invoice number is required.'); return; }
    if (!invoiceDate) { alert('Purchase date is required.'); return; }
    if (!suppId) { alert('Please select a supplier.'); return; }
    if (editorLines.length === 0) { alert('Please add at least one line item to the purchase invoice.'); return; }

    const supp = cachedSuppliers.find(s => s.id == suppId);

    // Compute totals
    let subtotal = 0, totalTaxable = 0, totalGst = 0, totalDiscount = 0, totalQty = 0;
    const linesPayload = editorLines.map(l => {
      const gross = l.quantity * l.rate;
      const disc = gross * (l.discountPercent / 100);
      const taxVal = gross - disc;
      const tax = taxVal * (l.gstPercent / 100);
      const total = taxVal + tax;

      subtotal += gross;
      totalDiscount += disc;
      totalTaxable += taxVal;
      totalGst += tax;
      totalQty += l.quantity;

      return {
        itemCode: l.itemCode,
        itemDescription: l.itemDescription,
        itemCategory: l.itemCategory,
        itemHsn: l.itemHsn,
        itemUnit: l.itemUnit,
        itemRemarks: '',
        quantity: l.quantity,
        rate: l.rate,
        discountPercent: l.discountPercent,
        discountAmount: disc,
        gstPercent: l.gstPercent,
        totalAmount: total
      };
    });

    let chargesTotal = 0;
    editorCharges.forEach(c => chargesTotal += c.amount);
    const grandTotal = Math.round((totalTaxable + chargesTotal + totalGst) * 100) / 100;

    const payload = {
      id: null,
      invoiceNo: invoiceNo,
      invoiceDate: invoiceDate,
      supplier: {
        id: supp?.id,
        partyCode: supp?.partyCode || supp?.code,
        name: supp?.name,
        email: supp?.email,
        phone: supp?.phone,
        gstin: supp?.gstin,
        address: supp?.address
      },
      subtotal: totalTaxable,
      gstAmount: totalGst,
      totalAmount: grandTotal,
      remarks: document.getElementById('pe-notes')?.value || '',
      createdAt: new Date().toISOString(),
      emailSent: false,
      dueDate: document.getElementById('pe-po-date')?.value || invoiceDate,
      paidAmount: 0,
      paymentStatus: 'UNPAID',
      documentStatus: 'APPROVED',
      warehouse: 'Main Warehouse',
      paymentTerms: document.getElementById('pe-payment-terms')?.value || 'Net 30',
      currency: 'INR',
      referenceNo: document.getElementById('pe-order-no')?.value || '',
      gstTreatment: 'Taxable Goods',
      transporter: document.getElementById('pe-transporter')?.value || '',
      lrAwbNo: '',
      discountType: 'Percentage',
      discountAmount: totalDiscount,
      attachmentPath: '',
      createdBy: 'Admin',
      deliveryDate: invoiceDate,
      billingAddress: document.getElementById('pe-billing-address')?.value || '',
      deliveryAddress: document.getElementById('pe-delivery-address')?.value || '',
      billingGstin: document.getElementById('pe-billing-gstin')?.value || '',
      deliveryGstin: document.getElementById('pe-delivery-gstin')?.value || '',
      gstType: document.getElementById('pe-gst-type')?.value || 'Intra-State GST',
      transporterGstin: document.getElementById('pe-transporter-gstin')?.value || '',
      vehicleNumber: document.getElementById('pe-vehicle-number')?.value || '',
      contactPerson: document.getElementById('pe-contact-person')?.value || '',
      contactPersonMobile: document.getElementById('pe-contact-mobile')?.value || '',
      notes: document.getElementById('pe-notes')?.value || '',
      orderNo: document.getElementById('pe-order-no')?.value || '',
      poDate: document.getElementById('pe-po-date')?.value || invoiceDate,
      sameAsBilling: document.getElementById('pe-same-as-billing')?.checked || false,
      quantity: totalQty,
      charges: editorCharges,
      lines: linesPayload,
      rowVersion: 0
    };

    const btnSave = document.getElementById('pe-btn-save');
    if (btnSave) { btnSave.disabled = true; btnSave.innerText = 'Saving Purchase...'; }

    try {
      if (editingInvoiceNo) {
        await window.OperationsService.updatePurchase(payload);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Purchase invoice ${invoiceNo} updated successfully!`);
      } else {
        await window.OperationsService.createPurchase(payload);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Purchase invoice ${invoiceNo} created successfully!`);
      }

      window.NavigationRouter.selectNav('view-purchase-register');
      loadPurchases(0);

    } catch (err) {
      console.error('Failed to save purchase:', err);
      alert('Failed to save purchase invoice: ' + (err.message || 'Server error'));
    } finally {
      if (btnSave) { btnSave.disabled = false; btnSave.innerText = 'Save Purchase'; }
    }
  }

  function cancelEditor() {
    if (editorLines.length > 0 && !confirm('Discard unsaved purchase invoice changes?')) return;
    window.NavigationRouter.selectNav('view-purchase-register');
  }

  return {
    loadPurchases,
    showDetails,
    closeDrawer,
    onRowClick,
    toggleActionMenu,
    approvePurchase,
    rejectPurchasePrompt,
    cancelPurchase,
    deletePurchase,
    downloadPdf,
    downloadExcel,
    printInwardBarcode,
    sendEmailPrompt,
    openReturnPrompt,
    showAllDates,
    showToday,
    showYesterday,
    showSevenDays,
    showThirtyDays,
    showThisFinancialYear,
    showThisQuarter,
    resetFilters,
    prevPage() { if (currentPage > 0) loadPurchases(currentPage - 1); },
    nextPage() { if (currentPage < totalPages - 1) loadPurchases(currentPage + 1); },
    changePageSize,
    goToPage,
    openPurchaseView,
    openPayments,
    openPurchaseEditor,
    openNewPurchaseModal() { openPurchaseEditor(); },
    onEditorSupplierChange,
    onSameAsBillingToggle,
    searchEditorItems,
    selectEditorItem,
    addEditorLine,
    removeEditorLine,
    recalcEditorTotals,
    savePurchase,
    cancelEditor
  };
})();
