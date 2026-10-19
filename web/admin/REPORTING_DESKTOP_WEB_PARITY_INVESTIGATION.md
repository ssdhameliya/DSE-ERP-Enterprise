# Reporting Module: Desktop vs. Web Full Parity Investigation & Root Cause Analysis

**Document Version:** `1.0.0`  
**Target Release:** `web-v10.0.35.04` (Desktop Baseline `v10.0.35`)  
**Investigated Components:**
- Desktop: `ReportsController.java`, `ReportViewerController.java`, `ReportingSavedConfig.java`, `UnifiedReportExportService.java`, `SupportApiClient.java`, `ReportingService.java`, `SupportService.java`
- Web: `ReportsController.js`, `ReportService.js`, `FormatUtil.js`, `TableUiEnhancer.js`, `index.html`

---

## Executive Summary

A comprehensive, end-to-end investigation between the JavaFX Desktop source code and the Web application has revealed the exact technical root causes for all four reporting issues reported by the user:

1. **Tab 2 Report Center Favorites Not Syncing:** Caused by report ID naming discrepancies between Web local fallbacks and canonical server definitions, a logic bug in `loadSavedFavorites` that ignored empty or updated server sets, and absence of sync hooks on tab switching and refreshing.
2. **Refresh Button Feels Dead:** Caused by silent promise execution without button state manipulation (no spinner, no temporary disable, no completion toast or audio feedback).
3. **Export Button Functionality (Excel, PDF, CSV):** Caused by fake Excel exports (raw CSV masquerading as `.xls` without SheetJS workbook construction), raw browser `window.print()` for PDFs, and a lack of full table dataset exports.
4. **Tab 3 Saved Reports & Dynamic Viewer Failures:**
   - **Saved Views Dropdown & Catalog Blank:** Caused by a fatal JavaScript `TypeError: "REPORT_V2:".length is not a function` on line 1259 of `ReportsController.js`, which crashed decoding of every saved report from the server.
   - **Header & Data Format Loss on Refresh / Report Selection:** Caused by a 400 Bad Request rejection from `/api/reporting/run` because Web sent non-contract fields (`fromDate`, `toDate`, `status`, `sortBy`, `minAmount: ""`), triggering a fallback that wiped report columns and replaced them with plain invoice rows.
   - **Date & Timestamp Format Disconnect:** Caused by `ReportsController.js` bypassing `FormatUtil.js` with a hardcoded `en-GB` date formatter and stripping time components from Tab 4 KPI next-run timestamps.

---

## Detailed Root Cause Analysis by Issue

### Issue 1: Tab 2 Report Center — Favorites Not Syncing with Desktop

#### Desktop Architecture
- In Desktop `ReportsController.java` (lines 272–283):
  - Favorites are loaded via `SupportApiClient.savedViews("REPORT_FAVORITES", uid)`.
  - Favorites are stored via `SupportApiClient.saveView(uid, "REPORT_FAVORITES", "__favorites__", payload)` where `payload` is a comma-separated list of canonical report IDs (`SALES_REGISTER`, `PURCHASE_REGISTER`, `PROFITABILITY`, `GST_TAX`, `STOCK_SUMMARY`, etc.).
  - The server handles this in `SupportService.java` (lines 6–7) with table `saved_filter`:
    ```sql
    SELECT view_name, filter_json FROM saved_filter WHERE screen_key=? AND (user_id=? OR user_id IS NULL)
    ```

#### Web Current Defects
1. **Divergent Report IDs in Fallback Definitions:**
   - Desktop & Server use canonical IDs:
     - `PROFITABILITY` (Web had `PROFITABILITY_ITEM`)
     - `GST_TAX` (Web had `GST_SUMMARY`)
     - `RETURNS_ANALYSIS` (Web had `CUSTOMER_RETURNS`)
     - `STOCK_SUMMARY` (Web had `STOCK_VALUATION`)
     - `RECEIVABLE_AGEING` (Web had `RECEIVABLES_AGING`)
     - `PAYABLE_AGEING` (Web had `PAYABLES_AGING`)
     - `BANK_RECONCILIATION` (Web had `BANK_RECON_SUMMARY`)
   - When Desktop stars `PROFITABILITY`, Web checks `favoriteReportIds.has('PROFITABILITY_ITEM')`, which evaluates to `false`.
2. **Conditional Server Overwrite Bug in `loadSavedFavorites`:**
   - In `ReportsController.js` line 189:
     ```javascript
     if (serverFavs.size > 0) {
       favoriteReportIds = serverFavs;
       ...
     }
     ```
   - If the user removes all favorites on Desktop, `serverFavs.size === 0`. Web ignores the server state and falls back to hardcoded initial favorites or stale `localStorage`!
