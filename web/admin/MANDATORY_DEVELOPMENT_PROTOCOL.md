# DSE-ERP Master Protocol & Unified Environment Constitution

> **Single Source of Truth** for DSE-ERP Architecture, Workspace Boundaries, Desktop-Web Parity Inspection, Automation Scripts, Server Infrastructure, and Cloud Deployment.
> **Antigravity Enforcement:** This document is automatically loaded by Antigravity on every conversation. All rules, boundaries, and checklists herein are strictly binding.

---

## 1. Workspace Directory Map & Strict Protection Boundaries

```
[ Active Dev / Fixing ]                    [ Protected Local Runtime ]
c:\...\DSE-ERP-10.0.25                    D:\DSE Production (DB 55432)
(Active Code Modifications)               (STRICTLY PROTECTED - NEVER ALTER)
         │
         ├──► [ Staging Mirror ] ─────────► [ GitHub Target Project ]
         │    D:\GitHub\ReleaseSource       D:\GitHub\DSE-ERP-Primary (ssdhameliya/DSE-ERP)
         │
         └──► [ Protected Desktop Copy ]
              D:\JavaProject\DSE-ERP-Final
              (STRICTLY PROTECTED - DESKTOP ONLY - NEVER TOUCH FOR WEB)
```

### 1.1 Desktop & Server Workspaces
1. **Antigravity Active Development Workspace:**  
   `c:\Users\JATIN DHAMELIYA\Downloads\DSE-ERP-10.0.25-INTELLIJ-READY-FINAL-V19\DSE-ERP-10.0.25`  
   *All active coding, refactoring, compiler checks, and tests are performed here first.*
2. **User's IntelliJ Copy (PROTECTED LOCAL WORKSPACE):**  
   `D:\JavaProject\DSE-ERP-Final`  
   *Reserved exclusively for the user's local IntelliJ workflow. Antigravity must never run active experimental edits directly here.*  
   * **Mandatory Sync Protocol:** Whenever the user commands **"ready to test for local"** or when a **PR is raised/ready**, Antigravity MUST automatically synchronize `D:\JavaProject\DSE-ERP-Final` from the verified release staging (`D:\GitHub\ReleaseSource`), strictly excluding `.git`, `target`, and `.idea` (to protect IntelliJ configurations).  
   * **File Change Reporting Mandate:** Antigravity MUST explicitly count and report to the user the exact number of files copied, modified, or updated during the sync so the user's local workspace is **never left behind**.
3. **Local Runtime Workspace (STRICTLY PROTECTED):**  
   `D:\DSE Production`  
   *Contains the live local PostgreSQL database (`port 55432`), configuration files, runtime logs, document attachments, and backups. **NEVER** run destructive SQL (`TRUNCATE`, `DROP`, `DELETE`), clean scripts, or modify files here unless explicitly requested.*
4. **Desktop/Server Release Staging:**  
   `D:\GitHub\ReleaseSource`  
   *Mirrored staging copy verified before pushing releases to GitHub.*
5. **Desktop/Server GitHub Target Repository:**  
   `D:\GitHub\DSE-ERP-Primary` (`https://github.com/ssdhameliya/DSE-ERP`)

### 1.2 Web Application Workspaces & Direct UAT Testing Policy
> **Direct UAT Testing Policy:** The local development machine does not host the PostgreSQL database for web testing. All web application verification is conducted directly against the live **UAT** cloud environment (`https://erp-uat.jasviindustries.in/admin/`).
1. **Web Working Directory (Legacy HTML/JS):** `d:\ERP Website\admin`
2. **Web Release Staging:** `D:\GitHub\ReleaseSource Website\admin`
3. **Web GitHub Target Repository:** `D:\GitHub\DSE-ERP-Enterprise` (`web/admin` on branch `main`)
4. **Live Web UAT URL:** `https://erp-uat.jasviindustries.in/admin/`

