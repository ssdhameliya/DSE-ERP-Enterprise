/**
 * Jasvi Industries ERP - PurchaseController
 * Inward procurement bills, dynamic item grids, and Purchase Register
 */
window.PurchaseController = {
  purchasesCache: [],
  currentDrawerPurchase: null,

  async loadPurchases() {
    const tbody = document.getElementById('purchases-table-tbody');
    if (!tbody) return;
    try {
      const res = await window.OperationsService.getPurchases(0, 50);
      const list = res.rows || res.content || (Array.isArray(res) ? res : []);
      this.purchasesCache = list;
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 24px;">No purchase bills recorded in database.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(p => {
        const invNo = p.invoiceNo || p.billNo || '-';
        const suppName = (p.supplier && p.supplier.name) || p.supplierName || p.partyName || '-';
        const taxable = p.subtotal != null ? p.subtotal : (p.taxableAmount || 0);
        const gst = p.gstAmount || 0;
        const grandTotal = p.totalAmount != null ? p.totalAmount : (p.total || 0);
        const statusText = p.documentStatus || p.paymentStatus || 'ACCEPTED';
        return `
          <tr style="cursor: pointer;" onclick="window.PurchaseController.openPurchaseDrawer('${invNo}')" title="Click to inspect inward bill">
            <td style="font-weight: 700; color: var(--cyan);">${invNo}</td>
            <td>${window.FormatUtil.formatDate(p.invoiceDate || p.date)}</td>
            <td style="font-weight: 600;">${suppName}</td>
            <td>${window.FormatUtil.formatRupees(taxable)}</td>
            <td>${window.FormatUtil.formatRupees(gst)}</td>
            <td style="font-weight: 700;">${window.FormatUtil.formatRupees(grandTotal)}</td>
            <td><span class="badge badge-paid">${statusText}</span></td>
            <td onclick="event.stopPropagation()">
              <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.72rem;" onclick="window.PurchaseController.openPurchaseDrawer('${invNo}')">Inspect</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #f87171; padding: 24px;">${e.message}</td></tr>`;
    }
  },

  async openPurchaseDrawer(billNo) {
    const drawer = document.getElementById('drawer-purchase-details');
    const overlay = document.getElementById('side-drawer-overlay');
    if (!drawer) return;

    try {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      const purchase = await window.OperationsService.getPurchaseByInvoice(billNo);
      this.currentDrawerPurchase = purchase;

      document.getElementById('drawer-pur-no').innerText = purchase.invoiceNo || billNo;
      document.getElementById('drawer-pur-date').innerText = window.FormatUtil.formatDate(purchase.invoiceDate);
      document.getElementById('drawer-pur-status').innerText = purchase.documentStatus || 'ACCEPTED';

      const supp = purchase.supplier || {};
      document.getElementById('drawer-pur-supp-name').innerText = supp.name || purchase.supplierName || 'Vendor';
      document.getElementById('drawer-pur-supp-gstin').innerText = supp.gstin || 'Unregistered';
      document.getElementById('drawer-pur-supp-phone').innerText = supp.phone || '-';

      const tbody = document.getElementById('drawer-pur-items-tbody');
      const lines = purchase.lines || [];
      if (lines.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 12px;">No line items on record.</td></tr>`;
      } else {
        tbody.innerHTML = lines.map((l, i) => `
          <tr>
            <td style="color: var(--text-dim);">${i + 1}</td>
            <td style="font-weight: 600;">${l.itemDescription || l.description || l.itemCode}</td>
            <td>${l.quantity || 1} ${l.itemUnit || 'PCS'}</td>
            <td>${window.FormatUtil.formatRupees(l.rate || 0)}</td>
            <td style="font-weight: 700;">${window.FormatUtil.formatRupees(l.totalAmount || l.lineTotal || 0)}</td>
          </tr>
        `).join('');
      }

      document.getElementById('drawer-pur-taxable').innerText = window.FormatUtil.formatRupees(purchase.subtotal || purchase.taxableAmount || 0);
      document.getElementById('drawer-pur-gst').innerText = window.FormatUtil.formatRupees(purchase.gstAmount || 0);
      document.getElementById('drawer-pur-total').innerText = window.FormatUtil.formatRupees(purchase.totalAmount || 0);

      drawer.classList.add('open');
      if (overlay) overlay.classList.add('open');
    } catch (e) {
      window.AppDialogService.showToast('Unable to load purchase bill: ' + e.message, 'error');
    }
  },

  closePurchaseDrawer() {
    const drawer = document.getElementById('drawer-purchase-details');
    const overlay = document.getElementById('side-drawer-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    this.currentDrawerPurchase = null;
  },

  async openNewPurchaseModal() {
    if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
    try {
      let nextNo = 'BILL-2026-0001';
      try {
        const nextRes = await window.OperationsService.getNextPurchaseInvoice();
        if (nextRes && nextRes.value) nextNo = nextRes.value;
      } catch (e) {}

      document.getElementById('pur-bill-no').value = nextNo;
      document.getElementById('pur-bill-date').value = new Date().toISOString().split('T')[0];

      const suppliers = await window.MasterService.getParties('SUPPLIER');
      const sel = document.getElementById('pur-supplier');
      sel.innerHTML = `<option value="">-- Choose Supplier / Vendor --</option>` +
        (suppliers || []).map(s => `<option value="${s.id}" data-gstin="${s.gstin || ''}" data-address="${s.address || ''}">${s.name || s.partyName} (${s.partyCode || s.code || ''})</option>`).join('');

      document.getElementById('pur-items-tbody').innerHTML = '';
      const items = await window.MasterService.getItems();
      this.addPurchaseItemRow(items);

      window.AppDialogService.openModal('modal-new-purchase');
    } catch (err) {
      window.AppDialogService.showToast('Unable to open purchase modal: ' + err.message, 'error');
    }
  },

  onSupplierSelectChange(suppSelect) {
    const opt = suppSelect.options[suppSelect.selectedIndex];
    if (!opt || !opt.value) return;
    const gstin = opt.getAttribute('data-gstin') || '';
    const addr = opt.getAttribute('data-address') || '';
    const gstinEl = document.getElementById('pur-gstin');
    const addrEl = document.getElementById('pur-supplier-address');
    if (gstinEl) gstinEl.value = gstin;
    if (addrEl) addrEl.value = addr;
    this.calcPurchaseTotals();
  },

  async addPurchaseItemRow(items) {
    const tbody = document.getElementById('pur-items-tbody');
    const rowId = 'pur-row-' + Date.now() + '-' + Math.floor(Math.random() * 100);
    const itemList = items || await window.MasterService.getItems();
    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.innerHTML = `
      <td>
        <select class="form-select pur-row-item" onchange="window.PurchaseController.onItemChange('${rowId}', this.value)" style="height:34px; font-size:0.8rem; width:100%; min-width:180px;">
          <option value="">-- Select Material / SKU --</option>
          ${itemList.map(i => `<option value="${i.itemCode || i.code}" data-desc="${i.description || i.name}" data-hsn="${i.hsn || '73063000'}" data-rate="${i.purchasePrice || 80}" data-tax="${i.gst || 18}" data-unit="${i.unit || 'PCS'}">${i.itemCode || i.code} - ${i.description || i.name}</option>`).join('')}
        </select>
      </td>
      <td><input type="text" class="form-input pur-row-hsn" value="73063000" style="width:75px; height:34px; font-size:0.8rem;"></td>
      <td><input type="number" class="form-input pur-row-qty" value="1" min="1" step="any" oninput="window.PurchaseController.calcPurchaseTotals()" style="width:65px; height:34px; font-size:0.8rem;"></td>
      <td><input type="text" class="form-input pur-row-unit" value="PCS" style="width:50px; height:34px; font-size:0.8rem;"></td>
      <td><input type="number" step="0.01" class="form-input pur-row-rate" value="80.00" oninput="window.PurchaseController.calcPurchaseTotals()" style="width:85px; height:34px; font-size:0.8rem;"></td>
      <td>
        <select class="form-select pur-row-tax" onchange="window.PurchaseController.calcPurchaseTotals()" style="width:65px; height:34px; font-size:0.8rem;">
          <option value="18" selected>18%</option>
          <option value="12">12%</option>
          <option value="5">5%</option>
          <option value="28">28%</option>
          <option value="0">0%</option>
        </select>
      </td>
      <td class="pur-row-tot" style="font-weight:700; text-align:right; font-family:'Space Grotesk'; font-size:0.85rem;">₹ 94.40</td>
      <td style="text-align:center;">
        <button type="button" class="btn btn-danger" style="padding:2px 6px; font-size:0.75rem;" onclick="document.getElementById('${rowId}').remove(); window.PurchaseController.calcPurchaseTotals();">&times;</button>
      </td>
    `;
    tbody.appendChild(tr);
    this.calcPurchaseTotals();
  },

  onItemChange(rowId, code) {
    const r = document.getElementById(rowId);
    if (!r) return;
    const select = r.querySelector('.pur-row-item');
    const opt = select.options[select.selectedIndex];
    if (!opt) return;

    r.querySelector('.pur-row-hsn').value = opt.getAttribute('data-hsn') || '73063000';
    r.querySelector('.pur-row-rate').value = parseFloat(opt.getAttribute('data-rate') || 80).toFixed(2);
    r.querySelector('.pur-row-tax').value = opt.getAttribute('data-tax') || '18';
    r.querySelector('.pur-row-unit').value = opt.getAttribute('data-unit') || 'PCS';
    this.calcPurchaseTotals();
  },

  calcPurchaseTotals() {
    let subtotal = 0;
    let totalGst = 0;

    document.querySelectorAll('#pur-items-tbody tr').forEach(tr => {
      const qty = parseFloat(tr.querySelector('.pur-row-qty').value) || 0;
      const rate = parseFloat(tr.querySelector('.pur-row-rate').value) || 0;
      const taxRate = parseFloat(tr.querySelector('.pur-row-tax').value) || 0;

      const taxable = qty * rate;
      const taxAmt = taxable * (taxRate / 100);
      const lineTot = taxable + taxAmt;

      subtotal += taxable;
      totalGst += taxAmt;

      tr.querySelector('.pur-row-tot').innerText = window.FormatUtil.formatRupees(lineTot);
    });

    const freight = parseFloat(document.getElementById('pur-freight-charges')?.value || 0);
    const grandTotal = subtotal + totalGst + freight;

    if (document.getElementById('pur-calc-sub')) document.getElementById('pur-calc-sub').innerText = window.FormatUtil.formatRupees(subtotal);
    if (document.getElementById('pur-calc-tax')) document.getElementById('pur-calc-tax').innerText = window.FormatUtil.formatRupees(totalGst);
    if (document.getElementById('pur-calc-grand')) document.getElementById('pur-calc-grand').innerText = window.FormatUtil.formatRupees(grandTotal);
  },

  async handlePurchaseSave(e) {
    e.preventDefault();
    const invoiceNo = document.getElementById('pur-bill-no').value.trim();
    const invoiceDate = document.getElementById('pur-bill-date').value;
    const suppVal = document.getElementById('pur-supplier').value;

    if (!suppVal) {
      window.AppDialogService.showToast('Please select a supplier before saving.', 'error');
      return;
    }

    const suppliers = await window.MasterService.getParties('SUPPLIER');
    const supp = suppliers.find(s => s.id == suppVal);
    const freight = parseFloat(document.getElementById('pur-freight-charges')?.value || 0);

    let taxable = 0, gst = 0;
    const lines = [];

    document.querySelectorAll('#pur-items-tbody tr').forEach(tr => {
      const select = tr.querySelector('.pur-row-item');
      const itemCode = select.value;
      if (!itemCode) return;
      const opt = select.options[select.selectedIndex];
      const itemDescription = opt ? opt.getAttribute('data-desc') : itemCode;
      const itemHsn = tr.querySelector('.pur-row-hsn').value || '73063000';
      const itemUnit = tr.querySelector('.pur-row-unit').value || 'PCS';
      const qty = parseFloat(tr.querySelector('.pur-row-qty').value) || 0;
      const rate = parseFloat(tr.querySelector('.pur-row-rate').value) || 0;
      const gstPercent = parseFloat(tr.querySelector('.pur-row-tax').value) || 0;

      const lineTaxable = qty * rate;
      const lineGst = lineTaxable * (gstPercent / 100);
      const lineTotal = lineTaxable + lineGst;

      taxable += lineTaxable;
      gst += lineGst;

      lines.push({
        itemCode,
        itemDescription,
        itemHsn,
        itemUnit,
        quantity: qty,
        rate,
        discountPercent: 0,
        discountAmount: 0,
        gstPercent,
        totalAmount: lineTotal
      });
    });

    if (lines.length === 0) {
      window.AppDialogService.showToast('Please add at least one line item to inward bill.', 'error');
      return;
    }

    const grandTotal = taxable + gst + freight;

    const payload = {
      invoiceNo,
      invoiceDate,
      supplier: supp || { id: 1, name: 'Vendor' },
      supplierName: supp ? supp.name : 'Vendor',
      chargeAmount: freight,
      subtotal: taxable,
      discountAmount: 0,
      gstAmount: gst,
      totalAmount: grandTotal,
      paidAmount: grandTotal,
      documentStatus: 'ACCEPTED',
      lines
    };

    try {
      await window.OperationsService.createPurchase(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Inward Bill ${invoiceNo} recorded & stock updated!`, 'success');
      window.AppDialogService.closeModal('modal-new-purchase');
      this.loadPurchases();
      if (window.DashboardController) window.DashboardController.refresh();
    } catch (err) {
      window.AppDialogService.showToast('Failed to save purchase bill: ' + err.message, 'error');
    }
  },

  async loadReturns() {
    const tbody = document.getElementById('purchase-returns-tbody');
    if (!tbody) return;
    try {
      const res = await window.OperationsService.getPurchaseReturns();
      const list = res.content || [];
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 16px;">No purchase returns recorded.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(r => `
        <tr>
          <td style="font-weight:700; color:var(--cyan);">${r.returnNumber || r.no}</td>
          <td>${window.FormatUtil.formatDate(r.date)}</td>
          <td>${r.partyName}</td>
          <td>${r.invoiceNo || '-'}</td>
          <td>${window.FormatUtil.formatRupees(r.amount || 0)}</td>
          <td><span class="badge badge-paid">${r.status || 'PROCESSED'}</span></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  async loadDebitNotes() {
    const tbody = document.getElementById('debit-notes-tbody');
    if (!tbody) return;
    try {
      const list = await window.OperationsService.getDebitNotes();
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 16px;">No debit notes recorded.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(d => `
        <tr>
          <td style="font-weight:700; color:var(--cyan);">${d.noteNumber || d.code}</td>
          <td>${window.FormatUtil.formatDate(d.date)}</td>
          <td>${d.supplierName || '-'}</td>
          <td>${d.billRef || '-'}</td>
          <td>${window.FormatUtil.formatRupees(d.totalAmount || 0)}</td>
          <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:0.7rem;">Print Memo</button></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  }
};
