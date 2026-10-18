# Scope Specification: Complete 8-Module Import Engine & Desktop Parity (`scope10.0.34.14.md`)

**Target Baseline:** Desktop ERP `10.0.34` (`ImportController.java`, `ImportService.java`, `ImportTemplateService.java`, `ImportModuleRegistry.java`, `ImportPreviewService.java`, `ImportResultReportService.java`, `ImportDocumentPolicy.java`, `ImportMappingSupport.java`, `PurchaseReconImportCoordinator.java`, `BankStatementImportCoordinator.java`, `KotakBankStatementCsvParser.java`)  
**Target Web Release:** Web Admin Studio `10.0.34.14` (`d:\ERP Website\admin`)  
**Date:** October 18, 2026  
**Status:** CANONICAL INVESTIGATION & ARCHITECTURAL SPECIFICATION COMPLETE — STRICT INVESTIGATION & COMPARISON ONLY (ZERO BUILD / ZERO PRODUCTION CODE MODIFIED PENDING USER APPROVAL)

---

## 1. Executive Summary & Diagnostic Overview

Following the deployment of release `10.0.34.13`, an end-to-end technical audit was conducted on the Data Import subsystem across Desktop JavaFX (`desktop`) and Web Admin Studio (`d:\ERP Website\admin`). The audit directly addresses the four core inquiries and defects raised by the user:

1. **Template Format Discrepancy:** Why Web downloads flat text `.csv` templates while Desktop generates styled, multi-sheet `.xlsx` workbooks (and accepts both `.xlsx` and `.xls`).
2. **Missing Validation Pipeline in Web:** Why Web preview shows rows but completely omits pre-flight validations (Reference Format compliance, In-File duplicate checks, Database existence/collision detection against duplicate policies, Master lookup verification, Stock availability checks, and Tax type normalization).
3. **Zero Data Persistence Across All 8 Modules:** Why clicking "Execute Import" shows a success message but **zero records are saved to the database**:
   - For **Sales, Purchases, Purchase Recon, and Bank Statement** (4 modules), the Web service hardcodes a mock dummy return (`{ success: true, processed: rows.length, imported: rows.length }`) with **zero API calls and zero database persistence**.
   - For **Item Master, Customers, Suppliers, and Master Categories & Values** (4 modules), severe DTO mismatch bugs (`code` vs `partyCode`, `salePrice` vs `sellingPrice`, `displayName` vs `lookupValue`) caused backend validation failures, which were swallowed into a fake success message.
4. **Missing Completion Status Dialog & Downloadable Result Report:** Why Desktop presents an authoritative completion dialog with summary counts and an **"Open Result Report"** button generating a detailed two-sheet Excel report (`Import_Result_<Module>_<Timestamp>.xlsx`), whereas Web shows an uninformative green banner with no report and no navigation to view imported records.

Per the user's explicit directive:
> *"can we check all full import funcitoanlity and check hy webnot working ? create new vwrsion .md file before nay build this purly check and scope creation and comparetion"*

This document provides the full, line-by-line architectural comparison, root-cause code diagnostics, an 8-module schema matrix, and the exact design blueprint for release `10.0.34.14`.

---

## 2. Root Cause Analysis of User Inquiries

### Inquiry 1: Why does Web download `.csv` templates while Desktop uses `.xlsx` and `.xls`?

#### Desktop ERP Implementation (`ImportTemplateService.java:13-75`):
- Desktop utilizes Apache POI (`XSSFWorkbook`) to dynamically generate rich, production-grade `.xlsx` Excel workbooks containing **two dedicated sheets**:
  1. **Sheet 1 ("Import Template"):**
     - Formatted header row in Royal Blue (`FillPatternType.SOLID_FOREGROUND`) with bold white font.
     - Auto-fitted column widths (`Math.max(14, len + 3) * 256`).
     - Window Freeze Pane locked at Row 1 (`createFreezePane(0, 1)`).
     - Native Excel AutoFilter enabled on all columns (`setAutoFilter(...)`).
     - Formatted sample data rows from `ImportModuleRegistry.exampleRows(module)`.
  2. **Sheet 2 ("Instructions"):**
     - Company Branding and Version Header.
     - Explanation of Import Modes (`Update non-blank fields`, `Create new only`, `Create or update`, `Skip existing`).
     - GST / IGST calculation rules (Tax rate % only, automatic CGST+SGST or IGST splitting, do not enter manual tax values).
     - Multi-charge syntax for Purchases (`Type|Amount|Taxable|GSTPercent`).
     - Multi-attachment file path syntax.
     - Field-specific Identifier guidance.
