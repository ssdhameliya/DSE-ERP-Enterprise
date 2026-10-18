/**
 * Jasvi Industries ERP - BankStatementController
 * Desktop Parity Implementation for BankStatementController.java & BankStatement.fxml
 * Bank Statement Import, Rule-Based Matching, ERP Linkage, and Bulk Conversions
 */
window.BankStatementController = (function() {
  let batches = [];
  let currentBatchId = null;
  let currentBatch = null;
  let currentTransactions = [];
  let selectedTxnIds = new Set();
  let currentPage = 0;
  let pageSize = 50;
  let totalRows = 0;
  let totalPages = 0;

  let activeMatchingTxn = null;
  let activeCandidates = [];

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
  // 1. INITIALIZATION & WORKSPACE LIFECYCLE
  // ==========================================

  async function loadStatementWorkspace(batchId = null) {
    selectedTxnIds.clear();
    updateBulkToolbar();

    try {
      batches = await window.ReconService.getBatches() || [];
      populateBatchDropdown(batches, batchId);

      if (batchId) {
        currentBatchId = batchId;
      } else if (batches.length > 0) {
        currentBatchId = batches[0].id;
      } else {
        currentBatchId = null;
      }

      if (currentBatchId) {
        await loadBatch(currentBatchId);
      } else {
        renderEmptyState('No bank statement imported yet. Click "Import Statement" to upload a CSV statement.');
      }
    } catch (err) {
      console.error('Failed to load bank statement workspace:', err);
      renderEmptyState('Failed to load statements: ' + (err.message || 'Server error'));
    }
  }

  function populateBatchDropdown(list, selectedId = null) {
    const sel = document.getElementById('cmbBatch');
    if (!sel) return;

    if (!list || list.length === 0) {
      sel.innerHTML = `<option value="">No statements available</option>`;
      return;
    }

    sel.innerHTML = list.map(b => {
      const isSel = (selectedId && b.id === selectedId) || (!selectedId && b === list[0]);
      const label = `${b.bankName || 'Bank'} (${b.bankAccount || 'Acc'}) • ${b.statementFrom || ''} to ${b.statementTo || ''} [${b.transactionCount || 0} rows]`;
      return `<option value="${b.id}" ${isSel ? 'selected' : ''}>${label}</option>`;
    }).join('');
  }

  async function onBatchSelected(id) {
    currentBatchId = parseInt(id) || null;
    currentPage = 0;
    if (currentBatchId) {
      await loadBatch(currentBatchId);
    }
  }

  async function loadBatch(id) {
    currentBatchId = id;
    selectedTxnIds.clear();
    updateBulkToolbar();

    const tbody = document.getElementById('bank-statement-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading transactions...</td></tr>`;
    }

    try {
      // 1. Fetch Metrics & Update KPI Cards
      const metrics = await window.ReconService.getBatchMetrics(id);
      updateKpis(metrics);

      // 2. Fetch Page of Transactions
      const q = document.getElementById('txtSearch')?.value?.trim() || '';
      const status = document.getElementById('cmbStatus')?.value || '';
      const direction = document.getElementById('cmbDirection')?.value || 'ALL';
      const from = document.getElementById('bs-from-date')?.value || '';
      const to = document.getElementById('bs-to-date')?.value || '';

      const pageRes = await window.ReconService.getTransactionPage(id, currentPage, pageSize, status, direction, from, to, q);
      currentTransactions = pageRes?.rows || [];
      totalRows = pageRes?.totalRows || currentTransactions.length;
      totalPages = pageRes?.totalPages || (Math.ceil(totalRows / pageSize) || 1);

      renderTable(currentTransactions);
      updatePaginationControls();

    } catch (err) {
      console.error('Failed to load batch:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px; color:var(--red);">⚠️ Error loading transactions: ${err.message || 'Server error'}</td></tr>`;
      }
    }
  }

  function updateKpis(m) {
    if (!m) return;
    const totalEl = document.getElementById('kpiTotal');
    const unmatchedEl = document.getElementById('kpiUnmatched');
    const suggestedEl = document.getElementById('kpiSuggested');
    const matchedEl = document.getElementById('kpiMatched');
    const expenseEl = document.getElementById('kpiExpense');
    const creditsEl = document.getElementById('kpiCredits');
    const debitsEl = document.getElementById('kpiDebits');
    const reconciledEl = document.getElementById('kpiReconciled');
    const progressEl = document.getElementById('reconciliationProgress');
    const progressTextEl = document.getElementById('lblProgressText');
    const batchStatusBadge = document.getElementById('lblBatchStatus');

    if (totalEl) totalEl.innerText = (m.total || 0).toLocaleString();
    if (unmatchedEl) unmatchedEl.innerText = (m.unmatched || 0).toLocaleString();
    if (suggestedEl) suggestedEl.innerText = (m.suggested || 0).toLocaleString();
    if (matchedEl) matchedEl.innerText = (m.matched || 0).toLocaleString();
    if (expenseEl) expenseEl.innerText = (m.expenses || 0).toLocaleString();
    if (creditsEl) creditsEl.innerText = formatMoney(m.totalCredits || 0);
    if (debitsEl) debitsEl.innerText = formatMoney(m.totalDebits || 0);

    const recPercent = (m.reconciledPercent || 0).toFixed(1);
    if (reconciledEl) reconciledEl.innerText = recPercent + '%';
    if (progressEl) progressEl.style.width = Math.min(100, Math.max(0, parseFloat(recPercent))) + '%';
    if (progressTextEl) progressTextEl.innerText = `${m.reconciled || 0} / ${m.total || 0} reconciled`;

    if (batchStatusBadge) {
      const statusText = m.batchStatus || (parseFloat(recPercent) >= 100 ? 'FULLY RECONCILED' : 'PARTIALLY RECONCILED');
      batchStatusBadge.innerText = statusText;
      batchStatusBadge.className = 'pill-badge ' + (parseFloat(recPercent) >= 100 ? 'pill-success' : 'pill-warning');
    }
  }

  function renderTable(rows) {
    const tbody = document.getElementById('bank-statement-tbody');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      renderEmptyState('No transactions match the selected filters.');
      return;
    }

    tbody.innerHTML = rows.map(t => {
      const isSelected = selectedTxnIds.has(t.id);
      const debit = parseFloat(t.debit) || 0;
      const credit = parseFloat(t.credit) || 0;
      const balance = parseFloat(t.balance) || 0;
      const status = (t.status || 'UNMATCHED').toUpperCase();

      let badgeClass = 'pill-neutral';
      if (status === 'MATCHED') badgeClass = 'pill-success';
      else if (status === 'SUGGESTED') badgeClass = 'pill-warning';
      else if (status === 'EXPENSE') badgeClass = 'pill-purple';
      else if (status === 'REVIEW') badgeClass = 'pill-warning';
      else if (status === 'IGNORED') badgeClass = 'pill-neutral';
      else badgeClass = 'pill-danger';

      return `
        <tr data-stmt-id="${t.id}" onclick="window.BankStatementController.onTxnRowClick(${t.id}, event)" style="cursor:pointer; ${isSelected ? 'background:rgba(56,189,248,0.06);' : ''}">
          <td style="text-align:center;" onclick="event.stopPropagation();">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="window.BankStatementController.toggleSelectTxn(${t.id}, this.checked)">
          </td>
          <td style="white-space:nowrap; font-weight:600;">${formatDate(t.transactionDate)}</td>
          <td style="white-space:nowrap; color:var(--text-muted); font-size:0.75rem;">${formatDate(t.valueDate || t.transactionDate)}</td>
          <td style="font-family:monospace; font-weight:600; color:var(--cyan); max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${t.reference || ''}">
            ${t.reference || '-'}
          </td>
          <td style="max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${t.description || ''}">
            ${t.description || '-'}
          </td>
          <td style="text-align:right; font-weight:700; color:${debit > 0 ? 'var(--red)' : 'var(--text-dim)'};">
            ${debit > 0 ? formatMoney(debit) : '-'}
          </td>
          <td style="text-align:right; font-weight:700; color:${credit > 0 ? 'var(--green)' : 'var(--text-dim)'};">
            ${credit > 0 ? formatMoney(credit) : '-'}
          </td>
          <td style="text-align:right; font-weight:600; color:var(--text-main);">
            ${formatMoney(balance)}
          </td>
          <td style="text-align:center;">
            <span class="pill-badge ${badgeClass}">${status}</span>
          </td>
          <td style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.75rem; color:var(--purple);" title="${t.matchLink || t.linkedDocumentNo || ''}">
            ${t.linkedDocumentNo || t.matchLink || (t.suggestedConfidence ? `💡 ${t.suggestedConfidence.toFixed(0)}% match` : '-')}
          </td>
          <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.BankStatementController.toggleActionMenu(${t.id}, event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" title="Reconciliation Actions">
                ::: Actions
              </button>
              <div id="bs-action-menu-${t.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:#0b1324; border:1px solid rgba(255,255,255,0.14); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.7); min-width:210px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.BankStatementController.showTxnDetails(${t.id})"><span style="margin-right:8px;">👁️</span> View Details</div>
                ${status === 'MATCHED' || status === 'EXPENSE' ? `
                  <div class="action-menu-item" onclick="window.BankStatementController.reverseMatch(${t.id})"><span style="margin-right:8px;">↩</span> Reverse Reconciliation</div>
                ` : `
                  <div class="action-menu-item" onclick="window.BankStatementController.openMatchModal(${t.id})"><span style="margin-right:8px;">🔗</span> Match with Invoice / Voucher</div>
                  ${debit > 0 ? `<div class="action-menu-item" onclick="window.BankStatementController.quickMoveExpense(${t.id}, ${debit})"><span style="margin-right:8px;">💸</span> Move to Operating Expense</div>` : ''}
                  <div class="action-menu-item" onclick="window.BankStatementController.quickMoveBankEntry(${t.id}, ${debit > 0 ? debit : credit}, '${debit > 0 ? 'DEBIT' : 'CREDIT'}')"><span style="margin-right:8px;">🏦</span> Move to Bank Entry</div>
                `}
                <div class="action-menu-item" onclick="window.AppDialogService && window.AppDialogService.showActivityTimeline ? window.AppDialogService.showActivityTimeline('BANK_RECON', ${t.id}, '${(t.reference || t.description || '').replace(/'/g, "\\'")}') : null"><span style="margin-right:8px;">📜</span> Audit Trail</div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function toggleActionMenu(id, event) {
    if (event) event.stopPropagation();
    const menuId = 'bs-action-menu-' + id;
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
        const menuWidth = 220;
        let left = rect.right - menuWidth;
        if (left < 10) left = 10;

        const menuHeight = targetMenu.offsetHeight || 180;
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

  function renderEmptyState(msg) {
    const tbody = document.getElementById('bank-statement-tbody');
    if (!tbody) return;
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center; padding:40px; color:var(--text-muted);">
          <div style="font-size:2rem; margin-bottom:8px;">🏦</div>
          <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">${msg}</div>
          <div style="font-size:0.78rem; margin-top:4px;">Import a bank CSV statement or select an existing statement batch above.</div>
        </td>
      </tr>
    `;
  }

  function updatePaginationControls() {
    const lblShowing = document.getElementById('lblShowing');
    const lblPage = document.getElementById('lblPage');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');

    const start = totalRows === 0 ? 0 : currentPage * pageSize + 1;
    const end = Math.min(totalRows, (currentPage + 1) * pageSize);

    if (lblShowing) lblShowing.innerText = `Showing ${start}–${end} of ${totalRows} records`;
    if (lblPage) lblPage.innerText = `Page ${currentPage + 1} of ${totalPages || 1}`;
    if (btnPrev) btnPrev.disabled = currentPage <= 0;
    if (btnNext) btnNext.disabled = currentPage + 1 >= totalPages;
  }

  function prevPage() {
    if (currentPage > 0) {
      currentPage--;
      loadBatch(currentBatchId);
    }
  }

  function nextPage() {
    if (currentPage + 1 < totalPages) {
      currentPage++;
      loadBatch(currentBatchId);
    }
  }

  // ==========================================
  // 2. SELECTION & BULK ACTIONS
  // ==========================================

  function toggleSelectTxn(id, checked) {
    if (checked) selectedTxnIds.add(id); else selectedTxnIds.delete(id);
    updateBulkToolbar();
  }

  function selectAllVisible(checked) {
    if (checked) {
      currentTransactions.forEach(t => selectedTxnIds.add(t.id));
    } else {
      selectedTxnIds.clear();
    }
    renderTable(currentTransactions);
    updateBulkToolbar();
  }

  function updateBulkToolbar() {
    const lblSelected = document.getElementById('lblSelected');
    const btnReview = document.getElementById('btnBulkReview');
    const btnIgnore = document.getElementById('btnBulkIgnore');
    const btnExpense = document.getElementById('btnMoveExpense');
    const btnBank = document.getElementById('btnMoveBankEntry');
    const chkAll = document.getElementById('chkSelectAll');

    const count = selectedTxnIds.size;
    if (lblSelected) lblSelected.innerText = `${count} selected`;

    const hasSel = count > 0;
    if (btnReview) btnReview.disabled = !hasSel;
    if (btnIgnore) btnIgnore.disabled = !hasSel;
    if (btnExpense) btnExpense.disabled = !hasSel;
    if (btnBank) btnBank.disabled = !hasSel;

    if (chkAll) {
      chkAll.checked = count > 0 && count === currentTransactions.length;
    }
  }

  async function bulkMarkReview() {
    if (selectedTxnIds.size === 0) return;
    const note = prompt(`Enter review notes for ${selectedTxnIds.size} transactions:`, 'Verified against physical voucher');
    if (!note) return;

    for (const id of selectedTxnIds) {
      try {
        await window.ReconService.reviewTransaction(id, note, 'Admin');
      } catch (e) {
        console.warn('Error reviewing txn', id, e);
      }
    }
    if (window.AppDialogService) window.AppDialogService.toastSuccess(`${selectedTxnIds.size} transactions marked as reviewed.`);
    loadBatch(currentBatchId);
  }

  async function bulkIgnore() {
    if (selectedTxnIds.size === 0) return;
    const note = prompt(`Audit reason for ignoring ${selectedTxnIds.size} transactions:`, 'Bank charge exempted / non-operating item');
    if (!note) return;

    for (const id of selectedTxnIds) {
      try {
        await window.ReconService.ignoreTransaction(id, note, 'Admin');
      } catch (e) {
        console.warn('Error ignoring txn', id, e);
      }
    }
    if (window.AppDialogService) window.AppDialogService.toastSuccess(`${selectedTxnIds.size} transactions ignored.`);
    loadBatch(currentBatchId);
  }

  async function moveSelectedToExpense() {
    if (selectedTxnIds.size === 0) return;
    const category = prompt('Enter Expense Category (e.g., Bank Charges, Utility, Office Expenses):', 'Bank Charges');
    if (!category) return;

    try {
      const payload = {
        transactionIds: Array.from(selectedTxnIds),
        category: category,
        accountName: 'Primary Bank Account',
        paymentMode: 'BANK TRANSFER',
        notes: `Bulk expense created from bank statement batch ${currentBatchId}`,
        user: 'Admin'
      };
      const res = await window.ReconService.bulkExpense(payload);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(res?.message || 'Moved to Expense.');
      loadBatch(currentBatchId);
    } catch (err) {
      alert('Bulk expense failed: ' + (err.message || 'Server error'));
    }
  }

  async function moveSelectedToBankEntry() {
    if (selectedTxnIds.size === 0) return;
    try {
      const payload = {
        transactionIds: Array.from(selectedTxnIds),
        accountName: 'Primary Bank Account',
        paymentMode: 'NEFT',
        notes: `Bulk bank journal from statement batch ${currentBatchId}`,
        user: 'Admin'
      };
      const res = await window.ReconService.bulkBankEntry(payload);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(res?.message || 'Moved to Bank Entry.');
      loadBatch(currentBatchId);
    } catch (err) {
      alert('Bulk bank entry failed: ' + (err.message || 'Server error'));
    }
  }

  // ==========================================
  // 3. MATCHING WORKSPACE MODAL
  // ==========================================

  async function openMatchModal(txnId) {
    activeMatchingTxn = currentTransactions.find(t => t.id === txnId);
    if (!activeMatchingTxn) return;

    const modal = document.getElementById('modal-match-candidate');
    if (!modal) return;

    const bankAmount = activeMatchingTxn.debit > 0 ? activeMatchingTxn.debit : activeMatchingTxn.credit;
    document.getElementById('mc-txn-info').innerText = `${formatDate(activeMatchingTxn.transactionDate)} • Ref: ${activeMatchingTxn.reference || 'N/A'} • ${activeMatchingTxn.description || ''}`;
    document.getElementById('mc-txn-amount').innerText = formatMoney(bankAmount);

    const tbody = document.getElementById('mc-candidates-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-dim);"><span class="loading-spinner"></span> Searching ERP transactions (Invoices, Bills, Refunds)...</td></tr>`;
    modal.style.display = 'flex';

    try {
      const candidates = await window.ReconService.suggestMatch(txnId);
      activeCandidates = candidates || [];

      if (activeCandidates.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">
              <div>⚠️ No matching open Sale, Purchase, or Return transaction found.</div>
              <div style="font-size:0.75rem; margin-top:4px;">You can record this transaction directly as an Operating Expense or Bank Entry.</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = activeCandidates.map((c, idx) => {
        const conf = c.confidence || 0;
        let confColor = 'var(--text-muted)';
        if (conf >= 80) confColor = 'var(--green)';
        else if (conf >= 50) confColor = 'var(--yellow)';

        return `
          <tr>
            <td style="text-align:center;">
              <span style="font-weight:700; color:${confColor};">${conf.toFixed(0)}%</span>
            </td>
            <td><span class="pill-badge pill-neutral">${c.type}</span></td>
            <td style="font-weight:700; color:var(--cyan); font-family:monospace;">${c.documentNo}</td>
            <td style="font-weight:600;">${c.partyName || '-'}</td>
            <td>${formatDate(c.documentDate)}</td>
            <td style="text-align:right;">${formatMoney(c.totalAmount)}</td>
            <td style="text-align:right; font-weight:700; color:var(--yellow);">${formatMoney(c.outstanding)}</td>
            <td style="text-align:center;">
              <button class="btn btn-primary btn-sm" onclick="window.BankStatementController.confirmMatch(${txnId}, '${c.type}', ${c.id}, ${Math.min(c.outstanding, bankAmount)})" style="padding:2px 8px; font-size:0.75rem;">Link &amp; Reconcile</button>
            </td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      console.error('Match suggestion failed:', err);
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--red);">Failed to retrieve match suggestions: ${err.message || 'Server error'}</td></tr>`;
    }
  }

  async function confirmMatch(txnId, targetType, targetId, amount) {
    try {
      const payload = {
        user: 'Admin',
        allocations: [
          { targetType: targetType, targetId: targetId, amount: amount }
        ]
      };
      const res = await window.ReconService.matchTransaction(txnId, payload);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(res?.message || 'Transaction reconciled successfully!');
      closeModal('modal-match-candidate');
      loadBatch(currentBatchId);
    } catch (err) {
      alert('Failed to reconcile match: ' + (err.message || 'Server error'));
    }
  }

  async function quickMoveExpense(txnId, amount) {
    const cat = prompt(`Move debit of ${formatMoney(amount)} to Expense Category:`, 'Factory Consumables / Miscellaneous');
    if (!cat) return;

    try {
      const payload = {
        category: cat,
        accountName: 'Bank Account',
        paymentMode: 'BANK TRANSFER',
        notes: `Converted from bank statement transaction ${txnId}`,
        user: 'Admin'
      };
      await window.ReconService.expenseTransaction(txnId, payload);
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Expense entry generated.');
      loadBatch(currentBatchId);
    } catch (err) {
      alert('Failed to create expense: ' + (err.message || 'Server error'));
    }
  }

  async function quickMoveBankEntry(txnId, amount, dir) {
    const notes = prompt(`Create ${dir} Bank Journal for ${formatMoney(amount)}. Enter narration / reference:`, 'Direct banking settlement');
    if (notes === null) return;

    try {
      const payload = {
        accountName: 'Bank Account',
        paymentMode: 'NEFT',
        notes: notes || 'Direct bank entry',
        user: 'Admin'
      };
      await window.ReconService.bankEntryTransaction(txnId, payload);
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Bank entry journal created.');
      loadBatch(currentBatchId);
    } catch (err) {
      alert('Failed to create bank entry: ' + (err.message || 'Server error'));
    }
  }

  async function reverseMatch(txnId) {
    if (!confirm('Are you sure you want to reverse this reconciliation link?\n\nThis will restore the transaction to UNMATCHED status.')) return;
    try {
      await window.ReconService.reverseTransaction(txnId, 'Admin');
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Reconciliation reversed.');
      loadBatch(currentBatchId);
    } catch (err) {
      alert('Failed to reverse: ' + (err.message || 'Server error'));
    }
  }

  // ==========================================
  // 4. STATEMENT CSV IMPORT DIALOG
  // ==========================================

  async function openImportModal() {
    const modal = document.getElementById('modal-import-statement');
    if (!modal) return;
    document.getElementById('import-file-name').innerText = 'No file selected';
    document.getElementById('import-csv-file').value = '';
    document.getElementById('import-preview-count').innerText = '0 rows';

    // Load BANK_ACCOUNT lookups from Master Data (Desktop Parity)
    try {
      const bankSelect = document.getElementById('import-bank-name');
      const accInput = document.getElementById('import-bank-acc');
      if (bankSelect && window.MasterService) {
        const lookups = await window.MasterService.getLookups('BANK_ACCOUNT');
        const activeAccounts = (lookups || []).filter(l => l.active !== false && (l.lookupValue || l.value));
        if (activeAccounts.length > 0) {
          bankSelect.innerHTML = activeAccounts.map((a, idx) => {
            const accNo = (a.lookupValue || a.value || '').trim();
            const bName = (a.description || a.lookupCode || 'Bank Account').trim();
            return `<option value="${bName}" data-acc="${accNo}" ${idx === 0 ? 'selected' : ''}>${bName} (${accNo})</option>`;
          }).join('');

          if (accInput) {
            accInput.value = (activeAccounts[0].lookupValue || activeAccounts[0].value || '').trim();
          }

          bankSelect.onchange = function() {
            const selOpt = bankSelect.options[bankSelect.selectedIndex];
            if (selOpt && accInput) {
              accInput.value = selOpt.getAttribute('data-acc') || '';
            }
          };
        }
      }
    } catch (e) {
      console.warn('Could not populate BANK_ACCOUNT master lookups:', e);
    }

    modal.style.display = 'flex';
  }

  let parsedImportRows = [];

  function onCsvFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('import-file-name').innerText = file.name;
    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result;
      parseCsvText(text, file.name);
    };
    reader.readAsText(file);
  }

  function parseCsvText(content, fileName) {
    parsedImportRows = [];
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      alert('CSV file is empty or does not contain header rows.');
      return;
    }

    // Header detection matching KotakBankStatementCsvParser
    let headerIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('sl. no.') || lines[i].toLowerCase().includes('date') && lines[i].toLowerCase().includes('balance')) {
        headerIdx = i;
        break;
      }
    }

    const startLine = headerIdx >= 0 ? headerIdx + 1 : 1;
    let runningOpening = null;
    let runningClosing = null;

    for (let i = startLine; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 5) continue;

      const dateStr = cols[1] || cols[0];
      const desc = cols[3] || cols[2] || 'Bank transaction';
      const ref = cols[4] || cols[3] || 'REF-' + (i);

      let debit = 0;
      let credit = 0;
      let balance = 0;

      // Detect standard format (Amount + DR/CR) or separate Debit/Credit columns
      if (cols.length >= 8 && (cols[6] === 'DR' || cols[6] === 'CR')) {
        const amt = parseFloat(cols[5].replace(/,/g, '')) || 0;
        if (cols[6] === 'DR') debit = amt; else credit = amt;
        balance = parseFloat(cols[7].replace(/,/g, '')) || 0;
      } else {
        debit = parseFloat(cols[4]?.replace(/,/g, '')) || 0;
        credit = parseFloat(cols[5]?.replace(/,/g, '')) || 0;
        balance = parseFloat(cols[6]?.replace(/,/g, '')) || 0;
      }

      if (runningOpening === null) runningOpening = balance - credit + debit;
      runningClosing = balance;

      parsedImportRows.push({
        sourceRowNumber: i,
        transactionTimestamp: new Date().toISOString(),
        transactionDate: new Date().toISOString().slice(0, 10),
        valueDate: new Date().toISOString().slice(0, 10),
        description: desc.trim(),
        reference: ref.trim(),
        debit: debit,
        credit: credit,
        balance: balance,
        transactionFingerprint: `${ref}|${debit}|${credit}|${balance}|${i}`
      });
    }

    document.getElementById('import-preview-count').innerText = `${parsedImportRows.length} valid transactions`;
  }

  function parseCsvLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === ',' && !inQuotes) { result.push(cur); cur = ''; }
      else cur += c;
    }
    result.push(cur);
    return result;
  }

  async function submitImport() {
    if (parsedImportRows.length === 0) {
      alert('Please select and parse a valid CSV statement file first.');
      return;
    }

    const bankName = document.getElementById('import-bank-name')?.value || 'Kotak Mahindra Bank';
    const bankAccount = document.getElementById('import-bank-acc')?.value || '50200012345678';
    const fileName = document.getElementById('import-file-name')?.innerText || 'Statement.csv';

    const payload = {
      bankName: bankName,
      bankAccount: bankAccount,
      accountHolder: 'Jasvi Industries Pvt Ltd',
      statementFrom: parsedImportRows[0]?.transactionDate || new Date().toISOString().slice(0, 10),
      statementTo: parsedImportRows[parsedImportRows.length - 1]?.transactionDate || new Date().toISOString().slice(0, 10),
      currency: 'INR',
      openingBalance: parsedImportRows[0]?.balance || 0,
      closingBalance: parsedImportRows[parsedImportRows.length - 1]?.balance || 0,
      sourceFingerprint: 'FP-' + Date.now(),
      sourceFileName: fileName,
      sourceCsv: 'CSV DATA',
      importedBy: 'Admin',
      dryRun: false,
      rows: parsedImportRows
    };

    const btn = document.getElementById('btn-submit-import');
    if (btn) { btn.disabled = true; btn.innerText = 'Importing...'; }

    try {
      const res = await window.ReconService.importStatement(payload);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(res?.message || `Imported ${res?.importedRows || parsedImportRows.length} transactions!`);
      closeModal('modal-import-statement');
      loadStatementWorkspace(res?.batch?.id);
    } catch (err) {
      console.error('Import statement failed:', err);
      alert('Import failed: ' + (err.message || 'Server error'));
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = 'Import Statement'; }
    }
  }

  // ==========================================
  // 5. STATEMENT HISTORY DRAWER
  // ==========================================

  function toggleStatementHistory() {
    const drawer = document.getElementById('statement-history-drawer');
    if (!drawer) return;
    const isShown = drawer.style.display === 'block';
    if (isShown) {
      drawer.style.display = 'none';
    } else {
      drawer.style.display = 'block';
      loadHistoryTable();
    }
  }

  async function loadHistoryTable() {
    const tbody = document.getElementById('history-table-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading history...</td></tr>`;

    try {
      const data = await window.ReconService.getBatchPage(0, 50);
      const rows = data?.rows || batches || [];
      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">No statement history found.</td></tr>`;
        return;
      }

      tbody.innerHTML = rows.map(b => `
        <tr>
          <td>${formatDate(b.importedAt)}</td>
          <td style="font-weight:600;">${b.bankName} (${b.bankAccount})</td>
          <td>${formatDate(b.statementFrom)} to ${formatDate(b.statementTo)}</td>
          <td><span class="pill-badge ${b.reconciliationPercent >= 100 ? 'pill-success' : 'pill-warning'}">${b.status || 'IMPORTED'}</span></td>
          <td style="text-align:right; font-weight:600;">${b.transactionCount || 0}</td>
          <td style="text-align:center;">
            <button class="btn btn-secondary btn-sm" onclick="window.BankStatementController.openHistoryBatch(${b.id})" style="padding:2px 8px; font-size:0.75rem;">Open</button>
            <button class="btn btn-danger btn-sm" onclick="window.BankStatementController.deleteStatement(${b.id})" style="padding:2px 8px; font-size:0.75rem;">🗑️</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--red);">Failed to load history: ${e.message}</td></tr>`;
    }
  }

  function openHistoryBatch(id) {
    toggleStatementHistory();
    loadBatch(id);
  }

  async function deleteStatement(id = null) {
    const targetId = id || currentBatchId;
    if (!targetId) return;
    if (!confirm('Are you sure you want to delete this bank statement batch?\n\nWARNING: All unmatched transactions and link mappings will be removed.')) return;

    try {
      await window.ReconService.deleteBatch(targetId, 'DELETE', 'Admin');
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Statement batch deleted.');
      loadStatementWorkspace();
    } catch (err) {
      alert('Delete statement failed: ' + (err.message || 'Server error'));
    }
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
  }

  // --- STATEMENT TRANSACTION DETAIL DRAWER ---
  let activeSelectedTxnId = null;

  function onTxnRowClick(id, event) {
    if (event && window.RegisterUiSupport && window.RegisterUiSupport.isInteractiveTarget(event.target)) return;
    const drawer = document.getElementById('statement-detail-drawer');
    const isDrawerOpen = drawer && (drawer.classList.contains('open') || drawer.style.display === 'flex');
    if (isDrawerOpen && activeSelectedTxnId === id) {
      closeStatementDrawer();
      return;
    }
    showTxnDetails(id);
  }

  function showTxnDetails(id) {
    const t = currentTransactions.find(x => x.id === id);
    if (!t) return;
    activeSelectedTxnId = id;

    const rowEl = document.querySelector(`#bank-statement-tbody tr[data-stmt-id="${id}"]`);
    if (window.RegisterUiSupport && rowEl) {
      window.RegisterUiSupport.highlightRow('#bank-statement-tbody', rowEl);
    }

    const debit = parseFloat(t.debit) || 0;
    const credit = parseFloat(t.credit) || 0;
    const balance = parseFloat(t.balance) || 0;
    const status = t.status || 'UNMATCHED';

    const elRef = document.getElementById('bsd-ref');
    if (elRef) elRef.innerText = t.reference ? `Ref: ${t.reference}` : `Txn #${t.id}`;
    const elStatus = document.getElementById('bsd-status');
    if (elStatus) {
      elStatus.innerText = status;
      let badgeClass = 'pill-neutral';
      if (status === 'MATCHED') badgeClass = 'pill-success';
      else if (status === 'SUGGESTED') badgeClass = 'pill-warning';
      else if (status === 'EXPENSE') badgeClass = 'pill-purple';
      else if (status === 'REVIEW') badgeClass = 'pill-warning';
      else if (status === 'IGNORED') badgeClass = 'pill-neutral';
      else badgeClass = 'pill-danger';
      elStatus.className = `pill-badge ${badgeClass}`;
    }

    const elDate = document.getElementById('bsd-date');
    if (elDate) elDate.innerText = formatDate(t.transactionDate);
    const elValDate = document.getElementById('bsd-value-date');
    if (elValDate) elValDate.innerText = formatDate(t.valueDate || t.transactionDate);
    const elDebit = document.getElementById('bsd-debit');
    if (elDebit) elDebit.innerText = debit > 0 ? formatMoney(debit) : '-';
    const elCredit = document.getElementById('bsd-credit');
    if (elCredit) elCredit.innerText = credit > 0 ? formatMoney(credit) : '-';
    const elBal = document.getElementById('bsd-balance');
    if (elBal) elBal.innerText = formatMoney(balance);
    const elLink = document.getElementById('bsd-link');
    if (elLink) elLink.innerText = t.linkedDocumentNo || t.matchLink || (t.suggestedConfidence ? `Suggested (${t.suggestedConfidence.toFixed(0)}%)` : 'Unlinked');
    const elNarr = document.getElementById('bsd-narration');
    if (elNarr) elNarr.innerText = t.description || '-';

    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.showDrawer('statement-detail-drawer');
    } else {
      const drawer = document.getElementById('statement-detail-drawer');
      if (drawer) { drawer.classList.add('open'); drawer.style.display = 'flex'; }
    }
  }

  function closeStatementDrawer() {
    activeSelectedTxnId = null;
    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.hideDrawer('statement-detail-drawer', '#bank-statement-tbody');
    } else {
      const drawer = document.getElementById('statement-detail-drawer');
      if (drawer) { drawer.classList.remove('open'); drawer.style.display = 'none'; }
      document.querySelectorAll('#bank-statement-tbody tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    }
  }

  function drawerMatch() {
    if (activeSelectedTxnId) {
      openMatchModal(activeSelectedTxnId);
    }
  }

  function drawerMoveExpense() {
    if (activeSelectedTxnId) {
      const t = currentTransactions.find(x => x.id === activeSelectedTxnId);
      const debit = parseFloat(t?.debit) || 0;
      if (debit > 0) {
        quickMoveExpense(activeSelectedTxnId, debit);
      } else {
        alert('Only debit transactions can be moved to operating expenses.');
      }
    }
  }

  function drawerMoveBankEntry() {
    if (activeSelectedTxnId) {
      const t = currentTransactions.find(x => x.id === activeSelectedTxnId);
      const debit = parseFloat(t?.debit) || 0;
      const credit = parseFloat(t?.credit) || 0;
      quickMoveBankEntry(activeSelectedTxnId, debit > 0 ? debit : credit, debit > 0 ? 'DEBIT' : 'CREDIT');
    }
  }

  return {
    loadStatementWorkspace,
    onBatchSelected,
    loadBatch,
    prevPage,
    nextPage,
    applyFilters() { currentPage = 0; loadBatch(currentBatchId); },
    resetFilters() {
      if (document.getElementById('txtSearch')) document.getElementById('txtSearch').value = '';
      if (document.getElementById('cmbStatus')) document.getElementById('cmbStatus').value = '';
      if (document.getElementById('cmbDirection')) document.getElementById('cmbDirection').value = 'ALL';
      currentPage = 0;
      loadBatch(currentBatchId);
    },
    toggleSelectTxn,
    selectAllVisible,
    bulkMarkReview,
    bulkIgnore,
    moveSelectedToExpense,
    moveSelectedToBankEntry,
    openMatchModal,
    confirmMatch,
    quickMoveExpense,
    quickMoveBankEntry,
    reverseMatch,
    openImportModal,
    onCsvFileSelected,
    submitImport,
    toggleStatementHistory,
    openHistoryBatch,
    deleteStatement,
    closeModal,
    toggleActionMenu,

    // Drawer Parity
    onTxnRowClick,
    showTxnDetails,
    closeStatementDrawer,
    drawerMatch,
    drawerMoveExpense,
    drawerMoveBankEntry
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (window.RegisterUiSupport) {
    window.RegisterUiSupport.installEscapeClose('statement-detail-drawer', () => {
      if (window.BankStatementController) window.BankStatementController.closeStatementDrawer();
    });
  }
});

