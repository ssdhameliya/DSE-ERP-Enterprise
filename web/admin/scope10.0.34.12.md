# Scope Specification: Bank & Expense + Bank Statement Desktop Parity (`scope10.0.34.12.md`)

**Target Baseline:** Desktop ERP `10.0.34` (`BankExpenseController.java`, `BankExpense.fxml`, `BankStatementController.java`, `BankStatement.fxml`, `BankStatementApiClient.java`, `OperationsApiClient.java`, `FinanceService.java`)  
**Target Web Release:** Web Admin Studio `10.0.34.12` (`d:\ERP Website\admin`)  
**Date:** October 18, 2026  
**Status:** CANONICAL SPECIFICATION & AUDIT COMPLETE — 45 DISCREPANCIES IDENTIFIED (STRICTLY AUDIT & SPECIFICATION PHASE — ZERO CODE MODIFIED)

---

## 1. Executive Summary & Audit Overview

The user requested an end-to-end, screen-by-screen, button-by-button, action-by-action, and master-lookup-by-master-lookup discrepancy analysis between the authoritative Desktop ERP `10.0.34` and the current Web Admin Studio (`d:\ERP Website\admin`), specifically focusing on:
1. **Screen 1: Bank Entry** (under `Bank & Expense`)
2. **Screen 2: Expense Entry** (under `Bank & Expense`)
3. **Screen 3: Bank Statement (Empty / Initial State)** (Reconciliation Module)
4. **Screen 4: Bank Statement (Populated State & Actions Context Menu)** (Reconciliation Module)
5. **Screen 5: Linked Transactions Modal Popup** (`View all ERP transactions linked to this bank entry`)
6. **All Associated Modal Dialogs, Popups, and Master Lookup Bindings** (`BANK_ACCOUNT`, `PAYMENT_MODE`, `EXPENSE_CATEGORY`, `BANK_NAME`).

Per the user's strict instruction:  
> *"dont build anything just anaylisus and found the issues so full module sync with desktop .. and create next version .md file.."*

No application code has been altered or built in this turn. All findings, UI discrepancies, missing modal popups, lookup gaps, and architectural divergences have been cataloged into this specification file (`scope10.0.34.12.md`).

### Total Discrepancies Count: **45 Issues Identified**
- **Screen 1 (Bank Entry):** 12 Issues
- **Screen 2 (Expense Entry):** 10 Issues
- **Screen 3 (Bank Statement - Empty State):** 8 Issues
- **Screen 4 (Bank Statement - Populated State & Context Menu):** 4 Issues
- **Screen 5 (Linked Transactions Modal):** 1 Critical Major Issue
- **Dialogs, Popups & Master Lookups:** 10 Issues

---

## 2. Screen-by-Screen & Button-by-Button Discrepancy Matrix

### Screen 1: Bank Entry (`BankExpense.fxml` / Screenshot 1)

