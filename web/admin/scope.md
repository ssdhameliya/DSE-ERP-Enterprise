# SCOPE OF WORK: 100% DESKTOP PARITY & COMPREHENSIVE REGRESSION RESOLUTION

> **Project**: Jasvi Industries Enterprise ERP &mdash; Centralized Web Studio  
> **Target Baseline**: Desktop ERP `DSE-ERP-10.0.25` (`c:\Users\JATIN DHAMELIYA\Downloads\DSE-ERP-10.0.25-INTELLIJ-READY-FINAL-V19\DSE-ERP-10.0.25`)  
> **Working Directory**: `d:\ERP Website\admin`  
> **Release Staging**: `D:\GitHub\ReleaseSource Website\admin`  
> **Repository Target**: `D:\GitHub\DSE-ERP-Enterprise` (`web/admin`)  
> **Production & UAT Runtime**: `https://erp-uat.jasviindustries.in/admin/`  
> **Date**: October 17, 2026  

---

## 1. Executive Summary & Objective

The objective of this engagement is to eliminate all discrepancies between the Web Application (`d:\ERP Website\admin`) and the Desktop Application (`DSE-ERP-10.0.25`), resolve all existing functional and visual regressions, and achieve 100% end-to-end parity across all 24 identified points.

### Root Problem Statement
During initial rounds, fixes were applied locally in scattered JavaScript controllers without complete regression isolation, comprehensive version cache-busting, or exhaustive first-principles verification against the desktop codebase. When tested on UAT, functionality appeared broken or regressed due to:
1. **Asset Caching**: Browsers retaining stale script and stylesheet bundles.
2. **Missing Backend Event Triggers**: Notification Center and Returns expecting active server lifecycle events that web controllers were bypassing.
3. **Incomplete Desktop Dict Ports**: Label icons relying on a 15-keyword stub rather than the 1,355-line canonical `semantic-registry.properties`.
4. **Static HTML Mock Flashes**: Template rows in `index.html` rendering fake data before live API promises resolved.
5. **Event Listener Clashes**: Multiple click handlers on table rows conflicting with action dropdowns and drawers.

---

## 2. Complete 24-Point Scope & Technical Implementation Matrix

### Item 1: Sales Register Zero-Lag Drawer & Event Collision Elimination
* **User Requirement**: Click on record causes lag, freezing, and duplicate method execution. Must match desktop smooth single-click slide drawer and re-click hide behavior.
* **Desktop Reference**: `SalesListController.java` (`setRowFactory`, `RegisterDetailDrawer`), `RegisterUiSupport.java`.
* **Root Cause**: Web row click handlers were firing duplicate network calls (`getSaleByInvoice`) on every single click, blocking UI rendering.
* **Technical Scope**:
  - Implement instant synchronous population from `salesCache` in `SalesController.js`.
  - Fetch line items and history asynchronously in background without freezing the UI.
  - Implement clean toggle: clicking an active selected row toggles `#drawer-invoice-details` closed; clicking another row switches selection smoothly.
  - Prevent event bubbling (`event.stopPropagation()`) on checkboxes, links, and action buttons.

### Item 2: Sales Table Columns Parity (WhatsApp Removal & Email Status Badge)
* **User Requirement**: Remove WhatsApp table header and column. Email header should display only read-only status (`SENT` / `NOT SENT`) for all records.
* **Desktop Reference**: `SalesList.fxml` (`colMail` TableColumn), `SalesListController.java`.
* **Technical Scope**:
  - Remove WhatsApp `<th>` and `<td>` from `index.html` and `SalesController.js`.
  - Adjust empty state `colspan="14"`.
  - Render Email as a non-clickable status badge (`badge-paid` / `badge-pending`) based on boolean `mailSent` / `emailStatus`.

