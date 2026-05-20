#!/bin/bash
# NG-VMS Enterprise Installation Script
# This script sets up the production Docker environment for the client.

set -e

echo "======================================"
echo " NG-VMS Enterprise Deployment Setup"
echo "======================================"

# Ensure .env exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please copy .env.example to .env and configure it before running this script."
  exit 1
fi

echo "[1/4] Pulling latest Docker images..."
docker compose pull

echo "[2/4] Initializing secure MongoDB keyfile..."
mkdir -p data/mongo
if [ ! -f data/mongo/mongo.key ]; then
  openssl rand -base64 756 > data/mongo/mongo.key
  chmod 400 data/mongo/mongo.key
  echo "Keyfile generated successfully."
else
  echo "Keyfile already exists. Skipping."
fi

echo "[3/4] Starting NG-VMS stack in detached mode..."
docker compose up -d

echo "[4/4] Verifying running containers..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "======================================"
echo " Deployment Successful!"
echo " Check logs with: docker compose logs -f"
echo "======================================"
