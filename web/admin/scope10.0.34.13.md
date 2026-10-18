# Scope Specification: Reconciliation, Finance & Settings Desktop Parity (`scope10.0.34.13.md`)

**Target Baseline:** Desktop ERP `10.0.34` (`BankExpenseController.java`, `BankStatementController.java`, `KotakBankStatementCsvParser.java`, `PurchaseReconController.java`, `ReconSupplierController.java`, `SettingsController.java`, `SmtpMailService.java`, `ServerResourceController.java`)  
**Target Web Release:** Web Admin Studio `10.0.34.13` (`d:\ERP Website\admin`)  
**Date:** October 18, 2026  
**Status:** CANONICAL INVESTIGATION & ARCHITECTURAL SPECIFICATION COMPLETE — STRICT INVESTIGATION ONLY (ZERO BUILD / ZERO PRODUCTION CODE MODIFIED PENDING USER APPROVAL)

---

## 1. Executive Summary & Diagnostic Overview

Following the deployment of release `10.0.34.12`, the user identified 12 critical discrepancies and operational bugs across Bank Reconciliation, Purchase Recon, Recon Supplier, Bank & Expense Entry, Business Settings Branding, Test Email Dispatch, and Security/Session views:

Per the user's explicit directives:
> 1. *"dont build .. lets do investigation and fixed this all issues ...and create a new verion .md file but 1st do investigative , generate the file.. dont build at this moment until i approved"*
> 2. *"make sense.. still dont build and update the scope as i see import stament behave is different to desktop. in desktop when import stament button open and select the copy from drive hoever web open the pop up with mock up data which is in corect.. also delete statement is also not working on the same way in web and action in match pop up screen not perple action button and list of action is not match. build the same way like desktop and make sure that all list of action on pop should work the same way way .. can we also investigate the same and understadn what is the issues in web ? no build just updte the scope for the release"*

This document provides the exhaustive, root-cause code investigation comparing authoritative Desktop JavaFX controllers (`DSE-ERP-10.0.25/desktop`) and Spring Boot server endpoints (`server`) against the Web implementation (`d:\ERP Website\admin`), followed by the exact implementation specifications for version `10.0.34.13`.

---

## 2. Comprehensive Root Cause Analysis Matrix

