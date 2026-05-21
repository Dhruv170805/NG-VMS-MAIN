#!/bin/bash

# NG-VMS Enterprise Backup Script (On-Premise)
# This script performs a hot backup of both MongoDB and MinIO.

BACKUP_ROOT="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

echo "------------------------------------------------"
echo "[INFO] Starting NG-VMS Enterprise Backup..."
echo "------------------------------------------------"

# 1. MongoDB Backup (Replica Set)
echo "[INFO] Backing up MongoDB..."
docker exec ngvms_mongo mongodump --db ngvms --archive --gzip > "$BACKUP_DIR/mongodb_ngvms.gz"
if [ $? -eq 0 ]; then
    echo "[SUCCESS] MongoDB backup complete."
else
    echo "[ERROR] MongoDB backup failed."
fi

# 2. MinIO Backup
echo "[INFO] Backing up MinIO Object Storage..."
# We use the 'mc' (MinIO Client) if available or just tar the data volume if local
# For simplicity in this script, we'll tar the volume mount if we have access, 
# or use a helper container to stream the data.
docker run --rm --volumes-from ngvms_minio -v "$BACKUP_DIR":/backup alpine tar czf /backup/minio_data.tar.gz /data
if [ $? -eq 0 ]; then
    echo "[SUCCESS] MinIO backup complete."
else
    echo "[ERROR] MinIO backup failed."
fi

# 3. Retention (7 Days)
find "$BACKUP_ROOT" -type d -mtime +7 -exec rm -rf {} +
echo "[INFO] Rotated old backups (7-day retention)."

echo "------------------------------------------------"
echo "[FINISH] Backup stored in: $BACKUP_DIR"
echo "------------------------------------------------"
