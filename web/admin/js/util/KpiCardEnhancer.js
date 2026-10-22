/**
 * Jasvi Industries ERP - KpiCardEnhancer
 * Desktop Parity Dynamic Single-Row KPI Engine matching ResponsiveKpiLayoutManager.java,
 * UiSemanticRegistry.java, and dark-theme.css / light-theme.css.
 *
 * Key Pillars:
 * 1. Single-Panel Never-Wrap Authority: All KPI cards strictly stay in ONE horizontal row,
 *    even when a screen has 8 cards (e.g. Bank Statement) or when side drawer opens.
 * 2. 58px Desktop Compact Ribbon Height: Standardized across all 38 screens.
 * 3. Usable-Width Dynamic Density: Auto-selects Normal (>225px), Compact (170-225px),
 *    or Dense (<170px or 7-8 cards) dynamically via ResizeObserver.
 * 4. Unique Colorful Icons & Color Family Parity matching Desktop semantic registry.
 */
window.KpiCardEnhancer = (function() {
  'use strict';

  // Desktop Semantic Vocabulary & Unique Color Family Mapping
  const SEMANTIC_MAP = {
    // Sales / Revenue (Emerald Green)
    'active sales':       { theme: 'theme-emerald', color: '#10b981', icon: '🛒' },
    'sales':              { theme: 'theme-emerald', color: '#10b981', icon: '🛒' },
    'today sales':        { theme: 'theme-emerald', color: '#10b981', icon: '🛍️' },
    'todays sales':       { theme: 'theme-emerald', color: '#10b981', icon: '🛍️' },
    'total sales':        { theme: 'theme-emerald', color: '#10b981', icon: '🛒' },
    'gross revenue':      { theme: 'theme-emerald', color: '#10b981', icon: '📈' },
    'gross profit':       { theme: 'theme-emerald', color: '#10b981', icon: '💰' },
    'operating revenue':  { theme: 'theme-emerald', color: '#10b981', icon: '📈' },
    'net profit':         { theme: 'theme-emerald', color: '#10b981', icon: '💰' },
    'total assets':       { theme: 'theme-emerald', color: '#10b981', icon: '💼' },
    'conversion rate':    { theme: 'theme-emerald', color: '#10b981', icon: '📈' },
    'matched':            { theme: 'theme-emerald', color: '#10b981', icon: '✅' },
    'total credits':      { theme: 'theme-emerald', color: '#10b981', icon: '📈' },
    'credits':            { theme: 'theme-emerald', color: '#10b981', icon: '📈' },
    'active':             { theme: 'theme-emerald', color: '#10b981', icon: '✅' },
    'active accounts':    { theme: 'theme-emerald', color: '#10b981', icon: '✅' },
    'active users':       { theme: 'theme-emerald', color: '#10b981', icon: '✅' },
    'active vendors':     { theme: 'theme-emerald', color: '#10b981', icon: '✅' },
    'in stock':           { theme: 'theme-emerald', color: '#10b981', icon: '✅' },
    'valid rows':         { theme: 'theme-emerald', color: '#10b981', icon: '✅' },
    'barcode enabled':    { theme: 'theme-emerald', color: '#10b981', icon: '✔' },
    'approved':           { theme: 'theme-emerald', color: '#10b981', icon: '✅' },
    'approved returns':   { theme: 'theme-emerald', color: '#10b981', icon: '✅' },
    'accepted quotations':{ theme: 'theme-emerald', color: '#10b981', icon: '✅' },
    '3 way match rate':   { theme: 'theme-emerald', color: '#10b981', icon: '🤝' },
    'identity mfa':       { theme: 'theme-emerald', color: '#10b981', icon: '🛡️' },

    // Purchases / Documents / Inward (Indigo)
    'active purchases':   { theme: 'theme-indigo', color: '#6366f1', icon: '📦' },
    'purchases':          { theme: 'theme-indigo', color: '#6366f1', icon: '📦' },
    'purchase':           { theme: 'theme-indigo', color: '#6366f1', icon: '📦' },
    'total orders':       { theme: 'theme-indigo', color: '#6366f1', icon: '📋' },
    'total purchases':    { theme: 'theme-indigo', color: '#6366f1', icon: '📦' },
    'purchase documents': { theme: 'theme-indigo', color: '#6366f1', icon: '📑' },
    'quotations':         { theme: 'theme-indigo', color: '#6366f1', icon: '📝' },
    'total quotations':   { theme: 'theme-indigo', color: '#6366f1', icon: '📝' },
    'open quotations':    { theme: 'theme-indigo', color: '#6366f1', icon: '📝' },
    'catalog items':      { theme: 'theme-indigo', color: '#6366f1', icon: '📦' },
    'replenishment':      { theme: 'theme-indigo', color: '#6366f1', icon: '📦' },
    'latest backup':      { theme: 'theme-indigo', color: '#6366f1', icon: '⏱️' },
    'total suppliers':    { theme: 'theme-indigo', color: '#6366f1', icon: '🏭' },

    // Receivables / Reminders / Alerts / Categories (Amber / Orange)
    'receivables':        { theme: 'theme-amber', color: '#f59e0b', icon: '⏳' },
    'pending receivables':{ theme: 'theme-amber', color: '#f59e0b', icon: '⏳' },
    'open reminders':     { theme: 'theme-amber', color: '#f59e0b', icon: '⏰' },
    'due today':          { theme: 'theme-amber', color: '#f59e0b', icon: '📅' },
    'pending':            { theme: 'theme-amber', color: '#f59e0b', icon: '⏳' },
    'pending approval':   { theme: 'theme-amber', color: '#f59e0b', icon: '⏳' },
    'pending quotations': { theme: 'theme-amber', color: '#f59e0b', icon: '⏳' },
    'pending returns':    { theme: 'theme-amber', color: '#f59e0b', icon: '⏳' },
    'suggested':          { theme: 'theme-amber', color: '#f59e0b', icon: '💡' },
    'low stock':          { theme: 'theme-amber', color: '#f59e0b', icon: '⚠️' },
    'categories':         { theme: 'theme-amber', color: '#f59e0b', icon: '📁' },
    'gst registered':     { theme: 'theme-amber', color: '#f59e0b', icon: '🏷️' },
    'active rules':       { theme: 'theme-amber', color: '#f59e0b', icon: '⚡' },
    'reorder alerts':     { theme: 'theme-amber', color: '#f59e0b', icon: '🔔' },
    '31 60 days':         { theme: 'theme-amber', color: '#f59e0b', icon: '🟡' },
    '61 90 days':         { theme: 'theme-amber', color: '#f59e0b', icon: '🟠' },

    // Payables / Overdue / Errors / Critical (Crimson Red)
    'payables':           { theme: 'theme-crimson', color: '#ef4444', icon: '💳' },
    'total payables':     { theme: 'theme-crimson', color: '#ef4444', icon: '💳' },
    'outstanding payable':{ theme: 'theme-crimson', color: '#ef4444', icon: '💳' },
    'overdue':            { theme: 'theme-crimson', color: '#ef4444', icon: '⚠️' },
    'overdue receivables':{ theme: 'theme-crimson', color: '#ef4444', icon: '⚠️' },
    'unmatched':          { theme: 'theme-crimson', color: '#ef4444', icon: '❌' },
    'total debits':       { theme: 'theme-crimson', color: '#ef4444', icon: '📉' },
    'debits':             { theme: 'theme-crimson', color: '#ef4444', icon: '📉' },
    'out of stock':       { theme: 'theme-crimson', color: '#ef4444', icon: '❌' },
    'locked accounts':    { theme: 'theme-crimson', color: '#ef4444', icon: '🔒' },
    'failures':           { theme: 'theme-crimson', color: '#ef4444', icon: '❌' },
    'failed':             { theme: 'theme-crimson', color: '#ef4444', icon: '❌' },
    'errors':             { theme: 'theme-crimson', color: '#ef4444', icon: '❌' },
    'errors blocked':     { theme: 'theme-crimson', color: '#ef4444', icon: '❌' },
    'discrepant bills':   { theme: 'theme-crimson', color: '#ef4444', icon: '⚠️' },
    'discrepancies':      { theme: 'theme-crimson', color: '#ef4444', icon: '⚠️' },
    'total liabilities':  { theme: 'theme-crimson', color: '#ef4444', icon: '⚠️' },
    'over 90 days':       { theme: 'theme-crimson', color: '#ef4444', icon: '🔴' },

    // Liquid Cash / Reconciliation / Settlements (Teal)
    'cash position':      { theme: 'theme-teal', color: '#14b8a6', icon: '💼' },
    'cash':               { theme: 'theme-teal', color: '#14b8a6', icon: '💼' },
    'reconciled':         { theme: 'theme-teal', color: '#14b8a6', icon: '⚖️' },
    'total paid':         { theme: 'theme-teal', color: '#14b8a6', icon: '💳' },
    'last payment':       { theme: 'theme-teal', color: '#14b8a6', icon: '💳' },
    'refunded amount':    { theme: 'theme-teal', color: '#14b8a6', icon: '💸' },
    'net cash flow':      { theme: 'theme-teal', color: '#14b8a6', icon: '💼' },
    'available backups':  { theme: 'theme-teal', color: '#14b8a6', icon: '🗄️' },

    // Returns / Schedules / Roles / Expenses (Purple)
    'returns':            { theme: 'theme-purple', color: '#a855f7', icon: '🔄' },
    'total returns':      { theme: 'theme-purple', color: '#a855f7', icon: '🔄' },
    'expenses':           { theme: 'theme-purple', color: '#a855f7', icon: '💸' },
    'total expenses':     { theme: 'theme-purple', color: '#a855f7', icon: '💸' },
    'roles':              { theme: 'theme-purple', color: '#a855f7', icon: '🛡️' },
    'system roles':       { theme: 'theme-purple', color: '#a855f7', icon: '🛡️' },
    'due in 7 days':      { theme: 'theme-purple', color: '#a855f7', icon: '🗓️' },
    'next 7 days':        { theme: 'theme-purple', color: '#a855f7', icon: '🗓️' },
    'next run':           { theme: 'theme-purple', color: '#a855f7', icon: '🗓️' },
    'active schedules':   { theme: 'theme-purple', color: '#a855f7', icon: '🔄' },
    'reports this month': { theme: 'theme-purple', color: '#a855f7', icon: '📊' },
    'retention':          { theme: 'theme-purple', color: '#a855f7', icon: '🛡️' },
    'selected copies':    { theme: 'theme-purple', color: '#a855f7', icon: '🖨️' },

    // Customers / Invoices / Directory / Ledger (Sky Blue)
    'total transactions': { theme: 'theme-blue', color: '#38bdf8', icon: '📑' },
    'total records':      { theme: 'theme-blue', color: '#38bdf8', icon: '📑' },
    'total customers':    { theme: 'theme-blue', color: '#38bdf8', icon: '👥' },
    'customers':          { theme: 'theme-blue', color: '#38bdf8', icon: '👥' },
    'total items':        { theme: 'theme-blue', color: '#38bdf8', icon: '🏷️' },
    'total users':        { theme: 'theme-blue', color: '#38bdf8', icon: '👤' },
    'total system users': { theme: 'theme-blue', color: '#38bdf8', icon: '👤' },
    'active consignments':{ theme: 'theme-blue', color: '#38bdf8', icon: '🚛' },
    'total dispatches':   { theme: 'theme-blue', color: '#38bdf8', icon: '📤' },
    'label format':       { theme: 'theme-blue', color: '#38bdf8', icon: '📄' },
    'database size':      { theme: 'theme-blue', color: '#38bdf8', icon: '💾' },
    'average return':     { theme: 'theme-blue', color: '#38bdf8', icon: '📊' },
    'average value':      { theme: 'theme-blue', color: '#38bdf8', icon: '📊' },

    // Communications / Activity / Gateway (Cyan)
    'email sent':         { theme: 'theme-cyan', color: '#06b6d4', icon: '✉️' },
    'login activity':     { theme: 'theme-cyan', color: '#06b6d4', icon: '📜' },
    'total e way bills':  { theme: 'theme-cyan', color: '#06b6d4', icon: '🚚' },
    'channel split':      { theme: 'theme-cyan', color: '#06b6d4', icon: '📱' }
  };

  function normalizeText(str) {
    if (!str) return '';
    return str.toString().toLowerCase().trim()
      .replace(/&amp;/g, 'and')
      .replace(/&/g, 'and')
      .replace(/₹/g, 'amount')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function extractSemanticTheme(labelText, cardEl) {
    const norm = normalizeText(labelText);

    // 1. Direct exact or substring match in SEMANTIC_MAP
    for (const [key, val] of Object.entries(SEMANTIC_MAP)) {
      if (norm === key || norm.includes(key)) {
        return val;
      }
    }

    // 2. Check existing CSS classes on card (e.g. kpi-blue, kpi-red, kpi-green from FXML parity)
    if (cardEl) {
      const cls = cardEl.className || '';
      if (cls.includes('kpi-blue'))   return { theme: 'theme-blue', color: '#38bdf8', icon: '📑' };
      if (cls.includes('kpi-red'))    return { theme: 'theme-crimson', color: '#ef4444', icon: '❌' };
      if (cls.includes('kpi-orange')) return { theme: 'theme-amber', color: '#f59e0b', icon: '💡' };
      if (cls.includes('kpi-green'))  return { theme: 'theme-emerald', color: '#10b981', icon: '✅' };
      if (cls.includes('kpi-purple')) return { theme: 'theme-purple', color: '#a855f7', icon: '💸' };
      if (cls.includes('kpi-teal'))   return { theme: 'theme-teal', color: '#14b8a6', icon: '⚖️' };
      if (cls.includes('kpi-cyan'))   return { theme: 'theme-cyan', color: '#06b6d4', icon: '📜' };
    }

    // 3. Fallback semantic categorization based on vocabulary keywords
    if (norm.includes('sale') || norm.includes('revenue') || norm.includes('credit') || norm.includes('gain')) {
      return { theme: 'theme-emerald', color: '#10b981', icon: '🛒' };
    }
    if (norm.includes('purchase') || norm.includes('order') || norm.includes('stock') || norm.includes('item')) {
      return { theme: 'theme-indigo', color: '#6366f1', icon: '📦' };
    }
    if (norm.includes('unmatched') || norm.includes('fail') || norm.includes('error') || norm.includes('debit') || norm.includes('lock')) {
      return { theme: 'theme-crimson', color: '#ef4444', icon: '⚠️' };
    }
    if (norm.includes('pending') || norm.includes('due') || norm.includes('suggest') || norm.includes('alert')) {
      return { theme: 'theme-amber', color: '#f59e0b', icon: '⏳' };
    }
    if (norm.includes('cash') || norm.includes('bank') || norm.includes('reconcil') || norm.includes('settle')) {
      return { theme: 'theme-teal', color: '#14b8a6', icon: '💼' };
    }
    if (norm.includes('return') || norm.includes('role') || norm.includes('expense') || norm.includes('schedule')) {
      return { theme: 'theme-purple', color: '#a855f7', icon: '🔄' };
    }
    return { theme: 'theme-blue', color: '#38bdf8', icon: '📊' };
  }

  function enhanceCard(card) {
    if (card.dataset.erpKpiCompactEnhanced === 'true') return;
    card.dataset.erpKpiCompactEnhanced = 'true';

    if (card.classList.contains('compact-kpi-card') && card.querySelector('.kpi-content-box')) {
      // Already has native compact ribbon structure; preserve markup to avoid layout jump on refresh
      return;
    }

    // 1. Find Title / Label across all screen variations (Bank Statement, User Access, Registers, Dashboards)
    const labelEl = card.querySelector(
      '.kpi-label, .dash-kpi-title, .dash-kpi-label, .bank-recon-kpi-caption, .metric-title, .metric-label, .kpi-caption, .caption, h3, h4, h5, .title'
    );
    let labelText = labelEl ? (labelEl.innerText || labelEl.textContent || '').replace(/[^\w\s₹\-\+%]/g, '').trim() : '';
    if (!labelText || labelText.toLowerCase() === 'metric') {
      // Try finding any descriptive span or label inside header
      const headerSpan = card.querySelector('.kpi-header span, .card-header span, span:first-child');
      if (headerSpan) {
        const text = (headerSpan.innerText || headerSpan.textContent || '').replace(/[^\w\s₹\-\+%]/g, '').trim();
        if (text && text.length > 2 && text.toLowerCase() !== 'metric') labelText = text;
      }
    }
    if (!labelText) labelText = 'Metric';

    // 2. Find Value Element & ID
    const valEl = card.querySelector(
      '.kpi-value, .dash-kpi-val, .kpi-val, .bank-recon-kpi-value, .metric-value, [id*="kpi"], [id*="dash"], [id*="lbl"], [id*="val"]'
    );
    const valueId = valEl && valEl.id ? valEl.id : '';
    const valueText = valEl ? (valEl.innerText || valEl.textContent || '0').trim() : '0';

    // 3. Find Badge / Subtext / Note
    const badgeEl = card.querySelector('.dash-kpi-badge, .kpi-badge, .badge, .pill-badge');
    const badgeText = badgeEl ? badgeEl.innerText.trim() : '';

    const subEl = card.querySelector('.dash-kpi-sub, .kpi-sub, .kpi-footer, .bank-recon-kpi-note, .metric-note, .kpi-meta');
    const subText = subEl ? subEl.innerText.trim() : '';

    // Determine semantic styling (icon, colors, glow)
    const sem = extractSemanticTheme(labelText, card);

    // Apply compact card styles
    card.classList.add('compact-kpi-card', sem.theme);
    card.style.display = 'flex';
    card.style.flexDirection = 'row';
    card.style.alignItems = 'center';
    card.style.flex = '1 1 0';
    card.style.minWidth = '0';
    card.style.maxWidth = '100%';
    card.style.height = '58px';
    card.style.minHeight = '58px';
    card.style.maxHeight = '58px';
    card.style.boxSizing = 'border-box';
    card.style.overflow = 'hidden';
    card.setAttribute('title', `${labelText}: ${valueText}${subText ? ' (' + subText + ')' : ''}`);

    // Construct micro badge pill
    let pillText = badgeText;
    if (!pillText && subText) {
      if (subText.toLowerCase().includes('healthy')) pillText = 'Healthy';
      else if (subText.toLowerCase().includes('open') || subText.toLowerCase().includes('active')) pillText = 'Active';
      else if (subText.toLowerCase().includes('reconciled')) pillText = 'Reconciled';
      else if (subText.length <= 12) pillText = subText;
    }
    const pillHtml = pillText ? `<span class="kpi-pill-badge">${pillText}</span>` : '';

    // Reconstruct modern 2-row compact layout while strictly preserving live value ID
    card.innerHTML = `
      <div class="kpi-icon-bubble">${sem.icon}</div>
      <div class="kpi-content-box" style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;overflow:hidden;">
        <div class="kpi-row-top" style="display:flex;justify-content:space-between;align-items:center;line-height:1;margin-bottom:3px;gap:4px;">
          <span class="kpi-title-text" title="${labelText}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${labelText}</span>
          ${pillHtml}
        </div>
        <div class="kpi-val-text" ${valueId ? `id="${valueId}"` : ''} title="${valueText}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${valueText}</div>
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

  /**
   * Rebalances a KPI container matching Desktop ResponsiveKpiLayoutManager.java:
   * Cards ALWAYS stay in ONE row; density is calculated dynamically from real
   * usable width per card.
   */
  function rebalanceContainer(grid) {
    if (!grid) return;
    const cards = grid.querySelectorAll('.compact-kpi-card, .kpi-card, .dash-kpi-card, .standard-kpi-card, .bank-recon-kpi, .user-kpi, .metric-card, .approved-card');
    const count = cards.length;
    if (count === 0) return;

    // Enforce Desktop single-row geometry
    grid.classList.add('compact-kpi-ribbon', 'erp-kpi-single-row');
    grid.style.display = 'flex';
    grid.style.flexDirection = 'row';
    grid.style.flexWrap = 'nowrap';
    grid.style.alignItems = 'stretch';
    grid.style.gridTemplateColumns = 'none';
    grid.style.gap = count >= 7 ? '6px' : '8px';
    grid.style.width = '100%';
    grid.style.boxSizing = 'border-box';
    grid.style.overflow = 'hidden';

    // Usable width calculation (Desktop usableWidth(Pane))
    const width = grid.clientWidth || (grid.parentElement ? grid.parentElement.clientWidth : 1200);
    const gap = count >= 7 ? 6 : 8;
    const perCard = Math.max(0, (width - Math.max(0, count - 1) * gap) / count);

    // Apply Desktop density thresholds
    grid.classList.remove('erp-kpi-density-normal', 'erp-kpi-density-compact', 'erp-kpi-density-dense');
    if (perCard < 170 || count >= 7) {
      grid.classList.add('erp-kpi-density-dense');
    } else if (perCard < 225 || count >= 5) {
      grid.classList.add('erp-kpi-density-compact');
    } else {
      grid.classList.add('erp-kpi-density-normal');
    }

    // Flexible card constraints - proportional expansion across full container
    cards.forEach(card => {
      card.style.flex = '1 1 0';
      card.style.minWidth = '0';
      card.style.maxWidth = 'none';
      card.style.width = 'auto';
      card.style.height = '58px';
      card.style.minHeight = '58px';
      card.style.maxHeight = '58px';
    });
  }

  function enhanceGrid(grid) {
    if (!grid) return;
    const cards = grid.querySelectorAll('.kpi-card, .dash-kpi-card, .dash-kpi-card.clickable-kpi, .standard-kpi-card, .bank-recon-kpi, .user-kpi, .metric-card, .approved-card');
    cards.forEach(card => enhanceCard(card));
    rebalanceContainer(grid);

    // Attach ResizeObserver to auto-rebalance on window resize or side drawer toggle
    if (window.ResizeObserver && !grid._kpiResizeObsInstalled) {
      grid._kpiResizeObsInstalled = true;
      try {
        const obs = new ResizeObserver(() => {
          rebalanceContainer(grid);
        });
        obs.observe(grid);
        if (grid.parentElement) obs.observe(grid.parentElement);
      } catch (e) {}
    }
  }

  return {
    enhance(container = document) {
      if (!container) return;
      const grids = container.querySelectorAll(
        '.kpi-grid, .dash-kpi-row-6, .kpi-row, .bank-recon-kpi-panel, .standard-kpi-row, .entity-kpi-row, .return-kpi-row, .quotation-metric-row, .recon-metric-row, .sales-metric-row, .audit-kpi-section, .master-kpi-row, .erp-kpi-section'
      );
      grids.forEach(grid => enhanceGrid(grid));

      // Also enhance individual ungridded cards if any
      const orphanCards = container.querySelectorAll(
        '.kpi-card:not([data-erp-kpi-compact-enhanced]), .dash-kpi-card:not([data-erp-kpi-compact-enhanced]), .standard-kpi-card:not([data-erp-kpi-compact-enhanced]), .bank-recon-kpi:not([data-erp-kpi-compact-enhanced]), .user-kpi:not([data-erp-kpi-compact-enhanced])'
      );
      orphanCards.forEach(c => enhanceCard(c));
    },

    rebalanceAll() {
      const grids = document.querySelectorAll('.compact-kpi-ribbon, .kpi-grid, .dash-kpi-row-6, .erp-kpi-section');
      grids.forEach(g => rebalanceContainer(g));
    }
  };
})();
