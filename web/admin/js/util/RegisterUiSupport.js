/**
 * Jasvi Industries ERP - RegisterUiSupport.js
 * 100% Web Parity with RegisterUiSupport.java & RegisterDetailDrawer.java
 *
 * Provides standardized inline docked split drawers and row-toggle interactions:
 * 1. Inline Docked Split: Table panel on left (flex: 1), drawer docked on right (width: 380px, position: static).
 * 2. Row Toggle:
 *    - Click unselected row: selects row with 'active-selected-row', opens drawer, populates details.
 *    - Click already-selected row: unselects row, closes drawer, restores table to 100%.
 *    - Click different row: switches selection, updates drawer immediately.
 * 3. Escape key & Close Button: closes drawer and clears row selection.
 * 4. Interactive Target: Ignores clicks on buttons, inputs, dropdowns, links inside table rows.
 */
window.RegisterUiSupport = (function() {
  'use strict';

  /**
   * Checks if an event target is an interactive child control inside a table row
   * (e.g. action buttons, menus, inputs, checkboxes, links)
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

  /**
   * Highlights a specific row and un-highlights any other rows in the table
   */
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

  /**
   * Clears selection from all rows in the given table tbody
   */
  function clearSelection(tableTbodyOrSelector) {
    const tbody = typeof tableTbodyOrSelector === 'string'
      ? document.querySelector(tableTbodyOrSelector)
      : tableTbodyOrSelector;
    if (tbody) {
      tbody.querySelectorAll('tr.active-selected-row').forEach(r => r.classList.remove('active-selected-row'));
    }
  }

  /**
   * Opens an inline docked drawer
   */
  function showDrawer(drawerElOrId, workspaceElOrId) {
    const drawer = typeof drawerElOrId === 'string'
      ? document.getElementById(drawerElOrId)
      : drawerElOrId;
    if (!drawer) return;

    drawer.classList.add('open');
    drawer.style.display = 'flex';
    drawer.removeAttribute('hidden');

    // Notify UI enhancer if available (immediate + 50ms settled pulse matching Desktop)
    if (window.DynamicTableLayoutManager && window.DynamicTableLayoutManager.reflowAllTables) {
      window.DynamicTableLayoutManager.reflowAllTables();
      setTimeout(() => {
        window.DynamicTableLayoutManager.reflowAllTables();
      }, 50);
    }
  }

  /**
   * Closes an inline docked drawer and clears row selection
   */
  function hideDrawer(drawerElOrId, tableTbodyOrSelector, onCloseCallback) {
    const drawer = typeof drawerElOrId === 'string'
      ? document.getElementById(drawerElOrId)
      : drawerElOrId;
    if (drawer) {
      drawer.classList.remove('open');
      drawer.style.display = 'none';
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

  /**
   * Deterministic Row Toggle Protocol:
   * Returns true if drawer was opened, false if closed.
   */
  function handleRowToggle(tableTbodyOrSelector, clickedRow, drawerElOrId, onOpenCallback, onCloseCallback) {
    const drawer = typeof drawerElOrId === 'string'
      ? document.getElementById(drawerElOrId)
      : drawerElOrId;
    const isDrawerOpen = drawer && (drawer.classList.contains('open') || drawer.style.display === 'flex');
    const isRowSelected = clickedRow && clickedRow.classList && clickedRow.classList.contains('active-selected-row');

    if (isDrawerOpen && isRowSelected) {
      // Second click on same row -> Close drawer & unselect
      hideDrawer(drawer, tableTbodyOrSelector, onCloseCallback);
      return false;
    } else {
      // First click or click on different row -> Select row & open drawer
      highlightRow(tableTbodyOrSelector, clickedRow);
      showDrawer(drawer);
      if (typeof onOpenCallback === 'function') {
        onOpenCallback();
      }
      return true;
    }
  }

  /**
   * Installs an Escape key listener to close the drawer and unselect rows
   */
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

  return {
    isInteractiveTarget,
    highlightRow,
    clearSelection,
    showDrawer,
    hideDrawer,
    handleRowToggle,
    installEscapeClose
  };
})();
