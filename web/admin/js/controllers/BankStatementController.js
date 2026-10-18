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

  function maskAccount(acc) {
    if (!acc) return 'Acc';
    const s = acc.toString().trim();
    if (s.length <= 4) return s;
    return '****' + s.slice(-4);
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
      const masked = maskAccount(b.bankAccount);
      const isUnrec = (b.reconciliationPercent != null && b.reconciliationPercent < 100) || (b.status !== 'RECONCILED' && b.status !== 'FULLY_RECONCILED');
      const label = `${isUnrec ? '⚠️ ' : '✅ '}${b.bankName || 'Bank'} (${masked}) • ${b.statementFrom || ''} to ${b.statementTo || ''} [${b.transactionCount || 0} rows]`;
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
    currentBatch = batches.find(b => b.id === id) || null;
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

  function renderActionMenuItems(t, status, debit, credit, hasMultiAlloc, docLink) {
    const isUnmatchedGroup = ['UNMATCHED', 'SUGGESTED', 'REVIEW'].includes(status);
    let html = `
      <!-- Category: VIEW -->
      <div class="action-menu-header" style="font-size:0.68rem; font-weight:800; color:var(--text-muted); padding:4px 12px; text-transform:uppercase; letter-spacing:0.5px;">VIEW</div>
      <div class="action-menu-item" onclick="window.BankStatementController.openTxnDetailsDialog(${t.id})"><span style="margin-right:8px;">👁️</span> View Transaction Details</div>
      <div class="action-menu-item" onclick="window.BankStatementController.viewStatementSource(${t.id})"><span style="margin-right:8px;">📄</span> View Imported Statement</div>
      <div class="action-menu-item" onclick="window.AppDialogService && window.AppDialogService.showActivityTimeline ? window.AppDialogService.showActivityTimeline('BANK_RECON', ${t.id}, '${(t.reference || t.description || '').replace(/'/g, "\\'")}') : null"><span style="margin-right:8px;">🕒</span> View Audit History</div>
    `;

    if (isUnmatchedGroup) {
      html += `
        <div class="action-menu-divider" style="height:1px; background:rgba(255,255,255,0.06); margin:4px 0;"></div>
        <!-- Category: RECONCILIATION -->
        <div class="action-menu-header" style="font-size:0.68rem; font-weight:800; color:var(--cyan); padding:4px 12px; text-transform:uppercase; letter-spacing:0.5px;">RECONCILIATION</div>
        <div class="action-menu-item" onclick="window.BankStatementController.openMatchModal(${t.id})"><span style="margin-right:8px;">${status === 'SUGGESTED' ? '💡 Review Suggested Match' : '🎯 Match Transaction'}</span></div>
        ${debit > 0 ? `<div class="action-menu-item" onclick="window.BankStatementController.quickMoveExpense(${t.id}, ${debit})"><span style="margin-right:8px;">💸</span> Move to Expense</div>` : ''}
        <div class="action-menu-item" onclick="window.BankStatementController.quickMoveBankEntry(${t.id}, ${debit > 0 ? debit : credit}, '${debit > 0 ? 'DEBIT' : 'CREDIT'}')"><span style="margin-right:8px;">🏦</span> Move to Bank Entry</div>

        <div class="action-menu-divider" style="height:1px; background:rgba(255,255,255,0.06); margin:4px 0;"></div>
        <!-- Category: STATUS -->
        <div class="action-menu-header" style="font-size:0.68rem; font-weight:800; color:var(--yellow); padding:4px 12px; text-transform:uppercase; letter-spacing:0.5px;">STATUS</div>
        ${status !== 'REVIEW' ? `<div class="action-menu-item" onclick="window.BankStatementController.singleMarkReview(${t.id})"><span style="margin-right:8px;">🚩</span> Mark for Review</div>` : ''}
        <div class="action-menu-item" onclick="window.BankStatementController.singleIgnore(${t.id})"><span style="margin-right:8px;">🚫</span> Mark as Ignored</div>
      `;
    } else if (status === 'MATCHED') {
      html += `
        <div class="action-menu-divider" style="height:1px; background:rgba(255,255,255,0.06); margin:4px 0;"></div>
        <!-- Category: RECONCILIATION -->
        <div class="action-menu-header" style="font-size:0.68rem; font-weight:800; color:var(--cyan); padding:4px 12px; text-transform:uppercase; letter-spacing:0.5px;">RECONCILIATION</div>
        ${hasMultiAlloc ? `
          <div class="action-menu-item" onclick="window.BankStatementController.showLinkedAllocations(${t.id})"><span style="margin-right:8px;">🔗</span> View Match / Linked Record (${t.linkedAllocations.length})</div>
        ` : (docLink ? `
          <div class="action-menu-item" onclick="window.BankStatementController.openLinkedDocument('${docLink.replace(/'/g, "\\'")}')"><span style="margin-right:8px;">🔗</span> View Match / Linked Record</div>
        ` : '')}
        ${docLink && (docLink.startsWith('BANK') || t.linkedTargetType === 'BANK_ENTRY') ? `
          <div class="action-menu-item" onclick="window.BankStatementController.openLinkedDocument('${docLink.replace(/'/g, "\\'")}')"><span style="margin-right:8px;">🏦</span> View Bank Entry</div>
        ` : ''}

        <div class="action-menu-divider" style="height:1px; background:rgba(255,255,255,0.06); margin:4px 0;"></div>
        <!-- Category: REVERSAL -->
        <div class="action-menu-header" style="font-size:0.68rem; font-weight:800; color:var(--red); padding:4px 12px; text-transform:uppercase; letter-spacing:0.5px;">REVERSAL</div>
        <div class="action-menu-item danger" onclick="window.BankStatementController.reverseMatch(${t.id})"><span style="margin-right:8px;">↩️</span> Unmatch / Reverse</div>
      `;
    } else if (status === 'EXPENSE') {
      html += `
        <div class="action-menu-divider" style="height:1px; background:rgba(255,255,255,0.06); margin:4px 0;"></div>
        <!-- Category: RECONCILIATION -->
        <div class="action-menu-header" style="font-size:0.68rem; font-weight:800; color:var(--cyan); padding:4px 12px; text-transform:uppercase; letter-spacing:0.5px;">RECONCILIATION</div>
        ${docLink ? `
          <div class="action-menu-item" onclick="window.BankStatementController.openLinkedDocument('${docLink.replace(/'/g, "\\'")}')"><span style="margin-right:8px;">💸</span> View Expense</div>
        ` : ''}

        <div class="action-menu-divider" style="height:1px; background:rgba(255,255,255,0.06); margin:4px 0;"></div>
        <!-- Category: REVERSAL -->
        <div class="action-menu-header" style="font-size:0.68rem; font-weight:800; color:var(--red); padding:4px 12px; text-transform:uppercase; letter-spacing:0.5px;">REVERSAL</div>
        <div class="action-menu-item danger" onclick="window.BankStatementController.reverseMatch(${t.id})"><span style="margin-right:8px;">↩️</span> Unmatch / Reverse</div>
      `;
    } else if (status === 'IGNORED') {
      html += `
        <div class="action-menu-divider" style="height:1px; background:rgba(255,255,255,0.06); margin:4px 0;"></div>
        <!-- Category: STATUS -->
        <div class="action-menu-header" style="font-size:0.68rem; font-weight:800; color:var(--yellow); padding:4px 12px; text-transform:uppercase; letter-spacing:0.5px;">STATUS</div>
        <div class="action-menu-item" onclick="window.BankStatementController.unignoreTransaction(${t.id})"><span style="margin-right:8px;">↩️</span> Return to Unmatched</div>
      `;
    }
    return html;
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

      const hasMultiAlloc = t.linkedAllocations && t.linkedAllocations.length > 1;
      const docLink = t.linkedDocumentNo || t.matchLink;

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
          <td style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.75rem; color:var(--purple);" title="${docLink || ''}">
            ${hasMultiAlloc ? `
              <a href="javascript:void(0)" onclick="event.stopPropagation(); window.BankStatementController.showLinkedAllocations(${t.id})" style="color:var(--cyan); text-decoration:underline; font-weight:700;">
                🔗 Multi (${t.linkedAllocations.length} linked)
              </a>
            ` : (docLink ? `
              <a href="javascript:void(0)" onclick="event.stopPropagation(); window.BankStatementController.openLinkedDocument('${docLink.replace(/'/g, "\\'")}')" style="color:var(--cyan); text-decoration:underline; font-weight:600;">
                🔗 ${docLink}
              </a>
            ` : (t.suggestedConfidence ? `💡 ${t.suggestedConfidence.toFixed(0)}% match` : '-'))}
          </td>
          <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn-secondary" onclick="window.BankStatementController.toggleActionMenu(${t.id}, event)" style="padding:4px 10px; font-size:0.75rem; font-weight:600; border-radius:6px; display:inline-flex; align-items:center; gap:5px; cursor:pointer;" title="Reconciliation Actions">
                Actions <span style="font-size:0.65rem;">▼</span>
              </button>
              <div id="bs-action-menu-${t.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:#0b1324; border:1px solid rgba(255,255,255,0.14); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.7); min-width:230px; white-space:nowrap; padding:6px 0; text-align:left;">
                ${renderActionMenuItems(t, status, debit, credit, hasMultiAlloc, docLink)}
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
        const menuWidth = 230;
        let left = rect.right - menuWidth;
        if (left < 10) left = 10;

        const menuHeight = targetMenu.offsetHeight || 220;
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

  async function getExpenseCategoryChoice(defaultCat = 'Bank Charges') {
    let categories = ['Bank Charges', 'Utility', 'Office Expenses', 'Factory Consumables', 'Courier & Freight', 'Rent & Premises', 'Professional Fees', 'General Expense'];
    if (window.MasterService) {
      try {
        const cats = await window.MasterService.getLookupValues('EXPENSE_CATEGORY');
        if (Array.isArray(cats) && cats.length > 0) categories = cats;
      } catch (ignored) {}
    }

    const catPrompt = `Select or Enter Expense Category:\n\nAvailable Categories:\n` +
      categories.slice(0, 10).map((c, i) => `${i + 1}. ${c}`).join('\n') +
      `\n\nEnter category name or number (1-${Math.min(categories.length, 10)}):`;
    
    const choice = prompt(catPrompt, defaultCat);
    if (!choice) return null;
    const num = parseInt(choice.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= categories.length) {
      return categories[num - 1];
    }
    return choice.trim();
  }

  async function moveSelectedToExpense() {
    if (selectedTxnIds.size === 0) return;
    const category = await getExpenseCategoryChoice('Bank Charges');
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
  // 3. MATCHING WORKSPACE MODAL (Desktop Parity BankStatementController.java:680-776)
  // ==========================================

  function roundingFor(outstanding, amount, tolerance = 1.00) {
    const diff = Math.round((outstanding - amount) * 100) / 100;
    if (Math.abs(diff) <= 0.0001) return 0;
    return tolerance > 0 && Math.abs(diff) <= tolerance + 0.0001 ? diff : 0;
  }

  function signedMoney(v) {
    if (Math.abs(v) <= 0.0001) return '₹ 0.00';
    return (v >= 0 ? '+' : '-') + formatMoney(Math.abs(v));
  }

  function recalculateMatchMetrics() {
    if (!activeMatchingTxn) return;
    const bankAmount = parseFloat(activeMatchingTxn.debit) > 0 ? parseFloat(activeMatchingTxn.debit) : parseFloat(activeMatchingTxn.credit) || 0;
    const tolerance = 1.00;

    let totalAllocated = 0;
    let totalRoundOff = 0;
    let totalResidual = 0;
    let selectedCount = 0;

    activeCandidates.forEach(r => {
      if (r.selected) {
        selectedCount++;
        const val = parseFloat(r.allocation) || 0;
        totalAllocated += val;
        const ro = roundingFor(r.outstanding, val, tolerance);
        r.roundOff = ro;
        r.residual = Math.max(0, Math.round((r.outstanding - val - ro) * 100) / 100);
        totalRoundOff += ro;
        totalResidual += r.residual;
      } else {
        r.roundOff = 0;
        r.residual = r.outstanding || 0;
      }
    });

    const remainingAmount = Math.round((bankAmount - totalAllocated) * 100) / 100;
    const bankComplete = Math.abs(remainingAmount) <= 0.01;
    const documentsComplete = selectedCount > 0 && totalResidual <= 0.01;

    let state = 'Select a Transaction';
    if (selectedCount === 0) state = 'Select a Transaction';
    else if (!bankComplete) state = 'Bank Not Fully Allocated';
    else if (documentsComplete) state = Math.abs(totalRoundOff) > 0.0001 ? 'Full Match + Round-off' : 'Full Match';
    else state = 'Document Remains Partial';

    const elBank = document.getElementById('mc-kpi-bank-amount');
    if (elBank) elBank.innerText = formatMoney(bankAmount);

    const elAlloc = document.getElementById('mc-kpi-allocated');
    if (elAlloc) elAlloc.innerText = formatMoney(totalAllocated);

    const elRo = document.getElementById('mc-kpi-roundoff');
    if (elRo) {
      elRo.innerText = signedMoney(totalRoundOff);
      elRo.style.color = Math.abs(totalRoundOff) > 0 ? 'var(--cyan)' : 'var(--yellow)';
    }

    const elRem = document.getElementById('mc-kpi-remaining');
    if (elRem) {
      elRem.innerText = formatMoney(remainingAmount);
      elRem.style.color = bankComplete ? 'var(--green)' : '#f87171';
    }

    const elRes = document.getElementById('mc-kpi-residual');
    if (elRes) {
      elRes.innerText = formatMoney(totalResidual);
      elRes.style.color = totalResidual <= 0.01 ? 'var(--green)' : 'var(--cyan)';
    }

    const elStatus = document.getElementById('mc-kpi-status');
    if (elStatus) {
      elStatus.innerText = state;
      elStatus.style.color = bankComplete && documentsComplete ? 'var(--green)' : 'var(--yellow)';
    }

    const elSummary = document.getElementById('mc-footer-summary');
    if (elSummary) {
      elSummary.innerText = `${selectedCount} selected  •  Bank allocated ${formatMoney(totalAllocated)}  •  Round-off ${signedMoney(totalRoundOff)}  •  Bank remaining ${formatMoney(remainingAmount)}  •  Document residual ${formatMoney(totalResidual)}`;
    }

    const chkAll = document.getElementById('mc-chk-all');
    if (chkAll) {
      chkAll.indeterminate = selectedCount > 0 && selectedCount < activeCandidates.length;
      if (!chkAll.indeterminate) {
        chkAll.checked = selectedCount > 0 && selectedCount === activeCandidates.length;
      }
    }

    const btnConfirm = document.getElementById('mc-btn-confirm');
    if (btnConfirm) {
      btnConfirm.disabled = selectedCount === 0 || totalAllocated <= 0;
      btnConfirm.innerHTML = `<span>✅</span> Confirm Match (${selectedCount})`;
    }
  }

  function renderCandidateRows() {
    const tbody = document.getElementById('mc-candidates-tbody');
    if (!tbody) return;

    if (!activeCandidates || activeCandidates.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:30px; color:var(--text-muted);">
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

      const total = parseFloat(c.totalAmount) || 0;
      const outstanding = parseFloat(c.outstanding) || 0;
      const paid = Math.max(0, total - outstanding);

      return `
        <tr style="${c.selected ? 'background:rgba(56,189,248,0.08);' : ''}">
          <td style="text-align:center;">
            <input type="checkbox" ${c.selected ? 'checked' : ''} onchange="window.BankStatementController.onCandidateRowToggle(${idx}, this.checked)" title="Select candidate">
          </td>
          <td style="text-align:center;">
            <span style="font-weight:700; color:${confColor}; font-size:0.75rem;">${conf.toFixed(0)}%</span>
          </td>
          <td><span class="pill-badge pill-neutral">${c.type}</span></td>
          <td style="font-weight:700; color:var(--cyan); font-family:monospace; font-size:0.8rem;">${c.documentNo}</td>
          <td style="font-weight:600; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${c.partyName || ''}">${c.partyName || '-'}</td>
          <td style="white-space:nowrap; font-size:0.75rem;">${formatDate(c.documentDate)}</td>
          <td style="text-align:right; font-weight:600;">${formatMoney(total)}</td>
          <td style="text-align:right; color:var(--text-muted); font-size:0.78rem;">${formatMoney(paid)}</td>
          <td style="text-align:right; font-weight:700; color:var(--yellow);">${formatMoney(outstanding)}</td>
          <td style="text-align:right;">
            <input type="number" step="0.01" min="0" max="${outstanding + 1.00}" value="${c.allocation != null ? c.allocation : 0}" style="width:110px; text-align:right; font-weight:700; font-size:0.82rem; padding:3px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.2); background:rgba(0,0,0,0.5); color:#ffffff;" oninput="window.BankStatementController.onAllocationInputChanged(${idx}, this.value)" onclick="event.stopPropagation();">
          </td>
        </tr>
      `;
    }).join('');
  }

  function onToggleAllCandidates(checked) {
    if (!activeMatchingTxn) return;
    const bankAmount = parseFloat(activeMatchingTxn.debit) > 0 ? parseFloat(activeMatchingTxn.debit) : parseFloat(activeMatchingTxn.credit) || 0;

    if (!checked) {
      activeCandidates.forEach(r => {
        r.allocation = 0;
        r.selected = false;
      });
      renderCandidateRows();
      recalculateMatchMetrics();
      return;
    }

    let left = bankAmount;
    for (const r of activeCandidates) {
      const val = Math.min(r.outstanding, Math.max(0, left));
      r.allocation = val;
      r.selected = val > 0.0001;
      left -= val;
      if (left <= 0.01) left = 0;
    }
    renderCandidateRows();
    recalculateMatchMetrics();
  }

  function onCandidateRowToggle(idx, checked) {
    const r = activeCandidates[idx];
    if (!r) return;
    r.selected = checked;
    if (checked && (!r.allocation || r.allocation <= 0.0001)) {
      const bankAmount = parseFloat(activeMatchingTxn.debit) > 0 ? parseFloat(activeMatchingTxn.debit) : parseFloat(activeMatchingTxn.credit) || 0;
      const used = activeCandidates.filter((x, i) => i !== idx && x.selected).reduce((sum, x) => sum + (parseFloat(x.allocation) || 0), 0);
      r.allocation = Math.min(r.outstanding, Math.max(0, bankAmount - used));
    } else if (!checked) {
      r.allocation = 0;
    }
    renderCandidateRows();
    recalculateMatchMetrics();
  }

  function onAllocationInputChanged(idx, val) {
    const r = activeCandidates[idx];
    if (!r) return;
    const value = parseFloat(val) || 0;
    r.allocation = value;
    r.selected = value > 0.0001;
    recalculateMatchMetrics();
  }

  async function refreshSuggestions() {
    if (!activeMatchingTxn) return;
    const tbody = document.getElementById('mc-candidates-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:24px; color:var(--text-dim);"><span class="loading-spinner"></span> Refreshing match candidates...</td></tr>`;

    try {
      const candidates = await window.ReconService.suggestMatch(activeMatchingTxn.id);
      activeCandidates = (candidates || []).map(c => ({
        ...c,
        outstanding: parseFloat(c.outstanding) || 0,
        totalAmount: parseFloat(c.totalAmount) || 0,
        selected: false,
        allocation: 0,
        roundOff: 0,
        residual: parseFloat(c.outstanding) || 0
      }));
      renderCandidateRows();
      recalculateMatchMetrics();
    } catch (err) {
      console.error('Refresh match suggestion failed:', err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:24px; color:var(--red);">Failed to refresh suggestions: ${err.message || 'Server error'}</td></tr>`;
    }
  }

  async function openMatchModal(txnId) {
    activeMatchingTxn = currentTransactions.find(t => t.id === txnId);
    if (!activeMatchingTxn) return;

    const modal = document.getElementById('modal-match-candidate');
    if (!modal) return;

    const bankAmount = parseFloat(activeMatchingTxn.debit) > 0 ? parseFloat(activeMatchingTxn.debit) : parseFloat(activeMatchingTxn.credit) || 0;
    const bannerTxn = document.getElementById('mc-banner-txn');
    if (bannerTxn) {
      bannerTxn.innerText = `${formatDate(activeMatchingTxn.transactionDate)}  •  ${activeMatchingTxn.reference || 'REF-N/A'}  •  ${activeMatchingTxn.description || '-'}`;
    }

    const tbody = document.getElementById('mc-candidates-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:24px; color:var(--text-dim);"><span class="loading-spinner"></span> Searching ERP transactions (Invoices, Bills, Refunds)...</td></tr>`;
    }
    modal.style.display = 'flex';

    try {
      const candidates = await window.ReconService.suggestMatch(txnId);
      activeCandidates = (candidates || []).map(c => ({
        ...c,
        outstanding: parseFloat(c.outstanding) || 0,
        totalAmount: parseFloat(c.totalAmount) || 0,
        selected: false,
        allocation: 0,
        roundOff: 0,
        residual: parseFloat(c.outstanding) || 0
      }));

      // Desktop parity auto-match: if single candidate with exact match, pre-select it
      if (activeCandidates.length === 1 && Math.abs(activeCandidates[0].outstanding - bankAmount) <= 1.00) {
        activeCandidates[0].selected = true;
        activeCandidates[0].allocation = bankAmount;
      }

      renderCandidateRows();
      recalculateMatchMetrics();
    } catch (err) {
      console.error('Match suggestion failed:', err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:24px; color:var(--red);">Failed to retrieve match suggestions: ${err.message || 'Server error'}</td></tr>`;
    }
  }

  async function confirmCurrentAllocations() {
    if (!activeMatchingTxn) return;
    const bankAmount = parseFloat(activeMatchingTxn.debit) > 0 ? parseFloat(activeMatchingTxn.debit) : parseFloat(activeMatchingTxn.credit) || 0;
    const tolerance = 1.00;

    const allocations = [];
    let allocated = 0;

    for (const r of activeCandidates) {
      if (!r.selected) continue;
      const value = parseFloat(r.allocation) || 0;
      const ro = roundingFor(r.outstanding, value, tolerance);
      if (value <= 0 || (value - r.outstanding > tolerance + 0.0001) || (value - r.outstanding > 0.01 && Math.abs(ro) <= 0.0001)) {
        alert(`Allocation needs attention:\n\nEach selected allocation must be greater than zero. Any final difference from outstanding must be within the configured ₹${formatMoney(tolerance)} round-off tolerance.`);
        return;
      }
      allocations.push({
        targetType: r.type,
        targetId: r.id,
        amount: value
      });
      allocated += value;
    }

    if (allocations.length === 0) {
      alert('Select at least one eligible Sale, Purchase or Return refund transaction.');
      return;
    }

    if (Math.abs(allocated - bankAmount) > 0.01) {
      alert(`Allocation needs attention:\n\nAllocated amount must equal the bank amount.\nBank Amount: ${formatMoney(bankAmount)}\nTotal Allocated: ${formatMoney(allocated)}\nRemaining: ${formatMoney(bankAmount - allocated)}`);
      return;
    }

    let documentResidual = 0;
    activeCandidates.filter(r => r.selected).forEach(r => {
      const ro = roundingFor(r.outstanding, r.allocation, tolerance);
      documentResidual += Math.max(0, Math.round((r.outstanding - r.allocation - ro) * 100) / 100);
    });

    if (documentResidual > 0.01) {
      const proceed = confirm(`Partial Document Settlement:\n\nBank allocation: ${formatMoney(allocated)}\nDocument residual after this match: ${formatMoney(documentResidual)}\n\nThis will leave one or more documents PARTIAL. Continue only if this bank transaction is genuinely a partial settlement.`);
      if (!proceed) return;
    }

    const btnConfirm = document.getElementById('mc-btn-confirm');
    if (btnConfirm) { btnConfirm.disabled = true; btnConfirm.innerText = 'Reconciling...'; }

    try {
      const payload = {
        user: 'Admin',
        allocations: allocations
      };
      const res = await window.ReconService.matchTransaction(activeMatchingTxn.id, payload);
      if (window.AppDialogService) {
        window.AppDialogService.toastSuccess(res?.message || 'Transaction matched successfully.');
      }
      closeModal('modal-match-candidate');
      loadBatch(currentBatchId);
    } catch (err) {
      console.error('Match confirmation failed:', err);
      alert('Match confirmation failed: ' + (err.message || 'Server error'));
    } finally {
      if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.innerHTML = '<span>✅</span> Confirm Match'; }
    }
  }

  async function quickMoveExpense(txnId, amount) {
    const cat = await getExpenseCategoryChoice('Bank Charges');
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
  // 4. STATEMENT CSV IMPORT (Desktop FileChooser & Account Resolution Parity)
  // ==========================================

  let pendingImportParsedData = null;
  let bankAccountOptionsCache = [];

  function importStatement() {
    const fileInput = document.getElementById('bank-csv-file-input');
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  }

  function compactAccount(value) {
    return (value || '').toString().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  async function configureBankAccountMaster() {
    try {
      if (window.MasterService) {
        const accounts = await window.MasterService.getLookups('BANK_ACCOUNT').catch(() => []);
        bankAccountOptionsCache = Array.isArray(accounts) 
          ? accounts.filter(l => l.active !== false && (l.lookupValue || l.value)).map(l => ({
              accountNumber: (l.lookupValue || l.value || '').trim(),
              bankName: (l.description || l.lookupCode || 'Bank Account').trim()
            }))
          : [];
      }
    } catch (e) {
      console.warn('Failed to load BANK_ACCOUNT lookups:', e);
      bankAccountOptionsCache = [];
    }
  }

  function onCsvFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
      const text = e.target.result;
      try {
        await parseAndResolveStatementCsv(text, file.name);
      } catch (err) {
        console.error('CSV parse failed:', err);
        alert('Failed to parse statement CSV: ' + (err.message || 'Invalid format'));
      }
    };
    reader.readAsText(file);
  }

  async function parseAndResolveStatementCsv(content, fileName) {
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      alert('CSV file is empty or does not contain header rows.');
      return;
    }

    let detectedBank = 'Kotak Mahindra Bank';
    let detectedAccount = '';

    // Inspect pre-header lines for bank name and account number metadata
    for (let i = 0; i < Math.min(lines.length, 25); i++) {
      const lineLower = lines[i].toLowerCase();
      if (lineLower.includes('kotak')) detectedBank = 'Kotak Mahindra Bank';
      else if (lineLower.includes('hdfc')) detectedBank = 'HDFC Bank';
      else if (lineLower.includes('icici')) detectedBank = 'ICICI Bank';
      else if (lineLower.includes('axis')) detectedBank = 'Axis Bank';
      else if (lineLower.includes('state bank') || lineLower.includes('sbi')) detectedBank = 'State Bank of India';

      const accMatch = lines[i].match(/(?:account\s*(?:no|number)?|a\/c\s*no\.?)[:\s]+([A-Za-z0-9\-]+)/i);
      if (accMatch && accMatch[1]) {
        detectedAccount = accMatch[1].trim();
      }
    }

    // Header detection matching KotakBankStatementCsvParser
    let headerIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].toLowerCase();
      if (l.includes('sl. no.') || (l.includes('date') && l.includes('balance'))) {
        headerIdx = i;
        break;
      }
    }

    const startLine = headerIdx >= 0 ? headerIdx + 1 : 1;
    const rows = [];
    let runningOpening = null;
    let runningClosing = null;

    for (let i = startLine; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 5) continue;

      const dateStr = (cols[1] || cols[0] || '').trim();
      const valueDateStr = (cols[2] || cols[1] || dateStr).trim();
      const desc = (cols[3] || cols[2] || 'Bank transaction').trim();
      const ref = (cols[4] || cols[3] || 'REF-' + i).trim();

      let debit = 0;
      let credit = 0;
      let balance = 0;

      if (cols.length >= 8 && (cols[6]?.trim() === 'DR' || cols[6]?.trim() === 'CR')) {
        const amt = parseFloat(cols[5].replace(/,/g, '')) || 0;
        if (cols[6].trim() === 'DR') debit = amt; else credit = amt;
        balance = parseFloat(cols[7].replace(/,/g, '')) || 0;
      } else {
        debit = parseFloat(cols[4]?.replace(/,/g, '')) || 0;
        credit = parseFloat(cols[5]?.replace(/,/g, '')) || 0;
        balance = parseFloat(cols[6]?.replace(/,/g, '')) || 0;
      }

      if (runningOpening === null) runningOpening = balance - credit + debit;
      runningClosing = balance;

      // Format ISO date if valid
      let isoDate = new Date().toISOString().slice(0, 10);
      try {
        const dateParts = dateStr.split(/[\/\-]/);
        if (dateParts.length === 3) {
          if (dateParts[0].length === 4) isoDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
          else if (dateParts[2].length === 4) isoDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
        }
      } catch (ignored) {}

      rows.push({
        sourceRowNumber: i,
        transactionTimestamp: new Date().toISOString(),
        transactionDate: isoDate,
        valueDate: isoDate,
        description: desc,
        reference: ref,
        debit: debit,
        credit: credit,
        balance: balance,
        transactionFingerprint: `${ref}|${debit}|${credit}|${balance}|${i}`
      });
    }

    if (rows.length === 0) {
      alert('Could not find any valid transaction rows in the selected statement.');
      return;
    }

    pendingImportParsedData = {
      bankName: detectedBank,
      accountNumber: detectedAccount,
      accountHolder: 'Jasvi Industries Pvt Ltd',
      statementFrom: rows[0]?.transactionDate || new Date().toISOString().slice(0, 10),
      statementTo: rows[rows.length - 1]?.transactionDate || new Date().toISOString().slice(0, 10),
      currency: 'INR',
      openingBalance: runningOpening || 0,
      closingBalance: runningClosing || 0,
      sourceFingerprint: 'FP-' + Date.now(),
      sourceFileName: fileName,
      sourceCsv: content.slice(0, 4000),
      rows: rows
    };

    // Load Master Bank Accounts
    await configureBankAccountMaster();
    if (bankAccountOptionsCache.length === 0) {
      alert('Configure at least one active BANK ACCOUNT in Master Data before importing a statement.');
      return;
    }

    // Check if detected account matches an active option
    const incoming = compactAccount(detectedAccount);
    let matchedOption = null;
    if (incoming) {
      matchedOption = bankAccountOptionsCache.find(opt => compactAccount(opt.accountNumber) === incoming);
    }

    if (matchedOption) {
      // Direct resolution
      await executeStatementImport(matchedOption.bankName || detectedBank, matchedOption.accountNumber);
    } else {
      // Prompt user with Choice Dialog Modal (Desktop resolveBankAccount parity)
      promptSelectBankAccount(detectedBank, detectedAccount);
    }
  }

  function promptSelectBankAccount(detectedBank, detectedAccount) {
    const modal = document.getElementById('modal-select-bank-account');
    if (!modal) return;

    const detectedInfo = document.getElementById('msba-detected-info');
    if (detectedInfo) {
      const detText = (detectedBank + ' ' + (detectedAccount || '')).trim();
      detectedInfo.innerText = detText ? `Detected from CSV: ${detText}` : 'The statement did not expose a recognized account number.';
    }

    const select = document.getElementById('msba-account-select');
    if (select) {
      select.innerHTML = bankAccountOptionsCache.map((opt, i) => `
        <option value="${i}">${opt.bankName} (${opt.accountNumber})</option>
      `).join('');
    }

    modal.style.display = 'flex';
  }

  async function confirmAccountAndImport() {
    const select = document.getElementById('msba-account-select');
    if (!select || !pendingImportParsedData) return;

    const idx = parseInt(select.value, 10);
    const chosen = bankAccountOptionsCache[idx] || bankAccountOptionsCache[0];
    if (!chosen) {
      alert('Please select a valid bank account.');
      return;
    }

    closeModal('modal-select-bank-account');
    await executeStatementImport(chosen.bankName, chosen.accountNumber);
  }

  async function executeStatementImport(bankName, bankAccount) {
    if (!pendingImportParsedData) return;

    const payload = {
      ...pendingImportParsedData,
      bankName: bankName,
      bankAccount: bankAccount,
      importedBy: 'Admin',
      dryRun: false
    };

    try {
      if (window.AppDialogService) window.AppDialogService.toastInfo('Importing statement transactions...');
      const res = await window.ReconService.importStatement(payload);

      if (res?.alreadyImported && res?.batch) {
        const openExisting = confirm(`This exact bank statement was already imported on ${formatDate(res.batch.importedAt)}.\n\nOpen the existing statement instead?`);
        if (openExisting) {
          loadStatementWorkspace(res.batch.id);
        }
      } else if (res?.batch) {
        if (window.AppDialogService) {
          window.AppDialogService.toastSuccess(`Imported: ${res.importedRows || payload.rows.length} transactions.\nDuplicates skipped: ${res.duplicateRows || 0}`);
        }
        loadStatementWorkspace(res.batch.id);
      } else {
        alert('All transactions in this statement were already present, so no new statement batch was created.');
      }
    } catch (err) {
      console.error('Import statement failed:', err);
      alert('Import statement failed: ' + (err.message || 'Server error'));
    } finally {
      pendingImportParsedData = null;
    }
  }

  // ==========================================
  // 5. SCREENSHOT 5: LINKED TRANSACTIONS MODAL
  // ==========================================

  function showLinkedAllocations(txnId) {
    const t = currentTransactions.find(x => x.id === txnId);
    if (!t) return;
    activeSelectedTxnId = txnId;

    const modal = document.getElementById('modal-linked-allocations');
    if (!modal) return;

    const bankAmount = t.debit > 0 ? parseFloat(t.debit) : parseFloat(t.credit);
    const allocations = (t.linkedAllocations && t.linkedAllocations.length > 0)
      ? t.linkedAllocations
      : (t.linkedDocumentNo || t.matchLink ? [
          {
            id: t.id,
            documentNo: t.linkedDocumentNo || t.matchLink,
            targetType: (t.linkedDocumentNo || '').startsWith('INV') ? 'Sales Invoice' : ((t.linkedDocumentNo || '').startsWith('EXP') ? 'Operating Expense' : 'Bank Entry'),
            allocatedAmount: bankAmount,
            roundingAdjustment: 0
          }
        ] : []);

    let totalLinked = 0;
    let totalRound = 0;
    allocations.forEach(a => {
      totalLinked += parseFloat(a.allocatedAmount) || 0;
      totalRound += parseFloat(a.roundingAdjustment) || 0;
    });
    const diff = bankAmount - totalLinked;

    const elRef = document.getElementById('mla-bank-ref');
    if (elRef) elRef.innerText = t.reference || ('Bank #' + t.id);

    const elCnt = document.getElementById('mla-linked-count');
    if (elCnt) elCnt.innerText = allocations.length;

    const elLnk = document.getElementById('mla-bank-linked');
    if (elLnk) elLnk.innerText = formatMoney(totalLinked);

    const elRnd = document.getElementById('mla-round-off');
    if (elRnd) {
      elRnd.innerText = (totalRound >= 0 ? '+ ' : '') + formatMoney(totalRound);
      elRnd.style.color = totalRound === 0 ? 'var(--text-muted)' : (totalRound > 0 ? 'var(--green)' : 'var(--red)');
    }

    const elDiff = document.getElementById('mla-diff');
    if (elDiff) {
      elDiff.innerText = formatMoney(Math.abs(diff));
      elDiff.style.color = Math.abs(diff) < 0.01 ? 'var(--green)' : 'var(--yellow)';
    }

    const tbody = document.getElementById('mla-tbody');
    if (tbody) {
      if (allocations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-dim);">No linked allocations found.</td></tr>';
      } else {
        tbody.innerHTML = allocations.map(a => `
          <tr>
            <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${a.documentNo || ('#' + a.id)}</td>
            <td><span class="pill-badge pill-neutral">${a.targetType || 'ERP Document'}</span></td>
            <td style="text-align:right; font-weight:700; color:var(--text-main);">${formatMoney(a.allocatedAmount)}</td>
            <td style="text-align:right; color:var(--text-muted);">${formatMoney(a.roundingAdjustment || 0)}</td>
            <td style="text-align:center;">
              <button class="btn btn-secondary btn-sm" onclick="window.BankStatementController.openLinkedDocument('${(a.documentNo || '').replace(/'/g, "\\'")}')" style="padding:2px 8px; font-size:0.75rem;">👁️ View</button>
            </td>
          </tr>
        `).join('');
      }
    }

    const footerText = document.getElementById('mla-footer-text');
    if (footerText) {
      footerText.innerText = `${allocations.length} linked transaction${allocations.length !== 1 ? 's' : ''} • Use View to open the existing linked workflow.`;
    }

    modal.style.display = 'flex';
  }

  // ==========================================
  // 6. SCREENSHOT 4: TXN DETAILS & NOTE EDITOR
  // ==========================================

  function openTxnDetailsDialog(id) {
    const t = currentTransactions.find(x => x.id === id);
    if (!t) return;
    activeSelectedTxnId = id;

    const modal = document.getElementById('modal-statement-txn-details');
    if (!modal) return;

    const debit = parseFloat(t.debit) || 0;
    const credit = parseFloat(t.credit) || 0;

    const elSub = document.getElementById('mstd-sub');
    if (elSub) elSub.innerText = `Audit inspection & notes for statement row #${t.id}`;

    const elDates = document.getElementById('mstd-dates');
    if (elDates) elDates.innerText = `${formatDate(t.transactionDate)} / ${formatDate(t.valueDate || t.transactionDate)}`;

    const elRef = document.getElementById('mstd-ref');
    if (elRef) elRef.innerText = t.reference || '-';

    const elAmt = document.getElementById('mstd-amount');
    if (elAmt) {
      if (debit > 0) {
        elAmt.innerText = `Debit: ${formatMoney(debit)}`;
        elAmt.style.color = 'var(--red)';
      } else {
        elAmt.innerText = `Credit: ${formatMoney(credit)}`;
        elAmt.style.color = 'var(--green)';
      }
    }

    const elBal = document.getElementById('mstd-balance');
    if (elBal) elBal.innerText = formatMoney(t.balance || 0);

    const elDesc = document.getElementById('mstd-desc');
    if (elDesc) elDesc.innerText = t.description || '-';

    const elStatus = document.getElementById('mstd-status-match');
    if (elStatus) elStatus.innerText = t.status || 'UNMATCHED';

    const elConf = document.getElementById('mstd-confidence');
    if (elConf) {
      elConf.innerText = t.linkedDocumentNo || t.matchLink || (t.suggestedConfidence ? `${t.suggestedConfidence.toFixed(0)}% rule confidence` : 'Direct');
    }

    const notesInput = document.getElementById('mstd-notes');
    if (notesInput) {
      notesInput.value = t.notes || '';
      const charCount = document.getElementById('mstd-char-count');
      if (charCount) charCount.innerText = `${(t.notes || '').length} / 500`;
    }

    modal.style.display = 'flex';
  }

  async function saveTxnNotes() {
    if (!activeSelectedTxnId) return;
    const notesInput = document.getElementById('mstd-notes');
    const note = notesInput ? notesInput.value.trim() : '';

    try {
      const t = currentTransactions.find(x => x.id === activeSelectedTxnId);
      await window.ReconService.updateTransactionNote(activeSelectedTxnId, note, 'Admin', t?.rowVersion);
      if (t) t.notes = note;
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Transaction audit notes saved.');
      closeModal('modal-statement-txn-details');
      renderTable(currentTransactions);
    } catch (err) {
      alert('Failed to save notes: ' + (err.message || 'Server error'));
    }
  }

  // ==========================================
  // 7. SOURCE CSV EVIDENCE & CHECKSUM
  // ==========================================

  function viewStatementSource(id) {
    const t = currentTransactions.find(x => x.id === id);
    if (!t) return;

    const modal = document.getElementById('modal-statement-source-evidence');
    if (!modal) return;

    const elSub = document.getElementById('msse-sub');
    if (elSub) elSub.innerText = `Original batch #${currentBatchId || ''} provenance & SHA-256 fingerprint`;

    const elFile = document.getElementById('msse-filename');
    if (elFile) elFile.innerText = `Batch #${currentBatchId || '-'} • ${currentBatch?.sourceFileName || 'Kotak_Bank_Statement.csv'}`;

    const elImp = document.getElementById('msse-imported-at');
    if (elImp) elImp.innerText = `${formatDate(currentBatch?.importedAt || new Date().toISOString())} by ${currentBatch?.importedBy || 'Admin'}`;

    const elCheck = document.getElementById('msse-checksum');
    if (elCheck) elCheck.value = currentBatch?.sourceFingerprint || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const elRaw = document.getElementById('msse-raw-csv');
    if (elRaw) {
      elRaw.innerText = `${t.sourceRowNumber || 1},"${t.transactionDate}","${t.valueDate || t.transactionDate}","${(t.description || '').replace(/"/g, '""')}","${t.reference || ''}",${t.debit || 0},${t.credit || 0},${t.balance || 0}`;
    }

    modal.style.display = 'flex';
  }

  function copyChecksum() {
    const el = document.getElementById('msse-checksum');
    if (!el || !el.value) return;
    navigator.clipboard.writeText(el.value).then(() => {
      if (window.AppDialogService) window.AppDialogService.toastSuccess('SHA-256 Checksum copied to clipboard!');
      else alert('SHA-256 Checksum copied!');
    }).catch(() => {
      el.select();
      document.execCommand('copy');
      alert('SHA-256 Checksum copied!');
    });
  }

  // ==========================================
  // 8. 1040px BROWSE STATEMENT HISTORY DIALOG
  // ==========================================

  let historyBatchesCache = [];

  function toggleStatementHistory(show) {
    const modal = document.getElementById('modal-statement-history');
    if (!modal) return;
    const isShowing = modal.style.display === 'flex';
    const targetShow = show !== undefined ? show : !isShowing;
    if (targetShow) {
      modal.style.display = 'flex';
      loadStatementHistory();
    } else {
      modal.style.display = 'none';
    }
  }

  async function loadStatementHistory() {
    const tbody = document.getElementById('bsh-table-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-dim);"><span class="loading-spinner"></span> Loading statement batches...</td></tr>`;
    }

    try {
      const pageData = await window.ReconService.getBatchPage(0, 100);
      const list = pageData?.rows || pageData?.content || batches || [];
      historyBatchesCache = list;
      applyHistoryFilters();
    } catch (e) {
      console.error('Failed to load statement history:', e);
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--red);">⚠️ Failed to load history: ${e.message}</td></tr>`;
    }
  }

  function applyHistoryFilters() {
    const tbody = document.getElementById('bsh-table-tbody');
    if (!tbody) return;

    const q = (document.getElementById('bsh-search')?.value || '').toLowerCase().trim();
    const status = document.getElementById('bsh-status')?.value || '';
    const fromDate = document.getElementById('bsh-from-date')?.value || '';
    const toDate = document.getElementById('bsh-to-date')?.value || '';

    const filtered = historyBatchesCache.filter(b => {
      const fn = (b.sourceFileName || '').toLowerCase();
      const bn = (b.bankName || '').toLowerCase();
      const acc = (b.bankAccount || '').toLowerCase();
      const matchesQ = !q || fn.includes(q) || bn.includes(q) || acc.includes(q);

      let matchesStatus = true;
      if (status) {
        matchesStatus = (b.status || '').toUpperCase() === status.toUpperCase();
      }

      let matchesDate = true;
      const impDate = (b.importedAt || b.statementFrom || '').split('T')[0];
      if (impDate) {
        if (fromDate && impDate < fromDate) matchesDate = false;
        if (toDate && impDate > toDate) matchesDate = false;
      }

      return matchesQ && matchesStatus && matchesDate;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">No statement batches match filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(b => {
      const rec = b.reconciliationPercent != null ? parseFloat(b.reconciliationPercent) : 0;
      const isDone = rec >= 100;
      const masked = maskAccount(b.bankAccount);

      return `
        <tr>
          <td>${formatDate(b.importedAt)}</td>
          <td style="font-family: monospace; font-size: 0.8rem; font-weight: 600; color: var(--cyan);">${b.sourceFileName || 'Statement.csv'}</td>
          <td style="font-weight: 600;">${b.bankName || 'Bank'} (${masked})</td>
          <td>${formatDate(b.statementFrom)} to ${formatDate(b.statementTo)}</td>
          <td style="text-align: right; font-weight: 700;">${(b.transactionCount || 0).toLocaleString()}</td>
          <td style="text-align: center;">
            <span class="pill-badge ${isDone ? 'pill-success' : 'pill-purple'}" style="font-size: 0.72rem;">${rec.toFixed(1)}%</span>
          </td>
          <td style="text-align: center;">
            <span class="pill-badge ${isDone ? 'pill-success' : 'pill-warning'}">${b.status || 'IMPORTED'}</span>
          </td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="window.BankStatementController.openHistoryBatch(${b.id})" style="padding: 2px 8px; font-size: 0.75rem;">📂 Open</button>
            <button class="btn btn-danger btn-sm" onclick="window.BankStatementController.deleteStatement(${b.id})" style="padding: 2px 8px; font-size: 0.75rem; margin-left: 4px;" title="Delete Batch">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function resetHistoryFilters() {
    if (document.getElementById('bsh-search')) document.getElementById('bsh-search').value = '';
    if (document.getElementById('bsh-status')) document.getElementById('bsh-status').value = '';
    if (document.getElementById('bsh-from-date')) document.getElementById('bsh-from-date').value = '';
    if (document.getElementById('bsh-to-date')) document.getElementById('bsh-to-date').value = '';
    applyHistoryFilters();
  }

  function openHistoryBatch(id) {
    closeModal('modal-statement-history');
    loadStatementWorkspace(id);
  }

  // ==========================================
  // 9. TWO-STEP DELETE CONFIRMATION (Desktop Parity BankStatementController.java:352-373)
  // ==========================================

  let pendingDeleteBatch = null;

  async function deleteStatement(id = null) {
    const targetId = id || currentBatchId;
    if (!targetId) return;

    pendingDeleteBatch = batches.find(b => b.id === targetId) || { id: targetId };

    const modal = document.getElementById('modal-statement-delete-confirm');
    if (!modal) return;

    // Reset to Phase 1
    const phase1 = document.getElementById('msdc-phase-1');
    const phase2 = document.getElementById('msdc-phase-2');
    if (phase1) phase1.style.display = 'block';
    if (phase2) phase2.style.display = 'none';

    const lbl = document.getElementById('msdc-batch-label');
    if (lbl) {
      lbl.innerText = `Batch #${pendingDeleteBatch.id}: ${pendingDeleteBatch.bankName || 'Bank'} (${maskAccount(pendingDeleteBatch.bankAccount)}) • ${pendingDeleteBatch.transactionCount || 0} Transactions`;
    }

    // Load or calculate metrics
    try {
      const metrics = await window.ReconService.getMetrics(pendingDeleteBatch.id);
      document.getElementById('msdc-metric-total').innerText = metrics?.total || pendingDeleteBatch.transactionCount || 0;
      document.getElementById('msdc-metric-matched').innerText = metrics?.matched || 0;
      document.getElementById('msdc-metric-expenses').innerText = metrics?.expenses || 0;
      document.getElementById('msdc-metric-ignored').innerText = metrics?.ignored || 0;
    } catch (e) {
      document.getElementById('msdc-metric-total').innerText = pendingDeleteBatch.transactionCount || 0;
      document.getElementById('msdc-metric-matched').innerText = '-';
      document.getElementById('msdc-metric-expenses').innerText = '-';
      document.getElementById('msdc-metric-ignored').innerText = '-';
    }

    modal.style.display = 'flex';
  }

  function proceedToDeleteStepTwo() {
    const phase1 = document.getElementById('msdc-phase-1');
    const phase2 = document.getElementById('msdc-phase-2');
    if (phase1) phase1.style.display = 'none';
    if (phase2) phase2.style.display = 'block';

    const confirmInput = document.getElementById('msdc-confirm-input');
    if (confirmInput) {
      confirmInput.value = '';
      confirmInput.focus();
    }

    const btnDelete = document.getElementById('msdc-btn-delete');
    if (btnDelete) btnDelete.disabled = true;
  }

  function onDeleteConfirmInput(val) {
    const btnDelete = document.getElementById('msdc-btn-delete');
    if (btnDelete) {
      btnDelete.disabled = val.trim().toUpperCase() !== 'DELETE';
    }
  }

  async function executeBatchDelete() {
    if (!pendingDeleteBatch) return;

    const btnDelete = document.getElementById('msdc-btn-delete');
    if (btnDelete) {
      btnDelete.disabled = true;
      btnDelete.innerText = 'Deleting...';
    }

    try {
      const res = await window.ReconService.deleteBatch(pendingDeleteBatch.id, 'DELETE', 'Admin');
      if (window.AppDialogService) {
        window.AppDialogService.toastSuccess(res?.message || `Bank statement #${pendingDeleteBatch.id} deleted successfully.`);
      }
      closeModal('modal-statement-delete-confirm');
      closeModal('modal-statement-history');
      await loadStatementWorkspace();
    } catch (err) {
      console.error('Delete batch failed:', err);
      alert('Delete failed: ' + (err.message || 'Server error'));
    } finally {
      if (btnDelete) {
        btnDelete.disabled = false;
        btnDelete.innerText = 'Delete Statement';
      }
      pendingDeleteBatch = null;
    }
  }

  async function unignoreTransaction(id) {
    if (!confirm('Return this transaction to UNMATCHED status?')) return;
    try {
      await window.ReconService.reverseTransaction(id, 'Admin');
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Transaction returned to UNMATCHED status.');
      loadBatch(currentBatchId);
    } catch (err) {
      alert('Failed to return transaction: ' + (err.message || 'Server error'));
    }
  }

  // ==========================================
  // 10. REASON PROMPT MODAL (Review / Ignore)
  // ==========================================

  let pendingReasonCallback = null;

  function promptReason(title, promptText, callback) {
    const modal = document.getElementById('modal-statement-reason');
    if (!modal) return;

    const elTitle = document.getElementById('msr-title');
    if (elTitle) elTitle.innerText = title;

    const elPrompt = document.getElementById('msr-prompt');
    if (elPrompt) elPrompt.innerText = promptText;

    const textarea = document.getElementById('msr-reason');
    if (textarea) textarea.value = '';

    pendingReasonCallback = callback;
    modal.style.display = 'flex';
  }

  function submitReason() {
    const textarea = document.getElementById('msr-reason');
    const reason = textarea ? textarea.value.trim() : '';
    if (!reason) {
      alert('Please enter a valid audit reason.');
      return;
    }
    closeModal('modal-statement-reason');
    if (pendingReasonCallback) {
      pendingReasonCallback(reason);
      pendingReasonCallback = null;
    }
  }

  function singleMarkReview(id) {
    promptReason('Mark Transaction for Review', `Provide audit reason for marking transaction #${id} for review:`, async (reason) => {
      try {
        await window.ReconService.reviewTransaction(id, reason, 'Admin');
        if (window.AppDialogService) window.AppDialogService.toastSuccess('Transaction marked for review.');
        loadBatch(currentBatchId);
      } catch (e) {
        alert('Review failed: ' + e.message);
      }
    });
  }

  function singleIgnore(id) {
    promptReason('Mark Transaction as Ignored', `Provide audit explanation for ignoring transaction #${id}:`, async (reason) => {
      try {
        await window.ReconService.ignoreTransaction(id, reason, 'Admin');
        if (window.AppDialogService) window.AppDialogService.toastSuccess('Transaction marked as ignored.');
        loadBatch(currentBatchId);
      } catch (e) {
        alert('Ignore failed: ' + e.message);
      }
    });
  }

  // ==========================================
  // 11. BULK MOVE MODAL (Expense / Bank Entry)
  // ==========================================

  let pendingBulkMoveType = 'EXPENSE';

  async function openBulkMove(targetType) {
    if (selectedTxnIds.size === 0) {
      alert('Please select at least one transaction to move.');
      return;
    }
    pendingBulkMoveType = targetType;
    const modal = document.getElementById('modal-statement-bulk-move');
    if (!modal) return;

    const isExpense = targetType === 'EXPENSE';
    const title = document.getElementById('msbm-title');
    if (title) title.innerText = isExpense ? 'Move Selected to Operating Expenses' : 'Move Selected to Bank Entry Register';

    const countText = document.getElementById('msbm-count-text');
    if (countText) countText.innerText = `Moving ${selectedTxnIds.size} selected transaction${selectedTxnIds.size !== 1 ? 's' : ''}`;

    const catGroup = document.getElementById('msbm-group-category');
    if (catGroup) catGroup.style.display = isExpense ? 'block' : 'none';

    // Populate lookups
    try {
      if (window.MasterService) {
        const [categories, accounts, modes] = await Promise.all([
          window.MasterService.getLookupValues('EXPENSE_CATEGORY').catch(() => []),
          window.MasterService.getLookups('BANK_ACCOUNT').catch(() => []),
          window.MasterService.getLookupValues('PAYMENT_MODE').catch(() => [])
        ]);

        const catSelect = document.getElementById('msbm-category');
        if (catSelect && categories.length > 0) {
          catSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
        }

        const accSelect = document.getElementById('msbm-account');
        if (accSelect) {
          const acctList = Array.isArray(accounts) ? accounts.filter(a => a.active !== false) : [];
          if (acctList.length > 0) {
            accSelect.innerHTML = acctList.map(a => `<option value="${a.lookupValue}">${a.lookupValue}${a.description ? ' (' + a.description + ')' : ''}</option>`).join('');
          } else {
            accSelect.innerHTML = '<option value="Primary Bank Account">Primary Bank Account</option>';
          }
        }

        const modeSelect = document.getElementById('msbm-mode');
        if (modeSelect && modes.length > 0) {
          modeSelect.innerHTML = modes.map(m => `<option value="${m}">${m}</option>`).join('');
        }
      }
    } catch (e) {
      console.warn('Could not populate bulk move lookups:', e);
    }

    modal.style.display = 'flex';
  }

  async function submitBulkMove() {
    const isExpense = pendingBulkMoveType === 'EXPENSE';
    const category = document.getElementById('msbm-category')?.value || 'Bank Charges';
    const account = document.getElementById('msbm-account')?.value || 'Primary Bank Account';
    const mode = document.getElementById('msbm-mode')?.value || 'NEFT';
    const notesPrefix = document.getElementById('msbm-notes')?.value?.trim() || 'Bulk converted from statement';

    try {
      if (isExpense) {
        const payload = {
          transactionIds: Array.from(selectedTxnIds),
          category: category,
          accountName: account,
          paymentMode: mode,
          notes: `${notesPrefix} (Batch #${currentBatchId})`,
          user: 'Admin'
        };
        const res = await window.ReconService.bulkExpense(payload);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(res?.message || `Moved ${selectedTxnIds.size} transactions to Operating Expenses.`);
      } else {
        const payload = {
          transactionIds: Array.from(selectedTxnIds),
          accountName: account,
          paymentMode: mode,
          notes: `${notesPrefix} (Batch #${currentBatchId})`,
          user: 'Admin'
        };
        const res = await window.ReconService.bulkBankEntry(payload);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(res?.message || `Moved ${selectedTxnIds.size} transactions to Bank Entries.`);
      }
      closeModal('modal-statement-bulk-move');
      selectedTxnIds.clear();
      updateBulkToolbar();
      loadBatch(currentBatchId);
    } catch (err) {
      alert('Bulk move failed: ' + (err.message || 'Server error'));
    }
  }

  // ==========================================
  // 12. ROW HIGHLIGHTING & NAVIGATION PARITY
  // ==========================================

  function highlightTxn(txnId) {
    if (!txnId) return;
    const targetRow = document.querySelector(`#bank-statement-tbody tr[data-stmt-id="${txnId}"]`);
    if (targetRow) {
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetRow.style.transition = 'background 0.5s ease';
      targetRow.style.background = 'rgba(56,189,248,0.25)';
      setTimeout(() => {
        targetRow.style.background = '';
      }, 2500);
    }
  }

  function changePageSize(newSize) {
    pageSize = parseInt(newSize, 10) || 50;
    currentPage = 0;
    loadBatch(currentBatchId);
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
    if (elLink) {
      const doc = t.linkedDocumentNo || t.matchLink;
      if (doc) {
        elLink.innerHTML = `<a href="javascript:void(0)" onclick="window.BankStatementController.openLinkedDocument('${doc.replace(/'/g, "\\'")}')" style="color:var(--cyan); text-decoration:underline; font-weight:600;">🔗 ${doc}</a>`;
      } else {
        elLink.innerText = t.suggestedConfidence ? `Suggested (${t.suggestedConfidence.toFixed(0)}%)` : 'Unlinked';
      }
    }
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

  function openLinkedDocument(docRef) {
    if (!docRef) return;
    const ref = docRef.trim().toUpperCase();
    if (ref.startsWith('PRC')) {
      if (window.NavigationRouter) window.NavigationRouter.selectNav('view-purchase-recon');
      setTimeout(() => {
        const searchInput = document.getElementById('pr-search-input');
        if (searchInput) {
          searchInput.value = docRef;
          if (window.PurchaseReconController) window.PurchaseReconController.applyFilters();
        }
      }, 250);
    } else if (ref.startsWith('INV') || ref.startsWith('SAL')) {
      if (window.NavigationRouter) window.NavigationRouter.selectNav('view-sales-register');
      setTimeout(() => {
        const searchInput = document.getElementById('sales-search');
        if (searchInput) {
          searchInput.value = docRef;
          if (window.SalesController) window.SalesController.applyFilters();
        }
      }, 250);
    } else if (ref.startsWith('PO') || ref.startsWith('PUR') || ref.startsWith('BILL')) {
      if (window.NavigationRouter) window.NavigationRouter.selectNav('view-purchase-register');
      setTimeout(() => {
        const searchInput = document.getElementById('purchase-search');
        if (searchInput) {
          searchInput.value = docRef;
          if (window.PurchaseController) window.PurchaseController.applyFilters();
        }
      }, 250);
    } else if (ref.startsWith('EXP') || ref.startsWith('VCH')) {
      if (window.NavigationRouter) window.NavigationRouter.selectNav('view-expense-entry');
      setTimeout(() => {
        const searchInput = document.getElementById('fe-search');
        if (searchInput) {
          searchInput.value = docRef;
          if (window.FinanceController) window.FinanceController.applyFilters();
        }
      }, 250);
    } else if (ref.startsWith('BANK') || ref.startsWith('JRN')) {
      if (window.NavigationRouter) window.NavigationRouter.selectNav('view-bank-entry');
      setTimeout(() => {
        const searchInput = document.getElementById('fe-search');
        if (searchInput) {
          searchInput.value = docRef;
          if (window.FinanceController) window.FinanceController.applyFilters();
        }
      }, 250);
    } else if (ref.startsWith('PAY') || ref.startsWith('REC')) {
      if (window.NavigationRouter) window.NavigationRouter.selectNav('view-record-payment');
    } else {
      if (window.AppDialogService) window.AppDialogService.toastInfo(`Linked document: ${docRef}`);
    }
  }

  return {
    loadStatementWorkspace,
    onBatchSelected,
    loadBatch,
    prevPage,
    nextPage,
    changePageSize,
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
    moveSelectedToExpense() { openBulkMove('EXPENSE'); },
    moveSelectedToBankEntry() { openBulkMove('BANK'); },

    // Match Workspace (Desktop Parity)
    openMatchModal,
    onToggleAllCandidates,
    onCandidateRowToggle,
    onAllocationInputChanged,
    refreshSuggestions,
    confirmCurrentAllocations,

    quickMoveExpense,
    quickMoveBankEntry,
    reverseMatch,
    unignoreTransaction,

    // CSV Import (Desktop FileChooser & Account Resolution Parity)
    importStatement,
    onCsvFileSelected,
    confirmAccountAndImport,

    toggleStatementHistory,
    loadStatementHistory,
    applyHistoryFilters,
    resetHistoryFilters,
    openHistoryBatch,

    // 2-Step Delete (Desktop Parity)
    deleteStatement,
    proceedToDeleteStepTwo,
    onDeleteConfirmInput,
    executeBatchDelete,

    closeModal,
    toggleActionMenu,

    // Modals & Actions (Parity)
    showLinkedAllocations,
    openTxnDetailsDialog,
    saveTxnNotes,
    viewStatementSource,
    copyChecksum,
    singleMarkReview,
    singleIgnore,
    promptReason,
    submitReason,
    openBulkMove,
    submitBulkMove,
    highlightTxn,

    // Drawer Parity
    onTxnRowClick,
    showTxnDetails,
    closeStatementDrawer,
    drawerMatch,
    drawerMoveExpense,
    drawerMoveBankEntry,
    openLinkedDocument
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (window.RegisterUiSupport) {
    window.RegisterUiSupport.installEscapeClose('statement-detail-drawer', () => {
      if (window.BankStatementController) window.BankStatementController.closeStatementDrawer();
    });
  }
});

