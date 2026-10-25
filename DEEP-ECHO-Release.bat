@echo off
setlocal EnableExtensions
title DEEP-ECHO v2.6.8 - One-Click GitHub Release
color 0A

echo ========================================================
echo   DEEP-ECHO v2.6.8 Automatic GitHub Release Push
echo ========================================================
echo.

:: Check if package.json exists in current folder, else switch to default project folder
if not exist "%~dp0package.json" (
    if exist "C:\Users\windo\AppData\Local\DEEP-ECHO\ReleaseWork\v2.6.7-build3-88565cf37905\package.json" (
        cd /d "C:\Users\windo\AppData\Local\DEEP-ECHO\ReleaseWork\v2.6.7-build3-88565cf37905"
    ) else if exist "C:\Users\windo\OneDrive\Documents\DeepEcho-PC-Development\package.json" (
        cd /d "C:\Users\windo\OneDrive\Documents\DeepEcho-PC-Development"
    ) else (
        echo [ERROR] package.json not found! Please place this BAT file inside your project folder.
        goto :error
    )
) else (
    cd /d "%~dp0"
)

:: 1. Check Git and Node
where git.exe >nul 2>&1
if errorlevel 1 if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git.exe >nul 2>&1
if errorlevel 1 if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"

where git.exe >nul 2>&1 || (echo [ERROR] Git for Windows is missing! Please install Git.& goto :error)
where node.exe >nul 2>&1 || (echo [ERROR] Node.js is missing! Please install Node.js.& goto :error)

echo Current Directory: %CD%
echo.

echo [1/5] Checking source integrity for v2.6.8...
if not exist "package.json" (
    echo [ERROR] package.json not found in current directory!
    goto :error
)

node --check main.js >nul 2>&1

echo [2/5] Configuring Git Credential Manager...
set "GIT_TERMINAL_PROMPT=0"
set "GCM_INTERACTIVE=true"
set "GCM_GITHUB_AUTHMODES=browser"

git config user.name "windowsdaiyu-cyber"
git config user.email "windowsdaiyu-cyber@users.noreply.github.com"

echo [3/5] Staging and committing version 2.6.8 changes...
git add .
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Release DEEP-ECHO v2.6.8"
    if errorlevel 1 (
        echo [INFO] Nothing new to commit.
    )
) else (
    echo [INFO] No changes to commit, proceeding...
)

echo [4/5] Pushing source to GitHub main...
git push origin HEAD:main
if errorlevel 1 (
    echo [ERROR] Push to GitHub failed! Please check your internet connection or GitHub login.
    goto :error
)

echo [5/5] Creating and pushing v2.6.8 tag to trigger release workflow...
git tag -a "v2.6.8" -m "DEEP-ECHO v2.6.8 official release"
git push origin "v2.6.8"
if errorlevel 1 (
    echo [WARNING] Tag push skipped or already exists.
)

echo.
echo ========================================================
echo [SUCCESS] DEEP-ECHO v2.6.8 pushed successfully!
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
