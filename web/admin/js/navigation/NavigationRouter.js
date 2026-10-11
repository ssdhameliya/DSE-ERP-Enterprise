/**
 * Jasvi Industries ERP - NavigationRouter
 * View manager, route dispatcher, and accordion controller matching desktop SceneManager & ScreenLifecycle
 */
window.NavigationRouter = (function() {
  let currentViewId = 'view-dashboard';

  return {
    getCurrentView() {
      return currentViewId;
    },

    selectNav(viewId) {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
      document.querySelectorAll('.sidebar-item').forEach(btn => btn.classList.remove('active'));

      const targetView = document.getElementById(viewId);
      if (targetView) targetView.classList.add('active');

      const targetNav = document.getElementById(`nav-${viewId.replace('view-', '')}`);
      if (targetNav) targetNav.classList.add('active');

      currentViewId = viewId;

      // Update URL hash / history for deep linking
      if (window.history && window.history.pushState) {
        const routeName = viewId.replace('view-', '');
        window.history.pushState({ viewId }, '', `#${routeName}`);
      }

      // Dispatch controller onMount lifecycle
      this.dispatchLifecycle(viewId);
    },

    toggleNavGroup(groupId) {
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      const groupEl = document.getElementById(groupId);
      if (groupEl) groupEl.classList.toggle('expanded');
    },

    dispatchLifecycle(viewId) {
      switch (viewId) {
        case 'view-dashboard':
          if (window.DashboardController) window.DashboardController.refresh();
          break;
        case 'view-sales-register':
          if (window.SalesController) window.SalesController.loadSales();
          break;
        case 'view-purchase-register':
          if (window.PurchaseController) window.PurchaseController.loadPurchases();
          break;
        case 'view-item-master':
          if (window.ItemMasterController) window.ItemMasterController.loadItems();
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
        case 'view-user-access':
          if (window.UserAccessController) window.UserAccessController.loadUsers();
          break;
        case 'view-global-audit':
          if (window.UserAccessController) window.UserAccessController.loadAudit();
          break;
        case 'view-barcode-studio':
          if (window.BarcodeStudioController) window.BarcodeStudioController.init();
          break;
        case 'view-backup-restore':
          if (window.SettingsController) window.SettingsController.loadBackups();
          break;
      }
    },

    init() {
      // Handle browser back/forward buttons
      window.addEventListener('popstate', (e) => {
        if (e.state && e.state.viewId) {
          this.selectNav(e.state.viewId);
        } else if (window.location.hash) {
          const viewId = 'view-' + window.location.hash.replace('#', '');
          const target = document.getElementById(viewId);
          if (target) this.selectNav(viewId);
        }
      });

      // Initial hash routing
      if (window.location.hash) {
        const viewId = 'view-' + window.location.hash.replace('#', '');
        const target = document.getElementById(viewId);
        if (target) this.selectNav(viewId);
      }
    }
  };
})();
