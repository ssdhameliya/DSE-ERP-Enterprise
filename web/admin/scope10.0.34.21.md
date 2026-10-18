# Scope & Technical Specification: Enterprise Dual Release
## Desktop v10.0.35 & Web v10.0.35.01
**Centralized Database Asset Architecture, 8-Loader Data Import Parity, Reporting Dashboard & Scheduler Desktop Parity, Dynamic Report Filters & Cross-Platform Favorites Sync, Address Interlocking & Fast Item Search Cleanup**

- **Phase 1 Release Target:** Desktop `10.0.35` (Repository: `ssdhameliya/DSE-ERP`, branch: `release-10.0.35`, tag: `v10.0.35`)
- **Phase 2 Release Target:** Web `web-v10.0.35.01` (Repository: `ssdhameliya/DSE-ERP-Enterprise`, branch: `main`, tag: `web-v10.0.35.01`)
- **Date:** 2026-10-19  
- **Status:** Approved Scope — Execution Sequence Initialized  
- **Protected Repositories:** User's IntelliJ Copy (`D:\JavaProject\DSE-ERP-Final`) and Production Data (`D:\DSE Production`) remain protected and untouched until explicit local test approval.

---

## 1. Executive Summary & Root Cause Matrix

A comprehensive side-by-side architectural audit was conducted between Desktop (`10.0.34` / `10.0.25`) and Web (`admin/`). Eleven discrepancies and blocking defects were identified:

