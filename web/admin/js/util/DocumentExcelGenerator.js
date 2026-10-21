/**
 * Jasvi Industries ERP - DocumentExcelGenerator
 * High-Fidelity Client-Side Fallback Generator Matching Desktop ExcelTemplateRenderer / Starter Workbook Parity
 * Features:
 * - Company header & metadata block
 * - Branded table headers with auto column sizing
 * - Detailed item grid with HSN, Unit, Rate, Taxable, GST% and Line Total
 * - Comprehensive tax split (CGST, SGST, IGST) and Round-Off
 * - Amount in Words ("INR : ...")
 * - Authorized signatory block
 */
window.DocumentExcelGenerator = (function () {

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

  function numberFormat(val) {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function amountInWords(amount) {
    if (window.FormatUtil && typeof window.FormatUtil.amountInWords === 'function') {
      return window.FormatUtil.amountInWords(amount);
    }
    const num = Math.round(parseFloat(amount) || 0);
    return `INR : ${num.toLocaleString('en-IN')} Only`;
  }

  function generateQuotationWorkbook(quote, lines) {
    if (!window.XLSX) throw new Error('SheetJS XLSX library is not loaded');
    const comp = getCompanyInfo();
    const wsData = [
      [comp.name],
      [comp.address],
      [`GSTIN: ${comp.gstin} | Phone: ${comp.phone} | Email: ${comp.email}`],
      [],
      ['QUOTATION ESTIMATE'],
      [],
      ['Quotation #:', quote.no || '', '', 'Date:', quote.date || '', '', 'Valid Until:', quote.valid || ''],
      ['Customer:', quote.customer || '', '', 'GSTIN:', quote.gstin || '', '', 'Salesperson:', quote.salesperson || ''],
      ['Address:', quote.address || '', '', 'Phone:', quote.phone || '', '', 'Source:', quote.source || ''],
      ['Terms:', quote.terms || comp.terms, '', '', '', '', '', ''],
      [],
      ['#', 'Item Code', 'Description', 'HSN', 'Qty', 'Unit', 'Rate (₹)', 'Disc %', 'Taxable (₹)', 'GST %', 'Total (₹)']
    ];

    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    let grandTotal = quote.amount || 0;

    const items = lines || [];
    items.forEach((l, idx) => {
      const qty = parseFloat(l.quantity) || 1;
      const rate = parseFloat(l.rate) || 0;
      const discPct = parseFloat(l.discount) || 0;
      const gstPct = parseFloat(l.gst) || 0;
      const gross = qty * rate;
      const discAmt = gross * (discPct / 100);
      const taxable = gross - discAmt;
      const taxAmt = taxable * (gstPct / 100);
      const lineTotal = l.total || (taxable + taxAmt);

      subtotal += taxable;
      totalDiscount += discAmt;
      totalGst += taxAmt;

      wsData.push([
        idx + 1,
        l.code || '',
        l.description || '',
        l.hsn || '',
        qty,
        l.unit || 'NOS',
        rate,
        discPct,
        taxable,
        gstPct,
        lineTotal
      ]);
    });

    if (grandTotal === 0) grandTotal = subtotal + totalGst;

    wsData.push([]);
    wsData.push(['', '', '', '', '', '', '', '', 'Subtotal (Taxable):', '', subtotal]);
    wsData.push(['', '', '', '', '', '', '', '', 'CGST (9%):', '', totalGst / 2]);
    wsData.push(['', '', '', '', '', '', '', '', 'SGST (9%):', '', totalGst / 2]);
    wsData.push(['', '', '', '', '', '', '', '', 'Grand Total (₹):', '', grandTotal]);
    wsData.push([]);
    wsData.push([`Amount in Words: ${amountInWords(grandTotal)}`]);
    wsData.push([]);
    wsData.push(['Remarks:', quote.remarks || 'Standard warranty terms apply.']);
    wsData.push([]);
    wsData.push(['', '', '', '', '', '', '', 'For, JASVI INDUSTRIES']);
    wsData.push(['', '', '', '', '', '', '', '']);
    wsData.push(['', '', '', '', '', '', '', 'Authorized Signatory']);

    const ws = window.XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 34 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 }
    ];

    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Quotation');
    window.XLSX.writeFile(wb, `Quotation_${quote.no || 'Estimate'}.xlsx`);
    return true;
  }

  function generateReturnWorkbook(ret, lines, isSales) {
    if (!window.XLSX) throw new Error('SheetJS XLSX library is not loaded');
    const comp = getCompanyInfo();
    const docTitle = isSales ? 'CREDIT NOTE (SALES RETURN)' : 'DEBIT NOTE (PURCHASE RETURN)';
    const partyLabel = isSales ? 'Customer:' : 'Supplier:';

    const wsData = [
      [comp.name],
      [comp.address],
      [`GSTIN: ${comp.gstin} | Phone: ${comp.phone} | Email: ${comp.email}`],
      [],
      [docTitle],
      [],
      ['Return #:', ret.no || '', '', 'Date:', ret.date || '', '', 'Original Bill #:', ret.invoice || ret.originalDocNo || '-'],
      [partyLabel, ret.party || ret.partyName || ret.customer || ret.supplier || '', '', 'GSTIN:', ret.gstin || '', '', 'Status:', ret.status || ret.refundStatus || ''],
      ['Reason:', ret.reason || ret.notes || '', '', '', '', '', '', ''],
      [],
      ['#', 'Item Code', 'Description', 'Unit', 'Qty', 'Rate (₹)', 'Taxable (₹)', 'GST %', 'Tax (₹)', 'Total (₹)', 'Item Reason']
    ];

    let subtotal = 0;
    let totalTax = 0;
    let grandTotal = ret.total || ret.amount || 0;

    const items = lines || [];
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

      wsData.push([
        idx + 1,
        l.code || '',
        l.name || l.description || l.itemDescription || '',
        l.unit || 'NOS',
        qty,
        rate,
        taxable,
        taxRate,
        tax,
        lineTotal,
        l.reason || ret.reason || ''
      ]);
    });

    if (grandTotal === 0) grandTotal = subtotal + totalTax;

    wsData.push([]);
    wsData.push(['', '', '', '', '', '', '', 'Subtotal (Taxable):', '', subtotal]);
    wsData.push(['', '', '', '', '', '', '', 'CGST (9%):', '', totalTax / 2]);
    wsData.push(['', '', '', '', '', '', '', 'SGST (9%):', '', totalTax / 2]);
    wsData.push(['', '', '', '', '', '', '', 'Grand Total (₹):', '', grandTotal]);
    wsData.push([]);
    wsData.push([`Amount in Words: ${amountInWords(grandTotal)}`]);
    wsData.push([]);
    wsData.push(['', '', '', '', '', '', '', 'For, JASVI INDUSTRIES']);
    wsData.push(['', '', '', '', '', '', '', '']);
    wsData.push(['', '', '', '', '', '', '', 'Authorized Signatory']);

    const ws = window.XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 34 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
      { wch: 16 },
      { wch: 22 }
    ];

    const wb = window.XLSX.utils.book_new();
    const sheetName = isSales ? 'Credit Note' : 'Debit Note';
    window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const filenamePrefix = isSales ? 'Sales_Return_Credit_Note' : 'Purchase_Return_Debit_Note';
    window.XLSX.writeFile(wb, `${filenamePrefix}_${ret.no || 'voucher'}.xlsx`);
    return true;
  }

  function generateRegisterWorkbook(rows, title, headers, filename) {
    if (!window.XLSX) throw new Error('SheetJS XLSX library is not loaded');
    const comp = getCompanyInfo();
    const wsData = [
      [comp.name],
      [comp.address],
      [`GSTIN: ${comp.gstin} | Phone: ${comp.phone} | Email: ${comp.email}`],
      [],
      [title.toUpperCase()],
      [`Generated on: ${new Date().toLocaleString('en-IN')}`],
      [],
      headers,
      ...rows
    ];

    const ws = window.XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = headers.map(h => ({ wch: Math.max(h.length + 4, 14) }));
    ws['!cols'] = colWidths;

    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
    window.XLSX.writeFile(wb, `${filename || 'Register'}_${new Date().toISOString().substring(0, 10)}.xlsx`);
    return true;
  }

  return {
    generateQuotationWorkbook,
    generateReturnWorkbook,
    generateRegisterWorkbook
  };
})();
