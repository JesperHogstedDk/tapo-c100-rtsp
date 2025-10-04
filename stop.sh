#!/bin/bash
# Stopper motion-capture og relaterede processer

# chmod +x stop-motion.sh


APP_NAME="motion-capture"

echo "🛑 Stopper PM2-app '$APP_NAME'..."
npx pm2 stop $APP_NAME
npx pm2 delete $APP_NAME

echo "🔍 Finder og stopper løse Node.js-processer..."
ps aux | grep "node dist/motion-capture.js" | grep -v grep | awk '{print $2}' | xargs -r kill

echo "🔍 Finder og stopper ffmpeg-processer..."
ps aux | grep ffmpeg | grep stream2 | grep -v grep | awk '{print $2}' | xargs -r kill

echo "✅ Alle relevante processer forsøgt stoppet."