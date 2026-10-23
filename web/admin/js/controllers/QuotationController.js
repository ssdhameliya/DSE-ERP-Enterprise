/**
 * Jasvi Industries ERP - QuotationController
 * 100% Desktop Parity with QuotationController.java & QuotationEditorController.java
 * Manages Quotation Register, Pipeline KPIs, Quotation Editor Workspace, Line Calculations, and 1-Click Convert to Sale
 */
window.QuotationController = (function () {
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
  let pendingAttachmentFile = null;
  let existingAttachmentPath = null;
  let attachmentRemovalPending = false;

  function formatMoney(val) {
    const num = parseFloat(val) || 0;
    return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(dStr) {
    if (!dStr) return '-';
    if (window.FormatUtil && window.FormatUtil.formatDate) {
      return window.FormatUtil.formatDate(dStr);
    }
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

  function formatLocalDate(d) {
    if (!d) return '';
    if (window.FormatUtil && typeof window.FormatUtil.formatLocalDate === 'function') {
      return window.FormatUtil.formatLocalDate(d);
    }
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function initDateFilters() {
    const fromEl = document.getElementById('quote-filter-from');
    const toEl = document.getElementById('quote-filter-to');
    if (fromEl && !fromEl.value) {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      fromEl.value = formatLocalDate(sixMonthsAgo);
    }
    if (toEl && !toEl.value) {
      toEl.value = formatLocalDate(new Date());
    }
  }

  // 1. LOAD & RENDER QUOTATIONS REGISTER
  async function loadQuotations(page = 0) {
    initDateFilters();
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
      let data = await window.OperationsService.getQuotationsPage(
        currentPage, pageSize, q, number, customer, status, from, to, '', salesperson, '', '', followUp, source
      );

      if (Array.isArray(data)) {
        data = { rows: data, totalRows: data.length, totalPages: 1 };
      }

      quotationsList = data?.rows || [];
      totalRows = data?.totalRows != null ? data.totalRows : quotationsList.length;
      totalPages = data?.totalPages || 1;

      applyMetrics(data?.metrics);
      populateFilters(data?.customers, data?.salespersons);
      renderTable(quotationsList);
      updatePagination(data?.filteredAmount || 0);

    } catch (err) {
      console.warn('Failed to load paginated quotations, attempting list fallback:', err);
      try {
        const fallbackList = await window.ApiService.get('/api/quotations');
        if (Array.isArray(fallbackList)) {
          quotationsList = fallbackList;
          totalRows = fallbackList.length;
          totalPages = 1;
          renderTable(quotationsList);
          updatePagination(0);
          return;
        }
      } catch (fbErr) {
        console.error('Quotations list fallback error:', fbErr);
      }
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
        <tr onclick="window.QuotationController.onRowClick(${q.id}, event)" style="cursor:pointer;" data-id="${q.id}" data-no="${q.no}" class="${selectedQuote && selectedQuote.id === q.id ? 'active-selected-row' : ''}">
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
              <button class="btn-purple" onclick="window.QuotationController.toggleActionMenu(${q.id}, event)" style="height: 28px; padding: 0 10px; font-size: 0.74rem; font-weight: 600;" title="View Actions Menu">
                ::: Actions
              </button>
              <div id="quote-action-menu-${q.id}" class="action-dropdown-menu" style="display:none; position:absolute; right:0; top:100%; z-index:999; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); min-width:190px; padding:6px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.QuotationController.showDetails(${q.id})"><span style="margin-right:8px;">👁️</span> View Details</div>
                <div class="action-menu-item" onclick="window.QuotationController.showAudit(${q.id}, '${q.no}')"><span style="margin-right:8px;">📜</span> Audit Trail</div>
                <div class="action-menu-item" onclick="window.QuotationController.openQuotationEditor(${q.id})"><span style="margin-right:8px;">✏️</span> Edit Quotation</div>
                <div class="action-menu-item" onclick="window.QuotationController.printPdf('${q.no}')"><span style="margin-right:8px;">🖨️</span> View PDF</div>
                <div class="action-menu-item" onclick="window.QuotationController.downloadExcel('${q.no}')"><span style="margin-right:8px;">📊</span> View / Download Excel</div>
                <div class="action-menu-item" onclick="window.QuotationController.sendEmailPrompt(${q.id}, '${q.no}', '${(q.email || '').replace(/'/g, "\\'")}')"><span style="margin-right:8px;">✉️</span> Send Email</div>
                <div class="action-menu-item" onclick="window.QuotationController.sendWhatsappPrompt(${q.id}, '${q.no}', '${(q.phone || '').replace(/'/g, "\\'")}')"><span style="margin-right:8px;">💬</span> Send WhatsApp</div>
                <div class="action-menu-item" onclick="window.QuotationController.openFollowUpModal(${q.id}, '${q.no}', '${q.followUp || ''}', ${q.rowVersion || 0}, ${isConverted})"><span style="margin-right:8px;">⏰</span> Create Follow Up</div>
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
    if (event && window.RegisterUiSupport && window.RegisterUiSupport.isInteractiveTarget(event.target)) return;
    const drawer = document.getElementById('quote-detail-drawer');
    if (drawer && (drawer.classList.contains('open') || drawer.style.display === 'flex') && selectedQuote && (selectedQuote.id === id || selectedQuote.no === id)) {
      closeDrawer();
      return;
    }
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
      const isShowing = targetMenu.style.display === 'block';
      if (isShowing) {
        targetMenu.style.display = 'none';
      } else {
        targetMenu.style.display = 'block';
        targetMenu.style.position = 'fixed';
        targetMenu.style.zIndex = '100005';
        const btn = event?.currentTarget || event?.target;
        if (btn) {
          const rect = btn.getBoundingClientRect();
          const menuWidth = 200;
          let left = rect.right - menuWidth;
          if (left < 10) left = 10;

          const menuHeight = targetMenu.offsetHeight || 260;
          const spaceBelow = window.innerHeight - rect.bottom;
          let top;
          if (spaceBelow < menuHeight && rect.top > menuHeight) {
            top = Math.max(10, rect.top - menuHeight - 4);
          } else {
            top = rect.bottom + 4;
          }

          targetMenu.style.top = `${top}px`;
          targetMenu.style.left = `${left}px`;

          const closeHandler = (e) => {
            if (!targetMenu.contains(e.target) && e.target !== btn) {
              targetMenu.style.display = 'none';
              document.removeEventListener('click', closeHandler);
            }
          };
          document.addEventListener('click', closeHandler);
        }
      }
    }
  }

  // 2. SLIDE DRAWER DETAILS
  async function showDetails(id) {
    const drawer = document.getElementById('quote-detail-drawer');
    if (!drawer) return;

    // Highlight row
    document.querySelectorAll('#tbl-quotations-body tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    const rows = document.querySelectorAll('#tbl-quotations-body tr');
    rows.forEach(r => {
      const onclickAttr = r.getAttribute('onclick') || '';
      if (onclickAttr.includes(`onRowClick(${id},`) || onclickAttr.includes(`onRowClick(${id})`)) {
        r.classList.add('active-selected-row');
      }
    });

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

      const secAttachment = document.getElementById('qd-attachment-section');
      const lblAttachment = document.getElementById('qd-attachment-name');
      const attPath = q.attachmentPath || q.attachment;
      if (secAttachment && lblAttachment) {
        if (attPath) {
          secAttachment.style.display = 'block';
          lblAttachment.innerText = attPath.split('/').pop().split('\\').pop();
          lblAttachment.title = attPath;
        } else {
          secAttachment.style.display = 'none';
        }
      }

      drawer.classList.add('open');
      drawer.style.display = 'flex';
      if (window.DynamicTableLayoutManager) {
        window.DynamicTableLayoutManager.reflowAllTables();
        setTimeout(() => window.DynamicTableLayoutManager.reflowAllTables(), 50);
      }
    } catch (e) {
      console.error('Failed to load quotation details:', e);
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to load details: ' + e.message);
    }
  }

  function showAudit(id, no) {
    const targetId = id || (selectedQuote ? selectedQuote.id : null);
    const targetNo = no || (selectedQuote ? selectedQuote.no : '');
    if (!targetNo) return;
    if (window.AppDialogService && window.AppDialogService.showActivityTimeline) {
      window.AppDialogService.showActivityTimeline('QUOTATION', targetId, targetNo);
    } else {
      window.AppDialogService.toastInfo(`Audit trail for Quotation ${targetNo}`);
    }
  }

  function closeDrawer() {
    const drawer = document.getElementById('quote-detail-drawer');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.style.display = 'none';
    }
    document.querySelectorAll('#tbl-quotations-body tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    selectedQuote = null;
    if (window.DynamicTableLayoutManager) {
      window.DynamicTableLayoutManager.reflowAllTables();
      setTimeout(() => window.DynamicTableLayoutManager.reflowAllTables(), 50);
    }
  }

  function previewCurrentDrawerAttachment() {
    if (!selectedQuote || !selectedQuote.id) return;
    const fileName = (selectedQuote.attachmentPath || selectedQuote.attachment || 'quotation-attachment').split('/').pop().split('\\').pop();
    if (window.ApiService && window.ApiService.viewFile) {
      window.ApiService.viewFile(`/api/support/documents/QUOTATION/${selectedQuote.id}/attachment-file`, fileName);
    } else {
      window.open(`/api/support/documents/QUOTATION/${selectedQuote.id}/attachment-file`, '_blank');
    }
  }

  function downloadCurrentDrawerAttachment() {
    if (!selectedQuote || !selectedQuote.id) return;
    const fileName = (selectedQuote.attachmentPath || selectedQuote.attachment || 'quotation-attachment').split('/').pop().split('\\').pop();
    if (window.ApiService && window.ApiService.downloadFile) {
      window.ApiService.downloadFile(`/api/support/documents/QUOTATION/${selectedQuote.id}/attachment-file`, fileName);
    } else {
      window.open(`/api/support/documents/QUOTATION/${selectedQuote.id}/attachment-file`, '_blank');
    }
  }

  // Install escape listener once loaded
  if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.RegisterUiSupport) {
        window.RegisterUiSupport.installEscapeClose('quote-detail-drawer', '#tbl-quotations-body', closeDrawer);
      }
    });
  }

  // 3. WORKFLOW ACTIONS
  async function convertToSale(id, no, rowVersion) {
    let confirmed = false;
    const msg = `Convert Quotation ${no} to an active Sales Invoice and update inventory stock?`;
    if (window.AppDialogService && typeof window.AppDialogService.confirm === 'function') {
      confirmed = await window.AppDialogService.confirm('Convert to Sale', 'Generate Sales Invoice', msg, 'Convert to Sale', 'Cancel');
    } else {
      confirmed = confirm(msg);
    }
    if (!confirmed) return;
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

  function openInSaleCreator() {
    if (!selectedQuote) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('No quotation selected.');
      return;
    }
    const quoteToConvert = selectedQuote;
    closeDrawer();
    if (window.SalesController && window.SalesController.openSaleCreatorFromQuotation) {
      window.SalesController.openSaleCreatorFromQuotation(quoteToConvert);
    } else {
      if (window.AppDialogService) window.AppDialogService.toastError('Sale Creator is not available.');
    }
  }

  async function duplicate(id, no) {
    let confirmed = false;
    const msg = `Duplicate Quotation ${no}?`;
    if (window.AppDialogService && typeof window.AppDialogService.confirm === 'function') {
      confirmed = await window.AppDialogService.confirm('Duplicate Quotation', 'Create Duplicate Copy', msg, 'Duplicate', 'Cancel');
    } else {
      confirmed = confirm(msg);
    }
    if (!confirmed) return;
    try {
      await window.OperationsService.duplicateQuotation(id, 'Admin');
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Quotation ${no} duplicated successfully!`);
      loadQuotations(0);
    } catch (err) {
      console.error('Duplicate failed:', err);
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to duplicate: ' + (err.message || 'Server error'));
      else alert('Failed to duplicate: ' + (err.message || 'Server error'));
    }
  }

  async function deleteQuotation(id, no, rowVersion) {
    let confirmed = false;
    const msg = `Delete Quotation ${no}?`;
    if (window.AppDialogService && typeof window.AppDialogService.destructive === 'function') {
      confirmed = await window.AppDialogService.destructive('Delete Quotation', 'Permanent Deletion', msg, 'Delete Quotation', 'Cancel');
    } else {
      confirmed = confirm(msg);
    }
    if (!confirmed) return;
    try {
      await window.OperationsService.deleteQuotation(id, rowVersion);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Quotation ${no} deleted successfully.`);
      loadQuotations(currentPage);
      closeDrawer();
    } catch (err) {
      console.error('Delete failed:', err);
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to delete: ' + (err.message || 'Server error'));
      else alert('Failed to delete: ' + (err.message || 'Server error'));
    }
  }

  function buildQuotationJsPdf(quote, lines) {
    if (!window.jspdf) return null;
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(14, 165, 233);
      doc.text('JASVI INDUSTRIES', 14, 18);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text('Precision Fasteners & Industrial Hardware Solutions', 14, 23);
      doc.text('H-52 Darshan Villa Society, New Naroda, Ahmedabad - 382346, Gujarat', 14, 27);
      doc.text('GSTIN: 24AAACJ1234F1Z1 | State: Gujarat (24)', 14, 31);
      
      // Right Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('QUOTATION ESTIMATE', 196, 18, { align: 'right' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Quote #: ${quote.no || ''}`, 196, 24, { align: 'right' });
      doc.text(`Date: ${formatDate(quote.date)}`, 196, 29, { align: 'right' });
      if (quote.valid) doc.text(`Valid Upto: ${formatDate(quote.valid)}`, 196, 34, { align: 'right' });
      
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 38, 196, 38);
      
      // Customer Box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('QUOTATION TO:', 14, 44);
      doc.setFont('helvetica', 'normal');
      doc.text(quote.customer || 'Customer', 14, 49);
      if (quote.phone) doc.text(`Phone: ${quote.phone}`, 14, 54);
      if (quote.email) doc.text(`Email: ${quote.email}`, 14, 59);
      
      // Table Header
      let y = 66;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text('#', 16, y + 5.5);
      doc.text('Item Description', 24, y + 5.5);
      doc.text('HSN', 90, y + 5.5);
      doc.text('Qty', 115, y + 5.5, { align: 'right' });
      doc.text('Rate', 140, y + 5.5, { align: 'right' });
      doc.text('GST%', 160, y + 5.5, { align: 'right' });
      doc.text('Total', 192, y + 5.5, { align: 'right' });
      
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      
      (lines || []).forEach((l, idx) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        doc.text(String(idx + 1), 16, y);
        doc.text(String(l.description || l.code || '-').substring(0, 36), 24, y);
        doc.text(String(l.hsn || '-'), 90, y);
        doc.text(`${l.quantity || 1} ${l.unit || 'PCS'}`, 115, y, { align: 'right' });
        doc.text(Number(l.rate || 0).toFixed(2), 140, y, { align: 'right' });
        doc.text(`${l.gst || 0}%`, 160, y, { align: 'right' });
        doc.text(Number(l.total || 0).toFixed(2), 192, y, { align: 'right' });
        y += 6;
      });
      
      // Totals
      y += 4;
      doc.line(14, y, 196, y);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Total Quotation Amount:', 140, y, { align: 'right' });
      doc.text(formatMoney(quote.amount || 0), 192, y, { align: 'right' });
      
      // Footer Signatory
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for giving us the opportunity to quote. Quotation subject to standard commercial terms.', 14, 280);
      doc.setFont('helvetica', 'bold');
      doc.text('For, JASVI INDUSTRIES', 196, 275, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text('Authorized Signatory', 196, 282, { align: 'right' });
      
      return doc;
    } catch (e) {
      console.warn('buildQuotationJsPdf error:', e);
      return null;
    }
  }

  function openQuotationPrintModal(quote, lines) {
    const printContainer = document.getElementById('printable-invoice-content') || document.getElementById('printable-invoice-modal');
    const modal = document.getElementById('printable-invoice-modal');
    if (!printContainer || !modal) {
      window.print();
      return;
    }

    const rowsHtml = (lines || []).map((l, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 6px 8px; text-align: left;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-weight: 600;">${l.description || l.code || '-'}</td>
        <td style="padding: 6px 8px; text-align: left;">${l.hsn || '-'}</td>
        <td style="padding: 6px 8px; text-align: right;">${l.quantity || 1} ${l.unit || 'PCS'}</td>
        <td style="padding: 6px 8px; text-align: right;">₹ ${(Number(l.rate) || 0).toFixed(2)}</td>
        <td style="padding: 6px 8px; text-align: right;">${l.discount ? l.discount + '%' : '-'}</td>
        <td style="padding: 6px 8px; text-align: right;">${l.gst ? l.gst + '%' : '-'}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 700;">₹ ${(Number(l.total) || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    printContainer.innerHTML = `
      <div class="tax-invoice-sheet" style="font-family: 'Inter', sans-serif; padding: 24px; color: #111827; background: #fff;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 20px; font-weight: 800; color: #0284c7; letter-spacing: 0.5px;">JASVI INDUSTRIES</div>
            <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">Precision Fasteners, High-Tensile Bolts &amp; Industrial Stainless Steel Piping</div>
            <div style="font-size: 11px; color: #4b5563;">H-52 Darshan Villa Society, New Naroda, Ahmedabad - 382346, Gujarat</div>
            <div style="font-size: 11px; font-weight: 700; margin-top: 2px;">GSTIN: <span style="font-family: monospace;">24AAACJ1234F1Z1</span> | State: Gujarat (24)</div>
          </div>
          <div style="text-align: right;">
            <span style="background: #0284c7; color: #fff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">QUOTATION ESTIMATE</span>
            <div style="font-size: 14px; font-weight: 800; margin-top: 6px; color: #0369a1;">QUOTATION</div>
            <div style="font-size: 12px; font-weight: 700;">Quote #: ${quote.no || ''}</div>
            <div style="font-size: 11px; color: #4b5563;">Date: ${formatDate(quote.date)}</div>
            <div style="font-size: 11px; color: #4b5563;">Valid Upto: ${formatDate(quote.valid)}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px;">
            <div style="font-size: 10px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 4px;">QUOTED TO CUSTOMER</div>
            <div style="font-size: 12px; font-weight: 700; color: #111827;">${quote.customer || 'Customer'}</div>
            <div style="font-size: 11px; color: #4b5563;"><strong>Phone:</strong> ${quote.phone || '-'}</div>
            <div style="font-size: 11px; color: #4b5563;"><strong>Email:</strong> ${quote.email || '-'}</div>
            <div style="font-size: 11px; color: #4b5563;"><strong>Salesperson:</strong> ${quote.salesperson || '-'}</div>
          </div>
          <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px;">
            <div style="font-size: 10px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 4px;">ESTIMATE STATUS &amp; TERMS</div>
            <div style="font-size: 11px; color: #4b5563;"><strong>Status:</strong> ${quote.status || 'DRAFT'}</div>
            <div style="font-size: 11px; color: #4b5563;"><strong>Follow-up Date:</strong> ${formatDate(quote.followUp)}</div>
            <div style="font-size: 11px; color: #4b5563;"><strong>Remarks:</strong> ${quote.remarks || 'Standard warranty and delivery terms apply.'}</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px;">
          <thead>
            <tr style="background: #f3f4f6; border-top: 1px solid #d1d5db; border-bottom: 1px solid #d1d5db;">
              <th style="padding: 6px 8px; text-align: left; width: 30px;">#</th>
              <th style="padding: 6px 8px; text-align: left;">Item Description / Specification</th>
              <th style="padding: 6px 8px; text-align: left; width: 70px;">HSN</th>
              <th style="padding: 6px 8px; text-align: right; width: 60px;">Qty</th>
              <th style="padding: 6px 8px; text-align: right; width: 75px;">Rate (₹)</th>
              <th style="padding: 6px 8px; text-align: right; width: 55px;">Disc%</th>
              <th style="padding: 6px 8px; text-align: right; width: 55px;">GST%</th>
              <th style="padding: 6px 8px; text-align: right; width: 90px;">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="text-align:center; padding:12px; color:#6b7280;">No line items recorded.</td></tr>'}
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
          <div style="min-width: 250px; border-top: 2px solid #0284c7; padding-top: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; color: #0284c7;">
              <span>Total Estimate:</span>
              <span>${formatMoney(quote.amount || 0)}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 28px; padding-top: 14px; border-top: 1px dashed #d1d5db;">
          <div style="font-size: 9px; color: #6b7280;">This is a computer generated quotation estimate. Valid for 30 days.</div>
          <div style="text-align: right;">
            <div style="font-size: 10px; font-weight: 700;">For, JASVI INDUSTRIES</div>
            <div style="margin-top: 36px; font-size: 9px; color: #374151;">Authorized Signatory</div>
          </div>
        </div>

        <div class="no-print" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn btn-secondary" onclick="document.getElementById('printable-invoice-modal').classList.remove('open')">Close Preview</button>
          <button class="btn btn-primary" onclick="window.print()">🖨️ Print Quotation Now</button>
        </div>
      </div>
    `;

    modal.classList.add('open');
  }

  async function printPdf(no) {
    if (!no) return;
    try {
      if (window.AppDialogService) window.AppDialogService.toastInfo(`Preparing Quotation view for ${no}...`);
      if (window.ApiService && typeof window.ApiService.viewDocumentPdf === 'function') {
        try {
          await window.ApiService.viewDocumentPdf('QUOTATION', no);
          return;
        } catch (serverErr) {
          console.warn('[QuotationController] Server PDF view failed, falling back to client generator:', serverErr);
        }
      }

      const quote = quotationsList.find(q => q.no === no) || (selectedQuote && selectedQuote.no === no ? selectedQuote : null);
      let lines = [];
      if (quote && quote.id) {
        try {
          lines = await window.OperationsService.getQuotationLines(quote.id);
        } catch (_) {}
      }
      if (quote && window.DocumentPdfGenerator && typeof window.DocumentPdfGenerator.generateQuotationPdf === 'function') {
        window.DocumentPdfGenerator.generateQuotationPdf(quote, lines, 'preview');
      } else if (quote) {
        openQuotationPrintModal(quote, lines);
      } else {
        window.print();
      }
    } catch (err) {
      console.warn('Could not prepare quotation print view:', err);
      window.print();
    }
  }

  async function downloadExcel(no) {
    if (!no) return;
    try {
      if (window.AppDialogService) window.AppDialogService.toastInfo(`Exporting quotation ${no} to Excel...`);
      if (window.ApiService && typeof window.ApiService.downloadDocumentExcel === 'function') {
        try {
          await window.ApiService.downloadDocumentExcel('QUOTATION', no);
          if (window.AppDialogService) window.AppDialogService.toastSuccess(`Quotation ${no} exported to Excel.`);
          return;
        } catch (serverErr) {
          console.warn('[QuotationController] Server Excel export failed, falling back to client generator:', serverErr);
        }
      }

      // Authoritative client SheetJS export with full line items (fallback)
      const quote = quotationsList.find(q => q.no === no) || (selectedQuote && selectedQuote.no === no ? selectedQuote : null);
      let lines = [];
      if (quote && quote.id) {
        try {
          lines = await window.OperationsService.getQuotationLines(quote.id);
        } catch (_) { }
      }
      if (quote && window.DocumentExcelGenerator && typeof window.DocumentExcelGenerator.generateQuotationWorkbook === 'function') {
        window.DocumentExcelGenerator.generateQuotationWorkbook(quote, lines);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Quotation ${no} exported to Excel.`);
      } else if (window.XLSX && quote) {
        const wsData = [
          ['JASVI INDUSTRIES ERP - QUOTATION ESTIMATE'],
          ['Quotation #:', quote.no || no, 'Date:', formatDate(quote.date) || '', 'Status:', quote.status || 'DRAFT'],
          ['Customer:', quote.customer || '', 'Phone:', quote.phone || '', 'Email:', quote.email || ''],
          ['Salesperson:', quote.salesperson || '', 'Valid Until:', formatDate(quote.valid) || '', 'Follow-Up:', formatDate(quote.followUp) || ''],
          [],
          ['#', 'Item Code', 'Description', 'HSN', 'Qty', 'Unit', 'Rate (₹)', 'Disc %', 'GST %', 'Line Total (₹)']
        ];
        if (lines && lines.length > 0) {
          lines.forEach((l, idx) => {
            wsData.push([
              idx + 1,
              l.code || '',
              l.description || '',
              l.hsn || '',
              l.quantity || 1,
              l.unit || 'PCS',
              l.rate || 0,
              l.discount || 0,
              l.gst || 0,
              l.total || 0
            ]);
          });
        }
        wsData.push([]);
        wsData.push(['', '', '', '', '', '', '', '', 'Total Amount:', quote.amount || 0]);
        if (quote.remarks) wsData.push(['Remarks:', quote.remarks]);

        const wb = window.XLSX.utils.book_new();
        const ws = window.XLSX.utils.aoa_to_sheet(wsData);
        window.XLSX.utils.book_append_sheet(wb, ws, 'Quotation');
        window.XLSX.writeFile(wb, `Quotation_${no}.xlsx`);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Quotation ${no} exported to Excel.`);
      } else {
        throw new Error('Excel spreadsheet generator unavailable');
      }
    } catch (err) {
      console.error('Quotation downloadExcel error:', err);
      if (window.AppDialogService) window.AppDialogService.toastError('Failed to export Excel: ' + (err.message || 'Error'));
    }
  }

  function exportRegisterExcel() {
    if (!quotationsList || quotationsList.length === 0) {
      if (window.AppDialogService) window.AppDialogService.toastWarning('No quotations found to export.');
      return;
    }
    const headers = ['Quotation #', 'Date', 'Customer', 'Valid Upto', 'Status', 'Follow Up', 'Converted To', 'Salesperson', 'Amount (₹)'];
    const rows = quotationsList.map(q => [
      q.no, formatDate(q.date), q.customer, formatDate(q.valid), q.status, formatDate(q.followUp), q.converted || '—', q.salesperson || '', q.amount || 0
    ]);
    if (window.DocumentExcelGenerator && typeof window.DocumentExcelGenerator.generateRegisterWorkbook === 'function') {
      window.DocumentExcelGenerator.generateRegisterWorkbook(rows, 'Quotation Register', headers, 'Quotation_Register');
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Exported ${quotationsList.length} quotations to Excel.`);
    } else if (window.XLSX) {
      const ws = window.XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Quotation Register');
      window.XLSX.writeFile(wb, `Quotation_Register_${new Date().toISOString().substring(0, 10)}.xlsx`);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Exported ${quotationsList.length} quotations to Excel.`);
    }
  }

  function exportRegisterPdf() {
    window.print();
  }

  async function sendEmailPrompt(id, no, recipientEmail) {
    const quote = quotationsList.find(q => q.no === no || q.id === id) || (selectedQuote && (selectedQuote.no === no || selectedQuote.id === id) ? selectedQuote : null) || { id, no, quotationNo: no, customerEmail: recipientEmail };
    if (window.SalesController && typeof window.SalesController.openEmailModal === 'function') {
      window.SalesController.openEmailModal(no, 'QUOTATION', quote);
      return;
    }
    const email = prompt(`Send Quotation ${no} to email address:`, recipientEmail || '');
    if (!email) return;
    if (window.AppDialogService) window.AppDialogService.toastInfo(`Preparing and sending quotation email to ${email}...`);

    let attachmentBase64 = null;
    try {
      if (window.ApiService && typeof window.ApiService.fetchDocumentBlob === 'function') {
        const blob = await window.ApiService.fetchDocumentBlob('QUOTATION', no, 'PDF');
        attachmentBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result;
            const b64 = dataUrl.split(',')[1];
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (serverBlobErr) {
      console.warn('[QuotationController] Server PDF fetch for email failed, trying client generator:', serverBlobErr);
    }

    if (!attachmentBase64) {
      const quote = quotationsList.find(q => q.no === no || q.id === id) || (selectedQuote && (selectedQuote.no === no || selectedQuote.id === id) ? selectedQuote : null);
      let lines = [];
      if (quote && quote.id) {
        try {
          lines = await window.OperationsService.getQuotationLines(quote.id);
        } catch (_) {}
      }
      if (quote && window.DocumentPdfGenerator && typeof window.DocumentPdfGenerator.generateQuotationPdf === 'function') {
        try {
          attachmentBase64 = window.DocumentPdfGenerator.generateQuotationPdf(quote, lines, 'base64');
        } catch (e) {
          console.warn('Could not generate client quotation attachment PDF:', e);
        }
      } else if (quote && window.jspdf) {
        try {
          const doc = buildQuotationJsPdf(quote, lines);
          if (doc) {
            const dataUri = doc.output('datauristring');
            attachmentBase64 = dataUri.split(',')[1];
          }
        } catch (e) {
          console.warn('Could not generate quotation attachment PDF:', e);
        }
      }
    }

    window.OperationsService.sendAuthorityEmail({
      recipient: email,
      recipientEmail: email,
      subject: `Quotation ${no} - Jasvi Industries`,
      body: `Dear Customer,\n\nPlease find attached Quotation ${no} from Jasvi Industries.\n\nThank you for giving us the opportunity to quote.\n\nBest regards,\nJasvi Industries ERP Studio`,
      documentType: 'QUOTATION',
      documentNumber: no,
      attachmentName: `Quotation_${no.replace(/[^A-Za-z0-9]/g, '_')}.pdf`,
      attachmentBase64: attachmentBase64
    }).then(() => {
      window.OperationsService.markQuotationSent(id, 'EMAIL', 0);
      if (window.AppDialogService) window.AppDialogService.toastSuccess(`Quotation emailed to ${email}`);
      loadQuotations(currentPage);
    }).catch(err => {
      console.error('Email error:', err);
      let errMsg = err.message || 'Server error';
      if (errMsg.includes('temporarily unavailable') || errMsg.includes('SMTP')) {
        errMsg = 'Email delivery unavailable: SMTP Mail Gateway is not configured. Please configure SMTP in Settings Studio.';
      }
      if (window.AppDialogService) window.AppDialogService.toastError(errMsg);
      else alert(errMsg);
    });
  }

  async function sendWhatsappPrompt(id, no, phone) {
    let mobile = null;
    const promptMsg = `Send Quotation ${no} via WhatsApp to number (with country code):`;
    if (window.AppDialogService && typeof window.AppDialogService.prompt === 'function') {
      mobile = await window.AppDialogService.prompt('WhatsApp Quotation', `Quotation • ${no}`, promptMsg, phone || '', '+91 9999999999');
    } else {
      mobile = prompt(promptMsg, phone || '');
    }
    if (!mobile) return;
    const clean = mobile.replace(/\D/g, '');
    const num = clean.length === 10 ? '91' + clean : clean;
    const msg = encodeURIComponent(`Hello, please find your Quotation ${no} from Jasvi Industries.\n\nDownload: https://erp-uat.jasviindustries.in/api/documents/render?type=QUOTATION&number=${no}&format=PDF`);
    window.OperationsService.markQuotationSent(id, 'WHATSAPP', 0);
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
    loadQuotations(currentPage);
  }

  function openFollowUpModal(id, no, currentFollowUp, rowVersion, isConverted = false) {
    if (isConverted) {
      if (window.AppDialogService) {
        window.AppDialogService.toastWarning('Converted quotations are read-only. Duplicate the quotation if a new follow-up/revision is required.');
      } else {
        alert('Converted quotations are read-only. Duplicate the quotation if a new follow-up/revision is required.');
      }
      return;
    }
    const modal = document.getElementById('modal-quote-followup');
    if (!modal) return;
    document.getElementById('qf-id').value = id;
    document.getElementById('qf-row-version').value = rowVersion;
    document.getElementById('qf-title').innerText = `Schedule Follow-Up for ${no}`;
    document.getElementById('qf-date').value = currentFollowUp ? currentFollowUp.substring(0, 10) : formatLocalDate(new Date(Date.now() + 7 * 86400000));
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

    // Switch to Quotation Editor Workspace View and await view mount
    if (window.NavigationRouter && window.NavigationRouter.selectNav) {
      await window.NavigationRouter.selectNav('view-quotation-editor');
    }

    const titleEl = document.getElementById('qe-title');
    const subtitleEl = document.getElementById('qe-subtitle');
    if (titleEl) titleEl.innerText = quoteId ? 'Edit Quotation' : 'Create Quotation';
    if (subtitleEl) subtitleEl.innerText = quoteId ? 'Modify quotation items and pricing terms' : 'New Proforma quotation with live GST calculations';

    const dateEl = document.getElementById('qe-date');
    if (dateEl) dateEl.value = formatLocalDate(new Date());
    const validEl = document.getElementById('qe-valid');
    if (validEl) validEl.value = formatLocalDate(new Date(Date.now() + 30 * 86400000));
    const followupEl = document.getElementById('qe-followup');
    if (followupEl) followupEl.value = formatLocalDate(new Date(Date.now() + 7 * 86400000));
    const remarksEl = document.getElementById('qe-remarks');
    if (remarksEl) remarksEl.value = '';

    pendingAttachmentFile = null;
    existingAttachmentPath = null;
    attachmentRemovalPending = false;
    const fileInp = document.getElementById('qe-attachment-file-input');
    if (fileInp) fileInp.value = '';
    refreshAttachmentUi(null);

    // Load bootstrap data (customers & sources)
    await loadEditorBootstrap(quoteId);
  }

  async function loadEditorBootstrap(quoteId) {
    try {
      let data = null;
      try {
        if (window.OperationsService && window.OperationsService.getQuotationBootstrap) {
          data = await window.OperationsService.getQuotationBootstrap(quoteId);
        }
      } catch (e) {
        console.warn('OperationsService.getQuotationBootstrap failed, falling back:', e);
      }

      cachedCustomers = (data && data.customers && data.customers.length > 0) ? data.customers : [];
      if (cachedCustomers.length === 0 && window.MasterService && window.MasterService.getParties) {
        try {
          const custParties = await window.MasterService.getParties('CUSTOMER');
          if (Array.isArray(custParties) && custParties.length > 0) {
            cachedCustomers = custParties;
          }
        } catch (e) {
          console.warn('MasterService.getParties fallback failed:', e);
        }
      }

      cachedSources = (data && data.sources && data.sources.length > 0) ? data.sources : ['Direct Inquiry', 'Email', 'Phone Call', 'Tender', 'Referral', 'Website'];

      // Populate Customer Dropdown
      const custSelect = document.getElementById('qe-customer-select');
      if (custSelect) {
        custSelect.innerHTML = `<option value="">Select Customer *</option>` +
          cachedCustomers.map(c => {
            const val = c.id != null ? c.id : (c.partyId != null ? c.partyId : (c.code || c.partyCode || ''));
            const code = c.code || c.partyCode;
            const name = c.name || c.partyName || '';
            return `<option value="${val}">${code ? code + ' - ' : ''}${name}</option>`;
          }).join('');
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
        const dEl = document.getElementById('qe-date');
        if (dEl && q.date) dEl.value = q.date.substring(0, 10);
        const vEl = document.getElementById('qe-valid');
        if (vEl && q.valid) vEl.value = q.valid.substring(0, 10);
        const fEl = document.getElementById('qe-followup');
        if (fEl && q.followUp) fEl.value = q.followUp.substring(0, 10);
        const rEl = document.getElementById('qe-remarks');
        if (rEl && q.remarks) rEl.value = q.remarks;

        existingAttachmentPath = q.attachmentPath || q.attachment || null;
        if (existingAttachmentPath) {
          refreshAttachmentUi(existingAttachmentPath);
        }

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

      // Handle binary attachment upload/delete
      const targetId = (saved && saved.id) || editingQuotationId;
      const targetRowVersion = (saved && typeof saved.rowVersion === 'number') ? saved.rowVersion : editingRowVersion;

      if (targetId) {
        if (pendingAttachmentFile) {
          try {
            const arrayBuf = await pendingAttachmentFile.arrayBuffer();
            await window.ApiService.uploadBinary(
              `/api/support/documents/QUOTATION/${targetId}/attachment-file?rowVersion=${targetRowVersion}`,
              pendingAttachmentFile.name,
              arrayBuf
            );
          } catch (attErr) {
            console.warn('Failed to upload quotation attachment binary:', attErr);
          }
        } else if (attachmentRemovalPending) {
          try {
            await window.ApiService.delete(
              `/api/support/documents/QUOTATION/${targetId}/attachment-file?rowVersion=${targetRowVersion}`
            );
          } catch (delErr) {
            console.warn('Failed to remove quotation attachment:', delErr);
          }
        }
      }

      const quoteNo = saved?.no || 'Quotation';
      if (window.NotificationService) {
        window.NotificationService.notifyQuotation(quoteNo, payload.customerName || 'Customer', payload.grandTotal || 0);
      }
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

  function refreshAttachmentUi(fileName, fileSize) {
    const badge = document.getElementById('qe-attachment-badge');
    const nameEl = document.getElementById('qe-attachment-name');
    const sizeEl = document.getElementById('qe-attachment-size');
    const btnPreview = document.getElementById('qe-btn-attach-preview');
    const btnRemove = document.getElementById('qe-btn-attach-remove');

    if (fileName) {
      const displayName = typeof fileName === 'string' ? fileName.split('/').pop().split('\\').pop() : 'Attached Document';
      if (badge) badge.style.display = 'inline-block';
      if (nameEl) {
        nameEl.innerText = displayName;
        nameEl.style.color = '#c084fc';
      }
      if (sizeEl) {
        if (fileSize && typeof fileSize === 'number') {
          const kb = (fileSize / 1024).toFixed(1);
          sizeEl.innerText = `${kb} KB`;
        } else {
          sizeEl.innerText = 'Document attached';
        }
      }
      if (btnPreview) btnPreview.disabled = false;
      if (btnRemove) btnRemove.disabled = false;
    } else {
      if (badge) badge.style.display = 'none';
      if (nameEl) {
        nameEl.innerText = 'No document attached';
        nameEl.style.color = '#cbd5e1';
      }
      if (sizeEl) sizeEl.innerText = 'PDF, DOC, XLS, PNG, JPG';
      if (btnPreview) btnPreview.disabled = true;
      if (btnRemove) btnRemove.disabled = true;
    }
  }

  return {
    loadQuotations,
    showDetails,
    showAudit,
    closeDrawer,
    onRowClick,
    toggleActionMenu,
    convertToSale,
    openInSaleCreator,
    get selectedQuote() { return selectedQuote; },
    duplicate,
    deleteQuotation,
    printPdf,
    downloadExcel,
    exportRegisterExcel,
    exportRegisterPdf,
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
    handleAttachmentFileSelected(inputEl) {
      if (inputEl.files && inputEl.files[0]) {
        pendingAttachmentFile = inputEl.files[0];
        attachmentRemovalPending = false;
        refreshAttachmentUi(pendingAttachmentFile.name, pendingAttachmentFile.size);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Attached ${pendingAttachmentFile.name}`);
      }
    },
    previewEditorAttachment() {
      if (pendingAttachmentFile) {
        const url = URL.createObjectURL(pendingAttachmentFile);
        window.open(url, '_blank');
        return;
      }
      const path = existingAttachmentPath || (selectedQuote && (selectedQuote.attachmentPath || selectedQuote.attachment));
      const targetId = editingQuotationId || (selectedQuote && selectedQuote.id);
      if (path && targetId) {
        const filename = typeof path === 'string' ? path.split('/').pop().split('\\').pop() : 'quotation-attachment';
        if (window.ApiService && window.ApiService.viewFile) {
          window.ApiService.viewFile(`/api/support/documents/QUOTATION/${targetId}/attachment-file`, filename);
        } else {
          window.open(`/api/support/documents/QUOTATION/${targetId}/attachment-file`, '_blank');
        }
        return;
      }
      if (window.AppDialogService) window.AppDialogService.toastWarning('No attachment file available to preview');
    },
    removeEditorAttachment() {
      pendingAttachmentFile = null;
      attachmentRemovalPending = true;
      const fileInput = document.getElementById('qe-attachment-file-input');
      if (fileInput) fileInput.value = '';
      refreshAttachmentUi(null);
      if (window.AppDialogService) window.AppDialogService.toastInfo('Attachment removed');
    },
    refreshAttachmentUi,
    previewCurrentDrawerAttachment,
    downloadCurrentDrawerAttachment,
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
      initDateFilters();
      loadQuotations(0);
    },
    initDateFilters,
    openQuotationView: showDetails,
    openDrawer: showDetails
  };
})();