| # | Reported Issue & Symptom | Desktop ERP Baseline Implementation | Current Web Implementation & Root Cause | Architectural Solution & Parity Fix |
|---|---|---|---|---|
| **01** | **Navigation is not working (linked record: transaction, expense, bank, purchase recon, etc.)** *(Screenshot 1)* | `BankStatementController.java:870-930`<br>`openLinked(row)` resolves target type:<br>• `PURCHASE_RECON` / `PRC-*` &rarr; opens `Purchase Recon` with ref search & row highlight.<br>• `BANK_ENTRY` &rarr; opens `Bank Entry` mode with voucher search & highlight.<br>• `EXPENSE` &rarr; opens `Expense Entry` mode with voucher search & highlight.<br>• `SALE` / `INV-*` &rarr; opens `Sales Register` with invoice search.<br>• `PURCHASE` / `BILL-*` &rarr; opens `Purchase Register` with bill search. | `BankStatementController.js:1488-1522`<br>`openLinkedDocument(docRef)`:<br>1. Completely omits `PRC-*` (Purchase Recon), falling into fallback toast `Linked document: PRC-2026-00003` without navigating!<br>2. For `EXP` / `BANK`, it calls `selectNav('view-bank-expense')`, which is a **non-existent DOM ID** (the actual views are `view-bank-entry` and `view-expense-entry`), causing navigation to fail completely! | Implement comprehensive `openLinkedDocument(docRef, targetType, targetId)` routing:<br>• `PRC-*` / `PURCHASE_RECON` &rarr; `selectNav('view-purchase-recon')`, set `pr-search`, filter & highlight row.<br>• `EXP-*` / `EXPENSE` &rarr; `selectNav('view-expense-entry')`, set `exp-search`, filter & highlight row.<br>• `BANK-*` / `BANK_ENTRY` &rarr; `selectNav('view-bank-entry')`, set `bank-search`, filter & highlight row.<br>• `INV-*` / `SAL-*` &rarr; `selectNav('view-sales-register')`.<br>• `PO-*` / `PUR-*` &rarr; `selectNav('view-purchase-register')`. |
| **02** | **Matching popup is not matched with Desktop UI & Action button in popup is purple instead of desktop candidate allocation** *(Screenshot 2 vs Screenshot 3)* | `BankStatementController.java:680-776`<br>`match(bankRow)` opens modal with:<br>• 6 KPI cards across top (`Bank Amount`, `Allocated`, `Round-off`, `Bank Remaining`, `Document Residual`, `Settlement Status`).<br>• Candidate table with Checkbox, Score, Type, Document, Party, Date, Total, Paid, Outstanding, and **editable Allocation input**.<br>• **NO purple button per row!**<br>• Header "Select All" checkbox that allocates bank amount sequentially.<br>• Live round-off calculation (within ₹1.00 tolerance).<br>• Status transitions ("Select a Transaction", "Bank Not Fully Allocated", "Full Match", "Document Remains Partial").<br>• Footer action buttons: `[🔄 Refresh Suggestions]`, `[❌ Cancel]`, `[✅ Confirm Match]`.<br>• If residual > 0.01 on confirm, prompts confirmation: *"Partial Document Settlement"*. | `BankStatementController.js:513-570`<br>`openMatchModal(txnId)` rendered a primitive table *(Screenshot 2)* with a purple button `[Link & Reconcile]` on each row (`.btn-primary`). It completely lacked:<br>1. Multi-candidate allocation support.<br>2. Top 6 KPI metric cards.<br>3. Candidate selection checkboxes.<br>4. Editable allocation inputs.<br>5. Live round-off and residual calculation.<br>6. "Confirm Match" with partial settlement confirmation prompt.<br>7. "Refresh Suggestions" button. | Replace `modal-match-candidate` markup and controller logic with complete Desktop parity structure matching Screenshot 3:<br>1. Top 6 KPI metric cards strip with reactive color badges.<br>2. 10-column candidate table with individual selection checkboxes and editable allocation inputs.<br>3. Remove purple inline buttons.<br>4. Reactive calculation engine updating Allocated, Bank Remaining, Round-off, and Document Residual on every keystroke.<br>5. Header Select-all checkbox auto-filling candidates.<br>6. `[Confirm Match]` verifying total allocated matches bank amount within ₹1.00 tolerance.<br>7. `[Refresh Suggestions]` querying engine afresh. |
| **03** | **Fail to add note - View Transaction Details popup** *(Screenshot 4)* | `BankReconciliationController.java:23`<br>`@PostMapping("/transactions/{id}/note")`<br>Calls `service.updateNote(id, req)`.<br>Updates transaction notes on **any** transaction (UNMATCHED, MATCHED, EXPENSE, IGNORED) without requiring the transaction to be unmatched! | `BankStatementController.js:974`<br>`saveTxnNotes()` called `window.ReconService.reviewTransaction(id, note, 'Admin')`.<br>`reviewTransaction` calls `service.review(id, req)`, which enforces `ensureProcessable(t)`:<br>`if (RESOLVED.contains(t.getStatus())) throw new IllegalStateException("This bank transaction is already resolved. Use Unmatch / Reverse first.")`.<br>Because the transaction was already `MATCHED` (resolved), it threw the exact error in Screenshot 4! | 1. Add `updateTransactionNote(txnId, note, user, rowVersion)` to `ReconService.js` calling dedicated endpoint `POST /api/bank-statements/transactions/{id}/note`.<br>2. Update `saveTxnNotes()` in `BankStatementController.js` to call `updateTransactionNote()` instead of `reviewTransaction()`. |
| **04** | **List of actions is not matched based on status of transaction & Main table action button is purple** | `BankStatementController.java:205-243`<br>Uses neutral secondary button `Actions ▼` (`approved-secondary-button`, not purple!). Dynamically structures menu based on `row.status()`:<br>• **UNMATCHED:** `VIEW` (Details, Statement, Audit) \| `RECONCILIATION` (Match, Move to Expense) \| `STATUS` (Mark for Review, Mark as Ignored).<br>• **SUGGESTED:** `VIEW` \| `RECONCILIATION` (Review Suggested Match, Move to Expense) \| `STATUS` (Mark for Review, Mark as Ignored).<br>• **REVIEW:** `VIEW` \| `RECONCILIATION` (Match, Move to Expense) \| `STATUS` (Mark as Ignored).<br>• **MATCHED:** `VIEW` \| `RECONCILIATION` (View Match / Linked Record, View Bank Entry) \| `REVERSAL` (Unmatch / Reverse). **No STATUS section!**<br>• **EXPENSE:** `VIEW` \| `RECONCILIATION` (View Expense) \| `REVERSAL` (Unmatch / Reverse). **No STATUS section!**<br>• **IGNORED:** `VIEW` \| `STATUS` (Return to Unmatched). | `BankStatementController.js:239-281`<br>1. Row button was explicitly styled `<button class="btn-purple">::: Actions</button>` instead of neutral button.<br>2. Hardcoded and appended the `STATUS` block (`Mark for Review`, `Mark as Ignored`) to **every single row** unconditionally, even for `MATCHED` and `EXPENSE` transactions!<br>3. For `IGNORED`, it failed to offer `Return to Unmatched`. | 1. Change row action button to Desktop neutral secondary button styling (`Actions ▼`).<br>2. Rewrite `renderActionMenu(t)` in `BankStatementController.js` to strictly follow the status-branching logic of `BankStatementController.java:205-243`. |
| **05** | **Recon Supplier & Purchase Recon list of actions not matched and not working like desktop** | `PurchaseReconController.java:9` & `ReconSupplierController.java:8`:<br>• **Purchase Recon:** MenuButton `Actions ▼`: `View` (opens detail drawer), `Edit`, `Delete` (disabled if `linkedAmount > 0.009`), and conditionally if `linkedAmount > 0.009`: `Open Bank Statement` / `View Bank Statement Links` (navigates to Bank Statement focusing the linked row).<br>• **Recon Supplier:** MenuButton `Actions ▼`: `View` (opens detail drawer), `Edit`, `Delete` (disabled if `reconCount > 0`). | `PurchaseReconController.js:142-147` & `508-513`:<br>1. In Purchase Recon: "View" action was completely omitted. "Bank Statement Links" popped up a crude browser `alert()`. "Delete" was never disabled when linked.<br>2. In Recon Supplier: Web rendered two plain inline buttons (`✏️ Edit`, `🗑️`) instead of the standard `::: Actions` MenuButton matching desktop! | 1. In `PurchaseReconController.js`: Replace inline actions with Desktop `Actions ▼` menu. Add `View` (opens drawer). Implement direct navigation for `Open Bank Statement` (`selectNav('view-bank-statement')` and focus linked txn). Disable Delete when `linkedAmount > 0.009`.<br>2. In Recon Supplier: Replace raw buttons with standard `Actions ▼` menu (`View`, `Edit`, `Delete` disabled if `reconCount > 0`). |
| **06** | **User cannot move to Bank entry and Expense Entry screen; data is not loading; audio sound is coming non stop** | Desktop navigates cleanly between modes via `BankExpenseController.java:onModeChanged()`, updating table filters and firing API calls asynchronously without audio loops. | `FinanceController.js:69 & 80`:<br>`loadBankMode()` and `loadExpenseMode()` checked:<br>`if (window.NavigationRouter && window.NavigationRouter.currentNavId !== 'view-bank-entry') { window.NavigationRouter.selectNav('view-bank-entry'); }`<br>**Root Cause:** `NavigationRouter` exposes `getCurrentView()`, NOT `currentNavId` (`currentNavId` was always `undefined`!).<br>Because `undefined !== 'view-bank-entry'` is always `true`, calling `selectNav` triggered `loadBankMode`, which called `selectNav`, which called `loadBankMode` in an **infinite mutual recursion loop**!<br>Each iteration played `AudioSynthesizer.playNav()`, blasting non-stop tones, freezing the thread, and crashing the call stack before `loadFinance()` could ever execute! | 1. Add re-entrancy guard in `selectNav`: `if (isNavigating || currentViewId === viewId) return;`.<br>2. Expose `get currentNavId() { return currentViewId; }` on `NavigationRouter`.<br>3. Remove redundant recursive calls inside `FinanceController.js` `loadBankMode()` and `loadExpenseMode()`. |
| **07** | **Settings: 5 branding images (company logo, invoice logo, compact icon, seal, signature) not showing correctly; are we storing these to server?** | `SharedAssetBridge.java:6-7` & `ServerResourceController.java:12-30`:<br>The ERP server stores business branding assets as authoritative Server Resources:<br>`PUT /api/authority/resources/BUSINESS_ASSET/{key}` (raw binary body).<br>`GET /api/authority/resources/BUSINESS_ASSET/{key}` (returns binary image stream).<br>In settings properties, the pointers are stored as `"server-resource:company.logoPath"`, `"server-resource:company.signaturePath"`, etc. | `SettingsController.js:180-198`:<br>Web converted image files into multi-megabyte Base64 Data URLs and dumped them directly into `PUT /api/support/settings`.<br>When reading from server, the server returned `"server-resource:company.logoPath"`.<br>The browser cannot display `"server-resource:..."` directly as an image `src`, resulting in broken image icons across all 5 branding cards! | 1. Implement binary upload to `PUT /api/authority/resources/BUSINESS_ASSET/${key}?filename=${file.name}&contentType=${file.type}` with raw ArrayBuffer.<br>2. Save setting value as `"server-resource:" + key`.<br>3. When displaying branding cards, resolve `"server-resource:"` to `/api/authority/resources/BUSINESS_ASSET/${key}` (with auth token header or Blob URL). |
| **08** | **TEST Email throwing error message** *(Screenshot 5)* | `SettingsController.java:2760-2785` (Desktop):<br>Test Email ONLY dispatches `POST /api/authority/email/test` with `{ recipient }`. It **never** re-saves or overwrites SMTP settings during testing! | `SettingsController.js:936`:<br>Test Email forcibly executed `PUT /api/authority/email/settings` with the value of the password input before dispatching the test.<br>Because the password field is left empty (to preserve existing password), `SmtpMailService.java:147` threw `IllegalArgumentException: "Email app password is required the first time email is configured."`.<br>Because `ApiExceptionHandler.java` had no handler for `IllegalArgumentException`, it threw a 500 error: *"The ERP server could not complete this operation. Check the server log for the underlying error."* *(Screenshot 5)*! | 1. In `SettingsController.js`: Do NOT call `PUT /api/authority/email/settings` inside `testEmail()`. Directly dispatch `POST /api/authority/email/test` with `{ recipient }` matching desktop.<br>2. In `ApiExceptionHandler.java`: Add `@ExceptionHandler(IllegalArgumentException.class)` returning 400 Bad Request with the actual error message. |
| **09** | **Screen Security & Session and Module Management showing blank** | Desktop displays `SecuritySettingsPanel.fxml` and `ModulesSettingsPanel.fxml` cleanly when their respective sidebar or tab items are activated. | `index.html:7656-7830`:<br>`<div id="settings-panel-email" class="settings-subpanel" data-section="EMAIL" style="display:none;">` was **NEVER CLOSED**!<br>The closing tag `</div>` was missing before `settings-panel-security` and `settings-panel-modules`.<br>**Root Cause:** Both panels were parsed as child elements of `settings-panel-email`. When the user selected Security or Modules, `switchSection()` set `settings-panel-email.style.display = 'none'`, which hid its children completely, causing both views to appear 100% blank! | In `index.html`: Add the missing closing `</div>` for `settings-panel-email` at line 7826, properly establishing `settings-panel-security` and `settings-panel-modules` as sibling panels. |
| **10** | **Import Statement behavior is different to desktop (Desktop selects copy directly from drive; Web opens popup with mock data)** | `BankStatementController.java:387-411`:<br>`btnImport` immediately opens `FileChooser` directly to select statement CSV from drive.<br>`KotakBankStatementCsvParser` extracts bank name, account number, account holder, dates, balances, sha256 fingerprint, and transaction rows.<br>`resolveBankAccount(parsedBank, parsedAccount)` checks Master Data bank accounts. If match exists, proceeds without prompt. If unassigned, shows small `ChoiceDialog` to confirm account. Submits real data to `POST /api/bank-statements/imports`. | `BankStatementController.js:645-820` & `index.html:10836-10874`:<br>Clicking "Import Statement" opened `#modal-import-statement`, displaying mock fields, hardcoded mock bank account `50200012345678`, mock holder `Jasvi Industries Pvt Ltd`, mock fingerprint `FP-...`, and dummy `sourceCsv: 'CSV DATA'`. | 1. Deprecate and remove mock popup `#modal-import-statement`.<br>2. "Import Statement" button directly triggers `<input type="file" accept=".csv">` file dialog.<br>3. Implement client-side parser matching `KotakBankStatementCsvParser.java` to extract genuine fields, calculate sha256, and generate row fingerprints.<br>4. Only prompt if the statement account is not matched in Master Data `BANK_ACCOUNT`s (with clean Choice Modal).<br>5. Post genuine parsed CSV and transactions to `/api/bank-statements/imports`. |
| **11** | **Delete Statement is not working the same way in Web** | `BankStatementController.java:345-373`:<br>1. Pre-checks `BANK_EXPENSE.DELETE` permission.<br>2. Fetches `GET /api/bank-statements/imports/{id}/metrics`.<br>3. Displays **Step 1 Impact Alert**: Shows transactions count, matched reconciliations count, expense entries count, ignored count; warns that all linked reconciliations and generated entries will be reversed first.<br>4. Displays **Step 2 Typed Confirmation Dialog**: *"Permanently delete this Bank Statement import. Type DELETE to confirm:"*.<br>5. Dispatches `DELETE /api/bank-statements/imports/{id}?confirmation=DELETE&user={user}`.<br>6. Shows toast with removed transactions and reversed reconciliations counts; reloads batches and workspace. | `BankStatementController.js:1146-1185`:<br>1. Target modal `#modal-statement-delete-confirm` was **completely missing from `index.html`**!<br>2. `document.getElementById('modal-statement-delete-confirm')` was `null`, so `deleteStatement()` silently exited doing nothing!<br>3. Web did not fetch `/metrics` to show the pre-reversal impact.<br>4. Web did not reset batch selection and did not report reversed reconciliation counts. | 1. Add `#modal-statement-delete-confirm` to `index.html`.<br>2. In `BankStatementController.js`: Implement exact Desktop two-phase delete:<br>• Phase 1: Fetch `GET /api/bank-statements/imports/{id}/metrics` and display impact metrics.<br>• Phase 2: Require typing "DELETE" in confirmation input.<br>• Execute `DELETE /api/bank-statements/imports/{id}?confirmation=DELETE&user={user}`.<br>• Toast exact deleted and reversed counts, clear batch selection, reload batches. |
| **12** | **Candidate Action buttons inside Match Popup not matching Desktop (Desktop uses Candidate Table with Checkbox & Editable Allocation; Web used Purple Single Link Button)** | `BankStatementController.java:680-776`:<br>Table columns: `[x]` (Checkbox), `Score`, `Type`, `Document`, `Customer / Supplier`, `Date`, `Total`, `Paid`, `Outstanding`, `Allocation` (Editable numeric input).<br>• Header checkbox selects all candidates sequentially allocating bank value.<br>• Row checkboxes allow multi-candidate allocation.<br>• Bottom action buttons: `[🔄 Refresh Suggestions]`, `[❌ Cancel]`, `[✅ Confirm Match]`.<br>• No inline action buttons per row. | `BankStatementController.js:540-565` & `index.html:10876-10915`:<br>Rendered a flat table with an "ACTION" column containing a purple `.btn-primary` button `[Link & Reconcile]` on each row.<br>Completely lacked candidate checkboxes, editable allocations, sequential auto-allocation, and proper Confirm Match / Refresh Suggestions workflow. | 1. Remove "ACTION" column and purple button from candidate table.<br>2. Implement 10-column candidate table with select-all header, row selection checkboxes, and live editable allocation inputs.<br>3. Add footer action buttons: `[🔄 Refresh Suggestions]`, `[❌ Cancel]`, `[✅ Confirm Match]`.<br>4. Implement partial settlement confirmation prompt when residual > 0.01. |

