# Scope Specification & Fixed Scope — Release 10.0.34.16 (Build 16)
## User Access & Permissions, Registration Approvals Screen, Permission Matrix Desktop Parity, Unified User Dialog, Data Import Studio Supplier Persistence, Universal Footer Spacing, and Report Scheduler Data Binding

---

## 1. Document & Release Metadata
- **Version Baseline:** `10.0.34.15` (Build `15`)
- **Target Release:** `10.0.34.16` (Build `16`)
- **Target Environment:** Web Admin Studio (`d:\ERP Website\admin`) & GitHub Staging (`D:\GitHub\DSE-ERP-Enterprise`)
- **Canonical Desktop References:**
  - `org.example.controller.UserAccessController` & `UserAccess.fxml`
  - `org.example.controller.UserDialogController` & `UserDialog.fxml`
  - `org.example.controller.RegistrationApprovalsController` & `RegistrationApprovals.fxml`
  - `org.example.controller.PermissionMatrixController` & `PermissionMatrix.fxml`
  - `org.example.shared.PermissionCatalog` (31 Modules, 10 Categories, Common & Special Actions, 4 Templates)
  - `org.example.server.admin.AdminController` & `AdminService`
  - `org.example.ui.SharedApplicationFooter` & `dark-theme.css` (`.universal-app-footer`, `.universal-footer-trust`, `.universal-footer-company`, `.universal-footer-detail`, `.universal-footer-clock`)
  - `org.example.service.ImportService` & `MasterDataService.java` (`saveParty`, `updateParty`, `assertVersion`)
  - `org.example.server.reporting.ReportScheduleController` & `ReportScheduleDtos.SchedulePage` (`res.schedules`, `res.summary`)
- **Execution Mode:** **Specification, Implementation & Verified Build (Build 16)**

---

## 2. Executive Summary & Root Cause Analysis (Web vs. Desktop Disparities)

Through thorough investigation of the desktop JavaFX source code, FXML layout definitions, Spring Boot REST controllers, and active web client code, the following 8 architectural, behavioral, and UI disparities have been identified and scoped for Build 16:

### Issue 1: User Management Table Header & Action Menu Disparity
* **Desktop Reference:** `UserAccess.fxml` & `UserAccessController.java` (lines 97–117, 259–289)
* **Observed in Web:**
  * Web table displays 11 ad-hoc columns: `ID`, `Full Name`, `Username`, `Email Address`, `Assigned Role`, `Department`, `Branch`, `Status`, `MFA State`, `Last Login`, `Actions`.
  * Desktop standardizes on 10 semantic columns: `User`, `Email / Username`, `Role`, `Department`, `Access`, `Branch`, `Status`, `Last Login`, `MFA`, `Actions`.
  * The table filter toolbar strip (`All Roles`, `All Statuses`, `All Branches`, and `Refresh`) present in desktop was missing from the web table card.
  * The desktop bottom action strip (`Edit Selected`, `Reset Password`, `+ Add New User`) was missing in web.
  * Web row actions used a basic menu with incomplete items, lacking the signature purple `Actions ▼` button and desktop-matching menu items (`View User`, `Edit User`, `Reset Password`, `Reset Authenticator`, `Lock/Unlock Account`, `View Role Permissions`, `Delete User`).

### Issue 2: User Account Dialog (Add vs. Edit, Role Lookup, and Password Semantics)
* **Desktop Reference:** `UserDialog.fxml` & `UserDialogController.java` (lines 80–146, 274–316)
* **Observed in Web:**
  * Web used a generic form with mock lookups (`getLookupValues('USER_ROLE')` falling back to `STAFF`, `OPERATIONS`, `HEADQUARTERS`) instead of live active roles from `GET /api/admin/roles`.
  * In web edit mode, the password field was hard-hidden (`display: none`), preventing administrators from updating passwords inline.
  * In desktop, the exact same dialog handles both Add and Edit with dynamic title, button text, and credential rules:
    * **Add New User:** Title is `"Add New User"`, button is `"Create User"`, and credentials (`Password *` and `Confirm Password *`) are **mandatory** (minimum 8 chars, letter + number).
    * **Edit User Account:** Title is `"Edit User Account"`, button is `"Update User"`, and credentials are **optional** (`"Leave blank to keep current password"`). If left blank, existing password remains untouched (`password = null`). If filled, it validates length and confirmation before updating.
  * Web dialog lacked Section 3: **Account & Authentication** containing checkboxes (`Active`, `Locked`, `Require MFA`), server MFA policy indicator (`Admin Controlled` / `Required for non-Admin`), live authenticator status (`Active — Google / Microsoft Authenticator` / `Enrollment required`), and the `Reset Authenticator` action button.

