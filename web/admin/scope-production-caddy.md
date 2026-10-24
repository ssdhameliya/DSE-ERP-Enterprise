# DSE ERP — SCOPE: PRODUCTION CLOUD WEB ROUTING & REVERSE PROXY TRANSITION
## Complete End-to-End Specification: Transitioning `erp.jasviindustries.in` to Pure Java Vaadin Flow Web UI

> **Document Status:** 📋 ACTIVE SPECIFICATION  
> **Target Release:** `10.0.46` / `10.0.47`  
> **Production Server IP:** `130.210.35.1`  
> **Production Port:** `8080` (Spring Boot Embedded Tomcat)  
> **Production Web Endpoint:** `https://erp.jasviindustries.in/`  
> **Production Health Endpoint:** `https://api.jasviindustries.in/api/runtime/health`  
> **Local Workspaces Protected:** `D:\JavaProject\DSE-ERP-Final`, `D:\DSE Production` (Port 55432)  

---

## 1. Executive Summary & Root Cause Analysis

### Current State on Production (`130.210.35.1`):
1. **Spring Boot Backend:**
   - Runs on port `8080` connected to production PostgreSQL `dse_erp_prod`.
   - Verified active and healthy at `https://api.jasviindustries.in/api/runtime/health`.
   - Contains all 38 pure Java Vaadin Flow Web UI views (`server/src/main/java/org/example/server/webui/`).
2. **The Discrepancy on Production:**
   - Visiting `https://erp.jasviindustries.in/` renders static HTML/JS from `/srv/dse-erp/web/admin` via Caddy's `file_server` (`Content-Length: 362417`).
   - Caddy on the production server is configured to serve static assets for `erp.jasviindustries.in` instead of reverse proxying to `127.0.0.1:8080`.
3. **The Reverse Proxy SSL Header Hardening:**
   - Embedded Tomcat requires `server.forward-headers-strategy=native` (implemented in `10.0.46`) to read `X-Forwarded-Proto: https` from Caddy, preventing redirect loops during login.

---

## 2. Architecture & Implementation Matrix

| Component | Production Current State | Production Target State |
| :--- | :--- | :--- |
| **Spring Boot Forward Headers** | Handled in `10.0.46` | `server.forward-headers-strategy=native` active on port 8080 |
| **Production Caddy Routing** | `file_server` (`/srv/dse-erp/web/admin`) | `reverse_proxy 127.0.0.1:8080` for `erp.jasviindustries.in` |
| **Caddy Header Forwarding** | Default | `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` passed to Tomcat |
| **Caddy WebSocket Support** | Default | Native bidirectional support for Vaadin Flow server push |
| **Deployment Automation** | Manual SSH editing | Automated GitHub Actions workflow `.github/workflows/deploy-prod-caddy.yml` |
| **Safety & Rollback** | None | Automatic backup to `/etc/caddy/Caddyfile.pre-vaadin-web` with `caddy validate` and trap rollback |

---

## 3. Configuration Artifacts

### 3.1 Production Caddy Script: `scripts/linux/configure-caddy-prod.sh`
- Targets `erp.jasviindustries.in -> 127.0.0.1:8080`.
- Backs up existing `/etc/caddy/Caddyfile` to `/etc/caddy/Caddyfile.pre-vaadin-web`.
- Generates candidate configuration in `/tmp/Caddyfile.candidate`.
- Validates candidate via `caddy validate --config /tmp/Caddyfile.candidate`.
- Atomically installs via `install -o root -g root -m 644`.
- Reloads Caddy via `systemctl reload caddy`.
- Automatically restores backup and reloads if validation or reload fails.

### 3.2 GitHub Actions Workflow: `.github/workflows/deploy-prod-caddy.yml`
- Environment: `production` (uses GitHub environment secrets for `130.210.35.1`).
- Step 1: Pre-flight health check on `https://api.jasviindustries.in/api/runtime/health`.
- Step 2: Strict SSH key and known-hosts verification.
- Step 3: Secure SCP upload and execution of `configure-caddy-prod.sh`.
- Step 4: Verification of `https://erp.jasviindustries.in/login` returning HTTP 200/302.

---

## 4. Rollout & Verification Sequence

1. **Tag `v10.0.46` Pipeline:**
   - `release.yml` builds `DSE-ERP-10.0.46-SERVER.jar`.
   - Deploys and verifies health on UAT (`144.24.109.1`).
   - Deploys and verifies health on PROD (`130.210.35.1`).
   - Promotes release to STABLE and LATEST.
2. **Configure UAT Caddy:**
   - Trigger `deploy-uat-caddy.yml`.
   - Verify `https://erp-uat.jasviindustries.in/login` renders the Vaadin Web UI.
3. **Merge Production Caddy Automation & Trigger PROD Caddy:**
   - Push `configure-caddy-prod.sh` and `deploy-prod-caddy.yml`.
   - Trigger `deploy-prod-caddy.yml`.
   - Verify `https://erp.jasviindustries.in/login` renders the Vaadin Web UI.
