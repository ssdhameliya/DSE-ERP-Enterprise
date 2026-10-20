/**
 * Jasvi Industries ERP - KpiCardEnhancer
 * Centralized Modern Compact KPI Card Presentation Engine (Pillar 4 - 58px Height).
 *
 * Automatically transforms tall, bulky 160px KPI cards across dashboards and registers
 * into high-density, modern 58px horizontal metric ribbons saving over 100px of vertical space.
 *
 * Preserves all live element IDs so controller updates (controller.refresh(), applyKpis())
 * update the live numbers seamlessly.
 */
window.KpiCardEnhancer = (function() {
  'use strict';

  function extractSemanticTheme(labelText) {
    const text = (labelText || '').toLowerCase();
    if (text.includes('sale') || text.includes('approved') || text.includes('paid') || text.includes('active sale') || text.includes('cash')) {
      return { theme: 'theme-emerald', color: '#10b981', icon: '🛒' };
    }
    if (text.includes('invoice') || text.includes('document') || text.includes('month') || text.includes('bill')) {
      return { theme: 'theme-blue', color: '#38bdf8', icon: '📄' };
    }
    if (text.includes('overdue') || text.includes('pending') || text.includes('payable') || text.includes('alert') || text.includes('low stock')) {
      return { theme: 'theme-amber', color: '#f59e0b', icon: '⚠️' };
    }
    if (text.includes('collection') || text.includes('received') || text.includes('bank') || text.includes('net cash')) {
      return { theme: 'theme-teal', color: '#14b8a6', icon: '💳' };
    }
    if (text.includes('return') || text.includes('refund') || text.includes('unpaid') || text.includes('action')) {
      return { theme: 'theme-rose', color: '#f43f5e', icon: '⏰' };
    }
    return { theme: 'theme-purple', color: '#a855f7', icon: '📊' };
  }

  function enhanceCard(card) {
    if (card.dataset.erpKpiCompactEnhanced === 'true') return;
    card.dataset.erpKpiCompactEnhanced = 'true';

    // 1. Find Title / Label
    const labelEl = card.querySelector('.kpi-label, .dash-kpi-title, .dash-kpi-label, h4, h5');
    const labelText = labelEl ? (labelEl.innerText || labelEl.textContent || '').replace(/[^\w\s₹\-\+]/g, '').trim() : 'Metric';

    // 2. Find Value Element & ID
    const valEl = card.querySelector('.kpi-value, .dash-kpi-val, .kpi-val, [id*="kpi"], [id*="dash"]');
    const valueId = valEl && valEl.id ? valEl.id : '';
    const valueText = valEl ? (valEl.innerText || valEl.textContent || '₹ 0.00').trim() : '0';

    // 3. Find Badge / Subtext / Count
    const badgeEl = card.querySelector('.dash-kpi-badge, .kpi-badge, .badge');
    const badgeText = badgeEl ? badgeEl.innerText.trim() : '';

    const subEl = card.querySelector('.dash-kpi-sub, .kpi-sub, .kpi-footer');
    const subText = subEl ? subEl.innerText.trim() : '';

    // Determine semantic styling
    const sem = extractSemanticTheme(labelText);

    // Apply compact card styles
    card.classList.add('compact-kpi-card', sem.theme);
    card.style.display = 'flex';
    card.style.flexDirection = 'row';
    card.style.alignItems = 'center';
    card.style.height = '58px';
    card.style.minHeight = '58px';
    card.style.maxHeight = '58px';
    card.style.boxSizing = 'border-box';
    card.style.overflow = 'hidden';
    card.style.padding = '8px 12px 8px 10px';

    // Construct micro badge pill
    let pillText = badgeText;
    if (!pillText && subText) {
      if (subText.toLowerCase().includes('healthy')) pillText = 'Healthy';
      else if (subText.toLowerCase().includes('open') || subText.toLowerCase().includes('active')) pillText = 'Active';
      else if (subText.length <= 14) pillText = subText;
      else pillText = 'Live';
    }
    const pillHtml = pillText ? `<span class="kpi-pill-badge">${pillText}</span>` : '';

    // Reconstruct modern 2-row compact layout while preserving live value ID
    card.innerHTML = `
      <div class="kpi-icon-bubble" style="width:38px;height:38px;min-width:38px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${sem.icon}</div>
      <div class="kpi-content-box" style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;overflow:hidden;">
        <div class="kpi-row-top" style="display:flex;justify-content:space-between;align-items:center;line-height:1;margin-bottom:3px;gap:4px;">
          <span class="kpi-title-text" title="${labelText}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${labelText}</span>
          ${pillHtml}
        </div>
        <div class="kpi-val-text" ${valueId ? `id="${valueId}"` : ''} style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${valueText}</div>
      </div>
    `;

    // Interactive drill-down filtering
    card.addEventListener('click', function() {
      const container = card.closest('.view-container, .module-view, main');
      if (!container) return;

      const filterSelect = container.querySelector('select.filter-select, select.form-select, select[id*="filter"]');
      if (!filterSelect) return;

      const lower = labelText.toLowerCase();
      let matchedOpt = null;
      Array.from(filterSelect.options).forEach(opt => {
        const oText = opt.text.toLowerCase();
        if ((lower.includes('overdue') || lower.includes('pending')) && (oText.includes('overdue') || oText.includes('pending') || oText.includes('unpaid'))) {
          matchedOpt = opt;
        } else if ((lower.includes('approved') || lower.includes('paid')) && (oText.includes('paid') || oText.includes('approved'))) {
          matchedOpt = opt;
        } else if (lower.includes('active') && oText.includes('active')) {
          matchedOpt = opt;
        }
      });

      if (matchedOpt) {
        filterSelect.value = matchedOpt.value;
        filterSelect.dispatchEvent(new Event('change', { bubbles: true }));
        if (window.AudioSynthesizer) window.AudioSynthesizer.playNav();
      }
    });
  }

  function enhanceGrid(grid) {
    if (!grid) return;
    grid.classList.add('compact-kpi-ribbon');
    const cards = grid.querySelectorAll('.kpi-card, .dash-kpi-card, .dash-kpi-card.clickable-kpi');
    cards.forEach(card => enhanceCard(card));
  }

  return {
    enhance(container = document) {
      if (!container) return;
      const grids = container.querySelectorAll('.kpi-grid, .dash-kpi-row-6, .kpi-row');
      grids.forEach(grid => enhanceGrid(grid));

      // Also enhance individual ungridded cards if any
      const orphanCards = container.querySelectorAll('.kpi-card:not([data-erp-kpi-compact-enhanced]), .dash-kpi-card:not([data-erp-kpi-compact-enhanced])');
      orphanCards.forEach(c => enhanceCard(c));
    }
  };
})();
