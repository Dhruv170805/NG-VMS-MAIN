# Runbook: SSL/TLS Certificate Renewals

This manual explains how NG-VMS manages TLS certificates and outlines the procedure to renew or swap SSL credentials in a corporate environment.

---

## 🔒 1. Automated HTTPS via Caddy (Recommended)

By default, the Caddy Reverse Proxy manages Let's Encrypt or ZeroSSL certifications automatically!
*   **Automatic Actions:** Caddy initiates ACME handshake protocols on port `80`, requests certificates for `DOMAIN_NAME`, configures them in memory, and triggers automated renewals 30 days before expiry.
*   **No Manual Work Required:** As long as port `80` is open in the firewall to Let's Encrypt validation servers, certificate renewal requires **zero human interaction**.

---

## 🔑 2. Implementing Custom Enterprise SSL Certificates

If your server is deployed on a fully offline intranet VM (no internet connection to Let's Encrypt servers) or if corporate policy dictates using custom security certificates:

### Step 1: Place Certs in the Proxy Folder
Prepare your certificate files (`server.crt` and `server.key`) and place them inside a new local directory `/opt/ngvms/ssl/`.

### Step 2: Modify `caddy/Caddyfile`
Change the entry block to load local certificates:
```caddy
vms.client.com {
    # Load custom certificate and private key
    tls /etc/caddy/ssl/server.crt /etc/caddy/ssl/server.key

    # Standard proxy rules...
    reverse_proxy * frontend:3000
}
```

### Step 3: Mount Certs in `docker-compose.yml`
Edit the `proxy` service definition inside `docker-compose.yml` to mount the certificate files:
```yaml
  proxy:
    image: caddy:2-alpine
    ...
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - ./ssl:/etc/caddy/ssl:ro   # Mount local custom certs directory
      - caddy_data:/data
      - caddy_config:/config
```

### Step 4: Reload proxy config
```bash
# Reload proxy container
docker compose exec -d proxy caddy reload --config /etc/caddy/Caddyfile
```
