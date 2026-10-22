# DSE ERP Web Admin Studio: Master Memory & Architectural Truth Registry

**Permanent Context Memory for Antigravity Agent**  
**Workspace:** `d:\ERP Website\admin`  
**Governing Rules:** `prinical.md` & `MANDATORY_DEVELOPMENT_PROTOCOL.md`  
**Desktop Baseline Source:** `C:\Users\JATIN DHAMELIYA\Downloads\DSE-ERP-10.0.25-INTELLIJ-READY-FINAL-V19\DSE-ERP-10.0.25`

---

## 1. Full Chronological Record of All User Concerns & Discussion History

### Phase A: Initial Refresh Inconsistencies & Visual Defects
1. **Brand Name Flash / Corruption:**
   - Header company name displayed `JASVI INDUSTRIES` before switching to `JASVI CREATION` (or vice versa).
   - In subsequent builds, brand name became doubled: `"JASVI CREATIONJASVI CREATION"`.
2. **Top 4 Shell Badges (Reminders, Notifications, Email, WhatsApp):**
   - Showed bright red/cyan `(0)` badges on page load instead of starting hidden per desktop `applyBadge(count > 0)` parity.
3. **Top 6 KPI Cards Distortion:**
   - Displayed in a squished, overlapping 3-row layout before snapping into the 58px compact ribbon.
   - Character encoding corruption showed `â,¹` instead of Indian Rupee `₹`.
4. **Header Live Clock & Date Flash:**
   - Flashed hardcoded dummy placeholder `12:00:00 PM` before jumping to system time.
   - In subsequent builds, started blank with pulsing dot for 500ms before clock text appeared.
5. **Universal Footer Stale Data Flash:**
   - Flashed hardcoded text (`Jasvi Industries`, `Sunday, 18 Oct 2026`) before settings loaded.
6. **Sub-Route Navigation Lockout:**
   - Navigating between screens (e.g., clicking Sales Register from Dashboard) updated header titles and tabs, but the screen stayed pinned to Dashboard until the user hit F5/Refresh.
   - Root cause: `<head>` injected an early style with `!important` that completely blocked `selectNav()` from displaying other views.

### Phase B: Cross-Screen Layout Shifts (The Masters Screen Proof)
* When refreshing on `#masters` (Masters/Lookups screen):
  - **Before JS Finishes (Frame 0):** KPI cards are squished and overlapping (`CATEGORIES Groups 0`, `Active LOOKUP VALUES Active 0`), category rail is an empty floating box in the middle, lookup table shows `Loading master lookups... Showing 0 entries`, and clock is empty.
  - **After JS Runs (500ms later):** Category rail populates (`BANK`, `BRAND`, `CATEGORY`), table populates (`BRD001`, `BRD002`), and KPI ribbon abruptly snaps into a completely different 58px ribbon format.
  - **Core Realization:** This visual shift occurs on **all 42 screens** because the static HTML contains unenhanced markup, and runtime JavaScript destroys and rewrites the DOM half a second after the page loads.

### Phase C: Structural & Security Discoveries
1. **The 17,587-Line Monolithic `index.html`:**
   - All 42 modules are dumped into a single 1.1 MB `index.html` file.
   - 10,000+ dormant DOM nodes are parsed on every single page load.
2. **Critical Security & Auto-Login Vulnerability:**
   - Tokens in `localStorage` never expire (zero TTL, zero timeout).
   - Anyone opening the URL in an existing browser profile automatically enters the system without authentication.
   - `AuthService.getCurrentUser()` contains a hardcoded fallback:
     `return { username: 'admin', fullName: 'Shailesh Dhameliya', role: 'ADMIN' };`
     If user info is missing or corrupted, the system **defaults to giving Admin privileges**!
   - There is no pre-flight token validation (`/api/auth/validate`) against the backend before unlocking the ERP stage.

---

## 2. Core Architectural Pillar: 1 Screen = 1 Dedicated .html Page (Desktop FXML Parity)

> **MANDATORY CONTRACT**: 
> In the Desktop ERP, every single screen is an isolated, independent `.fxml` file (`DashboardHome.fxml`, `SalesRegister.fxml`, `PurchaseRegister.fxml`, `Masterdata.fxml`, etc.).
> **In the Web Admin application, EVERY SCREEN MUST HAVE ITS OWN SEPARATE `.html` FILE.**
> No screen should be hardcoded or dumped into `index.html`.

### The Modular Screen Architecture:
* `index.html` ($\sim$350 lines): Houses ONLY the outer application shell:
  - Top Application Header (Branding, Live Clock, Profile, Search)
  - Sidebar Navigation Drawer (Collapsible)
  - Workspace Tab Bar
  - Universal Footer Bar
  - Empty Central Stage: `<main id="main-content-stage"></main>`
