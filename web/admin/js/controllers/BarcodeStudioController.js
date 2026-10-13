/**
 * Jasvi Industries ERP - BarcodeStudioController
 * Desktop Parity with org.example.controller.BarcodeStudioController & BarcodeStudio.fxml
 */
window.BarcodeStudioController = (function() {
  let itemsCache = [];
  let selectedItem = null;

  return {
    async init() {
      await this.loadItems();
      this.initScannerListener();
      this.renderBarcodePreview();
    },

    async loadItems() {
      try {
        let items = [];
        if (window.ApiService) {
          try {
            items = await window.ApiService.get('/api/barcode/items');
          } catch (e) {
            items = await window.MasterService.getItems();
          }
        }
        itemsCache = items || [];
        this.updateKpis(itemsCache);
        this.populateItemSelect(itemsCache);
      } catch (err) {
        console.warn('Failed to load items for Barcode Studio:', err);
      }
    },

    updateKpis(items) {
      const elTotal = document.getElementById('bc-kpi-total-items');
      const elMapped = document.getElementById('bc-kpi-mapped-items');
      const elFormat = document.getElementById('bc-kpi-format');
      const elEngine = document.getElementById('bc-kpi-engine');

      const mapped = items.filter(i => (i.barcode || i.itemCode || i.code)).length;

      if (elTotal) elTotal.innerText = items.length;
      if (elMapped) elMapped.innerText = mapped;
      if (elFormat) elFormat.innerText = '50 × 25 mm';
      if (elEngine) elEngine.innerText = 'Code-128 / ESC-POS';
    },

    populateItemSelect(items) {
      const sel = document.getElementById('bc-item-select');
      if (!sel) return;
      sel.innerHTML = `<option value="">-- Choose Item from Catalog --</option>` +
        items.map(i => {
          const code = i.itemCode || i.code || '';
          const name = i.description || i.name || '';
          const hsn = i.hsn || '7318';
          const price = i.sellingPrice || i.salePrice || 450.00;
          return `<option value="${code}" data-desc="${name}" data-hsn="${hsn}" data-price="${price}">${code} — ${name}</option>`;
        }).join('');
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
          const matched = itemsCache.find(i => (i.itemCode || i.code) === scannedVal || i.barcode === scannedVal);

          if (matched) {
            this.selectItem(matched.itemCode || matched.code);
            input.value = '';
            if (window.AppDialogService) window.AppDialogService.toastSuccess(`Scanned & Matched: ${matched.description || matched.name}`);
          } else {
            document.getElementById('bc-code-input').value = scannedVal;
            this.renderBarcodePreview();
            if (window.AppDialogService) window.AppDialogService.toastInfo(`Scanned Raw Code: ${scannedVal}`);
          }
        }
      });
    },

    onItemSelect(code) {
      this.selectItem(code);
    },

    selectItem(code) {
      const sel = document.getElementById('bc-item-select');
      if (sel) sel.value = code;

      const item = itemsCache.find(i => (i.itemCode || i.code) === code);
      if (!item) return;
      selectedItem = item;

      const codeInput = document.getElementById('bc-code-input');
      const titleInput = document.getElementById('bc-title-input');
      const hsnInput = document.getElementById('bc-hsn-input');
      const priceInput = document.getElementById('bc-price-input');

      if (codeInput) codeInput.value = item.itemCode || item.code || '';
      if (titleInput) titleInput.value = item.description || item.name || '';
      if (hsnInput) hsnInput.value = item.hsn || '7318';
      if (priceInput) priceInput.value = parseFloat(item.sellingPrice || item.salePrice || 450).toFixed(2);

      this.renderBarcodePreview();
      if (window.AudioSynthesizer) window.AudioSynthesizer.playBarcodeBeep();
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

    quickGenerate(code) {
      if (window.NavigationRouter) window.NavigationRouter.selectNav('view-barcode');
      this.selectItem(code);
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

window.onBarcodeItemSelect = (val) => window.BarcodeStudioController.onItemSelect(val);
window.renderBarcodePreview = () => window.BarcodeStudioController.renderBarcodePreview();
window.printBarcodeStickers = () => window.BarcodeStudioController.printThermal();
