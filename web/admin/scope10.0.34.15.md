# Scope Specification — Release 10.0.34.15 (Build 15)
## Reporting Dashboard & Viewer Desktop Parity, Action Button Aesthetics, Deep-Link Row Highlighting, Dynamic Footer, Dual Purchase Recon Import, and AudioSynthesizer Exception Guard

---

## 1. Document Overview
- **Version Baseline:** `10.0.34.14` (Build `14`)
- **Target Release:** `10.0.34.15` (Build `15`)
- **Desktop Reference:** `DSE-ERP-10.0.25` / `release-10.0.34` (`org.example.controller.ReportsController`, `org.example.controller.ReportViewerController`, `org.example.controller.BankStatementController`, `org.example.ui.SharedApplicationFooter`, `org.example.server.recon.PurchaseReconService`)
- **Web Reference:** `d:\ERP Website\admin` (`ReportsController.js`, `BankStatementController.js`, `PurchaseReconController.js`, `ImportService.js`, `ImportController.js`, `AudioSynthesizer.js`, `index.html`)
- **Mode:** **Full Implementation & Deployment**

---

## 2. Executive Summary & Root Cause Analysis

### Issue A: Reporting Dashboard & Viewer Screen Disparity (4 Tabs Architecture)
- **User Finding:** The web reporting dashboard is not inline with desktop. It lacks the 4-tab workflow shown in desktop screenshots:
  1. `Dashboard` tab with a dedicated multi-parameter filter panel, 6 KPI cards, recent sales/purchase tables with "View Report", payment snapshot, and bottom business health/stock attention cards.
  2. `Report Center` tab with horizontal sub-category navigation (`Favorites`, `Sales`, `Purchase`, `Returns`, `GST / Tax`, `Receivable`, `Payable`, `Inventory`, `Banking`, `Profitability`), catalog search, and report cards with Favorite star toggles and "Open Report" buttons.
  3. `Saved Reports` / Dynamic Report Viewer tab: Clicking "Open Report" in Tab 2 must seamlessly transition to Tab 3, populate the top collapsible advanced filters panel adapting dynamically to the report's supported filters (`Period`, `Party`, `Item`, `Salesperson`, `Status`, `Payment`, `From`, `To`, `Return Status`, `GST Rate`, `Min/Max Amount`), and render the dynamic table with pagination, print, and export capabilities.
  4. `Scheduled` tab with 4 KPI cards (`Active Schedules`, `Next Run`, `Reports This Month`, `Failures`), search/filters, a purple `+ New Schedule` button, action menu (`Run Now`, `Edit`, `Pause/Resume`, `Duplicate`, `View History`, `Delete`), and the exact `New Schedule` modal popup.
- **Root Cause in Web:**
  1. `ReportsController.js` and `index.html` implemented only a rudimentary 3-tab layout (`dashboard`, `center`, `scheduler`), completely skipping Tab 3 (`Saved Reports` / Dynamic Report Viewer).
  2. Tab 1 in web bypassed backend `/api/insights/report` filter parameters, attempting client-side aggregation over the first 100 sales/purchases without support for `Period`, `Party`, `Item`, or `Salesperson` filtering.
  3. Tab 2 in web lacked sub-category pills, favorite star persistence, and report cards; it rendered plain buttons and dumped rows into a static HTML table.
  4. Tab 3 did not exist as a dedicated dynamic viewer.
  5. Tab 4 lacked the 4 KPI cards, full action dropdown options, and accurate `New Schedule` modal fields.

---

### Issue B: Action Buttons in Bank Statement & Purchase Recon Missing Purple Accent
- **User Finding:** Action buttons in Bank Statement and Purchase Recon (PRC) screens are not in purple color like in other screens (Sales, Purchase, Reports).
- **Root Cause in Web:**
  1. `BankStatementController.js` line 540 hardcoded `<button class="btn-secondary" ...>`.
  2. `PurchaseReconController.js` line 102 hardcoded `<button class="btn btn-secondary btn-sm" ...>`.
  3. Other screens utilize the signature ERP purple accent (`class="btn-purple"` / `background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #fff;` or purple border). The secondary style made them appear dull gray/slate.

