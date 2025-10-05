# ./stop.sh
#!/bin/bash
# Stopper motion-capture og relaterede processer

# chmod +x stop.sh

#!/bin/bash
# Stopper motion-capture og relaterede processer

APP_NAME="motion-capture"

echo "🛑 Stopper PM2-app '$APP_NAME'..."
npx pm2 list | grep "$APP_NAME" && npx pm2 stop $APP_NAME && npx pm2 delete $APP_NAME

echo "🔍 Stopper løse Node.js-processer..."
pkill -f "node dist/motion-capture.js"

echo "🔍 Stopper ffmpeg-processer relateret til stream2..."
pkill -f "ffmpeg.*stream2"

echo "🔍 Stopper logvisninger..."
pkill -f "pm2 logs $APP_NAME"

echo "✅ Alle relevante processer forsøgt stoppet."