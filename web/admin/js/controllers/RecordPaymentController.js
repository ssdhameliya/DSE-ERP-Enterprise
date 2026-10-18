/**
 * Jasvi Industries ERP - RecordPaymentController
 * Complete Desktop Parity matching RecordPaymentController.java & PurchasePaymentController.java
 * Handles SALE and PURCHASE payment lifecycle, proof attachments, accounting confirmation diff, and history
 */
window.RecordPaymentController = (function() {
  'use strict';

  let currentType = 'SALE'; // 'SALE' or 'PURCHASE'
  let currentInvoiceId = 0;
  let currentInvoiceNo = '';
  let currentPartyName = '';
  let invoiceTotal = 0;
  let invoicePaid = 0;
  let invoiceBalance = 0;
  let attachedProofFile = null;
  let proofRemovalPending = false;
  let paymentHistory = [];
  let editingPayment = null;

  function formatMoney(amt) {
    const n = Math.max(0, parseFloat(amt) || 0);
    return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function signedMoney(v) {
    const n = parseFloat(v) || 0;
    const sign = n < 0 ? '-' : (n > 0 ? '+' : '');
    return `${sign}₹ ${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDate(d) {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
      return d;
    }
  }

  function getStatusBadge(status, record = null) {
    if (window.FormatUtil && window.FormatUtil.renderPaymentStatusBadge) {
      return window.FormatUtil.renderPaymentStatusBadge(record || { paymentStatus: status });
    }
    const s = (status || 'UNPAID').toUpperCase();
    if (s === 'PAID' || s === 'SETTLED') return '<span class="pill-badge pill-success">PAID</span>';
    if (s === 'PARTIAL' || s === 'PARTIALLY PAID') return '<span class="pill-badge pill-warning">PARTIAL</span>';
    return '<span class="pill-badge pill-danger">PENDING</span>';
  }

  function getPaymentRowStatusBadge(p) {
    const pt = (p.paymentType || '').toUpperCase();
    if (p.reconciled || p.isReconciled || pt === 'BANK_RECONCILIATION') {
      return '<span class="pill-badge pill-neutral">Reconciled</span>';
    }
    if (pt === 'FULL') {
      return '<span class="pill-badge pill-success">Full Payment</span>';
    }
    if (pt === 'PARTIAL') {
      return '<span class="pill-badge pill-warning">Partial Payment</span>';
    }
    return '<span class="pill-badge pill-neutral">Recorded</span>';
  }

  function isBankReconciled(p) {
    if (!p) return false;
    return !!(p.reconciled || p.isReconciled || (p.paymentType || '').toUpperCase() === 'BANK_RECONCILIATION');
  }

  return {
    async open(type, invoiceId, invoiceNo, partyName, totalAmount, paidAmount, balanceAmount, extraDetails = null) {
      currentType = (type || 'SALE').toUpperCase();
      currentInvoiceId = parseInt(invoiceId) || 0;
      currentInvoiceNo = invoiceNo || '-';
      currentPartyName = partyName || (currentType === 'PURCHASE' ? 'Supplier' : 'Customer');
      invoiceTotal = parseFloat(totalAmount) || 0;
      invoicePaid = parseFloat(paidAmount) || 0;
      invoiceBalance = balanceAmount != null ? parseFloat(balanceAmount) : Math.max(0, invoiceTotal - invoicePaid);
      attachedProofFile = null;
      proofRemovalPending = false;
      editingPayment = null;
      paymentHistory = [];

      // Auto-resolve missing ID or amounts from server if missing
      if ((currentInvoiceId <= 0 || invoiceTotal <= 0) && currentInvoiceNo && currentInvoiceNo !== '-') {
        try {
          if (currentType === 'PURCHASE') {
            const p = await window.OperationsService.getPurchaseByInvoice(currentInvoiceNo);
            if (p) {
              currentInvoiceId = p.id || currentInvoiceId;
              currentPartyName = (p.supplier && p.supplier.name) || p.supplierName || currentPartyName;
              invoiceTotal = parseFloat(p.totalAmount) || invoiceTotal;
              invoicePaid = parseFloat(p.paidAmount) || invoicePaid;
              invoiceBalance = Math.max(0, invoiceTotal - invoicePaid);
              extraDetails = p;
            }
          } else {
            const s = await window.OperationsService.getSaleByInvoice(currentInvoiceNo);
            if (s) {
              currentInvoiceId = s.id || currentInvoiceId;
              currentPartyName = (s.customer && s.customer.name) || s.customerName || s.partyName || currentPartyName;
              invoiceTotal = parseFloat(s.totalAmount != null ? s.totalAmount : s.total) || invoiceTotal;
              invoicePaid = parseFloat(s.paidAmount != null ? s.paidAmount : (s.paymentStatus === 'PAID' ? invoiceTotal : 0)) || invoicePaid;
              invoiceBalance = Math.max(0, invoiceTotal - invoicePaid);
              extraDetails = s;
            }
          }
        } catch (err) {
          console.warn('[RecordPaymentController] Auto-resolve document warning:', err);
        }
      }

      // Extract details
      const invDate = (extraDetails && (extraDetails.invoiceDate || extraDetails.date)) || new Date().toISOString().split('T')[0];
      const dueDate = (extraDetails && (extraDetails.dueDate || extraDetails.paymentDueDate)) || invDate;
      const docStatus = (extraDetails && (extraDetails.documentStatus || extraDetails.status || '')).toUpperCase();
      const status = (extraDetails && extraDetails.paymentStatus) || (invoiceBalance <= 0.01 ? 'PAID' : (invoicePaid > 0 ? 'PARTIAL' : 'PENDING'));

      // Status guards matching Desktop
      if (currentType === 'SALE' && (docStatus === 'PENDING APPROVAL' || docStatus === 'REJECTED')) {
        const msg = 'Admin approval is required before recording payments.';
        if (window.AppDialogService) window.AppDialogService.toastWarning(msg);
        else alert(msg);
        return;
      }
      if (currentType === 'PURCHASE' && docStatus === 'DRAFT') {
        const msg = 'Draft purchases cannot receive ordinary payments. Post or approve the purchase first.';
        if (window.AppDialogService) window.AppDialogService.toastWarning(msg);
        else alert(msg);
        return;
      }

      // 1. Dynamic UI Theme & Labels for SALE vs PURCHASE
      const isPurchase = currentType === 'PURCHASE';
      const elPartyLabel = document.getElementById('rp-party-label');
      const elPartyName = document.getElementById('rp-party-name');
      const elLabelRef = document.getElementById('rp-label-ref');
      const elLabelFrom = document.getElementById('rp-label-from');
      const elLabelAmount = document.getElementById('rp-label-amount');
      const elHistoryPartyTh = document.getElementById('rp-history-party-th');
      const elHistoryTitle = document.getElementById('rp-history-title');
      const elFormTitle = document.getElementById('rp-form-title');

      if (elPartyLabel) elPartyLabel.innerText = isPurchase ? 'Supplier' : 'Customer';
      if (elPartyName) elPartyName.innerText = currentPartyName;
      if (elLabelRef) elLabelRef.innerText = isPurchase ? 'Reference / UTR / Cheque No.' : 'Reference No.';
      if (elLabelFrom) elLabelFrom.innerText = isPurchase ? 'Paid To *' : 'Received From *';
      if (elLabelAmount) elLabelAmount.innerText = isPurchase ? 'Amount Paid (₹) *' : 'Amount Received (₹) *';
      if (elHistoryPartyTh) elHistoryPartyTh.innerText = isPurchase ? 'Paid To' : 'Received From';
      if (elHistoryTitle) elHistoryTitle.innerText = isPurchase ? '⏱ Purchase Payment History' : '⏱ Payment History';
      if (elFormTitle) elFormTitle.innerText = isPurchase ? '💳 Record Supplier Payment' : '💳 Record New Payment';

      // 2. Populate Overview Strip
      const elInvNo = document.getElementById('rp-inv-no');
      const elInvDate = document.getElementById('rp-inv-date');
      const elDueDate = document.getElementById('rp-due-date');
      const elTopTotal = document.getElementById('rp-top-total');
      const elStatusBadge = document.getElementById('rp-status-badge');

      if (elInvNo) elInvNo.innerText = currentInvoiceNo;
      if (elInvDate) elInvDate.innerText = formatDate(invDate);
      if (elDueDate) {
        const dueInfo = window.FormatUtil ? window.FormatUtil.getDueInfo(extraDetails || { dueDate, paymentStatus: status, totalAmount: invoiceTotal, paidAmount: invoicePaid, balanceAmount: invoiceBalance }) : null;
        elDueDate.innerText = dueInfo ? `${formatDate(dueDate)} • ${dueInfo.text}` : formatDate(dueDate);
      }
      if (elTopTotal) elTopTotal.innerText = formatMoney(invoiceTotal);
      if (elStatusBadge) elStatusBadge.innerHTML = getStatusBadge(status, extraDetails || { paymentStatus: status, dueDate, totalAmount: invoiceTotal, paidAmount: invoicePaid, balanceAmount: invoiceBalance });

      // 3. Populate Summary Card
      this.updateSummaryCard();

      // 4. Load dynamic master lookups for Payment Mode and Bank Account
      await this.loadPaymentLookups();

      // 5. Populate Form Defaults
      this.resetForm();

      // 6. Reset Proof Attachment
      this.resetProof();

      // 7. Fully Paid Guard for Purchase Entry Card
      this.updatePaymentEntryAvailability();

      // 8. Dismiss any open drawers and overlays
      if (window.SalesController && typeof window.SalesController.closeInvoiceDrawer === 'function') {
        window.SalesController.closeInvoiceDrawer();
      }
      ['sales-inline-drawer', 'drawer-invoice-details', 'drawer-purchase-details-inspect', 'drawer-purchase-details', 'quote-detail-drawer', 'sr-detail-drawer', 'pr-detail-drawer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('open'); el.style.display = 'none'; }
      });
      const ov = document.getElementById('side-drawer-overlay');
      if (ov) ov.classList.remove('open');

      // 9. Navigate to workspace
      if (window.NavigationRouter && window.NavigationRouter.selectNav) {
        window.NavigationRouter.selectNav('view-record-payment');
      } else {
        document.querySelectorAll('.module-view').forEach(v => {
          v.classList.remove('active');
          v.style.display = 'none';
        });
        const v = document.getElementById('view-record-payment');
        if (v) {
          v.classList.add('active');
          v.style.display = 'block';
        }
      }

      // 10. Load Payment History from Server
      await this.refreshPayments();
    },

    updatePaymentEntryAvailability() {
      const entryCard = document.getElementById('rp-entry-card');
      const formTitle = document.getElementById('rp-form-title');
      const isPurchase = currentType === 'PURCHASE';
      const fullyPaid = isPurchase && (invoiceBalance <= 0.005);

      if (fullyPaid && editingPayment == null) {
        if (entryCard) {
          entryCard.style.opacity = '0.65';
          entryCard.querySelectorAll('input, select, textarea, button').forEach(el => {
            if (el.id !== 'rp-btn-preview-proof') el.disabled = true;
          });
        }
        if (formTitle) formTitle.innerText = 'Payment Complete • History Available';
      } else {
        if (entryCard) {
          entryCard.style.opacity = '1';
          entryCard.querySelectorAll('input, select, textarea, button').forEach(el => {
            el.disabled = false;
          });
        }
        if (formTitle) {
          formTitle.innerText = editingPayment != null
            ? (isPurchase ? 'Edit Supplier Payment' : 'Edit Payment')
            : (isPurchase ? '💳 Record Supplier Payment' : '💳 Record New Payment');
        }
      }
    },

    updateSummaryCard() {
      const elTotal = document.getElementById('rp-sum-total');
      const elPaid = document.getElementById('rp-sum-paid');
      const elBal = document.getElementById('rp-sum-balance');
      const elPct = document.getElementById('rp-progress-pct');
      const elBar = document.getElementById('rp-progress-bar');

      if (elTotal) elTotal.innerText = formatMoney(invoiceTotal);
      if (elPaid) elPaid.innerText = formatMoney(invoicePaid);
      if (elBal) elBal.innerText = formatMoney(invoiceBalance);

      const pct = invoiceTotal > 0 ? Math.min(100, Math.round((invoicePaid / invoiceTotal) * 100)) : 100;
      if (elPct) elPct.innerText = `${pct}% Paid`;
      if (elBar) {
        elBar.style.width = `${pct}%`;
        elBar.style.background = pct >= 100 ? '#34d399' : (pct > 0 ? '#fbbf24' : '#f87171');
      }
    },

    resetForm() {
      editingPayment = null;
      proofRemovalPending = false;

      const form = document.getElementById('rp-payment-form');
      if (form) form.reset();

      const elDate = document.getElementById('rp-pay-date');
      const elFrom = document.getElementById('rp-pay-from');
      const elAmount = document.getElementById('rp-pay-amount');
      const elRadioFull = document.getElementById('rp-alloc-full');
      const btnSave = document.getElementById('rp-btn-save');

      if (elDate) elDate.value = new Date().toISOString().split('T')[0];
      if (elFrom) elFrom.value = currentPartyName;
      if (elRadioFull) elRadioFull.checked = true;
      if (elAmount) elAmount.value = invoiceBalance > 0 ? invoiceBalance.toFixed(2) : '0.00';

      if (btnSave) {
        btnSave.disabled = false;
        btnSave.innerText = '💾 Save Payment';
        btnSave.classList.remove('btn-purple');
      }

      this.updatePaymentEntryAvailability();
      this.recalcBalanceAfter();
    },

    onAllocationChange(mode) {
      const elAmount = document.getElementById('rp-pay-amount');
      if (!elAmount) return;

      const allowable = invoiceBalance + (editingPayment ? (parseFloat(editingPayment.amount) || 0) : 0);
      if (mode === 'FULL') {
        elAmount.value = Math.max(0, allowable).toFixed(2);
      } else {
        if (allowable > 0 && parseFloat(elAmount.value) >= allowable) {
          elAmount.value = '';
          elAmount.focus();
        }
      }
      this.recalcBalanceAfter();
    },

    onAmountChange(val) {
      const entered = parseFloat(val) || 0;
      const allowable = invoiceBalance + (editingPayment ? (parseFloat(editingPayment.amount) || 0) : 0);
      const radioFull = document.getElementById('rp-alloc-full');
      const radioPartial = document.getElementById('rp-alloc-partial');
      if (entered >= allowable && allowable > 0) {
        if (radioFull) radioFull.checked = true;
      } else {
        if (radioPartial) radioPartial.checked = true;
      }
      this.recalcBalanceAfter();
    },

    recalcBalanceAfter() {
      const elAmount = document.getElementById('rp-pay-amount');
      const elBalAfter = document.getElementById('rp-bal-after');
      const entered = parseFloat(elAmount ? elAmount.value : 0) || 0;
      const allowable = invoiceBalance + (editingPayment ? (parseFloat(editingPayment.amount) || 0) : 0);
      const after = Math.max(0, allowable - entered);
      if (elBalAfter) {
        elBalAfter.innerText = formatMoney(after);
        elBalAfter.style.color = after === 0 ? 'var(--cyan)' : 'var(--yellow)';
      }
    },

    onProofFileSelected(input) {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) {
          const msg = 'Payment proof must be 5 MB or smaller.';
          if (window.AppDialogService) window.AppDialogService.toastError(msg);
          else alert(msg);
          input.value = '';
          return;
        }

        attachedProofFile = file;
        proofRemovalPending = false;
        const elName = document.getElementById('rp-proof-name');
        const btnPrev = document.getElementById('rp-btn-preview-proof');
        const btnRem = document.getElementById('rp-btn-remove-proof');

        if (elName) {
          elName.innerText = `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
          elName.style.color = 'var(--cyan)';
        }
        if (btnPrev) btnPrev.disabled = false;
        if (btnRem) btnRem.disabled = false;
        if (window.AppDialogService) {
          window.AppDialogService.toastInfo(`Proof attached: ${file.name}`);
        }
      }
    },

    async previewProof() {
      // 1. Locally selected new file
      if (attachedProofFile) {
        const url = URL.createObjectURL(attachedProofFile);
        window.open(url, '_blank');
        return;
      }

      // 2. Existing server file while editing
      if (editingPayment && !proofRemovalPending) {
        const proofName = editingPayment.attachment || editingPayment.proofFileName || '';
        if (proofName) {
          await this.viewHistoricalProof(editingPayment.id, proofName);
          return;
        }
      }

      const msg = 'No payment proof is attached.';
      if (window.AppDialogService) window.AppDialogService.toastWarning(msg);
      else alert(msg);
    },

    async removeProof() {
      const hasLocal = attachedProofFile != null;
      const hasExisting = editingPayment != null && !!(editingPayment.attachment || editingPayment.proofFileName) && !proofRemovalPending;

      if (!hasLocal && !hasExisting) return;

      let confirmed = false;
      if (window.AppDialogService && typeof window.AppDialogService.confirm === 'function') {
        confirmed = await window.AppDialogService.confirm('Remove Proof', 'Attachment Removal', 'Remove the payment proof?', 'Remove', 'Cancel');
      } else {
        confirmed = confirm('Remove the payment proof?');
      }
      if (!confirmed) return;

      if (hasLocal) {
        attachedProofFile = null;
        const fileInp = document.getElementById('rp-proof-file-input');
        if (fileInp) fileInp.value = '';

        if (hasExisting) {
          // Revert to existing
          const fileName = (editingPayment.attachment || editingPayment.proofFileName).split(/[\\/]/).pop();
          const elName = document.getElementById('rp-proof-name');
          if (elName) {
            elName.innerText = `Existing proof: ${fileName}`;
            elName.style.color = 'var(--cyan)';
          }
        } else {
          this.resetProof();
        }
        if (window.AppDialogService) window.AppDialogService.toastInfo('Attached local file cleared.');
      } else if (hasExisting) {
        proofRemovalPending = true;
        const elName = document.getElementById('rp-proof-name');
        if (elName) {
          elName.innerText = 'Proof will be removed when payment is updated';
          elName.style.color = 'var(--yellow)';
        }
        const btnPrev = document.getElementById('rp-btn-preview-proof');
        if (btnPrev) btnPrev.disabled = true;
        if (window.AppDialogService) window.AppDialogService.toastInfo('Proof marked for removal upon save.');
      }
    },

    resetProof() {
      attachedProofFile = null;
      proofRemovalPending = false;
      const fileInp = document.getElementById('rp-proof-file-input');
      if (fileInp) fileInp.value = '';

      const elName = document.getElementById('rp-proof-name');
      const btnPrev = document.getElementById('rp-btn-preview-proof');
      const btnRem = document.getElementById('rp-btn-remove-proof');
      if (elName) {
        elName.innerText = 'No file attached';
        elName.style.color = 'var(--text-dim)';
      }
      if (btnPrev) btnPrev.disabled = true;
      if (btnRem) btnRem.disabled = true;
    },

    onPaymentModeChange(val) {
      const mode = (val || '').toLowerCase();
      const bankSelect = document.getElementById('rp-bank-account');
      if (bankSelect) {
        const isBankMode = mode.includes('bank') || mode.includes('neft') || mode.includes('rtgs') || mode.includes('imps');
        bankSelect.disabled = !isBankMode;
        bankSelect.style.opacity = isBankMode ? '1' : '0.45';
        bankSelect.style.pointerEvents = isBankMode ? 'auto' : 'none';
      }
    },

    toggleHistoryMenu(id, event) {
      if (event) event.stopPropagation();
      const menuId = 'rp-history-menu-' + id;
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
          const menuWidth = 200;
          let left = rect.right - menuWidth;
          if (left < 10) left = 10;
          let top = rect.bottom + 4;
          if (top + 160 > window.innerHeight) {
            top = rect.top - 160;
          }
          targetMenu.style.left = left + 'px';
          targetMenu.style.top = top + 'px';

          const closeHandler = () => {
            targetMenu.style.display = 'none';
            document.removeEventListener('click', closeHandler);
          };
          setTimeout(() => document.addEventListener('click', closeHandler), 10);
        }
      }
    },

    async loadPaymentLookups() {
      const modeSelect = document.getElementById('rp-pay-mode');
      const bankSelect = document.getElementById('rp-bank-account');

      try {
        let modeList = [];
        if (window.MasterService && window.MasterService.getLookupsByCategoryCode) {
          const res = await window.MasterService.getLookupsByCategoryCode('PAYMENT_MODE').catch(() => []);
          if (Array.isArray(res)) {
            modeList = res.filter(l => l.active !== false && l.lookupValue).map(l => l.lookupValue.trim());
          }
        }
        if (modeList.length === 0) {
          modeList = ['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'Card', 'Other'];
        }
        if (modeSelect) {
          modeSelect.innerHTML = modeList.map(m => `<option value="${m}" ${m === 'Bank Transfer' ? 'selected' : ''}>${m}</option>`).join('');
          modeSelect.onchange = (e) => this.onPaymentModeChange(e.target.value);
        }

        let accountList = [];
        if (window.MasterService && window.MasterService.getLookupsByCategoryCode) {
          const res = await window.MasterService.getLookupsByCategoryCode('BANK_ACCOUNT').catch(() => []);
          if (Array.isArray(res)) {
            res.forEach(l => {
              if (l.active !== false && l.lookupValue) {
                const desc = l.description ? l.description.trim() : '';
                accountList.push(desc ? `${l.lookupValue.trim()} - ${desc}` : l.lookupValue.trim());
              }
            });
          }
        }
        if (bankSelect) {
          if (accountList.length === 0) {
            bankSelect.innerHTML = '<option value="">No bank accounts configured in Master Data</option>';
          } else {
            bankSelect.innerHTML = accountList.map((a, i) => `<option value="${a}" ${i === 0 ? 'selected' : ''}>${a}</option>`).join('');
          }
        }

        this.onPaymentModeChange(modeSelect ? modeSelect.value : '');
      } catch (err) {
        console.warn('[RecordPaymentController] Failed to load payment lookups:', err);
      }
    },

    async refreshPayments() {
      const tbody = document.getElementById('rp-history-tbody');
      const badge = document.getElementById('rp-history-badge');
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-dim);">Loading payment history...</td></tr>`;

      try {
        const rows = await window.ApiService.get(`/api/support/payments?type=${encodeURIComponent(currentType)}&id=${encodeURIComponent(currentInvoiceId)}`);
        paymentHistory = Array.isArray(rows) ? rows : [];

        // Update badge: "1 Payment" vs "X Payments" matching Desktop
        if (badge) {
          badge.innerText = `${paymentHistory.length} Payment${paymentHistory.length === 1 ? '' : 's'}`;
        }

        // Recalculate totals
        let sumPaid = 0;
        paymentHistory.forEach(p => {
          sumPaid += parseFloat(p.amount) || 0;
        });
        invoicePaid = sumPaid;
        invoiceBalance = Math.max(0, invoiceTotal - invoicePaid);

        this.updateSummaryCard();
        this.updatePaymentEntryAvailability();

        const elStatusBadge = document.getElementById('rp-status-badge');
        if (elStatusBadge) {
          const s = invoiceBalance <= 0.01 ? 'PAID' : (invoicePaid > 0 ? 'PARTIAL' : 'PENDING');
          elStatusBadge.innerHTML = getStatusBadge(s);
        }

        this.renderHistoryTable();
      } catch (err) {
        console.error('[RecordPaymentController] Failed to load payment history:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--red);">Failed to load payment history: ${err.message}</td></tr>`;
      }
    },

    renderHistoryTable() {
      const tbody = document.getElementById('rp-history-tbody');
      if (!tbody) return;

      if (!paymentHistory || paymentHistory.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; color: var(--text-dim); padding: 36px; font-size: 0.84rem;">
              No payment records
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = paymentHistory.map((p, idx) => {
        const amt = parseFloat(p.amount) || 0;
        const proof = (p.attachment || p.proofFileName || '').trim();
        const proofName = proof.split(/[\\/]/).pop();
        const hasProof = !!proofName;
        const isReconciled = isBankReconciled(p);
        const pId = p.id || idx;
        const party = p.receivedFrom || p.paidTo || currentPartyName;

        return `
          <tr>
            <td><span class="pill-badge pill-neutral">${p.mode || 'Bank Transfer'}</span></td>
            <td style="font-family: 'Space Grotesk', monospace; color: var(--cyan);">${p.reference || '-'}</td>
            <td style="font-weight: 600; color: var(--text-main);">${party}</td>
            <td style="text-align: right; font-weight: 700; color: #34d399;">${formatMoney(amt)}</td>
            <td>${getPaymentRowStatusBadge(p)}</td>
            <td style="color: var(--text-muted); font-size: 0.74rem; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(p.notes || '').replace(/"/g, '&quot;')}">${p.notes || '-'}</td>
            <td style="text-align: center;" onclick="event.stopPropagation();">
              <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
                <button type="button" class="btn-purple" onclick="window.RecordPaymentController.toggleHistoryMenu('${pId}', event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" title="Payment Actions">
                  ::: Actions ▾
                </button>
                <div id="rp-history-menu-${pId}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:200px; padding:6px 0; text-align:left;">
                  <div class="action-menu-item" style="${isReconciled ? 'opacity:0.4; cursor:not-allowed;' : 'cursor:pointer;'}" onclick="${isReconciled ? '' : `window.RecordPaymentController.startEditPayment(${p.id})`}"><span style="margin-right:8px;">✏️</span> Edit Payment</div>
                  <div class="action-menu-item" style="${!hasProof ? 'opacity:0.4; cursor:not-allowed;' : 'cursor:pointer;'}" onclick="${!hasProof ? '' : `window.RecordPaymentController.viewHistoricalProof(${p.id}, '${proofName}')`}"><span style="margin-right:8px;">📎</span> View Proof</div>
                  <div class="action-menu-item" style="color:var(--red); ${(!hasProof || isReconciled) ? 'opacity:0.4; cursor:not-allowed;' : 'cursor:pointer;'}" onclick="${(!hasProof || isReconciled) ? '' : `window.RecordPaymentController.removeHistoricalProof(${p.id})`}"><span style="margin-right:8px;">🗑️</span> Remove Proof</div>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    async viewHistoricalProof(paymentId, fileName) {
      if (!paymentId) return;
      try {
        if (window.AppDialogService) window.AppDialogService.toastInfo('Loading payment proof document...');
        const token = localStorage.getItem('dse_access_token');
        const url = `/api/support/payments/${paymentId}/attachment-file`;
        const res = await fetch(url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!res.ok) {
          throw new Error(`Download failed with server status ${res.status}`);
        }

        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const safeName = fileName || `payment_proof_${paymentId}.pdf`;

        // If PDF or image, open in new tab
        const ext = safeName.toLowerCase();
        if (ext.endsWith('.pdf') || ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
          window.open(blobUrl, '_blank');
        } else {
          // Direct download trigger
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = safeName;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } catch (err) {
        console.error('[RecordPaymentController] View proof error:', err);
        const msg = 'Could not download proof: ' + (err.message || 'File not found');
        if (window.AppDialogService) window.AppDialogService.toastError(msg);
        else alert(msg);
      }
    },

    startEditPayment(paymentId) {
      const p = paymentHistory.find(x => x.id === paymentId);
      if (!p) return;

      if (isBankReconciled(p)) {
        const msg = 'Bank-reconciled payments must be changed from Bank Statement using the reversal/reconciliation workflow.';
        if (window.AppDialogService) window.AppDialogService.toastWarning(msg);
        else alert(msg);
        return;
      }

      editingPayment = p;
      proofRemovalPending = false;
      attachedProofFile = null;

      // Ensure form entry card is enabled
      const entryCard = document.getElementById('rp-entry-card');
      if (entryCard) {
        entryCard.style.opacity = '1';
        entryCard.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = false);
      }

      const elDate = document.getElementById('rp-pay-date');
      const elMode = document.getElementById('rp-pay-mode');
      const elRef = document.getElementById('rp-pay-ref');
      const elFrom = document.getElementById('rp-pay-from');
      const elBank = document.getElementById('rp-bank-account');
      const elAmount = document.getElementById('rp-pay-amount');
      const elNotes = document.getElementById('rp-pay-notes');
      const btnSave = document.getElementById('rp-btn-save');
      const formTitle = document.getElementById('rp-form-title');

      if (elDate) elDate.value = (p.date || '').slice(0, 10);
      if (elMode) {
        elMode.value = p.mode || 'Bank Transfer';
        this.onPaymentModeChange(elMode.value);
      }
      if (elRef) elRef.value = p.reference || '';
      if (elFrom) elFrom.value = p.receivedFrom || p.paidTo || currentPartyName;
      if (elAmount) elAmount.value = (parseFloat(p.amount) || 0).toFixed(2);

      // Parse bank account from notes if Purchase
      let userNote = p.notes || '';
      if (currentType === 'PURCHASE' && userNote.startsWith('Bank Account: ')) {
        const rest = userNote.substring('Bank Account: '.length);
        const split = rest.indexOf(' | ');
        const acct = split < 0 ? rest.trim() : rest.substring(0, split).trim();
        userNote = split < 0 ? '' : rest.substring(split + 3).trim();
        if (elBank && acct) {
          elBank.value = acct;
        }
      }
      if (elNotes) elNotes.value = userNote;

      if ((p.paymentType || '').toUpperCase() === 'FULL') {
        const rFull = document.getElementById('rp-alloc-full');
        if (rFull) rFull.checked = true;
      } else {
        const rPart = document.getElementById('rp-alloc-partial');
        if (rPart) rPart.checked = true;
      }

      if (btnSave) {
        btnSave.innerText = '✏️ Update Payment';
        btnSave.classList.add('btn-purple');
      }

      if (formTitle) {
        formTitle.innerText = currentType === 'PURCHASE' ? 'Edit Supplier Payment' : 'Edit Payment';
      }

      // Synchronize Right Panel Proof Card
      const proof = (p.attachment || p.proofFileName || '').trim();
      const fileName = proof.split(/[\\/]/).pop();
      const elName = document.getElementById('rp-proof-name');
      const btnPrev = document.getElementById('rp-btn-preview-proof');
      const btnRem = document.getElementById('rp-btn-remove-proof');

      if (fileName) {
        if (elName) {
          elName.innerText = `Existing proof: ${fileName}`;
          elName.style.color = 'var(--cyan)';
        }
        if (btnPrev) btnPrev.disabled = false;
        if (btnRem) btnRem.disabled = false;
      } else {
        if (elName) {
          elName.innerText = 'No proof attached';
          elName.style.color = 'var(--text-dim)';
        }
        if (btnPrev) btnPrev.disabled = true;
        if (btnRem) btnRem.disabled = true;
      }

      this.recalcBalanceAfter();
      if (elAmount) {
        elAmount.focus();
        elAmount.select();
      }

      if (window.AppDialogService) {
        window.AppDialogService.toastInfo(`Editing payment #${p.reference || p.id}. Make changes and click "Update Payment".`);
      }
    },

    async removeHistoricalProof(paymentId) {
      if (!paymentId) return;

      let confirmed = false;
      if (window.AppDialogService && typeof window.AppDialogService.confirm === 'function') {
        confirmed = await window.AppDialogService.confirm('Remove Proof', 'Delete Attachment', 'Remove this payment proof?', 'Remove Proof', 'Cancel');
      } else {
        confirmed = confirm('Remove this payment proof?');
      }
      if (!confirmed) return;

      try {
        // Desktop SupportController: DELETE /api/support/payments/{paymentId}/attachment-file
        await window.ApiService.delete(`/api/support/payments/${paymentId}/attachment-file`);

        if (window.AppDialogService) window.AppDialogService.toastSuccess('Payment proof removed.');

        if (editingPayment && editingPayment.id === paymentId) {
          editingPayment.attachment = null;
          this.resetProof();
        }

        await this.refreshPayments();
      } catch (err) {
        console.error('[RecordPaymentController] Remove proof failed:', err);
        const msg = 'Failed to remove proof: ' + (err.message || 'Server error');
        if (window.AppDialogService) window.AppDialogService.toastError(msg);
        else alert(msg);
      }
    },

    async savePayment(e) {
      if (e) {
        try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
      }

      const btnSave = document.getElementById('rp-btn-save');
      try {
        const elAmount = document.getElementById('rp-pay-amount');
        const amount = Math.round((parseFloat(elAmount ? elAmount.value : 0) || 0) * 100) / 100;
        if (amount <= 0) {
          const msg = 'Received amount must be greater than zero.';
          if (window.AppDialogService) window.AppDialogService.toastError(msg);
          else alert(msg);
          if (elAmount) elAmount.focus();
          return;
        }

        const allowable = invoiceBalance + (editingPayment ? (parseFloat(editingPayment.amount) || 0) : 0);
        if (amount > allowable + 0.005) {
          const msg = `Enter an amount up to ${formatMoney(allowable)}.`;
          if (window.AppDialogService) window.AppDialogService.toastError(msg);
          else alert(msg);
          if (elAmount) elAmount.focus();
          return;
        }

        const date = document.getElementById('rp-pay-date')?.value || new Date().toISOString().split('T')[0];
        const mode = document.getElementById('rp-pay-mode')?.value || 'Bank Transfer';
        const ref = document.getElementById('rp-pay-ref')?.value?.trim() || '';
        const from = document.getElementById('rp-pay-from')?.value?.trim() || currentPartyName;
        const bank = document.getElementById('rp-bank-account')?.value?.trim() || '';
        let userNotes = document.getElementById('rp-pay-notes')?.value?.trim() || '';

        if (!from) {
          const msg = currentType === 'PURCHASE' ? 'Enter who was paid.' : 'Enter who made the payment.';
          if (window.AppDialogService) window.AppDialogService.toastError(msg);
          else alert(msg);
          return;
        }

        const isBankMode = mode.toLowerCase().includes('bank') || mode.toLowerCase().includes('neft') || mode.toLowerCase().includes('rtgs');
        if (isBankMode && !bank) {
          const msg = 'Select or configure a bank account.';
          if (window.AppDialogService) window.AppDialogService.toastError(msg);
          else alert(msg);
          return;
        }

        // Purchase notes encoding matching Desktop PurchasePaymentController: "Bank Account: <acct> | <notes>"
        let persistedNotes = userNotes;
        if (currentType === 'PURCHASE' && isBankMode && bank) {
          persistedNotes = userNotes ? `Bank Account: ${bank} | ${userNotes}` : `Bank Account: ${bank}`;
        }

        // ==========================================
        // BRANCH 1: EDIT PAYMENT (ACCOUNTING CONFIRMATION)
        // ==========================================
        if (editingPayment != null) {
          const oldAmt = parseFloat(editingPayment.amount) || 0;
          const newAmt = amount;
          const diff = Math.round((newAmt - oldAmt) * 100) / 100;

          const confirmMsg = `ACCOUNTING CONFIRMATION\n\n` +
            `Old Amount: ${formatMoney(oldAmt)}\n` +
            `New Amount: ${formatMoney(newAmt)}\n` +
            `Difference: ${signedMoney(diff)}\n\n` +
            `This changes the invoice balance and payment status.\n\nContinue?`;

          let confirmed = false;
          if (window.AppDialogService && typeof window.AppDialogService.confirm === 'function') {
            confirmed = await window.AppDialogService.confirm('ACCOUNTING CONFIRMATION', 'Review Ledger Adjustments', confirmMsg, 'Yes / Continue', 'No / Cancel');
          } else {
            confirmed = confirm(confirmMsg);
          }
          if (!confirmed) return;

          if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerText = 'Updating...';
          }

          const updatePayload = {
            date: date,
            amount: newAmt,
            mode: mode,
            reference: ref,
            notes: persistedNotes,
            receivedFrom: from,
            expectedRowVersion: editingPayment.rowVersion != null ? editingPayment.rowVersion : 0
          };

          const pId = editingPayment.id;
          await window.ApiService.put(`/api/support/payments/${pId}`, updatePayload);

          // Handle Attachment update
          if (proofRemovalPending) {
            try {
              await window.ApiService.delete(`/api/support/payments/${pId}/attachment-file`);
            } catch (delErr) {
              console.warn('[RecordPaymentController] Proof removal warning:', delErr);
            }
          } else if (attachedProofFile) {
            try {
              await window.ApiService.uploadBinary(`/api/support/payments/${pId}/attachment-file`, attachedProofFile.name, attachedProofFile);
            } catch (upErr) {
              console.warn('[RecordPaymentController] Proof upload warning:', upErr);
            }
          }

          if (window.AppDialogService) {
            window.AppDialogService.toastSuccess('Payment updated and invoice totals recalculated.');
          }

          this.resetForm();
          this.resetProof();
          await this.refreshPayments();
          return;
        }

        // ==========================================
        // BRANCH 2: RECORD NEW PAYMENT
        // ==========================================
        const remainingAfter = Math.max(0, Math.round((invoiceBalance - amount) * 100) / 100);
        const paymentType = remainingAfter <= 0.005 ? 'FULL' : 'PARTIAL';
        let currentUser = 'Admin';
        try {
          if (window.AuthService && typeof window.AuthService.getCurrentUsername === 'function') {
            currentUser = window.AuthService.getCurrentUsername() || 'Admin';
          }
        } catch (_) {}

        const newPayload = {
          documentType: currentType,
          documentId: currentInvoiceId,
          date: date,
          amount: amount,
          mode: mode,
          reference: ref || ('TXN-' + Math.floor(100000 + Math.random() * 900000)),
          notes: persistedNotes || `Payment recorded for ${currentInvoiceNo}`,
          receivedFrom: from,
          paymentType: paymentType,
          attachment: attachedProofFile ? attachedProofFile.name : null,
          createdBy: currentUser
        };

        if (btnSave) {
          btnSave.disabled = true;
          btnSave.innerText = 'Saving...';
        }

        let paymentId = null;
        try {
          const res = await window.ApiService.post('/api/support/payments/with-id', newPayload);
          paymentId = res && (res.id != null ? res.id : res.paymentId);
        } catch (postErr) {
          console.warn('[RecordPaymentController] POST /api/support/payments/with-id fallback:', postErr);
          await window.ApiService.post('/api/support/payments', newPayload);
        }

        // Binary proof upload matching Desktop SupportApiClient
        if (attachedProofFile && paymentId) {
          try {
            await window.ApiService.uploadBinary(`/api/support/payments/${paymentId}/attachment-file`, attachedProofFile.name, attachedProofFile);
          } catch (proofErr) {
            console.warn('[RecordPaymentController] Binary proof upload warning:', proofErr);
            if (window.AppDialogService) {
              window.AppDialogService.toastWarning('Payment saved, but receipt attachment upload failed: ' + proofErr.message);
            }
          }
        }

        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();

        if (window.NotificationService) {
          window.NotificationService.notifyPayment(newPayload.reference || currentInvoiceNo, from, amount);
        }

        if (window.AppDialogService) {
          window.AppDialogService.toastSuccess(`Payment of ${formatMoney(amount)} saved successfully.`);
        }

        this.resetForm();
        this.resetProof();
        await this.refreshPayments();

        // Refresh background register caches
        try {
          if (currentType === 'SALE' && window.SalesController && typeof window.SalesController.loadSales === 'function') {
            window.SalesController.loadSales(0);
          } else if (currentType === 'PURCHASE' && window.PurchaseController && typeof window.PurchaseController.loadPurchases === 'function') {
            window.PurchaseController.loadPurchases(0);
          }
        } catch (_) {}

      } catch (err) {
        console.error('[RecordPaymentController] Failed to save payment:', err);
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.innerText = editingPayment ? '✏️ Update Payment' : '💾 Save Payment';
        }
        const msg = 'Failed to save payment: ' + (err.message || 'Validation error');
        if (window.AppDialogService) window.AppDialogService.toastError(msg);
        else alert(msg);
      }
    },

    backToRegister() {
      if (currentType === 'PURCHASE') {
        window.NavigationRouter.selectNav('view-purchase-register');
      } else {
        window.NavigationRouter.selectNav('view-sales-register');
      }
    },

    emailInvoicePrompt() {
      if (window.CommunicationController && window.CommunicationController.openSendModal) {
        window.CommunicationController.openSendModal('EMAIL', currentPartyName, '', `Payment Receipt & Invoice ${currentInvoiceNo}`);
      } else {
        alert(`Emailing invoice ${currentInvoiceNo} to ${currentPartyName}...`);
      }
    },

    printReceipt() {
      window.print();
    }
  };
})();

// Global alias for compatibility
window.openInvoicePaymentDetails = function(type, id, invoiceNo, partyName, total, paid, balance, extraDetails) {
  if (window.RecordPaymentController) {
    window.RecordPaymentController.open(type, id, invoiceNo, partyName, total, paid, balance, extraDetails);
  }
};
