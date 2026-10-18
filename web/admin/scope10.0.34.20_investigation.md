# Comprehensive Investigation & Root Cause Analysis: Web vs Desktop Parity

**Release Target:** `web-v10.0.34.20`  
**Investigation Date:** 2026-10-19  
**Status:** Investigation Completed • Awaiting User Approval Before Code Implementation  

---

## Executive Summary

Based on first-principle investigation of both codebases (Desktop JavaFX + Server Spring Boot vs Web Admin Studio) and comparison against the uploaded screenshots:
1. **Import Error Reason Missing:** Web's Data Import Studio validation table completely omits the `Result / Error` column. While Desktop displays the exact failure reason (e.g. `Item Code 'ITEM-0001' does not match format REF_ITEM (ITMXXX)`), Web only displays a generic `FAILED` badge without the message.
2. **Settings 5 Images API Error:** In `SettingsController.js`, all image upload and preview methods call `window.AuthService.getToken()`. However, `AuthService.js` only defines `getAccessToken()` and stores the token under `dse_access_token`. This causes `TypeError: window.AuthService.getToken is not a function`, blocking image uploads and failing to resolve real server images from `/api/authority/resources/BUSINESS_ASSET/`. Furthermore, the settings keys used in Web differ from Desktop's canonical keys (`application.brandImagePath`, `application.markImagePath`, `company.logoPath`, `company.signaturePath`, `payment.qrImagePath`).
3. **Login Screen Margins & Visual Parity:** Web's auth wrapper is constrained to `max-width: 960px`, leaving huge black margins on 1920x1080 screens. Desktop uses a full split-screen layout (`BorderPane.left` and `BorderPane.center`) displaying both the wide company banner (`application.brandImagePath`) and the square mark icon (`application.markImagePath`).
4. **Register & Forgot Password UI:** Web's registration form is compressed into a narrow 440px card rather than using Desktop's wide 860px layout (`Registration.fxml`), causing the 2-column grid and 3-step cards to appear cramped.

---

## Detailed Technical Findings & Root Causes

### 1. Data Import Studio: Why Web Shows Only "FAILED" Without Error Reason

#### Desktop Implementation (`ImportController.java` lines 1200–1206):
```java
tblValidation.getColumns().clear();
addValidationColumn("Sheet / Rows", "rows");
addValidationColumn("Record / Reference", "reference");
addValidationColumn("Mandatory", "mandatory");
addValidationColumn("Format", "format");
addValidationColumn("Master Match", "master");
addValidationColumn("Data / Duplicate", "data");
addValidationColumn("Result / Error", "message"); // <--- Desktop displays the exact error message!
```
In Desktop (Image 2):
- When `ITEM-0001` fails validation, the 7th column **`Result / Error`** clearly states:
  `Item Code 'ITEM-0001' does not match format REF_ITEM (ITMXXX)`
- Desktop colors the entire row red/green based on `_status`.

#### Web Implementation (`index.html` lines 5648–5655 & `ImportController.js` lines 331–341):
In `index.html`:
```html
<thead>
  <tr>
    <th style="width:100px; text-align:center;">Sheet / Rows</th>
    <th style="width:160px;">Record / Reference</th>
    <th style="width:130px;">Mandatory</th>
    <th style="width:130px;">Format</th>
    <th style="width:140px;">Master Match</th>
    <th>Data / Duplicate Action</th>
    <th style="width:100px; text-align:center;">Status</th> <!-- OMITTED Result / Error! -->
  </tr>
</thead>
```
In `ImportController.js`:
```javascript
<tr>
  <td style="text-align:center;">${d.sourceRows || '-'}</td>
  <td style="font-family:monospace;">${d.reference || '-'}</td>
  <td>${d.mandatory || '✓ Passed'}</td>
  <td>${d.format || '✓ Passed'}</td>
  <td>${d.master || '✓ Passed'}</td>
  <td>${d.data || d.action || '-'}</td>
  <td style="text-align:center;">${statusBadge}</td> <!-- Only rendered 'FAILED' badge, discarded d.message! -->
</tr>
```
**Root Cause:** Web completely omitted the `Result / Error` column from the table header and never rendered `d.message`. Even though `ImportService.js` correctly generated the exact error message (`d.message`), the UI discarded it and only showed the badge `FAILED`.