### Item 3: Duplicate Sale & Duplicate Purchase Desktop Parity
* **User Requirement**: Duplicate Sale & Duplicate Purchase should open the creation workspace populated with the existing record's lines, customer/supplier, and items, allowing changes before saving, matching desktop `prepareDuplicate()`.
* **Desktop Reference**: `SalesController.java` (`prepareDuplicate`), `PurchaseController.java` (`prepareDuplicate`).
* **Technical Scope**:
  - In `SalesController.js` and `PurchaseController.js`, implement `prepareDuplicate(entity)`:
    - Sets `editingSale = null` / `editingPurchase = null`.
    - Clones all line items and additional charges.
    - Sets invoice date to current date (`BusinessClock.today()`).
    - Clears attachments, payment transactions, and audit metadata.
    - Requests next sequential document number from `/api/operations/sales/next-invoice` or `/api/operations/purchases/next-bill`.
    - Navigates immediately to the creation workspace tab (`#view-sale-create` / `#view-purchase-creation`).

### Item 4: Direct PDF Download Instead of Full-Page Blob Navigation
* **User Requirement**: Clicking View / Download PDF opens a new tab navigating to `blob:...` which reloads the web application. Must download the PDF directly.
* **Desktop Reference**: `DesktopUiUtil.java` (`exportPdfDirect`), `InvoicePrintService.java`.
* **Technical Scope**:
  - In `ApiService.js`, route `openPdfPreview(type, no)` directly to `downloadDocumentPdf(type, no)`.
  - Create a hidden anchor element (`<a>`) with `download="${filename}.pdf"` and trigger `.click()` cleanly without viewport navigation.

### Item 5: Form Label Icons Across All Pages (Desktop Centralized Logic)
* **User Requirement**: Label icons are missing across forms on all pages. Desktop has centralized logic for label icons.
* **Desktop Reference**: `UiSemanticRegistry.java`, `semantic-registry.properties` (1,355 lines of field-to-icon mappings), `IconFactory.java` (`semanticForLabel`).
* **Root Cause**: `UiSemanticRegistry.js` had a tiny 15-word regex dictionary that missed >70% of business fields (`Full Name`, `Department`, `Branch`, `Category`, `Unit`, `Terms`, `Status`, `Role`, `Credit Limit`, `GSTIN`, etc.).
* **Technical Scope**:
  - Port the full `semantic-registry.properties` field dictionary into `UiSemanticRegistry.js`.
  - Enhance `LabelIconEnhancer.js` to automatically decorate all `<label>` tags with matching glyph spans.
  - Hook `GlobalUiEnhancer.enhance()` into `NavigationRouter.selectNav()` and `AppDialogService.openModal()` so every newly opened view and modal is automatically iconified.

### Item 6: In-Place Purchase & Sales Return Modal
* **User Requirement**: Purchase return and sales return row action triggers navigation to a separate return screen instead of opening an in-place modal popup to select items and return.
* **Desktop Reference**: `SalesReturnsController.java` (`openCreateReturnDialog`), `PurchaseReturnsController.java`, `CreateReturnDialog.fxml`.
* **Technical Scope**:
  - In `SalesController.js` and `PurchaseController.js`, bind "Return" action directly to `ReturnsController.openCreateReturnModal(invoiceNo, type)`.
  - Open `#modal-create-return` directly in-place over the active register without changing navigation tabs or unmounting state.

### Item 7: Purchase & Sales Returns Infinite Loading State Fix
* **User Requirement**: Returns register does not display data and stays stuck showing "Loading sales/purchase return data...".
* **Desktop Reference**: `ReturnController.java` (`/api/returns/page`), `SalesReturnsController.java`.
* **Root Cause**: When `/api/returns/page` returned an empty array or null metrics, `ReturnsController.js` failed to clear the static loading spinner row, leaving the register hung.
* **Technical Scope**:
  - Guard `loadReturns()` in `ReturnsController.js` with defensive array unboxing:
    `const rows = data?.rows || (Array.isArray(data) ? data : []);`
  - Immediately render the clean empty-state card if count is 0.
  - Implement a 7-second fetch timeout with a user-facing retry button and toast notification on network failure.

### Item 8: Quotation Action Button Dropdown Clipping Fix
* **User Requirement**: Quotation action dropdown button is not clickable or clipped by the table container.
* **Desktop Reference**: `QuotationsController.java` (`setupActionColumn`), `Quotations.fxml`.
* **Technical Scope**:
  - In `QuotationController.js`, rewrite `toggleActionMenu()` to use fixed viewport positioning:
    - Compute coordinates via `button.getBoundingClientRect()`.
    - Apply `position: fixed`, `z-index: 100005`, and calculate viewport collision boundaries.
  - Close dropdown automatically on outside click, window resize, or table scroll.

