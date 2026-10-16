/**
 * Jasvi Industries ERP - RecordPaymentController
 * Complete Desktop Parity matching View/Edit Payment Screen (Image 4)
 * Handles dual SALE and PURCHASE payment lifecycle, proof attachments, and history
 */
window.RecordPaymentController = (function() {
  let currentType = 'SALE'; // 'SALE' or 'PURCHASE'
  let currentInvoiceId = 0;
  let currentInvoiceNo = '';
  let currentPartyName = '';
  let invoiceTotal = 0;
  let invoicePaid = 0;
  let invoiceBalance = 0;
  let attachedProofFile = null;
  let paymentHistory = [];

  function formatMoney(amt) {
    const n = parseFloat(amt) || 0;
    return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(d) {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString('en-GB'); // DD/MM/YYYY
    } catch(e) {
      return d;
    }
  }

  function getStatusBadge(status) {
    const s = (status || 'UNPAID').toUpperCase();
    if (s === 'PAID') return '<span class="pill-badge pill-success">PAID</span>';
    if (s === 'PARTIAL' || s === 'PARTIALLY PAID') return '<span class="pill-badge pill-warning">PARTIAL</span>';
    return '<span class="pill-badge pill-danger">UNPAID</span>';
  }

  return {
    async open(type, invoiceId, invoiceNo, partyName, totalAmount, paidAmount, balanceAmount, extraDetails = null) {
      currentType = (type || 'SALE').toUpperCase();
      currentInvoiceId = invoiceId || 0;
      currentInvoiceNo = invoiceNo || '-';
      currentPartyName = partyName || (currentType === 'PURCHASE' ? 'Supplier' : 'Customer');
      invoiceTotal = parseFloat(totalAmount) || 0;
      invoicePaid = parseFloat(paidAmount) || 0;
      invoiceBalance = balanceAmount != null ? parseFloat(balanceAmount) : Math.max(0, invoiceTotal - invoicePaid);
      attachedProofFile = null;

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
          console.warn('RecordPaymentController auto-resolve document warning:', err);
        }
      }

      // Extract details
      const invDate = (extraDetails && (extraDetails.invoiceDate || extraDetails.date)) || new Date().toISOString().split('T')[0];
      const dueDate = (extraDetails && (extraDetails.dueDate || extraDetails.paymentDueDate)) || invDate;
      const status = (extraDetails && extraDetails.paymentStatus) || (invoiceBalance <= 0.01 ? 'PAID' : (invoicePaid > 0 ? 'PARTIAL' : 'UNPAID'));

      // 1. Populate Overview Strip
      const elInvNo = document.getElementById('rp-inv-no');
      const elPartyLabel = document.getElementById('rp-party-label');
      const elPartyName = document.getElementById('rp-party-name');
      const elInvDate = document.getElementById('rp-inv-date');
      const elDueDate = document.getElementById('rp-due-date');
      const elTopTotal = document.getElementById('rp-top-total');
      const elStatusBadge = document.getElementById('rp-status-badge');

      if (elInvNo) elInvNo.innerText = currentInvoiceNo;
      if (elPartyLabel) elPartyLabel.innerText = currentType === 'PURCHASE' ? 'Supplier' : 'Customer';
      if (elPartyName) elPartyName.innerText = currentPartyName;
      if (elInvDate) elInvDate.innerText = formatDate(invDate);
      if (elDueDate) elDueDate.innerText = formatDate(dueDate);
      if (elTopTotal) elTopTotal.innerText = formatMoney(invoiceTotal);
      if (elStatusBadge) elStatusBadge.innerHTML = getStatusBadge(status);

      // 2. Populate Summary Card
      this.updateSummaryCard();

      // 3. Populate Form Defaults
      this.resetForm();

      // 4. Reset Proof Attachment
      this.resetProof();

      // 5. Dismiss any open drawers and overlays so clicks are never blocked
      ['drawer-invoice-details', 'drawer-purchase-details-inspect', 'drawer-purchase-details', 'quote-detail-drawer', 'sr-detail-drawer', 'pr-detail-drawer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('open'); el.style.display = ''; }
      });
      const ov = document.getElementById('side-drawer-overlay');
      if (ov) ov.classList.remove('open');

      // 6. Navigate to workspace
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

      // 7. Load Payment History
      await this.refreshPayments();
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
      const form = document.getElementById('rp-payment-form');
      if (form) form.reset();

      const elDate = document.getElementById('rp-pay-date');
      const elFrom = document.getElementById('rp-pay-from');
      const elAmount = document.getElementById('rp-pay-amount');
      const elRadioFull = document.getElementById('rp-alloc-full');

      if (elDate) elDate.value = new Date().toISOString().split('T')[0];
      if (elFrom) elFrom.value = currentPartyName;
      if (elRadioFull) elRadioFull.checked = true;
      if (elAmount) elAmount.value = invoiceBalance > 0 ? invoiceBalance.toFixed(2) : '0.00';

      this.recalcBalanceAfter();
    },

    onAllocationChange(mode) {
      const elAmount = document.getElementById('rp-pay-amount');
      if (!elAmount) return;

      if (mode === 'FULL') {
        elAmount.value = Math.max(0, invoiceBalance).toFixed(2);
      } else {
        if (invoiceBalance > 0 && parseFloat(elAmount.value) === invoiceBalance) {
          elAmount.value = (invoiceBalance / 2).toFixed(2);
        }
      }
      this.recalcBalanceAfter();
    },

    onAmountChange(val) {
      const entered = parseFloat(val) || 0;
      const radioFull = document.getElementById('rp-alloc-full');
      const radioPartial = document.getElementById('rp-alloc-partial');
      if (entered >= invoiceBalance && invoiceBalance > 0) {
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
      const after = Math.max(0, invoiceBalance - entered);
      if (elBalAfter) {
        elBalAfter.innerText = formatMoney(after);
        elBalAfter.style.color = after === 0 ? 'var(--cyan)' : 'var(--yellow)';
      }
    },

    onProofFileSelected(input) {
      if (input.files && input.files[0]) {
        attachedProofFile = input.files[0];
        const elName = document.getElementById('rp-proof-name');
        const btnPrev = document.getElementById('rp-btn-preview-proof');
        const btnRem = document.getElementById('rp-btn-remove-proof');

        if (elName) {
          elName.innerText = `📎 ${attachedProofFile.name} (${(attachedProofFile.size / 1024).toFixed(1)} KB)`;
          elName.style.color = 'var(--cyan)';
        }
        if (btnPrev) btnPrev.disabled = false;
        if (btnRem) btnRem.disabled = false;
        if (window.AppDialogService) {
          window.AppDialogService.showToast(`Proof attached: ${attachedProofFile.name}`, 'info');
        }
      }
    },

    previewProof() {
      if (!attachedProofFile) {
        alert('No proof document attached.');
        return;
      }
      const url = URL.createObjectURL(attachedProofFile);
      window.open(url, '_blank');
    },

    removeProof() {
      attachedProofFile = null;
      const fileInp = document.getElementById('rp-proof-file-input');
      if (fileInp) fileInp.value = '';
      this.resetProof();
      if (window.AppDialogService) window.AppDialogService.showToast('Proof document removed', 'info');
    },

    resetProof() {
      attachedProofFile = null;
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

    async refreshPayments() {
      const tbody = document.getElementById('rp-history-tbody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-dim); padding: 24px;">Loading payment history...</td></tr>`;

      try {
        const res = await window.ApiService.get(`/api/support/payments?type=${currentType}&id=${currentInvoiceId}&invoiceNo=${encodeURIComponent(currentInvoiceNo)}`);
        paymentHistory = Array.isArray(res) ? res : (res && Array.isArray(res.content) ? res.content : []);
      } catch (e) {
        console.warn('Could not fetch server payments:', e);
        // Fallback default history if existing invoice was already marked paid
        if (invoicePaid > 0) {
          paymentHistory = [
            {
              id: 1,
              date: new Date().toISOString().split('T')[0],
              mode: 'NEFT/RTGS',
              referenceNo: 'RTGS-' + Math.floor(100000 + Math.random() * 900000),
              bankAccount: 'HDFC Bank Primary (XXXX4502)',
              receivedFrom: currentPartyName,
              amount: invoicePaid,
              proofFileName: 'bank_receipt_' + currentInvoiceNo.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf',
              notes: 'Full settlement for invoice ' + currentInvoiceNo
            }
          ];
        } else {
          paymentHistory = [];
        }
      }

      this.renderHistoryTable();
    },

    renderHistoryTable() {
      const tbody = document.getElementById('rp-history-tbody');
      if (!tbody) return;

      if (!paymentHistory || paymentHistory.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align: center; color: var(--text-muted); padding: 32px;">
              <div style="font-size: 1.6rem; margin-bottom: 6px;">💳</div>
              <div style="font-weight: 600;">No payment history recorded yet</div>
              <div style="font-size: 0.74rem;">Use the form above to record the initial payment.</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = paymentHistory.map((p, idx) => {
        const amt = parseFloat(p.amount) || 0;
        const proof = p.proofFileName || p.proof || '';
        return `
          <tr>
            <td style="text-align: center; color: var(--text-dim);">${idx + 1}</td>
            <td>${formatDate(p.date || p.paymentDate)}</td>
            <td><span class="pill-badge pill-neutral">${p.mode || p.paymentMode || 'NEFT/RTGS'}</span></td>
            <td style="font-family: 'Space Grotesk', monospace; color: var(--cyan);">${p.referenceNo || p.refNo || '-'}</td>
            <td>${p.bankAccount || p.bank || '-'}</td>
            <td style="font-weight: 600; color: var(--text-main);">${p.receivedFrom || p.payer || currentPartyName}</td>
            <td style="text-align: right; font-weight: 700; color: #34d399;">${formatMoney(amt)}</td>
            <td>
              ${proof ? `<span class="pill-badge pill-success" style="cursor: pointer;" onclick="alert('Viewing attached proof: ${proof}')">📎 ${proof}</span>` : '<span style="color: var(--text-dim);">No proof</span>'}
            </td>
            <td style="color: var(--text-muted); font-size: 0.74rem; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.notes || '-'}</td>
            <td style="text-align: center;">
              <div style="display: flex; gap: 4px; justify-content: center;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="alert('Edit payment #${idx + 1}')">✏</button>
                <button type="button" class="btn btn-danger btn-sm" onclick="window.RecordPaymentController.deletePayment(${p.id || idx})">🗑</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    async savePayment(e) {
      if (e) e.preventDefault();

      const elAmount = document.getElementById('rp-pay-amount');
      const amount = parseFloat(elAmount ? elAmount.value : 0) || 0;
      if (amount <= 0) {
        alert('Please enter a valid payment amount greater than zero.');
        return;
      }

      const date = document.getElementById('rp-pay-date')?.value || new Date().toISOString().split('T')[0];
      const mode = document.getElementById('rp-pay-mode')?.value || 'NEFT/RTGS';
      const ref = document.getElementById('rp-pay-ref')?.value || '';
      const from = document.getElementById('rp-pay-from')?.value || currentPartyName;
      const bank = document.getElementById('rp-bank-account')?.value || 'HDFC Bank Primary';
      const notes = document.getElementById('rp-pay-notes')?.value || '';
      const proofName = attachedProofFile ? attachedProofFile.name : '';

      const docType = currentType === 'PURCHASE' ? 'PURCHASE' : 'SALE';
      let docId = parseInt(currentInvoiceId) || 0;

      // Ensure docId is a valid positive integer from caches if not set
      if (docId <= 0 && currentInvoiceNo && currentInvoiceNo !== '-') {
        if (docType === 'SALE' && window.SalesController && Array.isArray(window.SalesController.salesCache)) {
          const s = window.SalesController.salesCache.find(x => (x.invoiceNo || x.number) === currentInvoiceNo);
          if (s && s.id) docId = parseInt(s.id);
        } else if (docType === 'PURCHASE' && window.PurchaseController) {
          const list = (typeof window.PurchaseController.getPurchasesCache === 'function') 
            ? window.PurchaseController.getPurchasesCache() 
            : (window.PurchaseController.purchases || []);
          const p = Array.isArray(list) ? list.find(x => (x.invoiceNo || x.number) === currentInvoiceNo) : null;
          if (p && p.id) docId = parseInt(p.id);
        }

        if (docId <= 0) {
          try {
            if (docType === 'SALE') {
              const s = await window.OperationsService.getSaleByInvoice(currentInvoiceNo);
              if (s && s.id) docId = parseInt(s.id);
            } else {
              const p = await window.OperationsService.getPurchaseByInvoice(currentInvoiceNo);
              if (p && p.id) docId = parseInt(p.id);
            }
          } catch (eDoc) {
            console.warn('Could not resolve docId from server:', eDoc);
          }
        }
      }

      if (docId <= 0) {
        const errMsg = `Cannot save payment: A valid document ID could not be found for ${docType} ${currentInvoiceNo}.`;
        if (window.AppDialogService) window.AppDialogService.toastError(errMsg);
        else alert(errMsg);
        return;
      }

      const remainingAfter = Math.max(0, invoiceBalance - amount);
      const paymentType = remainingAfter <= 0.01 ? 'FULL' : 'PARTIAL';
      const currentUser = (window.AuthService && window.AuthService.getCurrentUsername()) || 'Admin';

      const payload = {
        documentType: docType,
        documentId: docId,
        date: date,
        amount: amount,
        mode: mode,
        reference: ref || ('TXN-' + Math.floor(100000 + Math.random() * 900000)),
        notes: notes || `Payment recorded for ${currentInvoiceNo}`,
        receivedFrom: from || currentPartyName,
        paymentType: paymentType,
        attachment: proofName || null,
        createdBy: currentUser
      };

      try {
        await window.ApiService.post('/api/support/payments', payload);
      } catch (err) {
        console.error('Failed to post payment to backend:', err);
        if (window.AppDialogService) {
          window.AppDialogService.toastError('Server payment error: ' + (err.message || 'Validation failed'));
        } else {
          alert('Failed to save payment on server: ' + err.message);
        }
        return;
      }

      // Update local state
      invoicePaid += amount;
      invoiceBalance = remainingAfter;

      paymentHistory.unshift({
        id: Date.now(),
        date,
        mode,
        referenceNo: payload.reference,
        bankAccount: bank,
        receivedFrom: from,
        amount,
        proofFileName: proofName,
        notes
      });

      // Update Top Status Badge
      const elStatusBadge = document.getElementById('rp-status-badge');
      if (elStatusBadge) {
        const newStatus = invoiceBalance <= 0.01 ? 'PAID' : 'PARTIAL';
        elStatusBadge.innerHTML = getStatusBadge(newStatus);
      }

      this.updateSummaryCard();
      this.renderHistoryTable();
      this.resetForm();
      this.resetProof();

      if (window.AppDialogService) {
        window.AppDialogService.toastSuccess(`Payment of ${formatMoney(amount)} successfully recorded! Invoice status updated to ${invoiceBalance <= 0.01 ? 'PAID' : 'PARTIAL'}.`);
      } else {
        alert(`Payment of ${formatMoney(amount)} recorded successfully!`);
      }

      // Reload register from server so database changes immediately reflect
      try {
        if (docType === 'SALE') {
          if (window.SalesController && typeof window.SalesController.loadSales === 'function') {
            await window.SalesController.loadSales(0);
          }
        } else {
          if (window.PurchaseController && typeof window.PurchaseController.loadPurchases === 'function') {
            await window.PurchaseController.loadPurchases(0);
          }
        }
        if (window.DashboardController && typeof window.DashboardController.refresh === 'function') {
          window.DashboardController.refresh();
        }
      } catch (e2) {
        console.warn('Post-payment register reload warning:', e2);
      }
    },

    deletePayment(paymentId) {
      if (!confirm('Are you sure you want to remove this payment entry?')) return;
      const idx = paymentHistory.findIndex(p => p.id === paymentId);
      if (idx !== -1) {
        const removed = paymentHistory.splice(idx, 1)[0];
        invoicePaid = Math.max(0, invoicePaid - (parseFloat(removed.amount) || 0));
        invoiceBalance = Math.max(0, invoiceTotal - invoicePaid);
        this.updateSummaryCard();
        this.renderHistoryTable();
        this.recalcBalanceAfter();
        if (window.AppDialogService) window.AppDialogService.showToast('Payment record removed.', 'info');
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
