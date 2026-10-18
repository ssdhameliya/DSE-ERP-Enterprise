# Scope Specification: Sales & Purchase Register Return Status & Return Lifecycle Parity (`scope10.0.34.9.md`)

**Target Baseline:** Desktop ERP `10.0.34` (`SalesListController.java`, `PurchaseListController.java`, `ReturnEditorService.java`, `SalesReturnsController.java`, `PurchaseReturnsController.java`, `SemanticTableCells.java`, `ReturnService.java`)  
**Target Web Release:** Web Admin Studio `10.0.34.9` (`d:\ERP Website\admin`)  
**Date:** October 18, 2026  
**Status:** Canonical Implementation Scope — Discrepancy Analysis & Parity Specification  
**Rule:** Strictly NO BUILD / compile commands. Pure comparison, root cause identification, and specification documentation.

---

## 1. Executive Summary & Critical Root Causes

An exhaustive audit was conducted comparing Desktop ERP `10.0.34` against Web Admin Studio `10.0.34.8` regarding:
1. How **Return Status** and **Return Lifecycle Settlements** are enriched, displayed, and filtered in the **Sales Register** (`SalesListController.java` vs `SalesController.js` & `index.html`).
2. How **Return Status** and **Return Lifecycle Settlements** are enriched, displayed, and filtered in the **Purchase Register** (`PurchaseListController.java` vs `PurchaseController.js` & `index.html`).
3. How the **Return Creation Dialog** (`ReturnEditorService.java` vs `ReturnsController.js` & `modal-create-return`) validates line availability, defaults quantities, and invalidates caller registers.
4. How the **Inspect Drawers** reflect returned quantities, approved return balances, refund progress, and adjusted payment due labels.

### Key Issues Identified:

1. **CRITICAL BUG: Query Parameter Underscore Breaks Settlement Enrichment Across Both Registers**
   - **Desktop (`SalesService.java:51`, `PurchaseService.java:73`):** Calls `returnApi.settlements("SALES RETURN", invoices)` and `settlements("PURCHASE RETURN", invoices)`.
   - **Backend (`ReturnService.java:631-636`):** Strictly enforces:
     ```java
     private String normalizeType(String type) {
         String normalized = type == null ? "" : type.trim().toUpperCase(Locale.ROOT);
         if ("SALE RETURN".equals(normalized)) normalized="SALES RETURN";
         if (!Set.of("SALES RETURN", "PURCHASE RETURN").contains(normalized)) 
             throw new IllegalArgumentException("Return type must be SALES RETURN or PURCHASE RETURN.");
         return normalized;
     }
     ```
   - **Web Failure (`SalesController.js:276`, `PurchaseController.js:152`):**
     - Web queries: `/api/returns/settlements?type=SALES_RETURN&invoices=...` and `/api/returns/settlements?type=PURCHASE_RETURN&invoices=...` (with underscores).
     - Because `normalizeType` rejects strings with underscores, the backend throws an `IllegalArgumentException` (HTTP 500 / 400).
     - The `catch (stErr)` block in Web swallows this error and silently assigns `s.returnStatus = 'N/A'` and `p.returnStatus = 'N/A'` to all records!
     - **Consequence:** Return status is **never loaded from the database in Web**; every invoice and bill always displays `"📄 N/A"`, even when approved returns exist!

2. **PURCHASE REGISTER FILTER VALUES MISMATCH (COMPLETELY BROKEN FILTERING)**
   - **Desktop (`PurchaseListController.java:37`):** Dropdown items are `["All", "N/A", "PENDING APPROVAL", "PARTIALLY RETURNED", "FULLY RETURNED"]`.
   - **Web Bug (`index.html:2441-2446`):**
     ```html
     <select id="pur-filter-ret-status" class="form-select" onchange="window.PurchaseController.loadPurchases()">
       <option value="">All</option>
       <option value="NOT_RETURNED">NOT RETURNED</option>
       <option value="PARTIAL_RETURN">PARTIAL RETURN</option>
       <option value="FULL_RETURN">FULL RETURN</option>
     </select>
     ```
   - **Consequence:** The option values (`NOT_RETURNED`, `PARTIAL_RETURN`, `FULL_RETURN`) do not match backend model values (`N/A`, `PARTIALLY RETURNED`, `FULLY RETURNED`). Furthermore, `PENDING APPROVAL` is completely missing. Filtering by return status in the Purchase Register on Web returns 0 records!

