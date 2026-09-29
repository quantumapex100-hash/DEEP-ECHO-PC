@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title DEEP-ECHO Offline Launcher
color 0B

echo ============================================================
echo               DEEPECCHO - OFFLINE START
echo ============================================================
echo.
set "APPDIR=%~dp0"
if not exist "%APPDIR%package.json" (
  echo [ERROR] package.json nahi mila. START-OFFLINE.bat ko app folder ke andar rakho.
  pause
  exit /b 1
)
if exist "%APPDIR%node_modules\electron\dist\electron.exe" (
  echo DEEP-ECHO offline mode me start ho rahi hai...
  pushd "%APPDIR%"
  "%APPDIR%node_modules\electron\dist\electron.exe" .
  set "RC=%ERRORLEVEL%"
  popd
  exit /b %RC%
)
if exist "%APPDIR%node_modules\.bin\electron.cmd" (
  echo DEEP-ECHO offline mode me start ho rahi hai...
  pushd "%APPDIR%"
  call "%APPDIR%node_modules\.bin\electron.cmd" .
  set "RC=%ERRORLEVEL%"
  popd
  exit /b %RC%
)
echo [ERROR] Local Electron install nahi mila.
echo Internet ON karke INSTALL.bat ek baar successfully chalao, phir ye launcher offline chalega.
pause
exit /b 1
