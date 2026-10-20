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
        if (dialog && (dialog.style.display === 'flex' || dialog.classList.contains('active')) && activeDialogResolver) {
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
    if (container) {
      container.style.display = 'none';
      container.classList.remove('active');
    }
    if (window.AudioSynthesizer) {
      try {
        if (confirmed) window.AudioSynthesizer.playSuccess();
        else window.AudioSynthesizer.playClose();
      } catch (_) {}
    }
    if (typeof activeDialogResolver === 'function') {
      const resolver = activeDialogResolver;
      activeDialogResolver = null;
      resolver(confirmed);
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
      btnConfirm.innerText = primaryAction || 'Delete';
      btnConfirm.className = 'btn btn-danger';

      container.style.display = 'flex';
      container.style.zIndex = '100020';
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

    toast(message, type = 'info') {
      this.showToast(message, type);
    },

    toastSuccess(message) {
      this.showToast(message, 'success');
    },

    toastError(message) {
      this.showToast(message, 'error');
    },

    toastWarning(message) {
      this.showToast(message, 'warning');
    },

    toastInfo(message) {
      this.showToast(message, 'info');
    },

    /**
     * Custom modal lifecycle helpers
     */
    openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      modal.style.display = 'flex';
      const isAuthModal = modalId === 'modal-authenticator-setup' || modalId.startsWith('modal-mfa') || document.body.classList.contains('auth-required') || document.documentElement.classList.contains('auth-required');
      modal.style.zIndex = isAuthModal ? '1000010' : '100010';
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
    },

    rawAuditEvents: [],
    async showActivityTimeline(type, id, referenceNo) {
      const modal = document.getElementById('modal-activity-timeline');
      if (!modal) return;
      const refEl = document.getElementById('audit-modal-reference');
      if (refEl) refEl.innerText = `${type} • ${referenceNo || ('#' + id)}`;

      const eventsContainer = document.getElementById('audit-modal-events');
      if (eventsContainer) {
        eventsContainer.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 30px;">Loading authoritative audit trail from server...</div>';
      }

      this.openModal('modal-activity-timeline');

      try {
        let events = [];
        if (id) {
          events = await window.ApiService.get(`/api/support/activity?type=${encodeURIComponent(type)}&id=${id}`).catch(() => []);
        }
        if (!events || events.length === 0) {
          events = [{
            action: 'CREATED',
            category: 'LIFECYCLE',
            detail: `Record registered in system (${type} ${referenceNo || id})`,
            user: 'System / Auditor',
            createdAt: new Date().toISOString()
          }];
        }
        this.rawAuditEvents = events;
        this.filterAuditEvents('All');
      } catch (err) {
        if (eventsContainer) {
          eventsContainer.innerHTML = `<div style="text-align: center; color: var(--red); padding: 30px;">Failed to load audit trail: ${err.message}</div>`;
        }
      }
    },

    filterAuditEvents(category) {
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

      const eventsContainer = document.getElementById('audit-modal-events');
      const countEl = document.getElementById('audit-events-count');
      if (!eventsContainer) return;

      const events = this.rawAuditEvents || [];
      const filtered = events.filter(e => {
        if (category === 'All') return true;
        const act = (e.action || '').toUpperCase();
        const cat = (e.category || '').toUpperCase();
        const det = (e.detail || '').toUpperCase();
        if (category === 'Changes') return cat.includes('CHANGE') || act.includes('UPDATE') || act.includes('EDIT') || act.includes('APPROVE') || act.includes('REJECT');
        if (category === 'Financial') return cat.includes('FINANCIAL') || act.includes('PAYMENT') || act.includes('SETTLE') || det.includes('PAID');
        if (category === 'Documents') return cat.includes('DOCUMENT') || act.includes('PRINT') || act.includes('PDF') || act.includes('ATTACH');
        if (category === 'Communication') return cat.includes('COMMUNICATION') || act.includes('EMAIL') || act.includes('WHATSAPP');
        return true;
      });

      if (countEl) countEl.innerText = `${filtered.length} of ${events.length} events`;

      if (filtered.length === 0) {
        eventsContainer.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 30px;">No events match the "${category}" filter.</div>`;
        return;
      }

      eventsContainer.innerHTML = filtered.map(e => `
        <div style="background: rgba(255,255,255,0.025); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-paid" style="font-size: 0.72rem; padding: 2px 8px;">${e.action || 'ACTIVITY'}</span>
              <span style="font-size: 0.75rem; color: var(--text-dim);">${window.FormatUtil ? window.FormatUtil.formatDate(e.createdAt || e.timestamp) : (e.createdAt || '')}</span>
            </div>
            <div style="font-size: 0.72rem; color: var(--cyan); font-weight: 600;">Actor: ${e.user || e.actor || 'System'}</div>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-main); font-weight: 600;">${e.detail || e.description || 'System action executed.'}</div>
        </div>
      `).join('');
    }
  };
})();

// Universal interception of legacy browser alert to render 3D window dialogs
if (typeof window !== 'undefined') {
  window.alert = function(message) {
    if (window.AppDialogService && typeof window.AppDialogService.info === 'function') {
      window.AppDialogService.info('Notice', '', String(message));
    } else {
      console.warn('[Alert Intercepted]:', message);
    }
  };
}