3. **UNPROFESSIONAL STRING TRUNCATION & INCORRECT BADGE COLORS**
   - **Desktop (`SemanticTableCells.java:238-246`):**
     - `"N/A"` &rarr; `pill-neutral` (gray pill, document icon)
     - `"PENDING APPROVAL"` &rarr; `pill-warning` (amber/orange pill, reminder clock icon)
     - `"PARTIALLY RETURNED"` &rarr; `pill-info` (cyan/blue pill, refresh icon)
     - `"FULLY RETURNED"` &rarr; `pill-success` (emerald green pill, check/return icon)
     - Clean, full text is always rendered.
   - **Web Failure (`SalesController.js:440-446`, `PurchaseController.js:81-89`):**
     - Hardcoded truncated strings: `"🔄 FULLY RET.."`, `"🔄 PARTIAL RET.."`, `"⏳ PEND APPROV.."`.
     - In both controllers, `PENDING APPROVAL` is styled with danger red (`#f87171` / `pill-danger`), which misleads users into thinking the return was rejected or errored.
     - `PARTIALLY RETURNED` is styled with yellow instead of desktop's `pill-info` (cyan/blue).

4. **ROW ACTION MENUS LACK RETURN ELIGIBILITY GUARDS**
   - **Desktop (`SalesListController.java:416`, `PurchaseListController.java:156`):**
     - Evaluates `isReturnEligible(record)`:
       1. Document status must be `APPROVED`.
       2. Invoice must be fully paid (`isFullyPaid(record)`).
       3. Invoice must not currently have a pending or partial return in progress (`RETURN APPROVAL PENDING`, `RETURN PENDING`, `RETURN PARTIAL`).
       4. Invoice must not already be `FULLY RETURNED`.
     - If ineligible, `"Create Sales Return"` / `"Record Purchase Return"` is disabled.
   - **Web Failure:**
     - Both `SalesController.js` and `PurchaseController.js` leave the return action unconditionally enabled for all rows, allowing users to initiate returns on unpaid, draft, cancelled, or already fully returned records.

5. **INLINE & MODAL INSPECT DRAWERS OMIT RETURN DETAILS & SETTLEMENT DUE DATES**
   - **Desktop (`SalesListController.java:588`, `PurchaseListController.java:279`):**
     - Displays `Return Status` pill in the drawer.
     - Displays `Returned Quantity` vs `Original Quantity` (e.g. `2.000 of 10.000 returned`).
     - Displays `Approved Return Amount` and `Return Refund Status` (`REFUNDED`, `PARTIAL`, `PENDING`).
     - Replaces payment due date label with return settlement tracking:
       - If `RETURN PENDING` or `RETURN PARTIAL`: displays `"Return Overdue by X days"`, `"Return Due Today"`, or `"Return Due in X Days"`.
       - If `RETURN APPROVAL PENDING`: displays `"Awaiting Approval"`.
       - If `RETURN PAID`: displays `"Settled"`.
   - **Web Failure:**
     - Both drawers (`#sales-inline-drawer` / `#drawer-invoice-details` and `#drawer-purchase-details-inspect`) completely omit Return Status, Returned Quantity, Approved Return Amount, and Refund Status.
     - The Due Date label on Web strictly checks invoice balance, completely ignoring return settlement due dates.