| # | Feature / Area | Desktop Baseline (`10.0.34`) | Web Current State (`10.0.34.20`) | Root Cause Analysis |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Data Import Studio (All 8 Loaders)** | Ingests new records cleanly via individual REST endpoints (`POST /api/master/items`, `POST /api/master/parties`, etc.) sending full DTOs with `id: null` and primitive defaults (`rowVersion: 0L`). | Throws `Row 1 (ITM003): The ERP server could not complete this operation. Check the server log for the underlying error.` across all 8 loaders when importing new items/parties/transactions. | Java 17+ record DTOs (`ItemDto`, `PartyDto`, `SaleDto`, `PurchaseDto`, `LookupDto`) contain non-null primitive fields (`long rowVersion`, `double discountAmount`, `boolean sameAsBilling`, etc.). `ImportService.js` payloads omitted these fields for new records. Jackson failed to deserialize `null`/missing into primitive types (`MismatchedInputException`), hitting generic 500 handler in `ApiExceptionHandler.java`. In addition, Item Master called `bulkSaveItems` (`POST /api/master/items/bulk`) instead of Desktop's `POST /api/master/items` / `PUT /api/master/items`. |
| **2** | **Reporting KPI Cards (Tab 1 & Tab 4)** | Horizontal `HBox` cards (`min-height: 82px; border-radius: 13px`) with a 34x34px rounded colored icon badge on the left, top title + right-aligned trend pill, bold 16px metric value, and 9.5px clickable action note (`View Sales Register →`). | Plain vertical boxes with text only; no icon badges; inconsistent margins and styling that do not look like Desktop. | `index.html` (lines 6347-6395, 6717-6750) used simple flex column cards without the `standard-kpi-icon` element or desktop layout tokens. |
| **3** | **Saved Reports (Tab 3) 2-Way Workflow** | Report Center opens Report Viewer; user configures filters, preset, grouping, sorting, columns and clicks "Save Report". Desktop encodes the configuration and calls `POST /api/support/saved-views` (`screen="REPORT_CENTER"`). Tab 3 loads from `GET /api/support/saved-views?screen=REPORT_CENTER`, shows complete table, and "Open Report" restores all filters. | Clicking "Save Report" in Web displayed a fake toast message (`saveCurrentReportConfig()`) without persisting to the server. Tab 3 table was disconnected from server storage. | `ReportsController.js` had a dummy placeholder function for saving, never calling `/api/support/saved-views` or loading persisted views from the backend. |
| **4** | **Scheduled Reports (Tab 4) Saved Report Dropdown** | "New Schedule" modal dropdown lists saved reports with name and report title (e.g. `Monthly Sales Summary (Sales Register)`). | Dropdown displays `<option value="undefined">undefined</option>`. | Server endpoint `/api/reporting/schedules/saved-reports` returns Java record `SavedReportOption(String name, String reportId, String title, String datePreset)`. `ReportsController.js` line 1456 queried `opt.id || opt.code || opt.label`, which are all `undefined`. |
| **5** | **Unified Report Viewer Dynamic Filters** | Dynamic filter grid: `configureFilterVisibility()` checks `definition.supportedFilters()`. `Stock Summary` only shows Item, Warehouse, Min/Max Amount. `Sales Register` shows Period, Customer, Item, Salesperson, Status, Payment, Return, GST, Min/Max. | Generic static set of filters displayed for every report regardless of report type, cluttering irrelevant inputs. | `ReportsController.js` lacked dynamic filter show/hide logic based on `ReportDefinition.supportedFilters` retrieved from `/api/reporting/definitions`. |
| **6** | **Report Favorites Cross-Platform Sync** | Stored and fetched on the server via `POST /api/support/saved-views` / `GET /api/support/saved-views` with `screen="REPORT_FAVORITES"` and `name="__favorites__"`. | Web either did not implement favorites persistence or stored it locally in browser `localStorage`, preventing sync with Desktop. | Web lacked synchronization with the server's `REPORT_FAVORITES` saved view API. |
| **7** | **Sales & Purchase: "Same as Billing Address"** | When checked, Delivery Address and Delivery GSTIN fields are strictly disabled / read-only and automatically mirror billing address values. When unchecked, delivery fields are enabled for custom entry. | When checked, fields remained enabled and editable. Only copied value once on click, allowing users to erroneously alter delivery address while "Same as Billing" remained ticked. | `index.html` lacked initial `readonly` attribute, and `SalesController.js` / `PurchaseController.js` did not continuously enforce `readonly` / `disabled` and value mirroring on billing input. |
| **8** | **Sales Creation Item Line Entry** | Fast item entry strip uses an autocomplete search bar (`#ws-fast-item-search`) with live popover suggestions. No clunky select dropdown. | Web had both an autocomplete search bar AND an adjacent `<select id="ws-fast-item-select">` dropdown listing all catalog items. | Redundant dropdown was retained from an earlier prototype, cluttering the item entry toolbar. |
| **9** | **Master Lookup Edit & Save** | Edits existing lookup records cleanly via `PUT /api/master/lookups` sending complete `LookupDto` (`id`, `lookupType`, `lookupCode`, `lookupValue`, `description`, `displayOrder`, `active`, `rowVersion`). | Throws `Save failed: The ERP server could not complete this operation. Check the server log for the underlying error.` (HTTP 500) whenever saving edited lookups (e.g. `BRAND` -> `BRD001`). | Java record `LookupDto` strictly expects `String lookupType` and primitive `int displayOrder`. `MasterDataController.js:L542-551` sent `type` instead of `lookupType` and `sortOrder` instead of `displayOrder`. Jackson failed to deserialize `null` into primitive `int` (`MismatchedInputException`), causing a 500 crash in `ApiExceptionHandler.java`. In addition, `selectedLookupId` was not sanitized to integer `item.id`. |
| **10** | **Permission Matrix Save** | Desktop loads permissions via `GET /api/admin/permissions/set?role=...` which returns `PermissionSetDto(long rowVersion, List<PermissionDto> permissions)`, and sends current `rowVersion` on `PUT /api/admin/permissions`. | Throws `Failed to save permissions: Permission Matrix for MANAGER was changed by another user. Reload the latest version before saving again.` (HTTP 409) whenever saving role permissions. | `AdminService.java:L134-135` enforces optimistic locking against `role_permission_revision.row_version`. Web's `ReportService.js:L103` called `/api/admin/permissions?role=...` (which returns only a flat `List<PermissionDto>` without version). `UserAccessController.js:L1059` hardcoded `permissionRowVersion = 0`. When `role_permission_revision.row_version >= 1`, server rejected with `ConcurrentEditException`. |
| **11** | **Settings 5 Branding Assets Sync** | Desktop reads and displays Application Banner (`application-brand-*.png`), Mark Logo (`application-mark-*.png`), Company Logo, Signature Seal, and Payment QR with dimensions. | Web displays broken image icons with alt text `App Banner` / `App Mark` and static label "No image selected". None of the 5 assets display or sync between Desktop and Web. | **Lifetime Architectural Solution:** Rather than fragile workstation-specific Windows file paths, all 5 business assets are stored centrally in PostgreSQL (`server_resource` table, `resource_type='BUSINESS_ASSET'`) and accessed via standard REST API (`/api/authority/resources/BUSINESS_ASSET/{key}`). 1) Legacy installations had raw local Windows paths (`D:\...`) in `application_setting`. Web browsers strictly block local drive paths due to security sandboxing (`Not allowed to load local resource`). 2) Desktop's `SharedAssetBridge.java` whitelisted only 3 keys, omitting `application.brandImagePath` and `application.markImagePath`. 3) Server auto-migrates existing disk assets into `server_resource` and normalizes pointers to `server-resource:{key}`. 4) Web resolves all 5 assets via authenticated REST API blobs with dimension labels, ensuring 100% cloud/multi-user portability across all platforms. |