---

## 2. Server Infrastructure, DNS & Environment Inventory

All verified IP addresses, DNS mappings, ports, databases, and SSH credentials across Hostinger and Oracle Cloud Infrastructure (OCI):

### 2.1 Hostinger DNS Records (Domain: `jasviindustries.in`)
| Domain / Subdomain | Target IP / Host | Environment | Destination / Role |
| :--- | :--- | :---: | :--- |
| **`jasviindustries.in`** | `130.210.35.1` | **PROD** | Public Company Showcase / Root |
| **`www.jasviindustries.in`** | `130.210.35.1` | **PROD** | Public Company Showcase (CNAME to `@`) |
| **`erp.jasviindustries.in`** | `130.210.35.1` | **PROD** | Production Web ERP Admin Studio |
| **`api.jasviindustries.in`** | `130.210.35.1` | **PROD** | Production REST Backend API (Port `8080`) |
| **`web-uat.jasviindustries.in`** | `144.24.109.1` | **UAT** | UAT Public Showcase Staging |
| **`erp-uat.jasviindustries.in`** | `144.24.109.1` | **UAT** | UAT Web ERP Testing Studio |
| **`api-uat.jasviindustries.in`** | `144.24.109.1` | **UAT** | UAT REST Backend API (Port `8081`) |
| **`mobile-uat.jasviindustries.in`**| `ssdhameliya.github.io` | **UAT** | Mobile PWA Gateway |

### 2.2 Oracle Cloud (OCI) Server Specification & Paths
| Parameter | Production (PROD) | Testing (UAT) |
| :--- | :--- | :--- |
| **Server Public IP** | `130.210.35.1` | `144.24.109.1` |
| **SSH User** | `opc` | `opc` |
| **SSH Private Key (Local)** | `~/.ssh/dse-erp-github-prod` | `~/.ssh/dse-erp-github-uat` |
| **Spring Server Port** | `8080` | `8081` |
| **Target Database** | `dse_erp` (PostgreSQL 16+) | `dse_erp_uat` (PostgreSQL 16+) |
| **Public Showcase Root** | `/srv/dse-erp/web/public` | `/srv/dse-erp/web/public` |
| **Web ERP Root** | `/srv/dse-erp/web/admin` | `/srv/dse-erp/web/admin` |
| **Web Server / SSL** | Caddy `/etc/caddy/Caddyfile` (Auto Let's Encrypt TLS & HTTP/3) | Caddy `/etc/caddy/Caddyfile` (Auto Let's Encrypt TLS & HTTP/3) |

---

## 3. Dual-Client Architecture & Pure Java Web Application

Both clients share the **exact same database and business rules**, but connect through separate, dedicated security filter chains inside `server/src/main/java/org/example/server/security/SecurityConfig.java`:

```
                                  MULTI-USER CLOUD PLATFORM
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         [ Desktop Client (JavaFX 25) ]                 [ Cloud Web UI (Vaadin Flow) ]
         70 FXML Pages (UNTOUCHED)                      Pure Java Views in server/
         Bearer JWT Auth (/api/**)                      Cookie CSRF + Session (/**)
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              │
                                              ▼
                             [ Spring Boot 4.1.0 Backend ]
                             (org.example.server - Port 8080 / 8081)
                             Dual-Chain SecurityConfig
                             227 Business Services & Repositories
                                              │
                                              ▼
                             [ Shared Pure Java Contracts ]
                             (org.example.shared)
                             DocumentCalculationEngine, PermissionCatalog,
                             AmountInWordsConverter, Code128Encoder
                                              │
                                              ▼
                             [ PostgreSQL Relational Database ]
                             (Single Source of Truth, 60+ Flyway Migrations)
```

