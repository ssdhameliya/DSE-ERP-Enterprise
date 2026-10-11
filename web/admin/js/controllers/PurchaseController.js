/**
 * Jasvi Industries ERP - PurchaseController
 * Purchase Register, Inward Bills, Returns, Debit Notes matching desktop PurchaseController
 */
window.PurchaseController = {
  purchasesCache: [],

  async loadPurchases() {
    const tbody = document.getElementById('purchases-table-tbody');
    if (!tbody) return;
    try {
      const res = await window.OperationsService.getPurchases(0, 15);
      const list = res.content || [];
      this.purchasesCache = list;
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">No purchase bills recorded.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(p => `
        <tr>
          <td style="font-weight: 700; color: var(--cyan);">${p.invoiceNo || p.billNo}</td>
          <td>${window.FormatUtil.formatDate(p.invoiceDate || p.date)}</td>
          <td style="font-weight: 600;">${p.supplierName || p.partyName || '-'}</td>
          <td>${window.FormatUtil.formatRupees(p.taxableAmount || 0)}</td>
          <td>${window.FormatUtil.formatRupees(p.gstAmount || 0)}</td>
          <td style="font-weight: 700;">${window.FormatUtil.formatRupees(p.totalAmount || p.total || 0)}</td>
          <td><span class="badge badge-paid">${p.documentStatus || 'ACCEPTED'}</span></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  async loadReturns() {
    const tbody = document.getElementById('purchase-returns-tbody');
    if (!tbody) return;
    try {
      const res = await window.OperationsService.getPurchaseReturns();
      const list = res.content || [];
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No purchase returns recorded.</td></tr>`;
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
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No debit notes recorded.</td></tr>`;
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
  },

  async openNewPurchaseModal() {
    const suppliers = await window.MasterService.getParties('SUPPLIER');
    const items = await window.MasterService.getItems();
    document.getElementById('pur-bill-no').value = 'BILL-' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('pur-bill-date').value = new Date().toISOString().split('T')[0];
    const sel = document.getElementById('pur-supplier');
    sel.innerHTML = `<option value="">-- Choose Supplier --</option>` + (suppliers || []).map(s => `<option value="${s.id || s.code}">${s.name || s.partyName} (${s.code})</option>`).join('');
    document.getElementById('pur-items-tbody').innerHTML = '';
    this.addPurchaseItemRow(items);
    window.AppDialogService.openModal('modal-new-purchase');
  },

  async addPurchaseItemRow(items) {
    const tbody = document.getElementById('pur-items-tbody');
    const rowId = 'pur-row-' + Date.now();
    const itemList = items || await window.MasterService.getItems();
    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.innerHTML = `
      <td>
        <select class="form-select pur-row-item" onchange="window.PurchaseController.onItemChange('${rowId}', this.value)" style="height:36px;">
          <option value="">-- Item SKU --</option>
          ${itemList.map(i => `<option value="${i.code}">${i.description || i.name} (${i.code})</option>`).join('')}
        </select>
      </td>
      <td><input type="number" class="form-input pur-row-qty" value="1" min="1" oninput="window.PurchaseController.calcPurchaseTotals()" style="width:70px; height:36px;"></td>
      <td><input type="number" step="0.01" class="form-input pur-row-rate" value="80.00" oninput="window.PurchaseController.calcPurchaseTotals()" style="width:90px; height:36px;"></td>
      <td><input type="number" class="form-input pur-row-tax" value="18" readonly style="width:50px; height:36px;"></td>
      <td class="pur-row-tot" style="font-weight:600;">₹ 94.40</td>
      <td><button type="button" class="btn btn-danger" style="padding:4px 8px; font-size:0.7rem;" onclick="document.getElementById('${rowId}').remove(); window.PurchaseController.calcPurchaseTotals();">&times;</button></td>
    `;
    tbody.appendChild(tr);
    this.calcPurchaseTotals();
  },

  async onItemChange(rowId, code) {
    const items = await window.MasterService.getItems();
    const it = items.find(i => i.code === code);
    if (!it) return;
    const r = document.getElementById(rowId);
    if (!r) return;
    r.querySelector('.pur-row-rate').value = it.purchasePrice || 80;
    r.querySelector('.pur-row-tax').value = it.taxRate || 18;
    this.calcPurchaseTotals();
  },

  calcPurchaseTotals() {
    let grand = 0;
    document.querySelectorAll('#pur-items-tbody tr').forEach(tr => {
      const qty = parseFloat(tr.querySelector('.pur-row-qty').value) || 0;
      const rate = parseFloat(tr.querySelector('.pur-row-rate').value) || 0;
      const tax = parseFloat(tr.querySelector('.pur-row-tax').value) || 0;
      const tot = (qty * rate) * (1 + tax / 100);
      tr.querySelector('.pur-row-tot').innerText = '₹ ' + tot.toFixed(2);
      grand += tot;
    });
    document.getElementById('pur-calc-grand').innerText = window.FormatUtil.formatRupees(grand);
  },

  async handlePurchaseSave(e) {
    e.preventDefault();
    const invoiceNo = document.getElementById('pur-bill-no').value;
    const invoiceDate = document.getElementById('pur-bill-date').value;
    const supVal = document.getElementById('pur-supplier').value;
    const suppliers = await window.MasterService.getParties('SUPPLIER');
    const sup = suppliers.find(s => (s.id == supVal || s.code == supVal));
    let taxable = 0, gst = 0;
    const lines = [];
    document.querySelectorAll('#pur-items-tbody tr').forEach(tr => {
      const itemCode = tr.querySelector('.pur-row-item').value;
      const qty = parseFloat(tr.querySelector('.pur-row-qty').value) || 0;
      const rate = parseFloat(tr.querySelector('.pur-row-rate').value) || 0;
      const tax = parseFloat(tr.querySelector('.pur-row-tax').value) || 0;
      const lineTaxable = qty * rate;
      taxable += lineTaxable;
      gst += lineTaxable * (tax / 100);
      lines.push({ itemCode, quantity: qty, rate, taxRate: tax, lineTotal: lineTaxable * (1 + tax / 100) });
    });

    const payload = {
      invoiceNo, invoiceDate,
      supplierId: sup ? sup.id : 1, supplierName: sup ? (sup.name || sup.partyName) : 'Raw Materials Vendor',
      taxableAmount: taxable, gstAmount: gst, totalAmount: taxable + gst, documentStatus: 'ACCEPTED', lines
    };
    try {
      await window.OperationsService.createPurchase(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Purchase bill ${invoiceNo} recorded successfully!`, 'success');
      window.AppDialogService.closeModal('modal-new-purchase');
      this.loadPurchases();
      if (window.DashboardController) window.DashboardController.refresh();
    } catch (err) {
      window.AppDialogService.showToast(err.message, 'error');
    }
  }
};
