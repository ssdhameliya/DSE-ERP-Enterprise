/**
 * Jasvi Industries ERP - CreditDebitNoteController
 * 100% Desktop Parity with CreditNoteRegisterController.java & DebitNoteRegisterController.java
 * Manages Sales Credit Notes, Purchase Debit Notes, Tax Reversal, GL Posting, and Inventory Restocking
 */
window.CreditDebitNoteController = (function() {
  let creditNotes = [];
  let debitNotes = [];
  let currentCreditPage = 0;
  const creditPageSize = 25;
  let totalCreditPages = 1;
  let filteredCreditList = [];
  let creditDebounceTimer = null;

  let currentDebitPage = 0;
  const debitPageSize = 25;
  let totalDebitPages = 1;
  let filteredDebitList = [];
  let debitDebounceTimer = null;
  let selectedNote = null;
  let isCreditNote = true;
  let cachedCustomerInvoices = [];
  let cachedSupplierBills = [];
  let cachedAllItems = [];
  let selectedCreditItem = null;
  let selectedDebitItem = null;
  let cachedInvoiceLines = [];
  let cachedBillLines = [];

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
    if (s === 'ACTIVE' || s === 'POSTED') {
      return `<span class="pill-badge pill-success">${status}</span>`;
    } else if (s.includes('CANCEL')) {
      return `<span class="pill-badge pill-danger">${status}</span>`;
    }
    return `<span class="pill-badge pill-neutral">${status || 'ACTIVE'}</span>`;
  }

  // 1. LOAD & RENDER CREDIT NOTES
  async function loadCreditNotes() {
    isCreditNote = true;
    const tbody = document.getElementById('tbl-credit-notes-body');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-muted);"><span class="loading-spinner"></span> Loading credit notes from general ledger...</td></tr>`;
    }

    try {
      creditNotes = await window.OperationsService.getCreditNotes();
      currentCreditPage = 0;
      updateCreditKpis(creditNotes);
      filterCreditNotes(true);
    } catch (err) {
      console.error('Failed to load credit notes:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--red);">⚠️ Failed to load credit notes: ${err.message || 'Server error'}</td></tr>`;
      }
    }
  }

  function updateCreditKpis(list) {
    let totalCount = list.length;
    let totalAmt = 0;
    let taxRev = 0;
    let restocked = 0;

    list.forEach(r => {
      if ((r.status || '').toUpperCase() === 'ACTIVE' || (r.status || '').toUpperCase() === 'POSTED') {
        totalAmt += parseFloat(r.totalAmount) || 0;
        taxRev += (parseFloat(r.cgstAmount) || 0) + (parseFloat(r.sgstAmount) || 0) + (parseFloat(r.igstAmount) || 0);
        if (r.stockReturned) restocked++;
      }
    });

    const cCount = document.getElementById('cn-kpi-count');
    const cAmt = document.getElementById('cn-kpi-amount');
    const cTax = document.getElementById('cn-kpi-tax');
    const cStock = document.getElementById('cn-kpi-stock');

    if (cCount) cCount.innerText = totalCount;
    if (cAmt) cAmt.innerText = formatMoney(totalAmt);
    if (cTax) cTax.innerText = formatMoney(taxRev);
    if (cStock) cStock.innerText = restocked;
  }

  function filterCreditNotes(immediate = false) {
    if (creditDebounceTimer) clearTimeout(creditDebounceTimer);
    const execute = () => {
      const q = document.getElementById('cn-filter-search')?.value?.toLowerCase().trim() || '';
      const reason = document.getElementById('cn-filter-reason')?.value || 'All Reasons';

      filteredCreditList = (creditNotes || []).filter(r => {
        const matchSearch = !q ||
          (r.creditNoteNo && r.creditNoteNo.toLowerCase().includes(q)) ||
          (r.partyName && r.partyName.toLowerCase().includes(q)) ||
          (r.originalInvoiceNo && r.originalInvoiceNo.toLowerCase().includes(q));

        const matchReason = reason === 'All Reasons' ||
          (r.reasonCode && r.reasonCode.equalsIgnoreCase && r.reasonCode.equalsIgnoreCase(reason)) ||
          (r.reasonCode && r.reasonCode === reason);

        return matchSearch && matchReason;
      });

      currentCreditPage = 0;
      renderCreditTable(filteredCreditList);
    };

    if (immediate) execute();
    else creditDebounceTimer = setTimeout(execute, 120);
  }

  function updateCreditPagination(total) {
    totalCreditPages = Math.max(1, Math.ceil(total / creditPageSize));
    if (currentCreditPage >= totalCreditPages) currentCreditPage = totalCreditPages - 1;
    if (currentCreditPage < 0) currentCreditPage = 0;

    const start = total === 0 ? 0 : currentCreditPage * creditPageSize + 1;
    const end = Math.min(total, (currentCreditPage + 1) * creditPageSize);

    const recEl = document.getElementById('cn-record-count');
    if (recEl) {
      recEl.innerText = total === 0 ? 'Showing 0 credit notes' : `Showing ${start}–${end} of ${total.toLocaleString()} credit notes`;
    }

    const pageInfo = document.getElementById('cn-page-info');
    if (pageInfo) pageInfo.innerText = `Page ${currentCreditPage + 1} of ${totalCreditPages}`;

    const btnPrev = document.getElementById('btn-cn-prev');
    if (btnPrev) btnPrev.disabled = currentCreditPage <= 0;

    const btnNext = document.getElementById('btn-cn-next');
    if (btnNext) btnNext.disabled = currentCreditPage >= totalCreditPages - 1;
  }

  function prevCreditPage() {
    if (currentCreditPage > 0) {
      currentCreditPage--;
      renderCreditTable(filteredCreditList);
      const tbl = document.getElementById('credit-notes-main-table');
      if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function nextCreditPage() {
    if (currentCreditPage < totalCreditPages - 1) {
      currentCreditPage++;
      renderCreditTable(filteredCreditList);
      const tbl = document.getElementById('credit-notes-main-table');
      if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function goToCreditPage(p) {
    const pageIndex = Math.max(0, Math.min(p - 1, totalCreditPages - 1));
    if (pageIndex !== currentCreditPage) {
      currentCreditPage = pageIndex;
      renderCreditTable(filteredCreditList);
    }
  }

  function renderCreditTable(rows) {
    const tbody = document.getElementById('tbl-credit-notes-body');
    if (!tbody) return;

    const list = rows || [];
    updateCreditPagination(list.length);

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:1.8rem; margin-bottom:8px;">💳</div>
            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">No credit notes found</div>
            <div style="font-size:0.78rem;">Click "+ New Credit Note" to issue a note with automatic GST reversal.</div>
          </td>
        </tr>
      `;
      return;
    }

    const start = currentCreditPage * creditPageSize;
    const pageRows = list.slice(start, start + creditPageSize);

    tbody.innerHTML = pageRows.map(r => {
      const taxTotal = (parseFloat(r.cgstAmount) || 0) + (parseFloat(r.sgstAmount) || 0) + (parseFloat(r.igstAmount) || 0);
      const isActive = (r.status || '').toUpperCase() === 'ACTIVE' || (r.status || '').toUpperCase() === 'POSTED';

      return `
        <tr onclick="window.CreditDebitNoteController.showNoteDetails(${r.id}, true)" style="cursor:pointer;">
          <td style="font-family:'Space Grotesk', monospace; font-weight:700; color:var(--cyan);">${r.creditNoteNo}</td>
          <td>${formatDate(r.noteDate)}</td>
          <td style="font-weight:600; color:var(--text-main);">${r.partyName || '-'}</td>
          <td style="font-family:monospace; color:var(--purple);">${r.originalInvoiceNo || '-'}</td>
          <td><span class="badge badge-subtle">${r.reasonCode || 'Sales Return'}</span></td>
          <td style="text-align:right;">${formatMoney(r.taxableAmount)}</td>
          <td style="text-align:right; color:var(--cyan);">${formatMoney(taxTotal)}</td>
          <td style="text-align:right; font-weight:700; color:var(--yellow);">${formatMoney(r.totalAmount)}</td>
          <td>${getStatusBadge(r.status)}</td>
          <td style="text-align:center;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.CreditDebitNoteController.toggleActionMenu(${r.id}, true, event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" title="Credit Note Actions">
                ::: Actions
              </button>
              <div id="cn-action-menu-${r.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:#0b1324; border:1px solid rgba(255,255,255,0.14); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.7); min-width:200px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.CreditDebitNoteController.showNoteDetails(${r.id}, true)"><span style="margin-right:8px;">👁️</span> View Details</div>
                <div class="action-menu-item" onclick="window.CreditDebitNoteController.downloadPdf('${r.creditNoteNo}', true)"><span style="margin-right:8px;">🖨️</span> Print / PDF</div>
                <div class="action-menu-item" onclick="window.AppDialogService && window.AppDialogService.showActivityTimeline ? window.AppDialogService.showActivityTimeline('CREDIT_NOTE', ${r.id}, '${r.creditNoteNo}') : null"><span style="margin-right:8px;">📜</span> Audit Trail</div>
                ${isActive ? `
                  <div class="action-menu-divider" style="height:1px; background:rgba(255,255,255,0.06); margin:4px 0;"></div>
                  <div class="action-menu-item danger" onclick="window.CreditDebitNoteController.cancelNote(${r.id}, '${r.creditNoteNo}', true)"><span style="margin-right:8px;">⛔</span> Cancel Note</div>
                ` : ''}
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 2. LOAD & RENDER DEBIT NOTES
  async function loadDebitNotes() {
    isCreditNote = false;
    const tbody = document.getElementById('tbl-debit-notes-body');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-muted);"><span class="loading-spinner"></span> Loading debit notes from procurement ledger...</td></tr>`;
    }

    try {
      debitNotes = await window.OperationsService.getDebitNotes();
      currentDebitPage = 0;
      updateDebitKpis(debitNotes);
      filterDebitNotes(true);
    } catch (err) {
      console.error('Failed to load debit notes:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--red);">⚠️ Failed to load debit notes: ${err.message || 'Server error'}</td></tr>`;
      }
    }
  }

  function updateDebitKpis(list) {
    let totalCount = list.length;
    let totalAmt = 0;
    let taxRev = 0;
    let returnedStock = 0;

    list.forEach(r => {
      if ((r.status || '').toUpperCase() === 'ACTIVE' || (r.status || '').toUpperCase() === 'POSTED') {
        totalAmt += parseFloat(r.totalAmount) || 0;
        taxRev += (parseFloat(r.cgstAmount) || 0) + (parseFloat(r.sgstAmount) || 0) + (parseFloat(r.igstAmount) || 0);
        if (r.stockReturned) returnedStock++;
      }
    });

    const dCount = document.getElementById('dn-kpi-count');
    const dAmt = document.getElementById('dn-kpi-amount');
    const dTax = document.getElementById('dn-kpi-tax');
    const dStock = document.getElementById('dn-kpi-stock');

    if (dCount) dCount.innerText = totalCount;
    if (dAmt) dAmt.innerText = formatMoney(totalAmt);
    if (dTax) dTax.innerText = formatMoney(taxRev);
    if (dStock) dStock.innerText = returnedStock;
  }

  function filterDebitNotes(immediate = false) {
    if (debitDebounceTimer) clearTimeout(debitDebounceTimer);
    const execute = () => {
      const q = document.getElementById('dn-filter-search')?.value?.toLowerCase().trim() || '';
      const reason = document.getElementById('dn-filter-reason')?.value || 'All Reasons';

      filteredDebitList = (debitNotes || []).filter(r => {
        const matchSearch = !q ||
          (r.debitNoteNo && r.debitNoteNo.toLowerCase().includes(q)) ||
          (r.partyName && r.partyName.toLowerCase().includes(q)) ||
          (r.originalInvoiceNo && r.originalInvoiceNo.toLowerCase().includes(q));

        const matchReason = reason === 'All Reasons' ||
          (r.reasonCode && r.reasonCode.equalsIgnoreCase && r.reasonCode.equalsIgnoreCase(reason)) ||
          (r.reasonCode && r.reasonCode === reason);

        return matchSearch && matchReason;
      });

      currentDebitPage = 0;
      renderDebitTable(filteredDebitList);
    };

    if (immediate) execute();
    else debitDebounceTimer = setTimeout(execute, 120);
  }

  function updateDebitPagination(total) {
    totalDebitPages = Math.max(1, Math.ceil(total / debitPageSize));
    if (currentDebitPage >= totalDebitPages) currentDebitPage = totalDebitPages - 1;
    if (currentDebitPage < 0) currentDebitPage = 0;

    const start = total === 0 ? 0 : currentDebitPage * debitPageSize + 1;
    const end = Math.min(total, (currentDebitPage + 1) * debitPageSize);

    const recEl = document.getElementById('dn-record-count');
    if (recEl) {
      recEl.innerText = total === 0 ? 'Showing 0 debit notes' : `Showing ${start}–${end} of ${total.toLocaleString()} debit notes`;
    }

    const pageInfo = document.getElementById('dn-page-info');
    if (pageInfo) pageInfo.innerText = `Page ${currentDebitPage + 1} of ${totalDebitPages}`;

    const btnPrev = document.getElementById('btn-dn-prev');
    if (btnPrev) btnPrev.disabled = currentDebitPage <= 0;

    const btnNext = document.getElementById('btn-dn-next');
    if (btnNext) btnNext.disabled = currentDebitPage >= totalDebitPages - 1;
  }

  function prevDebitPage() {
    if (currentDebitPage > 0) {
      currentDebitPage--;
      renderDebitTable(filteredDebitList);
      const tbl = document.getElementById('debit-notes-main-table');
      if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function nextDebitPage() {
    if (currentDebitPage < totalDebitPages - 1) {
      currentDebitPage++;
      renderDebitTable(filteredDebitList);
      const tbl = document.getElementById('debit-notes-main-table');
      if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function goToDebitPage(p) {
    const pageIndex = Math.max(0, Math.min(p - 1, totalDebitPages - 1));
    if (pageIndex !== currentDebitPage) {
      currentDebitPage = pageIndex;
      renderDebitTable(filteredDebitList);
    }
  }

  function renderDebitTable(rows) {
    const tbody = document.getElementById('tbl-debit-notes-body');
    if (!tbody) return;

    const list = rows || [];
    updateDebitPagination(list.length);

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:1.8rem; margin-bottom:8px;">🧾</div>
            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">No debit notes found</div>
            <div style="font-size:0.78rem;">Click "+ New Debit Note" to issue a note to supplier with ITC reversal.</div>
          </td>
        </tr>
      `;
      return;
    }

    const start = currentDebitPage * debitPageSize;
    const pageRows = list.slice(start, start + debitPageSize);

    tbody.innerHTML = pageRows.map(r => {
      const taxTotal = (parseFloat(r.cgstAmount) || 0) + (parseFloat(r.sgstAmount) || 0) + (parseFloat(r.igstAmount) || 0);
      const isActive = (r.status || '').toUpperCase() === 'ACTIVE' || (r.status || '').toUpperCase() === 'POSTED';

      return `
        <tr onclick="window.CreditDebitNoteController.showNoteDetails(${r.id}, false)" style="cursor:pointer;">
          <td style="font-family:'Space Grotesk', monospace; font-weight:700; color:var(--cyan);">${r.debitNoteNo}</td>
          <td>${formatDate(r.noteDate)}</td>
          <td style="font-weight:600; color:var(--text-main);">${r.supplierName || '-'}</td>
          <td style="font-family:monospace; color:var(--purple);">${r.originalBillNo || '-'}</td>
          <td><span class="badge badge-subtle">${r.reasonCode || 'Purchase Return'}</span></td>
          <td style="text-align:right;">${formatMoney(r.taxableAmount)}</td>
          <td style="text-align:right; color:var(--cyan);">${formatMoney(taxTotal)}</td>
          <td style="text-align:right; font-weight:700; color:var(--yellow);">${formatMoney(r.totalAmount)}</td>
          <td>${getStatusBadge(r.status)}</td>
          <td style="text-align:center;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.CreditDebitNoteController.toggleActionMenu(${r.id}, false, event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" title="Debit Note Actions">
                ::: Actions
              </button>
              <div id="dn-action-menu-${r.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:#0b1324; border:1px solid rgba(255,255,255,0.14); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.7); min-width:200px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.CreditDebitNoteController.showNoteDetails(${r.id}, false)"><span style="margin-right:8px;">👁️</span> View Details</div>
                <div class="action-menu-item" onclick="window.CreditDebitNoteController.downloadPdf('${r.debitNoteNo}', false)"><span style="margin-right:8px;">🖨️</span> Print / PDF</div>
                <div class="action-menu-item" onclick="window.AppDialogService && window.AppDialogService.showActivityTimeline ? window.AppDialogService.showActivityTimeline('DEBIT_NOTE', ${r.id}, '${r.debitNoteNo}') : null"><span style="margin-right:8px;">📜</span> Audit Trail</div>
                ${isActive ? `
                  <div class="action-menu-divider" style="height:1px; background:rgba(255,255,255,0.06); margin:4px 0;"></div>
                  <div class="action-menu-item danger" onclick="window.CreditDebitNoteController.cancelNote(${r.id}, '${r.debitNoteNo}', false)"><span style="margin-right:8px;">⛔</span> Cancel Note</div>
                ` : ''}
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function toggleActionMenu(id, isCredit, event) {
    if (event) event.stopPropagation();
    const menuId = (isCredit ? 'cn-action-menu-' : 'dn-action-menu-') + id;
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

        const menuHeight = targetMenu.offsetHeight || 160;
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

  // 3. SHOW NOTE DETAILS IN SLIDE DRAWER
  let currentInspectionNote = null;

  async function showNoteDetails(id, isCredit = true) {
    const modal = document.getElementById('modal-note-inspection');
    const overlay = document.getElementById('side-drawer-overlay');
    if (!modal) return;

    // Toggle close if clicking already active note
    if (modal.classList.contains('open') && selectedNote && selectedNote.id === id) {
      closeInspectionModal();
      return;
    }

    // Highlight row
    const tableId = isCredit ? 'tbl-credit-notes-body' : 'tbl-debit-notes-body';
    document.querySelectorAll(`#${tableId} tr.active-selected-row`).forEach(r => r.classList.remove('active-selected-row'));
    const rows = document.querySelectorAll(`#${tableId} tr`);
    rows.forEach(r => {
      const onclickAttr = r.getAttribute('onclick') || '';
      if (onclickAttr.includes(`showNoteDetails(${id}`)) {
        r.classList.add('active-selected-row');
      }
    });

    if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();

    // 1. Initial quick render from memory cache
    const sourceList = isCredit ? creditNotes : debitNotes;
    let n = sourceList.find(x => x.id === id) || { id };
    selectedNote = n;
    currentInspectionNote = n;
    populateNoteInspectionModal(n, isCredit);

    // Switch to Tab 1 (Impact)
    switchInspectionTab('impact');

    modal.style.display = 'flex';
    modal.classList.add('open');
    if (overlay) {
      overlay.style.display = 'block';
      overlay.style.pointerEvents = 'auto';
      overlay.classList.add('open');
    }

    // 2. Fetch full details from server
    try {
      const full = await window.ApiService.get(`/api/credit-debit-notes/${id}`);
      if (full && selectedNote && selectedNote.id === id) {
        selectedNote = full;
        currentInspectionNote = full;
        populateNoteInspectionModal(full, isCredit);
      }
    } catch (e) {
      console.warn('Background note fetch error:', e);
    }
  }

  function populateNoteInspectionModal(n, isCredit) {
    if (!n) return;

    const noteNum = n.noteNumber || n.number || n.no || '-';
    const origInv = n.invoiceNumber || n.invoiceNo || n.originalInvoiceNumber || '-';
    const partyName = n.partyName || n.customerName || n.supplierName || 'Walk-in Party';

    // Header Hero
    const elKicker = document.getElementById('note-inspect-kicker');
    if (elKicker) elKicker.innerText = isCredit ? 'CREDIT NOTE DOCUMENT' : 'DEBIT NOTE DOCUMENT';

    const elNo = document.getElementById('note-inspect-no');
    if (elNo) elNo.innerText = noteNum;

    const elMeta = document.getElementById('note-inspect-meta');
    if (elMeta) {
      const dStr = n.noteDate || n.date ? formatDate(n.noteDate || n.date) : '-';
      elMeta.innerText = `Issue Date: ${dStr} • Linked Document: ${origInv}`;
    }

    const elStatus = document.getElementById('note-inspect-status');
    if (elStatus) {
      const st = (n.status || 'ACTIVE').toUpperCase();
      elStatus.innerText = st;
      elStatus.className = `status-pill ${st === 'ACTIVE' || st === 'SETTLED' ? 'pill-success' : 'pill-danger'}`;
    }

    // Card 1: Party & Reference
    const elParty = document.getElementById('note-inspect-party-name');
    if (elParty) elParty.innerText = partyName;

    const elGstin = document.getElementById('note-inspect-gstin');
    if (elGstin) elGstin.innerText = n.gstin || 'Unregistered / Consumer';

    const elOrigInv = document.getElementById('note-inspect-orig-inv');
    if (elOrigInv) elOrigInv.innerText = origInv;

    // Card 2: Financials
    const totalAmt = n.totalAmount != null ? n.totalAmount : (n.amount != null ? n.amount : 0);
    const gstAmt = n.gstAmount != null ? n.gstAmount : 0;
    const taxableAmt = n.taxableAmount != null ? n.taxableAmount : Math.max(0, totalAmt - gstAmt);

    const elTaxable = document.getElementById('note-inspect-taxable');
    if (elTaxable) elTaxable.innerText = formatMoney(taxableAmt);

    const elGst = document.getElementById('note-inspect-gst');
    if (elGst) elGst.innerText = formatMoney(gstAmt);

    const elTotal = document.getElementById('note-inspect-total');
    if (elTotal) elTotal.innerText = formatMoney(totalAmt);

    // Card 3: Reason & State
    const elReasonCode = document.getElementById('note-inspect-reason-code');
    if (elReasonCode) elReasonCode.innerText = n.reason || (isCredit ? 'Sales Return / Rate Diff' : 'Purchase Return / Rate Diff');

    const elSettleState = document.getElementById('note-inspect-settle-state');
    if (elSettleState) elSettleState.innerText = (n.status || 'SETTLED').toUpperCase();

    const elDate = document.getElementById('note-inspect-date');
    if (elDate) elDate.innerText = n.noteDate || n.date ? formatDate(n.noteDate || n.date) : '-';

    // Tab 1: GST & General Ledger Impact
    const isInterState = (n.gstType || '').toUpperCase().includes('IGST') || (n.gstin && !n.gstin.startsWith('24'));
    const gstRate = parseFloat(n.gstRate) || 18.0;

    const elCgstRate = document.getElementById('note-inspect-cgst-rate');
    const elCgstTax = document.getElementById('note-inspect-cgst-taxable');
    const elCgstAmt = document.getElementById('note-inspect-cgst-amt');

    const elSgstRate = document.getElementById('note-inspect-sgst-rate');
    const elSgstTax = document.getElementById('note-inspect-sgst-taxable');
    const elSgstAmt = document.getElementById('note-inspect-sgst-amt');

    const elIgstRate = document.getElementById('note-inspect-igst-rate');
    const elIgstTax = document.getElementById('note-inspect-igst-taxable');
    const elIgstAmt = document.getElementById('note-inspect-igst-amt');

    if (isInterState) {
      if (elCgstRate) elCgstRate.innerText = '0.0%';
      if (elCgstTax) elCgstTax.innerText = '₹ 0.00';
      if (elCgstAmt) elCgstAmt.innerText = '₹ 0.00';

      if (elSgstRate) elSgstRate.innerText = '0.0%';
      if (elSgstTax) elSgstTax.innerText = '₹ 0.00';
      if (elSgstAmt) elSgstAmt.innerText = '₹ 0.00';

      if (elIgstRate) elIgstRate.innerText = `${gstRate.toFixed(1)}%`;
      if (elIgstTax) elIgstTax.innerText = formatMoney(taxableAmt);
      if (elIgstAmt) elIgstAmt.innerText = formatMoney(gstAmt);
    } else {
      const halfRate = (gstRate / 2).toFixed(1);
      const halfAmt = gstAmt / 2;

      if (elCgstRate) elCgstRate.innerText = `${halfRate}%`;
      if (elCgstTax) elCgstTax.innerText = formatMoney(taxableAmt);
      if (elCgstAmt) elCgstAmt.innerText = formatMoney(halfAmt);

      if (elSgstRate) elSgstRate.innerText = `${halfRate}%`;
      if (elSgstTax) elSgstTax.innerText = formatMoney(taxableAmt);
      if (elSgstAmt) elSgstAmt.innerText = formatMoney(halfAmt);

      if (elIgstRate) elIgstRate.innerText = '0.0%';
      if (elIgstTax) elIgstTax.innerText = '₹ 0.00';
      if (elIgstAmt) elIgstAmt.innerText = '₹ 0.00';
    }

    const elGlDebit = document.getElementById('note-inspect-gl-debit');
    const elGlCredit = document.getElementById('note-inspect-gl-credit');
    if (isCredit) {
      if (elGlDebit) elGlDebit.innerText = 'Sales Returns / Rate Difference A/c';
      if (elGlCredit) elGlCredit.innerText = `${partyName} (Customer Ledger)`;
    } else {
      if (elGlDebit) elGlDebit.innerText = `${partyName} (Supplier Ledger)`;
      if (elGlCredit) elGlCredit.innerText = 'Purchase Returns / Rate Difference A/c';
    }

    // Tab 2: Remarks
    const elRemarks = document.getElementById('note-inspect-remarks');
    if (elRemarks) elRemarks.innerText = n.remarks || n.notes || 'No special commercial remarks recorded.';
  }

  function switchInspectionTab(tabName) {
    const tabs = ['impact', 'notes'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-note-${t}`);
      const pane = document.getElementById(`pane-note-${t}`);
      if (btn) btn.classList.toggle('active', t === tabName);
      if (pane) pane.classList.toggle('active', t === tabName);
    });
  }

  function closeInspectionModal() {
    const modal = document.getElementById('modal-note-inspection');
    const overlay = document.getElementById('side-drawer-overlay');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
    if (overlay) {
      overlay.classList.remove('open');
      overlay.style.display = 'none';
    }
    document.querySelectorAll('#tbl-credit-notes-body tr.active-selected-row, #tbl-debit-notes-body tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    selectedNote = null;
    currentInspectionNote = null;
  }

  function closeDrawer(isCredit = true) {
    closeInspectionModal();
  }

  function copyNoteNo() {
    const n = currentInspectionNote || selectedNote;
    const no = n ? (n.noteNumber || n.number || n.no) : '';
    if (!no) return;
    navigator.clipboard.writeText(no).then(() => {
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Copied note ${no} to clipboard`);
    });
  }

  function editCurrentInspectionNote() {
    const n = currentInspectionNote || selectedNote;
    if (!n) return;
    const isCredit = (n.noteType || '').toUpperCase().includes('CREDIT') || (n.noteNumber || '').startsWith('CN');
    openEditNoteModal(n.id, isCredit);
  }

  function printCurrentInspectionPdf() {
    const n = currentInspectionNote || selectedNote;
    if (!n) return;
    printPdf(n.id);
  }

  function printCurrentInspectionBarcode() {
    const n = currentInspectionNote || selectedNote;
    if (!n) return;
    printBarcode(n.id);
  }

  // 4. CANCEL NOTE ACTION
  async function cancelNote(id, noteNo, isCredit = true) {
    const noteType = isCredit ? 'Credit Note' : 'Debit Note';
    if (window.AppDialogService && typeof window.AppDialogService.confirm === 'function') {
      const ok = await window.AppDialogService.confirm('Cancel Note', 'Reverse Postings', `Cancel ${noteType} ${noteNo}?\n\nThis will reverse General Ledger postings and adjust inventory back.`, `Cancel ${noteType}`, 'Keep Note');
      if (!ok) return;
    } else if (!confirm(`Cancel ${noteType} ${noteNo}?\n\nThis will reverse General Ledger postings and adjust inventory back.`)) {
      return;
    }

    try {
      if (isCredit) {
        await window.OperationsService.cancelCreditNote(id, 'Admin');
      } else {
        await window.OperationsService.cancelDebitNote(id, 'Admin');
      }
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`${noteType} ${noteNo} cancelled successfully.`);
      if (isCredit) loadCreditNotes(); else loadDebitNotes();
      closeDrawer(isCredit);
    } catch (err) {
      console.error(`Failed to cancel ${noteType}:`, err);
      alert(`Failed to cancel: ` + (err.message || 'Server error'));
    }
  }

  function downloadPdf(noteNo, isCredit = true) {
    const typeCode = isCredit ? 'CREDIT_NOTE' : 'DEBIT_NOTE';
    const url = `/api/documents/render?type=${typeCode}&number=${encodeURIComponent(noteNo)}&format=PDF`;
    if (window.ApiService && typeof window.ApiService.downloadFile === 'function') {
      window.ApiService.downloadFile(url, `${noteNo}.pdf`);
    } else {
      window.open(url, '_blank');
    }
  }

  // 5. CREATE NOTE MODALS
  async function openCreateCreditModal() {
    const modal = document.getElementById('modal-create-credit-note');
    if (!modal) return;
    const inpParty = document.getElementById('m-cn-party');
    const selInv = document.getElementById('m-cn-invoice');
    const selItem = document.getElementById('m-cn-item');
    const inpTax = document.getElementById('m-cn-taxable');
    const selReason = document.getElementById('m-cn-reason');
    const selGst = document.getElementById('m-cn-gst-rate');
    const chkStock = document.getElementById('m-cn-adjust-stock');

    if (inpParty) inpParty.value = '';
    if (selInv) selInv.innerHTML = '<option value="">-- Select Customer Invoice --</option>';
    if (selItem) selItem.innerHTML = '<option value="">-- Auto from invoice or select product --</option>';
    const inpQty = document.getElementById('m-cn-quantity');
    if (inpQty) inpQty.value = '1';
    if (inpTax) inpTax.value = '';
    if (chkStock) chkStock.checked = true;
    selectedCreditItem = null;
    cachedCustomerInvoices = [];
    cachedInvoiceLines = [];

    // Preload Items for fallback stock adjustment
    try {
      if (cachedAllItems.length === 0 && window.MasterService && window.MasterService.getItems) {
        cachedAllItems = await window.MasterService.getItems().catch(() => []);
      }
      if (selItem && cachedAllItems.length > 0) {
        selItem.innerHTML = '<option value="">-- Auto from invoice or select product --</option>' +
          cachedAllItems.map(it => `<option value="ITEM_${it.id}" data-code="${it.code || it.itemCode || ''}" data-desc="${it.name || it.description || ''}">${it.code || it.itemCode} - ${it.name || it.description || ''}</option>`).join('');
      }
    } catch (_) {}

    // 1. Dynamic Master Lookups for Reason and GST Rate
    try {
      if (window.MasterService && window.MasterService.getLookupsByCategoryCode) {
        const reasons = await window.MasterService.getLookupsByCategoryCode('CREDIT_NOTE_REASON').catch(() => []);
        if (Array.isArray(reasons) && reasons.length > 0 && selReason) {
          selReason.innerHTML = reasons.filter(r => r.active !== false).map(r => `<option value="${r.lookupValue}">${r.lookupValue}</option>`).join('');
        }
        const gstRates = await window.MasterService.getLookupsByCategoryCode('GST_RATE').catch(() => []);
        if (Array.isArray(gstRates) && gstRates.length > 0 && selGst) {
          selGst.innerHTML = gstRates.filter(g => g.active !== false).map(g => `<option value="${parseFloat(g.lookupValue) || 18}">${g.lookupValue}% (${g.description || 'Standard'})</option>`).join('');
        }
      }
    } catch (e) {
      console.warn('Could not populate Credit Note master lookups:', e);
    }

    // 2. Setup Party Autocomplete & Cascading Invoices
    try {
      if (window.MasterService && window.MasterService.getParties) {
        const customers = await window.MasterService.getParties('CUSTOMER');
        let dl = document.getElementById('dl-cn-customers');
        if (!dl) {
          dl = document.createElement('datalist');
          dl.id = 'dl-cn-customers';
          document.body.appendChild(dl);
        }
        dl.innerHTML = (customers || []).map(c => `<option value="${c.name || c.partyName}" data-id="${c.id}">${c.name || c.partyName}</option>`).join('');
        if (inpParty) {
          inpParty.setAttribute('list', 'dl-cn-customers');
          inpParty.onchange = async () => {
            const pName = inpParty.value.trim().toLowerCase();
            const matched = (customers || []).find(c => (c.name || c.partyName || '').toLowerCase() === pName);
            const customerSearchName = (matched && (matched.name || matched.partyName)) ? (matched.name || matched.partyName) : inpParty.value.trim();
            if (customerSearchName && window.OperationsService && window.OperationsService.getSalesPage) {
              try {
                const sRes = await window.OperationsService.getSalesPage(0, 50, '', '', customerSearchName);
                const sList = sRes.rows || sRes.content || [];
                cachedCustomerInvoices = sList;
                if (selInv) {
                  selInv.innerHTML = '<option value="">-- Select Customer Invoice --</option>' + 
                    sList.map(s => `<option value="${s.invoiceNo || s.number}">${s.invoiceNo || s.number} - ₹ ${(s.totalAmount || 0).toLocaleString()}</option>`).join('');
                }
              } catch (_) {}
            }
          };
        }
      }
    } catch (e2) {
      console.warn('Could not populate Credit Note party datalist:', e2);
    }

    recalcCreditTax();
    modal.style.display = 'flex';
  }

  async function onInvoiceSelected(invNo) {
    const selItem = document.getElementById('m-cn-item');
    const inpTax = document.getElementById('m-cn-taxable');
    const selGst = document.getElementById('m-cn-gst-rate');
    const inpQty = document.getElementById('m-cn-quantity');
    selectedCreditItem = null;
    cachedInvoiceLines = [];

    if (!invNo) {
      if (selItem) selItem.innerHTML = '<option value="">-- Auto from invoice or select product --</option>';
      if (inpTax) inpTax.value = '';
      if (inpQty) inpQty.value = '1';
      recalcCreditTax();
      return;
    }

    const selInv = cachedCustomerInvoices.find(s => (s.invoiceNo || s.number) === invNo);
    if (selInv && inpTax) {
      inpTax.value = selInv.taxableAmount || selInv.subtotal || selInv.totalAmount || '';
    }

    try {
      let fullSale = selInv;
      if (window.OperationsService && window.OperationsService.getSaleByInvoice) {
        fullSale = await window.OperationsService.getSaleByInvoice(invNo).catch(() => selInv);
      }
      const lines = (fullSale && (fullSale.items || fullSale.lines)) || [];
      cachedInvoiceLines = lines;

      if (selItem) {
        if (lines.length > 0) {
          selItem.innerHTML = '<option value="">-- Select Specific Line Item to Adjust --</option>' +
            lines.map((l, idx) => {
              const code = l.itemCode || l.code || '';
              const desc = l.itemDescription || l.description || l.name || '';
              const qty = l.quantity != null ? l.quantity : 1;
              const rate = l.unitPrice != null ? l.unitPrice : (l.rate != null ? l.rate : 0);
              return `<option value="LINE_${idx}">${code ? '[' + code + '] ' : ''}${desc} (Qty: ${qty} @ ₹ ${rate})</option>`;
            }).join('');
        } else if (cachedAllItems.length > 0) {
          selItem.innerHTML = '<option value="">-- Select SKU from Catalog --</option>' +
            cachedAllItems.map(it => `<option value="ITEM_${it.id}">${it.code || it.itemCode} - ${it.name || it.description || ''}</option>`).join('');
        } else {
          selItem.innerHTML = '<option value="">-- Auto from invoice or select product --</option>';
        }
      }
    } catch (e) {
      console.warn('Could not load invoice lines for credit note:', e);
    }
    recalcCreditTax();
  }

  function onCreditItemSelected(val) {
    const inpTax = document.getElementById('m-cn-taxable');
    const selGst = document.getElementById('m-cn-gst-rate');
    const inpQty = document.getElementById('m-cn-quantity');
    let qty = parseFloat(inpQty?.value) || 1;

    if (!val) {
      selectedCreditItem = null;
      recalcCreditTax();
      return;
    }

    if (val.startsWith('LINE_')) {
      const idx = parseInt(val.replace('LINE_', ''), 10);
      const line = cachedInvoiceLines[idx];
      if (line) {
        selectedCreditItem = {
          itemId: line.itemId || line.id,
          itemCode: line.itemCode || line.code,
          itemDescription: line.itemDescription || line.description || line.name,
          unitPrice: line.unitPrice != null ? line.unitPrice : (line.rate != null ? line.rate : 0),
          gstRate: line.gstRate != null ? line.gstRate : (line.gst != null ? line.gst : 18),
          originalQty: line.quantity || 1
        };
        if (inpQty && line.quantity) {
          inpQty.value = line.quantity;
          qty = line.quantity;
        }
        if (inpTax) {
          inpTax.value = Math.round(selectedCreditItem.unitPrice * qty * 100) / 100;
        }
        if (selGst && selectedCreditItem.gstRate != null) {
          selGst.value = String(selectedCreditItem.gstRate);
        }
      }
    } else if (val.startsWith('ITEM_')) {
      const id = parseInt(val.replace('ITEM_', ''), 10);
      const it = cachedAllItems.find(x => x.id === id);
      if (it) {
        const rate = it.sellingPrice || it.purchasePrice || 0;
        selectedCreditItem = {
          itemId: it.id,
          itemCode: it.code || it.itemCode,
          itemDescription: it.name || it.description,
          unitPrice: rate,
          gstRate: it.gstRate || it.gst || 18,
          originalQty: 1
        };
        if (inpTax) inpTax.value = Math.round(rate * qty * 100) / 100;
        if (selGst && selectedCreditItem.gstRate != null) selGst.value = String(selectedCreditItem.gstRate);
      }
    }
    recalcCreditTax();
  }

  function onCreditQuantityChanged() {
    const inpQty = document.getElementById('m-cn-quantity');
    const inpTax = document.getElementById('m-cn-taxable');
    const qty = parseFloat(inpQty?.value) || 1;
    if (selectedCreditItem && selectedCreditItem.unitPrice != null && inpTax) {
      inpTax.value = Math.round(selectedCreditItem.unitPrice * qty * 100) / 100;
    }
    recalcCreditTax();
  }

  function recalcCreditTax() {
    const taxable = parseFloat(document.getElementById('m-cn-taxable')?.value) || 0;
    const rate = parseFloat(document.getElementById('m-cn-gst-rate')?.value) || 0;
    const tax = Math.round((taxable * rate / 100) * 100) / 100;
    const total = Math.round((taxable + tax) * 100) / 100;

    const taxEl = document.getElementById('m-cn-preview-tax');
    const totalEl = document.getElementById('m-cn-preview-total');
    if (taxEl) taxEl.innerText = formatMoney(tax);
    if (totalEl) totalEl.innerText = formatMoney(total);
  }

  async function submitCreateCreditNote() {
    const party = document.getElementById('m-cn-party')?.value?.trim();
    const invoice = document.getElementById('m-cn-invoice')?.value?.trim();
    const reason = document.getElementById('m-cn-reason')?.value || 'Sales Return';
    const taxable = parseFloat(document.getElementById('m-cn-taxable')?.value) || 0;
    const gstRate = parseFloat(document.getElementById('m-cn-gst-rate')?.value) || 18;
    const adjustStock = document.getElementById('m-cn-adjust-stock')?.checked;
    const inpQty = document.getElementById('m-cn-quantity');
    const qty = Math.max(1, parseFloat(inpQty?.value) || 1);

    if (!party) { alert('Customer name is required.'); return; }
    if (taxable <= 0) { alert('Taxable amount must be greater than zero.'); return; }

    if (adjustStock && (!selectedCreditItem || !selectedCreditItem.itemId)) {
      alert('To adjust inventory back to warehouse, please select the specific line item or product to return.');
      return;
    }

    const taxTotal = Math.round((taxable * gstRate / 100) * 100) / 100;
    const cgst = Math.round((taxTotal / 2) * 100) / 100;
    const sgst = Math.round((taxTotal - cgst) * 100) / 100;
    const total = taxable + taxTotal;

    const chosenItemId = selectedCreditItem ? selectedCreditItem.itemId : null;
    const chosenItemCode = selectedCreditItem ? selectedCreditItem.itemCode : 'CREDIT-ADJ';
    const chosenItemDesc = selectedCreditItem ? selectedCreditItem.itemDescription : `Credit Note Adjustment: ${reason}`;
    const unitPrice = selectedCreditItem ? selectedCreditItem.unitPrice : Math.round((taxable / qty) * 100) / 100;

    // Build complete payload matching CreditDebitNoteDtos.CreditNoteDto with lines and itemId
    const payload = {
      partyName: party,
      originalInvoiceNo: invoice,
      reasonCode: reason,
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: 0,
      totalAmount: total,
      stockReturned: !!adjustStock,
      status: 'ACTIVE',
      lines: [
        {
          itemId: chosenItemId,
          itemCode: chosenItemCode,
          itemDescription: chosenItemDesc,
          quantity: qty,
          unitPrice: unitPrice,
          gstRate: gstRate,
          taxableValue: taxable,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: 0,
          totalLineAmount: total
        }
      ]
    };

    const btn = document.getElementById('btn-submit-create-cn');
    if (btn) { btn.disabled = true; btn.innerText = 'Creating Credit Note...'; }

    try {
      const created = await window.OperationsService.createCreditNote(payload, 'Admin');
      const no = created?.creditNoteNo || 'Credit Note';
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Credit Note ${no} created and posted to general ledger successfully!`);
      closeModal('modal-create-credit-note');
      loadCreditNotes();
    } catch (err) {
      console.error('Failed to create credit note:', err);
      alert('Failed to create credit note: ' + (err.message || 'Server error'));
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = 'Create Credit Note'; }
    }
  }

  async function openCreateDebitModal() {
    const modal = document.getElementById('modal-create-debit-note');
    if (!modal) return;
    const inpSupp = document.getElementById('m-dn-supplier');
    const selBill = document.getElementById('m-dn-bill');
    const selItem = document.getElementById('m-dn-item');
    const inpTax = document.getElementById('m-dn-taxable');
    const selReason = document.getElementById('m-dn-reason');
    const selGst = document.getElementById('m-dn-gst-rate');
    const chkStock = document.getElementById('m-dn-adjust-stock');

    if (inpSupp) inpSupp.value = '';
    if (selBill) selBill.innerHTML = '<option value="">-- Select Vendor Bill --</option>';
    if (selItem) selItem.innerHTML = '<option value="">-- Auto from bill or select product --</option>';
    const inpQty = document.getElementById('m-dn-quantity');
    if (inpQty) inpQty.value = '1';
    if (inpTax) inpTax.value = '';
    if (chkStock) chkStock.checked = true;
    selectedDebitItem = null;
    cachedSupplierBills = [];
    cachedBillLines = [];

    // Preload Items for fallback stock adjustment
    try {
      if (cachedAllItems.length === 0 && window.MasterService && window.MasterService.getItems) {
        cachedAllItems = await window.MasterService.getItems().catch(() => []);
      }
      if (selItem && cachedAllItems.length > 0) {
        selItem.innerHTML = '<option value="">-- Auto from bill or select product --</option>' +
          cachedAllItems.map(it => `<option value="ITEM_${it.id}" data-code="${it.code || it.itemCode || ''}" data-desc="${it.name || it.description || ''}">${it.code || it.itemCode} - ${it.name || it.description || ''}</option>`).join('');
      }
    } catch (_) {}

    // 1. Dynamic Master Lookups for Reason and GST Rate
    try {
      if (window.MasterService && window.MasterService.getLookupsByCategoryCode) {
        const reasons = await window.MasterService.getLookupsByCategoryCode('DEBIT_NOTE_REASON').catch(() => []);
        if (Array.isArray(reasons) && reasons.length > 0 && selReason) {
          selReason.innerHTML = reasons.filter(r => r.active !== false).map(r => `<option value="${r.lookupValue}">${r.lookupValue}</option>`).join('');
        }
        const gstRates = await window.MasterService.getLookupsByCategoryCode('GST_RATE').catch(() => []);
        if (Array.isArray(gstRates) && gstRates.length > 0 && selGst) {
          selGst.innerHTML = gstRates.filter(g => g.active !== false).map(g => `<option value="${parseFloat(g.lookupValue) || 18}">${g.lookupValue}% (${g.description || 'Standard'})</option>`).join('');
        }
      }
    } catch (e) {
      console.warn('Could not populate Debit Note master lookups:', e);
    }

    // 2. Setup Supplier Autocomplete & Cascading Bills
    try {
      if (window.MasterService && window.MasterService.getParties) {
        const suppliers = await window.MasterService.getParties('SUPPLIER');
        let dl = document.getElementById('dl-dn-suppliers');
        if (!dl) {
          dl = document.createElement('datalist');
          dl.id = 'dl-dn-suppliers';
          document.body.appendChild(dl);
        }
        dl.innerHTML = (suppliers || []).map(s => `<option value="${s.name || s.partyName}" data-id="${s.id}">${s.name || s.partyName}</option>`).join('');
        if (inpSupp) {
          inpSupp.setAttribute('list', 'dl-dn-suppliers');
          inpSupp.onchange = async () => {
            const sName = inpSupp.value.trim().toLowerCase();
            const matched = (suppliers || []).find(s => (s.name || s.partyName || '').toLowerCase() === sName);
            const supplierSearchName = (matched && (matched.name || matched.partyName)) ? (matched.name || matched.partyName) : inpSupp.value.trim();
            if (supplierSearchName && window.OperationsService && window.OperationsService.getPurchasesPage) {
              try {
                const pRes = await window.OperationsService.getPurchasesPage(0, 50, '', supplierSearchName);
                const pList = pRes.rows || pRes.content || [];
                cachedSupplierBills = pList;
                if (selBill) {
                  selBill.innerHTML = '<option value="">-- Select Vendor Bill --</option>' + 
                    pList.map(p => `<option value="${p.invoiceNo || p.billNo || p.number}">${p.invoiceNo || p.billNo || p.number} - ₹ ${(p.totalAmount || 0).toLocaleString()}</option>`).join('');
                }
              } catch (_) {}
            }
          };
        }
      }
    } catch (e2) {
      console.warn('Could not populate Debit Note supplier datalist:', e2);
    }

    recalcDebitTax();
    modal.style.display = 'flex';
  }

  async function onBillSelected(billNo) {
    const selItem = document.getElementById('m-dn-item');
    const inpTax = document.getElementById('m-dn-taxable');
    const selGst = document.getElementById('m-dn-gst-rate');
    const inpQty = document.getElementById('m-dn-quantity');
    selectedDebitItem = null;
    cachedBillLines = [];

    if (!billNo) {
      if (selItem) selItem.innerHTML = '<option value="">-- Auto from bill or select product --</option>';
      if (inpTax) inpTax.value = '';
      if (inpQty) inpQty.value = '1';
      recalcDebitTax();
      return;
    }

    const selBill = cachedSupplierBills.find(p => (p.invoiceNo || p.billNo || p.number) === billNo);
    if (selBill && inpTax) {
      inpTax.value = selBill.taxableAmount || selBill.subtotal || selBill.totalAmount || '';
    }

    try {
      let fullPurchase = selBill;
      if (window.OperationsService && window.OperationsService.getPurchaseByInvoice) {
        fullPurchase = await window.OperationsService.getPurchaseByInvoice(billNo).catch(() => selBill);
      }
      const lines = (fullPurchase && (fullPurchase.items || fullPurchase.lines)) || [];
      cachedBillLines = lines;

      if (selItem) {
        if (lines.length > 0) {
          selItem.innerHTML = '<option value="">-- Select Specific Line Item to Adjust --</option>' +
            lines.map((l, idx) => {
              const code = l.itemCode || l.code || '';
              const desc = l.itemDescription || l.description || l.name || '';
              const qty = l.quantity != null ? l.quantity : 1;
              const rate = l.unitPrice != null ? l.unitPrice : (l.rate != null ? l.rate : 0);
              return `<option value="LINE_${idx}">${code ? '[' + code + '] ' : ''}${desc} (Qty: ${qty} @ ₹ ${rate})</option>`;
            }).join('');
        } else if (cachedAllItems.length > 0) {
          selItem.innerHTML = '<option value="">-- Select SKU from Catalog --</option>' +
            cachedAllItems.map(it => `<option value="ITEM_${it.id}">${it.code || it.itemCode} - ${it.name || it.description || ''}</option>`).join('');
        } else {
          selItem.innerHTML = '<option value="">-- Auto from bill or select product --</option>';
        }
      }
    } catch (e) {
      console.warn('Could not load bill lines for debit note:', e);
    }
    recalcDebitTax();
  }

  function onDebitItemSelected(val) {
    const inpTax = document.getElementById('m-dn-taxable');
    const selGst = document.getElementById('m-dn-gst-rate');
    const inpQty = document.getElementById('m-dn-quantity');
    let qty = parseFloat(inpQty?.value) || 1;

    if (!val) {
      selectedDebitItem = null;
      recalcDebitTax();
      return;
    }

    if (val.startsWith('LINE_')) {
      const idx = parseInt(val.replace('LINE_', ''), 10);
      const line = cachedBillLines[idx];
      if (line) {
        selectedDebitItem = {
          itemId: line.itemId || line.id,
          itemCode: line.itemCode || line.code,
          itemDescription: line.itemDescription || line.description || line.name,
          unitPrice: line.unitPrice != null ? line.unitPrice : (line.rate != null ? line.rate : 0),
          gstRate: line.gstRate != null ? line.gstRate : (line.gst != null ? line.gst : 18),
          originalQty: line.quantity || 1
        };
        if (inpQty && line.quantity) {
          inpQty.value = line.quantity;
          qty = line.quantity;
        }
        if (inpTax) {
          inpTax.value = Math.round(selectedDebitItem.unitPrice * qty * 100) / 100;
        }
        if (selGst && selectedDebitItem.gstRate != null) {
          selGst.value = String(selectedDebitItem.gstRate);
        }
      }
    } else if (val.startsWith('ITEM_')) {
      const id = parseInt(val.replace('ITEM_', ''), 10);
      const it = cachedAllItems.find(x => x.id === id);
      if (it) {
        const rate = it.purchasePrice || it.sellingPrice || 0;
        selectedDebitItem = {
          itemId: it.id,
          itemCode: it.code || it.itemCode,
          itemDescription: it.name || it.description,
          unitPrice: rate,
          gstRate: it.gstRate || it.gst || 18,
          originalQty: 1
        };
        if (inpTax) inpTax.value = Math.round(rate * qty * 100) / 100;
        if (selGst && selectedDebitItem.gstRate != null) selGst.value = String(selectedDebitItem.gstRate);
      }
    }
    recalcDebitTax();
  }

  function onDebitQuantityChanged() {
    const inpQty = document.getElementById('m-dn-quantity');
    const inpTax = document.getElementById('m-dn-taxable');
    const qty = parseFloat(inpQty?.value) || 1;
    if (selectedDebitItem && selectedDebitItem.unitPrice != null && inpTax) {
      inpTax.value = Math.round(selectedDebitItem.unitPrice * qty * 100) / 100;
    }
    recalcDebitTax();
  }

  function recalcDebitTax() {
    const taxable = parseFloat(document.getElementById('m-dn-taxable')?.value) || 0;
    const rate = parseFloat(document.getElementById('m-dn-gst-rate')?.value) || 0;
    const tax = Math.round((taxable * rate / 100) * 100) / 100;
    const total = Math.round((taxable + tax) * 100) / 100;

    const taxEl = document.getElementById('m-dn-preview-tax');
    const totalEl = document.getElementById('m-dn-preview-total');
    if (taxEl) taxEl.innerText = formatMoney(tax);
    if (totalEl) totalEl.innerText = formatMoney(total);
  }

  async function submitCreateDebitNote() {
    const supplier = document.getElementById('m-dn-supplier')?.value?.trim();
    const bill = document.getElementById('m-dn-bill')?.value?.trim();
    const reason = document.getElementById('m-dn-reason')?.value || 'Purchase Return';
    const taxable = parseFloat(document.getElementById('m-dn-taxable')?.value) || 0;
    const gstRate = parseFloat(document.getElementById('m-dn-gst-rate')?.value) || 18;
    const adjustStock = document.getElementById('m-dn-adjust-stock')?.checked;
    const inpQty = document.getElementById('m-dn-quantity');
    const qty = Math.max(1, parseFloat(inpQty?.value) || 1);

    if (!supplier) { alert('Supplier name is required.'); return; }
    if (taxable <= 0) { alert('Taxable amount must be greater than zero.'); return; }

    if (adjustStock && (!selectedDebitItem || !selectedDebitItem.itemId)) {
      alert('To reduce inventory from warehouse, please select the specific line item or product returned to vendor.');
      return;
    }

    const taxTotal = Math.round((taxable * gstRate / 100) * 100) / 100;
    const cgst = Math.round((taxTotal / 2) * 100) / 100;
    const sgst = Math.round((taxTotal - cgst) * 100) / 100;
    const total = taxable + taxTotal;

    const chosenItemId = selectedDebitItem ? selectedDebitItem.itemId : null;
    const chosenItemCode = selectedDebitItem ? selectedDebitItem.itemCode : 'DEBIT-ADJ';
    const chosenItemDesc = selectedDebitItem ? selectedDebitItem.itemDescription : `Debit Note Adjustment: ${reason}`;
    const unitPrice = selectedDebitItem ? selectedDebitItem.unitPrice : Math.round((taxable / qty) * 100) / 100;

    // Build complete payload matching CreditDebitNoteDtos.DebitNoteDto with lines and itemId
    const payload = {
      supplierName: supplier,
      originalBillNo: bill,
      reasonCode: reason,
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: 0,
      totalAmount: total,
      stockReturned: !!adjustStock,
      status: 'ACTIVE',
      lines: [
        {
          itemId: chosenItemId,
          itemCode: chosenItemCode,
          itemDescription: chosenItemDesc,
          quantity: qty,
          unitPrice: unitPrice,
          gstRate: gstRate,
          taxableValue: taxable,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: 0,
          totalLineAmount: total
        }
      ]
    };

    const btn = document.getElementById('btn-submit-create-dn');
    if (btn) { btn.disabled = true; btn.innerText = 'Creating Debit Note...'; }

    try {
      const created = await window.OperationsService.createDebitNote(payload, 'Admin');
      const no = created?.debitNoteNo || 'Debit Note';
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Debit Note ${no} created and posted to general ledger successfully!`);
      closeModal('modal-create-debit-note');
      loadDebitNotes();
    } catch (err) {
      console.error('Failed to create debit note:', err);
      alert('Failed to create debit note: ' + (err.message || 'Server error'));
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = 'Create Debit Note'; }
    }
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
  }

  return {
    loadCreditNotes,
    filterCreditNotes,
    loadDebitNotes,
    filterDebitNotes,
    showNoteDetails,
    closeDrawer,
    cancelNote,
    downloadPdf,
    openCreateCreditModal,
    onInvoiceSelected,
    onCreditItemSelected,
    onCreditQuantityChanged,
    recalcCreditTax,
    submitCreateCreditNote,
    openCreateDebitModal,
    onBillSelected,
    onDebitItemSelected,
    onDebitQuantityChanged,
    recalcDebitTax,
    submitCreateDebitNote,
    closeModal,
    toggleActionMenu,
    closeInspectionModal,
    switchInspectionTab,
    copyNoteNo,
    editCurrentInspectionNote,
    printCurrentInspectionPdf,
    printCurrentInspectionBarcode,
    getCurrentInspectionNote: () => currentInspectionNote
  };
})();
