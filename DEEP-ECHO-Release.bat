@echo off
setlocal EnableExtensions
title DEEP-ECHO v2.6.7 - One-Click GitHub Release
color 0A

echo ========================================================
echo   DEEP-ECHO v2.6.7 Automatic GitHub Release Push
echo ========================================================
echo.

cd /d "%~dp5" 2>nul
cd /d "%~dp0"

echo Current Folder: %CD%
echo.

:: Check if git exists
where git.exe >nul 2>&1
if errorlevel 1 if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git.exe >nul 2>&1
if errorlevel 1 if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"

where git.exe >nul 2>&1 || (echo [ERROR] Git for Windows is missing!& goto :error)
where node.exe >nul 2>&1 || (echo [ERROR] Node.js is missing!& goto :error)

if not exist ".git" (
    echo [INFO] Initializing Git repository...
    git init -b main
    git remote add origin https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git
)

echo [1/4] Configuring Git...
set "GIT_TERMINAL_PROMPT=0"
set "GCM_INTERACTIVE=true"
set "GCM_GITHUB_AUTHMODES=browser"
git config user.name "windowsdaiyu-cyber"
git config user.email "windowsdaiyu-cyber@users.noreply.github.com"

echo [2/4] Staging and committing changes...
git add .
git commit -m "Release DEEP-ECHO v2.6.7 update" >nul 2>&1

echo [3/4] Pushing source to GitHub main...
git push -u origin HEAD:main
if errorlevel 1 (
    echo [ERROR] Push to GitHub failed!
    goto :error
)

echo [4/4] Pushing v2.6.7 tag to trigger workflow...
git tag -d v2.6.7 >nul 2>&1
git push origin :refs/tags/v2.6.7 >nul 2>&1
git tag -a "v2.6.7" -m "DEEP-ECHO v2.6.7 release"
git push origin "v2.6.7" --force

echo.
echo ========================================================
echo [SUCCESS] Pushed and tagged successfully!
echo Actions Workflow: https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions
echo ========================================================
echo.
pause
exit /b 0

:error
echo.
echo ========================================================
echo [FAILED] Process stopped due to an error.
echo ========================================================
echo.
pause
exit /b 1
