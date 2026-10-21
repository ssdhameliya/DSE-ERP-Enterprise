/**
 * Jasvi Industries ERP - DatePickerFormatter (v10.0.38.08)
 * Desktop Parity with org.example.util.DatePickerFormatter & BusinessClock
 * Enforces company.dateFormat strictly across all datepickers and filter inputs.
 *
 * Non-Invasive Architecture:
 * 1. Preserves 100% native DOM structure: No wrapper elements, no DOM node moves,
 *    and no prototype overriding (zero risk of breaking login or form serialization).
 * 2. Underlying DOM Element: Native <input type="date"> retaining standard ISO YYYY-MM-DD
 *    values for 100% compatibility with backend Spring Boot APIs and controller queries.
 * 3. Formatted Badges & Tooltips: Updates parent filter labels with format badges [dd/MM/yyyy]
 *    and live formatted date previews when a date is selected.
 * 4. Re-entrancy & Scope Guarded: Strictly ignores #auth-overlay to guarantee instant login transitions.
 *    Debounced rescan prevents any MutationObserver recursion.
 */
window.DatePickerFormatter = (function() {
  'use strict';

  const ATTACHED_KEY = '__dseDatePickerAttached';
  const activePickers = new Set();
  let isUpdating = false;
  let debounceTimer = null;

  function getActiveFormat() {
    return (window.FormatUtil && window.FormatUtil._dateFormat) || 'dd/MM/yyyy';
  }

  function getFormatPrompt() {
    return getActiveFormat().toLowerCase();
  }

  /**
   * Safely synchronizes tooltip and label badge without mutating the input control
   */
  function syncDisplay(picker) {
    if (!picker || isUpdating) return;
    // Strictly skip login and auth dialogs
    if (picker.closest && picker.closest('#auth-overlay')) return;

    const val = picker.value ? picker.value.trim() : '';
    const fmt = getActiveFormat();
    const prompt = getFormatPrompt();

    picker.setAttribute('placeholder', prompt);

    if (val && window.FormatUtil) {
      const formatted = window.FormatUtil.formatDate(val, fmt);
      picker.title = `Selected: ${formatted} [${fmt}]`;
    } else {
      picker.title = `Format: ${prompt} [${fmt}]`;
    }

    // Update parent filter label badge and preview if present
    updateLabelBadge(picker, fmt, val);
  }

  /**
   * Updates or appends a [dd/MM/yyyy] badge and preview on the parent label
   */
  function updateLabelBadge(picker, fmt, val) {
    const parent = picker.closest && picker.closest('.form-group, .filter-item, .filter-field, .col, div');
    if (!parent || parent.id === 'auth-overlay' || parent.closest('#auth-overlay')) return;

    isUpdating = true;
    try {
      let badge = parent.querySelector('.erp-date-format-badge');
      if (!badge && (picker.id.includes('from') || picker.id.includes('to') || picker.id.includes('date') || picker.classList.contains('filter-date'))) {
        badge = document.createElement('span');
        badge.className = 'erp-date-format-badge';
        badge.style.cssText = 'font-size: 0.65rem; color: var(--text-dim, #94a3b8); margin-left: 4px; font-weight: 500; letter-spacing: 0.02em;';
        const label = parent.querySelector('label, .filter-label');
        if (label && !label.querySelector('.erp-date-format-badge')) {
          label.appendChild(badge);
        }
      }
      if (badge) {
        if (val && window.FormatUtil) {
          const formatted = window.FormatUtil.formatDate(val, fmt);
          badge.textContent = `[${formatted}]`;
          badge.style.color = 'var(--cyan, #06b6d4)';
          badge.style.fontWeight = '600';
          badge.title = `Business formatted: ${formatted}`;
        } else {
          badge.textContent = `[${fmt}]`;
          badge.style.color = 'var(--text-dim, #94a3b8)';
          badge.style.fontWeight = '500';
          badge.title = `Date format setting: ${fmt}`;
        }
      }
    } finally {
      isUpdating = false;
    }
  }

  /**
   * Attaches format listeners to a specific <input type="date">
   */
  function attach(picker) {
    if (!picker || picker.type !== 'date') return picker;
    if (picker.closest && picker.closest('#auth-overlay')) return picker;

    if (picker[ATTACHED_KEY]) {
      syncDisplay(picker);
      return picker;
    }

    picker[ATTACHED_KEY] = true;
    activePickers.add(picker);

    picker.addEventListener('input', () => syncDisplay(picker));
    picker.addEventListener('change', () => {
      syncDisplay(picker);
      try {
        picker.dispatchEvent(new CustomEvent('dse-date-changed', { bubbles: true, detail: { value: picker.value } }));
      } catch (_) {}
    });

    syncDisplay(picker);
    return picker;
  }

  function refresh(picker) {
    if (!picker) return;
    syncDisplay(picker);
  }

  function refreshAll() {
    activePickers.forEach(picker => {
      if (document.body.contains(picker)) {
        syncDisplay(picker);
      } else {
        activePickers.delete(picker);
      }
    });
    attachAll();
  }

  function attachAll(root) {
    const scope = root || document.getElementById('main-content-stage') || document.body;
    if (!scope) return;
    const inputs = scope.querySelectorAll('input[type="date"]');
    inputs.forEach(attach);
  }

  // Debounced observer only targeting main-content-stage, NEVER auth-overlay
  function initObserver() {
    if (typeof MutationObserver === 'undefined') return;
    const target = document.getElementById('main-content-stage');
    if (!target) return;

    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        attachAll(target);
        debounceTimer = null;
      }, 250);
    });

    observer.observe(target, { childList: true, subtree: true });
  }

  // Listen to global date policy updates from FormatUtil
  window.addEventListener('dse-date-policy-changed', () => {
    refreshAll();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attachAll();
      initObserver();
    });
  } else {
    attachAll();
    initObserver();
  }

  return {
    attach,
    attachAll,
    refresh,
    refreshAll,
    syncDisplay,
    getActiveFormat,
    getFormatPrompt
  };
})();
