/**
 * Jasvi Industries ERP - DashboardController
 * Executive Command Center metrics and recent sales table matching desktop DashboardController
 */
window.DashboardController = {
  async refresh() {
    try {
      const salesRes = await window.OperationsService.getSales(0, 5);
      if (salesRes) {
        const sales = salesRes.rows || salesRes.content || (Array.isArray(salesRes) ? salesRes : []);
        const countEl = document.getElementById('kpi-sales-count');
        const amtEl = document.getElementById('kpi-sales-amount');
        if (countEl) {
          countEl.innerText = (salesRes.metrics && salesRes.metrics.invoiceCount != null)
            ? salesRes.metrics.invoiceCount
            : (salesRes.totalRows != null ? salesRes.totalRows : (salesRes.totalElements || sales.length));
        }
        if (amtEl) {
          const totalSalesAmt = (salesRes.metrics && salesRes.metrics.totalSales != null)
            ? salesRes.metrics.totalSales
            : sales.reduce((tot, s) => tot + (s.totalAmount || s.total || 0), 0);
          amtEl.innerText = window.FormatUtil.formatRupees(totalSalesAmt);
        }
        this.renderRecentSales(sales);
      }

      const purRes = await window.OperationsService.getPurchases(0, 5);
      if (purRes) {
        const pur = purRes.rows || purRes.content || (Array.isArray(purRes) ? purRes : []);
        const countEl = document.getElementById('kpi-purchase-count');
        const amtEl = document.getElementById('kpi-purchase-amount');
        if (countEl) {
          countEl.innerText = (purRes.metrics && purRes.metrics.activeDocuments != null)
            ? purRes.metrics.activeDocuments
            : (purRes.totalRows != null ? purRes.totalRows : (purRes.totalElements || pur.length));
        }
        if (amtEl) {
          const totalPurAmt = (purRes.metrics && purRes.metrics.totalPurchases != null)
            ? purRes.metrics.totalPurchases
            : pur.reduce((tot, p) => tot + (p.totalAmount || p.total || 0), 0);
          amtEl.innerText = window.FormatUtil.formatRupees(totalPurAmt);
        }
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
    const tbody = document.getElementById('dash-recent-sales-tbody') || document.getElementById('recent-sales-tbody');
    if (!tbody) return;
    if (!sales || sales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim);">No transactions posted yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = sales.map(s => {
      const invNo = s.invoiceNo || s.number || '-';
      const custName = (s.customer && s.customer.name) || s.customerName || s.partyName || '-';
      const taxable = s.subtotal != null ? s.subtotal : (s.taxableAmount || 0);
      const grandTotal = s.totalAmount != null ? s.totalAmount : (s.total || 0);
      const isPaid = s.documentStatus === 'PAID' || s.paymentStatus === 'PAID';
      const statusText = s.documentStatus || s.paymentStatus || 'POSTED';
      return `
        <tr>
          <td style="font-weight: 700; color: var(--cyan);">${invNo}</td>
          <td>${window.FormatUtil.formatDate(s.invoiceDate || s.date)}</td>
          <td>${custName}</td>
          <td>${window.FormatUtil.formatRupees(taxable)}</td>
          <td>${window.FormatUtil.formatRupees(s.gstAmount || 0)}</td>
          <td style="font-weight: 700;">${window.FormatUtil.formatRupees(grandTotal)}</td>
          <td><span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">${statusText}</span></td>
          <td><button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;" onclick="window.BarcodeStudioController.quickGenerate('${invNo}')">Label</button></td>
        </tr>
      `;
    }).join('');
  }
};
