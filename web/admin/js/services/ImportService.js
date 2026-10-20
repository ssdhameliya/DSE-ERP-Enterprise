/**
 * Jasvi Industries ERP - ImportService
 * Desktop Parity with:
 * - org.example.service.ImportService
 * - org.example.importing.ImportModuleRegistry
 * - org.example.importing.ImportTemplateService
 * - org.example.importing.ImportMappingSupport
 * - org.example.importing.ImportPreviewService
 * - org.example.importing.ImportResultReportService
 * - org.example.importing.ImportDocumentPolicy
 */
window.ImportService = (function() {
  'use strict';

  // -------------------------------------------------------------
  // 1. MODULE REGISTRY (Desktop ImportModuleRegistry.java Parity)
  // -------------------------------------------------------------
  const ITEM_FIELDS = [
    'item_code', 'description', 'category', 'brand', 'material', 'size', 'unit', 'hsn', 'gst',
    'discount_percent', 'purchase_price', 'selling_price', 'remarks', 'opening_stock', 'minimum_stock', 'location'
  ];
  const CUSTOMER_FIELDS = [
    'party_code', 'name', 'contact_person', 'phone', 'email', 'gstin', 'address', 'opening_balance', 'is_active'
  ];
  const SUPPLIER_FIELDS = [
    'party_code', 'name', 'contact_person', 'phone', 'email', 'gstin', 'address', 'opening_balance', 'is_active'
  ];
  const PURCHASE_DOCUMENT_FIELDS = [
    'invoice_no', 'invoice_date', 'party_code', 'item_code', 'quantity', 'rate', 'gst_percent', 'gst_type',
    'payment_terms', 'paid_amount', 'remarks',
    'charge_1_type', 'charge_1_amount', 'charge_1_taxable', 'charge_1_gst_percent',
    'charge_2_type', 'charge_2_amount', 'charge_2_taxable', 'charge_2_gst_percent',
    'additional_charges', 'attachment_file', 'attachment_files'
  ];
  const SALES_DOCUMENT_FIELDS = [
    'invoice_no', 'invoice_date', 'party_code', 'item_code', 'quantity', 'rate', 'gst_percent', 'gst_type',
    'payment_terms', 'paid_amount', 'remarks',
    'charge_1_type', 'charge_1_amount', 'charge_1_taxable', 'charge_1_gst_percent',
    'charge_2_type', 'charge_2_amount', 'charge_2_taxable', 'charge_2_gst_percent', 'attachment_file'
  ];
  const MASTER_FIELDS = [
    'category_code', 'category_name', 'category_description', 'value_code', 'value', 'value_description', 'display_order', 'is_active'
  ];
  const PURCHASE_RECON_FIELDS = [
    'supplier_name', 'supplier_gstin', 'supplier_invoice_no', 'invoice_date', 'taxable_value', 'cgst', 'sgst', 'igst', 'invoice_value'
  ];
  const BANK_STATEMENT_FIELDS = [
    'transaction_date', 'value_date', 'description', 'reference', 'amount', 'direction', 'balance'
  ];

  function getModuleFields(module) {
    switch (module) {
      case 'Customers/CRM':
      case 'Customers / CRM':
        return CUSTOMER_FIELDS;
      case 'Suppliers/HRM':
      case 'Suppliers / HRM':
        return SUPPLIER_FIELDS;
      case 'Sales':
        return SALES_DOCUMENT_FIELDS;
      case 'Purchases':
        return PURCHASE_DOCUMENT_FIELDS;
      case 'Master Categories and Values':
      case 'Master Categories & Values':
        return MASTER_FIELDS;
      case 'Purchase Recon':
        return PURCHASE_RECON_FIELDS;
      case 'Bank Statement':
        return BANK_STATEMENT_FIELDS;
      default:
        return ITEM_FIELDS;
    }
  }

  function getRequiredFields(module) {
    switch (module) {
      case 'Customers/CRM':
      case 'Customers / CRM':
        return new Set(['party_code', 'name']);
      case 'Suppliers/HRM':
      case 'Suppliers / HRM':
        return new Set(['party_code', 'name', 'email']);
      case 'Sales':
      case 'Purchases':
        return new Set(['invoice_no', 'invoice_date', 'party_code', 'item_code', 'quantity', 'rate']);
      case 'Master Categories and Values':
      case 'Master Categories & Values':
        return new Set(['category_code', 'category_name', 'value_code', 'value']);
      case 'Purchase Recon':
        return new Set(['supplier_name', 'supplier_invoice_no', 'invoice_date', 'invoice_value']);
      case 'Bank Statement':
        return new Set(['transaction_date', 'amount']);
      default:
        return new Set(['item_code', 'description', 'unit', 'hsn', 'remarks']);
    }
  }

  function humanize(field) {
    if (!field) return '';
    return field.split('_').map(word => {
      if (!word) return '';
      const wLower = word.toLowerCase();
      if (['gst', 'gstin', 'hsn', 'crm', 'hrm', 'sku'].includes(wLower)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  }

  function getTargetView(module) {
    switch (module) {
      case 'Customers/CRM':
      case 'Customers / CRM':
        return 'view-customers';
      case 'Suppliers/HRM':
      case 'Suppliers / HRM':
        return 'view-suppliers';
      case 'Sales':
        return 'view-sales-register';
      case 'Purchases':
        return 'view-purchase-register';
      case 'Master Categories and Values':
      case 'Master Categories & Values':
        return 'view-master-data';
      case 'Purchase Recon':
        return 'view-purchase-recon';
      case 'Bank Statement':
        return 'view-bank-statement';
      default:
        return 'view-inventory';
    }
  }

  function getExampleRows(module) {
    const today = new Date().toISOString().substring(0, 10);
    switch (module) {
      case 'Customers/CRM':
      case 'Customers / CRM':
        return [
          ['CUS-0001', 'ABC Enterprises', 'Ravi Patel', '9876543210', 'accounts@example.com', '24AAAAA1111A1Z5', 'Ahmedabad, Gujarat', '0', 'true']
        ];
      case 'Suppliers/HRM':
      case 'Suppliers / HRM':
        return [
          ['SUP-0001', 'Steel Supplier Ltd', 'Amit Shah', '9876500000', 'sales@supplier.example', '24BBBBB2222B1Z4', 'Rajkot, Gujarat', '0', 'true']
        ];
      case 'Sales':
        return [
          ['SAL-GST-0001', today, 'CUS-0001', 'ITEM-0001', '2', '1500', '18', 'GST', '15 Days', '0', 'Sample intra-state sale with two optional charges', 'Freight', '250', 'true', '18', 'Packing', '100', 'false', '0', ''],
          ['SAL-IGST-0002', today, 'CUS-0002', 'ITEM-0001', '1', '2000', '18', 'IGST', '15 Days', '0', 'Sample inter-state sale; attachment is optional', '', '', '', '', '', '', '', '', '']
        ];
      case 'Purchases':
        return [
          ['PUR-GST-0001', today, 'SUP-0001', 'ITEM-0001', '10', '1200', '18', 'GST', '15 Days', '0', 'Sample intra-state purchase with unlimited charge syntax', 'Freight', '250', 'true', '18', 'Packing', '100', 'false', '0', 'Insurance|75|true|18;Handling|50|false|0', '', ''],
          ['PUR-IGST-0002', today, 'SUP-0002', 'ITEM-0001', '5', '1200', '18', 'IGST', '15 Days', '0', 'Sample inter-state purchase; multiple attachments are optional', '', '', '', '', '', '', '', '', 'Freight|250|true|18', '', 'invoice.pdf;quality-certificate.pdf']
        ];
      case 'Master Categories and Values':
      case 'Master Categories & Values':
        return [
          ['UNIT', 'Unit', 'Units of measure', 'UNT001', 'Nos', 'Number of items', '1', 'true']
        ];
      case 'Purchase Recon':
        return [
          ['Shree Ram Engineering Works', '24APCPJ0791E1Z9', '25/26/61', today, '10620.00', '955.80', '955.80', '0.00', '12532.00']
        ];
      case 'Bank Statement':
        return [
          [today, today, 'NEFT-RELIANCE IND-INVOICE SETTLEMENT', 'UTR892374829', '250000.00', 'CR', '1450000.00']
        ];
      default:
        return [
          ['ITEM-0001', 'MS Round Pipe', 'Pipe', 'Jasvi', 'Mild Steel', '25 mm', 'Nos', '73063000', '18', '0', '1200', '1500', 'Sample item', '0', '10', 'Main Warehouse']
        ];
    }
  }

  // -------------------------------------------------------------
  // 2. REFERENCE FORMAT VALIDATION (ReferenceFormatRules.java Parity)
  // -------------------------------------------------------------
  function referenceToRegex(format, docDate) {
    if (!format) return '^.*$';
    const d = docDate ? new Date(docDate) : null;
    let out = '^';
    for (let i = 0; i < format.length;) {
      if (format.startsWith('YYYY', i)) {
        out += d ? String(d.getFullYear()).padStart(4, '0') : '\\d{4}';
        i += 4;
        continue;
      }
      if (format.startsWith('YY', i)) {
        out += d ? String(d.getFullYear() % 100).padStart(2, '0') : '\\d{2}';
        i += 2;
        continue;
      }
      if (format.startsWith('MM', i)) {
        out += d ? String(d.getMonth() + 1).padStart(2, '0') : '\\d{2}';
        i += 2;
        continue;
      }
      if (format.startsWith('DD', i)) {
        out += d ? String(d.getDate()).padStart(2, '0') : '\\d{2}';
        i += 2;
        continue;
      }
      if (format.charAt(i) === 'X') {
        let j = i;
        while (j < format.length && format.charAt(j) === 'X') j++;
        out += `\\d{${j - i},}`;
        i = j;
        continue;
      }
      const c = format.charAt(i++);
      if ('\\.^$|?*+()[]{}'.includes(c)) out += '\\';
      out += c;
    }
    return out + '$';
  }

  function toIsoDate(val) {
    if (!val) return new Date().toISOString().substring(0, 10);
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.substring(0, 10);
    }
    const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmy) {
      const dd = dmy[1].padStart(2, '0');
      const mm = dmy[2].padStart(2, '0');
      const yyyy = dmy[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return new Date().toISOString().substring(0, 10);
  }

  function toIsoTimestamp(val, dateIso) {
    if (!val) return `${dateIso}T00:00:00`;
    const s = String(val).trim();
    if (s.includes('T') && s.length >= 19) {
      return s.substring(0, 19);
    }
    const timeMatch = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (timeMatch) {
      let hh = parseInt(timeMatch[1], 10);
      const mm = timeMatch[2];
      const ss = timeMatch[3] || '00';
      const ampm = (timeMatch[4] || '').toUpperCase();
      if (ampm === 'PM' && hh < 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;
      const hhStr = String(hh).padStart(2, '0');
      return `${dateIso}T${hhStr}:${mm}:${ss}`;
    }
    return `${dateIso}T12:00:00`;
  }

  function matchesReferenceFormat(format, value, docDate) {
    if (!format || !value) return false;
    try {
      const reg = new RegExp(referenceToRegex(format.trim(), docDate), 'i');
      return reg.test(value.trim());
    } catch (e) {
      return false;
    }
  }

  // -------------------------------------------------------------
  // 3. AUTO-MAPPING ALIASES (ImportMappingSupport.java Parity)
  // -------------------------------------------------------------
  function normalizeKey(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function areKnownAliases(normField, normHeader) {
    switch (normField) {
      case 'gst':
      case 'gstpercent':
        return normHeader === 'gstpercent' || normHeader === 'gstrate' || normHeader === 'gst' || normHeader === 'taxrate';
      case 'partycode':
        return normHeader === 'customercode' || normHeader === 'suppliercode' || normHeader === 'partyid' || normHeader === 'vendorcode';
      case 'description':
        return normHeader === 'itemname' || normHeader === 'name' || normHeader === 'itemdescription' || normHeader === 'productname' || normHeader === 'narration' || normHeader === 'particulars' || normHeader === 'description' || normHeader === 'transactiondetails' || normHeader === 'remarks' || normHeader === 'txndetails';
      case 'invoiceno':
        return normHeader === 'billno' || normHeader === 'documentno' || normHeader === 'invoicenumber' || normHeader === 'supplierbillno';
      case 'invoicedate':
        return normHeader === 'billdate' || normHeader === 'documentdate' || normHeader === 'date';
      case 'suppliername':
        return normHeader === 'tradelegalname' || normHeader === 'tradename' || normHeader === 'legalname' || normHeader === 'supplier' || normHeader === 'vendor';
      case 'suppliergstin':
        return normHeader === 'gstinofsupplier' || normHeader === 'suppliergstin' || normHeader === 'gstin';
      case 'supplierinvoiceno':
        return normHeader === 'invoicenumber' || normHeader === 'invoiceno' || normHeader === 'billno' || normHeader === 'supplierinvoiceno';
      case 'taxablevalue':
        return normHeader === 'taxablevalue' || normHeader === 'taxableamount';
      case 'cgst':
        return normHeader === 'centraltax' || normHeader === 'cgst' || normHeader === 'cgstamount';
      case 'sgst':
        return normHeader === 'stateuttax' || normHeader === 'statetax' || normHeader === 'sgst' || normHeader === 'sgstamount';
      case 'igst':
        return normHeader === 'integratedtax' || normHeader === 'igst' || normHeader === 'igstamount';
      case 'invoicevalue':
        return normHeader === 'invoicevalue' || normHeader === 'invoicetotal' || normHeader === 'totalinvoicevalue' || normHeader === 'totalamount';
      case 'isactive':
        return normHeader === 'active' || normHeader === 'status';
      case 'transactiondate':
      case 'date':
        return normHeader === 'txndate' || normHeader === 'transactiondate' || normHeader === 'date' || normHeader === 'txndatetime' || normHeader === 'postingdate' || normHeader === 'valuedate';
      case 'valuedate':
        return normHeader === 'valuedate' || normHeader === 'valuedt' || normHeader === 'valdate' || normHeader === 'date';
      case 'reference':
        return normHeader === 'chqrefno' || normHeader === 'referenceno' || normHeader === 'refchequeno' || normHeader === 'utrno' || normHeader === 'chequeno' || normHeader === 'chqno' || normHeader === 'refno' || normHeader === 'referencenumber' || normHeader === 'utr' || normHeader === 'chequereferenceno' || normHeader === 'txnrefno';
      case 'amount':
        return normHeader === 'amount' || normHeader === 'txnamount' || normHeader === 'transactionamount' || normHeader === 'netamount';
      case 'direction':
        return normHeader === 'drcr' || normHeader === 'debitcredit' || normHeader === 'type' || normHeader === 'crdr' || normHeader === 'dr' || normHeader === 'cr';
      case 'debit':
        return normHeader === 'debit' || normHeader === 'debitamount' || normHeader === 'withdrawal' || normHeader === 'withdrawalamount' || normHeader === 'dr';
      case 'credit':
        return normHeader === 'credit' || normHeader === 'creditamount' || normHeader === 'deposit' || normHeader === 'depositamount' || normHeader === 'cr';
      case 'balance':
        return normHeader === 'balance' || normHeader === 'closingbalance' || normHeader === 'runningbalance' || normHeader === 'availablebalance';
      case 'purchaseprice':
        return normHeader === 'costprice' || normHeader === 'purprice';
      case 'sellingprice':
        return normHeader === 'saleprice' || normHeader === 'sellprice';
      case 'openingstock':
        return normHeader === 'initialstock' || normHeader === 'stock';
      case 'minimumstock':
        return normHeader === 'reorderlevel' || normHeader === 'minstock';
      default:
        return false;
    }
  }

  function autoMap(domainFields, headers) {
    const result = {};
    if (!domainFields || !headers) return result;

    domainFields.forEach(field => {
      const normField = normalizeKey(field);
      for (const header of headers) {
        const normHeader = normalizeKey(header);
        if (normHeader === normField || areKnownAliases(normField, normHeader)) {
          result[field] = header;
          break;
        }
      }
    });
    return result;
  }

  // -------------------------------------------------------------
  // 4. TEMPLATE EXCEL GENERATOR (ImportTemplateService.java Parity)
  // -------------------------------------------------------------
  function downloadTemplate(moduleName) {
    const fields = getModuleFields(moduleName);
    const examples = getExampleRows(moduleName);
    const company = (window.AuthService && window.AuthService.getCurrentUser()?.company) || 'Jasvi Industries Pvt Ltd';
    const version = (window.DSE_VERSION && window.DSE_VERSION.desktopVersion) || '10.0.34';

    if (window.XLSX) {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Import Template
      const templateData = [fields, ...examples];
      const wsTemplate = XLSX.utils.aoa_to_sheet(templateData);

      // Auto-fit column widths
      wsTemplate['!cols'] = fields.map((f, colIdx) => {
        let maxLen = f.length;
        examples.forEach(r => {
          if (r[colIdx]) maxLen = Math.max(maxLen, String(r[colIdx]).length);
        });
        return { wch: Math.max(14, maxLen + 3) };
      });
      // Freeze header row
      wsTemplate['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }];

      XLSX.utils.book_append_sheet(wb, wsTemplate, 'Import Template');

      // Sheet 2: Instructions
      const guidance = [
        [`${company} ${version} Import Template`, 'Keep identifier and header names unchanged.'],
        ['Recommended mode', 'Update non-blank fields: blank spreadsheet cells preserve existing master data.'],
        ['Create new only', 'Existing identifiers are skipped; only new records are created.'],
        ['Create or update', 'Existing master records are replaced with supplied values.'],
        ['Skip existing', 'Existing identifiers are never changed.'],
        ['Financial documents', 'Existing posted Sales and Purchase invoices are always protected and skipped.'],
        ['GST / IGST', 'For Sales/Purchases use gst_type = GST for intra-state or IGST for inter-state. Enter gst_percent only; ERP calculates tax amounts from line values.'],
        ['GST calculation', 'GST is calculated as CGST + SGST (equal halves); IGST applies the full GST rate as IGST. Do not enter tax amounts manually.'],
        ['Unlimited Purchase charges', 'Purchases may use additional_charges with entries separated by semicolons (e.g. Freight|250|true|18;Packing|100|false|0).'],
        ['Multiple Purchase attachments', 'Use attachment_files for semicolon-separated file paths.'],
        ['Safe process', 'Run Validate only first, review the preview and generated result report, then import.']
      ];
      const wsInstructions = XLSX.utils.aoa_to_sheet(guidance);
      wsInstructions['!cols'] = [{ wch: 30 }, { wch: 95 }];
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

      const safeModule = moduleName.replace(/[^A-Za-z0-9]+/g, '_');
      XLSX.writeFile(wb, `${safeModule}_Template.xlsx`);
    } else {
      // CSV Fallback
      const csvContent = [
        fields.join(','),
        ...examples.map(row => row.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))
      ].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${moduleName.replace(/[^A-Za-z0-9]+/g, '_')}_Template.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  // -------------------------------------------------------------
  // 5. WORKBOOK PARSING (.xlsx, .xls, .csv)
  // -------------------------------------------------------------
  async function parseFile(file, moduleName) {
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const domainFields = getModuleFields(moduleName);

    if (window.XLSX) {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

      // Detect layout: find sheet with best header match
      let bestSheet = wb.SheetNames[0];
      let bestMatchCount = -1;
      let detectedHeaders = [];
      let detectedRows = [];

      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        const rawJson = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rawJson || rawJson.length === 0) continue;

        // Check first 15 rows for headers
        for (let r = 0; r < Math.min(15, rawJson.length); r++) {
          const row = rawJson[r].map(c => String(c).trim());
          const matchCount = row.filter(cell => {
            const norm = normalizeKey(cell);
            return domainFields.some(df => normalizeKey(df) === norm || areKnownAliases(normalizeKey(df), norm));
          }).length;

          if (matchCount > bestMatchCount) {
            bestMatchCount = matchCount;
            bestSheet = name;
            detectedHeaders = row;
            detectedRows = rawJson.slice(r + 1).filter(rData => rData.some(c => String(c).trim().length > 0));
          }
        }
      }

      if (detectedHeaders.length === 0 && wb.SheetNames.length > 0) {
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawJson = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (rawJson && rawJson.length > 0) {
          detectedHeaders = rawJson[0].map(c => String(c).trim());
          detectedRows = rawJson.slice(1).filter(rData => rData.some(c => String(c).trim().length > 0));
        }
      }

      return {
        headers: detectedHeaders,
        rows: detectedRows,
        sheetNames: wb.SheetNames,
        selectedSheet: bestSheet
      };
    } else {
      // Plain text CSV parser fallback
      const text = await file.text();
      return parseCsvText(text, domainFields);
    }
  }

  function parseCsvText(csvText, domainFields = []) {
    const rawLines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (rawLines.length === 0) return { headers: [], rows: [] };

    function parseRow(line) {
      const row = [];
      let inQuotes = false;
      let token = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          if (inQuotes && line[i + 1] === char) {
            token += char;
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(token.trim());
          token = '';
        } else {
          token += char;
        }
      }
      row.push(token.trim());
      return row;
    }

    const parsedLines = rawLines.map(parseRow);
    let bestHeaderIdx = 0;
    let bestMatchCount = -1;

    if (domainFields && domainFields.length > 0) {
      for (let r = 0; r < Math.min(15, parsedLines.length); r++) {
        const row = parsedLines[r];
        const matchCount = row.filter(cell => {
          const norm = normalizeKey(cell);
          return domainFields.some(df => normalizeKey(df) === norm || areKnownAliases(normalizeKey(df), norm));
        }).length;
        if (matchCount > bestMatchCount) {
          bestMatchCount = matchCount;
          bestHeaderIdx = r;
        }
      }
    }

    const headers = parsedLines[bestHeaderIdx] || [];
    const rows = parsedLines.slice(bestHeaderIdx + 1).filter(r => r.some(x => x.length > 0));
    return { headers, rows, sheetNames: ['CSV'], selectedSheet: 'CSV' };
  }

  // -------------------------------------------------------------
  // 5.1 DOCUMENT CHARGES & CANONICAL TOTALS ENGINE (Desktop Parity)
  // -------------------------------------------------------------
  function parseFlexibleBoolean(val, field) {
    if (val === true || val === false) return val;
    const clean = String(val || '').trim().toLowerCase();
    if (['true', 'yes', 'y', '1', 'taxable'].includes(clean)) return true;
    if (['false', 'no', 'n', '0', 'non-taxable', 'nontaxable'].includes(clean)) return false;
    if (!clean) return false;
    throw new Error(`${field} must be true/false, yes/no, or 1/0`);
  }

  function parseTermDays(term) {
    if (!term) return 0;
    const match = String(term).match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  function computeDueDate(invDate, terms) {
    if (!invDate) return null;
    const days = parseTermDays(terms);
    const d = new Date(invDate);
    if (isNaN(d.getTime())) return invDate;
    d.setDate(d.getDate() + days);
    return d.toISOString().substring(0, 10);
  }

  function parseDocumentCharge(rows, index, getVal) {
    const prefix = `charge_${index}`;
    let type = null;
    let amount = null;
    let taxable = null;
    let gst = null;

    for (const r of rows) {
      const t = getVal(r, `${prefix}_type`);
      const a = getVal(r, `${prefix}_amount`);
      const tx = getVal(r, `${prefix}_taxable`);
      const g = getVal(r, `${prefix}_gst_percent`);

      if (t && !type) type = t.trim();
      if (a !== '' && a !== undefined && a !== null && amount === null) {
        const num = parseFloat(String(a).replace(/,/g, ''));
        if (isNaN(num)) throw new Error(`${prefix}_amount must be a valid number`);
        amount = num;
      }
      if (tx !== '' && tx !== undefined && tx !== null && taxable === null) {
        taxable = parseFlexibleBoolean(tx, `${prefix}_taxable`);
      }
      if (g !== '' && g !== undefined && g !== null && gst === null) {
        const num = parseFloat(String(g).replace(/,/g, ''));
        if (isNaN(num)) throw new Error(`${prefix}_gst_percent must be a valid number`);
        gst = num;
      }
    }

    const supplied = (type && type.length > 0) || (amount !== null) || (taxable !== null) || (gst !== null);
    if (!supplied) return null;

    const amountValue = amount === null ? 0 : amount;
    if (amountValue <= 0) {
      throw new Error(`${prefix}_amount must be greater than zero when a charge is supplied`);
    }
    if (!type || !type.trim()) {
      throw new Error(`${prefix}_type is required when a charge amount is supplied`);
    }
    const taxableValue = taxable === true;
    const gstValue = gst === null ? 0 : gst;
    if (gstValue < 0 || gstValue > 100) {
      throw new Error(`${prefix}_gst_percent must be between 0 and 100`);
    }
    if (!taxableValue && gstValue > 0.0001) {
      throw new Error(`${prefix}_gst_percent requires ${prefix}_taxable=true`);
    }

    return {
      chargeType: type.trim(),
      amount: amountValue,
      taxable: taxableValue,
      gstPercent: taxableValue ? gstValue : 0
    };
  }

  function parseDocumentCharges(rows, getVal) {
    const charges = [];
    const c1 = parseDocumentCharge(rows, 1, getVal);
    if (c1) charges.push(c1);
    const c2 = parseDocumentCharge(rows, 2, getVal);
    if (c2) charges.push(c2);
    return charges;
  }

  function parseAdditionalPurchaseCharges(text) {
    if (!text || typeof text !== 'string') return [];
    const out = [];
    for (const raw of text.split(';')) {
      const entry = raw ? raw.trim() : '';
      if (!entry) continue;
      const parts = entry.split('|');
      if (parts.length < 2 || parts.length > 4) {
        throw new Error(`additional_charges entry must be Type|Amount|Taxable|GSTPercent: ${entry}`);
      }
      const type = parts[0].trim();
      if (!type) throw new Error('additional_charges charge type is required');
      const amount = parseFloat(parts[1].trim().replace(/,/g, ''));
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`additional_charges amount must be greater than zero for ${type}`);
      }
      const taxable = parts.length >= 3 && parts[2].trim() ? parseFlexibleBoolean(parts[2], `additional_charges taxable for ${type}`) : false;
      let gst = 0;
      if (parts.length >= 4 && parts[3].trim()) {
        gst = parseFloat(parts[3].trim());
        if (isNaN(gst) || gst < 0 || gst > 100) throw new Error(`additional_charges GST percent must be between 0 and 100 for ${type}`);
      }
      if (!taxable && gst > 0.0001) throw new Error(`additional_charges GST percent requires taxable=true for ${type}`);
      out.push({
        chargeType: type,
        amount: amount,
        taxable: taxable,
        gstPercent: taxable ? gst : 0
      });
    }
    return out;
  }

  function calculateDocumentTotals(lines, charges) {
    let gross = 0;
    let discount = 0;
    let itemTaxable = 0;
    let lineTax = 0;

    for (const l of (lines || [])) {
      const qty = l.quantity || 0;
      const rate = l.rate || 0;
      const discAmt = l.discountAmount !== undefined ? l.discountAmount : Math.round(((qty * rate * (l.discountPercent || 0)) / 100) * 100) / 100;
      const taxable = Math.max(0, Math.round(((qty * rate) - discAmt) * 100) / 100);
      const tax = Math.round(((taxable * (l.gstPercent || 0)) / 100) * 100) / 100;

      gross += (qty * rate);
      discount += discAmt;
      itemTaxable += taxable;
      lineTax += tax;
    }

    let chargeAmount = 0;
    let taxableCharges = 0;
    let chargeTax = 0;

    for (const c of (charges || [])) {
      const amt = Math.round((c.amount || 0) * 100) / 100;
      chargeAmount += amt;
      if (c.taxable) {
        taxableCharges += amt;
        const cTax = Math.round(((amt * (c.gstPercent || 0)) / 100) * 100) / 100;
        chargeTax += cTax;
      }
    }

    gross = Math.round(gross * 100) / 100;
    discount = Math.round(discount * 100) / 100;
    itemTaxable = Math.round(itemTaxable * 100) / 100;
    lineTax = Math.round(lineTax * 100) / 100;
    chargeAmount = Math.round(chargeAmount * 100) / 100;
    taxableCharges = Math.round(taxableCharges * 100) / 100;
    chargeTax = Math.round(chargeTax * 100) / 100;

    const totalTax = Math.round((lineTax + chargeTax) * 100) / 100;
    const grandTotal = Math.round((itemTaxable + lineTax + chargeAmount + chargeTax) * 100) / 100;

    return {
      gross,
      discount,
      itemTaxable,
      lineTax,
      chargeAmount,
      taxableCharges,
      chargeTax,
      totalTax,
      grandTotal
    };
  }

  // -------------------------------------------------------------
  // 6. PRE-FLIGHT VALIDATION ENGINE (Desktop ImportService Parity)
  // -------------------------------------------------------------
  async function validatePreflight(module, mapping, rows, headers, mode) {
    const requiredSet = getRequiredFields(module);
    const domainFields = getModuleFields(module);
    const details = [];
    const errors = [];
    const seenCodes = new Set();

    // Load master reference formats & master entities in parallel
    let refFormats = {};
    let existingItems = new Map();
    let existingParties = new Map();
    let existingInvoices = new Set();
    let availableStockByItem = new Map();
    let masterCategories = new Map();

    try {
      const refRes = await window.ApiService.get('/api/master/reference-formats');
      if (refRes && refRes.formats) refFormats = refRes.formats;
    } catch (e) {
      console.warn('Could not load reference formats:', e);
    }

    if (module === 'Item Master' || module === 'Items') {
      try {
        const items = await window.MasterService.getItems(true);
        (items || []).forEach(it => existingItems.set((it.itemCode || '').toUpperCase(), it));
      } catch (e) {
        console.warn('Could not load master items cache:', e);
      }
    } else if (module.includes('Customer') || module.includes('Supplier')) {
      const partyType = module.includes('Customer') ? 'CUSTOMER' : 'SUPPLIER';
      try {
        const parties = await window.MasterService.getParties(partyType, true);
        (parties || []).forEach(p => existingParties.set((p.partyCode || '').toUpperCase(), p));
      } catch (e) {
        console.warn('Could not load master parties cache:', e);
      }
    } else if (module === 'Sales' || module === 'Purchases') {
      const isSales = module === 'Sales';
      try {
        const parties = await window.MasterService.getParties(isSales ? 'CUSTOMER' : 'SUPPLIER', true);
        (parties || []).forEach(p => existingParties.set((p.partyCode || '').toUpperCase(), p));
        const items = await window.MasterService.getItems(true);
        (items || []).forEach(it => {
          const code = (it.itemCode || '').toUpperCase();
          existingItems.set(code, it);
          const stock = (it.availableStock !== undefined && it.availableStock !== null)
            ? Number(it.availableStock)
            : (it.currentStock !== undefined && it.currentStock !== null)
              ? Number(it.currentStock)
              : (it.stockQty !== undefined && it.stockQty !== null)
                ? Number(it.stockQty)
                : Math.max(0, Number(it.openingStock || 0));
          availableStockByItem.set(code, stock);
        });
        if (isSales) {
          const salesPage = await window.OperationsService.getSalesPage(0, 1000);
          ((salesPage && salesPage.rows) || []).forEach(s => existingInvoices.add((s.invoiceNo || '').toUpperCase()));
        } else {
          const purPage = await window.OperationsService.getPurchasesPage(0, 1000);
          ((purPage && purPage.rows) || []).forEach(p => {
            if (p.invoiceNo) existingInvoices.add(p.invoiceNo.toUpperCase());
            if (p.referenceNo) existingInvoices.add(p.referenceNo.toUpperCase());
          });
        }
      } catch (e) {
        console.warn('Could not load documents validation cache:', e);
      }
    } else if (module.includes('Master Categories')) {
      try {
        const cats = await window.MasterService.getCategories(false);
        (cats || []).forEach(c => masterCategories.set((c.categoryCode || '').toUpperCase(), c));
      } catch (e) {
        console.warn('Could not load categories validation cache:', e);
      }
    }

    const getVal = (row, key) => {
      const h = mapping[key];
      if (!h) return '';
      const idx = headers.indexOf(h);
      return idx >= 0 && row[idx] !== undefined ? String(row[idx]).trim() : '';
    };

    let processed = 0;
    let passed = 0;
    let skipped = 0;
    let failed = 0;

    // Grouping for Sales / Purchases
    if (module === 'Sales' || module === 'Purchases') {
      const grouped = new Map();
      rows.forEach((row, idx) => {
        const inv = getVal(row, 'invoice_no');
        const key = inv ? inv.toUpperCase() : `ROW-${idx + 1}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push({ row, rowNum: idx + 1 });
      });

      grouped.forEach((groupRows, invKey) => {
        processed++;
        const firstRow = groupRows[0].row;
        const sourceRows = groupRows.map(g => g.rowNum).join(', ');
        const party = getVal(firstRow, 'party_code');
        const dateVal = getVal(firstRow, 'invoice_date');
        const taxType = getVal(firstRow, 'gst_type') || 'GST';
        const isSales = module === 'Sales';

        let rowError = null;

        // Check required fields on each row
        for (const item of groupRows) {
          for (const reqField of requiredSet) {
            const val = getVal(item.row, reqField);
            if (!val) {
              rowError = `Missing mandatory field "${humanize(reqField)}" on row ${item.rowNum}`;
              break;
            }
          }
          if (rowError) break;
        }

        // Reference format
        if (!rowError && refFormats[isSales ? 'REF_SALES' : 'REF_PURCHASE']) {
          const mask = refFormats[isSales ? 'REF_SALES' : 'REF_PURCHASE'];
          if (!matchesReferenceFormat(mask, invKey, dateVal)) {
            rowError = `Invoice No. '${invKey}' does not match format ${mask}`;
          }
        }

        // Party reference format (REF_CUSTOMER / REF_SUPPLIER)
        const partyMaskKey = isSales ? 'REF_CUSTOMER' : 'REF_SUPPLIER';
        if (!rowError && refFormats[partyMaskKey] && party) {
          const pMask = refFormats[partyMaskKey];
          if (!matchesReferenceFormat(pMask, party, dateVal)) {
            rowError = `${isSales ? 'Customer' : 'Supplier'} Code '${party}' does not match format ${pMask}`;
          }
        }

        // Duplicate check against posted documents
        if (!rowError && existingInvoices.has(invKey)) {
          skipped++;
          details.push({
            sourceRows,
            reference: invKey,
            status: 'SKIPPED',
            action: 'SKIPPED',
            mandatory: '✓ Passed',
            format: '✓ Passed',
            master: '✓ Passed',
            data: 'Existing posted invoice is protected and skipped',
            message: 'Existing posted document is protected from bulk overwrites',
            taxType,
            gstPercent: parseFloat(getVal(firstRow, 'gst_percent')) || 18
          });
          return;
        }

        // Master check: party
        if (!rowError && !existingParties.has(party.toUpperCase())) {
          rowError = `${isSales ? 'Customer' : 'Supplier'} not found in master data: ${party}`;
        }

        // Master check: items and stock
        if (!rowError) {
          const itemMask = refFormats['REF_ITEM'];
          const itemQtys = new Map();
          for (const item of groupRows) {
            const rawICode = getVal(item.row, 'item_code');
            const iCode = rawICode.toUpperCase();
            if (itemMask && rawICode && !matchesReferenceFormat(itemMask, rawICode, dateVal)) {
              rowError = `Item Code '${rawICode}' does not match REF_ITEM format ${itemMask}`;
              break;
            }
            if (!existingItems.has(iCode)) {
              rowError = `Item not found in master data: ${rawICode}`;
              break;
            }
            const q = parseFloat(getVal(item.row, 'quantity')) || 0;
            itemQtys.set(iCode, (itemQtys.get(iCode) || 0) + q);
          }

          if (!rowError && isSales) {
            itemQtys.forEach((needQty, iCode) => {
              const avail = availableStockByItem.get(iCode) || 0;
              if (needQty > avail + 0.000001) {
                rowError = `Insufficient stock for item ${iCode} (required ${needQty}, available ${avail})`;
              }
            });
          }
        }

        // Validate document charges (Desktop parity)
        if (!rowError) {
          try {
            parseDocumentCharges(groupRows.map(g => g.row), getVal);
            if (!isSales) {
              const flex = getVal(firstRow, 'additional_charges');
              if (flex) parseAdditionalPurchaseCharges(flex);
            }
          } catch (chargeErr) {
            rowError = chargeErr.message;
          }
        }

        if (rowError) {
          failed++;
          errors.push(rowError);
          details.push({
            sourceRows,
            reference: invKey,
            status: 'FAILED',
            action: 'NONE',
            mandatory: 'Review',
            format: 'Review',
            master: 'Review',
            data: 'Review',
            message: rowError,
            taxType,
            gstPercent: 0
          });
        } else {
          passed++;
          details.push({
            sourceRows,
            reference: invKey,
            status: 'PASSED',
            action: 'VALIDATED',
            mandatory: '✓ Passed',
            format: '✓ Passed',
            master: '✓ Passed',
            data: '✓ Passed',
            message: `✓ Validated ${groupRows.length} item line(s) • Tax: ${taxType}`,
            taxType,
            gstPercent: parseFloat(getVal(firstRow, 'gst_percent')) || 18
          });
        }
      });
    } else {
      // Row by row validation for Item Master, Customers, Suppliers, Lookups, Recon, Bank
      rows.forEach((row, idx) => {
        processed++;
        const rowNum = idx + 1;
        let refKey = '';
        if (module === 'Item Master') refKey = getVal(row, 'item_code');
        else if (module.includes('Customer') || module.includes('Supplier')) refKey = getVal(row, 'party_code');
        else if (module.includes('Master Categories')) refKey = `${getVal(row, 'category_code')}/${getVal(row, 'value_code')}`;
        else if (module === 'Purchase Recon') refKey = `${getVal(row, 'supplier_gstin')} • ${getVal(row, 'supplier_invoice_no')}`;
        else if (module === 'Bank Statement') refKey = getVal(row, 'reference') || `TXN-${rowNum}`;

        let rowError = null;

        // Mandatory fields
        for (const req of requiredSet) {
          const v = getVal(row, req);
          if (!v) {
            rowError = `Missing mandatory field "${humanize(req)}"`;
            break;
          }
        }

        // Email validation for supplier / customer
        if (!rowError && (module.includes('Customer') || module.includes('Supplier'))) {
          const email = getVal(row, 'email');
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            rowError = `Invalid email address format: ${email}`;
          }
        }

        // Reference format
        if (!rowError) {
          let formatKey = null;
          if (module === 'Item Master') formatKey = 'REF_ITEM';
          else if (module.includes('Customer')) formatKey = 'REF_CUSTOMER';
          else if (module.includes('Supplier')) formatKey = 'REF_SUPPLIER';

          if (formatKey && refFormats[formatKey]) {
            const mask = refFormats[formatKey];
            if (!matchesReferenceFormat(mask, refKey, null)) {
              rowError = `Code '${refKey}' does not match format ${mask}`;
            }
          }
        }

        // In-file duplicate check
        if (!rowError && refKey) {
          const upperKey = refKey.toUpperCase();
          if (seenCodes.has(upperKey)) {
            rowError = `Duplicate identifier '${refKey}' within workbook`;
          } else {
            seenCodes.add(upperKey);
          }
        }

        // Database collision & Mode policy
        let action = 'WOULD CREATE';
        let dataStatus = '✓ Passed';
        if (!rowError && refKey) {
          const upperKey = refKey.toUpperCase();
          let exists = false;
          if (module === 'Item Master') exists = existingItems.has(upperKey);
          else if (module.includes('Customer') || module.includes('Supplier')) exists = existingParties.has(upperKey);

          if (exists) {
            if (mode === 'CREATE_ONLY' || mode === 'INSERT_ONLY' || mode === 'SKIP_EXISTING') {
              skipped++;
              details.push({
                sourceRows: String(rowNum),
                reference: refKey,
                status: 'PASSED',
                action: 'SKIPPED',
                mandatory: '✓ Passed',
                format: '✓ Passed',
                master: '✓ Passed',
                data: 'Existing record preserved by duplicate policy',
                message: 'Existing record will be preserved by policy',
                taxType: '',
                gstPercent: 0
              });
              return;
            } else if (mode === 'UPDATE_NON_BLANK') {
              action = 'WOULD UPDATE';
              dataStatus = 'Matches existing record • Will update non-blank fields';
            } else {
              action = 'WOULD UPDATE';
              dataStatus = 'Matches existing record • Will update';
            }
          }
        }

        if (rowError) {
          failed++;
          errors.push(`Row ${rowNum}: ${rowError}`);
          details.push({
            sourceRows: String(rowNum),
            reference: refKey || `Row ${rowNum}`,
            status: 'FAILED',
            action: 'NONE',
            mandatory: 'Review',
            format: 'Review',
            master: 'Review',
            data: 'Review',
            message: rowError,
            taxType: '',
            gstPercent: 0
          });
        } else {
          passed++;
          details.push({
            sourceRows: String(rowNum),
            reference: refKey,
            status: 'PASSED',
            action: action,
            mandatory: '✓ Passed',
            format: '✓ Passed',
            master: '✓ Passed',
            data: dataStatus,
            message: '✓ All validations passed',
            taxType: '',
            gstPercent: 0
          });
        }
      });
    }

    return {
      processed,
      passedCount: passed,
      failedCount: failed,
      skippedCount: skipped,
      errors,
      details
    };
  }

  // -------------------------------------------------------------
  // 7. TRUE DATABASE PERSISTENCE ENGINE (Desktop ImportService Parity)
  // -------------------------------------------------------------
  async function executeImport(module, mapping, rows, headers, mode = 'UPSERT', progressCb) {
    const getVal = (row, key) => {
      const h = mapping[key];
      if (!h) return '';
      const idx = headers.indexOf(h);
      return idx >= 0 && row[idx] !== undefined ? String(row[idx]).trim() : '';
    };

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors = [];
    const details = [];

    const total = rows.length;

    switch (module) {
      case 'Item Master':
      case 'Items': {
        const existingItems = new Map();
        try {
          const items = await window.MasterService.getItems(true);
          (items || []).forEach(it => existingItems.set((it.itemCode || '').toUpperCase(), it));
        } catch (e) { }

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 1;
          const code = getVal(row, 'item_code');
          if (!code) continue;

          try {
            let existing = existingItems.get(code.toUpperCase());
            let isExisting = !!existing;
            if (!isExisting) {
              const check = await window.MasterService.checkItemExists(code).catch(() => null);
              if (check && check.exists) {
                isExisting = true;
                // Attempt to load full entity for non-blank merge if needed
                const byCodes = await window.MasterService.getItemsByCodes([code]).catch(() => []);
                existing = (byCodes || []).find(it => (it.itemCode || '').toUpperCase() === code.toUpperCase());
                if (!existing) {
                  const searchRes = await window.MasterService.searchItems(code, 5).catch(() => []);
                  existing = (searchRes || []).find(it => (it.itemCode || '').toUpperCase() === code.toUpperCase());
                }
                if (existing) {
                  existingItems.set(code.toUpperCase(), existing);
                }
              }
            }

            if (isExisting && (mode === 'CREATE_ONLY' || mode === 'INSERT_ONLY' || mode === 'SKIP_EXISTING')) {
              skipped++;
              details.push({ sourceRows: String(rowNum), reference: code, status: 'SKIPPED', action: 'SKIPPED', message: 'Existing item preserved' });
              continue;
            }

            // Server requires remarks and hsn in copy(d, e, true)
            const remarksVal = getVal(row, 'remarks') || 'Imported via Data Import Studio';
            const hsnVal = getVal(row, 'hsn') || '7306';

            const payload = {
              id: isExisting && existing ? existing.id : null,
              rowVersion: isExisting && existing && existing.rowVersion !== undefined ? existing.rowVersion : 0,
              itemCode: code,
              description: getVal(row, 'description') || 'Item',
              category: getVal(row, 'category') || 'GENERAL',
              brand: getVal(row, 'brand') || '',
              material: getVal(row, 'material') || '',
              size: getVal(row, 'size') || '',
              unit: getVal(row, 'unit') || 'NOS',
              hsn: hsnVal,
              gst: parseFloat(getVal(row, 'gst')) || 18,
              discountPercent: parseFloat(getVal(row, 'discount_percent')) || 0,
              purchasePrice: parseFloat(getVal(row, 'purchase_price')) || 0,
              sellingPrice: parseFloat(getVal(row, 'selling_price')) || 0,
              openingStock: parseFloat(getVal(row, 'opening_stock')) || 0,
              minimumStock: parseFloat(getVal(row, 'minimum_stock')) || 0,
              reservedStock: 0,
              location: getVal(row, 'location') || '',
              remarks: remarksVal,
              active: true
            };

            if (isExisting && existing) {
              payload.id = existing.id;
              payload.rowVersion = existing.rowVersion !== undefined ? existing.rowVersion : 0;
              payload.openingStock = existing.openingStock !== undefined ? existing.openingStock : payload.openingStock;
              if (mode === 'UPDATE_NON_BLANK') {
                if (!getVal(row, 'description')) payload.description = existing.description;
                if (!getVal(row, 'category')) payload.category = existing.category;
                if (!getVal(row, 'brand')) payload.brand = existing.brand;
                if (!getVal(row, 'material')) payload.material = existing.material;
                if (!getVal(row, 'size')) payload.size = existing.size;
                if (!getVal(row, 'unit')) payload.unit = existing.unit;
                if (!getVal(row, 'hsn')) payload.hsn = existing.hsn;
                if (getVal(row, 'gst') === '') payload.gst = existing.gst;
                if (getVal(row, 'selling_price') === '') payload.sellingPrice = existing.sellingPrice;
                if (getVal(row, 'purchase_price') === '') payload.purchasePrice = existing.purchasePrice;
                if (getVal(row, 'minimum_stock') === '') payload.minimumStock = existing.minimumStock;
                if (!getVal(row, 'location')) payload.location = existing.location;
                if (!getVal(row, 'remarks')) payload.remarks = existing.remarks;
              }
            }

            if (isExisting && existing) {
              await window.MasterService.updateItem(payload);
              updated++;
              existingItems.set(code.toUpperCase(), payload);
              details.push({ sourceRows: String(rowNum), reference: code, status: 'PASSED', action: 'UPDATED', message: 'Item updated successfully' });
            } else {
              try {
                await window.MasterService.createItem(payload);
                imported++;
                existingItems.set(code.toUpperCase(), payload);
                details.push({ sourceRows: String(rowNum), reference: code, status: 'PASSED', action: 'CREATED', message: 'New item created successfully' });
              } catch (createErr) {
                const searchRes = await window.MasterService.searchItems(code, 5).catch(() => []);
                const match = (searchRes || []).find(it => (it.itemCode || '').toUpperCase() === code.toUpperCase());
                if (match) {
                  payload.id = match.id;
                  payload.rowVersion = Number(match.rowVersion || 0);
                  await window.MasterService.updateItem(payload);
                  updated++;
                  existingItems.set(code.toUpperCase(), payload);
                  details.push({ sourceRows: String(rowNum), reference: code, status: 'PASSED', action: 'UPDATED', message: 'Item updated after conflict resolution' });
                } else {
                  throw createErr;
                }
              }
            }
          } catch (err) {
            failed++;
            errors.push(`Row ${rowNum} (${code}): ${err.message}`);
            details.push({ sourceRows: String(rowNum), reference: code, status: 'FAILED', action: 'NONE', message: err.message });
          }
          if (progressCb) progressCb(i + 1, total);
        }
        break;
      }

      case 'Customers/CRM':
      case 'Customers / CRM':
      case 'Suppliers/HRM':
      case 'Suppliers / HRM': {
        const partyType = module.includes('Customer') ? 'CUSTOMER' : 'SUPPLIER';
        const existingParties = new Map();
        
        // Pre-load BOTH Customers and Suppliers so party_code uniqueness across party_master is always respected
        try {
          const [customers, suppliers] = await Promise.all([
            window.MasterService.getParties('CUSTOMER', true).catch(() => []),
            window.MasterService.getParties('SUPPLIER', true).catch(() => [])
          ]);
          (customers || []).forEach(p => existingParties.set((p.partyCode || '').toUpperCase(), p));
          (suppliers || []).forEach(p => existingParties.set((p.partyCode || '').toUpperCase(), p));
        } catch (e) {
          console.warn('Could not preload parties cache:', e);
        }

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 1;
          const code = getVal(row, 'party_code');
          if (!code) continue;

          try {
            let existing = existingParties.get(code.toUpperCase());
            if (!existing) {
              // Server-level check: Check if party_code already exists in database
              const check = await window.MasterService.checkPartyExists(code).catch(() => null);
              if (check && check.exists) {
                // Refresh cache across both customer & supplier to obtain id and rowVersion
                const [freshCust, freshSupp] = await Promise.all([
                  window.MasterService.getParties('CUSTOMER', true).catch(() => []),
                  window.MasterService.getParties('SUPPLIER', true).catch(() => [])
                ]);
                (freshCust || []).forEach(p => existingParties.set((p.partyCode || '').toUpperCase(), p));
                (freshSupp || []).forEach(p => existingParties.set((p.partyCode || '').toUpperCase(), p));
                existing = existingParties.get(code.toUpperCase());
                if (!existing) {
                  const searchRes = await window.MasterService.searchParties(partyType, code, 5).catch(() => []);
                  existing = (searchRes || []).find(p => (p.partyCode || '').toUpperCase() === code.toUpperCase());
                }
              }
            }

            if (existing && (mode === 'CREATE_ONLY' || mode === 'INSERT_ONLY' || mode === 'SKIP_EXISTING')) {
              skipped++;
              details.push({ sourceRows: String(rowNum), reference: code, status: 'SKIPPED', action: 'SKIPPED', message: `Existing ${partyType.toLowerCase()} preserved` });
              continue;
            }

            const activeVal = getVal(row, 'is_active');
            const isActive = activeVal === '' ? true : !['false', '0', 'no', 'inactive'].includes(activeVal.toLowerCase());
            const emailVal = getVal(row, 'email') || '';
            if (partyType === 'SUPPLIER' && !emailVal) {
              throw new Error('Email is mandatory for suppliers');
            }

            const payload = {
              partyCode: code,
              name: getVal(row, 'name') || 'Party',
              partyType: existing ? existing.partyType : partyType,
              contactPerson: getVal(row, 'contact_person') || '',
              phone: getVal(row, 'phone') || '',
              email: emailVal,
              gstin: getVal(row, 'gstin') || '',
              address: getVal(row, 'address') || '',
              openingBalance: parseFloat(getVal(row, 'opening_balance')) || 0,
              active: isActive,
              rowVersion: 0
            };

            if (existing) {
              payload.id = existing.id;
              payload.rowVersion = existing.rowVersion !== undefined ? existing.rowVersion : 0;
              if (mode === 'UPDATE_NON_BLANK') {
                if (!getVal(row, 'name')) payload.name = existing.name;
                if (!getVal(row, 'contact_person')) payload.contactPerson = existing.contactPerson;
                if (!getVal(row, 'phone')) payload.phone = existing.phone;
                if (!getVal(row, 'email')) payload.email = existing.email;
                if (!getVal(row, 'gstin')) payload.gstin = existing.gstin;
                if (!getVal(row, 'address')) payload.address = existing.address;
                if (getVal(row, 'opening_balance') === '') payload.openingBalance = existing.openingBalance;
              }
              const res = await window.MasterService.updateParty(payload);
              updated++;
              existingParties.set(code.toUpperCase(), res || payload);
              details.push({ sourceRows: String(rowNum), reference: code, status: 'PASSED', action: 'UPDATED', message: `${partyType} updated` });
            } else {
              try {
                const res = await window.MasterService.createParty(payload);
                imported++;
                existingParties.set(code.toUpperCase(), res || payload);
                details.push({ sourceRows: String(rowNum), reference: code, status: 'PASSED', action: 'CREATED', message: `New ${partyType} created` });
              } catch (createErr) {
                // Duplicate key / conflict catch: re-fetch from server and update
                const [freshCust, freshSupp] = await Promise.all([
                  window.MasterService.getParties('CUSTOMER', true).catch(() => []),
                  window.MasterService.getParties('SUPPLIER', true).catch(() => [])
                ]);
                const allParties = [...(freshCust || []), ...(freshSupp || [])];
                const match = allParties.find(p => (p.partyCode || '').toUpperCase() === code.toUpperCase());
                if (match) {
                  payload.id = match.id;
                  payload.partyType = match.partyType;
                  payload.rowVersion = match.rowVersion !== undefined ? match.rowVersion : 0;
                  if (mode === 'UPDATE_NON_BLANK') {
                    if (!getVal(row, 'name')) payload.name = match.name;
                    if (!getVal(row, 'contact_person')) payload.contactPerson = match.contactPerson;
                    if (!getVal(row, 'phone')) payload.phone = match.phone;
                    if (!getVal(row, 'email')) payload.email = match.email;
                    if (!getVal(row, 'gstin')) payload.gstin = match.gstin;
                    if (!getVal(row, 'address')) payload.address = match.address;
                    if (getVal(row, 'opening_balance') === '') payload.openingBalance = match.openingBalance;
                  }
                  const res = await window.MasterService.updateParty(payload);
                  updated++;
                  existingParties.set(code.toUpperCase(), res || payload);
                  details.push({ sourceRows: String(rowNum), reference: code, status: 'PASSED', action: 'UPDATED', message: `${partyType} updated after duplicate resolution` });
                } else {
                  throw createErr;
                }
              }
            }
          } catch (err) {
            failed++;
            errors.push(`Row ${rowNum} (${code}): ${err.message}`);
            details.push({ sourceRows: String(rowNum), reference: code, status: 'FAILED', action: 'NONE', message: err.message });
          }
          if (progressCb) progressCb(i + 1, total);
        }
        break;
      }

      case 'Sales': {
        // Group rows by invoice_no
        const grouped = new Map();
        rows.forEach((r, idx) => {
          const inv = getVal(r, 'invoice_no');
          if (!inv) return;
          const k = inv.toUpperCase();
          if (!grouped.has(k)) grouped.set(k, []);
          grouped.get(k).push({ row: r, rowNum: idx + 1 });
        });

        const existingSales = new Set();
        const existingCustomers = new Map();
        try {
          const sp = await window.OperationsService.getSalesPage(0, 1000);
          ((sp && sp.rows) || []).forEach(s => existingSales.add((s.invoiceNo || '').toUpperCase()));
          const custs = await window.MasterService.getParties('CUSTOMER', true);
          (custs || []).forEach(c => existingCustomers.set((c.partyCode || '').toUpperCase(), c));
        } catch (e) { }

        let current = 0;
        const totalInvoices = grouped.size;

        for (const [invNo, gRows] of grouped.entries()) {
          current++;
          const sourceRows = gRows.map(g => g.rowNum).join(', ');
          const first = gRows[0].row;

          if (existingSales.has(invNo)) {
            skipped++;
            details.push({ sourceRows, reference: invNo, status: 'SKIPPED', action: 'SKIPPED', message: 'Existing posted sales invoice protected' });
            continue;
          }

          try {
            const customerCode = getVal(first, 'party_code');
            const invDate = getVal(first, 'invoice_date') || new Date().toISOString().substring(0, 10);
            const gstType = (getVal(first, 'gst_type') || 'GST').toUpperCase();

            // Resolve customer entity required by server contract (OperationDtos.SaleDto.customer)
            let customerEntity = existingCustomers.get(customerCode.toUpperCase());
            if (!customerEntity) {
              const custMatches = await window.MasterService.searchParties('CUSTOMER', customerCode, 5).catch(() => []);
              customerEntity = (custMatches || []).find(p => (p.partyCode || '').toUpperCase() === customerCode.toUpperCase());
            }
            if (!customerEntity) {
              const allCust = await window.MasterService.getParties('CUSTOMER', true).catch(() => []);
              customerEntity = (allCust || []).find(p => (p.partyCode || '').toUpperCase() === customerCode.toUpperCase());
            }
            if (!customerEntity) {
              throw new Error(`Customer '${customerCode}' does not exist in master. Please create the customer first.`);
            }

            const lines = gRows.map(g => {
              const r = g.row;
              const qty = parseFloat(getVal(r, 'quantity')) || 1;
              const rate = parseFloat(getVal(r, 'rate')) || 0;
              const discPct = parseFloat(getVal(r, 'discount_percent')) || 0;
              const discAmt = Math.round((qty * rate * discPct / 100) * 100) / 100;
              const gstPct = parseFloat(getVal(r, 'gst_percent')) || 18;
              const taxable = Math.max(0, (qty * rate) - discAmt);
              const tax = (taxable * gstPct) / 100;
              return {
                itemCode: getVal(r, 'item_code'),
                itemDescription: getVal(r, 'description') || getVal(r, 'item_code'),
                itemCategory: getVal(r, 'category') || '',
                itemHsn: getVal(r, 'hsn') || '',
                itemUnit: getVal(r, 'unit') || 'Nos',
                itemRemarks: getVal(r, 'remarks') || '',
                quantity: qty,
                rate: rate,
                discountPercent: discPct,
                discountAmount: discAmt,
                gstPercent: gstPct,
                totalAmount: taxable + tax
              };
            });

            // Extract charges and calculate totals with charges (Desktop parity)
            const charges = parseDocumentCharges(gRows.map(g => g.row), getVal);
            const totals = calculateDocumentTotals(lines, charges);
            const totalQty = lines.reduce((acc, l) => acc + (l.quantity || 0), 0);
            const paymentTerms = getVal(first, 'payment_terms') || '15 Days';
            const dueDate = computeDueDate(invDate, paymentTerms);

            const salePayload = {
              invoiceNo: invNo,
              invoiceDate: invDate,
              customer: {
                id: customerEntity.id,
                partyCode: customerEntity.partyCode,
                name: customerEntity.name,
                email: customerEntity.email,
                phone: customerEntity.phone,
                gstin: customerEntity.gstin,
                address: customerEntity.address
              },
              source: 'IMPORT', // Server requires source='IMPORT' to preserve invoiceNo
              paymentTerms: paymentTerms,
              dueDate: dueDate,
              gstType: gstType,
              remarks: getVal(first, 'remarks') || 'Imported via Data Import Studio',
              subtotal: totals.itemTaxable,
              discountAmount: totals.discount,
              gstAmount: totals.totalTax,
              totalAmount: totals.grandTotal,
              quantity: totalQty,
              paidAmount: 0.0,
              paymentStatus: 'PENDING',
              documentStatus: 'APPROVED',
              billingAddress: customerEntity.address || '',
              deliveryAddress: customerEntity.address || '',
              billingGstin: customerEntity.gstin || '',
              deliveryGstin: customerEntity.gstin || '',
              gstin: customerEntity.gstin || '',
              sameAsBilling: true,
              emailSent: false,
              whatsappSent: false,
              invoiceType: 'TAX INVOICE',
              salesperson: 'Admin',
              notes: getVal(first, 'remarks') || '',
              doorDelivery: 'NO',
              vehicleNumber: '',
              contactPerson: '',
              contactPersonMobile: '',
              transportNote: '',
              orderNo: null,
              referenceNo: '',
              poDate: null,
              transporter: '',
              transporterGstin: '',
              chargeType: charges.length > 0 ? (charges[0].chargeType || '') : '',
              chargeAmount: charges.length > 0 ? (charges[0].amount || 0.0) : 0.0,
              attachmentPath: null,
              charges: charges,
              lines: lines,
              rowVersion: 0
            };

            await window.OperationsService.createSale(salePayload);
            imported++;
            existingSales.add(invNo);
            details.push({ sourceRows, reference: invNo, status: 'PASSED', action: 'CREATED', message: `Sale invoice created (${lines.length} lines, ${charges.length} charges)` });
          } catch (err) {
            failed++;
            errors.push(`${invNo}: ${err.message}`);
            details.push({ sourceRows, reference: invNo, status: 'FAILED', action: 'NONE', message: err.message });
          }
          if (progressCb) progressCb(current, totalInvoices);
        }
        break;
      }

      case 'Purchases': {
        const grouped = new Map();
        rows.forEach((r, idx) => {
          const inv = getVal(r, 'invoice_no');
          if (!inv) return;
          const k = inv.toUpperCase();
          if (!grouped.has(k)) grouped.set(k, []);
          grouped.get(k).push({ row: r, rowNum: idx + 1 });
        });

        const existingPurchases = new Set();
        const existingSuppliers = new Map();
        try {
          const pp = await window.OperationsService.getPurchasesPage(0, 1000);
          ((pp && pp.rows) || []).forEach(p => {
            if (p.invoiceNo) existingPurchases.add(p.invoiceNo.toUpperCase());
            if (p.referenceNo) existingPurchases.add(p.referenceNo.toUpperCase());
          });
          const supps = await window.MasterService.getParties('SUPPLIER', true);
          (supps || []).forEach(s => existingSuppliers.set((s.partyCode || '').toUpperCase(), s));
        } catch (e) { }

        let current = 0;
        const totalInvoices = grouped.size;

        for (const [invNo, gRows] of grouped.entries()) {
          current++;
          const sourceRows = gRows.map(g => g.rowNum).join(', ');
          const first = gRows[0].row;

          if (existingPurchases.has(invNo)) {
            skipped++;
            details.push({ sourceRows, reference: invNo, status: 'SKIPPED', action: 'SKIPPED', message: 'Existing posted purchase bill protected' });
            continue;
          }

          try {
            const supplierCode = getVal(first, 'party_code');
            const invDate = getVal(first, 'invoice_date') || new Date().toISOString().substring(0, 10);
            const gstType = (getVal(first, 'gst_type') || 'GST').toUpperCase();

            // Resolve supplier entity required by server contract (OperationDtos.PurchaseDto.supplier)
            let supplierEntity = existingSuppliers.get(supplierCode.toUpperCase());
            if (!supplierEntity) {
              const suppMatches = await window.MasterService.searchParties('SUPPLIER', supplierCode, 5).catch(() => []);
              supplierEntity = (suppMatches || []).find(p => (p.partyCode || '').toUpperCase() === supplierCode.toUpperCase());
            }
            if (!supplierEntity) {
              const allSupp = await window.MasterService.getParties('SUPPLIER', true).catch(() => []);
              supplierEntity = (allSupp || []).find(p => (p.partyCode || '').toUpperCase() === supplierCode.toUpperCase());
            }
            if (!supplierEntity) {
              throw new Error(`Supplier '${supplierCode}' does not exist in master. Please create the supplier first.`);
            }

            const lines = gRows.map(g => {
              const r = g.row;
              const qty = parseFloat(getVal(r, 'quantity')) || 1;
              const rate = parseFloat(getVal(r, 'rate')) || 0;
              const discPct = parseFloat(getVal(r, 'discount_percent')) || 0;
              const discAmt = Math.round((qty * rate * discPct / 100) * 100) / 100;
              const gstPct = parseFloat(getVal(r, 'gst_percent')) || 18;
              const taxable = Math.max(0, (qty * rate) - discAmt);
              const tax = (taxable * gstPct) / 100;
              return {
                itemCode: getVal(r, 'item_code'),
                itemDescription: getVal(r, 'description') || getVal(r, 'item_code'),
                itemCategory: getVal(r, 'category') || '',
                itemHsn: getVal(r, 'hsn') || '',
                itemUnit: getVal(r, 'unit') || 'Nos',
                itemRemarks: getVal(r, 'remarks') || '',
                quantity: qty,
                rate: rate,
                discountPercent: discPct,
                discountAmount: discAmt,
                gstPercent: gstPct,
                totalAmount: taxable + tax
              };
            });

            // Extract charges and calculate totals with charges (Desktop parity)
            const charges = parseDocumentCharges(gRows.map(g => g.row), getVal);
            const additionalText = getVal(first, 'additional_charges');
            if (additionalText) {
              charges.push(...parseAdditionalPurchaseCharges(additionalText));
            }
            const totals = calculateDocumentTotals(lines, charges);
            const totalQty = lines.reduce((acc, l) => acc + (l.quantity || 0), 0);
            const paymentTerms = getVal(first, 'payment_terms') || '15 Days';
            const dueDate = computeDueDate(invDate, paymentTerms);

            const purchasePayload = {
              invoiceNo: null,
              referenceNo: invNo, // Supplier's invoice no from Excel maps to referenceNo
              invoiceDate: invDate, // Server field is invoiceDate (not billDate)
              supplier: {
                id: supplierEntity.id,
                partyCode: supplierEntity.partyCode,
                name: supplierEntity.name,
                email: supplierEntity.email,
                phone: supplierEntity.phone,
                gstin: supplierEntity.gstin,
                address: supplierEntity.address
              },
              source: 'IMPORT',
              paymentTerms: paymentTerms,
              dueDate: dueDate,
              gstType: gstType,
              remarks: getVal(first, 'remarks') || 'Imported via Data Import Studio',
              subtotal: totals.itemTaxable,
              discountAmount: totals.discount || 0.0,
              gstAmount: totals.totalTax,
              totalAmount: totals.grandTotal,
              quantity: totalQty,
              paidAmount: 0.0,
              paymentStatus: 'PENDING',
              documentStatus: 'APPROVED',
              warehouse: 'Default Warehouse',
              currency: 'INR',
              gstTreatment: 'STANDARD',
              emailSent: false,
              sameAsBilling: true,
              billingAddress: supplierEntity.address || '',
              deliveryAddress: supplierEntity.address || '',
              billingGstin: supplierEntity.gstin || '',
              deliveryGstin: supplierEntity.gstin || '',
              transporter: '',
              transporterGstin: '',
              lrAwbNo: '',
              discountType: 'PERCENT',
              attachmentPath: null,
              createdBy: 'IMPORT',
              deliveryDate: null,
              vehicleNumber: '',
              contactPerson: '',
              contactPersonMobile: '',
              notes: '',
              orderNo: null,
              poDate: null,
              chargeType: charges.length > 0 ? (charges[0].chargeType || '') : '',
              chargeAmount: charges.length > 0 ? (charges[0].amount || 0.0) : 0.0,
              charges: charges,
              lines: lines,
              rowVersion: 0
            };

            await window.OperationsService.createPurchase(purchasePayload);
            imported++;
            existingPurchases.add(invNo);
            details.push({ sourceRows, reference: invNo, status: 'PASSED', action: 'CREATED', message: `Purchase bill created (${lines.length} lines, ${charges.length} charges)` });
          } catch (err) {
            failed++;
            errors.push(`${invNo}: ${err.message}`);
            details.push({ sourceRows, reference: invNo, status: 'FAILED', action: 'NONE', message: err.message });
          }
          if (progressCb) progressCb(current, totalInvoices);
        }
        break;
      }

      case 'Master Categories and Values':
      case 'Master Categories & Values': {
        const catCache = new Set();
        const lookupsCache = new Map();

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 1;
          const catCode = getVal(row, 'category_code');
          const catName = getVal(row, 'category_name') || catCode;
          const valCode = getVal(row, 'value_code');
          const val = getVal(row, 'value');

          if (!catCode || !valCode || !val) continue;

          try {
            // Upsert Category
            if (!catCache.has(catCode.toUpperCase())) {
              await window.ApiService.put('/api/master/categories/upsert', {
                code: catCode,
                name: catName,
                description: getVal(row, 'category_description') || ''
              });
              catCache.add(catCode.toUpperCase());
            }

            // Check if lookup already exists in category by code OR by value (server validateLookup checks both)
            if (!lookupsCache.has(catName)) {
              const list = await window.MasterService.getLookups(catName, true).catch(() => []);
              lookupsCache.set(catName, list || []);
            }
            const existingLookups = lookupsCache.get(catName) || [];
            const existing = existingLookups.find(l => 
              (l.lookupCode || '').toUpperCase() === valCode.toUpperCase() ||
              (l.lookupValue || '').trim().toUpperCase() === val.trim().toUpperCase()
            );

            if (existing && (mode === 'CREATE_ONLY' || mode === 'INSERT_ONLY' || mode === 'SKIP_EXISTING')) {
              skipped++;
              details.push({ sourceRows: String(rowNum), reference: `${catCode}/${valCode}`, status: 'SKIPPED', action: 'SKIPPED', message: 'Existing master value preserved' });
              continue;
            }

            const lookupDto = {
              lookupType: catName,
              lookupCode: valCode,
              lookupValue: val,
              description: getVal(row, 'value_description') || '',
              displayOrder: parseInt(getVal(row, 'display_order')) || (i + 1),
              active: !['false', '0', 'no', 'inactive'].includes((getVal(row, 'is_active') || '').toLowerCase()),
              rowVersion: 0
            };

            if (existing) {
              lookupDto.id = existing.id;
              lookupDto.rowVersion = existing.rowVersion !== undefined ? existing.rowVersion : 0;
              if (mode === 'UPDATE_NON_BLANK') {
                if (!getVal(row, 'value_description')) lookupDto.description = existing.description;
              }
              const res = await window.MasterService.updateLookup(lookupDto);
              updated++;
              const idx = existingLookups.findIndex(l => l.id === existing.id);
              if (idx >= 0) existingLookups[idx] = res || lookupDto;
              details.push({ sourceRows: String(rowNum), reference: `${catCode}/${valCode}`, status: 'PASSED', action: 'UPDATED', message: 'Lookup updated successfully' });
            } else {
              try {
                const res = await window.MasterService.saveLookup(lookupDto);
                imported++;
                existingLookups.push(res || lookupDto);
                details.push({ sourceRows: String(rowNum), reference: `${catCode}/${valCode}`, status: 'PASSED', action: 'CREATED', message: 'Lookup created successfully' });
              } catch (createErr) {
                // Duplicate conflict resolution: re-fetch and update
                const freshList = await window.MasterService.getLookups(catName, true).catch(() => []);
                lookupsCache.set(catName, freshList || []);
                const match = (freshList || []).find(l => 
                  (l.lookupCode || '').toUpperCase() === valCode.toUpperCase() ||
                  (l.lookupValue || '').trim().toUpperCase() === val.trim().toUpperCase()
                );
                if (match) {
                  lookupDto.id = match.id;
                  lookupDto.rowVersion = match.rowVersion !== undefined ? match.rowVersion : 0;
                  const res = await window.MasterService.updateLookup(lookupDto);
                  updated++;
                  details.push({ sourceRows: String(rowNum), reference: `${catCode}/${valCode}`, status: 'PASSED', action: 'UPDATED', message: 'Lookup updated after conflict resolution' });
                } else {
                  throw createErr;
                }
              }
            }
          } catch (err) {
            failed++;
            errors.push(`Row ${rowNum} (${valCode}): ${err.message}`);
            details.push({ sourceRows: String(rowNum), reference: `${catCode}/${valCode}`, status: 'FAILED', action: 'NONE', message: err.message });
          }
          if (progressCb) progressCb(i + 1, total);
        }
        break;
      }

      case 'Purchase Recon': {
        const reconRows = rows.map((r, idx) => ({
          sourceSheet: 'Sheet1',
          sourceRow: idx + 2,
          supplierName: getVal(r, 'supplier_name'),
          supplierGstin: getVal(r, 'supplier_gstin'),
          supplierInvoiceNo: getVal(r, 'supplier_invoice_no'),
          invoiceDate: (getVal(r, 'invoice_date') || '').substring(0, 10),
          taxableValue: parseFloat(getVal(r, 'taxable_value')) || 0,
          cgst: parseFloat(getVal(r, 'cgst')) || 0,
          sgst: parseFloat(getVal(r, 'sgst')) || 0,
          igst: parseFloat(getVal(r, 'igst')) || 0,
          invoiceValue: parseFloat(getVal(r, 'invoice_value')) || 0
        })).filter(r => r.supplierName && r.supplierInvoiceNo);

        try {
          const req = {
            sourceFileName: 'Purchase_Recon_Import.xlsx',
            sourceFingerprint: `PRC-FP-${Date.now()}`,
            fingerprint: `PRC-FP-${Date.now()}`,
            importNote: 'Imported via Data Import Studio',
            note: 'Imported via Data Import Studio',
            dryRun: false,
            rows: reconRows
          };
          const res = await window.ReconService.importReconRows(req);
          imported = (res && res.importedRows) || reconRows.length;
          skipped = (res && (res.alreadyCurrentRows + res.duplicateRows)) || 0;
          details.push({ sourceRows: `1-${reconRows.length}`, reference: 'GSTR-2B', status: 'PASSED', action: 'IMPORTED', message: `Imported ${imported} purchase recon records` });
        } catch (err) {
          failed = reconRows.length;
          errors.push(err.message);
          details.push({ sourceRows: '1-ALL', reference: 'Purchase Recon', status: 'FAILED', action: 'NONE', message: err.message });
        }
        if (progressCb) progressCb(total, total);
        break;
      }

      case 'Bank Statement': {
        const branding = window.BrandingService ? window.BrandingService.getProfile() : {};
        let bankName = branding.bankName || '';
        let accountNumber = branding.bankAccount || '';
        let accountHolder = branding.name || '';

        try {
          const bankLookups = await window.ApiService.get('/api/master/lookups/by-category-code?code=BANK_ACCOUNT');
          const activeBanks = (bankLookups || []).filter(b => b.active !== false);
          if (activeBanks.length > 0) {
            accountNumber = activeBanks[0].lookupCode || accountNumber;
            bankName = activeBanks[0].lookupValue || bankName;
            accountHolder = activeBanks[0].description || branding.name || 'Company Account';
          }
        } catch (e) {
          console.warn('Could not load bank lookups in ImportService:', e);
        }
        if (!accountNumber) {
          accountNumber = branding.bankAccount || 'MAIN_ACCOUNT';
          bankName = branding.bankName || 'Primary Bank';
          accountHolder = branding.name || 'Company Account';
        }

        const bankRows = rows.map((r, idx) => {
          let dVal = parseFloat(getVal(r, 'debit')) || 0;
          let cVal = parseFloat(getVal(r, 'credit')) || 0;
          if (dVal <= 0 && cVal <= 0) {
            const rawAmt = parseFloat(getVal(r, 'amount')) || 0;
            const dir = (getVal(r, 'direction') || '').trim().toUpperCase();
            if (dir === 'CR' || dir === 'CREDIT' || rawAmt < 0) {
              cVal = Math.abs(rawAmt);
            } else {
              dVal = Math.abs(rawAmt);
            }
          }
          if (dVal > 0 && cVal > 0) {
            cVal = 0; // Exactly one must be positive per server contract
          }
          const rawDateStr = getVal(r, 'transaction_date');
          const dateStr = toIsoDate(rawDateStr);
          const timeStr = toIsoTimestamp(rawDateStr, dateStr);
          const valDate = toIsoDate(getVal(r, 'value_date') || rawDateStr);
          const fp = `BS-ROW-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
          return {
            sourceRowNumber: idx + 1, // Server BankReconciliationDtos.ImportRow field is sourceRowNumber
            transactionTimestamp: timeStr,
            transactionDate: dateStr,
            valueDate: valDate,
            description: getVal(r, 'description') || 'Bank Txn',
            reference: getVal(r, 'reference') || `REF-${idx + 1}`,
            debit: dVal,
            credit: cVal,
            balance: parseFloat(getVal(r, 'balance')) || 0,
            transactionFingerprint: fp // Server BankReconciliationDtos.ImportRow field is transactionFingerprint
          };
        }).filter(r => r.description && ((r.debit > 0 && r.credit === 0) || (r.credit > 0 && r.debit === 0)));

        try {
          const req = {
            bankName: bankName,
            bankAccount: accountNumber, // Server BankReconciliationDtos.ImportRequest field is bankAccount (NOT accountNumber)
            accountHolder: accountHolder,
            statementFrom: bankRows[0]?.transactionDate || new Date().toISOString().substring(0, 10),
            statementTo: bankRows[bankRows.length - 1]?.transactionDate || new Date().toISOString().substring(0, 10),
            currency: 'INR',
            openingBalance: bankRows[0]?.balance || 0,
            closingBalance: bankRows[bankRows.length - 1]?.balance || 0,
            sourceFingerprint: `BS-FP-${Date.now()}`,
            sourceFileName: 'Bank_Statement_Import.csv',
            sourceCsv: 'CSV DATA',
            importedBy: 'Admin',
            dryRun: false,
            rows: bankRows
          };
          const res = await window.ReconService.importStatement(req);
          imported = (res && res.importedRows) || bankRows.length;
          skipped = (res && res.duplicateRows) || 0;
          details.push({ sourceRows: `1-${bankRows.length}`, reference: req.bankAccount, status: 'PASSED', action: 'IMPORTED', message: `Imported ${imported} bank statement lines` });
        } catch (err) {
          failed = bankRows.length;
          errors.push(err.message);
          details.push({ sourceRows: '1-ALL', reference: 'Bank Statement', status: 'FAILED', action: 'NONE', message: err.message });
        }
        if (progressCb) progressCb(total, total);
        break;
      }
    }

    return {
      processed: rows.length,
      imported,
      updated,
      skipped,
      failed,
      errors,
      details
    };
  }

  // -------------------------------------------------------------
  // 8. RESULT REPORT GENERATOR (ImportResultReportService.java Parity)
  // -------------------------------------------------------------
  function generateResultReport(moduleName, sourceFileName, dryRun, result) {
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
    const filename = `Import_Result_${moduleName.replace(/[^A-Za-z0-9]+/g, '_')}_${stamp}.xlsx`;

    if (window.XLSX) {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryRows = [
        ['Module', moduleName],
        ['Source File', sourceFileName || 'Workbook'],
        ['Mode', dryRun ? 'Validate only' : 'Import'],
        ['Processed', String(result.processed || 0)],
        ['Passed', String((result.imported || 0) + (result.updated || 0))],
        ['Imported', String(result.imported || 0)],
        ['Updated', String(result.updated || 0)],
        ['Skipped', String(result.skipped || 0)],
        ['Failed', String(result.failed || 0)],
        ['Date', new Date().toLocaleDateString()],
        ['Time', new Date().toLocaleTimeString()]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary['!cols'] = [{ wch: 20 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Sheet 2: Import Results
      const headers = ['Source Row(s)', 'Reference', 'Status', 'Action', 'Tax Type', 'GST %', 'Message'];
      const detailRows = (result.details || []).map(d => [
        d.sourceRows || '',
        d.reference || '',
        d.status || 'PASSED',
        d.action || 'NONE',
        d.taxType || '',
        d.gstPercent || '',
        d.message || ''
      ]);

      const wsDetails = XLSX.utils.aoa_to_sheet([headers, ...detailRows]);
      wsDetails['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, wsDetails, 'Import Results');

      XLSX.writeFile(wb, filename);
    } else {
      // CSV report fallback
      const headers = ['Source Row(s)', 'Reference', 'Status', 'Action', 'Tax Type', 'GST %', 'Message'];
      const rows = (result.details || []).map(d => [
        d.sourceRows || '',
        d.reference || '',
        d.status || 'PASSED',
        d.action || 'NONE',
        d.taxType || '',
        d.gstPercent || '',
        d.message || ''
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace('.xlsx', '.csv');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  return {
    getModuleFields,
    getRequiredFields,
    humanize,
    getTargetView,
    autoMap,
    downloadTemplate,
    parseFile,
    validatePreflight,
    validateAndPreview: validatePreflight,
    executeImport,
    generateResultReport
  };
})();
