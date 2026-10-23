/**
 * Jasvi Industries ERP - PaginationUiEnhancer
 * Universal Modern 2027 Futuristic Glassmorphic Pagination Engine.
 *
 * Provides a standardized, high-contrast, tactile 2027 pagination strip
 * across all 34 table views in the application, ensuring uniform aesthetics,
 * neon cyan active glow states, record counter badges, and responsive controls.
 */
window.PaginationUiEnhancer = (function() {
  'use strict';

  /**
   * Builds the HTML for the 2027 Modern Pagination Strip
   */
  function buildPaginationHtml(opts) {
    const page = Math.max(1, opts.page || 1);
    const totalPages = Math.max(1, opts.totalPages || 1);
    const totalRecords = Math.max(0, opts.totalRecords || 0);
    const pageSize = opts.pageSize || 25;
    const startRecord = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
    const endRecord = Math.min(totalRecords, page * pageSize);

    // Calculate visible page buttons (window of 5 around current)
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, page + 2);
    if (endPage - startPage < 4) {
      if (startPage === 1) endPage = Math.min(totalPages, startPage + 4);
      else if (endPage === totalPages) startPage = Math.max(1, endPage - 4);
    }

    let pageBtnsHtml = '';
    for (let p = startPage; p <= endPage; p++) {
      const isActive = p === page;
      pageBtnsHtml += `
        <button type="button" class="erp-pagination-btn ${isActive ? 'active' : ''}" data-page="${p}" title="Page ${p}">
          ${p}
        </button>
      `;
    }

    return `
      <div class="erp-pagination-bar-2027">
        <div class="erp-pagination-info-badge">
          <span>🌟</span>
          <span>Showing ${startRecord}–${endRecord} of ${totalRecords.toLocaleString()} records</span>
        </div>

        <div class="erp-pagination-controls">
          <button type="button" class="erp-pagination-btn" data-action="first" title="First Page" ${page <= 1 ? 'disabled' : ''}>
            <span>«</span> First
          </button>
          <button type="button" class="erp-pagination-btn" data-action="prev" title="Previous Page" ${page <= 1 ? 'disabled' : ''}>
            <span>‹</span> Prev
          </button>

          ${pageBtnsHtml}

          <button type="button" class="erp-pagination-btn" data-action="next" title="Next Page" ${page >= totalPages ? 'disabled' : ''}>
            Next <span>›</span>
          </button>
          <button type="button" class="erp-pagination-btn" data-action="last" title="Last Page" ${page >= totalPages ? 'disabled' : ''}>
            Last <span>»</span>
          </button>
        </div>

        <div class="erp-pagination-right">
          <span style="font-size:0.72rem; color:var(--text-muted); font-weight:600;">Rows per page:</span>
          <select class="erp-pagination-select" data-action="pagesize" title="Rows per page">
            <option value="15" ${pageSize === 15 ? 'selected' : ''}>15</option>
            <option value="25" ${pageSize === 25 ? 'selected' : ''}>25</option>
            <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
            <option value="100" ${pageSize === 100 ? 'selected' : ''}>100</option>
          </select>
        </div>
      </div>
    `;
  }

  /**
   * Binds click and change listeners to a rendered 2027 pagination bar
   */
  function bindPaginationEvents(barEl, onPageChange, onPageSizeChange) {
    if (!barEl) return;

    barEl.querySelectorAll('.erp-pagination-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (btn.disabled) return;

        const pageAttr = btn.dataset.page;
        if (pageAttr) {
          const targetPage = parseInt(pageAttr, 10);
          if (onPageChange) onPageChange(targetPage);
          return;
        }

        const action = btn.dataset.action;
        if (onPageChange && action) {
          onPageChange(action);
        }
      });
    });

    const selectEl = barEl.querySelector('.erp-pagination-select');
    if (selectEl) {
      selectEl.addEventListener('change', (e) => {
        const newSize = parseInt(e.target.value, 10);
        if (onPageSizeChange) onPageSizeChange(newSize);
      });
    }
  }

  /**
   * Enhances existing legacy pagination containers in the DOM
   */
  function enhanceExistingBars(container = document) {
    const bars = container.querySelectorAll('.pagination-bar, .pagination-container, .table-footer-bar .pagination');
    bars.forEach(bar => {
      if (bar.dataset.erpPaginationEnhanced === 'true') return;
      bar.dataset.erpPaginationEnhanced = 'true';

      // Upgrade existing buttons to 2027 tactile styling
      bar.querySelectorAll('button, a.btn, .pagination-btn').forEach(b => {
        b.classList.add('erp-pagination-btn');
        if (b.classList.contains('active') || b.getAttribute('aria-current') === 'page') {
          b.classList.add('active');
        }
      });

      // Wrap bar in 2027 styling if not already
      if (!bar.classList.contains('erp-pagination-bar-2027')) {
        bar.classList.add('erp-pagination-bar-2027');
      }
    });
  }

  return {
    /**
     * Renders a full 2027 pagination strip into a container element
     */
    render(targetContainer, options = {}) {
      if (!targetContainer) return;
      const html = buildPaginationHtml(options);
      targetContainer.innerHTML = html;
      const bar = targetContainer.querySelector('.erp-pagination-bar-2027');
      bindPaginationEvents(bar, options.onPageChange, options.onPageSizeChange);
      return bar;
    },

    /**
     * Universal scan and enhance for all pagination bars in container
     */
    enhance(container = document) {
      enhanceExistingBars(container);
    },

    init() {
      this.enhance(document);

      // Auto-observe view loads and tab switches
      if (window.MutationObserver) {
        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.addedNodes && m.addedNodes.length > 0) {
              m.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                  if (node.matches && (node.matches('.pagination-bar, .pagination-container, .table-footer-bar') || node.querySelector('.pagination-bar, .pagination-container'))) {
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
  document.addEventListener('DOMContentLoaded', () => window.PaginationUiEnhancer.init());
} else {
  window.PaginationUiEnhancer.init();
}
