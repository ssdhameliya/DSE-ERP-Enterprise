/**
 * Jasvi Industries ERP - KpiCardEnhancer
 * Centralized KPI Card presentation engine matching desktop ResponsiveKpiLayoutManager.java.
 *
 * Automatically injects meaningful icons, glowing color badges, and uniform
 * responsive grid structures into all KPI cards across dashboards and registers.
 */
window.KpiCardEnhancer = (function() {
  'use strict';

  function enhanceCard(card) {
    if (card.dataset.erpKpiEnhanced === 'true') return;
    card.dataset.erpKpiEnhanced = 'true';

    const labelEl = card.querySelector('.kpi-label, .dash-kpi-label, h4, h5');
    if (!labelEl) return;

    const labelText = (labelEl.innerText || labelEl.textContent || '').trim();
    const sem = window.UiSemanticRegistry.kpiSemantic(labelText);

    // If an icon is not already present, inject the desktop-parity KPI icon badge
    if (!card.querySelector('.kpi-icon-badge')) {
      const iconBadge = document.createElement('div');
      iconBadge.className = `kpi-icon-badge erp-kpi-theme-${sem.colour}`;
      iconBadge.innerHTML = sem.icon;
      iconBadge.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        font-size: 1.1rem;
        background: ${sem.glow};
        margin-right: 8px;
        box-shadow: 0 0 12px ${sem.glow};
        flex-shrink: 0;
      `;

      // Prepend or place next to label
      if (labelEl.style.display !== 'flex') {
        labelEl.style.display = 'flex';
        labelEl.style.alignItems = 'center';
      }
      labelEl.insertBefore(iconBadge, labelEl.firstChild);
    }
  }

  return {
    enhance(container = document) {
      if (!container) return;
      const cards = container.querySelectorAll('.kpi-card, .dash-kpi-card');
      cards.forEach(card => enhanceCard(card));
    }
  };
})();
