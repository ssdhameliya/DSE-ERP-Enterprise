# DSE ERP SETTINGS STUDIO: FULL IMPLEMENTATION & SYNCHRONIZATION SCOPE

> **Target Baseline**: Desktop ERP `DSE-ERP-10.0.25` (`c:\Users\JATIN DHAMELIYA\Downloads\DSE-ERP-10.0.25-INTELLIJ-READY-FINAL-V19\DSE-ERP-10.0.25`)  
> **Working Directory (Web)**: `d:\ERP Website\admin`  
> **Release Staging (Web)**: `D:\GitHub\ReleaseSource Website\admin`  
> **Repository Target (Web)**: `D:\GitHub\DSE-ERP-Enterprise` (`web/admin`)  
> **Repository Target (Desktop/Server)**: `D:\GitHub\DSE-ERP-Primary` (`ssdhameliya/DSE-ERP`)  
> **Live UAT Runtime**: `https://erp-uat.jasviindustries.in/admin/`  
> **Live PROD Runtime**: `https://erp.jasviindustries.in/admin/`  
> **Date**: October 17, 2026  

---

## 1. Release Versions & Environment Identification

| Component | Current Live Version | Target Release Version | Deployment Mechanism |
|---|---|---|---|
| **Desktop Application** | `v10.0.32` | `v10.0.33` | GitHub Actions &rarr; MSI/EXE/DMG installer & pre-login auto-updater gateway |
| **Backend API Server** | `v10.0.32` | `v10.0.33` | GitHub Actions &rarr; Oracle Cloud VM (`deploy-oracle-release.sh`) |
| **Web Application Studio**| `10.0.32` | `10.0.33.11` (Cache Tag) | Git push to `DSE-ERP-Enterprise` (`web/admin`) &rarr; Cloud Web Server |
| **PostgreSQL Database** | Port `55432` | Schema Version 10.x | Managed PostgreSQL cluster (`dse_erp_uat` / `dse_erp`) |

---

## 2. End-to-End Build & Deployment Flow (UAT & PROD)

```text
                                [ Developer / Antigravity ]
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
         [ Desktop & Server Pipeline ]                      [ Web Studio Pipeline ]
         Repo: `ssdhameliya/DSE-ERP`                        Repo: `DSE-ERP-Enterprise`
                      │                                             │
                      ▼ (Tag: `v10.0.33`)                           ▼ (Commit: `web/admin`)
         GitHub Actions: "Build Native Release"             Auto-Deployed to Web Server
         • Compiles Spring `server.jar`                     • Static assets copied to web root
         • Builds Windows x64 (.msi/.exe)                   • Version tag `?v=10.0.33.11`
         • Builds macOS Apple Silicon (.dmg)                • Instant UAT access upon Ctrl+F5
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
  [ UAT Environment ]       [ PROD Environment ]
  • Oracle VM (`dse_erp_uat`) • Oracle VM (`dse_erp`)
  • Auto-deploys via SSH    • Gated: Requires Admin Approval
  • Verifies health         • Verifies UAT health first
  • Auto-rollback ready     • Deploys verified JAR
                            • Promotes Release to "Latest"
                            • Desktop clients auto-update
```

### Desktop & Server Deployment Detail
1. **Repository Authority**: `ssdhameliya/DSE-ERP` is the sole deployment authority for backend and desktop builds.
2. **UAT Auto-Deploy**:
   - Pushing tag `v10.0.33` triggers `.github/workflows/deploy-prod.yml`.
   - The workflow compiles the canonical server JAR and native desktop installers, uploads them to the GitHub Release, and streams the verified artifact over SSH to the UAT Oracle VM.
   - It performs an automatic PostgreSQL snapshot before applying database migrations and verifies `/api/runtime/health`.
3. **PROD Promotion Gate**:
   - The same workflow run pauses before entering the protected `production` environment.
   - Once approved by the administrator, the exact checksum-verified artifact is promoted to PROD, health-verified, and marked as `Latest`.
4. **Desktop Updates**:
   - Desktop apps poll the server's private gateway `/api/updates/releases/latest`.
   - Connected desktop users receive an in-app update prompt with zero manual file transfers.

