# Runbook: Server VPS Migration Manual

This checklist outlines the hot-migration procedure to move a live, active on-premise NG-VMS installation from an old host machine to a new, fresh host with minimal downtime.

---

## 🏃 1. Stage 1: Target Node Preparation

1.  Connect to the new target host via SSH and verify it meets all prerequisites.
2.  Install git, docker, and curl if not already present.
3.  Lock UFW firewall rules on the new host machine:
    ```bash
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw default deny incoming
    sudo ufw --force enable
    ```

---

## 💾 2. Stage 2: Database Freezing & Snapshot export (Old Host)

To ensure zero-data loss, we must freeze incoming writes during migration:

1.  Put Caddy in maintenance mode or stop the stack on the old host to avoid incoming check-ins:
    ```bash
    # Stop old host containers
    cd /opt/ngvms
    sudo docker compose stop
    ```
2.  Trigger final backup dump:
    ```bash
    # Run final backup export
    sudo ./backup.sh
    ```
3.  Acquire the backup archive path (e.g., `ngvms_backup_final.tar.gz`).

---

## 🚀 3. Stage 3: Secure Transfer & Launch (New Host)

1.  Transfer the snapshot and application packages directly to the new target server:
    ```bash
    scp ./backups/ngvms_backup_final.tar.gz root@new-server-ip:/tmp/
    scp -r /opt/ngvms root@new-server-ip:/opt/
    ```
2.  Connect to the new host, configure `.env` (adjust `DOMAIN_NAME` or `TLS_EMAIL` to match target changes if necessary), and start containers:
    ```bash
    cd /opt/ngvms
    sudo ./install.sh
    ```
3.  Perform the database restoration:
    ```bash
    sudo ./restore.sh /tmp/ngvms_backup_final.tar.gz
    ```
4.  Execute health check:
    ```bash
    sudo ./healthcheck.sh
    ```
5.  Adjust your corporate DNS nameservers to point the domain `DOMAIN_NAME` to the new host IP. System is now fully functional on the new hardware!
