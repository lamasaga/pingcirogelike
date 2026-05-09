#Requires -Version 5.1
# Zip repo root (exclude .git etc.), scp to server, run remote-extract.sh
param(
    [string]$ServerHost = "82.156.225.73",
    [string]$RemoteUser = "ubuntu",
    [string]$KeyPath = "$env:USERPROFILE\.ssh\alevelinfo_ed25519",
    [string]$ZipRemote = "/tmp/pingchi-deploy.zip"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $RepoRoot

$zipLocal = Join-Path $env:TEMP "pingchi-deploy.zip"
if (Test-Path -LiteralPath $zipLocal) { Remove-Item -LiteralPath $zipLocal -Force }

$exclude = @(".git", "node_modules", ".cursor")
$items = Get-ChildItem -LiteralPath $RepoRoot -Force | Where-Object { $exclude -notcontains $_.Name }
if (-not $items) { throw "Nothing to pack in repo root." }

Compress-Archive -Path ($items | ForEach-Object { $_.FullName }) -DestinationPath $zipLocal -Force
$item = Get-Item -LiteralPath $zipLocal
Write-Host ("Created zip: {0} ({1} bytes)" -f $zipLocal, $item.Length)

if (-not (Test-Path -LiteralPath $KeyPath)) {
    throw ("SSH key not found: {0} (use -KeyPath)" -f $KeyPath)
}

$sshTarget = ('{0}@{1}' -f $RemoteUser, $ServerHost)
$extractLocal = Join-Path $PSScriptRoot 'remote-extract.sh'
if (-not (Test-Path -LiteralPath $extractLocal)) { throw "Missing deploy/remote-extract.sh" }

Write-Host ("Upload zip -> {0}:{1}" -f $sshTarget, $ZipRemote)
scp -i $KeyPath $zipLocal ($sshTarget + ":" + $ZipRemote)

Write-Host ("Upload script -> {0}:/tmp/pingchi-remote-extract.sh" -f $sshTarget)
scp -i $KeyPath $extractLocal ($sshTarget + ":/tmp/pingchi-remote-extract.sh")

Write-Host "Run remote extract..."
ssh -i $KeyPath $sshTarget ("bash /tmp/pingchi-remote-extract.sh " + $ZipRemote)

Write-Host ""
Write-Host ("Done. Try: http://{0}/pingchi/" -f $ServerHost)
