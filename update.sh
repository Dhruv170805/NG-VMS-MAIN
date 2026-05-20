#!/bin/bash
# NG-VMS Enterprise Update Script
# Usage: ./update.sh

set -e

echo "======================================"
echo " NG-VMS Enterprise Update Process"
echo "======================================"

echo "[1/3] Pulling latest Docker images..."
docker compose pull

echo "[2/3] Restarting updated containers..."
docker compose up -d --remove-orphans

echo "[3/3] Pruning unused Docker images..."
docker image prune -f

echo ""
echo "======================================"
echo " Update completed successfully!"
echo "======================================"