---

### Issue C: Bank Statement Match Link Navigation & Target Record Highlighting
- **User Finding:** When a bank entry is matched under the Bank Statement screen, clicking the match link fails to navigate to the corresponding Sales invoice, Purchase bill (e.g. `PR/2026/001`), or Purchase Recon (PRC) record, and does not highlight the matching record.
- **Root Cause in Web:**
  1. `BankStatementController.js` lines 1906–1958 `openLinkedDocument(docRef)` used crude hardcoded string prefixes (`ref.startsWith('INV') || ref.startsWith('SAL')` and `ref.startsWith('PO') || ref.startsWith('PUR') || ref.startsWith('BILL')`).
  2. When a bill starts with `PR/2026/001` (Purchase Record) or a sales invoice starts with `JI/25-2026/0144` (Jasvi Sales Invoice) or `SI/...`, it fell through all conditions into a generic toast message!
  3. It ignored the backend target type metadata (`t.linkedTargetType` or `allocation.targetType` which explicitly returns `"SALE"`, `"PURCHASE"`, or `"PURCHASE_RECON"`).
  4. Neither `SalesController`, `PurchaseController`, nor `PurchaseReconController` implemented visual row highlighting (such as a temporary glowing outline and `scrollIntoView()`).

---

### Issue D: Static Hardcoded Footer vs. Dynamic Desktop Footer
- **User Finding:** The web footer does not match desktop; in desktop it dynamically displays company details and ticks live.
- **Root Cause in Web:**
  1. `index.html` lines 8060–8070 hardcoded static text: `Jashvi Engineers`, `9099939193`, `ssdhameliya@gmail.com`.
  2. The company website (`https://jasviindustries.in`) was omitted.
  3. The clock was a static hardcoded date string rather than a live 1-second pulse.
  4. In Desktop (`SharedApplicationFooter.java`), the footer binds dynamically to `ConfigManager` / company profile (`companyName`, `phone`, `email`, `website`), hides blank fields, and runs a real-time `ClockService` formatted as `Day, DD Mon YYYY | HH:MM:SS AM/PM | Timezone` (e.g. `Sunday, 18 Oct 2026 | 09:04 PM | IST`).

---

### Issue E: Purchase Recon Import Dual Record Creation
- **User Finding:** Purchase Recon import should create records in both Purchase Recon (`purchase_recon`) and Recon Supplier (`recon_supplier`), exactly like Desktop.
- **Root Cause in Web:**
  1. The server-side Spring Boot service (`PurchaseReconService.java` lines 135–165) already possesses the dual-creation logic: if a supplier matching the GSTIN or Legal Name does not exist, it automatically creates a `ReconSupplierEntity` and persists it, then creates the `PurchaseReconEntity`.
  2. However, in `ImportService.js` line 1217, the payload sent `fingerprint: ...` instead of `sourceFingerprint: ...`.
  3. Because the Jackson DTO expected `sourceFingerprint`, the server rejected the import with `IllegalArgumentException: Import source fingerprint is required.`, preventing both tables from being populated.

---

### Issue F: AudioSynthesizer Missing Method Exception Breaking Import Completion
- **User Finding:** In Data Import Studio, when all validations pass and data is ingested into the database, an alert pop-up appears: `Import Error: window.AudioSynthesizer.playNotification is not a function`.
- **Root Cause in Web:**
  1. In `ImportController.js:348`, the code called:
     `if (res.failed === 0) window.AudioSynthesizer.playSuccess(); else window.AudioSynthesizer.playNotification();`
  2. In `AudioSynthesizer.js`, the method `playNotification()` was never defined (it only defined `playSuccess()`, `playError()`, `playNav()`, `playClose()`, `playKey()`, `playBarcodeBeep()`).
  3. When `res.failed > 0` (or skipped > 0), calling `playNotification()` threw a JavaScript `TypeError: window.AudioSynthesizer.playNotification is not a function`.
  4. The outer `try/catch` in `runImport()` caught this TypeError and displayed an `alert('Import Error: ...')`, masking the fact that the import had actually succeeded!
  5. AudioSynthesizer must implement `playNotification()` with pleasant ascending chimes, and all audio calls must be safely wrapped so that audio failures can NEVER crash ERP business transactions.

