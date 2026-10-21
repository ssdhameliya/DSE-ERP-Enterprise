/**
 * Jasvi Industries ERP - DatePickerFormatter (v10.0.38.11)
 * Desktop Parity with org.example.util.DatePickerFormatter & BusinessClock
 * Enforces company.dateFormat strictly inside datepickers directly matching Desktop.
 *
 * Architecture:
 * 1. Desktop Parity: Formats date values (e.g. '21 Apr 2026') directly INSIDE the datepicker
 *    box, matching JavaFX DatePicker StringConverter behavior.
 * 2. Clean Header Labels: Never appends format badges to top parent labels.
 * 3. Underlying ISO Contract: Retains standard ISO YYYY-MM-DD on <input type="date">
 *    for 100% compatibility with backend Spring Boot APIs and controller queries.
 * 4. Reactive Property Hooking: Intercepts value property setter to keep in-field display
 *    synchronized in real time during preset filtering (Today, 30 Days, This FY).
 * 5. Re-entrancy & Scope Guarded: Strictly ignores #auth-overlay.
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
   * Synchronizes the in-field formatted date overlay
   */
  function syncDisplay(picker) {
    if (!picker || isUpdating) return;
    if (picker.closest && picker.closest('#auth-overlay')) return;

    const val = picker.value ? picker.value.trim() : '';
    const fmt = getActiveFormat();
    const prompt = getFormatPrompt();

    picker.setAttribute('placeholder', prompt);

    const wrapper = picker.parentElement;
    if (wrapper && wrapper.classList.contains('erp-date-field-container')) {
      const display = wrapper.querySelector('.erp-date-display-val');
      if (display) {
        if (val && window.FormatUtil) {
          const formatted = window.FormatUtil.formatDate(val, fmt);
          display.textContent = formatted;
          display.style.display = 'block';
          picker.classList.add('erp-date-value-present');
          picker.title = `Selected: ${formatted} [${fmt}]`;
        } else {
          display.textContent = '';
          display.style.display = 'none';
          picker.classList.remove('erp-date-value-present');
          picker.title = `Format: ${prompt} [${fmt}]`;
        }
      }
    }
  }

  /**
   * Wraps picker in field container and attaches display overlay and listeners
   */
  function attach(picker) {
    if (!picker || picker.type !== 'date') return picker;
    if (picker.closest && picker.closest('#auth-overlay')) return picker;

    // Wrap in .erp-date-field-container if not already wrapped
    let wrapper = picker.parentElement;
    if (!wrapper || !wrapper.classList.contains('erp-date-field-container')) {
      wrapper = document.createElement('div');
      wrapper.className = 'erp-date-field-container';
      if (picker.style.width) wrapper.style.width = picker.style.width;
      if (picker.classList.contains('form-input-sm')) wrapper.classList.add('form-input-sm');
      if (picker.parentNode) {
        picker.parentNode.insertBefore(wrapper, picker);
        wrapper.appendChild(picker);
      }
    }

    // Add display text overlay
    let display = wrapper.querySelector('.erp-date-display-val');
    if (!display) {
      display = document.createElement('span');
      display.className = 'erp-date-display-val';
      wrapper.appendChild(display);
    }

    if (picker[ATTACHED_KEY]) {
      syncDisplay(picker);
      return picker;
    }

    picker[ATTACHED_KEY] = true;
    activePickers.add(picker);

    // Clicking anywhere on the wrapper opens the calendar picker
    wrapper.addEventListener('click', (e) => {
      if (e.target !== picker) {
        try {
          if (typeof picker.showPicker === 'function') {
            picker.showPicker();
          } else {
            picker.focus();
          }
        } catch (_) {
          picker.focus();
        }
      }
    });

    picker.addEventListener('input', () => syncDisplay(picker));
    picker.addEventListener('change', () => {
      syncDisplay(picker);
      try {
        picker.dispatchEvent(new CustomEvent('dse-date-changed', { bubbles: true, detail: { value: picker.value } }));
      } catch (_) {}
    });

    // Intercept .value setter for reactive programmatic updates
    if (!picker._dseValHooked) {
      picker._dseValHooked = true;
      const proto = HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) {
        Object.defineProperty(picker, 'value', {
          get() {
            return desc.get.call(this);
          },
          set(v) {
            desc.set.call(this, v);
            syncDisplay(this);
          },
          configurable: true
        });
      }
    }

    syncDisplay(picker);
    return picker;
  }

  function refresh(picker) {
    if (!picker) return;
    syncDisplay(picker);
  }

  function refreshAll() {
    // Clean up any legacy top label badges if present
    document.querySelectorAll('.erp-date-format-badge').forEach(b => b.remove());

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
    // Remove any legacy top label badges from DOM
    document.querySelectorAll('.erp-date-format-badge').forEach(b => b.remove());

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

    const observer = new MutationObserver((mutations) => {
      let hasDateInput = false;
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.addedNodes && m.addedNodes.length > 0) {
          for (let j = 0; j < m.addedNodes.length; j++) {
            const n = m.addedNodes[j];
            if (n.nodeType === 1) {
              if (n.matches && n.matches('.erp-date-field-container')) continue;
              if ((n.matches && n.matches('input[type="date"]')) || (n.querySelector && n.querySelector('input[type="date"]'))) {
                hasDateInput = true;
                break;
              }
            }
          }
        }
        if (hasDateInput) break;
      }
      if (!hasDateInput) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        attachAll(target);
        debounceTimer = null;
      }, 150);
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
