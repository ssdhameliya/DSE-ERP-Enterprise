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

    const theadThs = table.querySelectorAll('thead th');
    const headerTexts = Array.from(theadThs).map(th => (th.textContent || '').toLowerCase().trim());

    const rows = tbody.querySelectorAll('tr:not(.empty-row)');
    rows.forEach(row => {
      if (row.dataset.erpRowEnhanced === 'true') return;
      const cells = row.querySelectorAll('td');

      cells.forEach(td => {
        // Skip cells with custom complex components or already enhanced
        if (td.dataset.erpCellEnhanced === 'true') return;
        if (td.querySelector('.badge') || td.querySelector('button') || td.querySelector('select')) {
          td.dataset.erpCellEnhanced = 'true';
          return;
        }

        const rawText = (td.textContent || '').trim();
        if (!rawText) return;

        // Check if cell is a known status
        const statusSem = window.UiSemanticRegistry ? window.UiSemanticRegistry.statusSemantic(rawText) : null;
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

        // Check if cell is a monetary amount (e.g. ₹ 1,250.00, or numbers under amount headers)
        const colIdx = Array.prototype.indexOf.call(row.children, td);
        const hText = headerTexts[colIdx] || '';
        const isAmountHeader = /amount|rate|price|total|balance|paid|due|tax|gst|debit|credit|subtotal|discount|value/i.test(hText);
        const isMoneyString = rawText.startsWith('₹') || rawText.startsWith('Rs.') || rawText.startsWith('INR') || /^-?₹?\s*\d+(?:,\d+)*(?:\.\d+)?$/.test(rawText);

        if (isAmountHeader || isMoneyString) {
          td.dataset.erpCellEnhanced = 'true';
          const numVal = parseFloat(rawText.replace(/[^0-9.-]/g, '')) || 0;

          // Remove any prior conflicting classes
          td.classList.remove('amount-green', 'amount-red', 'amount-yellow', 'amount-cyan', 'cell-money-green', 'cell-money-yellow', 'cell-money-cyan');

          let amountClass = 'amount-cyan';
          if (/paid|received|credit|inflow|collection|settled/.test(hText)) {
            amountClass = 'amount-green';
          } else if (/debit|overdue|penalty|expense|loss|return/.test(hText)) {
            amountClass = 'amount-red';
          } else if (/pending|balance|due|outstanding|partial|tax|gst|cgst|sgst|igst/.test(hText)) {
            if (numVal > 0) {
              amountClass = 'amount-yellow';
            } else if (numVal < 0) {
              amountClass = 'amount-red';
            } else {
              amountClass = 'amount-green';
            }
          } else if (/total|net|grand|taxable|subtotal|price|rate|invoice\s*value|bill\s*amount/.test(hText)) {
            amountClass = 'amount-cyan';
          } else {
            amountClass = numVal >= 0 ? 'amount-cyan' : 'amount-red';
          }

          td.classList.add(amountClass);
          td.style.setProperty('color', `var(--${amountClass.replace('amount-', '')})`, 'important');
          td.style.textAlign = 'right';
          td.style.fontFamily = "'JetBrains Mono', monospace";
          td.style.fontWeight = '700';
          td.style.whiteSpace = 'nowrap';
          td.style.overflow = 'visible';
          td.style.textOverflow = 'clip';

          // Pierce child elements so nested spans receive the semantic color
          const childSpans = td.querySelectorAll('span, div, b');
          childSpans.forEach(cs => {
            cs.classList.add(amountClass);
            cs.style.setProperty('color', `var(--${amountClass.replace('amount-', '')})`, 'important');
          });
          return;
        }
      });
      row.dataset.erpRowEnhanced = 'true';
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
      if (typeof window.SalesController.openInspectionModal === 'function') {
        window.SalesController.openInspectionModal(id);
      } else if (typeof window.SalesController.openInvoiceDrawer === 'function') {
        window.SalesController.openInvoiceDrawer(id);
      }
    } else if (currentView === 'view-purchase-register' && window.PurchaseController) {
      if (typeof window.PurchaseController.openInspectionModal === 'function') {
        window.PurchaseController.openInspectionModal(id);
      } else if (typeof window.PurchaseController.showDetails === 'function') {
        window.PurchaseController.showDetails(id);
      }
    } else if (currentView === 'view-quotations' && window.QuotationController) {
      if (typeof window.QuotationController.openInspectionModal === 'function') {
        window.QuotationController.openInspectionModal(id);
      } else if (typeof window.QuotationController.showDetails === 'function') {
        window.QuotationController.showDetails(id);
      }
    } else if ((currentView === 'view-sales-returns' || currentView === 'view-purchase-returns') && window.ReturnsController) {
      if (typeof window.ReturnsController.openInspectionModal === 'function') {
        window.ReturnsController.openInspectionModal(id);
      } else if (typeof window.ReturnsController.showDetails === 'function') {
        window.ReturnsController.showDetails(id);
      }
    }
    // Note: Non-core screens (item-master, customers, suppliers, purchase-recon, reminders,
    // notifications, bank/expense) do NOT open side drawers on row click, maintaining 100% table width.
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

      // Auto-repair table parent wrapper if missing horizontal overflow
      const parent = table.parentElement;
      if (parent && parent.style) {
        const pOverflow = parent.style.overflow;
        if (pOverflow === 'hidden' || (!parent.style.overflowX && parent.style.overflowY === 'auto')) {
          parent.style.overflowX = 'auto';
          parent.style.overflowY = 'auto';
        }
      }

      enhanceHeaders(table);
      enhanceCells(table);
      const isEntryWorkspace = table.closest && table.closest('.sale-workspace-container, #view-sale-create, #view-purchase-creation');
      if (!isEntryWorkspace) {
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
