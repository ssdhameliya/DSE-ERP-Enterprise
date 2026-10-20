/**
 * Jasvi Industries ERP - DeepLinkService
 * Universal Cross-Module Transaction Deep-Linking Engine (Pillar 7).
 *
 * Enables seamless one-click navigation between related transactions across:
 * General Ledger <-> Bank Statements <-> Sales Invoices <-> Purchase Bills <-> Quotations <-> Returns
 *
 * Automatically:
 * 1. Resets date filters to 'ALL' so target document is never filtered out.
 * 2. Navigates to the appropriate register view.
 * 3. Populates live register search bar.
 * 4. Highlights target row with glowing pulse animation (row-highlight-pulse).
 * 5. Opens inspection drawer for immediate transaction analysis.
 */
window.DeepLinkService = (function() {
  'use strict';

  function inferDocumentType(ref) {
    if (!ref) return 'SALES';
    const clean = ref.toString().trim().toUpperCase();

    if (/^(INV|JI|SI|TI|TAX|SALE|SO)/.test(clean)) return 'SALES';
    if (/^(BILL|PUR|PI|PO|PB)/.test(clean)) return 'PURCHASE';
    if (/^(QT|QUO|Q-)/.test(clean)) return 'QUOTATION';
    if (/^(SR|CR|CN|CREDIT)/.test(clean)) return 'SALES_RETURN';
    if (/^(PR|DR|DN|DEBIT)/.test(clean)) return 'PURCHASE_RETURN';
    if (/^(PAY|RCP|RCPT|BNK|TXN|UTR)/.test(clean)) return 'BANK_ENTRY';
    if (/^(ITEM|SKU|MAT|PRD)/.test(clean)) return 'ITEM';
    if (/^(CUST|CLIENT)/.test(clean)) return 'CUSTOMER';
    if (/^(SUPP|VEND)/.test(clean)) return 'SUPPLIER';

    return 'SALES'; // Default fallback
  }

  function highlightAndScrollRow(tableSelector, docRef) {
    const table = document.querySelector(tableSelector);
    if (!table) return null;

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
      case 'SALES': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-sales-register');
        }
        setTimeout(() => {
          if (window.SalesController) {
            if (typeof window.SalesController.setPresetDate === 'function') {
              window.SalesController.setPresetDate('ALL');
            }
            const searchInput = document.getElementById('sr-search-input');
            if (searchInput) {
              searchInput.value = ref;
              if (typeof window.SalesController.filterSales === 'function') {
                window.SalesController.filterSales(ref);
              }
            }
            setTimeout(() => {
              highlightAndScrollRow('#sales-main-table', ref);
              if (typeof window.SalesController.openInvoiceDrawer === 'function') {
                window.SalesController.openInvoiceDrawer(ref);
              }
            }, 250);
          }
        }, 120);
        break;
      }

      case 'PURCHASE': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-purchase-register');
        }
        setTimeout(() => {
          if (window.PurchaseController) {
            if (typeof window.PurchaseController.setPresetDate === 'function') {
              window.PurchaseController.setPresetDate('ALL');
            }
            const searchInput = document.getElementById('pr-search-input');
            if (searchInput) {
              searchInput.value = ref;
              if (typeof window.PurchaseController.filterPurchases === 'function') {
                window.PurchaseController.filterPurchases(ref);
              }
            }
            setTimeout(() => {
              highlightAndScrollRow('#purchase-main-table', ref);
              if (typeof window.PurchaseController.openPurchaseDrawer === 'function') {
                window.PurchaseController.openPurchaseDrawer(ref);
              }
            }, 250);
          }
        }, 120);
        break;
      }

      case 'QUOTATION': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-quotations');
        }
        setTimeout(() => {
          if (window.QuotationController) {
            const searchInput = document.getElementById('quotation-search-input');
            if (searchInput) {
              searchInput.value = ref;
              if (typeof window.QuotationController.filterQuotations === 'function') {
                window.QuotationController.filterQuotations(ref);
              }
            }
            setTimeout(() => {
              highlightAndScrollRow('#quotations-main-table', ref);
              if (typeof window.QuotationController.showDetails === 'function') {
                window.QuotationController.showDetails(ref);
              }
            }, 250);
          }
        }, 120);
        break;
      }

      case 'SALES_RETURN': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-sales-returns');
        }
        setTimeout(() => {
          if (window.ReturnsController) {
            const searchInput = document.getElementById('sr-return-search');
            if (searchInput) searchInput.value = ref;
            setTimeout(() => {
              highlightAndScrollRow('#sales-returns-table', ref);
              if (typeof window.ReturnsController.showDetails === 'function') {
                window.ReturnsController.showDetails(ref);
              }
            }, 250);
          }
        }, 120);
        break;
      }

      case 'PURCHASE_RETURN': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-purchase-returns');
        }
        setTimeout(() => {
          if (window.ReturnsController) {
            const searchInput = document.getElementById('pr-return-search');
            if (searchInput) searchInput.value = ref;
            setTimeout(() => {
              highlightAndScrollRow('#purchase-returns-table', ref);
              if (typeof window.ReturnsController.showDetails === 'function') {
                window.ReturnsController.showDetails(ref);
              }
            }, 250);
          }
        }, 120);
        break;
      }

      case 'BANK_ENTRY': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-bank-entry');
        }
        setTimeout(() => {
          if (window.BankEntryController) {
            const searchInput = document.getElementById('be-search-input');
            if (searchInput) {
              searchInput.value = ref;
              if (typeof window.BankEntryController.filterEntries === 'function') {
                window.BankEntryController.filterEntries(ref);
              }
            }
            setTimeout(() => {
              highlightAndScrollRow('#bank-entry-table', ref);
            }, 250);
          }
        }, 120);
        break;
      }

      case 'CUSTOMER': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-customers');
        }
        setTimeout(() => {
          if (window.PartyController) {
            const searchInput = document.getElementById('customer-search-input');
            if (searchInput) searchInput.value = ref;
            setTimeout(() => {
              highlightAndScrollRow('#customers-table', ref);
              if (typeof window.PartyController.openCustomerDrawer === 'function') {
                window.PartyController.openCustomerDrawer(ref);
              }
            }, 250);
          }
        }, 120);
        break;
      }

      case 'SUPPLIER': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-suppliers');
        }
        setTimeout(() => {
          if (window.PartyController) {
            const searchInput = document.getElementById('supplier-search-input');
            if (searchInput) searchInput.value = ref;
            setTimeout(() => {
              highlightAndScrollRow('#suppliers-table', ref);
              if (typeof window.PartyController.openSupplierDrawer === 'function') {
                window.PartyController.openSupplierDrawer(ref);
              }
            }, 250);
          }
        }, 120);
        break;
      }

      case 'ITEM': {
        if (window.NavigationRouter) {
          window.NavigationRouter.selectNav('view-item-master');
        }
        setTimeout(() => {
          if (window.ItemMasterController) {
            const searchInput = document.getElementById('im-search-input');
            if (searchInput) searchInput.value = ref;
            setTimeout(() => {
              highlightAndScrollRow('#item-master-table', ref);
              if (typeof window.ItemMasterController.openStockHistory === 'function') {
                window.ItemMasterController.openStockHistory(ref);
              }
            }, 250);
          }
        }, 120);
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
    init
  };
})();

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.DeepLinkService.init());
} else {
  window.DeepLinkService.init();
}
