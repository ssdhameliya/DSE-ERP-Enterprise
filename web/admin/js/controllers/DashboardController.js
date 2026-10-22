/**
 * Jasvi Industries ERP - DashboardController
 * Executive Command Center metrics and desktop parity analytics matching desktop DashboardHomeController.java
 * Backed by GET /api/insights/dashboard?period={period}
 */
window.DashboardController = {
  periods: ['This Month', 'This Quarter', 'This Year', 'All Time'],
  currentPeriodIndex: 0,

  async cyclePeriod() {
    this.currentPeriodIndex = (this.currentPeriodIndex + 1) % this.periods.length;
    const period = this.periods[this.currentPeriodIndex];

    const btn = document.getElementById('dashboard-period-btn');
    if (btn) btn.innerHTML = `📅 ${period} &#9662;`;

    if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
    window.AppDialogService.showToast(`Switched dashboard period to: ${period}`, 'info');

    await this.refresh(period);
  },

  getCurrentPeriod() {
    return this.periods[this.currentPeriodIndex] || 'This Month';
  },

  applySnapshotToDom(snap) {
    if (!snap) return;
    const formatRupees = (val) => window.FormatUtil ? window.FormatUtil.formatRupees(val || 0) : `₹ ${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    // 1. Active Sales
    const salesAmtEl = document.getElementById('dash-kpi-sales-amount');
    const salesCntEl = document.getElementById('dash-kpi-sales-count');
    if (salesAmtEl) salesAmtEl.innerText = formatRupees(snap.salesValue || 0);
    if (salesCntEl) salesCntEl.innerText = snap.invoices || 0;

    // 2. Active Purchases
    const purAmtEl = document.getElementById('dash-kpi-pur-amount');
    const purCntEl = document.getElementById('dash-kpi-pur-count');
    if (purAmtEl) purAmtEl.innerText = formatRupees(snap.purchaseValue || 0);
    if (purCntEl) purCntEl.innerText = snap.purchases || 0;

    // 3. Receivables
    const recAmtEl = document.getElementById('dash-kpi-receivables');
    const recCntEl = document.getElementById('dash-kpi-receivables-count');
    if (recAmtEl) recAmtEl.innerText = formatRupees(snap.receivables || 0);
    if (recCntEl) recCntEl.innerText = snap.openReceivables || 0;

    // 4. Payables
    const payAmtEl = document.getElementById('dash-kpi-payables');
    const payCntEl = document.getElementById('dash-kpi-payables-count');
    if (payAmtEl) payAmtEl.innerText = formatRupees(snap.payables || 0);
    if (payCntEl) payCntEl.innerText = snap.openPayables || 0;

    // 5. Cash Position
    const cashEl = document.getElementById('dash-kpi-cash-position');
    if (cashEl) cashEl.innerText = formatRupees(snap.cash || 0);

    // 6. Low Stock
    const lowStockEl = document.getElementById('dash-kpi-low-stock');
    if (lowStockEl) lowStockEl.innerText = snap.lowStock || 0;

    // Directories
    const dirSalesCntEl = document.getElementById('dash-dir-sales-count');
    if (dirSalesCntEl) dirSalesCntEl.innerText = snap.invoices || 0;

    const dirPurCntEl = document.getElementById('dash-dir-pur-count');
    if (dirPurCntEl) dirPurCntEl.innerText = snap.purchases || 0;

    const dirCustCntEl = document.getElementById('dash-dir-cust-count');
    if (dirCustCntEl) dirCustCntEl.innerText = snap.customers || 0;

    const dirItemCntEl = document.getElementById('dash-dir-item-count');
    if (dirItemCntEl) dirItemCntEl.innerText = snap.products || 0;

    const remEl = document.getElementById('dash-reminders-count');
    if (remEl) remEl.innerText = snap.openReminders || 0;
  },

  applyAgeingToDom(ageing) {
    if (!ageing) return;
    const formatRupees = (val) => window.FormatUtil ? window.FormatUtil.formatRupees(val || 0) : `₹ ${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const elOverdue = document.getElementById('dash-ageing-overdue');
    const el21 = document.getElementById('dash-ageing-21-30');
    const el11 = document.getElementById('dash-ageing-11-20');
    const el1 = document.getElementById('dash-ageing-1-10');
    const elNotDue = document.getElementById('dash-ageing-not-due');

    if (elOverdue) elOverdue.innerText = formatRupees(ageing.overdue30 || 0);
    if (el21) el21.innerText = formatRupees(ageing.b21_30 || 0);
    if (el11) el11.innerText = formatRupees(ageing.b11_20 || 0);
    if (el1) el1.innerText = formatRupees(ageing.b1_10 || 0);
    if (elNotDue) elNotDue.innerText = formatRupees(ageing.notDue || 0);
  },

  restoreCachedDashboard(periodParam) {
    try {
      const period = periodParam || this.getCurrentPeriod();
      const raw = localStorage.getItem('dse_dashboard_cache_' + period) || localStorage.getItem('dse_dashboard_cache');
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.snapshot) {
        this.applySnapshotToDom(data.snapshot);
      }
      if (data.topCustomersHtml) {
        const listEl = document.getElementById('dash-top-customers-list');
        if (listEl) listEl.innerHTML = data.topCustomersHtml;
      }
      if (data.ageing) {
        this.applyAgeingToDom(data.ageing);
      }
      if (data.recentActivitiesHtml) {
        const actListEl = document.getElementById('dash-recent-activities-list');
        if (actListEl) actListEl.innerHTML = data.recentActivitiesHtml;
      }
      return true;
    } catch (_) {
      return false;
    }
  },

  async refresh(periodParam) {
    const period = periodParam || this.getCurrentPeriod();

    const btn = document.getElementById('dashboard-period-btn');
    if (btn) btn.innerHTML = `📅 ${period} &#9662;`;

    // Immediately restore cached metrics to prevent unpopulated/zero flash
    this.restoreCachedDashboard(period);

    try {
      // 1. Try server-canonical insights bundle
      let serverBundle = null;
      try {
        serverBundle = await window.ApiService.get(`/api/insights/dashboard?period=${encodeURIComponent(period)}`);
      } catch (err) {
        console.warn('[DashboardController] Server dashboard bundle fetch fallback:', err.message);
      }

      if (serverBundle && serverBundle.snapshot) {
        this.applySnapshotToDom(serverBundle.snapshot);

        // Recent activities from bundle
        if (serverBundle.recent && Array.isArray(serverBundle.recent) && serverBundle.recent.length > 0) {
          this.renderRecentActivitiesFromDto(serverBundle.recent);
        }
      }

      // 2. Fetch fresh local operations dataset for detailed ranking and ageing calculations
      const salesRes = await window.OperationsService.getSales(0, 100);
      const sales = salesRes.rows || salesRes.content || (Array.isArray(salesRes) ? salesRes : []);
      const activeSales = sales.filter(s => s.documentStatus !== 'CANCELLED');
      const pendingSales = activeSales.filter(s => s.paymentStatus === 'PENDING' || (s.paidAmount < (s.totalAmount || 0)));

      let salesAmount = 0, purAmount = 0, receivablesAmount = 0, payablesAmount = 0, cashPosition = 0;
      let activePur = [], items = [], customers = [];

      // If server bundle was not present, populate metrics from live sales
      if (!serverBundle || !serverBundle.snapshot) {
        salesAmount = activeSales.reduce((acc, s) => acc + (s.totalAmount || s.total || 0), 0);
        receivablesAmount = pendingSales.reduce((acc, s) => acc + Math.max(0, (s.totalAmount || 0) - (s.paidAmount || 0)), 0);

        const purRes = await window.OperationsService.getPurchases(0, 100);
        const purchases = purRes.rows || purRes.content || (Array.isArray(purRes) ? purRes : []);
        activePur = purchases.filter(p => p.documentStatus !== 'CANCELLED');
        purAmount = activePur.reduce((acc, p) => acc + (p.totalAmount || p.total || 0), 0);
        const pendingPur = activePur.filter(p => p.paymentStatus === 'PENDING' || (p.paidAmount < (p.totalAmount || 0)));
        payablesAmount = pendingPur.reduce((acc, p) => acc + Math.max(0, (p.totalAmount || 0) - (p.paidAmount || 0)), 0);

        const totalPaidSales = activeSales.reduce((acc, s) => acc + (s.paidAmount || (s.paymentStatus === 'PAID' ? s.totalAmount : 0) || 0), 0);
        const totalPaidPurchases = activePur.reduce((acc, p) => acc + (p.paidAmount || (p.paymentStatus === 'PAID' ? p.totalAmount : 0) || 0), 0);
        cashPosition = totalPaidSales - totalPaidPurchases;

        items = await window.MasterService.getItems();
        customers = await window.MasterService.getParties('CUSTOMER');
        const lowStockCount = Array.isArray(items) ? items.filter(i => (i.currentStock || i.stock || 0) <= (i.minStock || i.reorderPoint || 0)).length : 0;

        const liveSnapshot = {
          salesValue: salesAmount,
          invoices: activeSales.length,
          purchaseValue: purAmount,
          purchases: activePur.length,
          receivables: receivablesAmount,
          openReceivables: pendingSales.length,
          payables: payablesAmount,
          openPayables: pendingPur.length,
          cash: cashPosition,
          lowStock: lowStockCount,
          customers: Array.isArray(customers) ? customers.length : 0,
          products: Array.isArray(items) ? items.length : 0
        };
        this.applySnapshotToDom(liveSnapshot);
      }

      // 7. Top Customers Ranking
      this.renderTopCustomers(activeSales);

      // 8. Receivables Ageing Buckets
      const currentAgeing = this.renderAgeingBuckets(pendingSales);

      // 9. Recent Activities fallback
      if (!serverBundle || !serverBundle.recent || serverBundle.recent.length === 0) {
        this.renderRecentActivities(sales);
      }

      // 10. Persist complete snapshot to cache for immediate 0ms hydration on subsequent loads
      try {
        const topCustomersEl = document.getElementById('dash-top-customers-list');
        const recentActEl = document.getElementById('dash-recent-activities-list');
        const snapshotToCache = serverBundle && serverBundle.snapshot ? serverBundle.snapshot : {
          salesValue: salesAmount,
          invoices: activeSales.length,
          purchaseValue: purAmount,
          purchases: activePur.length,
          receivables: receivablesAmount,
          openReceivables: pendingSales.length,
          payables: payablesAmount,
          openPayables: payablesAmount > 0 ? 1 : 0,
          cash: cashPosition,
          lowStock: Array.isArray(items) ? items.filter(i => (i.currentStock || i.stock || 0) <= (i.minStock || i.reorderPoint || 0)).length : 0,
          customers: Array.isArray(customers) ? customers.length : 0,
          products: Array.isArray(items) ? items.length : 0
        };
        const cachePayload = {
          snapshot: snapshotToCache,
          ageing: currentAgeing,
          topCustomersHtml: topCustomersEl ? topCustomersEl.innerHTML : '',
          recentActivitiesHtml: recentActEl ? recentActEl.innerHTML : '',
          timestamp: Date.now()
        };
        localStorage.setItem('dse_dashboard_cache_' + period, JSON.stringify(cachePayload));
        localStorage.setItem('dse_dashboard_cache', JSON.stringify(cachePayload));
      } catch (_) {}
    } catch (e) {
      console.warn('[DashboardController] Error refreshing metrics:', e);
    }
  },

  renderTopCustomers(sales) {
    const listEl = document.getElementById('dash-top-customers-list');
    if (!listEl) return;
    const customerTotals = {};
    sales.forEach(s => {
      const name = (s.customer && s.customer.name) || s.customerName || s.partyName || 'Walk-in Client';
      customerTotals[name] = (customerTotals[name] || 0) + (s.totalAmount || s.total || 0);
    });

    const sorted = Object.entries(customerTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (sorted.length === 0) {
      listEl.innerHTML = `<div style="color: var(--text-dim); padding: 6px 0;">No customer sales posted yet.</div>`;
      return;
    }

    listEl.innerHTML = sorted.map(([name, total]) => `
      <div class="dash-list-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
        <span style="font-weight:600; color: var(--text-main);">${name}</span>
        <span style="font-weight:700; color: var(--cyan);">${window.FormatUtil.formatRupees(total)}</span>
      </div>
    `).join('');
  },

  renderAgeingBuckets(pendingInvoices) {
    let overdue30 = 0, b21_30 = 0, b11_20 = 0, b1_10 = 0, notDue = 0;
    const today = new Date();

    pendingInvoices.forEach(inv => {
      const balance = Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0));
      const invDate = new Date(inv.invoiceDate || inv.date || today);
      const diffDays = Math.floor((today - invDate) / (1000 * 60 * 60 * 24));

      if (diffDays > 30) overdue30 += balance;
      else if (diffDays >= 21) b21_30 += balance;
      else if (diffDays >= 11) b11_20 += balance;
      else if (diffDays >= 1) b1_10 += balance;
      else notDue += balance;
    });

    const elOverdue = document.getElementById('dash-ageing-overdue');
    const el21 = document.getElementById('dash-ageing-21-30');
    const el11 = document.getElementById('dash-ageing-11-20');
    const el1 = document.getElementById('dash-ageing-1-10');
    const elNotDue = document.getElementById('dash-ageing-not-due');

    if (elOverdue) elOverdue.innerText = window.FormatUtil.formatRupees(overdue30);
    if (el21) el21.innerText = window.FormatUtil.formatRupees(b21_30);
    if (el11) el11.innerText = window.FormatUtil.formatRupees(b11_20);
    if (el1) el1.innerText = window.FormatUtil.formatRupees(b1_10);
    if (elNotDue) elNotDue.innerText = window.FormatUtil.formatRupees(notDue);
    return { overdue30, b21_30, b11_20, b1_10, notDue };
  },

  renderRecentActivitiesFromDto(recentList) {
    const actListEl = document.getElementById('dash-recent-activities-list');
    if (!actListEl) return;
    actListEl.innerHTML = recentList.slice(0, 10).map(item => `
      <div class="dash-list-row" style="flex-direction: column; align-items: flex-start; gap: 2px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
        <div style="display:flex; justify-content:space-between; width:100%;">
          <span style="font-weight:600; color: var(--text-main);">${item.type || 'Transaction'}: ${item.number || ''}</span>
          <span style="font-weight:700; color: var(--cyan);">${window.FormatUtil.formatRupees(item.amount || 0)}</span>
        </div>
        <span style="color:var(--text-dim); font-size: 0.72rem;">${item.party || ''} • ${window.FormatUtil.formatDate(item.date)}</span>
      </div>
    `).join('');
  },

  renderRecentActivities(sales) {
    const actListEl = document.getElementById('dash-recent-activities-list');
    if (!actListEl) return;
    const recent = (sales || []).slice(0, 10);
    if (recent.length === 0) {
      actListEl.innerHTML = `<div style="color: var(--text-dim); padding: 8px 0;">No recent system events.</div>`;
      return;
    }
    actListEl.innerHTML = recent.map(s => {
      const invNo = s.invoiceNo || s.number || 'JI/INV';
      const isPaid = s.paymentStatus === 'PAID';
      const label = isPaid ? `Payment received for ${invNo}` : `Sales Invoice generated: ${invNo}`;
      const dt = window.FormatUtil.formatDate(s.invoiceDate || s.date);
      return `
        <div class="dash-list-row" style="flex-direction: column; align-items: flex-start; gap: 2px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
          <span style="font-weight:600; color: var(--text-main);">${label}</span>
          <span style="color:var(--text-dim); font-size: 0.7rem;">${dt}</span>
        </div>
      `;
    }).join('');
  }
};