| # | Element / Button / Action | Desktop ERP Baseline (`10.0.34`) | Web Admin Studio Current State | Discrepancy & Required Parity Fix |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **Top Mode Switcher** | 3 unified buttons in top header strip: `Bank Entry`, `Expense Entry`, `Bank Reconciliation`. Mode toggles in-place dynamically without route changes. | Web splits Bank Entry and Expense Entry into two disconnected views (`#view-bank-entry` and `#view-expense-entry`), losing filter state and causing duplicate DOM. | Unify into single container with reactive in-place mode switching matching `BankExpense.fxml`. |
| **02** | **KPI 1 (Balance)** | Label: `Bank Balance`, Pill: `Balance` (neutral grey), Note: `Current balance`. Displays ledger bank balance. | Label: `TOTAL NET BALANCE`, Pill: `Cash & Bank`, Note: `Net cash & bank ledger position`. | Change label to `Bank Balance`, pill to `Balance`, note to `Current balance`. |
| **03** | **KPI 2 (Deposits)** | Label: `Deposits`, Pill: `Inflow` (green), Value: `₹ 1,500.00`, Note: `1 entries`. Tracks receipt count. | Label: `TOTAL INFLOW`, Pill: `Deposits`, Note: `Receipt vouchers & contra in`. Missing entry count. | Align label to `Deposits`, pill to `Inflow`, note to `{count} entries`. |
| **04** | **KPI 3 (Withdrawals)** | Label: `Withdrawals`, Pill: `Outflow` (orange), Value: `₹ 0.00`, Note: `0 entries`. Tracks withdrawal count. | Label: `TOTAL OUTFLOW`, Pill: `Withdrawals`, Note: `Payment vouchers & contra out`. Missing entry count. | Align label to `Withdrawals`, pill to `Outflow`, note to `{count} entries`. |
| **05** | **KPI 4 (Pending Reconcile)** | Label: `Pending Reconcile`, Pill: `Net` (blue/teal), Value: `0 entries`, Note: `₹ 0.00`. Tracks unreconciled count & amount. | Label: `NET FLOW`, Pill: `Settlement`, Note: `Inflow minus outflow`. Incompatible metric calculation. | Recompute KPI 4 to show unreconciled bank entries count and total pending amount. |
| **06** | **Register Title Header** | Sub-heading: `Bank Entries`. Clean section title above filter toolbar. | Header: `Bank Entry Journal` with long descriptive paragraph. | Align section title to `Bank Entries`. |
| **07** | **Search Field** | Prompt: `Search reference, description...` with embedded search icon inside input shell (`financeSearchIcon`). | Generic text input with placeholder `Search reference, narration, account...` without embedded icon shell. | Style search shell with embedded search icon and match prompt text. |
| **08** | **Type Filter Dropdown** | ComboBox options: `All Types`, `Deposit`, `Withdrawal`. | Select options: `All Types`, `Deposit / Receipt`, `Withdrawal / Payment`, `Contra Transfer`. | Align dropdown values to `All Types`, `Deposit`, `Withdrawal`. |
| **09** | **Date Filter Presets** | Defaults to Current Year Date Range (`filterFrom` = 01 Jan current FY, `filterTo` = 31 Dec / current date). | Defaults to arbitrary 6 months ago. | Initialize date pickers to `01 Jan {Year}` to `31 Dec {Year}`. |
| **10** | **Filter Toolbar Action Buttons** | Right-aligned buttons: `Reset` (undo icon), `Refresh` (refresh icon), `+ Add Entry` (Primary purple button). | Missing `Reset` button. `Refresh` and `+ New Bank Entry` are placed in top header instead of the filter bar. | Move `Reset`, `Refresh`, and `+ Add Entry` into right-aligned filter toolbar. |
| **11** | **Table Column Structure** | Columns: `Date`, `Type` (green deposit chip / red withdrawal chip), `Description`, `Account`, `Mode` (**HIDDEN in Bank mode**), `Reference`, `Amount` (green for deposit, red for withdrawal), `Match / Link`, `Actions`. | `Payment Mode` is visible in Bank mode table; column names include verbose slashes (`Description / Narration`, `Reference / UTR`). | Hide `Mode` column when in Bank mode; simplify headers to match desktop. |
| **12** | **Row Context Action Menu** | Button: `Actions ▼`. Menu: `View Bank Entry`, `Open Bank Statement` (if statement linked), `Open Linked ERP Record` (if ERP doc linked), `Edit Bank Entry`, `Delete Bank Entry`. | No dropdown menu; only row click opens drawer, missing statement/ERP direct navigation. | Implement full `Actions ▼` menu with statement and ERP record navigation. |

---

### Screen 2: Expense Entry (`BankExpense.fxml` / Screenshot 2)

