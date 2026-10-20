# Jasvi Industries ERP — Web Parity Deep Investigation Report
**Document Version:** 1.0.0  
**Date:** 2026-10-20  
**Target Repositories:** 
- **Desktop (Source of Truth):** `c:\Users\JATIN DHAMELIYA\Downloads\DSE-ERP-10.0.25-INTELLIJ-READY-FINAL-V19\DSE-ERP-10.0.25` (Release 10.0.36)
- **Web Build (Under Analysis):** `d:\ERP Website\admin`
- **Visual Baseline:** `C:\Users\JATIN DHAMELIYA\Downloads\Desktopscreenshot.docx` (20 High-Resolution Screen Captures)

---

## Executive Summary
This report presents a thorough, code-level investigation comparing the latest Desktop ERP (10.0.36) and the current Web build (`d:\ERP Website\admin`). Across all 10 reported areas, the investigation has identified the precise root causes, file locations, missing elements, and architectural discrepancies in the web build. 

No code changes or builds have been executed in this phase. This report serves as the complete technical blueprint for implementation once approved.

---

## Issue 1: Quotation Creation — Attachment Lifecycle (Add/Replace/Preview/Delete) & View/Download
### 1. User Complaint
> *"1) Creation quatation - Attachment Add/Replace-Preview-Delete is missing and make sure that when user view quatation attchment should be preview and download"*

### 2. Desktop Investigation (Source of Truth)
- **Files:**
  - `desktop/src/main/java/org/example/controller/QuotationController.java` (Lines 153–158)
  - `desktop/src/main/java/org/example/controller/QuotationEditorController.java` (Lines 350–371)
- **Desktop Architecture:**
  - `QuotationEditorController` maintains three distinct state variables: `selectedAttachment` (Path), `existingAttachment` (String reference), and `attachmentRemovalPending` (boolean).
  - UI provides an attachment box with `btnAttachmentAdd` (dynamically labeled "Add" or "Replace"), `btnAttachmentPreview` (loads binary via `AttachmentPreviewSupport`), and `btnAttachmentRemove`.
  - When saving (`save()`, Line 360), after saving the quote record, it uploads the binary document to:
    `POST /api/support/documents/QUOTATION/{id}/attachment-file`
    or deletes it if removal is pending via:
    `DELETE /api/support/documents/QUOTATION/{id}/attachment-file`.
  - In `QuotationController.java` (table view and details), clicking "Preview Attachment" calls `supportApi.documentAttachment("QUOTATION", q.id)` (`GET /api/support/documents/QUOTATION/{id}/attachment-file`) and streams the binary content directly to the user.

### 3. Web Investigation (`d:\ERP Website\admin`)
- **Files:**
  - `js/controllers/QuotationController.js`
  - `index.html` (Lines 2772–2929, `#view-quotation-editor`)
- **Current Findings:**
  - In `index.html` (Lines 2772–2929), the quotation editor form has General Info, Line Items, and Totals, but **zero attachment HTML elements**.
  - In `QuotationController.js`, `openQuotationEditor` has no attachment state management (`selectedAttachment`, `existingAttachment`, `attachmentRemovalPending`).
  - In `QuotationController.js` `saveQuotation()` (Lines 800–864), the payload completely omits attachment handling and never calls the attachment API endpoint.
  - In `showDetails()` (drawer view, Lines 300–337), there is no UI element to view, preview, or download an attached quotation file.

### 4. Root Cause
The quotation editor in web was built without the attachment subsystem. Quotation records cannot accept files during creation/editing, and the slide drawer lacks the download/preview action bindings to `/api/support/documents/QUOTATION/{id}/attachment-file`.

### 5. Technical Fix Plan
1. **HTML (`index.html`):**
   - Add a branded attachment card into `#view-quotation-editor` matching the Settings Branding layout (dashed container, file status, thumbnail preview icon, hidden file input, and 3 buttons: `+ Add / Replace`, `👁 Preview`, `Remove`).
   - Add an "Attached Document" section in the quotation slide drawer (`#quote-detail-drawer`) with a "Preview" and "Download" button.
2. **JavaScript (`QuotationController.js`):**
   - Add attachment state variables: `pendingAttachmentFile`, `existingAttachmentPath`, `attachmentRemovalPending`.
   - Implement `handleAttachmentSelected(input)`, `previewEditorAttachment()`, `removeEditorAttachment()`, and `refreshAttachmentUi()`.
   - Update `saveQuotation()`: Upon receiving the saved quotation ID, if `pendingAttachmentFile` exists, upload the binary using `FormData` to `/api/support/documents/QUOTATION/{id}/attachment-file`. If `attachmentRemovalPending`, call `DELETE /api/support/documents/QUOTATION/{id}/attachment-file`.
   - Update `showDetails(id)`: Fetch attachment metadata from quotation DTO (`q.attachment`). If present, render the file name with clickable "👁 Preview" and "📥 Download" buttons pointing to `/api/support/documents/QUOTATION/{id}/attachment-file`.

---

## Issue 2: Sales & Purchase Creation — Delivery Address & GSTIN Desyncing when "Same as Billing" is Ticked
### 1. User Complaint
> *"2) Sell and Purchase Creation - I still see Delivery address and GSTIN number is updated even As Billing Address falg si ticked."*

### 2. Desktop Investigation (Source of Truth)
- **Files:**
  - `desktop/src/main/java/org/example/controller/SalesController.java` (Lines 301–318, 507–509, 1395–1402, 1526–1545)
