/**
 * Jasvi Industries ERP - BarcodeStudioController
 * Code128 thermal sticker generation and print layout matching desktop BarcodeStudioController
 */
window.BarcodeStudioController = {
  itemsCache: [],

  async init() {
    await this.loadItemsDropdown();
    this.renderBarcodePreview();
  },

  async loadItemsDropdown() {
    const sel = document.getElementById('bc-item-select');
    if (!sel) return;
    try {
      const items = await window.MasterService.getItems();
      this.itemsCache = items || [];
      sel.innerHTML = `<option value="">-- Choose Item from Database --</option>` +
        this.itemsCache.map(i => `<option value="${i.itemCode || i.code}" data-desc="${i.description || i.name}" data-hsn="${i.hsn || '7318'}" data-price="${i.sellingPrice || 450}">${i.itemCode || i.code} - ${i.description || i.name}</option>`).join('');
    } catch (e) {}
  },

  onItemSelect(code) {
    const sel = document.getElementById('bc-item-select');
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;

    const codeInput = document.getElementById('bc-code-input');
    const titleInput = document.getElementById('bc-title-input');
    const hsnInput = document.getElementById('bc-hsn-input');
    const priceInput = document.getElementById('bc-price-input');

    if (codeInput) codeInput.value = opt.value;
    if (titleInput) titleInput.value = opt.getAttribute('data-desc') || opt.value;
    if (hsnInput) hsnInput.value = opt.getAttribute('data-hsn') || '7318';
    if (priceInput) priceInput.value = parseFloat(opt.getAttribute('data-price') || 450).toFixed(2);

    this.renderBarcodePreview();
  },

  renderBarcodePreview() {
    const code = (document.getElementById('bc-code-input')?.value || document.getElementById('barcode-text-input')?.value || 'M8-SS-HEX-001').trim();
    const title = (document.getElementById('bc-title-input')?.value || document.getElementById('sticker-title')?.innerText || 'INDUSTRIAL FASTENER 12MM').trim();
    const hsn = (document.getElementById('bc-hsn-input')?.value || '7318').trim();
    const price = (document.getElementById('bc-price-input')?.value || '450.00').trim();

    const lblTitle = document.getElementById('lbl-title') || document.getElementById('sticker-desc');
    const lblCode = document.getElementById('lbl-code') || document.getElementById('sticker-title');
    const lblHsn = document.getElementById('lbl-hsn') || document.getElementById('sticker-batch');
    const lblPrice = document.getElementById('lbl-price') || document.getElementById('sticker-price');

    if (lblTitle) lblTitle.innerText = title;
    if (lblCode) lblCode.innerText = code;
    if (lblHsn) lblHsn.innerText = 'HSN: ' + hsn;
    if (lblPrice) lblPrice.innerText = window.FormatUtil.formatRupees(parseFloat(price) || 0);

    const canvas = document.getElementById('barcode-canvas');
    if (canvas && window.BarcodeGenerator) {
      window.BarcodeGenerator.drawCode128('barcode-canvas', code);
    }
  },

  quickGenerate(code) {
    if (window.NavigationRouter) window.NavigationRouter.selectNav('view-barcode');
    const input = document.getElementById('bc-code-input') || document.getElementById('barcode-text-input');
    if (input) input.value = code;
    this.renderBarcodePreview();
    if (window.AudioSynthesizer) window.AudioSynthesizer.playBarcodeBeep();
  },

  generateBarcode() {
    this.renderBarcodePreview();
    if (window.AudioSynthesizer) window.AudioSynthesizer.playBarcodeBeep();
  },

  printBarcode() {
    window.print();
  }
};

window.onBarcodeItemSelect = (val) => window.BarcodeStudioController.onItemSelect(val);
window.renderBarcodePreview = () => window.BarcodeStudioController.renderBarcodePreview();
