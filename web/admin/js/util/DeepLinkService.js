/**
 * Jasvi Industries ERP - DeepLinkService
 * Universal Cross-Module Transaction Deep-Linking Engine (Pillar 7).
 *
 * Enables seamless one-click navigation and record isolation across:
 * General Ledger <-> Bank Statements <-> Sales Invoices <-> Purchase Bills <-> Quotations <-> Returns
 *
 * Automatically:
 * 1. Resets date filters to 'ALL' so target document is never filtered out.
 * 2. Navigates to the appropriate register view.
 * 3. Waits asynchronously for view injection and mounts live register search bar.
 * 4. Highlights target row with glowing pulse animation (row-highlight-pulse).
 * 5. Opens inspection drawer for immediate transaction analysis.
 */
window.DeepLinkService = (function() {
  'use strict';

  function inferDocumentType(ref) {
    if (!ref) return 'SALES';
    const clean = ref.toString().trim().toUpperCase();

    if (/^(PRC)/.test(clean)) return 'PURCHASE_RECON';
    if (/^(RS-|VEND)/.test(clean)) return 'RECON_SUPPLIER';
    if (/^(STM-|BS-|STATEMENT)/.test(clean)) return 'BANK_STATEMENT';
    if (/^(INV|JI|SI|TI|TAX|SALE|SO)/.test(clean)) return 'SALES';
    if (/^(BILL|PUR|PI|PO|PB)/.test(clean)) return 'PURCHASE';
    if (/^(QT|QUO|Q-)/.test(clean)) return 'QUOTATION';
    if (/^(SR|CR|CN|CREDIT)/.test(clean)) return 'SALES_RETURN';
    if (/^(PR-|DR|DN|DEBIT)/.test(clean)) return 'PURCHASE_RETURN';
    if (/^(EXP|OPEX)/.test(clean)) return 'EXPENSE';
    if (/^(BE\/|BE-|BSE-|PAY|RCP|RCPT|BNK|BANK|TXN|UTR|JRN|DEP|WDL|VCH)/.test(clean)) return 'BANK_ENTRY';
    if (/^(ITEM|SKU|MAT|PRD)/.test(clean)) return 'ITEM';
    if (/^(CUST|CLIENT)/.test(clean)) return 'CUSTOMER';
    if (/^(SUPP|SUPPLIER)/.test(clean)) return 'SUPPLIER';

    return 'SALES'; // Default fallback
  }

  function pollElement(selector, callback, maxTries = 25, intervalMs = 100) {
    let tries = 0;
    const interval = setInterval(() => {
      tries++;
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        callback(el);
      } else if (tries >= maxTries) {
        clearInterval(interval);
      }
    }, intervalMs);
  }

  function highlightAndScrollRow(tableSelector, docRef) {
    pollElement(tableSelector, (table) => {
      const rows = table.querySelectorAll('tbody tr:not(.empty-row)');
      let matchedRow = null;
      rows.forEach(r => {
        const text = r.innerText || r.textContent || '';
        if (text.includes(docRef)) {
          matchedRow = r;
        }
      });

      if (matchedRow) {
        matchedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        matchedRow.classList.add('row-highlight-pulse', 'active-selected-row');
        setTimeout(() => {
          matchedRow.classList.remove('row-highlight-pulse');
        }, 3000);
      }
      return matchedRow;
    }, 15, 120);
  }

  function navigateToDocument(docRef, docTypeHint) {
    if (!docRef) return;
    const ref = docRef.toString().trim();
    const type = (docTypeHint || inferDocumentType(ref)).toUpperCase();

    if (window.AudioSynthesizer) {
      window.AudioSynthesizer.playNav();
    }

    console.log(`[DeepLinkService] Navigating to ${type} document: "${ref}"`);

    switch (type) {
      case 'SALES':
      case 'SALE':
      case 'INVOICE': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-sales-register');
        }
        pollElement('#sr-search-input', (searchInput) => {
          if (window.SalesController && typeof window.SalesController.setPresetDate === 'function') {
            window.SalesController.setPresetDate('ALL');
          }
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.SalesController && typeof window.SalesController.filterSales === 'function') {
            window.SalesController.filterSales(ref);
          }
          highlightAndScrollRow('#bank-statement-table, #sales-main-table, #sales-table-tbody', ref);
          if (window.SalesController && typeof window.SalesController.openInvoiceDrawer === 'function') {
            setTimeout(() => window.SalesController.openInvoiceDrawer(ref), 250);
          }
        });
        break;
      }

      case 'PURCHASE':
      case 'BILL': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-purchase-register');
        }
        pollElement('#pur-filter-search', (searchInput) => {
          if (window.PurchaseController && typeof window.PurchaseController.setPresetDate === 'function') {
            window.PurchaseController.setPresetDate('ALL');
          }
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.PurchaseController && typeof window.PurchaseController.loadPurchases === 'function') {
            window.PurchaseController.loadPurchases(0);
          }
          highlightAndScrollRow('#purchase-main-table, #purchase-table-tbody', ref);
          if (window.PurchaseController && typeof window.PurchaseController.openPurchaseDrawer === 'function') {
            setTimeout(() => window.PurchaseController.openPurchaseDrawer(ref), 250);
          }
        });
        break;
      }

      case 'QUOTATION': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-quotations');
        }
        pollElement('#quote-filter-search', (searchInput) => {
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.QuotationController && typeof window.QuotationController.loadQuotations === 'function') {
            window.QuotationController.loadQuotations(0);
          }
          highlightAndScrollRow('#quotations-main-table, #quote-table-tbody', ref);
        });
        break;
      }

      case 'SALES_RETURN': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-sales-returns');
        }
        pollElement('#sr-filter-search', (searchInput) => {
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.ReturnsController && typeof window.ReturnsController.loadReturns === 'function') {
            window.ReturnsController.loadReturns('SALES RETURN', 0);
          }
          highlightAndScrollRow('#sales-returns-table, #returns-table-tbody', ref);
        });
        break;
      }

      case 'PURCHASE_RETURN': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-purchase-returns');
        }
        pollElement('#pr-filter-search', (searchInput) => {
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.ReturnsController && typeof window.ReturnsController.loadReturns === 'function') {
            window.ReturnsController.loadReturns('PURCHASE RETURN', 0);
          }
          highlightAndScrollRow('#purchase-returns-table, #returns-table-tbody', ref);
        });
        break;
      }

      case 'PURCHASE_RECON': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-purchase-recon');
        }
        pollElement('#pr-search-input', (searchInput) => {
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.PurchaseReconController && typeof window.PurchaseReconController.applyFilters === 'function') {
            window.PurchaseReconController.applyFilters();
          }
          highlightAndScrollRow('#purchase-recon-tbody', ref);
        });
        break;
      }

      case 'RECON_SUPPLIER': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-recon-supplier');
        }
        pollElement('#rs-search', (searchInput) => {
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.PurchaseReconController && typeof window.PurchaseReconController.loadReconSuppliers === 'function') {
            window.PurchaseReconController.loadReconSuppliers();
          }
          highlightAndScrollRow('#recon-supplier-tbody', ref);
        });
        break;
      }

      case 'BANK_STATEMENT':
      case 'STATEMENT': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-bank-statement');
        }
        pollElement('#txtSearch', (searchInput) => {
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.BankStatementController && typeof window.BankStatementController.applyFilters === 'function') {
            window.BankStatementController.applyFilters();
          }
          highlightAndScrollRow('#bank-statement-tbody', ref);
        });
        break;
      }

      case 'BANK_ENTRY': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-bank-entry');
        }
        if (window.FinanceController) {
          if (typeof window.FinanceController.closeBankDrawer === 'function') window.FinanceController.closeBankDrawer();
          if (typeof window.FinanceController.closeExpenseDrawer === 'function') window.FinanceController.closeExpenseDrawer();
          if (window.FinanceController.currentMode !== 'BANK' && typeof window.FinanceController.loadBankMode === 'function') {
            window.FinanceController.loadBankMode();
          }
        }
        pollElement('#bank-search', (searchInput) => {
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.FinanceController && typeof window.FinanceController.applyFinanceFilters === 'function') {
            window.FinanceController.applyFinanceFilters();
          }
          highlightAndScrollRow('#bank-entry-tbody', ref);
        });
        break;
      }

      case 'EXPENSE': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-expense-entry');
        }
        if (window.FinanceController) {
          if (typeof window.FinanceController.closeExpenseDrawer === 'function') window.FinanceController.closeExpenseDrawer();
          if (typeof window.FinanceController.closeBankDrawer === 'function') window.FinanceController.closeBankDrawer();
          if (window.FinanceController.currentMode !== 'EXPENSE' && typeof window.FinanceController.loadExpenseMode === 'function') {
            window.FinanceController.loadExpenseMode();
          }
        }
        pollElement('#exp-search', (searchInput) => {
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.FinanceController && typeof window.FinanceController.applyFinanceFilters === 'function') {
            window.FinanceController.applyFinanceFilters();
          }
          highlightAndScrollRow('#expense-entry-tbody', ref);
        });
        break;
      }

      case 'CUSTOMER': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-customers');
        }
        pollElement('#cust-search', (searchInput) => {
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.PartyController) {
            if (typeof window.PartyController.isolateParty === 'function') {
              window.PartyController.isolateParty(ref, true);
            } else if (typeof window.PartyController.filterCustomers === 'function') {
              window.PartyController.filterCustomers(ref);
            }
          }
          highlightAndScrollRow('#customers-table', ref);
        });
        break;
      }

      case 'SUPPLIER': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-suppliers');
        }
        pollElement('#supp-search', (searchInput) => {
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.PartyController) {
            if (typeof window.PartyController.isolateParty === 'function') {
              window.PartyController.isolateParty(ref, false);
            } else if (typeof window.PartyController.filterSuppliers === 'function') {
              window.PartyController.filterSuppliers(ref);
            }
          }
          highlightAndScrollRow('#suppliers-table', ref);
        });
        break;
      }

      case 'ITEM': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-item-master');
        }
        pollElement('#item-search', (searchInput) => {
          searchInput.value = ref;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.ItemMasterController) {
            if (typeof window.ItemMasterController.isolateItem === 'function') {
              window.ItemMasterController.isolateItem(ref);
            } else if (typeof window.ItemMasterController.filterItems === 'function') {
              window.ItemMasterController.filterItems(ref);
            }
          }
          highlightAndScrollRow('#items-table-tbody', ref);
        });
        break;
      }

      default:
        console.warn(`[DeepLinkService] Unhandled document type: ${type}`);
    }
  }

  function init() {
    // 1. Universal Click Delegation
    document.addEventListener('click', function(e) {
      const link = e.target.closest('.erp-doc-link, [data-doc-ref], [data-deep-link]');
      if (!link) return;

      e.preventDefault();
      e.stopPropagation();

      const docRef = link.dataset.docRef || link.dataset.deepLink || link.innerText.trim();
      const docType = link.dataset.docType || null;
      if (docRef) {
        navigateToDocument(docRef, docType);
      }
    });

    // 2. URL Query Params Deep Link on Load
    try {
      const params = new URLSearchParams(window.location.search);
      const deepDoc = params.get('doc') || params.get('open');
      const deepType = params.get('type') || params.get('docType');
      if (deepDoc) {
        setTimeout(() => {
          navigateToDocument(deepDoc, deepType);
        }, 800);
      }
    } catch (e) {
      console.warn('[DeepLinkService] URL param inspection error:', e);
    }
  }

  return {
    inferDocumentType,
    navigateToDocument,
    highlightAndScrollRow,
    pollElement,
    init
  };
})();

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.DeepLinkService.init());
} else {
  window.DeepLinkService.init();
}
