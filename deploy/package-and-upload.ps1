#Requires -Version 5.1
# Pack with tar.gz (UTF-8 paths OK on Linux), scp, run remote-extract.sh
param(
    [string]$ServerHost = "82.156.225.73",
    [string]$RemoteUser = "ubuntu",
    [string]$KeyPath = "$env:USERPROFILE\.ssh\alevelinfo_ed25519",
    [string]$ArchiveRemote = "/tmp/pingchi-deploy.tar.gz"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

$archiveLocal = Join-Path $env:TEMP "pingchi-deploy.tar.gz"
if (Test-Path -LiteralPath $archiveLocal) { Remove-Item -LiteralPath $archiveLocal -Force }

$tar = Get-Command tar.exe -ErrorAction SilentlyContinue
if (-not $tar) {
    throw "tar.exe not found (need Windows 10+ built-in tar). Install Git for Windows or update OS."
}

Write-Host "Packing with tar.gz (preserves Chinese paths; excludes .git / node_modules / .cursor / .obsidian)..."
& tar.exe -czvf $archiveLocal `
    --exclude=.git `
    --exclude=node_modules `
    --exclude=.cursor `
    --exclude=.obsidian `
    -C $RepoRoot `
    .

$item = Get-Item -LiteralPath $archiveLocal
Write-Host ("Created archive: {0} ({1} bytes)" -f $archiveLocal, $item.Length)

if (-not (Test-Path -LiteralPath $KeyPath)) {
    throw ("SSH key not found: {0} (use -KeyPath)" -f $KeyPath)
}

$sshTarget = ('{0}@{1}' -f $RemoteUser, $ServerHost)
$extractLocal = Join-Path $PSScriptRoot 'remote-extract.sh'
if (-not (Test-Path -LiteralPath $extractLocal)) { throw "Missing deploy/remote-extract.sh" }

Write-Host ("Upload archive -> {0}:{1}" -f $sshTarget, $ArchiveRemote)
scp -i $KeyPath $archiveLocal ($sshTarget + ":" + $ArchiveRemote)

Write-Host ("Upload script -> {0}:/tmp/pingchi-remote-extract.sh" -f $sshTarget)
scp -i $KeyPath $extractLocal ($sshTarget + ":/tmp/pingchi-remote-extract.sh")

Write-Host "Run remote extract (strip CRLF from script if needed)..."
ssh -i $KeyPath $sshTarget ("sed -i 's/\r$//' /tmp/pingchi-remote-extract.sh && bash /tmp/pingchi-remote-extract.sh " + $ArchiveRemote)

Write-Host ""
Write-Host ("Done. Try: http://{0}/pingchi/" -f $ServerHost)
