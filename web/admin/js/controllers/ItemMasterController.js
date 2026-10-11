/**
 * Jasvi Industries ERP - ItemMasterController
 * Item Master catalog and Categories lookup matching desktop ItemMasterController
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
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim);">No items in catalog.</td></tr>`;
        return;
      }
      tbody.innerHTML = this.itemsCache.map(i => {
        const code = i.itemCode || i.code || '-';
        const desc = i.description || i.name || '-';
        const hsn = i.hsn || i.hsnCode || '73181500';
        const tax = i.gst != null ? i.gst : (i.taxRate != null ? i.taxRate : 18);
        const salePrice = i.sellingPrice != null ? i.sellingPrice : (i.salePrice || 0);
        const purPrice = i.purchasePrice != null ? i.purchasePrice : 0;
        const stock = i.openingStock != null ? i.openingStock : (i.currentStock || 0);
        return `
          <tr>
            <td style="font-weight: 700; color: var(--cyan);">${code}</td>
            <td style="font-weight: 600;">${desc}</td>
            <td>${hsn}</td>
            <td>${tax}%</td>
            <td style="font-weight: 700;">${window.FormatUtil.formatRupees(salePrice)}</td>
            <td>${window.FormatUtil.formatRupees(purPrice)}</td>
            <td style="font-weight: 700; color: #34d399;">${window.FormatUtil.formatNumber(stock)} PCS</td>
            <td>
              <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;" onclick="window.BarcodeStudioController.quickGenerate('${code}')">Barcode</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  async loadInventory() {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;
    try {
      const items = this.itemsCache.length ? this.itemsCache : await window.MasterService.getItems();
      this.itemsCache = items || [];
      if (this.itemsCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No inventory records found.</td></tr>`;
        return;
      }
      tbody.innerHTML = this.itemsCache.map(i => {
        const code = i.itemCode || i.code || '-';
        const desc = i.description || i.name || '-';
        const unit = i.unit || 'PCS';
        const stock = i.openingStock != null ? i.openingStock : (i.currentStock || 0);
        const valRate = i.purchasePrice || i.sellingPrice || 0;
        const totalVal = stock * valRate;
        return `
          <tr>
            <td style="font-weight: 700; color: var(--cyan);">${code}</td>
            <td style="font-weight: 600;">${desc}</td>
            <td>${unit}</td>
            <td style="font-weight: 700; color: #34d399;">${window.FormatUtil.formatNumber(stock)} ${unit}</td>
            <td>${window.FormatUtil.formatRupees(valRate)}</td>
            <td style="font-weight: 700;">${window.FormatUtil.formatRupees(totalVal)}</td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  filterItems(query) {
    const tbody = document.getElementById('items-table-tbody');
    if (!tbody) return;
    const q = (query || '').toLowerCase();
    const filtered = this.itemsCache.filter(i => {
      const code = (i.itemCode || i.code || '').toLowerCase();
      const desc = (i.description || i.name || '').toLowerCase();
      return code.includes(q) || desc.includes(q);
    });
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim);">No matching items.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map(i => {
      const code = i.itemCode || i.code || '-';
      const desc = i.description || i.name || '-';
      const hsn = i.hsn || i.hsnCode || '73181500';
      const tax = i.gst != null ? i.gst : (i.taxRate != null ? i.taxRate : 18);
      const salePrice = i.sellingPrice != null ? i.sellingPrice : (i.salePrice || 0);
      const purPrice = i.purchasePrice != null ? i.purchasePrice : 0;
      const stock = i.openingStock != null ? i.openingStock : (i.currentStock || 0);
      return `
        <tr>
          <td style="font-weight: 700; color: var(--cyan);">${code}</td>
          <td style="font-weight: 600;">${desc}</td>
          <td>${hsn}</td>
          <td>${tax}%</td>
          <td style="font-weight: 700;">${window.FormatUtil.formatRupees(salePrice)}</td>
          <td>${window.FormatUtil.formatRupees(purPrice)}</td>
          <td style="font-weight: 700; color: #34d399;">${window.FormatUtil.formatNumber(stock)} PCS</td>
          <td>
            <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;" onclick="window.BarcodeStudioController.quickGenerate('${code}')">Barcode</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  async loadCategories() {
    const tbody = document.getElementById('masters-table-tbody');
    if (!tbody) return;
    try {
      const cats = await window.MasterService.getCategories();
      if (!cats || cats.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim);">No categories found.</td></tr>`;
        return;
      }
      tbody.innerHTML = cats.map(c => `
        <tr>
          <td style="font-weight:700; color:var(--cyan);">${c.categoryCode || c.code || c.name}</td>
          <td>${c.categoryName || c.name}</td>
          <td><span class="badge badge-paid">ACTIVE</span></td>
          <td>${c.valueCount != null ? c.valueCount : (c.itemCount || 0)}</td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  openNewItemModal() {
    window.AppDialogService.openModal('modal-new-item');
  },

  async handleItemSave(e) {
    e.preventDefault();
    const code = document.getElementById('item-code').value.trim();
    const desc = document.getElementById('item-name').value.trim();
    const hsn = document.getElementById('item-hsn').value.trim() || '73181500';
    const tax = parseFloat(document.getElementById('item-tax').value) || 18;
    const price = parseFloat(document.getElementById('item-price').value) || 0;
    const cost = parseFloat(document.getElementById('item-cost').value) || 0;
    const stock = parseFloat(document.getElementById('item-stock').value) || 0;

    const payload = {
      itemCode: code,
      code: code,
      description: desc,
      hsn: hsn,
      hsnCode: hsn,
      gst: tax,
      taxRate: tax,
      sellingPrice: price,
      salePrice: price,
      purchasePrice: cost,
      openingStock: stock,
      currentStock: stock,
      unit: 'PCS',
      active: true
    };
    try {
      await window.MasterService.createItem(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Item ${code} added to master catalog!`, 'success');
      window.AppDialogService.closeModal('modal-new-item');
      this.loadItems();
      this.loadInventory();
      if (window.DashboardController) window.DashboardController.refresh();
    } catch (err) {
      window.AppDialogService.showToast(err.message, 'error');
    }
  }
};
