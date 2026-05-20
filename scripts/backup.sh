#!/bin/bash
# NG-VMS Production Backup Script
# Schedule this via crontab: 0 2 * * * /path/to/ng-vms/scripts/backup.sh

set -e

BACKUP_DIR="$(pwd)/backups/$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$BACKUP_DIR"

echo "Starting NG-VMS Backup..."

# Load Env Vars
source .env

# Backup MongoDB
echo "Exporting MongoDB..."
docker exec ngvms_mongo mongodump --username "${MONGO_ROOT_USER:-ngvms_root}" --password "${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD required}" --authenticationDatabase admin --archive --gzip > "$BACKUP_DIR/mongodb_ngvms.gz"

# Backup MinIO
echo "Exporting MinIO configuration and files..."
docker run --rm --volumes-from ngvms_minio -v "$BACKUP_DIR":/backup alpine tar czf /backup/minio_data.tar.gz /data || true

# Compress Backup
echo "Compressing backup..."
tar -czf "$BACKUP_DIR.tar.gz" -C backups "$(basename "$BACKUP_DIR")"
rm -rf "$BACKUP_DIR"

# Cleanup old backups (older than 7 days)
find "$(pwd)/backups" -type f -name "*.tar.gz" -mtime +7 -exec rm {} \;

echo "Backup completed successfully: $BACKUP_DIR.tar.gz"
