#!/bin/bash
# Start TapoC100 motion capture med PM2

echo "📦 Installerer PM2 lokalt (hvis nødvendigt)..."
npm install pm2

APP="dist/motion-capture.js"
APP_NAME="motion-capture"

echo "🔄 Stopper tidligere instans (hvis den findes)..."
npx pm2 delete $APP_NAME

echo "🚀 Starter $APP med PM2..."
npx pm2 start $APP --name $APP_NAME

echo "💾 Gemmer PM2 konfiguration..."
npx pm2 save

echo "🔁 Aktiverer PM2 auto-start ved genstart..."
npx pm2 startup | tail -n 1 | bash

echo "📋 Status:"
npx pm2 status

