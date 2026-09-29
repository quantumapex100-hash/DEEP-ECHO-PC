@echo off
setlocal EnableExtensions
title DEEP-ECHO - Portable Build
color 0A
cd /d "%~dp0"

net session >nul 2>&1
if errorlevel 1 (
    echo [INFO] Administrator permission mang rahe hain...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs -WorkingDirectory '%~dp0'"
    exit /b 0
)

set "BUILD_TEMP=%LOCALAPPDATA%\DEEP-ECHO\BuildTemp"
if not exist "%BUILD_TEMP%" mkdir "%BUILD_TEMP%" >nul 2>&1
set "TEMP=%BUILD_TEMP%"
set "TMP=%BUILD_TEMP%"
set "CSC_IDENTITY_AUTO_DISCOVERY=false"

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm.cmd nahi mila.
    pause
    exit /b 1
)

call "%~dp0Setup-YtDlp.bat"
if errorlevel 1 exit /b 1
call npm.cmd install --no-audit --no-fund
if errorlevel 1 exit /b 1
if exist "dist" rmdir /s /q "dist" >nul 2>&1

REM --dir creates the unpacked Windows application without the NSIS installer stage.
call npx.cmd electron-builder --win --dir
if errorlevel 1 (
    echo [ERROR] Portable/unpacked build fail hua.
    pause
    exit /b 1
)

echo.
echo [OK] Portable app ready: dist\win-unpacked\DEEP-ECHO.exe
start "" "%~dp0dist\win-unpacked"
pause
exit /b 0
