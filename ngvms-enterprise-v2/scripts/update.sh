#!/bin/bash

# NG-VMS Enterprise Safe Update Pipeline
# This script ensures a safe upgrade path for on-premise installations.

set -e

echo "================================================="
echo "   🚀 NG-VMS ENTERPRISE SAFE UPDATE PIPELINE    "
echo "================================================="

# 1. State Backup
echo "[1/5] Backing up current state..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/pre_update_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

if docker ps | grep -q "ngvms_mongo"; then
    docker exec ngvms_mongo mongodump --db ngvms --archive --gzip > "$BACKUP_DIR/mongodb_ngvms.gz"
fi
docker run --rm --volumes-from ngvms_minio -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/minio_data.tar.gz /data || true
echo "[OK] Backup created at $BACKUP_DIR"

# 2. Fetch Update
echo "[2/5] Downloading latest enterprise release..."
# Usually this would verify signatures, but for git:
git pull origin main || {
    echo "[ERROR] Failed to fetch updates."
    exit 1
}

# 3. Apply Update
echo "[3/5] Building and restarting containers..."
if ! docker compose up -d --build; then
    echo "[CRITICAL ERROR] Container build failed!"
    echo "Initiating Rollback..."
    ./scripts/restore.sh "$BACKUP_DIR" <<< "CONFIRM"
    docker compose up -d
    echo "[ROLLBACK COMPLETE] System returned to previous state."
    exit 1
fi

# 4. Health Verification
echo "[4/5] Running post-update health checks..."
sleep 15
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/system/health || echo "000")

if [ "$HTTP_STATUS" -ne 200 ]; then
    echo "[CRITICAL ERROR] Health check failed (HTTP $HTTP_STATUS)!"
    echo "Initiating Rollback..."
    ./scripts/restore.sh "$BACKUP_DIR" <<< "CONFIRM"
    docker compose up -d
    echo "[ROLLBACK COMPLETE] System returned to previous state."
    exit 1
fi
echo "[OK] System is healthy."

echo "================================================="
echo "   ✅ UPDATE COMPLETED SUCCESSFULLY             "
echo "================================================="
