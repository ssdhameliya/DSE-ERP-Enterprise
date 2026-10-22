/**
 * Jasvi Industries ERP - ShortcutManager
 * Global keyboard accelerators matching desktop JavaFX shortcuts
 */
window.ShortcutManager = {
  init() {
    window.addEventListener('keydown', (e) => {
      // 1. F9 -> New Sale Workspace Tab
      if (e.key === 'F9') {
        e.preventDefault();
        if (window.SalesController) window.SalesController.openSaleEditorTab();
        return;
      }

      // 2. F3 -> New Quotation
      if (e.key === 'F3') {
        e.preventDefault();
        if (typeof window.openNewQuotationModal === 'function') {
          window.openNewQuotationModal();
        } else if (window.QuotationController && window.QuotationController.openQuotationEditor) {
          window.QuotationController.openQuotationEditor();
        } else if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-quotations');
        }
        return;
      }

      // 3. F7 -> Bank Entry
      if (e.key === 'F7') {
        e.preventDefault();
        if (window.NavigationRouter) window.NavigationRouter.selectNav('view-bank-entry');
        return;
      }

      // 4. F8 -> Expense Entry
      if (e.key === 'F8') {
        e.preventDefault();
        if (window.NavigationRouter) window.NavigationRouter.selectNav('view-expense-entry');
        return;
      }

      // 5. Ctrl+S or F10 -> Save Sale Invoice if inside view-sale-create
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') || e.key === 'F10') {
        const curView = window.NavigationRouter ? window.NavigationRouter.getCurrentView() : '';
        if (curView === 'view-sale-create') {
          e.preventDefault();
          if (window.SalesController) window.SalesController.handleSaleWorkspaceSave(e);
          return;
        }
      }

      // 6. F2 -> Fast Item Search focus
      if (e.key === 'F2') {
        const itemSel = document.getElementById('ws-fast-item-select');
        if (itemSel) {
          e.preventDefault();
          itemSel.focus();
          return;
        }
      }

      // 7. Ctrl+K or Ctrl+T -> Focus omni search
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 't')) {
        e.preventDefault();
        const input = document.getElementById('omni-input') || document.getElementById('sr-search-input');
        if (input) input.focus();
        return;
      }

      // 8. Alt+W -> Close active workspace tab
      if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        const curView = window.NavigationRouter ? window.NavigationRouter.getCurrentView() : '';
        if (curView && curView !== 'view-dashboard') {
          window.NavigationRouter.closeTab(curView);
        }
        return;
      }

      // 9. Escape -> Close modals and context menus
      if (e.key === 'Escape') {
        const menu = document.getElementById('sales-row-actions-menu');
        if (menu && menu.classList.contains('show')) {
          menu.classList.remove('show');
        }
        if (window.AppDialogService) window.AppDialogService.closeAllModals();
        if (window.SalesController) window.SalesController.closeInvoiceDrawer();
      }

      // 10. Alt+N -> New Sale
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (window.SalesController) window.SalesController.openSaleEditorTab();
      }

      // 11. ? -> Shortcuts help modal
      if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        if (window.AppDialogService) window.AppDialogService.openModal('modal-shortcuts-help');
      }
    });
  }
};
