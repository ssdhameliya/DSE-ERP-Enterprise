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
            <div style="display:flex; gap:6px; justify-content:center;">
              <button class="btn btn-secondary btn-sm" onclick="window.CreditDebitNoteController.downloadPdf('${r.creditNoteNo}', true)" title="Print Credit Note PDF">
                PDF
              </button>
              ${isActive ? `
                <button class="btn btn-danger btn-sm" onclick="window.CreditDebitNoteController.cancelNote(${r.id}, '${r.creditNoteNo}', true)" title="Cancel Credit Note (Reverses GL)">
                  Cancel
                </button>
              ` : `
                <span style="font-size:0.72rem; color:var(--text-dim); padding:4px 6px;">Cancelled</span>
              `}
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
            <div style="display:flex; gap:6px; justify-content:center;">
              <button class="btn btn-secondary btn-sm" onclick="window.CreditDebitNoteController.downloadPdf('${r.debitNoteNo}', false)" title="Print Debit Note PDF">
                PDF
              </button>
              ${isActive ? `
                <button class="btn btn-danger btn-sm" onclick="window.CreditDebitNoteController.cancelNote(${r.id}, '${r.debitNoteNo}', false)" title="Cancel Debit Note (Reverses GL)">
                  Cancel
                </button>
              ` : `
                <span style="font-size:0.72rem; color:var(--text-dim); padding:4px 6px;">Cancelled</span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
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
    window.open(url, '_blank');
  }

  // 5. CREATE NOTE MODALS
  function openCreateCreditModal() {
    const modal = document.getElementById('modal-create-credit-note');
    if (!modal) return;
    document.getElementById('m-cn-party').value = '';
    document.getElementById('m-cn-invoice').value = '';
    document.getElementById('m-cn-taxable').value = '';
    document.getElementById('m-cn-gst-rate').value = '18';
    document.getElementById('m-cn-adjust-stock').checked = true;
    recalcCreditTax();
    modal.style.display = 'flex';
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
          itemCode: 'CREDIT-ADJ',
          itemDescription: `${reason} adjustment for ${party}`,
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

  function openCreateDebitModal() {
    const modal = document.getElementById('modal-create-debit-note');
    if (!modal) return;
    document.getElementById('m-dn-supplier').value = '';
    document.getElementById('m-dn-bill').value = '';
    document.getElementById('m-dn-taxable').value = '';
    document.getElementById('m-dn-gst-rate').value = '18';
    document.getElementById('m-dn-adjust-stock').checked = true;
    recalcDebitTax();
    modal.style.display = 'flex';
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
          itemCode: 'DEBIT-ADJ',
          itemDescription: `${reason} adjustment to ${supplier}`,
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
    recalcCreditTax,
    submitCreateCreditNote,
    openCreateDebitModal,
    recalcDebitTax,
    submitCreateDebitNote,
    closeModal
  };
})();
