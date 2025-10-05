# ./log-overview.sh

# chmod +x log-overview.sh

#!/bin/bash
# Samlet logvisning for motion-capture og PM2

APP_NAME="motion-capture"
APP_DIR="/var/www/hogsted.dk/public_html/TapoC100"
LOG_FILE="$APP_DIR/cron-startup.log"
PM2_LOG_DIR="$HOME/.pm2/logs"

echo "📦 Motion-capture logoversigt"
echo "=============================="

echo ""
echo "📂 PM2 stdout log:"
echo "------------------"
tail -n 15 "$PM2_LOG_DIR/${APP_NAME}-out.log"

echo ""
echo "⚠️ PM2 stderr log (fejl):"
echo "--------------------------"
tail -n 15 "$PM2_LOG_DIR/${APP_NAME}-error.log"

echo ""
echo "📝 Startup-script log:"
echo "-----------------------"
tail -n 15 "$LOG_FILE"

echo ""
echo "🔍 Aktive Node.js-processer:"
echo "-----------------------------"
ps aux | grep "[n]ode"

echo ""
echo "📊 PM2-status:"
echo "-----------------------------"
npx pm2 list | grep "$APP_NAME"