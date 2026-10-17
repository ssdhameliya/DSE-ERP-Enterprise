<#
.SYNOPSIS
    DSE ERP Web Admin Studio - Release & Version Bumper Automation
.DESCRIPTION
    Enforces Desktop-driven Web Versioning Rules:
    - Format: <DesktopMajor>.<DesktopMinor>.<DesktopPatch>.<WebBuild:02d>
    - Example: Desktop 10.0.33 -> 10.0.33.01, 10.0.33.02, ... 10.0.33.12, 10.0.33.13
    - When Desktop moves to 10.0.34 -> Resets to 10.0.34.01
#>

[CmdletBinding()]
param(
    [string]$Desktop,
    [int]$Build,
    [string]$Note = "Desktop 1:1 Parity release",
    [switch]$Release
)

$scriptPath = Join-Path $PSScriptRoot "bump-web-version.py"
$pythonArgs = @($scriptPath)

if ($Desktop) {
    $pythonArgs += @("--desktop", $Desktop)
}
if ($Build) {
    $pythonArgs += @("--build", $Build)
}
if ($Note) {
    $pythonArgs += @("--note", $Note)
}
if ($Release) {
    $pythonArgs += @("--release")
}

& python $pythonArgs
if ($LASTEXITCODE -ne 0) {
    throw "Version bump failed with code $LASTEXITCODE."
}
