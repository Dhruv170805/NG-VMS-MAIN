# Runbook: Security Incident Response & Threat Handling

This manual outlines the precise incident response protocol for security administrators in the event of platform compromise, unauthorized data egress, or brute-force scanning detection.

---

## 🔒 1. Securing VPS Host Access (Fail2Ban & UFW Locking)

If you detect malicious network scans or high volumes of suspicious SSH login attempts:

### Step 1: Active IP Blocking
Lock out the attacker's IP immediately using the host firewall:
```bash
# Permablock specific hostile IP address
sudo ufw insert 1 deny from <attacker_ip> to any
```

### Step 2: Establish Fail2Ban Defenses
Install and start Fail2Ban to automate SSH and port scanning bans:
```bash
# Install Fail2Ban on Ubuntu
sudo apt install fail2ban -y

# Configure standard jail limits
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban --now
```

---

## 🔑 2. Immediate Secrets Rotation Pipeline

If your `.env` secrets or administrator private keys are compromised (e.g. accidentally committed to a public Git repository):

### Step 1: Stop Services
```bash
cd /opt/ngvms
sudo docker compose down
```

### Step 2: Clear and Rotate Secrets
1.  Open `/opt/ngvms/.env` using your text editor.
2.  Clear the value of `JWT_SECRET`, `SESSION_SECRET`, `MONGO_ROOT_PASSWORD`, `REDIS_PASSWORD`, `MINIO_SECRET_KEY`, `ENCRYPTION_KEY`, and `GRAFANA_PASSWORD` (leave them empty: `JWT_SECRET=`).
3.  Trigger `./install.sh`. The installer will automatically detect the empty keys and dynamically re-provision high-entropy secure values for all of them!
    ```bash
    sudo ./install.sh
    ```
4.  If the MongoDB password is changed, the database container will spin up with the new credentials automatically.
5.  All active visitor cookies and user session JWT tokens will be immediately invalidated globally, forcing a secure logout and session reset across all tenants.

---

## 🚨 3. Physical Security Compromise (Blacklist Activation)

If a blacklisted individual breaches physical entry gates, or an credentials theft occurs at check-in portals:
1.  Navigate to the Admin/Guard panel UI and flag the visitor profile under the **Blacklist** ledger.
2.  Flagging visitors updates the Socket.io event-room instantly, triggering immediate visual alerts across all active security guard terminals.
3.  All check-in attempts using that identity profile will be locked, returning checked-in statuses as denied.