- **Desktop Architecture:**
  - When `chkSameAsBilling` is checked:
    ```java
    txtDeliveryAddress.setText(txtBillingAddress.getText());
    txtDeliveryGstin.setText(txtBillingGstin.getText());
    txtDeliveryAddress.setEditable(false);
    txtDeliveryGstin.setEditable(false);
    txtDeliveryAddress.setOpacity(0.88);
    txtDeliveryGstin.setOpacity(0.88);
    ```
  - When billing address or GSTIN text changes, real-time listeners immediately replicate values into `txtDeliveryAddress` and `txtDeliveryGstin`.
  - When saving, if `chkSameAsBilling` is selected, delivery address is strictly guaranteed to equal billing address. If unchecked and details match billing, validation warning 1400 prevents saving until distinct details are provided.

### 3. Web Investigation (`d:\ERP Website\admin`)
- **Files:**
  - `js/controllers/SalesController.js` (Lines 1005–1006, 1140–1186, 1845–1879, 1950–1955)
  - `js/controllers/PurchaseController.js` (Lines 1420–1440, 1663–1679)
  - `index.html` (Lines 1902–1908, `#ws-same-address`)
- **Current Findings:**
  - In `SalesController.js`:
    1. During `initSaleWorkspace()`, line 1006 sets `chkSame.checked = true;`, but **fails to call `this.toggleSameAddress(true)`**. As a result, `ws-delivery-address` and `ws-delivery-gstin` remain editable text inputs without the `readonly` attribute!
    2. When opening an existing sale (`existingSale`), `chkSame` is never initialized based on `existingSale.sameAsBilling`.
    3. Even when `chkSame` is checked, the user can manually click into `ws-delivery-address` or `ws-delivery-gstin` and alter the text.
    4. On submit, line 1849 extracts `deliveryAddress = (document.getElementById('ws-delivery-address') || {}).value || ''` directly from the input without forcing it to match `billingAddress` when `chkSame.checked` is true!
  - In `PurchaseController.js`:
    1. `onSameAsBillingToggle()` is not invoked on editor initialization.
    2. When editing an existing purchase, `pe-same-as-billing` is never checked or synced.

### 4. Root Cause
1. `toggleSameAddress(true)` is not invoked during workspace initialization or existing record loading.
2. Form submit payloads read raw DOM values from the delivery inputs rather than strictly enforcing `billingAddress` and `billingGstin` when the flag is enabled.

### 5. Technical Fix Plan
1. **In `SalesController.js`:**
   - In `initSaleWorkspace()`: Always evaluate `const same = existingSale ? (existingSale.sameAsBilling !== false && (existingSale.billingAddress === existingSale.deliveryAddress)) : true;`. Set `chkSame.checked = same;` and call `this.toggleSameAddress(same);`.
   - In `toggleSameAddress(isSame)`: When `isSame` is true, copy billing values, set `readonly` on delivery inputs, apply CSS style `background: rgba(255,255,255,0.03); opacity: 0.85; cursor: not-allowed;`. When false, remove `readonly`, restore background and opacity.
   - In `handleSaleWorkspaceSave()`: If `chkSame && chkSame.checked`, enforce:
     ```js
     deliveryAddress = billingAddress;
     deliveryGstin = billingGstin;
     ```
2. **In `PurchaseController.js`:**
   - Replicate the exact same lifecycle for `pe-same-as-billing`, `pe-delivery-address`, and `pe-delivery-gstin`.

---

## Issue 3: Sales & Purchase Creation — Broken Attachment Upload / View Disconnect
### 1. User Complaint
> *"3) Sell Purchase creation-- we haev add/Replace-Preview-Delete but thet are not working and also not looking same like how we have in setting for branding and ect ..used the same.. when user add attachmentduring booking the record.. View is not showing any attachedment that mean we lost the attached even it's there but desktop is working"*

### 2. Desktop Investigation (Source of Truth)
- **Files:**
  - `desktop/src/main/java/org/example/controller/SalesController.java` (Lines 1301–1306, 1801)
  - `desktop/src/main/java/org/example/api/support/SupportApiClient.java` (Line 6)
- **Desktop Architecture:**
  - Saving an invoice is a 2-stage transactional process:
    1. Save Sale JSON entity via `POST /api/sales`.
    2. If a local file was attached, upload it via multipart form data to:
       `POST /api/support/documents/SALE/{id}/attachment-file?rowVersion={rowVersion}`
    3. If attachment removal was requested, call:
       `DELETE /api/support/documents/SALE/{id}/attachment-file?rowVersion={rowVersion}`
  - Viewing the invoice fetches binary content from:
    `GET /api/support/documents/SALE/{id}/attachment-file`

### 3. Web Investigation (`d:\ERP Website\admin`)
- **Files:**
  - `js/controllers/SalesController.js` (Lines 1009–1013, 1783–1827, 1987, 2004–2016, 3240–3350)
  - `js/controllers/PurchaseController.js` (Lines 1331–1333, 1533–1570, 2040–2065)
  - `index.html` (Lines 10558–10630 for Settings Branding Card; Lines 1810–1830 for Sales Attachment)
