#!/bin/bash

# NG-VMS Enterprise Restore Utility
# Safely restores MongoDB and MinIO from a specified backup timestamp folder.

set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/restore.sh <backup_folder_path>"
    echo "Example: ./scripts/restore.sh ./backups/20260516_120000"
    exit 1
fi

BACKUP_DIR=$1

if [ ! -d "$BACKUP_DIR" ]; then
    echo "[ERROR] Backup directory $BACKUP_DIR not found."
    exit 1
fi

echo "================================================="
echo "   ⚠️ NG-VMS ENTERPRISE RESTORE UTILITY ⚠️      "
echo "================================================="
echo "Target Backup: $BACKUP_DIR"
echo "WARNING: This will overwrite current production data."
echo -n "Type 'CONFIRM' to proceed: "
read -r CONFIRMATION

if [ "$CONFIRMATION" != "CONFIRM" ]; then
    echo "Restore cancelled."
    exit 0
fi

# 1. Mongo Restore
if [ -f "$BACKUP_DIR/mongodb_ngvms.gz" ]; then
    echo "[INFO] Restoring MongoDB data..."
    # Drop existing db before restore to avoid merge conflicts
    docker exec -i ngvms_mongo mongorestore --drop --gzip --archive < "$BACKUP_DIR/mongodb_ngvms.gz"
    echo "[OK] MongoDB restored."
else
    echo "[WARN] No MongoDB backup found in $BACKUP_DIR."
fi

# 2. MinIO Restore
if [ -f "$BACKUP_DIR/minio_data.tar.gz" ]; then
    echo "[INFO] Restoring MinIO Object Storage..."
    docker run --rm --volumes-from ngvms_minio -v "$(pwd)/$BACKUP_DIR":/backup alpine sh -c "cd /data && rm -rf * && tar xzf /backup/minio_data.tar.gz -C /"
    echo "[OK] MinIO restored."
else
    echo "[WARN] No MinIO backup found in $BACKUP_DIR."
fi

# 3. Post-Restore Validation
echo "[INFO] Running post-restore health check..."
if docker exec ngvms_mongo mongosh --quiet --eval "db.getMongo().getDBs()"; then
    echo "[OK] Database is responding."
else
    echo "[ERROR] Database validation failed!"
    exit 1
fi

echo "================================================="
echo "   ✅ RESTORE COMPLETED SUCCESSFULLY            "
echo "================================================="
