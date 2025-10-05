# ./vis-log.sh

# chmod +x vis-log.sh

#!/bin/bash

echo "Vis processer"
echo "--------------------------------"
ps aux | grep "[n]ode"

echo "Skriv pm2 logs"
echo "--------------------------------"
npx pm2 logs motion-capture
