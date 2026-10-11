/**
 * Jasvi Industries ERP - BarcodeStudioController
 * Code128 thermal sticker generation and print layout matching desktop BarcodeStudioController
 */
window.BarcodeStudioController = {
  init() {
    this.generateBarcode();
  },

  generateBarcode() {
    const text = document.getElementById('barcode-text-input').value.trim() || 'M8-SS-HEX-001';
    const sub = document.getElementById('barcode-sub-input').value.trim();
    const batch = document.getElementById('barcode-batch-input').value.trim();
    const price = document.getElementById('barcode-price-input').value.trim();

    document.getElementById('sticker-title').innerText = text;
    document.getElementById('sticker-desc').innerText = sub;
    document.getElementById('sticker-batch').innerText = batch;
    document.getElementById('sticker-price').innerText = price;

    window.BarcodeGenerator.drawCode128('barcode-canvas', text);
    if (window.AudioSynthesizer) window.AudioSynthesizer.playBarcodeBeep();
  },

  quickGenerate(code) {
    if (window.NavigationRouter) window.NavigationRouter.selectNav('view-barcode-studio');
    const input = document.getElementById('barcode-text-input');
    if (input) input.value = code;
    this.generateBarcode();
  },

  printBarcode() {
    window.print();
  }
};
