<#
  setup-https.ps1  -  One-time HTTPS setup for the LAN host (so the QR camera works).

  Run this ON THE HOST PC (the computer that serves the app to the network):

      powershell -ExecutionPolicy Bypass -File scripts\setup-https.ps1

  It will:
    1. Download mkcert (a tiny tool) into certs\.
    2. Create a local certificate authority and trust it on this PC.
    3. Generate an HTTPS certificate for this PC's LAN IP address(es).
    4. Copy the trust file to your Desktop as "tool-inventory-rootCA.crt"
       so you can install it once on each phone/PC that will use the app.

  After it finishes, run:   docker compose up -d --build client
  Then open:                https://<this-PC-IP>:5173
#>

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$certsDir = Join-Path $repoRoot "certs"
New-Item -ItemType Directory -Force -Path $certsDir | Out-Null
$env:CAROOT = $certsDir
$mkcert = Join-Path $certsDir "mkcert.exe"

# 1) Download mkcert if it isn't here yet.
if (-not (Test-Path $mkcert)) {
  Write-Host "Downloading mkcert..." -ForegroundColor Cyan
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe" -OutFile $mkcert
}

# 2) Create + trust the local CA on this host (a Windows security prompt may appear - click Yes).
Write-Host "Creating/trusting the local certificate authority..." -ForegroundColor Cyan
try {
  & $mkcert -install
} catch {
  Write-Host "  (Trust prompt skipped - devices still trust it via the .crt file.)" -ForegroundColor Yellow
}

# 3) Collect this PC's real LAN IPv4 addresses (skip loopback and link-local).
$ips = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254*' } |
  Select-Object -ExpandProperty IPAddress -Unique
$names = @($ips) + @('localhost', '127.0.0.1', (hostname))

Write-Host "Generating HTTPS certificate for:" -ForegroundColor Cyan
$names | ForEach-Object { Write-Host "   - $_" }

Push-Location $certsDir
& $mkcert -cert-file "lan-cert.pem" -key-file "lan-key.pem" @names
Pop-Location

# 4) Put the trust file on the Desktop for distributing to phones/PCs.
$desktop = [Environment]::GetFolderPath('Desktop')
$trustFile = Join-Path $desktop "tool-inventory-rootCA.crt"
Copy-Item (Join-Path $certsDir "rootCA.pem") $trustFile -Force

Write-Host ""
Write-Host "==================== DONE ====================" -ForegroundColor Green
Write-Host "Trust file for devices:  $trustFile"
Write-Host ""
Write-Host "Next, run:   docker compose up -d --build client"
Write-Host ""
Write-Host "Then users open one of these (note the 's' in https):" -ForegroundColor Green
$ips | Where-Object { $_ -like '192.168*' -or $_ -like '10.*' } | ForEach-Object { Write-Host "   https://${_}:5173" }
Write-Host "============================================="