---

## 3. Detailed Screen & Workflow Parity Specifications

### 3.1 Tab 1: Dashboard Tab Parity (Image 1: `media_1792337741303.png`)
- **Header Actions:**
  - `Refresh` button (neutral outline)
  - `Export` purple button with dropdown (`Excel`, `PDF`, `CSV`)
- **Filter Bar (Top Panel):**
  - `Period`: Dropdown (`Today`, `Yesterday`, `This Week`, `Last Week`, `This Month`, `Last Month`, `This Quarter`, `Last Quarter`, `This Financial Year`, `Last Financial Year`, `Last 7 Days`, `Last 30 Days`, `Custom`)
  - `From Date`: Input datepicker
  - `To Date`: Input datepicker
  - `Party`: Dropdown (`All Customers / Suppliers` + dynamically loaded parties)
  - `Item`: Dropdown (`All Items` + dynamically loaded items)
  - `Salesperson`: Dropdown (`All Sales Persons` + dynamically loaded users)
  - `Reset` button & `Apply Filters` (purple button)
- **6 Standard Metric Cards:**
  1. `Active Sales`: Formatted amount (`₹ X.XX L`), `[Sales]` trend pill, `View Sales Register ->` link
  2. `Active Purchases`: Formatted amount (`₹ X.XX L`), `[Bills]` trend pill, `View Purchase Register ->` link
  3. `Gross Profit`: Formatted amount (`₹ XX,XXX.XX`), `[Margin]` trend pill, `View Profitability ->` link
  4. `Receivables`: Formatted amount (`₹ X,XXX.XX`), `[Pending]` trend pill, `View Ageing ->` link
  5. `Stock Value`: Formatted amount (`₹ XXXX.XX Cr`), `[Assets]` trend pill, `X low-stock items`
  6. `Customers`: Count (`2`), `[Active]` trend pill, `Active customers`
- **Middle Section:**
  - `Recent Sales Invoices` table with `View Report` button (Invoice No, Date, Customer, Amount, Status badge)
  - `Recent Purchase Invoices` table with `View Report` button (Invoice No, Date, Supplier, Amount, Status badge)
  - `Payment Snapshot` card (Total Receivables, Received Amount, Total Payables, Paid Amount)
- **Bottom Section (4 Cards):**
  - `Top Customers` (ranked list with revenue)
  - `Top Selling Items` (ranked list with sales value)
  - `Business Health` (Gross Margin %, Gross Profit, Sales Invoices)
  - `Stock Attention` (Total Items, Low Stock Items, Out of Stock, Stock Value)

---

### 3.2 Tab 2: Report Center Tab Parity (Image 2: `media_1792337766249.png`)
- **Header:** Title `Reports`, subtitle `Financial and operational intelligence`, right button `Recent Exports`.
- **Sub-Category Navigation Bar:**
  - `Favorites` (gold star)
  - `Sales`
  - `Purchase`
  - `Returns`
  - `GST / Tax`
  - `Receivable`
  - `Payable`
  - `Inventory`
  - `Banking`
  - `Profitability`
- **Fast Search Bar:** Placeholder `Search reports, e.g. GST...`
- **Report Catalog Cards Grid:**
  - Title with semantic icon
  - Favorite Star Button (yellow when active, toggles user preference and re-renders)
  - Description text
  - Purple `Open Report` button with eye icon.
  - **Behavior:** Clicking `Open Report` selects the report definition, sets default parameters, switches to **Tab 3 (`Saved Reports` / Dynamic Report Viewer)**, and immediately triggers query execution.

