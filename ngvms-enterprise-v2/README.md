# NG-VMS Enterprise Package (On-Premise)

This package is engineered for **Strict On-Premise Deployment**, supporting air-gapped environments, restricted networks, and high-availability requirements.

## 🖥️ Server Requirements

To ensure zero-latency performance and biometric processing stability, the following specifications are mandatory:

| Component | Minimum | Recommended |
| :--- | :--- | :--- |
| **CPU** | 4 Core | **8 Core (Intel/AMD)** |
| **RAM** | 8GB | **16GB – 32GB** |
| **Storage** | 50GB SSD | **200GB+ NVMe SSD** |
| **OS** | Ubuntu 22.04 LTS | **Ubuntu Server 22.04 LTS** |
| **Network** | Local Network | **Static IP / Internal DNS** |

## 📡 Network Architecture (Zero-Internet)

NG-VMS is designed for **Offline Resilience**. It does not require an internet connection for its core operations:
- **Local Biometrics**: Face detection and OCR run on the server/client main-thread.
- **Local Storage**: Uses **MinIO** instead of AWS S3 for all document and biometric storage.
- **Local Notifications**: Uses **Local SMTP** relay for internal email alerts.
- **Local Identity**: Aadhaar Verhoeff validation is performed locally without external API calls.

## 🧱 Integrated Services

The enterprise stack includes:
- **Caddy/Nginx**: Automatic reverse proxy and SSL termination.
- **MongoDB Replica Set**: Single-node or multi-node replica set for data integrity.
- **Redis**: Real-time state management and socket synchronization.
- **MinIO**: Sovereign S3-compatible object storage.
- **MailDev/SMTP**: Local email testing and relay.

## 🚀 Quick Start

1.  **Configure Environment**:
    ```bash
    cp .env.example .env
    # Update secrets and DOMAIN_NAME in .env
    ```
2.  **Run Installer**:
    ```bash
    ./install.sh
    ```
3.  **Access**:
    - **Portal**: `http://localhost` (or your static IP)
    - **MinIO Console**: `http://localhost:9001`
    - **Mail UI**: `http://localhost:1080`

## 🔐 Offline License System

On-premise deployments use a **Signed Offline License (`license.vlic`)**. 
- Format: JSON with RSA-Signature.
- Validation: The system checks the `hw_fingerprint` and `expiresAt` against the local hardware clock and UUID.
- Verification: Ensure the `LICENSE_SECRET` in `.env` matches your organization's key.

## 💾 Maintenance

Manual Backup:
```bash
./scripts/backup.sh
```
The script will now backup both MongoDB data and MinIO object buckets.

---
© 2026 NextGen VMS Enterprise - Built for Sovereignty.
