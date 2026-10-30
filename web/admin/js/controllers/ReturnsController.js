/**
 * Jasvi Industries ERP - ReturnsController
 * 100% Desktop Parity with SalesReturnsController.java & ReturnRefundController.java
 * Manages Sales Returns & Purchase Returns, 12-action row menu, Slide Drawer, Approval Workflow, and Refund Ledger
 */
window.ReturnsController = (function () {
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
    if (window.FormatUtil && window.FormatUtil.formatDate) {
      return window.FormatUtil.formatDate(dStr);
    }
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

  function formatLocalDate(d) {
    if (!d) return '';
    if (window.FormatUtil && typeof window.FormatUtil.formatLocalDate === 'function') {
      return window.FormatUtil.formatLocalDate(d);
    }
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function initDateFilters(isSales) {
    const fromId = isSales ? 'sr-filter-from' : 'pr-filter-from';
    const toId = isSales ? 'sr-filter-to' : 'pr-filter-to';
    const fromEl = document.getElementById(fromId);
    const toEl = document.getElementById(toId);
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const fromVal = formatLocalDate(sixMonthsAgo);
    const toVal = formatLocalDate(now);

    if (fromEl) {
      if (!fromEl.value) fromEl.value = fromVal;
      if (window.DatePickerFormatter) {
        window.DatePickerFormatter.attach(fromEl);
        window.DatePickerFormatter.syncDisplay(fromEl);
      }
    }
    if (toEl) {
      if (!toEl.value) toEl.value = toVal;
      if (window.DatePickerFormatter) {
        window.DatePickerFormatter.attach(toEl);
        window.DatePickerFormatter.syncDisplay(toEl);
      }
    }
  }

  // 1. LOAD & RENDER RETURNS REGISTER
  async function loadReturns(type = 'SALES RETURN', page = 0) {
    currentType = type;
    currentPage = page;
    const isSales = currentType === 'SALES RETURN';
    initDateFilters(isSales);

    const containerId = isSales ? 'tbl-sales-returns-body' : 'tbl-purchase-returns-body';
    let tbody = document.getElementById(containerId);
    if (!tbody) {
      await new Promise(r => setTimeout(r, 60));
      tbody = document.getElementById(containerId);
    }
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-muted);"><span class="loading-spinner"></span> Loading ${isSales ? 'sales' : 'purchase'} returns from database...</td></tr>`;
    }

    const q = document.getElementById(isSales ? 'sr-filter-search' : 'pr-filter-search')?.value?.trim() || '';
    const party = document.getElementById(isSales ? 'sret-filter-customer' : 'pr-filter-supplier')?.value || '';
    const status = document.getElementById(isSales ? 'sr-filter-status' : 'pr-filter-status')?.value || '';
    let from = document.getElementById(isSales ? 'sr-filter-from' : 'pr-filter-from')?.value || '';
    let to = document.getElementById(isSales ? 'sr-filter-to' : 'pr-filter-to')?.value || '';

    if (!from) {
      const now = new Date();
      from = formatLocalDate(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()));
    }
    if (!to) {
      to = formatLocalDate(new Date());
    }

    try {
      const data = await window.OperationsService.getReturnsPage(currentType, currentPage, pageSize, q, party, status, from, to);
      returnsList = Array.isArray(data) ? data : (data?.rows || []);
      totalRows = data?.totalRows || returnsList.length;
      totalPages = data?.totalPages || Math.max(1, Math.ceil(totalRows / pageSize));

      // Resilient fallback: If paged query returned 0 rows and no specific text search was entered,
      // probe authoritative summary endpoint in case server-side date filter excluded records
      if (returnsList.length === 0 && !q && !party && !status && window.ApiService) {
        try {
          const allSummaries = await window.ApiService.get(`/api/returns?type=${encodeURIComponent(currentType)}`);
          if (Array.isArray(allSummaries) && allSummaries.length > 0) {
            console.info('[ReturnsController] Recovered ' + allSummaries.length + ' returns from authoritative summary endpoint');
            returnsList = allSummaries.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
            totalRows = allSummaries.length;
            totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
          }
        } catch (sumErr) {
          console.warn('[ReturnsController] Summary fallback notice:', sumErr);
        }
      }

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
  async let currentInspectionReturn = null;

  async function showDetails(no) {
    const modal = document.getElementById('modal-return-inspection');
    const overlay = document.getElementById('side-drawer-overlay');
    if (!modal) return;

    const isSales = currentType === 'SALES RETURN';

    // Toggle close if clicking already active return
    if (modal.classList.contains('open') && selectedReturn && (selectedReturn.no === no || selectedReturn.returnNo === no)) {
      closeInspectionModal();
      return;
    }

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

    if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();

    // 1. Initial quick render from memory cache
    let rObj = (returnsList || []).find(x => (x.no === no || x.returnNo === no)) || { no, returnNo: no };
    selectedReturn = rObj;
    currentInspectionReturn = rObj;
    populateReturnInspectionModal(rObj, isSales);

    // Switch to Tab 1 (Returned Lines)
    switchInspectionTab('lines');

    modal.style.display = 'flex';
    modal.classList.add('open');
    if (overlay) {
      overlay.style.display = 'block';
      overlay.style.pointerEvents = 'auto';
      overlay.classList.add('open');
    }

    // 2. Fetch full details with lines and settlements from server
    try {
      const details = await window.OperationsService.getReturnDetails(no);
      if (details && selectedReturn && (selectedReturn.no === no || selectedReturn.returnNo === no)) {
        selectedReturn = details;
        currentInspectionReturn = details;
        populateReturnInspectionModal(details, isSales);
      }
    } catch (e) {
      console.warn('Background return lines fetch error:', e);
    }
  }

  function populateReturnInspectionModal(r, isSales) {
    if (!r) return;

    const retNo = r.returnNo || r.no || '-';
    const origInv = r.invoice || r.invoiceNo || '-';
    const partyName = r.party || r.partyName || r.customer || r.supplier || 'Walk-in Party';

    // Header Hero
    const elKicker = document.getElementById('return-inspect-kicker');
    if (elKicker) elKicker.innerText = isSales ? 'SALES RETURN DOCUMENT' : 'PURCHASE RETURN DOCUMENT';

    const elNo = document.getElementById('return-inspect-no');
    if (elNo) elNo.innerText = retNo;

    const elMeta = document.getElementById('return-inspect-meta');
    if (elMeta) {
      const dStr = r.date ? formatDate(r.date) : '-';
      elMeta.innerText = `Return Date: ${dStr} • Linked Reference: ${origInv}`;
    }

    const elStatus = document.getElementById('return-inspect-doc-status');
    if (elStatus) {
      const st = (r.status || 'APPROVED').toUpperCase();
      elStatus.innerText = st;
      elStatus.className = `status-pill ${st === 'APPROVED' ? 'pill-success' : (st === 'PENDING APPROVAL' ? 'pill-warning' : 'pill-danger')}`;
    }

    const elSettleStatus = document.getElementById('return-inspect-settlement-status');
    if (elSettleStatus) {
      const refSt = (r.refundStatus || 'SETTLED').toUpperCase();
      elSettleStatus.innerText = refSt;
      elSettleStatus.className = `status-pill ${refSt === 'SETTLED' ? 'pill-success' : (refSt === 'PARTIAL' ? 'pill-warning' : 'pill-danger')}`;
    }

    // Card 1: Return Value
    const totalAmt = r.total != null ? r.total : (r.amount != null ? r.amount : 0);
    const approvedAmt = r.approvedAmount != null ? r.approvedAmount : totalAmt;
    const pendingAmt = r.pendingAmount != null ? r.pendingAmount : (r.refundStatus === 'SETTLED' ? 0 : totalAmt);

    const elTotal = document.getElementById('return-inspect-total');
    if (elTotal) elTotal.innerText = formatMoney(totalAmt);

    const elApproved = document.getElementById('return-inspect-approved-amt');
    if (elApproved) elApproved.innerText = formatMoney(approvedAmt);

    const elPending = document.getElementById('return-inspect-pending-amt');
    if (elPending) elPending.innerText = formatMoney(pendingAmt);

    // Card 2: Approval & Status
    const elApprState = document.getElementById('return-inspect-approval-state');
    if (elApprState) elApprState.innerText = (r.status || 'APPROVED').toUpperCase();

    const elRefMode = document.getElementById('return-inspect-refund-mode');
    if (elRefMode) elRefMode.innerText = r.refundMode || 'Credit Note / Ledger';

    const elRefState = document.getElementById('return-inspect-refund-state');
    if (elRefState) elRefState.innerText = (r.refundStatus || 'SETTLED').toUpperCase();

    // Card 3: Reference & Origin
    const elOrigInv = document.getElementById('return-inspect-orig-inv');
    if (elOrigInv) elOrigInv.innerText = origInv;

    const elDate = document.getElementById('return-inspect-date');
    if (elDate) elDate.innerText = r.date ? formatDate(r.date) : '-';

    const elParty = document.getElementById('return-inspect-party');
    if (elParty) elParty.innerText = partyName;

    // Tab 1: Returned Lines
    const tbody = document.getElementById('return-inspect-lines-tbody');
    const lines = r.lines || [];
    const countBadge = document.getElementById('return-inspect-lines-count');
    if (countBadge) countBadge.innerText = `${lines.length}`;

    if (tbody) {
      if (lines.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 14px;">No returned item lines recorded.</td></tr>`;
      } else {
        tbody.innerHTML = lines.map((l, idx) => `
          <tr>
            <td style="color: var(--text-dim);">${idx + 1}</td>
            <td style="font-weight: 600;">${l.name || l.itemDescription || l.description || l.itemCode || l.code || '-'}</td>
            <td style="font-family: monospace;">${l.hsnCode || l.hsn || '-'}</td>
            <td style="text-align: right;">${(parseFloat(l.quantity) || 1).toFixed(2)}</td>
            <td>${l.unit || 'PCS'}</td>
            <td style="text-align: right;">${formatMoney(l.rate || l.unitRate || 0)}</td>
            <td style="text-align: right;">${formatMoney(l.taxableAmount || (l.quantity * (l.rate || 0)))}</td>
            <td style="text-align: right;">${l.gstPercent || l.taxRate || 18}%</td>
            <td style="font-weight: 700; text-align: right; color: var(--yellow);">${formatMoney(l.amount || l.total || 0)}</td>
          </tr>
        `).join('');
      }
    }

    const elSummaryTotal = document.getElementById('return-inspect-summary-total');
    if (elSummaryTotal) elSummaryTotal.innerText = formatMoney(totalAmt);

    // Tab 2: Refunds & Settlements
    const elSettleBanner = document.getElementById('return-inspect-settle-banner');
    if (elSettleBanner) {
      elSettleBanner.innerText = (r.refundStatus || 'SETTLED').toUpperCase() === 'SETTLED' ? 'Fully Settled / Balanced' : 'Pending Settlement Allocation';
    }

    const refundsTbody = document.getElementById('return-inspect-refunds-tbody');
    if (refundsTbody) {
      const settlements = r.settlements || [];
      if (settlements.length === 0) {
        refundsTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 14px;">Direct refund / credit note allocated to party ledger.</td></tr>`;
      } else {
        refundsTbody.innerHTML = settlements.map((s, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${formatDate(s.date)}</td>
            <td style="font-family: monospace; font-weight: 600; color: var(--cyan);">${s.reference || s.voucherNo || '-'}</td>
            <td>${s.mode || 'LEDGER CREDIT'}</td>
            <td style="text-align: right; font-weight: 700; color: var(--green);">${formatMoney(s.amount)}</td>
            <td>${s.user || 'System'}</td>
          </tr>
        `).join('');
      }
    }

    // Tab 3: Notes & Origin
    const elReason = document.getElementById('return-inspect-reason');
    if (elReason) elReason.innerText = r.notes || r.reason || 'No specific reason provided.';

    const elSnapInv = document.getElementById('return-inspect-snap-inv');
    if (elSnapInv) elSnapInv.innerText = origInv;

    const elSnapDate = document.getElementById('return-inspect-snap-date');
    if (elSnapDate) elSnapDate.innerText = r.date ? formatDate(r.date) : '-';

    // Action Dock
    const isPending = (r.status || '').toUpperCase() === 'PENDING APPROVAL';
    const isApproved = (r.status || '').toUpperCase() === 'APPROVED';
    const approvalActions = document.getElementById('return-inspect-approval-actions');
    if (approvalActions) approvalActions.style.display = isPending ? 'flex' : 'none';

    const btnRefund = document.getElementById('dock-return-refund');
    if (btnRefund) {
      btnRefund.disabled = !isApproved;
      btnRefund.title = isApproved ? 'Record Refund' : 'Approval required first';
      btnRefund.style.opacity = isApproved ? '1' : '0.5';
    }
  }

  function switchInspectionTab(tabName) {
    const tabs = ['lines', 'refunds', 'notes'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-return-${t}`);
      const pane = document.getElementById(`pane-return-${t}`);
      if (btn) btn.classList.toggle('active', t === tabName);
      if (pane) pane.classList.toggle('active', t === tabName);
    });
  }

  function closeInspectionModal() {
    const modal = document.getElementById('modal-return-inspection');
    const overlay = document.getElementById('side-drawer-overlay');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
    if (overlay) {
      overlay.classList.remove('open');
      overlay.style.display = 'none';
    }
    document.querySelectorAll('#tbl-sales-returns-body tr.active-selected-row, #tbl-purchase-returns-body tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    selectedReturn = null;
    currentInspectionReturn = null;
  }

  function closeDrawer() {
    closeInspectionModal();
  }

  function copyReturnNo() {
    const r = currentInspectionReturn || selectedReturn;
    const no = r ? (r.returnNo || r.no) : '';
    if (!no) return;
    navigator.clipboard.writeText(no).then(() => {
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Copied return ${no} to clipboard`);
    });
  }

  function recordRefundFromInspection() {
    const r = currentInspectionReturn || selectedReturn;
    const no = r ? (r.returnNo || r.no) : '';
    if (!no) return;
    openRefundModal(no);
  }

  function printReturnPdf(no) {
    const r = currentInspectionReturn || selectedReturn;
    const targetNo = no || (r ? (r.returnNo || r.no) : '');
    if (!targetNo) return;
    downloadPdf(targetNo);
  }

  function exportReturnExcel(no) {
    const r = currentInspectionReturn || selectedReturn;
    const targetNo = no || (r ? (r.returnNo || r.no) : '');
    if (!targetNo) return;
    downloadExcel(targetNo);
  }

  function approveCurrentReturn() {
    const r = currentInspectionReturn || selectedReturn;
    const no = r ? (r.returnNo || r.no) : '';
    if (!no) return;
    approveReturn(no);
  }

  function rejectCurrentReturn() {
    const r = currentInspectionReturn || selectedReturn;
    const no = r ? (r.returnNo || r.no) : '';
    if (!no) return;
    rejectReturnPrompt(no);
  }

  function viewOriginalInvoiceFromInspection() {
    const r = currentInspectionReturn || selectedReturn;
    const inv = r ? (r.invoice || r.invoiceNo) : '';
    if (!inv) return;
    closeInspectionModal();
    viewOriginalDoc(inv);
  }

  // 3. WORKFLOW ACTIONS: APPROVE, REJECT, CANCEL, DELETE, EDIT REASON
  async function approveReturn(no) {
    let confirmed = false;
    const msg = `Approve Return ${no}?\n\nApproval posts the Return stock movement and starts the Return settlement period.`;
    if (window.AppDialogService && typeof window.AppDialogService.confirm === 'function') {
      confirmed = await window.AppDialogService.confirm('Approve Return', 'Post Return Stock Movement', msg, 'Approve Return', 'Cancel');
    } else {
      confirmed = confirm(msg);
    }
    if (!confirmed) return;
    try {
      await window.OperationsService.approveReturn(no);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Return ${no} approved successfully!`);
      loadReturns(currentType, currentPage);
      if (selectedReturn && selectedReturn.no === no) showDetails(no);
      window.SalesController?.loadSales?.();
      window.PurchaseController?.loadPurchases?.();
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.toastError('Approval failed: ' + err.message);
    }
  }

  async function rejectReturnPrompt(no) {
    let reason = null;
    const promptMsg = `Enter rejection reason for Return ${no}:`;
    if (window.AppDialogService && typeof window.AppDialogService.prompt === 'function') {
      reason = await window.AppDialogService.prompt('Reject Return', `Return Document • ${no}`, promptMsg, 'Goods condition not matching return policy');
    } else {
      reason = prompt(promptMsg);
    }
    if (reason === null) return;
    try {
      await window.OperationsService.rejectReturn(no, reason);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Return ${no} rejected.`);
      loadReturns(currentType, currentPage);
      if (selectedReturn && selectedReturn.no === no) showDetails(no);
      window.SalesController?.loadSales?.();
      window.PurchaseController?.loadPurchases?.();
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.toastError('Rejection failed: ' + err.message);
    }
  }

  async function cancelReturn(no) {
    let confirmed = false;
    const msg = `Cancel Return ${no} and reverse its stock movement?`;
    if (window.AppDialogService && typeof window.AppDialogService.confirm === 'function') {
      confirmed = await window.AppDialogService.confirm('Cancel Return', 'Reverse Stock Movement', msg, 'Cancel Return', 'Keep Return');
    } else {
      confirmed = confirm(msg);
    }
    if (!confirmed) return;
    try {
      await window.OperationsService.cancelReturn(no, currentType === 'SALES RETURN');
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Return ${no} cancelled successfully.`);
      loadReturns(currentType, currentPage);
      closeDrawer();
      window.SalesController?.loadSales?.();
      window.PurchaseController?.loadPurchases?.();
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.toastError('Cancellation failed: ' + err.message);
    }
  }

  async function deleteReturn(no) {
    let confirmed = false;
    const msg = `Delete Return ${no} from the register?\n\nActive return stock movement will be safely reversed and audit trail preserved.`;
    if (window.AppDialogService && typeof window.AppDialogService.destructive === 'function') {
      confirmed = await window.AppDialogService.destructive('Delete Return', 'Permanent Deletion', msg, 'Delete Return', 'Cancel');
    } else {
      confirmed = confirm(msg);
    }
    if (!confirmed) return;
    try {
      await window.OperationsService.deleteReturn(no, currentType === 'SALES RETURN');
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Return ${no} deleted from register.`);
      loadReturns(currentType, currentPage);
      closeDrawer();
      window.SalesController?.loadSales?.();
      window.PurchaseController?.loadPurchases?.();
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.toastError('Deletion failed: ' + err.message);
    }
  }

  async function editReasonPrompt(no, currentReason) {
    const newReason = await (window.AppDialogService && typeof window.AppDialogService.prompt === 'function'
      ? window.AppDialogService.prompt('Edit Reason', `Return • ${no}`, `Edit return reason for ${no}:`, currentReason || '')
      : Promise.resolve(prompt(`Edit return reason for ${no}:`, currentReason || '')));
    if (newReason === null || typeof newReason !== 'string' || newReason.trim() === currentReason) return;
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

  function openReturnPrintModal(ret, lines, isSales) {
    const printContainer = document.getElementById('printable-invoice-content') || document.getElementById('printable-invoice-modal');
    const modal = document.getElementById('printable-invoice-modal');
    if (!printContainer || !modal) {
      window.print();
      return;
    }

    const title = isSales ? 'CREDIT NOTE / SALES RETURN' : 'DEBIT NOTE / PURCHASE RETURN';
    const partyLabel = isSales ? 'CUSTOMER DETAILS' : 'SUPPLIER DETAILS';
    const rowsHtml = (lines || []).map((l, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 6px 8px; text-align: left;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-weight: 600;">${l.itemDescription || l.description || l.itemCode || '-'}</td>
        <td style="padding: 6px 8px; text-align: right;">${l.quantity || 1} ${l.unit || ''}</td>
        <td style="padding: 6px 8px; text-align: right;">₹ ${(Number(l.rate) || 0).toFixed(2)}</td>
        <td style="padding: 6px 8px; text-align: left;">${l.reason || ret.reason || '-'}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 700;">₹ ${(Number(l.totalAmount || (l.quantity * l.rate)) || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    printContainer.innerHTML = `
      <div class="tax-invoice-sheet" style="font-family: 'Inter', sans-serif; padding: 24px; color: #111827; background: #fff;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid ${isSales ? '#ef4444' : '#f59e0b'}; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 20px; font-weight: 800; color: #111827; letter-spacing: 0.5px;">JASVI INDUSTRIES</div>
            <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">Precision Fasteners, High-Tensile Bolts &amp; Industrial Stainless Steel Piping</div>
            <div style="font-size: 11px; color: #4b5563;">H-52 Darshan Villa Society, New Naroda, Ahmedabad - 382346, Gujarat</div>
            <div style="font-size: 11px; font-weight: 700; margin-top: 2px;">GSTIN: <span style="font-family: monospace;">24AAACJ1234F1Z1</span> | State: Gujarat (24)</div>
          </div>
          <div style="text-align: right;">
            <span style="background: ${isSales ? '#ef4444' : '#f59e0b'}; color: #fff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">${title}</span>
            <div style="font-size: 14px; font-weight: 800; margin-top: 6px; color: #111827;">RETURN NOTE</div>
            <div style="font-size: 12px; font-weight: 700;">Return #: ${ret.no || ''}</div>
            <div style="font-size: 11px; color: #4b5563;">Date: ${window.FormatUtil ? window.FormatUtil.formatDate(ret.date) : ret.date}</div>
            <div style="font-size: 11px; color: #4b5563;">Original Bill #: ${ret.originalDocNo || '-'}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px;">
            <div style="font-size: 10px; font-weight: 700; color: #374151; text-transform: uppercase; margin-bottom: 4px;">${partyLabel}</div>
            <div style="font-size: 12px; font-weight: 700; color: #111827;">${ret.partyName || ret.customer || ret.supplier || '-'}</div>
            <div style="font-size: 11px; color: #4b5563;"><strong>Return Type:</strong> ${isSales ? 'Sales Return' : 'Purchase Return'}</div>
            <div style="font-size: 11px; color: #4b5563;"><strong>Status:</strong> ${ret.status || 'DRAFT'}</div>
          </div>
          <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px;">
            <div style="font-size: 10px; font-weight: 700; color: #374151; text-transform: uppercase; margin-bottom: 4px;">REASON &amp; SETTLEMENT</div>
            <div style="font-size: 11px; color: #4b5563;"><strong>Primary Reason:</strong> ${ret.reason || 'Material return'}</div>
            <div style="font-size: 11px; color: #4b5563;"><strong>Original Doc:</strong> ${ret.originalDocNo || 'Not Linked'}</div>
            <div style="font-size: 11px; color: #4b5563;"><strong>Settlement:</strong> ${ret.settled ? 'Settled' : 'Pending'}</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px;">
          <thead>
            <tr style="background: #f3f4f6; border-top: 1px solid #d1d5db; border-bottom: 1px solid #d1d5db;">
              <th style="padding: 6px 8px; text-align: left; width: 30px;">#</th>
              <th style="padding: 6px 8px; text-align: left;">Item Description</th>
              <th style="padding: 6px 8px; text-align: right; width: 80px;">Return Qty</th>
              <th style="padding: 6px 8px; text-align: right; width: 90px;">Rate (₹)</th>
              <th style="padding: 6px 8px; text-align: left; width: 140px;">Line Reason</th>
              <th style="padding: 6px 8px; text-align: right; width: 100px;">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="text-align:center; padding:12px; color:#6b7280;">No line items recorded.</td></tr>'}
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
          <div style="min-width: 250px; border-top: 2px solid #374151; padding-top: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; color: #111827;">
              <span>Total Return Value:</span>
              <span>₹ ${(Number(ret.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 28px; padding-top: 14px; border-top: 1px dashed #d1d5db;">
          <div style="font-size: 9px; color: #6b7280;">This is an authorized return voucher for inventory &amp; accounts reversal.</div>
          <div style="text-align: right;">
            <div style="font-size: 10px; font-weight: 700;">For, JASVI INDUSTRIES</div>
            <div style="margin-top: 36px; font-size: 9px; color: #374151;">Authorized Signatory</div>
          </div>
        </div>

        <div class="no-print" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn btn-secondary" onclick="document.getElementById('printable-invoice-modal').classList.remove('open')">Close Preview</button>
          <button class="btn btn-primary" onclick="window.print()">🖨️ Print Return Voucher</button>
        </div>
      </div>
    `;

    modal.classList.add('open');
  }

  async function downloadPdf(no) {
    const isSales = currentType === 'SALES RETURN';
    const typeCode = isSales ? 'SALES_RETURN' : 'PURCHASE_RETURN';
    if (window.AppDialogService) window.AppDialogService.toastInfo(`Downloading ${currentType} PDF for ${no}...`);
    try {
      if (window.ApiService && typeof window.ApiService.downloadDocumentPdf === 'function') {
        await window.ApiService.downloadDocumentPdf(typeCode, no);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Downloaded ${no}.pdf`);
        return;
      }
    } catch (serverErr) {
      console.warn('[ReturnsController] Server PDF render failed, falling back to client generator:', serverErr);
    }

    // Client-side fallback
    try {
      let ret = (returnsList || []).find(r => r.no === no) || selectedReturn;
      let lines = [];
      try {
        const res = await window.OperationsService.getReturnDetails(no, isSales);
        const details = res?.data || res || {};
        if (details && details.no) ret = details;
        lines = details.lines || [];
      } catch (_) {}

      if (window.DocumentPdfGenerator && typeof window.DocumentPdfGenerator.generateReturnPdf === 'function') {
        window.DocumentPdfGenerator.generateReturnPdf(ret, lines, isSales, 'download');
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Return voucher ${no} downloaded.`);
      } else if (ret) {
        openReturnPrintModal(ret, lines, isSales);
      } else {
        window.print();
      }
    } catch (err) {
      console.warn('Could not prepare return print view:', err);
      window.print();
    }
  }

  async function downloadExcel(no) {
    if (window.AppDialogService) window.AppDialogService.toastInfo(`Generating Excel export for ${no}...`);
    const isSales = currentType === 'SALES RETURN';
    const typeCode = isSales ? 'SALES_RETURN' : 'PURCHASE_RETURN';
    try {
      if (window.ApiService && typeof window.ApiService.downloadDocumentExcel === 'function') {
        await window.ApiService.downloadDocumentExcel(typeCode, no);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Downloaded ${typeCode}_${no}.xlsx`);
        return;
      }
    } catch (serverErr) {
      console.warn('[ReturnsController] Server Excel render failed, falling back to client generator:', serverErr);
    }

    // Client-side fallback
    try {
      let ret = (returnsList || []).find(r => r.no === no) || selectedReturn;
      let lines = [];
      try {
        const res = await window.OperationsService.getReturnDetails(no, isSales);
        const details = res?.data || res || {};
        if (details && details.no) ret = details;
        lines = details.lines || [];
      } catch (_) {}

      if (window.DocumentExcelGenerator && typeof window.DocumentExcelGenerator.generateReturnWorkbook === 'function') {
        window.DocumentExcelGenerator.generateReturnWorkbook(ret, lines, isSales);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Return ${no} exported to Excel.`);
      } else {
        throw new Error('Excel generator unavailable');
      }
    } catch (e) {
      console.error('downloadExcel error:', e);
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to export Excel: ' + (e.message || 'Error'));
    }
  }

  function exportExcel(type) {
    const isSales = (type || currentType) === 'SALES RETURN';
    const typeCode = isSales ? 'SALES_RETURN' : 'PURCHASE_RETURN';
    const title = isSales ? 'Sales Returns Register' : 'Purchase Returns Register';
    if (!returnsList || returnsList.length === 0) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('No return records found to export.');
      return;
    }
    const headers = ['Return #', 'Date', isSales ? 'Customer' : 'Supplier', 'Original Doc #', 'Amount (₹)', 'Reason', 'Status', 'Settled'];
    const rows = returnsList.map(r => [
      r.no,
      window.FormatUtil ? window.FormatUtil.formatDate(r.date) : r.date,
      r.partyName || r.customer || r.supplier || '',
      r.originalDocNo || '-',
      r.amount || 0,
      r.reason || '',
      r.status || '',
      r.settled ? 'YES' : 'NO'
    ]);

    if (window.DocumentExcelGenerator && typeof window.DocumentExcelGenerator.generateRegisterWorkbook === 'function') {
      window.DocumentExcelGenerator.generateRegisterWorkbook(rows, title, headers, `${typeCode}_Register`);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Exported ${returnsList.length} returns to Excel.`);
    } else if (window.XLSX) {
      const ws = window.XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, `${typeCode} Register`);
      window.XLSX.writeFile(wb, `${typeCode}_Register_${new Date().toISOString().substring(0, 10)}.xlsx`);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Exported ${returnsList.length} returns to Excel.`);
    }
  }

  async function sendEmailPrompt(no) {
    const isSales = currentType === 'SALES RETURN';
    const typeCode = isSales ? 'SALES_RETURN' : 'PURCHASE_RETURN';
    let ret = (returnsList || []).find(r => r.no === no || r.returnNo === no) || selectedReturn || { no, returnNo: no };
    if (window.SalesController && typeof window.SalesController.openEmailModal === 'function') {
      window.SalesController.openEmailModal(no, typeCode, ret);
      return;
    }
    let email = null;
    if (window.AppDialogService && typeof window.AppDialogService.prompt === 'function') {
      email = await window.AppDialogService.prompt(`Send Return ${no} to email address:`, 'accounts@party.com');
    }
    if (!email) return;
    if (window.AppDialogService) window.AppDialogService.toastInfo(`Preparing and sending ${currentType} ${no} to ${email}...`);

    let attachmentBase64 = null;
    try {
      if (window.ApiService && typeof window.ApiService.fetchDocumentBlob === 'function') {
        const blob = await window.ApiService.fetchDocumentBlob(typeCode, no, 'PDF');
        attachmentBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result;
            const b64 = dataUrl.split(',')[1];
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (blobErr) {
      console.warn('[ReturnsController] Server PDF fetch for email failed, trying client generator:', blobErr);
    }

    if (!attachmentBase64 && window.DocumentPdfGenerator && typeof window.DocumentPdfGenerator.generateReturnPdf === 'function') {
      try {
        let ret = (returnsList || []).find(r => r.no === no) || selectedReturn;
        let lines = [];
        try {
          const res = await window.OperationsService.getReturnDetails(no, isSales);
          const details = res?.data || res || {};
          if (details && details.no) ret = details;
          lines = details.lines || [];
        } catch (_) {}
        attachmentBase64 = window.DocumentPdfGenerator.generateReturnPdf(ret, lines, isSales, 'base64');
      } catch (genErr) {
        console.warn('[ReturnsController] Client PDF generation failed:', genErr);
      }
    }

    window.OperationsService.sendAuthorityEmail({
      recipient: email,
      recipientEmail: email,
      subject: `${currentType} ${no} - Jasvi Industries`,
      body: `Dear Partner,\n\nPlease find attached ${currentType} note ${no}.\n\nBest regards,\nJasvi Industries ERP Studio`,
      documentType: typeCode,
      documentNumber: no,
      attachmentName: `${isSales ? 'Sales_Return_Credit_Note' : 'Purchase_Return_Debit_Note'}_${no.replace(/[^A-Za-z0-9]/g, '_')}.pdf`,
      attachmentBase64: attachmentBase64
    }).then(() => {
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Email sent to ${email}`);
    }).catch(err => {
      console.error('Email error:', err);
      let errMsg = err.message || 'Server error';
      if (errMsg.includes('temporarily unavailable') || errMsg.includes('SMTP')) {
        errMsg = 'Email delivery unavailable: SMTP Mail Gateway is not configured. Please configure SMTP in Settings Studio.';
      }
      if (window.AppDialogService) window.AppDialogService.toastError(errMsg);
      else alert(errMsg);
    });
  }

  async function isolateReturn(ref, isSales = true) {
    const searchId = isSales ? 'sr-filter-search' : 'pr-filter-search';
    const searchEl = document.getElementById(searchId);
    if (searchEl) {
      searchEl.value = ref || '';
    }
    const partyEl = document.getElementById(isSales ? 'sret-filter-customer' : 'pr-filter-supplier');
    if (partyEl) partyEl.value = '';
    const statusEl = document.getElementById(isSales ? 'sr-filter-status' : 'pr-filter-status');
    if (statusEl) statusEl.value = '';

    await loadReturns(isSales ? 'SALES RETURN' : 'PURCHASE RETURN', 0);

    const found = (returnsList || []).find(r => (r.no || r.returnNo || '').toUpperCase() === (ref || '').toUpperCase());
    if (found) {
      setTimeout(() => {
        showDetails(found.no || found.returnNo);
      }, 150);
    }
  }


  async function sendWhatsappPrompt(no) {
    const isSales = currentType === 'SALES RETURN';
    const ret = (returnsList || []).find(r => r.no === no) || selectedReturn;
    const phone = ret?.phone || ret?.contactPersonMobile || '';
    const mobile = await (window.AppDialogService && typeof window.AppDialogService.prompt === 'function'
      ? window.AppDialogService.prompt('WhatsApp Share', `${currentType} • ${no}`, `Send ${currentType} ${no} via WhatsApp to number (with country code):`, phone, '+91 9999999999')
      : Promise.resolve(prompt(`Send ${currentType} ${no} via WhatsApp to number (with country code):`, phone)));
    if (!mobile || typeof mobile !== 'string') return;
    const clean = mobile.replace(/\D/g, '');
    const num = clean.length === 10 ? '91' + clean : clean;
    const partyName = ret?.partyName || ret?.party || ret?.customer || ret?.supplier || 'Valued Partner';
    const amountStr = ret?.amount ? formatMoney(ret.amount) : '';
    const msg = encodeURIComponent(`Hello ${partyName},\n\nPlease find details for ${currentType} Note ${no}${amountStr ? ' of ' + amountStr : ''} from Jasvi Industries.\n\nThank you.`);
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  }

  function viewOriginalDoc(docNo) {
    if (!docNo || docNo === '-') {
      alert('Original document number not recorded on this return.');
      return;
    }
    if (currentType === 'SALES RETURN') {
      window.NavigationRouter.selectNav('view-sales-register');
      const search = document.getElementById('sr-search-input') || document.getElementById('sales-search-input');
      if (search) {
        search.value = docNo;
        if (window.SalesController && window.SalesController.loadSales) {
          window.SalesController.loadSales();
        }
      }
    } else {
      window.NavigationRouter.selectNav('view-purchase-register');
      const purSearch = document.getElementById('pur-filter-search');
      if (purSearch) {
        purSearch.value = docNo;
        if (window.PurchaseController && window.PurchaseController.loadPurchases) {
          window.PurchaseController.loadPurchases(0);
        }
      }
    }
  }

  function showAudit(returnNo) {
    const no = returnNo || (selectedReturn && selectedReturn.no) || (document.getElementById(currentType === 'SALES RETURN' ? 'sr-detail-no' : 'pr-detail-no')?.innerText);
    if (!no || no === '-' || no === 'Return Details') {
      if (window.AppDialogService && window.AppDialogService.toastWarning) {
        window.AppDialogService.toastWarning('Please select a return first');
      } else {
        alert('Please select a return first');
      }
      return;
    }
    const isSales = currentType === 'SALES RETURN';
    if (window.AppDialogService && typeof window.AppDialogService.showActivityTimeline === 'function') {
      window.AppDialogService.showActivityTimeline(isSales ? 'SALES_RETURN' : 'PURCHASE_RETURN', null, no);
    } else if (window.SalesController && typeof window.SalesController.openAuditTrail === 'function') {
      window.SalesController.openAuditTrail(no);
    }
  }

  let currentInvoicePartyId = 0;

  // 4. CREATE RETURN MODAL (DESKTOP ReturnEditorService.java PARITY)
  async function openCreateReturnModal(prefillInvoice = null, typeOverride = null) {
    if (window.SalesController && typeof window.SalesController.closeInvoiceDrawer === 'function') {
      window.SalesController.closeInvoiceDrawer();
    }
    if (window.PurchaseController && typeof window.PurchaseController.closePurchaseDrawer === 'function') {
      window.PurchaseController.closePurchaseDrawer();
    }
    closeDrawer();
    if (typeOverride) currentType = typeOverride;

    const modal = document.getElementById('modal-create-return');
    if (modal) {
      modal.style.zIndex = '100060';
      modal.classList.add('active');
      modal.style.display = 'flex';
    }
    if (window.AppDialogService && typeof window.AppDialogService.openModal === 'function') {
      window.AppDialogService.openModal('modal-create-return');
    }

    const isSales = currentType === 'SALES RETURN';
    const titleEl = document.getElementById('modal-create-return-title');
    if (titleEl) titleEl.innerText = isSales ? 'Create Sales Return' : 'Create Purchase Return';
    const typeEl = document.getElementById('cr-type');
    if (typeEl) typeEl.value = currentType;

    const retDateEl = document.getElementById('cr-return-date');
    if (retDateEl) {
      retDateEl.value = formatLocalDate(new Date());
      if (window.DatePickerFormatter) {
        window.DatePickerFormatter.attach(retDateEl);
        window.DatePickerFormatter.syncDisplay(retDateEl);
      }
    }

    const textInput = document.getElementById('cr-invoice-input');
    if (textInput) textInput.value = prefillInvoice || '';

    const linesBody = document.getElementById('cr-lines-body');
    if (linesBody) linesBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--text-muted);">Select or enter an invoice number to load returnable line items.</td></tr>';

    const estTotal = document.getElementById('cr-estimated-total');
    if (estTotal) estTotal.innerText = '₹ 0.00';
    const selCount = document.getElementById('cr-selected-count');
    if (selCount) selCount.innerText = '0 items selected';

    // Populate searchable select dropdown immediately from cache (0ms delay)
    const select = document.getElementById('cr-invoice-select');
    if (select) {
      let cachedOrders = [];
      if (isSales && window.SalesController) {
        cachedOrders = window.SalesController.salesCache || window.SalesController.sales || [];
      } else if (!isSales && window.PurchaseController) {
        cachedOrders = (window.PurchaseController.getPurchasesCache && window.PurchaseController.getPurchasesCache()) || window.PurchaseController.purchases || [];
      }

      let optionsHtml = '<option value="">-- Select ' + (isSales ? 'Paid Tax Invoice' : 'Supplier Bill') + ' --</option><option value="__MANUAL__">-- Type or Paste Invoice Number --</option>';
      const seen = new Set();
      if (prefillInvoice) {
        optionsHtml += '<option value="' + prefillInvoice + '" selected>' + prefillInvoice + ' (Selected)</option>';
        seen.add(prefillInvoice);
      }

      cachedOrders.forEach(o => {
        const invNo = o.invoiceNo || o.billNo || (isSales ? ('INV-' + o.id) : ('BILL-' + o.id));
        if (!invNo || seen.has(invNo)) return;
        seen.add(invNo);
        const party = (o.customer && o.customer.name) || (o.supplier && o.supplier.name) || o.partyName || o.customerName || o.supplierName || 'Party';
        const amt = formatMoney(o.totalAmount || o.total || 0);
        const isSel = prefillInvoice && invNo === prefillInvoice;
        optionsHtml += '<option value="' + invNo + '" ' + (isSel ? 'selected' : '') + '>' + invNo + ' - ' + party + ' (' + amt + ')</option>';
      });

      select.innerHTML = optionsHtml;
      if (prefillInvoice) select.value = prefillInvoice;

      // In the background, fetch remote orders if cache was empty or for fresh sync without wiping options
      (async () => {
        try {
          let remoteOrders = [];
          if (isSales && window.OperationsService && window.OperationsService.getSalesPage) {
            const res = await window.OperationsService.getSalesPage(0, 100);
            remoteOrders = (res && (res.rows || res.content || (Array.isArray(res) ? res : []))) || [];
          } else if (!isSales && window.OperationsService && window.OperationsService.getPurchasesPage) {
            const res = await window.OperationsService.getPurchasesPage(0, 100);
            remoteOrders = (res && (res.rows || res.content || (Array.isArray(res) ? res : []))) || [];
          }
          if (remoteOrders.length > 0) {
            remoteOrders.forEach(o => {
              const invNo = o.invoiceNo || o.billNo || (isSales ? ('INV-' + o.id) : ('BILL-' + o.id));
              if (!invNo || seen.has(invNo)) return;
              seen.add(invNo);
              const party = (o.customer && o.customer.name) || (o.supplier && o.supplier.name) || o.partyName || o.customerName || o.supplierName || 'Party';
              const amt = formatMoney(o.totalAmount || o.total || 0);
              const opt = document.createElement('option');
              opt.value = invNo;
              opt.textContent = invNo + ' - ' + party + ' (' + amt + ')';
              select.appendChild(opt);
            });
          }
        } catch (remoteErr) {
          console.warn('[ReturnsController] Remote orders fetch fallback:', remoteErr);
        }
      })();
    }

    if (prefillInvoice) {
      await loadReturnableLines(prefillInvoice);
    }
  }

  function toggleInvoiceInputMode(manual) {
    const sel = document.getElementById('cr-invoice-select');
    const inp = document.getElementById('cr-invoice-input');
    const btn = document.getElementById('btn-toggle-inv-mode');
    const isManual = manual !== undefined ? manual : (inp && inp.style.display === 'none');
    if (isManual) {
      if (sel) sel.style.display = 'none';
      if (inp) {
        inp.style.display = 'block';
        inp.focus();
      }
      if (btn) btn.innerText = 'Select from List';
    } else {
      if (inp) inp.style.display = 'none';
      if (sel) sel.style.display = 'block';
      if (btn) btn.innerText = 'Type Manual #';
    }
  }

  async function onInvoiceSelectChanged(invNo) {
    if (invNo === '__MANUAL__') {
      toggleInvoiceInputMode(true);
      return;
    }
    const textInput = document.getElementById('cr-invoice-input');
    if (textInput) textInput.value = invNo || '';
    if (invNo) {
      await loadReturnableLines(invNo);
    } else {
      const tbody = document.getElementById('cr-lines-body');
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--text-muted);">Select or enter an invoice number to load returnable line items.</td></tr>`;
      document.getElementById('cr-estimated-total').innerText = '₹ 0.00';
      document.getElementById('cr-selected-count').innerText = '0 items selected';
    }
  }

  async function loadReturnableLines(invoiceNo = null) {
    let inv = invoiceNo;
    if (!inv || inv === '__MANUAL__') {
      const inp = document.getElementById('cr-invoice-input');
      const sel = document.getElementById('cr-invoice-select');
      if (inp && inp.style.display !== 'none' && inp.value.trim()) {
        inv = inp.value.trim();
      } else if (sel && sel.value && sel.value !== '__MANUAL__') {
        inv = sel.value.trim();
      } else if (inp && inp.value.trim()) {
        inv = inp.value.trim();
      }
    }
    if (!inv || inv === '__MANUAL__') {
      if (window.AppDialogService && window.AppDialogService.toastWarning) {
        window.AppDialogService.toastWarning('Please enter or select an invoice number.');
      } else {
        alert('Please enter or select an invoice number.');
      }
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
      let cachedDoc = null;
      if (isSales) {
        if (window.SalesController) {
          if (window.SalesController.currentDrawerSale && (window.SalesController.currentDrawerSale.invoiceNo === inv || window.SalesController.currentDrawerSale.number === inv)) {
            cachedDoc = window.SalesController.currentDrawerSale;
          } else {
            const sList = window.SalesController.salesCache || window.SalesController.sales || [];
            cachedDoc = sList.find(s => (s.invoiceNo || s.number) === inv);
          }
        }
        if (!cachedDoc) {
          try { cachedDoc = await window.OperationsService.getSaleByInvoice(inv); } catch (_) { }
        }
        if (cachedDoc) {
          currentInvoicePartyId = (cachedDoc.customer && cachedDoc.customer.id) || cachedDoc.customerId || 0;
        }
      } else {
        if (window.PurchaseController) {
          if (window.PurchaseController.currentDrawerPurchase && (window.PurchaseController.currentDrawerPurchase.invoiceNo === inv || window.PurchaseController.currentDrawerPurchase.billNo === inv)) {
            cachedDoc = window.PurchaseController.currentDrawerPurchase;
          } else {
            const pList = (window.PurchaseController.getPurchasesCache && window.PurchaseController.getPurchasesCache()) || window.PurchaseController.purchases || [];
            cachedDoc = pList.find(p => (p.invoiceNo || p.billNo) === inv);
          }
        }
        if (!cachedDoc) {
          try { cachedDoc = await window.OperationsService.getPurchaseByInvoice(inv); } catch (_) { }
        }
        if (cachedDoc) {
          currentInvoicePartyId = (cachedDoc.supplier && cachedDoc.supplier.id) || cachedDoc.supplierId || 0;
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
          const sale = cachedDoc || await window.OperationsService.getSaleByInvoice(inv).catch(() => null);
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
      window.SalesController?.loadSales?.();
      window.PurchaseController?.loadPurchases?.();
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
    closeDrawer();
    const modal = document.getElementById('modal-return-refund');
    if (!modal) return;
    modal.style.zIndex = '100060';
    modal.classList.add('active');

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
      const dateInp = document.getElementById('rr-date'); if (dateInp) dateInp.value = formatLocalDate(new Date());
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

      // Populate dynamic lookups from MasterService
      try {
        const modeEl = document.getElementById('rr-mode');
        if (modeEl && window.MasterService) {
          const modes = await window.MasterService.getLookupValues('PAYMENT_MODE');
          const modeList = (modes && modes.length > 0) ? modes : ['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'Card', 'NEFT', 'RTGS', 'Other'];
          const currentMode = modeEl.value || 'Bank Transfer';
          modeEl.innerHTML = modeList.map(m => `<option value="${m}" ${m === currentMode ? 'selected' : ''}>${m}</option>`).join('');
        }
        const bankEl = document.getElementById('rr-bank-account');
        if (bankEl && window.MasterService) {
          const accounts = await window.MasterService.getLookups('BANK_ACCOUNT');
          const acctList = Array.isArray(accounts) ? accounts.filter(a => a.active !== false) : [];
          bankEl.innerHTML = acctList.length > 0
            ? acctList.map(a => `<option value="${a.lookupValue}">${a.lookupValue}${a.description ? ' - ' + a.description : ''}</option>`).join('')
            : '<option value="">Default Operating Bank</option>';
        }
      } catch (lkErr) {
        console.warn('Could not populate refund lookups:', lkErr);
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
    const mode = (document.getElementById('rr-mode')?.value || '').toLowerCase();
    const bankSelect = document.getElementById('rr-bank-account');
    if (!bankSelect) return;
    const isBank = mode.includes('bank') || mode === 'neft' || mode === 'rtgs';
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

  function toggleRefundRowActionMenu(id, event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById(`refund-row-menu-${id}`);
    document.querySelectorAll('.action-dropdown-menu').forEach(m => {
      if (m !== menu) m.style.display = 'none';
    });
    if (menu) {
      const isVisible = menu.style.display === 'block';
      if (isVisible) {
        menu.style.display = 'none';
      } else {
        menu.style.display = 'block';
        menu.style.position = 'fixed';
        const rect = event.target.getBoundingClientRect();
        menu.style.top = `${rect.bottom + 4}px`;
        menu.style.left = `${Math.max(10, rect.right - 180)}px`;
        const close = (e) => {
          if (!menu.contains(e.target)) {
            menu.style.display = 'none';
            document.removeEventListener('click', close);
          }
        };
        document.addEventListener('click', close);
      }
    }
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
      tbody.innerHTML = refunds.map(r => {
        const hasProof = !!r.attachment;
        const isBankRecon = (r.refundType || '').toUpperCase() === 'BANK_RECONCILIATION';
        return `
          <tr>
            <td>${formatDate(r.date)}</td>
            <td style="font-weight:600; color:var(--cyan);">#${r.id || '-'}</td>
            <td><span class="badge badge-paid">${r.mode || 'Bank'}</span></td>
            <td>${r.reference || '-'}</td>
            <td>${r.refundedParty || '-'}</td>
            <td style="text-align:right; font-weight:700; color:var(--green);">${formatMoney(r.amount)}</td>
            <td style="text-align:center;">
              <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
                <button type="button" class="btn-purple" onclick="window.ReturnsController.toggleRefundRowActionMenu(${r.id}, event)" style="padding:2px 8px; font-size:0.72rem; cursor:pointer;">
                  ::: Actions
                </button>
                <div id="refund-row-menu-${r.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100025; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:180px; padding:4px 0; text-align:left;">
                  ${hasProof ? `
                    <div class="action-menu-item" style="padding:6px 12px; cursor:pointer;" onclick="window.ReturnsController.downloadRefundProof(${r.id})">👁 Preview Proof</div>
                    ${!isBankRecon ? `<div class="action-menu-item" style="color:var(--red); padding:6px 12px; cursor:pointer;" onclick="window.ReturnsController.removeRefundProof(${r.id})">🗑 Remove Proof</div>` : ''}
                  ` : `<div class="action-menu-item" style="opacity:0.5; cursor:default; padding:6px 12px;">📄 No Proof Attached</div>`}
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:12px; color:var(--red);">Failed to load history: ${err.message}</td></tr>`;
    }
  }

  async function removeRefundProof(refundId) {
    let confirmed = false;
    if (window.AppDialogService && typeof window.AppDialogService.confirm === 'function') {
      confirmed = await window.AppDialogService.confirm('Remove Refund Proof', 'Proof Removal', 'Remove the saved proof from this refund?', 'Remove', 'Cancel');
    } else {
      confirmed = confirm('Remove the saved proof from this refund?');
    }
    if (!confirmed) return;

    try {
      await window.ApiService.delete(`/api/support/return-refunds/${refundId}/attachment-file`);
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Refund proof removed successfully.');
      if (activeRefundDetails) await loadRefundHistory(activeRefundDetails.no);
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to remove proof: ' + err.message);
      else alert('Failed to remove proof: ' + err.message);
    }
  }

  async function downloadRefundProof(refundId) {
    try {
      if (window.ApiService && typeof window.ApiService.viewFile === 'function') {
        const url = `/api/support/return-refunds/${refundId}/attachment-file`;
        await window.ApiService.viewFile(url, `refund_proof_${refundId}.pdf`);
      } else {
        const token = localStorage.getItem('dse_access_token');
        const url = `/api/support/return-refunds/${refundId}/attachment-file`;
        const res = await fetch(url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error(`Download failed with status ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      }
    } catch (err) {
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to open proof: ' + err.message);
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

    if (!returnNo) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('Return number is missing.');
      return;
    }
    if (amount <= 0) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('Refund amount must be greater than zero.');
      return;
    }
    if (!date) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('Refund date is required.');
      return;
    }
    if (proofFile && proofFile.size > 25 * 1024 * 1024) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('Attachment is larger than 25 MB.');
      return;
    }

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
      window.SalesController?.loadSales?.();
      window.PurchaseController?.loadPurchases?.();
    } catch (err) {
      console.error('Failed to record refund:', err);
      alert('Failed to record refund: ' + (err.message || 'Server error'));
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = '💾 Save & Record Refund'; }
    }
  }

  function closeModal(modalId) {
    if (window.AppDialogService && typeof window.AppDialogService.closeModal === 'function') {
      window.AppDialogService.closeModal(modalId);
    } else {
      const m = document.getElementById(modalId);
      if (m) {
        m.style.display = 'none';
        m.classList.remove('active');
      }
    }
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
    sendWhatsappPrompt,
    isolateReturn,
    viewOriginalDoc,
    showAudit,
    openCreateReturnModal,
    onInvoiceSelectChanged,
    toggleInvoiceInputMode,
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
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        f.value = formatLocalDate(sixMonthsAgo);
      }
      if (t) {
        t.value = formatLocalDate(new Date());
      }
      loadReturns(currentType, 0);
    },
    initDateFilters
  };
})();