---

## 3. Detailed Component Specifications

### 3.1. Matching Workspace Dialog (Parity with Desktop Screenshot 3)

The match transaction modal (`modal-match-candidate`) must be restructured to present the full Desktop ERP matching workspace:

```
+----------------------------------------------------------------------------------------------------+
| ⓘ Match Transaction                                                                     [ X ]     |
| Review possible matches and allocate the complete bank transaction.                                |
+----------------------------------------------------------------------------------------------------+
| [ Bank Amount ]   [ Allocated ]     [ Round-off ]   [ Bank Remaining ] [ Doc Residual ] [ Status ] |
|  ₹ 67,700.00       ₹ 0.00            ₹ 0.00          ₹ 67,700.00        ₹ 0.00           Select..  |
+----------------------------------------------------------------------------------------------------+
| 2026-04-02 • NEFTINW-1541868505 • NEFT 010714328729 KV NO 1 SECTOR 30 GANDHINAGAR P               |
| Suggestions stay strict: exact amount + useful party + date. When you manually confirm, a final   |
| document residual within the configured ₹1.00 round-off tolerance is settled explicitly...         |
+----------------------------------------------------------------------------------------------------+
| [x] | Score | Type | Document      | Customer / Supplier | Date       | Total    | Paid | Outst | Alloc |
| [ ] | 5.0   | SALE | JI/2026-27/006| Ms. TOLANI PROJ...  | 2026-04-03 | 16,225.0 | 0.0  | 16225 | [0.0] |
| [ ] | 5.0   | SALE | JI/2026-27/004| Ms. MEGHA ENGI...   | 2026-04-02 | 11,204.1 | 0.0  | 11204 | [0.0] |
+----------------------------------------------------------------------------------------------------+
| 0 selected • Bank allocated ₹ 0.00 • Round-off ₹ 0.00 • Bank remaining ₹ 67,700.00                 |
| [ 🔄 Refresh Suggestions ]                                        [ ✅ Confirm Match ]  [ ❌ Cancel ]|
+----------------------------------------------------------------------------------------------------+
```

