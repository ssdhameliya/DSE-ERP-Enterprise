# Scope Specification: Notification Center & Event Engine Parity (`scope10.0.34.7.md`)

**Target Baseline:** Desktop ERP `10.0.34` (`NotificationCenterController.java` & `NotificationService.java`)  
**Target Web Release:** Web Admin Studio `10.0.34.7` (`d:\ERP Website\admin`)  
**Date:** October 18, 2026  
**Status:** Canonical Implementation Scope — 1-Shot Parity Specification  
**Rule:** No build/compile commands. Pure client-side markup, CSS, and controller synchronization.

---

## 1. Executive Summary & Problem Statement

In Web Admin Studio (`10.0.34.6`), opening the Notification Center displayed a collapsed single-column view where only the left category rail was visible (stretched to 100% width), while the middle **Notifications List** and right **Notification Details** pane were completely pushed out of view. Furthermore, the **Action Needed** KPI counter reported `0` (whereas Desktop reported `1`), the left rail omitted primary filters (`All`, `Unread`, `Action Needed`) as well as key categories (`Reports`, `Banking`, `Imports`), list cards lacked the `ACTION` badge, and deep linking for user approvals and reports was non-functional.

This specification details the comprehensive, one-shot implementation to achieve 100% behavioral, visual, and architectural parity with Desktop ERP `10.0.34`.

---

## 2. Parity Architecture & Detailed Requirements

### Component 1: 3-Column Workspace Layout & CSS Grid
- **Desktop Reference:** `NotificationCenter.fxml` (3-column layout: Category Rail `220px`, Notifications List `1.35fr`, Detail Pane `1.25fr`).
- **Web Defect:** `index.html` used `<div class="notif-workspace-layout">` which had no CSS rule in `app.css`. It defaulted to `display: block`, pushing the list and detail panes below the visible card.
- **Solution:**
  - Standardize container class to `.notif-center-body` with `display: grid; grid-template-columns: 220px 1.35fr 1.25fr; height: calc(86vh - 130px); overflow: hidden;`.
  - Fix top KPI summary icon for "ALL" to replace the unrendered bracket glyph `&#128472;` with a clean SVG grouping/funnel icon.

### Component 2: Left Category Rail & Filter Navigation
- **Desktop Reference:** `NotificationCenterController.java:122–130`.
- **Requirements:**
  1. Top Meta Filters at head of rail:
     - `All Notifications` (shows total count, default active selection with blue pill `#2563eb`).
     - `Unread` (shows unread count).
     - `Action Needed` (shows actionable count).
  2. Full 16 Domain Categories with exact counts and icons:
     - `Approval` (✔)
     - `Sales` (🛒)
     - `Purchases` (📦)
     - `Quotations` (📑)
     - `Returns` (↺)
     - `Payments` (💳)
     - `Inventory` (🏷)
     - `Banking` (🏦) — *Previously missing in Web*
     - `Reports` (📊) — *Previously missing in Web*
     - `Reminders` (⏰)
     - `Communication` (✉)
     - `Security` (🔒)
     - `Imports` (📥) — *Previously missing in Web*
     - `Backup` (💾)
     - `Update` (⚡)
     - `System` (🔔)

### Component 3: 10-Verb Actionable Rule Engine
- **Desktop Reference:** `NotificationCenterController.java:155–160` (`Set.of("APPROVE", "REVIEW", "RESOLVE", "PAY", "PAYMENT", "RECONCILE", "COMPLETE", "EXECUTE", "CHECK", "INSTALL")`).
- **Web Defect:** Web only checked `act.includes('APPROV')` and `WARN/ERROR`. It ignored `actionCode: "REVIEW"`, causing *"New User Approval Required"* to show as `Action Needed: 0`.
- **Solution:** Implement the full 10-verb actionable engine in `NotificationCenterController.js` so `"REVIEW"`, `"APPROVE"`, `"RESOLVE"`, etc. accurately increment the Action Needed counter.

### Component 4: Middle Notification List & Badge Rendering
- **Requirements:**
  - 3-Badge System:
    1. Category Badge (e.g., `Security`, `Reports`, `Sales`).
    2. `NEW` Badge (blue `#3b82f6`, when `!n.read`).
    3. `ACTION` Badge (amber `#f59e0b`, when `isActionable(n)`).
  - Clean timestamp formatting (`18 Oct 2026 • 03:07 PM`).
  - Double-click item card to immediately trigger `openLinkedRecord()`.
  - Active selection highlighting matching Desktop.

### Component 5: Right Detail Pane & Deep-Link Router
- **Requirements:**
  - Rich header with semantic category icon + "Notification Details".
  - Full title, body message, and metadata (`Category • Severity • Date • Read/Unread`).
  - Linked record reference chip (`References 5 • USER_REGISTRATION`).
  - Action buttons:
    - Primary: `👁 Open Record` (dynamically labeled `Review Approval` when `actionCode === 'APPROVE'`).
    - Secondary Left: `✔ Mark Read` / `✉ Mark Unread`.
    - Secondary Right: `🗑 Dismiss`.
  - Deep-Link Router: Handle all Desktop targets (`USER_REGISTRATION` -> User Approvals, `REPORTS` -> Reports screen, `BANKING` -> Bank Entry, `INVENTORY` -> Item Master, etc.).

### Component 6: Broadened Web Client Event Broadcasting
- **Requirements:**
  - Expand `NotificationService.js` to support helper methods for Inventory, Banking, Reminders, and Approvals.
  - Wire notifications into web controllers on key user actions.

---

## 3. Implementation Verification Checklist

- [x] Layout: 3-column split view (Category Rail | Notification List | Notification Details) renders correctly.
- [x] KPI Cards: "Action Needed" displays `1` when review/approval items exist.
- [x] Left Rail: Shows `All Notifications (2)`, `Unread (2)`, `Action Needed (1)` above module categories.
- [x] Category Coverage: `Reports`, `Banking`, and `Imports` appear in rail with correct counts.
- [x] Badges: Both `NEW` and `ACTION` badges appear on actionable unread items.
- [x] Deep Link: Clicking `Open Record` navigates to the exact record/modal.
