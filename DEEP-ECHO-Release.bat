@echo off
setlocal EnableExtensions
title DEEP-ECHO v2.6.7 - One-Click GitHub Release
color 0A

echo ========================================================
echo   DEEP-ECHO v2.6.7 Automatic GitHub Release Push
echo ========================================================
echo.

set "TARGET_DIR=C:\Users\windo\OneDrive\Documents\DeepEcho-PC-Development\DEEP-ECHO-v2.6.5-FAST-CLOUD-RELEASE-SOURCE\DEEP-ECHO-v2.6.5-FAST-CLOUD-RELEASE-SOURCE"

if not exist "%TARGET_DIR%" (
    echo [ERROR] Target folder not found!
    goto :error
)

cd /d "%TARGET_DIR%"

:: 1. Check Git and Node
where git.exe >nul 2>&1
if errorlevel 1 if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git.exe >nul 2>&1
if errorlevel 1 if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"

where git.exe >nul 2>&1 || (echo [ERROR] Git for Windows is missing!& goto :error)
where node.exe >nul 2>&1 || (echo [ERROR] Node.js is missing!& goto :error)

echo Current Directory: %CD%
echo.

:: 2. Initialize Git if not already a repository
if not exist ".git" (
    echo [INFO] Initializing Git repository...
    git init -b main
    git remote add origin https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git
)

echo [1/5] Configuring Git Credential Manager...
set "GIT_TERMINAL_PROMPT=0"
set "GCM_INTERACTIVE=true"
set "GCM_GITHUB_AUTHMODES=browser"

git config user.name "windowsdaiyu-cyber"
git config user.email "windowsdaiyu-cyber@users.noreply.github.com"

echo [2/5] Staging and committing changes...
git add .
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Release DEEP-ECHO v2.6.7 update"
    if errorlevel 1 (
        echo [INFO] Nothing new to commit.
    )
) else (
    echo [INFO] No changes to commit, proceeding...
)

echo [3/5] Pulling remote changes to avoid conflicts...
git pull origin main --allow-unrelated-histories --no-rebase >nul 2>&1

echo [4/5] Pushing source to GitHub main...
git push -u origin HEAD:main
if errorlevel 1 (
    echo [ERROR] Push to GitHub failed! Please check your internet connection or login.
    goto :error
)

echo [5/5] Pushing v2.6.7 tag to trigger GitHub Action workflow...
git tag -d v2.6.7 >nul 2>&1
git push origin :refs/tags/v2.6.7 >nul 2>&1
git tag -a "v2.6.7" -m "DEEP-ECHO v2.6.7 release"
git push origin "v2.6.7" --force
if errorlevel 1 (
    echo [ERROR] Tag push failed.
    goto :error
)

echo.
echo ========================================================
echo [SUCCESS] DEEP-ECHO v2.6.7 pushed and tagged successfully!
echo Actions Workflow Link:
echo https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions
echo ========================================================
echo.
pause
exit /b 0

:error
echo.
echo ========================================================
echo [FAILED] Process stopped. Please check the error above.
echo ========================================================
echo.
pause
exit /b 1