* `views/*.html` (Dedicated HTML file for EACH of the 42 screens):
  - `views/dashboard.html` $\rightarrow$ Only Dashboard markup & KPI ribbon
  - `views/sales-register.html` $\rightarrow$ Only Sales Register table, filters, drawer
  - `views/sale-create.html` $\rightarrow$ Only Sale Invoice creation form
  - `views/purchase-register.html` $\rightarrow$ Only Purchase Register table & filters
  - `views/purchase-creation.html` $\rightarrow$ Only Purchase Invoice creation form
  - `views/item-master.html` $\rightarrow$ Only Item Master catalog & table
  - `views/masters.html` $\rightarrow$ Only Lookup Categories rail & table (Image 1 fix)
  - `views/bank-entry.html` $\rightarrow$ Only Bank Receipt & Payment vouchers
  - `views/expense-entry.html` $\rightarrow$ Only Expense Vouchers
  - `views/bank-statement.html` $\rightarrow$ Only Bank Statement reconciliation
  - ... (All 42 individual screens completely separated)

### Why This Completely Eliminates Refresh Jumping & Cross-Screen Bugs:
1. **Zero Layout Interference:** Masters CSS/HTML cannot affect Sales Register. Dashboard cannot bleed into Bank Entry.
2. **Instant Frame 0 Load:** The browser loads only the requested screen ($\sim$20 KB) instead of parsing 1.1 MB and 10,000 DOM nodes.
3. **Identical Before & After Refresh:** When refreshing `#masters`, the browser loads `views/masters.html` directly in its final, native layout. Nothing jumps or snaps.
4. **Isolated Maintenance:** Modifying one screen will NEVER cause a regression in another screen.

---

## 3. Complete Inventory of Systemic Defects

### Category 1: Security & Session Integrity
| Defect ID | Description | Location in Code | Required End-State |
|---|---|---|---|
| **SEC-01** | Hardcoded Admin Fallback | `js/services/AuthService.js:L21` | Delete Admin fallback. Return `null` when no valid session exists. |
| **SEC-02** | Indefinite Token Persistence | `localStorage['dse_access_token']` | Implement session TTL (timestamp). Expire tokens after business timeout. |
| **SEC-03** | Missing Pre-Flight Validation | `js/app.js` boot lifecycle | Verify token with `/api/auth/me` on launch. If invalid, wipe storage and show Login. |
| **SEC-04** | Auth Stage Leak | `index.html` / `#auth-overlay` | When unauthenticated, `#app-container` must be completely suppressed and unrendered. |

### Category 2: Visual Parity & Refresh Stability (All 42 Screens)
| Defect ID | Description | Location in Code | Required End-State |
|---|---|---|---|
| **VIS-01** | Dual Layout Engines (Static vs JS Rebuild) | `js/util/KpiCardEnhancer.js` & `index.html` | All 42 screens must pre-render the exact 58px compact ribbon natively in HTML/CSS. `KpiCardEnhancer` must NEVER wipe `innerHTML`. |
| **VIS-02** | Screen Shifting & Collapsing Boxes | All 42 `module-view` containers | Layout widths, heights, and panel grids must be fixed in CSS so nothing moves while API data loads. |
| **VIS-03** | Currency Character Encoding | `index.html` snapshot restore | Standardize on Unicode escape sequence `\u20B9 ` across all files. Zero `â,¹` artifacts. |
| **VIS-04** | Table & List Jumping | All module tables (Masters, Sales, Purchases) | Pre-aligned skeleton placeholder rows must hold space while data fetches. |
| **VIS-05** | Header Clock & Badge Sync | `index.html` header markup | Header clock must display immediately synchronously; badges must start hidden (`display: none;`) matching `applyBadge(count > 0)`. |
| **VIS-06** | Header Brand Duplication | `index.html` head script | Eliminate all `::before` pseudo-element text injection. Brand name binds strictly through a single DOM `textContent`. |

### Category 3: Navigation & Routing Integrity
| Defect ID | Description | Location in Code | Required End-State |
|---|---|---|---|
| **NAV-01** | CSS `!important` Route Lockouts | `NavigationRouter.js` & early-route style | Early pre-paint styles must be cleanly removed on router boot. Active view toggled via `.module-view.active`. |
| **NAV-02** | Post-Login Route Discard | `js/app.js:handlePostLoginSuccess` | Respect `window.location.hash` on login so bookmarked sub-routes (e.g. `#settings`) are preserved. |
| **NAV-03** | Startup Overload (5 Sequential Preloads) | `js/app.js:App.init` | Demand-driven loading: only call lifecycle for active view (`NavigationRouter.getCurrentView()`). |
| **NAV-04** | Workspace Tabs Synchronization | `index.html` & `NavigationRouter.js` | Active tab must render synchronously with correct title, icon, and close button. |

