
/**
 * Jasvi Industries ERP - ReportsController
 * Desktop Parity with org.example.controller.ReportsController & Reports.fxml
 * Full 2-Tab Layout: Interactive Real-Time Dashboard + Custom Report Center
 */
window.ReportsController = (function() {
  let definitions = [];
  let currentReportId = 'sales-register';
  let currentResult = null;
  let activeMainTab = 'dashboard';
  let allSchedules = [];

  const DEFAULT_DEFINITIONS = [
    { id: 'sales-register', title: 'Sales Register Report', category: 'SALES', description: 'Comprehensive sales invoices, taxable value, GST split and customer breakdown' },
    { id: 'purchase-register', title: 'Purchase Register Report', category: 'PURCHASE', description: 'Procurement bills, supplier input tax credit, and payable breakdown' },
    { id: 'profitability-item', title: 'Product Profitability Report', category: 'FINANCE', description: 'Gross profit margins, COGS, selling revenues, and margin percentage' },
    { id: 'receivables-aging', title: 'Accounts Receivables Ageing', category: 'FINANCE', description: 'Customer overdue invoices partitioned into 0-30, 31-60, 61-90, 90+ buckets' },
    { id: 'gst-summary', title: 'GST Liability & ITC Summary', category: 'TAX', description: 'Forward tax liability vs Inward ITC claim for GSTR-3B monthly filing' },
    { id: 'stock-valuation', title: 'Inventory Stock Valuation', category: 'INVENTORY', description: 'Current warehouse stock levels, moving average cost, and physical valuation' }
  ];

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
    } catch {
      return dStr;
    }
  }

  return {
    async init() {
      await this.refreshDashboard();
      await this.loadDefinitions();
      this.populateDefinitionTabs();
    },

    // 1. MAIN TAB SWITCHING (Dashboard vs Report Center vs Scheduled Reports)
    switchMainTab(tabName) {
      activeMainTab = tabName;
      const dashView = document.getElementById('rep-tab-dashboard-view');
      const centerView = document.getElementById('rep-tab-center-view');
      const schView = document.getElementById('rep-tab-scheduler-view');
      const btnDash = document.getElementById('btn-rep-tab-dashboard');
      const btnCenter = document.getElementById('btn-rep-tab-center');
      const btnSch = document.getElementById('btn-rep-tab-scheduler');

      const setBtnActive = (btn, active) => {
        if (!btn) return;
        if (active) {
          btn.classList.add('active');
          btn.style.background = 'rgba(56,189,248,0.15)';
          btn.style.color = 'var(--cyan)';
          btn.style.borderColor = 'rgba(56,189,248,0.3)';
        } else {
          btn.classList.remove('active');
          btn.style.background = 'transparent';
          btn.style.color = 'var(--text-muted)';
          btn.style.borderColor = 'transparent';
        }
      };

      if (dashView) dashView.style.display = tabName === 'dashboard' ? 'block' : 'none';
      if (centerView) centerView.style.display = tabName === 'center' ? 'block' : 'none';
      if (schView) schView.style.display = tabName === 'scheduler' ? 'block' : 'none';

      setBtnActive(btnDash, tabName === 'dashboard');
      setBtnActive(btnCenter, tabName === 'center');
      setBtnActive(btnSch, tabName === 'scheduler');

      if (tabName === 'dashboard') {
        this.refreshDashboard();
      } else if (tabName === 'center') {
        if (!currentResult) {
          this.runCurrentReport();
        }
      } else if (tabName === 'scheduler') {
        this.loadSchedules();
      }
    },

    // 2. LIVE EXECUTIVE DASHBOARD REFRESH
    async refreshDashboard() {
      try {
        let salesList = [];
        let purchasesList = [];
        let itemsList = [];
        let customersList = [];

        // Fetch live sales data
        if (window.OperationsService) {
          const sRes = await window.OperationsService.getSales(0, 100).catch(() => null);
          salesList = Array.isArray(sRes) ? sRes : (sRes?.content || sRes?.rows || sRes?.data || []);
          const pRes = await window.OperationsService.getPurchases(0, 100).catch(() => null);
          purchasesList = Array.isArray(pRes) ? pRes : (pRes?.content || pRes?.rows || pRes?.data || []);
        }

        // Fetch live items & customers
        if (window.MasterService) {
          itemsList = await window.MasterService.getItems(false).catch(() => []);
          customersList = await window.MasterService.getParties('CUSTOMER').catch(() => []);
        }

        // Compute KPIs
        let totalSales = 0;
        let totalReceivables = 0;
        let customerRevenueMap = {};
        salesList.forEach(s => {
          const amt = parseFloat(s.totalAmount || s.total || s.amount || 0);
          const paid = parseFloat(s.paidAmount || (s.paymentStatus === 'PAID' ? amt : 0));
          const balance = Math.max(0, amt - paid);
          totalSales += amt;
          totalReceivables += balance;

          const custName = (s.customer && s.customer.name) || s.customerName || 'Other Customer';
          customerRevenueMap[custName] = (customerRevenueMap[custName] || 0) + amt;
        });

        let totalPurchases = 0;
        let totalPayables = 0;
        purchasesList.forEach(p => {
          const amt = parseFloat(p.totalAmount || p.total || p.amount || 0);
          const paid = parseFloat(p.paidAmount || (p.paymentStatus === 'PAID' ? amt : 0));
          totalPurchases += amt;
          totalPayables += Math.max(0, amt - paid);
        });

        const grossProfit = totalSales - totalPurchases;
        const grossMarginPct = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(2) : '0.00';

        // Stock Valuation & Low stock items
        let stockValuation = 0;
        let lowStockCount = 0;
        (itemsList || []).forEach(item => {
          const qty = parseFloat(item.currentStock || item.stock || 0);
          const price = parseFloat(item.purchasePrice || item.rate || item.unitPrice || 0);
          stockValuation += Math.max(0, qty * price);
          const minStock = parseFloat(item.minimumStock || item.reorderPoint || 0);
          if (qty <= minStock && minStock > 0) lowStockCount++;
        });

        // Update KPI Cards
        const kpiSales = document.getElementById('rep-kpi-sales');
        if (kpiSales) kpiSales.innerText = formatMoney(totalSales);

        const kpiPurchases = document.getElementById('rep-kpi-purchases');
        if (kpiPurchases) kpiPurchases.innerText = formatMoney(totalPurchases);

        const kpiProfit = document.getElementById('rep-kpi-profit');
        if (kpiProfit) {
          kpiProfit.innerText = formatMoney(grossProfit);
          kpiProfit.style.color = grossProfit >= 0 ? 'var(--green)' : 'var(--red)';
        }

        const kpiReceivables = document.getElementById('rep-kpi-receivables');
        if (kpiReceivables) kpiReceivables.innerText = formatMoney(totalReceivables);

        const kpiStock = document.getElementById('rep-kpi-stock');
        if (kpiStock) kpiStock.innerText = formatMoney(stockValuation);

        const kpiLowStock = document.getElementById('rep-kpi-low-stock');
        if (kpiLowStock) kpiLowStock.innerText = `${lowStockCount} items at/below reorder`;

        const kpiCustomers = document.getElementById('rep-kpi-customers');
        if (kpiCustomers) kpiCustomers.innerText = customersList.length || Object.keys(customerRevenueMap).length || 0;

        // Populate Recent Sales Table
        const tblSales = document.getElementById('rep-tbl-sales');
        if (tblSales) {
          const recent5Sales = salesList.slice(0, 5);
          if (recent5Sales.length === 0) {
            tblSales.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--text-dim);">No sales records found.</td></tr>`;
          } else {
            tblSales.innerHTML = recent5Sales.map(s => {
              const status = (s.paymentStatus || 'UNPAID').toUpperCase();
              const badgeClass = status === 'PAID' ? 'pill-success' : (status === 'PARTIAL' ? 'pill-warning' : 'pill-danger');
              return `
                <tr>
                  <td style="font-family:monospace; color:var(--cyan); font-weight:700;">${s.invoiceNo || '-'}</td>
                  <td>${formatDate(s.invoiceDate || s.date)}</td>
                  <td style="font-weight:600;">${(s.customer && s.customer.name) || s.customerName || 'Client'}</td>
                  <td style="text-align:right; font-weight:700; color:var(--yellow);">${formatMoney(s.totalAmount || s.amount || 0)}</td>
                  <td><span class="pill-badge ${badgeClass}">${status}</span></td>
                </tr>
              `;
            }).join('');
          }
        }

        // Populate Recent Purchases Table
        const tblPurchases = document.getElementById('rep-tbl-purchases');
        if (tblPurchases) {
          const recent5Pur = purchasesList.slice(0, 5);
          if (recent5Pur.length === 0) {
            tblPurchases.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--text-dim);">No purchase records found.</td></tr>`;
          } else {
            tblPurchases.innerHTML = recent5Pur.map(p => {
              const status = (p.paymentStatus || 'UNPAID').toUpperCase();
              const badgeClass = status === 'PAID' ? 'pill-success' : (status === 'PARTIAL' ? 'pill-warning' : 'pill-danger');
              return `
                <tr>
                  <td style="font-family:monospace; color:var(--purple); font-weight:700;">${p.invoiceNo || '-'}</td>
                  <td>${formatDate(p.invoiceDate || p.date)}</td>
                  <td style="font-weight:600;">${(p.supplier && p.supplier.name) || p.supplierName || 'Vendor'}</td>
                  <td style="text-align:right; font-weight:700;">${formatMoney(p.totalAmount || p.amount || 0)}</td>
                  <td><span class="pill-badge ${badgeClass}">${status}</span></td>
                </tr>
              `;
            }).join('');
          }
        }

        // Populate Payment Snapshot
        const snapEl = document.getElementById('rep-payment-snapshot');
        if (snapEl) {
          const totalCollected = Math.max(0, totalSales - totalReceivables);
          snapEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-subtle);">
              <span style="color:var(--text-muted);">Collections:</span>
              <span style="font-weight:700; color:var(--green);">${formatMoney(totalCollected)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-subtle);">
              <span style="color:var(--text-muted);">Receivables:</span>
              <span style="font-weight:700; color:var(--red);">${formatMoney(totalReceivables)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:6px 0;">
              <span style="color:var(--text-muted);">Payables:</span>
              <span style="font-weight:700; color:var(--yellow);">${formatMoney(totalPayables)}</span>
            </div>
          `;
        }

        // Populate Top Customers
        const topCustEl = document.getElementById('rep-top-customers');
        if (topCustEl) {
          const sortedCusts = Object.entries(customerRevenueMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
          if (sortedCusts.length === 0) {
            topCustEl.innerHTML = `<div style="color:var(--text-dim);">No customer sales data.</div>`;
          } else {
            topCustEl.innerHTML = sortedCusts.map(([name, rev], idx) => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">
                  <strong style="color:var(--cyan); margin-right:4px;">#${idx+1}</strong> ${name}
                </span>
                <span style="font-weight:700;">${formatMoney(rev)}</span>
              </div>
            `).join('');
          }
        }

        // Populate Top Items
        const topItemsEl = document.getElementById('rep-top-items');
        if (topItemsEl) {
          const top5Items = (itemsList || []).slice(0, 5);
          if (top5Items.length === 0) {
            topItemsEl.innerHTML = `<div style="color:var(--text-dim);">No catalog items.</div>`;
          } else {
            topItemsEl.innerHTML = top5Items.map((item, idx) => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">
                  <strong style="color:var(--yellow); margin-right:4px;">#${idx+1}</strong> ${item.name || item.itemDescription || item.itemCode}
                </span>
                <span style="font-weight:600; color:var(--cyan);">${parseFloat(item.currentStock || item.stock || 0).toFixed(0)} in stock</span>
              </div>
            `).join('');
          }
        }

        // Populate Margin & Health
        const marginVal = document.getElementById('rep-margin-val');
        if (marginVal) marginVal.innerText = `${grossMarginPct}%`;

        const marginBar = document.getElementById('rep-margin-bar');
        if (marginBar) {
          const pctClamped = Math.min(100, Math.max(0, parseFloat(grossMarginPct)));
          marginBar.style.width = `${pctClamped}%`;
          marginBar.style.background = pctClamped >= 20 ? 'var(--green)' : (pctClamped >= 10 ? 'var(--yellow)' : 'var(--red)');
        }

      } catch (err) {
        console.error('Failed to refresh reports dashboard:', err);
      }
    },

    // 3. REPORT CENTER CATALOG & EXECUTION
    async loadDefinitions() {
      try {
        if (window.ReportService) {
          const defs = await window.ReportService.getReportDefinitions();
          definitions = (defs && defs.length > 0) ? defs : DEFAULT_DEFINITIONS;
        } else {
          definitions = DEFAULT_DEFINITIONS;
        }
      } catch {
        definitions = DEFAULT_DEFINITIONS;
      }
    },

    populateDefinitionTabs() {
      const container = document.getElementById('report-definitions-pills');
      if (!container) return;

      container.innerHTML = definitions.map(def => {
        const isActive = def.id === currentReportId;
        return `
          <button class="btn ${isActive ? 'btn-primary' : 'btn-secondary'} btn-sm"
                  onclick="window.ReportsController.switchReport('${def.id}')"
                  style="padding:6px 14px; font-size:0.8rem; font-weight:600;">
            ${def.title}
          </button>
        `;
      }).join('');
    },

    switchReport(reportId) {
      currentReportId = reportId;
      this.populateDefinitionTabs();
      this.runCurrentReport();
    },

    async runCurrentReport() {
      const thead = document.getElementById('report-table-thead');
      const tbody = document.getElementById('report-table-tbody');
      const descEl = document.getElementById('report-active-desc');

      const def = definitions.find(d => d.id === currentReportId) || definitions[0];
      if (descEl) descEl.innerText = def.description;

      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Running ${def.title}...</td></tr>`;
      }

      const req = {
        reportId: currentReportId,
        from: document.getElementById('report-date-from')?.value || '',
        to: document.getElementById('report-date-to')?.value || '',
        search: document.getElementById('report-search-input')?.value || '',
        page: 0,
        size: 50
      };

      try {
        let result = null;
        if (window.ReportService) {
          try {
            result = await window.ReportService.runReport(req);
          } catch {
            result = await this.generateFallbackReport(currentReportId);
          }
        } else {
          result = await this.generateFallbackReport(currentReportId);
        }

        currentResult = result;
        this.renderReport(result);
      } catch (err) {
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--accent-red);">Report execution failed: ${err.message}</td></tr>`;
        }
      }
    },

    renderReport(res) {
      const thead = document.getElementById('report-table-thead');
      const tbody = document.getElementById('report-table-tbody');
      const tfoot = document.getElementById('report-table-tfoot');

      if (!res || !res.columns || !res.rows) return;

      if (thead) {
        thead.innerHTML = `<tr>
          ${res.columns.map(c => `<th style="${c.numeric ? 'text-align:right;' : ''}">${c.label}</th>`).join('')}
        </tr>`;
      }

      if (tbody) {
        if (res.rows.length === 0) {
          tbody.innerHTML = `<tr><td colspan="${res.columns.length}" style="text-align:center; padding:30px; color:var(--text-muted);">No records found for the selected reporting parameters.</td></tr>`;
        } else {
          tbody.innerHTML = res.rows.map(r => {
            return `
              <tr>
                ${r.values.map((v, i) => {
                  const isNum = res.columns[i]?.numeric;
                  return `<td style="${isNum ? 'text-align:right; font-weight:600;' : ''}">${v || '-'}</td>`;
                }).join('')}
              </tr>
            `;
          }).join('');
        }
      }

      if (tfoot && res.totals) {
        tfoot.innerHTML = `<tr style="font-weight:700; background:rgba(0,0,0,0.3); border-top:2px solid var(--border-subtle);">
          ${res.columns.map((c, i) => {
            const tot = res.totals[c.key] || (i === 0 ? 'Total' : '');
            return `<td style="${c.numeric ? 'text-align:right; color:var(--cyan);' : ''}">${tot}</td>`;
          }).join('')}
        </tr>`;
      }
    },

    async generateFallbackReport(reportId) {
      if (reportId === 'sales-register' && window.OperationsService) {
        const salesRes = await window.OperationsService.getSales(0, 500);
        const salesList = Array.isArray(salesRes) ? salesRes : (salesRes?.content || salesRes?.rows || salesRes?.data || []);
        let totalVal = 0, totalTax = 0;
        const rows = salesList.map(s => {
          const amt = parseFloat(s.totalAmount || s.total || 0);
          const tax = parseFloat(s.taxAmount || 0);
          totalVal += amt;
          totalTax += tax;
          return {
            rowKey: s.invoiceNo,
            values: [
              s.invoiceNo,
              s.invoiceDate || '-',
              (s.customer && s.customer.name) || s.customerName || 'Client',
              formatMoney(amt - tax),
              formatMoney(tax),
              formatMoney(amt),
              s.paymentStatus || 'PENDING'
            ]
          };
        });

        return {
          reportId,
          title: 'Sales Register Report',
          columns: [
            { key: 'inv', label: 'INVOICE #', numeric: false },
            { key: 'date', label: 'DATE', numeric: false },
            { key: 'customer', label: 'CUSTOMER', numeric: false },
            { key: 'taxable', label: 'TAXABLE (₹)', numeric: true },
            { key: 'tax', label: 'GST (₹)', numeric: true },
            { key: 'total', label: 'TOTAL (₹)', numeric: true },
            { key: 'status', label: 'STATUS', numeric: false }
          ],
          rows,
          totals: {
            taxable: formatMoney(totalVal - totalTax),
            tax: formatMoney(totalTax),
            total: formatMoney(totalVal)
          }
        };
      }

      return {
        reportId,
        title: 'Report Summary',
        columns: [
          { key: 'code', label: 'REFERENCE', numeric: false },
          { key: 'desc', label: 'DESCRIPTION', numeric: false },
          { key: 'amount', label: 'AMOUNT (₹)', numeric: true }
        ],
        rows: [],
        totals: {}
      };
    },

    // 5. SCHEDULED REPORTS (Desktop ReportSchedulerController.java Parity)
    async loadSchedules() {
      const tbody = document.getElementById('rep-sch-tbody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading scheduled reports...</td></tr>`;

      try {
        const data = await window.ApiService.get('/api/reporting/schedules');
        const summary = (data && data.summary) || {};
        allSchedules = (data && Array.isArray(data.schedules)) ? data.schedules : [];

        const actEl = document.getElementById('rep-sch-kpi-active');
        const nextEl = document.getElementById('rep-sch-kpi-next');
        const nextNameEl = document.getElementById('rep-sch-kpi-next-name');
        const monthEl = document.getElementById('rep-sch-kpi-month');
        const failEl = document.getElementById('rep-sch-kpi-failures');

        if (actEl) actEl.innerText = summary.activeSchedules != null ? summary.activeSchedules : allSchedules.filter(s => s.status === 'ACTIVE').length;
        if (nextEl) nextEl.innerText = summary.nextRun || (allSchedules.find(s => s.status === 'ACTIVE')?.nextRun) || 'None Scheduled';
        if (nextNameEl) nextNameEl.innerText = summary.nextSchedule ? ('Next: ' + summary.nextSchedule) : (allSchedules.length > 0 ? `${allSchedules.length} schedules configured` : 'No upcoming jobs');
        if (monthEl) monthEl.innerText = summary.reportsThisMonth != null ? summary.reportsThisMonth : 0;
        if (failEl) failEl.innerText = summary.failuresLast30Days != null ? summary.failuresLast30Days : 0;

        this.filterSchedules();
      } catch (err) {
        console.warn('Failed to load reporting schedules:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-dim);">No scheduled reports configured yet. Select a Saved Report to configure automated delivery.</td></tr>`;
      }
    },

    filterSchedules() {
      const search = (document.getElementById('rep-sch-search')?.value || '').toLowerCase().trim();
      const status = (document.getElementById('rep-sch-status-filter')?.value || '').toUpperCase().trim();
      const format = (document.getElementById('rep-sch-format-filter')?.value || '').toUpperCase().trim();

      const filtered = allSchedules.filter(s => {
        if (status && (s.status || '').toUpperCase() !== status) return false;
        if (format && (s.format || '').toUpperCase() !== format) return false;
        if (search) {
          const matchStr = `${s.name || ''} ${s.savedReport || ''} ${s.reportTitle || ''} ${s.recipients || ''}`.toLowerCase();
          if (!matchStr.includes(search)) return false;
        }
        return true;
      });

      const tbody = document.getElementById('rep-sch-tbody');
      if (!tbody) return;

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-dim);">No scheduled reports matching the selected filters.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(s => {
        const isActive = (s.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
        const statusBadge = isActive
          ? `<span class="badge badge-paid">ACTIVE</span>`
          : `<span class="badge badge-unpaid">PAUSED</span>`;

        return `
          <tr>
            <td style="color:var(--text-dim); font-size:0.8rem; text-align:center;">#${s.id}</td>
            <td style="font-weight:600; color:var(--text-bright);">${s.name || 'Untitled Schedule'}</td>
            <td><span class="badge badge-neutral" style="font-size:0.75rem;">${s.reportTitle || s.savedReport || 'System Report'}</span></td>
            <td>${s.frequency || 'DAILY'}</td>
            <td>${s.time || '08:00 AM'}</td>
            <td><span style="font-weight:600; color:var(--cyan);">${s.format || 'PDF'}</span></td>
            <td title="${s.recipients || ''}">${s.delivery || 'EMAIL'}</td>
            <td>${s.nextRun || '-'}</td>
            <td>${statusBadge}</td>
            <td style="text-align:center; white-space:nowrap;" onclick="event.stopPropagation();">
              <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
                <button class="btn-purple" onclick="window.ReportsController.toggleScheduleActionMenu(${s.id}, event)" style="padding:3px 10px; font-size:0.74rem; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" title="Schedule Actions">
                  ::: Actions
                </button>
                <div id="sch-action-menu-${s.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:#0b1324; border:1px solid rgba(255,255,255,0.14); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.7); min-width:180px; white-space:nowrap; padding:6px 0; text-align:left;">
                  <div class="action-menu-item" onclick="window.ReportsController.runScheduleNow(${s.id})"><span style="margin-right:8px;">▶</span> Run Now</div>
                  <div class="action-menu-item" onclick="window.ReportsController.toggleScheduleStatus(${s.id}, '${isActive ? 'pause' : 'resume'}')"><span style="margin-right:8px;">${isActive ? '⏸️' : '▶️'}</span> ${isActive ? 'Pause' : 'Resume'}</div>
                  <div class="action-menu-item" onclick="window.ReportsController.duplicateSchedule(${s.id})"><span style="margin-right:8px;">📋</span> Duplicate</div>
                  <div class="action-menu-item" onclick="window.ReportsController.openEditScheduleModal(${s.id})"><span style="margin-right:8px;">✏️</span> Edit Schedule</div>
                  <div class="action-menu-divider" style="height:1px; background:rgba(255,255,255,0.06); margin:4px 0;"></div>
                  <div class="action-menu-item" style="color:var(--accent-red);" onclick="window.ReportsController.deleteSchedule(${s.id})"><span style="margin-right:8px;">🗑️</span> Delete Schedule</div>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    async runScheduleNow(id) {
      try {
        await window.ApiService.post(`/api/reporting/schedules/${id}/run`, {});
        if (window.AppDialogService) window.AppDialogService.toastSuccess('Report schedule triggered successfully on server.');
        await this.loadSchedules();
      } catch (err) {
        alert('Run Error: ' + err.message);
      }
    },

    async toggleScheduleStatus(id, action) {
      try {
        await window.ApiService.post(`/api/reporting/schedules/${id}/${action}`, {});
        if (window.AppDialogService) window.AppDialogService.toastInfo(`Schedule has been ${action === 'pause' ? 'paused' : 'resumed'}.`);
        await this.loadSchedules();
      } catch (err) {
        alert('Action Error: ' + err.message);
      }
    },

    async duplicateSchedule(id) {
      try {
        await window.ApiService.post(`/api/reporting/schedules/${id}/duplicate`, {});
        if (window.AppDialogService) window.AppDialogService.toastSuccess('Schedule duplicated.');
        await this.loadSchedules();
      } catch (err) {
        alert('Duplicate Error: ' + err.message);
      }
    },

    async deleteSchedule(id) {
      if (!confirm('Are you sure you want to delete this scheduled report job?')) return;
      try {
        await window.ApiService.delete(`/api/reporting/schedules/${id}`);
        if (window.AppDialogService) window.AppDialogService.toastSuccess('Schedule deleted.');
        await this.loadSchedules();
      } catch (err) {
        alert('Delete Error: ' + err.message);
      }
    },

    toggleScheduleActionMenu(id, event) {
      if (event) event.stopPropagation();
      const menuId = 'sch-action-menu-' + id;
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
          const btn = event.currentTarget || event.target;
          const rect = btn.getBoundingClientRect();
          const menuWidth = 190;
          let left = rect.right - menuWidth;
          if (left < 10) left = 10;
          const menuHeight = targetMenu.offsetHeight || 160;
          const spaceBelow = window.innerHeight - rect.bottom;
          let top = (spaceBelow < menuHeight && rect.top > menuHeight) ? Math.max(10, rect.top - menuHeight - 4) : (rect.bottom + 4);
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
    },

    openNewScheduleModal() {
      const modal = document.getElementById('modal-new-schedule');
      if (!modal) return;
      const titleEl = document.getElementById('sch-modal-title');
      if (titleEl) titleEl.innerText = 'Create Report Schedule';
      const idEl = document.getElementById('sch-form-id');
      if (idEl) idEl.value = '';
      const nameEl = document.getElementById('sch-form-name');
      if (nameEl) nameEl.value = '';
      const recEl = document.getElementById('sch-form-recipients');
      if (recEl) recEl.value = '';
      const timeEl = document.getElementById('sch-form-time');
      if (timeEl) timeEl.value = '08:00';
      modal.style.display = 'flex';
    },

    openEditScheduleModal(id) {
      const s = allSchedules.find(x => x.id === id);
      if (!s) return;
      const modal = document.getElementById('modal-new-schedule');
      if (!modal) return;
      const titleEl = document.getElementById('sch-modal-title');
      if (titleEl) titleEl.innerText = `Edit Schedule #${id}`;
      const idEl = document.getElementById('sch-form-id');
      if (idEl) idEl.value = id;
      const nameEl = document.getElementById('sch-form-name');
      if (nameEl) nameEl.value = s.name || '';
      const repEl = document.getElementById('sch-form-report');
      if (repEl) repEl.value = s.savedReport || s.reportId || 'sales-register';
      const freqEl = document.getElementById('sch-form-freq');
      if (freqEl) freqEl.value = s.frequency || 'DAILY';
      const timeEl = document.getElementById('sch-form-time');
      if (timeEl) timeEl.value = s.time || '08:00';
      const fmtEl = document.getElementById('sch-form-format');
      if (fmtEl) fmtEl.value = s.format || 'PDF';
      const recEl = document.getElementById('sch-form-recipients');
      if (recEl) recEl.value = s.recipients || '';
      modal.style.display = 'flex';
    },

    closeNewScheduleModal() {
      const modal = document.getElementById('modal-new-schedule');
      if (modal) modal.style.display = 'none';
    },

    async submitSaveSchedule(e) {
      if (e) e.preventDefault();
      const id = document.getElementById('sch-form-id')?.value;
      const name = document.getElementById('sch-form-name')?.value?.trim();
      const report = document.getElementById('sch-form-report')?.value;
      const frequency = document.getElementById('sch-form-freq')?.value;
      const time = document.getElementById('sch-form-time')?.value;
      const format = document.getElementById('sch-form-format')?.value;
      const recipients = document.getElementById('sch-form-recipients')?.value?.trim();

      if (!name) {
        alert('Please enter a schedule name.');
        return;
      }

      const payload = {
        name,
        savedReport: report,
        reportTitle: report,
        frequency,
        time,
        format,
        delivery: 'EMAIL',
        recipients: recipients || 'finance@jasviindustries.in',
        status: 'ACTIVE'
      };

      try {
        if (id) {
          await window.ApiService.put(`/api/reporting/schedules/${id}`, payload);
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Schedule updated successfully!');
        } else {
          await window.ApiService.post('/api/reporting/schedules', payload);
          if (window.AppDialogService) window.AppDialogService.toastSuccess('New report schedule created!');
        }
        this.closeNewScheduleModal();
        await this.loadSchedules();
      } catch (err) {
        alert('Save Error: ' + err.message);
      }
    },

    exportExcel() {
      if (!currentResult || !currentResult.rows || currentResult.rows.length === 0) {
        alert('No data to export.');
        return;
      }

      const headers = currentResult.columns.map(c => c.label).join(',');
      const rows = currentResult.rows.map(r => r.values.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));
      const csvContent = [headers, ...rows].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${currentResult.reportId || 'Report'}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    printReport() {
      window.print();
    }
  };
})();
