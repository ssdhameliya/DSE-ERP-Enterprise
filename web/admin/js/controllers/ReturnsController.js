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

  function initDateFilters(isSales) {
    const fromEl = document.getElementById(isSales ? 'sr-filter-from' : 'pr-filter-from');
    const toEl = document.getElementById(isSales ? 'sr-filter-to' : 'pr-filter-to');
    if (fromEl && !fromEl.value) {
      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      fromEl.value = sixMonthsAgo.toISOString().split('T')[0];
    }
    if (toEl && !toEl.value) {
      toEl.value = new Date().toISOString().split('T')[0];
    }
  }

  // 1. LOAD & RENDER RETURNS REGISTER
  async function loadReturns(type = 'SALES RETURN', page = 0) {
    currentType = type;
    currentPage = page;
    const isSales = currentType === 'SALES RETURN';
    initDateFilters(isSales);
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
      returnsList = Array.isArray(data) ? data : (data?.rows || []);
      totalRows = data?.totalRows || returnsList.length;
      totalPages = data?.totalPages || Math.max(1, Math.ceil(totalRows / pageSize));

      // Update KPI Cards matching SalesReturns.fxml
      try {
        applyKpis(data?.metrics, isSales);
      } catch (kpiErr) {
        console.warn('[ReturnsController] KPI parse warning:', kpiErr);
      }

      // Populate Party Filter if options empty
      try {
        populatePartyFilter(data?.parties, isSales);
      } catch (partyErr) {
        console.warn('[ReturnsController] Party filter parse warning:', partyErr);
      }

      // Render Table Rows (guaranteed execution)
      renderTable(returnsList, isSales);

      // Update Pagination Info
      updatePagination(isSales);

    } catch (err) {
      console.warn('[ReturnsController] Returns load fallback:', err);
      returnsList = [];
      totalRows = 0;
      totalPages = 1;
      renderTable([], isSales);
      updatePagination(isSales);
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);">
              <div style="font-size:1.8rem; margin-bottom:8px;">↩️</div>
              <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">No ${isSales ? 'sales' : 'purchase'} returns found</div>
              <div style="font-size:0.78rem; color:var(--text-dim); margin-top:4px;">Adjust filters or create a return from ${isSales ? 'Sales Register' : 'Purchase Register'}.</div>
            </td>
          </tr>
        `;
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
              <button class="btn-purple" onclick="window.ReturnsController.toggleActionMenu('${r.no}', event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                ::: Actions
              </button>
              <div id="action-menu-${r.no.replace(/[^a-zA-Z0-9]/g, '_')}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:210px; white-space:nowrap; padding:6px 0; text-align:left;">
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
    const isSales = currentType === 'SALES RETURN';
    const drawer = document.getElementById(isSales ? 'sr-detail-drawer' : 'pr-detail-drawer');
    if (drawer && (drawer.classList.contains('open') || drawer.style.display === 'flex') && selectedReturn && (selectedReturn.returnNo === no || selectedReturn.invoiceNo === no)) {
      closeDrawer();
      return;
    }
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

        const menuHeight = targetMenu.offsetHeight || 260;
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

  // 2. SIDE DRAWER DETAILS
  async function showDetails(no) {
    const isSales = currentType === 'SALES RETURN';
    const drawer = document.getElementById(isSales ? 'sr-detail-drawer' : 'pr-detail-drawer');
    if (!drawer) return;

    // Highlight selected row
    const tableId = isSales ? 'tbl-sales-returns-body' : 'tbl-purchase-returns-body';
    document.querySelectorAll(`#${tableId} tr.active-selected-row`).forEach(r => r.classList.remove('active-selected-row'));
    const rows = document.querySelectorAll(`#${tableId} tr`);
    rows.forEach(r => {
      const onclickAttr = r.getAttribute('onclick') || '';
      if (onclickAttr.includes(`'${no}'`)) {
        r.classList.add('active-selected-row');
      }
    });

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
    document.querySelectorAll('#tbl-sales-returns-body tr.active-selected-row, #tbl-purchase-returns-body tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    selectedReturn = null;
  }

  // Install escape listeners
  if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.RegisterUiSupport) {
        window.RegisterUiSupport.installEscapeClose('sr-detail-drawer', '#tbl-sales-returns-body', closeDrawer);
        window.RegisterUiSupport.installEscapeClose('pr-detail-drawer', '#tbl-purchase-returns-body', closeDrawer);
      }
    });
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

  function exportExcel(type) {
    const isSales = (type || currentType) === 'SALES RETURN';
    const typeCode = isSales ? 'SALES_RETURN' : 'PURCHASE_RETURN';
    if (window.AppDialogService) window.AppDialogService.toastInfo(`Exporting ${isSales ? 'Sales' : 'Purchase'} Returns register to Excel...`);
    const q = document.getElementById(isSales ? 'sr-filter-search' : 'pr-filter-search')?.value?.trim() || '';
    const party = document.getElementById(isSales ? 'sret-filter-customer' : 'pr-filter-supplier')?.value || '';
    const status = document.getElementById(isSales ? 'sr-filter-status' : 'pr-filter-status')?.value || '';
    const from = document.getElementById(isSales ? 'sr-filter-from' : 'pr-filter-from')?.value || '';
    const to = document.getElementById(isSales ? 'sr-filter-to' : 'pr-filter-to')?.value || '';
    const url = `/api/documents/export?type=${typeCode}&q=${encodeURIComponent(q)}&party=${encodeURIComponent(party)}&status=${encodeURIComponent(status)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=EXCEL`;
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

  let currentInvoicePartyId = 0;

  // 4. CREATE RETURN MODAL (DESKTOP ReturnEditorService.java PARITY)
  async function openCreateReturnModal(prefillInvoice = null, typeOverride = null) {
    if (typeOverride) currentType = typeOverride;
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
    const typeInput = document.getElementById('cr-type')?.value;
    if (typeInput) currentType = typeInput;

    const tbody = document.getElementById('cr-lines-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--text-muted);"><span class="loading-spinner"></span> Loading returnable items from invoice ${inv}...</td></tr>`;

    const isSales = currentType === 'SALES RETURN';
    try {
      // 1. Resolve exact source party ID so that backend validation (d.partyId() == expectedParty) succeeds
      currentInvoicePartyId = 0;
      if (isSales) {
        let sale = null;
        try { sale = await window.OperationsService.getSaleByInvoice(inv); } catch (_) {}
        if (!sale && window.SalesController && window.SalesController.sales) {
          sale = window.SalesController.sales.find(s => (s.invoiceNo || s.number) === inv);
        }
        if (sale) {
          currentInvoicePartyId = (sale.customer && sale.customer.id) || sale.customerId || 0;
        }
      } else {
        let pur = null;
        try { pur = await window.OperationsService.getPurchaseByInvoice(inv); } catch (_) {}
        if (!pur && window.PurchaseController && window.PurchaseController.purchases) {
          pur = window.PurchaseController.purchases.find(p => p.invoiceNo === inv);
        }
        if (pur) {
          currentInvoicePartyId = (pur.supplier && pur.supplier.id) || pur.supplierId || 0;
        }
      }

      let lines = [];
      try {
        lines = await window.OperationsService.getReturnableLines(currentType, inv);
      } catch (e) {
        console.warn('API getReturnableLines failed, falling back to source document:', e);
      }

      // Fallback: If returnable lines endpoint returned empty or failed, extract lines from source invoice
      if (!lines || lines.length === 0) {
        if (isSales) {
          const sale = await window.OperationsService.getSaleByInvoice(inv).catch(() => null);
          if (sale && sale.lines) {
            lines = sale.lines.map((l, i) => ({
              sourceLineId: l.id || i + 1,
              code: l.itemCode,
              description: l.itemDescription || l.description || l.itemCode,
              quantity: l.quantity,
              rate: l.rate,
              discountPercent: l.discountPercent || 0,
              taxPercent: l.gstPercent || 18,
              lineTotal: l.totalAmount || (l.quantity * l.rate),
              returnedQuantity: 0,
              returnedAmount: 0
            }));
          }
        } else {
          const pur = await window.OperationsService.getPurchaseByInvoice(inv).catch(() => null);
          if (pur && pur.lines) {
            lines = pur.lines.map((l, i) => ({
              sourceLineId: l.id || i + 1,
              code: l.itemCode,
              description: l.itemDescription || l.description || l.itemCode,
              quantity: l.quantity,
              rate: l.rate,
              discountPercent: l.discountPercent || 0,
              taxPercent: l.gstPercent || 18,
              lineTotal: l.totalAmount || (l.quantity * l.rate),
              returnedQuantity: 0,
              returnedAmount: 0
            }));
          }
        }
      }

      selectedReturnableLines = (lines || []).map(l => {
        const invoiced = parseFloat(l.quantity) || 0;
        const already = parseFloat(l.returnedQuantity) || 0;
        const avail = Math.max(0, invoiced - already);
        return {
          sourceLineId: l.sourceLineId || l.id,
          code: l.code || l.itemCode,
          description: l.description || l.itemDescription || l.code,
          invoicedQty: invoiced,
          alreadyReturnedQty: already,
          availableQty: avail,
          rate: parseFloat(l.rate) || 0,
          taxPercent: parseFloat(l.taxPercent || l.gstPercent) || 0,
          lineTotal: parseFloat(l.lineTotal || l.totalAmount) || 0,
          returnQty: 0,
          returnAmount: 0,
          reason: 'Return requested',
          selected: false
        };
      });

      renderReturnableLines();

    } catch (err) {
      console.error('Failed to load returnable lines:', err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--red);">⚠️ Could not load returnable items: ${err.message || 'Invoice not found or no items available'}</td></tr>`;
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

    // Update DOM row in-place without rebuilding table so user doesn't lose input focus!
    const tbody = document.getElementById('cr-lines-body');
    if (tbody && tbody.children[idx]) {
      const row = tbody.children[idx];
      const chk = row.querySelector('input[type="checkbox"]');
      if (chk) chk.checked = line.selected;
      if (row.cells && row.cells.length >= 8) {
        row.cells[7].innerText = formatMoney(line.returnAmount);
      }
    }
    recalcReturnTotals();
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

    // Verify partyId before sending to prevent server 400
    if (!currentInvoicePartyId || currentInvoicePartyId <= 0) {
      if (currentType === 'SALES RETURN') {
        const sale = await window.OperationsService.getSaleByInvoice(invoiceNo).catch(() => null);
        if (sale) currentInvoicePartyId = (sale.customer && sale.customer.id) || sale.customerId || 0;
      } else {
        const pur = await window.OperationsService.getPurchaseByInvoice(invoiceNo).catch(() => null);
        if (pur) currentInvoicePartyId = (pur.supplier && pur.supplier.id) || pur.supplierId || 0;
      }
    }

    if (!currentInvoicePartyId || currentInvoicePartyId <= 0) {
      alert('Could not resolve original customer/supplier ID for this invoice. Please refresh and try again.');
      return;
    }

    const payload = {
      type: currentType,
      invoiceNo: invoiceNo,
      partyId: currentInvoicePartyId,
      returnDate: returnDate,
      lines: selectedLines.map(l => ({
        code: l.code,
        sourceLineId: l.sourceLineId || null,
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
      if (window.NotificationService) {
        window.NotificationService.notifyReturn(newNo, payload.customerName || payload.supplierName || 'Party', payload.totalAmount || 0, currentType);
      }
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
  let activeRefundDetails = null;

  async function openRefundModal(returnNo) {
    const modal = document.getElementById('modal-return-refund');
    if (!modal) return;

    try {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      const details = await window.OperationsService.getReturnDetails(returnNo);
      activeRefundDetails = details;
      const isSales = (details.type || currentType) === 'SALES RETURN';

      // Set titles according to Return type
      const titleEl = document.getElementById('rr-modal-title');
      const subEl = document.getElementById('rr-modal-subtitle');
      const partyLabel = document.getElementById('rr-label-party');
      const amtLabel = document.getElementById('rr-label-amount');

      if (titleEl) titleEl.innerText = isSales ? 'Sales Return Refund Voucher' : 'Purchase Return Settlement Voucher';
      if (subEl) subEl.innerText = isSales ? 'Record outbound cash/bank refund paid to customer' : 'Record inward settlement receipt from supplier';
      if (partyLabel) partyLabel.innerText = isSales ? 'Refunded To (Customer) *' : 'Received From (Supplier) *';
      if (amtLabel) amtLabel.innerText = isSales ? 'Refund Amount Outflow (₹) *' : 'Settlement Amount Inflow (₹) *';

      // Metadata card
      const elNo = document.getElementById('rr-no'); if (elNo) elNo.innerText = details.no || returnNo;
      const elInv = document.getElementById('rr-invoice'); if (elInv) elInv.innerText = details.invoice || '-';
      const elParty = document.getElementById('rr-party-name'); if (elParty) elParty.innerText = details.party || '-';
      const elDate = document.getElementById('rr-date-display'); if (elDate) elDate.innerText = formatDate(details.date);

      // Amount progress
      const total = details.total || 0;
      const refunded = details.refund || 0;
      const balance = Math.max(0, total - refunded);

      const elTotal = document.getElementById('rr-total'); if (elTotal) elTotal.innerText = formatMoney(total);
      const elRefunded = document.getElementById('rr-refunded'); if (elRefunded) elRefunded.innerText = formatMoney(refunded);
      const elBalance = document.getElementById('rr-balance'); if (elBalance) elBalance.innerText = formatMoney(balance);

      // Default form values
      const dateInp = document.getElementById('rr-date'); if (dateInp) dateInp.value = new Date().toISOString().substring(0, 10);
      const partyInp = document.getElementById('rr-refunded-party'); if (partyInp) partyInp.value = details.party || '';
      const refInp = document.getElementById('rr-reference'); if (refInp) refInp.value = '';
      const notesInp = document.getElementById('rr-notes'); if (notesInp) notesInp.value = '';
      const proofInp = document.getElementById('rr-proof-file'); if (proofInp) proofInp.value = '';

      const scopeFull = document.getElementById('rr-scope-full');
      if (scopeFull) scopeFull.checked = true;

      const amtInp = document.getElementById('rr-amount');
      if (amtInp) {
        amtInp.value = balance.toFixed(2);
        amtInp.max = balance.toFixed(2);
      }

      updateRefundPreview();
      onRefundModeChange();

      // Load refund history
      await loadRefundHistory(returnNo);

      window.AppDialogService.openModal('modal-return-refund');

    } catch (err) {
      console.error('Failed to open refund modal:', err);
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to load refund details: ' + err.message);
    }
  }

  function onRefundModeChange() {
    const mode = document.getElementById('rr-mode')?.value || '';
    const bankSelect = document.getElementById('rr-bank-account');
    if (!bankSelect) return;
    const isBank = mode.toLowerCase().includes('bank') || mode === 'UPI' || mode === 'NEFT' || mode === 'RTGS';
    bankSelect.disabled = !isBank;
    if (!isBank) bankSelect.value = '';
  }

  function selectFullRefund() {
    if (!activeRefundDetails) return;
    const balance = Math.max(0, (activeRefundDetails.total || 0) - (activeRefundDetails.refund || 0));
    const amtInp = document.getElementById('rr-amount');
    if (amtInp) amtInp.value = balance.toFixed(2);
    updateRefundPreview();
  }

  function selectPartialRefund() {
    const amtInp = document.getElementById('rr-amount');
    if (amtInp) {
      amtInp.value = '';
      amtInp.focus();
    }
    updateRefundPreview();
  }

  function updateRefundPreview() {
    if (!activeRefundDetails) return;
    const balance = Math.max(0, (activeRefundDetails.total || 0) - (activeRefundDetails.refund || 0));
    const entered = parseFloat(document.getElementById('rr-amount')?.value) || 0;
    const after = Math.max(0, balance - entered);
    const afterEl = document.getElementById('rr-after-balance');
    if (afterEl) afterEl.innerText = formatMoney(after);
  }

  function resetRefundForm() {
    selectFullRefund();
    const refInp = document.getElementById('rr-reference'); if (refInp) refInp.value = '';
    const notesInp = document.getElementById('rr-notes'); if (notesInp) notesInp.value = '';
    const proofInp = document.getElementById('rr-proof-file'); if (proofInp) proofInp.value = '';
    onRefundModeChange();
  }

  async function loadRefundHistory(returnNo) {
    const tbody = document.getElementById('rr-history-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:12px; color:var(--text-muted);">Loading past settlements...</td></tr>`;

    try {
      const refunds = await window.OperationsService.getReturnRefunds(returnNo);
      if (!refunds || refunds.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:12px; color:var(--text-dim);">No previous refund vouchers recorded for this return.</td></tr>`;
        return;
      }
      tbody.innerHTML = refunds.map(r => `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td style="font-weight:600; color:var(--cyan);">#${r.id || '-'}</td>
          <td><span class="badge badge-paid">${r.mode || 'Bank'}</span></td>
          <td>${r.reference || '-'}</td>
          <td>${r.refundedParty || '-'}</td>
          <td style="text-align:right; font-weight:700; color:var(--green);">${formatMoney(r.amount)}</td>
          <td>
            ${r.attachment ? `
              <button type="button" class="btn btn-secondary" style="padding:2px 8px; font-size:0.72rem;" onclick="window.ReturnsController.downloadRefundProof(${r.id})">📎 Proof</button>
            ` : '—'}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:12px; color:var(--red);">Failed to load history: ${err.message}</td></tr>`;
    }
  }

  async function downloadRefundProof(refundId) {
    try {
      window.AppDialogService.toastInfo('Downloading settlement proof...');
      const blob = await window.ApiService.request(`/api/support/return-refunds/${refundId}/attachment-file`, { method: 'GET' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `refund-proof-${refundId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      window.AppDialogService.toastError('Failed to open proof: ' + err.message);
    }
  }

  async function saveRefund(event) {
    if (event) event.preventDefault();
    if (!activeRefundDetails) return;

    const returnNo = activeRefundDetails.no;
    const amount = parseFloat(document.getElementById('rr-amount')?.value) || 0;
    const date = document.getElementById('rr-date')?.value;
    const mode = document.getElementById('rr-mode')?.value || 'Bank Transfer';
    const bankAccount = document.getElementById('rr-bank-account')?.value || '';
    const reference = document.getElementById('rr-reference')?.value?.trim() || '';
    const refundedParty = document.getElementById('rr-refunded-party')?.value?.trim() || '';
    const notes = document.getElementById('rr-notes')?.value?.trim() || '';
    const refundType = document.getElementById('rr-scope-full')?.checked ? 'FULL' : 'PARTIAL';
    const proofFile = document.getElementById('rr-proof-file')?.files?.[0];

    if (!returnNo) { alert('Return number is missing.'); return; }
    if (amount <= 0) { alert('Refund amount must be greater than zero.'); return; }
    if (!date) { alert('Refund date is required.'); return; }

    const remaining = Math.max(0, (activeRefundDetails.total || 0) - (activeRefundDetails.refund || 0));
    if (amount > remaining + 0.01) {
      alert(`Refund amount (${formatMoney(amount)}) cannot exceed remaining balance of ${formatMoney(remaining)}.`);
      return;
    }

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

    const btn = document.getElementById('btn-save-return-refund');
    if (btn) { btn.disabled = true; btn.innerText = 'Saving Voucher...'; }

    try {
      const res = await window.OperationsService.recordReturnRefund(returnNo, payload);
      const refundId = res && res.id ? res.id : null;

      // Dual-step binary proof upload if attached
      if (proofFile && refundId) {
        window.AppDialogService.toastInfo(`Uploading proof file ${proofFile.name}...`);
        try {
          await window.ApiService.uploadBinary(`/api/support/return-refunds/${refundId}/attachment-file`, proofFile.name, proofFile);
        } catch (upErr) {
          console.warn('Proof upload failed, but refund was saved:', upErr);
        }
      }

      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Refund voucher of ${formatMoney(amount)} recorded for ${returnNo}!`);
      window.AppDialogService.closeModal('modal-return-refund');
      loadReturns(currentType, currentPage);
      if (selectedReturn && selectedReturn.no === returnNo) showDetails(returnNo);
    } catch (err) {
      console.error('Failed to record refund:', err);
      alert('Failed to record refund: ' + (err.message || 'Server error'));
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = '💾 Save & Record Refund'; }
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
    exportExcel,
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
    submitRefund: saveRefund,
    saveRefund,
    onRefundModeChange,
    selectFullRefund,
    selectPartialRefund,
    updateRefundPreview,
    resetRefundForm,
    downloadRefundProof,
    closeModal,
    setType(type) { currentType = type; },
    getType() { return currentType; },
    prevPage() { if (currentPage > 0) loadReturns(currentType, currentPage - 1); },
    nextPage() { if (currentPage < totalPages - 1) loadReturns(currentType, currentPage + 1); },
    resetFilters(isSales) {
      const s = document.getElementById(isSales ? 'sr-filter-search' : 'pr-filter-search'); if (s) s.value = '';
      const c = document.getElementById(isSales ? 'sret-filter-customer' : 'pr-filter-supplier'); if (c) c.value = '';
      const st = document.getElementById(isSales ? 'sr-filter-status' : 'pr-filter-status'); if (st) st.value = '';
      const f = document.getElementById(isSales ? 'sr-filter-from' : 'pr-filter-from');
      const t = document.getElementById(isSales ? 'sr-filter-to' : 'pr-filter-to');
      if (f) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        f.value = sixMonthsAgo.toISOString().split('T')[0];
      }
      if (t) {
        t.value = new Date().toISOString().split('T')[0];
      }
      loadReturns(currentType, 0);
    },
    initDateFilters
  };
})();