---

## 2. In-Depth Technical Investigation & Code References

### Issue 1: Data Import Execution Failure on All 8 Loaders
- **Server Contract Investigation:**
  - `MasterDtos.java`:
    - `ItemDto(Integer id, String itemCode, String description, String category, String brand, String material, String size, String unit, String hsn, double gst, double discountPercent, double purchasePrice, double sellingPrice, double openingStock, double minimumStock, double reservedStock, String location, String remarks, boolean active, long rowVersion)`
    - `PartyDto(Integer id, String partyType, String partyCode, String name, String contactPerson, String phone, String email, String gstin, String address, double openingBalance, boolean active, long rowVersion)`
    - `LookupDto(Integer id, String lookupType, String lookupCode, String lookupValue, String description, int displayOrder, boolean active, long rowVersion)`
  - `OperationDtos.java`:
    - `SaleDto` and `PurchaseDto` records contain primitive `double discountAmount`, `boolean sameAsBilling`, `boolean emailSent`, `boolean whatsappSent`, `double chargeAmount`, `double quantity`, `long rowVersion`.
    - `LineDto` record contains primitive `double discountAmount`, `double discountPercent`, etc.
  - **Exception Flow:**
    - In `ApiExceptionHandler.java`, `IllegalArgumentException` is caught at line 54 and returns HTTP 400 with the validation message.
    - However, Jackson deserialization failures (`MismatchedInputException: Cannot map null into type long`) are NOT caught by specialized handlers; they fall into `Exception.class` at line 81:
      ```java
      @ExceptionHandler(Exception.class)
      public ResponseEntity<Map<String, Object>> serverError(Exception error) {
          error.printStackTrace();
          return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
              "status", HttpStatus.INTERNAL_SERVER_ERROR.value(),
              "code", "SERVER_ERROR",
              "message", "The ERP server could not complete this operation. Check the server log for the underlying error."
          ));
      }
      ```
  - **Desktop Implementation Parity:**
    - In Desktop `ImportService.java` (lines 226-228), new items are saved using `service.save(item)` which invokes `POST /api/master/items`, while existing items are updated via `PUT /api/master/items`.
    - Desktop `MasterApiClient.java` line 70 always supplies every DTO field:
      `new ItemDto(i.getId(), ..., i.getRemarks(), true, i.getRowVersion())` where `getId()` is `null` and `getRowVersion()` defaults to `0L`.
  - **Web Fix:**
    - Realize complete payload contracts in `ImportService.js` for all 8 loaders (`id: null`, `rowVersion: 0`, and complete numeric/boolean primitives).
    - Align `Item Master` to use `window.MasterService.createItem(payload)` for new items and `updateItem(payload)` for updates, exactly matching Desktop's `ImportService.java`.

---

### Issue 2: KPI Card Visual Parity (Tab 1 Dashboard & Tab 4 Scheduled)
- **Desktop Reference:**
  - `Reports.fxml` (lines 54-61 and 150-155):
    ```xml
    <HBox alignment="CENTER_LEFT" spacing="10" styleClass="standard-kpi-card,sales-metric-card,report-kpi-card,kpi-sales">
        <StackPane styleClass="standard-kpi-icon,sales-metric-icon,approved-kpi-icon"/>
        <VBox spacing="2" HBox.hgrow="ALWAYS">
            <HBox alignment="CENTER_LEFT">
                <Label text="Active Sales" styleClass="metric-label,approved-kpi-caption"/>
                <Region HBox.hgrow="ALWAYS"/>
                <Label text="Sales" styleClass="metric-trend-pill,trend-positive"/>
            </HBox>
            <Label fx:id="lblSales" styleClass="metric-value,approved-kpi-value"/>
            <Label text="View Sales Register →" styleClass="metric-note,approved-link"/>
        </VBox>
    </HBox>
    ```
  - `dark-theme.css` (lines 5222-5253):
    - `.standard-kpi-card`: `min-height: 82px; pref-height: 84px; padding: 8px 10px; border-radius: 13px;`
    - `.standard-kpi-icon`: `min-width: 34px; min-height: 34px; max-width: 34px; max-height: 34px; border-radius: 10px;`
    - `.metric-value`: `font-size: 16px; font-weight: 800;`
    - `.metric-note`: `font-size: 9.5px;`
