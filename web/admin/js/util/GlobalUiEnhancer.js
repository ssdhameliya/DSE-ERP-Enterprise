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
    if (observer) {
      try { observer.disconnect(); } catch (e) {}
    }
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
      // Allow DOM mutations to settle before reconnecting observer
      setTimeout(() => {
        isEnhancing = false;
        if (observer) {
          const target = document.getElementById('main-content-stage') || document.body;
          try {
            observer.observe(target, { childList: true, subtree: true });
          } catch (e) {}
        }
      }, 150);
    }
  }

  function scheduleEnhancement(container) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runEnhancements(container);
      debounceTimer = null;
    }, 120);
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
            const tag = n.tagName;
            // Strictly ignore internal table elements, cols, options, badges, and inputs
            if (tag === 'COL' || tag === 'COLGROUP' || tag === 'TBODY' || tag === 'THEAD' || tag === 'TR' || tag === 'TD' || tag === 'OPTION') {
              continue;
            }
            if (
              n.classList && (
                n.classList.contains('erp-th-badge') ||
                n.classList.contains('erp-th-icon') ||
                n.classList.contains('label-icon') ||
                n.classList.contains('kpi-icon-wrap') ||
                n.classList.contains('kpi-icon-badge') ||
                n.classList.contains('erp-master-checkbox') ||
                n.classList.contains('erp-input-active-focused') ||
                n.classList.contains('erp-cell-status-badge') ||
                n.classList.contains('charges-summary-pill')
              )
            ) {
              continue;
            }
            if (n.dataset && (n.dataset.erpHeaderEnhanced || n.dataset.erpKpiEnhanced || n.dataset.erpLabelEnhanced)) {
              continue;
            }
            // Strictly ignore any nodes inside an active editor workspace
            if (n.closest && (n.closest('.sale-workspace-container') || n.closest('#view-sale-create') || n.closest('#view-purchase-creation'))) {
              continue;
            }
            // Only trigger if an entire new view or significant panel is injected
            if (
              n.classList && (
                n.classList.contains('module-view') ||
                n.classList.contains('kpi-grid') ||
                n.classList.contains('data-panel') ||
                n.classList.contains('modal-card')
              )
            ) {
              shouldEnhance = true;
              break;
            }
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