- **Current Findings:**
  - **The Missing Upload:** In `SalesController.js` line 1987, Web sets:
    ```js
    attachmentPath: this.pendingAttachmentFile ? this.pendingAttachmentFile.name : null
    ```
    and submits the JSON payload. **The binary file is NEVER uploaded to the server!** It only sends the string filename. The actual file data is lost immediately.
  - **The Broken Preview:** In line 1799, Web calls `window.open(this.editingSale.attachmentPath, '_blank');`. This opens a 404 URL because `attachmentPath` is just a raw filename (e.g. `scan.pdf`), not an API URL!
  - **Missing Drawer Display:** In `SalesController.js` `openInvoiceDrawer()` (Lines 3240–3350), there is **zero code rendering the attachment**. It displays addresses, taxes, charges, and return status, but completely ignores attachments!
  - **Inconsistent UI Styling:** The current sales/purchase attachment widget is a raw inline label with two tiny buttons, completely different from the card design in Settings Branding (`index.html:10558–10630`).
  - **Purchase Controller:** Identical flaw: sets `attachmentPath` to filename string, never uploads binary to `/api/support/documents/PURCHASE/{id}/attachment-file`.

### 4. Root Cause
1. Web never uploads binary files via `FormData` to `/api/support/documents/{type}/{id}/attachment-file`.
2. Web detail drawers (`#sales-inline-drawer` and `#drawer-purchase-details`) do not contain attachment preview/download cards.
3. The attachment widget does not share the Settings Branding card layout.

### 5. Technical Fix Plan
1. **Adopt Settings Branding Card UI (`index.html`):**
   - Replace the inline attachment strips in Sales Creator (`#view-sales-creator`) and Purchase Editor (`#view-purchase-editor`) with the canonical Settings Branding card layout:
     - Outer container: `background:rgba(15,23,42,0.4); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:14px 16px;`
     - Dashed preview area: `min-height:80px; border:1px dashed rgba(255,255,255,0.15); border-radius:6px;`
     - Display thumbnail icon, filename, and file size.
     - 3 styled buttons: `+ Add / Replace` (purple `#a855f7`), `👁 Preview` (secondary), `Remove` (red outline).
2. **Binary Upload in Controllers:**
   - In `SalesController.js` `handleSaleWorkspaceSave()`: After `savedSale` is returned with an `id`, execute:
     ```js
     if (this.pendingAttachmentFile) {
       const formData = new FormData();
       formData.append('file', this.pendingAttachmentFile);
       await window.ApiService.uploadFile(`/api/support/documents/SALE/${savedSale.id}/attachment-file?rowVersion=${savedSale.rowVersion || -1}`, formData);
     } else if (this.attachmentRemovalPending) {
       await window.ApiService.delete(`/api/support/documents/SALE/${savedSale.id}/attachment-file?rowVersion=${savedSale.rowVersion || -1}`);
     }
     ```
   - In `PurchaseController.js` `savePurchase()`: Implement the identical upload step for `PURCHASE`.
3. **Detail Drawer Display:**
   - In `openInvoiceDrawer()` (Sales) and `openPurchaseDrawer()` (Purchases):
     - Check if `s.attachmentPath` exists.
     - Render an "Attachment" section displaying the file name, with an "👁 Preview" button (`window.open('/api/support/documents/SALE/' + s.id + '/attachment-file', '_blank')`) and "📥 Download" button.

---

## Issue 4: Credit & Debit Note — Searchable Invoice Dropdown, Real Master GST Lookups, & Inventory Adjustment Flag
### 1. User Complaint
> *"4)Credit and Debit Note - Original Tax Invoice Ref should be searchable dropdown and user cell respective order only to aovid the user intereferening, GST is still mock up date rather thn get GST master lookup table , and falg invertory should be do the adjustment based on flag so make sure flag should work"*

### 2. Desktop Investigation (Source of Truth)
- **Files:**
  - `server/src/main/java/org/example/server/creditdebit/CreditDebitNoteService.java` (Lines 423–428, 540–549, 587–596)
  - `desktop/src/main/resources/fxml/pages/CreditNoteRegister.fxml`
  - `desktop/src/main/resources/fxml/pages/DebitNoteRegister.fxml`
- **Desktop Architecture:**
  - In `CreditDebitNoteService.java`:
    ```java
    if (Boolean.TRUE.equals(dto.stockReturned()) && line.itemId() != null && line.itemId() > 0) {
        jdbc.update("UPDATE item_master SET opening_stock = GREATEST(0, COALESCE(opening_stock, 0) - ?) WHERE id = ?",
            line.quantity(), line.itemId());
    }
    ```
    **Key Finding:** The backend *only* adjusts inventory if `line.itemId()` is non-null and greater than 0!
  - GST rates are fetched from Master Lookups category `GST_RATE`.
  - Invoices/Bills are selected from customer/supplier historical documents.

### 3. Web Investigation (`d:\ERP Website\admin`)
- **Files:**
  - `js/controllers/CreditDebitNoteController.js` (Lines 440–495, 512–555, 573–648)
  - `index.html` (Lines 14578–14615)
