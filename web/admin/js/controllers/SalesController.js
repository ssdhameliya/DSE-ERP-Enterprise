/**
 * Jasvi Industries ERP - SalesController
 * Full Desktop Parity: Invoices, Dynamic Line Grid, GST Computation,
 * Side Inspection Drawer, and Printable Tax Invoice Studio
 */
window.SalesController = {
  salesCache: [],
  quotationsCache: [],
  currentDrawerSale: null,

  async loadSales() {
    const tbody = document.getElementById('sales-table-tbody');
    if (!tbody) return;
    try {
      const res = await window.OperationsService.getSales(0, 50);
      const list = res.rows || res.content || (Array.isArray(res) ? res : []);
      this.salesCache = list;
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-dim); padding: 24px;">No sales records found in PostgreSQL database.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(s => {
        const invNo = s.invoiceNo || s.number || '-';
        const custName = (s.customer && s.customer.name) || s.customerName || s.partyName || '-';
        const taxable = s.subtotal != null ? s.subtotal : (s.taxableAmount || 0);
        const gst = s.gstAmount || 0;
        const grandTotal = s.totalAmount != null ? s.totalAmount : (s.total || 0);
        const paid = s.paidAmount != null ? s.paidAmount : (s.paymentStatus === 'PAID' ? grandTotal : 0);
        const balance = Math.max(0, grandTotal - paid);
        const isPaid = s.paymentStatus === 'PAID' || s.documentStatus === 'PAID';
        const statusText = s.documentStatus || s.paymentStatus || 'APPROVED';
        return `
          <tr style="cursor: pointer;" onclick="window.SalesController.openInvoiceDrawer('${invNo}')" title="Click to view invoice details & actions">
            <td style="font-weight: 700; color: var(--cyan);">${invNo}</td>
            <td>${window.FormatUtil.formatDate(s.invoiceDate || s.date)}</td>
            <td style="font-weight: 600;">${custName}</td>
            <td>${window.FormatUtil.formatRupees(taxable)}</td>
            <td>${window.FormatUtil.formatRupees(gst)}</td>
            <td style="font-weight: 700;">${window.FormatUtil.formatRupees(grandTotal)}</td>
            <td style="color: #34d399; font-weight: 600;">${window.FormatUtil.formatRupees(paid)}</td>
            <td style="color: ${balance > 0 ? '#f87171' : 'var(--text-muted)'}; font-weight: 600;">${window.FormatUtil.formatRupees(balance)}</td>
            <td><span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">${statusText}</span></td>
            <td onclick="event.stopPropagation()">
              <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.72rem;" onclick="window.SalesController.printTaxInvoice('${invNo}')" title="Print Tax Invoice">Print</button>
              <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.72rem; margin-left: 4px;" onclick="window.BarcodeStudioController.quickGenerate('${invNo}')" title="Print Thermal Barcode">Label</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #f87171; padding: 24px;">${e.message}</td></tr>`;
    }
  },

  filterSales(query) {
    const tbody = document.getElementById('sales-table-tbody');
    if (!tbody) return;
    const q = (query || '').toLowerCase().trim();
    const filtered = this.salesCache.filter(s => {
      const invNo = (s.invoiceNo || s.number || '').toLowerCase();
      const custName = ((s.customer && s.customer.name) || s.customerName || s.partyName || '').toLowerCase();
      const gstin = (s.gstin || (s.customer && s.customer.gstin) || '').toLowerCase();
      return invNo.includes(q) || custName.includes(q) || gstin.includes(q);
    });
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-dim); padding: 24px;">No matching invoices found.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map(s => {
      const invNo = s.invoiceNo || s.number || '-';
      const custName = (s.customer && s.customer.name) || s.customerName || s.partyName || '-';
      const taxable = s.subtotal != null ? s.subtotal : (s.taxableAmount || 0);
      const gst = s.gstAmount || 0;
      const grandTotal = s.totalAmount != null ? s.totalAmount : (s.total || 0);
      const paid = s.paidAmount != null ? s.paidAmount : (s.paymentStatus === 'PAID' ? grandTotal : 0);
      const balance = Math.max(0, grandTotal - paid);
      const isPaid = s.paymentStatus === 'PAID' || s.documentStatus === 'PAID';
      const statusText = s.documentStatus || s.paymentStatus || 'APPROVED';
      return `
        <tr style="cursor: pointer;" onclick="window.SalesController.openInvoiceDrawer('${invNo}')">
          <td style="font-weight: 700; color: var(--cyan);">${invNo}</td>
          <td>${window.FormatUtil.formatDate(s.invoiceDate || s.date)}</td>
          <td style="font-weight: 600;">${custName}</td>
          <td>${window.FormatUtil.formatRupees(taxable)}</td>
          <td>${window.FormatUtil.formatRupees(gst)}</td>
          <td style="font-weight: 700;">${window.FormatUtil.formatRupees(grandTotal)}</td>
          <td style="color: #34d399; font-weight: 600;">${window.FormatUtil.formatRupees(paid)}</td>
          <td style="color: ${balance > 0 ? '#f87171' : 'var(--text-muted)'}; font-weight: 600;">${window.FormatUtil.formatRupees(balance)}</td>
          <td><span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">${statusText}</span></td>
          <td onclick="event.stopPropagation()">
            <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.72rem;" onclick="window.SalesController.printTaxInvoice('${invNo}')">Print</button>
            <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.72rem; margin-left: 4px;" onclick="window.BarcodeStudioController.quickGenerate('${invNo}')">Label</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  // SIDE INSPECTION DRAWER
  async openInvoiceDrawer(invoiceNo) {
    const drawer = document.getElementById('drawer-invoice-details');
    const overlay = document.getElementById('side-drawer-overlay');
    if (!drawer) return;

    try {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      const sale = await window.OperationsService.getSaleByInvoice(invoiceNo);
      this.currentDrawerSale = sale;

      // Populate Drawer Fields
      document.getElementById('drawer-inv-no').innerText = sale.invoiceNo || invoiceNo;
      document.getElementById('drawer-inv-date').innerText = window.FormatUtil.formatDate(sale.invoiceDate);
      document.getElementById('drawer-inv-status').innerText = sale.documentStatus || 'APPROVED';
      document.getElementById('drawer-inv-status').className = `badge ${sale.paymentStatus === 'PAID' ? 'badge-paid' : 'badge-pending'}`;
      
      const cust = sale.customer || {};
      document.getElementById('drawer-cust-name').innerText = cust.name || sale.customerName || 'Walk-in Client';
      document.getElementById('drawer-cust-gstin').innerText = cust.gstin || sale.billingGstin || 'Unregistered / Consumer';
      document.getElementById('drawer-cust-phone').innerText = cust.phone || '-';
      document.getElementById('drawer-cust-address').innerText = cust.address || sale.billingAddress || '-';
      document.getElementById('drawer-transporter').innerText = sale.transporter || 'Self / By Hand';
      document.getElementById('drawer-vehicle').innerText = sale.vehicleNumber || '-';

      // Lines table
      const tbody = document.getElementById('drawer-items-tbody');
      const lines = sale.lines || [];
      if (lines.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 12px;">No line item records.</td></tr>`;
      } else {
        tbody.innerHTML = lines.map((l, idx) => `
          <tr>
            <td style="color: var(--text-dim);">${idx + 1}</td>
            <td style="font-weight: 600;">${l.itemDescription || l.description || l.itemCode || '-'}</td>
            <td>${l.quantity || 1} ${l.itemUnit || 'PCS'}</td>
            <td>${window.FormatUtil.formatRupees(l.rate || 0)}</td>
            <td>${l.gstPercent || l.taxRate || 18}%</td>
            <td style="font-weight: 700;">${window.FormatUtil.formatRupees(l.totalAmount || l.lineTotal || 0)}</td>
          </tr>
        `).join('');
      }

      // Financials
      document.getElementById('drawer-taxable-amt').innerText = window.FormatUtil.formatRupees(sale.subtotal || sale.taxableAmount || 0);
      document.getElementById('drawer-gst-amt').innerText = window.FormatUtil.formatRupees(sale.gstAmount || 0);
      document.getElementById('drawer-charges-amt').innerText = window.FormatUtil.formatRupees(sale.chargeAmount || 0);
      document.getElementById('drawer-grand-total').innerText = window.FormatUtil.formatRupees(sale.totalAmount || 0);

      // Open drawer
      drawer.classList.add('open');
      if (overlay) overlay.classList.add('open');
    } catch (err) {
      window.AppDialogService.showToast('Unable to load invoice details: ' + err.message, 'error');
    }
  },

  closeInvoiceDrawer() {
    const drawer = document.getElementById('drawer-invoice-details');
    const overlay = document.getElementById('side-drawer-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    this.currentDrawerSale = null;
  },

  // NEW SALE INVOICE MODAL
  async openNewInvoiceModal() {
    if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
    try {
      // 1. Fetch next sequence from server
      let nextNo = 'JI/25-2026/0130';
      try {
        const nextRes = await window.OperationsService.getNextSaleInvoice();
        if (nextRes && nextRes.value) nextNo = nextRes.value;
      } catch (e) {}

      document.getElementById('inv-no').value = nextNo;
      document.getElementById('inv-date').value = new Date().toISOString().split('T')[0];
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);
      const dueInput = document.getElementById('inv-due-date');
      if (dueInput) dueInput.value = dueDate.toISOString().split('T')[0];

      // 2. Load Customer Master
      const parties = await window.MasterService.getParties('CUSTOMER');
      const sel = document.getElementById('inv-customer');
      sel.innerHTML = `<option value="">-- Choose Customer / Client --</option>` +
        (parties || []).map(c => `<option value="${c.id}" data-gstin="${c.gstin || ''}" data-address="${c.address || ''}" data-phone="${c.phone || ''}">${c.name || c.partyName} (${c.partyCode || c.code || ''})</option>`).join('');

      // 3. Clear and add initial item row
      document.getElementById('inv-items-tbody').innerHTML = '';
      const items = await window.MasterService.getItems();
      this.addInvoiceItemRow(items);

      window.AppDialogService.openModal('modal-new-invoice');
    } catch (err) {
      window.AppDialogService.showToast('Unable to prepare new sale: ' + err.message, 'error');
    }
  },

  onCustomerSelectChange(custSelect) {
    const opt = custSelect.options[custSelect.selectedIndex];
    if (!opt || !opt.value) return;
    const gstin = opt.getAttribute('data-gstin') || '';
    const address = opt.getAttribute('data-address') || '';
    const phone = opt.getAttribute('data-phone') || '';

    const gstinEl = document.getElementById('inv-gstin');
    const addrEl = document.getElementById('inv-billing-address');
    const shipAddrEl = document.getElementById('inv-delivery-address');
    const gstTypeEl = document.getElementById('inv-gst-type');

    if (gstinEl) gstinEl.value = gstin;
    if (addrEl) addrEl.value = address;
    if (shipAddrEl) shipAddrEl.value = address;

    // Detect State from GSTIN prefix: 24 = Gujarat Intra-State
    if (gstTypeEl) {
      if (gstin && !gstin.startsWith('24')) {
        gstTypeEl.value = 'INTER_STATE_IGST';
      } else {
        gstTypeEl.value = 'INTRA_STATE_CGST_SGST';
      }
    }
    this.calcInvoiceTotals();
  },

  async addInvoiceItemRow(items) {
    const tbody = document.getElementById('inv-items-tbody');
    const rowId = 'inv-row-' + Date.now() + '-' + Math.floor(Math.random() * 100);
    const itemList = items || await window.MasterService.getItems();
    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.innerHTML = `
      <td>
        <select class="form-select inv-row-item" onchange="window.SalesController.onItemChange('${rowId}', this.value)" style="height:34px; font-size:0.8rem; width:100%; min-width:180px;">
          <option value="">-- Select SKU --</option>
          ${itemList.map(i => `<option value="${i.itemCode || i.code}" data-desc="${i.description || i.name}" data-hsn="${i.hsn || '73063000'}" data-rate="${i.sellingPrice || 100}" data-tax="${i.gst || 18}" data-unit="${i.unit || 'PCS'}">${i.itemCode || i.code} - ${i.description || i.name}</option>`).join('')}
        </select>
      </td>
      <td><input type="text" class="form-input inv-row-hsn" value="73063000" style="width:75px; height:34px; font-size:0.8rem;"></td>
      <td><input type="number" class="form-input inv-row-qty" value="1" min="1" step="any" oninput="window.SalesController.calcInvoiceTotals()" style="width:65px; height:34px; font-size:0.8rem;"></td>
      <td><input type="text" class="form-input inv-row-unit" value="PCS" style="width:50px; height:34px; font-size:0.8rem;"></td>
      <td><input type="number" step="0.01" class="form-input inv-row-rate" value="100.00" oninput="window.SalesController.calcInvoiceTotals()" style="width:85px; height:34px; font-size:0.8rem;"></td>
      <td><input type="number" step="0.1" class="form-input inv-row-disc" value="0" oninput="window.SalesController.calcInvoiceTotals()" style="width:55px; height:34px; font-size:0.8rem;"></td>
      <td>
        <select class="form-select inv-row-tax" onchange="window.SalesController.calcInvoiceTotals()" style="width:65px; height:34px; font-size:0.8rem;">
          <option value="18" selected>18%</option>
          <option value="12">12%</option>
          <option value="5">5%</option>
          <option value="28">28%</option>
          <option value="0">0%</option>
        </select>
      </td>
      <td class="inv-row-tot" style="font-weight:700; text-align:right; font-family:'Space Grotesk'; font-size:0.85rem;">₹ 118.00</td>
      <td style="text-align:center;">
        <button type="button" class="btn btn-danger" style="padding:2px 6px; font-size:0.75rem;" onclick="document.getElementById('${rowId}').remove(); window.SalesController.calcInvoiceTotals();" title="Remove line item">&times;</button>
      </td>
    `;
    tbody.appendChild(tr);
    this.calcInvoiceTotals();
  },

  onItemChange(rowId, code) {
    const r = document.getElementById(rowId);
    if (!r) return;
    const select = r.querySelector('.inv-row-item');
    const opt = select.options[select.selectedIndex];
    if (!opt) return;

    r.querySelector('.inv-row-hsn').value = opt.getAttribute('data-hsn') || '73063000';
    r.querySelector('.inv-row-rate').value = parseFloat(opt.getAttribute('data-rate') || 100).toFixed(2);
    r.querySelector('.inv-row-tax').value = opt.getAttribute('data-tax') || '18';
    r.querySelector('.inv-row-unit').value = opt.getAttribute('data-unit') || 'PCS';
    this.calcInvoiceTotals();
  },

  calcInvoiceTotals() {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;

    document.querySelectorAll('#inv-items-tbody tr').forEach(tr => {
      const qty = parseFloat(tr.querySelector('.inv-row-qty').value) || 0;
      const rate = parseFloat(tr.querySelector('.inv-row-rate').value) || 0;
      const discPct = parseFloat(tr.querySelector('.inv-row-disc').value) || 0;
      const taxRate = parseFloat(tr.querySelector('.inv-row-tax').value) || 0;

      const gross = qty * rate;
      const discAmt = gross * (discPct / 100);
      const taxable = gross - discAmt;
      const taxAmt = taxable * (taxRate / 100);
      const lineTot = taxable + taxAmt;

      subtotal += taxable;
      totalDiscount += discAmt;
      totalGst += taxAmt;

      tr.querySelector('.inv-row-tot').innerText = window.FormatUtil.formatRupees(lineTot);
    });

    const freight = parseFloat(document.getElementById('inv-freight-charges')?.value || 0);
    const roundOff = parseFloat(document.getElementById('inv-round-off')?.value || 0);
    const grandTotal = subtotal + totalGst + freight + roundOff;

    if (document.getElementById('inv-calc-sub')) document.getElementById('inv-calc-sub').innerText = window.FormatUtil.formatRupees(subtotal);
    if (document.getElementById('inv-calc-tax')) document.getElementById('inv-calc-tax').innerText = window.FormatUtil.formatRupees(totalGst);
    if (document.getElementById('inv-calc-grand')) document.getElementById('inv-calc-grand').innerText = window.FormatUtil.formatRupees(grandTotal);

    const gstTypeEl = document.getElementById('inv-gst-type');
    const isInterstate = gstTypeEl && gstTypeEl.value === 'INTER_STATE_IGST';
    const breakdownEl = document.getElementById('inv-tax-breakdown-text');
    if (breakdownEl) {
      if (isInterstate) {
        breakdownEl.innerText = `IGST: ${window.FormatUtil.formatRupees(totalGst)}`;
      } else {
        breakdownEl.innerText = `CGST: ${window.FormatUtil.formatRupees(totalGst / 2)} | SGST: ${window.FormatUtil.formatRupees(totalGst / 2)}`;
      }
    }
  },

  async handleInvoiceSave(e) {
    e.preventDefault();
    const invoiceNo = document.getElementById('inv-no').value.trim();
    const invoiceDate = document.getElementById('inv-date').value;
    const dueDate = document.getElementById('inv-due-date')?.value || invoiceDate;
    const custVal = document.getElementById('inv-customer').value;

    if (!custVal) {
      window.AppDialogService.showToast('Please select a customer before saving.', 'error');
      return;
    }

    const parties = await window.MasterService.getParties('CUSTOMER');
    const cust = parties.find(c => c.id == custVal);
    const billingAddress = document.getElementById('inv-billing-address')?.value || (cust ? cust.address : '');
    const deliveryAddress = document.getElementById('inv-delivery-address')?.value || billingAddress;
    const billingGstin = document.getElementById('inv-gstin')?.value || (cust ? cust.gstin : '');
    const vehicleNumber = document.getElementById('inv-vehicle-no')?.value || '';
    const transporter = document.getElementById('inv-transporter')?.value || '';
    const paymentMode = document.getElementById('inv-payment-mode')?.value || 'BANK_TRANSFER';
    const paymentTerms = document.getElementById('inv-payment-terms')?.value || '15 Days';
    const freight = parseFloat(document.getElementById('inv-freight-charges')?.value || 0);

    let taxable = 0, gst = 0, discountTot = 0;
    const lines = [];

    document.querySelectorAll('#inv-items-tbody tr').forEach(tr => {
      const select = tr.querySelector('.inv-row-item');
      const itemCode = select.value;
      if (!itemCode) return;
      const opt = select.options[select.selectedIndex];
      const itemDescription = opt ? opt.getAttribute('data-desc') : itemCode;
      const itemHsn = tr.querySelector('.inv-row-hsn').value || '73063000';
      const itemUnit = tr.querySelector('.inv-row-unit').value || 'PCS';
      const qty = parseFloat(tr.querySelector('.inv-row-qty').value) || 0;
      const rate = parseFloat(tr.querySelector('.inv-row-rate').value) || 0;
      const discountPercent = parseFloat(tr.querySelector('.inv-row-disc').value) || 0;
      const gstPercent = parseFloat(tr.querySelector('.inv-row-tax').value) || 0;

      const gross = qty * rate;
      const discountAmount = gross * (discountPercent / 100);
      const lineTaxable = gross - discountAmount;
      const lineGst = lineTaxable * (gstPercent / 100);
      const lineTotal = lineTaxable + lineGst;

      taxable += lineTaxable;
      gst += lineGst;
      discountTot += discountAmount;

      lines.push({
        itemCode,
        itemDescription,
        itemHsn,
        itemUnit,
        quantity: qty,
        rate,
        discountPercent,
        discountAmount,
        gstPercent,
        totalAmount: lineTotal
      });
    });

    if (lines.length === 0) {
      window.AppDialogService.showToast('Please add at least one line item to the invoice.', 'error');
      return;
    }

    const grandTotal = taxable + gst + freight;
    const gstType = document.getElementById('inv-gst-type')?.value || 'INTRA_STATE_CGST_SGST';

    const payload = {
      invoiceNo,
      invoiceDate,
      dueDate,
      customer: cust || { id: 1, name: 'Customer' },
      billingAddress,
      deliveryAddress,
      billingGstin,
      deliveryGstin: billingGstin,
      sameAsBilling: true,
      gstType,
      transporter,
      vehicleNumber,
      paymentTerms,
      paymentStatus: paymentMode === 'CREDIT' ? 'PENDING' : 'PAID',
      paidAmount: paymentMode === 'CREDIT' ? 0 : grandTotal,
      chargeType: freight > 0 ? 'FREIGHT' : '',
      chargeAmount: freight,
      subtotal: taxable,
      discountAmount: discountTot,
      gstAmount: gst,
      totalAmount: grandTotal,
      documentStatus: 'APPROVED',
      lines
    };

    try {
      await window.OperationsService.createSale(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Invoice ${invoiceNo} generated & posted successfully!`, 'success');
      window.AppDialogService.closeModal('modal-new-invoice');
      this.loadSales();
      if (window.DashboardController) window.DashboardController.refresh();
    } catch (err) {
      window.AppDialogService.showToast('Failed to save sale: ' + err.message, 'error');
    }
  },

  // PRINTABLE TAX INVOICE
  async printTaxInvoice(invoiceNo) {
    try {
      const sale = await window.OperationsService.getSaleByInvoice(invoiceNo);
      if (!sale) return;

      const cust = sale.customer || {};
      const lines = sale.lines || [];
      const isInterstate = (sale.gstType || '').includes('INTER');
      const cgst = isInterstate ? 0 : (sale.gstAmount || 0) / 2;
      const sgst = isInterstate ? 0 : (sale.gstAmount || 0) / 2;
      const igst = isInterstate ? (sale.gstAmount || 0) : 0;

      const printContainer = document.getElementById('printable-invoice-modal');
      if (!printContainer) return;

      printContainer.innerHTML = `
        <div class="tax-invoice-sheet">
          <div class="ti-header">
            <div>
              <div class="ti-title">JASVI INDUSTRIES</div>
              <div style="font-size: 10px; color: #4b5563; margin-top: 2px;">Precision Fasteners, High-Tensile Bolts &amp; Industrial Stainless Steel Piping</div>
              <div style="font-size: 10px; color: #4b5563;">H-52 Darshan Villa Society, New Naroda, Ahmedabad - 382346, Gujarat</div>
              <div style="font-size: 10px; font-weight: 700; margin-top: 2px;">GSTIN: <span style="font-family: monospace;">24AAACJ1234F1Z1</span> | State: Gujarat (24)</div>
            </div>
            <div style="text-align: right;">
              <span class="ti-badge">ORIGINAL FOR RECIPIENT</span>
              <div style="font-size: 13px; font-weight: 800; margin-top: 6px; color: #1e3a8a;">TAX INVOICE</div>
              <div style="font-size: 11px; font-weight: 700;">Inv #: ${sale.invoiceNo}</div>
              <div style="font-size: 10px; color: #4b5563;">Date: ${window.FormatUtil.formatDate(sale.invoiceDate)}</div>
              <div style="font-size: 10px; color: #4b5563;">Due Date: ${window.FormatUtil.formatDate(sale.dueDate || sale.invoiceDate)}</div>
            </div>
          </div>

          <div class="ti-grid">
            <div class="ti-box">
              <div class="ti-box-title">BILLED TO (BUYER)</div>
              <div style="font-size: 11px; font-weight: 700; color: #111827;">${cust.name || sale.customerName || 'Walk-in Client'}</div>
              <div style="font-size: 10px; color: #4b5563;">${cust.address || sale.billingAddress || '-'}</div>
              <div style="font-size: 10px; margin-top: 4px;"><strong>GSTIN:</strong> ${cust.gstin || sale.billingGstin || 'Unregistered'}</div>
              <div style="font-size: 10px;"><strong>Phone:</strong> ${cust.phone || '-'}</div>
            </div>
            <div class="ti-box">
              <div class="ti-box-title">SHIPPED TO &amp; DISPATCH DETAILS</div>
              <div style="font-size: 10px; color: #4b5563;">${sale.deliveryAddress || cust.address || '-'}</div>
              <div style="font-size: 10px; margin-top: 4px;"><strong>Transporter:</strong> ${sale.transporter || 'Direct Handover'}</div>
              <div style="font-size: 10px;"><strong>Vehicle Number:</strong> ${sale.vehicleNumber || 'Not Specified'}</div>
              <div style="font-size: 10px;"><strong>Payment Terms:</strong> ${sale.paymentTerms || 'Immediate'}</div>
            </div>
          </div>

          <table class="ti-table">
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th>Item Description / Specification</th>
                <th style="width: 60px;">HSN/SAC</th>
                <th style="width: 50px; text-align: right;">Qty</th>
                <th style="width: 40px;">Unit</th>
                <th style="width: 70px; text-align: right;">Rate (₹)</th>
                <th style="width: 75px; text-align: right;">Taxable (₹)</th>
                <th style="width: 50px; text-align: right;">GST%</th>
                <th style="width: 80px; text-align: right;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${lines.map((l, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td style="font-weight: 600;">${l.itemDescription || l.description || l.itemCode}</td>
                  <td>${l.itemHsn || '73063000'}</td>
                  <td style="text-align: right;">${l.quantity || 1}</td>
                  <td>${l.itemUnit || 'PCS'}</td>
                  <td style="text-align: right;">${window.FormatUtil.formatRupees(l.rate || 0)}</td>
                  <td style="text-align: right;">${window.FormatUtil.formatRupees((l.quantity || 1) * (l.rate || 0) - (l.discountAmount || 0))}</td>
                  <td style="text-align: right;">${l.gstPercent || 18}%</td>
                  <td style="text-align: right; font-weight: 700;">${window.FormatUtil.formatRupees(l.totalAmount || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="ti-totals-grid">
            <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; font-size: 9.5px;">
              <div style="font-weight: 700; margin-bottom: 4px;">BANK DETAILS FOR REMITTANCE</div>
              <div>Bank Name: <strong>HDFC Bank Ltd</strong></div>
              <div>Account Name: <strong>JASVI INDUSTRIES</strong></div>
              <div>Account No: <strong>50200088991122</strong></div>
              <div>IFSC Code: <strong>HDFC0001234</strong> (Branch: Nikol, Ahmedabad)</div>
              <div style="margin-top: 8px; font-weight: 700;">TERMS &amp; CONDITIONS</div>
              <div>1. Goods once sold will not be taken back without prior inspection memo.</div>
              <div>2. Subject to Ahmedabad jurisdiction only.</div>
            </div>

            <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; font-size: 10.5px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Taxable Amount:</span>
                <strong>${window.FormatUtil.formatRupees(sale.subtotal || sale.taxableAmount || 0)}</strong>
              </div>
              ${!isInterstate ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Central GST (CGST):</span>
                  <span>${window.FormatUtil.formatRupees(cgst)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>State GST (SGST):</span>
                  <span>${window.FormatUtil.formatRupees(sgst)}</span>
                </div>
              ` : `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Integrated GST (IGST):</span>
                  <span>${window.FormatUtil.formatRupees(igst)}</span>
                </div>
              `}
              ${sale.chargeAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Freight &amp; Transportation:</span>
                  <span>${window.FormatUtil.formatRupees(sale.chargeAmount)}</span>
                </div>
              ` : ''}
              <div style="border-top: 2px solid #111827; margin-top: 6px; padding-top: 6px; display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; color: #0284c7;">
                <span>GRAND TOTAL:</span>
                <span>${window.FormatUtil.formatRupees(sale.totalAmount || 0)}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 28px; padding-top: 14px; border-top: 1px dashed #d1d5db;">
            <div style="font-size: 9px; color: #6b7280;">This is a computer generated tax invoice.</div>
            <div style="text-align: right;">
              <div style="font-size: 10px; font-weight: 700;">For, JASVI INDUSTRIES</div>
              <div style="margin-top: 36px; font-size: 9px; color: #374151;">Authorized Signatory</div>
            </div>
          </div>

          <div class="no-print" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn btn-secondary" onclick="document.getElementById('printable-invoice-modal').classList.remove('open')">Close Preview</button>
            <button class="btn btn-primary" onclick="window.print()">&#128438; Print Invoice Now</button>
          </div>
        </div>
      `;

      printContainer.classList.add('open');
    } catch (err) {
      window.AppDialogService.showToast('Unable to prepare print invoice: ' + err.message, 'error');
    }
  },

  async cancelInvoice(invoiceNo) {
    if (!confirm(`Are you sure you want to cancel Invoice ${invoiceNo}? This action will void the transaction.`)) return;
    try {
      await window.OperationsService.cancelSale(invoiceNo);
      window.AppDialogService.showToast(`Invoice ${invoiceNo} marked CANCELLED`, 'success');
      this.closeInvoiceDrawer();
      this.loadSales();
      if (window.DashboardController) window.DashboardController.refresh();
    } catch (e) {
      window.AppDialogService.showToast('Failed to cancel invoice: ' + e.message, 'error');
    }
  },

  convertQuoteToInvoice(quoteNo) {
    this.openNewInvoiceModal();
    window.AppDialogService.showToast(`Pre-filling draft from quotation ${quoteNo}`, 'info');
  }
};
