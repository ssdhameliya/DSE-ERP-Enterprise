# DSE ERP Enterprise — Desktop & Web Parity Specification (v10.0.35.03)

**Document Status:** Pending User Review & Approval (Do NOT Build Until Approved)  
**Target Release:** Web `web-v10.0.35.03` / Desktop Baseline `v10.0.35`  
**Date:** October 19, 2026  
**Author:** Antigravity Pair Programming Engine  

---

## 1. Executive Summary

Based on end-to-end desktop analysis and user-provided screenshots, this specification addresses three critical disparity and runtime issues between Desktop and Web:

1. **Item Master & Stock Register UI & Functional Parity:**
   * **Item Master (`ItemMaster.fxml` vs `#view-item-master`):**
     * Title, subtitle, and top-right header actions mismatched (Web had search and export squeezed into header; Desktop has `+ New Item` top-right and an entity toolbar below KPI cards).
     * Missing entity toolbar in Web (`Edit`, `Delete Item`, `Refresh`, `Import Excel`, `Export Excel`).
     * Colorful pill badge styling injected into table headers (`[ITEM CODE]`, `[ITEM NAME]`) in Web instead of Desktop clean typography.
     * Actions dropdown mismatch (Desktop has `+ Create Item`, `View Item`, `Edit Item`, `Audit Trail`, `Create Sale`, `Create Purchase`, `Delete Item`).
     * Dialog modal List of Values (Category, Unit, GST, Discount) and bindings not behaving with full desktop parity.
   * **Stock Register (`Inventory.fxml` vs `#view-inventory`):**
     * Table headers had colorful pill badge styling instead of clean desktop headers.
     * Row action dropdown in Web had mismatch (`Stock Adjustment`, `Stock Movement History`, `Barcode Label Print`, `Stock Revaluation`), whereas Desktop Stock Register has `View Item`, `Edit Item`, `Adjust Stock`, `View History`.
     * Status column in Web displayed generic `HEALTHY` / `OUT OF STOCK` badges instead of Desktop's `In Stock` (green dot), `Out of Stock` (red dot), `Low Stock` (orange dot).
     * Category dropdown filter in Web was not updating dynamically on reload (`if (!sel || sel.options.length > 1) return;`).

2. **Bank Statement Import (`KotakBankStatementCsvParser.java` vs `BankStatementController.js`):**
   * Web threw `Failed to parse statement CSV: parseCsvLine is not defined` (Image 5).
   * Web called `parseCsvLine(lines[i])` which was never implemented in the codebase.
   * Web parsing was rudimentary and lacked RFC 4180 quoted-field handling, Kotak statement metadata header parsing (`Account No.`, `Period From/To`, `Branch`, `Currency`), row validation, and SHA-256 transaction fingerprinting expected by Spring Boot `/api/bank-statements/imports`.

3. **Master Lookup Code Auto-Generation & Display Value Overwriting:**
   * In Web `MasterDataController.js` (`onLookupValueInput`), typing in the Display Value field (`#m-lookup-value`) dynamically converted the value into an uppercase slug and overwrote the `#m-lookup-code` field.
   * In Desktop `LookupDialogController.java`, the `Lookup Code` is system-generated based on reference format rules (`REF_LOOKUP` / `service.generateNextCode(type)`). It is read-only and locked; typing in the display value NEVER overwrites the reference format lookup code (except strictly for user security roles in role mode).

---

## 2. Issue 1: Item Master Deep-Dive & Parity Matrix

### A. Desktop Baseline (`ItemMaster.fxml` & `ItemMasterController.java`)
* **Header:**
  * Title: `Items Master`
  * Subtitle: `Manage product codes, tax, pricing and reorder settings`
  * Top-Right Primary Action: `+ New Item` (blue pill button)
* **KPI Section (4 Standard Cards):**
  1. Card 1 (Blue): `Total Items` (pill: `All`), Count, Subtitle: `Catalog records`
  2. Card 2 (Purple): `Categories` (pill: `Groups`), Count, Subtitle: `Active item groups`
  3. Card 3 (Orange): `Low Stock` (pill: `Alert`), Count, Subtitle: `At or below minimum`
  4. Card 4 (Green): `Catalog Value` (pill: `Value`), Amount (`₹ 13,147,941,467.00`), Subtitle: `Opening stock valuation`
* **Filter Bar / Toolbar (Located below KPI cards, above Table):**
  * Search Input: `Search item code, name, category or brand...`
  * Button: `Edit` (secondary button; edits currently selected row; shows warning toast if no row selected)
  * Button: `Delete Item` (danger button; deletes currently selected row with confirmation)
  * Button: `Refresh` (secondary button; reloads catalog from `/api/master/items`)
  * Vertical Separator
  * Button: `Import Excel` (secondary button; opens Data Import Studio with Item Master template pre-selected)
  * Button: `Export Excel` (secondary button; triggers `/api/master/items/export/excel`)
