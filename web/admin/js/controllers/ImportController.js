/**
 * Jasvi Industries ERP - ImportController
 * Desktop Parity with org.example.controller.ImportController & Import.fxml
 */
window.ImportController = (function() {
  let currentStep = 1;
  let selectedModule = 'Item Master';
  let selectedFile = null;
  let parsedData = { headers: [], rows: [] };
  let columnMapping = {};

  const MODULE_FIELDS = {
    'Item Master': [
      { key: 'Item Code', label: 'Item Code / SKU', required: true },
      { key: 'Item Name', label: 'Item Description / Name', required: true },
      { key: 'Category', label: 'Product Category', required: false },
      { key: 'HSN/SAC', label: 'HSN / SAC Code', required: true },
      { key: 'Unit', label: 'Measurement Unit', required: true },
      { key: 'GST Rate %', label: 'Applicable GST Rate (%)', required: true },
      { key: 'Sell Price', label: 'Selling Rate (₹)', required: false },
      { key: 'Cost Price', label: 'Purchase Rate (₹)', required: false },
      { key: 'Opening Stock', label: 'Opening Physical Stock', required: false },
      { key: 'Min Stock Level', label: 'Reorder / Min Stock Level', required: false }
    ],
    'Customers / CRM': [
      { key: 'Party Code', label: 'Customer Code', required: false },
      { key: 'Party Name', label: 'Company / Trade Name', required: true },
      { key: 'GSTIN', label: '15-Digit GSTIN', required: false },
      { key: 'Pan Number', label: 'Income Tax PAN', required: false },
      { key: 'Contact Person', label: 'Primary Contact Person', required: false },
      { key: 'Mobile Number', label: 'Contact Phone / Mobile', required: false },
      { key: 'Email', label: 'Billing Email Address', required: false },
      { key: 'Billing Address', label: 'Registered Address', required: false },
      { key: 'City', label: 'City', required: false },
      { key: 'State', label: 'State Name', required: false }
    ],
    'Suppliers / HRM': [
      { key: 'Supplier Code', label: 'Supplier Code', required: false },
      { key: 'Supplier Name', label: 'Vendor / Firm Name', required: true },
      { key: 'GSTIN', label: '15-Digit GSTIN', required: false },
      { key: 'Pan Number', label: 'Income Tax PAN', required: false },
      { key: 'Contact Person', label: 'Contact Representative', required: false },
      { key: 'Mobile Number', label: 'Mobile / WhatsApp', required: false },
      { key: 'Email', label: 'Official Email', required: false },
      { key: 'Address', label: 'Dispatch Address', required: false },
      { key: 'City', label: 'City', required: false },
      { key: 'State', label: 'State Name', required: false }
    ],
    'Sales': [
      { key: 'Invoice No', label: 'Sales Tax Invoice #', required: true },
      { key: 'Invoice Date', label: 'Document Date (YYYY-MM-DD)', required: true },
      { key: 'Customer Name', label: 'Customer / Buyer Name', required: true },
      { key: 'Item Code', label: 'Item Code / SKU', required: true },
      { key: 'Qty', label: 'Billed Quantity', required: true },
      { key: 'Rate', label: 'Selling Rate (₹)', required: true },
      { key: 'Tax Rate %', label: 'GST %', required: true }
    ],
    'Purchases': [
      { key: 'Supplier Bill No', label: 'Vendor Invoice / Bill #', required: true },
      { key: 'Bill Date', label: 'Bill Date (YYYY-MM-DD)', required: true },
      { key: 'Supplier Name', label: 'Supplier / Vendor Name', required: true },
      { key: 'Item Code', label: 'Item Code / SKU', required: true },
      { key: 'Qty', label: 'Received Quantity', required: true },
      { key: 'Rate', label: 'Purchase Rate (₹)', required: true },
      { key: 'Tax Rate %', label: 'GST %', required: true }
    ],
    'Master Categories & Values': [
      { key: 'Category Code', label: 'Lookup Category Code', required: true },
      { key: 'Lookup Value', label: 'Lookup Display Value', required: true },
      { key: 'Lookup Code', label: 'Internal Code / Key', required: false },
      { key: 'Description', label: 'Description', required: false }
    ]
  };

  return {
    init() {
      this.goToStep(1);
    },

    goToStep(step) {
      currentStep = step;
      [1, 2, 3, 4].forEach(s => {
        const stepEl = document.getElementById(`import-stage-step-${s}`);
        const badgeEl = document.getElementById(`step${s}Badge`);
        if (stepEl) stepEl.style.display = s === step ? 'block' : 'none';
        if (badgeEl) {
          if (s === step) {
            badgeEl.className = 'wizard-badge active';
            badgeEl.style.background = 'var(--cyan)';
            badgeEl.style.color = '#000';
          } else if (s < step) {
            badgeEl.className = 'wizard-badge completed';
            badgeEl.style.background = 'var(--accent-green)';
            badgeEl.style.color = '#000';
          } else {
            badgeEl.className = 'wizard-badge pending';
            badgeEl.style.background = 'var(--bg-card)';
            badgeEl.style.color = 'var(--text-dim)';
          }
        }
      });
    },

    selectModule(moduleName) {
      selectedModule = moduleName;
      const titleEl = document.getElementById('lbl-import-selected-module');
      if (titleEl) titleEl.innerText = moduleName;
      this.goToStep(2);
    },

    downloadTemplate(moduleName) {
      if (window.ImportService) {
        window.ImportService.downloadTemplate(moduleName || selectedModule);
      }
    },

    onFileDrop(e) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.processSelectedFile(e.dataTransfer.files[0]);
      }
    },

    onFileInputChange(e) {
      if (e.target && e.target.files && e.target.files[0]) {
        this.processSelectedFile(e.target.files[0]);
      }
    },

    processSelectedFile(file) {
      selectedFile = file;
      const nameEl = document.getElementById('lbl-import-file-name');
      const sizeEl = document.getElementById('lbl-import-file-size');
      if (nameEl) nameEl.innerText = file.name;
      if (sizeEl) sizeEl.innerText = `${(file.size / 1024).toFixed(1)} KB`;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        if (window.ImportService) {
          parsedData = window.ImportService.parseCsv(text);
          const countEl = document.getElementById('lbl-import-file-rows');
          if (countEl) countEl.innerText = `${parsedData.rows.length} rows detected`;
          document.getElementById('btn-import-proceed-mapping')?.removeAttribute('disabled');
        }
      };
      reader.readAsText(file);
    },

    proceedToMapping() {
      if (!parsedData.rows || parsedData.rows.length === 0) {
        alert('Please choose a valid spreadsheet/CSV file containing data rows.');
        return;
      }
      this.renderMappingTable();
      this.goToStep(3);
    },

    renderMappingTable() {
      const tbody = document.getElementById('import-mapping-tbody');
      if (!tbody) return;

      const targetFields = MODULE_FIELDS[selectedModule] || [];
      columnMapping = window.ImportService.autoMapHeaders(parsedData.headers, targetFields);

      tbody.innerHTML = targetFields.map(target => {
        const matched = columnMapping[target.key] || '';
        const optionsHtml = `<option value="">-- Do Not Import / Skip --</option>` +
          parsedData.headers.map(h => `<option value="${h}" ${h === matched ? 'selected' : ''}>${h}</option>`).join('');

        return `
          <tr>
            <td style="font-weight:600; color:var(--text-bright);">
              ${target.label} ${target.required ? '<span style="color:var(--accent-red)">*</span>' : ''}
            </td>
            <td>
              <span class="badge badge-neutral" style="font-family:monospace;">${target.key}</span>
            </td>
            <td>
              <select class="form-select form-select-sm" onchange="window.ImportController.updateMapping('${target.key}', this.value)">
                ${optionsHtml}
              </select>
            </td>
            <td style="color:${matched ? 'var(--accent-green)' : (target.required ? 'var(--accent-red)' : 'var(--text-dim)')}; font-weight:600;">
              ${matched ? '✓ Auto-Matched' : (target.required ? '⚠️ Required' : 'Optional')}
            </td>
          </tr>
        `;
      }).join('');
    },

    updateMapping(targetKey, fileHeader) {
      columnMapping[targetKey] = fileHeader;
    },

    proceedToValidation() {
      const targetFields = MODULE_FIELDS[selectedModule] || [];
      const missingRequired = targetFields.filter(f => f.required && !columnMapping[f.key]);
      if (missingRequired.length > 0) {
        alert(`Missing required field mappings: ${missingRequired.map(f => f.label).join(', ')}`);
        return;
      }

      this.renderPreviewTable();
      this.goToStep(4);
    },

    renderPreviewTable() {
      const summaryTotal = document.getElementById('lbl-import-total-count');
      const summaryValid = document.getElementById('lbl-import-valid-count');
      const summaryInvalid = document.getElementById('lbl-import-invalid-count');
      const thead = document.getElementById('import-preview-thead');
      const tbody = document.getElementById('import-preview-tbody');

      if (summaryTotal) summaryTotal.innerText = parsedData.rows.length;
      if (summaryValid) summaryValid.innerText = parsedData.rows.length;
      if (summaryInvalid) summaryInvalid.innerText = '0';

      const targetFields = MODULE_FIELDS[selectedModule] || [];
      if (thead) {
        thead.innerHTML = `<tr>
          <th style="width:50px; text-align:center;">#</th>
          <th style="width:80px; text-align:center;">STATUS</th>
          ${targetFields.map(f => `<th>${f.key}</th>`).join('')}
        </tr>`;
      }

      if (tbody) {
        const previewRows = parsedData.rows.slice(0, 10);
        tbody.innerHTML = previewRows.map((row, idx) => {
          return `
            <tr>
              <td style="text-align:center; color:var(--text-dim);">${idx + 1}</td>
              <td style="text-align:center;"><span class="badge badge-paid">VALID</span></td>
              ${targetFields.map(f => {
                const header = columnMapping[f.key];
                const colIdx = parsedData.headers.indexOf(header);
                const val = colIdx >= 0 ? row[colIdx] : '';
                return `<td>${val || '-'}</td>`;
              }).join('')}
            </tr>
          `;
        }).join('');
      }
    },

    async runImport() {
      const btn = document.getElementById('btn-execute-import');
      if (btn) {
        btn.setAttribute('disabled', 'true');
        btn.innerHTML = `<span class="loading-spinner"></span> Ingesting into Database...`;
      }

      try {
        const mode = document.getElementById('import-mode-select')?.value || 'UPSERT';
        const res = await window.ImportService.executeImport(selectedModule, parsedData.rows, columnMapping, mode);

        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        if (window.AppDialogService) {
          window.AppDialogService.toastSuccess(`Data Import Completed! Imported: ${res.imported}, Skipped: ${res.updated || 0}`);
        }

        const completedPanel = document.getElementById('import-completed-panel');
        if (completedPanel) {
          completedPanel.style.display = 'block';
          document.getElementById('lbl-import-complete-summary').innerText =
            `Processed ${res.processed} rows — ${res.imported} records created successfully in ${selectedModule}.`;
        }
      } catch (err) {
        alert('Import Error: ' + err.message);
      } finally {
        if (btn) {
          btn.removeAttribute('disabled');
          btn.innerHTML = `✓ Execute Import (${parsedData.rows.length} Records)`;
        }
      }
    },

    startAnotherImport() {
      parsedData = { headers: [], rows: [] };
      selectedFile = null;
      columnMapping = {};
      const completedPanel = document.getElementById('import-completed-panel');
      if (completedPanel) completedPanel.style.display = 'none';
      this.goToStep(1);
    }
  };
})();
