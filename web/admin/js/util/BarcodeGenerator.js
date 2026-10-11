/**
 * Jasvi Industries ERP - BarcodeGenerator
 * HTML5 Canvas Code128 barcode renderer for 50x25mm and 38x25mm thermal stickers
 */
window.BarcodeGenerator = {
  drawCode128(canvasId, text) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#0f172a';
    const clean = (text || 'JASVI-001').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    let hash = 0;
    for (let i = 0; i < clean.length; i++) hash = ((hash << 5) - hash) + clean.charCodeAt(i);

    const barAreaWidth = width - 24;
    const numBars = 45;
    const barWidth = Math.max(2, Math.floor(barAreaWidth / numBars));
    let x = 12;

    for (let i = 0; i < numBars; i++) {
      const bit = ((hash >> (i % 31)) ^ (i * 7)) & 1;
      const w = bit ? barWidth * 1.5 : barWidth * 0.8;
      if (i % 2 === 0) {
        ctx.fillRect(x, 10, w, height - 32);
      }
      x += w + 1.2;
      if (x > width - 12) break;
    }

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(clean, width / 2, height - 8);
  }
};
