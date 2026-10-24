# DSE ERP — SCOPE 10.0.46: CLOUD WEB ROUTING & REVERSE PROXY TRANSITION
## Complete End-to-End Scope: Transitioning `erp-uat.jasviindustries.in` from Legacy Static HTML/JS to Pure Java Vaadin Flow Web UI

> **Document Status:** 📋 APPROVED & ACTIVE SPECIFICATION  
> **Target Release Version:** `10.0.46`  
> **Target Workspaces:**  
> - Dev Working Directory: `c:\Users\JATIN DHAMELIYA\Downloads\DSE-ERP-10.0.25-INTELLIJ-READY-FINAL-V19\DSE-ERP-10.0.25`  
> - Release Staging: `D:\GitHub\ReleaseSource`  
> - GitHub Repository: `D:\GitHub\DSE-ERP-Primary` (`ssdhameliya/DSE-ERP`)  
> - User Local IntelliJ Copy: `D:\JavaProject\DSE-ERP-Final`  
> - Live UAT Environment: `https://erp-uat.jasviindustries.in/` (Server IP: `144.24.109.1`)  
> - Live PROD Environment: `https://erp.jasviindustries.in/` (Server IP: `130.210.35.1`)  

---

## 1. Executive Summary & Root Cause Analysis

### The Current State:
1. **Spring Boot Backend (`10.0.45`):**
   - The pure Java Vaadin Flow web application (38 views in `server/src/main/java/org/example/server/webui/`) is packaged inside `DSE-ERP-10.0.45-SERVER.jar`.
   - Successfully running on UAT port `8081` and PROD port `8080`.
   - Health endpoint verified 100% green: `https://api-uat.jasviindustries.in/api/runtime/health`.
2. **The Discrepancy:**
   - Visiting `https://erp-uat.jasviindustries.in/admin/` continues to render the legacy static HTML/JS website (`d:\ERP Website\admin`).
   - Root Cause: Caddy on the UAT server (`144.24.109.1`) currently points `erp-uat.jasviindustries.in` to the disk directory `/srv/dse-erp/web/admin` via `file_server`, rather than proxying to the Spring Boot application on port `8081`.
3. **The Reverse Proxy SSL Redirect Loop:**
   - Without `server.forward-headers-strategy=native` in Spring Boot, requests terminated by Caddy over HTTPS are seen by embedded Tomcat as plain HTTP.
   - Any redirect issued by Spring Security (e.g. `/` -> `/login`) sends `Location: http://...`, causing an infinite 308 redirect loop with Caddy.

---

## 2. Scope & Implementation Matrix

| Component | Current State | Required Target State |
| :--- | :--- | :--- |
| **Spring Boot Forward Headers** | Not configured | `server.forward-headers-strategy=native` in `application.properties` |
| **UAT Caddy Routing** | `root * /srv/dse-erp/web/admin` + `file_server` | `reverse_proxy 127.0.0.1:8081` for `erp-uat.jasviindustries.in` |
| **UAT Caddy WebSocket Support** | None on erp-uat | Automatic via Caddy `reverse_proxy` to support Vaadin Server Push |
| **Automated Deployment Workflow** | Manual server SSH edits | Secure GitHub Actions workflow `.github/workflows/deploy-uat-caddy.yml` |
| **Semantic Version** | `10.0.45` | Bumped to `10.0.46` |
| **User Local IntelliJ Copy** | `10.0.45` synced | Synchronized to `10.0.46` with file change report |

---

## 3. Step-by-Step Execution Plan

### Step 1: Spring Boot Reverse Proxy Header Hardening
In `server/src/main/resources/application.properties`:
```properties
# Forward headers strategy for Caddy / Nginx reverse proxy SSL termination
server.forward-headers-strategy=native
```

### Step 2: Caddy Reverse Proxy Automation Workflow
Create `.github/workflows/deploy-uat-caddy.yml` and `scripts/linux/configure-caddy-uat.sh`:
- Safely updates `/etc/caddy/Caddyfile` on the UAT VM (`144.24.109.1`).
- Preserves a local backup `/etc/caddy/Caddyfile.pre-vaadin-web`.
- Updates `erp-uat.jasviindustries.in` to `reverse_proxy 127.0.0.1:8081`.
- Automatically tests syntax with `caddy validate` and reloads with `systemctl reload caddy`.
- Automatically rolls back if health verification fails.

### Step 3: Semantic Version Bump to `10.0.46`
- `.mvn/maven.config` (`-Drevision=10.0.46`)
- `desktop/src/main/resources/release-notes.md`
- `dse-erp-master-protocol.md`

### Step 4: Verification & Release Pipeline
1. Run `python scripts/audit-release-gates.py`.
2. Sync `ReleaseSource` and User's Local IntelliJ Workspace (`D:\JavaProject\DSE-ERP-Final`) with change reporting.
3. Commit and push to branch `release-10.0.46`.
4. Open PR #63, wait for 100% green checks on all 5 CI platforms.
5. Push tag `v10.0.46` to trigger native release & UAT deploy.
6. Trigger Caddy proxy update and verify `https://erp-uat.jasviindustries.in/login` renders the pure Java Vaadin Web UI!
