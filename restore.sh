#!/bin/bash
# NG-VMS Enterprise Restore Script
# Usage: ./restore.sh <path_to_backup.tar.gz>

set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <path_to_backup.tar.gz>"
  exit 1
fi

BACKUP_FILE=$1
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File $BACKUP_FILE not found."
  exit 1
fi

echo "======================================"
echo " NG-VMS Enterprise Restore Process"
echo "======================================"

# Ensure .env exists
if [ ! -f .env ]; then
  echo "Error: .env file not found."
  exit 1
fi

source .env

TMP_DIR="$(pwd)/tmp_restore"
mkdir -p "$TMP_DIR"

echo "[1/4] Extracting backup archive..."
tar -xzf "$BACKUP_FILE" -C "$TMP_DIR"
EXTRACTED_FOLDER=$(ls -d "$TMP_DIR"/* | head -n 1)

echo "[2/4] Restoring MongoDB..."
docker cp "$EXTRACTED_FOLDER/mongo" ngvms_mongo:/data/db/restore_dump
docker exec ngvms_mongo mongorestore --username "${MONGO_ROOT_USER:-admin}" --password "${MONGO_ROOT_PASSWORD:-NGVmsEnterpriseDB2026!}" --authenticationDatabase admin --drop /data/db/restore_dump
docker exec ngvms_mongo rm -rf /data/db/restore_dump

echo "[3/4] Restoring MinIO..."
if [ -d "$EXTRACTED_FOLDER/minio_data" ]; then
  echo "Restoring MinIO objects directly to volume..."
  docker cp "$EXTRACTED_FOLDER/minio_data/." ngvms_minio:/data/
  docker restart ngvms_minio
else
  echo "MinIO data folder not found in backup, skipping."
fi

echo "[4/4] Cleaning up..."
rm -rf "$TMP_DIR"

echo ""
echo "======================================"
echo " Restore completed successfully!"
echo "======================================"
