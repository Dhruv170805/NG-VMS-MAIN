#!/bin/bash

# NG-VMS Enterprise On-Premise Installer
# Optimized for Offline Resilience and Sovereign Data.

set -e

echo "================================================="
echo "   🚀 NG-VMS ENTERPRISE 1-COMMAND INSTALLER     "
echo "================================================="

# --- 1. SYSTEM VALIDATION ---
echo "[1/6] Validating System Requirements..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed."
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo "[ERROR] Docker Compose (v2) is required."
    exit 1
fi

# Check RAM (Minimum 8GB = ~8000MB)
TOTAL_RAM=$(awk '/MemTotal/ {printf "%.0f", $2/1024}' /proc/meminfo 2>/dev/null || echo "8000")
if [ "$TOTAL_RAM" -lt 7500 ]; then
    echo "[WARN] Server has less than 8GB RAM (${TOTAL_RAM}MB detected). Performance may degrade."
else
    echo "[OK] RAM Check Passed (${TOTAL_RAM}MB)."
fi

# Check Ports (80, 443, 5001, 3000, 9000, 9001, 1080)
for PORT in 80 443 5001 3000 9000 9001 1080; do
    if ss -tuln | grep -q ":$PORT "; then
        echo "[ERROR] Port $PORT is already in use. Please free it before installing."
        exit 1
    fi
done
echo "[OK] Port Check Passed."

# --- 2. CONFIGURATION & SECRETS ---
echo "[2/6] Generating Secrets and Configuration..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "[INFO] Created .env from .env.example."
        
        # Generate Secrets
        JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)
        MINIO_SECRET=$(openssl rand -hex 16 2>/dev/null || date +%s%N | sha256sum | head -c 32)
        
        # In-place replacement
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
            sed -i '' "s/MINIO_SECRET_KEY=.*/MINIO_SECRET_KEY=${MINIO_SECRET}/" .env
        else
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
            sed -i "s/MINIO_SECRET_KEY=.*/MINIO_SECRET_KEY=${MINIO_SECRET}/" .env
        fi
        echo "[OK] Generated robust cryptographic secrets."
    else
        echo "[ERROR] .env.example missing."
        exit 1
    fi
else
    echo "[INFO] .env already exists. Preserving secrets."
fi

# Create needed directories
mkdir -p ./backups ./data/mongo ./data/minio ./data/redis ./data/caddy

# --- 3. LICENSE CHECK ---
echo "[3/6] Verifying License..."
if [ ! -f license.vlic ]; then
    echo "[WARN] license.vlic NOT FOUND. System will start in restricted trial mode."
else
    echo "[OK] license.vlic detected."
fi

# --- 4. DEPLOYMENT ---
echo "[4/6] Launching Cinematic Stack..."
docker compose up -d --build

# --- 5. HEALTH CHECKS ---
echo "[5/6] Waiting for Services to stabilize (20s)..."
sleep 20

if ! docker compose ps | grep -q "Up"; then
    echo "[ERROR] Containers failed to start. Run 'docker compose logs' for details."
    exit 1
fi
echo "[OK] Containers are running."

# --- 6. ADMIN BOOTSTRAP ---
echo "[6/6] Finalizing Setup..."
echo "================================================="
echo "   ✅ NG-VMS ENTERPRISE INSTALLATION COMPLETE   "
echo "================================================="
echo "🌐 Main Portal   : http://localhost"
echo "📦 MinIO Console : http://localhost:9001 (User: minioadmin)"
echo "📧 Local Mail    : http://localhost:1080"
echo "-------------------------------------------------"
echo "🚀 NEXT STEP: Open http://localhost to run the "
echo "   First-Run Setup Wizard and configure your tenant."
echo "================================================="
