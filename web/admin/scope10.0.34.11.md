# Scope Specification: Settings Studio Desktop Parity & Email Delivery Engine (`scope10.0.34.11.md`)

**Target Baseline:** Desktop ERP `10.0.34` (`SettingsController.java`, `Settings.fxml`, `EmailSettingsController.java`, `SettingsAssetService.java`, `LiveOperationDialog.java`, `BusinessEmailController.java`)  
**Target Web Release:** Web Admin Studio `10.0.34.11` (`d:\ERP Website\admin`)  
**Date:** October 18, 2026  
**Status:** CANONICAL SPECIFICATION & AUDIT COMPLETE — 33 DISCREPANCIES IDENTIFIED

---

## 1. Executive Summary & Problem Analysis

The user provided 5 reference screenshots from the authoritative Desktop ERP `10.0.34` representing the 5 primary tabs/screens of the Settings module:
1. **Screen 1: Company & Billing**
2. **Screen 2: Payment & Bank**
3. **Screen 3: Invoice & Delivery**
4. **Screen 4 & 5: Email & Communication Preferences**

A comprehensive, field-by-field, UI layout, and functional linkage audit was conducted comparing Desktop source code (`SettingsController.java`, `Settings.fxml`, `EmailSettingsController.java`, and server-side `BusinessEmailController.java`) against Web Admin Studio (`index.html` lines 7018–7600 and `SettingsController.js`).

### Total Issues Count: **33 Issues Identified**
- **Screen 1 (Company & Billing):** 8 Issues
- **Screen 2 (Payment & Bank):** 7 Issues
- **Screen 3 (Invoice & Delivery):** 7 Issues
- **Screen 4 & 5 (Email & Communication Preferences):** 11 Issues (including critical Test Email and token incompatibilities)

---

## 2. Comprehensive Field-by-Field & UI Parity Audit

### Screen 1: Company & Billing

| Field / UI Element | Desktop Baseline (`10.0.34`) | Web Current State (`10.0.34.10`) | Issue / Discrepancy |
| :--- | :--- | :--- | :--- |
| **Top Action Button** | `Save Company` (purple `#a855f7` button, save icon) | Generic `Save Settings` / `Save Company Profile` | **Issue #1:** Button text and styling mismatch |
| **Section Header** | `Company & Billing` (blue doc icon) • `Business identity, primary contact details and document branding` | `Legal Company Identity` & `Registered Facilities` | **Issue #2:** Mismatched section hierarchy and title |
| **Row 1 Layout** | 4-column clean layout: `Company Name`, `Phone`, `Company Email`, `GSTIN` | Crammed 2-column layout mixed with tagline | **Issue #3:** Column layout mismatch |
| **Row 2 Layout** | 4-column layout: `PAN`, `Business Type`, `Industry`, `Financial Year Start` | 2-column layout with mismatched order | **Issue #4:** Column layout mismatch |
| **Label Icons** | 🏢 `Company Name`, 📞 `Phone`, ✉️ `Company Email`, 🏛️ `GSTIN`, 🪪 `PAN`, 🏷️ `Business Type`, 🏭 `Industry`, 📅 `Financial Year Start` | Plain text labels without icons | **Issue #5:** Missing Desktop semantic label icons |
| **Row 3 Applications** | `Application Display Name` (with note: *"Uses Company Name automatically across the customer-facing application"*), `Application Tagline` (quotes icon), `Startup Message` (quotes icon, note: *"Used on splash and sign-in screens; document branding remains independent"*) | Generic `setting-app-name`, `setting-app-tagline`, `setting-app-starting-text` without helper notes | **Issue #6:** Missing helper notes and icon styling |
| **Misplaced Fields** | Factory address, shipping address, state, and website belong on **Invoice & Delivery** tab | Inappropriately placed on Company tab | **Issue #7:** Severe tab boundary pollution |
| **Application Branding Cards** | 2 equal cards: `Application Banner` (1600 × 320) & `Application Mark / Splash Logo` (512 × 512) with custom preview boxes, dash/diamond placeholders, status text `No image selected`, and `+ Add / Replace` (purple), `Preview` (blue), `Remove` (red) | Small generic file upload inputs with `📁 Upload`, `👁️ Preview`, `🗑️ Clear` | **Issue #8:** Card structure and button actions mismatch |

