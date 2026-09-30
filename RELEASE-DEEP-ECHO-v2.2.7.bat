@echo off
setlocal EnableExtensions EnableDelayedExpansion
title DEEP-ECHO v2.2.7 - Safe Release Push
color 0A
cd /d "%~dp0"

echo ============================================================
echo        DEEP-ECHO v2.2.7 - SAFE RELEASE PUSH
echo ============================================================
echo.
echo Ye script:
echo   1. dependencies/tests verify karegi
echo   2. PRIVATE source repo ka fresh clone banayegi
echo   3. isi tested source ko main branch par push karegi
echo   4. v2.2.7 tag push karegi
echo   5. GitHub Actions ko Windows release build ke liye trigger karegi
echo.
echo GitHub token/password chat me mat dena.
echo Browser/Git Credential Manager me login complete karna.
echo.

where git.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git for Windows installed nahi hai.
  echo Install: https://git-scm.com/download/win
  pause
  exit /b 1
)

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js installed nahi hai.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [ERROR] Is BAT ko DEEP-ECHO v2.2.7 source folder ke andar rakho/chalao.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%V in (`node -p "require('./package.json').version"`) do set "APP_VERSION=%%V"
if not "%APP_VERSION%"=="2.2.7" (
  echo [ERROR] package.json version %APP_VERSION% hai, expected 2.2.7.
  echo Wrong folder se release mat karo.
  pause
  exit /b 1
)

set "TAG=v%APP_VERSION%"
set "SOURCE_DIR=%CD%"
set "WORK_DIR=%TEMP%\DEEP-ECHO-release-%APP_VERSION%"

echo [1/7] Dependencies verify...
if not exist "node_modules\linkedom\package.json" (
  echo Fresh source detected. npm ci chal raha hai...
  call npm.cmd ci --no-audit --no-fund
  if errorlevel 1 (
    echo [ERROR] npm ci fail hua. Release stop.
    pause
    exit /b 1
  )
)

echo.
echo [2/7] Automated tests...
call npm.cmd test
if errorlevel 1 (
  echo [ERROR] Tests fail hue. Release stop.
  pause
  exit /b 1
)

echo.
echo [3/7] Remote tag duplicate check...
for /f %%T in ('git ls-remote --tags "https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git" "refs/tags/%TAG%"') do set "REMOTE_TAG=%%T"
if defined REMOTE_TAG (
  echo [ERROR] %TAG% already source repo par exist karta hai.
  echo Same version overwrite nahi karenge.
  pause
  exit /b 1
)

echo.
echo [4/7] PRIVATE source repo fresh clone...
if exist "%WORK_DIR%" rmdir /s /q "%WORK_DIR%"
git clone --branch main --single-branch "https://github.com/windowsdaiyu-cyber/DEEP-ECHO.git" "%WORK_DIR%"
if errorlevel 1 (
  echo.
  echo [ERROR] GitHub source repo clone nahi hua.
  echo Browser/Git Credential Manager login/authorization complete karke retry karo.
  pause
  exit /b 1
)

echo.
echo [5/7] Tested v2.2.7 source sync...
pushd "%WORK_DIR%"
git rm -r -q --ignore-unmatch .
popd

robocopy "%SOURCE_DIR%" "%WORK_DIR%" /E /R:2 /W:1 ^
  /XD ".git" "node_modules" "dist" ".cache" "cache" ^
  /XF "*.log" >nul
if errorlevel 8 (
  echo [ERROR] Source copy fail hua.
  pause
  exit /b 1
)

pushd "%WORK_DIR%"
git config user.name >nul 2>&1
if errorlevel 1 git config user.name "windowsdaiyu-cyber"
git config user.email >nul 2>&1
if errorlevel 1 git config user.email "windowsdaiyu-cyber@users.noreply.github.com"

git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Release v2.2.7"
  if errorlevel 1 (
    echo [ERROR] Commit fail hua.
    popd
    pause
    exit /b 1
  )
) else (
  echo [OK] Source already matches main; new commit ki zarurat nahi.
)

echo.
echo [6/7] Main branch push...
git push origin main
if errorlevel 1 (
  echo [ERROR] main push fail hua.
  popd
  pause
  exit /b 1
)

echo.
echo [7/7] v2.2.7 tag push - GitHub Actions release trigger...
git tag -a "%TAG%" -m "DEEP-ECHO %APP_VERSION%"
if errorlevel 1 (
  echo [ERROR] Local tag create fail hua.
  popd
  pause
  exit /b 1
)

git push origin "%TAG%"
if errorlevel 1 (
  echo [ERROR] Tag push fail hua.
  popd
  pause
  exit /b 1
)

popd

echo.
echo ============================================================
echo   SUCCESS: v2.2.7 CLOUD RELEASE TRIGGERED
echo ============================================================
echo.
echo GitHub Actions ab:
echo   - Windows installer build karega
echo   - DEEP-ECHO-2.2.7-Setup.exe publish karega
echo   - .blockmap publish karega
echo   - latest.yml publish karega
echo.
echo latest.yml ki wajah se v2.2.3 users ko in-app update detect hoga.
echo.
start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO/actions"
start "" "https://github.com/windowsdaiyu-cyber/DEEP-ECHO-Releases/releases"
echo.
echo Action green hone ke baad app me update check karna.
pause
exit /b 0
