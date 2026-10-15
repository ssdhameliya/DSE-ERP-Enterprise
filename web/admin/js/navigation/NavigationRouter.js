/**
 * Jasvi Industries ERP - NavigationRouter
 * View manager, route dispatcher, and multi-document workspace tab controller matching desktop NavigationManager
 */
window.NavigationRouter = (function() {
  let currentViewId = 'view-dashboard';
  const openTabs = [
    { id: 'view-dashboard', title: 'Dashboard', icon: '📊', closable: false }
  ];
  let hoverHideTimeout = null;
  let isHoverPeekActive = false;

  const viewMetadata = {
    'view-dashboard': { title: 'Dashboard', breadcrumb: 'Executive Command Center', icon: '📊' },
    'view-sales-register': { title: 'Sales Register', breadcrumb: 'Sales & Distribution', icon: '🛒' },
    'view-sale-create': { title: 'Sale Invoice', breadcrumb: 'Sales & Distribution', icon: '🛒' },
    'view-sales-returns': { title: 'Sales Returns', breadcrumb: 'Customer Goods Inward', icon: '↩️' },
    'view-credit-notes': { title: 'Credit Notes', breadcrumb: 'Accounts & Adjustments', icon: '💳' },
    'view-quotations': { title: 'Quotations', breadcrumb: 'Proforma & Quotation Pipeline', icon: '📝' },
    'view-quotation-editor': { title: 'Quotation Editor', breadcrumb: 'Sales & Distribution', icon: '📝' },
    'view-purchase-register': { title: 'Purchase Register', breadcrumb: 'Procurement & Inward Bills', icon: '📦' },
    'view-purchase-creation': { title: 'Purchase Invoice', breadcrumb: 'Procurement & Inward Bills', icon: '📦' },
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
    'view-global-search': { title: 'Global Search', breadcrumb: 'Cross-Module Enterprise Intelligence', icon: '🔍' },
    'view-record-payment': { title: 'Invoice Payment', breadcrumb: 'Record Payment & History', icon: '💳' },
    'view-pdf-studio': { title: 'PDF Studio', breadcrumb: 'Visual Document Template Designer', icon: '📄' },
    'view-excel-studio': { title: 'Excel Studio', breadcrumb: 'Custom Spreadsheet Exporter', icon: '📊' },
    'view-settings': { title: 'Settings Studio', breadcrumb: 'Organization & System Config', icon: '⚙️' },
    'view-settings-company': { title: 'Company Settings', breadcrumb: 'Organization Legal Profile & Banking', icon: '⚙️' },
    'view-settings-email': { title: 'Corporate Email', breadcrumb: 'SMTP & Delivery Services', icon: '✉️' },
    'view-settings-security': { title: 'Security Settings', breadcrumb: 'Session & Authentication Governance', icon: '🔒' },
    'view-settings-shortcuts': { title: 'Keyboard Shortcuts', breadcrumb: 'Productivity Hotkey Accelerators', icon: '⌨️' },
    'view-safe-rollback': { title: 'Safe Rollback', breadcrumb: 'Application Release Coordinator', icon: '⏮️' },
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

      // Dispatch controller onMount lifecycle only if authenticated
      if (window.AuthService && window.AuthService.isAuthenticated()) {
        this.dispatchLifecycle(viewId);
      }
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
      const sb = document.querySelector('aside.app-sidebar');
      if (sb && sb.classList.contains('collapsed')) {
        sb.classList.remove('collapsed');
      }

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
        sb.classList.remove('hover-peek');
        if (hoverHideTimeout) { clearTimeout(hoverHideTimeout); hoverHideTimeout = null; }
        isHoverPeekActive = false;
        sb.classList.toggle('collapsed');
        if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
        try { localStorage.setItem('dse_sidebar_collapsed', sb.classList.contains('collapsed')); } catch(e) {}
      }
    },

    installSidebarHoverPeek() {
      const sb = document.querySelector('aside.app-sidebar');
      if (!sb) return;

      const showPeek = () => {
        if (!sb.classList.contains('collapsed')) return;
        if (hoverHideTimeout) {
          clearTimeout(hoverHideTimeout);
          hoverHideTimeout = null;
        }
        if (!sb.classList.contains('hover-peek')) {
          sb.classList.add('hover-peek');
          isHoverPeekActive = true;
        }
      };

      const scheduleHide = () => {
        if (!isHoverPeekActive) return;
        if (hoverHideTimeout) clearTimeout(hoverHideTimeout);
        hoverHideTimeout = setTimeout(() => {
          sb.classList.remove('hover-peek');
          isHoverPeekActive = false;
          hoverHideTimeout = null;
        }, 280);
      };

      // Hover on sidebar
      sb.addEventListener('mouseenter', () => {
        if (sb.classList.contains('collapsed')) showPeek();
        else if (isHoverPeekActive && hoverHideTimeout) {
          clearTimeout(hoverHideTimeout);
          hoverHideTimeout = null;
        }
      });
      sb.addEventListener('mouseleave', () => {
        scheduleHide();
      });

      // Hover on toggle buttons
      document.querySelectorAll('.header-badge-btn, #btn-sidebar-toggle').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
          if (sb.classList.contains('collapsed')) showPeek();
        });
        btn.addEventListener('mouseleave', () => {
          scheduleHide();
        });
      });

      // Left edge hover peek trigger (moving mouse near left screen edge <= 12px)
      window.addEventListener('mousemove', (e) => {
        if (sb.classList.contains('collapsed') && !isHoverPeekActive) {
          if (e.clientX <= 12 && e.clientY >= 50 && e.clientY <= window.innerHeight - 30) {
            showPeek();
          }
        }
      });

      // Close peek on Escape or click outside
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isHoverPeekActive) {
          sb.classList.remove('hover-peek');
          isHoverPeekActive = false;
          if (hoverHideTimeout) clearTimeout(hoverHideTimeout);
        }
      });

      document.addEventListener('click', (e) => {
        if (isHoverPeekActive && !sb.contains(e.target) && !e.target.closest('.header-badge-btn')) {
          sb.classList.remove('hover-peek');
          isHoverPeekActive = false;
          if (hoverHideTimeout) clearTimeout(hoverHideTimeout);
        }
      });
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
            if (window.SalesController.isNavigatingToEditor) {
              window.SalesController.isNavigatingToEditor = false;
            } else {
              window.SalesController.initSaleWorkspace(null, false);
            }
          }
          break;
        case 'view-purchase-register':
          if (window.PurchaseController) window.PurchaseController.loadPurchases();
          break;
        case 'view-purchase-creation':
          if (window.PurchaseController && window.PurchaseController.openPurchaseEditor) {
            window.PurchaseController.openPurchaseEditor();
          }
          break;
        case 'view-item-master':
          if (window.ItemMasterController) window.ItemMasterController.loadItems();
          break;
        case 'view-inventory':
          if (window.ItemMasterController) window.ItemMasterController.loadInventory();
          break;
        case 'view-masters':
          if (window.MasterDataController) window.MasterDataController.loadMastersData();
          break;
        case 'view-users':
        case 'view-user-access':
          if (window.UserAccessController) window.UserAccessController.loadUsers();
          break;
        case 'view-settings':
          if (window.SettingsController) window.SettingsController.init();
          break;
        case 'view-customers':
          if (window.PartyController) window.PartyController.loadCustomers();
          break;
        case 'view-suppliers':
          if (window.PartyController) window.PartyController.loadSuppliers();
          break;
        case 'view-quotations':
          if (window.QuotationController) window.QuotationController.loadQuotations();
          break;
        case 'view-quotation-editor':
          // Managed by QuotationController.openQuotationEditor
          break;
        case 'view-sales-returns':
          if (window.ReturnsController) window.ReturnsController.loadReturns('SALES RETURN');
          break;
        case 'view-purchase-returns':
          if (window.ReturnsController) window.ReturnsController.loadReturns('PURCHASE RETURN');
          break;
        case 'view-credit-notes':
          if (window.CreditDebitNoteController) window.CreditDebitNoteController.loadCreditNotes();
          break;
        case 'view-debit-notes':
          if (window.CreditDebitNoteController) window.CreditDebitNoteController.loadDebitNotes();
          break;
        case 'view-bank-entry':
          if (window.FinanceController) window.FinanceController.loadBankMode();
          break;
        case 'view-expense-entry':
          if (window.FinanceController) window.FinanceController.loadExpenseMode();
          break;
        case 'view-bank-statement':
          if (window.BankStatementController) window.BankStatementController.loadStatementWorkspace();
          break;
        case 'view-purchase-recon':
          if (window.PurchaseReconController) window.PurchaseReconController.loadPurchaseRecon();
          break;
        case 'view-recon-supplier':
          if (window.PurchaseReconController) window.PurchaseReconController.loadReconSuppliers();
          break;
        case 'view-communication':
          if (window.CommunicationController) window.CommunicationController.loadCommunications();
          break;
        case 'view-general-ledger':
          if (window.FinanceController) {
            if (window.FinanceController.loadGeneralLedger) window.FinanceController.loadGeneralLedger();
            else window.FinanceController.loadFinance();
          }
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
        case 'view-reports':
          if (window.ReportsController) window.ReportsController.init();
          break;
        case 'view-reminders':
          if (window.ReminderCenterController) window.ReminderCenterController.init();
          break;
        case 'view-users':
        case 'view-user-access':
          if (window.UserAccessController) window.UserAccessController.loadUsers();
          break;
        case 'view-audit':
        case 'view-global-audit':
          if (window.UserAccessController) window.UserAccessController.loadAudit();
          break;
        case 'view-import':
          if (window.ImportController) window.ImportController.init();
          break;
        case 'view-barcode':
        case 'view-barcode-studio':
          if (window.BarcodeStudioController) window.BarcodeStudioController.init();
          break;
        case 'view-settings':
          if (window.SettingsController) window.SettingsController.init('COMPANY');
          break;
        case 'view-settings-company':
          if (window.SettingsController) {
            window.SettingsController.init('COMPANY');
            window.SettingsController.loadCompanySettings();
          }
          break;
        case 'view-settings-email':
          if (window.SettingsController) {
            window.SettingsController.init('EMAIL');
            window.SettingsController.loadEmailSettings();
          }
          break;
        case 'view-settings-security':
          if (window.SettingsController) {
            window.SettingsController.init('SECURITY');
            window.SettingsController.loadSecuritySettings();
          }
          break;
        case 'view-settings-shortcuts':
          if (window.SettingsController) {
            window.SettingsController.init('SHORTCUTS');
            window.SettingsController.loadShortcutsSettings();
          }
          break;
        case 'view-safe-rollback':
          if (window.SettingsController) window.SettingsController.loadSafeRollback();
          break;
        case 'view-backup':
        case 'view-backup-restore':
          if (window.SettingsController) window.SettingsController.loadBackups();
          break;
        case 'view-pdf-studio':
          if (window.SettingsController) window.SettingsController.loadPdfStudio();
          break;
        case 'view-excel-studio':
          if (window.SettingsController) window.SettingsController.loadExcelStudio();
          break;
        case 'view-global-search':
          if (window.GlobalSearchController) window.GlobalSearchController.search('');
          break;
        case 'view-notifications':
        case 'view-notifications-center':
          if (window.NotificationCenterController) window.NotificationCenterController.loadNotifications();
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

      // Restore saved sidebar collapsed state
      try {
        const savedCollapsed = localStorage.getItem('dse_sidebar_collapsed');
        const sb = document.querySelector('aside.app-sidebar');
        if (sb && savedCollapsed === 'true') {
          sb.classList.add('collapsed');
        }
      } catch (e) {}

      this.installSidebarHoverPeek();
    }
  };
})();