- **Web Fix:**
  - Structure all 6 KPI cards in Tab 1 and 4 KPI cards in Tab 4 in `index.html` as horizontal flex containers with a 34x34px rounded icon badge on the left, header row with title and trend pill, bold value, and clickable link.

---

### Issue 3: Saved Reports (Tab 3) 2-Way Workflow
- **Desktop Investigation:**
  - Desktop `ReportViewerController.java` (line 275):
    - When "Save Report" is clicked, prompts for name, serializes current configuration using `ReportingSavedConfig.encode(name, datePreset, request)`, and executes:
      `supportApi.saveView(uid, "REPORT_CENTER", name, payload)` (`POST /api/support/saved-views`).
  - Desktop `ReportsController.java` (lines 367-376):
    - Tab 3 calls `supportApi.savedViews("REPORT_CENTER", uid)` (`GET /api/support/saved-views?screen=REPORT_CENTER`).
    - Decodes rows and displays Saved Report Name, Base Report, Date Preset, Grouping, Sorting, Columns, and Schedule status.
    - "Open Report" restores all filters, period preset, grouping, sorting, and columns into Report Viewer.
    - "Schedule" navigates to Tab 4 and opens the New Schedule modal pre-selected with this saved report.
- **Web Defect:**
  - Clicking "Save Report" only displayed a fake toast message and never called `/api/support/saved-views`. Tab 3 table remained empty and disconnected from the server.
- **Web Fix:**
  - Persist saved report views via `POST /api/support/saved-views` (`screen="REPORT_CENTER"`), and load saved views into Tab 3 via `GET /api/support/saved-views?screen=REPORT_CENTER`.
  - When opening a saved report, restore all query filters, period, groupings, sort orders, and column configurations into the Report Viewer.

---

### Issue 4: Scheduled Reports (Tab 4) Saved Report Dropdown "undefined"
- **Defect:**
  - Opening the "New Schedule" modal in Tab 4 displays `<option value="undefined">undefined</option>` in the Saved Report dropdown.
- **Root Cause:**
  - `ReportsController.js` lines 1455-1458:
    ```javascript
    repSelect.innerHTML = savedReportOptions.map(opt => {
      const val = opt.id || opt.code || opt.label;
      return `<option value="${val}">${opt.label || val}</option>`;
    }).join('');
    ```
  - Server endpoint `/api/reporting/schedules/saved-reports` returns Java record:
    `public record SavedReportOption(String name, String reportId, String title, String datePreset)`
  - The properties `opt.id`, `opt.code`, and `opt.label` are `undefined` on the server record!
- **Web Fix:**
  - Map `value="${opt.name}"` and label text `${opt.name} (${opt.title || opt.reportId})`.

---

### Issue 5: Dynamic Report Filters per Report Definition
- **Desktop Investigation (`ReportViewerController.java` lines 136-154):**
  - Fetches report definitions from `GET /api/reporting/definitions`.
  - Reads `definition.supportedFilters` (`List<String>`).
  - Conditionally displays only supported filter boxes:
    - `PERIOD` -> Period, From Date, To Date
    - `PARTY` -> Customer / Supplier / Party selector
    - `ITEM` -> Item Master selector
    - `SALESPERSON` -> Salesperson selector
    - `DOCUMENT STATUS` -> Document status dropdown
    - `PAYMENT STATUS` -> Payment status dropdown
    - `RETURN STATUS` -> Return status dropdown
    - `GST RATE` -> GST rate dropdown
    - `WAREHOUSE` -> Warehouse / Location selector
    - `BANK STATUS` -> Bank match status selector
    - `AMOUNT` -> Min Amount and Max Amount inputs
- **Web Fix:**
  - In `ReportsController.js`, add `configureFilterVisibility(reportId)` to toggle filter containers dynamically so `Stock Summary` shows only Item, Warehouse, and Amounts, while `Sales Register` shows Period, Customer, Item, Salesperson, Status, Payment, Return, GST, Min/Max.

---

### Issue 6: Favorites Cross-Platform Synchronization
- **Desktop Reference (`ReportsController.java` lines 272-283):**
  - Stored on server under screen `"REPORT_FAVORITES"` and name `"__favorites__"`.
  - Data payload is comma-separated report IDs (e.g., `SALES_REGISTER,PURCHASE_REGISTER,STOCK_SUMMARY`).
  - `loadFavorites()`: `GET /api/support/saved-views?screen=REPORT_FAVORITES`
  - `persistFavorites()`: `POST /api/support/saved-views` with `{ screen: "REPORT_FAVORITES", name: "__favorites__", data: payload }`
