# NG-VMS Enterprise Change Log

All notable changes to the NG-VMS Enterprise platform will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v2.1.1] - 2026-05-18
### Added
- **Zero-Touch Automated Installer (`install.sh`)**: Orchestrates full package installation, installs Docker engine dependencies, configures local host permissions, validates open ports (`80`/`443`), locks down the server's public network via `ufw`, and runs initial diagnostics.
- **Dynamic Secret Auto-Generation**: Automates the cryptographic creation of `JWT_SECRET`, `SESSION_SECRET`, `MONGO_ROOT_PASSWORD`, `REDIS_PASSWORD`, `MINIO_SECRET_KEY`, and `ENCRYPTION_KEY` using secure operating system entropy interfaces during VPS initialization.
- **Enterprise Diagnostics Tool (`healthcheck.sh`)**: Implements comprehensive multi-point diagnostics verifying service availability, database replica synchronization, cache latency, disk boundaries, host RAM usage, and SSL/TLS validation.
- **Outbound Notifications**: Upgraded the Alertmanager setup in `monitoring/alertmanager.yml` to support custom enterprise Slack Webhooks and secure SMTP relays.
- **Production Hardened Headers**: Hardened Caddy Reverse Proxy with HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and strict cross-origin Referrer policy parameters.
- **Operational Runbooks (`RUNBOOKS/`)**: Seeding guides for server migration, backup recovery, scaling, database restore, and security incident response.

### Changed
- **Log Rotation Policy**: Configured strict Docker engine JSON-file logging limitations (`max-size: 10m` and `max-file: 5` on all containers) to guarantee that system logging cannot consume host storage.
- **Offline License Key Path**: Set core licensing to point securely to the `license_NGS.lic` file.
- **Database Backup Alignments**: Optimized backup and restore streams to natively dump compressed archives (`.gz` / `.tar.gz`) instead of loose uncompressed directories.

---

## [v2.0.0] - 2026-05-08
### Added
- **AETHER Eyes Observatory**: Prometheus, Grafana, and Alertmanager integrations tracking real-time API performance, error rates, and system resources.
- **Aadhaar Document OCR Recognition**: Complete sovereign Aadhaar card parsing.
- **Offline Face Recognition Worker**: Sovereign Web Worker architecture doing local client face matching.

---

## [v1.1.0] - 2026-04-15
### Added
- **Multi-Tenant Logical Isolation Middleware**: Isolates cross-subdomain API sessions.
- **Local MinIO Object Storage Engine**: Complete localized replacement for S3 resources.

---

## [v1.0.0] - 2026-03-01
### Added
- **Initial Enterprise Launch**: Monorepo application structure, responsive admin management dashboard, guard check-in portals, and sovereign local database persistence.
