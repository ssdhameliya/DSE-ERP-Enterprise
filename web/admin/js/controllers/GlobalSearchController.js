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
    async search(query) {
      const q = (query !== undefined ? query : (document.getElementById('gs-query-input')?.value || '')).trim();
      const inputEl = document.getElementById('gs-query-input');
      if (inputEl && inputEl.value !== q) inputEl.value = q;

      if (!q) {
        lastResults = [];
        this.renderModuleRail({});
        this.renderResults();
        return;
      }

      isSearching = true;
      this.showStatus('Searching all permitted ERP modules...');

      try {
        const results = await window.ApiService.get(`/api/support/search?q=${encodeURIComponent(q)}`);
        lastResults = Array.isArray(results) ? results : [];

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
        console.error('[GlobalSearchController] Search failed:', err);
        lastResults = [];
        this.renderModuleRail({});
        this.showStatus('Search failed: ' + (err.message || 'Server error'));
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
      lastResults = [];
      currentFilter = ALL;
      this.renderModuleRail({});
      this.renderResults();
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
                const recId = r.recordId || 0;
                return `
                  <div class="search-result-row" ondblclick="window.GlobalSearchController.openRecord('${safeModKey}', ${recId}, '${safeRef}', '${safeTarget}')">
                    <div class="search-result-main">
                      <div class="search-result-ref">${r.reference || '-'}</div>
                      <div class="search-result-desc" title="${(r.description || '').replace(/"/g, '&quot;')}">${r.description || ''}</div>
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
        if (window.PartyController && window.PartyController.filterCustomers) {
          window.PartyController.filterCustomers(ref);
        }
      } else if (key.includes('SUPPLIER') || target.includes('supplier')) {
        window.NavigationRouter.selectNav('view-suppliers');
        if (window.PartyController && window.PartyController.filterSuppliers) {
          window.PartyController.filterSuppliers(ref);
        }
      } else if (key.includes('ITEM') || key.includes('INVENTORY') || target.includes('item')) {
        window.NavigationRouter.selectNav('view-item-master');
        if (window.ItemMasterController && window.ItemMasterController.filterItems) {
          window.ItemMasterController.filterItems(ref);
        }
      } else if (key.includes('QUOTATION') || ref.startsWith('QT') || target.includes('quotation')) {
        window.NavigationRouter.selectNav('view-quotations');
      } else if (key.includes('RETURN') || target.includes('return')) {
        window.NavigationRouter.selectNav('view-sales-returns');
      } else if (key.includes('PAYMENT') || target.includes('payment')) {
        window.NavigationRouter.selectNav('view-payment-receipt');
      } else if (key.includes('BANK') || key.includes('EXPENSE') || target.includes('bank')) {
        window.NavigationRouter.selectNav('view-bank-statement');
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
      if (query) {
        const inp = document.getElementById('gs-query-input');
        if (inp) inp.value = query;
        this.search(query);
      } else {
        setTimeout(() => {
          const inp = document.getElementById('gs-query-input');
          if (inp) inp.focus();
        }, 100);
      }
    }
  };
})();
