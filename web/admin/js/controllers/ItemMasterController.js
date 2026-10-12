/**
 * Jasvi Industries ERP - ItemMasterController
 * SKU Catalog, Inventory Ledger & Stock Adjustment
 */
window.ItemMasterController = {
  itemsCache: [],

  async loadItems() {
    const tbody = document.getElementById('items-table-tbody');
    if (!tbody) return;
    try {
      const items = await window.MasterService.getItems();
      this.itemsCache = items || [];
      if (this.itemsCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 24px;">No items found in catalog.</td></tr>`;
        return;
      }
      tbody.innerHTML = this.itemsCache.map(i => {
        const code = i.itemCode || i.code || '-';
        const desc = i.description || i.name || '-';
        const category = i.category || 'General';
        const hsn = i.hsn || i.hsnCode || '73063000';
        const tax = i.gst != null ? i.gst : (i.taxRate != null ? i.taxRate : 18);
        const salePrice = i.sellingPrice != null ? i.sellingPrice : (i.salePrice || 0);
        const purPrice = i.purchasePrice != null ? i.purchasePrice : 0;
        const stock = i.openingStock != null ? i.openingStock : (i.currentStock || 0);
        const isLow = stock <= (i.minimumStock || 10);
        return `
          <tr>
            <td style="font-weight: 700; color: var(--cyan);">${code}</td>
            <td style="font-weight: 600;">${desc}</td>
            <td><span class="badge" style="background: rgba(255,255,255,0.06);">${category}</span></td>
            <td>${hsn}</td>
            <td>${tax}%</td>
            <td style="font-weight: 700;">${window.FormatUtil.formatRupees(salePrice)}</td>
            <td>${window.FormatUtil.formatRupees(purPrice)}</td>
            <td style="font-weight: 700; color: ${isLow ? '#f87171' : '#34d399'};">
              ${window.FormatUtil.formatNumber(stock)} ${i.unit || 'PCS'}
              ${isLow ? '<span style="font-size:0.65rem; color:#f87171; display:block;">LOW STOCK</span>' : ''}
            </td>
            <td>
              <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.72rem;" onclick="window.ItemMasterController.openStockAdjustmentModal('${code}')" title="Adjust Physical Stock">Adjust</button>
              <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.72rem; margin-left: 4px;" onclick="window.BarcodeStudioController.quickGenerate('${code}')" title="Print Barcode">Label</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #f87171; padding: 24px;">${e.message}</td></tr>`;
    }
  },

  filterItems(query) {
    const tbody = document.getElementById('items-table-tbody');
    if (!tbody) return;
    const q = (query || '').toLowerCase().trim();
    const filtered = this.itemsCache.filter(i => {
      const code = (i.itemCode || i.code || '').toLowerCase();
      const desc = (i.description || i.name || '').toLowerCase();
      const hsn = (i.hsn || '').toLowerCase();
      return code.includes(q) || desc.includes(q) || hsn.includes(q);
    });
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 24px;">No matching materials found.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map(i => {
      const code = i.itemCode || i.code || '-';
      const desc = i.description || i.name || '-';
      const category = i.category || 'General';
      const hsn = i.hsn || i.hsnCode || '73063000';
      const tax = i.gst != null ? i.gst : (i.taxRate != null ? i.taxRate : 18);
      const salePrice = i.sellingPrice != null ? i.sellingPrice : (i.salePrice || 0);
      const purPrice = i.purchasePrice != null ? i.purchasePrice : 0;
      const stock = i.openingStock != null ? i.openingStock : (i.currentStock || 0);
      const isLow = stock <= (i.minimumStock || 10);
      return `
        <tr>
          <td style="font-weight: 700; color: var(--cyan);">${code}</td>
          <td style="font-weight: 600;">${desc}</td>
          <td><span class="badge" style="background: rgba(255,255,255,0.06);">${category}</span></td>
          <td>${hsn}</td>
          <td>${tax}%</td>
          <td style="font-weight: 700;">${window.FormatUtil.formatRupees(salePrice)}</td>
          <td>${window.FormatUtil.formatRupees(purPrice)}</td>
          <td style="font-weight: 700; color: ${isLow ? '#f87171' : '#34d399'};">
            ${window.FormatUtil.formatNumber(stock)} ${i.unit || 'PCS'}
          </td>
          <td>
            <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.72rem;" onclick="window.ItemMasterController.openStockAdjustmentModal('${code}')">Adjust</button>
            <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.72rem; margin-left: 4px;" onclick="window.BarcodeStudioController.quickGenerate('${code}')">Label</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  async loadInventory() {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;
    try {
      const items = this.itemsCache.length ? this.itemsCache : await window.MasterService.getItems();
      this.itemsCache = items || [];
      if (this.itemsCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 24px;">No inventory valuation records.</td></tr>`;
        return;
      }
      tbody.innerHTML = this.itemsCache.map(i => {
        const code = i.itemCode || i.code || '-';
        const desc = i.description || i.name || '-';
        const unit = i.unit || 'PCS';
        const stock = i.openingStock != null ? i.openingStock : (i.currentStock || 0);
        const purPrice = i.purchasePrice || 0;
        const valuation = stock * purPrice;
        return `
          <tr>
            <td style="font-weight: 700; color: var(--cyan);">${code}</td>
            <td style="font-weight: 600;">${desc}</td>
            <td style="font-weight: 700; color: #34d399;">${window.FormatUtil.formatNumber(stock)} ${unit}</td>
            <td>Main Warehouse</td>
            <td>${window.FormatUtil.formatRupees(purPrice)}</td>
            <td style="font-weight: 700; color: var(--cyan);">${window.FormatUtil.formatRupees(valuation)}</td>
            <td>
              <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.72rem;" onclick="window.ItemMasterController.openStockAdjustmentModal('${code}')">Adjust Stock</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  openNewItemModal() {
    const codeEl = document.getElementById('item-code');
    if (codeEl) codeEl.value = 'ITM' + Date.now().toString().slice(-6);
    window.AppDialogService.openModal('modal-new-item');
  },

  async handleItemSave(e) {
    e.preventDefault();
    const itemCode = document.getElementById('item-code').value.trim();
    const description = document.getElementById('item-desc').value.trim();
    const category = document.getElementById('item-cat').value || 'General';
    const hsn = document.getElementById('item-hsn').value.trim() || '73063000';
    const unit = document.getElementById('item-unit').value || 'PCS';
    const gst = parseFloat(document.getElementById('item-tax').value || 18);
    const sellingPrice = parseFloat(document.getElementById('item-sale-price').value || 0);
    const purchasePrice = parseFloat(document.getElementById('item-pur-price').value || 0);
    const openingStock = parseFloat(document.getElementById('item-stock').value || 0);
    const minimumStock = parseFloat(document.getElementById('item-min-stock')?.value || 10);

    const payload = {
      itemCode, description, category, hsn, unit, gst,
      sellingPrice, purchasePrice, openingStock, minimumStock,
      active: true
    };

    try {
      await window.MasterService.createItem(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Item ${itemCode} added to catalog!`, 'success');
      window.AppDialogService.closeModal('modal-new-item');
      this.loadItems();
      if (window.DashboardController) window.DashboardController.refresh();
    } catch (err) {
      window.AppDialogService.showToast('Failed to save item: ' + err.message, 'error');
    }
  },

  openStockAdjustmentModal(itemCode) {
    const item = this.itemsCache.find(i => (i.itemCode === itemCode || i.code === itemCode));
    document.getElementById('adj-item-code').value = itemCode;
    document.getElementById('adj-item-name').innerText = item ? `${item.description || item.name} (Current: ${item.openingStock || 0} ${item.unit || 'PCS'})` : itemCode;
    document.getElementById('adj-qty').value = '10';
    document.getElementById('adj-reason').value = 'Physical Audit Verification';
    window.AppDialogService.openModal('modal-stock-adjustment');
  },

  async handleStockAdjustmentSave(e) {
    e.preventDefault();
    const itemCode = document.getElementById('adj-item-code').value;
    const type = document.getElementById('adj-type').value; // 'IN' (Addition) or 'OUT' (Reduction)
    const quantity = parseFloat(document.getElementById('adj-qty').value || 0);
    const reason = document.getElementById('adj-reason').value.trim();

    try {
      await window.OperationsService.adjustStock({ itemCode, type, quantity, reason });
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Stock adjusted for ${itemCode}!`, 'success');
      window.AppDialogService.closeModal('modal-stock-adjustment');
      this.loadItems();
      this.loadInventory();
    } catch (err) {
      window.AppDialogService.showToast('Failed to adjust stock: ' + err.message, 'error');
    }
  }
};
