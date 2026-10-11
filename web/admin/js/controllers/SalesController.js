/**
 * Jasvi Industries ERP - SalesController
 * Invoices, Quotations, Returns, Credit Notes matching desktop SalesController
 */
window.SalesController = {
  salesCache: [],
  quotationsCache: [],

  async loadSales() {
    const tbody = document.getElementById('sales-table-tbody');
    if (!tbody) return;
    try {
      const res = await window.OperationsService.getSales(0, 50);
      const list = res.rows || res.content || (Array.isArray(res) ? res : []);
      this.salesCache = list;
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim);">No sales records found.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(s => {
        const invNo = s.invoiceNo || s.number || '-';
        const custName = (s.customer && s.customer.name) || s.customerName || s.partyName || '-';
        const taxable = s.subtotal != null ? s.subtotal : (s.taxableAmount || 0);
        const grandTotal = s.totalAmount != null ? s.totalAmount : (s.total || 0);
        const isPaid = s.documentStatus === 'PAID' || s.paymentStatus === 'PAID';
        const statusText = s.documentStatus || s.paymentStatus || 'POSTED';
        return `
          <tr>
            <td style="font-weight: 700; color: var(--cyan);">${invNo}</td>
            <td>${window.FormatUtil.formatDate(s.invoiceDate || s.date)}</td>
            <td style="font-weight: 600;">${custName}</td>
            <td>${window.FormatUtil.formatRupees(taxable)}</td>
            <td>${window.FormatUtil.formatRupees(s.gstAmount || 0)}</td>
            <td style="font-weight: 700;">${window.FormatUtil.formatRupees(grandTotal)}</td>
            <td><span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">${statusText}</span></td>
            <td>
              <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;" onclick="window.BarcodeStudioController.quickGenerate('${invNo}')">Barcode</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  filterSales(query) {
    const tbody = document.getElementById('sales-table-tbody');
    if (!tbody) return;
    const q = (query || '').toLowerCase();
    const filtered = this.salesCache.filter(s => {
      const invNo = (s.invoiceNo || s.number || '').toLowerCase();
      const custName = ((s.customer && s.customer.name) || s.customerName || s.partyName || '').toLowerCase();
      return invNo.includes(q) || custName.includes(q);
    });
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim);">No matching invoices.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map(s => {
      const invNo = s.invoiceNo || s.number || '-';
      const custName = (s.customer && s.customer.name) || s.customerName || s.partyName || '-';
      const taxable = s.subtotal != null ? s.subtotal : (s.taxableAmount || 0);
      const grandTotal = s.totalAmount != null ? s.totalAmount : (s.total || 0);
      const isPaid = s.documentStatus === 'PAID' || s.paymentStatus === 'PAID';
      const statusText = s.documentStatus || s.paymentStatus || 'POSTED';
      return `
        <tr>
          <td style="font-weight: 700; color: var(--cyan);">${invNo}</td>
          <td>${window.FormatUtil.formatDate(s.invoiceDate || s.date)}</td>
          <td style="font-weight: 600;">${custName}</td>
          <td>${window.FormatUtil.formatRupees(taxable)}</td>
          <td>${window.FormatUtil.formatRupees(s.gstAmount || 0)}</td>
          <td style="font-weight: 700;">${window.FormatUtil.formatRupees(grandTotal)}</td>
          <td><span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">${statusText}</span></td>
          <td><button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;" onclick="window.BarcodeStudioController.quickGenerate('${invNo}')">Barcode</button></td>
        </tr>
      `;
    }).join('');
  },

  async loadQuotations() {
    const tbody = document.getElementById('quotations-tbody');
    if (!tbody) return;
    try {
      const list = await window.OperationsService.getQuotations();
      this.quotationsCache = list || [];
      if (this.quotationsCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">No quotations on record.</td></tr>`;
        return;
      }
      tbody.innerHTML = this.quotationsCache.map(q => `
        <tr>
          <td style="font-weight:700; color:var(--cyan);">${q.quoteNumber || q.code}</td>
          <td>${window.FormatUtil.formatDate(q.date)}</td>
          <td style="font-weight:600;">${q.customerName || '-'}</td>
          <td>${window.FormatUtil.formatDate(q.validUntil)}</td>
          <td style="font-weight:700;">${window.FormatUtil.formatRupees(q.total || 0)}</td>
          <td><span class="badge badge-paid">${q.status || 'OPEN'}</span></td>
          <td><button class="btn btn-primary" style="padding:2px 8px; font-size:0.7rem;" onclick="window.SalesController.convertQuoteToInvoice('${q.quoteNumber}')">Convert to Sale</button></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  async loadReturns() {
    const tbody = document.getElementById('sales-returns-tbody');
    if (!tbody) return;
    try {
      const res = await window.OperationsService.getSalesReturns();
      const list = res.content || [];
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No sales returns recorded.</td></tr>`;
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

  async loadCreditNotes() {
    const tbody = document.getElementById('credit-notes-tbody');
    if (!tbody) return;
    try {
      const list = await window.OperationsService.getCreditNotes();
      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No credit notes recorded.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(c => `
        <tr>
          <td style="font-weight:700; color:var(--cyan);">${c.noteNumber || c.code}</td>
          <td>${window.FormatUtil.formatDate(c.date)}</td>
          <td>${c.partyName || '-'}</td>
          <td>${c.invoiceRef || '-'}</td>
          <td>${window.FormatUtil.formatRupees(c.totalAmount || 0)}</td>
          <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:0.7rem;">Print Memo</button></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  // Modal Handlers
  async openNewInvoiceModal() {
    const parties = await window.MasterService.getParties('CUSTOMER');
    const items = await window.MasterService.getItems();
    document.getElementById('inv-no').value = 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('inv-date').value = new Date().toISOString().split('T')[0];
    const sel = document.getElementById('inv-customer');
    sel.innerHTML = `<option value="">-- Choose Customer --</option>` + (parties || []).map(c => `<option value="${c.id || c.code}">${c.name || c.partyName} (${c.code})</option>`).join('');
    document.getElementById('inv-items-tbody').innerHTML = '';
    this.addInvoiceItemRow(items);
    window.AppDialogService.openModal('modal-new-invoice');
  },

  async addInvoiceItemRow(items) {
    const tbody = document.getElementById('inv-items-tbody');
    const rowId = 'inv-row-' + Date.now();
    const itemList = items || await window.MasterService.getItems();
    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.innerHTML = `
      <td>
        <select class="form-select inv-row-item" onchange="window.SalesController.onItemChange('${rowId}', this.value)" style="height:36px;">
          <option value="">-- Select SKU --</option>
          ${itemList.map(i => `<option value="${i.code}">${i.description || i.name} (${i.code})</option>`).join('')}
        </select>
      </td>
      <td><input type="number" class="form-input inv-row-qty" value="1" min="1" oninput="window.SalesController.calcInvoiceTotals()" style="width:70px; height:36px;"></td>
      <td><input type="number" step="0.01" class="form-input inv-row-rate" value="100.00" oninput="window.SalesController.calcInvoiceTotals()" style="width:90px; height:36px;"></td>
      <td><input type="number" class="form-input inv-row-tax" value="18" readonly style="width:50px; height:36px;"></td>
      <td class="inv-row-tot" style="font-weight:600;">₹ 118.00</td>
      <td><button type="button" class="btn btn-danger" style="padding:4px 8px; font-size:0.7rem;" onclick="document.getElementById('${rowId}').remove(); window.SalesController.calcInvoiceTotals();">&times;</button></td>
    `;
    tbody.appendChild(tr);
    this.calcInvoiceTotals();
  },

  async onItemChange(rowId, code) {
    const items = await window.MasterService.getItems();
    const it = items.find(i => i.code === code);
    if (!it) return;
    const r = document.getElementById(rowId);
    if (!r) return;
    r.querySelector('.inv-row-rate').value = it.salePrice || 100;
    r.querySelector('.inv-row-tax').value = it.taxRate || 18;
    this.calcInvoiceTotals();
  },

  calcInvoiceTotals() {
    let sub = 0, tax = 0;
    document.querySelectorAll('#inv-items-tbody tr').forEach(tr => {
      const qty = parseFloat(tr.querySelector('.inv-row-qty').value) || 0;
      const rate = parseFloat(tr.querySelector('.inv-row-rate').value) || 0;
      const tx = parseFloat(tr.querySelector('.inv-row-tax').value) || 0;
      const lineSub = qty * rate;
      const lineTot = lineSub * (1 + tx / 100);
      sub += lineSub;
      tax += lineSub * (tx / 100);
      tr.querySelector('.inv-row-tot').innerText = '₹ ' + lineTot.toFixed(2);
    });
    document.getElementById('inv-calc-sub').innerText = window.FormatUtil.formatRupees(sub);
    document.getElementById('inv-calc-tax').innerText = window.FormatUtil.formatRupees(tax);
    document.getElementById('inv-calc-grand').innerText = window.FormatUtil.formatRupees(sub + tax);
  },

  async handleInvoiceSave(e) {
    e.preventDefault();
    const invoiceNo = document.getElementById('inv-no').value;
    const invoiceDate = document.getElementById('inv-date').value;
    const custVal = document.getElementById('inv-customer').value;
    const parties = await window.MasterService.getParties('CUSTOMER');
    const cust = parties.find(c => (c.id == custVal || c.code == custVal));
    let taxable = 0, gst = 0;
    const lines = [];
    document.querySelectorAll('#inv-items-tbody tr').forEach(tr => {
      const itemCode = tr.querySelector('.inv-row-item').value;
      const qty = parseFloat(tr.querySelector('.inv-row-qty').value) || 0;
      const rate = parseFloat(tr.querySelector('.inv-row-rate').value) || 0;
      const taxRate = parseFloat(tr.querySelector('.inv-row-tax').value) || 0;
      const lineTaxable = qty * rate;
      taxable += lineTaxable;
      gst += lineTaxable * (taxRate / 100);
      lines.push({ itemCode, quantity: qty, rate, taxRate, lineTotal: lineTaxable * (1 + taxRate / 100) });
    });

    const payload = {
      invoiceNo, invoiceDate,
      customerId: cust ? cust.id : 1, customerName: cust ? (cust.name || cust.partyName) : 'Walk-in Client',
      taxableAmount: taxable, gstAmount: gst, totalAmount: taxable + gst, documentStatus: 'POSTED', lines
    };
    try {
      await window.OperationsService.createSale(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Invoice ${invoiceNo} generated & posted!`, 'success');
      window.AppDialogService.closeModal('modal-new-invoice');
      this.loadSales();
      if (window.DashboardController) window.DashboardController.refresh();
    } catch (err) {
      window.AppDialogService.showToast(err.message, 'error');
    }
  },

  convertQuoteToInvoice(quoteNo) {
    this.openNewInvoiceModal();
    window.AppDialogService.showToast(`Pre-filling draft from quotation ${quoteNo}`, 'info');
  }
};