- **Current Findings:**
  - **The Inventory Adjustment Failure:** In `CreditDebitNoteController.js` lines 540–553, when submitting a Credit Note, Web creates a dummy line item:
    ```js
    lines: [{
      itemCode: 'CREDIT-ADJ',
      itemDescription: `${reason} adjustment for ${party}`,
      quantity: 1,
      unitPrice: taxable,
      // itemId is MISSING/UNDEFINED!
    }]
    ```
    Because `itemId` is `null`, the backend condition `line.itemId() != null && line.itemId() > 0` evaluates to **FALSE**, silently bypassing stock adjustment!
  - **The Free-Text Invoice Input:** `m-cn-invoice` and `m-dn-bill` are text inputs with HTML5 `<datalist>` elements (`index.html:14579`). Users can type any invalid string, bypassing validation and corrupting audit references.
  - **Mockup GST Rates:** In `index.html` lines 14602–14606, GST options are hardcoded HTML `<option>` elements (18%, 12%, 5%, 28%, 0%). If master lookup API fails or during initial modal load, mock data remains displayed.

### 4. Root Cause
1. Stock adjustment failed because Web never passes valid `itemId` references in line items.
2. Invoices are text inputs rather than searchable `<select>` dropdowns scoped strictly to the selected customer/supplier.
3. Master GST rates are not reliably bound to `MasterService.getLookupsByCategoryCode('GST_RATE')`.

### 5. Technical Fix Plan
1. **Searchable Invoice Dropdown:**
   - In `modal-create-credit-note` and `modal-create-debit-note`, replace `<input id="m-cn-invoice">` and `<input id="m-dn-bill">` with searchable `<select>` elements (`<select id="m-cn-invoice" class="form-select">`).
   - When a Customer/Supplier is chosen, fetch their eligible closed orders via `OperationsService.getSalesPage(0, 100, '', '', customerId)` (or `getPurchasesPage`). Populate the dropdown strictly with their invoices.
   - Store the invoice line items in memory when selected.
2. **Item-Level Inventory Stock Adjustment:**
   - When the user selects an invoice, populate the items from that invoice into the modal.
   - When `adjustStock` (`m-cn-adjust-stock`) is checked, pass the actual `itemId` (e.g. `itemId: selectedItem.id`) and `quantity` in `payload.lines`, allowing `CreditDebitNoteService` to execute the database stock update.
3. **Master GST Lookups:**
   - On opening the modal, call `MasterService.getLookupsByCategoryCode('GST_RATE')` and dynamically rebuild the options with active GST records.

---

## Issue 5: Return Popups (+Purchase Return and +Sales Return) — Free-Text vs. Searchable Paid Invoices Dropdown
### 1. User Complaint
> *"5)+Purcashe retruna and + sell Retrun button on retrun , when user clik on it.. Open the Pop up but field Original Tax Invoice / Bill is testfiled rather the active eligiable record.. can we put searchable dropdown and only show valid Paid Sell /Purchase record (this is direct fixed to web,,, no need to investgate it )"*

### 2. Desktop Investigation (Source of Truth)
- **Files:**
  - `desktop/src/main/resources/fxml/pages/SalesReturns.fxml`
  - `desktop/src/main/resources/fxml/pages/PurchaseReturns.fxml`
- **Desktop Architecture:**
  - User selects an invoice from a validated picker displaying only eligible (PAID or APPROVED) sales invoices or purchase bills.

### 3. Web Investigation (`d:\ERP Website\admin`)
- **Files:**
  - `js/controllers/ReturnsController.js` (Lines 540–585)
  - `index.html` (Lines 14363–14371)
- **Current Findings:**
  - In `index.html` line 14366:
    ```html
    <input type="text" id="cr-invoice-input" class="form-input" placeholder="e.g. INV-2026-0001 or BILL-2026-0001">
    <button class="btn btn-secondary" type="button" onclick="window.ReturnsController.loadReturnableLines()">Load Items</button>
    ```
  - The user has to manually type an invoice number and click "Load Items". If typed incorrectly, an error is thrown.

### 4. Root Cause
`cr-invoice-input` was implemented as a raw string text input without an automated lookup to fetch valid, paid invoices.

### 5. Technical Fix Plan
1. In `index.html`: Change `cr-invoice-input` to a `<select id="cr-invoice-select" class="form-select">`.
2. In `ReturnsController.js` `openCreateReturnModal()`:
   - If `isSales`: call `OperationsService.getSalesPage(0, 100)` filtering for `paymentStatus === 'PAID'` and `documentStatus !== 'CANCELLED'`.
   - If `isPurchase`: call `OperationsService.getPurchasesPage(0, 100)` filtering for valid bills.
   - Populate `<select id="cr-invoice-select">` with options:
     `Invoice No — Party Name — ₹ Amount (Paid)`.
   - Attach an `onchange` listener so selecting an invoice immediately loads returnable line items without requiring a separate button click.

---

## Issue 6: Item Master KPI Cards — Missing Colorful Icons and Visual Metrics
### 1. User Complaint
> *"6) Item master KPi card is not have color full Icon ,values etc like other screen"*

### 2. Desktop Investigation (Source of Truth)
- **Files:**
  - `desktop/src/main/resources/fxml/pages/ItemMaster.fxml` (Lines 14–19)
- **Desktop Architecture:**
  - 4 Standard KPI Cards:
    1. `kpi-blue`: `itemTotalIcon` (Cube/Box), Label "Total Items", Trend Pill "All" (`trend-neutral`), Value `lblKpiTotal`, Note "Catalog records".
    2. `kpi-purple`: `itemCategoryIcon` (Tags), Label "Categories", Trend Pill "Groups" (`trend-info`), Value `lblKpiCategories`, Note "Active item groups".
    3. `kpi-orange`: `itemLowIcon` (Warning/Alert), Label "Low Stock", Trend Pill "Alert" (`trend-warning`), Value `lblKpiLowStock`, Note "At or below minimum".
    4. `kpi-green`: `itemValueIcon` (Rupee/Wallet), Label "Catalog Value", Trend Pill "Value" (`trend-positive`), Value `lblKpiValue`, Note "Opening stock valuation".