---

### 2. Settings Images: Why All 5 Images Throw `window.AuthService.getToken is not a function`

#### Exact Error Location in `SettingsController.js`:
- Line 104: `const token = window.AuthService ? window.AuthService.getToken() : localStorage.getItem('auth_token');` (in `resolveAssetUrl`)
- Line 155: `const token = window.AuthService ? window.AuthService.getToken() : localStorage.getItem('auth_token');` (in `uploadSignatureImage`)
- Line 222: `const token = window.AuthService ? window.AuthService.getToken() : localStorage.getItem('auth_token');` (in `uploadBrandingAsset`)

#### Exact Method in `AuthService.js`:
- Line 29:
  ```javascript
  getAccessToken() {
    return localStorage.getItem('dse_access_token');
  }
  ```
  `AuthService.js` never exported `getToken()`. It only exported `getAccessToken()`. Furthermore, the storage key is `'dse_access_token'`, not `'auth_token'`.

#### Consequences:
1. **Upload Failure:** Clicking `+ Add / Replace` triggers `uploadBrandingAsset()`, which immediately crashes with:
   `TypeError: window.AuthService.getToken is not a function`
2. **Broken Image Previews:** On page load, `resolveAssetUrl()` tries to fetch the binary asset blob from `/api/authority/resources/BUSINESS_ASSET/{key}`. Because `window.AuthService.getToken()` throws, it catches the error and returns the raw string `"server-resource:company.logo"`, which fails to render as an image.

#### Secondary Issue: Key Mismatch with Desktop:
Desktop stores and resolves the 5 canonical image assets in `ConfigManager` / `/api/support/settings`:
1. `application.brandImagePath` (UI Header Banner)
2. `application.markImagePath` (Application Square Mark / Icon)
3. `company.logoPath` (Billing & Invoicing Logo)
4. `company.signaturePath` (Authorized Signature / Seal)
5. `payment.qrImagePath` (Payment UPI QR Code)

Web was configured with ad-hoc keys:
`application.banner`, `application.mark`, `payment.upi.qr`, `invoice.header.logo`, `invoice.digital.seal`.
Because the keys differed, Web never saw the real images uploaded by Desktop, and Desktop never saw the images uploaded by Web.

---

### 3. Login Screen: Why Web Does Not Match Desktop UI & Margins (Images 3 vs 4)

| Feature / Element | Desktop (`Login.fxml` & Image 3) | Web (`index.html` & Image 4) |
| :--- | :--- | :--- |
| **Viewport Layout** | Full split screen: Left pane (`BorderPane.left`) takes 40% width with navy gradient background; right pane (`BorderPane.center`) centers the card across the remaining 60%. | Squeezed in the center: `.auth-desktop-wrapper` has `max-width: 960px; margin: auto;`, leaving massive ~480px empty black voids on wide screens. |
| **Left Header Banner** | Dedicated wide rectangular container (`minHeight: 118, prefHeight: 118, maxWidth: 520`) displaying the real company artwork banner (`JASVI INDUSTRIES` with address/contact info). | Small white box (`max-width: 320px; max-height: 80px`) displaying the fallback generic `assets/logo.png`. |
| **Left Mark Icon** | Separate square badge (`brandMarkBox`, 58x58) displaying the square "J" logo below the banner. | Missing entirely. |
| **Card Positioning** | Positioned comfortably in the right half of the display with ample breathing room. | Centered tightly next to the left logo in a small cluster. |

---

### 4. Registration & Forgot Password Screens: UI & Logic Differences

#### Desktop Registration (`Registration.fxml` & `RegistrationController.java`):
- Uses a spacious `maxWidth="860"` card.
- Identity Grid: 2 columns (50% / 50%):
  - Row 0: `Full name *` | `Username *`
  - Row 1: `Email *` (full width)
  - Row 2: `Registration role` (read-only, styled distinctively)
  - Row 3: `Password *` | `Confirm password *`
