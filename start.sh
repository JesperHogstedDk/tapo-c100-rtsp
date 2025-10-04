# Start TapoC100 motion capture med nohup
APP="dist/motion-capture.js" 
LOGFILE="out.log"
echo "Starter $APP i baggrunden..." 
nohup node $APP > $LOGFILE 2>&1 & PID=$! 
echo "Kører med PID $PID" 
echo "Log kan følges med: tail -f $LOGFILE"
