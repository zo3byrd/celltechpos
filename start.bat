@echo off
title WirelessPOS - Web Version
color 0A
echo.
echo  ================================================
echo   WirelessPOS  ^|  Web Version
echo  ================================================
echo.

set NODE="C:\Program Files\nodejs\node.exe"
set NPM="C:\Program Files\nodejs\npm.cmd"

:: Install server deps if needed
if not exist "server\node_modules" (
  echo  Installing server dependencies...
  cd server
  %NPM% install
  cd ..
)

:: Install client deps if needed
if not exist "client\node_modules" (
  echo  Installing client dependencies...
  cd client
  %NPM% install
  cd ..
)

:: Seed database if it doesn't exist
if not exist "server\wireless_pos.sqlite" (
  echo  Setting up database...
  cd server
  %NODE% src/db/seed.js
  %NODE% src/db/seedIphoneParts.js
  %NODE% src/db/seedDevices.js
  cd ..
)

echo  Starting API server on port 5000...
start "WirelessPOS API" cmd /k "set PATH=C:\Program Files\nodejs;%PATH% && cd /d %~dp0server && node src\app.js"

timeout /t 3 /nobreak >nul

echo  Starting web client on port 3000...
start "WirelessPOS Client" cmd /k "set PATH=C:\Program Files\nodejs;%PATH% && cd /d %~dp0client && node node_modules\.bin\vite"

timeout /t 5 /nobreak >nul

echo.
echo  Opening browser...
start http://localhost:3000

echo.
echo  WirelessPOS is running!
echo  Browser: http://localhost:3000
echo  API:     http://localhost:5000/api
echo.
echo  Login: admin@mywireless.com / admin123
echo.
pause