### 3.1 Pure Java Web UI Standards
* **Zero HTML / Zero JS:** All web views are written in 100% pure Java using Vaadin Flow in `server/src/main/java/org/example/server/webui/`. No manual HTML or JS files are allowed.
* **State Management:** Java objects running on the server JVM handle state, validation, and database transactions natively. Server-push and WebSockets keep the client in sync.
* **Dual-Tier Security & Filter Chains (`SecurityConfig.java`):**
  * **Chain 1 (`@Order(1)` `/api/**`):** Stateless JWT Bearer token authentication (`SessionCreationPolicy.STATELESS`). Exclusively authenticates and serves the JavaFX Desktop Client.
  * **Chain 2 (`@Order(2)` `/**`):** Stateful cookie-based session security with CSRF protection, form login (`/login`), and automated Vaadin Flow route mappings. Exclusively serves browser web users.
* **Headless & Non-Web Test Isolation:**
  * Tests running with `webEnvironment = NONE` automatically suppress Vaadin auto-configurations via `VaadinNonWebEnvironmentPostProcessor.java`.
  * Integration tests requiring Spring context without web dependencies must exclude Vaadin configurations to prevent `NoSuchBeanDefinitionException: WebApplicationContext`.
* **Mandatory Standalone Production Mode (`vaadin.productionMode=true`):**
  * **CRITICAL:** `vaadin.productionMode=true` and `vaadin.whitelisted-packages=org.example.server.webui` MUST be explicitly declared in `application.properties`, `application-uat.yml`, and `application-prod.yml`.
  * **Exclusion of `vaadin-maven-plugin:prepare-frontend` in Pure Java Flow:**
    * For pure Java server-side Flow applications (without npm/Vite/Webpack), `vaadin-maven-plugin` MUST NOT execute `prepare-frontend` in `server/pom.xml`.
    * `prepare-frontend` ignores `<productionMode>true</productionMode>` and overwrites `flow-build-info.json` with development mode tokens (`productionMode: false` and `npmFolder: <runner-path>`), crashing cloud containers on boot.
    * Static `flow-build-info.json` with `{"productionMode": true, "eagerServerLoad": false}` in `server/src/main/resources/META-INF/VAADIN/config/` must be packaged directly by `maven-resources-plugin` untouched.
  * Without this setting, Spring Boot standalone JARs default to development mode in production and crash on Tomcat startup with:
    `IllegalStateException: Running project in development mode with no access to folder ... Build project in production mode instead`.
* **Reverse Proxy SSL Termination & Native Forward Headers:**
  * Embedded Tomcat behind reverse proxies (Caddy/Nginx) MUST have `server.forward-headers-strategy=native` enabled in `application.properties`.
  * This activates Tomcat's `RemoteIpValve` to inspect `X-Forwarded-Proto: https` and `X-Forwarded-For`. Without this setting, Spring Security and Vaadin generate redirects using plain `http://`, resulting in an infinite 308 redirect loop behind TLS reverse proxies.
* **Cloud Rollback & Version Bumping Protocol:**
  * When an automated cloud deployment gate triggers an automatic rollback (e.g. startup failure), **NEVER force-push, overwrite, or mutate an already-published release tag**.
  * Always advance the semantic version (e.g. `10.0.42` -> `10.0.43`), commit the fix, run `python scripts/audit-release-gates.py`, open a clean PR, merge to `main`, and push the new release tag.
* **PR Continuous Integration Gates:**
  * All PRs into `main` require 100% passing checks on:
    1. Cross-platform rerun policy
    2. PostgreSQL workflow integration
    3. Verify (Linux x64)
    4. Verify (Windows x64)
    5. Verify (macOS Apple Silicon)

---

## 4. Mandatory 7-Point First-Principle Inspection Checklist

> **CRITICAL RULE:** Before touching any code or responding to a feature request, Antigravity MUST execute this 7-point inspection against the desktop reference codebase (`c:\...\DSE-ERP-10.0.25`).
> **"Each and everything means each and everything."** Never build half-finished screens, never guess formulas, and **NEVER use mock or dummy data.**