---

### 3.3 Tab 3: Saved Reports / Dynamic Report Viewer Parity (Image 3: `media_1792337802862.png`)
- **Top Advanced Filters Panel (Collapsible with `> Collapse ^`):**
  - Row 1: `Period`, `Party`, `Item`, `Salesperson`, `Status`
  - Row 2: `Payment`, `From Date`, `To Date`, `Return Status`, `% GST Rate`
  - Row 3: `Min Amount`, `Max Amount`
  - Active filter summary text (e.g. `Active filters: Period: 2026-10-01 to 2026-10-18`)
  - `Reset` button and purple `Apply Filters` button.
  - **Dynamic Visibility:** The filter boxes adapt automatically to `definition.supportedFilters()` (e.g. hiding GST Rate for Inventory reports).
- **Table Control Bar:**
  - Search input: `Search invoice / party / item / reference...`
  - Live record count: `Showing 1 to X of Y entries`
  - `Group By` dropdown (`None`, `Party`, `Item`, `Status`, etc.)
  - `Sort` dropdown
  - `Direction` dropdown (`Ascending`, `Descending`)
  - `Columns` dropdown for column visibility customization
  - Purple `Save Report` button
- **Dynamic Data Table:**
  - Headers and cells render dynamically according to report definition schema.
  - Money formatting for financial columns, date formatting, and semantic status badges (`PAID`, `PENDING`, `PARTIAL`, `RETURNED`).
- **Bottom Navigation & Action Bar:**
  - `View Source` button: Select a row and click `View Source` to deep-link directly into the originating sales invoice, purchase bill, or bank entry.
  - Pagination controls (`Rows per page: 25`, `<< First`, `< Previous`, `Page X / Y`, `> Next`, `>> Last`).
  - `Print` button.

---

### 3.4 Tab 4: Scheduled Reports Tab Parity (Image 4: `media_1792337816743.png`)
- **Header:** `Scheduled Reports`, subtitle `Server-side schedules built from Saved Reports with dynamic date presets and delivery history.`, right button `+ New Schedule` (purple).
- **4 Metric Cards:**
  1. `Active Schedules`: Count (`1`), `[Jobs]` badge, `Enabled`
  2. `Next Run`: Timestamp (`19 Oct 2026 02:36 AM`), `[Queue]` badge, `Server scheduler`
  3. `Reports This Month`: Count (`5`), `[Count]` badge, `Generated`
  4. `Failures`: Count (`0`), `[Alert]` badge, `Last 30 days`
- **Filter Row:**
  - Search input: `Search schedules...`
  - Dropdown `Status`: `All Status`, `ACTIVE`, `PAUSED`
  - Dropdown `Format`: `All Formats`, `PDF`, `XLSX`, `PDF + XLSX`, `CSV`
- **Schedules Data Table:**
  - Columns: `Schedule`, `Saved Report`, `Frequency`, `Time`, `Format`, `Delivery`, `Next Run`, `Status`, `Actions`
  - Action Button: Purple button `Actions ▼` opening dropdown menu:
    - `▶ Run Now`
    - `✏️ Edit`
    - `⏸️ Pause` / `▶️ Resume`
    - `📋 Duplicate`
    - `🕒 View History`
    - `🗑️ Delete` (red)

---

### 3.5 New Schedule Modal Parity (Image 5: `media_1792337855035.png`)
- **Dialog Header:** Information icon, `New Schedule`, Close button (`&times;`).
- **Form Fields:**
  1. `Schedule Name`: Text input (placeholder: `e.g. Daily Sales Summary`)
  2. `Saved Report`: Select dropdown (populated from `/api/reporting/schedules/saved-reports`, e.g. `123 — GST / Tax Report`)
  3. `Frequency`: Select dropdown (`Daily`, `Weekly`, `Monthly`, `Every Monday`, etc.)
  4. `Run Day`: Select dropdown (conditional on frequency)
  5. `Time`: Time text input (`08:00`)
  6. `Output`: Select dropdown (`PDF`, `XLSX`, `PDF + XLSX`, `CSV`)
  7. `Delivery`: Select dropdown (`Email`, `Download`, `Disk / Folder`)
  8. `Recipients`: Text input (placeholder: `accounts@company.com; owner@company.com`)