6. **RETURN CREATION DOES NOT REFRESH SOURCE REGISTERS**
   - **Desktop (`ReturnEditorService.java:365-371`):**
     - Upon creating a return, invalidates and reloads both the Return Register and the source Register (`ScreenRefreshPolicy.invalidate("sales-register")` / `"purchase-register"`).
   - **Web Failure (`ReturnsController.js:824`):**
     - Only calls `loadReturns(currentType, 0)`.
     - Fails to refresh `window.SalesController.loadSales()` or `window.PurchaseController.loadPurchases()`, leaving the register where the user initiated the return showing stale information.

7. **"VIEW ORIGINAL SALE / PURCHASE" DEEP LINK BROKEN IN RETURN REGISTER**
   - **Desktop (`SalesReturnsController.java:113`, `PurchaseReturnsController.java:117`):**
     - Opens the exact invoice in the register, scrolls to it, highlights and pulses the row, and opens the drawer.
   - **Web Failure (`ReturnsController.js:509-518`):**
     - For Sales Return: queries `document.getElementById('sales-search-input')`, which does not exist (the actual ID is `sr-search-input`). The search box is never populated.
     - For Purchase Return: only selects the navigation view without populating search or selecting the row.

---

## 2. Multi-Module Parity Matrix: Desktop vs. Web

| Feature / Dimension | Desktop ERP 10.0.34 | Current Web Admin 10.0.34.8 | Parity Gap & Issue |
| :--- | :--- | :--- | :--- |
| **Settlements API Call** | `GET /api/returns/settlements?type=SALES RETURN` & `PURCHASE RETURN` | `type=SALES_RETURN` & `type=PURCHASE_RETURN` | **CRITICAL BUG:** Underscore rejected by backend `normalizeType`. Settlements fail; `returnStatus` always defaults to `N/A`. |
| **Sales Register Column** | Column 10: `colReturnStatus` (`SemanticTableCells.status("return")`) | Column 12: `Return Status` | Truncates to `"🔄 FULLY RET.."`, `"🔄 PARTIAL RET.."`, `"⏳ PEND APPROV.."`. Wrong colors. |
| **Purchase Register Column** | Column 11: `colReturnStatus` (`SemanticTableCells.status("return")`) | Column 12: `Return Status` | Truncates to `"🔄 FULLY RET.."`, `"🔄 PARTIAL RET.."`, `"⏳ PEND APPROV.."`. `PENDING APPROVAL` colored red. |
| **Sales Register Filter** | `["All", "N/A", "PENDING APPROVAL", "PARTIALLY RETURNED", "FULLY RETURNED"]` | Same values in HTML `#sr-filter-ret-status` | HTML is correct, but server data is never loaded due to Bug #1. |
| **Purchase Register Filter** | `["All", "N/A", "PENDING APPROVAL", "PARTIALLY RETURNED", "FULLY RETURNED"]` | `["NOT_RETURNED", "PARTIAL_RETURN", "FULL_RETURN"]` | **CRITICAL MISMATCH:** Option values do not match backend. `PENDING APPROVAL` missing. Filtering returns 0 rows. |
| **Pill Styling: N/A** | `pill-neutral` (Gray pill with document icon) | Styled badge with document icon | Text says `📄 N/A`. |
| **Pill Styling: Pending Approval** | `pill-warning` (Amber pill with clock/reminder icon) | Red badge (`#f87171` / `pill-danger`) with `"⏳ PEND APPROV.."` | **COLOR MISMATCH:** Should be Warning (amber/yellow), not Danger (red). Full text required. |
| **Pill Styling: Partially Returned** | `pill-info` (Cyan/blue pill with refresh icon) | Yellow/amber badge with `"🔄 PARTIAL RET.."` | **COLOR MISMATCH:** Should be Info (cyan/blue), not warning. Full text required. |
| **Pill Styling: Fully Returned** | `pill-success` (Emerald green with return/check icon) | Green badge with `"🔄 FULLY RET.."` | Truncated string instead of full `"FULLY RETURNED"`. |
| **Action: Create Return Guard** | `isReturnEligible`: Document `APPROVED`, Fully Paid, No active return in progress | Unconditionally enabled | **LOGIC GAP:** Allows return creation on unpaid, draft, cancelled, or fully returned invoices. |
| **Inspect Drawer: Return Info** | Shows Return Status, Returned Qty, Approved Return Amount, Refund Status | None | **MISSING FEATURE:** Both Sales & Purchase drawers omit return settlement metadata. |
| **Inspect Drawer: Due Label** | Dynamically reflects Return Overdue / Due Today / Due in X Days / Settled | Only checks invoice balance (`isCancelled ? Cancelled : (pending <= 0.01 ? Settled : Pending)`) | **LOGIC GAP:** Ignores return settlement schedules. |
| **Return Creation: Auto-Qty** | Checking a row automatically defaults `returnQuantity = availableQuantity` | Present in Web modal | Web modal does have auto-fill, but party resolution and line fallback need parity hardening. |
| **Post-Return Synchronization** | Invalidates and reloads both Return Register and caller Register | Only calls `loadReturns` | **DESYNC:** Caller register (Sales/Purchase) remains stale until user manually refreshes. |
| **Return Register: View Original** | Deep-links, scrolls, highlights, and inspects the exact original invoice | Broken element ID (`sales-search-input`) for Sales; No search for Purchase | **BROKEN NAVIGATION:** Deep-link fails to locate original document. |

