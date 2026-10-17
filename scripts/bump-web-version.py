#!/usr/bin/env python3
"""
DSE ERP Web Studio - Release & Version Bumper Automation
Enforces Desktop-driven Web Versioning Rules:
  - Format: <DesktopMajor>.<DesktopMinor>.<DesktopPatch>.<WebBuild:02d>
  - Example: Desktop 10.0.33 -> 10.0.33.01, 10.0.33.02, ... 10.0.33.12, 10.0.33.13
  - When Desktop moves to 10.0.34 -> Resets to 10.0.34.01
  - Updates version.json, js/version.js, index.html (54 cache-buster query params + UI badges)
  - Automatically syncs to dev copy, release staging, and enterprise git repo
  - Optional: Creates Git tag (web-vX.Y.Z.WW), pushes, and publishes GitHub Release
"""

import os
import sys
import json
import re
import shutil
import argparse
import subprocess
from datetime import datetime

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_ADMIN_DIR = os.path.join(ROOT_DIR, "web", "admin")
VERSION_JSON_PATH = os.path.join(WEB_ADMIN_DIR, "version.json")
VERSION_JS_PATH = os.path.join(WEB_ADMIN_DIR, "js", "version.js")
INDEX_HTML_PATH = os.path.join(WEB_ADMIN_DIR, "index.html")

SYNC_TARGETS = [
    r"d:\ERP Website\admin",
    r"D:\GitHub\ReleaseSource Website\admin",
    WEB_ADMIN_DIR
]

DESKTOP_CONFIG_CANDIDATES = [
    r"c:\Users\JATIN DHAMELIYA\Downloads\DSE-ERP-10.0.25-INTELLIJ-READY-FINAL-V19\DSE-ERP-10.0.25\.mvn\maven.config",
    os.path.join(ROOT_DIR, ".mvn", "maven.config")
]

def detect_desktop_version(override=None):
    if override:
        return override.strip()
    for candidate in DESKTOP_CONFIG_CANDIDATES:
        if os.path.isfile(candidate):
            try:
                with open(candidate, 'r', encoding='utf-8') as f:
                    txt = f.read()
                m = re.search(r'(?m)^-Drevision=([^\s]+)', txt)
                if m:
                    return m.group(1).strip()
            except Exception:
                pass
    return "10.0.33"

