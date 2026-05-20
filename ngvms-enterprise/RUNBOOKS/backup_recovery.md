# Runbook: Enterprise Backup & Recovery Strategy

This document outlines the backup and recovery plan for the NG-VMS sovereign deployment.

---

## 📅 1. Backup Schedule (RPO)

To satisfy enterprise compliance, standard automated cron-jobs must execute backups at the following intervals:
*   **Hourly Snapshots:** Retention: 24 hours. (Database changes only).
*   **Daily Backups:** Retention: 7 days. (Full DB + MinIO file storage).
*   **Weekly Archives:** Retention: 4 weeks. (Full DB + MinIO file storage).

### Automated Cron Integration (Host Machine)
To automate the daily backup execution, register our `backup.sh` script inside the root user's crontab:
```bash
# Open root crontab
sudo crontab -e

# Append the following line to trigger daily backups at 02:00 AM
0 2 * * * /opt/ngvms/backup.sh > /var/log/ngvms_backup.log 2>&1
```

---

## 💾 2. Offsite Backup replication (Disaster Recovery)

Having backups on the local host disk is a single point of failure. You must copy completed `.tar.gz` archives offsite using secure file transfer mechanisms.

### Example Rsync Script (Copying to offsite storage server)
```bash
#!/bin/bash
BACKUP_FILE=$(find /opt/ngvms/backups/ -name "ngvms_backup_*.tar.gz" -type f -mmin -60)
if [ -f "$BACKUP_FILE" ]; then
    rsync -az -e "ssh -i /root/.ssh/dr_key" "$BACKUP_FILE" dr_user@dr-vault.client.com:/vault/ngvms/
fi
```

---

## 🚨 3. Recovery Objectives (RTO)

In the event of physical host destruction:
1.  Provision a new VPS/on-prem virtual machine meeting the deployment prerequisites.
2.  Set up SSH access and fetch your latest offsite backup archive `ngvms_backup_*.tar.gz`.
3.  Install the package and run `./restore.sh <backup_archive>`.
4.  Total Recovery Time Objective (RTO) is under **15 minutes** with a complete zero-data-loss Recovery Point Objective (RPO) matching your last hourly snapshot.