### Web Studio Deployment Detail
1. **Source & Staging**: Changes are developed in `d:\ERP Website\admin`, synced to `D:\GitHub\ReleaseSource Website\admin`, and pushed to `D:\GitHub\DSE-ERP-Enterprise` (`web/admin`).
2. **Instant Refresh**: The web server serves static HTML/JS/CSS. Bumping asset links to `?v=10.0.33.11` forces all browsers to fetch fresh code on `Ctrl + F5`.

---

## 3. Storage Audit & Bidirectional Server Synchronization

### The Vulnerability in Existing Desktop Code
In Desktop's `ConfigManager.java`:
```java
private static boolean shouldUseServerSetting(String key) {
    if (getConfiguredDeploymentMode() != DeploymentMode.SHARED_CLIENT || key == null || org.example.api.ApiSession.token() == null) 
        return false;
    return key.startsWith("company.") || key.startsWith("payment.") || key.startsWith("invoice.") ...
}
```
* **Problem**: In `LOCAL` or `STANDALONE` mode, Desktop writes settings **only to `config.properties` on the local hard disk**. It never pushes them to PostgreSQL!
* **Consequence**: Web reads from PostgreSQL `application_setting`, which remains empty, causing Desktop and Web settings to diverge.

### The Unified Server-Authoritative Solution
1. **Desktop Fix**: Modify `ConfigManager.java` so that whenever an authenticated API session exists (`ApiSession.token() != null`), Desktop **always reads from and writes to the server database**, regardless of the deployment mode string.
2. **Server Endpoints (Single Source of Truth for Both Desktop and Web)**:
   - **General Business Settings**:
     - `GET /api/support/settings/{key}` &rarr; Fetch single configuration key.
     - `PUT /api/support/settings` &rarr; Batch upsert `SupportDtos.SettingsBatch` (`Map<String, String>`) into PostgreSQL `application_setting` table.
   - **Corporate Email (SMTP)**:
     - `GET /api/authority/email/settings` &rarr; Returns SMTP host, port, sending email, and configured status.
     - `PUT /api/authority/email/settings` &rarr; Encrypts and persists SMTP credentials on server.
     - `POST /api/authority/email/test` &rarr; Tests live SMTP delivery directly from the server.
   - **Notification Preferences**:
     - `GET /api/insights/notification-preferences` &rarr; Returns per-user category toggles.
     - `PUT /api/insights/notification-preferences` &rarr; Persists notification preferences on server.
   - **Branding & Image Assets**:
     - `PUT /api/authority/resources/BUSINESS_ASSET/{key}` &rarr; Uploads raw binary bytes (Logo, Signature, QR, Banners).
     - `GET /api/authority/resources/BUSINESS_ASSET/{key}` &rarr; Serves image bytes directly.

---

## 4. Submenus Scope Separation (Desktop vs Web)

| # | Submenu Title | Desktop App Status | Web App Status | Rationale |
|---|---|---|---|---|
| **1** | Company & Billing | **Retained** | **Retained** | Core business identity and legal tax details. |
| **2** | Payment & Bank | **Retained** | **Retained** | Bank accounts, IFSC, UPI ID, and QR code. |
| **3** | Invoice & Delivery | **Retained** | **Retained** | Address, GST place of supply, logo, and signature. |
| **4** | Notifications | **Retained** | **Retained** | 16 activity categories & toast preferences. |
| **5** | Email Settings | **Retained** | **Retained** | SMTP delivery, signature, and message templates. |
| **6** | Security & Session | **Retained** | **Retained** | Inactivity timeout, warning, and MFA policy. |
| **7** | Workspace & Storage | **Retained** | ❌ **Removed from Web** | Desktop-only local folder pickers & diagnostic disk cleanup. |
| **8** | Keyboard Shortcuts | **Retained** | ❌ **Removed from Web** | Desktop-only JavaFX OS keyboard accelerator registry. |
| **9** | Application Updates | **Retained** | ❌ **Removed from Web** | Desktop-only JAR/EXE auto-updater & GitHub release tag checker. |
| **10**| Module Activation | **Retained** | **Retained** | GL, GST engine, 3-way match, daily briefing, serial tracking. |