| # | Element / Button / Action | Desktop ERP Baseline (`10.0.34`) | Web Admin Studio Current State | Discrepancy & Required Parity Fix |
| :--- | :--- | :--- | :--- | :--- |
| **13** | **Page Identity** | Title: `Expense Entry`, Subtitle: `Manage and track all your business expenses`. Mode button `Expense Entry` highlighted. | Title: `Operating Expense Register`, Subtitle: `Factory utilities, consumables...`. Separate view. | Align Title to `Expense Entry` and Subtitle to `Manage and track all your business expenses`. |
| **14** | **KPI 1 (Month Expenses)** | Label: `Total Expenses (This Month)`, Pill: `Balance`, Value: `₹ 500.00`, Note: `1 entries`. | Label: `TOTAL OPERATING EXPENSES`, Pill: `Total`, Note: `All recorded expense vouchers`. | Align label to `Total Expenses (This Month)`, pill to `Balance`, note to `{count} entries`. |
| **15** | **KPI 2 (Year Expenses)** | Label: `Total Expenses (This Year)`, Pill: `Inflow`, Value: `₹ 500.00`, Note: `Year to date`. | Label: `THIS MONTH`, Pill: `Current FY`, Note: `Current period expenses`. | Align label to `Total Expenses (This Year)`, pill to `Inflow`, note to `Year to date`. |
| **16** | **KPI 3 (Top Category)** | Label: `Top Expense Category`, Pill: `Outflow`, Value: `OFFICE EXPENSES`, Note: `₹ 500.00`. | Label: `PAID OUTFLOW`, Pill: `Settled`, Note: `Bank / Cash disbursed`. | Align label to `Top Expense Category`, pill to `Outflow`, note to `{amount}`. |
| **17** | **KPI 4 (Pending Reconcile)** | Label: `Pending Reconcile`, Pill: `Net`, Value: `0 entries`, Note: `₹ 0.00`. | Label: `EXPENSE CATEGORIES`, Pill: `Heads`, Note: `Active accounting heads`. | Recompute KPI 4 to show unreconciled expense entries count and amount. |
| **18** | **Category Filter Dropdown** | Populated dynamically from Master Data (`lookupService.getValuesByCategoryCode("EXPENSE_CATEGORY")`) prefixed with `All Categories`. | Hardcoded static HTML `<option>` list (`Office & Admin`, `Factory Utilities`, `Courier & Freight`...). | Dynamically populate from `EXPENSE_CATEGORY` master lookup via `MasterService`. |
| **19** | **Filter Toolbar Buttons** | Right-aligned: `Reset` (icon), `Refresh` (icon), `+ Add Expense` (Primary purple button). | Missing `Reset` button. `Refresh` and `+ Record Expense` placed in top header. | Place `Reset`, `Refresh`, `+ Add Expense` in filter bar. |
| **20** | **Table Columns** | `Date`, `Type: Category` (category chip), `Description`, `Account`, `Mo` / `Mode` (**VISIBLE in Expense mode**), `# Reference`, `Amount` (red negative amount), `Match / Link`, `Actions`. | Columns: `Date`, `Category`, `Description / Voucher`, `Payee / Paid To` (**not in desktop!**), `Payment Mode`, `Voucher #`, `Amount`, `Match / Link`, `Actions`. | Remove `Payee / Paid To` column; show `Mode` column; format headers to match desktop. |
| **21** | **Upload Bill / Attachment** | Expense dialog includes `Upload Bill (Optional)` with `Choose Bill` file chooser (`.pdf`, `.png`, `.jpg`, `.jpeg`) + `No file selected` label. | Completely missing in Web `#modal-finance-entry`! | Add bill attachment file uploader to Expense Entry dialog. |
| **22** | **Row Context Action Menu** | Button: `Actions ▼`. Menu: `View Expense`, `Open Bank Statement` (if statement linked), `Open Linked ERP Record`, `Edit Expense`, `Delete Expense`. | No dropdown menu; missing statement/ERP direct navigation. | Implement full `Actions ▼` menu with statement and ERP record navigation. |

---

### Screen 3: Bank Statement — Empty State (`BankStatement.fxml` / Screenshot 3)

