/**
 * Jasvi Industries ERP - RegisterUiSupport.js
 * 100% Web Parity with RegisterUiSupport.java & RegisterDetailDrawer.java.
 *
 * Provides standardized inline docked split drawers and the Universal 3D
 * Glassmorphic Side Detail Drawer with schema-agnostic field extraction,
 * blank-field suppression, and context-aware 4-5 quick actions.
 */
window.RegisterUiSupport = (function() {
  'use strict';

  /**
   * Checks if an event target is an interactive child control inside a table row
   */
  function isInteractiveTarget(target) {
    if (!target) return false;
    let node = target;
    while (node && node !== document.body && node.tagName !== 'TR') {
      const tag = (node.tagName || '').toUpperCase();
      if (
        tag === 'BUTTON' ||
        tag === 'INPUT' ||
        tag === 'SELECT' ||
        tag === 'TEXTAREA' ||
        tag === 'A' ||
        node.classList?.contains('btn') ||
        node.classList?.contains('action-dropdown-menu') ||
        node.classList?.contains('row-action-menu-wrap') ||
        node.getAttribute?.('role') === 'button'
      ) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  function highlightRow(tableTbodyOrSelector, rowElement) {
    const tbody = typeof tableTbodyOrSelector === 'string'
      ? document.querySelector(tableTbodyOrSelector)
      : tableTbodyOrSelector;
    if (tbody) {
      tbody.querySelectorAll('tr.active-selected-row').forEach(r => {
        if (r !== rowElement) r.classList.remove('active-selected-row');
      });
    }
    if (rowElement && rowElement.classList) {
      rowElement.classList.add('active-selected-row');
    }
  }

  function clearSelection(tableTbodyOrSelector) {
    const tbody = typeof tableTbodyOrSelector === 'string'
      ? document.querySelector(tableTbodyOrSelector)
      : tableTbodyOrSelector;
    if (tbody) {
      tbody.querySelectorAll('tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    }
  }

  function showDrawer(drawerElOrId) {
    const drawer = typeof drawerElOrId === 'string'
      ? document.getElementById(drawerElOrId)
      : drawerElOrId;
    if (!drawer) return;

    drawer.classList.add('open');
    drawer.style.display = 'flex';
    drawer.removeAttribute('hidden');

    const overlay = document.getElementById('side-drawer-overlay');
    if (overlay) {
      overlay.classList.add('open');
      overlay.style.display = 'block';
      overlay.style.pointerEvents = 'auto';
    }

    if (window.DynamicTableLayoutManager && window.DynamicTableLayoutManager.reflowAllTables) {
      window.DynamicTableLayoutManager.reflowAllTables();
      setTimeout(() => {
        window.DynamicTableLayoutManager.reflowAllTables();
      }, 50);
    }
  }

  function hideDrawer(drawerElOrId, tableTbodyOrSelector, onCloseCallback) {
    const drawer = typeof drawerElOrId === 'string'
      ? document.getElementById(drawerElOrId)
      : drawerElOrId;
    if (drawer) {
      drawer.classList.remove('open');
      drawer.style.display = 'none';
    }

    const remainingOpen = document.querySelectorAll('.slide-detail-drawer.open, .register-inline-drawer.open, .sales-inline-drawer.open, .side-drawer.open, .erp-global-detail-drawer.open');
    if (!remainingOpen || remainingOpen.length === 0) {
      const overlay = document.getElementById('side-drawer-overlay');
      if (overlay) {
        overlay.classList.remove('open');
        overlay.style.display = 'none';
        overlay.style.pointerEvents = 'none';
      }
    }

    if (tableTbodyOrSelector) {
      clearSelection(tableTbodyOrSelector);
    }

    if (typeof onCloseCallback === 'function') {
      onCloseCallback();
    }

    if (window.DynamicTableLayoutManager && window.DynamicTableLayoutManager.reflowAllTables) {
      window.DynamicTableLayoutManager.reflowAllTables();
      setTimeout(() => {
        window.DynamicTableLayoutManager.reflowAllTables();
      }, 50);
    }
  }

  function handleRowToggle(tableTbodyOrSelector, clickedRow, drawerElOrId, onOpenCallback, onCloseCallback) {
    const drawer = typeof drawerElOrId === 'string'
      ? document.getElementById(drawerElOrId)
      : drawerElOrId;
    const isDrawerOpen = drawer && (drawer.classList.contains('open') || drawer.style.display === 'flex');
    const isRowSelected = clickedRow && clickedRow.classList && clickedRow.classList.contains('active-selected-row');

    if (isDrawerOpen && isRowSelected) {
      hideDrawer(drawer, tableTbodyOrSelector, onCloseCallback);
      return false;
    } else {
      highlightRow(tableTbodyOrSelector, clickedRow);
      showDrawer(drawer);
      if (typeof onOpenCallback === 'function') {
        onOpenCallback();
      }
      return true;
    }
  }

  function installEscapeClose(drawerElOrId, tableTbodyOrSelector, onCloseCallback) {
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' || event.key === 'Esc') {
        const drawer = typeof drawerElOrId === 'string'
          ? document.getElementById(drawerElOrId)
          : drawerElOrId;
        if (drawer && (drawer.classList.contains('open') || drawer.style.display === 'flex')) {
          hideDrawer(drawer, tableTbodyOrSelector, onCloseCallback);
        }
      }
    });
  }

  /**
   * Helper to ensure the universal drawer DOM container exists
   */
  function getOrCreateUniversalDrawer() {
    let drawer = document.getElementById('erp-universal-detail-drawer');
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.id = 'erp-universal-detail-drawer';
      drawer.className = 'erp-global-detail-drawer';
      document.body.appendChild(drawer);
      installEscapeClose(drawer);
    }
    return drawer;
  }

  /**
   * Universal 3D Detail Drawer Renderer
   * Automatically extracts fields, suppresses blanks, formats metrics, and generates 4-5 quick actions.
   */
  function showUniversalRecordDrawer(record, entityType = 'GENERIC', actions = []) {
    if (!record) return;
    const drawer = getOrCreateUniversalDrawer();

    const title = record.invoiceNo || record.purchaseNo || record.code || record.name || record.title || 'Record Details';
    const subtitle = record.customerName || record.supplierName || record.partyName || record.category || record.type || entityType;
    const status = record.status || record.paymentStatus || (record.active ? 'ACTIVE' : 'INACTIVE') || 'OPEN';

    // 1. Key Metrics Ribbon (max 3 pills)
    let metricsHtml = '';
    const totalAmt = record.totalAmount || record.total || record.amount || record.invoiceValue || 0;
    const paidAmt = record.paidAmount || record.paid || record.receivedAmount || 0;
    const dueAmt = record.dueAmount || record.balance || record.pendingAmount || (totalAmt - paidAmt) || 0;

    if (totalAmt > 0 || paidAmt > 0 || dueAmt > 0) {
      metricsHtml = `
        <div class="erp-drawer-metrics-ribbon">
          <div class="erp-drawer-metric-pill">
            <div class="erp-drawer-metric-label">Total Amount</div>
            <div class="erp-drawer-metric-val amount-cyan">₹ ${Number(totalAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div class="erp-drawer-metric-pill">
            <div class="erp-drawer-metric-label">Paid Amount</div>
            <div class="erp-drawer-metric-val amount-green">₹ ${Number(paidAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div class="erp-drawer-metric-pill">
            <div class="erp-drawer-metric-label">Balance Due</div>
            <div class="erp-drawer-metric-val ${dueAmt > 0 ? 'amount-yellow' : 'amount-green'}">₹ ${Number(dueAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      `;
    }

    // 2. Dynamic Field Rows with Blank/Null Suppression
    let fieldRowsHtml = '';
    const ignoredKeys = new Set(['id', 'rowVersion', 'items', 'lines', 'raw', '__data', 'status', 'totalAmount', 'paidAmount', 'dueAmount']);

    for (const [key, val] of Object.entries(record)) {
      if (ignoredKeys.has(key)) continue;

      // Blank / Null Suppression Rule
      if (val === null || val === undefined) continue;
      const strVal = String(val).trim();
      if (!strVal || strVal === '-' || strVal === 'N/A' || strVal === 'null' || strVal === 'undefined') continue;

      // Clean Label Name
      const labelName = key.replace(/([A-Z])/g, ' $1')
                           .replace(/^./, str => str.toUpperCase())
                           .replace(/No$/, ' No.')
                           .trim();

      const desc = window.UiSemanticRegistry && window.UiSemanticRegistry.resolveLabelDescriptor
        ? window.UiSemanticRegistry.resolveLabelDescriptor(labelName, key)
        : { icon: '📌', colour: 'neutral' };

      // Format monetary values if numeric and key implies money
      let formattedVal = strVal;
      let valClass = '';
      if (/amount|rate|price|total|balance|tax|gst|cost/i.test(key) && !isNaN(parseFloat(strVal))) {
        formattedVal = `₹ ${parseFloat(strVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        valClass = 'amount-cyan';
      }

      fieldRowsHtml += `
        <div class="erp-drawer-field-row">
          <span class="erp-drawer-field-label">
            <span class="erp-label-icon-badge ${desc.themeClass || 'theme-neutral'}">${desc.icon || '📌'}</span>
            ${labelName}
          </span>
          <span class="erp-drawer-field-val ${valClass}">${formattedVal}</span>
        </div>
      `;
    }

    // 3. Contextual Quick Actions (Max 4-5 buttons)
    let actionButtonsHtml = '';
    const finalActions = actions && actions.length > 0 ? actions : resolveDefaultEntityActions(entityType, record);

    finalActions.slice(0, 5).forEach(act => {
      actionButtonsHtml += `
        <button type="button" class="erp-drawer-btn btn-action-3d ${act.role || 'role-primary'}" onclick="${act.handler || ''}">
          <span class="btn-3d-icon">${act.icon || '⚡'}</span>
          <span>${act.label}</span>
        </button>
      `;
    });

    // 4. Construct Complete 3D Glassmorphic Drawer Markup
    drawer.innerHTML = `
      <div class="erp-drawer-hero">
        <div class="erp-drawer-hero-top">
          <div class="erp-drawer-hero-id">
            <span>📄</span>
            <span>${title}</span>
          </div>
          <button type="button" class="modal-close" style="font-size:1.4rem; background:none; border:none; color:#94a3b8; cursor:pointer;" onclick="window.RegisterUiSupport.hideDrawer('erp-universal-detail-drawer')">&times;</button>
        </div>
        <div class="erp-drawer-hero-sub">${subtitle}</div>
        <div style="margin-top: 6px;">
          <span class="badge badge-info erp-cell-status-badge" style="font-size:0.72rem;">${status}</span>
        </div>
        ${metricsHtml}
      </div>

      <div class="erp-drawer-body">
        <div class="erp-drawer-card">
          <div class="erp-drawer-card-title">
            <span>📋</span> Key Attributes
          </div>
          ${fieldRowsHtml || '<div style="color:var(--text-muted); font-size:0.75rem;">No further details populated.</div>'}
        </div>
      </div>

      <div class="erp-drawer-action-dock">
        ${actionButtonsHtml}
      </div>
    `;

    showDrawer(drawer);
  }

  function resolveDefaultEntityActions(entityType, record) {
    const type = (entityType || '').toUpperCase();
    if (type.includes('SALE') || type.includes('INVOICE')) {
      return [
        { label: 'View Invoice', icon: '👁', role: 'role-primary', handler: `window.SalesController && window.SalesController.openSaleDrawer && window.SalesController.openSaleDrawer('${record.id}')` },
        { label: 'Edit Invoice', icon: '✏️', role: 'role-edit', handler: `window.SalesController && window.SalesController.editSale && window.SalesController.editSale('${record.id}')` },
        { label: 'Print PDF', icon: '🖨️', role: 'role-print', handler: `window.SalesController && window.SalesController.printInvoice && window.SalesController.printInvoice('${record.id}')` },
        { label: 'WhatsApp', icon: '💬', role: 'role-whatsapp', handler: `window.SalesController && window.SalesController.shareWhatsApp && window.SalesController.shareWhatsApp('${record.id}')` },
        { label: 'Payment', icon: '💳', role: 'role-payment', handler: `window.FinanceController && window.FinanceController.openRecordPaymentModal && window.FinanceController.openRecordPaymentModal('${record.id}')` }
      ];
    }
    if (type.includes('PURCHASE')) {
      return [
        { label: 'View Purchase', icon: '👁', role: 'role-primary', handler: `window.PurchaseController && window.PurchaseController.openPurchaseDrawer && window.PurchaseController.openPurchaseDrawer('${record.id}')` },
        { label: 'Edit Purchase', icon: '✏️', role: 'role-edit', handler: `window.PurchaseController && window.PurchaseController.editPurchase && window.PurchaseController.editPurchase('${record.id}')` },
        { label: 'Print PO', icon: '🖨️', role: 'role-print', handler: `window.PurchaseController && window.PurchaseController.printPurchase && window.PurchaseController.printPurchase('${record.id}')` },
        { label: 'Pay Vendor', icon: '💳', role: 'role-payment', handler: `window.FinanceController && window.FinanceController.openRecordPaymentModal && window.FinanceController.openRecordPaymentModal('${record.id}')` }
      ];
    }
    if (type.includes('CUSTOMER') || type.includes('PARTY')) {
      return [
        { label: 'Edit Customer', icon: '✏️', role: 'role-edit', handler: `window.PartyController && window.PartyController.openEditPartyModal && window.PartyController.openEditPartyModal('CUSTOMER', '${record.id}')` },
        { label: 'View Ledger', icon: '📖', role: 'role-primary', handler: `window.navigate && window.navigate('view-general-ledger')` },
        { label: 'WhatsApp', icon: '💬', role: 'role-whatsapp', handler: `window.AppDialogService && window.AppDialogService.toastInfo('WhatsApp initiated')` },
        { label: 'Collect Payment', icon: '💳', role: 'role-payment', handler: `window.FinanceController && window.FinanceController.openRecordPaymentModal && window.FinanceController.openRecordPaymentModal()` }
      ];
    }
    if (type.includes('SUPPLIER')) {
      return [
        { label: 'Edit Supplier', icon: '✏️', role: 'role-edit', handler: `window.PartyController && window.PartyController.openEditPartyModal && window.PartyController.openEditPartyModal('SUPPLIER', '${record.id}')` },
        { label: 'Vendor Ledger', icon: '📖', role: 'role-primary', handler: `window.navigate && window.navigate('view-general-ledger')` },
        { label: 'Pay Supplier', icon: '💳', role: 'role-payment', handler: `window.FinanceController && window.FinanceController.openRecordPaymentModal && window.FinanceController.openRecordPaymentModal()` }
      ];
    }
    if (type.includes('ITEM') || type.includes('INVENTORY')) {
      return [
        { label: 'Edit Item', icon: '✏️', role: 'role-edit', handler: `window.MasterDataController && window.MasterDataController.openEditItemModal && window.MasterDataController.openEditItemModal('${record.id}')` },
        { label: 'Barcode', icon: '🏷️', role: 'role-primary', handler: `window.navigate && window.navigate('view-barcode')` },
        { label: 'Stock Adjust', icon: '🔄', role: 'role-excel', handler: `window.InventoryController && window.InventoryController.openStockAdjustModal && window.InventoryController.openStockAdjustModal('${record.id}')` }
      ];
    }

    // Generic Fallback (Max 4 actions)
    return [
      { label: 'Inspect Record', icon: '👁', role: 'role-primary', handler: `window.AppDialogService && window.AppDialogService.toastInfo('Inspecting record')` },
      { label: 'Edit Details', icon: '✏️', role: 'role-edit', handler: `window.AppDialogService && window.AppDialogService.toastInfo('Editing record')` },
      { label: 'Print / Export', icon: '🖨️', role: 'role-print', handler: `window.print()` },
      { label: 'Delete', icon: '🗑️', role: 'role-danger', handler: `window.AppDialogService && window.AppDialogService.confirmDelete && window.AppDialogService.confirmDelete('Record', () => {})` }
    ];
  }

  if (typeof document !== 'undefined') {
    const bindOverlayDismiss = () => {
      const overlay = document.getElementById('side-drawer-overlay');
      if (overlay && !overlay.dataset.drawerDismissBound) {
        overlay.dataset.drawerDismissBound = 'true';
        overlay.addEventListener('click', () => {
          document.querySelectorAll('.slide-detail-drawer.open, .register-inline-drawer.open, .sales-inline-drawer.open, .side-drawer.open, .erp-global-detail-drawer.open').forEach(drawer => {
            hideDrawer(drawer);
          });
        });
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindOverlayDismiss);
    } else {
      bindOverlayDismiss();
    }
  }

  return {
    isInteractiveTarget,
    highlightRow,
    clearSelection,
    showDrawer,
    hideDrawer,
    handleRowToggle,
    installEscapeClose,
    showUniversalRecordDrawer
  };
})();
