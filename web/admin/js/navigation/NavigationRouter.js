/**
 * Jasvi Industries ERP - NavigationRouter
 * View manager, route dispatcher, and multi-document workspace tab controller matching desktop NavigationManager
 */
window.NavigationRouter = (function() {
  let currentViewId = 'view-dashboard';
  const openTabs = [
    { id: 'view-dashboard', title: 'Dashboard', icon: '📊', closable: false }
  ];

  const viewMetadata = {
    'view-dashboard': { title: 'Dashboard', breadcrumb: 'Executive Command Center', icon: '📊' },
    'view-sales-register': { title: 'Sales Register', breadcrumb: 'Sales & Distribution', icon: '🛒' },
    'view-sale-create': { title: 'Sale Invoice', breadcrumb: 'Sales & Distribution', icon: '🛒' },
    'view-sales-returns': { title: 'Sales Returns', breadcrumb: 'Customer Goods Inward', icon: '↩️' },
    'view-credit-notes': { title: 'Credit Notes', breadcrumb: 'Accounts & Adjustments', icon: '💳' },
    'view-quotations': { title: 'Quotations', breadcrumb: 'Proforma & Quotation Pipeline', icon: '📝' },
    'view-purchase-register': { title: 'Purchase Register', breadcrumb: 'Procurement & Inward Bills', icon: '📦' },
    'view-purchase-returns': { title: 'Purchase Returns', breadcrumb: 'Supplier Returns & Memos', icon: '🔄' },
    'view-debit-notes': { title: 'Debit Notes', breadcrumb: 'Supplier Debit Notes', icon: '🧾' },
    'view-item-master': { title: 'Item Master', breadcrumb: 'Materials & SKU Catalog', icon: '🏷️' },
    'view-masters': { title: 'Masters (Lookups)', breadcrumb: 'Categories & Unit Definitions', icon: '📚' },
    'view-bank-entry': { title: 'Bank Entry', breadcrumb: 'Receipt & Payment Vouchers', icon: '🏦' },
    'view-expense-entry': { title: 'Expense Entry', breadcrumb: 'Factory & Operating Expenses', icon: '💸' },
    'view-bank-statement': { title: 'Bank Statement', breadcrumb: 'CSV/OFX Reconciliation', icon: '📑' },
    'view-purchase-recon': { title: 'Purchase Recon', breadcrumb: 'GSTR-2B Inward Match Engine', icon: '🔍' },
    'view-recon-supplier': { title: 'Recon Supplier', breadcrumb: 'Supplier Balance Reconciliation', icon: '🤝' },
    'view-general-ledger': { title: 'General Ledger', breadcrumb: 'Double-Entry Financial Accounts', icon: '💰' },
    'view-financial-statements': { title: 'Financial Statements', breadcrumb: 'Balance Sheet & Profit/Loss', icon: '📈' },
    'view-aging-analysis': { title: 'Aging Analysis', breadcrumb: 'Debtor / Creditor Overdue Aging', icon: '⏳' },
    'view-gst-compliance': { title: 'GST Compliance', breadcrumb: 'GSTR-1, 3B & E-Way Generation', icon: '⚖️' },
    'view-eway-bill': { title: 'E-Way Bill & E-Invoice', breadcrumb: 'Government Portal Gateway', icon: '🚚' },
    'view-automation': { title: 'Automation Center', breadcrumb: 'Rules, Webhooks & Triggers', icon: '⚡' },
    'view-import': { title: 'Data Import', breadcrumb: 'Bulk Excel & CSV Ingestion', icon: '📥' },
    'view-inventory': { title: 'Inventory Ledger', breadcrumb: 'Real-time Warehouse Stock & Valuation', icon: '🏭' },
    'view-barcode': { title: 'Barcode Studio', breadcrumb: 'Thermal Label & Security Seal Studio', icon: '📏' },
    'view-barcode-studio': { title: 'Barcode Studio', breadcrumb: 'Thermal Label & Security Seal Studio', icon: '📏' },
    'view-customers': { title: 'CRM / Customers', breadcrumb: 'Client Profiles & Credit Limits', icon: '👥' },
    'view-suppliers': { title: 'HRM / Suppliers', breadcrumb: 'Vendor Profiles & Payment Registers', icon: '🏢' },
    'view-reports': { title: 'Reports & BI', breadcrumb: 'Executive Analytics & Drilldown', icon: '📊' },
    'view-reminders': { title: 'Reminder Center', breadcrumb: 'Payment Follow-ups & Tasks', icon: '⏰' },
    'view-user-access': { title: 'User Access & RBAC', breadcrumb: 'Role Matrix & Security Governance', icon: '👤' },
    'view-users': { title: 'User Access & RBAC', breadcrumb: 'Role Matrix & Security Governance', icon: '👤' },
    'view-audit': { title: 'Global Audit Trail', breadcrumb: 'Tamper-Evident System Event Logs', icon: '📜' },
    'view-communication': { title: 'Communication Center', breadcrumb: 'Email Logs & WhatsApp Gateways', icon: '💬' },
    'view-pdf-studio': { title: 'PDF Studio', breadcrumb: 'Visual Document Template Designer', icon: '📄' },
    'view-excel-studio': { title: 'Excel Studio', breadcrumb: 'Custom Spreadsheet Exporter', icon: '📊' },
    'view-settings': { title: 'Settings Studio', breadcrumb: 'Organization & System Config', icon: '⚙️' },
    'view-backup': { title: 'Backup & Restore', breadcrumb: 'Database Snapshots & Disaster Recovery', icon: '💾' }
  };

  function updateHeader(meta) {
    const titleEl = document.getElementById('header-page-title');
    const breadcrumbEl = document.getElementById('header-breadcrumb');
    if (titleEl && meta) titleEl.innerText = meta.title;
    if (breadcrumbEl && meta) breadcrumbEl.innerText = meta.breadcrumb;
  }

  function renderTabs() {
    const container = document.getElementById('workspace-tabs-container');
    if (!container) return;
    container.innerHTML = openTabs.map(tab => {
      const isActive = tab.id === currentViewId;
      return `
        <div class="workspace-tab ${isActive ? 'active' : ''}" onclick="window.NavigationRouter.selectNav('${tab.id}', false)">
          <span>${tab.icon || '📄'}</span>
          <span>${tab.title}</span>
          ${tab.closable ? `<span class="workspace-tab-close" onclick="window.NavigationRouter.closeTab('${tab.id}', event)" title="Close Tab">&times;</span>` : ''}
        </div>
      `;
    }).join('');
  }

  return {
    getCurrentView() {
      return currentViewId;
    },

    selectNav(viewId, triggerAddTab = true) {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();

      // Strictly hide all views and remove active class
      document.querySelectorAll('.module-view, .view-section').forEach(sec => {
        sec.classList.remove('active');
        sec.style.display = 'none';
      });

      // Clear all active navigation highlights
      document.querySelectorAll('.nav-single-item, .nav-child-item, .sidebar-item').forEach(btn => {
        btn.classList.remove('active');
      });

      const targetView = document.getElementById(viewId);
      if (targetView) {
        targetView.classList.add('active');
        targetView.style.display = 'block';
      }

      const navKey = viewId.replace('view-', '');
      const targetNav = document.getElementById(`nav-${navKey}`) ||
                        document.getElementById(`nav-${navKey.replace('-register', '')}`);
      if (targetNav) {
        targetNav.classList.add('active');
        // If child of a group, expand parent group automatically
        const parentGroup = targetNav.closest('.nav-group');
        if (parentGroup) {
          parentGroup.classList.add('open', 'expanded');
          const children = parentGroup.querySelector('.nav-children');
          if (children) children.style.display = 'block';
          const chev = parentGroup.querySelector('.nav-chevron');
          if (chev) { chev.style.transform = 'rotate(90deg)'; chev.innerHTML = '&#9660;'; }
        }
      }

      currentViewId = viewId;

      // Update Header Title & Breadcrumb matching Desktop
      const meta = viewMetadata[viewId] || { title: navKey.toUpperCase(), breadcrumb: 'Workspace Module', icon: '📄' };
      updateHeader(meta);

      // Manage Workspace Tabs
      if (triggerAddTab) {
        const existing = openTabs.find(t => t.id === viewId);
        if (!existing) {
          openTabs.push({ id: viewId, title: meta.title, icon: meta.icon, closable: viewId !== 'view-dashboard' });
        }
      }
      renderTabs();

      // Update URL hash without polluting history
      if (window.location.hash !== `#${navKey}`) {
        if (window.history && window.history.pushState) {
          window.history.pushState({ viewId }, '', `#${navKey}`);
        } else {
          window.location.hash = `#${navKey}`;
        }
      }

      // Dispatch controller onMount lifecycle
      this.dispatchLifecycle(viewId);
    },

    closeTab(viewId, e) {
      if (e) e.stopPropagation();
      const idx = openTabs.findIndex(t => t.id === viewId);
      if (idx === -1) return;
      openTabs.splice(idx, 1);
      if (currentViewId === viewId) {
        const next = openTabs[Math.max(0, idx - 1)] || openTabs[0];
        this.selectNav(next.id, false);
      } else {
        renderTabs();
      }
    },

    toggleNavGroup(groupId) {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      const groupEl = document.getElementById(groupId);
      if (!groupEl) return;
      const isOpen = groupEl.classList.contains('open') || groupEl.classList.contains('expanded');

      // 1. Collapse all other groups (matching Desktop collapseAllSubmenus)
      document.querySelectorAll('.nav-group').forEach(other => {
        if (other !== groupEl) {
          other.classList.remove('open', 'expanded');
          const ch = other.querySelector('.nav-children');
          if (ch) ch.style.display = 'none';
          const chev = other.querySelector('.nav-chevron');
          if (chev) { chev.style.transform = 'rotate(0deg)'; chev.innerHTML = '&#9654;'; }
        }
      });

      // 2. Toggle targeted group
      const children = groupEl.querySelector('.nav-children');
      const chevron = groupEl.querySelector('.nav-chevron');
      if (isOpen) {
        groupEl.classList.remove('open', 'expanded');
        if (children) children.style.display = 'none';
        if (chevron) { chevron.style.transform = 'rotate(0deg)'; chevron.innerHTML = '&#9654;'; }
      } else {
        groupEl.classList.add('open', 'expanded');
        if (children) children.style.display = 'block';
        if (chevron) { chevron.style.transform = 'rotate(90deg)'; chevron.innerHTML = '&#9660;'; }
      }
    },

    toggleSidebar() {
      const sb = document.querySelector('aside.app-sidebar');
      if (sb) {
        sb.classList.toggle('collapsed');
        if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      }
    },

    dispatchLifecycle(viewId) {
      switch (viewId) {
        case 'view-dashboard':
          if (window.DashboardController) window.DashboardController.refresh();
          break;
        case 'view-sales-register':
          if (window.SalesController) window.SalesController.loadSales();
          break;
        case 'view-sale-create':
          if (window.SalesController && window.SalesController.initSaleWorkspace) {
            window.SalesController.initSaleWorkspace();
          }
          break;
        case 'view-purchase-register':
          if (window.PurchaseController) window.PurchaseController.loadPurchases();
          break;
        case 'view-item-master':
          if (window.ItemMasterController) window.ItemMasterController.loadItems();
          break;
        case 'view-inventory':
          if (window.ItemMasterController) window.ItemMasterController.loadInventory();
          break;
        case 'view-masters':
          if (window.ItemMasterController) window.ItemMasterController.loadCategories();
          break;
        case 'view-customers':
          if (window.PartyController) window.PartyController.loadCustomers();
          break;
        case 'view-suppliers':
          if (window.PartyController) window.PartyController.loadSuppliers();
          break;
        case 'view-quotations':
          if (window.SalesController) window.SalesController.loadQuotations();
          break;
        case 'view-sales-returns':
          if (window.SalesController) window.SalesController.loadReturns();
          break;
        case 'view-credit-notes':
          if (window.SalesController) window.SalesController.loadCreditNotes();
          break;
        case 'view-purchase-returns':
          if (window.PurchaseController) window.PurchaseController.loadReturns();
          break;
        case 'view-debit-notes':
          if (window.PurchaseController) window.PurchaseController.loadDebitNotes();
          break;
        case 'view-bank-entry':
        case 'view-expense-entry':
        case 'view-general-ledger':
          if (window.FinanceController) window.FinanceController.loadFinance();
          break;
        case 'view-financial-statements':
          if (window.FinanceController) window.FinanceController.loadFinancialStatements();
          break;
        case 'view-aging-analysis':
          if (window.FinanceController) window.FinanceController.loadAgingData();
          break;
        case 'view-gst-compliance':
          if (window.GstController) window.GstController.loadGstData();
          break;
        case 'view-eway-bill':
          if (window.EWayBillController) window.EWayBillController.loadEWayBills();
          break;
        case 'view-users':
        case 'view-user-access':
          if (window.UserAccessController) window.UserAccessController.loadUsers();
          break;
        case 'view-audit':
        case 'view-global-audit':
          if (window.UserAccessController) window.UserAccessController.loadAudit();
          break;
        case 'view-barcode':
        case 'view-barcode-studio':
          if (window.BarcodeStudioController) window.BarcodeStudioController.init();
          break;
        case 'view-backup':
        case 'view-backup-restore':
          if (window.SettingsController) window.SettingsController.loadBackups();
          break;
      }
    },

    init() {
      let initialView = 'view-dashboard';
      if (window.location.hash) {
        const clean = window.location.hash.replace('#', '');
        const cand = 'view-' + clean;
        if (document.getElementById(cand)) {
          initialView = cand;
        }
      }
      this.selectNav(initialView);

      // Handle browser back/forward buttons
      window.addEventListener('popstate', (e) => {
        if (e.state && e.state.viewId) {
          this.selectNav(e.state.viewId, false);
        } else if (window.location.hash) {
          const viewId = 'view-' + window.location.hash.replace('#', '');
          const target = document.getElementById(viewId);
          if (target) this.selectNav(viewId, false);
        }
      });

      // Handle direct hash navigation
      window.addEventListener('hashchange', () => {
        const hashClean = window.location.hash.replace('#', '');
        const targetView = 'view-' + hashClean;
        if (document.getElementById(targetView) && targetView !== currentViewId) {
          this.selectNav(targetView, false);
        }
      });
    }
  };
})();