---

### Screen 2: Payment & Bank

| Field / UI Element | Desktop Baseline (`10.0.34`) | Web Current State (`10.0.34.10`) | Issue / Discrepancy |
| :--- | :--- | :--- | :--- |
| **Top Action Button** | `Save Payment` (purple button, save icon) | Generic save button | **Issue #9:** Button title mismatch |
| **Row 1 Layout** | 3-column layout: `UPI ID` (green phone), `Account Holder Name` (blue user), `Bank Name` (purple columns) | UPI ID placed in separate right-hand panel | **Issue #10:** Layout broken across two disparate panels |
| **Row 2 Layout** | 3-column layout: `Account Number`, `IFSC Code`, `Branch` | 2-column layout | **Issue #11:** Grid mismatch |
| **Account Type** | Dropdown with note: `Values come from Master Data → Account Type` | Dropdown without helper explanation | **Issue #12:** Missing master data guidance |
| **Bank Reconciliation Card** | Dedicated sub-section card: `Round-off Tolerance (₹)` input on left, full explanatory card on right: *"When a user manually confirms the correct transaction, the application may close only the final residual within this absolute limit. The actual bank amount stays unchanged and the difference is recorded as an explicit round-off adjustment. Use 0.00 to disable; maximum 5.00."* | Single unstyled number input without explanatory guidance card | **Issue #13:** Missing reconciliation policy card |
| **Tolerance Validation** | Hard limit: min `0.00`, max `5.00` | Unconstrained number input | **Issue #14:** Missing server/client policy validation |
| **UPI Payment QR Card** | 2-column layout: Left has QR preview box with `+ Add / Replace`, `Preview`, `Remove`, status `No image selected`. Right has `How the payment QR is used` info card explaining auto-generation from UPI ID | Crammed inline thumbnail with upload button | **Issue #15:** QR preview card and auto-generation guidance missing |

---

### Screen 3: Invoice & Delivery

| Field / UI Element | Desktop Baseline (`10.0.34`) | Web Current State (`10.0.34.10`) | Issue / Discrepancy |
| :--- | :--- | :--- | :--- |
| **Top Action Button** | `Save Invoice` (purple button, save icon) | Generic `Save Invoice Defaults` | **Issue #16:** Button title mismatch |
| **Section Header** | `Invoice & Delivery` (yellow truck/invoice icon) • `Company address, invoice identity, regional formatting and delivery defaults` | `Invoice Defaults` (Regional & Currency Defaults) | **Issue #17:** Title and description mismatch |
| **Row 1: Addresses** | Side-by-side textareas (2 columns): `Company Address` (red pin) & `Default Ship-to Address` (red ship/forklift) | Missing from Invoice tab (erroneously located in Company tab) | **Issue #18:** Address fields missing from Invoice & Delivery |
| **Row 2: State & Currency** | 2-column layout: `State / Place of Supply` (green pin) & `Currency` (green rupee) | State missing from Invoice tab; currency isolated | **Issue #19:** Layout sequence mismatch |
| **Row 3: Timezone & Date** | 2-column layout: `Time Zone` (blue clock) & `Date Format` (purple calendar) | Generic layout | **Issue #20:** Label icons and styling missing |
| **Row 4: Time & Website** | 2-column layout: `Time Format / Timestamp` & `Website` (blue globe) | Website missing from Invoice tab | **Issue #21:** Layout sequence mismatch |
| **Branding, Logo & Signature** | Sub-section card: `Invoice Logo` (`Invoices, quotations, returns and generated PDFs • Full invoice logo preserved (PNG preferred)`) and `Authorized Signature` (`Authorized sign-off on supported business documents • Transparent PNG preferred`) with `+ Add / Replace`, `Preview`, `Remove` | Labeled "Digital Seal" and "Header Logo" with small upload buttons | **Issue #22:** Card structure and button actions mismatch |

---

### Screen 4 & 5: Email & Communication Preferences