### 3. Web Investigation (`d:\ERP Website\admin`)
- **Files:**
  - `index.html` (Lines 3953–3987, `#view-items`)
- **Current Findings:**
  - In `index.html`:
    ```html
    <div class="standard-kpi-card kpi-blue">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="metric-label">TOTAL ITEMS</span>
        <span class="metric-trend-pill trend-neutral">All</span>
      </div>
      <div class="metric-value" id="item-kpi-total">0</div>
      <div class="metric-note">Catalog records</div>
    </div>
    ```
  - **No icons exist:** In contrast to Barcode Studio (`image17.png`), Sales, or Quotations, Item Master cards do not contain `<div class="kpi-icon-wrap">` or visual glyphs.
  - The values for `TOTAL ITEMS` and `CATEGORIES` lack theme color styling (plain default white/gray).

### 4. Root Cause
The KPI card HTML in `#view-items` lacks the icon wrapper markup and color tokens used across other modules.

### 5. Technical Fix Plan
- Update `index.html` (Lines 3953–3987) to match the canonical KPI card component structure:
  - Add `<div class="kpi-icon-badge" style="background: rgba(...); color: ...;"><span>📦</span></div>` (Blue Cube for Total Items, Purple 🏷️ for Categories, Orange ⚠️ for Low Stock, Green 💰 for Catalog Value).
  - Apply CSS color variables to metric values (`var(--cyan)` for Total Items, `var(--purple)` for Categories, `var(--orange)` for Low Stock, `var(--green)` for Catalog Value).

---

## Issue 7: Double-Entry General Ledger — Date Format, Consolidate Dropdown Removal, & Missing Tabs (Chart of Accounts & Trial Balance)
### 1. User Complaint
> *"7) Double-Entry General Ledger - date is not using setting date formate and remove the All Account (Consolidated gernel ledger) dropdwon and I see in desktop we have three tab Chats of account and Trial Balance tab is missing"*

### 2. Desktop Investigation (Source of Truth)
- **Files & Screenshots:**
  - `desktop/src/main/resources/fxml/pages/GeneralLedger.fxml`
  - `Desktopscreenshot.docx` (`image1.png`, `image2.png`, `image3.png`)
- **Desktop Architecture:**
  - Top KPI Summary: Total Debits (Yellow), Total Credits (Blue), Net Ledger Balance (Cyan), Journal Postings (Purple).
  - **Three Distinct Tabs:**
    1. **Tab 1: Journal Vouchers:** Table showing Date, Voucher No, Account, Narration, Debit, Credit, Running Balance. Filter bar has: Search text, **"All Categories" dropdown** (Asset, Liability, Equity, Revenue, Expense) — *NOT "All Accounts Consolidated"* —, Date Range, Export Statement.
    2. **Tab 2: Chart of Accounts:** Hierarchical tree/table of GL Accounts (Code, Account Name, Category, Normal Balance, Status, Current Balance).
    3. **Tab 3: Trial Balance:** Real-time Debit/Credit balancing ledger with Net Difference validation.
  - **Date Formatting:** Dates strictly formatted via `BusinessClock.formatDate(d)` adhering to user settings.

### 3. Web Investigation (`d:\ERP Website\admin`)
- **Files:**
  - `js/controllers/FinanceController.js` (Lines 25–34, 5527–5625)
  - `index.html` (Lines 5527–5625, `#view-general-ledger`)
- **Current Findings:**
  - **Hardcoded Date:** `FinanceController.js` lines 25–34 implements its own hardcoded `formatDate`:
    ```js
    formatDate(d) {
      const parts = d.toString().split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return d;
    }
    ```
    It completely ignores `window.FormatUtil.formatDate()` and the company date setting!
  - **Redundant Consolidated Dropdown:** Line 5581 in `index.html` has:
    `<option value="">All Accounts (Consolidated General Ledger)</option>`. In Desktop, this filter is "All Categories" (GL Categories: Asset, Liability, Equity, Revenue, Expense).
  - **Missing Tabs:** In `index.html`, `#view-general-ledger` contains **only the journal table**. Tab 2 ("Chart of Accounts") and Tab 3 ("Trial Balance") are completely missing from the view!

### 4. Root Cause
`FinanceController.js` bypassed `FormatUtil` with a custom date function, the account dropdown was mislabeled, and the tab pane architecture from `GeneralLedger.fxml` was never implemented in Web.

### 5. Technical Fix Plan
1. **Tabs Architecture:**
   - In `index.html` (`#view-general-ledger`), create the 3-tab layout:
     - Tab 1: "Journal Vouchers" (`#gl-tab-journals`)
     - Tab 2: "Chart of Accounts" (`#gl-tab-coa`)
     - Tab 3: "Trial Balance" (`#gl-tab-tb`)
2. **Filter Bar Update:**
   - Remove `<option value="">All Accounts (Consolidated General Ledger)</option>`.
   - Replace with Category dropdown: "All Categories", "Assets", "Liabilities", "Equity", "Revenue", "Expenses".
3. **Date Formatting:**
   - Replace `FinanceController.formatDate(d)` with `window.FormatUtil.formatDate(d)`.