3. **Missing Lifecycle Hooks:**
   - Switching to Tab 2 (`switchMainTab('center')`) calls `renderReportCards()` but does NOT fetch fresh favorites from the server.
   - Clicking Refresh on Report Center (`handleRefreshAction()`) only reloads definitions but does NOT call `loadSavedFavorites()`.

---

### Issue 2: Refresh Button Feels "Dead" (No Visual Feedback)

#### Desktop Architecture
- In Desktop `ReportsController.java` line 212 & 240:
  - `setBusy(true)` immediately disables buttons, changes cursor, updates indicators, and locks tables.
  - On completion: `setBusy(false)`, triggers `ScreenRefreshPolicy.markRefreshed("reports")`, and optionally sounds an audio chime or status toast.

#### Web Current Defects
- In `index.html` line 6275:
  `<button class="btn btn-secondary" onclick="window.ReportsController.handleRefreshAction()" title="Refresh Current Tab Data">↻ Refresh</button>`
- In `ReportsController.js` lines 385–396:
  - Promises execute silently in the background.
  - The button does NOT change text, does NOT spin, and does NOT disable to prevent spamming.
  - No completion toast or visual flash occurs. To the user, clicking the button appears to do nothing.

---

### Issue 3: Export Button (Excel, PDF, CSV)

#### Desktop Architecture
- In Desktop `ReportViewerController.java` (lines 283–288) & `UnifiedReportExportService.java`:
  - `export("Excel Report", "xlsx")`: Generates a genuine Office Open XML `.xlsx` spreadsheet with styled headers and proper numeric types.
  - `export("PDF Report", "pdf")`: Generates a structured multi-page PDF document.
  - `export("CSV Report", "csv")`: Exports RFC 4180 compliant comma-separated values.
  - Both Dashboard and Viewer have format selection menus with full dataset exports.

#### Web Current Defects
1. **Fake Excel Export:**
   - `exportReport('EXCEL')` generates a CSV file with `.xls` extension:
     ```javascript
     new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
     ```
   - When opened, Excel displays a corruption warning dialog.
   - SheetJS (`xlsx.full.min.js`) is already included in `index.html` but was not utilized here.
2. **Browser Print Instead of PDF Document:**
   - `exportReport('PDF')` triggers `window.print()`, opening the entire raw web UI in the browser's generic print modal rather than downloading a clean report file.
3. **Dashboard Tab Export Disconnect:**
   - Clicking Export on the Dashboard exports a trivial 4-line summary rather than the complete dataset or the active viewer report.

---

### Issue 4: Tab 3 Saved Reports / Dynamic Viewer & Date/Timestamp Formatting

#### Defect 4A: Saved View Dropdown & Saved Report Catalog Always Blank
- **The Fatal Syntax Bug:**
  In `ReportsController.js` line 1259:
  ```javascript
  config = JSON.parse(v.data.substring('REPORT_V2:'.length()));
  ```
  In JavaScript, `length` is a property, NOT a method. Calling `'REPORT_V2:'.length()` throws:
  `TypeError: "REPORT_V2:".length is not a function`
- The exception was trapped silently by `catch (_) {}`.
- Because `config` remained null, `allSavedReports` was never populated from the server payload.
- As a direct consequence:
  - `allSavedReports` remained `[]`.
  - The Saved Reports Catalog table rendered: `"No saved reports found"`.
  - The toolbar dropdown rendered only the default `-- Load Saved Report --` with zero items.

#### Defect 4B: Dynamic Viewer Headers & Data Lost on Refresh / Report Selection
- In `ReportsController.js` lines 920–939:
  ```javascript
  const req = {
    reportId: def?.id || currentReportId,
    fromDate: from,          // SERVER EXPECTS "from"
    toDate: to,              // SERVER EXPECTS "to"
    party: party,
    item: item,
    salesperson: salesperson,
    status: status,          // SERVER EXPECTS "documentStatus"
    paymentStatus: paymentStatus,
    returnStatus: returnStatus,
    gstRate: gstRate,
    minAmount: minAmount,    // EMPTY STRING "" THROWS JACKSON DESERIALIZATION ERROR
    maxAmount: maxAmount,    // EMPTY STRING "" THROWS JACKSON DESERIALIZATION ERROR
    groupBy: groupBy,
    sortBy: sortBy,          // SERVER EXPECTS "sortKey"
    sortDirection: sortDirection,
    search: viewerSearchQuery,
    page: viewerPage,
    size: viewerPageSize
  };
  ```
