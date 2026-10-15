/**
 * Jasvi Industries ERP - LabelIconEnhancer
 * Centralized Form Label Enhancer matching desktop IconFactory.decorate(label).
 *
 * Automatically inspects form labels and ensures every field caption is
 * accompanied by its corresponding meaningful business icon.
 */
window.LabelIconEnhancer = (function() {
  'use strict';

  function enhanceLabel(label) {
    if (label.dataset.erpLabelEnhanced === 'true') return;
    label.dataset.erpLabelEnhanced = 'true';

    // If label already contains an icon or emoji, skip
    if (label.querySelector('.label-icon') || label.querySelector('span:first-child')) {
      const first = label.querySelector('span:first-child');
      if (first && /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(first.innerText)) {
        return;
      }
    }

    const text = (label.innerText || label.textContent || '').trim();
    if (!text || text.length < 2) return;

    // Check if label has 'for' attribute or input inside
    const forId = label.getAttribute('for') || '';
    const icon = window.UiSemanticRegistry.fieldSemantic(text, forId);

    if (icon) {
      const span = document.createElement('span');
      span.className = 'label-icon';
      span.innerText = icon;
      span.style.cssText = 'margin-right: 6px; font-size: 0.95em; opacity: 0.9;';
      label.insertBefore(span, label.firstChild);
    }
  }

  return {
    enhance(container = document) {
      if (!container) return;
      const labels = container.querySelectorAll('label.form-label, label');
      labels.forEach(lbl => enhanceLabel(lbl));
    }
  };
})();