### Settings Dual Entry Points
Both entry points will share the exact same DOM view and controller state:
1. **Left-hand Sidebar Accordion (`#grp-settings`)**: Shows the 7 web submenus. Clicking any submenu opens `#view-settings` and activates that tab immediately.
2. **Top Header User Dropdown**: Avatar click &rarr; "Settings" navigates to `#view-settings` and defaults to Section 1 (**Company & Billing**).

---

## 5. Field-by-Field Specification Across All 7 Web Screens

### Screen 1: Company & Billing (`CompanySettingsPanel.fxml`)
* **Legal Identity Controls**:
  - `txtCompanyName` &mdash; Official Registered Business Name.
  - `txtPhone` &mdash; Primary Contact Phone Number.
  - `txtEmail` &mdash; Official Corporate Email Address.
  - `txtGstin` &mdash; 15-character GSTIN (Auto-uppercased).
  - `txtCompanyPan` &mdash; 10-character PAN (Auto-uppercased).
  - `cmbBusinessType` &mdash; *Private Limited, Partnership, Sole Proprietorship, LLP, Public Limited*.
  - `cmbIndustry` &mdash; *Manufacturing, Engineering & Tooling, Textile & Apparel, Wholesale & Distribution, Services*.
  - `dpFinancialYearStart` &mdash; Financial Year Start Date (Default: `01/04`).
* **Application Branding Controls**:
  - `txtApplicationName` &mdash; Display Title (Mirrors Company Name by default).
  - `txtApplicationTagline` &mdash; Subtitle Tagline.
  - `txtApplicationStartingText` &mdash; Splash and Sign-in Welcome Message.
* **Branding Assets (Server Resource Upload)**:
  - Application Banner (`application.brandPath` &mdash; 1600 &times; 320 image, Upload / Preview / Remove).
  - Application Mark (`application.markPath` &mdash; 512 &times; 512 icon, Upload / Preview / Remove).

### Screen 2: Payment & Bank (`PaymentSettingsPanel.fxml`)
* **Banking Controls**:
  - `txtUpiId` &mdash; Corporate UPI VPA ID (e.g. `company@icici`).
  - `txtAccountHolder` &mdash; Bank Account Holder Name.
  - `txtBankName` &mdash; Banking Institution Name.
  - `txtAccountNumber` &mdash; Bank Account / Overdraft Number.
  - `txtIfsc` &mdash; 11-character IFSC Code (Auto-uppercased).
  - `txtBranch` &mdash; Bank Branch Location.
  - `txtBankMatchRoundingTolerance` &mdash; Reconciliation round-off tolerance (Numeric, max ₹5.00).
* **Master Data Dynamic Lookup**:
  - `cmbAccountType` &mdash; **Dynamically loaded from server** via `GET /api/master/lookups?type=ACCOUNT_TYPE`.
  - Populates all user-created Master Data account types (*Savings, Current, Overdraft, Cash Credit, Escrow*).
  - Fallback safety preserves any legacy configured value.
* **Asset**:
  - UPI Payment QR Code (`payment.qrImagePath` &mdash; Upload / Preview / Remove; prints dynamically on tax invoices & payment vouchers).

### Screen 3: Invoice & Delivery (`InvoiceSettingsPanel.fxml`)
* **Address & Regional Formatting**:
  - `txtCompanyAddress` &mdash; Principal Place of Business / Registered Office.
  - `txtShipAddress` &mdash; Default Warehouse / Dispatch Address.
  - `cmbCompanyState` &mdash; State Name & GST State Code (Bound to GST State master codes, e.g. *24-Gujarat*).
  - `cmbCurrency` &mdash; *INR (₹), USD ($), EUR (€), GBP (£)*.
  - `cmbTimeZone` &mdash; *Asia/Kolkata (IST), UTC, America/New_York (EST)*.
  - `cmbDateFormat` &mdash; *dd/MM/yyyy, yyyy-MM-dd, dd-MMM-yyyy*.
  - `cmbTimeFormat` &mdash; *12-hour AM/PM, 24-hour*.
  - `txtCompanyWebsite` &mdash; Official Website URL.
  - `txtCompanyTagline` &mdash; Sub-Header Tagline.
  - `txtInvoiceTerms` &mdash; Standard Commercial Terms & Jurisdiction Conditions.
