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
          <div class="app-dialog-detail" id="app-dialog-detail" style="display: none;"></div>
          <div class="app-dialog-footer" id="app-dialog-footer">
            <button type="button" class="btn btn-secondary" id="app-dialog-btn-cancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="app-dialog-btn-confirm">Continue</button>
          </div>
        </div>
      `;
      document.body.appendChild(container);

      // Keyboard navigation (<kbd>Enter</kbd> to confirm, <kbd>Escape</kbd> to cancel)
      window.addEventListener('keydown', (e) => {
        if (container.style.display === 'flex' && activeDialogResolver) {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            resolveDialog(false);
          } else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            e.stopPropagation();
            resolveDialog(true);
          }
        }
      }, true);

      // Close button and cancel button bindings
      const btnClose = container.querySelector('#app-dialog-btn-close');
      const btnCancel = container.querySelector('#app-dialog-btn-cancel');
      const btnConfirm = container.querySelector('#app-dialog-btn-confirm');

      if (btnClose) btnClose.addEventListener('click', () => resolveDialog(false));
      if (btnCancel) btnCancel.addEventListener('click', () => resolveDialog(false));
      if (btnConfirm) btnConfirm.addEventListener('click', () => resolveDialog(true));
    }
    return container;
  }

  function resolveDialog(confirmed) {
    const container = document.getElementById('modal-app-dialog');
    if (container) {
      container.style.display = 'none';
      container.classList.remove('active');
    }
    if (window.AudioSynthesizer) {
      if (confirmed) window.AudioSynthesizer.playSuccess();
      else window.AudioSynthesizer.playClose();
    }
    if (typeof activeDialogResolver === 'function') {
      const resolver = activeDialogResolver;
      activeDialogResolver = null;
      resolver(confirmed);
    }
  }

  return {
    /**
     * Desktop parity confirmation dialog
     * @returns {Promise<boolean>}
     */
    confirm(title, heading, message, primaryAction = 'Continue', safeAction = 'Cancel') {
      const container = ensureDialogContainer();
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
      btnConfirm.innerText = primaryAction || 'Continue';
      btnConfirm.className = 'btn btn-primary';

      container.style.display = 'flex';
      container.style.zIndex = '100020';
      container.classList.add('active');

      setTimeout(() => btnConfirm.focus(), 80);

      return new Promise((resolve) => {
        activeDialogResolver = resolve;
      });
    },

    /**
     * Destructive action confirmation (Delete, Void, Cancel, Discard)
     * Renders in red danger styling with trash/cross icon
     * @returns {Promise<boolean>}
     */
    destructive(title, heading, message, primaryAction = 'Delete', safeAction = 'Cancel') {
      const container = ensureDialogContainer();
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
      bodyEl.innerText = message || '';
      detailEl.style.display = 'none';

      btnCancel.style.display = 'inline-flex';
      btnCancel.innerText = safeAction || 'Cancel';
      btnConfirm.innerText = primaryAction || 'Delete';
      btnConfirm.className = 'btn btn-danger';

      container.style.display = 'flex';
      container.style.zIndex = '100020';
      container.classList.add('active');

      setTimeout(() => btnConfirm.focus(), 80);

      return new Promise((resolve) => {
        activeDialogResolver = resolve;
      });
    },

    /**
     * Warning confirmation (e.g. Overdue credit limit, duplicate entry)
     * @returns {Promise<boolean>}
     */
    warningConfirm(title, heading, message, primaryAction = 'Proceed Anyway', safeAction = 'Cancel') {
      const container = ensureDialogContainer();
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
      btnConfirm.innerText = primaryAction || 'Proceed';
      btnConfirm.className = 'btn btn-warning';

      container.style.display = 'flex';
      container.style.zIndex = '100020';
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
      const container = ensureDialogContainer();
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
      btnConfirm.innerText = 'Close';
      btnConfirm.className = 'btn btn-secondary';

      container.style.display = 'flex';
      container.style.zIndex = '100020';
      container.classList.add('active');

      setTimeout(() => btnConfirm.focus(), 80);

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
      btnConfirm.className = 'btn btn-danger';

      container.style.display = 'flex';
      container.style.zIndex = '100020';
      container.classList.add('active');

      setTimeout(() => btnConfirm.focus(), 80);

      return new Promise((resolve) => {
        activeDialogResolver = resolve;
      });
    },

    /**
     * Toast notification manager matching desktop ToastManager
     */
    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      const icon = type === 'success' ? '✔' : type === 'error' ? '✖' : type === 'warning' ? '⚠️' : 'ℹ';
      toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${message}</span>`;
      container.appendChild(toast);

      if (window.AudioSynthesizer) {
        if (type === 'success') window.AudioSynthesizer.playSuccess();
        else if (type === 'error') window.AudioSynthesizer.playError();
      }

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    },

    /**
     * Custom modal lifecycle helpers
     */
    openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      modal.style.display = 'flex';
      modal.style.zIndex = '100010';
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
      document.querySelectorAll('.modal-overlay').forEach(m => {
        m.style.display = 'none';
        m.classList.remove('active');
      });
      const auth = document.getElementById('auth-overlay');
      if (auth) auth.style.display = 'none';
    }
  };
})();