- File Chooser Filter (`ImportController.java:938`): Allows `*.xlsx` and `*.xls` for 7 modules, and Kotak `*.csv` for Bank Statements.

#### Current Web Implementation & Root Cause (`ImportService.js:6-98`):
- Web generates a plain-text comma-separated string blob (`text/csv;charset=utf-8;`) downloaded as `.csv`.
- CSV files cannot contain multiple sheets, cannot store instructions, freeze panes, styling, or dropdown validation metadata.
- Furthermore, Web's file reader (`ImportController.js:157-167`) uses `FileReader.readAsText(file)`:
  - If a user uploads an `.xlsx` workbook on Web, `readAsText()` attempts to read raw zip binary bytes as UTF-8 text, corrupting the workbook into illegible characters and crashing preview!

#### Solution for Web:
1. Embed the lightweight, battle-tested `xlsx.full.min.js` (SheetJS) library in Web.
2. Generate authentic `.xlsx` templates containing both the **"Import Template"** and **"Instructions"** sheets matching Desktop POI parity.
3. Allow file upload for `.xlsx`, `.xls`, and `.csv`. Use SheetJS `XLSX.read(data, { type: 'array' })` to parse workbooks natively into structured rows.

---

### Inquiry 2: Why are validations (Lookup formats, Existing record duplicate checks, etc.) missing in Web?

#### Desktop ERP Implementation (`ImportService.java`, `ImportDocumentPolicy.java`, `ImportPreviewService.java`):
Before allowing an import to run, Desktop enforces an ironclad, multi-stage preflight validation pipeline (`runPreflightValidation` in `ImportController.java:1153-1196`):

1. **Reference Format Rule Validation (`ImportDocumentPolicy.requireReference`):**
   - Fetches configured reference masks from `GET /api/master/reference-formats` (`REF_ITEM`, `REF_CUSTOMER`, `REF_SUPPLIER`, `REF_SALES`).
   - Validates that identifiers conform strictly to regex/date formulas (e.g., `ITEM-####`, `CUS-####`, `SUP-####`, `SAL-YYYY-####`).
2. **In-File Duplicate Detection (`ImportService.java:183, 733`):**
   - Tracks unique identifier sets within the file (`seen.add(key)`).
   - If an identifier appears multiple times in the same sheet, flags `FAILED` with `"Duplicate [Code] in workbook"`.
3. **Database Collision & Mode Policy Evaluation (`ImportService.java:189-200, 739-750`):**
   - Fetches existing records or queries `/exists` endpoints.
   - Compares with selected mode:
     - `CREATE_ONLY` / `SKIP_EXISTING`: If record exists, marks `SKIPPED` (*"Existing record matches code and will be preserved"*).
     - `UPDATE_NON_BLANK`: If record exists, marks `WOULD UPDATE` (*"Existing record matches code and will be updated"*).
     - `UPSERT`: Marks `WOULD UPDATE` if exists, `WOULD CREATE` if new.
     - **Sales & Purchases Invoices:** Existing posted documents are strictly protected: *"Existing posted invoice is protected and cannot be imported again"*.
4. **Master Reference Cross-Entity Integrity (`ImportService.java:287-291`):**
   - For Sales invoices: Customer `party_code` must exist in Master Customers.
   - For Purchase invoices: Supplier `party_code` must exist in Master Suppliers.
   - For both: Line `item_code` must exist in Item Master.
   - Stock sufficiency: For Sales lines, cumulative requested item quantity is checked against available stock (`availableStockByItem`). Fails if `qty > availableStock` with `"Insufficient stock for item ..."`.
5. **Tax Type Consistency (`ImportDocumentPolicy.normalizeTaxType`):**
   - Auto-resolves GST (intra-state) vs IGST (inter-state) based on Company GSTIN state code vs Party GSTIN state code.
   - Enforces uniform tax treatment across all line items of a single invoice (mixed GST/IGST within one document throws error).