---

## 3. Detailed Technical Root Causes

### 3.1 Backend Type Normalization Discrepancy
In `DSE-ERP-10.0.25/server/src/main/java/org/example/server/returns/ReturnService.java`:
```java
// Line 631-636
private String normalizeType(String type) {
    String normalized = type == null ? "" : type.trim().toUpperCase(Locale.ROOT);
    if ("SALE RETURN".equals(normalized)) normalized="SALES RETURN";
    if (!Set.of("SALES RETURN", "PURCHASE RETURN").contains(normalized)) 
        throw new IllegalArgumentException("Return type must be SALES RETURN or PURCHASE RETURN.");
    return normalized;
}
```
In Web `SalesController.js`:
```javascript
// Line 276
const settlementsRes = await window.ApiService.get(`/api/returns/settlements?type=SALES_RETURN&invoices=${encodeURIComponent(invNos.join(','))}`);
```
In Web `PurchaseController.js`:
```javascript
// Line 152
const settlementsRes = await window.ApiService.get(`/api/returns/settlements?type=PURCHASE_RETURN&invoices=${encodeURIComponent(invNos.join(','))}`);
```
Because the URL parameter sends `type=SALES_RETURN` (with underscore) instead of `type=SALES RETURN` (encoded as `SALES%20RETURN`), the server throws `IllegalArgumentException: Return type must be SALES RETURN or PURCHASE RETURN`. The settlement data is aborted and all rows fallback to `returnStatus = 'N/A'`.

### 3.2 Purchase Filter Value Mismatch
In `d:\ERP Website\admin\index.html` lines 2440-2446:
```html
<select id="pur-filter-ret-status" class="form-select" onchange="window.PurchaseController.loadPurchases()" style="height: 34px; font-size: 0.78rem;">
  <option value="">All</option>
  <option value="NOT_RETURNED">NOT RETURNED</option>
  <option value="PARTIAL_RETURN">PARTIAL RETURN</option>
  <option value="FULL_RETURN">FULL RETURN</option>
</select>
```
Desktop `PurchaseListController.java` line 37:
```java
cmbReturnStatus.getItems().setAll("All","N/A","PENDING APPROVAL","PARTIALLY RETURNED","FULLY RETURNED");
```
Desktop `PurchaseService.java` line 71:
```java
private boolean matchReturnStatus(Purchase row,String filter){
    if(filter==null||filter.isBlank()||"All".equalsIgnoreCase(filter))return true;
    return row!=null&&filter.equalsIgnoreCase(row.getReturnStatus());
}
```
When a user selects "PARTIAL RETURN" on Web, it queries the backend with `returnStatus=PARTIAL_RETURN`. The backend compares `PARTIAL_RETURN` against `PARTIALLY RETURNED` and returns `false`, resulting in an empty register.

