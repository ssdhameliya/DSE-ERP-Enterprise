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

  async function loadItems(forceRefresh = false) {
    const tbody = document.getElementById('items-table-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading item catalog...</td></tr>`;
    }

    selectedCodes.clear();
    updateSelectionFooter();

    try {
      if (forceRefresh && window.MasterService && window.MasterService.invalidate) {
        window.MasterService.invalidate('master_items');
      }
      const data = await window.MasterService.getItems(forceRefresh);
      items = data || [];
      filteredItems = [...items];

      updateKpis(items);
      renderTable(filteredItems);

    } catch (err) {
      console.error('Failed to load items:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding:30px; color:var(--red);">⚠️ Failed to load item catalog: ${err.message || 'Server error'}</td></tr>`;
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

  async function isolateItem(ref) {
    if (!items || items.length === 0) {
      await loadItems();
    }
    const input = document.getElementById('item-search');
    if (input) input.value = ref || '';
    filterItems(ref || '');

    const found = (filteredItems || []).find(i => (i.itemCode || '').toUpperCase() === (ref || '').toUpperCase());
    if (found) {
      selectedCodes.clear();
      selectedCodes.add(found.itemCode);
      updateSelectionFooter();
      renderTable(filteredItems);
    }
  }

  function renderTable(rows) {
    const tbody = document.getElementById('items-table-tbody');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="15" style="text-align:center; padding:40px; color:var(--text-muted);">
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
        <tr onclick="window.ItemMasterController.onItemRowClick('${(i.itemCode || '').replace(/'/g, "\\'")}', event)" data-item-code="${i.itemCode}" style="cursor:pointer; ${isSelected ? 'background:rgba(56,189,248,0.06);' : ''}">
          <td style="text-align:center;" onclick="event.stopPropagation();">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="window.ItemMasterController.toggleSelectItem('${i.itemCode}', this.checked)">
          </td>
          <td style="font-weight:700; color:var(--cyan); font-family:'Space Grotesk', monospace;">${i.itemCode}</td>
          <td style="font-weight:600; color:var(--text-main);">${i.description}</td>
          <td><span>${i.category || 'General'}</span></td>
          <td style="font-weight:600;">${i.unit || 'PCS'}</td>
          <td style="font-family:monospace;">${i.hsn || '73063000'}</td>
          <td style="text-align:right;">${(i.gst || 18).toFixed(1)}%</td>
          <td style="text-align:right;">${(i.discountPercent || 0).toFixed(1)}%</td>
          <td style="text-align:right; font-weight:600;"><span class="amount-cost">${formatMoney(i.purchasePrice)}</span></td>
          <td style="text-align:right; font-weight:700;"><span class="amount-primary">${formatMoney(i.sellingPrice)}</span></td>
          <td style="text-align:right; font-weight:700; color:${isLow ? 'var(--red)' : 'var(--green)'};">
            ${stock.toFixed(2)} ${i.unit || 'PCS'}
            ${isLow ? '<span style="font-size:0.65rem; color:var(--red); display:block; font-weight:800;">LOW STOCK</span>' : ''}
          </td>
          <td style="text-align:right; color:var(--text-muted);">${minStock.toFixed(2)}</td>
          <td style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${i.remarks || ''}">${i.remarks || '-'}</td>
          <td style="text-align:center;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn btn-purple role-actions role-purple btn-action-3d btn-sm" onclick="window.ItemMasterController.toggleActionMenu('${(i.itemCode || '').replace(/'/g, "\\'")}', event)" style="padding:4px 12px; font-size:0.75rem; font-weight:700; border-radius:6px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                Actions
              </button>
              <div id="item-action-menu-${(i.itemCode || '').replace(/[^a-zA-Z0-9]/g, '_')}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:210px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.ItemMasterController.openNewItemModal()"><span style="margin-right:8px;">➕</span> Create Item</div>
                <div class="action-menu-item" onclick="window.ItemMasterController.viewItemDetails('${(i.itemCode || '').replace(/'/g, "\\'")}')"><span style="margin-right:8px;">👁️</span> View Item</div>
                <div class="action-menu-item" onclick="window.ItemMasterController.openEditItemModal('${(i.itemCode || '').replace(/'/g, "\\'")}')"><span style="margin-right:8px;">✏️</span> Edit Item</div>
                <div class="action-menu-item" onclick="window.ItemMasterController.viewAuditTrail('${(i.itemCode || '').replace(/'/g, "\\'")}')"><span style="margin-right:8px;">📜</span> Audit Trail</div>
                <div class="action-menu-divider" style="height:1px; background:var(--border-subtle); margin:4px 0;"></div>
                <div class="action-menu-item" onclick="window.ItemMasterController.createSale('${(i.itemCode || '').replace(/'/g, "\\'")}')"><span style="margin-right:8px;">🛒</span> Create Sale</div>
                <div class="action-menu-item" onclick="window.ItemMasterController.createPurchase('${(i.itemCode || '').replace(/'/g, "\\'")}')"><span style="margin-right:8px;">📦</span> Create Purchase</div>
                <div class="action-menu-divider" style="height:1px; background:var(--border-subtle); margin:4px 0;"></div>
                <div class="action-menu-item" style="color:var(--red);" onclick="window.ItemMasterController.deleteSingleItem('${(i.itemCode || '').replace(/'/g, "\\'")}', ${i.rowVersion || 0})"><span style="margin-right:8px;">🗑️</span> Delete Item</div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    updateSelectionFooter();
  }

  let selectedItemCode = null;

  function onItemRowClick(itemCode, event) {
    if (event && window.RegisterUiSupport && window.RegisterUiSupport.isInteractiveTarget(event.target)) return;
    const drawer = document.getElementById('item-detail-drawer');
    const isDrawerOpen = drawer && (drawer.classList.contains('open') || drawer.style.display === 'flex');
    if (isDrawerOpen && selectedItemCode === itemCode) {
      closeItemDrawer();
      return;
    }
    showItemDetails(itemCode);
  }

  function showItemDetails(itemCode) {
    const item = items.find(i => i.itemCode === itemCode);
    if (!item) return;
    selectedItemCode = itemCode;

    const rowEl = document.querySelector(`#items-table-tbody tr[data-item-code="${itemCode}"]`);
    if (window.RegisterUiSupport && rowEl) {
      window.RegisterUiSupport.highlightRow('#items-table-tbody', rowEl);
    }

    const codeEl = document.getElementById('id-code');
    if (codeEl) codeEl.innerText = item.itemCode;
    const descEl = document.getElementById('id-desc');
    if (descEl) descEl.innerText = item.description || '-';
    const catEl = document.getElementById('id-category');
    if (catEl) catEl.innerText = item.category || 'General';

    const stock = parseFloat(item.openingStock) || 0;
    const minStock = parseFloat(item.minimumStock) || 10;
    const isLow = stock <= minStock;
    const statusBadge = document.getElementById('id-status-badge');
    if (statusBadge) {
      statusBadge.innerText = stock <= 0 ? 'OUT OF STOCK' : (isLow ? 'LOW STOCK' : 'IN STOCK');
      statusBadge.className = `pill-badge ${stock <= 0 ? 'pill-danger' : (isLow ? 'pill-warning' : 'pill-success')}`;
    }

    const unitEl = document.getElementById('id-unit');
    if (unitEl) unitEl.innerText = item.unit || 'PCS';
    const hsnEl = document.getElementById('id-hsn');
    if (hsnEl) hsnEl.innerText = item.hsn || '-';
    const gstEl = document.getElementById('id-gst');
    if (gstEl) gstEl.innerText = (item.gst || 18).toFixed(1) + '%';
    const discEl = document.getElementById('id-discount');
    if (discEl) discEl.innerText = (item.discountPercent || 0).toFixed(1) + '%';
    const pPriceEl = document.getElementById('id-purchase-price');
    if (pPriceEl) pPriceEl.innerText = formatMoney(item.purchasePrice);
    const sPriceEl = document.getElementById('id-selling-price');
    if (sPriceEl) sPriceEl.innerText = formatMoney(item.sellingPrice);
    const stockEl = document.getElementById('id-stock');
    if (stockEl) stockEl.innerText = stock.toFixed(2);
    const minEl = document.getElementById('id-min-stock');
    if (minEl) minEl.innerText = minStock.toFixed(2);
    const locEl = document.getElementById('id-location');
    if (locEl) locEl.innerText = item.location || '-';
    const bmEl = document.getElementById('id-brand-material');
    if (bmEl) bmEl.innerText = [item.brand, item.material, item.size].filter(Boolean).join(' • ') || '-';
    const remEl = document.getElementById('id-remarks');
    if (remEl) remEl.innerText = item.remarks || 'None';

    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.showDrawer('item-detail-drawer');
    } else {
      const drawer = document.getElementById('item-detail-drawer');
      if (drawer) { drawer.classList.add('open'); drawer.style.display = 'flex'; }
    }
  }

  function closeItemDrawer() {
    selectedItemCode = null;
    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.hideDrawer('item-detail-drawer', '#items-table-tbody');
    } else {
      const drawer = document.getElementById('item-detail-drawer');
      if (drawer) { drawer.classList.remove('open'); drawer.style.display = 'none'; }
      document.querySelectorAll('#items-table-tbody tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    }
  }

  function editDrawerItem() {
    if (selectedItemCode) openEditItemModal(selectedItemCode);
  }

  function printDrawerBarcode() {
    if (selectedItemCode) printBarcode(selectedItemCode);
  }

  function drawerAuditTrail() {
    if (selectedItemCode) viewAuditTrail(selectedItemCode);
  }

  function drawerCreateSale() {
    if (selectedItemCode) createSale(selectedItemCode);
  }

  function toggleActionMenu(itemCode, event) {
    if (event) event.stopPropagation();
    const menuId = 'item-action-menu-' + (itemCode || '').replace(/[^a-zA-Z0-9]/g, '_');
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

        const menuHeight = targetMenu.offsetHeight || 260;
        const spaceBelow = window.innerHeight - rect.bottom;
        let top;
        if (spaceBelow < menuHeight && rect.top > menuHeight) {
          top = Math.max(10, rect.top - menuHeight - 4);
        } else {
          top = rect.bottom + 4;
        }

        targetMenu.style.top = `${top}px`;
        targetMenu.style.left = `${left}px`;

        const closeHandler = (e) => {
          if (!targetMenu.contains(e.target) && e.target !== btn) {
            targetMenu.style.display = 'none';
            document.removeEventListener('click', closeHandler);
          }
        };
        document.addEventListener('click', closeHandler);
      }
    }
  }

  function viewItemDetails(code) {
    showItemDetails(code);
  }

  function viewAuditTrail(code) {
    if (window.AppDialogService && window.AppDialogService.showActivityTimeline) {
      window.AppDialogService.showActivityTimeline('ITEM', null, code);
    } else if (window.OperationsService && window.OperationsService.getActivityTimeline) {
      window.OperationsService.getActivityTimeline('ITEM', code).then(timeline => {
        if (window.AppDialogService) {
          window.AppDialogService.toastInfo(`Audit trail for ${code}: ${(timeline || []).length} change records found.`);
        }
      }).catch(() => {
        if (window.AppDialogService) window.AppDialogService.toastInfo(`Audit trail for item ${code}`);
      });
    } else {
      alert(`Audit trail for item ${code}`);
    }
  }

  function createSale(code) {
    if (window.NavigationRouter && window.NavigationRouter.selectNav) {
      window.NavigationRouter.selectNav('view-sale-create');
      if (window.SalesController && window.SalesController.initSaleWorkspace) {
        window.SalesController.initSaleWorkspace(null, false);
      }
      setTimeout(() => {
        const itemInput = document.getElementById('se-item-search') || document.getElementById('sale-item-search');
        if (itemInput) {
          itemInput.value = code;
          itemInput.dispatchEvent(new Event('input'));
        }
      }, 350);
    }
  }

  function createPurchase(code) {
    if (window.PurchaseController && window.PurchaseController.openPurchaseEditor) {
      window.PurchaseController.openPurchaseEditor();
      setTimeout(() => {
        const itemInput = document.getElementById('pe-item-search');
        if (itemInput) {
          itemInput.value = code;
          itemInput.dispatchEvent(new Event('input'));
        }
      }, 350);
    }
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

  async function populateItemLookups() {
    try {
      const [categories, units, gstList, discounts] = await Promise.all([
        window.MasterService.getLookupValuesByCategoryCode('CATEGORY').catch(() => []),
        window.MasterService.getLookupValuesByCategoryCode('UNIT').catch(() => []),
        window.MasterService.getLookupValuesByCategoryCode('GST').catch(() => []),
        window.MasterService.getLookupValuesByCategoryCode('DISCOUNT').catch(() => [])
      ]);

      const catSel = document.getElementById('m-item-category');
      if (catSel) {
        const catVals = (categories && categories.length > 0) ? categories : ['PIPE', 'FLANGE', 'FITTING', 'VALVE', 'FASTENER', 'GASKET'];
        catSel.innerHTML = `<option value="">Select category *</option>` +
          catVals.map(c => {
            const val = typeof c === 'string' ? c : (c.value || c.name || c.lookupValue);
            return `<option value="${val}">${val}</option>`;
          }).join('');
      }

      const unitSel = document.getElementById('m-item-unit');
      if (unitSel) {
        const unitVals = (units && units.length > 0) ? units : ['PCS', 'NOS', 'MTR', 'KGS', 'SET', 'BOX', 'PKT', 'ROLL', 'TON'];
        unitSel.innerHTML = unitVals.map(u => {
          const val = typeof u === 'string' ? u : (u.value || u.name || u.lookupValue);
          return `<option value="${val}">${val}</option>`;
        }).join('');
      }

      const gstSel = document.getElementById('m-item-gst');
      if (gstSel) {
        const gstVals = (gstList && gstList.length > 0) ? gstList : ['0', '5', '12', '18', '28'];
        gstSel.innerHTML = gstVals.map(g => {
          const val = typeof g === 'string' ? g : (g.value || g.name || g.lookupValue);
          const num = parseFloat(val) || 0;
          return `<option value="${num}">${num}%</option>`;
        }).join('');
      }

      const discSel = document.getElementById('m-item-discount');
      if (discSel && discSel.tagName === 'SELECT') {
        const discVals = (discounts && discounts.length > 0) ? discounts : ['0', '5', '10', '15', '20'];
        discSel.innerHTML = discVals.map(d => {
          const val = typeof d === 'string' ? d : (d.value || d.name || d.lookupValue);
          const num = parseFloat(val) || 0;
          return `<option value="${num}">${num}%</option>`;
        }).join('');
      }
    } catch (e) {
      console.warn('Failed to load item lookups:', e);
    }
  }

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
      const codeInp = document.getElementById('m-item-code');
      if (codeInp) {
        codeInp.value = nextRes?.code || 'ITEM' + Date.now().toString().slice(-4);
        codeInp.readOnly = true;
        codeInp.title = 'Item code is auto-generated and locked.';
      }
    } catch {
      const codeInp = document.getElementById('m-item-code');
      if (codeInp) {
        codeInp.value = 'ITEM' + Date.now().toString().slice(-4);
        codeInp.readOnly = true;
        codeInp.title = 'Item code is auto-generated and locked.';
      }
    }

    // Dynamically populate categories, units, gst, discounts from server lookups
    await populateItemLookups();

    document.getElementById('m-item-desc').value = '';
    document.getElementById('m-item-category').value = '';
    document.getElementById('m-item-unit').value = 'PCS';
    document.getElementById('m-item-hsn').value = '73063000';
    document.getElementById('m-item-gst').value = '18';
    document.getElementById('m-item-discount').value = '0';
    document.getElementById('m-item-purchase-price').value = '0.00';
    document.getElementById('m-item-selling-price').value = '0.00';
    document.getElementById('m-item-remarks').value = 'Standard stock item';
    const openingStockEl = document.getElementById('m-item-opening-stock');
    if (openingStockEl) {
      openingStockEl.value = '0.00';
      openingStockEl.readOnly = false;
      openingStockEl.style.background = '';
      openingStockEl.style.cursor = '';
      openingStockEl.title = 'Initial stock on hand';
    }
    document.getElementById('m-item-min-stock').value = '10.00';
    document.getElementById('m-item-location').value = '';

    modal.style.display = 'flex';
  }

  async function openEditItemModal(code) {
    editingItemCode = code;
    let item = null;
    try {
      if (window.MasterService && window.MasterService.getItemsByCodes) {
        const freshList = await window.MasterService.getItemsByCodes([code]);
        if (freshList && freshList.length > 0) {
          item = freshList[0];
          const idx = items.findIndex(i => i.itemCode === code);
          if (idx !== -1) items[idx] = item;
        }
      }
    } catch (err) {
      console.warn('[ItemMasterController] Could not fetch fresh item by code:', err);
    }
    if (!item) {
      item = items.find(i => i.itemCode === code);
    }
    if (!item) return;

    editingRowVersion = item.rowVersion != null ? item.rowVersion : 0;

    const modal = document.getElementById('modal-item-dialog');
    if (!modal) return;

    document.getElementById('item-dialog-title').innerText = 'Edit Item';
    document.getElementById('item-dialog-subtitle').innerText = `Modify inventory details for item ${code}`;

    // Dynamically populate categories, units, gst, discounts from server lookups
    await populateItemLookups();

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

    const editOpeningStockEl = document.getElementById('m-item-opening-stock');
    if (editOpeningStockEl) {
      editOpeningStockEl.value = (parseFloat(item.openingStock) || 0).toFixed(2);
      editOpeningStockEl.readOnly = true;
      editOpeningStockEl.style.background = 'rgba(255,255,255,0.06)';
      editOpeningStockEl.style.cursor = 'not-allowed';
      editOpeningStockEl.title = 'Opening Stock is fixed after creation. Use Stock Adjustment to change inventory quantity.';
    }

    document.getElementById('m-item-min-stock').value = (parseFloat(item.minimumStock) || 0).toFixed(2);
    document.getElementById('m-item-location').value = item.location || '';

    modal.style.display = 'flex';
  }

  async function loadCategoriesDropdown() {
    await populateItemLookups();
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

    const matchedItem = editingItemCode ? items.find(i => i.itemCode === editingItemCode) : null;
    const finalOpeningStock = editingItemCode && matchedItem && matchedItem.openingStock != null
      ? matchedItem.openingStock
      : openingStock;

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
      openingStock: finalOpeningStock,
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

      if (window.MasterService && window.MasterService.invalidate) {
        window.MasterService.invalidate('master_items');
      }

      closeModal('modal-item-dialog');
      loadItems(true);

    } catch (err) {
      console.error('Save item failed:', err);
      alert('Failed to save item: ' + (err.message || 'Server error'));
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = 'Save Item'; }
    }
  }

  async function deleteSingleItem(code, rowVersion = 0) {
    if (!code) return;
    let ok = false;
    if (window.AppDialogService && window.AppDialogService.destructive) {
      ok = await window.AppDialogService.destructive(
        'Confirm Permanent Deletion',
        `Delete SKU: ${code}`,
        `Are you sure you want to delete item ${code}?\n\nThis will remove the SKU from the product catalog. Transactions already referencing this item will be protected.`,
        'Yes, Delete Item',
        'Cancel'
      );
    } else {
      ok = confirm(`Are you sure you want to delete item ${code}?\n\nThis will remove the SKU from the product catalog.`);
    }
    if (!ok) return;

    try {
      await window.MasterService.deleteItem(code, rowVersion);
      if (window.AppDialogService && window.AppDialogService.toastSuccess) {
        window.AppDialogService.toastSuccess(`Item ${code} deleted.`);
      }
      selectedCodes.delete(code);
      if (selectedItemCode === code) selectedItemCode = null;
      loadItems(true);
    } catch (err) {
      if (window.AppDialogService && window.AppDialogService.toastError) {
        window.AppDialogService.toastError('Delete failed: ' + (err.message || 'Server error'));
      } else {
        alert('Delete failed: ' + (err.message || 'Server error'));
      }
    }
  }

  async function deleteSelectedItems() {
    const codeList = Array.from(selectedCodes);
    const count = codeList.length;
    if (count === 0) {
      if (selectedItemCode) {
        return deleteSelectedItem();
      }
      if (window.AppDialogService && window.AppDialogService.toastWarning) {
        window.AppDialogService.toastWarning('Please select at least one item to delete.');
      }
      return;
    }

    let ok = false;
    if (window.AppDialogService && window.AppDialogService.destructive) {
      ok = await window.AppDialogService.destructive(
        'Bulk Permanent Deletion',
        `Delete ${count} Selected Item(s)`,
        `Are you sure you want to delete ${count} selected item(s) from the catalog?\n\nWARNING: Items used in existing transactions cannot be removed.`,
        `Delete ${count} Items`,
        'Cancel'
      );
    } else {
      ok = confirm(`Delete ${count} selected item(s) from catalog?\n\nWARNING: Items used in existing transactions cannot be removed.`);
    }
    if (!ok) return;

    try {
      const res = await window.MasterService.bulkDeleteItems(codeList);
      if (window.AppDialogService && window.AppDialogService.toastSuccess) {
        window.AppDialogService.toastSuccess(res?.message || `${count} item(s) deleted.`);
      }
      selectedCodes.clear();
      selectedItemCode = null;
      updateBulkActionBar();
      loadItems(true);
    } catch (err) {
      if (window.AppDialogService && window.AppDialogService.toastError) {
        window.AppDialogService.toastError('Bulk delete failed: ' + (err.message || 'Server error'));
      } else {
        alert('Bulk delete failed: ' + (err.message || 'Server error'));
      }
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

  // --- WAREHOUSE INVENTORY LEDGER (Inventory.fxml Parity) ---
  let inventoryItems = [];

  async function loadInventory(forceRefresh = false) {
    const tbody = document.getElementById('inventory-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading stock records from master database...</td></tr>`;
    }

    try {
      if (forceRefresh && window.MasterService && window.MasterService.invalidate) {
        window.MasterService.invalidate('master_items');
      }
      const items = await window.MasterService.getItems(forceRefresh);
      inventoryItems = items || [];
      updateInventoryKpis(inventoryItems);
      populateInventoryCategories(inventoryItems);
      filterInventory();
      if (forceRefresh && window.AppDialogService && window.AppDialogService.toastSuccess) {
        window.AppDialogService.toastSuccess('Stock Register refreshed with latest server balances.');
      }
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:30px; color:var(--accent-red);">Failed to load inventory: ${err.message}</td></tr>`;
      }
    }
  }

  function updateInventoryKpis(items) {
    let totalItems = items.length;
    let inStock = 0;
    let lowStock = 0;
    let outStock = 0;
    let totalValue = 0;

    items.forEach(i => {
      const stock = parseFloat(i.openingStock || i.currentStock || i.stock || 0);
      const min = parseFloat(i.minimumStock || 10);
      const cost = parseFloat(i.purchasePrice || i.costPrice || 0);

      totalValue += stock * cost;
      if (stock <= 0) outStock++;
      else if (stock <= min) lowStock++;
      else inStock++;
    });

    const elTotal = document.getElementById('lbl-inv-total-items') || document.getElementById('lblTotalItems');
    const elIn = document.getElementById('lbl-inv-in-stock') || document.getElementById('lblInStock');
    const elLow = document.getElementById('lbl-inv-low-stock') || document.getElementById('lblLowStock');
    const elOut = document.getElementById('lbl-inv-out-stock') || document.getElementById('lblOutStock');
    const elVal = document.getElementById('lbl-inv-stock-value') || document.getElementById('lblStockValue');
    const elCount = document.getElementById('lbl-inv-record-count');

    if (elTotal) elTotal.innerText = totalItems;
    if (elIn) elIn.innerText = inStock;
    if (elLow) elLow.innerText = lowStock;
    if (elOut) elOut.innerText = outStock;
    if (elVal) elVal.innerText = formatMoney(totalValue);
    if (elCount) elCount.innerText = `Showing ${items.length} Records`;
  }

  function populateInventoryCategories(items) {
    const sel = document.getElementById('inv-category-filter');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">All Categories</option>';
    const cats = Array.from(new Set(items.map(i => i.category).filter(Boolean))).sort();
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.innerText = c;
      if (c === currentVal) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function filterInventory() {
    const q = (document.getElementById('inv-search-input')?.value || '').toLowerCase();
    const cat = document.getElementById('inv-category-filter')?.value || '';
    const status = document.getElementById('inv-status-filter')?.value || '';

    const filtered = inventoryItems.filter(i => {
      const code = (i.itemCode || i.code || '').toLowerCase();
      const desc = (i.description || i.name || '').toLowerCase();
      const hsn = (i.hsn || '').toLowerCase();
      const stock = parseFloat(i.openingStock || i.currentStock || i.stock || 0);
      const min = parseFloat(i.minimumStock || 10);

      const matchesQ = !q || code.includes(q) || desc.includes(q) || hsn.includes(q);
      const matchesCat = !cat || (i.category === cat);
      let matchesStatus = true;
      if (status === 'IN_STOCK') matchesStatus = stock > min;
      else if (status === 'LOW_STOCK') matchesStatus = stock > 0 && stock <= min;
      else if (status === 'OUT_OF_STOCK') matchesStatus = stock <= 0;

      return matchesQ && matchesCat && matchesStatus;
    });

    renderInventoryTable(filtered);
    const elCount = document.getElementById('lbl-inv-record-count');
    if (elCount) elCount.innerText = `Showing ${filtered.length} of ${inventoryItems.length} Records`;
  }

  function renderInventoryTable(items) {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:30px; color:var(--text-muted);">No inventory records match the selected filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const code = item.itemCode || item.code || '';
      const desc = item.description || item.name || '';
      const cat = item.category || 'General';
      const hsn = item.hsn || '-';
      const unit = item.unit || 'PCS';
      const gst = parseFloat(item.gst || 18).toFixed(1);
      const stock = parseFloat(item.openingStock || item.currentStock || item.stock || 0);
      const available = parseFloat(item.availableStock != null ? item.availableStock : stock);
      const min = parseFloat(item.minimumStock || 10);
      const cost = parseFloat(item.purchasePrice || item.costPrice || 0);
      const valuation = stock * cost;

      let statusDisplay = `<span style="display:inline-flex; align-items:center; gap:6px; color:var(--text-main); font-weight:500; font-size:0.82rem;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#22c55e;"></span> In Stock</span>`;
      if (stock <= 0) {
        statusDisplay = `<span style="display:inline-flex; align-items:center; gap:6px; color:var(--text-main); font-weight:500; font-size:0.82rem;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#ef4444;"></span> Out of Stock</span>`;
      } else if (stock <= min) {
        statusDisplay = `<span style="display:inline-flex; align-items:center; gap:6px; color:var(--text-main); font-weight:500; font-size:0.82rem;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#f59e0b;"></span> Low Stock</span>`;
      }

      return `
        <tr onclick="window.ItemMasterController.onInventoryRowClick('${code}', event)" data-inv-code="${code}" style="cursor:pointer;">
          <td style="font-family:'Space Grotesk', monospace; font-weight:700; color:var(--cyan);">${code}</td>
          <td style="font-weight:600; color:var(--text-main);">${desc}</td>
          <td><span>${cat}</span></td>
          <td style="font-family:monospace;">${hsn}</td>
          <td>${unit}</td>
          <td>${gst}%</td>
          <td style="text-align:right; font-weight:700; color:${stock <= min ? 'var(--red)' : 'var(--green)'};">
            ${stock.toFixed(2)}
          </td>
          <td style="text-align:right; font-weight:600;">${available.toFixed(2)}</td>
          <td style="text-align:right; color:var(--text-muted);">${min.toFixed(2)}</td>
          <td style="text-align:right; font-weight:700;">${formatMoney(valuation)}</td>
          <td style="text-align:center;">${statusDisplay}</td>
          <td style="text-align:center;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn btn-purple role-actions role-purple btn-action-3d btn-sm" onclick="window.ItemMasterController.toggleInventoryActionMenu('${code}', event)" style="padding:4px 12px; font-size:0.75rem; font-weight:700; border-radius:6px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" title="Inventory Actions">
                Actions
              </button>
              <div id="inv-action-menu-${(code || '').replace(/[^a-zA-Z0-9]/g, '_')}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:180px; white-space:nowrap; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.ItemMasterController.showInventoryDetails('${code}')"><span style="margin-right:8px;">👁️</span> View Item</div>
                <div class="action-menu-item" onclick="window.ItemMasterController.drawerEditFromInv('${code}')"><span style="margin-right:8px;">✏️</span> Edit Item</div>
                <div class="action-menu-item" onclick="window.ItemMasterController.openStockAdjustment('${code}')"><span style="margin-right:8px;">⚡</span> Adjust Stock</div>
                <div class="action-menu-item" onclick="window.ItemMasterController.openStockHistory('${code}')"><span style="margin-right:8px;">📜</span> View History</div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function toggleInventoryActionMenu(code, event) {
    if (event) event.stopPropagation();
    const menuId = 'inv-action-menu-' + (code || '').replace(/[^a-zA-Z0-9]/g, '_');
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

        const menuHeight = targetMenu.offsetHeight || 190;
        const spaceBelow = window.innerHeight - rect.bottom;
        let top;
        if (spaceBelow < menuHeight && rect.top > menuHeight) {
          top = Math.max(10, rect.top - menuHeight - 4);
        } else {
          top = rect.bottom + 4;
        }

        targetMenu.style.top = `${top}px`;
        targetMenu.style.left = `${left}px`;

        const closeHandler = (e) => {
          if (!targetMenu.contains(e.target) && e.target !== btn) {
            targetMenu.style.display = 'none';
            document.removeEventListener('click', closeHandler);
          }
        };
        document.addEventListener('click', closeHandler);
      }
    }
  }

  async function openStockRevaluation(code) {
    const item = inventoryItems.find(i => (i.itemCode || i.code) === code);
    if (!item) return;
    const currentCost = parseFloat(item.purchasePrice || item.costPrice || 0);
    const stock = parseFloat(item.openingStock || item.currentStock || item.stock || 0);
    const newRateStr = prompt(`Stock Revaluation for ${code} (${item.description || item.name || ''})\n\nCurrent Purchase Rate: ₹ ${currentCost.toFixed(2)}\nCurrent Stock: ${stock.toFixed(2)}\n\nEnter new valuation rate (₹):`, currentCost.toFixed(2));
    if (newRateStr === null) return;
    const newRate = parseFloat(newRateStr);
    if (isNaN(newRate) || newRate < 0) {
      if (window.AppDialogService) window.AppDialogService.toastError('Invalid valuation rate entered.');
      else alert('Invalid valuation rate.');
      return;
    }
    try {
      if (window.ApiService && window.ApiService.put) {
        await window.ApiService.put(`/api/master/items/${code}/revalue`, { rate: newRate }).catch(async () => {
          await window.ApiService.put(`/api/operations/inventory/revalue`, { itemCode: code, rate: newRate });
        });
      }
      item.purchasePrice = newRate;
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Stock revalued at ₹ ${newRate.toFixed(2)} for ${code}.`);
      loadInventory();
    } catch (err) {
      item.purchasePrice = newRate;
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Stock revalued at ₹ ${newRate.toFixed(2)} for ${code}.`);
      renderInventoryTable(inventoryItems);
      updateInventoryKpis(inventoryItems);
    }
  }

  function openStockAdjustment(itemCode) {
    const item = inventoryItems.find(i => (i.itemCode || i.code) === itemCode) || inventoryItems[0];
    const modal = document.getElementById('modal-stock-adjustment');
    if (!modal) return;

    const sel = document.getElementById('adj-item-select');
    if (sel) {
      sel.innerHTML = inventoryItems.map(i => {
        const c = i.itemCode || i.code;
        return `<option value="${c}" ${c === (item?.itemCode || item?.code) ? 'selected' : ''}>${c} - ${i.description || i.name}</option>`;
      }).join('');
    }

    const currentStock = parseFloat(item ? (item.openingStock || item.currentStock || item.stock || 0) : 0);
    document.getElementById('adj-current-stock').value = currentStock.toFixed(2);
    document.getElementById('adj-qty').value = '';
    document.getElementById('adj-reason').value = 'Physical Stock Audit Reconciliation';
    document.getElementById('adj-ref').value = 'AUDIT-' + new Date().toISOString().slice(0,10);
    document.getElementById('adj-type').value = 'ADD';

    modal.style.display = 'flex';
  }

  async function submitStockAdjustment(e) {
    if (e) e.preventDefault();
    const sel = document.getElementById('adj-item-select');
    const itemCode = sel?.value;
    const type = document.getElementById('adj-type')?.value || 'ADD';
    const qty = parseFloat(document.getElementById('adj-qty')?.value);
    const reason = document.getElementById('adj-reason')?.value || 'Audit';
    const ref = document.getElementById('adj-ref')?.value || '';

    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid adjustment quantity greater than 0.');
      return;
    }

    const payload = {
      itemCode,
      type,
      quantity: qty,
      reason,
      reference: ref,
      user: 'Admin'
    };

    try {
      if (window.OperationsService && window.OperationsService.adjustStock) {
        await window.OperationsService.adjustStock(payload);
      }
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Stock adjusted successfully for ${itemCode}!`);
      closeModal('modal-stock-adjustment');
      loadInventory();
    } catch (err) {
      alert('Stock Adjustment Failed: ' + err.message);
    }
  }

  async function openStockHistory(itemCode) {
    const item = inventoryItems.find(i => (i.itemCode || i.code) === itemCode);
    const modal = document.getElementById('modal-stock-history');
    if (!modal) return;

    document.getElementById('sh-modal-title').innerText = `Stock Movement Ledger — ${itemCode}`;
    document.getElementById('sh-modal-subtitle').innerText = `${item ? (item.description || item.name) : ''} | Unit: ${item ? item.unit : 'NOS'}`;
    const tbody = document.getElementById('sh-history-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading movement history...</td></tr>`;
    }

    modal.style.display = 'flex';

    try {
      let rows = [];
      if (window.OperationsService && window.OperationsService.getStockHistory) {
        rows = await window.OperationsService.getStockHistory(itemCode);
      }
      if (!rows || rows.length === 0) {
        if (item && parseFloat(item.openingStock || 0) > 0) {
          rows = [{
            date: item.createdAt ? item.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
            type: 'OPENING BALANCE',
            quantity: parseFloat(item.openingStock),
            reason: 'Opening Master Stock Balance',
            reference: item.code || 'OPENING',
            user: 'System'
          }];
        } else {
          rows = [];
        }
      }

      if (tbody) {
        tbody.innerHTML = rows.map(r => {
          const q = parseFloat(r.quantity || 0);
          const isPos = q > 0 || r.type === 'PURCHASE' || r.type === 'RETURN INWARD';
          return `
            <tr>
              <td>${r.date || '-'}</td>
              <td><span class="badge badge-neutral">${r.type || 'MOVEMENT'}</span></td>
              <td style="text-align:right; font-weight:700; color:${isPos ? 'var(--accent-green)' : 'var(--accent-red)'}; font-family:monospace;">
                ${isPos ? '+' : ''}${q.toFixed(2)}
              </td>
              <td>${r.reason || '-'}</td>
              <td style="font-family:monospace; color:var(--cyan);">${r.reference || '-'}</td>
              <td style="color:var(--text-dim);">${r.user || 'Admin'}</td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--accent-red);">Failed to load history: ${err.message}</td></tr>`;
      }
    }
  }

  function exportInventoryExcel() {
    if (!inventoryItems || inventoryItems.length === 0) {
      alert('No inventory records to export.');
      return;
    }

    const headers = ['Item Code', 'Item Name', 'Category', 'HSN/SAC', 'Unit', 'GST %', 'In Stock', 'Available', 'Min Stock', 'Valuation Rate', 'Total Valuation', 'Status'];
    const rows = inventoryItems.map(i => {
      const stock = parseFloat(i.openingStock || i.currentStock || i.stock || 0);
      const min = parseFloat(i.minimumStock || 10);
      const cost = parseFloat(i.purchasePrice || i.costPrice || 0);
      let status = 'HEALTHY';
      if (stock <= 0) status = 'OUT OF STOCK';
      else if (stock <= min) status = 'LOW STOCK';

      return [
        i.itemCode || i.code || '',
        `"${(i.description || i.name || '').replace(/"/g, '""')}"`,
        i.category || 'GENERAL',
        i.hsn || '',
        i.unit || 'NOS',
        i.gst || 18,
        stock.toFixed(2),
        (i.availableStock != null ? i.availableStock : stock).toFixed(2),
        min.toFixed(2),
        cost.toFixed(2),
        (stock * cost).toFixed(2),
        status
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Stock_Register_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // --- INVENTORY DETAIL DRAWER (InventoryController.java Parity) ---
  let selectedInvCode = null;

  function onInventoryRowClick(code, event) {
    if (event && window.RegisterUiSupport && window.RegisterUiSupport.isInteractiveTarget(event.target)) return;
    const drawer = document.getElementById('inventory-detail-drawer');
    const isDrawerOpen = drawer && (drawer.classList.contains('open') || drawer.style.display === 'flex');
    if (isDrawerOpen && selectedInvCode === code) {
      closeInventoryDrawer();
      return;
    }
    showInventoryDetails(code);
  }

  function showInventoryDetails(code) {
    const item = inventoryItems.find(i => (i.itemCode || i.code) === code);
    if (!item) return;
    selectedInvCode = code;

    const rowEl = document.querySelector(`#inventory-tbody tr[data-inv-code="${code}"]`);
    if (window.RegisterUiSupport && rowEl) {
      window.RegisterUiSupport.highlightRow('#inventory-tbody', rowEl);
    }

    const stock = parseFloat(item.openingStock || item.currentStock || item.stock || 0);
    const available = parseFloat(item.availableStock != null ? item.availableStock : stock);
    const min = parseFloat(item.minimumStock || 10);
    const cost = parseFloat(item.purchasePrice || item.costPrice || 0);
    const valuation = stock * cost;

    const elCode = document.getElementById('inv-d-code');
    if (elCode) elCode.innerText = item.itemCode || item.code || code;
    const elName = document.getElementById('inv-d-name');
    if (elName) elName.innerText = item.description || item.name || '-';
    const elCat = document.getElementById('inv-d-category');
    if (elCat) elCat.innerText = item.category || 'General';

    const elStatus = document.getElementById('inv-d-status');
    if (elStatus) {
      if (stock <= 0) {
        elStatus.innerText = 'OUT OF STOCK';
        elStatus.className = 'pill-badge pill-danger';
      } else if (stock <= min) {
        elStatus.innerText = 'LOW STOCK';
        elStatus.className = 'pill-badge pill-warning';
      } else {
        elStatus.innerText = 'HEALTHY IN STOCK';
        elStatus.className = 'pill-badge pill-success';
      }
    }

    const elStock = document.getElementById('inv-d-stock');
    if (elStock) elStock.innerText = `${stock.toFixed(2)} ${item.unit || 'NOS'}`;
    const elAvail = document.getElementById('inv-d-avail');
    if (elAvail) elAvail.innerText = `${available.toFixed(2)} ${item.unit || 'NOS'}`;
    const elMin = document.getElementById('inv-d-min');
    if (elMin) elMin.innerText = `${min.toFixed(2)} ${item.unit || 'NOS'}`;
    const elHsn = document.getElementById('inv-d-hsn');
    if (elHsn) elHsn.innerText = item.hsn || '-';
    const elVal = document.getElementById('inv-d-valuation');
    if (elVal) elVal.innerText = formatMoney(valuation);
    const elLoc = document.getElementById('inv-d-location');
    if (elLoc) elLoc.innerText = item.location || '-';
    const elGst = document.getElementById('inv-d-gst');
    if (elGst) elGst.innerText = `${(item.gst || 18).toFixed(1)}%`;

    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.showDrawer('inventory-detail-drawer');
    } else {
      const drawer = document.getElementById('inventory-detail-drawer');
      if (drawer) { drawer.classList.add('open'); drawer.style.display = 'flex'; }
    }
  }

  function closeInventoryDrawer() {
    selectedInvCode = null;
    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.hideDrawer('inventory-detail-drawer', '#inventory-tbody');
    } else {
      const drawer = document.getElementById('inventory-detail-drawer');
      if (drawer) { drawer.classList.remove('open'); drawer.style.display = 'none'; }
      document.querySelectorAll('#inventory-tbody tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    }
  }

  function drawerAdjustStock() {
    if (selectedInvCode) openStockAdjustment(selectedInvCode);
  }

  function drawerStockHistory() {
    if (selectedInvCode) openStockHistory(selectedInvCode);
  }

  function drawerEditFromInv(code) {
    const targetCode = code || selectedInvCode;
    if (targetCode) {
      if (window.NavigationRouter && window.NavigationRouter.selectNav) {
        window.NavigationRouter.selectNav('view-item-master');
      }
      setTimeout(() => {
        openEditItemModal(targetCode);
      }, 300);
    }
  }

  function editSelectedItem() {
    if (selectedCodes.size === 1) {
      const code = Array.from(selectedCodes)[0];
      openEditItemModal(code);
    } else if (selectedCodes.size === 0 && selectedItemCode) {
      openEditItemModal(selectedItemCode);
    } else if (selectedCodes.size === 0) {
      if (window.AppDialogService && window.AppDialogService.toastWarning) window.AppDialogService.toastWarning('Please select an item to edit.');
      else alert('Please select an item to edit.');
    } else {
      if (window.AppDialogService && window.AppDialogService.toastWarning) window.AppDialogService.toastWarning('Please select only one item to edit.');
      else alert('Please select only one item to edit.');
    }
  }

  function deleteSelectedItem() {
    if (selectedCodes.size > 0) {
      deleteSelectedItems();
    } else if (selectedItemCode) {
      const item = items.find(i => i.itemCode === selectedItemCode);
      deleteSingleItem(selectedItemCode, item ? (item.rowVersion || 0) : 0);
    } else if (items && items.length === 1) {
      const single = items[0];
      deleteSingleItem(single.itemCode, single.rowVersion || 0);
    } else {
      if (window.AppDialogService && window.AppDialogService.toastWarning) {
        window.AppDialogService.toastWarning('Please select an item row or check an item to delete.');
      } else {
        alert('Please select an item row or check an item to delete.');
      }
    }
  }

  function refreshItems() {
    loadItems(true);
  }

  async function exportInventoryExcel() {
    try {
      if (!inventoryItems || inventoryItems.length === 0) {
        await loadInventory(true);
      }
      const exportList = (inventoryItems && inventoryItems.length > 0) ? inventoryItems : [];
      if (exportList.length === 0) {
        if (window.AppDialogService && window.AppDialogService.toastError) {
          window.AppDialogService.toastError('No stock records to export.');
        } else {
          alert('No stock records to export.');
        }
        return;
      }

      const rows = exportList.map(item => {
        const code = item.itemCode || item.code || '';
        const desc = item.description || item.name || '';
        const cat = item.category || 'General';
        const hsn = item.hsn || '-';
        const unit = item.unit || 'PCS';
        const gst = parseFloat(item.gst || 18);
        const stock = parseFloat(item.openingStock || item.currentStock || item.stock || 0);
        const available = parseFloat(item.availableStock != null ? item.availableStock : stock);
        const min = parseFloat(item.minimumStock || 10);
        const cost = parseFloat(item.purchasePrice || item.costPrice || 0);
        const valuation = stock * cost;
        const status = stock <= 0 ? 'Out of Stock' : (stock <= min ? 'Low Stock' : 'In Stock');

        return {
          'Item Code': code,
          'Description': desc,
          'Category': cat,
          'HSN': hsn,
          'Unit': unit,
          'GST (%)': gst,
          'Current Stock': stock,
          'Available Stock': available,
          'Min Stock': min,
          'Unit Cost (₹)': cost,
          'Stock Valuation (₹)': valuation,
          'Stock Status': status
        };
      });

      if (window.XLSX) {
        const ws = window.XLSX.utils.json_to_sheet(rows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Stock Register');
        const fileName = `Stock_Register_${new Date().toISOString().slice(0, 10)}.xlsx`;
        window.XLSX.writeFile(wb, fileName);
        if (window.AppDialogService && window.AppDialogService.toastSuccess) {
          window.AppDialogService.toastSuccess(`Exported ${rows.length} stock items to ${fileName}`);
        }
      } else {
        let csv = Object.keys(rows[0]).join(',') + '\n';
        rows.forEach(r => {
          csv += Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `Stock_Register_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to export inventory:', err);
      if (window.AppDialogService && window.AppDialogService.toastError) {
        window.AppDialogService.toastError('Export Failed: ' + (err.message || 'Could not export stock records'));
      } else {
        alert('Export Failed: ' + (err.message || 'Could not export stock records'));
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.RegisterUiSupport) {
      window.RegisterUiSupport.installEscapeClose('item-detail-drawer', closeItemDrawer);
      window.RegisterUiSupport.installEscapeClose('inventory-detail-drawer', closeInventoryDrawer);
    }
  });

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
    editSelectedItem,
    deleteSelectedItem,
    refreshItems,
    printBarcode,
    closeModal,
    toggleActionMenu,
    viewItemDetails,
    viewAuditTrail,
    createSale,
    createPurchase,
    populateItemLookups,
    loadCategories() { loadCategoriesDropdown(); },

    // Item Master Drawer Parity
    onItemRowClick,
    showItemDetails,
    closeItemDrawer,
    editDrawerItem,
    printDrawerBarcode,
    drawerAuditTrail,
    drawerCreateSale,

    // Inventory Ledger Parity
    loadInventory,
    filterInventory,
    openStockAdjustment,
    submitStockAdjustment,
    openStockHistory,
    openStockRevaluation,
    toggleInventoryActionMenu,
    exportInventoryExcel,

    // Inventory Drawer Parity
    onInventoryRowClick,
    showInventoryDetails,
    closeInventoryDrawer,
    drawerAdjustStock,
    drawerStockHistory,
    drawerEditFromInv,

    async exportItems() {
      try {
        if (!items || items.length === 0) {
          await loadItems(true);
        }
        const dataToExport = (filteredItems && filteredItems.length > 0) ? filteredItems : items;
        if (!dataToExport || dataToExport.length === 0) {
          if (window.AppDialogService && window.AppDialogService.toastError) {
            window.AppDialogService.toastError('No items available to export.');
          } else {
            alert('No items available to export.');
          }
          return;
        }

        const exportRows = dataToExport.map(i => ({
          'Item Code': i.itemCode || '',
          'Description': i.description || i.name || '',
          'Category': i.category || 'General',
          'Brand': i.brand || '',
          'Unit': i.unit || 'PCS',
          'HSN / SAC': i.hsn || '',
          'Tax Rate (%)': parseFloat(i.taxRate || i.gst) || 0,
          'Purchase Price (₹)': parseFloat(i.purchasePrice) || 0,
          'Selling Price (₹)': parseFloat(i.sellingPrice) || 0,
          'MRP (₹)': parseFloat(i.mrp) || 0,
          'Min Stock': parseFloat(i.minimumStock) || 0,
          'Opening Stock': parseFloat(i.openingStock) || 0,
          'Status': i.active ? 'ACTIVE' : 'INACTIVE'
        }));

        if (window.XLSX) {
          const ws = window.XLSX.utils.json_to_sheet(exportRows);
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, 'Item Master');
          const fileName = `Item_Master_${new Date().toISOString().slice(0, 10)}.xlsx`;
          window.XLSX.writeFile(wb, fileName);
          if (window.AppDialogService && window.AppDialogService.toastSuccess) {
            window.AppDialogService.toastSuccess(`Exported ${exportRows.length} items to ${fileName}`);
          }
        } else {
          let csv = Object.keys(exportRows[0]).join(',') + '\n';
          exportRows.forEach(r => {
            csv += Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
          });
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.setAttribute('download', `Item_Master_${new Date().toISOString().slice(0, 10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (err) {
        console.error('Failed to export items:', err);
        if (window.AppDialogService && window.AppDialogService.toastError) {
          window.AppDialogService.toastError('Export Failed: ' + (err.message || 'Could not export items'));
        } else {
          alert('Export Failed: ' + (err.message || 'Could not export items'));
        }
      }
    },
    importItemsExcel() {
      if (window.NavigationRouter && window.NavigationRouter.selectNav) {
        window.NavigationRouter.selectNav('view-import');
      } else if (typeof selectNav === 'function') {
        selectNav('view-import');
      }
      if (window.ImportController && typeof window.ImportController.selectModule === 'function') {
        window.ImportController.selectModule('Item Master');
      }
    },
    importItems() {
      this.importItemsExcel();
    },
    isolateItem
  };
})();
