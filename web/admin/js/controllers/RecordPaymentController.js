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
      const docStatus = (extraDetails && (extraDetails.documentStatus || extraDetails.status || '')).toUpperCase();
      const status = (extraDetails && extraDetails.paymentStatus) || (invoiceBalance <= 0.01 ? 'PAID' : (invoicePaid > 0 ? 'PARTIAL' : 'UNPAID'));

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

      // 3. Load dynamic master lookups for Payment Mode and Bank Account
      await this.loadPaymentLookups();

      // 4. Populate Form Defaults
      this.resetForm();

      // 5. Reset Proof Attachment
      this.resetProof();

      // 5. Dismiss any open drawers and overlays so clicks are never blocked
      if (window.SalesController && typeof window.SalesController.closeInvoiceDrawer === 'function') {
        window.SalesController.closeInvoiceDrawer();
      }
      ['sales-inline-drawer', 'drawer-invoice-details', 'drawer-purchase-details-inspect', 'drawer-purchase-details', 'quote-detail-drawer', 'sr-detail-drawer', 'pr-detail-drawer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('open'); el.style.display = 'none'; }
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

    let editingPaymentId = null;
    let editingPaymentOriginal = null;

    function onPaymentModeChange(val) {
      const mode = (val || '').toLowerCase();
      const bankSelect = document.getElementById('rp-bank-account');
      if (bankSelect) {
        const isCashOrUpi = mode.includes('cash') || mode.includes('upi') || mode.includes('card');
        bankSelect.disabled = isCashOrUpi;
        bankSelect.style.opacity = isCashOrUpi ? '0.45' : '1';
        bankSelect.style.pointerEvents = isCashOrUpi ? 'none' : 'auto';
      }
    }

    function toggleHistoryMenu(id, event) {
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
          const menuWidth = 210;
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
    }

    async function loadPaymentLookups() {
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
          modeSelect.onchange = (e) => onPaymentModeChange(e.target.value);
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

        onPaymentModeChange(modeSelect ? modeSelect.value : '');
      } catch (err) {
        console.warn('[RecordPaymentController] Failed to load payment lookups:', err);
      }
    }

    function renderHistoryTable() {
      const tbody = document.getElementById('rp-history-tbody');
      if (!tbody) return;

      const badge = document.getElementById('rp-history-badge');
      if (badge) badge.innerText = `${paymentHistory.length} Payments`;

      if (!paymentHistory || paymentHistory.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align: center; color: var(--text-dim); padding: 36px; font-size: 0.84rem;">
              No payment records
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = paymentHistory.map((p, idx) => {
        const amt = parseFloat(p.amount) || 0;
        const proof = p.proofFileName || p.proof || p.attachment || '';
        const isReconciled = !!(p.reconciled || p.isReconciled || p.source === 'BANK_RECONCILIATION');
        const pId = p.id || idx;

        return `
          <tr>
            <td style="text-align: center; color: var(--text-dim);">${idx + 1}</td>
            <td>${formatDate(p.date || p.paymentDate)}</td>
            <td><span class="pill-badge pill-neutral">${p.mode || p.paymentMode || 'NEFT/RTGS'}</span></td>
            <td style="font-family: 'Space Grotesk', monospace; color: var(--cyan);">${p.referenceNo || p.refNo || p.reference || '-'}</td>
            <td>${p.bankAccount || p.bank || '-'}</td>
            <td style="font-weight: 600; color: var(--text-main);">${p.receivedFrom || p.payer || currentPartyName}</td>
            <td style="text-align: right; font-weight: 700; color: #34d399;">${formatMoney(amt)}</td>
            <td>
              ${proof ? `<span class="pill-badge pill-success" style="cursor: pointer;" onclick="window.RecordPaymentController.downloadProof(${p.id || 0}, '${proof}')" title="Click to download proof">📎 ${proof}</span>` : '<span style="color: var(--text-dim);">No proof</span>'}
            </td>
            <td style="color: var(--text-muted); font-size: 0.74rem; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.notes || '-'}</td>
            <td style="text-align: center;" onclick="event.stopPropagation();">
              <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
                <button class="btn-purple" onclick="window.RecordPaymentController.toggleHistoryMenu('${pId}', event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" title="Payment Actions">
                  ::: Actions
                </button>
                <div id="rp-history-menu-${pId}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:210px; white-space:nowrap; padding:6px 0; text-align:left;">
                  <div class="action-menu-item" onclick="window.RecordPaymentController.startEditPayment(${p.id || idx})"><span style="margin-right:8px;">✏️</span> Edit Payment</div>
                  ${proof ? `<div class="action-menu-item" onclick="window.RecordPaymentController.downloadProof(${p.id || 0}, '${proof}')"><span style="margin-right:8px;">👁️</span> Preview / Download Proof</div>` : ''}
                  ${proof && !isReconciled ? `<div class="action-menu-item" style="color:var(--red);" onclick="window.RecordPaymentController.removeHistoricalProof(${p.id || 0})"><span style="margin-right:8px;">🗑️</span> Remove Proof</div>` : ''}
                  <div class="action-menu-divider" style="height:1px; background:var(--border-subtle); margin:4px 0;"></div>
                  <div class="action-menu-item" style="color:var(--red);" onclick="window.RecordPaymentController.deletePayment(${p.id || idx})"><span style="margin-right:8px;">❌</span> Revert / Delete Payment</div>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    async savePayment(e) {
      if (e) {
        try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
      }

      const btnSave = document.getElementById('rp-btn-save');
      try {
        const elAmount = document.getElementById('rp-pay-amount');
        const amount = Math.round((parseFloat(elAmount ? elAmount.value : 0) || 0) * 100) / 100;
        if (amount <= 0) {
          const msg = 'Please enter a valid payment amount greater than zero.';
          if (window.AppDialogService) window.AppDialogService.toastError(msg);
          else alert(msg);
          if (elAmount) elAmount.focus();
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

        const remainingAfter = Math.max(0, Math.round((invoiceBalance - amount) * 100) / 100);
        const paymentType = remainingAfter <= 0.01 ? 'FULL' : 'PARTIAL';
        let currentUser = 'Admin';
        try {
          if (window.AuthService) {
            if (typeof window.AuthService.getCurrentUsername === 'function') {
              currentUser = window.AuthService.getCurrentUsername();
            } else if (typeof window.AuthService.getCurrentUser === 'function') {
              const u = window.AuthService.getCurrentUser();
              currentUser = (u && (u.username || u.fullName || u.name)) || 'Admin';
            }
          }
        } catch (_) {
          currentUser = 'Admin';
        }

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

        if (editingPaymentId) {
          const oldAmt = parseFloat(editingPaymentOriginal?.amount) || 0;
          const newAmt = amount;
          const diff = Math.round((newAmt - oldAmt) * 100) / 100;
          const diffStr = (diff >= 0 ? '+' : '') + formatMoney(diff);
          
          const confirmMsg = `Confirm Payment Modification:\n\n• Old Amount: ${formatMoney(oldAmt)}\n• New Amount: ${formatMoney(newAmt)}\n• Accounting Difference: ${diffStr}\n\nThis will adjust customer/supplier ledger balances and update General Ledger records. Do you wish to continue?`;
          let confirmed = false;
          if (window.AppDialogService && typeof window.AppDialogService.confirm === 'function') {
            confirmed = await window.AppDialogService.confirm(confirmMsg, 'Confirm Payment Update');
          } else {
            confirmed = confirm(confirmMsg);
          }
          if (!confirmed) return;

          payload.id = editingPaymentId;
          payload.expectedRowVersion = editingPaymentOriginal?.rowVersion != null ? editingPaymentOriginal.rowVersion : 0;
          
          if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerText = 'Updating...';
          }
          
          try {
            await window.ApiService.put(`/api/support/payments/${editingPaymentId}`, payload);
          } catch (putErr) {
            console.warn('PUT /api/support/payments failed, trying standard fallback:', putErr);
            await window.ApiService.post('/api/support/payments', payload);
          }
          
          if (attachedProofFile) {
            try {
              await window.ApiService.uploadBinary(`/api/support/payments/${editingPaymentId}/attachment-file`, attachedProofFile.name, attachedProofFile);
            } catch (_) {}
          }
          
          if (window.AppDialogService) {
            window.AppDialogService.toastSuccess(`Payment updated successfully! Accounting difference of ${diffStr} applied.`);
          }
          
          editingPaymentId = null;
          editingPaymentOriginal = null;
          if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerText = '💾 Save Payment';
            btnSave.classList.remove('btn-purple');
          }
          
          this.resetForm();
          this.resetProof();
          await this.refreshPayments();
          return;
        }

        if (btnSave) {
          btnSave.disabled = true;
          btnSave.innerText = 'Saving...';
        }

        let paymentId = null;
        try {
          const res = await window.ApiService.post('/api/support/payments/with-id', payload);
          paymentId = (res && (res.id != null ? res.id : res.paymentId)) || null;
        } catch (err) {
          console.warn('POST /api/support/payments/with-id failed, attempting standard POST:', err);
          try {
            await window.ApiService.post('/api/support/payments', payload);
          } catch (err2) {
            console.error('Failed to post payment to backend:', err2);
            if (btnSave) {
              btnSave.disabled = false;
              btnSave.innerText = '💾 Save Payment';
            }
            const msg = 'Server payment error: ' + (err2.message || 'Validation failed');
            if (window.AppDialogService) window.AppDialogService.toastError(msg);
            else alert(msg);
            return;
          }
        }

        // Upload binary proof file matching Desktop SupportApiClient
        if (attachedProofFile && paymentId) {
          try {
            await window.ApiService.uploadBinary(`/api/support/payments/${paymentId}/attachment-file`, attachedProofFile.name, attachedProofFile);
          } catch (proofErr) {
            console.warn('Payment recorded, but binary proof upload failed:', proofErr);
            if (window.AppDialogService) {
              window.AppDialogService.toastWarning('Payment saved, but receipt attachment upload failed: ' + proofErr.message);
            }
          }
        }

        if (btnSave) {
          btnSave.disabled = false;
          btnSave.innerText = '💾 Save Payment';
        }

        // Update local state
        invoicePaid += amount;
        invoiceBalance = remainingAfter;

        paymentHistory.unshift({
          id: paymentId || Date.now(),
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

        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();

        if (window.NotificationService) {
          window.NotificationService.notifyPayment(payload.reference || invoiceNo, partyName, amount);
        }

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
      } catch (err) {
        console.error('Failed to save payment:', err);
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.innerText = '💾 Save Payment';
        }
        const msg = 'Failed to save payment: ' + (err.message || 'Validation error');
        if (window.AppDialogService) window.AppDialogService.toastError(msg);
        else alert(msg);
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
    },

    async downloadProof(paymentId, fileName) {
      if (!paymentId) return;
      try {
        const blob = await window.ApiService.get(`/api/support/payments/${paymentId}/attachment-file`);
        if (!blob || !(blob instanceof Blob)) {
          throw new Error('No attachment data returned from server');
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || `payment_proof_${paymentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Download proof error:', err);
        const msg = 'Could not download proof: ' + (err.message || 'File not found');
        if (window.AppDialogService) window.AppDialogService.toastError(msg);
        else alert(msg);
      }
    },

    startEditPayment(paymentId) {
      const p = paymentHistory.find(x => x.id === paymentId || (x.id == null && paymentHistory.indexOf(x) === paymentId));
      if (!p) return;

      const isReconciled = !!(p.reconciled || p.isReconciled || p.source === 'BANK_RECONCILIATION');
      if (isReconciled) {
        const msg = 'This payment has been matched in Bank Reconciliation. You cannot edit it directly. Please unlink or reverse the bank match first.';
        if (window.AppDialogService) window.AppDialogService.toastWarning(msg);
        else alert(msg);
        return;
      }

      editingPaymentId = p.id;
      editingPaymentOriginal = { ...p };

      const elDate = document.getElementById('rp-pay-date');
      const elMode = document.getElementById('rp-pay-mode');
      const elRef = document.getElementById('rp-pay-ref');
      const elFrom = document.getElementById('rp-pay-from');
      const elBank = document.getElementById('rp-bank-account');
      const elAmount = document.getElementById('rp-pay-amount');
      const elNotes = document.getElementById('rp-pay-notes');

      if (elDate) elDate.value = (p.date || p.paymentDate || '').slice(0, 10);
      if (elMode) {
        elMode.value = p.mode || p.paymentMode || 'NEFT/RTGS';
        onPaymentModeChange(elMode.value);
      }
      if (elRef) elRef.value = p.referenceNo || p.refNo || p.reference || '';
      if (elFrom) elFrom.value = p.receivedFrom || p.payer || currentPartyName;
      if (elBank) elBank.value = p.bankAccount || p.bank || '';
      if (elAmount) elAmount.value = p.amount || '';
      if (elNotes) elNotes.value = p.notes || '';

      const btnSave = document.getElementById('rp-btn-save');
      if (btnSave) {
        btnSave.innerText = '✏️ Update Payment';
        btnSave.classList.add('btn-purple');
      }

      const formTitle = document.getElementById('rp-form-title');
      if (formTitle) formTitle.innerText = `Edit Payment (${p.referenceNo || p.id})`;

      if (window.AppDialogService) {
        window.AppDialogService.toastInfo(`Editing payment ${p.referenceNo || p.id}. Adjust fields and click "Update Payment".`);
      }
    },

    cancelEdit() {
      editingPaymentId = null;
      editingPaymentOriginal = null;
      const btnSave = document.getElementById('rp-btn-save');
      if (btnSave) {
        btnSave.innerText = '💾 Save Payment';
        btnSave.classList.remove('btn-purple');
      }
      const formTitle = document.getElementById('rp-form-title');
      if (formTitle) formTitle.innerText = 'Record New Payment';
      this.resetForm();
    },

    async removeHistoricalProof(paymentId) {
      if (!confirm('Are you sure you want to remove the receipt proof attachment from this payment?')) return;
      try {
        await window.ApiService.delete(`/api/support/payments/${paymentId}/attachment`);
        if (window.AppDialogService) window.AppDialogService.toastSuccess('Receipt proof removed.');
        await this.refreshPayments();
      } catch (err) {
        console.warn('Remove proof error:', err);
        try {
          await window.ApiService.put(`/api/support/payments/${paymentId}`, { attachment: null });
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Receipt proof removed.');
          await this.refreshPayments();
        } catch (e2) {
          if (window.AppDialogService) window.AppDialogService.toastError('Failed to remove proof: ' + e2.message);
          else alert('Failed to remove proof: ' + e2.message);
        }
      }
    },

    toggleHistoryMenu,
    onPaymentModeChange
  };
})();

// Global alias for compatibility
window.openInvoicePaymentDetails = function(type, id, invoiceNo, partyName, total, paid, balance, extraDetails) {
  if (window.RecordPaymentController) {
    window.RecordPaymentController.open(type, id, invoiceNo, partyName, total, paid, balance, extraDetails);
  }
};
