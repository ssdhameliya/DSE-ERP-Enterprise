# Scope Specification & Architecture Implementation Blueprint — Release 10.0.34.17 (Build 17)
## Dynamic Logic-Related Screens (Login, Registration, Password Reset), Settings-Driven Branding & Footer Parity, Complete Mock Data Elimination, and Full 8-Loader Data Import Studio Parity

---

## 1. Document & Release Metadata
- **Version Baseline:** `10.0.34.16` (Build `16`)
- **Target Release:** `10.0.34.17` (Build `17`)
- **Target Environments:**
  - Active Web Workspace: `d:\ERP Website\admin`
  - GitHub Release Staging: `D:\GitHub\DSE-ERP-Enterprise` (`main`)
  - Target Production Deployment: `https://jasviindustries.in` / UAT `144.24.109.1`
- **Canonical Desktop Source References:**
  - `org.example.controller.LoginController.java` & `/fxml/pages/Login.fxml` (Screen 1: Sign in & Screen 3: Password Reset)
  - `org.example.controller.RegistrationController.java` & `/fxml/pages/Registration.fxml` (Screen 2: Create New Account)
  - `org.example.service.BrandingService.java` (Settings-driven dynamic company identity)
  - `org.example.ui.SharedApplicationFooter.java` & `dark-theme.css` (Settings-driven dynamic footer & field disappearance rules)
  - `org.example.controller.SettingsController.java` (Company profile settings persistence)
  - `org.example.service.ImportService.java` & `ImportController.java` (All 8 Excel/CSV data loaders)
  - `org.example.importing.ImportModuleRegistry.java` & `ImportMergePolicy.java` (Loader field registries & merge rules)
  - `org.example.importing.PurchaseReconImportCoordinator.java` & `BankStatementImportCoordinator.java`
  - `org.example.server.master.MasterDataService.java` (`saveParty`, `updateParty`, `saveItem`, `updateItem`)
  - `org.example.server.security.SecurityConfig.java` (Public permitAll auth endpoints)
- **Execution Mode:** **Full Implementation, Empirical Verification & Git Deployment**

---

## 2. Executive Summary & Root Cause Analysis

### Area A: Logic-Related Access Screens & Settings Branding Parity
1. **Static Mock HTML & Hardcoded Content:**
   - `index.html` hardcodes `Jasvi Industries`, `Business Management Suite`, `Role-aware secure access to Jasvi Industries`, and `Version 10.0.34.11`.
   - The desktop screenshots explicitly show the company name **`Jashvi Engineers`**, tagline **`Enterprise Production & Distribution`**, and version **`Version 10.0.34`**. Web fails to pull these dynamically from the database `application_setting` table.
   - `index.html` has 8 static mock `<option>` tags in `#login-role` and 4 static mock `<option>` tags in `#reg-role`.
2. **Missing Progressive Disclosure Logic (Fields appearing later upon input):**
   - **Screen 1 (Login):** Authenticator OTP field is initially hidden. Revealing and enabling is tied to role selection and server MFA challenges, with morphing button labels: `LOGIN` &rarr; `VERIFY AUTHENTICATOR` &rarr; `SCAN QR & VERIFY`.
   - **Screen 2 (Registration):** Built as 3 distinct sequential cards: Account details grid with readonly role, `Step 1 • CAPTCHA Card`, `Step 2 • Email OTP Card`, and `Step 3 • Authenticator Card` with automatic QR modal popup upon email verification.
   - **Screen 3 (Password Reset):** Begins with *only* identity and `SEND RESET CODE`. Verification code, authenticator code, and new password fields reveal only after the reset code is dispatched.
3. **Footer Disappearance Rule Violation:**
   - Desktop `SharedApplicationFooter.java` enforces that optional fields (Phone, Email, Website) **disappear completely** if empty in Settings. Web currently uses fallback strings and static delimiter pipes (`|`).

