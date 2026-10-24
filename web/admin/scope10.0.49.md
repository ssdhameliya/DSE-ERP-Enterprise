# DSE ERP Scope & Architecture Transition — Release v10.0.49

> **Date:** October 24, 2026  
> **Status:** ACTIVE RELEASE CANDIDATE (v10.0.49)  
> **Governance:** `dse-erp-master-protocol.md`  
> **Primary Goal:** Eliminate login 302 redirect loop on Cloud UAT & PROD; Integrate official `VaadinSecurityConfigurer.vaadin()`; Permit `FORWARD` & `ERROR` dispatcher types in Spring Security; Fix Caddy script candidate cleanup privileges.

---

## 1. Root Cause Analysis

### 1.1 Spring Security Internal Forward Authorization (Redirect Loop)
- **Symptom:** Visiting `https://erp-uat.jasviindustries.in/login` resulted in `HTTP/1.1 302 Found Location: https://erp-uat.jasviindustries.in/login`, looping infinitely up to curl's 50 redirect limit.
- **Root Cause:** In Spring Security 6/7, `authorizeHttpRequests` by default inspects all `DispatcherType` dispatches (`REQUEST`, `FORWARD`, `ERROR`, `ASYNC`). When Vaadin Flow receives a request for `/login`, its internal servlet engine forwards the request to the root application handler. Because `DispatcherType.FORWARD` was not explicitly permitted in `vaadinFilterChain`, Spring Security intercepted the internal forward to `/`, treated it as an unauthenticated request to a protected endpoint, and invoked `authenticationEntryPoint`, which executed `response.sendRedirect("/login")`.
- **Resolution:**
  1. Integrated official `VaadinSecurityConfigurer.vaadin()` into `vaadinFilterChain` via `http.with(...)`, setting `loginView(VaadinLoginView.class)` and `defaultSuccessUrl("/", true)`.
  2. Added `.dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR).permitAll()` to `authorizeHttpRequests`, ensuring Spring Security permits all internal container forwards and error dispatches.

### 1.2 Candidate File Removal Permission Bug in Caddy Script
- **Symptom:** `scripts/linux/configure-caddy-uat.sh` failed during GitHub Actions execution with `rm: cannot remove '/tmp/Caddyfile.candidate': Operation not permitted`.
- **Root Cause:** `/tmp/Caddyfile.candidate` is created by Python running under `sudo` (owned by `root:root`). At script termination, line 136 ran unprivileged `rm -f "$TMP"`, which the Linux kernel rejected on `/tmp` with sticky bit `+t`.
- **Resolution:** Changed line 136 in both `configure-caddy-uat.sh` and `configure-caddy-prod.sh` to `sudo rm -f "$TMP"`.

---

## 2. Release & Verification Protocol

1. **Version Governance:**
   - Single source of truth `.mvn/maven.config`: `-Drevision=10.0.49`.
   - Release highlights in `desktop/src/main/resources/release-notes.md`.
   - Clean audit gate verification: `RELEASE_GATES_CURRENT_OK version=10.0.49`.
2. **Mirror Staging Sync:**
   - Active dev workspace -> `D:\GitHub\ReleaseSource`.
   - Release staging -> `D:\GitHub\DSE-ERP-Primary` (`main` branch via PR).
   - Release staging -> `D:\JavaProject\DSE-ERP-Final` (User's protected IntelliJ copy, excluding `.git`, `target`, `.idea`).
3. **Continuous Integration & Auto-Deployment:**
   - PR opened and all 5 CI checks verified 100% green.
   - Tag `v10.0.49` created and pushed to origin.
   - GitHub Actions `release.yml` builds server JAR, packages desktop installers, deploys to UAT (`144.24.109.1`), and deploys to PROD (`130.210.35.1`).
   - Run Caddy configuration workflows to apply reverse proxy rules and verify live HTTP 200 OK responses on `/login`.