### Point 1: Front-End & User Interface Structure
* Locate the desktop FXML & Controller in `desktop/src/main/java/org/example/controller/` and `desktop/src/main/resources/fxml/pages/`.
* Mirror exact layouts: tables, column ordering, headers, alignments, widths, summary cards, status badges, action buttons, side drawers, modals, and tabs.

### Point 2: Default Screen Open & Initialization Logic
* **Bootstrap APIs:** Determine what master data is loaded on screen init (e.g. `GET /api/master/sales-entry-bootstrap` for payment terms, GST types, transporters, customer dropdowns).
* **Default Filters:** Apply Desktop defaults: past 6 months (`today.minusMonths(6)` to `today`), active status filters, next sequence number generation, and default focus.

### Point 3: Dynamic Logic & Calculation Engines
* Inspect `DocumentCalculationEngine.java` in `shared/src/main/java/org/example/shared/`.
* Formula mandates:
  * **Item Taxable:** `Quantity * Rate * (1 - Discount% / 100)`
  * **Charges Taxable vs Non-Taxable:** Handle separately based on tax treatment.
  * **GST Splitting:** Intra-state (`GST`) -> `CGST = Round(Tax / 2)`, `SGST = Tax - CGST`. Inter-state (`IGST`) -> `IGST = Tax`, `CGST = 0`, `SGST = 0`.
  * **Rounding:** Exact decimal scales (2 decimals for currency, 4 for quantity/unit cost) using `RoundingMode.HALF_UP`.
  * **Grand Total:** `Item Taxable + Line Tax + Charges Amount + Charges Tax`.

### Point 4: API Endpoints, Payloads & DTO Contracts
* Inspect Spring Boot `@RestController` and DTOs in `server/src/main/java/org/example/server/`.
* Verify exact URL paths, HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`), query parameters, and JSON payload keys match 100%.

### Point 5: Database Schema & Master Data Models
* Inspect JPA entities and repositories (`LookupMaster`, `PartyMaster`, `ItemMaster`, `sales_header`, `purchase_header`, `payment_record`).
* Verify dropdown categories (`TRANSPORTER`, `CHARGE_TYPE`, `PAYMENT_TERMS`, `UNIT`, `PAYMENT_MODE`, `BANK_ACCOUNT`).
* Ensure foreign keys and constraints match PostgreSQL database schema.

### Point 6: UI Behaviors for Every Single Event
* **`onChange` / `onInput`:**
  * Select Customer -> auto-populate Billing Address, Shipping Address, GSTIN, State Code, default Payment Terms, Credit Limit.
  * Select Item -> auto-populate HSN/SAC, Unit, Sell Rate, Tax Rate.
  * Toggle GST Type -> trigger immediate recalculation of GST split.
* **Secondary Popups:** Additional Charges dialog (`DocumentChargeDialog`), Action Drawers (View, Audit, Edit, Duplicate, Print, Barcode, Excel, Payment, Cancel, Delete).

### Point 7: Functional Completeness & Error Handling
* Saving must persist real database records via the API.
* Errors and validation messages must match desktop wording.
* **RFC 7807 Compliance:** All API errors return `ProblemDetail` with `Content-Type: application/problem+json`.
* **Zero Mock Fallbacks:** Never return fake fallback arrays or dummy values.

---

## 5. Version Management & Release Automation Scripts

### 5.1 Version Governance
* **Desktop / Server Version:** Semantic versioning `X.Y.Z` governed by `.mvn/maven.config` (`-Drevision=10.0.44`).
* **Web Version:** `<DesktopMajor>.<DesktopMinor>.<DesktopPatch>.<WebBuild: 2 digits>` (e.g. `10.0.41.14`).
* **Release Notes:** Every release must update `desktop/src/main/resources/release-notes.md` so the in-app "What's New" dialog reflects the release highlights.

---

### 5.2 PowerShell Script 1: Desktop/Server Release & PR Automation
```powershell
$Version = "10.0.48"
$Note    = "Cloud Reverse Proxy & Vaadin Security Hardening: AntPathRequestMatcher and robust brace-balanced Caddy routing"

