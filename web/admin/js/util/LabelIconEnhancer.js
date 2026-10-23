/**
 * Jasvi Industries ERP - LabelIconEnhancer
 * Centralized Form Label Enhancer matching desktop IconFactory.decorateFieldLabel().
 *
 * Automatically inspects every form label across all views, cards, sidebars, and
 * modal dialogs, and decorates it with a tactile 3D icon badge and 2027 high-contrast
 * neon/cyber themed label styling. Universal fallback ensures 100% label coverage.
 */
window.LabelIconEnhancer = (function() {
  'use strict';

  // Emoji detection regex (covering all unicode emojis and symbols)
  const EMOJI_REGEX = /^[\s]*([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FA6F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]+)/u;

  function enhanceLabel(label) {
    if (!label || label.dataset.erpLabelEnhanced === 'true') return;

    // Skip labels inside tables (e.g. custom table cells), unless explicitly a form-label
    if (label.closest('td') && !label.classList.contains('form-label')) return;

    // If label is purely for a checkbox/switch without field caption
    const directCheck = label.querySelector('input[type="checkbox"], input[type="radio"]');
    const rawText = (label.innerText || label.textContent || '').trim();

    if (!rawText || (rawText.length < 2 && !directCheck)) return;

    // Avoid double enhancement if already contains 3D badge
    if (label.querySelector('.erp-label-icon-badge')) {
      label.dataset.erpLabelEnhanced = 'true';
      return;
    }

    label.dataset.erpLabelEnhanced = 'true';

    const forId = label.getAttribute('for') || '';
    let existingIcon = '';
    let cleanText = rawText;

    // Check if label text starts with an emoji (e.g. from static HTML)
    const match = cleanText.match(EMOJI_REGEX);
    if (match && match[1]) {
      existingIcon = match[1].trim();
      // Remove the emoji from the text node so we don't have duplicate icons
      const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT, null, false);
      let textNode = walker.nextNode();
      while (textNode) {
        if (textNode.nodeValue && EMOJI_REGEX.test(textNode.nodeValue)) {
          textNode.nodeValue = textNode.nodeValue.replace(EMOJI_REGEX, '').trimStart();
          break;
        }
        textNode = walker.nextNode();
      }
      cleanText = (label.innerText || label.textContent || '').trim();
    }

    // Also check if there's an existing legacy .label-icon or plain icon span
    const legacyIconSpan = label.querySelector('.label-icon, .form-icon');
    if (legacyIconSpan) {
      if (!existingIcon) existingIcon = legacyIconSpan.innerText.trim();
      legacyIconSpan.remove();
    }

    // Resolve semantic descriptor (2027 Neon/Cyber Palette & Universal Fallback)
    const desc = window.UiSemanticRegistry && window.UiSemanticRegistry.resolveLabelDescriptor
      ? window.UiSemanticRegistry.resolveLabelDescriptor(cleanText, forId)
      : { icon: '📌', colour: 'neutral', themeClass: 'theme-neutral', labelClass: 'erp-label-themed-neutral' };

    const finalIcon = existingIcon || desc.icon || '📌';

    // Build the 3D Tactile Icon Badge
    const badge = document.createElement('span');
    badge.className = `erp-label-icon-badge ${desc.themeClass}`;
    badge.innerText = finalIcon;
    badge.setAttribute('aria-hidden', 'true');

    // Add theme class to label text
    if (desc.labelClass) {
      label.classList.add(desc.labelClass);
    }

    // Insertion: if label starts with checkbox, place badge after checkbox
    if (directCheck && label.firstChild === directCheck) {
      if (directCheck.nextSibling) {
        label.insertBefore(badge, directCheck.nextSibling);
      } else {
        label.appendChild(badge);
      }
    } else {
      label.insertBefore(badge, label.firstChild);
    }
  }

  return {
    enhance(container = document) {
      if (!container) return;
      const selector = 'label, .form-label, .field-label, .filter-label, .drawer-label, .drawer-field-label, .summary-row span:first-child, .drawer-field-row > span.drawer-field-label';
      const labels = container.querySelectorAll(selector);
      labels.forEach(lbl => enhanceLabel(lbl));
    },

    init() {
      this.enhance(document);

      // Auto-observe dynamic modals, views, tabs, and drawers
      if (window.MutationObserver) {
        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.addedNodes && m.addedNodes.length > 0) {
              m.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                  if (node.matches && (node.matches('label, .drawer-field-label, .form-group, .modal-card, .modal-overlay, .modal, .editor-card, .module-view, .side-drawer, .detail-drawer, form') || node.querySelector('label, .drawer-field-label'))) {
                    this.enhance(node);
                  }
                }
              });
            }
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }
  };
})();

// Auto-run when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.LabelIconEnhancer.init());
} else {
  window.LabelIconEnhancer.init();
}
