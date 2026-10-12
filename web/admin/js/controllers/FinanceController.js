/**
 * Jasvi Industries ERP - FinanceController
 * Bank entries, expense vouchers, general ledger, P&L statements, and accounts aging
 */
window.FinanceController = {
  vouchersCache: [],

  async loadFinance() {
    const bankTbody = document.getElementById('bank-entry-tbody') || document.getElementById('bank-table-tbody');
    const expenseTbody = document.getElementById('expense-entry-tbody');
    const ledgerTbody = document.getElementById('finance-table-tbody') || document.getElementById('ledger-table-tbody');

    try {
      const res = await window.OperationsService.getVouchers(0, 50);
      const list = res.rows || res.content || (Array.isArray(res) ? res : []);
      this.vouchersCache = list;

      // 1. Bank Entries
      if (bankTbody) {
        const bankList = list.filter(v => v.voucherType === 'RECEIPT' || v.voucherType === 'CONTRA' || (v.paymentMode && v.paymentMode.includes('BANK')));
        const displayList = bankList.length > 0 ? bankList : list;
        if (displayList.length === 0) {
          bankTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 24px;">No bank journal entries recorded.</td></tr>`;
        } else {
          bankTbody.innerHTML = displayList.map(v => {
            const isDebit = v.voucherType === 'PAYMENT';
            return `
              <tr>
                <td>${window.FormatUtil.formatDate(v.voucherDate || v.date)}</td>
                <td style="font-weight: 600;">${v.bankAccount || 'HDFC Bank Primary (50200012345678)'}</td>
                <td><span class="badge ${v.voucherType === 'RECEIPT' ? 'badge-paid' : 'badge-pending'}">${v.voucherType || 'JOURNAL'}</span></td>
                <td style="font-weight: 700; color: var(--cyan);">${v.voucherNo || v.ref || 'UTR-' + Date.now().toString().slice(-6)}</td>
                <td style="color: ${isDebit ? '#f87171' : 'var(--text-muted)'}; font-weight: 600;">${isDebit ? window.FormatUtil.formatRupees(v.amount) : '-'}</td>
                <td style="color: ${!isDebit ? '#34d399' : 'var(--text-muted)'}; font-weight: 600;">${!isDebit ? window.FormatUtil.formatRupees(v.amount) : '-'}</td>
              </tr>
            `;
          }).join('');
        }
      }

      // 2. Operating Expenses
      if (expenseTbody) {
        const expList = list.filter(v => v.voucherType === 'PAYMENT');
        if (expList.length === 0) {
          expenseTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 24px;">No expense vouchers found.</td></tr>`;
        } else {
          expenseTbody.innerHTML = expList.map(v => `
            <tr>
              <td style="font-weight: 700; color: var(--cyan);">${v.voucherNo || v.ref || 'EXP-' + Date.now().toString().slice(-4)}</td>
              <td>${window.FormatUtil.formatDate(v.voucherDate || v.date)}</td>
              <td style="font-weight: 600;">${v.narration ? v.narration.split('|')[0].trim() : 'Factory Operating Expenses'}</td>
              <td>${v.partyName || (v.narration && v.narration.split('|')[1] ? v.narration.split('|')[1].trim() : 'General Supplier')}</td>
              <td style="font-weight: 700; color: #f87171;">${window.FormatUtil.formatRupees(v.amount || 0)}</td>
              <td><span class="badge" style="background: rgba(255,255,255,0.06);">${v.paymentMode || 'NEFT'}</span></td>
            </tr>
          `).join('');
        }
      }

      // 3. Double-Entry General Ledger
      if (ledgerTbody) {
        if (list.length === 0) {
          ledgerTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 24px;">No ledger journal postings found.</td></tr>`;
        } else {
          ledgerTbody.innerHTML = list.map(v => `
            <tr>
              <td style="font-weight: 700; color: var(--cyan);">${v.voucherNo || v.ref || 'JV-001'}</td>
              <td>${window.FormatUtil.formatDate(v.voucherDate || v.date)}</td>
              <td><span class="badge ${v.voucherType === 'RECEIPT' ? 'badge-paid' : 'badge-pending'}">${v.voucherType || 'JOURNAL'}</span></td>
              <td style="font-weight: 600;">${v.partyName || v.bankAccount || 'General Account'}</td>
              <td style="font-weight: 700;">${window.FormatUtil.formatRupees(v.amount || 0)}</td>
              <td>${v.paymentMode || 'NEFT'}</td>
              <td style="color: var(--text-muted);">${v.narration || '-'}</td>
            </tr>
          `).join('');
        }
      }
    } catch (e) {
      if (bankTbody) bankTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #f87171; padding: 24px;">${e.message}</td></tr>`;
      if (ledgerTbody) ledgerTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #f87171; padding: 24px;">${e.message}</td></tr>`;
    }
  },

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

      if (toEl) toEl.innerText = window.FormatUtil.formatRupees(turnover);
      if (expEl) expEl.innerText = window.FormatUtil.formatRupees(procurement);
      if (npEl) {
        npEl.innerText = window.FormatUtil.formatRupees(netProfit);
        npEl.style.color = netProfit >= 0 ? '#34d399' : '#f87171';
      }
      window.AppDialogService.showToast('Financial statements computed successfully!', 'success');
    } catch (err) {
      window.AppDialogService.showToast('Failed to compute statements: ' + err.message, 'error');
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

        if (diffDays <= 30) {
          b30 += balance;
        } else if (diffDays <= 60) {
          b60 += balance;
        } else if (diffDays <= 90) {
          b90 += balance;
        } else {
          b90plus += balance;
        }
      });

      const e30 = document.getElementById('aging-30');
      const e60 = document.getElementById('aging-60');
      const e90 = document.getElementById('aging-90');
      const e90p = document.getElementById('aging-90plus');

      if (e30) e30.innerText = window.FormatUtil.formatRupees(b30);
      if (e60) e60.innerText = window.FormatUtil.formatRupees(b60);
      if (e90) e90.innerText = window.FormatUtil.formatRupees(b90);
      if (e90p) e90p.innerText = window.FormatUtil.formatRupees(b90plus);

      window.AppDialogService.showToast('Aging analysis buckets refreshed!', 'info');
    } catch (err) {
      window.AppDialogService.showToast('Aging calculation error: ' + err.message, 'error');
    }
  },

  openNewBankEntryModal() {
    const d = document.getElementById('bank-date');
    if (d) d.value = new Date().toISOString().split('T')[0];
    const r = document.getElementById('bank-ref');
    if (r) r.value = 'UTR-' + Date.now().toString().slice(-6);
    window.AppDialogService.openModal('modal-new-bank-entry');
  },

  openNewExpenseEntryModal() {
    const d = document.getElementById('exp-date');
    if (d) d.value = new Date().toISOString().split('T')[0];
    window.AppDialogService.openModal('modal-new-expense-entry');
  },

  async handleBankEntrySave(e) {
    e.preventDefault();
    const bankAccount = document.getElementById('bank-acc').value;
    const voucherType = document.getElementById('bank-type').value;
    const voucherDate = document.getElementById('bank-date').value;
    const amount = parseFloat(document.getElementById('bank-amount').value) || 0;
    const ref = document.getElementById('bank-ref').value.trim();
    const partyName = document.getElementById('bank-party')?.value.trim() || '';
    const narration = document.getElementById('bank-narration')?.value.trim() || ref;

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
      window.AppDialogService.showToast('Bank journal entry recorded in PostgreSQL!', 'success');
      window.AppDialogService.closeModal('modal-new-bank-entry');
      this.loadFinance();
    } catch (err) {
      window.AppDialogService.showToast('Failed to record bank entry: ' + err.message, 'error');
    }
  },

  async handleExpenseSave(e) {
    e.preventDefault();
    const voucherDate = document.getElementById('exp-date').value;
    const head = document.getElementById('exp-head').value;
    const payee = document.getElementById('exp-payee').value.trim();
    const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
    const paymentMode = document.getElementById('exp-mode').value;
    const gstInv = document.getElementById('exp-gstinv')?.value.trim() || '';

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
      window.AppDialogService.showToast('Operating expense voucher posted to Ledger!', 'success');
      window.AppDialogService.closeModal('modal-new-expense-entry');
      this.loadFinance();
    } catch (err) {
      window.AppDialogService.showToast('Failed to record expense: ' + err.message, 'error');
    }
  }
};
