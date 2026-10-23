<#
.SYNOPSIS
  DSE ERP Admin Studio - Single File Version Synchronization Script
  Usage:
    .\scripts\sync-version.ps1                    # Synchronizes all files from version.json
    .\scripts\sync-version.ps1 -Bump               # Auto-increments webBuild, bumps minor version
    .\scripts\sync-version.ps1 -SetVersion "10.0.41.12" -Summary "Your summary here"
#>

[CmdletBinding()]
param(
    [switch]$Bump,
    [string]$SetVersion,
    [string]$Summary
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$versionJsonPath = Join-Path $root "version.json"
$versionJsPath = Join-Path $root "js\version.js"
$indexHtmlPath = Join-Path $root "index.html"

if (-not (Test-Path $versionJsonPath)) {
    Write-Error "version.json not found at $versionJsonPath"
}

$jsonRaw = Get-Content $versionJsonPath -Raw -Encoding UTF8
$vObj = $jsonRaw | ConvertFrom-Json

if ($Bump) {
    $vObj.webBuild = [int]$vObj.webBuild + 1
    $parts = $vObj.webVersion.Split('.')
    if ($parts.Length -ge 4) {
        $parts[3] = ($vObj.webBuild).ToString("D2")
        $vObj.webVersion = $parts -join '.'
    } else {
        $vObj.webVersion = "$($vObj.desktopVersion).$($vObj.webBuild)"
    }
    $vObj.tag = "web-v$($vObj.webVersion)"
    $vObj.releaseDate = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
}

if ($SetVersion) {
    $vObj.webVersion = $SetVersion
    $parts = $SetVersion.Split('.')
    if ($parts.Length -ge 4) {
        $vObj.webBuild = [int]$parts[3]
        $vObj.desktopVersion = ($parts[0..2] -join '.')
    }
    $vObj.tag = "web-v$SetVersion"
    $vObj.releaseDate = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
}

if ($Summary) {
    $vObj.summary = $Summary
}

# 1. Save updated version.json
$updatedJson = $vObj | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($versionJsonPath, $updatedJson, [System.Text.Encoding]::UTF8)
Write-Host " [1/3] Updated version.json -> $($vObj.webVersion) (Build $($vObj.webBuild))" -ForegroundColor Green

# 2. Generate and write js/version.js
$highlightsStr = ""
if ($vObj.highlights) {
    $hlLines = ($vObj.highlights | ForEach-Object { "    `"$_`"" }) -join ",`n"
    $highlightsStr = "`n  highlights: [`n$hlLines`n  ],"
}

$jsContent = @"
/**
 * DSE ERP Web Admin Studio - Centralized Runtime Version Registry
 * Automatically synchronized with version.json and Desktop release revision.
 */
window.DSE_VERSION = {
  version: "$($vObj.webVersion)",
  desktopVersion: "$($vObj.desktopVersion)",
  webBuild: $($vObj.webBuild),
  webVersion: "$($vObj.webVersion)",
  tag: "$($vObj.tag)",
  releaseDate: "$($vObj.releaseDate)",
  environment: "$($vObj.environment)",
  summary: "$($vObj.summary.Replace('"', '\"'))"$highlightsStr
};

// Automatic UI Version Injection
(function() {
  function syncVersionToDOM() {
    const v = window.DSE_VERSION;
    if (!v) return;

    // 1. Login Page Version Badge
    const loginBadge = document.getElementById('auth-app-version-badge') || document.querySelector('.auth-brand-version-badge');
    if (loginBadge) {
      loginBadge.textContent = ``Version `${v.webVersion}``;
      loginBadge.setAttribute('title', ``Desktop Baseline: v`${v.desktopVersion} | Build #`${v.webBuild}``);
    }

    // 2. Login Page Desktop Baseline Tag
    const desktopTag = document.getElementById('auth-desktop-baseline');
    if (desktopTag) {
      desktopTag.textContent = ``Desktop Baseline: v`${v.desktopVersion}``;
    }

    // 3. App Header Web Version Badge (if present)
    const headerBadge = document.getElementById('header-app-version-badge');
    if (headerBadge) {
      headerBadge.textContent = ``v`${v.webVersion}``;
      headerBadge.setAttribute('title', ``Web Studio Build `${v.webVersion} (Desktop `${v.desktopVersion})``);
    }

    // 4. Profile Menu Footer Version
    const profileFooter = document.getElementById('menu-version-footer');
    if (profileFooter) {
      profileFooter.innerHTML = ``<span>Web Studio</span><span style="color: var(--cyan); font-weight: 600;">v`${v.webVersion}</span>``;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncVersionToDOM);
  } else {
    syncVersionToDOM();
  }
})();

"@

[System.IO.File]::WriteAllText($versionJsPath, $jsContent, [System.Text.Encoding]::UTF8)
Write-Host " [2/3] Generated js/version.js -> window.DSE_VERSION.version = '$($vObj.webVersion)'" -ForegroundColor Green

# 3. Synchronize index.html
if (Test-Path $indexHtmlPath) {
    $indexHtml = [System.IO.File]::ReadAllText($indexHtmlPath, [System.Text.Encoding]::UTF8)

    # 3a. Update static badge in index.html
    $badgePattern = '(<span[^>]*id="auth-app-version-badge"[^>]*>)[^<]*(</span>)'
    $indexHtml = [regex]::Replace($indexHtml, $badgePattern, "`${1}Version $($vObj.webVersion)`${2}")

    # 3b. Update desktop baseline in index.html
    $basePattern = '(id="auth-desktop-baseline"[^>]*>Desktop Baseline:\s*)v[0-9.]+'
    $indexHtml = [regex]::Replace($indexHtml, $basePattern, "`${1}v$($vObj.desktopVersion)")

    # 3c. Update all ?v=... query parameters
    $queryPattern = '\?v=[0-9A-Za-z\.\-]+"'
    $count = ([regex]::Matches($indexHtml, $queryPattern)).Count
    $indexHtml = [regex]::Replace($indexHtml, $queryPattern, "?v=$($vObj.webVersion)`"")

    [System.IO.File]::WriteAllText($indexHtmlPath, $indexHtml, [System.Text.Encoding]::UTF8)
    Write-Host " [3/3] Synchronized index.html -> updated badge and $count cache-busting script/link tags to ?v=$($vObj.webVersion)" -ForegroundColor Green
}

Write-Host "`nSUCCESS: Version $($vObj.webVersion) synchronized across all files!" -ForegroundColor Cyan