| Field / UI Element | Desktop Baseline (`10.0.34`) | Web Current State (`10.0.34.10`) | Issue / Discrepancy |
| :--- | :--- | :--- | :--- |
| **CRITICAL: Test Email Recipient** | Automatically defaults to `txtSmtpEmail.getText()` (`ssdhameliya@gmail.com`) | Pops up `prompt()` hardcoding `'director@jasviindustries.in'` | **Issue #23:** Test email prompts for wrong hardcoded address |
| **CRITICAL: Test Email Pre-Save** | Strictly invokes `saveValues(Section.EMAIL)` before testing so server tests with live credentials | Does not save credentials before test, causing tests to fail on altered settings | **Issue #24:** Out-of-sync SMTP credentials cause test failure |
| **Test Email Progress Modal** | `LiveOperationDialog` with 3-stage progress (1/3: Validating credentials, 2/3: Transmitting message, 3/3: Delivery confirmed) | Browser prompt and simple toast | **Issue #25:** Missing diagnostic progress dialog |
| **Password Visibility Toggle** | Eye icon toggle with prompt: `Configured — leave blank to keep current password` | Plain password input without toggle icon | **Issue #26:** Missing password visibility toggle and guidance |
| **Information & Guidance** | `Information & Guidance` modal button explaining Google App Passwords | Completely missing | **Issue #27:** Missing Google App Password guidance |
| **Company Email Signature** | Dedicated section with helper: `Appended automatically whenever {Signature} token is present in message templates` | Crammed inside credentials box | **Issue #28:** Missing dedicated signature section |
| **Signature Stamp Image** | `Signature / Stamp Image (Optional)` with preview box, status label, `Browse Image`, `Clear Image` | Completely missing | **Issue #29:** Missing digital signature stamp attachment |
| **Token Name Compatibility** | PascalCase tokens: `{CustomerName}`, `{DocumentNo}`, `{DocumentDate}`, `{TotalAmount}`, `{BalanceAmount}`, `{Signature}`, `{CompanyName}` | Lowercase tokens: `{customer}`, `{docNo}`, `{date}`, `{total}`, `{balance}`, `{signature}` | **Issue #30:** Token names incompatible with desktop template parser |
| **Token Insertion Buttons** | Styled buttons with icons: 👤 `{CustomerName}`, 📄 `{DocumentNo}`, 📅 `{DocumentDate}`, ₹ `{TotalAmount}`, ₹ `{BalanceAmount}`, 📎 `{Signature}` | Plain text buttons | **Issue #31:** Missing token icons and styling |
| **Document Type Selector** | Dropdown items: `Sales Invoice (Email)`, `Quotation (Email)`, `Purchase Bill (Email)`, `Payment Receipt (Email)`, `Sales Return (Email)`, `Purchase Return (Email)`, `Sales Invoice (WhatsApp)`, `Quotation (WhatsApp)` | Missing `Purchase Return (Email)` | **Issue #32:** Incomplete document template list |
| **Header Test Email Button** | Visible dynamically in header when on Email tab; hidden on other tabs | Always visible or misplaced | **Issue #33:** Header button lifecycle not tied to active tab |

---

## 3. Implementation Plan for Version `10.0.34.11`

### Step 1: HTML Architecture Refactoring ([`index.html`](file:///d:/ERP%20Website/admin/index.html))
1. Restructure the Settings view (`#view-settings`) to exactly match the 5 desktop screens:
   - **Tab 1 (`COMPANY`):** Move address and website fields to Tab 3. Implement the clean 4-column layout for Company & Billing, application branding dual cards (Application Banner & Application Mark) with exact dimensions and button styling.
   - **Tab 2 (`PAYMENT`):** Align 3-column rows (Row 1: UPI ID, Account Holder Name, Bank Name; Row 2: Account Number, IFSC Code, Branch; Row 3: Account Type). Add the `Bank Reconciliation` card with Round-off Tolerance and explanatory card. Add the dual-column `UPI Payment QR Code` card.
   - **Tab 3 (`INVOICE`):** Rename to `Invoice & Delivery`. Place Company Address and Default Ship-to Address as side-by-side textareas. Place State/Place of Supply, Currency, Time Zone, Date Format, Time Format, Website, Business Tagline, and Invoice Terms in exact sequence. Implement `Branding, Logo & Signature` dual cards with `+ Add / Replace`, `Preview`, `Remove`.
   - **Tab 4 (`EMAIL`):** Restructure into `# Email & Communication Preferences`. Sub-section 1: Email Account (SMTP) with password toggle, port, host, and `Information & Guidance` button. Sub-section 2: Company Email Signature with text block and Signature Image uploader. Sub-section 3: Document Message & Email Templates with PascalCase token buttons.