#### Reactive Calculation Rules (`BankStatementController.java:723-742`):
1. `allocated = sum(selected_rows.allocation)`
2. `remaining = bankAmount - allocated`
3. `roundOff = sum(selected_rows.roundingFor(outstanding, allocation, tolerance))` (where tolerance = 1.00)
4. `docResidual = sum(max(0, round(outstanding - allocation - roundOff, 2)))`
5. `Status Badge`:
   - `0 selected`: "Select a Transaction" (yellow warning badge)
   - `abs(remaining) > 0.01`: "Bank Not Fully Allocated" (yellow warning badge)
   - `docResidual <= 0.01 && abs(remaining) <= 0.01`: "Full Match" / "Full Match + Round-off" (green success badge)
   - `docResidual > 0.01 && abs(remaining) <= 0.01`: "Document Remains Partial" (yellow warning badge)
6. **Confirmation Verification (`BankStatementController.java:760-776`):**
   - If no candidate selected: error *"Select at least one eligible Sale, Purchase or Return refund transaction."*
   - If `abs(allocated - bankAmount) > 0.01`: error *"Allocated amount must equal the bank amount. Remaining: ₹ ..."*
   - If `docResidual > 0.01`: show confirmation dialog:
     *"Bank allocation: ₹ X\nDocument residual after this match: ₹ Y\n\nThis will leave one or more documents PARTIAL. Continue only if this bank transaction is genuinely a partial settlement."*
   - On OK: dispatches `POST /api/bank-statements/transactions/{id}/match` with `allocations: [{targetType, targetId, allocatedAmount}]`.

