/**
 * Jasvi Industries ERP - TableUiEnhancer
 * Universal Table Enhancement Engine matching desktop ProfessionalUiEnhancer.java,
 * SemanticTableCells.java, TableSelectionSupport.java, and RegisterUiSupport.java.
 *
 * Automatically transforms plain HTML tables into rich, colorful, desktop-parity
 * tables with semantic header icons, colorful cell badges, select-all checkboxes,
 * and universal single-click (drawer) & double-click (full view/edit) interactions.
 */
window.TableUiEnhancer = (function() {
  'use strict';

  // Track double click timing per row
  const rowClickTimers = new WeakMap();

  /**
   * Checks if an event target is an interactive child control inside a row
   * (matching desktop RegisterUiSupport.isInteractiveTableTarget)
   */
  function isInteractiveTarget(target, row) {
    let node = target;
    while (node && node !== row) {
      if (
        node.tagName === 'BUTTON' ||
        node.tagName === 'A' ||
        node.tagName === 'INPUT' ||
        node.tagName === 'SELECT' ||
        node.tagName === 'TEXTAREA' ||
        node.classList.contains('btn') ||
        node.classList.contains('action-btn') ||
        node.classList.contains('table-action-menu') ||
        node.classList.contains('dropdown-menu') ||
        node.classList.contains('erp-keep-interactive') ||
        node.onclick !== null
      ) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  /**
   * Injects semantic colorful badges and icons into table headers
   */
  function enhanceHeaders(table) {
    const thead = table.querySelector('thead');
    if (!thead) return;

    const ths = thead.querySelectorAll('th');
    ths.forEach((th, idx) => {
      if (th.dataset.erpHeaderEnhanced === 'true') return;

      const rawText = (th.innerText || th.textContent || '').trim();
      const colId = th.id || th.dataset.column || '';
      const sem = window.UiSemanticRegistry.headerSemantic(rawText, colId);

      // Handle Master Checkbox for leading sequence/selection column
      if (sem.isCheckbox || idx === 0 && (rawText === '#' || rawText === 'No.' || rawText === 'Select')) {
        th.dataset.erpHeaderEnhanced = 'true';
        th.classList.add('erp-th-checkbox');
        th.style.width = '42px';
        th.style.textAlign = 'center';
        th.innerHTML = `
          <input type="checkbox" class="erp-master-checkbox" title="Select all visible rows" style="cursor: pointer; width: 15px; height: 15px; accent-color: var(--primary);">
        `;
        const masterBox = th.querySelector('.erp-master-checkbox');
        if (masterBox) {
          masterBox.addEventListener('change', () => {
            const isChecked = masterBox.checked;
            const rows = table.querySelectorAll('tbody tr:not(.empty-row)');
            rows.forEach(r => {
              const rowBox = r.querySelector('input[type="checkbox"]');
              if (rowBox) rowBox.checked = isChecked;
              if (isChecked) r.classList.add('row-selected');
              else r.classList.remove('row-selected');
            });
          });
        }
        return;
      }

      // Normal Column Header with icon and color theme
      th.dataset.erpHeaderEnhanced = 'true';
      th.classList.add(`erp-th-theme-${sem.colour}`);

      const originalHtml = th.innerHTML.trim();
      // Strip any existing icons or emojis from label so we never produce duplicate icons
      const cleanLabel = originalHtml.replace(/<span class="erp-th-icon">[\s\S]*?<\/span>/gi, '')
                                     .replace(/^[\p{Emoji}\u2000-\u3300\s]+/gu, '')
                                     .trim() || sem.label;
      if (!th.querySelector('.erp-th-badge')) {
        th.innerHTML = `
          <div class="erp-th-badge erp-th-${sem.colour}">
            <span class="erp-th-icon">${sem.icon}</span>
            <span class="erp-th-label">${cleanLabel}</span>
          </div>
        `;
      }
    });
  }

  /**
   * Formats raw status cells and monetary cells into desktop-parity badges
   */
  function enhanceCells(table) {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr:not(.empty-row)');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      cells.forEach(td => {
        // Skip cells with custom complex components or already enhanced
        if (td.dataset.erpCellEnhanced === 'true') return;
        if (td.querySelector('.badge') || td.querySelector('button') || td.querySelector('select')) {
          td.dataset.erpCellEnhanced = 'true';
          return;
        }

        const rawText = (td.innerText || td.textContent || '').trim();
        if (!rawText) return;

        // Check if cell is a known status
        const statusSem = window.UiSemanticRegistry.statusSemantic(rawText);
        if (statusSem) {
          td.dataset.erpCellEnhanced = 'true';
          td.innerHTML = `
            <span class="badge badge-${statusSem.state} erp-cell-status-badge">
              <span class="badge-icon">${statusSem.icon}</span>
              <span class="badge-text">${statusSem.text}</span>
            </span>
          `;
          return;
        }

        // Check if cell is a monetary amount (e.g. ₹ 1,250.00)
        if (rawText.startsWith('₹') || rawText.startsWith('Rs.') || rawText.startsWith('INR')) {
          td.dataset.erpCellEnhanced = 'true';
          // Preserve existing intentional text colors (e.g. red for pending, yellow for grand total)
          const hasExplicitColor = td.style.color || (td.getAttribute('style') || '').includes('color:');
          if (!hasExplicitColor) {
            const colIdx = Array.prototype.indexOf.call(row.children, td);
            const th = table.querySelector(`thead th:nth-child(${colIdx + 1})`);
            const hText = th ? (th.innerText || th.textContent || '').toLowerCase() : '';
            const numVal = parseFloat(rawText.replace(/[^0-9.-]/g, '')) || 0;

            if (hText.includes('paid') || hText.includes('received') || hText.includes('credit') || hText.includes('inflow') || hText.includes('settled')) {
              td.classList.add('cell-money-green');
            } else if (hText.includes('pending') || hText.includes('balance') || hText.includes('due') || hText.includes('outflow') || hText.includes('debit') || hText.includes('unpaid')) {
              if (numVal > 0) {
                td.classList.add('cell-money-yellow');
              } else {
                td.classList.add('cell-money-green');
              }
            } else if (hText.includes('total') || hText.includes('net') || hText.includes('grand') || hText.includes('subtotal')) {
              td.classList.add('cell-money-cyan');
            } else {
              td.classList.add('cell-money-green');
            }
          }
          td.style.textAlign = 'right';
          td.style.fontFamily = "'Space Grotesk', monospace";
          td.style.fontWeight = '600';
          td.style.whiteSpace = 'nowrap';
          td.style.overflow = 'visible';
          td.style.textOverflow = 'clip';
          return;
        }
      });
    });
  }

  /**
   * Resolves the entity ID / document number from a row
   */
  function extractRowIdentifier(row) {
    if (row.dataset.id) return row.dataset.id;
    if (row.dataset.invoiceNo) return row.dataset.invoiceNo;
    if (row.dataset.purchaseNo) return row.dataset.purchaseNo;
    if (row.dataset.docNo) return row.dataset.docNo;
    if (row.dataset.code) return row.dataset.code;

    // Check first column text or link
    const firstTd = row.querySelector('td:not(.erp-th-checkbox)');
    if (firstTd) {
      const link = firstTd.querySelector('a');
      if (link && link.innerText.trim()) return link.innerText.trim();
      const code = firstTd.innerText.trim();
      if (code && code !== '-' && code !== '✓') return code;
    }
    return null;
  }

  /**
   * Determines active controller and opens the appropriate detail drawer (Single Click)
   */
  function triggerRowSingleClick(row, table) {
    // 1. Highlight selected row
    table.querySelectorAll('tbody tr').forEach(r => r.classList.remove('row-selected'));
    row.classList.add('row-selected');

    // 2. Extract identifier
    const id = extractRowIdentifier(row);
    if (!id) return;

    // 4. Identify current view and dispatch to active controller
    const currentView = window.NavigationRouter ? window.NavigationRouter.getCurrentView() : '';

    if (currentView === 'view-sales-register' && window.SalesController) {
      if (typeof window.SalesController.openInvoiceDrawer === 'function') {
        window.SalesController.openInvoiceDrawer(id);
      } else if (typeof window.SalesController.showDetails === 'function') {
        window.SalesController.showDetails(id);
      }
    } else if (currentView === 'view-purchase-register' && window.PurchaseController) {
      if (typeof window.PurchaseController.showDetails === 'function') {
        window.PurchaseController.showDetails(id);
      } else if (typeof window.PurchaseController.openPurchaseDrawer === 'function') {
        window.PurchaseController.openPurchaseDrawer(id);
      }
    } else if (currentView === 'view-quotations' && window.QuotationController) {
      if (typeof window.QuotationController.showDetails === 'function') {
        window.QuotationController.showDetails(id);
      } else if (typeof window.QuotationController.openDrawer === 'function') {
        window.QuotationController.openDrawer(id);
      }
    } else if ((currentView === 'view-sales-returns' || currentView === 'view-purchase-returns') && window.ReturnsController) {
      if (typeof window.ReturnsController.showDetails === 'function') {
        window.ReturnsController.showDetails(id);
      } else if (typeof window.ReturnsController.openDrawer === 'function') {
        window.ReturnsController.openDrawer(id);
      }
    } else if (currentView === 'view-item-master' && window.ItemMasterController) {
      if (typeof window.ItemMasterController.openStockHistory === 'function') {
        window.ItemMasterController.openStockHistory(id);
      } else if (typeof window.ItemMasterController.openEditItemModal === 'function') {
        window.ItemMasterController.openEditItemModal(id);
      }
    } else if (currentView === 'view-customers' && window.PartyController) {
      if (typeof window.PartyController.onCustomerRowClick === 'function') {
        window.PartyController.onCustomerRowClick(id);
      } else if (typeof window.PartyController.openCustomerDrawer === 'function') {
        window.PartyController.openCustomerDrawer(id);
      }
    } else if (currentView === 'view-suppliers' && window.PartyController) {
      if (typeof window.PartyController.onSupplierRowClick === 'function') {
        window.PartyController.onSupplierRowClick(id);
      } else if (typeof window.PartyController.openSupplierDrawer === 'function') {
        window.PartyController.openSupplierDrawer(id);
      }
    } else if (currentView === 'view-purchase-recon' && window.PurchaseReconController && window.PurchaseReconController.openDrawer) {
      window.PurchaseReconController.openDrawer(id);
    } else if (currentView === 'view-reminders' && window.ReminderCenterController && window.ReminderCenterController.openDrawer) {
      window.ReminderCenterController.openDrawer(id);
    } else if (currentView === 'view-notifications' && window.NotificationCenterController && window.NotificationCenterController.openDrawer) {
      window.NotificationCenterController.openDrawer(id);
    }
  }

  /**
   * Determines active controller and opens full document view/editor (Double Click)
   */
  function triggerRowDoubleClick(row, table) {
    if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();

    const id = extractRowIdentifier(row);
    if (!id) return;

    const currentView = window.NavigationRouter ? window.NavigationRouter.getCurrentView() : '';

    if (currentView === 'view-sales-register' && window.SalesController) {
      if (typeof window.SalesController.openSaleEditor === 'function') {
        window.SalesController.openSaleEditor(id);
      } else if (typeof window.SalesController.printTaxInvoice === 'function') {
        window.SalesController.printTaxInvoice(id);
      }
    } else if (currentView === 'view-purchase-register' && window.PurchaseController) {
      if (typeof window.PurchaseController.openPurchaseEditor === 'function') {
        window.PurchaseController.openPurchaseEditor(id);
      } else if (typeof window.PurchaseController.openPurchaseView === 'function') {
        window.PurchaseController.openPurchaseView(id);
      }
    } else if (currentView === 'view-quotations' && window.QuotationController) {
      if (typeof window.QuotationController.openQuotationEditor === 'function') {
        window.QuotationController.openQuotationEditor(id);
      } else if (typeof window.QuotationController.editQuotation === 'function') {
        window.QuotationController.editQuotation(id);
      }
    } else if (currentView === 'view-item-master' && window.ItemMasterController) {
      if (typeof window.ItemMasterController.openEditItemModal === 'function') {
        window.ItemMasterController.openEditItemModal(id);
      } else if (typeof window.ItemMasterController.editItem === 'function') {
        window.ItemMasterController.editItem(id);
      }
    } else if ((currentView === 'view-customers' || currentView === 'view-suppliers') && window.PartyController) {
      if (typeof window.PartyController.openEditPartyModal === 'function') {
        window.PartyController.openEditPartyModal(id);
      } else if (typeof window.PartyController.editParty === 'function') {
        window.PartyController.editParty(id);
      }
    } else if ((currentView === 'view-sales-returns' || currentView === 'view-purchase-returns') && window.ReturnsController) {
      if (typeof window.ReturnsController.viewOriginalDoc === 'function') {
        window.ReturnsController.viewOriginalDoc(id);
      } else if (typeof window.ReturnsController.showDetails === 'function') {
        window.ReturnsController.showDetails(id);
      }
    }
  }

  /**
   * Attaches universal single-click & double-click event delegation to a table
   */
  function attachTableInteractions(table) {
    if (table.dataset.erpInteractionsAttached === 'true') return;
    table.dataset.erpInteractionsAttached = 'true';

    table.addEventListener('click', (e) => {
      const row = e.target.closest('tbody tr:not(.empty-row)');
      if (!row || !table.contains(row)) return;

      // Guard: Ignore interactive controls inside the row
      if (isInteractiveTarget(e.target, row)) return;

      // Guard: If row has an explicit onclick handler, the register controller manages clicks directly.
      // Do not duplicate the single-click event or fight the drawer toggle logic.
      if (row.hasAttribute('onclick')) return;

      // Handle Double Click vs Single Click debouncing (300ms window)
      const lastClick = rowClickTimers.get(row) || 0;
      const now = Date.now();

      if (now - lastClick < 300) {
        // Double click detected!
        rowClickTimers.delete(row);
        triggerRowDoubleClick(row, table);
      } else {
        // Single click registered
        rowClickTimers.set(row, now);
        setTimeout(() => {
          if (rowClickTimers.get(row) === now) {
            rowClickTimers.delete(row);
            triggerRowSingleClick(row, table);
          }
        }, 300);
      }
    });

    // Cursor pointer style for data rows
    table.classList.add('erp-interactive-table');
  }

  return {
    /**
     * Universal enhance method: delegates to enhanceTable if a table element,
     * or enhanceAll if a container or document.
     */
    enhance(target) {
      if (!target) return;
      if (target.nodeType === 1 && target.tagName === 'TABLE') {
        return this.enhanceTable(target);
      }
      return this.enhanceAll(target);
    },

    /**
     * Enhances a single table instance
     */
    enhanceTable(table) {
      if (!table || table.nodeType !== 1) return;
      enhanceHeaders(table);
      const isEntryWorkspace = table.closest && table.closest('.sale-workspace-container, #view-sale-create, #view-purchase-creation');
      if (!isEntryWorkspace) {
        enhanceCells(table);
        attachTableInteractions(table);
      }
      if (window.DynamicTableLayoutManager) {
        window.DynamicTableLayoutManager.install(table);
      }
    },

    /**
     * Scans and enhances all tables within a container element
     */
    enhanceAll(container = document) {
      if (!container) return;
      const tables = container.querySelectorAll('table');
      tables.forEach(tbl => this.enhanceTable(tbl));
      if (window.DynamicTableLayoutManager) {
        window.DynamicTableLayoutManager.installAll(container);
      }
    }
  };
})();
