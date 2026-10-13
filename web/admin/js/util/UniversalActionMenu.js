/**
 * Jasvi Industries ERP - Universal Floating Action Menu & Canonical Document Engine
 * Provides 1:1 desktop parity for all table row actions (::: Actions) and official document rendering.
 */
(function() {
  let activeMenuEl = null;
  let currentTargetId = null;
  let currentCallback = null;

  function ensureMenuElement() {
    let menu = document.getElementById('app-universal-actions-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'app-universal-actions-menu';
      menu.className = 'universal-actions-dropdown';
      document.body.appendChild(menu);
    }
    return menu;
  }

  function hideMenu() {
    if (activeMenuEl) {
      activeMenuEl.classList.remove('show');
      activeMenuEl.style.display = 'none';
      currentTargetId = null;
      currentCallback = null;
    }
  }

  // Dismiss on outside click or escape
  document.addEventListener('click', function(e) {
    if (!activeMenuEl) return;
    if (!activeMenuEl.contains(e.target) && !e.target.closest('.btn-row-actions') && !e.target.closest('.btn-purple')) {
      hideMenu();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      hideMenu();
    }
  });

  window.UniversalActionMenu = {
    /**
     * Shows a desktop-style floating action menu
     * @param {HTMLElement} btnEl - The clicked button element
     * @param {string|number} targetId - Identifier of the entity/row (e.g., invoiceNo, itemId)
     * @param {Array<{key: string, label: string, icon?: string, danger?: boolean}>} actions - List of actions
     * @param {Function} onSelect - Callback function(actionKey, targetId)
     * @param {Event} event - Optional click event to prevent bubbling
     */
    show: function(btnEl, targetId, actions, onSelect, event) {
      if (event && event.stopPropagation) event.stopPropagation();

      const menu = ensureMenuElement();
      activeMenuEl = menu;

      if (menu.classList.contains('show') && currentTargetId === targetId) {
        hideMenu();
        return;
      }

      currentTargetId = targetId;
      currentCallback = onSelect;

      // Render menu items
      let html = '';
      for (let i = 0; i < actions.length; i++) {
        const act = actions[i];
        if (act.separator) {
          html += '<div class="action-divider"></div>';
          continue;
        }
        const dangerClass = act.danger ? ' danger' : '';
        const iconHtml = act.icon ? '<span class="action-icon">' + act.icon + '</span>' : '';
        html += '<div class="action-item' + dangerClass + '" data-key="' + act.key + '">' +
                iconHtml +
                '<span class="action-label">' + act.label + '</span>' +
                '</div>';
      }
      menu.innerHTML = html;

      // Attach item clicks
      const items = menu.querySelectorAll('.action-item');
      items.forEach(function(item) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          const key = this.getAttribute('data-key');
          hideMenu();
          if (typeof currentCallback === 'function') {
            currentCallback(key, targetId);
          }
        });
      });

      // Positioning
      menu.style.display = 'block';
      menu.classList.add('show');

      const rect = btnEl.getBoundingClientRect();
      const menuWidth = 240;
      let left = rect.right - menuWidth;
      let top = rect.bottom + 4;

      if (left < 10) left = 10;
      const menuHeight = menu.offsetHeight || 300;
      if (top + menuHeight > window.innerHeight) {
        top = Math.max(10, rect.top - menuHeight - 4);
      }

      menu.style.left = left + 'px';
      menu.style.top = top + 'px';
    },

    hide: hideMenu
  };

  /**
   * Official Canonical Document PDF Engine
   * Connects directly to backend ProfessionalDocumentRenderer (1,514 lines in Java)
   * Exact 1:1 match with Desktop ManagedInvoicePdfService.
   */
  window.openCanonicalDocument = function(type, number, format) {
    if (!number) {
      if (window.AppDialogService) window.AppDialogService.showToast('Document number is required.', 'warning');
      return;
    }
    const fmt = format || 'PDF';
    const url = '/api/documents/render?type=' + encodeURIComponent(type) + '&number=' + encodeURIComponent(number) + '&format=' + encodeURIComponent(fmt);
    window.open(url, '_blank');
  };

  /**
   * Helper to download canonical document with custom filename
   */
  window.downloadCanonicalDocument = function(type, number, format) {
    const fmt = format || 'PDF';
    const url = '/api/documents/render?type=' + encodeURIComponent(type) + '&number=' + encodeURIComponent(number) + '&format=' + encodeURIComponent(fmt);
    const link = document.createElement('a');
    link.href = url;
    link.download = type + '_' + number + '.' + fmt.toLowerCase();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
})();