* **Table Columns:**
  1. `Sel` (Checkbox for bulk selection)
  2. `Item Code` (Mono cyan/blue)
  3. `Item Name` (Font weight 600)
  4. `Category` (Neutral pill badge)
  5. `Unit` (PCS, NOS, etc.)
  6. `HSN/SAC` (Mono)
  7. `% GST` (Right-aligned, e.g. `18.00`)
  8. `% Discount` (Right-aligned, e.g. `0.00%`)
  9. `Purchase Price` (Right-aligned, e.g. `₹1,200.00`)
  10. `Selling Price` (Right-aligned, e.g. `₹1,500.00`)
  11. `In Stock` (Right-aligned, formatted with 3 decimals e.g. `523,877.000`)
  12. `Min Stock` (Right-aligned, e.g. `10.000`)
  13. `Remarks` (Wrapped text preview)
  14. `Actions` (Purple menu button with dropdown)
  *(Note: Location, Brand, Material, Size remain hidden by default matching Desktop `colBrand.setVisible(false)` etc.)*
* **Table Row Actions Menu:**
  * `+ Create Item` (Opens Add Item modal)
  * `View Item` (Opens Item Detail Drawer / Modal)
  * `Edit Item` (Opens Edit Item modal with prefilled data)
  * `Audit Trail` (Opens Activity Timeline modal for item)
  * *Separator*
  * `Create Sale` (Navigates to Sales Invoice creation with item pre-selected)
  * `Create Purchase` (Navigates to Purchase Invoice creation with item pre-selected)
  * *Separator*
  * `Delete Item` (Prompts deletion with confirmation)
* **Table Footer:**
  * Left: `0 selected`, `Delete Selected (0)` button (disabled when 0 selected)
  * Right: `Showing X Records`

### B. Add / Edit Item Dialog Modal (`Itemdialog.fxml` Parity)
* **Header:** Title (`Add Item` or `Edit Item`), Subtitle (`Add a new item to your inventory catalog` or `Modify inventory details for item ...`)
* **Item Information Section:**
  * `Item Code *`: Read-only, auto-generated from `/api/master/items/next-code` (e.g. `ITEM0001`), locked with tooltip.
  * `Description *`: Text input.
  * `Category *`: Dropdown loaded from `/api/master/lookups/values-by-category-code?code=CATEGORY` (fallback: `['PIPE', 'FLANGE', 'FITTING', 'VALVE', 'FASTENER', 'GASKET']`).
  * `Unit *`: Dropdown loaded from `/api/master/lookups/values-by-category-code?code=UNIT` (fallback: `['PCS', 'NOS', 'MTR', 'KGS', 'SET', 'BOX', 'PKT', 'ROLL', 'TON']`).
  * `HSN Code *`: Text input (default `73063000`).
  * `GST % *`: Dropdown loaded from `/api/master/lookups/values-by-category-code?code=GST` (`0`, `5`, `12`, `18`, `28`).
  * `Default Discount % *`: Dropdown loaded from `/api/master/lookups/values-by-category-code?code=DISCOUNT` (`0`, `2`, `5`, `10`, `15`, `20`).
  * `Purchase Price`: Numeric input (default `0.00`).
  * `Selling Price`: Numeric input (default `0.00`).
  * `Remarks *`: Textarea input.
* **Stock Information Section:**
  * `Opening Stock *`: Numeric input (default `0.00`).
  * `Minimum Stock`: Numeric input (default `10.00`).
  * `Rack Location`: Text input (optional).
* **Footer Actions:** `Cancel` (secondary), `Save Item` / `Update Item` (primary).

---

## 3. Issue 1: Stock Register (Inventory) Deep-Dive & Parity Matrix

### A. Desktop Baseline (`Inventory.fxml` & `InventoryController.java`)
* **Header:**
  * Title: `Stock Register`
  * Subtitle: `Track inventory levels, reservations, valuation and stock movement`
  * Top-Right Primary Action: `+ Stock Adjustment` (blue pill button)
* **KPI Section (5 Standard Cards):**
  1. Card 1 (Blue): `Total Items` (pill: `Catalog`), Count, Subtitle: `Inventory records`
  2. Card 2 (Green): `In Stock` (pill: `Healthy`), Count, Subtitle: `Healthy stock levels`
  3. Card 3 (Orange): `Low Stock` (pill: `Warning`), Count, Subtitle: `Needs attention`
  4. Card 4 (Red): `Out of Stock` (pill: `Depleted`), Count, Subtitle: `Unavailable items`
  5. Card 5 (Purple): `Stock Value` (pill: `Valuation`), Amount, Subtitle: `Current purchase valuation`
