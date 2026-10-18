# Scope Specification: Invoice Payment & Refund Parity (`scope10.0.34.8.md`)

**Target Baseline:** Desktop ERP `10.0.34` (`RecordPaymentController.java`, `PurchasePaymentController.java`, `ReturnRefundController.java`, `SupportApiClient.java`, `ReturnApiClient.java`)  
**Target Web Release:** Web Admin Studio `10.0.34.8` (`d:\ERP Website\admin`)  
**Date:** October 18, 2026  
**Status:** Canonical Implementation Scope — 1-Shot Parity Specification  
**Rule:** Strictly NO BUILD / compile commands. Pure client-side markup, CSS, controller, and service synchronization.

---

## 1. Executive Summary & Root Cause Analysis

During validation of the Web Admin Studio payment and refund workspaces against Desktop ERP `10.0.34`, multiple critical regressions and behavioral discrepancies were identified across all four payment screens:
1. **Sales Invoice Payment** (`RecordPayment`)
2. **Purchase Invoice Payment** (`PurchasePayment`)
3. **Sales Return Refund** (`ReturnRefund` / `SalesReturn`)
4. **Purchase Return Refund** (`ReturnRefund` / `PurchaseReturn`)

### Root Causes of Web Failures:
1. **Payment History Stuck on "Loading payment history...":**
   - In `RecordPaymentController.js`, `open()` invokes `await this.refreshPayments();` (line 158), and buttons invoke `window.RecordPaymentController.refreshPayments()`. However, `refreshPayments()` was **never implemented** in `RecordPaymentController.js`.
   - The unhandled `TypeError: this.refreshPayments is not a function` terminates execution, preventing the table from ever populating and leaving the HTML stuck permanently on `"Loading payment history..."`.
2. **Action Menu & Column Layout Mismatches:**
   - Desktop standardizes on a single purple dropdown menu button `::: Actions ▾` (`row-actions` / `btn-purple`) containing:
     - `✎ Edit Payment` (disabled if `BANK_RECONCILIATION`)
     - `📎 View Proof` (disabled if no proof attached)
     - `🗑 Remove Proof` (disabled if no proof attached or `BANK_RECONCILIATION`)
   - Web displayed an unstandardized layout with loose/empty checkbox columns, separate `Bank / Account` and `Proof Document` columns, and action items like `"Revert / Delete Payment"` that do not exist in Desktop.
3. **Proof Viewing & Downloading Crashes on Binary Stream:**
   - In Desktop, clicking `View Proof` downloads the raw octet-stream from `/api/support/payments/{id}/attachment-file` and opens it in the system viewer.
   - Web used `window.ApiService.get(...)` which attempts `res.json()`. Because the backend returns raw `application/octet-stream` bytes (e.g. PDF/PNG), `ApiService` crashed with `SyntaxError: Unexpected token '%PDF...' in JSON at position 0`.
4. **Edit Payment Attachment Lifecycle Disconnected:**
   - In Desktop, clicking `Edit Payment` loads existing proof details into the Right Panel (`"Existing proof: <filename>"`), enables `Preview`, enables `Remove`, and allows `+ Add / Replace`.
   - In Web, editing a payment wiped or ignored the right panel proof card, leaving `Preview` and `Remove` permanently disabled with no ability to replace or delete the existing proof.
5. **Wrong Proof Deletion Endpoints (`404 / 405 Errors`):**
   - Web controllers called `DELETE /api/support/payments/{id}/attachment` and `DELETE /api/support/return-refunds/{id}/attachment`.
   - The backend `SupportController.java` exclusively maps:
     - Line 18: `@DeleteMapping("/payments/{paymentId}/attachment-file")`
     - Line 21: `@DeleteMapping("/return-refunds/{refundId}/attachment-file")`
   - Because the `-file` suffix was omitted in Web, every proof deletion failed with HTTP 404/405.
6. **Accounting Confirmation Modal Missing:**
   - Desktop mandates an **Accounting Confirmation Modal** showing `Old Amount`, `New Amount`, and `Difference (+/- ₹)` before updating any payment. Web lacked this structured modal.

---

## 2. Multi-Module Parity Matrix (All 4 Screens)

