@echo off
title DEEP-ECHO - Test Run
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js install nahi mila! Pehle https://nodejs.org se install karo.
    pause
    exit /b
)

if not exist "bin\yt-dlp.exe" (
    call Setup-YtDlp.bat
    if errorlevel 1 exit /b 1
)

if not exist "node_modules" (
    echo Pehli baar hai, dependencies install ho rahi hain...
    call npm install
    if errorlevel 1 (
        pause
        exit /b 1
    )
)

echo App khul rahi hai...
call npm start
if errorlevel 1 pause