* **Branding Assets**:
  - Invoice Brand Logo (`company.logoPath` &mdash; Transparent PNG logo used on all generated PDFs).
  - Authorized Signature (`company.signaturePath` &mdash; Digital signature stamp for document sign-off).

### Screen 4: Notifications (`NotificationsSettingsPanel.fxml`)
* **Master Preferences**:
  - `chkNotifications` &mdash; Show Application Notifications.
  - `chkNotificationToasts` &mdash; Show Desktop / Web Toast Alerts.
* **16 Activity Categories (Backed by `/api/insights/notification-preferences`)**:
  - Sales & Invoices (`sales`), Purchases (`purchases`), Quotations (`quotations`), Returns (`returns`), Payments (`payments`), Inventory (`inventory`), Banking (`banking`), Reports (`reports`), Reminders (`reminders`), Communication (`communication`), Approvals (`approval`), Imports (`imports`), Backup (`backup`), Updates (`update`), System (`system`), and Security (`security` &mdash; locked checked).

### Screen 5: Email Settings (`EmailSettingsPanel.fxml`)
* **SMTP Delivery Configuration**:
  - `txtSmtpHost` &mdash; SMTP Server Host.
  - `txtSmtpPort` &mdash; Port (`587` TLS / `465` SSL).
  - `txtSmtpEmail` &mdash; Authenticated Email Address.
  - `txtSmtpPassword` &mdash; App Password (Masked with toggle).
  - `btnTestEmail` &mdash; Sends test email verification to current user via `POST /api/authority/email/test`.
* **Corporate Email Signature**:
  - `txtEmailSignature` &mdash; HTML / Plaintext corporate signature block.
* **Document Message & Email Templates**:
  - Document Selector: *Sales Invoice, Quotation, Purchase Order, Payment Receipt, Credit Note, Debit Note, Reminder*.
  - Subject Template & Body Template.
  - Dynamic Tokens: `{CustomerName}`, `{DocumentNo}`, `{DocumentDate}`, `{TotalAmount}`, `{BalanceAmount}`, `{Signature}`.
  - Live Preview & Reset to Default buttons.

### Screen 6: Security & Session (`SecuritySettingsPanel.fxml`)
* **Controls**:
  - `txtSessionTimeoutMinutes` &mdash; Inactivity auto-logout timeout (Allowed: 5 to 120 mins).
  - `txtSessionWarningMinutes` &mdash; Pre-logout warning popup duration (1 to 10 mins).
  - `cmbMfaPolicy` &mdash; Multi-Factor Authentication Policy (*Required*, *Admin Controlled*, *Disabled*).
  - `chkUiDiagnostics` &mdash; Enable Diagnostic Logging & UI Audit Trails.

### Screen 7: Module Activation (`ModulesSettingsPanel.fxml`)
* **Controls**:
  - **General Ledger**: Enable GL (`module.gl.enabled`), Auto-post Journal Vouchers (`module.gl.autoPost`), Live Trial Balance (`module.gl.trialBalance`).
  - **GST Statutory Engine**: Enable GST (`module.gst.enabled`), Auto-Reconcile GSTR-2B (`module.gst.auto2bMatch`), Strict Place of Supply Gating (`module.gst.posGating`), TDS Withholding (`module.tds.enabled`).
  - **Smart Operational Automations**: Smart 3-Way Matching (`module.automation.threeWayMatch`), Auto-draft Debit Notes (`module.automation.autoDraftDebitNote`), Safety Stock Alerts (`module.automation.stockAutoReorder`), Credit Hard Stop (`module.automation.creditHardStop`).
  - **Executive 8:00 PM Daily Briefing**: Enable Briefing (`module.briefing.enabled`), WhatsApp Channel, Email Channel, Mobile Number (`txtBriefingPhone`).
  - **Multi-Warehouse & Serial Registry**: Batch, Expiry (FEFO), and Serial Tracking (`module.inventory.batchSerialTracking`).

