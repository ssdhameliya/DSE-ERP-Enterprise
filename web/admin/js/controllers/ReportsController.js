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
  let favoriteReportIds = new Set(['SALES_REGISTER', 'PURCHASE_REGISTER', 'PROFITABILITY', 'GST_TAX']);
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

  // Saved Reports Catalog State
  let allSavedReports = [];
  let savedReportsSearchQuery = '';
  let activeViewerSubView = 'viewer';

  const FALLBACK_DEFINITIONS = [
    { id: 'SALES_REGISTER', title: 'Sales Register', category: 'SALES', description: 'Comprehensive sales invoices, taxable value, GST split, and customer breakdown.', icon: '🛒', supportedFilters: ['party', 'item', 'salesperson', 'status', 'payment', 'gstrate', 'amount'] },
    { id: 'PURCHASE_REGISTER', title: 'Purchase Register', category: 'PURCHASE', description: 'Procurement bills, supplier input tax credit, and payable breakdown.', icon: '📦', supportedFilters: ['party', 'item', 'status', 'payment', 'gstrate', 'amount'] },
    { id: 'SALES_BY_CUSTOMER', title: 'Sales by Customer', category: 'SALES', description: 'Consolidated customer sales revenues, invoice counts, and payment trends.', icon: '👥', supportedFilters: ['party', 'salesperson', 'amount'] },
    { id: 'SALES_BY_ITEM', title: 'Sales by Item', category: 'SALES', description: 'Product sales turnover, quantity sold, and average realizable price.', icon: '🏷️', supportedFilters: ['item', 'party', 'amount'] },
    { id: 'PURCHASE_BY_SUPPLIER', title: 'Purchase by Supplier', category: 'PURCHASE', description: 'Vendor procurement volumes, bill amounts, and pending balances.', icon: '🏭', supportedFilters: ['party', 'amount'] },
    { id: 'PURCHASE_BY_ITEM', title: 'Purchase by Item', category: 'PURCHASE', description: 'Inward item purchases, unit costs, and quantity received.', icon: '📥', supportedFilters: ['item', 'party', 'amount'] },
    { id: 'RETURNS_ANALYSIS', title: 'Returns Analysis', category: 'RETURNS', description: 'Approved sales and purchase returns, rejection notes, and refund settlement.', icon: '↩️', supportedFilters: ['party', 'item', 'status', 'amount'] },
    { id: 'GST_TAX', title: 'GST / Tax Report (GSTR-3B)', category: 'GST / TAX', description: 'Forward tax liability vs Inward ITC claim for GSTR-3B monthly filing.', icon: '🏛️', supportedFilters: ['party', 'item', 'gstrate'] },
    { id: 'RECEIVABLE_AGEING', title: 'Receivable Ageing', category: 'RECEIVABLE', description: 'Customer overdue invoices partitioned into 0-30, 31-60, 61-90, 90+ buckets.', icon: '⏳', supportedFilters: ['party', 'salesperson', 'payment', 'amount'] },
    { id: 'PAYABLE_AGEING', title: 'Payable Ageing', category: 'PAYABLE', description: 'Supplier outstanding balances grouped by payment due dates and terms.', icon: '⌛', supportedFilters: ['party', 'payment', 'amount'] },
    { id: 'STOCK_SUMMARY', title: 'Inventory / Stock Summary', category: 'INVENTORY', description: 'Current warehouse stock levels, moving average cost, and physical valuation.', icon: '📊', supportedFilters: ['item', 'amount'] },
    { id: 'ITEM_LEDGER', title: 'Item Movement Ledger', category: 'INVENTORY', description: 'Inward, outward, opening, and closing stock balance movement trail.', icon: '📋', supportedFilters: ['item', 'party'] },
    { id: 'BANK_RECONCILIATION', title: 'Banking / Reconciliation', category: 'BANKING', description: 'Matched, unmatched, suggested, and manual journal reconciliation report.', icon: '🏦', supportedFilters: ['status', 'amount'] },
    { id: 'PROFITABILITY', title: 'Profitability Analysis', category: 'PROFITABILITY', description: 'Gross profit margins, COGS, selling revenues, and margin percentage.', icon: '💰', supportedFilters: ['item', 'party', 'salesperson', 'amount'] }
  ];

  function formatMoney(val) {
    if (window.FormatUtil && window.FormatUtil.formatRupees) {
      return window.FormatUtil.formatRupees(val);
    }
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
    } catch {
      return dStr;
    }
  }

  function formatTimestamp(tStr) {
    if (!tStr) return '-';
    if (window.FormatUtil && window.FormatUtil.formatDateTime) {
      return window.FormatUtil.formatDateTime(tStr);
    }
    return formatDate(tStr);
  }

  function semanticForColumn(key) {
    const k = (key || '').toLowerCase();
    if (k.includes('date') || k.includes('month') || k.includes('period')) return 'calendar';
    if (k.includes('customer') || k.includes('party')) return 'customer';
    if (k.includes('supplier')) return 'supplier';
    if (k.includes('item') || k.includes('quantity') || k.includes('qty')) return 'item';
    if (k.includes('gst') || k.includes('tax')) return 'tax';
    if (k.includes('status')) return 'status';
    if (k.includes('amount') || k.includes('total') || k.includes('paid') || k.includes('outstanding') || k.includes('profit') || k.includes('cost') || k.includes('value') || k.includes('price')) return 'currency';
    if (k.includes('invoice') || k.includes('reference') || k.includes('document') || k.includes('bill') || k.includes('number')) return 'document';
    if (k.includes('bank')) return 'bank';
    return 'report';
  }

  function iconForSemantic(sem) {
    switch (sem) {
      case 'calendar': return '📅';
      case 'customer': return '👥';
      case 'supplier': return '🏭';
      case 'item': return '🏷️';
      case 'tax': return '🏛️';
      case 'status': return '⚡';
      case 'currency': return '💰';
      case 'document': return '📄';
      case 'bank': return '🏦';
      default: return '📊';
    }
  }

  function colourForSemantic(sem) {
    switch (sem) {
      case 'calendar': return 'purple';
      case 'customer': return 'blue';
      case 'supplier': return 'indigo';
      case 'item': return 'orange';
      case 'tax': return 'orange';
      case 'status': return 'purple';
      case 'currency': return 'green';
      case 'document': return 'purple';
      case 'bank': return 'blue';
      default: return 'teal';
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
      // Set initial dates for "This Month" FIRST before loading, so inputs always have values
      const defDates = calculatePresetDates('This Month');
      if (defDates) {
        const fEl = document.getElementById('rep-dash-from');
        const tEl = document.getElementById('rep-dash-to');
        if (fEl && !fEl.value) fEl.value = defDates.from;
        if (tEl && !tEl.value) tEl.value = defDates.to;

        const vfEl = document.getElementById('v-filter-from');
        const vtEl = document.getElementById('v-filter-to');
        if (vfEl && !vfEl.value) vfEl.value = defDates.from;
        if (vtEl && !vtEl.value) vtEl.value = defDates.to;
      }

      try {
        await Promise.allSettled([
          this.loadSavedFavorites(),
          this.loadFilterOptions(),
          this.loadDefinitions(),
          this.loadSavedReports()
        ]);
      } catch (e) {
        console.warn('[ReportsController] Non-fatal init load error:', e);
      }

      this.renderCategoryPills();
      this.populateViewerSavedDropdown();

      await this.applyDashboardFilters();
    },

    async loadSavedFavorites() {
      try {
        if (window.ApiService) {
          const views = await window.ApiService.get('/api/support/saved-views?screen=REPORT_FAVORITES').catch(() => null);
          if (Array.isArray(views)) {
            const serverFavs = new Set();
            for (const v of views) {
              if (v && v.name === '__favorites__' && v.data) {
                v.data.split(',').forEach(id => {
                  const trimmed = id.trim();
                  if (trimmed) serverFavs.add(trimmed);
                });
              }
            }
            // Canonical Server Sync: unconditionally reflect server favorites
            favoriteReportIds = serverFavs;
            try {
              localStorage.setItem('dse_fav_reports', JSON.stringify(Array.from(favoriteReportIds)));
            } catch (_) {}
            this.renderCategoryPills();
            if (activeCenterCategory === 'FAVORITES') {
              this.renderReportCards();
            }
            return;
          }
        }
      } catch (_) {}

      // Fallback: localStorage if server unavailable
      try {
        const saved = localStorage.getItem('dse_fav_reports');
        if (saved) {
          const arr = JSON.parse(saved);
          if (Array.isArray(arr)) {
            favoriteReportIds = new Set(arr);
            this.renderCategoryPills();
            if (activeCenterCategory === 'FAVORITES') {
              this.renderReportCards();
            }
          }
        }
      } catch (_) {}
    },

    async persistFavorites() {
      try {
        const payload = Array.from(favoriteReportIds).join(',');
        localStorage.setItem('dse_fav_reports', JSON.stringify(Array.from(favoriteReportIds)));
        if (window.ApiService) {
          await window.ApiService.post('/api/support/saved-views', {
            screen: 'REPORT_FAVORITES',
            name: '__favorites__',
            data: payload
          }).catch(err => console.warn('[ReportsController] POST /api/support/saved-views REPORT_FAVORITES failed:', err));
        }
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
        this.loadSavedFavorites().then(() => this.renderReportCards());
      } else if (tabName === 'viewer') {
        if (titleEl) titleEl.innerText = this.currentDefinition?.title || 'Report Viewer';
        if (descEl) descEl.innerText = this.currentDefinition?.description || 'Dynamic tabular report viewer with multi-level filtering and export capabilities';
        if (pageIcon) pageIcon.innerText = this.currentDefinition?.icon || '📊';
        this.populateViewerSavedDropdown();
        this.loadSavedReports();
        this.reflowViewerFilterGrid();
        if (!currentResult) this.applyViewerFilters();
      } else if (tabName === 'scheduler') {
        if (titleEl) titleEl.innerText = 'Scheduled Reports';
        if (descEl) descEl.innerText = 'Server-side schedules built from Saved Reports with dynamic date presets and delivery history';
        if (pageIcon) pageIcon.innerText = '⏱️';
        this.loadSchedules();
      }
    },

    async handleRefreshAction(event) {
      const btn = (event && event.currentTarget) || document.querySelector('button[onclick*="handleRefreshAction"]');
      let origHtml = '↻ Refresh';
      if (btn) {
        origHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner" style="display:inline-block; width:12px; height:12px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.6s linear infinite; margin-right:6px; vertical-align:middle;"></span> Refreshing...';
      }

      try {
        if (activeMainTab === 'dashboard') {
          await this.applyDashboardFilters();
        } else if (activeMainTab === 'center') {
          await Promise.all([this.loadDefinitions(), this.loadSavedFavorites()]);
          this.renderReportCards();
        } else if (activeMainTab === 'viewer') {
          await this.loadSavedReports();
          await this.applyViewerFilters();
        } else if (activeMainTab === 'scheduler') {
          await this.loadSchedules();
        }

        if (window.AudioSynthesizer && window.AudioSynthesizer.playSuccess) {
          window.AudioSynthesizer.playSuccess();
        }
        if (window.AppDialogService && window.AppDialogService.toastSuccess) {
          window.AppDialogService.toastSuccess('Report data refreshed.');
        }
      } catch (err) {
        console.error('[ReportsController] handleRefreshAction failed:', err);
        if (window.AppDialogService && window.AppDialogService.toastError) {
          window.AppDialogService.toastError('Failed to refresh report data: ' + (err.message || err));
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origHtml;
        }
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
      this.switchViewerSubView('viewer');
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

      this.configureFilterVisibility(def);
    },

    configureFilterVisibility(defOrId) {
      let def = defOrId;
      if (!def || typeof def === 'string') {
        const id = def || currentReportId;
        def = definitions.find(d => d.id === id) || this.currentDefinition || definitions[0];
      }
      if (!def) return;

      const supported = new Set((def.supportedFilters || ['party', 'item', 'status', 'amount']).map(f => (f || '').toString().trim().toUpperCase()));
      const fallback = supported.size === 0;

      const toggleBox = (id, show) => {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? 'block' : 'none';
      };

      const showPeriod = fallback || supported.has('PERIOD') || supported.has('DATE');
      toggleBox('box-v-period', showPeriod);
      toggleBox('box-v-from', showPeriod);
      toggleBox('box-v-to', showPeriod);

      toggleBox('box-v-party', fallback || supported.has('PARTY') || supported.has('CUSTOMER') || supported.has('SUPPLIER'));
      toggleBox('box-v-item', fallback || supported.has('ITEM'));
      toggleBox('box-v-salesperson', fallback || supported.has('SALESPERSON'));
      toggleBox('box-v-docstatus', fallback || supported.has('DOCUMENT STATUS') || supported.has('STATUS'));
      toggleBox('box-v-payment', fallback || supported.has('PAYMENT STATUS') || supported.has('PAYMENT'));
      toggleBox('box-v-returns', fallback || supported.has('RETURN STATUS') || supported.has('RETURNS'));
      toggleBox('box-v-gstrate', fallback || supported.has('GST RATE') || supported.has('GSTRATE'));

      const showAmount = fallback || supported.has('AMOUNT');
      toggleBox('box-v-minamt', showAmount);
      toggleBox('box-v-maxamt', showAmount);
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

      const numMin = (minAmount && !isNaN(parseFloat(minAmount))) ? parseFloat(minAmount) : null;
      const numMax = (maxAmount && !isNaN(parseFloat(maxAmount))) ? parseFloat(maxAmount) : null;

      // 100% Server ReportingDtos.ReportRequest contract matching
      const req = {
        reportId: def?.id || currentReportId,
        from: from || null,
        to: to || null,
        party: (party && !party.startsWith('All')) ? party : null,
        item: (item && !item.startsWith('All')) ? item : null,
        salesperson: (salesperson && !salesperson.startsWith('All')) ? salesperson : null,
        documentStatus: (status && !status.startsWith('All')) ? status.toUpperCase() : null,
        paymentStatus: (paymentStatus && !paymentStatus.startsWith('All')) ? paymentStatus.toUpperCase() : null,
        returnStatus: (returnStatus && !returnStatus.startsWith('All')) ? returnStatus.toUpperCase() : null,
        gstRate: (gstRate && !gstRate.startsWith('All')) ? gstRate : null,
        warehouse: null,
        bankStatus: null,
        search: viewerSearchQuery ? viewerSearchQuery.trim() : null,
        groupBy: (groupBy && groupBy !== 'None') ? groupBy : null,
        sortKey: (sortBy || 'date').toLowerCase(),
        sortDirection: sortDirection === 'Ascending' ? 'ASC' : 'DESC',
        minAmount: numMin,
        maxAmount: numMax,
        page: viewerPage || 0,
        size: viewerPageSize || 25,
        visibleColumns: []
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

      // Render Header with single canonical colorful semantic badge (Image 1 / Image 2 Parity)
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th style="width:40px; text-align:center;" data-erp-header-enhanced="true">
              <span style="font-weight:700; color:var(--text-muted); font-size:0.75rem;">#</span>
            </th>
            ${cols.map(c => {
              const sem = semanticForColumn(c.key || c.label);
              const icon = iconForSemantic(sem);
              const colour = colourForSemantic(sem);
              const isRight = c.align === 'RIGHT' || c.numeric;
              return `
                <th style="${isRight ? 'text-align:right;' : ''}" data-erp-header-enhanced="true" class="erp-th-theme-${colour}">
                  <div class="erp-th-badge erp-th-${colour}" style="${isRight ? 'margin-left:auto;' : ''}">
                    <span class="erp-th-icon">${icon}</span>
                    <span class="erp-th-label">${c.label}</span>
                  </div>
                </th>
              `;
            }).join('')}
          </tr>
        `;
      }

      // Render Rows with rich formatting
      if (tbody) {
        if (rows.length === 0) {
          tbody.innerHTML = `<tr><td colspan="${cols.length + 1}" style="text-align:center; padding:32px; color:var(--text-dim);">No transactions found matching criteria.</td></tr>`;
        } else {
          tbody.innerHTML = rows.map((r, rIdx) => {
            const rowRef = r.referenceNo || r.reference || r.number || (r.values && r.values[0]) || '';
            return `
              <tr data-row-idx="${rIdx}" data-ref="${rowRef}" onclick="window.ReportsController.onViewerRowClick(${rIdx}, this)" style="cursor:pointer;">
                <td style="text-align:center; color:var(--text-muted); font-size:0.72rem;">${viewerPage * viewerPageSize + rIdx + 1}</td>
                ${(r.values || []).map((val, cIdx) => {
                  const col = cols[cIdx];
                  const isRight = col && (col.align === 'RIGHT' || col.numeric);
                  const isMono = col && (col.type === 'CODE' || col.type === 'NUMBER' || (val && /^[A-Z0-9\/-]+$/.test(val)));

                  let displayVal = val != null ? val : '-';
                  let cellColor = isMono ? 'color:var(--cyan);' : '';

                  if (val != null && val !== '') {
                    const colKey = (col?.key || '').toLowerCase();
                    const colType = (col?.type || '').toUpperCase();

                    if (colType === 'DATE' || colKey.includes('date')) {
                      displayVal = formatDate(val);
                    } else if (colType === 'DATETIME' || colKey.includes('time') || colKey.includes('timestamp')) {
                      displayVal = formatTimestamp(val);
                    } else if (colType === 'MONEY' || colKey.includes('amount') || colKey.includes('total') || colKey.includes('taxable') || colKey.includes('price') || colKey.includes('profit') || colKey.includes('cost')) {
                      displayVal = isNaN(parseFloat(val)) ? val : formatMoney(val);
                      if (colKey.includes('profit') || colKey.includes('margin')) cellColor = 'color:var(--accent-green, #22c55e);';
                      else if (colKey.includes('purchase') || colKey.includes('cost') || colKey.includes('expense')) cellColor = 'color:var(--accent-orange, #f97316);';
                      else cellColor = 'color:var(--cyan, #38bdf8);';
                    } else if (colType === 'PERCENT' || colKey.includes('margin_percent') || colKey.includes('margin_rate')) {
                      displayVal = !isNaN(parseFloat(val)) ? (parseFloat(val).toFixed(2) + '%') : val;
                      cellColor = 'color:var(--accent-green, #22c55e);';
                    } else if (colType === 'STATUS' || colKey.includes('status')) {
                      let badgeClass = 'pill-neutral';
                      const uVal = String(val).toUpperCase();
                      if (uVal.includes('PAID') || uVal.includes('APPROVED') || uVal.includes('ACTIVE') || uVal.includes('CONFIRMED')) badgeClass = 'pill-success';
                      else if (uVal.includes('PENDING') || uVal.includes('PARTIAL') || uVal.includes('PAUSED')) badgeClass = 'pill-warning';
                      else if (uVal.includes('OVERDUE') || uVal.includes('CANCELLED') || uVal.includes('REJECTED') || uVal.includes('FAILED')) badgeClass = 'pill-danger';
                      displayVal = `<span class="pill-badge ${badgeClass}" style="font-size:0.7rem;">${val}</span>`;
                    }
                  }

                  return `
                    <td style="${isRight ? 'text-align:right; font-weight:600;' : ''} ${isMono ? 'font-family:monospace;' : ''} ${cellColor}">
                      ${displayVal}
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
        if (res.totals && (Array.isArray(res.totals) ? res.totals.length > 0 : Object.keys(res.totals).length > 0)) {
          const totalsMap = Array.isArray(res.totals) ? null : res.totals;
          tfoot.innerHTML = `
            <tr style="font-weight:700; background:rgba(255,255,255,0.06); border-top:2px solid var(--border-subtle); color:var(--text-main);">
              <td style="text-align:center; font-weight:800;">TOTAL</td>
              ${cols.map((col, idx) => {
                const isRight = col && (col.align === 'RIGHT' || col.numeric);
                let totVal = '';
                if (totalsMap) {
                  totVal = totalsMap[col.key] || totalsMap[col.label] || '';
                } else if (Array.isArray(res.totals)) {
                  totVal = res.totals[idx] || '';
                }
                return `<td style="${isRight ? 'text-align:right; font-weight:700;' : ''}">${totVal != null ? totVal : ''}</td>`;
              }).join('')}
            </tr>
          `;
        } else {
          tfoot.innerHTML = '';
        }
      }

      const viewerTable = document.getElementById('viewer-table');
      if (viewerTable) {
        if (window.TableUiEnhancer) {
          window.TableUiEnhancer.enhance(viewerTable);
        }
        if (window.DynamicTableLayoutManager) {
          window.DynamicTableLayoutManager.requestLayout(viewerTable);
        }
      }
    },

    async fallbackViewerExecution(req) {
      // Client-side fallback dynamic report rendering
      let rows = [];
      let cols = [];

      if (req.reportId.includes('PURCHASE')) {
        cols = [
          { key: 'billNumber', label: 'Bill No.', align: 'LEFT', type: 'CODE' },
          { key: 'billDate', label: 'Date', align: 'LEFT', type: 'DATE' },
          { key: 'supplierName', label: 'Supplier', align: 'LEFT' },
          { key: 'taxableAmount', label: 'Taxable (₹)', align: 'RIGHT', type: 'MONEY' },
          { key: 'totalAmount', label: 'Total (₹)', align: 'RIGHT', type: 'MONEY' },
          { key: 'paymentStatus', label: 'Status', align: 'LEFT', type: 'STATUS' }
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
              p.taxableAmount || 0,
              p.totalAmount || p.total || 0,
              p.paymentStatus || 'CONFIRMED'
            ]
          }));
        }
      } else {
        cols = [
          { key: 'invoiceNumber', label: 'Invoice No.', align: 'LEFT', type: 'CODE' },
          { key: 'invoiceDate', label: 'Date', align: 'LEFT', type: 'DATE' },
          { key: 'customerName', label: 'Customer', align: 'LEFT' },
          { key: 'taxableAmount', label: 'Taxable (₹)', align: 'RIGHT', type: 'MONEY' },
          { key: 'totalAmount', label: 'Total (₹)', align: 'RIGHT', type: 'MONEY' },
          { key: 'paymentStatus', label: 'Status', align: 'LEFT', type: 'STATUS' }
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
              s.taxableAmount || 0,
              s.totalAmount || s.total || 0,
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
      const def = this.currentDefinition || definitions[0];
      const title = def ? def.title : 'Executive Report';
      const cols = currentResultColumns || [];
      const rows = currentResultRows || [];
      if (cols.length > 0 && rows.length > 0 && window.FormatUtil && window.FormatUtil.downloadTablePdf) {
        window.FormatUtil.downloadTablePdf(title, cols.map(c => c.label || c.key), rows.map(r => r.values || r), `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      } else {
        window.print();
      }
    },

    async saveCurrentReportConfig() {
      const def = this.currentDefinition || definitions[0];
      const preset = document.getElementById('v-filter-period')?.value || 'This Month';
      const defaultName = `${def?.title || 'Report'} (${preset})`;
      const name = await (window.AppDialogService && typeof window.AppDialogService.prompt === 'function'
        ? window.AppDialogService.prompt('Save Report Preset', 'Configuration Name', 'Enter a name for this Saved Report configuration:', defaultName)
        : Promise.resolve(prompt('Enter a name for this Saved Report configuration:', defaultName)));
      if (!name || typeof name !== 'string' || !name.trim()) return;

      const fVal = document.getElementById('v-filter-from')?.value || '';
      const tVal = document.getElementById('v-filter-to')?.value || '';
      const pVal = document.getElementById('v-filter-party')?.value || '';
      const iVal = document.getElementById('v-filter-item')?.value || '';
      const sVal = document.getElementById('v-filter-salesperson')?.value || '';
      const docVal = document.getElementById('v-filter-docstatus')?.value || '';
      const payVal = document.getElementById('v-filter-payment')?.value || '';
      const retVal = document.getElementById('v-filter-returns')?.value || '';
      const gstVal = document.getElementById('v-filter-gstrate')?.value || '';
      const minVal = document.getElementById('v-filter-minamt')?.value || '';
      const maxVal = document.getElementById('v-filter-maxamt')?.value || '';
      const grpVal = document.getElementById('viewer-groupby')?.value || 'None';
      const sortVal = document.getElementById('viewer-sortby')?.value || 'Date';
      const dirVal = document.getElementById('viewer-direction')?.value || 'Descending';

      const req = {
        reportId: def?.id || currentReportId,
        from: fVal,
        to: tVal,
        party: pVal,
        item: iVal,
        salesperson: sVal,
        documentStatus: docVal,
        paymentStatus: payVal,
        returnStatus: retVal,
        gstRate: gstVal,
        warehouse: null,
        bankStatus: null,
        minAmount: minVal ? parseFloat(minVal) : null,
        maxAmount: maxVal ? parseFloat(maxVal) : null,
        groupBy: grpVal,
        sortKey: sortVal.toLowerCase(),
        sortDirection: dirVal === 'Ascending' ? 'ASC' : 'DESC',
        search: viewerSearchQuery || '',
        page: 0,
        size: viewerPageSize || 25,
        visibleColumns: []
      };

      const payload = "REPORT_V2:" + JSON.stringify({
        version: 2,
        name: name.trim(),
        datePreset: preset,
        request: req
      });

      try {
        if (window.ApiService) {
          await window.ApiService.post('/api/support/saved-views', {
            screen: 'REPORT_CENTER',
            name: name.trim(),
            data: payload
          });
        }
        if (window.AudioSynthesizer && window.AudioSynthesizer.playSuccess) {
          window.AudioSynthesizer.playSuccess();
        }
        if (window.AppDialogService && window.AppDialogService.toastSuccess) {
          window.AppDialogService.toastSuccess(`Saved Report '${name.trim()}' persisted to server! Dynamic date preset '${preset}' will advance automatically.`);
        } else {
          alert(`Saved Report '${name.trim()}' persisted to server!`);
        }
        await this.loadSavedReports();
      } catch (err) {
        console.error('[ReportsController] saveCurrentReportConfig failed:', err);
        if (window.AppDialogService && window.AppDialogService.toastError) {
          window.AppDialogService.toastError('Failed to save report: ' + (err.message || err));
        } else {
          alert('Failed to save report to server: ' + (err.message || err));
        }
      }
    },

    async loadSavedReports() {
      const DEFAULT_SAVED_PRESETS = [
        {
          name: 'Sales Register - This Month',
          baseReport: 'Sales Register',
          datePreset: 'This Month',
          grouping: 'None',
          sorting: 'Date ↓',
          columns: 'Standard',
          status: 'Default Preset',
          request: {
            reportId: 'SALES_REGISTER',
            datePreset: 'This Month',
            groupBy: 'None',
            sortKey: 'date',
            sortDirection: 'DESC'
          }
        },
        {
          name: 'Purchase Register - This Month',
          baseReport: 'Purchase Register',
          datePreset: 'This Month',
          grouping: 'None',
          sorting: 'Date ↓',
          columns: 'Standard',
          status: 'Default Preset',
          request: {
            reportId: 'PURCHASE_REGISTER',
            datePreset: 'This Month',
            groupBy: 'None',
            sortKey: 'date',
            sortDirection: 'DESC'
          }
        },
        {
          name: 'Stock Summary',
          baseReport: 'Stock Summary',
          datePreset: 'This Month',
          grouping: 'None',
          sorting: 'Item ↑',
          columns: 'Standard',
          status: 'Default Preset',
          request: {
            reportId: 'STOCK_SUMMARY',
            datePreset: 'This Month',
            groupBy: 'None',
            sortKey: 'item',
            sortDirection: 'ASC'
          }
        },
        {
          name: 'Receivables Aging',
          baseReport: 'Receivable Ageing',
          datePreset: 'This Month',
          grouping: 'None',
          sorting: 'Party ↑',
          columns: 'Standard',
          status: 'Default Preset',
          request: {
            reportId: 'RECEIVABLE_AGEING',
            datePreset: 'This Month',
            groupBy: 'None',
            sortKey: 'party',
            sortDirection: 'ASC'
          }
        },
        {
          name: 'GST Tax Summary',
          baseReport: 'GST Tax Summary',
          datePreset: 'This Month',
          grouping: 'None',
          sorting: 'Date ↓',
          columns: 'Standard',
          status: 'Default Preset',
          request: {
            reportId: 'GST_TAX',
            datePreset: 'This Month',
            groupBy: 'None',
            sortKey: 'date',
            sortDirection: 'DESC'
          }
        },
        {
          name: 'Profitability Analysis',
          baseReport: 'Profitability Analysis',
          datePreset: 'This Month',
          grouping: 'None',
          sorting: 'Date ↓',
          columns: 'Standard',
          status: 'Default Preset',
          request: {
            reportId: 'PROFITABILITY',
            datePreset: 'This Month',
            groupBy: 'None',
            sortKey: 'date',
            sortDirection: 'DESC'
          }
        }
      ];

      try {
        allSavedReports = [];
        if (window.ApiService) {
          const views = await window.ApiService.get('/api/support/saved-views?screen=REPORT_CENTER').catch(() => null);
          if (Array.isArray(views)) {
            for (const v of views) {
              if (!v || !v.name) continue;
              let config = null;
              let req = null;
              let preset = 'Custom';
              const rawData = typeof v.data === 'string' ? v.data.trim() : '';

              if (rawData.startsWith('REPORT_V2:')) {
                try {
                  config = JSON.parse(rawData.slice('REPORT_V2:'.length));
                  req = config?.request;
                  preset = config?.datePreset || 'Custom';
                } catch (e) {
                  console.warn('[ReportsController] Failed to parse REPORT_V2 JSON for view:', v.name, e);
                }
              } else if (rawData.startsWith('{')) {
                try {
                  config = JSON.parse(rawData);
                  req = config?.request || config;
                  preset = config?.datePreset || 'Custom';
                } catch (e) {
                  console.warn('[ReportsController] Failed to parse raw JSON view:', v.name, e);
                }
              } else if (rawData.includes('|')) {
                const parts = rawData.split('|');
                if (parts.length >= 6) {
                  const repId = parts[0].trim().toUpperCase() === 'PURCHASE' ? 'PURCHASE_REGISTER' :
                    parts[0].trim().toUpperCase() === 'INVENTORY' ? 'STOCK_SUMMARY' :
                    parts[0].trim().toUpperCase() === 'PAYMENTS' ? 'RECEIVABLE_AGEING' : 'SALES_REGISTER';
                  req = {
                    reportId: repId,
                    from: parts[4] || '',
                    to: parts[5] || '',
                    party: parts[1] === 'ALL' ? '' : parts[1] || '',
                    item: parts[2] === 'ALL' ? '' : parts[2] || '',
                    salesperson: parts[3] === 'ALL' ? '' : parts[3] || '',
                    groupBy: 'None',
                    sortKey: 'date',
                    sortDirection: 'DESC'
                  };
                  preset = 'Custom';
                }
              }

              if (req) {
                const normReq = {
                  reportId: req.reportId || 'SALES_REGISTER',
                  from: req.from || req.fromDate || '',
                  to: req.to || req.toDate || '',
                  party: req.party || '',
                  item: req.item || '',
                  salesperson: req.salesperson || '',
                  documentStatus: req.documentStatus || req.status || '',
                  paymentStatus: req.paymentStatus || '',
                  returnStatus: req.returnStatus || '',
                  gstRate: req.gstRate || '',
                  minAmount: req.minAmount != null ? req.minAmount : null,
                  maxAmount: req.maxAmount != null ? req.maxAmount : null,
                  groupBy: req.groupBy || 'None',
                  sortKey: req.sortKey || req.sortBy || 'date',
                  sortDirection: req.sortDirection || 'DESC',
                  search: req.search || '',
                  page: req.page || 0,
                  size: req.size || 25,
                  visibleColumns: req.visibleColumns || []
                };

                const def = definitions.find(d => d.id === normReq.reportId);
                const baseTitle = def?.title || normReq.reportId;
                const group = normReq.groupBy && normReq.groupBy !== 'None' ? normReq.groupBy : 'None';
                const sortStr = (normReq.sortKey || 'Date') + ' ' + (normReq.sortDirection === 'ASC' ? '↑' : '↓');
                const cols = normReq.visibleColumns && normReq.visibleColumns.length > 0 ? `${normReq.visibleColumns.length} selected` : 'Standard';

                allSavedReports.push({
                  name: v.name,
                  baseReport: baseTitle,
                  datePreset: preset,
                  grouping: group,
                  sorting: sortStr,
                  columns: cols,
                  status: 'Saved',
                  request: normReq,
                  raw: v
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('[ReportsController] loadSavedReports failed:', err);
      }

      if (allSavedReports.length === 0) {
        allSavedReports = DEFAULT_SAVED_PRESETS.map(p => ({
          ...p,
          raw: null
        }));
      }

      this.renderSavedReportsTable();
      this.populateViewerSavedDropdown();
    },

    renderSavedReportsTable() {
      const tbody = document.getElementById('saved-reports-tbody');
      if (!tbody) return;

      let list = allSavedReports;
      if (savedReportsSearchQuery) {
        const q = savedReportsSearchQuery.toLowerCase();
        list = list.filter(r =>
          (r.name || '').toLowerCase().includes(q) ||
          (r.baseReport || '').toLowerCase().includes(q) ||
          (r.datePreset || '').toLowerCase().includes(q) ||
          (r.grouping || '').toLowerCase().includes(q)
        );
      }

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--text-dim);">No saved reports found. Configure report filters in Viewer and click "Save Report".</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map((r, idx) => `
        <tr>
          <td style="font-weight:700; color:var(--text-main);">${r.name}</td>
          <td style="color:var(--cyan); font-weight:600;">${r.baseReport}</td>
          <td><span class="pill-badge pill-purple" style="font-size:0.7rem;">${r.datePreset}</span></td>
          <td>${r.grouping}</td>
          <td>${r.sorting}</td>
          <td>${r.columns}</td>
          <td><span class="pill-badge pill-success" style="font-size:0.7rem;">Ready</span></td>
          <td style="text-align:center; position:relative;" onclick="event.stopPropagation()">
            <div class="action-cell-container" style="position:relative; display:inline-block;">
              <button class="btn-purple" onclick="window.ReportsController.toggleSavedReportActionMenu(${idx}, event)" style="height:28px; padding:0 10px; font-size:0.74rem; font-weight:600;" title="View Actions Menu">
                ::: Actions &#9660;
              </button>
              <div class="action-menu-dropdown action-dropdown-menu" id="saved-report-action-menu-${idx}" style="display:none; position:absolute; right:0; top:100%; z-index:9999; min-width:160px; padding:4px 0; text-align:left;">
                <div class="action-menu-item" onclick="window.ReportsController.applySavedReportByIndex(${idx})">
                  <span style="margin-right:8px;">👁️</span> Open Report
                </div>
                <div class="action-menu-item" onclick="window.ReportsController.scheduleSavedReportByIndex(${idx})">
                  <span style="margin-right:8px;">📅</span> Schedule Report
                </div>
              </div>
            </div>
          </td>
        </tr>
      `).join('');
      const savedTable = document.getElementById('saved-reports-table');
      if (savedTable) {
        if (window.TableUiEnhancer) {
          window.TableUiEnhancer.enhance(savedTable);
        }
        if (window.DynamicTableLayoutManager) {
          window.DynamicTableLayoutManager.requestLayout(savedTable);
        }
      }
    },

    onSavedSearch(val) {
      savedReportsSearchQuery = (val || '').trim();
      this.renderSavedReportsTable();
    },

    populateViewerSavedDropdown() {
      const select = document.getElementById('viewer-saved-reports-dropdown');
      if (!select) return;
      select.innerHTML = `<option value="">-- Load Saved Report --</option>` +
        allSavedReports.map(r => `<option value="${r.name}">${r.name} (${r.baseReport} • ${r.datePreset})</option>`).join('');
    },

    toggleSavedReportActionMenu(idx, event) {
      if (event) event.stopPropagation();
      const menuId = `saved-report-action-menu-${idx}`;
      const allMenus = document.querySelectorAll('.action-menu-dropdown');
      allMenus.forEach(m => {
        if (m.id !== menuId) m.style.display = 'none';
      });
      const menu = document.getElementById(menuId);
      const btn = event ? (event.currentTarget || event.target) : null;
      if (menu) {
        const isShown = menu.style.display === 'block';
        if (!isShown) {
          if (btn) {
            const rect = btn.getBoundingClientRect();
            menu.style.position = 'fixed';
            menu.style.top = (rect.bottom + 4) + 'px';
            menu.style.left = Math.max(10, rect.right - 160) + 'px';
            menu.style.zIndex = '99999';
          }
          menu.style.display = 'block';
          const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
              menu.style.display = 'none';
              document.removeEventListener('click', closeHandler);
            }
          };
          setTimeout(() => document.addEventListener('click', closeHandler), 10);
        } else {
          menu.style.display = 'none';
        }
      }
    },

    onSavedDropdownChange(name) {
      if (!name) return;
      const saved = allSavedReports.find(r => r.name === name);
      if (saved) {
        this.applySavedReport(saved);
      }
    },

    applySavedReportByIndex(idx) {
      const saved = allSavedReports[idx];
      if (saved) this.applySavedReport(saved);
    },

    scheduleSavedReportByIndex(idx) {
      const saved = allSavedReports[idx];
      if (!saved) return;
      this.switchMainTab('scheduler');
      this.openNewScheduleModal(saved.name);
    },

    applySavedReport(saved) {
      if (!saved || !saved.request) return;
      const req = saved.request;
      currentReportId = req.reportId;
      this.currentDefinition = definitions.find(d => d.id === currentReportId) || definitions[0];

      this.switchMainTab('viewer');
      this.switchViewerSubView('viewer');

      const dropdownEl = document.getElementById('viewer-saved-reports-dropdown');
      if (dropdownEl && saved.name) dropdownEl.value = saved.name;

      const headerTitle = document.getElementById('viewer-report-title');
      const headerIcon = document.getElementById('viewer-header-icon');
      if (headerTitle) headerTitle.innerText = this.currentDefinition?.title || currentReportId;
      if (headerIcon) headerIcon.innerText = this.currentDefinition?.icon || '📄';

      const periodEl = document.getElementById('v-filter-period');
      const preset = saved.datePreset || 'Custom';
      if (periodEl) periodEl.value = preset;

      if (preset && preset !== 'Custom') {
        const dates = calculatePresetDates(preset);
        if (dates) {
          const f = document.getElementById('v-filter-from');
          const t = document.getElementById('v-filter-to');
          if (f) f.value = dates.from;
          if (t) t.value = dates.to;
        }
      } else {
        const f = document.getElementById('v-filter-from');
        const t = document.getElementById('v-filter-to');
        const fromDate = req.from || req.fromDate;
        const toDate = req.to || req.toDate;
        if (f && fromDate) f.value = fromDate;
        if (t && toDate) t.value = toDate;
      }

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val != null ? val : '';
      };
      setVal('v-filter-party', req.party);
      setVal('v-filter-item', req.item);
      setVal('v-filter-salesperson', req.salesperson);
      setVal('v-filter-docstatus', req.documentStatus || req.status);
      setVal('v-filter-payment', req.paymentStatus);
      setVal('v-filter-returns', req.returnStatus);
      setVal('v-filter-gstrate', req.gstRate);
      setVal('v-filter-minamt', req.minAmount);
      setVal('v-filter-maxamt', req.maxAmount);

      setVal('viewer-groupby', req.groupBy || 'None');
      setVal('viewer-sortby', req.sortKey || req.sortBy || 'Date');
      setVal('viewer-direction', req.sortDirection === 'ASC' ? 'Ascending' : (req.sortDirection || 'Descending'));

      const searchEl = document.getElementById('viewer-search');
      if (searchEl) searchEl.value = req.search || '';
      viewerSearchQuery = req.search || '';
      viewerPage = 0;

      this.reflowViewerFilterGrid();
      this.applyViewerFilters();

      if (window.AppDialogService) {
        window.AppDialogService.toastSuccess(`Restored Saved Report '${saved.name}' with fresh server data.`);
      }
    },

    switchViewerSubView(subView) {
      activeViewerSubView = subView;
      const catView = document.getElementById('rep-subview-catalog');
      const viewerSub = document.getElementById('rep-subview-viewer');
      const btnCat = document.getElementById('btn-rep-sub-saved');
      const btnViewer = document.getElementById('btn-rep-sub-viewer');

      if (catView) catView.style.display = subView === 'catalog' ? 'block' : 'none';
      if (viewerSub) viewerSub.style.display = subView === 'viewer' ? 'block' : 'none';

      if (btnCat) {
        if (subView === 'catalog') {
          btnCat.style.background = 'rgba(56,189,248,0.15)';
          btnCat.style.color = 'var(--cyan)';
          btnCat.style.borderColor = 'rgba(56,189,248,0.3)';
          btnCat.style.fontWeight = '700';
        } else {
          btnCat.style.background = 'transparent';
          btnCat.style.color = 'var(--text-muted)';
          btnCat.style.borderColor = 'transparent';
          btnCat.style.fontWeight = '600';
        }
      }
      if (btnViewer) {
        if (subView === 'viewer') {
          btnViewer.style.background = 'rgba(56,189,248,0.15)';
          btnViewer.style.color = 'var(--cyan)';
          btnViewer.style.borderColor = 'rgba(56,189,248,0.3)';
          btnViewer.style.fontWeight = '700';
        } else {
          btnViewer.style.background = 'transparent';
          btnViewer.style.color = 'var(--text-muted)';
          btnViewer.style.borderColor = 'transparent';
          btnViewer.style.fontWeight = '600';
        }
      }
      if (subView === 'catalog') {
        this.renderSavedReportsTable();
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
          allSchedules = (res && (res.schedules || res.rows || res.content || (Array.isArray(res) ? res : []))) || [];
          if (!Array.isArray(allSchedules)) allSchedules = [];

          if (res && res.summary) {
            this.applyScheduleSummary(res.summary);
          } else {
            this.updateScheduleKpis();
          }
        }
      } catch (err) {
        console.warn('[ReportsController] GET /api/reporting/schedules failed:', err);
        allSchedules = [];
        this.updateScheduleKpis();
      }

      this.filterSchedules();
    },

    applyScheduleSummary(sum) {
      if (!sum) return;
      const actEl = document.getElementById('rep-sch-kpi-active');
      const nextEl = document.getElementById('rep-sch-kpi-next');
      const nextNameEl = document.getElementById('rep-sch-kpi-next-name');
      const monthEl = document.getElementById('rep-sch-kpi-month');
      const failEl = document.getElementById('rep-sch-kpi-failures');

      if (actEl && sum.activeSchedules !== undefined) actEl.innerText = sum.activeSchedules.toString();
      if (nextEl) nextEl.innerText = sum.nextRun ? formatTimestamp(sum.nextRun) : 'None Scheduled';
      if (nextNameEl) nextNameEl.innerText = sum.nextSchedule || '-';
      if (monthEl && sum.reportsThisMonth !== undefined) monthEl.innerText = sum.reportsThisMonth.toString();
      if (failEl && sum.failuresLast30Days !== undefined) failEl.innerText = sum.failuresLast30Days.toString();
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
        if (nextEl) nextEl.innerText = formatTimestamp(earliest.nextRun);
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
            <td style="color:var(--text-muted); font-size:0.75rem;">${formatTimestamp(s.nextRun) || 'Pending'}</td>
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
      const schTable = document.getElementById('rep-sch-table');
      if (schTable) {
        if (window.TableUiEnhancer) {
          window.TableUiEnhancer.enhance(schTable);
        }
        if (window.DynamicTableLayoutManager) {
          window.DynamicTableLayoutManager.requestLayout(schTable);
        }
      }
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
    async openNewScheduleModal(preselectedReport = null) {
      const modal = document.getElementById('modal-new-schedule');
      if (!modal) return;

      const titleEl = document.getElementById('sch-modal-title');
      if (titleEl) titleEl.innerText = 'New Schedule';

      const idEl = document.getElementById('sch-form-id');
      if (idEl) idEl.value = '';

      const nameEl = document.getElementById('sch-form-name');
      if (nameEl) nameEl.value = preselectedReport ? `Schedule - ${preselectedReport}` : '';

      const recEl = document.getElementById('sch-form-recipients');
      if (recEl) recEl.value = '';

      const timeEl = document.getElementById('sch-form-time');
      if (timeEl) timeEl.value = '08:00';

      const submitBtn = document.getElementById('btn-sch-submit');
      if (submitBtn) submitBtn.innerHTML = `<span>✔</span> Create Schedule`;

      // Load saved reports dropdown
      await this.populateSavedReportsInModal(preselectedReport);

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
        if (allSavedReports.length > 0) {
          savedReportOptions = allSavedReports.map(s => ({
            name: s.name,
            reportId: s.request?.reportId || '',
            title: s.baseReport || s.name,
            datePreset: s.datePreset || 'This Month'
          }));
        } else {
          savedReportOptions = definitions.map(d => ({
            name: d.title,
            reportId: d.id,
            title: d.title,
            datePreset: 'This Month'
          }));
        }
      }

      repSelect.innerHTML = savedReportOptions.map(opt => {
        const val = opt.name || opt.title || opt.id || opt.reportId;
        const labelText = opt.name ? `${opt.name} (${opt.title || opt.reportId || ''})` : (opt.title || val);
        const isSel = selectedVal ? (val === selectedVal || opt.name === selectedVal || opt.title === selectedVal) : false;
        return `<option value="${val}" ${isSel ? 'selected' : ''}>${labelText}</option>`;
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
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      const menu = document.getElementById('rep-export-menu');
      if (!menu) return;
      const isShow = menu.style.display === 'block';
      menu.style.display = isShow ? 'none' : 'block';

      if (!isShow) {
        setTimeout(() => {
          const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
              menu.style.display = 'none';
              document.removeEventListener('click', closeMenu);
            }
          };
          document.addEventListener('click', closeMenu);
        }, 20);
      }
    },

    exportReport(format) {
      const menu = document.getElementById('rep-export-menu');
      if (menu) menu.style.display = 'none';

      const dateStamp = new Date().toISOString().slice(0, 10);
      const repTitle = (currentDefinition?.title || currentReportId || 'Executive_Report');
      const safeTitle = repTitle.replace(/[^a-zA-Z0-9_-]/g, '_');

      // Helper to trigger file download
      const triggerDownload = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };

      // Helper for RFC 4180 CSV escaping
      const escapeCsvCell = (val) => {
        if (val == null) return '""';
        const s = String(val);
        if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return `"${s}"`;
      };

      // 1. DYNAMIC VIEWER TAB EXPORT (With DOM Extraction Fallback)
      let cols = (currentResult && currentResult.columns) ? [...currentResult.columns] : [];
      let rows = (currentResult && currentResult.rows) ? [...currentResult.rows] : [];
      let totals = (currentResult && currentResult.totals) ? currentResult.totals : null;

      if ((activeMainTab === 'viewer' || activeMainTab === 'saved') && cols.length === 0) {
        const vTable = document.getElementById('viewer-table');
        if (vTable) {
          const ths = Array.from(vTable.querySelectorAll('thead th')).slice(1); // skip sequence #
          if (ths.length > 0) {
            cols = ths.map(th => {
              const lbl = th.querySelector('.erp-th-label')?.innerText || th.innerText.trim();
              return { label: lbl, key: lbl, align: th.style.textAlign === 'right' ? 'RIGHT' : 'LEFT' };
            });
            const trs = Array.from(vTable.querySelectorAll('tbody tr:not(.empty-row)'));
            rows = trs.map(tr => {
              const tds = Array.from(tr.querySelectorAll('td')).slice(1);
              return { values: tds.map(td => td.innerText.trim()) };
            });
          }
        }
      }

      if (cols.length > 0 && (activeMainTab === 'viewer' || activeMainTab === 'saved')) {
        const colLabels = cols.map(c => c.label || c.key || 'Column');

        if (format === 'EXCEL') {
          if (window.XLSX && window.XLSX.utils) {
            const aoa = [colLabels];
            rows.forEach(r => {
              aoa.push((r.values || []).map(v => v != null ? v : ''));
            });

            // Add Totals row if present
            if (totals) {
              const totalsRow = ['TOTAL'];
              for (let i = 1; i < cols.length; i++) {
                const c = cols[i];
                let tot = '';
                if (Array.isArray(totals)) {
                  tot = totals[i] || '';
                } else if (typeof totals === 'object') {
                  tot = totals[c.key] || totals[c.label] || '';
                }
                totalsRow.push(tot);
              }
              aoa.push(totalsRow);
            }

            const wb = window.XLSX.utils.book_new();
            const ws = window.XLSX.utils.aoa_to_sheet(aoa);

            // Compute optimal column widths
            const colWidths = colLabels.map((lbl, cIdx) => {
              let maxLen = (lbl || '').length;
              rows.slice(0, 100).forEach(r => {
                const valStr = String(r.values?.[cIdx] || '');
                if (valStr.length > maxLen) maxLen = valStr.length;
              });
              return { wch: Math.min(Math.max(maxLen + 4, 12), 40) };
            });
            ws['!cols'] = colWidths;

            window.XLSX.utils.book_append_sheet(wb, ws, repTitle.slice(0, 31));
            window.XLSX.writeFile(wb, `${safeTitle}_${dateStamp}.xlsx`);
            if (window.AppDialogService) window.AppDialogService.toastSuccess(`Exported ${repTitle} to Excel (.xlsx)!`);
            return;
          }
        } else if (format === 'CSV') {
          const headerLine = colLabels.map(escapeCsvCell).join(',');
          const rowLines = rows.map(r => (r.values || []).map(escapeCsvCell).join(','));
          let csvText = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

          if (totals) {
            const totCells = ['TOTAL'];
            for (let i = 1; i < cols.length; i++) {
              const c = cols[i];
              let tot = '';
              if (Array.isArray(totals)) tot = totals[i] || '';
              else if (typeof totals === 'object') tot = totals[c.key] || totals[c.label] || '';
              totCells.push(tot);
            }
            csvText += '\r\n' + totCells.map(escapeCsvCell).join(',');
          }

          const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
          triggerDownload(blob, `${safeTitle}_${dateStamp}.csv`);
          if (window.AppDialogService) window.AppDialogService.toastSuccess(`Exported ${repTitle} to CSV!`);
          return;
        } else if (format === 'PDF') {
          this.printFormattedReport(repTitle, cols, rows, totals);
          return;
        }
      }

      // 2. DASHBOARD TAB EXPORT
      if (activeMainTab === 'dashboard') {
        const kpiData = [
          ['Metric', 'Value'],
          ['Sales Revenue', document.getElementById('rep-kpi-sales')?.innerText || '₹ 0.00'],
          ['Purchases Volume', document.getElementById('rep-kpi-purchases')?.innerText || '₹ 0.00'],
          ['Gross Profit', document.getElementById('rep-kpi-profit')?.innerText || '₹ 0.00'],
          ['Total Receivables', document.getElementById('rep-kpi-receivables')?.innerText || '₹ 0.00'],
          ['Inventory Valuation', document.getElementById('rep-kpi-stock')?.innerText || '₹ 0.00'],
          ['Low Stock Count', document.getElementById('rep-kpi-low-stock')?.innerText || '0'],
          ['Active Customers', document.getElementById('rep-kpi-customers')?.innerText || '0']
        ];

        if (format === 'EXCEL' && window.XLSX && window.XLSX.utils) {
          const wb = window.XLSX.utils.book_new();
          const wsKpi = window.XLSX.utils.aoa_to_sheet(kpiData);
          wsKpi['!cols'] = [{ wch: 25 }, { wch: 20 }];
          window.XLSX.utils.book_append_sheet(wb, wsKpi, 'KPI Overview');
          window.XLSX.writeFile(wb, `Reports_Dashboard_${dateStamp}.xlsx`);
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Exported Dashboard to Excel (.xlsx)!');
          return;
        } else if (format === 'CSV') {
          const csvText = '\uFEFF' + kpiData.map(r => r.map(escapeCsvCell).join(',')).join('\r\n');
          const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
          triggerDownload(blob, `Reports_Dashboard_${dateStamp}.csv`);
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Exported Dashboard summary to CSV!');
          return;
        } else if (format === 'PDF') {
          if (window.FormatUtil && window.FormatUtil.downloadTablePdf) {
            window.FormatUtil.downloadTablePdf('Reports Dashboard Summary', ['Metric / Indicator', 'Value'], kpiData.slice(1), `Reports_Dashboard_${dateStamp}.pdf`);
          } else {
            window.print();
          }
          return;
        }
      }

      // 3. SCHEDULER TAB EXPORT
      if (activeMainTab === 'scheduler' && allSchedules.length > 0) {
        const schHeaders = ['Schedule Name', 'Saved Report', 'Frequency', 'Time', 'Format', 'Delivery', 'Recipients', 'Next Run', 'Status'];
        const schRows = allSchedules.map(s => [
          s.name || '',
          s.savedReport || s.reportTitle || '',
          s.frequency || 'DAILY',
          s.time || '08:00',
          s.format || 'PDF',
          s.delivery || 'EMAIL',
          s.recipients || '',
          formatTimestamp(s.nextRun) || 'Pending',
          s.status || 'ACTIVE'
        ]);

        if (format === 'EXCEL' && window.XLSX && window.XLSX.utils) {
          const wb = window.XLSX.utils.book_new();
          const ws = window.XLSX.utils.aoa_to_sheet([schHeaders, ...schRows]);
          window.XLSX.utils.book_append_sheet(wb, ws, 'Scheduled Reports');
          window.XLSX.writeFile(wb, `Scheduled_Reports_${dateStamp}.xlsx`);
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Exported Schedules to Excel (.xlsx)!');
          return;
        } else if (format === 'CSV') {
          const csvText = '\uFEFF' + [schHeaders.map(escapeCsvCell).join(','), ...schRows.map(r => r.map(escapeCsvCell).join(','))].join('\r\n');
          const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
          triggerDownload(blob, `Scheduled_Reports_${dateStamp}.csv`);
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Exported Schedules to CSV!');
          return;
        } else if (format === 'PDF') {
          if (window.FormatUtil && window.FormatUtil.downloadTablePdf) {
            window.FormatUtil.downloadTablePdf('Scheduled Reports Catalog', schHeaders, schRows, `Scheduled_Reports_${dateStamp}.pdf`);
          } else {
            const cols = schHeaders.map(h => ({ label: h, align: 'LEFT' }));
            const rows = schRows.map(r => ({ values: r }));
            this.printFormattedReport('Scheduled Reports Catalog', cols, rows, null);
          }
          return;
        }
      }

      // 4. REPORT CENTER TAB EXPORT
      if (activeMainTab === 'center') {
        const catHeaders = ['Report ID', 'Title', 'Category', 'Description', 'Favorite'];
        const catRows = definitions.map(d => [
          d.id,
          d.title,
          d.category,
          d.description,
          favoriteReportIds.has(d.id) ? 'YES' : 'NO'
        ]);

        if (format === 'EXCEL' && window.XLSX && window.XLSX.utils) {
          const wb = window.XLSX.utils.book_new();
          const ws = window.XLSX.utils.aoa_to_sheet([catHeaders, ...catRows]);
          window.XLSX.utils.book_append_sheet(wb, ws, 'Report Catalog');
          window.XLSX.writeFile(wb, `Report_Catalog_${dateStamp}.xlsx`);
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Exported Report Catalog to Excel (.xlsx)!');
          return;
        } else if (format === 'CSV') {
          const csvText = '\uFEFF' + [catHeaders.map(escapeCsvCell).join(','), ...catRows.map(r => r.map(escapeCsvCell).join(','))].join('\r\n');
          const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
          triggerDownload(blob, `Report_Catalog_${dateStamp}.csv`);
          if (window.AppDialogService) window.AppDialogService.toastSuccess('Exported Report Catalog to CSV!');
          return;
        } else if (format === 'PDF') {
          if (window.FormatUtil && window.FormatUtil.downloadTablePdf) {
            window.FormatUtil.downloadTablePdf('Executive Report Catalog', catHeaders, catRows, `Report_Catalog_${dateStamp}.pdf`);
          } else {
            const cols = catHeaders.map(h => ({ label: h, align: 'LEFT' }));
            const rows = catRows.map(r => ({ values: r }));
            this.printFormattedReport('Executive Report Catalog', cols, rows, null);
          }
          return;
        }
      }

      // Default Fallback
      if (format === 'PDF') {
        window.print();
      } else {
        if (window.AppDialogService) window.AppDialogService.toastInfo('No active tabular data to export in current view.');
      }
    },

    printFormattedReport(title, cols, rows, totals) {
      if (window.FormatUtil && window.FormatUtil.downloadTablePdf) {
        const headers = (cols || []).map(c => c.label || c.key);
        const dataRows = (rows || []).map(r => r.values || r);
        window.FormatUtil.downloadTablePdf(title, headers, dataRows, `${(title || 'Report').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
        return;
      }

      const fromVal = document.getElementById('v-filter-from')?.value || '';
      const toVal = document.getElementById('v-filter-to')?.value || '';
      const partyVal = document.getElementById('v-filter-party')?.value || '';
      const genTime = window.FormatUtil ? window.FormatUtil.formatDateTime(new Date()) : new Date().toLocaleString();

      let totalsHtml = '';
      if (totals) {
        totalsHtml = `
          <tfoot>
            <tr style="background:#e2e8f0; font-weight:700;">
              <td style="text-align:center;">TOTAL</td>
              ${cols.map((col, idx) => {
                const isRight = col && (col.align === 'RIGHT' || col.numeric);
                let totVal = '';
                if (Array.isArray(totals)) {
                  totVal = totals[idx] || '';
                } else if (typeof totals === 'object') {
                  totVal = totals[col.key] || totals[col.label] || '';
                }
                return `<td style="${isRight ? 'text-align:right;' : ''}">${totVal != null ? totVal : ''}</td>`;
              }).join('')}
            </tr>
          </tfoot>
        `;
      }

      const win = window.open('', '_blank');
      if (!win) {
        window.print();
        return;
      }

      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${title} - Jasvi Industries</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 16px; color: #111827; font-size: 11px; }
            .header-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 12px; }
            .company { font-size: 16px; font-weight: 800; color: #1e3a8a; }
            .subtitle { font-size: 10px; color: #4b5563; margin-top: 2px; }
            .report-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px; }
            .meta { text-align: right; font-size: 10px; color: #4b5563; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; font-weight: 700; color: #1e293b; text-align: left; }
            td { border: 1px solid #e2e8f0; padding: 5px 8px; font-size: 10px; }
            tr:nth-child(even) td { background: #f8fafc; }
            .text-right { text-align: right; }
            .footer-note { margin-top: 16px; font-size: 9px; color: #94a3b8; text-align: right; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <div class="company">JASVI INDUSTRIES</div>
              <div class="subtitle">Precision Fasteners &amp; Piping • Enterprise ERP</div>
              <div class="report-title">${title}</div>
            </div>
            <div class="meta">
              <div><strong>Generated:</strong> ${genTime}</div>
              <div><strong>Period:</strong> ${fromVal ? (window.FormatUtil ? window.FormatUtil.formatDate(fromVal) : fromVal) : 'All'} to ${toVal ? (window.FormatUtil ? window.FormatUtil.formatDate(toVal) : toVal) : 'All'}</div>
              ${partyVal ? `<div><strong>Party:</strong> ${partyVal}</div>` : ''}
              <div><strong>Total Records:</strong> ${rows.length}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:30px; text-align:center;">#</th>
                ${cols.map(c => `<th style="${c.align === 'RIGHT' || c.numeric ? 'text-align:right;' : ''}">${c.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, i) => `
                <tr>
                  <td style="text-align:center; color:#64748b;">${i + 1}</td>
                  ${(r.values || []).map((v, ci) => {
                    const isRight = cols[ci] && (cols[ci].align === 'RIGHT' || cols[ci].numeric);
                    return `<td style="${isRight ? 'text-align:right; font-weight:600;' : ''}">${v != null ? v : '-'}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
            ${totalsHtml}
          </table>
          <div class="footer-note">Confidential • Jasvi Industries Management Report • Generated by Jasvi ERP 10.0.35</div>
        </body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 350);
    }
  };
})();
