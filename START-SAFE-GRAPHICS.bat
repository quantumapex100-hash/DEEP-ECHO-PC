@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title DEEP-ECHO Safe Graphics Start
set "ELECTRON_RUN_AS_NODE="
if not exist "node_modules\electron\dist\electron.exe" (
  echo [ERROR] Electron missing. Run INSTALL.bat once.
  pause
  exit /b 1
)
echo Starting DEEP-ECHO with software graphics...
echo First launch may take time while OneDrive finishes loading files.
"node_modules\electron\dist\electron.exe" . --disable-gpu
set "APP_RC=%ERRORLEVEL%"
if not "%APP_RC%"=="0" (
  echo [ERROR] DEEP-ECHO exited with code %APP_RC%.
  pause
)
exit /b %APP_RC%