### Issue 3: Registration Approvals as a Dedicated Full Screen
* **Desktop Reference:** `RegistrationApprovals.fxml` & `RegistrationApprovalsController.java`
* **Observed in Web:**
  * Web launched a cramped popup modal (`#modal-registration-approvals`), lacking desktop layout parity.
  * In desktop, Registration Approvals is a **dedicated full screen** (`/fxml/pages/RegistrationApprovals.fxml`):
    * Top header with `"Back to User Access"` and `"Refresh"`.
    * 2 KPI cards: `Pending Approval` and `Identity + MFA Verified`.
    * Dedicated table with columns: `User`, `Email`, `Requested Role`, `Email` (verified badge), `Authenticator` (verified badge), `Requested` (timestamp), `Status`.
    * Bottom approval bar with: `Assign final role` dropdown (loaded dynamically from active non-admin roles), red `Reject` button (with reason dialog), and purple `Approve User` button.

### Issue 4: Role Management Centralization into Master Data
* **Desktop Reference:** `UserAccessController.java` (lines 182, 254–258)
  ```java
  @FXML private void manageRoles(){ openRoleMaster(); }
  private void openRoleMaster(){
      MasterDataController.requestCategory("ROLE");
      DashboardController.navigateFromChildPage("Master Data", "/fxml/pages/Masterdata.fxml");
  }
  ```
* **Observed in Web:**
  * In desktop, role management is centralized under **Master Data** (`ROLE` category).
  * Web must follow this exact convention: clicking `Manage Roles` delegates directly to `MasterDataController.selectCategory('ROLE')` and navigates to `#view-master-data`.

### Issue 5: Complete Permission Matrix Workspace Parity
* **Desktop Reference:** `PermissionMatrix.fxml`, `PermissionMatrixController.java`, and `PermissionCatalog.java`
* **Observed in Web:**
  * Web had a rudimentary flat table showing only `ADMIN` permissions in raw key-value format without role switching, templates, or matrix capabilities.
  * In desktop, `PermissionMatrix` is a rich, metadata-driven workspace:
    * **Top Control Strip:** Role dropdown (from `GET /api/admin/roles`), Permission Template dropdown (`Read Only`, `Sales Standard`, `Manager Standard`, `Business Full Access`) + `Apply Template`, `Copy From Role` + `Copy`, Search filter, `Show granted only` checkbox, granted counter badge `X of Y granted`, assigned user count badge, and contextual hint banner.
    * **Split Workspace:**
      * **Left (76%): Permission Matrix Grid:** 31 business modules across 10 categories, columns: `Module / Scene`, `All [-]`, `View [-]`, `Create [-]`, `Edit [-]`, `Delete [-]`, `Export [-]`, `Approve [-]`, `Special` (with dropdown menu `N / M ▼` for multiple special capabilities).
      * **Right (24%): Effective Access Preview Panel:** Grouped module summaries and security architecture notes.
    * **Bottom Bar:** `Reset Changes` and `Save Permissions` (PUT `/api/admin/permissions` with optimistic locking `rowVersion`).

### Issue 6: Data Import Studio — Suppliers / HRM Persistence Failure (Root Cause Analysis)
* **Desktop Reference:** `ImportService.java` & `MasterDataService.java` (lines 134–165, 822–842)
* **Symptom:**
  * In Web Data Import Studio, importing a supplier file (e.g. `SUP003`) validated 100% passed in step 4 (`1 checked • 1 passed • 0 failed`), but upon clicking `Execute Import`, the import failed with:
    `Row 1 (SUP003): The ERP server could not complete this operation. Check the server log for the underlying error.`
  * In Desktop, the exact same import succeeded and updated the supplier smoothly.