### Item 9: Item Master 18 Columns Parity with Desktop
* **User Requirement**: Item Master table headers and columns do not match desktop ERP.
* **Desktop Reference**: `ItemMaster.fxml` (18 columns), `ItemMasterController.java`.
* **Technical Scope**:
  - Verify and align all 18 columns in `index.html` and `ItemMasterController.js`:
    1. Select Checkbox
    2. SKU / Item Code
    3. Item Name / Description
    4. Category
    5. Brand
    6. Material / Variant
    7. HSN / SAC Code
    8. Unit of Measurement (UOM)
    9. Purchase Cost (Excl. Tax)
    10. Selling Price (Excl. Tax)
    11. Tax Rate (% GST)
    12. Current Stock On-Hand
    13. Min Reorder Point
    14. Max Stock Threshold
    15. Barcode / Universal ID
    16. Status (Active/Inactive)
    17. Last Updated
    18. Actions (`::: Actions`)

### Item 10: Add Master Lookup Modal UX & Code Auto-Generation
* **User Requirement**: Add Lookup popup is difficult to fill and does not feel like desktop.
* **Desktop Reference**: `MasterdataController.java` (`showAddLookupDialog`), `AddLookupDialog.fxml`.
* **Technical Scope**:
  - Redesign `#modal-add-lookup` with desktop-matching layout, field labels, and semantic icons.
  - Code field is marked read-only and automatically populated by calling `GET /api/master/lookups/next-code?type={CATEGORY}`.
  - Auto-focus on `Value` input with keyboard accelerator `Enter` to submit.

### Item 11: Master Lookup Unique Key Generation & Method Aliasing
* **User Requirement**: Master lookup unique key should be auto-generated for all categories.
* **Desktop Reference**: `MasterdataController.java`, `LookupService.java`.
* **Technical Scope**:
  - In `MasterDataController.js`, ensure auto-generation of unique keys (`UPPERCASE_SNAKE_CASE` or sequential alphanumeric).
  - Add backward-compatible alias `submitSaveLookup = submitLookupSave` to prevent uncaught runtime errors in form callbacks.

### Item 12: Import Bank Statement Dynamic Bank Instructions
* **User Requirement**: Import bank statement popup displays mock bank instructions instead of live values from master lookups.
* **Desktop Reference**: `BankStatementController.java`, `BankStatementImportDialog.fxml`.
* **Technical Scope**:
  - In `BankStatementController.js`, dynamically populate bank account dropdown from `GET /api/master/lookups?type=BANK_ACCOUNT`.
  - Render specific file layout guidelines (CSV column headers, date format, delimiter) based on the selected bank institution.

### Item 13: Purchase Register Drawer Binding & Row Toggle Parity
* **User Requirement**: Purchase register row click does not behave like desktop; drawer fields missing values; re-click does not hide drawer.
* **Desktop Reference**: `PurchaseListController.java`, `RegisterDetailDrawer.java`.
* **Technical Scope**:
  - Bind all `pd-...` drawer elements (`pd-invoice-no`, `pd-supplier-name`, `pd-bill-date`, `pd-subtotal`, `pd-tax-amount`, `pd-grand-total`, `pd-status`, etc.).
  - Implement instantaneous synchronous population from `purchasesCache`.
  - Re-clicking the selected row smoothly collapses `#drawer-purchase-details-inspect`.

### Item 14: Purchase Recon, Supplier Recon & Inventory Action Menus
* **User Requirement**: Action lists and menus in Purchase Recon, Recon Supplier, and Inventory Ledger do not match desktop.
* **Desktop Reference**: `PurchaseReconController.java`, `SupplierReconController.java`, `InventoryController.java`.
* **Technical Scope**:
  - Replace raw inline buttons with standardized `::: Actions` purple dropdown buttons.
  - Wire actions: Match with 2B, Dispute Invoice, Accept Discrepancy, View Ledger, Export Statement.

