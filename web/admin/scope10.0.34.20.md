# Scope & Technical Specification: Web v10.0.34.20 Enterprise Release
**Desktop Baseline Parity, Data Import Validation Transparency, Settings 5-Asset API Fix & Authentic Auth Split Layout**

**Release Target:** `web-v10.0.34.20` (Build 20)  
**Date:** 2026-10-19  
**Status:** Approved for Implementation & Build  
**Target Repository:** `D:\GitHub\DSE-ERP-Enterprise\web\admin` (branch: `main`, tag: `web-v10.0.34.20`)

---

## 1. Executive Summary & Root Cause Analysis

In testing live release `10.0.34.19`, four critical issues and discrepancies against Desktop were observed:

| Issue | Observation in Web | Desktop Baseline (`10.0.34`) | Root Cause |
| :--- | :--- | :--- | :--- |
| **1. Import Studio Error Reason** | Table only shows a `FAILED` badge without explanation for all loaders. | Table displays 7th column `Result / Error` with `row.message` (e.g. `Item Code 'ITEM-0001' does not match format REF_ITEM (ITMXXX)`). | `index.html` omitted the 7th column header `Result / Error`, and `ImportController.js` discarded `d.message`, only rendering `${statusBadge}`. |
| **2. Settings 5 Images API Error** | Clicking `+ Add / Replace` throws `TypeError: window.AuthService.getToken is not a function`. Server images don't preview. | Settings allows uploading & previewing all 5 image assets directly to/from server storage. | `AuthService.js` defines `getAccessToken()` under key `'dse_access_token'`. `SettingsController.js` called `window.AuthService.getToken()` and checked `'auth_token'`. Keys also mismatched desktop canonical keys (`application.brandImagePath`, `application.markImagePath`, `company.logoPath`, `company.signaturePath`, `payment.qrImagePath`). |
| **3. Login Screen Margins & Branding** | Squeezed into 960px container leaving ~480px black empty margins on 1080p screens. Generic square logo. | Full split-screen layout (40% left brand pane / 60% right card pane). Displays wide 5:1 company banner (`JASVI INDUSTRIES`) + separate square mark icon (`J`). | `.auth-desktop-wrapper` had `max-width: 960px; margin: auto;`. Missing dual banner + mark badge elements and authentic assets. |
| **4. Register & Forgot UI Layout** | Registration form packed inside 440px card; inputs and buttons cramped and wrapping awkwardly. | Spacious `maxWidth="860"` card with clean 2-column identity grid and 3 distinct sequential step cards (`Registration.fxml`). | `.auth-card-col` had fixed narrow width (440px) without dynamic expansion for registration or multi-step recovery. |

---

## 2. Detailed Technical Scope & Implementation Plan

### Issue 1: Data Import Studio Error Reason Transparency
1. **`index.html` (Line ~5654):**
   - Update 7th column header from `<th style="width:100px; text-align:center;">Status</th>` to `<th style="min-width:260px;">Result / Error</th>`.
2. **`ImportController.js` (Lines ~325-342):**
   - Render both status badge AND the detailed error/validation message:
     ```javascript
     <td style="font-size:0.75rem; vertical-align:middle;">
       ${statusBadge}
       <span style="margin-left:8px; font-weight:500; color:${isPassed ? 'var(--text-muted)' : '#f87171'};">
         ${d.message || (isPassed ? '✓ Record validated successfully' : 'Validation failed')}
       </span>
     </td>
     ```
   - Add `.import-validation-fail-row` styling to highlight failed rows with subtle red border and background tint matching Desktop's `import-validation-fail-row`.
3. **Format Validation Explanation:**
   - Document in UI guidance that `REF_ITEM` enforces code pattern `ITMXXX` (e.g. `ITM0001`), explaining why `ITEM-0001` failed format validation in both Desktop and Web.

