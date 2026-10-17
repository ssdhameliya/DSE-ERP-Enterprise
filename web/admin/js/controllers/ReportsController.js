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

    // 1. MAIN TAB SWITCHING (Dashboard vs Report Center)
    switchMainTab(tabName) {
      activeMainTab = tabName;
      const dashView = document.getElementById('rep-tab-dashboard-view');
      const centerView = document.getElementById('rep-tab-center-view');
      const btnDash = document.getElementById('btn-rep-tab-dashboard');
      const btnCenter = document.getElementById('btn-rep-tab-center');

      if (tabName === 'dashboard') {
        if (dashView) dashView.style.display = 'block';
        if (centerView) centerView.style.display = 'none';

        if (btnDash) {
          btnDash.classList.add('active');
          btnDash.style.background = 'rgba(56,189,248,0.15)';
          btnDash.style.color = 'var(--cyan)';
          btnDash.style.borderColor = 'rgba(56,189,248,0.3)';
        }
        if (btnCenter) {
          btnCenter.classList.remove('active');
          btnCenter.style.background = 'transparent';
          btnCenter.style.color = 'var(--text-muted)';
          btnCenter.style.borderColor = 'transparent';
        }
        this.refreshDashboard();
      } else {
        if (dashView) dashView.style.display = 'none';
        if (centerView) centerView.style.display = 'block';

        if (btnCenter) {
          btnCenter.classList.add('active');
          btnCenter.style.background = 'rgba(56,189,248,0.15)';
          btnCenter.style.color = 'var(--cyan)';
          btnCenter.style.borderColor = 'rgba(56,189,248,0.3)';
        }
        if (btnDash) {
          btnDash.classList.remove('active');
          btnDash.style.background = 'transparent';
          btnDash.style.color = 'var(--text-muted)';
          btnDash.style.borderColor = 'transparent';
        }

        if (!currentResult) {
          this.runCurrentReport();
        }
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