### Item 15: CRM / Customers & HRM / Suppliers Drawer Integration
* **User Requirement**: Clicking records in CRM / HRM opens disruptive 360 modal instead of side drawer with clean actions matching desktop.
* **Desktop Reference**: `CustomerController.java`, `SupplierController.java`.
* **Technical Scope**:
  - In `TableUiEnhancer.js` and `PartyController.js`, replace full 360 modal trigger with side inspection drawer.
  - Drawer exposes: Party Overview, Billing Address, Shipping Address, Ledger Balance, Outstanding Invoices, and quick actions (New Transaction, Statement PDF, Edit Party).

### Item 16: Reporting Dashboard UI & Multi-Tab Layout Parity
* **User Requirement**: Reporting Dashboard UI does not match desktop; needs full module inspection and 2-tab layout.
* **Desktop Reference**: `ReportsController.java`, `Reports.fxml`.
* **Technical Scope**:
  - Implement desktop 2-tab structure in `#view-reports`:
    - Tab 1: Executive Analytics (6 KPI cards, Payment Snapshot, Top Customers, Top Selling Items, Gross Margin Bar).
    - Tab 2: Standard Reports Register & Report Generation Engine.
  - Wire all 6 KPI cards to real data from `ReportService.getExecutiveMetrics()`.

### Item 17: Reminder Center Parity with Desktop
* **User Requirement**: Reminder Center looks different from desktop; needs full desktop parity.
* **Desktop Reference**: `ReminderCenterController.java`, `ReminderCenter.fxml`.
* **Technical Scope**:
  - Bind to `/api/insights/reminders`.
  - Render desktop 4-tab filter: `ALL`, `OVERDUE`, `DUE TODAY`, `UPCOMING (NEXT 7 DAYS)`.
  - Implement desktop action modals: Complete Follow-up, Snooze, Create Reminder, Link to Invoice.

### Item 18: User Access RBAC Permissions Table 400 Bad Request Fix
* **User Requirement**: User access buttons and permission matrix not working like desktop.
* **Desktop Reference**: `UserAccessController.java`, `PermissionMatrixController.java`.
* **Technical Scope**:
  - In `ReportService.js`, add required query parameter `?role=ADMIN` to `/api/reports/user-access-matrix`.
  - Wire permission toggle checkboxes to `PUT /api/users/{id}/permissions` with optimistic UI updates.

### Item 19: Communication Center Status Recognition (`SENT` vs Pending)
* **User Requirement**: Communication logs show all records as "Pending" even when delivered.
* **Desktop Reference**: `CommunicationCenterController.java`.
* **Technical Scope**:
  - Update `CommunicationController.js` status mapping: treat `SENT` and `DELIVERED` as success states.
  - Display green status pill `SENT` with timestamp and increment Sent KPI counter.

### Item 20: Settings Sidebar Accordion & Dedicated Profile View
* **User Requirement**: Settings hide/unhide menu does not match desktop; settings navigate to profile working differently; all submenus must match desktop.
* **Desktop Reference**: `Dashboard.fxml` (`settingsSubmenu` with 10 child buttons), `SettingsController.java` (`Section` enum: COMPANY, PAYMENT, INVOICE, NOTIFICATIONS, EMAIL, SECURITY, WORKSPACE, SHORTCUTS, UPDATES, MODULES), `Profile.fxml`, `ProfileController.java`.
* **Technical Scope**:
  - Refactor Settings navigation in `index.html` sidebar into an accordion group `grp-settings` containing the exact 10 desktop submenus:
    1. Company & Billing
    2. Payment & Bank
    3. Invoice & Delivery
    4. Notifications
    5. Email Settings
    6. Security & Session
    7. Workspace & Storage
    8. Keyboard Shortcuts
    9. Application Updates
    10. Module Activation (`chkGlEnabled`, `chkGstEnabled`, `chkThreeWayMatch`, etc.)
  - Implement `#view-profile` matching `Profile.fxml` as a dedicated workspace view (Full Name, Email, Department, Branch, Account Overview, Password Change).
  - Update top-right profile dropdown to select `#view-profile` rather than opening a modal.