* **Filter Bar / Toolbar:**
  * Search Input: `Search item code, name, HSN or location...`
  * Category Dropdown: `All Categories` (dynamically populated from unique item categories)
  * Status Dropdown: `All Status` (Options: `All Status`, `In Stock`, `Low Stock`, `Out of Stock`)
  * Button: `Refresh` (reloads inventory items)
  * Button: `Export Excel` (triggers export)
* **Table Columns:**
  1. `Item Code`
  2. `Item Name`
  3. `Category`
  4. `HSN/SAC`
  5. `Unit`
  6. `% GST`
  7. `In Stock` (Quantity)
  8. `Available` (Available Stock)
  9. `Min Stock` (Reorder Point)
  10. `Value` (Stock * Purchase Rate)
  11. `Status` (Status with indicator dot matching Desktop)
  12. `Actions` (Row actions menu button)
* **Status Cell Rendering (Desktop Parity):**
  * `In Stock`: Green dot icon + `In Stock` text
  * `Out of Stock`: Red dot icon + `Out of Stock` text
  * `Low Stock`: Orange dot icon + `Low Stock` text
* **Table Row Actions Menu:**
  * `View Item` (Opens Item Detail Drawer / Modal)
  * `Edit Item` (Opens Edit Item dialog)
  * `Adjust Stock` (Opens Stock Adjustment modal for this item)
  * `View History` (Opens Stock Movement History modal for this item)
* **Table Footer:**
  * Right: `Showing X Records`

---

## 4. Issue 2: Bank Statement Import Parity Specification

### A. Root Cause Analysis
In `BankStatementController.js` line 1024:
```javascript
const cols = parseCsvLine(lines[i]);
```
The helper function `parseCsvLine` was never declared or exported, throwing `Uncaught ReferenceError: parseCsvLine is not defined` whenever a CSV is selected for upload.

### B. End-to-End Desktop Parser Port (`KotakBankStatementCsvParser.java` Parity)
1. **RFC 4180 CSV Line Parsing Engine:**
   Implement strict state-machine parser in `BankStatementController.js` handling quotes, commas, escaped quotes (`""`), and whitespace:
   ```javascript
   function parseCsvLine(line) {
     const out = [];
     let cur = '';
     let q = false;
     for (let i = 0; i < line.length; i++) {
       const ch = line.charAt(i);
       if (ch === '"') {
         if (q && i + 1 < line.length && line.charAt(i + 1) === '"') {
           cur += '"';
           i++;
         } else {
           q = !q;
         }
       } else if (ch === ',' && !q) {
         out.push(cur);
         cur = '';
       } else {
         cur += ch;
       }
     }
     out.push(cur);
     return out;
   }
   ```
2. **Metadata & Header Extraction:**
   * Read pre-header lines:
     * Extract `Account No.` -> Bank Account Number
     * Extract `Currency` -> `INR`
     * Extract `Branch` -> Branch Name
     * Extract `Period From ... To ...` -> `statementFrom`, `statementTo`
     * Extract Account Holder from line 1 (e.g. `Jasvi Industries Pvt Ltd`)
   * Locate transaction header row via `Sl. No.` column (case-insensitive).
3. **Transaction Row Extraction:**
   * Column 0: `sourceRowNumber` (integer)
   * Column 1: `transactionTimestamp` (`dd-MM-yyyy HH:mm:ss` -> ISO format)
   * Column 2: `valueDate` (`dd-MM-yyyy` -> `YYYY-MM-DD`)
   * Column 3: `description` / Narration
   * Column 4: `reference` / Cheque / Ref No
   * Column 5: Amount (stripped of `,` and currency symbols)
   * Column 6: Direction (`DR` = debit, `CR` = credit)
   * Column 7: `balance`
   * Calculate `openingBalance = firstRow.balance - credit + debit` and `closingBalance = lastRow.balance`.
   * Compute SHA-256 fingerprint: `${account}|${ts}|${ref}|${debit.toFixed(2)}|${credit.toFixed(2)}|${bal.toFixed(2)}`.