---

### 3.2. Native CSV Import Workflow (Direct Drive Selection — Zero Mock Data)

Desktop ERP does not use mock popups for statement import. Web must adopt the exact same direct file flow:

```
[ User clicks "Import Statement" (btnImport) ]
                     |
                     v
[ Direct Native File Chooser: <input type="file" accept=".csv,.txt"> ]
                     |
                     v (User selects real bank statement from drive)
[ Web Client CsvParser (Kotak & Standard Engine) ]
   • Detects Header (e.g., "Sl. No.")
   • Extracts: bankName, accountNumber, accountHolder, period (from/to), opening/closing balance
   • Computes SHA-256 fingerprint of file content
   • Builds rows: timestamp, valueDate, desc, ref, debit, credit, balance, rowFingerprint
                     |
                     v
[ Bank Account Master Resolution ]
   • Checks Master Data BANK_ACCOUNT lookups for matching accountNumber
   • IF matched: proceeds automatically to import!
   • IF NOT matched: opens lightweight Choice Modal:
     "Confirm the Bank Account for this statement"
     Detected: Kotak Mahindra Bank 502000...
     Select the matching Master Data account: [ Dropdown of Active Bank Accounts ]
                     |
                     v
[ POST /api/bank-statements/imports with genuine parsed data ]
                     |
                     v
[ Handle Server Result: Toast imported/duplicate counts & auto-load batch ]
```

