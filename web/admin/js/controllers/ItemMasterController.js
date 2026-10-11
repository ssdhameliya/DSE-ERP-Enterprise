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
      tbody.innerHTML = this.itemsCache.map(i => `
        <tr>
          <td style="font-weight: 700; color: var(--cyan);">${i.code}</td>
          <td style="font-weight: 600;">${i.description || i.name}</td>
          <td>${i.hsnCode || '73181500'}</td>
          <td>${i.taxRate || 18}%</td>
          <td style="font-weight: 700;">${window.FormatUtil.formatRupees(i.salePrice || 0)}</td>
          <td>${window.FormatUtil.formatRupees(i.purchasePrice || 0)}</td>
          <td style="font-weight: 700; color: #34d399;">${window.FormatUtil.formatNumber(i.currentStock || 0)} PCS</td>
          <td>
            <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;" onclick="window.BarcodeStudioController.quickGenerate('${i.code}')">Barcode</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #f87171;">${e.message}</td></tr>`;
    }
  },

  filterItems(query) {
    const tbody = document.getElementById('items-table-tbody');
    if (!tbody) return;
    const q = (query || '').toLowerCase();
    const filtered = this.itemsCache.filter(i =>
      (i.code && i.code.toLowerCase().includes(q)) ||
      (i.description && i.description.toLowerCase().includes(q))
    );
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim);">No matching items.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map(i => `
      <tr>
        <td style="font-weight: 700; color: var(--cyan);">${i.code}</td>
        <td style="font-weight: 600;">${i.description || i.name}</td>
        <td>${i.hsnCode || '73181500'}</td>
        <td>${i.taxRate || 18}%</td>
        <td style="font-weight: 700;">${window.FormatUtil.formatRupees(i.salePrice || 0)}</td>
        <td>${window.FormatUtil.formatRupees(i.purchasePrice || 0)}</td>
        <td style="font-weight: 700; color: #34d399;">${window.FormatUtil.formatNumber(i.currentStock || 0)} PCS</td>
        <td>
          <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;" onclick="window.BarcodeStudioController.quickGenerate('${i.code}')">Barcode</button>
        </td>
      </tr>
    `).join('');
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
          <td style="font-weight:700; color:var(--cyan);">${c.code || c.name}</td>
          <td>${c.name}</td>
          <td><span class="badge badge-paid">ACTIVE</span></td>
          <td>${c.itemCount || 0}</td>
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
    const payload = {
      code: document.getElementById('item-code').value.trim(),
      description: document.getElementById('item-name').value.trim(),
      hsnCode: document.getElementById('item-hsn').value.trim(),
      taxRate: parseFloat(document.getElementById('item-tax').value) || 18,
      salePrice: parseFloat(document.getElementById('item-price').value) || 0,
      purchasePrice: parseFloat(document.getElementById('item-cost').value) || 0,
      currentStock: parseFloat(document.getElementById('item-stock').value) || 0,
      active: true
    };
    try {
      await window.MasterService.createItem(payload);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      window.AppDialogService.showToast(`Item ${payload.code} added to master catalog!`, 'success');
      window.AppDialogService.closeModal('modal-new-item');
      this.loadItems();
      if (window.DashboardController) window.DashboardController.refresh();
    } catch (err) {
      window.AppDialogService.showToast(err.message, 'error');
    }
  }
};