### Area B: Data Import Studio — Full 8-Loader Desktop Parity
1. **The Customer / Supplier Upsert Failure:**
   - In `ImportService.js`, `MasterService.getParties(partyType, false)` passed `false` (cached). If cache did not contain an existing party (such as `CUS002`), `existing` was undefined.
   - Web then erroneously called `createParty(payload)` (`POST /api/master/parties`).
   - PostgreSQL threw a duplicate key constraint violation on `party_code = 'CUS002'`, which resulted in HTTP 500: `"The ERP server could not complete this operation. Check the server log for the underlying error."`
2. **Universal Robustness Missing Across All 8 Loaders:**
   - Instead of patching one loader at a time, Build 17 comprehensively aligns all 8 loaders with desktop `ImportService.java`:
     1. `Items`: Force fresh item index; safe upsert; preserve `openingStock` on update.
     2. `Customers/CRM`: Force fresh party list (`forceRefresh = true`); targeted existence verification; safe fallback to update with `id` and `rowVersion`.
     3. `Suppliers/HRM`: Same robust upsert as customers; enforce required email.
     4. `Sales`: Group by invoice number; verify existing invoices; safe line calculation.
     5. `Purchases`: Group by bill number; verify existing bills; safe line calculation.
     6. `Master Categories & Values`: Check if lookup code exists in category before saving; call `updateLookup` for existing and `saveLookup` for new.
     7. `Purchase Recon`: Validate mandatory fields; format dates to ISO; compute SHA-256 fingerprint.
     8. `Bank Statement`: Parse debit/credit/balance; resolve bank account from Settings/Profile instead of static mock strings.

---

## 3. Screen-by-Screen Specifications & Parity Blueprints

### Screen 1: Sign in to your account (Login)
- **Brand Column:**
  - Dynamic Company Name (`#auth-brand-title` &larr; `company.name` || `Jashvi Engineers`)
  - Dynamic Tagline (`#auth-brand-subtitle` &larr; `company.tagline` || `Enterprise Production & Distribution`)
  - Dynamic Quote (`#auth-brand-tagline` &larr; `"Role-aware secure access to " + company.name`)
  - Dynamic Version (`#auth-app-version-badge` &larr; `Version 10.0.34`)
  - Dynamic Logo (`#auth-brand-logo-img` &larr; `company.logoPath` || `assets/logo.png`)
- **Center Login Card:**
  - Shield icon (`🛡️`), `Welcome Back`, `Sign in to your account`
  - Subtitle: `"Role-aware secure access to " + company.name`
  - `Email or username *` input with user icon
  - `Password *` input with key icon & eye visibility toggle
  - `Role *` select: **100% dynamic**, populated from `GET /api/auth/login-roles`. Zero hardcoded `<option>` tags.
  - **Progressive Field:** `#login-mfa-group` (Authenticator code):
    - Hidden when role is ADMIN and no challenge active.
    - If non-admin role selected: appears disabled with prompt `"Authenticator code is required after password verification"`.
    - When user submits password and server challenges MFA: enables, focuses, prompt becomes `"Enter current 6-digit authenticator code"`, button text becomes `VERIFY AUTHENTICATOR`.
    - If enrollment required: button becomes `SCAN QR & VERIFY`, triggers QR setup modal.
  - Controls: `Remember Me`, `Light Mode`, `OR` divider, `+ Create a new User account`, `Forgot Password?`.

### Screen 2: Create New Account (Self-Registration)
- **Top Form Grid:** 2-column responsive layout matching `Registration.fxml`:
  - Col 1: `Full name *` | Col 2: `Username *`
  - Row 2 (Spans 2 cols): `Email *`
  - Row 3 (Spans 2 cols): `Registration role` (readonly input showing configured role from `GET /api/auth/registration-roles`, e.g. `"Sales"`)
  - Row 4: `Password *` (with eye toggle) | `Confirm password *` (with eye toggle)
- **Step 1 • CAPTCHA Card:**
  - Header: `Step 1 • CAPTCHA` with `Refresh` button
  - Math question label (e.g. `What is 2 + 6?`) loaded from `GET /api/auth/registration/captcha`
  - `Answer` input
  - Full-width button: `Send email OTP` (mail icon)