---

### 3.3. Two-Phase Delete Statement Pre-Reversal Workflow

In Desktop ERP, deleting an imported statement batch requires impact inspection and strict typed confirmation:

1. **Step 1: Impact Metrics Preview (`GET /api/bank-statements/imports/{id}/metrics`):**
   - Total Transactions: `metrics.total`
   - Matched / linked reconciliations: `metrics.matched`
   - Generated Expense entries: `metrics.expenses`
   - Ignored items: `metrics.ignored`
   - Warning Banner: *"Any linked reconciliation or generated Bank / Expense entry will be reversed first. If any reversal fails, nothing will be deleted."*
   - Action: User reviews impact and clicks `Continue` or `Cancel`.
2. **Step 2: Strict Typed Confirmation:**
   - Prompt: *"Permanently delete this Bank Statement import. Type DELETE to confirm:"*
   - Input: User must type exactly `DELETE`.
   - Action: `[Cancel]` and `[Delete Statement]`.
3. **Execution (`DELETE /api/bank-statements/imports/{id}?confirmation=DELETE&user={user}`):**
   - Reverses all matched reconciliations and generated expenses atomically.
   - Permanently deletes statement transactions and the import batch.
   - Shows toast: *"Bank Statement Deleted: X transactions removed, Y reconciliations reversed."*
   - Resets batch dropdown and reloads workspace.