- **Web Fix:**
  - Replace Web's disconnected local storage with calls to `/api/support/saved-views` using screen `"REPORT_FAVORITES"`, enabling instant bi-directional sync with Desktop.

---

### Issue 7: Sales & Purchase "Same as Billing Address" Interlocking
- **Defect:**
  - Ticking "Same as Billing address" copied the address string once, but left `delivery-address` and `delivery-gstin` enabled and editable.
- **Desktop Behavior (`SalesController.java` and `PurchaseController.java`):**
  - When checkbox is ticked:
    - Delivery Address and Delivery GSTIN fields are marked `readonly="readonly"` (or `disabled`) with muted background styling.
    - When user types into Billing Address or Billing GSTIN, delivery fields update live.
  - When checkbox is unticked:
    - Delivery Address and Delivery GSTIN fields are unlocked and editable.
    - System validates that delivery address must not be blank and allows independent shipping destinations.
- **Web Fix:**
  - Update `index.html` to set `readonly` on `#ws-delivery-address`, `#ws-delivery-gstin`, `#pe-delivery-address`, and `#pe-delivery-gstin` when the checkbox is checked by default.
  - In `SalesController.js` and `PurchaseController.js`, bind input listeners on billing fields to sync delivery fields while checked, and toggle `readonly` when the checkbox changes.

---

### Issue 8: Sales Creation Fast Item Entry Strip Cleanup
- **Defect:**
  - Web had both `<input id="ws-fast-item-search">` with autocomplete popup AND adjacent `<select id="ws-fast-item-select">` listing all catalog items.
- **Desktop Behavior:**
  - Uses an autocomplete search input. When an item is selected from suggestions or Enter is pressed, it populates quantity, unit price, tax rate, and HSN.
- **Web Fix:**
  - Remove `<select id="ws-fast-item-select">` from the visible DOM in `index.html`.
  - Expand `#ws-fast-item-search` to take up the full available width.
  - Retain `this.selectedWorkspaceItem` in `SalesController.js` so clicking an autocomplete suggestion or typing an exact code seamlessly populates the line item.

---

### Issue 9: Master Lookup Edit Failure (`LookupDto` Contract Alignment)
- **Defect (Screenshot 1):**
  - User edits an existing lookup (e.g., Category `BRAND`, Code `BRD001`), modifies `Lookup Display Value` to `L&T Admin` or updates sort order, and clicks "Save Lookup".
  - Web throws error toast: `Save failed: The ERP server could not complete this operation. Check the server log for the underlying error.` (HTTP 500).
- **Desktop Behavior:**
  - Desktop executes `PUT /api/master/lookups` sending `LookupDto`:
    ```java
    public record LookupDto(Integer id, String lookupType, String lookupCode, String lookupValue, String description, int displayOrder, boolean active, long rowVersion)
    ```
- **Web Root Cause:**
  - In `MasterDataController.js:L542-551`, Web assembled:
    ```javascript
    const payload = {
      type: currentCategory,
      categoryCode: currentCategory,
      lookupCode: code,
      lookupValue: val,
      description: desc,
      sortOrder: sort,
      active: true,
      rowVersion: selectedLookupRowVersion != null ? selectedLookupRowVersion : 0
    };
    ```
  - Problem 1: `displayOrder` was sent as `sortOrder`. Jackson attempts to deserialize `null` into primitive `int displayOrder`, throwing `MismatchedInputException` which falls into `ApiExceptionHandler.java:L81` (`Exception.class` -> 500 Server Error).
  - Problem 2: `lookupType` was sent as `type` and `categoryCode`. `MasterDataService.java:L982` rejects with `IllegalArgumentException("Lookup type is required")`.
  - Problem 3: `selectedLookupId` in `openEditSelectedLookup` was occasionally storing the code string instead of integer `item.id`.
- **Web Fix:**
  - Format the payload in `submitSaveLookup` with exact schema types:
    ```javascript
    const payload = {
      id: selectedLookupId ? Number(selectedLookupId) : null,
      lookupType: currentCategory,
      categoryCode: currentCategory,
      lookupCode: code,
      lookupValue: val,
      description: desc,
      displayOrder: sort,
      sortOrder: sort,
      active: selectedMasterItem ? selectedMasterItem.active !== false : true,
      rowVersion: selectedLookupRowVersion != null ? Number(selectedLookupRowVersion) : 0
    };
    ```
  - Ensure `openEditSelectedLookup` sanitizes `selectedLookupId = Number(item.id)`.