4. **Implement Tab Controllers in `FinanceController.js`:**
   - Render Chart of Accounts table from `/api/accounting/accounts`.
   - Render Trial Balance table with live debit/credit balancing verification.

---

## Issue 8: GST Statutory Compliance & 2B Reconciliation Alignment (image7–image9) & Barcode Studio (image17)
### 1. User Complaint
> *"8) GSt Compliance recon and sub menu bar code ect all GSt related - attached the screenshot so matched with desktop path C:\Users\JATIN DHAMELIYA\Downloads"*

### 2. Desktop Investigation (Source of Truth)
- **Files & Screenshots:**
  - `desktop/src/main/resources/fxml/pages/GstComplianceCenter.fxml`
  - `desktop/src/main/resources/fxml/pages/BarcodeStudio.fxml`
  - `Desktopscreenshot.docx`:
    - `image7.png`: GSTR-2B ITC Reconciliation (KPIs, Period selector, Match Status pills: `MATCHED 100%`, `MISMATCH VALUE`, `MISSING IN BOOKS`, Actions).
    - `image8.png`: GSTR-3B Tax Set-Off Summary (Section 49/49A/49B waterfall rules, Output Tax, ITC Available, Cash Tax Payable).
    - `image9.png`: GSTR-1 Statutory Return Center (Tables 4, 7, 9B, 12, 13; Government JSON Export & Excel Worksheet).
    - `image17.png`: Barcode & QR Label Studio (KPIs: Catalog Items, Barcode Enabled, Label Format, Selected Copies; purple Actions dropdown button `Actions ▼`).

### 3. Web Investigation (`d:\ERP Website\admin`)
- **Files:**
  - `js/controllers/GstController.js`
  - `js/controllers/BarcodeStudioController.js`
  - `index.html` (Lines 6130–6344, 7400–7480)
- **Current Findings:**
  - While Web has started implementing some GSTR tabs, their visual styling, KPI badges, and status pills do not match the desktop screenshots.
  - In Barcode Studio (`#view-barcode`), the action menu buttons are plain rather than the canonical purple `Actions ▼` dropdown shown in `image17.png`.
  - In GSTR-2B, the match confidence scores and fuzzy reconciliation action triggers need synchronization with `GstComplianceController.java`.

### 4. Technical Fix Plan
1. **GST Compliance Alignment:**
   - Align KPI header in `index.html` (`#view-gst-compliance`):
     - Eligible ITC (Green)
     - ITC at Risk (Red)
     - Discrepancies (Orange)
     - Pending Bills (Purple)
     - Net Cash Tax (Teal)
   - Ensure the 3 tabs ("GSTR-2B ITC Reconciliation", "GSTR-3B Tax Set-Off Summary", "GSTR-1 Statutory Return Center") match `image7.png`–`image9.png` with period filters, status pill colors, and JSON export buttons.
2. **Barcode Studio Alignment:**
   - Update `#view-barcode` to match `image17.png`:
     - 4 Top KPI Cards: Catalog Items, Barcode Enabled, Label Format (50 x 25 mm), Selected Copies.
     - Purple Action menu dropdown button: `Actions ▼` with "View / Preview Label", "Generate Barcode", "Print Dispatch Label (PDF)".

---

## Issue 9: Global Date & Timestamp Settings Compliance
### 1. User Complaint
> *"8) in sort wherever we have data,invoicedate, follow date should be pick up from setting across all tables,screena and where we have date and timestamp should be show both base don setting set up"*

### 2. Desktop Investigation (Source of Truth)
- **Desktop Standard:**
  - `BusinessClock.formatDate(LocalDate)` formats all date fields using company configuration (`company.dateFormat`).
  - `BusinessClock.formatDateTime(LocalDateTime)` formats all timestamps using `company.dateFormat` + `company.timeFormat`.

### 3. Web Investigation (`d:\ERP Website\admin`)
- **Files:**
  - `js/util/FormatUtil.js` (Lines 21–46, 116–175)
  - `js/app.js`
  - Multiple controller files (`QuotationController.js`, `CreditDebitNoteController.js`, `FinanceController.js`, `PartyController.js`)
- **Current Findings:**
  - `FormatUtil.js` has `window.FormatUtil.formatDate` and `window.FormatUtil.formatDateTime`.
  - **Startup Disconnect:** `window.FormatUtil.setBusinessPolicy()` is **only** called inside `SettingsController.js` when the user clicks save! On application boot, Web never loads company settings from `/api/settings/company` or cache.
  - **Inconsistent Ad-hoc Implementations:** Multiple controllers implement local `formatDate()` with hardcoded formats (`d.toLocaleDateString('en-GB')`, `parts[2]/parts[1]/parts[0]`).
  - **Missing Timestamps:** Audit logs and createdAt/updatedAt columns display dates only or raw ISO strings (`2026-10-20T10:05:00.000Z`) rather than formatted date + time.

### 4. Root Cause
Lack of centralized initialization of `FormatUtil` on app startup, and widespread use of local ad-hoc date formatters across individual controllers.

### 5. Technical Fix Plan
1. **Startup Synchronization:**
   - In `app.js` (or during authentication bootstrap), immediately fetch company settings from `/api/settings/company` (or localStorage cache) and call:
     ```js
     window.FormatUtil.setBusinessPolicy(company.dateFormat, company.timeFormat, company.timeZone);
     ```