---

### 3.4. Status-Based Action Menu Hierarchy (Main Statement Table)

The main table action button must be styled as a neutral secondary button (`approved-secondary-button`, `Actions ▼`, not purple), and its items strictly filtered by status (`BankStatementController.java:205-243`):

```
┌────────────────────────────────────────────────────────────────────────┐
│ UNMATCHED / SUGGESTED / REVIEW                                         │
├────────────────────────────────────────────────────────────────────────┤
│ VIEW                                                                   │
│   👁️ View Transaction Details                                          │
│   📄 View Imported Statement                                           │
│   🕒 View Audit History                                                │
│ RECONCILIATION                                                         │
│   🎯 Match Transaction  (or 💡 Review Suggested Match if SUGGESTED)    │
│   💸 Move to Expense    (only if debit > 0)                            │
│ STATUS                                                                 │
│   🚩 Mark for Review   (omitted if already REVIEW)                    │
│   🚫 Mark as Ignored                                                   │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ MATCHED                                                                │
├────────────────────────────────────────────────────────────────────────┤
│ VIEW                                                                   │
│   👁️ View Transaction Details                                          │
│   📄 View Imported Statement                                           │
│   🕒 View Audit History                                                │
│ RECONCILIATION                                                         │
│   🔗 View Match / Linked Record                                        │
│   🏦 View Bank Entry    (only if linked to BANK_ENTRY)                 │
│ REVERSAL                                                               │
│   ↩️ Unmatch / Reverse                                                 │
│ (NO STATUS SECTION!)                                                   │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ EXPENSE                                                                │
├────────────────────────────────────────────────────────────────────────┤
│ VIEW                                                                   │
│   👁️ View Transaction Details                                          │
│   📄 View Imported Statement                                           │
│   🕒 View Audit History                                                │
│ RECONCILIATION                                                         │
│   💸 View Expense                                                      │
│ REVERSAL                                                               │
│   ↩️ Unmatch / Reverse                                                 │
│ (NO STATUS SECTION!)                                                   │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ IGNORED                                                                │
├────────────────────────────────────────────────────────────────────────┤
│ VIEW                                                                   │
│   👁️ View Transaction Details                                          │
│   📄 View Imported Statement                                           │
│   🕒 View Audit History                                                │
│ STATUS                                                                 │
│   ↩️ Return to Unmatched                                               │
│ (NO RECONCILIATION OR REVERSAL SECTIONS!)                              │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 3.5. Linked Document Cross-Module Navigation Engine

When a user clicks any linked document badge (`PRC-2026-00003`, `EXP-2026-00012`, `BANK-2026-00004`, `INV/2026-27/001`), the application must execute the following stateful routing:

```javascript
function openLinkedDocument(docRef, targetType, targetId) {
  if (!docRef) return;
  const ref = docRef.trim().toUpperCase();

  // 1. Purchase Recon
  if (ref.startsWith('PRC') || targetType === 'PURCHASE_RECON') {
    window.NavigationRouter.selectNav('view-purchase-recon');
    setTimeout(() => {
      const s = document.getElementById('pr-search');
      if (s) { s.value = docRef; window.PurchaseReconController.applyFilters(); }
    }, 200);
    return;
  }

  // 2. Expense Entry
  if (ref.startsWith('EXP') || targetType === 'EXPENSE') {
    window.NavigationRouter.selectNav('view-expense-entry');
    setTimeout(() => {
      const s = document.getElementById('exp-search');
      if (s) { s.value = docRef; window.FinanceController.applyFinanceFilters(); }
    }, 200);
    return;
  }

  // 3. Bank Entry
  if (ref.startsWith('BANK') || targetType === 'BANK_ENTRY') {
    window.NavigationRouter.selectNav('view-bank-entry');
    setTimeout(() => {
      const s = document.getElementById('bank-search');
      if (s) { s.value = docRef; window.FinanceController.applyFinanceFilters(); }
    }, 200);
    return;
  }

  // 4. Sales Invoice
  if (ref.startsWith('INV') || ref.startsWith('SAL') || targetType === 'SALE') {
    window.NavigationRouter.selectNav('view-sales-register');
    setTimeout(() => {
      const s = document.getElementById('sales-search');
      if (s) { s.value = docRef; window.SalesController.applyFilters(); }
    }, 200);
    return;
  }

  // 5. Purchase Order / Bill
  if (ref.startsWith('PO') || ref.startsWith('PUR') || ref.startsWith('BILL') || targetType === 'PURCHASE') {
    window.NavigationRouter.selectNav('view-purchase-register');
    setTimeout(() => {
      const s = document.getElementById('purchase-search');
      if (s) { s.value = docRef; window.PurchaseController.applyFilters(); }
    }, 200);
    return;
  }
}
```

---

### 3.6. Authoritative Server Resource Branding Architecture

All business branding assets must be uploaded and resolved via `/api/authority/resources/BUSINESS_ASSET`:

```
[ Web Client: File Selected ]
       |
       v (FileReader -> ArrayBuffer)
