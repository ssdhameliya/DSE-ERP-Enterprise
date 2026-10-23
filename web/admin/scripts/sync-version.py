#!/usr/bin/env python3
"""
DSE ERP Admin Studio - Single File Version Synchronization Script
Usage:
    python scripts/sync-version.py                    # Syncs all files from version.json
    python scripts/sync-version.py --bump             # Increments build, bumps version
    python scripts/sync-version.py --version 10.0.41.12 --summary "Your summary"
"""

import os
import sys
import json
import re
from datetime import datetime, timezone, timedelta

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    version_json_path = os.path.join(root, "version.json")
    version_js_path = os.path.join(root, "js", "version.js")
    index_html_path = os.path.join(root, "index.html")

    if not os.path.exists(version_json_path):
        print(f"Error: {version_json_path} not found")
        sys.exit(1)

    with open(version_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    bump = "--bump" in sys.argv
    set_ver = None
    summary = None

    for i, arg in enumerate(sys.argv):
        if arg in ("--version", "-v") and i + 1 < len(sys.argv):
            set_ver = sys.argv[i + 1]
        elif arg in ("--summary", "-s") and i + 1 < len(sys.argv):
            summary = sys.argv[i + 1]

    # India Standard Time (UTC+05:30)
    ist = timezone(timedelta(hours=5, minutes=30))
    now_str = datetime.now(ist).strftime("%Y-%m-%dT%H:%M:%S+05:30")

    if bump:
        data["webBuild"] = int(data.get("webBuild", 0)) + 1
        parts = data.get("webVersion", "10.0.41.0").split(".")
        if len(parts) >= 4:
            parts[3] = f"{data['webBuild']:02d}"
            data["webVersion"] = ".".join(parts)
        else:
            data["webVersion"] = f"{data['desktopVersion']}.{data['webBuild']}"
        data["tag"] = f"web-v{data['webVersion']}"
        data["releaseDate"] = now_str

    if set_ver:
        data["webVersion"] = set_ver
        parts = set_ver.split(".")
        if len(parts) >= 4:
            data["webBuild"] = int(parts[3])
            data["desktopVersion"] = ".".join(parts[:3])
        data["tag"] = f"web-v{set_ver}"
        data["releaseDate"] = now_str

    if summary:
        data["summary"] = summary

    # 1. Update version.json
    with open(version_json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f" [1/3] Updated version.json -> {data['webVersion']} (Build {data['webBuild']})")

    # 2. Generate js/version.js
    hl_str = ""
    if data.get("highlights"):
        items = ",\n".join(f'    "{h}"' for h in data["highlights"])
        hl_str = f",\n  highlights: [\n{items}\n  ]"

    safe_summary = data.get("summary", "").replace('"', '\\"')
    js_content = f"""/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {{
  version: "{data['webVersion']}",
  desktopVersion: "{data['desktopVersion']}",
  webBuild: {data['webBuild']},
  webVersion: "{data['webVersion']}",
  tag: "{data['tag']}",
  releaseDate: "{data['releaseDate']}",
  environment: "{data.get('environment', 'Production / Enterprise')}",
  summary: "{safe_summary}"{hl_str}
}};

// Automatic UI Version Injection
(function() {{
  function syncVersionToDOM() {{
    const v = window.DSE_VERSION;
    if (!v) return;

    // 1. Login Page Version Badge
    const loginBadge = document.getElementById('auth-app-version-badge') || document.querySelector('.auth-brand-version-badge');
    if (loginBadge) {{
      loginBadge.textContent = `Version ${{v.webVersion}}`;
      loginBadge.setAttribute('title', `Desktop Baseline: v${{v.desktopVersion}} | Build #${{v.webBuild}}`);
    }}

    // 2. Login Page Desktop Baseline Tag
    const desktopTag = document.getElementById('auth-desktop-baseline');
    if (desktopTag) {{
      desktopTag.textContent = `Desktop Baseline: v${{v.desktopVersion}}`;
    }}

    // 3. App Header Web Version Badge (if present)
    const headerBadge = document.getElementById('header-app-version-badge');
    if (headerBadge) {{
      headerBadge.textContent = `v${{v.webVersion}}`;
      headerBadge.setAttribute('title', `Web Studio Build ${{v.webVersion}} (Desktop ${{v.desktopVersion}})`);
    }}

    // 4. Profile Menu Footer Version
    const profileFooter = document.getElementById('menu-version-footer');
    if (profileFooter) {{
      profileFooter.innerHTML = `<span>Web Studio</span><span style="color: var(--cyan); font-weight: 600;">v${{v.webVersion}}</span>`;
    }}
  }}

  if (document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', syncVersionToDOM);
  }} else {{
    syncVersionToDOM();
  }}
}})();
"""
    with open(version_js_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print(f" [2/3] Generated js/version.js -> {data['webVersion']}")

    # 3. Synchronize index.html
    if os.path.exists(index_html_path):
        with open(index_html_path, "r", encoding="utf-8") as f:
            html = f.read()

        # Update static badge
        html = re.sub(
            r'(<span[^>]*id="auth-app-version-badge"[^>]*>)[^<]*(</span>)',
            rf'\g<1>Version {data["webVersion"]}\g<2>',
            html
        )
        # Update baseline
        html = re.sub(
            r'(id="auth-desktop-baseline"[^>]*>Desktop Baseline:\s*)v[0-9.]+',
            rf'\g<1>v{data["desktopVersion"]}',
            html
        )
        # Update all ?v=... tags
        matches = len(re.findall(r'\?v=[0-9A-Za-z\.\-]+"', html))
        html = re.sub(r'\?v=[0-9A-Za-z\.\-]+"', f'?v={data["webVersion"]}"', html)

        with open(index_html_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f" [3/3] Synchronized index.html -> updated badge and {matches} cache-busting script/link tags")

    print(f"\nSUCCESS: Version {data['webVersion']} synchronized across all files!")

if __name__ == "__main__":
    main()
