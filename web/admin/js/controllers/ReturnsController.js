/**
 * Jasvi Industries ERP - ReturnsController
 * 100% Desktop Parity with SalesReturnsController.java & ReturnRefundController.java
 * Manages Sales Returns & Purchase Returns, 12-action row menu, Slide Drawer, Approval Workflow, and Refund Ledger
 */
window.ReturnsController = (function() {
  let currentType = 'SALES RETURN'; // 'SALES RETURN' or 'PURCHASE RETURN'
  let currentPage = 0;
  const pageSize = 25;
  let totalRows = 0;
  let totalPages = 1;
  let returnsList = [];
  let selectedReturn = null;
  let selectedReturnableLines = [];

  function formatMoney(val) {
    const num = parseFloat(val) || 0;
    return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(dStr) {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dStr;
    }
  }

  function getStatusBadge(status) {
    const s = (status || '').toUpperCase().trim();
    if (s.includes('APPROV') || s.includes('COMPLET') || s.includes('REFUND')) {
      return `<span class="pill-badge pill-success">${status}</span>`;
    } else if (s.includes('REJECT') || s.includes('CANCEL') || s.includes('FAIL')) {
      return `<span class="pill-badge pill-danger">${status}</span>`;
    } else if (s.includes('PENDING')) {
      return `<span class="pill-badge pill-warning">${status}</span>`;
    }
    return `<span class="pill-badge pill-neutral">${status || 'DRAFT'}</span>`;
  }

  // 1. LOAD & RENDER RETURNS REGISTER
  async function loadReturns(type = 'SALES RETURN', page = 0) {
    currentType = type;
    currentPage = page;
    const isSales = currentType === 'SALES RETURN';
    const containerId = isSales ? 'tbl-sales-returns-body' : 'tbl-purchase-returns-body';
    const tbody = document.getElementById(containerId);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-muted);"><span class="loading-spinner"></span> Loading ${isSales ? 'sales' : 'purchase'} returns from database...</td></tr>`;
    }

    const q = document.getElementById(isSales ? 'sr-filter-search' : 'pr-filter-search')?.value?.trim() || '';
    const party = document.getElementById(isSales ? 'sret-filter-customer' : 'pr-filter-supplier')?.value || '';
    const status = document.getElementById(isSales ? 'sr-filter-status' : 'pr-filter-status')?.value || '';
    const from = document.getElementById(isSales ? 'sr-filter-from' : 'pr-filter-from')?.value || '';
    const to = document.getElementById(isSales ? 'sr-filter-to' : 'pr-filter-to')?.value || '';

    try {
      const data = await window.OperationsService.getReturnsPage(currentType, currentPage, pageSize, q, party, status, from, to);
      returnsList = data?.rows || [];
      totalRows = data?.totalRows || returnsList.length;
      totalPages = data?.totalPages || 1;

      // Update KPI Cards matching SalesReturns.fxml
      applyKpis(data?.metrics, isSales);

      // Populate Party Filter if options empty
      populatePartyFilter(data?.parties, isSales);

      // Render Table Rows
      renderTable(returnsList, isSales);

      // Update Pagination Info
      updatePagination(isSales);

    } catch (err) {
      console.error('Failed to load returns:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--red);"><span style="font-size:1.2rem;">⚠️</span> Failed to load returns: ${err.message || 'Server error'}</td></tr>`;
      }
      if (window.AppDialogService) {
        window.AppDialogService.toastError(`Failed to load ${isSales ? 'sales' : 'purchase'} returns: ` + err.message);
      }
    }
  }

  function applyKpis(metrics, isSales) {
    const prefix = isSales ? 'sr-kpi-' : 'pr-kpi-';
    const totalEl = document.getElementById(prefix + 'total');
    const monthEl = document.getElementById(prefix + 'month');
    const pendingEl = document.getElementById(prefix + 'pending');
    const approvedEl = document.getElementById(prefix + 'approved');
    const refundEl = document.getElementById(prefix + 'refund');

    if (metrics) {
      if (totalEl) totalEl.innerText = formatMoney(metrics.total || 0);
      if (monthEl) monthEl.innerText = formatMoney(metrics.monthAmount || 0);
      if (approvedEl) approvedEl.innerText = formatMoney(metrics.approvedAmount || 0);
      if (pendingEl) pendingEl.innerText = formatMoney(Math.max(0, (metrics.total || 0) - (metrics.approvedAmount || 0)));
      if (refundEl) refundEl.innerText = formatMoney(metrics.refundAmount || 0);
    }
  }

  function populatePartyFilter(parties, isSales) {
    const select = document.getElementById(isSales ? 'sret-filter-customer' : 'pr-filter-supplier');
    if (!select || !parties || select.options.length > 2) return;
    const currentVal = select.value;
    select.innerHTML = `<option value="">${isSales ? 'All Customers' : 'All Suppliers'}</option>`;
    parties.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      select.appendChild(opt);
    });
    if (currentVal) select.value = currentVal;
  }

  function renderTable(rows, isSales) {
    const containerId = isSales ? 'tbl-sales-returns-body' : 'tbl-purchase-returns-body';
    const tbody = document.getElementById(containerId);
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:1.8rem; margin-bottom:8px;">↩️</div>
            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">No ${isSales ? 'sales' : 'purchase'} returns found</div>
            <div style="font-size:0.78rem;">Adjust the filters or create a return from ${isSales ? 'Sales Register' : 'Purchase Register'}.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map((r, idx) => {
      const isPending = (r.status || '').toUpperCase() === 'PENDING APPROVAL';
      const isApproved = (r.status || '').toUpperCase() === 'APPROVED';
      const canCancelDelete = (isPending || isApproved) && (parseFloat(r.refund) || 0) <= 0.0001;

      return `
        <tr onclick="window.ReturnsController.onRowClick('${r.no}', event)" style="cursor:pointer;">
          <td style="font-family:'Space Grotesk', monospace; font-weight:700; color:var(--cyan);">${r.no}</td>
          <td>${formatDate(r.date)}</td>
          <td style="font-family:monospace; color:var(--purple);">${r.invoice || '-'}</td>
          <td style="font-weight:600; color:var(--text-main);">${r.party || '-'}</td>
          <td style="text-align:right; font-weight:700; color:var(--yellow);">${formatMoney(r.total)}</td>
          <td style="text-align:right; font-weight:600; color:var(--green);">${formatMoney(r.refund)}</td>
          <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.reason || ''}">${r.reason || 'Not set'}</td>
          <td>${getStatusBadge(r.status)}</td>
          <td>${getStatusBadge(r.refundStatus)}</td>
          <td style="text-align:center;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn btn-secondary btn-sm" onclick="window.ReturnsController.toggleActionMenu('${r.no}', event)" style="padding:2px 8px; font-size:0.75rem; height:26px;">
                Actions ▼
              </button>
              <div id="action-menu-${r.no.replace(/[^a-zA-Z0-9]/g, '_')}" class="action-dropdown-menu" style="display:none; position:absolute; right:0; top:100%; z-index:999; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:190px; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.ReturnsController.showDetails('${r.no}')"><span style="margin-right:8px;">👁️</span> View Details</div>
                <div class="action-menu-item" onclick="window.ReturnsController.showAudit('${r.no}')"><span style="margin-right:8px;">📜</span> Audit Trail</div>
                <div class="action-menu-item" onclick="window.ReturnsController.editReasonPrompt('${r.no}', '${(r.reason || '').replace(/'/g, "\\'")}')"><span style="margin-right:8px;">✏️</span> Edit Reason</div>
                <div class="action-menu-item" onclick="window.ReturnsController.downloadPdf('${r.no}')"><span style="margin-right:8px;">🖨️</span> Print / PDF</div>
                <div class="action-menu-item" onclick="window.ReturnsController.downloadExcel('${r.no}')"><span style="margin-right:8px;">📊</span> View / Download Excel</div>
                <div class="action-menu-item" onclick="window.ReturnsController.sendEmailPrompt('${r.no}')"><span style="margin-right:8px;">✉️</span> Send Email</div>
                <div class="action-menu-item" onclick="window.ReturnsController.viewOriginalDoc('${r.invoice}')"><span style="margin-right:8px;">🛒</span> View Original ${isSales ? 'Sale' : 'Purchase'}</div>
                <div class="action-menu-divider" style="height:1px; background:var(--border-subtle); margin:4px 0;"></div>
                ${isPending ? `<div class="action-menu-item" style="color:var(--green);" onclick="window.ReturnsController.approveReturn('${r.no}')"><span style="margin-right:8px;">✅</span> Approve Return</div>` : ''}
                ${isPending ? `<div class="action-menu-item" style="color:var(--red);" onclick="window.ReturnsController.rejectReturnPrompt('${r.no}')"><span style="margin-right:8px;">❌</span> Reject Return</div>` : ''}
                ${isApproved ? `<div class="action-menu-item" style="color:var(--cyan);" onclick="window.ReturnsController.openRefundModal('${r.no}')"><span style="margin-right:8px;">💸</span> Record Refund</div>` : `<div class="action-menu-item disabled" style="color:var(--text-dim); cursor:not-allowed;" title="Approval required first"><span style="margin-right:8px;">💸</span> Record Refund (Approval Required)</div>`}
                ${canCancelDelete ? `<div class="action-menu-divider" style="height:1px; background:var(--border-subtle); margin:4px 0;"></div>` : ''}
                ${canCancelDelete ? `<div class="action-menu-item" style="color:var(--yellow);" onclick="window.ReturnsController.cancelReturn('${r.no}')"><span style="margin-right:8px;">⛔</span> Cancel Return</div>` : ''}
                ${canCancelDelete ? `<div class="action-menu-item" style="color:var(--red);" onclick="window.ReturnsController.deleteReturn('${r.no}')"><span style="margin-right:8px;">🗑️</span> Delete Return</div>` : ''}
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function updatePagination(isSales) {
    const infoEl = document.getElementById(isSales ? 'sr-pagination-info' : 'pr-pagination-info');
    const prevBtn = document.getElementById(isSales ? 'sr-btn-prev' : 'pr-btn-prev');
    const nextBtn = document.getElementById(isSales ? 'sr-btn-next' : 'pr-btn-next');
    if (infoEl) {
      const from = totalRows === 0 ? 0 : (currentPage * pageSize) + 1;
      const to = Math.min((currentPage + 1) * pageSize, totalRows);
      infoEl.innerText = `Showing ${from}–${to} of ${totalRows} returns • Page ${currentPage + 1} of ${Math.max(1, totalPages)}`;
    }
    if (prevBtn) prevBtn.disabled = currentPage <= 0;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;
  }

  function onRowClick(no, event) {
    if (event && event.target && event.target.closest('button, select, input, a, .action-dropdown-menu')) return;
    showDetails(no);
  }

  function toggleActionMenu(no, event) {
    if (event) event.stopPropagation();
    const menuId = 'action-menu-' + no.replace(/[^a-zA-Z0-9]/g, '_');
    const targetMenu = document.getElementById(menuId);
    document.querySelectorAll('.action-dropdown-menu').forEach(m => {
      if (m !== targetMenu) m.style.display = 'none';
    });
    if (targetMenu) {
      targetMenu.style.display = targetMenu.style.display === 'block' ? 'none' : 'block';
    }
  }

  // Close menus when clicking outside
  document.addEventListener('click', function() {
    document.querySelectorAll('.action-dropdown-menu').forEach(m => m.style.display = 'none');
  });

  // 2. SIDE DRAWER DETAILS
  async function showDetails(no) {
    const isSales = currentType === 'SALES RETURN';
    const drawer = document.getElementById(isSales ? 'sr-detail-drawer' : 'pr-detail-drawer');
    if (!drawer) return;

    try {
      const details = await window.OperationsService.getReturnDetails(no);
      selectedReturn = details;

      const prefix = isSales ? 'sr-detail-' : 'pr-detail-';
      const elNo = document.getElementById(prefix + 'no');
      const elDate = document.getElementById(prefix + 'date');
      const elParty = document.getElementById(prefix + 'party');
      const elInvoice = document.getElementById(prefix + 'invoice');
      const elTotal = document.getElementById(prefix + 'total');
      const elRefund = document.getElementById(prefix + 'refund');
      const elReason = document.getElementById(prefix + 'reason');
      const elStatus = document.getElementById(prefix + 'status');
      const elRefundStatus = document.getElementById(prefix + 'refund-status');
      const elLines = document.getElementById(prefix + 'lines');

      if (elNo) elNo.innerText = details.no;
      if (elDate) elDate.innerText = formatDate(details.date);
      if (elParty) elParty.innerText = details.party || '-';
      if (elInvoice) elInvoice.innerText = details.invoice || '-';
      if (elTotal) elTotal.innerText = formatMoney(details.total);
      if (elRefund) elRefund.innerText = formatMoney(details.refund);
      if (elReason) elReason.innerText = details.notes || 'Not set';
      if (elStatus) elStatus.innerHTML = getStatusBadge(details.status);
      if (elRefundStatus) elRefundStatus.innerHTML = getStatusBadge(details.refundStatus);

      // Render line items
      if (elLines && details.lines) {
        elLines.innerHTML = details.lines.map(l => `
          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:6px; padding:8px 10px; margin-bottom:6px; font-size:0.78rem;">
            <div style="display:flex; justify-content:space-between; font-weight:600; color:var(--text-main);">
              <span>${l.name || l.code}</span>
              <span style="color:var(--yellow);">${formatMoney(l.amount)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:var(--text-muted); margin-top:3px; font-size:0.72rem;">
              <span>Qty: ${l.quantity} ${l.unit || ''} @ ₹ ${l.rate}</span>
              <span>Reason: ${l.reason || '-'}</span>
            </div>
          </div>
        `).join('');
      }

      // Action buttons in drawer
      const isApproved = (details.status || '').toUpperCase() === 'APPROVED';
      const isPending = (details.status || '').toUpperCase() === 'PENDING APPROVAL';
      const btnApprove = document.getElementById(prefix + 'btn-approve');
      const btnReject = document.getElementById(prefix + 'btn-reject');
      const btnRefund = document.getElementById(prefix + 'btn-refund');

      if (btnApprove) btnApprove.style.display = isPending ? 'inline-flex' : 'none';
      if (btnReject) btnReject.style.display = isPending ? 'inline-flex' : 'none';
      if (btnRefund) {
        btnRefund.disabled = !isApproved;
        btnRefund.title = isApproved ? 'Record Refund' : 'Approval required first';
      }

      drawer.classList.add('open');
      drawer.style.display = 'flex';

    } catch (e) {
      console.error('Failed to load return details:', e);
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to load details: ' + e.message);
    }
  }

  function closeDrawer() {
    const isSales = currentType === 'SALES RETURN';
    const drawer = document.getElementById(isSales ? 'sr-detail-drawer' : 'pr-detail-drawer');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.style.display = 'none';
    }
    selectedReturn = null;
  }

  // 3. WORKFLOW ACTIONS: APPROVE, REJECT, CANCEL, DELETE, EDIT REASON
  async function approveReturn(no) {
    if (!confirm(`Approve Return ${no}?\n\nApproval posts the Return stock movement and starts the Return settlement period.`)) return;
    try {
      await window.OperationsService.approveReturn(no);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Return ${no} approved successfully!`);
      loadReturns(currentType, currentPage);
      if (selectedReturn && selectedReturn.no === no) showDetails(no);
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.toastError('Approval failed: ' + err.message);
    }
  }

  async function rejectReturnPrompt(no) {
    const reason = prompt(`Enter rejection reason for Return ${no}:`);
    if (reason === null) return;
    try {
      await window.OperationsService.rejectReturn(no, reason);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Return ${no} rejected.`);
      loadReturns(currentType, currentPage);
      if (selectedReturn && selectedReturn.no === no) showDetails(no);
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.toastError('Rejection failed: ' + err.message);
    }
  }

  async function cancelReturn(no) {
    if (!confirm(`Cancel Return ${no} and reverse its stock movement?`)) return;
    try {
      await window.OperationsService.cancelReturn(no, currentType === 'SALES RETURN');
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Return ${no} cancelled successfully.`);
      loadReturns(currentType, currentPage);
      closeDrawer();
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.toastError('Cancellation failed: ' + err.message);
    }
  }

  async function deleteReturn(no) {
    if (!confirm(`Delete Return ${no} from the register?\n\nActive return stock movement will be safely reversed and audit trail preserved.`)) return;
    try {
      await window.OperationsService.deleteReturn(no, currentType === 'SALES RETURN');
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Return ${no} deleted from register.`);
      loadReturns(currentType, currentPage);
      closeDrawer();
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.toastError('Deletion failed: ' + err.message);
    }
  }

  async function editReasonPrompt(no, currentReason) {
    const newReason = prompt(`Edit return reason for ${no}:`, currentReason || '');
    if (newReason === null || newReason.trim() === currentReason) return;
    try {
      const details = await window.OperationsService.getReturnDetails(no);
      await window.OperationsService.updateReturn(no, 'reason', newReason.trim(), details.rowVersion || 0);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Return ${no} reason updated.`);
      loadReturns(currentType, currentPage);
      if (selectedReturn && selectedReturn.no === no) showDetails(no);
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to update reason: ' + err.message);
    }
  }

  function downloadPdf(no) {
    const isSales = currentType === 'SALES RETURN';
    const typeCode = isSales ? 'SALES_RETURN' : 'PURCHASE_RETURN';
    const url = `/api/documents/render?type=${typeCode}&number=${encodeURIComponent(no)}&format=PDF`;
    window.open(url, '_blank');
  }

  function downloadExcel(no) {
    if (window.AppDialogService) window.AppDialogService.toastInfo(`Generating Excel export for ${no}...`);
    const isSales = currentType === 'SALES RETURN';
    const typeCode = isSales ? 'SALES_RETURN' : 'PURCHASE_RETURN';
    const url = `/api/documents/render?type=${typeCode}&number=${encodeURIComponent(no)}&format=EXCEL`;
    window.open(url, '_blank');
  }

  function sendEmailPrompt(no) {
    if (window.SalesController && window.SalesController.openEmailModal) {
      window.SalesController.openEmailModal(no, currentType === 'SALES RETURN' ? 'SALES_RETURN' : 'PURCHASE_RETURN');
    } else {
      const email = prompt(`Send Return ${no} to email address:`);
      if (!email) return;
      window.OperationsService.sendAuthorityEmail({
        recipientEmail: email,
        subject: `${currentType} ${no}`,
        body: `Please find attached ${currentType} note ${no}.`,
        documentType: currentType,
        documentNumber: no
      }).then(() => {
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Email sent to ${email}`);
      }).catch(err => {
        if (window.AppDialogService) window.AppDialogService.toastError('Email failed: ' + err.message);
      });
    }
  }

  function viewOriginalDoc(docNo) {
    if (!docNo || docNo === '-') {
      alert('Original document number not recorded on this return.');
      return;
    }
    if (currentType === 'SALES RETURN') {
      window.NavigationRouter.selectNav('view-sales-register');
      const search = document.getElementById('sales-search-input');
      if (search) {
        search.value = docNo;
        window.SalesController.loadSales();
      }
    } else {
      window.NavigationRouter.selectNav('view-purchase-register');
    }
  }

  // 4. CREATE RETURN MODAL (DESKTOP ReturnEditorService.java PARITY)
  async function openCreateReturnModal(prefillInvoice = null) {
    const modal = document.getElementById('modal-create-return');
    if (!modal) return;

    const isSales = currentType === 'SALES RETURN';
    document.getElementById('modal-create-return-title').innerText = isSales ? 'Create Sales Return' : 'Create Purchase Return';
    document.getElementById('cr-type').value = currentType;
    document.getElementById('cr-return-date').value = new Date().toISOString().substring(0, 10);
    document.getElementById('cr-invoice-input').value = prefillInvoice || '';
    document.getElementById('cr-lines-body').innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);">Enter an invoice number to load returnable line items.</td></tr>`;
    document.getElementById('cr-estimated-total').innerText = '₹ 0.00';
    document.getElementById('cr-selected-count').innerText = '0 items selected';

    modal.style.display = 'flex';

    if (prefillInvoice) {
      await loadReturnableLines(prefillInvoice);
    }
  }

  async function loadReturnableLines(invoiceNo = null) {
    const inv = invoiceNo || document.getElementById('cr-invoice-input')?.value?.trim();
    if (!inv) {
      alert('Please enter or select an invoice number.');
      return;
    }
    const tbody = document.getElementById('cr-lines-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);"><span class="loading-spinner"></span> Loading returnable items from invoice ${inv}...</td></tr>`;

    try {
      const lines = await window.OperationsService.getReturnableLines(currentType, inv);
      selectedReturnableLines = (lines || []).map(l => ({
        sourceLineId: l.sourceLineId,
        code: l.code,
        description: l.description,
        invoicedQty: parseFloat(l.quantity) || 0,
        alreadyReturnedQty: parseFloat(l.returnedQuantity) || 0,
        availableQty: Math.max(0, (parseFloat(l.quantity) || 0) - (parseFloat(l.returnedQuantity) || 0)),
        rate: parseFloat(l.rate) || 0,
        taxPercent: parseFloat(l.taxPercent) || 0,
        lineTotal: parseFloat(l.lineTotal) || 0,
        returnQty: 0,
        returnAmount: 0,
        reason: 'Return requested',
        selected: false
      }));

      renderReturnableLines();

    } catch (err) {
      console.error('Failed to load returnable lines:', err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--red);">⚠️ Could not load returnable items: ${err.message || 'Invoice not found or no items available'}</td></tr>`;
    }
  }

  function renderReturnableLines() {
    const tbody = document.getElementById('cr-lines-body');
    if (!tbody) return;

    if (selectedReturnableLines.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);">This invoice does not contain any returnable items.</td></tr>`;
      return;
    }

    tbody.innerHTML = selectedReturnableLines.map((row, idx) => {
      const isAvailable = row.availableQty > 0.0001;
      return `
        <tr style="${!isAvailable ? 'opacity:0.5;' : ''}">
          <td style="text-align:center;">
            <input type="checkbox" ${row.selected ? 'checked' : ''} ${!isAvailable ? 'disabled' : ''} onchange="window.ReturnsController.toggleLineSelect(${idx}, this.checked)">
          </td>
          <td style="font-weight:600; font-family:monospace; color:var(--cyan);">${row.code}</td>
          <td>${row.description}</td>
          <td style="text-align:right;">${row.invoicedQty.toFixed(2)}</td>
          <td style="text-align:right; color:var(--text-muted);">${row.alreadyReturnedQty.toFixed(2)}</td>
          <td style="text-align:right; font-weight:700; color:var(--green);">${row.availableQty.toFixed(2)}</td>
          <td style="width:110px;">
            <input type="number" step="0.001" min="0" max="${row.availableQty}" value="${row.returnQty || ''}" ${!isAvailable ? 'disabled' : ''} class="form-input form-input-sm" style="text-align:right; font-weight:600;" oninput="window.ReturnsController.onReturnQtyChange(${idx}, this.value)" placeholder="0">
          </td>
          <td style="text-align:right; font-weight:700; color:var(--yellow);">${formatMoney(row.returnAmount)}</td>
          <td style="width:160px;">
            <input type="text" value="${row.reason || ''}" class="form-input form-input-sm" oninput="window.ReturnsController.onReturnReasonChange(${idx}, this.value)" placeholder="Reason" ${!isAvailable ? 'disabled' : ''}>
          </td>
        </tr>
      `;
    }).join('');

    recalcReturnTotals();
  }

  function toggleLineSelect(idx, isChecked) {
    const line = selectedReturnableLines[idx];
    if (!line) return;
    line.selected = isChecked;
    if (isChecked && line.returnQty <= 0 && line.availableQty > 0) {
      line.returnQty = line.availableQty;
    } else if (!isChecked) {
      line.returnQty = 0;
    }
    calcLineAmount(line);
    renderReturnableLines();
  }

  function toggleSelectAllLines(isChecked) {
    selectedReturnableLines.forEach(line => {
      if (line.availableQty > 0.0001) {
        line.selected = isChecked;
        line.returnQty = isChecked ? line.availableQty : 0;
        calcLineAmount(line);
      }
    });
    renderReturnableLines();
  }

  function onReturnQtyChange(idx, val) {
    const line = selectedReturnableLines[idx];
    if (!line) return;
    const qty = parseFloat(val) || 0;
    line.returnQty = Math.min(qty, line.availableQty);
    line.selected = line.returnQty > 0;
    calcLineAmount(line);
    renderReturnableLines();
  }

  function onReturnReasonChange(idx, val) {
    const line = selectedReturnableLines[idx];
    if (line) line.reason = val;
  }

  function calcLineAmount(line) {
    if (line.returnQty <= 0 || line.invoicedQty <= 0) {
      line.returnAmount = 0;
      return;
    }
    // Parity with ReturnEditorService.java:
    const raw = (line.lineTotal / line.invoicedQty) * line.returnQty;
    line.returnAmount = Math.round(raw * 100) / 100;
  }

  function recalcReturnTotals() {
    const selected = selectedReturnableLines.filter(l => l.selected && l.returnQty > 0);
    const total = selected.reduce((sum, l) => sum + l.returnAmount, 0);
    const countEl = document.getElementById('cr-selected-count');
    const totalEl = document.getElementById('cr-estimated-total');

    if (countEl) countEl.innerText = `${selected.length} item(s) selected`;
    if (totalEl) totalEl.innerText = formatMoney(total);
  }

  async function submitCreateReturn() {
    const invoiceNo = document.getElementById('cr-invoice-input')?.value?.trim();
    const returnDate = document.getElementById('cr-return-date')?.value;
    if (!invoiceNo) {
      alert('Invoice number is required.');
      return;
    }
    if (!returnDate) {
      alert('Return date is required.');
      return;
    }

    const selectedLines = selectedReturnableLines.filter(l => l.selected && l.returnQty > 0);
    if (selectedLines.length === 0) {
      alert('Please select at least one item to return with quantity greater than zero.');
      return;
    }

    for (const l of selectedLines) {
      if (!l.reason || !l.reason.trim()) {
        alert(`Please enter a return reason for ${l.description}`);
        return;
      }
    }

    const payload = {
      type: currentType,
      invoiceNo: invoiceNo,
      partyId: 0, // Auto-resolved by backend from invoice
      returnDate: returnDate,
      lines: selectedLines.map(l => ({
        code: l.code,
        sourceLineId: l.sourceLineId,
        quantity: l.returnQty,
        amount: l.returnAmount,
        reason: l.reason.trim()
      }))
    };

    const btnSubmit = document.getElementById('btn-submit-return');
    if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerText = 'Creating Return...'; }

    try {
      const res = await window.OperationsService.createReturn(payload);
      const newNo = res?.returnNo || 'Return';
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`${currentType} ${newNo} created successfully!`);
      closeModal('modal-create-return');
      loadReturns(currentType, 0);
    } catch (err) {
      console.error('Failed to create return:', err);
      alert('Failed to create return: ' + (err.message || 'Server error'));
    } finally {
      if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerText = 'Create Return'; }
    }
  }

  // 5. RECORD REFUND MODAL (DESKTOP ReturnRefundController.java PARITY)
  async function openRefundModal(returnNo) {
    const modal = document.getElementById('modal-record-refund');
    if (!modal) return;

    try {
      const details = await window.OperationsService.getReturnDetails(returnNo);
      const refunds = await window.OperationsService.getReturnRefunds(returnNo);

      document.getElementById('rf-return-no').value = details.no;
      document.getElementById('rf-party-name').value = details.party || '';
      document.getElementById('rf-invoice-no').innerText = details.invoice || '-';
      document.getElementById('rf-total-amount').innerText = formatMoney(details.total);
      document.getElementById('rf-already-refunded').innerText = formatMoney(details.refund);
      
      const balance = Math.max(0, (details.total || 0) - (details.refund || 0));
      document.getElementById('rf-balance-remaining').innerText = formatMoney(balance);
      document.getElementById('rf-amount').value = balance.toFixed(2);
      document.getElementById('rf-date').value = new Date().toISOString().substring(0, 10);
      document.getElementById('rf-reference').value = '';
      document.getElementById('rf-notes').value = '';

      // Populate Refund History Table
      renderRefundHistory(refunds);

      modal.style.display = 'flex';

    } catch (err) {
      console.error('Failed to open refund modal:', err);
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to load refund details: ' + err.message);
    }
  }

  function renderRefundHistory(refunds) {
    const tbody = document.getElementById('rf-history-body');
    if (!tbody) return;

    if (!refunds || refunds.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:var(--text-muted);">No prior refunds recorded for this return.</td></tr>`;
      return;
    }

    tbody.innerHTML = refunds.map(r => `
      <tr>
        <td>${formatDate(r.date)}</td>
        <td style="font-weight:600; color:var(--cyan);">${r.mode || 'Bank Transfer'}</td>
        <td>${r.reference || '-'}</td>
        <td>${r.bankAccount || '-'}</td>
        <td style="text-align:right; font-weight:700; color:var(--green);">${formatMoney(r.amount)}</td>
        <td>${getStatusBadge(r.status || 'RECORDED')}</td>
      </tr>
    `).join('');
  }

  async function submitRefund() {
    const returnNo = document.getElementById('rf-return-no')?.value;
    const amount = parseFloat(document.getElementById('rf-amount')?.value) || 0;
    const date = document.getElementById('rf-date')?.value;
    const mode = document.getElementById('rf-mode')?.value || 'Bank Transfer';
    const bankAccount = document.getElementById('rf-bank-account')?.value || '';
    const reference = document.getElementById('rf-reference')?.value?.trim() || '';
    const refundedParty = document.getElementById('rf-party-name')?.value?.trim() || '';
    const notes = document.getElementById('rf-notes')?.value?.trim() || '';
    const refundType = document.getElementById('rf-full-toggle')?.checked ? 'FULL' : 'PARTIAL';

    if (!returnNo) { alert('Return number is missing.'); return; }
    if (amount <= 0) { alert('Refund amount must be greater than zero.'); return; }
    if (!date) { alert('Refund date is required.'); return; }

    const payload = {
      date: date,
      amount: amount,
      mode: mode,
      reference: reference,
      bankAccount: bankAccount,
      refundedParty: refundedParty,
      notes: notes,
      refundType: refundType,
      createdBy: 'Admin'
    };

    const btn = document.getElementById('btn-submit-refund');
    if (btn) { btn.disabled = true; btn.innerText = 'Saving Refund...'; }

    try {
      await window.OperationsService.recordReturnRefund(returnNo, payload);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Refund of ${formatMoney(amount)} recorded for ${returnNo}!`);
      closeModal('modal-record-refund');
      loadReturns(currentType, currentPage);
      if (selectedReturn && selectedReturn.no === returnNo) showDetails(returnNo);
    } catch (err) {
      console.error('Failed to record refund:', err);
      alert('Failed to record refund: ' + (err.message || 'Server error'));
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = 'Record Refund'; }
    }
  }

  function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.style.display = 'none';
  }

  return {
    loadReturns,
    showDetails,
    closeDrawer,
    onRowClick,
    toggleActionMenu,
    approveReturn,
    rejectReturnPrompt,
    cancelReturn,
    deleteReturn,
    editReasonPrompt,
    downloadPdf,
    downloadExcel,
    sendEmailPrompt,
    viewOriginalDoc,
    openCreateReturnModal,
    loadReturnableLines,
    toggleLineSelect,
    toggleSelectAllLines,
    onReturnQtyChange,
    onReturnReasonChange,
    submitCreateReturn,
    openRefundModal,
    submitRefund,
    closeModal,
    setType(type) { currentType = type; },
    getType() { return currentType; },
    prevPage() { if (currentPage > 0) loadReturns(currentType, currentPage - 1); },
    nextPage() { if (currentPage < totalPages - 1) loadReturns(currentType, currentPage + 1); },
    resetFilters(isSales) {
      const s = document.getElementById(isSales ? 'sr-filter-search' : 'pr-filter-search'); if (s) s.value = '';
      const c = document.getElementById(isSales ? 'sret-filter-customer' : 'pr-filter-supplier'); if (c) c.value = '';
      const st = document.getElementById(isSales ? 'sr-filter-status' : 'pr-filter-status'); if (st) st.value = '';
      const f = document.getElementById(isSales ? 'sr-filter-from' : 'pr-filter-from'); if (f) f.value = '';
      const t = document.getElementById(isSales ? 'sr-filter-to' : 'pr-filter-to'); if (t) t.value = '';
      loadReturns(currentType, 0);
    }
  };
})();
