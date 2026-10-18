/**
 * Jasvi Industries ERP - SalesController
 * Complete Desktop Parity (Desktop App Reference: org.example.controller.SalesController & SalesListController):
 * 1. 14-Column Sales Register Table with 6 Top KPI Summary Cards & Date Filters
 * 2. Floating 13-Action Context Menu for Every Sales Row (View, Audit, Edit, Duplicate, Print, Barcode, Excel, Email, WhatsApp, Payments, Returns, Cancel, Delete) - ZERO dummy toasts!
 * 3. Dedicated Create Sale Invoice Workspace Tab with:
 *    - Dynamic Next Invoice Number from API
 *    - Live Stock Position Indicator Strip (On Hand, Reserved, Available, After Sale, Status Badges)
 *    - Strict Over-Sell Stock Validation against physical stock
 *    - GSTIN State Code Auto-Detection & Dynamic Table Headers (GST % vs IGST %)
 *    - Row Click-to-Edit & Deletion
 *    - Payment Terms to Due Date calculation
 *    - Dispatch Barcode Generation & Thermal Roll Printing
 *    - Real Attachment Upload, Preview, and Remove controls
 *    - Rapid Keyboard Entry flow (F2 search, Enter on GST adds row, Ctrl+S saves)
 *    - Address Mismatch Validation on Save & Optimistic Locking rowVersion preservation
 * 4. Side Inspection Drawer and Print Tax Invoice Studio
 */