$Repo    = "ssdhameliya/DSE-ERP"
$Branch  = "release-$Version"
$Project = "D:\GitHub\DSE-ERP-Primary"
$Source  = "D:\GitHub\ReleaseSource"

$env:GIT_PAGER = "cat"
$env:GH_PAGER  = "cat"

function Check($Message) {
    if ($LASTEXITCODE -ne 0) { throw "STOP: $Message" }
}

Set-Location $Project

# 1. Clean main
git switch main
Check "Could not switch to main."
git fetch origin --prune
Check "Git fetch failed."
git reset --hard origin/main
Check "Could not reset main."

# 2. Remove old PR / Release branch
$OldPr = gh pr list --repo $Repo --head $Branch --state open --json number --jq '.[0].number'
if ($OldPr) {
    Write-Host "Closing old PR #$OldPr"
    gh pr close $OldPr --repo $Repo
}
if (git branch --list $Branch) {
    git branch -D $Branch
}
git ls-remote --exit-code --heads origin $Branch *> $null
if ($LASTEXITCODE -eq 0) {
    git push origin --delete $Branch
}

# 3. Create fresh release branch + copy source
git switch -c $Branch origin/main
Check "Could not create $Branch."
robocopy $Source $Project /MIR /COPY:DAT /R:1 /W:1 /XD .git target .idea
if ($LASTEXITCODE -gt 7) { throw "STOP: Robocopy failed with code $LASTEXITCODE." }

# 4. Verify version
$Revision = (Get-Content .mvn\maven.config).Trim()
if ($Revision -ne "-Drevision=$Version") {
    throw "STOP: Expected -Drevision=$Version but found '$Revision'."
}

# 5. Full build + release audit
mvn clean verify
Check "Maven regression failed."
python scripts/audit-release-gates.py
Check "Release audit failed."

# 6. Commit & Push
git add -A
git commit -m "Release v$Version - $Note"
Check "Commit failed."
git push -u origin $Branch
Check "GitHub push failed."

# 7. Create PR
gh pr create --repo $Repo --base main --head $Branch --title "Release v$Version - $Note" --body @"
Release v$Version

$Note

Validation completed:
- Version confirmed: $Version
- mvn clean verify
- scripts/audit-release-gates.py
- Verified release gates OK
"@
gh pr view $Branch --repo $Repo --web

# 8. Sync User's Local IntelliJ Workspace & Report Changes
$LocalUserCopy = "D:\JavaProject\DSE-ERP-Final"
robocopy $Source $LocalUserCopy /MIR /COPY:DAT /R:1 /W:1 /XD .git target .idea
Write-Host "Synchronized $Source -> $LocalUserCopy (Robocopy Exit Code: $LASTEXITCODE)"
```

---

### 5.3 PowerShell Script 2: Tag Push & Automated UAT Deployment
```powershell
$Version = "10.0.48"
$Note    = "Cloud Reverse Proxy & Vaadin Security Hardening: AntPathRequestMatcher and robust brace-balanced Caddy routing"
$Repo    = "ssdhameliya/DSE-ERP"

$env:GIT_PAGER = "cat"
$env:GH_PAGER  = "cat"

function Check($Message) {
    if ($LASTEXITCODE -ne 0) { throw "STOP: $Message" }
}

Set-Location "D:\GitHub\DSE-ERP-Primary"
git fetch origin main --tags
Check "Git fetch failed."
$Main = git rev-parse origin/main
$Revision = (git show origin/main:.mvn/maven.config).Trim()
if ($Revision -ne "-Drevision=$Version") {
    throw "STOP: origin/main is '$Revision', expected -Drevision=$Version."
}

