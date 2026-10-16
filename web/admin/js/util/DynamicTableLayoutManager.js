/**
 * Jasvi Industries ERP - DynamicTableLayoutManager
 * Single, low-cost width authority for every ERP Table matching desktop
 * DynamicTableLayoutManager.java (CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN parity).
 *
 * Automatically fits every table dynamically to 100% of the viewport width based on
 * column header semantics and weights. Eliminates horizontal scrolling and right-side
 * whitespace gaps across all screens in the application.
 */
window.DynamicTableLayoutManager = (function() {
  'use strict';

  const INSTALLED = 'erpTableDynamicLayoutInstalled';
  const ACTION_CONTROL_MIN_WIDTH = 92.0;
  const ABSOLUTE_MIN_COLUMN = 36.0;
  const MIN_READABLE_COLUMN = 52.0;
  const DENSE_MIN_READABLE_COLUMN = 42.0;

  // Active ResizeObservers and Debouncers
  const tableObservers = new WeakMap();
  const tableDebouncers = new WeakMap();

  // Offscreen canvas context for accurate pixel text measurement (matching desktop Text.getLayoutBounds())
  let measureCanvas = null;
  let measureCtx = null;
  function getMeasureContext() {
    if (!measureCtx) {
      measureCanvas = document.createElement('canvas');
      measureCtx = measureCanvas.getContext('2d');
    }
    return measureCtx;
  }

  function measureTextWidth(text, font = '700 11.5px "Plus Jakarta Sans", sans-serif') {
    if (!text) return 0;
    try {
      const ctx = getMeasureContext();
      ctx.font = font;
      return Math.ceil(ctx.measureText(text).width);
    } catch (e) {
      return (text.length || 0) * 7.5;
    }
  }

  function longestHeaderTokenWidth(heading, font = '700 11px "Plus Jakarta Sans", sans-serif') {
    if (!heading) return 0;
    let max = 0;
    const tokens = heading.trim().split(/\s+/);
    for (const t of tokens) {
      if (t) max = Math.max(max, measureTextWidth(t, font));
    }
    return max;
  }

  /**
   * Normalizes header text for semantic profiling
   */
  function normalizeText(str) {
    if (!str) return '';
    return str.toString().toLowerCase().trim()
      .replace(/&amp;/g, 'and')
      .replace(/&/g, 'and')
      .replace(/₹/g, 'amount')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /**
   * Determines if a column is a leading checkbox or selection column
   */
  function isSelectionColumn(heading, semantic, th) {
    if (semantic === 'select' || semantic === 'check') return true;
    if (th && th.classList.contains('erp-th-checkbox')) return true;
    if (th && th.querySelector('input[type="checkbox"]')) return true;
    const h = (heading || '').toLowerCase();
    return h === '#' || h === 'no.' || h === 'no' || h === 'sr no' || h === 'select' || h === '✓';
  }

  /**
   * Identifies long text columns that should absorb extra available width
   */
  function isLongTextSemantic(semantic, heading) {
    const key = (semantic + ' ' + heading).toLowerCase();
    return key.includes('customer') || key.includes('supplier') || key.includes('description') ||
           key.includes('address') || key.includes('notes') || key.includes('remarks') ||
           key.includes('narration') || key.includes('item') || key.includes('party') ||
           key.includes('name') || key.includes('details') || key.includes('title');
  }

  /**
   * Minimum readable floor width for normal desktop layouts (matching desktop headerMinimum)
   */
  function readableMinimum(semantic, heading, th) {
    const key = (semantic + ' ' + heading).toLowerCase();
    if (isSelectionColumn(heading, semantic, th)) return 38.0;
    if (key.includes('actions') || key.includes('action')) return ACTION_CONTROL_MIN_WIDTH;
    if (isLongTextSemantic(semantic, heading)) return 110.0;
    if (key.includes('invoice') || key.includes('reference') || key.includes('document') ||
        key.includes('order') || key.includes('code') || key.includes('account')) return 96.0;
    if (key.includes('gstin') || key.includes('gst')) return 92.0;
    if (key.includes('status') || key.includes('payment due') || key.includes('return')) return 80.0;
    if (key.includes('amount') || key.includes('balance') || key.includes('paid') ||
        key.includes('pending') || key.includes('total') || key.includes('rate')) return 78.0;
    if (key.includes('mobile') || key.includes('phone') || key.includes('contact')) return 78.0;
    if (key.includes('date') || key.includes('due') || key.includes('time')) return 70.0;
    if (key.includes('email')) return 72.0;
    if (key.includes('qty') || key.includes('quantity') || key.includes('unit')) return 58.0;
    return Math.max(MIN_READABLE_COLUMN, 70.0);
  }

  /**
   * Calculates the true minimum floor so header words NEVER clip or truncate
   * (Exact parity with desktop DynamicTableLayoutManager.headerMinimum)
   */
  function headerMinimum(semantic, heading, th) {
    if (isSelectionColumn(heading, semantic, th)) return 38.0;
    if ((semantic || '').includes('action')) return ACTION_CONTROL_MIN_WIDTH;

    const font = '700 11px "Plus Jakarta Sans", sans-serif';
    const longestToken = longestHeaderTokenWidth(heading, font);
    // Header space: icon (~14px) + gap (~4px) + th padding (10px) + margin/sort (8px) = ~36px
    const iconPadding = 36.0;
    const measuredFloor = longestToken + iconPadding;

    const semFloor = readableMinimum(semantic, heading, th);
    return Math.max(semFloor, measuredFloor);
  }

  /**
   * Dense floor width for narrow screens / open drawers (matching desktop denseFloor)
   */
  function denseFloor(semantic, heading, th) {
    const key = (semantic + ' ' + heading).toLowerCase();
    if (isSelectionColumn(heading, semantic, th)) return 30.0;
    if (key.includes('actions') || key.includes('action')) return 80.0;
    if (isLongTextSemantic(semantic, heading)) return 72.0;
    if (key.includes('status') || key.includes('payment') || key.includes('return')) return 62.0;
    if (key.includes('invoice') || key.includes('document') || key.includes('reference')) return 65.0;
    if (key.includes('gstin')) return 68.0;
    if (key.includes('amount') || key.includes('total') || key.includes('balance') || key.includes('paid')) return 58.0;
    if (key.includes('mobile') || key.includes('phone')) return 62.0;
    if (key.includes('date') || key.includes('due') || key.includes('email')) return 54.0;
    return DENSE_MIN_READABLE_COLUMN;
  }

  /**
   * Flex weight for proportional distribution of extra space (matching desktop flexWeight)
   */
  function flexWeight(semantic, heading) {
    const key = (semantic + ' ' + heading).toLowerCase();
    if (isLongTextSemantic(semantic, heading)) return 3.2; // Primary sponge column
    if (key.includes('email') || key.includes('invoice') || key.includes('reference') ||
        key.includes('document') || key.includes('code') || key.includes('account')) return 1.8;
    if (key.includes('gstin')) return 1.2;
    if (key.includes('amount') || key.includes('paid') || key.includes('pending') ||
        key.includes('total') || key.includes('balance')) return 1.1;
    if (key.includes('actions') || key.includes('select')) return 0.55;
    if (key.includes('date') || key.includes('status') || key.includes('quantity') ||
        key.includes('mobile') || key.includes('tax')) return 0.95;
    return 1.1;
  }

  /**
   * Determines default text alignment for a column
   */
  function columnAlignment(semantic, heading) {
    const key = (semantic + ' ' + heading).toLowerCase();
    if (key.includes('amount') || key.includes('paid') || key.includes('pending') ||
        key.includes('total') || key.includes('balance') || key.includes('rate') ||
        key.includes('price') || key.includes('qty') || key.includes('quantity')) {
      return 'right';
    }
    if (key.includes('actions') || key.includes('action') || key.includes('status') ||
        key.includes('date') || key.includes('due') || key.includes('select') ||
        key.includes('email') || key.includes('#')) {
      return 'center';
    }
    return 'left';
  }

  /**
   * Creates a profile for a column
   */
  function profile(th) {
    const rawHeading = (th.innerText || th.textContent || '').trim();
    const colId = th.id || th.dataset.column || '';
    const sem = window.UiSemanticRegistry ? window.UiSemanticRegistry.headerSemantic(rawHeading, colId) : { colour: 'neutral', label: rawHeading };
    const semantic = sem.semantic || normalizeText(rawHeading);

    const floor = headerMinimum(semantic, rawHeading, th);
    const weight = flexWeight(semantic, rawHeading);
    const align = columnAlignment(semantic, rawHeading);

    return {
      th,
      heading: rawHeading,
      semantic,
      floor,
      weight,
      align
    };
  }

  /**
   * Calculates content viewport width available for the table
   */
  function contentViewportWidth(table) {
    const container = table.parentElement;
    if (!container) return table.clientWidth || 1000;
    
    // Parent container width minus paddings
    const style = window.getComputedStyle(container);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const available = container.clientWidth - paddingLeft - paddingRight;

    return Math.max(available, 100);
  }

  /**
   * Allocates extra width to columns proportionally based on flex weights
   */
  function allocateFromFloors(profiles, available, floorTotal, weightTotal) {
    const widths = new Array(profiles.length);
    const extra = Math.max(0, available - floorTotal);
    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i];
      widths[i] = p.floor + (weightTotal <= 0 ? 0 : (extra * p.weight) / weightTotal);
    }
    return widths;
  }

  /**
   * Proportional dense allocation for narrow viewports (matching desktop allocateDense)
   */
  function allocateDense(profiles, available) {
    const dense = new Array(profiles.length);
    let total = 0;
    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i];
      const floor = denseFloor(p.semantic, p.heading, p.th);
      dense[i] = floor;
      total += floor;
    }

    if (total <= available) {
      const extra = available - total;
      let weights = 0;
      for (const p of profiles) weights += p.weight;
      for (let i = 0; i < dense.length; i++) {
        dense[i] += weights <= 0 ? 0 : (extra * profiles[i].weight) / weights;
      }
      return dense;
    }

    // Extremely narrow viewports: proportionally scale down while protecting Actions
    const scale = Math.max(0.55, available / total);
    let scaledTotal = 0;
    for (let i = 0; i < dense.length; i++) {
      const isAct = profiles[i].semantic.includes('action');
      const isSel = isSelectionColumn(profiles[i].heading, profiles[i].semantic, profiles[i].th);
      const hardFloor = isAct ? 76.0 : isSel ? 28.0 : ABSOLUTE_MIN_COLUMN;
      dense[i] = Math.max(hardFloor, dense[i] * scale);
      scaledTotal += dense[i];
    }

    return dense;
  }

  /**
   * Closes residual pixel rounding difference into the primary flex column or last column
   */
  function closeResidual(widths, available, profiles) {
    if (widths.length === 0) return;
    let used = 0;
    for (let i = 0; i < widths.length; i++) used += widths[i];
    const diff = available - used;
    
    // Give residual to the longest text column if available, else last column
    let targetIdx = widths.length - 1;
    for (let i = 0; i < profiles.length; i++) {
      if (isLongTextSemantic(profiles[i].semantic, profiles[i].heading)) {
        targetIdx = i;
        break;
      }
    }
    widths[targetIdx] = Math.max(ABSOLUTE_MIN_COLUMN, widths[targetIdx] + diff);
  }

  /**
   * Performs the dynamic layout recalculation on a Table element
   */
  function layoutNow(table) {
    if (!table || !table.parentElement) return;
    if (table.closest && table.closest('.sale-workspace-container, #view-sale-create, #view-purchase-creation')) return;
    const thead = table.querySelector('thead');
    if (!thead) return;

    const ths = Array.from(thead.querySelectorAll('tr:last-child > th'));
    if (ths.length === 0) return;

    const available = contentViewportWidth(table);
    if (!Number.isFinite(available) || available < 150) return;

    const lastWidth = parseFloat(table.dataset.lastLayoutWidth) || 0;
    const currentCols = table.querySelectorAll('colgroup > col').length;
    if (Math.abs(available - lastWidth) < 2 && currentCols === ths.length) {
      return;
    }
    table.dataset.lastLayoutWidth = available;

    // Enforce fixed layout on table & hide container horizontal scroll for desktop
    table.style.tableLayout = 'fixed';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    // Profile columns
    const profiles = ths.map(th => profile(th));
    let floorTotal = 0;
    let weightTotal = 0;
    for (const p of profiles) {
      floorTotal += p.floor;
      weightTotal += p.weight;
    }

    const effectiveAvailable = Math.max(available, floorTotal);
    table.style.minWidth = floorTotal > available ? (floorTotal + 'px') : '100%';

    // Allocate widths
    const widths = allocateFromFloors(profiles, effectiveAvailable, floorTotal, weightTotal);
    closeResidual(widths, effectiveAvailable, profiles);

    // Ensure <colgroup> exists for fast native layout
    let colgroup = table.querySelector('colgroup');
    if (!colgroup) {
      colgroup = document.createElement('colgroup');
      table.insertBefore(colgroup, table.firstChild);
    }

    // Match <col> tags to columns count
    while (colgroup.children.length < ths.length) {
      colgroup.appendChild(document.createElement('col'));
    }
    while (colgroup.children.length > ths.length) {
      colgroup.removeChild(colgroup.lastChild);
    }

    const cols = Array.from(colgroup.children);

    for (let i = 0; i < ths.length; i++) {
      const w = Math.round(widths[i] * 10) / 10;
      const pct = ((w / effectiveAvailable) * 100).toFixed(2) + '%';
      const p = profiles[i];

      // Set width on <col> tag
      cols[i].style.width = pct;

      // Set width, min-width, max-width on <th>
      p.th.style.width = pct;
      p.th.style.minWidth = Math.round(p.floor) + 'px';
      p.th.style.maxWidth = 'none';
      p.th.style.overflow = 'visible';
      p.th.style.textOverflow = 'clip';
      p.th.style.whiteSpace = 'normal'; // Allow clean multi-line word wrapping on word boundaries
      p.th.style.wordBreak = 'normal';
      p.th.style.overflowWrap = 'normal';
      p.th.style.lineHeight = '1.25';
      p.th.style.verticalAlign = 'middle';
      if (p.align && !p.th.style.textAlign) {
        p.th.style.textAlign = p.align;
      }

      // Ensure inner badge wraps without clipping and aligns with column
      const badge = p.th.querySelector('.erp-th-badge');
      if (badge) {
        badge.style.whiteSpace = 'normal';
        badge.style.wordBreak = 'normal';
        badge.style.lineHeight = '1.25';
        badge.style.display = 'inline-flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = p.align === 'right' ? 'flex-end' : p.align === 'center' ? 'center' : 'flex-start';
      }
    }

    // Apply ellipsis and native tooltips to visible data cells in tbody
    const tbody = table.querySelector('tbody');
    if (tbody) {
      const rows = tbody.querySelectorAll('tr:not(.empty-row)');
      rows.forEach(row => {
        const cells = row.children;
        for (let i = 0; i < cells.length && i < profiles.length; i++) {
          const td = cells[i];
          const p = profiles[i];
          td.style.overflow = 'hidden';
          td.style.textOverflow = 'ellipsis';
          td.style.whiteSpace = 'nowrap';
          td.style.verticalAlign = 'middle';
          if (p.align && !td.style.textAlign) {
            td.style.textAlign = p.align;
          }
          // Native tooltip if cell text is long and doesn't have child inputs/buttons
          if (!td.title && !td.querySelector('button, input, select, a')) {
            const txt = td.innerText.trim();
            if (txt.length > 10) td.title = txt;
          }
        }
      });
    }
  }

  return {
    /**
     * Installs dynamic auto-fit width authority on a TableView element
     */
    install(table) {
      if (!table || table.nodeType !== 1) return;
      if (table.closest && table.closest('.sale-workspace-container, #view-sale-create, #view-purchase-creation')) return;
      if (table.dataset[INSTALLED] === 'true') {
        return;
      }
      table.dataset[INSTALLED] = 'true';

      // Initial layout pass
      layoutNow(table);

      // Attach ResizeObserver to the scroll container or table parent
      const container = table.parentElement;
      if (container && window.ResizeObserver) {
        if (!tableObservers.has(container)) {
          let lastContainerW = container.clientWidth;
          const ro = new ResizeObserver((entries) => {
            const entry = entries && entries[0];
            const currentW = entry ? entry.contentRect.width : container.clientWidth;
            if (Math.abs(currentW - lastContainerW) < 12) return;
            lastContainerW = currentW;

            let debouncer = tableDebouncers.get(table);
            if (debouncer) clearTimeout(debouncer);
            debouncer = setTimeout(() => {
              layoutNow(table);
            }, 100);
            tableDebouncers.set(table, debouncer);
          });
          ro.observe(container);
          tableObservers.set(container, ro);
        }
      }
    },

    /**
     * Schedules a coalesced layout calculation
     */
    requestLayout(table) {
      if (!table) return;
      let debouncer = tableDebouncers.get(table);
      if (debouncer) clearTimeout(debouncer);
      debouncer = setTimeout(() => {
        layoutNow(table);
      }, 20);
      tableDebouncers.set(table, debouncer);
    },

    /**
     * Reflows all installed tables below a root container
     */
    requestLayoutIn(root = document) {
      if (!root) return;
      const tables = root.querySelectorAll('table.sales-desktop-table, table.data-table, table.erp-table, .sales-table-scroll table, .data-panel table');
      tables.forEach(tbl => {
        if (tbl.dataset[INSTALLED] === 'true') {
          layoutNow(tbl);
        } else {
          this.install(tbl);
        }
      });
    },

    /**
     * Installs layout authority on all tables within a container
     */
    installAll(container = document) {
      if (!container) return;
      const tables = container.querySelectorAll('table.sales-desktop-table, table.data-table, table.erp-table, .sales-table-scroll table, .data-panel table');
      tables.forEach(tbl => this.install(tbl));
    }
  };
})();
