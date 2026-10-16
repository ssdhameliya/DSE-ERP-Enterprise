/**
 * Jasvi Industries ERP - QuotationController
 * 100% Desktop Parity with QuotationController.java & QuotationEditorController.java
 * Manages Quotation Register, Pipeline KPIs, Quotation Editor Workspace, Line Calculations, and 1-Click Convert to Sale
 */
window.QuotationController = (function() {
  let currentPage = 0;
  const pageSize = 25;
  let totalRows = 0;
  let totalPages = 1;
  let quotationsList = [];
  let selectedQuote = null;

  // Editor Workspace State
  let editingQuotationId = null;
  let editingRowVersion = 0;
  let editorLines = [];
  let cachedCustomers = [];
  let cachedSources = [];
  let cachedItems = [];

  function formatMoney(val) {
    const num = parseFloat(val) || 0;
    return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(dStr) {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dStr;
    }
  }

  function getStatusBadge(status) {
    const s = (status || '').toUpperCase().trim();
    if (s === 'ACCEPTED') {
      return `<span class="pill-badge pill-success">${status}</span>`;
    } else if (s === 'SENT') {
      return `<span class="pill-badge pill-success">${status}</span>`;
    } else if (s === 'EXPIRED' || s === 'REJECTED') {
      return `<span class="pill-badge pill-danger">${status}</span>`;
    }
    return `<span class="pill-badge pill-warning">${status || 'DRAFT'}</span>`;
  }

  // 1. LOAD & RENDER QUOTATIONS REGISTER
  async function loadQuotations(page = 0) {
    currentPage = page;
    const tbody = document.getElementById('tbl-quotations-body');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-muted);"><span class="loading-spinner"></span> Loading quotations from database...</td></tr>`;
    }

    const q = document.getElementById('quote-filter-search')?.value?.trim() || '';
    const number = document.getElementById('quote-filter-number')?.value?.trim() || '';
    const customer = document.getElementById('quote-filter-customer')?.value || '';
    const status = document.getElementById('quote-filter-status')?.value || '';
    const from = document.getElementById('quote-filter-from')?.value || '';
    const to = document.getElementById('quote-filter-to')?.value || '';
    const salesperson = document.getElementById('quote-filter-salesperson')?.value || '';
    const followUp = document.getElementById('quote-filter-followup')?.value || '';
    const source = document.getElementById('quote-filter-source')?.value || '';

    try {
      const data = await window.OperationsService.getQuotationsPage(
        currentPage, pageSize, q, number, customer, status, from, to, '', salesperson, '', '', followUp, source
      );

      quotationsList = data?.rows || [];
      totalRows = data?.totalRows || quotationsList.length;
      totalPages = data?.totalPages || 1;

      applyMetrics(data?.metrics);
      populateFilters(data?.customers, data?.salespersons);
      renderTable(quotationsList);
      updatePagination(data?.filteredAmount || 0);

    } catch (err) {
      console.error('Failed to load quotations:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--red);">⚠️ Failed to load quotations: ${err.message || 'Server error'}</td></tr>`;
      }
    }
  }

  function applyMetrics(m) {
    if (!m) return;
    const totalValEl = document.getElementById('quote-kpi-total-val');
    const totalCountEl = document.getElementById('quote-kpi-total-count');
    const pendingValEl = document.getElementById('quote-kpi-pending-val');
    const pendingCountEl = document.getElementById('quote-kpi-pending-count');
    const acceptedValEl = document.getElementById('quote-kpi-accepted-val');
    const acceptedCountEl = document.getElementById('quote-kpi-accepted-count');
    const expiredValEl = document.getElementById('quote-kpi-expired-val');
    const conversionEl = document.getElementById('quote-kpi-conversion');

    if (totalValEl) totalValEl.innerText = formatMoney(m.totalValue);
    if (totalCountEl) totalCountEl.innerText = `${m.totalCount || 0} quotes`;
    if (pendingValEl) pendingValEl.innerText = formatMoney(m.pendingValue);
    if (pendingCountEl) pendingCountEl.innerText = `${m.pendingCount || 0} quotes`;
    if (acceptedValEl) acceptedValEl.innerText = formatMoney(m.acceptedValue);
    if (acceptedCountEl) acceptedCountEl.innerText = `${m.acceptedCount || 0} quotes`;
    if (expiredValEl) expiredValEl.innerText = formatMoney(m.expiredValue);
    if (conversionEl) conversionEl.innerText = `${(m.conversionRate || 0).toFixed(1)}%`;
  }

  function populateFilters(customers, salespersons) {
    const custSelect = document.getElementById('quote-filter-customer');
    if (custSelect && customers && custSelect.options.length <= 1) {
      const cur = custSelect.value;
      custSelect.innerHTML = `<option value="">All customers</option>`;
      customers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        custSelect.appendChild(opt);
      });
      if (cur) custSelect.value = cur;
    }

    const spSelect = document.getElementById('quote-filter-salesperson');
    if (spSelect && salespersons && spSelect.options.length <= 1) {
      const cur = spSelect.value;
      spSelect.innerHTML = `<option value="">All Salespersons</option>`;
      salespersons.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        spSelect.appendChild(opt);
      });
      if (cur) spSelect.value = cur;
    }
  }

  function renderTable(rows) {
    const tbody = document.getElementById('tbl-quotations-body');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);">
            <div style="font-size:1.8rem; margin-bottom:8px;">📝</div>
            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">No quotations found</div>
            <div style="font-size:0.78rem;">Adjust the filters or click "+ New Quotation" to create one.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map(q => {
      const isConverted = q.converted && q.converted.trim() !== '';
      const isAccepted = (q.status || '').toUpperCase() === 'ACCEPTED';
      const isRejectedExpired = (q.status || '').toUpperCase() === 'REJECTED' || (q.status || '').toUpperCase() === 'EXPIRED';

      return `
        <tr onclick="window.QuotationController.onRowClick(${q.id}, event)" style="cursor:pointer;">
          <td style="font-family:'Space Grotesk', monospace; font-weight:700; color:var(--cyan);">${q.no}</td>
          <td>${formatDate(q.date)}</td>
          <td style="font-weight:600; color:var(--text-main);">${q.customer || '-'}</td>
          <td>${formatDate(q.valid)}</td>
          <td>${getStatusBadge(q.status)}</td>
          <td>${formatDate(q.followUp)}</td>
          <td style="font-family:monospace; color:var(--purple); font-weight:600;">${isConverted ? q.converted : '—'}</td>
          <td style="color:var(--text-muted);">${q.salesperson || '-'}</td>
          <td style="text-align:right; font-weight:700; color:var(--yellow);">${formatMoney(q.amount)}</td>
          <td style="text-align:center;" onclick="event.stopPropagation();">
            <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
              <button class="btn btn-secondary btn-sm" onclick="window.QuotationController.toggleActionMenu(${q.id}, event)" style="padding:2px 8px; font-size:0.75rem; height:26px;">
                Actions ▼
              </button>
              <div id="quote-action-menu-${q.id}" class="action-dropdown-menu" style="display:none; position:absolute; right:0; top:100%; z-index:999; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:190px; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.QuotationController.showDetails(${q.id})"><span style="margin-right:8px;">👁️</span> View Details</div>
                <div class="action-menu-item" onclick="window.QuotationController.showAudit(${q.id}, '${q.no}')"><span style="margin-right:8px;">📜</span> Audit Trail</div>
                <div class="action-menu-item" onclick="window.QuotationController.openQuotationEditor(${q.id})"><span style="margin-right:8px;">✏️</span> Edit Quotation</div>
                <div class="action-menu-item" onclick="window.QuotationController.printPdf('${q.no}')"><span style="margin-right:8px;">🖨️</span> View PDF</div>
                <div class="action-menu-item" onclick="window.QuotationController.downloadExcel('${q.no}')"><span style="margin-right:8px;">📊</span> View / Download Excel</div>
                <div class="action-menu-item" onclick="window.QuotationController.sendEmailPrompt(${q.id}, '${q.no}', '${(q.email || '').replace(/'/g, "\\'")}')"><span style="margin-right:8px;">✉️</span> Send Email</div>
                <div class="action-menu-item" onclick="window.QuotationController.sendWhatsappPrompt(${q.id}, '${q.no}', '${(q.phone || '').replace(/'/g, "\\'")}')"><span style="margin-right:8px;">💬</span> Send WhatsApp</div>
                <div class="action-menu-item" onclick="window.QuotationController.openFollowUpModal(${q.id}, '${q.no}', '${q.followUp || ''}', ${q.rowVersion || 0})"><span style="margin-right:8px;">⏰</span> Create Follow Up</div>
                <div class="action-menu-divider" style="height:1px; background:var(--border-subtle); margin:4px 0;"></div>
                ${!isConverted && !isRejectedExpired ? `
                  <div class="action-menu-item" style="color:var(--green); font-weight:600;" onclick="window.QuotationController.convertToSale(${q.id}, '${q.no}', ${q.rowVersion || 0})">
                    <span style="margin-right:8px;">🚀</span> Convert to Sale
                  </div>
                ` : ''}
                <div class="action-menu-item" onclick="window.QuotationController.duplicate(${q.id}, '${q.no}')"><span style="margin-right:8px;">📋</span> Duplicate</div>
                ${!isAccepted ? `
                  <div class="action-menu-item" style="color:var(--red);" onclick="window.QuotationController.deleteQuotation(${q.id}, '${q.no}', ${q.rowVersion || 0})">
                    <span style="margin-right:8px;">🗑️</span> Delete
                  </div>
                ` : ''}
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function updatePagination(filteredAmount) {
    const infoEl = document.getElementById('quote-pagination-info');
    const prevBtn = document.getElementById('quote-btn-prev');
    const nextBtn = document.getElementById('quote-btn-next');
    if (infoEl) {
      const from = totalRows === 0 ? 0 : (currentPage * pageSize) + 1;
      const to = Math.min((currentPage + 1) * pageSize, totalRows);
      infoEl.innerText = `Showing ${from}–${to} of ${totalRows} • ${formatMoney(filteredAmount)} • Page ${currentPage + 1} of ${Math.max(1, totalPages)}`;
    }
    if (prevBtn) prevBtn.disabled = currentPage <= 0;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;
  }

  function onRowClick(id, event) {
    if (event && event.target && event.target.closest('button, select, input, a, .action-dropdown-menu')) return;
    showDetails(id);
  }

  function toggleActionMenu(id, event) {
    if (event) event.stopPropagation();
    const menuId = 'quote-action-menu-' + id;
    const targetMenu = document.getElementById(menuId);
    document.querySelectorAll('.action-dropdown-menu').forEach(m => {
      if (m !== targetMenu) m.style.display = 'none';
    });
    if (targetMenu) {
      targetMenu.style.display = targetMenu.style.display === 'block' ? 'none' : 'block';
    }
  }

  // 2. SLIDE DRAWER DETAILS
  async function showDetails(id) {
    const drawer = document.getElementById('quote-detail-drawer');
    if (!drawer) return;

    try {
      const q = await window.OperationsService.getQuotation(id);
      selectedQuote = q;

      document.getElementById('qd-no').innerText = q.no;
      document.getElementById('qd-date').innerText = formatDate(q.date);
      document.getElementById('qd-customer').innerText = q.customer || '-';
      document.getElementById('qd-contact').innerText = [q.phone, q.email, q.gstin].filter(Boolean).join('\n') || 'No contact details';
      document.getElementById('qd-amount').innerText = formatMoney(q.amount);
      document.getElementById('qd-discount').innerText = formatMoney(q.discount);
      document.getElementById('qd-valid').innerText = formatDate(q.valid);
      document.getElementById('qd-follow').innerText = formatDate(q.followUp);
      document.getElementById('qd-converted').innerText = q.converted || '—';
      document.getElementById('qd-status').innerHTML = getStatusBadge(q.status);
      document.getElementById('qd-source').innerText = q.source || 'Direct';
      document.getElementById('qd-remarks').innerText = q.remarks || 'None';

      const btnConvert = document.getElementById('qd-btn-convert');
      if (btnConvert) {
        const canConvert = (!q.converted || q.converted.trim() === '') && (q.status || '').toUpperCase() !== 'REJECTED' && (q.status || '').toUpperCase() !== 'EXPIRED';
        btnConvert.style.display = canConvert ? 'inline-flex' : 'none';
      }

      drawer.classList.add('open');
      drawer.style.display = 'flex';
    } catch (e) {
      console.error('Failed to load quotation details:', e);
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to load details: ' + e.message);
    }
  }

  function closeDrawer() {
    const drawer = document.getElementById('quote-detail-drawer');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.style.display = 'none';
    }
    selectedQuote = null;
  }

  // 3. WORKFLOW ACTIONS
  async function convertToSale(id, no, rowVersion) {
    if (!confirm(`Convert Quotation ${no} to an active Sales Invoice and update inventory stock?`)) return;
    try {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      const res = await window.OperationsService.convertQuotation(id, 'Admin', rowVersion);
      const invoiceNo = res?.value || 'Sales Invoice';
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Quotation ${no} converted to Sale ${invoiceNo}!`);
      loadQuotations(currentPage);
      closeDrawer();

      // Navigate to Sales Register and highlight the new sale
      if (window.NavigationRouter && window.NavigationRouter.selectNav) {
        window.NavigationRouter.selectNav('view-sales-register');
        if (window.SalesController) {
          setTimeout(() => {
            window.SalesController.loadSales(0);
            if (window.SalesController.openInvoiceDrawer) {
              window.SalesController.openInvoiceDrawer(invoiceNo);
            }
          }, 350);
        }
      }
    } catch (err) {
      console.error('Convert failed:', err);
      if (window.AppDialogService) {
        window.AppDialogService.toastError('Failed to convert quotation: ' + (err.message || 'Server error'));
      } else {
        alert('Failed to convert quotation: ' + (err.message || 'Server error'));
      }
    }
  }

  async function duplicate(id, no) {
    if (!confirm(`Duplicate Quotation ${no}?`)) return;
    try {
      await window.OperationsService.duplicateQuotation(id, 'Admin');
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Quotation ${no} duplicated successfully!`);
      loadQuotations(0);
    } catch (err) {
      console.error('Duplicate failed:', err);
      alert('Failed to duplicate: ' + (err.message || 'Server error'));
    }
  }

  async function deleteQuotation(id, no, rowVersion) {
    if (!confirm(`Delete Quotation ${no}?`)) return;
    try {
      await window.OperationsService.deleteQuotation(id, rowVersion);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Quotation ${no} deleted successfully.`);
      loadQuotations(currentPage);
      closeDrawer();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete: ' + (err.message || 'Server error'));
    }
  }

  async function printPdf(no) {
    if (!no) return;
    try {
      window.AppDialogService.toastInfo(`Generating official Quotation PDF for ${no}...`);
      await window.ApiService.openPdfPreview('QUOTATION', no);
    } catch (err) {
      window.AppDialogService.toastError(err.message || 'Failed to open Quotation PDF');
    }
  }

  function downloadExcel(no) {
    const url = `/api/documents/render?type=QUOTATION&number=${encodeURIComponent(no)}&format=EXCEL`;
    window.open(url, '_blank');
  }

  function sendEmailPrompt(id, no, recipientEmail) {
    const email = prompt(`Send Quotation ${no} to email address:`, recipientEmail || '');
    if (!email) return;
    window.OperationsService.sendAuthorityEmail({
      recipientEmail: email,
      subject: `Quotation ${no} - Jasvi Industries`,
      body: `Please find attached quotation ${no} from Jasvi Industries.`,
      documentType: 'QUOTATION',
      documentNumber: no
    }).then(() => {
      window.OperationsService.markQuotationSent(id, 'EMAIL', 0);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Quotation emailed to ${email}`);
      loadQuotations(currentPage);
    }).catch(err => {
      if (window.AppDialogService) window.AppDialogService.toastError('Email failed: ' + err.message);
    });
  }

  function sendWhatsappPrompt(id, no, phone) {
    const mobile = prompt(`Send Quotation ${no} via WhatsApp to number (with country code):`, phone || '');
    if (!mobile) return;
    const clean = mobile.replace(/\D/g, '');
    const num = clean.length === 10 ? '91' + clean : clean;
    const msg = encodeURIComponent(`Hello, please find your Quotation ${no} from Jasvi Industries.\n\nDownload: https://erp-uat.jasviindustries.in/api/documents/render?type=QUOTATION&number=${no}&format=PDF`);
    window.OperationsService.markQuotationSent(id, 'WHATSAPP', 0);
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
    loadQuotations(currentPage);
  }

  function openFollowUpModal(id, no, currentFollowUp, rowVersion) {
    const modal = document.getElementById('modal-quote-followup');
    if (!modal) return;
    document.getElementById('qf-id').value = id;
    document.getElementById('qf-row-version').value = rowVersion;
    document.getElementById('qf-title').innerText = `Schedule Follow-Up for ${no}`;
    document.getElementById('qf-date').value = currentFollowUp ? currentFollowUp.substring(0, 10) : new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10);
    document.getElementById('qf-notes').value = `Follow up for ${no}`;
    modal.style.display = 'flex';
  }

  async function submitFollowUp() {
    const id = document.getElementById('qf-id')?.value;
    const rowVersion = document.getElementById('qf-row-version')?.value || 0;
    const date = document.getElementById('qf-date')?.value;
    const notes = document.getElementById('qf-notes')?.value?.trim();

    if (!date) { alert('Follow-up date is required.'); return; }
    try {
      await window.OperationsService.scheduleQuotationFollowUp(id, { date, notes, rowVersion: parseInt(rowVersion) });
      if (window.AppDialogService) window.AppDialogService.toastSuccess('Follow-up scheduled successfully!');
      closeModal('modal-quote-followup');
      loadQuotations(currentPage);
    } catch (err) {
      alert('Failed to schedule follow-up: ' + (err.message || 'Server error'));
    }
  }

  // 4. QUOTATION EDITOR (DESKTOP QuotationEditorController.java PARITY)
  async function openQuotationEditor(quoteId = null) {
    editingQuotationId = quoteId;
    editingRowVersion = 0;
    editorLines = [];

    // Switch to Quotation Editor Workspace View
    window.NavigationRouter.selectNav('view-quotation-editor');

    const titleEl = document.getElementById('qe-title');
    const subtitleEl = document.getElementById('qe-subtitle');
    if (titleEl) titleEl.innerText = quoteId ? 'Edit Quotation' : 'Create Quotation';
    if (subtitleEl) subtitleEl.innerText = quoteId ? 'Modify quotation items and pricing terms' : 'New Proforma quotation with live GST calculations';

    document.getElementById('qe-date').value = new Date().toISOString().substring(0, 10);
    document.getElementById('qe-valid').value = new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10);
    document.getElementById('qe-followup').value = new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10);
    document.getElementById('qe-remarks').value = '';

    // Load bootstrap data (customers & sources)
    await loadEditorBootstrap(quoteId);
  }

  async function loadEditorBootstrap(quoteId) {
    try {
      const data = await window.OperationsService.getQuotationBootstrap(quoteId);
      cachedCustomers = data?.customers || [];
      cachedSources = data?.sources || ['Direct Inquiry', 'Email', 'Phone Call', 'Tender', 'Referral', 'Website'];

      // Populate Customer Dropdown
      const custSelect = document.getElementById('qe-customer-select');
      if (custSelect) {
        custSelect.innerHTML = `<option value="">Select Customer *</option>` +
          cachedCustomers.map(c => `<option value="${c.id}">${c.code ? c.code + ' - ' : ''}${c.name}</option>`).join('');
      }

      // Populate Source Dropdown
      const srcSelect = document.getElementById('qe-source-select');
      if (srcSelect) {
        srcSelect.innerHTML = cachedSources.map(s => `<option value="${s}">${s}</option>`).join('');
      }

      // If editing existing quote, populate fields & lines
      if (data?.quote) {
        const q = data.quote;
        editingRowVersion = q.rowVersion || 0;
        if (custSelect) custSelect.value = q.customerId;
        if (srcSelect && q.source) srcSelect.value = q.source;
        if (q.date) document.getElementById('qe-date').value = q.date.substring(0, 10);
        if (q.valid) document.getElementById('qe-valid').value = q.valid.substring(0, 10);
        if (q.followUp) document.getElementById('qe-followup').value = q.followUp.substring(0, 10);
        if (q.remarks) document.getElementById('qe-remarks').value = q.remarks;

        editorLines = (data.lines || []).map(l => ({
          code: l.code,
          description: l.description,
          category: l.category || '',
          hsn: l.hsn || '',
          unit: l.unit || 'PCS',
          quantity: parseFloat(l.quantity) || 1,
          rate: parseFloat(l.rate) || 0,
          discount: parseFloat(l.discount) || 0,
          gst: parseFloat(l.gst) || 18,
          total: parseFloat(l.total) || 0
        }));
      }

      renderEditorLines();
      recalcEditorTotals();

    } catch (err) {
      console.error('Failed to bootstrap quotation editor:', err);
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to load quotation masters: ' + err.message);
    }
  }

  // Live Item Search in Editor
  let searchTimer = null;
  function onEditorItemSearchInput(query) {
    clearTimeout(searchTimer);
    const box = document.getElementById('qe-item-suggestions');
    if (!query || query.trim().length < 1) {
      if (box) box.style.display = 'none';
      return;
    }
    searchTimer = setTimeout(async () => {
      try {
        const items = await window.OperationsService.searchQuotationItems(query.trim(), 10);
        cachedItems = items || [];
        if (!box) return;
        if (cachedItems.length === 0) {
          box.innerHTML = `<div style="padding:10px; color:var(--text-muted); font-size:0.8rem;">No matching items found</div>`;
        } else {
          box.innerHTML = cachedItems.map((item, idx) => `
            <div class="suggestion-item" onclick="window.QuotationController.selectEditorItem(${idx})" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between; font-size:0.8rem;">
              <div>
                <strong style="color:var(--cyan);">${item.code}</strong> - <span>${item.description}</span>
                <div style="font-size:0.7rem; color:var(--text-muted);">HSN: ${item.hsn || '-'} | Unit: ${item.unit || 'PCS'} | GST: ${item.gst || 18}%</div>
              </div>
              <div style="font-weight:700; color:var(--yellow);">₹ ${(item.rate || 0).toFixed(2)}</div>
            </div>
          `).join('');
        }
        box.style.display = 'block';
      } catch (e) {
        console.error('Item search failed:', e);
      }
    }, 180);
  }

  function selectEditorItem(idx) {
    const item = cachedItems[idx];
    if (!item) return;
    document.getElementById('qe-line-item-search').value = `${item.code} - ${item.description}`;
    document.getElementById('qe-line-code').value = item.code;
    document.getElementById('qe-line-desc').value = item.description;
    document.getElementById('qe-line-hsn').value = item.hsn || '';
    document.getElementById('qe-line-unit').value = item.unit || 'PCS';
    document.getElementById('qe-line-category').value = item.category || '';
    document.getElementById('qe-line-rate').value = item.rate || 0;
    document.getElementById('qe-line-gst').value = item.gst || 18;
    document.getElementById('qe-line-discount').value = item.discount || 0;
    document.getElementById('qe-line-qty').value = 1;

    const box = document.getElementById('qe-item-suggestions');
    if (box) box.style.display = 'none';

    document.getElementById('qe-line-qty')?.focus();
  }

  function addEditorLine() {
    const code = document.getElementById('qe-line-code')?.value?.trim();
    const desc = document.getElementById('qe-line-desc')?.value?.trim() || document.getElementById('qe-line-item-search')?.value?.trim();
    const hsn = document.getElementById('qe-line-hsn')?.value?.trim() || '';
    const unit = document.getElementById('qe-line-unit')?.value?.trim() || 'PCS';
    const category = document.getElementById('qe-line-category')?.value?.trim() || '';
    const qty = parseFloat(document.getElementById('qe-line-qty')?.value) || 0;
    const rate = parseFloat(document.getElementById('qe-line-rate')?.value) || 0;
    const discount = parseFloat(document.getElementById('qe-line-discount')?.value) || 0;
    const gst = parseFloat(document.getElementById('qe-line-gst')?.value) || 0;

    if (!desc) { alert('Please enter or select an item.'); return; }
    if (qty <= 0) { alert('Quantity must be greater than zero.'); return; }
    if (rate < 0) { alert('Rate cannot be negative.'); return; }

    // Line calculation:
    const gross = qty * rate;
    const discAmt = gross * (discount / 100);
    const taxable = gross - discAmt;
    const gstAmt = taxable * (gst / 100);
    const total = Math.round((taxable + gstAmt) * 100) / 100;

    editorLines.push({
      code: code || 'ITEM',
      description: desc,
      category: category,
      hsn: hsn,
      unit: unit,
      quantity: qty,
      rate: rate,
      discount: discount,
      gst: gst,
      total: total
    });

    // Clear line entry inputs
    document.getElementById('qe-line-item-search').value = '';
    document.getElementById('qe-line-code').value = '';
    document.getElementById('qe-line-desc').value = '';
    document.getElementById('qe-line-qty').value = '1';
    document.getElementById('qe-line-rate').value = '0';
    document.getElementById('qe-line-discount').value = '0';
    document.getElementById('qe-line-gst').value = '18';

    renderEditorLines();
    recalcEditorTotals();
    document.getElementById('qe-line-item-search')?.focus();
  }

  function removeEditorLine(idx) {
    editorLines.splice(idx, 1);
    renderEditorLines();
    recalcEditorTotals();
  }

  function renderEditorLines() {
    const tbody = document.getElementById('qe-lines-table-body');
    if (!tbody) return;

    if (editorLines.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:25px; color:var(--text-muted);">No items added yet. Use the search input above to add items.</td></tr>`;
      return;
    }

    tbody.innerHTML = editorLines.map((l, idx) => `
      <tr>
        <td style="font-weight:700; color:var(--text-muted); text-align:center;">${idx + 1}</td>
        <td style="font-weight:600; font-family:monospace; color:var(--cyan);">${l.code}</td>
        <td style="font-weight:600; color:var(--text-main);">${l.description}</td>
        <td>${l.hsn || '-'}</td>
        <td style="text-align:right; font-weight:600;">${l.quantity.toFixed(2)} ${l.unit}</td>
        <td style="text-align:right;">${formatMoney(l.rate)}</td>
        <td style="text-align:right;">${l.discount.toFixed(1)}%</td>
        <td style="text-align:right; color:var(--cyan);">${l.gst.toFixed(1)}%</td>
        <td style="text-align:right; font-weight:700; color:var(--yellow);">${formatMoney(l.total)}</td>
        <td style="text-align:center;">
          <button class="btn btn-secondary btn-sm" onclick="window.QuotationController.removeEditorLine(${idx})" style="padding:2px 6px; color:var(--red);" title="Remove Line">&times;</button>
        </td>
      </tr>
    `).join('');
  }

  function recalcEditorTotals() {
    let gross = 0;
    let discountAmt = 0;
    let gstAmt = 0;

    editorLines.forEach(l => {
      const g = l.quantity * l.rate;
      const d = g * (l.discount / 100);
      const t = g - d;
      const tax = t * (l.gst / 100);
      gross += g;
      discountAmt += d;
      gstAmt += tax;
    });

    const taxable = gross - discountAmt;
    const grandTotal = taxable + gstAmt;

    const subtotalEl = document.getElementById('qe-summary-subtotal');
    const discountEl = document.getElementById('qe-summary-discount');
    const taxableEl = document.getElementById('qe-summary-taxable');
    const gstEl = document.getElementById('qe-summary-gst');
    const totalEl = document.getElementById('qe-summary-total');

    if (subtotalEl) subtotalEl.innerText = formatMoney(gross);
    if (discountEl) discountEl.innerText = '- ' + formatMoney(discountAmt);
    if (taxableEl) taxableEl.innerText = formatMoney(taxable);
    if (gstEl) gstEl.innerText = formatMoney(gstAmt);
    if (totalEl) totalEl.innerText = formatMoney(grandTotal);
  }

  async function saveQuotation() {
    const custSelect = document.getElementById('qe-customer-select');
    const customerId = parseInt(custSelect?.value);
    if (!customerId || isNaN(customerId)) {
      alert('Please select a customer.');
      return;
    }

    const date = document.getElementById('qe-date')?.value;
    const valid = document.getElementById('qe-valid')?.value;
    const followUp = document.getElementById('qe-followup')?.value || '';
    const source = document.getElementById('qe-source-select')?.value || 'Direct Inquiry';
    const remarks = document.getElementById('qe-remarks')?.value?.trim() || '';

    if (!date || !valid) {
      alert('Quotation date and valid-until date are required.');
      return;
    }
    if (valid < date) {
      alert('Valid-until date cannot be before quotation date.');
      return;
    }
    if (editorLines.length === 0) {
      alert('Add at least one item line to save the quotation.');
      return;
    }

    let gross = 0;
    let discountAmt = 0;
    let gstAmt = 0;
    editorLines.forEach(l => {
      const g = l.quantity * l.rate;
      const d = g * (l.discount / 100);
      const t = g - d;
      gross += g;
      discountAmt += d;
      gstAmt += t * (l.gst / 100);
    });
    const taxable = gross - discountAmt;
    const grandTotal = taxable + gstAmt;

    const payload = {
      id: editingQuotationId,
      date: date,
      valid: valid,
      customerId: customerId,
      subtotal: taxable,
      discountAmount: discountAmt,
      gstAmount: gstAmt,
      total: grandTotal,
      remarks: remarks,
      followUp: followUp,
      salesperson: 'Admin',
      source: source,
      createdBy: 'Admin',
      lines: editorLines.map(l => ({
        code: l.code,
        description: l.description,
        category: l.category,
        hsn: l.hsn,
        unit: l.unit,
        quantity: l.quantity,
        rate: l.rate,
        gst: l.gst,
        discount: l.discount,
        total: l.total
      })),
      rowVersion: editingRowVersion
    };

    const btn = document.getElementById('btn-save-quotation');
    if (btn) { btn.disabled = true; btn.innerText = 'Saving Quotation...'; }

    try {
      let saved;
      if (editingQuotationId) {
        saved = await window.OperationsService.updateQuotation(editingQuotationId, payload);
      } else {
        saved = await window.OperationsService.createQuotation(payload);
      }
      const quoteNo = saved?.no || 'Quotation';
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Quotation ${quoteNo} saved successfully!`);

      // Return to Quotation Register
      window.NavigationRouter.selectNav('view-quotations');
      loadQuotations(0);
    } catch (err) {
      console.error('Failed to save quotation:', err);
      alert('Failed to save quotation: ' + (err.message || 'Server error'));
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = 'Save Quotation'; }
    }
  }

  function cancelEditor() {
    window.NavigationRouter.selectNav('view-quotations');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
  }

  return {
    loadQuotations,
    showDetails,
    closeDrawer,
    onRowClick,
    toggleActionMenu,
    convertToSale,
    duplicate,
    deleteQuotation,
    printPdf,
    downloadExcel,
    sendEmailPrompt,
    sendWhatsappPrompt,
    openFollowUpModal,
    submitFollowUp,
    openQuotationEditor,
    openNewQuotationModal() { openQuotationEditor(); },
    onEditorItemSearchInput,
    selectEditorItem,
    addEditorLine,
    removeEditorLine,
    saveQuotation,
    cancelEditor,
    closeModal,
    prevPage() { if (currentPage > 0) loadQuotations(currentPage - 1); },
    nextPage() { if (currentPage < totalPages - 1) loadQuotations(currentPage + 1); },
    resetFilters() {
      const q = document.getElementById('quote-filter-search'); if (q) q.value = '';
      const n = document.getElementById('quote-filter-number'); if (n) n.value = '';
      const c = document.getElementById('quote-filter-customer'); if (c) c.value = '';
      const s = document.getElementById('quote-filter-status'); if (s) s.value = '';
      const f = document.getElementById('quote-filter-from'); if (f) f.value = '';
      const t = document.getElementById('quote-filter-to'); if (t) t.value = '';
      const sp = document.getElementById('quote-filter-salesperson'); if (sp) sp.value = '';
      const fu = document.getElementById('quote-filter-followup'); if (fu) fu.value = '';
      const src = document.getElementById('quote-filter-source'); if (src) src.value = '';
      loadQuotations(0);
    }
  };
})();