6. **Data Type & Regex Syntax:**
   - Validates email formats (`^[^@\s]+@[^@\s]+\.[^@\s]+$`), numeric fields, and date ISO formats.

#### Current Web Implementation & Root Cause (`ImportController.js:288-349`):
- Web validation is completely superficial:
  - It only checks if `required && !val` (empty string).
  - It only checks if `parseFloat(val)` is not `NaN` for numeric column names.
- It performs **ZERO backend lookups**, **ZERO reference format checks**, **ZERO duplicate detection**, **ZERO existing record checks**, and **ZERO cross-entity integrity checks**!
- As a result, the user sees "All 10 records passed validation!" even when codes are illegal, parties do not exist, or invoices already exist in the database.

---

### Inquiry 3: Why does Web show a success message but nothing actually loads into the database?

#### Root Cause in Web Code (`ImportService.js:163-346`):
1. **Modules 4, 5, 7, 8 (`Sales`, `Purchases`, `Purchase Recon`, `Bank Statement`):**
   - Look at `ImportService.js:173-177`:
     ```javascript
     case 'Purchase Recon':
     case 'Bank Statement':
     case 'Sales':
     case 'Purchases':
       return { success: true, processed: rows.length, imported: rows.length, updated: 0 };
     ```
   - **4 OUT OF 8 MODULES DO NOT CALL ANY BACKEND API AT ALL!**
   - The code literally returns a hardcoded mock object claiming 100% success without executing a single HTTP request!
2. **Module 1 (`Item Master`):**
   - In `ImportService.js:205-216`:
     - Payload field name is constructed as `salePrice: parseFloat(...)`.
     - The Spring Boot server entity and `MasterDtos.ItemDto` expect `sellingPrice`, NOT `salePrice`!
     - In addition, fields `brand`, `material`, `size`, `remarks`, and `discountPercent` are omitted from the web mapping schema.
3. **Modules 2 & 3 (`Customers / CRM` & `Suppliers / HRM`):**
   - In `ImportService.js:261-273`:
     - Payload is constructed as `{ code: getVal('Party Code'), name: ... }`.
     - The Spring Boot server `MasterDtos.PartyDto` expects `partyCode`, NOT `code`!
     - Jackson deserializes `partyCode` as `null`. Since the database column has a `NOT NULL` constraint, the insert fails.
4. **Module 6 (`Master Categories & Values`):**
   - In `ImportService.js:318-326`:
     - Payload is constructed with `{ displayName: ..., sortOrder: ..., active: ... }`.
     - The server `MasterDtos.LookupDto` expects `{ lookupValue: ..., displayOrder: ..., active: ... }`.
     - Furthermore, Desktop (`ImportService.java:614`) executes `masterApi.upsertCategory(...)` before saving the lookups. Web completely skips category creation!
5. **Silent Error Swallowing in `ImportController.js:370-384`:**
   - In `ImportService.js`, when API calls fail inside the loop, it catches the error and pushes to `errors[]`, incrementing `failed++`.
   - But `ImportController.js` ignores `res.failed` and displays:
     `Processed ${res.processed} rows — ${res.imported} records created successfully`
   - Even when 100% of rows fail due to DTO errors, the user is presented with a green success message!

---

### Inquiry 4: Why is Desktop's completion popup and downloadable status report missing in Web?

#### Desktop ERP Implementation (`ImportController.java:1563-1611` & `ImportResultReportService.java`):
1. **Completion Alert Dialog:**
   - On completion, Desktop displays an `Alert(AlertType.INFORMATION)` or `WARNING`:
     - Header: *"Import Succeeded"* or *"Import Completed with Warnings"*
     - Content:
       ```
       Processed: 50
       Passed: 48
       Imported (new): 40
       Updated: 8
       Skipped: 2
       Failed: 0

       Detailed Excel result report generated.
       ```
     - Buttons: `[Open Result Report]` (left button) and `[OK]`.