$LocalExists = git tag -l "v$Version"
if ($LocalExists) {
    $LocalCommit = git rev-list -n 1 "v$Version"
    if ($LocalCommit -ne $Main) {
        throw "STOP: Existing local v$Version points to $LocalCommit instead of $Main."
    }
} else {
    git tag -a "v$Version" $Main -m "Release v$Version - $Note"
    Check "Could not create local tag."
}

$RemotePeeled = git ls-remote origin "refs/tags/v$Version^{}"
if (-not $RemotePeeled) {
    git push origin "v$Version"
    Check "GitHub tag push failed."
    Write-Host "Tag v$Version pushed successfully! Release & UAT deploy workflow triggered."
} else {
    Write-Host "Tag v$Version already exists on origin."
}
```

---

### 5.4 PowerShell Script 3: Web Application Release Script
```powershell
$WebVersion = "10.0.41.14" # Format: <DesktopVersion>.<WebBuild>
$Tag        = "web-v$WebVersion"
$Note       = "UAT release: Feature parity and UI improvements"

$WebWorking = "d:\ERP Website\admin"
$WebStaging = "D:\GitHub\ReleaseSource Website\admin"
$WebRepo    = "D:\GitHub\DSE-ERP-Enterprise"

# 1. Sync working directory to ReleaseSource staging and Enterprise repo
robocopy $WebWorking $WebStaging /MIR /R:1 /W:1 /XD .git .idea
robocopy $WebWorking "$WebRepo\web\admin" /MIR /R:1 /W:1 /XD .git .idea

# 2. Stage, commit, tag, and push in GitHub Enterprise repo
Set-Location $WebRepo
git switch main
git pull origin main
git add web/admin
git commit -m "Web Release $Tag: $Note"
git tag -a $Tag -m "Release $Tag - $Note"
git push origin main
git push origin $Tag

Write-Host "Deployed to UAT: https://erp-uat.jasviindustries.in/admin/"
```

---

## 6. Cloud Deployment & OCI Production Reference

### 6.1 Systemd Service Unit (`/etc/systemd/system/portal.service`)
```ini
[Unit]
Description=DSE-ERP Cloud Platform Service
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=opc
Group=opc
WorkingDirectory=/srv/dse-erp
ExecStart=/usr/bin/java \
    -XX:+UseZGC \
    -XX:+ZGenerational \
    -Xms2g -Xmx6g \
    -Dspring.profiles.active=prod \
    -Dfile.encoding=UTF-8 \
    -jar /srv/dse-erp/dse-erp-server.jar
Restart=always
RestartSec=10
LimitNOFILE=65536
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 6.2 Caddy Reverse Proxy Configuration (`/etc/caddy/Caddyfile`)
```caddy
# Public Showcase
jasviindustries.in, www.jasviindustries.in {
    root * /srv/dse-erp/web/public
    file_server
    encode gzip zstd
}

# Production Web ERP Studio
erp.jasviindustries.in {
    reverse_proxy 127.0.0.1:8080 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    encode gzip zstd
}

# Production Backend REST API
api.jasviindustries.in {
    reverse_proxy 127.0.0.1:8080
    encode gzip zstd
}

# UAT Web ERP Testing Studio
erp-uat.jasviindustries.in {
    reverse_proxy 127.0.0.1:8081 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    encode gzip zstd
}
```

### 6.3 PostgreSQL OCI Production Tuning (`postgresql.conf`)
* **`shared_buffers`**: `2560MB` (25% of total RAM on 12GB instances)
* **`effective_cache_size`**: `6GB` (50–75% of total RAM)
* **`work_mem`**: `16MB`
* **`maintenance_work_mem`**: `512MB`
* **`listen_addresses`**: `'127.0.0.1'` (Loopback-only binding; protected behind local firewall/proxy)
* **`max_connections`**: `100`
