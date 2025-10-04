#!/bin/bash
# Stop TapoC100 motion capture (Node.js)

# Find alle kørende node-processer der peger på motion-capture.js
PIDS=$(ps aux | grep "node dist/motion-capture.js" | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
  echo "Ingen kørende motion-capture.js processer fundet."
else
  echo "Stopper processer: $PIDS"
  kill -9 $PIDS
  echo "✅ Processen er stoppet."
fi