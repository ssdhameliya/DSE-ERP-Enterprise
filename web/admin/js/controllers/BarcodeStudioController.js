/**
 * Jasvi Industries ERP - BarcodeStudioController
 * Desktop Parity with org.example.controller.BarcodeStudioController & BarcodeStudio.fxml
 */
window.BarcodeStudioController = (function() {
  let itemsCache = [];
  let filteredItems = [];
  let selectedItem = null;
  let selectedIndex = null;

  function formatMoney(amount) {
    return '₹ ' + (parseFloat(amount) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  return {
    async init() {
      await this.loadItems();
      this.initScannerListener();
      this.renderBarcodePreview();
    },

    async loadItems() {
      const tbody = document.getElementById('bc-items-table-tbody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading items for barcode labeling...</td></tr>`;
      }

      try {
        let items = [];
        if (window.ApiService) {
          try {
            items = await window.ApiService.get('/api/barcode/items');
          } catch (e) {
            if (window.MasterService && window.MasterService.getItems) {
              items = await window.MasterService.getItems();
            } else if (window.OperationsService && window.OperationsService.getItems) {
              const res = await window.OperationsService.getItems(0, 200);
              items = Array.isArray(res) ? res : (res.rows || res.content || []);
            }
          }
        }
        itemsCache = items || [];
        filteredItems = [...itemsCache];
        this.updateKpis(itemsCache);
        this.renderItemsTable(filteredItems);
      } catch (err) {
        console.warn('Failed to load items for Barcode Studio:', err);
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--red);">⚠️ Failed to load items: ${err.message || 'Server error'}</td></tr>`;
        }
      }
    },

    updateKpis(items) {
      const elTotal = document.getElementById('bc-kpi-total-items');
      const elMapped = document.getElementById('bc-kpi-mapped-items');
      const elFormat = document.getElementById('bc-kpi-format');
      const elCopies = document.getElementById('bc-kpi-selected-copies');

      const mapped = items.filter(i => (i.barcode || i.itemCode || i.code)).length;

      if (elTotal) elTotal.innerText = items.length;
      if (elMapped) elMapped.innerText = mapped;
      if (elFormat) elFormat.innerText = '50 × 25 mm';
      if (elCopies) elCopies.innerText = (document.getElementById('bc-copies-input')?.value || '1');
    },

    filterItems(q) {
      const query = (q || '').trim().toLowerCase();
      if (!query) {
        filteredItems = [...itemsCache];
      } else {
        filteredItems = itemsCache.filter(i => {
          const code = (i.itemCode || i.code || '').toLowerCase();
          const name = (i.description || i.name || i.itemName || '').toLowerCase();
          const cat = (i.category || '').toLowerCase();
          const bc = (i.barcode || '').toLowerCase();
          return code.includes(query) || name.includes(query) || cat.includes(query) || bc.includes(query);
        });
      }
      this.renderItemsTable(filteredItems);
    },

    renderItemsTable(items) {
      const tbody = document.getElementById('bc-items-table-tbody');
      if (!tbody) return;

      if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No catalog items match search criteria.</td></tr>`;
        return;
      }

      tbody.innerHTML = items.map((item, idx) => {
        const code = item.itemCode || item.code || `ITEM-${item.id || idx+1}`;
        const name = item.description || item.name || item.itemName || 'Catalog Item';
        const cat = item.category || 'General';
        const bc = item.barcode || code;
        const price = parseFloat(item.sellingPrice || item.salePrice || 450);
        const stock = item.currentStock || item.stock || 0;

        return `
          <tr data-bc-idx="${idx}" onclick="window.BarcodeStudioController.onRowClick(${idx}, event)" style="cursor:pointer;">
            <td style="font-weight:700; color:var(--cyan); font-family:monospace;">${code}</td>
            <td style="font-weight:600; color:var(--text-main);">${name}</td>
            <td><span class="pill-badge pill-info">${cat}</span></td>
            <td style="font-family:monospace; color:var(--purple-accent); font-weight:600;">${bc}</td>
            <td style="text-align:right; font-weight:700; color:var(--green);">${formatMoney(price)}</td>
            <td style="text-align:center;"><span class="pill-badge ${stock > 0 ? 'pill-success' : 'pill-warning'}">${stock}</span></td>
            <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">
              <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
                <button class="btn-purple" onclick="window.BarcodeStudioController.toggleActionMenu(${idx}, event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" title="Actions">
                  ::: Actions
                </button>
                <div id="bc-action-menu-${idx}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; min-width:210px; white-space:nowrap; padding:6px 0; text-align:left;">
                  <div class="action-menu-item" onclick="window.BarcodeStudioController.showPreview(${idx})"><span style="margin-right:8px;">📄</span> View / Preview Label</div>
                  <div class="action-menu-item" onclick="window.BarcodeStudioController.generateBarcode(${idx})"><span style="margin-right:8px;">🏷️</span> Generate Barcode</div>
                  <div class="action-menu-item" onclick="window.BarcodeStudioController.printDispatch(${idx})"><span style="margin-right:8px;">🚚</span> Print Dispatch Label (PDF)</div>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    toggleActionMenu(idx, event) {
      if (event) event.stopPropagation();
      const menuId = 'bc-action-menu-' + idx;
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
          const menuHeight = targetMenu.offsetHeight || 130;
          const spaceBelow = window.innerHeight - rect.bottom;
          let top = (spaceBelow < menuHeight && rect.top > menuHeight) ? Math.max(10, rect.top - menuHeight - 4) : (rect.bottom + 4);
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
    },

    onRowClick(idx, event) {
      if (event && window.RegisterUiSupport && window.RegisterUiSupport.isInteractiveTarget(event.target)) return;
      this.showPreview(idx);
    },

    showPreview(idx) {
      const item = filteredItems[idx];
      if (!item) return;
      selectedIndex = idx;
      selectedItem = item;

      const rowEl = document.querySelector(`#bc-items-table-tbody tr[data-bc-idx="${idx}"]`);
      if (window.RegisterUiSupport && rowEl) {
        window.RegisterUiSupport.highlightRow('#bc-items-table-tbody', rowEl);
      }

      const code = item.itemCode || item.code || `ITEM-${item.id || idx+1}`;
      const name = item.description || item.name || item.itemName || 'Catalog Item';
      const hsn = item.hsn || '7318';
      const price = parseFloat(item.sellingPrice || item.salePrice || 450).toFixed(2);

      const titleEl = document.getElementById('bcd-title');
      const codeEl = document.getElementById('bcd-code');
      if (titleEl) titleEl.innerText = name;
      if (codeEl) codeEl.innerText = code;

      const codeInput = document.getElementById('bc-code-input');
      const titleInput = document.getElementById('bc-title-input');
      const hsnInput = document.getElementById('bc-hsn-input');
      const priceInput = document.getElementById('bc-price-input');

      if (codeInput) codeInput.value = code;
      if (titleInput) titleInput.value = name;
      if (hsnInput) hsnInput.value = hsn;
      if (priceInput) priceInput.value = price;

      this.renderBarcodePreview();

      const drawer = document.getElementById('bc-preview-drawer');
      if (drawer) {
        drawer.classList.add('open');
        drawer.style.display = 'flex';
      }
    },

    closeDrawer() {
      selectedIndex = null;
      const drawer = document.getElementById('bc-preview-drawer');
      if (drawer) {
        drawer.classList.remove('open');
        drawer.style.display = 'none';
      }
      document.querySelectorAll('#bc-items-table-tbody tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    },

    generateBarcode(idx) {
      const item = filteredItems[idx];
      if (!item) return;
      const genCode = '890' + Math.floor(1000000000 + Math.random() * 9000000000);
      item.barcode = genCode;
      this.renderItemsTable(filteredItems);
      this.showPreview(idx);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Generated Code-128 barcode: ${genCode}`);
    },

    printDispatch(idx) {
      const item = filteredItems[idx];
      if (!item) return;
      const code = item.itemCode || item.code || '';
      const name = item.description || item.name || '';
      if (window.AppDialogService) window.AppDialogService.toastInfo(`Prepared Order Dispatch Label for ${code}: ${name}`);
      this.showPreview(idx);
      window.print();
    },

    initScannerListener() {
      const input = document.getElementById('txtScannerTest');
      if (!input) return;

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const scannedVal = input.value.trim();
          if (!scannedVal) return;

          if (window.AudioSynthesizer) window.AudioSynthesizer.playBarcodeBeep();
          const matchedIdx = itemsCache.findIndex(i => (i.itemCode || i.code) === scannedVal || i.barcode === scannedVal);

          if (matchedIdx !== -1) {
            this.showPreview(matchedIdx);
            input.value = '';
            if (window.AppDialogService) window.AppDialogService.toastSuccess(`Scanned & Matched: ${itemsCache[matchedIdx].description || itemsCache[matchedIdx].name}`);
          } else {
            const codeInput = document.getElementById('bc-code-input');
            if (codeInput) codeInput.value = scannedVal;
            this.renderBarcodePreview();
            if (window.AppDialogService) window.AppDialogService.toastInfo(`Scanned Raw Code: ${scannedVal}`);
          }
        }
      });
    },

    renderBarcodePreview() {
      const code = (document.getElementById('bc-code-input')?.value || 'ITEM-001').trim();
      const title = (document.getElementById('bc-title-input')?.value || 'INDUSTRIAL FASTENER 12MM').trim();
      const hsn = (document.getElementById('bc-hsn-input')?.value || '7318').trim();
      const price = parseFloat(document.getElementById('bc-price-input')?.value || 450).toFixed(2);

      const showCompany = document.getElementById('bc-chk-company')?.checked ?? true;
      const showTitle = document.getElementById('bc-chk-title')?.checked ?? true;
      const showPrice = document.getElementById('bc-chk-price')?.checked ?? true;
      const showHsn = document.getElementById('bc-chk-hsn')?.checked ?? true;

      const elCompany = document.getElementById('lbl-bc-company');
      const elTitle = document.getElementById('lbl-bc-title');
      const elCode = document.getElementById('lbl-bc-code');
      const elHsn = document.getElementById('lbl-bc-hsn');
      const elPrice = document.getElementById('lbl-bc-price');

      if (elCompany) { elCompany.style.display = showCompany ? 'block' : 'none'; elCompany.innerText = 'JASVI INDUSTRIES'; }
      if (elTitle) { elTitle.style.display = showTitle ? 'block' : 'none'; elTitle.innerText = title; }
      if (elCode) elCode.innerText = code;
      if (elHsn) { elHsn.style.display = showHsn ? 'inline' : 'none'; elHsn.innerText = 'HSN: ' + hsn; }
      if (elPrice) { elPrice.style.display = showPrice ? 'inline' : 'none'; elPrice.innerText = '₹ ' + price; }

      const canvas = document.getElementById('barcode-canvas');
      if (canvas && window.BarcodeGenerator) {
        window.BarcodeGenerator.drawCode128('barcode-canvas', code);
      }
    },

    printThermal() {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      const copies = parseInt(document.getElementById('bc-copies-input')?.value || '1');
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Printing ${copies} thermal label(s) to 2-inch roll printer...`);
      window.print();
    },

    printA4Sheet() {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Generating A4 24-Label Multi-Column Sheet PDF...');
      window.print();
    },

    printOrderDispatchLabel() {
      const code = document.getElementById('bc-code-input')?.value || 'DISP-1001';
      const title = document.getElementById('bc-title-input')?.value || 'CONSIGNMENT GOODS';
      if (window.AppDialogService) window.AppDialogService.toastInfo(`Prepared Order Dispatch Label for ${code}: ${title}`);
      window.print();
    }
  };
})();