### Item 21: Notification Center Live Event Dispatcher
* **User Requirement**: No notifications coming to Notification Center; must store events based on desktop behavior with full button actions.
* **Desktop Reference**: `NotificationService.java`, `NotificationCenterController.java`, `/api/insights/notifications`.
* **Technical Scope**:
  - Create centralized `window.NotificationService.createNotification(category, title, message, severity, targetView, referenceNo)` in web.
  - Hook dispatcher into all controller operational events: Sale created/cancelled, Purchase saved, Return created/approved, Payment recorded, Backup performed.
  - In `NotificationCenterController.js`, bind to `/api/insights/notifications?limit=500`, update header badge counter, and wire all buttons: *Mark All Read*, *Clear History*, *Open Record*.

### Item 22: Header Live Clock with Date, Time & IST Format
* **User Requirement**: Top bar displays date only; timestamp and IST label missing.
* **Desktop Reference**: `DashboardController.java` (`updateSystemClock`), `shellClockCard`.
* **Technical Scope**:
  - Format live ticking header clock in `app.js` to:
    `${dayOfWeek}, ${day}/${month}/${year} | ${hours}:${minutes}:${seconds} ${ampm} IST`
  - Update every 1,000ms synchronously.

### Item 23: Dashboard Elimination of Mock Data Flash on Refresh
* **User Requirement**: Dashboard flashes mock/dummy data on page refresh before real UAT data appears.
* **Desktop Reference**: `DashboardHomeController.java`, `Dashboard.fxml`.
* **Root Cause**: `index.html` lines 881-883 and 909-923 had static HTML placeholder text (`"Shailesh Dhameliya ₹78,780.00"`, `"test completed - GST / Tax Report"`).
* **Technical Scope**:
  - Remove all hardcoded dummy customer and activity rows from `index.html`.
  - Replace with subtle skeleton loaders (`<div class="skeleton-shimmer"></div>`) or empty state indicators (`"Loading live metrics..."`) until `DashboardController.refresh()` completes.

### Item 24: Reminder KPI Cards Centralized Logic & Styling
* **User Requirement**: Reminder KPI cards do not match desktop styling or follow centralized design system.
* **Desktop Reference**: `ReminderCenter.fxml`, `KpiCardEnhancer.java`.
* **Technical Scope**:
  - Restructure Reminder KPI cards into 4 standard `metric-card` containers with semantic icons:
    1. Total Reminders (`blue`)
    2. Overdue (`red`)
    3. Due Today (`yellow`)
    4. Upcoming 7 Days (`green`)
  - Hook into `KpiCardEnhancer.js` for consistent glassmorphic styling and glow accents.

---

## 3. Regression Prevention & Quality Assurance Protocol

To ensure zero regressions across all modules:
1. **Cache Busting**: Bump asset query string across all script and CSS imports from `?v=10.0.33.10` to `?v=10.0.33.11`.
2. **Lexer & Syntax Verification**: Execute automated parenthetical/brace syntax audit across all 25 controllers and services.
3. **Event Listener Hygiene**: Cleanly remove or unbind obsolete DOM listeners before re-attaching new ones.
4. **Three-Way Workspace Synchronization**:
   - Primary: `d:\ERP Website\admin`
   - Release Staging: `D:\GitHub\ReleaseSource Website\admin`
   - Enterprise Git: `D:\GitHub\DSE-ERP-Enterprise` (`web/admin`)
5. **Direct Verification on Live UAT**: Test each feature directly against live endpoints on `https://erp-uat.jasviindustries.in/admin/`.

---

## 4. Execution Phases

* **Phase 1**: Core Controller Fixes & Regression Elimination (Items 1, 2, 3, 4, 6, 7, 8, 13, 23).
* **Phase 2**: Master Data, Lookups & Table Headers (Items 9, 10, 11, 12, 14, 15).
* **Phase 3**: Centralized Presentation & Semantic Label Icons (Items 5, 22, 24).
* **Phase 4**: Settings Studio, Profile & RBAC Parity (Items 16, 18, 19, 20).
* **Phase 5**: Notification Center Live Dispatcher & Final UAT Verification (Item 21, Full 24-point regression sweep).