### Issue 2: Settings 5 Image Assets & AuthService Token Fix
1. **`AuthService.js` (Line ~32):**
   - Add `getToken() { return this.getAccessToken(); }` alias so any legacy or caller calling `getToken()` works seamlessly.
2. **`SettingsController.js` (Lines 104, 155, 222):**
   - Standardize token resolution across `resolveAssetUrl`, `uploadSignatureImage`, and `uploadBrandingAsset`:
     ```javascript
     const token = (window.AuthService?.getAccessToken?.() || window.AuthService?.getToken?.() || localStorage.getItem('dse_access_token') || localStorage.getItem('auth_token'));
     ```
3. **Bridge Canonical Desktop Asset Keys in Settings:**
   - In `SettingsController.js` and `index.html`, bridge all 5 configuration keys:
     1. `application.brandImagePath` (with fallback `application.banner`)
     2. `application.markImagePath` (with fallback `application.mark`)
     3. `company.logoPath` (with fallback `invoice.header.logo`)
     4. `company.signaturePath` (with fallback `invoice.digital.seal`, `email.signature.image`)
     5. `payment.qrImagePath` (with fallback `payment.upi.qr`)
   - When uploading via `uploadBrandingAsset`, write both canonical and fallback keys to `/api/support/settings`.
   - When loading settings, check both keys and resolve asset URL from `/api/authority/resources/BUSINESS_ASSET/{key}`.

### Issue 3: Login Screen Full-Viewport Split Layout & Authentic Jasvi Branding
1. **`css/app.css` (Line ~1380):**
   - Redesign `.auth-desktop-wrapper` to full viewport split screen:
     ```css
     .auth-desktop-wrapper {
       display: flex;
       align-items: center;
       justify-content: space-between;
       width: 100%;
       max-width: 1440px;
       min-height: calc(100vh - 80px);
       padding: 0 4vw;
       gap: 48px;
     }
     ```
   - Style `.auth-brand-col` to take 42% width with dedicated wide banner container and square mark badge.
2. **`index.html` (Lines ~170-184):**
   - Replace single small logo card with Desktop-matching dual branding elements:
     - `#auth-brand-banner-card` containing `<img src="assets/brand-banner.png" id="auth-brand-banner-img">` (5:1 wide ratio, center-cropped).
     - `#auth-brand-mark-card` containing `<img src="assets/brand-mark.png" id="auth-brand-mark-img">` (58x58 square mark badge).
   - Align typography to Desktop baseline:
     - Title: "Jasvi Creation"
     - Subtitle: "Enterprise Production & Distribution"
     - Tagline: "Role-aware secure access to Jasvi Creation"
     - Version Badge: "Version 10.0.34"

### Issue 4: Spacious Registration & Forgot Password Card Layout
1. **`css/app.css` (Line ~1423):**
   - Update `.auth-card-col.wide-card` to `width: 860px; max-width: 95vw;`, matching Desktop `Registration.fxml` (`maxWidth="860"`).
   - Add transition for smooth expansion when switching tabs.
2. **`index.html` (Auth Tab Switching):**
   - When `showAuthTab('register')` or `showAuthTab('forgot')` is triggered, apply `wide-card` to `#auth-card-col`.
   - When switching back to `'login'`, remove `wide-card`.

---

## 3. Verification & Acceptance Criteria
1. Headless Chrome automated run confirms:
   - Zero JavaScript runtime errors or unhandled promise rejections.
   - `window.AuthService.getToken()` and `window.AuthService.getAccessToken()` return valid tokens.
   - Data Import Studio validation table renders 7 columns with explicit `Result / Error` column and messages.
   - Settings 5-image asset previews resolve cleanly without `TypeError`.
   - Login and Registration layouts render with proper wide split margins and dual Jasvi branding.
2. Version bumped to `10.0.34.20` across `version.json` and `js/version.js`.
3. Synced to `D:\GitHub\DSE-ERP-Enterprise`, committed, tagged `web-v10.0.34.20`, and pushed to remote `main` and tag.