| # | Element / Button / Action | Desktop ERP Baseline (`10.0.34`) | Web Admin Studio Current State | Discrepancy & Required Parity Fix |
| :--- | :--- | :--- | :--- | :--- |
| **23** | **Page Identity** | Icon: 🏛️ Bank building, Title: `Bank Statement`, Subtitle: `Review and reconcile imported bank transactions`. | Title: `Bank Statement Reconciliation`, Subtitle: `Reconcile imported bank CSV statements with ERP...`. | Align Title to `Bank Statement` and Subtitle to `Review and reconcile imported bank transactions`. |
| **24** | **Statement Selector (`cmbBatch`)** | Label: `Statement / Bank Account`, Prompt: `Select recent statement`. Items formatted as `⚠️ KOTAK MAHINDRA BANK - ****617..` with warning badge if unreconciled. | Label: `Statement / Account:`, unformatted select without warning badge or account masking. | Format batch items with account masking (`****1234`) and unreconciled warning badge. |
| **25** | **Header Buttons** | `Browse Statements` (icon `history`), `Delete Statement` (icon `delete`, disabled when no batch), `Import Statement` (icon `import`, primary). | Button text says `Browse History` (wrong label!), `Delete Statement` is not disabled when batch is empty. | Rename button to `Browse Statements`, disable `Delete Statement` when no batch is active. |
| **26** | **8 KPI Cards Layout & Labels** | 8 cards in single grid: `Total Transactions`, `Unmatched`, `Suggested`, `Matched`, `Expenses`, `Total Credits`, `Total Debits`, `Reconciled` (with batch completion note). Title Case. | Labels are all UPPERCASE (`TOTAL TXNS`, `UNMATCHED`, etc.) and some subtext notes are truncated. | Update KPI titles to Title Case matching desktop. |
| **27** | **Filter Toolbar 3-Row Layout** | 3 clear stacked rows: Row 1 = Search input + `Search` + `Reset` + `Refresh`; Row 2 = Bulk toolbar (`Select all visible`, `X selected`, `Reviewed`, `Ignore`, `Move to Expense`, `Move to Bank Entry`); Row 3 = Date pickers, `Reconciliation Status`, `Transaction Type`, `Batch Progress` bar with `0 / 0 reconciled`. | Crammed into an inconsistent layout where Row 1 and Row 3 are merged into one overflowing flex row; missing `Search` button. | Reorganize into exact 3-row layout from `BankStatement.fxml`. |
| **28** | **Empty State Placeholder** | Centered placeholder: Title `No bank statements imported`, Subtitle `Import a bank statement to start reconciliation.` | Table row: `No bank statement transactions to display`. | Style centered empty placeholder with exact desktop copy. |
| **29** | **Table Footer & Page Controls** | Left: `Showing 0 records` (purple pill). Right: Rows dropdown (`50`), `< Previous`, `Page 0 of 0` (pill), `> Next`, Status badge `No statement selected`. | Missing rows dropdown (`50`), footer progress bar is redundant, status badge incorrectly displays `IMPORTED`. | Add Rows dropdown, align pagination buttons, show `No statement selected` when batch is empty. |
| **30** | **Bottom Guidance Banner** | Blue banner: `ⓘ How Matching Works`: `Match Transaction → the application searches automatically → Review the suggestion → Confirm or find another → linked Bank / Expense Entry is stored.` | Missing or misplaced banner. | Implement bottom banner with exact desktop text and styling. |

---

### Screen 4: Bank Statement — Populated State & Context Menu (Screenshot 4)

| # | Element / Button / Action | Desktop ERP Baseline (`10.0.34`) | Web Admin Studio Current State | Discrepancy & Required Parity Fix |
| :--- | :--- | :--- | :--- | :--- |
| **31** | **Row Action Menu Trigger** | Purple button: `Actions ▼` with actions icon (`bank-row-action`). | Button says `::: Actions`. | Style button as purple pill `Actions ▼`. |
| **32** | **Context Menu Categorized Groups** | Distinct styled section headers: `VIEW` (`View Transaction Details`, `View Imported Statement`, `View Audit History`); `RECONCILIATION` (`View Match / Linked Record` or `Match Transaction`); `REVERSAL` (`Unmatch / Reverse`); `STATUS` (`Mark for Review`, `Mark as Ignored`). | Flat, unorganized dropdown without category headers (`VIEW`, `RECONCILIATION`, `REVERSAL`, `STATUS`). Missing `View Imported Statement` option. | Implement categorized dropdown menu with exact desktop headers and action triggers. |
| **33** | **Match / Link Column Hyperlinks** | Shows `2 linked transactions` (clickable link opening Linked Transactions Modal) or single doc like `PRC-2026-00007` (clickable link navigating to Purchase Recon). | Plain text or static link that fails to open multi-allocation modal. | Bind click handler to open the Screenshot 5 Linked Transactions Modal. |
| **34** | **Table Column Header Semantic Icons** | Headers include semantic icons: Date (📅), Value Date (📅), Reference (🔢), Description (📄), Debit (🔻), Credit (🔺), Balance (💰), Status (🛡️), Match/Link (🔗), Actions (⚙️). | Plain text headers without icons. | Decorate table headers with desktop semantic icons. |

---

### Screen 5: Linked Transactions Modal Dialog (Screenshot 5)

