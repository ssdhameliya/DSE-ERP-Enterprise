/**
 * Jasvi Industries ERP - ButtonIconEnhancer
 * Universal Action Button Enhancer matching desktop UiActionIcons.java & UiDesignSystem.java.
 *
 * Automatically inspects all buttons across views, toolbars, and modal dialogs,
 * assigning deterministic 3D icons, graphic gap (7px), left alignment, and
 * canonical color role identities based on action semantics.
 */
window.ButtonIconEnhancer = (function() {
  'use strict';

  // Emoji regex to detect existing icons
  const EMOJI_REGEX = /^[\s]*([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FA6F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}✨✏️🗑️💾🖨️📊✉️💬↻🧹💳📜🔍⚡✓✕«‹›»📄🏷️📌]+)/u;

  // Semantic Action Dictionary matching desktop UiActionIcons.java
  function resolveButtonAction(text, id, classes) {
    const combined = `${text} ${id} ${classes}`.toLowerCase().trim();

    if (/(\+|add|new|create)(\s|$)/.test(combined) && !/category|user|lookup/.test(text)) {
      return { icon: '✨', role: 'role-add' };
    }
    if (/(\+|add|new|create)/.test(combined)) {
      return { icon: '✨', role: 'role-add' };
    }
    if (/save|submit|apply(\s|$)/.test(combined)) {
      return { icon: '💾', role: 'role-save' };
    }
    if (/edit|modify|rename/.test(combined)) {
      return { icon: '✏️', role: 'role-edit' };
    }
    if (/delete|void|remove|destroy|deactivate/.test(combined)) {
      return { icon: '🗑️', role: 'role-delete' };
    }
    if (/cancel|close|dismiss/.test(combined)) {
      return { icon: '✕', role: 'role-cancel' };
    }
    if (/approve/.test(combined)) {
      return { icon: '✓', role: 'role-primary' };
    }
    if (/reject/.test(combined)) {
      return { icon: '✕', role: 'role-danger' };
    }
    if (/excel|export|csv/.test(combined)) {
      return { icon: '📊', role: 'role-excel' };
    }
    if (/print|pdf/.test(combined)) {
      return { icon: '🖨️', role: 'role-print' };
    }
    if (/whatsapp/.test(combined)) {
      return { icon: '💬', role: 'role-whatsapp' };
    }
    if (/email|send\s*mail/.test(combined)) {
      return { icon: '✉️', role: 'role-email' };
    }
    if (/payment|pay\s*supplier|refund|collect/.test(combined)) {
      return { icon: '💳', role: 'role-payment' };
    }
    if (/refresh|rescan|reload/.test(combined)) {
      return { icon: '↻', role: 'role-refresh' };
    }
    if (/reset|clear|cleanup/.test(combined)) {
      return { icon: '🧹', role: 'role-reset' };
    }
    if (/audit|history|trail/.test(combined)) {
      return { icon: '📜', role: 'role-secondary' };
    }
    if (/search|filter/.test(combined)) {
      return { icon: '🔍', role: 'role-refresh' };
    }
    if (/convert/.test(combined)) {
      return { icon: '⚡', role: 'role-primary' };
    }
    if (/next|forward|›/.test(combined)) {
      return { icon: '›', role: 'role-secondary' };
    }
    if (/prev|previous|back|←|‹/.test(combined)) {
      return { icon: '‹', role: 'role-secondary' };
    }

    // Default neutral action
    return { icon: '⚡', role: 'role-secondary' };
  }

  function enhanceButton(btn) {
    if (!btn || btn.dataset.erpBtnEnhanced === 'true') return;

    // Skip special elements: modal close '×', pagination controls, pure icon buttons, and navigation tabs
    if (
      btn.classList.contains('modal-close') ||
      btn.classList.contains('modal-close-btn') ||
      btn.classList.contains('erp-pagination-btn') ||
      btn.classList.contains('settings-tab-btn') ||
      btn.classList.contains('register-tab-btn') ||
      btn.classList.contains('tab-btn') ||
      btn.classList.contains('workspace-tab') ||
      btn.classList.contains('gstr1-subtab-btn') ||
      btn.classList.contains('btn-preset-chip') ||
      btn.classList.contains('filter-chip-btn') ||
      (btn.closest && btn.closest('.settings-tab-nav, .register-tab-bar, .workspace-tabs-container'))
    ) {
      btn.dataset.erpBtnEnhanced = 'true';
      return;
    }

    const rawText = (btn.innerText || btn.textContent || '').trim();
    if (!rawText || rawText === '×' || rawText === '✕') {
      btn.dataset.erpBtnEnhanced = 'true';
      return;
    }

    btn.dataset.erpBtnEnhanced = 'true';

    // Helper to clean literal artifacts like :::, ⋮, ▾, ⚡, dots
    const cleanArtifacts = (str) => str.replace(/[:\.\u22ee\u25bc\u25be\u26a1]+/g, '').trim();

    // Clean literal artifacts from the button's direct text nodes
    const walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT, null, false);
    let tNode = walker.nextNode();
    while (tNode) {
      if (tNode.nodeValue && /[:\.\u22ee\u25bc\u25be\u26a1]/.test(tNode.nodeValue)) {
        tNode.nodeValue = cleanArtifacts(tNode.nodeValue);
      }
      tNode = walker.nextNode();
    }

    let existingIcon = '';
    let cleanText = (btn.innerText || btn.textContent || '').trim();

    // Check if button text already starts with an emoji or symbol
    const match = cleanText.match(EMOJI_REGEX);
    if (match && match[1]) {
      existingIcon = match[1].trim();
      const textWalker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT, null, false);
      let textNode = textWalker.nextNode();
      while (textNode) {
        if (textNode.nodeValue && EMOJI_REGEX.test(textNode.nodeValue)) {
          textNode.nodeValue = textNode.nodeValue.replace(EMOJI_REGEX, '').trimStart();
          break;
        }
        textNode = textWalker.nextNode();
      }
      cleanText = (btn.innerText || btn.textContent || '').trim();
    }

    // Also check if button has a child icon element
    const childIcon = btn.querySelector('.btn-icon, .icon, i.fa, span:first-child');
    if (childIcon && !existingIcon) {
      const iconText = childIcon.innerText.trim();
      if (iconText && EMOJI_REGEX.test(iconText)) {
        existingIcon = iconText;
        childIcon.remove();
      }
    }

    // Action button special handling
    const isTableActionBtn = /actions/i.test(cleanText) || btn.classList.contains('btn-purple');
    let action = resolveButtonAction(cleanText, btn.id || '', btn.className || '');
    if (isTableActionBtn) {
      action = { icon: '⚙️', role: 'role-secondary' };
      btn.classList.add('btn-purple');
    }

    const finalIcon = existingIcon || action.icon;

    // Apply 3D button class and role
    btn.classList.add('btn-action-3d');
    if (action.role) {
      btn.classList.add(action.role);
    }

    // Inject 3D Icon Span if not present
    if (!btn.querySelector('.btn-3d-icon')) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'btn-3d-icon';
      iconSpan.innerText = finalIcon;
      iconSpan.setAttribute('aria-hidden', 'true');
      btn.insertBefore(iconSpan, btn.firstChild);
    }
  }

  return {
    enhance(container = document) {
      if (!container) return;
      const buttons = container.querySelectorAll('button:not(.modal-close):not(.erp-pagination-btn), a.btn:not(.erp-pagination-btn)');
      buttons.forEach(btn => enhanceButton(btn));
    },

    init() {
      this.enhance(document);

      // Auto-observe dynamic modals, drawers, and views
      if (window.MutationObserver) {
        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.addedNodes && m.addedNodes.length > 0) {
              m.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                  if (node.matches && (node.matches('button, .modal-card, .modal-overlay, .editor-card, .module-view, form, .view-actions') || node.querySelector('button'))) {
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
  document.addEventListener('DOMContentLoaded', () => window.ButtonIconEnhancer.init());
} else {
  window.ButtonIconEnhancer.init();
}