2. Add modal for `Information & Guidance` (Google App Password instructions).
3. Add modal for `LiveOperationDialog` (SMTP test diagnostic progress).

### Step 2: Controller & Logic Refactoring ([`SettingsController.js`](file:///d:/ERP%20Website/admin/js/controllers/SettingsController.js))
1. **Dynamic Top Action Button:**
   - Update header button text and action dynamically based on active tab: `Save Company`, `Save Payment`, `Save Invoice`, `Save Settings`.
   - Update `btnTestEmail` header visibility so it only appears when on the Email tab.
2. **Canonical Token Engine:**
   - Update `templateDrafts` to use PascalCase tokens: `{CustomerName}`, `{DocumentNo}`, `{DocumentDate}`, `{TotalAmount}`, `{BalanceAmount}`, `{Signature}`, `{CompanyName}`.
3. **Robust Test Email Engine:**
   - Automatically save email settings first before dispatching test.
   - Automatically use configured `smtp-email` as default recipient.
   - Show `LiveOperationDialog` progress modal during test execution.
4. **Branding Asset Handlers:**
   - Support `application.banner`, `application.mark`, `payment.upi.qr`, `invoice.header.logo`, `invoice.digital.seal`, and `email.signature.image`.
   - Implement `+ Add / Replace`, `Preview`, and `Remove` actions with status labels.

### Step 3: Version Bump to `10.0.34.11`
- Update `version.json` and `js/version.js` to `webVersion: "10.0.34.11"`, `webBuild: 11`, `tag: "web-v10.0.34.11"`.
- Update all cachebusters in `index.html` to `?v=10.0.34.11`.
- Sync to GitHub staging repository `D:\GitHub\DSE-ERP-Enterprise`, commit, tag, and push.

---

## 4. Implementation Verification & Verification Sign-Off

All 33 identified issues across the 5 desktop screens have been resolved in Web Admin Studio `10.0.34.11`:
1. **Screen 1 (Company & Billing):**
   - 4-column master layout with semantic SVG icons for Company Name, Phone, Email, GSTIN, PAN, Business Type, Industry, FY Start.
   - Dual application branding cards for Application Banner and Application Mark with `+ Add / Replace`, `Preview`, and `Remove` actions.
   - Addresses and website cleanly moved to Screen 3.
2. **Screen 2 (Payment & Bank):**
   - 3-column commercial bank layout with semantic icons.
   - Bank Reconciliation tolerance card enforcing max ₹5.00 limit with official explanatory policy note.
   - UPI QR code asset management card with live preview.
3. **Screen 3 (Invoice & Delivery):**
   - Side-by-side billing and shipping address textareas.
   - Place of Supply, Currency, Timezone, Date Format, Time Format, Website, Tagline, and Nett-Godown invoice terms in exact desktop order.
   - Dual branding cards for Invoice Logo and Authorized Signature Stamp with full preview and upload capabilities.
4. **Screen 4 & 5 (Email & Communication Preferences):**
   - SMTP credentials panel with password show/hide eye toggle.
   - Interactive `Information & Guidance` modal detailing Google App Password generation steps.
   - Company Email Signature text block with optional transparent PNG/JPG signature image upload and preview.
   - Document Message & Email Templates with full PascalCase tokens (`{CustomerName}`, `{DocumentNo}`, `{DocumentDate}`, `{TotalAmount}`, `{BalanceAmount}`, `{Signature}`).
   - Added `Purchase Return (Email)` template category.
   - Header `Test Email` button dynamically visible only on `EMAIL` tab.
   - Test email engine defaults recipient to `val('smtp-email')` (`ssdhameliya@gmail.com`), pre-saves credentials to backend, and runs full 3-stage `LiveOperationDialog` modal with live execution log stream.
5. **Version Registry & Cache Busting:**
   - Centralized version registry (`version.json` & `js/version.js`) bumped to `10.0.34.11`.
   - All stylesheet and script query string cachebusters updated to `?v=10.0.34.11`.
