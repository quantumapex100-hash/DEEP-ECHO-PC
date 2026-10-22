@echo off
setlocal EnableExtensions
title DEEP-ECHO 2.6.6 - Cloud Release
cd /d "%~dp0"
where git.exe >nul 2>&1 || (echo [ERROR] Git for Windows missing.& pause & exit /b 1)
where node.exe >nul 2>&1 || (echo [ERROR] Node.js missing.& pause & exit /b 1)
echo DEEP-ECHO 2.6.6 - Source checks then GitHub cloud build
echo Expected package version 2.6.6
echo Local dependency installation: SKIPPED
echo Heavy dependency install/tests intentionally run on GitHub Actions
echo GitHub login: saved sign-in or browser Authorize. No terminal username/password.
node --check main.js || goto :fail
node --check preload.js || goto :fail
node --check src\renderer.js || goto :fail
node --check src\home-discovery.js || goto :fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\release-windows.ps1" -ExpectedVersion "2.6.6" %*
if errorlevel 1 goto :fail
echo [OK] Release command completed. Check the workflow link above.
pause
exit /b 0
:fail
echo [ERROR] Release stopped. Keep the error above. Do not change or overwrite existing release tags.
pause
exit /b 1
