/**
 * Jasvi Industries ERP - AppDialogService
 * Modal dialog renderer, confirmation service and notification system
 * matching desktop AppDialogService.java and AppDialogRenderer.java.
 *
 * Provides Promise-based confirmation, destructive alert, warning,
 * unsaved changes guard, toast notifications and modal workspace lifecycle.
 */
window.AppDialogService = (function() {
  'use strict';

  let activeDialogResolver = null;

  let isPromptMode = false;

  /**
   * Creates or returns the single global dialog container
   */
  function ensureDialogContainer() {
    let container = document.getElementById('modal-app-dialog');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modal-app-dialog';
      container.className = 'modal-overlay app-dialog-overlay';
      container.style.display = 'none';
      container.innerHTML = `
        <div class="app-dialog-card" role="dialog" aria-modal="true">
          <div class="app-dialog-header">
            <div class="app-dialog-icon-box" id="app-dialog-icon-box">ℹ️</div>
            <div class="app-dialog-header-text">
              <h3 class="app-dialog-title" id="app-dialog-title">Notification</h3>
              <p class="app-dialog-heading" id="app-dialog-heading"></p>
            </div>
            <button type="button" class="app-dialog-close-btn" id="app-dialog-btn-close" title="Close (Esc)">&times;</button>
          </div>
          <div class="app-dialog-body" id="app-dialog-body"></div>
          <div class="app-dialog-prompt-wrap" id="app-dialog-prompt-wrap" style="display: none; padding: 4px 20px 14px 20px;">
            <input type="text" id="app-dialog-prompt-input" class="form-input" style="width: 100%; height: 38px; background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #fff; padding: 0 12px; font-size: 0.85rem;" />
          </div>
          <div class="app-dialog-detail" id="app-dialog-detail" style="display: none;"></div>
          <div class="app-dialog-footer" id="app-dialog-footer">
            <button type="button" class="btn btn-secondary" id="app-dialog-btn-cancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="app-dialog-btn-confirm">Continue</button>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    } else if (!container.querySelector('#app-dialog-prompt-wrap')) {
      const bodyEl = container.querySelector('#app-dialog-body');
      const wrap = document.createElement('div');
      wrap.className = 'app-dialog-prompt-wrap';
      wrap.id = 'app-dialog-prompt-wrap';
      wrap.style.cssText = 'display: none; padding: 4px 24px 16px 24px;';
      wrap.innerHTML = '<input type="text" id="app-dialog-prompt-input" class="form-input" style="width: 100%; height: 42px; background: rgba(15,23,42,0.8); border: 1.5px solid rgba(56,189,248,0.4); border-radius: 8px; color: #fff; padding: 0 14px; font-size: 0.9rem; outline: none; box-shadow: 0 0 15px rgba(56,189,248,0.15);" />';
      if (bodyEl && bodyEl.parentNode) {
        bodyEl.parentNode.insertBefore(wrap, bodyEl.nextSibling);
      } else {
        const card = container.querySelector('.app-dialog-card');
        if (card) card.appendChild(wrap);
      }
    }
    return container;
  }

  /**
   * Binds click and keyboard handlers unconditionally to guarantee interactivity
   */
  function attachDialogHandlers(container) {
    if (!container) return;

    const btnClose = container.querySelector('#app-dialog-btn-close');
    const btnCancel = container.querySelector('#app-dialog-btn-cancel');
    const btnConfirm = container.querySelector('#app-dialog-btn-confirm');
    const promptInput = container.querySelector('#app-dialog-prompt-input');

    if (promptInput) {
      promptInput.onkeydown = function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          resolveDialog(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          resolveDialog(false);
        }
      };
    }

    if (btnClose) {
      btnClose.onclick = function(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        resolveDialog(false);
      };
    }
    if (btnCancel) {
      btnCancel.onclick = function(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        resolveDialog(false);
      };
    }
    if (btnConfirm) {
      btnConfirm.onclick = function(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        resolveDialog(true);
      };
    }

    if (!window._appDialogKeyboardBound) {
      window._appDialogKeyboardBound = true;
      window.addEventListener('keydown', (e) => {
        const dialog = document.getElementById('modal-app-dialog');
        if (dialog && (dialog.style.display === 'flex' || dialog.classList.contains('active')) && typeof activeDialogResolver === 'function') {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            resolveDialog(false);
          } else if (e.key === 'Enter' && e.target && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            e.stopPropagation();
            resolveDialog(true);
          }
        }
      }, true);
    }
  }

  function resolveDialog(confirmed) {
    const container = document.getElementById('modal-app-dialog');
    const promptWrap = document.getElementById('app-dialog-prompt-wrap');
    const promptInput = document.getElementById('app-dialog-prompt-input');

    let resolvedValue = confirmed;
    if (isPromptMode) {
      resolvedValue = confirmed ? (promptInput ? promptInput.value : '') : null;
    }

    if (container) {
      container.style.display = 'none';
      container.classList.remove('active');
    }
    if (promptWrap) promptWrap.style.display = 'none';
    isPromptMode = false;

    if (window.AudioSynthesizer) {
      try {
        if (confirmed) window.AudioSynthesizer.playSuccess();
        else window.AudioSynthesizer.playClose();
      } catch (_) {}
    }
    if (typeof activeDialogResolver === 'function') {
      const resolver = activeDialogResolver;
      activeDialogResolver = null;
      resolver(resolvedValue);
    }
  }

  return {
    resolveDialog: resolveDialog,

    /**
     * Desktop parity confirmation dialog
     * @returns {Promise<boolean>}
     */
    confirm(title, heading, message, primaryAction = 'Continue', safeAction = 'Cancel') {
      // Smart argument normalization
      if (arguments.length === 1) {
        message = title;
        title = 'Confirmation';
        heading = '';
      } else if (arguments.length === 2) {
        if (typeof title === 'string' && (title.includes('\n') || title.length > 50)) {
          const actualMsg = title;
          title = heading || 'Confirmation';
          heading = '';
          message = actualMsg;
        } else {
          message = heading;
          heading = '';
        }
      }

      const container = ensureDialogContainer();
      attachDialogHandlers(container);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();

      const iconBox = container.querySelector('#app-dialog-icon-box');
      const titleEl = container.querySelector('#app-dialog-title');
      const headingEl = container.querySelector('#app-dialog-heading');
      const bodyEl = container.querySelector('#app-dialog-body');
      const detailEl = container.querySelector('#app-dialog-detail');
      const btnCancel = container.querySelector('#app-dialog-btn-cancel');
      const btnConfirm = container.querySelector('#app-dialog-btn-confirm');

      iconBox.innerText = '❓';
      iconBox.className = 'app-dialog-icon-box sem-blue';
      titleEl.innerText = title || 'Confirmation';
      headingEl.innerText = heading || '';
      bodyEl.innerText = message || '';
      detailEl.style.display = 'none';

      btnCancel.style.display = 'inline-flex';
      btnCancel.innerText = safeAction || 'Cancel';
      btnCancel.className = 'btn btn-action-3d role-cancel';
      btnConfirm.innerText = primaryAction || 'Continue';
      btnConfirm.className = 'btn btn-action-3d role-primary';

      container.style.display = 'flex';
      container.style.zIndex = '100080';
      container.classList.add('active');

      setTimeout(() => btnConfirm.focus(), 80);

      return new Promise((resolve) => {
        activeDialogResolver = resolve;
      });
    },

    /**
     * Destructive action confirmation (Delete, Void, Cancel, Discard)
     * Renders in red danger styling with consequence analysis and safe default focus
     * @returns {Promise<boolean>}
     */
    destructive(title, heading, message, primaryAction = 'Delete', safeAction = 'Cancel') {
      let consequenceItems = null;

      if (typeof title === 'object' && title !== null) {
        const opt = title;
        title = opt.title || 'Confirm Permanent Deletion';
        heading = opt.heading || (opt.entityRef ? `Delete ${opt.entityType || 'Record'} • ${opt.entityRef}` : 'This action cannot be undone');
        message = opt.message || `Are you sure you want to permanently delete this ${opt.entityType || 'document'}?`;
        primaryAction = opt.primaryAction || opt.confirmText || 'Yes, Delete Document';
        safeAction = opt.safeAction || opt.cancelText || 'Cancel / Keep';
        consequenceItems = opt.consequences || null;
      } else if (arguments.length === 1) {
        message = title;
        title = 'Confirm Delete';
        heading = 'This action cannot be undone';
      } else if (arguments.length === 2) {
        if (typeof title === 'string' && (title.includes('\n') || title.length > 50)) {
          const actualMsg = title;
          title = heading || 'Confirm Delete';
          heading = 'This action cannot be undone';
          message = actualMsg;
        } else {
          message = heading;
          heading = 'This action cannot be undone';
        }
      }

      const container = ensureDialogContainer();
      attachDialogHandlers(container);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playError();

      const iconBox = container.querySelector('#app-dialog-icon-box');
      const titleEl = container.querySelector('#app-dialog-title');
      const headingEl = container.querySelector('#app-dialog-heading');
      const bodyEl = container.querySelector('#app-dialog-body');
      const detailEl = container.querySelector('#app-dialog-detail');
      const btnCancel = container.querySelector('#app-dialog-btn-cancel');
      const btnConfirm = container.querySelector('#app-dialog-btn-confirm');

      iconBox.innerText = '🗑️';
      iconBox.className = 'app-dialog-icon-box sem-red';
      titleEl.innerText = title || 'Confirm Delete';
      headingEl.innerText = heading || 'This action cannot be undone';
      
      let html = `<div style="font-weight:600; margin-bottom:8px;">${message || ''}</div>`;
      if (consequenceItems && Array.isArray(consequenceItems) && consequenceItems.length > 0) {
        html += `<div class="dialog-consequence-card">
          <div class="consequence-title">⚠️ Consequence Breakdown:</div>`;
        consequenceItems.forEach(c => {
          html += `<div class="consequence-item"><span class="consequence-icon">${c.icon || '•'}</span><span>${c.text || c}</span></div>`;
        });
        html += `</div>`;
      } else {
        html += `<div class="dialog-consequence-card">
          <div class="consequence-title">⚠️ Consequence Breakdown:</div>
          <div class="consequence-item"><span class="consequence-icon">📦</span><span>Physical stock quantities will be restored to warehouse inventory.</span></div>
          <div class="consequence-item"><span class="consequence-icon">⚖️</span><span>General ledger journals & customer balance will be reversed.</span></div>
          <div class="consequence-item"><span class="consequence-icon">📜</span><span>An immutable audit trail log will preserve this deletion event.</span></div>
        </div>`;
      }
      bodyEl.innerHTML = html;
      detailEl.style.display = 'none';

      btnCancel.style.display = 'inline-flex';
      btnCancel.innerText = safeAction || 'Cancel';
      btnCancel.className = 'btn btn-action-3d role-cancel';
      btnConfirm.innerText = primaryAction || 'Delete';
      btnConfirm.className = 'btn btn-action-3d role-delete';

      container.style.display = 'flex';
      container.style.zIndex = '100080';
      container.classList.add('active');

      // Focus safe action by default to prevent accidental deletion on Enter key
      setTimeout(() => btnCancel.focus(), 80);

      return new Promise((resolve) => {
        activeDialogResolver = resolve;
      });
    },

    /**
     * Warning confirmation (e.g. Overdue credit limit, duplicate entry)
     * @returns {Promise<boolean>}
     */
    warningConfirm(title, heading, message, primaryAction = 'Proceed Anyway', safeAction = 'Cancel') {
      if (arguments.length === 1) {
        message = title;
        title = 'Warning';
        heading = '';
      } else if (arguments.length === 2) {
        if (typeof title === 'string' && (title.includes('\n') || title.length > 50)) {
          const actualMsg = title;
          title = heading || 'Warning';
          heading = '';
          message = actualMsg;
        } else {
          message = heading;
          heading = '';
        }
      }

      const container = ensureDialogContainer();
      attachDialogHandlers(container);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playError();

      const iconBox = container.querySelector('#app-dialog-icon-box');
      const titleEl = container.querySelector('#app-dialog-title');
      const headingEl = container.querySelector('#app-dialog-heading');
      const bodyEl = container.querySelector('#app-dialog-body');
      const detailEl = container.querySelector('#app-dialog-detail');
      const btnCancel = container.querySelector('#app-dialog-btn-cancel');
      const btnConfirm = container.querySelector('#app-dialog-btn-confirm');

      iconBox.innerText = '⚠️';
      iconBox.className = 'app-dialog-icon-box sem-amber';
      titleEl.innerText = title || 'Warning';
      headingEl.innerText = heading || '';
      bodyEl.innerText = message || '';
      detailEl.style.display = 'none';

      btnCancel.style.display = 'inline-flex';
      btnCancel.innerText = safeAction || 'Cancel';
      btnCancel.className = 'btn btn-action-3d role-cancel';
      btnConfirm.innerText = primaryAction || 'Proceed';
      btnConfirm.className = 'btn btn-action-3d role-warning';

      container.style.display = 'flex';
      container.style.zIndex = '100080';
      container.classList.add('active');

      setTimeout(() => btnConfirm.focus(), 80);

      return new Promise((resolve) => {
        activeDialogResolver = resolve;
      });
    },

    /**
     * Unsaved changes navigation guard matching desktop AppDialogService.unsaved
     * @returns {Promise<boolean>}
     */
    unsaved(screenName, summary, destination) {
      const target = destination || 'another view';
      const message = `This ${screenName || 'document'} has changes that have not been saved. Leaving now will discard your current work before opening ${target}.`;
      return this.confirm(
        'Unsaved Changes',
        `Leave ${screenName || 'Screen'}?`,
        message,
        'Discard & Leave',
        'Stay & Continue Editing'
      );
    },

    /**
     * Single-button informative alert
     * @returns {Promise<void>}
     */
    info(title, heading, message) {
      if (arguments.length === 1) {
        message = title;
        title = 'Information';
        heading = '';
      } else if (arguments.length === 2) {
        if (typeof title === 'string' && (title.includes('\n') || title.length > 50)) {
          const actualMsg = title;
          title = heading || 'Information';
          heading = '';
          message = actualMsg;
        } else {
          message = heading;
          heading = '';
        }
      }

      const container = ensureDialogContainer();
      attachDialogHandlers(container);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();

      const iconBox = container.querySelector('#app-dialog-icon-box');
      const titleEl = container.querySelector('#app-dialog-title');
      const headingEl = container.querySelector('#app-dialog-heading');
      const bodyEl = container.querySelector('#app-dialog-body');
      const detailEl = container.querySelector('#app-dialog-detail');
      const btnCancel = container.querySelector('#app-dialog-btn-cancel');
      const btnConfirm = container.querySelector('#app-dialog-btn-confirm');

      iconBox.innerText = 'ℹ️';
      iconBox.className = 'app-dialog-icon-box sem-blue';
      titleEl.innerText = title || 'Information';
      headingEl.innerText = heading || '';
      bodyEl.innerText = message || '';
      detailEl.style.display = 'none';

      btnCancel.style.display = 'none';
      btnConfirm.innerText = 'OK';
      btnConfirm.className = 'btn btn-action-3d role-primary';

      container.style.display = 'flex';
      container.style.zIndex = '100080';
      container.classList.add('active');

      setTimeout(() => btnConfirm.focus(), 80);

      return new Promise((resolve) => {
        activeDialogResolver = resolve;
      });
    },

    /**
     * Alias for info() to satisfy legacy code calling AppDialogService.alert()
     */
    alert(title, heading, message) {
      return this.info(title, heading, message);
    },

    /**
     * Input prompt modal matching browser prompt() but rendered in 3D dark centralized dialog
     * @returns {Promise<string|null>}
     */
    prompt(title, heading, message, defaultValue = '', placeholder = '') {
      if (arguments.length === 1) {
        message = title;
        title = 'Input Required';
        heading = '';
      } else if (arguments.length === 2) {
        message = title;
        defaultValue = heading;
        title = 'Input Required';
        heading = '';
      }

      isPromptMode = true;
      const container = ensureDialogContainer();
      attachDialogHandlers(container);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();

      const iconBox = container.querySelector('#app-dialog-icon-box');
      const titleEl = container.querySelector('#app-dialog-title');
      const headingEl = container.querySelector('#app-dialog-heading');
      const bodyEl = container.querySelector('#app-dialog-body');
      const detailEl = container.querySelector('#app-dialog-detail');
      const promptWrap = container.querySelector('#app-dialog-prompt-wrap');
      const promptInput = container.querySelector('#app-dialog-prompt-input');
      const btnCancel = container.querySelector('#app-dialog-btn-cancel');
      const btnConfirm = container.querySelector('#app-dialog-btn-confirm');

      iconBox.innerText = '✏️';
      iconBox.className = 'app-dialog-icon-box sem-purple';
      titleEl.innerText = title || 'Input Required';
      headingEl.innerText = heading || '';
      bodyEl.innerText = message || '';
      detailEl.style.display = 'none';

      if (promptWrap && promptInput) {
        promptWrap.style.display = 'block';
        promptInput.value = defaultValue || '';
        promptInput.placeholder = placeholder || 'Enter value...';
      }

      btnCancel.style.display = 'inline-flex';
      btnCancel.innerText = 'Cancel';
      btnCancel.className = 'btn btn-action-3d role-cancel';
      btnConfirm.innerText = 'OK';
      btnConfirm.className = 'btn btn-action-3d role-primary';

      container.style.display = 'flex';
      container.style.zIndex = '100080';
      container.classList.add('active');

      setTimeout(() => {
        if (promptInput) {
          promptInput.focus();
          promptInput.select();
        } else {
          btnConfirm.focus();
        }
      }, 80);

      return new Promise((resolve) => {
        activeDialogResolver = resolve;
      });
    },

    /**
     * Error alert modal with expandable detail
     * @returns {Promise<void>}
     */
    error(title, heading, message, detail) {
      const container = ensureDialogContainer();
      attachDialogHandlers(container);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playError();

      const iconBox = container.querySelector('#app-dialog-icon-box');
      const titleEl = container.querySelector('#app-dialog-title');
      const headingEl = container.querySelector('#app-dialog-heading');
      const bodyEl = container.querySelector('#app-dialog-body');
      const detailEl = container.querySelector('#app-dialog-detail');
      const btnCancel = container.querySelector('#app-dialog-btn-cancel');
      const btnConfirm = container.querySelector('#app-dialog-btn-confirm');

      iconBox.innerText = '🚨';
      iconBox.className = 'app-dialog-icon-box sem-red';
      titleEl.innerText = title || 'System Error';
      headingEl.innerText = heading || 'Operation Failed';
      bodyEl.innerText = message || 'An unexpected error occurred.';

      if (detail) {
        detailEl.innerText = detail;
        detailEl.style.display = 'block';
      } else {
        detailEl.style.display = 'none';
      }

      btnCancel.style.display = 'none';
      btnConfirm.innerText = 'Close';
      btnConfirm.className = 'btn btn-action-3d role-delete';

      container.style.display = 'flex';
      container.style.zIndex = '100080';
      container.classList.add('active');

      setTimeout(() => btnConfirm.focus(), 80);

      return new Promise((resolve) => {
        activeDialogResolver = resolve;
      });
    },

    /**
     * Success alert modal matching Desktop AppDialogRenderer.java
     * @returns {Promise<void>}
     */
    success(title, heading, message, primaryAction = 'OK') {
      if (arguments.length === 1) {
        message = title;
        title = 'Success';
        heading = 'Operation Completed';
      } else if (arguments.length === 2) {
        if (typeof title === 'string' && (title.includes('\n') || title.length > 50)) {
          const actualMsg = title;
          title = heading || 'Success';
          heading = 'Operation Completed';
          message = actualMsg;
        } else {
          message = heading;
          heading = '';
        }
      }

      if (typeof activeDialogResolver === 'function') {
        const prev = activeDialogResolver;
        activeDialogResolver = null;
        try { prev(false); } catch (_) {}
      }

      const container = ensureDialogContainer();
      attachDialogHandlers(container);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();

      const iconBox = container.querySelector('#app-dialog-icon-box');
      const titleEl = container.querySelector('#app-dialog-title');
      const headingEl = container.querySelector('#app-dialog-heading');
      const bodyEl = container.querySelector('#app-dialog-body');
      const detailEl = container.querySelector('#app-dialog-detail');
      const btnCancel = container.querySelector('#app-dialog-btn-cancel');
      const btnConfirm = container.querySelector('#app-dialog-btn-confirm');

      iconBox.innerText = '✔';
      iconBox.className = 'app-dialog-icon-box sem-green';
      titleEl.innerText = title || 'Success';
      headingEl.innerText = heading || 'Operation Completed';
      bodyEl.innerText = message || '';
      detailEl.style.display = 'none';

      btnCancel.style.display = 'none';
      btnConfirm.innerText = primaryAction || 'OK';
      btnConfirm.className = 'btn btn-action-3d role-save';

      container.style.display = 'flex';
      container.style.zIndex = '100080';
      container.classList.add('active');

      setTimeout(() => btnConfirm.focus(), 80);

      return new Promise((resolve) => {
        activeDialogResolver = resolve;
      });
    },

    /**
     * Warning alert modal matching Desktop AppDialogRenderer.java
     * @returns {Promise<void>}
     */
    warning(title, heading, message, primaryAction = 'OK') {
      if (arguments.length === 1) {
        message = title;
        title = 'Warning';
        heading = 'Please Note';
      } else if (arguments.length === 2) {
        if (typeof title === 'string' && (title.includes('\n') || title.length > 50)) {
          const actualMsg = title;
          title = heading || 'Warning';
          heading = 'Please Note';
          message = actualMsg;
        } else {
          message = heading;
          heading = '';
        }
      }

      if (typeof activeDialogResolver === 'function') {
        const prev = activeDialogResolver;
        activeDialogResolver = null;
        try { prev(false); } catch (_) {}
      }

      const container = ensureDialogContainer();
      attachDialogHandlers(container);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playError();

      const iconBox = container.querySelector('#app-dialog-icon-box');
      const titleEl = container.querySelector('#app-dialog-title');
      const headingEl = container.querySelector('#app-dialog-heading');
      const bodyEl = container.querySelector('#app-dialog-body');
      const detailEl = container.querySelector('#app-dialog-detail');
      const btnCancel = container.querySelector('#app-dialog-btn-cancel');
      const btnConfirm = container.querySelector('#app-dialog-btn-confirm');

      iconBox.innerText = '⚠️';
      iconBox.className = 'app-dialog-icon-box sem-amber';
      titleEl.innerText = title || 'Warning';
      headingEl.innerText = heading || 'Please Note';
      bodyEl.innerText = message || '';
      detailEl.style.display = 'none';

      btnCancel.style.display = 'none';
      btnConfirm.innerText = primaryAction || 'OK';
      btnConfirm.className = 'btn btn-action-3d role-warning';

      container.style.display = 'flex';
      container.style.zIndex = '100080';
      container.classList.add('active');

      setTimeout(() => btnConfirm.focus(), 80);

      return new Promise((resolve) => {
        activeDialogResolver = resolve;
      });
    },

    /**
     * Export / Download success modal dialog
     * @returns {Promise<boolean>}
     */
    exportSuccess(title, heading, message, openCallback) {
      if (typeof heading === 'function') {
        openCallback = heading;
        heading = 'File Download Ready';
      }
      if (typeof message === 'function') {
        openCallback = message;
        message = heading;
        heading = 'File Ready';
      }

      if (typeof activeDialogResolver === 'function') {
        const prev = activeDialogResolver;
        activeDialogResolver = null;
        try { prev(false); } catch (_) {}
      }

      const container = ensureDialogContainer();
      attachDialogHandlers(container);
      if (window.AudioSynthesizer) window.AudioSynthesizer.playSuccess();

      const iconBox = container.querySelector('#app-dialog-icon-box');
      const titleEl = container.querySelector('#app-dialog-title');
      const headingEl = container.querySelector('#app-dialog-heading');
      const bodyEl = container.querySelector('#app-dialog-body');
      const detailEl = container.querySelector('#app-dialog-detail');
      const btnCancel = container.querySelector('#app-dialog-btn-cancel');
      const btnConfirm = container.querySelector('#app-dialog-btn-confirm');

      iconBox.innerText = '📥';
      iconBox.className = 'app-dialog-icon-box sem-green';
      titleEl.innerText = title || 'Export Complete';
      headingEl.innerText = heading || 'File Download Ready';
      bodyEl.innerText = message || 'Your document was generated and downloaded successfully.';
      detailEl.style.display = 'none';

      btnCancel.style.display = 'inline-flex';
      btnCancel.innerText = 'Dismiss';
      btnConfirm.innerText = '👁️ Open / Download';
      btnConfirm.className = 'btn btn-primary';

      container.style.display = 'flex';
      container.style.zIndex = '100080';
      container.classList.add('active');

      setTimeout(() => btnConfirm.focus(), 80);

      return new Promise((resolve) => {
        activeDialogResolver = (confirmed) => {
          if (confirmed && typeof openCallback === 'function') {
            try { openCallback(); } catch (err) { console.warn('openCallback failed:', err); }
          }
          resolve(confirmed);
        };
      });
    },

    /**
     * Global Decision Dialog Notification Dispatcher
     * Replaces transient toast popups with interactive modal dialogs as mandated.
     */
    showToast(message, type = 'info') {
      const msgStr = typeof message === 'string' ? message : (message ? (message.message || JSON.stringify(message)) : '');
      if (type === 'success') {
        return this.success('Success', 'Operation Completed', msgStr);
      } else if (type === 'error') {
        return this.error('Error', 'Action Failed', msgStr);
      } else if (type === 'warning') {
        return this.warning('Warning', 'Notice', msgStr);
      } else {
        return this.info('Information', 'System Notice', msgStr);
      }
    },

    toast(message, type = 'info') {
      return this.showToast(message, type);
    },

    toastSuccess(message) {
      return this.showToast(message, 'success');
    },

    toastError(message) {
      return this.showToast(message, 'error');
    },

    toastWarning(message) {
      return this.showToast(message, 'warning');
    },

    toastInfo(message) {
      return this.showToast(message, 'info');
    },

    /**
     * Custom modal lifecycle helpers
     */
    openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      // 1. Automatically close any open inspection drawers so overlays never collide
      document.querySelectorAll('.slide-detail-drawer, .register-inline-drawer, .sales-inline-drawer, .side-drawer, .erp-global-detail-drawer, #drawer-invoice-details, #drawer-purchase-details-inspect, #drawer-purchase-details, #user-detail-drawer, #sales-inline-drawer').forEach(drawer => {
        drawer.classList.remove('open');
        drawer.style.display = 'none';
      });
      const sideOverlay = document.getElementById('side-drawer-overlay');
      if (sideOverlay) {
        sideOverlay.classList.remove('open');
        sideOverlay.style.display = 'none';
        sideOverlay.style.pointerEvents = 'none';
      }

      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      modal.style.display = 'flex';
      const isAuthModal = modalId === 'modal-authenticator-setup' || modalId.startsWith('modal-mfa') || document.body.classList.contains('auth-required') || document.documentElement.classList.contains('auth-required');
      modal.style.zIndex = isAuthModal ? '1000010' : '100060';
      modal.classList.add('active');
      const firstInput = modal.querySelector('input:not([type=hidden]):not([readonly]), select');
      if (firstInput) setTimeout(() => firstInput.focus(), 80);
    },

    closeModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      if (window.AudioSynthesizer) window.AudioSynthesizer.playClose();
      modal.style.display = 'none';
      modal.classList.remove('active');
    },

    closeAllModals() {
      document.querySelectorAll('.modal-overlay, .modal, .modal-backdrop').forEach(m => {
        m.style.display = 'none';
        m.classList.remove('active');
      });
      const auth = document.getElementById('auth-overlay');
      if (auth) auth.style.display = 'none';
    },

    rawAuditEvents: [],
    filteredAuditEvents: [],
    activeAuditCategory: 'All',
    auditSearchQuery: '',
    _auditSearchTimer: null,
    currentAuditTarget: null,

    async showActivityTimeline(type, id, referenceNo) {
      const modal = document.getElementById('modal-activity-timeline');
      if (!modal) return;
      this.currentAuditTarget = { type, id, referenceNo };

      const titleEl = document.getElementById('audit-modal-title');
      if (titleEl) titleEl.innerText = `${type} Audit & Activity Trail`;

      const refEl = document.getElementById('audit-modal-reference');
      if (refEl) refEl.innerText = `${type} • ${referenceNo || ('#' + id)}`;

      const searchInput = document.getElementById('audit-search-input');
      if (searchInput) searchInput.value = '';
      this.auditSearchQuery = '';
      this.activeAuditCategory = 'All';

      const eventsContainer = document.getElementById('audit-modal-events');
      if (eventsContainer) {
        eventsContainer.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 30px;">Loading authoritative audit trail from server...</div>';
      }

      this.openModal('modal-activity-timeline');

      try {
        let events = [];
        if (window.ApiService && typeof window.ApiService.getAuditEvents === 'function') {
          events = await window.ApiService.getAuditEvents(type, id, referenceNo, 100);
        } else if (id) {
          events = await window.ApiService.get(`/api/support/activity?type=${encodeURIComponent(type)}&id=${id}`).catch(() => []);
        }

        if (!Array.isArray(events) || events.length === 0) {
          events = [{
            action: 'CREATED',
            category: 'LIFECYCLE',
            detail: `Record registered in system (${type} ${referenceNo || id || ''})`,
            user: 'System / Auditor',
            createdAt: new Date().toISOString()
          }];
        }

        // Process and pre-compute searchIndex on each event
        this.rawAuditEvents = events.map(e => {
          const act = (e.action || e.type || 'ACTIVITY').toUpperCase();
          const cat = (e.category || e.module || 'GENERAL').toUpperCase();
          const det = e.detail || e.description || e.message || e.remarks || '';
          const usr = e.user || e.actor || e.createdBy || 'System';
          const oldV = e.oldValue || e.before || '';
          const newV = e.newValue || e.after || '';
          const time = e.createdAt || e.timestamp || e.created_at || new Date().toISOString();
          const sIdx = (act + ' ' + cat + ' ' + det + ' ' + usr + ' ' + oldV + ' ' + newV).toLowerCase();
          return {
            action: act,
            category: cat,
            detail: det,
            user: usr,
            oldValue: oldV,
            newValue: newV,
            createdAt: time,
            _searchIndex: sIdx
          };
        });

        this.updateAuditKpis();
        this.filterAuditEvents('All');
      } catch (err) {
        if (eventsContainer) {
          eventsContainer.innerHTML = `<div style="text-align: center; color: var(--red); padding: 30px;">Failed to load audit trail: ${err.message}</div>`;
        }
      }
    },

    updateAuditKpis() {
      const all = this.rawAuditEvents || [];
      const total = all.length;
      let changes = 0, financial = 0, docs = 0, comm = 0;

      all.forEach(e => {
        const act = e.action;
        const cat = e.category;
        const det = (e.detail || '').toUpperCase();
        if (cat.includes('CHANGE') || act.includes('UPDATE') || act.includes('EDIT') || act.includes('APPROVE') || act.includes('REJECT')) changes++;
        if (cat.includes('FINANCIAL') || act.includes('PAYMENT') || act.includes('SETTLE') || det.includes('PAID') || det.includes('REFUND')) financial++;
        if (cat.includes('DOCUMENT') || act.includes('PRINT') || act.includes('PDF') || act.includes('ATTACH') || act.includes('BARCODE')) docs++;
        if (cat.includes('COMMUNICATION') || act.includes('EMAIL') || act.includes('WHATSAPP')) comm++;
      });

      const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = String(val);
      };
      setEl('audit-kpi-total', total);
      setEl('audit-kpi-changes', changes);
      setEl('audit-kpi-financial', financial);
      setEl('audit-kpi-documents', docs);
      setEl('audit-kpi-communication', comm);
    },

    filterAuditSearch(query) {
      clearTimeout(this._auditSearchTimer);
      this._auditSearchTimer = setTimeout(() => {
        this.auditSearchQuery = (query || '').trim().toLowerCase();
        this.applyAuditFilter();
      }, 250);
    },

    filterAuditEvents(category) {
      this.activeAuditCategory = category;
      const buttons = document.querySelectorAll('.audit-chip-btn');
      buttons.forEach(b => {
        const isMatch = b.innerText.trim() === category;
        b.classList.toggle('active', isMatch);
        if (isMatch) {
          b.style.borderColor = 'var(--cyan)';
          b.style.color = 'var(--cyan)';
          b.style.background = 'rgba(56, 189, 248, 0.12)';
        } else {
          b.style.borderColor = '';
          b.style.color = '';
          b.style.background = '';
        }
      });
      this.applyAuditFilter();
    },

    applyAuditFilter() {
      const category = this.activeAuditCategory || 'All';
      const q = this.auditSearchQuery || '';
      const eventsContainer = document.getElementById('audit-modal-events');
      const countEl = document.getElementById('audit-events-count');
      if (!eventsContainer) return;

      const events = this.rawAuditEvents || [];
      const filtered = events.filter(e => {
        if (category !== 'All') {
          const act = e.action;
          const cat = e.category;
          const det = (e.detail || '').toUpperCase();
          if (category === 'Changes' && !(cat.includes('CHANGE') || act.includes('UPDATE') || act.includes('EDIT') || act.includes('APPROVE') || act.includes('REJECT'))) return false;
          if (category === 'Financial' && !(cat.includes('FINANCIAL') || act.includes('PAYMENT') || act.includes('SETTLE') || det.includes('PAID') || det.includes('REFUND'))) return false;
          if (category === 'Documents' && !(cat.includes('DOCUMENT') || act.includes('PRINT') || act.includes('PDF') || act.includes('ATTACH') || act.includes('BARCODE'))) return false;
          if (category === 'Communication' && !(cat.includes('COMMUNICATION') || act.includes('EMAIL') || act.includes('WHATSAPP'))) return false;
        }
        if (q && !e._searchIndex.includes(q)) return false;
        return true;
      });

      this.filteredAuditEvents = filtered;
      if (countEl) countEl.innerText = `${filtered.length} of ${events.length} events recorded`;

      if (filtered.length === 0) {
        eventsContainer.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 30px;">No events match the "${category}" ${q ? 'with search "' + q + '"' : ''} filter.</div>`;
        return;
      }

      eventsContainer.innerHTML = filtered.map((e, idx) => {
        let badgeClass = 'badge-paid';
        if (e.action.includes('CANCEL') || e.action.includes('REJECT') || e.action.includes('DELETE')) badgeClass = 'badge-danger';
        else if (e.action.includes('UPDATE') || e.action.includes('EDIT') || e.action.includes('APPROV')) badgeClass = 'badge-pending';

        const hasDiff = e.oldValue || e.newValue;
        return `
          <div style="background: #111c38; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 16px; transition: border-color 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge ${badgeClass}" style="font-size: 0.72rem; padding: 2px 8px; font-weight: 700;">${e.action}</span>
                <span style="font-size: 0.74rem; color: var(--text-dim);">${window.FormatUtil ? window.FormatUtil.formatDate(e.createdAt) : e.createdAt}</span>
              </div>
              <div style="font-size: 0.74rem; color: var(--cyan); font-weight: 600; display: flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                ${e.user}
              </div>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-main); font-weight: 600; margin-bottom: ${hasDiff ? '6px' : '0'};">${e.detail || 'System action executed.'}</div>
            ${hasDiff ? `
              <div style="display: flex; gap: 14px; font-size: 0.75rem; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                <div><span style="color: var(--text-dim);">Old Value:</span> <span style="color: #f87171; text-decoration: line-through;">${e.oldValue || 'None'}</span></div>
                <div><span style="color: var(--text-dim);">New Value:</span> <span style="color: #34d399; font-weight: 700;">${e.newValue || 'Updated'}</span></div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    },

    exportAuditCsv() {
      const rows = this.filteredAuditEvents || this.rawAuditEvents || [];
      if (rows.length === 0) {
        this.toastWarning('No audit events to export.');
        return;
      }
      const headers = ['#', 'Action', 'Category', 'Timestamp', 'Actor', 'Detail', 'Old Value', 'New Value'];
      const escape = (val) => '"' + String(val == null ? '' : val).replace(/"/g, '""') + '"';
      const lines = [headers.join(',')];
      rows.forEach((r, idx) => {
        lines.push([
          idx + 1,
          escape(r.action),
          escape(r.category),
          escape(r.createdAt),
          escape(r.user),
          escape(r.detail),
          escape(r.oldValue),
          escape(r.newValue)
        ].join(','));
      });
      const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ref = (this.currentAuditTarget && this.currentAuditTarget.referenceNo) ? this.currentAuditTarget.referenceNo.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Record';
      a.href = url;
      a.download = `Audit_Trail_${ref}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      this.toastSuccess(`Exported ${rows.length} audit records to CSV.`);
    }
  };
})();

// Universal interception of legacy browser alert, confirm, and prompt to guarantee 100% centralized dialogs
if (typeof window !== 'undefined') {
  window.alert = function(message) {
    if (window.AppDialogService && typeof window.AppDialogService.info === 'function') {
      return window.AppDialogService.info('Notice', '', String(message));
    } else {
      console.warn('[Alert Intercepted]:', message);
    }
  };

  window.confirm = function(message) {
    if (window.AppDialogService && typeof window.AppDialogService.confirm === 'function') {
      return window.AppDialogService.confirm('Confirmation', 'Please Confirm', String(message));
    }
    return true;
  };

  window.prompt = function(message, defaultVal) {
    if (window.AppDialogService && typeof window.AppDialogService.prompt === 'function') {
      return window.AppDialogService.prompt('Input Required', '', String(message), defaultVal || '');
    }
    return defaultVal || null;
  };
}