- Compare with `ReportingDtos.ReportRequest.java`:
  ```java
  public record ReportRequest(
      String reportId, String from, String to, String party, String item,
      String salesperson, String documentStatus, String paymentStatus,
      String returnStatus, String gstRate, String warehouse, String bankStatus,
      String search, String groupBy, String sortKey, String sortDirection,
      Double minAmount, Double maxAmount, Integer page, Integer size,
      List<String> visibleColumns) {}
  ```
- **Consequence:** Every single call to `POST /api/reporting/run` failed with HTTP 400 Bad Request.
- Web fell back to `fallbackViewerExecution(req)`, which hardcoded 6 generic sales/purchase columns:
  `Bill No., Date, Supplier, Taxable, Total, Status`
- Thus, selecting any specialized report from Report Center (`GST_TAX`, `STOCK_SUMMARY`, `PROFITABILITY`, `BANK_RECONCILIATION`) immediately replaced the report with plain invoice columns, stripping all dynamic headers, types, and colors!
- Clicking Refresh repeated the failed call and re-triggered the fallback, causing the table to appear completely inconsistent and broken.

#### Defect 4C: Table Header Icons & Rich Formatting Missing
- `renderViewerResult()` generated plain `<th>${c.label}</th>` without Desktop semantic icons (`calendar`, `customer`, `supplier`, `item`, `tax`, `status`, `currency`, `document`, `bank`).
- It did not call `TableUiEnhancer.enhance()` on `#viewer-table`.
- Numeric values were not color-coded (green for profit, orange for purchase, blue for sales) or formatted as Indian Rupees (`₹ #,##,##0.00`).

#### Defect 4D: Date and Timestamp Formatting Not Using Settings
- In `ReportsController.js` lines 61–70, a private `formatDate()` bypassed `window.FormatUtil` and forced `en-GB` format (`02 Nov 2026`).
- In Tab 4 (Scheduled Reports), `nextRun` is an ISO timestamp (`2026-10-20T08:00:00Z`). Web called `formatDate(nextRun)`, which stripped the time completely and output date-only.
- In Desktop, `BusinessClock.formatTimestamp(v.getValue().nextRun())` outputs the full formatted date and time synchronized with `company.dateFormat` and `company.timeFormat` from Server Settings.

---

## Action Plan (For Execution Upon Approval)

1. **Issue 1 (Favorites Parity):**
   - Align `FALLBACK_DEFINITIONS` with canonical server IDs (`PROFITABILITY`, `GST_TAX`, `RETURNS_ANALYSIS`, `STOCK_SUMMARY`, `RECEIVABLE_AGEING`, `PAYABLE_AGEING`, `BANK_RECONCILIATION`).
   - Fix `loadSavedFavorites()` to accurately sync with the server response (even when empty).
   - Hook `loadSavedFavorites()` into `switchMainTab('center')` and `handleRefreshAction()`.
2. **Issue 2 (Refresh Feedback):**
   - In `handleRefreshAction()`, update button state with spinner animation:
     `btn.innerHTML = '<span class="loading-spinner"></span> Refreshing...'; btn.disabled = true;`
   - Play success chime via `AudioSynthesizer` and show toast notification upon completion.
3. **Issue 3 (Real Exports):**
   - Integrate SheetJS (`XLSX.utils.book_new`, `aoa_to_sheet`, `writeFile`) to generate authentic `.xlsx` spreadsheets for both Viewer and Dashboard data.
   - For CSV, generate standard RFC 4180 files.
   - For PDF, trigger dedicated formatted document print/download.
4. **Issue 4 (Saved Reports, Dynamic Viewer & Dates):**
   - Fix `.length()` to `.length` in `v.data.substring('REPORT_V2:'.length)`.
   - Align `req` in `applyViewerFilters()` with `ReportingDtos.ReportRequest` (`from`, `to`, `documentStatus`, `sortKey`, numeric `minAmount`/`maxAmount`).
   - In `renderViewerResult()`, inject semantic header icons, color-coded cells, and call `TableUiEnhancer.enhance()`.
   - Update `formatDate()` and `formatTimestamp()` to route through `window.FormatUtil.formatDate()` and `window.FormatUtil.formatDateTime()` respecting `company.dateFormat` and `company.timeFormat`.
5. **Version Bump & Staging:**
   - Bump version to `10.0.35.04` across `version.json`, `js/version.js`, and `index.html`.
