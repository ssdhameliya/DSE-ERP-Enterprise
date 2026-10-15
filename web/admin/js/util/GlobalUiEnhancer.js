/**
 * Jasvi Industries ERP - GlobalUiEnhancer
 * Master UI Enhancement Coordinator matching desktop ProfessionalUiEnhancer.walk()
 * and SharedUiFramework.install().
 *
 * Automatically monitors page transitions, view loads, and dynamic AJAX/DOM
 * updates, running TableUiEnhancer, KpiCardEnhancer, and LabelIconEnhancer
 * globally without recursion or mutation cascades.
 */
window.GlobalUiEnhancer = (function() {
  'use strict';

  let debounceTimer = null;
  let observer = null;
  let isEnhancing = false;

  function runEnhancements(container) {
    if (isEnhancing) return;
    isEnhancing = true;
    try {
      const root = container || document.getElementById('main-content-stage') || document.body;
      if (!root) return;

      if (window.TableUiEnhancer) {
        window.TableUiEnhancer.enhanceAll(root);
      }
      if (window.DynamicTableLayoutManager) {
        window.DynamicTableLayoutManager.installAll(root);
      }
      if (window.KpiCardEnhancer) {
        window.KpiCardEnhancer.enhance(root);
      }
      if (window.LabelIconEnhancer) {
        window.LabelIconEnhancer.enhance(root);
      }
      if (window.WorkflowFocusManager) {
        window.WorkflowFocusManager.autoEnhanceScreen(root);
      }
    } finally {
      // Allow DOM mutations to settle before accepting new observation triggers
      setTimeout(() => {
        isEnhancing = false;
      }, 80);
    }
  }

  function scheduleEnhancement(container) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runEnhancements(container);
      debounceTimer = null;
    }, 60);
  }

  function installObserver() {
    const target = document.getElementById('main-content-stage') || document.body;
    if (!target || observer) return;

    observer = new MutationObserver((mutations) => {
      if (isEnhancing) return;
      let shouldEnhance = false;
      for (const m of mutations) {
        if (!m.addedNodes || m.addedNodes.length === 0) continue;
        for (let i = 0; i < m.addedNodes.length; i++) {
          const n = m.addedNodes[i];
          if (n.nodeType === 1) {
            // Ignore internal enhancement nodes
            if (
              n.classList && (
                n.classList.contains('erp-th-badge') ||
                n.classList.contains('erp-th-icon') ||
                n.classList.contains('label-icon') ||
                n.classList.contains('kpi-icon-wrap') ||
                n.classList.contains('erp-cell-status-badge')
              )
            ) {
              continue;
            }
            shouldEnhance = true;
            break;
          }
        }
        if (shouldEnhance) break;
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

      // Window resize listener to reflow all tables dynamically
      window.addEventListener('resize', () => {
        if (window.DynamicTableLayoutManager) {
          window.DynamicTableLayoutManager.requestLayoutIn(document.body);
        }
      });
    },

    enhance(container) {
      scheduleEnhancement(container);
    }
  };
})();
