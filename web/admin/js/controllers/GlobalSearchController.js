/**
 * Jasvi Industries ERP - GlobalSearchController
 * Complete Desktop Parity matching GlobalSearchController.java & GlobalSearchService.java
 * Backed by GET /api/support/search?q={query}
 */
window.GlobalSearchController = (function() {
  const ALL = 'All Results';
  let lastResults = [];
  let currentFilter = ALL;
  let isSearching = false;

  function slug(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function getModuleIcon(module) {
    const m = (module || '').toLowerCase();
    if (m.includes('sale') || m.includes('invoice')) return '📄';
    if (m.includes('purchase') || m.includes('order')) return '📦';
    if (m.includes('customer')) return '👥';
    if (m.includes('supplier')) return '🏭';
    if (m.includes('item') || m.includes('inventory')) return '🏷️';
    if (m.includes('payment')) return '💳';
    if (m.includes('return')) return '🔄';
    if (m.includes('quotation')) return '📝';
    if (m.includes('bank') || m.includes('expense')) return '🏦';
    if (m.includes('reminder')) return '⏰';
    if (m.includes('communication')) return '✉️';
    return '🔍';
  }

  function parseDetailTokens(detail) {
    if (!detail) return [];
    return detail.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
  }

  function getChipClass(token) {
    const t = (token || '').toUpperCase();
    if (t.includes('STOCK:') || t.startsWith('QTY ')) return 'search-chip';
    if (t.includes('CONFIRMED') || t.includes('COMPLETED') || t.includes('PAID') || t.includes('ACTIVE') || t.includes('APPROVED')) return 'search-chip success';
    if (t.includes('PENDING') || t.includes('DUE') || t.includes('REVIEW')) return 'search-chip warning';
    if (t.includes('REJECT') || t.includes('CANCEL') || t.includes('OVERDUE')) return 'search-chip danger';
    if (t.startsWith('₹') || t.includes('CREDIT') || t.includes('DEBIT')) return 'search-chip money';
    return 'search-chip';
  }

  return {
    async bootstrapInitialResults() {
      const list = [];

      // 1. Sales
      let sales = (window.SalesController && window.SalesController.salesCache) || [];
      if (!sales.length) {
        try {
          const res = await window.ApiService.get('/api/operations/sales?page=0&size=10');
          sales = res.rows || res.content || (Array.isArray(res) ? res : []);
        } catch (e) {}
      }
      sales.slice(0, 10).forEach(s => {
        const invNo = s.invoiceNo || s.number || 'INV';
        const custName = (s.customer && s.customer.name) || s.customerName || 'Customer';
        const tot = (s.totalAmount != null ? s.totalAmount : (s.total || 0));
        const status = s.paymentStatus || (s.paidAmount >= tot ? 'PAID' : 'PENDING');
        list.push({
          module: 'Sales',
          moduleKey: 'SALE',
          recordId: s.id || 0,
          reference: invNo,
          description: custName,
          detail: `DATE: ${s.invoiceDate || 'Recent'}  AMOUNT: ₹ ${(parseFloat(tot)||0).toFixed(2)}  STATUS: ${status}`,
          targetFxml: 'SaleView.fxml'
        });
      });

      // 2. Purchases
      try {
        const pRes = await window.ApiService.get('/api/operations/purchases?page=0&size=10');
        const purchases = pRes.rows || pRes.content || (Array.isArray(pRes) ? pRes : []);
        purchases.slice(0, 10).forEach(p => {
          const invNo = p.invoiceNo || 'BILL';
          const supp = (p.supplier && p.supplier.name) || p.supplierName || 'Supplier';
          const tot = (p.totalAmount || 0);
          const status = p.paymentStatus || 'UNPAID';
          list.push({
            module: 'Purchases',
            moduleKey: 'PURCHASE',
            recordId: p.id || 0,
            reference: invNo,
            description: supp,
            detail: `DATE: ${p.invoiceDate || 'Recent'}  AMOUNT: ₹ ${(parseFloat(tot)||0).toFixed(2)}  STATUS: ${status}`,
            targetFxml: 'PurchaseView.fxml'
          });
        });
      } catch (e) {}

      // 3. Customers
      try {
        const custs = await window.MasterService.getParties('CUSTOMER');
        (custs || []).slice(0, 10).forEach(c => {
          list.push({
            module: 'Customers',
            moduleKey: 'CUSTOMER',
            recordId: c.id || 0,
            reference: c.partyCode || c.code || 'CUST',
            description: c.name || c.partyName || 'Customer',
            detail: `PHONE: ${c.phone || '-'}  GSTIN: ${c.gstin || 'Unregistered'}  CITY: ${c.city || 'Gujarat'}`,
            targetFxml: 'Customer.fxml'
          });
        });
      } catch (e) {}

      // 4. Suppliers
      try {
        const supps = await window.MasterService.getParties('SUPPLIER');
        (supps || []).slice(0, 10).forEach(s => {
          list.push({
            module: 'Suppliers',
            moduleKey: 'SUPPLIER',
            recordId: s.id || 0,
            reference: s.partyCode || s.code || 'SUPP',
            description: s.name || s.partyName || 'Supplier',
            detail: `PHONE: ${s.phone || '-'}  GSTIN: ${s.gstin || 'Unregistered'}  BANK: ${s.bankName || 'SBI'}`,
            targetFxml: 'Supplier.fxml'
          });
        });
      } catch (e) {}

      // 5. Items
      try {
        const items = await window.MasterService.getItems();
        (items || []).slice(0, 10).forEach(i => {
          const code = i.itemCode || i.code || 'ITEM';
          const desc = i.description || i.name || code;
          const stock = i.openingStock != null ? i.openingStock : (i.currentStock || 0);
          const rate = i.sellingPrice != null ? i.sellingPrice : (i.rate || 100);
          list.push({
            module: 'Inventory',
            moduleKey: 'ITEM',
            recordId: i.id || 0,
            reference: code,
            description: desc,
            detail: `STOCK: ${stock}  RATE: ₹ ${(parseFloat(rate)||0).toFixed(2)}  CAT: ${i.category || 'General'}`,
            targetFxml: 'ItemMaster.fxml'
          });
        });
      } catch (e) {}

      // 6. Quotations
      try {
        const qRes = await window.ApiService.get('/api/operations/quotations?page=0&size=10');
        const quotes = qRes.rows || qRes.content || (Array.isArray(qRes) ? qRes : []);
        quotes.slice(0, 10).forEach(q => {
          list.push({
            module: 'Quotations',
            moduleKey: 'QUOTATION',
            recordId: q.id || 0,
            reference: q.quotationNo || q.number || 'QTN',
            description: (q.customer && q.customer.name) || q.customerName || 'Customer',
            detail: `DATE: ${q.quotationDate || 'Recent'}  AMOUNT: ₹ ${(parseFloat(q.totalAmount || q.amount || 0)).toFixed(2)}  STATUS: ${q.status || 'SENT'}`,
            targetFxml: 'Quotation.fxml'
          });
        });
      } catch (e) {}

      return list;
    },

    async search(query) {
      const q = (query !== undefined ? query : (document.getElementById('gs-query-input')?.value || '')).trim();
      const inputEl = document.getElementById('gs-query-input');
      if (inputEl && inputEl.value !== q) inputEl.value = q;

      isSearching = true;
      this.showStatus(q ? `Searching ERP modules for "${q}"...` : 'Listing all permitted ERP records...');

      try {
        if (!q) {
          lastResults = await this.bootstrapInitialResults();
        } else {
          let serverResults = null;
          try {
            serverResults = await window.ApiService.get(`/api/support/search?q=${encodeURIComponent(q)}`);
          } catch (e) {}

          if (Array.isArray(serverResults) && serverResults.length > 0) {
            lastResults = serverResults;
          } else {
            // Local filter against all catalog items
            const allItems = await this.bootstrapInitialResults();
            const qLower = q.toLowerCase();
            lastResults = allItems.filter(item => {
              const ref = (item.reference || '').toLowerCase();
              const desc = (item.description || '').toLowerCase();
              const det = (item.detail || '').toLowerCase();
              const mod = (item.module || '').toLowerCase();
              return ref.includes(qLower) || desc.includes(qLower) || det.includes(qLower) || mod.includes(qLower);
            });
          }
        }

        // Group counts by module
        const counts = {};
        lastResults.forEach(r => {
          const mod = r.module || 'Other';
          counts[mod] = (counts[mod] || 0) + 1;
        });

        currentFilter = ALL;
        this.renderModuleRail(counts);
        this.renderResults();
      } catch (err) {
        console.error('[GlobalSearchController] Search error:', err);
        lastResults = await this.bootstrapInitialResults();
        const counts = {};
        lastResults.forEach(r => {
          const mod = r.module || 'Other';
          counts[mod] = (counts[mod] || 0) + 1;
        });
        currentFilter = ALL;
        this.renderModuleRail(counts);
        this.renderResults();
      } finally {
        isSearching = false;
      }
    },

    clear() {
      const inputEl = document.getElementById('gs-query-input');
      if (inputEl) {
        inputEl.value = '';
        inputEl.focus();
      }
      const omni = document.getElementById('omni-input');
      if (omni) omni.value = '';
      this.search('');
    },

    renderModuleRail(counts) {
      const railEl = document.getElementById('gs-module-rail');
      if (!railEl) return;

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const modules = Object.keys(counts);

      let html = `
        <div class="search-module-item ${currentFilter === ALL ? 'active' : ''}" onclick="window.GlobalSearchController.setFilter('${ALL}')">
          <span>${ALL}</span>
          <span class="search-module-badge">${total}</span>
        </div>
      `;

      modules.forEach(mod => {
        const count = counts[mod] || 0;
        const isActive = currentFilter === mod;
        html += `
          <div class="search-module-item ${isActive ? 'active' : ''}" onclick="window.GlobalSearchController.setFilter('${mod.replace(/'/g, "\\'")}')">
            <span>${getModuleIcon(mod)} ${mod}</span>
            <span class="search-module-badge">${count}</span>
          </div>
        `;
      });

      railEl.innerHTML = html;
    },

    setFilter(filterName) {
      currentFilter = filterName;
      // Update rail active state
      const railEl = document.getElementById('gs-module-rail');
      if (railEl) {
        railEl.querySelectorAll('.search-module-item').forEach(item => {
          const spanText = item.querySelector('span')?.innerText?.trim() || '';
          const match = filterName === ALL ? spanText === ALL : spanText.includes(filterName);
          item.classList.toggle('active', match);
        });
      }
      this.renderResults();
    },

    showStatus(msg) {
      const statusEl = document.getElementById('gs-summary-status');
      if (statusEl) statusEl.innerText = msg;
    },

    renderResults() {
      const container = document.getElementById('gs-results-container');
      const statusEl = document.getElementById('gs-summary-status');
      if (!container) return;

      if (lastResults.length === 0) {
        if (statusEl) statusEl.innerText = 'Search invoices, orders, parties, items, returns, payments, bank transactions, reminders, communications and master data.';
        container.innerHTML = `
          <div class="search-group-card" style="padding: 36px; text-align: center; color: var(--text-dim);">
            <div style="font-size: 2.2rem; margin-bottom: 10px;">🔍</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Search Jasvi Industries ERP</div>
            <div style="font-size: 0.78rem;">Type an invoice number, party name, phone, item code, or transaction reference to search across all modules.</div>
          </div>
        `;
        return;
      }

      const visible = lastResults.filter(r => currentFilter === ALL || r.module === currentFilter);
      const totalModules = new Set(lastResults.map(r => r.module)).size;

      if (statusEl) {
        statusEl.innerText = `${visible.length} visible • ${lastResults.length} total results across ${totalModules} modules`;
      }

      if (visible.length === 0) {
        container.innerHTML = `
          <div class="search-group-card" style="padding: 30px; text-align: center; color: var(--text-dim);">
            No records found matching module "${currentFilter}". Select "All Results" to view other matches.
          </div>
        `;
        return;
      }

      // Group by module
      const grouped = {};
      visible.forEach(r => {
        const mod = r.module || 'Other';
        if (!grouped[mod]) grouped[mod] = [];
        grouped[mod].push(r);
      });

      let html = '';
      Object.keys(grouped).forEach(mod => {
        const rows = grouped[mod];
        html += `
          <div class="search-group-card">
            <div class="search-group-header">
              <span>${getModuleIcon(mod)} ${mod}</span>
              <span style="font-size: 0.74rem; color: var(--text-dim);">${rows.length} match${rows.length === 1 ? '' : 'es'}</span>
            </div>
            <div>
              ${rows.map(r => {
                const tokens = parseDetailTokens(r.detail);
                const safeRef = (r.reference || '').replace(/'/g, "\\'");
                const safeModKey = (r.moduleKey || '').replace(/'/g, "\\'");
                const safeTarget = (r.targetFxml || '').replace(/'/g, "\\'");
                const safeDesc = (r.description || '').replace(/"/g, '&quot;');
                const recId = r.recordId || 0;
                return `
                  <div class="search-result-row" ondblclick="window.GlobalSearchController.openRecord('${safeModKey}', ${recId}, '${safeRef}', '${safeTarget}')">
                    <div class="search-result-main">
                      <div class="search-result-ref">${r.reference || '-'}</div>
                      <div class="search-result-desc" title="${safeDesc}">${r.description || ''}</div>
                      <div class="search-result-chips">
                        ${tokens.map(t => `<span class="${getChipClass(t)}">${t}</span>`).join('')}
                      </div>
                    </div>
                    <div>
                      <button type="button" class="btn btn-secondary" style="font-size: 0.74rem; padding: 4px 12px; height: 28px;" onclick="window.GlobalSearchController.openRecord('${safeModKey}', ${recId}, '${safeRef}', '${safeTarget}')">
                        👁 View
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    },

    openRecord(moduleKey, recordId, reference, targetFxml) {
      const key = (moduleKey || '').toUpperCase();
      const ref = (reference || '').trim();
      const target = (targetFxml || '').toLowerCase();

      if (key.includes('SALE') || ref.startsWith('INV') || ref.startsWith('JI/') || target.includes('sale')) {
        window.NavigationRouter.selectNav('view-sales-register');
        if (window.SalesController) {
          window.SalesController.filterSales(ref);
          window.SalesController.openSaleViewMode(ref);
        }
      } else if (key.includes('PURCHASE') || ref.startsWith('PO') || ref.startsWith('BILL') || target.includes('purchase')) {
        window.NavigationRouter.selectNav('view-purchase-register');
        if (window.PurchaseController) {
          const searchInp = document.getElementById('pur-filter-search');
          if (searchInp) {
            searchInp.value = ref;
            window.PurchaseController.loadPurchases(0);
          }
          window.PurchaseController.showDetails(ref);
        }
      } else if (key.includes('CUSTOMER') || target.includes('customer')) {
        window.NavigationRouter.selectNav('view-customers');
        if (window.PartyController && window.PartyController.isolateParty) {
          window.PartyController.isolateParty(ref, true);
        } else if (window.PartyController && window.PartyController.filterCustomers) {
          window.PartyController.filterCustomers(ref);
        }
      } else if (key.includes('SUPPLIER') || target.includes('supplier')) {
        window.NavigationRouter.selectNav('view-suppliers');
        if (window.PartyController && window.PartyController.isolateParty) {
          window.PartyController.isolateParty(ref, false);
        } else if (window.PartyController && window.PartyController.filterSuppliers) {
          window.PartyController.filterSuppliers(ref);
        }
      } else if (key.includes('ITEM') || key.includes('INVENTORY') || target.includes('item')) {
        window.NavigationRouter.selectNav('view-item-master');
        if (window.ItemMasterController && window.ItemMasterController.isolateItem) {
          window.ItemMasterController.isolateItem(ref);
        } else if (window.ItemMasterController && window.ItemMasterController.filterItems) {
          window.ItemMasterController.filterItems(ref);
        }
      } else if (key.includes('QUOTATION') || ref.startsWith('QT') || target.includes('quotation')) {
        window.NavigationRouter.selectNav('view-quotations');
        if (window.QuotationController && window.QuotationController.isolateQuotation) {
          window.QuotationController.isolateQuotation(ref);
        }
      } else if (key.includes('RETURN') || target.includes('return')) {
        const isSalesReturn = !key.includes('PURCHASE');
        window.NavigationRouter.selectNav(isSalesReturn ? 'view-sales-returns' : 'view-purchase-returns');
        if (window.ReturnsController && window.ReturnsController.isolateReturn) {
          window.ReturnsController.isolateReturn(ref, isSalesReturn);
        }
      } else if (key.includes('PAYMENT') || target.includes('payment')) {
        window.NavigationRouter.selectNav('view-payment-receipt');
      } else if (key.includes('BANK') || key.includes('EXPENSE') || target.includes('bank')) {
        window.NavigationRouter.selectNav('view-bank-statement');
        if (window.BankStatementController && window.BankStatementController.filterByReference) {
          window.BankStatementController.filterByReference(ref);
        }
      } else if (key.includes('REMINDER') || target.includes('reminder')) {
        window.NavigationRouter.selectNav('view-reminders');
      } else if (key.includes('COMMUNICATION') || target.includes('communication')) {
        window.NavigationRouter.selectNav('view-communication');
      } else {
        window.AppDialogService.showToast(`Navigating to ${reference}...`, 'info');
      }
    },

    openGlobalSearch(query) {
      window.NavigationRouter.selectNav('view-global-search');
      const q = (query || '').trim();
      const inp = document.getElementById('gs-query-input');
      if (inp) inp.value = q;
      this.search(q);
      setTimeout(() => {
        const inp2 = document.getElementById('gs-query-input');
        if (inp2) inp2.focus();
      }, 100);
    }
  };
})();

window.openGlobalSearch = function(query) {
  if (window.GlobalSearchController && window.GlobalSearchController.openGlobalSearch) {
    window.GlobalSearchController.openGlobalSearch(query);
  } else if (window.NavigationRouter) {
    window.NavigationRouter.selectNav('view-global-search');
  }
};