- **Help Note:** `The Saved Report keeps its dynamic date preset. For example, 'Previous Month' advances automatically every run.`
- **Footer Buttons:** `Cancel` button (with ❌) and `Create Schedule` green button (with ✓).

---

### 3.6 Action Buttons Purple Color Standard
- Update all row action buttons in `BankStatementController.js` and `PurchaseReconController.js` from `btn-secondary` to the signature purple button styling:
  - Class: `btn-purple` / `background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; border: none; font-weight: 600;`
  - Hover: `background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);`

---

### 3.7 Bank Statement Match Link Navigation & Row Highlighting
- **Comprehensive Document Type Resolution:**
  - Check transaction metadata: `t.linkedTargetType` or `allocation.targetType` (`SALE`, `PURCHASE`, `PURCHASE_RECON`, `EXPENSE`, `BANK_ENTRY`, `RETURN`).
  - Fallback document regex matching:
    - `SALE` / `INVOICE`: starts with `SAL`, `INV`, `JI/`, `SI/`
    - `PURCHASE` / `BILL`: starts with `PUR`, `PO`, `BILL`, `PR/`
    - `PURCHASE_RECON`: starts with `PRC`
    - `EXPENSE`: starts with `EXP`, `VCH`
- **Target Navigation & Row Flash Highlight:**
  - When navigating to `view-sales-register`:
    - Set search input to invoice number.
    - Call `SalesController.applyFilters()`.
    - Apply CSS flash class `.row-match-highlight` (pulsing gold/cyan border + background highlight) to the row and scroll it into view.
  - When navigating to `view-purchase-register`:
    - Set search input to purchase bill number.
    - Call `PurchaseController.applyFilters()`.
    - Apply CSS flash class `.row-match-highlight` and scroll into view.
  - When navigating to `view-purchase-recon`:
    - Set search input to recon reference / invoice number.
    - Call `PurchaseReconController.applyFilters()`.
    - Apply CSS flash class `.row-match-highlight` and scroll into view.

---

### 3.8 Dynamic Desktop Footer Parity
- **DOM Structure Update in `index.html`:**
  - Wrap company, phone, email, website in dedicated elements with IDs:
    - `#footer-trust-badge`: `Secure Local Reliable`
    - `#footer-company-name`: Dynamic company name
    - `#footer-phone`: Dynamic phone with phone icon
    - `#footer-email`: Dynamic email with email icon
    - `#footer-website`: Dynamic website with link icon
    - `#footer-live-clock`: Dynamic live ticking clock
- **Dynamic JavaScript Sync Engine:**
  - Reads company profile from `AuthService.getCurrentUser()?.companyProfile` or `/api/authority/business-profile`.
  - Hides blank fields; updates DOM instantly upon settings save or page load.
  - Starts an interval clock ticking every second formatted as:
    `Sunday, 18 Oct 2026 | 09:04:12 PM | IST`.

---

### 3.9 Purchase Recon Import Dual Record Creation
- **Payload Fix in `ImportService.js`:**
  - Fix property key from `fingerprint` to `sourceFingerprint` matching `PurchaseReconDtos.ImportRequest`:
    ```javascript
    const req = {
      sourceFileName: selectedFile?.name || 'Purchase_Recon_Import.xlsx',
      sourceFingerprint: `PRC-FP-${Date.now()}`,
      importNote: 'Imported via Data Import Studio',
      dryRun: false,
      rows: reconRows
    };
    ```
  - Verify that the server creates both `PurchaseReconEntity` and `ReconSupplierEntity` as confirmed by `PurchaseReconService.java` lines 135–165.

---

