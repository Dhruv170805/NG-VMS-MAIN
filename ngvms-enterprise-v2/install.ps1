# NG-VMS Enterprise Native Windows Installer
# Optimized for PowerShell 5.1+ and Docker Desktop

$ErrorActionPreference = "Stop"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   🚀 NG-VMS ENTERPRISE WINDOWS INSTALLER       " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# --- 1. SYSTEM VALIDATION ---
Write-Host "[1/6] Validating Windows System Requirements..." -ForegroundColor White

# Check Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Check Docker Compose
if (!(docker compose version)) {
    Write-Host "[ERROR] Docker Compose (v2) is required." -ForegroundColor Red
    exit 1
}

# Check RAM
$computerSystem = Get-CimInstance Win32_ComputerSystem
$totalRamGB = [Math]::Round($computerSystem.TotalPhysicalMemory / 1GB)
if ($totalRamGB -lt 8) {
    Write-Host "[WARN] Server has less than 8GB RAM (${totalRamGB}GB detected). Performance may degrade." -ForegroundColor Yellow
} else {
    Write-Host "[OK] RAM Check Passed (${totalRamGB}GB)." -ForegroundColor Green
}

# Check Ports
$ports = @(80, 443, 5001, 3000, 9000, 9001, 1080)
$activeConnections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue
foreach ($port in $ports) {
    if ($activeConnections | Where-Object { $_.LocalPort -eq $port }) {
        Write-Host "[ERROR] Port $port is already in use. Please free it before installing." -ForegroundColor Red
        exit 1
    }
}
Write-Host "[OK] Port Check Passed." -ForegroundColor Green

# --- 2. CONFIGURATION & SECRETS ---
Write-Host "[2/6] Generating Secrets and Configuration..." -ForegroundColor White

if (!(Test-Path .env)) {
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "[INFO] Created .env from .env.example." -ForegroundColor Gray
        
        # Generate Cryptographic Secrets
        $jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 255) }))
        $minioSecret = [Convert]::ToBase64String((1..16 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 255) }))
        
        # Update .env (Windows compatible replace)
        (Get-Content .env) -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwtSecret" | Set-Content .env
        (Get-Content .env) -replace 'MINIO_SECRET_KEY=.*', "MINIO_SECRET_KEY=$minioSecret" | Set-Content .env
        
        Write-Host "[OK] Generated robust cryptographic secrets." -ForegroundColor Green
    } else {
        Write-Host "[ERROR] .env.example missing." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[INFO] .env already exists. Preserving secrets." -ForegroundColor Gray
}

# Create Volumes
$dirs = @("backups", "data/mongo", "data/minio", "data/redis", "data/caddy")
foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
}

# --- 3. LICENSE CHECK ---
Write-Host "[3/6] Verifying License..." -ForegroundColor White
if (!(Test-Path license.vlic)) {
    Write-Host "[WARN] license.vlic NOT FOUND. System will start in restricted trial mode." -ForegroundColor Yellow
} else {
    Write-Host "[OK] license.vlic detected." -ForegroundColor Green
}

# --- 4. DEPLOYMENT ---
Write-Host "[4/6] Launching Cinematic Stack..." -ForegroundColor White
docker compose up -d --build

# --- 5. HEALTH CHECKS ---
Write-Host "[5/6] Waiting for Services to stabilize (20s)..." -ForegroundColor White
Start-Sleep -Seconds 20

$status = docker compose ps --format json
if ($status -match "running" -or $status -match "Up") {
    Write-Host "[OK] Containers are running." -ForegroundColor Green
} else {
    Write-Host "[ERROR] Containers failed to start. Run 'docker compose logs' for details." -ForegroundColor Red
    exit 1
}

# --- 6. ADMIN BOOTSTRAP ---
Write-Host "[6/6] Finalizing Setup..." -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   ✅ NG-VMS ENTERPRISE INSTALLATION COMPLETE   " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "🌐 Main Portal   : http://localhost" -ForegroundColor White
Write-Host "📦 MinIO Console : http://localhost:9001" -ForegroundColor White
Write-Host "📧 Local Mail    : http://localhost:1080" -ForegroundColor White
Write-Host "-------------------------------------------------" -ForegroundColor Gray
Write-Host "🚀 NEXT STEP: Open http://localhost to run the " -ForegroundColor Green
Write-Host "   First-Run Setup Wizard." -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