4. **Backend Contract Alignment (`/api/bank-statements/imports`):**
   * Payload record matches `BankReconciliationDtos.ImportRequest`:
     ```json
     {
       "bankName": "Kotak Mahindra Bank",
       "bankAccount": "50200012345678",
       "accountHolder": "Jasvi Industries Pvt Ltd",
       "statementFrom": "2026-04-01",
       "statementTo": "2026-06-16",
       "currency": "INR",
       "openingBalance": 125000.50,
       "closingBalance": 348900.20,
       "sourceFingerprint": "...",
       "sourceFileName": "Kotak_Statement_Q1.csv",
       "sourceCsv": "...",
       "importedBy": "Admin",
       "dryRun": false,
       "rows": [ ... ]
     }
     ```
   * Handles duplicate detection, already-imported statements, and automatic workspace loading without alert crashes.

---

## 5. Issue 3: Master Lookup Code Auto-Generation Parity

### A. Root Cause Analysis
In `MasterDataController.js` lines 643–654:
```javascript
onLookupValueInput(val) {
  const codeField = document.getElementById('m-lookup-code');
  if (codeField && !codeField.disabled && (codeField.dataset.autoGenerated === 'true' || !codeField.value)) {
    const slug = (val || '').toUpperCase().trim().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    codeField.value = slug;
    codeField.dataset.autoGenerated = 'true';
  }
}
```
Whenever the user typed in `#m-lookup-value` (Display Value), `onLookupValueInput` dynamically created a slug and overwrote `#m-lookup-code`.

### B. Desktop Parity Specification (`LookupDialogController.java`)
1. **System-Generated Reference Format Codes:**
   * In Desktop, `Lookup Code` is generated from the category reference sequence via `/api/master/lookups/next-code?type=${category}` (e.g., `LKP001`, `CAT004`, `UNT010`).
   * When `#modal-add-lookup` opens:
     * Fetch `nextCode` via `MasterService.getNextLookupCode(category)`.
     * Set `#m-lookup-code.value = nextCode`.
     * Set `#m-lookup-code.readOnly = true` (or disabled) with visual styling and tooltip: *"System-generated master identifier"*.
2. **Eliminate Value-to-Code Overwrite:**
   * Remove the automatic slug overwriting from `onLookupValueInput` for standard master categories.
   * Only in role configuration mode (`isRoleType(category)` like `ROLE` / `USER_ROLE`) is the role identity tied to the display name. For all other business categories, the lookup code remains strictly auto-generated and immutable.
3. **Form Submissions:**
   * Ensure `submitSaveLookup()` preserves the auto-generated code and includes `rowVersion: 0` on new creations to prevent Spring JPA optimistic lock errors.

---

## 6. Implementation Scope & File Changes

| File | Purpose of Modifications |
|---|---|
| `d:\ERP Website\admin\index.html` | 1. Update `#view-item-master` header, KPI cards, and add desktop entity toolbar (`Edit`, `Delete`, `Refresh`, `Import Excel`, `Export Excel`).<br>2. Align `#view-inventory` table headers, status indicators, and toolbar buttons.<br>3. Align `#modal-item-dialog` form layout and discount combobox.<br>4. Lock `#m-lookup-code` in `#modal-add-lookup` as readonly. |
| `d:\ERP Website\admin\js\controllers\ItemMasterController.js` | 1. Implement toolbar actions: `editItem()`, `deleteItem()`, `refreshItems()`, `importItems()`, `exportItems()`.<br>2. Update row actions menu to match Desktop (`+ Create Item`, `View Item`, `Edit Item`, `Audit Trail`, `Create Sale`, `Create Purchase`, `Delete Item`).<br>3. Stock Register: Align row actions (`View Item`, `Edit Item`, `Adjust Stock`, `View History`) and status indicators (`In Stock`, `Out of Stock`, `Low Stock`).<br>4. Fix dynamic category filter reload.<br>5. Populate all modal LOVs (Category, Unit, GST, Discount) via `MasterService`. |
| `d:\ERP Website\admin\js\controllers\BankStatementController.js` | 1. Implement `parseCsvLine(line)` RFC 4180 parsing engine.<br>2. Implement Kotak bank statement metadata and timestamp parsing matching `KotakBankStatementCsvParser.java`.<br>3. Generate SHA-256 fingerprints and construct compliant `/api/bank-statements/imports` payload. |
| `d:\ERP Website\admin\js\controllers\MasterDataController.js` | 1. Remove display value slug overwriting in `onLookupValueInput()`.<br>2. Lock `#m-lookup-code` as read-only system-generated code from `getNextLookupCode()`. |
| `d:\ERP Website\admin\js\version.js` & `version.json` | Bump version to `10.0.35.03` with release highlights. |

---

## 7. Approval Request

**Do NOT build or modify any code until you review and confirm this specification.**  
Please review the proposed design and parity contracts above and confirm if you would like me to proceed with implementation for `web-v10.0.35.03`.