2. **Automatic Excel Result Report Generation (`ImportResultReportService.java:20-91`):**
   - Generates a styled `.xlsx` file saved in `<Workspace>/Imports/Results/Import_Result_<Module>_<Timestamp>.xlsx`.
   - **Sheet 1 ("Summary"):** Lists Module, Source File, Mode, Processed, Passed, Imported, Updated, Skipped, Failed, Business Date, Business Time.
   - **Sheet 2 ("Import Results"):** 7-column detailed audit table:
     `Source Row(s) | Reference | Status | Action | Tax Type | GST % | Message`
     - Status: `PASSED`, `FAILED`, `SKIPPED`.
     - Action: `CREATED`, `UPDATED`, `WOULD CREATE`, `WOULD UPDATE`, `SKIPPED`, `NONE`.
     - Filter and freeze pane applied.
   - Clicking `[Open Result Report]` opens the generated Excel file immediately.
3. **Desktop Step 4 Completed State (`ImportController.java:1650-1664`):**
   - Shows `importCompletedPanel` with summary banner.
   - Provides button **"View Imported Records"** (`viewImportedRecords()`), which automatically navigates the user directly to the relevant screen (`ItemMaster.fxml`, `Customer.fxml`, `SalesList.fxml`, `PurchaseList.fxml`, `Masterdata.fxml`, `PurchaseRecon.fxml`, `BankStatement.fxml`).
   - Provides button **"Start Another Import"** (`startAnotherImport()`).

#### Current Web Implementation:
- Web only displays an inline green text box `#import-completed-panel` with no modal popup, no report generation, no downloadable evidence, and no navigation button to view the imported records.

---

## 3. Comprehensive 8-Module Architectural Specification Matrix

