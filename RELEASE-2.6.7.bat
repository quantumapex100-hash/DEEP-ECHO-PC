@echo off
setlocal EnableExtensions
title DEEP-ECHO 2.6.7 - FAST ONE CLICK CLOUD RELEASE
color 0A
cd /d "%~dp0"
where git.exe >nul 2>&1
if errorlevel 1 if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git.exe >nul 2>&1
if errorlevel 1 if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
where git.exe >nul 2>&1 || (echo [ERROR] Git for Windows missing.& pause & exit /b 1)
where node.exe >nul 2>&1 || (echo [ERROR] Node.js missing.& pause & exit /b 1)
echo DEEP-ECHO 2.6.7 - Source checks then GitHub cloud build
echo Expected package version 2.6.7
echo Local dependency installation: SKIPPED
echo Heavy dependency install/tests intentionally run on GitHub Actions
echo GitHub login: saved sign-in or browser Authorize. No terminal username/password.
echo [1/8] Fast local integrity checks...
node --check main.js || goto :fail
node --check preload.js || goto :fail
node --check src\renderer.js || goto :fail
node --check src\home-discovery.js || goto :fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\release-windows.ps1" -ExpectedVersion "2.6.7" %*
if errorlevel 1 goto :fail
echo [OK] Release command completed. Check the workflow link above.
pause
exit /b 0
:fail
echo [ERROR] Release stopped. Keep the error above. Do not change or overwrite existing release tags.
pause
exit /b 1