---

## 6. Authentication, MFA Recovery & Session Persistence Scope (Desktop & Web)

### 6.1 Desktop: Authenticator Recovery (Lost / Replaced Phone) Flow Polish
* **Root Cause Identified**:
  - The self-service lost-phone recovery flow is fundamentally a **two-step security process**:
    1. **Step 1 (Registered Email OTP)**: Validates identity and revokes the old phone's TOTP secret (`completeLoginMfaRecovery`).
    2. **Step 2 (New Authenticator Enrollment)**: Generates a replacement QR code / manual key (`showAuthenticatorEnrollment`). The user **must scan the QR code into Google/Microsoft Authenticator and enter the new 6-digit TOTP code**.
  - **The "Login to ERP" Loop**: Users often believe the Email verification code was the final step. When the second dialog opens with the new QR code, entering the Email OTP again or closing the dialog leaves enrollment incomplete.
  - Dismissing the QR dialog immediately reverts the desktop UI to the primary `"LOGIN"` button, leaving the user with the impression that sign-in failed.
  - Server-side security contract: `tokens.revokeUser(userId)` explicitly revokes active sessions during recovery; no valid session exists until the newly provisioned authenticator is verified.
* **Scope of Fix**:
  - **Clear Multi-Step Modal Guidance**: Update `LoginController.java` to display an intermediate confirmation dialog between Step 1 and Step 2: *"Registered email verified. Old authenticator invalidated. You must now scan the new QR code below to complete sign-in."*
  - **Enrollment Persistence**: Prevent resetting `btnLogin` back to `"LOGIN"` if the user temporarily minimizes the enrollment dialog. Keep the enrollment challenge active and display an explicit *"Continue Enrollment"* action.
  - **Safe Session Establishment**: Ensure `completeLogin()` handles post-recovery session tokens cleanly without spurious `AuthenticationRequiredException` rollbacks.

---

### 6.2 Web: "Remember Me" Credential & Session Persistence
* **Root Cause Identified**:
  - **Checkbox State Not Saved**: The `#login-remember` checkbox in `index.html` is never saved to or loaded from `localStorage` (`dse_remember_me`). On page reload, it always reverts to default.
  - **Password / Token Not Remembered**: Desktop saves encrypted credentials in OS preferences (`PREF_PASSWORD`). Web only stored `dse_saved_identity` and `dse_saved_role`, forcing manual password entry on every login.
  - **Role Selection Wipe**: When `window.loadLoginRoles()` asynchronously fetches `/api/auth/login-roles` from the server, replacing `roleSelect.innerHTML` wipes out the user's saved role and resets it back to `ADMIN`.
  - **Aggressive 401 Session Clearing**: In `ApiService.js`, any transient 401 on background requests removes `dse_access_token` and displays `#auth-overlay` with a blank form.
* **Scope of Fix**:
  - **Persist Checkbox State**: Store and restore `dse_remember_me` in `localStorage`.
  - **Safe Asynchronous Role Restoration**: Modify `loadLoginRoles()` to ensure the saved role (`dse_saved_role`) is re-selected after `roleSelect.innerHTML` is dynamically populated.
  - **Session Keep-Alive & Token Storage**: Allow persistent session tokens when "Remember Me" is enabled, preventing accidental overlay prompts on browser reloads.
  - **Refined 401 Interception**: Distinguish between expired main sessions and benign resource-level unauthorized responses so the auth overlay is only shown when the session is truly invalid.

---

