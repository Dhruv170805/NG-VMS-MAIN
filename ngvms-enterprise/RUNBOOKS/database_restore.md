# Runbook: MongoDB & MinIO Data Restores

This manual outlines exact step-by-step restoration sequences for MongoDB database collections and MinIO assets.

---

## 🛠️ 1. Complete System Restores (Standard Approach)

The primary and recommended mechanism to restore both MongoDB data structures and MinIO buckets is using the provided `restore.sh` utility:
```bash
# Execute standard restore
sudo ./restore.sh ./backups/ngvms_backup_2026-05-18_12-00-00.tar.gz
```

---

## 💾 2. Granular MongoDB Collection Restores

If a database administrator needs to restore only a single collection (e.g. `visitors` or `employees`) from a backup instead of resetting the whole database:

### Step 1: Extract the Backup Archive
```bash
# Make a temp space
mkdir -p /tmp/restore_extract
tar -xzf ./backups/ngvms_backup_2026-05-18_12-00-00.tar.gz -C /tmp/restore_extract/
```

### Step 2: Feed the Target Collection into mongorestore
Run `mongorestore` directly targeting the compressed collection namespaces:
```bash
# Query the extracted directory path
EXTRACTED_DIR=$(find /tmp/restore_extract -mindepth 1 -maxdepth 1 -type d | head -n 1)

# Feed specific collection (e.g. visitors) into mongorestore inside the docker container
docker exec -i ngvms_mongo mongorestore \
    --username "${MONGO_ROOT_USER}" \
    --password "${MONGO_ROOT_PASSWORD}" \
    --authenticationDatabase admin \
    --nsInclude="ngvms.visitors" \
    --drop --gzip --archive < "$EXTRACTED_DIR/mongodb_ngvms.gz"
```

---

## 📂 3. MinIO File Auditing & Bucket Synchronization

If a user's uploaded avatar or badge image asset is corrupted, and you need to restore files directly inside MinIO without modifying the database:
```bash
# Copy single asset from a extracted backup folder directly back to MinIO persistent volume
docker cp /tmp/restore_extract/ngvms_backup_*/minio_data/ngvms-assets/visitors/badge_1001.png ngvms_minio:/data/ngvms-assets/visitors/

# Fix storage ownership
docker exec ngvms_minio chown -R minioadmin:minioadmin /data
```
