# MANDATORY PRE-DEVELOPMENT PROTOCOL: DESKTOP APPLICATION FIRST-PRINCIPLE INSPECTION

> **CRITICAL ENFORCEMENT FOR ANTIGRAVITY AGENT**:
> You MUST read this protocol and execute all verification steps **FIRST** before touching any code or responding to any feature request.
> The user will NOT remind you to check this note. By default, you must execute this protocol automatically for EVERY request.
> UI should be alway attractive, 3d, all table header should be colourful and meaninging full icon based on values.. lets whats should have whatsapp icon, email should have email icon etc
> user always centerlized functionlaity which we have in desktop app in web app same like this.. we dont want any differecne between desktop and web app
>
> ⚠️ **STRICT WORKSPACE CONSTRAINTS**:
> 1. `D:\JavaProject\DSE-ERP-Final` is strictly the user's personal Desktop IntelliJ copy — **NEVER TOUCH OR MODIFY IT** for any web application build or sync.
> 2. **Direct UAT Testing Policy:** No local database is hosted for web testing. All website testing is deployed directly to **UAT** (`https://erp-uat.jasviindustries.in/admin/`) via GitHub Actions.

---

## 1. Core Mandate: Full Application Parity — Never Build Superficial UI

When building, modifying, or extending ANY feature on the Web Application (`d:\ERP Website\admin`, `D:\GitHub\DSE-ERP-Enterprise\web\admin`, `D:\GitHub\ReleaseSource Website\admin`):

1. **NEVER focus only on UI visuals or surface-level aesthetics.**
2. **NEVER build just the literal words mentioned in the prompt.**
   - If the user mentions one screen or field (e.g., "Sale"), you must audit and implement the complete end-to-end desktop workflow: bootstrap data, master lookups, auto-calculations, secondary dialogs, action menus, side drawers, keyboard shortcuts, print/export actions, and backend persistence.
3. **NEVER use mock data, dummy values, or placeholder inputs** when a real backend API, database lookup, or calculation engine exists in the desktop codebase.
4. **Desktop Reference Path**:
   `C:\Users\JATIN DHAMELIYA\Downloads\DSE-ERP-10.0.25-INTELLIJ-READY-FINAL-V19\DSE-ERP-10.0.25`

---

## 2. Mandatory 7-Point Desktop Inspection Checklist (Must Check Before Coding)

For every single feature or screen request, you MUST inspect and mirror all 7 dimensions from the desktop codebase:

### Point 1: Front-End & User Interface Structure
- Locate the desktop FXML/Controller files in `src/main/java/com/dse/erp/desktop/controllers/` and `src/main/resources/fxml/`.
- Verify exact layouts: tables, columns (headers, widths, alignments), summary cards, badges, chips, action buttons, side drawers, modal dialogs, and tabs.

### Point 2: Default Screen Open & Initialization Logic
- What happens immediately when the user navigates to the screen?
- **Bootstrap APIs**: What master endpoints are called on load? (e.g. `GET /api/master/sales-entry-bootstrap` for payment terms, GST types, transporters, charge types, customer lists).
- **Default Parameters**: Initial date filters (e.g. `ALL`, `TODAY`, `THIS_FY`), default status filters, sequence/document number generation, and default focus field.

### Point 3: Dynamic Logic & Calculation Engines
- Inspect calculation engines (e.g. `DocumentCalculationEngine.java` in `shared` or `desktop`).
- Verify exact formulas:
  - Item Taxable = `Quantity * Rate * (1 - Discount% / 100)`
  - Charges Taxable & Non-taxable handling
  - GST Splitting: If Intra-state (`GST`) -> `CGST = Round(Tax/2)`, `SGST = Tax - CGST`. If Inter-state (`IGST`) -> `IGST = Tax`, `CGST = 0`, `SGST = 0`.
  - Rounding Rules: Exact decimal places (2 decimals for currency, 3 for quantity) and rounding mode (`RoundingMode.HALF_UP`).
  - Grand Total = `Item Taxable + Line Tax + Charges Amount + Charges Tax`.

### Point 4: All API Endpoints, Payloads & DTO Contracts
- Inspect Spring Boot `@RestController` in `src/main/java/com/dse/erp/api/controllers/`.
- Inspect Request/Response DTOs in `src/main/java/com/dse/erp/api/dto/`.
- Ensure exact URL paths, HTTP methods (`GET`, `POST`, `PUT`, `DELETE`), query parameters, and JSON payload keys match 100%.

### Point 5: Database Schema & Master Data Models
- Inspect entities and repositories (`LookupMaster`, `PartyMaster`, `ItemMaster`, `DocumentHeader`, `DocumentLine`, `DocumentCharge`).
- Verify dropdown source categories (e.g., `LookupCategory`: `TRANSPORTER`, `CHARGE_TYPE`, `PAYMENT_TERMS`, `UNIT`).
- Ensure foreign keys, required constraints, and data types match database schema (`55432`).

### Point 6: UI Behaviors for Every Single Event
- **`onChange` / `onInput`**:
  - Selecting Customer -> auto-fills Billing Address, Shipping Address, GSTIN, State Code, default Payment Terms, Credit Limit.
  - Selecting Transporter -> auto-fills Transporter GSTIN.
  - Changing Item -> auto-fills HSN/SAC, Unit, Sell Rate, Tax Rate.
  - Changing GST Type -> triggers live recalculation of GST split.
