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

  async refresh(periodParam) {
    const period = periodParam || this.getCurrentPeriod();

    const btn = document.getElementById('dashboard-period-btn');
    if (btn) btn.innerHTML = `📅 ${period} &#9662;`;

    try {
      // 1. Try server-canonical insights bundle
      let serverBundle = null;
      try {
        serverBundle = await window.ApiService.get(`/api/insights/dashboard?period=${encodeURIComponent(period)}`);
      } catch (err) {
        console.warn('[DashboardController] Server dashboard bundle fetch fallback:', err.message);
      }

      if (serverBundle && serverBundle.snapshot) {
        const snap = serverBundle.snapshot;

        // 1. Active Sales
        const salesAmtEl = document.getElementById('dash-kpi-sales-amount');
        const salesCntEl = document.getElementById('dash-kpi-sales-count');
        if (salesAmtEl) salesAmtEl.innerText = window.FormatUtil.formatRupees(snap.salesValue || 0);
        if (salesCntEl) salesCntEl.innerText = snap.invoices || 0;

        // 2. Active Purchases
        const purAmtEl = document.getElementById('dash-kpi-pur-amount');
        const purCntEl = document.getElementById('dash-kpi-pur-count');
        if (purAmtEl) purAmtEl.innerText = window.FormatUtil.formatRupees(snap.purchaseValue || 0);
        if (purCntEl) purCntEl.innerText = snap.purchases || 0;

        // 3. Receivables
        const recAmtEl = document.getElementById('dash-kpi-receivables');
        const recCntEl = document.getElementById('dash-kpi-receivables-count');
        if (recAmtEl) recAmtEl.innerText = window.FormatUtil.formatRupees(snap.receivables || 0);
        if (recCntEl) recCntEl.innerText = snap.openReceivables || 0;

        // 4. Payables
        const payAmtEl = document.getElementById('dash-kpi-payables');
        const payCntEl = document.getElementById('dash-kpi-payables-count');
        if (payAmtEl) payAmtEl.innerText = window.FormatUtil.formatRupees(snap.payables || 0);
        if (payCntEl) payCntEl.innerText = snap.openPayables || 0;

        // 5. Cash Position
        const cashEl = document.getElementById('dash-kpi-cash-position');
        if (cashEl) cashEl.innerText = window.FormatUtil.formatRupees(snap.cash || 0);

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

      // If server bundle was not present, populate metrics from live sales
      if (!serverBundle || !serverBundle.snapshot) {
        const salesAmount = activeSales.reduce((acc, s) => acc + (s.totalAmount || s.total || 0), 0);
        const receivablesAmount = pendingSales.reduce((acc, s) => acc + Math.max(0, (s.totalAmount || 0) - (s.paidAmount || 0)), 0);

        const salesAmtEl = document.getElementById('dash-kpi-sales-amount');
        const salesCntEl = document.getElementById('dash-kpi-sales-count');
        if (salesAmtEl) salesAmtEl.innerText = window.FormatUtil.formatRupees(salesAmount);
        if (salesCntEl) salesCntEl.innerText = activeSales.length;

        const recAmtEl = document.getElementById('dash-kpi-receivables');
        const recCntEl = document.getElementById('dash-kpi-receivables-count');
        if (recAmtEl) recAmtEl.innerText = window.FormatUtil.formatRupees(receivablesAmount);
        if (recCntEl) recCntEl.innerText = pendingSales.length;

        const dirSalesCntEl = document.getElementById('dash-dir-sales-count');
        if (dirSalesCntEl) dirSalesCntEl.innerText = activeSales.length;

        const purRes = await window.OperationsService.getPurchases(0, 100);
        const purchases = purRes.rows || purRes.content || (Array.isArray(purRes) ? purRes : []);
        const activePur = purchases.filter(p => p.documentStatus !== 'CANCELLED');
        const purAmount = activePur.reduce((acc, p) => acc + (p.totalAmount || p.total || 0), 0);
        const pendingPur = activePur.filter(p => p.paymentStatus === 'PENDING' || (p.paidAmount < (p.totalAmount || 0)));
        const payablesAmount = pendingPur.reduce((acc, p) => acc + Math.max(0, (p.totalAmount || 0) - (p.paidAmount || 0)), 0);

        const purAmtEl = document.getElementById('dash-kpi-pur-amount');
        const purCntEl = document.getElementById('dash-kpi-pur-count');
        if (purAmtEl) purAmtEl.innerText = window.FormatUtil.formatRupees(purAmount);
        if (purCntEl) purCntEl.innerText = activePur.length;

        const payAmtEl = document.getElementById('dash-kpi-payables');
        const payCntEl = document.getElementById('dash-kpi-payables-count');
        if (payAmtEl) payAmtEl.innerText = window.FormatUtil.formatRupees(payablesAmount);
        if (payCntEl) payCntEl.innerText = pendingPur.length;

        const dirPurCntEl = document.getElementById('dash-dir-pur-count');
        if (dirPurCntEl) dirPurCntEl.innerText = activePur.length;

        const totalPaidSales = activeSales.reduce((acc, s) => acc + (s.paidAmount || (s.paymentStatus === 'PAID' ? s.totalAmount : 0) || 0), 0);
        const totalPaidPurchases = activePur.reduce((acc, p) => acc + (p.paidAmount || (p.paymentStatus === 'PAID' ? p.totalAmount : 0) || 0), 0);
        const cashPosition = totalPaidSales - totalPaidPurchases;
        const cashEl = document.getElementById('dash-kpi-cash-position');
        if (cashEl) cashEl.innerText = window.FormatUtil.formatRupees(cashPosition);

        const items = await window.MasterService.getItems();
        if (items && Array.isArray(items)) {
          const dirItemCntEl = document.getElementById('dash-dir-item-count');
          if (dirItemCntEl) dirItemCntEl.innerText = items.length;

          const lowStockCount = items.filter(i => (i.currentStock || i.stock || 0) <= (i.minStock || i.reorderPoint || 0)).length;
          const lowStockEl = document.getElementById('dash-kpi-low-stock');
          if (lowStockEl) lowStockEl.innerText = lowStockCount;
        }

        const customers = await window.MasterService.getParties('CUSTOMER');
        if (customers && Array.isArray(customers)) {
          const dirCustCntEl = document.getElementById('dash-dir-cust-count');
          if (dirCustCntEl) dirCustCntEl.innerText = customers.length;
        }
      }

      // 7. Top Customers Ranking
      this.renderTopCustomers(activeSales);

      // 8. Receivables Ageing Buckets
      this.renderAgeingBuckets(pendingSales);

      // 9. Recent Activities fallback
      if (!serverBundle || !serverBundle.recent || serverBundle.recent.length === 0) {
        this.renderRecentActivities(sales);
      }
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
      .slice(0, 5);

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
  },

  renderRecentActivitiesFromDto(recentList) {
    const actListEl = document.getElementById('dash-recent-activities-list');
    if (!actListEl) return;
    actListEl.innerHTML = recentList.slice(0, 5).map(item => `
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
    const recent = (sales || []).slice(0, 5);
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
