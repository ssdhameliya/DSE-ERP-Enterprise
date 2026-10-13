/**
 * Jasvi Industries ERP - ItemMasterController
 * Desktop Parity Implementation for ItemMasterController.java & ItemDialogController.java
 * SKU Catalog, Inventory Ledger, Multi-Select Bulk Actions & Dynamic Valuation
 */
window.ItemMasterController = (function() {
  let items = [];
  let filteredItems = [];
  let selectedCodes = new Set();
  let editingItemCode = null;
  let editingRowVersion = 0;
  let cachedCategories = [];
  let cachedUnits = ['PCS', 'NOS', 'MTR', 'KGS', 'SET', 'BOX', 'PKT', 'ROLL', 'TON'];

  function formatMoney(amount) {
    return '₹ ' + (parseFloat(amount) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // ==========================================
  // 1. ITEM MASTER REGISTER (ItemMaster.fxml)
  // ==========================================

  async function loadItems() {
    const tbody = document.getElementById('items-table-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="18" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading item catalog...</td></tr>`;
    }

    selectedCodes.clear();
    updateSelectionFooter();

    try {
      const data = await window.MasterService.getItems();
      items = data || [];
      filteredItems = [...items];

      updateKpis(items);
      renderTable(filteredItems);

    } catch (err) {
      console.error('Failed to load items:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="18" style="text-align:center; padding:30px; color:var(--red);">⚠️ Failed to load item catalog: ${err.message || 'Server error'}</td></tr>`;
      }
    }
  }

  function updateKpis(data) {
    const totalItems = data.length;
    const categoriesSet = new Set(data.map(i => i.category || 'General'));
    const lowStockCount = data.filter(i => (parseFloat(i.openingStock) || 0) <= (parseFloat(i.minimumStock) || 10)).length;
    const totalValuation = data.reduce((sum, i) => sum + ((parseFloat(i.openingStock) || 0) * (parseFloat(i.purchasePrice) || 0)), 0);

    const totalEl = document.getElementById('item-kpi-total');
    const catEl = document.getElementById('item-kpi-categories');
    const lowEl = document.getElementById('item-kpi-low-stock');
    const valEl = document.getElementById('item-kpi-value');

    if (totalEl) totalEl.innerText = totalItems.toLocaleString();
    if (catEl) catEl.innerText = categoriesSet.size.toLocaleString();
    if (lowEl) lowEl.innerText = lowStockCount.toLocaleString();
    if (valEl) valEl.innerText = formatMoney(totalValuation);
  }

  function filterItems(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      filteredItems = [...items];
    } else {
      filteredItems = items.filter(i => {
        const code = (i.itemCode || '').toLowerCase();
        const desc = (i.description || '').toLowerCase();
        const cat = (i.category || '').toLowerCase();
        const brand = (i.brand || '').toLowerCase();
        const hsn = (i.hsn || '').toLowerCase();
        return code.includes(q) || desc.includes(q) || cat.includes(q) || brand.includes(q) || hsn.includes(q);
      });
    }
    renderTable(filteredItems);
  }

  function renderTable(rows) {
    const tbody = document.getElementById('items-table-tbody');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="18" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:1.8rem; margin-bottom:8px;">🏷️</div>
            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">No items found</div>
            <div style="font-size:0.78rem;">Create a new item or adjust the current search query.</div>
          </td>
        </tr>
      `;
      updateSelectionFooter();
      return;
    }

    tbody.innerHTML = rows.map((i, idx) => {
      const isSelected = selectedCodes.has(i.itemCode);
      const stock = parseFloat(i.openingStock) || 0;
      const minStock = parseFloat(i.minimumStock) || 10;
      const isLow = stock <= minStock;

      return `
        <tr style="${isSelected ? 'background:rgba(56,189,248,0.06);' : ''}">
          <td style="text-align:center;">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="window.ItemMasterController.toggleSelectItem('${i.itemCode}', this.checked)">
          </td>
          <td style="font-weight:700; color:var(--cyan); font-family:'Space Grotesk', monospace;">${i.itemCode}</td>
          <td style="font-weight:600; color:var(--text-main);">${i.description}</td>
          <td><span class="pill-badge pill-neutral">${i.category || 'General'}</span></td>
          <td style="color:var(--text-muted);">${i.brand || '-'}</td>
          <td style="color:var(--text-muted);">${i.material || '-'}</td>
          <td style="color:var(--text-muted);">${i.size || '-'}</td>
          <td style="font-weight:600;">${i.unit || 'PCS'}</td>
          <td style="font-family:monospace;">${i.hsn || '73063000'}</td>
          <td style="text-align:right;">${(i.gst || 18).toFixed(1)}%</td>
          <td style="text-align:right;">${(i.discountPercent || 0).toFixed(1)}%</td>
          <td style="text-align:right; font-weight:600;">${formatMoney(i.purchasePrice)}</td>
          <td style="text-align:right; font-weight:700; color:var(--yellow);">${formatMoney(i.sellingPrice)}</td>
          <td style="text-align:right; font-weight:700; color:${isLow ? 'var(--red)' : 'var(--green)'};">
            ${stock.toFixed(2)} ${i.unit || 'PCS'}
            ${isLow ? '<span style="font-size:0.65rem; color:var(--red); display:block; font-weight:800;">LOW STOCK</span>' : ''}
          </td>
          <td style="text-align:right; color:var(--text-muted);">${minStock.toFixed(2)}</td>
          <td>${i.location || '-'}</td>
          <td style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${i.remarks || ''}">${i.remarks || '-'}</td>
          <td style="text-align:center;">
            <div style="display:flex; gap:4px; justify-content:center;">
              <button class="btn btn-secondary btn-sm" onclick="window.ItemMasterController.openEditItemModal('${i.itemCode}')" style="padding:2px 6px; font-size:0.72rem;" title="Edit Item">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="window.ItemMasterController.deleteSingleItem('${i.itemCode}', ${i.rowVersion || 0})" style="padding:2px 6px; font-size:0.72rem;" title="Delete Item">🗑️</button>
              <button class="btn btn-secondary btn-sm" onclick="window.ItemMasterController.printBarcode('${i.itemCode}')" style="padding:2px 6px; font-size:0.72rem;" title="Print Barcode">🏷️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    updateSelectionFooter();
  }

  function toggleSelectItem(code, checked) {
    if (checked) selectedCodes.add(code); else selectedCodes.delete(code);
    updateSelectionFooter();
  }

  function toggleSelectAll(checked) {
    if (checked) {
      filteredItems.forEach(i => selectedCodes.add(i.itemCode));
    } else {
      selectedCodes.clear();
    }
    renderTable(filteredItems);
  }

  function updateSelectionFooter() {
    const selCountEl = document.getElementById('item-selected-count');
    const delBtn = document.getElementById('item-btn-delete-selected');
    const recCountEl = document.getElementById('item-record-count');

    if (selCountEl) selCountEl.innerText = `${selectedCodes.size} selected`;
    if (delBtn) {
      delBtn.disabled = selectedCodes.size === 0;
      delBtn.innerText = `Delete Selected (${selectedCodes.size})`;
    }
    if (recCountEl) recCountEl.innerText = `${filteredItems.length} of ${items.length} items in catalog`;
  }

  // ==========================================
  // 2. ITEM DIALOG MODAL (Itemdialog.fxml)
  // ==========================================

  async function openNewItemModal() {
    editingItemCode = null;
    editingRowVersion = 0;

    const modal = document.getElementById('modal-item-dialog');
    if (!modal) return;

    document.getElementById('item-dialog-title').innerText = 'Add Item';
    document.getElementById('item-dialog-subtitle').innerText = 'Add a new item to your inventory catalog';

    // Fetch next auto item code from server
    try {
      const nextRes = await window.MasterService.getNextItemCode();
      document.getElementById('m-item-code').value = nextRes?.code || 'ITEM' + Date.now().toString().slice(-4);
    } catch {
      document.getElementById('m-item-code').value = 'ITEM' + Date.now().toString().slice(-4);
    }

    // Populate categories
    await loadCategoriesDropdown();

    document.getElementById('m-item-desc').value = '';
    document.getElementById('m-item-category').value = '';
    document.getElementById('m-item-unit').value = 'PCS';
    document.getElementById('m-item-hsn').value = '73063000';
    document.getElementById('m-item-gst').value = '18';
    document.getElementById('m-item-discount').value = '0';
    document.getElementById('m-item-purchase-price').value = '0.00';
    document.getElementById('m-item-selling-price').value = '0.00';
    document.getElementById('m-item-remarks').value = 'Standard stock item';
    document.getElementById('m-item-opening-stock').value = '0.00';
    document.getElementById('m-item-min-stock').value = '10.00';
    document.getElementById('m-item-location').value = '';

    modal.style.display = 'flex';
  }

  async function openEditItemModal(code) {
    editingItemCode = code;
    const item = items.find(i => i.itemCode === code);
    if (!item) return;

    editingRowVersion = item.rowVersion || 0;

    const modal = document.getElementById('modal-item-dialog');
    if (!modal) return;

    document.getElementById('item-dialog-title').innerText = 'Edit Item';
    document.getElementById('item-dialog-subtitle').innerText = `Modify inventory details for item ${code}`;

    await loadCategoriesDropdown();

    document.getElementById('m-item-code').value = item.itemCode;
    document.getElementById('m-item-desc').value = item.description || '';
    document.getElementById('m-item-category').value = item.category || '';
    document.getElementById('m-item-unit').value = item.unit || 'PCS';
    document.getElementById('m-item-hsn').value = item.hsn || '73063000';
    document.getElementById('m-item-gst').value = (item.gst || 18).toString();
    document.getElementById('m-item-discount').value = (item.discountPercent || 0).toString();
    document.getElementById('m-item-purchase-price').value = (parseFloat(item.purchasePrice) || 0).toFixed(2);
    document.getElementById('m-item-selling-price').value = (parseFloat(item.sellingPrice) || 0).toFixed(2);
    document.getElementById('m-item-remarks').value = item.remarks || '';
    document.getElementById('m-item-opening-stock').value = (parseFloat(item.openingStock) || 0).toFixed(2);
    document.getElementById('m-item-min-stock').value = (parseFloat(item.minimumStock) || 0).toFixed(2);
    document.getElementById('m-item-location').value = item.location || '';

    modal.style.display = 'flex';
  }

  async function loadCategoriesDropdown() {
    try {
      const catList = await window.MasterService.getCategories();
      cachedCategories = catList || [];
      const catSel = document.getElementById('m-item-category');
      if (catSel) {
        catSel.innerHTML = `<option value="">Select category *</option>` +
          cachedCategories.map(c => `<option value="${c.categoryName || c.name}">${c.categoryName || c.name}</option>`).join('');
      }
    } catch (e) {
      console.warn('Failed to load categories:', e);
    }
  }

  async function submitSaveItem() {
    const code = document.getElementById('m-item-code')?.value?.trim();
    const desc = document.getElementById('m-item-desc')?.value?.trim();
    const cat = document.getElementById('m-item-category')?.value?.trim();
    const unit = document.getElementById('m-item-unit')?.value?.trim() || 'PCS';
    const hsn = document.getElementById('m-item-hsn')?.value?.trim();
    const gst = parseFloat(document.getElementById('m-item-gst')?.value) || 0;
    const disc = parseFloat(document.getElementById('m-item-discount')?.value) || 0;
    const purPrice = parseFloat(document.getElementById('m-item-purchase-price')?.value) || 0;
    const sellPrice = parseFloat(document.getElementById('m-item-selling-price')?.value) || 0;
    const remarks = document.getElementById('m-item-remarks')?.value?.trim();
    const openingStock = parseFloat(document.getElementById('m-item-opening-stock')?.value) || 0;
    const minStock = parseFloat(document.getElementById('m-item-min-stock')?.value) || 0;
    const location = document.getElementById('m-item-location')?.value?.trim() || '';

    if (!code) { alert('Item Code is required.'); return; }
    if (!desc) { alert('Description is required.'); return; }
    if (!cat) { alert('Category is required.'); return; }
    if (!hsn) { alert('HSN Code is required.'); return; }

    const payload = {
      id: null,
      itemCode: code,
      description: desc,
      category: cat,
      brand: 'Standard',
      material: '',
      size: '',
      unit: unit,
      hsn: hsn,
      gst: gst,
      discountPercent: disc,
      purchasePrice: purPrice,
      sellingPrice: sellPrice,
      openingStock: openingStock,
      minimumStock: minStock,
      reservedStock: 0,
      location: location,
      remarks: remarks || 'Active Item',
      active: true,
      rowVersion: editingRowVersion
    };

    const btn = document.getElementById('btn-save-item-dialog');
    if (btn) { btn.disabled = true; btn.innerText = 'Saving Item...'; }

    try {
      if (editingItemCode) {
        await window.MasterService.updateItem(payload);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Item ${code} updated successfully!`);
      } else {
        await window.MasterService.createItem(payload);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Item ${code} added to catalog!`);
      }

      closeModal('modal-item-dialog');
      loadItems();

    } catch (err) {
      console.error('Save item failed:', err);
      alert('Failed to save item: ' + (err.message || 'Server error'));
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = 'Save Item'; }
    }
  }

  async function deleteSingleItem(code, rowVersion = 0) {
    if (!confirm(`Are you sure you want to delete item ${code}?\n\nThis will remove the SKU from the product catalog.`)) return;
    try {
      await window.MasterService.deleteItem(code, rowVersion);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Item ${code} deleted.`);
      loadItems();
    } catch (err) {
      alert('Delete failed: ' + (err.message || 'Server error'));
    }
  }

  async function deleteSelectedItems() {
    if (selectedCodes.size === 0) return;
    const count = selectedCodes.size;
    if (!confirm(`Delete ${count} selected item(s) from catalog?\n\nWARNING: Items used in existing transactions cannot be removed.`)) return;

    try {
      const codeList = Array.from(selectedCodes);
      const res = await window.MasterService.bulkDeleteItems(codeList);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(res?.message || `${count} item(s) deleted.`);
      loadItems();
    } catch (err) {
      alert('Bulk delete failed: ' + (err.message || 'Server error'));
    }
  }

  function printBarcode(code) {
    if (window.BarcodeStudioController) {
      window.NavigationRouter.selectNav('view-barcode-studio');
      window.BarcodeStudioController.quickGenerate(code);
    } else {
      alert(`Print barcode for SKU: ${code}`);
    }
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
  }

  return {
    loadItems,
    filterItems,
    toggleSelectItem,
    toggleSelectAll,
    openNewItemModal,
    openEditItemModal,
    submitSaveItem,
    deleteSingleItem,
    deleteSelectedItems,
    printBarcode,
    closeModal,
    loadCategories() { loadCategoriesDropdown(); },
    loadInventory() { loadItems(); },
    exportItems() { window.open('/api/master/items/export/excel', '_blank'); },
    importItems() { alert('Import items via Excel wizard.'); }
  };
})();