- **Step 2 • Email OTP Card:**
  - Header: `Step 2 • Email OTP`
  - `Enter email OTP` input
  - Full-width button: `Verify Email OTP` (shield/check icon)
  - Activates upon successful Step 1 OTP dispatch.
- **Step 3 • Authenticator Card:**
  - Header: `Step 3 • Google / Microsoft Authenticator`
  - Description: `"Verify your email first. The QR scanner will open automatically. After authenticator verification, Submit for Admin Approval."`
  - When email OTP is verified, automatically opens the Authenticator Setup Modal:
    - Renders QR code from `provisioningUri`
    - Displays `manualSecret` with `Copy Setup Key` button
    - 6-digit TOTP input
    - `Verify & Submit for Approval` button calling `POST /api/auth/registration/mfa/complete`
    - Status updates cleanly upon success: `"✓ Authenticator verified. Registration is pending Administrator approval."`
- **Bottom:** Centered `Back to login` button.

### Screen 3: Reset your password (Forgot Password)
- **Header:** Shield icon, `Welcome Back`, `Sign in to your account`, dynamic quote, cyan eyebrow `Reset your password`, descriptive subtitle.
- **Step 1 (Initial):**
  - `Email or username *` input
  - Full-width purple outline button: `SEND RESET CODE` (mail icon)
- **Step 2 (Progressive - Revealed after code dispatched):**
  - `Reset verification code *` input (key icon)
  - `Authenticator code (only while the current authenticator is active)` input
  - `New password *` input with eye toggle
  - `Confirm new password *` input with eye toggle
  - Action row: `Back to Login` button + purple `RESET PASSWORD` button
  - Helper text: `"Enter your email or username to receive a reset code."`
  - On success: transitions to Login view, populates username, focuses password, and displays success banner.

---

## 4. Universal Dynamic Footer & Settings Synchronization

### The Footer Disappearance Rule (`SharedApplicationFooter.java` Parity)
1. `trust`: `"Secure   Local   Reliable"` (always visible)
2. `company`: `company.name` (`🏢`)
3. `phone`: `company.phone` (`📞`) &mdash; **If blank/empty, completely removed from DOM (`display: none`)**
4. `email`: `company.email` (`✉️`) &mdash; **If blank/empty, completely removed from DOM (`display: none`)**
5. `website`: `company.website` (`🔗`) &mdash; **If blank/empty, completely removed from DOM (`display: none`)**
6. `clock`: Live IST Clock (`📅 Sunday, 18 Oct 2026 | 10:33 PM | IST`)
- **No Mock Fallbacks:** Never render `'9099939193'`, `'info@jasviindustries.in'`, or `'www.company.com'` when the setting is blank.
- **No Floating Delimiters:** Flexbox layout with CSS gap spacing replaces static `|` characters.
- Shared between `.auth-desktop-footer` and `#app-footer-bar`.

---

## 5. Full 8-Loader Data Import Studio Architecture

