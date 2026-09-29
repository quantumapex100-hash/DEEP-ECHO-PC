@echo off
setlocal EnableExtensions
title DEEP-ECHO - Cloud Release
color 0A
cd /d "%~dp0"

echo ============================================================
echo          DEEP-ECHO - CLOUD RELEASE

echo ============================================================
echo.

where git.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git for Windows installed nahi hai.
  pause
  exit /b 1
)
where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js installed nahi hai.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%V in (`node -p "require('./package.json').version"`) do set "APP_VERSION=%%V"
if not defined APP_VERSION (
  echo [ERROR] package.json version read nahi hui.
  pause
  exit /b 1
)
set "TAG=v%APP_VERSION%"

echo Version: %APP_VERSION%
echo Tag: %TAG%
echo.

if not exist ".git" (
  echo [ERROR] Git source repo initialize nahi hai.
  echo Pehle PUSH-SOURCE-TO-GITHUB.bat chalao.
  pause
  exit /b 1
)

git remote set-url origin "https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git" >nul 2>&1

echo [1/5] Automated tests...
call npm.cmd test
if errorlevel 1 (
  echo [ERROR] Tests fail hue. Release stop ki gayi.
  pause
  exit /b 1
)

echo.
echo [2/5] Source changes commit ho rahi hain...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Release %TAG%"
  if errorlevel 1 goto :gitfail
) else (
  echo [OK] Koi uncommitted source change nahi hai.
)

echo.
echo [3/5] Main branch push...
git push origin main
if errorlevel 1 goto :gitfail

echo.
echo [4/5] Check kar rahe hain ki tag pehle se exist to nahi karta...
for /f %%T in ('git ls-remote --tags origin "refs/tags/%TAG%"') do set "REMOTE_TAG=%%T"
if defined REMOTE_TAG (
  echo [ERROR] %TAG% already GitHub par exist karta hai.
  echo Same version ko overwrite nahi karenge. package.json version badhao.
  pause
  exit /b 1
)

echo.
echo [5/5] Cloud release trigger...
git tag -a "%TAG%" -m "DEEP-ECHO %APP_VERSION%"
if errorlevel 1 goto :gitfail
git push origin "%TAG%"
if errorlevel 1 goto :gitfail

echo.
echo ============================================================
echo   CLOUD BUILD TRIGGERED SUCCESSFULLY

echo   GitHub Actions ab Windows installer build karega.

echo ============================================================
echo.
start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions"
pause
exit /b 0

:gitfail
echo.
echo [ERROR] Git command fail hua. GitHub login/access check karo.
pause
exit /b 1
