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
  let isNavigating = false;

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
    'view-record-payment': { title: 'Invoice Payment', breadcrumb: 'Finance & Payments', icon: '💳' },
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
    'view-customer-360': { title: 'Customer 360°', breadcrumb: 'CRM / One Customer View across Records', icon: '🌐' },
    'view-suppliers': { title: 'HRM / Suppliers', breadcrumb: 'Vendor Profiles & Payment Registers', icon: '🏢' },
    'view-supplier-360': { title: 'Supplier 360°', breadcrumb: 'HRM / One Supplier View across Records', icon: '🌐' },
    'view-reports': { title: 'Reports & BI', breadcrumb: 'Executive Analytics & Drilldown', icon: '📊' },
    'view-reminders': { title: 'Reminder Center', breadcrumb: 'Payment Follow-ups & Tasks', icon: '⏰' },
    'view-user-access': { title: 'User Access & RBAC', breadcrumb: 'Role Matrix & Security Governance', icon: '👤' },
    'view-users': { title: 'User Access & RBAC', breadcrumb: 'Role Matrix & Security Governance', icon: '👤' },
    'view-registration-approvals': { title: 'Registration Approvals', breadcrumb: 'User Access & Security Governance', icon: '📋' },
    'view-permission-matrix': { title: 'Permission Matrix', breadcrumb: 'Role-Based Access Control (RBAC)', icon: '⚡' },
    'view-audit': { title: 'Global Audit Trail', breadcrumb: 'Tamper-Evident System Event Logs', icon: '📜' },
    'view-communication': { title: 'Communication Center', breadcrumb: 'Email Logs & WhatsApp Gateways', icon: '💬' },
    'view-global-search': { title: 'Global Search', breadcrumb: 'Cross-Module Enterprise Intelligence', icon: '🔍' },
    'view-profile': { title: 'My Profile', breadcrumb: 'Account Security & Personal Info', icon: '👤' },
    'view-record-payment': { title: 'Invoice Payment', breadcrumb: 'Record Payment & History', icon: '💳' },
    'view-settings': { title: 'Settings Studio', breadcrumb: 'Organization & System Config', icon: '⚙️' },
    'view-settings-company': { title: 'Company Settings', breadcrumb: 'Organization Legal Profile & Banking', icon: '⚙️' },
    'view-settings-payment': { title: 'Payment & Bank', breadcrumb: 'Payment Methods & Banking Rules', icon: '💳' },
    'view-settings-invoice': { title: 'Invoice & Print', breadcrumb: 'Invoice Layout & Print Formats', icon: '🧾' },
    'view-settings-notifications': { title: 'Notification Settings', breadcrumb: 'System Alerts & Subscriptions', icon: '🔔' },
    'view-settings-email': { title: 'Corporate Email', breadcrumb: 'SMTP & Delivery Services', icon: '✉️' },
    'view-settings-security': { title: 'Security Settings', breadcrumb: 'Session & Authentication Governance', icon: '🔒' },
    'view-settings-modules': { title: 'Module Management', breadcrumb: 'Enterprise Module Toggles & Automation', icon: '🧩' }
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
    get currentNavId() {
      return currentViewId;
    },

    getCurrentView() {
      return currentViewId;
    },

    navigate(destination) {
      if (!destination) return;
      let viewId = destination;
      if (!viewId.startsWith('view-')) {
        viewId = 'view-' + viewId;
      }
      return this.selectNav(viewId);
    },

    navigateTo(destination, triggerAddTab = true) {
      if (!destination) return;
      let viewId = destination;
      if (!viewId.startsWith('view-')) {
        viewId = 'view-' + viewId;
      }
      return this.selectNav(viewId, triggerAddTab);
    },

    async selectNav(viewId, triggerAddTab = true, forceLifecycle = false) {
      if (isNavigating) return;
      if (!forceLifecycle && currentViewId === viewId && document.getElementById(viewId)?.classList.contains('active')) {
        return;
      }
      isNavigating = true;
      try {
        if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();

        // Remove early pre-paint route style so dynamic view navigation is not blocked by !important rules
        const earlyStyle = document.getElementById('early-route-style');
        if (earlyStyle) {
          earlyStyle.remove();
        }

        // Strictly hide all views and remove active class
        document.querySelectorAll('.module-view, .view-section').forEach(sec => {
          sec.classList.remove('active');
          sec.style.display = 'none';
        });

        // Close open side drawers and overlay
        ['drawer-invoice-details', 'drawer-purchase-details-inspect', 'drawer-purchase-details', 'quote-detail-drawer', 'sr-detail-drawer', 'pr-detail-drawer'].forEach(id => {
          const el = document.getElementById(id);
          if (el) { el.classList.remove('open'); el.style.display = ''; }
        });
        const ov = document.getElementById('side-drawer-overlay');
        if (ov) ov.classList.remove('open');

        // Clear all active navigation highlights
        document.querySelectorAll('.nav-single-item, .nav-child-item, .sidebar-item').forEach(btn => {
          btn.classList.remove('active');
        });

        const isSettingsSub = viewId.startsWith('view-settings-');
        const loadTargetId = isSettingsSub ? 'view-settings' : viewId;
        const domViewId = isSettingsSub ? 'view-settings' : viewId;

        // If ViewLoader exists, ensure external view is loaded if needed
        if (window.ViewLoader && typeof window.ViewLoader.loadView === 'function') {
          await window.ViewLoader.loadView(loadTargetId);
        }

        const targetView = document.getElementById(domViewId);
        if (targetView) {
          targetView.classList.add('active');
          const isFixed = targetView.classList.contains('fixed-viewport');
          const stage = document.getElementById('main-content-stage');
          if (stage) {
            if (isFixed) stage.classList.add('has-fixed-viewport');
            else stage.classList.remove('has-fixed-viewport');
          }
          if (isFixed) {
            targetView.style.display = 'flex';
          } else {
            targetView.style.display = 'block';
          }
        }

        if (isSettingsSub) {
          const sec = viewId.replace('view-settings-', '').toUpperCase();
          if (window.SettingsController && window.SettingsController.switchSection) {
            window.SettingsController.switchSection(sec);
          }
        }

        if (window.LabelIconEnhancer && targetView) {
          window.LabelIconEnhancer.enhance(targetView);
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

        // Auto-hide hover peek drawer once a navigation destination is selected
        const sb = document.querySelector('aside.app-sidebar');
        if (sb && sb.classList.contains('hover-peek')) {
          sb.classList.remove('hover-peek');
          isHoverPeekActive = false;
          if (hoverHideTimeout) { clearTimeout(hoverHideTimeout); hoverHideTimeout = null; }
        }

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

        // Automatic Table Reflow across all screens on view switch
        if (window.DynamicTableLayoutManager && window.DynamicTableLayoutManager.reflowAllTables) {
          window.DynamicTableLayoutManager.reflowAllTables();
          setTimeout(() => window.DynamicTableLayoutManager.reflowAllTables(), 120);
          setTimeout(() => window.DynamicTableLayoutManager.reflowAllTables(), 350);
        }
      } finally {
        isNavigating = false;
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
      if (window.DynamicTableLayoutManager && window.DynamicTableLayoutManager.reflowAllTables) {
        setTimeout(() => window.DynamicTableLayoutManager.reflowAllTables(), 100);
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
      if (!sb) return;
      if (sb.classList.contains('hover-peek')) {
        sb.classList.remove('hover-peek');
        isHoverPeekActive = false;
        if (hoverHideTimeout) { clearTimeout(hoverHideTimeout); hoverHideTimeout = null; }
      } else {
        this.showSidebarDrawer();
      }
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      if (window.DynamicTableLayoutManager && window.DynamicTableLayoutManager.reflowAllTables) {
        window.DynamicTableLayoutManager.reflowAllTables();
        setTimeout(() => window.DynamicTableLayoutManager.reflowAllTables(), 250);
      }
    },

    showSidebarDrawer() {
      const sb = document.querySelector('aside.app-sidebar');
      if (!sb) return;
      if (hoverHideTimeout) {
        clearTimeout(hoverHideTimeout);
        hoverHideTimeout = null;
      }
      sb.classList.add('collapsed');
      sb.classList.add('hover-peek');
      isHoverPeekActive = true;
      if (window.DynamicTableLayoutManager && window.DynamicTableLayoutManager.reflowAllTables) {
        window.DynamicTableLayoutManager.reflowAllTables();
        setTimeout(() => window.DynamicTableLayoutManager.reflowAllTables(), 250);
      }
    },

    hideSidebarDrawer(delay = 180) {
      if (!isHoverPeekActive) return;
      if (hoverHideTimeout) clearTimeout(hoverHideTimeout);
      hoverHideTimeout = setTimeout(() => {
        const sb = document.querySelector('aside.app-sidebar');
        const toggleBtn = document.getElementById('btn-sidebar-toggle') || document.querySelector('.header-left .header-badge-btn');
        if (sb && !sb.matches(':hover') && (!toggleBtn || !toggleBtn.matches(':hover'))) {
          sb.classList.remove('hover-peek');
          isHoverPeekActive = false;
          hoverHideTimeout = null;
          if (window.DynamicTableLayoutManager && window.DynamicTableLayoutManager.reflowAllTables) {
            window.DynamicTableLayoutManager.reflowAllTables();
            setTimeout(() => window.DynamicTableLayoutManager.reflowAllTables(), 250);
          }
        }
      }, delay);
    },

    installSidebarHoverPeek() {
      const sb = document.querySelector('aside.app-sidebar');
      if (!sb) return;

      // Keep open while hovering over the sidebar
      sb.addEventListener('mouseenter', () => {
        if (hoverHideTimeout) {
          clearTimeout(hoverHideTimeout);
          hoverHideTimeout = null;
        }
      });

      // Automatically hide once mouse moves away from the sidebar drawer
      sb.addEventListener('mouseleave', () => {
        this.hideSidebarDrawer(180);
      });

      // Top toggle button (hamburger icon): Hover or click un-hides full menu
      const toggleBtn = document.getElementById('btn-sidebar-toggle') || document.querySelector('.header-left .header-badge-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('mouseenter', () => {
          this.showSidebarDrawer();
        });
        toggleBtn.addEventListener('mouseleave', () => {
          setTimeout(() => {
            if (!sb.matches(':hover')) {
              this.hideSidebarDrawer(180);
            }
          }, 120);
        });
      }

      // Close on Escape or click outside
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isHoverPeekActive) {
          sb.classList.remove('hover-peek');
          isHoverPeekActive = false;
          if (hoverHideTimeout) clearTimeout(hoverHideTimeout);
        }
      });

      document.addEventListener('click', (e) => {
        if (isHoverPeekActive && !sb.contains(e.target) && !e.target.closest('#btn-sidebar-toggle, .header-badge-btn')) {
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
          if (window.PurchaseController && window.PurchaseController.isNavigatingToEditor) {
            // Already inside openPurchaseEditor - skip re-entrant lifecycle dispatch
          } else if (window.PurchaseController && window.PurchaseController.openPurchaseEditor) {
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
        case 'view-registration-approvals':
          if (window.UserAccessController) window.UserAccessController.loadRegistrations();
          break;
        case 'view-permission-matrix':
          if (window.UserAccessController) window.UserAccessController.loadPermissionMatrix();
          break;
        case 'view-settings':
          if (window.SettingsController) window.SettingsController.init();
          break;
        case 'view-customers':
          if (window.PartyController) window.PartyController.loadCustomers();
          break;
        case 'view-customer-360':
          if (window.PartyController && typeof window.PartyController.renderActiveCustomer360 === 'function') {
            window.PartyController.renderActiveCustomer360();
          }
          break;
        case 'view-suppliers':
          if (window.PartyController) window.PartyController.loadSuppliers();
          break;
        case 'view-supplier-360':
          if (window.PartyController && typeof window.PartyController.renderActiveSupplier360 === 'function') {
            window.PartyController.renderActiveSupplier360();
          }
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
        case 'view-record-payment':
          if (window.RecordPaymentController) {
            if (typeof window.RecordPaymentController.loadPaymentLookups === 'function') {
              window.RecordPaymentController.loadPaymentLookups();
            }
            if (typeof window.RecordPaymentController.refreshPayments === 'function') {
              window.RecordPaymentController.refreshPayments();
            }
          }
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
        case 'view-profile':
          if (window.ProfileController && window.ProfileController.loadProfile) {
            window.ProfileController.loadProfile();
          }
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
        case 'view-settings-payment':
          if (window.SettingsController) window.SettingsController.init('PAYMENT');
          break;
        case 'view-settings-invoice':
          if (window.SettingsController) window.SettingsController.init('INVOICE');
          break;
        case 'view-settings-notifications':
          if (window.SettingsController) window.SettingsController.init('NOTIFICATIONS');
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
        case 'view-settings-modules':
          if (window.SettingsController) {
            window.SettingsController.init('MODULES');
            window.SettingsController.loadModulesSettings();
          }
          break;
        case 'view-automation':
          if (window.AutomationCenterController) window.AutomationCenterController.loadData();
          break;
        case 'view-global-search':
          if (window.GlobalSearchController) window.GlobalSearchController.search('');
          break;
        case 'view-notifications':
        case 'view-notifications-center':
          if (window.NotificationCenterController) window.NotificationCenterController.loadNotifications();
          break;
        case 'view-record-payment':
          if (window.RecordPaymentController && window.RecordPaymentController.loadPaymentLookups) {
            window.RecordPaymentController.loadPaymentLookups();
          }
          break;
      }

      // Master Desktop Parity UI Enhancement pass on the loaded view
      if (window.GlobalUiEnhancer && window.GlobalUiEnhancer.enhance) {
        const targetView = document.getElementById(viewId);
        window.GlobalUiEnhancer.enhance(targetView || document.body);
      }
    },

    resolveViewId(hash) {
      if (!hash) return 'view-dashboard';
      const clean = hash.replace(/^#\/?/, '').split('?')[0];
      if (!clean) return 'view-dashboard';
      if (['login', 'register', 'forgot', 'mfa'].includes(clean)) return null;

      const aliasMap = {
        'purchase': 'view-purchase-register',
        'purchases': 'view-purchase-register',
        'sales': 'view-sales-register',
        'sale': 'view-sales-register',
        'items': 'view-item-master',
        'item': 'view-item-master',
        'customers': 'view-customers',
        'customer': 'view-customers',
        'suppliers': 'view-suppliers',
        'supplier': 'view-suppliers',
        'user-access': 'view-users',
        'users': 'view-users',
        'barcode-studio': 'view-barcode',
        'barcode': 'view-barcode',
        'global-audit': 'view-audit',
        'audit': 'view-audit',
        'masters': 'view-masters',
        'master': 'view-masters',
        'lookup': 'view-masters',
        'lookups': 'view-masters',
        'settings': 'view-settings'
      };

      if (aliasMap[clean]) return aliasMap[clean];
      const cand = clean.startsWith('view-') ? clean : ('view-' + clean);
      return cand;
    },

    init() {
      // Remove early pre-paint route style so dynamic view navigation is not blocked by !important rules
      const earlyStyle = document.getElementById('early-route-style');
      if (earlyStyle) {
        earlyStyle.remove();
      }

      let initialView = 'view-dashboard';
      if (window.location.hash) {
        const resolved = this.resolveViewId(window.location.hash);
        if (resolved) {
          initialView = resolved;
        }
      }
      this.selectNav(initialView);

      // Handle browser back/forward buttons
      window.addEventListener('popstate', (e) => {
        if (e.state && e.state.viewId) {
          this.selectNav(e.state.viewId, false);
        } else if (window.location.hash) {
          const resolved = this.resolveViewId(window.location.hash);
          if (resolved) this.selectNav(resolved, false);
        }
      });

      // Handle direct hash navigation
      window.addEventListener('hashchange', () => {
        if (window.location.hash) {
          const resolved = this.resolveViewId(window.location.hash);
          if (resolved && resolved !== currentViewId) {
            this.selectNav(resolved, false);
          }
        }
      });

      // Ensure sidebar starts fully collapsed so no menu icons are visible on the left
      const sb = document.querySelector('aside.app-sidebar');
      if (sb) {
        sb.classList.add('collapsed');
      }

      this.installSidebarHoverPeek();
    }
  };
})();