[ PUT /api/authority/resources/BUSINESS_ASSET/{key}?filename=logo.png ]
       | (Stores binary in ServerResourceService / PostgreSQL bytea)
       v
[ PUT /api/support/settings: { values: { [key]: "server-resource:" + key } } ]
       |
       v (When loading settings in Web)
[ Resolve "server-resource:{key}" -> /api/authority/resources/BUSINESS_ASSET/{key} ]
       |
       v (fetch with Authorization: Bearer <token> -> URL.createObjectURL(blob))
[ Set <img src="blob:http://.../uuid"> in Preview Container ]
```

---

## 4. Verification & Validation Plan

Prior to user delivery of version `10.0.34.13`, the following checks will be executed:
1. **Direct CSV Import:** Verify that clicking "Import Statement" opens native file chooser directly, parses real CSV from drive, resolves account from Master Data, and submits without mock fields.
2. **Two-Phase Statement Deletion:** Verify that clicking "Delete Statement" fetches live `/metrics`, displays impact summary, requires typing "DELETE", and reverses all linked entries on completion.
3. **Matching Dialog Verification:** Verify that `openMatchModal` opens the 6 KPI metric cards strip, removes purple inline buttons, allows editing candidate allocations, calculates round-off and remaining balances live, and enables `Confirm Match` only when valid.
4. **Action Menu Per Status:** Verify that UNMATCHED, MATCHED, EXPENSE, and IGNORED rows show strictly their respective Desktop action lists, and button is neutral (not purple).
5. **Recursion Audit:** Verify that clicking `Bank Entry` and `Expense Entry` loads data immediately with zero recursive calls and zero audio chime loops.
6. **Audit Notes Save:** Verify that saving a note on a `MATCHED` transaction calls `POST /api/bank-statements/transactions/{id}/note` and succeeds without unmatching.
7. **Cross-Module Navigation:** Verify that clicking `PRC-2026-00003` navigates directly to Purchase Recon and highlights the target record.
8. **Branding Images:** Verify that uploading and loading all 5 branding images uses `/api/authority/resources/BUSINESS_ASSET/` with zero broken images.
9. **Test Email:** Verify that clicking "Test Email" directly dispatches diagnostic email without overwriting password credentials.
10. **Security & Module Views:** Verify that Security & Session and Module Management tabs display complete cards with zero blank areas.

---

## 5. User Confirmation & Next Steps

> **IMPORTANT:** In strict compliance with the user's order:
> - **NO APPLICATION CODE HAS BEEN MODIFIED**
> - **NO BUILDS OR COMMITS HAVE BEEN EXECUTED**
>
> Awaiting explicit user approval of this updated specification (`scope10.0.34.13.md`) to begin implementation.