2. **Centralized Formatting Across All Controllers:**
   - Replace all local `formatDate()` functions in `QuotationController`, `FinanceController`, `CreditDebitNoteController`, `PartyController`, etc. with `window.FormatUtil.formatDate(val)`.
   - For all timestamp fields (audit logs, notes, createdAt, updatedAt, transaction logs), use `window.FormatUtil.formatDateTime(val)` which renders both date and time according to user preferences.

---

## Issue 10: Customer 360 & Supplier 360 — Canonical Purple Actions Dropdown
### 1. User Complaint
> *"9) 360 both supplier and customer. we have note and attachment where Acion is not like action we have in perler color with like in other page."*

### 2. Desktop Investigation (Source of Truth)
- **Files & Screenshots:**
  - `desktop/src/main/resources/fxml/pages/Customer360.fxml`
  - `desktop/src/main/resources/fxml/pages/Supplier360.fxml`
  - `Desktopscreenshot.docx` (`image17.png` & others showing canonical purple actions menu)
- **Desktop Architecture:**
  - Action columns in tables use the standard purple action menu (`table-action-menu` / `approved-row-action`).

### 3. Web Investigation (`d:\ERP Website\admin`)
- **Files:**
  - `js/controllers/PartyController.js` (Lines 1383–1386, 1410–1413, 1437–1440)
  - `index.html` (Lines 7700–8550)
- **Current Findings:**
  - In `loadSupplier360Notes()` and `loadCustomer360Notes()`, actions are rendered as raw emoji buttons:
    ```html
    <button class="btn btn-secondary btn-sm" onclick='...'>✏️</button>
    <button class="btn btn-secondary btn-sm" onclick='...' style="color:var(--red);">🗑️</button>
    ```
  - In `loadSupplier360Documents()` and `loadCustomer360Documents()`:
    ```html
    <button class="btn btn-secondary btn-sm" onclick='...'>📥</button>
    <button class="btn btn-secondary btn-sm" onclick='...' style="color:var(--red);">🗑️</button>
    ```
  - Unlike Quotations, Sales, and Barcode Studio, there is no canonical purple `btn-purple` action dropdown (`::: Actions`).

### 4. Root Cause
Customer 360 and Supplier 360 sub-tables were populated with placeholder emoji buttons rather than the shared purple action menu component.

### 5. Technical Fix Plan
- In `PartyController.js` (`loadCustomer360Notes`, `loadCustomer360Documents`, `loadSupplier360Notes`, `loadSupplier360Documents`):
  - Replace the emoji buttons with the canonical purple action dropdown:
    ```html
    <div class="row-action-menu-wrap" style="position:relative; display:inline-block;">
      <button class="btn-purple" onclick="window.PartyController.toggleActionMenu(id, event)" style="height:26px; padding:0 8px; font-size:0.72rem; font-weight:600;">
        ::: Actions
      </button>
      <div id="c360-note-menu-${n.id}" class="action-dropdown-menu" style="display:none; ...">
        <div class="action-menu-item" onclick="..."><span style="margin-right:6px;">✏️</span> Edit Note</div>
        <div class="action-menu-item" style="color:var(--red);" onclick="..."><span style="margin-right:6px;">🗑️</span> Delete Note</div>
      </div>
    </div>
    ```

---

## Issue 11: Settings Notifications & Module Activation Parity (image18–image20)
### 1. User Complaint
> *"10) module noticationa and module activtion is not matchign with desktop ."*

### 2. Desktop Investigation (Source of Truth)
- **Screenshots:**
  - `image18.png`: Settings -> Notifications
  - `image19.png` & `image20.png`: Settings -> Module Activation & Feature Control
- **Desktop Architecture:**
  - **Notifications Panel (`image18.png`):**
    - Subtitle: *"Manage notification-centre and desktop-toast preferences for your signed-in user."*
    - Top purple button: **`Save Notifications`**.
    - Top toggles:
      - `[x] Show application notifications`
      - `[x] Show desktop toast messages`
    - Subtitle: *"Choose which activity categories appear for your user. Critical errors and Security & User Access records always remain in Notification Center."*
    - **2 Symmetrical Columns of Pill Checkbox Cards:**
      - *Left:* Sales and invoices; Quotations and follow-ups; Payments and refunds; Bank, expenses and reconciliation; Reminders; Approvals; Backup, restore & safe rollback; Other system activity.
      - *Right:* Purchases and supplier invoices; Sales and purchase returns; Inventory and low stock; Reports and scheduled reports; Email & WhatsApp activity; Data imports; Application updates; Security & User Access (mandatory & disabled).
  - **Module Activation Panel (`image19.png`–`image20.png`):**
    - Title: *"Module Activation & Feature Control"*
    - Subtitle: *"Control ERP business modules, statutory engines, and smart operational automations. Deactivated modules are hidden from navigation and bypassed with zero overhead."*
    - Top purple button: **`Save Modules`**.
    - **5 Full-Width Module Cards:**
      1. **General Ledger & Double-Entry Accounting:** Master Chart of Accounts, debit/credit journal vouchers, real-time Trial Balance, and Profit & Loss. Right toggle: `[x] Enable GL Module`. Sub-toggles: `[x] Auto-post Journal Vouchers from Sales & Purchases`, `[x] Maintain Live Trial Balance`.
      2. **GST Statutory Compliance & GSTR-2B Auto-Reconciliation:** Automated Place of Supply tax split, GSTR-1 government JSON exports, and GSTR-2B ITC fuzzy reconciliation. Right toggle: `[x] Enable GST Engine`. Sub-toggles: `[x] Auto-Reconcile GSTR-2B Purchases`, `[x] Strict Place of Supply Gating`, `[x] TDS / TCS Withholding (Sec 194Q & 206C)`.
      3. **Smart Operational Automations Suite:** Automate purchase bill verification against PO/GRN, dynamic stock replenishment, and smart FIFO payment matching. Sub-toggles: `[x] Smart 3-Way Purchase Matching (PO vs GRN vs Bill)`, `[x] Dynamic Safety Stock & Auto-Reorder Alerts`, `[x] Auto-generate draft debit notes for short shipments`, `[x] Customer Overdue Credit Hard Stop (Block Invoicing)`.
      4. **Executive 8:00 PM Daily Briefing:** Daily evening summary of sales, customer collections, vendor payments, bank balances, and overdue accounts. Right toggle: `[x] Enable Daily Briefing`. Sub-toggles: `[x] WhatsApp Channel`, `[x] Email Channel`, Mobile No: `+91 90999 39193`.
      5. **Multi-Warehouse, Batch/Expiry (FEFO) & Serial Registry:** Track stock across multiple storage depots, enforce First-Expired First-Out dispatches, and track equipment serial warranties. Right toggle: `[x] Enable Batch/Serial Tracking`.

