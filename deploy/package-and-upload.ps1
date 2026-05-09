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

# 使用系统 OpenSSH，避免 PATH 上其它 scp（如旧版/第三方）忽略 -i 导致走密码认证
$opensshBin = Join-Path $env:SystemRoot "System32\OpenSSH"
$scpExe = if (Test-Path (Join-Path $opensshBin "scp.exe")) { Join-Path $opensshBin "scp.exe" } else { "scp" }
$sshExe = if (Test-Path (Join-Path $opensshBin "ssh.exe")) { Join-Path $opensshBin "ssh.exe" } else { "ssh" }

# IdentitiesOnly：只用 -i 指定的私钥；BatchMode：密钥失败时立即报错，不交互问密码
$sshCommon = @(
    "-o", "IdentitiesOnly=yes",
    "-o", "BatchMode=yes",
    "-o", "StrictHostKeyChecking=accept-new",
    "-i", $KeyPath
)

Write-Host ("Upload archive -> {0}:{1} (using {2})" -f $sshTarget, $ArchiveRemote, $scpExe)
& $scpExe @sshCommon $archiveLocal ($sshTarget + ":" + $ArchiveRemote)

Write-Host ("Upload script -> {0}:/tmp/pingchi-remote-extract.sh" -f $sshTarget)
& $scpExe @sshCommon $extractLocal ($sshTarget + ":/tmp/pingchi-remote-extract.sh")

Write-Host "Run remote extract (strip CRLF from script if needed)..."
& $sshExe @sshCommon $sshTarget ("sed -i 's/\r$//' /tmp/pingchi-remote-extract.sh && bash /tmp/pingchi-remote-extract.sh " + $ArchiveRemote)

Write-Host ""
Write-Host ("Done. Try: http://{0}/pingchi/" -f $ServerHost)