### 3.3 Semantic Status Pill Styling & Truncation
In `SemanticTableCells.java`:
```java
// Line 238-246
case "return" -> {
    if (v.contains("DELETE")) yield new Presentation("delete", State.DANGER);
    if (v.contains("CANCEL") || v.contains("REJECT") || v.contains("FAIL")) yield new Presentation("cancel", State.DANGER);
    if (v.contains("COMPLETE") || v.contains("RETURNED")) yield new Presentation("return", State.SUCCESS);
    if (v.contains("APPROVED") || v.contains("ACCEPTED")) yield new Presentation("complete", State.SUCCESS);
    if (v.contains("PARTIAL") || v.contains("IN PROGRESS") || v.contains("PROCESS")) yield new Presentation("refresh", State.INFO);
    if (v.contains("PENDING") || v.contains("OPEN") || v.contains("CREATED") || v.contains("WAIT")) yield new Presentation("reminder", State.WARNING);
    yield new Presentation("document", state);
}
```
In Web `SalesController.js`:
- Truncates to `"🔄 FULLY RET.."` instead of `"FULLY RETURNED"`
- Truncates to `"🔄 PARTIAL RET.."` instead of `"PARTIALLY RETURNED"`
- Truncates to `"⏳ PEND APPROV.."` with `#f87171` (red) instead of amber/yellow warning
In Web `PurchaseController.js`:
- `getStatusBadge` has identical truncation and red styling for `PENDING APPROVAL`.

### 3.4 Missing `isReturnEligible` Guard
In `SalesListController.java` lines 791-796:
```java
private boolean isReturnEligible(Sales sale){
    if(sale==null||!isFullyPaid(sale))return false;
    String document=safe(sale.getDocumentStatus()).trim().toUpperCase(java.util.Locale.ROOT);
    String current=safe(sale.getPaymentStatus()).trim().toUpperCase(java.util.Locale.ROOT);
    return "APPROVED".equals(document)&&!Set.of("RETURN APPROVAL PENDING","RETURN PENDING","RETURN PARTIAL").contains(current);
}
```
And in line 416:
```java
createReturn.setDisable(missing||!isReturnEligible(current));
```
In Web, `toggleRowActionsMenu` never disables the menu item or verifies eligibility.

---

## 4. Required Implementation Specifications (For Next Version)

### 4.1 Fix Settlement Query in `SalesController.js` & `PurchaseController.js`
- Change URL query parameter:
  - In `SalesController.js`:
    ```javascript
    const settlementsRes = await window.ApiService.get(`/api/returns/settlements?type=${encodeURIComponent('SALES RETURN')}&invoices=${encodeURIComponent(invNos.join(','))}`);
    ```
  - In `PurchaseController.js`:
    ```javascript
    const settlementsRes = await window.ApiService.get(`/api/returns/settlements?type=${encodeURIComponent('PURCHASE RETURN')}&invoices=${encodeURIComponent(invNos.join(','))}`);
    ```
- Map full settlement fields onto each record:
  ```javascript
  s.returnStatus = st.returnStatus || 'N/A';
  s.refundStatus = st.refundStatus || 'N/A';
  s.returnPendingAmount = st.pendingAmount || 0;
  s.approvedReturnAmount = st.approvedReturnAmount || 0;
  s.settledReturnAmount = st.settledAmount || 0;
  s.returnedQuantity = st.returnedQuantity || 0;
  s.originalQuantity = st.originalQuantity || 0;
  s.returnDueDate = st.dueDate || null;
  s.hasReturnSettlement = (s.returnStatus !== 'N/A');
  ```

### 4.2 Fix Return Status Filter Options in `index.html`
- Replace Purchase Register Return Status options with exact desktop parity:
  ```html
  <div>
    <label class="form-label" style="font-size: 0.72rem;">&#8634; Return Status</label>
    <select id="pur-filter-ret-status" class="form-select" onchange="window.PurchaseController.loadPurchases()" style="height: 34px; font-size: 0.78rem;">
      <option value="">All</option>
      <option value="N/A">N/A</option>
      <option value="PENDING APPROVAL">PENDING APPROVAL</option>
      <option value="PARTIALLY RETURNED">PARTIALLY RETURNED</option>
      <option value="FULLY RETURNED">FULLY RETURNED</option>
    </select>
  </div>
  ```