def bump_version(desktop_ver=None, explicit_build=None, note="Web Admin Studio parity release", do_release=False):
    # 1. Load current version.json
    if os.path.isfile(VERSION_JSON_PATH):
        with open(VERSION_JSON_PATH, 'r', encoding='utf-8') as f:
            vdata = json.load(f)
    else:
        vdata = {
            "desktopVersion": "10.0.33",
            "webBuild": 12,
            "webVersion": "10.0.33.12"
        }

    prev_desktop = vdata.get("desktopVersion", "10.0.33")
    prev_build = int(vdata.get("webBuild", 12))
    prev_web_version = vdata.get("webVersion", f"{prev_desktop}.{prev_build:02d}")

    curr_desktop = detect_desktop_version(desktop_ver)

    # 2. Compute new version according to the rule
    if explicit_build is not None:
        new_build = int(explicit_build)
    elif curr_desktop == prev_desktop:
        new_build = prev_build + 1
    else:
        # Desktop moved to next version! Reset build to 01
        print(f"[*] Desktop version changed from {prev_desktop} to {curr_desktop}! Resetting Web Build to 01.")
        new_build = 1

    new_web_version = f"{curr_desktop}.{new_build:02d}"
    new_tag = f"web-v{new_web_version}"
    now_iso = datetime.now().astimezone().isoformat()

    print(f"===========================================================")
    print(f"  DSE ERP Web Version Bumper")
    print(f"  Previous Version: {prev_web_version} (Desktop {prev_desktop}, Build #{prev_build})")
    print(f"  Target Version:   {new_web_version} (Desktop {curr_desktop}, Build #{new_build})")
    print(f"  Git Tag:          {new_tag}")
    print(f"===========================================================")

    # 3. Update version.json
    vdata["desktopVersion"] = curr_desktop
    vdata["webBuild"] = new_build
    vdata["webVersion"] = new_web_version
    vdata["tag"] = new_tag
    vdata["releaseDate"] = now_iso
    vdata["summary"] = note

    with open(VERSION_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(vdata, f, indent=2)
    print(f"[+] Updated {VERSION_JSON_PATH}")

    # 4. Update js/version.js
    version_js_content = f"""/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {{
  desktopVersion: "{curr_desktop}",
  webBuild: {new_build},
  webVersion: "{new_web_version}",
  tag: "{new_tag}",
  releaseDate: "{now_iso}",
  environment: "UAT",
  summary: "{note}"
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

    // 3. App Header Web Version Badge
    const headerBadge = document.getElementById('header-app-version-badge');
    if (headerBadge) {{
      headerBadge.textContent = `v${{v.webVersion}}`;
      headerBadge.setAttribute('title', `Web Studio Build ${{v.webVersion}} (Desktop ${{v.desktopVersion}})`);
    }}

    // 4. Profile Menu Footer Version
    const profileFooter = document.getElementById('menu-version-footer');
    if (profileFooter) {{
      profileFooter.textContent = `Web v${{v.webVersion}} • Desktop v${{v.desktopVersion}}`;
    }}
  }}

  if (document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', syncVersionToDOM);
  }} else {{
    syncVersionToDOM();
  }}
}})();
"""
    with open(VERSION_JS_PATH, 'w', encoding='utf-8') as f:
        f.write(version_js_content)
    print(f"[+] Updated {VERSION_JS_PATH}")

    # 5. Update index.html
    with open(INDEX_HTML_PATH, 'r', encoding='utf-8') as f:
        html = f.read()

    # Replace cache buster query parameters ?v=...
    # Regex replaces ?v=10.0.33.XX or ?v=10.0.XX.YY with new version
    html = re.sub(r'(\?v=)[0-9]+\.[0-9]+\.[0-9]+(\.[0-9]+)?', rf'\g<1>{new_web_version}', html)

    # Replace static text badges
    html = re.sub(r'(id="auth-app-version-badge"[^>]*>Version\s+)[^<]+(<)', rf'\g<1>{new_web_version}\g<2>', html)
    html = re.sub(r'(id="auth-desktop-baseline"[^>]*>Desktop Baseline:\s*v)[^<]+(<)', rf'\g<1>{curr_desktop}\g<2>', html)
    html = re.sub(r'(id="header-app-version-badge"[^>]*>v)[^<]+(<)', rf'\g<1>{new_web_version}\g<2>', html)

    with open(INDEX_HTML_PATH, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"[+] Updated {INDEX_HTML_PATH} cache-buster query params to ?v={new_web_version}")

    # 6. Mirror to synchronization targets
    for target in SYNC_TARGETS:
        if os.path.abspath(target) == os.path.abspath(WEB_ADMIN_DIR):
            continue
        if os.path.isdir(target):
            shutil.copy2(VERSION_JSON_PATH, os.path.join(target, "version.json"))
            os.makedirs(os.path.join(target, "js"), exist_ok=True)
            shutil.copy2(VERSION_JS_PATH, os.path.join(target, "js", "version.js"))
            shutil.copy2(INDEX_HTML_PATH, os.path.join(target, "index.html"))
            print(f"[+] Synced version and index.html to {target}")

    # 7. Git commit, tag, push & GitHub release
    if do_release:
        print("\n[*] Creating Git commit, tag, and pushing to origin main...")
        cmd_add = ["git", "-C", ROOT_DIR, "add", "web/admin/"]
        subprocess.check_call(cmd_add)

        commit_msg = f"release(web): {new_tag} - {note}"
        cmd_commit = ["git", "-C", ROOT_DIR, "commit", "-m", commit_msg]
        subprocess.check_call(cmd_commit)

        cmd_tag = ["git", "-C", ROOT_DIR, "tag", "-a", new_tag, "-m", f"Release {new_tag}"]
        subprocess.check_call(cmd_tag)

        cmd_push = ["git", "-C", ROOT_DIR, "push", "origin", "main", "--tags"]
        subprocess.check_call(cmd_push)
        print(f"[+] Pushed commit and tag {new_tag} to GitHub!")

        # Create GitHub Release via gh CLI if installed
        try:
            cmd_gh = [
                "gh", "release", "create", new_tag,
                "--repo", "ssdhameliya/DSE-ERP-Enterprise",
                "--title", f"DSE ERP Web Admin Studio v{new_web_version}",
                "--notes", f"### DSE ERP Web Admin Studio Release `{new_web_version}`\n\n- **Desktop Baseline:** `{curr_desktop}`\n- **Build Revision:** `#{new_build}`\n- **Release Date:** `{now_iso}`\n\n#### Highlights & Scope:\n{note}"
            ]
            subprocess.check_call(cmd_gh)
            print(f"[+] Successfully published GitHub Release: {new_tag}")
        except Exception as e:
            print(f"[!] Warning: Could not publish GitHub Release via gh CLI: {e}")

    print(f"\n[DONE] Web version successfully updated to {new_web_version}!")
    return new_web_version

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bump DSE ERP Web Studio Version")
    parser.add_argument("--desktop", help="Desktop version baseline (e.g. 10.0.33, 10.0.34)")
    parser.add_argument("--build", type=int, help="Explicit build number (e.g. 1, 12, 13)")
    parser.add_argument("--note", default="Desktop 1:1 Parity release", help="Release note / summary")
    parser.add_argument("--release", action="store_true", help="Stage, commit, tag, push, and create GitHub release")
    args = parser.parse_args()

    bump_version(
        desktop_ver=args.desktop,
        explicit_build=args.build,
        note=args.note,
        do_release=args.release
    )
