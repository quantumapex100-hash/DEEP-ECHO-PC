@echo off
setlocal EnableExtensions
title DEEP-ECHO v2.6.8 - Claude Release Utility
color 0A

echo ========================================================
echo   DEEP-ECHO v2.6.8 Automatic GitHub Release Push
echo ========================================================
echo.

:: Switch to the current folder where this bat is located
cd /d "%~dp0"

:: 1. Check Git and Node
where git.exe >nul 2>&1
if errorlevel 1 if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git.exe >nul 2>&1
if errorlevel 1 if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"

where git.exe >nul 2>&1 || (echo [ERROR] Git for Windows is missing!& goto :error)
where node.exe >nul 2>&1 || (echo [ERROR] Node.js is missing!& goto :error)

echo Current Directory: %CD%
echo.

echo [1/5] Checking source integrity for v2.6.8...
if not exist "package.json" (
    echo [ERROR] package.json not found in this folder!
    goto :error
)

echo [2/5] Configuring Git Credential Manager...
set "GIT_TERMINAL_PROMPT=0"
set "GCM_INTERACTIVE=true"
set "GCM_GITHUB_AUTHMODES=browser"

git config user.name "windowsdaiyu-cyber"
git config user.email "windowsdaiyu-cyber@users.noreply.github.com"

echo [3/5] Staging and committing version 2.6.8...
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
    echo [ERROR] Push to GitHub failed!
    goto :error
)

echo [5/5] Pushing v2.6.8 tag to trigger GitHub Action workflow...
git tag -d v2.6.8 >nul 2>&1
git push origin :refs/tags/v2.6.8 >nul 2>&1
git tag -a "v2.6.8" -m "DEEP-ECHO v2.6.8 release"
git push origin "v2.6.8" --force
if errorlevel 1 (
    echo [ERROR] Tag push failed.
    goto :error
)

echo.
echo ========================================================
echo [SUCCESS] DEEP-ECHO v2.6.8 pushed and tagged successfully!
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