| # | Element / Button / Action | Desktop ERP Baseline (`10.0.34`) | Web Admin Studio Current State | Discrepancy & Required Parity Fix |
| :--- | :--- | :--- | :--- | :--- |
| **35** | **CRITICAL: Linked Transactions Modal Popup** | **Dedicated 900px modal dialog** (`BankStatementController.java:823-856`):<br>• Header: ⓘ `Information` • `View all ERP transactions linked to this bank entry.`<br>• 5 Metric Cards: `Bank Ref` (000522957600), `Linked Count` (2), `Bank Linked` (₹ 9,900.00), `Round-off` (₹ 0.00), `Difference` (₹ 0.00)<br>• Allocations Breakdown Table: `Document No`, `Transaction Type`, `Bank Amount`, `Round-off`, `Action` (Button: `View Payment` / `View Refund` / `View`)<br>• Footer: `2 linked transactions • Use View to open the existing linked workflow.`<br>• Button: `✖ Close`. | **COMPLETELY MISSING IN WEB!**<br>Web has no modal dialog or service handler for multiple ERP transactions linked to a single bank entry. | **Must build full modal dialog `#modal-linked-allocations`** matching Screenshot 5 and `BankStatementController.java:823-856`. |

---

### Modal Dialogs, Popups & Master Lookup Gaps

| # | Dialog / Lookup Element | Desktop ERP Baseline (`10.0.34`) | Web Admin Studio Current State | Discrepancy & Required Parity Fix |
| :--- | :--- | :--- | :--- | :--- |
| **36** | **Master Lookup: `BANK_ACCOUNT`** | Populates account ComboBoxes from `lookupService.getByCategoryCode("BANK_ACCOUNT")`, formatted as `accountNumber - bankName` (e.g. `90999999 - SBI`, `HDFC Bank - Current`), falling back to `payment.bankName` / `payment.accountNumber`, and lastly `"Cash / General"`. | Hardcoded static `<option>` tags in `index.html` (`HDFC Bank - Current (50200012345678)`...). Fails when user configures custom bank accounts in Master Data. | Dynamically populate from `MasterService.getLookups('BANK_ACCOUNT')`. |
| **37** | **Master Lookup: `PAYMENT_MODE`** | Populates payment modes from `lookupService.getValuesByCategoryCode("PAYMENT_MODE")` (`NEFT/RTGS`, `UPI`, `CHEQUE`, `CASH`, `CARD`, `NETBANKING`). | Hardcoded static `<option>` tags in `index.html`. | Dynamically populate from `MasterService.getLookupValues('PAYMENT_MODE')`. |
| **38** | **Master Lookup: `EXPENSE_CATEGORY`** | Populates expense categories from `lookupService.getValuesByCategoryCode("EXPENSE_CATEGORY")` (`OFFICE EXPENSES`, `RENT & PREMISES`, `SALARY & WAGES`, etc.). | Hardcoded static `<option>` tags in `index.html`. | Dynamically populate from `MasterService.getLookupValues('EXPENSE_CATEGORY')`. |
| **39** | **Transaction Details & ERP Note Modal** | Opens 760px dialog (`viewEdit`): Shows transaction overview, direction, hero amount, account balance, status, and an internal ERP note textarea with counter (`0 / 500`) and `Save Note` button calling `/api/bank-statements/transactions/{id}/note`. | Inline drawer with no ERP note textarea and no note saving capability. | Implement `#modal-statement-txn-details` with 500-char ERP note editor and note API integration. |
| **40** | **Imported Statement Source & Evidence Modal** | Opens 780px dialog (`renderStatementSource`): Shows Bank, Account, Account Holder, Period, Source File, SHA-256 fingerprint, `Copy SHA-256` button, and line-numbered raw CSV evidence viewer. | Completely missing in Web. | Implement `#modal-statement-source-evidence` showing CSV evidence and SHA-256 copy. |
| **41** | **Browse Statements History Dialog** | Opens 1040px dialog (`toggleStatementHistory`): Search input, 4-filter grid (`Bank / Account` from `BANK_ACCOUNT`, `Status`, `Statement From`, `Statement To`), `Reset`, `Search`, History table (`Imported`, `Bank / Account`, `Period`, `Status`, `Rows`), pagination, and action buttons: `Delete Statement` (danger) and `Open Statement` (primary). | Displays an unstyled inline panel below the table lacking the account filter, status filter, date filters, and delete button. | Refactor into dedicated modal `#modal-statement-history` with full 4-filter grid and delete/open actions. |
| **42** | **Delete Statement 2-Step Safety Protocol** | Step 1 shows impact summary (total rows, matched, expenses, ignored) with warning that reconciliations will be reversed. Step 2 requires typing the exact word `"DELETE"` into a confirmation prompt before calling `/api/bank-statements/imports/{id}?confirmation=DELETE`. | Uses basic browser `confirm()` without impact metrics and without the `"DELETE"` typing safeguard. | Implement 2-step safety modal with impact metrics and mandatory `"DELETE"` input. |
| **43** | **Mark for Review & Ignore Reason Dialogs** | Desktop requires entering a mandatory reason string before marking review (`/api/bank-statements/transactions/{id}/review`) or ignore (`/api/bank-statements/transactions/{id}/ignore`), ensuring decisions are recorded in the audit trail. | Submits hardcoded strings (`"Reviewed"`, `"User ignored"`) without prompting the user. | Prompt user for a mandatory reason dialog before submitting review or ignore. |
| **44** | **Match Candidate Multi-Allocation & Round-off** | Allows selecting multiple ERP candidate documents (Sales, Purchases, Returns) with custom allocations, round-off adjustment check within configured tolerance (`roundingAdjustment`), and warning on partial settlements. | `#modal-match-candidate` supports only single-row selection with hardcoded match payload. | Support multi-candidate selection, allocation input, round-off tolerance checking, and partial settlement confirmation. |
| **45** | **Bulk Move to Expense & Bank Entry Dialogs** | Prompts user for target Category, Account, and Payment Mode before executing bulk creation via `/api/bank-statements/transactions/bulk/expense` and `/bulk/bank-entry`. | Basic alert without prefill modal. | Implement prefill confirmation dialogs for bulk conversion. |

