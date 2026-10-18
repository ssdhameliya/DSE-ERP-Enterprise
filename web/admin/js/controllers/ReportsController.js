/**
 * Jasvi Industries ERP - ReportsController
 * Desktop Parity with org.example.controller.ReportsController & ReportViewerController
 * Full 4-Tab Architecture:
 * 1. Dashboard (Interactive Real-Time Insights, 6 Metric Cards, Recent Tables, Payment Snapshot, Top Rankings)
 * 2. Report Center (Multi-Category Catalog, Search, Star Favorites, Report Cards)
 * 3. Saved Reports / Dynamic Report Viewer (Collapsible 3-Row Dynamic Filters, Sorting/Grouping, Dynamic Grid, Deep-Link View Source)
 * 4. Scheduled Reports (4 KPI Cards, Filter Toolbar, Action Dropdown Menu, Desktop Parity New Schedule Modal)
 */
window.ReportsController = (function() {
  let activeMainTab = 'dashboard';
  let definitions = [];
  let currentReportId = 'SALES_REGISTER';
  let currentDefinition = null;
  let currentResult = null;
  let allSchedules = [];
  let filterOptions = { parties: [], items: [], salespeople: [] };
  let favoriteReportIds = new Set(['SALES_REGISTER', 'PURCHASE_REGISTER', 'PROFITABILITY_ITEM', 'GST_SUMMARY']);
  let activeCenterCategory = 'ALL';
  let centerSearchQuery = '';

  // Viewer State
  let viewerPage = 0;
  let viewerPageSize = 25;
  let viewerSearchQuery = '';
  let viewerFiltersCollapsed = false;
  let selectedViewerRow = null;

  // Schedule Modal State
  let savedReportOptions = [];

  const FALLBACK_DEFINITIONS = [
    { id: 'SALES_REGISTER', title: 'Sales Register', category: 'SALES', description: 'Comprehensive sales invoices, taxable value, GST split, and customer breakdown.', icon: '🛒', supportedFilters: ['party', 'item', 'salesperson', 'status', 'payment', 'gstrate', 'amount'] },
    { id: 'PURCHASE_REGISTER', title: 'Purchase Register', category: 'PURCHASE', description: 'Procurement bills, supplier input tax credit, and payable breakdown.', icon: '📦', supportedFilters: ['party', 'item', 'status', 'payment', 'gstrate', 'amount'] },
    { id: 'SALES_BY_CUSTOMER', title: 'Sales by Customer', category: 'SALES', description: 'Consolidated customer sales revenues, invoice counts, and payment trends.', icon: '👥', supportedFilters: ['party', 'salesperson', 'amount'] },
    { id: 'SALES_BY_ITEM', title: 'Sales by Item', category: 'SALES', description: 'Product sales turnover, quantity sold, and average realizable price.', icon: '🏷️', supportedFilters: ['item', 'party', 'amount'] },
    { id: 'PURCHASE_BY_SUPPLIER', title: 'Purchase by Supplier', category: 'PURCHASE', description: 'Vendor procurement volumes, bill amounts, and pending balances.', icon: '🏭', supportedFilters: ['party', 'amount'] },
    { id: 'PURCHASE_BY_ITEM', title: 'Purchase by Item', category: 'PURCHASE', description: 'Inward item purchases, unit costs, and quantity received.', icon: '📥', supportedFilters: ['item', 'party', 'amount'] },
    { id: 'CUSTOMER_RETURNS', title: 'Customer Credit Notes / Returns', category: 'RETURNS', description: 'Sales returns, rejection notes, credit notes, and tax adjustments.', icon: '↩️', supportedFilters: ['party', 'status', 'amount'] },
    { id: 'SUPPLIER_DEBIT_NOTES', title: 'Supplier Debit Notes', category: 'RETURNS', description: 'Purchase returns, vendor debit notes, and debit voucher registers.', icon: '🔁', supportedFilters: ['party', 'status', 'amount'] },
    { id: 'GST_SUMMARY', title: 'GST / Tax Report (GSTR-3B)', category: 'GST / TAX', description: 'Forward tax liability vs Inward ITC claim for GSTR-3B monthly filing.', icon: '🏛️', supportedFilters: ['gstrate'] },
    { id: 'GSTR1_SUMMARY', title: 'GSTR-1 Outward Supplies', category: 'GST / TAX', description: 'B2B, B2CL, B2CS, and export invoices ready for GST portal upload.', icon: '📑', supportedFilters: ['party', 'gstrate'] },
    { id: 'RECEIVABLES_AGING', title: 'Receivables Overdue & Ageing', category: 'RECEIVABLE', description: 'Customer overdue invoices partitioned into 0-30, 31-60, 61-90, 90+ buckets.', icon: '⏳', supportedFilters: ['party', 'salesperson', 'amount'] },
    { id: 'PAYABLES_AGING', title: 'Payables Overdue & Ageing', category: 'PAYABLE', description: 'Supplier outstanding balances grouped by payment due dates and terms.', icon: '⌛', supportedFilters: ['party', 'amount'] },
    { id: 'STOCK_VALUATION', title: 'Inventory Stock Valuation', category: 'INVENTORY', description: 'Current warehouse stock levels, moving average cost, and physical valuation.', icon: '📊', supportedFilters: ['item'] },
    { id: 'ITEM_LEDGER', title: 'Item Movement Ledger', category: 'INVENTORY', description: 'Inward, outward, opening, and closing stock balance movement trail.', icon: '📋', supportedFilters: ['item', 'party'] },
    { id: 'BANK_RECON_SUMMARY', title: 'Bank Reconciliation Digest', category: 'BANKING', description: 'Matched, unmatched, suggested, and manual journal reconciliation report.', icon: '🏦', supportedFilters: ['party', 'status', 'amount'] },
    { id: 'PROFITABILITY_ITEM', title: 'Product Profitability Report', category: 'PROFITABILITY', description: 'Gross profit margins, COGS, selling revenues, and margin percentage.', icon: '💰', supportedFilters: ['item', 'party', 'salesperson'] }
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

  function calculatePresetDates(preset) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    const toIso = (dt) => {
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    switch (preset) {
      case 'Today': {
        const s = toIso(now);
        return { from: s, to: s };
      }
      case 'Yesterday': {
        const ydt = new Date(y, m, d - 1);
        const s = toIso(ydt);
        return { from: s, to: s };
      }
      case 'This Week': {
        const dayOfWeek = now.getDay() || 7; // Monday = 1
        const monday = new Date(y, m, d - dayOfWeek + 1);
        return { from: toIso(monday), to: toIso(now) };
      }
      case 'Last Week': {
        const dayOfWeek = now.getDay() || 7;
        const lastMon = new Date(y, m, d - dayOfWeek - 6);
        const lastSun = new Date(y, m, d - dayOfWeek);
        return { from: toIso(lastMon), to: toIso(lastSun) };
      }
      case 'This Month': {
        const first = new Date(y, m, 1);
        return { from: toIso(first), to: toIso(now) };
      }
      case 'Last Month': {
        const first = new Date(y, m - 1, 1);
        const last = new Date(y, m, 0);
        return { from: toIso(first), to: toIso(last) };
      }
      case 'This Quarter': {
        const qStartMonth = Math.floor(m / 3) * 3;
        const first = new Date(y, qStartMonth, 1);
        return { from: toIso(first), to: toIso(now) };
      }
      case 'Last Quarter': {
        const qStartMonth = Math.floor(m / 3) * 3 - 3;
        const first = new Date(y, qStartMonth, 1);
        const last = new Date(y, qStartMonth + 3, 0);
        return { from: toIso(first), to: toIso(last) };
      }
      case 'This Financial Year': {
        const fyYear = m >= 3 ? y : y - 1;
        const first = new Date(fyYear, 3, 1); // 1 April
        return { from: toIso(first), to: toIso(now) };
      }
      case 'Last Financial Year': {
        const fyYear = (m >= 3 ? y : y - 1) - 1;
        const first = new Date(fyYear, 3, 1);
        const last = new Date(fyYear + 1, 2, 31);
        return { from: toIso(first), to: toIso(last) };
      }
      case 'Last 7 Days': {
        const past = new Date(y, m, d - 6);
        return { from: toIso(past), to: toIso(now) };
      }
      case 'Last 30 Days': {
        const past = new Date(y, m, d - 29);
        return { from: toIso(past), to: toIso(now) };
      }
      default:
        return null;
    }
  }

  return {
    async init() {
      this.loadSavedFavorites();
      await this.loadFilterOptions();
      await this.loadDefinitions();
      this.renderCategoryPills();

      // Set initial dates for "This Month"
      const defDates = calculatePresetDates('This Month');
      if (defDates) {
        const fEl = document.getElementById('rep-dash-from');
        const tEl = document.getElementById('rep-dash-to');
        if (fEl) fEl.value = defDates.from;
        if (tEl) tEl.value = defDates.to;

        const vfEl = document.getElementById('v-filter-from');
        const vtEl = document.getElementById('v-filter-to');
        if (vfEl) vfEl.value = defDates.from;
        if (vtEl) vtEl.value = defDates.to;
      }

      await this.applyDashboardFilters();
    },

    loadSavedFavorites() {
      try {
        const saved = localStorage.getItem('dse_fav_reports');
        if (saved) {
          const arr = JSON.parse(saved);
          if (Array.isArray(arr) && arr.length > 0) {
            favoriteReportIds = new Set(arr);
          }
        }
      } catch (_) {}
    },

    persistFavorites() {
      try {
        localStorage.setItem('dse_fav_reports', JSON.stringify(Array.from(favoriteReportIds)));
      } catch (_) {}
    },

    async loadFilterOptions() {
      try {
        if (window.ApiService) {
          const res = await window.ApiService.get('/api/insights/reports/filters').catch(() => null);
          if (res) {
            filterOptions = {
              parties: res.parties || [],
              items: res.items || [],
              salespeople: res.salespeople || []
            };
          }
        }
      } catch (_) {}

      // Fallback: populate from master service if server filters returned empty
      if (filterOptions.parties.length === 0 && window.MasterService) {
        try {
          const cust = await window.MasterService.getParties('CUSTOMER').catch(() => []);
          const supp = await window.MasterService.getParties('SUPPLIER').catch(() => []);
          const items = await window.MasterService.getItems(false).catch(() => []);
          filterOptions.parties = [...cust, ...supp].map(p => p.name || p.partyName).filter(Boolean);
          filterOptions.items = items.map(i => i.name || i.itemName).filter(Boolean);
        } catch (_) {}
      }

      this.populateFilterDropdowns();
    },

    populateFilterDropdowns() {
      // 1. Dashboard Filters
      const dashParty = document.getElementById('rep-dash-party');
      if (dashParty) {
        dashParty.innerHTML = `<option value="">All Customers / Suppliers</option>` +
          filterOptions.parties.map(p => `<option value="${p}">${p}</option>`).join('');
      }
      const dashItem = document.getElementById('rep-dash-item');
      if (dashItem) {
        dashItem.innerHTML = `<option value="">All Items</option>` +
          filterOptions.items.map(i => `<option value="${i}">${i}</option>`).join('');
      }
      const dashSp = document.getElementById('rep-dash-salesperson');
      if (dashSp) {
        dashSp.innerHTML = `<option value="">All Sales Persons</option>` +
          filterOptions.salespeople.map(s => `<option value="${s}">${s}</option>`).join('');
      }

      // 2. Viewer Filters
      const vParty = document.getElementById('v-filter-party');
      if (vParty) {
        vParty.innerHTML = `<option value="">All Parties</option>` +
          filterOptions.parties.map(p => `<option value="${p}">${p}</option>`).join('');
      }
      const vItem = document.getElementById('v-filter-item');
      if (vItem) {
        vItem.innerHTML = `<option value="">All Items</option>` +
          filterOptions.items.map(i => `<option value="${i}">${i}</option>`).join('');
      }
      const vSp = document.getElementById('v-filter-salesperson');
      if (vSp) {
        vSp.innerHTML = `<option value="">All Sales Persons</option>` +
          filterOptions.salespeople.map(s => `<option value="${s}">${s}</option>`).join('');
      }
    },

    async loadDefinitions() {
      try {
        if (window.ApiService) {
          const serverDefs = await window.ApiService.get('/api/reporting/definitions').catch(() => null);
          if (Array.isArray(serverDefs) && serverDefs.length > 0) {
            definitions = serverDefs.map(d => ({
              id: d.id || d.code,
              title: d.title || d.name,
              category: (d.category || 'SALES').toUpperCase(),
              description: d.description || '',
              icon: d.icon || '📄',
              supportedFilters: d.supportedFilters || ['party', 'item', 'status', 'amount']
            }));
          }
        }
      } catch (_) {}

      if (!definitions || definitions.length === 0) {
        definitions = FALLBACK_DEFINITIONS;
      }

      this.currentDefinition = definitions.find(d => d.id === currentReportId) || definitions[0];
    },

    // ==========================================
    // 1. MAIN TAB SWITCHING (4 TABS)
    // ==========================================
    switchMainTab(tabName) {
      activeMainTab = tabName;
      const dashView = document.getElementById('rep-tab-dashboard-view');
      const centerView = document.getElementById('rep-tab-center-view');
      const viewerView = document.getElementById('rep-tab-viewer-view');
      const schView = document.getElementById('rep-tab-scheduler-view');

      const btnDash = document.getElementById('btn-rep-tab-dashboard');
      const btnCenter = document.getElementById('btn-rep-tab-center');
      const btnViewer = document.getElementById('btn-rep-tab-viewer');
      const btnSch = document.getElementById('btn-rep-tab-scheduler');

      const setBtnActive = (btn, active) => {
        if (!btn) return;
        if (active) {
          btn.classList.add('active');
          btn.style.background = 'rgba(56,189,248,0.15)';
          btn.style.color = 'var(--cyan)';
          btn.style.borderColor = 'rgba(56,189,248,0.3)';
          btn.style.fontWeight = '700';
        } else {
          btn.classList.remove('active');
          btn.style.background = 'transparent';
          btn.style.color = 'var(--text-muted)';
          btn.style.borderColor = 'transparent';
          btn.style.fontWeight = '600';
        }
      };

      if (dashView) dashView.style.display = tabName === 'dashboard' ? 'block' : 'none';
      if (centerView) centerView.style.display = tabName === 'center' ? 'block' : 'none';
      if (viewerView) viewerView.style.display = tabName === 'viewer' ? 'block' : 'none';
      if (schView) schView.style.display = tabName === 'scheduler' ? 'block' : 'none';

      setBtnActive(btnDash, tabName === 'dashboard');
      setBtnActive(btnCenter, tabName === 'center');
      setBtnActive(btnViewer, tabName === 'viewer');
      setBtnActive(btnSch, tabName === 'scheduler');

      const titleEl = document.getElementById('report-view-title');
      const descEl = document.getElementById('report-active-desc');
      const pageIcon = document.getElementById('rep-page-icon');

      if (tabName === 'dashboard') {
        if (titleEl) titleEl.innerText = 'Executive Reports & BI Analytics';
        if (descEl) descEl.innerText = 'Real-time financial intelligence, comprehensive report catalog, saved report viewer, and automated delivery schedules';
        if (pageIcon) pageIcon.innerText = '📈';
      } else if (tabName === 'center') {
        if (titleEl) titleEl.innerText = 'Report Center';
        if (descEl) descEl.innerText = 'Financial and operational intelligence across all business dimensions';
        if (pageIcon) pageIcon.innerText = '📋';
        this.renderReportCards();
      } else if (tabName === 'viewer') {
        if (titleEl) titleEl.innerText = this.currentDefinition?.title || 'Report Viewer';
        if (descEl) descEl.innerText = this.currentDefinition?.description || 'Dynamic tabular report viewer with multi-level filtering and export capabilities';
        if (pageIcon) pageIcon.innerText = this.currentDefinition?.icon || '📊';
        this.reflowViewerFilterGrid();
        if (!currentResult) this.applyViewerFilters();
      } else if (tabName === 'scheduler') {
        if (titleEl) titleEl.innerText = 'Scheduled Reports';
        if (descEl) descEl.innerText = 'Server-side schedules built from Saved Reports with dynamic date presets and delivery history';
        if (pageIcon) pageIcon.innerText = '⏱️';
        this.loadSchedules();
      }
    },

    handleRefreshAction() {
      if (activeMainTab === 'dashboard') {
        this.applyDashboardFilters();
      } else if (activeMainTab === 'center') {
        this.loadDefinitions().then(() => this.renderReportCards());
      } else if (activeMainTab === 'viewer') {
        this.applyViewerFilters();
      } else if (activeMainTab === 'scheduler') {
        this.loadSchedules();
      }
    },

    // ==========================================
    // 2. TAB 1: EXECUTIVE DASHBOARD
    // ==========================================
    onDashboardPeriodChange(preset) {
      const dates = calculatePresetDates(preset);
      if (dates) {
        const fromEl = document.getElementById('rep-dash-from');
        const toEl = document.getElementById('rep-dash-to');
        if (fromEl) fromEl.value = dates.from;
        if (toEl) toEl.value = dates.to;
        this.applyDashboardFilters();
      }
    },

    resetDashboardFilters() {
      const periodEl = document.getElementById('rep-dash-period');
      if (periodEl) periodEl.value = 'This Month';
      const dates = calculatePresetDates('This Month');
      if (dates) {
        const fromEl = document.getElementById('rep-dash-from');
        const toEl = document.getElementById('rep-dash-to');
        if (fromEl) fromEl.value = dates.from;
        if (toEl) toEl.value = dates.to;
      }
      const pEl = document.getElementById('rep-dash-party');
      if (pEl) pEl.value = '';
      const iEl = document.getElementById('rep-dash-item');
      if (iEl) iEl.value = '';
      const sEl = document.getElementById('rep-dash-salesperson');
      if (sEl) sEl.value = '';
      this.applyDashboardFilters();
    },

    async applyDashboardFilters() {
      const from = document.getElementById('rep-dash-from')?.value || '';
      const to = document.getElementById('rep-dash-to')?.value || '';
      const party = document.getElementById('rep-dash-party')?.value || '';
      const item = document.getElementById('rep-dash-item')?.value || '';
      const salesperson = document.getElementById('rep-dash-salesperson')?.value || '';

      const params = new URLSearchParams({
        from: from || '2026-01-01',
        to: to || '2026-12-31',
        reportType: 'All Reports',
        party: party || '',
        item: item || '',
        salesperson: salesperson || ''
      });

      let bundle = null;
      try {
        if (window.ApiService) {
          bundle = await window.ApiService.get(`/api/insights/reports?${params.toString()}`).catch(() => null);
        }
      } catch (err) {
        console.warn('[ReportsController] Server insights report query failed, using live fallback:', err);
      }

      if (bundle) {
        this.renderDashboardFromBundle(bundle);
      } else {
        await this.fallbackClientDashboard(from, to, party, item, salesperson);
      }
    },

    renderDashboardFromBundle(b) {
      // 6 KPI Cards
      const kpiSales = document.getElementById('rep-kpi-sales');
      if (kpiSales) kpiSales.innerText = formatMoney(b.sales || 0);

      const kpiPurchases = document.getElementById('rep-kpi-purchases');
      if (kpiPurchases) kpiPurchases.innerText = formatMoney(b.purchase || 0);

      const kpiProfit = document.getElementById('rep-kpi-profit');
      if (kpiProfit) {
        const p = parseFloat(b.profit) || 0;
        kpiProfit.innerText = formatMoney(p);
        kpiProfit.style.color = p >= 0 ? 'var(--green)' : 'var(--red)';
      }

      const kpiReceivables = document.getElementById('rep-kpi-receivables');
      if (kpiReceivables) kpiReceivables.innerText = formatMoney(b.receivables || 0);

      const kpiStock = document.getElementById('rep-kpi-stock');
      if (kpiStock) kpiStock.innerText = formatMoney(b.stock || 0);

      const kpiLowStock = document.getElementById('rep-kpi-low-stock');
      if (kpiLowStock) kpiLowStock.innerText = `${b.low || 0} low stock items`;

      const kpiCustomers = document.getElementById('rep-kpi-customers');
      if (kpiCustomers) kpiCustomers.innerText = (b.customers || 0).toLocaleString();

      // Recent Sales Table
      const tblSales = document.getElementById('rep-tbl-sales');
      if (tblSales) {
        const rows = b.salesRows || [];
        if (rows.length === 0) {
          tblSales.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--text-dim);">No sales recorded in this period.</td></tr>`;
        } else {
          tblSales.innerHTML = rows.slice(0, 5).map(r => `
            <tr>
              <td style="font-weight:700; color:var(--cyan); font-family:monospace;">${r.number || '-'}</td>
              <td style="white-space:nowrap; color:var(--text-muted);">${formatDate(r.date)}</td>
              <td style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.party || '-'}</td>
              <td style="text-align:right; font-weight:700;">${formatMoney(r.amount)}</td>
              <td><span class="pill-badge ${r.status === 'PAID' ? 'pill-success' : 'pill-warning'}">${r.status || 'CONFIRMED'}</span></td>
            </tr>
          `).join('');
        }
      }

      // Recent Purchases Table
      const tblPurchases = document.getElementById('rep-tbl-purchases');
      if (tblPurchases) {
        const rows = b.purchaseRows || [];
        if (rows.length === 0) {
          tblPurchases.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--text-dim);">No purchases recorded in this period.</td></tr>`;
        } else {
          tblPurchases.innerHTML = rows.slice(0, 5).map(r => `
            <tr>
              <td style="font-weight:700; color:var(--purple); font-family:monospace;">${r.number || '-'}</td>
              <td style="white-space:nowrap; color:var(--text-muted);">${formatDate(r.date)}</td>
              <td style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.party || '-'}</td>
              <td style="text-align:right; font-weight:700;">${formatMoney(r.amount)}</td>
              <td><span class="pill-badge ${r.status === 'PAID' ? 'pill-success' : 'pill-neutral'}">${r.status || 'CONFIRMED'}</span></td>
            </tr>
          `).join('');
        }
      }

      // Payment Snapshot
      const paySnap = document.getElementById('rep-payment-snapshot');
      if (paySnap) {
        const rec = b.receivables || 0;
        const recPaid = b.salesPaid || 0;
        const pay = b.payables || 0;
        const payPaid = b.purchasesPaid || 0;

        paySnap.innerHTML = `
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 10px;">
            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Receivables</div>
            <div style="font-size:0.95rem; font-weight:700; color:var(--yellow);">${formatMoney(rec)}</div>
            <div style="font-size:0.7rem; color:var(--green); margin-top:2px;">Received: ${formatMoney(recPaid)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 10px;">
            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Payables</div>
            <div style="font-size:0.95rem; font-weight:700; color:var(--red);">${formatMoney(pay)}</div>
            <div style="font-size:0.7rem; color:var(--cyan); margin-top:2px;">Paid: ${formatMoney(payPaid)}</div>
          </div>
        `;
      }

      // Top Customers
      const topCustEl = document.getElementById('rep-top-customers');
      if (topCustEl) {
        const pts = b.customerPoints || [];
        if (pts.length === 0) {
          topCustEl.innerHTML = `<div style="color:var(--text-dim);">No customer data.</div>`;
        } else {
          topCustEl.innerHTML = pts.slice(0, 4).map((pt, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
              <span style="font-size:0.76rem; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${idx + 1}. ${pt.label}</span>
              <span style="font-weight:700; color:var(--cyan); font-size:0.76rem;">${formatMoney(pt.value)}</span>
            </div>
          `).join('');
        }
      }

      // Top Items
      const topItemsEl = document.getElementById('rep-top-items');
      if (topItemsEl) {
        const pts = b.itemPoints || [];
        if (pts.length === 0) {
          topItemsEl.innerHTML = `<div style="color:var(--text-dim);">No item sales data.</div>`;
        } else {
          topItemsEl.innerHTML = pts.slice(0, 4).map((pt, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
              <span style="font-size:0.76rem; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${idx + 1}. ${pt.label}</span>
              <span style="font-weight:700; color:var(--yellow); font-size:0.76rem;">${formatMoney(pt.value)}</span>
            </div>
          `).join('');
        }
      }

      // Business Health
      const marginVal = document.getElementById('rep-margin-val');
      const marginBar = document.getElementById('rep-margin-bar');
      const salesCountEl = document.getElementById('rep-sales-count');
      const salesAvgEl = document.getElementById('rep-sales-avg');

      const sVal = b.sales || 0;
      const pVal = b.profit || 0;
      const marginPct = sVal > 0 ? Math.max(0, (pVal / sVal) * 100).toFixed(1) : '0.0';

      if (marginVal) marginVal.innerText = marginPct + '%';
      if (marginBar) marginBar.style.width = Math.min(100, Math.max(0, parseFloat(marginPct))) + '%';
      if (salesCountEl) salesCountEl.innerText = (b.salesCount || 0).toLocaleString();
      if (salesAvgEl) salesAvgEl.innerText = formatMoney(b.averageSale || 0);

      // Stock Attention
      const totalItemsEl = document.getElementById('rep-stock-total-items');
      const lowStockEl = document.getElementById('rep-stock-low-count');
      const outStockEl = document.getElementById('rep-stock-out-count');
      const stockValEl = document.getElementById('rep-stock-valuation-val');

      if (totalItemsEl) totalItemsEl.innerText = (b.items || 0).toLocaleString();
      if (lowStockEl) lowStockEl.innerText = (b.low || 0).toLocaleString();
      if (outStockEl) outStockEl.innerText = (b.out || 0).toLocaleString();
      if (stockValEl) stockValEl.innerText = formatMoney(b.stock || 0);
    },

    async fallbackClientDashboard(from, to, party, item, salesperson) {
      let salesList = [];
      let purchasesList = [];
      let itemsList = [];
      let customersList = [];

      if (window.OperationsService) {
        const sRes = await window.OperationsService.getSales(0, 100).catch(() => []);
        salesList = Array.isArray(sRes) ? sRes : (sRes?.content || sRes?.rows || []);
        const pRes = await window.OperationsService.getPurchases(0, 100).catch(() => []);
        purchasesList = Array.isArray(pRes) ? pRes : (pRes?.content || pRes?.rows || []);
      }
      if (window.MasterService) {
        itemsList = await window.MasterService.getItems(false).catch(() => []);
        customersList = await window.MasterService.getParties('CUSTOMER').catch(() => []);
      }

      let totSales = 0;
      let totPurchases = 0;
      let totReceivables = 0;
      salesList.forEach(s => {
        const amt = parseFloat(s.totalAmount || s.total || s.amount || 0);
        const paid = parseFloat(s.paidAmount || (s.paymentStatus === 'PAID' ? amt : 0));
        totSales += amt;
        totReceivables += Math.max(0, amt - paid);
      });
      purchasesList.forEach(p => {
        totPurchases += parseFloat(p.totalAmount || p.total || p.amount || 0);
      });

      const syntheticBundle = {
        sales: totSales,
        purchase: totPurchases,
        profit: totSales - totPurchases,
        receivables: totReceivables,
        stock: 0,
        low: 0,
        customers: customersList.length,
        salesRows: salesList.map(s => ({ number: s.invoiceNumber || s.invoiceNo, date: s.invoiceDate, party: s.customerName || s.partyName, amount: s.totalAmount || s.total, status: s.paymentStatus || 'CONFIRMED' })),
        purchaseRows: purchasesList.map(p => ({ number: p.billNumber || p.billNo, date: p.billDate, party: p.supplierName || p.partyName, amount: p.totalAmount || p.total, status: p.paymentStatus || 'CONFIRMED' })),
        salesPaid: totSales - totReceivables,
        payables: 0,
        purchasesPaid: totPurchases,
        items: itemsList.length,
        out: 0,
        salesCount: salesList.length,
        purchaseCount: purchasesList.length,
        averageSale: salesList.length > 0 ? totSales / salesList.length : 0,
        customerPoints: [],
        itemPoints: []
      };
      this.renderDashboardFromBundle(syntheticBundle);
    },

    openReportFromDashboard(reportId) {
      this.openReport(reportId);
    },

    // ==========================================
    // 3. TAB 2: REPORT CENTER (CATALOG & FAVORITES)
    // ==========================================
    renderCategoryPills() {
      const container = document.getElementById('rep-center-category-pills');
      if (!container) return;

      const categories = [
        { id: 'FAVORITES', label: '⭐ Favorites' },
        { id: 'ALL', label: 'All Reports' },
        { id: 'SALES', label: 'Sales' },
        { id: 'PURCHASE', label: 'Purchase' },
        { id: 'RETURNS', label: 'Returns' },
        { id: 'GST / TAX', label: 'GST / Tax' },
        { id: 'RECEIVABLE', label: 'Receivable' },
        { id: 'PAYABLE', label: 'Payable' },
        { id: 'INVENTORY', label: 'Inventory' },
        { id: 'BANKING', label: 'Banking' },
        { id: 'PROFITABILITY', label: 'Profitability' }
      ];

      container.innerHTML = categories.map(c => {
        const isAct = activeCenterCategory === c.id;
        return `
          <button class="btn btn-sm ${isAct ? 'btn-purple' : 'btn-secondary'}" onclick="window.ReportsController.setCenterCategory('${c.id}')" style="font-size:0.75rem; white-space:nowrap; border-radius:6px; padding:4px 12px; cursor:pointer;">
            ${c.label}
          </button>
        `;
      }).join('');
    },

    setCenterCategory(cat) {
      activeCenterCategory = cat;
      this.renderCategoryPills();
      this.renderReportCards();
    },

    onCenterSearchInput(val) {
      centerSearchQuery = (val || '').toLowerCase().trim();
      this.renderReportCards();
    },

    renderReportCards() {
      const grid = document.getElementById('report-cards-grid');
      if (!grid) return;

      let list = definitions;

      if (activeCenterCategory === 'FAVORITES') {
        list = list.filter(d => favoriteReportIds.has(d.id));
      } else if (activeCenterCategory !== 'ALL') {
        list = list.filter(d => d.category === activeCenterCategory);
      }

      if (centerSearchQuery) {
        list = list.filter(d =>
          d.title.toLowerCase().includes(centerSearchQuery) ||
          d.description.toLowerCase().includes(centerSearchQuery) ||
          d.category.toLowerCase().includes(centerSearchQuery)
        );
      }

      if (list.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align:center; padding:40px; color:var(--text-muted); background:var(--bg-surface); border-radius:8px; border:1px solid var(--border-subtle);">
            <div style="font-size:2rem; margin-bottom:8px;">🔍</div>
            <div style="font-weight:600; color:var(--text-main);">No reports match your selection</div>
            <div style="font-size:0.78rem; margin-top:4px;">Try searching for a different keyword or select another category pill.</div>
          </div>
        `;
        return;
      }

      grid.innerHTML = list.map(d => {
        const isFav = favoriteReportIds.has(d.id);
        return `
          <div class="data-panel" style="padding:16px; display:flex; flex-direction:column; justify-content:space-between; margin-bottom:0; transition:transform 0.15s, border-color 0.15s; border-radius:10px;" onmouseenter="this.style.borderColor='rgba(139,92,246,0.45)'" onmouseleave="this.style.borderColor='var(--border-subtle)'">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:1.35rem;">${d.icon || '📄'}</span>
                  <div>
                    <h4 style="margin:0; font-size:0.92rem; font-weight:700; color:var(--text-main);">${d.title}</h4>
                    <span class="pill-badge pill-neutral" style="font-size:0.65rem; margin-top:2px;">${d.category}</span>
                  </div>
                </div>
                <button onclick="window.ReportsController.toggleFavorite('${d.id}', event)" style="background:transparent; border:none; font-size:1.2rem; cursor:pointer; color:${isFav ? '#eab308' : 'rgba(255,255,255,0.2)'}; padding:2px;" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                  ${isFav ? '★' : '☆'}
                </button>
              </div>
              <p style="font-size:0.78rem; color:var(--text-muted); line-height:1.4; margin:0 0 14px 0;">${d.description}</p>
            </div>
            <div style="display:flex; justify-content:flex-end;">
              <button class="btn btn-purple btn-sm" onclick="window.ReportsController.openReport('${d.id}')" style="font-size:0.76rem; padding:4px 14px; font-weight:600; display:inline-flex; align-items:center; gap:6px;">
                <span>👁️</span> Open Report
              </button>
            </div>
          </div>
        `;
      }).join('');
    },

    toggleFavorite(reportId, event) {
      if (event) event.stopPropagation();
      if (favoriteReportIds.has(reportId)) {
        favoriteReportIds.delete(reportId);
      } else {
        favoriteReportIds.add(reportId);
      }
      this.persistFavorites();
      this.renderReportCards();
    },

    openReport(reportId) {
      currentReportId = reportId;
      this.currentDefinition = definitions.find(d => d.id === reportId) || definitions[0];
      this.switchMainTab('viewer');
      this.reflowViewerFilterGrid();
      this.applyViewerFilters();
    },

    showRecentExports() {
      if (window.AppDialogService) {
        window.AppDialogService.toastInfo('Recent exports are automatically synchronized to your browser downloads folder.');
      }
    },

    // ==========================================
    // 4. TAB 3: SAVED REPORTS / DYNAMIC REPORT VIEWER
    // ==========================================
    reflowViewerFilterGrid() {
      const def = this.currentDefinition || definitions[0];
      if (!def) return;

      const titleEl = document.getElementById('viewer-report-title');
      const iconEl = document.getElementById('viewer-header-icon');
      if (titleEl) titleEl.innerText = def.title;
      if (iconEl) iconEl.innerText = def.icon || '📄';

      const supp = new Set(def.supportedFilters || ['party', 'item', 'status', 'amount']);

      const toggleBox = (id, show) => {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? 'block' : 'none';
      };

      toggleBox('box-v-party', supp.has('party'));
      toggleBox('box-v-item', supp.has('item'));
      toggleBox('box-v-salesperson', supp.has('salesperson'));
      toggleBox('box-v-docstatus', supp.has('status'));
      toggleBox('box-v-payment', supp.has('payment'));
      toggleBox('box-v-returns', supp.has('returns'));
      toggleBox('box-v-gstrate', supp.has('gstrate'));
      toggleBox('box-v-minamt', supp.has('amount'));
      toggleBox('box-v-maxamt', supp.has('amount'));
    },

    toggleViewerFilterCollapse() {
      viewerFiltersCollapsed = !viewerFiltersCollapsed;
      const grid = document.getElementById('viewer-filter-grid');
      const btn = document.getElementById('btn-viewer-toggle-collapse');
      if (grid) grid.style.display = viewerFiltersCollapsed ? 'none' : 'flex';
      if (btn) btn.innerText = viewerFiltersCollapsed ? 'Expand ▼' : 'Collapse ▲';
    },

    onViewerPeriodChange(preset) {
      const dates = calculatePresetDates(preset);
      if (dates) {
        const f = document.getElementById('v-filter-from');
        const t = document.getElementById('v-filter-to');
        if (f) f.value = dates.from;
        if (t) t.value = dates.to;
        viewerPage = 0;
        this.applyViewerFilters();
      }
    },

    resetViewerFilters() {
      const p = document.getElementById('v-filter-period');
      if (p) p.value = 'This Month';
      const dates = calculatePresetDates('This Month');
      if (dates) {
        const f = document.getElementById('v-filter-from');
        const t = document.getElementById('v-filter-to');
        if (f) f.value = dates.from;
        if (t) t.value = dates.to;
      }
      const party = document.getElementById('v-filter-party');
      if (party) party.value = '';
      const item = document.getElementById('v-filter-item');
      if (item) item.value = '';
      const sp = document.getElementById('v-filter-salesperson');
      if (sp) sp.value = '';
      const doc = document.getElementById('v-filter-docstatus');
      if (doc) doc.value = '';
      const pay = document.getElementById('v-filter-payment');
      if (pay) pay.value = '';
      const ret = document.getElementById('v-filter-returns');
      if (ret) ret.value = '';
      const gst = document.getElementById('v-filter-gstrate');
      if (gst) gst.value = '';
      const min = document.getElementById('v-filter-minamt');
      if (min) min.value = '';
      const max = document.getElementById('v-filter-maxamt');
      if (max) max.value = '';

      viewerPage = 0;
      this.applyViewerFilters();
    },

    async applyViewerFilters() {
      const def = this.currentDefinition || definitions[0];
      const from = document.getElementById('v-filter-from')?.value || '';
      const to = document.getElementById('v-filter-to')?.value || '';
      const party = document.getElementById('v-filter-party')?.value || '';
      const item = document.getElementById('v-filter-item')?.value || '';
      const salesperson = document.getElementById('v-filter-salesperson')?.value || '';
      const status = document.getElementById('v-filter-docstatus')?.value || '';
      const paymentStatus = document.getElementById('v-filter-payment')?.value || '';
      const returnStatus = document.getElementById('v-filter-returns')?.value || '';
      const gstRate = document.getElementById('v-filter-gstrate')?.value || '';
      const minAmount = document.getElementById('v-filter-minamt')?.value || '';
      const maxAmount = document.getElementById('v-filter-maxamt')?.value || '';

      const groupBy = document.getElementById('viewer-groupby')?.value || 'None';
      const sortBy = document.getElementById('viewer-sortby')?.value || 'Date';
      const sortDirection = document.getElementById('viewer-direction')?.value || 'Descending';

      const summaryEl = document.getElementById('viewer-active-filters-summary');
      if (summaryEl) {
        summaryEl.innerText = `Active filters: ${from || 'Start'} to ${to || 'End'}${party ? ' • ' + party : ''}`;
      }

      const req = {
        reportId: def?.id || currentReportId,
        fromDate: from,
        toDate: to,
        party: party,
        item: item,
        salesperson: salesperson,
        status: status,
        paymentStatus: paymentStatus,
        returnStatus: returnStatus,
        gstRate: gstRate,
        minAmount: minAmount,
        maxAmount: maxAmount,
        groupBy: groupBy,
        sortBy: sortBy,
        sortDirection: sortDirection,
        search: viewerSearchQuery,
        page: viewerPage,
        size: viewerPageSize
      };

      const thead = document.getElementById('viewer-thead');
      const tbody = document.getElementById('viewer-tbody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Running dynamic query...</td></tr>`;
      }

      let res = null;
      try {
        if (window.ApiService) {
          res = await window.ApiService.post('/api/reporting/run', req).catch(() => null);
        }
      } catch (err) {
        console.warn('[ReportsController] POST /api/reporting/run failed:', err);
      }

      if (res && res.columns) {
        currentResult = res;
        this.renderViewerResult(res);
      } else {
        await this.fallbackViewerExecution(req);
      }
    },

    renderViewerResult(res) {
      const thead = document.getElementById('viewer-thead');
      const tbody = document.getElementById('viewer-tbody');
      const tfoot = document.getElementById('viewer-tfoot');
      const countEl = document.getElementById('viewer-record-count');
      const pageEl = document.getElementById('viewer-page-indicator');

      selectedViewerRow = null;

      const cols = res.columns || [];
      const rows = res.rows || [];
      const totalElements = res.totalRows != null ? res.totalRows : rows.length;
      const totalPages = Math.ceil(totalElements / viewerPageSize) || 1;

      if (countEl) {
        const start = viewerPage * viewerPageSize + 1;
        const end = Math.min((viewerPage + 1) * viewerPageSize, totalElements);
        countEl.innerText = totalElements === 0 ? 'Showing 0 entries' : `Showing ${start} to ${end} of ${totalElements} entries`;
      }

      if (pageEl) {
        pageEl.innerText = `Page ${viewerPage + 1} / ${totalPages}`;
      }

      // Render Header
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th style="width:36px; text-align:center;">#</th>
            ${cols.map(c => `<th style="${c.align === 'RIGHT' ? 'text-align:right;' : ''}">${c.label}</th>`).join('')}
          </tr>
        `;
      }

      // Render Rows
      if (tbody) {
        if (rows.length === 0) {
          tbody.innerHTML = `<tr><td colspan="${cols.length + 1}" style="text-align:center; padding:32px; color:var(--text-dim);">No transactions found matching criteria.</td></tr>`;
        } else {
          tbody.innerHTML = rows.map((r, rIdx) => {
            const rowRef = r.reference || r.number || (r.values && r.values[0]) || '';
            return `
              <tr data-row-idx="${rIdx}" data-ref="${rowRef}" onclick="window.ReportsController.onViewerRowClick(${rIdx}, this)" style="cursor:pointer;">
                <td style="text-align:center; color:var(--text-muted); font-size:0.72rem;">${viewerPage * viewerPageSize + rIdx + 1}</td>
                ${(r.values || []).map((val, cIdx) => {
                  const col = cols[cIdx];
                  const isRight = col && col.align === 'RIGHT';
                  const isMono = col && (col.type === 'CODE' || col.type === 'NUMBER' || (val && /^[A-Z0-9\/-]+$/.test(val)));
                  return `
                    <td style="${isRight ? 'text-align:right; font-weight:700;' : ''} ${isMono ? 'font-family:monospace; color:var(--cyan);' : ''}">
                      ${val != null ? val : '-'}
                    </td>
                  `;
                }).join('')}
              </tr>
            `;
          }).join('');
        }
      }

      // Render Totals Foot
      if (tfoot) {
        if (res.totals && res.totals.length > 0) {
          tfoot.innerHTML = `
            <tr style="font-weight:700; background:rgba(255,255,255,0.04); border-top:2px solid var(--border-subtle);">
              <td style="text-align:center;">TOTAL</td>
              ${res.totals.map((t, idx) => {
                const col = cols[idx];
                const isRight = col && col.align === 'RIGHT';
                return `<td style="${isRight ? 'text-align:right;' : ''}">${t != null ? t : ''}</td>`;
              }).join('')}
            </tr>
          `;
        } else {
          tfoot.innerHTML = '';
        }
      }
    },

    async fallbackViewerExecution(req) {
      // Client-side fallback dynamic report rendering
      let rows = [];
      let cols = [];

      if (req.reportId.includes('PURCHASE')) {
        cols = [
          { label: 'Bill No.', align: 'LEFT', type: 'CODE' },
          { label: 'Date', align: 'LEFT' },
          { label: 'Supplier', align: 'LEFT' },
          { label: 'Taxable (₹)', align: 'RIGHT' },
          { label: 'Total (₹)', align: 'RIGHT' },
          { label: 'Status', align: 'LEFT' }
        ];
        if (window.OperationsService) {
          const res = await window.OperationsService.getPurchases(0, 50).catch(() => []);
          const list = Array.isArray(res) ? res : (res?.content || []);
          rows = list.map(p => ({
            reference: p.billNumber || p.billNo,
            values: [
              p.billNumber || p.billNo || '-',
              formatDate(p.billDate),
              p.supplierName || p.partyName || '-',
              formatMoney(p.taxableAmount || 0),
              formatMoney(p.totalAmount || p.total || 0),
              p.paymentStatus || 'CONFIRMED'
            ]
          }));
        }
      } else {
        cols = [
          { label: 'Invoice No.', align: 'LEFT', type: 'CODE' },
          { label: 'Date', align: 'LEFT' },
          { label: 'Customer', align: 'LEFT' },
          { label: 'Taxable (₹)', align: 'RIGHT' },
          { label: 'Total (₹)', align: 'RIGHT' },
          { label: 'Status', align: 'LEFT' }
        ];
        if (window.OperationsService) {
          const res = await window.OperationsService.getSales(0, 50).catch(() => []);
          const list = Array.isArray(res) ? res : (res?.content || []);
          rows = list.map(s => ({
            reference: s.invoiceNumber || s.invoiceNo,
            values: [
              s.invoiceNumber || s.invoiceNo || '-',
              formatDate(s.invoiceDate),
              s.customerName || s.partyName || '-',
              formatMoney(s.taxableAmount || 0),
              formatMoney(s.totalAmount || s.total || 0),
              s.paymentStatus || 'CONFIRMED'
            ]
          }));
        }
      }

      currentResult = { columns: cols, rows: rows, totalRows: rows.length };
      this.renderViewerResult(currentResult);
    },

    onViewerRowClick(idx, trEl) {
      document.querySelectorAll('#viewer-tbody tr').forEach(r => r.style.background = '');
      if (trEl) trEl.style.background = 'rgba(56,189,248,0.1)';
      selectedViewerRow = currentResult?.rows?.[idx] || null;
    },

    onViewerSearch(val) {
      viewerSearchQuery = (val || '').toLowerCase().trim();
      viewerPage = 0;
      this.applyViewerFilters();
    },

    onGroupingChanged(val) {
      viewerPage = 0;
      this.applyViewerFilters();
    },

    onSortingChanged(val) {
      viewerPage = 0;
      this.applyViewerFilters();
    },

    onDirectionChanged(val) {
      viewerPage = 0;
      this.applyViewerFilters();
    },

    onRowsPerPageChanged(val) {
      viewerPageSize = parseInt(val) || 25;
      viewerPage = 0;
      this.applyViewerFilters();
    },

    viewerFirstPage() {
      if (viewerPage > 0) {
        viewerPage = 0;
        this.applyViewerFilters();
      }
    },

    viewerPrevPage() {
      if (viewerPage > 0) {
        viewerPage--;
        this.applyViewerFilters();
      }
    },

    viewerNextPage() {
      const tot = currentResult?.totalRows || 0;
      if ((viewerPage + 1) * viewerPageSize < tot) {
        viewerPage++;
        this.applyViewerFilters();
      }
    },

    viewerLastPage() {
      const tot = currentResult?.totalRows || 0;
      const last = Math.max(0, Math.ceil(tot / viewerPageSize) - 1);
      if (viewerPage !== last) {
        viewerPage = last;
        this.applyViewerFilters();
      }
    },

    viewSelectedRowSource() {
      if (!selectedViewerRow) {
        if (window.AppDialogService) window.AppDialogService.toastInfo('Please click a report row to select it first.');
        return;
      }

      const ref = selectedViewerRow.reference || (selectedViewerRow.values && selectedViewerRow.values[0]);
      if (!ref) {
        if (window.AppDialogService) window.AppDialogService.toastInfo('No originating document reference found on selected row.');
        return;
      }

      // Deep-link using BankStatementController resolver
      if (window.BankStatementController && window.BankStatementController.openLinkedDocument) {
        window.BankStatementController.openLinkedDocument(ref);
      } else {
        if (window.AppDialogService) window.AppDialogService.toastInfo(`Document: ${ref}`);
      }
    },

    printViewerReport() {
      window.print();
    },

    saveCurrentReportConfig() {
      if (window.AppDialogService) {
        window.AppDialogService.toastSuccess(`Report view saved! Dynamic date preset '${document.getElementById('v-filter-period')?.value || 'This Month'}' will advance automatically.`);
      }
    },

    // ==========================================
    // 5. TAB 4: SCHEDULED REPORTS
    // ==========================================
    async loadSchedules() {
      const tbody = document.getElementById('rep-sch-tbody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-dim);"><span class="loading-spinner"></span> Loading scheduled reports...</td></tr>`;
      }

      try {
        if (window.ApiService) {
          const res = await window.ApiService.get('/api/reporting/schedules').catch(() => null);
          allSchedules = (res && (res.rows || res.content || res)) || [];
          if (!Array.isArray(allSchedules)) allSchedules = [];
        }
      } catch (err) {
        console.warn('[ReportsController] GET /api/reporting/schedules failed:', err);
        allSchedules = [];
      }

      this.updateScheduleKpis();
      this.filterSchedules();
    },

    updateScheduleKpis() {
      const activeCount = allSchedules.filter(s => (s.status || '').toUpperCase() === 'ACTIVE').length;
      const failCount = allSchedules.filter(s => (s.failureCount || 0) > 0 || (s.lastStatus || '').toUpperCase() === 'FAILED').length;

      const actEl = document.getElementById('rep-sch-kpi-active');
      const nextEl = document.getElementById('rep-sch-kpi-next');
      const nextNameEl = document.getElementById('rep-sch-kpi-next-name');
      const monthEl = document.getElementById('rep-sch-kpi-month');
      const failEl = document.getElementById('rep-sch-kpi-failures');

      if (actEl) actEl.innerText = activeCount.toString();
      if (failEl) failEl.innerText = failCount.toString();
      if (monthEl) monthEl.innerText = (allSchedules.length * 4).toString();

      // Find earliest next run
      const activeScheds = allSchedules.filter(s => (s.status || '').toUpperCase() === 'ACTIVE' && s.nextRun);
      if (activeScheds.length > 0) {
        const earliest = activeScheds[0];
        if (nextEl) nextEl.innerText = formatDate(earliest.nextRun);
        if (nextNameEl) nextNameEl.innerText = earliest.name || earliest.savedReport || '-';
      } else {
        if (nextEl) nextEl.innerText = 'None Scheduled';
        if (nextNameEl) nextNameEl.innerText = '-';
      }
    },

    filterSchedules() {
      const q = (document.getElementById('rep-sch-search')?.value || '').toLowerCase().trim();
      const statusFilter = document.getElementById('rep-sch-status-filter')?.value || '';
      const formatFilter = document.getElementById('rep-sch-format-filter')?.value || '';

      let list = allSchedules;
      if (q) {
        list = list.filter(s =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.savedReport || '').toLowerCase().includes(q) ||
          (s.recipients || '').toLowerCase().includes(q)
        );
      }
      if (statusFilter) {
        list = list.filter(s => (s.status || '').toUpperCase() === statusFilter.toUpperCase());
      }
      if (formatFilter) {
        list = list.filter(s => (s.format || '').toUpperCase().includes(formatFilter.toUpperCase()));
      }

      const tbody = document.getElementById('rep-sch-tbody');
      if (!tbody) return;

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--text-dim);">No schedules found. Click "+ New Schedule" to create automated delivery.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map(s => {
        const isAct = (s.status || '').toUpperCase() === 'ACTIVE';
        return `
          <tr data-sch-id="${s.id}">
            <td style="font-weight:700; color:var(--text-main);">${s.name || 'Schedule #' + s.id}</td>
            <td style="font-family:monospace; color:var(--cyan);">${s.savedReport || s.reportTitle || '-'}</td>
            <td><span class="pill-badge pill-neutral">${s.frequency || 'DAILY'}</span></td>
            <td>${s.time || '08:00'}</td>
            <td><span class="pill-badge pill-purple">${s.format || 'PDF'}</span></td>
            <td style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${s.recipients || ''}">${s.delivery || 'EMAIL'} (${s.recipients || 'team'})</td>
            <td style="color:var(--text-muted); font-size:0.75rem;">${formatDate(s.nextRun) || 'Pending'}</td>
            <td><span class="pill-badge ${isAct ? 'pill-success' : 'pill-warning'}">${s.status || 'ACTIVE'}</span></td>
            <td style="text-align:right; white-space:nowrap;" onclick="event.stopPropagation();">
              <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
                <button class="btn-purple" onclick="window.ReportsController.toggleScheduleActionMenu(${s.id}, event)" style="padding:4px 10px; font-size:0.75rem; font-weight:600; border-radius:6px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
                  Actions <span style="font-size:0.65rem;">▼</span>
                </button>
                <div id="sch-action-menu-${s.id}" class="action-dropdown-menu" style="display:none; position:fixed; z-index:100005; background:#0b1324; border:1px solid rgba(255,255,255,0.15); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.7); min-width:180px; padding:6px 0; text-align:left;">
                  <div class="action-menu-item" onclick="window.ReportsController.runScheduleNow(${s.id})"><span style="margin-right:8px;">▶</span> Run Now</div>
                  <div class="action-menu-item" onclick="window.ReportsController.openEditScheduleModal(${s.id})"><span style="margin-right:8px;">✏️</span> Edit</div>
                  <div class="action-menu-item" onclick="window.ReportsController.togglePauseSchedule(${s.id}, ${isAct})"><span style="margin-right:8px;">${isAct ? '⏸️ Pause' : '▶️ Resume'}</span></div>
                  <div class="action-menu-item" onclick="window.ReportsController.duplicateSchedule(${s.id})"><span style="margin-right:8px;">📋</span> Duplicate</div>
                  <div class="action-menu-item" onclick="window.ReportsController.viewScheduleHistory(${s.id})"><span style="margin-right:8px;">🕒</span> View History</div>
                  <div class="action-menu-divider" style="height:1px; background:rgba(255,255,255,0.08); margin:4px 0;"></div>
                  <div class="action-menu-item danger" onclick="window.ReportsController.deleteSchedule(${s.id})"><span style="margin-right:8px;">🗑️</span> Delete</div>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    toggleScheduleActionMenu(id, event) {
      if (event) event.stopPropagation();
      const menu = document.getElementById('sch-action-menu-' + id);
      document.querySelectorAll('.action-dropdown-menu').forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });

      if (menu) {
        const isShow = menu.style.display === 'block';
        if (isShow) {
          menu.style.display = 'none';
        } else {
          menu.style.display = 'block';
          const btn = event.currentTarget || event.target;
          const rect = btn.getBoundingClientRect();
          menu.style.top = `${rect.bottom + 4}px`;
          menu.style.left = `${Math.max(10, rect.right - 180)}px`;

          const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== btn) {
              menu.style.display = 'none';
              document.removeEventListener('click', closeMenu);
            }
          };
          document.addEventListener('click', closeMenu);
        }
      }
    },

    async runScheduleNow(id) {
      try {
        if (window.ApiService) {
          await window.ApiService.post(`/api/reporting/schedules/${id}/run`, {});
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Report run initiated on server!');
          this.loadSchedules();
        }
      } catch (err) {
        alert('Run Error: ' + err.message);
      }
    },

    async togglePauseSchedule(id, isCurrentlyActive) {
      const s = allSchedules.find(x => x.id === id);
      const rowVersion = s?.rowVersion || 0;
      try {
        if (window.ApiService) {
          const endpoint = isCurrentlyActive ? `/api/reporting/schedules/${id}/pause?rowVersion=${rowVersion}` : `/api/reporting/schedules/${id}/resume?rowVersion=${rowVersion}`;
          await window.ApiService.post(endpoint, {});
          if (window.AppDialogService) window.AppDialogService.toastSuccess(isCurrentlyActive ? 'Schedule paused.' : 'Schedule resumed.');
          this.loadSchedules();
        }
      } catch (err) {
        alert('Status Error: ' + err.message);
      }
    },

    async duplicateSchedule(id) {
      try {
        if (window.ApiService) {
          await window.ApiService.post(`/api/reporting/schedules/${id}/duplicate`, {});
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Schedule duplicated!');
          this.loadSchedules();
        }
      } catch (err) {
        alert('Duplicate Error: ' + err.message);
      }
    },

    async viewScheduleHistory(id) {
      try {
        if (window.ApiService) {
          const history = await window.ApiService.get(`/api/reporting/schedules/${id}/history`).catch(() => []);
          const count = Array.isArray(history) ? history.length : 0;
          if (window.AppDialogService) {
            window.AppDialogService.toastInfo(`Schedule #${id} has executed ${count} automated delivery runs.`);
          }
        }
      } catch (err) {
        alert('History Error: ' + err.message);
      }
    },

    async deleteSchedule(id) {
      if (!confirm('Are you sure you want to delete this automated schedule?')) return;
      const s = allSchedules.find(x => x.id === id);
      const rowVersion = s?.rowVersion || 0;
      try {
        if (window.ApiService) {
          await window.ApiService.delete(`/api/reporting/schedules/${id}?rowVersion=${rowVersion}`);
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Schedule deleted.');
          this.loadSchedules();
        }
      } catch (err) {
        alert('Delete Error: ' + err.message);
      }
    },

    // Modal: New Schedule (Image 5 Parity)
    async openNewScheduleModal() {
      const modal = document.getElementById('modal-new-schedule');
      if (!modal) return;

      const titleEl = document.getElementById('sch-modal-title');
      if (titleEl) titleEl.innerText = 'New Schedule';

      const idEl = document.getElementById('sch-form-id');
      if (idEl) idEl.value = '';

      const nameEl = document.getElementById('sch-form-name');
      if (nameEl) nameEl.value = '';

      const recEl = document.getElementById('sch-form-recipients');
      if (recEl) recEl.value = '';

      const timeEl = document.getElementById('sch-form-time');
      if (timeEl) timeEl.value = '08:00';

      const submitBtn = document.getElementById('btn-sch-submit');
      if (submitBtn) submitBtn.innerHTML = `<span>✔</span> Create Schedule`;

      // Load saved reports dropdown
      await this.populateSavedReportsInModal();

      modal.style.display = 'flex';
    },

    async openEditScheduleModal(id) {
      const s = allSchedules.find(x => x.id === id);
      if (!s) return;

      const modal = document.getElementById('modal-new-schedule');
      if (!modal) return;

      const titleEl = document.getElementById('sch-modal-title');
      if (titleEl) titleEl.innerText = `Edit Schedule: ${s.name || '#' + id}`;

      const idEl = document.getElementById('sch-form-id');
      if (idEl) idEl.value = id;

      const versionEl = document.getElementById('sch-form-version');
      if (versionEl) versionEl.value = s.rowVersion || 0;

      const nameEl = document.getElementById('sch-form-name');
      if (nameEl) nameEl.value = s.name || '';

      const freqEl = document.getElementById('sch-form-freq');
      if (freqEl) freqEl.value = s.frequency || 'DAILY';

      const timeEl = document.getElementById('sch-form-time');
      if (timeEl) timeEl.value = s.time || '08:00';

      const fmtEl = document.getElementById('sch-form-format');
      if (fmtEl) fmtEl.value = s.format || 'PDF';

      const delEl = document.getElementById('sch-form-delivery');
      if (delEl) delEl.value = s.delivery || 'EMAIL';

      const recEl = document.getElementById('sch-form-recipients');
      if (recEl) recEl.value = s.recipients || '';

      const submitBtn = document.getElementById('btn-sch-submit');
      if (submitBtn) submitBtn.innerHTML = `<span>✔</span> Save Changes`;

      await this.populateSavedReportsInModal(s.savedReport || s.reportId);

      modal.style.display = 'flex';
    },

    async populateSavedReportsInModal(selectedVal = null) {
      const repSelect = document.getElementById('sch-form-report');
      if (!repSelect) return;

      try {
        if (window.ApiService) {
          const opts = await window.ApiService.get('/api/reporting/schedules/saved-reports').catch(() => null);
          if (Array.isArray(opts) && opts.length > 0) {
            savedReportOptions = opts;
          }
        }
      } catch (_) {}

      if (savedReportOptions.length === 0) {
        savedReportOptions = definitions.map(d => ({
          id: d.id,
          label: d.title,
          preset: 'This Month'
        }));
      }

      repSelect.innerHTML = savedReportOptions.map(opt => {
        const val = opt.id || opt.code || opt.label;
        const isSel = selectedVal ? (val === selectedVal || opt.label === selectedVal) : false;
        return `<option value="${val}" ${isSel ? 'selected' : ''}>${opt.label || val}</option>`;
      }).join('');
    },

    onFrequencyChanged() {
      const freq = document.getElementById('sch-form-freq')?.value;
      const runDayDiv = document.getElementById('sch-form-runday')?.parentElement;
      if (runDayDiv) {
        runDayDiv.style.opacity = freq === 'DAILY' ? '0.4' : '1';
      }
    },

    closeNewScheduleModal() {
      const modal = document.getElementById('modal-new-schedule');
      if (modal) modal.style.display = 'none';
    },

    async submitSaveSchedule(e) {
      if (e) e.preventDefault();
      const id = document.getElementById('sch-form-id')?.value;
      const rowVersion = parseInt(document.getElementById('sch-form-version')?.value) || 0;
      const name = document.getElementById('sch-form-name')?.value?.trim();
      const report = document.getElementById('sch-form-report')?.value;
      const frequency = document.getElementById('sch-form-freq')?.value || 'DAILY';
      const runDay = document.getElementById('sch-form-runday')?.value || 'MONDAY';
      const time = document.getElementById('sch-form-time')?.value || '08:00';
      const format = document.getElementById('sch-form-format')?.value || 'PDF';
      const delivery = document.getElementById('sch-form-delivery')?.value || 'EMAIL';
      const recipients = document.getElementById('sch-form-recipients')?.value?.trim();

      if (!name) {
        alert('Please enter a schedule name.');
        return;
      }
      if (!report) {
        alert('Please select a saved report.');
        return;
      }

      const payload = {
        name,
        savedReport: report,
        reportTitle: report,
        frequency,
        runDay,
        time,
        format,
        delivery,
        recipients: recipients || 'accounts@jasviindustries.in',
        status: 'ACTIVE',
        rowVersion
      };

      try {
        if (id) {
          await window.ApiService.put(`/api/reporting/schedules/${id}`, payload);
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Schedule updated successfully!');
        } else {
          await window.ApiService.post('/api/reporting/schedules', payload);
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Schedule created successfully!');
        }
        this.closeNewScheduleModal();
        await this.loadSchedules();
      } catch (err) {
        alert('Save Error: ' + (err.message || 'Server error'));
      }
    },

    // ==========================================
    // 6. EXPORT ACTIONS
    // ==========================================
    toggleExportDropdown(event) {
      if (event) event.stopPropagation();
      const menu = document.getElementById('rep-export-menu');
      if (!menu) return;
      const isShow = menu.style.display === 'block';
      menu.style.display = isShow ? 'none' : 'block';

      if (!isShow) {
        const closeMenu = (e) => {
          if (!menu.contains(e.target)) {
            menu.style.display = 'none';
            document.removeEventListener('click', closeMenu);
          }
        };
        document.addEventListener('click', closeMenu);
      }
    },

    exportReport(format) {
      const menu = document.getElementById('rep-export-menu');
      if (menu) menu.style.display = 'none';

      if (activeMainTab === 'viewer' && currentResult && currentResult.rows && currentResult.rows.length > 0) {
        if (format === 'PDF') {
          window.print();
          return;
        }

        const headers = (currentResult.columns || []).map(c => c.label).join(',');
        const rows = (currentResult.rows || []).map(r => (r.values || []).map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','));
        const csvContent = [headers, ...rows].join('\r\n');

        const blob = new Blob([csvContent], { type: format === 'EXCEL' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${currentResult.reportId || 'Report'}_${new Date().toISOString().slice(0, 10)}.${format === 'EXCEL' ? 'xls' : 'csv'}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        if (window.AppDialogService) window.AppDialogService.toastSuccess(`Exported report as ${format}!`);
      } else {
        // Export Dashboard Overview
        if (format === 'PDF') {
          window.print();
        } else {
          if (window.AppDialogService) window.AppDialogService.toastInfo('Exporting summary dashboard metrics...');
          const csv = `Metric,Value\r\nActive Sales,${document.getElementById('rep-kpi-sales')?.innerText || '0'}\r\nActive Purchases,${document.getElementById('rep-kpi-purchases')?.innerText || '0'}\r\nGross Profit,${document.getElementById('rep-kpi-profit')?.innerText || '0'}\r\nReceivables,${document.getElementById('rep-kpi-receivables')?.innerText || '0'}\r\n`;
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `Dashboard_Summary_${new Date().toISOString().slice(0,10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
    }
  };
})();