### 4.3 Standardize Return Status Cell Rendering
- In both `SalesController.js` and `PurchaseController.js`:
  ```javascript
  function formatReturnStatusBadge(status) {
    const s = (status || 'N/A').toUpperCase().replace(/_/g, ' ').trim();
    if (s === 'FULLY RETURNED') {
      return '<span class="pill-badge pill-success"><span style="margin-right:4px;">↩️</span> FULLY RETURNED</span>';
    }
    if (s === 'PARTIALLY RETURNED') {
      return '<span class="pill-badge pill-info"><span style="margin-right:4px;">🔄</span> PARTIALLY RETURNED</span>';
    }
    if (s === 'PENDING APPROVAL') {
      return '<span class="pill-badge pill-warning"><span style="margin-right:4px;">⏳</span> PENDING APPROVAL</span>';
    }
    return '<span class="pill-badge pill-neutral"><span style="margin-right:4px;">📄</span> N/A</span>';
  }
  ```

### 4.4 Add `isReturnEligible` Action Guard
- In `SalesController.js`:
  ```javascript
  isReturnEligible(sale) {
    if (!sale) return false;
    const grandTotal = sale.totalAmount != null ? sale.totalAmount : (sale.total || 0);
    const paid = sale.paidAmount != null ? sale.paidAmount : (sale.paymentStatus === 'PAID' ? grandTotal : 0);
    const isFullyPaid = (sale.paymentStatus === 'PAID' || sale.paymentStatus === 'SETTLED' || (paid + 0.01 >= grandTotal));
    const doc = (sale.documentStatus || '').toUpperCase().trim();
    const pay = (sale.paymentStatus || '').toUpperCase().trim();
    const ret = (sale.returnStatus || 'N/A').toUpperCase().trim();
    if (doc !== 'APPROVED' || !isFullyPaid) return false;
    if (ret === 'FULLY RETURNED') return false;
    if (['RETURN APPROVAL PENDING', 'RETURN PENDING', 'RETURN PARTIAL'].includes(pay)) return false;
    return true;
  }
  ```
- Disable or visually flag `"Create Sales Return"` in the row actions menu when `!isReturnEligible(sale)`.
- Apply identical logic in `PurchaseController.js` for `"Record Purchase Return"`.

### 4.5 Enrich Inspect Drawers with Return Settlement Section
- When `sale.hasReturnSettlement` or `p.hasReturnSettlement` is true:
  - Add a dedicated **Return Settlement Information Card** in `#sales-inline-drawer` and `#drawer-purchase-details-inspect`:
    - **Return Status:** Formatted pill badge.
    - **Returned Quantity:** `${returnedQuantity} of ${originalQuantity} items returned`.
    - **Approved Return Amount:** `₹ XX,XXX.XX`.
    - **Refund Progress:** `₹ XX,XXX.XX refunded (${refundStatus})`.
    - **Return Due Date:** Displayed if refund is pending.
