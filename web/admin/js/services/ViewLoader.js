/**
 * Jasvi Industries ERP - ViewLoader Service
 * Dynamic on-demand modular HTML view loader matching Desktop FXML View Loader.
 * Enables 1 Screen = 1 Dedicated .html File architecture.
 */
window.ViewLoader = (function() {
  'use strict';
  const viewCache = new Map();

  return {
    async loadView(viewId) {
      if (!viewId) return null;
      let targetViewId = viewId;
      let cleanName = viewId.replace(/^view-/, '');
      if (cleanName.startsWith('settings-') || cleanName === 'settings') {
        cleanName = 'settings';
        targetViewId = 'view-settings';
      }
      let viewEl = document.getElementById(targetViewId);

      // If view is already populated in DOM and not a stub, return it immediately
      if (viewEl && viewEl.children.length > 0 && !viewEl.dataset.stub) {
        return viewEl;
      }

      // Check in-memory cache
      if (viewCache.has(cleanName)) {
        const html = viewCache.get(cleanName);
        this.mountView(targetViewId, html);
        return document.getElementById(targetViewId);
      }

      // Asynchronously fetch dedicated view HTML file
      try {
        const version = (window.DSE_VERSION && window.DSE_VERSION.webVersion) || (window.AppVersion && window.AppVersion.webVersion) || '11.0.8.06';
        const res = await fetch(`./views/${cleanName}.html?v=${version}`);
        if (res.ok) {
          const html = await res.text();
          viewCache.set(cleanName, html);
          this.mountView(targetViewId, html);
          return document.getElementById(targetViewId);
        }
      } catch (err) {
        console.warn(`[ViewLoader] Failed to fetch external view ./views/${cleanName}.html:`, err);
      }

      return viewEl;
    },

    mountView(viewId, html) {
      if (!html) return;
      const stage = document.getElementById('main-content-stage');
      const temp = document.createElement('div');
      temp.innerHTML = html.trim();
      const firstChild = temp.firstElementChild;

      let target = document.getElementById(viewId);
      if (firstChild && firstChild.id === viewId) {
        if (target) {
          // Preserve active status if already active
          if (target.classList.contains('active')) {
            firstChild.classList.add('active');
            firstChild.style.display = target.style.display || 'block';
          }
          target.replaceWith(firstChild);
        } else if (stage) {
          stage.appendChild(firstChild);
        }
        target = firstChild;
      } else {
        if (!target && stage) {
          target = document.createElement('div');
          target.id = viewId;
          target.className = 'module-view';
          stage.appendChild(target);
        }
        if (target) {
          target.innerHTML = html;
        }
      }

      if (target) {
        delete target.dataset.stub;
        if (window.DatePickerFormatter && typeof window.DatePickerFormatter.attachAll === 'function') {
          window.DatePickerFormatter.attachAll(target);
        }
        if (window.GlobalUiEnhancer) {
          window.GlobalUiEnhancer.enhance(target);
        }
        if (window.LabelIconEnhancer) {
          window.LabelIconEnhancer.enhance(target);
        }
      }
    }
  };
})();
