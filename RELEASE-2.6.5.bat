@echo off
setlocal EnableExtensions EnableDelayedExpansion
title DEEP-ECHO 2.6.5 (v2.6.5) - FAST ONE CLICK CLOUD RELEASE
color 0A
cd /d "%~dp0"

echo ============================================================
echo       DEEP-ECHO 2.6.5 - FAST CLOUD RELEASE
echo ============================================================
echo.
echo Release title : DEEP-ECHO 2.6.5
echo Update version: 2.6.5
echo Local npm ci  : SKIPPED ^(cloud runner performs exact install^)
echo Cloud gate    : npm ci -^> full tests -^> build -^> publish
echo.

where git.exe >nul 2>&1 || (echo [ERROR] Git for Windows missing.& pause & exit /b 1)
where node.exe >nul 2>&1 || (echo [ERROR] Node.js missing.& pause & exit /b 1)

if not exist ".github\workflows\release-windows.yml" (
  echo [ERROR] Missing .github\workflows\release-windows.yml.
  pause
  exit /b 1
)
if not exist ".gitignore" (
  echo [ERROR] Missing .gitignore. Release stopped to avoid staging build/dependency files.
  pause
  exit /b 1
)
if not exist ".gitattributes" (
  echo [ERROR] Missing .gitattributes.
  pause
  exit /b 1
)
if not exist "RELEASE-NOTES-2.6.5.md" (
  echo [ERROR] Missing RELEASE-NOTES-2.6.5.md.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%V in (`node -p "require('./package.json').version"`) do set "APP_VERSION=%%V"
if /I not "%APP_VERSION%"=="2.6.5" (
  echo [ERROR] Expected package version 2.6.5, found %APP_VERSION%.
  pause
  exit /b 1
)
set "TAG=v%APP_VERSION%"
set "SOURCE_REPO=https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git"

echo [1/8] Fast local integrity check ^(NO npm install^)...
node --check main.js || goto :fail
node --check preload.js || goto :fail
node -e "const fs=require('fs'); const p=require('./package.json'); const l=require('./package-lock.json'); if(p.version!=='2.6.5'||l.version!=='2.6.5'||l.packages[''].version!=='2.6.5') process.exit(2); const w=fs.readFileSync('.github/workflows/release-windows.yml','utf8'); if(!w.includes('npm ci --no-audit --no-fund')||!w.includes('npm test')||!w.includes('npm run release')||!w.includes('latest.yml')) process.exit(3); console.log('[OK] 2.6.5 metadata + cloud release gate verified.');" || goto :fail

echo [INFO] Heavy dependency install/tests intentionally run on GitHub Actions.
echo [INFO] Your PC will NOT run npm ci here.

if not exist ".git" (
  echo [2/8] Connecting release folder to source repository...
  git init -b main || goto :gitfail
  git remote add origin "%SOURCE_REPO%" || goto :gitfail
  git fetch origin main || goto :gitfail
  git reset --mixed origin/main || goto :gitfail
) else (
  echo [2/8] Existing Git checkout detected...
  git remote set-url origin "%SOURCE_REPO%" || goto :gitfail
  git fetch origin main || goto :gitfail
  git checkout main || goto :gitfail
)

set "REMOTE_TAG="
for /f %%T in ('git ls-remote --tags origin "refs/tags/%TAG%"') do set "REMOTE_TAG=%%T"
if defined REMOTE_TAG (
  echo [ERROR] %TAG% already exists. Release was NOT retriggered.
  echo If GitHub Actions is already running, do not run this BAT again.
  pause
  exit /b 1
)

echo [3/8] Configuring Git identity...
git config user.name >nul 2>&1 || git config user.name "windowsdaiyu-cyber"
git config user.email >nul 2>&1 || git config user.email "windowsdaiyu-cyber@users.noreply.github.com"

echo [4/8] Staging official v2.6.5 source...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Release DEEP-ECHO v2.6.5" || goto :gitfail
) else (
  echo [OK] Source already matches the release commit.
)

echo [5/8] Pushing final source to main...
git push -u origin main || goto :gitfail

echo [6/8] Creating annotated release tag %TAG%...
git tag -a "%TAG%" -m "DEEP-ECHO 2.6.5 - v2.6.5" || goto :gitfail

echo [7/8] Triggering cloud validation/build/publish...
git push origin "%TAG%" || goto :gitfail

echo [8/8] DONE - GitHub Actions now owns the heavy work.
echo.
echo Cloud will automatically run:
echo   npm ci ^> complete tests ^> Windows installer ^> blockmap ^> latest.yml ^> publish
echo.
echo IMPORTANT: Is BAT ko dobara mat chalana jab workflow running ho.
start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions"
pause
exit /b 0

:gitfail
echo.
echo [ERROR] Git/GitHub operation failed. No second release attempt until this is fixed.
echo Agar browser GitHub login khole, login/Authorize complete karke same BAT dobara run karo.
pause
exit /b 1

:fail
echo.
echo [ERROR] Fast local integrity check failed. Nothing was tagged or released.
pause
exit /b 1
