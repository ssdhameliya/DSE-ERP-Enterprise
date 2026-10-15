/**
 * Jasvi Industries ERP - GlobalUiEnhancer
 * Master UI Enhancement Coordinator matching desktop ProfessionalUiEnhancer.walk()
 * and SharedUiFramework.install().
 *
 * Automatically monitors page transitions, view loads, and dynamic AJAX/DOM
 * updates, running TableUiEnhancer, KpiCardEnhancer, and LabelIconEnhancer
 * globally without requiring screen-by-screen code changes.
 */
window.GlobalUiEnhancer = (function() {
  'use strict';

  let debounceTimer = null;
  let observer = null;

  function runEnhancements(container) {
    const root = container || document.getElementById('main-content-stage') || document.body;
    if (!root) return;

    if (window.TableUiEnhancer) {
      window.TableUiEnhancer.enhanceAll(root);
    }
    if (window.KpiCardEnhancer) {
      window.KpiCardEnhancer.enhance(root);
    }
    if (window.LabelIconEnhancer) {
      window.LabelIconEnhancer.enhance(root);
    }
  }

  function scheduleEnhancement(container) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runEnhancements(container);
      debounceTimer = null;
    }, 40);
  }

  function installObserver() {
    const target = document.getElementById('main-content-stage') || document.body;
    if (!target || observer) return;

    observer = new MutationObserver((mutations) => {
      let shouldEnhance = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          shouldEnhance = true;
          break;
        }
      }
      if (shouldEnhance) {
        scheduleEnhancement(target);
      }
    });

    observer.observe(target, {
      childList: true,
      subtree: true
    });
  }

  return {
    init() {
      runEnhancements(document.body);
      installObserver();
    },

    enhance(container) {
      scheduleEnhancement(container);
    }
  };
})();
