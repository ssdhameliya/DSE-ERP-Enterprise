/**
 * Jasvi Industries ERP - ShortcutManager
 * Global keyboard accelerators matching desktop shortcuts
 */
window.ShortcutManager = {
  init() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+K -> Focus omni search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.getElementById('omni-input');
        if (input) input.focus();
      }
      // Escape -> close any open modal
      if (e.key === 'Escape') {
        window.AppDialogService.closeAllModals();
      }
      // Alt+N -> Quick Create Sale
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (window.SalesController) window.SalesController.openNewInvoiceModal();
      }
      // Alt+P -> Quick Create Purchase
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (window.PurchaseController) window.PurchaseController.openNewPurchaseModal();
      }
      // ? -> Open shortcuts help modal
      if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        window.AppDialogService.openModal('modal-shortcuts-help');
      }
    });
  }
};
