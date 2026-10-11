/**
 * Jasvi Industries ERP - DashboardController
 * Executive Command Center metrics and recent sales table matching desktop DashboardController
 */
window.DashboardController = {
  async refresh() {
    try {
      const salesRes = await window.OperationsService.getSales(0, 5);
      if (salesRes && salesRes.content) {
        const sales = salesRes.content;
        const countEl = document.getElementById('kpi-sales-count');
        const amtEl = document.getElementById('kpi-sales-amount');
        if (countEl) countEl.innerText = salesRes.totalElements || sales.length;
        let tot = 0;
        sales.forEach(s => tot += (s.totalAmount || s.total || 0));
        if (amtEl) amtEl.innerText = window.FormatUtil.formatRupees(tot);
        this.renderRecentSales(sales);
      }

      const purRes = await window.OperationsService.getPurchases(0, 5);
      if (purRes && purRes.content) {
        const pur = purRes.content;
        const countEl = document.getElementById('kpi-purchase-count');
        const amtEl = document.getElementById('kpi-purchase-amount');
        if (countEl) countEl.innerText = purRes.totalElements || pur.length;
        let pTot = 0;
        pur.forEach(p => pTot += (p.totalAmount || p.total || 0));
        if (amtEl) amtEl.innerText = window.FormatUtil.formatRupees(pTot);
      }

      const items = await window.MasterService.getItems();
      if (items && Array.isArray(items)) {
        const itemEl = document.getElementById('kpi-items-count');
        if (itemEl) itemEl.innerText = items.length;
      }
    } catch (e) {
      console.warn('[DashboardController] Error refreshing metrics:', e);
    }
  },

  renderRecentSales(sales) {
    const tbody = document.getElementById('recent-sales-tbody');
    if (!tbody) return;
    if (!sales || sales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">No transactions posted yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = sales.map(s => `
      <tr>
        <td style="font-weight: 700; color: var(--cyan);">${s.invoiceNo || s.number}</td>
        <td>${window.FormatUtil.formatDate(s.invoiceDate || s.date)}</td>
        <td>${s.customerName || s.partyName || '-'}</td>
        <td>${window.FormatUtil.formatRupees(s.taxableAmount || 0)}</td>
        <td>${window.FormatUtil.formatRupees(s.gstAmount || 0)}</td>
        <td style="font-weight: 700;">${window.FormatUtil.formatRupees(s.totalAmount || s.total || 0)}</td>
        <td><span class="badge ${s.documentStatus === 'PAID' ? 'badge-paid' : 'badge-pending'}">${s.documentStatus || 'POSTED'}</span></td>
        <td><button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;" onclick="window.BarcodeStudioController.quickGenerate('${s.invoiceNo || s.number}')">Label</button></td>
      </tr>
    `).join('');
  }
};