| Feature / Requirement | 1. Sales Invoice Payment (`RecordPayment`) | 2. Purchase Invoice Payment (`PurchasePayment`) | 3. Sales Return Refund (`ReturnRefund`) | 4. Purchase Return Refund (`ReturnRefund`) |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop Baseline** | `RecordPaymentController.java` & `RecordPayment.fxml` | `PurchasePaymentController.java` & `PurchasePayment.fxml` | `ReturnRefundController.java` & `ReturnRefund.fxml` | `ReturnRefundController.java` & `ReturnRefund.fxml` |
| **Document Identity** | Sales Invoice (`JI/25-2026/XXXX`) | Purchase Invoice / Bill No. | Sales Return No. (`SR-XXXX`) | Purchase Return No. (`PR-XXXX`) |
| **Party Display** | Customer Name, Phone, Email | Supplier Name, Phone, Email | Customer Name (from linked Sale) | Supplier Name (from linked Bill) |
| **Payer / Payee Field** | `Received From *` | `Paid To *` | `Refunded To *` | `Received From *` |
| **Amount Field** | `Amount Received (₹) *` | `Amount Paid (₹) *` | `Amount Refunded (₹) *` | `Refund Received (₹) *` |
| **Allocation Radios** | `FULL PAYMENT` / `PARTIAL PAYMENT` | `FULL PAYMENT` / `PARTIAL PAYMENT` | `SETTLE FULL RETURN BALANCE` / `PARTIAL RETURN REFUND` | `SETTLE FULL RETURN BALANCE` / `PARTIAL RETURN REFUND` |
| **Fully-Paid Guard** | Remains active for editing historical records | Card disables: *"Payment Complete • History Available"* | Settle Full Balance disabled if `balance <= 0.005` | Settle Full Balance disabled if `balance <= 0.005` |
| **Bank Account Logic** | Disabled for Cash/Card/UPI; Required for Bank/NEFT/RTGS | Stored in notes as `"Bank Account: <acct> \| <notes>"`, parsed back on edit | Disabled for Cash/UPI; Required for Bank Transfer | Disabled for Cash/UPI; Required for Bank Transfer |
| **History Table Columns** | `Payment Mode`, `Reference No.`, `Received From`, `Amount (₹)`, `Status`, `Notes`, `Actions` | `Payment Date`, `Payment Mode`, `Reference No.`, `Paid To`, `Amount (₹)`, `Status`, `Notes`, `Actions` | `Refund Date`, `Payment Mode`, `Reference No.`, `Refunded To / From`, `Amount (₹)`, `Status`, `Notes`, `Actions` | `Refund Date`, `Payment Mode`, `Reference No.`, `Refunded To / From`, `Amount (₹)`, `Status`, `Notes`, `Actions` |
| **Action Dropdown Items** | `Edit Payment`, `View Proof`, `Remove Proof` | `Edit Payment`, `View Proof`, `Remove Proof` | `Preview Proof`, `Remove Proof` | `Preview Proof`, `Remove Proof` |
| **List Endpoint** | `GET /api/support/payments?type=SALE&id={id}` | `GET /api/support/payments?type=PURCHASE&id={id}` | `GET /api/returns/{no}/refunds` | `GET /api/returns/{no}/refunds` |
| **Save Endpoint** | `POST /api/support/payments/with-id` | `POST /api/support/payments/with-id` | `POST /api/returns/{no}/refunds` | `POST /api/returns/{no}/refunds` |
| **Update Endpoint** | `PUT /api/support/payments/{id}` | `PUT /api/support/payments/{id}` | N/A (immutable voucher audit) | N/A (immutable voucher audit) |
| **Upload Proof** | `PUT /api/support/payments/{id}/attachment-file?filename=...` | `PUT /api/support/payments/{id}/attachment-file?filename=...` | `PUT /api/support/return-refunds/{id}/attachment-file?filename=...` | `PUT /api/support/return-refunds/{id}/attachment-file?filename=...` |
| **Download / View** | `GET /api/support/payments/{id}/attachment-file` | `GET /api/support/payments/{id}/attachment-file` | `GET /api/support/return-refunds/{id}/attachment-file` | `GET /api/support/return-refunds/{id}/attachment-file` |
| **Delete Proof** | `DELETE /api/support/payments/{id}/attachment-file` | `DELETE /api/support/payments/{id}/attachment-file` | `DELETE /api/support/return-refunds/{id}/attachment-file` | `DELETE /api/support/return-refunds/{id}/attachment-file` |
| **Max Proof Size** | 5 MB (`JPG, PNG or PDF`) | 5 MB (`JPG, PNG or PDF`) | 25 MB (`JPG, PNG or PDF`) | 25 MB (`JPG, PNG or PDF`) |