### 3. Web Investigation (`d:\ERP Website\admin`)
- **Files:**
  - `index.html` (Lines 11054–11123, 11477–11570)
  - `js/controllers/SettingsController.js`
- **Current Findings:**
  - **Notifications:** Web uses a generic CSS grid with misnamed labels and raw checkboxes. It lacks the two top toggle cards, the 2-column pill layout, and the top-right purple "Save Notifications" button.
  - **Modules:** Web uses a 3-column card layout (`data-panel`), completely missing Module 4 ("Executive 8:00 PM Daily Briefing") and Module 5 ("Multi-Warehouse, Batch/Expiry & Serial Registry"). It also lacks the top-right purple "Save Modules" button and master enable switches on each card.

### 4. Root Cause
The Settings sub-panels in Web were drafted using generic templates before the desktop release 10.0.36 screenshots were established as the definitive standard.

### 5. Technical Fix Plan
1. **Redesign Notifications Subpanel (`index.html`):**
   - Implement the exact layout of `image18.png` with top purple `Save Notifications` button, 2 top master cards (`Show application notifications`, `Show desktop toast messages`), and 2 columns of 8 pill cards with active check states.
2. **Redesign Module Activation Subpanel (`index.html`):**
   - Implement the exact layout of `image19.png`–`image20.png` with top purple `Save Modules` button and the 5 full-width module cards with right master checkboxes and nested feature pills.
3. **Update `SettingsController.js`:**
   - Bind `saveNotifications()` and `saveModules()` to persist all configuration settings to `/api/settings/notifications` and `/api/settings/modules`.

---

## Complete Implementation Checklist (For Approval)
| ID | Area | Exact Action Required | Files to Modify |
|---|---|---|---|
| **1** | Quotations | Add Attachment Add/Replace/Preview/Delete widget & View/Download in Drawer | `index.html`, `QuotationController.js` |
| **2** | Sales & Purchases | Strictly lock Delivery Address/GSTIN when "Same as Billing" is ticked; enforce copy in payload | `SalesController.js`, `PurchaseController.js` |
| **3** | Sales & Purchases | Replace inline attachment strip with Settings Branding Card; upload binary to `/api/support/documents/...`; render in drawers | `index.html`, `SalesController.js`, `PurchaseController.js` |
| **4** | Credit & Debit Notes | Replace text invoice input with searchable dropdown of party's orders; fetch real master GST lookups; send valid `itemId` for stock adjustment | `index.html`, `CreditDebitNoteController.js` |
| **5** | Return Popups | Replace text invoice input with searchable dropdown showing only eligible PAID sales/purchases | `index.html`, `ReturnsController.js` |
| **6** | Item Master | Add colored icon badges and themed metric values to the 4 KPI cards | `index.html`, `ItemMasterController.js` |
| **7** | General Ledger | Remove "All Accounts Consolidated", add 3 Tabs (Journal Vouchers, Chart of Accounts, Trial Balance), use setting date format | `index.html`, `FinanceController.js` |
| **8A** | GST Compliance | Match KPIs, 3 tabs (2B Recon, 3B Set-off, GSTR-1), status pills, and Barcode Studio to `image7–9, 17` | `index.html`, `GstController.js`, `BarcodeStudioController.js` |
| **8B** | Global Date/Time | Initialize `FormatUtil` on app boot; use `formatDate` for dates and `formatDateTime` for timestamps globally | `app.js`, `FormatUtil.js`, all controllers |
| **9** | Customer/Supplier 360 | Replace emoji buttons in Notes & Attachments with canonical purple `btn-purple` Actions dropdown | `PartyController.js`, `index.html` |
| **10** | Settings Panels | Rebuild Notifications and Module Activation panels to 100% pixel parity with `image18–20` | `index.html`, `SettingsController.js` |

---
*Report compiled and verified against Desktop Release 10.0.36 and Web Build 10.0.35.07.*  
*Awaiting User Confirmation to Begin Implementation.*
