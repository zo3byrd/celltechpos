#!/bin/bash
set -e
cd /var/www/celltechpos
git pull origin master
cd server
npm install
npm run build
pm2 restart celltechpos
echo "Deploy complete."
