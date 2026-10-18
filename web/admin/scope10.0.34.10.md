# Scope & Release Notes: Payment Due Status & Return Lifecycle Parity (`10.0.34.10`)

**Target Baseline:** Desktop ERP `10.0.34` (`SalesListController.java`, `PurchaseListController.java`, `SemanticTableCells.java`, `ReturnService.java`)  
**Target Web Release:** Web Admin Studio `10.0.34.10` (`d:\ERP Website\admin`)  
**Date:** October 18, 2026  
**Status:** RELEASE COMPLETE & VALIDATED — 100% Desktop Parity

---

## 1. Executive Summary & Problem Resolution

In Web Admin Studio `10.0.34.7` - `10.0.34.9`, users observed two critical discrepancies:
1. **Payment Due Status Mismatch Against Desktop for Returns:**
   - Both the **Sales Register** and **Purchase Register** showed mismatched payment due status for return records compared to the desktop client.
   - Analysis revealed that the Web frontend failed to map `st.status` and `st.dueDate` from `/api/returns/settlements` into the record's runtime context, causing payment status to evaluate raw original invoice/bill statuses rather than the return settlement workflow.
   - The Due column rendered inconsistent badge structures (`Return Due in 3d` vs Desktop `Return Due in 3 Days`, or raw date strings in Purchases without semantic pill classes).
2. **Login Page Version Out of Sync:**
   - The login page repeatedly rendered `Version 10.0.34.7` due to:
     - `version.json` and `js/version.js` not being bumped in earlier releases.
     - `js/version.js` cache-buster query parameter remaining stuck at `?v=10.0.34.07` in `index.html`, causing persistent browser HTTP caching.

---

## 2. Parity Implementation Highlights

### A. Canonical Parity Helper in `FormatUtil.js`
- **`FormatUtil.getDueInfo(record)`:**
  - Mirrors Desktop `SalesListController.java:dueLabel` and `PurchaseListController.java:due(p)` with 100% fidelity:
    - `DELETED` &rarr; `"Deleted"`, `pill-danger`
    - `CANCELLED` &rarr; `"Cancelled"`, `pill-neutral`
    - `RETURN APPROVAL PENDING` / `AWAITING APPROVAL` &rarr; `"Awaiting Approval"`, `pill-warning`
    - `PAID` / `SETTLED` / Balance <= 0 &rarr; `"Settled"`, `pill-success`
    - Return Overdue &rarr; `"Return Overdue by X days"`, `pill-danger`
    - Return Due Today &rarr; `"Return Due Today"`, `pill-warning`
    - Return Due Future &rarr; `"Return Due in X Days"`, `pill-info`
    - Standard Overdue &rarr; `"Overdue by X days"`, `pill-danger`
    - Standard Due Today &rarr; `"Due today"`, `pill-warning`
    - Standard Due Future &rarr; `"Due in X days"`, `pill-info`
    - No Due Date &rarr; `"Not set"`, `pill-neutral`
- **`FormatUtil.renderDueBadge(record)`:**
  - Renders exact `SemanticTableCells.dueDate()` pills with badges, icons, and titles.
- **`FormatUtil.getPaymentStatusDisplay(record)` & `renderPaymentStatusBadge(record)`:**
  - Maps return statuses (`Return Pending Approval`, `Return Paid`, `Return Partial`, `Return Pending`) and regular payment statuses (`PAID`, `PARTIAL`, `OVERDUE`, `PENDING`).
  - Renders desktop semantic icons (`💳`, `🌗`, `⏱`, `⚠️`) with exact color classes.

### B. Register Controller Enhancements
- **`SalesController.js`:**
  - `/api/returns/settlements` enrichment maps `s.returnDueDate = st.dueDate || st.returnDueDate || null` and `s.paymentStatus = st.status`.
  - Replaced ad-hoc table cell logic in `colDue` and `colPaymentStatus` with `FormatUtil.renderDueBadge(s)` and `FormatUtil.renderPaymentStatusBadge(s)`.
  - Synchronized docked drawer and details modal due dates: `${formatDate(dueDate)} • ${getDueInfo(s).text}` (parity with Desktop `lblDetailDue`).
- **`PurchaseController.js`:**
  - `/api/returns/settlements` enrichment maps `p.returnDueDate = st.dueDate || st.returnDueDate || null` and `p.paymentStatus = st.status`.
  - Replaced ad-hoc table cell logic in `colDue` and `colPaymentStatus` with `FormatUtil.renderDueBadge(p)` and `FormatUtil.renderPaymentStatusBadge(p)`.
  - Inspect drawer due date and payment status badge updated with canonical `FormatUtil` helpers.
- **`RecordPaymentController.js`:**
  - Status badges and overview due date strip updated to full Desktop parity.

### C. Version Registry & Cache Busting Synchronization
- Bumped `version.json` and `js/version.js` to `10.0.34.10`.
- Updated static DOM anchors in `index.html` (`#auth-app-version-badge`, `#auth-desktop-baseline`, `#header-app-version-badge`).
- Bumped cachebuster queries on all stylesheets and 30+ script tags to `?v=10.0.34.10` to guarantee fresh browser cache invalidation.
