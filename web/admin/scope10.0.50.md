# DSE ERP Scope & Architecture Transition — Release v10.0.50

> **Date:** October 24, 2026  
> **Status:** ACTIVE RELEASE CANDIDATE (v10.0.50)  
> **Governance:** `dse-erp-master-protocol.md`  
> **Primary Goal:** Resolve Cloud UAT/PROD HTTP 500 error on `/login` (`IOException: Unable to find index.html`); Package precompiled Vaadin Flow frontend bundle, `stats.json`, and `index.html` into server classpath.

---

## 1. Root Cause Analysis

### 1.1 Classpath Webapp Index HTML Missing in Production Mode
- **Symptom:** After successfully eliminating the Spring Security 302 redirect loop and switching Caddy reverse proxy to port 8081 (`erp-uat.jasviindustries.in`), visiting `https://erp-uat.jasviindustries.in/login` returned `HTTP 500 Internal Server Error`:
  ```
  at com.vaadin.flow.server.communication.IndexHtmlRequestHandler.synchronizedHandleRequest(IndexHtmlRequestHandler.java:104)
  at com.vaadin.flow.server.communication.IndexHtmlRequestHandler.handleRequest(IndexHtmlRequestHandler.java:70)
  at com.vaadin.flow.server.VaadinService.handleRequest(VaadinService.java:1578)
  at com.vaadin.flow.server.VaadinServlet.service(VaadinServlet.java:402)
  ...
  java.io.IOException: Unable to find index.html. It should be available on the classpath
  ```
- **Root Cause:**
  1. `IndexHtmlRequestHandler` in production mode executes `FrontendUtils.getIndexHtmlContent(service)`, which queries `ResourceProvider.getApplicationResource("META-INF/VAADIN/webapp/index.html")`.
  2. Because `vaadin-maven-plugin:prepare-frontend` was excluded to prevent local filesystem folder validation crashes on OCI Linux runners, no `index.html` was generated into `server/src/main/resources/META-INF/VAADIN/webapp/`.
  3. Furthermore, `com.vaadin:vaadin-prod-bundle` (which provides the precompiled production bundle, stats manifest, and component scripts) was not declared in `server/pom.xml`.

---

## 2. Architectural Resolution

1. **Precompiled Production Bundle Dependency (`server/pom.xml`):**
   - Added managed dependency `com.vaadin:vaadin-prod-bundle` aligned with `vaadin-bom` (`25.0-SNAPSHOT`).
2. **Embedded Webapp Classpath Packaging (`server/src/main/resources/META-INF/VAADIN/webapp/`):**
   - Packaged standard `index.html`, `index.html.br`, service worker (`sw.js`), and precompiled Flow component build chunks (`VAADIN/build/*`) directly into `META-INF/VAADIN/webapp/`.
3. **Production Configuration Alignment (`server/src/main/resources/META-INF/VAADIN/config/`):**
   - Embedded production `flow-build-info.json`, `stats.json`, and `bundle-size.html` directly into `META-INF/VAADIN/config/` so `ProdBundleUtils.findBundleStatsJson` and `StaticFileServer` can locate all assets without needing any node/npm/Vite tools at build or runtime.

---

## 3. Verification & Deployment Sequence

1. **Version Governance:**
   - Single source of truth `.mvn/maven.config`: `-Drevision=10.0.50`.
   - Release highlights in `desktop/src/main/resources/release-notes.md`.
   - Protocol automation updated in `c:\Users\JATIN DHAMELIYA\.gemini\config\rules\dse-erp-master-protocol.md`.
   - Clean audit gate verification: `RELEASE_GATES_CURRENT_OK version=10.0.50`.
2. **Synchronize Release Staging:**
   - Active dev workspace -> `D:\GitHub\ReleaseSource`.
   - Release staging -> `D:\GitHub\DSE-ERP-Primary` (`release-10.0.50` branch -> PR).
   - Release staging -> `D:\JavaProject\DSE-ERP-Final` (User's protected IntelliJ copy, reporting file count).
3. **CI Gates & Deployment:**
   - Verify all 5 CI checks pass on GitHub Actions PR #67.
   - Merge PR into `main` and push tag `v10.0.50`.
   - Monitor `release.yml` automated build, UAT deployment, and PROD deployment.
4. **Caddy Reverse Proxy Verification:**
   - Verify `curl -IL https://erp-uat.jasviindustries.in/login` returns `HTTP 200 OK` (Vaadin Flow HTML served cleanly).
   - Trigger `deploy-prod-caddy.yml` and verify `https://erp.jasviindustries.in/login` returns `HTTP 200 OK`.

---

## 4. Live Production & UAT Verification Results

### 4.1 UAT Verification (`https://erp-uat.jasviindustries.in/login`)
- **Status:** `HTTP/1.1 200 OK`
- **Application Engine:** Pure Java Vaadin Flow on Spring Boot Embedded Tomcat (`127.0.0.1:8081`)
- **Security:** `JSESSIONID` (HttpOnly, Secure), `XSRF-TOKEN`, `_csrf` form interception
- **Frontend Assets:** `META-INF/VAADIN/webapp/VAADIN/build/indexhtml-DSQvroCB.js` (`HTTP 200 OK`, 342,777 bytes)
- **API Runtime Health:** `https://api-uat.jasviindustries.in/api/runtime/health` -> `ready: true`, `version: 10.0.50`, `environment: UAT`

### 4.2 Production Verification (`https://erp.jasviindustries.in/login`)
- **Status:** `HTTP/1.1 200 OK`
- **Cutover Workflow:** `deploy-prod-caddy.yml` Run `40104737789` (Completed 100% Green in 24s)
- **Application Engine:** Pure Java Vaadin Flow on Spring Boot Embedded Tomcat (`127.0.0.1:8081` detected dynamically)
- **Proxy Server:** Caddy 2 reverse proxy with zstd/gzip compression
- **Security:** `JSESSIONID` (HttpOnly, Secure), `XSRF-TOKEN`, `_csrf` form interception
- **Frontend Assets:** `META-INF/VAADIN/webapp/VAADIN/build/indexhtml-DSQvroCB.js` (`HTTP 200 OK`)
- **API Runtime Health:** `https://api.jasviindustries.in/api/runtime/health` -> `ready: true`, `version: 10.0.50`, `environment: PROD`, `databaseName: dse_erp_prod`
- **Legacy Static HTML Cutover:** Fully deprecated and replaced. Both UAT and PROD are now 100% Pure Java Vaadin Flow Web UI.