### 6.3 Web: Non-Admin User OTP Login & Role-Aware Startup
* **Root Cause Identified**:
  - **Post-Login Hardcoded Admin Calls Crash Login**:
    In `app.js` (`handleLoginSubmit` lines 538–540), immediately after `window.AuthService.completeMfa(otp)` succeeds, the client unconditionally executes:
    ```javascript
    if (window.DashboardController && window.DashboardController.refresh) await window.DashboardController.refresh();
    if (window.ItemMasterController && window.ItemMasterController.loadItems) await window.ItemMasterController.loadItems();
    if (window.PartyController && window.PartyController.loadCustomers) await window.PartyController.loadCustomers();
    ```
    Non-admin users (e.g. `USER`, `SALES`, `PURCHASE`, `ACCOUNTANT`, `STAFF`) lack permissions for `/api/insights/dashboard` or `/api/operations/purchases`.
    The server rejects these calls with **HTTP 403 Forbidden**.
    `DashboardController.refresh()` throws an unhandled `403 Insufficient permission` error.
    The enclosing `catch (err)` block in `handleLoginSubmit` catches this 403, assumes MFA verification failed, and displays `alertEl.innerText = err.message || 'MFA verification failed.'` on the login card!
    The non-admin user is trapped on the login overlay despite entering the 100% correct OTP.
  - **Startup Crash on Page Reload**:
    In `app.js` (`window.App.init()` lines 273–279), the exact same unconditional admin calls are executed on page load, crashing the script for any authenticated non-admin user.
  - **Role Dropdown Mismatch Trap**:
    `#login-role` defaults to `ADMIN`. If a non-admin enters credentials without changing the dropdown, `AuthService.login()` rejects them with `roleMismatch: true` before MFA even starts.
* **Scope of Fix**:
  - **Auto-Detect User Role**: Auto-select the user's role from the server response payload instead of forcing the user to manually match the dropdown.
  - **Role-Aware Safe Post-Login Execution**:
    - Wrap `DashboardController.refresh()`, `loadItems()`, and `loadCustomers()` in role-permission checks and safe `try/catch` blocks so missing administrative permissions never fail the login or display MFA errors.
  - **Role-Appropriate Default View Routing**:
    - If a non-admin user lacks `DASHBOARD.VIEW` permission, safely route them to their role's authorized landing view (e.g., Sales Register for `SALES`, Purchase Register for `PURCHASE`, or My Profile for `USER`).
  - **Safe Startup Initialization**:
    - Patch `window.App.init()` to respect user permissions during initial data loading.

---

## 7. One-Shot Execution Steps

```text
Step 1: Desktop Settings & MFA Recovery Polish
        ├── File: desktop/src/main/java/org/example/config/ConfigManager.java
        │   └── Ensure Desktop writes all 7 settings sections to PostgreSQL `application_setting` table.
        └── File: desktop/src/main/java/org/example/controller/LoginController.java
            └── Add clear transition guidance between Email OTP (Step 1) and QR code enrollment (Step 2).
            └── Prevent premature reset to "LOGIN" button if QR dialog is minimized.

Step 2: Web Navigation Clean-Up
        ├── File: index.html & js/navigation/NavigationRouter.js
        └── Remove Workspace, Shortcuts, and Updates from Web. Keep only 7 submenus.

Step 3: Web Settings Studio HTML Markup Port
        ├── File: index.html (#view-settings)
        └── Port exact FXML layouts, inputs, asset preview boxes, and buttons for all 7 screens.

Step 4: Web SettingsController & Master Lookup Service
        ├── File: js/controllers/SettingsController.js
        └── Connect to /api/support/settings, /api/master/lookups, /api/authority/email, /api/insights.

Step 5: Web Authentication & Session Hardening
        ├── File: js/services/AuthService.js, js/services/ApiService.js, js/app.js
        └── Fix "Remember Me" checkbox & role persistence in localStorage.
        └── Implement auto-role detection from server credentials.
        └── Wrap post-login data loading in permission guards so non-admin OTP login never crashes.
        └── Route non-admin users to authorized default views (Sales, Purchase, Profile).

Step 6: Syntax & Delimiter Audit
        └── Run automated lexer script across all JS files. Zero unclosed braces or syntax errors.

Step 7: Three-Way Repository Synchronization & Verification
        └── Sync from `d:\ERP Website\admin` to `ReleaseSource` and `DSE-ERP-Enterprise` (`web/admin`).
        └── Push to GitHub `main` branch to trigger live UAT update.
        └── Test bidirectional settings sync between Desktop and Web.
        └── Validate MFA recovery in Desktop and Non-Admin OTP login in Web.
```

