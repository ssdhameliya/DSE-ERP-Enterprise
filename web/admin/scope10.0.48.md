# DSE ERP Scope 10.0.48 — Pure Java Vaadin Web UI & Caddy Reverse Proxy Hardening

> **Release Version**: `10.0.48`  
> **Target Production URL**: `https://erp.jasviindustries.in/` (Port `8080`)  
> **Target UAT URL**: `https://erp-uat.jasviindustries.in/` (Port `8081`)  
> **Architecture Standard**: Zero HTML, Zero JavaScript — 100% Pure Java Vaadin Flow Web UI  
> **Constitution & Guidelines**: `dse-erp-master-protocol.md`  

---

## 1. Executive Summary & Problem Diagnosis

### 1.1 The Issue: Legacy Static HTML/JS Served Instead of Pure Java Vaadin UI
Although `DSE-ERP-10.0.47-SERVER.jar` successfully built and deployed to both UAT (`144.24.109.1:8081`) and PROD (`130.210.35.1:8080`) with `https://api-uat.jasviindustries.in/api/runtime/health` reporting healthy, navigating to `https://erp-uat.jasviindustries.in/` still served the legacy static HTML/JS frontend from `/srv/dse-erp/web/admin`.

### 1.2 Root Cause Analysis
1. **The Caddyfile Block Parser Defect**:
   - In `/etc/caddy/Caddyfile`, the legacy configuration for `erp-uat.jasviindustries.in` contained:
     ```caddy
     erp-uat.jasviindustries.in {
         handle /api/* {
             reverse_proxy 127.0.0.1:8081
         }
         root * /srv/dse-erp/web/admin
         file_server
     }
     ```
   - In `configure-caddy-uat.sh`, the detection regex was `pattern = r'(?ms)^[ \t]*erp-uat\.jasviindustries\.in\b[^{]*\{.*?\n\}'`.
   - The non-greedy `.*?` terminated at the **first closing brace `}`**, which matched only the inner `handle /api/* { reverse_proxy 127.0.0.1:8081 }` sub-block.
   - Because `reverse_proxy` and `8081` were found in that inner snippet, the script printed `ALREADY_CONFIGURED` and exited without replacing the block. The outer `file_server` remained active, continuing to serve static HTML.
2. **Spring Security 6 MvcRequestMatcher vs VaadinServlet**:
   - In `SecurityConfig.java` Chain 2 (`vaadinFilterChain`), public paths (`/login`, `/VAADIN/**`, `/vaadinServlet/**`) were declared using raw strings: `.requestMatchers("/login", ...).permitAll()`.
   - Under Spring Boot 3 / Spring Security 6 with Spring Web on the classpath, raw string matchers default to `MvcRequestMatcher`, which consults Spring MVC's `HandlerMappingIntrospector`.
   - Because `VaadinLoginView` is registered in Vaadin's internal route table rather than as a Spring MVC `@Controller`, `MvcRequestMatcher` fails to match `/login`.
   - The request falls through to `.anyRequest().authenticated()`, triggering `authenticationEntryPoint` which redirected to `/login`, causing a 302 redirect loop.

---

## 2. Engineering Remediation & Implementation

### 2.1 Robust Brace-Balanced Caddyfile Parser
Replaced the regex in both `scripts/linux/configure-caddy-uat.sh` and `scripts/linux/configure-caddy-prod.sh` with a character-level brace-counting parser (`extract_blocks`):
- Accurately captures top-level server blocks regardless of internal nesting (`handle`, `route`, or directives with braces).
- Checks whether `file_server`, `root `, or `handle /api` remain in the block.
- If present, cleanly replaces the entire block with the authoritative reverse proxy specification:
  ```caddy
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
  (and port `8080` for Production `erp.jasviindustries.in`).

### 2.2 Vaadin Spring Security AntPathRequestMatcher & Loop Guard
In `server/src/main/java/org/example/server/security/SecurityConfig.java`:
- Imported `static org.springframework.security.web.util.matcher.AntPathRequestMatcher.antMatcher`.
- Configured all Vaadin public resources and `/login` using `antMatcher(...)` so matching occurs directly on the HTTP servlet request path.
- Added loop guard to `authenticationEntryPoint`:
  ```java
  .authenticationEntryPoint((request, response, error) -> {
      String uri = request.getRequestURI();
      if (uri != null && uri.startsWith("/login")) {
          return;
      }
      response.sendRedirect("/login");
  })
  ```

---

## 3. Release & Verification Pipeline

1. **Version Governance**: Advance to `10.0.48` across `.mvn/maven.config`, `release-notes.md`, and master protocol.
2. **Release Audit**: Run `python scripts/audit-release-gates.py` ensuring `RELEASE_GATES_CURRENT_OK`.
3. **PR & CI Validation**: Open PR #65 on `release-10.0.48`, pass all 5 cross-platform verification gates, and merge to `main`.
4. **Tag & OCI Cloud Deployment**: Push tag `v10.0.48` to trigger `release.yml`, building native jar and deploying to UAT (`144.24.109.1:8081`) and PROD (`130.210.35.1:8080`).
5. **Caddy Workflows Execution**:
   - Run `deploy-uat-caddy.yml` -> reconfigures Caddy on UAT, validates `erp-uat.jasviindustries.in/login`.
   - Run `deploy-prod-caddy.yml` -> reconfigures Caddy on PROD, validates `erp.jasviindustries.in/login`.
6. **Live End-to-End Visual Verification**:
   - Use browser subagent to navigate to live UAT and PROD URLs, confirming rendering of `VaadinLoginView` and the pure Java web interface.
7. **Protected Local Synchronization**:
   - Synchronize `D:\JavaProject\DSE-ERP-Final` and report exact file counts.
