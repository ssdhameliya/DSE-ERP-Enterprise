/**
 * Jasvi Industries ERP - DatePickerFormatter
 * Desktop Parity with org.example.util.DatePickerFormatter & BusinessClock
 * Enforces company.dateFormat across all date pickers and filter inputs.
 */
window.DatePickerFormatter = (function() {
  'use strict';

  const ATTACHED_KEY = 'dseDatePickerAttached';
  const activePickers = new Set();

  function getActiveFormat() {
    return (window.FormatUtil && window.FormatUtil._dateFormat) || 'dd/MM/yyyy';
  }

  function getFormatPrompt() {
    return getActiveFormat().toLowerCase();
  }

  function attach(picker) {
    if (!picker || picker[ATTACHED_KEY]) return picker;
    picker[ATTACHED_KEY] = true;
    activePickers.add(picker);

    refresh(picker);

    picker.addEventListener('focus', () => refresh(picker));
    picker.addEventListener('change', () => {
      refresh(picker);
      try {
        picker.dispatchEvent(new CustomEvent('dse-date-changed', { bubbles: true, detail: { value: picker.value } }));
      } catch (_) {}
    });

    return picker;
  }

  function refresh(picker) {
    if (!picker) return;
    const fmt = getActiveFormat();
    const prompt = getFormatPrompt();

    picker.setAttribute('placeholder', prompt);
    picker.title = `Business Date Format: ${fmt} (Current setting)`;

    // If wrapped in a filter group with a label, attach or update format badge
    const parent = picker.closest('.form-group, .filter-item, .filter-field, .col, div');
    if (parent) {
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
        badge.textContent = `[${fmt}]`;
      }
    }
  }

  function refreshAll() {
    activePickers.forEach(picker => {
      if (document.body.contains(picker)) {
        refresh(picker);
      } else {
        activePickers.delete(picker);
      }
    });
    // Scan for any newly rendered date inputs
    attachAll();
  }

  function attachAll() {
    const inputs = document.querySelectorAll('input[type="date"]');
    inputs.forEach(attach);
  }

  // Setup observer for dynamic modal and drawer datepickers
  function initObserver() {
    if (typeof MutationObserver !== 'undefined' && document.body) {
      const observer = new MutationObserver(() => {
        attachAll();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
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
    getActiveFormat,
    getFormatPrompt
  };
})();
