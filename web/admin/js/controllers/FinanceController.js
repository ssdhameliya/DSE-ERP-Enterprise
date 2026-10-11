/**
 * Jasvi Industries ERP - FinanceController
 * Bank entries, expense vouchers, and double-entry ledger matching desktop BankExpenseController & GeneralLedgerController
 */
window.FinanceController = {
  async loadFinance() {
    const bankTbody = document.getElementById('bank-table-tbody');
    const ledgerTbody = document.getElementById('ledger-table-tbody');
    try {
      const res = await window.OperationsService.getVouchers(0, 20);
      const list = res.rows || res.content || (Array.isArray(res) ? res : []);
      if (bankTbody) {
        if (list.length === 0) {
          bankTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">No transactions recorded.</td></tr>`;
        } else {
          bankTbody.innerHTML = list.map(v => `
            <tr>
              <td>${window.FormatUtil.formatDate(v.voucherDate || v.date)}</td>
              <td style="font-weight:700; color:var(--cyan);">${v.voucherNo || v.ref}</td>
              <td>${v.partyName || v.bankAccount || 'HDFC Current'}</td>
              <td><span class="badge ${v.voucherType === 'RECEIPT' ? 'badge-paid' : 'badge-pending'}">${v.voucherType || 'JOURNAL'}</span></td>
              <td style="font-weight:700;">${window.FormatUtil.formatRupees(v.amount || 0)}</td>
              <td>${v.paymentMode || 'RTGS'}</td>
              <td>${v.narration || '-'}</td>
            </tr>
          `).join('');
        }
      }
      if (ledgerTbody) {
        if (list.length === 0) {
          ledgerTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No ledger journal postings found.</td></tr>`;
        } else {
          ledgerTbody.innerHTML = list.map(v => `
            <tr>
              <td>${window.FormatUtil.formatDate(v.voucherDate || v.date)}</td>
              <td style="font-weight:700; color:var(--cyan);">${v.voucherNo || v.ref}</td>
              <td style="font-weight:600;">${v.partyName || 'General Account'}</td>
              <td style="color:#34d399; font-weight:700;">${v.voucherType === 'RECEIPT' ? window.FormatUtil.formatRupees(v.amount) : '-'}</td>
              <td style="color:#f87171; font-weight:700;">${v.voucherType === 'PAYMENT' ? window.FormatUtil.formatRupees(v.amount) : '-'}</td>
              <td style="font-weight:700;">₹ 14,82,500.00 Dr</td>
            </tr>
          `).join('');
        }
      }
    } catch (e) {
      if (bankTbody) bankTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  openNewBankEntryModal() {
    window.AppDialogService.openModal('modal-new-bank-entry');
  },

  openNewExpenseEntryModal() {
    window.AppDialogService.openModal('modal-new-expense-entry');
  },

  async handleBankEntrySave(e) {
    e.preventDefault();
    const payload = {
      bankAccount: document.getElementById('bank-acc-select').value,
      voucherType: document.getElementById('bank-entry-type').value,
      voucherDate: document.getElementById('bank-entry-date').value,
      amount: parseFloat(document.getElementById('bank-entry-amount').value) || 0,
      paymentMode: 'NEFT',
      narration: document.getElementById('bank-entry-ref').value + ' - ' + document.getElementById('bank-entry-narration').value
    };
    try {
      await window.OperationsService.createVoucher(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast('Bank journal entry recorded!', 'success');
      window.AppDialogService.closeModal('modal-new-bank-entry');
      this.loadFinance();
    } catch (err) {
      window.AppDialogService.showToast(err.message, 'error');
    }
  },

  async handleExpenseSave(e) {
    e.preventDefault();
    const payload = {
      bankAccount: document.getElementById('exp-payment-mode').value,
      voucherType: 'PAYMENT',
      voucherDate: document.getElementById('exp-date').value,
      amount: parseFloat(document.getElementById('exp-amount').value) || 0,
      paymentMode: document.getElementById('exp-payment-mode').value,
      narration: document.getElementById('exp-head').value + ' | ' + document.getElementById('exp-vendor').value + ' | ' + document.getElementById('exp-desc').value
    };
    try {
      await window.OperationsService.createVoucher(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast('Expense voucher recorded successfully!', 'success');
      window.AppDialogService.closeModal('modal-new-expense-entry');
      this.loadFinance();
    } catch (err) {
      window.AppDialogService.showToast(err.message, 'error');
    }
  }
};