- **Dialogs & Secondary Popups**:
  - Additional Charges popup (`DocumentChargeDialog.java` parity) with charge type selection, tax treatments, and dynamic totals.
  - Action Drawer (12+ actions: View, Audit, Edit, Duplicate, Print Tax Invoice, Excel, Email, WhatsApp, Record Payment, Return, Cancel, Delete).
- **Navigation & Layout Interaction**:
  - Sidebar collapse (to 68px) smoothly expands main stage; clicking menu items when collapsed auto-uncollapses sidebar and opens accordion group.

### Point 7: Full End-to-End Functional Completeness
- Do not deliver half-finished features. Verify that:
  - Saving creates a real document in the database via the API.
  - Errors and validations match desktop error messages word-for-word.
  - Refresh buttons reload real data from the server.
  - Export (Excel, PDF, Print) calls real backend endpoints or generates identical formats.

---

## 3. Workflow Rule: Pre-Flight Proof & Execution Order

Whenever processing a user request:
1. **Search & Read First**: Locate and inspect the relevant desktop Java files (`*Controller.java`, `*Dialog.java`, `*Service.java`, `*Api*.java`).
2. **Map the Full Architecture**: Formulate the plan covering Front-End + UI Events + Dynamic Math + Master Endpoints + DTO Contracts.
3. **Implement Comprehensively**: Update models, services, controllers, HTML, and CSS in `d:\ERP Website\admin`.
4. **Mirror & Stage**: Sync changes to `D:\GitHub\ReleaseSource Website\admin` and `D:\GitHub\DSE-ERP-Enterprise\web\admin`.
5. **Commit, Push & Deploy**: Push to `main` branch to trigger GitHub Actions deployment.
6. **Live Verification**: Verify the deployed UAT application (`https://erp-uat.jasviindustries.in/admin/`) with actual HTTP/API checks or browser verification before reporting back.

---

## 4. Web Application Release, Versioning & Cache Invalidation Protocol

To ensure seamless deployment, avoid client-side caching bugs, and maintain 100% transparency between Desktop and Web releases, the following rules are strictly enforced:

### Rule 1: Desktop-Driven Web Versioning Contract
The Web Application version MUST ALWAYS be derived from the Desktop ERP release revision:
$$\mathbf{\text{Web Version}} = \langle\text{DesktopMajor}\rangle.\langle\text{DesktopMinor}\rangle.\langle\text{DesktopPatch}\rangle.\langle\text{WebBuild: 2 digits}\rangle$$

- **Within Same Desktop Baseline:** As long as Desktop remains at `10.0.33`, Web releases increment sequentially: `10.0.33.01`, `10.0.33.02`, ... `10.0.33.12`, `10.0.33.13`, etc.
- **When Desktop Advances:** When Desktop moves to `10.0.34`, the Web build counter resets: `10.0.34.01`, `10.0.34.02`, etc.
- **Git Tag Convention:** Every Web release tag in GitHub MUST be prefixed with `web-v`:
  - Format: `web-v10.0.33.12`

### Rule 2: Single Source of Truth
Never hardcode versions in random files. The version is governed by:
1. **`web/admin/version.json`**: Canonical JSON containing `desktopVersion`, `webBuild`, `webVersion`, `tag`, `releaseDate`, `environment`, and release highlights.
2. **`web/admin/js/version.js`**: Synchronously exposes `window.DSE_VERSION` on page load.

### Rule 3: Dynamic UI Version Binding (Zero Hardcoded Strings)
- **Login Screen:** Dynamically displays both `#auth-app-version-badge` (`Version 10.0.33.12`) and `#auth-desktop-baseline` (`Desktop Baseline: v10.0.33`).
- **Application Shell:** Dynamically displays `#header-app-version-badge` (`v10.0.33.12`) in the top navigation bar and `#menu-version-footer` (`Web Studio v10.0.33.12 • Desktop v10.0.33`) inside the user profile dropdown.

### Rule 4: Mandatory Cache Invalidation (`?v=...`)
- **NEVER deploy code changes without bumping the version string in `index.html`.**
- Browsers aggressively cache `.js` and `.css` files by URL. If `?v=...` is not incremented on all 54 script and stylesheet tags, browsers will execute old cached JavaScript against new HTML markup, leading to broken button handlers, missing functions, and unstyled modals.

### Rule 5: One-Command Release Automation Tool
Always use the standardized release script to perform version bumps, cache-buster updates, git tagging, and GitHub release creation in a single atomic step:

```powershell
# Auto-increments web build (or resets if desktop bumped), updates index.html, commits, tags, pushes, and publishes GitHub Release:
.\scripts\bump-web-version.ps1 -Note "Parity fixes & enhancements" -Release
```

Or via Python:
```bash
python scripts/bump-web-version.py --note "Parity fixes & enhancements" --release
```

To specify or override the desktop baseline during a desktop upgrade:
```powershell
.\scripts\bump-web-version.ps1 -Desktop "10.0.34" -Note "Transition to Desktop 10.0.34" -Release
```
