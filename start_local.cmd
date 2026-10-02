@echo off
title 5S Parsan - Yerel Gelistirme

echo Sunucular baslatiliyor...
start "Backend  (5000)" cmd /k "cd /d "%~dp0backend" && npm run dev"
start "Frontend (5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Hazir. Tarayicida http://localhost:5173 adresini acin.
echo Durdurmak icin acilan iki pencereyi kapatin.
timeout /t 5 > nul