### 3.10 AudioSynthesizer Fix & Exception Guarding
- **Enhancement in `AudioSynthesizer.js`:**
  - Add `playNotification()` method synthesizing pleasant two-tone chimes (`659.25Hz -> 880Hz`).
- **Defensive Guarding in `ImportController.js` and Other Callers:**
  - Wrap all calls to `AudioSynthesizer` in optional chaining or `try/catch` blocks:
    ```javascript
    if (window.AudioSynthesizer) {
      try {
        if (typeof window.AudioSynthesizer.playSuccess === 'function' && res.failed === 0) {
          window.AudioSynthesizer.playSuccess();
        } else if (typeof window.AudioSynthesizer.playNotification === 'function') {
          window.AudioSynthesizer.playNotification();
        }
      } catch (_) {}
    }
    ```
  - Guarantees that audio/sound issues can NEVER disrupt or report false errors on successfully ingested ERP records.

---

## 4. Implementation Steps (Release 10.0.34.15)

1. **Audio Synthesizer Fix (`AudioSynthesizer.js` & `ImportController.js`):**
   - Implement `playNotification()`.
   - Add defensive safety guards around audio invocation across `ImportController.js`.
2. **Reports View Markup (`index.html`):**
   - Re-architect `#view-reports` with the 4-tab bar: `[Dashboard]`, `[Report Center]`, `[Saved Reports]`, `[Scheduled]`.
   - Embed Tab 1 dashboard filter panel.
   - Embed Tab 2 report catalog with horizontal category tabs, fast search, and report cards.
   - Embed Tab 3 saved reports viewer with collapsible 3-row filter panel, toolbar, table, and pagination.
   - Embed Tab 4 scheduled reports with 4 KPI cards and scheduler table.
   - Embed `#modal-new-schedule` popup matching Image 5.
3. **Controller Logic (`ReportsController.js`):**
   - Implement complete 4-tab routing and state management.
   - Wire Tab 1 filters to `/api/insights/report`.
   - Wire Tab 2 catalog to `/api/reporting/definitions` and favorite star persistence.
   - Wire "Open Report" transition to Tab 3 with dynamic filter box reflow.
   - Wire Tab 3 query execution to `POST /api/reporting/run`.
   - Wire Tab 4 schedules to `/api/reporting/schedules`.
4. **Action Button Styling (`BankStatementController.js` & `PurchaseReconController.js`):**
   - Change `btn-secondary` to `btn-purple` with purple gradient aesthetics.
5. **Deep-Link Navigation & Highlighting (`BankStatementController.js`, `SalesController.js`, `PurchaseController.js`, `PurchaseReconController.js`):**
   - Add robust document type resolution using `linkedTargetType` and prefixes.
   - Implement `.row-match-highlight` animation and scroll-into-view.
6. **Dynamic Footer Sync (`app.js` & `index.html`):**
   - Bind company details to business profile and start live ticking clock.
7. **Purchase Recon Import DTO Fix (`ImportService.js`):**
   - Change `fingerprint` to `sourceFingerprint`.

---

## 5. Verification Checklist

- [ ] Data Import completes cleanly without any `AudioSynthesizer.playNotification is not a function` error.
- [ ] Tab 1 Dashboard filters update all metrics and tables via `/api/insights/report`.
- [ ] Tab 2 Report Center displays all category pills and allows toggling favorites.
- [ ] Clicking "Open Report" on any card transitions to Tab 3 and loads the report.
- [ ] Tab 3 renders only relevant filter boxes, performs queries, and supports pagination/print/export.
- [ ] Tab 4 Scheduled Reports displays 4 KPI cards, opens New Schedule modal, and executes actions.
- [ ] Bank Statement and Purchase Recon action buttons render with purple styling.
- [ ] Bank Statement match link navigates to Sales, Purchases (`PR/...`), or Recon and visually highlights the row.
- [ ] Dynamic footer updates with company name, phone, email, website, and live ticking clock.
- [ ] Purchase Recon import creates records in both `purchase_recon` and `recon_supplier` tables.