- Update Due Date badge calculation:
  ```javascript
  function formatDueLabel(record) {
    const doc = (record.documentStatus || '').toUpperCase();
    if (doc.includes('CANCEL')) return '<span class="pill-badge pill-danger">Cancelled</span>';
    if (doc.includes('DELETE')) return '<span class="pill-badge pill-danger">Deleted</span>';
    const pay = (record.paymentStatus || '').toUpperCase();
    if (pay === 'RETURN APPROVAL PENDING') return '<span class="pill-badge pill-warning">Awaiting Approval</span>';
    if (pay === 'RETURN PAID') return '<span class="pill-badge pill-success">Settled</span>';
    if (pay === 'RETURN PENDING' || pay === 'RETURN PARTIAL') {
      const due = record.returnDueDate ? new Date(record.returnDueDate) : null;
      if (!due) return '<span class="pill-badge pill-warning">Return Due</span>';
      const today = new Date(); today.setHours(0,0,0,0); due.setHours(0,0,0,0);
      const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return `<span class="pill-badge pill-danger">Return Overdue by ${Math.abs(diffDays)} days</span>`;
      if (diffDays === 0) return '<span class="pill-badge pill-warning">Return Due Today</span>';
      return `<span class="pill-badge pill-info">Return Due in ${diffDays} Days</span>`;
    }
    const balance = Math.max(0, (record.totalAmount || 0) - (record.paidAmount || 0));
    if (balance <= 0.01) return '<span class="pill-badge pill-success">Settled</span>';
    if (!record.dueDate) return '<span class="pill-badge pill-neutral">Not set</span>';
    const due = new Date(record.dueDate); const today = new Date(); today.setHours(0,0,0,0); due.setHours(0,0,0,0);
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `<span class="pill-badge pill-danger">Overdue by ${Math.abs(diffDays)} days</span>`;
    if (diffDays === 0) return '<span class="pill-badge pill-warning">Due today</span>';
    return `<span class="pill-badge pill-neutral">Due in ${diffDays} days</span>`;
  }
  ```

### 4.6 Post-Creation Register Cache Invalidation
- In `ReturnsController.js:submitCreateReturn`:
  - After successfully creating a return:
    ```javascript
    if (currentType === 'SALES RETURN') {
      if (window.SalesController && window.SalesController.loadSales) {
        window.SalesController.loadSales();
      }
    } else {
      if (window.PurchaseController && window.PurchaseController.loadPurchases) {
        window.PurchaseController.loadPurchases();
      }
    }
    ```

### 4.7 Fix Deep-Link Search in Return Register
- In `ReturnsController.js:viewOriginalDoc`:
  - Target the correct search input ID:
    ```javascript
    if (currentType === 'SALES RETURN') {
      window.NavigationRouter.selectNav('view-sales-register');
      const search = document.getElementById('sr-search-input');
      if (search) {
        search.value = docNo;
        if (window.SalesController) window.SalesController.applyFilters();
      }
    } else {
      window.NavigationRouter.selectNav('view-purchase-register');
      const search = document.getElementById('pur-filter-search');
      if (search) {
        search.value = docNo;
        if (window.PurchaseController) window.PurchaseController.loadPurchases();
      }
    }
    ```

---

## 5. Verification Checklist

- [ ] **Settlements Enrichment:** Verify network tab confirms `/api/returns/settlements?type=SALES%20RETURN&invoices=...` returns HTTP 200 with JSON settlement array.
- [ ] **Sales Register Return Status:** Invoices with active returns display `"PARTIALLY RETURNED"`, `"FULLY RETURNED"`, or `"PENDING APPROVAL"`. Non-returned invoices display `"N/A"`.
- [ ] **Purchase Register Return Status:** Purchase bills display authoritative return status matching Desktop.
- [ ] **Purchase Register Filter:** Selecting `"PARTIALLY RETURNED"`, `"FULLY RETURNED"`, or `"PENDING APPROVAL"` filters the table accurately.
- [ ] **Badge Appearance:** Full text is rendered with correct semantic colors (`pill-warning` for Pending Approval, `pill-info` for Partial, `pill-success` for Full, `pill-neutral` for N/A). No `"RET.."` truncation.
- [ ] **Action Menu Guard:** Unpaid, draft, cancelled, or fully returned invoices have `"Create Sales Return"` disabled with an explanatory tooltip.
- [ ] **Inspect Drawer:** Invoices with returns show returned quantity, approved return amount, and refund status in the side drawer.
- [ ] **Post-Save Sync:** Creating a return updates the Return Register and immediately refreshes the Sales/Purchase Register with the new Return Status.
- [ ] **View Original Doc:** Clicking `"View Original Sale"` or `"View Original Purchase"` in the Return Register navigates to the register and filters by the invoice number.
