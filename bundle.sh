#!/bin/bash
# NG-VMS Enterprise Bundler — produces a client-deliverable with NO source code
# Usage: ./bundle.sh [version]

set -euo pipefail

VERSION="${1:-2.1.1}"
BUNDLE_DIR="ngvms-enterprise-v${VERSION}"
OUTPUT="${BUNDLE_DIR}.tar.gz"
IMAGES_TAR="ngvms-images.tar"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
die()  { echo -e "${RED}[✗]${NC} $*"; exit 1; }

echo "=================================================="
echo "   📦 NG-VMS ENTERPRISE BUNDLER v${VERSION}"
echo "=================================================="

# ── Prereqs ────────────────────────────────────────────────────────────────
command -v docker   &>/dev/null || die "Docker not found"
docker compose version &>/dev/null || die "Docker Compose v2 not found"

# ── Build images from prod compose ─────────────────────────────────────────
log "Building Docker images (prod compose)..."
docker compose -f docker-compose.prod.yml build --no-cache \
  --build-arg NEXT_PUBLIC_API_URL=/api \
  --build-arg NEXT_PUBLIC_SOCKET_URL=/

log "Tagging images..."
docker tag ngvms-backend:latest  "ngvms-backend:${VERSION}"
docker tag ngvms-frontend:latest "ngvms-frontend:${VERSION}"

# ── Export images ───────────────────────────────────────────────────────────
log "Exporting Docker images → ${IMAGES_TAR} (may take a few minutes)..."
docker save \
  "ngvms-backend:latest" \
  "ngvms-frontend:latest" \
  "mongo:6" \
  "redis:7-alpine" \
  "minio/minio:latest" \
  "caddy:2-alpine" \
  "maildev/maildev:latest" \
  -o "${IMAGES_TAR}"

log "Images exported: $(du -h ${IMAGES_TAR} | cut -f1)"

# ── Assemble bundle directory ───────────────────────────────────────────────
log "Assembling bundle..."
rm -rf "${BUNDLE_DIR}"
mkdir -p "${BUNDLE_DIR}/monitoring"
mkdir -p "${BUNDLE_DIR}/caddy"

# Core deployment files — NO source code
cp docker-compose.prod.yml     "${BUNDLE_DIR}/docker-compose.yml"
cp docker-compose.iis.yml      "${BUNDLE_DIR}/docker-compose.iis.yml"
cp Caddyfile                   "${BUNDLE_DIR}/Caddyfile"
cp web.config.example          "${BUNDLE_DIR}/web.config.example"
cp .env.example                "${BUNDLE_DIR}/.env.example"
cp ngvms-enterprise/install.sh "${BUNDLE_DIR}/install.sh"
cp ngvms-enterprise/update.sh  "${BUNDLE_DIR}/update.sh"
cp ngvms-enterprise/restore.sh "${BUNDLE_DIR}/restore.sh"
cp ngvms-enterprise/healthcheck.sh "${BUNDLE_DIR}/healthcheck.sh"
cp install.ps1                 "${BUNDLE_DIR}/install.ps1"
cp launcher.bat                "${BUNDLE_DIR}/launcher.bat"
cp README.md                   "${BUNDLE_DIR}/README.md"
cp monitoring/prometheus.yml   "${BUNDLE_DIR}/monitoring/prometheus.yml"
cp monitoring/alert.rules.yml  "${BUNDLE_DIR}/monitoring/alert.rules.yml"
cp monitoring/alertmanager.yml "${BUNDLE_DIR}/monitoring/alertmanager.yml"

# License file (if present)
if [ -f license_NGS.lic ]; then
  cp license_NGS.lic "${BUNDLE_DIR}/license_NGS.lic"
  log "license_NGS.lic included"
elif [ -f license.vlic ]; then
  cp license.vlic "${BUNDLE_DIR}/license_NGS.lic"
  log "license.vlic included (as license_NGS.lic)"
else
  warn "License file NOT found — client must supply their own"
fi

# Image tarball
mv "${IMAGES_TAR}" "${BUNDLE_DIR}/${IMAGES_TAR}"

# Make scripts executable
chmod +x "${BUNDLE_DIR}/install.sh"
chmod +x "${BUNDLE_DIR}/update.sh"
chmod +x "${BUNDLE_DIR}/restore.sh"
chmod +x "${BUNDLE_DIR}/healthcheck.sh"

# ── Pack ────────────────────────────────────────────────────────────────────
log "Packing → ${OUTPUT}..."
tar -czf "${OUTPUT}" "${BUNDLE_DIR}/"
rm -rf "${BUNDLE_DIR}"

echo ""
echo "=================================================="
echo "   ✅ BUNDLE READY: ${OUTPUT}"
echo "   SIZE: $(du -h ${OUTPUT} | cut -f1)"
echo "=================================================="
echo ""
echo "  Deliver ${OUTPUT} to the client."
echo "  On the client server:"
echo "    tar -xzf ${OUTPUT}"
echo "    cd ${BUNDLE_DIR}"
echo "    chmod +x install.sh && sudo ./install.sh"
echo "=================================================="
