# ./start-or-resurrect.sh

# chmod +x start-or-resurrect.sh

#!/bin/bash
# Kombineret start/resurrect-script til motion-capture

APP_DIR="/var/www/hogsted.dk/public_html/TapoC100"
LOG_FILE="$APP_DIR/cron-startup.log"
APP_NAME="motion-capture"
APP_PATH="dist/motion-capture.js"

cd "$APP_DIR" || exit 1

echo "[$(date)] ▶️ Start/resurrect-script aktiveret" >> "$LOG_FILE"

# Installer PM2 hvis nødvendigt
if ! command -v pm2 &> /dev/null; then
  echo "PM2 mangler – installerer..." >> "$LOG_FILE"
  npm install pm2 >> "$LOG_FILE" 2>&1
fi

# Tjek om app kører
RUNNING=$(npx pm2 list | grep "$APP_NAME" | grep online)

if [ -z "$RUNNING" ]; then
  # Tjek om der findes en tidligere dump
  if [ -f "$HOME/.pm2/dump.pm2" ]; then
    echo "🔄 Resurrect fra tidligere dump..." >> "$LOG_FILE"
    npx pm2 resurrect >> "$LOG_FILE" 2>&1
  else
    echo "🚀 Starter appen fra ny..." >> "$LOG_FILE"
    npx pm2 start "$APP_PATH" --name "$APP_NAME" \
      --log-date-format="YYYY-MM-DD HH:mm:ss" \
      --max-memory-restart 200M >> "$LOG_FILE" 2>&1
    npx pm2 save >> "$LOG_FILE"
  fi
else
  echo "✅ App '$APP_NAME' kører allerede." >> "$LOG_FILE"
fi

echo "[$(date)] ✅ Script afsluttet" >> "$LOG_FILE"