| # | Module Name | Desktop Identifier & Fields | Required Fields | Duplicate & Integrity Policy | Backend Endpoint & Method | Web Parity Route & Target View |
|---|---|---|---|---|---|---|
| **01** | **Item Master** | `item_code` (Key)<br>`description`, `category`, `brand`, `material`, `size`, `unit`, `hsn`, `gst`, `discount_percent`, `purchase_price`, `selling_price`, `remarks`, `opening_stock`, `minimum_stock`, `location` | `item_code`<br>`description`<br>`unit`<br>`hsn`<br>`remarks` | • `REF_ITEM` regex validation<br>• In-sheet code uniqueness<br>• DB collision: `CREATE_ONLY` skips, `UPDATE_NON_BLANK` updates non-empty fields, `UPSERT` replaces | `POST /api/master/items`<br>`PUT /api/master/items`<br>`POST /api/master/items/bulk` | `selectNav('view-inventory')`<br>Item Master Register |
| **02** | **Customers/CRM** | `party_code` (Key)<br>`name`, `contact_person`, `phone`, `email`, `gstin`, `address`, `opening_balance`, `is_active` | `party_code`<br>`name` | • `REF_CUSTOMER` regex validation<br>• Email regex format check<br>• In-sheet party_code uniqueness<br>• DB collision: Skip or Update based on mode | `POST /api/master/parties`<br>`PUT /api/master/parties` | `selectNav('view-customers')`<br>Customer CRM Directory |
| **03** | **Suppliers/HRM** | `party_code` (Key)<br>`name`, `contact_person`, `phone`, `email`, `gstin`, `address`, `opening_balance`, `is_active` | `party_code`<br>`name`<br>`email` *(Strictly required)* | • `REF_SUPPLIER` regex validation<br>• Mandatory valid email<br>• In-sheet party_code uniqueness<br>• DB collision: Skip or Update based on mode | `POST /api/master/parties`<br>`PUT /api/master/parties` | `selectNav('view-suppliers')`<br>Supplier Directory |
| **04** | **Sales Register** | `invoice_no` (Doc Key)<br>`invoice_date`, `party_code`, `item_code`, `quantity`, `rate`, `gst_percent`, `gst_type`, `payment_terms`, `paid_amount`, `remarks`, `charge_1_type`, `charge_1_amount`, `charge_1_taxable`, `charge_1_gst_percent`, `charge_2_type`, `charge_2_amount`, `charge_2_taxable`, `charge_2_gst_percent`, `attachment_file` | `invoice_no`<br>`invoice_date`<br>`party_code`<br>`item_code`<br>`quantity`<br>`rate` | • `REF_SALES` mask check<br>• **Multi-row document grouping** by `invoice_no`<br>• Customer must exist in master<br>• Item must exist in master<br>• Sufficient stock availability check<br>• Uniform tax type per invoice<br>• Existing posted invoices protected (skipped) | `POST /api/operations/sales` | `selectNav('view-sales-register')`<br>Sales Register |
| **05** | **Purchase Bills** | `invoice_no` (Doc Key)<br>`invoice_date`, `party_code`, `item_code`, `quantity`, `rate`, `gst_percent`, `gst_type`, `payment_terms`, `paid_amount`, `remarks`, `charge_1_type`, `charge_1_amount`, `charge_1_taxable`, `charge_1_gst_percent`, `charge_2_type`, `charge_2_amount`, `charge_2_taxable`, `charge_2_gst_percent`, `additional_charges`, `attachment_file`, `attachment_files` | `invoice_no`<br>`invoice_date`<br>`party_code`<br>`item_code`<br>`quantity`<br>`rate` | • Multi-row grouping by `invoice_no`<br>• Supplier must exist in master<br>• Item must exist in master<br>• Additional charges parsing (`Type|Amt|Taxable|Gst%`)<br>• Existing posted invoices protected | `POST /api/operations/purchases` | `selectNav('view-purchase-register')`<br>Purchase Register |
| **06** | **Master Categories and Values** | `category_code` + `value_code` (Composite Key)<br>`category_name`, `category_description`, `value`, `value_description`, `display_order`, `is_active` | `category_code`<br>`category_name`<br>`value_code`<br>`value` | • Upserts Category entity first<br>• Resolves canonical lookup code (handles aliases & GENxxx retiring)<br>• In-sheet composite key uniqueness<br>• Skip or Update existing lookups | `PUT /api/master/categories/upsert`<br>`POST /api/master/lookups`<br>`PUT /api/master/lookups` | `selectNav('view-master-data')`<br>Master Data Categories |
| **07** | **Purchase Recon (GSTR-2B)** | `supplier_name`, `supplier_gstin`, `supplier_invoice_no`, `invoice_date`, `taxable_value`, `cgst`, `sgst`, `igst`, `invoice_value` | `supplier_name`<br>`supplier_invoice_no`<br>`invoice_date`<br>`invoice_value` | • Supplier matched by GSTIN first, then normalized name<br>• Supplier Invoice No. + Financial Year duplicate protection<br>• Multi-sheet scanning across all tabs<br>• SHA-256 file fingerprinting | `POST /api/purchase-recon/imports`<br>Payload: `ImportRequest(fileName, fingerprint, note, dryRun, rows)` | `selectNav('view-purchase-recon')`<br>Purchase Recon Workspace |
| **08** | **Bank Statement** | `transaction_date`, `value_date`, `description`, `reference`, `amount`, `direction` (DR/CR), `balance` | `transaction_date`<br>`value_date`<br>`description`<br>`reference`<br>`amount`<br>`direction`<br>`balance` | • Full Kotak format parsing<br>• Opening/closing balance reconciliation<br>• Transaction row SHA-256 fingerprinting<br>• Duplicate transaction protection<br>• Statement batch duplicate protection | `POST /api/bank-statements/imports`<br>Payload: `ImportRequest(...)` | `selectNav('view-bank-statement')`<br>Bank Reconciliation |

---

## 4. Architectural Implementation Blueprint for Release `10.0.34.14`

### 4.1. Template Engine & Native Workbook Support (`ImportTemplateService.js`)
- Integrate SheetJS (`xlsx.full.min.js`) into `d:\ERP Website\admin\index.html`.
- Build native multi-sheet workbook generator producing:
  - **Sheet 1:** Standard styled headers with frozen header row and sample rows matching `ImportModuleRegistry.exampleRows(module)`.
  - **Sheet 2 ("Instructions"):** Comprehensive ERP instructions, calculation rules, charge syntax, and identifier rules.
- Download default file extension as `.xlsx`. Provide fallback to `.csv` if requested.
- Support drag-and-drop and file selection for `.xlsx`, `.xls`, and `.csv`.
- Read worksheets and detect the appropriate data sheet using layout header detection matching `SpreadsheetLayoutDetector.java`.

