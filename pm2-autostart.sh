# ./pm2-autostart.sh
# chmod +x pm2-autostart.sh

#!/bin/bash

# Sti til projekt
APP_DIR="/var/www/hogsted.dk/public_html/TapoC100"
LOG_FILE="$APP_DIR/cron-startup.log"
APP_NAME="motion-capture"

cd "$APP_DIR" || exit 1

echo "[$(date)] Starter PM2-autostart..." >> "$LOG_FILE"

# Tjek om PM2 er installeret
if ! command -v pm2 &> /dev/null; then
  echo "PM2 ikke installeret – forsøger installation..." >> "$LOG_FILE"
  npm install pm2 >> "$LOG_FILE" 2>&1
fi

# Tjek om app kører
RUNNING=$(npx pm2 list | grep "$APP_NAME" | grep online)

if [ -z "$RUNNING" ]; then
  echo "App ikke kørende – forsøger resurrect..." >> "$LOG_FILE"
  npx pm2 resurrect >> "$LOG_FILE" 2>&1
else
  echo "App '$APP_NAME' kører allerede." >> "$LOG_FILE"
fi

echo "[$(date)] PM2-autostart afsluttet." >> "$LOG_FILE"