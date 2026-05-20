# Runbook: Monitoring & Troubleshooting Alerts

This handbook explains how to query platform logs and configure observability bounds inside AETHER Eyes (Prometheus, Grafana, Alertmanager) to diagnose on-premise system errors.

---

## 🔍 1. Investigating Live Services Logs

If a specific container service crashes or returns errors:
```bash
# Query active container statistics
sudo docker ps -a

# Fetch backend API execution logs
sudo docker compose logs -f backend

# Fetch frontend web logs
sudo docker compose logs -f frontend

# View last 100 entries of the reverse proxy log
sudo docker compose logs --tail=100 proxy
```

---

## 📈 2. Accessing Prometheus & Grafana Observability Dashboards

Observability ports are bound strictly to `127.0.0.1` for maximum security. To view dashboards securely:

### Step 1: Establish SSH Tunneling (Host to Administrator Laptop)
Open a terminal shell on your work machine and bind local ports directly to the remote server IP:
```bash
# Tunnel Grafana (3001) and Prometheus (9090)
ssh -N -L 3001:127.0.0.1:3001 -L 9090:127.0.0.1:9090 root@your-server-ip
```

### Step 2: Open Dashboards
*   **Grafana:** Navigate to `http://localhost:3001`. Login with user `admin` and password `GRAFANA_PASSWORD` (set in `.env`).
*   **Prometheus:** Navigate to `http://localhost:9090` to query system metrics (e.g. `up`, `http_requests_total`).

---

## 📬 3. Fixing Alert Notifications Issues

If active alerts are firing but Alertmanager notifications are not delivered:
1.  Check the Alertmanager docker log to audit connection responses:
    ```bash
    sudo docker compose logs alertmanager
    ```
2.  Ensure correct Slack webhook URLs or SMTP configurations are set in `monitoring/alertmanager.yml`.
3.  Test container reachability to mail relay servers or external Slack APIs:
    ```bash
    sudo docker compose exec alertmanager nc -zvw3 smtp.client.com 587
    ```
4.  If DNS lookup fails, ensure standard corporate DNS nameservers are added to the host `/etc/resolv.conf`.