---

### Issue 10: Permission Matrix 409 Concurrency Error (`rowVersion` Desync)
- **Defect (Screenshot 2):**
  - In `User Access & RBAC -> Permission Matrix`, user modifies checkboxes for any non-admin role (e.g., `MANAGER`) and clicks "Save Permissions".
  - Web throws error toast: `Failed to save permissions: Permission Matrix for MANAGER was changed by another user. Reload the latest version before saving again.` (HTTP 409).
- **Desktop Behavior:**
  - Desktop calls `adminApi.permissionSet(role)` (`GET /api/admin/permissions/set?role=...`), capturing `permissionRowVersion = set.rowVersion()`.
  - On save, Desktop calls `PUT /api/admin/permissions` sending `{ role, permissions, rowVersion: permissionRowVersion }`.
- **Web Root Cause:**
  - Server provides two endpoints in `AdminController.java:L20-21`:
    - `GET /api/admin/permissions?role=...`: Returns `List<PermissionDto>` (A flat array, WITHOUT `rowVersion`).
    - `GET /api/admin/permissions/set?role=...`: Returns `AdminDtos.PermissionSetDto(long rowVersion, List<PermissionDto> permissions)`.
  - In `ReportService.js:L103`, Web called `/api/admin/permissions?role=...`.
  - In `UserAccessController.js:L1057-1060`:
    ```javascript
    } else if (Array.isArray(res)) {
      list = res;
      permissionRowVersion = 0;
    }
    ```
  - Web hardcoded `permissionRowVersion = 0`.
  - Whenever permissions were saved in Desktop or previously mutated, `role_permission_revision.row_version >= 1`.
  - When Web saved, server's `AdminService.java:L134-135` compared `request.rowVersion() (0) != actualRevision (1+)` and threw `ConcurrentEditException("Permission Matrix for " + code)`!
- **Web Fix:**
  - Update `ReportService.js` to invoke `/api/admin/permissions/set?role=...`.
  - In `UserAccessController.js`, extract `permissionRowVersion = Number(res.rowVersion || 0)` and send it on save.
  - Refresh the matrix after saving to retain the incremented revision.

---

### Issue 11: Settings 5 Image Assets Broken / Not Syncing (Lifetime Database & REST API Solution)
- **Defect (Screenshots 3 & 4):**
  - Desktop displays Application Banner (`application-brand-*.png`) and Application Mark / Splash Logo (`application-mark-*.png`) with dimensions (e.g. `1284 x 260`, `273 x 236`).
  - Web shows broken image icons with alt text `App Banner` and `App Mark`, and text "No image selected". None of the 5 assets (Banner, Mark, Invoice Logo, Signature, QR) display or sync to Web.
- **Architectural Analysis: Why Local Windows Paths Are an Anti-Pattern:**
  - Accessing local Windows paths (e.g., `D:\DSE Production\...`) is a single-workstation legacy pattern.
  - If the ERP server is deployed on a Linux VPS, Docker container, or cloud host, or if users access the ERP from other PCs or Web browsers on the network, local Windows paths fail completely because that local drive only exists on the host machine.
  - Furthermore, modern web browsers strictly block web pages loaded over HTTP from reading local filesystem drives (`Not allowed to load local resource`).