* **Root Cause Found in `ImportService.js`:**
  * In `executeImport`, for `Suppliers / HRM` and `Customers / CRM` (lines 934–961):
    ```javascript
    const payload = {
      partyCode: code,
      name: getVal(row, 'name'),
      partyType: partyType,
      contactPerson: getVal(row, 'contact_person') || '',
      phone: getVal(row, 'phone') || '',
      email: getVal(row, 'email') || '',
      gstin: getVal(row, 'gstin') || '',
      address: getVal(row, 'address') || '',
      openingBalance: parseFloat(getVal(row, 'opening_balance')) || 0,
      active: isActive
    };
    if (existing) {
      if (mode === 'UPDATE_NON_BLANK') { ... }
      await window.MasterService.updateParty(payload);
    }
    ```
  * In `MasterDataService.java:154`, `updateParty` enforces:
    `PartyEntity e = parties.findById(req(d.id(), "Party id")).orElseThrow(() -> new IllegalArgumentException("Party not found"));`
    `assertVersion(d.rowVersion(), e.getRowVersion(), "Party " + e.getPartyCode());`
  * `payload` in `ImportService.js` **did NOT assign `payload.id = existing.id` or `payload.rowVersion = existing.rowVersion`**!
  * Because `payload.id` was `undefined`, Spring Boot received `d.id() == null`, immediately throwing `IllegalArgumentException: Party id is required`, caught by `ApiExceptionHandler.java` and returned as a generic 500 server error!
  * **Fix:** When `existing` is present, explicitly inject:
    ```javascript
    payload.id = existing.id;
    payload.rowVersion = existing.rowVersion !== undefined ? existing.rowVersion : 0;
    ```
    Also ensure for `Item Master`:
    ```javascript
    payload.id = existing.id;
    payload.rowVersion = existing.rowVersion !== undefined ? existing.rowVersion : 0;
    ```
    And preserve existing fields under `UPDATE_NON_BLANK` policy (`name`, `contactPerson`, `phone`, `email`, `gstin`, `address`, `openingBalance`).

### Issue 7: Universal Application Footer Spacing & Desktop Layout Parity
* **Desktop Reference:** `SharedApplicationFooter.java` & `dark-theme.css` (`.universal-app-footer`, `.universal-footer-trust`, `.universal-footer-company`, `.universal-footer-detail`, `.universal-footer-clock`)
* **Symptom:**
  * In Desktop: Footer height is 38px. Labels have `HBox.setHgrow(label, Priority.ALWAYS);`, distributing all elements across the entire bottom bar with generous space between them:
    `Secure   Local   Reliable` [left] • `🏢 Jasvi Industries` [left-center] • `📞 9099939193` [center] • `✉️ info@jasviindustries.in` [center] • `🔗 jasviindustries.in` [center-right] • `📅 Sunday, 18 Oct 2026 | 10:02 PM | IST` [far right].
  * In Web: Footer height was cramped at 30px, with all 5 company items clumped tightly inside `.footer-left` with small font and minimal gap, leaving an awkward empty void until the clock on the right.
* **Fix:**
  * Upgrade `.app-footer-bar` in `css/app.css` to `height: 38px; min-height: 38px; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; gap: 24px; font-size: 0.78rem;`.
  * Structure footer items into distinct, evenly spaced flex items with icons, subtle vertical divider pipes or generous margins (`gap: 32px` or `flex: 1`), and bold brand styling for `Secure Local Reliable` and `Jasvi Industries` matching Desktop.

### Issue 8: Report Scheduler Tab Data Binding (Empty Table Fix)
* **Desktop Reference:** `ReportScheduleController.java` & `ReportScheduleDtos.java` (lines 66–67)
* **Symptom:**
  * In Web Reports view, Tab 4 (Scheduled Reports) showed "No schedules found. Click '+ New Schedule' to create automated delivery" even though scheduled reports exist in the database.
* **Root Cause Found in `ReportsController.js:1145–1147`:**
  ```javascript
  const res = await window.ApiService.get('/api/reporting/schedules').catch(() => null);
  allSchedules = (res && (res.rows || res.content || res)) || [];
  if (!Array.isArray(allSchedules)) allSchedules = [];
  ```
  * In Spring Boot `ReportScheduleController.java:22`:
    `public ReportScheduleDtos.SchedulePage page() { return service.pageForCurrentUser(); }`
    `public record SchedulePage(List<ScheduleRow> schedules, ScheduleSummary summary) { }`
  * The server returns `{ schedules: [...], summary: { ... } }`!
  * Because `res.rows` and `res.content` are undefined, `allSchedules` became the object `res`.
  * Then `!Array.isArray(allSchedules)` evaluated to `true`, instantly clearing `allSchedules = []`!
