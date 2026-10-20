/**
 * Jasvi Industries ERP - CreditDebitNoteController
 * 100% Desktop Parity with CreditNoteRegisterController.java & DebitNoteRegisterController.java
 * Manages Sales Credit Notes, Purchase Debit Notes, Tax Reversal, GL Posting, and Inventory Restocking
 */
window.CreditDebitNoteController = (function() {
  let creditNotes = [];
  let debitNotes = [];
  let selectedNote = null;
  let isCreditNote = true;
  let cachedCustomerInvoices = [];
  let cachedSupplierBills = [];
  let cachedAllItems = [];
  let selectedCreditItem = null;
  let selectedDebitItem = null;

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
      updateCreditKpis(creditNotes);
      filterCreditNotes();
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

  function filterCreditNotes() {
    const q = document.getElementById('cn-filter-search')?.value?.toLowerCase().trim() || '';
    const reason = document.getElementById('cn-filter-reason')?.value || 'All Reasons';

    const matched = (creditNotes || []).filter(r => {
      const matchSearch = !q ||
        (r.creditNoteNo && r.creditNoteNo.toLowerCase().includes(q)) ||
        (r.partyName && r.partyName.toLowerCase().includes(q)) ||
        (r.originalInvoiceNo && r.originalInvoiceNo.toLowerCase().includes(q));

      const matchReason = reason === 'All Reasons' ||
        (r.reasonCode && r.reasonCode.equalsIgnoreCase && r.reasonCode.equalsIgnoreCase(reason)) ||
        (r.reasonCode && r.reasonCode === reason);

      return matchSearch && matchReason;
    });

    renderCreditTable(matched);
  }

  function renderCreditTable(rows) {
    const tbody = document.getElementById('tbl-credit-notes-body');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
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

    tbody.innerHTML = rows.map(r => {
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
      updateDebitKpis(debitNotes);
      filterDebitNotes();
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

  function filterDebitNotes() {
    const q = document.getElementById('dn-filter-search')?.value?.toLowerCase().trim() || '';
    const reason = document.getElementById('dn-filter-reason')?.value || 'All Reasons';

    const matched = (debitNotes || []).filter(r => {
      const matchSearch = !q ||
        (r.debitNoteNo && r.debitNoteNo.toLowerCase().includes(q)) ||
        (r.supplierName && r.supplierName.toLowerCase().includes(q)) ||
        (r.originalBillNo && r.originalBillNo.toLowerCase().includes(q));

      const matchReason = reason === 'All Reasons' ||
        (r.reasonCode && r.reasonCode === reason);

      return matchSearch && matchReason;
    });

    renderDebitTable(matched);
  }

  function renderDebitTable(rows) {
    const tbody = document.getElementById('tbl-debit-notes-body');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
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

    tbody.innerHTML = rows.map(r => {
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
  async function showNoteDetails(id, isCredit = true) {
    const prefix = isCredit ? 'cn-detail-' : 'dn-detail-';
    const drawer = document.getElementById(isCredit ? 'cn-detail-drawer' : 'dn-detail-drawer');
    if (!drawer) return;

    // Toggle close if clicking already active note
    if ((drawer.classList.contains('open') || drawer.style.display === 'flex') && selectedNote && selectedNote.id === id) {
      closeDrawer(isCredit);
      return;
    }

    // Highlight row
    const tableId = isCredit ? 'tbl-credit-notes-body' : 'tbl-debit-notes-body';
    document.querySelectorAll(`#${tableId} tr.active-selected-row`).forEach(r => r.classList.remove('active-selected-row'));
    const rows = document.querySelectorAll(`#${tableId} tr`);
    rows.forEach(r => {
      const onclickAttr = r.getAttribute('onclick') || '';
      if (onclickAttr.includes(`showNoteDetails(${id},`)) {
        r.classList.add('active-selected-row');
      }
    });

    try {
      const note = isCredit ? await window.OperationsService.getCreditNote(id) : await window.OperationsService.getDebitNote(id);
      selectedNote = note;

      document.getElementById(prefix + 'no').innerText = isCredit ? note.creditNoteNo : note.debitNoteNo;
      document.getElementById(prefix + 'date').innerText = formatDate(note.noteDate);
      document.getElementById(prefix + 'party').innerText = isCredit ? note.partyName : note.supplierName;
      document.getElementById(prefix + 'ref').innerText = isCredit ? (note.originalInvoiceNo || '-') : (note.originalBillNo || '-');
      document.getElementById(prefix + 'reason').innerText = note.reasonCode || '-';
      document.getElementById(prefix + 'taxable').innerText = formatMoney(note.taxableAmount);
      document.getElementById(prefix + 'cgst').innerText = formatMoney(note.cgstAmount);
      document.getElementById(prefix + 'sgst').innerText = formatMoney(note.sgstAmount);
      document.getElementById(prefix + 'igst').innerText = formatMoney(note.igstAmount);
      document.getElementById(prefix + 'total').innerText = formatMoney(note.totalAmount);
      document.getElementById(prefix + 'stock').innerText = note.stockReturned ? (isCredit ? 'Yes (Inventory added back)' : 'Yes (Inventory deducted)') : 'No (Price diff only)';
      document.getElementById(prefix + 'status').innerHTML = getStatusBadge(note.status);

      drawer.classList.add('open');
      drawer.style.display = 'flex';
    } catch (e) {
      console.error('Failed to load note details:', e);
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to load note details: ' + e.message);
    }
  }

  function closeDrawer(isCredit = true) {
    const drawer = document.getElementById(isCredit ? 'cn-detail-drawer' : 'dn-detail-drawer');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.style.display = 'none';
    }
    const tableId = isCredit ? 'tbl-credit-notes-body' : 'tbl-debit-notes-body';
    document.querySelectorAll(`#${tableId} tr.active-selected-row`).forEach(r => r.classList.remove('active-selected-row'));
    selectedNote = null;
  }

  // Install escape listeners
  if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.RegisterUiSupport) {
        window.RegisterUiSupport.installEscapeClose('cn-detail-drawer', '#tbl-credit-notes-body', () => closeDrawer(true));
        window.RegisterUiSupport.installEscapeClose('dn-detail-drawer', '#tbl-debit-notes-body', () => closeDrawer(false));
      }
    });
  }

  // 4. CANCEL NOTE ACTION
  async function cancelNote(id, noteNo, isCredit = true) {
    const noteType = isCredit ? 'Credit Note' : 'Debit Note';
    if (!confirm(`Cancel ${noteType} ${noteNo}?\n\nThis will reverse General Ledger postings and adjust inventory back.`)) {
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
    if (inpTax) inpTax.value = '';
    if (chkStock) chkStock.checked = true;
    selectedCreditItem = null;
    cachedCustomerInvoices = [];

    // Preload Items for fallback stock adjustment
    try {
      if (cachedAllItems.length === 0 && window.MasterService && window.MasterService.getItems) {
        cachedAllItems = await window.MasterService.getItems().catch(() => []);
      }
      if (selItem && cachedAllItems.length > 0) {
        selItem.innerHTML = '<option value="">-- Auto from invoice or select product --</option>' +
          cachedAllItems.map(it => `<option value="${it.id}" data-code="${it.code || it.itemCode || ''}" data-desc="${it.name || it.description || ''}">${it.code || it.itemCode} - ${it.name || it.description || ''}</option>`).join('');
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
            if (matched && window.OperationsService && window.OperationsService.getSalesPage) {
              try {
                const sRes = await window.OperationsService.getSalesPage(0, 50, '', '', matched.id);
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

  function onInvoiceSelected(invNo) {
    const selInv = cachedCustomerInvoices.find(s => (s.invoiceNo || s.number) === invNo);
    const inpTax = document.getElementById('m-cn-taxable');
    const selItem = document.getElementById('m-cn-item');
    if (selInv) {
      if (inpTax && !inpTax.value) {
        inpTax.value = selInv.taxableAmount || selInv.subtotal || selInv.totalAmount || '';
        recalcCreditTax();
      }
      if (selItem && selInv.lines && selInv.lines.length > 0) {
        selItem.innerHTML = '<option value="">-- Auto from invoice or select product --</option>' +
          selInv.lines.map(l => `<option value="${l.itemId || l.id || ''}" data-code="${l.itemCode || ''}" data-desc="${l.itemDescription || ''}">${l.itemCode} - ${l.itemDescription || ''} (Qty: ${l.quantity})</option>`).join('');
        if (selInv.lines.length === 1) {
          selItem.selectedIndex = 1;
          selectedCreditItem = selInv.lines[0];
        }
      }
    }
  }

  function onCreditItemSelected(itemId) {
    if (!itemId) {
      selectedCreditItem = null;
      return;
    }
    const selItemEl = document.getElementById('m-cn-item');
    if (selItemEl) {
      const opt = selItemEl.options[selItemEl.selectedIndex];
      selectedCreditItem = {
        itemId: parseInt(itemId, 10),
        itemCode: opt.getAttribute('data-code') || '',
        itemDescription: opt.getAttribute('data-desc') || ''
      };
    }
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

    if (!party) { alert('Customer name is required.'); return; }
    if (taxable <= 0) { alert('Taxable amount must be greater than zero.'); return; }

    const taxTotal = Math.round((taxable * gstRate / 100) * 100) / 100;
    const cgst = Math.round((taxTotal / 2) * 100) / 100;
    const sgst = Math.round((taxTotal - cgst) * 100) / 100;
    const total = taxable + taxTotal;

    const selItemEl = document.getElementById('m-cn-item');
    let chosenItemId = null;
    let chosenItemCode = 'CREDIT-ADJ';
    let chosenItemDesc = `${reason} adjustment for ${party}`;

    if (selItemEl && selItemEl.value) {
      chosenItemId = parseInt(selItemEl.value, 10) || null;
      const opt = selItemEl.options[selItemEl.selectedIndex];
      if (opt) {
        chosenItemCode = opt.getAttribute('data-code') || chosenItemCode;
        chosenItemDesc = opt.getAttribute('data-desc') || chosenItemDesc;
      }
    } else if (selectedCreditItem) {
      chosenItemId = selectedCreditItem.itemId || selectedCreditItem.id || null;
      chosenItemCode = selectedCreditItem.itemCode || chosenItemCode;
      chosenItemDesc = selectedCreditItem.itemDescription || chosenItemDesc;
    } else if (adjustStock && cachedAllItems.length > 0) {
      chosenItemId = cachedAllItems[0].id;
      chosenItemCode = cachedAllItems[0].code || cachedAllItems[0].itemCode || 'ITEM';
    } else if (adjustStock) {
      chosenItemId = 1;
    }

    // Build complete payload matching CreditDebitNoteDtos.CreditNoteDto with lines
    const payload = {
      partyName: party,
      originalInvoiceNo: invoice,
      reasonCode: reason,
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: 0,
      totalAmount: total,
      stockReturned: adjustStock,
      status: 'ACTIVE',
      lines: [
        {
          itemId: chosenItemId,
          itemCode: chosenItemCode,
          itemDescription: chosenItemDesc,
          quantity: 1,
          unitPrice: taxable,
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
    if (inpTax) inpTax.value = '';
    if (chkStock) chkStock.checked = true;
    selectedDebitItem = null;
    cachedSupplierBills = [];

    // Preload Items for fallback stock adjustment
    try {
      if (cachedAllItems.length === 0 && window.MasterService && window.MasterService.getItems) {
        cachedAllItems = await window.MasterService.getItems().catch(() => []);
      }
      if (selItem && cachedAllItems.length > 0) {
        selItem.innerHTML = '<option value="">-- Auto from bill or select product --</option>' +
          cachedAllItems.map(it => `<option value="${it.id}" data-code="${it.code || it.itemCode || ''}" data-desc="${it.name || it.description || ''}">${it.code || it.itemCode} - ${it.name || it.description || ''}</option>`).join('');
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
            if (matched && window.OperationsService && window.OperationsService.getPurchasesPage) {
              try {
                const pRes = await window.OperationsService.getPurchasesPage(0, 50, '', matched.id);
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

  function onBillSelected(billNo) {
    const selBill = cachedSupplierBills.find(p => (p.invoiceNo || p.billNo || p.number) === billNo);
    const inpTax = document.getElementById('m-dn-taxable');
    const selItem = document.getElementById('m-dn-item');
    if (selBill) {
      if (inpTax && !inpTax.value) {
        inpTax.value = selBill.taxableAmount || selBill.subtotal || selBill.totalAmount || '';
        recalcDebitTax();
      }
      if (selItem && selBill.lines && selBill.lines.length > 0) {
        selItem.innerHTML = '<option value="">-- Auto from bill or select product --</option>' +
          selBill.lines.map(l => `<option value="${l.itemId || l.id || ''}" data-code="${l.itemCode || ''}" data-desc="${l.itemDescription || ''}">${l.itemCode} - ${l.itemDescription || ''} (Qty: ${l.quantity})</option>`).join('');
        if (selBill.lines.length === 1) {
          selItem.selectedIndex = 1;
          selectedDebitItem = selBill.lines[0];
        }
      }
    }
  }

  function onDebitItemSelected(itemId) {
    if (!itemId) {
      selectedDebitItem = null;
      return;
    }
    const selItemEl = document.getElementById('m-dn-item');
    if (selItemEl) {
      const opt = selItemEl.options[selItemEl.selectedIndex];
      selectedDebitItem = {
        itemId: parseInt(itemId, 10),
        itemCode: opt.getAttribute('data-code') || '',
        itemDescription: opt.getAttribute('data-desc') || ''
      };
    }
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

    if (!supplier) { alert('Supplier name is required.'); return; }
    if (taxable <= 0) { alert('Taxable amount must be greater than zero.'); return; }

    const taxTotal = Math.round((taxable * gstRate / 100) * 100) / 100;
    const cgst = Math.round((taxTotal / 2) * 100) / 100;
    const sgst = Math.round((taxTotal - cgst) * 100) / 100;
    const total = taxable + taxTotal;

    const selItemEl = document.getElementById('m-dn-item');
    let chosenItemId = null;
    let chosenItemCode = 'DEBIT-ADJ';
    let chosenItemDesc = `${reason} adjustment to ${supplier}`;

    if (selItemEl && selItemEl.value) {
      chosenItemId = parseInt(selItemEl.value, 10) || null;
      const opt = selItemEl.options[selItemEl.selectedIndex];
      if (opt) {
        chosenItemCode = opt.getAttribute('data-code') || chosenItemCode;
        chosenItemDesc = opt.getAttribute('data-desc') || chosenItemDesc;
      }
    } else if (selectedDebitItem) {
      chosenItemId = selectedDebitItem.itemId || selectedDebitItem.id || null;
      chosenItemCode = selectedDebitItem.itemCode || chosenItemCode;
      chosenItemDesc = selectedDebitItem.itemDescription || chosenItemDesc;
    } else if (adjustStock && cachedAllItems.length > 0) {
      chosenItemId = cachedAllItems[0].id;
      chosenItemCode = cachedAllItems[0].code || cachedAllItems[0].itemCode || 'ITEM';
    } else if (adjustStock) {
      chosenItemId = 1;
    }

    // Build complete payload matching CreditDebitNoteDtos.DebitNoteDto with lines
    const payload = {
      supplierName: supplier,
      originalBillNo: bill,
      reasonCode: reason,
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: 0,
      totalAmount: total,
      stockReturned: adjustStock,
      status: 'ACTIVE',
      lines: [
        {
          itemId: chosenItemId,
          itemCode: chosenItemCode,
          itemDescription: chosenItemDesc,
          quantity: 1,
          unitPrice: taxable,
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
    recalcCreditTax,
    submitCreateCreditNote,
    openCreateDebitModal,
    onBillSelected,
    onDebitItemSelected,
    recalcDebitTax,
    submitCreateDebitNote,
    closeModal,
    toggleActionMenu
  };
})();