- **The Lifetime Enterprise Architecture (Database + Standard REST API):**
  - **Single Source of Truth:** All 5 business assets are stored as binary blobs (`bytea`) directly in the PostgreSQL database table `server_resource` under `resource_type = 'BUSINESS_ASSET'`:
    1. Application Banner: key `application.brandImagePath`
    2. Application Mark / Splash Logo: key `application.markImagePath`
    3. Company / Invoice Header Logo: key `company.logoPath`
    4. Authorized Digital Signature / Seal: key `company.signaturePath`
    5. Payment UPI QR Code: key `payment.qrImagePath`
  - **Standard REST API:**
    - `GET /api/authority/resources/BUSINESS_ASSET/{key}`: Streams the image binary with proper MIME type (`image/png`, `image/jpeg`) and SHA-256 header.
    - `PUT /api/authority/resources/BUSINESS_ASSET/{key}`: Ingests the image binary into `server_resource` from any client (Desktop or Web).
  - **Pointer Standardization:** In `application_setting`, the value is cleanly stored as `server-resource:{key}` (never raw file paths).
  - **Automated Server Migration:** On startup (in `SetupService.java` / `SupportService.java`), the server scans the 5 keys in `application_setting`. If any key still contains a legacy Windows disk path (`.png` / `D:\...`), the server reads the file once from disk, stores it into `server_resource`, and updates `application_setting` to `server-resource:{key}`. From then on, the local disk is never needed again!
  - **Desktop Parity (`SharedAssetBridge.java`):** Add `application.brandImagePath` and `application.markImagePath` to `isAssetKey()`. Now Desktop automatically uploads all 5 images to `server_resource` upon user selection, ensuring multi-user desktop clients and Web are always 100% in sync.
  - **Web Parity (`SettingsController.js`):**
    - `resolveAssetUrl(val, assetKey)`: Fetches `/api/authority/resources/BUSINESS_ASSET/{key}` with Bearer auth token, converts to `URL.createObjectURL(blob)`.
    - `setAssetPreview`: Calculates `img.naturalWidth × img.naturalHeight` on `img.onload`, displays `<filename> • <width> × <height>`, and provides `img.onerror` placeholder fallback.
    - `uploadBrandingAsset`: Saves binary to `PUT /api/authority/resources/BUSINESS_ASSET/{key}` and saves `server-resource:{key}` in `application_setting`.
  - **Zero OS / Cloud Dependency:** Portable, works identically across Windows, Linux, Docker, Web browsers, and multi-user desktop workstations. All branding assets are automatically preserved in standard database backups!

---

## 3. Implementation Steps (To Be Executed After User Approval)

1. **`d:\ERP Website\admin\js\services\ImportService.js`:**
   - Supply complete DTO record structures (`id: null`, `rowVersion: 0`, numeric/boolean defaults) across all 8 loaders.
   - For `Item Master`: Call `window.MasterService.createItem` for new items and `window.MasterService.updateItem` for existing items, exactly mirroring Desktop.
   - For `Customers/CRM` and `Suppliers/HRM`: Ensure `PartyDto` contains `id: null, rowVersion: 0`.
   - For `Sales` and `Purchases`: Include all record components (`discountAmount: 0`, `emailSent: false`, `whatsappSent: false`, `sameAsBilling: false`, `charges: []`, `lines: [...]`).
   - For `Master Categories & Values`: Include `id: null, rowVersion: 0, displayOrder: i+1`.
   - For `Purchase Recon` and `Bank Statement`: Ensure exact primitive field mappings.

2. **`d:\ERP Website\admin\index.html` & `css/app.css`:**
   - Redesign Tab 1 Dashboard (6 cards) and Tab 4 Scheduled (4 cards) KPI cards with Desktop layout:
     - Horizontal flex container (`height: 84px`, `border-radius: 13px`).
     - 34x34px rounded colored icon badge on the left.
     - Right column with title + trend pill, 16px bold value, and 9.5px clickable note/link.
   - Set initial `readonly` attribute on `#ws-delivery-address`, `#ws-delivery-gstin`, `#pe-delivery-address`, and `#pe-delivery-gstin`.
   - Remove `<select id="ws-fast-item-select">` from the sales invoice item strip and expand `#ws-fast-item-search`.

3. **`d:\ERP Website\admin\js\controllers\ReportsController.js`:**
   - **Saved Report Dropdown:** Fix `populateSavedReportsInModal` to use `opt.name` as value and `${opt.name} (${opt.title || opt.reportId})` as label.
   - **Saved Reports 2-Way Workflow:** Implement actual server persistence in `saveCurrentReportConfig()` via `POST /api/support/saved-views` (`screen="REPORT_CENTER"`), and load saved views in Tab 3 via `GET /api/support/saved-views?screen=REPORT_CENTER`.
   - **Restore Filters:** When opening a saved report from Tab 3, re-open Report Viewer, restore all filter values, date preset, grouping, sorting, and column keys, and execute query.
   - **Dynamic Filter Visibility:** Implement `configureFilterVisibility(reportId)` checking `definition.supportedFilters` from `/api/reporting/definitions`.
   - **Favorites Sync:** Implement `loadFavorites()` and `persistFavorites()` using `GET/POST /api/support/saved-views` (`screen="REPORT_FAVORITES"`, `name="__favorites__"`).

4. **`d:\ERP Website\admin\js\controllers\SalesController.js` & `PurchaseController.js`:**
   - Wire input event listeners on billing address & GSTIN to mirror into delivery fields when "Same as Billing" is checked.
   - When "Same as Billing" is toggled: set/remove `readonly` and sync values.
   - Clean up fast item entry to work exclusively via autocomplete search `#ws-fast-item-search`.