---

## 3. Comprehensive Master Lookup Architecture

Every popup, modal, and screen selector must pull its values dynamically from the authoritative Master Data repository. No static values may be hardcoded:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MASTER DATA LOOKUP REPOSITORY                         │
├────────────────────────────────┬────────────────────────────────────────────┤
│ Lookup Category Code           │ Consuming Screens & Popups                 │
├────────────────────────────────┼────────────────────────────────────────────┤
│ BANK_ACCOUNT                   │ 1. Bank Entry Dialog (Account select)       │
│                                │ 2. Expense Entry Dialog (Account select)    │
│                                │ 3. Bank Statement Import Dialog             │
│                                │ 4. Statement History Filter (Account)      │
│                                │ 5. Bulk Move to Bank/Expense Dialogs       │
├────────────────────────────────┼────────────────────────────────────────────┤
│ PAYMENT_MODE                   │ 1. Bank Entry Dialog (Payment Mode select)  │
│                                │ 2. Expense Entry Dialog (Payment Mode)     │
│                                │ 3. Bulk Move to Bank/Expense Dialogs       │
├────────────────────────────────┼────────────────────────────────────────────┤
│ EXPENSE_CATEGORY               │ 1. Expense Entry Dialog (Category select)   │
│                                │ 2. Expense Filter Dropdown (All Categories)│
│                                │ 3. Bulk Move to Expense Dialog (Category)  │
├────────────────────────────────┼────────────────────────────────────────────┤
│ BANK_NAME                      │ 1. Bank Statement Import Dialog (Bank Name)│
│                                │ 2. Payment & Bank Settings                 │
└────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 4. Implementation Roadmap for Version `10.0.34.12`

When the user approves development, implementation will follow these strict phases:

### Phase 1: HTML Architecture Refactoring ([`index.html`](file:///d:/ERP%20Website/admin/index.html))
1. **Unify Bank & Expense Screen:**
   - Consolidate `#view-bank-entry` and `#view-expense-entry` into a single unified workspace with top mode strip (`Bank Entry`, `Expense Entry`, `Bank Reconciliation`).
   - Align 4 KPI cards and 3 filter toolbar buttons (`Reset`, `Refresh`, `+ Add Entry` / `+ Add Expense`).
