@echo off
setlocal EnableExtensions EnableDelayedExpansion
title DEEP-ECHO 2.6.1 (v2.6.1) - ONE CLICK CLOUD RELEASE
color 0A
cd /d "%~dp0"

echo ============================================================
echo          DEEP-ECHO 2.6.1 - ONE CLICK RELEASE
echo ============================================================
echo.
echo Release title : DEEP-ECHO 2.6.1
echo Update version: 2.6.1
echo Workflow      : one tag push = one complete cloud run
echo.

where git.exe >nul 2>&1 || (echo [ERROR] Git for Windows missing.& pause & exit /b 1)
where node.exe >nul 2>&1 || (echo [ERROR] Node.js missing.& pause & exit /b 1)
where npm.cmd >nul 2>&1 || (echo [ERROR] npm missing.& pause & exit /b 1)

if not exist ".github\workflows\release-windows.yml" (
  echo [ERROR] Missing .github\workflows\release-windows.yml.
  echo This source folder is incomplete. Use the corrected full release ZIP.
  pause
  exit /b 1
)
if not exist ".gitignore" (
  echo [ERROR] Missing .gitignore. Release stopped to avoid staging node_modules/build files.
  echo Use the corrected full release ZIP.
  pause
  exit /b 1
)
if not exist ".gitattributes" (
  echo [ERROR] Missing .gitattributes. This source folder is incomplete.
  echo Use the corrected full release ZIP.
  pause
  exit /b 1
)

if not exist "RELEASE-NOTES-2.6.1.md" (
  echo [ERROR] Missing RELEASE-NOTES-2.6.1.md.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%V in (`node -p "require('./package.json').version"`) do set "APP_VERSION=%%V"
if /I not "%APP_VERSION%"=="2.6.1" (
  echo [ERROR] Expected package version 2.6.1, found %APP_VERSION%.
  pause
  exit /b 1
)
set "TAG=v%APP_VERSION%"
set "SOURCE_REPO=https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git"

echo [1/9] Installing exact release dependencies...
call npm ci --no-audit --no-fund || goto :fail

echo [2/9] Running complete automated test suite...
call npm test || goto :fail

if not exist ".git" (
  echo [3/9] Connecting release folder to the source repository...
  git init -b main || goto :gitfail
  git remote add origin "%SOURCE_REPO%" || goto :gitfail
  git fetch origin main || goto :gitfail
  git reset --mixed origin/main || goto :gitfail
) else (
  echo [3/9] Existing Git checkout detected...
  git remote set-url origin "%SOURCE_REPO%" || goto :gitfail
  git fetch origin main || goto :gitfail
  git checkout main || goto :gitfail
)

set "REMOTE_TAG="
for /f %%T in ('git ls-remote --tags origin "refs/tags/%TAG%"') do set "REMOTE_TAG=%%T"
if defined REMOTE_TAG (
  echo [ERROR] %TAG% already exists. Release was NOT retriggered.
  pause
  exit /b 1
)

echo [4/9] Configuring Git identity...
git config user.name >nul 2>&1 || git config user.name "windowsdaiyu-cyber"
git config user.email >nul 2>&1 || git config user.email "windowsdaiyu-cyber@users.noreply.github.com"

echo [5/9] Staging official v2.6.1 source...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Release DEEP-ECHO v2.6.1" || goto :gitfail
) else (
  echo [OK] Source already matches the release commit.
)

echo [6/9] Pushing final source to main...
git push -u origin main || goto :gitfail

echo [7/9] Creating annotated release tag %TAG%...
git tag -a "%TAG%" -m "DEEP-ECHO 2.6.1 · v2.6.1" || goto :gitfail

echo [8/9] Triggering the cloud build/publish workflow...
git push origin "%TAG%" || goto :gitfail

echo [9/9] Done. GitHub Actions is building and publishing DEEP-ECHO 2.6.1 (v2.6.1).
echo.
echo IMPORTANT: Is BAT ko dobara mat chalana jab workflow already running ho.
start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions"
pause
exit /b 0

:gitfail
echo.
echo [ERROR] Git/GitHub operation failed. Do not start a second release attempt until this is fixed.
echo Agar browser GitHub login khole, login/Authorize complete karke same BAT ko dobara run karo.
pause
exit /b 1

:fail
echo.
echo [ERROR] Local release preflight failed. Nothing was tagged or released.
pause
exit /b 1
