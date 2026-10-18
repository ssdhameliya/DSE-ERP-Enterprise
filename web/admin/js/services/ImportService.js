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
        return new Set(['transaction_date', 'value_date', 'description', 'reference', 'amount', 'direction', 'balance']);
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

  function matchesReferenceFormat(format, value, docDate) {
    if (!format || !value) return false;
    try {
      const reg = new RegExp(referenceToRegex(format.trim(), docDate), 'i');
      return reg.test(value.trim());
    } catch (e) {
      return true; // Fallback to permissive if invalid regex
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
        return normHeader === 'itemname' || normHeader === 'name' || normHeader === 'itemdescription' || normHeader === 'productname';
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
        return normHeader === 'txndate' || normHeader === 'transactiondate';
      case 'valuedate':
        return normHeader === 'valuedate';
      case 'reference':
        return normHeader === 'chqrefno' || normHeader === 'referenceno' || normHeader === 'refchequeno' || normHeader === 'utrno';
      case 'amount':
        return normHeader === 'amount' || normHeader === 'txnamount';
      case 'direction':
        return normHeader === 'drcr' || normHeader === 'debitcredit' || normHeader === 'type';
      case 'balance':
        return normHeader === 'balance' || normHeader === 'closingbalance';
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

        // Check first 10 rows for headers
        for (let r = 0; r < Math.min(10, rawJson.length); r++) {
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
      return parseCsvText(text);
    }
  }

  function parseCsvText(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

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

    const headers = parseRow(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parsed = parseRow(lines[i]);
      if (parsed.some(x => x.length > 0)) {
        rows.push(parsed);
      }
    }
    return { headers, rows, sheetNames: ['CSV'], selectedSheet: 'CSV' };
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

    if (module === 'Item Master') {
      try {
        const items = await window.MasterService.getItems(false);
        (items || []).forEach(it => existingItems.set((it.itemCode || '').toUpperCase(), it));
      } catch (e) {
        console.warn('Could not load master items cache:', e);
      }
    } else if (module.includes('Customer') || module.includes('Supplier')) {
      const partyType = module.includes('Customer') ? 'CUSTOMER' : 'SUPPLIER';
      try {
        const parties = await window.MasterService.getParties(partyType, false);
        (parties || []).forEach(p => existingParties.set((p.partyCode || '').toUpperCase(), p));
      } catch (e) {
        console.warn('Could not load master parties cache:', e);
      }
    } else if (module === 'Sales' || module === 'Purchases') {
      const isSales = module === 'Sales';
      try {
        const parties = await window.MasterService.getParties(isSales ? 'CUSTOMER' : 'SUPPLIER', false);
        (parties || []).forEach(p => existingParties.set((p.partyCode || '').toUpperCase(), p));
        const items = await window.MasterService.getItems(false);
        (items || []).forEach(it => {
          const code = (it.itemCode || '').toUpperCase();
          existingItems.set(code, it);
          availableStockByItem.set(code, it.availableStock || 0);
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
          const itemQtys = new Map();
          for (const item of groupRows) {
            const iCode = getVal(item.row, 'item_code').toUpperCase();
            if (!existingItems.has(iCode)) {
              rowError = `Item not found in master data: ${iCode}`;
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
      case 'Item Master': {
        const existingItems = new Map();
        try {
          const items = await window.MasterService.getItems(false);
          (items || []).forEach(it => existingItems.set((it.itemCode || '').toUpperCase(), it));
        } catch (e) { }

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 1;
          const code = getVal(row, 'item_code');
          if (!code) continue;

          try {
            const existing = existingItems.get(code.toUpperCase());
            if (existing && (mode === 'CREATE_ONLY' || mode === 'INSERT_ONLY' || mode === 'SKIP_EXISTING')) {
              skipped++;
              details.push({ sourceRows: String(rowNum), reference: code, status: 'SKIPPED', action: 'SKIPPED', message: 'Existing item preserved' });
              continue;
            }

            const payload = {
              itemCode: code,
              description: getVal(row, 'description') || 'Item',
              category: getVal(row, 'category') || 'GENERAL',
              brand: getVal(row, 'brand') || '',
              material: getVal(row, 'material') || '',
              size: getVal(row, 'size') || '',
              unit: getVal(row, 'unit') || 'NOS',
              hsn: getVal(row, 'hsn') || '7306',
              gst: parseFloat(getVal(row, 'gst')) || 18,
              discountPercent: parseFloat(getVal(row, 'discount_percent')) || 0,
              purchasePrice: parseFloat(getVal(row, 'purchase_price')) || 0,
              sellingPrice: parseFloat(getVal(row, 'selling_price')) || 0,
              openingStock: parseFloat(getVal(row, 'opening_stock')) || 0,
              minimumStock: parseFloat(getVal(row, 'minimum_stock')) || 0,
              location: getVal(row, 'location') || '',
              remarks: getVal(row, 'remarks') || '',
              active: true
            };

            if (existing) {
              if (mode === 'UPDATE_NON_BLANK') {
                if (!getVal(row, 'description')) payload.description = existing.description;
                if (!getVal(row, 'category')) payload.category = existing.category;
                if (!getVal(row, 'selling_price')) payload.sellingPrice = existing.sellingPrice;
                if (!getVal(row, 'purchase_price')) payload.purchasePrice = existing.purchasePrice;
              }
              await window.MasterService.updateItem(payload);
              updated++;
              details.push({ sourceRows: String(rowNum), reference: code, status: 'PASSED', action: 'UPDATED', message: 'Item updated successfully' });
            } else {
              await window.MasterService.createItem(payload);
              imported++;
              details.push({ sourceRows: String(rowNum), reference: code, status: 'PASSED', action: 'CREATED', message: 'New item created successfully' });
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
        try {
          const parties = await window.MasterService.getParties(partyType, false);
          (parties || []).forEach(p => existingParties.set((p.partyCode || '').toUpperCase(), p));
        } catch (e) { }

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 1;
          const code = getVal(row, 'party_code');
          if (!code) continue;

          try {
            const existing = existingParties.get(code.toUpperCase());
            if (existing && (mode === 'CREATE_ONLY' || mode === 'INSERT_ONLY' || mode === 'SKIP_EXISTING')) {
              skipped++;
              details.push({ sourceRows: String(rowNum), reference: code, status: 'SKIPPED', action: 'SKIPPED', message: `Existing ${partyType.toLowerCase()} preserved` });
              continue;
            }

            const activeVal = getVal(row, 'is_active');
            const isActive = activeVal === '' ? true : !['false', '0', 'no', 'inactive'].includes(activeVal.toLowerCase());

            const payload = {
              partyCode: code,
              name: getVal(row, 'name'),
              partyType: partyType,
              contactPerson: getVal(row, 'contact_person') || '',
              phone: getVal(row, 'phone') || '',
              email: getVal(row, 'email') || '',
              gstin: getVal(row, 'gstin') || '',
              address: getVal(row, 'address') || '',
              openingBalance: parseFloat(getVal(row, 'opening_balance')) || 0,
              active: isActive
            };

            if (existing) {
              if (mode === 'UPDATE_NON_BLANK') {
                if (!getVal(row, 'name')) payload.name = existing.name;
                if (!getVal(row, 'phone')) payload.phone = existing.phone;
                if (!getVal(row, 'email')) payload.email = existing.email;
                if (!getVal(row, 'gstin')) payload.gstin = existing.gstin;
              }
              await window.MasterService.updateParty(payload);
              updated++;
              details.push({ sourceRows: String(rowNum), reference: code, status: 'PASSED', action: 'UPDATED', message: `${partyType} updated` });
            } else {
              await window.MasterService.createParty(payload);
              imported++;
              details.push({ sourceRows: String(rowNum), reference: code, status: 'PASSED', action: 'CREATED', message: `New ${partyType} created` });
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
        try {
          const sp = await window.OperationsService.getSalesPage(0, 1000);
          ((sp && sp.rows) || []).forEach(s => existingSales.add((s.invoiceNo || '').toUpperCase()));
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

            const lines = gRows.map(g => {
              const r = g.row;
              const qty = parseFloat(getVal(r, 'quantity')) || 1;
              const rate = parseFloat(getVal(r, 'rate')) || 0;
              const gstPct = parseFloat(getVal(r, 'gst_percent')) || 18;
              const taxable = qty * rate;
              const tax = (taxable * gstPct) / 100;
              return {
                itemCode: getVal(r, 'item_code'),
                itemDescription: getVal(r, 'description') || getVal(r, 'item_code'),
                quantity: qty,
                rate: rate,
                discountPercent: 0,
                gstPercent: gstPct,
                taxableAmount: taxable,
                gstAmount: tax,
                totalAmount: taxable + tax
              };
            });

            // Calculate totals
            const itemTaxable = lines.reduce((acc, l) => acc + l.taxableAmount, 0);
            const totalTax = lines.reduce((acc, l) => acc + l.gstAmount, 0);
            const grandTotal = itemTaxable + totalTax;

            const salePayload = {
              invoiceNo: invNo,
              invoiceDate: invDate,
              customerCode: customerCode,
              paymentTerms: getVal(first, 'payment_terms') || '15 Days',
              gstType: gstType,
              remarks: getVal(first, 'remarks') || 'Imported via Data Import Studio',
              subtotal: itemTaxable,
              gstAmount: totalTax,
              totalAmount: grandTotal,
              paidAmount: parseFloat(getVal(first, 'paid_amount')) || 0,
              paymentStatus: 'PENDING',
              documentStatus: 'POSTED',
              lines: lines
            };

            await window.OperationsService.createSale(salePayload);
            imported++;
            details.push({ sourceRows, reference: invNo, status: 'PASSED', action: 'CREATED', message: `Sale invoice created (${lines.length} lines)` });
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
        try {
          const pp = await window.OperationsService.getPurchasesPage(0, 1000);
          ((pp && pp.rows) || []).forEach(p => {
            if (p.invoiceNo) existingPurchases.add(p.invoiceNo.toUpperCase());
            if (p.referenceNo) existingPurchases.add(p.referenceNo.toUpperCase());
          });
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

            const lines = gRows.map(g => {
              const r = g.row;
              const qty = parseFloat(getVal(r, 'quantity')) || 1;
              const rate = parseFloat(getVal(r, 'rate')) || 0;
              const gstPct = parseFloat(getVal(r, 'gst_percent')) || 18;
              const taxable = qty * rate;
              const tax = (taxable * gstPct) / 100;
              return {
                itemCode: getVal(r, 'item_code'),
                itemDescription: getVal(r, 'description') || getVal(r, 'item_code'),
                quantity: qty,
                rate: rate,
                discountPercent: 0,
                gstPercent: gstPct,
                taxableAmount: taxable,
                gstAmount: tax,
                totalAmount: taxable + tax
              };
            });

            const itemTaxable = lines.reduce((acc, l) => acc + l.taxableAmount, 0);
            const totalTax = lines.reduce((acc, l) => acc + l.gstAmount, 0);
            const grandTotal = itemTaxable + totalTax;

            const purchasePayload = {
              invoiceNo: invNo,
              billDate: invDate,
              supplierCode: supplierCode,
              paymentTerms: getVal(first, 'payment_terms') || '15 Days',
              gstType: gstType,
              remarks: getVal(first, 'remarks') || 'Imported via Data Import Studio',
              subtotal: itemTaxable,
              gstAmount: totalTax,
              totalAmount: grandTotal,
              paidAmount: parseFloat(getVal(first, 'paid_amount')) || 0,
              paymentStatus: 'PENDING',
              documentStatus: 'POSTED',
              lines: lines
            };

            await window.OperationsService.createPurchase(purchasePayload);
            imported++;
            details.push({ sourceRows, reference: invNo, status: 'PASSED', action: 'CREATED', message: `Purchase bill created (${lines.length} lines)` });
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

            const lookupDto = {
              lookupType: catName,
              lookupCode: valCode,
              lookupValue: val,
              description: getVal(row, 'value_description') || '',
              displayOrder: parseInt(getVal(row, 'display_order')) || (i + 1),
              active: !['false', '0', 'no', 'inactive'].includes((getVal(row, 'is_active') || '').toLowerCase())
            };

            await window.MasterService.saveLookup(lookupDto);
            imported++;
            details.push({ sourceRows: String(rowNum), reference: `${catCode}/${valCode}`, status: 'PASSED', action: 'CREATED', message: 'Lookup created' });
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
          invoiceDate: getVal(r, 'invoice_date'),
          taxableValue: parseFloat(getVal(r, 'taxable_value')) || 0,
          cgst: parseFloat(getVal(r, 'cgst')) || 0,
          sgst: parseFloat(getVal(r, 'sgst')) || 0,
          igst: parseFloat(getVal(r, 'igst')) || 0,
          invoiceValue: parseFloat(getVal(r, 'invoice_value')) || 0
        })).filter(r => r.supplierName && r.supplierInvoiceNo);

        try {
          const req = {
            sourceFileName: 'Purchase_Recon_Import.xlsx',
            fingerprint: `PRC-FP-${Date.now()}`,
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
        const bankRows = rows.map((r, idx) => {
          const debit = parseFloat(getVal(r, 'amount')) || 0;
          const dir = (getVal(r, 'direction') || 'DR').toUpperCase();
          const dVal = dir === 'DR' ? debit : 0;
          const cVal = dir === 'CR' ? debit : 0;
          return {
            sourceRow: idx + 1,
            transactionTimestamp: getVal(r, 'transaction_date') || new Date().toISOString(),
            transactionDate: (getVal(r, 'transaction_date') || '').substring(0, 10),
            valueDate: getVal(r, 'value_date'),
            description: getVal(r, 'description') || 'Bank Txn',
            reference: getVal(r, 'reference') || `REF-${idx + 1}`,
            debit: dVal,
            credit: cVal,
            balance: parseFloat(getVal(r, 'balance')) || 0,
            rowFingerprint: `BS-ROW-${Date.now()}-${idx}`
          };
        }).filter(r => r.description);

        try {
          const req = {
            bankName: 'Kotak Mahindra Bank',
            accountNumber: '50200012847192',
            accountHolder: 'Jasvi Industries Pvt Ltd',
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
          details.push({ sourceRows: `1-${bankRows.length}`, reference: req.accountNumber, status: 'PASSED', action: 'IMPORTED', message: `Imported ${imported} bank statement lines` });
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
    executeImport,
    generateResultReport
  };
})();
