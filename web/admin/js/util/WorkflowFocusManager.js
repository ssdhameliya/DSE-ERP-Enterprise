/**
 * Jasvi Industries ERP - WorkflowFocusManager
 * Central business-order focus sequence and keyboard navigation matching desktop
 * WorkflowFocusManager.java.
 *
 * Provides:
 * 1. Universal auto-select on focus (rapid one-stroke typing without backspace).
 * 2. Sequential Enter-key tabbing through bookkeeping inputs in natural row order.
 * 3. High-visibility cursor outlines (.erp-input-active-focused).
 */
window.WorkflowFocusManager = (function() {
  'use strict';

  const FOCUS_INSTALLED = 'erpWorkflowFocusInstalled';
  const ACTIVE_FOCUS_CLASS = 'erp-input-active-focused';

  /**
   * Checks if an element is an interactive input candidate for focus chain
   */
  function isFocusable(el) {
    if (!el || el.disabled || el.readOnly || el.offsetParent === null) return false;
    const tag = el.tagName;
    if (tag === 'INPUT') {
      const type = (el.type || 'text').toLowerCase();
      return !['hidden', 'checkbox', 'radio', 'button', 'submit', 'reset', 'file'].includes(type);
    }
    if (tag === 'SELECT') return true;
    if (tag === 'TEXTAREA') return false; // Enter creates newlines in textareas
    return false;
  }

  /**
   * Attaches universal auto-select on focus and active focus highlight
   */
  function attachFocusHighlightAndSelect(input) {
    if (input.dataset.erpFocusDecorated === 'true') return;
    input.dataset.erpFocusDecorated = 'true';

    input.addEventListener('focus', function() {
      input.classList.add(ACTIVE_FOCUS_CLASS);
      // Auto-select text for instant one-stroke overwrite (desktop selectAllOnFocus)
      if (typeof input.select === 'function' && input.tagName === 'INPUT') {
        const type = (input.type || 'text').toLowerCase();
        if (['text', 'number', 'search', 'tel', 'email'].includes(type)) {
          setTimeout(() => {
            try { input.select(); } catch (_) {}
          }, 30);
        }
      }
    });

    input.addEventListener('blur', function() {
      input.classList.remove(ACTIVE_FOCUS_CLASS);
    });
  }

  /**
   * Advances focus to the next logical input within a container or form
   */
  function advanceFocus(currentInput, container) {
    const root = container || currentInput.closest('.modal-body, .modal-card, .workspace-stage, .module-view, form') || document.body;
    const allInputs = Array.from(root.querySelectorAll('input:not([type=hidden]), select, textarea, button.btn-primary'))
      .filter(el => !el.disabled && el.offsetParent !== null && el.tabIndex !== -1);

    const idx = allInputs.indexOf(currentInput);
    if (idx !== -1 && idx < allInputs.length - 1) {
      const next = allInputs[idx + 1];
      if (next) {
        next.focus();
        if (typeof next.select === 'function' && next.tagName === 'INPUT') {
          setTimeout(() => { try { next.select(); } catch (_) {} }, 30);
        }
      }
    } else {
      // If on the last input, trigger primary action button if available
      const submitBtn = root.querySelector('button.btn-primary:not([disabled]), button[type="submit"]:not([disabled])');
      if (submitBtn && submitBtn !== currentInput) {
        submitBtn.focus();
      }
    }
  }

  /**
   * Installs sequential Enter-key navigation on inputs
   */
  function installEnterNavigation(input, container) {
    if (input.dataset[FOCUS_INSTALLED] === 'true') return;
    input.dataset[FOCUS_INSTALLED] = 'true';

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        // Dropdown select: let Enter select highlighted option if open
        if (input.tagName === 'SELECT') return;

        // Skip if target is inside an autocomplete list or dropdown
        if (input.classList.contains('autocomplete-active') || input.dataset.dropdownOpen === 'true') {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        advanceFocus(input, container);
      }
    });
  }

  return {
    /**
     * Auto-enhances all form inputs within a container matching desktop autoEnhanceScreen()
     */
    autoEnhanceScreen(root = document) {
      if (!root) return;
      const inputs = root.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select');
      inputs.forEach(input => {
        attachFocusHighlightAndSelect(input);
        installEnterNavigation(input, root);
      });
    },

    /**
     * Focuses a specific element with optional text selection
     */
    focus(el) {
      if (!el) return;
      setTimeout(() => {
        el.focus();
        if (typeof el.select === 'function' && el.tagName === 'INPUT') {
          try { el.select(); } catch (_) {}
        }
      }, 50);
    }
  };
})();
