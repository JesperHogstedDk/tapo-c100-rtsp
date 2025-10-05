# ./vis-log.sh

# chmod +x vis-log.sh

#!/bin/bash

#!/bin/bash
APP_NAME="motion-capture"

echo "🔍 Aktive Node.js-processer:"
echo "--------------------------------"
ps aux | grep "[n]ode"

echo ""
echo "📊 PM2-status for '$APP_NAME':"
echo "--------------------------------"
npx pm2 list | grep "$APP_NAME"

echo ""
echo "📂 Viser logs for '$APP_NAME'..."
echo "--------------------------------"
npx pm2 logs $APP_NAME