* **Fix:**
  * Update `ReportsController.js` to extract `res.schedules`:
    ```javascript
    allSchedules = (res && (res.schedules || res.rows || res.content || (Array.isArray(res) ? res : []))) || [];
    ```
  * And bind `res.summary` to the 4 KPI cards (`rep-sch-kpi-active`, `rep-sch-kpi-next`, `rep-sch-kpi-month`, `rep-sch-kpi-failures`).

---

## 3. UI/UX Architecture & Layout Specifications

### 3.1. User Management Screen (`#view-users`)
1. **Header Area:**
   - Title: `User Access & Permissions`
   - Subtitle: `Manage users, account security and access from one administration workspace`
   - Header Buttons:
     - `Registration Approvals` (green accent `btn-success-soft` with shield icon) -> Navigates to `#view-registration-approvals`.
     - `Manage Roles` (gear icon) -> Navigates to Master Data (`#view-master-data`) with category `ROLE`.
     - `Permission Matrix` (purple button with key icon) -> Navigates to `#view-permission-matrix`.
     - `+ Add New User` (signature purple `btn-purple`) -> Opens `#modal-user-dialog` in Add mode.
2. **5 KPI Cards Strip:**
   - Card 1: `Total Users` (Value: `lblTotal`, Pill: `Accounts`, border/glow: purple).
   - Card 2: `Active Users` (Value: `lblActive`, Pill: `Active`, border/glow: green).
   - Card 3: `Roles` (Value: `lblRoles`, Pill: `Access`, border/glow: blue/cyan).
   - Card 4: `Locked Accounts` (Value: `lblLocked`, Pill: `Security`, border/glow: red).
   - Card 5: `Login Activity` (Value: `lblLogins`, Pill: `Today`, border/glow: yellow).
3. **Filter Strip Toolbar:**
   - `cmbRole`: "All Roles" (populated dynamically from server roles).
   - `cmbStatus`: "All Statuses" (`All Statuses`, `Active`, `Inactive`, `Locked`).
   - `cmbBranch`: "All Branches" (populated dynamically from unique user branches).
   - `Refresh` button.
4. **10-Column Desktop Table:**
   - `User`: User avatar + Full name.
   - `Email / Username`: Email address on top, `@username` in monospace subtext.
   - `Role`: Role badge (e.g. `Admin`, `Sales`, `Manager`).
   - `Department`: Department name or `—`.
   - `Access`: `FULL ACCESS`, `STANDARD`, `LIMITED ACCESS`, or `READ ONLY`.
   - `Branch`: Branch name or `—`.
   - `Status`: Semantic badge (`Active`, `Inactive`, `Locked`).
   - `Last Login`: Formatted timestamp (e.g. `18 Oct 2026 09:20 PM`) or `Never`.
   - `MFA`: `Enabled` (green badge + check) or `—` (phone icon).
   - `Actions`: Signature purple `Actions ▼` menu button (`class="btn-purple"`).
5. **Actions Dropdown Items:**
   - `View User`, `Edit User`, `Reset Password`, `Reset Authenticator`, `Lock/Unlock Account`, `View Role Permissions`, `Delete User`.
6. **Bottom Action Bar:**
   - `Edit Selected`, `Reset Password`, `+ Add New User`.

### 3.2. Unified User Account Dialog (`#modal-user-dialog`)
1. **Dynamic Add vs. Edit Semantics:**
   - **Add User:**
     - Modal Title: `Add New User`
     - Subtitle: `Create a new ERP user account with role permissions and branch assignment`
     - Submit Button: `Create User`
     - Passwords: **Mandatory** (`Password *` and `Confirm Password *`), validated client-side (min 8 chars, letter + number) and required by backend.
   - **Edit User:**
     - Modal Title: `Edit User Account`
     - Subtitle: `Update profile, role permissions, branch assignments, and security settings`
     - Submit Button: `Update User`
     - Passwords: **Optional** (`"Leave blank to keep current password"`). If empty, `password = null` is sent. If entered, confirms and validates.