2. **Bank Statement Layout Parity:**
   - Implement the exact 3-row filter toolbar layout from `BankStatement.fxml`.
   - Update 8 KPI cards to Title Case with exact desktop notes.
   - Refactor empty state placeholder and footer controls.
3. **Modal Dialogs Construction:**
   - **Modal 1:** `#modal-linked-allocations` (Screenshot 5: 5 metric cards + linked breakdown table).
   - **Modal 2:** `#modal-statement-txn-details` (Transaction overview + 500-char ERP note editor).
   - **Modal 3:** `#modal-statement-source-evidence` (Source CSV viewer + SHA-256 fingerprint copy).
   - **Modal 4:** `#modal-statement-history` (1040px dialog with 4-filter grid and history table).
   - **Modal 5:** `#modal-statement-delete-confirm` (Two-step safety modal with impact metrics and "DELETE" text confirmation).
   - **Modal 6:** Refactor `#modal-finance-entry` to separate Bank Entry mode and Expense Entry mode with bill attachment uploader.

### Phase 2: JavaScript Controller Refactoring
1. **[`FinanceController.js`](file:///d:/ERP%20Website/admin/js/controllers/FinanceController.js):**
   - Bind dynamic master lookups for `BANK_ACCOUNT`, `PAYMENT_MODE`, and `EXPENSE_CATEGORY`.
   - Implement in-place mode switching without navigation route change.
   - Implement bill attachment upload handler.
   - Build full `Actions ▼` row menu (`View`, `Open Bank Statement`, `Open Linked ERP`, `Edit`, `Delete`).
2. **[`BankStatementController.js`](file:///d:/ERP%20Website/admin/js/controllers/BankStatementController.js):**
   - Implement categorized `Actions ▼` dropdown menu (`VIEW`, `RECONCILIATION`, `REVERSAL`, `STATUS`).
   - Implement `showLinkedAllocations` modal popup (Screenshot 5).
   - Implement `viewEdit` (transaction overview + ERP note update API).
   - Implement `viewStatementSource` (source CSV viewer + SHA-256 copy).
   - Implement 2-step delete statement protocol.
   - Implement mandatory reason prompts for `review` and `ignore`.
   - Implement multi-document candidate allocation with round-off tolerance checking.

### Phase 3: Version Bump & Release Sync
- Update `version.json` and `js/version.js` to `webVersion: "10.0.34.12"`, `webBuild: 12`, `tag: "web-v10.0.34.12"`.
- Update all script tags in `index.html` to `?v=10.0.34.12`.
- Sync changes to GitHub staging repository `D:\GitHub\DSE-ERP-Enterprise`, commit, tag `web-v10.0.34.12`, and push.

---

## 5. Verification Checklist (Post-Build Protocol)
- [ ] Bank Entry mode displays exact 4 KPIs (`Bank Balance`, `Deposits`, `Withdrawals`, `Pending Reconcile`).
- [ ] Expense Entry mode displays exact 4 KPIs (`Total Expenses (This Month)`, `Total Expenses (This Year)`, `Top Expense Category`, `Pending Reconcile`).
- [ ] Mode switching between Bank Entry and Expense Entry is instantaneous and in-place without page reload.
- [ ] Bank Statement empty state displays centered card and `No statement selected` badge.
- [ ] Bank Statement populated state displays 8 Title Case KPIs, 3-row filter toolbar, and batch progress bar.
- [ ] Row `Actions ▼` menu displays categorized groups: `VIEW`, `RECONCILIATION`, `REVERSAL`, `STATUS`.
- [ ] Clicking `2 linked transactions` or `View Match / Linked Record` opens the Screenshot 5 Linked Transactions Modal.
- [ ] Linked Transactions Modal renders 5 metric cards (`Bank Ref`, `Linked Count`, `Bank Linked`, `Round-off`, `Difference`) and breakdown table.
- [ ] Transaction Details modal supports editing and saving 500-char internal ERP note.
- [ ] Source Evidence modal displays raw CSV lines and copies SHA-256 fingerprint.
- [ ] Delete Statement enforces impact preview and typing `"DELETE"` confirmation.
- [ ] All ComboBoxes and dropdowns pull dynamically from `BANK_ACCOUNT`, `PAYMENT_MODE`, `EXPENSE_CATEGORY`, and `BANK_NAME`.
