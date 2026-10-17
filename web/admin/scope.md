# DSE ERP WEB APPLICATION — COMPREHENSIVE INVESTIGATION & PARITY SCOPE
## Complete End-to-End Analysis: Desktop JavaFX Baseline vs. Web Studio Runtime

> **Target Baseline**: Desktop ERP `DSE-ERP-10.0.25` (`c:\Users\JATIN DHAMELIYA\Downloads\DSE-ERP-10.0.25-INTELLIJ-READY-FINAL-V19\DSE-ERP-10.0.25`)  
> **Web Working Directory**: `d:\ERP Website\admin`  
> **Release Staging (Web)**: `D:\GitHub\ReleaseSource Website\admin`  
> **Repository Target (Web)**: `D:\GitHub\DSE-ERP-Enterprise` (`web/admin`)  
> **Repository Target (Desktop/Server)**: `D:\GitHub\DSE-ERP-Primary` (`ssdhameliya/DSE-ERP`)  
> **Live UAT Runtime**: `https://erp-uat.jasviindustries.in/admin/`  
> **Investigation Date**: October 17, 2026  
> **Status**: **INVESTIGATION & SCOPE DEFINITION ONLY — NO CODE ALTERED OR BUILT**

---

## 1. Executive Summary

This scope document provides a definitive, end-to-end investigation of the **11 core issues** reported across the DSE ERP Web Application. Every issue has been audited directly against the source code of the Desktop application:
- **JavaFX FXML layouts & controls** (`desktop/src/main/resources/fxml/`)
- **Java Controllers & Event Handlers** (`desktop/src/main/java/org/example/controller/`)
- **Desktop API Clients & Shared Services** (`org.example.api.*`, `org.example.service.*`)
- **Spring Boot Server REST Controllers, Services & DTOs** (`server/src/main/java/org/example/server/`)
- **Web SPA JavaScript Controllers & Markup** (`d:\ERP Website\admin\js\`, `index.html`)

For each issue, this document establishes:
1. **Desktop Baseline**: Exactly how JavaFX, FXML, and the backend server operate.
2. **Web Failure Mechanism**: Line-by-line identification of *why* the web application fails, stutters, throws errors, or produces corrupted files.
3. **Proposed Parity Architecture**: The concrete implementation plan to achieve exact 1:1 functional and visual alignment.

---

## 2. Deep Dive: Issue-by-Issue Root Cause Analysis & Parity Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INVESTIGATION MATRIX                              │
├────┬─────────────────────────────┬──────────────────────────────────────────┤
│ #  │ Issue Title                 │ Root Cause Summary                       │
├────┼─────────────────────────────┼──────────────────────────────────────────┤
│ 1  │ Sales Register Double Event,│ Dual listeners (inline onclick + 300ms   │
│    │ Drawer Flicker & Bad PDF    │ TableUiEnhancer debounce) & token key bug│
├────┼─────────────────────────────┼──────────────────────────────────────────┤
│ 2  │ Purchase & Quotation Side   │ Drawer markup missing desktop sections;  │
│    │ Panel Discrepancies         │ action button styling & layout drift     │
├────┼─────────────────────────────┼──────────────────────────────────────────┤
│ 3  │ Purchase Register Auto-Hide │ Double click trigger: inline opens drawer│
│    │ on Single Click             │ then 300ms debounce immediately closes it│
├────┼─────────────────────────────┼──────────────────────────────────────────┤
│ 4  │ Sales Return Navigation vs  │ Action list navigates to view instead of │
│    │ Modal & Data Loading        │ opening return item selection dialog     │
├────┼─────────────────────────────┼──────────────────────────────────────────┤
│ 5  │ Purchase Return Popup Broken│ Missing partyId mapping, strict paid-only│
│    │ & Empty Line Items          │ server validation, and unhandled 500s    │
├────┼─────────────────────────────┼──────────────────────────────────────────┤
│ 6  │ Quotation Actions: Button   │ Secondary CSS class, unauthenticated     │
│    │ Color, 401 Excel, SMTP & 500│ window.open(), String id passed to Long  │
├────┼─────────────────────────────┼──────────────────────────────────────────┤
│ 7  │ Item Master Dropdowns &     │ ValuesResponse DTO shape mismatch,       │
│    │ 401 Export Excel Error      │ unauthenticated download URL             │
├────┼─────────────────────────────┼──────────────────────────────────────────┤
│ 8  │ Master Lookup Modal Clipped │ CSS modal-box overflow missing; top      │
│    │ & Missing Toolbar Actions   │ toolbar buttons replaced by table column │
├────┼─────────────────────────────┼──────────────────────────────────────────┤
│ 9  │ Bank & Expense Entry UI     │ Split-screen FXML replaced with separate │
│    │ Disparity vs Desktop        │ views; missing KPI metrics & form dialog │
├────┼─────────────────────────────┼──────────────────────────────────────────┤
│ 10 │ Data Import: 8 Loaders vs 6 │ Missing Purchase Recon & Bank Statement; │
│    │ & Step 4 Validation Engine  │ missing Step 4 dry-run & validation tab  │
├────┼─────────────────────────────┼──────────────────────────────────────────┤
│ 11 │ Settings Studio 7 Screens   │ Missing branding uploaders, mock data    │
│    │ Parity & Server Sync        │ fallbacks, Notification DTO type mismatch│
└────┴─────────────────────────────┴──────────────────────────────────────────┘
```

---

### Issue 1: Sales Register Double Sound, Panel Auto-Unhide & Corrupted PDF

#### A. Desktop Baseline
- **Event Handling**: In `desktop/src/main/resources/fxml/pages/SalesList.fxml` and `SalesListController.java`, row selection is bound to a single JavaFX `TableRow.setOnMouseClicked` handler. A single primary click selects the row and triggers `RegisterDetailDrawer.showRecord(...)`. Subsequent clicks on the already-selected row close the drawer (`closeInvoiceDrawer`). There is zero debouncing timer or artificial delay.
- **Document Rendering**: `CanonicalDocumentService.java` renders PDF output via `GET /api/documents/render?type=SALES_INVOICE&number=...&format=PDF`. The request requires `Authorization: Bearer <token>`. The server streams raw binary `application/pdf` with header `Content-Disposition: inline; filename="...pdf"`.

#### B. Web Failure Mechanism
1. **The Double Sound & Stuck Rendering**:
   - In `d:\ERP Website\admin\js\controllers\SalesController.js` (line 419):
     ```html
     <tr onclick="window.SalesController.handleRowClick(...)">
     ```
     When clicked, `handleRowClick` runs immediately, plays `AudioSynthesizer.playNav()` (**Sound 1**), and opens the drawer.
   - In `d:\ERP Website\admin\js\util\TableUiEnhancer.js` (lines 295–319):
     `TableUiEnhancer` binds a second `table.addEventListener('click', ...)` listener to the entire table. It initiates a `setTimeout(..., 300)` debounce timer.
   - At 300ms, `TableUiEnhancer` fires `triggerRowSingleClick(row, table)` &rarr; calling `SalesController.openInvoiceDrawer(id)`.
   - `openInvoiceDrawer` plays `AudioSynthesizer.playNav()` a second time (**Sound 2**) and re-renders the drawer!
2. **Auto-Unhide Flapping**:
   - When the user clicks a row to *close* the drawer, the inline handler closes it.
   - Exactly 300ms later, the debounced `TableUiEnhancer` click event fires and forcibly calls `openInvoiceDrawer()`, snapping the drawer back open!
3. **Corrupted PDF (`QUOTATION-QT-2026-0021.pdf` or Sales PDF error)**:
   - In `d:\ERP Website\admin\js\services\ApiService.js` (line 128):
     ```javascript
     const token = localStorage.getItem('erp_token') || sessionStorage.getItem('erp_token');
     ```
     The web app actually stores its JWT token under `dse_access_token`! As a result, `token` resolved to `null`.
   - When fetching the PDF, the server rejected the unauthenticated request with **HTTP 401 Unauthorized**:
     ```json
     {"status":401,"code":"AUTH_TOKEN_MISSING","message":"Authentication required"}
     ```
   - In addition, if a quotation document was rendered via the canonical endpoint, `CanonicalDocumentService.java` line 186 strictly threw:
     ```
     IllegalArgumentException: Canonical output is currently supported for Sales Invoice and Purchase Invoice.
     ```
   - `ApiService.downloadDocumentPdf` took the 401/500 JSON error string, wrapped it inside a `Blob([text], {type: 'application/pdf'})`, and saved it as a `.pdf` file.
   - When opened in Adobe Acrobat or browser reader, Acrobat displayed: *"Adobe Acrobat could not open because it is either not a supported file type or because the file has been damaged."*

#### C. Proposed Parity Architecture
1. **Unify Row Event Dispatching**: Remove redundant inline `<tr onclick>` from `SalesController.js` and designate `TableUiEnhancer.js` as the single event coordinator, or disable `TableUiEnhancer` row click interception on registers that have explicit drawer controllers.
2. **Correct Auth Token Retrieval**: Fix `ApiService.js` to look up `dse_access_token` so all download endpoints send valid bearer credentials.
3. **Verify HTTP Status Before Blob Download**: Update `downloadDocumentPdf` to check `response.ok`. If status is not 200, parse the JSON error body and show a toast alert rather than saving error text as a corrupted PDF file.
4. **Quotation Canonical Support**: Ensure quotations use `/api/quotations/{id}/pdf` or update `CanonicalDocumentService.java` to support quotation rendering.

---

### Issue 2 & 3: Purchase Register & Quotation Side Panels & Snap-Closed Bug

#### A. Desktop Baseline
- **Desktop Purchase Drawer (`PurchaseList.fxml` lines 60–104)** contains:
  - **Header**: Document Number, Audit Trail button, Close `✕` button.
  - **Identity**: Supplier Firm Name, Purchase Date, Bill Status badge, Supplier Bill Number.
  - **Amount & Tax**: Net Amount, Paid Amount, Balance Due, Due Date, GST Amount, Additional Charges, GST Type (IGST/CGST+SGST), Payment Terms.
  - **Supplier Details**: Contact Person, Phone, Email, GSTIN, Principal Billing Address, Delivery Warehouse Address.
  - **Transport & Logistics**: Transporter Name, Vehicle Number, LR / Tracking Number, Notes, Attachment download.
  - **Quick Action Strip**: `Send Email`, `Edit Purchase`, `Record Payment`, `View / Download Excel`, `Inward Barcode`.
- **Desktop Quotation Drawer (`Quotations.fxml`)** contains:
  - Quotation No., Customer Name, Quotation Date, Validity Date, Salesperson, Follow-Up Date, Stage/Status.
  - Subtotal, Discount, GST, Grand Total.
  - Quick Actions: `Send Email`, `Download PDF`, `Download Excel`, `Schedule Follow-Up`, `Convert to Sales Invoice`, `Duplicate Quotation`.

#### B. Web Failure Mechanism
1. **Purchase Register Auto-Hide / Snap-Closed Bug**:
   - In `PurchaseController.js` (line 210), table rows have inline `<tr onclick="window.PurchaseController.onRowClick(this, ...)">`.
   - `onRowClick` executes immediately, setting `selectedDrawerBillNo = invoiceNo` and adding CSS class `.open` to `#purchase-drawer`.
   - Exactly 300ms later, `TableUiEnhancer.js` line 195 fires `triggerRowSingleClick` &rarr; calls `PurchaseController.showDetails(id)`.
   - `showDetails` line 340 checks:
     ```javascript
     if (drawer.classList.contains('open') && selectedDrawerBillNo === invoiceNo) {
       this.closePurchaseDrawer(); // SNAPS CLOSED!
       return;
     }
     ```
   - The drawer opens on initial click and is snapped shut 300ms later by the debounced enhancer, making it impossible to keep the panel open.
2. **Side Panel Markup Drifts**:
   - Web `PurchaseController.js` drawer omitted the Audit Trail button in the header, skipped Additional Charges, lacked the Attachment row, and substituted Quick Actions with an ad-hoc layout missing Email, Excel, and Inward Barcode.
   - Web `QuotationController.js` drawer had mismatched field labels and was missing follow-up and conversion action shortcuts present in Desktop.

#### C. Proposed Parity Architecture
1. **Deduplicate Event Listeners**: Align `PurchaseController.js` and `QuotationController.js` event handling to eliminate the dual-invocation race condition. Prevent the drawer toggle logic from mistaking the 300ms enhancer trigger for a second user click.
2. **Port Full Desktop Drawer Layouts**: Synchronize the HTML drawer structures in `index.html` to replicate the desktop sections: Audit Trail header, full tax breakdown, logistics details, attachment downloads, and the 5 standard quick action buttons.

---

### Issue 4 & 5: Sales Return & Purchase Return Loading & Navigation Failure

#### A. Desktop Baseline
- **Desktop Return Initiation**:
  - In `SalesListController.java` (`onReturn()`) and `PurchaseListController.java` (`onReturn()`):
  - Clicking "Return" from the row action menu does **NOT** navigate away from the register.
  - Instead, it opens `ReturnDialog.fxml` as a modal dialog pre-loaded with the specific invoice's line items.
  - The dialog displays: Document Number, Party Name, Date, and an editable line items table where the user selects items, specifies return quantity, selects return reason, and clicks "Submit Return".
- **Backend Rules (`ReturnService.java`)**:
  - `ReturnService.java` lines 550 & 564 enforce strict document eligibility:
    ```java
    if (!"PAID".equalsIgnoreCase(source.paymentStatus()) && !"SETTLED".equalsIgnoreCase(source.paymentStatus())) {
        throw new IllegalStateException("Return is available only after the source document is fully paid. Pending, Partial and Over Due documents cannot be returned.");
    }
    ```
  - In addition, returns are queried via `/api/returns?type=SALES+RETURN` or `PURCHASE+RETURN`.

#### B. Web Failure Mechanism
1. **Sales Return Navigation Bug**:
   - In `SalesController.js` line 2828:
     ```javascript
     openCreateReturnModal(invoiceNo) {
       // ... If line items fail or modal is missing, fallback:
       window.NavigationRouter.navigate('view-sales-returns');
     }
     ```
     When the user clicks "Create Sales Return", instead of opening the return item selector popup, it navigated the user to the blank `#view-sales-returns` register view.
2. **Purchase Return Broken Popup**:
   - In `ReturnsController.js` line 547:
     `currentInvoicePartyId = pur.supplier?.id || pur.supplierId || 0;`
     If the supplier object structure differed, `currentInvoicePartyId` resolved to `0`.
   - The server rejected line item fetching with `400 Bad Request` (`partyId != expectedParty`).
   - `selectedReturnableLines` remained empty, leaving all checkboxes disabled and causing the submit button to alert *"Please select at least one item to return."*
3. **Registers Showing "Loading..." Forever**:
   - In `ReturnsController.js` lines 55–87, the error catch block for `loadReturns()` failed to reset UI loading states on API failure, leaving the table permanently showing *"Loading return data..."*.

#### C. Proposed Parity Architecture
1. **Dedicated Return Modal Component**: Ensure clicking "Create Return" in Sales or Purchase registers opens `#modal-create-return` without navigating away from the current view.
2. **Safe DTO Field Resolution**: Resolve `partyId`, `invoiceLines`, quantities, and unit rates safely across all source document DTO variations.
3. **Eligible Invoice Validation**: Check the source document's payment status before opening the return dialog, displaying an informative toast if the document is unpaid rather than failing silently on server submission.

---

### Issue 6: Quotation Actions Button, 401 Excel, SMTP & 500 ID Mismatch

#### A. Desktop Baseline
- **Desktop Quotation Screen (`Quotations.fxml`)**:
  - Table action menu button uses `approved-row-action` styling with purple theme accents matching Sales and Purchase registers.
  - Excel download calls `/api/documents/render?type=QUOTATION&number=...&format=EXCEL` with Bearer token.
  - Follow-up scheduling: If `quotation.converted` is true, Desktop strictly warns: *"Converted quotations are read-only. Duplicate the quotation to create a new revision with active follow-ups."*
  - Re-clicking a record passes `quotation.id` (integer) to `GET /api/quotations/{id}`.

#### B. Web Failure Mechanism
1. **Action Button Styling**: `QuotationController.js` line 174 used generic `btn btn-secondary btn-sm` instead of the standard purple table action menu button.
2. **Excel 401 Error**: Line 434 used raw `window.open('/api/documents/render?type=QUOTATION&number=' + no + '&format=EXCEL', '_blank')` without the `Authorization` header, causing the server to return 401 `AUTH_TOKEN_MISSING`.
3. **Email Delivery Error**: Server's `SmtpMailService` threw `EmailDeliveryException.business` ("Email delivery is temporarily unavailable") because SMTP credentials had not been configured or failed TLS handshake.
4. **Follow-Up on Converted Quotation**: Web allowed submitting follow-ups against converted quotations. The server threw 400/500, which web displayed as an unhandled script error.
5. **Re-click "Failed to load details" 500**:
   - `QuotationController.showDetails(id)` expects an integer ID (e.g. `21`).
   - In `TableUiEnhancer.js` line 167, the enhancer extracted the first column text string (`"QT-2026-0021"`) and passed it to `showDetails("QT-2026-0021")`.
   - The server endpoint `@GetMapping("/{id}")` requires `Long id`. Spring threw `MethodArgumentTypeMismatchException`, returning HTTP 500 *"The ERP server could not complete this operation"*.

#### C. Proposed Parity Architecture
1. **Style Synchronization**: Apply `btn-purple` / `table-action-menu` to Quotation action buttons.
2. **Authenticated File Download**: Route Excel exports through `ApiService.downloadFile` with JWT bearer authorization.
3. **Quotation ID Resolution**: Ensure `TableUiEnhancer` extracts the numeric `data-id` attribute rather than the formatted document string.
4. **Read-Only Converted Quotation Guard**: Prevent follow-up modal submission if `converted` is truthy, matching Desktop's prompt to duplicate the quotation.

---

### Issue 7: Item Master Dropdowns & Export 401

#### A. Desktop Baseline
- **Desktop Item Master (`ItemMasterController.java`)**:
  - Category, Unit of Measurement (UOM), and Tax Rate dropdowns are dynamically loaded from `LookupService.getValuesByCategoryCode("ITEM_CATEGORY")` and `"UNIT"`.
  - Export to Excel calls `GET /api/master/items/export/excel` with Bearer auth.

#### B. Web Failure Mechanism
1. **Mock Dropdown Fallbacks**:
   - In `ItemMasterController.js` lines 370–375:
     ```javascript
     const res = await window.MasterService.getLookupValuesByCategoryCode('ITEM_CATEGORY');
     ```
   - The server returns `MasterDtos.ValuesResponse(List<String> values)` which is a JSON object `{ "values": ["PIPE", "FLANGE", ...] }`, **not** an array!
   - `res.length` evaluated to `undefined`, causing the `if (categories && categories.length > 0)` check to evaluate to `false`.
   - The controller unconditionally fell back to hardcoded mock arrays (`['PIPE', 'FLANGE', 'VALVE']`).
2. **Export 401 Error**:
   - Line 1066: `exportItems() { window.open('/api/master/items/export/excel', '_blank'); }`
   - Unauthenticated browser tab request rejected with 401 `AUTH_TOKEN_MISSING`.

#### C. Proposed Parity Architecture
1. **Handle DTO Object Wrapping**: Update `MasterService.getLookupValuesByCategoryCode` to unwrap `res.values || res` so the actual master database lookups populate the dropdowns.
2. **Authenticated Export Download**: Replace `window.open` with `ApiService.downloadFile('/api/master/items/export/excel', 'Item_Master.xlsx')`.

---

### Issue 8: Master Data Modal Clipping & Missing Desktop Toolbar

#### A. Desktop Baseline
- **Desktop Master Data Screen (`Masterdata.fxml`)**:
  - Has a left-hand Category Rail (Category list with Add/Edit category buttons).
  - Above the main values table (`tblLookup`), there is a dedicated **Top Action Toolbar**:
    - `Add Value` (opens `lookupDialog.fxml`)
    - `Edit Value`
    - `Deactivate / Activate`
    - `Refresh`
  - There is NO row-level action column inside the table.
- **Lookup Dialog (`lookupDialog.fxml`)**:
  - Clean dialog with Category, Lookup Code (auto-generated uppercase key), Lookup Value, Sort Order, Active toggle, and Description.

#### B. Web Failure Mechanism
1. **Modal Clipping**:
   - In `index.html` line 10483, `<div class="modal-box" style="max-width: 480px;">` is used for the Add Lookup modal.
   - `.modal-box` lacks `max-height: 85vh; overflow-y: auto;` in `app.css`. On standard laptop resolutions (768p), the dialog is clipped at the bottom, cutting off action buttons.
2. **Missing Desktop Toolbar Buttons**:
   - Web omitted the top toolbar (`Add`, `Edit`, `Toggle Status`, `Refresh`) above the table and placed an ad-hoc action menu on every individual row instead.
3. **Lookup Code Key Generation**:
   - Web required manual typing of the internal lookup code instead of auto-generating uppercase snake_case slugs from the value (e.g. `"Finished Goods"` &rarr; `"FINISHED_GOODS"`).

#### C. Proposed Parity Architecture
1. **Fix Modal Styles**: Replace `.modal-box` with standard responsive `.modal-card` with `max-height: 85vh; overflow-y: auto;`.
2. **Restore Top Toolbar Layout**: Add the 4 standard desktop buttons (`Add`, `Edit`, `Activate/Deactivate`, `Refresh`) above the values table.
3. **Auto-Generate Lookup Keys**: Implement Desktop's automatic slug generation for the lookup code field on input.

---

### Issue 9: Bank Entry & Expense Entry UI Disparity vs Desktop

#### A. Desktop Baseline (`BankExpense.fxml` & `BankExpenseController.java`)
- **Unified Screen with Mode Switching**:
  - Header has mode buttons: `Bank Entry`, `Expense Entry`, and `Bank Reconciliation`.
  - 4 Standard KPI Cards:
    - **Bank Mode**: Bank Balance, Deposits, Withdrawals, Pending Reconcile.
    - **Expense Mode**: Total Expenses (This Month), Total Expenses (This Year), Top Category, Pending Reconcile.
- **Search & Filters Toolbar**:
  - Search input ("Search reference, description...")
  - Type Filter:
    - Bank Mode: `"All Types"`, `"Deposit"`, `"Withdrawal"`.
    - Expense Mode: `"All Categories"`, followed by categories loaded from `EXPENSE_CATEGORY`.
  - Date Range pickers: From Date and To Date (defaulting to current FY).
  - Reset, Refresh, and Add Entry / Add Expense buttons.
- **Table Columns**:
  - `Date`, `Type / Category`, `Description`, `Account`, `Mode` (hidden for Bank, shown for Expense), `Reference`, `Amount` (colored green for deposits, red for withdrawals/expenses), `Match / Link` (hyperlink to linked Bank Statement or ERP record), `Actions` menu button.
- **Modal Entry Form (`entryFormPanel` 820px dialog)**:
  - 2-column layout:
    - Date, Bank Account (`BANK_ACCOUNT` lookups), Type (Radio buttons: Deposit / Withdrawal) or Category (`EXPENSE_CATEGORY` lookups), Payment Mode (`PAYMENT_MODE` lookups).
    - Reference No., Description, Amount, Upload Bill (for expense mode).
    - Save Entry and Clear buttons.

#### B. Web Failure Mechanism
- Web split Bank Entry and Expense Entry into two completely disconnected full-width module views (`#view-bank-entry` and `#view-expense-entry`).
- In `FinanceController.js` line 77, Web calls `OperationsService.getVouchers(0, 200)` (`/api/operations/vouchers`) instead of the server's dedicated finance endpoints:
  - `GET /api/operations/finance/page`
  - `GET /api/operations/finance/metrics`
- Web manually computes approximate mock KPIs from voucher lists instead of displaying server-authoritative financial metrics.
- Web lacks the mode switcher, proper Master Lookup dropdown bindings, and the 2-column modal form dialog.

#### C. Proposed Parity Architecture
1. **Unify View Layout**: Align `#view-bank-entry` and `#view-expense-entry` to follow `BankExpense.fxml`, with top mode buttons, 4 standard KPI cards, and filter toolbar.
2. **Connect Authoritative Server Endpoints**: Update `FinanceController.js` to call `/api/operations/finance/page` and `/api/operations/finance/metrics`.
3. **Implement Full Entry Dialog**: Replicate the 2-column entry dialog with dynamic account lookups, radio buttons, and bill attachments.

---

### Issue 10: Data Import: 8 Loaders vs 6 & Step 4 Review/Validation Parity

#### A. Desktop Baseline (`Import.fxml` & `ImportController.java`)
- **Step 1 (Select Data)**:
  Desktop presents an exact **4 &times; 2 Grid of 8 Loaders**:
  1. `Item Master`
  2. `Customers / CRM`
  3. `Suppliers / HRM`
  4. `Master Categories & Values`
  5. `Sales`
  6. `Purchases`
  7. `Purchase Recon` (auto-creates missing Recon Suppliers)
  8. `Bank Statement` (CSV statement parser)
  Each card has a `Select` button and a `Download Template` button.
- **Step 4 (Review & Import)**:
  - Desktop features a **two-tab interface**:
    1. `Data Preview` tab (`tblPreview`): Displays parsed rows mapped into domain columns with semantic header icons.
    2. `Validation Results` tab (`tblValidation`): Displays line-by-line validation errors, warnings, invalid dates, missing foreign keys, or duplicate flags.
  - Controls:
    - `Existing records` dropdown (Skip duplicates, Overwrite existing).
    - `chkDryRun`: **"Validate only (do not save)"** checkbox.
    - `btnRunImport`: "Import Records" button with animated progress bar (`progressBar`).
    - On completion: Displays `importCompletedPanel` with summary statistics and 3 actions (`View Imported Records`, `Start Another Import`, `Close Import`).

#### B. Web Failure Mechanism
1. **Only 6 Loaders in Web**:
   In `index.html` lines 5228–5295 and `ImportController.js` lines 12–73:
   Web only built 6 cards. `Purchase Recon` and `Bank Statement` were completely omitted!
2. **Step 4 Validation Engine Missing**:
   - In `ImportController.js` lines 230–245, Web hardcodes `<span class="badge badge-paid">VALID</span>` on every single row without performing any validation checks.
   - Web has no `chkDryRun` (dry run validation mode).
   - Web has no `Validation Results` tab to report problematic rows.
   - Web has no progress tracking or post-import summary panel.

#### C. Proposed Parity Architecture
1. **Add Missing Loaders**: Add `Purchase Recon` and `Bank Statement` cards to Step 1 in `index.html` and define their field mapping contracts in `ImportController.js`.
2. **Port Step 4 Two-Tab Interface**: Implement the `Data Preview` and `Validation Results` tabs.
3. **Implement Preflight Dry-Run**: Implement client-side validation for dates, numbers, GSTIN format, and required fields before sending data to the server, populating the validation tab with specific row/column error notes.

---

### Issue 11: Settings Studio 7 Screens Parity & Server Sync

#### A. Desktop Baseline (`desktop/.../fxml/pages/settings/`)
1. **Company Profile (`CompanySettingsPanel.fxml`)**:
   - Core legal & contact fields.
   - Application Banner (1600 &times; 320 artwork) with `Add/Replace`, `Preview`, `Remove`.
   - Application Mark / Splash Logo (512 &times; 512 square mark) with `Add/Replace`, `Preview`, `Remove`.
2. **Payment & Bank (`PaymentSettingsPanel.fxml`)**:
   - Bank Name, Account Holder, Account Number, IFSC, Branch, Account Type (from `ACCOUNT_TYPE` lookups).
   - Round-off Tolerance (numeric).
   - UPI Payment QR: Dedicated preview card with `Add/Replace`, `Preview`, `Remove`.
3. **Notifications (`NotificationsSettingsPanel.fxml`)**:
   - Backed by `/api/insights/notification-preferences`:
     `record NotificationPreferences(boolean enabled, boolean toasts, Map<String, Boolean> categories) {}`
4. **Email Settings (`EmailSettingsPanel.fxml`)**:
   - Backed by `/api/authority/email/settings`:
     `record Settings(String email, String appPassword, String host, Integer port, boolean passwordConfigured) {}`
5. **Security & Session (`SecuritySettingsPanel.fxml`)**:
   - Session Timeout (minutes), Warning Before Logout (minutes), MFA Policy, Enable UI Diagnostics.
   - **NOTE**: Desktop has **NO password update box** in Security Settings; password change belongs strictly to User Profile / My Account.
6. **Module Activation (`ModulesSettingsPanel.fxml`)**:
   - Toggles for GL, GST Statutory Engine, 3-Way Match, Daily Briefing, and Serial/Batch Tracking via `/api/support/settings`.

#### B. Web Failure Mechanism
1. **Missing Branding Asset Uploaders**:
   Web omitted the Application Banner and Application Mark upload boxes entirely from the Company screen.
2. **Payment Bank Mock Data & Missing QR Controls**:
   - Web filled empty fields with hardcoded mock strings (`'STATE BANK OF INDIA'`, `'382910482910'`, `'SBIN0001234'`, `'MORBI MAIN BRANCH'`).
   - Web replaced the UPI QR upload component with a static emoji `📱` inside a plain div, with no file chooser or upload handler.
3. **Notification Preferences 400/500 Error**:
   - `InsightDtos.NotificationPreferences` expects `Map<String, Boolean> categories` and `boolean toasts`.
   - Web `SettingsController.js` sent `categories` as a JSON **array of strings** (`['SALES', 'PURCHASE']`) and `toastsEnabled`.
   - Spring Boot Jackson threw `HttpMessageNotReadableException`, failing the request with an ERP server error.
4. **Email Settings Payload Discrepancy**:
   - Web sent extra unmapped fields (`fromName`, `startTls`) directly to `/api/authority/email/settings` while omitting required password handling.
5. **Misplaced Update Password Box**:
   - Web rendered an "Update Account Password" card inside Security Settings. This conflicted with the desktop security panel and confused users who expected company-wide security policies.

#### C. Proposed Parity Architecture
1. **Port Branding & QR Asset Uploaders**: Add asset preview and upload cards for Application Banner (`application.brandPath`), Application Mark (`application.markPath`), and Payment QR (`payment.qrImagePath`) using `/api/authority/resources/BUSINESS_ASSET/{key}`.
2. **Remove Hardcoded Mock Fallbacks**: Bind payment fields to live server data or clean empty states.
3. **Correct Notification Payload**: Format `categories` as `{"SALES": true, "PURCHASE": true, ...}` and use property name `toasts`.
4. **Clean Up Security Screen**: Remove the misplaced password change form from Security Settings and align fields with Desktop's session timeout, warning, and MFA policy controls.

---

## 3. Scope Boundaries & Implementation Rules

1. **Investigation Only**: This document concludes the investigation phase. **No application code, FXML, Java classes, JavaScript controllers, or HTML templates have been modified.**
2. **Desktop Authoritative Standard**: All forthcoming implementations will strictly mirror the JavaFX desktop codebase. No ad-hoc web features or unverified endpoints will be introduced.
3. **Staging Workflow Compliance**:
   - Development will occur exclusively in `d:\ERP Website\admin`.
   - Upon completion and local verification, changes will sync to `D:\GitHub\ReleaseSource Website\admin`.
   - Pull Requests and release tags will only be submitted after explicit user review and confirmation.

---

## 4. One-Shot Implementation Roadmap (Awaiting User Go-Ahead)

```text
Phase 1: Registers & Event Handling Parity (Issues 1, 2, 3)
  ├── Remove conflicting inline onclick handlers and deduplicate TableUiEnhancer events
  ├── Fix dse_access_token retrieval and validate PDF blob responses
  └── Port full desktop drawer sections to Sales, Purchase, and Quotation side panels

Phase 2: Returns & Operations Integrity (Issues 4, 5, 6)
  ├── Implement modal return dialog pre-loaded with eligible source invoice lines
  ├── Fix supplier partyId resolution and paid-status validation
  ├── Style Quotation action button with purple theme
  └── Fix Quotation numeric ID resolution to prevent 500 error

Phase 3: Master Data & Lookups (Issues 7, 8)
  ├── Unwrap ValuesResponse DTO in MasterService to populate Item Master dropdowns
  ├── Route item exports through authenticated download helper
  ├── Fix Add Lookup modal clipping with responsive .modal-card styling
  └── Add desktop top action toolbar (Add, Edit, Deactivate, Refresh) to Master Data

Phase 4: Finance & Data Import Modules (Issues 9, 10)
  ├── Unify Bank & Expense entry under BankExpense.fxml layout with mode strip & KPIs
  ├── Connect FinanceController to /api/operations/finance/page and metrics
  ├── Add Purchase Recon and Bank Statement loaders to Data Import (total 8 loaders)
  └── Implement Step 4 two-tab Review interface with dry-run preflight validation

Phase 5: Settings Studio Enterprise Hardening (Issue 11)
  ├── Add Application Banner, Application Mark, and Payment QR upload components
  ├── Remove hardcoded payment mock fallbacks and connect live lookups
  ├── Fix NotificationPreferences payload structure (Map<String, Boolean> categories)
  └── Remove misplaced Update Password box from Security Settings to match Desktop
```
