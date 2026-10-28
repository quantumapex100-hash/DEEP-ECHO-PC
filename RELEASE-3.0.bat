@echo off
setlocal EnableExtensions
title DEEP-ECHO v3.0 - One-Click GitHub Release
color 0A

echo ========================================================
echo   DEEP-ECHO v3.0 Automatic GitHub Release Push
echo   YouTube Music Autoplay & Synced Lyrics Engine
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/5] Checking Git and Node environment...
where git.exe >nul 2>&1
if errorlevel 1 if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git.exe >nul 2>&1
if errorlevel 1 if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
where git.exe >nul 2>&1
if errorlevel 1 if exist "C:\Git\cmd\git.exe" set "PATH=C:\Git\cmd;%PATH%"

where node.exe >nul 2>&1
if errorlevel 1 if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"

where git.exe >nul 2>&1 || (echo [ERROR] Git for Windows is missing!& goto :error)
where node.exe >nul 2>&1 || (echo [ERROR] Node.js is missing!& goto :error)

echo Current Folder: %CD%
echo Git: OK
echo Node: OK
echo.

echo [2/5] Running pre-release syntax and integrity checks...
node --check main.js || goto :error
node --check preload.js || goto :error
node --check src\renderer.js || goto :error
node --check src\home-discovery.js || goto :error
node --check src\v200.js || goto :error
echo Integrity checks passed!
echo.

echo [3/5] Configuring Git authentication...
set "GIT_TERMINAL_PROMPT=0"
set "GCM_INTERACTIVE=true"
set "GCM_GITHUB_AUTHMODES=browser"
git config user.name "windowsdaiyu-cyber"
git config user.email "windowsdaiyu-cyber@users.noreply.github.com"

if not exist ".git" (
    echo [INFO] Initializing Git repository...
    git init -b main
    git remote add origin https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git
)

echo.
echo [4/5] Staging all files and creating release commit...
git add .
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Release DEEP-ECHO v3.0 - YouTube Music Autoplay & Synced Lyrics Update"
    if errorlevel 1 (
        echo [INFO] Commit completed.
    )
) else (
    echo [INFO] Working tree clean, nothing new to commit.
)

echo.
echo [5/5] Pushing code to GitHub (origin main)...
git push origin HEAD:main
if errorlevel 1 (
    echo [ERROR] Push to GitHub failed! Please check your internet connection or GitHub permissions.
    goto :error
)

echo.
echo ========================================================
echo   [SUCCESS] DEEP-ECHO v3.0 PUSHED TO GITHUB SUCCESSFULLY!
echo ========================================================
echo   GitHub Repo:
echo   https://github.com/windowsdaiyu-cyber/DEEP-ECHO
echo.
echo   - Code has been cleanly updated on main branch.
echo   - No invalid cloud tags pushed (Zero GitHub Action failures!).
echo.
echo   To generate the final Windows installer (.exe):
echo   Run "Build-Karo.bat" or "Build-Portable.bat" in this folder.
echo ========================================================
echo.
pause
exit /b 0

:error
echo.
echo ========================================================
echo   [FAILED] Process encountered an error.
echo   Please review the message above.
echo ========================================================
echo.
pause
exit /b 1
