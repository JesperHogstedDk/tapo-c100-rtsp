//  ./check-process.sh

# chmod +x vis-log.sh

echo Vis processer
echo "--------------------------------"
ps aux | grep node

echo "Skriv pm2 logs"
echo "--------------------------------"
npx pm2 logs motion-capture
