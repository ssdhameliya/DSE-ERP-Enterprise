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
      const cleanName = viewId.replace(/^view-/, '');
      let viewEl = document.getElementById(viewId);

      // If view is already populated in DOM and not a stub, return it immediately
      if (viewEl && viewEl.children.length > 0 && !viewEl.dataset.stub) {
        return viewEl;
      }

      // Check in-memory cache
      if (viewCache.has(cleanName)) {
        const html = viewCache.get(cleanName);
        this.mountView(viewId, html);
        return document.getElementById(viewId);
      }

      // Asynchronously fetch dedicated view HTML file
      try {
        const version = (window.AppVersion && window.AppVersion.webVersion) || '10.0.41.05';
        const res = await fetch(`./views/${cleanName}.html?v=${version}`);
        if (res.ok) {
          const html = await res.text();
          viewCache.set(cleanName, html);
          this.mountView(viewId, html);
          return document.getElementById(viewId);
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