### 4.2. Pre-flight Validation & Duplicate Detection Engine
Implement `runPreflightValidation()` in `ImportController.js` executed automatically in Step 4:
1. **Reference Formats:** Query `GET /api/master/reference-formats` to fetch authoritative regex masks (`REF_ITEM`, `REF_CUSTOMER`, `REF_SUPPLIER`, `REF_SALES`).
2. **Master Caches:** Load current master items, parties, categories, and reference numbers asynchronously.
3. **Row Validation Loop:**
   - Mandatory field check.
   - Identifier mask check.
   - In-file duplicate key check.
   - Master entity existence check (Customer, Supplier, Item).
   - Sales stock availability simulation.
   - Tax type normalization (Company GSTIN state vs Party GSTIN state).
4. **Validation Results Tab:**
   - Display full Desktop parity table matching `ImportController.java:1198-1244`:
     `Sheet / Rows | Record / Reference | Mandatory | Format | Master Match | Data / Duplicate | Result / Error`
   - Red highlight for `FAILED` rows, Green for `PASSED`.
   - Block `[Execute Import]` button until `failedCount === 0`.

### 4.3. True Persistence Engine for All 8 Modules (`ImportService.js`)
Replace the mock/broken implementations with authentic API persistence:
1. **Item Master:** Map payload correctly with `sellingPrice`, `purchasePrice`, `minimumStock`, `openingStock`, `brand`, `material`, `size`, `remarks`, `unit`, `hsn`, `gst`. Post to `/api/master/items` (or `/api/master/items/bulk`).
2. **Customers & Suppliers:** Map payload correctly with `partyCode`, `name`, `contactPerson`, `phone`, `email`, `gstin`, `address`, `openingBalance`, `partyType`. Post to `/api/master/parties`.
3. **Sales Register:** Group file rows by `invoice_no`. Build multi-line `SalesDto` with line items, tax calculations via `DocumentCalculationEngine.js`, and optional charges. Post to `/api/operations/sales`.
4. **Purchase Bills:** Group file rows by `invoice_no`. Build multi-line `PurchaseDto` with line items, tax calculations, and parsed charges. Post to `/api/operations/purchases`.
5. **Master Categories & Values:** Upsert Category via `/api/master/categories/upsert`, then save lookup values via `/api/master/lookups` with proper fields (`lookupCode`, `lookupValue`, `lookupType`, `description`, `displayOrder`, `active`).
6. **Purchase Recon:** Calculate SHA-256 file fingerprint. Read all sheets. Construct `ImportRequest` with row array. Post to `POST /api/purchase-recon/imports`.
7. **Bank Statement:** Parse Kotak statement CSV into structured headers and transaction rows. Compute row fingerprints. Post to `POST /api/bank-statements/imports`.

### 4.4. Completion Status Popup & Excel Result Report Generator
Implement the post-import completion workflow matching Desktop `ImportController.java:1563-1611`:
1. **Interactive Result Modal (`#modal-import-result`):**
   - Displays icon, semantic title (*"Import Completed Successfully"* or *"Import Completed with Warnings"*).
   - KPI metrics: Processed, Passed, Imported (new), Updated, Skipped, Failed.
   - Action Button 1: **"📥 Download Result Report (.xlsx)"**
   - Action Button 2: **"OK"**
2. **Downloadable Result Report:**
   - Generates `Import_Result_<Module>_<Timestamp>.xlsx` using SheetJS:
     - **Summary Sheet:** Module, Source File, Mode, Processed, Passed, Imported, Updated, Skipped, Failed, Timestamp.
     - **Import Results Sheet:** Source Row(s), Reference, Status, Action, Tax Type, GST %, Message.
3. **Completed State Panel Actions:**
   - **"👁️ View Imported Records":** Calls `NavigationRouter.selectNav(targetView)` to immediately navigate to the relevant register with data refreshed.
   - **"🔄 Start Another Import":** Resets the wizard to Step 1.

---

## 5. Scope Sign-Off & Next Steps

This document represents the complete technical investigation, root cause diagnosis, and architectural design for release `10.0.34.14`.

**Strict Constraint Adherence:**
- Zero code modifications or builds have been executed during this phase.
- Active development and IntelliJ copies remain untouched pending user sign-off.
- Upon user approval of this specification, implementation will proceed systematically across `ImportService.js`, `ImportController.js`, and `index.html`.