- Sequential 3-Step Process:
  - **Step 1 Card:** CAPTCHA question, answer field, refresh button, "Send email OTP" button.
  - **Step 2 Card:** 6-digit email OTP input, "Verify Email OTP" button.
  - **Step 3 Card:** Google / Microsoft Authenticator status, QR modal integration, and admin approval submission.

#### Web Current State:
- Web has the inputs, but because they are packed inside `.auth-card-col` (fixed `width: 440px`), the 2-column inputs are cramped and buttons wrap awkwardly.
- Applying `.auth-card-col.wide-card` (`max-width: 860px`) dynamically when switching to the `register` or `forgot` tab is required to match Desktop's spacious layout.

---

## Proposed Remediation Plan for Release `web-v10.0.34.20`

### Phase 1: Data Import Studio Parity
1. **Table Header Update (`index.html`):**
   Replace the 7th column header `<th>Status</th>` with:
   `<th style="min-width:240px;">Result / Error</th>`
2. **Table Row Rendering (`ImportController.js`):**
   Render both the status badge (`PASSED` / `FAILED` / `SKIPPED`) AND the explicit message `d.message` (e.g. `Item Code 'ITEM-0001' does not match format REF_ITEM (ITMXXX)`).
   Apply red background/border styling to failed rows matching Desktop's `import-validation-fail-row`.

### Phase 2: Settings 5 Images & Authentication Fix
1. **Fix `AuthService.js`:**
   Add `getToken()` alias to `AuthService.js`:
   ```javascript
   getToken() { return this.getAccessToken(); }
   ```
2. **Fix `SettingsController.js`:**
   Update lines 104, 155, and 222 to:
   ```javascript
   const token = (window.AuthService && window.AuthService.getAccessToken ? window.AuthService.getAccessToken() : null) || localStorage.getItem('dse_access_token');
   ```
3. **Bridge Canonical Desktop Asset Keys:**
   Configure `SettingsController.js` and `index.html` to support Desktop's canonical keys:
   - `application.brandImagePath` (UI Banner)
   - `application.markImagePath` (Mark Icon)
   - `company.logoPath` (Invoice / Company Logo)
   - `company.signaturePath` (Authorized Signature)
   - `payment.qrImagePath` (Payment UPI QR)
   When loading settings, resolve both canonical desktop keys and fallback keys so real server images uploaded from Desktop display in Web.

### Phase 3: Login Screen Layout & Visual Parity
1. **Full Split-Screen Layout (`css/app.css`):**
   Update `.auth-desktop-wrapper` to fill the viewport (`width: 100%; max-width: 1440px; justify-content: space-between; padding: 0 5vw;`), eliminating the unnatural 480px black voids.
2. **Dual-Asset Left Branding Pane (`index.html`):**
   Update `.auth-brand-col` to include both:
   - The wide rectangular banner (`imgBrandLogo`, matching Desktop `minHeight: 118, prefHeight: 118, maxWidth: 520`).
   - The square mark badge below it (`brandMarkBox`, 58x58 with the square "J" mark).
3. **Dynamic Image Resolution:**
   Load the real company banner and mark icon from `/api/authority/resources/BUSINESS_ASSET/application.brandImagePath` and `application.markImagePath`.

### Phase 4: Registration & Forgot Password Card Sizing
1. **Dynamic Wide Card (`auth-card-col.wide-card`):**
   When `showAuthTab('register')` or `showAuthTab('forgot')` is called, expand the card container to `max-width: 860px` matching Desktop's `Registration.fxml` layout.
2. **Back to Login Transition:**
   Shrink back smoothly to standard width when returning to the login form.

---

## Next Steps
Upon your review and approval of this investigation document:
1. We will implement the changes across `index.html`, `css/app.css`, `ImportController.js`, `SettingsController.js`, and `AuthService.js`.
2. Test thoroughly using headless Chrome and verify zero console errors.
3. Bump version to `10.0.34.20`, commit, tag, and push to GitHub.