---

## 3. Detailed Component Specifications

### Component 1: Payment History Loading & Synchronization (`refreshPayments`)
- **Web File:** `d:\ERP Website\admin\js\controllers\RecordPaymentController.js`
- **Implementation:**
  ```javascript
  async refreshPayments() {
    const tbody = document.getElementById('rp-history-tbody');
    const badge = document.getElementById('rp-history-badge');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Loading payment history...</td></tr>`;

    try {
      const rows = await window.ApiService.get(`/api/support/payments?type=${currentType}&id=${currentInvoiceId}`);
      paymentHistory = Array.isArray(rows) ? rows : [];
      
      // Update badge: "1 Payment" vs "X Payments"
      if (badge) {
        badge.innerText = `${paymentHistory.length} Payment${paymentHistory.length === 1 ? '' : 's'}`;
      }
      
      this.renderHistoryTable();
      this.recalculateInvoiceTotals();
    } catch (err) {
      console.error('[RecordPaymentController] Failed to load payment history:', err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Failed to load payment history: ${err.message}</td></tr>`;
    }
  }
  ```
- **Recalculation:** Automatically update `totalAmount`, `paidAmount`, `balanceAmount`, and top/summary status pills from the database rows.

---

### Component 2: Table Columns, Badges, & Action Dropdown Parity
- **Desktop FXML Alignment:**
  - Standardize table columns to eliminate loose checkboxes and redundant proof columns.
  - Table Columns:
    1. **Payment Mode** (pill badge)
    2. **# Reference No.** (cyan monospace font)
    3. **Received From** / **Paid To** (bold text)
    4. **Amount (₹)** (green `#34d399`, bold, right-aligned)
    5. **Status** (status pill: `Recorded`, `Reconciled`, `Full Payment`, `Partial Payment`)
    6. **Notes** (truncated with tooltip)
    7. **Actions** (`btn-purple` dropdown menu)
- **Actions Dropdown Menu Specification (`::: Actions ▾`):**
  - Trigger: `<button class="btn-purple" onclick="window.RecordPaymentController.toggleHistoryMenu('${p.id}', event)">::: Actions ▾</button>`
  - Menu Items:
    1. `<div class="action-menu-item ${isReconciled ? 'disabled' : ''}" onclick="window.RecordPaymentController.startEditPayment(${p.id})">✏️ Edit Payment</div>`
    2. `<div class="action-menu-item ${!hasProof ? 'disabled' : ''}" onclick="window.RecordPaymentController.viewHistoricalProof(${p.id}, '${proofName}')">📎 View Proof</div>`
    3. `<div class="action-menu-item text-danger ${(!hasProof || isReconciled) ? 'disabled' : ''}" onclick="window.RecordPaymentController.removeHistoricalProof(${p.id})">🗑 Remove Proof</div>`
  - Reconciled Guard: If `paymentType === 'BANK_RECONCILIATION'`, `Edit Payment` and `Remove Proof` are disabled. Clicking displays:  
    *"Bank-reconciled payments must be changed from Bank Statement using the reversal/reconciliation workflow."*

---

### Component 3: Right Panel Proof Card & Complete Attachment Lifecycle
- **Dropzone & State Binding:**
  - File constraints: PDF, PNG, JPG, JPEG up to 5 MB for Sales/Purchase (25 MB for Returns).
  - Actions in Proof Card:
    - `+ Add / Replace Proof` (opens file browser `#rp-proof-file-input`)
    - `👁 Preview` (opens local file or downloads/previews server attachment)
    - `🗑 Remove` (prompts confirmation and queues/executes removal)
- **Proof Card Labels:**
  - Normal state: `"No file selected"`
  - Pending local file: `"📎 receipt_scan.pdf (142 KB)"`
  - Existing server proof during edit: `"Existing proof: payment_proof_142.pdf"`
  - Queued for deletion during edit: `"Proof will be removed when payment is updated"`
- **Removing Stored Proof (Confirmation Dialog):**
  - When clicking `Remove Proof` in table Actions:
    - Display confirmation prompt: `"Remove this payment proof?"`
    - On confirmation: `DELETE /api/support/payments/{id}/attachment-file`
    - Show Toast: `"Payment proof removed."`
    - Refresh history and right-panel proof status.
  - When clicking `Remove` on Proof Card during edit:
    - Display confirmation prompt: `"Remove the payment proof?"`
    - Sets `proofRemovalPending = true`, clears `selectedProofFile = null`, updates label to `"Proof will be removed when payment is updated"`.

---

### Component 4: Edit Payment Mode & Accounting Confirmation Modal
- **Activating Edit Mode (`startEditPayment`):**
  - Sets `editingPayment = paymentRow`.
  - Populates inputs: Date, Mode, Reference, Party, Bank Account, Amount, Notes.
  - Button switches to `"✏️ Update Payment"` (`btn-purple`).
  - Title switches to `"Edit Payment (#<ref>)"`.
  - Right panel displays existing proof and enables `Preview` & `Remove`.
- **Accounting Confirmation Modal:**
  - Before submitting update, calculate difference: `diff = newAmount - oldAmount`.
  - Render or prompt confirmation modal:
    ```
    ACCOUNTING CONFIRMATION

    Old Amount: ₹ 35,700.00
    New Amount: ₹ 30,000.00
    Difference: -₹ 5,700.00

    This changes the invoice balance and payment status.

    Continue? [Yes / Continue] [Cancel]
    ```
- **Update Execution:**
  - Sends `PUT /api/support/payments/{id}` with payload:
    `{ date, amount, mode, reference, notes, receivedFrom, expectedRowVersion: editingPayment.rowVersion }`
  - If `proofRemovalPending`: calls `DELETE /api/support/payments/{id}/attachment-file`.
  - Else if new file selected: calls `PUT /api/support/payments/{id}/attachment-file?filename=...` with raw binary body.
  - Toast: `"Payment updated and invoice totals recalculated."`
  - Resets form back to `"Save Payment"` and refreshes registers.

---

### Component 5: Purchase-Specific Payment Rules
- **Fully-Paid Protection:**
  - If `purchase.balanceAmount <= 0.005`, disable payment entry card and display header:  
    `"Payment Complete • History Available"`.
  - If user selects `Edit Payment` on a historical record, card becomes enabled and title switches to `"Edit Supplier Payment"`.
- **Bank Account Parsing from Notes:**
  - When saving purchase payment, format notes as: `"Bank Account: <account> | <userNotes>"`.
  - When editing purchase payment, extract account into bank dropdown and display clean user notes in the notes textarea.

---

### Component 6: Sales Return & Purchase Return Refund Workspace Parity
- **Unified Return Refund Architecture (`ReturnsController.js`):**
  - Handles both `SALES RETURN` and `PURCHASE RETURN`.
  - Dynamic Form Labels:
    - Sales Return: Party label = `"Refunded To *"`, Amount label = `"Amount Refunded *"`.
    - Purchase Return: Party label = `"Received From *"`, Amount label = `"Refund Received *"`.
  - Settle Radios:
    - `SETTLE FULL RETURN BALANCE` (calculates `returnTotal - refundedAmount`).
    - `PARTIAL RETURN REFUND`.
  - Bank Account selector: Automatically enabled for Bank Transfer / NEFT / RTGS, disabled for Cash / UPI.
  - Proof Attachment Lifecycle:
    - Binary upload: `PUT /api/support/return-refunds/{refundId}/attachment-file?filename=...`
    - View/Preview: `GET /api/support/return-refunds/{refundId}/attachment-file` (handled via blob URL)
    - Delete proof: `DELETE /api/support/return-refunds/{refundId}/attachment-file` with confirmation:  
      `"Remove the saved proof from this refund?"`
  - History Table:
    - Columns: `Refund Date`, `Payment Mode`, `Reference No.`, `Refunded To / From`, `Amount (₹)`, `Status`, `Notes`, `Actions`.
    - Action menu: `::: Actions ▾` -> `👁 Preview Proof`, `🗑 Remove Proof`.

---

## 4. Backend REST API Specification & Endpoint Correction Matrix

| Action | Incorrect Web Endpoint | Correct Desktop REST Endpoint | Method | Payload / Format |
| :--- | :--- | :--- | :--- | :--- |
| **Get Payment History** | *N/A (Missing method)* | `/api/support/payments?type={type}&id={id}` | `GET` | JSON Array of `PaymentRow` |
| **Record Payment** | `/api/support/payments` | `/api/support/payments/with-id` | `POST` | `PaymentRequest` -> `{ "id": 123 }` |
| **Upload Payment Proof** | Multipart or JSON | `/api/support/payments/{id}/attachment-file?filename={name}` | `PUT` | Raw Binary (`application/octet-stream`) |
| **Download / View Payment Proof** | `ApiService.get` (JSON crash) | `/api/support/payments/{id}/attachment-file` | `GET` | Binary Blob / Stream (`URL.createObjectURL`) |
| **Delete Payment Proof** | ❌ `/api/support/payments/{id}/attachment` | ✅ `/api/support/payments/{id}/attachment-file` | `DELETE` | No body |
| **Update Payment** | Put without diff modal | `/api/support/payments/{id}` | `PUT` | `PaymentUpdateRequest` with `expectedRowVersion` |
| **Get Return Refunds** | `/api/returns/{no}/refunds` | `/api/returns/{no}/refunds` | `GET` | JSON Array of `RefundRow` |
| **Record Return Refund** | `/api/returns/{no}/refunds` | `/api/returns/{no}/refunds` | `POST` | `RefundCreateRequest` -> `{ "id": 456 }` |
| **Upload Refund Proof** | Multipart | `/api/support/return-refunds/{id}/attachment-file?filename={name}` | `PUT` | Raw Binary (`application/octet-stream`) |
| **Download / View Refund Proof** | `ApiService.get` (JSON crash) | `/api/support/return-refunds/{id}/attachment-file` | `GET` | Binary Blob / Stream (`URL.createObjectURL`) |
| **Delete Refund Proof** | ❌ `/api/support/return-refunds/{id}/attachment` | ✅ `/api/support/return-refunds/{id}/attachment-file` | `DELETE` | No body |

---

## 5. Execution Plan & Quality Verification Checklist

- [ ] **Step 1: Synchronize `RecordPaymentController.js`**
  - Implement missing `refreshPayments()` method.
  - Implement `renderHistoryTable()` with exact Desktop column structure.
  - Wire standardized `::: Actions ▾` menu with `Edit Payment`, `View Proof`, `Remove Proof`.
  - Fix proof viewing and downloading to fetch raw binary blobs (`URL.createObjectURL`).
  - Implement full edit lifecycle: right panel proof loading, `Preview`, `Remove`, `+ Add / Replace`.
  - Implement Accounting Confirmation modal on payment update.
  - Correct proof delete endpoint to `/api/support/payments/{id}/attachment-file`.
  - Add bank-reconciled payment protection.

- [ ] **Step 2: Synchronize `ReturnsController.js` (Sales & Purchase Return Refunds)**
  - Correct proof delete endpoint to `/api/support/return-refunds/{id}/attachment-file`.
  - Fix proof viewing to fetch raw binary blob instead of JSON.
  - Standardize confirmation prompt on proof removal: `"Remove the saved proof from this refund?"`.
  - Ensure dynamic party and amount labels for Sales Return vs Purchase Return.
  - Align Actions menu with `::: Actions ▾` button.

- [ ] **Step 3: Update `index.html` Markup & App CSS**
  - Update table headers in `view-record-payment` to match Desktop columns.
  - Standardize action dropdown menu container and z-index positioning.
  - Add Accounting Confirmation modal template or dynamic dialog binding.

- [ ] **Step 4: End-to-End Verification**
  - Verify Sales Invoice payment history loads immediately with correct counts and badge.
  - Verify Purchase Invoice payment history loads and respects fully-paid lock.
  - Verify clicking `View Proof` opens/downloads attachment without JSON errors.
  - Verify clicking `Edit Payment` loads existing proof into Right Panel, enables Preview/Remove, and opens Accounting Confirmation dialog on update.
  - Verify clicking `Remove Proof` prompts confirmation and successfully deletes attachment via `/attachment-file`.
  - Verify Return Refund settlement works seamlessly for both Sales Return and Purchase Return.