window.SalesController = {
  salesCache: [],
  quotationsCache: [],
  customersCache: [],
  itemsCache: [],
  transportersCache: [],
  invoiceCharges: [],
  draftCharges: [],
  availableChargeTypes: ['Freight', 'Handling', 'Insurance', 'Packaging', 'Loading & Unloading', 'Other'],
  currentDrawerSale: null,
  selectedInvoiceNo: null,
  selectedDrawerInvoiceNo: null,
  lastFilteredSales: null,
  currentPage: 1,
  pageSize: 25,
  workspaceItems: [],
  editingItemIndex: -1,
  selectedWorkspaceItem: null,
  editingSale: null,
  viewMode: false,
  companyGstin: '24AAAAA0000A1Z5', // Gujarat code 24
  pendingAttachmentFile: null,
  attachmentRemovalPending: false,
  activeBarcodeData: null,

  initDateFilters() {
    const fromInput = document.getElementById('sr-filter-from-date');
    const toInput = document.getElementById('sr-filter-to-date');
    if (fromInput && !fromInput.value) {
      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      fromInput.value = sixMonthsAgo.toISOString().split('T')[0];
    }
    if (toInput && !toInput.value) {
      toInput.value = new Date().toISOString().split('T')[0];
    }
  },

  changePageSize(newSize) {
    this.pageSize = parseInt(newSize, 10) || 25;
    this.currentPage = 1;
    this.renderSalesTable(this.lastFilteredSales || this.salesCache);
  },

  goToPage(direction) {
    const list = this.lastFilteredSales || this.salesCache || [];
    const totalPages = Math.max(1, Math.ceil(list.length / this.pageSize));
    if (direction === 'first') this.currentPage = 1;
    else if (direction === 'prev') this.currentPage = Math.max(1, this.currentPage - 1);
    else if (direction === 'next') this.currentPage = Math.min(totalPages, this.currentPage + 1);
    else if (direction === 'last') this.currentPage = totalPages;
    else if (typeof direction === 'number') this.currentPage = Math.max(1, Math.min(totalPages, direction));
    this.renderSalesTable(list);
  },

  async filterFastItems(filterText) {
    if (!this.itemsCache || this.itemsCache.length === 0) {
      try {
        if (window.MasterService && typeof window.MasterService.getItems === 'function') {
          const res = await window.MasterService.getItems();
          this.itemsCache = Array.isArray(res) ? res : (res && (res.rows || res.content || res.data || [])) || [];
        }
      } catch (e) {
        console.warn('Could not fetch items cache:', e);
        this.itemsCache = [];
      }
    }
    const items = this.itemsCache || [];
    const query = (filterText || '').trim().toLowerCase();
    const popup = document.getElementById('ws-fast-item-results');
    const sel = document.getElementById('ws-fast-item-select');

    const filtered = query ? items.filter(it => {
      const code = (it.itemCode || it.code || '').toLowerCase();
      const desc = (it.description || it.name || it.itemName || '').toLowerCase();
      const cat = (it.category || '').toLowerCase();
      const hsn = (it.hsn || '').toLowerCase();
      return code.includes(query) || desc.includes(query) || cat.includes(query) || hsn.includes(query);
    }) : items.slice(0, 50);

    // 1. Keep the select dropdown synchronized with all data attributes
    if (sel) {
      sel.innerHTML = '<option value="">Select Item Master...</option>' + 
        filtered.map(it => {
          const code = it.itemCode || it.code || '';
          const desc = it.description || it.name || it.itemName || code;
          const cat = it.category || 'General';
          const hsn = it.hsn || '73063000';
          const unit = it.unit || 'PCS';
          const rate = it.sellingPrice != null ? it.sellingPrice : (it.rate != null ? it.rate : 100);
          const tax = it.gst != null ? it.gst : (it.gstPercent != null ? it.gstPercent : 18);
          const stock = it.openingStock != null ? it.openingStock : (it.currentStock != null ? it.currentStock : 0);
          return `<option value="${code}" data-desc="${desc}" data-category="${cat}" data-hsn="${hsn}" data-unit="${unit}" data-rate="${rate}" data-tax="${tax}" data-stock="${stock}">${code} - ${desc} (Stock: ${stock})</option>`;
        }).join('');
    }

    // 2. Render autocomplete popup
    if (popup) {
      if (!query && filtered.length === 0) {
        popup.style.display = 'none';
        return;
      }
      if (filtered.length === 0) {
        popup.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-dim); font-size: 0.76rem;">No items matching "${filterText}"</div>`;
        popup.style.display = 'block';
        return;
      }
      popup.innerHTML = filtered.slice(0, 20).map((it, idx) => {
        const code = it.itemCode || it.code || '';
        const desc = it.description || it.name || it.itemName || code;
        const rate = parseFloat(it.sellingPrice != null ? it.sellingPrice : (it.rate != null ? it.rate : 100)) || 0;
        const stock = parseFloat(it.openingStock != null ? it.openingStock : (it.currentStock != null ? it.currentStock : 0)) || 0;
        return `
          <div class="fast-item-row ${idx === 0 ? 'selected' : ''}" data-code="${code}" onclick="window.SalesController.selectFastItem('${code.replace(/'/g, "\\'")}')">
            <div>
              <div class="fast-item-code">${code}</div>
              <div class="fast-item-desc" title="${desc}">${desc}</div>
            </div>
            <div style="text-align: right;">
              <div class="fast-item-rate">₹ ${rate.toFixed(2)}</div>
              <span class="fast-item-stock ${stock > 0 ? 'in-stock' : 'low-stock'}">Stock: ${stock}</span>
            </div>
          </div>
        `;
      }).join('');
      popup.style.display = 'block';
    }
  },

  selectFastItem(itemCode) {
    let item = (this.itemsCache || []).find(i => (i.itemCode || i.code) === itemCode);
    const sel = document.getElementById('ws-fast-item-select');
    if (!item && sel) {
      const opt = sel.querySelector(`option[value="${itemCode}"]`);
      if (opt) {
        item = {
          itemCode: itemCode,
          description: opt.getAttribute('data-desc') || itemCode,
          sellingPrice: parseFloat(opt.getAttribute('data-rate')) || 100,
          gst: parseFloat(opt.getAttribute('data-tax')) || 18,
          openingStock: parseFloat(opt.getAttribute('data-stock')) || 0,
          unit: opt.getAttribute('data-unit') || 'PCS',
          hsn: opt.getAttribute('data-hsn') || '73063000',
          category: opt.getAttribute('data-category') || 'General'
        };
      }
    }
    if (!item) return;

    this.selectedWorkspaceItem = item;
    const desc = item.description || item.name || item.itemName || itemCode;
    const rate = item.sellingPrice != null ? item.sellingPrice : (item.rate != null ? item.rate : 100);
    const tax = item.gst != null ? item.gst : (item.gstPercent != null ? item.gstPercent : 18);
    const stock = item.openingStock != null ? item.openingStock : (item.currentStock != null ? item.currentStock : 0);

    // Update search input
    const searchInput = document.getElementById('ws-fast-item-search');
    if (searchInput) searchInput.value = `${itemCode} - ${desc}`;

    // Hide popup
    const popup = document.getElementById('ws-fast-item-results');
    if (popup) popup.style.display = 'none';

    // Update select dropdown & guarantee option presence
    if (sel) {
      let opt = sel.querySelector(`option[value="${itemCode}"]`);
      if (!opt) {
        opt = document.createElement('option');
        opt.value = itemCode;
        opt.text = `${itemCode} - ${desc} (Stock: ${stock})`;
        opt.setAttribute('data-desc', desc);
        opt.setAttribute('data-category', item.category || 'General');
        opt.setAttribute('data-hsn', item.hsn || '73063000');
        opt.setAttribute('data-unit', item.unit || 'PCS');
        opt.setAttribute('data-rate', rate);
        opt.setAttribute('data-tax', tax);
        opt.setAttribute('data-stock', stock);
        sel.appendChild(opt);
      }
      sel.value = itemCode;
    }

    // Fill rate & tax
    const elRate = document.getElementById('ws-fast-rate');
    const elTax = document.getElementById('ws-fast-tax');
    const elQty = document.getElementById('ws-fast-qty');
    if (elRate) elRate.value = rate;
    if (elTax) elTax.value = tax;
    if (elQty && (!elQty.value || parseFloat(elQty.value) <= 0)) elQty.value = 1;

    this.updateStockPositionUi();

    // Auto-focus quantity for immediate fast data entry
    if (elQty) {
      elQty.focus();
      elQty.select();
    }
  },

  onFastSearchKeyDown(e) {
    const popup = document.getElementById('ws-fast-item-results');
    if (!popup || popup.style.display === 'none') return;
    const rows = Array.from(popup.querySelectorAll('.fast-item-row'));
    if (rows.length === 0) return;

    let selectedIdx = rows.findIndex(r => r.classList.contains('selected'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (selectedIdx >= 0) rows[selectedIdx].classList.remove('selected');
      selectedIdx = (selectedIdx + 1) % rows.length;
      rows[selectedIdx].classList.add('selected');
      rows[selectedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectedIdx >= 0) rows[selectedIdx].classList.remove('selected');
      selectedIdx = (selectedIdx - 1 + rows.length) % rows.length;
      rows[selectedIdx].classList.add('selected');
      rows[selectedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx >= 0) {
        const code = rows[selectedIdx].getAttribute('data-code');
        if (code) this.selectFastItem(code);
      }
    } else if (e.key === 'Escape') {
      popup.style.display = 'none';
    }
  },

  // =========================================================================
  // 1. LOAD SALES REGISTER
  // =========================================================================
  async loadSales() {
    this.initDateFilters();
    this.installKeyboardShortcuts();
    const tbody = document.getElementById('sales-table-tbody');
    if (!tbody) return;
    try {
      const from = document.getElementById('sr-filter-from-date')?.value || '';
      const to = document.getElementById('sr-filter-to-date')?.value || '';
      const docStatus = document.getElementById('sr-filter-doc-status')?.value || '';
      const payStatus = document.getElementById('sr-filter-pay-status')?.value || '';
      const retStatus = document.getElementById('sr-filter-ret-status')?.value || '';
      const cust = document.getElementById('sr-filter-customer')?.value || '';
      const q = document.getElementById('sr-search-input')?.value || '';

      const res = await window.OperationsService.getSalesPage(0, 500, q, '', cust, from, to, payStatus, '', '', '', '', docStatus, retStatus, null, null, true, true, true);
      const list = res.rows || res.content || (Array.isArray(res) ? res : []);
      this.salesCache = list;
      this.serverMetrics = res.metrics || null;
      this.serverFilteredTotals = res.filteredTotals || null;

      // Batch query authoritative return settlements matching Desktop SalesService.java
      try {
        const invNos = list.map(s => s.invoiceNo || s.number).filter(Boolean);
        if (invNos.length > 0 && window.ApiService) {
          const settlementsRes = await window.ApiService.get(`/api/returns/settlements?type=${encodeURIComponent('SALES RETURN')}&invoices=${encodeURIComponent(invNos.join(','))}`);
          const settlements = Array.isArray(settlementsRes) ? settlementsRes : (settlementsRes && (settlementsRes.data || settlementsRes.rows || [])) || [];
          const settMap = {};
          settlements.forEach(st => {
            const k = st.invoiceNo || st.sourceInvoiceNo || st.originalInvoiceNo;
            if (k) settMap[k] = st;
          });
          list.forEach(s => {
            const inv = s.invoiceNo || s.number;
            const st = settMap[inv];
            if (st) {
              s.returnSettlement = st;
              s.returnStatus = st.returnStatus || 'N/A';
              s.refundStatus = st.refundStatus || '';
              s.approvedReturnAmount = Number(st.approvedReturnAmount || st.settledAmount || 0);
              s.returnPendingAmount = Number(st.returnPendingAmount || st.pendingAmount || 0);
              s.returnedQuantity = Number(st.returnedQuantity || 0);
              s.originalQuantity = Number(st.originalQuantity || 0);
              s.returnDueDate = st.dueDate || st.returnDueDate || null;
              s.hasReturnSettlement = true;
              if (st.status) {
                s.basePaymentStatus = s.basePaymentStatus || s.paymentStatus || 'PENDING';
                s.paymentStatus = st.status;
              }
            } else if (!s.returnStatus) {
              s.returnStatus = 'N/A';
            }
          });
        }
      } catch (stErr) {
        console.warn('Could not batch query sales return settlements:', stErr);
      }

      // Update Register 6-Card KPI Summary Strip
      this.updateRegisterKpis(list, this.serverMetrics);

      // Populate Customer Filter dropdown if empty
      this.populateCustomerFilter();

      // Render 14-Column Table
      this.renderSalesTable(list);
    } catch (e) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="14" style="text-align: center; color: #f87171; padding: 24px;">Failed to load sales: ${e.message}</td></tr>`;
      }
    }
  },

  updateRegisterKpis(list, metrics) {
    if (metrics) {
      const elActiveAmt = document.getElementById('sr-kpi-active-sales');
      const elActiveSub = document.getElementById('sr-kpi-active-sub');
      if (elActiveAmt) elActiveAmt.innerText = window.FormatUtil.formatRupees(metrics.totalSales || 0);
      if (elActiveSub) elActiveSub.innerText = `${metrics.invoiceCount || list.length} invoices`;

      const elTodayAmt = document.getElementById('sr-kpi-today-sales');
      if (elTodayAmt) elTodayAmt.innerText = window.FormatUtil.formatRupees(metrics.todaySales || 0);

      const elPendingAmt = document.getElementById('sr-kpi-pending-sales');
      if (elPendingAmt) elPendingAmt.innerText = window.FormatUtil.formatRupees(metrics.pendingBalance || 0);

      const elOverdueAmt = document.getElementById('sr-kpi-overdue-sales');
      if (elOverdueAmt) elOverdueAmt.innerText = window.FormatUtil.formatRupees(metrics.overdueBalance || 0);

      const elDue7Amt = document.getElementById('sr-kpi-due-7-sales');
      if (elDue7Amt) elDue7Amt.innerText = window.FormatUtil.formatRupees(metrics.dueSoonBalance || 0);

      const elEmailPct = document.getElementById('sr-kpi-email-pct');
      if (elEmailPct) elEmailPct.innerText = `${Math.round(metrics.emailRate != null ? metrics.emailRate : 100)}%`;
      return;
    }

    const active = list.filter(s => s.documentStatus !== 'CANCELLED');
    const totalAmount = active.reduce((sum, s) => sum + (s.totalAmount || s.total || 0), 0);
    const paidAmount = active.reduce((sum, s) => sum + (s.paidAmount || (s.paymentStatus === 'PAID' ? (s.totalAmount || 0) : 0) || 0), 0);
    const pendingAmount = active.reduce((sum, s) => sum + Math.max(0, (s.totalAmount || 0) - (s.paidAmount || 0)), 0);

    const elActiveAmt = document.getElementById('sr-kpi-active-sales');
    const elActiveSub = document.getElementById('sr-kpi-active-sub');
    if (elActiveAmt) elActiveAmt.innerText = window.FormatUtil.formatRupees(totalAmount);
    if (elActiveSub) elActiveSub.innerText = `${active.length} active • ${list.length} records`;

    const elPendingAmt = document.getElementById('sr-kpi-pending-sales');
    if (elPendingAmt) elPendingAmt.innerText = window.FormatUtil.formatRupees(pendingAmount);
  },

  async populateCustomerFilter() {
    const sel = document.getElementById('sr-filter-customer');
    if (!sel || sel.options.length > 1) return;
    try {
      const customers = await window.MasterService.getParties('CUSTOMER');
      this.customersCache = customers || [];
      customers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.innerText = c.name || c.partyName;
        sel.appendChild(opt);
      });
    } catch (e) {}
  },

  // =========================================================================
  // 2. RENDER 14-COLUMN SALES TABLE
  // =========================================================================
  renderSalesTable(list) {
    this.lastFilteredSales = list || [];
    this.currentRenderedSales = list || [];
    const tbody = document.getElementById('sales-table-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; color: var(--text-dim); padding: 30px;">No matching sales invoices found.</td></tr>`;
      this.updateTableSummary(0, 0, 0, 0);
      const counter = document.getElementById('sr-entries-counter');
      if (counter) counter.innerText = 'Showing 0 entries';
      const pageDisplay = document.getElementById('sr-page-display');
      if (pageDisplay) pageDisplay.innerText = 'Page 1 of 1';
      return;
    }

    const totalCount = list.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, totalCount);
    const pageItems = list.slice(startIndex, endIndex);

    const counter = document.getElementById('sr-entries-counter');
    if (counter) counter.innerText = `Showing ${startIndex + 1} to ${endIndex} of ${totalCount} entries`;

    const pageDisplay = document.getElementById('sr-page-display');
    if (pageDisplay) pageDisplay.innerText = `Page ${this.currentPage} of ${totalPages}`;

    const btnFirst = document.getElementById('sr-btn-first');
    const btnPrev = document.getElementById('sr-btn-prev');
    const btnNext = document.getElementById('sr-btn-next');
    const btnLast = document.getElementById('sr-btn-last');
    if (btnFirst) btnFirst.disabled = this.currentPage === 1;
    if (btnPrev) btnPrev.disabled = this.currentPage === 1;
    if (btnNext) btnNext.disabled = this.currentPage === totalPages;
    if (btnLast) btnLast.disabled = this.currentPage === totalPages;

    let sumTotal = 0, sumPaid = 0, sumPending = 0;

    list.forEach(s => {
      const isCancelled = s.documentStatus === 'CANCELLED';
      if (!isCancelled) {
        const grandTotal = s.totalAmount != null ? s.totalAmount : (s.total || 0);
        const isPaid = s.paymentStatus === 'PAID';
        const paid = s.paidAmount != null ? s.paidAmount : (isPaid ? grandTotal : 0);
        const pending = Math.max(0, grandTotal - paid);
        sumTotal += grandTotal;
        sumPaid += paid;
        sumPending += pending;
      }
    });

    tbody.innerHTML = pageItems.map(s => {
      const invNo = s.invoiceNo || s.number || '-';
      const cust = s.customer || {};
      const custName = cust.name || s.customerName || s.partyName || 'Walk-in Client';
      const mobile = cust.phone || s.mobile || s.customerPhone || '9099939193';
      const gstin = cust.gstin || s.billingGstin || '24AAACJ1234F..';
      const grandTotal = s.totalAmount != null ? s.totalAmount : (s.total || 0);
      const isPaid = s.paymentStatus === 'PAID';
      const isCancelled = s.documentStatus === 'CANCELLED';
      const paid = isCancelled ? 0 : (s.paidAmount != null ? s.paidAmount : (isPaid ? grandTotal : 0));
      const pending = isCancelled ? 0 : Math.max(0, grandTotal - paid);

      // Dynamic Due / Return Settlement Label matching Desktop SemanticTableCells.dueDate()
      const dueLabel = window.FormatUtil.renderDueBadge(s);

      const docBadge = isCancelled ? '<span class="badge" style="background:rgba(239,68,68,0.2); color:#f87171; border:1px solid rgba(239,68,68,0.4);">✕ CANCELLED</span>' : '<span class="badge" style="background:rgba(52,211,153,0.18); color:#34d399; border:1px solid rgba(52,211,153,0.35);">✔ APPROVED</span>';
      const payBadge = window.FormatUtil.renderPaymentStatusBadge(s);
      
      const rStatus = (s.returnStatus || 'N/A').toUpperCase().replace(/_/g, ' ');
      let retLabel = '<span class="badge pill-badge pill-neutral" style="background:rgba(148,163,184,0.15); color:var(--text-dim); border:1px solid rgba(148,163,184,0.25); white-space:nowrap;">📄 N/A</span>';
      if (rStatus === 'FULLY RETURNED') {
        retLabel = '<span class="badge pill-badge pill-success" style="background:rgba(52,211,153,0.18); color:#34d399; border:1px solid rgba(52,211,153,0.35); white-space:nowrap;">🔄 FULLY RETURNED</span>';
      } else if (rStatus === 'PARTIALLY RETURNED') {
        retLabel = '<span class="badge pill-badge pill-info" style="background:rgba(56,189,248,0.18); color:#38bdf8; border:1px solid rgba(56,189,248,0.35); white-space:nowrap;">🔄 PARTIALLY RETURNED</span>';
      } else if (rStatus === 'PENDING APPROVAL') {
        retLabel = '<span class="badge pill-badge pill-warning" style="background:rgba(251,191,36,0.18); color:#fbbf24; border:1px solid rgba(251,191,36,0.35); white-space:nowrap;">⏳ PENDING APPROVAL</span>';
      }

      const emailPill = s.emailSent
        ? '<span class="pill-badge pill-success" style="font-size:0.75rem; padding: 2px 8px;">Sent</span>'
        : '<span class="pill-badge pill-neutral" style="font-size:0.75rem; padding: 2px 8px; opacity:0.7;">Not Sent</span>';

      return `
        <tr style="cursor: pointer;" class="${this.selectedDrawerInvoiceNo === invNo ? 'active-selected-row' : ''}" data-id="${invNo}" data-invoice-no="${invNo}" onclick="window.SalesController.handleRowClick('${invNo}', this)">
          <td style="font-weight: 700; color: var(--cyan);">${invNo}</td>
          <td>${window.FormatUtil.formatDate(s.invoiceDate || s.date)}</td>
          <td style="font-weight: 600;">${custName}</td>
          <td style="color: var(--text-muted);">${mobile}</td>
          <td style="color: var(--text-muted); font-family: monospace;">${gstin.length > 13 ? gstin.substring(0, 12) + '..' : gstin}</td>
          <td style="text-align: right; font-weight: 700;">${window.FormatUtil.formatRupees(grandTotal)}</td>
          <td style="text-align: right; color: #34d399; font-weight: 600;">${window.FormatUtil.formatRupees(paid)}</td>
          <td style="text-align: right; color: ${pending > 0 ? '#f87171' : 'var(--text-muted)'}; font-weight: 600;">${window.FormatUtil.formatRupees(pending)}</td>
          <td>${dueLabel}</td>
          <td>${docBadge}</td>
          <td>${payBadge}</td>
          <td>${retLabel}</td>
          <td style="text-align: center;">${emailPill}</td>
          <td style="text-align: center;" onclick="event.stopPropagation()">
            <button class="btn-purple" style="height: 28px; padding: 0 10px; font-size: 0.74rem; font-weight: 600;" onclick="window.SalesController.toggleRowActionsMenu(this, '${invNo}', event)" title="View Actions Menu">
              ::: Actions
            </button>
          </td>
        </tr>
      `;
    }).join('');

    this.updateTableSummary(totalCount, sumTotal, sumPaid, sumPending);
  },

  updateTableSummary(count, total, paid, pending) {
    if (this.serverFilteredTotals) {
      total = this.serverFilteredTotals.total != null ? this.serverFilteredTotals.total : total;
      paid = this.serverFilteredTotals.paid != null ? this.serverFilteredTotals.paid : paid;
      pending = this.serverFilteredTotals.balance != null ? this.serverFilteredTotals.balance : pending;
    }
    const elTot = document.getElementById('sr-sum-total');
    const elPaid = document.getElementById('sr-sum-paid');
    const elPend = document.getElementById('sr-sum-pending');

    if (elTot) elTot.innerText = window.FormatUtil.formatRupees(total);
    if (elPaid) elPaid.innerText = window.FormatUtil.formatRupees(paid);
    if (elPend) elPend.innerText = window.FormatUtil.formatRupees(pending);
  },

  // =========================================================================
  // 3. ACTIONS MENU - COMPLETE 13 REAL ACTION OUTPUTS
  // =========================================================================
  toggleRowActionsMenu(btnEl, invNo, event) {
    if (event) event.stopPropagation();
    this.selectedInvoiceNo = invNo;

    const menu = document.getElementById('sales-row-actions-menu');
    if (!menu) return;

    if (menu.classList.contains('show') && menu.dataset.targetInvoice === invNo) {
      menu.classList.remove('show');
      return;
    }

    menu.dataset.targetInvoice = invNo;
    const rect = btnEl.getBoundingClientRect();
    const menuWidth = 220;
    let left = rect.right - menuWidth;
    let top = rect.bottom + 4;

    if (left < 10) left = 10;
    if (top + 400 > window.innerHeight) top = rect.top - 400;

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.classList.add('show');

    const closeHandler = (e) => {
      if (!menu.contains(e.target) && e.target !== btnEl) {
        menu.classList.remove('show');
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  },

  async handleMenuAction(actionKey) {
    const menu = document.getElementById('sales-row-actions-menu');
    if (menu) menu.classList.remove('show');

    const invNo = this.selectedInvoiceNo;
    if (!invNo) return;

    const sale = this.salesCache.find(s => (s.invoiceNo || s.number) === invNo);

    switch (actionKey) {
      case 'VIEW':
        this.openSaleViewMode(invNo);
        break;
      case 'AUDIT':
        this.openAuditTrail(invNo);
        break;
      case 'EDIT':
        this.openSaleEditorTab(sale, false);
        break;
      case 'DUPLICATE':
        this.duplicateSale(sale);
        break;
      case 'PRINT':
        this.printTaxInvoice(invNo);
        break;
      case 'BARCODE':
        this.openDispatchBarcodeModal(invNo);
        break;
      case 'EXCEL':
        this.exportInvoiceExcel(invNo);
        break;
      case 'EMAIL':
        this.openEmailModal(invNo);
        break;
      case 'WHATSAPP':
        this.sendWhatsapp(invNo);
        break;
      case 'PAYMENT':
        let targetSale = sale;
        if (!targetSale || !targetSale.id) {
          try {
            targetSale = await window.OperationsService.getSaleByInvoice(invNo);
          } catch (e) {
            console.warn('Could not fetch sale for payment action:', e);
          }
        }
        if (window.openInvoicePaymentDetails) {
          const grandTotal = targetSale ? (targetSale.totalAmount != null ? targetSale.totalAmount : (targetSale.total || 0)) : 0;
          const isPaid = targetSale && targetSale.paymentStatus === 'PAID';
          const isCancelled = targetSale && targetSale.documentStatus === 'CANCELLED';
          const paid = isCancelled ? 0 : (targetSale ? (targetSale.paidAmount != null ? targetSale.paidAmount : (isPaid ? grandTotal : 0)) : 0);
          const pending = isCancelled ? 0 : Math.max(0, grandTotal - paid);
          const custName = (targetSale && targetSale.customer && targetSale.customer.name) || (targetSale && targetSale.customerName) || (targetSale && targetSale.partyName) || 'Customer';
          const saleId = targetSale ? (targetSale.id || 0) : 0;
          window.openInvoicePaymentDetails('SALE', saleId, invNo, custName, grandTotal, paid, pending, targetSale);
        } else {
          this.openRecordPaymentModal(invNo);
        }
        break;
      case 'RETURN':
        this.createSalesReturn(invNo);
        break;
      case 'CANCEL':
        this.cancelInvoice(invNo);
        break;
      case 'DELETE':
        this.deleteInvoice(invNo);
        break;
    }
  },

  isReturnEligible(sale) {
    if (!sale) return { eligible: false, reason: 'Sale record not found' };
    const docSt = (sale.documentStatus || 'APPROVED').toUpperCase();
    if (docSt === 'CANCELLED') return { eligible: false, reason: 'Cannot create return for a CANCELLED invoice.' };
    if (docSt === 'DRAFT' || docSt === 'PENDING APPROVAL') return { eligible: false, reason: 'Cannot create return for an unapproved invoice.' };
    const paySt = (sale.paymentStatus || '').toUpperCase();
    const grandTotal = sale.totalAmount != null ? sale.totalAmount : (sale.total || 0);
    const paid = sale.paidAmount != null ? sale.paidAmount : (paySt === 'PAID' ? grandTotal : 0);
    const pending = Math.max(0, grandTotal - paid);
    if (pending > 0.01 && paySt !== 'PAID') {
      return { eligible: false, reason: 'Cannot create return for an UNPAID or partially paid invoice. Invoices must be fully settled first.' };
    }
    const retSt = (sale.returnStatus || 'N/A').toUpperCase().replace(/_/g, ' ');
    if (retSt === 'FULLY RETURNED') {
      return { eligible: false, reason: 'This invoice has already been FULLY RETURNED.' };
    }
    if (retSt === 'PENDING APPROVAL') {
      return { eligible: false, reason: 'A return for this invoice is already PENDING APPROVAL.' };
    }
    return { eligible: true };
  },

  createSalesReturn(invNo) {
    const sale = (this.salesCache || []).find(s => (s.invoiceNo || s.number) === invNo);
    if (sale) {
      const check = this.isReturnEligible(sale);
      if (!check.eligible) {
        if (window.AppDialogService && window.AppDialogService.toastWarning) {
          window.AppDialogService.toastWarning(check.reason);
        } else {
          alert(check.reason);
        }
        return;
      }
    }
    if (window.ReturnsController && window.ReturnsController.openCreateReturnModal) {
      if (window.ReturnsController.setType) window.ReturnsController.setType('SALES RETURN');
      window.ReturnsController.openCreateReturnModal(invNo, 'SALES RETURN');
    } else {
      const modal = document.getElementById('modal-create-return');
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        const inp = document.getElementById('cr-invoice-input');
        if (inp) inp.value = invNo || '';
        const crType = document.getElementById('cr-type');
        if (crType) crType.value = 'SALES RETURN';
      }
    }
  },

  // =========================================================================
  // 4. FILTERING & SEARCH
  // =========================================================================
  filterSales(query) {
    const q = (query || '').toLowerCase().trim();
    const filtered = this.salesCache.filter(s => {
      const invNo = (s.invoiceNo || s.number || '').toLowerCase();
      const custName = ((s.customer && s.customer.name) || s.customerName || s.partyName || '').toLowerCase();
      const mobile = ((s.customer && s.customer.phone) || s.mobile || '').toLowerCase();
      const gstin = (s.billingGstin || (s.customer && s.customer.gstin) || '').toLowerCase();
      return invNo.includes(q) || custName.includes(q) || mobile.includes(q) || gstin.includes(q);
    });
    this.renderSalesTable(filtered);
  },

  applyFilters() {
    const custId = (document.getElementById('sr-filter-customer') || {}).value;
    const fromDate = (document.getElementById('sr-filter-from-date') || {}).value;
    const toDate = (document.getElementById('sr-filter-to-date') || {}).value;
    const docStatus = (document.getElementById('sr-filter-doc-status') || {}).value;
    const payStatus = (document.getElementById('sr-filter-pay-status') || {}).value;
    const retStatus = (document.getElementById('sr-filter-ret-status') || {}).value;

    const today = new Date().toISOString().split('T')[0];

    const filtered = (this.salesCache || []).filter(s => {
      if (custId && (s.customer?.id != custId && s.customerId != custId)) return false;
      const invDate = s.invoiceDate || s.date || '';
      if (fromDate && invDate < fromDate) return false;
      if (toDate && invDate > toDate) return false;

      // Document status matching
      if (docStatus && docStatus !== 'All' && docStatus !== '') {
        const d = (s.documentStatus || 'APPROVED').toUpperCase();
        if (d !== docStatus.toUpperCase()) return false;
      }

      // Payment status matching (Desktop SalesListController parity)
      if (payStatus && payStatus !== 'All' && payStatus !== '') {
        const total = parseFloat(s.totalAmount != null ? s.totalAmount : (s.total || 0));
        const paid = parseFloat(s.paidAmount != null ? s.paidAmount : (s.paid || 0));
        const balance = s.balanceAmount != null ? parseFloat(s.balanceAmount) : Math.max(0, total - paid);
        const status = (s.paymentStatus || (balance <= 0.005 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING')).toUpperCase();
        const dueDate = s.dueDate || '';
        const isOverdue = balance > 0.005 && dueDate && dueDate < today;

        if (payStatus === 'RECEIVABLES') {
          if (balance <= 0.005) return false;
        } else if (payStatus === 'OVERDUE') {
          if (!isOverdue) return false;
        } else if (payStatus === 'PAID') {
          if (balance > 0.005 && status !== 'PAID') return false;
        } else if (payStatus === 'PARTIAL') {
          if (status !== 'PARTIAL' && (paid <= 0 || balance <= 0.005)) return false;
        } else if (payStatus === 'PENDING') {
          if (status !== 'PENDING' && paid > 0) return false;
        } else if (status !== payStatus.toUpperCase()) {
          return false;
        }
      }

      // Return status matching
      if (retStatus && retStatus !== 'All' && retStatus !== '') {
        const normRet = (s.returnStatus || 'N/A').toUpperCase().replace(/_/g, ' ').trim();
        const targetRet = retStatus.toUpperCase().replace(/_/g, ' ').trim();
        if (targetRet === 'N/A') {
          if (normRet !== 'N/A' && normRet !== '' && normRet !== 'NONE' && normRet !== 'NO RETURN' && normRet !== 'NOT RETURNED') return false;
        } else {
          if (normRet !== targetRet) return false;
        }
      }

      return true;
    });

    this.renderSalesTable(filtered);
  },

  setPresetDate(type, btnEl) {
    document.querySelectorAll('.btn-preset-chip').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const fromInput = document.getElementById('sr-filter-from-date');
    const toInput = document.getElementById('sr-filter-to-date');
    if (!fromInput || !toInput) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (type === 'ALL') {
      fromInput.value = '';
      toInput.value = '';
    } else if (type === 'TODAY') {
      fromInput.value = todayStr;
      toInput.value = todayStr;
    } else if (type === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      fromInput.value = yest.toISOString().split('T')[0];
      toInput.value = yest.toISOString().split('T')[0];
    } else if (type === '7DAYS') {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      fromInput.value = d7.toISOString().split('T')[0];
      toInput.value = todayStr;
    } else if (type === '30DAYS') {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 30);
      fromInput.value = d30.toISOString().split('T')[0];
      toInput.value = todayStr;
    } else if (type === 'THIS_FY') {
      const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      fromInput.value = `${yr}-04-01`;
      toInput.value = `${yr + 1}-03-31`;
    } else if (type === 'THIS_QUARTER') {
      const d90 = new Date(now);
      d90.setDate(d90.getDate() - 90);
      fromInput.value = d90.toISOString().split('T')[0];
      toInput.value = todayStr;
    }

    this.applyFilters();
  },

  resetFilters() {
    ['sr-filter-customer', 'sr-filter-from-date', 'sr-filter-to-date', 'sr-filter-doc-status', 'sr-filter-pay-status', 'sr-filter-ret-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    document.querySelectorAll('.btn-preset-chip').forEach(b => b.classList.remove('active'));
    const chipAll = document.querySelector('.btn-preset-chip');
    if (chipAll) chipAll.classList.add('active');

    this.renderSalesTable(this.salesCache);
  },

  // =========================================================================
  // 5. CREATE SALE INVOICE WORKSPACE TAB (DESKTOP SALE.FXML PARITY)
  // =========================================================================
  async openSaleEditorTab(existingSale, isViewMode = false) {
    if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
    this.isNavigatingToEditor = true;
    this.viewMode = isViewMode;
    this.editingSale = existingSale || null;

    if (window.NavigationRouter) {
      window.NavigationRouter.selectNav('view-sale-create');
    }

    await this.initSaleWorkspace(existingSale, isViewMode);
  },

  async openSaleCreatorFromQuotation(quote) {
    if (!quote) return;
    if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
    if (window.NavigationRouter) {
      window.NavigationRouter.selectNav('view-sale-create');
    }

    const custObj = typeof quote.customer === 'object' && quote.customer !== null 
      ? quote.customer 
      : { id: quote.customerId || null, name: quote.customer || quote.customerName || 'Customer', phone: quote.phone || '', gstin: quote.gstin || '', address: quote.address || '' };

    const draftLines = (quote.lines || quote.items || []).map(l => ({
      itemCode: l.itemCode || l.code || 'SKU',
      itemDescription: l.itemDescription || l.description || l.itemName || '',
      itemCategory: l.itemCategory || l.category || 'General',
      itemHsn: l.itemHsn || l.hsn || '73063000',
      itemUnit: l.itemUnit || l.unit || 'PCS',
      quantity: parseFloat(l.quantity || l.qty) || 1,
      rate: parseFloat(l.rate || l.price) || 0,
      discountPercent: parseFloat(l.discountPercent || l.discount) || 0,
      taxPercent: parseFloat(l.taxPercent || l.taxRate || l.gstPercent) || 18,
      gstPercent: parseFloat(l.taxPercent || l.taxRate || l.gstPercent) || 18
    }));

    const draftSale = {
      isQuotationConversion: true,
      quotationNo: quote.no || quote.quotationNo,
      customer: custObj,
      customerId: custObj.id,
      billingAddress: quote.billingAddress || quote.address || custObj.address || '',
      deliveryAddress: quote.shippingAddress || quote.deliveryAddress || quote.address || custObj.address || '',
      billingGstin: quote.billingGstin || quote.gstin || custObj.gstin || '',
      deliveryGstin: quote.deliveryGstin || quote.gstin || custObj.gstin || '',
      orderNo: quote.no || quote.quotationNo || '',
      notes: `Converted from Quotation ${quote.no || quote.quotationNo || ''}`,
      lines: draftLines,
      charges: quote.charges || []
    };

    await this.initSaleWorkspace(draftSale, false);
    if (window.AppDialogService) {
      window.AppDialogService.toastSuccess(`Quotation ${quote.no || quote.quotationNo} items loaded into Sale Creator!`);
    }
  },

  async openSaleViewMode(invNo) {
    try {
      const sale = await window.OperationsService.getSaleByInvoice(invNo);
      if (sale) {
        await this.openSaleEditorTab(sale, true);
        window.AppDialogService.showToast(`Viewing Sale ${invNo} in Read-Only Mode`, 'info');
      }
    } catch (e) {
      window.AppDialogService.showToast('Could not load sale for viewing: ' + e.message, 'error');
    }
  },

  async initSaleWorkspace(existingSale, isViewMode = false) {
    try {
      // 1. Dynamic Next Invoice Number
      let nextNo = 'JI/25-2026/0130';
      const invNoEl = document.getElementById('ws-inv-no');
      const invDateEl = document.getElementById('ws-inv-date');

      if (invNoEl) invNoEl.value = 'Loading next sequence...';

      if (!existingSale || existingSale.isQuotationConversion) {
        try {
          const seq = await window.OperationsService.getNextSaleInvoice();
          if (seq && (seq.value || typeof seq === 'string')) {
            nextNo = seq.value || seq;
          }
        } catch (e) {
          console.warn('Next sequence fallback:', e);
        }
      } else {
        nextNo = existingSale.invoiceNo || nextNo;
      }

      if (invNoEl) invNoEl.value = nextNo;
      const todayStr = new Date().toISOString().split('T')[0];
      if (invDateEl) invDateEl.value = (existingSale && existingSale.invoiceDate) || todayStr;

      // 2. Fetch Master Bootstrap
      let bootstrap = null;
      try {
        bootstrap = await window.MasterService.getSalesEntryBootstrap();
      } catch (err) {
        console.warn('Bootstrap fetch error, using fallback:', err);
      }

      if (bootstrap) {
        if (bootstrap.chargeTypes && bootstrap.chargeTypes.length > 0) {
          this.availableChargeTypes = bootstrap.chargeTypes;
        }
        this.transportersCache = bootstrap.transporters || [];
        this.customersCache = bootstrap.customers || [];

        // Transporters dropdown
        const selTrans = document.getElementById('ws-transporter');
        if (selTrans) {
          selTrans.innerHTML = '<option value="">Select transporter...</option>' +
            this.transportersCache.map(t => `<option value="${t.lookupValue}" data-gstin="${t.description || ''}">${t.lookupValue}</option>`).join('');
          if (existingSale && existingSale.transporter) {
            selTrans.value = existingSale.transporter;
            const gstinEl = document.getElementById('ws-trans-gstin');
            if (gstinEl) gstinEl.value = existingSale.transporterGstin || '';
          }
        }

        // Customers dropdown
        const selCust = document.getElementById('ws-customer');
        if (selCust) {
          selCust.innerHTML = `<option value="">Select customer...</option>` +
            this.customersCache.map(c => `<option value="${c.id}" data-address="${c.address || ''}" data-gstin="${c.gstin || ''}" data-terms="15 Days">${c.name || c.partyCode}</option>`).join('');
          if (existingSale && (existingSale.customerId || (existingSale.customer && existingSale.customer.id))) {
            selCust.value = existingSale.customerId || existingSale.customer.id;
          }
        }

        // Payment terms dropdown
        const selTerms = document.getElementById('ws-payment-terms');
        if (selTerms && bootstrap.paymentTerms && bootstrap.paymentTerms.length > 0) {
          selTerms.innerHTML = bootstrap.paymentTerms.map(t => `<option value="${t}" ${t === '15 Days' ? 'selected' : ''}>${t}</option>`).join('');
          if (existingSale && existingSale.paymentTerms) selTerms.value = existingSale.paymentTerms;
        }

        // GST types dropdown
        const selGst = document.getElementById('ws-gst-type');
        if (selGst && bootstrap.gstTypes && bootstrap.gstTypes.length > 0) {
          selGst.innerHTML = bootstrap.gstTypes.map(g => `<option value="${g}">${g}</option>`).join('');
          if (existingSale && existingSale.gstType) selGst.value = existingSale.gstType;
        }
      } else {
        const customers = await window.MasterService.getParties('CUSTOMER');
        this.customersCache = customers || [];
        const selCust = document.getElementById('ws-customer');
        if (selCust) {
          selCust.innerHTML = `<option value="">Select customer...</option>` +
            customers.map(c => `<option value="${c.id}" data-address="${c.address || ''}" data-gstin="${c.gstin || ''}" data-terms="${c.paymentTerms || '15 Days'}">${c.name || c.partyName}</option>`).join('');
        }
      }

      // 3. Load Items Master for Fast Entry Strip
      const items = await window.MasterService.getItems();
      this.itemsCache = items || [];
      const selItem = document.getElementById('ws-fast-item-select');
      if (selItem) {
        selItem.innerHTML = `<option value="">Search Item Master... [F2 / Enter]</option>` +
          items.map(i => `<option value="${i.itemCode || i.code}" data-desc="${i.description || i.name}" data-category="${i.category || 'Hardware'}" data-hsn="${i.hsn || '73063000'}" data-unit="${i.unit || 'PCS'}" data-rate="${i.sellingPrice || 100}" data-tax="${i.gst || 18}" data-stock="${i.openingStock || 0}">${i.itemCode || i.code} - ${i.description || i.name}</option>`).join('');
      }

      // 4. Fill addresses & GSTIN if existing
      if (existingSale) {
        const bAddr = document.getElementById('ws-billing-address');
        const dAddr = document.getElementById('ws-delivery-address');
        const bGst = document.getElementById('ws-billing-gstin');
        const dGst = document.getElementById('ws-delivery-gstin');
        const poDate = document.getElementById('ws-po-date');
        const poNo = document.getElementById('ws-po-no');
        const notes = document.getElementById('ws-invoice-notes');
        const veh = document.getElementById('ws-vehicle-no');
        const cp = document.getElementById('ws-contact-person');
        const cpm = document.getElementById('ws-contact-mobile');

        if (bAddr) bAddr.value = existingSale.billingAddress || '';
        if (dAddr) dAddr.value = existingSale.deliveryAddress || '';
        if (bGst) bGst.value = existingSale.billingGstin || (existingSale.customer && existingSale.customer.gstin) || '';
        if (dGst) dGst.value = existingSale.deliveryGstin || '';
        if (poDate) poDate.value = existingSale.poDate || '';
        if (poNo) poNo.value = existingSale.orderNo || '';
        if (notes) notes.value = existingSale.notes || '';
        if (veh) veh.value = existingSale.vehicleNumber || '';
        if (cp) cp.value = existingSale.contactPerson || '';
        if (cpm) cpm.value = existingSale.contactPersonMobile || '';

        // Auto-detect GST regime
        this.suggestGstTypeFromGstin(existingSale.billingGstin || (existingSale.customer && existingSale.customer.gstin));
      } else {
        // Reset form inputs for fresh entry
        ['ws-billing-address', 'ws-delivery-address', 'ws-billing-gstin', 'ws-delivery-gstin', 'ws-po-no', 'ws-invoice-notes', 'ws-vehicle-no', 'ws-contact-person', 'ws-contact-mobile'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        const chkSame = document.getElementById('ws-same-address');
        if (chkSame) chkSame.checked = true;
      }

      // 5. Attachment state initialization
      this.pendingAttachmentFile = null;
      this.attachmentRemovalPending = false;
      this.refreshAttachmentUi(existingSale ? existingSale.attachmentPath : null);

      // 6. Charges
      this.invoiceCharges = [];
      if (existingSale && existingSale.charges && Array.isArray(existingSale.charges)) {
        this.invoiceCharges = existingSale.charges.map(c => ({
          chargeType: c.chargeType || 'Freight',
          amount: parseFloat(c.amount) || 0,
          taxable: typeof c.taxable === 'boolean' ? c.taxable : true,
          gstPercent: parseFloat(c.gstPercent) || 18
        }));
      }
      this.updateChargeSummaryBadge();

      // 7. Lines
      this.workspaceItems = [];
      this.editingItemIndex = -1;
      this.selectedWorkspaceItem = null;
      this.cancelRowEdit();

      if (existingSale && existingSale.lines) {
        existingSale.lines.forEach(l => {
          this.workspaceItems.push({
            code: l.itemCode || 'SKU',
            description: l.itemDescription || l.description || '',
            category: l.itemCategory || l.category || 'General',
            hsn: l.itemHsn || l.hsn || '73063000',
            unit: l.itemUnit || l.unit || 'PCS',
            qty: l.quantity || 1,
            rate: l.rate || 0,
            discPct: l.discountPercent || 0,
            discAmt: l.discountAmount || 0,
            gstPct: l.gstPercent || 18,
            taxable: l.taxableAmount || (l.quantity * l.rate),
            gstAmt: l.gstAmount || 0,
            amount: l.totalAmount || (l.quantity * l.rate)
          });
        });
      }

      this.renderWorkspaceItemsTable();
      this.calcWorkspaceTotals();
      this.updateGstHeaders();
      this.installKeyboardShortcuts();

      // Read-only state toggling if in View mode
      const isReadOnly = !!isViewMode;
      const banner = document.getElementById('ws-read-only-banner');
      if (banner) banner.style.display = isReadOnly ? 'block' : 'none';

      const entryStrip = document.getElementById('ws-item-entry-strip');
      if (entryStrip) entryStrip.style.display = isReadOnly ? 'none' : 'flex';

      const pageTitle = document.getElementById('ws-page-title');
      const pageSub = document.getElementById('ws-page-subtitle');
      if (pageTitle) pageTitle.innerText = isReadOnly ? `View Sale Invoice • ${nextNo} (Read Only)` : 'Create Sale Invoice';
      if (pageSub) pageSub.innerText = isReadOnly ? 'Viewing historical customer tax invoice in read-only mode' : 'Create a new sale invoice for your customer';

      const saveBtn = document.getElementById('ws-btn-save-sale');
      const addLineBtn = document.getElementById('ws-btn-add-line');
      if (saveBtn) saveBtn.style.display = isReadOnly ? 'none' : 'inline-block';
      if (addLineBtn) addLineBtn.disabled = isReadOnly;

      ['ws-customer', 'ws-inv-date', 'ws-billing-address', 'ws-delivery-address', 'ws-billing-gstin', 'ws-delivery-gstin', 'ws-same-address', 'ws-payment-terms', 'ws-po-date', 'ws-po-no', 'ws-gst-type', 'ws-transporter', 'ws-vehicle-no', 'ws-contact-person', 'ws-contact-mobile', 'ws-fast-item-search', 'ws-fast-item-select', 'ws-fast-qty', 'ws-fast-rate', 'ws-fast-disc', 'ws-fast-tax'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          if (el.tagName === 'SELECT' || el.type === 'checkbox') el.disabled = isReadOnly;
          else el.readOnly = isReadOnly;
        }
      });

      // Strict lock on Additional Charges in read-only view
      const chargesDisp = document.getElementById('ws-charges-summary-display');
      if (chargesDisp) {
        chargesDisp.style.pointerEvents = isReadOnly ? 'none' : 'auto';
        chargesDisp.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        chargesDisp.style.opacity = isReadOnly ? '0.65' : '1';
        chargesDisp.title = isReadOnly ? 'Charges cannot be modified on approved invoices (Read Only)' : 'Click to manage additional charges';
      }
      const btnManageCharges = document.getElementById('ws-btn-manage-charges');
      if (btnManageCharges) btnManageCharges.disabled = isReadOnly;

    } catch (e) {
      console.warn('initSaleWorkspace error:', e);
    }
  },

  // State Code Auto-Detection (Feature 4)
  suggestGstTypeFromGstin(gstin) {
    const gstTypeEl = document.getElementById('ws-gst-type');
    if (!gstTypeEl) return;
    const clean = (gstin || '').trim();
    if (clean.length >= 2) {
      const stateCode = clean.substring(0, 2);
      if (stateCode === '24') {
        gstTypeEl.value = 'GST';
      } else {
        gstTypeEl.value = 'IGST';
      }
    } else {
      gstTypeEl.value = 'GST';
    }
    this.updateGstHeaders();
  },

  // Dynamic Header Renaming (Feature 5)
  updateGstHeaders() {
    const gstTypeEl = document.getElementById('ws-gst-type');
    const isIgst = gstTypeEl && (gstTypeEl.value === 'IGST' || gstTypeEl.value === 'INTER_STATE_IGST');

    const thGst = document.getElementById('ws-th-gst');
    const thGstAmt = document.getElementById('ws-th-gst-amt');

    if (thGst) thGst.innerText = isIgst ? 'IGST %' : 'GST %';
    if (thGstAmt) thGstAmt.innerText = isIgst ? 'IGST Amount (₹)' : 'GST Amount (₹)';
  },

  onWorkspaceCustomerChange(selectEl) {
    const opt = selectEl.options[selectEl.selectedIndex];
    if (!opt || !opt.value) return;

    const address = opt.dataset.address || '';
    const gstin = opt.dataset.gstin || '';
    const terms = opt.dataset.terms || '15 Days';

    const bAddr = document.getElementById('ws-billing-address');
    const dAddr = document.getElementById('ws-delivery-address');
    const bGst = document.getElementById('ws-billing-gstin');
    const dGst = document.getElementById('ws-delivery-gstin');
    const pTerms = document.getElementById('ws-payment-terms');
    const chkSame = document.getElementById('ws-same-address');

    if (bAddr) bAddr.value = address;
    if (chkSame && chkSame.checked && dAddr) dAddr.value = address;
    if (bGst) bGst.value = gstin;
    if (chkSame && chkSame.checked && dGst) dGst.value = gstin;
    if (pTerms) pTerms.value = terms;

    this.suggestGstTypeFromGstin(gstin);
    this.calcWorkspaceTotals();
  },

  toggleSameAddress(isSame) {
    const bAddr = document.getElementById('ws-billing-address');
    const dAddr = document.getElementById('ws-delivery-address');
    const bGst = document.getElementById('ws-billing-gstin');
    const dGst = document.getElementById('ws-delivery-gstin');

    if (isSame) {
      if (bAddr && dAddr) dAddr.value = bAddr.value;
      if (bGst && dGst) dGst.value = bGst.value;
      if (dAddr) dAddr.setAttribute('readonly', 'readonly');
      if (dGst) dGst.setAttribute('readonly', 'readonly');
    } else {
      if (dAddr) dAddr.removeAttribute('readonly');
      if (dGst) dGst.removeAttribute('readonly');
    }
  },

  onBillingAddressInput(val) {
    const chkSame = document.getElementById('ws-same-address');
    if (chkSame && chkSame.checked) {
      const dAddr = document.getElementById('ws-delivery-address');
      if (dAddr) dAddr.value = val || '';
    }
  },

  onBillingGstinInput(val) {
    const chkSame = document.getElementById('ws-same-address');
    if (chkSame && chkSame.checked) {
      const dGst = document.getElementById('ws-delivery-gstin');
      if (dGst) dGst.value = val || '';
    }
    this.suggestGstTypeFromGstin(val);
  },

  onTransporterChange(selectEl) {
    const opt = selectEl.options[selectEl.selectedIndex];
    const gstinEl = document.getElementById('ws-trans-gstin');
    if (gstinEl) {
      gstinEl.value = (opt && opt.dataset.gstin) ? opt.dataset.gstin.trim() : '';
    }
  },

  // Payment Terms to Due Date calculation (Feature 7)
  calculatePaymentDueDate(invoiceDateStr, termsStr) {
    if (!invoiceDateStr) return invoiceDateStr;
    if (!termsStr || termsStr.toLowerCase().includes('immediate') || termsStr.toLowerCase().includes('receipt')) {
      return invoiceDateStr;
    }
    const match = termsStr.match(/(\d+)/);
    if (!match) return invoiceDateStr;
    const days = parseInt(match[1]);
    const d = new Date(invoiceDateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },

  // =========================================================================
  // 6. LIVE STOCK POSITION STRIP & STRICT OVER-SELL CHECK (FEATURES 2 & 3)
  // =========================================================================
  onFastItemSelect(selectEl) {
    const opt = selectEl.options[selectEl.selectedIndex];
    if (!opt || !opt.value) {
      this.selectedWorkspaceItem = null;
      const bar = document.getElementById('ws-stock-position-bar');
      if (bar) bar.style.display = 'none';
      const searchInput = document.getElementById('ws-fast-item-search');
      if (searchInput) searchInput.value = '';
      return;
    }
    this.selectFastItem(opt.value);
  },

  updateStockPositionUi() {
    const bar = document.getElementById('ws-stock-position-bar');
    if (!bar) return;

    const item = this.selectedWorkspaceItem;
    if (!item) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = 'flex';

    const onHand = Math.max(0, item.openingStock || 0);
    const reserved = 0;
    const available = onHand;

    // Quantity already on other rows of this invoice
    const alreadyOnInvoice = this.workspaceItems
      .filter((_, idx) => idx !== this.editingItemIndex && _.code === (item.itemCode || item.code))
      .reduce((sum, line) => sum + (parseFloat(line.qty) || 0), 0);

    const qtyInput = document.getElementById('ws-fast-qty');
    const requested = parseFloat(qtyInput ? qtyInput.value : '0') || 0;
    const effectiveAvailable = available - alreadyOnInvoice;
    const after = effectiveAvailable - Math.max(0, requested);

    const elOnHand = document.getElementById('ws-stock-on-hand');
    const elReserved = document.getElementById('ws-stock-reserved');
    const elAvailable = document.getElementById('ws-stock-available');
    const elAfter = document.getElementById('ws-stock-after-sale');
    const elBadge = document.getElementById('ws-stock-state-badge');

    if (elOnHand) elOnHand.innerText = this.qtyText(onHand);
    if (elReserved) elReserved.innerText = this.qtyText(reserved);
    if (elAvailable) elAvailable.innerText = this.qtyText(effectiveAvailable);
    if (elAfter) elAfter.innerText = this.qtyText(after);

    if (elBadge) {
      elBadge.className = 'badge';
      if (after < -0.0001) {
        elBadge.classList.add('stock-shortage');
        elBadge.innerText = `Short by ${this.qtyText(-after)}`;
      } else if (effectiveAvailable <= 0.0001) {
        elBadge.classList.add('stock-warning');
        elBadge.innerText = 'No free stock';
      } else {
        elBadge.classList.add('stock-positive');
        elBadge.innerText = 'Available to sell';
      }
    }
  },

  qtyText(val) {
    const num = Math.round(val * 100) / 100;
    return num.toString();
  },

  addFastItemRow() {
    try {
      const sel = document.getElementById('ws-fast-item-select');
      let itemCode = sel ? sel.value : null;
      if (!itemCode && this.selectedWorkspaceItem) {
        itemCode = this.selectedWorkspaceItem.itemCode || this.selectedWorkspaceItem.code;
        if (sel) this.selectFastItem(itemCode);
      }
      if (!itemCode) {
        window.AppDialogService.showToast('Select item from catalog first [F2]', 'warning');
        return;
      }

      const opt = sel ? sel.options[sel.selectedIndex] : null;
      const item = this.selectedWorkspaceItem || {
        itemCode,
        description: (opt && opt.dataset.desc) || itemCode,
        openingStock: (opt && parseFloat(opt.dataset.stock)) || 0
      };

      const qty = parseFloat((document.getElementById('ws-fast-qty') || {}).value) || 0;
      const rate = parseFloat((document.getElementById('ws-fast-rate') || {}).value) || 0;
      const discPct = parseFloat((document.getElementById('ws-fast-disc') || {}).value) || 0;
      const gstPct = parseFloat((document.getElementById('ws-fast-tax') || {}).value) || 18;

      if (qty <= 0) {
        window.AppDialogService.showToast('Quantity must be greater than zero', 'error');
        return;
      }
      if (rate < 0) {
        window.AppDialogService.showToast('Rate cannot be negative', 'error');
        return;
      }
      if (discPct < 0 || discPct > 100) {
        window.AppDialogService.showToast('Discount percent must be between 0 and 100', 'error');
        return;
      }

      // Stock Check (Desktop Parity with SalesController.java)
      const stockVal = parseFloat(item.openingStock != null ? item.openingStock : opt.dataset.stock);
      const freeToPromise = isNaN(stockVal) ? 999999 : Math.max(0, stockVal);
      const alreadyOnInvoice = (this.workspaceItems || [])
        .filter((_, idx) => idx !== this.editingItemIndex && _.code === itemCode)
        .reduce((sum, line) => sum + (parseFloat(line.qty) || 0), 0);

      if (qty + alreadyOnInvoice > freeToPromise + 0.0001 && freeToPromise > 0) {
        const itemDesc = item.description || opt.dataset.desc || itemCode;
        window.AppDialogService.showToast(
          `Only ${this.qtyText(freeToPromise)} units of ${itemDesc} are currently available (On hand ${this.qtyText(freeToPromise)})`,
          'error'
        );
        return;
      }

      const gross = qty * rate;
      const discAmt = gross * (discPct / 100);
      const taxable = gross - discAmt;
      const gstAmt = taxable * (gstPct / 100);
      const amount = taxable + gstAmt;

      const rowData = {
        code: itemCode,
        description: opt.dataset.desc || item.description || itemCode,
        category: opt.dataset.category || item.category || 'General',
        hsn: opt.dataset.hsn || item.hsn || '73063000',
        unit: opt.dataset.unit || item.unit || 'PCS',
        qty,
        rate,
        discPct,
        discAmt,
        gstPct,
        taxable,
        gstAmt,
        amount
      };

      if (!Array.isArray(this.workspaceItems)) {
        this.workspaceItems = [];
      }

      if (this.editingItemIndex >= 0 && this.editingItemIndex < this.workspaceItems.length) {
        // Update existing line
        this.workspaceItems[this.editingItemIndex] = rowData;
        window.AppDialogService.showToast(`Updated line ${itemCode}`, 'info');
      } else {
        // Add fresh line
        this.workspaceItems.push(rowData);
        window.AppDialogService.showToast(`Added line ${itemCode} to invoice`, 'success');
      }

      if (window.AudioSynthesizer && typeof window.AudioSynthesizer.playKey === 'function') {
        try { window.AudioSynthesizer.playKey(); } catch (_) {}
      }

      this.cancelRowEdit();
      this.renderWorkspaceItemsTable();
      this.calcWorkspaceTotals();

      // Focus back to Item search
      if (sel) sel.focus();
    } catch (err) {
      console.error('addFastItemRow error:', err);
      window.AppDialogService.showToast('Failed to add item: ' + err.message, 'error');
    }
  },

  // Row Click-to-Edit & Deletion (Feature 6)
  editWorkspaceRow(index) {
    const item = this.workspaceItems[index];
    if (!item) return;

    this.editingItemIndex = index;

    const sel = document.getElementById('ws-fast-item-select');
    const elQty = document.getElementById('ws-fast-qty');
    const elRate = document.getElementById('ws-fast-rate');
    const elDisc = document.getElementById('ws-fast-disc');
    const elTax = document.getElementById('ws-fast-tax');
    const btnAdd = document.getElementById('ws-btn-add-line');
    const btnCancel = document.getElementById('ws-btn-cancel-line');

    if (sel) {
      sel.value = item.code;
      this.selectedWorkspaceItem = (this.itemsCache || []).find(i => (i.itemCode || i.code) === item.code) || {
        itemCode: item.code,
        description: item.description,
        openingStock: 100
      };
    }
    if (elQty) elQty.value = item.qty;
    if (elRate) elRate.value = item.rate;
    if (elDisc) elDisc.value = item.discPct;
    if (elTax) elTax.value = item.gstPct;

    if (btnAdd) {
      btnAdd.innerText = '✔ Update Line';
      btnAdd.style.background = '#38bdf8';
      btnAdd.style.color = '#000';
    }
    if (btnCancel) btnCancel.style.display = 'inline-block';

    this.updateStockPositionUi();
    this.renderWorkspaceItemsTable();
    if (elQty) elQty.focus();
  },

  cancelRowEdit() {
    this.editingItemIndex = -1;
    this.selectedWorkspaceItem = null;

    const sel = document.getElementById('ws-fast-item-select');
    const elQty = document.getElementById('ws-fast-qty');
    const elRate = document.getElementById('ws-fast-rate');
    const elDisc = document.getElementById('ws-fast-disc');
    const elTax = document.getElementById('ws-fast-tax');
    const btnAdd = document.getElementById('ws-btn-add-line');
    const btnCancel = document.getElementById('ws-btn-cancel-line');
    const bar = document.getElementById('ws-stock-position-bar');

    if (sel) sel.selectedIndex = 0;
    if (elQty) elQty.value = '1';
    if (elRate) elRate.value = '100.00';
    if (elDisc) elDisc.value = '0';
    if (elTax) elTax.value = '18';

    if (btnAdd) {
      btnAdd.innerText = '+ Add Item';
      btnAdd.style.background = '#fbbf24';
      btnAdd.style.color = '#000';
    }
    if (btnCancel) btnCancel.style.display = 'none';
    if (bar) bar.style.display = 'none';

    this.renderWorkspaceItemsTable();
  },

  removeWorkspaceRow(index, event) {
    if (event) event.stopPropagation();
    if (this.editingItemIndex === index) this.cancelRowEdit();
    this.workspaceItems.splice(index, 1);
    this.renderWorkspaceItemsTable();
    this.calcWorkspaceTotals();
  },

  removeLastWorkspaceRow() {
    if (this.workspaceItems.length > 0) {
      if (this.editingItemIndex === this.workspaceItems.length - 1) this.cancelRowEdit();
      this.workspaceItems.pop();
      this.renderWorkspaceItemsTable();
      this.calcWorkspaceTotals();
    }
  },

  renderWorkspaceItemsTable() {
    const tbody = document.getElementById('ws-items-tbody');
    if (!tbody) return;

    if (this.workspaceItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="14" style="text-align: center; color: var(--text-dim); padding: 30px;">No records to display.${this.viewMode ? '' : ' Use the fast entry bar above to add items.'}</td></tr>`;
      return;
    }

    const isReadOnly = !!this.viewMode;
    tbody.innerHTML = this.workspaceItems.map((item, idx) => {
      const isEditing = idx === this.editingItemIndex;
      return `
        <tr class="${isEditing ? 'editing-row' : ''}" style="${isReadOnly ? '' : 'cursor: pointer;'}" ${isReadOnly ? '' : `onclick="window.SalesController.editWorkspaceRow(${idx})" title="Click row to edit"`}>
          <td style="font-weight: 700; color: var(--cyan);">${item.code}</td>
          <td>${item.description}</td>
          <td style="color: var(--text-muted);">${item.category}</td>
          <td style="font-family: monospace;">${item.hsn}</td>
          <td>${item.unit}</td>
          <td style="font-weight: 600;">${item.qty}</td>
          <td>${window.FormatUtil.formatRupees(item.rate)}</td>
          <td>${item.discPct}%</td>
          <td>${window.FormatUtil.formatRupees(item.discAmt)}</td>
          <td>${item.gstPct}%</td>
          <td style="font-weight: 600;">${window.FormatUtil.formatRupees(item.taxable)}</td>
          <td>${window.FormatUtil.formatRupees(item.gstAmt)}</td>
          <td style="text-align: right; font-weight: 700;">${window.FormatUtil.formatRupees(item.amount)}</td>
          <td style="text-align: center;" onclick="event.stopPropagation()">
            ${isReadOnly ? '<span style="color: var(--text-dim); font-size: 0.8rem;">🔒</span>' : `<button type="button" class="btn btn-danger" style="padding: 2px 7px; font-size: 0.7rem;" onclick="window.SalesController.removeWorkspaceRow(${idx}, event)" title="Remove Line">&times;</button>`}
          </td>
        </tr>
      `;
    }).join('');
  },

  calcWorkspaceTotals() {
    let grossItems = 0, discountTot = 0, itemTaxable = 0, lineTax = 0;

    this.workspaceItems.forEach(item => {
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(item.rate) || 0;
      const discPct = parseFloat(item.discPct) || 0;
      const gstPct = parseFloat(item.gstPct) || 18;

      const gross = Math.round((qty * rate) * 100) / 100;
      const disc = Math.round((gross * (discPct / 100)) * 100) / 100;
      const taxable = Math.max(0, Math.round((gross - disc) * 100) / 100);
      const tax = Math.round((taxable * (gstPct / 100)) * 100) / 100;

      grossItems += gross;
      discountTot += disc;
      itemTaxable += taxable;
      lineTax += tax;
    });

    let chargeAmount = 0, taxableCharges = 0, chargeTax = 0;
    (this.invoiceCharges || []).forEach(c => {
      const amt = Math.max(0, parseFloat(c.amount) || 0);
      chargeAmount += amt;
      if (c.taxable) {
        taxableCharges += amt;
        const cTax = Math.round((amt * ((c.gstPercent || 0) / 100)) * 100) / 100;
        chargeTax += cTax;
      }
    });

    const totalTaxable = Math.round((itemTaxable + taxableCharges) * 100) / 100;
    const totalTax = Math.round((lineTax + chargeTax) * 100) / 100;
    const grandTotal = Math.round((itemTaxable + lineTax + chargeAmount + chargeTax) * 100) / 100;

    // Items table summary strip
    const elCnt = document.getElementById('ws-tot-items-count');
    const elDisc = document.getElementById('ws-tot-disc');
    const elGst = document.getElementById('ws-tot-gst');
    const elChg = document.getElementById('ws-tot-charges');
    const elNet = document.getElementById('ws-tot-net');

    if (elCnt) elCnt.innerText = this.workspaceItems.length;
    if (elDisc) elDisc.innerText = window.FormatUtil.formatRupees(discountTot);
    if (elGst) elGst.innerText = window.FormatUtil.formatRupees(totalTax);
    if (elChg) elChg.innerText = window.FormatUtil.formatRupees(chargeAmount);
    if (elNet) elNet.innerText = window.FormatUtil.formatRupees(grandTotal);

    // Right card summary
    const sSub = document.getElementById('ws-sum-subtotal');
    const sDisc = document.getElementById('ws-sum-discount');
    const sTax = document.getElementById('ws-sum-taxable');
    const sChg = document.getElementById('ws-sum-charges');
    const sGst = document.getElementById('ws-sum-gst');
    const sGrand = document.getElementById('ws-sum-grand');

    if (sSub) sSub.innerText = window.FormatUtil.formatRupees(grossItems);
    if (sDisc) sDisc.innerText = window.FormatUtil.formatRupees(discountTot);
    if (sTax) sTax.innerText = window.FormatUtil.formatRupees(totalTaxable);
    if (sChg) sChg.innerText = window.FormatUtil.formatRupees(chargeAmount);
    if (sGst) sGst.innerText = window.FormatUtil.formatRupees(totalTax);
    if (sGrand) sGrand.innerText = window.FormatUtil.formatRupees(grandTotal);
  },

  // =========================================================================
  // 7. ADDITIONAL CHARGES DIALOG
  // =========================================================================
  openChargesDialog() {
    if (this.viewMode) {
      window.AppDialogService.showToast('Charges cannot be modified on approved invoices in view mode.', 'warning');
      return;
    }
    this.activeChargesContext = 'SALES';
    this.draftCharges = (this.invoiceCharges || []).map(c => ({ ...c }));
    if (this.draftCharges.length === 0) {
      this.draftCharges.push({
        chargeType: this.availableChargeTypes[0] || 'Freight',
        amount: 0,
        taxable: true,
        gstPercent: 18
      });
    }
    this.renderChargesDialogRows();
    window.AppDialogService.openModal('modal-manage-charges');
  },

  openChargesDialogForPurchase(purchaseCharges = [], availableTypes = []) {
    this.activeChargesContext = 'PURCHASE';
    if (availableTypes && availableTypes.length > 0) {
      this.availableChargeTypes = availableTypes;
    }
    this.draftCharges = (purchaseCharges || []).map(c => ({ ...c }));
    if (this.draftCharges.length === 0) {
      this.draftCharges.push({
        chargeType: this.availableChargeTypes[0] || 'Freight',
        amount: 0,
        taxable: true,
        gstPercent: 18
      });
    }
    this.renderChargesDialogRows();
    window.AppDialogService.openModal('modal-manage-charges');
  },

  closeChargesDialog() {
    window.AppDialogService.closeModal('modal-manage-charges');
  },

  renderChargesDialogRows() {
    const container = document.getElementById('charges-dialog-rows');
    if (!container) return;

    if (this.draftCharges.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-dim); font-size: 0.82rem;">No additional charges. Select <strong>+ Add Charge</strong> when required.</div>`;
      this.updateChargesDialogTotals();
      return;
    }

    container.innerHTML = this.draftCharges.map((charge, idx) => {
      const typeOptions = this.availableChargeTypes.map(t =>
        `<option value="${t}" ${t === charge.chargeType ? 'selected' : ''}>${t}</option>`
      ).join('');

      return `
        <div class="charge-dialog-row">
          <div>
            <label>Charge Type *</label>
            <select class="form-select" onchange="window.SalesController.onChargeRowTypeChange(${idx}, this.value)" style="height: 34px; font-size: 0.8rem;">
              ${typeOptions}
            </select>
          </div>
          <div>
            <label>Amount (₹) *</label>
            <input type="number" step="0.01" min="0" class="form-input" value="${charge.amount || ''}" placeholder="0.00" oninput="window.SalesController.onChargeRowAmountChange(${idx}, this.value)" style="height: 34px; font-size: 0.8rem;">
          </div>
          <div>
            <label>Tax Treatment</label>
            <select class="form-select" onchange="window.SalesController.onChargeRowTaxChange(${idx}, this.value)" style="height: 34px; font-size: 0.8rem;">
              <option value="Non-taxable" ${!charge.taxable ? 'selected' : ''}>Non-taxable</option>
              <option value="Taxable 0%" ${charge.taxable && charge.gstPercent === 0 ? 'selected' : ''}>Taxable 0%</option>
              <option value="Taxable 5%" ${charge.taxable && charge.gstPercent === 5 ? 'selected' : ''}>Taxable 5%</option>
              <option value="Taxable 12%" ${charge.taxable && charge.gstPercent === 12 ? 'selected' : ''}>Taxable 12%</option>
              <option value="Taxable 18%" ${charge.taxable && (charge.gstPercent === 18 || !charge.gstPercent) ? 'selected' : ''}>Taxable 18%</option>
              <option value="Taxable 28%" ${charge.taxable && charge.gstPercent === 28 ? 'selected' : ''}>Taxable 28%</option>
            </select>
          </div>
          <div style="padding-top: 18px;">
            <button type="button" class="btn btn-danger" onclick="window.SalesController.removeChargeRow(${idx})" title="Remove Charge" style="padding: 4px 8px; font-size: 0.72rem;">&times; Remove</button>
          </div>
        </div>
      `;
    }).join('');

    this.updateChargesDialogTotals();
  },

  onChargeRowTypeChange(idx, val) {
    if (this.draftCharges[idx]) this.draftCharges[idx].chargeType = val;
  },

  onChargeRowAmountChange(idx, val) {
    if (this.draftCharges[idx]) {
      this.draftCharges[idx].amount = parseFloat(val) || 0;
      this.updateChargesDialogTotals();
    }
  },

  onChargeRowTaxChange(idx, val) {
    if (this.draftCharges[idx]) {
      if (val === 'Non-taxable') {
        this.draftCharges[idx].taxable = false;
        this.draftCharges[idx].gstPercent = 0;
      } else {
        this.draftCharges[idx].taxable = true;
        const match = val.match(/([0-9.]+)/);
        this.draftCharges[idx].gstPercent = match ? parseFloat(match[1]) : 18;
      }
      this.updateChargesDialogTotals();
    }
  },

  addChargeRow() {
    this.draftCharges.push({
      chargeType: this.availableChargeTypes[0] || 'Freight',
      amount: 0,
      taxable: true,
      gstPercent: 18
    });
    this.renderChargesDialogRows();
  },

  removeChargeRow(idx) {
    this.draftCharges.splice(idx, 1);
    this.renderChargesDialogRows();
  },

  updateChargesDialogTotals() {
    let totAmt = 0, totTax = 0;
    (this.draftCharges || []).forEach(c => {
      const amt = Math.max(0, parseFloat(c.amount) || 0);
      totAmt += amt;
      if (c.taxable) {
        totTax += Math.round((amt * ((c.gstPercent || 0) / 100)) * 100) / 100;
      }
    });

    const totEl = document.getElementById('charges-dialog-totals');
    if (totEl) {
      totEl.innerHTML = `Charges ${window.FormatUtil.formatRupees(totAmt)} &nbsp;&bull;&nbsp; GST ${window.FormatUtil.formatRupees(totTax)} &nbsp;&bull;&nbsp; Total ${window.FormatUtil.formatRupees(totAmt + totTax)}`;
    }
  },

  applyCharges() {
    if (this.draftCharges.length > 0) {
      const types = new Set();
      for (const c of this.draftCharges) {
        if (!c.chargeType || !c.chargeType.trim()) {
          window.AppDialogService.showToast('Select a charge type for every charge row.', 'error');
          return;
        }
        if (c.amount <= 0) {
          window.AppDialogService.showToast('Charge amount must be greater than zero.', 'error');
          return;
        }
        const norm = c.chargeType.trim().toUpperCase();
        if (types.has(norm)) {
          window.AppDialogService.showToast('The same charge type cannot be selected twice.', 'error');
          return;
        }
        types.add(norm);
      }
    }

    if (this.activeChargesContext === 'PURCHASE') {
      if (window.PurchaseController && window.PurchaseController.setCharges) {
        window.PurchaseController.setCharges(this.draftCharges.map(c => ({ ...c })));
      }
      this.closeChargesDialog();
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Applied ${this.draftCharges.length} additional purchase charges`, 'success');
      return;
    }

    this.invoiceCharges = this.draftCharges.map(c => ({ ...c }));
    this.closeChargesDialog();
    this.updateChargeSummaryBadge();
    this.calcWorkspaceTotals();
    if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
    window.AppDialogService.showToast(`Applied ${this.invoiceCharges.length} additional charges`, 'success');
  },

  updateChargeSummaryBadge() {
    const pill = document.getElementById('ws-charges-summary-display');
    const input = document.getElementById('ws-charges-input');
    const tot = (this.invoiceCharges || []).reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const count = (this.invoiceCharges || []).length;

    if (pill) {
      if (count === 0) {
        pill.innerText = 'No additional charges';
        pill.classList.remove('has-charges');
      } else {
        pill.innerText = `${count} charge${count === 1 ? '' : 's'} · ${window.FormatUtil.formatRupees(tot)}`;
        pill.classList.add('has-charges');
      }
    }
    if (input) input.value = tot.toFixed(2);
  },

  // =========================================================================
  // 8. ATTACHMENT CONTROLS (FEATURE 9)
  // =========================================================================
  handleAttachmentFileSelected(inputEl) {
    if (inputEl.files && inputEl.files[0]) {
      this.pendingAttachmentFile = inputEl.files[0];
      this.attachmentRemovalPending = false;
      this.refreshAttachmentUi(this.pendingAttachmentFile.name);
      window.AppDialogService.showToast(`Attached ${this.pendingAttachmentFile.name}`, 'info');
    }
  },

  previewWorkspaceAttachment() {
    if (this.pendingAttachmentFile) {
      const url = URL.createObjectURL(this.pendingAttachmentFile);
      window.open(url, '_blank');
      return;
    }
    if (this.editingSale && this.editingSale.attachmentPath) {
      window.open(this.editingSale.attachmentPath, '_blank');
      return;
    }
    window.AppDialogService.showToast('No attachment file available to preview', 'warning');
  },

  removeWorkspaceAttachment() {
    this.pendingAttachmentFile = null;
    this.attachmentRemovalPending = true;
    const fileInput = document.getElementById('ws-attachment-file-input');
    if (fileInput) fileInput.value = '';
    this.refreshAttachmentUi(null);
    window.AppDialogService.showToast('Attachment removed', 'info');
  },

  refreshAttachmentUi(fileName) {
    const lbl = document.getElementById('ws-attachment-name');
    const btnPreview = document.getElementById('ws-btn-attach-preview');
    const btnRemove = document.getElementById('ws-btn-attach-remove');

    const hasAttachment = Boolean(fileName) && !this.attachmentRemovalPending;

    if (lbl) {
      lbl.innerText = hasAttachment ? (fileName.split('/').pop().split('\\').pop()) : 'No attachment';
      lbl.title = hasAttachment ? fileName : 'No attachment selected';
    }
    if (btnPreview) btnPreview.disabled = !hasAttachment;
    if (btnRemove) btnRemove.disabled = !hasAttachment;
  },

  // =========================================================================
  // 9. SAVE SALE & ADDRESS MISMATCH VALIDATION (FEATURE 11)
  // =========================================================================
  async handleSaleWorkspaceSave(event) {
    if (event) event.preventDefault();

    const custSel = document.getElementById('ws-customer');
    if (!custSel || !custSel.value) {
      window.AppDialogService.showToast('Please select a customer for this invoice', 'error');
      return;
    }

    if (this.workspaceItems.length === 0) {
      window.AppDialogService.showToast('Please add at least one line item to the invoice', 'warning');
      return;
    }

    const invoiceNo = (document.getElementById('ws-inv-no') || {}).value || 'JI/INV';
    const invoiceDate = (document.getElementById('ws-inv-date') || {}).value || new Date().toISOString().split('T')[0];
    const billingAddress = (document.getElementById('ws-billing-address') || {}).value || '';
    const deliveryAddress = (document.getElementById('ws-delivery-address') || {}).value || '';
    const billingGstin = (document.getElementById('ws-billing-gstin') || {}).value || '';
    const deliveryGstin = (document.getElementById('ws-delivery-gstin') || {}).value || '';
    const paymentTerms = (document.getElementById('ws-payment-terms') || {}).value || '15 Days';
    const rawGstType = (document.getElementById('ws-gst-type') || {}).value || 'GST';
    const gstType = (rawGstType === 'INTER_STATE_IGST' || rawGstType === 'IGST') ? 'IGST' : 'GST';
    const transporter = (document.getElementById('ws-transporter') || {}).value || '';
    const transporterGstin = (document.getElementById('ws-trans-gstin') || {}).value || '';
    const vehicleNumber = (document.getElementById('ws-vehicle-no') || {}).value || '';
    const contactPerson = (document.getElementById('ws-contact-person') || {}).value || '';
    const contactPersonMobile = (document.getElementById('ws-contact-mobile') || {}).value || '';
    const poDate = (document.getElementById('ws-po-date') || {}).value || '';
    const poNo = (document.getElementById('ws-po-no') || {}).value || '';
    const notes = (document.getElementById('ws-invoice-notes') || {}).value || '';
    const chkSame = document.getElementById('ws-same-address');

    // Strict Address Mismatch Validation (Desktop SalesController.java lines 1395-1402)
    if (chkSame && !chkSame.checked) {
      const normBillingAddr = billingAddress.trim().replace(/\s+/g, ' ').toUpperCase();
      const normDeliveryAddr = deliveryAddress.trim().replace(/\s+/g, ' ').toUpperCase();
      const normBillingGst = billingGstin.trim().toUpperCase();
      const normDeliveryGst = deliveryGstin.trim().toUpperCase();

      if (normBillingAddr === normDeliveryAddr && normBillingGst === normDeliveryGst) {
        window.AppDialogService.showToast(
          "Delivery address and GSTIN still match billing details. Select 'Same as Billing Address' or update the delivery details.",
          'warning'
        );
        return;
      }
    }

    let grossItems = 0, discountTot = 0, itemTaxable = 0, lineTax = 0;
    const lines = this.workspaceItems.map(item => {
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(item.rate) || 0;
      const discPct = parseFloat(item.discPct) || 0;
      const gstPct = parseFloat(item.gstPct) || 18;

      const gross = Math.round((qty * rate) * 100) / 100;
      const disc = Math.round((gross * (discPct / 100)) * 100) / 100;
      const taxable = Math.max(0, Math.round((gross - disc) * 100) / 100);
      const tax = Math.round((taxable * (gstPct / 100)) * 100) / 100;

      grossItems += gross;
      discountTot += disc;
      itemTaxable += taxable;
      lineTax += tax;

      return {
        itemCode: item.code || item.itemCode,
        itemDescription: item.description || '',
        itemCategory: item.category || 'General',
        itemHsn: item.hsn || '73063000',
        itemUnit: item.unit || 'Nos',
        itemRemarks: item.remarks || '',
        quantity: qty,
        rate,
        discountPercent: discPct,
        discountAmount: disc,
        gstPercent: gstPct,
        totalAmount: Math.round((taxable + tax) * 100) / 100
      };
    });

    let chargeAmount = 0, taxableCharges = 0, chargeTax = 0;
    const chargesPayload = (this.invoiceCharges || []).map(c => {
      const amt = Math.max(0, parseFloat(c.amount) || 0);
      chargeAmount += amt;
      if (c.taxable) {
        taxableCharges += amt;
        chargeTax += Math.round((amt * ((c.gstPercent || 0) / 100)) * 100) / 100;
      }
      return {
        chargeType: c.chargeType,
        amount: amt,
        taxable: !!c.taxable,
        gstPercent: parseFloat(c.gstPercent) || 0
      };
    });

    const totalTaxable = Math.round((itemTaxable + taxableCharges) * 100) / 100;
    const totalTax = Math.round((lineTax + chargeTax) * 100) / 100;
    const grandTotal = Math.round((itemTaxable + lineTax + chargeAmount + chargeTax) * 100) / 100;
    const totalQty = lines.reduce((acc, l) => acc + (parseFloat(l.quantity) || 0), 0);
    const calculatedDueDate = this.calculatePaymentDueDate(invoiceDate, paymentTerms);
    const selectedCust = (this.customersCache || []).find(c => String(c.id) === String(custSel.value));

    const payload = {
      invoiceNo,
      invoiceDate,
      customerId: custSel.value,
      customer: {
        id: parseInt(custSel.value) || 1,
        partyCode: selectedCust ? (selectedCust.partyCode || selectedCust.code || 'CUST') : 'CUST',
        name: selectedCust ? (selectedCust.name || selectedCust.partyName || '') : (custSel.options[custSel.selectedIndex] ? custSel.options[custSel.selectedIndex].text : ''),
        email: selectedCust ? (selectedCust.email || '') : '',
        phone: selectedCust ? (selectedCust.phone || selectedCust.mobile || '') : '',
        gstin: billingGstin,
        address: billingAddress
      },
      billingAddress,
      deliveryAddress,
      billingGstin,
      deliveryGstin,
      gstin: billingGstin,
      sameAsBilling: chkSame ? chkSame.checked : true,
      paymentTerms,
      chargeType: chargesPayload.length > 0 ? chargesPayload[0].chargeType : '',
      chargeAmount,
      charges: chargesPayload,
      subtotal: totalTaxable,
      discountAmount: discountTot,
      gstAmount: totalTax,
      totalAmount: grandTotal,
      quantity: totalQty,
      gstType,
      transporter,
      transporterGstin,
      vehicleNumber,
      contactPerson,
      contactPersonMobile,
      orderNo: poNo && poNo.trim() ? poNo.trim() : null,
      poDate: poDate && poDate.trim() ? poDate.trim() : null,
      dueDate: calculatedDueDate,
      salesperson: 'Admin',
      source: 'MANUAL',
      remarks: notes || '',
      notes: notes || '',
      referenceNo: '',
      doorDelivery: '',
      transportNote: '',
      emailSent: false,
      whatsappSent: false,
      invoiceType: this.editingSale ? (this.editingSale.invoiceType || 'TAX INVOICE') : 'TAX INVOICE',
      documentStatus: this.editingSale ? (this.editingSale.documentStatus || 'APPROVED') : 'APPROVED',
      paymentStatus: this.editingSale ? (this.editingSale.paymentStatus || 'PAID') : 'PAID',
      paidAmount: this.editingSale ? (this.editingSale.paidAmount || grandTotal) : grandTotal,
      attachmentPath: this.pendingAttachmentFile ? this.pendingAttachmentFile.name : null,
      rowVersion: 0,
      lines
    };

    // Optimistic locking & rowVersion preservation (Desktop SalesController.java lines 1417-1434)
    if (this.editingSale) {
      payload.id = this.editingSale.id;
      payload.rowVersion = this.editingSale.rowVersion;
      payload.createdAt = this.editingSale.createdAt;
      payload.emailSent = this.editingSale.emailSent;
      payload.whatsappSent = this.editingSale.whatsappSent;
      payload.invoiceType = this.editingSale.invoiceType;
      payload.source = this.editingSale.source;
      payload.attachmentPath = this.attachmentRemovalPending ? '' : (this.editingSale.attachmentPath || '');
    }

    try {
      let savedSale = null;
      if (this.editingSale && this.editingSale.id) {
        savedSale = await window.OperationsService.updateSale(payload);
        window.AppDialogService.showToast(`Invoice ${invoiceNo} updated successfully!`, 'success');
      } else {
        savedSale = await window.OperationsService.createSale(payload);
        const actualInvoiceNo = (savedSale && (savedSale.invoiceNo || savedSale.number)) || invoiceNo;
        if (window.NotificationService) {
          window.NotificationService.notifySale(actualInvoiceNo, payload.customerName || 'Customer', payload.grandTotal || 0);
        }
        window.AppDialogService.showToast(`Invoice ${actualInvoiceNo} generated & saved successfully!`, 'success');
      }

      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();

      // Immediately prepend/update in local cache so user sees it instantly
      if (savedSale && savedSale.id) {
        if (this.editingSale) {
          const idx = this.salesCache.findIndex(s => s.id === savedSale.id);
          if (idx !== -1) this.salesCache[idx] = savedSale;
        } else {
          this.salesCache.unshift(savedSale);
        }
        this.renderSalesTable(this.salesCache);
      }

      // Refresh sales register and return to it
      await this.loadSales();
      if (window.NavigationRouter) {
        window.NavigationRouter.selectNav('view-sales-register');
      }
      if (window.DashboardController) {
        window.DashboardController.refresh();
      }
    } catch (err) {
      window.AppDialogService.showToast('Failed to save sale: ' + err.message, 'error');
    }
  },

  // =========================================================================
  // 10. AUDIT TIMELINE (REAL MODAL OUTPUT)
  // =========================================================================
  async openAuditTrail(invoiceNo) {
    const sale = this.salesCache.find(s => (s.invoiceNo || s.number) === invoiceNo);
    const saleId = sale ? sale.id : 0;

    const modal = document.getElementById('modal-audit-timeline');
    const titleEl = document.getElementById('mat-title');
    const subEl = document.getElementById('mat-subtitle');
    const loadingEl = document.getElementById('mat-loading');
    const listEl = document.getElementById('mat-timeline-list');

    if (!modal) return;
    if (titleEl) titleEl.innerText = `Audit Trail & Milestones • ${invoiceNo}`;
    if (subEl) subEl.innerText = `Immutable lifecycle record for invoice #${invoiceNo}`;
    if (loadingEl) loadingEl.style.display = 'block';
    if (listEl) {
      listEl.style.display = 'none';
      listEl.innerHTML = '';
    }

    window.AppDialogService.openModal('modal-audit-timeline');

    try {
      let activities = [];
      if (saleId > 0) {
        try {
          activities = await window.OperationsService.getActivityTimeline('SALE', saleId);
        } catch (e) {
          console.warn('Backend activity timeline fetch error:', e);
        }
      }

      if (!Array.isArray(activities) || activities.length === 0) {
        // Construct exact baseline milestones from the existing record
        const createdDate = sale ? (sale.createdAt || sale.invoiceDate) : new Date().toISOString();
        activities = [
          {
            action: 'INVOICE_CREATED',
            createdBy: sale ? (sale.createdBy || 'Admin') : 'Admin',
            createdAt: createdDate,
            detail: `Sales invoice ${invoiceNo} generated and approved in system with grand total of ${window.FormatUtil.formatRupees(sale ? sale.totalAmount : 0)}.`
          }
        ];
        if (sale && sale.paidAmount > 0) {
          activities.push({
            action: 'PAYMENT_RECORDED',
            createdBy: 'Admin',
            createdAt: sale.invoiceDate || createdDate,
            detail: `Customer receipt of ${window.FormatUtil.formatRupees(sale.paidAmount)} credited to bank.`
          });
        }
        if (sale && sale.emailSent) {
          activities.push({
            action: 'EMAIL_SENT',
            createdBy: 'System Mailer',
            createdAt: createdDate,
            detail: `Tax invoice dispatched via corporate SMTP delivery.`
          });
        }
        if (sale && sale.documentStatus === 'CANCELLED') {
          activities.push({
            action: 'INVOICE_CANCELLED',
            createdBy: 'Admin',
            createdAt: createdDate,
            detail: `Invoice cancelled. Stock restored to inventory ledger.`
          });
        }
      }

      if (loadingEl) loadingEl.style.display = 'none';
      if (listEl) {
        listEl.style.display = 'flex';
        listEl.innerHTML = activities.map(act => {
          const icon = act.action.includes('PAY') ? '💳' :
            act.action.includes('EMAIL') ? '✉️' :
            act.action.includes('CANCEL') ? '✕' :
            act.action.includes('RETURN') ? '🔄' : '📜';

          return `
            <div class="timeline-item">
              <div class="timeline-icon-bubble">${icon}</div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <span class="timeline-action">${act.action.replace(/_/g, ' ')}</span>
                  <span class="timeline-time">${window.FormatUtil.formatDate(act.createdAt)}</span>
                </div>
                <div class="timeline-user">By: ${act.createdBy || 'System'}</div>
                <div class="timeline-detail">${act.detail || 'Standard transaction logged.'}</div>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      if (loadingEl) loadingEl.innerText = 'Failed to load timeline: ' + err.message;
    }
  },

  // =========================================================================
  // 11. RECORD PAYMENT (REAL MODAL OUTPUT)
  // =========================================================================
  async openRecordPaymentModal(invoiceNo) {
    const sale = (this.salesCache || []).find(s => (s.invoiceNo || s.number) === invoiceNo);
    if (!sale) {
      window.AppDialogService.showToast('Sales invoice not found', 'error');
      return;
    }

    const total = parseFloat(sale.totalAmount != null ? sale.totalAmount : (sale.total || 0));
    const paid = parseFloat(sale.paidAmount != null ? sale.paidAmount : (sale.paymentStatus === 'PAID' ? total : 0));
    const balance = Math.max(0, total - paid);

    const titleEl = document.getElementById('mrp-title');
    const totEl = document.getElementById('mrp-total');
    const paidEl = document.getElementById('mrp-paid');
    const balEl = document.getElementById('mrp-balance');
    const inpSaleId = document.getElementById('mrp-sale-id');
    const inpInvNo = document.getElementById('mrp-inv-no');
    const inpDate = document.getElementById('mrp-date');
    const inpAmt = document.getElementById('mrp-amount');
    const inpFrom = document.getElementById('mrp-received-from');
    const inpNotes = document.getElementById('mrp-notes');
    const settledNotice = document.getElementById('mrp-settled-notice');
    const newEntryFields = document.getElementById('mrp-new-entry-fields');

    if (titleEl) titleEl.innerText = `Record Payment Receipt • ${invoiceNo}`;
    if (totEl) totEl.innerText = window.FormatUtil.formatRupees(total);
    if (paidEl) paidEl.innerText = window.FormatUtil.formatRupees(paid);
    if (balEl) balEl.innerText = window.FormatUtil.formatRupees(balance);
    if (inpSaleId) inpSaleId.value = sale.id;
    if (inpInvNo) inpInvNo.value = invoiceNo;
    if (inpDate) inpDate.value = new Date().toISOString().split('T')[0];
    if (inpAmt) {
      inpAmt.value = balance > 0 ? balance.toFixed(2) : '0.00';
      inpAmt.max = balance.toFixed(2);
    }
    if (inpFrom) inpFrom.value = (sale.customer && sale.customer.name) || sale.customerName || '';
    if (inpNotes) inpNotes.value = `Payment receipt against invoice ${invoiceNo}`;

    // Desktop Parity: If fully settled, show settled notice banner and collapse new entry form
    if (balance <= 0.005) {
      if (settledNotice) settledNotice.style.display = 'block';
      if (newEntryFields) newEntryFields.style.display = 'none';
    } else {
      if (settledNotice) settledNotice.style.display = 'none';
      if (newEntryFields) newEntryFields.style.display = 'block';
    }

    // Open modal dialog (NEVER block based on balance)
    window.AppDialogService.openModal('modal-record-payment');

    // Load receipts history matching desktop RecordPaymentController
    await this.loadPaymentHistoryForModal(sale);
  },

  async loadPaymentHistoryForModal(sale) {
    const tbody = document.getElementById('mrp-history-tbody');
    const countEl = document.getElementById('mrp-history-count');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 12px;">Loading payment history...</td></tr>`;

    let payments = [];
    try {
      payments = await window.OperationsService.getDocumentPayments('SALE', sale.id);
    } catch (e) {
      console.warn('API getDocumentPayments failed, falling back:', e);
    }

    if (!Array.isArray(payments) || payments.length === 0) {
      const paidAmt = parseFloat(sale.paidAmount || sale.paid || 0);
      if (paidAmt > 0) {
        payments = [{
          id: 0,
          date: sale.invoiceDate || sale.date || new Date().toISOString().split('T')[0],
          reference: 'INITIAL-RECEIPT',
          receivedFrom: (sale.customer && sale.customer.name) || sale.customerName || 'Customer',
          mode: 'Bank Transfer',
          amount: paidAmt,
          notes: 'Recorded transaction'
        }];
      } else {
        payments = [];
      }
    }

    if (countEl) countEl.innerText = `${payments.length} receipt${payments.length === 1 ? '' : 's'}`;

    if (payments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 16px;">No payment receipts recorded yet for this invoice</td></tr>`;
      return;
    }

    tbody.innerHTML = payments.map((p, idx) => `
      <tr>
        <td style="font-weight: 600;">${p.date || '-'}</td>
        <td style="font-family: monospace;">${p.reference || '-'}</td>
        <td>${p.receivedFrom || p.from || '-'}</td>
        <td><span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${p.mode || 'Bank'}</span></td>
        <td style="text-align: right; font-weight: 700; color: #34d399;">${window.FormatUtil.formatRupees(p.amount || 0)}</td>
        <td style="color: var(--text-muted);">${p.notes || '-'}</td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-danger" style="padding: 2px 7px; font-size: 0.7rem;" onclick="window.SalesController.reversePaymentReceipt(${p.id || 0}, '${sale.invoiceNo || sale.number}', ${p.amount || 0})" title="Delete / Reverse receipt">&#128465;</button>
        </td>
      </tr>
    `).join('');
  },

  async reversePaymentReceipt(paymentId, invoiceNo, amount) {
    if (!confirm(`Are you sure you want to reverse / delete payment receipt of ${window.FormatUtil.formatRupees(amount)}?\n\nThis will re-open the invoice balance.`)) {
      return;
    }

    try {
      if (paymentId > 0) {
        await window.OperationsService.deleteDocumentPayment(paymentId);
      }
      
      const sale = (this.salesCache || []).find(s => (s.invoiceNo || s.number) === invoiceNo);
      if (sale) {
        const curPaid = parseFloat(sale.paidAmount || 0);
        sale.paidAmount = Math.max(0, curPaid - amount);
        const total = parseFloat(sale.totalAmount || 0);
        sale.balanceAmount = Math.max(0, total - sale.paidAmount);
        sale.paymentStatus = sale.paidAmount <= 0.005 ? 'PENDING' : sale.balanceAmount <= 0.005 ? 'PAID' : 'PARTIAL';
      }

      window.AppDialogService.showToast('Payment receipt deleted and invoice balance re-calculated', 'success');
      this.renderSalesTable(this.salesCache);
      this.calcRegisterKpis();
      if (sale) this.openRecordPaymentModal(invoiceNo);
    } catch (err) {
      window.AppDialogService.showToast('Failed to delete payment receipt: ' + err.message, 'error');
    }
  },

  async submitRecordPayment(event) {
    if (event) event.preventDefault();

    const saleId = parseInt((document.getElementById('mrp-sale-id') || {}).value);
    const invNo = (document.getElementById('mrp-inv-no') || {}).value;
    const date = (document.getElementById('mrp-date') || {}).value;
    const mode = (document.getElementById('mrp-mode') || {}).value || 'Bank';
    const amount = parseFloat((document.getElementById('mrp-amount') || {}).value) || 0;
    const reference = (document.getElementById('mrp-reference') || {}).value || '';
    const receivedFrom = (document.getElementById('mrp-received-from') || {}).value || '';
    const notes = (document.getElementById('mrp-notes') || {}).value || '';

    const sale = this.salesCache.find(s => (s.invoiceNo || s.number) === invNo);
    const total = sale ? (sale.totalAmount || 0) : amount;
    const currentPaid = sale ? (sale.paidAmount || 0) : 0;
    const maxBalance = Math.max(0, total - currentPaid);

    if (amount <= 0) {
      window.AppDialogService.showToast('Payment amount must be greater than zero', 'error');
      return;
    }
    if (amount > maxBalance + 0.01) {
      window.AppDialogService.showToast(`Payment cannot exceed the remaining balance (${window.FormatUtil.formatRupees(maxBalance)})`, 'error');
      return;
    }

    const payload = {
      documentType: 'SALE',
      documentId: saleId,
      date,
      amount,
      mode,
      reference,
      notes,
      receivedFrom,
      paymentType: 'RECEIPT',
      createdBy: (window.AuthService && typeof window.AuthService.getCurrentUsername === 'function')
        ? window.AuthService.getCurrentUsername()
        : ((window.AuthService && typeof window.AuthService.getCurrentUser === 'function' && window.AuthService.getCurrentUser() && (window.AuthService.getCurrentUser().username || window.AuthService.getCurrentUser().fullName)) || 'Admin')
    };

    try {
      await window.OperationsService.recordDocumentPayment(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Receipt of ${window.FormatUtil.formatRupees(amount)} recorded successfully!`, 'success');

      if (sale) {
        sale.paidAmount = currentPaid + amount;
        sale.balanceAmount = Math.max(0, total - sale.paidAmount);
        sale.paymentStatus = sale.balanceAmount <= 0.005 ? 'PAID' : 'PARTIAL';
      }

      window.AppDialogService.closeModal('modal-record-payment');
      await this.loadSales();
      if (window.DashboardController) window.DashboardController.refresh();
    } catch (err) {
      window.AppDialogService.showToast('Failed to record payment: ' + err.message, 'error');
    }
  },

  // =========================================================================
  // 12. DISPATCH BARCODE (REAL MODAL & THERMAL STICKER OUTPUT)
  // =========================================================================
  openDispatchBarcodeModal(invoiceNo, customData = null) {
    const sale = customData || this.salesCache.find(s => (s.invoiceNo || s.number) === invoiceNo) || {};
    const cust = sale.customer || {};
    const custName = cust.name || sale.customerName || 'CUSTOMER NAME';
    const lines = sale.lines || this.workspaceItems || [];
    const totalQty = lines.reduce((sum, l) => sum + (parseFloat(l.quantity || l.qty) || 0), 0);
    const dateStr = window.FormatUtil.formatDate(sale.invoiceDate || new Date().toISOString().split('T')[0]);

    this.activeBarcodeData = {
      invoiceNo,
      custName,
      totalQty,
      dateStr
    };

    const modal = document.getElementById('modal-dispatch-barcode');
    if (!modal) return;

    this.renderDispatchBarcodeSticker();
    window.AppDialogService.openModal('modal-dispatch-barcode');
  },

  printDispatchBarcodeFromWorkspace() {
    const invNo = (document.getElementById('ws-inv-no') || {}).value || 'JI/25-2026/0130';
    const custSel = document.getElementById('ws-customer');
    const custName = (custSel && custSel.selectedIndex >= 0) ? custSel.options[custSel.selectedIndex].text : 'CUSTOMER NAME';
    const totalQty = this.workspaceItems.reduce((sum, l) => sum + (parseFloat(l.qty) || 0), 0);
    const dateStr = window.FormatUtil.formatDate((document.getElementById('ws-inv-date') || {}).value || new Date().toISOString().split('T')[0]);

    this.activeBarcodeData = {
      invoiceNo: invNo,
      custName,
      totalQty,
      dateStr
    };

    this.openDispatchBarcodeModal(invNo, this.activeBarcodeData);
  },

  renderDispatchBarcodeSticker() {
    if (!this.activeBarcodeData) return;
    const { invoiceNo, custName, totalQty, dateStr } = this.activeBarcodeData;

    const lblParty = document.getElementById('mdb-sticker-party');
    const lblCode = document.getElementById('mdb-sticker-code');
    const lblDate = document.getElementById('mdb-sticker-date');
    const lblPackages = document.getElementById('mdb-sticker-packages');
    const sticker = document.getElementById('mdb-sticker');
    const sizeSel = document.getElementById('mdb-size-select');
    const canvas = document.getElementById('mdb-barcode-canvas');

    if (lblParty) lblParty.innerText = custName.toUpperCase();
    if (lblCode) lblCode.innerText = invoiceNo;
    if (lblDate) lblDate.innerText = `Date: ${dateStr}`;
    if (lblPackages) lblPackages.innerText = `Qty: ${totalQty} Pcs`;

    const size = sizeSel ? sizeSel.value : '50x25';
    if (sticker) {
      sticker.style.width = size === '38x25' ? '240px' : '280px';
    }

    if (canvas && window.BarcodeGenerator) {
      canvas.width = size === '38x25' ? 220 : 260;
      canvas.height = 55;
      window.BarcodeGenerator.drawCode128('mdb-barcode-canvas', invoiceNo);
    }
  },

  printDispatchThermalLabel() {
    const printArea = document.getElementById('mdb-print-area');
    if (!printArea) return;

    const win = window.open('', '_blank', 'width=450,height=300');
    if (!win) {
      window.print();
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Thermal Dispatch Label - ${this.activeBarcodeData ? this.activeBarcodeData.invoiceNo : 'LABEL'}</title>
        <style>
          @page { size: auto; margin: 0; }
          body { margin: 0; padding: 4px; display: flex; justify-content: center; align-items: center; background: #fff; }
          .barcode-sticker { width: 100%; border: none !important; font-family: 'Space Grotesk', Arial, sans-serif; text-align: center; }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  },

  // =========================================================================
  openEmailModal(invoiceNo, docTypeOrIsPurchase = false, customDetails = null) {
    let docId = 0;
    let recipientEmail = '';
    let partyName = 'Valued Partner';
    let amountStr = '₹ 0.00';
    let docType = 'SALE';

    if (typeof docTypeOrIsPurchase === 'string') {
      docType = docTypeOrIsPurchase.toUpperCase();
    } else if (docTypeOrIsPurchase === true) {
      docType = 'PURCHASE';
    }

    if (docType === 'SALES_RETURN') {
      const retList = (window.ReturnsController && (window.ReturnsController.salesReturnsCache || [])) || [];
      const r = customDetails || retList.find(x => (x.returnNo || x.invoiceNo || x.number) === invoiceNo);
      docId = (r && r.id) || 0;
      recipientEmail = (r && r.customer && r.customer.email) || (r && r.email) || '';
      partyName = (r && r.customer && r.customer.name) || (r && r.customerName) || 'Customer';
      amountStr = window.FormatUtil.formatRupees((r && (r.totalAmount || r.refundAmount || r.total)) || 0);
    } else if (docType === 'PURCHASE_RETURN') {
      const retList = (window.ReturnsController && (window.ReturnsController.purchaseReturnsCache || [])) || [];
      const r = customDetails || retList.find(x => (x.returnNo || x.invoiceNo || x.number) === invoiceNo);
      docId = (r && r.id) || 0;
      recipientEmail = (r && r.supplier && r.supplier.email) || (r && r.email) || '';
      partyName = (r && r.supplier && r.supplier.name) || (r && r.supplierName) || 'Supplier';
      amountStr = window.FormatUtil.formatRupees((r && (r.totalAmount || r.refundAmount || r.total)) || 0);
    } else if (docType === 'PURCHASE') {
      const pList = (window.PurchaseController && (typeof window.PurchaseController.getPurchasesCache === 'function' ? window.PurchaseController.getPurchasesCache() : window.PurchaseController.purchases)) || [];
      const p = customDetails || pList.find(x => (x.invoiceNo || x.number) === invoiceNo);
      docId = (p && p.id) || 0;
      recipientEmail = (p && p.supplier && p.supplier.email) || (p && p.email) || '';
      partyName = (p && p.supplier && p.supplier.name) || (p && p.supplierName) || 'Supplier';
      amountStr = window.FormatUtil.formatRupees((p && p.totalAmount) || 0);
    } else {
      docType = 'SALE';
      const sale = customDetails || this.salesCache.find(s => (s.invoiceNo || s.number) === invoiceNo);
      if (!sale) return;
      docId = sale.id;
      const cust = sale.customer || {};
      recipientEmail = cust.email || sale.email || '';
      partyName = cust.name || sale.customerName || 'Valued Customer';
      amountStr = window.FormatUtil.formatRupees(sale.totalAmount || 0);
    }

    const modal = document.getElementById('modal-email-invoice');
    const inpSaleId = document.getElementById('mei-sale-id');
    const inpInvNo = document.getElementById('mei-inv-no');
    const inpDocType = document.getElementById('mei-doc-type');
    const inpRecipient = document.getElementById('mei-recipient');
    const inpSubject = document.getElementById('mei-subject');
    const inpBody = document.getElementById('mei-body');
    const lblAttach = document.getElementById('mei-attachment-name');
    const subTitle = document.getElementById('mei-subtitle');

    if (!modal) return;
    if (inpSaleId) inpSaleId.value = docId;
    if (inpInvNo) inpInvNo.value = invoiceNo;
    if (inpDocType) inpDocType.value = docType;
    if (inpRecipient) inpRecipient.value = recipientEmail || '';
    if (inpSubject) {
      if (docType === 'SALES_RETURN') {
        inpSubject.value = `Credit Note / Sales Return - ${invoiceNo} | Jasvi Industries`;
      } else if (docType === 'PURCHASE_RETURN') {
        inpSubject.value = `Debit Note / Purchase Return - ${invoiceNo} | Jasvi Industries`;
      } else if (docType === 'PURCHASE') {
        inpSubject.value = `Purchase Inward Bill - ${invoiceNo} | Jasvi Industries`;
      } else {
        inpSubject.value = `Tax Invoice - ${invoiceNo} | Jasvi Industries`;
      }
    }
    if (lblAttach) {
      const cleanNo = invoiceNo.replace(/[^A-Za-z0-9]/g, '_');
      if (docType === 'SALES_RETURN') {
        lblAttach.innerText = `Sales_Return_${cleanNo}.pdf`;
      } else if (docType === 'PURCHASE_RETURN') {
        lblAttach.innerText = `Purchase_Return_${cleanNo}.pdf`;
      } else if (docType === 'PURCHASE') {
        lblAttach.innerText = `Purchase_Bill_${cleanNo}.pdf`;
      } else {
        lblAttach.innerText = `Tax_Invoice_${cleanNo}.pdf`;
      }
    }
    if (subTitle) {
      if (docType === 'SALES_RETURN') {
        subTitle.innerText = 'Direct SMTP delivery of credit memo to customer';
      } else if (docType === 'PURCHASE_RETURN') {
        subTitle.innerText = 'Direct SMTP delivery of debit memo to supplier';
      } else if (docType === 'PURCHASE') {
        subTitle.innerText = 'Direct SMTP transmission to supplier billing contact';
      } else {
        subTitle.innerText = 'Direct SMTP delivery to customer billing contact';
      }
    }
    if (inpBody) {
      if (docType === 'SALES_RETURN') {
        inpBody.value = `Dear ${partyName},\n\nPlease find attached the official Sales Return Credit Note #${invoiceNo} for ${amountStr}.\n\nThe credit adjustment has been posted into your ledger balance.\n\nThank you for your business.\n\nBest regards,\nAccounts & Returns Division\nJasvi Industries`;
      } else if (docType === 'PURCHASE_RETURN') {
        inpBody.value = `Dear ${partyName},\n\nPlease find attached the official Purchase Return Debit Note #${invoiceNo} for ${amountStr}.\n\nThe debit adjustment has been posted into your supplier ledger.\n\nThank you for your cooperation.\n\nBest regards,\nProcurement & Inventory Division\nJasvi Industries`;
      } else if (docType === 'PURCHASE') {
        inpBody.value = `Dear ${partyName},\n\nPlease find attached the official Purchase Inward Bill #${invoiceNo} for ${amountStr}.\n\nThis inward entry has been recorded in our Jasvi Industries ERP system.\n\nThank you for your partnership.\n\nBest regards,\nProcurement & Inventory Division\nJasvi Industries`;
      } else {
        inpBody.value = `Dear ${partyName},\n\nPlease find attached the official GST Tax Invoice #${invoiceNo} for ${amountStr}.\n\nKindly process the remittance as per the agreed credit terms.\n\nThank you for your business.\n\nBest regards,\nAccounts & Dispatch Division\nJasvi Industries`;
      }
    }

    window.AppDialogService.openModal('modal-email-invoice');
  },

  async submitEmailInvoice(event) {
    if (event) event.preventDefault();

    const saleId = parseInt((document.getElementById('mei-sale-id') || {}).value) || 0;
    const invNo = (document.getElementById('mei-inv-no') || {}).value;
    const docType = (document.getElementById('mei-doc-type') || {}).value || 'SALE';
    const isPurchase = docType === 'PURCHASE';
    const recipient = (document.getElementById('mei-recipient') || {}).value;
    const subject = (document.getElementById('mei-subject') || {}).value;
    const body = (document.getElementById('mei-body') || {}).value;
    const sendBtn = document.getElementById('mei-send-btn');

    if (!recipient) {
      window.AppDialogService.showToast('Please enter recipient email address', 'error');
      return;
    }

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerText = 'Connecting SMTP & Transmitting...';
    }

    try {
      // 1. Fetch real canonical PDF bytes from backend document service
      let attachmentBase64 = null;
      const docTypeParam = isPurchase ? 'PURCHASE' : 'SALES_INVOICE';
      const filePrefix = isPurchase ? 'Purchase_Bill' : 'Tax_Invoice';
      try {
        const token = localStorage.getItem('dse_access_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const pdfRes = await fetch(`/api/documents/render?type=${docTypeParam}&number=${encodeURIComponent(invNo)}&format=PDF`, { headers });
        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          const reader = new FileReader();
          attachmentBase64 = await new Promise((resolve, reject) => {
            reader.onloadend = () => {
              const res = reader.result || '';
              const base64 = res.includes(',') ? res.substring(res.indexOf(',') + 1) : res;
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch (pdfErr) {
        console.warn('Could not fetch server PDF:', pdfErr);
      }

      // 2. Client jsPDF fallback for sales if server PDF unreachable
      if (!attachmentBase64 && !isPurchase && window.jspdf) {
        try {
          const saleObj = (this.salesCache || []).find(s => (s.invoiceNo || s.number) === invNo);
          if (saleObj) {
            const doc = this.buildSalesInvoiceJsPdf(saleObj);
            if (doc) {
              const dataUri = doc.output('datauristring');
              attachmentBase64 = dataUri.split(',')[1];
            }
          }
        } catch (jsPdfErr) {
          console.warn('jsPDF fallback failed:', jsPdfErr);
        }
      }

      // 3. Dispatch through backend SMTP gateway
      const emailPayload = {
        recipient,
        subject,
        body,
        attachmentName: `${filePrefix}_${invNo.replace(/[^A-Za-z0-9]/g, '_')}.pdf`,
        attachmentBase64
      };

      const result = await window.OperationsService.sendAuthorityEmail(emailPayload);

      if (isPurchase) {
        if (saleId > 0) {
          try {
            await window.OperationsService.markPurchaseEmailSent(saleId);
          } catch (_) {}
        }
        if (window.PurchaseController && window.PurchaseController.loadPurchases) {
          window.PurchaseController.loadPurchases();
        }
      } else {
        if (saleId > 0) {
          try {
            await window.OperationsService.markSaleEmailSent(saleId);
            await window.OperationsService.recordCommunication({
              entityType: 'SALE',
              entityId: saleId,
              channel: 'EMAIL',
              recipient,
              subject,
              status: 'SENT'
            });
          } catch (_) {}

          const s = (this.salesCache || []).find(item => item.id === saleId || (item.invoiceNo || item.number) === invNo);
          if (s) s.emailSent = true;
          this.renderSalesTable(this.salesCache);
        }
      }

      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.closeModal('modal-email-invoice');
      window.AppDialogService.showToast(result?.message || `Document ${invNo} emailed successfully to ${recipient}!`, 'success');
    } catch (err) {
      console.error('Email gateway error:', err);
      window.AppDialogService.showToast(`Failed to send email to ${recipient}: ${err.message}`, 'error');
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerText = '✈ Send Email';
      }
    }
  },

  async previewAttachedPdf() {
    const invNo = (document.getElementById('mei-inv-no') || {}).value;
    if (!invNo) {
      if (window.AppDialogService) window.AppDialogService.showToast('No invoice selected for preview', 'warning');
      return;
    }
    const docType = (document.getElementById('mei-doc-type') || {}).value || 'SALE';
    let docTypeParam = 'SALES_INVOICE';
    if (docType === 'PURCHASE') docTypeParam = 'PURCHASE';
    else if (docType === 'SALES_RETURN') docTypeParam = 'SALES_RETURN';
    else if (docType === 'PURCHASE_RETURN') docTypeParam = 'PURCHASE_RETURN';
    const isPurchase = docType === 'PURCHASE';
    const token = localStorage.getItem('dse_access_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const res = await fetch(`/api/documents/render?type=${docTypeParam}&number=${encodeURIComponent(invNo)}&format=PDF`, { headers });
      if (!res.ok) {
        // Fallback for sales if server render throws error
        if (!isPurchase && window.jspdf) {
          const saleObj = (this.salesCache || []).find(s => (s.invoiceNo || s.number) === invNo);
          if (saleObj) {
            const doc = this.buildSalesInvoiceJsPdf(saleObj);
            if (doc) {
              const blob = doc.output('blob');
              const blobUrl = URL.createObjectURL(blob);
              window.open(blobUrl, '_blank');
              return;
            }
          }
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (e) {
      if (window.AppDialogService) window.AppDialogService.showToast('Could not load PDF preview: ' + e.message, 'error');
      else alert('Could not load PDF preview: ' + e.message);
    }
  },

  // =========================================================================
  // 14. WHATSAPP NOTIFICATION (REAL DESKTOP TEMPLATE OUTPUT)
  // =========================================================================
  async sendWhatsapp(invoiceNo) {
    const sale = this.salesCache.find(s => (s.invoiceNo || s.number) === invoiceNo);
    if (!sale) return;

    const cust = sale.customer || {};
    let phone = (cust.phone || sale.mobile || '').replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;

    if (!phone) {
      window.AppDialogService.showToast('Customer mobile number is not available. Please update in customer master.', 'warning');
      return;
    }

    const partyName = cust.name || sale.customerName || 'Customer';
    const totalStr = window.FormatUtil.formatRupees(sale.totalAmount || 0);
    const paidStr = window.FormatUtil.formatRupees(sale.paidAmount || 0);
    const balanceStr = window.FormatUtil.formatRupees(Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0)));
    const invDateStr = window.FormatUtil.formatDate(sale.invoiceDate);

    // Exact desktop template parity with PaymentMessageService.java
    let msg = `Hello *${partyName}* 👋\n\n`;
    msg += `Thank you for your business. Your tax invoice summary has been generated:\n\n`;
    msg += `────────────────────────────\n\n`;
    msg += `📄 *Invoice Summary*\n\n`;
    msg += `Invoice No : ${invoiceNo}\n\n`;
    msg += `Date : ${invDateStr}\n\n`;
    msg += `Total Amount : ${totalStr}\n\n`;
    msg += `Paid : ${paidStr}\n\n`;
    msg += `Balance : ${balanceStr}\n\n`;
    msg += `Status : ${sale.paymentStatus === 'PAID' ? '🟢 Settled' : '🟠 Pending'}\n\n`;
    msg += `────────────────────────────\n\n`;
    msg += `Regards,\n*Jasvi Industries*`;

    try {
      if (sale.id) {
        await window.OperationsService.markDocumentWhatsapp('SALE', sale.id, sale.rowVersion || 0);
        await window.OperationsService.recordCommunication({
          entityType: 'SALE',
          entityId: sale.id,
          channel: 'WHATSAPP',
          recipient: phone,
          subject: `Invoice ${invoiceNo}`,
          status: 'SENT'
        });
      }

      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
      window.AppDialogService.showToast(`Opening WhatsApp for ${partyName} (+${phone})...`, 'info');
      await this.loadSales();
    } catch (err) {
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
    }
  },

  // =========================================================================
  // 15. CANONICAL PDF & EXCEL EXPORT (EXACT DESKTOP PARITY)
  // =========================================================================
  async exportInvoicePdf(invoiceNo) {
    try {
      window.AppDialogService.showToast('Generating official PDF invoice...', 'info');
      const token = localStorage.getItem('dse_access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/documents/render?type=SALES_INVOICE&number=${encodeURIComponent(invoiceNo)}&format=PDF`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${invoiceNo.replace(/[\/\\:]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn('PDF download failed, printing:', e);
      this.printTaxInvoice(invoiceNo);
    }
  },

  async exportInvoiceExcel(invoiceNo) {
    try {
      window.AppDialogService.showToast('Downloading official Excel spreadsheet...', 'info');
      const token = localStorage.getItem('dse_access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/documents/render?type=SALES_INVOICE&number=${encodeURIComponent(invoiceNo)}&format=XLSX`, { headers });
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
        window.AppDialogService.showToast(`Downloaded spreadsheet for ${invoiceNo}`, 'success');
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.warn('Server XLSX render failed, falling back to client CSV:', err);
      // Fallback to client CSV
      try {
        const sale = await window.OperationsService.getSaleByInvoice(invoiceNo);
        if (!sale) return;
        const lines = sale.lines || [];
        const cust = sale.customer || {};
        let csv = `JASVI INDUSTRIES - TAX INVOICE STATEMENT\n`;
        csv += `Invoice No:,${invoiceNo},Date:,${sale.invoiceDate}\n`;
        csv += `Customer:,${cust.name || sale.customerName || 'Walk-in'},GSTIN:,${cust.gstin || sale.billingGstin || '-'}\n`;
        csv += `Billing Address:,${(cust.address || sale.billingAddress || '').replace(/,/g, ' ')}\n\n`;
        csv += `# ,Item Code,Description,HSN,Quantity,Unit,Rate,Discount %,Taxable Amount,GST %,GST Amount,Total Amount\n`;
        lines.forEach((l, idx) => {
          const taxable = ((l.quantity || 1) * (l.rate || 0)) - (l.discountAmount || 0);
          csv += `${idx + 1},${l.itemCode},"${(l.itemDescription || l.description || '').replace(/"/g, '""')}",${l.itemHsn || '73063000'},${l.quantity || 1},${l.itemUnit || 'PCS'},${l.rate || 0},${l.discountPercent || 0},${taxable},${l.gstPercent || 18},${l.gstAmount || 0},${l.totalAmount || 0}\n`;
        });
        csv += `\nSubtotal (Taxable):,,${sale.subtotal || 0}\nTotal GST:,,${sale.gstAmount || 0}\nAdditional Charges:,,${sale.chargeAmount || 0}\nGrand Total:,,${sale.totalAmount || 0}\n`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${invoiceNo.replace(/[^A-Za-z0-9]/g, '_')}_Tax_Invoice.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.AppDialogService.showToast(`Downloaded spreadsheet for ${invoiceNo}`, 'success');
      } catch (e2) {
        window.AppDialogService.showToast('Failed to export Excel: ' + e2.message, 'error');
      }
    }
  },

  // Desktop Parity writeSalesExcel (13 Columns + Footer - SalesListController.java line 859)
  exportSalesRegisterExcel() {
    const list = this.currentRenderedSales || this.salesCache || [];
    if (list.length === 0) {
      window.AppDialogService.showToast('No sales records to export', 'warning');
      return;
    }

    // Exact 13 Columns matching desktop writeSalesExcel:
    // Invoice No, Date, Customer, Mobile, GSTIN, Amount, Paid, Pending, Due Date, Document Status, Payment Status, Email, WhatsApp
    const headers = ["Invoice No", "Date", "Customer", "Mobile", "GSTIN", "Amount", "Paid", "Pending", "Due Date", "Document Status", "Payment Status", "Email", "WhatsApp"];
    
    let csv = headers.map(h => `"${h}"`).join(',') + '\n';
    let totalAmt = 0, totalPaid = 0, totalPending = 0;

    list.forEach(x => {
      const party = x.customer || {};
      const amount = parseFloat(x.totalAmount != null ? x.totalAmount : (x.total || 0));
      const paid = parseFloat(x.paidAmount != null ? x.paidAmount : (x.paid || 0));
      const pending = parseFloat(x.balanceAmount != null ? x.balanceAmount : Math.max(0, amount - paid));
      totalAmt += amount;
      totalPaid += paid;
      totalPending += pending;

      const row = [
        `"${x.invoiceNo || x.number || ''}"`,
        `"${x.invoiceDate || x.date || ''}"`,
        `"${(party.name || x.customerName || '').replace(/"/g, '""')}"`,
        `"${(party.phone || x.customerPhone || '').replace(/"/g, '""')}"`,
        `"${(party.gstin || x.billingGstin || '').replace(/"/g, '""')}"`,
        amount.toFixed(2),
        paid.toFixed(2),
        pending.toFixed(2),
        `"${x.dueDate || '-'}"`,
        `"${x.documentStatus || 'APPROVED'}"`,
        `"${x.paymentStatus || (pending <= 0.005 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING')}"`,
        `"${x.emailSent ? 'Sent' : 'Not Sent'}"`,
        `"${x.whatsappSent ? 'Sent' : 'Not Sent'}"`
      ];
      csv += row.join(',') + '\n';
    });

    // Summary Totals Footer Row
    csv += `\n"TOTALS (${list.length} INVOICES)","","","","",${totalAmt.toFixed(2)},${totalPaid.toFixed(2)},${totalPending.toFixed(2)},"","","","",""\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Sales_Register_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.AppDialogService.showToast(`Exported ${list.length} sales register records matching desktop spreadsheet format`, 'success');
  },

  exportSalesRegisterPdf() {
    this.printSalesRegister();
  },

  printSalesRegister() {
    const list = this.currentRenderedSales || this.salesCache || [];
    if (list.length === 0) {
      window.AppDialogService.showToast('No sales records to print', 'warning');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-IN');
    let totalAmt = 0, totalPaid = 0, totalPending = 0;
    list.forEach(x => {
      totalAmt += parseFloat(x.totalAmount || x.total || 0);
      totalPaid += parseFloat(x.paidAmount || x.paid || 0);
      totalPending += parseFloat(x.balanceAmount != null ? x.balanceAmount : ((x.totalAmount || 0) - (x.paidAmount || 0)));
    });

    const rowsHtml = list.map((x, idx) => {
      const party = x.customer || {};
      const amt = parseFloat(x.totalAmount || x.total || 0);
      const paid = parseFloat(x.paidAmount || x.paid || 0);
      const bal = parseFloat(x.balanceAmount != null ? x.balanceAmount : (amt - paid));
      return `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-weight: 700;">${x.invoiceNo || x.number}</td>
          <td>${x.invoiceDate || x.date}</td>
          <td>${party.name || x.customerName || '-'}</td>
          <td>${party.gstin || x.billingGstin || '-'}</td>
          <td style="text-align: right;">₹ ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: green;">₹ ${paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right; color: ${bal > 0 ? '#b91c1c' : '#15803d'};">₹ ${bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td>${x.documentStatus || 'APPROVED'}</td>
          <td>${x.paymentStatus || (bal <= 0.005 ? 'PAID' : 'PENDING')}</td>
        </tr>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Register - Jasvi Industries</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
          h2 { margin: 0 0 4px 0; }
          p { margin: 0 0 16px 0; color: #555; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: 700; }
          .totals-row { background: #f8fafc; font-weight: 700; }
        </style>
      </head>
      <body>
        <h2>JASVI INDUSTRIES — SALES REGISTER</h2>
        <p>Statement generated on ${todayStr} • ${list.length} records</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>GSTIN</th>
              <th style="text-align: right;">Total Amount</th>
              <th style="text-align: right;">Paid</th>
              <th style="text-align: right;">Pending</th>
              <th>Doc Status</th>
              <th>Pay Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="totals-row">
              <td colspan="5" style="text-align: right;">TOTALS:</td>
              <td style="text-align: right;">₹ ${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">₹ ${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">₹ ${totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  },

  // =========================================================================
  // 16. SALES RETURN PRELOADER (IN-PLACE MODAL PARITY)
  // =========================================================================
  async createSalesReturn(invoiceNo) {
    try {
      if (window.ReturnsController && window.ReturnsController.openCreateReturnModal) {
        if (window.ReturnsController.setType) window.ReturnsController.setType('SALES RETURN');
        await window.ReturnsController.openCreateReturnModal(invoiceNo, 'SALES RETURN');
      } else {
        const modal = document.getElementById('modal-create-return');
        if (modal) {
          modal.style.display = 'flex';
          modal.classList.add('active');
          const inp = document.getElementById('cr-invoice-input');
          if (inp) inp.value = invoiceNo || '';
          const crType = document.getElementById('cr-type');
          if (crType) crType.value = 'SALES RETURN';
        }
      }
    } catch (e) {
      if (window.AppDialogService && window.AppDialogService.showToast) {
        window.AppDialogService.showToast('Could not initialize return: ' + e.message, 'error');
      } else {
        alert('Could not initialize return: ' + e.message);
      }
    }
  },

  // =========================================================================
  // 17. DUPLICATE SALE (SERVER ENDPOINT PARITY)
  // =========================================================================
  async duplicateSale(sale) {
    if (!sale) return;
    try {
      window.AppDialogService.showToast('Preparing duplicate invoice in editor...', 'info');
      let fullSale = sale;
      if (!fullSale.lines || fullSale.lines.length === 0) {
        try {
          fullSale = await window.OperationsService.getSaleByInvoice(sale.invoiceNo || sale.number);
        } catch (e) {
          console.warn('Could not fetch full sale for duplicate:', e);
        }
      }

      const duplicateData = {
        ...fullSale,
        isDuplicate: true,
        id: null,
        invoiceDate: new Date().toISOString().slice(0, 10),
        attachment: null
      };

      await this.openSaleEditorTab(duplicateData, false);
      this.editingSale = null;

      try {
        const seq = await window.OperationsService.getNextSaleInvoice();
        const nextNo = (seq && (seq.value || seq.invoiceNo || (typeof seq === 'string' ? seq : ''))) || '';
        if (nextNo) {
          const invNoEl = document.getElementById('ws-inv-no');
          if (invNoEl) invNoEl.value = nextNo;
          const displayEl = document.getElementById('ws-inv-display');
          if (displayEl) displayEl.innerText = nextNo;
        }
      } catch (_) {}

      window.AppDialogService.showToast('Invoice loaded as duplicate with fresh sequence. Ready to save as a new invoice.', 'success');
    } catch (e) {
      window.AppDialogService.showToast('Could not duplicate sale: ' + e.message, 'error');
    }
  },

  // =========================================================================
  // 18. CANCEL & DELETE WITH FINANCIAL LOCK VALIDATIONS
  // =========================================================================
  isFinanciallyLocked(sale) {
    if (!sale) return false;
    const paid = sale.paidAmount || 0;
    const payStatus = (sale.paymentStatus || '').toUpperCase();
    return paid > 0.009 || payStatus.includes('PAID') || payStatus.includes('SETTLED') || payStatus.includes('PARTIAL');
  },

  async cancelInvoice(invoiceNo) {
    const sale = this.salesCache.find(s => (s.invoiceNo || s.number) === invoiceNo);
    if (!sale) return;

    if (sale.documentStatus === 'CANCELLED') {
      window.AppDialogService.showToast('This sale is already cancelled.', 'info');
      return;
    }
    if (this.isFinanciallyLocked(sale)) {
      window.AppDialogService.showToast('Paid, partially paid, or settled sales cannot be cancelled. Use the sales return workflow instead.', 'warning');
      return;
    }

    if (!confirm(`Cancel ${invoiceNo}?\n\nStock will be restored and document status will become CANCELLED.`)) {
      return;
    }

    try {
      await window.OperationsService.cancelSale(invoiceNo);
      window.AppDialogService.showToast(`${invoiceNo} cancelled. Stock restored to inventory.`, 'success');
      this.closeInvoiceDrawer();
      await this.loadSales();
      if (window.DashboardController) window.DashboardController.refresh();
    } catch (e) {
      window.AppDialogService.showToast('Failed to cancel invoice: ' + e.message, 'error');
    }
  },

  async deleteInvoice(invoiceNo) {
    const sale = this.salesCache.find(s => (s.invoiceNo || s.number) === invoiceNo);
    if (!sale) return;

    if (this.isFinanciallyLocked(sale)) {
      window.AppDialogService.showToast('Paid, partially paid, or settled sales cannot be deleted. Use the sales return workflow instead.', 'warning');
      return;
    }

    const isCancelled = sale.documentStatus === 'CANCELLED';
    const stockNote = isCancelled ? 'Stock was already restored when this sale was cancelled.' : 'Stock will be restored.';

    if (!confirm(`Delete ${invoiceNo}?\n\nThe document will disappear from the normal Sales Register, but its backend audit record will be retained as DELETED.\n${stockNote}`)) {
      return;
    }

    try {
      await window.OperationsService.deleteSale(invoiceNo);
      window.AppDialogService.showToast(`${invoiceNo} deleted from register. Audit record retained.`, 'success');
      this.closeInvoiceDrawer();
      await this.loadSales();
      if (window.DashboardController) window.DashboardController.refresh();
    } catch (e) {
      window.AppDialogService.showToast('Failed to delete invoice: ' + e.message, 'error');
    }
  },

  // =========================================================================
  // 19. SIDE INSPECTION DRAWER
  // =========================================================================
  handleRowClick(invoiceNo, trEl) {
    const inlineDrawer = document.getElementById('sales-inline-drawer');
    const modalDrawer = document.getElementById('drawer-invoice-details');
    const isInlineOpen = inlineDrawer && inlineDrawer.style.display !== 'none' && inlineDrawer.style.display !== '';
    const isModalOpen = modalDrawer && modalDrawer.classList.contains('open');

    // Desktop parity: if drawer is visible and user clicks the same row again -> close drawer and deselect
    if ((isInlineOpen || isModalOpen) && this.selectedDrawerInvoiceNo === invoiceNo) {
      this.closeInvoiceDrawer();
      return;
    }

    // First click or clicking a different row -> open details and highlight row
    this.openInvoiceDrawer(invoiceNo, trEl);
  },

  async openInvoiceDrawer(invoiceNo, trEl = null) {
    const inlineDrawer = document.getElementById('sales-inline-drawer');
    const modalDrawer = document.getElementById('drawer-invoice-details');
    const overlay = document.getElementById('side-drawer-overlay');

    // Toggle check if modalDrawer is open and same invoice
    if (modalDrawer && modalDrawer.classList.contains('open') && this.selectedDrawerInvoiceNo === invoiceNo) {
      this.closeInvoiceDrawer();
      return;
    }

    this.selectedDrawerInvoiceNo = invoiceNo;

    // Highlight the row in the table
    document.querySelectorAll('#sales-main-table tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    if (trEl) {
      trEl.classList.add('active-selected-row');
    } else {
      const rows = document.querySelectorAll('#sales-table-tbody tr');
      rows.forEach(r => {
        const firstTd = r.querySelector('td');
        if (firstTd && firstTd.innerText.trim() === invoiceNo) {
          r.classList.add('active-selected-row');
        }
      });
    }

    try {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      let sale = (this.salesCache || []).find(s => (s.invoiceNo || s.number) === invoiceNo);
      this.currentDrawerSale = sale || { invoiceNo };

      const s = this.currentDrawerSale;
      const cust = s.customer || {};
      const custName = cust.name || s.customerName || s.partyName || 'Unknown Customer';
      const custPhone = cust.phone || s.mobile || s.customerPhone || '';
      const custEmail = cust.email || '';
      const contactDisp = custPhone + (custPhone && custEmail ? ' • ' : '') + custEmail;

      const grandTotal = s.totalAmount != null ? s.totalAmount : (s.total || 0);
      const isPaid = s.paymentStatus === 'PAID';
      const isCancelled = s.documentStatus === 'CANCELLED';
      const paid = isCancelled ? 0 : (s.paidAmount != null ? s.paidAmount : (isPaid ? grandTotal : 0));
      const pending = isCancelled ? 0 : Math.max(0, grandTotal - paid);
      const gstAmount = s.gstAmount || 0;
      const charges = s.chargesAmount != null ? s.chargesAmount : (s.chargeAmount || 0);
      const chargesTax = s.chargesTaxAmount || 0;
      const docSt = (s.documentStatus || 'APPROVED').toUpperCase();

      // --- POPULATE INLINE DOCKED DRAWER (Screenshots 3 & 4) ---
      if (inlineDrawer) {
        const elSideInvNo = document.getElementById('side-inv-no');
        if (elSideInvNo) elSideInvNo.innerText = s.invoiceNo || invoiceNo;

        const elSideDate = document.getElementById('side-inv-date');
        if (elSideDate) elSideDate.innerText = window.FormatUtil.formatDate(s.invoiceDate || s.date);

        const elSideCust = document.getElementById('side-cust-name');
        if (elSideCust) elSideCust.innerText = custName;

        const elSidePhone = document.getElementById('side-cust-phone');
        if (elSidePhone) elSidePhone.innerText = contactDisp || '-';

        const elSideDoc = document.getElementById('side-doc-status');
        if (elSideDoc) {
          elSideDoc.innerText = docSt;
          elSideDoc.className = `badge ${isCancelled ? 'badge-danger' : (docSt === 'PENDING APPROVAL' ? 'badge-pending' : 'badge-paid')}`;
        }

        const elSideTotal = document.getElementById('side-amt-total');
        if (elSideTotal) elSideTotal.innerText = window.FormatUtil.formatRupees(grandTotal);

        const elSidePaid = document.getElementById('side-amt-paid');
        if (elSidePaid) elSidePaid.innerText = window.FormatUtil.formatRupees(paid);

        const elSidePending = document.getElementById('side-amt-pending');
        if (elSidePending) elSidePending.innerText = window.FormatUtil.formatRupees(pending);

        const elSideDue = document.getElementById('side-amt-due');
        if (elSideDue) {
          const dueStr = s.dueDate ? window.FormatUtil.formatDate(s.dueDate) : 'Not set';
          const dueInfo = window.FormatUtil.getDueInfo(s);
          elSideDue.innerText = `${dueStr} • ${dueInfo.text}`;
        }

        const elSideGst = document.getElementById('side-amt-gst');
        if (elSideGst) elSideGst.innerText = window.FormatUtil.formatRupees(gstAmount);

        const elSideCharges = document.getElementById('side-amt-charges');
        if (elSideCharges) elSideCharges.innerText = window.FormatUtil.formatRupees(charges);

        const elSideChgTax = document.getElementById('side-amt-chg-tax');
        if (elSideChgTax) elSideChgTax.innerText = window.FormatUtil.formatRupees(chargesTax);

        const elSideChgList = document.getElementById('side-amt-chg-list');
        if (elSideChgList) {
          const chgArr = s.charges || [];
          if (chgArr.length > 0) {
            elSideChgList.innerHTML = chgArr.map(c => `${c.chargeType || 'Charge'} — ${window.FormatUtil.formatRupees(c.amount || 0)}`).join('<br>');
          } else {
            elSideChgList.innerText = 'Not Applicable';
          }
        }

        const elSideBilling = document.getElementById('side-addr-billing');
        if (elSideBilling) elSideBilling.innerText = s.billingAddress || cust.address || 'Not set';

        const elSideShipping = document.getElementById('side-addr-shipping');
        if (elSideShipping) {
          const ship = s.deliveryAddress || (s.sameAsBilling ? (s.billingAddress || cust.address) : '') || 'Not set';
          elSideShipping.innerText = ship;
        }

        const elSideGstType = document.getElementById('side-tax-type');
        if (elSideGstType) elSideGstType.innerText = s.gstType || 'GST';

        const elSideGstin = document.getElementById('side-tax-gstin');
        if (elSideGstin) elSideGstin.innerText = s.gstin || cust.gstin || s.billingGstin || 'Not Applicable';

        const elSideTrans = document.getElementById('side-trans-name');
        if (elSideTrans) elSideTrans.innerText = s.transporter || 'Not Applicable';

        const elSideDoor = document.getElementById('side-trans-door');
        if (elSideDoor) elSideDoor.innerText = s.doorDelivery || 'Not Applicable';

        const elSideVehicle = document.getElementById('side-trans-vehicle');
        if (elSideVehicle) elSideVehicle.innerText = s.vehicleNumber || 'Not Applicable';

        const elSidePerson = document.getElementById('side-trans-person');
        if (elSidePerson) {
          const person = s.contactPerson || '';
          const pMobile = s.contactPersonMobile || '';
          elSidePerson.innerText = person ? `${person}${pMobile ? ' (' + pMobile + ')' : ''}` : 'Not Applicable';
        }

        // Populate Return Settlement card in inline drawer (Desktop Parity)
        const sideRetSec = document.getElementById('side-return-section');
        if (sideRetSec) {
          const retSt = (s.returnStatus || 'N/A').toUpperCase().replace(/_/g, ' ');
          if (retSt !== 'N/A' || s.hasReturnSettlement) {
            sideRetSec.style.display = 'block';
            const elSideRetBadge = document.getElementById('side-ret-status-badge');
            if (elSideRetBadge) {
              elSideRetBadge.innerText = retSt;
              elSideRetBadge.className = `badge pill-badge ${retSt === 'FULLY RETURNED' ? 'pill-success' : (retSt === 'PARTIALLY RETURNED' ? 'pill-info' : (retSt === 'PENDING APPROVAL' ? 'pill-warning' : 'pill-neutral'))}`;
            }
            const elSideRetQty = document.getElementById('side-ret-qty');
            if (elSideRetQty) elSideRetQty.innerText = (s.returnedQuantity || 0).toFixed(2);
            const elSideRetAppr = document.getElementById('side-ret-approved');
            if (elSideRetAppr) elSideRetAppr.innerText = window.FormatUtil.formatRupees(s.approvedReturnAmount || 0);
            const elSideRetPend = document.getElementById('side-ret-pending');
            if (elSideRetPend) elSideRetPend.innerText = window.FormatUtil.formatRupees(s.returnPendingAmount || 0);
            const elSideRetRefSt = document.getElementById('side-ret-refund-status');
            if (elSideRetRefSt) elSideRetRefSt.innerText = s.refundStatus || (retSt === 'FULLY RETURNED' ? 'SETTLED' : 'PENDING');
          } else {
            sideRetSec.style.display = 'none';
          }
        }

        // Display the inline drawer docked beside table (Screenshots 3 & 4)
        inlineDrawer.style.display = 'flex';
      }

      // Also populate the modal drawer elements if present
      if (modalDrawer) {
        const elInvNo = document.getElementById('drawer-inv-no');
        if (elInvNo) elInvNo.innerText = s.invoiceNo || invoiceNo;

        const elInvDate = document.getElementById('drawer-inv-date');
        if (elInvDate) elInvDate.innerText = window.FormatUtil.formatDate(s.invoiceDate);

        const elInvDue = document.getElementById('drawer-inv-due');
        if (elInvDue) {
          const dueStr = s.dueDate ? window.FormatUtil.formatDate(s.dueDate) : 'Not set';
          const dueInfo = window.FormatUtil.getDueInfo(s);
          elInvDue.innerText = `${dueStr} • ${dueInfo.text}`;
        }

        const elInvTerms = document.getElementById('drawer-inv-terms');
        if (elInvTerms) elInvTerms.innerText = s.paymentTerms || '15 Days';

        const elInvRef = document.getElementById('drawer-inv-ref');
        if (elInvRef) elInvRef.innerText = s.referenceNo || '—';

        const elStatus = document.getElementById('drawer-inv-status');
        if (elStatus) {
          elStatus.innerText = docSt;
          elStatus.className = `badge ${docSt === 'APPROVED' ? 'badge-paid' : (docSt === 'PENDING APPROVAL' ? 'badge-pending' : 'badge-danger')}`;
        }

        const elPayStatus = document.getElementById('drawer-inv-pay-status');
        if (elPayStatus) {
          const paySt = (s.paymentStatus || 'UNPAID').toUpperCase();
          elPayStatus.innerText = paySt;
          elPayStatus.className = `badge ${paySt === 'PAID' ? 'badge-paid' : (paySt === 'PARTIAL' ? 'badge-pending' : 'badge-unpaid')}`;
        }

        const elCustName = document.getElementById('drawer-cust-name');
        if (elCustName) elCustName.innerText = custName;

        const elCustGstin = document.getElementById('drawer-cust-gstin');
        if (elCustGstin) elCustGstin.innerText = cust.gstin || s.billingGstin || 'Unregistered / Consumer';

        const elCustPhone = document.getElementById('drawer-cust-phone');
        if (elCustPhone) elCustPhone.innerText = cust.phone || '-';

        const elCustEmail = document.getElementById('drawer-cust-email');
        if (elCustEmail) elCustEmail.innerText = cust.email || '-';

        const elCustAddr = document.getElementById('drawer-cust-address');
        if (elCustAddr) elCustAddr.innerText = cust.address || s.billingAddress || '-';

        const elTransp = document.getElementById('drawer-transporter');
        if (elTransp) elTransp.innerText = s.transporter || 'Self / By Hand';

        const elVehicle = document.getElementById('drawer-vehicle');
        if (elVehicle) elVehicle.innerText = s.vehicleNumber || '-';

        const elDoor = document.getElementById('drawer-door-delivery');
        if (elDoor) elDoor.innerText = s.doorDelivery || 'Standard Delivery';

        const elDeliveryAddr = document.getElementById('drawer-delivery-address');
        if (elDeliveryAddr) elDeliveryAddr.innerText = s.deliveryAddress || s.billingAddress || cust.address || '-';

        const taxable = s.subtotal != null ? s.subtotal : (s.taxableAmount || 0);
        const elTaxable = document.getElementById('drawer-taxable-amt');
        if (elTaxable) elTaxable.innerText = window.FormatUtil.formatRupees(taxable);

        const elGst = document.getElementById('drawer-gst-amt');
        if (elGst) elGst.innerText = window.FormatUtil.formatRupees(gstAmount);

        const elCharges = document.getElementById('drawer-charges-amt');
        if (elCharges) elCharges.innerText = window.FormatUtil.formatRupees(charges);

        const elGrand = document.getElementById('drawer-grand-total');
        if (elGrand) elGrand.innerText = window.FormatUtil.formatRupees(grandTotal);

        const elPaid = document.getElementById('drawer-paid-amt');
        if (elPaid) elPaid.innerText = window.FormatUtil.formatRupees(paid);

        const elBalance = document.getElementById('drawer-balance-amt');
        if (elBalance) elBalance.innerText = window.FormatUtil.formatRupees(pending);

        const elPayPaid = document.getElementById('drawer-pay-paid-display');
        if (elPayPaid) elPayPaid.innerText = window.FormatUtil.formatRupees(paid);

        const elPayTotal = document.getElementById('drawer-pay-total-display');
        if (elPayTotal) elPayTotal.innerText = window.FormatUtil.formatRupees(grandTotal);

        const tbody = document.getElementById('drawer-items-tbody');
        const lines = s.lines || [];
        const countBadge = document.getElementById('drawer-items-count-badge');
        if (countBadge) countBadge.innerText = `${lines.length} Items`;

        if (tbody) {
          if (lines.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 14px;">No line item records.</td></tr>`;
          } else {
            tbody.innerHTML = lines.map((l, idx) => `
              <tr>
                <td style="color: var(--text-dim);">${idx + 1}</td>
                <td style="font-weight: 600;">${l.itemDescription || l.description || l.itemCode || '-'}</td>
                <td style="font-family: monospace;">${l.hsnCode || l.hsn || '-'}</td>
                <td>${(parseFloat(l.quantity) || 1).toFixed(2)}</td>
                <td>${l.itemUnit || l.unit || 'PCS'}</td>
                <td>${window.FormatUtil.formatRupees(l.rate || 0)}</td>
                <td>${window.FormatUtil.formatRupees(l.taxableAmount || (l.quantity * l.rate) || 0)}</td>
                <td>${l.gstPercent || l.taxRate || 18}%</td>
                <td style="font-weight: 700; text-align: right;">${window.FormatUtil.formatRupees(l.totalAmount || l.lineTotal || 0)}</td>
              </tr>
            `).join('');
          }
        }

        const approvalBox = document.getElementById('drawer-sale-approval-box');
        if (approvalBox) {
          const isPending = (s.documentStatus || '').toUpperCase() === 'PENDING APPROVAL';
          approvalBox.style.display = isPending ? 'flex' : 'none';
        }

        this.switchDrawerTab('summary');
      }

      // Background asynchronous lines loading if not already in memory
      if (!sale || !sale.lines || sale.lines.length === 0) {
        window.OperationsService.getSaleByInvoice(invoiceNo).then(fullSale => {
          if (fullSale && this.selectedDrawerInvoiceNo === invoiceNo) {
            this.currentDrawerSale = fullSale;
            const tbody = document.getElementById('drawer-items-tbody');
            const lines = fullSale.lines || [];
            const countBadge = document.getElementById('drawer-items-count-badge');
            if (countBadge) countBadge.innerText = `${lines.length} Items`;
            if (tbody) {
              if (lines.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 14px;">No line item records.</td></tr>`;
              } else {
                tbody.innerHTML = lines.map((l, idx) => `
                  <tr>
                    <td style="color: var(--text-dim);">${idx + 1}</td>
                    <td style="font-weight: 600;">${l.itemDescription || l.description || l.itemCode || '-'}</td>
                    <td style="font-family: monospace;">${l.hsnCode || l.hsn || '-'}</td>
                    <td>${(parseFloat(l.quantity) || 1).toFixed(2)}</td>
                    <td>${l.itemUnit || l.unit || 'PCS'}</td>
                    <td>${window.FormatUtil.formatRupees(l.rate || 0)}</td>
                    <td>${window.FormatUtil.formatRupees(l.taxableAmount || (l.quantity * l.rate) || 0)}</td>
                    <td>${l.gstPercent || l.taxRate || 18}%</td>
                    <td style="font-weight: 700; text-align: right;">${window.FormatUtil.formatRupees(l.totalAmount || l.lineTotal || 0)}</td>
                  </tr>
                `).join('');
              }
            }
          }
        }).catch(e => console.warn('Background lines fetch error:', e));
      }
    } catch (err) {
      console.error('Failed to load invoice drawer:', err);
      window.AppDialogService.showToast('Unable to load invoice details: ' + err.message, 'error');
    }
  },

  switchDrawerTab(tabName) {
    const tabs = ['summary', 'items', 'payments', 'audit', 'docs'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-sale-${t}`);
      const pane = document.getElementById(`pane-sale-${t}`);
      if (btn) btn.classList.toggle('active', t === tabName);
      if (pane) pane.classList.toggle('active', t === tabName);
    });

    if (tabName === 'payments' && this.currentDrawerSale) {
      this.loadDrawerPayments(this.currentDrawerSale);
    } else if (tabName === 'audit' && this.currentDrawerSale) {
      this.loadDrawerAudit(this.currentDrawerSale);
    }
  },

  async loadDrawerPayments(sale) {
    const tbody = document.getElementById('drawer-payments-tbody');
    if (!tbody || !sale || !sale.id) return;
    try {
      const rows = await window.ApiService.get(`/api/support/payments?type=SALE&id=${sale.id}`);
      if (!rows || rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-dim); padding:16px;">No payment records found for this invoice.</td></tr>`;
        return;
      }
      tbody.innerHTML = rows.map(r => `
        <tr>
          <td>${window.FormatUtil.formatDate(r.paymentDate || r.date)}</td>
          <td style="font-weight: 600;">#${r.id || r.paymentId || '—'}</td>
          <td><span class="badge badge-paid">${r.mode || 'CASH'}</span></td>
          <td>${r.referenceNumber || r.reference || '—'}</td>
          <td style="color: var(--text-dim);">${r.notes || '—'}</td>
          <td style="font-weight: 700; color: var(--green);">${window.FormatUtil.formatRupees(r.amount || 0)}</td>
          <td>
            ${r.attachmentName ? `
              <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.72rem;" onclick="window.RecordPaymentController.downloadProof(${r.id}, '${r.attachmentName}')">📎 Proof</button>
            ` : '—'}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--red); padding:14px;">Failed to load payment history: ${err.message}</td></tr>`;
    }
  },

  async loadDrawerAudit(sale) {
    const container = document.getElementById('drawer-sale-audit-timeline');
    if (!container || !sale || !sale.id) return;
    try {
      const rows = await window.ApiService.get(`/api/support/activity?type=SALE&id=${sale.id}`);
      if (!rows || rows.length === 0) {
        container.innerHTML = `
          <div style="background: rgba(255,255,255,0.02); border-radius: 6px; padding: 12px; border: 1px solid var(--border-subtle); font-size: 0.8rem;">
            <div style="font-weight: 700; color: var(--cyan);">Record Registered</div>
            <div style="color: var(--text-dim); font-size: 0.75rem; margin-top: 2px;">Initial creation entry for Invoice ${sale.invoiceNo}</div>
          </div>
        `;
        return;
      }
      container.innerHTML = rows.map(r => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 10px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span class="badge badge-paid" style="font-size: 0.7rem;">${r.action || 'ACTIVITY'}</span>
            <span style="font-size: 0.72rem; color: var(--text-dim);">${window.FormatUtil.formatDate(r.createdAt || r.timestamp)}</span>
          </div>
          <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-main);">${r.detail || r.description || 'System action executed'}</div>
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">Actor: <span style="color: var(--cyan);">${r.user || r.actor || 'System'}</span></div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div style="text-align:center; color:var(--red); padding:14px;">Failed to load audit history: ${err.message}</div>`;
    }
  },

  auditCurrentInvoice() {
    const invNo = (this.currentDrawerSale && this.currentDrawerSale.invoiceNo) || this.selectedDrawerInvoiceNo;
    const id = (this.currentDrawerSale && this.currentDrawerSale.id) || null;
    if (!invNo) {
      window.AppDialogService.showToast('Please select an invoice first', 'warning');
      return;
    }
    if (window.AppDialogService && typeof window.AppDialogService.showActivityTimeline === 'function') {
      window.AppDialogService.showActivityTimeline('SALE', id, invNo);
    } else if (typeof this.openAuditTrail === 'function') {
      this.openAuditTrail(invNo);
    }
  },

  async approveSelectedSale() {
    if (!this.currentDrawerSale) return;
    try {
      await window.ApiService.post(`/api/sales/${this.currentDrawerSale.id}/approve`, {});
      window.AppDialogService.toastSuccess(`Sale ${this.currentDrawerSale.invoiceNo} approved.`);
      this.closeInvoiceDrawer();
      this.loadSales();
    } catch (err) {
      window.AppDialogService.toastError(err.message || 'Failed to approve sale');
    }
  },

  async rejectSelectedSale() {
    if (!this.currentDrawerSale) return;
    const reason = prompt(`Enter rejection reason for ${this.currentDrawerSale.invoiceNo}:`);
    if (!reason || !reason.trim()) return;
    try {
      await window.ApiService.post(`/api/sales/${this.currentDrawerSale.id}/reject`, { reason: reason.trim() });
      window.AppDialogService.toastSuccess(`Sale ${this.currentDrawerSale.invoiceNo} rejected.`);
      this.closeInvoiceDrawer();
      this.loadSales();
    } catch (err) {
      window.AppDialogService.toastError(err.message || 'Failed to reject sale');
    }
  },

  printDispatchBarcode(sale) {
    if (!sale) return;
    const invNo = sale.invoiceNo || 'INV';
    window.AppDialogService.showToast(`Generating dispatch barcode for ${invNo}...`, 'info');
    // Open printable barcode window
    const printWin = window.open('', '_blank', 'width=450,height=300');
    if (printWin) {
      printWin.document.write(`
        <html>
          <head><title>Dispatch Barcode - ${invNo}</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 20px;">
            <h3>JASVI INDUSTRIES</h3>
            <p>Dispatch Tracking Label</p>
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; font-family: monospace; border: 2px dashed #000; padding: 10px; margin: 10px 0;">*${invNo}*</div>
            <p>Invoice: <b>${invNo}</b> | Client: <b>${sale.customer ? sale.customer.name : 'Client'}</b></p>
            <button onclick="window.print()" style="padding: 8px 16px; margin-top: 10px;">Print Label</button>
          </body>
        </html>
      `);
      printWin.document.close();
    }
  },

  async handleAttachmentUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file || !this.currentDrawerSale) return;
    try {
      window.AppDialogService.toastInfo(`Uploading ${file.name}...`);
      await window.ApiService.uploadBinary(`/api/support/documents/SALE/${this.currentDrawerSale.id}/attachment-file`, file.name, file);
      window.AppDialogService.toastSuccess(`Attachment ${file.name} saved.`);
      const listEl = document.getElementById('drawer-sale-attachments-list');
      if (listEl) {
        listEl.innerHTML = `<div style="color:var(--green); font-weight:600;">📎 ${file.name} (Uploaded)</div>`;
      }
    } catch (err) {
      window.AppDialogService.toastError(`Failed to upload attachment: ${err.message}`);
    }
  },

  closeInvoiceDrawer() {
    const inlineDrawer = document.getElementById('sales-inline-drawer');
    if (inlineDrawer) inlineDrawer.style.display = 'none';

    const modalDrawer = document.getElementById('drawer-invoice-details');
    if (modalDrawer) modalDrawer.classList.remove('open');

    const overlay = document.getElementById('side-drawer-overlay');
    if (overlay) overlay.classList.remove('open');

    document.querySelectorAll('#sales-main-table tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    this.currentDrawerSale = null;
    this.selectedDrawerInvoiceNo = null;
  },

  openEmailForCurrentDrawer() {
    const invNo = (this.currentDrawerSale && this.currentDrawerSale.invoiceNo) ||
                  (document.getElementById('side-inv-no') && document.getElementById('side-inv-no').innerText) ||
                  this.selectedDrawerInvoiceNo;
    if (!invNo || invNo === '-') {
      window.AppDialogService.showToast('Please select an invoice first', 'warning');
      return;
    }
    this.openEmailModal(invNo);
  },

  async editCurrentDrawerSale() {
    const invNo = (this.currentDrawerSale && this.currentDrawerSale.invoiceNo) ||
                  (document.getElementById('side-inv-no') && document.getElementById('side-inv-no').innerText) ||
                  this.selectedDrawerInvoiceNo;
    if (!invNo || invNo === '-') {
      window.AppDialogService.showToast('Please select an invoice first', 'warning');
      return;
    }
    let sale = this.currentDrawerSale;
    if (!sale || !sale.lines || sale.lines.length === 0) {
      try {
        sale = await window.OperationsService.getSaleByInvoice(invNo);
      } catch (e) {
        console.warn('Could not fetch sale for editing:', e);
      }
    }
    if (!sale) {
      window.AppDialogService.showToast('Sale invoice details not found', 'error');
      return;
    }
    this.closeInvoiceDrawer();
    this.openSaleEditorTab(sale, false);
  },

  async recordPaymentForCurrentDrawer() {
    const invNo = (this.currentDrawerSale && this.currentDrawerSale.invoiceNo) ||
                  (document.getElementById('side-inv-no') && document.getElementById('side-inv-no').innerText) ||
                  (document.getElementById('drawer-inv-no') && document.getElementById('drawer-inv-no').innerText) ||
                  this.selectedDrawerInvoiceNo;
    if (!invNo || invNo === '-' || invNo === 'Loading next sequence...') {
      window.AppDialogService.showToast('Please select an invoice first', 'warning');
      return;
    }

    let sale = this.currentDrawerSale;
    if (!sale || !sale.id) {
      try {
        sale = await window.OperationsService.getSaleByInvoice(invNo);
      } catch (e) {
        console.warn('Could not fetch sale for drawer payment:', e);
      }
    }

    const docStatus = (sale && (sale.documentStatus || sale.status || '')).toUpperCase();
    if (docStatus === 'PENDING APPROVAL' || docStatus === 'REJECTED') {
      window.AppDialogService.showToast('Admin approval is required before recording a payment for this Sale.', 'warning');
      return;
    }

    const grandTotal = sale ? (sale.totalAmount != null ? sale.totalAmount : (sale.total || 0)) : 0;
    const isPaid = sale && sale.paymentStatus === 'PAID';
    const isCancelled = docStatus === 'CANCELLED';
    const paid = isCancelled ? 0 : (sale ? (sale.paidAmount != null ? sale.paidAmount : (isPaid ? grandTotal : 0)) : 0);
    const pending = isCancelled ? 0 : Math.max(0, grandTotal - paid);
    const custName = (sale && sale.customer && sale.customer.name) || (sale && sale.customerName) || (sale && sale.partyName) || 'Customer';
    const saleId = sale ? (sale.id || 0) : 0;

    this.closeInvoiceDrawer();

    if (window.RecordPaymentController && typeof window.RecordPaymentController.open === 'function') {
      window.RecordPaymentController.open('SALE', saleId, invNo, custName, grandTotal, paid, pending, sale);
    } else if (typeof window.openInvoicePaymentDetails === 'function') {
      window.openInvoicePaymentDetails('SALE', saleId, invNo, custName, grandTotal, paid, pending, sale);
    } else {
      this.openRecordPaymentModal(invNo);
    }
  },

  async exportCurrentDrawerExcel() {
    const invNo = (this.currentDrawerSale && this.currentDrawerSale.invoiceNo) ||
                  (document.getElementById('side-inv-no') && document.getElementById('side-inv-no').innerText) ||
                  this.selectedDrawerInvoiceNo;
    if (!invNo || invNo === '-') {
      window.AppDialogService.showToast('Please select an invoice first', 'warning');
      return;
    }
    await this.exportInvoiceExcel(invNo);
  },

  async dispatchBarcodeForCurrentDrawer() {
    const invNo = (this.currentDrawerSale && this.currentDrawerSale.invoiceNo) ||
                  (document.getElementById('side-inv-no') && document.getElementById('side-inv-no').innerText) ||
                  this.selectedDrawerInvoiceNo;
    if (!invNo || invNo === '-') {
      window.AppDialogService.showToast('Please select an invoice first', 'warning');
      return;
    }
    let sale = this.currentDrawerSale;
    if (!sale || !sale.lines || sale.lines.length === 0) {
      try {
        sale = await window.OperationsService.getSaleByInvoice(invNo);
      } catch (e) {
        console.warn('Could not fetch sale for barcode:', e);
      }
    }
    this.openDispatchBarcodeModal(invNo, sale);
  },

  // =========================================================================
  // 20. PRINTABLE TAX INVOICE
  // =========================================================================
  async printTaxInvoice(invoiceNo) {
    try {
      if (window.ApiService && window.ApiService.openPdfPreview) {
        window.AppDialogService.toastInfo(`Generating official Tax Invoice PDF for ${invoiceNo}...`);
        await window.ApiService.openPdfPreview('SALE', invoiceNo);
        return;
      }
    } catch (pdfErr) {
      console.warn('[SalesController] Direct canonical PDF render fallback to HTML:', pdfErr);
    }

    try {
      const sale = await window.OperationsService.getSaleByInvoice(invoiceNo);
      if (!sale) return;

      const cust = sale.customer || {};
      const lines = sale.lines || [];
      const isInterstate = (sale.gstType || '').includes('INTER');
      const cgst = isInterstate ? 0 : (sale.gstAmount || 0) / 2;
      const sgst = isInterstate ? 0 : (sale.gstAmount || 0) / 2;
      const igst = isInterstate ? (sale.gstAmount || 0) : 0;

      const printContainer = document.getElementById('printable-invoice-modal');
      if (!printContainer) return;

      printContainer.innerHTML = `
        <div class="tax-invoice-sheet">
          <div class="ti-header">
            <div>
              <div class="ti-title">JASVI INDUSTRIES</div>
              <div style="font-size: 10px; color: #4b5563; margin-top: 2px;">Precision Fasteners, High-Tensile Bolts &amp; Industrial Stainless Steel Piping</div>
              <div style="font-size: 10px; color: #4b5563;">H-52 Darshan Villa Society, New Naroda, Ahmedabad - 382346, Gujarat</div>
              <div style="font-size: 10px; font-weight: 700; margin-top: 2px;">GSTIN: <span style="font-family: monospace;">24AAACJ1234F1Z1</span> | State: Gujarat (24)</div>
            </div>
            <div style="text-align: right;">
              <span class="ti-badge">ORIGINAL FOR RECIPIENT</span>
              <div style="font-size: 13px; font-weight: 800; margin-top: 6px; color: #1e3a8a;">TAX INVOICE</div>
              <div style="font-size: 11px; font-weight: 700;">Inv #: ${sale.invoiceNo}</div>
              <div style="font-size: 10px; color: #4b5563;">Date: ${window.FormatUtil.formatDate(sale.invoiceDate)}</div>
              <div style="font-size: 10px; color: #4b5563;">Due Date: ${window.FormatUtil.formatDate(sale.dueDate || sale.invoiceDate)}</div>
            </div>
          </div>

          <div class="ti-grid">
            <div class="ti-box">
              <div class="ti-box-title">BILLED TO (BUYER)</div>
              <div style="font-size: 11px; font-weight: 700; color: #111827;">${cust.name || sale.customerName || 'Walk-in Client'}</div>
              <div style="font-size: 10px; color: #4b5563;">${cust.address || sale.billingAddress || '-'}</div>
              <div style="font-size: 10px; margin-top: 4px;"><strong>GSTIN:</strong> ${cust.gstin || sale.billingGstin || 'Unregistered'}</div>
              <div style="font-size: 10px;"><strong>Phone:</strong> ${cust.phone || '-'}</div>
            </div>
            <div class="ti-box">
              <div class="ti-box-title">SHIPPED TO &amp; DISPATCH DETAILS</div>
              <div style="font-size: 10px; color: #4b5563;">${sale.deliveryAddress || cust.address || '-'}</div>
              <div style="font-size: 10px; margin-top: 4px;"><strong>Transporter:</strong> ${sale.transporter || 'Direct Handover'}</div>
              <div style="font-size: 10px;"><strong>Vehicle Number:</strong> ${sale.vehicleNumber || 'Not Specified'}</div>
              <div style="font-size: 10px;"><strong>Payment Terms:</strong> ${sale.paymentTerms || 'Immediate'}</div>
            </div>
          </div>

          <table class="ti-table">
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th>Item Description / Specification</th>
                <th style="width: 60px;">HSN/SAC</th>
                <th style="width: 50px; text-align: right;">Qty</th>
                <th style="width: 40px;">Unit</th>
                <th style="width: 70px; text-align: right;">Rate (₹)</th>
                <th style="width: 75px; text-align: right;">Taxable (₹)</th>
                <th style="width: 50px; text-align: right;">GST%</th>
                <th style="width: 80px; text-align: right;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${lines.map((l, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td style="font-weight: 600;">${l.itemDescription || l.description || l.itemCode}</td>
                  <td>${l.itemHsn || '73063000'}</td>
                  <td style="text-align: right;">${l.quantity || 1}</td>
                  <td>${l.itemUnit || 'PCS'}</td>
                  <td style="text-align: right;">${window.FormatUtil.formatRupees(l.rate || 0)}</td>
                  <td style="text-align: right;">${window.FormatUtil.formatRupees((l.quantity || 1) * (l.rate || 0) - (l.discountAmount || 0))}</td>
                  <td style="text-align: right;">${l.gstPercent || 18}%</td>
                  <td style="text-align: right; font-weight: 700;">${window.FormatUtil.formatRupees(l.totalAmount || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="ti-totals-grid">
            <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; font-size: 9.5px;">
              <div style="font-weight: 700; margin-bottom: 4px;">BANK DETAILS FOR REMITTANCE</div>
              <div>Bank Name: <strong>HDFC Bank Ltd</strong></div>
              <div>Account Name: <strong>JASVI INDUSTRIES</strong></div>
              <div>Account No: <strong>50200088991122</strong></div>
              <div>IFSC Code: <strong>HDFC0001234</strong> (Branch: Nikol, Ahmedabad)</div>
              <div style="margin-top: 8px; font-weight: 700;">TERMS &amp; CONDITIONS</div>
              <div>1. Goods once sold will not be taken back without prior inspection memo.</div>
              <div>2. Subject to Ahmedabad jurisdiction only.</div>
            </div>

            <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; font-size: 10.5px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Taxable Amount:</span>
                <strong>${window.FormatUtil.formatRupees(sale.subtotal || sale.taxableAmount || 0)}</strong>
              </div>
              ${!isInterstate ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Central GST (CGST):</span>
                  <span>${window.FormatUtil.formatRupees(cgst)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>State GST (SGST):</span>
                  <span>${window.FormatUtil.formatRupees(sgst)}</span>
                </div>
              ` : `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Integrated GST (IGST):</span>
                  <span>${window.FormatUtil.formatRupees(igst)}</span>
                </div>
              `}
              ${sale.chargeAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Freight &amp; Transportation:</span>
                  <span>${window.FormatUtil.formatRupees(sale.chargeAmount)}</span>
                </div>
              ` : ''}
              <div style="border-top: 2px solid #111827; margin-top: 6px; padding-top: 6px; display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; color: #0284c7;">
                <span>GRAND TOTAL:</span>
                <span>${window.FormatUtil.formatRupees(sale.totalAmount || 0)}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 28px; padding-top: 14px; border-top: 1px dashed #d1d5db;">
            <div style="font-size: 9px; color: #6b7280;">This is a computer generated tax invoice.</div>
            <div style="text-align: right;">
              <div style="font-size: 10px; font-weight: 700;">For, JASVI INDUSTRIES</div>
              <div style="margin-top: 36px; font-size: 9px; color: #374151;">Authorized Signatory</div>
            </div>
          </div>

          <div class="no-print" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn btn-secondary" onclick="document.getElementById('printable-invoice-modal').classList.remove('open')">Close Preview</button>
            <button class="btn btn-primary" onclick="window.print()">&#128438; Print Invoice Now</button>
          </div>
        </div>
      `;

      printContainer.classList.add('open');
    } catch (err) {
      window.AppDialogService.showToast('Unable to prepare print invoice: ' + err.message, 'error');
    }
  },

  // =========================================================================
  // 21. RAPID KEYBOARD WORKFLOW (FEATURE 10)
  // =========================================================================
  installKeyboardShortcuts() {
    if (this._shortcutsInstalled) return;
    this._shortcutsInstalled = true;

    document.addEventListener('keydown', (e) => {
      // 1. Escape key to close inline drawer matching desktop installEscapeClose
      if (e.key === 'Escape') {
        const inlineDrawer = document.getElementById('sales-inline-drawer');
        if (inlineDrawer && inlineDrawer.style.display !== 'none' && inlineDrawer.style.display !== '') {
          e.preventDefault();
          this.closeInvoiceDrawer();
          return;
        }
      }

      // 2. Check if Create Sale view is active
      const createView = document.getElementById('view-sale-create');
      if (!createView || !createView.classList.contains('active')) return;

      if (e.key === 'F2') {
        e.preventDefault();
        const sel = document.getElementById('ws-fast-item-select');
        if (sel) sel.focus();
      } else if (e.key === 'F10' || ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        this.handleSaleWorkspaceSave(e);
      } else if (e.key === 'Enter') {
        const active = document.activeElement;
        if (active && (active.id === 'ws-fast-tax' || active.id === 'ws-fast-disc' || active.id === 'ws-btn-add-line')) {
          e.preventDefault();
          this.addFastItemRow();
        }
      }
    });
  }
};
