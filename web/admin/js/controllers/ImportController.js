/**
 * Jasvi Industries ERP - ImportController
 * Desktop Parity with:
 * - org.example.controller.ImportController & Import.fxml
 * - org.example.importing.ImportModuleRegistry
 * - org.example.importing.ImportTemplateService
 * - org.example.importing.ImportMappingSupport
 * - org.example.importing.ImportPreviewService
 * - org.example.importing.ImportResultReportService
 */
window.ImportController = (function() {
  'use strict';

  let currentStep = 1;
  let selectedModule = 'Item Master';
  let selectedFile = null;
  let parsedData = { headers: [], rows: [], sheetNames: [], selectedSheet: '' };
  let columnMapping = {};
  let dryRunEnabled = false;
  let activeReviewTab = 'preview';
  let lastPreflightResult = null;
  let lastImportResult = null;

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

      // Reset file and data for new selection
      selectedFile = null;
      parsedData = { headers: [], rows: [], sheetNames: [], selectedSheet: '' };
      columnMapping = {};
      lastPreflightResult = null;
      lastImportResult = null;

      const nameEl = document.getElementById('lbl-import-file-name');
      const sizeEl = document.getElementById('lbl-import-file-size');
      const rowsEl = document.getElementById('lbl-import-file-rows');
      if (nameEl) nameEl.innerText = 'No file selected';
      if (sizeEl) sizeEl.innerText = '0 KB';
      if (rowsEl) rowsEl.innerText = '0 rows detected';
      document.getElementById('btn-import-proceed-mapping')?.setAttribute('disabled', 'true');

      const completedPanel = document.getElementById('import-completed-panel');
      if (completedPanel) completedPanel.style.display = 'none';

      this.goToStep(2);
    },

    downloadTemplate(moduleName) {
      const target = moduleName || selectedModule;
      if (window.ImportService) {
        window.ImportService.downloadTemplate(target);
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

    async processSelectedFile(file) {
      if (!file) return;
      selectedFile = file;

      const nameEl = document.getElementById('lbl-import-file-name');
      const sizeEl = document.getElementById('lbl-import-file-size');
      const countEl = document.getElementById('lbl-import-file-rows');
      const proceedBtn = document.getElementById('btn-import-proceed-mapping');

      if (nameEl) nameEl.innerText = file.name;
      if (sizeEl) sizeEl.innerText = `${(file.size / 1024).toFixed(1)} KB`;
      if (countEl) countEl.innerText = 'Parsing spreadsheet...';
      if (proceedBtn) proceedBtn.setAttribute('disabled', 'true');

      try {
        if (!window.ImportService) {
          throw new Error('ImportService is not loaded.');
        }

        parsedData = await window.ImportService.parseFile(file);

        if (countEl) {
          const sheetInfo = parsedData.selectedSheet ? ` [Sheet: ${parsedData.selectedSheet}]` : '';
          countEl.innerText = `${parsedData.rows.length} rows detected${sheetInfo}`;
        }

        if (parsedData.rows.length > 0) {
          if (proceedBtn) proceedBtn.removeAttribute('disabled');
        } else {
          alert('The selected spreadsheet does not contain any valid data rows.');
        }
      } catch (err) {
        console.error('File parsing error:', err);
        if (countEl) countEl.innerText = 'Failed to parse file';
        alert('Could not read spreadsheet: ' + (err.message || err));
      }
    },

    proceedToMapping() {
      if (!parsedData.rows || parsedData.rows.length === 0) {
        alert('Please choose a valid spreadsheet (.xlsx, .xls, .csv) containing data rows.');
        return;
      }
      this.renderMappingTable();
      this.goToStep(3);
    },

    renderMappingTable() {
      const tbody = document.getElementById('import-mapping-tbody');
      if (!tbody || !window.ImportService) return;

      const domainFields = window.ImportService.getModuleFields(selectedModule);
      const requiredSet = window.ImportService.getRequiredFields(selectedModule);

      // Perform Auto-Map matching
      columnMapping = window.ImportService.autoMap(domainFields, parsedData.headers);

      tbody.innerHTML = domainFields.map(field => {
        const isRequired = requiredSet.has(field);
        const humanLabel = window.ImportService.humanize(field);
        const matchedHeader = columnMapping[field] || '';

        const optionsHtml = `<option value="">-- Do Not Import / Skip --</option>` +
          parsedData.headers.map(h => `<option value="${h}" ${h === matchedHeader ? 'selected' : ''}>${h}</option>`).join('');

        const statusHtml = matchedHeader
          ? `<span style="color:var(--accent-green); font-weight:600;">✓ Auto-Matched</span>`
          : (isRequired
              ? `<span style="color:var(--accent-red); font-weight:600;">⚠️ Required</span>`
              : `<span style="color:var(--text-dim); font-size:0.75rem;">Optional</span>`);

        return `
          <tr>
            <td style="font-weight:600; color:var(--text-bright);">
              ${humanLabel} ${isRequired ? '<span style="color:var(--accent-red)">*</span>' : ''}
            </td>
            <td>
              <span class="badge badge-neutral" style="font-family:monospace; font-size:0.75rem;">${field}</span>
            </td>
            <td>
              <select class="form-select form-select-sm" onchange="window.ImportController.updateMapping('${field}', this.value)">
                ${optionsHtml}
              </select>
            </td>
            <td id="mapping-status-${field}">
              ${statusHtml}
            </td>
          </tr>
        `;
      }).join('');
    },

    updateMapping(field, fileHeader) {
      if (fileHeader) {
        columnMapping[field] = fileHeader;
      } else {
        delete columnMapping[field];
      }

      const statusEl = document.getElementById(`mapping-status-${field}`);
      if (statusEl && window.ImportService) {
        const requiredSet = window.ImportService.getRequiredFields(selectedModule);
        const isRequired = requiredSet.has(field);
        if (fileHeader) {
          statusEl.innerHTML = `<span style="color:var(--accent-green); font-weight:600;">✓ Matched</span>`;
        } else if (isRequired) {
          statusEl.innerHTML = `<span style="color:var(--accent-red); font-weight:600;">⚠️ Required</span>`;
        } else {
          statusEl.innerHTML = `<span style="color:var(--text-dim); font-size:0.75rem;">Optional</span>`;
        }
      }
    },

    toggleDryRun(checked) {
      dryRunEnabled = checked;
      const btn = document.getElementById('btn-execute-import');
      if (btn) {
        btn.innerText = checked ? 'Validate Dataset (Dry Run)' : `✓ Execute Import (${parsedData.rows.length} Records)`;
      }
    },

    switchReviewTab(tab) {
      activeReviewTab = tab;
      const tabPreview = document.getElementById('tab-import-preview');
      const tabValid = document.getElementById('tab-import-validation');
      const panePreview = document.getElementById('pane-import-preview');
      const paneValid = document.getElementById('pane-import-validation');

      if (tabPreview) tabPreview.className = tab === 'preview' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
      if (tabValid) tabValid.className = tab === 'validation' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';

      if (panePreview) panePreview.style.display = tab === 'preview' ? 'block' : 'none';
      if (paneValid) paneValid.style.display = tab === 'validation' ? 'block' : 'none';
    },

    async proceedToValidation() {
      const requiredSet = window.ImportService.getRequiredFields(selectedModule);
      const missingRequired = [];
      requiredSet.forEach(field => {
        if (!columnMapping[field]) {
          missingRequired.push(window.ImportService.humanize(field));
        }
      });

      if (missingRequired.length > 0) {
        const confirmProceed = confirm(
          `The following required fields are not mapped:\n- ${missingRequired.join('\n- ')}\n\nWould you like to review mappings first? Click Cancel to stay, or OK to proceed anyway.`
        );
        if (!confirmProceed) return;
      }

      this.renderPreviewTable();
      this.switchReviewTab('preview');
      this.goToStep(4);

      // Run deep async preflight validation
      await this.validateDataset();
    },

    renderPreviewTable() {
      const thead = document.getElementById('import-preview-thead');
      const tbody = document.getElementById('import-preview-tbody');
      if (!window.ImportService) return;

      const domainFields = window.ImportService.getModuleFields(selectedModule);
      const mappedFields = domainFields.filter(f => columnMapping[f]);

      if (thead) {
        thead.innerHTML = `<tr>
          <th style="width:50px; text-align:center;">#</th>
          <th style="width:80px; text-align:center;">STATUS</th>
          ${mappedFields.map(f => `<th>${window.ImportService.humanize(f)}</th>`).join('')}
        </tr>`;
      }

      if (tbody) {
        const previewRows = parsedData.rows.slice(0, 10);
        tbody.innerHTML = previewRows.map((row, idx) => {
          return `
            <tr>
              <td style="text-align:center; color:var(--text-dim);">${idx + 1}</td>
              <td style="text-align:center;"><span class="badge badge-paid">READY</span></td>
              ${mappedFields.map(f => {
                const header = columnMapping[f];
                const colIdx = parsedData.headers.indexOf(header);
                const val = colIdx >= 0 ? (row[colIdx] ?? '') : '';
                return `<td>${val !== '' ? String(val) : '-'}</td>`;
              }).join('')}
            </tr>
          `;
        }).join('');
      }
    },

    async validateDataset() {
      const mode = document.getElementById('import-mode-select')?.value || 'UPSERT';
      const validTbody = document.getElementById('import-validation-tbody');
      if (validTbody) {
        validTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--cyan);"><span class="loading-spinner"></span> Performing cross-entity & schema validation against database...</td></tr>`;
      }

      try {
        const res = await window.ImportService.validatePreflight(
          selectedModule,
          columnMapping,
          parsedData.rows,
          parsedData.headers,
          mode
        );

        lastPreflightResult = res;

        // Update KPI metrics
        const summaryTotal = document.getElementById('lbl-import-total-count');
        const summaryValid = document.getElementById('lbl-import-valid-count');
        const summaryInvalid = document.getElementById('lbl-import-invalid-count');

        if (summaryTotal) summaryTotal.innerText = res.processed || parsedData.rows.length;
        if (summaryValid) summaryValid.innerText = res.passedCount || 0;
        if (summaryInvalid) summaryInvalid.innerText = (res.failedCount || 0) + (res.skippedCount || 0);

        // Render validation rows matching Desktop ImportController.java 7 columns
        if (validTbody) {
          if (!res.details || res.details.length === 0) {
            validTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--accent-green); font-weight:600;">✓ All ${parsedData.rows.length} records passed validation! No schema or constraint errors found.</td></tr>`;
          } else {
            validTbody.innerHTML = res.details.slice(0, 100).map(d => {
              const isPassed = d.status === 'PASSED';
              const statusBadge = isPassed
                ? `<span class="badge badge-paid">${d.status}</span>`
                : `<span class="badge badge-unpaid">${d.status}</span>`;

              return `
                <tr>
                  <td style="text-align:center; font-weight:600; color:var(--text-bright);">${d.sourceRows || '-'}</td>
                  <td style="font-family:monospace; color:var(--cyan); font-weight:600;">${d.reference || '-'}</td>
                  <td style="font-size:0.75rem;">${d.mandatory || '✓ Passed'}</td>
                  <td style="font-size:0.75rem;">${d.format || '✓ Passed'}</td>
                  <td style="font-size:0.75rem;">${d.master || '✓ Passed'}</td>
                  <td style="font-size:0.75rem;">${d.data || d.action || '-'}</td>
                  <td style="text-align:center;">${statusBadge}</td>
                </tr>
              `;
            }).join('');
          }
        }

        const executeBtn = document.getElementById('btn-execute-import');
        if (executeBtn) {
          executeBtn.innerText = dryRunEnabled
            ? 'Validate Dataset (Dry Run)'
            : `✓ Execute Import (${res.passedCount} Records)`;
        }

        return res;
      } catch (err) {
        console.error('Validation error:', err);
        if (validTbody) {
          validTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--accent-red);">Validation Error: ${err.message || err}</td></tr>`;
        }
      }
    },

    async runImport() {
      if (dryRunEnabled) {
        const stats = await this.validateDataset();
        this.switchReviewTab('validation');
        if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();
        if (window.AppDialogService) {
          window.AppDialogService.toastInfo(
            `Dry Run Finished: ${stats.passedCount} valid, ${stats.failedCount} errors, ${stats.skippedCount} skipped. Uncheck "Validate only" to ingest into database.`
          );
        }
        return;
      }

      const btn = document.getElementById('btn-execute-import');
      if (btn) {
        btn.setAttribute('disabled', 'true');
        btn.innerHTML = `<span class="loading-spinner"></span> Ingesting into Database...`;
      }

      try {
        const mode = document.getElementById('import-mode-select')?.value || 'UPSERT';
        const res = await window.ImportService.executeImport(
          selectedModule,
          columnMapping,
          parsedData.rows,
          parsedData.headers,
          mode,
          (curr, tot) => {
            if (btn) btn.innerHTML = `<span class="loading-spinner"></span> Ingesting: ${curr} / ${tot} records...`;
          }
        );

        lastImportResult = res;

        if (window.AudioSynthesizer) {
          if (res.failed === 0) window.AudioSynthesizer.playSuccess();
          else window.AudioSynthesizer.playNotification();
        }

        // Show page completion banner
        const completedPanel = document.getElementById('import-completed-panel');
        if (completedPanel) {
          completedPanel.style.display = 'block';
          const summaryEl = document.getElementById('lbl-import-complete-summary');
          if (summaryEl) {
            summaryEl.innerText = `Ingested into ${selectedModule}: ${res.imported} created, ${res.updated} updated, ${res.skipped} skipped, ${res.failed} failed.`;
          }
        }

        // Display Desktop Parity Completion Dialog Modal
        this.showResultModal(res);

      } catch (err) {
        console.error('Import execution error:', err);
        alert('Import Error: ' + (err.message || err));
      } finally {
        if (btn) {
          btn.removeAttribute('disabled');
          btn.innerHTML = `✓ Execute Import (${parsedData.rows.length} Records)`;
        }
      }
    },

    showResultModal(result) {
      const modal = document.getElementById('modal-import-result');
      if (!modal) return;

      document.getElementById('lbl-modal-import-module').innerText = selectedModule;
      document.getElementById('lbl-modal-import-total').innerText = result.processed || parsedData.rows.length;
      document.getElementById('lbl-modal-import-created').innerText = result.imported || 0;
      document.getElementById('lbl-modal-import-updated').innerText = result.updated || 0;
      document.getElementById('lbl-modal-import-skipped').innerText = result.skipped || 0;
      document.getElementById('lbl-modal-import-failed').innerText = result.failed || 0;

      const detailsEl = document.getElementById('modal-import-error-details');
      if (detailsEl) {
        if (result.errors && result.errors.length > 0) {
          detailsEl.style.display = 'block';
          detailsEl.innerHTML = `<strong>Errors Encountered (${result.errors.length}):</strong><br>` +
            result.errors.slice(0, 10).map(e => `• ${e}`).join('<br>');
        } else {
          detailsEl.style.display = 'none';
          detailsEl.innerHTML = '';
        }
      }

      modal.style.display = 'flex';
    },

    closeResultModal() {
      const modal = document.getElementById('modal-import-result');
      if (modal) modal.style.display = 'none';
    },

    downloadResultReport() {
      const resultData = lastImportResult || lastPreflightResult;
      if (!resultData) {
        alert('No validation or import result data available to export.');
        return;
      }
      if (window.ImportService) {
        window.ImportService.generateResultReport(
          selectedModule,
          selectedFile ? selectedFile.name : 'Import_Data',
          dryRunEnabled,
          resultData
        );
      }
    },

    viewImportedRecords() {
      this.closeResultModal();
      if (!window.ImportService) return;

      const targetRoute = window.ImportService.getTargetView(selectedModule);
      if (targetRoute) {
        if (typeof window.selectNav === 'function') {
          window.selectNav(targetRoute);
        } else if (window.NavigationRouter && typeof window.NavigationRouter.selectNav === 'function') {
          window.NavigationRouter.selectNav(targetRoute);
        }
      }
    },

    startAnotherImport() {
      parsedData = { headers: [], rows: [], sheetNames: [], selectedSheet: '' };
      selectedFile = null;
      columnMapping = {};
      lastPreflightResult = null;
      lastImportResult = null;

      const completedPanel = document.getElementById('import-completed-panel');
      if (completedPanel) completedPanel.style.display = 'none';
      this.closeResultModal();
      this.goToStep(1);
    }
  };
})();
