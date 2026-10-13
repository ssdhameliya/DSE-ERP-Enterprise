/**
 * Jasvi Industries ERP - FinanceController
 * Desktop Parity Implementation for BankExpenseController.java & BankExpense.fxml
 * Bank entries, expense vouchers, general ledger, P&L statements, and accounts aging
 */
window.FinanceController = {
  vouchersCache: [],
  filteredVouchers: [],
  currentMode: 'BANK', // 'BANK' or 'EXPENSE'
  currentPage: 0,
  pageSize: 25,
  totalRows: 0,

  formatMoney(amount) {
    return '₹ ' + (parseFloat(amount) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  formatDate(d) {
    if (!d) return '-';
    try {
      const parts = d.toString().split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return d;
    } catch {
      return d;
    }
  },

  // ==========================================
  // 1. BANK & EXPENSE REGISTERS
  // ==========================================

  async loadBankMode() {
    this.currentMode = 'BANK';
    this.updateModeButtons('BANK');
    await this.loadFinance();
  },

  async loadExpenseMode() {
    this.currentMode = 'EXPENSE';
    this.updateModeButtons('EXPENSE');
    await this.loadFinance();
  },

  updateModeButtons(mode) {
    const btnBank = document.getElementById('btnBankMode');
    const btnExpense = document.getElementById('btnExpenseMode');
    if (btnBank) {
      if (mode === 'BANK') btnBank.classList.add('btn-primary');
      else btnBank.classList.remove('btn-primary');
    }
    if (btnExpense) {
      if (mode === 'EXPENSE') btnExpense.classList.add('btn-primary');
      else btnExpense.classList.remove('btn-primary');
    }
  },

  async loadFinance() {
    const bankTbody = document.getElementById('bank-entry-tbody');
    const expenseTbody = document.getElementById('expense-entry-tbody');
    const ledgerTbody = document.getElementById('finance-table-tbody') || document.getElementById('ledger-table-tbody');

    if (bankTbody && this.currentMode === 'BANK') {
      bankTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading bank entries...</td></tr>`;
    }
    if (expenseTbody && this.currentMode === 'EXPENSE') {
      expenseTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading expense vouchers...</td></tr>`;
    }

    try {
      const res = await window.OperationsService.getVouchers(0, 200);
      const list = res.rows || res.content || (Array.isArray(res) ? res : []);
      this.vouchersCache = list;

      this.updateFinanceKpis(list);
      this.applyFinanceFilters();

      // Also update General Ledger table if open
      if (ledgerTbody) {
        if (list.length === 0) {
          ledgerTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 24px;">No ledger journal postings found.</td></tr>`;
        } else {
          ledgerTbody.innerHTML = list.map(v => `
            <tr>
              <td style="font-weight: 700; color: var(--cyan); font-family:monospace;">${v.voucherNo || v.ref || 'JV-001'}</td>
              <td>${this.formatDate(v.voucherDate || v.date)}</td>
              <td><span class="pill-badge ${v.voucherType === 'RECEIPT' ? 'pill-success' : 'pill-warning'}">${v.voucherType || 'JOURNAL'}</span></td>
              <td style="font-weight: 600;">${v.partyName || v.bankAccount || 'General Account'}</td>
              <td style="font-weight: 700; text-align:right;">${this.formatMoney(v.amount || 0)}</td>
              <td>${v.paymentMode || 'NEFT'}</td>
              <td style="color: var(--text-muted);">${v.narration || '-'}</td>
            </tr>
          `).join('');
        }
      }

    } catch (e) {
      console.error('Failed to load finance data:', e);
      if (bankTbody) bankTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:var(--red);">⚠️ Error: ${e.message}</td></tr>`;
      if (expenseTbody) expenseTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:var(--red);">⚠️ Error: ${e.message}</td></tr>`;
    }
  },

  updateFinanceKpis(list) {
    let totalInflow = 0;
    let totalOutflow = 0;
    let totalExpenses = 0;
    const expCategories = new Set();

    list.forEach(v => {
      const amt = parseFloat(v.amount) || 0;
      if (v.voucherType === 'RECEIPT' || v.voucherType === 'CONTRA_IN') {
        totalInflow += amt;
      } else if (v.voucherType === 'PAYMENT' || v.voucherType === 'CONTRA_OUT') {
        totalOutflow += amt;
        totalExpenses += amt;
        if (v.narration) expCategories.add(v.narration.split('|')[0].trim());
      }
    });

    const netFlow = totalInflow - totalOutflow;

    // Bank Mode KPIs
    const bKpi1 = document.getElementById('bank-kpi-balance');
    const bKpi2 = document.getElementById('bank-kpi-inflow');
    const bKpi3 = document.getElementById('bank-kpi-outflow');
    const bKpi4 = document.getElementById('bank-kpi-net');

    if (bKpi1) bKpi1.innerText = this.formatMoney(netFlow);
    if (bKpi2) bKpi2.innerText = this.formatMoney(totalInflow);
    if (bKpi3) bKpi3.innerText = this.formatMoney(totalOutflow);
    if (bKpi4) {
      bKpi4.innerText = this.formatMoney(netFlow);
      bKpi4.style.color = netFlow >= 0 ? 'var(--green)' : 'var(--red)';
    }

    // Expense Mode KPIs
    const eKpi1 = document.getElementById('exp-kpi-total');
    const eKpi2 = document.getElementById('exp-kpi-month');
    const eKpi3 = document.getElementById('exp-kpi-cash');
    const eKpi4 = document.getElementById('exp-kpi-categories');

    if (eKpi1) eKpi1.innerText = this.formatMoney(totalExpenses);
    if (eKpi2) eKpi2.innerText = this.formatMoney(totalExpenses);
    if (eKpi3) eKpi3.innerText = this.formatMoney(totalOutflow);
    if (eKpi4) eKpi4.innerText = expCategories.size.toString();
  },

  applyFinanceFilters() {
    const isBank = this.currentMode === 'BANK';
    const q = (document.getElementById(isBank ? 'bank-search' : 'exp-search')?.value || '').toLowerCase().trim();
    const typeFilter = document.getElementById(isBank ? 'bank-type-filter' : 'exp-type-filter')?.value || '';

    let items = isBank
      ? this.vouchersCache.filter(v => v.voucherType === 'RECEIPT' || v.voucherType === 'CONTRA' || (v.paymentMode && v.paymentMode.includes('BANK')) || v.voucherType !== 'PAYMENT')
      : this.vouchersCache.filter(v => v.voucherType === 'PAYMENT');

    if (items.length === 0 && isBank) items = this.vouchersCache;

    this.filteredVouchers = items.filter(v => {
      const ref = (v.voucherNo || v.ref || '').toLowerCase();
      const desc = (v.narration || '').toLowerCase();
      const party = (v.partyName || v.bankAccount || '').toLowerCase();
      const matchesQ = !q || ref.includes(q) || desc.includes(q) || party.includes(q);
      const matchesType = !typeFilter || (v.voucherType || '').toUpperCase() === typeFilter.toUpperCase();
      return matchesQ && matchesType;
    });

    this.renderFinanceTable(isBank);
  },

  renderFinanceTable(isBank) {
    const tbody = document.getElementById(isBank ? 'bank-entry-tbody' : 'expense-entry-tbody');
    if (!tbody) return;

    if (this.filteredVouchers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:1.8rem; margin-bottom:8px;">${isBank ? '🏦' : '💸'}</div>
            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">No ${isBank ? 'bank journal entries' : 'expense vouchers'} found</div>
            <div style="font-size:0.78rem;">Click "+ New ${isBank ? 'Bank Entry' : 'Record Expense'}" to create one.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filteredVouchers.map(v => {
      const isDebit = v.voucherType === 'PAYMENT' || (v.type && v.type.includes('DEBIT'));
      const amt = parseFloat(v.amount) || 0;

      return `
        <tr>
          <td style="white-space:nowrap; font-weight:600;">${this.formatDate(v.voucherDate || v.date)}</td>
          <td>
            <span class="pill-badge ${isDebit ? 'pill-danger' : 'pill-success'}">
              ${v.voucherType || (isDebit ? 'DEBIT' : 'CREDIT')}
            </span>
          </td>
          <td style="max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${v.narration || ''}">
            ${v.narration ? v.narration.split('|')[0].trim() : 'Operational Banking Transaction'}
          </td>
          <td style="font-weight:600; color:var(--text-main);">${v.bankAccount || v.partyName || 'Primary Account'}</td>
          <td><span class="pill-badge pill-neutral">${v.paymentMode || 'NEFT'}</span></td>
          <td style="font-family:monospace; font-weight:700; color:var(--cyan);">${v.voucherNo || v.ref || '-'}</td>
          <td style="text-align:right; font-weight:700; color:${isDebit ? 'var(--red)' : 'var(--green)'};">
            ${this.formatMoney(amt)}
          </td>
          <td style="color:var(--text-muted); font-size:0.75rem;">${v.linkedRef || 'Ledger Posted'}</td>
          <td style="text-align:center;">
            <div style="display:flex; gap:4px; justify-content:center;">
              <button class="btn btn-secondary btn-sm" onclick="alert('Voucher Ref: ${v.voucherNo || v.ref || ''}')" style="padding:2px 6px; font-size:0.72rem;">📄 View</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // ==========================================
  // 2. MODAL ENTRY CREATION
  // ==========================================

  openNewBankEntryModal() {
    const d = document.getElementById('bank-date');
    if (d) d.value = new Date().toISOString().split('T')[0];
    const r = document.getElementById('bank-ref');
    if (r) r.value = 'UTR-' + Date.now().toString().slice(-6);
    const m = document.getElementById('modal-new-bank-entry');
    if (m) m.style.display = 'flex';
  },

  openNewExpenseEntryModal() {
    const d = document.getElementById('exp-date');
    if (d) d.value = new Date().toISOString().split('T')[0];
    const m = document.getElementById('modal-new-expense-entry');
    if (m) m.style.display = 'flex';
  },

  async handleBankEntrySave(e) {
    if (e) e.preventDefault();
    const bankAccount = document.getElementById('bank-acc')?.value || 'Primary Bank Account';
    const voucherType = document.getElementById('bank-type')?.value || 'RECEIPT';
    const voucherDate = document.getElementById('bank-date')?.value || new Date().toISOString().slice(0, 10);
    const amount = parseFloat(document.getElementById('bank-amount')?.value) || 0;
    const ref = document.getElementById('bank-ref')?.value?.trim() || ('UTR-' + Date.now().toString().slice(-6));
    const partyName = document.getElementById('bank-party')?.value?.trim() || '';
    const narration = document.getElementById('bank-narration')?.value?.trim() || ref;

    if (amount <= 0) { alert('Amount must be greater than zero.'); return; }

    const payload = {
      bankAccount,
      voucherType,
      voucherDate,
      amount,
      paymentMode: 'NEFT',
      voucherNo: ref,
      partyName,
      narration
    };

    try {
      await window.OperationsService.createVoucher(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Bank journal entry recorded!');
      this.closeModal('modal-new-bank-entry');
      this.loadBankMode();
    } catch (err) {
      alert('Failed to record bank entry: ' + (err.message || 'Server error'));
    }
  },

  async handleExpenseSave(e) {
    if (e) e.preventDefault();
    const voucherDate = document.getElementById('exp-date')?.value || new Date().toISOString().slice(0, 10);
    const head = document.getElementById('exp-head')?.value || 'Factory Consumables';
    const payee = document.getElementById('exp-payee')?.value?.trim() || 'Vendor Payee';
    const amount = parseFloat(document.getElementById('exp-amount')?.value) || 0;
    const paymentMode = document.getElementById('exp-mode')?.value || 'NEFT';
    const gstInv = document.getElementById('exp-gstinv')?.value?.trim() || '';

    if (amount <= 0) { alert('Expense amount must be greater than zero.'); return; }

    const payload = {
      bankAccount: paymentMode,
      voucherType: 'PAYMENT',
      voucherDate,
      amount,
      paymentMode,
      voucherNo: 'EXP-' + Date.now().toString().slice(-5),
      partyName: payee,
      narration: `${head} | ${payee} | Inv: ${gstInv || 'N/A'}`
    };

    try {
      await window.OperationsService.createVoucher(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Operating expense voucher posted to Ledger!');
      this.closeModal('modal-new-expense-entry');
      this.loadExpenseMode();
    } catch (err) {
      alert('Failed to record expense: ' + (err.message || 'Server error'));
    }
  },

  closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
  },

  // ==========================================
  // 3. STATEMENTS & AGING
  // ==========================================

  async loadFinancialStatements() {
    try {
      const [salesRes, purRes] = await Promise.all([
        window.OperationsService.getSales(0, 100),
        window.OperationsService.getPurchases(0, 100)
      ]);
      const sales = salesRes.rows || salesRes.content || (Array.isArray(salesRes) ? salesRes : []);
      const purchases = purRes.rows || purRes.content || (Array.isArray(purRes) ? purRes : []);

      let turnover = 0;
      sales.forEach(s => {
        turnover += (s.totalAmount != null ? s.totalAmount : (s.total || 0));
      });

      let procurement = 0;
      purchases.forEach(p => {
        procurement += (p.totalAmount != null ? p.totalAmount : (p.total || 0));
      });

      const netProfit = turnover - procurement;

      const toEl = document.getElementById('pnl-turnover');
      const expEl = document.getElementById('pnl-expenses');
      const npEl = document.getElementById('pnl-net-profit');

      if (toEl) toEl.innerText = this.formatMoney(turnover);
      if (expEl) expEl.innerText = this.formatMoney(procurement);
      if (npEl) {
        npEl.innerText = this.formatMoney(netProfit);
        npEl.style.color = netProfit >= 0 ? 'var(--green)' : 'var(--red)';
      }
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Financial statements computed!');
    } catch (err) {
      console.warn('Failed to compute statements: ' + err.message);
    }
  },

  async loadAgingData() {
    try {
      const salesRes = await window.OperationsService.getSales(0, 100);
      const sales = salesRes.rows || salesRes.content || (Array.isArray(salesRes) ? salesRes : []);

      let b30 = 0, b60 = 0, b90 = 0, b90plus = 0;
      const now = new Date().getTime();

      sales.forEach(s => {
        const grand = s.totalAmount != null ? s.totalAmount : (s.total || 0);
        const paid = s.paidAmount != null ? s.paidAmount : (s.paymentStatus === 'PAID' ? grand : 0);
        const balance = Math.max(0, grand - paid);
        if (balance <= 0) return;

        const date = new Date(s.invoiceDate || s.date || now).getTime();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) b30 += balance;
        else if (diffDays <= 60) b60 += balance;
        else if (diffDays <= 90) b90 += balance;
        else b90plus += balance;
      });

      const e30 = document.getElementById('aging-30');
      const e60 = document.getElementById('aging-60');
      const e90 = document.getElementById('aging-90');
      const e90p = document.getElementById('aging-90plus');

      if (e30) e30.innerText = this.formatMoney(b30);
      if (e60) e60.innerText = this.formatMoney(b60);
      if (e90) e90.innerText = this.formatMoney(b90);
      if (e90p) e90p.innerText = this.formatMoney(b90plus);

    } catch (err) {
      console.warn('Aging calculation error: ' + err.message);
    }
  }
};