| Loader # | Module Name | Target Entity / API | Desktop Alignment & Upsert Rule |
| :--- | :--- | :--- | :--- |
| **1** | `Items` | `ItemEntity`<br>`/api/master/items` | Force-refresh existing item index (`getItems(true)`). If item exists: update using `id` and `rowVersion`; preserve `openingStock` and `reservedStock` (creation baselines). If new: create. Catch duplicate conflicts and fall back to update. |
| **2** | `Customers/CRM` | `PartyEntity` (`CUSTOMER`)<br>`/api/master/parties` | Force-refresh party index (`getParties('CUSTOMER', true)`). Check existing by `partyCode.toUpperCase()`. If existing: update with `id` and `rowVersion` (merging non-blank fields in `UPDATE_NON_BLANK`). If new: create. Catch duplicate conflicts, re-fetch, and execute update. |
| **3** | `Suppliers/HRM` | `PartyEntity` (`SUPPLIER`)<br>`/api/master/parties` | Identical robust upsert as Customers. Validate required supplier email (`email` is mandatory for suppliers). Store in cache for intra-sheet duplicate avoidance. |
| **4** | `Sales` | `SalesEntity`<br>`/api/operations/sales` | Group rows by `invoice_no`. Check existing invoices. Compute lines (`taxableAmount = qty * rate`, `gstAmount = taxable * gstPct / 100`, `totalAmount = taxable + gst`). Protect posted invoices from overwrite. |
| **5** | `Purchases` | `PurchaseEntity`<br>`/api/operations/purchases` | Group rows by `invoice_no`. Check existing purchase bills. Compute lines with GST. Protect posted bills from overwrite. |
| **6** | `Master Categories & Values` | `CategoryEntity` & `LookupEntity`<br>`/api/master/categories/upsert`<br>`/api/master/lookups` | Upsert category first. Check if `lookupCode` already exists under category. If exists: execute `updateLookup` with `id` and `rowVersion`. If new: execute `saveLookup`. |
| **7** | `Purchase Recon` | `PurchaseReconRecord`<br>`/api/purchase-recon/imports` | Map `supplier_name`, `supplier_gstin`, `supplier_invoice_no`, `invoice_date`, `taxable_value`, `cgst`, `sgst`, `igst`, `invoice_value`. Format date to ISO. Calculate SHA-256 fingerprint. Submit via `ReconService.importReconRows`. |
| **8** | `Bank Statement` | `BankStatement`<br>`/api/bank-statements/import` | Parse `debit`, `credit`, `balance`, `transactionDate`, `reference`, `description`. Resolve account details from active company profile settings instead of hardcoded strings. Submit via `ReconService.importStatement`. |

---

## 6. Complete Inventory of Mock Data Removed in Build 17

1. `index.html:174–177`: Hardcoded brand strings (`Jasvi Industries`, `Business Management Suite`, `Role-aware secure access to Jasvi Industries`).
2. `index.html:179`: Hardcoded badge `Version 10.0.34.11`.
3. `index.html:216–225`: 8 static mock `<option>` tags in `#login-role`.
4. `index.html:359–364`: 4 static mock `<option>` tags in `#reg-role`.
5. `index.html:406–416`: Hardcoded strings in `.auth-desktop-footer` (`Jasvi Industries`, `9099939193`, `ssdhameliya@gmail.com`, `www.company.com`, static clock).
6. `app.js:53–68`: Hardcoded fallback values in `syncFooterCompanyProfile`.
7. `ImportService.js:1272–1274`: Hardcoded mock bank name (`Kotak Mahindra Bank`), account number (`50200012847192`), and account holder (`Jasvi Industries Pvt Ltd`).

---

## 7. Implementation Checklist & Verification Gates

- [ ] Create `js/services/BrandingService.js` managing settings-driven company branding, quote generation, and dynamic footer disappearance.
- [ ] Update `index.html`:
  - [ ] Screen 1: Clean mock options from `#login-role`, bind progressive OTP challenge group.
  - [ ] Screen 2: Rebuild into 2-column grid and 3 distinct cards (`Step 1 • CAPTCHA`, `Step 2 • Email OTP`, `Step 3 • Authenticator`) matching Screenshot 2.
  - [ ] Screen 3: Progressive 2-step password reset layout.
  - [ ] Footers: Semantic delimiter-free flex layout for `.auth-desktop-footer` and `#app-footer-bar`.
- [ ] Update `js/app.js`:
  - [ ] Load login roles from `GET /api/auth/login-roles` on startup.
  - [ ] Load registration role from `GET /api/auth/registration-roles`.
  - [ ] Progressive disclosure state machine `updateLoginMode()`.
  - [ ] Integrate `BrandingService.refresh()` on boot and when settings change.
- [ ] Overhaul `js/services/ImportService.js`:
  - [ ] Fix all 8 loaders with force-refresh and robust upsert logic.
  - [ ] Resolve Customer / Supplier duplicate key constraint error.
  - [ ] Handle Master Lookups update vs create.
  - [ ] Dynamic account resolution for Bank Statement.
- [ ] Verify syntax across all JS files and HTML structure.
- [ ] Commit, tag `web-v10.0.34.17`, and push to `D:\GitHub\DSE-ERP-Enterprise` (`main`).
