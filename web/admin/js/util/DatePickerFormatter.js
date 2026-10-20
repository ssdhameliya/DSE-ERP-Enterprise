/**
 * Jasvi Industries ERP - DatePickerFormatter
 * Desktop Parity with org.example.util.DatePickerFormatter & BusinessClock
 * Enforces company.dateFormat strictly across all datepickers and filter inputs.
 *
 * Implements a Dual-Layer Formatted DatePicker Engine:
 * 1. Underlying DOM Element: Native <input type="date"> retaining standard ISO YYYY-MM-DD
 *    values for 100% compatibility with backend Spring Boot APIs and controller queries.
 * 2. Visual Presentation Layer: Synchronized formatted overlay (.dse-datepicker-display)
 *    displaying the date strictly formatted according to FormatUtil._dateFormat (e.g. dd/MM/yyyy).
 * 3. Dynamic Real-Time Updates: Listens to 'dse-date-policy-changed' and refreshes all active
 *    pickers across all 38+ screens instantly when Settings -> Company Profile date format is modified.
 * 4. Value Interception: Intercepts programmatic .value assignments so setting input.value = '...'
 *    immediately updates the visual overlay.
 */
window.DatePickerFormatter = (function() {
  'use strict';

  const ATTACHED_KEY = '__dseDatePickerAttached';
  const activePickers = new Set();
  const originalValueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  function getActiveFormat() {
    return (window.FormatUtil && window.FormatUtil._dateFormat) || 'dd/MM/yyyy';
  }

  function getFormatPrompt() {
    return getActiveFormat().toLowerCase();
  }

  /**
   * Synchronizes the visible formatted text overlay with the input's current ISO value
   */
  function syncDisplay(picker) {
    if (!picker) return;
    const wrap = picker.closest('.dse-datepicker-wrap');
    if (!wrap) return;

    let display = wrap.querySelector('.dse-datepicker-display');
    if (!display) {
      display = document.createElement('span');
      display.className = 'dse-datepicker-display';
      wrap.appendChild(display);
    }

    const val = picker.value ? picker.value.trim() : '';
    const fmt = getActiveFormat();
    const prompt = getFormatPrompt();

    if (val && window.FormatUtil) {
      const formatted = window.FormatUtil.formatDate(val, fmt);
      display.textContent = formatted;
      display.classList.remove('is-empty');
      display.title = `${formatted} (Business Format: ${fmt})`;
    } else {
      display.textContent = prompt;
      display.classList.add('is-empty');
      display.title = `Expected format: ${prompt}`;
    }

    picker.title = val && window.FormatUtil
      ? `Date: ${window.FormatUtil.formatDate(val, fmt)} [${fmt}]`
      : `Select date [${fmt}]`;

    // Update parent filter label badge if present
    updateLabelBadge(picker, fmt);
  }

  /**
   * Updates or appends a [dd/MM/yyyy] badge on the parent label
   */
  function updateLabelBadge(picker, fmt) {
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

  /**
   * Attaches the formatted display engine to a specific <input type="date">
   */
  function attach(picker) {
    if (!picker || picker.type !== 'date') return picker;

    // If already attached, simply sync and return
    if (picker[ATTACHED_KEY]) {
      syncDisplay(picker);
      return picker;
    }

    picker[ATTACHED_KEY] = true;
    activePickers.add(picker);

    // 1. Wrap in .dse-datepicker-wrap if not already wrapped
    let wrap = picker.parentElement;
    if (!wrap || !wrap.classList.contains('dse-datepicker-wrap')) {
      wrap = document.createElement('div');
      wrap.className = 'dse-datepicker-wrap';

      // Preserve sizing styles from original input
      if (picker.style.width) {
        wrap.style.width = picker.style.width;
      }
      if (picker.style.minWidth) {
        wrap.style.minWidth = picker.style.minWidth;
      }
      if (picker.style.maxWidth) {
        wrap.style.maxWidth = picker.style.maxWidth;
      }
      if (picker.style.flex) {
        wrap.style.flex = picker.style.flex;
      }
      if (picker.style.margin) {
        wrap.style.margin = picker.style.margin;
      }
      if (picker.classList.contains('form-input-sm')) {
        wrap.classList.add('is-sm');
      }

      picker.parentNode.insertBefore(wrap, picker);
      wrap.appendChild(picker);
    }

    // 2. Create formatted text display overlay
    let display = wrap.querySelector('.dse-datepicker-display');
    if (!display) {
      display = document.createElement('span');
      display.className = 'dse-datepicker-display';
      wrap.appendChild(display);
    }

    // 3. Intercept .value property to catch programmatic assignments like picker.value = '...'
    try {
      Object.defineProperty(picker, 'value', {
        get() {
          return originalValueDescriptor.get.call(this);
        },
        set(newVal) {
          originalValueDescriptor.set.call(this, newVal);
          syncDisplay(this);
        },
        configurable: true
      });
    } catch (_) {}

    // 4. Listen to native events
    picker.addEventListener('input', () => syncDisplay(picker));
    picker.addEventListener('change', () => {
      syncDisplay(picker);
      try {
        picker.dispatchEvent(new CustomEvent('dse-date-changed', { bubbles: true, detail: { value: picker.value } }));
      } catch (_) {}
    });

    // 5. Open native calendar picker on click
    picker.addEventListener('click', (e) => {
      if (!picker.disabled && !picker.readOnly && typeof picker.showPicker === 'function') {
        try {
          // If click was not directly on the native indicator (left portion of input)
          const rect = picker.getBoundingClientRect();
          if (e.clientX < rect.right - 28) {
            picker.showPicker();
          }
        } catch (_) {}
      }
    });

    // Initial display sync
    syncDisplay(picker);

    return picker;
  }

  /**
   * Refreshes all active datepickers
   */
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
    // Scan for any newly rendered date inputs
    attachAll();
  }

  function attachAll() {
    const inputs = document.querySelectorAll('input[type="date"]');
    inputs.forEach(attach);
  }

  // Setup MutationObserver for dynamic modal and drawer datepickers
  function initObserver() {
    if (typeof MutationObserver !== 'undefined' && document.body) {
      const observer = new MutationObserver((mutations) => {
        let shouldScan = false;
        for (let i = 0; i < mutations.length; i++) {
          if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
            shouldScan = true;
            break;
          }
        }
        if (shouldScan) {
          attachAll();
        }
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
    syncDisplay,
    getActiveFormat,
    getFormatPrompt
  };
})();
