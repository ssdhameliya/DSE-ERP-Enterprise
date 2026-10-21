/**
 * Jasvi Industries ERP - DocumentPdfGenerator
 * Client-Side PDF Generation Fallback Matching ProfessionalDocumentRenderer.java
 * Supports actions:
 * - 'download': Triggers browser download of .pdf file
 * - 'preview': Opens universal preview lightbox / new tab
 * - 'base64': Returns raw base64 string for email/WhatsApp attachments
 */
window.DocumentPdfGenerator = (function () {

  function getCompanyInfo() {
    return {
      name: 'JASVI INDUSTRIES',
      address: 'Plot No. 12, GIDC Industrial Estate, Odhav, Ahmedabad, Gujarat - 382415',
      gstin: '24AAACJ1234F1Z5',
      phone: '+91 98765 43210',
      email: 'sales@jasviindustries.in',
      terms: 'Subject to Ahmedabad Jurisdiction. Payment due as agreed.'
    };
  }

  function formatMoney(val) {
    const num = parseFloat(val) || 0;
    return 'INR ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function amountInWords(amount) {
    if (window.FormatUtil && typeof window.FormatUtil.amountInWords === 'function') {
      return window.FormatUtil.amountInWords(amount);
    }
    const num = Math.round(parseFloat(amount) || 0);
    return `INR : ${num.toLocaleString('en-IN')} Only`;
  }

  function createPdfDocument(title) {
    const jsPdfConstructor = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
    if (!jsPdfConstructor) return null;
    const doc = new jsPdfConstructor({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    return doc;
  }

  function handleOutput(doc, filename, action) {
    if (!doc) return null;
    if (action === 'base64') {
      const dataUri = doc.output('datauristring');
      return dataUri.split(',')[1];
    } else if (action === 'preview') {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      if (window.showUniversalPreviewModal) {
        window.showUniversalPreviewModal(blobUrl, 'application/pdf', filename);
      } else {
        window.open(blobUrl, '_blank');
      }
      return blobUrl;
    } else {
      doc.save(filename);
      return true;
    }
  }

  function generateQuotationPdf(quote, lines, action = 'download') {
    const doc = createPdfDocument('Quotation');
    if (!doc) throw new Error('jsPDF library not available');
    const comp = getCompanyInfo();

    // Palette
    const NAVY = [25, 58, 116];
    const BLUE = [4, 47, 111];
    const DARK = [24, 37, 59];
    const GRAY = [100, 116, 139];
    const LIGHT_BG = [247, 249, 252];

    // Header Top Bar
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, 595.28, 8, 'F');

    // Company Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...NAVY);
    doc.text(comp.name, 40, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(comp.address, 40, 56);
    doc.text(`GSTIN: ${comp.gstin} | Phone: ${comp.phone} | Email: ${comp.email}`, 40, 68);

    // Title Badge
    doc.setFillColor(...NAVY);
    doc.roundedRect(420, 26, 135, 26, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('QUOTATION ESTIMATE', 487.5, 43, { align: 'center' });

    // Metadata Grid
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(40, 84, 515.28, 60, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, 84, 515.28, 60, 4, 4, 'S');

    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text('Quotation #:', 50, 100);
    doc.text('Date:', 50, 116);
    doc.text('Valid Until:', 50, 132);

    doc.setFont('helvetica', 'normal');
    doc.text(quote.no || '-', 120, 100);
    doc.text(quote.date || '-', 120, 116);
    doc.text(quote.valid || '-', 120, 132);

    doc.setFont('helvetica', 'bold');
    doc.text('Customer:', 280, 100);
    doc.text('GSTIN:', 280, 116);
    doc.text('Salesperson:', 280, 132);

    doc.setFont('helvetica', 'normal');
    doc.text(quote.customer || 'Cash Customer', 350, 100);
    doc.text(quote.gstin || '-', 350, 116);
    doc.text(quote.salesperson || '-', 350, 132);

    // Items Table Header
    let y = 162;
    doc.setFillColor(...NAVY);
    doc.rect(40, y, 515.28, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('#', 48, y + 15);
    doc.text('Item Code / Description', 70, y + 15);
    doc.text('HSN', 260, y + 15);
    doc.text('Qty', 315, y + 15, { align: 'right' });
    doc.text('Rate (₹)', 380, y + 15, { align: 'right' });
    doc.text('Disc%', 425, y + 15, { align: 'right' });
    doc.text('GST%', 475, y + 15, { align: 'right' });
    doc.text('Total (₹)', 545, y + 15, { align: 'right' });

    y += 22;
    const items = lines || [];
    let subtotal = 0;
    let totalTax = 0;

    items.forEach((l, idx) => {
      const qty = parseFloat(l.quantity) || 1;
      const rate = parseFloat(l.rate) || 0;
      const disc = parseFloat(l.discount) || 0;
      const gst = parseFloat(l.gst) || 0;
      const gross = qty * rate;
      const discAmt = gross * (disc / 100);
      const taxable = gross - discAmt;
      const taxAmt = taxable * (gst / 100);
      const lineTotal = l.total || (taxable + taxAmt);

      subtotal += taxable;
      totalTax += taxAmt;

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(40, y, 515.28, 18, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(String(idx + 1), 48, y + 12);
      const desc = (l.description || l.code || '-');
      doc.text(desc.length > 36 ? desc.substring(0, 36) + '...' : desc, 70, y + 12);
      doc.text(l.hsn || '-', 260, y + 12);
      doc.text(String(qty), 315, y + 12, { align: 'right' });
      doc.text(rate.toFixed(2), 380, y + 12, { align: 'right' });
      doc.text(disc.toFixed(1) + '%', 425, y + 12, { align: 'right' });
      doc.text(gst.toFixed(1) + '%', 475, y + 12, { align: 'right' });
      doc.text(lineTotal.toFixed(2), 545, y + 12, { align: 'right' });

      y += 18;
    });

    const grandTotal = quote.amount || (subtotal + totalTax);

    // Totals Block
    y += 10;
    doc.setDrawColor(203, 213, 225);
    doc.line(340, y, 555.28, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal (Taxable):', 440, y, { align: 'right' });
    doc.text(formatMoney(subtotal), 545, y, { align: 'right' });
    y += 14;

    doc.text('CGST (9%):', 440, y, { align: 'right' });
    doc.text(formatMoney(totalTax / 2), 545, y, { align: 'right' });
    y += 14;

    doc.text('SGST (9%):', 440, y, { align: 'right' });
    doc.text(formatMoney(totalTax / 2), 545, y, { align: 'right' });
    y += 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text('Total Estimate:', 440, y, { align: 'right' });
    doc.text(formatMoney(grandTotal), 545, y, { align: 'right' });

    // Amount in Words
    y += 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(`Amount in Words: ${amountInWords(grandTotal)}`, 40, y);

    // Signatory
    y += 40;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('This is a computer generated quotation estimate. Valid for 30 days.', 40, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('For, JASVI INDUSTRIES', 440, y);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signatory', 440, y + 36);

    const filename = `Quotation_${quote.no || 'Estimate'}.pdf`;
    return handleOutput(doc, filename, action);
  }

  function generateReturnPdf(ret, lines, isSales, action = 'download') {
    const doc = createPdfDocument(isSales ? 'Credit Note' : 'Debit Note');
    if (!doc) throw new Error('jsPDF library not available');
    const comp = getCompanyInfo();

    const NAVY = [25, 58, 116];
    const DARK = [24, 37, 59];
    const GRAY = [100, 116, 139];
    const LIGHT_BG = [247, 249, 252];

    doc.setFillColor(...NAVY);
    doc.rect(0, 0, 595.28, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...NAVY);
    doc.text(comp.name, 40, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(comp.address, 40, 56);
    doc.text(`GSTIN: ${comp.gstin} | Phone: ${comp.phone} | Email: ${comp.email}`, 40, 68);

    const badgeTitle = isSales ? 'CREDIT NOTE' : 'DEBIT NOTE';
    doc.setFillColor(...NAVY);
    doc.roundedRect(420, 26, 135, 26, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(badgeTitle, 487.5, 43, { align: 'center' });

    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(40, 84, 515.28, 60, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, 84, 515.28, 60, 4, 4, 'S');

    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text('Note #:', 50, 100);
    doc.text('Date:', 50, 116);
    doc.text('Original Doc #:', 50, 132);

    doc.setFont('helvetica', 'normal');
    doc.text(ret.no || '-', 130, 100);
    doc.text(ret.date || '-', 130, 116);
    doc.text(ret.invoice || ret.originalDocNo || '-', 130, 132);

    const partyLabel = isSales ? 'Customer:' : 'Supplier:';
    doc.setFont('helvetica', 'bold');
    doc.text(partyLabel, 280, 100);
    doc.text('Reason:', 280, 116);
    doc.text('Status:', 280, 132);

    doc.setFont('helvetica', 'normal');
    doc.text(ret.party || ret.partyName || ret.customer || ret.supplier || '-', 340, 100);
    doc.text(ret.reason || ret.notes || '-', 340, 116);
    doc.text(ret.status || ret.refundStatus || 'APPROVED', 340, 132);

    let y = 162;
    doc.setFillColor(...NAVY);
    doc.rect(40, y, 515.28, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('#', 48, y + 15);
    doc.text('Item Description', 70, y + 15);
    doc.text('Qty', 315, y + 15, { align: 'right' });
    doc.text('Rate (₹)', 380, y + 15, { align: 'right' });
    doc.text('Tax %', 440, y + 15, { align: 'right' });
    doc.text('Amount (₹)', 545, y + 15, { align: 'right' });

    y += 22;
    const items = lines || [];
    let subtotal = 0;
    let totalTax = 0;

    items.forEach((l, idx) => {
      const qty = parseFloat(l.quantity) || 1;
      const rate = parseFloat(l.rate) || 0;
      const taxRate = parseFloat(l.tax || l.gst) || 0;
      const lineTotal = parseFloat(l.amount || l.totalAmount) || (qty * rate);
      let taxable = qty * rate;
      let tax = taxable * (taxRate / 100);

      if (lineTotal > 0 && Math.abs(lineTotal - (taxable + tax)) > 0.05) {
        taxable = lineTotal / (1 + taxRate / 100);
        tax = lineTotal - taxable;
      }

      subtotal += taxable;
      totalTax += tax;

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(40, y, 515.28, 18, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(String(idx + 1), 48, y + 12);
      const desc = (l.name || l.description || l.itemDescription || l.code || '-');
      doc.text(desc.length > 40 ? desc.substring(0, 40) + '...' : desc, 70, y + 12);
      doc.text(String(qty) + ' ' + (l.unit || 'NOS'), 315, y + 12, { align: 'right' });
      doc.text(rate.toFixed(2), 380, y + 12, { align: 'right' });
      doc.text(taxRate.toFixed(1) + '%', 440, y + 12, { align: 'right' });
      doc.text(lineTotal.toFixed(2), 545, y + 12, { align: 'right' });

      y += 18;
    });

    const grandTotal = ret.total || ret.amount || (subtotal + totalTax);

    y += 10;
    doc.setDrawColor(203, 213, 225);
    doc.line(340, y, 555.28, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal (Taxable):', 440, y, { align: 'right' });
    doc.text(formatMoney(subtotal), 545, y, { align: 'right' });
    y += 14;

    doc.text('Tax Amount:', 440, y, { align: 'right' });
    doc.text(formatMoney(totalTax), 545, y, { align: 'right' });
    y += 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text('Total Value:', 440, y, { align: 'right' });
    doc.text(formatMoney(grandTotal), 545, y, { align: 'right' });

    y += 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(`Amount in Words: ${amountInWords(grandTotal)}`, 40, y);

    y += 40;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('This is an authorized return voucher for inventory & accounts adjustment.', 40, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('For, JASVI INDUSTRIES', 440, y);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signatory', 440, y + 36);

    const filename = `${isSales ? 'Sales_Return_Credit_Note' : 'Purchase_Return_Debit_Note'}_${ret.no || 'voucher'}.pdf`;
    return handleOutput(doc, filename, action);
  }

  return {
    generateQuotationPdf,
    generateReturnPdf
  };
})();