2. **Three Structured Sections:**
   - **Section 1: Identity & Access:**
     - Full Name, Username, Email, Phone, Role (dynamic from `GET /api/admin/roles`), Department, Branch.
   - **Section 2: Credentials & Security:**
     - Password, Confirm Password, hint text.
   - **Section 3: Account & Authentication:**
     - Checkboxes: `Active`, `Locked`, `Require MFA`.
     - MFA Policy indicator: `Admin Controlled` / `Required for non-Admin`.
     - Authenticator status: `Active — Authenticator Enrolled` / `Enrollment required`.
     - `Reset Authenticator` action button.

### 3.3. Dedicated Registration Approvals View (`#view-registration-approvals`)
1. Top bar: `"Back to User Access"` link + Title + `Refresh` button.
2. 2 KPI Cards: `Pending Approval` (amber) and `Identity + MFA Verified` (green).
3. Approvals Queue Table: `User`, `Email`, `Requested Role`, `Email Verified`, `Authenticator Verified`, `Requested At`, `Status`.
4. Bottom Approval Strip:
   - `Assign final role` dropdown (loaded dynamically from active non-admin roles).
   - Red `Reject` button (prompts for rejection reason).
   - Signature purple `Approve User` button.

### 3.4. Permission Matrix Workspace (`#view-permission-matrix`)
1. **Top Control Strip:**
   - Role dropdown (from `GET /api/admin/roles`).
   - Permission Template dropdown (`Read Only`, `Sales Standard`, `Manager Standard`, `Business Full Access`) + `Apply Template` button.
   - Copy From Role dropdown + `Copy` button.
   - Search module or permission filter.
   - `Show granted only` checkbox.
   - Badges: `X of Y granted`, `N users use this role`.
   - Contextual hint banner reflecting role policies.
2. **Left Panel (76%): Permission Matrix Grid:**
   - 31 business modules across 10 categories (`Dashboard & Insights`, `Sales`, `Purchase`, `Inventory`, `Finance & Banking`, `Finance & Compliance`, `Masters`, `Reports`, `Document Studio`, `Administration`).
   - Columns: `Module / Scene`, `All [-]`, `View [-]`, `Create [-]`, `Edit [-]`, `Delete [-]`, `Export [-]`, `Approve [-]`, `Special`.
   - Special column: renders `—` when not applicable, a single checkbox when 1 exists, or a compact `N / M ▼` dropdown menu for multiple.
3. **Right Panel (24%): Effective Access Preview Panel:**
   - Category-wise summaries with count badges.
   - Security architecture note: `"LOCAL + COMPANY SERVER - The same server-owned role matrix is used in both deployment modes..."`.
4. **Bottom Bar:**
   - Left: `Reset Changes` (discards modifications and reloads role permissions).
   - Right: Purple `Save Permissions` button (sends `PUT /api/admin/permissions` with optimistic locking `rowVersion`).

### 3.5. Universal Application Footer (`.app-footer-bar`)
- Height: 38px (expanded from 30px).
- Layout: Full width, evenly spaced flex items with distinct icons and generous padding:
  - Item 1: `Secure   Local   Reliable` (bold, green pulse indicator).
  - Item 2: `🏢 Jasvi Industries` (bold company name).
  - Item 3: `📞 9099939193` (phone).
  - Item 4: `✉️ info@jasviindustries.in` (email).
  - Item 5: `🔗 https://jasviindustries.in` (website link).
  - Item 6: `📅 Sunday, 18 Oct 2026 | 10:02 PM | IST` (live clock).

---

## 4. API Endpoints & REST Contracts

