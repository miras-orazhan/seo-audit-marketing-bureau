#!/bin/bash
# ============================================================
# Deploy script для Plesk — выполняется после git pull
# ============================================================

set -e

echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Plesk deployment"
echo "=========================================="

cd "$(dirname "$0")"

# Устанавливаем зависимости
echo "[1/3] Installing dependencies..."
npm install --legacy-peer-deps
echo "Dependencies installed."

# Собираем проект
echo "[2/3] Building Next.js..."
npm run build
echo "Build complete."

# Перезапускаем приложение
echo "[3/3] Restarting application..."
if command -v pm2 &> /dev/null; then
  pm2 restart seo-audit --update-env 2>/dev/null || pm2 start "npm run start" --name seo-audit
  pm2 save
  echo "Application restarted via PM2."
elif command -v passenger &> /dev/null; then
  touch tmp/restart.txt 2>/dev/null || true
  echo "Application restart signal sent to Passenger."
else
  echo "Restart manually: npm run start"
fi

echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deployment complete!"
echo "=========================================="