5. **`d:\ERP Website\admin\js\controllers\MasterDataController.js`:**
   - Align `submitSaveLookup` payload to match Java record `LookupDto`:
     - `lookupType: currentCategory`
     - `displayOrder: sort`
     - `rowVersion: Number(selectedLookupRowVersion || 0)`
     - `id: selectedLookupId ? Number(selectedLookupId) : null`
   - Sanitize `selectedLookupId` in `openEditSelectedLookup` to use numeric `item.id`.

6. **`d:\ERP Website\admin\js\services\ReportService.js` & `UserAccessController.js`:**
   - In `ReportService.getPermissions`, call `/api/admin/permissions/set?role=...`.
   - In `UserAccessController.loadPermissionMatrix`, extract `permissionRowVersion = Number(res.rowVersion || 0)`.
   - In `UserAccessController.savePermissionMatrix`, send `rowVersion: Number(permissionRowVersion)`.

7. **`d:\ERP Website\admin\js\controllers\SettingsController.js`:**
   - In `resolveAssetUrl(val, assetKey)`: For all 5 assets, fetch binary from `/api/authority/resources/BUSINESS_ASSET/{key}` with Bearer auth token and convert to `URL.createObjectURL(blob)`.
   - In `uploadBrandingAsset`: Stream binary to `PUT /api/authority/resources/BUSINESS_ASSET/{key}` and set `server-resource:{key}` in `/api/support/settings`.
   - In `setAssetPreview`: Update status labels with `<filename> • <width> × <height>` on `img.onload`, and provide graceful fallback on `img.onerror`.
   - Connect all 5 assets: Application Banner, Application Mark, Invoice Logo, Signature Seal, and UPI QR Code.

8. **Phase 1: Desktop v10.0.35 Release Execution (Target: `ssdhameliya/DSE-ERP`):**
   - **Workspace:** `c:\Users\JATIN DHAMELIYA\Downloads\DSE-ERP-10.0.25-INTELLIJ-READY-FINAL-V19\DSE-ERP-10.0.25`.
   - **Database & Asset Centralization:**
     - In `SharedAssetBridge.java:L5`, add `application.brandImagePath` and `application.markImagePath` so Desktop natively syncs all 5 branding images to `server_resource`.
     - In `SetupService.java` / `SupportService.java`, add startup auto-migration to ingest legacy local `.png` paths from `application_setting` into PostgreSQL `server_resource` and update pointers to `server-resource:{key}`.
   - **Version Bump:** Update `.mvn/maven.config` to `-Drevision=10.0.35`.
   - **Documentation:** Create `CHANGELOG-10.0.35.md` and update `desktop/src/main/resources/release-notes.md`.
   - **Verification:** Run `mvn clean verify` and `python scripts/audit-release-gates.py`.
   - **Staging & PR:**
     - Mirror verified code to `D:\GitHub\ReleaseSource`.
     - In `D:\GitHub\DSE-ERP-Primary`, checkout `release-10.0.35`, robocopy from `ReleaseSource`.
     - Verify clean build, commit, push branch `release-10.0.35`, and create PR on GitHub with `gh pr create`.

9. **Phase 2: Web v10.0.35.01 Release Execution (Target: `ssdhameliya/DSE-ERP-Enterprise`):**
   - **Workspace:** `d:\ERP Website\admin`.
   - **Apply all 11 Parity & Defect Fixes:**
     - 8-loader full DTO contracts in `ImportService.js`.
     - Desktop KPI card redesign in `index.html` & `app.css`.
     - Saved reports 2-way sync & filters restoration in `ReportsController.js`.
     - Scheduled report dropdown `opt.name` mapping.
     - Dynamic report filters based on `supportedFilters`.
     - Cross-platform report favorites server sync.
     - Sales & purchase billing/delivery address interlocking and `readonly` enforcement.
     - Clean sales fast item search strip.
     - Master lookup edit & save `LookupDto` schema alignment in `MasterDataController.js`.
     - Permission matrix save concurrency fix in `UserAccessController.js` and `ReportService.js`.
     - Settings 5 branding assets REST resolution via `/api/authority/resources/BUSINESS_ASSET/{key}` with dimension status labels.
   - **Version Bump:** Update `version.js` to `10.0.35.01` (Build 1).
   - **Release:** Commit, tag `web-v10.0.35.01`, and push to `D:\GitHub\DSE-ERP-Enterprise`.

