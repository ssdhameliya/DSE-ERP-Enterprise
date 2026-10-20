/**
 * Jasvi Industries ERP - FormDirtyTracker
 * Centralized Unsaved Changes Protection Engine matching desktop DirtyFormManager.java.
 *
 * Tracks user edits across document creators, line-item grids, drawers, and modal editors.
 * Intercepts tab switches, navigation events, modal dismissals, and browser closures
 * to prevent accidental loss of enterprise data.
 */
window.FormDirtyTracker = (function() {
  'use strict';

  let activeTrackers = new Map();
  let globalDirty = false;
  let activeDocTitle = 'Document';

  /**
   * Listen for browser tab close / refresh
   */
  window.addEventListener('beforeunload', function(e) {
    if (window.FormDirtyTracker && window.FormDirtyTracker.isDirty()) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes in your document. Leaving will discard all changes.';
      return e.returnValue;
    }
  });

  /**
   * Intercept NavigationRouter.selectNav to guard against losing unsaved changes
   */
  function patchNavigationRouter() {
    if (!window.NavigationRouter || window._navRouterDirtyPatched) return;
    window._navRouterDirtyPatched = true;

    const originalSelectNav = window.NavigationRouter.selectNav;
    window.NavigationRouter.selectNav = async function(viewId, force = false) {
      if (!force && window.FormDirtyTracker && window.FormDirtyTracker.isDirty()) {
        const docName = window.FormDirtyTracker.getActiveDocTitle();
        const canLeave = await window.AppDialogService.unsaved(
          docName,
          'You have unsaved line items or fields.',
          viewId.replace(/^view-/, '').replace(/-/g, ' ')
        );
        if (!canLeave) {
          console.log('[FormDirtyTracker] Navigation aborted to preserve unsaved form state.');
          return;
        }
        // User confirmed discard
        window.FormDirtyTracker.reset();
      }
      return originalSelectNav.call(window.NavigationRouter, viewId);
    };

    // Also wrap window.selectNav
    if (typeof window.selectNav === 'function') {
      window.selectNav = function(viewId) {
        window.NavigationRouter.selectNav(viewId);
      };
    }
  }

  // Attempt patching on load and when NavigationRouter becomes available
  if (window.NavigationRouter) {
    patchNavigationRouter();
  } else {
    document.addEventListener('DOMContentLoaded', patchNavigationRouter);
    setTimeout(patchNavigationRouter, 500);
  }

  return {
    /**
     * Start tracking a container (form, panel, drawer, or modal)
     * @param {string|HTMLElement} container - Selector or DOM element
     * @param {string} docTitle - Human readable document title (e.g. 'Tax Invoice', 'Purchase Bill')
     */
    track(container, docTitle = 'Document') {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) return;

      activeDocTitle = docTitle;
      const id = el.id || 'form_' + Math.random().toString(36).substring(2, 9);
      if (!el.id) el.id = id;

      if (activeTrackers.has(id)) return;

      const markDirty = (e) => {
        // Ignore filter inputs or search inputs inside tables
        if (e.target && (e.target.classList.contains('filter-input') || e.target.classList.contains('omni-search') || e.target.classList.contains('search-input'))) {
          return;
        }
        globalDirty = true;
        el.dataset.erpFormDirty = 'true';
      };

      el.addEventListener('input', markDirty, true);
      el.addEventListener('change', markDirty, true);

      activeTrackers.set(id, {
        element: el,
        docTitle: docTitle,
        cleanup() {
          el.removeEventListener('input', markDirty, true);
          el.removeEventListener('change', markDirty, true);
          el.dataset.erpFormDirty = 'false';
        }
      });
    },

    /**
     * Checks if any form or document is currently dirty
     * @returns {boolean}
     */
    isDirty() {
      if (globalDirty) return true;
      for (const tracker of activeTrackers.values()) {
        if (tracker.element && tracker.element.dataset.erpFormDirty === 'true') {
          return true;
        }
      }
      return false;
    },

    /**
     * Mark clean (e.g. after successful save or discard)
     */
    reset() {
      globalDirty = false;
      for (const tracker of activeTrackers.values()) {
        if (tracker.element) {
          tracker.element.dataset.erpFormDirty = 'false';
        }
      }
    },

    markDirty(docTitle) {
      globalDirty = true;
      if (docTitle) activeDocTitle = docTitle;
    },

    getActiveDocTitle() {
      return activeDocTitle || 'Document';
    },

    untrack(container) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el || !el.id) return;
      const tracker = activeTrackers.get(el.id);
      if (tracker) {
        tracker.cleanup();
        activeTrackers.delete(el.id);
      }
    }
  };
})();
