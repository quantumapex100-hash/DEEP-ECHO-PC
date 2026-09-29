@echo off
setlocal EnableExtensions
title DEEP-ECHO - Development Setup
color 0A
cd /d "%~dp0"

echo ============================================================
echo              DEEP-ECHO - ONE CLICK SETUP
echo ============================================================
echo.

where node.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js installed nahi hai ya PATH me nahi mila.
    echo Node.js LTS install karke INSTALL.bat dobara chalao.
    pause
    exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm.cmd nahi mila. Node.js installation repair/reinstall karo.
    pause
    exit /b 1
)

echo [1/4] Node.js check...
node --version

echo.
echo [2/4] npm check...
call npm.cmd --version

echo.
echo [3/4] DEEP-ECHO dependencies install/check...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 (
    echo [ERROR] npm install fail ho gaya.
    pause
    exit /b 1
)

echo.
echo [4/4] yt-dlp safe setup/check...
call "%~dp0Setup-YtDlp.bat"
if errorlevel 1 (
    echo [ERROR] yt-dlp setup fail hua. Setup incomplete hai.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo              INSTALL / SETUP COMPLETE
echo ============================================================
echo.
choice /C YN /N /M "Ab DEEP-ECHO start karna hai? [Y/N]: "
if errorlevel 2 goto :done

echo.
echo DEEP-ECHO start ho rahi hai...
call npm.cmd start
set "APP_RC=%ERRORLEVEL%"
if not "%APP_RC%"=="0" (
    echo.
    echo [WARN] DEEP-ECHO exit code: %APP_RC%
)

:done
echo.
echo Done.
pause
exit /b 0