### Category 4: Monolithic Architecture & Maintainability
| Defect ID | Description | Location in Code | Required End-State |
|---|---|---|---|
| **ARCH-01** | 17,587-Line Monolithic `index.html` | `d:\ERP Website\admin\index.html` | Long-term: Extract screens into modular view partials (`views/*.html`) loaded on demand via `ViewLoader.js`. |
| **ARCH-02** | Version Registry Everywhere | `version.json`, `js/version.js`, `index.html` | Every release must update all registries, all cache-busters, and create the corresponding `.md` spec file per `prinical.md` Rule 2 & 4. |

---

## 3. The 42 Registered Module Views in Memory

1. `view-dashboard` (Dashboard Home)
2. `view-global-search` (Cross-Module Search)
3. `view-sales-register` (Sales Register)
4. `view-sale-create` (Sale Invoice Editor)
5. `view-sales-returns` (Sales Return)
6. `view-credit-notes` (Credit Notes)
7. `view-quotations` (Quotations Register)
8. `view-quotation-editor` (Quotation Editor)
9. `view-purchase-register` (Purchase Register)
10. `view-purchase-creation` (Purchase Invoice Editor)
11. `view-purchase-returns` (Purchase Return)
12. `view-record-payment` (Invoice Payment)
13. `view-debit-notes` (Debit Notes)
14. `view-item-master` (Item Master)
15. `view-masters` (Master Data / Lookups)
16. `view-bank-entry` (Bank Entry Vouchers)
17. `view-expense-entry` (Expense Entry)
18. `view-bank-statement` (Bank Statement Recon)
19. `view-purchase-recon` (Purchase GSTR-2B Recon)
20. `view-recon-supplier` (Supplier Reconciliation)
21. `view-general-ledger` (General Ledger)
22. `view-financial-statements` (Balance Sheet / P&L)
23. `view-aging-analysis` (Debtor / Creditor Aging)
24. `view-gst-compliance` (GST Compliance & E-Way)
25. `view-eway-bill` (E-Way Bill & E-Invoice)
26. `view-automation` (Automation Rules & Triggers)
27. `view-import` (Data Ingestion)
28. `view-inventory` (Inventory Ledger)
29. `view-barcode` (Barcode Studio)
30. `view-customers` (CRM / Customers)
31. `view-customer-360` (Customer 360 View)
32. `view-suppliers` (HRM / Suppliers)
33. `view-supplier-360` (Supplier 360 View)
34. `view-reports` (Reports & BI)
35. `view-reminders` (Reminder Center)
36. `view-users` (User Access Management)
37. `view-registration-approvals` (User Registration Approvals)
38. `view-permission-matrix` (RBAC Permission Matrix)
39. `view-audit` (Global Audit Trail)
40. `view-communication` (Email & WhatsApp Center)
41. `view-profile` (User Profile)
42. `view-settings` (Settings Studio & Sub-modules)

---

## 4. Governing Principles from `prinical.md` (Strict Non-Negotiable Contract)

1. **Rule 1:** Investigate desktop first end-to-end functionality wise before any build.
2. **Rule 2:** Never use dummy or mock data. Desktop build data only. Create the next version `.md` file before any build, and wait for user approval.
3. **Rule 3:** Push release to GitHub and don't monitor if it failed; user will inform.
4. **Rule 4:** Always update the version in `index.html` so user knows which version is under test.
5. **Rule 5:** Use only antigravity copy for testing.
6. **Rule 6:** Consistent UI across all screens (colors, headings, fonts, padding, buttons, tables, cards in light/dark mode).
7. **Rule 7:** Ask questions if confused. Never assume anything. Never work infinitely on random functionality.
8. **Rule 8:** Check that updates are reflected in the build before reporting.
9. **Rule 9:** When asked to build, reflect immediately in the build before reporting.
10. **Rule 10:** Check full page and dependencies end-to-end before reporting.
11. **Rule 11:** Date format standard across all tables, forms, and datepickers.
12. **Rule 12:** Hard rule: If you don't know or don't understand, ask. Never assume anything.
13. **Rule 13:** Follow coding standards and best practices strictly.
14. **Rule 14:** Follow `rules/dse-erp-environment.md` for desktop release sync.
