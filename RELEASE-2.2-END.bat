@echo off
setlocal EnableExtensions EnableDelayedExpansion
title DEEP-ECHO 2.2 END - ONE CLICK CLOUD RELEASE
color 0A
cd /d "%~dp0"

echo ============================================================
echo          DEEP-ECHO 2.2 END - ONE CLICK RELEASE
echo ============================================================
echo.
echo Display name : 2.2 END
echo Update version: 2.2.8
echo Workflow     : one tag push = one complete cloud run
echo.

where git.exe >nul 2>&1 || (echo [ERROR] Git for Windows missing.& pause & exit /b 1)
where node.exe >nul 2>&1 || (echo [ERROR] Node.js missing.& pause & exit /b 1)

for /f "usebackq delims=" %%V in (`node -p "require('./package.json').version"`) do set "APP_VERSION=%%V"
if /I not "%APP_VERSION%"=="2.2.8" (
  echo [ERROR] Expected package version 2.2.8, found %APP_VERSION%.
  pause
  exit /b 1
)
set "TAG=v%APP_VERSION%"
set "SOURCE_REPO=https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git"

if not exist ".git" (
  echo [1/7] Connecting this release folder to the private source repo...
  git init -b main || goto :gitfail
  git remote add origin "%SOURCE_REPO%" || goto :gitfail
  git fetch origin main || goto :gitfail
  git reset --mixed origin/main || goto :gitfail
) else (
  echo [1/7] Existing Git checkout detected...
  git remote set-url origin "%SOURCE_REPO%" || goto :gitfail
  git fetch origin main || goto :gitfail
  git checkout main || goto :gitfail
)

for /f %%T in ('git ls-remote --tags origin "refs/tags/%TAG%"') do set "REMOTE_TAG=%%T"
if defined REMOTE_TAG (
  echo [ERROR] %TAG% already exists on the source repo. Release was NOT retriggered.
  pause
  exit /b 1
)

echo [2/7] Configuring Git identity...
git config user.name >nul 2>&1 || git config user.name "windowsdaiyu-cyber"
git config user.email >nul 2>&1 || git config user.email "windowsdaiyu-cyber@users.noreply.github.com"

echo [3/7] Final release source commit...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "DEEP-ECHO 2.2 END (v2.2.8)" || goto :gitfail
) else (
  echo [OK] Source already matches the release commit.
)

echo [4/7] Pushing final source to main...
git push -u origin main || goto :gitfail

echo [5/7] Creating release tag %TAG%...
git tag -a "%TAG%" -m "DEEP-ECHO 2.2 END" || goto :gitfail

echo [6/7] Triggering the single cloud workflow run...
git push origin "%TAG%" || goto :gitfail

echo [7/7] Done. GitHub Actions is now building, testing and publishing 2.2 END.
echo.
echo IMPORTANT: Is BAT ko dobara mat chalana jab workflow already running ho.
echo Release page title automatically 2.2 END ho jayega.
echo.
start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions"
pause
exit /b 0

:gitfail
echo.
echo [ERROR] Git/GitHub operation failed. No second workflow should be started until this is fixed.
echo Agar browser GitHub login khole, login/Authorize complete karke isi BAT ko dobara chalana.
pause
exit /b 1