| Endpoint | Method | Payload / Query | Description |
|---|---|---|---|
| `/api/admin/users` | `GET` | — | Retrieves all users with roles, branches, MFA status |
| `/api/admin/users` | `POST` | `AdminDtos.UserCreateRequest` | Creates new user (password mandatory) |
| `/api/admin/users/{id}` | `PUT` | `AdminDtos.UserUpdateRequest` | Updates user (password optional) |
| `/api/admin/users/{id}` | `DELETE` | `?rowVersion={v}` | Deletes user with optimistic check |
| `/api/admin/roles` | `GET` | — | Retrieves all configured roles and user counts |
| `/api/admin/permissions/set` | `GET` | `?role={roleCode}` | Retrieves full permission set and `rowVersion` |
| `/api/admin/permissions` | `PUT` | `AdminDtos.PermissionSaveRequest` | Commits role permission changes with optimistic locking |
| `/api/admin/registrations` | `GET` | `?status=PENDING_ADMIN_APPROVAL` | Retrieves pending self-registered users |
| `/api/admin/registrations/{id}/approve` | `POST` | `{ "role": "...", "rowVersion": 1 }` | Approves self-registration with assigned role |
| `/api/admin/registrations/{id}/reject` | `POST` | `{ "reason": "...", "rowVersion": 1 }` | Rejects self-registration with reason |
| `/api/master/parties` | `POST` | `MasterDtos.PartyDto` | Creates supplier/customer |
| `/api/master/parties` | `PUT` | `MasterDtos.PartyDto` (must include `id`, `rowVersion`) | Updates supplier/customer |
| `/api/reporting/schedules` | `GET` | — | Retrieves `{ schedules: [...], summary: {...} }` |

---

## 5. Scope & Fixed Part for Release 10.0.34.16

### Included in Fixed Scope:
1. **User Access Table:** 10-column desktop format, filter toolbar strip, bottom action strip, purple `Actions ▼` dropdown menu.
2. **Unified User Dialog:** `#modal-user-dialog` with 3 sections, dynamic role lookups from `/api/admin/roles`, mandatory password on Add, optional password on Edit.
3. **Dedicated Registration Approvals:** `#view-registration-approvals` full-screen page with 2 KPI cards, queue table, dynamic role approval dropdown, and reject with reason.
4. **Manage Roles Redirection:** Delegated directly to Master Data (`#view-master-data`, category `ROLE`).
5. **Permission Matrix:** Full-screen `#view-permission-matrix` workspace with 31 modules across 10 categories, common actions, special actions (`N / M ▼`), 4 templates, copy role, effective access preview, and save.
6. **Data Import Studio Fix:** Supplier and Customer imports in `ImportService.js` now supply `payload.id = existing.id` and `payload.rowVersion = existing.rowVersion` on update, preventing 500 error on UPSERT. Item Master update also includes `id` and `rowVersion`.
7. **Footer Spacing & Desktop Layout Parity:** `.app-footer-bar` height upgraded to 38px, with items spaced out across the footer width with generous gaps and bold company trust badges.
8. **Report Scheduler Tab Fix:** `ReportsController.js` correctly accesses `res.schedules` and `res.summary`, populating scheduled reports and KPI cards.

---

## 6. Verification Checklist & Quality Gates

- [ ] **Table Headers:** All 10 columns (`User`, `Email / Username`, `Role`, `Department`, `Access`, `Branch`, `Status`, `Last Login`, `MFA`, `Actions`) match desktop.
- [ ] **Row Action Menu:** Purple `Actions ▼` button opens dropdown containing View User, Edit User, Reset Password, Reset Authenticator, Lock Account, View Role Permissions, and Delete User.
- [ ] **Role Lookups:** Both User Dialog and Registration Approvals load active roles exclusively from `GET /api/admin/roles` with zero mock data.
- [ ] **User Dialog Semantics:** Add User requires password; Edit User treats password as optional (`"Leave blank to keep current password"`).
- [ ] **Registration Approvals:** Opens as a dedicated full screen with 2 KPIs, full table, role assignment dropdown, Reject, and Approve actions.
- [ ] **Manage Roles Delegation:** Clicking `Manage Roles` redirects to Master Data (`#view-master-data`) with the `ROLE` category active.
- [ ] **Permission Matrix:** Renders 31 modules grouped by category; supports `Read Only`, `Sales Standard`, `Manager Standard`, `Business Full Access` templates; allows role copying; displays special permission dropdowns (`N / M ▼`); updates effective preview panel in real time.
- [ ] **Data Import Persistence:** Suppliers / HRM import successfully updates existing records with `id` and `rowVersion`, without throwing 500 error.
- [ ] **Footer Spacing:** Footer items have ample spaces, icons, and 38px height matching desktop.
- [ ] **Report Scheduler Data:** Scheduled reports table renders rows from `res.schedules`, and KPI cards populate from `res.summary`.
- [ ] **Clean Syntax & Zero Errors:** Verified via automated headless Chrome DOM evaluation.
